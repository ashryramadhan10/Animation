#!/usr/bin/env python3
"""Live matplotlib monitor for the raylib flow-field simulator.

Animates the telemetry published by FlowFieldTelemetry:

    field snapshot -> quiver plot of the grid (redrawn on re-seed)
    vehicle sample -> agent positions and headings, coloured by speed
    frame stats    -> rolling mean speed / mean alignment traces

TRANSPORTS
    udp   newline-free JSON datagrams on 127.0.0.1:(9870 + domain).
          Needs nothing but the standard library, and matches
          telemetry_udp.cpp -- this is what a default build publishes.
    dds   eProsima Fast DDS, matching telemetry_dds.cpp. Needs the `fastdds`
          Python bindings and the generated `FlowTelemetry` module on
          PYTHONPATH (cmake --build build --target python-bindings).

    --transport auto (the default) uses DDS when those two modules import,
    otherwise UDP.

Both transports feed the same State object from a background thread; every
matplotlib call happens on the main thread inside the FuncAnimation callback.

USAGE
    python flow_monitor.py                      # auto transport, domain 0
    python flow_monitor.py --transport udp --domain 7
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
import threading
from collections import deque

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

UDP_BASE_PORT = 9870

FIELD_TOPIC = "FlowFieldSnapshot"
VEHICLE_TOPIC = "FlowVehicleSample"
STATS_TOPIC = "FlowFrameStats"


# ---------------------------------------------------------------------------
# Shared state
# ---------------------------------------------------------------------------
class State:
    """Everything the plot needs, guarded by one lock.

    The setters take plain numbers rather than transport objects, so the DDS
    and UDP readers can share them.
    """

    def __init__(self, history: int) -> None:
        self.lock = threading.Lock()

        self.field = None          # dict(cols, rows, resolution, seed, x, y, u, v)
        self.field_dirty = False

        # vehicle id -> (px, py, vx, vy, speed)
        self.vehicles: dict = {}

        self.t: deque = deque(maxlen=history)
        self.speed: deque = deque(maxlen=history)
        self.align: deque = deque(maxlen=history)
        self.t0 = None
        self.fps = 0.0
        self.count = 0

    def set_field(self, seed, rows, cols, resolution, u, v) -> None:
        gx, gy = np.meshgrid(np.arange(cols) * resolution, np.arange(rows) * resolution)
        with self.lock:
            self.field = {
                "cols": int(cols),
                "rows": int(rows),
                "resolution": float(resolution),
                "seed": int(seed),
                "x": gx.ravel(),
                "y": gy.ravel(),
                "u": np.asarray(u, dtype=np.float32),
                "v": np.asarray(v, dtype=np.float32),
            }
            self.field_dirty = True

    def set_vehicle(self, vehicle_id, px, py, vx, vy, speed) -> None:
        with self.lock:
            self.vehicles[int(vehicle_id)] = (px, py, vx, vy, speed)

    def add_stats(self, stamp, mean_speed, mean_alignment, fps, count) -> None:
        with self.lock:
            if self.t0 is None:
                self.t0 = stamp
            self.t.append(stamp - self.t0)
            self.speed.append(mean_speed)
            self.align.append(mean_alignment)
            self.fps = fps
            self.count = count


# ---------------------------------------------------------------------------
# UDP transport (no dependencies)
# ---------------------------------------------------------------------------
class UdpSource:
    """Reads JSON datagrams from telemetry_udp.cpp on a background thread."""

    def __init__(self, domain: int, state: State) -> None:
        self.state = state
        self.port = UDP_BASE_PORT + domain

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # A field snapshot is ~35 kB and arrives in one datagram; give the
        # kernel room so a burst of agent samples cannot push it out.
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 1 << 21)
        self.sock.bind(("127.0.0.1", self.port))
        self.sock.settimeout(0.5)

        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="udp-rx", daemon=True)
        self._thread.start()
        print(f"[udp] listening on 127.0.0.1:{self.port}")

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                payload, _ = self.sock.recvfrom(1 << 16)
            except socket.timeout:
                continue
            except OSError:
                break
            try:
                message = json.loads(payload)
            except ValueError:
                continue          # truncated or foreign datagram; skip it
            self._dispatch(message)

    def _dispatch(self, message: dict) -> None:
        kind = message.get("t")
        if kind == "veh":
            position = message["p"]
            velocity = message["vel"]
            self.state.set_vehicle(message["id"], position[0], position[1],
                                   velocity[0], velocity[1], message["sp"])
        elif kind == "stats":
            self.state.add_stats(message["stamp"], message["ms"], message["ma"],
                                 message["fps"], message["n"])
        elif kind == "field":
            flat = message["v"]
            self.state.set_field(message["seed"], message["rows"], message["cols"],
                                 message["res"], flat[0::2], flat[1::2])

    def close(self) -> None:
        self._stop.set()
        self.sock.close()


# ---------------------------------------------------------------------------
# Fast DDS transport
# ---------------------------------------------------------------------------
def dds_available() -> bool:
    try:
        import fastdds  # noqa: F401
        import FlowTelemetry  # noqa: F401
    except ImportError:
        return False
    return True


class DdsSource:
    """Three DataReaders whose QoS mirrors the writers in telemetry_dds.cpp."""

    def __init__(self, domain: int, state: State) -> None:
        import fastdds
        import FlowTelemetry

        self._fastdds = fastdds
        self.state = state
        self._listeners = []   # keep alive; SWIG will not hold these for us

        # Fast DDS 3.x exposes return codes at module scope; 2.x nests them.
        self._ok = getattr(fastdds, "RETCODE_OK", None)
        if self._ok is None:
            self._ok = fastdds.ReturnCode_t.RETCODE_OK

        factory = fastdds.DomainParticipantFactory.get_instance()
        participant_qos = fastdds.DomainParticipantQos()
        factory.get_default_participant_qos(participant_qos)
        self.participant = factory.create_participant(domain, participant_qos)
        if self.participant is None:
            raise RuntimeError(f"could not create participant on domain {domain}")

        subscriber_qos = fastdds.SubscriberQos()
        self.participant.get_default_subscriber_qos(subscriber_qos)
        self.subscriber = self.participant.create_subscriber(subscriber_qos)

        def on_field(sample):
            vectors = sample.vectors()
            u = np.fromiter((p.x() for p in vectors), dtype=np.float32, count=len(vectors))
            v = np.fromiter((p.y() for p in vectors), dtype=np.float32, count=len(vectors))
            state.set_field(sample.seed(), sample.rows(), sample.cols(),
                            sample.resolution(), u, v)

        def on_vehicle(sample):
            state.set_vehicle(sample.vehicle_id(),
                              sample.position().x(), sample.position().y(),
                              sample.velocity().x(), sample.velocity().y(),
                              sample.speed())

        def on_stats(sample):
            state.add_stats(sample.stamp(), sample.mean_speed(),
                            sample.mean_alignment(), sample.fps(),
                            sample.vehicle_count())

        # A RELIABLE reader will not match a BEST_EFFORT writer, so these must
        # agree with telemetry_dds.cpp exactly.
        self._make_reader(FIELD_TOPIC, FlowTelemetry.FieldSnapshotPubSubType,
                          FlowTelemetry.FieldSnapshot, on_field,
                          fastdds.RELIABLE_RELIABILITY_QOS,
                          fastdds.TRANSIENT_LOCAL_DURABILITY_QOS, 1)
        self._make_reader(VEHICLE_TOPIC, FlowTelemetry.VehicleSamplePubSubType,
                          FlowTelemetry.VehicleSample, on_vehicle,
                          fastdds.BEST_EFFORT_RELIABILITY_QOS,
                          fastdds.VOLATILE_DURABILITY_QOS, 64)
        self._make_reader(STATS_TOPIC, FlowTelemetry.FrameStatsPubSubType,
                          FlowTelemetry.FrameStats, on_stats,
                          fastdds.BEST_EFFORT_RELIABILITY_QOS,
                          fastdds.VOLATILE_DURABILITY_QOS, 64)

    def _make_reader(self, topic_name, pubsub_cls, sample_cls, callback,
                     reliability, durability, depth) -> None:
        fastdds = self._fastdds
        retcode_ok = self._ok

        class Listener(fastdds.DataReaderListener):
            def __init__(self):
                super().__init__()

            def on_subscription_matched(self, reader, info):
                if info.current_count_change > 0:
                    print(f"[dds] matched publisher on {topic_name}")

            def on_data_available(self, reader):
                while True:
                    data = sample_cls()
                    info = fastdds.SampleInfo()
                    if reader.take_next_sample(data, info) != retcode_ok:
                        return
                    if info.valid_data:
                        callback(data)

        pubsub_type = pubsub_cls()
        self.participant.register_type(fastdds.TypeSupport(pubsub_type))

        topic_qos = fastdds.TopicQos()
        self.participant.get_default_topic_qos(topic_qos)
        topic = self.participant.create_topic(topic_name, pubsub_type.get_name(), topic_qos)
        if topic is None:
            raise RuntimeError(f"could not create topic {topic_name}")

        reader_qos = fastdds.DataReaderQos()
        self.subscriber.get_default_datareader_qos(reader_qos)
        reader_qos.reliability().kind = reliability
        reader_qos.durability().kind = durability
        reader_qos.history().kind = fastdds.KEEP_LAST_HISTORY_QOS
        reader_qos.history().depth = depth

        listener = Listener()
        self._listeners.append(listener)
        if self.subscriber.create_datareader(topic, reader_qos, listener) is None:
            raise RuntimeError(f"could not create reader for {topic_name}")
        print(f"[dds] subscribed to {topic_name} as {pubsub_type.get_name()}")

    def close(self) -> None:
        if self.participant is not None:
            self.participant.delete_contained_entities()
            self._fastdds.DomainParticipantFactory.get_instance().delete_participant(
                self.participant)
            self.participant = None


# ---------------------------------------------------------------------------
# Plot
# ---------------------------------------------------------------------------
def build_figure(state: State, history: int, subtitle: str):
    fig = plt.figure(figsize=(14, 7.5), facecolor="#0c0e14")
    grid = fig.add_gridspec(2, 3, width_ratios=[2.2, 1, 1], hspace=0.32, wspace=0.28)

    ax_field = fig.add_subplot(grid[:, 0:2])
    ax_speed = fig.add_subplot(grid[0, 2])
    ax_align = fig.add_subplot(grid[1, 2])

    for ax in (ax_field, ax_speed, ax_align):
        ax.set_facecolor("#12141c")
        ax.tick_params(colors="#8a92a6", labelsize=8)
        for spine in ax.spines.values():
            spine.set_color("#2a2f3d")

    ax_field.set_title("flow field + agents", color="#c8cede", fontsize=10, loc="left")
    ax_field.set_aspect("equal")
    ax_field.invert_yaxis()   # simulator origin is top-left, y grows downward

    ax_speed.set_title("mean speed", color="#c8cede", fontsize=9, loc="left")
    ax_align.set_title("mean alignment (cos)", color="#c8cede", fontsize=9, loc="left")
    ax_align.set_xlabel("t (s)", color="#8a92a6", fontsize=8)
    ax_align.set_ylim(-1.05, 1.05)
    ax_align.axhline(0.0, color="#2a2f3d", lw=0.8)

    # Both quivers start as None: matplotlib fixes a Quiver's arrow count at
    # construction, so an empty one can never accept N arrows later. They are
    # (re)built whenever the count changes, and only nudged after that.
    artists = {
        "field_quiver": None,
        "agents": None,
        "speed_line": ax_speed.plot([], [], color="#4fd1c5", lw=1.4)[0],
        "align_line": ax_align.plot([], [], color="#f6ad55", lw=1.4)[0],
        "banner": ax_field.text(1.0, 1.012, f"{subtitle} - waiting for data...",
                                transform=ax_field.transAxes, va="bottom", ha="right",
                                color="#8a92a6", fontsize=9, family="monospace"),
    }

    def update(_frame):
        with state.lock:
            field = state.field
            field_dirty = state.field_dirty
            state.field_dirty = False
            vehicles = list(state.vehicles.values())
            t = list(state.t)
            speed = list(state.speed)
            align = list(state.align)
            fps = state.fps
            count = state.count

        if field is not None and field_dirty:
            if artists["field_quiver"] is not None:
                artists["field_quiver"].remove()
            res = field["resolution"]
            artists["field_quiver"] = ax_field.quiver(
                field["x"], field["y"], field["u"], field["v"],
                color="#c8c832", angles="xy", scale_units="xy",
                scale=1.0 / (res * 0.8), width=0.0016, zorder=1,
            )
            ax_field.set_xlim(-res, field["cols"] * res + res)
            ax_field.set_ylim(field["rows"] * res + res, -res)

        if vehicles:
            arr = np.asarray(vehicles, dtype=np.float32)
            agents = artists["agents"]
            if agents is None or agents.N != len(arr):
                if agents is not None:
                    agents.remove()
                artists["agents"] = ax_field.quiver(
                    arr[:, 0], arr[:, 1], arr[:, 2], arr[:, 3], arr[:, 4],
                    cmap="cool", clim=(0.0, 5.0), angles="xy",
                    scale_units="xy", scale=0.12, width=0.004, zorder=3,
                )
            else:
                agents.set_offsets(arr[:, 0:2])
                agents.set_UVC(arr[:, 2], arr[:, 3], arr[:, 4])

        if t:
            artists["speed_line"].set_data(t, speed)
            artists["align_line"].set_data(t, align)
            ax_speed.set_xlim(t[0], max(t[-1], t[0] + 1e-3))
            ax_align.set_xlim(t[0], max(t[-1], t[0] + 1e-3))
            ax_speed.set_ylim(0.0, max(speed) * 1.2 + 1e-3)

        seed = field["seed"] if field else "-"
        artists["banner"].set_text(
            f"{subtitle} | seed {seed} | agents {count} | "
            f"sim {fps:.0f} fps | {len(t)}/{history} samples"
        )
        return ()

    return fig, update


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--domain", type=int, default=0,
                        help="DDS domain id / UDP port offset (default: 0)")
    parser.add_argument("--transport", choices=("auto", "udp", "dds"), default="auto",
                        help="telemetry transport (default: auto)")
    parser.add_argument("--history", type=int, default=400,
                        help="stats samples kept in the rolling plots (default: 400)")
    parser.add_argument("--interval", type=int, default=50,
                        help="redraw period in ms (default: 50)")
    parser.add_argument("--save", metavar="PNG", default=None,
                        help="run headless for --seconds, then write a PNG (for testing)")
    parser.add_argument("--seconds", type=float, default=6.0,
                        help="how long to collect when --save is used (default: 6)")
    args = parser.parse_args()

    transport = args.transport
    if transport == "auto":
        transport = "dds" if dds_available() else "udp"
        print(f"[monitor] transport auto-selected: {transport}")

    state = State(args.history)
    if transport == "dds":
        if not dds_available():
            sys.exit("--transport dds needs the 'fastdds' and 'FlowTelemetry' modules "
                     "on PYTHONPATH (cmake --build build --target python-bindings).")
        source = DdsSource(args.domain, state)
    else:
        source = UdpSource(args.domain, state)

    subtitle = f"{transport} domain {args.domain}"

    if args.save:
        # Headless capture: collect for a while, render once, exit.
        import time
        fig, update = build_figure(state, args.history, subtitle)
        deadline = time.time() + args.seconds
        while time.time() < deadline:
            time.sleep(0.2)
        update(0)
        fig.savefig(args.save, dpi=90, facecolor=fig.get_facecolor())
        print(f"[monitor] wrote {args.save}")
        with state.lock:
            print(f"[monitor] agents={len(state.vehicles)} stats={len(state.t)} "
                  f"field={'yes' if state.field else 'no'}")
        source.close()
        return 0

    fig, update = build_figure(state, args.history, subtitle)
    # Held in a local so the animation is not garbage collected mid-run.
    anim = FuncAnimation(fig, update, interval=args.interval,
                         blit=False, cache_frame_data=False)
    try:
        plt.show()
    finally:
        del anim
        source.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

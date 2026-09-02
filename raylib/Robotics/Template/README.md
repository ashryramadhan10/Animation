# Flow Field + Fast DDS Telemetry

A raylib port of the p5.js `FlowField` sketch, instrumented with eProsima Fast DDS
telemetry and a live matplotlib subscriber.

```
  raylib sim (C++)                 DDS                    matplotlib (Python)
  ────────────────         ─────────────────────         ────────────────────
  FlowField  ──┐           FlowFieldSnapshot   ──┐       quiver of the grid
  Vehicle[]  ──┼──▶ Sink ─▶ FlowVehicleSample  ──┼──▶    agent arrows + speed
  FrameStats ──┘           FlowFrameStats      ──┘       rolling stat traces
```

## Quick start

```powershell
.\run.ps1              # build + run; finds Fast DDS if installed, else runs standalone
.\run.ps1 -Domain 7    # same, on DDS domain 7
```

Fast DDS is auto-detected from `FASTDDS_HOME` and the usual `eProsima` install folders.
`-FastDds <prefix>` is only needed if yours lives somewhere unusual — and there is no
point passing it until Fast DDS is actually installed (see [Verification status](#verification-status)).

`run.ps1` finds the MinGW toolchain and the repo's `.venv`, configures and builds, then
launches the simulator and the monitor on the same domain. Individual steps:

| Command | Does |
| --- | --- |
| `.\run.ps1 -Task build` | configure + build only |
| `.\run.ps1 -Task sim` | launch the simulator |
| `.\run.ps1 -Task monitor` | run the matplotlib monitor |
| `.\run.ps1 -Task bindings` | generate + build the Fast DDS Python type support |
| `.\run.ps1 -Task clean` | delete the build directory |

Extra switches: `-NoDds` (force the null backend), `-Rebuild`, `-BuildType Debug`.
`-Domain` is passed to **both** CMake (it is compiled into the executable) and the monitor,
so the two ends cannot drift apart. If the build has no telemetry, `-Task all` says so and
skips the monitor instead of failing on an import error. `Get-Help .\run.ps1 -Full` has the rest.

## Layout

| File | Purpose |
| --- | --- |
| `run.ps1` | build + run driver for the whole pipeline |
| `main.cpp` | `FlowField`, `Vehicle` and the render loop |
| `PerlinNoise.hpp` | vendored [siv::PerlinNoise](https://github.com/Reputeless/PerlinNoise) v3.0.0 (MIT) |
| `telemetry.hpp` | backend-agnostic sample structs + `Sink` interface |
| `telemetry_dds.cpp` | Fast DDS writers (compiled only when Fast DDS is found) |
| `telemetry_null.cpp` | no-op sink, so the sim always builds |
| `idl/FlowTelemetry.idl` | wire types |
| `python/flow_monitor.py` | live matplotlib subscriber |

## The port

Everything the sketch used maps onto raylib/raymath/rlgl rather than hand-written
helpers. The one outside dependency is siv::PerlinNoise, because raylib's own
`GenImagePerlinNoise()` has no seed and quantises to 8 bits, while the sketch needs a
seedable continuous `noise(x, y)`.

| p5.js | raylib |
| --- | --- |
| `noise(x, y)` | `siv::PerlinNoise::octave2D_01(x, y, 4)` |
| `noiseSeed(s)` | `siv::PerlinNoise{s}` |
| `random(10000)` | `GetRandomValue(0, 10000)` |
| `map(v, 0, 1, 0, TAU)` | `Remap()` |
| `constrain(v, lo, hi)` | `Clamp()` |
| `createVector(cos t, sin t)` | `Vector2Rotate({1, 0}, t)` |
| `vec.normalize()` / `.mult()` | `Vector2Normalize()` / `Vector2Scale()` |
| `vec.mag()` / `.limit(m)` | `Vector2Length()` / `Vector2ClampValue(v, 0, m)` |
| `atan2(vec.y, vec.x)` | `Vector2Angle({1, 0}, vec)` |
| `push/translate/rotate/pop` | `rlPushMatrix/rlTranslatef/rlRotatef/rlPopMatrix` |
| `line()` / `triangle()` | `DrawLineEx()` / `DrawTriangle()` |

Two raylib details worth knowing, both verified against raylib 5.5:

- **`Vector2LineAngle()` is not the heading.** It returns `-atan2f(dy, dx)` (there is a
  `TODO` in `raymath.h` acknowledging it), which mirrors every arrow. `Vector2Angle({1,0}, v)`
  reduces to `atan2f(v.y, v.x)` exactly, so that is what `HeadingOf()` uses.
- **`DrawTriangle()` backface-culls.** With `{tip, -y, +y}` the triangle draws; swap the last
  two vertices and it silently disappears.

The arrow heads are drawn in near-white rather than the field colour. In p5 `triangle()` is
painted with the *fill* colour and the sketch never calls `fill()`/`noFill()`, so the heads take
p5's default near-white fill. Drawing a 6×3 px head in the shaft's own colour makes it vanish
into the 2 px line underneath.

## Build

`RAYLIB_SRC` follows the same convention as the other projects in this repo:
`C:/raylib/raylib/src` on Windows, `$RAYLIB_PATH` on Linux.

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/FlowFieldTelemetry
```

The telemetry backend is chosen at configure time and printed:

```
-- Telemetry backend: dds     # Fast DDS and fastddsgen were both found
-- Telemetry backend: null    # one of them was missing; the sim still runs
```

Useful options:

| Option | Default | Meaning |
| --- | --- | --- |
| `-DWITH_DDS=OFF` | `ON` | force the null backend |
| `-DDDS_DOMAIN_ID=7` | `0` | DDS domain compiled into the executable |
| `-DCMAKE_PREFIX_PATH=...` | – | where to find the Fast DDS install |

### Enabling the DDS backend

Needs the Fast DDS libraries **and** `fastddsgen` (which needs a JRE) on `PATH`.
Both Fast DDS 2.x (`fastrtps` target, `*PubSubTypes.h`) and 3.x (`fastdds` target,
`*PubSubTypes.hpp`) are handled; `telemetry_dds.cpp` sticks to the API subset that is
identical across the two.

```bash
cmake -S . -B build -G Ninja -DCMAKE_PREFIX_PATH=/opt/Fast-DDS/install
cmake --build build
```

`fastddsgen` is run at **configure** time, not build time, because the 2.x and 3.x generators
emit different file sets; the generated `*.cxx` are globbed afterwards instead of hardcoded.
Editing the IDL re-triggers configuration.

> **Windows note.** raylib here is a MinGW `libraylib.a`, while the Fast DDS Windows installer
> ships MSVC binaries. The two ABIs do not link. Either build Fast DDS from source with the
> same MinGW toolchain, or build both raylib and this project with MSVC. On Linux this is a
> non-issue.

## Run

Start the simulator, then the monitor:

```bash
./build/FlowFieldTelemetry

cd python
pip install -r requirements.txt
python flow_monitor.py --domain 0
```

### Controls

| Key | Action |
| --- | --- |
| `SPACE` | pause / resume |
| `R` | re-seed the field and respawn the agents |
| `F` / `T` | toggle field arrows / trails |
| `P` | toggle DDS publishing |
| wheel / RMB | zoom / pan |
| `HOME` | reset the camera |
| `F12` | screenshot |

## Topics and QoS

Publishing runs at 20 Hz, decoupled from the 60 fps render loop.

| Topic | Type | Reliability | Durability | History |
| --- | --- | --- | --- | --- |
| `FlowFieldSnapshot` | `flowfield::FieldSnapshot` | RELIABLE | TRANSIENT_LOCAL | KEEP_LAST(1) |
| `FlowVehicleSample` | `flowfield::VehicleSample` | BEST_EFFORT | VOLATILE | KEEP_LAST(32) |
| `FlowFrameStats` | `flowfield::FrameStats` | BEST_EFFORT | VOLATILE | KEEP_LAST(32) |

The grid changes only on re-seed and a plotter that starts late still needs it, so it is
latched. The streaming topics are best-effort on purpose: dropping a sample is cheaper than
letting a reliable writer block the render loop. **The reader QoS in `flow_monitor.py` mirrors
this table** — a RELIABLE reader will not match a BEST_EFFORT writer, so the two must agree.

## Python type support

`flow_monitor.py` needs two importable modules: `fastdds` (from the Fast DDS install, built
with Python bindings) and `FlowTelemetry` (generated from the IDL):

```bash
cmake --build build --target python-bindings
export PYTHONPATH=$PWD/build/python_ts/build      # Windows: $env:PYTHONPATH = ...
python python/flow_monitor.py
```

That target runs `fastddsgen -python`, then configures and builds the SWIG project it emits.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| HUD says `telemetry: disabled` | configured with the null backend — check the configure log |
| HUD says `Fast DDS \| offline` | `open()` failed; the participant could not start on that domain |
| Monitor never prints `matched publisher` | domain mismatch, QoS mismatch, or type name mismatch |
| Monitor draws stats but no field | the snapshot is latched — check the field reader is TRANSIENT_LOCAL |
| Arrows point the wrong way | something used `Vector2LineAngle()` for a heading |

## Verification status

- The raylib simulator builds clean with MinGW g++ 13.1 and runs at 60 fps with 40 agents;
  the field, arrow heads and trails were checked from captured frames.
- All six `run.ps1` tasks were exercised on Windows PowerShell 5.1, including the
  no-Fast-DDS paths, and `-Domain 7` was confirmed to reach the binary as
  `FLOWFIELD_DDS_DOMAIN_ID=7u`.
- `flow_monitor.py`'s plotting path was exercised against stubbed DDS modules and synthetic
  samples.
- The Fast DDS path (`telemetry_dds.cpp`, the generator wiring, the Python bindings) has
  **not** been compiled or run here — Fast DDS is not installed on this machine.

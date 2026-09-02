/**
 * telemetry_udp.cpp - Dependency-free UDP/JSON implementation of telemetry::Sink.
 *
 * PURPOSE:
 * The DDS backend needs Fast DDS on the C++ side *and* its SWIG Python bindings
 * on the subscriber side. This backend needs neither: newline-free JSON
 * datagrams to 127.0.0.1, which python/flow_monitor.py reads with nothing but
 * the standard library. It is what CMake falls back to when Fast DDS is absent,
 * so the simulator always has a working telemetry path.
 *
 * WIRE FORMAT (one datagram per sample, UTF-8 JSON):
 *   {"t":"field","seed":..,"rows":..,"cols":..,"res":..,"v":[x,y, x,y, ...]}
 *   {"t":"veh","id":..,"frame":..,"stamp":..,"p":[x,y],"vel":[x,y],
 *    "des":[x,y],"st":[x,y],"sp":..,"hd":..,"al":..}
 *   {"t":"stats","frame":..,"stamp":..,"fps":..,"ms":..,"ma":..,"n":..}
 *
 * The port is 9870 + domain id, so -DDDS_DOMAIN_ID keeps its meaning of
 * "which channel am I on" across both backends.
 *
 * Datagrams are fire-and-forget: send errors are ignored on purpose, exactly
 * like the BEST_EFFORT QoS the DDS backend uses for streaming samples. A field
 * snapshot of 64x36 cells is ~35 kB, comfortably inside the 65507 byte limit.
 */

#include "telemetry.hpp"

#ifdef _WIN32
#  ifndef WIN32_LEAN_AND_MEAN
#    define WIN32_LEAN_AND_MEAN
#  endif
#  include <winsock2.h>
#  include <ws2tcpip.h>
using SocketHandle = SOCKET;
#  define FLOW_INVALID_SOCKET INVALID_SOCKET
#  define FLOW_CLOSE_SOCKET closesocket
#else
#  include <arpa/inet.h>
#  include <netinet/in.h>
#  include <sys/socket.h>
#  include <unistd.h>
using SocketHandle = int;
#  define FLOW_INVALID_SOCKET (-1)
#  define FLOW_CLOSE_SOCKET ::close
#endif

#include <cstdio>
#include <string>

namespace {

constexpr unsigned short kBasePort = 9870;

class UdpSink final : public telemetry::Sink {
public:
    ~UdpSink() override { close(); }

    bool open(unsigned int domainId) override {
#ifdef _WIN32
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
            std::fprintf(stderr, "[udp] WSAStartup failed\n");
            return false;
        }
        wsaStarted_ = true;
#endif
        socket_ = ::socket(AF_INET, SOCK_DGRAM, 0);
        if (socket_ == FLOW_INVALID_SOCKET) {
            std::fprintf(stderr, "[udp] could not create socket\n");
            close();
            return false;
        }

        port_ = static_cast<unsigned short>(kBasePort + domainId);
        target_ = {};
        target_.sin_family = AF_INET;
        target_.sin_port = htons(port_);
        target_.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

        std::printf("[udp] publishing telemetry to 127.0.0.1:%u\n", port_);
        ready_ = true;
        return true;
    }

    void close() override {
        ready_ = false;
        if (socket_ != FLOW_INVALID_SOCKET) {
            FLOW_CLOSE_SOCKET(socket_);
            socket_ = FLOW_INVALID_SOCKET;
        }
#ifdef _WIN32
        if (wsaStarted_) {
            WSACleanup();
            wsaStarted_ = false;
        }
#endif
    }

    /**
     * The grid changes only on re-seed, but it is re-sent every 2 s so that a
     * late subscriber still gets it. Serialising 2304 vectors costs ~2.6 ms,
     * 15% of a 60 fps frame, so the JSON is built once per field and replayed
     * after that. The seed alone determines the vectors.
     */
    void publish(const telemetry::FieldSnapshot& snapshot) override {
        if (!ready_) return;

        const FieldKey key{snapshot.seed, snapshot.rows, snapshot.cols,
                           snapshot.resolution, snapshot.vectors.size()};
        if (key != fieldKey_) {
            fieldKey_ = key;
            fieldJson_.clear();
            fieldJson_.reserve(snapshot.vectors.size() * 16 + 128);

            char header[192];
            std::snprintf(header, sizeof(header),
                          "{\"t\":\"field\",\"seed\":%u,\"rows\":%u,\"cols\":%u,"
                          "\"res\":%.3f,\"v\":[",
                          snapshot.seed, snapshot.rows, snapshot.cols, snapshot.resolution);
            fieldJson_ += header;

            char pair[48];
            for (std::size_t i = 0; i < snapshot.vectors.size(); ++i) {
                std::snprintf(pair, sizeof(pair), "%s%.3f,%.3f",
                              (i == 0 ? "" : ","),
                              snapshot.vectors[i].x, snapshot.vectors[i].y);
                fieldJson_ += pair;
            }
            fieldJson_ += "]}";
        }

        send(fieldJson_.data(), fieldJson_.size());
    }

    void publish(const telemetry::VehicleSample& sample) override {
        if (!ready_) return;

        char buffer[512];
        const int written = std::snprintf(
            buffer, sizeof(buffer),
            "{\"t\":\"veh\",\"id\":%u,\"frame\":%llu,\"stamp\":%.4f,"
            "\"p\":[%.3f,%.3f],\"vel\":[%.4f,%.4f],\"des\":[%.4f,%.4f],"
            "\"st\":[%.5f,%.5f],\"sp\":%.4f,\"hd\":%.4f,\"al\":%.4f}",
            sample.vehicle_id,
            static_cast<unsigned long long>(sample.frame), sample.stamp,
            sample.position.x, sample.position.y,
            sample.velocity.x, sample.velocity.y,
            sample.desired.x, sample.desired.y,
            sample.steer.x, sample.steer.y,
            sample.speed, sample.heading, sample.alignment);
        if (written > 0) send(buffer, static_cast<std::size_t>(written));
    }

    void publish(const telemetry::FrameStats& stats) override {
        if (!ready_) return;

        char buffer[256];
        const int written = std::snprintf(
            buffer, sizeof(buffer),
            "{\"t\":\"stats\",\"frame\":%llu,\"stamp\":%.4f,\"fps\":%.1f,"
            "\"ms\":%.4f,\"ma\":%.4f,\"n\":%u}",
            static_cast<unsigned long long>(stats.frame), stats.stamp, stats.fps,
            stats.mean_speed, stats.mean_alignment, stats.vehicle_count);
        if (written > 0) send(buffer, static_cast<std::size_t>(written));
    }

    bool ready() const override { return ready_; }
    const char* backend() const override { return "UDP/JSON"; }

private:
    /** Fire and forget; a missing subscriber must never stall the render loop. */
    void send(const char* data, std::size_t size) {
        ::sendto(socket_, data, static_cast<int>(size), 0,
                 reinterpret_cast<const sockaddr*>(&target_), sizeof(target_));
    }

    /** Identifies one grid, so a re-seed invalidates the cached JSON. */
    struct FieldKey {
        std::uint32_t seed = 0;
        std::uint32_t rows = 0;
        std::uint32_t cols = 0;
        float resolution = 0.0f;
        std::size_t count = 0;

        bool operator!=(const FieldKey& other) const {
            return seed != other.seed || rows != other.rows || cols != other.cols ||
                   resolution != other.resolution || count != other.count;
        }
    };

    FieldKey fieldKey_{};        // default count == 0 never matches a real grid
    std::string fieldJson_;

    SocketHandle socket_ = FLOW_INVALID_SOCKET;
    sockaddr_in target_{};
    unsigned short port_ = kBasePort;
    bool ready_ = false;
#ifdef _WIN32
    bool wsaStarted_ = false;
#endif
};

}  // namespace

std::unique_ptr<telemetry::Sink> telemetry::CreateSink() {
    return std::unique_ptr<telemetry::Sink>(new UdpSink());
}

#pragma once
/**
 * telemetry.hpp - Backend-agnostic telemetry interface.
 *
 * PURPOSE:
 * main.cpp knows nothing about DDS. It fills these plain structs and hands them
 * to a Sink. CMake links exactly one implementation:
 *
 *   telemetry_dds.cpp    real Fast DDS writers (built when Fast DDS is found)
 *   telemetry_null.cpp   no-op                 (so the sim still builds and runs)
 *
 * The structs mirror idl/FlowTelemetry.idl field for field. Keeping a separate
 * plain-C++ copy is deliberate: raylib headers and Fast DDS headers never meet
 * in the same translation unit, which matters on Windows where both collide
 * with windows.h over names like Rectangle and CloseWindow.
 */

#include <cstdint>
#include <memory>
#include <vector>

/** DDS domain id. Override with -DDDS_DOMAIN_ID=<n> at configure time. */
#ifndef FLOWFIELD_DDS_DOMAIN_ID
#define FLOWFIELD_DDS_DOMAIN_ID 0u
#endif

namespace telemetry {

/** Mirrors flowfield::Vec2f. Same layout as raylib's Vector2. */
struct Vec2f {
    float x = 0.0f;
    float y = 0.0f;
};

/** The static grid. Published once per re-seed, latched for late subscribers. */
struct FieldSnapshot {
    std::uint32_t field_id = 0;
    std::uint32_t seed = 0;
    std::uint32_t rows = 0;
    std::uint32_t cols = 0;
    float resolution = 0.0f;
    std::vector<Vec2f> vectors;   // row-major, index = y * cols + x
};

/** One agent, one tick. */
struct VehicleSample {
    std::uint32_t vehicle_id = 0;
    std::uint64_t frame = 0;
    double stamp = 0.0;
    Vec2f position;
    Vec2f velocity;
    Vec2f desired;     // field vector under the agent, scaled to max speed
    Vec2f steer;       // steering force actually applied this tick
    float speed = 0.0f;
    float heading = 0.0f;     // radians
    float alignment = 0.0f;   // cos(angle) between velocity and desired, -1..1
};

/** Whole-simulation rollup, one per publish tick. */
struct FrameStats {
    std::uint32_t field_id = 0;
    std::uint64_t frame = 0;
    double stamp = 0.0;
    float fps = 0.0f;
    float mean_speed = 0.0f;
    float mean_alignment = 0.0f;
    std::uint32_t vehicle_count = 0;
};

class Sink {
public:
    virtual ~Sink() = default;

    /** Bring the transport up. Returns false if it could not be started. */
    virtual bool open(unsigned int domainId) = 0;
    virtual void close() = 0;

    virtual void publish(const FieldSnapshot& snapshot) = 0;
    virtual void publish(const VehicleSample& sample) = 0;
    virtual void publish(const FrameStats& stats) = 0;

    /** True once open() succeeded. publish() is a no-op before that. */
    virtual bool ready() const = 0;

    /** Short name for the HUD, e.g. "Fast DDS" or "disabled". */
    virtual const char* backend() const = 0;
};

std::unique_ptr<Sink> CreateSink();

}  // namespace telemetry

/**
 * Flow Field + Fast DDS Telemetry
 *
 * PURPOSE:
 * Port of the p5.js FlowField sketch to raylib. Every helper the sketch used is
 * mapped onto a raylib / raymath / rlgl equivalent rather than a hand-rolled
 * one; the only outside dependency is siv::PerlinNoise, because raylib's own
 * GenImagePerlinNoise() has no seed and quantises to 8 bits, while the sketch
 * needs a seedable noise(x, y) returning a continuous [0, 1].
 *
 * Vehicles steer along the field and their state is published over eProsima
 * Fast DDS, so python/flow_monitor.py can plot the simulation live.
 *
 * p5.js -> raylib MAPPING:
 *   noise(x, y)                -> siv::PerlinNoise::octave2D_01(x, y, 4)
 *   noiseSeed(s)               -> siv::PerlinNoise{s}
 *   random(10000)              -> GetRandomValue(0, 10000)
 *   map(v, 0, 1, 0, TAU)       -> Remap(v, 0, 1, 0, TAU)
 *   constrain(v, lo, hi)       -> Clamp(v, lo, hi)
 *   createVector(cos t, sin t) -> Vector2Rotate({1, 0}, t)
 *   vec.normalize() / .mult()  -> Vector2Normalize() / Vector2Scale()
 *   vec.mag() / .limit(m)      -> Vector2Length() / Vector2ClampValue(v, 0, m)
 *   atan2(vec.y, vec.x)        -> Vector2Angle({1, 0}, vec)
 *   push/translate/rotate/pop  -> rlPushMatrix/rlTranslatef/rlRotatef/rlPopMatrix
 *   line() / triangle()        -> DrawLineEx() / DrawTriangle()
 *   stroke(r, g, b, a)         -> Color{r, g, b, a}
 *
 * NOTE: raymath's Vector2LineAngle() is deliberately NOT used for headings --
 * it returns -atan2f(dy, dx) (see the TODO in raymath.h), which would mirror
 * every arrow. Vector2Angle({1,0}, v) reduces to atan2f(v.y, v.x) exactly.
 *
 * CONTROLS:
 *   SPACE        Pause / resume the simulation
 *   R            Re-seed the flow field and respawn the vehicles
 *   F            Toggle the field arrows
 *   T            Toggle vehicle trails
 *   P            Toggle DDS publishing
 *   HOME         Reset the 2D camera
 *   Wheel / RMB  Zoom / pan
 *   F12          Screenshot
 */

#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"

#include "PerlinNoise.hpp"
#include "telemetry.hpp"

#include <cstdint>
#include <vector>

//=============================================================================
// Constants
//=============================================================================
static constexpr int   SCREEN_W      = 1280;
static constexpr int   SCREEN_H      = 720;
static constexpr float RESOLUTION    = 20.0f;                                    // cell size, px
static constexpr int   COLS          = SCREEN_W / static_cast<int>(RESOLUTION);  // 64
static constexpr int   ROWS          = SCREEN_H / static_cast<int>(RESOLUTION);  // 36
static constexpr float TAU           = 2.0f * PI;

static constexpr int   NOISE_OCTAVES = 4;      // p5's noise() default detail
static constexpr int   VEHICLE_COUNT = 40;
static constexpr int   TRAIL_LENGTH  = 90;
// Publish rate, decoupled from the 60 fps render loop.
// Override at configure time: cmake -B build -DTELEMETRY_HZ=60
// static_cast, not an 'f' suffix: -DTELEMETRY_HZ=60 would expand to the
// invalid literal 60f, and a suffix rules out fractional rates like 7.5.
#ifndef FLOWFIELD_TELEMETRY_HZ
#define FLOWFIELD_TELEMETRY_HZ 20
#endif
static constexpr float TELEMETRY_HZ  = static_cast<float>(FLOWFIELD_TELEMETRY_HZ);

static const Color FIELD_COLOR = {200, 200, 50, 100};    // stroke(200, 200, 50, 100)
// p5's triangle() is painted with the *fill* colour, and the sketch never calls
// fill()/noFill(), so the arrow heads take p5's default fill -- near-white, not
// the stroke colour. Drawing them in FIELD_COLOR makes a 6x3 px head vanish
// into the 2 px shaft underneath it.
static const Color ARROW_COLOR = {255, 255, 235, 190};
static const Color BG_COLOR    = {12, 14, 20, 255};

/** atan2f(v.y, v.x), via raymath. Vector2Angle({1,0}, v) == atan2f(v.y, v.x). */
static inline float HeadingOf(Vector2 v) { return Vector2Angle(Vector2{1.0f, 0.0f}, v); }

//=============================================================================
// FlowField - grid of unit vectors driven by Perlin noise
//=============================================================================
/**
 * Direct port of the p5.js class. Every cell holds a unit vector whose angle is
 * a Perlin noise sample mapped to [0, TAU); agents ask "which way from here?"
 * through lookup().
 *
 * The xoff / yoff cursor walk, the inc of 0.1 and the yoff start of 50 are all
 * kept from the sketch, so the same seed produces the same picture.
 *
 * USAGE EXAMPLE:
 *   FlowField field(ROWS, COLS, RESOLUTION);
 *   field.init(1234);
 *   field.display();
 *   Vector2 desired = field.lookup(vehicle.position());
 *
 * USED IN THIS SCRIPT:
 *   - main(): one field, rebuilt with R
 *   - Vehicle::follow(): steers each agent along lookup()
 */
class FlowField {
public:
    FlowField(int rows, int cols, float resolution)
        : rows_(rows),
          cols_(cols),
          resolution_(resolution),
          field_(static_cast<std::size_t>(rows * cols), Vector2{1.0f, 0.0f}) {}

    /** Rebuild the field. The same seed always rebuilds the same field. */
    void init(unsigned int seed) {
        seed_ = seed;
        const siv::PerlinNoise perlin{static_cast<siv::PerlinNoise::seed_type>(seed)};

        float xoff = 0.0f;
        for (int x = 0; x < cols_; ++x) {
            float yoff = 50.0f;
            for (int y = 0; y < rows_; ++y) {
                const float noise =
                    static_cast<float>(perlin.octave2D_01(xoff, yoff, NOISE_OCTAVES));
                const float theta = Remap(noise, 0.0f, 1.0f, 0.0f, TAU);
                field_[cell(x, y)] = Vector2Rotate(Vector2{1.0f, 0.0f}, theta);
                yoff += inc_;
            }
            xoff += inc_;
        }
    }

    /** Draw an arrow in every cell. */
    void display() const {
        for (int x = 0; x < cols_; ++x) {
            for (int y = 0; y < rows_; ++y) {
                drawVector(field_[cell(x, y)],
                           static_cast<float>(x) * resolution_,
                           static_cast<float>(y) * resolution_,
                           resolution_ - 2.0f);
            }
        }
    }

    /**
     * One arrow: a line of length `scale` from (x, y) plus a triangular head at
     * the tip. rlgl's matrix stack stands in for p5's push/translate/rotate/pop,
     * so this reads like the original -- and rlgl folds the transform into the
     * vertices on the CPU, so all 2304 arrows still land in one draw batch.
     */
    static void drawVector(Vector2 vec, float x, float y, float scale) {
        const float arrowSize = 3.0f;

        rlPushMatrix();
        rlTranslatef(x, y, 0.0f);

        vec = Vector2Scale(Vector2Normalize(vec), scale);
        DrawLineEx(Vector2Zero(), vec, 2.0f, FIELD_COLOR);

        rlRotatef(HeadingOf(vec) * RAD2DEG, 0.0f, 0.0f, 1.0f);
        rlTranslatef(Vector2Length(vec) - arrowSize, 0.0f, 0.0f);

        // This vertex order is the one raylib keeps in its y-down screen space;
        // swapping the last two silently backface-culls the whole triangle.
        DrawTriangle(Vector2{arrowSize, 0.0f},
                     Vector2{-arrowSize, -arrowSize * 0.5f},
                     Vector2{-arrowSize, arrowSize * 0.5f},
                     ARROW_COLOR);

        rlPopMatrix();
    }

    /** The field vector covering `position`, clamped to the grid at the edges. */
    Vector2 lookup(Vector2 position) const {
        const int col = static_cast<int>(
            Clamp(position.x / resolution_, 0.0f, static_cast<float>(cols_ - 1)));
        const int row = static_cast<int>(
            Clamp(position.y / resolution_, 0.0f, static_cast<float>(rows_ - 1)));
        return field_[cell(col, row)];
    }

    int rows() const { return rows_; }
    int cols() const { return cols_; }
    float resolution() const { return resolution_; }
    unsigned int seed() const { return seed_; }
    const std::vector<Vector2>& cells() const { return field_; }

private:
    std::size_t cell(int x, int y) const {
        return static_cast<std::size_t>(y * cols_ + x);
    }

    int rows_;
    int cols_;
    float resolution_;
    float inc_ = 0.1f;
    unsigned int seed_ = 0;
    std::vector<Vector2> field_;
};

//=============================================================================
// Vehicle - steers along the flow field
//=============================================================================
/**
 * The steering agent that makes a flow field visible: sample the field under
 * your feet, treat that as the desired velocity, turn toward it under a maximum
 * steering force.
 *
 *   desired = lookup(position) * maxSpeed
 *   steer   = limit(desired - velocity, maxForce)
 *
 * `desired`, `steer` and `alignment` are kept as members because they are
 * exactly what the telemetry stream carries.
 */
class Vehicle {
public:
    Vehicle(Vector2 position, float maxSpeed, float maxForce, Color tint)
        : position_(position), maxSpeed_(maxSpeed), maxForce_(maxForce), tint_(tint) {
        trail_.reserve(TRAIL_LENGTH);
        trail_.push_back(position);
    }

    void follow(const FlowField& field) {
        desired_ = Vector2Scale(field.lookup(position_), maxSpeed_);
        steer_ = Vector2ClampValue(Vector2Subtract(desired_, velocity_), 0.0f, maxForce_);
        acceleration_ = Vector2Add(acceleration_, steer_);
    }

    void update() {
        velocity_ = Vector2ClampValue(Vector2Add(velocity_, acceleration_), 0.0f, maxSpeed_);
        position_ = Vector2Add(position_, velocity_);
        acceleration_ = Vector2Zero();

        alignment_ =
            Vector2DotProduct(Vector2Normalize(velocity_), Vector2Normalize(desired_));

        trail_.push_back(position_);
        if (static_cast<int>(trail_.size()) > TRAIL_LENGTH) {
            trail_.erase(trail_.begin());
        }
    }

    /** Toroidal edges. The trail is cut so it does not streak across the screen. */
    void wrapEdges(float width, float height) {
        const Vector2 wrapped = {Wrap(position_.x, 0.0f, width),
                                 Wrap(position_.y, 0.0f, height)};
        if (!Vector2Equals(wrapped, position_)) {
            position_ = wrapped;
            trail_.clear();
            trail_.push_back(position_);
        }
    }

    void draw(bool showTrail) const {
        if (showTrail && trail_.size() > 1) {
            DrawLineStrip(trail_.data(), static_cast<int>(trail_.size()), Fade(tint_, 0.35f));
        }

        rlPushMatrix();
        rlTranslatef(position_.x, position_.y, 0.0f);
        rlRotatef(HeadingOf(velocity_) * RAD2DEG, 0.0f, 0.0f, 1.0f);
        DrawTriangle(Vector2{radius_ * 2.0f, 0.0f},
                     Vector2{-radius_, -radius_},
                     Vector2{-radius_, radius_},
                     tint_);
        rlPopMatrix();
    }

    Vector2 position() const { return position_; }
    Vector2 velocity() const { return velocity_; }
    Vector2 desired() const { return desired_; }
    Vector2 steer() const { return steer_; }
    float speed() const { return Vector2Length(velocity_); }
    float heading() const { return HeadingOf(velocity_); }
    float alignment() const { return alignment_; }

private:
    Vector2 position_{};
    Vector2 velocity_{};
    Vector2 acceleration_{};
    Vector2 desired_{};
    Vector2 steer_{};
    float alignment_ = 0.0f;

    float maxSpeed_;
    float maxForce_;
    float radius_ = 4.0f;
    Color tint_;
    std::vector<Vector2> trail_;
};

//=============================================================================
// Helpers
//=============================================================================
static telemetry::Vec2f toWire(Vector2 v) { return telemetry::Vec2f{v.x, v.y}; }

/** Spawn a fresh crowd at random positions with slightly varied dynamics. */
static std::vector<Vehicle> spawnVehicles(int count) {
    std::vector<Vehicle> vehicles;
    vehicles.reserve(static_cast<std::size_t>(count));
    for (int i = 0; i < count; ++i) {
        const Vector2 position = {static_cast<float>(GetRandomValue(0, SCREEN_W)),
                                  static_cast<float>(GetRandomValue(0, SCREEN_H))};
        const float maxSpeed = static_cast<float>(GetRandomValue(20, 45)) / 10.0f;
        const float maxForce = static_cast<float>(GetRandomValue(5, 20)) / 100.0f;
        const Color tint = ColorFromHSV(static_cast<float>(GetRandomValue(160, 320)), 0.55f, 1.0f);
        vehicles.emplace_back(position, maxSpeed, maxForce, tint);
    }
    return vehicles;
}

/** Publish the whole grid. Sent once per re-seed, latched for late subscribers. */
static void publishField(telemetry::Sink& sink, const FlowField& field) {
    telemetry::FieldSnapshot snapshot;
    snapshot.field_id = 0;
    snapshot.seed = field.seed();
    snapshot.rows = static_cast<std::uint32_t>(field.rows());
    snapshot.cols = static_cast<std::uint32_t>(field.cols());
    snapshot.resolution = field.resolution();
    snapshot.vectors.reserve(field.cells().size());
    for (const Vector2& v : field.cells()) {
        snapshot.vectors.push_back(toWire(v));
    }
    sink.publish(snapshot);
}

//=============================================================================
// Entry point
//=============================================================================
int main() {
    InitWindow(SCREEN_W, SCREEN_H, "Flow Field - Fast DDS Telemetry");
    SetTargetFPS(60);

    FlowField field(ROWS, COLS, RESOLUTION);
    field.init(static_cast<unsigned int>(GetRandomValue(0, 10000)));  // random(10000)
    std::vector<Vehicle> vehicles = spawnVehicles(VEHICLE_COUNT);

    auto sink = telemetry::CreateSink();
    if (sink->open(FLOWFIELD_DDS_DOMAIN_ID)) {
        publishField(*sink, field);
    }

    Camera2D camera = {};
    camera.target = Vector2Zero();
    camera.offset = Vector2Zero();
    camera.rotation = 0.0f;
    camera.zoom = 1.0f;

    bool paused = false;
    bool showField = true;
    bool showTrails = true;
    bool publishing = true;

    std::uint64_t frame = 0;
    double lastPublish = 0.0;
    double lastFieldPublish = 0.0;
    float meanSpeed = 0.0f;
    float meanAlignment = 0.0f;

    while (!WindowShouldClose()) {
        //---------------------------------------------------------------- input
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_F)) showField = !showField;
        if (IsKeyPressed(KEY_T)) showTrails = !showTrails;
        if (IsKeyPressed(KEY_P)) publishing = !publishing;
        if (IsKeyPressed(KEY_F12)) TakeScreenshot("flowfield.png");
        if (IsKeyPressed(KEY_R)) {
            field.init(static_cast<unsigned int>(GetRandomValue(0, 10000)));
            vehicles = spawnVehicles(VEHICLE_COUNT);
            if (sink->ready()) publishField(*sink, field);
        }
        if (IsKeyPressed(KEY_HOME)) {
            camera.target = Vector2Zero();
            camera.offset = Vector2Zero();
            camera.zoom = 1.0f;
        }

        const float wheel = GetMouseWheelMove();
        if (wheel != 0.0f) {
            const Vector2 before = GetScreenToWorld2D(GetMousePosition(), camera);
            camera.zoom = Clamp(camera.zoom + wheel * 0.1f * camera.zoom, 0.25f, 8.0f);
            const Vector2 after = GetScreenToWorld2D(GetMousePosition(), camera);
            camera.target = Vector2Add(camera.target, Vector2Subtract(before, after));
        }
        if (IsMouseButtonDown(MOUSE_BUTTON_RIGHT)) {
            camera.target = Vector2Subtract(
                camera.target, Vector2Scale(GetMouseDelta(), 1.0f / camera.zoom));
        }

        //--------------------------------------------------------------- update
        if (!paused) {
            float speedSum = 0.0f;
            float alignmentSum = 0.0f;
            for (Vehicle& vehicle : vehicles) {
                vehicle.follow(field);
                vehicle.update();
                vehicle.wrapEdges(SCREEN_W, SCREEN_H);
                speedSum += vehicle.speed();
                alignmentSum += vehicle.alignment();
            }
            const float count = static_cast<float>(vehicles.size());
            meanSpeed = speedSum / count;
            meanAlignment = alignmentSum / count;
            ++frame;
        }

        //------------------------------------------------------------ telemetry
        const double now = GetTime();

        // The DDS backend latches the grid with TRANSIENT_LOCAL durability, so
        // a late subscriber gets it on discovery. Plain UDP has no equivalent,
        // so re-send it periodically. Not gated on `paused`: a paused sim must
        // still be able to hand its grid to a monitor that just started.
        if (sink->ready() && publishing && (now - lastFieldPublish) >= 2.0) {
            lastFieldPublish = now;
            publishField(*sink, field);
        }

        if (sink->ready() && publishing && !paused &&
            (now - lastPublish) >= (1.0 / TELEMETRY_HZ)) {
            lastPublish = now;

            for (std::size_t i = 0; i < vehicles.size(); ++i) {
                const Vehicle& vehicle = vehicles[i];
                telemetry::VehicleSample sample;
                sample.vehicle_id = static_cast<std::uint32_t>(i);
                sample.frame = frame;
                sample.stamp = now;
                sample.position = toWire(vehicle.position());
                sample.velocity = toWire(vehicle.velocity());
                sample.desired = toWire(vehicle.desired());
                sample.steer = toWire(vehicle.steer());
                sample.speed = vehicle.speed();
                sample.heading = vehicle.heading();
                sample.alignment = vehicle.alignment();
                sink->publish(sample);
            }

            telemetry::FrameStats stats;
            stats.field_id = 0;
            stats.frame = frame;
            stats.stamp = now;
            stats.fps = static_cast<float>(GetFPS());
            stats.mean_speed = meanSpeed;
            stats.mean_alignment = meanAlignment;
            stats.vehicle_count = static_cast<std::uint32_t>(vehicles.size());
            sink->publish(stats);
        }

        //----------------------------------------------------------------- draw
        BeginDrawing();
        ClearBackground(BG_COLOR);

        BeginMode2D(camera);
        if (showField) field.display();
        for (const Vehicle& vehicle : vehicles) vehicle.draw(showTrails);
        EndMode2D();

        DrawRectangle(0, 0, 340, 132, Fade(BLACK, 0.65f));
        DrawText(TextFormat("%2i FPS | seed %u | %dx%d @ %.0fpx",
                            GetFPS(), field.seed(), field.cols(), field.rows(),
                            field.resolution()),
                 12, 12, 10, RAYWHITE);
        DrawText(TextFormat("vehicles %d | mean speed %.2f | align %+.2f",
                            static_cast<int>(vehicles.size()), meanSpeed, meanAlignment),
                 12, 30, 10, RAYWHITE);
        DrawText(TextFormat("telemetry: %s | %s | %.0f Hz",
                            sink->backend(),
                            sink->ready() ? (publishing ? "publishing" : "muted") : "offline",
                            TELEMETRY_HZ),
                 12, 48, 10, sink->ready() ? LIME : GRAY);
        DrawText("SPACE pause   R reseed   F field   T trails   P publish",
                 12, 74, 10, Fade(RAYWHITE, 0.7f));
        DrawText("wheel zoom   RMB pan   HOME reset   F12 screenshot",
                 12, 90, 10, Fade(RAYWHITE, 0.7f));
        if (paused) DrawText("PAUSED", 12, 110, 10, YELLOW);

        EndDrawing();
    }

    sink->close();
    CloseWindow();
    return 0;
}

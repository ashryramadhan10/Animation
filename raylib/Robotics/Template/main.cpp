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
 * Fast DDS, so python/flow_monitor.py can plot the simulation live. Vehicle is
 * a port of p5sim/agents/vehicle.js -- the whole steering repertoire, not just
 * the flow-field follower.
 *
 * p5.js -> raylib MAPPING:
 *   noise(x, y)                -> siv::PerlinNoise::octave2D_01(x, y, 4)
 *   noise(x)                   -> siv::PerlinNoise::noise1D_01(x)
 *   noiseSeed(s)               -> siv::PerlinNoise{s}
 *   random(10000)              -> GetRandomValue(0, 10000)
 *   random(lo, hi)             -> RandomFloat(lo, hi)
 *   map(v, 0, 1, 0, TAU)       -> Remap(v, 0, 1, 0, TAU)
 *   constrain(v, lo, hi)       -> Clamp(v, lo, hi)
 *   createVector(cos t, sin t) -> Vector2Rotate({1, 0}, t)
 *   vec.normalize() / .mult()  -> Vector2Normalize() / Vector2Scale()
 *   vec.setMag(m)              -> SetMag(v, m)
 *   vec.mag() / .limit(m)      -> Vector2Length() / Vector2ClampValue(v, 0, m)
 *   p5.Vector.dist(a, b)       -> Vector2Distance(a, b)
 *   vec.heading()              -> Vector2Angle({1, 0}, vec)
 *   push/translate/rotate/pop  -> rlPushMatrix/rlTranslatef/rlRotatef/rlPopMatrix
 *   line() / triangle()        -> DrawLineEx() / DrawTriangle()
 *   circle() / ellipse()       -> DrawCircleV() / DrawCircleLinesV()
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
 *   B            Toggle flocking (align + separation) on top of the field
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

/**
 * p5's vec.setMag(m). Vector2Normalize() returns {0, 0} for a zero vector, so
 * an agent that is not moving yet stays put instead of inventing a direction.
 */
static inline Vector2 SetMag(Vector2 v, float m) {
    return Vector2Scale(Vector2Normalize(v), m);
}

/** p5's random(lo, hi). GetRandomValue is integer-only, hence the /10000. */
static inline float RandomFloat(float lo, float hi) {
    return lo + (hi - lo) * (static_cast<float>(GetRandomValue(0, 10000)) / 10000.0f);
}

/** p5's noise() is one global generator; Vehicle::wander() uses the 1D slice. */
static const siv::PerlinNoise& WanderNoise() {
    static const siv::PerlinNoise perlin{
        static_cast<siv::PerlinNoise::seed_type>(20250903)};
    return perlin;
}

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
// Vehicle - port of p5sim/agents/vehicle.js
//=============================================================================
/**
 * The Nature-of-Code steering agent. Every behaviour boils down to the same
 * two lines -- pick a desired velocity, then turn toward it under a capped
 * steering force -- and the forces accumulate in `acc` until update() runs:
 *
 *   desired = <behaviour>                        (a velocity, at maxSpeed)
 *   steer   = limit(desired - velocity, maxForce)
 *
 * maxForce is what makes the motion look alive: it is the turning budget, so a
 * small value gives wide, committed arcs and a large one gives twitchy snaps.
 *
 * `desired`, `steer` and `alignment` are kept as members because they are
 * exactly what the telemetry stream carries.
 *
 * USAGE EXAMPLE:
 *   Vehicle v(x, y, tint);
 *   v.applyForce(v.follow(field));   // or seek/arrive/wander/...
 *   v.run(SCREEN_W, SCREEN_H);       // edges + update
 *   v.show(true);                    // inside BeginDrawing()
 *
 * DEVIATIONS FROM THE SKETCH, and why:
 *   - seek()/arrive()/flee() take a Vector2 point rather than an object with a
 *     `.pos`. The sketch's own pursue() already passes a bare vector into
 *     seek(), where `target.pos` is undefined and the steer comes out NaN;
 *     taking a point makes that path work and costs the caller a .position().
 *   - wander()'s debug guides are recorded, not drawn. raylib splits the update
 *     pass from the draw pass, so they are stashed for drawWanderDebug().
 *   - show() reads `angle_` instead of assigning it, because drawing is const
 *     here; update() sets it from the heading, same value either way.
 *   - the paths share one TRAIL_LENGTH point budget. The sketch appends a point
 *     per frame and never trims, which grows without bound.
 */
class Vehicle {
public:
    Vehicle(float x, float y, Color tint = RAYWHITE)
        : position_{x, y}, tint_(tint) {
        beginPath();
        pushPathPoint();
    }

    //------------------------------------------------------------------ flocking
    /** Steer toward the average heading of everyone within neighbourDist. */
    void align(const std::vector<Vehicle>& vehicles) {
        const float neighbourDist = 50.0f;
        Vector2 sum = Vector2Zero();
        int count = 0;

        for (const Vehicle& other : vehicles) {
            const float d = Vector2Distance(position_, other.position_);
            if (d > 0.0f && d < neighbourDist) {          // d > 0 skips self
                sum = Vector2Add(sum, other.velocity_);
                ++count;
            }
        }

        if (count > 0) {
            // The mean, then normalise -- the division cancels, but it is kept
            // so this reads like the sketch.
            sum = Vector2Scale(sum, 1.0f / static_cast<float>(count));
            applyForce(steerToward(SetMag(sum, maxSpeed_)));
        }
    }

    /** Push away from anyone too close, weighted 1/d so contact shoves hardest. */
    void separation(const std::vector<Vehicle>& vehicles) {
        const float desiredSeparation = radius_ * 3.0f;
        Vector2 sum = Vector2Zero();
        int count = 0;

        for (const Vehicle& other : vehicles) {
            const float d = Vector2Distance(position_, other.position_);
            if (d > 0.0f && d < desiredSeparation) {
                Vector2 diff = Vector2Normalize(Vector2Subtract(position_, other.position_));
                diff = Vector2Scale(diff, 1.0f / d);
                sum = Vector2Add(sum, diff);
                ++count;
            }
        }

        if (count > 0) {
            sum = Vector2Scale(sum, 1.0f / static_cast<float>(count));
            applyForce(steerToward(SetMag(sum, maxSpeed_)));
        }
    }

    //----------------------------------------------------------------- behaviours
    /**
     * Project a point 100 px ahead, draw a circle of radius 50 around it, and
     * chase a spot on that circle picked by 1D Perlin noise. The noise is what
     * keeps consecutive frames related, so the path meanders instead of jittering.
     */
    void wander() {
        const float wanderRadius = 50.0f;
        wanderPoint_ = Vector2Add(position_, SetMag(velocity_, 100.0f));

        const float theta = static_cast<float>(WanderNoise().noise1D_01(noiseXoff_));
        const float thetaMap = Remap(theta, 0.0f, 1.0f, 0.0f, TAU);
        wanderTarget_ = Vector2Add(
            wanderPoint_, Vector2Scale(Vector2Rotate(Vector2{1.0f, 0.0f}, thetaMap), wanderRadius));

        applyForce(SetMag(Vector2Subtract(wanderTarget_, position_), maxForce_));

        // wanderTheta is the classic random-walk angle. The sketch keeps
        // advancing it but steers from the noise instead, so it is vestigial
        // there too -- kept so switching back is a one-line change.
        const float displaceRange = 0.3f;
        wanderTheta_ += RandomFloat(-displaceRange, displaceRange);
        noiseXoff_ += 0.01f;
    }

    /** Seek where the target will be in ~10 frames, not where it is now. */
    Vector2 pursue(const Vehicle& vehicle) const {
        return seek(Vector2Add(vehicle.position_, Vector2Scale(vehicle.velocity_, 10.0f)));
    }

    /** pursue() turned inside out: run from the interception point. */
    Vector2 evade(const Vehicle& vehicle) const { return Vector2Negate(pursue(vehicle)); }

    Vector2 flee(Vector2 target) const { return Vector2Negate(seek(target)); }

    Vector2 seek(Vector2 target) const {
        return steerToward(SetMag(Vector2Subtract(target, position_), maxSpeed_));
    }

    /** seek(), easing off inside slowRadius so the agent parks instead of orbiting. */
    Vector2 arrive(Vector2 target) const {
        const float slowRadius = 100.0f;
        const Vector2 offset = Vector2Subtract(target, position_);
        const float distance = Vector2Length(offset);
        const float speed = (distance < slowRadius)
                                ? Remap(distance, 0.0f, slowRadius, 0.0f, maxSpeed_)
                                : maxSpeed_;
        return steerToward(SetMag(offset, speed));
    }

    /** The behaviour this sketch runs. Returns the force; the caller applies it. */
    Vector2 follow(const FlowField& field) {
        desired_ = SetMag(field.lookup(position_), maxSpeed_);
        steer_ = steerToward(desired_);
        return steer_;
    }

    //------------------------------------------------------------------ integrate
    void applyForce(Vector2 force) { acceleration_ = Vector2Add(acceleration_, force); }

    void update() {
        velocity_ = Vector2ClampValue(Vector2Add(velocity_, acceleration_), 0.0f, maxSpeed_);
        position_ = Vector2Add(position_, velocity_);
        acceleration_ = Vector2Zero();
        angle_ = HeadingOf(velocity_);

        alignment_ =
            Vector2DotProduct(Vector2Normalize(velocity_), Vector2Normalize(desired_));

        pushPathPoint();
    }

    /** Wrap a body-radius past the edge, starting a new path so it does not streak back. */
    void edges(float width, float height) {
        bool hitEdge = false;
        if (position_.x > width + radius_)  { position_.x = -radius_;        hitEdge = true; }
        else if (position_.x < -radius_)    { position_.x = width + radius_; hitEdge = true; }
        if (position_.y > height + radius_) { position_.y = -radius_;         hitEdge = true; }
        else if (position_.y < -radius_)    { position_.y = height + radius_; hitEdge = true; }

        if (hitEdge) beginPath();
    }

    /**
     * The sketch's run(), minus show(). Note edges() comes first, as it does
     * there: a wrap lands at the start of the next frame, not the end of this one.
     */
    void run(float width, float height) {
        edges(width, height);
        update();
    }

    //----------------------------------------------------------------------- draw
    /** stroke(255) + fill(255, 100) + triangle(-r, -r/2, -r, r/2, r, 0). */
    void show(bool showTrails) const {
        if (showTrails) {
            for (const std::vector<Vector2>& path : paths_) {
                if (path.size() > 1) {
                    DrawLineStrip(path.data(), static_cast<int>(path.size()),
                                  Fade(tint_, 0.35f));
                }
            }
        }

        // The sketch's three vertices, rotated to start at the tip: DrawTriangle
        // backface-culls, and this is the winding raylib keeps in y-down space.
        const Vector2 tip   = {radius_, 0.0f};
        const Vector2 left  = {-radius_, -radius_ * 0.5f};
        const Vector2 right = {-radius_, radius_ * 0.5f};

        rlPushMatrix();
        rlTranslatef(position_.x, position_.y, 0.0f);
        rlRotatef(angle_ * RAD2DEG, 0.0f, 0.0f, 1.0f);
        DrawTriangle(tip, left, right, Fade(tint_, 0.4f));   // fill(255, 100)
        DrawLineEx(tip, left, 2.0f, tint_);                  // stroke(255), strokeWeight(2)
        DrawLineEx(left, right, 2.0f, tint_);
        DrawLineEx(right, tip, 2.0f, tint_);
        rlPopMatrix();
    }

    /** The sketch's debug arrow: a line from base along +x, sized by |vec| + 2r. */
    void drawArrow(Vector2 base, Vector2 vec, Color color) const {
        const float mag = Vector2Length(vec) + radius_ * 2.0f;
        DrawLineEx(base, Vector2{vec.x + mag, vec.y}, 3.0f, color);
    }

    /** wander()'s guides: the projected point, its circle, and the chosen target. */
    void drawWanderDebug() const {
        DrawLineV(position_, wanderPoint_, RAYWHITE);
        DrawCircleLinesV(wanderPoint_, 50.0f, RAYWHITE);
        DrawCircleV(wanderPoint_, 8.0f, RED);
        DrawLineV(position_, wanderTarget_, RAYWHITE);
        DrawCircleV(wanderTarget_, 8.0f, GREEN);
    }

    //------------------------------------------------------------------ accessors
    Vector2 position() const { return position_; }
    Vector2 velocity() const { return velocity_; }
    Vector2 desired() const { return desired_; }
    Vector2 steer() const { return steer_; }
    float speed() const { return Vector2Length(velocity_); }
    float heading() const { return angle_; }
    float alignment() const { return alignment_; }

private:
    /** limit(desired - velocity, maxForce) -- the tail every behaviour shares. */
    Vector2 steerToward(Vector2 desired) const {
        return Vector2ClampValue(Vector2Subtract(desired, velocity_), 0.0f, maxForce_);
    }

    void beginPath() {
        paths_.emplace_back();
        paths_.back().reserve(TRAIL_LENGTH);
    }

    /** One point in, one point out, so the segments share a fixed budget. */
    void pushPathPoint() {
        paths_.back().push_back(position_);
        if (++pathPoints_ <= TRAIL_LENGTH) return;

        while (paths_.size() > 1 && paths_.front().empty()) paths_.erase(paths_.begin());
        if (!paths_.front().empty()) {
            paths_.front().erase(paths_.front().begin());
            --pathPoints_;
        }
    }

    Vector2 position_{};
    Vector2 velocity_{};
    Vector2 acceleration_{};
    Vector2 desired_{};
    Vector2 steer_{};
    float alignment_ = 0.0f;

    float maxSpeed_ = 3.0f;
    float maxForce_ = 0.1f;      // the turning budget -- see the class comment
    float radius_ = 10.0f;
    float angle_ = 0.0f;
    float wanderTheta_ = PI / 2.0f;
    float noiseXoff_ = 0.0f;

    Vector2 wanderPoint_{};
    Vector2 wanderTarget_{};

    Color tint_;
    std::vector<std::vector<Vector2>> paths_;   // paths_.back() is the live one
    int pathPoints_ = 0;
};

//=============================================================================
// Helpers
//=============================================================================
static telemetry::Vec2f toWire(Vector2 v) { return telemetry::Vec2f{v.x, v.y}; }

/**
 * Spawn a fresh crowd at random positions. maxSpeed and maxForce are left at
 * the sketch's 3 and 0.1 for every agent -- the variety is in the tint only,
 * so the flock moves the way vehicle.js does.
 */
static std::vector<Vehicle> spawnVehicles(int count) {
    std::vector<Vehicle> vehicles;
    vehicles.reserve(static_cast<std::size_t>(count));
    for (int i = 0; i < count; ++i) {
        const Color tint = ColorFromHSV(static_cast<float>(GetRandomValue(160, 320)), 0.55f, 1.0f);
        vehicles.emplace_back(static_cast<float>(GetRandomValue(0, SCREEN_W)),
                              static_cast<float>(GetRandomValue(0, SCREEN_H)), tint);
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
    bool flocking = false;
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
        if (IsKeyPressed(KEY_B)) flocking = !flocking;
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
                // Forces stack: the field says where to go, flocking negotiates
                // with the neighbours, and update() resolves the argument.
                if (flocking) {
                    vehicle.align(vehicles);
                    vehicle.separation(vehicles);
                }
                vehicle.applyForce(vehicle.follow(field));
                vehicle.run(SCREEN_W, SCREEN_H);
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
        for (const Vehicle& vehicle : vehicles) vehicle.show(showTrails);
        EndMode2D();

        DrawRectangle(0, 0, 340, 132, Fade(BLACK, 0.65f));
        DrawText(TextFormat("%2i FPS | seed %u | %dx%d @ %.0fpx",
                            GetFPS(), field.seed(), field.cols(), field.rows(),
                            field.resolution()),
                 12, 12, 10, RAYWHITE);
        DrawText(TextFormat("vehicles %d | mean speed %.2f | align %+.2f | flock %s",
                            static_cast<int>(vehicles.size()), meanSpeed, meanAlignment,
                            flocking ? "on" : "off"),
                 12, 30, 10, RAYWHITE);
        DrawText(TextFormat("telemetry: %s | %s | %.0f Hz",
                            sink->backend(),
                            sink->ready() ? (publishing ? "publishing" : "muted") : "offline",
                            TELEMETRY_HZ),
                 12, 48, 10, sink->ready() ? LIME : GRAY);
        DrawText("SPACE pause   R reseed   F field   T trails   B flock   P publish",
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

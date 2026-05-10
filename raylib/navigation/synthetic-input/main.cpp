// Synthetic Input Demo
// Demonstrates synthetic pointcloud generation for testing the navigation pipeline.
// Shows per-track pointclouds with face points and interior noise.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

const float DEG = PI / 180.0f;
const float AISLE_YAW = 33.5f * DEG;

// Deterministic PRNG
class Rng {
public:
    explicit Rng(unsigned int seed) : state_(seed) {}

    float next() {
        state_ += 0x6D2B79F5;
        unsigned int t = state_;
        t = (t ^ (t >> 15)) * (t | 1);
        t ^= t + ((t ^ (t >> 7)) * (t | 61));
        return static_cast<float>((t ^ (t >> 14)) >> 0) / 4294967296.0f;
    }

    float range(float min, float max) {
        return min + (max - min) * next();
    }

    float gaussian(float mean, float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        float z = sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2);
        return mean + z * sigma;
    }

private:
    unsigned int state_;
};

// 2D vector
struct Vec2 {
    float x, y;
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
};

// Point with side classification
struct Point {
    Vec2 pos;
    const char* kind;  // "face" or "interior"
    const char* side;  // "left" or "right"
};

// Track containing points from one rack
struct Track {
    int trackId;
    const char* side;
    std::vector<Point> points;
};

// One simulation frame
struct Frame {
    int frameIndex;
    float stamp;
    Vec2 fcuPos;
    float fcuYaw;
    float trueHeading;
    std::vector<Track> tracks;
};

// Direction vectors
Vec2 dir(float angle) { return {cosf(angle), sinf(angle)}; }
Vec2 normal(float angle) { return {-sinf(angle), cosf(angle)}; }

// Generate synthetic wall/rack point cloud
std::vector<Point> generateWallCloud(float heading, float halfWidth, const char* side,
                                      float alongCenter, Rng& rng) {
    Vec2 direction = dir(heading);
    Vec2 norm = normal(heading);
    float sideSign = (side[0] == 'l') ? 1.0f : -1.0f;

    Vec2 base = direction * alongCenter + norm * (sideSign * halfWidth);
    Vec2 inward = norm * (-sideSign);

    std::vector<Point> points;

    // Face points (220)
    for (int i = 0; i < 220; ++i) {
        float t = rng.range(-1.6f, 1.6f);
        Vec2 noise = {rng.gaussian(0, 0.018f), rng.gaussian(0, 0.018f)};
        Vec2 pos = base + direction * t + noise;
        points.push_back({pos, "face", side});
    }

    // Interior points (80)
    for (int i = 0; i < 80; ++i) {
        float t = rng.range(-1.6f, 1.6f);
        float depth = rng.range(0.04f, 0.25f);
        Vec2 noise = {rng.gaussian(0, 0.025f), rng.gaussian(0, 0.025f)};
        Vec2 pos = base + direction * t + inward * depth + noise;
        points.push_back({pos, "interior", side});
    }

    return points;
}

// Generate single frame
Frame generateFrame(int index, Rng& rng, float headingDeg = 33.5f, float halfWidth = 1.6f) {
    float baseHeading = headingDeg * DEG;
    Vec2 direction = dir(baseHeading);
    Vec2 norm = normal(baseHeading);

    float heading = baseHeading + 0.4f * DEG * sinf(index * 0.09f);
    float along = 0.16f * index;
    float lateral = 0.16f * sinf(index * 0.13f);

    Vec2 pos = direction * along + norm * lateral;
    float fcuYaw = heading + 4.0f * DEG * sinf(index * 0.21f);

    Frame frame;
    frame.frameIndex = index;
    frame.stamp = index * 0.1f;
    frame.fcuPos = pos;
    frame.fcuYaw = fcuYaw;
    frame.trueHeading = heading;

    // Left track
    Track leftTrack;
    leftTrack.trackId = 1;
    leftTrack.side = "left";
    auto leftPoints = generateWallCloud(heading, halfWidth, "left", along, rng);
    for (const auto& p : leftPoints) leftTrack.points.push_back(p);
    frame.tracks.push_back(leftTrack);

    // Right track
    Track rightTrack;
    rightTrack.trackId = 2;
    rightTrack.side = "right";
    auto rightPoints = generateWallCloud(heading, halfWidth, "right", along, rng);
    for (const auto& p : rightPoints) rightTrack.points.push_back(p);
    frame.tracks.push_back(rightTrack);

    return frame;
}

// World renderer
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH, const Frame& frame) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};

        minX = minY = 1e9f;
        maxX = maxY = -1e9f;

        // Find bounds from all points
        for (const auto& track : frame.tracks) {
            for (const auto& p : track.points) {
                minX = fminf(minX, p.pos.x);
                maxX = fmaxf(maxX, p.pos.x);
                minY = fminf(minY, p.pos.y);
                maxY = fmaxf(maxY, p.pos.y);
            }
        }
        minX = fminf(minX, frame.fcuPos.x);
        maxX = fmaxf(maxX, frame.fcuPos.x);
        minY = fminf(minY, frame.fcuPos.y);
        maxY = fmaxf(maxY, frame.fcuPos.y);

        minX -= 0.9f; minY -= 0.9f;
        maxX += 0.9f; maxY += 0.9f;

        float worldW = maxX - minX;
        float worldH = maxY - minY;
        scale = fminf(rect.width / worldW, rect.height / worldH);
    }

    Vector2 toScreen(Vec2 p) const {
        float cx = (minX + maxX) * 0.5f;
        float cy = (minY + maxY) * 0.5f;
        return {
            rect.x + rect.width * 0.5f + (p.x - cx) * scale,
            rect.y + rect.height * 0.5f - (p.y - cy) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
    }

    void drawTrackPoints(const Track& track) const {
        Color faceColor = (track.side[0] == 'l') ? Color{83, 198, 255, 190} : Color{255, 199, 87, 190};
        Color interiorColor = {111, 126, 153, 90};

        for (const auto& p : track.points) {
            Vector2 s = toScreen(p.pos);
            if (p.kind[0] == 'f') {
                DrawCircleV(s, 3, faceColor);
            } else {
                DrawCircleV(s, 2, interiorColor);
            }
        }
    }

    void drawPose(Vec2 pos, float yaw, Color color, const char* label) const {
        Vector2 s = toScreen(pos);
        float len = 0.55f * scale;
        Vector2 tip = {s.x + cosf(yaw) * len, s.y - sinf(yaw) * len};

        DrawCircleV(s, 6, color);
        DrawLineEx(s, tip, 3.0f, color);
        DrawText(label, (int)s.x + 10, (int)s.y - 15, 12, {230, 230, 230, 255});
    }

    // Draw aisle reference lines
    void drawAisleReference(float heading, float halfWidth, Vec2 center) const {
        Vec2 direction = dir(heading);
        Vec2 norm = normal(heading);

        for (float t = -3.8f; t <= 3.8f; t += 0.15f) {
            Vec2 leftP = center + direction * t + norm * halfWidth;
            Vec2 rightP = center + direction * t + norm * (-halfWidth);
            DrawCircleV(toScreen(leftP), 1.5f, {83, 198, 255, 120});
            DrawCircleV(toScreen(rightP), 1.5f, {255, 199, 87, 120});
        }
    }
};

// Draw info panel
void drawPanel(int screenW, const Frame& frame) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Input model", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "frame: %d", frame.frameIndex);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "tracks: %d", (int)frame.tracks.size());
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "true aisle heading: %.2f deg", frame.trueHeading / DEG);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "FCU yaw: %.2f deg", frame.fcuYaw / DEG);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Blue/yellow points are rack faces.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Muted points are rack interior/noise.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("The C++ node gets these points from", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("segmentation masks + registered depth.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    // Legend
    DrawCircleV({x + 20, (float)y + 4}, 5, {83, 198, 255, 255});
    DrawText("left rack face", (int)x + 32, y, 12, {210, 220, 235, 255}); y += 18;

    DrawCircleV({x + 20, (float)y + 4}, 5, {255, 199, 87, 255});
    DrawText("right rack face", (int)x + 32, y, 12, {210, 220, 235, 255}); y += 18;

    DrawCircleV({x + 20, (float)y + 4}, 4, {111, 126, 153, 255});
    DrawText("interior / noisy depth", (int)x + 32, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Synthetic Input Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        int frameIndex = (simFrame / 4) % 80;
        Rng rng(42 + frameIndex * 7);
        Frame frame = generateFrame(frameIndex, rng);

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Synthetic input", 22, 20, 18, {232, 238, 248, 255});
        DrawText("The browser version starts after image/depth work: per-track pointclouds already exist",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight(), frame);
        world.drawGrid();
        world.drawAisleReference(frame.trueHeading, 1.6f, frame.fcuPos);

        for (const auto& track : frame.tracks) {
            world.drawTrackPoints(track);
        }

        world.drawPose(frame.fcuPos, frame.fcuYaw, {255, 199, 87, 255}, "FCU");

        drawPanel(GetScreenWidth(), frame);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

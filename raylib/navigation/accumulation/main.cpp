// Accumulation Demo
// Demonstrates how track points accumulate over a rolling time window
// to build a larger point set for more stable line fitting.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

const float AISLE_YAW = 33.0f * (PI / 180.0f);
const int TRACK_ID = 4;

// Deterministic pseudo-random number generator for repeatable simulations
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

    // Gaussian random using Box-Muller transform
    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

// 2D point structure
struct Vec2 {
    float x, y;
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
};

// Unit vector pointing along aisle heading
Vec2 dir() { return {cosf(AISLE_YAW), sinf(AISLE_YAW)}; }

// Unit vector perpendicular to aisle heading
Vec2 aisleNormal() { return {-sinf(AISLE_YAW), cosf(AISLE_YAW)}; }

// Line in slope-intercept form: y = m*x + b
struct Line {
    float m, b;
};

// Frame containing points from one timestep
struct Frame {
    float stamp;
    int trackId;
    std::vector<Vec2> points;
};

// Generate one frame of synthetic rack points
Frame makeFrame(int index) {
    Rng rng(70 + index);
    float along = index * 0.08f;
    Vec2 base = dir() * along + aisleNormal() * 1.55f;

    std::vector<Vec2> points;
    for (int i = 0; i < 95; ++i) {
        float t = -1.6f + rng.next() * 3.2f;
        Vec2 noise = {rng.gaussian(0.025f), rng.gaussian(0.025f)};
        points.push_back(base + dir() * t + noise);
    }

    return {index * 0.1f, TRACK_ID, points};
}

// Fit line using least-squares
Line fitLine(const std::vector<Vec2>& points) {
    if (points.empty()) return {0, 0};

    float avgX = 0, avgY = 0;
    for (const auto& p : points) {
        avgX += p.x;
        avgY += p.y;
    }
    avgX /= points.size();
    avgY /= points.size();

    float varX = 0, cov = 0;
    for (const auto& p : points) {
        varX += (p.x - avgX) * (p.x - avgX);
        cov += (p.x - avgX) * (p.y - avgY);
    }

    float m = cov / fmaxf(varX, 1e-9f);
    return {m, avgY - m * avgX};
}

// Collect accumulated frames within rolling window
std::vector<Frame> accumulatedFrames(int frameIndex) {
    std::vector<Frame> frames;
    int cutoff = frameIndex > 18 ? frameIndex - 18 : 0;
    for (int i = cutoff; i <= frameIndex; ++i) {
        frames.push_back(makeFrame(i));
    }
    return frames;
}

// World-to-screen coordinate transformer
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH, const std::vector<Vec2>& points) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};

        minX = minY = 1e9f;
        maxX = maxY = -1e9f;
        for (const auto& p : points) {
            minX = fminf(minX, p.x);
            maxX = fmaxf(maxX, p.x);
            minY = fminf(minY, p.y);
            maxY = fmaxf(maxY, p.y);
        }
        minX -= 0.8f; minY -= 0.8f;
        maxX += 0.8f; maxY += 0.8f;

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

    void drawPoints(const std::vector<Vec2>& points, Color color, float size) const {
        for (const auto& p : points) {
            Vector2 s = toScreen(p);
            DrawCircleV(s, size, color);
        }
    }

    void drawLine(const Line& line, Color color) const {
        Vector2 a = toScreen({minX, line.m * minX + line.b});
        Vector2 b = toScreen({maxX, line.m * maxX + line.b});
        DrawLineEx(a, b, 3.0f, color);
    }
};

// Draw info panel on right side
void drawPanel(int screenW, int panelLines[], int count, int currentPoints, int accumulated, int windowFrames) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Accumulation", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "track id: %d", TRACK_ID);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "current frame points: %d", currentPoints);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "accumulated points: %d", accumulated);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "window frames: %d", windowFrames);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Bright points are current frame.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Dim green points are history.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This only works when track_id", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("continues to represent the same", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("physical horizontal beam.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Accumulation Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        // Input
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Get current frame data
        int frameIndex = simFrame / 3;
        auto frames = accumulatedFrames(frameIndex);
        Frame& current = frames.back();

        // Flatten accumulated points
        std::vector<Vec2> accumulated;
        for (const auto& f : frames) {
            accumulated.insert(accumulated.end(), f.points.begin(), f.points.end());
        }

        // Fit line to accumulated points
        Line fitted = fitLine(accumulated);

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        // Title
        DrawText("Track accumulation", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: same track_id accumulates over a rolling time window", 22, 45, 12, {149, 163, 184, 255});

        // World view
        WorldRenderer world(GetScreenWidth(), GetScreenHeight(), accumulated);
        world.drawGrid();
        world.drawPoints(accumulated, {92, 235, 181, 70}, 3);           // History (dim green)
        world.drawPoints(current.points, {255, 199, 87, 210}, 5);       // Current (bright yellow)
        world.drawLine(fitted, WHITE);

        // Panel
        int dummy[1] = {0};
        drawPanel(GetScreenWidth(), dummy, 0,
                  (int)current.points.size(), (int)accumulated.size(), (int)frames.size());

        // Controls
        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

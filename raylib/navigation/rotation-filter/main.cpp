// Rotation Filter Demo
// Demonstrates how sweeping candidate angles and computing rotated_y boundary
// helps isolate the outer rack face band from interior/noisy points.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>
#include <algorithm>

const float DEG = PI / 180.0f;

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

    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

// Point with classification
struct Point {
    float x, y;
    const char* kind;  // "face" or "interior"
};

// Filter result
struct FilterResult {
    Vector2 pivot;
    float boundary;
    std::vector<Point> kept;
    std::vector<Point> rejected;
};

// Generate point cloud with face and interior points
std::vector<Point> makePointCloud() {
    Rng rng(14);
    std::vector<Point> points;

    // Face points (along y = 1.45 with small noise)
    for (int i = 0; i < 170; ++i) {
        float x = -2.2f + 4.4f * rng.next();
        float y = 1.45f + rng.gaussian(0.025f);
        points.push_back({x, y, "face"});
    }

    // Interior points (noisy region below face)
    for (int i = 0; i < 150; ++i) {
        float x = -2.2f + 4.4f * rng.next();
        float y = 1.0f + 0.36f * rng.next() + rng.gaussian(0.02f);
        points.push_back({x, y, "interior"});
    }

    return points;
}

// Compute mean position of points
Vector2 meanPoint(const std::vector<Point>& points) {
    float sx = 0, sy = 0;
    for (const auto& p : points) {
        sx += p.x;
        sy += p.y;
    }
    return {sx / points.size(), sy / points.size()};
}

// Apply rotation filter at given candidate angle
FilterResult rotationFilter(const std::vector<Point>& points, float estimatedAngle, float candidateAngle) {
    Vector2 avg = meanPoint(points);

    // Compute pivot point offset from centroid
    Vector2 pivot = {
        avg.x - sinf(estimatedAngle) * 2.4f,
        avg.y + cosf(estimatedAngle) * 2.4f
    };

    // Compute rotated y-values for each point
    std::vector<float> values;
    for (const auto& p : points) {
        float rx = p.x - pivot.x;
        float ry = p.y - pivot.y;
        float v = cosf(candidateAngle) * ry - sinf(candidateAngle) * rx;
        values.push_back(v);
    }

    // Find boundary (max value = outer edge)
    float boundary = *std::max_element(values.begin(), values.end());

    // Classify points
    FilterResult result;
    result.pivot = pivot;
    result.boundary = boundary;

    for (size_t i = 0; i < points.size(); ++i) {
        if (values[i] > boundary - 0.22f) {
            result.kept.push_back(points[i]);
        } else {
            result.rejected.push_back(points[i]);
        }
    }

    return result;
}

// World renderer
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        minX = -2.8f; maxX = 2.8f;
        minY = 0.6f;  maxY = 1.9f;
        float worldW = maxX - minX;
        float worldH = maxY - minY;
        scale = fminf(rect.width / worldW, rect.height / worldH);
    }

    Vector2 toScreen(float x, float y) const {
        float cx = (minX + maxX) * 0.5f;
        float cy = (minY + maxY) * 0.5f;
        return {
            rect.x + rect.width * 0.5f + (x - cx) * scale,
            rect.y + rect.height * 0.5f - (y - cy) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
        for (int x = (int)ceilf(minX); x <= (int)maxX; ++x) {
            Vector2 a = toScreen((float)x, minY);
            Vector2 b = toScreen((float)x, maxY);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
        for (int y = (int)ceilf(minY); y <= (int)maxY; ++y) {
            Vector2 a = toScreen(minX, (float)y);
            Vector2 b = toScreen(maxX, (float)y);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
    }

    void drawPoints(const std::vector<Point>& points, Color color, float size) const {
        for (const auto& p : points) {
            Vector2 s = toScreen(p.x, p.y);
            DrawCircleV(s, size, color);
        }
    }

    void drawPivot(Vector2 pivot) const {
        Vector2 s = toScreen(pivot.x, pivot.y);
        DrawCircleV(s, 8, {82, 255, 168, 255});
    }

    // Draw boundary line through pivot at given angle
    void drawBoundaryLine(Vector2 pivot, float angle, float rotatedY) const {
        Vector2 dir = {cosf(angle), sinf(angle)};
        Vector2 normal = {-sinf(angle), cosf(angle)};

        // Center of line is pivot + normal * rotatedY
        float centerX = pivot.x + normal.x * rotatedY;
        float centerY = pivot.y + normal.y * rotatedY;

        // Extend line in both directions
        Vector2 a = toScreen(centerX - dir.x * 4, centerY - dir.y * 4);
        Vector2 b = toScreen(centerX + dir.x * 4, centerY + dir.y * 4);

        DrawLineEx(a, b, 3.0f, {248, 113, 113, 255});
    }
};

// Draw info panel
void drawPanel(int screenW, float candidateDeg, int kept, int total) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Rotation filter", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "candidate angle: %.1f deg", candidateDeg);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "kept points: %d/%d", kept, total);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("In the C++ logic, this removes", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("interior/noisy points before line fit.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("The pivot creates a temporary local", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("basis. For each candidate angle,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("rotated_y exposes the outer face edge.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Rotation Filter Demo");
    SetTargetFPS(30);

    std::vector<Point> points = makePointCloud();

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Sweep candidate angle from -20 to +20 degrees
        float candidateDeg = -20.0f + ((simFrame / 5) % 81) * 0.5f;
        float candidateAngle = candidateDeg * DEG;

        FilterResult filtered = rotationFilter(points, 0.0f, candidateAngle);

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Rotation search filter", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: sweep angle -> compute rotated_y boundary -> keep outer rack face band",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();
        world.drawPoints(filtered.rejected, {111, 126, 153, 95}, 4);   // Interior (dim)
        world.drawPoints(filtered.kept, {248, 113, 113, 195}, 5);      // Face (red)
        world.drawPivot(filtered.pivot);
        world.drawBoundaryLine(filtered.pivot, candidateAngle, filtered.boundary);

        drawPanel(GetScreenWidth(), candidateDeg, (int)filtered.kept.size(), (int)points.size());

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

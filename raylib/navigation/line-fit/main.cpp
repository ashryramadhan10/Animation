// Line Fit Demo
// Demonstrates recursive linear regression: fit line, classify close points as inliers,
// repeat on inliers to remove outliers from a beam line.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <set>
#include <string>

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

// Point with classification label
struct Point {
    float x, y;
    const char* label;
};

// Line in slope-intercept form
struct Line {
    float m, b;
};

// One iteration result
struct FitStep {
    Line line;
    std::vector<int> inliers;
};

// Generate test points with beam (inliers) and scattered outliers
std::vector<Point> makePoints() {
    Rng rng(8);
    std::vector<Point> points;

    // Beam points (along y = 0.55*x + 0.8 with noise)
    for (int i = 0; i < 180; ++i) {
        float x = -2.5f + 5.0f * rng.next();
        float y = 0.55f * x + 0.8f + rng.gaussian(0.035f);
        points.push_back({x, y, "beam"});
    }

    // Random outliers
    for (int i = 0; i < 70; ++i) {
        float x = -2.5f + 5.0f * rng.next();
        float y = -1.0f + 3.8f * rng.next();
        points.push_back({x, y, "outlier"});
    }

    return points;
}

// Fit line using least-squares
Line fitLine(const std::vector<Point>& points, const std::vector<int>& indices) {
    if (indices.empty()) return {0, 0};

    float avgX = 0, avgY = 0;
    for (int i : indices) {
        avgX += points[i].x;
        avgY += points[i].y;
    }
    avgX /= indices.size();
    avgY /= indices.size();

    float varX = 0, cov = 0;
    for (int i : indices) {
        varX += (points[i].x - avgX) * (points[i].x - avgX);
        cov += (points[i].x - avgX) * (points[i].y - avgY);
    }

    float m = cov / fmaxf(varX, 1e-9f);
    return {m, avgY - m * avgX};
}

// Perpendicular distance from point to line
float distanceToLine(const Point& p, const Line& line) {
    return fabsf(line.m * p.x - p.y + line.b) / sqrtf(line.m * line.m + 1.0f);
}

// Recursive fit: repeatedly fit and keep only inliers
std::vector<FitStep> recursiveFit(const std::vector<Point>& points) {
    std::vector<int> active;
    for (int i = 0; i < (int)points.size(); ++i) active.push_back(i);

    std::vector<FitStep> steps;

    for (int iter = 0; iter < 8; ++iter) {
        Line line = fitLine(points, active);

        std::vector<int> inliers;
        for (int i = 0; i < (int)points.size(); ++i) {
            if (distanceToLine(points[i], line) <= 0.08f) {
                inliers.push_back(i);
            }
        }

        steps.push_back({line, inliers});

        if (inliers.size() == active.size() || inliers.size() < 12) break;
        active = inliers;
    }

    return steps;
}

// World renderer
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        minX = -3.0f; maxX = 3.0f;
        minY = -1.2f; maxY = 2.7f;
        scale = fminf(rect.width / 6.0f, rect.height / 3.9f);
    }

    Vector2 toScreen(float x, float y) const {
        return {
            rect.x + rect.width * 0.5f + x * scale,
            rect.y + rect.height * 0.5f - (y - 0.75f) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
        for (int x = (int)minX; x <= (int)maxX; ++x) {
            Vector2 a = toScreen((float)x, minY);
            Vector2 b = toScreen((float)x, maxY);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
        for (int y = (int)minY; y <= (int)maxY; ++y) {
            Vector2 a = toScreen(minX, (float)y);
            Vector2 b = toScreen(maxX, (float)y);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
    }

    void drawPoints(const std::vector<Point>& points, const std::set<int>& inlierSet) const {
        for (int i = 0; i < (int)points.size(); ++i) {
            Vector2 s = toScreen(points[i].x, points[i].y);
            if (inlierSet.count(i)) {
                DrawCircleV(s, 5, {82, 255, 168, 180});   // Inlier (green)
            } else {
                DrawCircleV(s, 4, {248, 113, 113, 100});  // Outlier (red)
            }
        }
    }

    void drawLine(const Line& line) const {
        Vector2 a = toScreen(minX, line.m * minX + line.b);
        Vector2 b = toScreen(maxX, line.m * maxX + line.b);
        DrawLineEx(a, b, 3.0f, WHITE);
    }
};

// Draw info panel
void drawPanel(int screenW, int stepIndex, int totalSteps, int inliers, int total, float slope) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Recursive line fit", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "iteration: %d/%d", stepIndex + 1, totalSteps);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "inliers: %d/%d", inliers, total);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "slope: %.3f", slope);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This mirrors the C++ recursive", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("linear-regression fitter: fit,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("measure distance, keep inliers,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("then refit with cleaner geometry.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Line Fit Demo");
    SetTargetFPS(30);

    // Generate data once
    std::vector<Point> points = makePoints();
    std::vector<FitStep> steps = recursiveFit(points);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Cycle through iterations
        int stepIndex = (simFrame / 25) % (int)steps.size();
        const FitStep& step = steps[stepIndex];
        std::set<int> inlierSet(step.inliers.begin(), step.inliers.end());

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Line fit", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: fit line -> classify close points -> repeat on inliers",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();
        world.drawPoints(points, inlierSet);
        world.drawLine(step.line);

        drawPanel(GetScreenWidth(), stepIndex, (int)steps.size(),
                  (int)step.inliers.size(), (int)points.size(), step.line.m);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

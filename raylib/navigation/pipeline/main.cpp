// Pipeline Demo
// Demonstrates the full navigation correction pipeline:
// pointclouds -> face filter -> line fit -> centerline -> corrected pose

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

    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

// 2D vector
struct Vec2 {
    float x, y;
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator-(const Vec2& o) const { return {x - o.x, y - o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
};

Vec2 dir(float angle) { return {cosf(angle), sinf(angle)}; }
Vec2 aisleNormal(float angle) { return {-sinf(angle), cosf(angle)}; }

// Line in slope-intercept form
struct Line { float m, b; };

// Pose with position and yaw
struct Pose { float x, y, yaw; };

// Track with side label
struct Track {
    const char* side;
    std::vector<Vec2> points;
};

// Generate one track's points
Track makeTrack(int frameIndex, const char* side) {
    Rng rng(1200 + frameIndex * 7 + (side[0] == 'l' ? 1 : 2));

    float along = frameIndex * 0.055f;
    float halfWidth = 1.58f;
    float sideSign = (side[0] == 'l') ? 1.0f : -1.0f;

    Vec2 base = dir(AISLE_YAW) * along + aisleNormal(AISLE_YAW) * (sideSign * halfWidth);
    Vec2 inward = aisleNormal(AISLE_YAW) * (-sideSign);

    std::vector<Vec2> points;

    // Face points
    for (int i = 0; i < 140; ++i) {
        float t = -1.6f + 3.2f * rng.next();
        Vec2 noise = {rng.gaussian(0.018f), rng.gaussian(0.018f)};
        points.push_back(base + dir(AISLE_YAW) * t + noise);
    }

    // Interior points
    for (int i = 0; i < 70; ++i) {
        float t = -1.6f + 3.2f * rng.next();
        float depth = 0.08f + 0.25f * rng.next();
        Vec2 noise = {rng.gaussian(0.035f), rng.gaussian(0.035f)};
        points.push_back(base + dir(AISLE_YAW) * t + inward * depth + noise);
    }

    return {side, points};
}

// Fit line using least squares
Line fitLine(const std::vector<Vec2>& points) {
    if (points.empty()) return {0, 0};

    float avgX = 0, avgY = 0;
    for (const auto& p : points) { avgX += p.x; avgY += p.y; }
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

// Distance from point to line
float distanceToLine(Vec2 p, Line line) {
    return fabsf(line.m * p.x - p.y + line.b) / sqrtf(line.m * line.m + 1.0f);
}

// Filter to keep only face points
std::vector<Vec2> filterFace(const std::vector<Vec2>& points) {
    Line line = fitLine(points);
    std::vector<Vec2> filtered;
    for (const auto& p : points) {
        if (distanceToLine(p, line) < 0.12f) {
            filtered.push_back(p);
        }
    }
    return filtered;
}

// Average two rack lines for centerline
Line centerlineFromTwoFits(Line left, Line right) {
    return {(left.m + right.m) * 0.5f, (left.b + right.b) * 0.5f};
}

// FCU pose for given frame
Pose makeFcu(int frameIndex) {
    float along = frameIndex * 0.055f;
    float lateral = 0.25f * sinf(frameIndex * 0.035f) + 0.08f;
    Vec2 pos = dir(AISLE_YAW) * along + aisleNormal(AISLE_YAW) * lateral;
    float yaw = AISLE_YAW + 0.18f * sinf(frameIndex * 0.04f);
    return {pos.x, pos.y, yaw};
}

// Signed distance to slope-intercept line
float signedDistanceToLine(Vec2 p, Line line) {
    return (line.m * p.x - p.y + line.b) / sqrtf(line.m * line.m + 1.0f);
}

// Correct pose toward centerline
Pose correctedPose(Pose fcu, Line center, float smoothedDist) {
    Vec2 lineNormal = {center.m, -1.0f};
    float n = sqrtf(lineNormal.x * lineNormal.x + lineNormal.y * lineNormal.y);
    Vec2 unit = {lineNormal.x / n, lineNormal.y / n};
    return {
        fcu.x - unit.x * smoothedDist,
        fcu.y - unit.y * smoothedDist,
        AISLE_YAW
    };
}

// World renderer
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
            minX = fminf(minX, p.x); maxX = fmaxf(maxX, p.x);
            minY = fminf(minY, p.y); maxY = fmaxf(maxY, p.y);
        }
        minX -= 0.9f; minY -= 0.9f;
        maxX += 0.9f; maxY += 0.9f;

        scale = fminf(rect.width / (maxX - minX), rect.height / (maxY - minY));
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
            DrawCircleV(toScreen(p), size, color);
        }
    }

    void drawLine(Line line, Color color, float thickness) const {
        Vector2 a = toScreen({minX, line.m * minX + line.b});
        Vector2 b = toScreen({maxX, line.m * maxX + line.b});
        DrawLineEx(a, b, thickness, color);
    }

    void drawPose(Pose pose, Color color, const char* label) const {
        Vector2 s = toScreen({pose.x, pose.y});
        Vector2 tip = {s.x + cosf(pose.yaw) * 42, s.y - sinf(pose.yaw) * 42};
        DrawCircleV(s, 6, color);
        DrawLineEx(s, tip, 3.0f, color);
        DrawText(label, (int)s.x + 10, (int)s.y - 10, 12, {230, 230, 230, 255});
    }
};

// Draw panel
void drawPanel(int screenW, int leftFace, int leftTotal, int rightFace, int rightTotal,
               float slope, float rawDist, float smoothedDist) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Pipeline overview", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "left face points: %d/%d", leftFace, leftTotal);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "right face points: %d/%d", rightFace, rightTotal);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "centerline slope: %.3f", slope);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "raw lateral error: %.3f m", rawDist);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "smoothed error: %.3f m", smoothedDist);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This file is intentionally standalone.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("No shared demo renderer is imported.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Read from top to bottom like the", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("C++ correction pipeline stages.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Pipeline Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;
    float smoothedDist = 0.0f;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) { simFrame = 0; smoothedDist = 0.0f; }

        int frameIndex = simFrame / 3;

        // Generate tracks
        Track left = makeTrack(frameIndex, "left");
        Track right = makeTrack(frameIndex, "right");

        // Filter face points
        std::vector<Vec2> leftFace = filterFace(left.points);
        std::vector<Vec2> rightFace = filterFace(right.points);

        // Fit lines
        Line leftFit = fitLine(leftFace);
        Line rightFit = fitLine(rightFace);
        Line center = centerlineFromTwoFits(leftFit, rightFit);

        // Poses
        Pose fcu = makeFcu(frameIndex);
        float rawDist = signedDistanceToLine({fcu.x, fcu.y}, center);
        smoothedDist = 0.07f * rawDist + 0.93f * smoothedDist;
        Pose corrected = correctedPose(fcu, center, smoothedDist);

        // Collect all points for bounds
        std::vector<Vec2> allPoints;
        allPoints.insert(allPoints.end(), left.points.begin(), left.points.end());
        allPoints.insert(allPoints.end(), right.points.begin(), right.points.end());
        allPoints.push_back({fcu.x, fcu.y});
        allPoints.push_back({corrected.x, corrected.y});

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Full pipeline sketch", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: pointclouds -> face filter -> line fit -> centerline -> corrected pose",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight(), allPoints);
        world.drawGrid();

        // Raw points (dim)
        world.drawPoints(left.points, {83, 198, 255, 70}, 3);
        world.drawPoints(right.points, {255, 199, 87, 70}, 3);

        // Face points (bright)
        world.drawPoints(leftFace, {83, 198, 255, 210}, 4);
        world.drawPoints(rightFace, {255, 199, 87, 210}, 4);

        // Lines
        world.drawLine(leftFit, {83, 198, 255, 255}, 2);
        world.drawLine(rightFit, {255, 199, 87, 255}, 2);
        world.drawLine(center, {163, 230, 53, 255}, 5);

        // Poses
        world.drawPose(fcu, {255, 199, 87, 255}, "FCU");
        world.drawPose(corrected, {82, 255, 168, 255}, "corrected");

        drawPanel(GetScreenWidth(),
                  (int)leftFace.size(), (int)left.points.size(),
                  (int)rightFace.size(), (int)right.points.size(),
                  center.m, rawDist, smoothedDist);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

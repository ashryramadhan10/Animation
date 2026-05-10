// Coefficient Smoothing Demo
// Demonstrates EMA smoothing of fitted line coefficients before using them
// in heading/centerline logic. Dampens noisy mask/pointcloud geometry.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

// Line in slope-intercept form
struct Line {
    float m, b;
};

// History entry
struct HistoryItem {
    Line raw;
    Line smooth;
};

// Generate noisy raw line at given frame
Line rawLineAt(int frame) {
    float trueSlope = 0.62f;
    float noisySlope = trueSlope + 0.09f * sinf(frame * 0.33f) + 0.035f * sinf(frame * 1.2f);
    float noisyC = 0.72f + 0.16f * sinf(frame * 0.21f) + 0.06f * cosf(frame * 0.77f);
    return {noisySlope, noisyC};
}

// Generate smoothed line history
std::vector<HistoryItem> smoothLines(int count, float alpha) {
    std::vector<HistoryItem> out;
    Line smooth = {0, 0};
    bool hasSmooth = false;

    for (int i = 0; i < count; ++i) {
        Line raw = rawLineAt(i);
        if (!hasSmooth) {
            smooth = raw;
            hasSmooth = true;
        } else {
            smooth.m = alpha * raw.m + (1 - alpha) * smooth.m;
            smooth.b = alpha * raw.b + (1 - alpha) * smooth.b;
        }
        out.push_back({raw, smooth});
    }
    return out;
}

// World renderer
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        minX = -3; maxX = 3;
        minY = -1; maxY = 3;
        scale = fminf(rect.width / 6.0f, rect.height / 4.0f);
    }

    Vector2 toScreen(float x, float y) const {
        return {
            rect.x + rect.width * 0.5f + x * scale,
            rect.y + rect.height * 0.5f - (y - 1.0f) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
    }

    void drawLine(const Line& line, Color color, float thickness) const {
        Vector2 a = toScreen(minX, line.m * minX + line.b);
        Vector2 b = toScreen(maxX, line.m * maxX + line.b);
        DrawLineEx(a, b, thickness, color);
    }

    void drawPointsOnLine(const Line& line) const {
        for (int i = 0; i < 120; ++i) {
            float x = -2.6f + i / 119.0f * 5.2f;
            float y = line.m * x + line.b + 0.05f * sinf(i * 0.9f);
            Vector2 s = toScreen(x, y);
            DrawCircleV(s, 2, {111, 126, 153, 110});
        }
    }
};

// Draw panel
void drawPanel(int screenW, float alpha, const HistoryItem& item) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Coefficient EMA", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "alpha: %.2f", alpha);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "raw slope: %.3f", item.raw.m);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "smoothed slope: %.3f", item.smooth.m);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "raw intercept: %.3f", item.raw.b);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "smoothed intercept: %.3f", item.smooth.b);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Orange is the newest fitted line.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Cyan is the EMA-smoothed line.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This damps noisy mask/pointcloud", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("geometry without changing the core", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("line representation.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Coefficient Smoothing Demo");
    SetTargetFPS(30);

    const float alpha = 0.3f;
    std::vector<HistoryItem> history = smoothLines(180, alpha);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        int index = (simFrame / 3) % (int)history.size();
        const HistoryItem& item = history[index];

        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Coefficient smoothing", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: smooth fitted line coefficients before using them in heading/centerline logic",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();
        world.drawPointsOnLine(item.raw);
        world.drawLine(item.raw, {255, 142, 88, 255}, 2);     // Orange - raw
        world.drawLine(item.smooth, {87, 220, 255, 255}, 4);  // Cyan - smoothed

        drawPanel(GetScreenWidth(), alpha, item);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

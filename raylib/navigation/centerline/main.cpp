// Centerline Demo
// Demonstrates dual-beam vs single-beam centerline estimation.
// Dual mode averages two rack lines, single mode offsets one by expected aisle half-width.

#include "raylib.h"
#include <cmath>
#include <string>

const float HEADING = 33.4f * (PI / 180.0f);

// Line in implicit form: ax + by + c = 0
struct Line {
    float a, b, c;
};

// Creates a rack or centerline equation from a lateral aisle offset
Line lineFromOffset(float offset) {
    float a = -sinf(HEADING);
    float b = cosf(HEADING);
    return {a, b, -offset};
}

// Sample a point on the line at a given along-aisle distance
Vector2 linePoint(const Line& line, float along) {
    Vector2 dir = {cosf(HEADING), sinf(HEADING)};
    Vector2 normal = {line.a, line.b};
    Vector2 base = {-normal.x * line.c, -normal.y * line.c};
    return {base.x + dir.x * along, base.y + dir.y * along};
}

// Average left and right rack lines for dual-beam centerline
Line averageLines(const Line& left, const Line& right) {
    return {
        (left.a + right.a) * 0.5f,
        (left.b + right.b) * 0.5f,
        (left.c + right.c) * 0.5f
    };
}

// Offset single rack line for single-beam centerline estimation
Line offsetSingleLine(const Line& line, float sideSign, float halfWidth) {
    return {line.a, line.b, line.c - sideSign * halfWidth};
}

// World-to-screen transformer
class WorldRenderer {
public:
    Rectangle rect;
    float scale;
    float centerX, centerY;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        // Fixed bounds for this demo
        float worldW = 9.0f;  // -3 to 6
        float worldH = 7.0f;  // -3 to 4
        scale = fminf(rect.width / worldW, rect.height / worldH);
        centerX = 1.5f;
        centerY = 0.5f;
    }

    Vector2 toScreen(Vector2 p) const {
        return {
            rect.x + rect.width * 0.5f + (p.x - centerX) * scale,
            rect.y + rect.height * 0.5f - (p.y - centerY) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
    }

    void drawLine(const Line& line, Color color, float thickness) const {
        Vector2 a = toScreen(linePoint(line, -5.0f));
        Vector2 b = toScreen(linePoint(line, 8.0f));
        DrawLineEx(a, b, thickness, color);
    }
};

// Draw info panel
void drawPanel(int screenW, bool showDual, float halfWidth) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Centerline", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "mode: %s", showDual ? "dual beam" : "single beam fallback");
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "half width: %.3f m", halfWidth);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "heading: %.2f deg", HEADING * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Dual: center.c = average(left.c, right.c)", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Single: shift the observed rack line", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("by the expected aisle half-width.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Green is the estimated aisle center.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Centerline Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Animate half-width slightly
        float halfWidth = 1.55f + 0.06f * sinf(simFrame * 0.025f);

        // Create rack lines
        Line left = lineFromOffset(halfWidth);
        Line right = lineFromOffset(-halfWidth);

        // Compute centerlines
        Line dualCenter = averageLines(left, right);
        Line singleCenter = offsetSingleLine(left, 1.0f, halfWidth);

        // Alternate between dual and single mode every 90 frames
        bool showDual = (simFrame / 90) % 2 == 0;
        Line center = showDual ? dualCenter : singleCenter;

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Centerline estimation", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: average two rack lines, or offset one rack line by expected aisle half-width",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();

        // Draw left rack (blue)
        world.drawLine(left, {83, 198, 255, 255}, 3);

        // Draw right rack (yellow) only in dual mode
        if (showDual) {
            world.drawLine(right, {255, 199, 87, 255}, 3);
        }

        // Draw centerline (green)
        world.drawLine(center, {163, 230, 53, 255}, 5);

        drawPanel(GetScreenWidth(), showDual, halfWidth);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

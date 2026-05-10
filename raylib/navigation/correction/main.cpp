// Correction Demo
// Demonstrates lateral pose correction using signed distance to centerline.
// Shows how the FCU pose is shifted perpendicular to the aisle using EMA smoothing.

#include "raylib.h"
#include <cmath>
#include <string>

const float HEADING = 33.5f * (PI / 180.0f);

// Centerline in implicit form: ax + by + c = 0
struct Line {
    float a, b, c;
};

const Line CENTERLINE = {-sinf(HEADING), cosf(HEADING), 0.0f};

// Pose with position and yaw
struct Pose {
    float x, y, yaw;
};

// Signed distance from point to line
float signedDistance(float x, float y, const Line& line) {
    return line.a * x + line.b * y + line.c;
}

// Move FCU pose laterally toward centerline using smoothed error
Pose correctedPose(const Pose& fcu, float smoothedDist) {
    return {
        fcu.x - smoothedDist * CENTERLINE.a,
        fcu.y - smoothedDist * CENTERLINE.b,
        HEADING
    };
}

// Generate moving FCU pose with lateral drift
Pose makeFcu(int frame) {
    float dirX = cosf(HEADING);
    float dirY = sinf(HEADING);
    float normX = CENTERLINE.a;
    float normY = CENTERLINE.b;

    float along = frame * 0.045f;
    float lateral = 0.45f * sinf(frame * 0.035f) + 0.16f;

    return {
        dirX * along + normX * lateral,
        dirY * along + normY * lateral,
        HEADING + 0.25f * sinf(frame * 0.05f)
    };
}

// World renderer
class WorldRenderer {
public:
    Rectangle rect;
    float scale;
    float centerX, centerY;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        // Fixed bounds
        float worldW = 9.0f;
        float worldH = 7.0f;
        scale = fminf(rect.width / worldW, rect.height / worldH);
        centerX = 2.4f;
        centerY = 0.6f;
    }

    Vector2 toScreen(float x, float y) const {
        return {
            rect.x + rect.width * 0.5f + (x - centerX) * scale,
            rect.y + rect.height * 0.5f - (y - centerY) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
    }

    void drawSegment(float x1, float y1, float x2, float y2, Color color, float thickness) const {
        Vector2 a = toScreen(x1, y1);
        Vector2 b = toScreen(x2, y2);
        DrawLineEx(a, b, thickness, color);
    }

    void drawPose(const Pose& pose, Color color, const char* label) const {
        Vector2 s = toScreen(pose.x, pose.y);
        Vector2 tip = {s.x + cosf(pose.yaw) * 45, s.y - sinf(pose.yaw) * 45};

        DrawCircleV(s, 6, color);
        DrawLineEx(s, tip, 3.0f, color);
        DrawText(label, (int)s.x + 10, (int)s.y - 10, 12, {230, 230, 230, 255});
    }
};

// Draw panel
void drawPanel(int screenW, float rawDist, float smoothedDist) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Corrected pose", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "raw distance: %.3f m", rawDist);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "smoothed distance: %.3f m", smoothedDist);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "corrected yaw: %.2f deg", HEADING * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("The correction vector is perpendicular", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("to the aisle centerline.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("The corrected heading is the aisle", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("heading in world/map coordinates.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Correction Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;
    float smoothedDist = 0.0f;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) { simFrame = 0; smoothedDist = 0.0f; }

        // Compute poses
        Pose fcu = makeFcu(simFrame);
        float rawDist = signedDistance(fcu.x, fcu.y, CENTERLINE);
        smoothedDist = 0.08f * rawDist + 0.92f * smoothedDist;
        Pose corrected = correctedPose(fcu, smoothedDist);

        float dirX = cosf(HEADING);
        float dirY = sinf(HEADING);

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Lateral pose correction", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: signed distance to centerline -> EMA -> shift FCU pose perpendicular to aisle",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();

        // Draw centerline (green)
        world.drawSegment(-4 * dirX, -4 * dirY, 9 * dirX, 9 * dirY,
                         {163, 230, 53, 255}, 5);

        // Draw correction line (white, connecting FCU to corrected)
        world.drawSegment(fcu.x, fcu.y, corrected.x, corrected.y,
                         {255, 255, 255, 170}, 2);

        // Draw poses
        world.drawPose(fcu, {255, 199, 87, 255}, "FCU");
        world.drawPose(corrected, {82, 255, 168, 255}, "corrected");

        drawPanel(GetScreenWidth(), rawDist, smoothedDist);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

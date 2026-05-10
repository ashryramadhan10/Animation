/**
 * TF Logic Demo
 *
 * PURPOSE:
 * Demonstrates transform frame yaw composition in the navigation pipeline.
 * Shows how parent and child rotations combine to produce the final pose.
 *
 * KEY CONCEPT:
 * In ROS/robotics, transforms chain together like nested game objects:
 *   map -> correction -> base_link
 *
 * When the correction frame rotates by -aisle_yaw and the child rotates by
 * +aisle_yaw, they cancel out, producing zero composed rotation in local frame.
 *
 * TF CHAIN:
 *   map                    (world frame, yaw = 0)
 *    └── odom_vision_correction  (parent rotates by -aisle_yaw)
 *         └── base_link          (child rotates by +aisle_yaw)
 *              └── composed yaw = -aisle_yaw + aisle_yaw = 0
 *
 * WHY THIS MATTERS:
 * The correction shifts/rotates the pose to align with the aisle, but the
 * composed result in local coordinates shows zero rotation - meaning the
 * robot is aligned with its local forward direction.
 *
 * VISUAL:
 *   [map]      [correction]      [composed]
 *    →            ↗                 →
 *   (0°)      (-33.5°)           (0° local)
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <string>

//=============================================================================
// Constants
//=============================================================================
/**
 * AISLE_YAW - The aisle heading in radians (~33.5 degrees).
 *
 * This is the angle the aisle makes with the world X-axis.
 * The correction frame rotates by -AISLE_YAW to align with the aisle.
 * The child frame rotates by +AISLE_YAW to compensate.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Computes parent, child, and composed yaw values
 *   - drawPanel(): Displays the values in degrees
 */
const float AISLE_YAW = 33.5f * (PI / 180.0f);

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates to screen coordinates.
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   world.drawAxis(0.0f, 0.0f, 0.0f, "map");  // Draw frame at origin
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render coordinate frames
 */
class WorldRenderer {
public:
    Rectangle rect;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        scale = fminf(rect.width / 8.0f, rect.height / 6.0f);
    }

    Vector2 toScreen(float x, float y) const {
        return {
            rect.x + rect.width * 0.5f + x * scale,
            rect.y + rect.height * 0.5f - y * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
        for (int x = -4; x <= 4; ++x) {
            Vector2 a = toScreen((float)x, -3);
            Vector2 b = toScreen((float)x, 3);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
        for (int y = -3; y <= 3; ++y) {
            Vector2 a = toScreen(-4, (float)y);
            Vector2 b = toScreen(4, (float)y);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
    }

    /**
     * Draws a coordinate frame (two perpendicular axes) at given position.
     *
     * PARAMETERS:
     *   originX, originY - Position of frame origin
     *   yaw              - Rotation of frame (radians)
     *   label            - Frame name displayed above
     *
     * COLORS:
     *   Red: X-axis (forward direction)
     *   Green: Y-axis (left direction)
     *
     * USAGE EXAMPLE:
     *   world.drawAxis(-2.0f, 0.0f, 0.0f, "map");
     *   world.drawAxis(0.0f, 0.0f, -0.58f, "correction");
     *
     * USED IN THIS SCRIPT:
     *   - main(): Draws map, correction, and composed frames
     */
    void drawAxis(float originX, float originY, float yaw, const char* label) const {
        Vector2 s = toScreen(originX, originY);

        // X axis (red) - forward direction
        Vector2 xTip = toScreen(originX + cosf(yaw), originY + sinf(yaw));
        DrawLineEx(s, xTip, 4, {248, 113, 113, 255});

        // Y axis (green) - left direction (perpendicular to X)
        Vector2 yTip = toScreen(originX - sinf(yaw) * 0.8f, originY + cosf(yaw) * 0.8f);
        DrawLineEx(s, yTip, 4, {82, 255, 168, 255});

        DrawText(label, (int)s.x + 8, (int)s.y - 18, 12, {230, 230, 230, 255});
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing yaw values.
 *
 * PARAMETERS:
 *   aisleYaw    - The aisle heading (for reference)
 *   parentYaw   - Rotation of correction frame (-aisle_yaw)
 *   childYaw    - Rotation of child frame (+aisle_yaw)
 *   composedYaw - Net rotation (parent + child = 0)
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to display yaw breakdown
 */
void drawPanel(int screenW, float aisleYaw, float parentYaw, float childYaw, float composedYaw) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("TF yaw logic", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "aisle yaw: %.2f deg", aisleYaw * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "map -> correction yaw: %.2f deg", parentYaw * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "correction -> base yaw: %.2f deg", childYaw * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "composed yaw: %.2f deg", composedYaw * 180.0f / PI);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Read this like nested game objects:", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("parent rotation + child rotation", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("produces the local composed result.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This does not mean the world", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("corrected pose has zero yaw.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "TF Logic Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // TF chain yaw values:
        // Parent (map->correction) rotates by -aisle_yaw
        // Child (correction->base) rotates by +aisle_yaw
        // Composed = parent + child = 0
        float parentYaw = -AISLE_YAW;
        float childYaw = AISLE_YAW;
        float composedYaw = parentYaw + childYaw;  // = 0

        // Small animation pulse for visual interest
        float pulse = 0.2f * sinf(simFrame * 0.04f);

        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("TF correction frame logic", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: parent rotates by -aisle_yaw and child rotates by +aisle_yaw",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();

        // Draw three coordinate frames showing the chain:
        // 1. Map frame (world, yaw = 0)
        world.drawAxis(-2.2f, 0.0f, 0.0f, "map");

        // 2. Correction frame (rotated by -aisle_yaw, with pulse animation)
        world.drawAxis(0.0f, pulse, parentYaw, "odom_vision_correction");

        // 3. Composed local frame (net yaw = 0)
        world.drawAxis(2.2f, 0.0f, composedYaw, "composed local yaw");

        drawPanel(GetScreenWidth(), AISLE_YAW, parentYaw, childYaw, composedYaw);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

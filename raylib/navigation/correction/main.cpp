/**
 * Correction Demo
 *
 * PURPOSE:
 * Demonstrates lateral pose correction using signed distance to centerline.
 * Shows how the FCU (Flight Control Unit) pose is shifted perpendicular to
 * the aisle to produce a corrected pose centered on the aisle.
 *
 * KEY CONCEPT:
 * The FCU (raw navigation) drifts laterally due to sensor errors. By measuring
 * signed distance to the centerline and applying EMA smoothing, we compute a
 * correction vector that shifts the pose back toward center.
 *
 * VISUAL:
 *   CENTERLINE (green): ============================
 *                              ^
 *                              | correction vector
 *                              |
 *                           [FCU] drifting pose
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <string>

//=============================================================================
// Global Constants
//=============================================================================
/**
 * HEADING - Aisle direction in radians (~33.5 degrees).
 *
 * USED IN THIS SCRIPT:
 *   - CENTERLINE: Normal vector derived from this
 *   - correctedPose(): Uses HEADING as corrected yaw
 *   - makeFcu(): Generates along-aisle motion
 */
const float HEADING = 33.5f * (PI / 180.0f);

//=============================================================================
// Line - Implicit Form ax + by + c = 0
//=============================================================================
/**
 * Represents a line in implicit/general form: ax + by + c = 0
 *
 * For the centerline, (a, b) is the normal vector perpendicular to the aisle.
 * c = 0 means the centerline passes through the origin.
 *
 * USED IN THIS SCRIPT:
 *   - CENTERLINE: Global constant defining the aisle center
 *   - signedDistance(): Computes how far left/right a point is
 *   - correctedPose(): Uses normal direction for correction vector
 */
struct Line {
    float a, b, c;
};

/**
 * CENTERLINE - The aisle centerline passing through origin.
 *
 * Normal vector: (-sin(HEADING), cos(HEADING))
 * Points left of center have positive signed distance.
 * Points right of center have negative signed distance.
 */
const Line CENTERLINE = {-sinf(HEADING), cosf(HEADING), 0.0f};

//=============================================================================
// Pose - Position and Orientation
//=============================================================================
/**
 * Represents a 2D pose with position (x, y) and yaw angle.
 *
 * USAGE EXAMPLE:
 *   Pose fcu = {1.2f, 0.8f, 0.58f};  // Position (1.2, 0.8), yaw 0.58 rad
 *
 * USED IN THIS SCRIPT:
 *   - makeFcu(): Returns simulated FCU pose
 *   - correctedPose(): Returns corrected pose on centerline
 *   - WorldRenderer::drawPose(): Renders pose as arrow
 */
struct Pose {
    float x, y, yaw;
};

//=============================================================================
// signedDistance() - Distance from Point to Line
//=============================================================================
/**
 * Computes signed distance from a point to the centerline.
 *
 * PARAMETERS:
 *   x, y - Point coordinates
 *   line - Line in implicit form
 *
 * RETURNS:
 *   Positive: Point is on left side of centerline
 *   Negative: Point is on right side of centerline
 *   Zero: Point is exactly on centerline
 *
 * MATH:
 *   signedDist = a*x + b*y + c
 *   (Works when (a,b) is a unit normal vector)
 *
 * USAGE EXAMPLE:
 *   float dist = signedDistance(fcu.x, fcu.y, CENTERLINE);
 *   if (dist > 0) { /* robot is left of center * / }
 *
 * USED IN THIS SCRIPT:
 *   - main(): Computes raw lateral error each frame
 */
float signedDistance(float x, float y, const Line& line) {
    return line.a * x + line.b * y + line.c;
}

//=============================================================================
// correctedPose() - Apply Lateral Correction
//=============================================================================
/**
 * Moves the FCU pose laterally toward the centerline.
 *
 * PARAMETERS:
 *   fcu          - Raw FCU pose with drift
 *   smoothedDist - EMA-smoothed signed distance to center
 *
 * RETURNS:
 *   Corrected pose shifted by smoothedDist along centerline normal
 *
 * CORRECTION LOGIC:
 *   corrected.x = fcu.x - smoothedDist * normal.x
 *   corrected.y = fcu.y - smoothedDist * normal.y
 *   corrected.yaw = aisle heading (not FCU's raw yaw)
 *
 * USAGE EXAMPLE:
 *   float smoothedDist = ema(rawDist);
 *   Pose corrected = correctedPose(fcu, smoothedDist);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Computes corrected pose each frame
 */
Pose correctedPose(const Pose& fcu, float smoothedDist) {
    return {
        fcu.x - smoothedDist * CENTERLINE.a,
        fcu.y - smoothedDist * CENTERLINE.b,
        HEADING  // Use aisle heading, not FCU's noisy yaw
    };
}

//=============================================================================
// makeFcu() - Generate Simulated FCU Pose
//=============================================================================
/**
 * Creates a moving FCU pose with realistic lateral drift.
 *
 * PARAMETERS:
 *   frame - Frame index (determines position along aisle)
 *
 * RETURNS:
 *   Pose that moves along aisle with oscillating lateral error
 *
 * SIMULATION:
 *   - Moves along aisle at 0.045m per frame
 *   - Lateral drift: sinusoidal with ~0.45m amplitude
 *   - Yaw oscillates around true heading
 *
 * USAGE EXAMPLE:
 *   Pose fcu = makeFcu(100);  // FCU pose at frame 100
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to get current FCU state
 */
Pose makeFcu(int frame) {
    float dirX = cosf(HEADING);
    float dirY = sinf(HEADING);
    float normX = CENTERLINE.a;
    float normY = CENTERLINE.b;

    // Move along aisle
    float along = frame * 0.045f;
    // Oscillating lateral drift
    float lateral = 0.45f * sinf(frame * 0.035f) + 0.16f;

    return {
        dirX * along + normX * lateral,
        dirY * along + normY * lateral,
        HEADING + 0.25f * sinf(frame * 0.05f)  // Yaw noise
    };
}

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates (meters) to screen coordinates (pixels).
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   world.drawPose(fcu, YELLOW, "FCU");
 *   world.drawPose(corrected, GREEN, "corrected");
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render centerline and poses
 */
class WorldRenderer {
public:
    Rectangle rect;
    float scale;
    float centerX, centerY;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
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

    /**
     * Draws a pose as a circle with an arrow showing direction.
     */
    void drawPose(const Pose& pose, Color color, const char* label) const {
        Vector2 s = toScreen(pose.x, pose.y);
        Vector2 tip = {s.x + cosf(pose.yaw) * 45, s.y - sinf(pose.yaw) * 45};

        DrawCircleV(s, 6, color);
        DrawLineEx(s, tip, 3.0f, color);
        DrawText(label, (int)s.x + 10, (int)s.y - 10, 12, {230, 230, 230, 255});
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing distance values.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to display raw and smoothed distances
 */
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

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Correction Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;
    float smoothedDist = 0.0f;  // EMA state

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) { simFrame = 0; smoothedDist = 0.0f; }

        // Get current FCU pose
        Pose fcu = makeFcu(simFrame);

        // Compute signed distance to centerline
        float rawDist = signedDistance(fcu.x, fcu.y, CENTERLINE);

        // Apply EMA smoothing (alpha = 0.08)
        smoothedDist = 0.08f * rawDist + 0.92f * smoothedDist;

        // Compute corrected pose
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

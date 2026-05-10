/**
 * Centerline Demo
 *
 * PURPOSE:
 * Demonstrates two methods for estimating the aisle centerline:
 *   1. Dual-beam: Average left and right rack lines
 *   2. Single-beam fallback: Offset one rack by expected aisle half-width
 *
 * KEY CONCEPT:
 * When both rack faces are visible, averaging their positions gives the true
 * centerline. When only one is visible (common in occlusion), we shift that
 * line by the known aisle width to estimate the center.
 *
 * VISUAL:
 *   Dual mode:    [LEFT] ========== CENTER ========== [RIGHT]
 *   Single mode:  [LEFT] ---- offset ----> CENTER (estimated)
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
 * HEADING - Aisle direction in radians (~33.4 degrees).
 *
 * USED IN THIS SCRIPT:
 *   - lineFromOffset(): Builds line perpendicular to this heading
 *   - linePoint(): Computes points along this direction
 */
const float HEADING = 33.4f * (PI / 180.0f);

//=============================================================================
// Line - Implicit Form ax + by + c = 0
//=============================================================================
/**
 * Represents a line in implicit/general form: ax + by + c = 0
 *
 * WHY IMPLICIT FORM?
 * This form handles vertical lines and makes distance calculations uniform.
 * For lines aligned with an aisle heading, (a,b) is the perpendicular (normal)
 * direction, and c is the signed offset from the origin.
 *
 * USAGE EXAMPLE:
 *   Line left = lineFromOffset(1.5f);   // 1.5m to the left
 *   Line right = lineFromOffset(-1.5f); // 1.5m to the right
 *   Line center = averageLines(left, right);
 *
 * USED IN THIS SCRIPT:
 *   - lineFromOffset(): Creates rack lines at specific lateral offsets
 *   - averageLines(): Computes dual-beam centerline
 *   - offsetSingleLine(): Computes single-beam fallback centerline
 */
struct Line {
    float a, b, c;
};

//=============================================================================
// lineFromOffset() - Create Line at Lateral Offset
//=============================================================================
/**
 * Creates a rack or centerline equation from a lateral aisle offset.
 *
 * PARAMETERS:
 *   offset - Signed distance from centerline (positive = left, negative = right)
 *
 * RETURNS:
 *   Line in implicit form where (a,b) is perpendicular to HEADING
 *
 * MATH:
 *   Normal vector = (-sin(heading), cos(heading))
 *   Line equation: -sin(h)*x + cos(h)*y - offset = 0
 *
 * USAGE EXAMPLE:
 *   Line leftRack = lineFromOffset(1.58f);   // Left wall at 1.58m
 *   Line rightRack = lineFromOffset(-1.58f); // Right wall at -1.58m
 *
 * USED IN THIS SCRIPT:
 *   - main(): Creates left and right rack lines each frame
 */
Line lineFromOffset(float offset) {
    float a = -sinf(HEADING);
    float b = cosf(HEADING);
    return {a, b, -offset};
}

//=============================================================================
// linePoint() - Sample Point on Line
//=============================================================================
/**
 * Computes a point on the line at a given along-aisle distance.
 *
 * PARAMETERS:
 *   line  - Line in implicit form
 *   along - Distance along the aisle direction
 *
 * RETURNS:
 *   2D point on the line
 *
 * MATH:
 *   base = normal * (-c)       // Point closest to origin
 *   point = base + dir * along // Move along aisle direction
 *
 * USAGE EXAMPLE:
 *   Vector2 start = linePoint(rack, -5.0f);  // Point 5m behind
 *   Vector2 end = linePoint(rack, 8.0f);     // Point 8m ahead
 *
 * USED IN THIS SCRIPT:
 *   - WorldRenderer::drawLine(): Samples two endpoints to render
 */
Vector2 linePoint(const Line& line, float along) {
    Vector2 dir = {cosf(HEADING), sinf(HEADING)};
    Vector2 normal = {line.a, line.b};
    Vector2 base = {-normal.x * line.c, -normal.y * line.c};
    return {base.x + dir.x * along, base.y + dir.y * along};
}

//=============================================================================
// averageLines() - Dual-Beam Centerline
//=============================================================================
/**
 * Averages left and right rack lines for dual-beam centerline.
 *
 * PARAMETERS:
 *   left  - Left rack line
 *   right - Right rack line
 *
 * RETURNS:
 *   Centerline (average of both racks)
 *
 * WHY AVERAGE?
 * When both rack faces are visible, the true center is exactly between them.
 * Averaging coefficients (especially c) gives this midpoint.
 *
 * USAGE EXAMPLE:
 *   Line left = lineFromOffset(1.55f);
 *   Line right = lineFromOffset(-1.55f);
 *   Line center = averageLines(left, right);  // c ≈ 0
 *
 * USED IN THIS SCRIPT:
 *   - main(): Computes centerline in dual-beam mode
 */
Line averageLines(const Line& left, const Line& right) {
    return {
        (left.a + right.a) * 0.5f,
        (left.b + right.b) * 0.5f,
        (left.c + right.c) * 0.5f
    };
}

//=============================================================================
// offsetSingleLine() - Single-Beam Fallback
//=============================================================================
/**
 * Offsets a single rack line to estimate centerline when one rack is missing.
 *
 * PARAMETERS:
 *   line      - The visible rack line
 *   sideSign  - +1.0 if left rack visible, -1.0 if right rack visible
 *   halfWidth - Expected half-width of the aisle (e.g., 1.55m)
 *
 * RETURNS:
 *   Estimated centerline shifted from the visible rack
 *
 * WHY NEEDED?
 * Occlusion often blocks one rack. If we know the aisle is ~3.1m wide,
 * we can shift the visible rack inward by 1.55m to estimate center.
 *
 * USAGE EXAMPLE:
 *   // Only left rack visible
 *   Line center = offsetSingleLine(leftRack, 1.0f, 1.55f);
 *   // Only right rack visible
 *   Line center = offsetSingleLine(rightRack, -1.0f, 1.55f);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Computes centerline in single-beam fallback mode
 */
Line offsetSingleLine(const Line& line, float sideSign, float halfWidth) {
    return {line.a, line.b, line.c - sideSign * halfWidth};
}

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates (meters) to screen coordinates (pixels).
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   Vector2 screenPos = world.toScreen({1.5f, 2.0f});
 *   world.drawLine(centerline, GREEN, 5);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render grid, rack lines, and centerline
 */
class WorldRenderer {
public:
    Rectangle rect;
    float scale;
    float centerX, centerY;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        // World bounds: x from -3 to 6, y from -3 to 4
        float worldW = 9.0f;
        float worldH = 7.0f;
        scale = fminf(rect.width / worldW, rect.height / worldH);
        centerX = 1.5f;  // World center offset
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

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing current mode and parameters.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to display mode, half-width, and heading
 */
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

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Centerline Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Animate half-width slightly to show the principle
        float halfWidth = 1.55f + 0.06f * sinf(simFrame * 0.025f);

        // Create rack lines at +/- halfWidth from centerline
        Line left = lineFromOffset(halfWidth);
        Line right = lineFromOffset(-halfWidth);

        // Compute both centerline estimates
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

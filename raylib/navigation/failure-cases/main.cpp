/**
 * Failure Cases Demo
 *
 * PURPOSE:
 * Visualizes when the correction system should reject, reset, or freeze state
 * rather than blindly applying potentially corrupted measurements.
 *
 * KEY CONCEPT:
 * Not all measurements are valid. The system must recognize when:
 *   - A beam is missing (occlusion)
 *   - A beam heading disagrees with aisle consensus (outlier)
 *   - A track ID has been reassigned to different geometry (switch)
 *
 * FAILURE CASES:
 *   1. NORMAL: Both beams agree -> update correction
 *   2. MISSING BEAM: Only one reliable -> offset by half-width or freeze
 *   3. HEADING OUTLIER: One beam disagrees -> reject the bad one
 *   4. TRACK ID SWITCH: ID now means different beam -> reset accumulated state
 *
 * PRINCIPLE:
 * Do not update correction from geometry that no longer describes the same
 * physical rack/aisle evidence. Bad updates cause steering into walls.
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

//=============================================================================
// BeamVis - Beam Visualization Data
//=============================================================================
/**
 * Represents a single beam measurement for visualization.
 *
 * FIELDS:
 *   angle    - Beam heading in degrees
 *   color    - Green if accepted, red if rejected
 *   accepted - Whether this beam contributes to correction
 *   shifted  - Whether this beam has shifted position (track switch)
 *
 * USAGE EXAMPLE:
 *   BeamVis beam = {33.0f, GREEN, true, false};  // Good beam at 33 deg
 *   BeamVis bad = {52.0f, RED, false, false};    // Outlier at 52 deg
 *
 * USED IN THIS SCRIPT:
 *   - CASES: Defines beams for each failure scenario
 *   - main(): Renders beams based on these settings
 */
struct BeamVis {
    float angle;
    Color color;
    bool accepted;
    bool shifted;
};

//=============================================================================
// Case - Failure Case Scenario
//=============================================================================
/**
 * Defines one failure case scenario with its visualization and explanation.
 *
 * FIELDS:
 *   title - Short name shown in panel
 *   beams - Vector of beams to display
 *   notes - Explanation lines shown in panel
 *
 * USED IN THIS SCRIPT:
 *   - CASES: Global vector of all scenarios
 *   - main(): Cycles through cases for animation
 *   - drawPanel(): Displays current case info
 */
struct Case {
    const char* title;
    std::vector<BeamVis> beams;
    std::vector<const char*> notes;
};

//=============================================================================
// CASES - All Failure Case Definitions
//=============================================================================
/**
 * Defines the four failure scenarios demonstrated in this demo.
 *
 * CASE 1: NORMAL
 *   Two beams at similar angles -> both accepted, use consensus heading
 *
 * CASE 2: MISSING BEAM
 *   Only one reliable beam -> fallback to single-beam centerline
 *
 * CASE 3: HEADING OUTLIER
 *   One beam differs by >10 degrees -> reject it, use other beam only
 *
 * CASE 4: TRACK ID SWITCH
 *   Track ID reassigned to different physical beam -> reset accumulator
 *
 * USED IN THIS SCRIPT:
 *   - main(): Indexed by (simFrame / 90) % 4
 */
std::vector<Case> CASES = {
    {
        "normal",
        {
            {33, {82, 255, 168, 255}, true, false},   // Left beam: 33 deg, accepted
            {34, {82, 255, 168, 255}, true, false}    // Right beam: 34 deg, accepted
        },
        {"Both beams agree.", "Use the consensus heading and update correction."}
    },
    {
        "missing beam",
        {
            {33, {82, 255, 168, 255}, true, false}    // Only left beam visible
        },
        {"Only one beam is reliable.", "Offset by expected half-width or freeze lateral state."}
    },
    {
        "heading outlier",
        {
            {33, {82, 255, 168, 255}, true, false},   // Good beam at 33 deg
            {52, {248, 113, 113, 255}, false, false}  // Bad beam at 52 deg (19 deg off!)
        },
        {"One beam disagrees with the aisle.", "Reject it instead of steering into a bad yaw."}
    },
    {
        "track id switch",
        {
            {33, {82, 255, 168, 255}, true, false},   // Current beam at 33 deg
            {33, {248, 113, 113, 255}, false, true}   // Same ID, different position (shifted)
        },
        {"The id no longer means the same beam.", "Reset accumulated geometry for that id."}
    }
};

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates (meters) to screen coordinates (pixels).
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   world.drawBeam(33.0f, 1.4f, GREEN);  // Beam at 33 deg, offset 1.4m
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render beams and centerline
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
    }

    /**
     * Draws a beam as a line segment at the given angle and lateral offset.
     *
     * PARAMETERS:
     *   angleDeg - Beam heading in degrees
     *   offset   - Lateral offset from centerline (positive = left)
     *   color    - Beam color (green = accepted, red = rejected)
     */
    void drawBeam(float angleDeg, float offset, Color color) const {
        float yaw = angleDeg * PI / 180.0f;
        float dirX = cosf(yaw);
        float dirY = sinf(yaw);
        float normX = -sinf(yaw);
        float normY = cosf(yaw);

        // Center of beam at lateral offset
        float centerX = normX * offset;
        float centerY = normY * offset;

        // Extend beam in both directions
        Vector2 a = toScreen(centerX - dirX * 3.2f, centerY - dirY * 3.2f);
        Vector2 b = toScreen(centerX + dirX * 3.2f, centerY + dirY * 3.2f);

        DrawLineEx(a, b, 4, color);
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing current failure case details.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame with current case
 */
void drawPanel(int screenW, const Case& current) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Failure case", (int)x + 14, 86, 14, {230, 230, 230, 255});

    int y = 118;

    char buf[128];
    snprintf(buf, sizeof(buf), "case: %s", current.title);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    // Count accepted beams
    int accepted = 0;
    for (const auto& beam : current.beams) if (beam.accepted) accepted++;
    snprintf(buf, sizeof(buf), "accepted beams: %d/%d", accepted, (int)current.beams.size());
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    // Display case-specific notes
    for (const char* note : current.notes) {
        DrawText(note, (int)x + 14, y, 12, {210, 220, 235, 255});
        y += 18;
    }

    y += 12;
    DrawText("Principle: do not update correction", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("from geometry that no longer describes", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("the same physical rack/aisle evidence.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Failure Cases Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Cycle through cases every 90 frames (~3 seconds)
        int caseIndex = (simFrame / 90) % (int)CASES.size();
        const Case& current = CASES[caseIndex];

        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Failure cases", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: visualize when correction should reject, reset, or freeze state",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();

        // Draw all beams for current case
        for (size_t i = 0; i < current.beams.size(); ++i) {
            const auto& beam = current.beams[i];
            float offset;
            if (beam.shifted) {
                offset = 1.2f;  // Shifted beam at different position
            } else if (i == 0) {
                offset = 1.4f;  // First beam (left rack)
            } else {
                offset = -1.4f; // Second beam (right rack)
            }
            world.drawBeam(beam.angle, offset, beam.color);
        }

        // Draw centerline reference (green, at 33 degrees through center)
        world.drawBeam(33, 0, {163, 230, 53, 255});

        drawPanel(GetScreenWidth(), current);

        // Show which case we're on
        char caseLabel[64];
        snprintf(caseLabel, sizeof(caseLabel), "Case %d/%d: %s",
                 caseIndex + 1, (int)CASES.size(), current.title);
        DrawText(caseLabel, GetScreenWidth() - 300, GetScreenHeight() - 25, 11, {149, 163, 184, 255});

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

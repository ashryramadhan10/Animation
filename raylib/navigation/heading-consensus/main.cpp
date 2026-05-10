/**
 * Heading Consensus Demo
 *
 * PURPOSE:
 * Demonstrates weighted circular mean heading calculation and angular outlier
 * rejection. Shows how beams outside the angular gate are excluded from
 * steering the aisle yaw.
 *
 * KEY CONCEPT:
 * Multiple beams may report slightly different headings due to noise. We:
 *   1. Compute weighted circular mean (weights = inlier counts)
 *   2. Reject beams more than threshold degrees from mean
 *   3. Recompute mean using only accepted beams
 *
 * WHY CIRCULAR MEAN?
 * Simple averaging fails near angle wraparound (e.g., 359° and 1° average to
 * 180° incorrectly). Circular mean uses sin/cos to handle this properly:
 *   mean = atan2(sum(sin(angles) * weights), sum(cos(angles) * weights))
 *
 * VISUAL:
 *   |--- beam 1 (green, accepted) ---|
 *   |--- beam 2 (green, accepted) ---|
 *   |---------------------- beam 3 (red, outlier) ---|
 *        ^--- MEAN (green line)
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <vector>
#include <set>
#include <string>

//=============================================================================
// Constants
//=============================================================================
/**
 * DEG - Conversion factor from degrees to radians.
 *
 * USAGE EXAMPLE:
 *   float rad = 33.0f * DEG;  // 33 degrees in radians
 */
const float DEG = PI / 180.0f;

//=============================================================================
// Beam - Single Beam Measurement
//=============================================================================
/**
 * Represents one fitted beam with its heading and confidence weight.
 *
 * FIELDS:
 *   id      - Unique beam identifier (for tracking)
 *   heading - Fitted heading in radians
 *   inliers - Number of inlier points (used as weight)
 *
 * WHY INLIERS AS WEIGHT?
 * More inliers = more confident fit. A beam with 35000 inliers should
 * influence the mean more than one with 5000.
 *
 * USAGE EXAMPLE:
 *   Beam beam = {1, 33.0f * DEG, 35000};  // Beam 1 at 33 deg, 35k points
 *
 * USED IN THIS SCRIPT:
 *   - makeBeams(): Generates synthetic beam measurements
 *   - consensus(): Computes weighted mean and rejects outliers
 */
struct Beam {
    int id;
    float heading;
    int inliers;
};

//=============================================================================
// ConsensusResult - Heading Consensus Output
//=============================================================================
/**
 * Result of the heading consensus algorithm.
 *
 * FIELDS:
 *   mean        - Weighted circular mean of accepted beams (radians)
 *   acceptedIds - IDs of beams within angular threshold of mean
 *
 * USED IN THIS SCRIPT:
 *   - consensus(): Returns this after computing mean and filtering
 *   - main(): Uses mean for display, acceptedIds to color beams
 */
struct ConsensusResult {
    float mean;
    std::vector<int> acceptedIds;
};

//=============================================================================
// normalizeAngle() - Wrap Angle to [-PI, PI]
//=============================================================================
/**
 * Normalizes an angle to the range [-PI, PI].
 *
 * PARAMETERS:
 *   angle - Input angle in radians (any range)
 *
 * RETURNS:
 *   Equivalent angle in [-PI, PI]
 *
 * WHY NEEDED?
 * When computing angle differences, we need consistent range to determine
 * if beams are within threshold of each other.
 *
 * USAGE EXAMPLE:
 *   float diff = normalizeAngle(beam.heading - mean);
 *   if (fabsf(diff) < 10.0f * DEG) { /* within threshold * / }
 *
 * USED IN THIS SCRIPT:
 *   - consensus(): Checks if beam heading is within threshold of mean
 */
float normalizeAngle(float angle) {
    float result = fmodf(angle + PI, 2.0f * PI);
    if (result < 0) result += 2.0f * PI;
    return result - PI;
}

//=============================================================================
// consensus() - Compute Heading Consensus with Outlier Rejection
//=============================================================================
/**
 * Computes weighted circular mean heading, rejecting outliers.
 *
 * PARAMETERS:
 *   beams           - Vector of beam measurements
 *   previousHeading - Fallback if all beams rejected
 *
 * RETURNS:
 *   ConsensusResult with mean heading and accepted beam IDs
 *
 * ALGORITHM:
 *   1. Sort beams by inlier count, take top 3
 *   2. Compute weighted circular mean of all 3
 *   3. Filter beams within 10 degree threshold
 *   4. Recompute mean with only accepted beams
 *   5. If none accepted, return previousHeading
 *
 * USAGE EXAMPLE:
 *   ConsensusResult result = consensus(beams, 33.0f * DEG);
 *   float aisleYaw = result.mean;
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to compute consensus heading
 */
ConsensusResult consensus(const std::vector<Beam>& beams, float previousHeading) {
    // Sort by inlier count (descending), keep top 3
    std::vector<Beam> sorted = beams;
    for (size_t i = 0; i < sorted.size(); ++i) {
        for (size_t j = i + 1; j < sorted.size(); ++j) {
            if (sorted[j].inliers > sorted[i].inliers) {
                Beam tmp = sorted[i];
                sorted[i] = sorted[j];
                sorted[j] = tmp;
            }
        }
    }
    if (sorted.size() > 3) sorted.resize(3);

    // Compute initial weighted circular mean
    float sx = 0, sy = 0;
    for (const auto& beam : sorted) {
        sx += cosf(beam.heading) * beam.inliers;
        sy += sinf(beam.heading) * beam.inliers;
    }
    float mean = atan2f(sy, sx);

    // Filter beams within 10 degree threshold
    std::vector<int> acceptedIds;
    for (const auto& beam : sorted) {
        if (fabsf(normalizeAngle(beam.heading - mean)) < 10.0f * DEG) {
            acceptedIds.push_back(beam.id);
        }
    }

    // If all rejected, return previous heading
    if (acceptedIds.empty()) {
        return {previousHeading, {}};
    }

    // Recompute mean with only accepted beams
    sx = sy = 0;
    for (const auto& beam : sorted) {
        bool accepted = false;
        for (int id : acceptedIds) if (id == beam.id) accepted = true;
        if (accepted) {
            sx += cosf(beam.heading) * beam.inliers;
            sy += sinf(beam.heading) * beam.inliers;
        }
    }

    return {atan2f(sy, sx), acceptedIds};
}

//=============================================================================
// makeBeams() - Generate Synthetic Beam Measurements
//=============================================================================
/**
 * Creates synthetic beam measurements with one outlier for demonstration.
 *
 * PARAMETERS:
 *   frame - Frame index (varies measurements deterministically)
 *
 * RETURNS:
 *   Vector of 3 beams: 2 good ones near 33 deg, 1 outlier at ~49 deg
 *
 * USAGE EXAMPLE:
 *   std::vector<Beam> beams = makeBeams(simFrame);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to get current beam measurements
 */
std::vector<Beam> makeBeams(int frame) {
    float base = (33.0f + sinf(frame * 0.035f) * 1.2f) * DEG;
    return {
        {1, base + sinf(frame * 0.11f) * 1.2f * DEG, 35000},   // Good beam
        {2, base + cosf(frame * 0.09f) * 1.5f * DEG, 29000},   // Good beam
        {3, base + (16.0f + sinf(frame * 0.05f) * 2.0f) * DEG, 5500}  // Outlier (~16 deg off)
    };
}

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing consensus results.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to display accepted count and mean
 */
void drawPanel(int screenW, int accepted, int total, float mean) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Heading consensus", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "accepted beams: %d/%d", accepted, total);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "mean heading: %.2f deg", mean / DEG);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    DrawText("threshold: 10.00 deg", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Circle size is inlier count.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Green beams shape the final mean.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Red beams are outliers and should", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("not steer the aisle yaw.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Heading Consensus Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Get current beam measurements
        std::vector<Beam> beams = makeBeams(simFrame);

        // Compute consensus heading
        ConsensusResult result = consensus(beams, 33.0f * DEG);
        std::set<int> acceptedSet(result.acceptedIds.begin(), result.acceptedIds.end());

        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Heading consensus", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: weighted circular mean, then reject beams outside the angular gate",
                 22, 45, 12, {149, 163, 184, 255});

        // Draw horizontal axis (degree scale from 15 to 55)
        float x0 = 70;
        float x1 = GetScreenWidth() - 390.0f;
        float y = GetScreenHeight() * 0.52f;

        DrawLineEx({x0, y}, {x1, y}, 2, {42, 51, 72, 255});

        // Draw tick marks every 5 degrees
        for (int deg = 15; deg <= 55; deg += 5) {
            float x = x0 + (deg - 15) / 40.0f * (x1 - x0);
            DrawLineEx({x, y - 10}, {x, y + 10}, 1, {42, 51, 72, 255});

            char buf[8];
            snprintf(buf, sizeof(buf), "%d", deg);
            DrawText(buf, (int)x - 7, (int)y + 20, 12, {149, 163, 184, 255});
        }

        // Draw beams as circles (size = inlier count)
        for (const auto& beam : beams) {
            float deg = beam.heading / DEG;
            float x = x0 + (deg - 15) / 40.0f * (x1 - x0);
            // Size proportional to inliers (clamped to reasonable range)
            float size = fmaxf(10.0f, fminf(24.0f, beam.inliers / 1800.0f));

            Color color = acceptedSet.count(beam.id) ? Color{82, 255, 168, 255} : Color{248, 113, 113, 255};
            DrawCircleV({x, y}, size / 2, color);

            char label[16];
            snprintf(label, sizeof(label), "beam %d", beam.id);
            DrawText(label, (int)x - 18, (int)y - 30, 12, {230, 230, 230, 255});
        }

        // Draw mean heading line (green vertical line)
        float meanX = x0 + (result.mean / DEG - 15) / 40.0f * (x1 - x0);
        DrawLineEx({meanX, y - 70}, {meanX, y + 70}, 4, {163, 230, 53, 255});

        drawPanel(GetScreenWidth(), (int)result.acceptedIds.size(), (int)beams.size(), result.mean);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

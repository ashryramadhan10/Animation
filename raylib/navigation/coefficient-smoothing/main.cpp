/**
 * Coefficient Smoothing Demo
 *
 * PURPOSE:
 * Demonstrates EMA (Exponential Moving Average) smoothing of fitted line
 * coefficients before using them in heading/centerline logic.
 *
 * KEY CONCEPT:
 * Raw fitted lines jitter frame-to-frame due to sensor noise and point cloud
 * variation. Smoothing the line coefficients (slope m, intercept b) dampens
 * this noise without changing the line representation itself.
 *
 * EMA FORMULA:
 *   smoothed = alpha * new_value + (1 - alpha) * previous_smoothed
 *   - alpha near 1.0: Fast response, more noise
 *   - alpha near 0.0: Slow response, very smooth
 *   - Typical alpha: 0.1 to 0.3
 *
 * VISUAL:
 *   Orange line: Raw fitted line (noisy, jumps around)
 *   Cyan line:   Smoothed line (stable, follows trend)
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
// Line - Slope-Intercept Form
//=============================================================================
/**
 * Line equation: y = m*x + b
 *
 * FIELDS:
 *   m - Slope (rise/run)
 *   b - Y-intercept (where line crosses y-axis)
 *
 * USAGE EXAMPLE:
 *   Line line = {0.62f, 0.72f};  // y = 0.62x + 0.72
 *   float y = line.m * x + line.b;
 *
 * USED IN THIS SCRIPT:
 *   - rawLineAt(): Returns noisy line at given frame
 *   - smoothLines(): Stores raw and smoothed line pairs
 *   - WorldRenderer::drawLine(): Renders lines on screen
 */
struct Line {
    float m, b;
};

//=============================================================================
// HistoryItem - One Frame's Raw and Smoothed Lines
//=============================================================================
/**
 * Pairs the raw fitted line with its EMA-smoothed version.
 *
 * USED IN THIS SCRIPT:
 *   - smoothLines(): Builds a vector of these for animation
 *   - main(): Cycles through items to show smoothing over time
 */
struct HistoryItem {
    Line raw;
    Line smooth;
};

//=============================================================================
// rawLineAt() - Generate Noisy Raw Line
//=============================================================================
/**
 * Simulates a noisy fitted line measurement at a given frame.
 *
 * PARAMETERS:
 *   frame - Frame index (used to vary the noise deterministically)
 *
 * RETURNS:
 *   Line with noisy slope and intercept based on sine functions
 *
 * WHY SINUSOIDAL NOISE?
 * Real sensor noise has multiple frequency components. Using overlapping
 * sine waves simulates this without true randomness, making demos repeatable.
 *
 * USAGE EXAMPLE:
 *   Line raw = rawLineAt(0);   // First frame's noisy measurement
 *   Line raw = rawLineAt(100); // Frame 100's noisy measurement
 *
 * USED IN THIS SCRIPT:
 *   - smoothLines(): Generates raw lines for the entire animation sequence
 */
Line rawLineAt(int frame) {
    float trueSlope = 0.62f;
    // Add noise with two frequency components
    float noisySlope = trueSlope + 0.09f * sinf(frame * 0.33f) + 0.035f * sinf(frame * 1.2f);
    float noisyC = 0.72f + 0.16f * sinf(frame * 0.21f) + 0.06f * cosf(frame * 0.77f);
    return {noisySlope, noisyC};
}

//=============================================================================
// smoothLines() - Generate Smoothed Line History
//=============================================================================
/**
 * Creates the full animation sequence with EMA-smoothed lines.
 *
 * PARAMETERS:
 *   count - Number of frames to generate
 *   alpha - EMA smoothing factor (0 to 1, lower = smoother)
 *
 * RETURNS:
 *   Vector of HistoryItems containing raw/smooth pairs
 *
 * EMA SMOOTHING LOGIC:
 *   For each coefficient (m and b):
 *     smooth = alpha * raw + (1 - alpha) * previous_smooth
 *
 * USAGE EXAMPLE:
 *   auto history = smoothLines(180, 0.3f);
 *   Line currentSmooth = history[frameIndex].smooth;
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called once at startup to precompute all frames
 */
std::vector<HistoryItem> smoothLines(int count, float alpha) {
    std::vector<HistoryItem> out;
    Line smooth = {0, 0};
    bool hasSmooth = false;

    for (int i = 0; i < count; ++i) {
        Line raw = rawLineAt(i);
        if (!hasSmooth) {
            // Initialize smoothed line with first raw measurement
            smooth = raw;
            hasSmooth = true;
        } else {
            // EMA update for slope
            smooth.m = alpha * raw.m + (1 - alpha) * smooth.m;
            // EMA update for intercept
            smooth.b = alpha * raw.b + (1 - alpha) * smooth.b;
        }
        out.push_back({raw, smooth});
    }
    return out;
}

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates (meters) to screen coordinates (pixels).
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   world.drawLine(rawLine, ORANGE, 2);
 *   world.drawLine(smoothLine, CYAN, 4);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render grid, points, and lines
 */
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

    /**
     * Draws points scattered along the raw line to simulate point cloud.
     * These represent the noisy input data that produces the fitted line.
     */
    void drawPointsOnLine(const Line& line) const {
        for (int i = 0; i < 120; ++i) {
            float x = -2.6f + i / 119.0f * 5.2f;
            float y = line.m * x + line.b + 0.05f * sinf(i * 0.9f);
            Vector2 s = toScreen(x, y);
            DrawCircleV(s, 2, {111, 126, 153, 110});
        }
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
/**
 * Draws the right-side info panel showing alpha and coefficient values.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame to display smoothing parameters
 */
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

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Coefficient Smoothing Demo");
    SetTargetFPS(30);

    // EMA smoothing factor: 0.3 means 30% new value, 70% previous smoothed
    const float alpha = 0.3f;

    // Precompute all frames with smoothing
    std::vector<HistoryItem> history = smoothLines(180, alpha);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Cycle through history at 1/3 speed (every 3 render frames)
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

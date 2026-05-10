/**
 * Accumulation Demo
 *
 * PURPOSE:
 * Demonstrates how track points accumulate over a rolling time window
 * to build a larger point set for more stable line fitting.
 *
 * KEY CONCEPT:
 * Instead of fitting a line to just 95 points from one frame, we collect
 * points from the last ~18 frames (about 1800 points total). This gives
 * a much more stable line fit because noise averages out.
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

// Aisle heading angle (33 degrees converted to radians)
// This defines the direction the warehouse aisle points
const float AISLE_YAW = 33.0f * (PI / 180.0f);

// Track ID - in real system, each rack beam gets a unique ID
// The accumulator uses this ID to know which points belong together
const int TRACK_ID = 4;

//=============================================================================
// Rng - Deterministic Random Number Generator
//=============================================================================
/**
 * Generates repeatable "random" numbers from a seed.
 * Same seed always produces same sequence - useful for testing.
 *
 * USAGE EXAMPLE:
 *   Rng rng(42);                    // Create with seed 42
 *   float r1 = rng.next();          // Get random float in [0, 1)
 *   float r2 = rng.next();          // Get next random float
 *   float noise = rng.gaussian(0.1); // Get gaussian noise with sigma=0.1
 *
 * USED IN THIS SCRIPT:
 *   - makeFrame(): Creates noisy rack points with gaussian jitter
 *     Each frame uses seed (70 + frameIndex) so same frame = same points
 */
class Rng {
public:
    explicit Rng(unsigned int seed) : state_(seed) {}

    // Returns random float in range [0.0, 1.0)
    float next() {
        state_ += 0x6D2B79F5;
        unsigned int t = state_;
        t = (t ^ (t >> 15)) * (t | 1);
        t ^= t + ((t ^ (t >> 7)) * (t | 61));
        return static_cast<float>((t ^ (t >> 14)) >> 0) / 4294967296.0f;
    }

    // Returns gaussian-distributed random value with given standard deviation
    // Uses Box-Muller transform to convert uniform random to gaussian
    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

//=============================================================================
// Vec2 - Simple 2D Vector
//=============================================================================
/**
 * Basic 2D point/vector for geometric calculations.
 *
 * USAGE EXAMPLE:
 *   Vec2 a = {1.0f, 2.0f};
 *   Vec2 b = {3.0f, 4.0f};
 *   Vec2 sum = a + b;           // {4.0f, 6.0f}
 *   Vec2 scaled = a * 2.0f;     // {2.0f, 4.0f}
 *
 * USED IN THIS SCRIPT:
 *   - Storing rack point positions
 *   - Computing positions along the aisle direction
 */
struct Vec2 {
    float x, y;
    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator*(float s) const { return {x * s, y * s}; }
};

//=============================================================================
// Direction Helpers
//=============================================================================
/**
 * dir() - Unit vector pointing ALONG the aisle (forward direction)
 * aisleNormal() - Unit vector pointing ACROSS the aisle (perpendicular)
 *
 * VISUAL:
 *         aisleNormal() ^
 *                       |
 *         rack =========|========= rack
 *                       |
 *              <--------+-------> dir()
 *                       |
 *         rack =========|========= rack
 *
 * USED IN THIS SCRIPT:
 *   - makeFrame(): Position rack points relative to aisle center
 */
Vec2 dir() { return {cosf(AISLE_YAW), sinf(AISLE_YAW)}; }
Vec2 aisleNormal() { return {-sinf(AISLE_YAW), cosf(AISLE_YAW)}; }

//=============================================================================
// Line - Slope-Intercept Form
//=============================================================================
/**
 * Represents a line as y = m*x + b
 *   m = slope (rise over run)
 *   b = y-intercept (where line crosses y-axis)
 *
 * USED IN THIS SCRIPT:
 *   - fitLine() returns this to describe the best-fit line through points
 *   - WorldRenderer::drawLine() draws this line on screen
 */
struct Line {
    float m, b;
};

//=============================================================================
// Frame - One Timestep of Data
//=============================================================================
/**
 * Contains all rack points captured at one moment in time.
 *
 * FIELDS:
 *   stamp   - Timestamp in seconds (frameIndex * 0.1)
 *   trackId - Which rack beam these points belong to
 *   points  - The actual 2D point positions
 *
 * USED IN THIS SCRIPT:
 *   - makeFrame() creates one of these
 *   - accumulatedFrames() collects multiple frames into a sliding window
 */
struct Frame {
    float stamp;
    int trackId;
    std::vector<Vec2> points;
};

//=============================================================================
// makeFrame() - Generate Synthetic Rack Points
//=============================================================================
/**
 * Creates one frame of simulated rack/beam points.
 *
 * HOW IT WORKS:
 * 1. Uses deterministic RNG seeded by frame index (reproducible)
 * 2. Computes base position along the aisle
 * 3. Generates 95 points spread along the rack with gaussian noise
 *
 * PARAMETERS:
 *   index - Frame number (0, 1, 2, ...)
 *
 * RETURNS:
 *   Frame containing 95 noisy points representing one rack beam
 *
 * USED IN THIS SCRIPT:
 *   - accumulatedFrames() calls this for each frame in the window
 */
Frame makeFrame(int index) {
    // Same seed for same frame = reproducible "random" points
    Rng rng(70 + index);

    // Robot moves along aisle over time
    float along = index * 0.08f;

    // Rack is offset 1.55m from aisle center
    Vec2 base = dir() * along + aisleNormal() * 1.55f;

    std::vector<Vec2> points;
    for (int i = 0; i < 95; ++i) {
        // Spread points along 3.2m of rack (-1.6 to +1.6)
        float t = -1.6f + rng.next() * 3.2f;

        // Add sensor noise (2.5cm standard deviation)
        Vec2 noise = {rng.gaussian(0.025f), rng.gaussian(0.025f)};

        points.push_back(base + dir() * t + noise);
    }

    return {index * 0.1f, TRACK_ID, points};
}

//=============================================================================
// fitLine() - Least Squares Line Fitting
//=============================================================================
/**
 * Finds the best-fit line through a set of points.
 * Uses simple linear regression: minimizes sum of squared vertical distances.
 *
 * MATH:
 *   slope m = covariance(x,y) / variance(x)
 *   intercept b = avgY - m * avgX
 *
 * PARAMETERS:
 *   points - Vector of 2D points to fit
 *
 * RETURNS:
 *   Line {m, b} where y = m*x + b
 *
 * USED IN THIS SCRIPT:
 *   - main() fits a line to all accumulated points for visualization
 */
Line fitLine(const std::vector<Vec2>& points) {
    if (points.empty()) return {0, 0};

    // Step 1: Compute average position
    float avgX = 0, avgY = 0;
    for (const auto& p : points) {
        avgX += p.x;
        avgY += p.y;
    }
    avgX /= points.size();
    avgY /= points.size();

    // Step 2: Compute variance and covariance
    float varX = 0, cov = 0;
    for (const auto& p : points) {
        varX += (p.x - avgX) * (p.x - avgX);
        cov += (p.x - avgX) * (p.y - avgY);
    }

    // Step 3: Calculate slope and intercept
    float m = cov / fmaxf(varX, 1e-9f);  // Avoid division by zero
    return {m, avgY - m * avgX};
}

//=============================================================================
// accumulatedFrames() - Sliding Window of Recent Frames
//=============================================================================
/**
 * Collects frames from a rolling time window (last 18 frames).
 * This is the KEY CONCEPT of this demo!
 *
 * WHY ACCUMULATE?
 * - Single frame: ~95 points, noisy line fit
 * - 18 frames: ~1700 points, much smoother line fit
 *
 * PARAMETERS:
 *   frameIndex - Current frame number
 *
 * RETURNS:
 *   Vector of frames from (frameIndex-18) to frameIndex
 *
 * USED IN THIS SCRIPT:
 *   - main() gets accumulated frames each animation tick
 */
std::vector<Frame> accumulatedFrames(int frameIndex) {
    std::vector<Frame> frames;

    // Window starts 18 frames back (or at 0 if we're early)
    int cutoff = frameIndex > 18 ? frameIndex - 18 : 0;

    for (int i = cutoff; i <= frameIndex; ++i) {
        frames.push_back(makeFrame(i));
    }
    return frames;
}

//=============================================================================
// WorldRenderer - Transforms World Coordinates to Screen
//=============================================================================
/**
 * Handles coordinate transformation from world space (meters) to screen space (pixels).
 * Also provides drawing methods for points, lines, and grid.
 *
 * HOW IT WORKS:
 * 1. Constructor finds bounding box of all points
 * 2. Computes scale factor to fit world into screen rectangle
 * 3. toScreen() converts any world point to pixel coordinates
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(screenW, screenH, points);
 *   world.drawGrid();
 *   world.drawPoints(points, GREEN, 3.0f);
 *   world.drawLine(fittedLine, WHITE);
 *
 * USED IN THIS SCRIPT:
 *   - main() creates one each frame to render the visualization
 */
class WorldRenderer {
public:
    Rectangle rect;                    // Screen area for drawing
    float minX, maxX, minY, maxY;      // World coordinate bounds
    float scale;                       // Pixels per meter

    WorldRenderer(int screenW, int screenH, const std::vector<Vec2>& points) {
        // Leave space for title (top) and panel (right side)
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};

        // Find bounding box of all points
        minX = minY = 1e9f;
        maxX = maxY = -1e9f;
        for (const auto& p : points) {
            minX = fminf(minX, p.x);
            maxX = fmaxf(maxX, p.x);
            minY = fminf(minY, p.y);
            maxY = fmaxf(maxY, p.y);
        }

        // Add padding around edges
        minX -= 0.8f; minY -= 0.8f;
        maxX += 0.8f; maxY += 0.8f;

        // Compute uniform scale (same in X and Y to avoid distortion)
        float worldW = maxX - minX;
        float worldH = maxY - minY;
        scale = fminf(rect.width / worldW, rect.height / worldH);
    }

    // Convert world position (meters) to screen position (pixels)
    Vector2 toScreen(Vec2 p) const {
        float cx = (minX + maxX) * 0.5f;
        float cy = (minY + maxY) * 0.5f;
        return {
            rect.x + rect.width * 0.5f + (p.x - cx) * scale,
            rect.y + rect.height * 0.5f - (p.y - cy) * scale  // Y flipped (screen Y goes down)
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
    }

    void drawPoints(const std::vector<Vec2>& points, Color color, float size) const {
        for (const auto& p : points) {
            Vector2 s = toScreen(p);
            DrawCircleV(s, size, color);
        }
    }

    void drawLine(const Line& line, Color color) const {
        // Draw line from left edge to right edge of world bounds
        Vector2 a = toScreen({minX, line.m * minX + line.b});
        Vector2 b = toScreen({maxX, line.m * maxX + line.b});
        DrawLineEx(a, b, 3.0f, color);
    }
};

//=============================================================================
// drawPanel() - Info Panel on Right Side
//=============================================================================
/**
 * Draws the statistics panel showing current state.
 *
 * USED IN THIS SCRIPT:
 *   - main() calls this each frame to show point counts
 */
void drawPanel(int screenW, int currentPoints, int accumulated, int windowFrames) {
    float x = screenW - 320.0f;

    // Panel background
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Accumulation", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "track id: %d", TRACK_ID);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "current frame points: %d", currentPoints);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "accumulated points: %d", accumulated);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "window frames: %d", windowFrames);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("Bright points are current frame.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("Dim green points are history.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This only works when track_id", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("continues to represent the same", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("physical horizontal beam.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main() - Application Entry Point
//=============================================================================
int main() {
    // Window setup with anti-aliasing
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Accumulation Demo");
    SetTargetFPS(30);

    int simFrame = 0;      // Animation frame counter
    bool paused = false;   // Pause state

    while (!WindowShouldClose()) {
        //--- INPUT ---
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        //--- UPDATE ---
        // Slow down animation (every 3 render frames = 1 sim frame)
        int frameIndex = simFrame / 3;

        // Get sliding window of frames
        auto frames = accumulatedFrames(frameIndex);
        Frame& current = frames.back();

        // Flatten all points from all frames into one vector
        std::vector<Vec2> accumulated;
        for (const auto& f : frames) {
            accumulated.insert(accumulated.end(), f.points.begin(), f.points.end());
        }

        // Fit line to ALL accumulated points (the key benefit!)
        Line fitted = fitLine(accumulated);

        //--- RENDER ---
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        // Title
        DrawText("Track accumulation", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: same track_id accumulates over a rolling time window",
                 22, 45, 12, {149, 163, 184, 255});

        // World visualization
        WorldRenderer world(GetScreenWidth(), GetScreenHeight(), accumulated);
        world.drawGrid();
        world.drawPoints(accumulated, {92, 235, 181, 70}, 3);      // History: dim green
        world.drawPoints(current.points, {255, 199, 87, 210}, 5);  // Current: bright yellow
        world.drawLine(fitted, WHITE);                              // Best-fit line

        // Info panel
        drawPanel(GetScreenWidth(),
                  (int)current.points.size(),
                  (int)accumulated.size(),
                  (int)frames.size());

        // Controls hint
        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) {
            DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});
        }

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

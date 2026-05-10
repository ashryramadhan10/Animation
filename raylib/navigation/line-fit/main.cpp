/**
 * Line Fit Demo
 *
 * PURPOSE:
 * Demonstrates recursive linear regression - an iterative process that
 * repeatedly fits a line and removes outliers until only clean inliers remain.
 *
 * KEY CONCEPT:
 * Raw point clouds contain noise (interior rack points, sensor errors).
 * Simple line fitting would be thrown off by outliers. Instead:
 *   1. Fit line to all points
 *   2. Measure distance from each point to line
 *   3. Keep only points within threshold (inliers)
 *   4. Repeat with inliers until stable
 *
 * VISUAL:
 *   Iteration 1: [====== all points ======] -> fit line
 *   Iteration 2: [=== inliers only ===]     -> refit line
 *   Iteration 3: [== cleaner inliers ==]   -> refit line
 *   ...until converged
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to iteration 1
 */

#include "raylib.h"
#include <cmath>
#include <vector>
#include <set>
#include <string>

//=============================================================================
// Rng - Deterministic Random Number Generator
//=============================================================================
/**
 * Generates repeatable random numbers from a seed.
 *
 * USAGE EXAMPLE:
 *   Rng rng(8);
 *   float x = rng.next();           // Random in [0, 1)
 *   float noise = rng.gaussian(0.035);  // Gaussian with sigma=0.035
 *
 * USED IN THIS SCRIPT:
 *   - makePoints(): Creates beam points along y=0.55x+0.8 with noise
 *   - makePoints(): Creates random outlier points scattered around
 */
class Rng {
public:
    explicit Rng(unsigned int seed) : state_(seed) {}

    float next() {
        state_ += 0x6D2B79F5;
        unsigned int t = state_;
        t = (t ^ (t >> 15)) * (t | 1);
        t ^= t + ((t ^ (t >> 7)) * (t | 61));
        return static_cast<float>((t ^ (t >> 14)) >> 0) / 4294967296.0f;
    }

    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

//=============================================================================
// Point - 2D Point with Classification Label
//=============================================================================
/**
 * A point that knows whether it's a "beam" point or an "outlier".
 * This label is ground truth for visualization - the algorithm doesn't see it.
 *
 * USED IN THIS SCRIPT:
 *   - makePoints(): Tags each point as "beam" or "outlier"
 *   - Visualization: Not used by fitting, just for our understanding
 */
struct Point {
    float x, y;
    const char* label;  // "beam" = true rack point, "outlier" = noise
};

//=============================================================================
// Line - Slope-Intercept Form
//=============================================================================
/**
 * Line equation: y = m*x + b
 *
 * USED IN THIS SCRIPT:
 *   - fitLine(): Returns best-fit line through points
 *   - distanceToLine(): Measures how far a point is from the line
 *   - WorldRenderer::drawLine(): Draws the line on screen
 */
struct Line {
    float m, b;
};

//=============================================================================
// FitStep - One Iteration's Result
//=============================================================================
/**
 * Stores the result of one fitting iteration.
 *
 * FIELDS:
 *   line    - The fitted line for this iteration
 *   inliers - Indices of points that are close enough to the line
 *
 * USED IN THIS SCRIPT:
 *   - recursiveFit(): Builds a vector of these showing convergence
 *   - main(): Cycles through steps to animate the process
 */
struct FitStep {
    Line line;
    std::vector<int> inliers;
};

//=============================================================================
// makePoints() - Generate Test Data
//=============================================================================
/**
 * Creates a mix of beam points (along a line) and random outliers.
 *
 * GENERATES:
 *   - 180 beam points: Along y = 0.55*x + 0.8 with gaussian noise
 *   - 70 outlier points: Randomly scattered in the viewing area
 *
 * WHY THIS MIX?
 * Real rack data has ~70% good face points and ~30% noise from
 * interior reflections, sensor errors, etc. This simulates that.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called once to generate test data
 */
std::vector<Point> makePoints() {
    Rng rng(8);
    std::vector<Point> points;

    // Beam points: follow the line y = 0.55*x + 0.8 with small noise
    for (int i = 0; i < 180; ++i) {
        float x = -2.5f + 5.0f * rng.next();
        float y = 0.55f * x + 0.8f + rng.gaussian(0.035f);
        points.push_back({x, y, "beam"});
    }

    // Outlier points: random scatter (simulates interior/noise)
    for (int i = 0; i < 70; ++i) {
        float x = -2.5f + 5.0f * rng.next();
        float y = -1.0f + 3.8f * rng.next();
        points.push_back({x, y, "outlier"});
    }

    return points;
}

//=============================================================================
// fitLine() - Least Squares Line Fitting
//=============================================================================
/**
 * Fits a line to the specified subset of points.
 *
 * PARAMETERS:
 *   points  - All points in the dataset
 *   indices - Which points to use for fitting (subset)
 *
 * RETURNS:
 *   Line {m, b} that minimizes squared vertical distance
 *
 * USED IN THIS SCRIPT:
 *   - recursiveFit(): Called each iteration with shrinking inlier set
 */
Line fitLine(const std::vector<Point>& points, const std::vector<int>& indices) {
    if (indices.empty()) return {0, 0};

    // Compute centroid of selected points
    float avgX = 0, avgY = 0;
    for (int i : indices) {
        avgX += points[i].x;
        avgY += points[i].y;
    }
    avgX /= indices.size();
    avgY /= indices.size();

    // Compute variance and covariance
    float varX = 0, cov = 0;
    for (int i : indices) {
        varX += (points[i].x - avgX) * (points[i].x - avgX);
        cov += (points[i].x - avgX) * (points[i].y - avgY);
    }

    // slope = covariance / variance
    float m = cov / fmaxf(varX, 1e-9f);
    return {m, avgY - m * avgX};
}

//=============================================================================
// distanceToLine() - Perpendicular Distance
//=============================================================================
/**
 * Computes perpendicular (shortest) distance from point to line.
 *
 * MATH:
 *   Line: y = mx + b  -->  mx - y + b = 0
 *   Distance = |m*x - y + b| / sqrt(m^2 + 1)
 *
 * USED IN THIS SCRIPT:
 *   - recursiveFit(): Determines which points are inliers
 */
float distanceToLine(const Point& p, const Line& line) {
    return fabsf(line.m * p.x - p.y + line.b) / sqrtf(line.m * line.m + 1.0f);
}

//=============================================================================
// recursiveFit() - The Core Algorithm
//=============================================================================
/**
 * Iteratively fits a line, keeping only nearby points each round.
 *
 * ALGORITHM:
 *   1. Start with all points
 *   2. Fit line to current set
 *   3. Find all points within 0.08m of line (inliers)
 *   4. If set changed and >= 12 points remain, go to step 2
 *   5. Return history of all iterations
 *
 * WHY 0.08m THRESHOLD?
 * Typical rack face is ~5cm thick. Points further than 8cm are likely
 * interior/noise, not the actual rack surface.
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called once, result is animated frame by frame
 */
std::vector<FitStep> recursiveFit(const std::vector<Point>& points) {
    // Start with all point indices
    std::vector<int> active;
    for (int i = 0; i < (int)points.size(); ++i) active.push_back(i);

    std::vector<FitStep> steps;

    for (int iter = 0; iter < 8; ++iter) {
        // Fit line to current active set
        Line line = fitLine(points, active);

        // Find inliers (points within threshold distance)
        std::vector<int> inliers;
        for (int i = 0; i < (int)points.size(); ++i) {
            if (distanceToLine(points[i], line) <= 0.08f) {
                inliers.push_back(i);
            }
        }

        // Save this iteration's result
        steps.push_back({line, inliers});

        // Stop if converged or too few points
        if (inliers.size() == active.size() || inliers.size() < 12) break;

        active = inliers;
    }

    return steps;
}

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates (meters) to screen coordinates (pixels).
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame to render points and fitted line
 */
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        minX = -3.0f; maxX = 3.0f;
        minY = -1.2f; maxY = 2.7f;
        scale = fminf(rect.width / 6.0f, rect.height / 3.9f);
    }

    Vector2 toScreen(float x, float y) const {
        return {
            rect.x + rect.width * 0.5f + x * scale,
            rect.y + rect.height * 0.5f - (y - 0.75f) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
        for (int x = (int)minX; x <= (int)maxX; ++x) {
            Vector2 a = toScreen((float)x, minY);
            Vector2 b = toScreen((float)x, maxY);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
        for (int y = (int)minY; y <= (int)maxY; ++y) {
            Vector2 a = toScreen(minX, (float)y);
            Vector2 b = toScreen(maxX, (float)y);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
    }

    // Draw points colored by inlier status
    void drawPoints(const std::vector<Point>& points, const std::set<int>& inlierSet) const {
        for (int i = 0; i < (int)points.size(); ++i) {
            Vector2 s = toScreen(points[i].x, points[i].y);
            if (inlierSet.count(i)) {
                DrawCircleV(s, 5, {82, 255, 168, 180});   // Inlier: green
            } else {
                DrawCircleV(s, 4, {248, 113, 113, 100});  // Outlier: red (dim)
            }
        }
    }

    void drawLine(const Line& line) const {
        Vector2 a = toScreen(minX, line.m * minX + line.b);
        Vector2 b = toScreen(maxX, line.m * maxX + line.b);
        DrawLineEx(a, b, 3.0f, WHITE);
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
void drawPanel(int screenW, int stepIndex, int totalSteps, int inliers, int total, float slope) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Recursive line fit", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "iteration: %d/%d", stepIndex + 1, totalSteps);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "inliers: %d/%d", inliers, total);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "slope: %.3f", slope);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("This mirrors the C++ recursive", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("linear-regression fitter: fit,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("measure distance, keep inliers,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("then refit with cleaner geometry.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Line Fit Demo");
    SetTargetFPS(30);

    // Generate test data once (same points every run due to fixed seed)
    std::vector<Point> points = makePoints();

    // Run recursive fit once, get all iteration steps
    std::vector<FitStep> steps = recursiveFit(points);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Cycle through iterations (25 frames per step)
        int stepIndex = (simFrame / 25) % (int)steps.size();
        const FitStep& step = steps[stepIndex];

        // Build set for fast inlier lookup
        std::set<int> inlierSet(step.inliers.begin(), step.inliers.end());

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Line fit", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: fit line -> classify close points -> repeat on inliers",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();
        world.drawPoints(points, inlierSet);
        world.drawLine(step.line);

        drawPanel(GetScreenWidth(), stepIndex, (int)steps.size(),
                  (int)step.inliers.size(), (int)points.size(), step.line.m);

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

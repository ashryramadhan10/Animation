/**
 * Rotation Filter Demo
 *
 * PURPOSE:
 * Demonstrates how sweeping candidate angles and computing rotated_y boundary
 * helps isolate the outer rack face band from interior/noisy points.
 *
 * KEY CONCEPT:
 * Raw point clouds contain both face points (the rack surface we want) and
 * interior points (reflections from inside the rack). By rotating the point
 * cloud around a pivot and finding the max rotated_y value, we identify the
 * outer boundary (face) and filter out points below it.
 *
 * ALGORITHM:
 *   1. Compute pivot point offset from point cloud centroid
 *   2. For each candidate angle, compute rotated_y for all points
 *   3. Find max rotated_y (this is the outer face boundary)
 *   4. Keep points within threshold of boundary
 *
 * WHY ROTATE?
 * The rack face appears as the "top" of the point cloud when viewed from the
 * right angle. By sweeping angles, we find the orientation where face points
 * cluster at the boundary.
 *
 * VISUAL:
 *   Pivot (green) -> Boundary line (red) -> Face points (bright) vs Interior (dim)
 *
 * CONTROLS:
 * - SPACE: Pause/Resume animation
 * - R: Reset to frame 0
 */

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>
#include <algorithm>

//=============================================================================
// Constants
//=============================================================================
const float DEG = PI / 180.0f;

//=============================================================================
// Rng - Deterministic Random Number Generator
//=============================================================================
/**
 * Generates repeatable random numbers from a seed.
 *
 * USAGE EXAMPLE:
 *   Rng rng(14);
 *   float x = rng.next();               // Random in [0, 1)
 *   float noise = rng.gaussian(0.025f); // Gaussian noise
 *
 * USED IN THIS SCRIPT:
 *   - makePointCloud(): Generates face and interior points
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
// Point - 2D Point with Classification
//=============================================================================
/**
 * A point that knows whether it's a "face" or "interior" point.
 * This is ground truth for visualization - the filter discovers this.
 *
 * FIELDS:
 *   x, y  - Position in meters
 *   kind  - "face" for rack surface, "interior" for noise
 *
 * USAGE EXAMPLE:
 *   Point p = {1.2f, 1.45f, "face"};  // Face point at (1.2, 1.45)
 *
 * USED IN THIS SCRIPT:
 *   - makePointCloud(): Creates tagged points
 *   - FilterResult: Separates kept vs rejected points
 */
struct Point {
    float x, y;
    const char* kind;
};

//=============================================================================
// FilterResult - Rotation Filter Output
//=============================================================================
/**
 * Result of applying the rotation filter at one candidate angle.
 *
 * FIELDS:
 *   pivot    - Rotation center (offset from centroid)
 *   boundary - Max rotated_y value (outer face edge)
 *   kept     - Points within threshold of boundary (face points)
 *   rejected - Points below boundary (interior/noise)
 *
 * USED IN THIS SCRIPT:
 *   - rotationFilter(): Returns this after filtering
 *   - main(): Uses for rendering kept vs rejected points
 */
struct FilterResult {
    Vector2 pivot;
    float boundary;
    std::vector<Point> kept;
    std::vector<Point> rejected;
};

//=============================================================================
// makePointCloud() - Generate Test Point Cloud
//=============================================================================
/**
 * Creates a point cloud with face points and interior noise.
 *
 * GENERATES:
 *   - 170 face points: Along y = 1.45 with small gaussian noise
 *   - 150 interior points: Scattered below face (y = 1.0 to 1.36)
 *
 * WHY THIS DISTRIBUTION?
 * Real rack data has face points clustered on the surface and interior
 * points from depth sensor errors and reflections inside the rack.
 *
 * USAGE EXAMPLE:
 *   std::vector<Point> points = makePointCloud();
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called once to generate test data
 */
std::vector<Point> makePointCloud() {
    Rng rng(14);
    std::vector<Point> points;

    // Face points (rack surface at y ≈ 1.45)
    for (int i = 0; i < 170; ++i) {
        float x = -2.2f + 4.4f * rng.next();
        float y = 1.45f + rng.gaussian(0.025f);
        points.push_back({x, y, "face"});
    }

    // Interior points (noise below face)
    for (int i = 0; i < 150; ++i) {
        float x = -2.2f + 4.4f * rng.next();
        float y = 1.0f + 0.36f * rng.next() + rng.gaussian(0.02f);
        points.push_back({x, y, "interior"});
    }

    return points;
}

//=============================================================================
// meanPoint() - Compute Centroid
//=============================================================================
/**
 * Computes the mean (centroid) of a point cloud.
 *
 * USAGE EXAMPLE:
 *   Vector2 center = meanPoint(points);
 *
 * USED IN THIS SCRIPT:
 *   - rotationFilter(): Computes pivot offset from centroid
 */
Vector2 meanPoint(const std::vector<Point>& points) {
    float sx = 0, sy = 0;
    for (const auto& p : points) {
        sx += p.x;
        sy += p.y;
    }
    return {sx / points.size(), sy / points.size()};
}

//=============================================================================
// rotationFilter() - Apply Rotation-Based Face Filter
//=============================================================================
/**
 * Filters points by rotating around pivot and keeping those near max rotated_y.
 *
 * PARAMETERS:
 *   points         - Input point cloud
 *   estimatedAngle - Initial heading estimate (for pivot offset)
 *   candidateAngle - Current sweep angle to test
 *
 * RETURNS:
 *   FilterResult with pivot, boundary, and kept/rejected points
 *
 * ALGORITHM:
 *   1. Pivot = centroid + offset in normal direction
 *   2. For each point, compute: rotated_y = cos(angle)*dy - sin(angle)*dx
 *   3. Boundary = max(rotated_y) across all points
 *   4. Keep points where rotated_y > boundary - 0.22m
 *
 * USAGE EXAMPLE:
 *   FilterResult result = rotationFilter(points, 0.0f, candidateAngle);
 *   // result.kept contains face points
 *
 * USED IN THIS SCRIPT:
 *   - main(): Called each frame with current sweep angle
 */
FilterResult rotationFilter(const std::vector<Point>& points, float estimatedAngle, float candidateAngle) {
    Vector2 avg = meanPoint(points);

    // Pivot is offset from centroid in perpendicular direction
    Vector2 pivot = {
        avg.x - sinf(estimatedAngle) * 2.4f,
        avg.y + cosf(estimatedAngle) * 2.4f
    };

    // Compute rotated y-value for each point relative to pivot
    std::vector<float> values;
    for (const auto& p : points) {
        float rx = p.x - pivot.x;
        float ry = p.y - pivot.y;
        // Rotated y = projection onto rotated y-axis
        float v = cosf(candidateAngle) * ry - sinf(candidateAngle) * rx;
        values.push_back(v);
    }

    // Boundary is the maximum rotated_y (outer face edge)
    float boundary = *std::max_element(values.begin(), values.end());

    // Classify points based on distance to boundary
    FilterResult result;
    result.pivot = pivot;
    result.boundary = boundary;

    for (size_t i = 0; i < points.size(); ++i) {
        if (values[i] > boundary - 0.22f) {
            result.kept.push_back(points[i]);     // Near boundary = face
        } else {
            result.rejected.push_back(points[i]); // Below boundary = interior
        }
    }

    return result;
}

//=============================================================================
// WorldRenderer - Coordinate Transformation and Drawing
//=============================================================================
/**
 * Transforms world coordinates to screen coordinates.
 *
 * USAGE EXAMPLE:
 *   WorldRenderer world(1000, 650);
 *   world.drawPoints(result.kept, RED, 5);
 *   world.drawPivot(result.pivot);
 *
 * USED IN THIS SCRIPT:
 *   - main(): Created each frame for rendering
 */
class WorldRenderer {
public:
    Rectangle rect;
    float minX, maxX, minY, maxY;
    float scale;

    WorldRenderer(int screenW, int screenH) {
        rect = {22, 70, screenW - 360.0f, screenH - 95.0f};
        minX = -2.8f; maxX = 2.8f;
        minY = 0.6f;  maxY = 1.9f;
        float worldW = maxX - minX;
        float worldH = maxY - minY;
        scale = fminf(rect.width / worldW, rect.height / worldH);
    }

    Vector2 toScreen(float x, float y) const {
        float cx = (minX + maxX) * 0.5f;
        float cy = (minY + maxY) * 0.5f;
        return {
            rect.x + rect.width * 0.5f + (x - cx) * scale,
            rect.y + rect.height * 0.5f - (y - cy) * scale
        };
    }

    void drawGrid() const {
        DrawRectangleLinesEx(rect, 1, {42, 51, 72, 255});
        for (int x = (int)ceilf(minX); x <= (int)maxX; ++x) {
            Vector2 a = toScreen((float)x, minY);
            Vector2 b = toScreen((float)x, maxY);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
        for (int y = (int)ceilf(minY); y <= (int)maxY; ++y) {
            Vector2 a = toScreen(minX, (float)y);
            Vector2 b = toScreen(maxX, (float)y);
            DrawLineV(a, b, {42, 51, 72, 255});
        }
    }

    void drawPoints(const std::vector<Point>& points, Color color, float size) const {
        for (const auto& p : points) {
            Vector2 s = toScreen(p.x, p.y);
            DrawCircleV(s, size, color);
        }
    }

    void drawPivot(Vector2 pivot) const {
        Vector2 s = toScreen(pivot.x, pivot.y);
        DrawCircleV(s, 8, {82, 255, 168, 255});
    }

    /**
     * Draws the boundary line perpendicular to candidate angle.
     * This shows where the filter separates face from interior.
     */
    void drawBoundaryLine(Vector2 pivot, float angle, float rotatedY) const {
        Vector2 dir = {cosf(angle), sinf(angle)};
        Vector2 normal = {-sinf(angle), cosf(angle)};

        // Center of boundary line = pivot + normal * rotatedY
        float centerX = pivot.x + normal.x * rotatedY;
        float centerY = pivot.y + normal.y * rotatedY;

        // Extend line in direction of angle
        Vector2 a = toScreen(centerX - dir.x * 4, centerY - dir.y * 4);
        Vector2 b = toScreen(centerX + dir.x * 4, centerY + dir.y * 4);

        DrawLineEx(a, b, 3.0f, {248, 113, 113, 255});
    }
};

//=============================================================================
// drawPanel() - Info Panel
//=============================================================================
void drawPanel(int screenW, float candidateDeg, int kept, int total) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Rotation filter", (int)x + 14, 86, 14, {230, 230, 230, 255});

    char buf[128];
    int y = 118;

    snprintf(buf, sizeof(buf), "candidate angle: %.1f deg", candidateDeg);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    snprintf(buf, sizeof(buf), "kept points: %d/%d", kept, total);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("In the C++ logic, this removes", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("interior/noisy points before line fit.", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    DrawText("The pivot creates a temporary local", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("basis. For each candidate angle,", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("rotated_y exposes the outer face edge.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

//=============================================================================
// main()
//=============================================================================
int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Rotation Filter Demo");
    SetTargetFPS(30);

    // Generate test point cloud once (same every run)
    std::vector<Point> points = makePointCloud();

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Sweep candidate angle from -20 to +20 degrees
        float candidateDeg = -20.0f + ((simFrame / 5) % 81) * 0.5f;
        float candidateAngle = candidateDeg * DEG;

        // Apply rotation filter at current angle
        FilterResult filtered = rotationFilter(points, 0.0f, candidateAngle);

        // Render
        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Rotation search filter", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: sweep angle -> compute rotated_y boundary -> keep outer rack face band",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();
        world.drawPoints(filtered.rejected, {111, 126, 153, 95}, 4);   // Interior (dim gray)
        world.drawPoints(filtered.kept, {248, 113, 113, 195}, 5);      // Face (red)
        world.drawPivot(filtered.pivot);
        world.drawBoundaryLine(filtered.pivot, candidateAngle, filtered.boundary);

        drawPanel(GetScreenWidth(), candidateDeg, (int)filtered.kept.size(), (int)points.size());

        DrawText("SPACE: Pause | R: Reset", 22, GetScreenHeight() - 25, 11, {149, 163, 184, 255});
        if (paused) DrawText("PAUSED", GetScreenWidth() / 2 - 40, 20, 20, {248, 113, 113, 255});

        EndDrawing();

        if (!paused) simFrame++;
    }

    CloseWindow();
    return 0;
}

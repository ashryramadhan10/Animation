// Failure Cases Demo
// Visualizes when correction should reject, reset, or freeze state.
// Shows normal case, missing beam, heading outlier, and track ID switch scenarios.

#include "raylib.h"
#include <cmath>
#include <vector>
#include <string>

// Beam visualization data
struct BeamVis {
    float angle;
    Color color;
    bool accepted;
    bool shifted;
};

// Failure case scenario
struct Case {
    const char* title;
    std::vector<BeamVis> beams;
    std::vector<const char*> notes;
};

// Define all failure cases
std::vector<Case> CASES = {
    {
        "normal",
        {
            {33, {82, 255, 168, 255}, true, false},
            {34, {82, 255, 168, 255}, true, false}
        },
        {"Both beams agree.", "Use the consensus heading and update correction."}
    },
    {
        "missing beam",
        {
            {33, {82, 255, 168, 255}, true, false}
        },
        {"Only one beam is reliable.", "Offset by expected half-width or freeze lateral state."}
    },
    {
        "heading outlier",
        {
            {33, {82, 255, 168, 255}, true, false},
            {52, {248, 113, 113, 255}, false, false}
        },
        {"One beam disagrees with the aisle.", "Reject it instead of steering into a bad yaw."}
    },
    {
        "track id switch",
        {
            {33, {82, 255, 168, 255}, true, false},
            {33, {248, 113, 113, 255}, false, true}
        },
        {"The id no longer means the same beam.", "Reset accumulated geometry for that id."}
    }
};

// World renderer
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

    void drawBeam(float angleDeg, float offset, Color color) const {
        float yaw = angleDeg * PI / 180.0f;
        float dirX = cosf(yaw);
        float dirY = sinf(yaw);
        float normX = -sinf(yaw);
        float normY = cosf(yaw);

        float centerX = normX * offset;
        float centerY = normY * offset;

        Vector2 a = toScreen(centerX - dirX * 3.2f, centerY - dirY * 3.2f);
        Vector2 b = toScreen(centerX + dirX * 3.2f, centerY + dirY * 3.2f);

        DrawLineEx(a, b, 4, color);
    }
};

// Draw panel
void drawPanel(int screenW, const Case& current) {
    float x = screenW - 320.0f;
    DrawRectangleRounded({x, 70, 300, 400}, 0.05f, 8, {14, 18, 28, 235});
    DrawRectangleRoundedLinesEx({x, 70, 300, 400}, 0.05f, 8, 1, {47, 58, 82, 255});

    DrawText("Failure case", (int)x + 14, 86, 14, {230, 230, 230, 255});

    int y = 118;

    char buf[128];
    snprintf(buf, sizeof(buf), "case: %s", current.title);
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;

    int accepted = 0;
    for (const auto& beam : current.beams) if (beam.accepted) accepted++;
    snprintf(buf, sizeof(buf), "accepted beams: %d/%d", accepted, (int)current.beams.size());
    DrawText(buf, (int)x + 14, y, 12, {210, 220, 235, 255}); y += 30;

    for (const char* note : current.notes) {
        DrawText(note, (int)x + 14, y, 12, {210, 220, 235, 255});
        y += 18;
    }

    y += 12;
    DrawText("Principle: do not update correction", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("from geometry that no longer describes", (int)x + 14, y, 12, {210, 220, 235, 255}); y += 18;
    DrawText("the same physical rack/aisle evidence.", (int)x + 14, y, 12, {210, 220, 235, 255});
}

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 650, "Failure Cases Demo");
    SetTargetFPS(30);

    int simFrame = 0;
    bool paused = false;

    while (!WindowShouldClose()) {
        if (IsKeyPressed(KEY_SPACE)) paused = !paused;
        if (IsKeyPressed(KEY_R)) simFrame = 0;

        // Cycle through cases every 90 frames
        int caseIndex = (simFrame / 90) % (int)CASES.size();
        const Case& current = CASES[caseIndex];

        BeginDrawing();
        ClearBackground({8, 10, 16, 255});

        DrawText("Failure cases", 22, 20, 18, {232, 238, 248, 255});
        DrawText("One sketch: visualize when correction should reject, reset, or freeze state",
                 22, 45, 12, {149, 163, 184, 255});

        WorldRenderer world(GetScreenWidth(), GetScreenHeight());
        world.drawGrid();

        // Draw beams
        for (size_t i = 0; i < current.beams.size(); ++i) {
            const auto& beam = current.beams[i];
            float offset;
            if (beam.shifted) {
                offset = 1.2f;
            } else if (i == 0) {
                offset = 1.4f;
            } else {
                offset = -1.4f;
            }
            world.drawBeam(beam.angle, offset, beam.color);
        }

        // Draw centerline (green)
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

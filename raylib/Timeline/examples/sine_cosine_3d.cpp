#include "viz/math/Functions.hpp"
#include "viz/plot/Plot3D.hpp"
#include "viz/story/Storyboard.hpp"
#include "viz/visual/Curve3D.hpp"
#include "viz/visual/CurveFrame.hpp"
#include "viz/visual/Marker3D.hpp"

#include <raylib.h>

#include <vector>

namespace
{
constexpr int helixStartFrame = 30;
constexpr int sampleCount = 240;
constexpr int lastFrame = helixStartFrame + sampleCount - 1;

std::vector<viz::CurveFrame> makeHelixStates()
{
    std::vector<viz::CurveFrame> states;
    states.reserve(sampleCount);
    for (int visiblePoints = 1; visiblePoints <= sampleCount; ++visiblePoints)
    {
        states.push_back({visiblePoints, true, true});
    }
    return states;
}

void handleInput(viz::Storyboard& storyboard)
{
    if (IsKeyPressed(KEY_SPACE))
    {
        storyboard.togglePlay();
    }
    if (IsKeyPressed(KEY_RIGHT))
    {
        storyboard.next();
    }
    if (IsKeyPressed(KEY_LEFT))
    {
        storyboard.previous();
    }
    if (IsKeyPressed(KEY_R))
    {
        storyboard.reset();
    }
}
}

int main()
{
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1100, 700, "Timeline - Sine and Cosine Helix 3D");
    SetTargetFPS(60);

    viz::Storyboard storyboard(lastFrame, 60.0f);
    const viz::Plot3D plot;
    const std::vector<Vector3> helix = viz::math::makeSinCosHelix(sampleCount);

    const auto helixSequence = storyboard.sequence(
        "Helix",
        helixStartFrame,
        sampleCount
    );
    auto& helixTrack = helixSequence.track<viz::CurveFrame>("Curve");
    helixTrack.clip(makeHelixStates()).commit();

    auto& markerTrack = helixSequence.track<Vector3>("Marker");
    markerTrack.clip(helix).commit();

    auto& helixOpacity = helixSequence.opacity("Opacity");
    helixOpacity.fadeIn(0, 24);
    helixSequence.marker(0, "Helix begins");
    storyboard.play();

    while (!WindowShouldClose())
    {
        handleInput(storyboard);
        storyboard.update(GetFrameTime());

        BeginDrawing();
        ClearBackground({245, 247, 250, 255});

        BeginMode3D(plot.camera());
        plot.drawGrid();
        plot.drawAxes();

        if (const viz::CurveFrame* state = helixTrack.at(storyboard.frame()))
        {
            viz::drawCurve3D(
                helix,
                *state,
                Fade(PURPLE, helixOpacity.at(storyboard.frame()).value_or(1.0f))
            );
        }
        if (const Vector3* marker = markerTrack.at(storyboard.frame()))
        {
            viz::drawMarker3D(*marker, 0.13f, GOLD);
        }

        EndMode3D();

        DrawText("Sine/cosine relationship as a 3D helix", 24, 20, 26, DARKGRAY);
        DrawText("x = t, y = sin(t), z = cos(t)", 25, 51, 17, GRAY);
        DrawText(TextFormat("Frame: %d / %d", storyboard.frame(), storyboard.lastFrame()), 24, GetScreenHeight() - 72, 20, BLACK);
        DrawText(storyboard.isPlaying() ? "PLAYING" : "PAUSED", 250, GetScreenHeight() - 72, 20, storyboard.isPlaying() ? DARKGREEN : MAROON);
        DrawText("SPACE: Play/Pause   LEFT/RIGHT: Step   R: Reset", 24, GetScreenHeight() - 38, 14, GRAY);

        EndDrawing();
    }

    CloseWindow();
    return 0;
}

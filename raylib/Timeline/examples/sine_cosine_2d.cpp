#include "viz/math/Functions.hpp"
#include "viz/plot/Plot2D.hpp"
#include "viz/story/Storyboard.hpp"
#include "viz/visual/Curve2D.hpp"
#include "viz/visual/CurveFrame.hpp"
#include "viz/visual/Marker2D.hpp"

#include <raylib.h>

#include <algorithm>
#include <vector>

namespace
{
constexpr int sineStartFrame = 30;
constexpr int cosineStartFrame = 90;
constexpr int sampleCount = 240;
constexpr int lastFrame = cosineStartFrame + sampleCount - 1;

std::vector<viz::CurveFrame> makeCurveStates(
    int samples,
    bool drawLine,
    bool drawPoints)
{
    std::vector<viz::CurveFrame> states;
    states.reserve(static_cast<std::size_t>(samples));
    for (int visiblePoints = 1; visiblePoints <= samples; ++visiblePoints)
    {
        states.push_back({visiblePoints, drawLine, drawPoints});
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
    InitWindow(1100, 700, "Timeline - Sine and Cosine 2D");
    SetTargetFPS(60);

    viz::Storyboard storyboard(lastFrame, 60.0f);
    const std::vector<Vector2> sine = viz::math::makeSinCurve(sampleCount);
    const std::vector<Vector2> cosine = viz::math::makeCosCurve(sampleCount);

    auto& sineTrack = storyboard.track<viz::CurveFrame>("Sine line");
    sineTrack.clip(makeCurveStates(sampleCount, true, false))
        .startAt(sineStartFrame)
        .holdLast()
        .commit();

    auto& markerTrack = storyboard.track<Vector2>("Sine marker");
    markerTrack.clip(sine)
        .startAt(sineStartFrame)
        .holdLast()
        .commit();

    const auto cosineSequence = storyboard.sequence(
        "Cosine",
        cosineStartFrame,
        lastFrame - cosineStartFrame + 1
    );
    auto& cosineTrack = cosineSequence.track<viz::CurveFrame>("Samples");
    cosineTrack.clip(makeCurveStates(sampleCount, false, true))
        .holdLast()
        .commit();

    auto& sineOpacity = storyboard.opacity("Sine opacity");
    sineOpacity.fadeIn(sineStartFrame, 20);
    auto& cosineOpacity = cosineSequence.opacity("Opacity");
    cosineOpacity.fadeIn(0, 20);

    storyboard.marker(sineStartFrame, "Sine begins");
    cosineSequence.marker(0, "Cosine begins");
    storyboard.play();

    while (!WindowShouldClose())
    {
        handleInput(storyboard);
        storyboard.update(GetFrameTime());

        const float plotWidth = std::max(200.0f, static_cast<float>(GetScreenWidth()) - 120.0f);
        const float plotHeight = std::max(160.0f, static_cast<float>(GetScreenHeight()) - 190.0f);
        const viz::Plot2D plot(
            {80.0f, 80.0f, plotWidth, plotHeight},
            {-2.0f * viz::math::pi, 2.0f * viz::math::pi},
            {-1.5f, 1.5f}
        );

        BeginDrawing();
        ClearBackground(RAYWHITE);

        DrawText("Deterministic sine/cosine timeline", 24, 20, 26, DARKGRAY);
        DrawText("One global frame resolves every visible object", 25, 51, 15, GRAY);

        plot.drawGrid(viz::math::pi / 2.0f, 0.5f);
        plot.drawBorder();

        if (const viz::CurveFrame* state = sineTrack.at(storyboard.frame()))
        {
            viz::drawCurve2D(
                plot,
                sine,
                *state,
                Fade(BLUE, sineOpacity.at(storyboard.frame()).value_or(1.0f))
            );
        }
        if (const viz::CurveFrame* state = cosineTrack.at(storyboard.frame()))
        {
            viz::drawCurve2D(
                plot,
                cosine,
                *state,
                Fade(RED, cosineOpacity.at(storyboard.frame()).value_or(1.0f))
            );
        }
        if (const Vector2* marker = markerTrack.at(storyboard.frame()))
        {
            viz::drawMarker2D(plot, *marker, 7.0f, DARKBLUE);
        }

        const int footerY = GetScreenHeight() - 82;
        DrawText(TextFormat("Frame: %d / %d", storyboard.frame(), storyboard.lastFrame()), 24, footerY, 20, BLACK);
        DrawText(storyboard.isPlaying() ? "PLAYING" : "PAUSED", 250, footerY, 20, storyboard.isPlaying() ? DARKGREEN : MAROON);
        DrawText("BLUE: sin(x) line   RED: cos(x) samples", 24, footerY + 28, 15, DARKGRAY);
        DrawText("SPACE: Play/Pause   LEFT/RIGHT: Step   R: Reset", 24, footerY + 51, 14, GRAY);

        EndDrawing();
    }

    CloseWindow();
    return 0;
}

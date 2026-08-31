#include "viz/story/Storyboard.hpp"

#include <raylib.h>

#include <algorithm>
#include <string>
#include <vector>

namespace
{
struct SortFrame
{
    std::vector<int> values;
    int activeLeft = -1;
    int activeRight = -1;
    std::string caption;
};

std::vector<SortFrame> recordInsertionSort(std::vector<int> values)
{
    std::vector<SortFrame> recording;
    recording.push_back({values, -1, -1, "Initial values"});

    for (int index = 1; index < static_cast<int>(values.size()); ++index)
    {
        const int key = values[static_cast<std::size_t>(index)];
        int scan = index - 1;
        recording.push_back({values, scan, index, "Choose the next value"});

        while (scan >= 0 && values[static_cast<std::size_t>(scan)] > key)
        {
            values[static_cast<std::size_t>(scan + 1)] = values[static_cast<std::size_t>(scan)];
            recording.push_back({values, scan, scan + 1, "Shift the larger value right"});
            --scan;
        }

        values[static_cast<std::size_t>(scan + 1)] = key;
        recording.push_back({values, scan + 1, -1, "Insert the selected value"});
    }

    recording.push_back({values, -1, -1, "Insertion sort complete"});
    return recording;
}

void handleInput(viz::Storyboard& storyboard)
{
    if (IsKeyPressed(KEY_SPACE)) storyboard.togglePlay();
    if (IsKeyPressed(KEY_RIGHT)) storyboard.next();
    if (IsKeyPressed(KEY_LEFT)) storyboard.previous();
    if (IsKeyPressed(KEY_R)) storyboard.reset();
}

void drawBars(const SortFrame& state, Rectangle area, float opacity)
{
    const int maximum = *std::max_element(state.values.begin(), state.values.end());
    const float slotWidth = area.width / static_cast<float>(state.values.size());
    const float barWidth = slotWidth * 0.68f;

    for (int index = 0; index < static_cast<int>(state.values.size()); ++index)
    {
        const int value = state.values[static_cast<std::size_t>(index)];
        const float height = static_cast<float>(value) / static_cast<float>(maximum) * area.height;
        const float x = area.x + static_cast<float>(index) * slotWidth + (slotWidth - barWidth) / 2.0f;
        const float y = area.y + area.height - height;
        const bool active = index == state.activeLeft || index == state.activeRight;
        const Color color = active ? ORANGE : BLUE;

        DrawRectangleRounded({x, y, barWidth, height}, 0.12f, 5, Fade(color, opacity));
        const char* label = TextFormat("%d", value);
        DrawText(
            label,
            static_cast<int>(x + barWidth / 2.0f) - MeasureText(label, 18) / 2,
            static_cast<int>(area.y + area.height + 10.0f),
            18,
            Fade(DARKGRAY, opacity)
        );
    }
}
}

int main()
{
    constexpr int finalFrame = 359;
    constexpr int clipStart = 30;
    constexpr int clipDuration = 300;

    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1000, 680, "Storyboard - Insertion Sort");
    SetTargetFPS(60);

    viz::Storyboard storyboard(finalFrame, 60.0f);
    const auto sorting = storyboard.sequence("Insertion sort", clipStart, clipDuration);

    auto& states = sorting.track<SortFrame>("Algorithm state");
    states.clip(recordInsertionSort({8, 3, 7, 4, 9, 2, 6, 5}))
        .framesPerStep(10)
        .holdLast()
        .commit();

    auto& opacity = sorting.opacity("Opacity");
    opacity.fadeIn(0, 20).fadeOut(270, 29);

    storyboard.marker(0, "Title");
    sorting.marker(0, "Sorting begins");
    sorting.marker(clipDuration - 1, "Sorting ends");
    storyboard.play();

    while (!WindowShouldClose())
    {
        handleInput(storyboard);
        storyboard.update(GetFrameTime());

        const SortFrame* state = states.at(storyboard.frame());
        const float alpha = opacity.at(storyboard.frame()).value_or(0.2f);
        const Rectangle chart = {
            55.0f,
            105.0f,
            std::max(320.0f, static_cast<float>(GetScreenWidth()) - 110.0f),
            std::max(180.0f, static_cast<float>(GetScreenHeight()) - 290.0f)
        };

        BeginDrawing();
        ClearBackground({247, 249, 252, 255});
        DrawText("Insertion sort storyboard", 28, 22, 28, DARKGRAY);
        DrawText("The algorithm is recorded once; timing is edited afterward", 29, 56, 15, GRAY);

        if (state != nullptr)
        {
            drawBars(*state, chart, alpha);
            DrawText(state->caption.c_str(), 29, GetScreenHeight() - 123, 18, DARKGRAY);
        }
        else
        {
            DrawText("The sorting clip begins at frame 30", 29, GetScreenHeight() - 123, 18, GRAY);
        }

        const float timelineLeft = 150.0f;
        const float timelineRight = static_cast<float>(GetScreenWidth()) - 30.0f;
        const float playheadX = timelineLeft
            + static_cast<float>(storyboard.frame()) / storyboard.lastFrame()
            * (timelineRight - timelineLeft);
        const int timelineY = GetScreenHeight() - 82;

        DrawRectangle(0, timelineY - 10, GetScreenWidth(), 92, {20, 24, 33, 255});
        DrawText("Algorithm", 25, timelineY + 14, 14, RAYWHITE);
        DrawRectangleRec(
            {
                timelineLeft + static_cast<float>(clipStart) / finalFrame * (timelineRight - timelineLeft),
                static_cast<float>(timelineY + 8),
                static_cast<float>(clipDuration) / finalFrame * (timelineRight - timelineLeft),
                26.0f
            },
            {14, 165, 233, 220}
        );
        DrawLineEx(
            {playheadX, static_cast<float>(timelineY - 3)},
            {playheadX, static_cast<float>(timelineY + 43)},
            2.0f,
            {248, 113, 113, 255}
        );
        DrawText("SPACE: Play/Pause   LEFT/RIGHT: Step   R: Reset", 25, timelineY + 55, 12, {156, 163, 175, 255});
        DrawText(TextFormat("%d / %d", storyboard.frame(), storyboard.lastFrame()), GetScreenWidth() - 105, 28, 15, DARKGRAY);

        EndDrawing();
    }

    CloseWindow();
    return 0;
}

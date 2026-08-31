#include "viz/story/Storyboard.hpp"

#include <raylib.h>

#include <algorithm>
#include <array>
#include <queue>
#include <string>
#include <vector>

namespace
{
constexpr int nodeCount = 9;
constexpr int lastFrame = 419;
constexpr int searchStart = 30;
constexpr int searchDuration = 360;

enum class NodeState
{
    Unvisited,
    Frontier,
    Visited
};

struct Edge
{
    int from;
    int to;
};

struct GraphFrame
{
    std::array<NodeState, nodeCount> nodes{};
    int current = -1;
    std::string caption = "Waiting to begin";
};

constexpr std::array<Edge, 11> edges = {{
    {0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 4}, {2, 5},
    {3, 6}, {4, 6}, {4, 7}, {5, 7}, {7, 8}
}};

constexpr std::array<Vector2, nodeCount> normalizedPositions = {{
    {0.10f, 0.48f}, {0.29f, 0.22f}, {0.29f, 0.73f},
    {0.50f, 0.12f}, {0.50f, 0.48f}, {0.50f, 0.84f},
    {0.72f, 0.24f}, {0.72f, 0.68f}, {0.91f, 0.68f}
}};

std::vector<int> neighborsOf(int node)
{
    std::vector<int> neighbors;
    for (const Edge edge : edges)
    {
        if (edge.from == node)
        {
            neighbors.push_back(edge.to);
        }
        else if (edge.to == node)
        {
            neighbors.push_back(edge.from);
        }
    }
    return neighbors;
}

std::vector<GraphFrame> recordBreadthFirstSearch()
{
    std::vector<GraphFrame> recording;
    GraphFrame state;
    std::queue<int> frontier;

    state.nodes[0] = NodeState::Frontier;
    state.current = 0;
    state.caption = "Put A in the frontier";
    frontier.push(0);
    recording.push_back(state);

    while (!frontier.empty())
    {
        const int current = frontier.front();
        frontier.pop();

        state.current = current;
        state.caption = std::string("Expand ") + static_cast<char>('A' + current);
        recording.push_back(state);

        for (const int neighbor : neighborsOf(current))
        {
            if (state.nodes[static_cast<std::size_t>(neighbor)] == NodeState::Unvisited)
            {
                state.nodes[static_cast<std::size_t>(neighbor)] = NodeState::Frontier;
                frontier.push(neighbor);
                state.caption = std::string("Discover ") + static_cast<char>('A' + neighbor)
                    + " from " + static_cast<char>('A' + current);
                recording.push_back(state);
            }
        }

        state.nodes[static_cast<std::size_t>(current)] = NodeState::Visited;
        state.caption = std::string("Finish ") + static_cast<char>('A' + current);
        recording.push_back(state);
    }

    state.current = -1;
    state.caption = "Breadth-first search complete";
    recording.push_back(state);
    return recording;
}

Vector2 screenPosition(int node, Rectangle area)
{
    const Vector2 normalized = normalizedPositions[static_cast<std::size_t>(node)];
    return {
        area.x + normalized.x * area.width,
        area.y + normalized.y * area.height
    };
}

Color nodeColor(NodeState state, bool current)
{
    if (current)
    {
        return GOLD;
    }
    if (state == NodeState::Visited)
    {
        return BLUE;
    }
    if (state == NodeState::Frontier)
    {
        return SKYBLUE;
    }
    return {209, 213, 219, 255};
}

void drawGraph(Rectangle area, const GraphFrame& state, float opacity)
{
    for (const Edge edge : edges)
    {
        const bool resolved = state.nodes[static_cast<std::size_t>(edge.from)] == NodeState::Visited
            && state.nodes[static_cast<std::size_t>(edge.to)] == NodeState::Visited;
        DrawLineEx(
            screenPosition(edge.from, area),
            screenPosition(edge.to, area),
            resolved ? 4.0f : 2.0f,
            Fade(resolved ? DARKBLUE : GRAY, opacity)
        );
    }

    for (int node = 0; node < nodeCount; ++node)
    {
        const Vector2 position = screenPosition(node, area);
        const bool current = node == state.current;
        DrawCircleV(position, current ? 27.0f : 23.0f, Fade(nodeColor(state.nodes[static_cast<std::size_t>(node)], current), opacity));
        DrawCircleLinesV(position, current ? 27.0f : 23.0f, Fade(DARKGRAY, opacity));

        const char* label = TextFormat("%c", static_cast<char>('A' + node));
        const int width = MeasureText(label, 20);
        DrawText(label, static_cast<int>(position.x) - width / 2, static_cast<int>(position.y) - 10, 20, Fade(BLACK, opacity));
    }
}

float frameX(int frame, int finalFrame, float left, float right)
{
    return left + static_cast<float>(frame) / static_cast<float>(finalFrame) * (right - left);
}

void drawEditorTimeline(const viz::Storyboard& storyboard)
{
    const int screenWidth = GetScreenWidth();
    const int panelY = GetScreenHeight() - 126;
    const float left = 145.0f;
    const float right = static_cast<float>(screenWidth) - 24.0f;

    DrawRectangle(0, panelY, screenWidth, 126, {20, 24, 33, 255});
    DrawText("TRACKS", 22, panelY + 13, 13, {156, 163, 175, 255});
    DrawText("Title", 22, panelY + 42, 14, RAYWHITE);
    DrawText("BFS state", 22, panelY + 77, 14, RAYWHITE);

    DrawRectangleRec(
        {left, static_cast<float>(panelY + 37), right - left, 23.0f},
        {99, 102, 241, 210}
    );
    DrawRectangleRec(
        {
            frameX(searchStart, storyboard.lastFrame(), left, right),
            static_cast<float>(panelY + 72),
            frameX(searchStart + searchDuration - 1, storyboard.lastFrame(), left, right)
                - frameX(searchStart, storyboard.lastFrame(), left, right),
            23.0f
        },
        {14, 165, 233, 220}
    );

    for (const viz::TimelineMarker& marker : storyboard.markers())
    {
        const float x = frameX(marker.frame, storyboard.lastFrame(), left, right);
        DrawTriangle(
            {x - 5.0f, static_cast<float>(panelY + 8)},
            {x + 5.0f, static_cast<float>(panelY + 8)},
            {x, static_cast<float>(panelY + 17)},
            GOLD
        );
    }

    const float playhead = frameX(storyboard.frame(), storyboard.lastFrame(), left, right);
    DrawLineEx(
        {playhead, static_cast<float>(panelY + 7)},
        {playhead, static_cast<float>(panelY + 103)},
        2.0f,
        {248, 113, 113, 255}
    );
    DrawText("SPACE: Play/Pause   LEFT/RIGHT: Step   R: Reset", 22, panelY + 105, 12, {156, 163, 175, 255});
}

void handleInput(viz::Storyboard& storyboard)
{
    if (IsKeyPressed(KEY_SPACE)) storyboard.togglePlay();
    if (IsKeyPressed(KEY_RIGHT)) storyboard.next();
    if (IsKeyPressed(KEY_LEFT)) storyboard.previous();
    if (IsKeyPressed(KEY_R)) storyboard.reset();
}
}

int main()
{
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1100, 740, "Storyboard - Breadth-First Search");
    SetTargetFPS(60);

    viz::Storyboard storyboard(lastFrame, 60.0f);
    const auto search = storyboard.sequence("BFS", searchStart, searchDuration);

    auto& graphTrack = search.track<GraphFrame>("Graph state");
    graphTrack.clip(recordBreadthFirstSearch())
        .framesPerStep(12)
        .holdLast()
        .commit();

    auto& graphOpacity = search.opacity("Opacity");
    graphOpacity.fadeIn(0, 20).fadeOut(330, 29);

    auto& titleOpacity = storyboard.opacity("Title opacity");
    titleOpacity.fadeIn(0, 20).fadeOut(390, 29);

    storyboard.marker(0, "Introduction");
    search.marker(0, "Search begins");
    search.marker(searchDuration - 1, "Search ends");
    storyboard.play();

    while (!WindowShouldClose())
    {
        handleInput(storyboard);
        storyboard.update(GetFrameTime());

        const Rectangle graphArea = {
            45.0f,
            92.0f,
            std::max(300.0f, static_cast<float>(GetScreenWidth()) - 90.0f),
            std::max(220.0f, static_cast<float>(GetScreenHeight()) - 255.0f)
        };
        const GraphFrame emptyState;
        const GraphFrame* state = graphTrack.at(storyboard.frame());
        const float graphAlpha = graphOpacity.at(storyboard.frame()).value_or(0.22f);
        const float titleAlpha = titleOpacity.at(storyboard.frame()).value_or(1.0f);

        BeginDrawing();
        ClearBackground({246, 248, 252, 255});

        DrawText("Breadth-first search", 24, 18, 28, Fade(DARKGRAY, titleAlpha));
        DrawText(
            "Algorithm snapshots recorded once, then edited as a clip",
            25,
            51,
            16,
            Fade(GRAY, titleAlpha)
        );

        drawGraph(graphArea, state != nullptr ? *state : emptyState, graphAlpha);

        DrawRectangleRounded(
            {24.0f, static_cast<float>(GetScreenHeight() - 164), static_cast<float>(GetScreenWidth()) - 48.0f, 30.0f},
            0.25f,
            4,
            {229, 231, 235, 255}
        );
        const std::string caption = state != nullptr ? state->caption : "The BFS clip starts at frame 30";
        DrawText(caption.c_str(), 38, GetScreenHeight() - 157, 16, DARKGRAY);
        DrawText(
            TextFormat("Frame %d / %d", storyboard.frame(), storyboard.lastFrame()),
            GetScreenWidth() - 155,
            24,
            15,
            DARKGRAY
        );

        drawEditorTimeline(storyboard);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}

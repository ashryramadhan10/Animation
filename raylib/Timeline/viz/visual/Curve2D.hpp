#pragma once

#include "viz/plot/Plot2D.hpp"
#include "viz/visual/CurveFrame.hpp"

#include <raylib.h>

#include <algorithm>
#include <vector>

namespace viz
{
inline void drawCurve2D(
    const Plot2D& plot,
    const std::vector<Vector2>& points,
    const CurveFrame& state,
    Color color)
{
    const int count = std::clamp(
        state.visiblePoints,
        0,
        static_cast<int>(points.size())
    );

    if (state.drawLine)
    {
        for (int index = 1; index < count; ++index)
        {
            DrawLineEx(
                plot.toScreen(points[static_cast<std::size_t>(index - 1)]),
                plot.toScreen(points[static_cast<std::size_t>(index)]),
                2.5f,
                color
            );
        }
    }

    if (state.drawPoints)
    {
        for (int index = 0; index < count; ++index)
        {
            DrawCircleV(plot.toScreen(points[static_cast<std::size_t>(index)]), 3.0f, color);
        }
    }
}
}

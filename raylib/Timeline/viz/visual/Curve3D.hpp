#pragma once

#include "viz/visual/CurveFrame.hpp"

#include <raylib.h>

#include <algorithm>
#include <vector>

namespace viz
{
inline void drawCurve3D(
    const std::vector<Vector3>& points,
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
            DrawLine3D(
                points[static_cast<std::size_t>(index - 1)],
                points[static_cast<std::size_t>(index)],
                color
            );
        }
    }

    if (state.drawPoints)
    {
        for (int index = 0; index < count; index += 4)
        {
            DrawSphere(points[static_cast<std::size_t>(index)], 0.05f, color);
        }
    }
}
}

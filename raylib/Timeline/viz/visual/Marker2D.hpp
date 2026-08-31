#pragma once

#include "viz/plot/Plot2D.hpp"

#include <raylib.h>

#include <cmath>
#include <stdexcept>

namespace viz
{
inline void drawMarker2D(const Plot2D& plot, Vector2 position, float radius, Color color)
{
    if (!std::isfinite(radius) || radius <= 0.0f)
    {
        throw std::invalid_argument("Marker2D radius must be positive and finite");
    }
    DrawCircleV(plot.toScreen(position), radius, color);
}
}

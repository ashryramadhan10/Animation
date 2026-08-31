#pragma once

#include <raylib.h>

#include <cmath>
#include <stdexcept>

namespace viz
{
inline void drawMarker3D(Vector3 position, float radius, Color color)
{
    if (!std::isfinite(radius) || radius <= 0.0f)
    {
        throw std::invalid_argument("Marker3D radius must be positive and finite");
    }
    DrawSphere(position, radius, color);
}
}

#pragma once

#include <raylib.h>

#include <cmath>
#include <stdexcept>

namespace viz
{
class Plot3D
{
public:
    Plot3D()
    {
        camera_.position = {10.0f, 7.0f, 10.0f};
        camera_.target = {0.0f, 0.0f, 0.0f};
        camera_.up = {0.0f, 1.0f, 0.0f};
        camera_.fovy = 45.0f;
        camera_.projection = CAMERA_PERSPECTIVE;
    }

    const Camera3D& camera() const noexcept
    {
        return camera_;
    }

    void drawGrid(int slices = 20, float spacing = 1.0f) const
    {
        if (slices <= 0 || !std::isfinite(spacing) || spacing <= 0.0f)
        {
            throw std::invalid_argument("Plot3D grid values must be positive and finite");
        }
        DrawGrid(slices, spacing);
    }

    void drawAxes() const
    {
        DrawLine3D({-7.0f, 0.0f, 0.0f}, {7.0f, 0.0f, 0.0f}, RED);
        DrawLine3D({0.0f, -3.0f, 0.0f}, {0.0f, 3.0f, 0.0f}, GREEN);
        DrawLine3D({0.0f, 0.0f, -3.0f}, {0.0f, 0.0f, 3.0f}, BLUE);
    }

private:
    Camera3D camera_{};
};
}

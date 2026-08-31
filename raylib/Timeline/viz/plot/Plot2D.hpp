#pragma once

#include "viz/plot/Range.hpp"

#include <raylib.h>

#include <cstddef>
#include <cmath>
#include <stdexcept>

namespace viz
{
class Plot2D
{
public:
    Plot2D(Rectangle viewport, Range xRange, Range yRange)
        : viewport_(viewport), xRange_(xRange), yRange_(yRange)
    {
        if (!std::isfinite(viewport.width) || !std::isfinite(viewport.height)
            || viewport.width <= 0.0f || viewport.height <= 0.0f)
        {
            throw std::invalid_argument("Plot2D viewport dimensions must be positive and finite");
        }
        if (!std::isfinite(xRange.min) || !std::isfinite(xRange.max)
            || !std::isfinite(yRange.min) || !std::isfinite(yRange.max)
            || xRange.min >= xRange.max || yRange.min >= yRange.max)
        {
            throw std::invalid_argument("Plot2D ranges must be finite and increasing");
        }
    }

    Vector2 toScreen(Vector2 world) const noexcept
    {
        const float normalizedX = (world.x - xRange_.min) / (xRange_.max - xRange_.min);
        const float normalizedY = (world.y - yRange_.min) / (yRange_.max - yRange_.min);

        return {
            viewport_.x + normalizedX * viewport_.width,
            viewport_.y + viewport_.height - normalizedY * viewport_.height
        };
    }

    static std::size_t countGridLines(Range range, float step)
    {
        if (!std::isfinite(range.min) || !std::isfinite(range.max) || range.min > range.max)
        {
            throw std::invalid_argument("Grid range must be finite and ordered");
        }
        if (!std::isfinite(step) || step <= 0.0f)
        {
            throw std::invalid_argument("Grid step must be positive and finite");
        }

        const long double first = std::ceil(
            static_cast<long double>(range.min) / static_cast<long double>(step)
        );
        const long double last = std::floor(
            static_cast<long double>(range.max) / static_cast<long double>(step)
        );

        if (first > last)
        {
            return 0;
        }

        const long double count = last - first + 1.0L;
        if (!std::isfinite(count) || count > static_cast<long double>(maximumGridLinesPerAxis_))
        {
            throw std::length_error("Plot2D grid would contain too many lines");
        }

        return static_cast<std::size_t>(count);
    }

    void drawGrid(float xStep, float yStep) const
    {
        if (!std::isfinite(xStep) || !std::isfinite(yStep) || xStep <= 0.0f || yStep <= 0.0f)
        {
            throw std::invalid_argument("Plot2D grid steps must be positive and finite");
        }

        const Color gridColor = {218, 223, 231, 255};
        const Color axisColor = {75, 85, 99, 255};

        const std::size_t xLineCount = countGridLines(xRange_, xStep);
        const long double firstX = std::ceil(
            static_cast<long double>(xRange_.min) / static_cast<long double>(xStep)
        );
        for (std::size_t index = 0; index < xLineCount; ++index)
        {
            const float x = static_cast<float>(
                (firstX + static_cast<long double>(index)) * static_cast<long double>(xStep)
            );
            DrawLineV(toScreen({x, yRange_.min}), toScreen({x, yRange_.max}), gridColor);
        }

        const std::size_t yLineCount = countGridLines(yRange_, yStep);
        const long double firstY = std::ceil(
            static_cast<long double>(yRange_.min) / static_cast<long double>(yStep)
        );
        for (std::size_t index = 0; index < yLineCount; ++index)
        {
            const float y = static_cast<float>(
                (firstY + static_cast<long double>(index)) * static_cast<long double>(yStep)
            );
            DrawLineV(toScreen({xRange_.min, y}), toScreen({xRange_.max, y}), gridColor);
        }

        if (yRange_.min <= 0.0f && yRange_.max >= 0.0f)
        {
            DrawLineEx(
                toScreen({xRange_.min, 0.0f}),
                toScreen({xRange_.max, 0.0f}),
                2.0f,
                axisColor
            );
        }

        if (xRange_.min <= 0.0f && xRange_.max >= 0.0f)
        {
            DrawLineEx(
                toScreen({0.0f, yRange_.min}),
                toScreen({0.0f, yRange_.max}),
                2.0f,
                axisColor
            );
        }
    }

    void drawBorder() const
    {
        DrawRectangleLinesEx(viewport_, 1.0f, {156, 163, 175, 255});
    }

private:
    inline static constexpr std::size_t maximumGridLinesPerAxis_ = 10000;

    Rectangle viewport_;
    Range xRange_;
    Range yRange_;
};
}

#pragma once

#include <raylib.h>

#include <cmath>
#include <stdexcept>
#include <vector>

namespace viz::math
{
inline constexpr float pi = 3.14159265358979323846f;

inline void validateSampleCount(int samples)
{
    if (samples < 2)
    {
        throw std::invalid_argument("A curve requires at least two samples");
    }
}

inline float sampleParameter(int index, int samples)
{
    const float alpha = static_cast<float>(index) / static_cast<float>(samples - 1);
    return -2.0f * pi + alpha * (4.0f * pi);
}

inline std::vector<Vector2> makeSinCurve(int samples)
{
    validateSampleCount(samples);
    std::vector<Vector2> result;
    result.reserve(static_cast<std::size_t>(samples));

    for (int index = 0; index < samples; ++index)
    {
        const float x = sampleParameter(index, samples);
        result.push_back({x, std::sin(x)});
    }

    return result;
}

inline std::vector<Vector2> makeCosCurve(int samples)
{
    validateSampleCount(samples);
    std::vector<Vector2> result;
    result.reserve(static_cast<std::size_t>(samples));

    for (int index = 0; index < samples; ++index)
    {
        const float x = sampleParameter(index, samples);
        result.push_back({x, std::cos(x)});
    }

    return result;
}

inline std::vector<Vector3> makeSinCosHelix(int samples)
{
    validateSampleCount(samples);
    std::vector<Vector3> result;
    result.reserve(static_cast<std::size_t>(samples));

    for (int index = 0; index < samples; ++index)
    {
        const float t = sampleParameter(index, samples);
        result.push_back({t, std::sin(t), std::cos(t)});
    }

    return result;
}
}

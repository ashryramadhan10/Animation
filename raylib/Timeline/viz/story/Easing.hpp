#pragma once

#include <algorithm>

namespace viz
{
enum class Easing
{
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
    Step
};

inline float applyEasing(Easing easing, float alpha) noexcept
{
    const float t = std::clamp(alpha, 0.0f, 1.0f);

    switch (easing)
    {
        case Easing::EaseIn:
            return t * t;
        case Easing::EaseOut:
        {
            const float inverse = 1.0f - t;
            return 1.0f - inverse * inverse;
        }
        case Easing::EaseInOut:
            if (t < 0.5f)
            {
                return 2.0f * t * t;
            }
            return 1.0f - ((-2.0f * t + 2.0f) * (-2.0f * t + 2.0f)) / 2.0f;
        case Easing::Step:
            return t >= 1.0f ? 1.0f : 0.0f;
        case Easing::Linear:
        default:
            return t;
    }
}
}

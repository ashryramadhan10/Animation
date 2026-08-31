#pragma once

#include "viz/story/Easing.hpp"

#include <algorithm>
#include <functional>
#include <iterator>
#include <optional>
#include <stdexcept>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

namespace viz
{
template<typename T>
class KeyframeTrack
{
public:
    using Interpolator = std::function<T(const T&, const T&, float)>;

    struct Keyframe
    {
        int frame = 0;
        T value{};
        Easing easingToNext = Easing::Linear;
    };

    KeyframeTrack(
        std::string name,
        int scopeStart,
        int scopeEnd,
        Interpolator interpolator = defaultInterpolator())
        : name_(std::move(name)),
          scopeStart_(scopeStart),
          scopeEnd_(scopeEnd),
          interpolator_(std::move(interpolator))
    {
        if (name_.empty())
        {
            throw std::invalid_argument("A keyframe track requires a name");
        }
        if (scopeStart < 0 || scopeStart > scopeEnd)
        {
            throw std::invalid_argument("A keyframe track requires a valid frame scope");
        }
        if (!interpolator_)
        {
            throw std::invalid_argument("This keyframe value type requires an interpolator");
        }
    }

    static Interpolator defaultInterpolator()
    {
        if constexpr (std::is_floating_point_v<T>)
        {
            return [](const T& from, const T& to, float alpha)
            {
                return static_cast<T>(from + (to - from) * static_cast<T>(alpha));
            };
        }
        else
        {
            return {};
        }
    }

    const std::string& name() const noexcept
    {
        return name_;
    }

    int startFrame() const noexcept
    {
        return scopeStart_;
    }

    int endFrame() const noexcept
    {
        return scopeEnd_;
    }

    std::size_t size() const noexcept
    {
        return keyframes_.size();
    }

    KeyframeTrack& keyframe(int localFrame, const T& value, Easing easingToNext = Easing::Linear)
    {
        const int globalFrame = toGlobalFrame(localFrame);
        const auto position = std::lower_bound(
            keyframes_.begin(),
            keyframes_.end(),
            globalFrame,
            [](const Keyframe& keyframe, int frame)
            {
                return keyframe.frame < frame;
            }
        );

        if (position != keyframes_.end() && position->frame == globalFrame)
        {
            position->value = value;
            position->easingToNext = easingToNext;
        }
        else
        {
            keyframes_.insert(position, {globalFrame, value, easingToNext});
        }

        return *this;
    }

    std::optional<T> at(int globalFrame) const
    {
        if (globalFrame < scopeStart_ || globalFrame > scopeEnd_ || keyframes_.empty())
        {
            return std::nullopt;
        }
        if (globalFrame <= keyframes_.front().frame)
        {
            return keyframes_.front().value;
        }
        if (globalFrame >= keyframes_.back().frame)
        {
            return keyframes_.back().value;
        }

        const auto right = std::upper_bound(
            keyframes_.begin(),
            keyframes_.end(),
            globalFrame,
            [](int frame, const Keyframe& keyframe)
            {
                return frame < keyframe.frame;
            }
        );
        const auto left = std::prev(right);
        const float alpha = static_cast<float>(globalFrame - left->frame)
            / static_cast<float>(right->frame - left->frame);

        return interpolator_(left->value, right->value, applyEasing(left->easingToNext, alpha));
    }

    template<typename U = T, std::enable_if_t<std::is_same_v<U, float>, int> = 0>
    KeyframeTrack& fadeIn(int localStart, int duration, Easing easing = Easing::EaseInOut)
    {
        validateTransition(localStart, duration);
        keyframe(localStart, 0.0f, easing);
        keyframe(localStart + duration, 1.0f);
        return *this;
    }

    template<typename U = T, std::enable_if_t<std::is_same_v<U, float>, int> = 0>
    KeyframeTrack& fadeOut(int localStart, int duration, Easing easing = Easing::EaseInOut)
    {
        validateTransition(localStart, duration);
        keyframe(localStart, 1.0f, easing);
        keyframe(localStart + duration, 0.0f);
        return *this;
    }

private:
    int toGlobalFrame(int localFrame) const
    {
        const long long scopeDuration = static_cast<long long>(scopeEnd_) - scopeStart_ + 1;
        if (localFrame < 0 || static_cast<long long>(localFrame) >= scopeDuration)
        {
            throw std::out_of_range("Keyframe lies outside its track scope");
        }
        return scopeStart_ + localFrame;
    }

    void validateTransition(int localStart, int duration) const
    {
        if (duration <= 0)
        {
            throw std::invalid_argument("A fade duration must be positive");
        }
        const long long localEnd = static_cast<long long>(localStart) + duration;
        const long long scopeDuration = static_cast<long long>(scopeEnd_) - scopeStart_ + 1;
        if (localStart < 0 || localEnd >= scopeDuration)
        {
            throw std::out_of_range("Fade lies outside its track scope");
        }
    }

    std::string name_;
    int scopeStart_ = 0;
    int scopeEnd_ = 0;
    Interpolator interpolator_;
    std::vector<Keyframe> keyframes_;
};
}

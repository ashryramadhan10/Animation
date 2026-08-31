#pragma once

#include "viz/core/Timeline.hpp"
#include "viz/story/KeyframeTrack.hpp"
#include "viz/story/StoryTrack.hpp"

#include <algorithm>
#include <functional>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <typeindex>
#include <utility>
#include <vector>

namespace viz
{
struct TimelineMarker
{
    int frame = 0;
    std::string name;
};

class Sequence;

class Storyboard
{
public:
    Storyboard(int lastFrame, float fps)
        : timeline_(lastFrame, fps)
    {
    }

    int frame() const noexcept { return timeline_.frame(); }
    int lastFrame() const noexcept { return timeline_.lastFrame(); }
    float fps() const noexcept { return timeline_.fps(); }
    bool isPlaying() const noexcept { return timeline_.isPlaying(); }
    void play() noexcept { timeline_.play(); }
    void pause() noexcept { timeline_.pause(); }
    void togglePlay() noexcept { timeline_.togglePlay(); }
    void next() noexcept { timeline_.next(); }
    void previous() noexcept { timeline_.previous(); }
    void goTo(int frame) noexcept { timeline_.goTo(frame); }
    void reset() noexcept { timeline_.reset(); }
    void update(float dt) { timeline_.updatePlayback(dt); }

    template<typename T>
    StoryTrack<T>& track(const std::string& name)
    {
        return scopedTrack<T>(name, 0, lastFrame());
    }

    template<typename T>
    KeyframeTrack<T>& keyframes(
        const std::string& name,
        typename KeyframeTrack<T>::Interpolator interpolator = KeyframeTrack<T>::defaultInterpolator())
    {
        return scopedKeyframes<T>(name, 0, lastFrame(), std::move(interpolator));
    }

    KeyframeTrack<float>& opacity(const std::string& name)
    {
        return keyframes<float>(name);
    }

    Sequence sequence(const std::string& name, int startFrame, int duration);

    Storyboard& marker(int frame, const std::string& name)
    {
        if (name.empty())
        {
            throw std::invalid_argument("A timeline marker requires a name");
        }
        if (frame < 0 || frame > lastFrame())
        {
            throw std::out_of_range("Timeline marker lies outside the storyboard");
        }
        if (findMarker(name).has_value())
        {
            throw std::logic_error("Timeline marker names must be unique");
        }

        markers_.push_back({frame, name});
        std::stable_sort(
            markers_.begin(),
            markers_.end(),
            [](const TimelineMarker& lhs, const TimelineMarker& rhs)
            {
                return lhs.frame < rhs.frame;
            }
        );
        return *this;
    }

    std::optional<int> findMarker(const std::string& name) const
    {
        const auto marker = std::find_if(
            markers_.begin(),
            markers_.end(),
            [&name](const TimelineMarker& candidate)
            {
                return candidate.name == name;
            }
        );
        if (marker == markers_.end())
        {
            return std::nullopt;
        }
        return marker->frame;
    }

    std::vector<TimelineMarker> markersAt(int frame) const
    {
        std::vector<TimelineMarker> result;
        for (const TimelineMarker& marker : markers_)
        {
            if (marker.frame == frame)
            {
                result.push_back(marker);
            }
        }
        return result;
    }

    const std::vector<TimelineMarker>& markers() const noexcept
    {
        return markers_;
    }

private:
    enum class TrackKind
    {
        Sampled,
        Keyframed
    };

    struct NamedTrack
    {
        NamedTrack(std::string trackName, TrackKind trackKind, std::type_index trackType, int start, int end)
            : name(std::move(trackName)), kind(trackKind), type(trackType), scopeStart(start), scopeEnd(end)
        {
        }

        virtual ~NamedTrack() = default;

        std::string name;
        TrackKind kind;
        std::type_index type;
        int scopeStart;
        int scopeEnd;
    };

    template<typename T>
    struct SampledTrackSlot final : NamedTrack
    {
        SampledTrackSlot(const std::string& name, int start, int end)
            : NamedTrack(name, TrackKind::Sampled, typeid(T), start, end), value(name, start, end)
        {
        }

        StoryTrack<T> value;
    };

    template<typename T>
    struct KeyframeTrackSlot final : NamedTrack
    {
        KeyframeTrackSlot(
            const std::string& name,
            int start,
            int end,
            typename KeyframeTrack<T>::Interpolator interpolator)
            : NamedTrack(name, TrackKind::Keyframed, typeid(T), start, end),
              value(name, start, end, std::move(interpolator))
        {
        }

        KeyframeTrack<T> value;
    };

    NamedTrack* findTrack(const std::string& name) noexcept
    {
        const auto track = std::find_if(
            tracks_.begin(),
            tracks_.end(),
            [&name](const std::unique_ptr<NamedTrack>& candidate)
            {
                return candidate->name == name;
            }
        );
        return track == tracks_.end() ? nullptr : track->get();
    }

    template<typename T>
    StoryTrack<T>& scopedTrack(const std::string& name, int scopeStart, int scopeEnd)
    {
        validateScope(name, scopeStart, scopeEnd);
        if (NamedTrack* existing = findTrack(name))
        {
            validateExisting<T>(*existing, TrackKind::Sampled, scopeStart, scopeEnd);
            return static_cast<SampledTrackSlot<T>*>(existing)->value;
        }

        auto slot = std::make_unique<SampledTrackSlot<T>>(name, scopeStart, scopeEnd);
        StoryTrack<T>* result = &slot->value;
        tracks_.push_back(std::move(slot));
        return *result;
    }

    template<typename T>
    KeyframeTrack<T>& scopedKeyframes(
        const std::string& name,
        int scopeStart,
        int scopeEnd,
        typename KeyframeTrack<T>::Interpolator interpolator)
    {
        validateScope(name, scopeStart, scopeEnd);
        if (NamedTrack* existing = findTrack(name))
        {
            validateExisting<T>(*existing, TrackKind::Keyframed, scopeStart, scopeEnd);
            return static_cast<KeyframeTrackSlot<T>*>(existing)->value;
        }

        auto slot = std::make_unique<KeyframeTrackSlot<T>>(
            name,
            scopeStart,
            scopeEnd,
            std::move(interpolator)
        );
        KeyframeTrack<T>* result = &slot->value;
        tracks_.push_back(std::move(slot));
        return *result;
    }

    void validateScope(const std::string& name, int scopeStart, int scopeEnd) const
    {
        if (name.empty())
        {
            throw std::invalid_argument("A storyboard track requires a name");
        }
        if (scopeStart < 0 || scopeStart > scopeEnd || scopeEnd > lastFrame())
        {
            throw std::out_of_range("Storyboard track scope lies outside the timeline");
        }
    }

    template<typename T>
    static void validateExisting(
        const NamedTrack& existing,
        TrackKind expectedKind,
        int scopeStart,
        int scopeEnd)
    {
        if (existing.kind != expectedKind || existing.type != std::type_index(typeid(T)))
        {
            throw std::logic_error("A storyboard track name cannot change kind or value type");
        }
        if (existing.scopeStart != scopeStart || existing.scopeEnd != scopeEnd)
        {
            throw std::logic_error("A storyboard track name cannot change its sequence scope");
        }
    }

    Timeline timeline_;
    std::vector<std::unique_ptr<NamedTrack>> tracks_;
    std::vector<TimelineMarker> markers_;

    friend class Sequence;
};

class Sequence
{
public:
    const std::string& name() const noexcept { return name_; }
    int startFrame() const noexcept { return scopeStart_; }
    int endFrame() const noexcept { return scopeEnd_; }
    int duration() const noexcept { return scopeEnd_ - scopeStart_ + 1; }

    template<typename T>
    StoryTrack<T>& track(const std::string& name) const
    {
        return storyboard_->scopedTrack<T>(qualified(name), scopeStart_, scopeEnd_);
    }

    template<typename T>
    KeyframeTrack<T>& keyframes(
        const std::string& name,
        typename KeyframeTrack<T>::Interpolator interpolator = KeyframeTrack<T>::defaultInterpolator()) const
    {
        return storyboard_->scopedKeyframes<T>(
            qualified(name),
            scopeStart_,
            scopeEnd_,
            std::move(interpolator)
        );
    }

    KeyframeTrack<float>& opacity(const std::string& name) const
    {
        return keyframes<float>(name);
    }

    Sequence sequence(const std::string& name, int localStart, int sequenceDuration) const
    {
        validateLocalRange(localStart, sequenceDuration);
        return Sequence(
            *storyboard_,
            qualified(name),
            scopeStart_ + localStart,
            scopeStart_ + localStart + sequenceDuration - 1
        );
    }

    const Sequence& marker(int localFrame, const std::string& name) const
    {
        if (localFrame < 0 || localFrame >= duration())
        {
            throw std::out_of_range("Sequence marker lies outside its sequence");
        }
        storyboard_->marker(scopeStart_ + localFrame, qualified(name));
        return *this;
    }

private:
    Sequence(Storyboard& storyboard, std::string name, int scopeStart, int scopeEnd)
        : storyboard_(&storyboard), name_(std::move(name)), scopeStart_(scopeStart), scopeEnd_(scopeEnd)
    {
        if (name_.empty())
        {
            throw std::invalid_argument("A sequence requires a name");
        }
    }

    std::string qualified(const std::string& child) const
    {
        if (child.empty())
        {
            throw std::invalid_argument("A sequence child requires a name");
        }
        return name_ + "/" + child;
    }

    void validateLocalRange(int localStart, int sequenceDuration) const
    {
        if (localStart < 0 || sequenceDuration <= 0)
        {
            throw std::invalid_argument("A nested sequence requires a valid local range");
        }
        const long long localEnd = static_cast<long long>(localStart) + sequenceDuration - 1;
        if (localEnd >= duration())
        {
            throw std::invalid_argument("A nested sequence cannot exceed its parent sequence");
        }
    }

    Storyboard* storyboard_ = nullptr;
    std::string name_;
    int scopeStart_ = 0;
    int scopeEnd_ = 0;

    friend class Storyboard;
};

inline Sequence Storyboard::sequence(const std::string& name, int startFrame, int sequenceDuration)
{
    if (name.empty() || startFrame < 0 || sequenceDuration <= 0)
    {
        throw std::invalid_argument("A sequence requires a name and valid frame range");
    }
    const long long endFrame = static_cast<long long>(startFrame) + sequenceDuration - 1;
    if (endFrame > lastFrame())
    {
        throw std::invalid_argument("A sequence cannot exceed its storyboard");
    }
    return Sequence(*this, name, startFrame, static_cast<int>(endFrame));
}
}

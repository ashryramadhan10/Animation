#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <initializer_list>
#include <limits>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace viz
{
template<typename T>
class StoryTrack;

template<typename T>
class StoryClipBuilder
{
public:
    StoryClipBuilder(StoryTrack<T>& owner, std::vector<T> source)
        : owner_(&owner), source_(std::move(source)), trimEnd_(source_.size())
    {
    }

    StoryClipBuilder(const StoryClipBuilder&) = delete;
    StoryClipBuilder& operator=(const StoryClipBuilder&) = delete;
    StoryClipBuilder(StoryClipBuilder&&) noexcept = default;
    StoryClipBuilder& operator=(StoryClipBuilder&&) noexcept = default;

    StoryClipBuilder& startAt(int localFrame)
    {
        localStart_ = localFrame;
        return *this;
    }

    StoryClipBuilder& duration(int frames)
    {
        if (frames <= 0)
        {
            throw std::invalid_argument("A clip duration must be positive");
        }
        duration_ = frames;
        return *this;
    }

    StoryClipBuilder& framesPerStep(int frames)
    {
        if (frames <= 0)
        {
            throw std::invalid_argument("framesPerStep must be positive");
        }
        framesPerStep_ = frames;
        return *this;
    }

    StoryClipBuilder& trim(std::size_t first, std::size_t lastExclusive)
    {
        if (first >= lastExclusive || lastExclusive > source_.size())
        {
            throw std::invalid_argument("Clip trim range must be non-empty and inside its source");
        }
        trimFirst_ = first;
        trimEnd_ = lastExclusive;
        return *this;
    }

    StoryClipBuilder& holdLast(bool enabled = true) noexcept
    {
        holdLast_ = enabled;
        return *this;
    }

    StoryTrack<T>& commit()
    {
        if (committed_)
        {
            throw std::logic_error("A story clip builder can only be committed once");
        }
        if (source_.empty() || trimFirst_ >= trimEnd_)
        {
            throw std::invalid_argument("A story clip requires at least one source state");
        }
        if (localStart_ < 0)
        {
            throw std::out_of_range("A clip cannot start before its track scope");
        }

        const long long globalStartValue = static_cast<long long>(owner_->scopeStart_) + localStart_;
        if (globalStartValue > owner_->scopeEnd_)
        {
            throw std::out_of_range("A clip cannot start after its track scope");
        }

        std::vector<T> selectedStates;
        selectedStates.reserve(trimEnd_ - trimFirst_);
        for (std::size_t index = trimFirst_; index < trimEnd_; ++index)
        {
            selectedStates.push_back(std::move(source_[index]));
        }

        owner_->addAuthoredClip(
            static_cast<int>(globalStartValue),
            std::move(selectedStates),
            framesPerStep_,
            duration_,
            holdLast_
        );
        committed_ = true;
        return *owner_;
    }

private:
    StoryTrack<T>* owner_ = nullptr;
    std::vector<T> source_;
    std::size_t trimFirst_ = 0;
    std::size_t trimEnd_ = 0;
    int localStart_ = 0;
    int framesPerStep_ = 1;
    std::optional<int> duration_;
    bool holdLast_ = false;
    bool committed_ = false;
};

template<typename T>
class StoryTrack
{
public:
    StoryTrack(std::string name, int scopeStart, int scopeEnd)
        : name_(std::move(name)), scopeStart_(scopeStart), scopeEnd_(scopeEnd)
    {
        if (name_.empty())
        {
            throw std::invalid_argument("A story track requires a name");
        }
        if (scopeStart < 0 || scopeStart > scopeEnd)
        {
            throw std::invalid_argument("A story track requires a valid frame scope");
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

    std::size_t clipCount() const noexcept
    {
        return clips_.size();
    }

    std::size_t storedStateCount() const noexcept
    {
        std::size_t total = 0;
        for (const AuthoredClip& clip : clips_)
        {
            if (clip.states.size() > std::numeric_limits<std::size_t>::max() - total)
            {
                return std::numeric_limits<std::size_t>::max();
            }
            total += clip.states.size();
        }
        return total;
    }

    const T* at(int globalFrame) const noexcept
    {
        if (globalFrame < scopeStart_ || globalFrame > scopeEnd_)
        {
            return nullptr;
        }

        for (auto clip = clips_.rbegin(); clip != clips_.rend(); ++clip)
        {
            if (clip->contains(globalFrame))
            {
                return &clip->at(globalFrame);
            }
        }
        return nullptr;
    }

    StoryClipBuilder<T> clip(std::vector<T> states)
    {
        return StoryClipBuilder<T>(*this, std::move(states));
    }

    StoryClipBuilder<T> clip(std::initializer_list<T> states)
    {
        return clip(std::vector<T>(states));
    }

private:
    struct AuthoredClip
    {
        AuthoredClip(
            int clipStart,
            int scopeEnd,
            std::vector<T> sourceStates,
            int repeatFrames,
            std::optional<int> requestedDuration,
            bool shouldHold)
            : startFrame(clipStart),
              states(std::move(sourceStates)),
              framesPerStep(repeatFrames),
              duration(requestedDuration),
              holdLast(shouldHold)
        {
            if (states.empty())
            {
                throw std::invalid_argument("An authored clip requires source states");
            }
            if (states.size() > std::numeric_limits<std::size_t>::max()
                / static_cast<std::size_t>(framesPerStep))
            {
                throw std::length_error("Clip repetition exceeds the supported size");
            }

            repeatedStateCount = states.size() * static_cast<std::size_t>(framesPerStep);
            authoredDuration = duration.has_value()
                ? static_cast<std::size_t>(*duration)
                : repeatedStateCount;

            const long long naturalEnd = static_cast<long long>(startFrame)
                + static_cast<long long>(std::min<std::size_t>(
                    authoredDuration - 1,
                    static_cast<std::size_t>(std::numeric_limits<int>::max())
                ));
            endFrame = holdLast
                ? scopeEnd
                : static_cast<int>(std::min<long long>(scopeEnd, naturalEnd));
        }

        bool contains(int globalFrame) const noexcept
        {
            return globalFrame >= startFrame && globalFrame <= endFrame;
        }

        const T& at(int globalFrame) const noexcept
        {
            const std::size_t localFrame = static_cast<std::size_t>(globalFrame - startFrame);
            if (localFrame >= authoredDuration)
            {
                return states.back();
            }

            std::size_t repeatedIndex = localFrame;
            if (duration.has_value() && authoredDuration > 1 && repeatedStateCount > 1)
            {
                const long double scaled = static_cast<long double>(localFrame)
                    * static_cast<long double>(repeatedStateCount - 1)
                    / static_cast<long double>(authoredDuration - 1);
                repeatedIndex = static_cast<std::size_t>(std::llround(scaled));
            }
            repeatedIndex = std::min(repeatedIndex, repeatedStateCount - 1);
            const std::size_t sourceIndex = std::min(
                repeatedIndex / static_cast<std::size_t>(framesPerStep),
                states.size() - 1
            );
            return states[sourceIndex];
        }

        int startFrame = 0;
        int endFrame = 0;
        std::vector<T> states;
        int framesPerStep = 1;
        std::optional<int> duration;
        bool holdLast = false;
        std::size_t repeatedStateCount = 0;
        std::size_t authoredDuration = 0;
    };

    void addAuthoredClip(
        int globalStart,
        std::vector<T> states,
        int framesPerStep,
        std::optional<int> duration,
        bool holdLast)
    {
        clips_.emplace_back(
            globalStart,
            scopeEnd_,
            std::move(states),
            framesPerStep,
            duration,
            holdLast
        );
    }

    friend class StoryClipBuilder<T>;

    std::string name_;
    int scopeStart_ = 0;
    int scopeEnd_ = 0;
    std::vector<AuthoredClip> clips_;
};
}

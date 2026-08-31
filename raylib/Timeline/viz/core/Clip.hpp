#pragma once

#include <cstddef>
#include <limits>
#include <stdexcept>
#include <utility>
#include <vector>

namespace viz
{
template<typename T>
class Clip
{
public:
    explicit Clip(int startFrame)
        : startFrame_(startFrame)
    {
        if (startFrame < 0)
        {
            throw std::invalid_argument("Clip start frame must be non-negative");
        }
    }

    void addFrame(const T& state)
    {
        ensureFrameFits();
        frames_.push_back(state);
    }

    void addFrame(T&& state)
    {
        ensureFrameFits();
        frames_.push_back(std::move(state));
    }

    std::size_t size() const noexcept
    {
        return frames_.size();
    }

    bool empty() const noexcept
    {
        return frames_.empty();
    }

    int startFrame() const noexcept
    {
        return startFrame_;
    }

    int endFrame() const noexcept
    {
        if (frames_.empty())
        {
            return startFrame_ - 1;
        }
        return startFrame_ + static_cast<int>(frames_.size() - 1);
    }

    bool contains(int globalFrame) const noexcept
    {
        return !frames_.empty()
            && globalFrame >= startFrame_
            && globalFrame <= endFrame();
    }

    const T& at(int globalFrame) const
    {
        if (!contains(globalFrame))
        {
            throw std::out_of_range("Global frame is outside this clip");
        }

        return frames_[static_cast<std::size_t>(globalFrame - startFrame_)];
    }

private:
    void ensureFrameFits() const
    {
        const std::size_t maximumFrameCount = static_cast<std::size_t>(
            std::numeric_limits<int>::max() - startFrame_
        ) + 1;

        if (frames_.size() >= maximumFrameCount)
        {
            throw std::length_error("Clip frame range exceeds the supported global frame range");
        }
    }

    int startFrame_ = 0;
    std::vector<T> frames_;
};
}

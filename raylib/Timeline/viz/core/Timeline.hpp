#pragma once

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace viz
{
class Timeline
{
public:
    Timeline(int lastFrame, float fps)
        : lastFrame_(lastFrame), fps_(fps)
    {
        if (lastFrame < 0)
        {
            throw std::invalid_argument("Timeline last frame must be non-negative");
        }
        if (!std::isfinite(fps) || fps <= 0.0f)
        {
            throw std::invalid_argument("Timeline FPS must be positive and finite");
        }
    }

    int frame() const noexcept
    {
        return currentFrame_;
    }

    int lastFrame() const noexcept
    {
        return lastFrame_;
    }

    float fps() const noexcept
    {
        return fps_;
    }

    bool isPlaying() const noexcept
    {
        return playing_;
    }

    void play() noexcept
    {
        playing_ = currentFrame_ < lastFrame_;
    }

    void pause() noexcept
    {
        playing_ = false;
    }

    void togglePlay() noexcept
    {
        if (playing_)
        {
            pause();
        }
        else
        {
            play();
        }
    }

    void next() noexcept
    {
        accumulator_ = 0.0;
        if (currentFrame_ < lastFrame_)
        {
            ++currentFrame_;
        }
        if (currentFrame_ == lastFrame_)
        {
            playing_ = false;
        }
    }

    void previous() noexcept
    {
        accumulator_ = 0.0;
        if (currentFrame_ > 0)
        {
            --currentFrame_;
        }
    }

    void goTo(int frame) noexcept
    {
        currentFrame_ = std::clamp(frame, 0, lastFrame_);
        accumulator_ = 0.0;
        if (currentFrame_ == lastFrame_)
        {
            playing_ = false;
        }
    }

    void reset() noexcept
    {
        currentFrame_ = 0;
        accumulator_ = 0.0;
    }

    void updatePlayback(float dt)
    {
        if (!std::isfinite(dt) || dt < 0.0f)
        {
            throw std::invalid_argument("Timeline delta time must be non-negative and finite");
        }
        if (!playing_)
        {
            return;
        }

        accumulator_ += static_cast<double>(dt);
        const double secondsPerFrame = 1.0 / static_cast<double>(fps_);

        const double readyFrames = std::floor(accumulator_ / secondsPerFrame);
        if (readyFrames >= 1.0)
        {
            const int remainingFrames = lastFrame_ - currentFrame_;
            const int framesToAdvance = readyFrames >= static_cast<double>(remainingFrames)
                ? remainingFrames
                : static_cast<int>(readyFrames);
            currentFrame_ += framesToAdvance;
            accumulator_ -= static_cast<double>(framesToAdvance) * secondsPerFrame;
        }

        if (currentFrame_ == lastFrame_)
        {
            playing_ = false;
            accumulator_ = 0.0;
        }
    }

private:
    int currentFrame_ = 0;
    int lastFrame_ = 0;
    float fps_ = 60.0f;
    double accumulator_ = 0.0;
    bool playing_ = false;
};
}

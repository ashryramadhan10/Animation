#pragma once

#include "viz/core/Clip.hpp"

#include <cstddef>
#include <utility>
#include <vector>

namespace viz
{
template<typename T>
class Track
{
public:
    void addClip(const Clip<T>& clip)
    {
        clips_.push_back(clip);
    }

    void addClip(Clip<T>&& clip)
    {
        clips_.push_back(std::move(clip));
    }

    std::size_t size() const noexcept
    {
        return clips_.size();
    }

    bool empty() const noexcept
    {
        return clips_.empty();
    }

    const T* at(int frame) const noexcept
    {
        for (auto clip = clips_.rbegin(); clip != clips_.rend(); ++clip)
        {
            if (clip->contains(frame))
            {
                return &clip->at(frame);
            }
        }

        return nullptr;
    }

private:
    std::vector<Clip<T>> clips_;
};
}

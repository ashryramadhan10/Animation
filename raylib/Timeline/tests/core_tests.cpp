#include "viz/core/Clip.hpp"
#include "viz/core/Timeline.hpp"
#include "viz/core/Track.hpp"

#include <exception>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>

namespace
{
int failures = 0;

void check(bool condition, const std::string& message)
{
    if (!condition)
    {
        std::cerr << "FAIL: " << message << '\n';
        ++failures;
    }
}

template<typename Exception, typename Function>
void checkThrows(Function&& function, const std::string& message)
{
    try
    {
        function();
        check(false, message);
    }
    catch (const Exception&)
    {
    }
    catch (...)
    {
        check(false, message + " (wrong exception type)");
    }
}

void testTimelineConstructionAndSeeking()
{
    viz::Timeline timeline(10, 2.0f);

    check(timeline.frame() == 0, "Timeline starts at frame zero");
    check(timeline.lastFrame() == 10, "Timeline exposes its last frame");
    check(timeline.fps() == 2.0f, "Timeline exposes its playback FPS");
    check(!timeline.isPlaying(), "Timeline starts paused");

    timeline.goTo(5);
    check(timeline.frame() == 5, "goTo seeks to an in-range frame");
    timeline.goTo(-100);
    check(timeline.frame() == 0, "goTo clamps below the first frame");
    timeline.goTo(100);
    check(timeline.frame() == 10, "goTo clamps above the last frame");

    checkThrows<std::invalid_argument>(
        [] { viz::Timeline invalid(-1, 60.0f); },
        "Timeline rejects a negative last frame"
    );
    checkThrows<std::invalid_argument>(
        [] { viz::Timeline invalid(10, 0.0f); },
        "Timeline rejects zero FPS"
    );
}

void testTimelineManualControls()
{
    viz::Timeline timeline(2, 60.0f);

    timeline.next();
    check(timeline.frame() == 1, "next advances one frame");
    timeline.next();
    timeline.next();
    check(timeline.frame() == 2, "next stops at the last frame");
    timeline.previous();
    check(timeline.frame() == 1, "previous moves back one frame");
    timeline.previous();
    timeline.previous();
    check(timeline.frame() == 0, "previous stops at frame zero");

    timeline.play();
    check(timeline.isPlaying(), "play starts playback");
    timeline.pause();
    check(!timeline.isPlaying(), "pause stops playback");
    timeline.togglePlay();
    check(timeline.isPlaying(), "togglePlay starts paused playback");
    timeline.togglePlay();
    check(!timeline.isPlaying(), "togglePlay pauses active playback");

    timeline.goTo(2);
    timeline.reset();
    check(timeline.frame() == 0, "reset returns to frame zero");
}

void testTimelinePlayback()
{
    viz::Timeline timeline(4, 2.0f);
    timeline.play();

    timeline.updatePlayback(0.25f);
    check(timeline.frame() == 0, "partial frame time does not advance playback");
    timeline.updatePlayback(0.25f);
    check(timeline.frame() == 1, "accumulated frame time advances once");
    timeline.updatePlayback(1.0f);
    check(timeline.frame() == 3, "large updates advance the exact frame count");
    timeline.updatePlayback(1.0f);
    check(timeline.frame() == 4, "playback clamps at the last frame");
    check(!timeline.isPlaying(), "playback pauses at the last frame");

    checkThrows<std::invalid_argument>(
        [&timeline] { timeline.updatePlayback(-0.1f); },
        "Timeline rejects negative delta time"
    );
}

void testClip()
{
    viz::Clip<int> clip(30);

    check(clip.empty(), "A new clip is empty");
    check(clip.size() == 0, "A new clip has zero frames");
    check(clip.startFrame() == 30, "Clip exposes its global start frame");
    check(clip.endFrame() == 29, "An empty clip ends before it starts");
    check(!clip.contains(30), "An empty clip contains no frame");
    checkThrows<std::out_of_range>(
        [&clip] { static_cast<void>(clip.at(30)); },
        "An empty clip rejects frame access"
    );

    clip.addFrame(10);
    clip.addFrame(20);
    clip.addFrame(30);

    check(!clip.empty(), "A populated clip is not empty");
    check(clip.size() == 3, "Clip reports its sample count");
    check(clip.endFrame() == 32, "Clip computes its inclusive end frame");
    check(!clip.contains(29), "Clip excludes frames before its start");
    check(clip.contains(30) && clip.contains(32), "Clip includes both boundaries");
    check(!clip.contains(33), "Clip excludes frames after its end");
    check(clip.at(30) == 10 && clip.at(32) == 30, "Clip maps global frames to local samples");
    checkThrows<std::out_of_range>(
        [&clip] { static_cast<void>(clip.at(29)); },
        "Clip rejects access before its start"
    );

    checkThrows<std::invalid_argument>(
        [] { viz::Clip<int> invalid(-1); },
        "Clip rejects a negative start frame"
    );

    viz::Clip<int> finalFrameClip(std::numeric_limits<int>::max());
    finalFrameClip.addFrame(1);
    check(finalFrameClip.endFrame() == std::numeric_limits<int>::max(),
          "A clip can contain the final representable frame");
    checkThrows<std::length_error>(
        [&finalFrameClip] { finalFrameClip.addFrame(2); },
        "Clip rejects a sample range that would overflow global frames"
    );
}

void testTrack()
{
    viz::Track<int> track;
    check(track.empty(), "A new track is empty");
    check(track.at(0) == nullptr, "An empty track has no state");

    viz::Clip<int> first(2);
    first.addFrame(20);
    first.addFrame(21);
    first.addFrame(22);
    track.addClip(first);

    check(track.size() == 1, "Track reports its clip count");
    check(track.at(1) == nullptr, "Track is absent before its clip");
    check(track.at(2) != nullptr && *track.at(2) == 20, "Track resolves a clip sample");

    viz::Clip<int> overlay(3);
    overlay.addFrame(99);
    track.addClip(overlay);

    check(track.at(3) != nullptr && *track.at(3) == 99, "Later overlapping clips take precedence");
    check(track.at(4) != nullptr && *track.at(4) == 22, "Earlier clip resumes outside the overlap");
    check(track.at(5) == nullptr, "Track is absent after all clips");
}
}

int main()
{
    testTimelineConstructionAndSeeking();
    testTimelineManualControls();
    testTimelinePlayback();
    testClip();
    testTrack();

    if (failures != 0)
    {
        std::cerr << failures << " test assertion(s) failed\n";
        return 1;
    }

    std::cout << "All Timeline core tests passed\n";
    return 0;
}

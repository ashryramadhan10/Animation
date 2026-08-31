#include "viz/story/Storyboard.hpp"

#include <cmath>
#include <exception>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

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

bool nearlyEqual(float lhs, float rhs)
{
    return std::fabs(lhs - rhs) < 0.0001f;
}

void testFluentSampledClips()
{
    viz::Storyboard storyboard(20, 10.0f);
    auto& events = storyboard.track<int>("Events");

    events.clip({10, 20, 30})
        .startAt(2)
        .framesPerStep(2)
        .holdLast()
        .commit();

    check(events.name() == "Events", "A sampled track keeps its editor name");
    check(events.at(1) == nullptr, "A placed clip is absent before its start");
    check(events.at(2) != nullptr && *events.at(2) == 10, "framesPerStep starts with the first state");
    check(events.at(3) != nullptr && *events.at(3) == 10, "framesPerStep repeats a state");
    check(events.at(4) != nullptr && *events.at(4) == 20, "framesPerStep advances after its repeat count");
    check(events.at(7) != nullptr && *events.at(7) == 30, "framesPerStep includes the final repeated state");
    check(events.at(20) != nullptr && *events.at(20) == 30, "holdLast extends to the track boundary");
    check(events.storedStateCount() == 3,
          "Video timing does not duplicate the stored algorithm states");

    auto& sameEvents = storyboard.track<int>("Events");
    check(&sameEvents == &events, "A named track can be retrieved again");
    checkThrows<std::logic_error>(
        [&storyboard] { static_cast<void>(storyboard.track<float>("Events")); },
        "A track name cannot be reused with another state type"
    );
}

void testTrimAndDuration()
{
    viz::Storyboard storyboard(20, 60.0f);
    auto& values = storyboard.track<int>("Trimmed values");

    values.clip({0, 1, 2, 3, 4})
        .trim(1, 4)
        .duration(5)
        .commit();

    const std::vector<int> expected = {1, 2, 2, 3, 3};
    for (int frame = 0; frame < static_cast<int>(expected.size()); ++frame)
    {
        check(values.at(frame) != nullptr && *values.at(frame) == expected[static_cast<std::size_t>(frame)],
              "duration resamples the trimmed clip across its requested length");
    }

    auto builder = values.clip({9});
    builder.startAt(10).commit();
    checkThrows<std::logic_error>(
        [&builder] { builder.commit(); },
        "A clip builder cannot be committed twice"
    );

    checkThrows<std::invalid_argument>(
        [&values] { values.clip({1, 2}).trim(1, 1).commit(); },
        "Clip trimming rejects an empty source range"
    );
}

void testSequencesAndMarkers()
{
    viz::Storyboard storyboard(30, 60.0f);
    const auto search = storyboard.sequence("Search", 5, 10);
    auto& visited = search.track<int>("Visited nodes");

    visited.clip({1, 2})
        .startAt(2)
        .framesPerStep(2)
        .holdLast()
        .commit();

    check(search.startFrame() == 5 && search.endFrame() == 14, "A sequence maps to a global frame range");
    check(visited.name() == "Search/Visited nodes", "Sequence tracks receive qualified names");
    check(visited.at(6) == nullptr, "A sequence clip uses local start frames");
    check(visited.at(7) != nullptr && *visited.at(7) == 1, "A sequence maps local clips into global frames");
    check(visited.at(14) != nullptr && *visited.at(14) == 2, "Sequence holdLast ends at the sequence boundary");
    check(visited.at(15) == nullptr, "A sequence track is absent outside its boundary");

    const auto relaxation = search.sequence("Relaxation", 3, 4);
    check(relaxation.name() == "Search/Relaxation", "Sequences can be nested and qualified");
    check(relaxation.startFrame() == 8 && relaxation.endFrame() == 11,
          "Nested sequences map local ranges into global frames");

    auto& edges = relaxation.track<int>("Edges");
    edges.clip({42}).holdLast().commit();
    check(edges.at(8) != nullptr && *edges.at(8) == 42, "A nested sequence owns scoped tracks");
    check(edges.at(12) == nullptr, "Nested sequence tracks stop at their boundary");

    storyboard.marker(0, "Intro");
    search.marker(3, "Current node");
    check(storyboard.findMarker("Intro").value_or(-1) == 0, "Storyboard markers use global frames");
    check(storyboard.findMarker("Search/Current node").value_or(-1) == 8,
          "Sequence markers map local frames and qualify their names");

    const auto markers = storyboard.markersAt(8);
    check(markers.size() == 1 && markers.front().name == "Search/Current node",
          "markersAt returns exact-frame editor markers");

    checkThrows<std::invalid_argument>(
        [&storyboard] { static_cast<void>(storyboard.sequence("Invalid", -1, 2)); },
        "A sequence cannot begin before the storyboard"
    );
    checkThrows<std::invalid_argument>(
        [&search] { static_cast<void>(search.sequence("Too long", 9, 2)); },
        "A nested sequence cannot exceed its parent"
    );
}

void testKeyframesAndFades()
{
    viz::Storyboard storyboard(20, 60.0f);
    auto& opacity = storyboard.opacity("Curve opacity");

    opacity.fadeIn(2, 4).fadeOut(10, 2);

    check(nearlyEqual(opacity.at(0).value_or(-1.0f), 0.0f), "Opacity holds its first keyframe backward");
    check(nearlyEqual(opacity.at(2).value_or(-1.0f), 0.0f), "fadeIn starts transparent");
    check(nearlyEqual(opacity.at(4).value_or(-1.0f), 0.5f), "fadeIn uses ease-in-out interpolation");
    check(nearlyEqual(opacity.at(6).value_or(-1.0f), 1.0f), "fadeIn ends opaque");
    check(nearlyEqual(opacity.at(11).value_or(-1.0f), 0.5f), "fadeOut interpolates toward transparent");
    check(nearlyEqual(opacity.at(20).value_or(-1.0f), 0.0f), "Opacity holds its final keyframe forward");

    auto& stepped = storyboard.keyframes<float>("Step property");
    stepped.keyframe(0, 1.0f, viz::Easing::Step).keyframe(10, 3.0f);
    check(nearlyEqual(stepped.at(5).value_or(-1.0f), 1.0f), "Step easing holds the previous keyframe");
    check(nearlyEqual(stepped.at(10).value_or(-1.0f), 3.0f), "Step easing reaches the next keyframe exactly");

    struct Point
    {
        float x;
        float y;
    };

    const auto movement = storyboard.sequence("Movement", 5, 6);
    auto& position = movement.keyframes<Point>(
        "Position",
        [](const Point& from, const Point& to, float alpha)
        {
            return Point{
                from.x + (to.x - from.x) * alpha,
                from.y + (to.y - from.y) * alpha
            };
        }
    );
    position.keyframe(0, {0.0f, 0.0f}, viz::Easing::EaseInOut)
        .keyframe(4, {8.0f, 4.0f});

    const auto middle = position.at(7);
    check(middle.has_value() && nearlyEqual(middle->x, 4.0f) && nearlyEqual(middle->y, 2.0f),
          "Custom keyframe interpolation works in sequence-local frames");
    check(!position.at(4).has_value() && !position.at(11).has_value(),
          "Keyframe tracks are absent outside their sequence");

    try
    {
        viz::Storyboard maximumStoryboard(std::numeric_limits<int>::max(), 60.0f);
        auto& maximumOpacity = maximumStoryboard.opacity("Maximum range opacity");
        maximumOpacity.keyframe(0, 0.0f).keyframe(std::numeric_limits<int>::max(), 1.0f);
        check(nearlyEqual(maximumOpacity.at(std::numeric_limits<int>::max()).value_or(-1.0f), 1.0f),
              "Keyframes support the complete non-negative int frame range");
    }
    catch (...)
    {
        check(false, "Keyframes support the complete non-negative int frame range");
    }
}

void testStoryboardPlaybackFacade()
{
    viz::Storyboard storyboard(2, 2.0f);
    storyboard.play();
    storyboard.update(0.5f);
    check(storyboard.frame() == 1, "Storyboard forwards deterministic playback");
    storyboard.next();
    check(storyboard.frame() == 2 && !storyboard.isPlaying(), "Storyboard forwards manual stepping");
    storyboard.reset();
    check(storyboard.frame() == 0, "Storyboard forwards reset");
}
}

int main()
{
    testFluentSampledClips();
    testTrimAndDuration();
    testSequencesAndMarkers();
    testKeyframesAndFades();
    testStoryboardPlaybackFacade();

    if (failures != 0)
    {
        std::cerr << failures << " storyboard test assertion(s) failed\n";
        return 1;
    }

    std::cout << "All Storyboard tests passed\n";
    return 0;
}

#include "viz/plot/Plot2D.hpp"

#include <cmath>
#include <exception>
#include <iostream>
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

bool nearlyEqual(float lhs, float rhs)
{
    return std::fabs(lhs - rhs) < 0.0001f;
}
}

int main()
{
    const viz::Plot2D plot({10.0f, 20.0f, 200.0f, 100.0f}, {-1.0f, 1.0f}, {-2.0f, 2.0f});

    const Vector2 bottomLeft = plot.toScreen({-1.0f, -2.0f});
    check(nearlyEqual(bottomLeft.x, 10.0f) && nearlyEqual(bottomLeft.y, 120.0f),
          "Plot2D maps the lower-left world corner");

    const Vector2 topRight = plot.toScreen({1.0f, 2.0f});
    check(nearlyEqual(topRight.x, 210.0f) && nearlyEqual(topRight.y, 20.0f),
          "Plot2D maps the upper-right world corner");

    check(viz::Plot2D::countGridLines({-2.0f, 2.0f}, 1.0f) == 5,
          "Grid line counting includes both aligned boundaries");
    check(viz::Plot2D::countGridLines({0.0f, 1.0f}, 0.25f) == 5,
          "Grid line counting supports fractional steps");
    checkThrows<std::invalid_argument>(
        [] { static_cast<void>(viz::Plot2D::countGridLines({0.0f, 1.0f}, 0.0f)); },
        "Grid line counting rejects a zero step"
    );
    checkThrows<std::length_error>(
        [] { static_cast<void>(viz::Plot2D::countGridLines({0.0f, 1.0f}, 0.000001f)); },
        "Grid line counting rejects an impractical line count"
    );

    if (failures != 0)
    {
        std::cerr << failures << " plot test assertion(s) failed\n";
        return 1;
    }

    std::cout << "All Plot2D tests passed\n";
    return 0;
}

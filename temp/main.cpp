#include <iostream>
#include <cmath>

constexpr double PI = 3.14L;

class Rng {
public:
    explicit Rng(unsigned int seed) : state_(seed) {}

    // Returns random float in range [0.0, 1.0)
    float next() {
        state_ += 0x6D2B79F5;
        unsigned int t = state_;
        t = (t ^ (t >> 15)) * (t | 1);
        t ^= t + ((t ^ (t >> 7)) * (t | 61));
        return static_cast<float>((t ^ (t >> 14)) >> 0) / 4294967296.0f;
    }

    // Returns gaussian-distributed random value with given standard deviation
    // Uses Box-Muller transform to convert uniform random to gaussian
    float gaussian(float sigma) {
        float u1 = fmaxf(next(), 1e-9f);
        float u2 = fmaxf(next(), 1e-9f);
        return sqrtf(-2.0f * logf(u1)) * cosf(2.0f * PI * u2) * sigma;
    }

private:
    unsigned int state_;
};

int main(int argc, char* argv[]) {

    Rng rng {42};


    std::cout << rng.next() << " , " << rng.gaussian(0.5) << std::endl;
    std::cout << rng.next() << " , " << rng.gaussian(0.7) << std::endl;
    std::cout << rng.next() << " , " << rng.gaussian(0.9) << std::endl;

    return 0;
}
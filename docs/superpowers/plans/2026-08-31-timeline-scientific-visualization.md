# Timeline Scientific Visualization Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic C++17 timeline framework with reusable core types, Raylib 2D/3D plotting helpers, two runnable examples, CMake integration, and dependency-free core tests.

**Architecture:** Header-defined core templates remain independent of Raylib. Raylib types and drawing calls live in the math, plot, visual, and example layers. Every visual resolves its state from one global frame, so seeking is deterministic.

**Tech Stack:** C++17, Raylib 6-compatible API, CMake 3.15+, CTest, standard-library test harness.

---

## File Map

- `raylib/Timeline/viz/core/Timeline.hpp`: validated playhead and real-time playback conversion.
- `raylib/Timeline/viz/core/Clip.hpp`: global-frame-addressed sampled state storage.
- `raylib/Timeline/viz/core/Track.hpp`: multiple-clip resolution with latest clip precedence.
- `raylib/Timeline/viz/math/Functions.hpp`: sine, cosine, and helix samples.
- `raylib/Timeline/viz/plot/Range.hpp`: numeric plot range.
- `raylib/Timeline/viz/plot/Plot2D.hpp`: world-to-screen mapping, grid, axes, and viewport border.
- `raylib/Timeline/viz/plot/Plot3D.hpp`: camera, grid, and 3D axes.
- `raylib/Timeline/viz/visual/CurveFrame.hpp`: frame-resolved curve visibility style.
- `raylib/Timeline/viz/visual/Curve2D.hpp`: 2D line/point renderer.
- `raylib/Timeline/viz/visual/Curve3D.hpp`: 3D line/point renderer.
- `raylib/Timeline/viz/visual/Marker2D.hpp`: exact 2D position renderer.
- `raylib/Timeline/viz/visual/Marker3D.hpp`: exact 3D position renderer.
- `raylib/Timeline/examples/sine_cosine_2d.cpp`: synchronized 2D demonstration.
- `raylib/Timeline/examples/sine_cosine_3d.cpp`: synchronized helix demonstration.
- `raylib/Timeline/tests/core_tests.cpp`: core behavior tests.
- `raylib/Timeline/CMakeLists.txt`: tests and optional Raylib examples.
- Remove `timeline.cpp`, `clip.cpp`, `track.cpp`, and `plot2d.cpp` after their code is replaced by the structured headers.

### Task 1: Timeline Core

**Files:**
- Create: `raylib/Timeline/tests/core_tests.cpp`
- Create: `raylib/Timeline/viz/core/Timeline.hpp`

- [ ] **Step 1: Write failing timeline tests**

Create a tiny test harness with `check(bool, const char*)` and tests that construct `viz::Timeline(10, 2.0f)`. Assert initial state, frame clamping through `goTo(-1)` and `goTo(99)`, `next`, `previous`, reset, play/pause/toggle, `updatePlayback(0.49f)` not advancing, a following `0.01f` advancing once, a `1.0f` update advancing twice, and playback pausing at frame 10. Assert `std::invalid_argument` for negative final frame, zero FPS, and negative `dt`.

- [ ] **Step 2: Add a tests-only CMake target and verify RED**

Create the initial `raylib/Timeline/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.15)
project(TimelineVisualization LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
include(CTest)
add_executable(timeline_core_tests tests/core_tests.cpp)
target_include_directories(timeline_core_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
add_test(NAME timeline_core_tests COMMAND timeline_core_tests)
```

Run:

```powershell
cmake -S raylib/Timeline -B raylib/Timeline/build-core -DTIMELINE_BUILD_EXAMPLES=OFF
cmake --build raylib/Timeline/build-core
```

Expected: compilation fails because `viz/core/Timeline.hpp` does not exist.

- [ ] **Step 3: Implement Timeline minimally**

Implement `viz::Timeline` with constructor validation, accessors `frame()`, `lastFrame()`, `fps()`, and `isPlaying()`, playback controls, clamped `goTo`, manual step/reset operations that clear the accumulator, and `updatePlayback(float dt)`. Reject negative `dt`, advance by `floor(accumulator / secondsPerFrame)`, clamp at `lastFrame`, and pause/clear the accumulator at the end.

- [ ] **Step 4: Verify GREEN**

Run the configure/build commands and:

```powershell
ctest --test-dir raylib/Timeline/build-core --output-on-failure
```

Expected: `100% tests passed`.

- [ ] **Step 5: Commit**

```powershell
git add raylib/Timeline/CMakeLists.txt raylib/Timeline/tests/core_tests.cpp raylib/Timeline/viz/core/Timeline.hpp
git commit -m "feat: add deterministic timeline core"
```

### Task 2: Clip and Track Core

**Files:**
- Modify: `raylib/Timeline/tests/core_tests.cpp`
- Create: `raylib/Timeline/viz/core/Clip.hpp`
- Create: `raylib/Timeline/viz/core/Track.hpp`

- [ ] **Step 1: Write failing Clip and Track tests**

Add tests that verify an empty `viz::Clip<int>(30)` has `size() == 0`, has `endFrame() == 29`, contains no frames, and rejects `at(30)`. Add three values, then verify `[30, 32]` boundaries and exact values. Verify negative clip start construction is rejected. For `viz::Track<int>`, verify missing frames return `nullptr`, an added clip resolves its values, and a later-added overlapping clip wins.

- [ ] **Step 2: Verify RED**

Run:

```powershell
cmake --build raylib/Timeline/build-core
```

Expected: compilation fails because `Clip.hpp` and `Track.hpp` do not exist.

- [ ] **Step 3: Implement Clip and Track minimally**

Implement `viz::Clip<T>` with a non-negative start frame, `addFrame`, `size`, `empty`, `startFrame`, empty-safe `endFrame`, `contains`, and checked `at`. Implement `viz::Track<T>` with `addClip`, `size`, `empty`, and reverse-order lookup returning `const T*` or `nullptr`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
cmake --build raylib/Timeline/build-core
ctest --test-dir raylib/Timeline/build-core --output-on-failure
```

Expected: `timeline_core_tests` passes.

- [ ] **Step 5: Commit**

```powershell
git add raylib/Timeline/tests/core_tests.cpp raylib/Timeline/viz/core/Clip.hpp raylib/Timeline/viz/core/Track.hpp
git commit -m "feat: add sampled clips and tracks"
```

### Task 3: Mathematical Data and Plotting

**Files:**
- Create: `raylib/Timeline/viz/math/Functions.hpp`
- Create: `raylib/Timeline/viz/plot/Range.hpp`
- Create: `raylib/Timeline/viz/plot/Plot2D.hpp`
- Create: `raylib/Timeline/viz/plot/Plot3D.hpp`

- [ ] **Step 1: Add mathematical sample generation**

Define `viz::math::pi`, validate `samples >= 2`, and implement `makeSinCurve`, `makeCosCurve`, and `makeSinCosHelix`. Return `std::vector<Vector2>` for 2D functions and `std::vector<Vector3>` for the helix. Interpolate the independent variable across inclusive `[-2*pi, 2*pi]` and evaluate `std::sin`/`std::cos`.

- [ ] **Step 2: Add Plot2D**

Define `viz::Range { float min; float max; }`. Implement a `viz::Plot2D` constructor that rejects non-positive viewport dimensions and non-increasing ranges. Provide `toScreen`, `drawGrid(xStep, yStep)`, and `drawBorder`. Reject non-positive grid steps. Draw light grid lines, darker zero axes when visible, and a border around the viewport.

- [ ] **Step 3: Add Plot3D**

Implement a default camera at `{10, 7, 10}` targeting the origin with perspective projection. Expose `const Camera3D& camera() const`, `drawGrid(int slices = 20, float spacing = 1.0f)`, and `drawAxes()`. Validate positive grid arguments and draw X/Y/Z as red/green/blue lines.

- [ ] **Step 4: Compile through a temporary syntax target**

Add the headers to the example targets introduced in Task 5 and rely on those compilation units for syntax coverage. Before Task 5, inspect the files for complete includes and namespaces.

- [ ] **Step 5: Commit**

```powershell
git add raylib/Timeline/viz/math raylib/Timeline/viz/plot
git commit -m "feat: add mathematical plots"
```

### Task 4: Visual Render Helpers

**Files:**
- Create: `raylib/Timeline/viz/visual/CurveFrame.hpp`
- Create: `raylib/Timeline/viz/visual/Curve2D.hpp`
- Create: `raylib/Timeline/viz/visual/Curve3D.hpp`
- Create: `raylib/Timeline/viz/visual/Marker2D.hpp`
- Create: `raylib/Timeline/viz/visual/Marker3D.hpp`

- [ ] **Step 1: Define shared curve state**

Create `viz::CurveFrame` with `int visiblePoints`, `bool drawLine`, and `bool drawPoints`, using defaults of zero/false.

- [ ] **Step 2: Implement curve renderers**

Implement `drawCurve2D(const Plot2D&, const std::vector<Vector2>&, const CurveFrame&, Color)` and `drawCurve3D(const std::vector<Vector3>&, const CurveFrame&, Color)`. Clamp the visible count into `[0, points.size()]`. Draw adjacent segments when `drawLine` is true and points/circles when `drawPoints` is true; use every fourth 3D point for spheres to control draw cost.

- [ ] **Step 3: Implement exact marker renderers**

Implement `drawMarker2D(const Plot2D&, Vector2, float, Color)` using `Plot2D::toScreen` and `DrawCircleV`. Implement `drawMarker3D(Vector3, float, Color)` using `DrawSphere`. Reject non-positive radii.

- [ ] **Step 4: Commit**

```powershell
git add raylib/Timeline/viz/visual
git commit -m "feat: add curve and marker renderers"
```

### Task 5: Runnable Examples and Raylib Build

**Files:**
- Modify: `raylib/Timeline/CMakeLists.txt`
- Create: `raylib/Timeline/examples/sine_cosine_2d.cpp`
- Create: `raylib/Timeline/examples/sine_cosine_3d.cpp`
- Delete: `raylib/Timeline/timeline.cpp`
- Delete: `raylib/Timeline/clip.cpp`
- Delete: `raylib/Timeline/track.cpp`
- Delete: `raylib/Timeline/plot2d.cpp`

- [ ] **Step 1: Write the 2D example**

Create 240 sine/cosine samples. Build sine and marker clips starting at frame 30 and cosine at frame 90. Use `CurveFrame{i, true, false}` for sine and `{i, false, true}` for cosine. Render a responsive plot, grid, progressive curves, exact sine marker, frame text, timeline track labels, and controls. Map `Space`, left/right arrows, and `R` to timeline controls.

- [ ] **Step 2: Write the 3D example**

Create 240 helix samples and matching `CurveFrame` and `Vector3` marker clips starting at frame 30. Draw the Plot3D grid/axes, progressive helix, exact marker, frame text, and the same controls.

- [ ] **Step 3: Extend CMake using the accumulation convention**

Add `option(TIMELINE_BUILD_EXAMPLES "Build the Raylib examples" ON)`. When enabled, initialize `RAYLIB_SRC` from `C:/raylib/raylib/src` on Windows or `$ENV{RAYLIB_PATH}` on Linux unless the cache variable is already set. Require `${RAYLIB_SRC}/raylib.h` and `${RAYLIB_SRC}/libraylib.a`, import Raylib, create `timeline_2d` and `timeline_3d`, add the project root and Raylib include directories, and link `winmm gdi32 opengl32` on Windows or `GL X11 m` on Linux.

- [ ] **Step 4: Remove obsolete fragments**

Delete the four original standalone `.cpp` fragments only after the structured headers and examples contain all of their behavior.

- [ ] **Step 5: Verify core-only build and tests**

Run:

```powershell
cmake -S raylib/Timeline -B raylib/Timeline/build-core -DTIMELINE_BUILD_EXAMPLES=OFF
cmake --build raylib/Timeline/build-core
ctest --test-dir raylib/Timeline/build-core --output-on-failure
```

Expected: configuration/build succeeds and `100% tests passed`.

- [ ] **Step 6: Verify Raylib examples**

Run:

```powershell
cmake -S raylib/Timeline -B raylib/Timeline/build
cmake --build raylib/Timeline/build
```

Expected: `timeline_2d` and `timeline_3d` link successfully. If the expected Raylib installation is absent, report the exact missing path and retain the successful core-only verification.

- [ ] **Step 7: Commit**

```powershell
git add raylib/Timeline
git commit -m "feat: finish Timeline visualization framework"
```

### Task 6: Final Quality Gate

**Files:**
- Inspect: `raylib/Timeline/**`

- [ ] **Step 1: Re-index the completed code**

Run the codebase-memory indexer for the repository and inspect `raylib/Timeline` architecture to verify the intended core-to-Raylib dependency boundary.

- [ ] **Step 2: Run final tests from a clean build directory**

Configure a fresh core-only build directory, build it, and run CTest with failure output. Configure and build examples when Raylib is available.

- [ ] **Step 3: Inspect scoped Git changes**

Run:

```powershell
git status --short -- raylib/Timeline docs/superpowers
git diff --check HEAD -- raylib/Timeline docs/superpowers
```

Expected: no whitespace errors and only intended Timeline/design/plan files are in scope.

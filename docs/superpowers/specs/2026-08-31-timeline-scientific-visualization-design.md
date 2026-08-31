# Timeline Scientific Visualization Framework Design

## Goal

Turn `raylib/Timeline` from four disconnected proof-of-concept source fragments into a reusable C++17 scientific-animation framework with deterministic frame-based playback, runnable 2D and 3D Raylib demonstrations, and automated tests for the Raylib-independent core.

## Scope

The first version implements the architecture described in `GUIDE.md`:

- `Timeline` owns the global frame and converts elapsed real time into playhead movement.
- `Clip<T>` stores explicit per-frame states beginning at a global start frame.
- `Track<T>` resolves the active state at a global frame, with later-added overlapping clips taking precedence.
- `Plot2D` maps mathematical coordinates to a Raylib viewport and draws grids and axes.
- `Plot3D` owns a camera and draws a grid and colored axes.
- Shared curve state and render helpers support progressive 2D and 3D drawing.
- A 2D example displays progressive sine and cosine curves plus a synchronized sine marker.
- A 3D example displays a progressive sine/cosine helix.

Keyframe interpolation and a graphical timeline editor are future work and are not part of this implementation.

## Architecture

The implementation uses focused headers under `viz/`:

```text
raylib/Timeline/
|-- CMakeLists.txt
|-- viz/
|   |-- core/
|   |   |-- Timeline.hpp
|   |   |-- Clip.hpp
|   |   `-- Track.hpp
|   |-- math/
|   |   `-- Functions.hpp
|   |-- plot/
|   |   |-- Range.hpp
|   |   |-- Plot2D.hpp
|   |   `-- Plot3D.hpp
|   `-- visual/
|       |-- CurveFrame.hpp
|       |-- Curve2D.hpp
|       |-- Curve3D.hpp
|       |-- Marker2D.hpp
|       `-- Marker3D.hpp
|-- examples/
|   |-- sine_cosine_2d.cpp
|   `-- sine_cosine_3d.cpp
`-- tests/
    `-- core_tests.cpp
```

The core headers have no Raylib dependency. Plotting, render helpers, and applications depend on Raylib. Template types remain header-defined so consumers can instantiate them without a separate compilation unit.

## Component Contracts

### Timeline

`Timeline(lastFrame, fps)` validates that the last frame is non-negative and FPS is positive. `goTo` clamps to the valid range. Manual frame changes clear fractional playback time so subsequent playback is predictable. Playback stops at the final frame instead of accumulating unused time. The public API exposes the current frame, final frame, FPS, and playing state alongside play, pause, toggle, next, previous, reset, `goTo`, and elapsed-time update operations.

### Clip and Track

`Clip<T>` owns a start frame and a sequence of immutable-at-read frame values. Empty clips contain no global frame. Checked access rejects frames outside the clip. `Track<T>` stores clips in insertion order and scans in reverse, making the most recently added overlapping clip authoritative. Missing state is represented as `nullptr`, matching the guide.

### Mathematical Data

`Functions.hpp` produces immutable sample vectors for sine, cosine, and the 3D helix over `[-2pi, 2pi]`. Sample generation requires at least two points so both endpoints are well-defined.

### Plotting and Rendering

`Plot2D` validates non-degenerate ranges and a positive viewport, converts world coordinates to screen coordinates with mathematical positive Y pointing upward, and draws grid lines plus zero axes. `Plot3D` provides the guide's default perspective camera, centered grid, and RGB axes. Curve renderers clamp visible point counts to available samples; marker renderers convert or draw exact track positions.

## Runtime Data Flow

Each example owns one `Timeline`. Input changes only the playhead (`Space`, arrows, `R`, plus direct playback updates). Every visible object queries its track using the same global frame. Renderers receive resolved state and immutable mathematical samples; no visual object owns a timer or mutates itself based on elapsed time. Seeking to the same frame therefore produces the same scene.

## Build Design

CMake follows the established `raylib/navigation/accumulation` setup:

- Require CMake 3.15 and C++17.
- Use `C:/raylib/raylib/src` as the default Windows Raylib source directory.
- Use `RAYLIB_PATH` on Linux.
- Permit an explicit `RAYLIB_SRC` cache override.
- Import `libraylib.a` and link the same platform libraries as the accumulation example.
- Build `timeline_2d` and `timeline_3d` when Raylib is available.
- Always build `timeline_core_tests`, which has no Raylib dependency.
- Register core tests with CTest.

Configuration fails with a direct explanation when examples are enabled but the Raylib header or static library is missing. An option allows core-only configuration for environments without Raylib.

## Error Handling

Invalid construction arguments throw `std::invalid_argument`; invalid clip frame access throws `std::out_of_range`. Example applications use only validated constant configuration and keep errors outside the render loop. CMake reports missing Raylib prerequisites during configuration rather than producing obscure compiler or linker failures.

## Testing

The dependency-free test executable uses standard assertions/check helpers and covers:

- timeline clamping, manual stepping, reset, play/pause, deterministic elapsed-time advancement, and final-frame behavior;
- clip boundaries, empty clips, local/global indexing, and rejected out-of-range access;
- track absence, clip resolution, and overlap precedence.

Build verification configures a core-only tree and runs CTest. When the local Raylib installation is present, verification also configures and builds both examples.

## Success Criteria

The work is complete when the folder has the reusable structure above, core tests pass through CTest, both demos compile against the same local Raylib convention used by `navigation/accumulation`, and no implementation relies on observer callbacks, self-updating visual objects, or hidden timers.

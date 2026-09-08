# TF2 p5.js Walkthrough Design

## Purpose

Build a guided p5.js tutorial that teaches the ROS 2 TF2 mental model to a learner who already understands matrix stacks such as p5.js `push()`/`pop()`, OpenGL model matrices, and Raylib transforms.

The tutorial must make TF2 concrete through animation. It will show coordinate frames, transform composition, lookup direction, time, and the standard mobile-robot frame chain rather than presenting TF2 as an API reference.

## Existing Style to Preserve

The walkthrough will extend the visual and code style used in `p5sim/procedural_animation` and `p5sim/agents`:

- dark canvas with sparse white geometry and restrained red, green, and yellow accents;
- small classes representing moving objects or reusable concepts;
- visible vectors, constraints, paths, projections, and other debugging construction;
- direct use of `push()`, `translate()`, `rotate()`, and `pop()` when drawing local frames;
- simple `setup()`/`draw()` orchestration and readable math near its visualization;
- mouse interaction, pause/reset controls, and animated demonstrations.

The existing `p5sim/navigation/tf-logic` example covers one correction-yaw case. The new walkthrough will generalize the subject into a complete learning sequence and will not replace that example.

## Scope

### Included

- ROS 2 TF2 concepts explained through a browser-only p5.js simulation.
- A linear Back/Next walkthrough with a live canvas for every chapter.
- An inspectable TF tree and the mathematical transform chain used for each lookup.
- A complete `map -> odom -> base_link -> sensor` mobile-robot example.
- Static and dynamic transforms, frame authority, timestamps, buffering, interpolation, and common lookup failures.
- A final 3D/WebGL chapter introducing XYZ frames and quaternion-based orientation.
- A free-play sandbox after the guided chapters.
- ROS 2-oriented pseudocode that connects each visual concept to normal TF2 usage.

### Not Included

- A live ROS 2 or rosbridge connection.
- A complete reimplementation of the production TF2 library.
- Networking, URDF parsing, RViz compatibility, or bag-file playback.
- Full 3D rigid-body physics.

## Learning Sequence

The tutorial will use these chapters:

1. **Matrix stack to coordinate frame** — relate nested p5 transforms to a parent/child frame relationship.
2. **Transform, pose, point, and vector** — distinguish a relationship between frames from data expressed in a frame.
3. **Composition and inverse** — show order, chain multiplication, and why reversing a lookup requires an inverse.
4. **The TF tree** — introduce root, parent, child, chain, common ancestor, single-parent rule, disconnected frames, and cycles.
5. **The mobile robot chain** — introduce `map -> odom -> base_link -> laser` and `camera` branches.
6. **Map, odom, and base_link roles** — animate smooth local odometry drift and discontinuous global correction.
7. **Static and dynamic broadcasters** — distinguish rigid sensor mounting from transforms that change over time and identify frame authority.
8. **Lookup direction** — request source-to-target conversions and highlight the exact traversed path and inverse edges.
9. **Stamped data** — transform point and pose samples while keeping `frame_id`, time, and the data payload conceptually separate.
10. **Time and buffering** — demonstrate history, interpolation, latest-common-time behavior, and past/future extrapolation errors.
11. **Complete sensor scenario** — move a robot, observe a landmark in the laser frame, and recover its map-frame position through the full chain.
12. **From SE(2) to SE(3)** — add Z, roll/pitch/yaw, quaternion orientation, and WebGL frame rendering without re-teaching the tree model.
13. **Sandbox** — allow the learner to move frames, scrub time, choose lookup endpoints, and inspect the result.

## User Experience

The page will contain four stable regions:

1. A compact top bar with the tutorial title, chapter progress, pause, and reset.
2. A main p5 canvas showing the robot/world scene and colored coordinate axes.
3. A TF tree panel showing parent-child edges, static/dynamic state, and the highlighted lookup path.
4. A lesson panel containing the current explanation, numeric transform, composition expression, controls, and ROS 2 pseudocode.

Back and Next buttons will make the primary route through the tutorial obvious. Keyboard Left/Right controls will provide the same navigation. Each chapter will reset to a deterministic initial state so explanations and tests remain reproducible.

The visualization will use consistent axis colors: red for +X, green for +Y, and blue for +Z in the 3D chapter. Transform edges and lookup paths will use separate neutral and highlighted colors so they are not confused with axes.

## Architecture

The walkthrough will live in `p5sim/tf2_walkthrough/`:

- `index.html` — page structure and script loading.
- `styles.css` — responsive tutorial layout and controls.
- `transform2d.js` — immutable SE(2) transform operations.
- `transform-tree.js` — frame topology, transform history, lookup, validation, and typed errors.
- `chapters.js` — chapter metadata, initial state, explanatory copy, and chapter-specific controls.
- `sketch.js` — p5 lifecycle, interaction, simulation state, and drawing.
- `transform3d.js` — minimal vectors, quaternions, and SE(3) composition for the final chapter.
- `tests.html` and `tests.js` — browser-runnable deterministic unit checks.
- `README.md` — how to run and how the files map to the learning sequence.

The files will use browser globals rather than introduce a build tool, matching the surrounding p5 examples. The math and tree code will avoid p5 dependencies so it can be tested independently of rendering.

## Core Models

### Transform2D

A transform contains `x`, `y`, and `yaw` and provides:

- identity;
- composition;
- inverse;
- point application;
- pose application;
- angle normalization;
- interpolation using shortest-angle motion.

The math API will use the convention `T_target_source`: it converts coordinates expressed in `source` into coordinates expressed in `target`. Composition will be written `T_a_c = T_a_b * T_b_c`, and the UI will expand the same expression for each lookup. This convention will be stated on-screen to avoid ambiguous names.

### TransformTree

The tree stores:

- frame names;
- one parent for every non-root frame;
- edge authority;
- static or dynamic edge type;
- timestamped transform samples for dynamic edges.

Lookup will find the common ancestor, evaluate every edge at the requested time, invert edges when traversing upward, and compose the chain in order. A request for the latest transform will choose a time shared by every dynamic edge in the path rather than independently selecting unrelated latest samples. Lookup will also return trace metadata so the UI can highlight the exact path and intermediate results.

### Tutorial State

Tutorial state contains the active chapter, animation time, pause state, selected source and target frames, draggable demonstration values, and the most recent lookup result or error. Switching chapters creates a fresh deterministic scenario.

## Data Flow

For each animation frame:

1. Advance simulation time when not paused.
2. Update dynamic transforms for the active scenario.
3. Insert timestamped samples into the tutorial TF buffer.
4. Evaluate the chapter's requested lookup.
5. Render the world using nested p5 matrix operations.
6. Render the TF tree from the same model.
7. Render intermediate transforms, numeric values, and any error state.

The same transform data will drive the scene, tree, and explanation. This prevents the diagram from claiming a result different from the math being executed.

## Error Handling and Teaching States

Errors are part of the tutorial and will be represented as structured results rather than uncaught exceptions in the animation loop. The UI will explain:

- unknown frame;
- disconnected source and target;
- duplicate parent assignment;
- cycle creation;
- missing transform sample;
- past extrapolation;
- future extrapolation;
- invalid or non-finite transform values.

The affected tree edge and time range will be highlighted. The tutorial will state what action would normally fix the problem, such as using the correct timestamp, waiting for data, or correcting the frame topology.

## Testing and Verification

Deterministic tests will cover:

- identity, composition order, inverse, and round trips;
- point and pose conversion;
- shortest-angle interpolation across the wrap boundary;
- lookup through a common ancestor and in both directions;
- the `map -> odom -> base_link -> laser` chain;
- cycle, duplicate-parent, unknown-frame, and disconnected-tree rejection;
- static transforms at arbitrary times;
- dynamic interpolation and past/future extrapolation;
- quaternion normalization, inverse, composition, and vector rotation.

Browser verification will cover chapter navigation, pause/reset, keyboard controls, mouse interaction, time scrubbing, responsive layout, and JavaScript console errors. The final pass will visually inspect representative desktop and narrow viewport layouts.

## Success Criteria

The walkthrough is successful when a learner can use it to explain:

- why TF2 is a time-aware tree rather than merely a matrix stack;
- the difference between a frame, transform, pose, point, and stamped message;
- how `map`, `odom`, `base_link`, and sensor frames relate;
- why `map -> odom` may jump while `odom -> base_link` remains smooth;
- how a source-frame value becomes a target-frame value;
- why lookups fail because of topology or time;
- how the same tree concepts extend from 2D transforms to 3D quaternions.

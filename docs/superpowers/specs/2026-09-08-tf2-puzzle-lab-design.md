# TF2 Puzzle Lab Design

## Purpose

Extend the existing p5.js TF2 walkthrough with a separate, NANDgame-inspired Puzzle Lab. The lab will teach geometric and TF2 reasoning by asking the learner to build small JavaScript functions first, then reuse those functions as components of progressively larger transform systems.

The lab is practice-oriented. The existing walkthrough remains the explanation-oriented route and will link into relevant puzzle stages.

## Learning Principles

- Build one small geometric operation at a time.
- Reuse solved operations as visible components in later puzzles.
- Accept any solution with correct behavior instead of checking code shape.
- Show geometric consequences through p5.js, not only numeric test output.
- Reduce scaffolding gradually: code pieces first, partial functions next, open coding last.
- Treat errors as feedback about geometry, transform direction, topology, or time.
- Save progress locally without accounts or a backend.

## User Experience

The Puzzle Lab will be a separate page at `p5sim/tf2_walkthrough/puzzle-lab.html`. The main walkthrough will include a clear Puzzle Lab link.

The lab will have four primary areas:

1. **Curriculum map** — stages and puzzles marked locked, available, current, or solved.
2. **p5.js visualizer** — current inputs, expected geometry, learner geometry, error vectors, and numeric deltas.
3. **Code workspace** — prompt, JavaScript editor, early-stage code pieces, Run, Check, Reset Code, and Hint controls.
4. **Component shelf** — functions unlocked in earlier puzzles and available to the current puzzle.

The learner can run incomplete code without spending progress. Check evaluates the full behavior contract. A successful check animates the expected and learner geometry merging, records the solution, unlocks the next puzzle, and adds the new component to the shelf.

Keyboard controls:

- `Ctrl+Enter`: run the current solution.
- `Ctrl+Shift+Enter`: check the current solution.
- `Alt+Left` and `Alt+Right`: move between unlocked puzzles.
- `Escape`: dismiss transient feedback.

## Curriculum

The lab will contain 30 sequential puzzles.

### Stage 1: Coordinate Bricks

1. Construct a point `{x, y}`.
2. Construct a vector `{x, y}`.
3. Add two vectors.
4. Subtract two points to produce a vector.
5. Compute vector magnitude.

### Stage 2: Local Geometry

6. Normalize a vector.
7. Rotate a vector by yaw.
8. Translate a point.
9. Apply the same transform correctly to a point and a vector.
10. Recover heading with `atan2`.

### Stage 3: SE(2) Components

11. Apply `T_target_source` to a point.
12. Compose two rigid transforms in the correct order.
13. Invert a rigid transform.
14. Transform a pose, including orientation.
15. Prove a transform/inverse round trip.

### Stage 4: Tree Components

16. Store one `parentFromChild` edge.
17. Build a frame-to-root ancestor chain.
18. Find the nearest common ancestor.
19. Build a directed source-to-target path and mark inverse steps.
20. Reject duplicate parents and cycles.

### Stage 5: TF Lookup and Robot Frames

21. Assemble a transform lookup from path components.
22. Build `map -> odom -> base_link -> laser`.
23. Transform a laser point into `map`.
24. Separate smooth odometry from a global map correction.

### Stage 6: Time

25. Interpolate translation between timestamped samples.
26. Interpolate yaw across the wrap boundary using the shortest path.
27. Select the latest common time and classify past/future extrapolation.

### Stage 7: SE(3)

28. Normalize and apply a quaternion to a vector.
29. Compose two SE(3) transforms.

### Stage 8: Capstone

30. Assemble a small time-aware TF buffer that answers a stamped sensor lookup.

## Scaffolding Progression

- Puzzles 1-10 provide selectable code pieces and an editable function body.
- Puzzles 11-20 provide a signature, focused starter code, and unlocked components.
- Puzzles 21-29 provide a signature, behavioral contract, and component shelf without code pieces.
- Puzzle 30 provides only the public API, scenario, and success conditions.

Code pieces insert valid JavaScript fragments into the editor. They are assistance, not a separate block-programming runtime, so the learner always sees and can edit the resulting JavaScript.

Hints have three levels:

1. Conceptual direction.
2. Relevant equation and transform convention.
3. Pseudocode structure.

Hints do not reveal the final function body. Hint usage is saved only to help the learner see which concepts need review; it does not affect unlocking.

## Puzzle Definition Model

Each puzzle in `puzzles.js` will define:

- stable `id`, stage, number, and title;
- concept summary and geometric goal;
- exported function name and signature;
- starter source;
- optional code pieces;
- public example cases;
- additional deterministic evaluation cases;
- numeric tolerance;
- three hints;
- dependencies on previously unlocked components;
- preview input and visualization type;
- success explanation and walkthrough chapter link.

Evaluation cases are stored in the browser and are not intended as a security or anti-cheating mechanism. Their purpose is to prevent solutions that only hard-code the visible example.

## Runtime Architecture

New files:

- `puzzle-lab.html` — semantic lab shell and script loading.
- `puzzle-lab.css` — lab layout extending the walkthrough visual system.
- `puzzles.js` — curriculum definitions and deterministic cases.
- `puzzle-engine.js` — progress state, worker lifecycle, evaluation protocol, unlocking, and UI-neutral result models.
- `puzzle-worker.js` — learner-code compilation and isolated execution.
- `puzzle-sketch.js` — p5.js previews and success/error animation.

Modified files:

- `index.html` — add the Puzzle Lab entry point.
- `README.md` — document the lab, controls, and curriculum.
- `tests.js` and `tests.html` — cover puzzle catalog and engine behavior.

The existing `transform2d.js`, `transform-tree.js`, and `transform3d.js` remain the authoritative reference implementation. They can create expected results in the main page but are not passed into the worker as learner dependencies.

## Learner-Code Execution

Learner code will execute inside a dedicated Web Worker. The main thread sends:

- puzzle identifier;
- current source;
- source strings for unlocked dependency functions;
- selected evaluation cases;
- request identifier and mode (`run` or `check`).

The worker compiles the dependency functions followed by the learner function and returns JSON-serializable outputs. It has no direct DOM or `localStorage` access. The main thread terminates and recreates the worker if a request exceeds 750 ms.

This worker is a reliability boundary for accidental infinite loops and page mutation, not a security sandbox for hostile code. The lab is a local, single-user learning tool and will state that scope in its documentation.

## Behavior Evaluation

The puzzle engine compares learner output with expected output using puzzle-specific comparators:

- scalar tolerance;
- point/vector component tolerance;
- angle equivalence modulo `2π`;
- transform translation plus angle tolerance;
- ordered path and inversion flags;
- expected error classification;
- tree lookup results for multiple source, target, and time combinations.

The engine will also reject:

- syntax errors;
- missing exported function;
- runtime exceptions;
- non-finite numeric output;
- input mutation when a puzzle requires pure behavior;
- unserializable output;
- worker timeout.

Feedback names the first failing behavior without exposing the expected implementation. Public examples show full input, expected output, learner output, and delta. Additional evaluation cases show a concise category such as “rotation wrap case failed.”

## p5.js Visualization

The Puzzle Lab remains a p5.js learning environment. `puzzle-sketch.js` will render puzzle-specific scenes from plain input/output data:

- points and vectors on a dark metric grid;
- expected geometry as a faint dashed outline;
- learner geometry in red while incorrect;
- component-wise error arrows and numeric delta labels;
- green overlap when behavior is within tolerance;
- local red/green axes for SE(2);
- highlighted transform-tree traversal;
- timestamp lanes and buffer intervals;
- 3D quaternion axes in the final stage.

The worker never draws. It returns geometry; p5.js visualizes that geometry on the main thread. This keeps evaluation independent from rendering and makes geometric mistakes visible.

## Components and Unlocking

Every component puzzle exports a named function. A solved component is represented by:

- puzzle ID;
- function name and signature;
- saved learner source;
- completion timestamp;
- puzzle schema version.

Later puzzles receive only their declared dependency functions. This makes the component shelf a real composition mechanism rather than a decorative badge collection.

Progression is sequential across all 30 puzzles, with stage milestones becoming more prominent after the component-building stages:

- completing a puzzle unlocks the next puzzle;
- completing all puzzles in a stage unlocks its stage-completion badge;
- revisiting a solved puzzle is always allowed;
- editing a solved solution rechecks it before replacing the saved component;
- resetting one puzzle invalidates dependent saved solutions and clearly lists them before confirmation;
- Reset Progress clears all Puzzle Lab state after confirmation but does not affect walkthrough state.

## Persistence

Use one versioned `localStorage` record named `tf2-puzzle-lab:v1` containing:

- schema version;
- current puzzle ID;
- highest unlocked puzzle index;
- saved source by puzzle ID;
- solved metadata by puzzle ID;
- hint level by puzzle ID;
- display preferences.

Invalid or incompatible stored data falls back to a clean state without breaking the page. Reset operations update only this key.

## Integration With the Walkthrough

- The walkthrough top bar gets a `Puzzle Lab` button.
- Each puzzle links back to the most relevant walkthrough chapter.
- Relevant walkthrough chapters show a small `Practice this` link that opens the first puzzle in the matching stage.
- Puzzle URLs use a hash such as `puzzle-lab.html#compose-transform`, allowing direct links while still enforcing unlock rules.
- The visual colors, typography, axes, cards, and responsive behavior match the current walkthrough.

## Error Handling

The lab distinguishes:

- editor syntax error;
- learner runtime error;
- missing function;
- wrong result shape;
- geometric mismatch;
- mutation violation;
- worker timeout;
- corrupt saved progress;
- locked deep link;
- unavailable dependency caused by changed earlier code.

Each error offers one next action: inspect a highlighted line, compare geometry, open the next hint, revisit a dependency, or reset the current code.

## Verification

Automated checks will cover:

- exact puzzle order, IDs, dependencies, and required fields;
- catalog dependency references and absence of dependency cycles;
- scalar, vector, angle, transform, path, and error comparators;
- unlocking and dependency invalidation;
- storage migration/fallback behavior;
- worker success, syntax error, runtime error, and timeout messages;
- all reference solutions against every evaluation case.

Browser verification will cover the complete first-puzzle flow, code-piece insertion, running and checking, unlocking, saved-progress reload, hint levels, a later transform puzzle, time visualization, capstone access rules, reset confirmation, keyboard controls, and desktop/mobile layouts.

## Non-Goals

- Multi-user accounts, cloud synchronization, grading, or leaderboards.
- Secure execution of untrusted hostile programs.
- Preventing a learner from reading browser source or evaluation cases.
- Replacing the guided walkthrough.
- Adding a third-party code editor or build system.

## Success Criteria

The lab succeeds when a learner can progress from vector operations to a working time-aware lookup and can explain how each larger operation is composed from earlier units. Correct solutions must create matching p5.js geometry, persist locally, unlock the next puzzle, and remain reusable by declared downstream puzzles.

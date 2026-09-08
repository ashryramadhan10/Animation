# TF2 Puzzle Lab Live Rework Design

## Purpose

Rework the p5.js TF2 Puzzle Lab so every puzzle is real geometry, every puzzle has a live scene the learner can drag while their own function runs, and wrong answers are explained geometrically instead of numerically. The rework also prepares the lab for a second track on pose correction for SLAM/VIO drift in a warehouse aisle, built from the reference math in `p5sim/navigation`.

This document covers Track 1 (TF2) in full and defines only the shape and unlock rule of Track 2 (Pose Correction). Track 2 receives its own design document after Track 1 is built.

## Why the Current Lab Falls Short

- The first ten puzzles wrap data (`return { x, y }`) rather than teach rotation or transforms.
- The canvas redraws only after Run or Check, shows one fixed example, and nothing is draggable.
- Feedback is numeric ("result.x differs by 2.0") and never shows what the learner's transform actually describes.
- Drift correction is one compose call, although `map -> odom` correction is the learner's stated goal.
- Click-to-insert code pieces add noise without teaching geometry.

## Learning Principles

- Start at rotation. The smallest unit still has geometric behavior worth seeing.
- Drag first, read numbers second. Every puzzle runs the learner's function live on draggable inputs.
- Show the mistake, not just the delta. Known wrong variants are named ("mirrored rotation", "translated before rotating").
- Reuse solved units as visible components in later puzzles, NANDgame style.
- Accept any correct behavior; never check code shape.
- Keep evaluation independent from rendering so geometry logic is testable in Node.
- Save progress locally without accounts.

## Tracks

The catalog exposes two tracks.

- **Track 1, TF2.** Seven stages, 27 puzzles, fully specified below.
- **Track 2, Pose Correction.** Shown in the curriculum map as locked with stage titles only: Point-Cloud Bricks, Rack Filters, Aisle Correction, Correction Capstone. It unlocks when the Track 1 capstone `stamped-lookup` is solved. Unlocking only changes the map entry from "locked" to "available, puzzles arrive with the next track"; no Track 2 puzzle is navigable until its own specification is implemented.

## Conventions

- Transforms are `{ x, y, yaw }` and mean `T_target_source`: they convert source-frame coordinates into target-frame coordinates.
- Points and vectors are `{ x, y }`. Poses are `{ x, y, yaw }`.
- Angles are radians. Angle-valued results are compared modulo 2π unless a puzzle states a range.
- Composition is `T_a_c = compose(T_a_b, T_b_c)`; the right operand acts first.
- The 3D stage uses `{ x, y, z }` vectors and `{ x, y, z, w }` quaternions; `q` and `-q` are the same rotation.

## Curriculum, Track 1

Each puzzle lists id, function signature, dependencies on earlier puzzles, scene kind, and named mistake diagnoses. Diagnoses are wrong variants the worker evaluates alongside the reference; when the learner output matches a variant, feedback names it.

### Stage 1, Rotation Bricks

1. `heading-vector` — `headingVector(yaw) → { x, y }`. Unit vector `(cos yaw, sin yaw)`. Scene `dial`. Diagnoses: `swapped` (`(sin, cos)`).
2. `heading-of` — `headingOf(v) → radians`. `atan2(v.y, v.x)`. Scene `vector`. Diagnoses: `atan2-swapped` (`atan2(x, y)`), `atan-ratio` (`atan(y / x)` loses the quadrant).
3. `wrap-angle` — `wrapAngle(angle) → radians in [-π, π)`. Scene `dial` whose knob accumulates past ±π. Comparator `scalar`, so an unwrapped answer fails. Diagnoses: `unwrapped` (returns input).
4. `rotate-vector` — `rotateVector(v, yaw) → vector`. Scene `vector-dial`. Diagnoses: `negated-yaw` (rotates by `-yaw`, shows as a mirror), `swapped-rows`.
5. `yaw-delta` — `yawDelta(from, to) → radians in [-π, π)`. Shortest signed turn from `from` to `to`. Depends on `wrap-angle`. Scene `two-dials`. Comparator `scalar`. Diagnoses: `reversed` (`from - to`), `long-way` (raw `to - from`).

### Stage 2, Frames (SE(2))

6. `transform-point` — `transformPoint(transform, point) → point`. Rotate, then translate. Depends on `rotate-vector`. Scene `frame-point`. Diagnoses: `translate-then-rotate`, `rotation-ignored`, `negated-yaw`.
7. `transform-vector` — `transformVector(transform, vector) → vector`. Rotation only. Depends on `rotate-vector`. Scene `frame-vector`. Diagnoses: `translated`.
8. `transform-pose` — `transformPose(transform, pose) → pose`. Depends on `transform-point`, `wrap-angle`. Scene `frame-pose`. Diagnoses: `yaw-not-composed`.
9. `compose` — `compose(aFromB, bFromC) → aFromC`. Depends on `transform-point`, `wrap-angle`. Scene `frame-chain` (frame b draggable in a, frame c draggable in b). Diagnoses: `reversed-order`, `translation-unrotated`.
10. `invert` — `invert(transform) → inverse`. Depends on `rotate-vector`. Scene `frame-inverse` (drag frame b in a; the canvas draws a as seen from b, plus a round-trip point). Diagnoses: `negated-only` (`{-x, -y, -yaw}`), `rotated-by-positive-yaw`.
11. `relative-transform` — `relativeTransform(worldFromA, worldFromB) → aFromB`. `compose(invert(worldFromA), worldFromB)`. Depends on `compose`, `invert`. Scene `two-frames`. Diagnoses: `reversed` (`bFromA`), `difference-only` (subtracts translations without rotating into a).

### Stage 3, Tree

12. `store-edge` — `storeEdge(tree, edge) → newTree`. Pure copy plus `tree[child] = { parent, transform }`. Scene `tree` with an edge selector.
13. `ancestor-chain` — `ancestorChain(tree, frame) → frame[]`. Scene `tree` with a frame selector.
14. `common-ancestor` — `commonAncestor(tree, a, b) → frame | null`. Depends on `ancestor-chain`. Scene `tree` with two selectors.
15. `directed-path` — `directedPath(tree, target, source) → step[] | null`. Steps are `{ from, to, child, inverse }`. Depends on `ancestor-chain`, `common-ancestor`. Scene `tree`; inverse steps are drawn against the stored edge direction.
16. `validate-tree` — `validateTree(edges) → { valid, code? }` with codes `DUPLICATE_PARENT` and `CYCLE`. Scene `tree` with an edge-set selector (valid chain, duplicate parent, cycle).

The tree stage has no diagnoses; the structural comparator already names the wrong property or step.

### Stage 4, Lookup and Robot Frames

17. `lookup-transform` — `lookupTransform(tree, target, source) → transform | null`. Depends on `compose`, `invert`, `directed-path`. Scene `robot-chain`: `odom` draggable in `map`, `base_link` in `odom`, `laser` fixed in `base_link`, with target and source selectors. Diagnoses: `inverse-flags-ignored`, `reversed-composition`.
18. `laser-point-to-map` — `laserPointToMap(tree, pointInLaser) → point`. Depends on `lookup-transform`, `transform-point`. Scene `robot-chain` with a fixed landmark; the laser hit is derived from the landmark, so a correct answer stays glued to the landmark while the robot is dragged. Diagnoses: `wrong-direction` (uses `laserFromMap`).
19. `correction-from-pose` — `correctionFromPose(mapFromBase, odomFromBase) → mapFromOdom`. `compose(mapFromBase, invert(odomFromBase))`. Depends on `compose`, `invert`. Scene `correction`: a drifted odometry pose and the true map pose are both draggable; the canvas composes the learner's `mapFromOdom` with `odomFromBase` and the result must land on the true pose while `odomFromBase` is left untouched. Diagnoses: `reversed` (`odomFromMap`), `difference-only`. This puzzle is the hand-off to Track 2, which computes `mapFromBase` from rack point clouds.

### Stage 5, Time

20. `interpolate-transform` — `interpolateTransform(a, b, amount) → transform`. Linear translation, shortest-path yaw. Depends on `yaw-delta`, `wrap-angle`. Scene `pose-lerp` (two draggable poses, amount slider). Diagnoses: `yaw-long-way`, `amount-inverted`.
21. `bracket-samples` — `bracketSamples(samples, time) → { beforeIndex, afterIndex, amount }`. Samples are `{ time, transform }` sorted by time. A time inside the history returns the surrounding pair and the fraction between them; a time equal to a sample returns that index as `beforeIndex` with amount 0; a time outside the history clamps to the nearest end with `beforeIndex === afterIndex` and amount 0. Scene `timeline`. Diagnoses: `amount-unnormalized` (returns raw `time - before.time`).
22. `latest-common-time` — `latestCommonTime(ranges, requestedTime) → availability`. Unchanged from the current lab: intersect ranges; `null` means latest; codes `NO_COMMON_TIME`, `PAST_EXTRAPOLATION`, `FUTURE_EXTRAPOLATION`. Scene `timeline` with two lanes.
23. `sample-edge` — `sampleEdge(edge, time) → transform`. Static edges return `edge.transform`; dynamic edges bracket and interpolate. Depends on `bracket-samples`, `interpolate-transform`. Scene `timeline-frame`: the sampled frame slides along the lane as time is scrubbed. Diagnoses: `nearest-sample` (no interpolation).

### Stage 6, SE(3)

24. `quaternion-multiply` — `quaternionMultiply(a, b) → quaternion`. Hamilton product, normalized. Scene `se3` with a yaw slider for `a` and a pitch slider for `b`; the resulting basis is drawn as RGB axes. Diagnoses: `reversed-order`, `component-sum`.
25. `rotate-by-quaternion` — `rotateByQuaternion(q, v) → vector3`. `q v q⁻¹` with `q` normalized first. Depends on `quaternion-multiply`. Scene `se3` with a draggable yaw slider and a fixed input vector. Diagnoses: `inverse-rotation` (`q⁻¹ v q`), `not-normalized`.
26. `compose-se3` — `composeSE3(aFromB, bFromC) → aFromC`. Depends on `rotate-by-quaternion`, `quaternion-multiply`. Scene `se3`. Diagnoses: `translation-unrotated`.

### Stage 7, Capstone

27. `stamped-lookup` — `lookupStampedTransform(edges, target, source, requestedTime) → result`. Resolve availability with `latestCommonTime`, sample every edge with `sampleEdge`, build a tree with `storeEdge`, answer with `lookupTransform`. Returns `{ ok: true, time, transform }` or the availability error. Depends on `sample-edge`, `latest-common-time`, `store-edge`, `lookup-transform`. Scene `robot-chain-time`: the robot chain plus a timeline scrubber and selectors. Solving it unlocks Track 2.

### Scaffolding

- Code pieces are removed.
- Stages 1 and 2 start with the signature, one comment describing the geometry, and `return null;`.
- Stages 3 to 7 start with the signature only.
- Every puzzle keeps three hints: concept, equation or convention, pseudocode. Hints never reveal the final body.
- Each puzzle links to its walkthrough chapter and lists its dependencies as shelf components with their signatures.

## Scene Model

Scenes are pure data plus pure functions, so the p5 sketch never contains puzzle logic.

### Handles

A puzzle declares an ordered `handles` array. Each handle has `id`, `type`, `label`, an initial `value`, and optional constraints. Types:

- `frame` — value `{ x, y, yaw }`; grips are the origin and a rotation ring.
- `point` — value `{ x, y }`; grip is the point.
- `vector` — value `{ x, y }`; grip is the tip; drawn from the origin or from a stated base.
- `pose` — value `{ x, y, yaw }`; drawn as a small robot glyph with a heading ring.
- `dial` — value in radians; `accumulate: true` lets the knob wind past ±π.
- `slider` — number in `[min, max]`.
- `selector` — string from `options`; rendered as a `<select>` under the canvas, not in p5.
- `timeline` — number in `[start, end]`; grip is a cursor on a lane.

A handle may declare `in: "<frameHandleId>"` so it is dragged and drawn in that frame's coordinates.

### Arguments

`puzzle-scenes.js` exports one scene definition per scene kind with two pure functions:

- `toArgs(handles, puzzle)` returns the argument array passed to the learner's function. The default takes handle values in order. Scene kinds that build structured inputs (`tree`, `robot-chain`, `correction`, `timeline`, `robot-chain-time`, `se3`) provide their own mapping, for example building the tree from three frame handles.
- `layers(context)` returns draw primitives from `{ puzzle, handles, args, expected, actual, comparison, diagnosis, error }`.

### Primitives

- `frame` — `{ transform, label, style, inFrame? }`
- `point` — `{ at, label, style, inFrame? }`
- `arrow` — `{ from, to, style, dashed?, inFrame? }`
- `arc` — `{ center, radius, from, to, style }`
- `label` — `{ text, at | screen, style }`
- `tree` — `{ nodes, edges, highlightedSteps }`
- `timeline` — `{ lanes, cursor }`
- `axes3d` — `{ origin, basis, style }`

Styles are `input`, `expected`, `actual`, `match`, `muted`, `accent`, `x`, `y`, `z`. The renderer maps styles to the existing lab palette: expected dashed blue, learner red until it matches, green on match.

Every scene draws the inputs, the reference result as a dashed ghost, the learner result solid, and an error arrow from the learner result to the reference result when they differ. Frame-valued results are drawn as full axes so the learner sees the frame their numbers describe.

### Handle Interaction

The sketch owns hit-testing and dragging for grips: origin circle, rotation ring, point, vector tip, dial knob, slider knob, timeline cursor. A drag updates the handle value and requests a live evaluation. Selectors update through DOM events. Handle values reset with the puzzle and are not persisted.

## Runtime

### Program

A program is `{ learner, reference, variants }`.

- `learner` — `{ functionName, source, dependencySources }` where dependency sources are the learner's own saved solutions for the puzzle's transitive dependencies.
- `reference` — `{ functionName, source, dependencySources }` built from the reference sources of the same dependency chain, so the reference never runs learner code.
- `variants` — `[{ id, source }]` from the puzzle's diagnoses; each variant is compiled with the reference dependency chain.

### Shared runtime module

`puzzle-runtime.js` exports `compileProgram(program)` and `evaluateCompiled(compiled, args)` with no DOM or worker dependency. The worker loads it with `importScripts`; Node tests load it with `require`. Compilation uses `new Function` in strict mode per scope. Evaluation deep-clones arguments, calls the function, records mutation, and validates that outputs are finite JSON data.

### Worker

`puzzle-worker.js` is one persistent worker per lab session. Messages carry `requestId` and `mode`:

- `live` — one `args` array; returns `{ learner: { ok, value | error }, reference: { value }, variants: { [id]: value } }`.
- `check` — `cases`; returns the learner value and every variant value for each case, so the main thread can diagnose the first failing case without a second round trip. The reference is not evaluated in check mode because cases carry stored expected values.

The worker caches the last compiled program keyed by the concatenated sources and recompiles only when they change. Compile errors return `kind: "syntax"`; missing exports return `kind: "missing-function"`.

### Live session

`puzzle-engine.js` exports `createLiveSession({ workerUrl, timeoutMs })`:

- `evaluate(program, args)` — at most one request in flight; a newer request replaces any queued one; stale replies are dropped.
- `check(program, cases)` — waits for any live request, then runs the check.
- A request exceeding `timeoutMs` (250 ms live, 750 ms check) terminates and recreates the worker and rejects with `kind: "timeout"`.
- Editor input is debounced by 150 ms before a live evaluation; drags evaluate on every animation frame while a request slot is free.

### Evaluation and diagnosis

- Comparators: `scalar`, `angle`, `vector2`, `vector3`, `se2`, `se3`, `deep`, `path`, `error`. `scalar` is exact-within-tolerance and is used where a range matters (`wrap-angle`, `yaw-delta`).
- Live: the learner value is compared with the reference value using the puzzle comparator. On mismatch, the learner value is compared with each variant value; the first match sets `diagnosis`.
- Check: learner values are compared with the stored expected values of every case. The first failing case sets the feedback; diagnosis uses the variant values of that case.
- Error kinds: `syntax`, `missing-function`, `runtime`, `serialization`, `mutation`, `timeout`, `missing-dependency`.

## Feedback States

The feedback panel shows exactly one state:

- **Ready** — starter code present, no evaluation yet.
- **Live match** — "Matches the reference for this input. Check to verify every case."
- **Live mismatch** — the diagnosis message when one matches, otherwise the first differing component and its delta.
- **Syntax error** — message with the line number when the engine can extract one.
- **Runtime error** — message plus the case label.
- **Did not finish** — the worker was restarted after the timeout.
- **Missing function** — expected function name and signature.
- **Mutation** — the function changed an input.
- **Check passed** — solved, component added to the shelf, next puzzle unlocked, Track 2 unlocked after the capstone.
- **Check failed** — the failing case label, diagnosis if any, and the input, expected, and actual values.

Every state offers one next action: fix the highlighted line, drag the scene, open the next hint, revisit a dependency, or reset the code.

## Puzzle Definition Model

Each entry in `puzzles.js` defines:

- `id`, `number`, `title`, `stage`, `track`;
- `goal` and `concept`;
- `functionName`, `signature`, `starterSource`, `referenceSource`;
- `dependencies` (puzzle ids, all earlier);
- `comparator` and `tolerance`;
- `scene` — `{ kind, handles }`;
- `diagnoses` — `[{ id, message, source }]`, may be empty;
- `cases` — at least three; the first is public, the rest are check-only;
- `hints` — exactly three;
- `walkthroughChapter`.

The catalog also exports `TF2_PUZZLE_STAGES` and `TF2_PUZZLE_TRACKS`.

## Persistence

Storage key `tf2-puzzle-lab:v2`, schema version 2, with `currentPuzzleId`, `highestUnlocked`, `sources`, `drafts`, `solved`, `hints`, `display`. The v1 record is ignored and left in place. Invalid data falls back to a clean state. Reset Code and Reset Progress behave as today, including dependent-solution invalidation with confirmation.

## Walkthrough Integration

- The walkthrough's practice-link map points chapters at the new ids: matrix-stack → `transform-point`, data-types → `transform-vector`, composition → `compose`, tree → `store-edge`, mobile-chain → `lookup-transform`, frame-roles → `correction-from-pose`, broadcasters → `sample-edge`, lookup → `lookup-transform`, stamped-data → `transform-pose`, time-buffer → `interpolate-transform`, sensor-scenario → `laser-point-to-map`, se3 → `rotate-by-quaternion`, sandbox → `stamped-lookup`.
- The default practice link in `index.html` points at `heading-vector`.
- Deep links use `puzzle-lab.html#<id>` and still respect unlock rules.

## Files

New:

- `puzzle-scenes.js` — handle types, `toArgs`, `layers`, per scene kind.
- `puzzle-runtime.js` — compile and evaluate a program; shared by worker and tests.
- `puzzle-tests.js` — Node and browser checks for the catalog, runtime, scenes, engine, and live session.

Modified:

- `puzzles.js` — re-cut 27-puzzle catalog, stages, tracks, diagnoses, scenes.
- `puzzle-worker.js` — persistent worker using the runtime module, live and check modes.
- `puzzle-engine.js` — comparators, diagnosis matching, live session, v2 progress, track unlocking.
- `puzzle-sketch.js` — primitive renderer and handle dragging.
- `puzzle-lab.js` — live wiring, selector strip, feedback states, code pieces removed.
- `puzzle-lab.html`, `puzzle-lab.css` — remove the pieces card, add the selector strip and live status.
- `sketch.js`, `index.html` — practice link updates.
- `tests.html` — include `puzzle-tests.js`.
- `README.md` — document the rework, tracks, and controls.

`transform2d.js`, `transform-tree.js`, and `transform3d.js` remain the walkthrough's reference implementation and are unchanged.

## Verification

Node checks in `puzzle-tests.js`:

- exactly 27 Track 1 puzzles, sequential numbers, unique ids, backward-only dependencies, three hints, at least three cases, known scene kind, known comparator;
- every reference solution with its reference dependency chain passes every case through `puzzle-runtime.js`;
- every diagnosis variant compiles and differs from the reference on at least one case, so no diagnosis can fire on a correct answer;
- every scene's `toArgs` with initial handles yields arguments the reference accepts, and `layers` returns finite primitives for match, mismatch, and error contexts;
- comparator behavior including `scalar` versus `angle`, quaternion sign equivalence, path steps, and error codes;
- progress creation, v1 rejection, completion, unlocking, Track 2 unlocking, and dependent invalidation;
- live session coalescing, stale-reply dropping, and timeout recovery using a fake worker.

Browser verification through the local server:

- first puzzle: drag the dial, see the mirrored diagnosis, fix it, Run, Check, unlock;
- frame puzzles: drag origin and rotation ring, point in the source frame, watch the ghost frame;
- laser puzzle: the projected point stays on the landmark while dragging the robot;
- correction puzzle: the composed pose lands on the true pose;
- timeline scrub, SE(3) sliders, capstone unlocking Track 2 placeholder;
- syntax error, infinite loop recovery, reset confirmations, keyboard shortcuts, narrow layout;
- no console errors.

## Non-Goals

- Track 2 puzzle content, point-cloud generation, or filters; only its locked placeholder.
- Secure execution of hostile code; the worker is a reliability boundary.
- Migrating v1 progress.
- A third-party editor, syntax highlighting, or a build tool.
- Changing the walkthrough beyond practice links.

## Success Criteria

A learner can drag any input in any puzzle and watch their own function's geometry respond immediately. A mirrored rotation, a reversed composition, or a translate-before-rotate mistake is named on screen. Every solved unit is reused by later puzzles, and finishing the stamped lookup capstone unlocks the Pose Correction track.

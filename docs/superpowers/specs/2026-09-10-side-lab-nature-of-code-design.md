# Side Lab · Nature of Code Core Design

## Purpose

Rebuild the core ideas of five existing p5 sketches as a puzzle ladder: `p5sim/agents` (steering and flocking), `p5sim/force` (F = ma, friction, drag, gravitational attraction), `p5sim/scalar_projection` (dot products and projections), `p5sim/procedural_animation` (angle-constrained joint chains and border wrapping), and `p5sim/random_distribution` (uniform histograms). The puzzles are written the same way as the TF2 tracks: one plain JavaScript function each, plain `{ x, y }` vectors, live draggable scenes, named mistake diagnoses.

## Why a separate page

The TF2 lab unlocks puzzles linearly by number, so a side track appended to the catalog would open only after Track 6. The side lab is therefore its own page, `side-lab.html`, that shares every engine, scene, sketch, editor, and worker file but loads its own catalog (`side-puzzles.js`) and saves progress under its own storage key. It is open from the start and linked from the lab and walkthrough headers.

## Lab configuration

`puzzle-lab.js` reads an optional `window.PUZZLE_LAB_CONFIG` with `puzzles`, `tracks`, `storageKey`, `title`, `heading`, `resetNote`, and `conceptLink(puzzle) → { href, label }`. Defaults reproduce the TF2 lab. The lab derives its stage list from the tracks instead of `TF2_PUZZLE_STAGES`, which fixes a latent bug: the export listed only Track 1's stages, so opening any puzzle from 28 onwards would have thrown while rendering the stage title. `puzzles.js` now exports the union as well. `loadProgress` and `saveProgress` accept an optional storage key.

## Conventions

- Vectors are `{ x, y }`. Agents are `{ pos, vel }`; movers add `acc` and a `mass`. Steering functions return a force vector: `limit(setMagnitude(desired, maxSpeed) − vel, maxForce)`.
- Flow fields are flat arrays indexed `row · cols + col` with a `resolution` in world units and the origin at the field's corner.
- Angles for the chain puzzles live in `[0, 2π)`, as in the sketch's `simplifyAngle`; the cone check uses the wrapped relative angle.
- The wrap puzzles use a box `[0, width] × [0, height]` with a margin, as in the sketches' `edges()`.
- Side puzzles set `walkthroughChapter` to their source sketch path (for example `agents/vehicle.js`); the side lab turns that into an "Open agents/vehicle.js" link. `reference` links the Nature of Code chapter.

## Curriculum (track `nature`, puzzles 1 to 32)

### Vectors (1 to 7) — `scalar_projection/sketch.js`, `agents/vehicle.js`
1. `normalize(v)`; 2. `setMagnitude(v, m)`; 3. `limitVector(v, max)`; 4. `dot(a, b)`; 5. `angleBetween(a, b)`; 6. `scalarProjection(a, b)` (vector projection of a onto b); 7. `nearestPointOnSegment(p, a, b)` (clamped to the segment).

### Forces (8 to 13) — `force/mover.js`, `force/attractor.js`
8. `applyForce(acc, force, mass)`; 9. `stepMover(mover, maxSpeed)`; 10. `frictionForce(vel, mu, normal)`; 11. `dragForce(vel, c)`; 12. `gravitationalAttraction(attractor, mover, G, minDistance, maxDistance)`; 13. `wrapEdges(pos, radius, width, height)`.

### Steering (14 to 21) — `agents/vehicle.js`, `agents/flow_field.js`, `agents/following_path.js`
14. `seek`; 15. `flee`; 16. `arrive` with a slow radius; 17. `pursue` with look-ahead; 18. `wanderTarget(agent, distance, radius, theta)`; 19. `flowFieldLookup(field, cols, rows, resolution, pos)`; 20. `followField(agent, fieldVector, maxSpeed, maxForce)`; 21. `pathTarget(agent, points, lookAhead, aheadDistance) → { future, normal, target }`.

### Flocking (22 to 25) — `agents/boid.js`, `agents/separation.js`
22. `separate`; 23. `align`; 24. `cohere`; 25. `flock(agent, others, weights, params)`.

### Procedural Chains (26 to 29) — `procedural_animation/sketch.js`
26. `simplifyAngle(angle)`; 27. `constrainAngle(angle, anchor, constraint)`; 28. `chainFollow(anchor, joint, linkLength, prevAngle, constraint) → { pos, angle }`; 29. `wrapOffset(pos, margin, width, height) → { pos, offset }`.

### Randomness (30 to 32) — `random_distribution/sketch.js`
30. `binIndex(value, lo, hi, bins)`; 31. `histogram(samples, lo, hi, bins)`; 32. `normalizeHistogram(counts)`.

Each puzzle has two diagnoses, three hints, and at least three cases.

## Scenes

A `nature` scene kind with views `unary`, `binary`, `segment`, `apply-force`, `step`, `friction`, `drag`, `attract`, `wrap`, `steer`, `wander`, `field`, `follow-field`, `path`, `flock`, `angle`, `cone`, `chain`, `wrap-offset`, `bins`, `histogram`, `normalize-histogram`. Agents are `pose` handles (drag the origin to move, the heading grip to turn) with a speed slider. The flow field, path, neighbour boids, samples, and box are fixtures.

## Verification

Node tests: the TF2 stage export covers every puzzle; the side catalog validates, holds 32 puzzles in the listed order, every reference and diagnosis behaves, every `nature` view builds; analytic checks: `flock` with unit weights equals the sum of its three parts, `chainFollow` lands at the link length, `histogram` counts every sample, `nearestPointOnSegment` lies on the segment. Headless render of the side lab, the TF2 lab, the test page, and every `nature` scene.

## Non-Goals

Perlin noise, Gaussian sampling, random walkers, the WEBGL camera, and recording; the other `p5sim` folders.

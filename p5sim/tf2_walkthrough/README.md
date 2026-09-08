# TF2, Drawn as a Tree

An interactive p5.js walkthrough of the ROS 2 TF2 mental model. It starts with the familiar p5 matrix stack, builds a time-aware 2D transform tree, applies it to the standard mobile-robot frame chain, and finishes with a 3D quaternion chapter.

## Run

Serve the repository root so the local p5 library can load:

```powershell
npx http-server . -p 4173
```

Open:

```text
http://127.0.0.1:4173/p5sim/tf2_walkthrough/
```

Opening `index.html` directly also works in most browsers because the walkthrough has no network requests or JavaScript modules.

## Learning Route

The thirteen chapters cover:

1. p5 `push()`/`pop()` and local coordinate frames.
2. Frame, transform, point, vector, pose, and stamped-data distinctions.
3. `T_target_source`, composition order, and inverse transforms.
4. Roots, parents, children, branches, common ancestors, cycles, and disconnected trees.
5. `map -> odom -> base_link -> laser/camera`.
6. Globally corrected `map` versus smooth but drifting `odom`.
7. Static and dynamic broadcasters and edge authority.
8. Source/target lookup direction.
9. PointStamped, Vector3Stamped, PoseStamped, and `doTransform`.
10. Timestamp history, interpolation, latest common time, and extrapolation errors.
11. A complete laser observation transformed into `map`.
12. XYZ translation and quaternion orientation in 3D.
13. A free lookup and time-scrubbing sandbox.

## Controls

- Back/Next or Left/Right Arrow: change chapter.
- Space: pause or play the animation.
- R: reset the current chapter.
- Mouse drag: move the demonstration frame in early 2D chapters.
- Mouse drag in the SE(3) chapter: orbit the 3D camera.
- Source/Target selectors: change lookup direction.
- Query-time slider: inspect interpolation and extrapolation.

## Read the Code

Suggested order:

1. `transform2d.js` — immutable SE(2) math.
2. `transform-tree.js` — topology, buffering, lookup, and typed errors.
3. `chapters.js` — the teaching sequence and ROS 2 parallels.
4. `sketch.js` — p5 rendering and interaction.
5. `transform3d.js` — normalized quaternion and SE(3) bridge.

Every edge stores `T_parent_child`, the transform that converts child-frame coordinates into its parent. A lookup returns `T_target_source`.

## Model Checks

Run the dependency-free checks with:

```powershell
node p5sim/tf2_walkthrough/tests.js
```

The same checks can be viewed in a browser at `tests.html`.

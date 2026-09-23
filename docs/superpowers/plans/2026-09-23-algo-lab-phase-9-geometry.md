# Algo Lab Phase 9: Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Geometry section of the Algo Lab: all 16 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force or validity check for every task.

**Architecture:** One section file, `algo/09-geometry.js`, defining the `geometry` section. Five bricks placed right before their first user: the exact cross product sign (before Point Location Test), Li Chao insert and query (before Line Segments Trace I), the Li Chao segment insert (before Line Segments Trace II) and the coverage tree update (before Area of Rectangles). Robot Path leans on the Fenwick bricks from Sorting.

The section opens the way Mathematics did, with a brick that exists because of how JavaScript numbers work. Coordinates reach 10⁹, so a cross product reaches 4·10¹⁸, past the 2⁵³ where doubles stop counting by ones. The brick computes the sign in floats and falls back to BigInt only when the result is too close to zero to trust, which keeps 10⁵ tests fast while staying exact. Shoelace sums, lattice counts, squared distances and Manhattan totals all pass 2⁵³ too, so those four tasks answer with decimal strings.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section file, scenes, tests

- [ ] **Step 1: Turns, polygons and distances**

The cross product sign brick, Point Location Test, Line Segment Intersection, Polygon Area (shoelace in BigInt), Point in Polygon (even-odd ray with a boundary test first), Polygon Lattice Points (Pick's theorem), Minimum Euclidean Distance (divide and conquer with a strip merge), Convex Hull (monotone chain that keeps the points inside an edge, because CSES wants them), Maximum and All Manhattan Distances (the 45-degree rotation and the per-axis sorted sums), Intersection Points (a Fenwick sweep).

- [ ] **Step 2: Upper envelopes and coverage**

The Li Chao bricks answer four tasks: Line Segments Trace I and II, Lines and Queries I and II. The point insert takes the node and its range so the segment insert can reuse it at each covering node. The coverage tree keeps a count that is never pushed down, which is what lets a sweep remove intervals again, and Area of Rectangles reads the covered height off its root. Robot Path closes the section: a binary search for the move on which the path first touches itself, a sweep line to test one prefix, and a scan of the earlier segments to find where along that move the robot stops.

- [ ] **Step 3: Answers that are not unique**

Convex Hull accepts the hull points in any order, compared as a set against the reference answer rather than against a brute force, because the validator also runs on the 100 000-point case. The two Li Chao inserts accept any tree that answers every x correctly, since an insert may legitimately drop a line at a leaf where only one can ever win.

- [ ] **Step 4: Scenes and tests**

A new `plane` view draws whichever of points, polygon, segments, rectangles, lines and marks a preset supplies, scaled to fit. Two more preset fixtures carry the fifth and sixth arguments the Li Chao bricks take. Wire the file into `algo-puzzles.js`, `algo-lab.html` and `tests.html`; in `puzzle-tests.js` add the `geometry` track, its id list, the five bricks and the new first unlocked puzzle.

- [ ] **Step 5: Verify and commit**

Run the Node suites, render the geometry scenes headlessly, and run real worker Checks on all 21 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/09-geometry.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Geometry section of the Algo Lab"
```

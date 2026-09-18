# Algo Lab Phase 3: Dynamic Programming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Dynamic Programming section of the Algo Lab: all 23 CSES tasks in site order (the roadmap said 24; the site lists 23), each anchored on the official sample, with a brute force or validity check for every task whose answer can be verified independently.

**Architecture:** `algo/03-dp.js` is rewritten in full and is the source of truth for this phase. The six existing puzzles keep their ids (so saved progress survives); Grid Paths is retitled "Grid Paths I" as on the site. No new bricks: the section reuses `lowerBound`, `upperBound`, `fenwickAdd` and `fenwickPrefix` from the sorting section through `core.shared`, and Mountain Range carries its own small max segment tree inline. The scene gets a `rectangle` view, a `roundedM` fixture, a second string in the `text` view, rewards on interval labels and a generic label for the `number` view.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section, scenes, tests

- [ ] **Step 1: Tasks in site order**

Dice Combinations, Minimizing Coins, Coin Combinations I and II, Removing Digits, Grid Paths I, Book Shop, Array Description, Counting Towers (split/wide top states), Edit Distance, Longest Common Subsequence (whole table plus a canonical walk back), Rectangle Cutting, Minimal Grid Path (anti-diagonal frontier), Money Sums, Removal Game (sum minus the opponent's best), Two Sets II (subsets of 1..n − 1), Mountain Range (nearest-≥ boundaries, heights in increasing order, range maximum), Increasing Subsequence (patience with lower bound), Projects (sorted ends plus binary search), Elevator Rides (bitmask with (rides, last weight)), Counting Tilings (broken profile, cell by cell), Counting Numbers (digit DP with BigInt, string answer), Increasing Subsequence II (Fenwick over ranks).

Canonical answers where CSES accepts many: Longest Common Subsequence walks back from the corner and steps up whenever that keeps the length; its cases beyond the sample have unique answers and the stress test only checks validity and length.

- [ ] **Step 2: Sizes that fit the Check budget**

Every hidden case must finish four runs (learner, reference, two variants) inside 4 s: Rectangle Cutting uses 300 × 299, Removal Game n = 3000, Minimal Grid Path n = 1500, Edit Distance 5000 × 5000, Counting Tilings 10 × 1000, Elevator Rides n = 20.

- [ ] **Step 3: Scenes and tests**

Add the `rectangle` view and the `roundedM` fixture; draw `presets.b` under the input in the `text` view; label intervals with their reward; print every slider in the `number` view. In `puzzle-tests.js`, update the dp id list and make the reference check cover every algo puzzle (it stopped at 36, the size of the original catalog).

- [ ] **Step 4: Verify and commit**

Run the Node suite, render the dp scenes headlessly, and run real worker Checks on the slowest puzzles (rectangle-cutting, removal-game, minimal-grid-path, edit-distance, counting-tilings, elevator-rides).

```bash
git add p5sim/tf2_walkthrough/algo/03-dp.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md
git commit -m "feat: complete the Dynamic Programming section of the Algo Lab"
```

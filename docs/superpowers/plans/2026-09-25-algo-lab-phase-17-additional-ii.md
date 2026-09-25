# Algo Lab Phase 17: Additional Problems II Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Additional Problems II section of the Algo Lab, the last one: all 30 CSES tasks in site order, each anchored on the official sample and checked against a brute force or a validator.

**Architecture:** One section file, `algo/17-additional-ii.js`, defining the `additional-ii` section. No new bricks: the tasks reuse the heap, Fenwick, union-find, maximum-flow, minimum-cost-flow and FFT bricks. Grid Coloring II carries its own 2-SAT (Kosaraju on a compact implication graph), and Reversal Sorting its own implicit treap with subtree minima. Three small scene fixtures turn sliders into single-test inputs (bouncing ball tests and knight queries).

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: References and their checks

- [ ] **Step 1: Write every reference and brute force outside the catalog**

Check each reference against its official sample, then stress it against an independent brute force (step-by-step simulation, breadth-first search, subset or partition enumeration, exhaustive operation search) on a few hundred small inputs.

- [ ] **Step 2: Validators for tasks with many answers**

Swap Round Sorting, Binary Subsequences, Coin Grid, Grid Coloring II, Replace with Difference, Grid Puzzle I and II, Reversal Sorting, Same Sum Subsets and Two Stacks Sorting accept any correct answer. Each validator replays or rechecks the answer, and compares its cost or its impossibility verdict with the brute force where one exists. The Reversal Sorting validator applies the reversals with a treap so that large answers stay cheap to check.

- [ ] **Step 3: The two derived algorithms**

Stick Difference: for each k, combine the greedy extremes (the smallest possible longest piece and the largest possible shortest piece) with a staircase Λ(U) of the best shortest piece under a longest-piece bound. A heap sweeps the staircase and a sparse table answers every k. Two Stacks Sorting: check that the clash graph is bipartite (Even and Itai) with a parity union-find, linking only neighbouring values that are not linked yet, so it stays O(n log n). Both are stress-tested beyond the standard rounds.

- [ ] **Step 4: Keep numbers honest**

Values past 2⁵³ travel as decimal strings: the bouncing-ball step counts, turns, cycle lengths and cell counts, Removing Digits II, and the Food Division total.

- [ ] **Step 5: Size hidden cases for the Check**

Hidden cases run at the CSES limits where a Check fits comfortably in the browser worker, and otherwise name the limit in their label.

### Task 2: Section file and tests

- [ ] **Step 1: The section file**

30 puzzles in site order, each with two fast wrong variants that return a wrong, non-null answer on at least one visible case, three hints and the official sample first. Scenes reuse the existing views.

- [ ] **Step 2: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`, and the `ballTest`, `ballGrid` and `pointQuery` fixtures to `puzzle-scenes.js`. In `puzzle-tests.js` add the `additional-ii` track, its id list and the new first unlocked puzzle.

- [ ] **Step 3: Verify and commit**

Run the quick check, both Node suites, the browser suite, the scene smoke test, real worker Checks on every new puzzle and a UI walk with screenshots.

```bash
git add p5sim/tf2_walkthrough/algo/17-additional-ii.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/puzzle-scenes.js
git commit -m "feat: complete the Additional Problems II section of the Algo Lab"
```

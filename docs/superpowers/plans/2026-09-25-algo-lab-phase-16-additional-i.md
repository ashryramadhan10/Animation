# Algo Lab Phase 16: Additional Problems I Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Additional Problems I section of the Algo Lab: all 30 CSES tasks in site order, each anchored on the official sample and checked against a brute force or a validator.

**Architecture:** One section file, `algo/16-additional-i.js`, defining the `additional-i` section. It adds one brick, dominance maximum (the largest x + y among points below and to the left of a query, by an offline sweep over a max-Fenwick tree). It sits just before Nearest Campsites I, and both campsite tasks use it through four reflections. Maximum Building I reuses the section's own Advertisement. The other tasks lean on existing bricks: heaps, Fenwick trees, lower bound, cross sign, multiply-modulo, fast power and matrix power.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md` (the site lists 30 tasks here, not 29; the roadmap is corrected).

---

### Task 1: References and their checks

- [ ] **Step 1: Write every reference and brute force outside the catalog**

Check each reference against its official sample, then stress it against an independent brute force (bubble sort simulation, all-pairs distances, subset enumeration, breadth-first search over positions) on a few hundred small inputs.

- [ ] **Step 2: Validators for tasks with many answers**

Shortest Subsequence, Subarray Sum Constraints, Water Containers Moves, Two Array Average, Permutation Subsequence, Letter Pair Move Game and List of Sums accept any correct answer. Each validator replays or recomputes the answer, and compares its cost or length with the brute force where there is one.

- [ ] **Step 3: Keep the references honest**

References run from their source in the worker, so they carry no helpers from the section file. Letter Pair Move Game retries with random tie-breaks, so it uses an inline generator. For n ≤ 3 it decides by breadth-first search, which proves the impossible starts. For n ≥ 4 it uses a greedy on misplaced B's, then inversions; exhaustive search found every start solvable up to n = 7. Writing Numbers takes and returns decimal strings and counts in BigInt.

- [ ] **Step 4: Size hidden cases for the Check**

Hidden cases run at the CSES limits where a Check fits comfortably in the browser worker, and otherwise name the limit in their label. Nearest Campsites I and II run at n = m = 5·10⁴.

### Task 2: Section file and tests

- [ ] **Step 1: The section file**

31 puzzles in site order: the 30 tasks and the brick, each with two fast wrong variants that return a wrong, non-null answer on at least one visible case, three hints and the official sample first. Scenes reuse the existing views. Multiplication Table gets an odd-n fixture (n = 2k − 1) so its slider only produces valid inputs.

- [ ] **Step 2: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`, and the `roundedOddN` fixture to `puzzle-scenes.js`. In `puzzle-tests.js` add the `additional-i` track, its id list and the new first unlocked puzzle.

- [ ] **Step 3: Verify and commit**

Run the quick check, both Node suites, the browser suite, the scene smoke test, real worker Checks on every new puzzle and a UI walk with screenshots.

```bash
git add p5sim/tf2_walkthrough/algo/16-additional-i.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/puzzle-scenes.js
git commit -m "feat: complete the Additional Problems I section of the Algo Lab"
```

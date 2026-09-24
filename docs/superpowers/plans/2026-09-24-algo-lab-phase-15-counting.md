# Algo Lab Phase 15: Counting Problems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Counting Problems section of the Algo Lab: all 18 CSES tasks in site order, each anchored on the official sample and checked against a brute force.

**Architecture:** One section file, `algo/15-counting.js`, defining the `counting` section. No new bricks: the grid tasks are self-contained dynamic programs (one of them sweeps diagonals with the Fenwick bricks from Sorting), and the combinatorics tasks build on the Math section's multiply-modulo, fast power, factorial tables and binomial bricks. Every answer here is unique, so every task has a brute force.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: References and their checks

- [ ] **Step 1: Write every reference and brute force outside the catalog**

Check each reference against its official sample, then stress it against an independent brute force (enumerating subgrids, permutations, functions or tournaments) on a few hundred small inputs.

- [ ] **Step 2: Keep the modular arithmetic cheap**

Recurrences whose multipliers stay below 5000 (derangements by excedances, Eulerian numbers, the Horner form of the Stirling sums) use plain products, which stay exact below 2⁵³, instead of the split multiply. Counting Sequences needs fast powers only for primes, since i^n is multiplicative. Tournament Graph Distribution works with counts divided by factorials so the chain of components is a plain convolution power.

- [ ] **Step 3: Size hidden cases for the Check**

Hidden cases run at the CSES limits where a Check fits comfortably in the browser worker, and otherwise name the limit in their label.

### Task 2: Section file and tests

- [ ] **Step 1: The section file**

18 puzzles in site order, each with two fast wrong variants that differ from the reference on at least one case, three hints and the official sample first. Scenes reuse the existing letter-grid, grid, text, number and sequence views.

- [ ] **Step 2: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js` add the `counting` track, its id list and the new first unlocked puzzle.

- [ ] **Step 3: Verify and commit**

Run the quick check, both Node suites, the browser suite, the scene smoke test and real worker Checks on every new puzzle.

```bash
git add p5sim/tf2_walkthrough/algo/15-counting.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Counting Problems section of the Algo Lab"
```

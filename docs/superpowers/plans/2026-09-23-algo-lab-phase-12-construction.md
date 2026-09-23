# Algo Lab Phase 12: Construction Problems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Construction Problems section of the Algo Lab: all 8 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a validator for every task.

**Architecture:** One section file, `algo/12-construction.js`, defining the `construction` section. Two bricks, each the feasibility test for the task after it: whether a board can be tiled by L-trominoes, and whether a grid has a Hamiltonian path between two given squares.

Every task here has many correct answers, so every task is judged by a validator rather than by comparing against one answer. The validators are therefore the real specification of the section, and each one is tested by checking that it also accepts the different answers CSES prints in its own samples. They run on the hidden cases too, so each stays close to linear.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Derive the three constructions that are not textbook

- [ ] **Step 1: Distinct Sums Grid**

Exhaustive search shows no grid exists for n of 3 or less, and annealing finds grids for 4 to 7. A cyclic Latin square with its first row and column reversed gets all but one sum distinct, but it packs the sums into a single dense band, so no swap can separate the last pair. The working design starts from the grid whose row i holds only i + 1, which spreads the rows n apart, and reverses the diagonal, which puts the columns in a narrow band between them. That is already valid when n leaves remainder 2 on division by 4. Otherwise one swap of the corner with a cell chosen by n clears the rest; the rule was found by search, with 7 and 9 as the only exceptions, and verified for every n up to 1000.

- [ ] **Step 2: Filling Trominos**

The feasibility rule, three dividing the area with both sides above one and no side of three against an odd side, matches exhaustive search on every board up to 9 by 9. Boards are built from 2 by 3 and 3 by 2 blocks plus one 5 by 9 tiling found by search, which covers the odd by odd cases.

- [ ] **Step 3: Grid Path Construction**

The feasibility rule is the colour condition plus exceptions for widths one, two and three. The width-three exception was decoded from brute force: with b the endpoint of the minority colour, the pair is impossible exactly when b lies two or more columns left of the other endpoint, or sits in the middle row anywhere to its left. The full rule matches brute force on all 9928 ordered pairs of every rectangle up to area 25. The path is built by peeling two-wide strips that avoid both endpoints and splicing a snake through each, splitting the grid between the endpoints when they are apart, and brute forcing only rectangles of twelve squares or fewer.

### Task 2: Section file, tests

- [ ] **Step 1: The section file**

Inverse Inversions takes the largest value while it can absorb a whole row of inversions. Monotone Subsequences uses decreasing blocks of length k, possible exactly when k squared reaches n. Third Permutation repairs a shuffled start by swaps that fix one position without breaking another, which always exist from n = 4. Permutation Prime Sums pairs values to sum to the next prime and recurses on what is left, which Bertrand's postulate makes terminate. Chess Tournament is Havel-Hakimi on the heap bricks from Sorting.

- [ ] **Step 2: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js` add the `construction` track, its id list, the two bricks as single operations and the new first unlocked puzzle.

- [ ] **Step 3: Verify and commit**

Run the Node suites, render the scenes headlessly, and run real worker Checks on all 10 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/12-construction.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Construction Problems section of the Algo Lab"
```

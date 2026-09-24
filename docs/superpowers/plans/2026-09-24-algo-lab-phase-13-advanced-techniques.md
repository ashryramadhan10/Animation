# Algo Lab Phase 13: Advanced Techniques Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Advanced Techniques section of the Algo Lab: all 25 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force or a validator for every task.

**Architecture:** One section file, `algo/13-advanced.js`, defining the `advanced` section. Nine bricks, each placed right before its first user: sorted subset sums (meet in the middle), popcount (bit-parallel counting), treap merge and split (one node format with size, sum and a lazy flip, shared by the three sequence tasks), low-link values (bridges and cut vertices), the fast Fourier transform and polynomial multiplication (three convolution tasks), an undoable union (offline dynamic connectivity) and minimum-cost flow (three flow tasks). The section also reuses bricks from earlier sections: topological order and strongly connected components from Graphs, union-find and modular power, and the Li Chao tree from Geometry.

The site lists 25 tasks, not the 26 the roadmap estimated; the roadmap is corrected.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: References and their checks

- [ ] **Step 1: Write every reference and brute force outside the catalog**

Check each reference against its official sample, then stress it against its brute force on several hundred random small inputs. Answers with more than one correct form (necessary roads and cities, treaps with pending flips, flows, assignments, routes) get validators, and each validator is tested by accepting the answer CSES prints in its own sample.

- [ ] **Step 2: Keep the numbers honest**

Subarray Squares can pass 2⁵³, so it returns a decimal string and runs the same code on BigInt when the total squared is too large for doubles. Monster Game I compares products of intercept and slope differences on BigInt, because those reach 10¹⁸. Everything else stays below 2⁵³ within the CSES limits: Houses and Schools peaks near 9·10¹⁵, and the FFT tasks round results far below the float error.

- [ ] **Step 3: Size the hidden cases for the four-second Check**

A Check runs the learner, the reference and two named mistakes in freshly compiled scopes, which is two to three times slower than warm module code. Hidden cases are sized so every puzzle's hidden cases stay near 2 s in Node, and a label names the CSES limit wherever the case is smaller.

### Task 2: Section file, scenes and tests

- [ ] **Step 1: The section file**

34 puzzles in site order, each with two fast wrong variants that differ from the reference on at least one case, three hints and the official sample first.

- [ ] **Step 2: Scenes**

A treap view that draws node objects by in-order position and depth, honouring pending flips; union-find forests on the graph view; edge-list outputs for Necessary Roads, marked cities for Necessary Cities and tin/low labels for the low-link brick. Graph labels per node are only drawn when the output has one value per node, and grid views only draw outputs that are themselves grids.

- [ ] **Step 3: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js` add the `advanced` track, its id list, the four single-operation bricks and the new first unlocked puzzle. References may link the CSES Handbook or cp-algorithms, since the Handbook does not cover treaps, the FFT, min-cost flow or the DP optimisations.

- [ ] **Step 4: Verify and commit**

Run the quick check, both Node suites, the browser suite, the scene smoke test and real worker Checks on the heaviest puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/13-advanced.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/puzzle-scenes.js
git commit -m "feat: complete the Advanced Techniques section of the Algo Lab"
```

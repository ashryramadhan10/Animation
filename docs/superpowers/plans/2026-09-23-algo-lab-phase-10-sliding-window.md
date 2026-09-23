# Algo Lab Phase 10: Sliding Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Sliding Window section of the Algo Lab: all 11 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force for every task.

**Architecture:** One section file, `algo/10-window.js`, defining the `window` section. Three bricks placed right before their first user: the input generator (before Sliding Window Sum), the monotonic deque (before Sliding Window Minimum) and value compression (before Sliding Window Median).

This is the section where the earlier bricks pay off, and that is the point of it. The generator multiplies two numbers up to a billion, so it needs the split multiplication from Mathematics. Median and Cost ask for an order statistic under insertions and deletions, which is the Fenwick k-th brick from Sorting. Mode needs the smallest value among the most frequent, which is the heap bricks with lazy deletion. Advertisement turns into an upper envelope and uses the Li Chao segment insert from Geometry. Only the deque itself is new.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section file, tests

- [ ] **Step 1: The generated inputs**

The first four tasks take generator parameters rather than an array, because CSES allows ten million elements. Sum, Minimum, Xor and Or each fold the window results together with xor. Two numeric traps live here. A window sum reaches ten to the sixteenth, past the 2 to the 53 where doubles stop counting by ones, and JavaScript's xor operator is 32 bit, so Sum carries its running total and its answer as a high and a low half. Xor is its own inverse so its window folds in and out directly; Or is not, so it uses a queue built from two stacks, which is the general answer for an operation that cannot be undone.

- [ ] **Step 2: The array tasks**

Distinct Values counts with a map. Mode keeps a heap per frequency and pops stale entries lazily. Mex only cares about values up to k, so a segment tree over that range finds the leftmost zero count. Median and Cost sit on a Fenwick tree of counts, with Cost adding a second Fenwick of sums. Inversions counts greater elements on the way in and smaller ones on the way out. Advertisement gives every bar the range of window starts it can serve, which makes each bar a line over a range of starts, and the answer for each start is the upper envelope.

- [ ] **Step 3: Sizes that fit the Check budget**

The four generated tasks answer with one number, so they take two million elements. The array tasks return one value per window, and cloning that array is what the Check actually spends its time on, so they take a hundred thousand.

- [ ] **Step 4: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js` add the `window` track, its id list, the bricks that are single operations and the new first unlocked puzzle.

- [ ] **Step 5: Verify and commit**

Run the Node suites, render the scenes headlessly, and run real worker Checks on all 14 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/10-window.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Sliding Window section of the Algo Lab"
```

# Algo Lab Phase 2: Sorting and Searching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Sorting and Searching section of the Algo Lab: all 35 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with brute-force or validity checks for every task whose answer can be verified independently.

**Architecture:** `algo/02-sorting.js` is rewritten in full and is the source of truth for this phase (the file is too large to duplicate here; it was assembled from four drafts and verified by the test runner). The heap bricks move from the graph section to this one because Room Allocation needs them earlier; the graph file imports them through `core.shared`. Two scene fixtures are added.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section, bricks, tests

- [ ] **Step 1: Bricks in site order**

Bricks are placed right before the first task that needs them: `upper-bound` after `lower-bound`; `fenwick-add`, `fenwick-prefix`, `fenwick-kth` before Concert Tickets; `heap-push`, `heap-pop` before Room Allocation; `prefix-sums` before Subarray Sums II. The section file ends with `core.share({ prefixSums, lowerBound, upperBound, fenwickAdd, fenwickPrefix, fenwickKth, heapPush, heapPop })` so later sections can call them at load time.

- [ ] **Step 2: Tasks**

Distinct Numbers, Apartments, Ferris Wheel, Concert Tickets (Fenwick multiset), Restaurant Customers (sweep), Movie Festival, Sum of Two Values, Maximum Subarray Sum, Stick Lengths (median), Missing Coin Sum, Collecting Numbers, Collecting Numbers II (four affected pairs per swap), Playlist, Towers (patience sorting with upper bound), Traffic Lights (offline reverse with a linked list), Distinct Values Subarrays, Distinct Values Subsequences (split multiplication modulo), Josephus I (queue), Josephus II (Fenwick k-th), Nested Ranges Check and Count, Room Allocation (heap), Factory Machines (BigInt binary search, string answer), Tasks and Deadlines, Reading Books, Sum of Three Values, Sum of Four Values, Nearest Smaller Values (monotonic stack), Subarray Sums I and II, Subarray Divisibility, Distinct Values Subarrays II, Array Division (binary search on the answer), Movie Festival II (Fenwick predecessor), Maximum Subarray Sum II (sliding window minimum).

Canonical answers where CSES accepts many: Room Allocation follows the heap greedy; Sum of Three Values returns the first triple found by the sorted two-pointer sweep; Sum of Four Values returns the first hit of the pair-sum sweep.

- [ ] **Step 3: Graph section**

Remove `heapPush`, `heapPop`, and their two puzzle entries from `algo/04-graphs.js`; add `const { heapPush, heapPop } = core.shared;` after the destructuring line; drop the section's share line.

- [ ] **Step 4: Scenes and tests**

Add the fixtures `roundedDelta` and `roundedBAtLeastA` to the algo scene. In `puzzle-tests.js`, update the sorting and graph id lists and add `upper-bound`, `fenwick-add`, `fenwick-prefix`, `fenwick-kth` to the single-operation bricks that need no hidden case.

- [ ] **Step 5: Verify and commit**

Every mistake variant must run in near-linear time so the hidden cases do not stall Check; five variants were rewritten for that reason during the dry run. Run the Node suite, render the sorting scenes headlessly, and run real worker Checks on the slowest puzzles (nested-ranges-count, movie-festival-ii, room-allocation).

```bash
git add p5sim/tf2_walkthrough/algo/02-sorting.js p5sim/tf2_walkthrough/algo/04-graphs.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Sorting and Searching section of the Algo Lab"
```

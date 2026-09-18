# Algo Lab Phase 5: Range Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Range Queries section of the Algo Lab: all 25 CSES tasks in site order (the roadmap said 22; the site lists 25) plus the bricks they need, each anchored on the official sample, with a brute force for every task.

**Architecture:** `algo/05-range.js` is rewritten in full and is the source of truth for this phase. The three existing segment tree bricks and the two existing tasks keep their ids. New bricks: the sparse table (before Static Range Minimum Queries) and the subarray node merge (before Subarray Sum Queries). Fenwick operations, lower/upper bound and prefix sums come from the sorting section through `core.shared`. Every other structure (minimum trees, descriptor trees, two-dimensional Fenwick tree, lazy trees with set/add and with arithmetic progressions, persistent trees) is written inline in its task.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section and tests

- [ ] **Step 1: Tasks in site order**

Static Range Sum, sparse table brick, Static Range Minimum, the three sum tree bricks, Dynamic Range Sum, Dynamic Range Minimum, Range Xor, Range Update (Fenwick difference array), Forest Queries (2D prefix sums), Hotel Queries (max tree descent), List Removals (Fenwick k-th), Salary Queries (compression + Fenwick), Prefix Sum Queries (sum/best nodes), Pizzeria Queries (two minimum trees), Visible Buildings Queries (next-greater binary lifting), Range Interval Queries (offline value sweep), subarray node merge brick, Subarray Sum Queries I and II, Distinct Values Queries (offline by right endpoint), Distinct Values Queries II (next-occurrence minimum tree with per-value position lists), Increasing Array Queries (binary lifting with piece costs), Movie Festival Queries (successor binary lifting), Forest Queries II (2D Fenwick), Range Updates and Sums (lazy set/add), Polynomial Queries (lazy progressions), Range Queries and Copies (persistent tree), Missing Coin Sum Queries (persistent tree over values).

- [ ] **Step 2: Tests**

Update the range id list and add `subarray-node-merge` to the bricks that need no hidden case.

- [ ] **Step 3: Verify and commit**

Run the Node suite, render the range scenes headlessly, and run real worker Checks on the heaviest puzzles (forest-queries-ii, range-updates-and-sums, polynomial-queries, range-queries-and-copies, missing-coin-sum-queries, distinct-values-queries-ii).

```bash
git add p5sim/tf2_walkthrough/algo/05-range.js p5sim/tf2_walkthrough/puzzle-tests.js docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md
git commit -m "feat: complete the Range Queries section of the Algo Lab"
```

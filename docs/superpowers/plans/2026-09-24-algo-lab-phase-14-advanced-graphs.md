# Algo Lab Phase 14: Advanced Graph Problems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Advanced Graph Problems section of the Algo Lab: all 28 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force or a validator for every task.

**Architecture:** One section file, `algo/14-advanced-graphs.js`, defining the `advanced-graphs` section. Five new bricks, each right before its first user: a path-maximum lifting table and its query (MST Edge Cost), rooted tree codes (both isomorphism tasks), tree centers (unrooted isomorphism) and centroid ancestors (Creating Offices). Most tasks lean on bricks from earlier sections: the heap, union-find and rollback union, low-link values, strongly connected components, topological order, rooted ancestors with LCA, and the Euler tour.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: References and their checks

- [ ] **Step 1: Write every reference and brute force outside the catalog**

Check each reference against its official sample and against the answers CSES prints for tasks with several correct outputs, then stress it against its brute force on a few hundred random small inputs. The brute forces are deliberately independent: exhaustive orientations, subset searches, state-space BFS over (node, coins collected), and Kruskal with forced edges.

- [ ] **Step 2: Validators for tasks with many answers**

Prüfer decoding, the three orientation tasks, graph coloring, the two path split, network renovation, creating offices and new flight routes are judged by what they mean: the same edges in any order, a valid structure, and the optimal count. The centroid brick is judged by the decomposition's properties (connected pieces, halving, true distances), so any valid centroid choice passes.

- [ ] **Step 3: Size hidden cases for the Check**

Hidden cases run at the CSES limits, measured in the browser worker; any smaller case names the limit in its label.

### Task 2: Section file, scenes and tests

- [ ] **Step 1: The section file**

33 puzzles in site order, each with two fast wrong variants that differ from the reference on at least one case, three hints and the official sample first.

- [ ] **Step 2: Scenes**

The graph view gains tree layouts, marked nodes (shops, coins), drawn edge-list outputs (lines or arrows), node-set outputs, places in an order, colorings, the two split paths and centroid depths. A two-trees view shows both trees of the isomorphism tasks.

- [ ] **Step 3: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js` add the `advanced-graphs` track, its id list, the path-maximum query as a single operation and the new first unlocked puzzle.

- [ ] **Step 4: Verify and commit**

Run the quick check, both Node suites, the browser suite, the scene smoke test and real worker Checks on every new puzzle.

```bash
git add p5sim/tf2_walkthrough/algo/14-advanced-graphs.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/puzzle-scenes.js
git commit -m "feat: complete the Advanced Graph Problems section of the Algo Lab"
```

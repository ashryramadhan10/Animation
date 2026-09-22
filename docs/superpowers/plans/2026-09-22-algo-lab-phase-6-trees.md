# Algo Lab Phase 6: Tree Algorithms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Tree Algorithms section of the Algo Lab: all 16 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force or validity check for every task.

**Architecture:** `algo/06-trees.js` is rewritten in full and is the source of truth for this phase. The six existing puzzles keep their ids. Four new bricks: Rooted Ancestors (parent, depth, order and lifting table from an edge list), Lowest Common Ancestor, the Tree Traversal Array (Euler tour) and Heavy Path Decomposition. Three of those four are validated with `accept` rather than compared to one canonical answer, because the depth-first order, the visit order and the tie-breaking between equally large children are all free choices; the tasks built on them return well-defined answers either way. Distinct Colors reuses Distinct Values Queries from the range section through `core.shared`, which is the point of the puzzle: the tour turns a subtree question into a range question.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section, scenes, tests

- [ ] **Step 1: Tasks in site order**

Subordinates, Tree Matching (greedy from the leaves), Tree Diameter, Tree Distances I, Tree Distances II (rerooting), the lifting brick, Company Queries I and II, the two new ancestor bricks, Distance Queries, Counting Paths (tree difference array), the tour brick, Subtree Queries (Fenwick point update, range sum), Path Queries (Fenwick range update, point read), the heavy-path brick, Path Queries II (maximum segment tree over the chains), Distinct Colors, Finding a Centroid, Fixed-Length Paths I (centroid decomposition with a depth tally) and II (centroid decomposition with sorted depths and two pointers).

- [ ] **Step 2: Sizes that fit the Check budget**

Every hidden case must finish four runs (learner, reference, two variants) inside 4 s. The first pass used n = 200 000 everywhere and eight cases ran long, up to 9.3 s; the query-heavy tasks were trimmed to 100 000 and the two centroid-decomposition tasks to 50 000.

- [ ] **Step 3: Scenes and tests**

The tree view now lays out a tree given as an edge list: parents come from a breadth-first walk from node 1 and the layout works from a parent array instead of the ordered boss array. Node values are captioned. New `ancestorTable` fixture for the LCA brick. In `puzzle-tests.js`, update the tree id list and add `tree-lca` to the bricks that need no hidden case.

- [ ] **Step 4: Verify and commit**

Run the Node suite, render the tree scenes headlessly, and run real worker Checks on the heaviest puzzles (path-queries-ii, subtree-queries, path-queries, distinct-colors, counting-paths, fixed-length-paths-i and II, heavy-light-decomposition).

```bash
git add p5sim/tf2_walkthrough/algo/06-trees.js p5sim/tf2_walkthrough/algo/05-range.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Tree Algorithms section of the Algo Lab"
```

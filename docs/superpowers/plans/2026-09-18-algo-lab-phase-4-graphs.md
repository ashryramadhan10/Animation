# Algo Lab Phase 4: Graph Algorithms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Graph Algorithms section of the Algo Lab: all 36 CSES tasks in site order (the roadmap said 34; the site lists 36) plus the bricks they need, each anchored on the official sample input, with a validity check or brute force for every task.

**Architecture:** `algo/04-graphs.js` is rewritten in full and is the source of truth for this phase. Fourteen tasks accept any valid answer on CSES (routes, cycles, orders, circuits, cuts, matchings), so the engine gains an optional `accept(args, actual, expected)` validator per puzzle, run on the main thread, used by the live view, the Check and the test runner in place of the comparator when present. Bricks: Labyrinth path (parent pointers), union-find find and union, maximum flow (Edmonds–Karp). Course Schedule and Planets and Kingdoms double as bricks (their functions are reused by later tasks through dependencies), which is why kingdom labels must follow the topological order of the condensation.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Validator, section, scenes, tests

- [ ] **Step 1: Validator in the engine**

`matchOutput(puzzle, args, actual, expected)` returns the comparator result unless the puzzle has `accept`; the validator returns `true`, or `false`/a reason string. `evaluateLive` takes the live arguments; `evaluateCheck` uses the case arguments. The test runner's `checkStageRange` uses the same rule for the reference and for the "diagnosis differs" assertion.

- [ ] **Step 2: Tasks in site order**

Counting Rooms, Labyrinth (+ path brick), Building Roads, Message Route, Building Teams, Round Trip, Monsters, Shortest Routes I and II, High Score, Flight Discount, Cycle Finding, Flight Routes, Round Trip II, Course Schedule, Longest Flight Route, Game Routes, Investigation, Planets Queries I and II, Planets Cycles, union-find bricks, Road Reparation, Road Construction, Flight Routes Check, Planets and Kingdoms, Giant Pizza, Coin Collector, Mail Delivery, De Bruijn Sequence, Teleporters Path, Hamiltonian Flights, Knight's Tour, maximum flow brick, Download Speed, Police Chase, School Dance, Distinct Routes.

- [ ] **Step 3: Scenes and tests**

Graph view: nodes on an ellipse when a preset gives no positions, arrows when `directed`, self loops marked, `presetD` fixture, any capital letter drawn on grids, generic slider label on number grids. Tests: graph id list, accept-aware stage checks, `dsu-find`, `dsu-union` and `knights-tour` without hidden cases.

- [ ] **Step 4: Verify and commit**

Run the Node suite, render the graph scenes headlessly, and run real worker Checks on the heaviest puzzles (shortest-routes-ii, flight-routes, planets-queries-ii, giant-pizza, mail-delivery, hamiltonian-flights, max-flow, police-chase).

```bash
git add p5sim/tf2_walkthrough/algo/04-graphs.js p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-lab.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md
git commit -m "feat: complete the Graph Algorithms section of the Algo Lab"
```

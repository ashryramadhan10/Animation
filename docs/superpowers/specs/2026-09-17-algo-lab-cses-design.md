# Algo Lab · CSES Core Design

## Purpose

A third puzzle lab, `algo-lab.html`, that teaches the core techniques behind the first six sections of the CSES Problem Set the way the TF2 lab teaches geometry: one plain JavaScript function per puzzle, live scenes, named mistake diagnoses, and bricks that later puzzles reuse. Every puzzle links its section of the free *Competitive Programmer's Handbook* (Antti Laaksonen) as the reference and its CSES task page as the concept link.

## What makes it a judge

Each puzzle has small preset inputs for the live scene and, on Check, one or two hidden generated cases of CSES size (typically 200 000 elements). The worker's 750 ms check budget therefore fails an O(n²) solution with "did not finish", which is the CSES time-limit lesson in its native form. Hidden cases are generated at load with a seeded generator, and their expected outputs are computed by the reference implementation at load, so the catalog stays self-contained.

## Conventions

- References are real JavaScript functions in the catalog; `referenceSource` is their `toString()`. Dependency bricks are file-scope functions so later references can call them at load and the worker injects them at run time.
- Node ids are 1-based as on CSES; arrays returned per node are 0-based (index i holds node i + 1). Grids are arrays of strings. Edges are `[a, b]` or `[a, b, w]`.
- Counting answers are taken modulo 1 000 000 007 using additions only, so no product exceeds 2⁵³.
- A puzzle may set `allowMutation: true`; the engine and tests then skip the input-mutation check. The heap and segment-tree update bricks use it because an in-place structure is the point.
- Where CSES accepts many answers, the puzzle fixes a canonical one and says so: Permutations returns evens then odds, Two Sets uses the pairing construction, Building Roads connects consecutive component representatives (the smallest node of each component), Building Teams gives team 1 to the smallest node of each component.

## Curriculum (36 puzzles, six tracks that unlock in order)

1. **Introductory Problems** (handbook 1, 2, 5): Weird Algorithm, Missing Number, Increasing Array, Permutations, Two Sets, Chessboard and Queens.
2. **Sorting and Searching** (3, 4, 8): Distinct Numbers, prefix sums brick, lower bound brick, Sum of Two Values, Maximum Subarray Sum, Ferris Wheel.
3. **Dynamic Programming** (7): Dice Combinations, Minimizing Coins, Coin Combinations I, Coin Combinations II, Grid Paths, Book Shop.
4. **Graph Algorithms** (11, 12, 13): Counting Rooms, Labyrinth (distance), Building Roads, Building Teams, heap push brick, heap pop brick, Shortest Routes I.
5. **Range Queries** (9): Static Range Sum Queries, build segment tree, point update, range sum query, Dynamic Range Sum Queries.
6. **Tree Algorithms** (14, 18): Subordinates, Tree Diameter, Tree Distances I, binary lifting table, Company Queries I, Company Queries II.

## Lab

`algo-lab.html` is generated from `puzzle-lab.html` with its own copy, loads `algo-puzzles.js`, and sets `window.PUZZLE_LAB_CONFIG` with storage key `algo-lab:v1`, heading "algorithm builds", and a concept link to the CSES task. The case comparison panel truncates long JSON so a 200 000-element case does not flood the page. Header links to the Algo Lab are added to the TF2 lab, the side lab, and the walkthrough.

## Scenes

An `algo` scene kind with views `sequence`, `bars`, `sets`, `board`, `grid`, `number`, `coins`, `shop`, `graph`, `heap`, `segtree`, `tree`. Inputs are chosen with a preset selector plus sliders. Results render as bars, highlighted indices, per-node labels, dashed road segments, a heap drawn as a tree, and segment-tree node sums drawn above their leaves.

## Verification

Node tests: the algo catalog validates, holds 36 puzzles in the listed order, every reference and diagnosis behaves on every case including the hidden ones, every `algo` view builds, and analytic checks hold (prefix sums against static range sums, both coin orders on a one-coin input, segment tree query against a direct sum, LCA of a node with itself). Headless render of the algo lab, the other two labs, the test page, and every `algo` scene.

## Non-Goals

Math, String, Geometry, and advanced sections; path reconstruction outputs; multiple accepted answers.

# Algo Lab · CSES Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `algo-lab.html`, a judge-like puzzle lab with a 36-puzzle catalog covering the first six CSES sections, with hidden CSES-size cases that enforce the intended complexity.

**Architecture:** `algo-puzzles.js` holds references as real functions (`toString()` becomes the source) and generates hidden cases at load; `puzzle-scenes.js` gains an `algo` scene kind; the engine gains `allowMutation`; the lab truncates long case previews.

**Tech Stack:** Vanilla JavaScript, p5.js, Web Workers, Node 22 tests.

**Spec:** `docs/superpowers/specs/2026-09-17-algo-lab-cses-design.md`

---

### Task 1: Engine flag, tests, catalog, scenes, page

- [ ] **Step 1: Engine and lab changes**

In `puzzle-engine.js`, replace the mutation line in `evaluateLive` with:

```js
    if (result.learner.inputMutated && !puzzle.allowMutation) return liveResult("mutation", MUTATION_MESSAGE, { expected, actual: result.learner.value, error: { kind: "mutation", message: MUTATION_MESSAGE } });
```

and the mutation line in `evaluateCheck` with:

```js
      if (result.learner.inputMutated && !puzzle.allowMutation) return { pass: false, kind: "mutation", message: MUTATION_MESSAGE + " Case: " + testCase.label + ".", caseIndex: index, testCase };
```

In `puzzle-tests.js`, replace the mutation assertion inside `checkStageRange` with:

```js
        assert(puzzle.allowMutation || !result.learner.inputMutated, puzzle.id + " reference mutated input on " + testCase.label);
```

Append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- algo lab (cses)
  const algoCatalog = load("./algo-puzzles.js", "AlgoPuzzles");
  function algoApi() {
    const api = requireApi(algoCatalog, "algo-puzzles.js");
    return { TF2_PUZZLES: api.ALGO_PUZZLES, TF2_PUZZLE_TRACKS: api.ALGO_PUZZLE_TRACKS, getPuzzle: api.getPuzzle };
  }

  test("algo catalog lists the six CSES sections and validates", () => {
    withCatalog(algoApi(), () => {
      const engineApi = requireApi(engine, "puzzle-engine.js");
      const status = engineApi.validateCatalog(puzzleList(), scenesApi().SCENE_KINDS);
      assert(status.valid, status.message);
      assert(puzzleList().length === 36, "algo catalog should hold 36 puzzles");
      same(puzzlesApi().TF2_PUZZLE_TRACKS.map((track) => track.id), ["intro", "sorting", "dp", "graphs", "range", "trees"]);
      same(idsInRange(1, 6), ["weird-algorithm", "missing-number", "increasing-array", "permutations", "two-sets", "chessboard-and-queens"]);
      same(idsInRange(7, 12), ["distinct-numbers", "prefix-sums", "lower-bound", "sum-of-two-values", "maximum-subarray-sum", "ferris-wheel"]);
      same(idsInRange(13, 18), ["dice-combinations", "minimizing-coins", "coin-combinations-i", "coin-combinations-ii", "grid-paths", "book-shop"]);
      same(idsInRange(19, 25), ["counting-rooms", "labyrinth", "building-roads", "building-teams", "heap-push", "heap-pop", "shortest-routes"]);
      same(idsInRange(26, 30), ["static-range-sum-queries", "build-segment-tree", "segment-tree-update", "segment-tree-query", "dynamic-range-sum-queries"]);
      same(idsInRange(31, 36), ["subordinates", "tree-diameter", "tree-distances", "binary-lifting-table", "kth-ancestor", "company-queries-ii"]);
      puzzleList().forEach((puzzle) => {
        assert(/^https:\/\/cses\.fi\/book\//.test(puzzle.reference.url), puzzle.id + " should link the handbook");
        assert(/^\d+$/.test(puzzle.walkthroughChapter), puzzle.id + " should carry its CSES task id");
        const singleOperation = [6, 9, 23, 24, 28, 29, 35].includes(puzzle.number);
        assert(singleOperation || puzzle.cases.some((entry) => /time limit/.test(entry.label)), puzzle.id + " needs a hidden time-limit case");
        const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
        assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes");
      });
    });
  });

  test("algo catalog references pass their cases and diagnoses differ", () => {
    withCatalog(algoApi(), () => checkStageRange(1, 36));
  });

  test("scenes: algo views build valid arguments and analytic checks hold", () => {
    withCatalog(algoApi(), () => {
      checkSceneKinds(["algo"]);
      const api = puzzlesApi();
      const values = [3, 2, 4, 5, 1, 1, 5, 3];
      const prefix = referenceOutput(api.getPuzzle("prefix-sums"), [values]);
      const sums = referenceOutput(api.getPuzzle("static-range-sum-queries"), [values, [[2, 4], [1, 8]]]);
      near(sums[0], prefix[4] - prefix[1]); near(sums[1], prefix[8]);
      near(referenceOutput(api.getPuzzle("coin-combinations-i"), [[1], 7]), 1);
      near(referenceOutput(api.getPuzzle("coin-combinations-ii"), [[1], 7]), 1);
      const tree = referenceOutput(api.getPuzzle("build-segment-tree"), [values]);
      near(referenceOutput(api.getPuzzle("segment-tree-query"), [tree, 2, 5]), 4 + 5 + 1 + 1);
      const answers = referenceOutput(api.getPuzzle("company-queries-ii"), [5, [1, 1, 2, 3], [[4, 4], [4, 2]]]);
      same(answers, [4, 2]);
    });
  });
```

In `puzzle-lab.js`, replace the row-rendering line in `renderComparison` with:

```js
      "<div class=\"case-row\"><span>" + row[0] + "</span><code>" + escapeHtml(preview(row[1])) + "</code></div>"
```

and insert directly after the closing `}` of `renderComparison` (after `    dom.caseComparison.hidden = false;\n  }\n`):

```js

  function preview(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (typeof text !== "string") return String(text);
    return text.length > 600 ? text.slice(0, 600) + "\n… (" + (text.length - 600) + " more characters)" : text;
  }
```

Because Check runs the learner, the reference, and every diagnosis variant on each case, a lab whose hidden cases take a few hundred milliseconds needs a larger check budget. Replace the session line in `initialize` with:

```js
    session = root.createLiveSession({ workerUrl: "puzzle-worker.js", checkTimeoutMs: config.checkTimeoutMs || 750 });
```

- [ ] **Step 2: Catalog**

Create `p5sim/tf2_walkthrough/algo-puzzles.js`:

```js
(function defineAlgoPuzzles(root) {
  "use strict";

  const MOD = 1000000007;
  const BOOK_URL = "https://cses.fi/book/book.pdf";
  const CSES_URL = "https://cses.fi/problemset/task/";
  const BIG = 200000;

  const STAGES = Object.freeze([
    { id: "intro", title: "Introductory Problems", subtitle: "Simulation, arithmetic, greedy scans, constructions, backtracking.", range: [1, 6] },
    { id: "sorting", title: "Sorting and Searching", subtitle: "Sort then scan, prefix sums, binary search, two pointers, Kadane.", range: [7, 12] },
    { id: "dp", title: "Dynamic Programming", subtitle: "Dice, coins in both loop orders, grid paths, knapsack.", range: [13, 18] },
    { id: "graphs", title: "Graph Algorithms", subtitle: "Flood fill, BFS, components, bipartite colouring, a heap, Dijkstra.", range: [19, 25] },
    { id: "range", title: "Range Queries", subtitle: "Prefix sums, then a segment tree: build, update, query.", range: [26, 30] },
    { id: "trees", title: "Tree Algorithms", subtitle: "Subtree sizes, diameter, all distances, binary lifting, LCA.", range: [31, 36] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "intro", title: "1 · Introductory Problems", stages: [STAGES[0]] }),
    Object.freeze({ id: "sorting", title: "2 · Sorting and Searching", unlockAfter: "chessboard-and-queens", note: "Unlocks after Chessboard and Queens.", stages: [STAGES[1]] }),
    Object.freeze({ id: "dp", title: "3 · Dynamic Programming", unlockAfter: "ferris-wheel", note: "Unlocks after Ferris Wheel.", stages: [STAGES[2]] }),
    Object.freeze({ id: "graphs", title: "4 · Graph Algorithms", unlockAfter: "book-shop", note: "Unlocks after Book Shop.", stages: [STAGES[3]] }),
    Object.freeze({ id: "range", title: "5 · Range Queries", unlockAfter: "shortest-routes", note: "Unlocks after Shortest Routes I.", stages: [STAGES[4]] }),
    Object.freeze({ id: "trees", title: "6 · Tree Algorithms", unlockAfter: "dynamic-range-sum-queries", note: "Unlocks after Dynamic Range Sum Queries.", stages: [STAGES[5]] }),
  ]);

  function src(fn) { return fn.toString(); }
  function lines() { return Array.from(arguments).join("\n"); }
  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function example(args, expected, label) { return Object.freeze({ args, expected, label }); }
  function run(solve, args, label) { return example(args, solve.apply(null, clone(args)), label); }
  function diagnosis(id, message, fn) { return Object.freeze({ id, message, source: src(fn) }); }
  function book(section, title) { return Object.freeze({ label: "Handbook · " + section + " " + title, url: BOOK_URL }); }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomInts(seed, count, lo, hi) {
    const next = rng(seed);
    const out = new Array(count);
    for (let i = 0; i < count; i += 1) out[i] = lo + Math.floor(next() * (hi - lo + 1));
    return out;
  }
  function randomGrid(seed, rows, cols, wall, wallChar, floorChar, ratio) {
    const next = rng(seed);
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      let row = "";
      for (let c = 0; c < cols; c += 1) row += next() < ratio ? wallChar : floorChar;
      out.push(row);
    }
    return out;
  }
  function randomTreeBosses(seed, n, chain) {
    const next = rng(seed);
    const bosses = [];
    for (let v = 2; v <= n; v += 1) bosses.push(v <= chain ? v - 1 : 1 + Math.floor(next() * (v - 1)));
    return bosses;
  }
  function edgesFromBosses(bosses) { return bosses.map((boss, i) => [boss, i + 2]); }

  function puzzle(config) {
    const stage = STAGES.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Algo puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      reading: null,
      allowMutation: false,
      ...config,
      stage: stage.id,
      walkthroughChapter: String(config.cses.id),
      referenceSource: src(config.solve),
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(config.scene.handles.map((handle) => Object.freeze(handle))),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }
  function preset(id, options, extra) {
    return [{ id: "preset", type: "selector", label: "input", value: options[0], options }].concat(extra || []);
  }

  // ------------------------------------------------------------------ 1 · introductory
  function weirdAlgorithm(n) {
    const sequence = [n];
    while (n !== 1) {
      n = n % 2 === 0 ? n / 2 : 3 * n + 1;
      sequence.push(n);
    }
    return sequence;
  }
  function missingNumber(values, n) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i];
    return n * (n + 1) / 2 - sum;
  }
  function increasingArray(values) {
    let moves = 0, floor = -Infinity;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] < floor) moves += floor - values[i];
      else floor = values[i];
    }
    return moves;
  }
  function permutations(n) {
    if (n === 1) return [1];
    if (n < 4) return [];
    const out = [];
    for (let even = 2; even <= n; even += 2) out.push(even);
    for (let odd = 1; odd <= n; odd += 2) out.push(odd);
    return out;
  }
  function twoSets(n) {
    const total = n * (n + 1) / 2;
    if (total % 2 !== 0) return { possible: false, a: [], b: [] };
    const a = [], b = [];
    let start = 1;
    if (n % 4 === 3) { a.push(1, 2); b.push(3); start = 4; }
    for (let i = start; i <= n; i += 4) { a.push(i, i + 3); b.push(i + 1, i + 2); }
    return { possible: true, a, b };
  }
  function chessboardAndQueens(board) {
    const cols = new Array(8).fill(false), diag1 = new Array(15).fill(false), diag2 = new Array(15).fill(false);
    let count = 0;
    const place = (row) => {
      if (row === 8) { count += 1; return; }
      for (let col = 0; col < 8; col += 1) {
        if (board[row][col] === "*" || cols[col] || diag1[row + col] || diag2[row - col + 7]) continue;
        cols[col] = diag1[row + col] = diag2[row - col + 7] = true;
        place(row + 1);
        cols[col] = diag1[row + col] = diag2[row - col + 7] = false;
      }
    };
    place(0);
    return count;
  }

  const SAMPLE_BOARD = ["........", "........", "..*.....", "........", "........", ".....**.", "...*....", "........"];
  const EMPTY_BOARD = ["........", "........", "........", "........", "........", "........", "........", "........"];
  const MISSING_BIG = (() => { const out = []; for (let v = 1; v <= BIG; v += 1) if (v !== 123457) out.push(v); return out; })();

  const INTRO = [
    puzzle({
      number: 1, id: "weird-algorithm", track: "intro", title: "Weird Algorithm", cses: { id: 1068, name: "Weird Algorithm" },
      goal: "Simulate the Collatz rule until n reaches 1 and return every value seen.",
      concept: "Most introductory tasks are exact simulation: write the rule, loop until the stopping condition, do not guess a formula.",
      functionName: "weirdAlgorithm", signature: "weirdAlgorithm(n) → array",
      starterSource: starter("weirdAlgorithm", "n", "even → n / 2, odd → 3n + 1; include n itself and the final 1."),
      solve: weirdAlgorithm, comparator: "deep",
      reference: book("1.4", "Working with input and output · simulation"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 30 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("stops-before-one", "The sequence must end with the final 1.", function weirdAlgorithm(n) { const sequence = [n]; while (n > 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; if (n !== 1) sequence.push(n); } return sequence; }),
        diagnosis("odd-rule-wrong", "For odd n the rule is 3n + 1, not n + 1.", function weirdAlgorithm(n) { const sequence = [n]; while (n !== 1) { n = n % 2 === 0 ? n / 2 : n + 1; sequence.push(n); } return sequence; }),
      ],
      hints: ["Start the array with n.", "Loop while n is not 1; halve even values, otherwise 3n + 1.", "Push each new value; the last one pushed is 1."],
      cases: [
        example([3], [3, 10, 5, 16, 8, 4, 2, 1], "CSES sample"),
        example([1], [1], "already one"),
        example([6], [6, 3, 10, 5, 16, 8, 4, 2, 1], "six"),
        run(weirdAlgorithm, [27], "27 takes 111 steps"),
        run(weirdAlgorithm, [837799], "n = 837799, time limit"),
      ],
    }),
    puzzle({
      number: 2, id: "missing-number", track: "intro", title: "Missing Number", cses: { id: 1083, name: "Missing Number" },
      goal: "Find the one number from 1 to n that is absent.",
      concept: "Arithmetic beats searching: the sum 1 + … + n is n(n + 1) / 2, so the missing value is that minus the sum you were given.",
      functionName: "missingNumber", signature: "missingNumber(values, n) → number",
      starterSource: starter("missingNumber", "values, n"),
      solve: missingNumber, comparator: "scalar",
      reference: book("1.4", "Working with numbers · sum formula"),
      scene: { kind: "algo", view: "bars", handles: preset("missing-number", ["five", "eight", "missing at the end"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("sum-to-n-minus-one", "The full sum is n(n + 1) / 2, not n(n − 1) / 2.", function missingNumber(values, n) { let sum = 0; for (let i = 0; i < values.length; i += 1) sum += values[i]; return n * (n - 1) / 2 - sum; }),
        diagnosis("returns-count", "That returns how many numbers are missing, not which one.", function missingNumber(values, n) { return n - values.length; }),
      ],
      hints: ["Add up the values you were given.", "The complete sum is n(n + 1) / 2.", "Subtract."],
      cases: [
        example([[2, 3, 1, 5], 5], 4, "CSES sample"),
        example([[1], 2], 2, "missing at the end"),
        example([[2], 2], 1, "missing at the start"),
        run(missingNumber, [MISSING_BIG, BIG], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 3, id: "increasing-array", track: "intro", title: "Increasing Array", cses: { id: 1094, name: "Increasing Array" },
      goal: "Count the minimum number of +1 moves that make the array non-decreasing.",
      concept: "A single greedy pass: carry the highest value seen so far and lift every smaller element up to it.",
      functionName: "increasingArray", signature: "increasingArray(values) → number",
      starterSource: starter("increasingArray", "values"),
      solve: increasingArray, comparator: "scalar",
      reference: book("6", "Greedy algorithms"),
      scene: { kind: "algo", view: "bars", handles: preset("increasing-array", ["sample", "already sorted", "flat", "big drop"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("compares-to-previous-original", "Compare with the raised value of the previous element, not its original value.", function increasingArray(values) { let moves = 0; for (let i = 1; i < values.length; i += 1) if (values[i] < values[i - 1]) moves += values[i - 1] - values[i]; return moves; }),
        diagnosis("counts-violations", "Count the total increase needed, not the number of elements that need raising.", function increasingArray(values) { let moves = 0, floor = -Infinity; for (let i = 0; i < values.length; i += 1) { if (values[i] < floor) moves += 1; else floor = values[i]; } return moves; }),
      ],
      hints: ["Keep the current floor: the largest value seen so far.", "If an element is below the floor, add the gap to the answer.", "Otherwise the element becomes the new floor."],
      cases: [
        example([[3, 2, 5, 1, 7]], 5, "CSES sample"),
        example([[1, 2, 3]], 0, "already increasing"),
        example([[10, 1, 1]], 18, "big drop"),
        example([[5, 5, 5]], 0, "flat"),
        run(increasingArray, [randomInts(3, BIG, 1, 1000000000)], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 4, id: "permutations", track: "intro", title: "Permutations", cses: { id: 1070, name: "Permutations" },
      goal: "Arrange 1..n so that no two adjacent numbers differ by exactly one; return [] when impossible.",
      concept: "A constructive answer: all evens then all odds keeps neighbours two apart. This lab expects that exact arrangement.",
      functionName: "permutations", signature: "permutations(n) → array",
      starterSource: starter("permutations", "n", "n = 1 → [1]; n = 2 or 3 → []; otherwise evens ascending then odds ascending."),
      solve: permutations, comparator: "deep",
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "bars", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("odds-first", "Odds first then evens puts n−1 and n next to each other for odd n; use evens first.", function permutations(n) { if (n === 1) return [1]; if (n < 4) return []; const out = []; for (let odd = 1; odd <= n; odd += 2) out.push(odd); for (let even = 2; even <= n; even += 2) out.push(even); return out; }),
        diagnosis("no-small-cases", "n = 2 and n = 3 have no valid arrangement; return [].", function permutations(n) { const out = []; for (let even = 2; even <= n; even += 2) out.push(even); for (let odd = 1; odd <= n; odd += 2) out.push(odd); return out; }),
      ],
      hints: ["Handle n = 1, 2, 3 by hand.", "Push 2, 4, 6, … then 1, 3, 5, ….", "Return the combined array."],
      cases: [
        example([5], [2, 4, 1, 3, 5], "CSES sample"),
        example([1], [1], "single"),
        example([3], [], "impossible"),
        example([4], [2, 4, 1, 3], "four"),
        run(permutations, [BIG], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 5, id: "two-sets", track: "intro", title: "Two Sets", cses: { id: 1092, name: "Two Sets" },
      goal: "Split 1..n into two sets with equal sums, or report that it is impossible.",
      concept: "Parity decides: the total n(n + 1) / 2 must be even. The construction pairs i with i + 3 against i + 1 with i + 2.",
      functionName: "twoSets", signature: "twoSets(n) → { possible, a, b }",
      starterSource: starter("twoSets", "n", "n % 4 == 3 → a starts [1, 2], b starts [3], continue from 4; then blocks of four: a gets i, i + 3; b gets i + 1, i + 2."),
      solve: twoSets, comparator: "deep",
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "sets", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 16 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("parity-only", "Knowing it is possible is not enough; build the two sets.", function twoSets(n) { const total = n * (n + 1) / 2; return { possible: total % 2 === 0, a: [], b: [] }; }),
        diagnosis("alternating", "Odd numbers in a and even numbers in b do not have equal sums; use blocks of four.", function twoSets(n) { const total = n * (n + 1) / 2; if (total % 2 !== 0) return { possible: false, a: [], b: [] }; const a = [], b = []; for (let i = 1; i <= n; i += 1) (i % 2 === 1 ? a : b).push(i); return { possible: true, a, b }; }),
      ],
      hints: ["If n(n + 1) / 2 is odd, it is impossible.", "When n % 4 == 3, place 1 and 2 in a, 3 in b, and continue from 4.", "For each block i, i+1, i+2, i+3: a gets i and i+3, b gets i+1 and i+2."],
      cases: [
        example([7], { possible: true, a: [1, 2, 4, 7], b: [3, 5, 6] }, "CSES sample"),
        example([6], { possible: false, a: [], b: [] }, "odd total"),
        example([4], { possible: true, a: [1, 4], b: [2, 3] }, "one block"),
        example([3], { possible: true, a: [1, 2], b: [3] }, "three"),
        run(twoSets, [BIG], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 6, id: "chessboard-and-queens", track: "intro", title: "Chessboard and Queens", cses: { id: 1624, name: "Chessboard and Queens" },
      goal: "Count the ways to place eight queens on a board with some reserved squares.",
      concept: "Backtracking: place one queen per row, track used columns and both diagonals, undo on the way back.",
      functionName: "chessboardAndQueens", signature: "chessboardAndQueens(board) → number",
      starterSource: starter("chessboardAndQueens", "board", "board is eight strings; '*' is reserved. Diagonals: row + col and row − col + 7."),
      solve: chessboardAndQueens, comparator: "scalar",
      reference: book("5.3", "Backtracking · queen problem"),
      scene: { kind: "algo", view: "board", handles: preset("chessboard-and-queens", ["empty", "CSES sample", "blocked corners", "blocked row"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-diagonals", "Queens also attack along diagonals; track row + col and row − col.", function chessboardAndQueens(board) { const cols = new Array(8).fill(false); let count = 0; const place = (row) => { if (row === 8) { count += 1; return; } for (let col = 0; col < 8; col += 1) { if (board[row][col] === "*" || cols[col]) continue; cols[col] = true; place(row + 1); cols[col] = false; } }; place(0); return count; }),
        diagnosis("ignores-reserved", "Reserved squares cannot hold a queen.", function chessboardAndQueens(board) { const cols = new Array(8).fill(false), diag1 = new Array(15).fill(false), diag2 = new Array(15).fill(false); let count = 0; const place = (row) => { if (row === 8) { count += 1; return; } for (let col = 0; col < 8; col += 1) { if (cols[col] || diag1[row + col] || diag2[row - col + 7]) continue; cols[col] = diag1[row + col] = diag2[row - col + 7] = true; place(row + 1); cols[col] = diag1[row + col] = diag2[row - col + 7] = false; } }; place(0); return count; }),
      ],
      hints: ["Recurse row by row; when row reaches 8, count one placement.", "A column is free if no earlier queen used it and neither diagonal (row + col, row − col + 7) is taken.", "Mark, recurse, unmark."],
      cases: [
        example([SAMPLE_BOARD], 65, "CSES sample"),
        example([EMPTY_BOARD], 92, "empty board"),
        example([["********", "........", "........", "........", "........", "........", "........", "........"]], 0, "first row reserved"),
        run(chessboardAndQueens, [["*.......", "*.......", "*.......", "*.......", "*.......", "*.......", "*.......", "*......."]], "first column reserved"),
      ],
    }),
  ];

  // ------------------------------------------------------------------ 2 · sorting and searching
  function distinctNumbers(values) {
    const sorted = values.slice().sort((p, q) => p - q);
    let count = 0;
    for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) count += 1;
    return count;
  }
  function prefixSums(values) {
    const prefix = [0];
    for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] + values[i]);
    return prefix;
  }
  function lowerBound(sorted, x) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function sumOfTwoValues(values, target) {
    const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q);
    let lo = 0, hi = order.length - 1;
    while (lo < hi) {
      const sum = values[order[lo]] + values[order[hi]];
      if (sum === target) {
        const a = order[lo] + 1, b = order[hi] + 1;
        return a < b ? [a, b] : [b, a];
      }
      if (sum < target) lo += 1;
      else hi -= 1;
    }
    return null;
  }
  function maximumSubarraySum(values) {
    let best = values[0], current = values[0];
    for (let i = 1; i < values.length; i += 1) {
      current = Math.max(values[i], current + values[i]);
      best = Math.max(best, current);
    }
    return best;
  }
  function ferrisWheel(weights, x) {
    const sorted = weights.slice().sort((p, q) => p - q);
    let lo = 0, hi = sorted.length - 1, gondolas = 0;
    while (lo <= hi) {
      if (lo !== hi && sorted[lo] + sorted[hi] <= x) lo += 1;
      hi -= 1;
      gondolas += 1;
    }
    return gondolas;
  }

  const PAIR_BIG = (() => { const out = randomInts(11, BIG, 1, 500000000).map((v) => v * 2); out[777] = 123457; out[199999] = 1000000001 - 123457; return out; })();

  const SORTING = [
    puzzle({
      number: 7, id: "distinct-numbers", track: "sorting", title: "Distinct Numbers", cses: { id: 1621, name: "Distinct Numbers" },
      goal: "Count how many different values appear.",
      concept: "Sort first, then a single scan sees equal values next to each other. Sorting turns many O(n²) questions into O(n log n).",
      functionName: "distinctNumbers", signature: "distinctNumbers(values) → number",
      starterSource: starter("distinctNumbers", "values", "Sort a copy, count positions where the value changes."),
      solve: distinctNumbers, comparator: "scalar",
      reference: book("3.1", "Sorting theory · why sorting helps"),
      scene: { kind: "algo", view: "bars", handles: preset("distinct-numbers", ["sample", "all same", "all different"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("scan-without-sort", "Adjacent comparison only works after sorting.", function distinctNumbers(values) { let count = 0; for (let i = 0; i < values.length; i += 1) if (i === 0 || values[i] !== values[i - 1]) count += 1; return count; }),
        diagnosis("returns-length", "That counts all values, duplicates included.", function distinctNumbers(values) { return values.length; }),
      ],
      hints: ["Copy and sort with a numeric comparator: (a, b) => a − b.", "Walk the sorted array.", "Count an element when it differs from the one before it (the first always counts)."],
      cases: [
        example([[2, 3, 2, 2, 3]], 2, "CSES sample"),
        example([[4, 4, 4]], 1, "all same"),
        example([[1, 2, 3]], 3, "all different"),
        run(distinctNumbers, [randomInts(7, BIG, 1, 1000)], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 8, id: "prefix-sums", track: "sorting", title: "Prefix Sums", cses: { id: 1646, name: "Static Range Sum Queries (brick)" },
      goal: "Build the array prefix where prefix[i] is the sum of the first i values (prefix[0] = 0).",
      concept: "One pass of preprocessing makes every range sum a subtraction. The leading zero is what keeps the arithmetic clean.",
      functionName: "prefixSums", signature: "prefixSums(values) → array of length n + 1",
      starterSource: starter("prefixSums", "values"),
      solve: prefixSums, comparator: "deep",
      reference: book("9.1", "Static array queries · sum queries"),
      scene: { kind: "algo", view: "bars", handles: preset("prefix-sums", ["sample", "with negatives", "ones"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-leading-zero", "prefix[0] must be 0 so that prefix[r] − prefix[l − 1] works for l = 1.", function prefixSums(values) { const prefix = []; let sum = 0; for (let i = 0; i < values.length; i += 1) { sum += values[i]; prefix.push(sum); } return prefix; }),
        diagnosis("skips-first", "Every value must be included, starting with values[0].", function prefixSums(values) { const prefix = [0]; for (let i = 1; i < values.length; i += 1) prefix.push(prefix[i - 1] + values[i]); return prefix; }),
      ],
      hints: ["Start with [0].", "prefix[i + 1] = prefix[i] + values[i].", "The result has one more entry than the input."],
      cases: [
        example([[1, 2, 3]], [0, 1, 3, 6], "three values"),
        example([[]], [0], "empty"),
        example([[5, -2]], [0, 5, 3], "with a negative"),
        run(prefixSums, [randomInts(8, BIG, 1, 1000000000)], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 9, id: "lower-bound", track: "sorting", title: "Lower Bound", cses: { id: 1091, name: "Concert Tickets (brick)" },
      goal: "Return the first index whose value is at least x, or the length when none is.",
      concept: "Binary search halves the range each step: keep an invariant like 'everything before lo is smaller than x' and it cannot go wrong.",
      functionName: "lowerBound", signature: "lowerBound(sorted, x) → index",
      starterSource: starter("lowerBound", "sorted, x", "lo = 0, hi = length; while lo < hi: mid; if sorted[mid] < x then lo = mid + 1 else hi = mid."),
      solve: lowerBound, comparator: "scalar",
      reference: book("3.3", "Binary search"),
      scene: { kind: "algo", view: "bars", handles: preset("lower-bound", ["sample", "with gaps"], [{ id: "x", type: "slider", label: "x (rounded)", value: 4, min: 0, max: 10 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("upper-bound", "That finds the first value greater than x; lower bound wants at least x.", function lowerBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; } return lo; }),
        diagnosis("off-by-one", "The answer is lo itself, not lo − 1.", function lowerBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; } return lo - 1; }),
      ],
      hints: ["lo = 0, hi = sorted.length.", "mid = (lo + hi) >> 1; if sorted[mid] < x move lo past mid, else hi = mid.", "Stop when lo == hi and return lo."],
      cases: [
        example([[1, 3, 3, 5], 3], 1, "first of the equal values"),
        example([[1, 3, 3, 5], 4], 3, "between values"),
        example([[1, 3, 3, 5], 6], 4, "beyond the end"),
        example([[1, 3, 3, 5], 0], 0, "before the start"),
        example([[], 1], 0, "empty"),
        run(lowerBound, [randomInts(9, BIG, 1, 1000000000).sort((p, q) => p - q), 500000000], "n = 200 000"),
      ],
    }),
    puzzle({
      number: 10, id: "sum-of-two-values", track: "sorting", title: "Sum of Two Values", cses: { id: 1640, name: "Sum of Two Values" },
      goal: "Find two positions (1-based, ascending) whose values add up to the target, or null.",
      concept: "Sort the indexes by value and walk two pointers inwards: a small sum moves the left pointer, a large sum moves the right one.",
      functionName: "sumOfTwoValues", signature: "sumOfTwoValues(values, target) → [i, j] or null",
      starterSource: starter("sumOfTwoValues", "values, target", "Sort an index array by value; two pointers; return original positions + 1 in ascending order."),
      solve: sumOfTwoValues, comparator: "deep",
      reference: book("8.1", "Two pointers method · 2SUM"),
      scene: { kind: "algo", view: "bars", handles: preset("sum-of-two-values", ["sample", "no pair", "equal halves"], [{ id: "target", type: "slider", label: "target (rounded)", value: 9, min: 2, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("moves-wrong-pointer", "When the sum is too small, move the left pointer up; the right pointer only moves when the sum is too large.", function sumOfTwoValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); let lo = 0, hi = order.length - 1; while (lo < hi) { const sum = values[order[lo]] + values[order[hi]]; if (sum === target) { const a = order[lo] + 1, b = order[hi] + 1; return a < b ? [a, b] : [b, a]; } hi -= 1; } return null; }),
        diagnosis("zero-based", "CSES positions are 1-based.", function sumOfTwoValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); let lo = 0, hi = order.length - 1; while (lo < hi) { const sum = values[order[lo]] + values[order[hi]]; if (sum === target) { const a = order[lo], b = order[hi]; return a < b ? [a, b] : [b, a]; } if (sum < target) lo += 1; else hi -= 1; } return null; }),
      ],
      hints: ["Sorting the values loses their positions, so sort an array of indexes instead.", "lo at the smallest, hi at the largest; compare their sum with the target.", "Return the two original positions + 1, smaller first."],
      cases: [
        example([[2, 7, 5, 1], 9], [1, 2], "CSES sample"),
        example([[1, 2, 3], 7], null, "no pair"),
        example([[3, 3], 6], [1, 2], "equal halves"),
        example([[4, 1, 5, 9], 6], [2, 3], "unsorted input"),
        run(sumOfTwoValues, [PAIR_BIG, 1000000001], "n = 200 000 with one pair, time limit"),
        run(sumOfTwoValues, [randomInts(12, BIG, 1, 500000000).map((v) => v * 2), 1000000001], "n = 200 000 without a pair, time limit"),
      ],
    }),
    puzzle({
      number: 11, id: "maximum-subarray-sum", track: "sorting", title: "Maximum Subarray Sum", cses: { id: 1643, name: "Maximum Subarray Sum" },
      goal: "Return the largest sum of a non-empty contiguous subarray.",
      concept: "Kadane's rule: at each position either extend the best subarray ending before it or start fresh, whichever is larger.",
      functionName: "maximumSubarraySum", signature: "maximumSubarraySum(values) → number",
      starterSource: starter("maximumSubarraySum", "values", "current = max(v, current + v); best = max(best, current)."),
      solve: maximumSubarraySum, comparator: "scalar",
      reference: book("2.4", "Estimating efficiency · maximum subarray sum"),
      scene: { kind: "algo", view: "bars", handles: preset("maximum-subarray-sum", ["CSES sample", "all negative", "alternating"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-empty", "The subarray must be non-empty; when every value is negative the answer is the largest value, not 0.", function maximumSubarraySum(values) { let best = 0, current = 0; for (let i = 0; i < values.length; i += 1) { current = Math.max(0, current + values[i]); best = Math.max(best, current); } return best; }),
        diagnosis("sums-positives", "Positive values that are separated by negatives cannot all be taken.", function maximumSubarraySum(values) { let sum = 0; for (let i = 0; i < values.length; i += 1) if (values[i] > 0) sum += values[i]; return sum; }),
      ],
      hints: ["Track the best sum ending at the current position.", "current = max(values[i], current + values[i]).", "The answer is the maximum current seen."],
      cases: [
        example([[-1, 3, -2, 5, 3, -5, 2, 2]], 9, "CSES sample"),
        example([[-3, -1, -2]], -1, "all negative"),
        example([[5]], 5, "single"),
        example([[2, -1, 2, -1, 2]], 4, "alternating"),
        run(maximumSubarraySum, [randomInts(13, BIG, -1000000000, 1000000000)], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 12, id: "ferris-wheel", track: "sorting", title: "Ferris Wheel", cses: { id: 1090, name: "Ferris Wheel" },
      goal: "Minimum gondolas when each gondola holds at most two children with total weight at most x.",
      concept: "Sort, then pair the heaviest child with the lightest one if they fit; otherwise the heaviest rides alone. Two pointers make it one pass.",
      functionName: "ferrisWheel", signature: "ferrisWheel(weights, x) → number",
      starterSource: starter("ferrisWheel", "weights, x"),
      solve: ferrisWheel, comparator: "scalar",
      reference: book("6", "Greedy algorithms · with two pointers (8.1)"),
      scene: { kind: "algo", view: "bars", handles: preset("ferris-wheel", ["CSES sample", "all light", "all heavy"], [{ id: "x", type: "slider", label: "max weight x (rounded)", value: 10, min: 1, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("pairs-neighbours", "Pairing adjacent weights after sorting wastes capacity; pair the heaviest with the lightest.", function ferrisWheel(weights, x) { const sorted = weights.slice().sort((p, q) => p - q); let gondolas = 0; for (let i = 0; i < sorted.length; i += 1) { if (i + 1 < sorted.length && sorted[i] + sorted[i + 1] <= x) i += 1; gondolas += 1; } return gondolas; }),
        diagnosis("never-pairs", "Children can share a gondola.", function ferrisWheel(weights, x) { return weights.length; }),
      ],
      hints: ["Sort a copy ascending.", "lo at the lightest, hi at the heaviest; if they fit together, advance lo.", "Always retire hi and count one gondola."],
      cases: [
        example([[7, 2, 3, 9], 10], 3, "CSES sample"),
        example([[1, 1, 1, 1], 2], 2, "all light"),
        example([[5, 5], 10], 1, "exactly fits"),
        example([[6], 5], 1, "single child"),
        run(ferrisWheel, [randomInts(14, BIG, 1, 1000000000), 1000000000], "n = 200 000, time limit"),
      ],
    }),
  ];

  // ------------------------------------------------------------------ 3 · dynamic programming
  function diceCombinations(n) {
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let sum = 1; sum <= n; sum += 1) {
      for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] = (dp[sum] + dp[sum - face]) % 1000000007;
    }
    return dp[n];
  }
  function minimizingCoins(coins, x) {
    const INF = Number.MAX_SAFE_INTEGER;
    const dp = new Array(x + 1).fill(INF);
    dp[0] = 0;
    for (let sum = 1; sum <= x; sum += 1) {
      for (let i = 0; i < coins.length; i += 1) {
        if (coins[i] <= sum && dp[sum - coins[i]] + 1 < dp[sum]) dp[sum] = dp[sum - coins[i]] + 1;
      }
    }
    return dp[x] === INF ? -1 : dp[x];
  }
  function coinCombinationsI(coins, x) {
    const dp = new Array(x + 1).fill(0);
    dp[0] = 1;
    for (let sum = 1; sum <= x; sum += 1) {
      for (let i = 0; i < coins.length; i += 1) {
        if (coins[i] <= sum) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007;
      }
    }
    return dp[x];
  }
  function coinCombinationsII(coins, x) {
    const dp = new Array(x + 1).fill(0);
    dp[0] = 1;
    for (let i = 0; i < coins.length; i += 1) {
      for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007;
    }
    return dp[x];
  }
  function gridPaths(grid) {
    const n = grid.length;
    let previous = new Array(n).fill(0);
    for (let r = 0; r < n; r += 1) {
      const current = new Array(n).fill(0);
      for (let c = 0; c < n; c += 1) {
        if (grid[r][c] === "*") continue;
        if (r === 0 && c === 0) current[c] = 1;
        else current[c] = (previous[c] + (c > 0 ? current[c - 1] : 0)) % 1000000007;
      }
      previous = current;
    }
    return previous[n - 1];
  }
  function bookShop(prices, pages, x) {
    const dp = new Array(x + 1).fill(0);
    for (let i = 0; i < prices.length; i += 1) {
      for (let budget = x; budget >= prices[i]; budget -= 1) {
        const candidate = dp[budget - prices[i]] + pages[i];
        if (candidate > dp[budget]) dp[budget] = candidate;
      }
    }
    return dp[x];
  }

  const COINS_BIG = randomInts(21, 100, 1, 1000);
  const GRID_BIG = (() => { const grid = randomGrid(22, 1000, 1000, "*", "*", ".", 0.1); grid[0] = "." + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "."; return grid; })();

  const DP = [
    puzzle({
      number: 13, id: "dice-combinations", track: "dp", title: "Dice Combinations", cses: { id: 1633, name: "Dice Combinations" },
      goal: "Count the ordered ways to reach sum n with dice throws of 1 to 6, modulo 10⁹ + 7.",
      concept: "The first dynamic programme: ways(n) = ways(n − 1) + … + ways(n − 6), with ways(0) = 1. Build the table upward.",
      functionName: "diceCombinations", signature: "diceCombinations(n) → number",
      starterSource: starter("diceCombinations", "n", "dp[0] = 1; dp[s] = Σ dp[s − face] for faces 1..6 that fit, each addition mod 1e9+7."),
      solve: diceCombinations, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 30 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7 or the numbers overflow.", function diceCombinations(n) { const dp = new Array(n + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= n; sum += 1) { for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] += dp[sum - face]; } return dp[n]; }),
        diagnosis("base-case-zero", "dp[0] must be 1: there is exactly one way to make sum 0, throw nothing.", function diceCombinations(n) { const dp = new Array(n + 1).fill(0); for (let sum = 1; sum <= n; sum += 1) { for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] = (dp[sum] + dp[sum - face]) % 1000000007; } return dp[n]; }),
      ],
      hints: ["dp[0] = 1.", "For each sum from 1 to n, add dp[sum − face] for every face that fits.", "Apply the modulo after each addition."],
      cases: [
        example([3], 4, "CSES sample"),
        example([1], 1, "one"),
        example([4], 8, "four"),
        example([10], 492, "ten"),
        run(diceCombinations, [1000000], "n = 1 000 000, time limit"),
      ],
    }),
    puzzle({
      number: 14, id: "minimizing-coins", track: "dp", title: "Minimizing Coins", cses: { id: 1634, name: "Minimizing Coins" },
      goal: "Fewest coins that sum to x, or −1 when impossible.",
      concept: "Same table, different combine rule: a minimum instead of a sum, with 'infinity' for unreachable sums. Greedy fails here.",
      functionName: "minimizingCoins", signature: "minimizingCoins(coins, x) → number",
      starterSource: starter("minimizingCoins", "coins, x"),
      solve: minimizingCoins, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · coin problem"),
      scene: { kind: "algo", view: "coins", handles: preset("minimizing-coins", ["1 5 7", "4 3", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 11, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("greedy", "Taking the largest coin first fails: with coins 4 and 3, x = 6 needs 3 + 3.", function minimizingCoins(coins, x) { const sorted = coins.slice().sort((p, q) => q - p); let count = 0, left = x; for (let i = 0; i < sorted.length; i += 1) { while (left >= sorted[i]) { left -= sorted[i]; count += 1; } } return left === 0 ? count : -1; }),
        diagnosis("infinity-returned", "An unreachable sum must return −1, not the infinity placeholder.", function minimizingCoins(coins, x) { const INF = Number.MAX_SAFE_INTEGER; const dp = new Array(x + 1).fill(INF); dp[0] = 0; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum && dp[sum - coins[i]] + 1 < dp[sum]) dp[sum] = dp[sum - coins[i]] + 1; } } return dp[x]; }),
      ],
      hints: ["dp[0] = 0, every other dp starts as infinity.", "dp[sum] = min over coins of dp[sum − coin] + 1.", "Return −1 if dp[x] is still infinity."],
      cases: [
        example([[1, 5, 7], 11], 3, "CSES sample"),
        example([[4, 3], 6], 2, "greedy fails"),
        example([[2], 3], -1, "impossible"),
        example([[1], 0], 0, "zero"),
        run(minimizingCoins, [COINS_BIG, BIG], "100 coins, x = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 15, id: "coin-combinations-i", track: "dp", title: "Coin Combinations I", cses: { id: 1635, name: "Coin Combinations I" },
      goal: "Count ordered ways to make x, modulo 10⁹ + 7.",
      concept: "Outer loop over sums, inner loop over coins: every order of the same coins counts separately.",
      functionName: "coinCombinationsI", signature: "coinCombinationsI(coins, x) → number",
      starterSource: starter("coinCombinationsI", "coins, x", "for sum in 1..x: for coin: dp[sum] += dp[sum − coin]."),
      solve: coinCombinationsI, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "coins", handles: preset("coin-combinations-i", ["2 3 5", "1 2", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 9, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("unordered", "Coins as the outer loop counts each multiset once; this task counts every order.", function coinCombinationsI(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let i = 0; i < coins.length; i += 1) { for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } return dp[x]; }),
        diagnosis("no-mod", "Take the modulo after each addition.", function coinCombinationsI(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum) dp[sum] += dp[sum - coins[i]]; } } return dp[x]; }),
      ],
      hints: ["dp[0] = 1.", "Outer loop: sum from 1 to x. Inner loop: each coin that fits.", "dp[sum] += dp[sum − coin], modulo 10⁹ + 7."],
      cases: [
        example([[2, 3, 5], 9], 8, "CSES sample"),
        example([[1, 2], 3], 3, "1+1+1, 1+2, 2+1"),
        example([[2], 3], 0, "impossible"),
        example([[1], 5], 1, "single coin"),
        run(coinCombinationsI, [COINS_BIG, BIG], "100 coins, x = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 16, id: "coin-combinations-ii", track: "dp", title: "Coin Combinations II", cses: { id: 1636, name: "Coin Combinations II" },
      goal: "Count unordered ways to make x, modulo 10⁹ + 7.",
      concept: "Swap the loops: outer over coins, inner over sums. Each coin is decided once, so 2 + 3 and 3 + 2 collapse into one way.",
      functionName: "coinCombinationsII", signature: "coinCombinationsII(coins, x) → number",
      starterSource: starter("coinCombinationsII", "coins, x", "for coin: for sum in coin..x: dp[sum] += dp[sum − coin]."),
      solve: coinCombinationsII, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "coins", handles: preset("coin-combinations-ii", ["2 3 5", "1 2", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 9, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("ordered", "Sums as the outer loop counts every order; put the coin loop outside.", function coinCombinationsII(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } } return dp[x]; }),
        diagnosis("base-case-zero", "dp[0] must be 1.", function coinCombinationsII(coins, x) { const dp = new Array(x + 1).fill(0); for (let i = 0; i < coins.length; i += 1) { for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } return dp[x]; }),
      ],
      hints: ["dp[0] = 1.", "Outer loop: each coin. Inner loop: sum from coin to x.", "dp[sum] += dp[sum − coin], modulo 10⁹ + 7."],
      cases: [
        example([[2, 3, 5], 9], 3, "CSES sample"),
        example([[1, 2], 3], 2, "{1,1,1} and {1,2}"),
        example([[2], 3], 0, "impossible"),
        example([[1], 5], 1, "single coin"),
        run(coinCombinationsII, [COINS_BIG, BIG], "100 coins, x = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 17, id: "grid-paths", track: "dp", title: "Grid Paths", cses: { id: 1638, name: "Grid Paths I" },
      goal: "Count paths from the top-left to the bottom-right moving only right or down, avoiding traps, modulo 10⁹ + 7.",
      concept: "Each cell's count is the sum of the cell above and the cell to the left; a trap contributes zero. One row of memory is enough.",
      functionName: "gridPaths", signature: "gridPaths(grid) → number",
      starterSource: starter("gridPaths", "grid", "grid is n strings of '.' and '*'."),
      solve: gridPaths, comparator: "scalar",
      reference: book("7.3", "Paths in a grid"),
      scene: { kind: "algo", view: "grid", handles: preset("grid-paths", ["CSES sample", "open 3×3", "blocked"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-traps", "A trap cell must contribute zero paths.", function gridPaths(grid) { const n = grid.length; let previous = new Array(n).fill(0); for (let r = 0; r < n; r += 1) { const current = new Array(n).fill(0); for (let c = 0; c < n; c += 1) { if (r === 0 && c === 0) current[c] = 1; else current[c] = (previous[c] + (c > 0 ? current[c - 1] : 0)) % 1000000007; } previous = current; } return previous[n - 1]; }),
        diagnosis("no-mod", "Take the modulo after each addition.", function gridPaths(grid) { const n = grid.length; let previous = new Array(n).fill(0); for (let r = 0; r < n; r += 1) { const current = new Array(n).fill(0); for (let c = 0; c < n; c += 1) { if (grid[r][c] === "*") continue; if (r === 0 && c === 0) current[c] = 1; else current[c] = previous[c] + (c > 0 ? current[c - 1] : 0); } previous = current; } return previous[n - 1]; }),
      ],
      hints: ["The start cell has 1 path (unless it is a trap).", "Every other free cell: paths = above + left, modulo 10⁹ + 7.", "Traps stay 0; the answer is the bottom-right cell."],
      cases: [
        example([["....", ".*..", "...*", "*..."]], 3, "CSES sample"),
        example([["."]], 1, "single cell"),
        example([["*"]], 0, "trapped start"),
        example([["..", ".."]], 2, "two by two"),
        run(gridPaths, [GRID_BIG], "1000 × 1000 grid, time limit"),
      ],
    }),
    puzzle({
      number: 18, id: "book-shop", track: "dp", title: "Book Shop", cses: { id: 1158, name: "Book Shop" },
      goal: "Maximum pages for at most x money, each book bought at most once.",
      concept: "0/1 knapsack in one array: iterate the budget downwards so a book is never counted twice in the same pass.",
      functionName: "bookShop", signature: "bookShop(prices, pages, x) → number",
      starterSource: starter("bookShop", "prices, pages, x", "for each book: for budget from x down to price: dp[budget] = max(dp[budget], dp[budget − price] + pages)."),
      solve: bookShop, comparator: "scalar",
      reference: book("7.4", "Knapsack problems"),
      scene: { kind: "algo", view: "shop", handles: preset("book-shop", ["CSES sample", "cheap and thick", "all expensive"], [{ id: "x", type: "slider", label: "budget x (rounded)", value: 10, min: 0, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("unbounded", "Iterating the budget upwards lets the same book be bought many times.", function bookShop(prices, pages, x) { const dp = new Array(x + 1).fill(0); for (let i = 0; i < prices.length; i += 1) { for (let budget = prices[i]; budget <= x; budget += 1) { const candidate = dp[budget - prices[i]] + pages[i]; if (candidate > dp[budget]) dp[budget] = candidate; } } return dp[x]; }),
        diagnosis("greedy-cheapest", "Buying the cheapest books first is not optimal.", function bookShop(prices, pages, x) { const order = prices.map((price, index) => index).sort((p, q) => prices[p] - prices[q]); let left = x, total = 0; for (let i = 0; i < order.length; i += 1) { if (prices[order[i]] <= left) { left -= prices[order[i]]; total += pages[order[i]]; } } return total; }),
      ],
      hints: ["dp[budget] = best pages with that much money.", "For each book, walk the budget from x down to its price.", "dp[budget] = max(dp[budget], dp[budget − price] + pages)."],
      cases: [
        example([[4, 8, 5, 3], [5, 12, 8, 1], 10], 13, "CSES sample"),
        example([[5], [10], 4], 0, "cannot afford"),
        example([[1, 1], [3, 4], 2], 7, "buy both"),
        run(bookShop, [randomInts(23, 300, 1, 1000), randomInts(24, 300, 1, 1000), 100000], "300 books, x = 100 000, time limit"),
      ],
    }),
  ];

  // ------------------------------------------------------------------ 4 · graph algorithms
  function countingRooms(grid) {
    const rows = grid.length, cols = grid[0].length;
    const seen = new Uint8Array(rows * cols);
    let rooms = 0;
    const stack = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] !== "." || seen[r * cols + c]) continue;
        rooms += 1;
        seen[r * cols + c] = 1;
        stack.push(r * cols + c);
        while (stack.length) {
          const cell = stack.pop();
          const cr = Math.floor(cell / cols), cc = cell % cols;
          const next = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
          for (let k = 0; k < 4; k += 1) {
            const nr = next[k][0], nc = next[k][1];
            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== "." || seen[nr * cols + nc]) continue;
            seen[nr * cols + nc] = 1;
            stack.push(nr * cols + nc);
          }
        }
      }
    }
    return rooms;
  }
  function labyrinth(grid) {
    const rows = grid.length, cols = grid[0].length;
    let start = -1, goal = -1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] === "A") start = r * cols + c;
        if (grid[r][c] === "B") goal = r * cols + c;
      }
    }
    const distance = new Int32Array(rows * cols).fill(-1);
    const queue = [start];
    distance[start] = 0;
    let head = 0;
    while (head < queue.length) {
      const cell = queue[head];
      head += 1;
      if (cell === goal) return distance[cell];
      const cr = Math.floor(cell / cols), cc = cell % cols;
      const next = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
      for (let k = 0; k < 4; k += 1) {
        const nr = next[k][0], nc = next[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (distance[id] !== -1) continue;
        distance[id] = distance[cell] + 1;
        queue.push(id);
      }
    }
    return -1;
  }
  function buildingRoads(n, edges) {
    const parent = new Array(n + 1);
    for (let i = 0; i <= n; i += 1) parent[i] = i;
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let i = 0; i < edges.length; i += 1) {
      const ra = find(edges[i][0]), rb = find(edges[i][1]);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
    const representatives = [];
    for (let v = 1; v <= n; v += 1) if (find(v) === v) representatives.push(v);
    const roads = [];
    for (let i = 0; i + 1 < representatives.length; i += 1) roads.push([representatives[i], representatives[i + 1]]);
    return roads;
  }
  function buildingTeams(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const team = new Array(n + 1).fill(0);
    for (let s = 1; s <= n; s += 1) {
      if (team[s]) continue;
      team[s] = 1;
      const queue = [s];
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const u = list[k];
          if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); }
          else if (team[u] === team[v]) return null;
        }
      }
    }
    return team.slice(1);
  }
  function heapPush(heap, item) {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent][0] <= heap[index][0]) break;
      const swap = heap[parent]; heap[parent] = heap[index]; heap[index] = swap;
      index = parent;
    }
    return heap;
  }
  function heapPop(heap) {
    if (heap.length === 0) return { item: null, heap };
    const item = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let index = 0;
      while (true) {
        const left = 2 * index + 1, right = left + 1;
        let smallest = index;
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
        if (smallest === index) break;
        const swap = heap[smallest]; heap[smallest] = heap[index]; heap[index] = swap;
        index = smallest;
      }
    }
    return { item, heap };
  }
  function shortestRoutes(n, edges, source) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]);
    const distance = new Array(n + 1).fill(-1);
    const heap = [];
    heapPush(heap, [0, source]);
    while (heap.length) {
      const top = heapPop(heap).item;
      const d = top[0], v = top[1];
      if (distance[v] !== -1) continue;
      distance[v] = d;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        if (distance[list[k][0]] === -1) heapPush(heap, [d + list[k][1], list[k][0]]);
      }
    }
    return distance.slice(1);
  }

  const ROOMS_BIG = randomGrid(31, 1000, 1000, "#", "#", ".", 0.3);
  const LAB_BIG = (() => { const grid = randomGrid(32, 1000, 1000, "#", "#", ".", 0.25); grid[0] = "A" + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "B"; return grid; })();
  const ROADS_BIG_EDGES = (() => { const a = randomInts(33, 100000, 1, 100000), b = randomInts(34, 100000, 1, 100000); return a.map((v, i) => [v, b[i]]); })();
  const TEAMS_BIG_EDGES = (() => { const a = randomInts(35, BIG, 1, 50000), b = randomInts(36, BIG, 1, 50000); return a.map((v, i) => [2 * v - 1, 2 * b[i]]); })();
  const ROUTES_BIG_EDGES = (() => { const a = randomInts(37, BIG, 1, 100000), b = randomInts(38, BIG, 1, 100000), w = randomInts(39, BIG, 1, 1000000000); const list = a.map((v, i) => [v, b[i], w[i]]); for (let v = 1; v < 100000; v += 1) list.push([v, v + 1, 1000000000]); return list; })();

  const GRAPHS = [
    puzzle({
      number: 19, id: "counting-rooms", track: "graphs", title: "Counting Rooms", cses: { id: 1192, name: "Counting Rooms" },
      goal: "Count the connected regions of floor cells.",
      concept: "Flood fill: every unvisited floor cell starts a new room; a DFS or BFS marks everything reachable from it. Use an explicit stack, recursion overflows on 1000 × 1000.",
      functionName: "countingRooms", signature: "countingRooms(grid) → number",
      starterSource: starter("countingRooms", "grid", "'.' is floor, '#' is wall. Four-directional moves."),
      solve: countingRooms, comparator: "scalar",
      reference: book("12.1", "Depth-first search · connectivity"),
      scene: { kind: "algo", view: "grid", handles: preset("counting-rooms", ["CSES sample", "one room", "checkerboard"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("eight-neighbours", "Rooms connect through edges only, not corners.", function countingRooms(grid) { const rows = grid.length, cols = grid[0].length; const seen = new Uint8Array(rows * cols); let rooms = 0; const stack = []; for (let r = 0; r < rows; r += 1) { for (let c = 0; c < cols; c += 1) { if (grid[r][c] !== "." || seen[r * cols + c]) continue; rooms += 1; seen[r * cols + c] = 1; stack.push(r * cols + c); while (stack.length) { const cell = stack.pop(); const cr = Math.floor(cell / cols), cc = cell % cols; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const nr = cr + dr, nc = cc + dc; if ((dr === 0 && dc === 0) || nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== "." || seen[nr * cols + nc]) continue; seen[nr * cols + nc] = 1; stack.push(nr * cols + nc); } } } } return rooms; }),
        diagnosis("counts-cells", "That counts floor cells; a room is a whole connected region.", function countingRooms(grid) { let count = 0; for (let r = 0; r < grid.length; r += 1) for (let c = 0; c < grid[r].length; c += 1) if (grid[r][c] === ".") count += 1; return count; }),
      ],
      hints: ["Scan every cell; an unvisited floor cell means a new room.", "Flood from it with a stack, marking cells as seen.", "Only the four edge neighbours count."],
      cases: [
        example([["########", "#..#...#", "####.#.#", "#..#...#", "########"]], 3, "CSES sample"),
        example([["."]], 1, "one cell"),
        example([["#"]], 0, "no floor"),
        example([[".#.", "#.#", ".#."]], 5, "checkerboard"),
        run(countingRooms, [ROOMS_BIG], "1000 × 1000 grid, time limit"),
      ],
    }),
    puzzle({
      number: 20, id: "labyrinth", track: "graphs", title: "Labyrinth", cses: { id: 1193, name: "Labyrinth (distance)" },
      goal: "Shortest number of steps from A to B, or −1.",
      concept: "Breadth-first search visits cells in order of distance, so the first time B is reached is the shortest path. Depth-first search does not have that property.",
      functionName: "labyrinth", signature: "labyrinth(grid) → number",
      starterSource: starter("labyrinth", "grid", "Queue starting at A; distance array; four neighbours; stop when B is dequeued."),
      solve: labyrinth, comparator: "scalar",
      reference: book("12.2", "Breadth-first search"),
      scene: { kind: "algo", view: "grid", handles: preset("labyrinth", ["CSES sample", "straight", "blocked"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("dfs-distance", "A depth-first walk finds a path, not the shortest one; use a queue.", function labyrinth(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const seen = new Uint8Array(rows * cols); const stack = [[start, 0]]; seen[start] = 1; while (stack.length) { const top = stack.pop(); const cell = top[0], steps = top[1]; if (cell === goal) return steps; const cr = Math.floor(cell / cols), cc = cell % cols; const next = [[cr, cc + 1], [cr, cc - 1], [cr + 1, cc], [cr - 1, cc]]; for (let k = 0; k < 4; k += 1) { const nr = next[k][0], nc = next[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (seen[id]) continue; seen[id] = 1; stack.push([id, steps + 1]); } } return -1; }),
        diagnosis("eight-neighbours", "Diagonal steps are not allowed.", function labyrinth(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const distance = new Int32Array(rows * cols).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const cell = queue[head]; head += 1; if (cell === goal) return distance[cell]; const cr = Math.floor(cell / cols), cc = cell % cols; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const nr = cr + dr, nc = cc + dc; if ((dr === 0 && dc === 0) || nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (distance[id] !== -1) continue; distance[id] = distance[cell] + 1; queue.push(id); } } return -1; }),
      ],
      hints: ["Find A and B; distance[A] = 0, everything else −1.", "Pop from the front of the queue, push unvisited free neighbours with distance + 1.", "Return distance[B] when B comes out of the queue; −1 if the queue empties."],
      cases: [
        example([["########", "#.A#...#", "#.##.#B#", "#......#", "########"]], 9, "CSES sample"),
        example([["AB"]], 1, "adjacent"),
        example([["A#B"]], -1, "blocked"),
        example([["A.", ".B"]], 2, "diagonal needs two steps"),
        run(labyrinth, [LAB_BIG], "1000 × 1000 grid, time limit"),
      ],
    }),
    puzzle({
      number: 21, id: "building-roads", track: "graphs", title: "Building Roads", cses: { id: 1666, name: "Building Roads" },
      goal: "List roads that connect all components; this lab connects consecutive component representatives (the smallest node of each component).",
      concept: "Components are the whole story: k components need k − 1 roads. Union-find or a DFS per unvisited node finds them.",
      functionName: "buildingRoads", signature: "buildingRoads(n, edges) → [[a, b], …]",
      starterSource: starter("buildingRoads", "n, edges", "Find the smallest node of every component in ascending order; road i joins representative i to representative i + 1."),
      solve: buildingRoads, comparator: "deep",
      reference: book("12.3", "Applications · connectivity check"),
      scene: { kind: "algo", view: "graph", handles: preset("building-roads", ["CSES sample", "three islands", "connected"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("star-from-first", "CSES accepts any tree of roads, but this lab expects consecutive representatives so answers can be compared.", function buildingRoads(n, edges) { const parent = new Array(n + 1); for (let i = 0; i <= n; i += 1) parent[i] = i; const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }; for (let i = 0; i < edges.length; i += 1) { const ra = find(edges[i][0]), rb = find(edges[i][1]); if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb); } const representatives = []; for (let v = 1; v <= n; v += 1) if (find(v) === v) representatives.push(v); const roads = []; for (let i = 1; i < representatives.length; i += 1) roads.push([representatives[0], representatives[i]]); return roads; }),
        diagnosis("ignores-edges", "Existing roads already connect cities; only separate components need a new road.", function buildingRoads(n, edges) { const roads = []; for (let v = 1; v < n; v += 1) roads.push([v, v + 1]); return roads; }),
      ],
      hints: ["Union-find: attach the larger root under the smaller one so each root is its component's smallest node.", "Collect nodes that are their own root, in increasing order.", "Join consecutive representatives."],
      cases: [
        example([4, [[1, 2], [3, 4]]], [[1, 3]], "CSES sample"),
        example([3, []], [[1, 2], [2, 3]], "no roads yet"),
        example([3, [[1, 2], [2, 3]]], [], "already connected"),
        example([5, [[2, 3], [4, 5]]], [[1, 2], [2, 4]], "three components"),
        run(buildingRoads, [100000, ROADS_BIG_EDGES], "n = 100 000, m = 100 000, time limit"),
      ],
    }),
    puzzle({
      number: 22, id: "building-teams", track: "graphs", title: "Building Teams", cses: { id: 1668, name: "Building Teams" },
      goal: "Assign teams 1 and 2 so that no friends share a team, or null; the smallest node of each component gets team 1.",
      concept: "Bipartite check by BFS colouring: neighbours get the opposite colour, and a neighbour that already has your colour proves an odd cycle.",
      functionName: "buildingTeams", signature: "buildingTeams(n, edges) → array of length n or null",
      starterSource: starter("buildingTeams", "n, edges"),
      solve: buildingTeams, comparator: "deep",
      reference: book("12.3", "Applications · bipartiteness check"),
      scene: { kind: "algo", view: "graph", handles: preset("building-teams", ["CSES sample", "triangle", "square"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-conflict-check", "When a coloured neighbour has the same colour there is no valid split; return null.", function buildingTeams(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const team = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (team[s]) continue; team[s] = 1; const queue = [s]; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); } } } } return team.slice(1); }),
        diagnosis("starts-with-two", "This lab gives team 1 to the first node of each component.", function buildingTeams(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const team = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (team[s]) continue; team[s] = 2; const queue = [s]; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); } else if (team[u] === team[v]) return null; } } } return team.slice(1); }),
      ],
      hints: ["Build adjacency lists.", "For each uncoloured node in order, colour it 1 and BFS; neighbours get 3 − colour.", "A coloured neighbour with the same colour means null."],
      cases: [
        example([5, [[1, 2], [1, 3], [4, 5]]], [1, 2, 2, 1, 2], "CSES sample"),
        example([3, [[1, 2], [2, 3], [1, 3]]], null, "triangle"),
        example([2, []], [1, 1], "no friendships"),
        example([4, [[1, 2], [2, 3], [3, 4], [4, 1]]], [1, 2, 1, 2], "square"),
        run(buildingTeams, [100000, TEAMS_BIG_EDGES], "n = 100 000 bipartite, time limit"),
        run(buildingTeams, [100000, TEAMS_BIG_EDGES.concat([[1, 3]])], "n = 100 000 with an odd cycle, time limit"),
      ],
    }),
    puzzle({
      number: 23, id: "heap-push", track: "graphs", title: "Heap Push", cses: { id: 1671, name: "Shortest Routes I (brick)" },
      goal: "Append an item to a binary min-heap array and sift it up. Items are [key, value]; the heap is modified in place and returned.",
      concept: "JavaScript has no priority queue, so Dijkstra needs one you wrote. The array form: children of i are 2i + 1 and 2i + 2.",
      functionName: "heapPush", signature: "heapPush(heap, item) → heap",
      starterSource: starter("heapPush", "heap, item", "Push, then while the parent's key is larger, swap upward."),
      solve: heapPush, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      scene: { kind: "algo", view: "heap", handles: preset("heap-push", ["small heap", "empty", "chain"], [{ id: "key", type: "slider", label: "key to push (rounded)", value: 0, min: 0, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "pushItem" }] },
      diagnoses: [
        diagnosis("no-sift", "Appending alone breaks the heap order; swap the item upward while its parent has a larger key.", function heapPush(heap, item) { heap.push(item); return heap; }),
        diagnosis("wrong-parent-index", "The parent of index i is (i − 1) >> 1, not i >> 1.", function heapPush(heap, item) { heap.push(item); let index = heap.length - 1; while (index > 0) { const parent = index >> 1; if (heap[parent][0] <= heap[index][0]) break; const swap = heap[parent]; heap[parent] = heap[index]; heap[index] = swap; index = parent; } return heap; }),
      ],
      hints: ["heap.push(item); index = heap.length − 1.", "parent = (index − 1) >> 1; stop when heap[parent][0] <= heap[index][0].", "Otherwise swap and continue from the parent."],
      cases: [
        example([[[1, 10], [3, 20], [2, 30]], [0, 40]], [[0, 40], [1, 10], [2, 30], [3, 20]], "new minimum"),
        example([[], [5, 1]], [[5, 1]], "empty heap"),
        example([[[1, 10], [3, 20], [2, 30]], [9, 40]], [[1, 10], [3, 20], [2, 30], [9, 40]], "stays at the end"),
        example([[[1, 10], [3, 20], [2, 30]], [2, 40]], [[1, 10], [2, 40], [2, 30], [3, 20]], "one swap"),
        example([[[2, 10], [3, 20]], [1, 30]], [[1, 30], [3, 20], [2, 10]], "lands at index 2"),
      ],
    }),
    puzzle({
      number: 24, id: "heap-pop", track: "graphs", title: "Heap Pop", cses: { id: 1671, name: "Shortest Routes I (brick)" },
      goal: "Remove the minimum item: move the last item to the root and sift it down. Return { item, heap }.",
      concept: "Sift down picks the smaller child each step, so the root is always the minimum afterwards.",
      functionName: "heapPop", signature: "heapPop(heap) → { item, heap }",
      starterSource: starter("heapPop", "heap", "Empty heap → { item: null, heap }."),
      solve: heapPop, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      scene: { kind: "algo", view: "heap", handles: preset("heap-pop", ["small heap", "two items", "chain"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("pops-last", "The minimum is at index 0, not at the end.", function heapPop(heap) { if (heap.length === 0) return { item: null, heap }; const item = heap.pop(); return { item, heap }; }),
        diagnosis("no-sift-down", "After moving the last item to the root it must sift down.", function heapPop(heap) { if (heap.length === 0) return { item: null, heap }; const item = heap[0]; const last = heap.pop(); if (heap.length > 0) heap[0] = last; return { item, heap }; }),
      ],
      hints: ["Remember heap[0]; pop the last item; if the heap is not empty put it at index 0.", "At index i compare with children 2i + 1 and 2i + 2; swap with the smaller if it is smaller than you.", "Stop when neither child is smaller."],
      cases: [
        example([[[0, 40], [1, 10], [2, 30], [3, 20]]], { item: [0, 40], heap: [[1, 10], [3, 20], [2, 30]] }, "sift down left"),
        example([[[1, 10], [2, 20]]], { item: [1, 10], heap: [[2, 20]] }, "two items"),
        example([[]], { item: null, heap: [] }, "empty"),
        example([[[1, 1], [5, 2], [2, 3], [6, 4], [7, 5]]], { item: [1, 1], heap: [[2, 3], [5, 2], [7, 5], [6, 4]] }, "sift down right"),
      ],
    }),
    puzzle({
      number: 25, id: "shortest-routes", track: "graphs", title: "Shortest Routes I", cses: { id: 1671, name: "Shortest Routes I" },
      goal: "Dijkstra: shortest distance from the source to every node in a directed weighted graph (−1 if unreachable).",
      concept: "Always settle the closest unsettled node. The heap gives it to you in O(log n); stale entries are skipped when their node is already settled.",
      functionName: "shortestRoutes", signature: "shortestRoutes(n, edges, source) → distances (index i is node i + 1)",
      starterSource: starter("shortestRoutes", "n, edges, source", "edges are [from, to, weight]. Push [distance, node]; skip nodes already settled."),
      solve: shortestRoutes, comparator: "deep", dependencies: ["heap-push", "heap-pop"],
      reference: book("13.2", "Dijkstra's algorithm"),
      scene: { kind: "algo", view: "graph", handles: preset("shortest-routes", ["CSES sample", "detour is shorter", "unreachable"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 1] },
      diagnoses: [
        diagnosis("queue-not-heap", "A plain FIFO queue settles nodes in the wrong order; use the heap so the smallest distance comes out first.", function shortestRoutes(n, edges, source) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(-1); const queue = [[0, source]]; let head = 0; while (head < queue.length) { const top = queue[head]; head += 1; const d = top[0], v = top[1]; if (distance[v] !== -1) continue; distance[v] = d; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { if (distance[list[k][0]] === -1) queue.push([d + list[k][1], list[k][0]]); } } return distance.slice(1); }),
        diagnosis("relax-overwrites", "A node's distance is fixed when it is settled; later, longer entries must not overwrite it.", function shortestRoutes(n, edges, source) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(-1); const heap = []; heapPush(heap, [0, source]); while (heap.length) { const top = heapPop(heap).item; const d = top[0], v = top[1]; if (distance[v] !== -1 && distance[v] !== d) { distance[v] = d; continue; } distance[v] = d; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { if (distance[list[k][0]] === -1) heapPush(heap, [d + list[k][1], list[k][0]]); } } return distance.slice(1); }),
      ],
      hints: ["Adjacency lists of [to, weight].", "Heap of [distance, node]; pop; if the node is settled, continue; otherwise settle it.", "Push [d + w, to] for every unsettled neighbour."],
      cases: [
        example([3, [[1, 2, 6], [1, 3, 2], [3, 2, 3]], 1], [0, 5, 2], "CSES sample"),
        example([2, [], 1], [0, -1], "unreachable"),
        example([4, [[1, 2, 1], [2, 3, 1], [3, 4, 1], [1, 4, 5]], 1], [0, 1, 2, 3], "detour is shorter"),
        run(shortestRoutes, [100000, ROUTES_BIG_EDGES, 1], "n = 100 000, m = 300 000, time limit"),
      ],
    }),
  ];

  // ------------------------------------------------------------------ 5 · range queries
  function staticRangeSumQueries(values, queries) {
    const prefix = prefixSums(values);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] - prefix[queries[i][0] - 1]);
    return answers;
  }
  function buildSegmentTree(values) {
    const n = values.length;
    const tree = new Array(2 * n).fill(0);
    for (let i = 0; i < n; i += 1) tree[n + i] = values[i];
    for (let i = n - 1; i >= 1; i -= 1) tree[i] = tree[2 * i] + tree[2 * i + 1];
    return tree;
  }
  function segmentTreeUpdate(tree, index, value) {
    const n = tree.length / 2;
    let position = n + index;
    tree[position] = value;
    while (position > 1) {
      position >>= 1;
      tree[position] = tree[2 * position] + tree[2 * position + 1];
    }
    return tree;
  }
  function segmentTreeQuery(tree, l, r) {
    const n = tree.length / 2;
    let lo = l + n, hi = r + n + 1, sum = 0;
    while (lo < hi) {
      if (lo & 1) { sum += tree[lo]; lo += 1; }
      if (hi & 1) { hi -= 1; sum += tree[hi]; }
      lo >>= 1;
      hi >>= 1;
    }
    return sum;
  }
  function dynamicRangeSumQueries(values, ops) {
    const tree = buildSegmentTree(values);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) segmentTreeUpdate(tree, ops[i][1] - 1, ops[i][2]);
      else answers.push(segmentTreeQuery(tree, ops[i][1] - 1, ops[i][2] - 1));
    }
    return answers;
  }

  const RANGE_VALUES_BIG = randomInts(41, BIG, 1, 1000000000);
  const RANGE_QUERIES_BIG = (() => { const a = randomInts(42, BIG, 1, BIG), b = randomInts(43, BIG, 1, BIG); return a.map((v, i) => (v <= b[i] ? [v, b[i]] : [b[i], v])); })();
  const RANGE_OPS_BIG = (() => { const kind = randomInts(44, BIG, 1, 2), a = randomInts(45, BIG, 1, BIG), b = randomInts(46, BIG, 1, BIG), u = randomInts(47, BIG, 1, 1000000000); return kind.map((k, i) => (k === 1 ? [1, a[i], u[i]] : (a[i] <= b[i] ? [2, a[i], b[i]] : [2, b[i], a[i]]))); })();

  const RANGE = [
    puzzle({
      number: 26, id: "static-range-sum-queries", track: "range", title: "Static Range Sum Queries", cses: { id: 1646, name: "Static Range Sum Queries" },
      goal: "Answer many [l, r] sum queries (1-based, inclusive) on a fixed array.",
      concept: "Prefix sums make every query O(1): sum(l..r) = prefix[r] − prefix[l − 1].",
      functionName: "staticRangeSumQueries", signature: "staticRangeSumQueries(values, queries) → answers",
      starterSource: starter("staticRangeSumQueries", "values, queries"),
      solve: staticRangeSumQueries, comparator: "deep", dependencies: ["prefix-sums"],
      reference: book("9.1", "Static array queries · sum queries"),
      scene: { kind: "algo", view: "bars", handles: preset("static-range-sum-queries", ["CSES sample", "ones"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("excludes-left", "prefix[r] − prefix[l] drops the element at l; subtract prefix[l − 1].", function staticRangeSumQueries(values, queries) { const prefix = prefixSums(values); const answers = []; for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] - prefix[queries[i][0]]); return answers; }),
        diagnosis("excludes-right", "prefix[r − 1] drops the element at r.", function staticRangeSumQueries(values, queries) { const prefix = prefixSums(values); const answers = []; for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1] - 1] - prefix[queries[i][0] - 1]); return answers; }),
      ],
      hints: ["Build the prefix array once with prefixSums.", "For [l, r]: prefix[r] − prefix[l − 1].", "Collect the answers in order."],
      cases: [
        example([[3, 2, 4, 5, 1, 1, 5, 3], [[2, 4], [5, 6], [1, 8], [3, 3]]], [11, 2, 24, 4], "CSES sample"),
        example([[1, 1, 1], [[1, 1], [1, 3]]], [1, 3], "ones"),
        example([[5], [[1, 1]]], [5], "single"),
        run(staticRangeSumQueries, [RANGE_VALUES_BIG, RANGE_QUERIES_BIG], "n = q = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 27, id: "build-segment-tree", track: "range", title: "Build a Segment Tree", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Build the bottom-up array form: leaves at n..2n − 1, node i = node 2i + node 2i + 1.",
      concept: "The iterative segment tree stores the array in the second half and sums upward; index 0 is unused.",
      functionName: "buildSegmentTree", signature: "buildSegmentTree(values) → tree array of length 2n",
      starterSource: starter("buildSegmentTree", "values"),
      solve: buildSegmentTree, comparator: "deep",
      reference: book("9.3", "Segment tree"),
      scene: { kind: "algo", view: "segtree", handles: preset("build-segment-tree", ["eight values", "ones"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("leaves-only", "The internal nodes must hold the sums of their children.", function buildSegmentTree(values) { const n = values.length; const tree = new Array(2 * n).fill(0); for (let i = 0; i < n; i += 1) tree[n + i] = values[i]; return tree; }),
        diagnosis("max-not-sum", "This tree answers sum queries, so internal nodes are sums, not maxima.", function buildSegmentTree(values) { const n = values.length; const tree = new Array(2 * n).fill(0); for (let i = 0; i < n; i += 1) tree[n + i] = values[i]; for (let i = n - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); return tree; }),
      ],
      hints: ["tree has 2n entries; copy values into tree[n..2n − 1].", "For i from n − 1 down to 1: tree[i] = tree[2i] + tree[2i + 1].", "Leave tree[0] as 0."],
      cases: [
        example([[1, 2, 3, 4]], [0, 10, 3, 7, 1, 2, 3, 4], "four values"),
        example([[5]], [0, 5], "single"),
        example([[1, 2, 3]], [0, 6, 5, 1, 2, 3], "three values"),
        run(buildSegmentTree, [RANGE_VALUES_BIG], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 28, id: "segment-tree-update", track: "range", title: "Segment Tree Point Update", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Set one leaf and refresh the sums on the path to the root; the tree is modified in place and returned.",
      concept: "Only the log n ancestors of a leaf change, which is why updates are cheap.",
      functionName: "segmentTreeUpdate", signature: "segmentTreeUpdate(tree, index, value) → tree",
      starterSource: starter("segmentTreeUpdate", "tree, index, value", "index is 0-based into the original array."),
      solve: segmentTreeUpdate, comparator: "deep", allowMutation: true,
      reference: book("9.3", "Segment tree · update"),
      scene: { kind: "algo", view: "segtree", handles: preset("segment-tree-update", ["eight values", "ones"], [
        { id: "index", type: "slider", label: "index (rounded)", value: 1, min: 0, max: 7 },
        { id: "value", type: "slider", label: "new value (rounded)", value: 5, min: 0, max: 9 },
      ]), args: [{ fixture: "builtTree" }, { fixture: "roundedIndex" }, { fixture: "roundedValue" }] },
      diagnoses: [
        diagnosis("leaf-only", "The ancestors must be recomputed after changing the leaf.", function segmentTreeUpdate(tree, index, value) { const n = tree.length / 2; tree[n + index] = value; return tree; }),
        diagnosis("adds-instead-of-sets", "The task sets the value; do not add it.", function segmentTreeUpdate(tree, index, value) { const n = tree.length / 2; let position = n + index; tree[position] += value; while (position > 1) { position >>= 1; tree[position] = tree[2 * position] + tree[2 * position + 1]; } return tree; }),
      ],
      hints: ["position = n + index; tree[position] = value.", "While position > 1: position >>= 1; tree[position] = tree[2·position] + tree[2·position + 1].", "Return the same array."],
      cases: [
        example([[0, 10, 3, 7, 1, 2, 3, 4], 1, 5], [0, 13, 6, 7, 1, 5, 3, 4], "update the second leaf"),
        example([[0, 5], 0, 9], [0, 9], "single leaf"),
        example([[0, 6, 5, 1, 2, 3], 2, 0], [0, 3, 2, 1, 2, 0], "three values"),
      ],
    }),
    puzzle({
      number: 29, id: "segment-tree-query", track: "range", title: "Segment Tree Range Sum", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Sum of the leaves in [l, r] (0-based, inclusive).",
      concept: "Walk lo and hi upward; whenever lo is a right child or hi is a left child, take that node and step inward.",
      functionName: "segmentTreeQuery", signature: "segmentTreeQuery(tree, l, r) → number",
      starterSource: starter("segmentTreeQuery", "tree, l, r", "lo = l + n, hi = r + n + 1; while lo < hi: if lo odd take tree[lo++]; if hi odd take tree[--hi]; halve both."),
      solve: segmentTreeQuery, comparator: "scalar",
      reference: book("9.3", "Segment tree · sum query"),
      scene: { kind: "algo", view: "segtree", handles: preset("segment-tree-query", ["eight values", "ones"], [
        { id: "l", type: "slider", label: "l (rounded)", value: 2, min: 0, max: 7 },
        { id: "r", type: "slider", label: "r (rounded)", value: 5, min: 0, max: 7 },
      ]), args: [{ fixture: "builtTree" }, { fixture: "rangeLo" }, { fixture: "rangeHi" }] },
      diagnoses: [
        diagnosis("inclusive-right-bug", "hi must start at r + n + 1, one past the last leaf.", function segmentTreeQuery(tree, l, r) { const n = tree.length / 2; let lo = l + n, hi = r + n, sum = 0; while (lo < hi) { if (lo & 1) { sum += tree[lo]; lo += 1; } if (hi & 1) { hi -= 1; sum += tree[hi]; } lo >>= 1; hi >>= 1; } return sum; }),
        diagnosis("forgets-left-odd", "A right child at lo must be taken before moving up.", function segmentTreeQuery(tree, l, r) { const n = tree.length / 2; let lo = l + n, hi = r + n + 1, sum = 0; while (lo < hi) { if (hi & 1) { hi -= 1; sum += tree[hi]; } lo >>= 1; hi >>= 1; } return sum; }),
      ],
      hints: ["lo = l + n, hi = r + n + 1 (half-open).", "If lo is odd, add tree[lo] and move lo right; if hi is odd, move hi left and add tree[hi].", "Halve both and repeat while lo < hi."],
      cases: [
        example([[0, 10, 3, 7, 1, 2, 3, 4], 1, 2], 5, "middle two"),
        example([[0, 10, 3, 7, 1, 2, 3, 4], 0, 3], 10, "everything"),
        example([[0, 10, 3, 7, 1, 2, 3, 4], 2, 2], 3, "single leaf"),
        example([[0, 6, 5, 1, 2, 3], 1, 2], 5, "three values, last two"),
      ],
    }),
    puzzle({
      number: 30, id: "dynamic-range-sum-queries", track: "range", title: "Dynamic Range Sum Queries", cses: { id: 1648, name: "Dynamic Range Sum Queries" },
      goal: "Process updates [1, k, u] (set position k to u) and queries [2, a, b] (sum of a..b), 1-based; return the query answers.",
      concept: "Build once, then every operation is a walk of log n nodes. Prefix sums cannot do this because an update would change every later prefix.",
      functionName: "dynamicRangeSumQueries", signature: "dynamicRangeSumQueries(values, ops) → answers",
      starterSource: starter("dynamicRangeSumQueries", "values, ops"),
      solve: dynamicRangeSumQueries, comparator: "deep", dependencies: ["build-segment-tree", "segment-tree-update", "segment-tree-query"],
      reference: book("9.3", "Segment tree"),
      scene: { kind: "algo", view: "segtree", handles: preset("dynamic-range-sum-queries", ["CSES sample", "ones"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("ignores-updates", "Updates must change the tree before later queries.", function dynamicRangeSumQueries(values, ops) { const tree = buildSegmentTree(values); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 2) answers.push(segmentTreeQuery(tree, ops[i][1] - 1, ops[i][2] - 1)); } return answers; }),
        diagnosis("one-based-into-tree", "Positions in the operations are 1-based; the bricks take 0-based indexes.", function dynamicRangeSumQueries(values, ops) { const tree = buildSegmentTree(values); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) segmentTreeUpdate(tree, ops[i][1], ops[i][2]); else answers.push(segmentTreeQuery(tree, ops[i][1], ops[i][2])); } return answers; }),
      ],
      hints: ["tree = buildSegmentTree(values).", "Type 1: segmentTreeUpdate(tree, k − 1, u). Type 2: push segmentTreeQuery(tree, a − 1, b − 1).", "Return only the query answers."],
      cases: [
        example([[3, 2, 4, 5, 1, 1, 5, 3], [[2, 1, 4], [2, 5, 6], [1, 3, 1], [2, 1, 4]]], [14, 2, 11], "CSES sample"),
        example([[1, 1, 1], [[2, 1, 3], [1, 2, 5], [2, 1, 3]]], [3, 7], "ones"),
        example([[7], [[1, 1, 2], [2, 1, 1]]], [2], "single"),
        run(dynamicRangeSumQueries, [RANGE_VALUES_BIG, RANGE_OPS_BIG], "n = q = 200 000, time limit"),
      ],
    }),
  ];

  // ------------------------------------------------------------------ 6 · tree algorithms
  function subordinates(n, bosses) {
    const size = new Array(n + 1).fill(0);
    for (let v = n; v >= 2; v -= 1) {
      size[v] += 1;
      size[bosses[v - 2]] += size[v];
    }
    return size.slice(1).map((count, i) => (i === 0 ? count : count - 1));
  }
  function treeDiameter(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const bfs = (start) => {
      const distance = new Array(n + 1).fill(-1);
      const queue = [start];
      distance[start] = 0;
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          if (distance[list[k]] === -1) { distance[list[k]] = distance[v] + 1; queue.push(list[k]); }
        }
      }
      return distance;
    };
    const first = bfs(1);
    let far = 1;
    for (let v = 1; v <= n; v += 1) if (first[v] > first[far]) far = v;
    const second = bfs(far);
    let best = 0;
    for (let v = 1; v <= n; v += 1) if (second[v] > best) best = second[v];
    return best;
  }
  function treeDistances(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const bfs = (start) => {
      const distance = new Array(n + 1).fill(-1);
      const queue = [start];
      distance[start] = 0;
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          if (distance[list[k]] === -1) { distance[list[k]] = distance[v] + 1; queue.push(list[k]); }
        }
      }
      return distance;
    };
    const first = bfs(1);
    let a = 1;
    for (let v = 1; v <= n; v += 1) if (first[v] > first[a]) a = v;
    const fromA = bfs(a);
    let b = a;
    for (let v = 1; v <= n; v += 1) if (fromA[v] > fromA[b]) b = v;
    const fromB = bfs(b);
    const out = [];
    for (let v = 1; v <= n; v += 1) out.push(Math.max(fromA[v], fromB[v]));
    return out;
  }
  function binaryLiftingTable(n, bosses, levels) {
    const up = [];
    const first = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2];
    up.push(first);
    for (let k = 1; k < levels; k += 1) {
      const previous = up[k - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return up;
  }
  function kthAncestor(up, v, k) {
    let node = v;
    for (let bit = 0; bit < up.length && node !== 0; bit += 1) {
      if (k & (1 << bit)) node = up[bit][node];
    }
    if (k >= (1 << up.length)) node = 0;
    return node === 0 ? -1 : node;
  }
  function companyQueriesII(n, bosses, queries) {
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    const up = binaryLiftingTable(n, bosses, levels);
    const depth = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) depth[v] = depth[bosses[v - 2]] + 1;
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      let a = queries[i][0], b = queries[i][1];
      if (depth[a] < depth[b]) { const swap = a; a = b; b = swap; }
      const lifted = kthAncestor(up, a, depth[a] - depth[b]);
      a = lifted === -1 ? a : lifted;
      if (a === b) { answers.push(a); continue; }
      for (let k = levels - 1; k >= 0; k -= 1) {
        if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; }
      }
      answers.push(up[0][a]);
    }
    return answers;
  }

  const TREE_BIG_BOSSES = randomTreeBosses(51, BIG, 1000);
  const TREE_BIG_EDGES = edgesFromBosses(TREE_BIG_BOSSES);
  const DEEP_BOSSES = randomTreeBosses(52, 50000, 25000);
  const LCA_QUERIES_BIG = (() => { const a = randomInts(53, BIG, 1, 50000), b = randomInts(54, BIG, 1, 50000); return a.map((v, i) => [v, b[i]]); })();

  const TREES = [
    puzzle({
      number: 31, id: "subordinates", track: "trees", title: "Subordinates", cses: { id: 1674, name: "Subordinates" },
      goal: "For every employee, count all subordinates (direct and indirect). bosses[i] is the boss of employee i + 2, and every boss has a smaller number.",
      concept: "Because bosses have smaller numbers, walking employees from n down to 2 processes each subtree before its root: add your size to your boss.",
      functionName: "subordinates", signature: "subordinates(n, bosses) → array (index i is employee i + 1)",
      starterSource: starter("subordinates", "n, bosses"),
      solve: subordinates, comparator: "deep",
      reference: book("14.1", "Tree traversal · subtree sizes"),
      scene: { kind: "algo", view: "tree", handles: preset("subordinates", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("direct-only", "Indirect subordinates count too.", function subordinates(n, bosses) { const count = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) count[bosses[v - 2]] += 1; return count.slice(1); }),
        diagnosis("includes-self", "An employee is not their own subordinate.", function subordinates(n, bosses) { const size = new Array(n + 1).fill(0); for (let v = n; v >= 2; v -= 1) { size[v] += 1; size[bosses[v - 2]] += size[v]; } size[1] += 1; return size.slice(1); }),
      ],
      hints: ["size[v] starts at 0; walking v from n down to 2, add 1 for v itself and pass size[v] up to its boss.", "The answer for v is its accumulated size, the count of its descendants.", "Return values for employees 1..n in order."],
      cases: [
        example([5, [1, 1, 2, 3]], [4, 1, 1, 0, 0], "CSES sample"),
        example([1, []], [0], "alone"),
        example([3, [1, 2]], [2, 1, 0], "chain"),
        run(subordinates, [BIG, TREE_BIG_BOSSES], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 32, id: "tree-diameter", track: "trees", title: "Tree Diameter", cses: { id: 1131, name: "Tree Diameter" },
      goal: "Length in edges of the longest path in the tree.",
      concept: "Two BFS: the farthest node from any start is an endpoint of a diameter; the farthest node from that endpoint gives the length.",
      functionName: "treeDiameter", signature: "treeDiameter(n, edges) → number",
      starterSource: starter("treeDiameter", "n, edges"),
      solve: treeDiameter, comparator: "scalar",
      reference: book("14.2", "Diameter"),
      scene: { kind: "algo", view: "tree", handles: preset("tree-diameter", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetEdges" }] },
      diagnoses: [
        diagnosis("single-bfs", "The farthest distance from node 1 is not the diameter; BFS again from that farthest node.", function treeDiameter(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const distance = new Array(n + 1).fill(-1); const queue = [1]; distance[1] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } let best = 0; for (let v = 1; v <= n; v += 1) if (distance[v] > best) best = distance[v]; return best; }),
        diagnosis("counts-nodes", "The diameter counts edges, not nodes.", function treeDiameter(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const bfs = (start) => { const distance = new Array(n + 1).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance; }; const first = bfs(1); let far = 1; for (let v = 1; v <= n; v += 1) if (first[v] > first[far]) far = v; const second = bfs(far); let best = 0; for (let v = 1; v <= n; v += 1) if (second[v] > best) best = second[v]; return best + 1; }),
      ],
      hints: ["Adjacency lists, then BFS from node 1 to find the farthest node.", "BFS again from that node.", "The largest distance found is the diameter."],
      cases: [
        example([5, [[1, 2], [1, 3], [3, 4], [3, 5]]], 3, "CSES sample"),
        example([1, []], 0, "single node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], 3, "chain"),
        run(treeDiameter, [BIG, TREE_BIG_EDGES], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 33, id: "tree-distances", track: "trees", title: "Tree Distances I", cses: { id: 1132, name: "Tree Distances I" },
      goal: "For every node, the distance to the farthest node.",
      concept: "The farthest node from anywhere is one of the two diameter endpoints, so three BFS answer every node at once.",
      functionName: "treeDistances", signature: "treeDistances(n, edges) → array (index i is node i + 1)",
      starterSource: starter("treeDistances", "n, edges"),
      solve: treeDistances, comparator: "deep",
      reference: book("14.3", "All longest paths"),
      scene: { kind: "algo", view: "tree", handles: preset("tree-distances", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetEdges" }] },
      diagnoses: [
        diagnosis("from-node-one", "Distance from node 1 is not the farthest distance for every node.", function treeDistances(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const distance = new Array(n + 1).fill(-1); const queue = [1]; distance[1] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance.slice(1); }),
        diagnosis("single-endpoint", "One diameter endpoint is not enough; take the maximum over both.", function treeDistances(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const bfs = (start) => { const distance = new Array(n + 1).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance; }; const first = bfs(1); let a = 1; for (let v = 1; v <= n; v += 1) if (first[v] > first[a]) a = v; return bfs(a).slice(1); }),
      ],
      hints: ["Find endpoint a (farthest from 1) and endpoint b (farthest from a).", "BFS from a and from b.", "Answer for v = max(distA[v], distB[v])."],
      cases: [
        example([5, [[1, 2], [1, 3], [3, 4], [3, 5]]], [2, 3, 2, 3, 3], "CSES sample"),
        example([1, []], [0], "single node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], [3, 2, 2, 3], "chain"),
        run(treeDistances, [BIG, TREE_BIG_EDGES], "n = 200 000, time limit"),
      ],
    }),
    puzzle({
      number: 34, id: "binary-lifting-table", track: "trees", title: "Binary Lifting Table", cses: { id: 1687, name: "Company Queries I (brick)" },
      goal: "up[k][v] is the 2^k-th ancestor of v (0 when it does not exist), for k below levels.",
      concept: "Jumping 2^k steps is jumping 2^(k−1) twice: up[k][v] = up[k−1][up[k−1][v]]. Row 0 is the boss array itself.",
      functionName: "binaryLiftingTable", signature: "binaryLiftingTable(n, bosses, levels) → up[levels][n + 1]",
      starterSource: starter("binaryLiftingTable", "n, bosses, levels", "Row 0: up[0][v] = boss of v (0 for the root); index 0 stays 0 in every row."),
      solve: binaryLiftingTable, comparator: "deep",
      reference: book("18.1", "Finding ancestors"),
      scene: { kind: "algo", view: "tree", handles: preset("binary-lifting-table", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 3] },
      diagnoses: [
        diagnosis("levels-off-by-one", "The table must have exactly levels rows.", function binaryLiftingTable(n, bosses, levels) { const up = []; const first = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2]; up.push(first); for (let k = 1; k < levels - 1; k += 1) { const previous = up[k - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return up; }),
        diagnosis("no-composition", "Row k must compose row k − 1 with itself, not repeat the parents.", function binaryLiftingTable(n, bosses, levels) { const up = []; const first = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2]; for (let k = 0; k < levels; k += 1) up.push(first.slice()); return up; }),
      ],
      hints: ["Row 0 from the bosses; the root's parent is 0.", "For each next row: row[v] = previous[previous[v]].", "Index 0 maps to 0, which makes missing ancestors fall through cleanly."],
      cases: [
        example([5, [1, 1, 2, 3], 3], [[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], "CSES sample"),
        example([1, [], 2], [[0, 0], [0, 0]], "single node"),
        example([4, [1, 2, 3], 3], [[0, 0, 1, 2, 3], [0, 0, 0, 1, 2], [0, 0, 0, 0, 0]], "chain"),
        run(binaryLiftingTable, [50000, DEEP_BOSSES, 16], "n = 50 000, 16 levels, time limit"),
      ],
    }),
    puzzle({
      number: 35, id: "kth-ancestor", track: "trees", title: "Company Queries I", cses: { id: 1687, name: "Company Queries I" },
      goal: "The k-th ancestor of v using the lifting table, or −1 when it does not exist.",
      concept: "Write k in binary and take the jumps that correspond to its set bits; the order does not matter.",
      functionName: "kthAncestor", signature: "kthAncestor(up, v, k) → node or −1",
      starterSource: starter("kthAncestor", "up, v, k", "For each bit of k, jump with the matching row; 0 means no ancestor."),
      solve: kthAncestor, comparator: "scalar",
      reference: book("18.1", "Finding ancestors"),
      scene: { kind: "algo", view: "tree", handles: preset("kth-ancestor", ["CSES sample", "chain", "star"], [
        { id: "v", type: "slider", label: "node v (rounded)", value: 4, min: 1, max: 5 },
        { id: "k", type: "slider", label: "k (rounded)", value: 1, min: 0, max: 4 },
      ]), args: [{ fixture: "liftingTable" }, { fixture: "roundedV" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("returns-zero", "A missing ancestor is reported as −1, not 0.", function kthAncestor(up, v, k) { let node = v; for (let bit = 0; bit < up.length && node !== 0; bit += 1) { if (k & (1 << bit)) node = up[bit][node]; } if (k >= (1 << up.length)) node = 0; return node; }),
        diagnosis("k-minus-one", "Use the bits of k itself; the boss is the 1st ancestor.", function kthAncestor(up, v, k) { let node = v; const steps = k - 1; if (steps < 0) return v; for (let bit = 0; bit < up.length && node !== 0; bit += 1) { if (steps & (1 << bit)) node = up[bit][node]; } return node === 0 ? -1 : node; }),
      ],
      hints: ["node = v; for bit in 0..levels − 1: if k has that bit, node = up[bit][node].", "Stop early when node becomes 0.", "Return −1 for 0, otherwise the node."],
      cases: [
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 1], 2, "boss"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 2], 1, "grand boss"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 3], -1, "no such ancestor"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 5, 0], 5, "zero steps"),
      ],
    }),
    puzzle({
      number: 36, id: "company-queries-ii", track: "trees", title: "Company Queries II", cses: { id: 1688, name: "Company Queries II" },
      goal: "Lowest common ancestor for each query pair.",
      concept: "Lift the deeper node to the same depth, then jump both up by the largest powers of two that keep them apart; their parent is the answer.",
      functionName: "companyQueriesII", signature: "companyQueriesII(n, bosses, queries) → answers",
      starterSource: starter("companyQueriesII", "n, bosses, queries", "levels = enough rows for n; depths from the bosses; equalise with kthAncestor; then descend from the top row."),
      solve: companyQueriesII, comparator: "deep", dependencies: ["binary-lifting-table", "kth-ancestor"],
      reference: book("18.3", "Lowest common ancestor"),
      scene: { kind: "algo", view: "tree", handles: preset("company-queries-ii", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("no-depth-equalise", "Both nodes must be at the same depth before jumping together.", function companyQueriesII(n, bosses, queries) { let levels = 1; while ((1 << levels) <= n) levels += 1; const up = binaryLiftingTable(n, bosses, levels); const answers = []; for (let i = 0; i < queries.length; i += 1) { let a = queries[i][0], b = queries[i][1]; if (a === b) { answers.push(a); continue; } for (let k = levels - 1; k >= 0; k -= 1) { if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; } } answers.push(up[0][a] === 0 ? 1 : up[0][a]); } return answers; }),
        diagnosis("forgets-final-parent", "After the descent a and b are children of the answer; return their parent.", function companyQueriesII(n, bosses, queries) { let levels = 1; while ((1 << levels) <= n) levels += 1; const up = binaryLiftingTable(n, bosses, levels); const depth = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) depth[v] = depth[bosses[v - 2]] + 1; const answers = []; for (let i = 0; i < queries.length; i += 1) { let a = queries[i][0], b = queries[i][1]; if (depth[a] < depth[b]) { const swap = a; a = b; b = swap; } const lifted = kthAncestor(up, a, depth[a] - depth[b]); a = lifted === -1 ? a : lifted; if (a === b) { answers.push(a); continue; } for (let k = levels - 1; k >= 0; k -= 1) { if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; } } answers.push(a); } return answers; }),
      ],
      hints: ["levels: the smallest count with 2^levels > n; build the table and the depths.", "Lift the deeper node by the depth difference; if they meet, that is the answer.", "From the top row down: if the 2^k ancestors differ, jump both; finally return up[0][a]."],
      cases: [
        example([5, [1, 1, 2, 3], [[4, 5], [2, 5], [1, 3], [4, 2], [5, 5]]], [1, 1, 1, 2, 5], "CSES sample plus two"),
        example([1, [], [[1, 1]]], [1], "single node"),
        example([4, [1, 2, 3], [[4, 2], [3, 4]]], [2, 3], "chain"),
        run(companyQueriesII, [50000, DEEP_BOSSES, LCA_QUERIES_BIG], "n = 50 000, q = 200 000 on a deep tree, time limit"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(INTRO.concat(SORTING, DP, GRAPHS, RANGE, TREES));
  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));
  function getPuzzle(id) { return byId.get(id) || null; }

  const api = Object.freeze({
    ALGO_PUZZLE_STAGES: STAGES,
    ALGO_PUZZLE_TRACKS: TRACKS,
    ALGO_PUZZLES: PUZZLES,
    getPuzzle,
  });

  root.ALGO_PUZZLE_STAGES = STAGES;
  root.ALGO_PUZZLE_TRACKS = TRACKS;
  root.ALGO_PUZZLES = PUZZLES;
  root.getAlgoPuzzle = getPuzzle;
  root.AlgoPuzzles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 3: Algo scene**

In `puzzle-scenes.js`, insert directly after the `if (isPoint(value.pos) && isPoint(value.offset)) return …;` line in `describe`:

```js
      if (typeof value.possible === "boolean" && Array.isArray(value.a)) return (value.possible ? "possible · a [" + value.a.join(" ") + "] · b [" + value.b.join(" ") + "]" : "impossible");
      if ("item" in value && Array.isArray(value.heap)) return "popped " + (value.item ? "[" + value.item.join(", ") + "]" : "nothing") + " · heap " + JSON.stringify(value.heap).slice(0, 40);
```

Insert directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ cses algo lab
  const ALGO_PRESETS = {
    "missing-number": { five: { a: [2, 3, 1, 5], b: 5 }, eight: { a: [8, 1, 3, 6, 2, 7, 4], b: 8 }, "missing at the end": { a: [1, 2, 3, 4, 5, 6, 7], b: 8 } },
    "increasing-array": { sample: { a: [3, 2, 5, 1, 7] }, "already sorted": { a: [1, 2, 3, 4, 5] }, flat: { a: [5, 5, 5, 5] }, "big drop": { a: [10, 1, 1, 1] } },
    "distinct-numbers": { sample: { a: [2, 3, 2, 2, 3, 5, 1, 5] }, "all same": { a: [4, 4, 4, 4] }, "all different": { a: [1, 2, 3, 4, 5, 6] } },
    "prefix-sums": { sample: { a: [3, 2, 4, 5, 1, 1, 5, 3] }, "with negatives": { a: [2, -3, 4, -1, 2] }, ones: { a: [1, 1, 1, 1, 1] } },
    "lower-bound": { sample: { a: [1, 2, 3, 4, 5, 6, 7, 8] }, "with gaps": { a: [1, 3, 3, 5, 8, 8, 9] } },
    "sum-of-two-values": { sample: { a: [2, 7, 5, 1] }, "no pair": { a: [1, 2, 3] }, "equal halves": { a: [3, 3, 8] } },
    "maximum-subarray-sum": { "CSES sample": { a: [-1, 3, -2, 5, 3, -5, 2, 2] }, "all negative": { a: [-3, -1, -2] }, alternating: { a: [2, -1, 2, -1, 2] } },
    "ferris-wheel": { "CSES sample": { a: [7, 2, 3, 9] }, "all light": { a: [1, 1, 1, 1, 2] }, "all heavy": { a: [9, 8, 9, 7] } },
    "chessboard-and-queens": {
      empty: { a: ["........", "........", "........", "........", "........", "........", "........", "........"] },
      "CSES sample": { a: ["........", "........", "..*.....", "........", "........", ".....**.", "...*....", "........"] },
      "blocked corners": { a: ["*......*", "........", "........", "........", "........", "........", "........", "*......*"] },
      "blocked row": { a: ["........", "........", "........", "****....", "........", "........", "........", "........"] },
    },
    "minimizing-coins": { "1 5 7": { a: [1, 5, 7] }, "4 3": { a: [4, 3] }, "2 only": { a: [2] } },
    "coin-combinations-i": { "2 3 5": { a: [2, 3, 5] }, "1 2": { a: [1, 2] }, "2 only": { a: [2] } },
    "coin-combinations-ii": { "2 3 5": { a: [2, 3, 5] }, "1 2": { a: [1, 2] }, "2 only": { a: [2] } },
    "grid-paths": { "CSES sample": { a: ["....", ".*..", "...*", "*..."] }, "open 3×3": { a: ["...", "...", "..."] }, blocked: { a: ["..*", "*..", "..."] } },
    "book-shop": { "CSES sample": { a: [4, 8, 5, 3], b: [5, 12, 8, 1] }, "cheap and thick": { a: [1, 2, 3, 9], b: [3, 4, 5, 20] }, "all expensive": { a: [15, 16, 17], b: [1, 2, 3] } },
    "counting-rooms": { "CSES sample": { a: ["########", "#..#...#", "####.#.#", "#..#...#", "########"] }, "one room": { a: ["....", "....", "...."] }, checkerboard: { a: [".#.#.", "#.#.#", ".#.#."] } },
    "labyrinth": { "CSES sample": { a: ["########", "#.A#...#", "#.##.#B#", "#......#", "########"] }, straight: { a: ["A......B"] }, blocked: { a: ["A.#.B", "..#..", "..#.."] } },
    "building-roads": {
      "CSES sample": { a: 4, b: [[1, 2], [3, 4]], c: [{ x: -3, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 3, y: -1 }] },
      "three islands": { a: 5, b: [[2, 3], [4, 5]], c: [{ x: -4, y: 0 }, { x: -1.5, y: 1.5 }, { x: 0, y: 0 }, { x: 2, y: -1.5 }, { x: 4, y: 0 }] },
      connected: { a: 4, b: [[1, 2], [2, 3], [3, 4]], c: [{ x: -3, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 3, y: 0 }] },
    },
    "building-teams": {
      "CSES sample": { a: 5, b: [[1, 2], [1, 3], [4, 5]], c: [{ x: -3, y: 1.5 }, { x: -4, y: -1 }, { x: -2, y: -1 }, { x: 2, y: 1 }, { x: 3.5, y: -1 }] },
      triangle: { a: 3, b: [[1, 2], [2, 3], [1, 3]], c: [{ x: -2, y: -1 }, { x: 2, y: -1 }, { x: 0, y: 2 }] },
      square: { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 1]], c: [{ x: -2, y: 2 }, { x: 2, y: 2 }, { x: 2, y: -2 }, { x: -2, y: -2 }] },
    },
    "heap-push": { "small heap": { a: [[1, 10], [3, 20], [2, 30]] }, empty: { a: [] }, chain: { a: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]] } },
    "heap-pop": { "small heap": { a: [[0, 40], [1, 10], [2, 30], [3, 20]] }, "two items": { a: [[1, 10], [2, 20]] }, chain: { a: [[1, 1], [5, 2], [2, 3], [6, 4], [7, 5]] } },
    "shortest-routes": {
      "CSES sample": { a: 3, b: [[1, 2, 6], [1, 3, 2], [3, 2, 3]], c: [{ x: -3, y: 0 }, { x: 3, y: 0 }, { x: 0, y: -2 }] },
      "detour is shorter": { a: 4, b: [[1, 2, 1], [2, 3, 1], [3, 4, 1], [1, 4, 5]], c: [{ x: -4, y: 0 }, { x: -1.5, y: 2 }, { x: 1.5, y: 2 }, { x: 4, y: 0 }] },
      unreachable: { a: 3, b: [[2, 3, 4]], c: [{ x: -3, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 0 }] },
    },
    "static-range-sum-queries": { "CSES sample": { a: [3, 2, 4, 5, 1, 1, 5, 3], b: [[2, 4], [5, 6], [1, 8], [3, 3]] }, ones: { a: [1, 1, 1, 1, 1, 1], b: [[1, 3], [2, 5]] } },
    "build-segment-tree": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "segment-tree-update": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "segment-tree-query": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "dynamic-range-sum-queries": { "CSES sample": { a: [3, 2, 4, 5, 1, 1, 5, 3], b: [[2, 1, 4], [2, 5, 6], [1, 3, 1], [2, 1, 4]] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1], b: [[2, 1, 8], [1, 4, 9], [2, 3, 5]] } },
    "subordinates": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "tree-diameter": { "CSES sample": { a: 5, b: [1, 1, 3, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "tree-distances": { "CSES sample": { a: 5, b: [1, 1, 3, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "binary-lifting-table": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "kth-ancestor": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "company-queries-ii": { "CSES sample": { a: 5, b: [1, 1, 2, 3], c: [[4, 5], [4, 2], [3, 5]] }, chain: { a: 5, b: [1, 2, 3, 4], c: [[5, 2], [3, 3]] }, star: { a: 5, b: [1, 1, 1, 1], c: [[2, 3], [4, 5]] } },
  };
  function algoPreset(values, puzzle) {
    const table = ALGO_PRESETS[puzzle.id] || {};
    return table[values.preset] || table[Object.keys(table)[0]] || {};
  }
  function algoSegmentTree(list) {
    const n = list.length;
    const tree = new Array(2 * n).fill(0);
    for (let i = 0; i < n; i += 1) tree[n + i] = list[i];
    for (let i = n - 1; i >= 1; i -= 1) tree[i] = tree[2 * i] + tree[2 * i + 1];
    return tree;
  }
  function algoLifting(n, bosses, levels) {
    const up = [];
    const first = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2];
    up.push(first);
    for (let k = 1; k < levels; k += 1) {
      const previous = up[k - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return up;
  }
  function treeLayoutFromBosses(n, bosses) {
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let v = 2; v <= n; v += 1) children[bosses[v - 2]].push(v);
    const depth = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) depth[v] = depth[bosses[v - 2]] + 1;
    const x = new Array(n + 1).fill(0);
    let slot = 0;
    const visit = (v) => {
      if (children[v].length === 0) { x[v] = slot; slot += 1; return; }
      children[v].forEach(visit);
      x[v] = (x[children[v][0]] + x[children[v][children[v].length - 1]]) / 2;
    };
    visit(1);
    const width = Math.max(1, slot - 1);
    const maxDepth = Math.max(1, ...depth.slice(1));
    const positions = [null];
    for (let v = 1; v <= n; v += 1) positions.push({ x: -4 + 8 * x[v] / width, y: 2.6 - 4.2 * depth[v] / maxDepth });
    return positions;
  }
  function algoBars(list, style, options) {
    const opts = options || {};
    const n = Math.max(1, list.length);
    const left = -5, span = 10, width = span / n;
    const peak = Math.max(1e-9, ...list.map((v) => Math.abs(v)));
    const base = opts.base === undefined ? -0.6 : opts.base;
    const height = opts.height || 2.6;
    const pairs = list.map((v, i) => { const x = left + (i + 0.5) * width + (opts.shift || 0); return [{ x, y: base }, { x, y: base + height * (v / (opts.peak || peak)) }]; });
    return segments(pairs, style, { weight: opts.weight || Math.max(3, Math.min(12, 60 / n)), alpha: opts.alpha, dashed: opts.dashed });
  }
  function algoGridLayers(grid, options) {
    const opts = options || {};
    const rows = grid.length, cols = grid[0].length;
    const size = Math.min(9 / cols, 5.6 / rows, 1.2);
    const left = -cols * size / 2, top = 3.2;
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const ch = grid[r][c];
        const a = { x: left + c * size, y: top - r * size }, b = { x: left + (c + 1) * size, y: top - (r + 1) * size };
        if (ch === "#" || ch === "*") out.push(shade(a, b, "input"), shade({ x: a.x + size * 0.15, y: a.y - size * 0.15 }, { x: b.x - size * 0.15, y: b.y + size * 0.15 }, "input"));
        else if (ch === "A" || ch === "B") out.push(label(ch, "input", { at: { x: a.x + size * 0.3, y: b.y + size * 0.35 } }));
        if (opts.cellLabels && opts.cellLabels[r] && opts.cellLabels[r][c] !== undefined) out.push(label(String(opts.cellLabels[r][c]), opts.style || "muted", { at: { x: a.x + size * 0.25, y: b.y + size * 0.35 } }));
      }
    }
    const lines = [];
    for (let r = 0; r <= rows; r += 1) lines.push([{ x: left, y: top - r * size }, { x: left + cols * size, y: top - r * size }]);
    for (let c = 0; c <= cols; c += 1) lines.push([{ x: left + c * size, y: top }, { x: left + c * size, y: top - rows * size }]);
    out.push(segments(lines, "muted", { weight: 1 }));
    return out;
  }
  function heapTreeLayers(heap, style, offsetX, caption) {
    const out = [];
    const positions = [];
    for (let i = 0; i < heap.length; i += 1) {
      const level = Math.floor(Math.log2(i + 1));
      const first = (1 << level) - 1, count = 1 << level;
      const x = offsetX + (-2.2 + 4.4 * ((i - first) + 0.5) / count);
      positions.push({ x, y: 2.4 - level * 1.15 });
    }
    for (let i = 1; i < heap.length; i += 1) out.push(segments([[positions[(i - 1) >> 1], positions[i]]], style, { weight: 1 }));
    positions.forEach((at, i) => out.push(point(at, String(heap[i][0]) + (heap[i][1] !== undefined ? "·" + heap[i][1] : ""), style)));
    if (caption) out.push(label(caption, style, { at: { x: offsetX - 2.2, y: 3.4 } }));
    return out;
  }
  function segmentTreeLayers(tree, style, options) {
    const opts = options || {};
    const out = [];
    const n = tree.length / 2;
    if (!(n >= 1)) return out;
    const levels = Math.ceil(Math.log2(n)) + 1;
    for (let i = 1; i < tree.length; i += 1) {
      const level = Math.floor(Math.log2(i));
      const first = 1 << level, count = 1 << level;
      const at = { x: -4.5 + 9 * ((i - first) + 0.5) / count, y: 3 - level * (4.6 / levels) };
      if (i >= 2) { const parentLevel = Math.floor(Math.log2(i >> 1)); const pf = 1 << parentLevel; out.push(segments([[{ x: -4.5 + 9 * (((i >> 1) - pf) + 0.5) / pf, y: 3 - parentLevel * (4.6 / levels) }, at]], "muted", { weight: 1 })); }
      const highlighted = opts.highlight && opts.highlight.has(i);
      out.push(point(at, String(tree[i]), highlighted ? style : (i >= n ? "input" : "muted"), { dashed: opts.dashed }));
    }
    return out;
  }
  const algoScene = {
    fixtures: {
      presetA: (values, puzzle) => algoPreset(values, puzzle).a,
      presetB: (values, puzzle) => algoPreset(values, puzzle).b,
      presetC: (values, puzzle) => algoPreset(values, puzzle).c,
      presetEdges: (values, puzzle) => algoPreset(values, puzzle).b.map((boss, i) => [boss, i + 2]),
      roundedN: (values) => Math.round(values.n),
      roundedX: (values) => Math.round(values.x),
      roundedTarget: (values) => Math.round(values.target),
      roundedIndex: (values) => Math.round(values.index),
      roundedValue: (values) => Math.round(values.value),
      roundedV: (values) => Math.round(values.v),
      roundedK: (values) => Math.round(values.k),
      rangeLo: (values) => Math.min(Math.round(values.l), Math.round(values.r)),
      rangeHi: (values) => Math.max(Math.round(values.l), Math.round(values.r)),
      pushItem: (values) => [Math.round(values.key), 99],
      builtTree: (values, puzzle) => algoSegmentTree(algoPreset(values, puzzle).a),
      liftingTable: (values, puzzle) => algoLifting(algoPreset(values, puzzle).a, algoPreset(values, puzzle).b, 3),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const style = resultStyle(context), text = resultLabel(context);
      const chosen = algoPreset(values, context.puzzle);
      const isNumberList = (v) => Array.isArray(v) && v.every(Number.isFinite);
      const numberRows = (expectedText, actualText) => { out.push(label("expected " + expectedText, "expected", { at: { x: -5.3, y: 3.3 } }), label(text + " " + actualText, style, { at: { x: -5.3, y: 2.9 } })); };
      if (view === "sequence") {
        if (isNumberList(context.expected)) out.push(algoBars(context.expected, "expected", { alpha: 160, shift: -0.05 }));
        if (isNumberList(context.actual)) out.push(algoBars(context.actual, style, { shift: 0.05 }));
        out.push(label("n = " + Math.round(values.n) + " · bars are the values of the sequence, left to right", "muted", { row: 3 }));
      } else if (view === "bars") {
        const input = Array.isArray(chosen.a) ? chosen.a : null;
        if (input && input.every(Number.isFinite)) {
          out.push(algoBars(input, "input", { base: -3.0, height: 1.6, weight: 10 }));
          input.forEach((v, i) => out.push(label(String(v), "input", { at: { x: -5 + (i + 0.5) * (10 / input.length) - 0.1, y: -3.3 } })));
        }
        if (Array.isArray(context.expected) && context.expected.length === 2 && context.expected.every(Number.isInteger) && context.puzzle.id === "sum-of-two-values") {
          context.expected.forEach((position) => out.push(marker({ x: -5 + (position - 0.5) * (10 / input.length), y: -1.0 }, "", "expected", { height: 0.3 })));
        }
        if (Array.isArray(context.actual) && context.actual.length === 2 && context.actual.every(Number.isInteger) && context.puzzle.id === "sum-of-two-values") {
          context.actual.forEach((position) => out.push(marker({ x: -5 + (position - 0.5) * (10 / input.length), y: -0.4 }, "", style, { height: 0.3 })));
        }
        if (isNumberList(context.expected) && context.puzzle.id !== "sum-of-two-values") out.push(algoBars(context.expected, "expected", { base: 0, height: 2.2, alpha: 160, shift: -0.06 }));
        if (isNumberList(context.actual) && context.puzzle.id !== "sum-of-two-values") out.push(algoBars(context.actual, style, { base: 0, height: 2.2, shift: 0.06 }));
        if (context.puzzle.id === "lower-bound" && Number.isFinite(context.actual) && input) out.push(marker({ x: -5 + Math.min(context.actual, input.length) * (10 / input.length), y: -1.0 }, "index " + context.actual, style, { height: 0.5 }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "sets") {
        const n = Math.round(values.n);
        for (let v = 1; v <= n; v += 1) out.push(point({ x: -4.5 + 9 * (v - 0.5) / n, y: 1.2 }, String(v), "input"));
        const drawSets = (result, styleName, y) => { if (!result || !Array.isArray(result.a)) return; result.a.forEach((v) => out.push(marker({ x: -4.5 + 9 * (v - 0.5) / n, y }, "", styleName, { height: 0.25 }))); result.b.forEach((v) => out.push(marker({ x: -4.5 + 9 * (v - 0.5) / n, y: y - 0.8 }, "", styleName, { height: 0.25 }))); };
        drawSets(context.expected, "expected", -0.2);
        drawSets(context.actual, style, -0.35);
        out.push(label("upper marks: set a · lower marks: set b", "muted", { row: 3 }));
        numberRows(describe(context.expected), describe(context.actual));
      } else if (view === "board" || view === "grid") {
        if (Array.isArray(chosen.a)) out.push(...algoGridLayers(chosen.a));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "number" || view === "coins" || view === "shop") {
        if (view === "coins" && Array.isArray(chosen.a)) {
          const x = Math.round(values.x);
          out.push(segments([[{ x: -4.5, y: 0 }, { x: 4.5, y: 0 }]], "muted", { weight: 2 }), marker({ x: 4.5, y: 0 }, "x = " + x, "input", { height: 0.4 }), marker({ x: -4.5, y: 0 }, "0", "muted", { height: 0.3 }));
          chosen.a.forEach((coin, i) => out.push(marker({ x: -4.5 + 9 * Math.min(1, coin / Math.max(1, x)), y: -1.2 - i * 0.5 }, "coin " + coin, "input", { height: 0.2 })));
        }
        if (view === "shop" && Array.isArray(chosen.a)) {
          out.push(label("price →", "muted", { at: { x: 4, y: -3.3 } }), label("↑ pages", "muted", { at: { x: -5.2, y: 2.5 } }));
          const maxPrice = Math.max(1, ...chosen.a), maxPages = Math.max(1, ...chosen.b);
          chosen.a.forEach((price, i) => out.push(point({ x: -4.5 + 8.5 * price / maxPrice, y: -2.8 + 5 * chosen.b[i] / maxPages }, price + " → " + chosen.b[i] + "p", "input")));
          out.push(marker({ x: -4.5 + 8.5 * Math.min(1, Math.round(values.x) / maxPrice), y: -2.8 }, "budget " + Math.round(values.x), "muted", { height: 0.5 }));
        }
        if (view === "number") out.push(label("n = " + Math.round(values.n), "input", { row: 3 }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "graph") {
        const positions = chosen.c || [];
        const edges = chosen.b || [];
        edges.forEach((edge) => {
          const a = positions[edge[0] - 1], b = positions[edge[1] - 1];
          if (!a || !b) return;
          if (edge.length > 2) out.push(arrow(a, b, "muted", { weight: 1.5 }), label(String(edge[2]), "muted", { at: { x: (a.x + b.x) / 2 + 0.1, y: (a.y + b.y) / 2 + 0.2 } }));
          else out.push(segments([[a, b]], "muted", { weight: 2 }));
        });
        positions.forEach((at, i) => out.push(point(at, String(i + 1), "input")));
        const roads = (list, styleName, dashed) => list.forEach((road) => { const a = positions[road[0] - 1], b = positions[road[1] - 1]; if (a && b) out.push(segments([[a, b]], styleName, { weight: 2, dashed })); });
        if (context.puzzle.id === "building-roads") {
          if (Array.isArray(context.expected)) roads(context.expected, "expected", true);
          if (Array.isArray(context.actual)) roads(context.actual, style, false);
        } else {
          const perNode = (list, styleName, dy, prefix) => { if (!isNumberList(list)) return; list.forEach((v, i) => { const at = positions[i]; if (at) out.push(label(prefix + v, styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          perNode(context.expected, "expected", 0.45, "");
          perNode(context.actual, style, -0.35, "");
        }
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "heap") {
        const input = Array.isArray(chosen.a) ? chosen.a : [];
        out.push(...heapTreeLayers(input, "input", -2.6, "input heap"));
        const shown = (result) => (result && Array.isArray(result.heap) ? result.heap : (Array.isArray(result) ? result : null));
        if (shown(context.actual)) out.push(...heapTreeLayers(shown(context.actual), style, 2.6, text + " heap"));
        else if (shown(context.expected)) out.push(...heapTreeLayers(shown(context.expected), "expected", 2.6, "expected heap"));
        if (context.puzzle.id === "heap-push") out.push(label("pushing [" + Math.round(values.key) + ", 99]", "input", { row: 3 }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "segtree") {
        const base = Array.isArray(chosen.a) ? chosen.a : [];
        const tree = algoSegmentTree(base);
        const highlight = new Set();
        if (context.puzzle.id === "segment-tree-update") { let position = base.length + Math.round(values.index); while (position >= 1) { highlight.add(position); position >>= 1; } }
        const shownTree = isNumberList(context.actual) && context.actual.length === tree.length ? context.actual : (isNumberList(context.expected) && context.expected.length === tree.length ? context.expected : tree);
        out.push(...segmentTreeLayers(shownTree, style, { highlight }));
        if (context.puzzle.id === "segment-tree-query") out.push(label("query leaves " + Math.min(Math.round(values.l), Math.round(values.r)) + " to " + Math.max(Math.round(values.l), Math.round(values.r)), "input", { row: 3 }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "tree") {
        const n = chosen.a || 1, bosses = chosen.b || [];
        const positions = treeLayoutFromBosses(n, bosses);
        for (let v = 2; v <= n; v += 1) out.push(segments([[positions[bosses[v - 2]], positions[v]]], "muted", { weight: 1.5 }));
        for (let v = 1; v <= n; v += 1) out.push(point(positions[v], String(v), "input"));
        const perNode = (list, styleName, dy) => { if (!isNumberList(list) || list.length !== n) return; list.forEach((value, i) => out.push(label(String(value), styleName, { at: { x: positions[i + 1].x + 0.25, y: positions[i + 1].y + dy } }))); };
        perNode(context.expected, "expected", 0.45);
        perNode(context.actual, style, -0.35);
        if (Array.isArray(context.actual) && Array.isArray(context.actual[0]) && context.puzzle.id === "binary-lifting-table") {
          for (let v = 1; v <= n; v += 1) out.push(label("2^1→" + context.actual[1][v], style, { at: { x: positions[v].x + 0.25, y: positions[v].y - 0.35 } }));
        }
        if (context.puzzle.id === "kth-ancestor") out.push(label("node " + Math.round(values.v) + " · k " + Math.round(values.k), "input", { row: 3 }));
        if (context.puzzle.id === "company-queries-ii" && Array.isArray(chosen.c)) out.push(label("queries " + chosen.c.map((q) => q[0] + "," + q[1]).join(" · "), "input", { row: 3 }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      }
      out.push(...notes(context, describeAlgo(context.expected), describeAlgo(context.actual)));
      return out;
    },
  };
  function describeAlgo(value) {
    if (typeof value === "number") return String(value);
    if (value === null) return "null";
    if (Array.isArray(value)) {
      const textValue = JSON.stringify(value);
      return textValue.length > 48 ? textValue.slice(0, 45) + "…" : textValue;
    }
    return describe(value);
  }
```

Add to the `SCENES` literal after `"nature": natureScene,`:

```js
    "algo": algoScene,
```

- [ ] **Step 4: Pages, test page, README**

In `tests.html`, insert after `<script src="side-puzzles.js"></script>`:

```html
    <script src="algo-puzzles.js"></script>
```

Generate `algo-lab.html` from `puzzle-lab.html` with these substitutions: description meta → "A judge-style p5.js puzzle lab for the core techniques of the CSES Problem Set."; title → "Algo Lab · CSES Core"; brand mark "TF" → "CS"; overline → "CSES techniques, brick by brick"; h1 → "Algo Lab"; the Walkthrough header link → `<a class="button button-secondary" href="puzzle-lab.html">TF2 Puzzle Lab</a>`; kicker "Three tracks, one ladder" → "Six sections, one ladder"; the concept link → `<a id="walkthroughLink" class="concept-link" href="https://cses.fi/problemset/" target="_blank" rel="noopener">Open on CSES ↗</a>`; `puzzles.js` script → `algo-puzzles.js`; and this block directly before the `puzzle-lab.js` script:

```html
    <script>
      window.PUZZLE_LAB_CONFIG = {
        puzzles: window.ALGO_PUZZLES,
        tracks: window.ALGO_PUZZLE_TRACKS,
        storageKey: "algo-lab:v1",
        title: "Algo Lab",
        heading: "algorithm builds",
        checkTimeoutMs: 4000,
        resetNote: "The other labs are not affected.",
        conceptLink: function (puzzle) { return { href: "https://cses.fi/problemset/task/" + puzzle.walkthroughChapter + "/", label: "CSES · " + puzzle.cses.name + " ↗" }; },
      };
    </script>
```

In `puzzle-lab.html`, insert after the Side Lab link:

```html
          <a class="button button-secondary" href="algo-lab.html">Algo Lab</a>
```

In `side-lab.html`, insert after the TF2 Puzzle Lab link:

```html
          <a class="button button-secondary" href="algo-lab.html">Algo Lab</a>
```

In `index.html`, insert after the Side Lab link:

```html
          <a class="button button-secondary" href="algo-lab.html">Algo Lab</a>
```

In `README.md`, insert directly before `## Learning Route`:

```markdown
## Algo Lab

`algo-lab.html` is a judge-style lab for the first six sections of the CSES Problem Set: Introductory, Sorting and Searching, Dynamic Programming, Graph Algorithms, Range Queries, and Tree Algorithms, 36 puzzles in six tracks that unlock in order. Each puzzle links its section of the free *Competitive Programmer's Handbook* and its CSES task. Besides the small preset inputs in the scene, Check runs hidden cases of CSES size under a four-second budget, so a solution with the wrong complexity fails with "did not finish", the same lesson the real judge teaches. Heap and segment-tree bricks are updated in place; later puzzles reuse them.

```

- [ ] **Step 5: Run every check**

Run: `node p5sim/tf2_walkthrough/tests.js` and `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `21/21 tests passed` and `75/75 puzzle tests passed`.

Then serve `p5sim` and confirm `algo-lab.html` shows "36 algorithm builds" with six tracks, every `algo` scene renders, the other labs still render, and there are no console errors.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/puzzle-lab.js p5sim/tf2_walkthrough/puzzle-lab.html p5sim/tf2_walkthrough/side-lab.html p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/index.html p5sim/tf2_walkthrough/README.md
git commit -m "feat: add the CSES Algo Lab with hidden time-limit cases, a heap, segment trees, and binary lifting

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

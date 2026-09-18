# Algo Lab Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Algo Lab for full CSES coverage: per-track prefix unlock, a split catalog with an assembler, lazy hidden cases, catalog-side presets, and three generic scene views, while keeping the 36 existing puzzles working.

**Architecture:** `algo/core.js` owns the builder and generators; each section file registers plain puzzle configs; `algo-puzzles.js` assembles and numbers them. The engine gains `unlockedIds` and `resolveCases`. The existing six sections are produced from the current `algo-puzzles.js` by a mechanical transformation (see Step 3).

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Engine, lab, tests, scenes, catalog split

- [ ] **Step 1: Engine**

In `puzzle-engine.js`, replace the check-case list line in `evaluateCheck` with:

```js
    const cases = resolveCases(puzzle);
```

Insert directly before `  function createProgress() {`:

```js
  const hiddenCaseCache = new WeakMap();
  function resolveCases(puzzle) {
    const base = puzzle.publicCases.concat(puzzle.checkCases);
    if (!Array.isArray(puzzle.hidden) || puzzle.hidden.length === 0 || typeof puzzle.solve !== "function") return base;
    let extra = hiddenCaseCache.get(puzzle);
    if (!extra) {
      extra = puzzle.hidden.map((entry) => {
        const args = entry.make();
        const expected = puzzle.solve.apply(null, JSON.parse(JSON.stringify(args)));
        return { label: entry.label, args, expected };
      });
      hiddenCaseCache.set(puzzle, extra);
    }
    return base.concat(extra);
  }

  function unlockedIds(puzzles, tracks, progress) {
    const states = new Map(trackStates(tracks, progress).map((entry) => [entry.id, entry.state]));
    const byTrack = new Map();
    puzzles.forEach((puzzle) => {
      if (!byTrack.has(puzzle.track)) byTrack.set(puzzle.track, []);
      byTrack.get(puzzle.track).push(puzzle);
    });
    const unlocked = new Set();
    byTrack.forEach((members, trackId) => {
      if (states.has(trackId) && states.get(trackId) !== "available") return;
      for (let i = 0; i < members.length; i += 1) {
        unlocked.add(members[i].id);
        if (!progress.solved[members[i].id]) break;
      }
    });
    return unlocked;
  }

```

Replace the export line `    collectDependencyIds, buildProgram, trackStates, createLiveSession, validateCatalog,` with:

```js
    collectDependencyIds, buildProgram, trackStates, createLiveSession, validateCatalog, resolveCases, unlockedIds,
```

- [ ] **Step 2: Lab**

In `puzzle-lab.js`:

Insert directly after `  function currentPuzzle() { return puzzles[currentIndex]; }`:

```js
  function unlockedNow() { return root.unlockedIds(puzzles, tracks, progress); }
  function isUnlocked(index) { return index >= 0 && index < puzzles.length && unlockedNow().has(puzzles[index].id); }
  function firstOpenIndex() {
    const open = unlockedNow();
    const index = puzzles.findIndex((puzzle) => open.has(puzzle.id) && !progress.solved[puzzle.id]);
    return index >= 0 ? index : 0;
  }
```

In `renderMap`, insert directly after `    dom.stageMap.innerHTML = "";`:

```js
    const open = unlockedNow();
```

and replace `            const locked = index > progress.highestUnlocked;` with:

```js
            const locked = !open.has(puzzle.id);
```

Replace the `nextLocked` line with:

```js
    const nextLocked = Boolean(next) && !isUnlocked(currentIndex + 1);
```

Replace the guard line at the top of `navigate` with:

```js
    if (!isUnlocked(index)) return;
```

Replace the body of `initialIndex` (the three lines from `if (hashIndex >= 0` to the `return Math.min(...)`) with:

```js
    if (hashIndex >= 0 && isUnlocked(hashIndex)) return hashIndex;
    const savedIndex = puzzles.findIndex((puzzle) => puzzle.id === progress.currentPuzzleId);
    if (savedIndex >= 0 && isUnlocked(savedIndex)) return savedIndex;
    return firstOpenIndex();
```

Replace the two lines inside the `hashchange` handler with:

```js
      if (index >= 0 && isUnlocked(index)) navigate(index);
      else if (index >= 0) setFeedback("That build is still locked. Complete the preceding components first.", "error");
```

Replace the check-case list line in `check` with:

```js
    const cases = root.resolveCases(puzzle);
```

- [ ] **Step 3: Catalog core and split**

Create `p5sim/tf2_walkthrough/algo/core.js`:

```js
(function defineAlgoCore(root) {
  "use strict";

  const MOD = 1000000007;
  const BOOK_URL = "https://cses.fi/book/book.pdf";
  const BIG = 200000;

  const SECTION_ORDER = Object.freeze([
    { id: "intro", title: "Introductory Problems", subtitle: "Simulation, arithmetic, greedy scans, constructions, backtracking." },
    { id: "sorting", title: "Sorting and Searching", subtitle: "Sort then scan, prefix sums, binary search, two pointers, sweeps." },
    { id: "dp", title: "Dynamic Programming", subtitle: "Tables built from smaller answers." },
    { id: "graphs", title: "Graph Algorithms", subtitle: "Traversals, components, shortest paths, flows." },
    { id: "range", title: "Range Queries", subtitle: "Prefix sums, sparse tables, Fenwick and segment trees." },
    { id: "trees", title: "Tree Algorithms", subtitle: "Subtrees, diameters, lifting, Euler tours." },
    { id: "math", title: "Mathematics", subtitle: "Modular arithmetic, primes, combinatorics, games." },
    { id: "strings", title: "String Algorithms", subtitle: "Hashing, borders, suffix structures." },
    { id: "geometry", title: "Geometry", subtitle: "Cross products, hulls, sweeps." },
    { id: "window", title: "Sliding Window Problems", subtitle: "Deques and order statistics over a moving window." },
    { id: "bitwise", title: "Bitwise Operations", subtitle: "Xor bases, SOS DP, bit counting." },
    { id: "construction", title: "Construction Problems", subtitle: "Build an object with the required property." },
    { id: "advanced", title: "Advanced Techniques", subtitle: "Meet in the middle, treaps, offline tricks." },
    { id: "advanced-graphs", title: "Advanced Graph Problems", subtitle: "Trees, spanning trees, connectivity, flows." },
    { id: "counting", title: "Counting Problems", subtitle: "Combinatorial counting on grids and permutations." },
    { id: "additional-i", title: "Additional Problems I", subtitle: "Mixed harder tasks." },
    { id: "additional-ii", title: "Additional Problems II", subtitle: "Mixed harder tasks." },
  ]);

  const registry = new Map();
  const shared = {};
  function share(functions) { Object.assign(shared, functions); }

  function lazy(fn) {
    let value, done = false;
    return () => { if (!done) { value = fn(); done = true; } return value; };
  }
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
  function randomPermutation(seed, n) {
    const next = rng(seed);
    const out = new Array(n);
    for (let i = 0; i < n; i += 1) out[i] = i + 1;
    for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); const swap = out[i]; out[i] = out[j]; out[j] = swap; }
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
  function hidden(label, make) { return Object.freeze({ label, make }); }
  function diagnosis(id, message, fn) { return Object.freeze({ id, message, source: src(fn) }); }
  function book(section, title) { return Object.freeze({ label: "Handbook · " + section + " " + title, url: BOOK_URL }); }
  function preset(id, options, extra) {
    const handle = { id: "preset", type: "selector", label: "input" };
    if (options) { handle.value = options[0]; handle.options = options; }
    return [handle].concat(extra || []);
  }

  function define(sectionId, entries) {
    registry.set(sectionId, (registry.get(sectionId) || []).concat(entries));
  }

  function makePuzzle(config, number, section) {
    const cases = config.cases || [];
    const hiddenList = (config.hidden || []).concat(cases.filter((entry) => typeof entry.make === "function"));
    const staticCases = cases.filter((entry) => typeof entry.make !== "function");
    const handles = config.scene.handles.map((handle) => {
      if (handle.id === "preset" && !handle.options) {
        const options = Object.keys(config.presets || {});
        return Object.freeze({ ...handle, value: options[0], options });
      }
      return Object.freeze(handle);
    });
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      reading: null,
      allowMutation: false,
      ...config,
      number,
      track: section.id,
      stage: section.id,
      walkthroughChapter: String(config.cses.id),
      referenceSource: src(config.solve),
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      presets: config.presets ? Object.freeze(config.presets) : null,
      hidden: Object.freeze(hiddenList),
      publicCases: Object.freeze(staticCases.slice(0, 1)),
      checkCases: Object.freeze(staticCases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(handles),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  function build() {
    const stages = [], tracks = [], puzzles = [];
    SECTION_ORDER.forEach((section) => {
      const entries = registry.get(section.id) || [];
      if (!entries.length) return;
      const first = puzzles.length + 1;
      entries.forEach((entry) => puzzles.push(makePuzzle(entry, puzzles.length + 1, section)));
      const stage = Object.freeze({ id: section.id, title: section.title, subtitle: section.subtitle, range: [first, puzzles.length] });
      stages.push(stage);
      tracks.push(Object.freeze({ id: section.id, title: tracks.length + 1 + " · " + section.title, stages: [stage] }));
    });
    return { STAGES: Object.freeze(stages), TRACKS: Object.freeze(tracks), PUZZLES: Object.freeze(puzzles) };
  }

  const api = Object.freeze({
    MOD, BIG, BOOK_URL, SECTION_ORDER,
    lazy, rng, randomInts, randomPermutation, randomGrid, randomTreeBosses, edgesFromBosses,
    src, lines, starter, clone, example, run, hidden, diagnosis, book, preset,
    define, build, shared, share,
  });
  root.AlgoCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

Produce the six section files `algo/01-introductory.js`, `algo/02-sorting.js`, `algo/03-dp.js`, `algo/04-graphs.js`, `algo/05-range.js`, `algo/06-trees.js` from the current `algo-puzzles.js` mechanically:

1. Slice the text between the section markers (`// ---- 1 · introductory` up to `// ---- 2 · sorting and searching`, and so on; the last slice ends before `const PUZZLES = Object.freeze(`).
2. In each slice: `puzzle({\n      number: N, id:` becomes `{\n      id:`; the closing `    }),` of each puzzle becomes `    },`.
3. Every `run(fn, [args], "label")` whose label says "time limit" or whose arguments mention a large input (`BIG`, `DEEP_BOSSES`, `LCA_QUERIES_BIG`, `100000`, `1000000`) becomes `hidden("label", () => [args])`.
6. Bricks that other sections call at load time are shared through the core: the sorting file ends with `core.share({ prefixSums, lowerBound })`, graphs with `core.share({ heapPush, heapPop })`, range with the three segment-tree functions, trees with `binaryLiftingTable` and `kthAncestor`; the range file starts with `const { prefixSums } = core.shared;`. The worker still receives dependency sources through the puzzle's `dependencies`.
4. Every large constant (`MISSING_BIG`, `PAIR_BIG`, `COINS_BIG`, `GRID_BIG`, `ROOMS_BIG`, `LAB_BIG`, `ROADS_BIG_EDGES`, `TEAMS_BIG_EDGES`, `ROUTES_BIG_EDGES`, `RANGE_VALUES_BIG`, `RANGE_QUERIES_BIG`, `RANGE_OPS_BIG`, `TREE_BIG_BOSSES`, `TREE_BIG_EDGES`, `DEEP_BOSSES`, `LCA_QUERIES_BIG`) is wrapped as `const NAME = lazy(() => …);` and every other use becomes `NAME()`.
5. Wrap the slice:

```js
(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
```

followed by the transformed slice, then `  core.define("<section id>", <ARRAY NAME>);` and:

```js
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));
```

Replace `algo-puzzles.js` with the assembler:

```js
(function assembleAlgoPuzzles(root) {
  "use strict";
  const inNode = typeof module !== "undefined" && module.exports;
  const core = inNode ? require("./algo/core.js") : root.AlgoCore;
  if (inNode) ["01-introductory", "02-sorting", "03-dp", "04-graphs", "05-range", "06-trees"].forEach((name) => require("./algo/" + name + ".js"));
  const built = core.build();
  const byId = new Map(built.PUZZLES.map((entry) => [entry.id, entry]));
  function getPuzzle(id) { return byId.get(id) || null; }
  const api = Object.freeze({
    ALGO_PUZZLE_STAGES: built.STAGES,
    ALGO_PUZZLE_TRACKS: built.TRACKS,
    ALGO_PUZZLES: built.PUZZLES,
    getPuzzle,
  });
  root.ALGO_PUZZLE_STAGES = built.STAGES;
  root.ALGO_PUZZLE_TRACKS = built.TRACKS;
  root.ALGO_PUZZLES = built.PUZZLES;
  root.getAlgoPuzzle = getPuzzle;
  root.AlgoPuzzles = api;
  if (inNode) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Scenes**

In `puzzle-scenes.js`, replace the body of `algoPreset` with:

```js
  function algoPreset(values, puzzle) {
    const table = puzzle.presets || ALGO_PRESETS[puzzle.id] || {};
    return table[values.preset] || table[Object.keys(table)[0]] || {};
  }
```

Insert directly before `      } else if (view === "graph") {` in `algoScene.layers`:

```js
      } else if (view === "text") {
        const input = typeof chosen.a === "string" ? chosen.a : "";
        const cell = Math.min(0.9, 10 / Math.max(1, input.length));
        for (let i = 0; i < input.length && i < 60; i += 1) out.push(label(input[i], "input", { at: { x: -5 + (i + 0.5) * cell - 0.1, y: 1.4 } }));
        const drawText = (value, styleName, y) => { if (typeof value !== "string") return; for (let i = 0; i < value.length && i < 60; i += 1) out.push(label(value[i], styleName, { at: { x: -5 + (i + 0.5) * cell - 0.1, y } })); };
        drawText(context.expected, "expected", -0.2);
        drawText(context.actual, style, -1.2);
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "intervals") {
        const list = Array.isArray(chosen.a) ? chosen.a.filter((p) => Array.isArray(p) && p.length >= 2) : [];
        if (list.length) {
          const lo = Math.min(...list.map((p) => p[0])), hi = Math.max(...list.map((p) => p[1]));
          const span = Math.max(1, hi - lo);
          const xOf = (v) => -4.8 + 9.6 * (v - lo) / span;
          list.forEach((p, i) => {
            const y = 2.6 - i * (4.4 / Math.max(1, list.length));
            out.push(segments([[{ x: xOf(p[0]), y }, { x: xOf(p[1]), y }]], "input", { weight: 4 }), label(p[0] + "–" + p[1], "muted", { at: { x: xOf(p[1]) + 0.15, y: y + 0.12 } }));
          });
        }
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
      } else if (view === "two-arrays") {
        const a = Array.isArray(chosen.a) ? chosen.a : [], b = Array.isArray(chosen.b) ? chosen.b : [];
        if (a.length) out.push(algoBars(a, "input", { base: 0.4, height: 2.2, weight: 8 }), label("a", "input", { at: { x: -5.4, y: 0.5 } }));
        if (b.length) out.push(algoBars(b, "muted", { base: -3.2, height: 2.2, weight: 8 }), label("b", "muted", { at: { x: -5.4, y: -3.1 } }));
        numberRows(describeAlgo(context.expected), describeAlgo(context.actual));
```

- [ ] **Step 5: Tests**

In `puzzle-tests.js`, replace the check-case list line in `checkStageRange` with:

```js
      const cases = requireApi(engine, "puzzle-engine.js").resolveCases(puzzle);
```

Replace the whole `algo catalog lists the six CSES sections and validates` test with:

```js
  test("algo catalog lists its sections in site order and validates", () => {
    withCatalog(algoApi(), () => {
      const engineApi = requireApi(engine, "puzzle-engine.js");
      const status = engineApi.validateCatalog(puzzleList(), scenesApi().SCENE_KINDS);
      assert(status.valid, status.message);
      const api = puzzlesApi();
      same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["intro", "sorting", "dp", "graphs", "range", "trees"]);
      const idsOf = (track) => puzzleList().filter((puzzle) => puzzle.track === track).map((puzzle) => puzzle.id);
      same(idsOf("intro"), ["weird-algorithm", "missing-number", "increasing-array", "permutations", "two-sets", "chessboard-and-queens"]);
      same(idsOf("sorting"), ["distinct-numbers", "prefix-sums", "lower-bound", "sum-of-two-values", "maximum-subarray-sum", "ferris-wheel"]);
      same(idsOf("dp"), ["dice-combinations", "minimizing-coins", "coin-combinations-i", "coin-combinations-ii", "grid-paths", "book-shop"]);
      same(idsOf("graphs"), ["counting-rooms", "labyrinth", "building-roads", "building-teams", "heap-push", "heap-pop", "shortest-routes"]);
      same(idsOf("range"), ["static-range-sum-queries", "build-segment-tree", "segment-tree-update", "segment-tree-query", "dynamic-range-sum-queries"]);
      same(idsOf("trees"), ["subordinates", "tree-diameter", "tree-distances", "binary-lifting-table", "kth-ancestor", "company-queries-ii"]);
      puzzleList().forEach((puzzle, index) => {
        assert(puzzle.number === index + 1, puzzle.id + " is numbered " + puzzle.number);
        assert(/^https:\/\/cses\.fi\/book\//.test(puzzle.reference.url), puzzle.id + " should link the handbook");
        assert(/^\d+$/.test(puzzle.walkthroughChapter), puzzle.id + " should carry its CSES task id");
        const singleOperation = ["chessboard-and-queens", "lower-bound", "heap-push", "heap-pop", "segment-tree-update", "segment-tree-query", "kth-ancestor"].includes(puzzle.id);
        assert(singleOperation || puzzle.hidden.length > 0, puzzle.id + " needs a hidden time-limit case");
        const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
        assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes");
      });
      const unlocked = engineApi.unlockedIds(puzzleList(), api.TF2_PUZZLE_TRACKS, engineApi.createProgress());
      same(Array.from(unlocked), ["weird-algorithm", "distinct-numbers", "dice-combinations", "counting-rooms", "static-range-sum-queries", "subordinates"]);
    });
  });

  test("engine unlocks by prefix inside each available track", () => {
    const api = requireApi(engine, "puzzle-engine.js");
    const puzzles = [
      { id: "a1", track: "a", number: 1 }, { id: "a2", track: "a", number: 2 }, { id: "a3", track: "a", number: 3 },
      { id: "b1", track: "b", number: 4 }, { id: "b2", track: "b", number: 5 },
    ];
    const tracks = [{ id: "a", stages: [] }, { id: "b", unlockAfter: "a3", stages: [] }];
    const fresh = api.createProgress();
    same(Array.from(api.unlockedIds(puzzles, tracks, fresh)), ["a1"]);
    fresh.solved.a1 = { completedAt: "now" };
    same(Array.from(api.unlockedIds(puzzles, tracks, fresh)), ["a1", "a2"]);
    fresh.solved.a2 = { completedAt: "now" };
    fresh.solved.a3 = { completedAt: "now" };
    same(Array.from(api.unlockedIds(puzzles, tracks, fresh)), ["a1", "a2", "a3", "b1"]);
  });

  test("engine resolves hidden cases lazily and caches them", () => {
    const api = requireApi(engine, "puzzle-engine.js");
    let calls = 0;
    const puzzle = { publicCases: [{ args: [1], expected: 2, label: "public" }], checkCases: [], hidden: [{ label: "hidden", make: () => { calls += 1; return [5]; } }], solve: (n) => n + 1 };
    const first = api.resolveCases(puzzle);
    const second = api.resolveCases(puzzle);
    same(first.map((entry) => entry.label), ["public", "hidden"]);
    same(first[1].expected, 6);
    assert(calls === 1 && second.length === 2, "hidden cases should be generated once");
  });
```

Add to the `algo views build valid arguments` test, directly after `checkSceneKinds(["algo"]);`:

```js
      puzzleList().forEach((puzzle) => {
        if (typeof puzzle.brute !== "function" || typeof puzzle.small !== "function") return;
        const next = requireApi(algoCatalog, "algo-puzzles.js");
        for (let round = 0; round < 60; round += 1) {
          const args = puzzle.small(round);
          const fast = puzzle.solve.apply(null, JSON.parse(JSON.stringify(args)));
          const slow = puzzle.brute.apply(null, JSON.parse(JSON.stringify(args)));
          assert(valuesMatch(puzzle.comparator, fast, slow), puzzle.id + " disagrees with its brute force on " + JSON.stringify(args) + ": " + JSON.stringify(fast) + " vs " + JSON.stringify(slow));
        }
        assert(next, "catalog present");
      });
```

- [ ] **Step 6: Pages and README**

In `algo-lab.html` and `tests.html`, replace `    <script src="algo-puzzles.js"></script>` with:

```html
    <script src="algo/core.js"></script>
    <script src="algo/01-introductory.js"></script>
    <script src="algo/02-sorting.js"></script>
    <script src="algo/03-dp.js"></script>
    <script src="algo/04-graphs.js"></script>
    <script src="algo/05-range.js"></script>
    <script src="algo/06-trees.js"></script>
    <script src="algo-puzzles.js"></script>
```

In `algo-lab.html`, change `storageKey: "algo-lab:v1"` to `storageKey: "algo-lab:v2"`.

In `README.md`, replace the sentence `36 puzzles in six tracks that unlock in order.` with:

```markdown
Every section is open from the start; inside a section the puzzles unlock in order, so you can move between sections the way you do on the site.
```

- [ ] **Step 7: Verify and commit**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js` → `78/78 puzzle tests passed`; the algo catalog should load in well under 100 ms. Headless render of the algo lab (36 algorithm builds, six tracks) and all 36 scenes; a real worker Check on shortest-routes.

```bash
git add p5sim/tf2_walkthrough/algo p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-lab.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/README.md
git commit -m "refactor: split the algo catalog, unlock per track, and make hidden cases lazy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

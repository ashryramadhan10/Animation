# TF2 Puzzle Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate p5.js Puzzle Lab containing 30 sequential, behavior-checked geometry and TF2 coding puzzles with reusable learner components and versioned local progress.

**Architecture:** `puzzles.js` is immutable curriculum data, `puzzle-engine.js` owns comparison/progress/worker orchestration, and `puzzle-worker.js` runs learner functions away from the UI thread. `puzzle-lab.js` binds the DOM while `puzzle-sketch.js` receives plain preview state and renders geometric feedback with p5.js; existing transform modules remain the expected-behavior reference.

**Tech Stack:** Vanilla JavaScript, p5.js from `p5sim/libraries/p5.min.js`, Web Workers, browser `localStorage`, HTML/CSS, the existing browser/Node test harness, and `python -m http.server` for local serving.

---

## File Structure

- Create `p5sim/tf2_walkthrough/puzzles.js`: eight stages, 30 puzzle contracts, examples, hidden deterministic cases, hints, code pieces, dependencies, and reference sources.
- Create `p5sim/tf2_walkthrough/puzzle-engine.js`: catalog validation, output comparators, progress persistence, dependency invalidation, and worker request lifecycle.
- Create `p5sim/tf2_walkthrough/puzzle-worker.js`: compile dependency functions plus learner source, execute cases, detect mutation, and serialize results/errors.
- Create `p5sim/tf2_walkthrough/puzzle-lab.html`: accessible Puzzle Lab shell and script order.
- Create `p5sim/tf2_walkthrough/puzzle-lab.css`: responsive map/canvas/editor/shelf layout using the walkthrough palette.
- Create `p5sim/tf2_walkthrough/puzzle-lab.js`: page controller, editor actions, hash routing, hints, unlocking, reset confirmation, and keyboard commands.
- Create `p5sim/tf2_walkthrough/puzzle-sketch.js`: p5 instance-mode visualization for scalar/vector, SE(2), tree, time, and SE(3) puzzles.
- Modify `p5sim/tf2_walkthrough/index.html`: top-bar Puzzle Lab entry point and chapter practice link target.
- Modify `p5sim/tf2_walkthrough/sketch.js`: map the active walkthrough chapter to its first practice puzzle.
- Modify `p5sim/tf2_walkthrough/styles.css`: style the new walkthrough links using existing button tokens.
- Modify `p5sim/tf2_walkthrough/tests.html`: load puzzle modules before the test runner.
- Modify `p5sim/tf2_walkthrough/tests.js`: add catalog, comparator, progress, worker, and reference-solution checks; make the runner await asynchronous browser tests.
- Modify `p5sim/tf2_walkthrough/README.md`: document the Puzzle Lab, persistence, controls, and Python server command.

### Task 1: Define and Validate the 30-Puzzle Curriculum

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/tests.html`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add failing catalog tests**

Load `puzzles.js` before `tests.js`, load it in Node with `loadModule("./puzzles.js")`, and assert this exact ordered ID list:

```js
const expectedPuzzleIds = [
  "make-point", "make-vector", "add-vectors", "point-difference", "vector-magnitude",
  "normalize-vector", "rotate-vector", "translate-point", "point-vs-vector", "recover-heading",
  "apply-se2", "compose-se2", "invert-se2", "transform-pose", "round-trip",
  "store-edge", "ancestor-chain", "common-ancestor", "directed-path", "validate-tree",
  "lookup-transform", "robot-frame-chain", "laser-to-map", "map-odom-correction",
  "interpolate-translation", "interpolate-yaw", "latest-common-time",
  "rotate-quaternion", "compose-se3", "tf-buffer-capstone",
];
```

The same test must require `id`, `number`, `stage`, `title`, `goal`, `functionName`, `signature`, `starterSource`, three `hints`, `publicCases`, `checkCases`, `comparator`, `preview`, `walkthroughChapter`, and `referenceSource`, and must reject unknown or forward dependencies.

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: existing tests pass and the new catalog test fails with `puzzles.js is not implemented`.

- [ ] **Step 3: Implement the catalog API and all puzzle records**

Expose the same API to browsers and CommonJS:

```js
(function exposePuzzles(root) {
  "use strict";
  const STAGES = Object.freeze([
    { id: "coordinate-bricks", title: "Coordinate Bricks", range: [1, 5] },
    { id: "local-geometry", title: "Local Geometry", range: [6, 10] },
    { id: "se2-components", title: "SE(2) Components", range: [11, 15] },
    { id: "tree-components", title: "Tree Components", range: [16, 20] },
    { id: "lookup-robot", title: "TF Lookup and Robot Frames", range: [21, 24] },
    { id: "time", title: "Time", range: [25, 27] },
    { id: "se3", title: "SE(3)", range: [28, 29] },
    { id: "capstone", title: "Capstone", range: [30, 30] },
  ]);
  const PUZZLES = Object.freeze(buildCompletePuzzleRecords());
  const byId = new Map(PUZZLES.map((puzzle) => [puzzle.id, puzzle]));
  function getPuzzle(id) { return byId.get(id) || null; }
  const api = Object.freeze({ TF2_PUZZLE_STAGES: STAGES, TF2_PUZZLES: PUZZLES, getPuzzle });
  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

Use the approved curriculum mapping: puzzles 1–10 have insertable `codePieces`; puzzles 11–20 have focused starter bodies; puzzles 21–29 expose only signatures/contracts/components; puzzle 30 exposes the public API and scenario. Store expected JSON values per case and include finite edge cases such as zero-length normalization, angle wrap at ±π, reverse tree traversal, duplicate parent/cycle classification, no-overlap timestamps, non-unit quaternion input, and composed 3D rotation plus translation.

- [ ] **Step 4: Run the catalog tests**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: catalog order/shape/dependency tests pass alongside the existing 21 tests.

- [ ] **Step 5: Commit the catalog**

```powershell
git add -- p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/tests.js
git commit -m "feat: define TF2 puzzle curriculum"
```

### Task 2: Build Behavior Comparison and Persistent Progress

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify: `p5sim/tf2_walkthrough/tests.html`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add failing engine tests**

Add tests for scalar/vector/angle/SE(2)/SE(3)/path/error comparators; non-finite rejection; fresh progress; corrupt storage fallback; completing puzzle N unlocking N+1; and transitive invalidation when a saved dependency is reset. Use a memory storage with the browser storage contract:

```js
function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    getItem(key) { return Object.hasOwn(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; },
  };
}
```

- [ ] **Step 2: Run the tests and confirm the engine is missing**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: new tests fail with `puzzle-engine.js is not implemented`.

- [ ] **Step 3: Implement the pure engine contracts**

Expose:

```js
const STORAGE_KEY = "tf2-puzzle-lab:v1";
const SCHEMA_VERSION = 1;
// Returns { pass, message, delta }.
function compareOutput(comparator, actual, expected, tolerance)
function createProgress() { return { schemaVersion: 1, currentPuzzleId: "make-point", highestUnlocked: 0, sources: {}, solved: {}, hints: {}, display: {} }; }
// Each remaining function returns a new value rather than mutating its arguments.
function loadProgress(storage)
function saveProgress(storage, progress)
function completePuzzle(progress, puzzle, source, now)
function dependentPuzzleIds(puzzles, puzzleId)
function resetPuzzle(progress, puzzles, puzzleId)
function evaluateResults(puzzle, workerResults, mode)
```

Comparators must normalize angles with `atan2(sin(delta), cos(delta))`, walk objects/arrays recursively for numeric geometry, compare paths by ordered frame/direction fields, and compare error puzzles by stable `code`.

- [ ] **Step 4: Run the engine tests**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: all synchronous engine and legacy tests pass.

- [ ] **Step 5: Commit the engine core**

```powershell
git add -- p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add puzzle evaluation and progress engine"
```

### Task 3: Execute Learner Code in a Bounded Worker

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-worker.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add asynchronous worker tests**

Change `runAllTests` to `async`, await every `item.run()`, and in browser-only tests call `runPuzzleWorker`. Cover: a correct function, syntax error, thrown runtime error, missing function, mutated arguments, unserializable/non-finite result, and an infinite loop timing out.

- [ ] **Step 2: Serve and confirm the worker tests fail**

Run: `python -m http.server 4173 --bind 127.0.0.1` from `p5sim`.

Open: `http://127.0.0.1:4173/tf2_walkthrough/tests.html`

Expected: worker tests fail because the worker file/runner is absent; no Node package server is used.

- [ ] **Step 3: Implement the worker protocol**

The worker must accept `{ requestId, functionName, source, dependencySources, cases }`, compile declarations with `new Function`, clone each case before execution, and return one of:

```js
{ requestId, ok: true, results: [{ value, inputMutated }] }
{ requestId, ok: false, error: { kind: "syntax" | "missing-function" | "runtime" | "serialization", message, caseIndex } }
```

Do not expose DOM or storage objects. Convert thrown objects to stable messages and reject returned promises, functions, symbols, cyclic data, `NaN`, and infinities.

- [ ] **Step 4: Implement the main-thread timeout wrapper**

Add `runPuzzleWorker(payload, options = {})` to `puzzle-engine.js`. Create a fresh `Worker(options.workerUrl || "puzzle-worker.js")`, correlate `requestId`, terminate on success/error, and after `options.timeoutMs || 750` reject with `{ kind: "timeout", message: "Your code took too long to finish." }`.

- [ ] **Step 5: Run worker and legacy tests**

Run the existing Node command and refresh the served browser test page.

Expected: Node reports all non-browser tests passed; browser summary reports every test passed, including timeout handling.

- [ ] **Step 6: Commit worker execution**

```powershell
git add -- p5sim/tf2_walkthrough/puzzle-worker.js p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: run puzzle code in a bounded worker"
```

### Task 4: Build the Puzzle Lab Shell and Controller

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-lab.html`
- Create: `p5sim/tf2_walkthrough/puzzle-lab.css`
- Create: `p5sim/tf2_walkthrough/puzzle-lab.js`

- [ ] **Step 1: Create the semantic page shell**

Include IDs consumed by the controller: `stageMap`, `puzzleCounter`, `puzzleTitle`, `puzzleGoal`, `puzzleSignature`, `walkthroughLink`, `canvasHost`, `codeEditor`, `codePieces`, `componentShelf`, `runButton`, `checkButton`, `resetCodeButton`, `hintButton`, `hintPanel`, `feedbackPanel`, `previousPuzzle`, `nextPuzzle`, and `resetProgress`. Load scripts in this order:

```html
<script src="../libraries/p5.min.js"></script>
<script src="puzzles.js"></script>
<script src="puzzle-engine.js"></script>
<script src="puzzle-sketch.js"></script>
<script src="puzzle-lab.js"></script>
```

- [ ] **Step 2: Implement the responsive visual system**

Reuse walkthrough CSS custom properties by importing `styles.css`, then define a three-column desktop grid (curriculum, visualizer, code), a two-column tablet layout, and one-column mobile layout. Provide visible focus states, locked/available/current/solved puzzle states, monospaced editor/signature styling, status colors, a horizontally wrapping component shelf, and a minimum 44px control target.

- [ ] **Step 3: Implement page state and routing**

Initialize from `loadProgress(localStorage)`, accept hashes matching an unlocked puzzle ID, and fall back to `currentPuzzleId` for locked/unknown hashes. Render stages, selected puzzle metadata, saved-or-starter source, hint level, pieces, declared components, and enabled navigation. Keep `location.hash`, editor source, and `currentPuzzleId` synchronized.

- [ ] **Step 4: Implement editor and progress actions**

Run sends public cases; Check sends all cases. Build `dependencySources` only from `puzzle.dependencies` and saved solved sources. On success call `completePuzzle`, save, animate success, and enable the next puzzle. Insert code pieces at `selectionStart`; hints reveal levels 1–3; Reset Code restores starter source after listing invalidated dependents; Reset Progress removes only `tf2-puzzle-lab:v1` after confirmation.

- [ ] **Step 5: Implement keyboard behavior and error feedback**

Bind `Ctrl+Enter`, `Ctrl+Shift+Enter`, `Alt+Left`, `Alt+Right`, and `Escape`, preserving normal textarea input. Translate worker/engine errors into one actionable message and show the failing public input/output/delta when available.

- [ ] **Step 6: Commit the interactive lab shell**

```powershell
git add -- p5sim/tf2_walkthrough/puzzle-lab.html p5sim/tf2_walkthrough/puzzle-lab.css p5sim/tf2_walkthrough/puzzle-lab.js
git commit -m "feat: add interactive TF2 puzzle lab"
```

### Task 5: Render Geometric Feedback with p5.js

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-sketch.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.js`

- [ ] **Step 1: Define the renderer boundary**

Expose `createPuzzleSketch(host, initialState)` returning `{ setState(nextState), celebrate() }`. The state shape is `{ puzzle, input, expected, actual, comparison, running }`; it contains no worker or DOM nodes.

- [ ] **Step 2: Implement shared drawing primitives**

In p5 instance mode add metric-grid, screen/world conversion, arrow, point, local-frame axes, dashed expected geometry, error vector, tree node/edge, timestamp lane, and quaternion-axis functions. Resize to the host with a 16:10 minimum canvas and cap pixel density at 2.

- [ ] **Step 3: Implement preview dispatch**

Dispatch by `puzzle.preview.kind`: `scalar`, `vector`, `point-vector`, `se2`, `tree`, `robot-chain`, `time`, `se3`, and `buffer`. Render expected output in a faint dashed cyan; incorrect learner output and delta in coral; passing overlap and the merge animation in green. For puzzles without a result, render the public input and the next operation symbolically.

- [ ] **Step 4: Connect run/check feedback**

Update the sketch after each public run and after the first failing check case. On success call `celebrate()` without blocking navigation or progress persistence.

- [ ] **Step 5: Commit p5 visualization**

```powershell
git add -- p5sim/tf2_walkthrough/puzzle-sketch.js p5sim/tf2_walkthrough/puzzle-lab.js
git commit -m "feat: visualize puzzle geometry with p5"
```

### Task 6: Integrate Practice Links and Documentation

**Files:**
- Modify: `p5sim/tf2_walkthrough/index.html`
- Modify: `p5sim/tf2_walkthrough/sketch.js`
- Modify: `p5sim/tf2_walkthrough/styles.css`
- Modify: `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Add walkthrough entry points**

Add a top-bar `<a class="button button-primary" href="puzzle-lab.html">Puzzle Lab</a>` and a lesson-card `<a id="practiceLink" class="practice-link" href="puzzle-lab.html#make-point">Practice this concept</a>`.

- [ ] **Step 2: Map chapters to practice puzzles**

In `sketch.js`, define and use this stable map while rendering chapter UI:

```js
const PRACTICE_PUZZLE_BY_CHAPTER = {
  "matrix-stack": "make-point", "data-types": "point-vs-vector", composition: "compose-se2",
  tree: "store-edge", "mobile-chain": "robot-frame-chain", "frame-roles": "map-odom-correction",
  broadcasters: "store-edge", lookup: "lookup-transform", "stamped-data": "laser-to-map",
  "time-buffer": "interpolate-translation", "sensor-scenario": "latest-common-time",
  se3: "rotate-quaternion", sandbox: "tf-buffer-capstone",
};
```

- [ ] **Step 3: Document use and serving**

Explain separate walkthrough/lab routes, 30-puzzle progression, worker scope, localStorage key/reset behavior, and controls. Give only this server command:

```powershell
cd p5sim
python -m http.server 4173 --bind 127.0.0.1
```

- [ ] **Step 4: Commit integration and docs**

```powershell
git add -- p5sim/tf2_walkthrough/index.html p5sim/tf2_walkthrough/sketch.js p5sim/tf2_walkthrough/styles.css p5sim/tf2_walkthrough/README.md
git commit -m "docs: connect walkthrough and puzzle lab"
```

### Task 7: Complete Reference and Browser Verification

**Files:**
- Modify: `p5sim/tf2_walkthrough/tests.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzles.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzle-engine.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzle-worker.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzle-lab.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzle-sketch.js`
- Modify if defects are found: `p5sim/tf2_walkthrough/puzzle-lab.css`

- [ ] **Step 1: Check every reference solution behavior**

For each puzzle, run `referenceSource` through the same worker with all public/check cases, then evaluate it with `evaluateResults`. Fail with the puzzle ID and first mismatch. Also assert every declared dependency has a lower puzzle number and the complete graph is acyclic.

- [ ] **Step 2: Run the lean automated suite once**

Run: `node p5sim/tf2_walkthrough/tests.js`

Then serve from `p5sim` with Python and open `http://127.0.0.1:4173/tf2_walkthrough/tests.html`.

Expected: both environments report all applicable tests passed; no repeated stress or package-runner tests.

- [ ] **Step 3: Verify the learning flow in a real browser**

Check first puzzle loading, code-piece insertion, Run feedback, correct Check/unlock, refresh persistence, three hints, a wrong SE(2) result with visible error vector, locked capstone hash handling, keyboard commands, dependent-reset confirmation, full reset, and responsive desktop/mobile layout.

- [ ] **Step 4: Inspect repository scope**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only Puzzle Lab work plus the pre-existing user-owned `pyanim/testo.ipynb` modification appears.

- [ ] **Step 5: Commit final verification fixes**

```powershell
git add -- p5sim/tf2_walkthrough
git commit -m "test: verify TF2 puzzle lab"
```

Do not stage `pyanim/testo.ipynb`.

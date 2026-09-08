# TF2 Puzzle Lab Live Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-cut the p5.js TF2 Puzzle Lab into 27 geometry-first puzzles that run the learner's function live on draggable scenes, name common geometric mistakes, and expose a locked Pose Correction track placeholder.

**Architecture:** `puzzles.js` stays immutable curriculum data, now carrying scene handle declarations and mistake variants. A new pure `puzzle-runtime.js` compiles learner, reference, and variant scopes and is shared by a persistent `puzzle-worker.js` and Node tests. A new pure `puzzle-scenes.js` turns handle values into function arguments, draw primitives, and drag updates, so `puzzle-sketch.js` only renders primitives and hit-tests grips. `puzzle-engine.js` owns comparators, diagnosis, v2 progress, and the coalescing live session; `puzzle-lab.js` wires the DOM.

**Tech Stack:** Vanilla JavaScript (browser globals, no build tool), p5.js from `p5sim/libraries/p5.min.js`, Web Workers, `localStorage`, Node 22 for the dependency-free tests, `python -m http.server` for local serving.

**Spec:** `docs/superpowers/specs/2026-09-08-tf2-puzzle-lab-live-rework-design.md`

---

## File Structure

All paths are relative to the repository root `C:\Users\ashry\Programming Experiments\Animation`.

Create:

- `p5sim/tf2_walkthrough/puzzle-runtime.js` — `compileScope`, `compileProgram`, `callSafely`, `evaluateCompiled`. No DOM, no worker API. Exposed as `PuzzleRuntime` on the global and as CommonJS exports.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — handle geometry (`initialValues`, `grips`, `dragHandle`), argument building (`toArgs`), and draw-primitive generation (`layers`) for every scene kind. Exposed as `PuzzleScenes`.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — async Node/browser test runner for the catalog, runtime, worker, engine, and scenes.

Modify:

- `p5sim/tf2_walkthrough/puzzles.js` — replace the 30-puzzle catalog with 27 puzzles, `TF2_PUZZLE_STAGES`, and `TF2_PUZZLE_TRACKS`.
- `p5sim/tf2_walkthrough/puzzle-worker.js` — persistent worker using the runtime module; `live` and `check` modes; compiled-program cache.
- `p5sim/tf2_walkthrough/puzzle-engine.js` — comparators (`scalar`, `quaternion` added), `diagnose`, `buildProgram`, `evaluateLive`, `evaluateCheck`, `createLiveSession`, v2 progress, `trackStates`, `validateCatalog`.
- `p5sim/tf2_walkthrough/puzzle-sketch.js` — primitive renderer and grip dragging.
- `p5sim/tf2_walkthrough/puzzle-lab.js` — live wiring, selector strip, feedback states, track map.
- `p5sim/tf2_walkthrough/puzzle-lab.html`, `p5sim/tf2_walkthrough/puzzle-lab.css` — remove code pieces, add selector strip, concept line, and track blocks.
- `p5sim/tf2_walkthrough/sketch.js`, `p5sim/tf2_walkthrough/index.html` — practice links to the new ids.
- `p5sim/tf2_walkthrough/tests.html` — load puzzle modules and `puzzle-tests.js`.
- `p5sim/tf2_walkthrough/README.md` — document the rework.

Conventions used by every task:

- Commit messages end with the two attribution lines shown in each commit step.
- Run Node tests from the repository root: `node p5sim/tf2_walkthrough/puzzle-tests.js`. The pre-existing `node p5sim/tf2_walkthrough/tests.js` must keep printing `21/21 tests passed`.
- Browser checks use `cd p5sim; python -m http.server 4173 --bind 127.0.0.1` and `http://127.0.0.1:4173/tf2_walkthrough/puzzle-lab.html`.

---

### Task 1: Shared runtime module and puzzle test runner

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-runtime.js`
- Create: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Create the test runner with failing runtime tests**

Create `p5sim/tf2_walkthrough/puzzle-tests.js`:

```js
(function runPuzzleTests(root) {
  "use strict";

  const runningInNode = typeof module !== "undefined" && module.exports;
  const tests = [];

  function load(path, globalName) {
    if (runningInNode) {
      try { return require(path); } catch (error) { if (error && error.code === "MODULE_NOT_FOUND") return null; throw error; }
    }
    return globalName ? root[globalName] || null : root;
  }

  const runtime = load("./puzzle-runtime.js", "PuzzleRuntime");
  const catalog = load("./puzzles.js");
  const workerModule = load("./puzzle-worker.js", "PuzzleWorker");
  const engine = load("./puzzle-engine.js");
  const scenes = load("./puzzle-scenes.js", "PuzzleScenes");

  function test(name, run) { tests.push({ name, run }); }
  function requireApi(api, name) { if (!api || (api === root && !root.TF2_PUZZLES)) throw new Error(name + " is not implemented"); return api; }
  function near(actual, expected, epsilon) {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > (epsilon || 1e-6)) throw new Error("expected " + expected + ", received " + actual);
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function same(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error((message || "mismatch") + ": " + JSON.stringify(actual) + " vs " + JSON.stringify(expected));
  }
  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  // ---------------------------------------------------------------- runtime
  const ADD_SOURCE = "function addOne(n) { return n + 1; }";

  test("runtime compiles learner, reference, and variants and evaluates them", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const compiled = api.compileProgram({
      learner: { functionName: "addOne", source: ADD_SOURCE, dependencySources: [] },
      reference: { functionName: "addOne", source: "function addOne(n) { return n + 1; }", dependencySources: [] },
      variants: [{ id: "minus", source: "function addOne(n) { return n - 1; }" }],
    });
    assert(compiled.learner.ok && compiled.reference.ok, "scopes should compile");
    const result = api.evaluateCompiled(compiled, [4]);
    same(result.learner, { ok: true, value: 5, inputMutated: false });
    same(result.reference.value, 5);
    same(result.variants, { minus: 3 });
  });

  test("runtime reports syntax errors and missing functions", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const broken = api.compileScope("addOne", "function addOne(n) { return n + ; }", []);
    assert(!broken.ok && broken.error.kind === "syntax", "syntax error expected");
    const missing = api.compileScope("addOne", "function other(n) { return n; }", []);
    assert(!missing.ok && missing.error.kind === "missing-function", "missing function expected");
  });

  test("runtime reports runtime errors, undefined returns, and mutation", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const thrower = api.compileScope("f", "function f() { throw new Error('boom'); }", []);
    const thrown = api.callSafely(thrower.fn, []);
    assert(!thrown.ok && thrown.error.kind === "runtime" && thrown.error.message === "boom", "runtime error expected");
    const silent = api.compileScope("f", "function f() { }", []);
    const undefinedResult = api.callSafely(silent.fn, []);
    assert(!undefinedResult.ok && undefinedResult.error.kind === "serialization", "undefined return should be reported");
    const mutator = api.compileScope("f", "function f(v) { v.x = 9; return { x: v.x }; }", []);
    const mutated = api.callSafely(mutator.fn, [{ x: 1 }]);
    assert(mutated.ok && mutated.inputMutated === true, "mutation should be detected");
  });

  test("runtime makes dependency sources visible to the compiled function", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const scope = api.compileScope("twice", "function twice(n) { return addOne(addOne(n)); }", [ADD_SOURCE]);
    assert(scope.ok, "dependency should compile");
    same(api.callSafely(scope.fn, [1]).value, 3);
  });

  async function runAllTests() {
    let passed = 0;
    const failures = [];
    for (const item of tests) {
      try { await item.run(); passed += 1; } catch (error) { failures.push({ name: item.name, error }); }
    }
    if (runningInNode) {
      failures.forEach(({ name, error }) => console.error("FAIL " + name + ": " + error.message));
      console.log(passed + "/" + tests.length + " puzzle tests passed");
      if (failures.length) process.exitCode = 1;
    } else if (typeof root.renderPuzzleTestResults === "function") {
      root.renderPuzzleTestResults({ passed, total: tests.length, failures });
    }
  }

  if (runningInNode) runAllTests();
  else root.addEventListener("DOMContentLoaded", runAllTests);
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 2: Run the tests and confirm they fail because the runtime is missing**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: four `FAIL ... puzzle-runtime.js is not implemented` lines and `0/4 puzzle tests passed`.

- [ ] **Step 3: Create the runtime module**

Create `p5sim/tf2_walkthrough/puzzle-runtime.js`:

```js
(function exposePuzzleRuntime(root) {
  "use strict";

  function cloneValue(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function serializableValue(value, seen) {
    if (typeof value === "number") return Number.isFinite(value);
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value !== "object" || typeof value.then === "function") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    const values = Array.isArray(value) ? value : Object.values(value);
    const valid = values.every((item) => serializableValue(item, seen));
    seen.delete(value);
    return valid;
  }

  function errorMessage(error) {
    if (error && typeof error.message === "string") return error.message;
    return String(error);
  }

  function compileScope(functionName, source, dependencySources) {
    try {
      const body = [
        "\"use strict\";",
        ...(dependencySources || []),
        source || "",
        "return typeof " + functionName + " === \"function\" ? " + functionName + " : null;",
      ].join("\n");
      const fn = new Function(body)();
      if (typeof fn !== "function") {
        return { ok: false, error: { kind: "missing-function", message: "Define " + functionName + " with the shown signature." } };
      }
      return { ok: true, fn };
    } catch (error) {
      return { ok: false, error: { kind: "syntax", message: errorMessage(error) } };
    }
  }

  function compileProgram(program) {
    const learner = compileScope(program.learner.functionName, program.learner.source, program.learner.dependencySources);
    const reference = program.reference
      ? compileScope(program.reference.functionName, program.reference.source, program.reference.dependencySources)
      : null;
    const referenceDependencies = program.reference ? program.reference.dependencySources : [];
    const referenceName = program.reference ? program.reference.functionName : program.learner.functionName;
    const variants = (program.variants || []).map((variant) => ({
      id: variant.id,
      compiled: compileScope(variant.functionName || referenceName, variant.source, referenceDependencies),
    }));
    return { learner, reference, variants };
  }

  function callSafely(fn, args) {
    const cloned = cloneValue(args);
    const before = JSON.stringify(cloned);
    let value;
    try {
      value = fn.apply(null, cloned);
    } catch (error) {
      return { ok: false, error: { kind: "runtime", message: errorMessage(error) } };
    }
    if (value === undefined) {
      return { ok: false, error: { kind: "serialization", message: "Your function returned undefined. Add a return statement." } };
    }
    if (!serializableValue(value, new Set())) {
      return { ok: false, error: { kind: "serialization", message: "Return finite JSON data, not a Promise, function, cycle, NaN, or Infinity." } };
    }
    return { ok: true, value: cloneValue(value), inputMutated: before !== JSON.stringify(cloned) };
  }

  function evaluateCompiled(compiled, args) {
    const result = { learner: null, reference: null, variants: {} };
    result.learner = compiled.learner.ok ? callSafely(compiled.learner.fn, args) : { ok: false, error: compiled.learner.error };
    if (compiled.reference) {
      result.reference = compiled.reference.ok ? callSafely(compiled.reference.fn, args) : { ok: false, error: compiled.reference.error };
    }
    compiled.variants.forEach((variant) => {
      const outcome = variant.compiled.ok ? callSafely(variant.compiled.fn, args) : null;
      result.variants[variant.id] = outcome && outcome.ok ? outcome.value : null;
    });
    return result;
  }

  const api = Object.freeze({ cloneValue, serializableValue, compileScope, compileProgram, callSafely, evaluateCompiled });
  root.PuzzleRuntime = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `4/4 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-runtime.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add shared puzzle runtime and puzzle test runner

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 2: Catalog scaffolding plus Stage 1 and Stage 2 puzzles

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js` (full replacement)
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing catalog tests for stages 1 and 2**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- catalog helpers
  function puzzlesApi() { return requireApi(catalog, "puzzles.js"); }
  function puzzleList() { return puzzlesApi().TF2_PUZZLES; }
  function referenceDependencies(puzzle) {
    const api = puzzlesApi();
    const collected = new Set();
    (function visit(id) {
      if (collected.has(id)) return;
      const entry = api.getPuzzle(id);
      if (!entry) throw new Error("unknown dependency " + id);
      entry.dependencies.forEach(visit);
      collected.add(id);
    })(puzzle.id);
    collected.delete(puzzle.id);
    return api.TF2_PUZZLES.filter((entry) => collected.has(entry.id)).map((entry) => entry.referenceSource);
  }
  function referenceProgram(puzzle) {
    return {
      learner: { functionName: puzzle.functionName, source: puzzle.referenceSource, dependencySources: referenceDependencies(puzzle) },
      reference: { functionName: puzzle.functionName, source: puzzle.referenceSource, dependencySources: referenceDependencies(puzzle) },
      variants: puzzle.diagnoses.map((entry) => ({ id: entry.id, source: entry.source })),
    };
  }
  function idsInRange(from, to) {
    return puzzleList().filter((puzzle) => puzzle.number >= from && puzzle.number <= to).map((puzzle) => puzzle.id);
  }
  function angleClose(a, b) { const d = Math.atan2(Math.sin(a - b), Math.cos(a - b)); return Math.abs(d) <= 1e-6; }
  function valuesMatch(comparator, actual, expected) {
    if (comparator === "angle") return typeof actual === "number" && angleClose(actual, expected);
    if (comparator === "quaternion") {
      if (!actual || !expected) return false;
      const keys = ["x", "y", "z", "w"];
      const direct = Math.max(...keys.map((key) => Math.abs(actual[key] - expected[key])));
      const negated = Math.max(...keys.map((key) => Math.abs(actual[key] + expected[key])));
      return Math.min(direct, negated) <= 1e-6;
    }
    if (typeof expected === "number") return typeof actual === "number" && Math.abs(actual - expected) <= 1e-6;
    if (expected === null || typeof expected !== "object") return Object.is(actual, expected);
    if (!actual || typeof actual !== "object" || Array.isArray(actual) !== Array.isArray(expected)) return false;
    const keys = Object.keys(expected);
    if (keys.length !== Object.keys(actual).length) return false;
    return keys.every((key) => {
      if (key === "yaw" && typeof expected[key] === "number") return typeof actual[key] === "number" && angleClose(actual[key], expected[key]);
      if (comparator === "se3" && key === "rotation") return valuesMatch("quaternion", actual[key], expected[key]);
      return valuesMatch(comparator, actual[key], expected[key]);
    });
  }
  function checkStageRange(from, to) {
    const api = requireApi(runtime, "puzzle-runtime.js");
    puzzleList().filter((puzzle) => puzzle.number >= from && puzzle.number <= to).forEach((puzzle) => {
      assert(puzzle.hints.length === 3, puzzle.id + " needs three hints");
      assert(puzzle.publicCases.length === 1 && puzzle.checkCases.length >= 2, puzzle.id + " needs one public and at least two check cases");
      assert(puzzle.scene && puzzle.scene.kind && Array.isArray(puzzle.scene.handles), puzzle.id + " needs a scene");
      const compiled = api.compileProgram(referenceProgram(puzzle));
      assert(compiled.learner.ok, puzzle.id + " reference failed to compile: " + (compiled.learner.ok ? "" : compiled.learner.error.message));
      compiled.variants.forEach((variant) => assert(variant.compiled.ok, puzzle.id + " variant " + variant.id + " failed to compile"));
      const cases = puzzle.publicCases.concat(puzzle.checkCases);
      const variantDiffers = {};
      cases.forEach((testCase) => {
        const result = api.evaluateCompiled(compiled, testCase.args);
        assert(result.learner.ok, puzzle.id + " reference threw on " + testCase.label + ": " + (result.learner.ok ? "" : result.learner.error.message));
        assert(!result.learner.inputMutated, puzzle.id + " reference mutated input on " + testCase.label);
        assert(valuesMatch(puzzle.comparator, result.learner.value, testCase.expected), puzzle.id + " reference mismatch on " + testCase.label + ": " + JSON.stringify(result.learner.value));
        puzzle.diagnoses.forEach((entry) => {
          if (!valuesMatch(puzzle.comparator, result.variants[entry.id], testCase.expected)) variantDiffers[entry.id] = true;
        });
      });
      puzzle.diagnoses.forEach((entry) => assert(variantDiffers[entry.id], puzzle.id + " diagnosis " + entry.id + " never differs from the reference"));
    });
  }

  test("catalog stages 1 and 2 contain the rotation and frame bricks", () => {
    same(idsInRange(1, 11), [
      "heading-vector", "heading-of", "wrap-angle", "rotate-vector", "yaw-delta",
      "transform-point", "transform-vector", "transform-pose", "compose", "invert", "relative-transform",
    ]);
  });

  test("catalog stages 1 and 2 references pass their cases and diagnoses differ", () => {
    checkStageRange(1, 11);
  });
```

- [ ] **Step 2: Run the tests and confirm the catalog tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: the two catalog tests fail (the current `puzzles.js` still exports the old ids) and `4/6 puzzle tests passed`.

- [ ] **Step 3: Replace `puzzles.js` with the new catalog scaffolding and stages 1 and 2**

Replace the entire content of `p5sim/tf2_walkthrough/puzzles.js` with:

```js
(function exposeTF2Puzzles(root) {
  "use strict";

  const PI = Math.PI;
  const FRAME_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser", "camera"]);
  const CHAIN_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser"]);

  const STAGES = Object.freeze([
    { id: "rotation-bricks", title: "Rotation Bricks", subtitle: "cos, sin, atan2, and the angle wrap.", range: [1, 5] },
    { id: "frames", title: "Frames (SE(2))", subtitle: "Apply, compose, invert, and relate rigid transforms.", range: [6, 11] },
    { id: "tree", title: "Tree", subtitle: "Turn parent-child edges into traversable structure.", range: [12, 16] },
    { id: "lookup-robot", title: "Lookup & Robot Frames", subtitle: "Resolve map, odom, base_link, and laser questions.", range: [17, 19] },
    { id: "time", title: "Time", subtitle: "Interpolate samples and respect buffer boundaries.", range: [20, 23] },
    { id: "se3", title: "SE(3)", subtitle: "Lift the same ideas into quaternion-based 3D.", range: [24, 26] },
    { id: "capstone", title: "Capstone", subtitle: "Answer a stamped lookup end to end.", range: [27, 27] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "tf2", title: "Track 1 · TF2", stages: STAGES }),
    Object.freeze({
      id: "pose-correction",
      title: "Track 2 · Pose Correction",
      unlockAfter: "stamped-lookup",
      note: "Unlocks after the stamped lookup capstone. Puzzles arrive with the next track.",
      stages: Object.freeze([
        { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points, line fits, and distances.", range: [0, 0] },
        { id: "rack-filters", title: "Rack Filters", subtitle: "Accumulate, filter, smooth, and agree.", range: [0, 0] },
        { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, lateral error, corrected pose.", range: [0, 0] },
        { id: "correction-capstone", title: "Correction Capstone", subtitle: "Publish map → odom on a drifting robot.", range: [0, 0] },
      ]),
    }),
  ]);

  function lines() {
    return Array.from(arguments).join("\n");
  }

  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }

  function example(args, expected, label) {
    return Object.freeze({ args, expected, label });
  }

  function diagnosis(id, message, source) {
    return Object.freeze({ id, message, source });
  }

  function handle(config) {
    return Object.freeze(config);
  }

  function puzzle(config) {
    const stage = STAGES.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      ...config,
      track: "tf2",
      stage: stage.id,
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(config.scene.handles.map(handle)),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  const STAGE_1_2 = [
    puzzle({
      number: 1, id: "heading-vector", title: "Point Along a Yaw",
      goal: "Turn a yaw angle into the unit vector that points along it.",
      concept: "Every rotation in SE(2) is built from this pair: cos for x and sin for y.",
      functionName: "headingVector", signature: "headingVector(yaw) → { x, y }",
      starterSource: starter("headingVector", "yaw", "The unit vector along yaw: cos for x, sin for y."),
      referenceSource: "function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }",
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "dial", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }] },
      diagnoses: [diagnosis("swapped", "Mirrored across the diagonal: x should use cos(yaw) and y should use sin(yaw).", "function headingVector(yaw) { return { x: Math.sin(yaw), y: Math.cos(yaw) }; }")],
      hints: ["A heading is a direction, so its vector has length one.", "On the unit circle, x = cos(yaw) and y = sin(yaw).", "Return { x: Math.cos(yaw), y: Math.sin(yaw) }."],
      cases: [
        example([PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([0], { x: 1, y: 0 }, "zero yaw"),
        example([PI], { x: -1, y: 0 }, "half turn"),
        example([-PI / 4], { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 2, id: "heading-of", title: "Vector to Heading",
      goal: "Recover the signed yaw of a direction in every quadrant.",
      concept: "atan2 keeps the quadrant that a plain ratio throws away.",
      functionName: "headingOf", signature: "headingOf(v) → radians",
      starterSource: starter("headingOf", "v", "Use the two-argument arctangent."),
      referenceSource: "function headingOf(v) { return Math.atan2(v.y, v.x); }",
      comparator: "angle", walkthroughChapter: "data-types",
      scene: { kind: "vector", handles: [{ id: "v", type: "vector", label: "v", value: { x: 2, y: 1.2 } }] },
      diagnoses: [
        diagnosis("atan2-swapped", "Arguments swapped: atan2 takes (y, x), so the angle is measured from the wrong axis.", "function headingOf(v) { return Math.atan2(v.x, v.y); }"),
        diagnosis("atan-ratio", "atan(y / x) loses the quadrant: a vector pointing left comes back as if it pointed right.", "function headingOf(v) { return Math.atan(v.y / v.x); }"),
      ],
      hints: ["A direction's angle depends on both components and their signs.", "Math.atan2(y, x) keeps the quadrant; a plain ratio does not.", "Return Math.atan2(v.y, v.x)."],
      cases: [
        example([{ x: 0, y: 3 }], PI / 2, "positive Y"),
        example([{ x: 2, y: 0 }], 0, "positive X"),
        example([{ x: -1, y: -1 }], -3 * PI / 4, "third quadrant"),
        example([{ x: -2, y: 0 }], PI, "negative X"),
      ],
    }),
    puzzle({
      number: 3, id: "wrap-angle", title: "Wrap an Angle",
      goal: "Bring any angle into the range [-π, π) without changing its direction.",
      concept: "Angles repeat every full turn; TF2 compares and interpolates yaw only after wrapping.",
      functionName: "wrapAngle", signature: "wrapAngle(angle) → radians in [-π, π)",
      starterSource: starter("wrapAngle", "angle", "Shift by π, reduce modulo 2π, fix a negative remainder, shift back."),
      referenceSource: lines(
        "function wrapAngle(angle) {",
        "  var wrapped = (angle + Math.PI) % (2 * Math.PI);",
        "  if (wrapped < 0) wrapped += 2 * Math.PI;",
        "  return wrapped - Math.PI;",
        "}"
      ),
      comparator: "scalar", walkthroughChapter: "data-types",
      scene: { kind: "dial", handles: [{ id: "angle", type: "dial", label: "angle", value: 4.0, accumulate: true }] },
      diagnoses: [diagnosis("unwrapped", "Same direction, but not wrapped: the value must land inside [-π, π).", "function wrapAngle(angle) { return angle; }")],
      hints: ["Angles repeat every full turn; two values can mean the same direction.", "Shift by π, take the remainder modulo 2π, fix a negative remainder, then shift back.", "wrapped = (angle + π) mod 2π; add 2π if negative; return wrapped − π."],
      cases: [
        example([4], 4 - 2 * PI, "past π"),
        example([0.5], 0.5, "already inside"),
        example([-4], -4 + 2 * PI, "below −π"),
        example([7], 7 - 2 * PI, "more than a turn"),
        example([PI], -PI, "exactly π maps to −π"),
      ],
    }),
    puzzle({
      number: 4, id: "rotate-vector", title: "Turn a Direction",
      goal: "Rotate a vector by yaw without translating it.",
      concept: "The 2×2 rotation matrix mixes x and y; a flipped sin sign mirrors the result.",
      functionName: "rotateVector", signature: "rotateVector(v, yaw) → vector",
      starterSource: starter("rotateVector", "v, yaw", "Apply the 2×2 rotation matrix rows [cos, -sin] and [sin, cos]."),
      referenceSource: lines(
        "function rotateVector(v, yaw) {",
        "  var c = Math.cos(yaw);",
        "  var s = Math.sin(yaw);",
        "  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "vector-dial", handles: [
        { id: "v", type: "vector", label: "v", value: { x: 2, y: 0.5 } },
        { id: "yaw", type: "dial", label: "yaw", value: 0.8 },
      ] },
      diagnoses: [
        diagnosis("negated-yaw", "Rotated the wrong way: the sign of sin is flipped, which mirrors the rotation.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: c * v.x + s * v.y, y: -s * v.x + c * v.y }; }"),
        diagnosis("swapped-rows", "Rows swapped: x′ should be cos·x − sin·y and y′ should be sin·x + cos·y.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: s * v.x + c * v.y, y: c * v.x - s * v.y }; }"),
      ],
      hints: ["A rotation mixes x and y but never adds an offset.", "Use the matrix rows [cos, −sin] and [sin, cos].", "x′ = cos(yaw)·x − sin(yaw)·y; y′ = sin(yaw)·x + cos(yaw)·y."],
      cases: [
        example([{ x: 1, y: 0 }, PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([{ x: 2, y: -3 }, PI], { x: -2, y: 3 }, "half turn"),
        example([{ x: 0, y: 2 }, PI / 2], { x: -2, y: 0 }, "quarter turn of +Y"),
        example([{ x: 3, y: 4 }, 0], { x: 3, y: 4 }, "zero yaw"),
      ],
    }),
    puzzle({
      number: 5, id: "yaw-delta", title: "Shortest Turn",
      goal: "Return the shortest signed turn from one heading to another.",
      concept: "Interpolation, correction, and comparison all need the short way around the circle.",
      functionName: "yawDelta", signature: "yawDelta(from, to) → radians in [-π, π)",
      starterSource: starter("yawDelta", "from, to", "Subtract, then wrap with your wrapAngle."),
      referenceSource: "function yawDelta(from, to) { return wrapAngle(to - from); }",
      comparator: "scalar", walkthroughChapter: "time-buffer",
      dependencies: ["wrap-angle"],
      scene: { kind: "two-dials", handles: [
        { id: "from", type: "dial", label: "from", value: 2.8, radius: 1.6 },
        { id: "to", type: "dial", label: "to", value: -2.6, radius: 2.4 },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: yawDelta measures the turn from `from` to `to`, so subtract from, not to.", "function yawDelta(from, to) { return wrapAngle(from - to); }"),
        diagnosis("long-way", "Took the long way around: wrap the difference so the turn is the shortest signed one.", "function yawDelta(from, to) { return to - from; }"),
      ],
      hints: ["The shortest turn is never more than half a circle.", "Subtract to − from, then wrap the result with your wrapAngle.", "Return wrapAngle(to - from)."],
      cases: [
        example([170 * PI / 180, -170 * PI / 180], PI / 9, "across the wrap"),
        example([0, PI / 2], PI / 2, "quarter turn left"),
        example([1, 0.5], -0.5, "small turn right"),
        example([-PI / 2, PI / 2], -PI, "half turn"),
      ],
    }),
    puzzle({
      number: 6, id: "transform-point", title: "Move a Point Between Frames",
      goal: "Express a source-frame point in target-frame coordinates.",
      concept: "T_target_source rotates first, then translates. The point does not move; its numbers change.",
      functionName: "transformPoint", signature: "transformPoint(transform, point) → point",
      starterSource: starter("transformPoint", "transform, point", "Rotate point by transform.yaw, then add transform.x and transform.y."),
      referenceSource: lines(
        "function transformPoint(transform, point) {",
        "  var rotated = rotateVector(point, transform.yaw);",
        "  return { x: rotated.x + transform.x, y: rotated.y + transform.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [
        diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too. Rotate the point first, then add the translation.", "function transformPoint(transform, point) { var shifted = { x: point.x + transform.x, y: point.y + transform.y }; return rotateVector(shifted, transform.yaw); }"),
        diagnosis("rotation-ignored", "Rotation ignored: the point was only shifted.", "function transformPoint(transform, point) { return { x: point.x + transform.x, y: point.y + transform.y }; }"),
        diagnosis("negated-yaw", "Rotated by −yaw: the point went the wrong way around the frame origin.", "function transformPoint(transform, point) { var rotated = rotateVector(point, -transform.yaw); return { x: rotated.x + transform.x, y: rotated.y + transform.y }; }"),
      ],
      hints: ["T_target_source turns source coordinates into target coordinates.", "A rigid transform rotates first, then translates.", "Rotate point by transform.yaw with rotateVector, then add transform.x and transform.y."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn transform"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([{ x: 1, y: 1, yaw: -PI / 2 }, { x: 0, y: 2 }], { x: 3, y: 1 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 7, id: "transform-vector", title: "Move a Vector Between Frames",
      goal: "Express a source-frame vector in target-frame coordinates.",
      concept: "Vectors are displacements: they rotate with the frame but ignore where its origin is.",
      functionName: "transformVector", signature: "transformVector(transform, vector) → vector",
      starterSource: starter("transformVector", "transform, vector", "Only the rotation applies to a vector."),
      referenceSource: "function transformVector(transform, vector) { return rotateVector(vector, transform.yaw); }",
      comparator: "vector2", walkthroughChapter: "data-types",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-vector", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "vector", type: "vector", label: "v", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("translated", "A vector was translated: directions and displacements ignore where the frame origin is.", "function transformVector(transform, vector) { var r = rotateVector(vector, transform.yaw); return { x: r.x + transform.x, y: r.y + transform.y }; }")],
      hints: ["A vector is a displacement; moving the origin does not change it.", "Only the rotation part of the transform applies.", "Return rotateVector(vector, transform.yaw)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 0, y: 2 }, "rotated only"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -2, y: 3 }, "half turn"),
        example([{ x: 10, y: 10, yaw: 0 }, { x: 1, y: 1 }], { x: 1, y: 1 }, "translation ignored"),
      ],
    }),
    puzzle({
      number: 8, id: "transform-pose", title: "Move a Pose Between Frames",
      goal: "Transform position and heading together.",
      concept: "A pose is a point plus a yaw; the yaws add and the sum is wrapped.",
      functionName: "transformPose", signature: "transformPose(transform, pose) → pose",
      starterSource: starter("transformPose", "transform, pose", "Transform the point, then compose the headings."),
      referenceSource: lines(
        "function transformPose(transform, pose) {",
        "  var point = transformPoint(transform, pose);",
        "  return { x: point.x, y: point.y, yaw: wrapAngle(transform.yaw + pose.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "stamped-data",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-pose", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "pose", type: "pose", label: "pose", value: { x: 1, y: 0, yaw: PI / 2 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("yaw-not-composed", "Position moved but heading did not: add the frame's yaw to the pose's yaw.", "function transformPose(transform, pose) { var point = transformPoint(transform, pose); return { x: point.x, y: point.y, yaw: pose.yaw }; }")],
      hints: ["A pose is a point plus a heading.", "Transform the point, then add the yaws and wrap.", "Use transformPoint for x, y and wrapAngle(transform.yaw + pose.yaw) for yaw."],
      cases: [
        example([{ x: 2, y: 1, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 2, y: 2, yaw: PI }, "pose composition"),
        example([{ x: 0, y: 0, yaw: 3 * PI / 4 }, { x: 0, y: 0, yaw: 3 * PI / 4 }], { x: 0, y: 0, yaw: -PI / 2 }, "yaw wrapping"),
        example([{ x: 1, y: -1, yaw: 0 }, { x: 2, y: 2, yaw: 0.3 }], { x: 3, y: 1, yaw: 0.3 }, "pure translation"),
      ],
    }),
    puzzle({
      number: 9, id: "compose", title: "Chain Two Transforms",
      goal: "Create T_a_c from T_a_b and T_b_c.",
      concept: "The right operand acts first; the child origin is pushed through the parent transform.",
      functionName: "compose", signature: "compose(aFromB, bFromC) → aFromC",
      starterSource: starter("compose", "aFromB, bFromC", "Push c's origin through aFromB, then add the yaws."),
      referenceSource: lines(
        "function compose(aFromB, bFromC) {",
        "  var origin = transformPoint(aFromB, { x: bFromC.x, y: bFromC.y });",
        "  return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ] },
      diagnoses: [
        diagnosis("reversed-order", "Composed in the wrong order: the right operand acts first, so c's origin must be pushed through aFromB, not the other way round.", "function compose(aFromB, bFromC) { var origin = transformPoint(bFromC, { x: aFromB.x, y: aFromB.y }); return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
        diagnosis("translation-unrotated", "Child translation was not rotated by the parent yaw before adding.", "function compose(aFromB, bFromC) { return { x: aFromB.x + bFromC.x, y: aFromB.y + bFromC.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
      ],
      hints: ["Follow the names: a←b then b←c gives a←c.", "The child's origin lives in b; move it into a with aFromB, then add the yaws.", "origin = transformPoint(aFromB, bFromC); yaw = wrapAngle(aFromB.yaw + bFromC.yaw)."],
      cases: [
        example([{ x: 10, y: 0, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 10, y: 1, yaw: PI }, "turning chain"),
        example([{ x: 2, y: -1, yaw: -PI / 2 }, { x: 0, y: 3, yaw: PI }], { x: 5, y: -1, yaw: PI / 2 }, "order-sensitive chain"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: 0.5 }], { x: 4, y: 2, yaw: 0.5 }, "identity parent"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 1, y: 0, yaw: 0 }], { x: 0, y: 1, yaw: -PI }, "half-turn parent"),
      ],
    }),
    puzzle({
      number: 10, id: "invert", title: "Walk an Edge Backward",
      goal: "Invert a rigid transform so target and source exchange roles.",
      concept: "Negate the yaw, then express the reversed translation in the rotated frame.",
      functionName: "invert", signature: "invert(transform) → inverse",
      starterSource: starter("invert", "transform", "Negate yaw; rotate the negated translation by the negated yaw."),
      referenceSource: lines(
        "function invert(transform) {",
        "  var yaw = -transform.yaw;",
        "  var shifted = rotateVector({ x: -transform.x, y: -transform.y }, yaw);",
        "  return { x: shifted.x, y: shifted.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated: the reversed translation must also be rotated by −yaw.", "function invert(transform) { return { x: -transform.x, y: -transform.y, yaw: -transform.yaw }; }"),
        diagnosis("rotated-by-positive-yaw", "Rotated the reversed translation by +yaw instead of −yaw.", "function invert(transform) { var shifted = rotateVector({ x: -transform.x, y: -transform.y }, transform.yaw); return { x: shifted.x, y: shifted.y, yaw: -transform.yaw }; }"),
      ],
      hints: ["The inverse walks the same edge backward.", "Negate the yaw, then express the reversed translation in the rotated frame.", "yaw′ = −yaw; t′ = rotateVector(−t, yaw′)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }], { x: -1, y: 3, yaw: -PI / 2 }, "quarter-turn inverse"),
        example([{ x: 2, y: -4, yaw: 0 }], { x: -2, y: 4, yaw: 0 }, "translation inverse"),
        example([{ x: 0, y: 0, yaw: PI / 3 }], { x: 0, y: 0, yaw: -PI / 3 }, "rotation inverse"),
        example([{ x: 1, y: 1, yaw: PI }], { x: 1, y: 1, yaw: -PI }, "half-turn inverse"),
      ],
    }),
    puzzle({
      number: 11, id: "relative-transform", title: "Where Is b, Seen From a?",
      goal: "Compute aFromB from two world poses.",
      concept: "This is lookup in miniature: go from b up to world, then from world down into a.",
      functionName: "relativeTransform", signature: "relativeTransform(worldFromA, worldFromB) → aFromB",
      starterSource: starter("relativeTransform", "worldFromA, worldFromB", "Invert a, then compose with b."),
      referenceSource: "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromA), worldFromB); }",
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert"],
      scene: { kind: "two-frames", handles: [
        { id: "worldFromA", type: "frame", label: "a", value: { x: -1.5, y: 0.5, yaw: PI / 4 } },
        { id: "worldFromB", type: "frame", label: "b", value: { x: 2, y: 1.5, yaw: -PI / 6 } },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: this is bFromA. aFromB expresses b in a's coordinates, so invert a and then apply b.", "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromB), worldFromA); }"),
        diagnosis("difference-only", "Subtracted world positions without rotating into a's frame.", "function relativeTransform(worldFromA, worldFromB) { return { x: worldFromB.x - worldFromA.x, y: worldFromB.y - worldFromA.y, yaw: wrapAngle(worldFromB.yaw - worldFromA.yaw) }; }"),
      ],
      hints: ["Where is b, as seen from a?", "Go from b up to world, then from world down into a: invert a, then compose.", "Return compose(invert(worldFromA), worldFromB)."],
      cases: [
        example([{ x: 1, y: 0, yaw: PI / 2 }, { x: 1, y: 2, yaw: PI / 2 }], { x: 2, y: 0, yaw: 0 }, "b ahead of a"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 3, y: 2, yaw: 0.5 }], { x: 3, y: 2, yaw: 0.5 }, "a is the world"),
        example([{ x: 2, y: 2, yaw: PI }, { x: 2, y: 0, yaw: PI }], { x: 0, y: 2, yaw: 0 }, "b beside a"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(STAGE_1_2);
  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));

  function getPuzzle(id) {
    return byId.get(id) || null;
  }

  const api = Object.freeze({
    TF2_PUZZLE_STAGES: STAGES,
    TF2_PUZZLE_TRACKS: TRACKS,
    TF2_PUZZLES: PUZZLES,
    getPuzzle,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

`FRAME_OPTIONS` and `CHAIN_OPTIONS` are used by Tasks 3 and 4.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `6/6 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: re-cut puzzle catalog with rotation and frame stages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 3: Stage 3 and Stage 4 puzzles

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests for stages 3 and 4**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog stages 3 and 4 contain the tree and lookup components", () => {
    same(idsInRange(12, 19), [
      "store-edge", "ancestor-chain", "common-ancestor", "directed-path", "validate-tree",
      "lookup-transform", "laser-point-to-map", "correction-from-pose",
    ]);
  });

  test("catalog stages 3 and 4 references pass their cases and diagnoses differ", () => {
    checkStageRange(12, 19);
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `6/8 puzzle tests passed`; the stage 3 and 4 id test reports an empty list.

- [ ] **Step 3: Add the stage 3 and 4 puzzles**

In `puzzles.js`, insert the following constant directly after the `STAGE_1_2` array's closing `];`:

```js
  const ROBOT_TREE_CASE = {
    odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } },
    base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } },
    laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } },
  };

  const STAGE_3_4 = [
    puzzle({
      number: 12, id: "store-edge", title: "Store One TF Edge",
      goal: "Store parentFromChild under the child name without mutating the current tree.",
      concept: "Every non-root frame has exactly one parent, so the child name is the key.",
      functionName: "storeEdge", signature: "storeEdge(tree, edge) → newTree",
      starterSource: starter("storeEdge", "tree, edge"),
      referenceSource: lines(
        "function storeEdge(tree, edge) {",
        "  var next = Object.assign({}, tree);",
        "  next[edge.child] = { parent: edge.parent, transform: edge.transform };",
        "  return next;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "tree-result", handles: [
        { id: "edge", type: "selector", label: "edge to add", value: "base_link", options: ["odom", "base_link", "laser", "camera"] },
      ], args: [{ fixture: "treeWithoutEdge" }, { fixture: "selectedEdge" }] },
      hints: ["The child uniquely identifies its incoming edge.", "Copy the tree, then assign next[edge.child].", "Store both parent and parentFromChild transform under the child key."],
      cases: [
        example([{}, { parent: "map", child: "odom", transform: { x: 1, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, "first edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "odom", child: "base_link", transform: { x: 2, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } } }, "second edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "base_link", child: "laser", transform: { x: 0.5, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, "detached edge"),
      ],
    }),
    puzzle({
      number: 13, id: "ancestor-chain", title: "Climb to the Root",
      goal: "List a frame and every ancestor until the root frame.",
      concept: "Each child record points one step upward; the root has no incoming edge.",
      functionName: "ancestorChain", signature: "ancestorChain(tree, frame) → frame[]",
      starterSource: starter("ancestorChain", "tree, frame"),
      referenceSource: lines(
        "function ancestorChain(tree, frame) {",
        "  var chain = [frame];",
        "  var current = frame;",
        "  while (tree[current]) { current = tree[current].parent; chain.push(current); }",
        "  return chain;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "node-list", handles: [
        { id: "frame", type: "selector", label: "frame", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "frame" }] },
      hints: ["Each child record points one step upward.", "Repeat while tree[current] exists.", "Push the parent, make it current, and stop at a name with no incoming edge."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser"], ["laser", "base_link", "odom", "map"], "sensor chain"),
        example([{ child: { parent: "root" } }, "root"], ["root"], "already root"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, camera: { parent: "base_link" } }, "base_link"], ["base_link", "odom", "map"], "middle of the chain"),
      ],
    }),
    puzzle({
      number: 14, id: "common-ancestor", title: "Find the Join",
      goal: "Find the nearest frame shared by two ancestor chains.",
      concept: "Every lookup passes through exactly one nearest common ancestor.",
      functionName: "commonAncestor", signature: "commonAncestor(tree, a, b) → frame | null",
      starterSource: starter("commonAncestor", "tree, a, b"),
      referenceSource: lines(
        "function commonAncestor(tree, a, b) {",
        "  var aChain = ancestorChain(tree, a);",
        "  var bSet = new Set(ancestorChain(tree, b));",
        "  for (var i = 0; i < aChain.length; i += 1) { if (bSet.has(aChain[i])) return aChain[i]; }",
        "  return null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["ancestor-chain"],
      scene: { kind: "tree", view: "single-node", handles: [
        { id: "a", type: "selector", label: "a", value: "laser", options: FRAME_OPTIONS },
        { id: "b", type: "selector", label: "b", value: "camera", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "a" }, { handle: "b" }] },
      hints: ["Start from one frame so the first match is the nearest.", "Put one chain in a Set, then scan the other from its frame upward.", "Return null when the roots are disconnected."],
      cases: [
        example([{ left: { parent: "base" }, right: { parent: "base" }, base: { parent: "map" } }, "left", "right"], "base", "sibling join"),
        example([{ a: { parent: "rootA" }, b: { parent: "rootB" } }, "a", "b"], null, "disconnected roots"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser", "odom"], "odom", "ancestor is the join"),
      ],
    }),
    puzzle({
      number: 15, id: "directed-path", title: "Mark the Traversal",
      goal: "Build source-to-target steps and mark when an edge must be inverted.",
      concept: "Child-to-parent uses the stored edge; parent-to-child needs its inverse.",
      functionName: "directedPath", signature: "directedPath(tree, target, source) → step[] | null",
      starterSource: starter("directedPath", "tree, target, source"),
      referenceSource: lines(
        "function directedPath(tree, target, source) {",
        "  var join = commonAncestor(tree, target, source);",
        "  if (join === null) return null;",
        "  var steps = [];",
        "  var current = source;",
        "  while (current !== join) { var up = tree[current]; steps.push({ from: current, to: up.parent, child: current, inverse: false }); current = up.parent; }",
        "  var targetChain = ancestorChain(tree, target);",
        "  var down = targetChain.slice(0, targetChain.indexOf(join)).reverse();",
        "  for (var i = 0; i < down.length; i += 1) { steps.push({ from: tree[down[i]].parent, to: down[i], child: down[i], inverse: true }); }",
        "  return steps;",
        "}"
      ),
      comparator: "path", walkthroughChapter: "lookup",
      dependencies: ["ancestor-chain", "common-ancestor"],
      scene: { kind: "tree", view: "steps", handles: [
        { id: "target", type: "selector", label: "target", value: "map", options: FRAME_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "target" }, { handle: "source" }] },
      hints: ["Walk source upward normally, then walk from the join down toward target.", "Child-to-parent uses stored parentFromChild; parent-to-child needs its inverse.", "Build the upward steps first, then reverse target's pre-join ancestor slice for downward steps."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "map", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "odom", child: "base_link", inverse: false }, { from: "odom", to: "map", child: "odom", inverse: false }], "upward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" } }, "base_link", "map"], [{ from: "map", to: "odom", child: "odom", inverse: true }, { from: "odom", to: "base_link", child: "base_link", inverse: true }], "downward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" }, camera: { parent: "base_link" } }, "camera", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "camera", child: "camera", inverse: true }], "sibling lookup"),
      ],
    }),
    puzzle({
      number: 16, id: "validate-tree", title: "Protect the Tree",
      goal: "Reject duplicate parents and cycles before accepting TF edges.",
      concept: "TF allows one parent per child and no frame may be its own ancestor.",
      functionName: "validateTree", signature: "validateTree(edges) → { valid, code? }",
      starterSource: starter("validateTree", "edges"),
      referenceSource: lines(
        "function validateTree(edges) {",
        "  var parents = {};",
        "  for (var i = 0; i < edges.length; i += 1) { if (parents[edges[i].child] && parents[edges[i].child] !== edges[i].parent) return { valid: false, code: \"DUPLICATE_PARENT\" }; parents[edges[i].child] = edges[i].parent; }",
        "  var children = Object.keys(parents);",
        "  for (var j = 0; j < children.length; j += 1) { var seen = new Set(); var current = children[j]; while (parents[current]) { if (seen.has(current)) return { valid: false, code: \"CYCLE\" }; seen.add(current); current = parents[current]; } }",
        "  return { valid: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "validation", handles: [
        { id: "edgeSet", type: "selector", label: "edge set", value: "duplicate-parent", options: ["valid-chain", "duplicate-parent", "cycle"] },
      ], args: [{ fixture: "edgeSet" }] },
      hints: ["TF allows only one parent for each child.", "After recording parents, walk upward from every child and watch for repeats.", "Return DUPLICATE_PARENT first; otherwise return CYCLE when an ancestor repeats."],
      cases: [
        example([[{ parent: "map", child: "base" }, { parent: "odom", child: "base" }]], { valid: false, code: "DUPLICATE_PARENT" }, "duplicate parent"),
        example([[{ parent: "a", child: "b" }, { parent: "b", child: "a" }]], { valid: false, code: "CYCLE" }, "cycle"),
        example([[{ parent: "map", child: "odom" }, { parent: "odom", child: "base" }]], { valid: true }, "valid chain"),
      ],
    }),
    puzzle({
      number: 17, id: "lookup-transform", title: "Resolve T_target_source",
      goal: "Compose each directed path step to answer a transform lookup.",
      concept: "Start with identity at the source; every step goes on the left, inverted when it walks downward.",
      functionName: "lookupTransform", signature: "lookupTransform(tree, target, source) → transform | null",
      starterSource: starter("lookupTransform", "tree, target, source"),
      referenceSource: lines(
        "function lookupTransform(tree, target, source) {",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return null;",
        "  var result = { x: 0, y: 0, yaw: 0 };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = tree[steps[i].child].transform;",
        "    var step = steps[i].inverse ? invert(edge) : edge;",
        "    result = compose(step, result);",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert", "directed-path"],
      scene: { kind: "robot-chain", view: "lookup", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 2, y: 0, yaw: PI / 2 }, in: "odom" },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "chainTree" }, { handle: "target" }, { handle: "source" }] },
      diagnoses: [
        diagnosis("inverse-flags-ignored", "Inverse flags ignored: a step that walks parent → child must use invert(edge).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { result = compose(tree[steps[i].child].transform, result); }",
          "  return result;",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: each new step goes on the left, compose(step, result).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { var edge = tree[steps[i].child].transform; var step = steps[i].inverse ? invert(edge) : edge; result = compose(result, step); }",
          "  return result;",
          "}"
        )),
      ],
      hints: ["Start with identity at the source frame.", "For every step, invert only the downward traversal and left-compose it.", "result = compose(stepTransform, result)."],
      cases: [
        example([ROBOT_TREE_CASE, "map", "laser"], { x: 3, y: 1, yaw: PI / 2 }, "map from laser"),
        example([ROBOT_TREE_CASE, "laser", "map"], { x: -1, y: 3, yaw: -PI / 2 }, "laser from map"),
        example([ROBOT_TREE_CASE, "odom", "laser"], { x: 2, y: 1, yaw: PI / 2 }, "odom from laser"),
        example([{ a: { parent: "rootA", transform: { x: 0, y: 0, yaw: 0 } }, b: { parent: "rootB", transform: { x: 1, y: 0, yaw: 0 } } }, "a", "b"], null, "disconnected"),
      ],
    }),
    puzzle({
      number: 18, id: "laser-point-to-map", title: "Project a Laser Point",
      goal: "Transform a measurement from laser coordinates into map coordinates.",
      concept: "If the math is right, the projected hit stays glued to the landmark while the robot moves.",
      functionName: "laserPointToMap", signature: "laserPointToMap(tree, pointInLaser) → pointInMap",
      starterSource: starter("laserPointToMap", "tree, pointInLaser"),
      referenceSource: lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var mapFromLaser = lookupTransform(tree, \"map\", \"laser\");",
        "  return transformPoint(mapFromLaser, pointInLaser);",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      dependencies: ["lookup-transform", "transform-point"],
      scene: { kind: "robot-chain", view: "landmark", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 1.5, y: 0, yaw: 0.6 }, in: "odom" },
      ], args: [{ fixture: "chainTree" }, { fixture: "laserHit" }] },
      diagnoses: [diagnosis("wrong-direction", "Wrong direction: you applied laserFromMap. The point starts in laser, so you need mapFromLaser (target first).", lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var laserFromMap = lookupTransform(tree, \"laser\", \"map\");",
        "  return transformPoint(laserFromMap, pointInLaser);",
        "}"
      ))],
      hints: ["The point starts in laser and must end in map.", "Ask for mapFromLaser; the target name comes first.", "transformPoint(lookupTransform(tree, \"map\", \"laser\"), pointInLaser)."],
      cases: [
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, { x: 1, y: 0 }], { x: 4.5, y: 0 }, "forward laser hit"),
        example([{ odom: { parent: "map", transform: { x: 0, y: 0, yaw: PI / 2 } }, base_link: { parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0, y: 0, yaw: 0 } } }, { x: 2, y: 0 }], { x: 0, y: 3 }, "rotated map frame"),
        example([ROBOT_TREE_CASE, { x: 0, y: 1 }], { x: 2, y: 1 }, "sideways hit"),
      ],
    }),
    puzzle({
      number: 19, id: "correction-from-pose", title: "Publish map → odom",
      goal: "Turn a corrected robot pose into the map → odom transform without touching odom → base_link.",
      concept: "A localizer or SLAM node never rewrites odometry; it publishes the correction above it.",
      functionName: "correctionFromPose", signature: "correctionFromPose(mapFromBase, odomFromBase) → mapFromOdom",
      starterSource: starter("correctionFromPose", "mapFromBase, odomFromBase"),
      referenceSource: "function correctionFromPose(mapFromBase, odomFromBase) { return compose(mapFromBase, invert(odomFromBase)); }",
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["compose", "invert"],
      scene: { kind: "correction", handles: [
        { id: "odomInMap", type: "frame", label: "odom (drifted)", value: { x: 1.5, y: -0.5, yaw: 0.35 } },
        { id: "odomFromBase", type: "pose", label: "base_link (odometry)", value: { x: 2, y: 0.5, yaw: 0.2 }, in: "odomInMap" },
      ], args: [{ fixture: "mapFromBase" }, { handle: "odomFromBase" }] },
      diagnoses: [
        diagnosis("reversed", "Reversed: that is odomFromMap. map → odom must satisfy mapFromBase = compose(mapFromOdom, odomFromBase).", "function correctionFromPose(mapFromBase, odomFromBase) { return compose(odomFromBase, invert(mapFromBase)); }"),
        diagnosis("difference-only", "Subtracted poses component-wise: the odometry translation must be rotated by the yaw correction first.", "function correctionFromPose(mapFromBase, odomFromBase) { return { x: mapFromBase.x - odomFromBase.x, y: mapFromBase.y - odomFromBase.y, yaw: wrapAngle(mapFromBase.yaw - odomFromBase.yaw) }; }"),
      ],
      hints: ["mapFromBase = mapFromOdom ∘ odomFromBase; solve for mapFromOdom.", "Right-multiply both sides by invert(odomFromBase).", "Return compose(mapFromBase, invert(odomFromBase))."],
      cases: [
        example([{ x: 5, y: 3, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 5, y: 1, yaw: PI / 2 }, "rotated correction"),
        example([{ x: 0, y: 2, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 0, y: 0, yaw: PI / 2 }, "global yaw correction"),
        example([{ x: 3, y: 3, yaw: 0 }, { x: 3, y: 3, yaw: 0 }], { x: 0, y: 0, yaw: 0 }, "no drift"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 0, yaw: PI / 2 }], { x: 1, y: 1, yaw: PI / 2 }, "pure yaw drift"),
      ],
    }),
  ];
```

Then change `const PUZZLES = Object.freeze(STAGE_1_2);` to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4));
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `8/8 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add tree and lookup puzzle stages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 4: Stage 5, 6, and 7 puzzles and full catalog checks

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests for stages 5 to 7 and the complete catalog**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("catalog stages 5 to 7 contain time, SE(3), and the capstone", () => {
    same(idsInRange(20, 27), [
      "interpolate-transform", "bracket-samples", "latest-common-time", "sample-edge",
      "quaternion-multiply", "rotate-by-quaternion", "compose-se3", "stamped-lookup",
    ]);
  });

  test("catalog stages 5 to 7 references pass their cases and diagnoses differ", () => {
    checkStageRange(20, 27);
  });

  test("catalog has exactly 27 sequential puzzles with backward-only dependencies", () => {
    const api = puzzlesApi();
    const list = api.TF2_PUZZLES;
    assert(list.length === 27, "expected 27 puzzles, found " + list.length);
    const seen = new Set();
    list.forEach((puzzle, index) => {
      assert(puzzle.number === index + 1, puzzle.id + " has number " + puzzle.number);
      assert(!seen.has(puzzle.id), "duplicate id " + puzzle.id);
      assert(puzzle.track === "tf2", puzzle.id + " must belong to the tf2 track");
      puzzle.dependencies.forEach((dependency) => assert(seen.has(dependency), puzzle.id + " depends on unknown or later puzzle " + dependency));
      seen.add(puzzle.id);
      assert(api.getPuzzle(puzzle.id) === puzzle, "getPuzzle should resolve " + puzzle.id);
    });
    const stageIds = api.TF2_PUZZLE_STAGES.map((stage) => stage.id);
    list.forEach((puzzle) => assert(stageIds.includes(puzzle.stage), puzzle.id + " has unknown stage " + puzzle.stage));
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "pose-correction"]);
    assert(api.TF2_PUZZLE_TRACKS[1].unlockAfter === "stamped-lookup", "track 2 unlocks after the capstone");
    assert(api.TF2_PUZZLE_TRACKS[1].stages.length === 4, "track 2 lists four placeholder stages");
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `8/11 puzzle tests passed`.

- [ ] **Step 3: Add the stage 5, 6, and 7 puzzles**

In `puzzles.js`, insert the following constant directly after the `STAGE_3_4` array's closing `];`:

```js
  const SAMPLE_HISTORY = [
    { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
    { time: 2, transform: { x: 2, y: 0, yaw: 0 } },
    { time: 5, transform: { x: 5, y: 0, yaw: 0 } },
    { time: 9, transform: { x: 9, y: 0, yaw: 0 } },
  ];
  const DYNAMIC_EDGE_CASE = {
    parent: "map", child: "odom",
    samples: [
      { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
      { time: 4, transform: { x: 4, y: 0, yaw: PI / 2 } },
      { time: 10, transform: { x: 4, y: 6, yaw: PI / 2 } },
    ],
  };
  const STAMPED_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 10, y: 0, yaw: 0 } }] },
    { parent: "odom", child: "base_link", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 6, transform: { x: 6, y: 0, yaw: 0 } }] },
    { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } },
  ];
  const HALF = Math.SQRT1_2;
  const Z90 = { x: 0, y: 0, z: HALF, w: HALF };
  const Y90 = { x: 0, y: HALF, z: 0, w: HALF };
  const IDENTITY_Q = { x: 0, y: 0, z: 0, w: 1 };

  const STAGE_5_7 = [
    puzzle({
      number: 20, id: "interpolate-transform", title: "Blend Two Poses",
      goal: "Interpolate translation linearly and yaw along the shortest turn.",
      concept: "TF2 blends between the two samples that surround a query time.",
      functionName: "interpolateTransform", signature: "interpolateTransform(a, b, amount) → transform",
      starterSource: starter("interpolateTransform", "a, b, amount"),
      referenceSource: lines(
        "function interpolateTransform(a, b, amount) {",
        "  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "time-buffer",
      dependencies: ["yaw-delta", "wrap-angle"],
      scene: { kind: "pose-lerp", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -3, y: -1, yaw: 2.9 } },
        { id: "b", type: "pose", label: "b", value: { x: 2.5, y: 1.5, yaw: -2.7 } },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ] },
      diagnoses: [
        diagnosis("yaw-long-way", "Yaw went the long way around: use yawDelta so the turn crosses ±π on the short side.", "function interpolateTransform(a, b, amount) { return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + (b.yaw - a.yaw) * amount) }; }"),
        diagnosis("amount-inverted", "Amount inverted: amount 0 must return a and amount 1 must return b.", "function interpolateTransform(a, b, amount) { return { x: b.x + (a.x - b.x) * amount, y: b.y + (a.y - b.y) * amount, yaw: wrapAngle(b.yaw + yawDelta(b.yaw, a.yaw) * amount) }; }"),
      ],
      hints: ["amount 0 selects a; amount 1 selects b.", "Blend x and y linearly; blend yaw along yawDelta(a.yaw, b.yaw).", "yaw = wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount)."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: PI / 2 }, 0.5], { x: 2, y: 1, yaw: PI / 4 }, "midpoint"),
        example([{ x: 0, y: 2, yaw: 170 * PI / 180 }, { x: 10, y: 6, yaw: -170 * PI / 180 }, 0.5], { x: 5, y: 4, yaw: PI }, "across the wrap"),
        example([{ x: -4, y: 8, yaw: 0.5 }, { x: 2, y: -4, yaw: 0.5 }, 0.5], { x: -1, y: 2, yaw: 0.5 }, "constant yaw"),
        example([{ x: 1, y: 1, yaw: 1 }, { x: 2, y: 2, yaw: 2 }, 0], { x: 1, y: 1, yaw: 1 }, "amount zero"),
      ],
    }),
    puzzle({
      number: 21, id: "bracket-samples", title: "Find the Surrounding Samples",
      goal: "Locate the two samples around a time and the fraction between them.",
      concept: "A buffer answers a time by bracketing it, then interpolating.",
      functionName: "bracketSamples", signature: "bracketSamples(samples, time) → { beforeIndex, afterIndex, amount }",
      starterSource: starter("bracketSamples", "samples, time"),
      referenceSource: lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: (time - samples[i].time) / (samples[i + 1].time - samples[i].time) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline", handles: [
        { id: "time", type: "timeline", label: "time", value: 3.4, start: -1, end: 11 },
      ], args: [{ fixture: "samples" }, { handle: "time" }] },
      diagnoses: [diagnosis("amount-unnormalized", "Amount is not normalized: divide by the gap between the two samples so it runs from 0 to 1.", lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: time - samples[i].time };",
        "}"
      ))],
      hints: ["Find the two samples that surround the time.", "amount = (time − before.time) / (after.time − before.time); clamp outside the history.", "Walk the samples while the next one is still at or before time."],
      cases: [
        example([SAMPLE_HISTORY, 3], { beforeIndex: 1, afterIndex: 2, amount: 1 / 3 }, "between samples"),
        example([SAMPLE_HISTORY, 2], { beforeIndex: 1, afterIndex: 2, amount: 0 }, "exactly on a sample"),
        example([SAMPLE_HISTORY, -1], { beforeIndex: 0, afterIndex: 0, amount: 0 }, "before the history"),
        example([SAMPLE_HISTORY, 12], { beforeIndex: 3, afterIndex: 3, amount: 0 }, "after the history"),
        example([SAMPLE_HISTORY, 0], { beforeIndex: 0, afterIndex: 1, amount: 0 }, "on the first sample"),
      ],
    }),
    puzzle({
      number: 22, id: "latest-common-time", title: "Find a Valid Query Time",
      goal: "Intersect dynamic buffer ranges and classify past or future extrapolation.",
      concept: "TimePointZero means the latest time every edge on the path can answer.",
      functionName: "latestCommonTime", signature: "latestCommonTime(ranges, requestedTime) → availability",
      starterSource: starter("latestCommonTime", "ranges, requestedTime"),
      referenceSource: lines(
        "function latestCommonTime(ranges, requestedTime) {",
        "  var start = Math.max.apply(null, ranges.map(function (range) { return range.start; }));",
        "  var end = Math.min.apply(null, ranges.map(function (range) { return range.end; }));",
        "  if (start > end) return { ok: false, code: \"NO_COMMON_TIME\", bounds: { start: start, end: end } };",
        "  var time = requestedTime === null ? end : requestedTime;",
        "  if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  return { ok: true, time: time, bounds: { start: start, end: end } };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline-ranges", handles: [
        { id: "requested", type: "timeline", label: "requested time", value: 5, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
      ], args: [{ fixture: "ranges" }, { fixture: "requestedOrNull" }] },
      hints: ["The common start is the maximum start; the common end is the minimum end.", "No overlap occurs when the common start exceeds the common end.", "Use the common end for latest; classify requests below start as past and above end as future."],
      cases: [
        example([[{ start: 0, end: 8 }, { start: 2, end: 6 }], null], { ok: true, time: 6, bounds: { start: 2, end: 6 } }, "latest overlap"),
        example([[{ start: 2, end: 4 }], 1], { ok: false, code: "PAST_EXTRAPOLATION", bounds: { start: 2, end: 4 } }, "past request"),
        example([[{ start: 0, end: 1 }, { start: 2, end: 3 }], null], { ok: false, code: "NO_COMMON_TIME", bounds: { start: 2, end: 1 } }, "no overlap"),
        example([[{ start: 0, end: 5 }], 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
      ],
    }),
    puzzle({
      number: 23, id: "sample-edge", title: "Sample an Edge at a Time",
      goal: "Return the transform an edge reports at a time: static passthrough or bracketed interpolation.",
      concept: "Static edges are valid at every time; dynamic edges interpolate their history.",
      functionName: "sampleEdge", signature: "sampleEdge(edge, time) → transform",
      starterSource: starter("sampleEdge", "edge, time"),
      referenceSource: lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  return interpolateTransform(edge.samples[bracket.beforeIndex].transform, edge.samples[bracket.afterIndex].transform, bracket.amount);",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "broadcasters",
      dependencies: ["bracket-samples", "interpolate-transform"],
      scene: { kind: "timeline-frame", handles: [
        { id: "time", type: "timeline", label: "time", value: 2.5, start: -1, end: 11 },
        { id: "edgeKind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "edge" }, { handle: "time" }] },
      diagnoses: [diagnosis("nearest-sample", "Snapped to the nearest sample: TF2 interpolates between the surrounding samples.", lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  var index = bracket.amount < 0.5 ? bracket.beforeIndex : bracket.afterIndex;",
        "  var t = edge.samples[index].transform;",
        "  return { x: t.x, y: t.y, yaw: t.yaw };",
        "}"
      ))],
      hints: ["A static edge ignores time.", "Bracket the samples, then interpolate between the two transforms.", "interpolateTransform(before.transform, after.transform, bracket.amount)."],
      cases: [
        example([DYNAMIC_EDGE_CASE, 2], { x: 2, y: 0, yaw: PI / 4 }, "halfway through the first segment"),
        example([DYNAMIC_EDGE_CASE, 7], { x: 4, y: 3, yaw: PI / 2 }, "second segment"),
        example([DYNAMIC_EDGE_CASE, 12], { x: 4, y: 6, yaw: PI / 2 }, "clamped after the history"),
        example([{ parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } }, 99], { x: 1, y: 0, yaw: 0 }, "static edge"),
      ],
    }),
    puzzle({
      number: 24, id: "quaternion-multiply", title: "Multiply Quaternions",
      goal: "Compute the Hamilton product a × b.",
      concept: "Rotations compose by quaternion multiplication, and the order matters.",
      functionName: "quaternionMultiply", signature: "quaternionMultiply(a, b) → quaternion",
      starterSource: starter("quaternionMultiply", "a, b"),
      referenceSource: lines(
        "function quaternionMultiply(a, b) {",
        "  return {",
        "    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,",
        "    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,",
        "    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,",
        "    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,",
        "  };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      scene: { kind: "se3", view: "multiply", handles: [
        { id: "yawA", type: "slider", label: "a: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "quatA" }, { fixture: "quatB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied in the wrong order: quaternion products do not commute; compute a × b with a on the left.", lines(
          "function quaternionMultiply(b, a) {",
          "  return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z };",
          "}"
        )),
        diagnosis("component-sum", "Added components: rotations compose by the Hamilton product, not by adding quaternions.", "function quaternionMultiply(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w }; }"),
      ],
      hints: ["A quaternion is a scalar w plus a vector (x, y, z).", "w′ = w₁w₂ − v₁·v₂; v′ = w₁v₂ + w₂v₁ + v₁×v₂.", "Write the four component formulas of the Hamilton product with a on the left."],
      cases: [
        example([Z90, Z90], { x: 0, y: 0, z: 1, w: 0 }, "two quarter turns"),
        example([IDENTITY_Q, Z90], Z90, "identity on the left"),
        example([Z90, Y90], { x: -0.5, y: 0.5, z: 0.5, w: 0.5 }, "Z then Y"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 0, y: 0, z: 0, w: 3 }], { x: 0, y: 0, z: 0, w: 6 }, "scalars multiply"),
      ],
    }),
    puzzle({
      number: 25, id: "rotate-by-quaternion", title: "Rotate with a Quaternion",
      goal: "Normalize a quaternion and rotate a 3D vector with it.",
      concept: "q v q⁻¹ rotates the pure quaternion v; the conjugate of a unit quaternion is its inverse.",
      functionName: "rotateByQuaternion", signature: "rotateByQuaternion(q, v) → vector3",
      starterSource: starter("rotateByQuaternion", "q, v"),
      referenceSource: lines(
        "function rotateByQuaternion(q, v) {",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
        "  var rotated = quaternionMultiply(quaternionMultiply(unit, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
        "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      scene: { kind: "se3", view: "rotate", handles: [
        { id: "yaw", type: "slider", label: "q: yaw about Z", value: PI / 2, min: -PI, max: PI },
      ], args: [{ fixture: "quat" }, { fixture: "vector" }] },
      diagnoses: [
        diagnosis("inverse-rotation", "Rotated the wrong way: q⁻¹ v q is the inverse rotation. Use q v q⁻¹.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(conjugate, { x: v.x, y: v.y, z: v.z, w: 0 }), unit);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized first, so the vector length was scaled.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(q, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
      ],
      hints: ["A valid rotation quaternion has unit length.", "Treat v as a pure quaternion with w = 0 and compute q v q⁻¹.", "For a unit q, q⁻¹ is the conjugate (−x, −y, −z, w)."],
      cases: [
        example([Z90, { x: 1, y: 0, z: 0 }], { x: 0, y: 1, z: 0 }, "Z quarter turn"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 1, y: -2, z: 3 }], { x: 1, y: -2, z: 3 }, "non-unit identity"),
        example([Y90, { x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 26, id: "compose-se3", title: "Compose SE(3)",
      goal: "Rotate the child translation, add it to the parent translation, and multiply rotations.",
      concept: "SE(3) composition has the same rotate-then-translate structure as SE(2).",
      functionName: "composeSE3", signature: "composeSE3(aFromB, bFromC) → aFromC",
      starterSource: starter("composeSE3", "aFromB, bFromC"),
      referenceSource: lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var shifted = rotateByQuaternion(aFromB.rotation, bFromC.translation);",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return {",
        "    translation: { x: aFromB.translation.x + shifted.x, y: aFromB.translation.y + shifted.y, z: aFromB.translation.z + shifted.z },",
        "    rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length },",
        "  };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "se3",
      dependencies: ["rotate-by-quaternion", "quaternion-multiply"],
      scene: { kind: "se3", view: "compose", handles: [
        { id: "yawA", type: "slider", label: "a→b: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b→c: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromB" }, { fixture: "bFromC" }] },
      diagnoses: [diagnosis("translation-unrotated", "Child translation was not rotated by the parent rotation before adding.", lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { translation: { x: aFromB.translation.x + bFromC.translation.x, y: aFromB.translation.y + bFromC.translation.y, z: aFromB.translation.z + bFromC.translation.z }, rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length } };",
        "}"
      ))],
      hints: ["SE(3) composition has the same rotate-then-translate structure as SE(2).", "Rotate bFromC.translation by aFromB.rotation before adding.", "Multiply quaternions parent × child and normalize the result."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }, { translation: { x: 0, y: 2, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 2, z: 0 }, rotation: IDENTITY_Q }, "translation chain"),
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 1, z: 0 }, rotation: Z90 }, "rotated child translation"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 0, y: 0, z: 0 }, rotation: Y90 }, "pitch pushes X down"),
      ],
    }),
    puzzle({
      number: 27, id: "stamped-lookup", title: "Answer a Stamped Lookup",
      goal: "Resolve a source-to-target transform at a requested or latest common time.",
      concept: "A lookup is a pipeline: choose the time, sample every edge, build the tree, traverse.",
      functionName: "lookupStampedTransform", signature: "lookupStampedTransform(edges, target, source, requestedTime) → result",
      starterSource: starter("lookupStampedTransform", "edges, target, source, requestedTime"),
      referenceSource: lines(
        "function lookupStampedTransform(edges, target, source, requestedTime) {",
        "  var ranges = [];",
        "  for (var i = 0; i < edges.length; i += 1) {",
        "    if (!edges[i].isStatic) ranges.push({ start: edges[i].samples[0].time, end: edges[i].samples[edges[i].samples.length - 1].time });",
        "  }",
        "  var availability = ranges.length ? latestCommonTime(ranges, requestedTime) : { ok: true, time: requestedTime === null ? 0 : requestedTime };",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  for (var j = 0; j < edges.length; j += 1) {",
        "    tree = storeEdge(tree, { parent: edges[j].parent, child: edges[j].child, transform: sampleEdge(edges[j], availability.time) });",
        "  }",
        "  return { ok: true, time: availability.time, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["sample-edge", "latest-common-time", "store-edge", "lookup-transform"],
      scene: { kind: "robot-chain-time", handles: [
        { id: "time", type: "timeline", label: "requested time", value: 4, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "source" }, { fixture: "requestedOrNull" }] },
      hints: ["A lookup is a pipeline: choose time, sample edges, build the tree, traverse.", "Use the intersection of all dynamic histories; static edges are valid at every time.", "sampleEdge every edge at the resolved time, storeEdge each one, then lookupTransform on the sampled tree."],
      cases: [
        example([STAMPED_EDGES_CASE, "map", "laser", null], { ok: true, time: 6, transform: { x: 13, y: 0, yaw: 0 } }, "latest stamped lookup"),
        example([[{ parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, transform: { x: 5, y: 0, yaw: 0 } }] }], "map", "odom", 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
        example([STAMPED_EDGES_CASE, "map", "base_link", 3], { ok: true, time: 3, transform: { x: 6, y: 0, yaw: 0 } }, "interpolated request"),
        example([STAMPED_EDGES_CASE, "laser", "map", null], { ok: true, time: 6, transform: { x: -13, y: 0, yaw: 0 } }, "inverse direction"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to:

```js
  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7));
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `11/11 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add time, SE(3), and capstone puzzle stages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 5: Persistent worker with live and check modes

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-worker.js` (full replacement)
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing worker tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- worker
  function workerApi() { return requireApi(workerModule, "puzzle-worker.js"); }
  const LIVE_PROGRAM = {
    learner: { functionName: "double", source: "function double(n) { return n * 2; }", dependencySources: [] },
    reference: { functionName: "double", source: "function double(n) { return n + n; }", dependencySources: [] },
    variants: [{ id: "half", source: "function double(n) { return n / 2; }" }],
  };

  test("worker live mode returns learner, reference, and variant values", () => {
    const response = workerApi().handlePuzzleMessage({ requestId: "r1", mode: "live", program: LIVE_PROGRAM, cases: [{ args: [3] }] });
    assert(response.ok && response.requestId === "r1", "live response should succeed");
    same(response.results[0].learner.value, 6);
    same(response.results[0].reference.value, 6);
    same(response.results[0].variants, { half: 1.5 });
  });

  test("worker check mode returns one result per case and reports runtime errors inside results", () => {
    const program = { ...LIVE_PROGRAM, learner: { functionName: "double", source: "function double(n) { if (n > 5) throw new Error('too big'); return n * 2; }", dependencySources: [] } };
    const response = workerApi().handlePuzzleMessage({ requestId: "r2", mode: "check", program, cases: [{ args: [1] }, { args: [9] }] });
    assert(response.ok, "check response should succeed at the top level");
    same(response.results.length, 2);
    same(response.results[0].learner.value, 2);
    assert(!response.results[1].learner.ok && response.results[1].learner.error.kind === "runtime", "second case should carry the runtime error");
  });

  test("worker reports compile failures at the top level", () => {
    const program = { ...LIVE_PROGRAM, learner: { functionName: "double", source: "function double(n) { return n * ; }", dependencySources: [] } };
    const response = workerApi().handlePuzzleMessage({ requestId: "r3", mode: "live", program, cases: [{ args: [1] }] });
    assert(!response.ok && response.error.kind === "syntax" && response.requestId === "r3", "syntax error expected");
  });
```

- [ ] **Step 2: Run the tests and confirm the worker tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `11/14 puzzle tests passed` with three `puzzle-worker.js is not implemented` failures (the old worker has no CommonJS export).

- [ ] **Step 3: Replace the worker**

Replace the entire content of `p5sim/tf2_walkthrough/puzzle-worker.js` with:

```js
(function runPuzzleWorker(scope) {
  "use strict";

  const insideWorker = typeof importScripts === "function" && typeof scope.postMessage === "function";
  let runtime = null;
  if (insideWorker) {
    importScripts("puzzle-runtime.js");
    runtime = scope.PuzzleRuntime;
  } else if (typeof module !== "undefined" && module.exports) {
    runtime = require("./puzzle-runtime.js");
  } else {
    runtime = scope.PuzzleRuntime;
  }

  let cache = { key: null, compiled: null };

  function handlePuzzleMessage(message) {
    const program = message.program;
    if (!program || !program.learner) {
      return { requestId: message.requestId, ok: false, error: { kind: "worker", message: "No program supplied." } };
    }
    const key = JSON.stringify(program);
    if (cache.key !== key) cache = { key, compiled: runtime.compileProgram(program) };
    const compiled = cache.compiled;
    if (!compiled.learner.ok) {
      return { requestId: message.requestId, ok: false, error: compiled.learner.error };
    }
    const cases = Array.isArray(message.cases) ? message.cases : [];
    const results = cases.map((testCase) => runtime.evaluateCompiled(compiled, testCase.args));
    return { requestId: message.requestId, ok: true, mode: message.mode, results };
  }

  if (insideWorker) {
    scope.addEventListener("message", (event) => {
      scope.postMessage(handlePuzzleMessage(event.data || {}));
    });
  }

  const api = { handlePuzzleMessage };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else if (!insideWorker) scope.PuzzleWorker = api;
})(typeof self !== "undefined" ? self : globalThis);
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `14/14 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-worker.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: make puzzle worker persistent with live and check modes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 6: Engine rework: comparators, diagnosis, programs, progress v2, live session

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-engine.js` (full replacement)
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing engine tests**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- engine
  function engineApi() { return requireApi(engine, "puzzle-engine.js"); }
  function fakeWorkerFactory() {
    const created = [];
    const factory = () => {
      const listeners = { message: [], error: [] };
      const worker = {
        posted: [],
        terminated: false,
        addEventListener(type, fn) { listeners[type].push(fn); },
        postMessage(payload) { worker.posted.push(payload); },
        terminate() { worker.terminated = true; },
        reply(data) { listeners.message.forEach((fn) => fn({ data })); },
      };
      created.push(worker);
      return worker;
    };
    factory.created = created;
    return factory;
  }
  function fakeStorage(initial) {
    const store = { ...(initial || {}) };
    return { getItem(key) { return key in store ? store[key] : null; }, setItem(key, value) { store[key] = value; }, removeItem(key) { delete store[key]; } };
  }

  test("engine scalar comparator rejects unwrapped angles that the angle comparator accepts", () => {
    const api = engineApi();
    assert(api.compareOutput("angle", 4, 4 - 2 * Math.PI, 1e-6).pass, "angle comparator accepts modulo 2π");
    assert(!api.compareOutput("scalar", 4, 4 - 2 * Math.PI, 1e-6).pass, "scalar comparator rejects modulo 2π");
    assert(api.compareOutput("quaternion", { x: 0, y: 0, z: -1, w: 0 }, { x: 0, y: 0, z: 1, w: 0 }, 1e-6).pass, "q and -q are the same rotation");
    assert(api.compareOutput("se2", { x: 1, y: 2, yaw: Math.PI }, { x: 1, y: 2, yaw: -Math.PI }, 1e-6).pass, "se2 yaw wraps");
    assert(!api.compareOutput("path", [{ from: "a", to: "b", child: "a", inverse: false }], [{ from: "a", to: "b", child: "a", inverse: true }], 1e-6).pass, "path flags matter");
  });

  test("engine diagnose names the matching variant only", () => {
    const api = engineApi();
    const puzzle = puzzlesApi().getPuzzle("rotate-vector");
    const variants = { "negated-yaw": { x: 0, y: -1 }, "swapped-rows": { x: 1, y: 0 } };
    same(api.diagnose(puzzle, { x: 0, y: -1 }, variants).id, "negated-yaw");
    same(api.diagnose(puzzle, { x: 0.3, y: 0.3 }, variants), null);
  });

  test("engine evaluateLive produces match, diagnosed mismatch, and error states", () => {
    const api = engineApi();
    const puzzle = puzzlesApi().getPuzzle("rotate-vector");
    const match = api.evaluateLive(puzzle, { ok: true, results: [{ learner: { ok: true, value: { x: 0, y: 1 }, inputMutated: false }, reference: { ok: true, value: { x: 0, y: 1 } }, variants: {} }] });
    same(match.kind, "live-match");
    const mismatch = api.evaluateLive(puzzle, { ok: true, results: [{ learner: { ok: true, value: { x: 0, y: -1 }, inputMutated: false }, reference: { ok: true, value: { x: 0, y: 1 } }, variants: { "negated-yaw": { x: 0, y: -1 } } }] });
    same(mismatch.kind, "live-mismatch");
    same(mismatch.diagnosis.id, "negated-yaw");
    same(mismatch.expected, { x: 0, y: 1 });
    const failed = api.evaluateLive(puzzle, { ok: true, results: [{ learner: { ok: false, error: { kind: "runtime", message: "boom" } }, reference: { ok: true, value: { x: 0, y: 1 } }, variants: {} }] });
    same(failed.kind, "runtime");
    same(failed.expected, { x: 0, y: 1 });
    const compileError = api.evaluateLive(puzzle, { ok: false, error: { kind: "syntax", message: "Unexpected token" } });
    same(compileError.kind, "syntax");
  });

  test("engine evaluateCheck reports the first failing case with its label", () => {
    const api = engineApi();
    const puzzle = puzzlesApi().getPuzzle("heading-vector");
    const goodResult = (value) => ({ learner: { ok: true, value, inputMutated: false }, reference: null, variants: {} });
    const pass = api.evaluateCheck(puzzle, { ok: true, results: [goodResult({ x: 0, y: 1 }), goodResult({ x: 1, y: 0 }), goodResult({ x: -1, y: 0 }), goodResult({ x: Math.SQRT1_2, y: -Math.SQRT1_2 })] });
    assert(pass.pass, "all cases should pass");
    const fail = api.evaluateCheck(puzzle, { ok: true, results: [goodResult({ x: 0, y: 1 }), goodResult({ x: 0, y: 1 }), goodResult({ x: -1, y: 0 }), goodResult({ x: 1, y: 0 })] });
    assert(!fail.pass && fail.caseIndex === 1 && fail.message.includes("zero yaw"), "second case should fail with its label");
    const mutated = api.evaluateCheck(puzzle, { ok: true, results: [{ learner: { ok: true, value: { x: 0, y: 1 }, inputMutated: true }, reference: null, variants: {} }] });
    same(mutated.kind, "mutation");
  });

  test("engine buildProgram wires learner and reference dependency chains", () => {
    const api = engineApi();
    const list = puzzleList();
    const puzzle = puzzlesApi().getPuzzle("transform-pose");
    const progress = api.createProgress();
    progress.sources["rotate-vector"] = "function rotateVector(v, yaw) { return v; }";
    progress.sources["wrap-angle"] = "function wrapAngle(a) { return a; }";
    progress.sources["transform-point"] = "function transformPoint(t, p) { return p; }";
    const program = api.buildProgram(list, progress, puzzle, "function transformPose(t, p) { return p; }");
    same(program.learner.dependencySources, [progress.sources["wrap-angle"], progress.sources["rotate-vector"], progress.sources["transform-point"]]);
    same(program.reference.dependencySources, ["wrap-angle", "rotate-vector", "transform-point"].map((id) => puzzlesApi().getPuzzle(id).referenceSource));
    same(program.variants.map((entry) => entry.id), ["yaw-not-composed"]);
    delete progress.sources["transform-point"];
    let thrown = null;
    try { api.buildProgram(list, progress, puzzle, ""); } catch (error) { thrown = error; }
    assert(thrown && thrown.kind === "missing-dependency" && thrown.dependencyId === "transform-point", "missing dependency should be reported");
  });

  test("engine progress uses the v2 key, rejects v1 records, and unlocks tracks", () => {
    const api = engineApi();
    same(api.STORAGE_KEY, "tf2-puzzle-lab:v2");
    const fresh = api.loadProgress(fakeStorage({ "tf2-puzzle-lab:v1": JSON.stringify({ schemaVersion: 1 }) }));
    same(fresh.currentPuzzleId, "heading-vector");
    const stale = api.loadProgress(fakeStorage({ "tf2-puzzle-lab:v2": JSON.stringify({ schemaVersion: 1, currentPuzzleId: "x", highestUnlocked: 3, sources: {}, solved: {}, hints: {}, display: {} }) }));
    same(stale.highestUnlocked, 0);
    const list = puzzleList();
    const tracks = puzzlesApi().TF2_PUZZLE_TRACKS;
    let progress = api.createProgress();
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked"]);
    progress = api.completePuzzle(progress, list[0], "function headingVector(yaw) { return null; }", "2026-09-08T00:00:00Z", list);
    same(progress.highestUnlocked, 1);
    same(progress.currentPuzzleId, "heading-of");
    progress = api.completePuzzle(progress, list[26], "source", "2026-09-08T00:00:00Z", list);
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available"]);
    const reset = api.resetPuzzle(progress, list, "heading-vector");
    assert(!reset.progress.solved["heading-vector"] && reset.invalidated.includes("heading-vector"), "reset clears the puzzle");
  });

  test("engine validateCatalog accepts the real catalog and rejects a bad scene kind", () => {
    const api = engineApi();
    const list = puzzleList();
    const kinds = ["dial", "vector", "vector-dial", "two-dials", "frame-point", "frame-vector", "frame-pose", "frame-chain", "frame-inverse", "two-frames", "tree", "robot-chain", "correction", "pose-lerp", "timeline", "timeline-ranges", "timeline-frame", "se3", "robot-chain-time"];
    assert(api.validateCatalog(list, kinds).valid, "real catalog should validate: " + api.validateCatalog(list, kinds).message);
    const broken = list.map((puzzle, index) => (index === 0 ? { ...puzzle, scene: { ...puzzle.scene, kind: "nope" } } : puzzle));
    assert(!api.validateCatalog(broken, kinds).valid, "unknown scene kind should be rejected");
  });

  test("engine live session resolves, supersedes queued requests, drops stale replies, and restarts on timeout", async () => {
    const api = engineApi();
    const factory = fakeWorkerFactory();
    const session = api.createLiveSession({ workerUrl: "fake.js", liveTimeoutMs: 40, checkTimeoutMs: 40, createWorker: factory });
    const first = session.evaluate(LIVE_PROGRAM, [1]);
    const worker = factory.created[0];
    same(worker.posted.length, 1);
    worker.reply({ requestId: "wrong-id", ok: true, results: [] });
    worker.reply({ requestId: worker.posted[0].requestId, ok: true, results: [{ learner: { ok: true, value: 2 } }] });
    const firstResponse = await first;
    same(firstResponse.results[0].learner.value, 2);

    const blocked = session.evaluate(LIVE_PROGRAM, [2]);
    const queuedA = session.evaluate(LIVE_PROGRAM, [3]);
    const queuedB = session.evaluate(LIVE_PROGRAM, [4]);
    let supersededKind = null;
    await queuedA.catch((error) => { supersededKind = error.kind; });
    same(supersededKind, "superseded");
    worker.reply({ requestId: worker.posted[1].requestId, ok: true, results: [{ learner: { ok: true, value: 4 } }] });
    await blocked;
    same(worker.posted.length, 3);
    same(worker.posted[2].cases[0].args, [4]);
    worker.reply({ requestId: worker.posted[2].requestId, ok: true, results: [{ learner: { ok: true, value: 8 } }] });
    same((await queuedB).results[0].learner.value, 8);

    const hanging = session.evaluate(LIVE_PROGRAM, [5]);
    let timeoutKind = null;
    await hanging.catch((error) => { timeoutKind = error.kind; });
    same(timeoutKind, "timeout");
    assert(worker.terminated, "hung worker should be terminated");
    session.evaluate(LIVE_PROGRAM, [6]).catch(() => {});
    same(factory.created.length, 2);
    session.dispose();
  });
```

- [ ] **Step 2: Run the tests and confirm the engine tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `14/22 puzzle tests passed`; engine failures mention missing functions such as `diagnose`, `buildProgram`, or the v1 storage key.

- [ ] **Step 3: Replace the engine**

Replace the entire content of `p5sim/tf2_walkthrough/puzzle-engine.js` with:

```js
(function exposePuzzleEngine(root) {
  "use strict";

  const STORAGE_KEY = "tf2-puzzle-lab:v2";
  const SCHEMA_VERSION = 2;
  const FIRST_PUZZLE_ID = "heading-vector";
  const COMPARATORS = Object.freeze(["scalar", "angle", "vector2", "vector3", "quaternion", "se2", "se3", "deep", "path", "error"]);
  const MUTATION_MESSAGE = "Your function changed one of its inputs. Return a new value instead.";
  const LIVE_MATCH_MESSAGE = "Matches the reference for this input. Check to verify every case.";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function angleDelta(actual, expected) {
    return Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected));
  }

  function findNonFinite(value, path) {
    const currentPath = path || "result";
    if (typeof value === "number") return Number.isFinite(value) ? null : currentPath;
    if (!value || typeof value !== "object") return null;
    const entries = Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value);
    for (const [key, item] of entries) {
      const invalid = findNonFinite(item, currentPath + "." + key);
      if (invalid) return invalid;
    }
    return null;
  }

  function compareQuaternion(actual, expected, tolerance, path) {
    if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") {
      return { pass: false, message: path + " must be a quaternion { x, y, z, w }", delta: null };
    }
    const keys = ["x", "y", "z", "w"];
    const direct = Math.max.apply(null, keys.map((key) => Math.abs(actual[key] - expected[key])));
    const negated = Math.max.apply(null, keys.map((key) => Math.abs(actual[key] + expected[key])));
    const error = Math.min(direct, negated);
    const pass = Number.isFinite(error) && error <= tolerance;
    return { pass, message: pass ? "Quaternion matches." : path + " rotates differently.", delta: { path, error } };
  }

  function compareValue(actual, expected, tolerance, path, angleFields) {
    if (typeof expected === "number") {
      if (typeof actual !== "number" || !Number.isFinite(actual)) {
        return { pass: false, message: path + " must be a finite number", delta: { path, actual, expected } };
      }
      const lastKey = path.split(".").pop();
      const error = angleFields.has(lastKey) ? Math.abs(angleDelta(actual, expected)) : Math.abs(actual - expected);
      return {
        pass: error <= tolerance,
        message: error <= tolerance ? "Values match." : path + " differs by " + error.toPrecision(4),
        delta: { path, error, actual, expected },
      };
    }
    if (expected === null || typeof expected !== "object") {
      const pass = Object.is(actual, expected);
      return { pass, message: pass ? "Values match." : path + " should be " + String(expected), delta: pass ? null : { path, actual, expected } };
    }
    if (!actual || typeof actual !== "object" || Array.isArray(actual) !== Array.isArray(expected)) {
      return { pass: false, message: path + " has the wrong shape", delta: { path, actual, expected } };
    }
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    if (expectedKeys.length !== actualKeys.length || expectedKeys.some((key) => !Object.hasOwn(actual, key))) {
      return { pass: false, message: path + " has the wrong properties", delta: { path, actual, expected } };
    }
    let largest = { path, error: 0 };
    for (const key of expectedKeys) {
      const result = compareValue(actual[key], expected[key], tolerance, path + "." + key, angleFields);
      if (!result.pass) return result;
      if (result.delta && result.delta.error > largest.error) largest = result.delta;
    }
    return { pass: true, message: "Values match.", delta: largest };
  }

  function compareOutput(comparator, actual, expected, tolerance) {
    const epsilon = Number.isFinite(tolerance) ? tolerance : 1e-6;
    const nonFinitePath = findNonFinite(actual);
    if (nonFinitePath) return { pass: false, message: nonFinitePath + " is not finite", delta: { path: nonFinitePath } };
    if (comparator === "angle") {
      if (typeof actual !== "number" || typeof expected !== "number") {
        return { pass: false, message: "Return one yaw angle in radians.", delta: { actual, expected } };
      }
      const error = Math.abs(angleDelta(actual, expected));
      return { pass: error <= epsilon, message: error <= epsilon ? "Angles match." : "Yaw differs by " + error.toPrecision(4) + " rad.", delta: { path: "result", error, actual, expected } };
    }
    if (comparator === "quaternion") return compareQuaternion(actual, expected, epsilon, "result");
    if (comparator === "se3" && actual && expected) {
      const translation = compareValue(actual.translation, expected.translation, epsilon, "result.translation", new Set());
      if (!translation.pass) return translation;
      return compareQuaternion(actual.rotation, expected.rotation, epsilon, "result.rotation");
    }
    const angleFields = new Set(comparator === "se2" || comparator === "deep" ? ["yaw"] : []);
    return compareValue(actual, expected, epsilon, "result", angleFields);
  }

  function diagnose(puzzle, actual, variants) {
    if (!variants) return null;
    for (const entry of puzzle.diagnoses) {
      const value = variants[entry.id];
      if (value === null || value === undefined) continue;
      if (compareOutput(puzzle.comparator, actual, value, puzzle.tolerance).pass) return { id: entry.id, message: entry.message };
    }
    return null;
  }

  function liveResult(kind, message, extra) {
    return { kind, message, expected: null, actual: null, comparison: null, diagnosis: null, error: null, ...(extra || {}) };
  }

  function evaluateLive(puzzle, response) {
    if (!response || !response.ok) {
      const error = (response && response.error) || { kind: "worker", message: "The code runner did not return a result." };
      return liveResult(error.kind || "worker", error.message, { error });
    }
    const result = response.results && response.results[0];
    if (!result) return liveResult("worker", "The code runner skipped the input.", { error: { kind: "worker", message: "The code runner skipped the input." } });
    if (!result.reference || !result.reference.ok) {
      const message = "The reference solution could not run: " + (result.reference && result.reference.error ? result.reference.error.message : "unknown error");
      return liveResult("worker", message, { error: { kind: "worker", message } });
    }
    const expected = result.reference.value;
    if (!result.learner.ok) return liveResult(result.learner.error.kind, result.learner.error.message, { expected, error: result.learner.error });
    if (result.learner.inputMutated) return liveResult("mutation", MUTATION_MESSAGE, { expected, actual: result.learner.value, error: { kind: "mutation", message: MUTATION_MESSAGE } });
    const comparison = compareOutput(puzzle.comparator, result.learner.value, expected, puzzle.tolerance);
    if (comparison.pass) return liveResult("live-match", LIVE_MATCH_MESSAGE, { expected, actual: result.learner.value, comparison });
    const diagnosis = diagnose(puzzle, result.learner.value, result.variants);
    return liveResult("live-mismatch", diagnosis ? diagnosis.message : comparison.message, { expected, actual: result.learner.value, comparison, diagnosis });
  }

  function evaluateCheck(puzzle, response) {
    if (!response || !response.ok) {
      const error = (response && response.error) || { kind: "worker", message: "The code runner did not return a result." };
      return { pass: false, kind: error.kind || "worker", message: error.message };
    }
    const cases = puzzle.publicCases.concat(puzzle.checkCases);
    for (let index = 0; index < cases.length; index += 1) {
      const result = response.results[index];
      const testCase = cases[index];
      if (!result) return { pass: false, kind: "worker", message: "The code runner skipped a case.", caseIndex: index, testCase };
      if (!result.learner.ok) {
        return { pass: false, kind: result.learner.error.kind, message: result.learner.error.message + " Case: " + testCase.label + ".", caseIndex: index, testCase };
      }
      if (result.learner.inputMutated) return { pass: false, kind: "mutation", message: MUTATION_MESSAGE + " Case: " + testCase.label + ".", caseIndex: index, testCase };
      const comparison = compareOutput(puzzle.comparator, result.learner.value, testCase.expected, puzzle.tolerance);
      if (!comparison.pass) {
        const diagnosis = diagnose(puzzle, result.learner.value, result.variants);
        return {
          pass: false, kind: "mismatch",
          message: (diagnosis ? diagnosis.message : comparison.message) + " Case: " + testCase.label + ".",
          caseIndex: index, testCase, actual: result.learner.value, comparison, diagnosis,
        };
      }
    }
    return { pass: true, kind: "success", message: "All behaviors match. Component unlocked.", actual: response.results[0] ? response.results[0].learner.value : null, testCase: cases[0] || null };
  }

  function createProgress() {
    return { schemaVersion: SCHEMA_VERSION, currentPuzzleId: FIRST_PUZZLE_ID, highestUnlocked: 0, sources: {}, drafts: {}, solved: {}, hints: {}, display: {} };
  }

  function validRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function loadProgress(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return createProgress();
      const progress = JSON.parse(raw);
      if (
        progress.schemaVersion !== SCHEMA_VERSION ||
        typeof progress.currentPuzzleId !== "string" ||
        !Number.isInteger(progress.highestUnlocked) ||
        !validRecord(progress.sources) || !validRecord(progress.solved) || !validRecord(progress.hints) || !validRecord(progress.display)
      ) {
        return createProgress();
      }
      if (!validRecord(progress.drafts)) progress.drafts = {};
      return progress;
    } catch (error) {
      return createProgress();
    }
  }

  function saveProgress(storage, progress) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (error) {
      return false;
    }
  }

  function completePuzzle(progress, puzzle, source, now, puzzles) {
    const next = clone(progress);
    const catalog = Array.isArray(puzzles) ? puzzles : (root.TF2_PUZZLES || []);
    const finalIndex = Math.max(0, catalog.length - 1);
    next.sources[puzzle.id] = source;
    delete next.drafts[puzzle.id];
    next.solved[puzzle.id] = { completedAt: now || new Date().toISOString(), schemaVersion: SCHEMA_VERSION };
    next.highestUnlocked = Math.max(next.highestUnlocked, Math.min(puzzle.number, finalIndex));
    next.currentPuzzleId = puzzle.number <= finalIndex ? catalog[puzzle.number].id : puzzle.id;
    return next;
  }

  function dependentPuzzleIds(puzzles, puzzleId) {
    const affected = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const puzzle of puzzles) {
        if (affected.has(puzzle.id) || puzzle.id === puzzleId) continue;
        if (puzzle.dependencies.some((dependency) => dependency === puzzleId || affected.has(dependency))) {
          affected.add(puzzle.id);
          changed = true;
        }
      }
    }
    return puzzles.filter((puzzle) => affected.has(puzzle.id)).map((puzzle) => puzzle.id);
  }

  function resetPuzzle(progress, puzzles, puzzleId) {
    const next = clone(progress);
    const invalidated = [puzzleId].concat(dependentPuzzleIds(puzzles, puzzleId));
    invalidated.forEach((id) => { delete next.sources[id]; delete next.drafts[id]; delete next.solved[id]; });
    let firstUnsolved = puzzles.findIndex((puzzle) => !next.solved[puzzle.id]);
    if (firstUnsolved < 0) firstUnsolved = puzzles.length - 1;
    next.highestUnlocked = Math.min(next.highestUnlocked, firstUnsolved);
    next.currentPuzzleId = puzzles[firstUnsolved].id;
    return { progress: next, invalidated };
  }

  function collectDependencyIds(puzzles, puzzle) {
    const byId = new Map(puzzles.map((entry) => [entry.id, entry]));
    const collected = new Set();
    function visit(id) {
      if (collected.has(id)) return;
      const dependency = byId.get(id);
      if (!dependency) throw new Error("Unknown puzzle dependency: " + id);
      dependency.dependencies.forEach(visit);
      collected.add(id);
    }
    puzzle.dependencies.forEach(visit);
    return puzzles.filter((entry) => collected.has(entry.id)).map((entry) => entry.id);
  }

  function buildProgram(puzzles, progress, puzzle, learnerSource) {
    const byId = new Map(puzzles.map((entry) => [entry.id, entry]));
    const ids = collectDependencyIds(puzzles, puzzle);
    const learnerDependencies = ids.map((id) => {
      const source = progress.sources[id];
      if (!source) {
        const dependency = byId.get(id);
        const error = new Error("Revisit " + dependency.title + " before using " + dependency.functionName + "().");
        error.kind = "missing-dependency";
        error.dependencyId = id;
        throw error;
      }
      return source;
    });
    return {
      learner: { functionName: puzzle.functionName, source: learnerSource, dependencySources: learnerDependencies },
      reference: { functionName: puzzle.functionName, source: puzzle.referenceSource, dependencySources: ids.map((id) => byId.get(id).referenceSource) },
      variants: puzzle.diagnoses.map((entry) => ({ id: entry.id, source: entry.source })),
    };
  }

  function trackStates(tracks, progress) {
    return tracks.map((track) => ({
      id: track.id,
      state: track.unlockAfter && !progress.solved[track.unlockAfter] ? "locked" : "available",
    }));
  }

  function createLiveSession(options) {
    const settings = { workerUrl: "puzzle-worker.js", liveTimeoutMs: 250, checkTimeoutMs: 750, createWorker: (url) => new Worker(url), ...(options || {}) };
    let worker = null;
    let inflight = null;
    let queuedLive = null;
    const queuedChecks = [];
    let sequence = 0;

    function finishInflight(error, data) {
      const current = inflight;
      inflight = null;
      clearTimeout(current.timer);
      if (error) current.reject(error); else current.resolve(data);
      pump();
    }

    function ensureWorker() {
      if (worker) return worker;
      worker = settings.createWorker(settings.workerUrl);
      worker.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || !inflight || data.requestId !== inflight.requestId) return;
        finishInflight(null, data);
      });
      worker.addEventListener("error", (event) => {
        if (inflight) finishInflight({ kind: "worker", message: (event && event.message) || "The code worker stopped unexpectedly." });
      });
      return worker;
    }

    function restartWorker() {
      if (worker) worker.terminate();
      worker = null;
    }

    function pump() {
      if (inflight) return;
      const next = queuedChecks.length ? queuedChecks.shift() : queuedLive;
      if (!next) return;
      if (next === queuedLive) queuedLive = null;
      const requestId = "puzzle-" + (++sequence);
      const timer = setTimeout(() => {
        if (!inflight || inflight.requestId !== requestId) return;
        const current = inflight;
        inflight = null;
        restartWorker();
        current.reject({ kind: "timeout", message: "Your function did not finish in " + next.timeoutMs + " ms. The runner was restarted." });
        pump();
      }, next.timeoutMs);
      inflight = { requestId, resolve: next.resolve, reject: next.reject, timer };
      try {
        ensureWorker().postMessage({ ...next.payload, requestId });
      } catch (error) {
        finishInflight({ kind: "worker", message: String((error && error.message) || error) });
      }
    }

    return {
      evaluate(program, args) {
        return new Promise((resolve, reject) => {
          if (queuedLive) queuedLive.reject({ kind: "superseded", message: "Replaced by a newer request." });
          queuedLive = { payload: { mode: "live", program, cases: [{ args }] }, timeoutMs: settings.liveTimeoutMs, resolve, reject };
          pump();
        });
      },
      check(program, cases) {
        return new Promise((resolve, reject) => {
          queuedChecks.push({ payload: { mode: "check", program, cases: cases.map((entry) => ({ args: entry.args })) }, timeoutMs: settings.checkTimeoutMs, resolve, reject });
          pump();
        });
      },
      dispose() {
        if (queuedLive) { queuedLive.reject({ kind: "disposed", message: "Session closed." }); queuedLive = null; }
        while (queuedChecks.length) queuedChecks.shift().reject({ kind: "disposed", message: "Session closed." });
        if (inflight) { clearTimeout(inflight.timer); inflight.reject({ kind: "disposed", message: "Session closed." }); inflight = null; }
        restartWorker();
      },
    };
  }

  function validateCatalog(puzzles, sceneKinds) {
    const seen = new Set();
    const required = ["id", "number", "stage", "track", "title", "goal", "concept", "functionName", "signature", "starterSource", "referenceSource", "comparator", "tolerance", "scene", "diagnoses", "hints", "publicCases", "checkCases", "walkthroughChapter"];
    for (let index = 0; index < puzzles.length; index += 1) {
      const puzzle = puzzles[index];
      const missing = required.find((key) => puzzle[key] === undefined || puzzle[key] === null);
      if (missing) return { valid: false, message: puzzle.id + " is missing " + missing };
      if (puzzle.number !== index + 1) return { valid: false, message: puzzle.id + " has the wrong number." };
      if (seen.has(puzzle.id)) return { valid: false, message: puzzle.id + " is duplicated." };
      if (puzzle.hints.length !== 3) return { valid: false, message: puzzle.id + " needs exactly three hints." };
      if (puzzle.publicCases.length !== 1 || puzzle.checkCases.length < 2) return { valid: false, message: puzzle.id + " needs one public case and at least two check cases." };
      if (!COMPARATORS.includes(puzzle.comparator)) return { valid: false, message: puzzle.id + " uses unknown comparator " + puzzle.comparator };
      if (!puzzle.scene.kind || !Array.isArray(puzzle.scene.handles)) return { valid: false, message: puzzle.id + " has an invalid scene." };
      if (Array.isArray(sceneKinds) && !sceneKinds.includes(puzzle.scene.kind)) return { valid: false, message: puzzle.id + " uses unknown scene kind " + puzzle.scene.kind };
      const invalidDependency = puzzle.dependencies.find((id) => !seen.has(id));
      if (invalidDependency) return { valid: false, message: puzzle.id + " has an unknown or forward dependency: " + invalidDependency };
      seen.add(puzzle.id);
    }
    return { valid: true, message: puzzles.length + " puzzles ready." };
  }

  const api = Object.freeze({
    STORAGE_KEY, SCHEMA_VERSION, COMPARATORS, MUTATION_MESSAGE,
    compareOutput, diagnose, evaluateLive, evaluateCheck,
    createProgress, loadProgress, saveProgress, completePuzzle, dependentPuzzleIds, resetPuzzle,
    collectDependencyIds, buildProgram, trackStates, createLiveSession, validateCatalog,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `22/22 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-engine.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add live session, diagnosis, and v2 progress to puzzle engine

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 7: Scene module core and 2D scene kinds

**Files:**
- Create: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

Scene kinds implemented here: `dial`, `vector`, `vector-dial`, `two-dials`, `frame-point`, `frame-vector`, `frame-pose`, `frame-chain`, `frame-inverse`, `two-frames`, `pose-lerp`, `correction`. Task 8 adds `tree`, `robot-chain`, `timeline`, `timeline-ranges`, `timeline-frame`, `se3`, `robot-chain-time`.

- [ ] **Step 1: Add failing scene tests for handle geometry and the 2D kinds**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- scenes
  function scenesApi() { return requireApi(scenes, "PuzzleScenes"); }
  function allFinite(value, path) {
    if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("non-finite number at " + path); return; }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach((key) => allFinite(value[key], path + "." + key));
  }
  function referenceOutput(puzzle, args) {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const compiled = api.compileProgram(referenceProgram(puzzle));
    const result = api.evaluateCompiled(compiled, args);
    assert(result.learner.ok, puzzle.id + " reference rejected scene args: " + JSON.stringify(args) + " " + (result.learner.ok ? "" : result.learner.error.message));
    return result.learner.value;
  }
  function checkSceneKinds(kinds) {
    const api = scenesApi();
    puzzleList().filter((puzzle) => kinds.includes(puzzle.scene.kind)).forEach((puzzle) => {
      const values = api.initialValues(puzzle);
      const args = api.toArgs(puzzle, values);
      const expected = referenceOutput(puzzle, args);
      const contexts = [
        { puzzle, values, args, expected, actual: expected, comparison: { pass: true }, diagnosis: null, error: null },
        { puzzle, values, args, expected, actual: expected, comparison: { pass: false, message: "off" }, diagnosis: { id: "x", message: "why" }, error: null },
        { puzzle, values, args, expected: null, actual: null, comparison: null, diagnosis: null, error: { kind: "runtime", message: "boom" } },
      ];
      contexts.forEach((context, index) => {
        const layers = api.layers(context);
        assert(Array.isArray(layers) && layers.length > 0, puzzle.id + " context " + index + " produced no layers");
        layers.forEach((layer) => { assert(typeof layer.kind === "string", puzzle.id + " layer without kind"); allFinite(layer, puzzle.id + "." + layer.kind); });
      });
      const grips = api.grips(puzzle, values);
      puzzle.scene.handles.filter((handle) => handle.type !== "selector").forEach((handle) => {
        assert(grips.some((grip) => grip.handleId === handle.id), puzzle.id + " has no grip for " + handle.id);
      });
      grips.forEach((grip) => allFinite(grip, puzzle.id + ".grip"));
    });
  }

  test("scenes: 2D kinds build arguments the reference accepts and finite layers", () => {
    checkSceneKinds(["dial", "vector", "vector-dial", "two-dials", "frame-point", "frame-vector", "frame-pose", "frame-chain", "frame-inverse", "two-frames", "pose-lerp", "correction"]);
  });

  test("scenes: dragging updates frames, nested points, dials, and lanes", () => {
    const api = scenesApi();
    const framePoint = puzzlesApi().getPuzzle("transform-point");
    let values = api.initialValues(framePoint);
    const originGrip = api.grips(framePoint, values).find((grip) => grip.handleId === "transform" && grip.grip === "origin");
    values = api.dragHandle(framePoint, values, originGrip, { x: 1, y: 2 });
    near(values.transform.x, 1); near(values.transform.y, 2); near(values.transform.yaw, Math.PI / 2);
    const headingGrip = api.grips(framePoint, values).find((grip) => grip.handleId === "transform" && grip.grip === "heading");
    values = api.dragHandle(framePoint, values, headingGrip, { x: 3, y: 2 });
    near(values.transform.yaw, 0);
    const pointGrip = api.grips(framePoint, values).find((grip) => grip.handleId === "point");
    values = api.dragHandle(framePoint, values, pointGrip, { x: 4, y: 3 });
    near(values.point.x, 3); near(values.point.y, 1);
    near(api.grips(framePoint, values).find((grip) => grip.handleId === "point").at.x, 4);

    const wrap = puzzlesApi().getPuzzle("wrap-angle");
    let dialValues = api.initialValues(wrap);
    const knob = api.grips(wrap, dialValues).find((grip) => grip.handleId === "angle");
    dialValues = api.dragHandle(wrap, dialValues, knob, { x: Math.cos(4.3) * 2, y: Math.sin(4.3) * 2 });
    near(dialValues.angle, 4.3, 1e-9);

    const lerp = puzzlesApi().getPuzzle("interpolate-transform");
    let lerpValues = api.initialValues(lerp);
    const slider = api.grips(lerp, lerpValues).find((grip) => grip.handleId === "amount");
    lerpValues = api.dragHandle(lerp, lerpValues, slider, { x: 99, y: slider.at.y });
    near(lerpValues.amount, 1);
    lerpValues = api.dragHandle(lerp, lerpValues, slider, { x: -99, y: slider.at.y });
    near(lerpValues.amount, 0);
  });
```

- [ ] **Step 2: Run the tests and confirm the scene tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `22/24 puzzle tests passed` with `PuzzleScenes is not implemented`.

- [ ] **Step 3: Create the scene module with core helpers and the 2D kinds**

Create `p5sim/tf2_walkthrough/puzzle-scenes.js`:

```js
(function exposePuzzleScenes(root) {
  "use strict";

  const PI = Math.PI;
  const LANE_LEFT = -4.5;
  const LANE_RIGHT = 4.5;
  const LANE_TOP = -2.55;
  const LANE_GAP = 0.55;

  // ------------------------------------------------------------ SE(2) helpers
  function wrap(angle) {
    let result = (angle + PI) % (2 * PI);
    if (result < 0) result += 2 * PI;
    return result - PI;
  }
  function rotate(v, yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };
  }
  function applyPoint(t, p) {
    const r = rotate(p, t.yaw);
    return { x: r.x + t.x, y: r.y + t.y };
  }
  function compose(a, b) {
    const origin = applyPoint(a, b);
    return { x: origin.x, y: origin.y, yaw: wrap(a.yaw + b.yaw) };
  }
  function invert(t) {
    const shifted = rotate({ x: -t.x, y: -t.y }, -t.yaw);
    return { x: shifted.x, y: shifted.y, yaw: -t.yaw };
  }
  function identity() { return { x: 0, y: 0, yaw: 0 }; }
  function direction(yaw, length) { return { x: Math.cos(yaw) * (length || 1), y: Math.sin(yaw) * (length || 1) }; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function isPoint(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.x) && Number.isFinite(v.y); }
  function isTransform(v) { return isPoint(v) && Number.isFinite(v.yaw); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function fmt(n) { return Number.isFinite(n) ? n.toFixed(2) : "?"; }
  function degrees(r) { return Number.isFinite(r) ? (r * 180 / PI).toFixed(1) + "°" : "?"; }
  function fmtPoint(p) { return isPoint(p) ? "(" + fmt(p.x) + ", " + fmt(p.y) + ")" : "—"; }
  function fmtTransform(t) { return isTransform(t) ? "(" + fmt(t.x) + ", " + fmt(t.y) + ", " + degrees(t.yaw) + ")" : "—"; }
  function describe(value) {
    if (typeof value === "number") return fmt(value) + " rad (" + degrees(value) + ")";
    if (isTransform(value)) return fmtTransform(value);
    if (isPoint(value)) return fmtPoint(value);
    if (value === null || value === undefined) return "—";
    const text = JSON.stringify(value);
    return text.length > 64 ? text.slice(0, 61) + "…" : text;
  }

  // ------------------------------------------------------------ primitives
  function frame(transform, label, style, options) { return { kind: "frame", transform, label, style, ...(options || {}) }; }
  function point(at, label, style, options) { return { kind: "point", at, label, style, ...(options || {}) }; }
  function arrow(from, to, style, options) { return { kind: "arrow", from, to, style, ...(options || {}) }; }
  function arc(center, radius, from, to, style, options) { return { kind: "arc", center, radius, from, to, style, ...(options || {}) }; }
  function label(text, style, options) { return { kind: "label", text, style, ...(options || {}) }; }
  function glyph(pose, text, style, options) { return { kind: "glyph", pose, label: text, style, ...(options || {}) }; }
  function lane(from, to, style, options) { return { kind: "lane", from, to, style, ...(options || {}) }; }
  function marker(at, text, style, options) { return { kind: "marker", at, label: text, style, ...(options || {}) }; }
  function shade(from, to, style, options) { return { kind: "shade", from, to, style, ...(options || {}) }; }

  function passing(context) { return Boolean(context.comparison && context.comparison.pass); }
  function resultStyle(context) { return passing(context) ? "match" : "actual"; }
  function resultLabel(context) { return passing(context) ? "match" : "yours"; }
  function errorArrow(context, from, to) {
    return isPoint(from) && isPoint(to) && !passing(context) ? [arrow(from, to, "actual", { dashed: true, weight: 1 })] : [];
  }
  function notes(context, expectedText, actualText, extra) {
    const rows = [label("expected: " + expectedText, "expected", { row: 0 }), label("yours: " + actualText, context.error ? "actual" : resultStyle(context), { row: 1 })];
    if (context.error) rows.push(label("⚠ " + context.error.kind + ": your function did not produce a value", "actual", { row: 2 }));
    else if (context.diagnosis) rows.push(label("⚠ " + context.diagnosis.id, "actual", { row: 2 }));
    (extra || []).forEach((text, index) => rows.push(label(text, "muted", { row: 3 + index })));
    return rows;
  }

  // ------------------------------------------------------------ handle geometry
  function handleDefs(puzzle) { return puzzle.scene.handles; }
  function findHandle(puzzle, id) { return handleDefs(puzzle).find((entry) => entry.id === id) || null; }
  function initialValues(puzzle) {
    const values = {};
    handleDefs(puzzle).forEach((entry) => { values[entry.id] = clone(entry.value); });
    return values;
  }
  function parentWorld(puzzle, values, handle) {
    if (!handle || !handle.in) return identity();
    const parent = findHandle(puzzle, handle.in);
    return compose(parentWorld(puzzle, values, parent), values[parent.id]);
  }
  function handleWorld(puzzle, values, id) {
    const handle = findHandle(puzzle, id);
    return compose(parentWorld(puzzle, values, handle), values[id]);
  }
  function laneRange(handle) {
    return { lo: Number.isFinite(handle.start) ? handle.start : handle.min, hi: Number.isFinite(handle.end) ? handle.end : handle.max };
  }
  function laneY(puzzle, handle) {
    const lanes = handleDefs(puzzle).filter((entry) => entry.type === "slider" || entry.type === "timeline");
    return LANE_TOP - lanes.indexOf(handle) * LANE_GAP;
  }
  function laneX(handle, value) {
    const range = laneRange(handle);
    return LANE_LEFT + (value - range.lo) / (range.hi - range.lo) * (LANE_RIGHT - LANE_LEFT);
  }
  function laneValue(handle, x) {
    const range = laneRange(handle);
    const t = Math.max(0, Math.min(1, (x - LANE_LEFT) / (LANE_RIGHT - LANE_LEFT)));
    return range.lo + t * (range.hi - range.lo);
  }
  function dialCenter(handle) { return handle.center || { x: 0, y: 0 }; }
  function dialRadius(handle) { return handle.radius || 1.7; }

  function grips(puzzle, values) {
    const list = [];
    handleDefs(puzzle).forEach((handle) => {
      const value = values[handle.id];
      const world = parentWorld(puzzle, values, handle);
      if (handle.type === "frame" || handle.type === "pose") {
        list.push({ handleId: handle.id, grip: "origin", at: applyPoint(world, value), radius: 0.3 });
        list.push({ handleId: handle.id, grip: "heading", at: applyPoint(world, add(value, direction(value.yaw, 1))), radius: 0.22 });
      } else if (handle.type === "point") {
        list.push({ handleId: handle.id, grip: "point", at: applyPoint(world, value), radius: 0.26 });
      } else if (handle.type === "vector") {
        list.push({ handleId: handle.id, grip: "tip", at: applyPoint(world, value), radius: 0.26 });
      } else if (handle.type === "dial") {
        const center = dialCenter(handle);
        list.push({ handleId: handle.id, grip: "knob", at: add(center, direction(value, dialRadius(handle))), radius: 0.24 });
      } else if (handle.type === "slider" || handle.type === "timeline") {
        list.push({ handleId: handle.id, grip: "knob", at: { x: laneX(handle, value), y: laneY(puzzle, handle) }, radius: 0.24 });
      }
    });
    return list;
  }

  function dragHandle(puzzle, values, grip, worldPoint) {
    const handle = findHandle(puzzle, grip.handleId);
    const next = clone(values);
    const local = applyPoint(invert(parentWorld(puzzle, values, handle)), worldPoint);
    const current = values[handle.id];
    if (handle.type === "frame" || handle.type === "pose") {
      next[handle.id] = grip.grip === "origin"
        ? { x: local.x, y: local.y, yaw: current.yaw }
        : { x: current.x, y: current.y, yaw: Math.atan2(local.y - current.y, local.x - current.x) };
    } else if (handle.type === "point" || handle.type === "vector") {
      next[handle.id] = { x: local.x, y: local.y };
    } else if (handle.type === "dial") {
      const center = dialCenter(handle);
      const angle = Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x);
      next[handle.id] = handle.accumulate ? current + wrap(angle - current) : angle;
    } else if (handle.type === "slider" || handle.type === "timeline") {
      next[handle.id] = laneValue(handle, worldPoint.x);
    }
    return next;
  }

  function laneLayers(puzzle, values) {
    const out = [];
    handleDefs(puzzle).filter((handle) => handle.type === "slider" || handle.type === "timeline").forEach((handle) => {
      const y = laneY(puzzle, handle);
      const range = laneRange(handle);
      out.push(lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: handle.label, marks: [{ at: { x: LANE_LEFT, y }, label: fmt(range.lo) }, { at: { x: LANE_RIGHT, y }, label: fmt(range.hi) }] }));
      out.push(marker({ x: laneX(handle, values[handle.id]), y }, fmt(values[handle.id]), "input", { height: 0.22 }));
    });
    return out;
  }

  // ------------------------------------------------------------ argument building
  function resolveArg(spec, puzzle, values, fixtures) {
    if (spec && typeof spec === "object" && spec.handle) return clone(values[spec.handle]);
    if (spec && typeof spec === "object" && spec.fixture) {
      const fixture = fixtures[spec.fixture];
      if (!fixture) throw new Error("Unknown fixture " + spec.fixture + " for scene " + puzzle.scene.kind);
      return clone(fixture(values, puzzle));
    }
    return clone(spec);
  }
  function toArgs(puzzle, values) {
    const scene = SCENES[puzzle.scene.kind];
    if (!scene) throw new Error("Unknown scene kind " + puzzle.scene.kind);
    const specs = puzzle.scene.args || handleDefs(puzzle).map((handle) => ({ handle: handle.id }));
    return specs.map((spec) => resolveArg(spec, puzzle, values, scene.fixtures || {}));
  }

  // ------------------------------------------------------------ 2D scene kinds
  function valueDirection(value, length) {
    if (typeof value === "number" && Number.isFinite(value)) return direction(value, length);
    if (isPoint(value)) return { x: value.x, y: value.y };
    return null;
  }
  function angleNumberLine(context) {
    const y = LANE_TOP;
    const toX = (angle) => LANE_LEFT + (angle + 3 * PI) / (6 * PI) * (LANE_RIGHT - LANE_LEFT);
    const out = [
      shade({ x: toX(-PI), y: y - 0.2 }, { x: toX(PI), y: y + 0.2 }, "expected"),
      lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: "angle number line", marks: [{ at: { x: toX(-PI), y }, label: "−π" }, { at: { x: toX(0), y }, label: "0" }, { at: { x: toX(PI), y }, label: "π" }] }),
    ];
    if (typeof context.expected === "number") out.push(marker({ x: toX(context.expected), y }, "expected", "expected", { height: 0.3, dashed: true }));
    if (typeof context.actual === "number" && Number.isFinite(context.actual)) {
      const clamped = Math.max(-3 * PI, Math.min(3 * PI, context.actual));
      out.push(marker({ x: toX(clamped), y }, resultLabel(context), resultStyle(context), { height: 0.3 }));
    }
    return out;
  }
  const dialScene = {
    fixtures: {},
    layers(context) {
      const handle = handleDefs(context.puzzle)[0];
      const value = context.values[handle.id];
      const center = dialCenter(handle);
      const radius = dialRadius(handle);
      const out = [arc(center, radius, 0, value, "input", { track: true }), arrow(center, add(center, direction(value, radius)), "input")];
      out.push(label(handle.label + " = " + fmt(value) + " rad", "input", { at: add(center, direction(value, radius + 0.55)) }));
      const expectedDir = valueDirection(context.expected, 1.2);
      const actualDir = valueDirection(context.actual, 1.2);
      if (expectedDir) { out.push(arrow(center, add(center, expectedDir), "expected", { dashed: true })); out.push(point(add(center, expectedDir), "expected", "expected", { dashed: true })); }
      if (actualDir) { out.push(arrow(center, add(center, actualDir), resultStyle(context), { weight: 3 })); out.push(point(add(center, actualDir), resultLabel(context), resultStyle(context))); }
      if (expectedDir && actualDir) out.push(...errorArrow(context, add(center, actualDir), add(center, expectedDir)));
      if (typeof context.expected === "number" || typeof context.actual === "number") out.push(...angleNumberLine(context));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const vectorScene = {
    fixtures: {},
    layers(context) {
      const v = context.values.v;
      const out = [arrow({ x: 0, y: 0 }, v, "input", { weight: 3 }), label("v = " + fmtPoint(v), "input", { at: add(v, { x: 0.2, y: 0.25 }) })];
      if (typeof context.expected === "number") { out.push(arc({ x: 0, y: 0 }, 1.3, 0, context.expected, "expected", { dashed: true })); out.push(arrow({ x: 0, y: 0 }, direction(context.expected, 1.3), "expected", { dashed: true })); }
      if (typeof context.actual === "number" && Number.isFinite(context.actual)) { out.push(arc({ x: 0, y: 0 }, 1.0, 0, context.actual, resultStyle(context))); out.push(arrow({ x: 0, y: 0 }, direction(context.actual, 1.0), resultStyle(context), { weight: 3 })); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const vectorDialScene = {
    fixtures: {},
    layers(context) {
      const v = context.values.v;
      const yaw = context.values.yaw;
      const dial = findHandle(context.puzzle, "yaw");
      const out = [arrow({ x: 0, y: 0 }, v, "muted", { weight: 2 }), label("v", "muted", { at: add(v, { x: 0.15, y: 0.2 }) }), arc({ x: 0, y: 0 }, dialRadius(dial), 0, yaw, "input", { track: true }), label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(dial) + 0.5) })];
      if (isPoint(context.expected)) { out.push(arrow({ x: 0, y: 0 }, context.expected, "expected", { dashed: true })); out.push(point(context.expected, "expected", "expected", { dashed: true })); }
      if (isPoint(context.actual)) { out.push(arrow({ x: 0, y: 0 }, context.actual, resultStyle(context), { weight: 3 })); out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const twoDialsScene = {
    fixtures: {},
    layers(context) {
      const fromHandle = findHandle(context.puzzle, "from");
      const toHandle = findHandle(context.puzzle, "to");
      const from = context.values.from;
      const to = context.values.to;
      const out = [
        arrow({ x: 0, y: 0 }, direction(from, dialRadius(fromHandle)), "muted", { weight: 2 }), label("from " + degrees(from), "muted", { at: direction(from, dialRadius(fromHandle) + 0.45) }),
        arrow({ x: 0, y: 0 }, direction(to, dialRadius(toHandle)), "input", { weight: 2 }), label("to " + degrees(to), "input", { at: direction(to, dialRadius(toHandle) + 0.45) }),
      ];
      if (typeof context.expected === "number") out.push(arc({ x: 0, y: 0 }, 1.2, from, from + context.expected, "expected", { dashed: true, arrowhead: true }));
      if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arc({ x: 0, y: 0 }, 0.9, from, from + context.actual, resultStyle(context), { arrowhead: true }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  function frameSceneBase(context) {
    const transform = context.values.transform;
    return [frame(identity(), "target", "muted"), frame(transform, "source", "input"), label("T_target_source = " + fmtTransform(transform), "muted", { row: 3 })];
  }
  const framePointScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.point;
      const world = applyPoint(transform, local);
      const out = frameSceneBase(context);
      out.push(arrow(transform, world, "input", { dashed: true, weight: 1 }), point(world, "p = " + fmtPoint(local) + " in source", "input"));
      if (isPoint(context.expected)) out.push(point(context.expected, "expected in target", "expected", { dashed: true }));
      if (isPoint(context.actual)) { out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const frameVectorScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.vector;
      const tip = applyPoint(transform, local);
      const out = frameSceneBase(context);
      out.push(arrow(transform, tip, "input", { weight: 3 }), label("v = " + fmtPoint(local) + " in source", "input", { at: add(tip, { x: 0.15, y: 0.2 }) }));
      if (isPoint(context.expected)) out.push(arrow({ x: 0, y: 0 }, context.expected, "expected", { dashed: true }), point(context.expected, "expected in target", "expected", { dashed: true }));
      if (isPoint(context.actual)) { out.push(arrow({ x: 0, y: 0 }, context.actual, resultStyle(context), { weight: 3 })); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const framePoseScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.pose;
      const out = frameSceneBase(context);
      out.push(glyph(compose(transform, local), "pose " + fmtTransform(local) + " in source", "input"));
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected in target", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const frameChainScene = {
    fixtures: {},
    layers(context) {
      const aFromB = context.values.aFromB;
      const aFromC = compose(aFromB, context.values.bFromC);
      const out = [frame(identity(), "a", "muted"), frame(aFromB, "b", "input"), frame(aFromC, "c", "input", { alpha: 170 }), arrow(aFromB, aFromC, "input", { dashed: true, weight: 1 })];
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected aFromC", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(frame(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["aFromB = " + fmtTransform(aFromB), "bFromC = " + fmtTransform(context.values.bFromC)]));
      return out;
    },
  };
  const frameInverseScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const out = [frame(identity(), "a", "muted"), frame(transform, "b", "input"), label("b ∘ yours must land on a", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(frame(compose(transform, context.expected), "b ∘ expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { const placed = compose(transform, context.actual); out.push(frame(placed, "b ∘ yours", resultStyle(context))); out.push(...errorArrow(context, placed, identity())); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const twoFramesScene = {
    fixtures: {},
    layers(context) {
      const worldFromA = context.values.worldFromA;
      const worldFromB = context.values.worldFromB;
      const out = [frame(identity(), "world", "muted"), frame(worldFromA, "a", "input"), frame(worldFromB, "b", "input"), label("a ∘ yours must land on b", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(frame(compose(worldFromA, context.expected), "a ∘ expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { const placed = compose(worldFromA, context.actual); out.push(frame(placed, "a ∘ yours", resultStyle(context))); out.push(...errorArrow(context, placed, worldFromB)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const poseLerpScene = {
    fixtures: {},
    layers(context) {
      const a = context.values.a;
      const b = context.values.b;
      const out = [arrow(a, b, "muted", { dashed: true, weight: 1 }), glyph(a, "a " + degrees(a.yaw), "input"), glyph(b, "b " + degrees(b.yaw), "input"), ...laneLayers(context.puzzle, context.values)];
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const correctionScene = {
    fixtures: {
      mapFromBase: (values) => compose(values.odomInMap, values.odomFromBase),
    },
    layers(context) {
      const odomInMap = context.values.odomInMap;
      const odomFromBase = context.values.odomFromBase;
      const truePose = compose(odomInMap, odomFromBase);
      const out = [frame(identity(), "map", "muted"), frame(odomInMap, "odom (drifted)", "input"), glyph(truePose, "base_link", "input"), arrow(odomInMap, truePose, "input", { dashed: true, weight: 1 })];
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected map→odom", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        const placedBase = compose(context.actual, odomFromBase);
        out.push(frame(context.actual, "your map→odom", resultStyle(context)), glyph(placedBase, "base_link via yours", resultStyle(context), { dashed: true }));
        out.push(...errorArrow(context, placedBase, truePose));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["mapFromBase (localizer) = " + fmtTransform(truePose), "odomFromBase (odometry) = " + fmtTransform(odomFromBase)]));
      return out;
    },
  };

  const SCENES = {
    "dial": dialScene,
    "vector": vectorScene,
    "vector-dial": vectorDialScene,
    "two-dials": twoDialsScene,
    "frame-point": framePointScene,
    "frame-vector": frameVectorScene,
    "frame-pose": framePoseScene,
    "frame-chain": frameChainScene,
    "frame-inverse": frameInverseScene,
    "two-frames": twoFramesScene,
    "pose-lerp": poseLerpScene,
    "correction": correctionScene,
  };

  function layers(context) {
    const scene = SCENES[context.puzzle.scene.kind];
    if (!scene) return [label("Unknown scene kind " + context.puzzle.scene.kind, "actual", { row: 0 })];
    return scene.layers(context);
  }

  const api = {
    SCENE_KINDS: Object.keys(SCENES),
    SCENES,
    initialValues, toArgs, layers, grips, dragHandle, handleWorld,
    se2: { wrap, rotate, applyPoint, compose, invert, identity, direction },
    primitives: { frame, point, arrow, arc, label, glyph, lane, marker, shade },
    format: { fmt, degrees, fmtPoint, fmtTransform, describe },
    lanes: { laneLayers, laneX, laneY, laneRange, LANE_LEFT, LANE_RIGHT, LANE_TOP },
  };
  root.PuzzleScenes = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
```

`api.SCENE_KINDS` and `api.SCENES` are plain (not frozen) so Task 8 can register more kinds from the same file after this block; Task 8 replaces the `SCENES` literal in place rather than mutating at runtime.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `24/24 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add scene module with handle geometry and 2D scene kinds

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 8: Tree, robot chain, timeline, SE(3), and capstone scene kinds

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-scenes.js`
- Modify: `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests for the remaining kinds and full coverage**

Append to `puzzle-tests.js` before `async function runAllTests()`:

```js
  test("scenes: structural, timeline, SE(3), and capstone kinds build valid arguments and layers", () => {
    checkSceneKinds(["tree", "robot-chain", "timeline", "timeline-ranges", "timeline-frame", "se3", "robot-chain-time"]);
  });

  test("scenes: every puzzle uses a registered scene kind and the laser hit lands on the landmark", () => {
    const api = scenesApi();
    puzzleList().forEach((puzzle) => assert(api.SCENE_KINDS.includes(puzzle.scene.kind), puzzle.id + " uses unregistered scene kind " + puzzle.scene.kind));
    const laser = puzzlesApi().getPuzzle("laser-point-to-map");
    const values = api.initialValues(laser);
    const args = api.toArgs(laser, values);
    const projected = referenceOutput(laser, args);
    near(projected.x, 3.5); near(projected.y, 2.5);
    const latest = puzzlesApi().getPuzzle("latest-common-time");
    const latestValues = { ...api.initialValues(latest), mode: "latest" };
    same(api.toArgs(latest, latestValues)[1], null);
  });
```

- [ ] **Step 2: Run the tests and confirm the new tests fail**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `24/26 puzzle tests passed` with `Unknown scene kind tree` style failures.

- [ ] **Step 3: Extend `describe` and add the remaining scene kinds**

In `puzzle-scenes.js`, replace the existing `describe` function with:

```js
  function isQuaternion(q) { return Boolean(q) && typeof q === "object" && ["x", "y", "z", "w"].every((key) => Number.isFinite(q[key])); }
  function isVector3(v) { return Boolean(v) && typeof v === "object" && ["x", "y", "z"].every((key) => Number.isFinite(v[key])) && !("w" in v); }
  function fmtQuaternion(q) { return "(" + fmt(q.x) + ", " + fmt(q.y) + ", " + fmt(q.z) + ", " + fmt(q.w) + ")"; }
  function fmtVector3(v) { return "(" + fmt(v.x) + ", " + fmt(v.y) + ", " + fmt(v.z) + ")"; }
  function describe(value) {
    if (typeof value === "number") return fmt(value) + " rad (" + degrees(value) + ")";
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) return value.join(" → ");
      if (value.every((item) => item && typeof item === "object" && "from" in item)) return value.map((step) => (step.inverse ? "inv " : "") + step.from + "→" + step.to).join(", ");
      return JSON.stringify(value).slice(0, 64);
    }
    if (typeof value === "object") {
      if ("ok" in value) return value.ok ? "ok · t=" + fmt(value.time) + (value.transform ? " · " + fmtTransform(value.transform) : "") + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "") : value.code + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "");
      if ("valid" in value) return value.valid ? "valid" : String(value.code);
      if ("beforeIndex" in value) return "before " + value.beforeIndex + " · after " + value.afterIndex + " · amount " + fmt(value.amount);
      if (value.translation && value.rotation) return "t=" + fmtVector3(value.translation) + " q=" + fmtQuaternion(value.rotation);
      if (isQuaternion(value)) return fmtQuaternion(value);
      if (isTransform(value)) return fmtTransform(value);
      if (isVector3(value)) return fmtVector3(value);
      if (isPoint(value)) return fmtPoint(value);
      const children = Object.keys(value);
      if (children.length && children.every((child) => value[child] && typeof value[child] === "object" && "parent" in value[child])) return children.map((child) => value[child].parent + "→" + child).join(", ");
    }
    const text = JSON.stringify(value);
    return text.length > 64 ? text.slice(0, 61) + "…" : text;
  }
```

Then insert the following block directly before `const SCENES = {`:

```js
  // ------------------------------------------------------------ structural fixtures
  const ROBOT_TREE = {
    odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } },
    base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } },
    laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } },
    camera: { parent: "base_link", transform: { x: 0.5, y: 0.3, yaw: 0 } },
  };
  const ROBOT_EDGES = {
    odom: { parent: "map", child: "odom", transform: ROBOT_TREE.odom.transform },
    base_link: { parent: "odom", child: "base_link", transform: ROBOT_TREE.base_link.transform },
    laser: { parent: "base_link", child: "laser", transform: ROBOT_TREE.laser.transform },
    camera: { parent: "base_link", child: "camera", transform: ROBOT_TREE.camera.transform },
  };
  const EDGE_SETS = {
    "valid-chain": [{ parent: "map", child: "odom" }, { parent: "odom", child: "base_link" }, { parent: "base_link", child: "laser" }],
    "duplicate-parent": [{ parent: "map", child: "base_link" }, { parent: "odom", child: "base_link" }],
    "cycle": [{ parent: "map", child: "odom" }, { parent: "odom", child: "base_link" }, { parent: "base_link", child: "map" }],
  };
  function treePrimitive(nodes, edges, steps, options) { return { kind: "tree", nodes, edges, steps: steps || [], ...(options || {}) }; }
  function treeEdges(tree) {
    if (!tree || typeof tree !== "object" || Array.isArray(tree)) return [];
    return Object.keys(tree).filter((child) => tree[child] && typeof tree[child].parent === "string").map((child) => ({ parent: tree[child].parent, child }));
  }
  function edgeKey(edge) { return edge.parent + ">" + edge.child; }
  function nodeNames(edges) {
    const names = [];
    edges.forEach((edge) => { [edge.parent, edge.child].forEach((name) => { if (!names.includes(name)) names.push(name); }); });
    return names;
  }
  const treeScene = {
    fixtures: {
      tree: () => ROBOT_TREE,
      treeWithoutEdge: (values) => { const copy = { ...ROBOT_TREE }; delete copy[values.edge]; return copy; },
      selectedEdge: (values) => ROBOT_EDGES[values.edge],
      edgeSet: (values) => EDGE_SETS[values.edgeSet],
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [];
      if (view === "validation") {
        const edges = Array.isArray(context.args[0]) ? context.args[0] : [];
        const counts = {};
        edges.forEach((edge) => { counts[edge.child] = (counts[edge.child] || 0) + 1; });
        const styledEdges = edges.map((edge) => ({ ...edge, style: counts[edge.child] > 1 ? "accent" : "input" }));
        out.push(treePrimitive(nodeNames(edges).map((id) => ({ id, style: "input" })), styledEdges, [], { caption: "edge set: " + context.values.edgeSet }));
      } else if (view === "tree-result") {
        const baseEdges = treeEdges(context.args[0]);
        const baseKeys = new Set(baseEdges.map(edgeKey));
        const expectedEdges = treeEdges(context.expected).filter((edge) => !baseKeys.has(edgeKey(edge)));
        const actualEdges = treeEdges(context.actual).filter((edge) => !baseKeys.has(edgeKey(edge)));
        const edges = baseEdges.map((edge) => ({ ...edge, style: "muted" }))
          .concat(expectedEdges.map((edge) => ({ ...edge, style: "expected", dashed: true })))
          .concat(actualEdges.map((edge) => ({ ...edge, style: resultStyle(context) })));
        out.push(treePrimitive(nodeNames(edges).map((id) => ({ id, style: "muted" })), edges, [], { caption: "adding " + context.values.edge }));
      } else {
        const baseEdges = treeEdges(context.args[0]).map((edge) => ({ ...edge, style: "muted" }));
        const names = nodeNames(baseEdges);
        const expectedNames = new Set(Array.isArray(context.expected) ? context.expected : (typeof context.expected === "string" ? [context.expected] : []));
        const actualNames = new Set(Array.isArray(context.actual) && view !== "steps" ? context.actual : (typeof context.actual === "string" ? [context.actual] : []));
        const nodes = names.map((id) => ({
          id,
          style: actualNames.has(id) ? resultStyle(context) : (context.args.slice(1).includes(id) ? "input" : "muted"),
          expected: expectedNames.has(id),
        }));
        const steps = [];
        if (view === "steps") {
          (Array.isArray(context.expected) ? context.expected : []).forEach((step) => steps.push({ from: step.from, to: step.to, inverse: Boolean(step.inverse), style: "expected", dashed: true }));
          (Array.isArray(context.actual) ? context.actual : []).forEach((step) => steps.push({ from: step.from, to: step.to, inverse: Boolean(step.inverse), style: resultStyle(context) }));
        }
        out.push(treePrimitive(nodes, baseEdges, steps, { caption: context.args.slice(1).join(" · ") }));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ robot chain
  const LASER_MOUNT = { x: 0.6, y: 0, yaw: 0 };
  const LANDMARK = { x: 3.5, y: 2.5 };
  function chainWorld(values, name) {
    if (name === "map") return identity();
    if (name === "odom") return values.odom;
    const base = compose(values.odom, values.base_link);
    if (name === "base_link") return base;
    return compose(base, LASER_MOUNT);
  }
  function chainLayers(values) {
    const base = chainWorld(values, "base_link");
    const laser = chainWorld(values, "laser");
    return [frame(identity(), "map", "muted"), frame(values.odom, "odom", "input"), arrow(values.odom, base, "input", { dashed: true, weight: 1 }), glyph(base, "base_link", "input"), frame(laser, "laser", "input", { alpha: 170, size: 0.55 })];
  }
  function lookupLayers(context, worldOf, target, source, expected, actual) {
    const out = [];
    if (isTransform(expected)) out.push(frame(compose(worldOf(target), expected), target + " ∘ expected", "expected", { dashed: true }));
    if (isTransform(actual)) {
      const placed = compose(worldOf(target), actual);
      out.push(frame(placed, target + " ∘ yours", resultStyle(context)));
      out.push(...errorArrow(context, placed, worldOf(source)));
    }
    out.push(label("lookup(" + target + ", " + source + ") drawn from " + target + " must land on " + source, "muted", { row: 3 }));
    return out;
  }
  const robotChainScene = {
    fixtures: {
      chainTree: (values) => ({ odom: { parent: "map", transform: values.odom }, base_link: { parent: "odom", transform: values.base_link }, laser: { parent: "base_link", transform: LASER_MOUNT } }),
      laserHit: (values) => applyPoint(invert(chainWorld(values, "laser")), LANDMARK),
    },
    layers(context) {
      const out = chainLayers(context.values);
      if (context.puzzle.scene.view === "landmark") {
        const laser = chainWorld(context.values, "laser");
        const hit = applyPoint(invert(laser), LANDMARK);
        out.push(point(LANDMARK, "landmark", "accent"), arrow(laser, LANDMARK, "muted", { dashed: true, weight: 1 }), label("hit in laser = " + fmtPoint(hit), "muted", { row: 3 }));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected in map", "expected", { dashed: true }));
        if (isPoint(context.actual)) { out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      } else {
        out.push(...lookupLayers(context, (name) => chainWorld(context.values, name), context.values.target, context.values.source, context.expected, context.actual));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ timelines
  const SAMPLES = [
    { time: 0, transform: { x: -3.5, y: 0.8, yaw: 0 } },
    { time: 2, transform: { x: -1.5, y: 1.6, yaw: 0.6 } },
    { time: 5, transform: { x: 0.8, y: 1.2, yaw: 1.2 } },
    { time: 9, transform: { x: 3.2, y: 0.5, yaw: 2.0 } },
  ];
  const DYNAMIC_EDGE = { parent: "map", child: "odom", samples: [
    { time: 0, transform: { x: -3, y: 0.5, yaw: 0 } },
    { time: 4, transform: { x: 0, y: 1.6, yaw: PI / 2 } },
    { time: 10, transform: { x: 3, y: 0.5, yaw: PI } },
  ] };
  const STATIC_EDGE = { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1.5, y: 0.8, yaw: PI / 4 } };
  const RANGES = [{ start: 2, end: 8 }, { start: 4, end: 9 }];
  const STAMPED_EDGES = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: -2, y: -0.5, yaw: 0 } }, { time: 5, transform: { x: 0, y: 0.5, yaw: 0.4 } }, { time: 10, transform: { x: 2, y: 1, yaw: 0.9 } }] },
    { parent: "odom", child: "base_link", samples: [{ time: 2, transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, transform: { x: 2, y: 0.5, yaw: 0.5 } }, { time: 9, transform: { x: 2.5, y: 1, yaw: 1.0 } }] },
    { parent: "base_link", child: "laser", isStatic: true, transform: LASER_MOUNT },
  ];
  function bracket(samples, time) {
    const last = samples.length - 1;
    if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };
    if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };
    let i = 0;
    while (samples[i + 1].time <= time) i += 1;
    return { beforeIndex: i, afterIndex: i + 1, amount: (time - samples[i].time) / (samples[i + 1].time - samples[i].time) };
  }
  function lerpTransform(a, b, amount) {
    return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrap(a.yaw + wrap(b.yaw - a.yaw) * amount) };
  }
  function sampleAt(edge, time) {
    if (edge.isStatic) return edge.transform;
    const b = bracket(edge.samples, time);
    return lerpTransform(edge.samples[b.beforeIndex].transform, edge.samples[b.afterIndex].transform, b.amount);
  }
  function sampleMarks(puzzle, handle, samples) {
    const y = laneY(puzzle, handle);
    return samples.map((sample) => marker({ x: laneX(handle, sample.time), y }, "t=" + sample.time, "muted", { height: 0.18 }));
  }
  function rangeLane(handle, range, y, text, style) {
    return [
      lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: text }),
      lane({ x: laneX(handle, range.start), y }, { x: laneX(handle, range.end), y }, style || "input", { weight: 4 }),
      marker({ x: laneX(handle, range.start), y }, fmt(range.start), "muted", { height: 0.14 }),
      marker({ x: laneX(handle, range.end), y }, fmt(range.end), "muted", { height: 0.14 }),
    ];
  }
  const timelineScene = {
    fixtures: { samples: () => SAMPLES },
    layers(context) {
      const handle = findHandle(context.puzzle, "time");
      const y = laneY(context.puzzle, handle);
      const out = laneLayers(context.puzzle, context.values).concat(sampleMarks(context.puzzle, handle, SAMPLES));
      SAMPLES.forEach((sample) => out.push(frame(sample.transform, "t=" + sample.time, "muted", { alpha: 120, size: 0.6 })));
      const drawBracket = (value, style, dashed) => {
        if (!value || !Number.isInteger(value.beforeIndex) || !Number.isInteger(value.afterIndex) || !SAMPLES[value.beforeIndex] || !SAMPLES[value.afterIndex]) return;
        const x0 = laneX(handle, SAMPLES[value.beforeIndex].time);
        const x1 = laneX(handle, SAMPLES[value.afterIndex].time);
        const offset = dashed ? 0.3 : 0.5;
        out.push(lane({ x: x0, y: y + offset }, { x: x1, y: y + offset }, style, { weight: 3, dashed }));
        if (Number.isFinite(value.amount)) out.push(marker({ x: x0 + (x1 - x0) * Math.max(0, Math.min(1, value.amount)), y: y + offset }, dashed ? "expected" : resultLabel(context), style, { height: 0.16, dashed }));
      };
      drawBracket(context.expected, "expected", true);
      drawBracket(context.actual, resultStyle(context), false);
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const timelineRangesScene = {
    fixtures: { ranges: () => RANGES, requestedOrNull: (values) => (values.mode === "latest" ? null : values.requested) },
    layers(context) {
      const handle = findHandle(context.puzzle, "requested");
      const y = laneY(context.puzzle, handle);
      const out = laneLayers(context.puzzle, context.values);
      RANGES.forEach((range, index) => out.push(...rangeLane(handle, range, -1.2 - index * 0.6, "edge " + (index + 1) + " history [" + range.start + ", " + range.end + "]")));
      const start = Math.max(...RANGES.map((range) => range.start));
      const end = Math.min(...RANGES.map((range) => range.end));
      if (start <= end) out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"), label("common interval [" + start + ", " + end + "]", "expected", { at: { x: laneX(handle, start), y: -0.6 } }));
      if (context.values.mode === "latest") out.push(label("requested: latest (null)", "input", { at: { x: LANE_LEFT, y: y - 0.45 } }));
      if (context.expected && context.expected.ok && Number.isFinite(context.expected.time)) out.push(marker({ x: laneX(handle, context.expected.time), y }, "expected time", "expected", { height: 0.4, dashed: true }));
      if (context.actual && context.actual.ok && Number.isFinite(context.actual.time)) out.push(marker({ x: laneX(handle, context.actual.time), y }, resultLabel(context), resultStyle(context), { height: 0.32 }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const timelineFrameScene = {
    fixtures: { edge: (values) => (values.edgeKind === "static" ? STATIC_EDGE : DYNAMIC_EDGE) },
    layers(context) {
      const handle = findHandle(context.puzzle, "time");
      const edge = context.values.edgeKind === "static" ? STATIC_EDGE : DYNAMIC_EDGE;
      const out = laneLayers(context.puzzle, context.values);
      if (edge.isStatic) {
        out.push(frame(edge.transform, "static edge", "muted", { alpha: 140 }), label("static: valid at every time", "muted", { row: 3 }));
      } else {
        out.push(...sampleMarks(context.puzzle, handle, edge.samples));
        edge.samples.forEach((sample) => out.push(frame(sample.transform, "t=" + sample.time, "muted", { alpha: 120, size: 0.6 })));
      }
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(frame(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const robotChainTimeScene = {
    fixtures: { stampedEdges: () => STAMPED_EDGES, requestedOrNull: (values) => (values.mode === "latest" ? null : values.time) },
    layers(context) {
      const handle = findHandle(context.puzzle, "time");
      const dynamic = STAMPED_EDGES.filter((edge) => !edge.isStatic);
      const start = Math.max(...dynamic.map((edge) => edge.samples[0].time));
      const end = Math.min(...dynamic.map((edge) => edge.samples[edge.samples.length - 1].time));
      const drawTime = context.values.mode === "latest" ? end : Math.max(start, Math.min(end, context.values.time));
      const sampled = {};
      STAMPED_EDGES.forEach((edge) => { sampled[edge.child] = sampleAt(edge, drawTime); });
      const chainValues = { odom: sampled.odom, base_link: sampled.base_link };
      const out = chainLayers(chainValues).concat(laneLayers(context.puzzle, context.values));
      dynamic.forEach((edge, index) => out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, edge.parent + " → " + edge.child)));
      out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"));
      out.push(label("chain drawn at t=" + fmt(drawTime) + (context.values.mode === "latest" ? " (latest)" : ""), "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
      const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
      const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
      out.push(...lookupLayers(context, (name) => chainWorld(chainValues, name), context.values.target, context.values.source, expectedTransform, actualTransform));
      if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
      if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ SE(3)
  function qmul(a, b) {
    return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z };
  }
  function qnormalize(q) {
    const length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    return length > 1e-9 ? { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length } : { x: 0, y: 0, z: 0, w: 1 };
  }
  function qrot(q, v) {
    const unit = qnormalize(q);
    const rotated = qmul(qmul(unit, { x: v.x, y: v.y, z: v.z, w: 0 }), { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w });
    return { x: rotated.x, y: rotated.y, z: rotated.z };
  }
  function axisAngle(axis, angle) {
    const s = Math.sin(angle / 2);
    return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) };
  }
  const AXIS_Y = { x: 0, y: 1, z: 0 };
  const AXIS_Z = { x: 0, y: 0, z: 1 };
  const ORIGIN3 = { x: 0, y: 0, z: 0 };
  function basisOf(q) { return { x: qrot(q, { x: 1, y: 0, z: 0 }), y: qrot(q, { x: 0, y: 1, z: 0 }), z: qrot(q, { x: 0, y: 0, z: 1 }) }; }
  function axes3d(origin, basis, text, style, options) { return { kind: "axes3d", origin, basis, label: text, style, ...(options || {}) }; }
  function arrow3d(from, to, text, style, options) { return { kind: "arrow3d", from, to, label: text, style, ...(options || {}) }; }
  const se3Scene = {
    fixtures: {
      quatA: (values) => axisAngle(AXIS_Z, values.yawA),
      quatB: (values) => axisAngle(AXIS_Y, values.pitchB),
      quat: (values) => axisAngle(AXIS_Z, values.yaw),
      vector: () => ({ x: 1, y: 0.4, z: 0.2 }),
      aFromB: (values) => ({ translation: { x: 1, y: 0, z: 0 }, rotation: axisAngle(AXIS_Z, values.yawA) }),
      bFromC: (values) => ({ translation: { x: 1, y: 0, z: 0.5 }, rotation: axisAngle(AXIS_Y, values.pitchB) }),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [axes3d(ORIGIN3, basisOf({ x: 0, y: 0, z: 0, w: 1 }), "world", "muted"), ...laneLayers(context.puzzle, context.values)];
      if (view === "rotate") {
        const v = se3Scene.fixtures.vector();
        out.push(arrow3d(ORIGIN3, v, "v", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else if (view === "compose") {
        const aFromB = se3Scene.fixtures.aFromB(context.values);
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"));
        if (context.expected && isVector3(context.expected.translation) && isQuaternion(context.expected.rotation)) out.push(axes3d(context.expected.translation, basisOf(context.expected.rotation), "expected c", "expected", { dashed: true }));
        if (context.actual && isVector3(context.actual.translation) && isQuaternion(context.actual.rotation)) out.push(axes3d(context.actual.translation, basisOf(context.actual.rotation), resultLabel(context), resultStyle(context)));
      } else {
        if (isQuaternion(context.expected)) out.push(axes3d(ORIGIN3, basisOf(context.expected), "expected", "expected", { dashed: true }));
        if (isQuaternion(context.actual)) out.push(axes3d(ORIGIN3, basisOf(context.actual), resultLabel(context), resultStyle(context)));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
```

Then replace the `SCENES` literal with:

```js
  const SCENES = {
    "dial": dialScene,
    "vector": vectorScene,
    "vector-dial": vectorDialScene,
    "two-dials": twoDialsScene,
    "frame-point": framePointScene,
    "frame-vector": frameVectorScene,
    "frame-pose": framePoseScene,
    "frame-chain": frameChainScene,
    "frame-inverse": frameInverseScene,
    "two-frames": twoFramesScene,
    "pose-lerp": poseLerpScene,
    "correction": correctionScene,
    "tree": treeScene,
    "robot-chain": robotChainScene,
    "timeline": timelineScene,
    "timeline-ranges": timelineRangesScene,
    "timeline-frame": timelineFrameScene,
    "se3": se3Scene,
    "robot-chain-time": robotChainTimeScene,
  };
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `26/26 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add tree, timeline, SE(3), and capstone scene kinds

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 9: Primitive renderer and grip dragging in the p5 sketch

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-sketch.js` (full replacement)

This task has no Node test; the sketch is browser-only and is verified in Task 11 once the controller feeds it primitives. The renderer only knows primitives and grips; it never inspects puzzles.

- [ ] **Step 1: Replace the sketch with the primitive renderer**

Replace the entire content of `p5sim/tf2_walkthrough/puzzle-sketch.js` with:

```js
(function exposePuzzleSketch(root) {
  "use strict";

  const STYLE_COLORS = {
    input: [245, 196, 81],
    expected: [95, 177, 213],
    actual: [255, 124, 139],
    match: [97, 221, 161],
    muted: [119, 135, 157],
    accent: [245, 196, 81],
    text: [218, 228, 241],
    x: [255, 114, 114],
    y: [85, 230, 156],
    z: [112, 167, 255],
    grid: [39, 49, 66],
    gridStrong: [55, 68, 91],
  };

  function createPuzzleSketch(host, callbacks) {
    const handlers = callbacks || {};
    let state = { values: {}, grips: [], primitives: [], running: false };
    let celebrationStarted = 0;
    let activeGrip = null;
    let hoverGrip = null;

    const instance = new p5((p) => {
      function color(style, alpha) {
        const rgb = STYLE_COLORS[style] || STYLE_COLORS.muted;
        return rgb.concat([alpha === undefined ? 255 : alpha]);
      }
      function canvasSize() {
        const width = Math.max(300, host.clientWidth || 640);
        return { width, height: Math.max(300, Math.min(470, width * 0.625)) };
      }
      function unit() { return Math.min(p.width / 11.5, p.height / 7.6); }
      function toScreen(point) { const u = unit(); return { x: p.width * 0.5 + point.x * u, y: p.height * 0.5 - point.y * u }; }
      function toWorld(x, y) { const u = unit(); return { x: (x - p.width * 0.5) / u, y: (p.height * 0.5 - y) / u }; }
      function setDash(on) { if (p.drawingContext.setLineDash) p.drawingContext.setLineDash(on ? [6, 5] : []); }

      function drawGrid() {
        p.strokeWeight(1);
        for (let x = -6; x <= 6; x += 1) {
          const a = toScreen({ x, y: -4 });
          const b = toScreen({ x, y: 4 });
          p.stroke.apply(p, x === 0 ? color("gridStrong", 180) : color("grid", 100));
          p.line(a.x, a.y, b.x, b.y);
        }
        for (let y = -4; y <= 4; y += 1) {
          const a = toScreen({ x: -6, y });
          const b = toScreen({ x: 6, y });
          p.stroke.apply(p, y === 0 ? color("gridStrong", 180) : color("grid", 100));
          p.line(a.x, a.y, b.x, b.y);
        }
      }

      function drawText(text, x, y, style, size) {
        p.noStroke();
        p.fill.apply(p, color(style || "muted"));
        p.textSize(size || 11);
        p.text(text, x, y);
      }

      function strokeLine(from, to, style, options) {
        const settings = options || {};
        const a = toScreen(from);
        const b = toScreen(to);
        p.push();
        p.stroke.apply(p, color(style, settings.alpha));
        p.strokeWeight(settings.weight || 2);
        setDash(Boolean(settings.dashed));
        p.line(a.x, a.y, b.x, b.y);
        setDash(false);
        p.pop();
        return { a, b };
      }

      function arrowHead(screenAt, heading, style, alpha, size) {
        p.push();
        p.translate(screenAt.x, screenAt.y);
        p.rotate(heading);
        p.noStroke();
        p.fill.apply(p, color(style, alpha));
        p.triangle(0, 0, -(size || 9), -4, -(size || 9), 4);
        p.pop();
      }

      function drawArrow(primitive) {
        const ends = strokeLine(primitive.from, primitive.to, primitive.style, primitive);
        arrowHead(ends.b, Math.atan2(ends.b.y - ends.a.y, ends.b.x - ends.a.x), primitive.style, primitive.alpha);
        if (primitive.label) drawText(primitive.label, ends.b.x + 8, ends.b.y - 8, primitive.style);
      }

      function drawFrame(primitive) {
        const t = primitive.transform;
        if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.yaw)) return;
        const size = primitive.size || 1;
        const origin = { x: t.x, y: t.y };
        const xEnd = { x: t.x + Math.cos(t.yaw) * size, y: t.y + Math.sin(t.yaw) * size };
        const yEnd = { x: t.x - Math.sin(t.yaw) * size, y: t.y + Math.cos(t.yaw) * size };
        const alpha = primitive.alpha === undefined ? (primitive.style === "muted" ? 150 : 255) : primitive.alpha;
        drawArrow({ from: origin, to: xEnd, style: "x", alpha, dashed: primitive.dashed, weight: primitive.dashed ? 2 : 2.5 });
        drawArrow({ from: origin, to: yEnd, style: "y", alpha, dashed: primitive.dashed, weight: primitive.dashed ? 2 : 2.5 });
        const at = toScreen(origin);
        p.push();
        p.noFill();
        p.stroke.apply(p, color(primitive.style, alpha));
        p.strokeWeight(primitive.style === "muted" ? 1 : 2);
        setDash(Boolean(primitive.dashed));
        p.circle(at.x, at.y, 9);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 8, at.y + 16, primitive.style);
      }

      function drawPoint(primitive) {
        if (!primitive.at || !Number.isFinite(primitive.at.x) || !Number.isFinite(primitive.at.y)) return;
        const at = toScreen(primitive.at);
        p.push();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.fill(7, 11, 17);
        p.circle(at.x, at.y, 13);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 9, at.y - 9, primitive.style);
      }

      function drawArc(primitive) {
        const center = toScreen(primitive.center);
        const diameter = primitive.radius * unit() * 2;
        p.push();
        p.noFill();
        if (primitive.track) {
          p.stroke.apply(p, color("grid", 200));
          p.strokeWeight(1);
          p.circle(center.x, center.y, diameter);
        }
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(primitive.weight || 2);
        setDash(Boolean(primitive.dashed));
        const sweep = primitive.to - primitive.from;
        if (Math.abs(sweep) >= Math.PI * 2 - 1e-9) {
          p.circle(center.x, center.y, diameter);
        } else if (Math.abs(sweep) > 1e-6) {
          const start = sweep > 0 ? -primitive.to : -primitive.from;
          const stop = sweep > 0 ? -primitive.from : -primitive.to;
          p.arc(center.x, center.y, diameter, diameter, start, stop);
        }
        setDash(false);
        p.pop();
        if (primitive.arrowhead && Math.abs(sweep) > 1e-6) {
          const tip = { x: primitive.center.x + Math.cos(primitive.to) * primitive.radius, y: primitive.center.y + Math.sin(primitive.to) * primitive.radius };
          const screenTip = toScreen(tip);
          const tangent = -primitive.to + (sweep > 0 ? -Math.PI / 2 : Math.PI / 2);
          arrowHead(screenTip, tangent, primitive.style, 255, 8);
        }
      }

      function drawGlyph(primitive) {
        const pose = primitive.pose;
        if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.yaw)) return;
        const at = toScreen(pose);
        const size = unit() * 0.42;
        p.push();
        p.translate(at.x, at.y);
        p.rotate(-pose.yaw);
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.fill(7, 11, 17, primitive.dashed ? 0 : 230);
        p.triangle(size, 0, -size * 0.7, size * 0.6, -size * 0.7, -size * 0.6);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + size + 6, at.y + 4, primitive.style);
      }

      function drawLane(primitive) {
        strokeLine(primitive.from, primitive.to, primitive.style, { weight: primitive.weight || 2, dashed: primitive.dashed });
        (primitive.marks || []).forEach((mark) => {
          const at = toScreen(mark.at);
          p.push();
          p.stroke.apply(p, color(primitive.style));
          p.strokeWeight(1);
          p.line(at.x, at.y - 5, at.x, at.y + 5);
          p.pop();
          if (mark.label) drawText(mark.label, at.x - 8, at.y + 17, "muted", 10);
        });
        if (primitive.label) {
          const at = toScreen(primitive.from);
          drawText(primitive.label, at.x, at.y - 9, primitive.style, 10);
        }
      }

      function drawMarker(primitive) {
        const at = toScreen(primitive.at);
        const height = (primitive.height || 0.2) * unit();
        p.push();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.line(at.x, at.y - height, at.x, at.y + height);
        setDash(false);
        p.noStroke();
        p.fill.apply(p, color(primitive.style));
        p.circle(at.x, at.y, 7);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 6, at.y - height - 4, primitive.style, 10);
      }

      function drawShade(primitive) {
        const a = toScreen(primitive.from);
        const b = toScreen(primitive.to);
        p.push();
        p.noStroke();
        p.fill.apply(p, color(primitive.style, 34));
        p.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        p.pop();
      }

      function drawLabel(primitive) {
        if (primitive.at) {
          const at = toScreen(primitive.at);
          drawText(primitive.text, at.x, at.y, primitive.style);
        } else {
          drawText(primitive.text, 18, 28 + (primitive.row || 0) * 19, primitive.style);
        }
      }

      function treeLayout(nodes, edges) {
        const parentOf = {};
        edges.forEach((edge) => { parentOf[edge.child] = edge.parent; });
        const depth = {};
        function depthOf(name, seen) {
          if (depth[name] !== undefined) return depth[name];
          if (seen.has(name)) return 0;
          seen.add(name);
          const parent = parentOf[name];
          depth[name] = parent === undefined ? 0 : depthOf(parent, seen) + 1;
          return depth[name];
        }
        nodes.forEach((node) => depthOf(node.id, new Set()));
        const columns = {};
        nodes.forEach((node) => { (columns[depth[node.id]] = columns[depth[node.id]] || []).push(node.id); });
        const depths = Object.keys(columns).map(Number);
        const maxDepth = Math.max.apply(null, depths.concat([0]));
        const positions = {};
        depths.forEach((d) => {
          const column = columns[d];
          column.forEach((name, index) => {
            positions[name] = {
              x: p.width * (0.14 + (maxDepth ? d / maxDepth : 0) * 0.72),
              y: p.height * (column.length === 1 ? 0.46 : 0.24 + index / (column.length - 1) * 0.46),
            };
          });
        });
        return positions;
      }

      function drawTree(primitive) {
        const positions = treeLayout(primitive.nodes, primitive.edges);
        function edgeLine(from, to, style, options) {
          const a = positions[from];
          const b = positions[to];
          if (!a || !b) return;
          const settings = options || {};
          const heading = Math.atan2(b.y - a.y, b.x - a.x);
          const start = { x: a.x + Math.cos(heading) * 44, y: a.y + Math.sin(heading) * 44 };
          const end = { x: b.x - Math.cos(heading) * 44, y: b.y - Math.sin(heading) * 44 };
          const offset = settings.offset || 0;
          const ox = -Math.sin(heading) * offset;
          const oy = Math.cos(heading) * offset;
          p.push();
          p.stroke.apply(p, color(style));
          p.strokeWeight(settings.weight || 2);
          setDash(Boolean(settings.dashed));
          p.line(start.x + ox, start.y + oy, end.x + ox, end.y + oy);
          setDash(false);
          p.pop();
          arrowHead({ x: end.x + ox, y: end.y + oy }, heading, style, 255, 8);
          if (settings.text) drawText(settings.text, (start.x + end.x) / 2 + ox + 4, (start.y + end.y) / 2 + oy - 4, style, 10);
        }
        primitive.edges.forEach((edge) => edgeLine(edge.parent, edge.child, edge.style || "muted", { dashed: edge.dashed }));
        primitive.steps.forEach((step, index) => edgeLine(step.from, step.to, step.style, { dashed: step.dashed, weight: 3, offset: step.dashed ? -9 : 9, text: step.inverse ? "inverse" : "" }));
        primitive.nodes.forEach((node) => {
          const at = positions[node.id];
          const highlighted = node.style && node.style !== "muted";
          p.push();
          p.stroke.apply(p, color(highlighted ? node.style : "gridStrong"));
          p.strokeWeight(highlighted ? 2 : 1);
          p.fill(highlighted ? 24 : 15, highlighted ? 26 : 20, highlighted ? 30 : 30);
          p.rect(at.x - 42, at.y - 18, 84, 36, 8);
          if (node.expected) {
            p.noFill();
            p.stroke.apply(p, color("expected"));
            setDash(true);
            p.rect(at.x - 47, at.y - 23, 94, 46, 10);
            setDash(false);
          }
          p.noStroke();
          p.fill.apply(p, color(highlighted ? "text" : "muted"));
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(11);
          p.text(node.id, at.x, at.y);
          p.textAlign(p.LEFT, p.BASELINE);
          p.pop();
        });
        if (primitive.caption) drawText(primitive.caption, 18, p.height - 16, "muted", 10);
      }

      function project3D(value) {
        const scale = Math.min(p.width, p.height) / 7;
        return {
          x: p.width * 0.5 + (value.x - value.y) * scale * 0.75,
          y: p.height * 0.5 - value.z * scale + (value.x + value.y) * scale * 0.34,
        };
      }

      function draw3DLine(from, to, style, options) {
        const settings = options || {};
        const a = project3D(from);
        const b = project3D(to);
        p.push();
        p.stroke.apply(p, color(style, settings.alpha));
        p.strokeWeight(settings.weight || 2.5);
        setDash(Boolean(settings.dashed));
        p.line(a.x, a.y, b.x, b.y);
        setDash(false);
        p.pop();
        arrowHead(b, Math.atan2(b.y - a.y, b.x - a.x), style, settings.alpha, 8);
        return b;
      }

      function drawAxes3d(primitive) {
        const origin = primitive.origin;
        const alpha = primitive.style === "muted" ? 110 : 255;
        const length = primitive.size || 1.2;
        ["x", "y", "z"].forEach((axis) => {
          const basis = primitive.basis[axis];
          draw3DLine(origin, { x: origin.x + basis.x * length, y: origin.y + basis.y * length, z: origin.z + basis.z * length }, axis, { alpha, dashed: primitive.dashed });
        });
        const at = project3D(origin);
        if (primitive.label) drawText(primitive.label, at.x + 8, at.y + 16, primitive.style);
      }

      function drawArrow3d(primitive) {
        const end = draw3DLine(primitive.from, primitive.to, primitive.style, { dashed: primitive.dashed, weight: 3 });
        if (primitive.label) drawText(primitive.label, end.x + 8, end.y - 8, primitive.style);
      }

      function drawPrimitive(primitive) {
        switch (primitive.kind) {
          case "frame": return drawFrame(primitive);
          case "point": return drawPoint(primitive);
          case "arrow": return drawArrow(primitive);
          case "arc": return drawArc(primitive);
          case "label": return drawLabel(primitive);
          case "glyph": return drawGlyph(primitive);
          case "lane": return drawLane(primitive);
          case "marker": return drawMarker(primitive);
          case "shade": return drawShade(primitive);
          case "tree": return drawTree(primitive);
          case "axes3d": return drawAxes3d(primitive);
          case "arrow3d": return drawArrow3d(primitive);
          default: return undefined;
        }
      }

      function drawGrips() {
        state.grips.forEach((grip) => {
          const at = toScreen(grip.at);
          const active = activeGrip && activeGrip.handleId === grip.handleId && activeGrip.grip === grip.grip;
          const hovered = hoverGrip && hoverGrip.handleId === grip.handleId && hoverGrip.grip === grip.grip;
          p.push();
          p.noFill();
          p.stroke.apply(p, color("input", active ? 255 : hovered ? 200 : 110));
          p.strokeWeight(active ? 2.5 : 1.5);
          p.circle(at.x, at.y, grip.grip === "origin" ? 22 : 16);
          p.pop();
        });
      }

      function gripAt(x, y) {
        const world = toWorld(x, y);
        let best = null;
        state.grips.forEach((grip) => {
          const distance = Math.hypot(grip.at.x - world.x, grip.at.y - world.y);
          if (distance <= Math.max(grip.radius, 0.3) && (!best || distance < best.distance)) best = { grip, distance };
        });
        return best ? best.grip : null;
      }

      function insideCanvas() {
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }

      p.setup = function setup() {
        const size = canvasSize();
        p.createCanvas(size.width, size.height).parent(host);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.textFont("ui-monospace, Consolas, monospace");
        if (typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver(() => { const next = canvasSize(); p.resizeCanvas(next.width, next.height); });
          observer.observe(host);
        }
      };

      p.draw = function draw() {
        p.background(8, 12, 18);
        drawGrid();
        if (!state.primitives.length) drawText("Choose a puzzle to begin.", 18, 28, "muted");
        const primitives = state.primitives.slice();
        primitives.filter((item) => item.kind === "shade").forEach(drawPrimitive);
        primitives.filter((item) => item.kind !== "shade" && item.kind !== "label").forEach(drawPrimitive);
        drawGrips();
        primitives.filter((item) => item.kind === "label").forEach(drawPrimitive);
        if (state.running) {
          p.noStroke();
          p.fill(7, 9, 14, 150);
          p.rect(0, 0, p.width, p.height);
          p.fill.apply(p, color("accent"));
          p.circle(p.width / 2, p.height / 2, 10 + Math.sin(p.frameCount * 0.15) * 4);
          drawText("checking every case…", p.width / 2 - 62, p.height / 2 + 30, "text");
        }
        const elapsed = performance.now() - celebrationStarted;
        if (celebrationStarted && elapsed < 1000) {
          const amount = elapsed / 1000;
          p.noFill();
          p.stroke.apply(p, color("match", 255 * (1 - amount)));
          p.strokeWeight(3);
          p.circle(p.width / 2, p.height / 2, 40 + amount * Math.min(p.width, p.height) * 0.7);
        }
      };

      p.mouseMoved = function mouseMoved() {
        hoverGrip = insideCanvas() ? gripAt(p.mouseX, p.mouseY) : null;
        host.style.cursor = hoverGrip ? "grab" : "default";
      };

      p.mousePressed = function mousePressed() {
        if (!insideCanvas()) return true;
        activeGrip = gripAt(p.mouseX, p.mouseY);
        if (activeGrip) { host.style.cursor = "grabbing"; return false; }
        return true;
      };

      p.mouseDragged = function mouseDragged() {
        if (!activeGrip) return true;
        if (typeof handlers.onDrag === "function") handlers.onDrag(activeGrip, toWorld(p.mouseX, p.mouseY));
        return false;
      };

      p.mouseReleased = function mouseReleased() {
        if (activeGrip && typeof handlers.onDragEnd === "function") handlers.onDragEnd(activeGrip);
        activeGrip = null;
        host.style.cursor = hoverGrip ? "grab" : "default";
      };

      p.touchStarted = p.mousePressed;
      p.touchMoved = p.mouseDragged;
      p.touchEnded = p.mouseReleased;
    }, host);

    return {
      setState(next) { state = { ...state, ...next }; },
      celebrate() { celebrationStarted = performance.now(); },
      remove() { instance.remove(); },
    };
  }

  root.createPuzzleSketch = createPuzzleSketch;
  if (typeof module !== "undefined" && module.exports) module.exports = { createPuzzleSketch };
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 2: Syntax-check the file in Node**

Run: `node --check p5sim/tf2_walkthrough/puzzle-sketch.js`

Expected: no output (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-sketch.js
git commit -m "feat: render scene primitives and draggable grips in puzzle sketch

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 10: Lab shell HTML and CSS

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.html`
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.css`

- [ ] **Step 1: Update the HTML shell**

In `puzzle-lab.html`:

1. Replace the curriculum card heading block

```html
            <div>
              <p class="card-kicker">Dependency ladder</p>
              <h2 id="curriculumHeading">30 small builds</h2>
            </div>
            <span id="puzzleCounter" class="counter-pill">01 / 30</span>
```

with

```html
            <div>
              <p class="card-kicker">Two tracks, one ladder</p>
              <h2 id="curriculumHeading">27 geometry builds</h2>
            </div>
            <span id="puzzleCounter" class="counter-pill">01 / 27</span>
```

2. Replace the puzzle brief copy block

```html
              <p id="puzzleStage" class="card-kicker">Coordinate Bricks</p>
              <h2 id="puzzleTitle">Place a Point</h2>
              <p id="puzzleGoal" class="puzzle-goal"></p>
```

with

```html
              <p id="puzzleStage" class="card-kicker">Rotation Bricks</p>
              <h2 id="puzzleTitle">Point Along a Yaw</h2>
              <p id="puzzleGoal" class="puzzle-goal"></p>
              <p id="puzzleConcept" class="puzzle-concept"></p>
```

3. Replace the visualizer card body

```html
            <div class="lab-card-heading">
              <div>
                <p class="card-kicker">Geometric debugger</p>
                <h2 id="visualizerHeading">What your code means</h2>
              </div>
              <span id="runState" class="run-state">Ready</span>
            </div>
            <div id="canvasHost" class="puzzle-canvas-host" aria-label="p5.js visualization of the current puzzle"></div>
            <div class="visual-legend">
              <span><i class="expected-swatch"></i>Expected</span>
              <span><i class="actual-swatch"></i>Your result</span>
              <span><i class="match-swatch"></i>Match</span>
            </div>
```

with

```html
            <div class="lab-card-heading">
              <div>
                <p class="card-kicker">Live geometry</p>
                <h2 id="visualizerHeading">Drag the inputs, watch your function</h2>
              </div>
              <span id="runState" class="run-state">Ready</span>
            </div>
            <div id="canvasHost" class="puzzle-canvas-host" aria-label="p5.js visualization of the current puzzle"></div>
            <div id="selectorStrip" class="selector-strip" hidden></div>
            <div class="visual-legend">
              <span><i class="input-swatch"></i>Draggable input</span>
              <span><i class="expected-swatch"></i>Expected</span>
              <span><i class="actual-swatch"></i>Yours</span>
              <span><i class="match-swatch"></i>Match</span>
            </div>
```

4. Delete the whole `<section id="piecesCard" ...>…</section>` block.

5. Change the editor toolbar hint `Ctrl+Enter run · Ctrl+Shift+Enter check` to `Ctrl+Enter run now · Ctrl+Shift+Enter check`.

6. Replace the default feedback text `Run the visible example whenever you want. Check when the geometry looks right.` with `Drag the scene or edit the code. The canvas runs your function as you go. Check when it matches.`

7. Replace the footer's initial next label `Build a Vector` with `Vector to Heading`.

8. Replace the script block at the end with:

```html
    <script src="../libraries/p5.min.js"></script>
    <script src="puzzles.js"></script>
    <script src="puzzle-runtime.js"></script>
    <script src="puzzle-engine.js"></script>
    <script src="puzzle-scenes.js"></script>
    <script src="puzzle-sketch.js"></script>
    <script src="puzzle-lab.js"></script>
```

- [ ] **Step 2: Update the CSS**

In `puzzle-lab.css`:

1. In the shared card selector list near the top, remove the line `.pieces-card,` (the block that starts with `.curriculum-card,`). In the padding rule `.visualizer-card, .component-card, .pieces-card, .feedback-card { padding: 15px; }` remove `.pieces-card,` as well.

2. Replace the rules `.component-shelf, .code-pieces { … }` and `.component-chip, .piece-button, .empty-shelf { … }` with:

```css
.component-shelf {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 34px;
  margin-top: 11px;
}

.component-chip,
.empty-shelf {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 9px;
  background: #0a0f17;
  color: var(--muted);
  font: 650 0.7rem/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
}
```

3. Delete the rules `.drag-copy { … }`, `.piece-button { … }`, and `.piece-button:hover { … }`.

4. Append the following block before the first `@media` rule:

```css
.puzzle-concept {
  max-width: 72ch;
  margin: 0 0 12px;
  color: #bdd3ff;
  font-size: 0.8rem;
  line-height: 1.5;
}

.input-swatch {
  width: 15px;
  height: 2px;
  background: var(--accent);
}

.selector-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.selector-field {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font: 650 0.7rem/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
}

.selector-field select {
  min-height: 30px;
  border: 1px solid var(--border-bright);
  border-radius: 7px;
  padding: 4px 8px;
  background: var(--surface-raised);
  color: var(--text);
  font: inherit;
}

.track-block + .track-block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-bright);
}

.track-name {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 10px;
  color: var(--text);
  font: 800 0.74rem/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
  letter-spacing: 0.04em;
}

.track-name span:last-child {
  color: var(--accent);
}

.track-block.is-locked .track-name span:last-child {
  color: var(--faint);
}

.track-note {
  margin: 0 0 10px;
  color: var(--faint);
  font-size: 0.7rem;
  line-height: 1.45;
}

.stage-placeholder {
  margin: 0;
  padding: 5px 7px;
  color: #525d6e;
  font-size: 0.72rem;
}

.track-block.is-locked .stage-placeholder {
  color: #3f4856;
}
```

- [ ] **Step 3: Confirm the page still parses**

Serve `p5sim` and open `http://127.0.0.1:4173/tf2_walkthrough/puzzle-lab.html`. The page will show a catalog error or a blank canvas until Task 11 replaces the controller; confirm only that the layout renders without the code-pieces card and that the browser console shows no CSS parse warnings.

- [ ] **Step 4: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-lab.html p5sim/tf2_walkthrough/puzzle-lab.css
git commit -m "feat: update puzzle lab shell for live scenes and tracks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 11: Lab controller with live evaluation, selectors, and track map

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzle-lab.js` (full replacement)

- [ ] **Step 1: Replace the controller**

Replace the entire content of `p5sim/tf2_walkthrough/puzzle-lab.js` with:

```js
(function runPuzzleLab(root) {
  "use strict";

  const puzzles = root.TF2_PUZZLES || [];
  const stages = root.TF2_PUZZLE_STAGES || [];
  const tracks = root.TF2_PUZZLE_TRACKS || [];
  const scenes = root.PuzzleScenes;
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const EDIT_DEBOUNCE_MS = 150;
  const READY_MESSAGE = "Drag the scene or edit the code. The canvas runs your function as you go. Check when it matches.";

  let progress = root.loadProgress(root.localStorage);
  let currentIndex = 0;
  let busy = false;
  let sketch = null;
  let session = null;
  let values = {};
  let live = null;
  let editTimer = 0;

  const dom = {};
  const ids = [
    "saveStatus", "stageMap", "puzzleCounter", "puzzleNumber", "puzzleStage", "puzzleTitle",
    "puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink", "canvasHost", "selectorStrip", "runState",
    "componentShelf", "componentCount", "codeEditor", "runButton", "checkButton", "resetCodeButton",
    "hintButton", "hintPanel", "feedbackPanel", "caseComparison", "previousPuzzle", "previousPuzzleLabel",
    "nextPuzzle", "nextPuzzleLabel", "resetProgress", "solvedCount", "progressFill", "lineStatus",
  ];

  function twoDigits(number) { return String(number).padStart(2, "0"); }
  function currentPuzzle() { return puzzles[currentIndex]; }
  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }

  function save() {
    const saved = root.saveProgress(root.localStorage, progress);
    dom.saveStatus.textContent = saved ? "Saved locally" : "Storage unavailable";
    dom.saveStatus.classList.toggle("is-saving", !saved);
  }

  function storeDraft() {
    const puzzle = currentPuzzle();
    if (!puzzle) return;
    progress.drafts[puzzle.id] = dom.codeEditor.value;
    progress.currentPuzzleId = puzzle.id;
    save();
  }

  function setFeedback(message, kind) {
    dom.feedbackPanel.textContent = message;
    dom.feedbackPanel.classList.toggle("is-success", kind === "success");
    dom.feedbackPanel.classList.toggle("is-error", kind === "error");
    dom.runState.textContent = busy ? "Checking" : kind === "success" ? "Matched" : kind === "error" ? "Needs work" : "Live";
    dom.runState.classList.toggle("is-running", busy);
    dom.runState.classList.toggle("is-success", kind === "success" && !busy);
    dom.runState.classList.toggle("is-error", kind === "error" && !busy);
  }

  function renderComparison(result) {
    if (!result || !result.testCase || result.pass) {
      dom.caseComparison.hidden = true;
      dom.caseComparison.innerHTML = "";
      return;
    }
    const rows = [["Case", result.testCase.label], ["Input", result.testCase.args], ["Expected", result.testCase.expected], ["Yours", result.actual === undefined ? null : result.actual]];
    dom.caseComparison.innerHTML = rows.map((row) => (
      "<div class=\"case-row\"><span>" + row[0] + "</span><code>" + escapeHtml(typeof row[1] === "string" ? row[1] : JSON.stringify(row[1], null, 2)) + "</code></div>"
    )).join("");
    dom.caseComparison.hidden = false;
  }

  function stageProgress(stage) {
    const members = puzzles.filter((puzzle) => puzzle.stage === stage.id);
    return members.filter((puzzle) => progress.solved[puzzle.id]).length + "/" + members.length;
  }

  function renderMap() {
    dom.stageMap.innerHTML = "";
    const states = root.trackStates(tracks, progress);
    tracks.forEach((track) => {
      const state = states.find((entry) => entry.id === track.id).state;
      const block = document.createElement("section");
      block.className = "track-block";
      if (state === "locked") block.classList.add("is-locked");
      const members = puzzles.filter((puzzle) => puzzle.track === track.id);
      const solved = members.filter((puzzle) => progress.solved[puzzle.id]).length;
      const heading = document.createElement("h3");
      heading.className = "track-name";
      heading.innerHTML = "<span>" + escapeHtml(track.title) + "</span><span>" + (members.length ? solved + "/" + members.length : state) + "</span>";
      block.append(heading);
      if (track.note) {
        const note = document.createElement("p");
        note.className = "track-note";
        note.textContent = state === "locked" ? track.note : "Available. Puzzles arrive with the next track.";
        block.append(note);
      }
      track.stages.forEach((stage) => {
        const section = document.createElement("section");
        section.className = "stage-group";
        const stageHeading = document.createElement("h3");
        stageHeading.className = "stage-name";
        const stageMembers = puzzles.filter((puzzle) => puzzle.stage === stage.id);
        stageHeading.innerHTML = "<span>" + escapeHtml(stage.title) + "</span><span>" + (stageMembers.length ? stageProgress(stage) : "—") + "</span>";
        section.append(stageHeading);
        if (!stageMembers.length) {
          const placeholder = document.createElement("p");
          placeholder.className = "stage-placeholder";
          placeholder.textContent = stage.subtitle;
          section.append(placeholder);
        } else {
          const list = document.createElement("div");
          list.className = "puzzle-list";
          stageMembers.forEach((puzzle) => {
            const index = puzzle.number - 1;
            const solvedPuzzle = Boolean(progress.solved[puzzle.id]);
            const locked = index > progress.highestUnlocked;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "puzzle-map-button";
            if (solvedPuzzle) button.classList.add("is-solved");
            if (index === currentIndex) button.classList.add("is-current");
            button.disabled = locked;
            button.setAttribute("aria-current", index === currentIndex ? "step" : "false");
            button.innerHTML =
              "<span class=\"map-number\">" + twoDigits(puzzle.number) + "</span>" +
              "<span class=\"map-title\">" + escapeHtml(puzzle.title) + "</span>" +
              "<span class=\"map-state\" aria-hidden=\"true\">" + (locked ? "·" : solvedPuzzle ? "✓" : index === currentIndex ? "◆" : "○") + "</span>";
            button.addEventListener("click", () => navigate(index));
            list.append(button);
          });
          section.append(list);
        }
        block.append(section);
      });
      dom.stageMap.append(block);
    });
  }

  function renderComponents() {
    const puzzle = currentPuzzle();
    const requiredIds = new Set(root.collectDependencyIds(puzzles, puzzle));
    const solvedPuzzles = puzzles.filter((entry) => progress.solved[entry.id]);
    dom.componentShelf.innerHTML = "";
    if (!solvedPuzzles.length) {
      dom.componentShelf.innerHTML = "<div class=\"empty-shelf\">Solve a component and it will live here.</div>";
    } else {
      solvedPuzzles.forEach((entry) => {
        const chip = document.createElement("span");
        chip.className = "component-chip";
        if (requiredIds.has(entry.id)) chip.classList.add("is-required");
        chip.textContent = entry.functionName + "()";
        chip.title = (requiredIds.has(entry.id) ? "Used by this puzzle · " : "") + entry.signature;
        dom.componentShelf.append(chip);
      });
    }
    const missing = Array.from(requiredIds).filter((id) => !progress.solved[id]);
    dom.componentCount.textContent = missing.length ? missing.length + " dependency missing" : solvedPuzzles.length + " ready";
  }

  function renderHints() {
    const puzzle = currentPuzzle();
    const level = Math.max(0, Math.min(3, progress.hints[puzzle.id] || 0));
    dom.hintPanel.innerHTML = puzzle.hints.slice(0, level).map((hint, index) => (
      "<div class=\"hint-level\"><strong>Hint " + (index + 1) + "</strong> · " + escapeHtml(hint) + "</div>"
    )).join("");
    dom.hintPanel.hidden = level === 0;
    dom.hintButton.textContent = level >= 3 ? "All hints open" : "Hint " + (level + 1) + " / 3";
    dom.hintButton.disabled = level >= 3;
  }

  function renderFooter() {
    const solved = Object.keys(progress.solved).length;
    const previous = puzzles[currentIndex - 1];
    const next = puzzles[currentIndex + 1];
    dom.previousPuzzle.disabled = !previous;
    dom.previousPuzzleLabel.textContent = previous ? previous.title : "Start";
    dom.nextPuzzle.disabled = !next || currentIndex + 1 > progress.highestUnlocked;
    dom.nextPuzzleLabel.textContent = next ? next.title : "Track complete";
    dom.solvedCount.textContent = solved + " solved";
    dom.progressFill.style.width = (solved / puzzles.length * 100) + "%";
  }

  function renderSelectors() {
    const puzzle = currentPuzzle();
    dom.selectorStrip.innerHTML = "";
    const selectors = puzzle.scene.handles.filter((handle) => handle.type === "selector");
    dom.selectorStrip.hidden = selectors.length === 0;
    selectors.forEach((handle) => {
      const field = document.createElement("label");
      field.className = "selector-field";
      const caption = document.createElement("span");
      caption.textContent = handle.label;
      const select = document.createElement("select");
      handle.options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        item.selected = values[handle.id] === option;
        select.append(item);
      });
      select.addEventListener("change", () => { values[handle.id] = select.value; renderScene(); requestLive(); });
      field.append(caption, select);
      dom.selectorStrip.append(field);
    });
  }

  function renderScene() {
    const puzzle = currentPuzzle();
    let args = [];
    try { args = scenes.toArgs(puzzle, values); } catch (error) { args = []; }
    const context = {
      puzzle, values, args,
      expected: live ? live.expected : null,
      actual: live ? live.actual : null,
      comparison: live ? live.comparison : null,
      diagnosis: live ? live.diagnosis : null,
      error: live && live.error ? live.error : null,
    };
    let primitives;
    try { primitives = scenes.layers(context); } catch (error) { primitives = [{ kind: "label", text: "Scene error: " + error.message, style: "actual", row: 0 }]; }
    sketch.setState({ values, grips: scenes.grips(puzzle, values), primitives });
  }

  function renderPuzzle(options) {
    const settings = options || {};
    const puzzle = currentPuzzle();
    const stage = stageById.get(puzzle.stage);
    dom.puzzleCounter.textContent = twoDigits(puzzle.number) + " / " + puzzles.length;
    dom.puzzleNumber.textContent = twoDigits(puzzle.number);
    dom.puzzleStage.textContent = stage.title;
    dom.puzzleTitle.textContent = puzzle.title;
    dom.puzzleGoal.textContent = puzzle.goal;
    dom.puzzleConcept.textContent = puzzle.concept;
    dom.puzzleSignature.textContent = puzzle.signature;
    dom.walkthroughLink.href = "index.html#" + puzzle.walkthroughChapter;
    dom.walkthroughLink.textContent = "Review " + puzzle.walkthroughChapter.replaceAll("-", " ") + " ↗";
    if (!settings.keepEditor) {
      dom.codeEditor.value = progress.drafts[puzzle.id] || progress.sources[puzzle.id] || puzzle.starterSource;
      const placeholderStart = dom.codeEditor.value.indexOf("return null;");
      if (placeholderStart >= 0) dom.codeEditor.setSelectionRange(placeholderStart, placeholderStart + "return null;".length);
    }
    document.title = twoDigits(puzzle.number) + " · " + puzzle.title + " — TF2 Puzzle Lab";
    values = scenes.initialValues(puzzle);
    live = null;
    renderMap();
    renderComponents();
    renderHints();
    renderFooter();
    renderSelectors();
    updateCursorStatus();
    setFeedback(progress.solved[puzzle.id] ? "Solved. Improve this component or continue building." : READY_MESSAGE, progress.solved[puzzle.id] ? "success" : "ready");
    renderComparison(null);
    renderScene();
    requestLive();
  }

  function navigate(index, options) {
    if (index < 0 || index >= puzzles.length || index > progress.highestUnlocked) return;
    currentIndex = index;
    progress.currentPuzzleId = currentPuzzle().id;
    save();
    const hash = "#" + currentPuzzle().id;
    if (root.location.hash !== hash) history.replaceState(null, "", hash);
    renderPuzzle(options);
    root.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initialIndex() {
    const hashId = root.location.hash.replace(/^#/, "");
    const hashIndex = puzzles.findIndex((puzzle) => puzzle.id === hashId);
    if (hashIndex >= 0 && hashIndex <= progress.highestUnlocked) return hashIndex;
    const savedIndex = puzzles.findIndex((puzzle) => puzzle.id === progress.currentPuzzleId);
    if (savedIndex >= 0 && savedIndex <= progress.highestUnlocked) return savedIndex;
    return Math.min(progress.highestUnlocked, puzzles.length - 1);
  }

  function updateCursorStatus() {
    const before = dom.codeEditor.value.slice(0, dom.codeEditor.selectionStart);
    const lines = before.split("\n");
    dom.lineStatus.textContent = "Line " + lines.length + ", column " + (lines[lines.length - 1].length + 1);
  }

  function insertText(text) {
    const editor = dom.codeEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + text + editor.value.slice(end);
    editor.setSelectionRange(start + text.length, start + text.length);
    scheduleLiveFromEdit();
  }

  function errorResult(error) {
    const kind = (error && error.kind) || "worker";
    const message = (error && error.message) || "The code runner failed.";
    return { kind, message, expected: null, actual: null, comparison: null, diagnosis: null, error: { kind, message } };
  }

  function applyLiveResult(result) {
    live = result;
    if (result.kind === "live-match") setFeedback(result.message, "success");
    else if (result.kind === "live-mismatch") setFeedback(result.message, "error");
    else if (result.kind === "missing-dependency") setFeedback(result.message + " Open it from the map and Check it again.", "error");
    else if (result.kind === "timeout") setFeedback(result.message + " Look for a loop that never ends.", "error");
    else if (result.kind === "syntax") setFeedback("Syntax error: " + result.message, "error");
    else if (result.kind === "runtime") setFeedback("Your function threw: " + result.message, "error");
    else setFeedback(result.message, "error");
    renderScene();
  }

  function requestLive() {
    if (busy || !session) return;
    const puzzle = currentPuzzle();
    let program;
    try {
      program = root.buildProgram(puzzles, progress, puzzle, dom.codeEditor.value);
    } catch (error) {
      applyLiveResult(errorResult(error));
      return;
    }
    let args;
    try { args = scenes.toArgs(puzzle, values); } catch (error) { applyLiveResult(errorResult({ kind: "worker", message: error.message })); return; }
    session.evaluate(program, args).then((response) => {
      if (currentPuzzle() !== puzzle) return;
      applyLiveResult(root.evaluateLive(puzzle, response));
    }).catch((error) => {
      if (!error || error.kind === "superseded" || error.kind === "disposed") return;
      if (currentPuzzle() !== puzzle) return;
      applyLiveResult(errorResult(error));
    });
  }

  function scheduleLiveFromEdit() {
    storeDraft();
    updateCursorStatus();
    clearTimeout(editTimer);
    editTimer = setTimeout(requestLive, EDIT_DEBOUNCE_MS);
  }

  async function check() {
    if (busy) return;
    const puzzle = currentPuzzle();
    let program;
    try {
      program = root.buildProgram(puzzles, progress, puzzle, dom.codeEditor.value);
    } catch (error) {
      applyLiveResult(errorResult(error));
      return;
    }
    busy = true;
    dom.runButton.disabled = true;
    dom.checkButton.disabled = true;
    setFeedback("Checking every case…", "ready");
    sketch.setState({ running: true });
    storeDraft();
    const cases = puzzle.publicCases.concat(puzzle.checkCases);
    let response;
    try {
      response = await session.check(program, cases);
    } catch (error) {
      response = { ok: false, error };
    }
    const result = root.evaluateCheck(puzzle, response);
    busy = false;
    dom.runButton.disabled = false;
    dom.checkButton.disabled = false;
    sketch.setState({ running: false });
    setFeedback(result.message, result.pass ? "success" : "error");
    renderComparison(result);
    if (result.pass) {
      const unlockedTrack2Before = root.trackStates(tracks, progress)[1].state;
      progress = root.completePuzzle(progress, puzzle, dom.codeEditor.value, new Date().toISOString(), puzzles);
      save();
      sketch.celebrate();
      renderMap();
      renderComponents();
      renderFooter();
      if (unlockedTrack2Before === "locked" && root.trackStates(tracks, progress)[1].state === "available") {
        setFeedback(result.message + " Track 2 · Pose Correction is now available; its puzzles arrive with the next track.", "success");
      }
    }
    requestLive();
  }

  function revealHint() {
    const puzzle = currentPuzzle();
    progress.hints[puzzle.id] = Math.min(3, (progress.hints[puzzle.id] || 0) + 1);
    save();
    renderHints();
  }

  function resetCode() {
    const puzzle = currentPuzzle();
    if (progress.solved[puzzle.id]) {
      const dependentIds = root.dependentPuzzleIds(puzzles, puzzle.id).filter((id) => progress.solved[id]);
      const names = dependentIds.map((id) => puzzles.find((entry) => entry.id === id).title);
      const suffix = names.length ? "\n\nThis also invalidates:\n• " + names.join("\n• ") : "";
      if (!root.confirm("Reset " + puzzle.title + "?" + suffix)) return;
      progress = root.resetPuzzle(progress, puzzles, puzzle.id).progress;
    } else if (!root.confirm("Restore the starter code for this puzzle?")) {
      return;
    }
    progress.drafts[puzzle.id] = puzzle.starterSource;
    progress.currentPuzzleId = puzzle.id;
    save();
    renderPuzzle();
  }

  function resetAllProgress() {
    if (!root.confirm("Reset all " + puzzles.length + " puzzles, saved solutions, and hints? The walkthrough is not affected.")) return;
    root.localStorage.removeItem(root.STORAGE_KEY);
    progress = root.createProgress();
    currentIndex = 0;
    history.replaceState(null, "", "#" + puzzles[0].id);
    renderPuzzle();
  }

  function bindEvents() {
    dom.codeEditor.addEventListener("input", scheduleLiveFromEdit);
    dom.codeEditor.addEventListener("click", updateCursorStatus);
    dom.codeEditor.addEventListener("keyup", updateCursorStatus);
    dom.codeEditor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") { event.preventDefault(); insertText("  "); }
    });
    dom.runButton.addEventListener("click", () => { clearTimeout(editTimer); requestLive(); });
    dom.checkButton.addEventListener("click", check);
    dom.hintButton.addEventListener("click", revealHint);
    dom.resetCodeButton.addEventListener("click", resetCode);
    dom.resetProgress.addEventListener("click", resetAllProgress);
    dom.previousPuzzle.addEventListener("click", () => navigate(currentIndex - 1));
    dom.nextPuzzle.addEventListener("click", () => navigate(currentIndex + 1));

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "Enter") { event.preventDefault(); check(); }
      else if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); clearTimeout(editTimer); requestLive(); }
      else if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); navigate(currentIndex - 1); }
      else if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); navigate(currentIndex + 1); }
      else if (event.key === "Escape") { renderComparison(null); dom.hintPanel.hidden = true; }
    });

    root.addEventListener("hashchange", () => {
      const id = root.location.hash.replace(/^#/, "");
      const index = puzzles.findIndex((puzzle) => puzzle.id === id);
      if (index >= 0 && index <= progress.highestUnlocked) navigate(index);
      else if (index > progress.highestUnlocked) setFeedback("That build is still locked. Complete the preceding components first.", "error");
    });
  }

  function initialize() {
    ids.forEach((id) => { dom[id] = document.getElementById(id); });
    const catalogStatus = root.validateCatalog(puzzles, scenes ? scenes.SCENE_KINDS : null);
    if (!catalogStatus.valid || puzzles.length !== 27) {
      dom.feedbackPanel.textContent = catalogStatus.valid ? "The lab expected 27 puzzles." : catalogStatus.message;
      dom.feedbackPanel.classList.add("is-error");
      return;
    }
    if (typeof Worker === "undefined") {
      dom.feedbackPanel.textContent = "Web Workers are unavailable. Open the lab through the local Python server.";
      dom.feedbackPanel.classList.add("is-error");
      return;
    }
    session = root.createLiveSession({ workerUrl: "puzzle-worker.js" });
    currentIndex = initialIndex();
    sketch = root.createPuzzleSketch(dom.canvasHost, {
      onDrag(grip, worldPoint) {
        values = scenes.dragHandle(currentPuzzle(), values, grip, worldPoint);
        renderScene();
        requestLive();
      },
    });
    bindEvents();
    history.replaceState(null, "", "#" + currentPuzzle().id);
    renderPuzzle();
  }

  root.addEventListener("DOMContentLoaded", initialize);
})(window);
```

- [ ] **Step 2: Syntax-check the file**

Run: `node --check p5sim/tf2_walkthrough/puzzle-lab.js`

Expected: no output.

- [ ] **Step 3: Verify the live loop in the browser**

Serve `p5sim` (`cd p5sim; python -m http.server 4173 --bind 127.0.0.1`) and open `http://127.0.0.1:4173/tf2_walkthrough/puzzle-lab.html`. Confirm each item; note any failure and fix it before committing.

1. Puzzle 01 loads with a dial, a yellow input arrow, and a dashed blue expected arrow. The starter returns `null`, which is a valid value, so the feedback panel shows the live mismatch `result has the wrong shape` and no red arrow.
2. Drag the dial knob: the input arrow follows and the expected arrow updates without pressing anything.
3. Type `return { x: Math.sin(yaw), y: Math.cos(yaw) };` — within a second the panel shows `Mirrored across the diagonal…` and the red arrow appears mirrored with a dashed error arrow.
4. Fix it to `Math.cos`/`Math.sin` — the panel shows `Matches the reference for this input…`, the arrow turns green.
5. Press Check — the panel shows `All behaviors match. Component unlocked.`, the map marks 01 solved and 02 unlocked, the shelf shows `headingVector()`.
6. Type `while (true) {}` inside the body — after about a quarter second the panel reports the timeout message and the page stays responsive; delete the loop and the scene recovers.
7. Alt+Right stops at the first locked puzzle. To inspect later scenes without solving everything, run this in the console and reload:

```js
localStorage.setItem("tf2-puzzle-lab:v2", JSON.stringify({ ...JSON.parse(localStorage.getItem("tf2-puzzle-lab:v2")), highestUnlocked: 26 }));
```

   Puzzle 06 then shows a draggable source frame with an origin grip and a heading grip, and the point grip stays attached to the frame while the frame is dragged. Puzzles that depend on unsolved components report `Revisit … before using …()` until those components are checked; that is expected.
8. Puzzle 17 shows the target/source selectors under the canvas; changing them recomputes the scene.
9. Puzzle 18: with a correct solution pasted from the hint, drag `odom` and `base_link`: the green point stays on the landmark.
10. Puzzle 21 and 23 show timeline lanes with a draggable cursor; puzzle 24 shows sliders and RGB axes.
11. Track 2 appears at the bottom of the map as locked with four placeholder stages.
12. The browser console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzle-lab.js
git commit -m "feat: wire live evaluation, selectors, and track map into puzzle lab

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```

---

### Task 12: Walkthrough links, test page, README, and final verification

**Files:**
- Modify: `p5sim/tf2_walkthrough/sketch.js:145-159`
- Modify: `p5sim/tf2_walkthrough/index.html:63`
- Modify: `p5sim/tf2_walkthrough/tests.html`
- Modify: `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Remap the walkthrough practice links**

In `sketch.js`, replace the `PRACTICE_PUZZLE_BY_CHAPTER` object with:

```js
  const PRACTICE_PUZZLE_BY_CHAPTER = {
    "matrix-stack": "transform-point",
    "data-types": "transform-vector",
    composition: "compose",
    tree: "store-edge",
    "mobile-chain": "lookup-transform",
    "frame-roles": "correction-from-pose",
    broadcasters: "sample-edge",
    lookup: "lookup-transform",
    "stamped-data": "transform-pose",
    "time-buffer": "interpolate-transform",
    "sensor-scenario": "laser-point-to-map",
    se3: "rotate-by-quaternion",
    sandbox: "stamped-lookup",
  };
```

In `index.html`, change `href="puzzle-lab.html#make-point"` to `href="puzzle-lab.html#heading-vector"`.

- [ ] **Step 2: Load the puzzle tests in the browser test page**

In `tests.html`:

1. Replace `<main id="results">…</main>` with:

```html
    <main>
      <section id="results">
        <h1>TF2 walkthrough model tests</h1>
        <p>Running tests…</p>
      </section>
      <section id="puzzleResults">
        <h1>TF2 puzzle lab tests</h1>
        <p>Running tests…</p>
      </section>
    </main>
```

2. Inside the inline `<script>`, after `window.renderTestResults = …;` add:

```js
      window.renderPuzzleTestResults = function renderPuzzleTestResults(result) {
        const host = document.querySelector("#puzzleResults");
        host.innerHTML = "<h1>TF2 puzzle lab tests</h1>";
        const summary = document.createElement("p");
        summary.className = "summary";
        summary.textContent = `${result.passed}/${result.total} puzzle tests passed`;
        host.append(summary);
        result.failures.forEach(({ name, error }) => {
          const item = document.createElement("div");
          item.className = "failure";
          item.textContent = `${name}: ${error.message}`;
          host.append(item);
        });
      };
```

3. Replace the script tags at the bottom with:

```html
    <script src="transform2d.js"></script>
    <script src="transform-tree.js"></script>
    <script src="transform3d.js"></script>
    <script src="chapters.js"></script>
    <script src="tests.js"></script>
    <script src="puzzles.js"></script>
    <script src="puzzle-runtime.js"></script>
    <script src="puzzle-worker.js"></script>
    <script src="puzzle-engine.js"></script>
    <script src="puzzle-scenes.js"></script>
    <script src="puzzle-tests.js"></script>
```

- [ ] **Step 3: Rewrite the Puzzle Lab section of the README**

In `README.md`, replace everything from `## Puzzle Lab` up to (not including) `## Learning Route` with:

```markdown
## Puzzle Lab

Open `puzzle-lab.html` from the walkthrough header. The lab is NANDgame-style: every puzzle is one small JavaScript function, and later puzzles reuse the functions you already solved.

Track 1 (TF2) contains 27 puzzles in seven stages:

1. Rotation bricks: headingVector, headingOf, wrapAngle, rotateVector, yawDelta.
2. Frames (SE(2)): transformPoint, transformVector, transformPose, compose, invert, relativeTransform.
3. Tree: storeEdge, ancestorChain, commonAncestor, directedPath, validateTree.
4. Lookup and robot frames: lookupTransform, laserPointToMap, correctionFromPose (the `map -> odom` hand-off).
5. Time: interpolateTransform, bracketSamples, latestCommonTime, sampleEdge.
6. SE(3): quaternionMultiply, rotateByQuaternion, composeSE3.
7. Capstone: lookupStampedTransform.

Track 2 (Pose Correction) is listed in the map and unlocks after the capstone. Its puzzles, built from the warehouse rack pipeline in `p5sim/navigation`, arrive with the next track.

Every puzzle has a live scene. Drag frame origins, rotation grips, points, dials, sliders, and timeline cursors; your function runs on every change and the canvas draws your result in red next to the dashed reference until they match and turn green. Known mistakes such as a mirrored rotation, a reversed composition, or translate-before-rotate are named in the feedback panel. `Run` re-evaluates the current input; `Check` runs the hidden cases and unlocks the next puzzle.

Learner code runs in a persistent Web Worker. A function that does not finish within 250 ms (750 ms for Check) is stopped and the worker restarts; the page never freezes. This is a reliability boundary, not a security sandbox.

Progress, drafts, hints, and solved component source are stored only in the browser under `tf2-puzzle-lab:v2`. Reset Code shows which dependent components would be invalidated. Reset all progress removes only this record.

Puzzle Lab keyboard controls:

- Ctrl+Enter: run now on the current inputs.
- Ctrl+Shift+Enter: check the full behavior.
- Alt+Left / Alt+Right: move between unlocked puzzles.
- Escape: dismiss transient detail.

```

Also replace the `## Model Checks` section with (the inner fence is a normal three-backtick `powershell` block in the README):

````markdown
## Model Checks

Run the dependency-free checks with:

```powershell
node p5sim/tf2_walkthrough/tests.js
node p5sim/tf2_walkthrough/puzzle-tests.js
```

The same checks can be viewed in a browser at `tests.html`.
````

- [ ] **Step 4: Run every check**

Run:

```powershell
node p5sim/tf2_walkthrough/tests.js
node p5sim/tf2_walkthrough/puzzle-tests.js
```

Expected: `21/21 tests passed` and `26/26 puzzle tests passed`.

Then open `http://127.0.0.1:4173/tf2_walkthrough/tests.html` and confirm both sections report all tests passed, and open `http://127.0.0.1:4173/tf2_walkthrough/` to confirm the header's Puzzle Lab button and each chapter's `Practice this concept` link open an unlocked or correctly locked puzzle without console errors.

- [ ] **Step 5: Final browser walkthrough**

With the server running, complete this checklist on `puzzle-lab.html`:

1. Fresh state (clear `localStorage`): puzzle 01 is current, 02 onward locked, Track 2 locked.
2. Solve 01 through 05 by writing the functions (hints level 3 gives the body); each Check unlocks the next puzzle and adds a chip.
3. In 06, drag the source frame and the point; the expected dot stays on the point's drawn position; a translate-then-rotate answer is diagnosed.
4. In 09 and 10 the ghost frames render; a reversed compose is diagnosed.
5. Reset Code on 04 lists 06, 07, 08, 09, 10, 11 as invalidated and, after confirming, 05 onward relock as expected.
6. Reload the page: the current puzzle, drafts, and solved state persist.
7. Narrow the window below 820 px: the map, canvas, and editor stack vertically and the selector strip wraps.
8. No console errors during the whole pass.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/sketch.js p5sim/tf2_walkthrough/index.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/README.md
git commit -m "docs: link walkthrough to re-cut puzzle lab and document live scenes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014XVs9aV98WUTQFibYKF5FT"
```


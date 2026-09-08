(function runPuzzleTests(root) {
  "use strict";

  const runningInNode = typeof module !== "undefined" && module.exports;
  const tests = [];

  function load(path, globalName) {
    if (runningInNode) {
      // A module that is missing or cannot load under Node (for example the browser-only worker
      // that Task 5 replaces) counts as "not implemented" so its tests fail visibly instead of
      // crashing the runner.
      try { return require(path); } catch (error) { return null; }
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

  test("catalog stages 3 and 4 contain the tree and lookup components", () => {
    same(idsInRange(12, 19), [
      "store-edge", "ancestor-chain", "common-ancestor", "directed-path", "validate-tree",
      "lookup-transform", "laser-point-to-map", "correction-from-pose",
    ]);
  });

  test("catalog stages 3 and 4 references pass their cases and diagnoses differ", () => {
    checkStageRange(12, 19);
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

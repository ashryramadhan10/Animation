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

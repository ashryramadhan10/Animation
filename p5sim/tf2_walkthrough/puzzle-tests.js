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

  test("runtime exposes p5-style math helpers and lets learners shadow them", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const scope = api.compileScope("f", "function f(yaw) { return { x: cos(yaw) * PI, y: dist(0, 0, 3, 4), d: degrees(HALF_PI), m: map(5, 0, 10, 0, 1), r: radians(180) }; }", []);
    assert(scope.ok, "prelude should compile: " + (scope.ok ? "" : scope.error.message));
    same(api.callSafely(scope.fn, [0]).value, { x: Math.PI, y: 5, d: 90, m: 0.5, r: Math.PI });
    const shadow = api.compileScope("g", "const PI = 3; function g() { return PI; }", []);
    assert(shadow.ok, "shadowing a prelude name must not be a syntax error");
    same(api.callSafely(shadow.fn, []).value, 3);
    const sketchOnly = api.compileScope("h", "function h() { return createVector(1, 2); }", []);
    const outcome = api.callSafely(sketchOnly.fn, []);
    assert(!outcome.ok && outcome.error.kind === "runtime" && /createVector is not defined/.test(outcome.error.message), "sketch helpers stay undefined");
  });

  test("editor highlighter tags keywords, builtins, strings, and comments and escapes HTML", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    const html = api.highlight("function f(v) { return Math.cos(PI) < \"a\"; } // note");
    ["tok-keyword\">function", "tok-builtin\">Math", "tok-property\">cos", "tok-builtin\">PI", "tok-string\">\"a\"", "tok-comment\">// note", "&lt;"].forEach((needle) => {
      assert(html.includes(needle), "highlight output should contain " + needle + "\n" + html);
    });
    assert(!html.includes("<\""), "raw < must be escaped");
  });

  test("editor indents and outdents every line of a selection without eating it", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    const source = "let a = 1;\nlet b = 2;\nlet c = 3;";
    const inward = api.indentSelection(source, 0, source.length);
    same(inward.value, "  let a = 1;\n  let b = 2;\n  let c = 3;");
    same(inward.value.slice(inward.start, inward.end), "let a = 1;\n  let b = 2;\n  let c = 3;");
    const outward = api.outdentSelection(inward.value, inward.start, inward.end);
    same(outward.value, source);
    same(api.outdentSelection(source, 0, source.length), null);
  });

  test("editor toggles line comments on and off over a selection", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    const source = "  if (x) {\n\n    step();\n  }";
    const commented = api.toggleComment(source, 0, source.length);
    same(commented.value, "  // if (x) {\n\n  //   step();\n  // }");
    same(api.toggleComment(commented.value, 0, commented.value.length).value, source);
    same(api.toggleComment("\n\n", 0, 2), null);
  });

  test("editor moves and duplicates whole lines", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    const source = "one\ntwo\nthree";
    same(api.moveLines(source, 4, 4, -1).value, "two\none\nthree");
    same(api.moveLines(source, 4, 4, 1).value, "one\nthree\ntwo");
    same(api.moveLines(source, 0, 0, -1), null);
    same(api.moveLines(source, 10, 10, 1), null);
    const copied = api.duplicateLines(source, 4, 4);
    same(copied.value, "one\ntwo\ntwo\nthree");
    same(copied.start, 8);
  });

  test("editor keeps indentation when breaking a line and opens a block", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    same(api.breakLine("    step();", 11, 11).value, "    step();\n    ");
    same(api.breakLine("  if (x) {", 10, 10).value, "  if (x) {\n    ");
    const wrapped = api.breakLine("  if (x) {}", 10, 10);
    same(wrapped.value, "  if (x) {\n    \n  }");
    same(wrapped.start, 15);
  });

  test("editor closes brackets and quotes, skips over them, and deletes the pair", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    same(api.typeCharacter("", 0, 0, "(").value, "()");
    same(api.typeCharacter("", 0, 0, "(").start, 1);
    same(api.typeCharacter("()", 1, 1, ")"), { value: "()", start: 2, end: 2 });
    same(api.typeCharacter("ab", 0, 2, "(").value, "(ab)");
    same(api.typeCharacter("x", 0, 0, "("), null, "no pair in front of a word");
    same(api.typeCharacter("don", 3, 3, "'"), null, "no pair after a word character");
    same(api.closePair("()", 1, 1).value, "");
    same(api.closePair("(a)", 1, 1), null);
  });

  test("editor dedents a closing brace sitting alone on its line", () => {
    const api = requireApi(load("./puzzle-editor.js", "PuzzleEditor"), "puzzle-editor.js");
    same(api.dedentClosing("if (x) {\n    ", 13, 13, "}").value, "if (x) {\n  }");
    same(api.dedentClosing("  step()", 8, 8, "}"), null);
  });

  test("runtime makes dependency sources visible to the compiled function", () => {
    const api = requireApi(runtime, "puzzle-runtime.js");
    const scope = api.compileScope("twice", "function twice(n) { return addOne(addOne(n)); }", [ADD_SOURCE]);
    assert(scope.ok, "dependency should compile");
    same(api.callSafely(scope.fn, [1]).value, 3);
  });

  // ---------------------------------------------------------------- catalog helpers
  let catalogOverride = null;
  function puzzlesApi() { return catalogOverride || requireApi(catalog, "puzzles.js"); }
  function withCatalog(api, run) { const previous = catalogOverride; catalogOverride = api; try { return run(); } finally { catalogOverride = previous; } }
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
    if (comparator === "wrapped") return typeof actual === "number" && angleClose(actual, expected) && Math.abs(actual) <= Math.PI + 1e-6;
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
  function accepted(puzzle, args, actual, expected) {
    if (typeof puzzle.accept !== "function") return valuesMatch(puzzle.comparator, actual, expected);
    return puzzle.accept(JSON.parse(JSON.stringify(args)), actual, expected) === true;
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
      const cases = requireApi(engine, "puzzle-engine.js").resolveCases(puzzle);
      const variantDiffers = {};
      cases.forEach((testCase) => {
        const result = api.evaluateCompiled(compiled, testCase.args);
        assert(result.learner.ok, puzzle.id + " reference threw on " + testCase.label + ": " + (result.learner.ok ? "" : result.learner.error.message));
        assert(puzzle.allowMutation || !result.learner.inputMutated, puzzle.id + " reference mutated input on " + testCase.label);
        assert(accepted(puzzle, testCase.args, result.learner.value, testCase.expected), puzzle.id + " reference mismatch on " + testCase.label + ": " + JSON.stringify(result.learner.value).slice(0, 200));
        puzzle.diagnoses.forEach((entry) => {
          if (!accepted(puzzle, testCase.args, result.variants[entry.id], testCase.expected)) variantDiffers[entry.id] = true;
        });
      });
      puzzle.diagnoses.forEach((entry) => assert(variantDiffers[entry.id], puzzle.id + " diagnosis " + entry.id + " never differs from the reference"));
      requireApi(engine, "puzzle-engine.js").releaseCases(puzzle);
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

  test("catalog stages 5 to 7 contain time, SE(3), and the capstone", () => {
    same(idsInRange(20, 27), [
      "interpolate-transform", "bracket-samples", "latest-common-time", "sample-edge",
      "quaternion-multiply", "rotate-by-quaternion", "compose-se3", "stamped-lookup",
    ]);
  });

  test("catalog stages 5 to 7 references pass their cases and diagnoses differ", () => {
    checkStageRange(20, 27);
  });

  test("catalog track 1 has 27 puzzles and the whole catalog is sequential", () => {
    const api = puzzlesApi();
    const list = api.TF2_PUZZLES;
    assert(list.filter((puzzle) => puzzle.track === "tf2").length === 27, "expected 27 tf2 puzzles");
    const seen = new Set();
    list.forEach((puzzle, index) => {
      assert(puzzle.number === index + 1, puzzle.id + " has number " + puzzle.number);
      assert(!seen.has(puzzle.id), "duplicate id " + puzzle.id);
      assert(["tf2", "toolkit", "advanced", "correction", "estimation", "bayes"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
      puzzle.dependencies.forEach((dependency) => assert(seen.has(dependency), puzzle.id + " depends on unknown or later puzzle " + dependency));
      seen.add(puzzle.id);
      assert(api.getPuzzle(puzzle.id) === puzzle, "getPuzzle should resolve " + puzzle.id);
    });
    const stageIds = api.TF2_PUZZLE_TRACKS.flatMap((track) => track.stages.map((stage) => stage.id));
    list.forEach((puzzle) => assert(stageIds.includes(puzzle.stage), puzzle.id + " has unknown stage " + puzzle.stage));
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "correction", "estimation", "bayes"]);
    assert(api.TF2_PUZZLE_TRACKS[5].unlockAfter === "ekf-localize-step", "track 6 unlocks after the EKF localization step");
    assert(api.TF2_PUZZLE_TRACKS[5].stages.length === 3, "track 6 lists three stages");
    assert(api.TF2_PUZZLE_TRACKS[4].unlockAfter === "vision-correction-transform", "track 5 unlocks after the vision correction transform");
    assert(api.TF2_PUZZLE_TRACKS[4].stages.length === 3, "track 5 lists three stages");
    assert(api.TF2_PUZZLE_TRACKS[1].unlockAfter === "stamped-lookup", "track 2 unlocks after the capstone");
    assert(api.TF2_PUZZLE_TRACKS[1].stages.length === 5, "track 2 lists five stages");
    assert(api.TF2_PUZZLE_TRACKS[2].unlockAfter === "icp-match", "track 3 unlocks after the ICP finale");
    assert(api.TF2_PUZZLE_TRACKS[2].stages.length === 3, "track 3 lists three stages");
    assert(api.TF2_PUZZLE_TRACKS[3].unlockAfter === "buffer-lookup", "track 4 unlocks after the buffer finale");
    assert(api.TF2_PUZZLE_TRACKS[3].stages.length === 4, "track 4 lists four stages");
  });

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
    assert(api.compareOutput("wrapped", Math.PI, -Math.PI, 1e-6).pass, "wrapped accepts either endpoint");
    assert(api.compareOutput("wrapped", -Math.PI / 2, -Math.PI / 2, 1e-6).pass, "wrapped accepts an inside value");
    assert(!api.compareOutput("wrapped", 4, 4 - 2 * Math.PI, 1e-6).pass, "wrapped rejects an unwrapped value");
    assert(!api.compareOutput("wrapped", 1, 2, 1e-6).pass, "wrapped rejects a different angle");
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
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked", "locked", "locked", "locked", "locked"]);
    progress = api.completePuzzle(progress, list[0], "function headingVector(yaw) { return null; }", "2026-09-08T00:00:00Z", list);
    same(progress.highestUnlocked, 1);
    same(progress.currentPuzzleId, "heading-of");
    progress = api.completePuzzle(progress, list[26], "source", "2026-09-08T00:00:00Z", list);
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available", "locked", "locked", "locked", "locked"]);
    const reset = api.resetPuzzle(progress, list, "heading-vector");
    assert(!reset.progress.solved["heading-vector"] && reset.invalidated.includes("heading-vector"), "reset clears the puzzle");
  });

  test("engine validateCatalog accepts the real catalog and rejects a bad scene kind", () => {
    const api = engineApi();
    const list = puzzleList();
    const kinds = scenesApi().SCENE_KINDS;
    assert(api.validateCatalog(list, kinds).valid, "real catalog should validate: " + api.validateCatalog(list, kinds).message);
    const broken = list.map((puzzle, index) => (index === 0 ? { ...puzzle, scene: { ...puzzle.scene, kind: "nope" } } : puzzle));
    assert(!api.validateCatalog(broken, kinds).valid, "unknown scene kind should be rejected");
  });

  test("engine live session resolves, supersedes queued requests, drops stale replies, and restarts on timeout", async () => {
    const api = engineApi();
    const factory = fakeWorkerFactory();
    const session = api.createLiveSession({ workerUrl: "fake.js", liveTimeoutMs: 40, checkTimeoutMs: 40, warmupTimeoutMs: 120, createWorker: factory });
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

  test("engine live session gives the first request after a worker start the warm-up budget", async () => {
    const api = engineApi();
    const factory = fakeWorkerFactory();
    const session = api.createLiveSession({ workerUrl: "fake.js", liveTimeoutMs: 40, checkTimeoutMs: 40, warmupTimeoutMs: 120, createWorker: factory });
    let settled = null;
    session.evaluate(LIVE_PROGRAM, [1]).catch((error) => { settled = error.kind; });
    await wait(70);
    same(settled, null, "cold request must not time out at the live budget");
    await wait(90);
    same(settled, "timeout");
    const worker = factory.created[0];
    assert(worker.terminated, "cold worker should still be restarted after the warm-up budget");
    session.dispose();
  });

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

  // ---------------------------------------------------------------- toolkit track
  function toolkitPuzzles() { return puzzleList().filter((puzzle) => puzzle.track !== "tf2"); }

  test("catalog track 2 stage 8 contains the matrix bricks and every toolkit puzzle links a reference", () => {
    same(idsInRange(28, 33), ["rot-mat-2d", "homogeneous-from-pose", "mat-mul-3", "apply-homogeneous", "pose-from-homogeneous", "invert-homogeneous"]);
    toolkitPuzzles().forEach((puzzle) => {
      assert(puzzle.reference && typeof puzzle.reference.label === "string" && /^(https:\/\/|\.\.\/)/.test(puzzle.reference.url), puzzle.id + " needs a reference link");
    });
  });

  test("catalog stage 8 references pass their cases and diagnoses differ", () => {
    checkStageRange(28, 33);
  });

  test("scenes: matrix kind builds valid arguments and finite layers", () => {
    checkSceneKinds(["matrix"]);
  });

  test("catalog track 2 stage 9 contains the 3D orientation bricks", () => {
    same(idsInRange(34, 40), ["quaternion-from-rpy", "yaw-from-quaternion", "rpy-from-quaternion", "slerp-quaternion", "transform-point-3d", "invert-se3", "optical-to-body"]);
  });

  test("catalog stage 9 references pass their cases and diagnoses differ", () => {
    checkStageRange(34, 40);
  });

  test("engine angles comparator wraps every numeric field", () => {
    const api = engineApi();
    const twoPi = 2 * Math.PI;
    assert(api.compareOutput("angles", { roll: 4, pitch: 0, yaw: -1 }, { roll: 4 - twoPi, pitch: twoPi, yaw: -1 + twoPi }, 1e-6).pass, "angles should wrap");
    assert(!api.compareOutput("angles", { roll: 4, pitch: 0.5, yaw: -1 }, { roll: 4, pitch: 0, yaw: -1 }, 1e-6).pass, "angles should still detect differences");
    assert(!api.compareOutput("deep", { roll: 4, pitch: 0, yaw: -1 }, { roll: 4 - twoPi, pitch: 0, yaw: -1 }, 1e-6).pass, "deep wraps only yaw");
  });

  test("scenes: se3 views for rpy, slerp, point3d, inverse, and optical build valid arguments", () => {
    checkSceneKinds(["se3"]);
    const api = scenesApi();
    const optical = puzzlesApi().getPuzzle("optical-to-body");
    const values = api.initialValues(optical);
    const body = referenceOutput(optical, api.toArgs(optical, values));
    near(Math.hypot(body.x, body.y, body.z), 1);
    near(body.z, Math.sin(values.pitch));
  });

  test("catalog track 2 stage 10 contains motion and covariance bricks", () => {
    same(idsInRange(41, 43), ["integrate-motion", "dead-reckon", "rotate-covariance"]);
  });

  test("catalog stage 10 references pass their cases and diagnoses differ", () => {
    checkStageRange(41, 43);
  });

  test("scenes: motion, motion-trail, and covariance kinds build valid arguments and finite layers", () => {
    checkSceneKinds(["motion", "motion-trail", "covariance"]);
    const api = scenesApi();
    const trail = puzzlesApi().getPuzzle("dead-reckon");
    const args = api.toArgs(trail, api.initialValues(trail));
    assert(Array.isArray(args[1]) && args[1].length === 20, "dead-reckon scene supplies 20 commands");
  });

  test("catalog track 2 stage 11 contains the time-travel lookup", () => {
    same(idsInRange(44, 44), ["lookup-across-time"]);
  });

  test("catalog stage 11 references pass their cases and diagnoses differ", () => {
    checkStageRange(44, 44);
  });

  test("scenes: the across-time view builds valid arguments and finite layers", () => {
    checkSceneKinds(["robot-chain-time"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("lookup-across-time");
    const args = api.toArgs(puzzle, api.initialValues(puzzle));
    same(args.slice(1), ["base_link", 3, "laser", 7, "map"]);
    const result = referenceOutput(puzzle, args);
    assert(result.ok && result.targetTime === 3 && result.sourceTime === 7, "reference should answer the default scene lookup");
  });

  test("catalog track 2 stage 12 contains the rigid alignment ladder", () => {
    same(idsInRange(45, 51), ["centroid", "cross-covariance", "alignment-yaw", "rigid-transform-from-pairs", "nearest-neighbors", "icp-step", "icp-match"]);
  });

  test("catalog stage 12 references pass their cases and diagnoses differ", () => {
    checkStageRange(45, 51);
  });

  test("scenes: cloud-align recovers the dragged motion through rigid pairs and ICP", () => {
    checkSceneKinds(["cloud-align"]);
    const api = scenesApi();
    const rigid = puzzlesApi().getPuzzle("rigid-transform-from-pairs");
    const rigidValues = api.initialValues(rigid);
    const recovered = referenceOutput(rigid, api.toArgs(rigid, rigidValues));
    near(recovered.x, rigidValues.motion.x); near(recovered.y, rigidValues.motion.y); near(recovered.yaw, rigidValues.motion.yaw);
    const icp = puzzlesApi().getPuzzle("icp-match");
    const icpValues = api.initialValues(icp);
    const matched = referenceOutput(icp, api.toArgs(icp, icpValues));
    near(matched.transform.x, icpValues.motion.x, 1e-3); near(matched.transform.y, icpValues.motion.y, 1e-3); near(matched.transform.yaw, icpValues.motion.yaw, 1e-3);
    assert(matched.error < 1e-3, "ICP should converge on the clean cloud");
  });

  // ---------------------------------------------------------------- advanced track
  test("catalog track 3 stage 13 contains the conversion bricks", () => {
    same(idsInRange(52, 55), ["rotation-matrix-from-quaternion", "quaternion-from-rotation-matrix", "quaternion-from-axis-angle", "axis-angle-from-quaternion"]);
  });

  test("catalog stage 13 references pass their cases and diagnoses differ", () => {
    checkStageRange(52, 55);
  });

  test("scenes: conversion views round-trip the slider rotation", () => {
    const api = scenesApi();
    const toMatrix = puzzlesApi().getPuzzle("rotation-matrix-from-quaternion");
    const toQuaternion = puzzlesApi().getPuzzle("quaternion-from-rotation-matrix");
    const values = api.initialValues(toMatrix);
    const q = api.toArgs(toMatrix, values)[0];
    const matrix = referenceOutput(toMatrix, [q]);
    const back = referenceOutput(toQuaternion, [matrix]);
    assert(valuesMatch("quaternion", back, q), "matrix → quaternion should recover the slider quaternion");
    const fromAxis = puzzlesApi().getPuzzle("quaternion-from-axis-angle");
    const toAxis = puzzlesApi().getPuzzle("axis-angle-from-quaternion");
    const axisValues = api.initialValues(fromAxis);
    const built = referenceOutput(fromAxis, api.toArgs(fromAxis, axisValues));
    const recovered = referenceOutput(toAxis, [built]);
    near(recovered.angle, Math.abs(axisValues.angle));
  });

  test("catalog track 3 stage 14 contains the sensor and motion bricks", () => {
    same(idsInRange(56, 58), ["static-from-urdf", "twist-from-poses", "deskew-scan"]);
  });

  test("catalog stage 14 references pass their cases and diagnoses differ", () => {
    checkStageRange(56, 58);
  });

  test("scenes: twist and deskew kinds build valid arguments, and de-skewing straightens the wall", () => {
    checkSceneKinds(["twist", "deskew"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("deskew-scan");
    const values = api.initialValues(puzzle);
    const args = api.toArgs(puzzle, values);
    const deskewed = referenceOutput(puzzle, args);
    assert(deskewed.length === 12, "twelve de-skewed points");
    deskewed.forEach((point, i) => {
      const world = api.se2.applyPoint(values.end, point);
      near(world.x, 3);
      near(world.y, -1.5 + 3 * i / 11);
    });
  });

  test("catalog track 3 stage 15 contains the buffer semantics ladder", () => {
    same(idsInRange(59, 63), ["insert-transform", "parent-at", "buffer-can-transform", "wait-for-transform", "buffer-lookup"]);
    assert(puzzleList().length >= 63, "catalog should hold at least 63 puzzles");
  });

  test("catalog stage 15 references pass their cases and diagnoses differ", () => {
    checkStageRange(59, 63);
  });

  test("scenes: buffer views build valid arguments and the lookup view answers at the cursor time", () => {
    checkSceneKinds(["buffer"]);
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("buffer-lookup");
    const values = api.initialValues(puzzle);
    const result = referenceOutput(puzzle, api.toArgs(puzzle, values));
    assert(result.ok && Number.isFinite(result.transform.x), "default buffer lookup should succeed");
    const past = referenceOutput(puzzle, api.toArgs(puzzle, { ...values, time: 1 }));
    same(past, { ok: false, code: "PAST_EXTRAPOLATION" });
  });

  // ---------------------------------------------------------------- correction track
  test("catalog track 4 stage 16 contains the point-cloud bricks", () => {
    same(idsInRange(64, 67), ["points-to-odom", "fit-line", "signed-line-distance", "heading-from-line"]);
  });

  test("catalog stage 16 references pass their cases and diagnoses differ", () => {
    checkStageRange(64, 67);
  });

  test("scenes: aisle views for stage 16 build valid arguments and finite layers", () => {
    checkSceneKinds(["aisle"]);
    const api = scenesApi();
    const fit = puzzlesApi().getPuzzle("fit-line");
    const values = api.initialValues(fit);
    const line = referenceOutput(fit, api.toArgs(fit, values));
    near(Math.hypot(line.a, line.b), 1);
    assert(line.b > 0, "fitLine normalizes the sign so b > 0");
    near(-line.a / line.b, Math.tan(values.aisle.yaw));
  });

  test("catalog track 4 stage 17 contains the rack filters", () => {
    same(idsInRange(68, 71), ["inlier-refit", "face-filter", "smooth-line", "consensus-heading"]);
  });

  test("catalog stage 17 references pass their cases and diagnoses differ", () => {
    checkStageRange(68, 71);
  });

  test("catalog track 4 stage 18 contains the aisle correction ladder", () => {
    same(idsInRange(72, 75), ["centerline-from-racks", "single-rack-centerline", "corrected-pose-shift", "aisle-correction-step"]);
    assert(puzzleList().length >= 75, "catalog should hold at least 75 puzzles");
  });

  test("catalog stage 18 references pass their cases and diagnoses differ", () => {
    checkStageRange(72, 75);
  });

  test("scenes: the correction capstone puts the observed racks on the map rack lines", () => {
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("aisle-correction-step");
    const values = api.initialValues(puzzle);
    const frame = api.toArgs(puzzle, values)[0];
    const result = referenceOutput(puzzle, [frame, 0.3]);
    near(result.heading, values.aisle.yaw);
    const odomFromLaser = api.se2.compose(values.robot, { x: 0.5, y: 0, yaw: 0 });
    frame.leftPoints.forEach((p) => near(api.se2.applyPoint(result.mapFromOdom, api.se2.applyPoint(odomFromLaser, p)).y, 1.6));
    frame.rightPoints.forEach((p) => near(api.se2.applyPoint(result.mapFromOdom, api.se2.applyPoint(odomFromLaser, p)).y, -1.6));
    near(result.correctedPose.yaw, values.robot.yaw - values.aisle.yaw);
  });

  test("catalog track 4 stage 19 contains the vision node bricks", () => {
    same(idsInRange(76, 83), ["heading-gate", "consensus-outlier-gate", "rate-limit-heading", "aisle-state-blend", "dual-centerline-check", "low-pass-step-limit", "lateral-jump-guard", "vision-correction-transform"]);
    puzzleList().filter((puzzle) => puzzle.track === "correction").forEach((puzzle) => {
      assert(/^p5sim\/navigation · scripts\/[a-z_]+\.js · /.test(puzzle.reference.label), puzzle.id + " should name the navigation module it mirrors");
      assert(/^\.\.\/navigation\/[a-z-]+\/index\.html$/.test(puzzle.reference.url), puzzle.id + " should link a navigation page");
    });
  });

  test("catalog stage 19 references pass their cases and diagnoses differ", () => {
    checkStageRange(76, 83);
  });

  test("scenes: the vision node bricks agree with the line-based correction", () => {
    const api = puzzlesApi();
    const cfg = { emaAlpha: 0.05, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 };
    const guard = api.getPuzzle("lateral-jump-guard");
    let step = referenceOutput(guard, [null, 0.2, cfg]);
    step = referenceOutput(guard, [step.state, 0.55, cfg]);
    assert(step.held && step.filteredM === 0.2, "an isolated jump is held");
    step = referenceOutput(guard, [step.state, 0.2, cfg]);
    assert(!step.held && step.state.pendingJumpCount === 0, "back to normal clears the pending jump");
    step = referenceOutput(guard, [step.state, 0.55, cfg]); step = referenceOutput(guard, [step.state, 0.56, cfg]); step = referenceOutput(guard, [step.state, 0.55, cfg]);
    assert(!step.held && step.filteredM > 0.2 && step.filteredM <= 0.2 + cfg.maxStepM + 1e-9, "three repeated frames confirm the jump and ease it in by at most one step");
    const shift = api.getPuzzle("corrected-pose-shift");
    const tf = api.getPuzzle("vision-correction-transform");
    const raw = { x: 1.3, y: 0.7, yaw: 0.4 }, heading = 0.25, c = -0.35;
    const centerline = { a: -Math.sin(heading), b: Math.cos(heading), c };
    const corrected = referenceOutput(shift, [raw, centerline, heading, 0]);
    const edges = referenceOutput(tf, [raw, { x: corrected.x, y: corrected.y }, heading]);
    near(edges.mapFromOdom.x, 0); near(edges.mapFromOdom.y, c); near(edges.mapFromOdom.yaw, -heading);
    near(edges.correctedPose.y, centerline.a * raw.x + centerline.b * raw.y + centerline.c);
    near(edges.correctedPose.yaw, raw.yaw - heading);
    const blend = referenceOutput(api.getPuzzle("aisle-state-blend"), [{ headingRad: 3.1, centerlineC: 0, halfWidthM: 1.6 }, { headingRad: -3.1, centerlineC: 0, halfWidthM: 1.6, dualSide: true }, 0.5]);
    assert(Math.abs(Math.abs(blend.headingRad) - Math.PI) < 1e-9, "the aisle state blends headings on the circle");
  });

  // ---------------------------------------------------------------- estimation track
  test("catalog track 5 contains kinematics, uncertainty, and estimation ladders", () => {
    same(idsInRange(84, 86), ["diff-drive-twist", "integrate-gyro", "twist-in-sensor-frame"]);
    same(idsInRange(87, 90), ["covariance-propagate-motion", "compose-uncertain", "mahalanobis-distance", "covariance-ellipse"]);
    same(idsInRange(91, 95), ["ekf-predict", "ekf-update-position", "particle-weights", "resample-particles", "ekf-localize-step"]);
    assert(puzzleList().length >= 95, "catalog should hold at least 95 puzzles");
  });

  test("catalog stages 19 to 21 references pass their cases and diagnoses differ", () => {
    checkStageRange(84, 95);
  });

  test("scenes: estimation views build valid arguments and analytic checks hold", () => {
    checkSceneKinds(["estimation", "se3"]);
    const api = scenesApi();
    const ellipsePuzzle = puzzlesApi().getPuzzle("covariance-ellipse");
    const ellipseValues = api.initialValues(ellipsePuzzle);
    const shape = referenceOutput(ellipsePuzzle, api.toArgs(ellipsePuzzle, ellipseValues));
    near(shape.angle, ellipseValues.angle); near(shape.major, ellipseValues.major); near(shape.minor, ellipseValues.minor);
    const update = puzzlesApi().getPuzzle("ekf-update-position");
    const perfect = referenceOutput(update, [{ x: 0, y: 0, yaw: 0.3 }, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], { x: 2, y: -1 }, [[0, 0], [0, 0]]]);
    near(perfect.state.x, 2); near(perfect.state.y, -1); near(perfect.P[0][0], 0); near(perfect.P[2][2], 1);
    const resample = puzzlesApi().getPuzzle("resample-particles");
    const list = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    same(referenceOutput(resample, [list, [0.25, 0.25, 0.25, 0.25], 0.1]), list);
  });

  // ---------------------------------------------------------------- bayesian filters track
  test("catalog track 6 contains the scalar, multivariate, and nonlinear ladders", () => {
    same(idsInRange(96, 100), ["gh-filter-step", "discrete-predict", "discrete-update", "gaussian-multiply", "kalman-1d-step"]);
    same(idsInRange(101, 106), ["mat-mul-2", "mat-inv-2", "constant-velocity-model", "kf-predict", "kf-update", "kalman-track-step"]);
    same(idsInRange(107, 110), ["sigma-points", "unscented-transform", "unscented-polar", "rts-smoother-step"]);
    assert(puzzleList().length === 110, "catalog should hold 110 puzzles");
    puzzleList().filter((puzzle) => puzzle.track === "bayes").forEach((puzzle) => {
      assert(/rlabbe\/Kalman-and-Bayesian-Filters-in-Python/.test(puzzle.reference.url), puzzle.id + " should link the book");
    });
    ["covariance-propagate-motion", "compose-uncertain", "covariance-ellipse", "ekf-predict", "ekf-update-position", "ekf-localize-step", "particle-weights", "resample-particles"].forEach((id) => {
      const puzzle = puzzlesApi().getPuzzle(id);
      assert(puzzle.reading && typeof puzzle.reading.label === "string" && /^https:\/\//.test(puzzle.reading.url), id + " should carry an also-read link");
    });
    puzzleList().forEach((puzzle) => {
      const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
      assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes; only three fit on the canvas");
    });
  });

  test("catalog stages 22 to 24 references pass their cases and diagnoses differ", () => {
    checkStageRange(96, 110);
  });

  test("scenes: bayes views build valid arguments and analytic checks hold", () => {
    checkSceneKinds(["bayes"]);
    const api = puzzlesApi();
    const sigma = referenceOutput(api.getPuzzle("sigma-points"), [{ x: 1, y: -0.5 }, [[0.6, 0.25], [0.25, 0.4]], 0.7, 2, 1]);
    const back = referenceOutput(api.getPuzzle("unscented-transform"), [sigma.points, sigma.wm, sigma.wc]);
    near(back.mean.x, 1); near(back.mean.y, -0.5); near(back.P[0][0], 0.6); near(back.P[0][1], 0.25); near(back.P[1][1], 0.4);
    const step = referenceOutput(api.getPuzzle("kalman-1d-step"), [{ mean: 0, variance: 1 }, { mean: 1, variance: 0 }, 2, 1]);
    const gain = 1 / (1 + 1);
    near(step.mean, 1 + gain * (2 - 1)); near(step.variance, (1 - gain) * 1);
    const rts = referenceOutput(api.getPuzzle("rts-smoother-step"), [[0, 1], [[1, 0], [0, 1]], [1, 1], [[2, 1], [1, 1]], [[1, 1], [0, 1]], [[0, 0], [0, 0]]]);
    near(rts.x[0], 0); near(rts.x[1], 1); near(rts.P[0][0], 1); near(rts.P[0][1], 0); near(rts.P[1][1], 1);
    const predicted = referenceOutput(api.getPuzzle("discrete-predict"), [[0.1, 0.2, 0.3, 0.4], 2, [0.2, 0.7, 0.1]]);
    near(predicted.reduce((sum, p) => sum + p, 0), 1);
  });

  // ---------------------------------------------------------------- side lab (nature of code)
  const sideCatalog = load("./side-puzzles.js", "SidePuzzles");
  function sideApi() {
    const api = requireApi(sideCatalog, "side-puzzles.js");
    return { TF2_PUZZLES: api.SIDE_PUZZLES, TF2_PUZZLE_TRACKS: api.SIDE_PUZZLE_TRACKS, getPuzzle: api.getPuzzle };
  }

  test("catalog exports every stage that a puzzle uses", () => {
    const api = puzzlesApi();
    const ids = new Set(api.TF2_PUZZLE_STAGES.map((stage) => stage.id));
    puzzleList().forEach((puzzle) => assert(ids.has(puzzle.stage), puzzle.id + " uses stage " + puzzle.stage + " that TF2_PUZZLE_STAGES does not list"));
    same(api.TF2_PUZZLE_TRACKS.flatMap((track) => track.stages.map((stage) => stage.id)), api.TF2_PUZZLE_STAGES.map((stage) => stage.id));
  });

  test("side catalog lists the six sketch stages and validates", () => {
    withCatalog(sideApi(), () => {
      const engineApi = requireApi(engine, "puzzle-engine.js");
      const status = engineApi.validateCatalog(puzzleList(), scenesApi().SCENE_KINDS);
      assert(status.valid, status.message);
      assert(puzzleList().length === 32, "side catalog should hold 32 puzzles");
      same(puzzlesApi().TF2_PUZZLE_TRACKS.map((track) => track.id), ["nature"]);
      same(idsInRange(1, 7), ["normalize", "set-magnitude", "limit-vector", "dot-product", "angle-between", "scalar-projection", "nearest-point-on-segment"]);
      same(idsInRange(8, 13), ["apply-force", "step-mover", "friction-force", "drag-force", "gravitational-attraction", "wrap-edges"]);
      same(idsInRange(14, 21), ["seek", "flee", "arrive", "pursue", "wander-target", "flow-field-lookup", "follow-field", "path-target"]);
      same(idsInRange(22, 25), ["separate", "align", "cohere", "flock"]);
      same(idsInRange(26, 29), ["simplify-angle", "constrain-angle", "chain-follow", "wrap-offset"]);
      same(idsInRange(30, 32), ["bin-index", "histogram", "normalize-histogram"]);
      puzzleList().forEach((puzzle) => {
        assert(/^https:\/\//.test(puzzle.reference.url), puzzle.id + " needs a reference link");
        assert(/^(agents|force|scalar_projection|procedural_animation|random_distribution)\//.test(puzzle.walkthroughChapter), puzzle.id + " should point at its source sketch");
        const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
        assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes");
      });
    });
  });

  test("side catalog references pass their cases and diagnoses differ", () => {
    withCatalog(sideApi(), () => checkStageRange(1, 32));
  });

  test("scenes: nature views build valid arguments and analytic checks hold", () => {
    withCatalog(sideApi(), () => {
      checkSceneKinds(["nature"]);
      const api = puzzlesApi();
      const agent = { pos: { x: 0, y: 0 }, vel: { x: 0.5, y: 0 } };
      const others = [{ pos: { x: 1, y: 0 }, vel: { x: 0, y: 1 } }, { pos: { x: 0, y: 1.5 }, vel: { x: 1, y: 0 } }];
      const params = { separation: 1.2, neighbourRadius: 2.5, maxSpeed: 1.5, maxForce: 0.6 };
      const parts = ["separate", "align", "cohere"].map((id) => referenceOutput(api.getPuzzle(id), [agent, others, id === "separate" ? params.separation : params.neighbourRadius, params.maxSpeed, params.maxForce]));
      const combined = referenceOutput(api.getPuzzle("flock"), [agent, others, { separation: 1, alignment: 1, cohesion: 1 }, params]);
      near(combined.x, parts[0].x + parts[1].x + parts[2].x); near(combined.y, parts[0].y + parts[1].y + parts[2].y);
      const link = referenceOutput(api.getPuzzle("chain-follow"), [{ x: 1, y: 1 }, { x: 4, y: 3 }, 1.5, 0.2, 0.3]);
      near(Math.hypot(link.pos.x - 1, link.pos.y - 1), 1.5);
      const counts = referenceOutput(api.getPuzzle("histogram"), [[0.1, 0.2, 0.5, 0.9, 1], 0, 1, 5]);
      near(counts.reduce((sum, c) => sum + c, 0), 5);
      const nearest = referenceOutput(api.getPuzzle("nearest-point-on-segment"), [{ x: 2, y: 5 }, { x: 0, y: 0 }, { x: 4, y: 0 }]);
      near(nearest.x, 2); near(nearest.y, 0);
    });
  });

  // ---------------------------------------------------------------- algo lab (cses)
  const algoCatalog = load("./algo-puzzles.js", "AlgoPuzzles");
  function algoApi() {
    const api = requireApi(algoCatalog, "algo-puzzles.js");
    return { TF2_PUZZLES: api.ALGO_PUZZLES, TF2_PUZZLE_TRACKS: api.ALGO_PUZZLE_TRACKS, getPuzzle: api.getPuzzle };
  }

  test("algo catalog lists its sections in site order and validates", () => {
    withCatalog(algoApi(), () => {
      const engineApi = requireApi(engine, "puzzle-engine.js");
      const status = engineApi.validateCatalog(puzzleList(), scenesApi().SCENE_KINDS);
      assert(status.valid, status.message);
      const api = puzzlesApi();
      same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["intro", "sorting", "dp", "graphs", "range", "trees", "math", "strings", "geometry", "window", "bitwise", "construction", "advanced", "advanced-graphs", "counting"]);
      const idsOf = (track) => puzzleList().filter((puzzle) => puzzle.track === track).map((puzzle) => puzzle.id);
      same(idsOf("intro"), ["weird-algorithm", "missing-number", "repetitions", "increasing-array", "permutations", "number-spiral", "two-knights", "two-sets", "bit-strings", "trailing-zeros", "coin-piles", "palindrome-reorder", "gray-code", "tower-of-hanoi", "creating-strings", "apple-division", "chessboard-and-queens", "raab-game-i", "mex-grid-construction", "knight-moves-grid", "grid-coloring-i", "digit-queries", "string-reorder", "grid-path-description"]);
      same(idsOf("sorting"), ["distinct-numbers", "apartments", "ferris-wheel", "lower-bound", "upper-bound", "fenwick-add", "fenwick-prefix", "fenwick-kth", "concert-tickets", "restaurant-customers", "movie-festival", "sum-of-two-values", "maximum-subarray-sum", "stick-lengths", "missing-coin-sum", "collecting-numbers", "collecting-numbers-ii", "playlist", "towers", "traffic-lights", "distinct-values-subarrays", "distinct-values-subsequences", "josephus-problem-i", "josephus-problem-ii", "nested-ranges-check", "nested-ranges-count", "heap-push", "heap-pop", "room-allocation", "factory-machines", "tasks-and-deadlines", "reading-books", "sum-of-three-values", "sum-of-four-values", "nearest-smaller-values", "prefix-sums", "subarray-sums-i", "subarray-sums-ii", "subarray-divisibility", "distinct-values-subarrays-ii", "array-division", "movie-festival-ii", "maximum-subarray-sum-ii"]);
      same(idsOf("dp"), ["dice-combinations", "minimizing-coins", "coin-combinations-i", "coin-combinations-ii", "removing-digits", "grid-paths", "book-shop", "array-description", "counting-towers", "edit-distance", "longest-common-subsequence", "rectangle-cutting", "minimal-grid-path", "money-sums", "removal-game", "two-sets-ii", "mountain-range", "increasing-subsequence", "projects", "elevator-rides", "counting-tilings", "counting-numbers", "increasing-subsequence-ii"]);
      same(idsOf("graphs"), ["counting-rooms", "labyrinth", "labyrinth-path", "building-roads", "message-route", "building-teams", "round-trip", "monsters", "shortest-routes", "shortest-routes-ii", "high-score", "flight-discount", "cycle-finding", "flight-routes", "round-trip-ii", "course-schedule", "longest-flight-route", "game-routes", "investigation", "planets-queries-i", "planets-queries-ii", "planets-cycles", "dsu-find", "dsu-union", "road-reparation", "road-construction", "flight-routes-check", "planets-and-kingdoms", "giant-pizza", "coin-collector", "mail-delivery", "de-bruijn-sequence", "teleporters-path", "hamiltonian-flights", "knights-tour", "max-flow", "download-speed", "police-chase", "school-dance", "distinct-routes"]);
      same(idsOf("range"), ["static-range-sum-queries", "sparse-table", "static-range-minimum-queries", "build-segment-tree", "segment-tree-update", "segment-tree-query", "dynamic-range-sum-queries", "dynamic-range-minimum-queries", "range-xor-queries", "range-update-queries", "forest-queries", "hotel-queries", "list-removals", "salary-queries", "prefix-sum-queries", "pizzeria-queries", "visible-buildings-queries", "range-interval-queries", "subarray-node-merge", "subarray-sum-queries", "subarray-sum-queries-ii", "distinct-values-queries", "distinct-values-queries-ii", "increasing-array-queries", "movie-festival-queries", "forest-queries-ii", "range-updates-and-sums", "polynomial-queries", "range-queries-and-copies", "missing-coin-sum-queries"]);
      same(idsOf("trees"), ["subordinates", "tree-matching", "tree-diameter", "tree-distances", "tree-distances-ii", "binary-lifting-table", "kth-ancestor", "company-queries-ii", "rooted-ancestors", "tree-lca", "distance-queries", "counting-paths", "euler-tour", "subtree-queries", "path-queries", "heavy-light-decomposition", "path-queries-ii", "distinct-colors", "finding-a-centroid", "fixed-length-paths-i", "fixed-length-paths-ii"]);
      same(idsOf("math"), ["josephus-queries", "mul-mod", "mod-pow", "exponentiation", "exponentiation-ii", "smallest-prime-factor", "factorize", "counting-divisors", "common-divisors", "sum-of-divisors", "mod-inverse", "divisor-analysis", "prime-multiples", "counting-coprime-pairs", "next-prime", "factorial-tables", "choose", "binomial-coefficients", "creating-strings-ii", "distributing-apples", "christmas-party", "permutation-order", "permutation-rounds", "bracket-sequences-i", "bracket-sequences-ii", "counting-necklaces", "counting-grids", "matrix-multiply", "matrix-power", "fibonacci-numbers", "throwing-dice", "graph-paths-i", "graph-paths-ii", "system-of-linear-equations", "sum-of-four-squares", "triangle-number-sums", "dice-probability", "moving-robots", "candy-lottery", "inversion-probability", "stick-game", "nim-game-i", "nim-game-ii", "stair-game", "grundys-game", "another-game"]);
      same(idsOf("strings"), ["word-combinations", "prefix-function", "z-function", "string-matching", "finding-borders", "finding-periods", "minimal-rotation", "manacher", "longest-palindrome", "all-palindromes", "required-substring", "palindrome-queries", "suffix-automaton", "finding-patterns", "counting-patterns", "pattern-positions", "suffix-array", "lcp-array", "distinct-substrings", "distinct-subsequences", "repeating-substring", "string-functions", "inverse-suffix-array", "string-transform", "substring-order-i", "substring-order-ii", "substring-distribution"]);
      same(idsOf("geometry"), ["cross-sign", "point-location-test", "line-segment-intersection", "polygon-area", "point-in-polygon", "polygon-lattice-points", "minimum-euclidean-distance", "convex-hull", "maximum-manhattan-distances", "all-manhattan-distances", "intersection-points", "li-chao-insert", "li-chao-query", "line-segments-trace-i", "li-chao-insert-range", "line-segments-trace-ii", "lines-and-queries-i", "lines-and-queries-ii", "coverage-add", "area-of-rectangles", "robot-path"]);
      same(idsOf("window"), ["generated-array", "sliding-window-sum", "window-minimums", "sliding-window-minimum", "sliding-window-xor", "sliding-window-or", "sliding-window-distinct-values", "sliding-window-mode", "sliding-window-mex", "compress-values", "sliding-window-median", "sliding-window-cost", "sliding-window-inversions", "sliding-window-advertisement"]);
      same(idsOf("bitwise"), ["counting-bits", "maximum-xor-subarray", "xor-basis", "maximum-xor-subset", "number-of-subset-xors", "k-subset-xors", "walsh-hadamard", "all-subarray-xors", "xor-pyramid-peak", "submask-xor", "xor-pyramid-diagonal", "xor-pyramid-row", "submask-sums", "sos-bit-problem", "and-subset-count"]);
      same(idsOf("construction"), ["inverse-inversions", "monotone-subsequences", "third-permutation", "permutation-prime-sums", "chess-tournament", "distinct-sums-grid", "tromino-tileable", "filling-trominos", "grid-path-feasible", "grid-path-construction"]);
      same(idsOf("advanced"), ["subset-sums", "meet-in-the-middle", "popcount", "hamming-distance", "corner-subgrid-check", "corner-subgrid-count", "reachable-nodes", "reachability-queries", "treap-merge", "treap-split", "cut-and-paste", "substring-reversals", "reversals-and-sums", "low-link", "necessary-roads", "necessary-cities", "eulerian-subgraphs", "monster-game-i", "monster-game-ii", "subarray-squares", "houses-and-schools", "knuth-division", "fft", "convolve", "apples-and-bananas", "one-bit-positions", "signal-processing", "new-roads-queries", "rollback-union", "dynamic-connectivity", "min-cost-flow", "parcel-delivery", "task-assignment", "distinct-routes-ii"]);
      same(idsOf("advanced-graphs"), ["nearest-shops", "prufer-code", "tree-traversals", "course-schedule-ii", "acyclic-graph-edges", "strongly-connected-edges", "even-outdegree-edges", "graph-girth", "fixed-length-walk-queries", "transfer-speeds-sum", "mst-edge-check", "mst-edge-set-check", "path-max-table", "path-max-query", "mst-edge-cost", "network-breakdown", "tree-coin-collecting-i", "tree-coin-collecting-ii", "ahu-codes", "tree-isomorphism-i", "tree-centers", "tree-isomorphism-ii", "flight-route-requests", "critical-cities", "visiting-cities", "graph-coloring", "bus-companies", "split-into-two-paths", "network-renovation", "forbidden-cities", "centroid-ancestors", "creating-offices", "new-flight-routes"]);
      same(idsOf("counting"), ["filled-subgrid-count-i", "filled-subgrid-count-ii", "all-letter-subgrid-count-i", "all-letter-subgrid-count-ii", "border-subgrid-count-i", "border-subgrid-count-ii", "raab-game-ii", "empty-string", "permutation-inversions", "counting-bishops", "counting-sequences", "grid-paths-ii", "counting-permutations", "grid-completion", "counting-reorders", "tournament-graph-distribution", "collecting-numbers-distribution", "functional-graph-distribution"]);
      puzzleList().forEach((puzzle, index) => {
        assert(puzzle.number === index + 1, puzzle.id + " is numbered " + puzzle.number);
        assert(/^https:\/\/(cses\.fi\/book\/|cp-algorithms\.com\/)/.test(puzzle.reference.url), puzzle.id + " should link the handbook or cp-algorithms");
        assert(/^\d+$/.test(puzzle.walkthroughChapter), puzzle.id + " should carry its CSES task id");
        const singleOperation = ["chessboard-and-queens", "lower-bound", "upper-bound", "fenwick-add", "fenwick-prefix", "fenwick-kth", "heap-push", "heap-pop", "segment-tree-update", "segment-tree-query", "subarray-node-merge", "kth-ancestor", "tree-lca", "mul-mod", "mod-pow", "mod-inverse", "choose", "factorize", "matrix-multiply", "cross-sign", "li-chao-insert", "li-chao-query", "li-chao-insert-range", "coverage-add", "compress-values", "walsh-hadamard", "submask-xor", "submask-sums", "tromino-tileable", "grid-path-feasible", "popcount", "treap-merge", "treap-split", "rollback-union", "path-max-query", "dsu-find", "dsu-union", "knights-tour", "coin-piles", "tower-of-hanoi", "creating-strings", "apple-division", "raab-game-i", "mex-grid-construction", "grid-path-description"].includes(puzzle.id);
        assert(singleOperation || puzzle.hidden.length > 0, puzzle.id + " needs a hidden time-limit case");
        const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
        assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes");
      });
      const unlocked = engineApi.unlockedIds(puzzleList(), api.TF2_PUZZLE_TRACKS, engineApi.createProgress());
      same(Array.from(unlocked), ["weird-algorithm", "distinct-numbers", "dice-combinations", "counting-rooms", "static-range-sum-queries", "subordinates", "josephus-queries", "word-combinations", "cross-sign", "generated-array", "counting-bits", "inverse-inversions", "subset-sums", "nearest-shops", "filled-subgrid-count-i"]);
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

  test("algo catalog references pass their cases and diagnoses differ", () => {
    withCatalog(algoApi(), () => checkStageRange(1, puzzleList().length));
  });

  test("scenes: algo views build valid arguments and analytic checks hold", () => {
    withCatalog(algoApi(), () => {
      checkSceneKinds(["algo"]);
      puzzleList().forEach((puzzle) => {
        if (typeof puzzle.small !== "function") return;
        for (let round = 0; round < 60; round += 1) {
          const args = puzzle.small(round);
          const fast = puzzle.solve.apply(null, JSON.parse(JSON.stringify(args)));
          if (typeof puzzle.brute === "function") {
            const slow = puzzle.brute.apply(null, JSON.parse(JSON.stringify(args)));
            assert(valuesMatch(puzzle.comparator, fast, slow), puzzle.id + " disagrees with its brute force on " + JSON.stringify(args) + ": " + JSON.stringify(fast) + " vs " + JSON.stringify(slow));
          }
          if (typeof puzzle.check === "function") {
            assert(puzzle.check.apply(null, [JSON.parse(JSON.stringify(args)), fast]), puzzle.id + " produced an invalid answer on " + JSON.stringify(args) + ": " + JSON.stringify(fast));
          }
        }
      });
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

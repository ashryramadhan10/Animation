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

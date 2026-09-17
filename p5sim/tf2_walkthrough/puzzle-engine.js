(function exposePuzzleEngine(root) {
  "use strict";

  const STORAGE_KEY = "tf2-puzzle-lab:v2";
  const SCHEMA_VERSION = 2;
  const FIRST_PUZZLE_ID = "heading-vector";
  const COMPARATORS = Object.freeze(["scalar", "angle", "angles", "wrapped", "vector2", "vector3", "quaternion", "se2", "se3", "deep", "path", "error"]);
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
      const wraps = angleFields === null || angleFields.has(lastKey);
      const error = wraps ? Math.abs(angleDelta(actual, expected)) : Math.abs(actual - expected);
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
    if (comparator === "wrapped") {
      if (typeof actual !== "number" || typeof expected !== "number") {
        return { pass: false, message: "Return one angle in radians.", delta: { actual, expected } };
      }
      const error = Math.abs(angleDelta(actual, expected));
      const inside = Math.abs(actual) <= Math.PI + epsilon;
      const pass = error <= epsilon && inside;
      const message = pass ? "Angles match." : (error > epsilon ? "Yaw differs by " + error.toPrecision(4) + " rad." : "Same direction, but " + actual.toFixed(3) + " lies outside [-π, π]; wrap it.");
      return { pass, message, delta: { path: "result", error, actual, expected } };
    }
    if (comparator === "quaternion") return compareQuaternion(actual, expected, epsilon, "result");
    if (comparator === "se3" && actual && expected) {
      const translation = compareValue(actual.translation, expected.translation, epsilon, "result.translation", new Set());
      if (!translation.pass) return translation;
      return compareQuaternion(actual.rotation, expected.rotation, epsilon, "result.rotation");
    }
    if (comparator === "angles") return compareValue(actual, expected, epsilon, "result", null);
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
    if (result.learner.inputMutated && !puzzle.allowMutation) return liveResult("mutation", MUTATION_MESSAGE, { expected, actual: result.learner.value, error: { kind: "mutation", message: MUTATION_MESSAGE } });
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
      if (result.learner.inputMutated && !puzzle.allowMutation) return { pass: false, kind: "mutation", message: MUTATION_MESSAGE + " Case: " + testCase.label + ".", caseIndex: index, testCase };
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

  function loadProgress(storage, key) {
    try {
      const raw = storage.getItem(key || STORAGE_KEY);
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

  function saveProgress(storage, progress, key) {
    try {
      storage.setItem(key || STORAGE_KEY, JSON.stringify(progress));
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
    const settings = { workerUrl: "puzzle-worker.js", liveTimeoutMs: 250, checkTimeoutMs: 750, warmupTimeoutMs: 1500, createWorker: (url) => new Worker(url), ...(options || {}) };
    let worker = null;
    let cold = true;
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
      cold = true;
      worker.addEventListener("message", (event) => {
        const data = event.data;
        cold = false;
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
      // The first request after a worker (re)start also pays for script loading and compilation,
      // so it gets the warm-up budget; later requests keep the strict live/check timeouts.
      const timeoutMs = cold ? Math.max(next.timeoutMs, settings.warmupTimeoutMs) : next.timeoutMs;
      const timer = setTimeout(() => {
        if (!inflight || inflight.requestId !== requestId) return;
        const current = inflight;
        inflight = null;
        restartWorker();
        current.reject({ kind: "timeout", message: "Your function did not finish in " + timeoutMs + " ms. The runner was restarted." });
        pump();
      }, timeoutMs);
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
      if (puzzle.track !== "tf2" && !(puzzle.reference && typeof puzzle.reference.url === "string")) return { valid: false, message: puzzle.id + " needs a reference link." };
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

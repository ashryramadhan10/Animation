(function exposePuzzleEngine(root) {
  "use strict";

  const STORAGE_KEY = "tf2-puzzle-lab:v1";
  const SCHEMA_VERSION = 1;
  let requestSequence = 0;

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
    const entries = Array.isArray(value)
      ? value.map((item, index) => [index, item])
      : Object.entries(value);
    for (const [key, item] of entries) {
      const invalid = findNonFinite(item, currentPath + "." + key);
      if (invalid) return invalid;
    }
    return null;
  }

  function compareQuaternion(actual, expected, tolerance, path) {
    if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") {
      return { pass: false, message: path + " must be a quaternion", delta: null };
    }
    const keys = ["x", "y", "z", "w"];
    const direct = Math.max.apply(null, keys.map((key) => Math.abs(actual[key] - expected[key])));
    const negated = Math.max.apply(null, keys.map((key) => Math.abs(actual[key] + expected[key])));
    const error = Math.min(direct, negated);
    return {
      pass: Number.isFinite(error) && error <= tolerance,
      message: error <= tolerance ? "Quaternion matches." : path + " rotates differently.",
      delta: { path, error },
    };
  }

  function compareValue(actual, expected, tolerance, path, angleFields) {
    if (typeof expected === "number") {
      if (typeof actual !== "number" || !Number.isFinite(actual)) {
        return { pass: false, message: path + " must be a finite number", delta: { path, actual, expected } };
      }
      const lastKey = path.split(".").pop();
      const error = angleFields.has(lastKey)
        ? Math.abs(angleDelta(actual, expected))
        : Math.abs(actual - expected);
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
    if (nonFinitePath) {
      return { pass: false, message: nonFinitePath + " is not finite", delta: { path: nonFinitePath } };
    }

    if (comparator === "angle") {
      if (typeof actual !== "number" || typeof expected !== "number") {
        return { pass: false, message: "Return one yaw angle in radians.", delta: { actual, expected } };
      }
      const error = Math.abs(angleDelta(actual, expected));
      return { pass: error <= epsilon, message: error <= epsilon ? "Angles match." : "Yaw differs by " + error.toPrecision(4) + " rad.", delta: { path: "result", error, actual, expected } };
    }

    if (comparator === "se3" && actual && expected) {
      const translation = compareValue(actual.translation, expected.translation, epsilon, "result.translation", new Set());
      if (!translation.pass) return translation;
      return compareQuaternion(actual.rotation, expected.rotation, epsilon, "result.rotation");
    }

    const angleFields = new Set(comparator === "se2" || comparator === "deep" ? ["yaw"] : []);
    return compareValue(actual, expected, epsilon, "result", angleFields);
  }

  function createProgress() {
    return {
      schemaVersion: SCHEMA_VERSION,
      currentPuzzleId: "make-point",
      highestUnlocked: 0,
      sources: {},
      drafts: {},
      solved: {},
      hints: {},
      display: {},
    };
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
        !validRecord(progress.sources) ||
        !validRecord(progress.solved) ||
        !validRecord(progress.hints) ||
        !validRecord(progress.display)
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
    next.solved[puzzle.id] = {
      completedAt: now || new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };
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
    invalidated.forEach((id) => {
      delete next.sources[id];
      delete next.drafts[id];
      delete next.solved[id];
    });
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

  function dependencySources(puzzles, progress, puzzle) {
    return collectDependencyIds(puzzles, puzzle).map((id) => {
      const source = progress.sources[id];
      if (!source) {
        const error = new Error("Revisit " + id + " before using this component.");
        error.kind = "missing-dependency";
        error.dependencyId = id;
        throw error;
      }
      return source;
    });
  }

  function evaluateResults(puzzle, workerResponse, mode) {
    if (!workerResponse || !workerResponse.ok) {
      return {
        pass: false,
        kind: workerResponse && workerResponse.error ? workerResponse.error.kind : "worker",
        message: workerResponse && workerResponse.error ? workerResponse.error.message : "The code runner did not return a result.",
      };
    }
    const cases = mode === "check"
      ? puzzle.publicCases.concat(puzzle.checkCases)
      : puzzle.publicCases;
    for (let index = 0; index < cases.length; index += 1) {
      const result = workerResponse.results[index];
      if (!result) return { pass: false, kind: "worker", message: "The code runner skipped a case.", caseIndex: index };
      if (result.inputMutated) {
        return { pass: false, kind: "mutation", message: "Your function changed one of its inputs. Return a new value instead.", caseIndex: index };
      }
      const comparison = compareOutput(puzzle.comparator, result.value, cases[index].expected, puzzle.tolerance);
      if (!comparison.pass) {
        return {
          pass: false,
          kind: "mismatch",
          message: comparison.message,
          caseIndex: index,
          testCase: cases[index],
          actual: result.value,
          comparison,
        };
      }
    }
    return {
      pass: true,
      kind: "success",
      message: mode === "check" ? "All behaviors match." : "The visible example matches.",
      actual: workerResponse.results[0] ? workerResponse.results[0].value : null,
      testCase: cases[0] || null,
    };
  }

  function runPuzzleWorker(payload, options) {
    const settings = options || {};
    if (typeof Worker === "undefined") {
      return Promise.reject({ kind: "worker", message: "Web Workers require the lab to be opened through the local Python server." });
    }
    return new Promise((resolve, reject) => {
      const requestId = "puzzle-" + Date.now() + "-" + (++requestSequence);
      const worker = new Worker(settings.workerUrl || "puzzle-worker.js");
      const timer = setTimeout(() => {
        worker.terminate();
        reject({ kind: "timeout", message: "Your code took too long to finish." });
      }, settings.timeoutMs || 750);

      function finish(callback, value) {
        clearTimeout(timer);
        worker.terminate();
        callback(value);
      }

      worker.addEventListener("message", (event) => {
        if (!event.data || event.data.requestId !== requestId) return;
        finish(resolve, event.data);
      });
      worker.addEventListener("error", (event) => {
        finish(reject, { kind: "worker", message: event.message || "The code worker stopped unexpectedly." });
      });
      worker.postMessage({ ...payload, requestId });
    });
  }

  function validateCatalog(puzzles) {
    const seen = new Set();
    const required = ["id", "number", "stage", "title", "goal", "functionName", "signature", "starterSource", "hints", "publicCases", "checkCases", "comparator", "preview", "walkthroughChapter", "referenceSource"];
    for (let index = 0; index < puzzles.length; index += 1) {
      const puzzle = puzzles[index];
      const missing = required.find((key) => puzzle[key] === undefined || puzzle[key] === null);
      if (missing) return { valid: false, message: puzzle.id + " is missing " + missing };
      if (puzzle.number !== index + 1) return { valid: false, message: puzzle.id + " has the wrong number." };
      const invalidDependency = puzzle.dependencies.find((id) => !seen.has(id));
      if (invalidDependency) return { valid: false, message: puzzle.id + " has an unknown or forward dependency: " + invalidDependency };
      seen.add(puzzle.id);
    }
    return { valid: true, message: puzzles.length + " puzzles ready." };
  }

  const api = Object.freeze({
    STORAGE_KEY,
    SCHEMA_VERSION,
    compareOutput,
    createProgress,
    loadProgress,
    saveProgress,
    completePuzzle,
    dependentPuzzleIds,
    resetPuzzle,
    collectDependencyIds,
    dependencySources,
    evaluateResults,
    runPuzzleWorker,
    validateCatalog,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

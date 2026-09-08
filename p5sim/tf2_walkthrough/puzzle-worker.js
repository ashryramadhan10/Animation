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

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

  // p5-style math helpers, so learners can write PI, cos(yaw), dist(...) the way a sketch would.
  // They live in an outer scope, so learner code may freely declare its own PI, map, or dist.
  const MATH_PRELUDE = [
    "var PI = Math.PI, TWO_PI = Math.PI * 2, TAU = Math.PI * 2, HALF_PI = Math.PI / 2, QUARTER_PI = Math.PI / 4;",
    "var sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, acos = Math.acos, atan = Math.atan, atan2 = Math.atan2;",
    "var sqrt = Math.sqrt, pow = Math.pow, abs = Math.abs, floor = Math.floor, ceil = Math.ceil, round = Math.round;",
    "var exp = Math.exp, log = Math.log, min = Math.min, max = Math.max;",
    "var sq = function (n) { return n * n; };",
    "var radians = function (d) { return d * Math.PI / 180; };",
    "var degrees = function (r) { return r * 180 / Math.PI; };",
    "var constrain = function (n, low, high) { return Math.max(low, Math.min(high, n)); };",
    "var lerp = function (start, stop, amount) { return start + (stop - start) * amount; };",
    "var norm = function (n, start, stop) { return (n - start) / (stop - start); };",
    "var map = function (n, start1, stop1, start2, stop2) { return start2 + (stop2 - start2) * ((n - start1) / (stop1 - start1)); };",
    "var dist = function () { var a = arguments; return a.length >= 6 ? Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2]) : Math.hypot(a[2] - a[0], a[3] - a[1]); };",
    "var mag = function (x, y, z) { return Math.hypot(x, y, z || 0); };",
  ].join("\n");

  function compileScope(functionName, source, dependencySources) {
    try {
      const body = [
        "\"use strict\";",
        ...(dependencySources || []),
        source || "",
        "return typeof " + functionName + " === \"function\" ? " + functionName + " : null;",
      ].join("\n");
      const fn = new Function(MATH_PRELUDE + "\nreturn (function () {\n" + body + "\n})();")();
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

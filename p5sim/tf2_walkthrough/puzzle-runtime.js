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

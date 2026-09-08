"use strict";

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
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

self.addEventListener("message", (event) => {
  const message = event.data || {};
  let learnerFunction;
  try {
    const source = [
      "\"use strict\";",
      ...(message.dependencySources || []),
      message.source || "",
      "return typeof " + message.functionName + " === \"function\" ? " + message.functionName + " : null;",
    ].join("\n");
    learnerFunction = new Function(source)();
  } catch (error) {
    self.postMessage({ requestId: message.requestId, ok: false, error: { kind: "syntax", message: errorMessage(error) } });
    return;
  }

  if (typeof learnerFunction !== "function") {
    self.postMessage({ requestId: message.requestId, ok: false, error: { kind: "missing-function", message: "Define " + message.functionName + " with the shown signature." } });
    return;
  }

  const results = [];
  const cases = Array.isArray(message.cases) ? message.cases : [];
  for (let index = 0; index < cases.length; index += 1) {
    const args = cloneValue(cases[index].args);
    const before = JSON.stringify(args);
    let value;
    try {
      value = learnerFunction.apply(null, args);
    } catch (error) {
      self.postMessage({ requestId: message.requestId, ok: false, error: { kind: "runtime", message: errorMessage(error), caseIndex: index } });
      return;
    }
    if (!serializableValue(value, new Set())) {
      self.postMessage({ requestId: message.requestId, ok: false, error: { kind: "serialization", message: "Return finite JSON data, not a Promise, function, cycle, NaN, or Infinity.", caseIndex: index } });
      return;
    }
    results.push({ value: cloneValue(value), inputMutated: before !== JSON.stringify(args) });
  }

  self.postMessage({ requestId: message.requestId, ok: true, results });
});

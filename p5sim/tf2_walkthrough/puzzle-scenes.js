(function exposePuzzleScenes(root) {
  "use strict";

  const PI = Math.PI;
  const LANE_LEFT = -4.5;
  const LANE_RIGHT = 4.5;
  const LANE_TOP = -2.55;
  const LANE_GAP = 0.55;

  // ------------------------------------------------------------ SE(2) helpers
  function wrap(angle) {
    let result = (angle + PI) % (2 * PI);
    if (result < 0) result += 2 * PI;
    return result - PI;
  }
  function rotate(v, yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };
  }
  function applyPoint(t, p) {
    const r = rotate(p, t.yaw);
    return { x: r.x + t.x, y: r.y + t.y };
  }
  function compose(a, b) {
    const origin = applyPoint(a, b);
    return { x: origin.x, y: origin.y, yaw: wrap(a.yaw + b.yaw) };
  }
  function invert(t) {
    const shifted = rotate({ x: -t.x, y: -t.y }, -t.yaw);
    return { x: shifted.x, y: shifted.y, yaw: -t.yaw };
  }
  function identity() { return { x: 0, y: 0, yaw: 0 }; }
  function direction(yaw, length) { return { x: Math.cos(yaw) * (length || 1), y: Math.sin(yaw) * (length || 1) }; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function isPoint(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.x) && Number.isFinite(v.y); }
  function isTransform(v) { return isPoint(v) && Number.isFinite(v.yaw); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function fmt(n) { return Number.isFinite(n) ? n.toFixed(2) : "?"; }
  function degrees(r) { return Number.isFinite(r) ? (r * 180 / PI).toFixed(1) + "°" : "?"; }
  function fmtPoint(p) { return isPoint(p) ? "(" + fmt(p.x) + ", " + fmt(p.y) + ")" : "—"; }
  function fmtTransform(t) { return isTransform(t) ? "(" + fmt(t.x) + ", " + fmt(t.y) + ", " + degrees(t.yaw) + ")" : "—"; }
  function isQuaternion(q) { return Boolean(q) && typeof q === "object" && ["x", "y", "z", "w"].every((key) => Number.isFinite(q[key])); }
  function isVector3(v) { return Boolean(v) && typeof v === "object" && ["x", "y", "z"].every((key) => Number.isFinite(v[key])) && !("w" in v); }
  function fmtQuaternion(q) { return "(" + fmt(q.x) + ", " + fmt(q.y) + ", " + fmt(q.z) + ", " + fmt(q.w) + ")"; }
  function fmtVector3(v) { return "(" + fmt(v.x) + ", " + fmt(v.y) + ", " + fmt(v.z) + ")"; }
  function describe(value) {
    if (typeof value === "number") return fmt(value) + " rad (" + degrees(value) + ")";
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "number"))) {
      return "[" + value.map((row) => row.map(fmt).join(" ")).join("; ") + "]";
    }
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) return value.join(" → ");
      if (value.every((item) => item && typeof item === "object" && "from" in item)) return value.map((step) => (step.inverse ? "inv " : "") + step.from + "→" + step.to).join(", ");
      return JSON.stringify(value).slice(0, 64);
    }
    if (typeof value === "object") {
      if ("ok" in value) {
        if (!value.ok) return value.code + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "");
        const when = Number.isFinite(value.time) ? " · t=" + fmt(value.time) : (Number.isFinite(value.targetTime) ? " · t₁=" + fmt(value.targetTime) + " t₂=" + fmt(value.sourceTime) : "");
        return "ok" + when + (value.transform ? " · " + fmtTransform(value.transform) : "") + (value.bounds ? " · bounds [" + fmt(value.bounds.start) + ", " + fmt(value.bounds.end) + "]" : "");
      }
      if ("valid" in value) return value.valid ? "valid" : String(value.code);
      if ("beforeIndex" in value) return "before " + value.beforeIndex + " · after " + value.afterIndex + " · amount " + fmt(value.amount);
      if (Array.isArray(value.indexes) && Number.isFinite(value.error)) return "error " + fmt(value.error) + " · " + value.indexes.length + " pairs";
      if (value.transform && Number.isFinite(value.error)) return fmtTransform(value.transform) + " · error " + fmt(value.error);
      if ("roll" in value && "pitch" in value && "yaw" in value) return "roll " + degrees(value.roll) + " · pitch " + degrees(value.pitch) + " · yaw " + degrees(value.yaw);
      if (value.translation && value.rotation) return "t=" + fmtVector3(value.translation) + " q=" + fmtQuaternion(value.rotation);
      if (isQuaternion(value)) return fmtQuaternion(value);
      if (isTransform(value)) return fmtTransform(value);
      if (isVector3(value)) return fmtVector3(value);
      if (isPoint(value)) return fmtPoint(value);
      const children = Object.keys(value);
      if (children.length && children.every((child) => value[child] && typeof value[child] === "object" && "parent" in value[child])) return children.map((child) => value[child].parent + "→" + child).join(", ");
    }
    const text = JSON.stringify(value);
    return text.length > 64 ? text.slice(0, 61) + "…" : text;
  }

  // ------------------------------------------------------------ primitives
  function frame(transform, label, style, options) { return { kind: "frame", transform, label, style, ...(options || {}) }; }
  function point(at, label, style, options) { return { kind: "point", at, label, style, ...(options || {}) }; }
  function arrow(from, to, style, options) { return { kind: "arrow", from, to, style, ...(options || {}) }; }
  function arc(center, radius, from, to, style, options) { return { kind: "arc", center, radius, from, to, style, ...(options || {}) }; }
  function label(text, style, options) { return { kind: "label", text, style, ...(options || {}) }; }
  function glyph(pose, text, style, options) { return { kind: "glyph", pose, label: text, style, ...(options || {}) }; }
  function lane(from, to, style, options) { return { kind: "lane", from, to, style, ...(options || {}) }; }
  function marker(at, text, style, options) { return { kind: "marker", at, label: text, style, ...(options || {}) }; }
  function shade(from, to, style, options) { return { kind: "shade", from, to, style, ...(options || {}) }; }

  function passing(context) { return Boolean(context.comparison && context.comparison.pass); }
  function resultStyle(context) { return passing(context) ? "match" : "actual"; }
  function resultLabel(context) { return passing(context) ? "match" : "yours"; }
  function errorArrow(context, from, to) {
    return isPoint(from) && isPoint(to) && !passing(context) ? [arrow(from, to, "actual", { dashed: true, weight: 1 })] : [];
  }
  function notes(context, expectedText, actualText, extra) {
    const rows = [label("expected: " + expectedText, "expected", { row: 0 }), label("yours: " + actualText, context.error ? "actual" : resultStyle(context), { row: 1 })];
    if (context.error) {
      const detail = typeof context.error.message === "string" && context.error.message ? context.error.message : "your function did not produce a value";
      rows.push(label("⚠ " + context.error.kind + ": " + (detail.length > 70 ? detail.slice(0, 67) + "…" : detail), "actual", { row: 2 }));
    }
    else if (context.diagnosis) rows.push(label("⚠ " + context.diagnosis.id, "actual", { row: 2 }));
    (extra || []).forEach((text, index) => rows.push(label(text, "muted", { row: 3 + index })));
    return rows;
  }

  // ------------------------------------------------------------ handle geometry
  function handleDefs(puzzle) { return puzzle.scene.handles; }
  function findHandle(puzzle, id) { return handleDefs(puzzle).find((entry) => entry.id === id) || null; }
  function initialValues(puzzle) {
    const values = {};
    handleDefs(puzzle).forEach((entry) => { values[entry.id] = clone(entry.value); });
    return values;
  }
  function parentWorld(puzzle, values, handle) {
    if (!handle || !handle.in) return identity();
    const parent = findHandle(puzzle, handle.in);
    return compose(parentWorld(puzzle, values, parent), values[parent.id]);
  }
  function handleWorld(puzzle, values, id) {
    const handle = findHandle(puzzle, id);
    return compose(parentWorld(puzzle, values, handle), values[id]);
  }
  function laneRange(handle) {
    return { lo: Number.isFinite(handle.start) ? handle.start : handle.min, hi: Number.isFinite(handle.end) ? handle.end : handle.max };
  }
  function laneY(puzzle, handle) {
    const lanes = handleDefs(puzzle).filter((entry) => entry.type === "slider" || entry.type === "timeline");
    return LANE_TOP - lanes.indexOf(handle) * LANE_GAP;
  }
  function laneX(handle, value) {
    const range = laneRange(handle);
    return LANE_LEFT + (value - range.lo) / (range.hi - range.lo) * (LANE_RIGHT - LANE_LEFT);
  }
  function laneValue(handle, x) {
    const range = laneRange(handle);
    const t = Math.max(0, Math.min(1, (x - LANE_LEFT) / (LANE_RIGHT - LANE_LEFT)));
    return range.lo + t * (range.hi - range.lo);
  }
  function dialCenter(handle) { return handle.center || { x: 0, y: 0 }; }
  function dialRadius(handle) { return handle.radius || 1.7; }

  function grips(puzzle, values) {
    const list = [];
    handleDefs(puzzle).forEach((handle) => {
      const value = values[handle.id];
      const world = parentWorld(puzzle, values, handle);
      if (handle.type === "frame" || handle.type === "pose") {
        list.push({ handleId: handle.id, grip: "origin", at: applyPoint(world, value), radius: 0.3 });
        list.push({ handleId: handle.id, grip: "heading", at: applyPoint(world, add(value, direction(value.yaw, 1))), radius: 0.22 });
      } else if (handle.type === "point") {
        list.push({ handleId: handle.id, grip: "point", at: applyPoint(world, value), radius: 0.26 });
      } else if (handle.type === "vector") {
        list.push({ handleId: handle.id, grip: "tip", at: applyPoint(world, value), radius: 0.26 });
      } else if (handle.type === "dial") {
        const center = dialCenter(handle);
        list.push({ handleId: handle.id, grip: "knob", at: add(center, direction(value, dialRadius(handle))), radius: 0.24 });
      } else if (handle.type === "slider" || handle.type === "timeline") {
        list.push({ handleId: handle.id, grip: "knob", at: { x: laneX(handle, value), y: laneY(puzzle, handle) }, radius: 0.24 });
      }
    });
    return list;
  }

  function dragHandle(puzzle, values, grip, worldPoint) {
    const handle = findHandle(puzzle, grip.handleId);
    const next = clone(values);
    const local = applyPoint(invert(parentWorld(puzzle, values, handle)), worldPoint);
    const current = values[handle.id];
    if (handle.type === "frame" || handle.type === "pose") {
      next[handle.id] = grip.grip === "origin"
        ? { x: local.x, y: local.y, yaw: current.yaw }
        : { x: current.x, y: current.y, yaw: Math.atan2(local.y - current.y, local.x - current.x) };
    } else if (handle.type === "point" || handle.type === "vector") {
      next[handle.id] = { x: local.x, y: local.y };
    } else if (handle.type === "dial") {
      const center = dialCenter(handle);
      const angle = Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x);
      next[handle.id] = handle.accumulate ? current + wrap(angle - current) : angle;
    } else if (handle.type === "slider" || handle.type === "timeline") {
      next[handle.id] = laneValue(handle, worldPoint.x);
    }
    return next;
  }

  function laneLayers(puzzle, values) {
    const out = [];
    handleDefs(puzzle).filter((handle) => handle.type === "slider" || handle.type === "timeline").forEach((handle) => {
      const y = laneY(puzzle, handle);
      const range = laneRange(handle);
      out.push(lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: handle.label, marks: [{ at: { x: LANE_LEFT, y }, label: fmt(range.lo) }, { at: { x: LANE_RIGHT, y }, label: fmt(range.hi) }] }));
      out.push(marker({ x: laneX(handle, values[handle.id]), y }, fmt(values[handle.id]), "input", { height: 0.22 }));
    });
    return out;
  }

  // ------------------------------------------------------------ argument building
  function resolveArg(spec, puzzle, values, fixtures) {
    if (spec && typeof spec === "object" && spec.handle) return clone(values[spec.handle]);
    if (spec && typeof spec === "object" && spec.fixture) {
      const fixture = fixtures[spec.fixture];
      if (!fixture) throw new Error("Unknown fixture " + spec.fixture + " for scene " + puzzle.scene.kind);
      return clone(fixture(values, puzzle));
    }
    return clone(spec);
  }
  function toArgs(puzzle, values) {
    const scene = SCENES[puzzle.scene.kind];
    if (!scene) throw new Error("Unknown scene kind " + puzzle.scene.kind);
    const specs = puzzle.scene.args || handleDefs(puzzle).map((handle) => ({ handle: handle.id }));
    return specs.map((spec) => resolveArg(spec, puzzle, values, scene.fixtures || {}));
  }

  // ------------------------------------------------------------ 2D scene kinds
  function valueDirection(value, length) {
    if (typeof value === "number" && Number.isFinite(value)) return direction(value, length);
    if (isPoint(value)) return { x: value.x, y: value.y };
    return null;
  }
  function angleNumberLine(context) {
    const y = LANE_TOP;
    const toX = (angle) => LANE_LEFT + (angle + 3 * PI) / (6 * PI) * (LANE_RIGHT - LANE_LEFT);
    const out = [
      shade({ x: toX(-PI), y: y - 0.2 }, { x: toX(PI), y: y + 0.2 }, "expected"),
      lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: "angle number line", marks: [{ at: { x: toX(-PI), y }, label: "−π" }, { at: { x: toX(0), y }, label: "0" }, { at: { x: toX(PI), y }, label: "π" }] }),
    ];
    if (typeof context.expected === "number") out.push(marker({ x: toX(context.expected), y }, "expected", "expected", { height: 0.3, dashed: true }));
    if (typeof context.actual === "number" && Number.isFinite(context.actual)) {
      const clamped = Math.max(-3 * PI, Math.min(3 * PI, context.actual));
      out.push(marker({ x: toX(clamped), y }, resultLabel(context), resultStyle(context), { height: 0.3 }));
    }
    return out;
  }
  const dialScene = {
    fixtures: {},
    layers(context) {
      const handle = handleDefs(context.puzzle)[0];
      const value = context.values[handle.id];
      const center = dialCenter(handle);
      const radius = dialRadius(handle);
      const out = [arc(center, radius, 0, value, "input", { track: true }), arrow(center, add(center, direction(value, radius)), "input")];
      out.push(label(handle.label + " = " + fmt(value) + " rad", "input", { at: add(center, direction(value, radius + 0.55)) }));
      const expectedDir = valueDirection(context.expected, 1.2);
      const actualDir = valueDirection(context.actual, 1.2);
      if (expectedDir) { out.push(arrow(center, add(center, expectedDir), "expected", { dashed: true })); out.push(point(add(center, expectedDir), "expected", "expected", { dashed: true })); }
      if (actualDir) { out.push(arrow(center, add(center, actualDir), resultStyle(context), { weight: 3 })); out.push(point(add(center, actualDir), resultLabel(context), resultStyle(context))); }
      if (expectedDir && actualDir) out.push(...errorArrow(context, add(center, actualDir), add(center, expectedDir)));
      if (typeof context.expected === "number" || typeof context.actual === "number") out.push(...angleNumberLine(context));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const vectorScene = {
    fixtures: {},
    layers(context) {
      const v = context.values.v;
      const out = [arrow({ x: 0, y: 0 }, v, "input", { weight: 3 }), label("v = " + fmtPoint(v), "input", { at: add(v, { x: 0.2, y: 0.25 }) })];
      if (typeof context.expected === "number") { out.push(arc({ x: 0, y: 0 }, 1.3, 0, context.expected, "expected", { dashed: true })); out.push(arrow({ x: 0, y: 0 }, direction(context.expected, 1.3), "expected", { dashed: true })); }
      if (typeof context.actual === "number" && Number.isFinite(context.actual)) { out.push(arc({ x: 0, y: 0 }, 1.0, 0, context.actual, resultStyle(context))); out.push(arrow({ x: 0, y: 0 }, direction(context.actual, 1.0), resultStyle(context), { weight: 3 })); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const vectorDialScene = {
    fixtures: {},
    layers(context) {
      const v = context.values.v;
      const yaw = context.values.yaw;
      const dial = findHandle(context.puzzle, "yaw");
      const out = [arrow({ x: 0, y: 0 }, v, "muted", { weight: 2 }), label("v", "muted", { at: add(v, { x: 0.15, y: 0.2 }) }), arc({ x: 0, y: 0 }, dialRadius(dial), 0, yaw, "input", { track: true }), label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(dial) + 0.5) })];
      if (isPoint(context.expected)) { out.push(arrow({ x: 0, y: 0 }, context.expected, "expected", { dashed: true })); out.push(point(context.expected, "expected", "expected", { dashed: true })); }
      if (isPoint(context.actual)) { out.push(arrow({ x: 0, y: 0 }, context.actual, resultStyle(context), { weight: 3 })); out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const twoDialsScene = {
    fixtures: {},
    layers(context) {
      const fromHandle = findHandle(context.puzzle, "from");
      const toHandle = findHandle(context.puzzle, "to");
      const from = context.values.from;
      const to = context.values.to;
      const out = [
        arrow({ x: 0, y: 0 }, direction(from, dialRadius(fromHandle)), "muted", { weight: 2 }), label("from " + degrees(from), "muted", { at: direction(from, dialRadius(fromHandle) + 0.45) }),
        arrow({ x: 0, y: 0 }, direction(to, dialRadius(toHandle)), "input", { weight: 2 }), label("to " + degrees(to), "input", { at: direction(to, dialRadius(toHandle) + 0.45) }),
      ];
      if (typeof context.expected === "number") out.push(arc({ x: 0, y: 0 }, 1.2, from, from + context.expected, "expected", { dashed: true, arrowhead: true }));
      if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arc({ x: 0, y: 0 }, 0.9, from, from + context.actual, resultStyle(context), { arrowhead: true }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  function frameSceneBase(context) {
    const transform = context.values.transform;
    return [frame(identity(), "target", "muted"), frame(transform, "source", "input"), label("T_target_source = " + fmtTransform(transform), "muted", { row: 3 })];
  }
  const framePointScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.point;
      const world = applyPoint(transform, local);
      const out = frameSceneBase(context);
      out.push(arrow(transform, world, "input", { dashed: true, weight: 1 }), point(world, "p = " + fmtPoint(local) + " in source", "input"));
      if (isPoint(context.expected)) out.push(point(context.expected, "expected in target", "expected", { dashed: true }));
      if (isPoint(context.actual)) { out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const frameVectorScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.vector;
      const tip = applyPoint(transform, local);
      const out = frameSceneBase(context);
      out.push(arrow(transform, tip, "input", { weight: 3 }), label("v = " + fmtPoint(local) + " in source", "input", { at: add(tip, { x: 0.15, y: 0.2 }) }));
      if (isPoint(context.expected)) out.push(arrow({ x: 0, y: 0 }, context.expected, "expected", { dashed: true }), point(context.expected, "expected in target", "expected", { dashed: true }));
      if (isPoint(context.actual)) { out.push(arrow({ x: 0, y: 0 }, context.actual, resultStyle(context), { weight: 3 })); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const framePoseScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const local = context.values.pose;
      const out = frameSceneBase(context);
      out.push(glyph(compose(transform, local), "pose " + fmtTransform(local) + " in source", "input"));
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected in target", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const frameChainScene = {
    fixtures: {},
    layers(context) {
      const aFromB = context.values.aFromB;
      const aFromC = compose(aFromB, context.values.bFromC);
      const out = [frame(identity(), "a", "muted"), frame(aFromB, "b", "input"), frame(aFromC, "c", "input", { alpha: 170 }), arrow(aFromB, aFromC, "input", { dashed: true, weight: 1 })];
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected aFromC", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(frame(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["aFromB = " + fmtTransform(aFromB), "bFromC = " + fmtTransform(context.values.bFromC)]));
      return out;
    },
  };
  const frameInverseScene = {
    fixtures: {},
    layers(context) {
      const transform = context.values.transform;
      const out = [frame(identity(), "a", "muted"), frame(transform, "b", "input"), label("b ∘ yours must land on a", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(frame(compose(transform, context.expected), "b ∘ expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { const placed = compose(transform, context.actual); out.push(frame(placed, "b ∘ yours", resultStyle(context))); out.push(...errorArrow(context, placed, identity())); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const twoFramesScene = {
    fixtures: {},
    layers(context) {
      const worldFromA = context.values.worldFromA;
      const worldFromB = context.values.worldFromB;
      const out = [frame(identity(), "world", "muted"), frame(worldFromA, "a", "input"), frame(worldFromB, "b", "input"), label("a ∘ yours must land on b", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(frame(compose(worldFromA, context.expected), "a ∘ expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { const placed = compose(worldFromA, context.actual); out.push(frame(placed, "a ∘ yours", resultStyle(context))); out.push(...errorArrow(context, placed, worldFromB)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const poseLerpScene = {
    fixtures: {},
    layers(context) {
      const a = context.values.a;
      const b = context.values.b;
      const out = [arrow(a, b, "muted", { dashed: true, weight: 1 }), glyph(a, "a " + degrees(a.yaw), "input"), glyph(b, "b " + degrees(b.yaw), "input"), ...laneLayers(context.puzzle, context.values)];
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const correctionScene = {
    fixtures: {
      mapFromBase: (values) => compose(values.odomInMap, values.odomFromBase),
    },
    layers(context) {
      const odomInMap = context.values.odomInMap;
      const odomFromBase = context.values.odomFromBase;
      const truePose = compose(odomInMap, odomFromBase);
      const out = [frame(identity(), "map", "muted"), frame(odomInMap, "odom (drifted)", "input"), glyph(truePose, "base_link", "input"), arrow(odomInMap, truePose, "input", { dashed: true, weight: 1 })];
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected map→odom", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        const placedBase = compose(context.actual, odomFromBase);
        out.push(frame(context.actual, "your map→odom", resultStyle(context)), glyph(placedBase, "base_link via yours", resultStyle(context), { dashed: true }));
        out.push(...errorArrow(context, placedBase, truePose));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["mapFromBase (localizer) = " + fmtTransform(truePose), "odomFromBase (odometry) = " + fmtTransform(odomFromBase)]));
      return out;
    },
  };

  // ------------------------------------------------------------ structural fixtures
  const ROBOT_TREE = {
    odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } },
    base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } },
    laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } },
    camera: { parent: "base_link", transform: { x: 0.5, y: 0.3, yaw: 0 } },
  };
  const ROBOT_EDGES = {
    odom: { parent: "map", child: "odom", transform: ROBOT_TREE.odom.transform },
    base_link: { parent: "odom", child: "base_link", transform: ROBOT_TREE.base_link.transform },
    laser: { parent: "base_link", child: "laser", transform: ROBOT_TREE.laser.transform },
    camera: { parent: "base_link", child: "camera", transform: ROBOT_TREE.camera.transform },
  };
  const EDGE_SETS = {
    "valid-chain": [{ parent: "map", child: "odom" }, { parent: "odom", child: "base_link" }, { parent: "base_link", child: "laser" }],
    "duplicate-parent": [{ parent: "map", child: "base_link" }, { parent: "odom", child: "base_link" }],
    "cycle": [{ parent: "map", child: "odom" }, { parent: "odom", child: "base_link" }, { parent: "base_link", child: "map" }],
  };
  function treePrimitive(nodes, edges, steps, options) { return { kind: "tree", nodes, edges, steps: steps || [], ...(options || {}) }; }
  function treeEdges(tree) {
    if (!tree || typeof tree !== "object" || Array.isArray(tree)) return [];
    return Object.keys(tree).filter((child) => tree[child] && typeof tree[child].parent === "string").map((child) => ({ parent: tree[child].parent, child }));
  }
  function edgeKey(edge) { return edge.parent + ">" + edge.child; }
  function nodeNames(edges) {
    const names = [];
    edges.forEach((edge) => { [edge.parent, edge.child].forEach((name) => { if (!names.includes(name)) names.push(name); }); });
    return names;
  }
  const treeScene = {
    fixtures: {
      tree: () => ROBOT_TREE,
      treeWithoutEdge: (values) => { const copy = { ...ROBOT_TREE }; delete copy[values.edge]; return copy; },
      selectedEdge: (values) => ROBOT_EDGES[values.edge],
      edgeSet: (values) => EDGE_SETS[values.edgeSet],
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [];
      if (view === "validation") {
        const edges = Array.isArray(context.args[0]) ? context.args[0] : [];
        const counts = {};
        edges.forEach((edge) => { counts[edge.child] = (counts[edge.child] || 0) + 1; });
        const styledEdges = edges.map((edge) => ({ ...edge, style: counts[edge.child] > 1 ? "accent" : "input" }));
        out.push(treePrimitive(nodeNames(edges).map((id) => ({ id, style: "input" })), styledEdges, [], { caption: "edge set: " + context.values.edgeSet }));
      } else if (view === "tree-result") {
        const baseEdges = treeEdges(context.args[0]);
        const baseKeys = new Set(baseEdges.map(edgeKey));
        const expectedEdges = treeEdges(context.expected).filter((edge) => !baseKeys.has(edgeKey(edge)));
        const actualEdges = treeEdges(context.actual).filter((edge) => !baseKeys.has(edgeKey(edge)));
        const edges = baseEdges.map((edge) => ({ ...edge, style: "muted" }))
          .concat(expectedEdges.map((edge) => ({ ...edge, style: "expected", dashed: true })))
          .concat(actualEdges.map((edge) => ({ ...edge, style: resultStyle(context) })));
        out.push(treePrimitive(nodeNames(edges).map((id) => ({ id, style: "muted" })), edges, [], { caption: "adding " + context.values.edge }));
      } else {
        const baseEdges = treeEdges(context.args[0]).map((edge) => ({ ...edge, style: "muted" }));
        const names = nodeNames(baseEdges);
        const expectedNames = new Set(Array.isArray(context.expected) ? context.expected : (typeof context.expected === "string" ? [context.expected] : []));
        const actualNames = new Set(Array.isArray(context.actual) && view !== "steps" ? context.actual : (typeof context.actual === "string" ? [context.actual] : []));
        const nodes = names.map((id) => ({
          id,
          style: actualNames.has(id) ? resultStyle(context) : (context.args.slice(1).includes(id) ? "input" : "muted"),
          expected: expectedNames.has(id),
        }));
        const steps = [];
        if (view === "steps") {
          (Array.isArray(context.expected) ? context.expected : []).forEach((step) => steps.push({ from: step.from, to: step.to, inverse: Boolean(step.inverse), style: "expected", dashed: true }));
          (Array.isArray(context.actual) ? context.actual : []).forEach((step) => steps.push({ from: step.from, to: step.to, inverse: Boolean(step.inverse), style: resultStyle(context) }));
        }
        out.push(treePrimitive(nodes, baseEdges, steps, { caption: context.args.slice(1).join(" · ") }));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ robot chain
  const LASER_MOUNT = { x: 0.6, y: 0, yaw: 0 };
  const LANDMARK = { x: 3.5, y: 2.5 };
  function chainWorld(values, name) {
    if (name === "map") return identity();
    if (name === "odom") return values.odom;
    const base = compose(values.odom, values.base_link);
    if (name === "base_link") return base;
    return compose(base, LASER_MOUNT);
  }
  function chainLayers(values, style) {
    const tone = style || "input";
    const base = chainWorld(values, "base_link");
    const laser = chainWorld(values, "laser");
    return [frame(identity(), "map", "muted"), frame(values.odom, "odom", tone), arrow(values.odom, base, tone, { dashed: true, weight: 1 }), glyph(base, "base_link", tone), frame(laser, "laser", tone, { alpha: 170, size: 0.55 })];
  }
  function lookupLayers(context, worldOf, target, source, expected, actual) {
    const out = [];
    if (isTransform(expected)) out.push(frame(compose(worldOf(target), expected), target + " ∘ expected", "expected", { dashed: true }));
    if (isTransform(actual)) {
      const placed = compose(worldOf(target), actual);
      out.push(frame(placed, target + " ∘ yours", resultStyle(context)));
      out.push(...errorArrow(context, placed, worldOf(source)));
    }
    out.push(label("lookup(" + target + ", " + source + ") drawn from " + target + " must land on " + source, "muted", { row: 3 }));
    return out;
  }
  const robotChainScene = {
    fixtures: {
      chainTree: (values) => ({ odom: { parent: "map", transform: values.odom }, base_link: { parent: "odom", transform: values.base_link }, laser: { parent: "base_link", transform: LASER_MOUNT } }),
      laserHit: (values) => applyPoint(invert(chainWorld(values, "laser")), LANDMARK),
    },
    layers(context) {
      const out = chainLayers(context.values);
      if (context.puzzle.scene.view === "landmark") {
        const laser = chainWorld(context.values, "laser");
        const hit = applyPoint(invert(laser), LANDMARK);
        out.push(point(LANDMARK, "landmark", "accent"), arrow(laser, LANDMARK, "muted", { dashed: true, weight: 1 }), label("hit in laser = " + fmtPoint(hit), "muted", { row: 3 }));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected in map", "expected", { dashed: true }));
        if (isPoint(context.actual)) { out.push(point(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      } else {
        out.push(...lookupLayers(context, (name) => chainWorld(context.values, name), context.values.target, context.values.source, context.expected, context.actual));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ timelines
  const SAMPLES = [
    { time: 0, transform: { x: -3.5, y: 0.8, yaw: 0 } },
    { time: 2, transform: { x: -1.5, y: 1.6, yaw: 0.6 } },
    { time: 5, transform: { x: 0.8, y: 1.2, yaw: 1.2 } },
    { time: 9, transform: { x: 3.2, y: 0.5, yaw: 2.0 } },
  ];
  const DYNAMIC_EDGE = { parent: "map", child: "odom", samples: [
    { time: 0, transform: { x: -3, y: 0.5, yaw: 0 } },
    { time: 4, transform: { x: 0, y: 1.6, yaw: PI / 2 } },
    { time: 10, transform: { x: 3, y: 0.5, yaw: PI } },
  ] };
  const STATIC_EDGE = { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1.5, y: 0.8, yaw: PI / 4 } };
  const RANGES = [{ start: 2, end: 8 }, { start: 4, end: 9 }];
  const STAMPED_EDGES = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: -2, y: -0.5, yaw: 0 } }, { time: 5, transform: { x: 0, y: 0.5, yaw: 0.4 } }, { time: 10, transform: { x: 2, y: 1, yaw: 0.9 } }] },
    { parent: "odom", child: "base_link", samples: [{ time: 2, transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, transform: { x: 2, y: 0.5, yaw: 0.5 } }, { time: 9, transform: { x: 2.5, y: 1, yaw: 1.0 } }] },
    { parent: "base_link", child: "laser", isStatic: true, transform: LASER_MOUNT },
  ];
  function bracket(samples, time) {
    const last = samples.length - 1;
    if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };
    if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };
    let i = 0;
    while (samples[i + 1].time <= time) i += 1;
    return { beforeIndex: i, afterIndex: i + 1, amount: (time - samples[i].time) / (samples[i + 1].time - samples[i].time) };
  }
  function lerpTransform(a, b, amount) {
    return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrap(a.yaw + wrap(b.yaw - a.yaw) * amount) };
  }
  function sampleAt(edge, time) {
    if (edge.isStatic) return edge.transform;
    const b = bracket(edge.samples, time);
    return lerpTransform(edge.samples[b.beforeIndex].transform, edge.samples[b.afterIndex].transform, b.amount);
  }
  function sampleMarks(puzzle, handle, samples) {
    const y = laneY(puzzle, handle);
    return samples.map((sample) => marker({ x: laneX(handle, sample.time), y }, "t=" + sample.time, "muted", { height: 0.18 }));
  }
  function rangeLane(handle, range, y, text, style) {
    return [
      lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: text }),
      lane({ x: laneX(handle, range.start), y }, { x: laneX(handle, range.end), y }, style || "input", { weight: 4 }),
      marker({ x: laneX(handle, range.start), y }, fmt(range.start), "muted", { height: 0.14 }),
      marker({ x: laneX(handle, range.end), y }, fmt(range.end), "muted", { height: 0.14 }),
    ];
  }
  const timelineScene = {
    fixtures: { samples: () => SAMPLES },
    layers(context) {
      const handle = findHandle(context.puzzle, "time");
      const y = laneY(context.puzzle, handle);
      const out = laneLayers(context.puzzle, context.values).concat(sampleMarks(context.puzzle, handle, SAMPLES));
      SAMPLES.forEach((sample) => out.push(frame(sample.transform, "t=" + sample.time, "muted", { alpha: 120, size: 0.6 })));
      const drawBracket = (value, style, dashed) => {
        if (!value || !Number.isInteger(value.beforeIndex) || !Number.isInteger(value.afterIndex) || !SAMPLES[value.beforeIndex] || !SAMPLES[value.afterIndex]) return;
        const x0 = laneX(handle, SAMPLES[value.beforeIndex].time);
        const x1 = laneX(handle, SAMPLES[value.afterIndex].time);
        const offset = dashed ? 0.3 : 0.5;
        out.push(lane({ x: x0, y: y + offset }, { x: x1, y: y + offset }, style, { weight: 3, dashed }));
        if (Number.isFinite(value.amount)) out.push(marker({ x: x0 + (x1 - x0) * Math.max(0, Math.min(1, value.amount)), y: y + offset }, dashed ? "expected" : resultLabel(context), style, { height: 0.16, dashed }));
      };
      drawBracket(context.expected, "expected", true);
      drawBracket(context.actual, resultStyle(context), false);
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const timelineRangesScene = {
    fixtures: { ranges: () => RANGES, requestedOrNull: (values) => (values.mode === "latest" ? null : values.requested) },
    layers(context) {
      const handle = findHandle(context.puzzle, "requested");
      const y = laneY(context.puzzle, handle);
      const out = laneLayers(context.puzzle, context.values);
      RANGES.forEach((range, index) => out.push(...rangeLane(handle, range, -1.2 - index * 0.6, "edge " + (index + 1) + " history [" + range.start + ", " + range.end + "]")));
      const start = Math.max(...RANGES.map((range) => range.start));
      const end = Math.min(...RANGES.map((range) => range.end));
      if (start <= end) out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"), label("common interval [" + start + ", " + end + "]", "expected", { at: { x: laneX(handle, start), y: -0.6 } }));
      if (context.values.mode === "latest") out.push(label("requested: latest (null)", "input", { at: { x: LANE_LEFT, y: y - 0.45 } }));
      if (context.expected && context.expected.ok && Number.isFinite(context.expected.time)) out.push(marker({ x: laneX(handle, context.expected.time), y }, "expected time", "expected", { height: 0.4, dashed: true }));
      if (context.actual && context.actual.ok && Number.isFinite(context.actual.time)) out.push(marker({ x: laneX(handle, context.actual.time), y }, resultLabel(context), resultStyle(context), { height: 0.32 }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const timelineFrameScene = {
    fixtures: { edge: (values) => (values.edgeKind === "static" ? STATIC_EDGE : DYNAMIC_EDGE) },
    layers(context) {
      const handle = findHandle(context.puzzle, "time");
      const edge = context.values.edgeKind === "static" ? STATIC_EDGE : DYNAMIC_EDGE;
      const out = laneLayers(context.puzzle, context.values);
      if (edge.isStatic) {
        out.push(frame(edge.transform, "static edge", "muted", { alpha: 140 }), label("static: valid at every time", "muted", { row: 3 }));
      } else {
        out.push(...sampleMarks(context.puzzle, handle, edge.samples));
        edge.samples.forEach((sample) => out.push(frame(sample.transform, "t=" + sample.time, "muted", { alpha: 120, size: 0.6 })));
      }
      if (isTransform(context.expected)) out.push(frame(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) { out.push(frame(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  function sampledChain(time) {
    const sampled = {};
    STAMPED_EDGES.forEach((edge) => { sampled[edge.child] = sampleAt(edge, time); });
    return { odom: sampled.odom, base_link: sampled.base_link };
  }
  function acrossTimeLayers(context) {
    const dynamic = STAMPED_EDGES.filter((edge) => !edge.isStatic);
    const start = Math.max(...dynamic.map((edge) => edge.samples[0].time));
    const end = Math.min(...dynamic.map((edge) => edge.samples[edge.samples.length - 1].time));
    const clamp = (t) => Math.max(start, Math.min(end, t));
    const targetTime = clamp(context.values.targetTime);
    const sourceTime = clamp(context.values.sourceTime);
    const targetChain = sampledChain(targetTime);
    const sourceChain = sampledChain(sourceTime);
    const handle = findHandle(context.puzzle, "targetTime");
    const out = chainLayers(targetChain, "muted").concat(chainLayers(sourceChain, "input"), laneLayers(context.puzzle, context.values));
    dynamic.forEach((edge, index) => out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, edge.parent + " → " + edge.child)));
    out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"));
    out.push(label("grey chain at t₁ = " + fmt(targetTime) + " · yellow chain at t₂ = " + fmt(sourceTime) + " · fixed frame: map", "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
    const target = context.values.target;
    const source = context.values.source;
    const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
    const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
    if (isTransform(expectedTransform)) out.push(frame(compose(chainWorld(targetChain, target), expectedTransform), target + "(t₁) ∘ expected", "expected", { dashed: true }));
    if (isTransform(actualTransform)) {
      const placed = compose(chainWorld(targetChain, target), actualTransform);
      out.push(frame(placed, target + "(t₁) ∘ yours", resultStyle(context)));
      out.push(...errorArrow(context, placed, chainWorld(sourceChain, source)));
    }
    out.push(label("drawn from " + target + " at t₁; must land on " + source + " at t₂", "muted", { row: 3 }));
    if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
    if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
    out.push(...notes(context, describe(context.expected), describe(context.actual)));
    return out;
  }
  const robotChainTimeScene = {
    fixtures: { stampedEdges: () => STAMPED_EDGES, requestedOrNull: (values) => (values.mode === "latest" ? null : values.time) },
    layers(context) {
      if (context.puzzle.scene.view === "across-time") return acrossTimeLayers(context);
      const handle = findHandle(context.puzzle, "time");
      const dynamic = STAMPED_EDGES.filter((edge) => !edge.isStatic);
      const start = Math.max(...dynamic.map((edge) => edge.samples[0].time));
      const end = Math.min(...dynamic.map((edge) => edge.samples[edge.samples.length - 1].time));
      const drawTime = context.values.mode === "latest" ? end : Math.max(start, Math.min(end, context.values.time));
      const sampled = {};
      STAMPED_EDGES.forEach((edge) => { sampled[edge.child] = sampleAt(edge, drawTime); });
      const chainValues = { odom: sampled.odom, base_link: sampled.base_link };
      const out = chainLayers(chainValues).concat(laneLayers(context.puzzle, context.values));
      dynamic.forEach((edge, index) => out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, edge.parent + " → " + edge.child)));
      out.push(shade({ x: laneX(handle, start), y: -2.0 }, { x: laneX(handle, end), y: -0.9 }, "expected"));
      out.push(label("chain drawn at t=" + fmt(drawTime) + (context.values.mode === "latest" ? " (latest)" : ""), "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
      const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
      const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
      out.push(...lookupLayers(context, (name) => chainWorld(chainValues, name), context.values.target, context.values.source, expectedTransform, actualTransform));
      if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
      if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ SE(3)
  function qmul(a, b) {
    return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z };
  }
  function qnormalize(q) {
    const length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    return length > 1e-9 ? { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length } : { x: 0, y: 0, z: 0, w: 1 };
  }
  function qrot(q, v) {
    const unit = qnormalize(q);
    const rotated = qmul(qmul(unit, { x: v.x, y: v.y, z: v.z, w: 0 }), { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w });
    return { x: rotated.x, y: rotated.y, z: rotated.z };
  }
  function axisAngle(axis, angle) {
    const s = Math.sin(angle / 2);
    return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) };
  }
  const AXIS_Y = { x: 0, y: 1, z: 0 };
  const AXIS_Z = { x: 0, y: 0, z: 1 };
  const ORIGIN3 = { x: 0, y: 0, z: 0 };
  function basisOf(q) { return { x: qrot(q, { x: 1, y: 0, z: 0 }), y: qrot(q, { x: 0, y: 1, z: 0 }), z: qrot(q, { x: 0, y: 0, z: 1 }) }; }
  function axes3d(origin, basis, text, style, options) { return { kind: "axes3d", origin, basis, label: text, style, ...(options || {}) }; }
  function arrow3d(from, to, text, style, options) { return { kind: "arrow3d", from, to, label: text, style, ...(options || {}) }; }
  function qconj(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w }; }
  function qFromRPY(roll, pitch, yaw) {
    return qmul(qmul(axisAngle(AXIS_Z, yaw), axisAngle(AXIS_Y, pitch)), axisAngle({ x: 1, y: 0, z: 0 }, roll));
  }
  function transform3(t, p) {
    const r = qrot(t.rotation, p);
    return { x: r.x + t.translation.x, y: r.y + t.translation.y, z: r.z + t.translation.z };
  }
  function compose3(a, b) { return { translation: transform3(a, b.translation), rotation: qmul(a.rotation, b.rotation) }; }
  function direction3(yaw, pitch) { return { x: Math.cos(pitch) * Math.cos(yaw), y: Math.cos(pitch) * Math.sin(yaw), z: Math.sin(pitch) }; }
  function bodyToOptical(v) { return { x: -v.y, y: -v.z, z: v.x }; }
  const OPTICAL_BASIS = { x: { x: 0, y: -1, z: 0 }, y: { x: 0, y: 0, z: -1 }, z: { x: 1, y: 0, z: 0 } };
  const IDENTITY_BASIS = basisOf({ x: 0, y: 0, z: 0, w: 1 });
  function isSE3(t) { return Boolean(t) && typeof t === "object" && isVector3(t.translation) && isQuaternion(t.rotation); }
  function isRPY(v) { return Boolean(v) && typeof v === "object" && ["roll", "pitch", "yaw"].every((key) => Number.isFinite(v[key])); }
  const se3Scene = {
    fixtures: {
      quatA: (values) => axisAngle(AXIS_Z, values.yawA),
      quatB: (values) => axisAngle(AXIS_Y, values.pitchB),
      quat: (values) => axisAngle(AXIS_Z, values.yaw),
      vector: () => ({ x: 1, y: 0.4, z: 0.2 }),
      aFromB: (values) => ({ translation: { x: 1, y: 0, z: 0 }, rotation: axisAngle(AXIS_Z, values.yawA) }),
      bFromC: (values) => ({ translation: { x: 1, y: 0, z: 0.5 }, rotation: axisAngle(AXIS_Y, values.pitchB) }),
      quatFromRPY: (values) => qFromRPY(values.roll, values.pitch, values.yaw),
      slerpA: (values) => axisAngle(AXIS_Z, values.yawA),
      slerpB: (values) => axisAngle(AXIS_Z, values.yawB),
      aFromBSliders: (values) => ({ translation: { x: 1, y: 0, z: 0.5 }, rotation: qmul(axisAngle(AXIS_Z, values.yaw), axisAngle(AXIS_Y, values.pitch)) }),
      point3: () => ({ x: 1, y: 0.4, z: 0.2 }),
      opticalRay: (values) => bodyToOptical(direction3(values.yaw, values.pitch)),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [axes3d(ORIGIN3, IDENTITY_BASIS, "world", "muted"), ...laneLayers(context.puzzle, context.values)];
      const drawBasis = (q, text, style, dashed) => out.push(axes3d(ORIGIN3, basisOf(q), text, style, dashed ? { dashed: true } : {}));
      if (view === "rotate") {
        const v = se3Scene.fixtures.vector();
        out.push(arrow3d(ORIGIN3, v, "v", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else if (view === "compose") {
        const aFromB = se3Scene.fixtures.aFromB(context.values);
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"));
        if (isSE3(context.expected)) out.push(axes3d(context.expected.translation, basisOf(context.expected.rotation), "expected c", "expected", { dashed: true }));
        if (isSE3(context.actual)) out.push(axes3d(context.actual.translation, basisOf(context.actual.rotation), resultLabel(context), resultStyle(context)));
      } else if (view === "rpy") {
        const input = se3Scene.fixtures.quatFromRPY(context.values);
        out.push(axes3d(ORIGIN3, basisOf(input), "input rpy", "input", { size: 0.9 }));
        if (typeof context.expected === "number") out.push(arrow3d(ORIGIN3, direction3(context.expected, 0), "expected yaw", "expected", { dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arrow3d(ORIGIN3, direction3(context.actual, 0), resultLabel(context), resultStyle(context)));
        if (isRPY(context.expected)) drawBasis(qFromRPY(context.expected.roll, context.expected.pitch, context.expected.yaw), "expected", "expected", true);
        if (isRPY(context.actual)) drawBasis(qFromRPY(context.actual.roll, context.actual.pitch, context.actual.yaw), resultLabel(context), resultStyle(context), false);
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      } else if (view === "slerp") {
        out.push(axes3d(ORIGIN3, basisOf(se3Scene.fixtures.slerpA(context.values)), "a", "muted", { size: 0.8 }));
        out.push(axes3d(ORIGIN3, basisOf(se3Scene.fixtures.slerpB(context.values)), "b", "muted", { size: 0.8 }));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      } else if (view === "point3d") {
        const aFromB = se3Scene.fixtures.aFromBSliders(context.values);
        const p = se3Scene.fixtures.point3();
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"), arrow3d(aFromB.translation, transform3(aFromB, p), "p in b", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected in a", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else if (view === "inverse") {
        const aFromB = se3Scene.fixtures.aFromBSliders(context.values);
        out.push(axes3d(aFromB.translation, basisOf(aFromB.rotation), "b", "input"), label("aFromB ∘ yours must land on the world axes", "muted", { row: 3 }));
        if (isSE3(context.expected)) {
          const placed = compose3(aFromB, context.expected);
          out.push(axes3d(placed.translation, basisOf(placed.rotation), "aFromB ∘ expected", "expected", { dashed: true }));
        }
        if (isSE3(context.actual)) {
          const placed = compose3(aFromB, context.actual);
          out.push(axes3d(placed.translation, basisOf(placed.rotation), "aFromB ∘ yours", resultStyle(context)));
        }
      } else if (view === "optical") {
        const body = direction3(context.values.yaw, context.values.pitch);
        out.push(axes3d(ORIGIN3, OPTICAL_BASIS, "optical: x right, y down, z fwd", "input", { size: 0.8 }), arrow3d(ORIGIN3, body, "ray (given in optical coords)", "input"));
        if (isVector3(context.expected)) out.push(arrow3d(ORIGIN3, context.expected, "expected in body", "expected", { dashed: true }));
        if (isVector3(context.actual)) out.push(arrow3d(ORIGIN3, context.actual, resultLabel(context), resultStyle(context)));
      } else {
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };

  // ------------------------------------------------------------ matrix form
  function isMatrix(m, size) {
    return Array.isArray(m) && m.length === size && m.every((row) => Array.isArray(row) && row.length === size && row.every((item) => Number.isFinite(item)));
  }
  function matrixOf(t) {
    const c = Math.cos(t.yaw);
    const s = Math.sin(t.yaw);
    return [[c, -s, t.x], [s, c, t.y], [0, 0, 1]];
  }
  function poseFromMatrix(m) {
    return { x: m[0][2], y: m[1][2], yaw: Math.atan2(m[1][0], m[0][0]) };
  }
  function columnLayers(m, origin, text, style, dashed) {
    const scale = 1.2;
    const alpha = style === "expected" ? 200 : 255;
    return [
      arrow(origin, add(origin, { x: m[0][0] * scale, y: m[1][0] * scale }), "x", { dashed, weight: 2.5, alpha }),
      arrow(origin, add(origin, { x: m[0][1] * scale, y: m[1][1] * scale }), "y", { dashed, weight: 2.5, alpha }),
      label(text, style, { at: add(origin, { x: 0.15, y: -0.35 }) }),
    ];
  }
  const matrixScene = {
    fixtures: {
      matrixOfTransform: (values) => matrixOf(values.transform),
      matrixA: (values) => matrixOf(values.aFromB),
      matrixB: (values) => matrixOf(values.bFromC),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = [];
      const expectedMatrix = isMatrix(context.expected, 3) ? context.expected : null;
      const actualMatrix = isMatrix(context.actual, 3) ? context.actual : null;
      if (view === "rotation") {
        const handle = handleDefs(context.puzzle)[0];
        const yaw = context.values[handle.id];
        out.push(arc({ x: 0, y: 0 }, dialRadius(handle), 0, yaw, "input", { track: true }));
        out.push(label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(handle) + 0.5) }));
        if (isMatrix(context.expected, 2)) out.push(...columnLayers(context.expected, { x: 0, y: 0 }, "expected columns", "expected", true));
        if (isMatrix(context.actual, 2)) out.push(...columnLayers(context.actual, { x: 0, y: 0 }, resultLabel(context), resultStyle(context), false));
      } else if (view === "pose" || view === "readback") {
        const transform = context.values.transform;
        out.push(frame(identity(), "world", "muted"), frame(transform, "pose", "input"));
        if (view === "pose") {
          if (expectedMatrix) out.push(frame(poseFromMatrix(expectedMatrix), "expected matrix", "expected", { dashed: true }));
          if (actualMatrix) {
            const placed = poseFromMatrix(actualMatrix);
            out.push(frame(placed, resultLabel(context), resultStyle(context)));
            out.push(...errorArrow(context, placed, transform));
          }
        } else {
          if (isTransform(context.expected)) out.push(glyph(context.expected, "expected pose", "expected", { dashed: true }));
          if (isTransform(context.actual)) {
            out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
            out.push(...errorArrow(context, context.actual, context.expected));
          }
        }
      } else if (view === "chain") {
        const aFromB = context.values.aFromB;
        const aFromC = compose(aFromB, context.values.bFromC);
        out.push(frame(identity(), "a", "muted"), frame(aFromB, "b", "input"), frame(aFromC, "c", "input", { alpha: 170 }), arrow(aFromB, aFromC, "input", { dashed: true, weight: 1 }));
        if (expectedMatrix) out.push(frame(poseFromMatrix(expectedMatrix), "expected A·B", "expected", { dashed: true }));
        if (actualMatrix) {
          const placed = poseFromMatrix(actualMatrix);
          out.push(frame(placed, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, placed, aFromC));
        }
      } else if (view === "point") {
        const transform = context.values.transform;
        const world = applyPoint(transform, context.values.point);
        out.push(frame(identity(), "target", "muted"), frame(transform, "source", "input"), arrow(transform, world, "input", { dashed: true, weight: 1 }), point(world, "p = " + fmtPoint(context.values.point) + " in source", "input"));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected in target", "expected", { dashed: true }));
        if (isPoint(context.actual)) {
          out.push(point(context.actual, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, context.actual, context.expected));
        }
      } else if (view === "inverse") {
        const transform = context.values.transform;
        out.push(frame(identity(), "a", "muted"), frame(transform, "b", "input"), label("b ∘ yours must land on a", "muted", { row: 3 }));
        if (expectedMatrix) out.push(frame(compose(transform, poseFromMatrix(expectedMatrix)), "b ∘ expected", "expected", { dashed: true }));
        if (actualMatrix) {
          const placed = compose(transform, poseFromMatrix(actualMatrix));
          out.push(frame(placed, "b ∘ yours", resultStyle(context)));
          out.push(...errorArrow(context, placed, identity()));
        }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ motion and uncertainty
  function stepMotion(pose, v, omega, dt) {
    return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: wrap(pose.yaw + omega * dt) };
  }
  const TRAIL_COMMANDS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ v: 1.1, omega: 0.45, dt: 0.5 });
    for (let j = 0; j < 8; j += 1) list.push({ v: 0.9, omega: -0.7, dt: 0.5 });
    return list;
  })();
  function pointsPrimitive(list, style, options) { return { kind: "points", points: list, style, ...(options || {}) }; }
  function segments(pairs, style, options) { return { kind: "segments", pairs, style, ...(options || {}) }; }
  function ellipse(center, covariance, style, options) { return { kind: "ellipse", center, covariance, style, ...(options || {}) }; }
  const motionScene = {
    fixtures: {},
    layers(context) {
      const pose = context.values.pose;
      const out = [glyph(pose, "pose", "input"), ...laneLayers(context.puzzle, context.values)];
      if (isTransform(context.expected)) out.push(arrow(pose, context.expected, "muted", { dashed: true, weight: 1 }), glyph(context.expected, "expected", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
        out.push(...errorArrow(context, context.actual, context.expected));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["v = " + fmt(context.values.v) + " m/s · ω = " + fmt(context.values.omega) + " rad/s · dt = " + fmt(context.values.dt) + " s"]));
      return out;
    },
  };
  const motionTrailScene = {
    fixtures: { commands: () => TRAIL_COMMANDS },
    layers(context) {
      let pose = context.values.start;
      const trail = [];
      TRAIL_COMMANDS.forEach((command) => { pose = stepMotion(pose, command.v, command.omega, command.dt); trail.push({ x: pose.x, y: pose.y }); });
      const out = [glyph(context.values.start, "start", "input"), pointsPrimitive(trail, "muted", { size: 4 }), label(TRAIL_COMMANDS.length + " commands (v, ω, dt) applied in order", "muted", { row: 3 })];
      if (isTransform(context.expected)) out.push(glyph(context.expected, "expected end", "expected", { dashed: true }));
      if (isTransform(context.actual)) {
        out.push(glyph(context.actual, resultLabel(context), resultStyle(context)));
        out.push(...errorArrow(context, context.actual, context.expected));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const COVARIANCE_INPUT = [[1.0, 0], [0, 0.16]];
  const covarianceScene = {
    fixtures: { covariance: () => COVARIANCE_INPUT },
    layers(context) {
      const handle = handleDefs(context.puzzle)[0];
      const yaw = context.values[handle.id];
      const out = [
        arc({ x: 0, y: 0 }, dialRadius(handle), 0, yaw, "input", { track: true }),
        label("yaw = " + degrees(yaw), "input", { at: direction(yaw, dialRadius(handle) + 0.5) }),
        ellipse({ x: 0, y: 0 }, COVARIANCE_INPUT, "muted", { label: "Σ (input)" }),
      ];
      if (isMatrix(context.expected, 2)) out.push(ellipse({ x: 0, y: 0 }, context.expected, "expected", { dashed: true, label: "expected R Σ Rᵀ" }));
      if (isMatrix(context.actual, 2)) out.push(ellipse({ x: 0, y: 0 }, context.actual, resultStyle(context), { label: resultLabel(context) }));
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ rigid alignment
  const CLOUD_PREVIOUS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ x: -3 + 0.25 * i, y: 1.5 });
    for (let j = 0; j < 12; j += 1) list.push({ x: 0, y: 1.5 - 0.25 * j });
    return list;
  })();
  const CLOUD_SHUFFLE = [17, 3, 22, 8, 0, 14, 11, 19, 5, 23, 9, 1, 16, 6, 20, 12, 2, 18, 10, 7, 21, 4, 15, 13];
  function cloudCurrent(values) {
    const inverse = invert(values.motion);
    return CLOUD_PREVIOUS.map((p) => applyPoint(inverse, p));
  }
  function cloudShuffled(values) {
    const current = cloudCurrent(values);
    return CLOUD_SHUFFLE.map((index) => current[index]);
  }
  function centroidOf(list) {
    let sx = 0;
    let sy = 0;
    list.forEach((p) => { sx += p.x; sy += p.y; });
    return list.length ? { x: sx / list.length, y: sy / list.length } : { x: 0, y: 0 };
  }
  function crossCovarianceOf(previous, current) {
    const pm = centroidOf(previous);
    const cm = centroidOf(current);
    const w = [[0, 0], [0, 0]];
    for (let i = 0; i < Math.min(previous.length, current.length); i += 1) {
      const px = previous[i].x - pm.x;
      const py = previous[i].y - pm.y;
      const cx = current[i].x - cm.x;
      const cy = current[i].y - cm.y;
      w[0][0] += cx * px; w[0][1] += cx * py; w[1][0] += cy * px; w[1][1] += cy * py;
    }
    return w;
  }
  function isCloud(list) { return Array.isArray(list) && list.every(isPoint); }
  const cloudAlignScene = {
    fixtures: {
      previous: () => CLOUD_PREVIOUS,
      current: cloudCurrent,
      currentShuffled: cloudShuffled,
      crossCovariance: (values) => crossCovarianceOf(CLOUD_PREVIOUS, cloudCurrent(values)),
      icpOptions: () => ({ maxIterations: 30, eps: 1e-6 }),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const motion = context.values.motion;
      const shuffled = view === "neighbors" || view === "step" || view === "icp";
      const current = shuffled ? cloudShuffled(context.values) : cloudCurrent(context.values);
      const out = [
        pointsPrimitive(CLOUD_PREVIOUS, "muted", { size: 6, label: "previous" }),
        pointsPrimitive(current, "input", { size: 5, label: "current (as the moved sensor sees it)" }),
        frame(motion, "true motion", "input"),
      ];
      const cm = centroidOf(current);
      if (view === "centroid") {
        if (isPoint(context.expected)) out.push(point(context.expected, "expected centroid", "expected", { dashed: true }));
        if (isPoint(context.actual)) {
          out.push(point(context.actual, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, context.actual, context.expected));
        }
      } else if (view === "covariance") {
        out.push(point(centroidOf(CLOUD_PREVIOUS), "previous centroid", "muted"), point(cm, "current centroid", "input"));
        const normalized = (w) => {
          const n0 = Math.hypot(w[0][0], w[1][0]) || 1;
          const n1 = Math.hypot(w[0][1], w[1][1]) || 1;
          return [[w[0][0] / n0, w[0][1] / n1], [w[1][0] / n0, w[1][1] / n1]];
        };
        if (isMatrix(context.expected, 2)) out.push(...columnLayers(normalized(context.expected), cm, "expected W columns", "expected", true));
        if (isMatrix(context.actual, 2)) out.push(...columnLayers(normalized(context.actual), cm, resultLabel(context), resultStyle(context), false));
      } else if (view === "yaw") {
        if (typeof context.expected === "number") out.push(arc(cm, 1.0, 0, context.expected, "expected", { dashed: true, arrowhead: true, track: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arc(cm, 0.8, 0, context.actual, resultStyle(context), { arrowhead: true }));
      } else if (view === "neighbors") {
        const pairsOf = (value) => (value && Array.isArray(value.indexes)
          ? value.indexes.map((index, i) => (current[i] && CLOUD_PREVIOUS[index] ? [current[i], CLOUD_PREVIOUS[index]] : null)).filter(Boolean)
          : []);
        out.push(segments(pairsOf(context.expected), "expected", { dashed: true }));
        out.push(segments(pairsOf(context.actual), resultStyle(context), { weight: 1.5 }));
      } else {
        const expectedTransform = view === "rigid" ? context.expected : (context.expected && context.expected.transform);
        const actualTransform = view === "rigid" ? context.actual : (context.actual && context.actual.transform);
        if (view === "step" && context.actual && isCloud(context.actual.moved)) out.push(pointsPrimitive(context.actual.moved, resultStyle(context), { size: 4, label: "moved (yours)" }));
        if (isTransform(expectedTransform)) out.push(frame(expectedTransform, "expected", "expected", { dashed: true }));
        if (isTransform(actualTransform)) {
          out.push(frame(actualTransform, resultLabel(context), resultStyle(context)));
          out.push(...errorArrow(context, actualTransform, motion));
        }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  const SCENES = {
    "dial": dialScene,
    "vector": vectorScene,
    "vector-dial": vectorDialScene,
    "two-dials": twoDialsScene,
    "frame-point": framePointScene,
    "frame-vector": frameVectorScene,
    "frame-pose": framePoseScene,
    "frame-chain": frameChainScene,
    "frame-inverse": frameInverseScene,
    "two-frames": twoFramesScene,
    "pose-lerp": poseLerpScene,
    "correction": correctionScene,
    "tree": treeScene,
    "robot-chain": robotChainScene,
    "timeline": timelineScene,
    "timeline-ranges": timelineRangesScene,
    "timeline-frame": timelineFrameScene,
    "se3": se3Scene,
    "robot-chain-time": robotChainTimeScene,
    "matrix": matrixScene,
    "motion": motionScene,
    "motion-trail": motionTrailScene,
    "covariance": covarianceScene,
    "cloud-align": cloudAlignScene,
  };

  function layers(context) {
    const scene = SCENES[context.puzzle.scene.kind];
    if (!scene) return [label("Unknown scene kind " + context.puzzle.scene.kind, "actual", { row: 0 })];
    return scene.layers(context);
  }

  const api = {
    SCENE_KINDS: Object.keys(SCENES),
    SCENES,
    initialValues, toArgs, layers, grips, dragHandle, handleWorld,
    se2: { wrap, rotate, applyPoint, compose, invert, identity, direction },
    primitives: { frame, point, arrow, arc, label, glyph, lane, marker, shade, points: pointsPrimitive, segments, ellipse },
    format: { fmt, degrees, fmtPoint, fmtTransform, describe },
    lanes: { laneLayers, laneX, laneY, laneRange, LANE_LEFT, LANE_RIGHT, LANE_TOP },
  };
  root.PuzzleScenes = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

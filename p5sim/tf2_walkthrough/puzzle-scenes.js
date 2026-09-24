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
      if (value.length && value.every((item) => typeof item === "number")) return "[" + value.map(fmt).join(", ") + "]";
      if (value.length && value.every(isPoint)) return value.length + " points · first " + fmtPoint(value[0]);
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
      if (value.state && Array.isArray(value.P)) return "state " + fmtTransform(value.state) + " · σx " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.P[1][1]))) + " σyaw " + fmt(Math.sqrt(Math.max(0, value.P[2][2])));
      if (Number.isFinite(value.angle) && Number.isFinite(value.major) && Number.isFinite(value.minor)) return "angle " + degrees(value.angle) + " · major " + fmt(value.major) + " · minor " + fmt(value.minor);
      if (value.transform && Array.isArray(value.covariance)) return fmtTransform(value.transform) + " · σx " + fmt(Math.sqrt(Math.max(0, value.covariance[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.covariance[1][1])));
      if (Number.isFinite(value.v) && Number.isFinite(value.omega)) return "v " + fmt(value.v) + " m/s · ω " + fmt(value.omega) + " rad/s";
      if (Number.isFinite(value.mean) && Number.isFinite(value.variance)) return "mean " + fmt(value.mean) + " · σ " + fmt(Math.sqrt(Math.max(0, value.variance)));
      if (isPoint(value.pos) && isPoint(value.vel) && isPoint(value.acc)) return "pos " + fmtPoint(value.pos) + " · vel " + fmtPoint(value.vel);
      if (isPoint(value.future) && isPoint(value.normal) && isPoint(value.target)) return "normal " + fmtPoint(value.normal) + " · target " + fmtPoint(value.target);
      if (isPoint(value.pos) && Number.isFinite(value.angle)) return "pos " + fmtPoint(value.pos) + " · angle " + degrees(value.angle);
      if (isPoint(value.pos) && isPoint(value.offset)) return "pos " + fmtPoint(value.pos) + " · offset " + fmtPoint(value.offset);
      if (typeof value.possible === "boolean" && Array.isArray(value.a)) return (value.possible ? "possible · a [" + value.a.join(" ") + "] · b [" + value.b.join(" ") + "]" : "impossible");
      if ("item" in value && Array.isArray(value.heap)) return "popped " + (value.item ? "[" + value.item.join(", ") + "]" : "nothing") + " · heap " + JSON.stringify(value.heap).slice(0, 40);
      if (Number.isFinite(value.x) && Number.isFinite(value.dx)) return "x " + fmt(value.x) + " · dx " + fmt(value.dx);
      if (Array.isArray(value.x) && Array.isArray(value.P)) return "pos " + fmt(value.x[0]) + " vel " + fmt(value.x[1]) + " · σpos " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σvel " + fmt(Math.sqrt(Math.max(0, value.P[1][1])));
      if (Array.isArray(value.F) && Array.isArray(value.Q)) return "F " + describe(value.F) + " · Q " + describe(value.Q);
      if (Array.isArray(value.points) && Array.isArray(value.wm)) return value.points.length + " sigma points · wm₀ " + fmt(value.wm[0]) + " · wc₀ " + fmt(Array.isArray(value.wc) ? value.wc[0] : NaN);
      if (isPoint(value.mean) && Array.isArray(value.P)) return "mean " + fmtPoint(value.mean) + " · σx " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.P[1][1])));
      if (value.transform && Number.isFinite(value.error)) return fmtTransform(value.transform) + " · error " + fmt(value.error);
      if ("roll" in value && "pitch" in value && "yaw" in value) return "roll " + degrees(value.roll) + " · pitch " + degrees(value.pitch) + " · yaw " + degrees(value.yaw);
      if (value.axis && Number.isFinite(value.angle)) return "axis " + fmtVector3(value.axis) + " · " + degrees(value.angle);
      if (Number.isFinite(value.vx) && Number.isFinite(value.vy) && Number.isFinite(value.wz)) return "vx " + fmt(value.vx) + " · vy " + fmt(value.vy) + " · wz " + fmt(value.wz);
      if (value.edges && Number.isFinite(value.duration)) return Object.keys(value.edges).map((child) => child + ": " + (value.edges[child].isStatic ? "static" : (value.edges[child].samples || []).map((s) => fmt(s.time)).join("/"))).join(" · ");
      if (value.mapFromOdom && value.correctedPose) return "map→odom " + fmtTransform(value.mapFromOdom) + " · heading " + degrees(value.heading) + " · corrected " + fmtTransform(value.correctedPose);
      if (value.line && Array.isArray(value.inliers)) return "line a " + fmt(value.line.a) + " b " + fmt(value.line.b) + " c " + fmt(value.line.c) + " · " + value.inliers.length + " inliers";
      if (["a", "b", "c"].every((key) => Number.isFinite(value[key])) && Object.keys(value).length === 3) return "line a " + fmt(value.a) + " b " + fmt(value.b) + " c " + fmt(value.c);
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
      // "(rounded)" handles reach the function as Math.round(value), so show that integer.
      const whole = handle.integer === true || /\(rounded\)/i.test(handle.label || "");
      const show = (n) => (whole && Number.isFinite(n) ? String(Math.round(n)) : fmt(n));
      out.push(lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: handle.label, marks: [{ at: { x: LANE_LEFT, y }, label: show(range.lo) }, { at: { x: LANE_RIGHT, y }, label: show(range.hi) }] }));
      out.push(marker({ x: laneX(handle, values[handle.id]), y }, show(values[handle.id]), "input", { height: 0.22 }));
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
  function matrixFromQuaternion(q) {
    const u = qnormalize(q);
    const x = u.x, y = u.y, z = u.z, w = u.w;
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
      [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
      [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
    ];
  }
  function basisFromMatrix(m) {
    return { x: { x: m[0][0], y: m[1][0], z: m[2][0] }, y: { x: m[0][1], y: m[1][1], z: m[2][1] }, z: { x: m[0][2], y: m[1][2], z: m[2][2] } };
  }
  function quatFromAxisAngle(axis, angle) {
    const n = Math.hypot(axis.x, axis.y, axis.z) || 1;
    const s = Math.sin(angle / 2);
    return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle / 2) };
  }
  function scaled3(v, k) { return { x: v.x * k, y: v.y * k, z: v.z * k }; }
  function isAxisAngle(v) { return Boolean(v) && typeof v === "object" && isVector3(v.axis) && Number.isFinite(v.angle); }
  const URDF_XYZ = [0.6, 0.2, 0.4];
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
      matrixFromRPY: (values) => matrixFromQuaternion(qFromRPY(values.roll, values.pitch, values.yaw)),
      axisFromSliders: (values) => direction3(values.axisYaw, values.axisPitch),
      quatFromAxisAngle: (values) => quatFromAxisAngle(direction3(values.axisYaw, values.axisPitch), values.angle),
      urdfXyz: () => URDF_XYZ.slice(),
      rpyArray: (values) => [values.roll, values.pitch, values.yaw],
      identityQuat: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      omegaFromSliders: (values) => ({ x: values.wx, y: values.wy, z: values.wz }),
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
        if (isMatrix(context.expected, 3)) out.push(axes3d(ORIGIN3, basisFromMatrix(context.expected), "expected", "expected", { dashed: true }));
        if (isMatrix(context.actual, 3)) out.push(axes3d(ORIGIN3, basisFromMatrix(context.actual), resultLabel(context), resultStyle(context)));
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
      } else if (view === "axis-angle") {
        const axis = se3Scene.fixtures.axisFromSliders(context.values);
        out.push(arrow3d(ORIGIN3, scaled3(axis, 1.4), "axis · angle " + degrees(context.values.angle), "input"));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
        if (isAxisAngle(context.expected)) out.push(arrow3d(ORIGIN3, scaled3(context.expected.axis, 1.2), "expected axis · " + degrees(context.expected.angle), "expected", { dashed: true }));
        if (isAxisAngle(context.actual)) out.push(arrow3d(ORIGIN3, scaled3(context.actual.axis, 1.0), resultLabel(context) + " · " + degrees(context.actual.angle), resultStyle(context)));
      } else if (view === "urdf") {
        const xyz = se3Scene.fixtures.urdfXyz();
        out.push(label("<origin xyz=\"" + xyz.join(" ") + "\" rpy=\"" + [context.values.roll, context.values.pitch, context.values.yaw].map((v) => v.toFixed(2)).join(" ") + "\"/>", "input", { row: 3 }));
        if (isSE3(context.expected)) out.push(axes3d(context.expected.translation, basisOf(context.expected.rotation), "expected mount", "expected", { dashed: true }));
        if (isSE3(context.actual)) out.push(axes3d(context.actual.translation, basisOf(context.actual.rotation), resultLabel(context), resultStyle(context)));
      } else if (view === "gyro") {
        const omega = se3Scene.fixtures.omegaFromSliders(context.values);
        const rate = Math.hypot(omega.x, omega.y, omega.z);
        if (rate > 1e-9) out.push(arrow3d(ORIGIN3, scaled3({ x: omega.x / rate, y: omega.y / rate, z: omega.z / rate }, 1.4), "ω axis · " + fmt(rate) + " rad/s × 0.80 s", "input"));
        if (isQuaternion(context.expected)) drawBasis(context.expected, "expected", "expected", true);
        if (isQuaternion(context.actual)) drawBasis(context.actual, resultLabel(context), resultStyle(context), false);
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
  // ------------------------------------------------------------ sensors and motion
  function isTwist(v) { return Boolean(v) && typeof v === "object" && ["vx", "vy", "wz"].every((key) => Number.isFinite(v[key])); }
  const twistScene = {
    fixtures: {},
    layers(context) {
      const a = context.values.a;
      const b = context.values.b;
      const out = [arrow(a, b, "muted", { dashed: true, weight: 1 }), glyph(a, "a (t)", "input"), glyph(b, "b (t + dt)", "input"), ...laneLayers(context.puzzle, context.values)];
      const drawTwist = (twist, style, dashed, text) => {
        const velocity = rotate({ x: twist.vx, y: twist.vy }, a.yaw);
        out.push(arrow(a, add(a, velocity), style, { dashed, weight: dashed ? 2 : 3 }));
        out.push(arc(a, 0.7, a.yaw, a.yaw + twist.wz, style, { dashed, arrowhead: true }));
        out.push(label(text, style, { at: add(add(a, velocity), { x: 0.15, y: 0.2 }) }));
      };
      if (isTwist(context.expected)) drawTwist(context.expected, "expected", true, "expected · one second of motion");
      if (isTwist(context.actual)) drawTwist(context.actual, resultStyle(context), false, resultLabel(context));
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["dt = " + fmt(context.values.dt) + " s · arrows show one second of the twist in a's body frame"]));
      return out;
    },
  };
  const WALL_POINTS = (() => {
    const list = [];
    for (let i = 0; i < 12; i += 1) list.push({ x: 3, y: -1.5 + 3 * i / 11 });
    return list;
  })();
  const SCAN_TIMES = WALL_POINTS.map((point, i) => i / 11);
  function scanSamples(values) { return [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: values.end }]; }
  function scanPoseAt(values, time) { return lerpTransform({ x: 0, y: 0, yaw: 0 }, values.end, time); }
  function rawScan(values) { return WALL_POINTS.map((point, i) => applyPoint(invert(scanPoseAt(values, SCAN_TIMES[i])), point)); }
  const deskewScene = {
    fixtures: { rawPoints: rawScan, times: () => SCAN_TIMES.slice(), samples: scanSamples },
    layers(context) {
      const end = context.values.end;
      const raw = rawScan(context.values);
      const out = [
        pointsPrimitive(WALL_POINTS, "muted", { size: 6, label: "wall (odom)" }),
        glyph({ x: 0, y: 0, yaw: 0 }, "sensor at t=0", "muted"),
        glyph(end, "sensor at t=1", "input"),
        pointsPrimitive(raw.map((p) => applyPoint(end, p)), "input", { size: 5, label: "raw scan drawn at t=1 (bent)" }),
      ];
      if (isCloud(context.expected)) out.push(pointsPrimitive(context.expected.map((p) => applyPoint(end, p)), "expected", { size: 4, label: "expected de-skewed" }));
      if (isCloud(context.actual)) out.push(pointsPrimitive(context.actual.map((p) => applyPoint(end, p)), resultStyle(context), { size: 4, label: resultLabel(context) }));
      out.push(...notes(context, describe(context.expected), describe(context.actual), ["all points are drawn in odom by applying the t=1 sensor pose"]));
      return out;
    },
  };
  // ------------------------------------------------------------ buffer semantics
  const BUFFER_SCENE = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: -2, y: -0.5, yaw: 0 } }, { time: 5, parent: "map", transform: { x: 0, y: 0.5, yaw: 0.4 } }, { time: 10, parent: "map", transform: { x: 2, y: 1, yaw: 0.8 } }] },
    base_link: { isStatic: false, samples: [{ time: 2, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "odom", transform: { x: 2, y: 0.5, yaw: 0.5 } }, { time: 9, parent: "odom", transform: { x: 2.5, y: 1, yaw: 1.0 } }] },
    laser: { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: LASER_MOUNT }] },
  } };
  const REPARENT_SCENE = { duration: 10, edges: {
    odom: BUFFER_SCENE.edges.odom,
    base_link: { isStatic: false, samples: [{ time: 0, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "map", transform: { x: 3, y: 1, yaw: 0.3 } }, { time: 9, parent: "map", transform: { x: 3.5, y: 1.5, yaw: 0.5 } }] },
    laser: BUFFER_SCENE.edges.laser,
  } };
  const ARRIVAL_SCENE = [{ time: 0, arrival: 0.2 }, { time: 1, arrival: 1.3 }, { time: 2, arrival: 2.1 }, { time: 3, arrival: 3.6 }, { time: 4, arrival: 4.2 }];
  function sampleBufferEdge(edge, time) {
    if (edge.isStatic) return edge.samples[0].transform;
    const b = bracket(edge.samples, time);
    return lerpTransform(edge.samples[b.beforeIndex].transform, edge.samples[b.afterIndex].transform, b.amount);
  }
  function bufferLane(handle, y, text, samples, style, options) {
    const settings = options || {};
    const out = [lane({ x: LANE_LEFT, y }, { x: LANE_RIGHT, y }, "muted", { label: text })];
    samples.forEach((sample) => out.push(marker({ x: laneX(handle, sample.time), y }, settings.labelParent ? sample.parent : "", style, { height: settings.height || 0.16, dashed: settings.dashed })));
    return out;
  }
  const bufferScene = {
    fixtures: {
      buffer: () => BUFFER_SCENE,
      reparentBuffer: () => REPARENT_SCENE,
      arrivals: () => ARRIVAL_SCENE,
      insertedSample: (values) => (values.kind === "static"
        ? { child: "laser", parent: "base_link", time: values.time, transform: { x: 0.8, y: 0, yaw: 0.2 } }
        : { child: "odom", parent: "map", time: values.time, transform: { x: 3, y: 1.5, yaw: 1.0 } }),
      insertIsStatic: (values) => values.kind === "static",
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = laneLayers(context.puzzle, context.values);
      if (view === "insert") {
        const handle = findHandle(context.puzzle, "time");
        ["odom", "base_link", "laser"].forEach((child, index) => {
          const y = 1.9 - index * 0.6;
          const edge = BUFFER_SCENE.edges[child];
          out.push(...bufferLane(handle, y, child + (edge.isStatic ? " (static, latched)" : " (dynamic, 10 s window)"), edge.samples, "muted"));
          const expectedEdge = context.expected && context.expected.edges ? context.expected.edges[child] : null;
          const actualEdge = context.actual && context.actual.edges ? context.actual.edges[child] : null;
          if (expectedEdge && Array.isArray(expectedEdge.samples)) out.push(...bufferLane(handle, y + 0.18, "", expectedEdge.samples, "expected", { dashed: true, height: 0.12 }));
          if (actualEdge && Array.isArray(actualEdge.samples)) out.push(...bufferLane(handle, y - 0.18, "", actualEdge.samples, resultStyle(context), { height: 0.12 }));
        });
        out.push(label("grey: current samples · dashed above: expected result · below: yours · samples older than newest − 10 s must go", "muted", { row: 3 }));
      } else if (view === "parents") {
        const handle = findHandle(context.puzzle, "time");
        out.push(...bufferLane(handle, 1.6, "base_link samples, labelled by parent", REPARENT_SCENE.edges.base_link.samples, "input", { labelParent: true, height: 0.2 }));
        const edges = [{ parent: "map", child: "odom", style: "muted" }];
        if (typeof context.expected === "string") edges.push({ parent: context.expected, child: "base_link", style: "expected", dashed: true });
        if (typeof context.actual === "string") edges.push({ parent: context.actual, child: "base_link", style: resultStyle(context) });
        out.push(treePrimitive([{ id: "map", style: "muted" }, { id: "odom", style: "muted" }, { id: "base_link", style: "input" }], edges, [], { caption: "parent of base_link at the cursor; null means the bracket spans a parent change" }));
      } else if (view === "can") {
        const handle = findHandle(context.puzzle, "time");
        ["odom", "base_link", "laser"].forEach((child, index) => {
          const edge = BUFFER_SCENE.edges[child];
          const y = 1.9 - index * 0.6;
          if (edge.isStatic) out.push(...bufferLane(handle, y, child + " (static: valid at any time)", edge.samples, "muted"));
          else out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, y, child + " history"));
        });
        out.push(label("canTransform(" + context.values.target + ", " + context.values.source + ") at t = " + fmt(context.values.time), "muted", { row: 3 }));
      } else if (view === "wait") {
        const handle = findHandle(context.puzzle, "stamp");
        out.push(...bufferLane(handle, 1.6, "stamps (when each pose was true)", ARRIVAL_SCENE, "muted"));
        out.push(...bufferLane(handle, 0.8, "arrivals (when the buffer received each one)", ARRIVAL_SCENE.map((sample) => ({ time: sample.arrival })), "input"));
        out.push(segments(ARRIVAL_SCENE.map((sample) => [{ x: laneX(handle, sample.time), y: 1.6 }, { x: laneX(handle, sample.arrival), y: 0.8 }]), "muted", { dashed: true }));
        if (typeof context.expected === "number") out.push(marker({ x: laneX(handle, context.expected), y: 0.8 }, "expected: answerable at " + fmt(context.expected), "expected", { height: 0.35, dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(marker({ x: laneX(handle, context.actual), y: 0.8 }, resultLabel(context) + " " + fmt(context.actual), resultStyle(context), { height: 0.3 }));
      } else {
        const handle = findHandle(context.puzzle, "time");
        const time = Math.max(2, Math.min(9, context.values.time));
        const chainValues = { odom: sampleBufferEdge(BUFFER_SCENE.edges.odom, time), base_link: sampleBufferEdge(BUFFER_SCENE.edges.base_link, time) };
        out.push(...chainLayers(chainValues, "input"));
        ["odom", "base_link"].forEach((child, index) => {
          const edge = BUFFER_SCENE.edges[child];
          out.push(...rangeLane(handle, { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }, -1.2 - index * 0.6, child === "odom" ? "map → odom" : "odom → base_link"));
        });
        out.push(label("chain drawn at t = " + fmt(time) + " · laser is static", "muted", { at: { x: LANE_LEFT, y: -0.6 } }));
        const expectedTransform = context.expected && context.expected.ok ? context.expected.transform : null;
        const actualTransform = context.actual && context.actual.ok ? context.actual.transform : null;
        out.push(...lookupLayers(context, (name) => chainWorld(chainValues, name), context.values.target, context.values.source, expectedTransform, actualTransform));
        if (context.expected && context.expected.ok === false) out.push(label("expected error: " + context.expected.code, "expected", { row: 4 }));
        if (context.actual && context.actual.ok === false) out.push(label("your error: " + String(context.actual.code), resultStyle(context), { row: 5 }));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ pose correction (aisle)
  const RACK_HALF_WIDTH = 1.6;
  const RACK_XS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  const AISLE_LASER = { x: 0.5, y: 0, yaw: 0 };
  const DEFAULT_AISLE = { x: 0, y: 0, yaw: 0 };
  function rackFace(aisle, side) {
    const sign = side === "left" ? 1 : -1;
    return RACK_XS.map((x) => applyPoint(aisle, { x, y: sign * RACK_HALF_WIDTH }));
  }
  function rackWithInterior(aisle, side) {
    const sign = side === "left" ? 1 : -1;
    const interior = [-1.5, -0.5, 0.5, 1.5].map((x) => applyPoint(aisle, { x, y: sign * (RACK_HALF_WIDTH + 0.3) }));
    return rackFace(aisle, side).concat(interior);
  }
  function lineOf(aisle, side) {
    const sign = side === "left" ? 1 : -1;
    const a = -Math.sin(aisle.yaw);
    const b = Math.cos(aisle.yaw);
    const foot = applyPoint(aisle, { x: 0, y: sign * RACK_HALF_WIDTH });
    return { a, b, c: -(a * foot.x + b * foot.y) };
  }
  function isLine(v) { return Boolean(v) && typeof v === "object" && ["a", "b", "c"].every((key) => Number.isFinite(v[key])); }
  function lineLayers(line, style, text, dashed) {
    if (!isLine(line)) return [];
    const scale = Math.hypot(line.a, line.b) || 1;
    const a = line.a / scale, b = line.b / scale, c = line.c / scale;
    const foot = { x: -a * c, y: -b * c };
    const dir = { x: -b, y: a };
    const p = { x: foot.x - dir.x * 6, y: foot.y - dir.y * 6 };
    const q = { x: foot.x + dir.x * 6, y: foot.y + dir.y * 6 };
    return [segments([[p, q]], style, { dashed, weight: dashed ? 2 : 2.5 }), label(text, style, { at: add(foot, { x: 0.15, y: 0.25 }) })];
  }
  function lineNormalArrow(line, style) {
    const foot = { x: -line.a * line.c, y: -line.b * line.c };
    return arrow(foot, add(foot, { x: line.a * 0.6, y: line.b * 0.6 }), style, { weight: 1.5 });
  }
  const aisleScene = {
    fixtures: {
      odomFromLaser: (values) => compose(values.robot, AISLE_LASER),
      leftPointsInLaser: (values) => { const toLaser = invert(compose(values.robot, AISLE_LASER)); return rackFace(DEFAULT_AISLE, "left").map((p) => applyPoint(toLaser, p)); },
      leftFace: (values) => rackFace(values.aisle, "left"),
      leftLine: (values) => lineOf(values.aisle, "left"),
      fixedLeftLine: () => lineOf(DEFAULT_AISLE, "left"),
      pointsWithOutlier: (values) => rackFace(DEFAULT_AISLE, "left").concat([values.outlier]),
      leftWithInterior: (values) => rackWithInterior(values.aisle, "left"),
      aisleHeading: (values) => values.aisle.yaw,
      previousLine: () => ({ a: 0, b: 1, c: -2 }),
      newLine: (values) => ({ a: 0, b: 1, c: values.newC }),
      beams: (values) => [{ heading: values.beamA, inlierCount: 3 }, { heading: values.beamB, inlierCount: 1 }],
      leftOffsetLine: (values) => ({ a: 0, b: 1, c: -values.leftOffset }),
      rightOffsetLine: (values) => ({ a: 0, b: 1, c: -values.rightOffset }),
      visibleLine: (values) => lineOf(DEFAULT_AISLE, values.rack),
      mapCenterline: () => ({ a: 0, b: 1, c: 0 }),
      shiftCenterline: (values) => ({ a: 0, b: 1, c: values.c }),
      gateBeam: (values) => ({ lineExtentM: values.extent, inlierCount: Math.round(values.inliers), inlierRatio: values.ratio }),
      gateLimits: () => ({ minExtentM: 2, minInliers: 500, minInlierRatio: 0.35 }),
      outlierSamples: (values) => [{ trackId: 1, headingRad: values.beamA, weight: 2 }, { trackId: 2, headingRad: values.beamB, weight: 2 }, { trackId: 3, headingRad: values.beamC, weight: 1 }],
      blendState: () => ({ headingRad: 0, centerlineC: -0.4, halfWidthM: 1.6 }),
      blendMeas: (values) => ({ headingRad: values.measHeading, centerlineC: values.measC, halfWidthM: 1.5, dualSide: true }),
      rightSkewedLine: (values) => ({ a: -Math.sin(values.rightSkew), b: Math.cos(values.rightSkew), c: -Math.cos(values.rightSkew) * values.rightOffset }),
      guardState: (values) => ({ filtered: 0.2, lastAcceptedRaw: 0.2, pendingJumpRaw: values.pending === "none" ? null : 0.6, pendingJumpCount: values.pending === "none" ? 0 : (values.pending === "one frame" ? 1 : 2) }),
      guardConfig: () => ({ emaAlpha: 0.5, jumpThresholdM: 0.25, jumpConfirmFrames: 3, jumpClusterThresholdM: 0.08, maxStepM: 0.04 }),
      correctedFromC: (values) => ({ x: values.robot.x - values.c * Math.sin(values.aisle), y: values.robot.y + values.c * Math.cos(values.aisle) }),
      correctionFrame: (values) => {
        const toLaser = invert(compose(values.robot, AISLE_LASER));
        return { odomFromBase: values.robot, baseFromLaser: AISLE_LASER, leftPoints: rackFace(values.aisle, "left").map((p) => applyPoint(toLaser, p)), rightPoints: rackFace(values.aisle, "right").map((p) => applyPoint(toLaser, p)) };
      },
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const out = laneLayers(context.puzzle, context.values);
      const drawRacks = (aisle, style) => {
        out.push(pointsPrimitive(rackFace(aisle, "left"), style, { size: 5, label: "left rack" }), pointsPrimitive(rackFace(aisle, "right"), style, { size: 5, label: "right rack" }));
      };
      if (view === "cloud") {
        drawRacks(DEFAULT_AISLE, "muted");
        out.push(frame(identity(), "odom", "muted"), glyph(context.values.robot, "base_link", "input"), frame(compose(context.values.robot, AISLE_LASER), "laser", "input", { size: 0.5, alpha: 170 }));
        if (isCloud(context.expected)) out.push(pointsPrimitive(context.expected, "expected", { size: 7, label: "expected in odom" }));
        if (isCloud(context.actual)) out.push(pointsPrimitive(context.actual, resultStyle(context), { size: 4, label: resultLabel(context) }));
      } else if (view === "fit" || view === "heading") {
        out.push(frame(context.values.aisle, "aisle", "input"), pointsPrimitive(rackFace(context.values.aisle, "left"), "input", { size: 5, label: "left rack points" }));
        if (view === "fit") {
          out.push(...lineLayers(context.expected, "expected", "expected line", true));
          out.push(...lineLayers(context.actual, resultStyle(context), resultLabel(context), false));
        } else {
          const line = lineOf(context.values.aisle, "left");
          out.push(...lineLayers(line, "muted", "rack line", false));
          const foot = { x: -line.a * line.c, y: -line.b * line.c };
          if (typeof context.expected === "number") out.push(arrow(foot, add(foot, direction(context.expected, 1.6)), "expected", { dashed: true }));
          if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arrow(foot, add(foot, direction(context.actual, 1.3)), resultStyle(context), { weight: 3 }));
        }
      } else if (view === "distance") {
        const line = lineOf(DEFAULT_AISLE, "left");
        const p = context.values.point;
        out.push(...lineLayers(line, "muted", "rack line (normal points up)", false), lineNormalArrow(line, "muted"), point(p, "p", "input"));
        const foot = { x: p.x - line.a * (line.a * p.x + line.b * p.y + line.c), y: p.y - line.b * (line.a * p.x + line.b * p.y + line.c) };
        out.push(segments([[p, foot]], "expected", { dashed: true }));
        if (typeof context.expected === "number") out.push(label("expected " + fmt(context.expected), "expected", { at: add(foot, { x: 0.15, y: 0.25 }) }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(label(resultLabel(context) + " " + fmt(context.actual), resultStyle(context), { at: add(foot, { x: 0.15, y: -0.35 }) }));
      } else if (view === "refit") {
        const all = rackFace(DEFAULT_AISLE, "left").concat([context.values.outlier]);
        out.push(pointsPrimitive(all, "muted", { size: 5, label: "points" }), point(context.values.outlier, "outlier", "input"));
        const inlierPoints = (value) => (value && Array.isArray(value.inliers) ? value.inliers.map((index) => all[index]).filter(Boolean) : []);
        if (context.expected) { out.push(...lineLayers(context.expected.line, "expected", "expected line", true)); out.push(pointsPrimitive(inlierPoints(context.expected), "expected", { size: 8, label: "expected inliers" })); }
        if (context.actual) { out.push(...lineLayers(context.actual.line, resultStyle(context), resultLabel(context), false)); out.push(pointsPrimitive(inlierPoints(context.actual), resultStyle(context), { size: 4, label: "your inliers" })); }
      } else if (view === "face") {
        out.push(frame(context.values.aisle, "aisle", "input"), pointsPrimitive(rackWithInterior(context.values.aisle, "left"), "muted", { size: 5, label: "rack face + interior" }));
        if (isCloud(context.expected)) out.push(pointsPrimitive(context.expected, "expected", { size: 8, label: "expected kept" }));
        if (isCloud(context.actual)) out.push(pointsPrimitive(context.actual, resultStyle(context), { size: 4, label: resultLabel(context) }));
      } else if (view === "smooth") {
        out.push(...lineLayers({ a: 0, b: 1, c: -2 }, "muted", "previous", false), ...lineLayers({ a: 0, b: 1, c: context.values.newC }, "input", "new", false));
        out.push(...lineLayers(context.expected, "expected", "expected smoothed", true), ...lineLayers(context.actual, resultStyle(context), resultLabel(context), false));
      } else if (view === "consensus") {
        const beamA = context.values.beamA, beamB = context.values.beamB;
        out.push(segments([[direction(beamA, -2.6), direction(beamA, 2.6)], [direction(beamB, -2.0), direction(beamB, 2.0)]], "muted", { dashed: true }));
        out.push(arrow({ x: 0, y: 0 }, direction(beamA, 2.6), "input", { weight: 3 }), label("beam A ×3 " + degrees(beamA), "input", { at: direction(beamA, 2.9) }));
        out.push(arrow({ x: 0, y: 0 }, direction(beamB, 2.0), "input", { weight: 1.5 }), label("beam B ×1 " + degrees(beamB), "input", { at: direction(beamB, 2.3) }));
        out.push(arrow({ x: 0, y: 0 }, direction(0.1, 1.0), "muted", { dashed: true, weight: 1 }), label("previous 0.1", "muted", { at: direction(0.1, 1.2) }));
        if (typeof context.expected === "number") out.push(arrow({ x: 0, y: 0 }, direction(context.expected, 1.8), "expected", { dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arrow({ x: 0, y: 0 }, direction(context.actual, 1.5), resultStyle(context), { weight: 3 }));
      } else if (view === "centerline") {
        out.push(...lineLayers({ a: 0, b: 1, c: -context.values.leftOffset }, "input", "left rack", false), ...lineLayers({ a: 0, b: 1, c: -context.values.rightOffset }, "input", "right rack", false));
        out.push(...lineLayers(context.expected, "expected", "expected centerline", true), ...lineLayers(context.actual, resultStyle(context), resultLabel(context), false));
      } else if (view === "single") {
        drawRacks(DEFAULT_AISLE, "muted");
        out.push(glyph(context.values.robot, "robot", "input"), ...lineLayers(lineOf(DEFAULT_AISLE, context.values.rack), "input", context.values.rack + " rack (visible)", false));
        out.push(...lineLayers(context.expected, "expected", "expected centerline", true), ...lineLayers(context.actual, resultStyle(context), resultLabel(context), false));
      } else if (view === "shift") {
        const line = { a: 0, b: 1, c: context.values.c };
        out.push(...lineLayers(line, "input", "centerline in odom (c = " + fmt(context.values.c) + ")", false), lineNormalArrow(line, "input"), glyph(context.values.robot, "robot (odom)", "input"));
        out.push(...lineLayers({ a: 0, b: 1, c: 0 }, "muted", "where the centerline lands after the shift", true));
        if (isTransform(context.expected)) out.push(arrow(context.values.robot, context.expected, "expected", { dashed: true }), glyph(context.expected, "expected", "expected", { dashed: true }));
        if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
        out.push(label("every odom point moves by c along the normal; the robot's new y is its real distance from the middle", "muted", { row: 3 }));
      } else if (view === "gate") {
        drawRacks(DEFAULT_AISLE, "muted");
        const half = context.values.extent * 0.5;
        out.push(segments([[{ x: -half, y: RACK_HALF_WIDTH }, { x: half, y: RACK_HALF_WIDTH }]], "input", { weight: 4 }));
        out.push(label("fit: " + fmt(context.values.extent) + " m, " + Math.round(context.values.inliers) + " inliers, ratio " + fmt(context.values.ratio), "input", { at: { x: -2.4, y: RACK_HALF_WIDTH + 0.45 } }));
        out.push(label("limits: 2.00 m, 500 inliers, ratio 0.35", "muted", { at: { x: -2.4, y: -RACK_HALF_WIDTH - 0.45 } }));
        const gateText = (v) => v && typeof v === "object" ? (v.valid ? "votes on the heading" : "rejected (" + String(v.reason) + ")") : "-";
        if (context.expected) out.push(label("expected: " + gateText(context.expected), "expected", { row: 3 }));
        if (context.actual && typeof context.actual === "object") out.push(label(resultLabel(context) + ": " + gateText(context.actual), resultStyle(context), { row: 4 }));
      } else if (view === "outliers") {
        [["A", context.values.beamA, 2, 2.6], ["B", context.values.beamB, 2, 2.0], ["C", context.values.beamC, 1, 1.4]].forEach(([name, yaw, weight, radius]) => {
          out.push(arrow({ x: 0, y: 0 }, direction(yaw, radius), "input", { weight: 1 + weight }), label("beam " + name + " ×" + weight + " " + degrees(yaw), "input", { at: direction(yaw, radius + 0.3) }));
        });
        const selText = (v) => v && typeof v === "object" ? (v.valid ? "heading " + degrees(v.headingRad) : "no consensus") + " · accepted " + (Array.isArray(v.accepted) ? v.accepted.join(",") || "-" : "?") + " · rejected " + (Array.isArray(v.rejected) ? v.rejected.join(",") || "-" : "?") : "-";
        if (context.expected && context.expected.valid) out.push(arrow({ x: 0, y: 0 }, direction(context.expected.headingRad, 1.8), "expected", { dashed: true }));
        if (context.actual && context.actual.valid && Number.isFinite(context.actual.headingRad)) out.push(arrow({ x: 0, y: 0 }, direction(context.actual.headingRad, 1.5), resultStyle(context), { weight: 3 }));
        out.push(label("gate 0.10 rad (5.7°) around the first weighted mean", "muted", { row: 3 }));
        if (context.expected) out.push(label("expected: " + selText(context.expected), "expected", { row: 4 }));
        if (context.actual) out.push(label(resultLabel(context) + ": " + selText(context.actual), resultStyle(context), { row: 5 }));
      } else if (view === "rate") {
        const previous = 0.1, dt = (context.values.dt > 0 && context.values.dt <= 1) ? context.values.dt : 1 / 30, maxStep = 0.4 * dt;
        out.push(arrow({ x: 0, y: 0 }, direction(previous, 2.4), "muted", { dashed: true }), label("published " + degrees(previous), "muted", { at: direction(previous, 2.7) }));
        out.push(arrow({ x: 0, y: 0 }, direction(context.values.heading, 2.2), "input", { weight: 1.5 }), label("consensus " + degrees(context.values.heading), "input", { at: direction(context.values.heading, 2.5) }));
        out.push(arc({ x: 0, y: 0 }, 1.2, previous - maxStep, previous + maxStep, "muted", { arrowhead: false }));
        out.push(label("allowed step ±" + degrees(maxStep) + " = 0.4 rad/s × dt " + fmt(dt) + " s" + (dt !== context.values.dt ? " (fallback 1/30)" : ""), "muted", { row: 3 }));
        if (typeof context.expected === "number") out.push(arrow({ x: 0, y: 0 }, direction(context.expected, 1.8), "expected", { dashed: true }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(arrow({ x: 0, y: 0 }, direction(context.actual, 1.5), resultStyle(context), { weight: 3 }));
      } else if (view === "blend") {
        const lineFrom = (v) => v && typeof v === "object" && Number.isFinite(v.headingRad) && Number.isFinite(v.centerlineC) ? { a: -Math.sin(v.headingRad), b: Math.cos(v.headingRad), c: v.centerlineC } : null;
        out.push(...lineLayers(lineFrom({ headingRad: 0, centerlineC: -0.4 }), "muted", "state: heading 0°, c −0.40, half width 1.60", false));
        out.push(...lineLayers(lineFrom({ headingRad: context.values.measHeading, centerlineC: context.values.measC }), "input", "measurement " + degrees(context.values.measHeading) + ", c " + fmt(context.values.measC) + " (dual, half width 1.50)", false));
        out.push(...lineLayers(lineFrom(context.expected), "expected", "expected blend", true), ...lineLayers(lineFrom(context.actual), resultStyle(context), resultLabel(context), false));
      } else if (view === "dual-check") {
        const right = { a: -Math.sin(context.values.rightSkew), b: Math.cos(context.values.rightSkew), c: -Math.cos(context.values.rightSkew) * context.values.rightOffset };
        out.push(...lineLayers({ a: 0, b: 1, c: -context.values.leftOffset }, "input", "left rack", false), ...lineLayers(right, "input", "right rack (skew " + degrees(context.values.rightSkew) + ")", false));
        out.push(...lineLayers(context.expected, "expected", "expected centerline", true), ...lineLayers(context.actual, resultStyle(context), resultLabel(context), false));
        if (context.expected === null && !context.error) out.push(label("expected: rejected (null)", "expected", { row: 3 }));
        if (context.actual === null && !context.error) out.push(label(resultLabel(context) + ": rejected (null)", resultStyle(context), { row: 4 }));
        out.push(label("checks: normals dot ≥ 0.7, half width in [0.3, 6] m", "muted", { row: 5 }));
      } else if (view === "lowpass") {
        out.push(...lineLayers({ a: 0, b: 1, c: -0.2 }, "muted", "current filtered c = 0.20", false), ...lineLayers({ a: 0, b: 1, c: -context.values.raw }, "input", "raw c " + fmt(context.values.raw), false));
        if (typeof context.expected === "number") out.push(...lineLayers({ a: 0, b: 1, c: -context.expected }, "expected", "expected " + fmt(context.expected), true));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(...lineLayers({ a: 0, b: 1, c: -context.actual }, resultStyle(context), resultLabel(context) + " " + fmt(context.actual), false));
      } else if (view === "jump-guard") {
        const pendingText = context.values.pending === "none" ? "no pending jump" : "pending jump at 0.60 seen for " + context.values.pending;
        out.push(...lineLayers({ a: 0, b: 1, c: -0.2 }, "muted", "filtered c 0.20, last accepted 0.20 · " + pendingText, false), ...lineLayers({ a: 0, b: 1, c: -context.values.raw }, "input", "raw c " + fmt(context.values.raw), false));
        const outText = (v) => v && typeof v === "object" && Number.isFinite(v.filteredM) ? "c " + fmt(v.filteredM) + (v.held ? " (HELD)" : " (accepted)") : "-";
        if (context.expected && Number.isFinite(context.expected.filteredM)) out.push(...lineLayers({ a: 0, b: 1, c: -context.expected.filteredM }, "expected", "expected " + outText(context.expected), true));
        if (context.actual && typeof context.actual === "object" && Number.isFinite(context.actual.filteredM)) out.push(...lineLayers({ a: 0, b: 1, c: -context.actual.filteredM }, resultStyle(context), resultLabel(context) + " " + outText(context.actual), false));
        out.push(label("jump threshold 0.25 · confirm 3 frames · cluster 0.08 · alpha 0.5 · max step 0.04", "muted", { row: 3 }));
      } else if (view === "vision-tf") {
        const h = context.values.aisle, n = { x: -Math.sin(h), y: Math.cos(h) };
        out.push(frame(identity(), "odom", "muted"), ...lineLayers({ a: n.x, b: n.y, c: context.values.c }, "input", "centerline in odom (c " + fmt(context.values.c) + ", heading " + degrees(h) + ")", false), glyph(context.values.robot, "raw FCU (odom)", "input"));
        const corrected = { x: context.values.robot.x + context.values.c * n.x, y: context.values.robot.y + context.values.c * n.y };
        out.push(arrow(context.values.robot, corrected, "input", { weight: 1.5 }), point(corrected, "shifted by c", "input"));
        if (context.expected && isTransform(context.expected.mapFromOdom)) {
          out.push(frame(context.expected.mapFromOdom, "expected map→odom", "expected", { size: 0.8, alpha: 170 }));
          if (isTransform(context.expected.correctedPose)) out.push(glyph(context.expected.correctedPose, "expected corrected_pose (map)", "expected", { dashed: true }));
        }
        if (context.actual && isTransform(context.actual.mapFromOdom)) {
          out.push(frame(context.actual.mapFromOdom, resultLabel(context) + " map→odom", resultStyle(context), { size: 0.8, alpha: 170 }));
          if (isTransform(context.actual.correctedPose)) out.push(glyph(context.actual.correctedPose, resultLabel(context) + " corrected_pose", resultStyle(context)));
        }
        out.push(label("corrected_pose.y must equal the raw pose's signed distance to the centerline", "muted", { row: 3 }));
      } else {
        out.push(...lineLayers({ a: 0, b: 1, c: -RACK_HALF_WIDTH }, "muted", "map left rack", false), ...lineLayers({ a: 0, b: 1, c: RACK_HALF_WIDTH }, "muted", "map right rack", false), frame(identity(), "map", "muted"));
        out.push(frame(context.values.aisle, "aisle drift (odom)", "input"), glyph(context.values.robot, "robot (odom)", "input"));
        const observed = rackFace(context.values.aisle, "left").concat(rackFace(context.values.aisle, "right"));
        out.push(pointsPrimitive(observed, "input", { size: 4, label: "racks seen in odom" }));
        const pushed = (transform) => observed.map((p) => applyPoint(transform, p));
        if (context.expected && isTransform(context.expected.mapFromOdom)) {
          out.push(pointsPrimitive(pushed(context.expected.mapFromOdom), "expected", { size: 7, label: "racks through expected map→odom" }));
          if (isTransform(context.expected.correctedPose)) out.push(glyph(context.expected.correctedPose, "expected corrected", "expected", { dashed: true }));
        }
        if (context.actual && isTransform(context.actual.mapFromOdom)) {
          out.push(pointsPrimitive(pushed(context.actual.mapFromOdom), resultStyle(context), { size: 4, label: "racks through your map→odom" }));
          if (isTransform(context.actual.correctedPose)) out.push(glyph(context.actual.correctedPose, resultLabel(context), resultStyle(context)));
        }
        out.push(label("your map→odom must put the observed racks on the map rack lines", "muted", { row: 3 }));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ uncertainty and estimation
  const P_PRIOR = [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.1]];
  const Q_SMALL = [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 0.01]];
  const P_UPDATE = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.2]];
  const R_UPDATE = [[0.2, 0], [0, 0.2]];
  const S_GATE = [[1.0, 0.4], [0.4, 0.5]];
  const PARTICLES = (() => { const list = []; for (let i = 0; i < 4; i += 1) for (let j = 0; j < 3; j += 1) list.push({ x: -1.5 + i, y: -1 + j }); return list; })();
  const RESAMPLE_PARTICLES = [{ x: -2, y: 0 }, { x: -1.2, y: 0.6 }, { x: -0.4, y: -0.3 }, { x: 0.4, y: 0.5 }, { x: 1.2, y: -0.4 }, { x: 2, y: 0.2 }];
  const RESAMPLE_WEIGHTS = [0.05, 0.1, 0.35, 0.3, 0.15, 0.05];
  function xyBlock(m) { return [[m[0][0], m[0][1]], [m[1][0], m[1][1]]]; }
  function isMatrix3(m) { return isMatrix(m, 3); }
  function isState(v) { return Boolean(v) && typeof v === "object" && isTransform(v.state) && isMatrix3(v.P); }
  function isTwistLike(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.v) && Number.isFinite(v.omega); }
  function twistLayers(origin, twist, style, dashed, text) {
    const velocity = rotate({ x: twist.vx, y: twist.vy }, origin.yaw);
    return [
      arrow(origin, add(origin, velocity), style, { dashed, weight: dashed ? 2 : 3 }),
      arc(origin, 0.6, origin.yaw, origin.yaw + twist.wz, style, { dashed, arrowhead: true }),
      label(text, style, { at: add(add(origin, velocity), { x: 0.15, y: 0.2 }) }),
    ];
  }
  const estimationScene = {
    fixtures: {
      twistFromSliders: (values) => ({ vx: values.vx, vy: 0, wz: values.wz }),
      priorP: () => P_PRIOR,
      smallQ: () => Q_SMALL,
      control: (values) => ({ v: values.v, omega: values.omega }),
      uncertainA: () => ({ transform: { x: 0, y: 0, yaw: 0 }, covariance: [[0.02, 0, 0], [0, 0.02, 0], [0, 0, 0.05]] }),
      uncertainB: (values) => ({ transform: values.b, covariance: [[0.03, 0, 0], [0, 0.01, 0], [0, 0, 0.02]] }),
      gateCovariance: () => S_GATE,
      ellipseCovariance: (values) => {
        const c = Math.cos(values.angle), s = Math.sin(values.angle);
        const l1 = values.major * values.major, l2 = values.minor * values.minor;
        return [[c * c * l1 + s * s * l2, c * s * (l1 - l2)], [c * s * (l1 - l2), s * s * l1 + c * c * l2]];
      },
      updateP: () => P_UPDATE,
      updateR: () => R_UPDATE,
      particles: () => PARTICLES,
      resampleParticles: () => RESAMPLE_PARTICLES,
      resampleWeights: () => RESAMPLE_WEIGHTS,
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const origin = { x: 0, y: 0, yaw: 0 };
      if (view === "diffdrive") {
        out.push(glyph(origin, "robot", "input"), segments([[{ x: -0.15, y: 0.25 }, { x: 0.15, y: 0.25 }], [{ x: -0.15, y: -0.25 }, { x: 0.15, y: -0.25 }]], "input", { weight: 4 }));
        out.push(label("left " + fmt(values.vLeft) + " m/s · right " + fmt(values.vRight) + " m/s · wheelbase 0.5 m", "muted", { row: 3 }));
        const trailOf = (twist) => { let pose = origin; const trail = []; for (let i = 0; i < 20; i += 1) { pose = stepMotion(pose, twist.v, twist.omega, 0.05); trail.push({ x: pose.x, y: pose.y }); } return trail; };
        if (isTwistLike(context.expected)) { out.push(pointsPrimitive(trailOf(context.expected), "expected", { size: 5, label: "expected 1 s path" })); out.push(...twistLayers(origin, { vx: context.expected.v, vy: 0, wz: context.expected.omega }, "expected", true, "expected")); }
        if (isTwistLike(context.actual)) { out.push(pointsPrimitive(trailOf(context.actual), resultStyle(context), { size: 3 })); out.push(...twistLayers(origin, { vx: context.actual.v, vy: 0, wz: context.actual.omega }, resultStyle(context), false, resultLabel(context))); }
      } else if (view === "sensor-twist") {
        const sensor = values.sensor;
        out.push(glyph(origin, "base_link", "input"), ...twistLayers(origin, { vx: values.vx, vy: 0, wz: values.wz }, "input", false, "body twist"), frame(sensor, "sensor", "input", { size: 0.6 }));
        const drawAt = (twist, style, dashed, text) => {
          const velocity = rotate({ x: twist.vx, y: twist.vy }, sensor.yaw);
          out.push(arrow(sensor, add(sensor, velocity), style, { dashed, weight: dashed ? 2 : 3 }), label(text, style, { at: add(add(sensor, velocity), { x: 0.15, y: 0.2 }) }));
        };
        if (isTwist(context.expected)) drawAt(context.expected, "expected", true, "expected sensor velocity");
        if (isTwist(context.actual)) drawAt(context.actual, resultStyle(context), false, resultLabel(context));
      } else if (view === "predict-cov" || view === "ekf-predict") {
        const pose = values.pose;
        const control = view === "predict-cov" ? { v: values.v, omega: 0 } : { v: values.v, omega: values.omega };
        const predicted = stepMotion(pose, control.v, control.omega, view === "predict-cov" ? values.dt : 1);
        out.push(glyph(pose, "pose", "input"), ellipse(pose, xyBlock(P_PRIOR), "muted", { label: "prior 2σ" }), arrow(pose, predicted, "muted", { dashed: true, weight: 1 }), glyph(predicted, "predicted", "muted", { dashed: true }));
        const expectedP = view === "predict-cov" ? context.expected : (context.expected && context.expected.P);
        const actualP = view === "predict-cov" ? context.actual : (context.actual && context.actual.P);
        if (isMatrix3(expectedP)) out.push(ellipse(predicted, xyBlock(expectedP), "expected", { dashed: true, label: "expected 2σ" }));
        if (isMatrix3(actualP)) out.push(ellipse(predicted, xyBlock(actualP), resultStyle(context), { label: resultLabel(context) }));
        if (view === "ekf-predict") {
          if (isState(context.expected)) out.push(glyph(context.expected.state, "expected state", "expected", { dashed: true }));
          if (isState(context.actual)) out.push(glyph(context.actual.state, resultLabel(context), resultStyle(context)));
        }
      } else if (view === "compose-uncertain") {
        const b = values.b;
        out.push(frame(origin, "a", "muted"), ellipse(origin, xyBlock(estimationScene.fixtures.uncertainA().covariance), "muted", { label: "Σa 2σ" }), frame(b, "b", "input"), ellipse(b, xyBlock(estimationScene.fixtures.uncertainB(values).covariance), "input", { label: "Σb 2σ (in a)" }));
        if (context.expected && isTransform(context.expected.transform) && isMatrix3(context.expected.covariance)) out.push(ellipse(context.expected.transform, xyBlock(context.expected.covariance), "expected", { dashed: true, label: "expected compound 2σ" }));
        if (context.actual && isTransform(context.actual.transform) && isMatrix3(context.actual.covariance)) out.push(ellipse(context.actual.transform, xyBlock(context.actual.covariance), resultStyle(context), { label: resultLabel(context) }));
      } else if (view === "mahalanobis") {
        [1, 2, 3].forEach((k) => out.push(ellipse(origin, S_GATE, "muted", { scale: k, label: k + "σ" })));
        out.push(point(values.point, "innovation", "input"), arrow(origin, values.point, "input", { weight: 1.5 }));
        if (typeof context.expected === "number") out.push(label("expected d² = " + fmt(context.expected), "expected", { at: add(values.point, { x: 0.15, y: 0.3 }) }));
        if (typeof context.actual === "number" && Number.isFinite(context.actual)) out.push(label(resultLabel(context) + " d² = " + fmt(context.actual), resultStyle(context), { at: add(values.point, { x: 0.15, y: -0.35 }) }));
      } else if (view === "ellipse") {
        out.push(ellipse(origin, estimationScene.fixtures.ellipseCovariance(values), "input", { scale: 1, label: "1σ ellipse from the sliders" }));
        const axes = (result, style, dashed, text) => {
          out.push(arrow(origin, direction(result.angle, result.major), style, { dashed, weight: dashed ? 2 : 3 }));
          out.push(arrow(origin, direction(result.angle + Math.PI / 2, result.minor), style, { dashed, weight: dashed ? 2 : 3 }));
          out.push(label(text, style, { at: add(direction(result.angle, result.major), { x: 0.15, y: 0.2 }) }));
        };
        if (context.expected && Number.isFinite(context.expected.angle)) axes(context.expected, "expected", true, "expected axes");
        if (context.actual && Number.isFinite(context.actual.angle)) axes(context.actual, resultStyle(context), false, resultLabel(context));
      } else if (view === "ekf-update" || view === "ekf-step") {
        const state = values.state;
        const prior = view === "ekf-step" ? P_PRIOR : P_UPDATE;
        out.push(glyph(state, view === "ekf-step" ? "state before" : "prior state", "input"), ellipse(state, xyBlock(prior), "muted", { label: "prior 2σ" }), point(values.z, "measurement z", "input"), ellipse(values.z, R_UPDATE, "input", { label: "R 2σ" }));
        if (view === "ekf-step") {
          const predicted = stepMotion(state, values.v, values.omega, 1);
          out.push(arrow(state, predicted, "muted", { dashed: true, weight: 1 }), glyph(predicted, "predicted", "muted", { dashed: true }));
        }
        if (isState(context.expected)) out.push(glyph(context.expected.state, "expected posterior", "expected", { dashed: true }), ellipse(context.expected.state, xyBlock(context.expected.P), "expected", { dashed: true }));
        if (isState(context.actual)) out.push(glyph(context.actual.state, resultLabel(context), resultStyle(context)), ellipse(context.actual.state, xyBlock(context.actual.P), resultStyle(context)));
      } else if (view === "particles") {
        out.push(point(values.z, "measurement z", "input"), ellipse(values.z, [[values.sigma * values.sigma, 0], [0, values.sigma * values.sigma]], "input", { scale: 1, label: "σ" }));
        const sized = (weights, style, base, gain) => { if (!Array.isArray(weights)) return; weights.forEach((w, i) => { if (PARTICLES[i] && Number.isFinite(w)) out.push(pointsPrimitive([PARTICLES[i]], style, { size: base + gain * w })); }); };
        sized(context.expected, "expected", 4, 40);
        sized(context.actual, resultStyle(context), 2, 28);
        out.push(pointsPrimitive(PARTICLES, "muted", { size: 3, label: "particles" }));
      } else if (view === "resample") {
        RESAMPLE_WEIGHTS.forEach((w, i) => out.push(pointsPrimitive([RESAMPLE_PARTICLES[i]], "muted", { size: 4 + 40 * w })));
        out.push(label("weights " + RESAMPLE_WEIGHTS.map(fmt).join(" · ") + " · u0 = " + fmt(values.u0), "muted", { row: 3 }));
        const counts = (list) => { const map = new Map(); (list || []).forEach((p) => { const key = fmt(p.x) + "," + fmt(p.y); map.set(key, (map.get(key) || 0) + 1); }); return map; };
        if (isCloud(context.expected)) { const c = counts(context.expected); RESAMPLE_PARTICLES.forEach((p) => { const n = c.get(fmt(p.x) + "," + fmt(p.y)) || 0; if (n) out.push(label("×" + n, "expected", { at: add(p, { x: 0.12, y: 0.3 }) })); }); }
        if (isCloud(context.actual)) { const c = counts(context.actual); RESAMPLE_PARTICLES.forEach((p) => { const n = c.get(fmt(p.x) + "," + fmt(p.y)) || 0; if (n) out.push(label("×" + n, resultStyle(context), { at: add(p, { x: 0.12, y: -0.4 }) })); }); }
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ bayesian filters
  const HALLWAY = [1, 1, 0, 0, 0, 0, 0, 0, 1, 0];
  const HALL_BELIEF = [0.05, 0.05, 0.4, 0.3, 0.1, 0.04, 0.02, 0.02, 0.01, 0.01];
  const HALL_LEFT = -4.5, HALL_STEP = 1, HALL_BASE = -1.6, HALL_HEIGHT = 3.2;
  const KF_P0 = [[0.8, 0.3], [0.3, 0.5]];
  const KF_P_UPDATE = [[1.2, 0.6], [0.6, 0.8]];
  const RTS_P = [[0.6, 0.2], [0.2, 0.4]];
  const RTS_P_NEXT = [[0.5, 0.1], [0.1, 0.3]];
  const RTS_F = [[1, 1], [0, 1]];
  const RTS_Q = [[0.05, 0.05], [0.05, 0.1]];
  const UT_P = [[0.6, 0.25], [0.25, 0.4]];
  function isGaussian1(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.mean) && Number.isFinite(v.variance) && v.variance > 0; }
  function isGh(v) { return Boolean(v) && typeof v === "object" && Number.isFinite(v.x) && Number.isFinite(v.dx); }
  function isVec2(v) { return Array.isArray(v) && v.length === 2 && v.every(Number.isFinite); }
  function isKfState(v) { return Boolean(v) && typeof v === "object" && isVec2(v.x) && isMatrix(v.P, 2); }
  function isModel(v) { return Boolean(v) && typeof v === "object" && isMatrix(v.F, 2) && isMatrix(v.Q, 2); }
  function isSigmaSet(v) { return Boolean(v) && typeof v === "object" && isCloud(v.points) && Array.isArray(v.wm) && Array.isArray(v.wc); }
  function isMeanCov(v) { return Boolean(v) && typeof v === "object" && isPoint(v.mean) && isMatrix(v.P, 2); }
  function isBelief(v) { return Array.isArray(v) && v.length > 0 && v.every(Number.isFinite); }
  function hallX(i) { return HALL_LEFT + i * HALL_STEP; }
  function barLayers(values, style, options) {
    const opts = options || {};
    const shift = opts.shift || 0;
    const pairs = values.map((p, i) => [{ x: hallX(i) + shift, y: HALL_BASE }, { x: hallX(i) + shift, y: HALL_BASE + HALL_HEIGHT * Math.max(0, p) }]);
    return [segments(pairs, style, { weight: opts.weight || 8, alpha: opts.alpha })];
  }
  function gaussianCurve(g, baseline, style, options) {
    const pairs = [];
    let previous = null;
    for (let i = 0; i <= 88; i += 1) {
      const x = -5.5 + i * 0.125;
      const current = { x, y: baseline + 2.5 * Math.exp(-(x - g.mean) * (x - g.mean) / (2 * g.variance)) / Math.sqrt(2 * Math.PI * g.variance) };
      if (previous) pairs.push([previous, current]);
      previous = current;
    }
    return segments(pairs, style, { weight: (options && options.weight) || 2, dashed: options && options.dashed });
  }
  function mul2(a, b) { return [[a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]], [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]]]; }
  function transpose2(m) { return [[m[0][0], m[1][0]], [m[0][1], m[1][1]]]; }
  function add2(a, b) { return [[a[0][0] + b[0][0], a[0][1] + b[0][1]], [a[1][0] + b[1][0], a[1][1] + b[1][1]]]; }
  function apply2(m, v) { return [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]]; }
  function cvQ(dt, variance) { const dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt; return [[variance * dt4 / 4, variance * dt3 / 2], [variance * dt3 / 2, variance * dt2]]; }
  function kfPredictJs(x, P, F, Q) { return { x: apply2(F, x), P: add2(mul2(mul2(F, P), transpose2(F)), Q) }; }
  function merweSigmaPoints(mean, P, alpha, beta, kappa) {
    const n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;
    const a = scale * P[0][0], b = scale * P[0][1], d = scale * P[1][1];
    const u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(Math.max(0, d - u01 * u01));
    const rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];
    const points = [{ x: mean.x, y: mean.y }];
    rows.forEach((row) => points.push({ x: mean.x + row.x, y: mean.y + row.y }));
    rows.forEach((row) => points.push({ x: mean.x - row.x, y: mean.y - row.y }));
    const wi = 1 / (2 * scale);
    return { points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale + 1 - alpha * alpha + beta, wi, wi, wi, wi] };
  }
  function polarToCartesian(p) { return { x: p.x * Math.cos(p.y), y: p.x * Math.sin(p.y) }; }
  function vecPoint(vec) { return { x: vec[0], y: vec[1] }; }
  function kfEllipse(state, style, options) { return ellipse(vecPoint(state.x), state.P, style, options); }
  function stateSpaceAxes() { return [label("position →", "muted", { at: { x: 4.3, y: -0.25 } }), label("↑ velocity", "muted", { at: { x: 0.12, y: 3.45 } })]; }
  const bayesScene = {
    fixtures: {
      ghPrior: () => -2,
      ghVelocity: () => 1,
      hallBelief: () => HALL_BELIEF.slice(),
      hallOffset: (values) => Math.round(values.offset),
      hallKernel: (values) => [(1 - values.pCorrect) / 2, values.pCorrect, (1 - values.pCorrect) / 2],
      doorLikelihood: (values) => HALLWAY.map((cell) => (cell === 1 ? values.trust : 1)),
      gaussA: (values) => ({ mean: values.meanA, variance: values.varianceA }),
      gaussB: (values) => ({ mean: values.meanB, variance: 0.5 }),
      prior1d: () => ({ mean: -2, variance: 1 }),
      movement1d: (values) => ({ mean: values.move, variance: 0.3 }),
      shearA: () => [[1, 0.5], [0, 1]],
      matrixFromColumns: (values) => [[values.col1.x, values.col2.x], [values.col1.y, values.col2.y]],
      stateVec: (values) => [values.state.x, values.state.y],
      kfP0: () => KF_P0,
      kfPUpdate: () => KF_P_UPDATE,
      cvF: (values) => [[1, values.dt], [0, 1]],
      cvQ: (values) => cvQ(values.dt, 0.1),
      hPosition: () => [[1, 0]],
      utP: () => UT_P,
      utPoints: (values) => merweSigmaPoints(values.mean, UT_P, 1, 2, 1).points,
      utWm: (values) => merweSigmaPoints(values.mean, UT_P, 1, 2, 1).wm,
      utWc: (values) => merweSigmaPoints(values.mean, UT_P, 1, 2, 1).wc,
      polarMean: (values) => ({ x: values.range, y: values.bearing }),
      polarP: (values) => [[0.09, 0], [0, values.sigmaTheta * values.sigmaTheta]],
      rtsX: (values) => [values.x.x, values.x.y],
      rtsXNext: (values) => [values.xNext.x, values.xNext.y],
      rtsP: () => RTS_P,
      rtsPNext: () => RTS_P_NEXT,
      rtsF: () => RTS_F,
      rtsQ: () => RTS_Q,
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const style = resultStyle(context);
      const text = resultLabel(context);
      const origin = { x: 0, y: 0 };
      if (view === "gh") {
        const prior = bayesScene.fixtures.ghPrior(), velocity = bayesScene.fixtures.ghVelocity();
        const prediction = prior + velocity;
        out.push(segments([[{ x: -5.2, y: 0 }, { x: 5.2, y: 0 }]], "muted", { weight: 1 }));
        out.push(marker({ x: prior, y: 0 }, "prior x " + fmt(prior), "muted"), arrow({ x: prior, y: 0 }, { x: prediction, y: 0 }, "muted", { dashed: true, weight: 1 }), marker({ x: prediction, y: 0 }, "prediction " + fmt(prediction), "muted", { dashed: true }));
        out.push(marker({ x: values.z, y: 0 }, "z " + fmt(values.z), "input", { height: 0.35 }));
        const drawEstimate = (result, row, styleName, dashed, name) => {
          const at = { x: result.x, y: row };
          out.push(marker(at, name + " x " + fmt(result.x) + " · dx " + fmt(result.dx), styleName, { dashed, height: 0.25 }), arrow(at, { x: result.x + result.dx, y: row }, styleName, { dashed, weight: dashed ? 2 : 3 }));
        };
        if (isGh(context.expected)) drawEstimate(context.expected, 1, "expected", true, "expected");
        if (isGh(context.actual)) drawEstimate(context.actual, -1, style, false, text);
        out.push(label("prior dx 1 · dt 1 · g " + fmt(values.g) + " · h " + fmt(values.h) + " · arrows show the new dx", "muted", { row: 3 }));
      } else if (view === "hallway-predict" || view === "hallway-update") {
        HALLWAY.forEach((cell, i) => { if (cell === 1) out.push(shade({ x: hallX(i) - 0.45, y: HALL_BASE - 0.5 }, { x: hallX(i) + 0.45, y: HALL_BASE - 0.1 }, "input")); });
        out.push(label("doors shaded · the hallway wraps around", "muted", { at: { x: HALL_LEFT - 0.4, y: HALL_BASE - 0.75 } }));
        out.push(...barLayers(HALL_BELIEF, "muted", { shift: -0.22, alpha: 150 }));
        if (view === "hallway-predict") out.push(label("prior (grey) · move " + bayesScene.fixtures.hallOffset(values) + " cells · kernel [" + bayesScene.fixtures.hallKernel(values).map(fmt).join(", ") + "]", "muted", { row: 3 }));
        else out.push(label("prior (grey) · the sensor saw a door · door cells weighted ×" + fmt(values.trust), "muted", { row: 3 }));
        if (isBelief(context.expected)) out.push(...barLayers(context.expected, "expected", { shift: 0, alpha: 170 }));
        if (isBelief(context.actual)) out.push(...barLayers(context.actual, style, { shift: 0.22 }));
      } else if (view === "gaussians" || view === "kalman-1d") {
        const base = -1.7;
        out.push(segments([[{ x: -5.5, y: base }, { x: 5.5, y: base }]], "muted", { weight: 1 }));
        if (view === "gaussians") {
          const a = bayesScene.fixtures.gaussA(values), b = bayesScene.fixtures.gaussB(values);
          out.push(gaussianCurve(a, base, "input"), gaussianCurve(b, base, "input"), label("a", "input", { at: { x: a.mean, y: base - 0.28 } }), label("b (variance 0.5)", "input", { at: { x: b.mean, y: base - 0.5 } }));
        } else {
          const prior = bayesScene.fixtures.prior1d(), movement = bayesScene.fixtures.movement1d(values);
          const predicted = { mean: prior.mean + movement.mean, variance: prior.variance + movement.variance };
          out.push(gaussianCurve(prior, base, "muted"), gaussianCurve(predicted, base, "muted", { dashed: true }), gaussianCurve({ mean: values.z, variance: values.R }, base, "input"));
          out.push(label("prior", "muted", { at: { x: prior.mean, y: base - 0.28 } }), label("predicted", "muted", { at: { x: predicted.mean, y: base - 0.5 } }), label("z", "input", { at: { x: values.z, y: base - 0.28 } }));
        }
        if (isGaussian1(context.expected)) out.push(gaussianCurve(context.expected, base, "expected", { dashed: true }));
        if (isGaussian1(context.actual)) out.push(gaussianCurve(context.actual, base, style, { weight: 3 }));
        out.push(label(view === "gaussians" ? "curves are scaled pdfs · the result is the product of a and b" : "curves are scaled pdfs · movement variance 0.3", "muted", { row: 3 }));
      } else if (view === "matrix2") {
        const m = bayesScene.fixtures.matrixFromColumns(values);
        const columnsOf = (mat) => [{ x: mat[0][0], y: mat[1][0] }, { x: mat[0][1], y: mat[1][1] }];
        const drawColumns = (mat, styleName, dashed, name) => {
          columnsOf(mat).forEach((column, i) => out.push(arrow(origin, column, styleName, { dashed, weight: dashed ? 2 : 3 }), label(name + " c" + (i + 1), styleName, { at: add(column, { x: 0.1, y: 0.2 }) })));
        };
        const product = context.puzzle.id === "mat-mul-2";
        if (product) drawColumns(bayesScene.fixtures.shearA(), "muted", true, "A");
        drawColumns(m, "input", false, product ? "B" : "M");
        if (isMatrix(context.expected, 2)) drawColumns(context.expected, "expected", true, "expected");
        if (isMatrix(context.actual, 2)) drawColumns(context.actual, style, false, text);
        out.push(label(product ? "A = [[1, 0.5], [0, 1]] · columns of A·B are A applied to B's columns" : "M · yours must be the identity", "muted", { row: 3 }));
      } else if (view === "cv-model") {
        const unitState = { x: 1, y: 1 };
        out.push(...stateSpaceAxes(), arrow(origin, unitState, "input", { weight: 2 }), label("state (1, 1)", "input", { at: add(unitState, { x: 0.1, y: 0.2 }) }));
        const drawModel = (model, styleName, dashed, name) => {
          const moved = vecPoint(apply2(model.F, [unitState.x, unitState.y]));
          out.push(arrow(origin, moved, styleName, { dashed, weight: dashed ? 2 : 3 }), label(name + " F·state", styleName, { at: add(moved, { x: 0.1, y: 0.2 }) }), ellipse(origin, model.Q, styleName, { scale: 1, dashed, label: name + " Q 1σ" }));
        };
        if (isModel(context.expected)) drawModel(context.expected, "expected", true, "expected");
        if (isModel(context.actual)) drawModel(context.actual, style, false, text);
        out.push(label("dt " + fmt(values.dt) + " · process variance " + fmt(values.variance), "muted", { row: 3 }));
      } else if (view === "kf-predict" || view === "kf-update" || view === "kf-track") {
        const state = [values.state.x, values.state.y];
        const priorP = view === "kf-update" ? KF_P_UPDATE : KF_P0;
        out.push(...stateSpaceAxes(), point(values.state, "prior", "input"), ellipse(values.state, priorP, "input", { label: "prior 2σ" }));
        if (view !== "kf-predict") {
          const spread = Math.sqrt(values.R);
          out.push(shade({ x: values.z - spread, y: -3.6 }, { x: values.z + spread, y: 3.6 }, "input"), segments([[{ x: values.z, y: -3.6 }, { x: values.z, y: 3.6 }]], "input", { weight: 1, dashed: true }), label("z " + fmt(values.z) + " ± √R", "input", { at: { x: values.z + 0.1, y: 3.2 } }));
        }
        if (view === "kf-track") {
          const predicted = kfPredictJs(state, KF_P0, RTS_F, cvQ(1, 0.1));
          out.push(point(vecPoint(predicted.x), "predicted", "muted", { dashed: true }), ellipse(vecPoint(predicted.x), predicted.P, "muted", { dashed: true }));
        }
        if (isKfState(context.expected)) out.push(point(vecPoint(context.expected.x), "expected", "expected", { dashed: true }), kfEllipse(context.expected, "expected", { dashed: true }));
        if (isKfState(context.actual)) out.push(point(vecPoint(context.actual.x), text, style), kfEllipse(context.actual, style));
      } else if (view === "sigma-points" || view === "unscented") {
        const mean = values.mean;
        out.push(point(mean, "mean", "input"), ellipse(mean, UT_P, "input", { scale: 1, label: "P 1σ" }));
        if (view === "unscented") out.push(pointsPrimitive(bayesScene.fixtures.utPoints(values), "input", { size: 8, label: "sigma points (input)" }));
        else out.push(label("α " + fmt(values.alpha) + " · β 2 · κ " + fmt(values.kappa), "muted", { row: 3 }));
        if (isSigmaSet(context.expected)) out.push(pointsPrimitive(context.expected.points, "expected", { size: 10, alpha: 140, label: "expected" }));
        if (isSigmaSet(context.actual)) out.push(pointsPrimitive(context.actual.points, style, { size: 5, label: text }));
        if (isMeanCov(context.expected)) out.push(point(context.expected.mean, "expected", "expected", { dashed: true }), ellipse(context.expected.mean, context.expected.P, "expected", { scale: 1, dashed: true }));
        if (isMeanCov(context.actual)) out.push(point(context.actual.mean, text, style), ellipse(context.actual.mean, context.actual.P, style, { scale: 1 }));
      } else if (view === "polar") {
        const mean = bayesScene.fixtures.polarMean(values), P = bayesScene.fixtures.polarP(values);
        const boundary = [];
        for (let i = 0; i < 60; i += 1) {
          const t = i / 60 * 2 * Math.PI;
          boundary.push(polarToCartesian({ x: mean.x + 0.3 * Math.cos(t), y: mean.y + values.sigmaTheta * Math.sin(t) }));
        }
        out.push(point(origin, "sensor", "muted"), pointsPrimitive(boundary, "muted", { size: 3, label: "true 1σ boundary" }), point(polarToCartesian(mean), "f(mean)", "muted", { dashed: true }));
        out.push(pointsPrimitive(merweSigmaPoints(mean, P, 1, 2, 1).points.map(polarToCartesian), "input", { size: 7, label: "sigma points through f" }));
        if (isMeanCov(context.expected)) out.push(point(context.expected.mean, "expected", "expected", { dashed: true }), ellipse(context.expected.mean, context.expected.P, "expected", { scale: 1, dashed: true }));
        if (isMeanCov(context.actual)) out.push(point(context.actual.mean, text, style), ellipse(context.actual.mean, context.actual.P, style, { scale: 1 }));
        out.push(label("range " + fmt(values.range) + " · bearing " + degrees(values.bearing) + " · σ range 0.3 · σ bearing " + fmt(values.sigmaTheta) + " · α 1 β 2 κ 1", "muted", { row: 3 }));
      } else if (view === "rts") {
        const x = [values.x.x, values.x.y];
        const predicted = kfPredictJs(x, RTS_P, RTS_F, RTS_Q);
        out.push(...stateSpaceAxes(), point(values.x, "filtered k", "input"), ellipse(values.x, RTS_P, "input", { label: "P k" }), point(values.xNext, "smoothed k+1", "input"), ellipse(values.xNext, RTS_P_NEXT, "input", { label: "P k+1" }));
        out.push(arrow(values.x, vecPoint(predicted.x), "muted", { dashed: true, weight: 1 }), point(vecPoint(predicted.x), "F·x k", "muted", { dashed: true }), ellipse(vecPoint(predicted.x), predicted.P, "muted", { dashed: true }));
        if (isKfState(context.expected)) out.push(point(vecPoint(context.expected.x), "expected smoothed k", "expected", { dashed: true }), kfEllipse(context.expected, "expected", { dashed: true }));
        if (isKfState(context.actual)) out.push(point(vecPoint(context.actual.x), text, style), kfEllipse(context.actual, style));
      }
      out.push(...notes(context, describe(context.expected), describe(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ nature of code side lab
  const NATURE_FIELD = (() => {
    const cols = 6, rows = 4, list = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const theta = Math.sin(col * 0.9) * 0.8 + Math.cos(row * 1.1) * 0.6;
        list.push({ x: Math.cos(theta), y: Math.sin(theta) });
      }
    }
    return { field: list, cols, rows, resolution: 1, origin: { x: -3, y: -2 } };
  })();
  const NATURE_PATH = [{ x: -5, y: -1.5 }, { x: -2, y: 1.5 }, { x: 1.5, y: -1 }, { x: 5, y: 1.2 }];
  const NATURE_OTHERS = [
    { pos: { x: 1.2, y: 0.4 }, vel: { x: 0.6, y: 0.4 } },
    { pos: { x: -0.8, y: 1.3 }, vel: { x: 0.2, y: -0.7 } },
    { pos: { x: 0.5, y: -1.4 }, vel: { x: -0.5, y: 0.5 } },
    { pos: { x: 2.6, y: -0.6 }, vel: { x: 0.7, y: 0.1 } },
    { pos: { x: -2.2, y: -0.9 }, vel: { x: 0.3, y: 0.6 } },
  ];
  const NATURE_SAMPLES = [0.02, 0.11, 0.13, 0.19, 0.24, 0.27, 0.31, 0.33, 0.38, 0.42, 0.45, 0.47, 0.52, 0.55, 0.58, 0.61, 0.66, 0.7, 0.74, 0.79, 0.83, 0.88, 0.93, 0.98];
  const NATURE_COUNTS = [3, 7, 5, 9, 4, 2];
  const BOX = { width: 8, height: 5, origin: { x: -4, y: -2.5 } };
  function toBox(p) { return { x: p.x - BOX.origin.x, y: p.y - BOX.origin.y }; }
  function fromBox(p) { return { x: p.x + BOX.origin.x, y: p.y + BOX.origin.y }; }
  function normalizeJs(v) { const n = Math.hypot(v.x, v.y); return n > 0 ? { x: v.x / n, y: v.y / n } : { x: 0, y: 0 }; }
  function velocityOf(values) { return { x: Math.cos(values.agent.yaw) * values.speed, y: Math.sin(values.agent.yaw) * values.speed }; }
  function agentOf(values) { return { pos: { x: values.agent.x, y: values.agent.y }, vel: velocityOf(values) }; }
  function agentUnitSpeed(values) { return { pos: { x: values.agent.x, y: values.agent.y }, vel: { x: Math.cos(values.agent.yaw), y: Math.sin(values.agent.yaw) } }; }
  function lookupField(pos) {
    const local = { x: pos.x - NATURE_FIELD.origin.x, y: pos.y - NATURE_FIELD.origin.y };
    const col = Math.floor(Math.max(0, Math.min(NATURE_FIELD.cols - 1, local.x / NATURE_FIELD.resolution)));
    const row = Math.floor(Math.max(0, Math.min(NATURE_FIELD.rows - 1, local.y / NATURE_FIELD.resolution)));
    return NATURE_FIELD.field[row * NATURE_FIELD.cols + col];
  }
  function fieldLayers() {
    const out = [];
    for (let row = 0; row < NATURE_FIELD.rows; row += 1) {
      for (let col = 0; col < NATURE_FIELD.cols; col += 1) {
        const cell = NATURE_FIELD.field[row * NATURE_FIELD.cols + col];
        const center = { x: NATURE_FIELD.origin.x + (col + 0.5) * NATURE_FIELD.resolution, y: NATURE_FIELD.origin.y + (row + 0.5) * NATURE_FIELD.resolution };
        out.push(arrow(center, add(center, { x: cell.x * 0.35, y: cell.y * 0.35 }), "muted", { weight: 1 }));
      }
    }
    const o = NATURE_FIELD.origin, w = NATURE_FIELD.cols * NATURE_FIELD.resolution, h = NATURE_FIELD.rows * NATURE_FIELD.resolution;
    out.push(segments([[o, { x: o.x + w, y: o.y }], [{ x: o.x + w, y: o.y }, { x: o.x + w, y: o.y + h }], [{ x: o.x + w, y: o.y + h }, { x: o.x, y: o.y + h }], [{ x: o.x, y: o.y + h }, o]], "muted", { weight: 1 }));
    return out;
  }
  function boxLayers(margin) {
    const a = BOX.origin, b = { x: BOX.origin.x + BOX.width, y: BOX.origin.y + BOX.height };
    const out = [segments([[a, { x: b.x, y: a.y }], [{ x: b.x, y: a.y }, b], [b, { x: a.x, y: b.y }], [{ x: a.x, y: b.y }, a]], "muted", { weight: 1 })];
    const m = margin || 0;
    if (m) out.push(segments([[{ x: a.x - m, y: a.y - m }, { x: b.x + m, y: a.y - m }], [{ x: b.x + m, y: a.y - m }, { x: b.x + m, y: b.y + m }], [{ x: b.x + m, y: b.y + m }, { x: a.x - m, y: b.y + m }], [{ x: a.x - m, y: b.y + m }, { x: a.x - m, y: a.y - m }]], "muted", { weight: 1, dashed: true }));
    return out;
  }
  function steeringLayers(out, context, from) {
    const style = resultStyle(context), text = resultLabel(context);
    if (isPoint(context.expected)) out.push(arrow(from, add(from, context.expected), "expected", { dashed: true, weight: 2 }), label("expected", "expected", { at: add(add(from, context.expected), { x: 0.12, y: 0.22 }) }));
    if (isPoint(context.actual)) out.push(arrow(from, add(from, context.actual), style, { weight: 3 }), label(text, style, { at: add(add(from, context.actual), { x: 0.12, y: -0.3 }) }));
  }
  function isBins(v) { return Array.isArray(v) && v.length > 0 && v.every(Number.isFinite); }
  function isChainResult(v) { return Boolean(v) && typeof v === "object" && isPoint(v.pos) && Number.isFinite(v.angle); }
  function isWrapResult(v) { return Boolean(v) && typeof v === "object" && isPoint(v.pos) && isPoint(v.offset); }
  function isPathResult(v) { return Boolean(v) && typeof v === "object" && isPoint(v.future) && isPoint(v.normal) && isPoint(v.target); }
  function isMover(v) { return Boolean(v) && typeof v === "object" && isPoint(v.pos) && isPoint(v.vel) && isPoint(v.acc); }
  function histogramBars(counts, style, options) {
    const opts = options || {};
    const n = counts.length, left = -4.5, width = 9 / n, base = -1.6;
    const peak = opts.peak || Math.max(1e-9, ...counts);
    const pairs = counts.map((c, i) => { const x = left + (i + 0.5) * width + (opts.shift || 0); return [{ x, y: base }, { x, y: base + 3 * (c / peak) }]; });
    return segments(pairs, style, { weight: opts.weight || 10, alpha: opts.alpha });
  }
  const natureScene = {
    fixtures: {
      accBefore: () => ({ x: 0.2, y: 0 }),
      mover: (values) => ({ pos: { x: values.agent.x, y: values.agent.y }, vel: velocityOf(values), acc: { x: 0, y: -0.6 } }),
      attractor: (values) => ({ pos: { x: values.attractor.x, y: values.attractor.y }, mass: 6 }),
      moverBody: (values) => ({ pos: { x: values.mover.x, y: values.mover.y }, mass: 1 }),
      boxPos: (values) => toBox(values.pos),
      agent: agentOf,
      agentUnit: agentUnitSpeed,
      target: (values) => ({ pos: { x: values.target.x, y: values.target.y }, vel: { x: Math.cos(values.target.yaw) * values.targetSpeed, y: Math.sin(values.target.yaw) * values.targetSpeed } }),
      field: () => NATURE_FIELD.field.map((v) => ({ x: v.x, y: v.y })),
      fieldPos: (values) => ({ x: values.pos.x - NATURE_FIELD.origin.x, y: values.pos.y - NATURE_FIELD.origin.y }),
      fieldAtAgent: (values) => { const cell = lookupField({ x: values.agent.x, y: values.agent.y }); return { x: cell.x, y: cell.y }; },
      path: () => NATURE_PATH.map((p) => ({ x: p.x, y: p.y })),
      others: () => NATURE_OTHERS.map((o) => ({ pos: { x: o.pos.x, y: o.pos.y }, vel: { x: o.vel.x, y: o.vel.y } })),
      flockWeights: (values) => ({ separation: values.wSeparation, alignment: values.wAlignment, cohesion: values.wCohesion }),
      flockParams: () => ({ separation: 1.2, neighbourRadius: 2.5, maxSpeed: 1.5, maxForce: 0.6 }),
      binCount: (values) => Math.round(values.bins),
      samples: () => NATURE_SAMPLES.slice(),
      counts: (values) => NATURE_COUNTS.map((c, i) => (i === NATURE_COUNTS.length - 1 ? c + Math.round(values.boost) : c)),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const style = resultStyle(context), text = resultLabel(context);
      const origin = { x: 0, y: 0 };
      const cross = (a, b) => a.x * b.y - a.y * b.x;
      const drawVector = (from, v, styleName, dashed, name) => out.push(arrow(from, add(from, v), styleName, { dashed, weight: dashed ? 2 : 3 }), label(name, styleName, { at: add(add(from, v), { x: 0.12, y: dashed ? 0.22 : -0.3 }) }));
      if (view === "unary") {
        out.push(ellipse(origin, [[1, 0], [0, 1]], "muted", { scale: 1, dashed: true, label: "unit circle" }));
        drawVector(origin, values.v, "input", false, "v");
        if (isPoint(context.expected)) drawVector(origin, context.expected, "expected", true, "expected");
        if (isPoint(context.actual)) drawVector(origin, context.actual, style, false, text);
      } else if (view === "binary") {
        drawVector(origin, values.a, "input", false, "a");
        drawVector(origin, values.b, "input", false, "b");
        if (context.puzzle.id === "dot-product") {
          out.push(label("a · b", "muted", { row: 3 }));
        } else if (context.puzzle.id === "angle-between") {
          const headingA = Math.atan2(values.a.y, values.a.x);
          const sign = cross(values.a, values.b) >= 0 ? 1 : -1;
          if (Number.isFinite(context.expected)) out.push(arc(origin, 1.1, headingA, headingA + sign * context.expected, "expected", { dashed: true, arrowhead: true }));
          if (Number.isFinite(context.actual)) out.push(arc(origin, 0.8, headingA, headingA + sign * context.actual, style, { arrowhead: true }));
        } else {
          if (isPoint(context.expected)) { drawVector(origin, context.expected, "expected", true, "expected"); out.push(segments([[values.a, context.expected]], "expected", { weight: 1, dashed: true })); }
          if (isPoint(context.actual)) { drawVector(origin, context.actual, style, false, text); out.push(segments([[values.a, context.actual]], style, { weight: 1, dashed: true })); }
        }
      } else if (view === "segment") {
        out.push(segments([[values.a, values.b]], "input", { weight: 2 }), point(values.a, "a", "input"), point(values.b, "b", "input"), point(values.p, "p", "input"));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected", "expected", { dashed: true }), segments([[values.p, context.expected]], "expected", { weight: 1, dashed: true }));
        if (isPoint(context.actual)) out.push(point(context.actual, text, style), segments([[values.p, context.actual]], style, { weight: 1, dashed: true }));
      } else if (view === "apply-force") {
        drawVector(origin, natureScene.fixtures.accBefore(), "muted", true, "acc before");
        drawVector(origin, values.force, "input", false, "force");
        if (isPoint(context.expected)) drawVector(origin, context.expected, "expected", true, "expected acc");
        if (isPoint(context.actual)) drawVector(origin, context.actual, style, false, text);
        out.push(label("mass " + fmt(values.mass) + " · acc += force / mass", "muted", { row: 3 }));
      } else if (view === "step") {
        const mover = natureScene.fixtures.mover(values);
        out.push(glyph(values.agent, "mover", "input"));
        drawVector(mover.pos, mover.vel, "input", false, "vel");
        drawVector(mover.pos, mover.acc, "muted", true, "acc (gravity)");
        if (isMover(context.expected)) { out.push(point(context.expected.pos, "expected pos", "expected", { dashed: true })); drawVector(context.expected.pos, context.expected.vel, "expected", true, "expected vel"); }
        if (isMover(context.actual)) { out.push(point(context.actual.pos, text, style)); drawVector(context.actual.pos, context.actual.vel, style, false, text + " vel"); }
        out.push(label("max speed " + fmt(values.maxSpeed) + " · one frame: vel += acc, limit, pos += vel, acc = 0", "muted", { row: 3 }));
      } else if (view === "friction" || view === "drag") {
        drawVector(origin, values.vel, "input", false, "vel");
        if (isPoint(context.expected)) drawVector(origin, context.expected, "expected", true, "expected force");
        if (isPoint(context.actual)) drawVector(origin, context.actual, style, false, text);
        out.push(label(view === "friction" ? "μ " + fmt(values.mu) + " · normal force 2" : "c " + fmt(values.c) + " · |v|² = " + fmt(values.vel.x * values.vel.x + values.vel.y * values.vel.y), "muted", { row: 3 }));
      } else if (view === "attract") {
        out.push(point(values.attractor, "attractor (mass 6)", "input"), ellipse(values.attractor, [[1, 0], [0, 1]], "muted", { scale: 1, dashed: true, label: "d clamped below 1" }), ellipse(values.attractor, [[16, 0], [0, 16]], "muted", { scale: 1, dashed: true, label: "d clamped above 4" }), point(values.mover, "mover (mass 1)", "input"));
        if (isPoint(context.expected)) drawVector(values.mover, context.expected, "expected", true, "expected force");
        if (isPoint(context.actual)) drawVector(values.mover, context.actual, style, false, text);
        out.push(label("G 1 · force = G·m₁·m₂ / d² toward the attractor", "muted", { row: 3 }));
      } else if (view === "wrap" || view === "wrap-offset") {
        out.push(...boxLayers(0.5), point(values.pos, "pos", "input"));
        const expectedPos = view === "wrap" ? context.expected : (context.expected && context.expected.pos);
        const actualPos = view === "wrap" ? context.actual : (context.actual && context.actual.pos);
        if (isPoint(expectedPos)) out.push(point(fromBox(expectedPos), "expected", "expected", { dashed: true }));
        if (isPoint(actualPos)) out.push(point(fromBox(actualPos), text, style));
        if (view === "wrap-offset" && isWrapResult(context.actual) && (context.actual.offset.x !== 0 || context.actual.offset.y !== 0)) out.push(arrow(values.pos, add(values.pos, context.actual.offset), style, { dashed: true, weight: 1 }), label("offset " + fmtPoint(context.actual.offset) + " moves every follower too", style, { row: 4 }));
        out.push(label("box 8 × 5 with margin 0.5 · drag past the dashed edge", "muted", { row: 3 }));
      } else if (view === "steer") {
        const agent = agentOf(values);
        out.push(glyph(values.agent, "agent", "input"));
        drawVector(agent.pos, agent.vel, "input", false, "vel");
        if (context.puzzle.id === "pursue") {
          const target = natureScene.fixtures.target(values);
          out.push(glyph(values.target, "target", "input"));
          drawVector(target.pos, target.vel, "input", false, "target vel");
          out.push(point(add(target.pos, { x: target.vel.x * 2, y: target.vel.y * 2 }), "predicted (2 s ahead)", "muted", { dashed: true }));
        } else {
          out.push(point(values.target, context.puzzle.id === "flee" ? "threat" : "target", "input"));
          if (context.puzzle.id === "arrive") out.push(ellipse(values.target, [[4, 0], [0, 4]], "muted", { scale: 1, dashed: true, label: "slow radius 2" }));
        }
        steeringLayers(out, context, agent.pos);
        out.push(label("max speed 1.5 · max force 0.6 · arrows from the agent are steering forces", "muted", { row: 3 }));
      } else if (view === "wander") {
        const agent = agentOf(values);
        const heading = normalizeJs(agent.vel);
        const center = add(agent.pos, { x: heading.x * 2, y: heading.y * 2 });
        out.push(glyph(values.agent, "agent", "input"));
        drawVector(agent.pos, agent.vel, "input", false, "vel");
        out.push(point(center, "circle centre (2 ahead)", "muted", { dashed: true }), ellipse(center, [[1, 0], [0, 1]], "muted", { scale: 1, dashed: true }));
        if (isPoint(context.expected)) out.push(point(context.expected, "expected target", "expected", { dashed: true }), segments([[agent.pos, context.expected]], "expected", { weight: 1, dashed: true }));
        if (isPoint(context.actual)) out.push(point(context.actual, text, style), segments([[agent.pos, context.actual]], style, { weight: 1, dashed: true }));
        out.push(label("distance 2 · radius 1 · θ " + degrees(values.theta), "muted", { row: 3 }));
      } else if (view === "field") {
        out.push(...fieldLayers(), point(values.pos, "pos", "input"));
        if (isPoint(context.expected)) drawVector(values.pos, context.expected, "expected", true, "expected cell");
        if (isPoint(context.actual)) drawVector(values.pos, context.actual, style, false, text);
        out.push(label("6 × 4 cells · resolution 1 · positions outside clamp to the edge cells", "muted", { row: 3 }));
      } else if (view === "follow-field") {
        const agent = agentOf(values);
        out.push(...fieldLayers(), glyph(values.agent, "agent", "input"));
        drawVector(agent.pos, agent.vel, "input", false, "vel");
        drawVector(agent.pos, natureScene.fixtures.fieldAtAgent(values), "muted", true, "cell direction");
        steeringLayers(out, context, agent.pos);
        out.push(label("max speed 1.5 · max force 0.6", "muted", { row: 3 }));
      } else if (view === "path") {
        const agent = agentOf(values);
        const pairs = [];
        for (let i = 0; i < NATURE_PATH.length - 1; i += 1) pairs.push([NATURE_PATH[i], NATURE_PATH[i + 1]]);
        out.push(segments(pairs, "muted", { weight: 14, alpha: 60 }), segments(pairs, "muted", { weight: 1 }), glyph(values.agent, "agent", "input"));
        drawVector(agent.pos, agent.vel, "input", false, "vel");
        const drawPath = (result, styleName, dashed, name) => {
          out.push(point(result.future, name + " future", styleName, { dashed }), segments([[agent.pos, result.future], [result.future, result.normal]], styleName, { weight: 1, dashed: true }), point(result.normal, name + " normal", styleName, { dashed }), point(result.target, name + " target", styleName, { dashed }));
        };
        if (isPathResult(context.expected)) drawPath(context.expected, "expected", true, "expected");
        if (isPathResult(context.actual)) drawPath(context.actual, style, false, text);
        out.push(label("look ahead 1.5 · target 0.6 along the segment past the normal point", "muted", { row: 3 }));
      } else if (view === "flock") {
        const agent = context.puzzle.id === "flock" ? agentUnitSpeed(values) : agentOf(values);
        const radius = context.puzzle.id === "separate" ? 1.2 : 2.5;
        NATURE_OTHERS.forEach((other) => { out.push(glyph({ x: other.pos.x, y: other.pos.y, yaw: Math.atan2(other.vel.y, other.vel.x) }, "", "muted"), arrow(other.pos, add(other.pos, other.vel), "muted", { weight: 1 })); });
        out.push(ellipse(agent.pos, [[radius * radius, 0], [0, radius * radius]], "muted", { scale: 1, dashed: true, label: context.puzzle.id === "flock" ? "neighbour radius 2.5 (separation 1.2)" : "radius " + fmt(radius) }), glyph(values.agent, "agent", "input"));
        drawVector(agent.pos, agent.vel, "input", false, "vel");
        steeringLayers(out, context, agent.pos);
        out.push(label("max speed 1.5 · max force 0.6 · grey boids are the neighbours", "muted", { row: 3 }));
      } else if (view === "angle") {
        out.push(ellipse(origin, [[1, 0], [0, 1]], "muted", { scale: 2, dashed: true }), arrow(origin, { x: 2.4, y: 0 }, "muted", { weight: 1 }), label("0", "muted", { at: { x: 2.5, y: 0.1 } }));
        out.push(arc(origin, 1.4, 0, values.angle, "input", { arrowhead: true }), label("angle " + fmt(values.angle) + " rad", "input", { at: { x: -5.2, y: 3.2 } }));
        if (Number.isFinite(context.expected)) out.push(arc(origin, 1.9, 0, context.expected, "expected", { dashed: true, arrowhead: true }));
        if (Number.isFinite(context.actual)) out.push(arc(origin, 1.0, 0, context.actual, style, { arrowhead: true }));
      } else if (view === "cone") {
        out.push(ellipse(origin, [[1, 0], [0, 1]], "muted", { scale: 2, dashed: true }));
        out.push(arrow(origin, direction(values.anchor, 2.2), "muted", { weight: 1 }), arc(origin, 1.6, values.anchor - values.constraint, values.anchor + values.constraint, "muted", { weight: 3 }), label("anchor ± constraint", "muted", { at: add(direction(values.anchor, 2.2), { x: 0.1, y: 0.2 }) }));
        out.push(arrow(origin, direction(values.angle, 1.9), "input", { weight: 2 }), label("angle", "input", { at: add(direction(values.angle, 1.9), { x: 0.1, y: 0.2 }) }));
        if (Number.isFinite(context.expected)) out.push(arrow(origin, direction(context.expected, 1.3), "expected", { dashed: true, weight: 2 }));
        if (Number.isFinite(context.actual)) out.push(arrow(origin, direction(context.actual, 1.0), style, { weight: 3 }), label(text + " " + fmt(context.actual) + " rad", style, { row: 3 }));
      } else if (view === "chain") {
        out.push(point(values.anchor, "anchor", "input"), ellipse(values.anchor, [[2.25, 0], [0, 2.25]], "muted", { scale: 1, dashed: true, label: "link length 1.5" }));
        out.push(arc(values.anchor, 1.1, values.prevAngle - values.constraint, values.prevAngle + values.constraint, "muted", { weight: 3 }), arrow(values.anchor, add(values.anchor, direction(values.prevAngle, 1.1)), "muted", { weight: 1, dashed: true }), point(values.joint, "joint (wants to be here)", "input"), segments([[values.anchor, values.joint]], "input", { weight: 1, dashed: true }));
        if (isChainResult(context.expected)) out.push(point(context.expected.pos, "expected", "expected", { dashed: true }), segments([[values.anchor, context.expected.pos]], "expected", { weight: 2, dashed: true }));
        if (isChainResult(context.actual)) out.push(point(context.actual.pos, text, style), segments([[values.anchor, context.actual.pos]], style, { weight: 3 }));
        out.push(label("previous link angle " + degrees(values.prevAngle) + " · cone ± " + degrees(values.constraint), "muted", { row: 3 }));
      } else if (view === "bins") {
        const count = natureScene.fixtures.binCount(values);
        const left = -4.5, width = 9 / count;
        out.push(segments([[{ x: left, y: 0 }, { x: 4.5, y: 0 }]], "muted", { weight: 2 }));
        for (let i = 0; i <= count; i += 1) out.push(marker({ x: left + i * width, y: 0 }, i < count ? String(i) : "", "muted", { height: 0.2 }));
        out.push(marker({ x: left + values.value * 9, y: 0 }, "value " + fmt(values.value), "input", { height: 0.45 }));
        if (Number.isFinite(context.expected)) out.push(shade({ x: left + context.expected * width, y: -0.7 }, { x: left + (context.expected + 1) * width, y: -0.3 }, "expected"), label("expected bin " + context.expected, "expected", { at: { x: left + context.expected * width, y: -0.9 } }));
        if (Number.isFinite(context.actual)) out.push(shade({ x: left + context.actual * width, y: 0.3 }, { x: left + (context.actual + 1) * width, y: 0.7 }, style), label(text + " bin " + context.actual, style, { at: { x: left + context.actual * width, y: 1 } }));
        out.push(label(count + " bins over [0, 1]", "muted", { row: 3 }));
      } else if (view === "histogram") {
        const count = natureScene.fixtures.binCount(values);
        out.push(segments([[{ x: -4.5, y: -2 }, { x: 4.5, y: -2 }]], "muted", { weight: 1 }), pointsPrimitive(NATURE_SAMPLES.map((s) => ({ x: -4.5 + s * 9, y: -2 })), "input", { size: 6, label: "samples in [0, 1]" }));
        if (isBins(context.expected)) out.push(histogramBars(context.expected, "expected", { shift: -0.12, alpha: 170 }));
        if (isBins(context.actual)) out.push(histogramBars(context.actual, style, { shift: 0.12 }));
        out.push(label(count + " bins · " + NATURE_SAMPLES.length + " samples", "muted", { row: 3 }));
      } else if (view === "normalize-histogram") {
        const counts = natureScene.fixtures.counts(values);
        out.push(histogramBars(counts, "input", { shift: -0.25, weight: 8, alpha: 150 }), label("counts " + counts.join(" · "), "input", { row: 3 }));
        if (isBins(context.expected)) out.push(histogramBars(context.expected, "expected", { shift: 0, weight: 8, alpha: 170, peak: 1 }));
        if (isBins(context.actual)) out.push(histogramBars(context.actual, style, { shift: 0.25, weight: 8, peak: 1 }));
      }
      const plainNumber = (value) => typeof value === "number" && view !== "angle" && view !== "cone" && context.puzzle.id !== "angle-between";
      const show = (value) => (plainNumber(value) ? fmt(value) : describe(value));
      out.push(...notes(context, show(context.expected), show(context.actual)));
      return out;
    },
  };
  // ------------------------------------------------------------ cses algo lab
  const ALGO_PRESETS = {
    "missing-number": { five: { a: [2, 3, 1, 5], b: 5 }, eight: { a: [8, 1, 3, 6, 2, 7, 4], b: 8 }, "missing at the end": { a: [1, 2, 3, 4, 5, 6, 7], b: 8 } },
    "increasing-array": { sample: { a: [3, 2, 5, 1, 7] }, "already sorted": { a: [1, 2, 3, 4, 5] }, flat: { a: [5, 5, 5, 5] }, "big drop": { a: [10, 1, 1, 1] } },
    "distinct-numbers": { sample: { a: [2, 3, 2, 2, 3, 5, 1, 5] }, "all same": { a: [4, 4, 4, 4] }, "all different": { a: [1, 2, 3, 4, 5, 6] } },
    "prefix-sums": { sample: { a: [3, 2, 4, 5, 1, 1, 5, 3] }, "with negatives": { a: [2, -3, 4, -1, 2] }, ones: { a: [1, 1, 1, 1, 1] } },
    "lower-bound": { sample: { a: [1, 2, 3, 4, 5, 6, 7, 8] }, "with gaps": { a: [1, 3, 3, 5, 8, 8, 9] } },
    "sum-of-two-values": { sample: { a: [2, 7, 5, 1] }, "no pair": { a: [1, 2, 3] }, "equal halves": { a: [3, 3, 8] } },
    "maximum-subarray-sum": { "CSES sample": { a: [-1, 3, -2, 5, 3, -5, 2, 2] }, "all negative": { a: [-3, -1, -2] }, alternating: { a: [2, -1, 2, -1, 2] } },
    "ferris-wheel": { "CSES sample": { a: [7, 2, 3, 9] }, "all light": { a: [1, 1, 1, 1, 2] }, "all heavy": { a: [9, 8, 9, 7] } },
    "chessboard-and-queens": {
      empty: { a: ["........", "........", "........", "........", "........", "........", "........", "........"] },
      "CSES sample": { a: ["........", "........", "..*.....", "........", "........", ".....**.", "...*....", "........"] },
      "blocked corners": { a: ["*......*", "........", "........", "........", "........", "........", "........", "*......*"] },
      "blocked row": { a: ["........", "........", "........", "****....", "........", "........", "........", "........"] },
    },
    "minimizing-coins": { "1 5 7": { a: [1, 5, 7] }, "4 3": { a: [4, 3] }, "2 only": { a: [2] } },
    "coin-combinations-i": { "2 3 5": { a: [2, 3, 5] }, "1 2": { a: [1, 2] }, "2 only": { a: [2] } },
    "coin-combinations-ii": { "2 3 5": { a: [2, 3, 5] }, "1 2": { a: [1, 2] }, "2 only": { a: [2] } },
    "grid-paths": { "CSES sample": { a: ["....", ".*..", "...*", "*..."] }, "open 3×3": { a: ["...", "...", "..."] }, blocked: { a: ["..*", "*..", "..."] } },
    "book-shop": { "CSES sample": { a: [4, 8, 5, 3], b: [5, 12, 8, 1] }, "cheap and thick": { a: [1, 2, 3, 9], b: [3, 4, 5, 20] }, "all expensive": { a: [15, 16, 17], b: [1, 2, 3] } },
    "counting-rooms": { "CSES sample": { a: ["########", "#..#...#", "####.#.#", "#..#...#", "########"] }, "one room": { a: ["....", "....", "...."] }, checkerboard: { a: [".#.#.", "#.#.#", ".#.#."] } },
    "labyrinth": { "CSES sample": { a: ["########", "#.A#...#", "#.##.#B#", "#......#", "########"] }, straight: { a: ["A......B"] }, blocked: { a: ["A.#.B", "..#..", "..#.."] } },
    "building-roads": {
      "CSES sample": { a: 4, b: [[1, 2], [3, 4]], c: [{ x: -3, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 3, y: -1 }] },
      "three islands": { a: 5, b: [[2, 3], [4, 5]], c: [{ x: -4, y: 0 }, { x: -1.5, y: 1.5 }, { x: 0, y: 0 }, { x: 2, y: -1.5 }, { x: 4, y: 0 }] },
      connected: { a: 4, b: [[1, 2], [2, 3], [3, 4]], c: [{ x: -3, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 3, y: 0 }] },
    },
    "building-teams": {
      "CSES sample": { a: 5, b: [[1, 2], [1, 3], [4, 5]], c: [{ x: -3, y: 1.5 }, { x: -4, y: -1 }, { x: -2, y: -1 }, { x: 2, y: 1 }, { x: 3.5, y: -1 }] },
      triangle: { a: 3, b: [[1, 2], [2, 3], [1, 3]], c: [{ x: -2, y: -1 }, { x: 2, y: -1 }, { x: 0, y: 2 }] },
      square: { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 1]], c: [{ x: -2, y: 2 }, { x: 2, y: 2 }, { x: 2, y: -2 }, { x: -2, y: -2 }] },
    },
    "heap-push": { "small heap": { a: [[1, 10], [3, 20], [2, 30]] }, empty: { a: [] }, chain: { a: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]] } },
    "heap-pop": { "small heap": { a: [[0, 40], [1, 10], [2, 30], [3, 20]] }, "two items": { a: [[1, 10], [2, 20]] }, chain: { a: [[1, 1], [5, 2], [2, 3], [6, 4], [7, 5]] } },
    "shortest-routes": {
      "CSES sample": { a: 3, b: [[1, 2, 6], [1, 3, 2], [3, 2, 3]], c: [{ x: -3, y: 0 }, { x: 3, y: 0 }, { x: 0, y: -2 }] },
      "detour is shorter": { a: 4, b: [[1, 2, 1], [2, 3, 1], [3, 4, 1], [1, 4, 5]], c: [{ x: -4, y: 0 }, { x: -1.5, y: 2 }, { x: 1.5, y: 2 }, { x: 4, y: 0 }] },
      unreachable: { a: 3, b: [[2, 3, 4]], c: [{ x: -3, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 0 }] },
    },
    "static-range-sum-queries": { "CSES sample": { a: [3, 2, 4, 5, 1, 1, 5, 3], b: [[2, 4], [5, 6], [1, 8], [3, 3]] }, ones: { a: [1, 1, 1, 1, 1, 1], b: [[1, 3], [2, 5]] } },
    "build-segment-tree": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "segment-tree-update": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "segment-tree-query": { "eight values": { a: [3, 2, 4, 5, 1, 1, 5, 3] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1] } },
    "dynamic-range-sum-queries": { "CSES sample": { a: [3, 2, 4, 5, 1, 1, 5, 3], b: [[2, 1, 4], [2, 5, 6], [1, 3, 1], [2, 1, 4]] }, ones: { a: [1, 1, 1, 1, 1, 1, 1, 1], b: [[2, 1, 8], [1, 4, 9], [2, 3, 5]] } },
    "subordinates": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "tree-diameter": { "CSES sample": { a: 5, b: [1, 1, 3, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "tree-distances": { "CSES sample": { a: 5, b: [1, 1, 3, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "binary-lifting-table": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "kth-ancestor": { "CSES sample": { a: 5, b: [1, 1, 2, 3] }, chain: { a: 5, b: [1, 2, 3, 4] }, star: { a: 5, b: [1, 1, 1, 1] } },
    "company-queries-ii": { "CSES sample": { a: 5, b: [1, 1, 2, 3], c: [[4, 5], [4, 2], [3, 5]] }, chain: { a: 5, b: [1, 2, 3, 4], c: [[5, 2], [3, 3]] }, star: { a: 5, b: [1, 1, 1, 1], c: [[2, 3], [4, 5]] } },
  };
  function algoPreset(values, puzzle) {
    const table = puzzle.presets || ALGO_PRESETS[puzzle.id] || {};
    return table[values.preset] || table[Object.keys(table)[0]] || {};
  }
  function algoSegmentTree(list) {
    const n = list.length;
    const tree = new Array(2 * n).fill(0);
    for (let i = 0; i < n; i += 1) tree[n + i] = list[i];
    for (let i = n - 1; i >= 1; i -= 1) tree[i] = tree[2 * i] + tree[2 * i + 1];
    return tree;
  }
  function algoLifting(n, bosses, levels) {
    const up = [];
    const first = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2];
    up.push(first);
    for (let k = 1; k < levels; k += 1) {
      const previous = up[k - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return up;
  }
  function parentsFromBosses(n, bosses) {
    const parent = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) parent[v] = bosses[v - 2];
    return parent;
  }
  function parentsFromEdges(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    edges.forEach((edge) => { if (adjacency[edge[0]] && adjacency[edge[1]]) { adjacency[edge[0]].push(edge[1]); adjacency[edge[1]].push(edge[0]); } });
    const parent = new Array(n + 1).fill(0);
    const seen = new Array(n + 1).fill(false);
    const queue = [1];
    seen[1] = true;
    for (let i = 0; i < queue.length; i += 1) {
      const v = queue[i];
      adjacency[v].forEach((u) => { if (!seen[u]) { seen[u] = true; parent[u] = v; queue.push(u); } });
    }
    return parent;
  }
  function algoFactorials(limit) {
    const m = 1000000007;
    const mul = (a, b) => { const high = Math.floor(a / 65536), low = a % 65536; return ((high * b % m) * 65536 + low * b) % m; };
    const fact = [1];
    for (let i = 1; i <= limit; i += 1) fact.push(mul(fact[i - 1], i));
    const inverseFact = new Array(limit + 1).fill(1);
    let power = 1, left = m - 2, factor = fact[limit];
    while (left > 0) { if (left % 2 === 1) power = mul(power, factor); factor = mul(factor, factor); left = Math.floor(left / 2); }
    inverseFact[limit] = power;
    for (let i = limit; i >= 1; i -= 1) inverseFact[i - 1] = mul(inverseFact[i], i);
    return { fact, inverseFact };
  }
  function algoSpf(limit) {
    const spf = new Array(limit + 1).fill(0);
    for (let i = 2; i <= limit; i += 1) { if (spf[i] !== 0) continue; for (let j = i; j <= limit; j += i) if (spf[j] === 0) spf[j] = i; }
    return spf;
  }
  // Outputs drawn on the graph view: lists of edges (as lines or arrows) and sets of nodes.
  const ALGO_EDGE_OUTPUTS = { "building-roads": "roads", "necessary-roads": "roads", "prufer-code": "roads", "network-renovation": "roads", "acyclic-graph-edges": "arrows", "strongly-connected-edges": "arrows", "even-outdegree-edges": "arrows", "new-flight-routes": "arrows" };
  const ALGO_NODE_SET_OUTPUTS = new Set(["necessary-cities", "tree-centers", "critical-cities", "visiting-cities", "creating-offices"]);
  function treeLayoutFromParents(n, parent) {
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let v = 1; v <= n; v += 1) if (parent[v] >= 1) children[parent[v]].push(v);
    const depth = new Array(n + 1).fill(0);
    const order = [1];
    for (let i = 0; i < order.length; i += 1) { const v = order[i]; children[v].forEach((u) => { depth[u] = depth[v] + 1; order.push(u); }); }
    const x = new Array(n + 1).fill(0);
    const pointer = new Array(n + 1).fill(0);
    const stack = [1];
    let slot = 0;
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (pointer[v] < children[v].length) { const u = children[v][pointer[v]]; pointer[v] += 1; stack.push(u); continue; }
      if (children[v].length === 0) { x[v] = slot; slot += 1; }
      else x[v] = (x[children[v][0]] + x[children[v][children[v].length - 1]]) / 2;
      stack.pop();
    }
    const width = Math.max(1, slot - 1);
    const maxDepth = Math.max(1, ...depth.slice(1));
    const positions = [null];
    for (let v = 1; v <= n; v += 1) positions.push({ x: -4 + 8 * x[v] / width, y: 2.6 - 4.2 * depth[v] / maxDepth });
    return positions;
  }
  function algoRootedAncestors(n, edges) {
    const parent = parentsFromEdges(n, edges);
    const depth = new Array(n + 1).fill(0);
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let v = 1; v <= n; v += 1) if (parent[v] >= 1) children[parent[v]].push(v);
    const order = [1];
    for (let i = 0; i < order.length; i += 1) { const v = order[i]; children[v].forEach((u) => { depth[u] = depth[v] + 1; order.push(u); }); }
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    const up = [parent.slice()];
    for (let j = 1; j < levels; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return { parent, depth, order, up };
  }
  function algoBars(list, style, options) {
    const opts = options || {};
    const n = Math.max(1, list.length);
    const left = -5, span = 10, width = span / n;
    const peak = Math.max(1e-9, ...list.map((v) => Math.abs(v)));
    const base = opts.base === undefined ? -0.6 : opts.base;
    const height = opts.height || 2.6;
    const pairs = list.map((v, i) => { const x = left + (i + 0.5) * width + (opts.shift || 0); return [{ x, y: base }, { x, y: base + height * (v / (opts.peak || peak)) }]; });
    return segments(pairs, style, { weight: opts.weight || Math.max(3, Math.min(12, 60 / n)), alpha: opts.alpha, dashed: opts.dashed });
  }
  function algoGridLayers(grid, options) {
    const opts = options || {};
    const rows = grid.length, cols = grid[0].length;
    const size = Math.min(9 / cols, 5.6 / rows, 1.2);
    const left = -cols * size / 2, top = 3.2;
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const ch = grid[r][c];
        const a = { x: left + c * size, y: top - r * size }, b = { x: left + (c + 1) * size, y: top - (r + 1) * size };
        if (ch === "#" || ch === "*") out.push(shade(a, b, "input"), shade({ x: a.x + size * 0.15, y: a.y - size * 0.15 }, { x: b.x - size * 0.15, y: b.y + size * 0.15 }, "input"));
        else if (/^[A-Z]$/.test(ch)) out.push(label(ch, "input", { at: { x: a.x + size * 0.3, y: b.y + size * 0.35 } }));
        if (opts.cellLabels && opts.cellLabels[r] && opts.cellLabels[r][c] !== undefined) out.push(label(String(opts.cellLabels[r][c]), opts.style || "muted", { at: { x: a.x + size * 0.25, y: b.y + size * 0.35 } }));
      }
    }
    const lines = [];
    for (let r = 0; r <= rows; r += 1) lines.push([{ x: left, y: top - r * size }, { x: left + cols * size, y: top - r * size }]);
    for (let c = 0; c <= cols; c += 1) lines.push([{ x: left + c * size, y: top }, { x: left + c * size, y: top - rows * size }]);
    out.push(segments(lines, "muted", { weight: 1 }));
    return out;
  }
  // A treap laid out by in-order position and depth; a flipped subtree is read mirrored, as the bricks would.
  function treapLayers(root, left, right, caption, style) {
    const out = [label(caption, style, { at: { x: left, y: -3.4 } })];
    const nodes = [];
    const walk = (t, flipped, depth, parent) => {
      if (!t || typeof t !== "object" || nodes.length >= 63 || depth > 12) return;
      const reversed = flipped !== Boolean(t.flip);
      const holder = { t, depth, parent, index: -1 };
      walk(reversed ? t.right : t.left, reversed, depth + 1, holder);
      holder.index = nodes.length;
      nodes.push(holder);
      walk(reversed ? t.left : t.right, reversed, depth + 1, holder);
    };
    walk(root, false, 0, null);
    if (!nodes.length) { out.push(label("empty", "muted", { at: { x: left, y: 1.4 } })); return out; }
    const deepest = Math.max(...nodes.map((h) => h.depth));
    const step = Math.min(0.9, 4.4 / (deepest + 1));
    const at = (h) => ({ x: left + (right - left) * (h.index + 0.5) / nodes.length, y: 1.6 - h.depth * step });
    nodes.forEach((h) => { if (h.parent && h.parent.index >= 0) out.push(segments([[at(h.parent), at(h)]], style, { weight: 1 })); });
    nodes.forEach((h) => out.push(point(at(h), String(h.t.value) + (h.t.flip ? " ↔" : ""), style)));
    return out;
  }
  function heapTreeLayers(heap, style, offsetX, caption) {
    const out = [];
    const positions = [];
    for (let i = 0; i < heap.length; i += 1) {
      const level = Math.floor(Math.log2(i + 1));
      const first = (1 << level) - 1, count = 1 << level;
      const x = offsetX + (-2.2 + 4.4 * ((i - first) + 0.5) / count);
      positions.push({ x, y: 2.4 - level * 1.15 });
    }
    for (let i = 1; i < heap.length; i += 1) out.push(segments([[positions[(i - 1) >> 1], positions[i]]], style, { weight: 1 }));
    positions.forEach((at, i) => out.push(point(at, String(heap[i][0]) + (heap[i][1] !== undefined ? "·" + heap[i][1] : ""), style)));
    if (caption) out.push(label(caption, style, { at: { x: offsetX - 2.2, y: 3.4 } }));
    return out;
  }
  function segmentTreeLayers(tree, style, options) {
    const opts = options || {};
    const out = [];
    const n = tree.length / 2;
    if (!(n >= 1)) return out;
    const levels = Math.ceil(Math.log2(n)) + 1;
    for (let i = 1; i < tree.length; i += 1) {
      const level = Math.floor(Math.log2(i));
      const first = 1 << level, count = 1 << level;
      const at = { x: -4.5 + 9 * ((i - first) + 0.5) / count, y: 3 - level * (4.6 / levels) };
      if (i >= 2) { const parentLevel = Math.floor(Math.log2(i >> 1)); const pf = 1 << parentLevel; out.push(segments([[{ x: -4.5 + 9 * (((i >> 1) - pf) + 0.5) / pf, y: 3 - parentLevel * (4.6 / levels) }, at]], "muted", { weight: 1 })); }
      const highlighted = opts.highlight && opts.highlight.has(i);
      out.push(point(at, String(tree[i]), highlighted ? style : (i >= n ? "input" : "muted"), { dashed: opts.dashed }));
    }
    return out;
  }
  function ellipseLayout(n) {
    const out = [];
    for (let i = 0; i < n; i += 1) { const angle = -Math.PI / 2 + 2 * Math.PI * i / Math.max(1, n); out.push({ x: 4 * Math.cos(angle), y: 2.4 * Math.sin(angle) }); }
    return out;
  }
  const algoScene = {
    fixtures: {
      presetA: (values, puzzle) => algoPreset(values, puzzle).a,
      presetB: (values, puzzle) => algoPreset(values, puzzle).b,
      presetC: (values, puzzle) => algoPreset(values, puzzle).c,
      presetD: (values, puzzle) => algoPreset(values, puzzle).d,
      presetE: (values, puzzle) => algoPreset(values, puzzle).e,
      presetF: (values, puzzle) => algoPreset(values, puzzle).f,
      presetEdges: (values, puzzle) => algoPreset(values, puzzle).b.map((boss, i) => [boss, i + 2]),
      roundedN: (values) => Math.round(values.n),
      roundedX: (values) => Math.round(values.x),
      roundedTarget: (values) => Math.round(values.target),
      roundedIndex: (values) => Math.round(values.index),
      roundedValue: (values) => Math.round(values.value),
      roundedV: (values) => Math.round(values.v),
      roundedK: (values) => Math.round(values.k),
      roundedY: (values) => Math.round(values.y),
      roundedA: (values) => Math.round(values.a),
      roundedB: (values) => Math.round(values.b),
      roundedKString: (values) => String(Math.round(values.k)),
      roundedNString: (values) => String(Math.round(values.n)),
      factorialTable: (values, puzzle) => algoFactorials(algoPreset(values, puzzle).a),
      spfTable: (values, puzzle) => algoSpf(algoPreset(values, puzzle).a),
      roundedDelta: (values) => Math.round(values.delta),
      roundedM: (values) => Math.round(values.m),
      roundedBAtLeastA: (values) => Math.max(Math.round(values.a), Math.round(values.b)),
      rangeLo: (values) => Math.min(Math.round(values.l), Math.round(values.r)),
      rangeHi: (values) => Math.max(Math.round(values.l), Math.round(values.r)),
      pushItem: (values) => [Math.round(values.key), 99],
      builtTree: (values, puzzle) => algoSegmentTree(algoPreset(values, puzzle).a),
      liftingTable: (values, puzzle) => algoLifting(algoPreset(values, puzzle).a, algoPreset(values, puzzle).b, 3),
      ancestorTable: (values, puzzle) => algoRootedAncestors(algoPreset(values, puzzle).a, algoPreset(values, puzzle).b),
    },
    layers(context) {
      const view = context.puzzle.scene.view;
      const values = context.values;
      const out = laneLayers(context.puzzle, values);
      const style = resultStyle(context), text = resultLabel(context);
      const chosen = algoPreset(values, context.puzzle);
      const isNumberList = (v) => Array.isArray(v) && v.every(Number.isFinite);
      if (view === "sequence") {
        if (isNumberList(context.expected)) out.push(algoBars(context.expected, "expected", { alpha: 160, shift: -0.05 }));
        if (isNumberList(context.actual)) out.push(algoBars(context.actual, style, { shift: 0.05 }));
        out.push(label("n = " + Math.round(values.n) + " · bars are the values of the sequence, left to right", "muted", { row: 3 }));
      } else if (view === "bars") {
        const input = Array.isArray(chosen.a) ? chosen.a : null;
        if (input && input.every(Number.isFinite)) {
          out.push(algoBars(input, "input", { base: -3.0, height: 1.6, weight: 10 }));
          input.forEach((v, i) => out.push(label(String(v), "input", { at: { x: -5 + (i + 0.5) * (10 / input.length) - 0.1, y: -3.3 } })));
        }
        if (Array.isArray(context.expected) && context.expected.length === 2 && context.expected.every(Number.isInteger) && context.puzzle.id === "sum-of-two-values") {
          context.expected.forEach((position) => out.push(marker({ x: -5 + (position - 0.5) * (10 / input.length), y: -1.0 }, "", "expected", { height: 0.3 })));
        }
        if (Array.isArray(context.actual) && context.actual.length === 2 && context.actual.every(Number.isInteger) && context.puzzle.id === "sum-of-two-values") {
          context.actual.forEach((position) => out.push(marker({ x: -5 + (position - 0.5) * (10 / input.length), y: -0.4 }, "", style, { height: 0.3 })));
        }
        if (isNumberList(context.expected) && context.puzzle.id !== "sum-of-two-values") out.push(algoBars(context.expected, "expected", { base: 0, height: 2.2, alpha: 160, shift: -0.06 }));
        if (isNumberList(context.actual) && context.puzzle.id !== "sum-of-two-values") out.push(algoBars(context.actual, style, { base: 0, height: 2.2, shift: 0.06 }));
        if (context.puzzle.id === "lower-bound" && Number.isFinite(context.actual) && input) out.push(marker({ x: -5 + Math.min(context.actual, input.length) * (10 / input.length), y: -1.0 }, "index " + context.actual, style, { height: 0.5 }));
      } else if (view === "sets") {
        const n = Math.round(values.n);
        for (let v = 1; v <= n; v += 1) out.push(point({ x: -4.5 + 9 * (v - 0.5) / n, y: 1.2 }, String(v), "input"));
        const drawSets = (result, styleName, y) => { if (!result || !Array.isArray(result.a)) return; result.a.forEach((v) => out.push(marker({ x: -4.5 + 9 * (v - 0.5) / n, y }, "", styleName, { height: 0.25 }))); result.b.forEach((v) => out.push(marker({ x: -4.5 + 9 * (v - 0.5) / n, y: y - 0.8 }, "", styleName, { height: 0.25 }))); };
        drawSets(context.expected, "expected", -0.2);
        drawSets(context.actual, style, -0.35);
        out.push(label("upper marks: set a · lower marks: set b", "muted", { row: 3 }));
      } else if (view === "board" || view === "grid") {
        if (Array.isArray(chosen.a)) out.push(...algoGridLayers(chosen.a));
      } else if (view === "number" || view === "coins" || view === "shop") {
        if (view === "coins" && Array.isArray(chosen.a)) {
          const x = Math.round(values.x);
          out.push(segments([[{ x: -4.5, y: 0 }, { x: 4.5, y: 0 }]], "muted", { weight: 2 }), marker({ x: 4.5, y: 0 }, "x = " + x, "input", { height: 0.4 }), marker({ x: -4.5, y: 0 }, "0", "muted", { height: 0.3 }));
          chosen.a.forEach((coin, i) => out.push(marker({ x: -4.5 + 9 * Math.min(1, coin / Math.max(1, x)), y: -1.2 - i * 0.5 }, "coin " + coin, "input", { height: 0.2 })));
        }
        if (view === "shop" && Array.isArray(chosen.a)) {
          out.push(label("price →", "muted", { at: { x: 4, y: -3.3 } }), label("↑ pages", "muted", { at: { x: -5.2, y: 2.5 } }));
          const maxPrice = Math.max(1, ...chosen.a), maxPages = Math.max(1, ...chosen.b);
          chosen.a.forEach((price, i) => out.push(point({ x: -4.5 + 8.5 * price / maxPrice, y: -2.8 + 5 * chosen.b[i] / maxPages }, price + " → " + chosen.b[i] + "p", "input")));
          out.push(marker({ x: -4.5 + 8.5 * Math.min(1, Math.round(values.x) / maxPrice), y: -2.8 }, "budget " + Math.round(values.x), "muted", { height: 0.5 }));
        }
        if (view === "number") { const sliders = context.puzzle.scene.handles.filter((handle) => handle.type === "slider"); out.push(label(sliders.map((handle) => handle.id + " = " + Math.round(values[handle.id])).join(" · "), "input", { row: 3 })); }
      } else if (view === "rectangle") {
        const rows = Math.round(values.n !== undefined ? values.n : values.a), cols = Math.round(values.m !== undefined ? values.m : values.b);
        if (rows >= 1 && cols >= 1 && rows * cols <= 400) { const cells = []; for (let r = 0; r < rows; r += 1) cells.push(".".repeat(cols)); out.push(...algoGridLayers(cells)); }
        out.push(label(rows + " × " + cols, "input", { row: 3 }));
      } else if (view === "text") {
        const input = typeof chosen.a === "string" ? chosen.a : "";
        const cell = Math.min(0.9, 10 / Math.max(1, input.length));
        for (let i = 0; i < input.length && i < 60; i += 1) out.push(label(input[i], "input", { at: { x: -5 + (i + 0.5) * cell - 0.1, y: 1.4 } }));
        if (typeof chosen.b === "string") { const cellB = Math.min(0.9, 10 / Math.max(1, chosen.b.length)); for (let i = 0; i < chosen.b.length && i < 60; i += 1) out.push(label(chosen.b[i], "muted", { at: { x: -5 + (i + 0.5) * cellB - 0.1, y: 0.6 } })); }
        const drawText = (value, styleName, y) => { if (typeof value !== "string") return; for (let i = 0; i < value.length && i < 60; i += 1) out.push(label(value[i], styleName, { at: { x: -5 + (i + 0.5) * cell - 0.1, y } })); };
        drawText(context.expected, "expected", -0.2);
        drawText(context.actual, style, -1.2);
      } else if (view === "plane") {
        const rowsOf = (list) => (Array.isArray(list) ? list.filter((row) => Array.isArray(row) && row.length >= 2 && row.every(Number.isFinite)) : []);
        const spots = rowsOf(chosen.points), loop = rowsOf(chosen.polygon), sticks = rowsOf(chosen.segments), marks = rowsOf(chosen.marks), boxes = rowsOf(chosen.rectangles), rays = rowsOf(chosen.lines);
        const xs = [], ys = [];
        spots.concat(loop, marks).forEach((p) => { xs.push(p[0]); ys.push(p[1]); });
        sticks.concat(boxes).forEach((s) => { xs.push(s[0], s[2]); ys.push(s[1], s[3]); });
        const xlo = Number.isFinite(chosen.xlo) ? chosen.xlo : 0, xhi = Number.isFinite(chosen.xhi) ? chosen.xhi : 8;
        if (rays.length) { xs.push(xlo, xhi); rays.forEach((line) => { ys.push(line[0] * xlo + line[1], line[0] * xhi + line[1]); }); }
        if (xs.length) {
          const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
          const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
          const scale = Math.min(9 / Math.max(1, maxX - minX), 5 / Math.max(1, maxY - minY));
          const at = (x, y) => ({ x: -4.5 + (x - minX) * scale, y: -2.4 + (y - minY) * scale });
          rays.forEach((line) => out.push(segments([[at(xlo, line[0] * xlo + line[1]), at(xhi, line[0] * xhi + line[1])]], "muted", { weight: 2 })));
          boxes.forEach((r) => out.push(segments([[at(r[0], r[1]), at(r[2], r[1])], [at(r[2], r[1]), at(r[2], r[3])], [at(r[2], r[3]), at(r[0], r[3])], [at(r[0], r[3]), at(r[0], r[1])]], "input", { weight: 2 })));
          if (loop.length > 1) { const edges = []; for (let i = 0; i < loop.length; i += 1) { const q = loop[(i + 1) % loop.length]; edges.push([at(loop[i][0], loop[i][1]), at(q[0], q[1])]); } out.push(segments(edges, "input", { weight: 3 })); }
          sticks.forEach((s) => out.push(segments([[at(s[0], s[1]), at(s[2], s[3])]], "input", { weight: 3 })));
          const named = spots.concat(loop).length <= 12;
          spots.concat(loop).forEach((p) => out.push(point(at(p[0], p[1]), named ? "(" + p[0] + ", " + p[1] + ")" : "", "input")));
          marks.forEach((p) => out.push(point(at(p[0], p[1]), "(" + p[0] + ", " + p[1] + ")", "expected", { dashed: true })));
        }
      } else if (view === "intervals") {
        const list = Array.isArray(chosen.a) ? chosen.a.filter((p) => Array.isArray(p) && p.length >= 2) : [];
        if (list.length) {
          const lo = Math.min(...list.map((p) => p[0])), hi = Math.max(...list.map((p) => p[1]));
          const span = Math.max(1, hi - lo);
          const xOf = (v) => -4.8 + 9.6 * (v - lo) / span;
          list.forEach((p, i) => {
            const y = 2.6 - i * (4.4 / Math.max(1, list.length));
            out.push(segments([[{ x: xOf(p[0]), y }, { x: xOf(p[1]), y }]], "input", { weight: 4 }), label(p[0] + "–" + p[1] + (p.length > 2 ? " · " + p[2] : ""), "muted", { at: { x: xOf(p[1]) + 0.15, y: y + 0.12 } }));
          });
        }
      } else if (view === "two-arrays") {
        const a = Array.isArray(chosen.a) ? chosen.a : [], b = Array.isArray(chosen.b) ? chosen.b : [];
        if (a.length) out.push(algoBars(a, "input", { base: 0.4, height: 2.2, weight: 8 }), label("a", "input", { at: { x: -5.4, y: 0.5 } }));
        if (b.length) out.push(algoBars(b, "muted", { base: -3.2, height: 2.2, weight: 8 }), label("b", "muted", { at: { x: -5.4, y: -3.1 } }));
      } else if (view === "letter-grid" || view === "number-grid") {
        const drawCells = (rows, left, styleName) => {
          if (!Array.isArray(rows) || !rows.length) return;
          const height = rows.length, width = Array.isArray(rows[0]) ? rows[0].length : String(rows[0]).length;
          const size = Math.min(4.6 / width, 5.4 / height, 1.1);
          const top = 3;
          for (let r = 0; r < height; r += 1) {
            for (let c = 0; c < width; c += 1) {
              const cell = Array.isArray(rows[r]) ? rows[r][c] : rows[r][c];
              out.push(label(String(cell), styleName, { at: { x: left + c * size + size * 0.25, y: top - r * size - size * 0.7 } }));
            }
          }
          const lines = [];
          for (let r = 0; r <= height; r += 1) lines.push([{ x: left, y: top - r * size }, { x: left + width * size, y: top - r * size }]);
          for (let c = 0; c <= width; c += 1) lines.push([{ x: left + c * size, y: top }, { x: left + c * size, y: top - height * size }]);
          out.push(segments(lines, "muted", { weight: 1 }));
        };
        const inputRows = Array.isArray(chosen.a) && chosen.a.length > 0 && (Array.isArray(chosen.a[0]) || typeof chosen.a[0] === "string") ? chosen.a : null;
        if (view === "letter-grid" || inputRows) { drawCells(inputRows, -5, "input"); out.push(label("input", "input", { at: { x: -5, y: 3.3 } })); }
        else { const sliders = context.puzzle.scene.handles.filter((handle) => handle.type === "slider"); out.push(label(sliders.map((handle) => handle.id + " = " + Math.round(values[handle.id])).join(" \u00b7 "), "input", { at: { x: -5, y: 3.3 } })); }
        const gridLike = (v) => Array.isArray(v) && v.length > 0 && v.every((row) => Array.isArray(row) || typeof row === "string");
        const shown = gridLike(context.actual) ? context.actual : (gridLike(context.expected) ? context.expected : null);
        if (shown) { drawCells(shown, 0.4, gridLike(context.actual) ? style : "expected"); out.push(label(gridLike(context.actual) ? text : "expected", gridLike(context.actual) ? style : "expected", { at: { x: 0.4, y: 3.3 } })); }
      } else if (view === "graph") {
        const forestOf = (v) => (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.parent) ? v : null);
        const forestLinks = (dsu) => { const links = []; for (let v = 1; v < dsu.parent.length; v += 1) if (dsu.parent[v] !== v) links.push([v, dsu.parent[v]]); return links; };
        const forest = forestOf(chosen.a);
        const nodeCount = forest ? forest.parent.length - 1 : (Array.isArray(chosen.a) ? chosen.a.length : (Number.isFinite(chosen.a) ? chosen.a : 0));
        const hasPositions = (list) => Array.isArray(list) && list.length > 0 && list[0] && typeof list[0] === "object" && !Array.isArray(list[0]);
        const treeLayout = chosen.tree && Array.isArray(chosen.b) && nodeCount <= 60 ? treeLayoutFromParents(nodeCount, parentsFromEdges(nodeCount, chosen.b)).slice(1) : null;
        const positions = hasPositions(chosen.positions) ? chosen.positions : (hasPositions(chosen.c) ? chosen.c : (treeLayout || ellipseLayout(Math.min(nodeCount, 60))));
        const edges = forest ? forestLinks(forest) : Array.isArray(chosen.b) ? chosen.b : (chosen.functional && Array.isArray(chosen.a) ? chosen.a.map((t, i) => [i + 1, t]) : []);
        const directed = forest ? true : chosen.directed !== undefined ? chosen.directed : edges.some((edge) => edge.length > 2);
        edges.forEach((edge) => {
          const a = positions[edge[0] - 1], b = positions[edge[1] - 1];
          if (!a || !b) return;
          if (edge[0] === edge[1]) { out.push(label("\u21ba", "muted", { at: { x: a.x + 0.25, y: a.y + 0.3 } })); return; }
          if (directed) out.push(arrow(a, b, "muted", { weight: 1.5 })); else out.push(segments([[a, b]], "muted", { weight: 2 }));
          if (edge.length > 2) out.push(label(String(edge[2]), "muted", { at: { x: (a.x + b.x) / 2 + 0.1, y: (a.y + b.y) / 2 + 0.2 } }));
        });
        positions.forEach((at, i) => out.push(point(at, String(i + 1), "input")));
        if (isNumberList(chosen.marks)) chosen.marks.forEach((v) => { const at = positions[v - 1]; if (at) out.push(label("◆", "input", { at: { x: at.x - 0.42, y: at.y + 0.32 } })); });
        const roads = (list, styleName, dashed) => list.forEach((road) => { const a = positions[road[0] - 1], b = positions[road[1] - 1]; if (a && b) out.push(segments([[a, b]], styleName, { weight: 2, dashed })); });
        if (forest) {
          const links = (dsu, styleName, dashed) => forestLinks(dsu).forEach((link) => { const a = positions[link[0] - 1], b = positions[link[1] - 1]; if (a && b) out.push(arrow(a, b, styleName, { weight: 2, dashed })); });
          if (forestOf(context.expected)) links(forestOf(context.expected), "expected", true);
          if (forestOf(context.actual)) links(forestOf(context.actual), style, false);
          out.push(label("arrows point to parents · components " + forest.components + (forestOf(context.actual) ? " → " + forestOf(context.actual).components : ""), "input", { row: 3 }));
        } else if (ALGO_EDGE_OUTPUTS[context.puzzle.id]) {
          const kind = ALGO_EDGE_OUTPUTS[context.puzzle.id];
          const draw = (list, styleName, dashed) => { if (!Array.isArray(list)) return; list.forEach((road) => { if (!Array.isArray(road)) return; const a = positions[road[0] - 1], b = positions[road[1] - 1]; if (a && b) out.push(kind === "arrows" ? arrow(a, b, styleName, { weight: 2, dashed }) : segments([[a, b]], styleName, { weight: 2, dashed })); }); };
          draw(context.expected, "expected", true);
          draw(context.actual, style, false);
        } else if (ALGO_NODE_SET_OUTPUTS.has(context.puzzle.id)) {
          const mark = (list, styleName, dy) => { if (!isNumberList(list)) return; list.forEach((v) => { const at = positions[v - 1]; if (at) out.push(marker({ x: at.x, y: at.y + dy }, "", styleName, { height: 0.25 })); }); };
          mark(context.expected, "expected", -0.45);
          mark(context.actual, style, -0.7);
        } else if (context.puzzle.id === "course-schedule" || context.puzzle.id === "course-schedule-ii") {
          const places = (list, styleName, dy) => { if (!isNumberList(list)) return; list.forEach((v, i) => { const at = positions[v - 1]; if (at) out.push(label("#" + (i + 1), styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          places(context.expected, "expected", 0.45);
          places(context.actual, style, -0.35);
          out.push(label("labels are places in the order", "muted", { row: 3 }));
        } else if (context.puzzle.id === "split-into-two-paths") {
          const paths = (result, styleName, dashed) => { if (!Array.isArray(result)) return; result.forEach((route) => { if (!Array.isArray(route)) return; for (let i = 1; i < route.length; i += 1) { const a = positions[route[i - 1] - 1], b = positions[route[i] - 1]; if (a && b) out.push(arrow(a, b, styleName, { weight: 2.5, dashed })); } }); };
          paths(context.expected, "expected", true);
          paths(context.actual, style, false);
        } else if ((context.actual && Array.isArray(context.actual.colors)) || (context.expected && Array.isArray(context.expected.colors))) {
          const colors = (result, styleName, dy) => { if (!result || !Array.isArray(result.colors)) return; result.colors.forEach((c, i) => { const at = positions[i]; if (at) out.push(label("c" + c, styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          colors(context.expected, "expected", 0.45);
          colors(context.actual, style, -0.35);
        } else if (context.puzzle.id === "centroid-ancestors") {
          const depths = (result, styleName, dy) => { if (!Array.isArray(result)) return; result.forEach((list, i) => { const at = positions[i]; if (at && Array.isArray(list)) out.push(label("L" + list.length / 2, styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          depths(context.expected, "expected", 0.45);
          depths(context.actual, style, -0.35);
          out.push(label("labels count the centroids above each node", "muted", { row: 3 }));
        } else if ((context.actual && Array.isArray(context.actual.tin)) || (context.expected && Array.isArray(context.expected.tin))) {
          const tinLow = (result, styleName, dy) => { if (!result || !Array.isArray(result.tin) || !Array.isArray(result.low)) return; result.tin.forEach((t, i) => { const at = positions[i]; if (at) out.push(label(t + "/" + result.low[i], styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          tinLow(context.expected, "expected", 0.45);
          tinLow(context.actual, style, -0.35);
          out.push(label("labels are tin/low", "muted", { row: 3 }));
        } else {
          const perNode = (list, styleName, dy, prefix) => { if (!isNumberList(list) || list.length !== nodeCount) return; list.forEach((v, i) => { const at = positions[i]; if (at) out.push(label(prefix + v, styleName, { at: { x: at.x + 0.25, y: at.y + dy } })); }); };
          perNode(context.expected, "expected", 0.45, "");
          perNode(context.actual, style, -0.35, "");
        }
      } else if (view === "treap") {
        const isNode = (v) => v && typeof v === "object" && !Array.isArray(v) && "priority" in v;
        const inputs = isNode(chosen.a) && (chosen.b === null || isNode(chosen.b)) ? [[chosen.a, "a"], [chosen.b, "b"]] : [[chosen.a, "treap"]];
        inputs.forEach(([root, caption], i) => { const width = 4.9 / inputs.length; out.push(...treapLayers(root, -5.2 + i * width, -5.2 + (i + 1) * width - 0.2, caption, "input")); });
        if (Number.isFinite(chosen.b)) out.push(label("k = " + chosen.b, "input", { row: 3 }));
        const result = context.actual !== null && context.actual !== undefined ? context.actual : context.expected;
        const resultStyleName = context.actual !== null && context.actual !== undefined ? style : "expected";
        if (isNode(result)) out.push(...treapLayers(result, 0.3, 5.2, context.actual ? text : "expected", resultStyleName));
        else if (Array.isArray(result) && result.length === 2) { out.push(...treapLayers(result[0], 0.3, 2.6, "left", resultStyleName)); out.push(...treapLayers(result[1], 2.9, 5.2, "right", resultStyleName)); }
      } else if (view === "heap") {
        const input = Array.isArray(chosen.a) ? chosen.a : [];
        out.push(...heapTreeLayers(input, "input", -2.6, "input heap"));
        const shown = (result) => (result && Array.isArray(result.heap) ? result.heap : (Array.isArray(result) ? result : null));
        if (shown(context.actual)) out.push(...heapTreeLayers(shown(context.actual), style, 2.6, text + " heap"));
        else if (shown(context.expected)) out.push(...heapTreeLayers(shown(context.expected), "expected", 2.6, "expected heap"));
        if (context.puzzle.id === "heap-push") out.push(label("pushing [" + Math.round(values.key) + ", 99]", "input", { row: 3 }));
      } else if (view === "segtree") {
        const base = Array.isArray(chosen.a) ? chosen.a : [];
        const tree = algoSegmentTree(base);
        const highlight = new Set();
        if (context.puzzle.id === "segment-tree-update") { let position = base.length + Math.round(values.index); while (position >= 1) { highlight.add(position); position >>= 1; } }
        const shownTree = isNumberList(context.actual) && context.actual.length === tree.length ? context.actual : (isNumberList(context.expected) && context.expected.length === tree.length ? context.expected : tree);
        out.push(...segmentTreeLayers(shownTree, style, { highlight }));
        if (context.puzzle.id === "segment-tree-query") out.push(label("query leaves " + Math.min(Math.round(values.l), Math.round(values.r)) + " to " + Math.max(Math.round(values.l), Math.round(values.r)), "input", { row: 3 }));
      } else if (view === "two-trees") {
        const n = Number.isFinite(chosen.a) ? chosen.a : 1;
        const drawTree = (edges, shift, caption) => {
          if (!Array.isArray(edges) || n > 60) return;
          const parentOf = parentsFromEdges(n, edges), laid = treeLayoutFromParents(n, parentOf);
          const at = (v) => ({ x: laid[v].x * 0.5 + shift, y: laid[v].y });
          for (let v = 1; v <= n; v += 1) if (parentOf[v] >= 1) out.push(segments([[at(parentOf[v]), at(v)]], "muted", { weight: 1.5 }));
          for (let v = 1; v <= n; v += 1) out.push(point(at(v), String(v), "input"));
          out.push(label(caption, "muted", { at: { x: shift - 1.2, y: -3.4 } }));
        };
        drawTree(chosen.b, -2.6, "first tree, drawn from 1");
        drawTree(chosen.c, 2.6, "second tree, drawn from 1");
      } else if (view === "tree") {
        const n = Number.isFinite(chosen.a) ? chosen.a : (Array.isArray(chosen.d) ? chosen.d.length : 1);
        const links = Array.isArray(chosen.b) ? chosen.b : [];
        const parentOf = links.length > 0 && Array.isArray(links[0]) ? parentsFromEdges(n, links) : parentsFromBosses(n, links);
        const positions = treeLayoutFromParents(n, parentOf);
        for (let v = 1; v <= n; v += 1) if (parentOf[v] >= 1) out.push(segments([[positions[parentOf[v]], positions[v]]], "muted", { weight: 1.5 }));
        for (let v = 1; v <= n; v += 1) out.push(point(positions[v], String(v), "input"));
        const perNode = (list, styleName, dy) => { if (!isNumberList(list) || list.length !== n) return; list.forEach((value, i) => out.push(label(String(value), styleName, { at: { x: positions[i + 1].x + 0.25, y: positions[i + 1].y + dy } }))); };
        perNode(context.expected, "expected", 0.45);
        perNode(context.actual, style, -0.35);
        if (Array.isArray(context.actual) && Array.isArray(context.actual[0]) && context.puzzle.id === "binary-lifting-table") {
          for (let v = 1; v <= n; v += 1) out.push(label("2^1→" + context.actual[1][v], style, { at: { x: positions[v].x + 0.25, y: positions[v].y - 0.35 } }));
        }
        if (context.puzzle.id === "kth-ancestor") out.push(label("node " + Math.round(values.v) + " · k " + Math.round(values.k), "input", { row: 3 }));
        if (context.puzzle.id === "company-queries-ii" && Array.isArray(chosen.c)) out.push(label("queries " + chosen.c.map((q) => q[0] + "," + q[1]).join(" · "), "input", { row: 3 }));
        if (Array.isArray(chosen.d) && chosen.d.length === n) out.push(label("values " + chosen.d.join(" "), "input", { row: 3 }));
      }
      out.push(...notes(context, describeAlgo(context.expected), describeAlgo(context.actual)));
      return out;
    },
  };
  function treapSequence(root) {
    const values = [];
    const walk = (t, flipped) => { if (!t || values.length > 24) return; const reversed = flipped !== Boolean(t.flip); walk(reversed ? t.right : t.left, reversed); values.push(t.value); walk(reversed ? t.left : t.right, reversed); };
    walk(root, false);
    return "treap [" + values.join(", ") + (values.length > 24 ? ", …" : "") + "]";
  }
  function describeAlgo(value) {
    if (typeof value === "number") return String(value);
    if (value === null) return "null";
    const isNode = (v) => v && typeof v === "object" && !Array.isArray(v) && "priority" in v;
    if (isNode(value)) return treapSequence(value);
    if (Array.isArray(value) && value.length === 2 && value.every((v) => v === null || isNode(v))) return value.map((v) => (v ? treapSequence(v) : "empty")).join(" | ");
    if (value && typeof value === "object" && !Array.isArray(value)) { const textValue = JSON.stringify(value); return textValue.length > 60 ? textValue.slice(0, 57) + "…" : textValue; }
    if (Array.isArray(value)) {
      const textValue = JSON.stringify(value);
      return textValue.length > 48 ? textValue.slice(0, 45) + "…" : textValue;
    }
    return describe(value);
  }
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
    "twist": twistScene,
    "deskew": deskewScene,
    "buffer": bufferScene,
    "aisle": aisleScene,
    "estimation": estimationScene,
    "bayes": bayesScene,
    "nature": natureScene,
    "algo": algoScene,
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

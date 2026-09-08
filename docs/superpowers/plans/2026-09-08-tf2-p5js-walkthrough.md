# TF2 p5.js Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guided, interactive p5.js tutorial that teaches the ROS 2 TF2 tree, frame roles, transform lookup, stamped data, time buffering, and the transition from SE(2) to SE(3).

**Architecture:** Keep the mathematical transform and tree model independent from p5 so it can be tested with Node and used directly by the browser. A chapter catalog supplies lesson copy and scenario configuration, while one p5 sketch renders the world, TF tree, equations, and interactive state from the same model.

**Tech Stack:** Vanilla JavaScript, p5.js from the repository's local library, HTML/CSS, Node.js custom test runner, browser globals/CommonJS dual exports.

---

## File Structure

- Create `p5sim/tf2_walkthrough/index.html`: semantic tutorial shell, panels, navigation, and ordered script loading.
- Create `p5sim/tf2_walkthrough/styles.css`: dark responsive layout, panel styling, controls, and accessible focus states.
- Create `p5sim/tf2_walkthrough/transform2d.js`: dependency-free SE(2) values and operations.
- Create `p5sim/tf2_walkthrough/transform-tree.js`: topology, transform history, lookups, trace metadata, and typed TF errors.
- Create `p5sim/tf2_walkthrough/transform3d.js`: dependency-free vector/quaternion/SE(3) operations for the 3D chapter.
- Create `p5sim/tf2_walkthrough/chapters.js`: thirteen chapter definitions and scenario parameters.
- Create `p5sim/tf2_walkthrough/sketch.js`: tutorial controller, p5 scene renderer, TF tree renderer, interactions, and chapter simulations.
- Create `p5sim/tf2_walkthrough/tests.js`: deterministic custom test runner covering math and tree behavior in Node and the browser.
- Create `p5sim/tf2_walkthrough/tests.html`: browser test entry point.
- Create `p5sim/tf2_walkthrough/README.md`: run instructions, reading order, concepts, and controls.

### Task 1: SE(2) transform math

**Files:**
- Create: `p5sim/tf2_walkthrough/transform2d.js`
- Create: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Write the failing SE(2) tests**

Create a tiny synchronous runner in `tests.js` and register concrete assertions for identity, composition, inverse round trips, pose conversion, and shortest-angle interpolation:

```javascript
const runningInNode = typeof module !== "undefined" && module.exports;
const math2d = runningInNode ? require("./transform2d.js") : window;
const treeApi = runningInNode ? null : window;
const math3d = runningInNode ? null : window;
const tests = [];

function test(name, run) { tests.push({ name, run }); }
function near(actual, expected, epsilon = 1e-6) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`expected ${expected}, received ${actual}`);
  }
}

test("SE2 identity leaves a point unchanged", () => {
  const result = math2d.Transform2D.identity().applyPoint({ x: 2, y: -3 });
  near(result.x, 2);
  near(result.y, -3);
});

test("SE2 composition applies the right operand first", () => {
  const worldFromRobot = new math2d.Transform2D(10, 0, Math.PI / 2);
  const robotFromLaser = new math2d.Transform2D(1, 0, 0);
  const result = worldFromRobot.compose(robotFromLaser).applyPoint({ x: 0, y: 0 });
  near(result.x, 10);
  near(result.y, 1);
});

test("SE2 inverse produces an identity round trip", () => {
  const transform = new math2d.Transform2D(3, -4, 0.7);
  const point = { x: 2, y: 5 };
  const result = transform.inverse().applyPoint(transform.applyPoint(point));
  near(result.x, point.x);
  near(result.y, point.y);
});

test("SE2 pose application composes heading", () => {
  const transform = new math2d.Transform2D(2, 1, Math.PI / 2);
  const result = transform.applyPose({ x: 1, y: 0, yaw: Math.PI / 2 });
  near(result.x, 2);
  near(result.y, 2);
  near(result.yaw, Math.PI);
});

test("SE2 interpolation takes the shortest angle path", () => {
  const from = new math2d.Transform2D(0, 0, 170 * Math.PI / 180);
  const to = new math2d.Transform2D(10, 0, -170 * Math.PI / 180);
  const result = math2d.Transform2D.interpolate(from, to, 0.5);
  near(result.x, 5);
  near(Math.abs(result.yaw), Math.PI);
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: FAIL because `transform2d.js` does not exist.

- [ ] **Step 3: Implement the minimal immutable SE(2) API**

Implement `Transform2D` with validated finite fields. Define `compose(other)` as `this * other`, so it applies `other` first, then `this`:

```javascript
(function exposeTransform2D(root) {
  "use strict";

  const TAU = Math.PI * 2;
  function normalizeAngle(angle) {
    let result = (angle + Math.PI) % TAU;
    if (result < 0) result += TAU;
    return result - Math.PI;
  }

  class Transform2D {
    constructor(x = 0, y = 0, yaw = 0) {
      if (![x, y, yaw].every(Number.isFinite)) throw new TypeError("Transform values must be finite");
      this.x = x;
      this.y = y;
      this.yaw = normalizeAngle(yaw);
      Object.freeze(this);
    }
    static identity() { return new Transform2D(); }
    static interpolate(a, b, amount) {
      const t = Math.max(0, Math.min(1, amount));
      const deltaYaw = normalizeAngle(b.yaw - a.yaw);
      return new Transform2D(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.yaw + deltaYaw * t
      );
    }
    compose(other) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      return new Transform2D(
        this.x + c * other.x - s * other.y,
        this.y + s * other.x + c * other.y,
        this.yaw + other.yaw
      );
    }
    inverse() {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      return new Transform2D(
        -c * this.x - s * this.y,
        s * this.x - c * this.y,
        -this.yaw
      );
    }
    applyPoint(point) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      return { x: this.x + c * point.x - s * point.y, y: this.y + s * point.x + c * point.y };
    }
    applyVector(vector) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      return { x: c * vector.x - s * vector.y, y: s * vector.x + c * vector.y };
    }
    applyPose(pose) {
      const point = this.applyPoint(pose);
      return { x: point.x, y: point.y, yaw: normalizeAngle(this.yaw + pose.yaw) };
    }
  }

  const api = { Transform2D, normalizeAngle };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Add and run the test runner footer**

Append a runner that loads later modules only when their files exist and prints a stable summary:

```javascript
function runAllTests() {
  let passed = 0;
  const failures = [];
  for (const item of tests) {
    try { item.run(); passed += 1; }
    catch (error) { failures.push({ name: item.name, error }); }
  }
  if (runningInNode) {
    failures.forEach(({ name, error }) => console.error(`FAIL ${name}: ${error.message}`));
    console.log(`${passed}/${tests.length} tests passed`);
    if (failures.length) process.exitCode = 1;
  } else {
    window.renderTestResults({ passed, total: tests.length, failures });
  }
}

if (runningInNode) runAllTests();
else window.addEventListener("DOMContentLoaded", runAllTests);
```

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `5/5 tests passed`.

- [ ] **Step 5: Commit the SE(2) foundation**

```powershell
git add p5sim/tf2_walkthrough/transform2d.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add TF2 SE2 transform math"
```

### Task 2: TF tree topology and spatial lookup

**Files:**
- Create: `p5sim/tf2_walkthrough/transform-tree.js`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add failing topology and lookup tests**

Load `transform-tree.js` in Node, then add cases using the convention that every edge stores `parentFromChild`:

```javascript
const tfApi = runningInNode ? require("./transform-tree.js") : window;

test("tree looks up mapFromLaser through the chain", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "odom", transform: new math2d.Transform2D(1, 0, 0), isStatic: true, authority: "localization" });
  tree.setTransform({ parent: "odom", child: "base_link", transform: new math2d.Transform2D(2, 0, 0), isStatic: true, authority: "odometry" });
  tree.setTransform({ parent: "base_link", child: "laser", transform: new math2d.Transform2D(0.5, 0, 0), isStatic: true, authority: "robot_state_publisher" });
  const result = tree.lookup("map", "laser");
  near(result.transform.x, 3.5);
  if (result.path.length !== 3) throw new Error("expected three traversed edges");
});

test("tree lookup works in the inverse direction", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "robot", transform: new math2d.Transform2D(2, 0, 0), isStatic: true });
  near(tree.lookup("robot", "map").transform.x, -2);
});

test("tree rejects a second parent", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "base_link", transform: math2d.Transform2D.identity(), isStatic: true });
  try {
    tree.setTransform({ parent: "odom", child: "base_link", transform: math2d.Transform2D.identity(), isStatic: true });
    throw new Error("expected duplicate parent rejection");
  } catch (error) {
    if (error.code !== "DUPLICATE_PARENT") throw error;
  }
});

test("tree rejects cycles", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "odom", transform: math2d.Transform2D.identity(), isStatic: true });
  try {
    tree.setTransform({ parent: "odom", child: "map", transform: math2d.Transform2D.identity(), isStatic: true });
    throw new Error("expected cycle rejection");
  } catch (error) {
    if (error.code !== "CYCLE") throw error;
  }
});

test("tree reports unknown frames", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "odom", transform: math2d.Transform2D.identity(), isStatic: true });
  try { tree.lookup("map", "missing"); throw new Error("expected unknown frame rejection"); }
  catch (error) { if (error.code !== "UNKNOWN_FRAME") throw error; }
});

test("tree reports disconnected roots", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "robot", transform: math2d.Transform2D.identity(), isStatic: true });
  tree.setTransform({ parent: "world", child: "camera", transform: math2d.Transform2D.identity(), isStatic: true });
  try { tree.lookup("robot", "camera"); throw new Error("expected disconnected rejection"); }
  catch (error) { if (error.code !== "DISCONNECTED") throw error; }
});
```

- [ ] **Step 2: Run the tests and confirm the tree module is missing**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: FAIL because `transform-tree.js` does not exist.

- [ ] **Step 3: Implement topology, typed errors, and lookup traces**

Implement `TFError`, frame-name validation, single-parent/cycle checks, root-chain construction, a common-ancestor check, and spatial lookup:

```javascript
class TFError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TFError";
    this.code = code;
    this.details = details;
  }
}

class TransformTree {
  constructor({ maxSamples = 120 } = {}) {
    this.edgesByChild = new Map();
    this.frames = new Set();
    this.maxSamples = maxSamples;
  }

  setTransform({ parent, child, transform, time = 0, authority = "unknown", isStatic = false }) {
    this.validateFrame(parent);
    this.validateFrame(child);
    if (parent === child) throw new TFError("CYCLE", "A frame cannot parent itself", { parent, child });
    const existing = this.edgesByChild.get(child);
    if (existing && existing.parent !== parent) {
      throw new TFError("DUPLICATE_PARENT", `${child} already has parent ${existing.parent}`, { parent, child });
    }
    for (let cursor = parent; cursor; cursor = this.edgesByChild.get(cursor)?.parent) {
      if (cursor === child) throw new TFError("CYCLE", `Adding ${parent} -> ${child} creates a cycle`, { parent, child });
    }
    const edge = existing || { parent, child, authority, isStatic, samples: [] };
    edge.authority = authority;
    edge.isStatic = isStatic;
    edge.samples = isStatic ? [{ time: 0, transform }] : this.insertSample(edge.samples, { time, transform });
    this.edgesByChild.set(child, edge);
    this.frames.add(parent);
    this.frames.add(child);
  }

  lookup(target, source, time = null) {
    this.requireFrame(target);
    this.requireFrame(source);
    if (target === source) return { transform: Transform2D.identity(), path: [], time: time ?? 0 };
    const sourceChain = this.chainToRoot(source);
    const targetChain = this.chainToRoot(target);
    if (sourceChain.root !== targetChain.root) throw new TFError("DISCONNECTED", `${source} and ${target} are disconnected`);
    const lookupTime = time === null ? this.latestCommonTime([...sourceChain.edges, ...targetChain.edges]) : time;
    const rootFromSource = this.rootFromFrame(source, lookupTime);
    const rootFromTarget = this.rootFromFrame(target, lookupTime);
    return {
      transform: rootFromTarget.inverse().compose(rootFromSource),
      path: this.pathBetween(source, target),
      time: lookupTime
    };
  }
}
```

Complete the class with `validateFrame`, `requireFrame`, `insertSample`, `chainToRoot`, `rootFromFrame`, `pathBetween`, `sampleEdge`, `latestCommonTime`, and `snapshot`. Export `{ TFError, TransformTree }` to CommonJS and `window` using the same wrapper pattern as `transform2d.js`.

- [ ] **Step 4: Run all spatial tree tests**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `11/11 tests passed`.

- [ ] **Step 5: Commit tree topology and lookup**

```powershell
git add p5sim/tf2_walkthrough/transform-tree.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add TF2 transform tree lookups"
```

### Task 3: Time-aware transform buffer

**Files:**
- Modify: `p5sim/tf2_walkthrough/transform-tree.js`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add failing temporal behavior tests**

Add cases for interpolation, static transforms at arbitrary times, latest common time, and both extrapolation directions:

```javascript
test("dynamic edges interpolate at the requested time", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "odom", child: "base_link", transform: new math2d.Transform2D(0, 0, 0), time: 0 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: new math2d.Transform2D(10, 0, Math.PI), time: 10 });
  const result = tree.lookup("odom", "base_link", 5);
  near(result.transform.x, 5);
  near(Math.abs(result.transform.yaw), Math.PI / 2);
});

test("static edges are valid at arbitrary times", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "base_link", child: "laser", transform: new math2d.Transform2D(0.4, 0, 0), isStatic: true });
  near(tree.lookup("base_link", "laser", 5000).transform.x, 0.4);
});

test("latest lookup uses the latest common dynamic time", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "odom", transform: new math2d.Transform2D(1, 0, 0), time: 0 });
  tree.setTransform({ parent: "map", child: "odom", transform: new math2d.Transform2D(2, 0, 0), time: 8 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: new math2d.Transform2D(3, 0, 0), time: 0 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: new math2d.Transform2D(4, 0, 0), time: 6 });
  const result = tree.lookup("map", "base_link");
  near(result.time, 6);
});

test("lookup reports past and future extrapolation", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "odom", child: "base_link", transform: math2d.Transform2D.identity(), time: 2 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: math2d.Transform2D.identity(), time: 4 });
  for (const [time, code] of [[1, "PAST_EXTRAPOLATION"], [5, "FUTURE_EXTRAPOLATION"]]) {
    try { tree.lookup("odom", "base_link", time); throw new Error(`expected ${code}`); }
    catch (error) { if (error.code !== code) throw error; }
  }
});

test("latest lookup rejects dynamic histories without overlap", () => {
  const tree = new tfApi.TransformTree();
  tree.setTransform({ parent: "map", child: "odom", transform: math2d.Transform2D.identity(), time: 0 });
  tree.setTransform({ parent: "map", child: "odom", transform: math2d.Transform2D.identity(), time: 1 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: math2d.Transform2D.identity(), time: 2 });
  tree.setTransform({ parent: "odom", child: "base_link", transform: math2d.Transform2D.identity(), time: 3 });
  try { tree.lookup("map", "base_link"); throw new Error("expected no common time rejection"); }
  catch (error) { if (error.code !== "NO_COMMON_TIME") throw error; }
});
```

- [ ] **Step 2: Run the suite and see temporal failures**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: FAIL in interpolation/latest/extrapolation cases.

- [ ] **Step 3: Complete time sampling and common-time selection**

Implement exact-sample selection, binary-neighbor interpolation, bounded history, and overlapping time-range validation. `latestCommonTime(edges)` must ignore static edges, choose the minimum latest timestamp, and throw `NO_COMMON_TIME` when the maximum earliest timestamp exceeds it. `sampleEdge(edge, time)` must return static data at any time and otherwise throw typed past/future errors that include `{ child, requested, earliest, latest }`.

```javascript
sampleEdge(edge, time) {
  if (edge.isStatic) return edge.samples[0].transform;
  const earliest = edge.samples[0].time;
  const latest = edge.samples[edge.samples.length - 1].time;
  if (time < earliest) throw new TFError("PAST_EXTRAPOLATION", `Requested ${time} before ${earliest}`, { child: edge.child, requested: time, earliest, latest });
  if (time > latest) throw new TFError("FUTURE_EXTRAPOLATION", `Requested ${time} after ${latest}`, { child: edge.child, requested: time, earliest, latest });
  const exact = edge.samples.find((sample) => sample.time === time);
  if (exact) return exact.transform;
  const upperIndex = edge.samples.findIndex((sample) => sample.time > time);
  const lower = edge.samples[upperIndex - 1];
  const upper = edge.samples[upperIndex];
  return Transform2D.interpolate(lower.transform, upper.transform, (time - lower.time) / (upper.time - lower.time));
}
```

- [ ] **Step 4: Run the complete temporal suite**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `16/16 tests passed`.

- [ ] **Step 5: Commit time buffering**

```powershell
git add p5sim/tf2_walkthrough/transform-tree.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add time-aware TF buffer"
```

### Task 4: Quaternion and SE(3) bridge

**Files:**
- Create: `p5sim/tf2_walkthrough/transform3d.js`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add failing quaternion tests**

```javascript
const tf3Api = runningInNode ? require("./transform3d.js") : window;

test("quaternion rotates X onto Y around Z", () => {
  const q = tf3Api.Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
  const result = q.rotateVector({ x: 1, y: 0, z: 0 });
  near(result.x, 0);
  near(result.y, 1);
  near(result.z, 0);
});

test("quaternion inverse reverses rotation", () => {
  const q = tf3Api.Quaternion.fromEuler(0.3, -0.2, 0.7);
  const point = { x: 1, y: 2, z: 3 };
  const result = q.inverse().rotateVector(q.rotateVector(point));
  near(result.x, point.x);
  near(result.y, point.y);
  near(result.z, point.z);
});

test("SE3 composition applies child transform first", () => {
  const a = new tf3Api.Transform3D({ x: 1, y: 0, z: 0 }, tf3Api.Quaternion.identity());
  const b = new tf3Api.Transform3D({ x: 0, y: 2, z: 0 }, tf3Api.Quaternion.identity());
  const result = a.compose(b).applyPoint({ x: 0, y: 0, z: 3 });
  near(result.x, 1);
  near(result.y, 2);
  near(result.z, 3);
});

test("quaternion constructor normalizes finite input", () => {
  const q = new tf3Api.Quaternion(0, 0, 0, 2);
  near(q.w, 1);
  try { new tf3Api.Quaternion(0, 0, 0, 0); throw new Error("expected zero quaternion rejection"); }
  catch (error) { if (!(error instanceof TypeError)) throw error; }
});
```

- [ ] **Step 2: Run tests and confirm the 3D module is missing**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: FAIL because `transform3d.js` does not exist.

- [ ] **Step 3: Implement normalized quaternions and SE(3)**

Implement `Quaternion.identity`, `fromAxisAngle`, `fromEuler(roll,pitch,yaw)`, `normalize`, `multiply`, `inverse`, and `rotateVector`. Implement `Transform3D.identity`, `compose`, `inverse`, and `applyPoint`. Reject zero-length quaternions and non-finite values with `TypeError`.

```javascript
class Transform3D {
  constructor(translation = { x: 0, y: 0, z: 0 }, rotation = Quaternion.identity()) {
    this.translation = Object.freeze({ ...translation });
    this.rotation = rotation.normalize();
    Object.freeze(this);
  }
  static identity() { return new Transform3D(); }
  compose(other) {
    const shifted = this.rotation.rotateVector(other.translation);
    return new Transform3D(
      { x: this.translation.x + shifted.x, y: this.translation.y + shifted.y, z: this.translation.z + shifted.z },
      this.rotation.multiply(other.rotation)
    );
  }
  inverse() {
    const inverseRotation = this.rotation.inverse();
    const translation = inverseRotation.rotateVector({ x: -this.translation.x, y: -this.translation.y, z: -this.translation.z });
    return new Transform3D(translation, inverseRotation);
  }
  applyPoint(point) {
    const rotated = this.rotation.rotateVector(point);
    return { x: rotated.x + this.translation.x, y: rotated.y + this.translation.y, z: rotated.z + this.translation.z };
  }
}
```

- [ ] **Step 4: Run all math tests**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `20/20 tests passed`.

- [ ] **Step 5: Commit the 3D bridge**

```powershell
git add p5sim/tf2_walkthrough/transform3d.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add quaternion TF2 bridge"
```

### Task 5: Tutorial shell and responsive visual system

**Files:**
- Create: `p5sim/tf2_walkthrough/index.html`
- Create: `p5sim/tf2_walkthrough/styles.css`
- Create: `p5sim/tf2_walkthrough/tests.html`

- [ ] **Step 1: Create the semantic tutorial shell**

Build an `app-shell` with a top bar, chapter rail, canvas host, TF tree canvas, lesson copy, numeric values, source/target selects, time slider, and Back/Next controls. Load scripts in this exact order:

```html
<script src="../libraries/p5.min.js"></script>
<script src="transform2d.js"></script>
<script src="transform-tree.js"></script>
<script src="transform3d.js"></script>
<script src="chapters.js"></script>
<script src="sketch.js"></script>
```

Every control must have a visible `<label>`, and the explanation/status area must use `aria-live="polite"`.

- [ ] **Step 2: Implement the dark responsive layout**

Use CSS custom properties for the black/navy surfaces, neutral text, red/green/blue axes, yellow path highlight, borders, and focus ring. Desktop layout uses `minmax(0, 1.7fr) minmax(320px, 0.8fr)` for canvas and lesson content. At `max-width: 900px`, use a single column and let the chapter rail scroll horizontally. Ensure buttons are at least 40px high and canvas containers never overflow their grid cell.

- [ ] **Step 3: Create the browser test page**

Load the three model modules and `tests.js`, define `renderTestResults`, and render each failure plus the summary into `<main id="results">`. The page title must be `TF2 Walkthrough Tests`.

- [ ] **Step 4: Verify static pages and local assets**

Run: `Test-Path p5sim/tf2_walkthrough/index.html; Test-Path p5sim/libraries/p5.min.js; Test-Path p5sim/tf2_walkthrough/tests.html`

Expected: three `True` lines.

- [ ] **Step 5: Commit the tutorial shell**

```powershell
git add p5sim/tf2_walkthrough/index.html p5sim/tf2_walkthrough/styles.css p5sim/tf2_walkthrough/tests.html
git commit -m "feat: add TF2 tutorial shell"
```

### Task 6: Chapter catalog and teaching copy

**Files:**
- Create: `p5sim/tf2_walkthrough/chapters.js`
- Modify: `p5sim/tf2_walkthrough/tests.js`

- [ ] **Step 1: Add a failing chapter completeness test**

Load `chapters.js` in Node and assert the exact ordered IDs:

```javascript
const chapterApi = runningInNode ? require("./chapters.js") : window;
test("chapter catalog contains the full guided sequence", () => {
  const expected = [
    "matrix-stack", "data-types", "composition", "tree", "mobile-chain",
    "frame-roles", "broadcasters", "lookup", "stamped-data", "time-buffer",
    "sensor-scenario", "se3", "sandbox"
  ];
  const actual = chapterApi.TF2_CHAPTERS.map((chapter) => chapter.id);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`unexpected chapter order: ${actual.join(", ")}`);
  for (const chapter of chapterApi.TF2_CHAPTERS) {
    for (const key of ["title", "eyebrow", "summary", "details", "rosCode", "scene"]) {
      if (!chapter[key] || (Array.isArray(chapter[key]) && chapter[key].length === 0)) throw new Error(`${chapter.id} is missing ${key}`);
    }
  }
});
```

- [ ] **Step 2: Run the suite and confirm the catalog is missing**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: FAIL because `chapters.js` does not exist.

- [ ] **Step 3: Define all thirteen chapters**

Export `TF2_CHAPTERS` as frozen objects. Each object must contain `id`, `number`, `eyebrow`, `title`, `summary`, `details` as three or four concise bullets, `rosCode`, `scene`, and `hint`. Use these exact scene identifiers in order: `matrix`, `types`, `compose`, `tree`, `mobile`, `roles`, `authority`, `lookup`, `stamped`, `time`, `sensor`, `se3`, `sandbox`.

The copy must explicitly teach `T_target_source`, the single-parent tree constraint, `map` global correction, `odom` local continuity and drift, `base_link` body attachment, static sensor mounts, dynamic broadcaster ownership, source/target lookup direction, stamped time/frame metadata, interpolation/extrapolation, and quaternion orientation.

- [ ] **Step 4: Run the chapter completeness suite**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `21/21 tests passed`.

- [ ] **Step 5: Commit the chapter catalog**

```powershell
git add p5sim/tf2_walkthrough/chapters.js p5sim/tf2_walkthrough/tests.js
git commit -m "feat: add TF2 walkthrough chapters"
```

### Task 7: Interactive p5 renderer and controller

**Files:**
- Create: `p5sim/tf2_walkthrough/sketch.js`

- [ ] **Step 1: Implement deterministic tutorial state and DOM bindings**

Create one `tutorial` state object with `chapterIndex`, `paused`, `time`, `queryTime`, `source`, `target`, `draggedFrame`, `showGhosts`, `tree`, `lookup`, and `error`. Bind Back, Next, Pause, Reset, source, target, time, and ghost controls. Left/Right changes chapters, Space toggles pause, and R resets the chapter. Chapter changes update the URL hash and can be restored from it.

- [ ] **Step 2: Implement scenario construction from one shared tree model**

Implement `buildScenario(scene, time)` so every chapter receives a deterministic `TransformTree`. The complete mobile scenario must publish:

```javascript
tree.setTransform({ parent: "map", child: "odom", transform: mapFromOdom, time, authority: "localization", isStatic: false });
tree.setTransform({ parent: "odom", child: "base_link", transform: odomFromBase, time, authority: "wheel_odometry", isStatic: false });
tree.setTransform({ parent: "base_link", child: "laser", transform: new Transform2D(0.72, 0, 0), authority: "robot_state_publisher", isStatic: true });
tree.setTransform({ parent: "base_link", child: "camera", transform: new Transform2D(0.32, 0.18, 0), authority: "robot_state_publisher", isStatic: true });
```

Keep enough dynamic samples around the current time for interpolation. For the time chapter, freeze the available interval while the query-time slider moves outside it so past/future extrapolation can be demonstrated intentionally.

- [ ] **Step 3: Implement the world and matrix-stack renderer**

Draw a black grid, landmark, robot, sensors, observations, axes, and historical ghosts. Implement `withFrame(transform, drawLocal)` using `push()`, `translate()`, `rotate()`, callback, and `pop()`. Draw axes locally so nesting visually matches transform composition. Render agents as small outlined triangles, following the established `Vehicle.show()` style.

- [ ] **Step 4: Implement TF tree, lookup trace, and lesson panels**

Render frames as compact nodes with labeled edges. Use dashed edges for static transforms and solid edges for dynamic transforms. Color the active lookup path yellow and show an inverse badge when an edge is traversed upward. Populate the lesson panel, numeric transform, expression, timestamp, authority, and structured TF error from the active lookup result.

- [ ] **Step 5: Implement chapter-specific interactions**

Allow dragging the child frame in matrix/composition/tree chapters, source/target selection in lookup and sandbox, query-time scrubbing in the time chapter, and camera orbit in the SE(3) chapter. In the sensor scenario, show the laser-frame point, each intermediate point, and the recovered map-frame landmark simultaneously.

- [ ] **Step 6: Run the model suite and syntax checks**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `21/21 tests passed`.

Run: `node --check p5sim/tf2_walkthrough/sketch.js`

Expected: no output and exit code 0.

- [ ] **Step 7: Commit the interactive walkthrough**

```powershell
git add p5sim/tf2_walkthrough/sketch.js
git commit -m "feat: build interactive TF2 walkthrough"
```

### Task 8: Documentation and end-to-end verification

**Files:**
- Create: `p5sim/tf2_walkthrough/README.md`
- Modify: `p5sim/tf2_walkthrough/index.html`

- [ ] **Step 1: Write the learner-oriented README**

Document how to serve the repository with `npx http-server .`, open `/p5sim/tf2_walkthrough/`, run `node p5sim/tf2_walkthrough/tests.js`, use keyboard/mouse controls, and read files in this order: `transform2d.js`, `transform-tree.js`, `chapters.js`, `sketch.js`, `transform3d.js`.

- [ ] **Step 2: Run deterministic verification**

Run: `node p5sim/tf2_walkthrough/tests.js`

Expected: `21/21 tests passed`.

Run: `node --check p5sim/tf2_walkthrough/transform2d.js; node --check p5sim/tf2_walkthrough/transform-tree.js; node --check p5sim/tf2_walkthrough/transform3d.js; node --check p5sim/tf2_walkthrough/chapters.js; node --check p5sim/tf2_walkthrough/sketch.js`

Expected: no output and exit code 0.

- [ ] **Step 3: Serve and inspect the walkthrough in a browser**

Run: `npx http-server . -p 4173`

Open: `http://127.0.0.1:4173/p5sim/tf2_walkthrough/`

Verify all thirteen chapters, Back/Next, keyboard navigation, pause/reset, source/target lookup, time errors, draggable frames, SE(3) rendering, and absence of console errors. Inspect at approximately 1440x900 and 390x844 viewports.

- [ ] **Step 4: Run repository cleanliness checks**

Run: `git diff --check`

Expected: no output.

Run: `git status --short`

Expected: only the intended walkthrough and plan changes before the final commit.

- [ ] **Step 5: Commit documentation and final polish**

```powershell
git add p5sim/tf2_walkthrough/README.md p5sim/tf2_walkthrough/index.html docs/superpowers/plans/2026-09-08-tf2-p5js-walkthrough.md
git commit -m "docs: complete TF2 walkthrough guide"
```

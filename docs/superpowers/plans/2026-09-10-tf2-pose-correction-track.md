# TF2 Pose Correction Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pose Correction placeholder with Track 4 (puzzles 64 to 75): rack point clouds to fitted lines, rack-face filtering, smoothing, heading consensus, aisle centerline, corrected pose, and the `map -> odom` correction, mirroring `p5sim/navigation/scripts/core.js`.

**Architecture:** Same catalog pattern (`CORRECTION_STAGES`, a real fourth track, `puzzle()` picks the stage list by track, arrays `CORRECTION_16` to `CORRECTION_18`). One new scene kind `aisle` with twelve views and deterministic rack fixtures. No engine, renderer, or lab changes.

**Tech Stack:** Vanilla JavaScript, p5.js, Web Workers, Node 22 tests.

**Spec:** `docs/superpowers/specs/2026-09-10-tf2-pose-correction-track-design.md`

---

## File Structure

- `p5sim/tf2_walkthrough/puzzles.js` — stages, track, helpers `navref`, `poseCompose`, rack case builders, twelve puzzles.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — `aisleScene` and line helpers; `describe` additions.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — track assertions, Track 4 tests, relaxed reference-URL rule (relative links to `p5sim/navigation` are allowed).
- `p5sim/tf2_walkthrough/README.md` — Track 4 section.

Conventions as before: attribution lines on commits; `node p5sim/tf2_walkthrough/puzzle-tests.js` and `node p5sim/tf2_walkthrough/tests.js` from the repo root; never `git add -A`.

---

### Task 1: Catalog, tests, and Stage 16 (Point-Cloud Bricks)

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`, `p5sim/tf2_walkthrough/puzzle-scenes.js`, `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Update track assertions and add failing tests**

In `puzzle-tests.js`:

1. Replace `assert(["tf2", "toolkit", "advanced"].includes(puzzle.track), …);` with:

```js
      assert(["tf2", "toolkit", "advanced", "correction"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
```

2. Replace the three lines from `same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "pose-correction"]);` through `assert(api.TF2_PUZZLE_TRACKS[3].stages.length === 4, "track 4 lists four placeholder stages");` with:

```js
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "correction"]);
    assert(api.TF2_PUZZLE_TRACKS[1].unlockAfter === "stamped-lookup", "track 2 unlocks after the capstone");
    assert(api.TF2_PUZZLE_TRACKS[1].stages.length === 5, "track 2 lists five stages");
    assert(api.TF2_PUZZLE_TRACKS[2].unlockAfter === "icp-match", "track 3 unlocks after the ICP finale");
    assert(api.TF2_PUZZLE_TRACKS[2].stages.length === 3, "track 3 lists three stages");
    assert(api.TF2_PUZZLE_TRACKS[3].unlockAfter === "buffer-lookup", "track 4 unlocks after the buffer finale");
    assert(api.TF2_PUZZLE_TRACKS[3].stages.length === 3, "track 4 lists three stages");
```

3. In the toolkit reference test, replace `/^https:\/\//.test(puzzle.reference.url)` with `/^(https:\/\/|\.\.\/)/.test(puzzle.reference.url)`. In the Track 3 stage 15 test, replace `assert(puzzleList().length === 63, "catalog should hold 63 puzzles");` with `assert(puzzleList().length >= 63, "catalog should hold at least 63 puzzles");`.

4. Append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- correction track
  test("catalog track 4 stage 16 contains the point-cloud bricks", () => {
    same(idsInRange(64, 67), ["points-to-odom", "fit-line", "signed-line-distance", "heading-from-line"]);
  });

  test("catalog stage 16 references pass their cases and diagnoses differ", () => {
    checkStageRange(64, 67);
  });

  test("scenes: aisle views for stage 16 build valid arguments and finite layers", () => {
    checkSceneKinds(["aisle"]);
    const api = scenesApi();
    const fit = puzzlesApi().getPuzzle("fit-line");
    const values = api.initialValues(fit);
    const line = referenceOutput(fit, api.toArgs(fit, values));
    near(Math.hypot(line.a, line.b), 1);
    assert(line.b > 0, "fitLine normalizes the sign so b > 0");
    near(-line.a / line.b, Math.tan(values.aisle.yaw));
  });
```

- [ ] **Step 2: Run the tests and confirm failures**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: about `50/57 puzzle tests passed`.

- [ ] **Step 3: Add the stages, the real track, helpers, and Stage 16 to `puzzles.js`**

Insert directly before `const TRACKS = Object.freeze([`:

```js
  const CORRECTION_STAGES = Object.freeze([
    { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points into odom, line fits, distances, headings.", range: [64, 67] },
    { id: "rack-filters", title: "Rack Filters", subtitle: "Inlier refits, rack faces, smoothing, consensus.", range: [68, 71] },
    { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, corrected pose, and map → odom.", range: [72, 75] },
  ]);
```

Replace the whole `pose-correction` track entry (from `    Object.freeze({\n      id: "pose-correction",` through its closing `    }),`) with:

```js
    Object.freeze({
      id: "correction",
      title: "Track 4 · Pose Correction",
      unlockAfter: "buffer-lookup",
      note: "Unlocks after the buffer lookup finale.",
      stages: CORRECTION_STAGES,
    }),
```

Replace the `const stageList = …` line with:

```js
    const stageList = { tf2: STAGES, toolkit: TOOLKIT_STAGES, advanced: ADVANCED_STAGES, correction: CORRECTION_STAGES }[track] || STAGES;
```

Insert directly after the `docref` function:

```js
  function navref(page, symbol) {
    return Object.freeze({ label: "p5sim/navigation · core.js · " + symbol, url: "../navigation/" + page + "/index.html" });
  }
```

Insert directly before the `PUZZLES` line:

```js
  const CORRECTION_16 = [
    puzzle({
      number: 64, id: "points-to-odom", track: "correction", title: "Rack Points into Odom",
      goal: "Transform a laser-frame point cloud into the odom frame.",
      concept: "Every pipeline step after this one works in odom, so the rack geometry stays put while the robot moves.",
      functionName: "pointsToOdom", signature: "pointsToOdom(odomFromLaser, points) → points",
      starterSource: starter("pointsToOdom", "odomFromLaser, points", "Apply transformPoint to every point."),
      referenceSource: "function pointsToOdom(odomFromLaser, points) { return points.map(function (point) { return transformPoint(odomFromLaser, point); }); }",
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["transform-point"],
      reference: navref("synthetic-input", "runPipeline (frame handling)"),
      scene: { kind: "aisle", view: "cloud", handles: [{ id: "robot", type: "pose", label: "base_link in odom", value: { x: 0.5, y: 0.2, yaw: 0.15 } }], args: [{ fixture: "odomFromLaser" }, { fixture: "leftPointsInLaser" }] },
      diagnoses: [diagnosis("rotation-ignored", "The points were only shifted: the laser's yaw must rotate them too.", "function pointsToOdom(odomFromLaser, points) { return points.map(function (p) { return { x: p.x + odomFromLaser.x, y: p.y + odomFromLaser.y }; }); }")],
      hints: ["Each point is a position, so rotation and translation both apply.", "transformPoint(odomFromLaser, point) for each point.", "Return points.map(...)."],
      cases: [
        example([{ x: 1, y: 0, yaw: 0 }, [{ x: 1, y: 0 }, { x: 2, y: 1 }]], [{ x: 2, y: 0 }, { x: 3, y: 1 }], "translation"),
        example([{ x: 0, y: 0, yaw: PI / 2 }, [{ x: 1, y: 0 }]], [{ x: 0, y: 1 }], "rotation"),
        example([{ x: 2, y: 1, yaw: PI }, [{ x: 1, y: 1 }, { x: 0, y: 0 }]], [{ x: 1, y: 0 }, { x: 2, y: 1 }], "half turn"),
        example([{ x: 0, y: 0, yaw: 0 }, []], [], "empty cloud"),
      ],
    }),
    puzzle({
      number: 65, id: "fit-line", track: "correction", title: "Fit a Line to Rack Points",
      goal: "Fit a normalized line a·x + b·y + c = 0 through a point cloud by total least squares.",
      concept: "The principal axis of the point covariance is the rack direction; the normal is perpendicular to it.",
      functionName: "fitLine", signature: "fitLine(points) → { a, b, c }",
      starterSource: starter("fitLine", "points", "Centroid, covariance, principal angle θ = ½·atan2(2·sxy, sxx − syy); normal (−sin θ, cos θ); sign so b > 0."),
      referenceSource: lines(
        "function fitLine(points) {",
        "  var n = points.length, mx = 0, my = 0;",
        "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
        "  mx /= n; my /= n;",
        "  var sxx = 0, syy = 0, sxy = 0;",
        "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }",
        "  var theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);",
        "  var a = -Math.sin(theta), b = Math.cos(theta);",
        "  var c = -(a * mx + b * my);",
        "  if (b < 0 || (Math.abs(b) < 1e-9 && a < 0)) { a = -a; b = -b; c = -c; }",
        "  return { a: a, b: b, c: c };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: navref("line-fit", "fitLine2D"),
      scene: { kind: "aisle", view: "fit", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftFace" }] },
      diagnoses: [
        diagnosis("slope-intercept", "That is y = m·x + k packed as {a: m, b: −1, c: k}: the line must be normalized with a² + b² = 1 and b > 0.", lines(
          "function fitLine(points) {",
          "  var n = points.length, mx = 0, my = 0;",
          "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
          "  mx /= n; my /= n;",
          "  var sxx = 0, sxy = 0;",
          "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; sxy += dx * dy; }",
          "  var m = sxy / sxx;",
          "  return { a: m, b: -1, c: my - m * mx };",
          "}"
        )),
        diagnosis("x-only-regression", "Ordinary least squares on y(x) breaks on vertical racks; use the principal axis of the covariance.", lines(
          "function fitLine(points) {",
          "  var n = points.length, mx = 0, my = 0;",
          "  for (var i = 0; i < n; i += 1) { mx += points[i].x; my += points[i].y; }",
          "  mx /= n; my /= n;",
          "  var sxx = 0, sxy = 0;",
          "  for (var j = 0; j < n; j += 1) { var dx = points[j].x - mx, dy = points[j].y - my; sxx += dx * dx; sxy += dx * dy; }",
          "  var m = sxy / sxx, k = my - m * mx;",
          "  var norm = Math.sqrt(m * m + 1);",
          "  var a = -m / norm, b = 1 / norm, c = -k / norm;",
          "  return { a: a, b: b, c: c };",
          "}"
        )),
      ],
      hints: ["Center the points on their centroid first.", "θ = ½·atan2(2·sxy, sxx − syy) is the direction of most spread; the normal is (−sin θ, cos θ).", "c = −(a·mx + b·my); flip all three signs if b < 0 (or a < 0 when b is 0)."],
      cases: [
        example([[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }]], { a: 0, b: 1, c: -2 }, "horizontal"),
        example([[{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 5 }]], { a: 1, b: 0, c: -3 }, "vertical"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]], { a: -Math.SQRT1_2, b: Math.SQRT1_2, c: 0 }, "diagonal"),
        example([[{ x: 0, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }]], { a: -1 / Math.sqrt(5), b: 2 / Math.sqrt(5), c: -2 / Math.sqrt(5) }, "slope one half"),
      ],
    }),
    puzzle({
      number: 66, id: "signed-line-distance", track: "correction", title: "Signed Distance to a Line",
      goal: "Compute a·x + b·y + c for a normalized line: how far, and on which side.",
      concept: "The sign tells left from right of the rack; the correction only needs this one number.",
      functionName: "signedLineDistance", signature: "signedLineDistance(point, line) → number",
      starterSource: starter("signedLineDistance", "point, line", "a·x + b·y + c."),
      referenceSource: "function signedLineDistance(point, line) { return line.a * point.x + line.b * point.y + line.c; }",
      comparator: "scalar", walkthroughChapter: "sensor-scenario",
      reference: navref("centerline", "lineDistance"),
      scene: { kind: "aisle", view: "distance", handles: [{ id: "point", type: "point", label: "p", value: { x: 1, y: 0.8 } }], args: [{ handle: "point" }, { fixture: "fixedLeftLine" }] },
      diagnoses: [diagnosis("absolute", "The absolute value throws away the side: the pipeline needs the sign.", "function signedLineDistance(point, line) { return Math.abs(line.a * point.x + line.b * point.y + line.c); }")],
      hints: ["For a normalized line, a·x + b·y + c is the perpendicular distance with a sign.", "Positive means the point lies on the side the normal (a, b) points to.", "Return line.a * point.x + line.b * point.y + line.c."],
      cases: [
        example([{ x: 1, y: 0.8 }, { a: 0, b: 1, c: -1.6 }], -0.8, "below the rack"),
        example([{ x: 1, y: 2 }, { a: 0, b: 1, c: -1.6 }], 0.4, "above the rack"),
        example([{ x: 3, y: 7 }, { a: 1, b: 0, c: -3 }], 0, "on the line"),
        example([{ x: 0, y: 0 }, { a: Math.SQRT1_2, b: Math.SQRT1_2, c: -1 }], -1, "diagonal line"),
      ],
    }),
    puzzle({
      number: 67, id: "heading-from-line", track: "correction", title: "Heading of a Rack Line",
      goal: "Turn a line into the direction along it with a non-negative x component.",
      concept: "A line has two directions; choosing dx ≥ 0 makes headings from different racks comparable.",
      functionName: "headingFromLine", signature: "headingFromLine(line) → radians",
      starterSource: starter("headingFromLine", "line", "Direction (dx, dy) = (−b, a); flip both if dx < 0; atan2(dy, dx)."),
      referenceSource: lines(
        "function headingFromLine(line) {",
        "  var dx = -line.b, dy = line.a;",
        "  if (dx < 0) { dx = -dx; dy = -dy; }",
        "  return Math.atan2(dy, dx);",
        "}"
      ),
      comparator: "angle", walkthroughChapter: "sensor-scenario",
      reference: navref("heading-consensus", "headingFromLine"),
      scene: { kind: "aisle", view: "heading", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftLine" }] },
      diagnoses: [
        diagnosis("normal-not-direction", "That is the angle of the normal (a, b); the direction along the line is (−b, a).", "function headingFromLine(line) { return Math.atan2(line.b, line.a); }"),
        diagnosis("no-flip", "The direction was not flipped to dx ≥ 0, so the heading points backwards for half the lines.", "function headingFromLine(line) { return Math.atan2(line.a, -line.b); }"),
      ],
      hints: ["Rotate the normal by 90°: (−b, a) runs along the line.", "Flip both components when dx is negative.", "Return Math.atan2(dy, dx)."],
      cases: [
        example([{ a: 0, b: 1, c: -2 }], 0, "horizontal"),
        example([{ a: 1, b: 0, c: -3 }], PI / 2, "vertical"),
        example([{ a: -Math.SQRT1_2, b: Math.SQRT1_2, c: 0 }], PI / 4, "diagonal"),
        example([{ a: -1 / Math.sqrt(5), b: 2 / Math.sqrt(5), c: -2 / Math.sqrt(5) }], Math.atan2(1, 2), "slope one half"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to end with `ADVANCED_15, CORRECTION_16));`.

- [ ] **Step 4: Add the aisle scene (all views; later stages fill the puzzles)**

In `puzzle-scenes.js`, in `describe`, insert directly after `if (value.edges && Number.isFinite(value.duration)) return …;`:

```js
      if (value.mapFromOdom && value.correctedPose) return "map→odom " + fmtTransform(value.mapFromOdom) + " · heading " + degrees(value.heading) + " · corrected " + fmtTransform(value.correctedPose);
      if (value.line && Array.isArray(value.inliers)) return "line a " + fmt(value.line.a) + " b " + fmt(value.line.b) + " c " + fmt(value.line.c) + " · " + value.inliers.length + " inliers";
      if (["a", "b", "c"].every((key) => Number.isFinite(value[key])) && Object.keys(value).length === 3) return "line a " + fmt(value.a) + " b " + fmt(value.b) + " c " + fmt(value.c);
```

Insert directly before `const SCENES = {`:

```js
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
      } else if (view === "correct") {
        out.push(...lineLayers({ a: 0, b: 1, c: 0 }, "muted", "centerline", false), glyph(context.values.robot, "robot", "input"));
        if (isTransform(context.expected)) out.push(glyph(context.expected, "expected", "expected", { dashed: true }));
        if (isTransform(context.actual)) { out.push(glyph(context.actual, resultLabel(context), resultStyle(context))); out.push(...errorArrow(context, context.actual, context.expected)); }
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
```

Add to the `SCENES` literal after `"buffer": bufferScene,`:

```js
    "aisle": aisleScene,
```

- [ ] **Step 5: Run the tests**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `57/57 puzzle tests passed`.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add pose correction track with point-cloud bricks and aisle scene

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

---

### Task 2: Stage 17 (Rack Filters)

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`, `p5sim/tf2_walkthrough/puzzle-tests.js`

- [ ] **Step 1: Add failing tests**

Append before `async function runAllTests()`:

```js
  test("catalog track 4 stage 17 contains the rack filters", () => {
    same(idsInRange(68, 71), ["inlier-refit", "face-filter", "smooth-line", "consensus-heading"]);
  });

  test("catalog stage 17 references pass their cases and diagnoses differ", () => {
    checkStageRange(68, 71);
  });
```

- [ ] **Step 2: Run the tests and confirm failures**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `57/59 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 17 puzzles**

Insert directly before the `PUZZLES` line:

```js
  const CORRECTION_17 = [
    puzzle({
      number: 68, id: "inlier-refit", track: "correction", title: "Refit on Inliers",
      goal: "Fit, drop the points far from the line, refit, and repeat until the inlier set settles.",
      concept: "A single outlier tilts a least-squares line; iterating on inliers removes its pull.",
      functionName: "refitInliers", signature: "refitInliers(points, threshold, maxIterations) → { line, inliers }",
      starterSource: starter("refitInliers", "points, threshold, maxIterations", "inliers are the indexes of points within threshold of the final line."),
      referenceSource: lines(
        "function refitInliers(points, threshold, maxIterations) {",
        "  var active = points.map(function (p, i) { return i; });",
        "  var line = fitLine(points);",
        "  for (var iteration = 0; iteration < maxIterations; iteration += 1) {",
        "    line = fitLine(active.map(function (i) { return points[i]; }));",
        "    var next = [];",
        "    for (var i = 0; i < points.length; i += 1) { if (Math.abs(signedLineDistance(points[i], line)) <= threshold) next.push(i); }",
        "    var same = next.length === active.length && next.every(function (value, k) { return value === active[k]; });",
        "    active = next;",
        "    if (same || next.length < 2) break;",
        "  }",
        "  return { line: line, inliers: active };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["fit-line", "signed-line-distance"],
      reference: navref("line-fit", "recursiveLineFit"),
      scene: { kind: "aisle", view: "refit", handles: [{ id: "outlier", type: "point", label: "outlier", value: { x: 0.5, y: 0.9 } }], args: [{ fixture: "pointsWithOutlier" }, 0.3, 10] },
      diagnoses: [diagnosis("single-pass", "Only one fit was made: the outlier still pulled the line. Refit on the inliers until the set stops changing.", lines(
        "function refitInliers(points, threshold, maxIterations) {",
        "  var line = fitLine(points);",
        "  var inliers = [];",
        "  for (var i = 0; i < points.length; i += 1) { if (Math.abs(signedLineDistance(points[i], line)) <= threshold) inliers.push(i); }",
        "  return { line: line, inliers: inliers };",
        "}"
      ))],
      hints: ["Start with every index active.", "Each iteration: fit the active points, recompute which points are within threshold, compare with the previous set.", "Stop when the inlier list is unchanged (or fewer than two remain); return the last line and the list."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }], 0.3, 10], { line: { a: 0, b: 1, c: 0 }, inliers: [0, 1, 2, 3, 4] }, "one outlier above"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], 0.1, 10], { line: { a: 0, b: 1, c: 0 }, inliers: [0, 1, 2] }, "already clean"),
        example([[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 1.5, y: 0.5 }], 0.35, 10], { line: { a: 0, b: 1, c: -2 }, inliers: [0, 1, 2, 3] }, "one outlier below"),
      ],
    }),
    puzzle({
      number: 69, id: "face-filter", track: "correction", title: "Keep the Rack Face",
      goal: "Keep only the points on the aisle-facing surface of a rack.",
      concept: "Project onto the aisle's left normal: the face is the extreme projection, interior clutter sits behind it.",
      functionName: "faceFilter", signature: "faceFilter(points, heading, side, threshold) → points",
      starterSource: starter("faceFilter", "points, heading, side, threshold", "n = (−sin heading, cos heading); left keeps s ≤ min + threshold; right keeps s ≥ max − threshold."),
      referenceSource: lines(
        "function faceFilter(points, heading, side, threshold) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
        "  var face = side === \"left\" ? Math.min.apply(null, values) : Math.max.apply(null, values);",
        "  return points.filter(function (p, i) { return side === \"left\" ? values[i] <= face + threshold : values[i] >= face - threshold; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: navref("rotation-filter", "rotationSearchFilter (keep rule)"),
      scene: { kind: "aisle", view: "face", handles: [{ id: "aisle", type: "frame", label: "aisle in odom", value: { x: 0, y: 0.3, yaw: 0.2 } }], args: [{ fixture: "leftWithInterior" }, { fixture: "aisleHeading" }, "left", 0.15] },
      diagnoses: [
        diagnosis("sides-swapped", "Left and right are swapped: the left rack's face is its minimum projection (closest to the aisle), the right rack's face is its maximum.", lines(
          "function faceFilter(points, heading, side, threshold) {",
          "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
          "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
          "  var face = side === \"left\" ? Math.max.apply(null, values) : Math.min.apply(null, values);",
          "  return points.filter(function (p, i) { return side === \"left\" ? values[i] >= face - threshold : values[i] <= face + threshold; });",
          "}"
        )),
        diagnosis("heading-as-normal", "Projected onto the heading itself: the rack face is measured along the normal (−sin, cos).", lines(
          "function faceFilter(points, heading, side, threshold) {",
          "  var nx = Math.cos(heading), ny = Math.sin(heading);",
          "  var values = points.map(function (p) { return nx * p.x + ny * p.y; });",
          "  var face = side === \"left\" ? Math.min.apply(null, values) : Math.max.apply(null, values);",
          "  return points.filter(function (p, i) { return side === \"left\" ? values[i] <= face + threshold : values[i] >= face - threshold; });",
          "}"
        )),
      ],
      hints: ["The left normal of the aisle is (−sin h, cos h).", "Project every point: s = n · p. The left rack's face is the smallest s; the right rack's face is the largest.", "Keep points within threshold of that extreme."],
      cases: [
        example([[{ x: 0, y: 1.6 }, { x: 1, y: 1.6 }, { x: 2, y: 1.6 }, { x: 0.5, y: 1.9 }, { x: 1.5, y: 2.0 }], 0, "left", 0.1], [{ x: 0, y: 1.6 }, { x: 1, y: 1.6 }, { x: 2, y: 1.6 }], "left rack face"),
        example([[{ x: 0, y: -1.6 }, { x: 1, y: -1.6 }, { x: 0.5, y: -1.9 }], 0, "right", 0.1], [{ x: 0, y: -1.6 }, { x: 1, y: -1.6 }], "right rack face"),
        example([[{ x: -1.6, y: 0 }, { x: -1.6, y: 1 }, { x: -1.9, y: 0.5 }], PI / 2, "left", 0.1], [{ x: -1.6, y: 0 }, { x: -1.6, y: 1 }], "aisle along +y"),
        example([[{ x: 0, y: 1.6 }, { x: 0, y: 2.0 }], 0, "left", 1], [{ x: 0, y: 1.6 }, { x: 0, y: 2.0 }], "wide threshold keeps all"),
      ],
    }),
    puzzle({
      number: 70, id: "smooth-line", track: "correction", title: "Smooth a Line Over Time",
      goal: "Blend a new line fit into the previous one with an exponential moving average.",
      concept: "Lines have a sign ambiguity, so align the new normal to the previous one before blending, then renormalize.",
      functionName: "smoothLine", signature: "smoothLine(previous, line, alpha) → line",
      starterSource: starter("smoothLine", "previous, line, alpha", "previous may be null."),
      referenceSource: lines(
        "function smoothLine(previous, line, alpha) {",
        "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
        "  var next = previous.a * line.a + previous.b * line.b < 0 ? { a: -line.a, b: -line.b, c: -line.c } : line;",
        "  var mixed = { a: alpha * next.a + (1 - alpha) * previous.a, b: alpha * next.b + (1 - alpha) * previous.b, c: alpha * next.c + (1 - alpha) * previous.c };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return n < 1e-9 ? mixed : { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      reference: navref("coefficient-smoothing", "smoothLine"),
      scene: { kind: "aisle", view: "smooth", handles: [
        { id: "newC", type: "slider", label: "new line offset c", value: -2.4, min: -3.2, max: -0.8 },
        { id: "alpha", type: "slider", label: "alpha", value: 0.3, min: 0, max: 1 },
      ], args: [{ fixture: "previousLine" }, { fixture: "newLine" }, { handle: "alpha" }] },
      diagnoses: [
        diagnosis("no-sign-check", "A flipped new line cancelled the previous one: align the normals (dot product < 0 means flip all three coefficients) first.", lines(
          "function smoothLine(previous, line, alpha) {",
          "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
          "  var mixed = { a: alpha * line.a + (1 - alpha) * previous.a, b: alpha * line.b + (1 - alpha) * previous.b, c: alpha * line.c + (1 - alpha) * previous.c };",
          "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
          "  return n < 1e-9 ? mixed : { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
          "}"
        )),
        diagnosis("no-renormalize", "The blended normal is shorter than one: renormalize a, b, and c by the same factor.", lines(
          "function smoothLine(previous, line, alpha) {",
          "  if (!previous) return { a: line.a, b: line.b, c: line.c };",
          "  var next = previous.a * line.a + previous.b * line.b < 0 ? { a: -line.a, b: -line.b, c: -line.c } : line;",
          "  return { a: alpha * next.a + (1 - alpha) * previous.a, b: alpha * next.b + (1 - alpha) * previous.b, c: alpha * next.c + (1 - alpha) * previous.c };",
          "}"
        )),
      ],
      hints: ["No previous line means nothing to blend with.", "If previous·new normals dot below zero, negate the new line's a, b, and c.", "Blend all three, then divide by the length of (a, b)."],
      cases: [
        example([null, { a: 0, b: 1, c: -2.4 }, 0.3], { a: 0, b: 1, c: -2.4 }, "first observation"),
        example([{ a: 0, b: 1, c: -2 }, { a: 0, b: 1, c: -2.4 }, 0.5], { a: 0, b: 1, c: -2.2 }, "same sign"),
        example([{ a: 0, b: 1, c: -2 }, { a: 0, b: -1, c: 2.4 }, 0.5], { a: 0, b: 1, c: -2.2 }, "flipped sign"),
        example([{ a: 1, b: 0, c: -1 }, { a: 0, b: 1, c: -1 }, 0.5], { a: Math.SQRT1_2, b: Math.SQRT1_2, c: -Math.SQRT2 }, "renormalized blend"),
      ],
    }),
    puzzle({
      number: 71, id: "consensus-heading", track: "correction", title: "Heading Consensus",
      goal: "Combine rack headings into one aisle heading, weighting by inlier count and resolving the 180° ambiguity.",
      concept: "A line heading is only known modulo π; resolve each beam toward the previous heading before averaging on the circle.",
      functionName: "consensusHeading", signature: "consensusHeading(beams, previousHeading) → radians",
      starterSource: starter("consensusHeading", "beams, previousHeading", "beams: [{ heading, inlierCount }]; previousHeading may be null (use the first beam)."),
      referenceSource: lines(
        "function consensusHeading(beams, previousHeading) {",
        "  var reference = previousHeading === null ? beams[0].heading : previousHeading;",
        "  var sx = 0, sy = 0;",
        "  for (var i = 0; i < beams.length; i += 1) {",
        "    var heading = beams[i].heading;",
        "    var alt = wrapAngle(heading + Math.PI);",
        "    if (Math.abs(wrapAngle(alt - reference)) < Math.abs(wrapAngle(heading - reference))) heading = alt;",
        "    var weight = Math.max(1, beams[i].inlierCount);",
        "    sx += Math.cos(heading) * weight;",
        "    sy += Math.sin(heading) * weight;",
        "  }",
        "  return Math.atan2(sy, sx);",
        "}"
      ),
      comparator: "angle", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: navref("heading-consensus", "consensusHeading / resolveHeadingToReference"),
      scene: { kind: "aisle", view: "consensus", handles: [
        { id: "beamA", type: "dial", label: "beam A", value: 0.2, radius: 1.5 },
        { id: "beamB", type: "dial", label: "beam B", value: 2.9, radius: 2.2 },
      ], args: [{ fixture: "beams" }, 0.1] },
      diagnoses: [
        diagnosis("arithmetic-mean", "Averaging angles arithmetically breaks at the wrap: sum weighted cos and sin, then atan2.", lines(
          "function consensusHeading(beams, previousHeading) {",
          "  var reference = previousHeading === null ? beams[0].heading : previousHeading;",
          "  var total = 0, weights = 0;",
          "  for (var i = 0; i < beams.length; i += 1) {",
          "    var heading = beams[i].heading;",
          "    var alt = wrapAngle(heading + Math.PI);",
          "    if (Math.abs(wrapAngle(alt - reference)) < Math.abs(wrapAngle(heading - reference))) heading = alt;",
          "    var weight = Math.max(1, beams[i].inlierCount);",
          "    total += heading * weight; weights += weight;",
          "  }",
          "  return total / weights;",
          "}"
        )),
        diagnosis("no-resolve", "The 180° ambiguity was ignored: a rack line heading of 0.1 may really be 0.1 + π.", lines(
          "function consensusHeading(beams, previousHeading) {",
          "  var sx = 0, sy = 0;",
          "  for (var i = 0; i < beams.length; i += 1) {",
          "    var weight = Math.max(1, beams[i].inlierCount);",
          "    sx += Math.cos(beams[i].heading) * weight;",
          "    sy += Math.sin(beams[i].heading) * weight;",
          "  }",
          "  return Math.atan2(sy, sx);",
          "}"
        )),
      ],
      hints: ["For each beam, compare heading and heading + π against the reference; keep the closer one.", "Weight by max(1, inlierCount).", "Return atan2(Σ w·sin, Σ w·cos)."],
      cases: [
        example([[{ heading: 0.1, inlierCount: 5 }], 3.0], 0.1 + PI, "single beam resolved toward the previous heading"),
        example([[{ heading: 0, inlierCount: 1 }, { heading: 0.2, inlierCount: 1 }], null], 0.1, "equal weights"),
        example([[{ heading: 0, inlierCount: 3 }, { heading: 0.4, inlierCount: 1 }], null], Math.atan2(Math.sin(0.4), 3 + Math.cos(0.4)), "weighted"),
        example([[{ heading: 3.1, inlierCount: 1 }, { heading: -3.1, inlierCount: 1 }], 3.0], PI, "across the wrap"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to end with `CORRECTION_16, CORRECTION_17));`.

- [ ] **Step 4: Run the tests**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `59/59 puzzle tests passed`.

- [ ] **Step 5: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: add rack filter puzzles for inlier refits, faces, smoothing, and consensus

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

---

### Task 3: Stage 18 (Aisle Correction), README, verification

**Files:**
- Modify: `p5sim/tf2_walkthrough/puzzles.js`, `p5sim/tf2_walkthrough/puzzle-tests.js`, `p5sim/tf2_walkthrough/README.md`

- [ ] **Step 1: Add failing tests**

Append before `async function runAllTests()`:

```js
  test("catalog track 4 stage 18 contains the aisle correction ladder", () => {
    same(idsInRange(72, 75), ["centerline-from-racks", "single-rack-centerline", "corrected-pose", "aisle-correction-step"]);
    assert(puzzleList().length === 75, "catalog should hold 75 puzzles");
  });

  test("catalog stage 18 references pass their cases and diagnoses differ", () => {
    checkStageRange(72, 75);
  });

  test("scenes: the correction capstone puts the observed racks on the map rack lines", () => {
    const api = scenesApi();
    const puzzle = puzzlesApi().getPuzzle("aisle-correction-step");
    const values = api.initialValues(puzzle);
    const frame = api.toArgs(puzzle, values)[0];
    const result = referenceOutput(puzzle, [frame, 0.3]);
    near(result.heading, values.aisle.yaw);
    const odomFromLaser = api.se2.compose(values.robot, { x: 0.5, y: 0, yaw: 0 });
    frame.leftPoints.forEach((p) => near(api.se2.applyPoint(result.mapFromOdom, api.se2.applyPoint(odomFromLaser, p)).y, 1.6));
    frame.rightPoints.forEach((p) => near(api.se2.applyPoint(result.mapFromOdom, api.se2.applyPoint(odomFromLaser, p)).y, -1.6));
    near(result.correctedPose.yaw, values.robot.yaw - values.aisle.yaw);
  });
```

- [ ] **Step 2: Run the tests and confirm failures**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `59/62 puzzle tests passed`.

- [ ] **Step 3: Add the Stage 18 puzzles**

Insert directly before the `PUZZLES` line:

```js
  function poseCompose(a, b) {
    var origin = poseApply(a, b);
    var yaw = Math.atan2(Math.sin(a.yaw + b.yaw), Math.cos(a.yaw + b.yaw));
    return { x: origin.x, y: origin.y, yaw: yaw };
  }
  const CORRECTION_LASER = { x: 0.5, y: 0, yaw: 0 };
  function rackCase(aisle, odomFromBase) {
    var toLaser = poseInvert(poseCompose(odomFromBase, CORRECTION_LASER));
    var xs = [-2, -1, 0, 1, 2];
    var left = xs.map(function (x) { return poseApply(toLaser, poseApply(aisle, { x: x, y: 1.6 })); });
    var right = xs.map(function (x) { return poseApply(toLaser, poseApply(aisle, { x: x, y: -1.6 })); });
    var a = -Math.sin(aisle.yaw), b = Math.cos(aisle.yaw);
    var centerline = { a: a, b: b, c: -(a * aisle.x + b * aisle.y) };
    var mapFromOdom = { x: 0, y: centerline.c, yaw: -aisle.yaw };
    return {
      args: [{ odomFromBase: odomFromBase, baseFromLaser: CORRECTION_LASER, leftPoints: left, rightPoints: right }, 0.3],
      expected: { heading: aisle.yaw, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: poseCompose(mapFromOdom, odomFromBase) },
    };
  }
  const RACK_CASE_1 = rackCase({ x: 0, y: 0, yaw: 0 }, { x: 2, y: 0, yaw: 0 });
  const RACK_CASE_2 = rackCase({ x: 0, y: 0.5, yaw: 0 }, { x: 2, y: 0.5, yaw: 0 });
  const RACK_CASE_3 = rackCase({ x: 0, y: 0, yaw: 0.3 }, { x: 0, y: 0, yaw: 0.3 });
  const RACK_CASE_4 = rackCase({ x: 1, y: -0.4, yaw: -0.2 }, { x: 0.5, y: 0.2, yaw: 0.1 });

  const CORRECTION_18 = [
    puzzle({
      number: 72, id: "centerline-from-racks", track: "correction", title: "Aisle Centerline from Two Racks",
      goal: "Average the two rack lines into the aisle centerline after aligning their normals with the aisle heading.",
      concept: "Both racks face the aisle; once their normals agree, the centerline is their mean.",
      functionName: "centerlineFromRacks", signature: "centerlineFromRacks(leftLine, rightLine, heading) → line",
      starterSource: starter("centerlineFromRacks", "leftLine, rightLine, heading", "Align each line so its normal dots positively with (−sin heading, cos heading), average, renormalize."),
      referenceSource: lines(
        "function centerlineFromRacks(leftLine, rightLine, heading) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  function align(line) { return line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c }; }",
        "  var l = align(leftLine), r = align(rightLine);",
        "  var mixed = { a: (l.a + r.a) / 2, b: (l.b + r.b) / 2, c: (l.c + r.c) / 2 };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: navref("centerline", "computeCenterline (dual)"),
      scene: { kind: "aisle", view: "centerline", handles: [
        { id: "leftOffset", type: "slider", label: "left rack y", value: 1.6, min: 0.8, max: 3 },
        { id: "rightOffset", type: "slider", label: "right rack y", value: -1.6, min: -3, max: -0.8 },
      ], args: [{ fixture: "leftOffsetLine" }, { fixture: "rightOffsetLine" }, 0] },
      diagnoses: [diagnosis("no-alignment", "The lines were averaged without aligning their normals; opposite signs cancel to nothing.", lines(
        "function centerlineFromRacks(leftLine, rightLine, heading) {",
        "  var mixed = { a: (leftLine.a + rightLine.a) / 2, b: (leftLine.b + rightLine.b) / 2, c: (leftLine.c + rightLine.c) / 2 };",
        "  var n = Math.sqrt(mixed.a * mixed.a + mixed.b * mixed.b);",
        "  return { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };",
        "}"
      ))],
      hints: ["The aisle's left normal is (−sin h, cos h).", "Flip a line's a, b, c when its normal dots negatively with that normal.", "Average the aligned coefficients and renormalize by the length of (a, b)."],
      cases: [
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: 1, c: 1.6 }, 0], { a: 0, b: 1, c: 0 }, "symmetric aisle"),
        example([{ a: 0, b: 1, c: -1.6 }, { a: 0, b: -1, c: -1.6 }, 0], { a: 0, b: 1, c: 0 }, "right line flipped"),
        example([{ a: 0, b: 1, c: -3 }, { a: 0, b: 1, c: -1 }, 0], { a: 0, b: 1, c: -2 }, "offset aisle"),
        example([{ a: 1, b: 0, c: 1.6 }, { a: 1, b: 0, c: -1.6 }, PI / 2], { a: -1, b: 0, c: 0 }, "aisle along +y"),
      ],
    }),
    puzzle({
      number: 73, id: "single-rack-centerline", track: "correction", title: "Centerline from One Rack",
      goal: "When only one rack is visible, place the centerline the expected half-width away on the robot's side.",
      concept: "Fallback: the robot is between the racks, so the aisle center lies toward the robot.",
      functionName: "centerlineFromOneRack", signature: "centerlineFromOneRack(line, heading, pose, expectedDistance) → line",
      starterSource: starter("centerlineFromOneRack", "line, heading, pose, expectedDistance"),
      referenceSource: lines(
        "function centerlineFromOneRack(line, heading, pose, expectedDistance) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var aligned = line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c };",
        "  var signed = aligned.a * pose.x + aligned.b * pose.y + aligned.c;",
        "  var sideSign = signed >= 0 ? 1 : -1;",
        "  return { a: aligned.a, b: aligned.b, c: aligned.c - sideSign * expectedDistance };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: navref("centerline", "computeCenterline (single-beam fallback)"),
      scene: { kind: "aisle", view: "single", handles: [
        { id: "robot", type: "pose", label: "robot", value: { x: 0.5, y: 0.4, yaw: 0.1 } },
        { id: "rack", type: "selector", label: "visible rack", value: "left", options: ["left", "right"] },
      ], args: [{ fixture: "visibleLine" }, 0, { handle: "robot" }, 1.6] },
      diagnoses: [diagnosis("wrong-side", "The centerline was pushed away from the robot instead of toward it: subtract sideSign · expectedDistance from c.", lines(
        "function centerlineFromOneRack(line, heading, pose, expectedDistance) {",
        "  var nx = -Math.sin(heading), ny = Math.cos(heading);",
        "  var aligned = line.a * nx + line.b * ny < 0 ? { a: -line.a, b: -line.b, c: -line.c } : { a: line.a, b: line.b, c: line.c };",
        "  var signed = aligned.a * pose.x + aligned.b * pose.y + aligned.c;",
        "  var sideSign = signed >= 0 ? 1 : -1;",
        "  return { a: aligned.a, b: aligned.b, c: aligned.c + sideSign * expectedDistance };",
        "}"
      ))],
      hints: ["Align the line's normal with the aisle normal first.", "The sign of the robot's distance says which side of the rack it is on.", "Shift c by expectedDistance toward the robot: c − sideSign · expectedDistance."],
      cases: [
        example([{ a: 0, b: 1, c: -1.6 }, 0, { x: 0, y: 0, yaw: 0 }, 1.6], { a: 0, b: 1, c: 0 }, "left rack visible"),
        example([{ a: 0, b: 1, c: 1.6 }, 0, { x: 0, y: 0, yaw: 0 }, 1.6], { a: 0, b: 1, c: 0 }, "right rack visible"),
        example([{ a: 0, b: 1, c: -3 }, 0, { x: 0, y: 1, yaw: 0 }, 1.6], { a: 0, b: 1, c: -1.4 }, "offset rack"),
        example([{ a: 0, b: -1, c: 3 }, 0, { x: 0, y: 1, yaw: 0 }, 1.6], { a: 0, b: 1, c: -1.4 }, "flipped input line"),
      ],
    }),
    puzzle({
      number: 74, id: "corrected-pose", track: "correction", title: "Corrected Pose",
      goal: "Pull the pose toward the centerline by gain × its signed distance and adopt the aisle heading.",
      concept: "The lateral error is the one number the racks can tell you; the along-aisle position stays as odometry says.",
      functionName: "correctedPose", signature: "correctedPose(pose, centerline, aisleHeading, gain) → pose",
      starterSource: starter("correctedPose", "pose, centerline, aisleHeading, gain", "d = signedLineDistance(pose, centerline); move by −gain·d along the normal."),
      referenceSource: lines(
        "function correctedPose(pose, centerline, aisleHeading, gain) {",
        "  var d = signedLineDistance(pose, centerline);",
        "  return { x: pose.x - gain * d * centerline.a, y: pose.y - gain * d * centerline.b, yaw: aisleHeading };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["signed-line-distance"],
      reference: navref("correction", "correctedPoseFromCenterline"),
      scene: { kind: "aisle", view: "correct", handles: [
        { id: "robot", type: "pose", label: "robot", value: { x: 1, y: 0.7, yaw: 0.35 } },
        { id: "gain", type: "slider", label: "gain", value: 1, min: 0, max: 1 },
      ], args: [{ handle: "robot" }, { fixture: "mapCenterline" }, 0, { handle: "gain" }] },
      diagnoses: [
        diagnosis("sign-flipped", "The pose moved away from the centerline: subtract gain·d along the normal.", "function correctedPose(pose, centerline, aisleHeading, gain) { var d = signedLineDistance(pose, centerline); return { x: pose.x + gain * d * centerline.a, y: pose.y + gain * d * centerline.b, yaw: aisleHeading }; }"),
        diagnosis("yaw-kept", "The heading must become the aisle heading, not stay as odometry reported it.", "function correctedPose(pose, centerline, aisleHeading, gain) { var d = signedLineDistance(pose, centerline); return { x: pose.x - gain * d * centerline.a, y: pose.y - gain * d * centerline.b, yaw: pose.yaw }; }"),
      ],
      hints: ["signedLineDistance gives how far the robot is from the center, with a sign.", "Move against the normal (a, b) by gain × that distance.", "Return { x: x − gain·d·a, y: y − gain·d·b, yaw: aisleHeading }."],
      cases: [
        example([{ x: 2, y: 0.5, yaw: 0.3 }, { a: 0, b: 1, c: 0 }, 0, 1], { x: 2, y: 0, yaw: 0 }, "full correction"),
        example([{ x: 2, y: 0.5, yaw: 0.3 }, { a: 0, b: 1, c: 0 }, 0, 0.5], { x: 2, y: 0.25, yaw: 0 }, "half gain"),
        example([{ x: 0.4, y: 3, yaw: 1.4 }, { a: -1, b: 0, c: 0 }, PI / 2, 1], { x: 0, y: 3, yaw: PI / 2 }, "aisle along +y"),
        example([{ x: 1, y: -1, yaw: 0 }, { a: 0, b: 1, c: 0 }, 0, 1], { x: 1, y: 0, yaw: 0 }, "from below"),
      ],
    }),
    puzzle({
      number: 75, id: "aisle-correction-step", track: "correction", title: "Publish map → odom from the Racks",
      goal: "Run the whole pipeline for one frame and produce the map → odom correction that keeps odom → base_link untouched.",
      concept: "The map aisle is the x-axis; the observed centerline in odom tells where odom sits relative to it: mapFromOdom = { 0, c, −heading }.",
      functionName: "aisleCorrectionStep", signature: "aisleCorrectionStep(frame, threshold) → { heading, centerline, mapFromOdom, correctedPose }",
      starterSource: starter("aisleCorrectionStep", "frame, threshold", "frame = { odomFromBase, baseFromLaser, leftPoints, rightPoints } with points in the laser frame."),
      referenceSource: lines(
        "function aisleCorrectionStep(frame, threshold) {",
        "  var odomFromLaser = compose(frame.odomFromBase, frame.baseFromLaser);",
        "  var left = refitInliers(pointsToOdom(odomFromLaser, frame.leftPoints), threshold, 10);",
        "  var right = refitInliers(pointsToOdom(odomFromLaser, frame.rightPoints), threshold, 10);",
        "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
        "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
        "  var mapFromOdom = { x: 0, y: centerline.c, yaw: -heading };",
        "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["compose", "points-to-odom", "inlier-refit", "heading-from-line", "consensus-heading", "centerline-from-racks", "transform-pose"],
      reference: navref("tf-logic", "runPipeline + TF correction logic"),
      scene: { kind: "aisle", view: "capstone", handles: [
        { id: "aisle", type: "frame", label: "aisle drift in odom", value: { x: 0.3, y: 0.4, yaw: 0.15 } },
        { id: "robot", type: "pose", label: "robot in odom", value: { x: 1, y: 0.5, yaw: 0.3 } },
      ], args: [{ fixture: "correctionFrame" }, 0.3] },
      diagnoses: [
        diagnosis("points-not-transformed", "The lines were fitted in the laser frame: transform the clouds into odom first.", lines(
          "function aisleCorrectionStep(frame, threshold) {",
          "  var left = refitInliers(frame.leftPoints, threshold, 10);",
          "  var right = refitInliers(frame.rightPoints, threshold, 10);",
          "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
          "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
          "  var mapFromOdom = { x: 0, y: centerline.c, yaw: -heading };",
          "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
          "}"
        )),
        diagnosis("yaw-sign", "map → odom must rotate by −heading so the observed aisle lands on the map x-axis.", lines(
          "function aisleCorrectionStep(frame, threshold) {",
          "  var odomFromLaser = compose(frame.odomFromBase, frame.baseFromLaser);",
          "  var left = refitInliers(pointsToOdom(odomFromLaser, frame.leftPoints), threshold, 10);",
          "  var right = refitInliers(pointsToOdom(odomFromLaser, frame.rightPoints), threshold, 10);",
          "  var heading = consensusHeading([{ heading: headingFromLine(left.line), inlierCount: left.inliers.length }, { heading: headingFromLine(right.line), inlierCount: right.inliers.length }], null);",
          "  var centerline = centerlineFromRacks(left.line, right.line, heading);",
          "  var mapFromOdom = { x: 0, y: centerline.c, yaw: heading };",
          "  return { heading: heading, centerline: centerline, mapFromOdom: mapFromOdom, correctedPose: transformPose(mapFromOdom, frame.odomFromBase) };",
          "}"
        )),
      ],
      hints: ["odomFromLaser = compose(odomFromBase, baseFromLaser); move both clouds into odom.", "Refit each rack, take headings, consensus (previous null), then the centerline.", "mapFromOdom = { x: 0, y: centerline.c, yaw: −heading }; correctedPose = transformPose(mapFromOdom, odomFromBase)."],
      cases: [
        example(RACK_CASE_1.args, RACK_CASE_1.expected, "no drift"),
        example(RACK_CASE_2.args, RACK_CASE_2.expected, "lateral drift"),
        example(RACK_CASE_3.args, RACK_CASE_3.expected, "heading drift"),
        example(RACK_CASE_4.args, RACK_CASE_4.expected, "general drift"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to end with `CORRECTION_16, CORRECTION_17, CORRECTION_18));`.

- [ ] **Step 4: Update the README**

Replace the paragraph starting `Track 4 (Pose Correction) is listed in the map` with:

```markdown
Track 4 (Pose Correction) adds puzzles 64 to 75, unlocked by the buffer finale, and is the warehouse rack pipeline from `p5sim/navigation` rebuilt brick by brick:

16. Point-cloud bricks: pointsToOdom, fitLine (total least squares), signedLineDistance, headingFromLine.
17. Rack filters: refitInliers, faceFilter, smoothLine, consensusHeading.
18. Aisle correction: centerlineFromRacks, centerlineFromOneRack, correctedPose, aisleCorrectionStep, which produces the `map -> odom` transform that keeps `odom -> base_link` untouched.

Each puzzle links the matching demo under `p5sim/navigation`.
```

- [ ] **Step 5: Run every check**

Run: `node p5sim/tf2_walkthrough/tests.js` and `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `21/21 tests passed` and `62/62 puzzle tests passed`.

Then serve `p5sim` and confirm in a browser: `puzzle-lab.html` shows "75 geometry builds" and four tracks; after unlocking (`highestUnlocked: 74`), puzzle 64's transformed cloud lands on the racks, 68 shows the outlier excluded from the inliers, 69 keeps only the face points, 71 draws the two beams and the consensus heading, and 75 shows the observed racks pushed onto the map rack lines once a correct solution is entered. No console errors.

- [ ] **Step 6: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/README.md
git commit -m "feat: add aisle correction stage with centerline, corrected pose, and map to odom capstone

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014bGFMz54uBLRNsi4hos8KD"
```

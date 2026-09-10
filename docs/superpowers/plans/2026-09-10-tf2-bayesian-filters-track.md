# TF2 Bayesian Filters Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append Track 6 · Bayesian Filters (puzzles 88 to 102) that follows *Kalman and Bayesian Filters in Python* chapter by chapter, add "Also read" book links to Track 5, and fix the off-canvas fourth slider in the gyro puzzle.

**Architecture:** Same catalog pattern (`BAYES_STAGES`, a sixth track, `puzzle()` picks the stage list, arrays `BAYES_22` to `BAYES_24`). A new `bayes` scene kind draws number lines, hallway bars, Gaussian curves, and position-velocity ellipses. Puzzles gain an optional `reading` link rendered by the lab.

**Tech Stack:** Vanilla JavaScript, p5.js, Web Workers, Node 22 tests.

**Spec:** `docs/superpowers/specs/2026-09-10-tf2-bayesian-filters-track-design.md`

---

## File Structure

- `p5sim/tf2_walkthrough/puzzles.js` — stages, track, `bookref`, `reading`, `BAYES_22` to `BAYES_24`, gyro handle fix.
- `p5sim/tf2_walkthrough/puzzle-scenes.js` — `bayesScene`, `describe` additions, gyro label fix.
- `p5sim/tf2_walkthrough/puzzle-lab.html`, `puzzle-lab.js` — second link.
- `p5sim/tf2_walkthrough/puzzle-tests.js` — six-track assertions and Track 6 tests.
- `p5sim/tf2_walkthrough/README.md` — Track 6 section.

---

### Task 1: Catalog, tests, all three stages, scenes, lab link, README

**Files:**
- Modify: all five files above.

- [ ] **Step 1: Update track assertions and add failing tests**

In `puzzle-tests.js`:

1. Replace the allowed-track line with:

```js
      assert(["tf2", "toolkit", "advanced", "correction", "estimation", "bayes"].includes(puzzle.track), puzzle.id + " has unknown track " + puzzle.track);
```

2. Replace the track-id line `same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), [... "estimation"]);` with:

```js
    same(api.TF2_PUZZLE_TRACKS.map((track) => track.id), ["tf2", "toolkit", "advanced", "correction", "estimation", "bayes"]);
    assert(api.TF2_PUZZLE_TRACKS[5].unlockAfter === "ekf-localize-step", "track 6 unlocks after the EKF localization step");
    assert(api.TF2_PUZZLE_TRACKS[5].stages.length === 3, "track 6 lists three stages");
```

3. Change the two track-state assertions to six entries:

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "locked", "locked", "locked", "locked", "locked"]);
```

and

```js
    same(api.trackStates(tracks, progress).map((entry) => entry.state), ["available", "available", "locked", "locked", "locked", "locked"]);
```

4. Replace `assert(puzzleList().length === 87, "catalog should hold 87 puzzles");` with `assert(puzzleList().length >= 87, "catalog should hold at least 87 puzzles");`.

5. Append before `async function runAllTests()`:

```js
  // ---------------------------------------------------------------- bayesian filters track
  test("catalog track 6 contains the scalar, multivariate, and nonlinear ladders", () => {
    same(idsInRange(88, 92), ["gh-filter-step", "discrete-predict", "discrete-update", "gaussian-multiply", "kalman-1d-step"]);
    same(idsInRange(93, 98), ["mat-mul-2", "mat-inv-2", "constant-velocity-model", "kf-predict", "kf-update", "kalman-track-step"]);
    same(idsInRange(99, 102), ["sigma-points", "unscented-transform", "unscented-polar", "rts-smoother-step"]);
    assert(puzzleList().length === 102, "catalog should hold 102 puzzles");
    puzzleList().filter((puzzle) => puzzle.track === "bayes").forEach((puzzle) => {
      assert(/rlabbe\/Kalman-and-Bayesian-Filters-in-Python/.test(puzzle.reference.url), puzzle.id + " should link the book");
    });
    ["covariance-propagate-motion", "compose-uncertain", "covariance-ellipse", "ekf-predict", "ekf-update-position", "ekf-localize-step", "particle-weights", "resample-particles"].forEach((id) => {
      const puzzle = puzzlesApi().getPuzzle(id);
      assert(puzzle.reading && typeof puzzle.reading.label === "string" && /^https:\/\//.test(puzzle.reading.url), id + " should carry an also-read link");
    });
    puzzleList().forEach((puzzle) => {
      const lanes = puzzle.scene.handles.filter((handle) => handle.type === "slider" || handle.type === "timeline").length;
      assert(lanes <= 3, puzzle.id + " has " + lanes + " slider lanes; only three fit on the canvas");
    });
  });

  test("catalog stages 22 to 24 references pass their cases and diagnoses differ", () => {
    checkStageRange(88, 102);
  });

  test("scenes: bayes views build valid arguments and analytic checks hold", () => {
    checkSceneKinds(["bayes"]);
    const api = puzzlesApi();
    const sigma = referenceOutput(api.getPuzzle("sigma-points"), [{ x: 1, y: -0.5 }, [[0.6, 0.25], [0.25, 0.4]], 0.7, 2, 1]);
    const back = referenceOutput(api.getPuzzle("unscented-transform"), [sigma.points, sigma.wm, sigma.wc]);
    near(back.mean.x, 1); near(back.mean.y, -0.5); near(back.P[0][0], 0.6); near(back.P[0][1], 0.25); near(back.P[1][1], 0.4);
    const step = referenceOutput(api.getPuzzle("kalman-1d-step"), [{ mean: 0, variance: 1 }, { mean: 1, variance: 0 }, 2, 1]);
    const gain = 1 / (1 + 1);
    near(step.mean, 1 + gain * (2 - 1)); near(step.variance, (1 - gain) * 1);
    const rts = referenceOutput(api.getPuzzle("rts-smoother-step"), [[0, 1], [[1, 0], [0, 1]], [1, 1], [[2, 1], [1, 1]], [[1, 1], [0, 1]], [[0, 0], [0, 0]]]);
    near(rts.x[0], 0); near(rts.x[1], 1); near(rts.P[0][0], 1); near(rts.P[0][1], 0); near(rts.P[1][1], 1);
    const predicted = referenceOutput(api.getPuzzle("discrete-predict"), [[0.1, 0.2, 0.3, 0.4], 2, [0.2, 0.7, 0.1]]);
    near(predicted.reduce((sum, p) => sum + p, 0), 1);
  });
```

- [ ] **Step 2: Run the tests and confirm failures**

Run: `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: about `64/68 puzzle tests passed` (the lane assertion also fails on `integrate-gyro`).

- [ ] **Step 3: Add stages, the sixth track, the builder entry, the book helper, and the reading field**

In `puzzles.js`, insert directly before `const TRACKS = Object.freeze([`:

```js
  const BAYES_STAGES = Object.freeze([
    { id: "scalar-filters", title: "Scalar Filters", subtitle: "g-h, discrete Bayes, Gaussians, and the 1D Kalman filter.", range: [88, 92] },
    { id: "multivariate-kalman", title: "Multivariate Kalman", subtitle: "A position-velocity tracker, brick by brick.", range: [93, 98] },
    { id: "nonlinear-smoothing", title: "Nonlinear & Smoothing", subtitle: "Sigma points, the unscented transform, and RTS smoothing.", range: [99, 102] },
  ]);
```

Insert directly after the estimation track entry (after `      stages: ESTIMATION_STAGES,` and its closing `    }),`):

```js
    Object.freeze({
      id: "bayes",
      title: "Track 6 · Bayesian Filters",
      unlockAfter: "ekf-localize-step",
      note: "Unlocks after the EKF localization step.",
      stages: BAYES_STAGES,
    }),
```

Replace the `const stageList = …` line with:

```js
    const stageList = { tf2: STAGES, toolkit: TOOLKIT_STAGES, advanced: ADVANCED_STAGES, correction: CORRECTION_STAGES, estimation: ESTIMATION_STAGES, bayes: BAYES_STAGES }[track] || STAGES;
```

In `puzzle()`, add `      reading: null,` directly after `      reference: null,`.

Insert directly after the `navref` function:

```js
  const KBF = "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python/blob/master/";

  function bookref(chapter, symbol) {
    return Object.freeze({ label: "Kalman & Bayesian Filters · " + chapter + (symbol ? " · " + symbol : ""), url: KBF + chapter + ".ipynb" });
  }
```

Add a `reading` line directly after these Track 5 `reference` lines:

| puzzle | reference line | reading |
|---|---|---|
| covariance-propagate-motion | `reference: pyref(EKF_PY, "jacob_f / PPred"),` | `bookref("11-Extended-Kalman-Filters", "linearizing the motion model")` |
| compose-uncertain | `reference: docref("Smith, Self & Cheeseman (1990), …"),` | `bookref("05-Multivariate-Gaussians", "correlation and covariance")` |
| covariance-ellipse | `reference: pyref("utils/plot.py", "plot_covariance_ellipse"),` | `bookref("05-Multivariate-Gaussians", "plot_covariance_ellipse")` |
| ekf-predict | `reference: pyref(EKF_PY, "ekf_estimation (predict)"),` | `bookref("11-Extended-Kalman-Filters", "predict")` |
| ekf-update-position | `reference: pyref(EKF_PY, "ekf_estimation (update)"),` | `bookref("11-Extended-Kalman-Filters", "update")` |
| ekf-localize-step | `reference: pyref(EKF_PY, "ekf_estimation"),` | `bookref("11-Extended-Kalman-Filters", "robot localization")` |
| particle-weights | `reference: pyref(PF_PY, "gauss_likelihood"),` | `bookref("12-Particle-Filters", "update")` |
| resample-particles | `reference: pyref(PF_PY, "re_sampling"),` | `bookref("12-Particle-Filters", "systematic_resample")` |

Fix the gyro puzzle: delete its `dt` slider and pass `0.8` as the third argument, so its `scene` reads:

```js
      scene: { kind: "se3", view: "gyro", handles: [
        { id: "wx", type: "slider", label: "ωx (rad/s)", value: 0.4, min: -2, max: 2 },
        { id: "wy", type: "slider", label: "ωy (rad/s)", value: 0.2, min: -2, max: 2 },
        { id: "wz", type: "slider", label: "ωz (rad/s)", value: 1.2, min: -2, max: 2 },
      ], args: [{ fixture: "identityQuat" }, { fixture: "omegaFromSliders" }, 0.8] },
```

- [ ] **Step 4: Add the puzzles**

Insert directly before the `PUZZLES` line:

```js
  const CH01 = "01-g-h-filter", CH02 = "02-Discrete-Bayes", CH04 = "04-One-Dimensional-Kalman-Filters", CH05 = "05-Multivariate-Gaussians";
  const CH06 = "06-Multivariate-Kalman-Filters", CH07 = "07-Kalman-Filter-Math", CH09 = "09-Nonlinear-Filtering", CH10 = "10-Unscented-Kalman-Filter", CH13 = "13-Smoothing";
  const M2_I = [[1, 0], [0, 1]];
  const M2_ZERO = [[0, 0], [0, 0]];
  const F_UNIT = [[1, 1], [0, 1]];
  const P_STRAIGHT_2 = [[2, 1], [1, 1]];
  const SQ3 = Math.sqrt(3);
  const SIGMA_W = [1 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  const POLAR_P = [[1 / 3, 0], [0, PI * PI / 27]];

  const BAYES_22 = [
    puzzle({
      number: 88, id: "gh-filter-step", track: "bayes", title: "One g-h Filter Step",
      goal: "Predict with the current rate, then blend the residual into the estimate (g) and the rate (h).",
      concept: "Every filter in this track is this loop: predict, measure the residual, trust it a fraction. g and h are that fraction.",
      functionName: "ghFilterStep", signature: "ghFilterStep(x, dx, z, g, h, dt) → { x, dx }",
      starterSource: starter("ghFilterStep", "x, dx, z, g, h, dt", "prediction = x + dx·dt; residual = z − prediction; x = prediction + g·residual; dx += h·residual/dt."),
      referenceSource: lines(
        "function ghFilterStep(x, dx, z, g, h, dt) {",
        "  var prediction = x + dx * dt;",
        "  var residual = z - prediction;",
        "  return { x: prediction + g * residual, dx: dx + h * residual / dt };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH01, "g_h_filter"),
      scene: { kind: "bayes", view: "gh", handles: [
        { id: "z", type: "slider", label: "measurement z", value: 0.5, min: -4, max: 4 },
        { id: "g", type: "slider", label: "g (position gain)", value: 0.6, min: 0, max: 1 },
        { id: "h", type: "slider", label: "h (rate gain)", value: 0.2, min: 0, max: 1 },
      ], args: [{ fixture: "ghPrior" }, { fixture: "ghVelocity" }, { handle: "z" }, { handle: "g" }, { handle: "h" }, 1] },
      diagnoses: [
        diagnosis("residual-from-prior", "The residual was measured against the old x; compare z with the prediction x + dx·dt.", lines(
          "function ghFilterStep(x, dx, z, g, h, dt) {",
          "  var prediction = x + dx * dt;",
          "  var residual = z - x;",
          "  return { x: prediction + g * residual, dx: dx + h * residual / dt };",
          "}"
        )),
        diagnosis("h-not-over-dt", "The rate correction is h·residual/dt: a residual in metres becomes a rate only after dividing by the step.", lines(
          "function ghFilterStep(x, dx, z, g, h, dt) {",
          "  var prediction = x + dx * dt;",
          "  var residual = z - prediction;",
          "  return { x: prediction + g * residual, dx: dx + h * residual };",
          "}"
        )),
      ],
      hints: ["First move the estimate forward by dx·dt.", "The residual is z minus that prediction.", "x = prediction + g·residual; dx = dx + h·residual/dt."],
      cases: [
        example([160, 1, 158, 0.6, 0.1, 1], { x: 159.2, dx: 0.7 }, "the book's weight example"),
        example([0, 2, 3, 0.5, 0.5, 2], { x: 3.5, dx: 1.75 }, "two-second step"),
        example([10, 0, 12, 1, 0, 1], { x: 12, dx: 0 }, "g = 1 trusts the measurement"),
        example([5, 1, 6, 0, 0.2, 1], { x: 6, dx: 1 }, "no residual"),
      ],
    }),
    puzzle({
      number: 89, id: "discrete-predict", track: "bayes", title: "Discrete Bayes Predict",
      goal: "Move a belief along the hallway by offset cells, spreading it with an under/correct/over kernel and wrapping around.",
      concept: "Prediction is a convolution: motion is uncertain, so every cell's probability smears into its neighbours.",
      functionName: "discretePredict", signature: "discretePredict(belief, offset, kernel) → belief",
      starterSource: starter("discretePredict", "belief, offset, kernel", "out[i] = Σk belief[(i + 1 − k − offset) mod N] · kernel[k] for a 3-wide kernel [under, correct, over]."),
      referenceSource: lines(
        "function discretePredict(belief, offset, kernel) {",
        "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
        "  for (var i = 0; i < n; i += 1) {",
        "    var total = 0;",
        "    for (var k = 0; k < kernel.length; k += 1) {",
        "      var index = (((i + width - k - offset) % n) + n) % n;",
        "      total += belief[index] * kernel[k];",
        "    }",
        "    out.push(total);",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH02, "predict_move_convolution"),
      scene: { kind: "bayes", view: "hallway-predict", handles: [
        { id: "offset", type: "slider", label: "move (cells, rounded)", value: 2, min: 0, max: 4 },
        { id: "pCorrect", type: "slider", label: "P(exact move)", value: 0.8, min: 0.4, max: 1 },
      ], args: [{ fixture: "hallBelief" }, { fixture: "hallOffset" }, { fixture: "hallKernel" }] },
      diagnoses: [
        diagnosis("no-wrap", "Cells past the end were dropped: the hallway is circular, so indexes must wrap with a modulo.", lines(
          "function discretePredict(belief, offset, kernel) {",
          "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
          "  for (var i = 0; i < n; i += 1) {",
          "    var total = 0;",
          "    for (var k = 0; k < kernel.length; k += 1) {",
          "      var index = i + width - k - offset;",
          "      if (index >= 0 && index < n) total += belief[index] * kernel[k];",
          "    }",
          "    out.push(total);",
          "  }",
          "  return out;",
          "}"
        )),
        diagnosis("kernel-mirrored", "The kernel was applied backwards: kernel[0] is the chance of moving one cell short, kernel[2] one cell too far.", lines(
          "function discretePredict(belief, offset, kernel) {",
          "  var n = belief.length, width = Math.floor(kernel.length / 2), out = [];",
          "  for (var i = 0; i < n; i += 1) {",
          "    var total = 0;",
          "    for (var k = 0; k < kernel.length; k += 1) {",
          "      var index = (((i - width + k - offset) % n) + n) % n;",
          "      total += belief[index] * kernel[k];",
          "    }",
          "    out.push(total);",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["For each output cell, sum over the kernel entries.", "The source cell for kernel[k] is i + width − k − offset, wrapped into [0, N).", "JavaScript's % can be negative: use ((v % n) + n) % n."],
      cases: [
        example([[1, 0, 0, 0, 0], 1, [0.1, 0.8, 0.1]], [0.1, 0.8, 0.1, 0, 0], "one cell, one step"),
        example([[1, 0, 0, 0, 0], 1, [0.3, 0.6, 0.1]], [0.3, 0.6, 0.1, 0, 0], "asymmetric kernel"),
        example([[0, 0, 0, 0, 1], 1, [0.1, 0.8, 0.1]], [0.8, 0.1, 0, 0, 0.1], "wraps around the end"),
        example([[0, 1, 0, 0], -1, [0.2, 0.6, 0.2]], [0.6, 0.2, 0, 0.2], "moving backwards"),
        example([[0.2, 0.2, 0.2, 0.2, 0.2], 3, [0, 1, 0]], [0.2, 0.2, 0.2, 0.2, 0.2], "uniform stays uniform"),
      ],
    }),
    puzzle({
      number: 90, id: "discrete-update", track: "bayes", title: "Discrete Bayes Update",
      goal: "Multiply the belief by the measurement likelihood and normalize.",
      concept: "Bayes' rule in one line: posterior ∝ likelihood × prior. The division by the sum is what makes it a probability again.",
      functionName: "discreteUpdate", signature: "discreteUpdate(belief, likelihood) → belief",
      starterSource: starter("discreteUpdate", "belief, likelihood", "Multiply element-wise, then divide by the total."),
      referenceSource: lines(
        "function discreteUpdate(belief, likelihood) {",
        "  var raw = belief.map(function (b, i) { return b * likelihood[i]; });",
        "  var total = raw.reduce(function (sum, value) { return sum + value; }, 0);",
        "  return raw.map(function (value) { return value / total; });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH02, "update"),
      scene: { kind: "bayes", view: "hallway-update", handles: [{ id: "trust", type: "slider", label: "door likelihood scale", value: 3, min: 1, max: 6 }], args: [{ fixture: "hallBelief" }, { fixture: "doorLikelihood" }] },
      diagnoses: [
        diagnosis("unnormalized", "The product must be divided by its sum so the belief still totals one.", "function discreteUpdate(belief, likelihood) { return belief.map(function (b, i) { return b * likelihood[i]; }); }"),
        diagnosis("sum-not-product", "Likelihood and prior multiply; adding them lets an impossible cell keep probability.", lines(
          "function discreteUpdate(belief, likelihood) {",
          "  var raw = belief.map(function (b, i) { return b + likelihood[i]; });",
          "  var total = raw.reduce(function (sum, value) { return sum + value; }, 0);",
          "  return raw.map(function (value) { return value / total; });",
          "}"
        )),
      ],
      hints: ["Multiply belief[i] by likelihood[i].", "Add the products up.", "Divide each product by that total."],
      cases: [
        example([[0.25, 0.25, 0.25, 0.25], [3, 1, 1, 1]], [0.5, 1 / 6, 1 / 6, 1 / 6], "one likely cell"),
        example([[0.5, 0.5], [0, 1]], [0, 1], "an impossible cell"),
        example([[0.1, 0.9], [1, 1]], [0.1, 0.9], "uninformative measurement"),
        example([[0.2, 0.3, 0.5], [2, 2, 1]], [4 / 15, 0.4, 1 / 3], "mixed"),
      ],
    }),
    puzzle({
      number: 91, id: "gaussian-multiply", track: "bayes", title: "Multiply Two Gaussians",
      goal: "Fuse two Gaussian beliefs into one: variance-weighted mean, smaller variance.",
      concept: "The product of two Gaussians is a Gaussian, which is why a Kalman update is one formula and not an integral.",
      functionName: "gaussianMultiply", signature: "gaussianMultiply(a, b) → { mean, variance }",
      starterSource: starter("gaussianMultiply", "a, b", "mean = (σa²·μb + σb²·μa) / (σa² + σb²); variance = σa²σb² / (σa² + σb²)."),
      referenceSource: lines(
        "function gaussianMultiply(a, b) {",
        "  var total = a.variance + b.variance;",
        "  return { mean: (a.variance * b.mean + b.variance * a.mean) / total, variance: (a.variance * b.variance) / total };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH04, "gaussian_multiply"),
      scene: { kind: "bayes", view: "gaussians", handles: [
        { id: "meanA", type: "slider", label: "mean a", value: -1.5, min: -4, max: 4 },
        { id: "varianceA", type: "slider", label: "variance a", value: 1, min: 0.2, max: 3 },
        { id: "meanB", type: "slider", label: "mean b", value: 1.5, min: -4, max: 4 },
      ], args: [{ fixture: "gaussA" }, { fixture: "gaussB" }] },
      diagnoses: [
        diagnosis("mean-average", "A plain average ignores which belief is tighter: weight each mean by the other's variance.", "function gaussianMultiply(a, b) { var total = a.variance + b.variance; return { mean: (a.mean + b.mean) / 2, variance: (a.variance * b.variance) / total }; }"),
        diagnosis("variance-sum", "Two measurements agree more than either alone: the product's variance is smaller than both, not their sum.", "function gaussianMultiply(a, b) { var total = a.variance + b.variance; return { mean: (a.variance * b.mean + b.variance * a.mean) / total, variance: total }; }"),
      ],
      hints: ["The tighter Gaussian pulls the mean towards itself.", "mean = (σa²·μb + σb²·μa) / (σa² + σb²).", "variance = σa²·σb² / (σa² + σb²), always below both inputs."],
      cases: [
        example([{ mean: 10, variance: 1 }, { mean: 12, variance: 1 }], { mean: 11, variance: 0.5 }, "equal trust"),
        example([{ mean: 0, variance: 4 }, { mean: 2, variance: 1 }], { mean: 1.6, variance: 0.8 }, "tighter b wins"),
        example([{ mean: 3, variance: 9 }, { mean: 3, variance: 1 }], { mean: 3, variance: 0.9 }, "same mean"),
        example([{ mean: -1, variance: 2 }, { mean: 3, variance: 2 }], { mean: 1, variance: 1 }, "symmetric"),
      ],
    }),
    puzzle({
      number: 92, id: "kalman-1d-step", track: "bayes", title: "One-Dimensional Kalman Step",
      goal: "Predict by adding the movement Gaussian, then update by multiplying with the measurement Gaussian.",
      concept: "This is the whole Kalman filter in one dimension. The gain form K = P/(P + R) is the same product written differently.",
      functionName: "kalman1dStep", signature: "kalman1dStep(prior, movement, z, measurementVariance) → { mean, variance }",
      starterSource: starter("kalman1dStep", "prior, movement, z, measurementVariance", "predicted = { prior.mean + movement.mean, prior.variance + movement.variance }; then gaussianMultiply with { z, measurementVariance }."),
      referenceSource: lines(
        "function kalman1dStep(prior, movement, z, measurementVariance) {",
        "  var predicted = { mean: prior.mean + movement.mean, variance: prior.variance + movement.variance };",
        "  return gaussianMultiply(predicted, { mean: z, variance: measurementVariance });",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["gaussian-multiply"],
      reference: bookref(CH04, "predict / update"),
      scene: { kind: "bayes", view: "kalman-1d", handles: [
        { id: "move", type: "slider", label: "movement mean", value: 2, min: -2, max: 4 },
        { id: "z", type: "slider", label: "measurement z", value: 1, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance", value: 1, min: 0.2, max: 3 },
      ], args: [{ fixture: "prior1d" }, { fixture: "movement1d" }, { handle: "z" }, { handle: "R" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement was fused before the move; the measurement describes where the robot is after moving.", lines(
          "function kalman1dStep(prior, movement, z, measurementVariance) {",
          "  var updated = gaussianMultiply(prior, { mean: z, variance: measurementVariance });",
          "  return { mean: updated.mean + movement.mean, variance: updated.variance + movement.variance };",
          "}"
        )),
        diagnosis("movement-noise-dropped", "Moving adds uncertainty: the predicted variance is prior plus movement variance.", lines(
          "function kalman1dStep(prior, movement, z, measurementVariance) {",
          "  var predicted = { mean: prior.mean + movement.mean, variance: prior.variance };",
          "  return gaussianMultiply(predicted, { mean: z, variance: measurementVariance });",
          "}"
        )),
      ],
      hints: ["Predict: add the means and add the variances.", "Update: multiply the predicted Gaussian with the measurement Gaussian.", "gaussianMultiply(predicted, { mean: z, variance: measurementVariance })."],
      cases: [
        example([{ mean: 0, variance: 1 }, { mean: 1, variance: 0 }, 2, 1], { mean: 1.5, variance: 0.5 }, "move one, measure two"),
        example([{ mean: 0, variance: 1 }, { mean: 1, variance: 1 }, 2, 2], { mean: 1.5, variance: 1 }, "noisy move and measurement"),
        example([{ mean: 5, variance: 0.5 }, { mean: 0, variance: 0 }, 5, 0.5], { mean: 5, variance: 0.25 }, "standing still"),
        example([{ mean: 0, variance: 1 }, { mean: 2, variance: 0.5 }, 1, 3], { mean: 5 / 3, variance: 1 }, "loose measurement"),
      ],
    }),
  ];

  const BAYES_23 = [
    puzzle({
      number: 93, id: "mat-mul-2", track: "bayes", title: "Multiply 2×2 Matrices",
      goal: "The 2×2 product brick every multivariate filter step reuses.",
      concept: "Column j of A·B is A applied to column j of B: the product transforms the second matrix's columns.",
      functionName: "matMul2", signature: "matMul2(a, b) → 2×2",
      starterSource: starter("matMul2", "a, b", "result[i][j] = a[i][0]·b[0][j] + a[i][1]·b[1][j]."),
      referenceSource: lines(
        "function matMul2(a, b) {",
        "  return [",
        "    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],",
        "    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: bookref(CH05, "multivariate Gaussians"),
      scene: { kind: "bayes", view: "matrix2", handles: [
        { id: "col1", type: "vector", label: "B column 1", value: { x: 1, y: 0.3 } },
        { id: "col2", type: "vector", label: "B column 2", value: { x: -0.4, y: 1 } },
      ], args: [{ fixture: "shearA" }, { fixture: "matrixFromColumns" }] },
      diagnoses: [
        diagnosis("elementwise", "That multiplies matching entries; a matrix product sums row-times-column.", "function matMul2(a, b) { return [[a[0][0] * b[0][0], a[0][1] * b[0][1]], [a[1][0] * b[1][0], a[1][1] * b[1][1]]]; }"),
        diagnosis("transposed", "The factors were swapped: matrix products do not commute, so A·B ≠ B·A.", lines(
          "function matMul2(a, b) {",
          "  return [",
          "    [b[0][0] * a[0][0] + b[0][1] * a[1][0], b[0][0] * a[0][1] + b[0][1] * a[1][1]],",
          "    [b[1][0] * a[0][0] + b[1][1] * a[1][0], b[1][0] * a[0][1] + b[1][1] * a[1][1]],",
          "  ];",
          "}"
        )),
      ],
      hints: ["Entry (i, j) is row i of a dotted with column j of b.", "Four entries, two terms each.", "Return [[r00, r01], [r10, r11]]."],
      cases: [
        example([M2_I, [[1, 2], [3, 4]]], [[1, 2], [3, 4]], "identity"),
        example([[[1, 2], [3, 4]], [[0, 1], [1, 0]]], [[2, 1], [4, 3]], "swap columns"),
        example([[[0, 1], [1, 0]], [[1, 2], [3, 4]]], [[3, 4], [1, 2]], "swap rows"),
        example([F_UNIT, F_UNIT], [[1, 2], [0, 1]], "two constant-velocity steps"),
      ],
    }),
    puzzle({
      number: 94, id: "mat-inv-2", track: "bayes", title: "Invert a 2×2 Matrix",
      goal: "The closed-form inverse: swap the diagonal, negate the off-diagonal, divide by the determinant.",
      concept: "Kalman gains divide by the innovation covariance; in two dimensions that division is this brick.",
      functionName: "matInv2", signature: "matInv2(m) → 2×2",
      starterSource: starter("matInv2", "m", "[[d, −b], [−c, a]] / (ad − bc)."),
      referenceSource: lines(
        "function matInv2(m) {",
        "  var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];",
        "  return [[m[1][1] / det, -m[0][1] / det], [-m[1][0] / det, m[0][0] / det]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: bookref(CH07, "Kalman filter math"),
      scene: { kind: "bayes", view: "matrix2", handles: [
        { id: "col1", type: "vector", label: "M column 1", value: { x: 1.2, y: 0.4 } },
        { id: "col2", type: "vector", label: "M column 2", value: { x: -0.5, y: 1 } },
      ], args: [{ fixture: "matrixFromColumns" }] },
      diagnoses: [
        diagnosis("no-determinant", "That is the adjugate; divide every entry by the determinant ad − bc.", "function matInv2(m) { return [[m[1][1], -m[0][1]], [-m[1][0], m[0][0]]]; }"),
        diagnosis("diagonal-not-swapped", "The diagonal entries trade places in the inverse: a and d swap.", "function matInv2(m) { var det = m[0][0] * m[1][1] - m[0][1] * m[1][0]; return [[m[0][0] / det, -m[0][1] / det], [-m[1][0] / det, m[1][1] / det]]; }"),
      ],
      hints: ["det = ad − bc.", "Swap a and d, negate b and c.", "Divide all four by det."],
      cases: [
        example([[[2, 0], [0, 4]]], [[0.5, 0], [0, 0.25]], "diagonal"),
        example([[[1, 2], [3, 4]]], [[-2, 1], [1.5, -0.5]], "negative determinant"),
        example([[[0, 1], [-1, 0]]], [[0, -1], [1, 0]], "rotation by 90°"),
        example([M2_I], M2_I, "identity"),
      ],
    }),
    puzzle({
      number: 95, id: "constant-velocity-model", track: "bayes", title: "Constant-Velocity Model",
      goal: "Build the state transition F and the discrete white-noise Q for a [position, velocity] state.",
      concept: "F says how the state moves on its own; Q says how much you distrust that story per step.",
      functionName: "constantVelocityModel", signature: "constantVelocityModel(dt, processVariance) → { F, Q }",
      starterSource: starter("constantVelocityModel", "dt, processVariance", "F = [[1, dt], [0, 1]]; Q = var · [[dt⁴/4, dt³/2], [dt³/2, dt²]]."),
      referenceSource: lines(
        "function constantVelocityModel(dt, processVariance) {",
        "  var dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;",
        "  return { F: [[1, dt], [0, 1]], Q: [[processVariance * dt4 / 4, processVariance * dt3 / 2], [processVariance * dt3 / 2, processVariance * dt2]] };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      reference: bookref(CH06, "Q_discrete_white_noise"),
      scene: { kind: "bayes", view: "cv-model", handles: [
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.2, max: 1.5 },
        { id: "variance", type: "slider", label: "process variance", value: 0.4, min: 0.1, max: 1 },
      ], args: [{ handle: "dt" }, { handle: "variance" }] },
      diagnoses: [
        diagnosis("f-without-dt", "Position advances by velocity times dt, so F's top-right entry is dt.", lines(
          "function constantVelocityModel(dt, processVariance) {",
          "  var dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;",
          "  return { F: [[1, 1], [0, 1]], Q: [[processVariance * dt4 / 4, processVariance * dt3 / 2], [processVariance * dt3 / 2, processVariance * dt2]] };",
          "}"
        )),
        diagnosis("q-diagonal-only", "Process noise on the velocity also moves the position, so Q has off-diagonal terms dt³/2.", lines(
          "function constantVelocityModel(dt, processVariance) {",
          "  var dt2 = dt * dt, dt4 = dt2 * dt2;",
          "  return { F: [[1, dt], [0, 1]], Q: [[processVariance * dt4 / 4, 0], [0, processVariance * dt2]] };",
          "}"
        )),
      ],
      hints: ["F: position += velocity·dt, velocity unchanged.", "Q comes from integrating white acceleration noise over dt.", "Q = var·[[dt⁴/4, dt³/2], [dt³/2, dt²]]."],
      cases: [
        example([1, 1], { F: F_UNIT, Q: [[0.25, 0.5], [0.5, 1]] }, "unit step"),
        example([2, 1], { F: [[1, 2], [0, 1]], Q: [[4, 4], [4, 4]] }, "two seconds"),
        example([0.5, 2], { F: [[1, 0.5], [0, 1]], Q: [[0.03125, 0.125], [0.125, 0.5]] }, "half second, more noise"),
        example([1, 0], { F: F_UNIT, Q: M2_ZERO }, "no process noise"),
      ],
    }),
    puzzle({
      number: 96, id: "kf-predict", track: "bayes", title: "Kalman Predict (2 States)",
      goal: "x = F x and P = F P Fᵀ + Q for the position-velocity tracker.",
      concept: "Prediction moves the mean with the model and stretches the covariance the same way, then adds process noise.",
      functionName: "kfPredict", signature: "kfPredict(x, P, F, Q) → { x, P }",
      starterSource: starter("kfPredict", "x, P, F, Q", "x is [position, velocity]."),
      referenceSource: lines(
        "function kfPredict(x, P, F, Q) {",
        "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
        "  var spread = matMul2(matMul2(F, P), ft);",
        "  return {",
        "    x: [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]],",
        "    P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]],",
        "  };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-2"],
      reference: bookref(CH06, "predict"),
      scene: { kind: "bayes", view: "kf-predict", handles: [
        { id: "state", type: "point", label: "state (position, velocity)", value: { x: -2, y: 1 } },
        { id: "dt", type: "slider", label: "dt (s)", value: 1, min: 0.2, max: 2 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfP0" }, { fixture: "cvF" }, { fixture: "cvQ" }] },
      diagnoses: [
        diagnosis("no-transpose", "The right-hand factor must be Fᵀ.", lines(
          "function kfPredict(x, P, F, Q) {",
          "  var spread = matMul2(matMul2(F, P), F);",
          "  return {",
          "    x: [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]],",
          "    P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]],",
          "  };",
          "}"
        )),
        diagnosis("state-unchanged", "The mean must move too: x = F x.", lines(
          "function kfPredict(x, P, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var spread = matMul2(matMul2(F, P), ft);",
          "  return { x: [x[0], x[1]], P: [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]] };",
          "}"
        )),
      ],
      hints: ["New x is F applied to the state vector.", "New P is matMul2(matMul2(F, P), Fᵀ).", "Add Q element-wise."],
      cases: [
        example([[0, 1], M2_I, F_UNIT, M2_ZERO], { x: [1, 1], P: P_STRAIGHT_2 }, "unit step"),
        example([[2, -1], [[4, 0], [0, 1]], [[1, 2], [0, 1]], M2_I], { x: [0, -1], P: [[9, 2], [2, 2]] }, "two seconds with noise"),
        example([[1, 0], M2_ZERO, M2_I, [[0.1, 0], [0, 0.2]]], { x: [1, 0], P: [[0.1, 0], [0, 0.2]] }, "only process noise"),
        example([[0, 0], M2_I, M2_I, M2_ZERO], { x: [0, 0], P: M2_I }, "identity model"),
      ],
    }),
    puzzle({
      number: 97, id: "kf-update", track: "bayes", title: "Kalman Update (Scalar Measurement)",
      goal: "Fuse one scalar measurement z = H x: innovation, S, gain, corrected x, shrunk P.",
      concept: "H picks what the sensor sees. Velocity is never measured here, yet it gets corrected through P's off-diagonal.",
      functionName: "kfUpdate", signature: "kfUpdate(x, P, z, H, R) → { x, P }",
      starterSource: starter("kfUpdate", "x, P, z, H, R", "H is 1×2, R a number. y = z − H x; S = H P Hᵀ + R; K = P Hᵀ / S; x += K y; P = (I − K H) P."),
      referenceSource: lines(
        "function kfUpdate(x, P, z, H, R) {",
        "  var h0 = H[0][0], h1 = H[0][1];",
        "  var y = z - (h0 * x[0] + h1 * x[1]);",
        "  var pht = [P[0][0] * h0 + P[0][1] * h1, P[1][0] * h0 + P[1][1] * h1];",
        "  var s = h0 * pht[0] + h1 * pht[1] + R;",
        "  var k = [pht[0] / s, pht[1] / s];",
        "  var ikh = [[1 - k[0] * h0, -k[0] * h1], [-k[1] * h0, 1 - k[1] * h1]];",
        "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: matMul2(ikh, P) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["mat-mul-2"],
      reference: bookref(CH06, "update"),
      scene: { kind: "bayes", view: "kf-update", handles: [
        { id: "state", type: "point", label: "prior (position, velocity)", value: { x: -1, y: 0.8 } },
        { id: "z", type: "slider", label: "position measurement z", value: 1, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance R", value: 0.5, min: 0.1, max: 3 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfPUpdate" }, { handle: "z" }, { fixture: "hPosition" }, { handle: "R" }] },
      diagnoses: [
        diagnosis("full-gain", "The gain must divide by S = H P Hᵀ + R; without it the state jumps onto the measurement.", lines(
          "function kfUpdate(x, P, z, H, R) {",
          "  var h0 = H[0][0], h1 = H[0][1];",
          "  var y = z - (h0 * x[0] + h1 * x[1]);",
          "  var k = [h0, h1];",
          "  var ikh = [[1 - k[0] * h0, -k[0] * h1], [-k[1] * h0, 1 - k[1] * h1]];",
          "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: matMul2(ikh, P) };",
          "}"
        )),
        diagnosis("covariance-unchanged", "A measurement must shrink P: P = (I − K H) P.", lines(
          "function kfUpdate(x, P, z, H, R) {",
          "  var h0 = H[0][0], h1 = H[0][1];",
          "  var y = z - (h0 * x[0] + h1 * x[1]);",
          "  var pht = [P[0][0] * h0 + P[0][1] * h1, P[1][0] * h0 + P[1][1] * h1];",
          "  var s = h0 * pht[0] + h1 * pht[1] + R;",
          "  var k = [pht[0] / s, pht[1] / s];",
          "  return { x: [x[0] + k[0] * y, x[1] + k[1] * y], P: P };",
          "}"
        )),
      ],
      hints: ["P Hᵀ is a 2-vector; S = H (P Hᵀ) + R is a number.", "K = P Hᵀ / S; x += K·y.", "I − K H is 2×2 with K's entries in the column H selects; P = matMul2(I − K H, P)."],
      cases: [
        example([[0, 0], M2_I, 2, [[1, 0]], 1], { x: [1, 0], P: [[0.5, 0], [0, 1]] }, "equal trust"),
        example([[0, 0], P_STRAIGHT_2, 1, [[1, 0]], 0], { x: [1, 0.5], P: [[0, 0], [0, 0.5]] }, "perfect fix corrects velocity too"),
        example([[1, 1], M2_I, 1, [[1, 0]], 1], { x: [1, 1], P: [[0.5, 0], [0, 1]] }, "measurement agrees"),
        example([[0, 2], M2_I, 3, [[0, 1]], 1], { x: [0, 2.5], P: [[1, 0], [0, 0.5]] }, "measuring velocity instead"),
      ],
    }),
    puzzle({
      number: 98, id: "kalman-track-step", track: "bayes", title: "One Tracker Step",
      goal: "Build the model, predict, and update with a position measurement, in that order.",
      concept: "This is the book's dog tracker: constant velocity plus a noisy position sensor, one step at a time.",
      functionName: "kalmanTrackStep", signature: "kalmanTrackStep(x, P, z, dt, processVariance, R) → { x, P }",
      starterSource: starter("kalmanTrackStep", "x, P, z, dt, processVariance, R"),
      referenceSource: lines(
        "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
        "  var model = constantVelocityModel(dt, processVariance);",
        "  var predicted = kfPredict(x, P, model.F, model.Q);",
        "  return kfUpdate(predicted.x, predicted.P, z, [[1, 0]], R);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["constant-velocity-model", "kf-predict", "kf-update"],
      reference: bookref(CH06, "pos_vel_filter"),
      scene: { kind: "bayes", view: "kf-track", handles: [
        { id: "state", type: "point", label: "state (position, velocity)", value: { x: -2.5, y: 1 } },
        { id: "z", type: "slider", label: "position measurement z", value: 0, min: -4, max: 4 },
        { id: "R", type: "slider", label: "measurement variance R", value: 0.5, min: 0.1, max: 3 },
      ], args: [{ fixture: "stateVec" }, { fixture: "kfP0" }, { handle: "z" }, 1, 0.1, { handle: "R" }] },
      diagnoses: [
        diagnosis("update-before-predict", "The measurement arrives after the motion: predict first, then update.", lines(
          "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
          "  var model = constantVelocityModel(dt, processVariance);",
          "  var updated = kfUpdate(x, P, z, [[1, 0]], R);",
          "  return kfPredict(updated.x, updated.P, model.F, model.Q);",
          "}"
        )),
        diagnosis("no-update", "The measurement was ignored; call kfUpdate after predicting.", lines(
          "function kalmanTrackStep(x, P, z, dt, processVariance, R) {",
          "  var model = constantVelocityModel(dt, processVariance);",
          "  return kfPredict(x, P, model.F, model.Q);",
          "}"
        )),
      ],
      hints: ["constantVelocityModel(dt, processVariance) gives F and Q.", "kfPredict, then kfUpdate with H = [[1, 0]].", "Return the update's result."],
      cases: [
        example([[0, 1], M2_I, 1, 1, 0, 1], { x: [1, 1], P: [[2 / 3, 1 / 3], [1 / 3, 2 / 3]] }, "measurement agrees"),
        example([[0, 1], M2_I, 2, 1, 0, 1], { x: [5 / 3, 4 / 3], P: [[2 / 3, 1 / 3], [1 / 3, 2 / 3]] }, "measurement ahead"),
        example([[0, 0], M2_I, 0, 1, 1, 0], { x: [0, 0], P: [[0, 0], [0, 1]] }, "perfect sensor, noisy model"),
      ],
    }),
  ];

  const BAYES_24 = [
    puzzle({
      number: 99, id: "sigma-points", track: "bayes", title: "Van der Merwe Sigma Points",
      goal: "Pick 2n + 1 points and weights that reproduce a 2D Gaussian's mean and covariance.",
      concept: "Instead of linearizing a function, the UKF pushes a few well-chosen points through it. These are the points.",
      functionName: "sigmaPoints", signature: "sigmaPoints(mean, P, alpha, beta, kappa) → { points, wm, wc }",
      starterSource: starter("sigmaPoints", "mean, P, alpha, beta, kappa", "n = 2; λ = α²(n + κ) − n; U = upper Cholesky of (n + λ)P; points: mean, mean ± rows of U."),
      referenceSource: lines(
        "function sigmaPoints(mean, P, alpha, beta, kappa) {",
        "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
        "  var a = scale * P[0][0], b = scale * P[0][1], d = scale * P[1][1];",
        "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
        "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
        "  var points = [{ x: mean.x, y: mean.y }];",
        "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
        "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
        "  var wi = 1 / (2 * scale);",
        "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale + 1 - alpha * alpha + beta, wi, wi, wi, wi] };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH10, "MerweScaledSigmaPoints"),
      scene: { kind: "bayes", view: "sigma-points", handles: [
        { id: "mean", type: "point", label: "mean", value: { x: 0.5, y: -0.3 } },
        { id: "alpha", type: "slider", label: "α", value: 0.7, min: 0.3, max: 1 },
        { id: "kappa", type: "slider", label: "κ", value: 1, min: 0, max: 3 },
      ], args: [{ handle: "mean" }, { fixture: "utP" }, { handle: "alpha" }, 2, { handle: "kappa" }] },
      diagnoses: [
        diagnosis("no-lambda-scale", "The square root must be of (n + λ)·P, not P; the spread of the points depends on α and κ.", lines(
          "function sigmaPoints(mean, P, alpha, beta, kappa) {",
          "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
          "  var a = P[0][0], b = P[0][1], d = P[1][1];",
          "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
          "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
          "  var points = [{ x: mean.x, y: mean.y }];",
          "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
          "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
          "  var wi = 1 / (2 * scale);",
          "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale + 1 - alpha * alpha + beta, wi, wi, wi, wi] };",
          "}"
        )),
        diagnosis("wc0-without-beta", "The covariance weight of the centre point is λ/(n+λ) + 1 − α² + β, not the mean weight.", lines(
          "function sigmaPoints(mean, P, alpha, beta, kappa) {",
          "  var n = 2, lambda = alpha * alpha * (n + kappa) - n, scale = n + lambda;",
          "  var a = scale * P[0][0], b = scale * P[0][1], d = scale * P[1][1];",
          "  var u00 = Math.sqrt(a), u01 = b / u00, u11 = Math.sqrt(d - u01 * u01);",
          "  var rows = [{ x: u00, y: u01 }, { x: 0, y: u11 }];",
          "  var points = [{ x: mean.x, y: mean.y }];",
          "  for (var i = 0; i < n; i += 1) points.push({ x: mean.x + rows[i].x, y: mean.y + rows[i].y });",
          "  for (var j = 0; j < n; j += 1) points.push({ x: mean.x - rows[j].x, y: mean.y - rows[j].y });",
          "  var wi = 1 / (2 * scale);",
          "  return { points: points, wm: [lambda / scale, wi, wi, wi, wi], wc: [lambda / scale, wi, wi, wi, wi] };",
          "}"
        )),
      ],
      hints: ["λ = α²(n + κ) − n with n = 2.", "Upper Cholesky of (n + λ)P: u00 = √a, u01 = b/u00, u11 = √(d − u01²); the two rows are (u00, u01) and (0, u11).", "Points: mean, mean + row₁, mean + row₂, mean − row₁, mean − row₂. Weights: wm₀ = λ/(n+λ), wc₀ = wm₀ + 1 − α² + β, others 1/(2(n+λ))."],
      cases: [
        example([{ x: 0, y: 0 }, M2_I, 1, 0, 1], { points: [{ x: 0, y: 0 }, { x: SQ3, y: 0 }, { x: 0, y: SQ3 }, { x: -SQ3, y: 0 }, { x: 0, y: -SQ3 }], wm: SIGMA_W, wc: SIGMA_W }, "unit covariance"),
        example([{ x: 1, y: 2 }, [[4, 0], [0, 1]], 1, 2, 1], { points: [{ x: 1, y: 2 }, { x: 1 + 2 * SQ3, y: 2 }, { x: 1, y: 2 + SQ3 }, { x: 1 - 2 * SQ3, y: 2 }, { x: 1, y: 2 - SQ3 }], wm: SIGMA_W, wc: [7 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6] }, "β adds to wc₀"),
        example([{ x: 0, y: 0 }, [[1, 0.5], [0.5, 1]], 1, 0, 1], { points: [{ x: 0, y: 0 }, { x: SQ3, y: SQ3 / 2 }, { x: 0, y: 1.5 }, { x: -SQ3, y: -SQ3 / 2 }, { x: 0, y: -1.5 }], wm: SIGMA_W, wc: SIGMA_W }, "correlated"),
        example([{ x: 0, y: 0 }, M2_I, 0.5, 2, 1], { points: [{ x: 0, y: 0 }, { x: Math.sqrt(0.75), y: 0 }, { x: 0, y: Math.sqrt(0.75) }, { x: -Math.sqrt(0.75), y: 0 }, { x: 0, y: -Math.sqrt(0.75) }], wm: [-5 / 3, 2 / 3, 2 / 3, 2 / 3, 2 / 3], wc: [13 / 12, 2 / 3, 2 / 3, 2 / 3, 2 / 3] }, "small α pulls the points in"),
      ],
    }),
    puzzle({
      number: 100, id: "unscented-transform", track: "bayes", title: "Unscented Transform",
      goal: "Recover a mean and covariance from weighted points.",
      concept: "Weighted mean with wm, weighted scatter around that mean with wc. Push the points through any function first and this gives the transformed Gaussian.",
      functionName: "unscentedTransform", signature: "unscentedTransform(points, wm, wc) → { mean, P }",
      starterSource: starter("unscentedTransform", "points, wm, wc", "mean = Σ wm[i]·p[i]; P = Σ wc[i]·(p[i] − mean)(p[i] − mean)ᵀ."),
      referenceSource: lines(
        "function unscentedTransform(points, wm, wc) {",
        "  var mean = { x: 0, y: 0 };",
        "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
        "  var P = [[0, 0], [0, 0]];",
        "  for (var j = 0; j < points.length; j += 1) {",
        "    var dx = points[j].x - mean.x, dy = points[j].y - mean.y;",
        "    P[0][0] += wc[j] * dx * dx; P[0][1] += wc[j] * dx * dy; P[1][0] += wc[j] * dx * dy; P[1][1] += wc[j] * dy * dy;",
        "  }",
        "  return { mean: mean, P: P };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: bookref(CH10, "unscented_transform"),
      scene: { kind: "bayes", view: "unscented", handles: [{ id: "mean", type: "point", label: "mean of the sigma set", value: { x: 0.5, y: 0.2 } }], args: [{ fixture: "utPoints" }, { fixture: "utWm" }, { fixture: "utWc" }] },
      diagnoses: [
        diagnosis("wm-for-covariance", "The covariance uses the wc weights; wm is only for the mean.", lines(
          "function unscentedTransform(points, wm, wc) {",
          "  var mean = { x: 0, y: 0 };",
          "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
          "  var P = [[0, 0], [0, 0]];",
          "  for (var j = 0; j < points.length; j += 1) {",
          "    var dx = points[j].x - mean.x, dy = points[j].y - mean.y;",
          "    P[0][0] += wm[j] * dx * dx; P[0][1] += wm[j] * dx * dy; P[1][0] += wm[j] * dx * dy; P[1][1] += wm[j] * dy * dy;",
          "  }",
          "  return { mean: mean, P: P };",
          "}"
        )),
        diagnosis("covariance-around-first-point", "Deviations are taken from the weighted mean, not from the first point.", lines(
          "function unscentedTransform(points, wm, wc) {",
          "  var mean = { x: 0, y: 0 };",
          "  for (var i = 0; i < points.length; i += 1) { mean.x += wm[i] * points[i].x; mean.y += wm[i] * points[i].y; }",
          "  var P = [[0, 0], [0, 0]];",
          "  for (var j = 0; j < points.length; j += 1) {",
          "    var dx = points[j].x - points[0].x, dy = points[j].y - points[0].y;",
          "    P[0][0] += wc[j] * dx * dx; P[0][1] += wc[j] * dx * dy; P[1][0] += wc[j] * dx * dy; P[1][1] += wc[j] * dy * dy;",
          "  }",
          "  return { mean: mean, P: P };",
          "}"
        )),
      ],
      hints: ["Mean: sum wm[i] times each point.", "Then subtract that mean from every point.", "P accumulates wc[i]·(dx², dx·dy; dx·dy, dy²)."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: SQ3, y: 0 }, { x: 0, y: SQ3 }, { x: -SQ3, y: 0 }, { x: 0, y: -SQ3 }], SIGMA_W, SIGMA_W], { mean: { x: 0, y: 0 }, P: M2_I }, "unit sigma set"),
        example([[{ x: 1, y: 2 }, { x: 1 + 2 * SQ3, y: 2 }, { x: 1, y: 2 + SQ3 }, { x: 1 - 2 * SQ3, y: 2 }, { x: 1, y: 2 - SQ3 }], SIGMA_W, [7 / 3, 1 / 6, 1 / 6, 1 / 6, 1 / 6]], { mean: { x: 1, y: 2 }, P: [[4, 0], [0, 1]] }, "stretched sigma set"),
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }], [0.5, 0.5], [0.5, 0.5]], { mean: { x: 1, y: 0 }, P: [[1, 0], [0, 0]] }, "two points"),
        example([[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], [0.25, 0.5, 0.25], [0.5, 0.5, 0.5]], { mean: { x: 1, y: 1 }, P: [[1, 1], [1, 1]] }, "different weights for mean and covariance"),
      ],
    }),
    puzzle({
      number: 101, id: "unscented-polar", track: "bayes", title: "Unscented Transform of a Radar Return",
      goal: "Push a (range, bearing) Gaussian through polar → cartesian using sigma points.",
      concept: "Linearizing at the mean gives a straight ellipse; the true distribution is banana-shaped, and the sigma points feel that curvature.",
      functionName: "unscentedPolarToCartesian", signature: "unscentedPolarToCartesian(mean, P, alpha, beta, kappa) → { mean, P }",
      starterSource: starter("unscentedPolarToCartesian", "mean, P, alpha, beta, kappa", "mean.x is range, mean.y is bearing. Map each sigma point through (r·cos θ, r·sin θ), then unscentedTransform."),
      referenceSource: lines(
        "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
        "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
        "  var mapped = sigma.points.map(function (p) { return { x: p.x * Math.cos(p.y), y: p.x * Math.sin(p.y) }; });",
        "  return unscentedTransform(mapped, sigma.wm, sigma.wc);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["sigma-points", "unscented-transform"],
      reference: bookref(CH10, "nonlinear transform of a Gaussian (see also 09-Nonlinear-Filtering)"),
      scene: { kind: "bayes", view: "polar", handles: [
        { id: "range", type: "slider", label: "range (m)", value: 2, min: 0.8, max: 2.6 },
        { id: "bearing", type: "slider", label: "bearing (rad)", value: 0.6, min: -1.4, max: 1.4 },
        { id: "sigmaTheta", type: "slider", label: "σ bearing (rad)", value: 0.4, min: 0.1, max: 0.7 },
      ], args: [{ fixture: "polarMean" }, { fixture: "polarP" }, 1, 2, 1] },
      diagnoses: [
        diagnosis("mean-through-function", "The mean was mapped directly; the unscented mean is the weighted average of the mapped points, which sits inside the curve.", lines(
          "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
          "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
          "  var mapped = sigma.points.map(function (p) { return { x: p.x * Math.cos(p.y), y: p.x * Math.sin(p.y) }; });",
          "  var center = { x: mean.x * Math.cos(mean.y), y: mean.x * Math.sin(mean.y) };",
          "  var cov = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < mapped.length; i += 1) {",
          "    var dx = mapped[i].x - center.x, dy = mapped[i].y - center.y;",
          "    cov[0][0] += sigma.wc[i] * dx * dx; cov[0][1] += sigma.wc[i] * dx * dy; cov[1][0] += sigma.wc[i] * dx * dy; cov[1][1] += sigma.wc[i] * dy * dy;",
          "  }",
          "  return { mean: center, P: cov };",
          "}"
        )),
        diagnosis("no-transform", "The sigma points were never pushed through polar → cartesian.", lines(
          "function unscentedPolarToCartesian(mean, P, alpha, beta, kappa) {",
          "  var sigma = sigmaPoints(mean, P, alpha, beta, kappa);",
          "  return unscentedTransform(sigma.points, sigma.wm, sigma.wc);",
          "}"
        )),
      ],
      hints: ["sigmaPoints(mean, P, alpha, beta, kappa) in polar space.", "Map each point: x = r·cos θ, y = r·sin θ.", "unscentedTransform(mapped, wm, wc)."],
      cases: [
        example([{ x: 2, y: 0 }, POLAR_P, 1, 0, 1], { mean: { x: 5 / 3, y: 0 }, P: [[5 / 9, 0], [0, 1]] }, "straight ahead"),
        example([{ x: 1, y: PI / 2 }, POLAR_P, 1, 0, 1], { mean: { x: 0, y: 5 / 6 }, P: [[0.25, 0], [0, 7 / 18]] }, "to the left"),
        example([{ x: 1, y: 0 }, POLAR_P, 1, 0, 1], { mean: { x: 5 / 6, y: 0 }, P: [[7 / 18, 0], [0, 0.25]] }, "closer target"),
      ],
    }),
    puzzle({
      number: 102, id: "rts-smoother-step", track: "bayes", title: "One RTS Smoother Step",
      goal: "Pull a filtered estimate towards the smoothed estimate that follows it.",
      concept: "Smoothing runs backwards: knowing where the state ended up tightens every earlier estimate.",
      functionName: "rtsSmootherStep", signature: "rtsSmootherStep(x, P, xNext, PNext, F, Q) → { x, P }",
      starterSource: starter("rtsSmootherStep", "x, P, xNext, PNext, F, Q", "Pp = F P Fᵀ + Q; K = P Fᵀ Pp⁻¹; x += K (xNext − F x); P += K (PNext − Pp) Kᵀ."),
      referenceSource: lines(
        "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
        "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
        "  var spread = matMul2(matMul2(F, P), ft);",
        "  var pp = [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]];",
        "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
        "  var kt = [[k[0][0], k[1][0]], [k[0][1], k[1][1]]];",
        "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
        "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
        "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
        "  var gain = matMul2(matMul2(k, dp), kt);",
        "  return {",
        "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
        "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
        "  };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["mat-mul-2", "mat-inv-2"],
      reference: bookref(CH13, "rts_smoother"),
      scene: { kind: "bayes", view: "rts", handles: [
        { id: "x", type: "point", label: "filtered k (position, velocity)", value: { x: -2, y: 1 } },
        { id: "xNext", type: "point", label: "smoothed k+1", value: { x: -0.5, y: 0.8 } },
      ], args: [{ fixture: "rtsX" }, { fixture: "rtsP" }, { fixture: "rtsXNext" }, { fixture: "rtsPNext" }, { fixture: "rtsF" }, { fixture: "rtsQ" }] },
      diagnoses: [
        diagnosis("no-process-noise", "The predicted covariance Pp must include Q, exactly as in the forward predict.", lines(
          "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var pp = matMul2(matMul2(F, P), ft);",
          "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
          "  var kt = [[k[0][0], k[1][0]], [k[0][1], k[1][1]]];",
          "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
          "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
          "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
          "  var gain = matMul2(matMul2(k, dp), kt);",
          "  return {",
          "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
          "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
          "  };",
          "}"
        )),
        diagnosis("gain-not-transposed", "The covariance correction is K (PNext − Pp) Kᵀ; the right-hand factor must be transposed.", lines(
          "function rtsSmootherStep(x, P, xNext, PNext, F, Q) {",
          "  var ft = [[F[0][0], F[1][0]], [F[0][1], F[1][1]]];",
          "  var spread = matMul2(matMul2(F, P), ft);",
          "  var pp = [[spread[0][0] + Q[0][0], spread[0][1] + Q[0][1]], [spread[1][0] + Q[1][0], spread[1][1] + Q[1][1]]];",
          "  var k = matMul2(matMul2(P, ft), matInv2(pp));",
          "  var fx = [F[0][0] * x[0] + F[0][1] * x[1], F[1][0] * x[0] + F[1][1] * x[1]];",
          "  var dx = [xNext[0] - fx[0], xNext[1] - fx[1]];",
          "  var dp = [[PNext[0][0] - pp[0][0], PNext[0][1] - pp[0][1]], [PNext[1][0] - pp[1][0], PNext[1][1] - pp[1][1]]];",
          "  var gain = matMul2(matMul2(k, dp), k);",
          "  return {",
          "    x: [x[0] + k[0][0] * dx[0] + k[0][1] * dx[1], x[1] + k[1][0] * dx[0] + k[1][1] * dx[1]],",
          "    P: [[P[0][0] + gain[0][0], P[0][1] + gain[0][1]], [P[1][0] + gain[1][0], P[1][1] + gain[1][1]]],",
          "  };",
          "}"
        )),
      ],
      hints: ["Pp is the forward prediction of P: F P Fᵀ + Q.", "K = P Fᵀ Pp⁻¹ using matMul2 and matInv2.", "x += K (xNext − F x); P += K (PNext − Pp) Kᵀ."],
      cases: [
        example([[0, 1], M2_I, [1, 1], P_STRAIGHT_2, F_UNIT, M2_ZERO], { x: [0, 1], P: M2_I }, "next state agrees"),
        example([[0, 1], M2_I, [2, 1], P_STRAIGHT_2, F_UNIT, M2_ZERO], { x: [1, 1], P: M2_I }, "next state further ahead"),
        example([[0, 0], M2_I, [0, 0], M2_I, M2_I, M2_I], { x: [0, 0], P: [[0.75, 0], [0, 0.75]] }, "tighter future shrinks P"),
        example([[0, 0], M2_I, [0, 0], M2_I, F_UNIT, M2_ZERO], { x: [0, 0], P: [[2, -1], [-1, 1]] }, "correlated correction"),
      ],
    }),
  ];
```

Then change the `PUZZLES` line to end with `ESTIMATION_21, BAYES_22, BAYES_23, BAYES_24));`.

- [ ] **Step 5: Add the bayes scene and fix the gyro label**

In `puzzle-scenes.js`:

1. In `describe`, insert directly after the `if (Number.isFinite(value.v) && Number.isFinite(value.omega)) return …;` line:

```js
      if (Number.isFinite(value.mean) && Number.isFinite(value.variance)) return "mean " + fmt(value.mean) + " · σ " + fmt(Math.sqrt(Math.max(0, value.variance)));
      if (Number.isFinite(value.x) && Number.isFinite(value.dx)) return "x " + fmt(value.x) + " · dx " + fmt(value.dx);
      if (Array.isArray(value.x) && Array.isArray(value.P)) return "pos " + fmt(value.x[0]) + " vel " + fmt(value.x[1]) + " · σpos " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σvel " + fmt(Math.sqrt(Math.max(0, value.P[1][1])));
      if (Array.isArray(value.F) && Array.isArray(value.Q)) return "F " + describe(value.F) + " · Q " + describe(value.Q);
      if (Array.isArray(value.points) && Array.isArray(value.wm)) return value.points.length + " sigma points · wm₀ " + fmt(value.wm[0]) + " · wc₀ " + fmt(Array.isArray(value.wc) ? value.wc[0] : NaN);
      if (isPoint(value.mean) && Array.isArray(value.P)) return "mean " + fmtPoint(value.mean) + " · σx " + fmt(Math.sqrt(Math.max(0, value.P[0][0]))) + " σy " + fmt(Math.sqrt(Math.max(0, value.P[1][1])));
```

2. In the se3 `gyro` branch, replace `" rad/s × " + fmt(context.values.dt) + " s"` with `" rad/s × 0.80 s"`.

3. Insert directly before `const SCENES = {`:

```js
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
```

4. Add to the `SCENES` literal after `"estimation": estimationScene,`:

```js
    "bayes": bayesScene,
```

- [ ] **Step 6: Show the second link in the lab**

In `puzzle-lab.html`, insert directly after the `referenceLink` anchor:

```html
                <a id="readingLink" class="concept-link" href="#" target="_blank" rel="noopener" hidden>Also read ↗</a>
```

In `puzzle-lab.js`, add `"readingLink",` after `"referenceLink",` in the `ids` list:

```js
    "puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink", "referenceLink", "readingLink", "curriculumHeading", "canvasHost", "selectorStrip", "runState",
```

and insert directly after the `referenceLink` block (after `      dom.referenceLink.hidden = true;\n    }`):

```js
    if (puzzle.reading) {
      dom.readingLink.href = puzzle.reading.url;
      dom.readingLink.textContent = "Also read: " + puzzle.reading.label + " ↗";
      dom.readingLink.hidden = false;
    } else {
      dom.readingLink.hidden = true;
    }
```

- [ ] **Step 7: Update the README**

Insert directly after the line `21. Estimation: ekfPredict, ekfUpdatePosition, particleWeights, resampleLowVariance, ekfLocalizeStep.`:

```markdown

Track 6 (Bayesian Filters) adds puzzles 88 to 102, unlocked by the EKF localization step, and follows *Kalman and Bayesian Filters in Python* (`references/Kalman-and-Bayesian-Filters-in-Python-master`) chapter by chapter:

22. Scalar filters: ghFilterStep, discretePredict, discreteUpdate, gaussianMultiply, kalman1dStep.
23. Multivariate Kalman: matMul2, matInv2, constantVelocityModel, kfPredict, kfUpdate, kalmanTrackStep (the dog tracker).
24. Nonlinear and smoothing: sigmaPoints, unscentedTransform, unscentedPolarToCartesian, rtsSmootherStep.

Track 5's covariance, EKF, and particle puzzles carry an "Also read" link into the book's matching chapter.
```

- [ ] **Step 8: Run every check**

Run: `node p5sim/tf2_walkthrough/tests.js` and `node p5sim/tf2_walkthrough/puzzle-tests.js`

Expected: `21/21 tests passed` and `68/68 puzzle tests passed`.

Then serve `p5sim` and confirm the lab shows "102 geometry builds" and six tracks, the "Also read" link appears on an EKF puzzle, every Track 6 scene renders, and there are no console errors.

- [ ] **Step 9: Commit**

```bash
git add p5sim/tf2_walkthrough/puzzles.js p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js p5sim/tf2_walkthrough/puzzle-lab.html p5sim/tf2_walkthrough/puzzle-lab.js p5sim/tf2_walkthrough/README.md
git commit -m "feat: add Track 6 Bayesian filters from the g-h filter to RTS smoothing, with book links into Track 5

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Q9TRWYSWSdjjCRLxu148zr"
```

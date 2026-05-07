(function (global) {
  "use strict";

  const TAU = Math.PI * 2;

  const Config = {
    minPointsForFitting: 10,
    linregDistanceThreshold: 0.05,
    linregMinInlierRatio: 0.25,
    linregMaxIterations: 10,
    linregMaxAllowedGap: 3.0,
    linregMinLineLength: 0.5,
    rotCoarsePivotDistance: 3.0,
    rotCoarseSearchRangeDeg: 20.0,
    rotCoarseSearchStepDeg: 5.0,
    rotCoarseFilterThreshold: 0.5,
    rotFinePivotDistance: 3.0,
    rotFineSearchRangeDeg: 10.0,
    rotFineSearchStepDeg: 0.5,
    rotFineFilterThreshold: 0.3,
    accumulationWindowSec: 4.0,
    accumulationMaxPoints: 50000,
    planeCoeffAlpha: 0.3,
    headingAlpha: 0.1,
    lateralAlpha: 0.05,
    dualGain: 0.4,
    singleGain: 0.1,
    expectedRackDistance: 1.6,
    consensusThresholdDeg: 10.0,
    maxBeamsForConsensus: 2,
  };

  const DemoIds = [
    "pipeline",
    "synthetic-input",
    "accumulation",
    "rotation-filter",
    "line-fit",
    "coefficient-smoothing",
    "heading-consensus",
    "centerline",
    "correction",
    "tf-logic",
    "failure-cases",
  ];

  const DemoLabels = {
    "pipeline": "Full pipeline",
    "synthetic-input": "Synthetic input",
    "accumulation": "Accumulation",
    "rotation-filter": "Rotation filter",
    "line-fit": "Line fit",
    "coefficient-smoothing": "Coefficient smoothing",
    "heading-consensus": "Heading consensus",
    "centerline": "Centerline",
    "correction": "Correction",
    "tf-logic": "TF logic",
    "failure-cases": "Failure cases",
  };

  function v(x, y) {
    return { x, y };
  }

  function add(a, b) {
    return v(a.x + b.x, a.y + b.y);
  }

  function sub(a, b) {
    return v(a.x - b.x, a.y - b.y);
  }

  function mul(a, s) {
    return v(a.x * s, a.y * s);
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function len(a) {
    return Math.hypot(a.x, a.y);
  }

  function normalize(a) {
    const n = len(a);
    return n < 1e-9 ? v(0, 0) : mul(a, 1 / n);
  }

  function headingVector(angle) {
    return v(Math.cos(angle), Math.sin(angle));
  }

  function normalVector(angle) {
    return v(-Math.sin(angle), Math.cos(angle));
  }

  function normalizeAngle(angle) {
    return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  }

  function resolveHeadingToReference(heading, reference) {
    if (reference === null || reference === undefined) {
      return heading;
    }
    const alt = normalizeAngle(heading + Math.PI);
    const diff = Math.abs(normalizeAngle(heading - reference));
    const altDiff = Math.abs(normalizeAngle(alt - reference));
    return altDiff < diff ? alt : heading;
  }

  function lerpAngle(previous, next, alpha) {
    const resolved = resolveHeadingToReference(next, previous);
    return normalizeAngle(previous + alpha * normalizeAngle(resolved - previous));
  }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function radToDeg(rad) {
    return rad * 180 / Math.PI;
  }

  function makeRng(seed) {
    let state = seed >>> 0;
    return function rand() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randRange(rng, min, max) {
    return min + (max - min) * rng();
  }

  function randNormal(rng, mean = 0, std = 1) {
    const u1 = Math.max(1e-9, rng());
    const u2 = Math.max(1e-9, rng());
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
    return mean + z * std;
  }

  function meanPoint(points) {
    if (!points.length) return v(0, 0);
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return v(sx / points.length, sy / points.length);
  }

  function generateWallCloud(heading, halfWidth, side, alongCenter, rng, nFace = 220, nInterior = 80) {
    const direction = headingVector(heading);
    const normal = normalVector(heading);
    const sideSign = side === "left" ? 1 : -1;
    const base = add(mul(direction, alongCenter), mul(normal, sideSign * halfWidth));
    const inward = mul(normal, -sideSign);
    const points = [];

    for (let i = 0; i < nFace; i += 1) {
      const t = randRange(rng, -1.6, 1.6);
      const noise = v(randNormal(rng, 0, 0.018), randNormal(rng, 0, 0.018));
      points.push({ ...add(add(base, mul(direction, t)), noise), kind: "face", side });
    }

    for (let i = 0; i < nInterior; i += 1) {
      const t = randRange(rng, -1.6, 1.6);
      const depth = randRange(rng, 0.04, 0.25);
      const noise = v(randNormal(rng, 0, 0.025), randNormal(rng, 0, 0.025));
      points.push({ ...add(add(add(base, mul(direction, t)), mul(inward, depth)), noise), kind: "interior", side });
    }

    return points;
  }

  function generateSyntheticFrames(frameCount = 80, seed = 42, headingDeg = 33.5, halfWidth = 1.6) {
    const rng = makeRng(seed);
    const frames = [];
    const baseHeading = degToRad(headingDeg);
    const direction = headingVector(baseHeading);
    const normal = normalVector(baseHeading);

    for (let i = 0; i < frameCount; i += 1) {
      const heading = baseHeading + degToRad(0.4) * Math.sin(i * 0.09);
      const along = 0.16 * i;
      const lateral = 0.16 * Math.sin(i * 0.13);
      const xy = add(mul(direction, along), mul(normal, lateral));
      const fcuYaw = heading + degToRad(4.0) * Math.sin(i * 0.21);
      frames.push({
        frameIndex: i,
        stamp: i * 0.1,
        fcuPose: { x: xy.x, y: xy.y, yaw: fcuYaw },
        trueHeading: heading,
        tracks: [
          { trackId: 1, side: "left", points: generateWallCloud(heading, halfWidth, "left", along, rng) },
          { trackId: 2, side: "right", points: generateWallCloud(heading, halfWidth, "right", along, rng) },
        ],
      });
    }

    return frames;
  }

  function rotationSearchFilter(points, estimatedAngle, pivotDistance, searchRangeDeg, searchStepDeg, filterThreshold, side) {
    if (!points.length) {
      return { points: [], bestAngle: estimatedAngle, debug: {} };
    }
    const isLeft = side === "left";
    const avg = meanPoint(points);
    const pivotSign = isLeft ? 1 : -1;
    const pivot = add(avg, mul(v(Math.sin(estimatedAngle), -Math.cos(estimatedAngle)), pivotSign * pivotDistance));
    const angles = [];
    const metrics = [];
    const rotatedValues = [];
    const start = estimatedAngle - degToRad(searchRangeDeg);
    const step = degToRad(searchStepDeg);
    const count = Math.floor((2 * searchRangeDeg) / searchStepDeg) + 1;

    let bestIndex = 0;
    let bestMetric = isLeft ? -Infinity : Infinity;

    for (let k = 0; k < count; k += 1) {
      const angle = start + k * step;
      const values = [];
      for (const point of points) {
        const rel = sub(point, pivot);
        values.push(Math.cos(angle) * rel.y - Math.sin(angle) * rel.x);
      }
      const metric = isLeft ? Math.min(...values) : Math.max(...values);
      angles.push(angle);
      metrics.push(metric);
      rotatedValues.push(values);
      if ((isLeft && metric > bestMetric) || (!isLeft && metric < bestMetric)) {
        bestMetric = metric;
        bestIndex = k;
      }
    }

    const bestValues = rotatedValues[bestIndex];
    const kept = [];
    for (let i = 0; i < points.length; i += 1) {
      const keep = isLeft
        ? bestValues[i] < bestMetric + filterThreshold
        : bestValues[i] > bestMetric - filterThreshold;
      if (keep) kept.push(points[i]);
    }

    return {
      points: kept,
      bestAngle: angles[bestIndex],
      debug: { pivot, angles, metrics, rotatedValues, bestIndex, bestMetric },
    };
  }

  function applyTwoStageRotationFilter(points, estimatedAngle, side, cfg = Config) {
    const coarse = rotationSearchFilter(
      points,
      estimatedAngle,
      cfg.rotCoarsePivotDistance,
      cfg.rotCoarseSearchRangeDeg,
      cfg.rotCoarseSearchStepDeg,
      cfg.rotCoarseFilterThreshold,
      side,
    );
    if (!coarse.points.length) return { points: [], debug: { coarse, fine: null } };
    const fine = rotationSearchFilter(
      coarse.points,
      coarse.bestAngle,
      cfg.rotFinePivotDistance,
      cfg.rotFineSearchRangeDeg,
      cfg.rotFineSearchStepDeg,
      cfg.rotFineFilterThreshold,
      side,
    );
    return { points: fine.points, debug: { coarse, fine } };
  }

  function fitLine2D(points) {
    if (!points.length) return null;
    const avg = meanPoint(points);
    let varX = 0;
    let varY = 0;
    let covXY = 0;
    for (const p of points) {
      const dx = p.x - avg.x;
      const dy = p.y - avg.y;
      varX += dx * dx;
      varY += dy * dy;
      covXY += dx * dy;
    }
    if (varX >= varY) {
      if (Math.abs(varX) < 1e-9) return { a: 1, b: 0, c: -avg.x };
      const slope = covXY / varX;
      const intercept = avg.y - slope * avg.x;
      const n = Math.hypot(slope, 1);
      return { a: slope / n, b: -1 / n, c: intercept / n };
    }
    if (Math.abs(varY) < 1e-9) return { a: 0, b: 1, c: -avg.y };
    const slope = covXY / varY;
    const intercept = avg.x - slope * avg.y;
    const n = Math.hypot(1, slope);
    return { a: 1 / n, b: -slope / n, c: -intercept / n };
  }

  function lineDistance(point, line) {
    return Math.abs(line.a * point.x + line.b * point.y + line.c);
  }

  function headingFromLine(line) {
    let dx = -line.b;
    let dy = line.a;
    const n = Math.hypot(dx, dy);
    if (n < 1e-9) return 0;
    dx /= n;
    dy /= n;
    if (dx < 0) {
      dx *= -1;
      dy *= -1;
    }
    return Math.atan2(dy, dx);
  }

  function recursiveLineFit(points, cfg = Config) {
    if (points.length < cfg.minPointsForFitting) {
      return { valid: false, line: null, inliers: [], iterations: [] };
    }
    let active = points.map((_, index) => index);
    const iterations = [];
    let line = null;
    for (let iter = 0; iter < cfg.linregMaxIterations; iter += 1) {
      line = fitLine2D(active.map(index => points[index]));
      if (!line) break;
      const next = [];
      for (let i = 0; i < points.length; i += 1) {
        if (lineDistance(points[i], line) <= cfg.linregDistanceThreshold) next.push(i);
      }
      iterations.push({ line, inliers: next.slice() });
      if (next.length === active.length || next.length < cfg.minPointsForFitting) {
        active = next;
        break;
      }
      active = next;
    }
    const ratio = active.length / points.length;
    const valid = Boolean(line) && active.length >= cfg.minPointsForFitting && ratio >= cfg.linregMinInlierRatio;
    return {
      valid,
      line,
      inliers: active,
      inlierRatio: ratio,
      heading: line ? headingFromLine(line) : 0,
      iterations,
    };
  }

  function smoothLine(previous, line, alpha) {
    if (!previous) return { ...line };
    let next = { ...line };
    const dotNormals = previous.a * next.a + previous.b * next.b;
    if (dotNormals < 0) {
      next = { a: -next.a, b: -next.b, c: -next.c };
    }
    const mixed = {
      a: alpha * next.a + (1 - alpha) * previous.a,
      b: alpha * next.b + (1 - alpha) * previous.b,
      c: alpha * next.c + (1 - alpha) * previous.c,
    };
    const n = Math.hypot(mixed.a, mixed.b);
    return n < 1e-9 ? mixed : { a: mixed.a / n, b: mixed.b / n, c: mixed.c / n };
  }

  function alignLineToHeading(line, heading) {
    const expected = normalVector(heading);
    let out = { ...line };
    if (out.a * expected.x + out.b * expected.y < 0) {
      out = { a: -out.a, b: -out.b, c: -out.c };
    }
    const n = Math.hypot(out.a, out.b);
    return n < 1e-9 ? out : { a: out.a / n, b: out.b / n, c: out.c / n };
  }

  function updateAccumulator(state, track, frame, cfg = Config) {
    if (!state.accumulators[track.trackId]) state.accumulators[track.trackId] = [];
    const entries = state.accumulators[track.trackId];
    entries.push({ stamp: frame.stamp, points: track.points.slice() });
    const cutoff = frame.stamp - cfg.accumulationWindowSec;
    state.accumulators[track.trackId] = entries.filter(entry => entry.stamp >= cutoff);
    const combined = [];
    for (const entry of state.accumulators[track.trackId]) {
      combined.push(...entry.points);
    }
    return combined.slice(Math.max(0, combined.length - cfg.accumulationMaxPoints));
  }

  function consensusHeading(beams, previousHeading) {
    if (beams.length === 1) return resolveHeadingToReference(beams[0].heading, previousHeading);
    const reference = previousHeading ?? beams[0].heading;
    let sx = 0;
    let sy = 0;
    for (const beam of beams) {
      const heading = resolveHeadingToReference(beam.heading, reference);
      const weight = Math.max(1, beam.inlierCount);
      sx += Math.cos(heading) * weight;
      sy += Math.sin(heading) * weight;
    }
    return Math.atan2(sy, sx);
  }

  function selectConsensus(beams, previousHeading, cfg = Config) {
    const sorted = beams.slice().sort((a, b) => b.inlierCount - a.inlierCount).slice(0, cfg.maxBeamsForConsensus);
    if (sorted.length <= 1) return sorted;
    const mean = consensusHeading(sorted, previousHeading);
    const threshold = degToRad(cfg.consensusThresholdDeg);
    return sorted.filter(beam => Math.abs(normalizeAngle(resolveHeadingToReference(beam.heading, mean) - mean)) <= threshold);
  }

  function computeCenterline(beams, heading, fcuPose, cfg = Config) {
    const left = beams.find(beam => beam.side === "left");
    const right = beams.find(beam => beam.side === "right");
    if (left && right) {
      const l = alignLineToHeading(left.line, heading);
      let r = alignLineToHeading(right.line, heading);
      if (l.a * r.a + l.b * r.b < 0) r = { a: -r.a, b: -r.b, c: -r.c };
      const center = { a: (l.a + r.a) * 0.5, b: (l.b + r.b) * 0.5, c: (l.c + r.c) * 0.5 };
      const n = Math.hypot(center.a, center.b);
      return { line: { a: center.a / n, b: center.b / n, c: center.c / n }, dual: true };
    }
    const single = beams[0];
    const aligned = alignLineToHeading(single.line, heading);
    const signed = aligned.a * fcuPose.x + aligned.b * fcuPose.y + aligned.c;
    const sideSign = signed >= 0 ? 1 : -1;
    return { line: { ...aligned, c: aligned.c - sideSign * cfg.expectedRackDistance }, dual: false };
  }

  function updateAisleState(state, centerline, heading, dual, cfg = Config) {
    const gain = dual ? cfg.dualGain : cfg.singleGain;
    if (!state.aisleInitialized) {
      state.aisleInitialized = true;
      state.aisleHeading = heading;
      state.aisleC = centerline.c;
    } else {
      state.aisleHeading = lerpAngle(state.aisleHeading, heading, gain);
      state.aisleC = gain * centerline.c + (1 - gain) * state.aisleC;
    }
    return { a: -Math.sin(state.aisleHeading), b: Math.cos(state.aisleHeading), c: state.aisleC };
  }

  function correctedPoseFromCenterline(state, fcuPose, centerline, cfg = Config) {
    const rawDist = centerline.a * fcuPose.x + centerline.b * fcuPose.y + centerline.c;
    if (state.smoothedDist === null || state.smoothedDist === undefined) {
      state.smoothedDist = rawDist;
    } else {
      state.smoothedDist = cfg.lateralAlpha * rawDist + (1 - cfg.lateralAlpha) * state.smoothedDist;
    }
    return {
      x: fcuPose.x - state.smoothedDist * centerline.a,
      y: fcuPose.y - state.smoothedDist * centerline.b,
      yaw: state.aisleHeading,
      rawDist,
      smoothedDist: state.smoothedDist,
    };
  }

  function makePipelineState() {
    return {
      accumulators: {},
      smoothedLines: {},
      lastHeading: null,
      aisleInitialized: false,
      aisleHeading: 0,
      aisleC: 0,
      smoothedDist: null,
    };
  }

  function runPipeline(frames, cfg = Config) {
    const state = makePipelineState();
    const results = [];
    for (const frame of frames) {
      const stageResults = [];
      const beams = [];
      for (const track of frame.tracks) {
        const accumulated = updateAccumulator(state, track, frame, cfg);
        let filtered = null;
        let fitPoints = accumulated;
        if (cfg.useRotationFilter !== false && state.lastHeading !== null) {
          filtered = applyTwoStageRotationFilter(accumulated, state.lastHeading, track.side, cfg).points;
          if (filtered.length >= cfg.minPointsForFitting) fitPoints = filtered;
        }
        const fit = recursiveLineFit(fitPoints, cfg);
        if (fit.valid) {
          const previous = state.smoothedLines[track.trackId];
          const smoothedLine = smoothLine(previous, fit.line, cfg.planeCoeffAlpha);
          state.smoothedLines[track.trackId] = smoothedLine;
          beams.push({
            trackId: track.trackId,
            side: track.side,
            line: smoothedLine,
            heading: headingFromLine(smoothedLine),
            inlierCount: fit.inliers.length,
          });
        }
        stageResults.push({ track, accumulated, filtered, fitPoints, fit });
      }

      const accepted = selectConsensus(beams, state.lastHeading, cfg);
      const result = { frame, stageResults, beams, accepted, valid: false };
      if (accepted.length) {
        const heading = consensusHeading(accepted, state.lastHeading);
        const center = computeCenterline(accepted, heading, frame.fcuPose, cfg);
        const centerline = updateAisleState(state, center.line, heading, center.dual, cfg);
        const correctedPose = correctedPoseFromCenterline(state, frame.fcuPose, centerline, cfg);
        state.lastHeading = state.aisleHeading;
        Object.assign(result, {
          valid: true,
          heading: state.aisleHeading,
          centerline,
          correctedPose,
          dual: center.dual,
        });
      }
      results.push(result);
    }
    return results;
  }

  function buildDemoData(frameCount = 90, seed = 42) {
    const frames = generateSyntheticFrames(frameCount, seed);
    const results = runPipeline(frames);
    return { frames, results, config: Config, headingDeg: 33.5, halfWidth: 1.6 };
  }

  global.VisionPipelineCore = {
    Config,
    DemoIds,
    DemoLabels,
    add,
    alignLineToHeading,
    applyTwoStageRotationFilter,
    buildDemoData,
    computeCenterline,
    consensusHeading,
    correctedPoseFromCenterline,
    degToRad,
    dot,
    fitLine2D,
    generateSyntheticFrames,
    generateWallCloud,
    headingFromLine,
    headingVector,
    len,
    lerpAngle,
    lineDistance,
    makePipelineState,
    makeRng,
    meanPoint,
    mul,
    normalVector,
    normalize,
    normalizeAngle,
    radToDeg,
    recursiveLineFit,
    resolveHeadingToReference,
    rotationSearchFilter,
    runPipeline,
    selectConsensus,
    smoothLine,
    sub,
    updateAccumulator,
    updateAisleState,
    v,
  };
}(globalThis));

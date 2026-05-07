(function (global) {
  "use strict";

  const C = global.VisionPipelineCore;
  const R = global.VisionPipelineRenderer;

  const Colors = {
    bg: [8, 10, 16],
    grid: [42, 51, 72],
    faceLeft: [83, 198, 255],
    faceRight: [255, 199, 87],
    interior: [111, 126, 153],
    accumulated: [92, 235, 181],
    filtered: [248, 113, 113],
    fit: [255, 255, 255],
    rawLine: [255, 142, 88],
    smoothLine: [87, 220, 255],
    centerline: [163, 230, 53],
    fcu: [255, 199, 87],
    corrected: [82, 255, 168],
    rejected: [248, 113, 113],
    accepted: [82, 255, 168],
    muted: [135, 148, 172],
  };

  function frameIndex(simFrame, length, speed = 3) {
    return Math.floor(simFrame / speed) % length;
  }

  function flattenFramePoints(frames) {
    const points = [];
    for (const frame of frames) {
      points.push(frame.fcuPose);
      for (const track of frame.tracks) {
        points.push(...track.points);
      }
    }
    return points;
  }

  function worldRect(p) {
    const sidePanelW = Math.min(340, Math.max(280, p.width * 0.3));
    return {
      world: { x: 18, y: 58, w: p.width - sidePanelW - 44, h: p.height - 78 },
      panel: { x: p.width - sidePanelW - 14, y: 58, w: sidePanelW, h: p.height - 78 },
    };
  }

  function makeWorld(p, points, pad = 1.0) {
    const rects = worldRect(p);
    return new R.WorldRenderer(p, R.computeBounds(points, pad), rects.world);
  }

  function drawTitle(p, title, subtitle) {
    p.push();
    p.noStroke();
    p.fill(232, 238, 248);
    p.textStyle(p.BOLD);
    p.textSize(18);
    p.text(title, 18, 28);
    p.textStyle(p.NORMAL);
    p.fill(149, 163, 184);
    p.textSize(12);
    p.text(subtitle, 18, 47);
    p.pop();
  }

  function drawAisleReference(world, heading, halfWidth, center = C.v(0, 0), length = 10) {
    const direction = C.headingVector(heading);
    const normal = C.normalVector(heading);
    const a = C.sub(center, C.mul(direction, length));
    const b = C.add(center, C.mul(direction, length));
    world.drawWorldSegment(C.add(a, C.mul(normal, halfWidth)), C.add(b, C.mul(normal, halfWidth)), [83, 198, 255, 120], 2);
    world.drawWorldSegment(C.sub(a, C.mul(normal, halfWidth)), C.sub(b, C.mul(normal, halfWidth)), [255, 199, 87, 120], 2);
    world.drawWorldSegment(a, b, Colors.centerline, 3);
  }

  function drawTrackPoints(world, track, size = 3) {
    const face = track.points.filter(point => point.kind === "face");
    const interior = track.points.filter(point => point.kind !== "face");
    world.drawPoints(interior, Colors.interior, size, 90);
    world.drawPoints(face, track.side === "left" ? Colors.faceLeft : Colors.faceRight, size + 1, 190);
  }

  function drawLineIfValid(world, line, color, weight = 2) {
    if (line) world.drawLine(line, color, weight);
  }

  function panel(p, title, lines) {
    const rects = worldRect(p);
    R.drawPanel(p, rects.panel.x, rects.panel.y, rects.panel.w, rects.panel.h, title);
    R.drawTextBlock(p, lines, rects.panel.x + 14, rects.panel.y + 52, 18);
    return rects.panel;
  }

  function lineFromRotationDebug(debug, index) {
    const angle = debug.angles[index];
    const metric = debug.metrics[index];
    const pivot = debug.pivot;
    return {
      a: -Math.sin(angle),
      b: Math.cos(angle),
      c: Math.sin(angle) * pivot.x - Math.cos(angle) * pivot.y - metric,
    };
  }

  function candidateFilter(points, debug, index, side, threshold) {
    const values = debug.rotatedValues[index];
    const metric = debug.metrics[index];
    const isLeft = side === "left";
    const kept = [];
    const rejected = [];
    for (let i = 0; i < points.length; i += 1) {
      const keep = isLeft ? values[i] < metric + threshold : values[i] > metric - threshold;
      (keep ? kept : rejected).push(points[i]);
    }
    return { kept, rejected };
  }

  function nearestValidResult(results, index) {
    for (let i = index; i >= 0; i -= 1) {
      if (results[i] && results[i].valid) return results[i];
    }
    return results.find(result => result.valid);
  }

  function collectResultPoints(result) {
    const points = [result.frame.fcuPose];
    for (const stage of result.stageResults) {
      points.push(...stage.track.points);
      if (stage.accumulated) points.push(...stage.accumulated.slice(-120));
    }
    if (result.correctedPose) points.push(result.correctedPose);
    return points;
  }

  function buildRotationDemo(data) {
    const frame = data.frames[20];
    const track = frame.tracks[1];
    const coarse = C.rotationSearchFilter(
      track.points,
      frame.trueHeading,
      C.Config.rotCoarsePivotDistance,
      C.Config.rotCoarseSearchRangeDeg,
      C.Config.rotCoarseSearchStepDeg,
      C.Config.rotCoarseFilterThreshold,
      track.side,
    );
    return { frame, track, coarse };
  }

  function buildLineFitDemo(data) {
    const frame = data.frames[24];
    const track = frame.tracks[0];
    const fit = C.recursiveLineFit(track.points, C.Config);
    return { frame, track, fit };
  }

  function buildSmoothingDemo(data) {
    let previous = null;
    const history = [];
    for (const frame of data.frames) {
      const track = frame.tracks[0];
      const fit = C.recursiveLineFit(track.points, C.Config);
      if (!fit.valid) continue;
      const raw = fit.line;
      const smooth = C.smoothLine(previous, raw, C.Config.planeCoeffAlpha);
      previous = smooth;
      history.push({
        frame,
        raw,
        smooth,
        rawHeading: C.headingFromLine(raw),
        smoothHeading: C.headingFromLine(smooth),
      });
    }
    return history;
  }

  function buildFailureCases(data) {
    const normal = nearestValidResult(data.results, 20);
    const missingBeam = nearestValidResult(data.results, 35);
    const headingOutlier = nearestValidResult(data.results, 50);
    const trackSwitch = nearestValidResult(data.results, 65);
    return [
      {
        id: "normal",
        title: "Normal case",
        text: "Both rack beams agree. Consensus uses two beams and the centerline is stable.",
        result: normal,
      },
      {
        id: "missing-beam",
        title: "Missing beam",
        text: "Only one reliable horizontal beam is available. The centerline falls back to expected rack distance.",
        result: missingBeam,
        hideRight: true,
      },
      {
        id: "heading-outlier",
        title: "Heading outlier",
        text: "One beam heading is outside the consensus gate. It should not steer the aisle estimate.",
        result: headingOutlier,
        outlier: true,
      },
      {
        id: "track-switch",
        title: "Track id switch",
        text: "If a track id changes, accumulated geometry should reset instead of mixing two physical beams.",
        result: trackSwitch,
        switchTrack: true,
      },
    ];
  }

  function createDemoState() {
    const data = C.buildDemoData(96, 73);
    const allPoints = flattenFramePoints(data.frames);
    return {
      data,
      boundsPoints: allPoints,
      rotation: buildRotationDemo(data),
      lineFit: buildLineFitDemo(data),
      smoothing: buildSmoothingDemo(data),
      failures: buildFailureCases(data),
    };
  }

  function drawPipeline(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.results.length, 3);
    const result = nearestValidResult(state.data.results, index);
    const world = makeWorld(p, collectResultPoints(result), 1.0);
    drawTitle(p, "Full pipeline", "Tracks -> accumulation -> filtering -> line fit -> centerline -> corrected pose");
    world.drawGrid();
    drawAisleReference(world, result.heading, state.data.halfWidth, result.frame.fcuPose, 4.8);
    for (const stage of result.stageResults) {
      drawTrackPoints(world, stage.track, 2.5);
      if (stage.filtered) world.drawPoints(stage.filtered, Colors.filtered, 3, 150);
      if (stage.fit.valid) drawLineIfValid(world, stage.fit.line, Colors.fit, 2);
    }
    drawLineIfValid(world, result.centerline, Colors.centerline, 3);
    world.drawPose(result.frame.fcuPose, Colors.fcu, "FCU");
    world.drawPose(result.correctedPose, Colors.corrected, "corrected");
    panel(p, "Pipeline state", [
      `frame: ${result.frame.frameIndex}`,
      `accepted beams: ${result.accepted.length}`,
      `mode: ${result.dual ? "dual centerline" : "single-beam fallback"}`,
      `heading EMA: ${C.radToDeg(result.heading).toFixed(2)} deg`,
      `raw lateral error: ${result.correctedPose.rawDist.toFixed(3)} m`,
      `smoothed correction: ${result.correctedPose.smoothedDist.toFixed(3)} m`,
      "",
      "The corrected pose shifts laterally toward",
      "the aisle centerline and uses aisle yaw",
      "as its world-frame heading.",
    ]);
  }

  function drawSyntheticInput(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.frames.length, 4);
    const frame = state.data.frames[index];
    const world = makeWorld(p, flattenFramePoints([frame]), 0.9);
    drawTitle(p, "Synthetic input", "The browser version starts after image/depth work: per-track pointclouds already exist");
    world.drawGrid();
    drawAisleReference(world, frame.trueHeading, state.data.halfWidth, frame.fcuPose, 3.8);
    for (const track of frame.tracks) drawTrackPoints(world, track, 3);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    const panelRect = panel(p, "Input model", [
      `frame: ${frame.frameIndex}`,
      `tracks: ${frame.tracks.length}`,
      `true aisle heading: ${C.radToDeg(frame.trueHeading).toFixed(2)} deg`,
      `FCU yaw: ${C.radToDeg(frame.fcuPose.yaw).toFixed(2)} deg`,
      "",
      "Blue/yellow points are rack faces.",
      "Muted points are rack interior/noise.",
      "The C++ node gets these points from",
      "segmentation masks + registered depth.",
    ]);
    R.drawLegend(p, [
      { label: "left rack face", color: Colors.faceLeft },
      { label: "right rack face", color: Colors.faceRight },
      { label: "interior / noisy depth", color: Colors.interior },
    ], panelRect.x + 16, panelRect.y + 230);
  }

  function drawAccumulation(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.results.length, 3);
    const result = nearestValidResult(state.data.results, index);
    const stage = result.stageResults[0];
    const points = [result.frame.fcuPose, ...stage.accumulated, ...stage.track.points];
    const world = makeWorld(p, points, 0.9);
    drawTitle(p, "Accumulation", "Stable track_id lets each physical beam build a larger point set over time");
    world.drawGrid();
    world.drawPoints(stage.accumulated, Colors.accumulated, 2.2, 70);
    drawTrackPoints(world, stage.track, 4);
    if (stage.fit.valid) drawLineIfValid(world, stage.fit.line, Colors.fit, 3);
    world.drawPose(result.frame.fcuPose, Colors.fcu, "FCU");
    panel(p, "Accumulator", [
      `track id: ${stage.track.trackId}`,
      `current frame points: ${stage.track.points.length}`,
      `accumulated points: ${stage.accumulated.length}`,
      `window: ${C.Config.accumulationWindowSec.toFixed(1)} s`,
      "",
      "The current frame is sharp/bright.",
      "History is dim green.",
      "Line fitting uses the accumulated set",
      "unless a later filter provides better",
      "rack-face points.",
    ]);
  }

  function drawRotationFilter(p, state, simFrame) {
    const demo = state.rotation;
    const debug = demo.coarse.debug;
    const index = frameIndex(simFrame, debug.angles.length, 5);
    const candidate = candidateFilter(
      demo.track.points,
      debug,
      index,
      demo.track.side,
      C.Config.rotCoarseFilterThreshold,
    );
    const world = makeWorld(p, [...demo.track.points, debug.pivot], 0.8);
    drawTitle(p, "Rotation filter", "Sweep candidate angles, rotate around a pivot, keep the outer rack face band");
    world.drawGrid();
    world.drawPoints(candidate.rejected, Colors.interior, 3, 80);
    world.drawPoints(candidate.kept, Colors.filtered, 4, 190);
    drawLineIfValid(world, lineFromRotationDebug(debug, index), Colors.filtered, 3);
    world.drawPoints([debug.pivot], Colors.corrected, 9, 230);
    panel(p, "Rotation search", [
      `candidate: ${index + 1}/${debug.angles.length}`,
      `angle: ${C.radToDeg(debug.angles[index]).toFixed(2)} deg`,
      `best angle: ${C.radToDeg(demo.coarse.bestAngle).toFixed(2)} deg`,
      `kept points: ${candidate.kept.length}`,
      "",
      "For each angle, points are inspected",
      "in a rotated local coordinate basis.",
      "The boundary line marks the selected",
      "outer face band for this candidate.",
    ]);
  }

  function drawLineFit(p, state, simFrame) {
    const demo = state.lineFit;
    const fit = demo.fit;
    const iter = Math.min(frameIndex(simFrame, Math.max(1, fit.iterations.length), 18), fit.iterations.length - 1);
    const step = fit.iterations[iter] || { line: fit.line, inliers: fit.inliers };
    const inlierSet = new Set(step.inliers);
    const inliers = [];
    const outliers = [];
    demo.track.points.forEach((point, idx) => (inlierSet.has(idx) ? inliers : outliers).push(point));
    const world = makeWorld(p, demo.track.points, 0.8);
    drawTitle(p, "Line fit", "Recursive linear regression repeatedly fits a line and keeps close inliers");
    world.drawGrid();
    world.drawPoints(outliers, Colors.rejected, 3, 90);
    world.drawPoints(inliers, Colors.accepted, 4, 180);
    drawLineIfValid(world, step.line, Colors.fit, 3);
    panel(p, "Recursive fit", [
      `iteration: ${iter + 1}/${fit.iterations.length}`,
      `inliers: ${step.inliers.length}/${demo.track.points.length}`,
      `ratio: ${(step.inliers.length / demo.track.points.length * 100).toFixed(1)}%`,
      `heading: ${C.radToDeg(C.headingFromLine(step.line)).toFixed(2)} deg`,
      "",
      "The fit should describe the beam's",
      "long axis, not the noisy mask body.",
      "Outliers are shown red.",
    ]);
  }

  function drawSmoothing(p, state, simFrame) {
    const index = frameIndex(simFrame, state.smoothing.length, 4);
    const item = state.smoothing[index];
    const world = makeWorld(p, item.frame.tracks[0].points, 0.9);
    drawTitle(p, "Coefficient smoothing", "Raw fitted line coefficients are EMA-smoothed before they steer heading/centerline");
    world.drawGrid();
    drawTrackPoints(world, item.frame.tracks[0], 3);
    drawLineIfValid(world, item.raw, Colors.rawLine, 2);
    drawLineIfValid(world, item.smooth, Colors.smoothLine, 4);
    panel(p, "Line coefficient EMA", [
      `frame: ${item.frame.frameIndex}`,
      `raw heading: ${C.radToDeg(item.rawHeading).toFixed(2)} deg`,
      `smoothed heading: ${C.radToDeg(item.smoothHeading).toFixed(2)} deg`,
      `alpha: ${C.Config.planeCoeffAlpha.toFixed(2)}`,
      "",
      "Raw line: orange.",
      "Smoothed line: cyan.",
      "This is temporal damping on line",
      "coefficients, separate from aisle",
      "heading EMA.",
    ]);
  }

  function drawHeadingConsensus(p, state, simFrame) {
    const t = simFrame * 0.035;
    const base = C.degToRad(33 + Math.sin(t) * 1.5);
    const beams = [
      { heading: base + C.degToRad(Math.sin(t * 1.7) * 1.2), inlierCount: 32000 },
      { heading: base + C.degToRad(Math.cos(t * 1.3) * 1.5), inlierCount: 26000 },
      { heading: base + C.degToRad(16 + Math.sin(t) * 2), inlierCount: 5000 },
    ];
    const accepted = C.selectConsensus(beams, base, { ...C.Config, maxBeamsForConsensus: 3 });
    const mean = C.consensusHeading(accepted, base);
    drawTitle(p, "Heading consensus", "Weighted circular mean accepts agreeing beams and rejects heading outliers");
    const x0 = 70;
    const x1 = p.width - 380;
    const y = p.height * 0.52;
    p.push();
    p.stroke(42, 51, 72);
    p.strokeWeight(2);
    p.line(x0, y, x1, y);
    p.noStroke();
    p.fill(149, 163, 184);
    p.textSize(12);
    for (let deg = 15; deg <= 55; deg += 5) {
      const x = x0 + (deg - 15) / 40 * (x1 - x0);
      p.stroke(42, 51, 72);
      p.line(x, y - 9, x, y + 9);
      p.noStroke();
      p.text(`${deg} deg`, x - 18, y + 28);
    }
    for (const beam of beams) {
      const acceptedBeam = accepted.includes(beam);
      const deg = C.radToDeg(beam.heading);
      const x = x0 + (deg - 15) / 40 * (x1 - x0);
      p.fill(...(acceptedBeam ? Colors.accepted : Colors.rejected));
      p.circle(x, y, Math.max(8, Math.min(20, beam.inlierCount / 2200)));
    }
    const meanX = x0 + (C.radToDeg(mean) - 15) / 40 * (x1 - x0);
    p.stroke(...Colors.centerline);
    p.strokeWeight(4);
    p.line(meanX, y - 60, meanX, y + 60);
    p.pop();
    panel(p, "Consensus gate", [
      `accepted: ${accepted.length}/${beams.length}`,
      `mean heading: ${C.radToDeg(mean).toFixed(2)} deg`,
      `threshold: ${C.Config.consensusThresholdDeg.toFixed(1)} deg`,
      "",
      "The point size is inlier count.",
      "Green points influence the mean.",
      "Red points are outside the gate.",
    ]);
  }

  function drawCenterline(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.results.length, 4);
    const result = nearestValidResult(state.data.results, index);
    const world = makeWorld(p, collectResultPoints(result), 1.0);
    drawTitle(p, "Centerline", "Dual mode averages two rack lines; single mode offsets one rack line by expected aisle half-width");
    world.drawGrid();
    for (const beam of result.accepted) drawLineIfValid(world, beam.line, beam.side === "left" ? Colors.faceLeft : Colors.faceRight, 3);
    drawLineIfValid(world, result.centerline, Colors.centerline, 4);
    world.drawPose(result.frame.fcuPose, Colors.fcu, "FCU");
    panel(p, "Centerline estimate", [
      `mode: ${result.dual ? "dual" : "single fallback"}`,
      `accepted beams: ${result.accepted.length}`,
      `heading: ${C.radToDeg(result.heading).toFixed(2)} deg`,
      "",
      "The centerline is represented as",
      "a line equation: ax + by + c = 0.",
      "Later correction only needs the",
      "signed distance from FCU to this line.",
    ]);
  }

  function drawCorrection(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.results.length, 4);
    const result = nearestValidResult(state.data.results, index);
    const world = makeWorld(p, collectResultPoints(result), 1.0);
    drawTitle(p, "Corrected pose", "Shift FCU pose by the smoothed lateral error, then publish aisle-aligned corrected pose");
    world.drawGrid();
    drawLineIfValid(world, result.centerline, Colors.centerline, 4);
    world.drawPose(result.frame.fcuPose, Colors.fcu, "FCU");
    world.drawPose(result.correctedPose, Colors.corrected, "corrected");
    world.drawWorldSegment(result.frame.fcuPose, result.correctedPose, [255, 255, 255, 170], 2);
    panel(p, "Lateral correction", [
      `raw distance: ${result.correctedPose.rawDist.toFixed(3)} m`,
      `smoothed distance: ${result.correctedPose.smoothedDist.toFixed(3)} m`,
      `corrected yaw: ${C.radToDeg(result.correctedPose.yaw).toFixed(2)} deg`,
      "",
      "This demo is a world-pose view:",
      "corrected yaw points along the aisle.",
      "The position changes perpendicular",
      "to the centerline, not along it.",
    ]);
  }

  function drawFrameAxes(world, origin, yaw, label) {
    const xAxis = C.add(origin, C.mul(C.headingVector(yaw), 1.0));
    const yAxis = C.add(origin, C.mul(C.normalVector(yaw), 0.8));
    world.drawWorldSegment(origin, xAxis, [248, 113, 113, 230], 4);
    world.drawWorldSegment(origin, yAxis, [82, 255, 168, 230], 4);
    const p = world.p;
    const s = world.toScreen(origin);
    p.push();
    p.noStroke();
    p.fill(230);
    p.textSize(12);
    p.text(label, s.x + 8, s.y - 8);
    p.pop();
  }

  function drawTfLogic(p, state, simFrame) {
    const index = frameIndex(simFrame, state.data.results.length, 5);
    const result = nearestValidResult(state.data.results, index);
    const points = [
      C.v(-1.5, -1.5),
      C.v(4.5, 2.5),
      result.frame.fcuPose,
      result.correctedPose,
    ];
    const world = makeWorld(p, points, 1.0);
    drawTitle(p, "TF logic", "World corrected yaw can be aisle yaw while correction-frame composition can cancel to zero");
    world.drawGrid();
    drawFrameAxes(world, C.v(0, 0), 0, "map");
    drawFrameAxes(world, C.v(0.6, -0.7), -result.heading, "odom_vision_correction");
    world.drawPose(result.correctedPose, Colors.corrected, "world corrected");
    panel(p, "Yaw composition", [
      `aisle yaw: ${C.radToDeg(result.heading).toFixed(2)} deg`,
      `map -> correction yaw: ${(-C.radToDeg(result.heading)).toFixed(2)} deg`,
      `correction -> base yaw: ${C.radToDeg(result.heading).toFixed(2)} deg`,
      `composed local yaw: ${(0).toFixed(2)} deg`,
      "",
      "Read it like nested game objects:",
      "the parent frame rotates by -aisle.",
      "the child frame rotates by +aisle.",
      "inside that local frame they cancel.",
      "The world corrected pose can still",
      "have aisle yaw.",
    ]);
  }

  function drawFailureCases(p, state, simFrame) {
    const caseIndex = frameIndex(simFrame, state.failures.length, 42);
    const current = state.failures[caseIndex];
    const result = current.result;
    const points = collectResultPoints(result);
    const world = makeWorld(p, points, 1.0);
    drawTitle(p, "Failure cases", "The correction pipeline should prefer freezing/resetting bad geometry over using corrupted evidence");
    world.drawGrid();
    const stages = current.hideRight ? result.stageResults.filter(stage => stage.track.side === "left") : result.stageResults;
    for (const stage of stages) drawTrackPoints(world, stage.track, 3);
    for (const beam of result.accepted) drawLineIfValid(world, beam.line, Colors.accepted, 3);
    if (current.outlier) {
      const fakeOutlier = { ...result.centerline, c: result.centerline.c + 0.9 };
      drawLineIfValid(world, fakeOutlier, Colors.rejected, 3);
    }
    if (current.switchTrack) {
      const shifted = result.stageResults[0].track.points.slice(0, 80).map(point => C.add(point, C.v(0.8, -0.5)));
      world.drawPoints(shifted, Colors.rejected, 4, 120);
    }
    drawLineIfValid(world, result.centerline, Colors.centerline, 4);
    world.drawPose(result.frame.fcuPose, Colors.fcu, "FCU");
    if (result.correctedPose) world.drawPose(result.correctedPose, Colors.corrected, "corrected");
    panel(p, current.title, [
      current.text,
      "",
      `demo id: ${current.id}`,
      `accepted beams: ${result.accepted.length}`,
      `mode: ${result.dual ? "dual" : "single/frozen fallback"}`,
      "",
      "The important rule is not to make",
      "a confident correction from evidence",
      "that no longer describes the same",
      "physical rack geometry.",
    ]);
  }

  const Drawers = {
    "pipeline": drawPipeline,
    "synthetic-input": drawSyntheticInput,
    "accumulation": drawAccumulation,
    "rotation-filter": drawRotationFilter,
    "line-fit": drawLineFit,
    "coefficient-smoothing": drawSmoothing,
    "heading-consensus": drawHeadingConsensus,
    "centerline": drawCenterline,
    "correction": drawCorrection,
    "tf-logic": drawTfLogic,
    "failure-cases": drawFailureCases,
  };

  function drawDemo(p, state, demoId, simFrame) {
    p.background(...Colors.bg);
    const draw = Drawers[demoId] || Drawers.pipeline;
    draw(p, state, simFrame);
  }

  global.VisionPipelineP5Demos = {
    Colors,
    createDemoState,
    drawDemo,
    demoIds: C.DemoIds,
    labels: C.DemoLabels,
  };
}(globalThis));

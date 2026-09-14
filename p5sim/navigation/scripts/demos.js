(function (global) {
  "use strict";
  // Sixteen drawers for the combined page. Every drawer reads the orchestrator's
  // per-frame trace (scripts/pose_corrector.js) and the tick outputs; nothing is
  // recomputed here. Panels quote the YAML keys that drive each stage.
  const S = global.PoseCorrectorSim;
  const C = S.config, G = S.geometry, L = S.lineFitter, A = S.aisleState, F = S.lateralDriftFilter;
  const H = S.heading, X = S.xOffset, T = S.correctionTransform, N = S.poseCorrector, W = S.syntheticWorld;
  const R = global.VisionPipelineRenderer;
  const Config = C.Config;
  const BP = Config.beam_pointcloud;
  const DEG = Math.PI / 180;
  const deg = r => (r * 180 / Math.PI).toFixed(2);
  const m3 = v => (typeof v === "number" ? v.toFixed(3) : "-");

  const Colors = {
    bg: [8, 10, 16], grid: [42, 51, 72],
    faceLeft: [83, 198, 255], faceRight: [255, 199, 87], interior: [111, 126, 153],
    accumulated: [92, 235, 181], filtered: [248, 113, 113], fit: [255, 255, 255],
    rawLine: [255, 142, 88], smoothLine: [87, 220, 255], centerline: [163, 230, 53],
    calib: [0, 255, 255], fcu: [255, 199, 87], corrected: [82, 255, 168],
    rejected: [248, 113, 113], accepted: [82, 255, 168], muted: [135, 148, 172],
    map: [0, 220, 220], odom: [255, 120, 200], xoff: [255, 210, 60], white: [230, 236, 246],
  };

  const DemoIds = [
    "pipeline", "synthetic-input", "accumulation", "rotation-filter", "line-fit",
    "coefficient-smoothing", "heading-gates", "heading-consensus", "centerline", "calibration",
    "lateral-drift-filter", "x-offset", "correction", "tf-logic", "outputs-hold", "failure-cases",
  ];
  const DemoLabels = {
    "pipeline": "Full pipeline", "synthetic-input": "Synthetic input", "accumulation": "Accumulation (off by default)",
    "rotation-filter": "Rotation filter", "line-fit": "Line fit", "coefficient-smoothing": "Coefficient smoothing",
    "heading-gates": "Heading gates", "heading-consensus": "Heading consensus", "centerline": "Centerline",
    "calibration": "Calibration", "lateral-drift-filter": "Lateral drift filter", "x-offset": "X offset (pillars)",
    "correction": "Correction", "tf-logic": "TF logic", "outputs-hold": "Outputs and hold", "failure-cases": "Failure cases",
  };

  // ── layout helpers ─────────────────────────────────────────────────────────
  function worldRect(p) {
    const sidePanelW = Math.min(340, Math.max(280, p.width * 0.3));
    return {
      world: { x: 18, y: 58, w: p.width - sidePanelW - 44, h: p.height - 78 },
      panel: { x: p.width - sidePanelW - 14, y: 58, w: sidePanelW, h: p.height - 78 },
    };
  }
  function makeWorld(p, points, pad = 1.0, rect) {
    const rects = worldRect(p);
    return new R.WorldRenderer(p, R.computeBounds(points, pad), rect || rects.world);
  }
  function drawTitle(p, title, subtitle) {
    p.push(); p.noStroke(); p.fill(232, 238, 248); p.textStyle(p.BOLD); p.textSize(18); p.text(title, 18, 28);
    p.textStyle(p.NORMAL); p.fill(149, 163, 184); p.textSize(12); p.text(subtitle, 18, 47); p.pop();
  }
  function panel(p, title, lines) {
    const rects = worldRect(p);
    R.drawPanel(p, rects.panel.x, rects.panel.y, rects.panel.w, rects.panel.h, title);
    R.drawTextBlock(p, lines, rects.panel.x + 14, rects.panel.y + 52, 17);
    return rects.panel;
  }
  function label(world, point, text, color = Colors.white, dx = 8, dy = -8) {
    const p = world.p, s = world.toScreen(point);
    p.push(); p.noStroke(); p.fill(...color); p.textSize(11); p.text(text, s.x + dx, s.y + dy); p.pop();
  }
  function lineFromHeading(heading, c) { return { a: -Math.sin(heading), b: Math.cos(heading), c }; }
  function stateLine(aisleState) { return lineFromHeading(aisleState.headingRad, aisleState.centerlineC); }
  function drawTrackPoints(world, stage, size = 2.5) {
    const pts = stage.inputPoints;
    const face = pts.filter(q => q.kind !== "interior"), interior = pts.filter(q => q.kind === "interior");
    world.drawPoints(interior, Colors.interior, size, 80);
    world.drawPoints(face, stage.side === "left" ? Colors.faceLeft : Colors.faceRight, size + 0.5, 170);
  }
  function framePoints(frame, extra = []) {
    const pts = [frame.fcuPose, ...extra];
    for (const t of frame.tracks) pts.push(...t.points);
    return pts;
  }
  function drawFrameRacks(world, frame, size = 2.5) {
    for (const t of frame.tracks) drawTrackPoints(world, { inputPoints: t.points, side: t.side }, size);
  }
  // Strip chart: series over frame index, cursor, shaded windows.
  function drawStrip(p, rect, yMin, yMax, series, cursor, windows = [], labels = []) {
    const n = series.length ? series[0].values.length : 1;
    const toX = i => rect.x + (i / Math.max(1, n - 1)) * rect.w;
    const toY = y => rect.y + rect.h - ((y - yMin) / (yMax - yMin)) * rect.h;
    p.push();
    p.noStroke();
    for (const w of windows) { p.fill(...w.color); p.rect(toX(w.from), rect.y, Math.max(1, toX(w.to + 1) - toX(w.from)), rect.h); }
    p.stroke(...Colors.grid); p.noFill(); p.rect(rect.x, rect.y, rect.w, rect.h);
    for (const s of series) {
      p.stroke(...s.color); p.strokeWeight(s.weight || 2); p.noFill(); p.beginShape();
      for (let i = 0; i < s.values.length; i += 1) { const v = s.values[i]; if (v === null || v === undefined) { p.endShape(); p.beginShape(); continue; } p.vertex(toX(i), toY(Math.max(yMin, Math.min(yMax, v)))); }
      p.endShape();
    }
    p.stroke(230, 230, 230, 150); p.strokeWeight(1); p.line(toX(cursor), rect.y, toX(cursor), rect.y + rect.h);
    p.noStroke(); p.fill(...Colors.muted); p.textSize(11);
    p.text(yMax.toFixed(2), rect.x + 4, rect.y + 12); p.text(yMin.toFixed(2), rect.x + 4, rect.y + rect.h - 4);
    labels.forEach((t, i) => { p.fill(...t.color); p.text(t.text, rect.x + 60 + i * 150, rect.y + 12); });
    p.pop();
  }
  const FaultColors = { "missing-right": [255, 199, 87, 40], "short-both": [111, 126, 153, 60], "skew-right": [248, 113, 113, 45], "glitch-lateral": [255, 120, 200, 70], "displacement": [82, 255, 168, 40], "dropout": [255, 255, 255, 35], "id-switch": [87, 220, 255, 40] };
  function faultWindows(world) { return world.faults.map(f => ({ from: f.from, to: f.to, color: FaultColors[f.id] || [255, 255, 255, 30] })); }

  // ── state ──────────────────────────────────────────────────────────────────
  function createDemoState() {
    const world = W.buildWorld();
    const timeline = N.runTimeline(world, Config);
    const ticks = timeline.ticks;
    const lastTraceAtOrBefore = new Array(world.frameCount).fill(null);
    let last = null;
    for (const k of ticks) { if (k.trace) last = k.trace; if (k.k % 3 === 0) lastTraceAtOrBefore[k.frameIndex] = last; }
    const lastFrameAtOrBefore = new Array(world.frameCount).fill(null);
    let lf = null;
    for (let i = 0; i < world.frameCount; i += 1) { if (world.frames[i]) lf = world.frames[i]; lastFrameAtOrBefore[i] = lf; }

    // The accumulation variant is built on first use (it doubles the start-up cost).
    let accTraceByFrame = null;
    const ensureAccumulation = () => {
      if (accTraceByFrame) return accTraceByFrame;
      const accCfg = C.cloneConfig(Config); accCfg.beam_pointcloud.enable_accumulation = true;
      accTraceByFrame = new Map();
      for (const k of N.runTimeline(world, accCfg).ticks) if (k.trace) accTraceByFrame.set(k.frameIndex, k.trace);
      return accTraceByFrame;
    };

    const f20 = world.frames[20], rightTrack = f20.tracks.find(t => t.side === "right");
    const rotCfg = L.rotationFilterConfigFromYaml(BP);
    const coarse = L.rotationSearchFilter(rightTrack.points, world.headingRad, rotCfg.coarse_pivot_distance, rotCfg.coarse_search_range_deg, rotCfg.coarse_search_step_deg, rotCfg.coarse_filter_threshold, false);
    const fine = L.rotationSearchFilter(coarse.points, coarse.bestAngle, rotCfg.fine_pivot_distance, rotCfg.fine_search_range_deg, rotCfg.fine_search_step_deg, rotCfg.fine_filter_threshold, false);
    const tight = L.rotationSearchFilter(rightTrack.points, world.headingRad, 3.0, 10, 0.5, 0.1, false);

    const fitter = new L.RecursiveLinRegFitter(L.fitterConfigFromYaml(BP));
    const f24 = world.frames[24], leftTrack = f24.tracks.find(t => t.side === "left");
    const gapPts = [], stubPts = [];
    const d = G.headingVector(world.headingRad), n = G.normalVector(world.headingRad);
    const base = { x: f24.fcuPose.x + n.x * 1.6, y: f24.fcuPose.y + n.y * 1.6 };
    for (let i = 0; i < 60; i += 1) { const t = -3 + i / 59; gapPts.push({ x: base.x + d.x * t, y: base.y + d.y * t }); }
    for (let i = 0; i < 60; i += 1) { const t = 2 + i / 59; gapPts.push({ x: base.x + d.x * t, y: base.y + d.y * t }); }
    for (let i = 0; i < 40; i += 1) { const t = 0.3 * i / 39; stubPts.push({ x: base.x + d.x * t, y: base.y + d.y * t }); }
    const lineFitCases = [
      { id: "clean", title: "clean face + interior", points: leftTrack.points, fit: fitter.fitPlane(leftTrack.points) },
      { id: "gap", title: "two clusters 4 m apart", points: gapPts, fit: fitter.fitPlane(gapPts) },
      { id: "stub", title: "0.3 m stub", points: stubPts, fit: fitter.fitPlane(stubPts) },
    ];

    const smoothing = [];
    for (let i = 0; i < world.frameCount; i += 1) {
      const tr = lastTraceAtOrBefore[i]; if (!tr || tr.frameIndex !== i) { smoothing.push(null); continue; }
      const st = tr.stages.find(s => s.side === "left" && s.fit && s.fit.valid && s.beamResult);
      smoothing.push(st ? { raw: st.fit.coefficients, smooth: st.beamResult.planeCoefficients, restarted: st.beamResult.smoothingRestarted, trackId: st.trackId } : null);
    }

    const series = { rawDist: [], filtDist: [], held: [], reqHeading: [], pubHeading: [], xRaw: [], xFilt: [] };
    for (let i = 0; i < world.frameCount; i += 1) {
      const tr = lastTraceAtOrBefore[i]; const own = tr && tr.frameIndex === i ? tr : null;
      series.rawDist.push(own && own.broadcast ? own.broadcast.lateral.rawM : null);      // centerline offset c as handed to the filter
      series.filtDist.push(own && own.broadcast ? own.broadcast.lateral.filteredM : null); // c after jump guard + EMA
      series.held.push(own && own.broadcast ? own.broadcast.lateral.held : false);
      series.reqHeading.push(own && own.consensus && own.consensus.valid ? own.consensus.headingRad / DEG : null);
      series.pubHeading.push(own && own.aisleState.initialized ? own.aisleState.headingRad / DEG : null);
      series.xRaw.push(own ? own.xOffsetState.xOffsetRaw : null);
      series.xFilt.push(own ? own.xOffsetState.xOffsetFiltered : null);
    }

    return {
      world, ticks, lastTraceAtOrBefore, lastFrameAtOrBefore, ensureAccumulation,
      rotation: { track: rightTrack, coarse, fine, tight, cfg: rotCfg },
      lineFitCases, smoothing, series,
    };
  }

  // Current tick / frame / trace for an animation frame.
  function current(state, simFrame, speed = 1) {
    const tickIndex = Math.floor(simFrame * speed) % state.ticks.length;
    const tick = state.ticks[tickIndex];
    const frameIndex = tick.frameIndex;
    return {
      tickIndex, tick, frameIndex,
      frame: state.lastFrameAtOrBefore[frameIndex],
      liveFrame: state.world.frames[frameIndex],
      trace: state.lastTraceAtOrBefore[frameIndex],
      fault: W.faultAt(state.world, frameIndex),
    };
  }
  function faultText(cur) { return cur.fault ? `${cur.fault.id}: ${cur.fault.label}` : "none"; }

  // ── drawers ────────────────────────────────────────────────────────────────
  function drawPipeline(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const world = makeWorld(p, framePoints(frame, trace.broadcast ? [{ x: trace.broadcast.correctedX, y: trace.broadcast.correctedY }] : []), 0.8);
    drawTitle(p, "Full pipeline", "SegDepthCallback -> ProcessBeamClouds -> ProcessBeamResults -> ApplyVisionCorrection -> BroadcastVisionCorrectedTF (line-based)");
    world.drawGrid();
    for (const st of trace.stages) {
      drawTrackPoints(world, st, 2.2);
      if (st.rotFiltered) world.drawPoints(st.rotFiltered, Colors.filtered, 2.6, 90);
      if (st.fit && st.fit.valid) world.drawLine(st.fit.coefficients, st.beamResult && st.beamResult.headingValid ? Colors.fit : Colors.rejected, 1.5);
    }
    if (trace.aisleState.initialized) world.drawLine(stateLine(trace.aisleState), Colors.centerline, 3);
    if (trace.broadcast) {
      const b = trace.broadcast;
      world.drawWorldSegment(frame.fcuPose, { x: b.lateralX, y: b.lateralY }, [255, 255, 255, 120], 1.5);
      const shifted = { x: frame.fcuPose.x + b.cFiltered * b.a, y: frame.fcuPose.y + b.cFiltered * b.b };
      world.drawWorldSegment(frame.fcuPose, shifted, Colors.centerline, 3);
      world.drawWorldSegment(shifted, { x: b.correctedX, y: b.correctedY }, Colors.xoff, 3);
      world.drawPose({ x: b.correctedX, y: b.correctedY, yaw: frame.fcuPose.yaw }, Colors.corrected, "corrected (odom)");
    }
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU (odom)");
    const b = trace.broadcast;
    panel(p, "Pipeline state", [
      `frame ${trace.frameIndex}  t=${trace.stamp.toFixed(1)}s`,
      `fault: ${faultText(cur)}`,
      `hold: ${trace.hold || "-"}${trace.reset ? "  reset: " + trace.reset : ""}`,
      `mode: ${trace.centerlineMode || "-"}   fresh heading: ${trace.freshHeading}`,
      `heading (state): ${trace.aisleState.initialized ? deg(trace.aisleState.headingRad) + " deg" : "-"}`,
      `centerline_c (state): ${m3(trace.aisleState.centerlineC)}`,
      b ? `c raw ${m3(b.c)}  c filtered ${m3(b.cFiltered)}${b.lateral.held ? "  HELD" : ""}  drone dist ${m3(b.distToCenterline)}` : "c: -",
      `x offset raw ${m3(trace.xOffsetState.xOffsetRaw)}  filtered ${m3(trace.xOffsetState.xOffsetFiltered)}  has_x ${trace.xOffsetState.xOffsetHasMeasurement}`,
      `beams: ${trace.stages.map(s => `${s.trackId}${s.beamResult ? (s.beamResult.headingValid ? "" : "(gate)") : s.skipped ? "(skip)" : "(-)"}`).join(" ")}`,
      trace.consensus ? `consensus: acc ${JSON.stringify(trace.consensus.acceptedTrackIds)} rej ${JSON.stringify(trace.consensus.rejectedSamples.map(r => r.trackId))}` : "consensus: -",
      "",
      "White lines: per-track fits (red = heading gate failed).",
      "Green line: aisle-state centerline. Green arrow: shift by c",
      "(same for every point). Yellow step: x offset.",
      "Red dots: rotation-filtered points (YAML thresholds keep all).",
    ]);
  }

  function drawSyntheticInput(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { frame, world: w } = { frame: cur.frame, world: state.world };
    if (!frame) return;
    const truth = w.truth[cur.frameIndex];
    const pts = framePoints(frame, [truth.mapPose]);
    const world = makeWorld(p, pts, 0.8);
    drawTitle(p, "Synthetic input", "Everything the node sees is in ODOM; map = odom + constant offset. The node estimates that gap.");
    world.drawGrid();
    drawFrameRacks(world, frame, 2.5);
    for (const u of w.missionUprights) {
      const o = W.mapToOdom(w, u.start);
      world.drawPoints([u.start], Colors.map, 7, 110);
      world.drawPoints([o], Colors.map, 9, 230);
    }
    for (const dpt of frame.verticalDetections) world.drawPoints([dpt], Colors.rejected, 6, 200);
    world.drawPose(truth.mapPose, Colors.map, "true pose (map coords)");
    world.drawPose(frame.fcuPose, Colors.fcu, "reported pose (odom)");
    world.drawWorldSegment(frame.fcuPose, truth.mapPose, [0, 220, 220, 140], 2);
    const lines = [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      `odomAlongOffsetM ${w.odomOffset.along}  odomLateralOffsetM ${w.odomOffset.lateral}`,
      `aisle heading ${deg(w.headingRad)} deg  half width ${w.halfWidth} m`,
      `upright spacing ${w.uprightSpacing} m  detections ${frame.verticalDetections.length}`,
      `tracks: ${frame.tracks.map(t => `${t.trackId}/${t.side}/${t.points.length}`).join("  ")}`,
      "",
      "Cyan bright: uprights as the camera sees them (odom).",
      "Cyan dim: the same uprights in the mission map.",
      "Red: vertical detections (noise 0.05, spurious every 17th).",
      "",
      "Fault timeline:",
      ...w.faults.map(f => `${cur.fault && cur.fault.id === f.id ? ">" : " "} ${f.from}-${f.to} ${f.id}`),
    ];
    panel(p, "Input model", lines);
  }

  function drawAccumulation(p, state, simFrame) {
    const cur = current(state, simFrame);
    const acc = state.ensureAccumulation().get(cur.frameIndex);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const accStage = acc ? acc.stages.find(s => s.side === "left") : null;
    const single = trace.stages.find(s => s.side === "left");
    const pts = [frame.fcuPose, ...(accStage && accStage.accumulated ? accStage.accumulated : []), ...(single ? single.inputPoints : [])];
    const world = makeWorld(p, pts, 0.8);
    drawTitle(p, "Accumulation (off by default)", "enable_accumulation: false in the YAML; this view runs a second pipeline with it on");
    world.drawGrid();
    if (accStage && accStage.accumulated) world.drawPoints(accStage.accumulated, Colors.accumulated, 2, 60);
    if (single) drawTrackPoints(world, single, 3.5);
    if (single && single.fit && single.fit.valid) world.drawLine(single.fit.coefficients, Colors.fit, 3);
    if (accStage && accStage.fit && accStage.fit.valid) world.drawLine(accStage.fit.coefficients, Colors.smoothLine, 2);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    panel(p, "PointCloudAccumulator", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      `enable_accumulation: ${BP.enable_accumulation} (deployed)`,
      `accumulation_window_sec: ${BP.accumulation_window_sec}`,
      `accumulation_max_points: ${BP.accumulation_max_points}`,
      `current frame points: ${single ? single.inputPoints.length : "-"}`,
      `accumulated points: ${accStage && accStage.accumulated ? accStage.accumulated.length : "-"}`,
      `single-frame heading: ${single && single.beamResult ? deg(single.beamResult.heading) : "-"} deg`,
      `accumulated heading: ${accStage && accStage.beamResult ? deg(accStage.beamResult.heading) : "-"} deg`,
      "",
      "White: single-frame fit (what runs today).",
      "Cyan: fit on the 4 s accumulated cloud.",
      "The node clears the accumulator on every reset.",
    ]);
  }

  function drawRotationFilter(p, state, simFrame) {
    const d = state.rotation;
    const nC = d.coarse.debug.angles.length, nF = d.fine.debug.angles.length;
    const total = nC + nF + 40;
    const idx = Math.floor(simFrame / 4) % total;
    let stage, k, pts, dbg, title;
    if (idx < nC) { stage = "coarse"; k = idx; pts = d.track.points; dbg = d.coarse.debug; }
    else if (idx < nC + nF) { stage = "fine"; k = idx - nC; pts = d.coarse.points; dbg = d.fine.debug; }
    else { stage = "tight"; k = d.tight.debug.bestIndex; pts = d.track.points; dbg = d.tight.debug; }
    const values = dbg.rotatedValues[k], metric = dbg.metrics[k];
    const thr = stage === "coarse" ? d.cfg.coarse_filter_threshold : stage === "fine" ? d.cfg.fine_filter_threshold : 0.1;
    const kept = [], rejected = [];
    for (let i = 0; i < pts.length; i += 1) ((values[i] > metric - thr) ? kept : rejected).push(pts[i]);
    const world = makeWorld(p, [...d.track.points, dbg.pivot], 0.6);
    drawTitle(p, "Rotation filter", "RotationSearchFilter: sweep angles about a pivot, keep the wall-face layer (right rack -> minimise max rotated_y)");
    world.drawGrid();
    world.drawPoints(rejected, Colors.interior, 3, 90);
    world.drawPoints(kept, Colors.filtered, 3.5, 190);
    const angle = dbg.angles[k];
    const boundary = { a: -Math.sin(angle), b: Math.cos(angle), c: Math.sin(angle) * dbg.pivot.x - Math.cos(angle) * dbg.pivot.y - metric };
    world.drawLine(boundary, Colors.filtered, 2);
    world.drawPoints([dbg.pivot], Colors.corrected, 9, 230);
    label(world, dbg.pivot, "pivot");
    panel(p, "Rotation search", [
      `stage: ${stage}  candidate ${k + 1}/${dbg.angles.length}`,
      `angle ${deg(angle)} deg  best ${deg(dbg.angles[dbg.bestIndex])} deg`,
      `threshold ${thr}  kept ${kept.length}/${pts.length}`,
      "",
      `rot_coarse_pivot_distance ${d.cfg.coarse_pivot_distance}`,
      `rot_coarse_search_range_deg ${d.cfg.coarse_search_range_deg}`,
      `rot_coarse_search_step_deg ${d.cfg.coarse_search_step_deg}`,
      `rot_coarse_filter_threshold ${d.cfg.coarse_filter_threshold}`,
      `rot_fine_pivot_distance ${d.cfg.fine_pivot_distance}`,
      `rot_fine_search_range_deg ${d.cfg.fine_search_range_deg}`,
      `rot_fine_search_step_deg ${d.cfg.fine_search_step_deg}`,
      `rot_fine_filter_threshold ${d.cfg.fine_filter_threshold}`,
      "",
      "With the YAML thresholds (0.8, 0.5) the band is wider",
      "than a 0.25 m interior layer, so the deployed filter",
      "keeps every point; the last stage shows a 0.1 m band.",
    ]);
  }

  function drawLineFit(p, state, simFrame) {
    const cases = state.lineFitCases;
    const per = 120;
    const ci = Math.floor(simFrame / per) % cases.length;
    const cse = cases[ci];
    const fit = cse.fit;
    const iters = fit.iterations.length ? fit.iterations : [{ line: fit.coefficients, inlierIndices: fit.inlierIndices }];
    const it = Math.min(Math.floor((simFrame % per) / 25), iters.length);   // last step = validation view
    const step = iters[Math.min(it, iters.length - 1)];
    const inlierSet = new Set(step.inlierIndices);
    const inliers = [], outliers = [];
    cse.points.forEach((q, i) => (inlierSet.has(i) ? inliers : outliers).push(q));
    const world = makeWorld(p, cse.points, 0.6);
    drawTitle(p, "Line fit", "RecursiveLinRegFitter::FitPlane: fit, keep points within distance_threshold, refit; then ratio, gap and length checks");
    world.drawGrid();
    world.drawPoints(outliers, Colors.rejected, 3, 90);
    world.drawPoints(inliers, Colors.accepted, 3.5, 180);
    if (step.line) world.drawLine(step.line, Colors.fit, 3);
    const validation = it >= iters.length;
    panel(p, "Recursive fit", [
      `case: ${cse.title}`,
      validation ? "validation" : `iteration ${it + 1}/${iters.length}`,
      `inliers ${step.inlierIndices.length}/${cse.points.length}  ratio ${(step.inlierIndices.length / cse.points.length * 100).toFixed(1)}%`,
      `result: ${fit.valid ? "valid" : "invalid (" + fit.reason + ")"}`,
      fit.valid ? `extent ${m3(L.lineExtent(cse.points, fit.inlierIndices, fit.coefficients))} m` : "",
      "",
      `linreg_distance_threshold ${BP.linreg_distance_threshold}`,
      `linreg_min_inlier_ratio ${BP.linreg_min_inlier_ratio}`,
      `linreg_max_iterations ${BP.linreg_max_iterations}`,
      `linreg_max_allowed_gap ${BP.linreg_max_allowed_gap}`,
      `linreg_min_line_length ${BP.linreg_min_line_length}`,
      `min_points_for_fitting ${BP.min_points_for_fitting}`,
      "",
      "The inlier set only shrinks: a point dropped in",
      "iteration 1 is never recovered. With interior",
      "points ~15% of the face is lost for good.",
    ]);
  }

  function drawSmoothing(p, state, simFrame) {
    const cur = current(state, simFrame);
    const item = state.smoothing[cur.frameIndex];
    const frame = cur.frame;
    if (!item || !frame) return;
    const left = frame.tracks.find(t => t.side === "left");
    const world = makeWorld(p, left.points, 0.6);
    drawTitle(p, "Coefficient smoothing", "BuildBeamResultFromFit: normalize, flip on negative dot with the previous normal, EMA at plane_coefficients_ema_alpha, renormalize");
    world.drawGrid();
    drawTrackPoints(world, { inputPoints: left.points, side: "left" }, 3);
    world.drawLine(item.raw, Colors.rawLine, 2);
    world.drawLine(item.smooth, Colors.smoothLine, 4);
    panel(p, "Line coefficient EMA", [
      `frame ${cur.frameIndex}  track ${item.trackId}${item.restarted ? "  (EMA restarted)" : ""}`,
      `plane_coefficients_ema_alpha ${BP.plane_coefficients_ema_alpha}`,
      `raw heading ${deg(G.computeHeadingFromLineCoefficients(item.raw))} deg`,
      `smoothed heading ${deg(G.computeHeadingFromLineCoefficients(item.smooth))} deg`,
      `raw c ${m3(item.raw.c)}  smoothed c ${m3(item.smooth.c)}`,
      "",
      "Orange: this frame's raw fit. Cyan: per-track EMA.",
      "The EMA is keyed by track id, so a new id (frames",
      "100-109, id 3) restarts from the raw line.",
      "Skew window (55-69): watch the right beam's EMA",
      "creep toward the skew at 8% per frame.",
    ]);
  }

  function drawHeadingGates(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const rects = worldRect(p);
    const topRect = { x: rects.world.x, y: rects.world.y, w: rects.world.w, h: rects.world.h * 0.58 };
    const stripRect = { x: rects.world.x, y: rects.world.y + rects.world.h * 0.64, w: rects.world.w, h: rects.world.h * 0.36 };
    const st = trace.stages.find(s => s.side === "left") || trace.stages[0];
    const br = st && st.beamResult;
    const world = makeWorld(p, [frame.fcuPose, ...(st ? st.inputPoints : [])], 0.6, topRect);
    drawTitle(p, "Heading gates", "IsBeamReliableForHeading (extent, inliers, ratio) -> RateLimitHeading -> ShouldResetForHeadingJump");
    world.drawGrid();
    if (st) drawTrackPoints(world, st, 2.5);
    if (st && st.fit && st.fit.valid) {
      world.drawLine(st.fit.coefficients, br && br.headingValid ? Colors.accepted : Colors.rejected, 2.5);
      const inl = st.fitPoints.filter((_, i) => st.fit.inlierIndices.includes(i));
      const dir = { x: -st.fit.coefficients.b, y: st.fit.coefficients.a };
      let tMin = Infinity, tMax = -Infinity, pMin = null, pMax = null;
      for (const q of inl) { const t = dir.x * q.x + dir.y * q.y; if (t < tMin) { tMin = t; pMin = q; } if (t > tMax) { tMax = t; pMax = q; } }
      if (pMin && pMax) { world.drawWorldSegment(pMin, pMax, Colors.xoff, 4); label(world, pMax, `extent ${m3(tMax - tMin)} m`, Colors.xoff); }
    }
    const lo = Math.max(0, cur.frameIndex - 60), hi = cur.frameIndex;
    const req = state.series.reqHeading.slice(lo, hi + 1), pub = state.series.pubHeading.slice(lo, hi + 1);
    drawStrip(p, stripRect, 31.5, 35.5, [{ values: req, color: Colors.rawLine, weight: 2 }, { values: pub, color: Colors.accepted, weight: 3 }], hi - lo, [], [{ text: "requested (consensus)", color: Colors.rawLine }, { text: "published (rate-limited state)", color: Colors.accepted }]);
    panel(p, "Heading quality", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      br ? `extent ${m3(br.lineExtentM)} m  ${br.lineExtentM >= BP.heading_min_line_extent_m ? "PASS" : "FAIL"} (>= ${BP.heading_min_line_extent_m})` : "no beam",
      br ? `inliers ${br.inlierCount}  ${br.inlierCount >= BP.heading_min_inliers ? "PASS" : "FAIL"} (>= ${BP.heading_min_inliers})` : "",
      br ? `ratio ${(br.inlierRatio * 100).toFixed(1)}%  ${br.inlierRatio >= BP.heading_min_inlier_ratio ? "PASS" : "FAIL"} (>= ${BP.heading_min_inlier_ratio * 100}%)` : "",
      br ? `reason: ${br.headingRejectReason || "-"}` : "",
      `fresh heading: ${trace.freshHeading}`,
      trace.rateLimit ? `rate limit: ${trace.rateLimit.limited ? "LIMITED" : "free"}  dt ${trace.rateLimit.dt.toFixed(3)}  max step ${deg(trace.rateLimit.maxStep)} deg` : "rate limit: -",
      `heading_max_rate_deg_s ${BP.heading_max_rate_deg_s}`,
      `heading_jump_threshold_deg ${BP.heading_jump_threshold_deg}  required_count ${BP.heading_jump_required_count}`,
      `jump counter ${trace.headingJumpCount}${trace.reset ? "  RESET: " + trace.reset : ""}`,
      "",
      "A beam that fails a gate still feeds lateral;",
      "only its yaw vote is withheld (heading held).",
    ]);
  }

  function drawHeadingConsensus(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace } = cur;
    if (!trace) return;
    const beams = trace.stages.filter(s => s.beamResult).map(s => s.beamResult);
    const cons = trace.consensus;
    drawTitle(p, "Heading consensus", "ComputeConsensus: only heading-valid beams vote; weighted circular mean; reject beyond consensus_heading_outlier_threshold_deg; recompute");
    const rects = worldRect(p);
    const x0 = rects.world.x + 40, x1 = rects.world.x + rects.world.w - 40, y = rects.world.y + rects.world.h * 0.5;
    const lo = 25, hi = 55;
    const toX = dg => x0 + (dg - lo) / (hi - lo) * (x1 - x0);
    p.push();
    p.stroke(...Colors.grid); p.strokeWeight(2); p.line(x0, y, x1, y);
    p.noStroke(); p.fill(...Colors.muted); p.textSize(12);
    for (let dg = lo; dg <= hi; dg += 5) { p.stroke(...Colors.grid); p.line(toX(dg), y - 9, toX(dg), y + 9); p.noStroke(); p.text(`${dg}`, toX(dg) - 8, y + 28); }
    if (cons) {
      const thr = BP.consensus_heading_outlier_threshold_deg;
      p.noStroke(); p.fill(163, 230, 53, 40); p.rect(toX(cons.headingRad / DEG - thr), y - 70, toX(cons.headingRad / DEG + thr) - toX(cons.headingRad / DEG - thr), 140);
      p.stroke(...Colors.centerline); p.strokeWeight(4); p.line(toX(cons.headingRad / DEG), y - 70, toX(cons.headingRad / DEG), y + 70);
    }
    for (const b of beams) {
      const accepted = cons && cons.acceptedTrackIds.includes(b.trackId);
      const col = !b.headingValid ? Colors.muted : accepted ? Colors.accepted : Colors.rejected;
      p.noStroke(); p.fill(...col); p.circle(toX(b.heading / DEG), y, Math.max(8, Math.min(26, b.inlierCount / 40)));
      p.fill(230); p.textSize(11); p.text(`id ${b.trackId}${b.headingValid ? "" : " (gate)"}`, toX(b.heading / DEG) - 14, y - 22);
    }
    p.pop();
    panel(p, "Consensus gate", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      `max_beams_for_consensus ${BP.max_beams_for_consensus} (first N in detection order)`,
      `consensus_heading_outlier_threshold_deg ${BP.consensus_heading_outlier_threshold_deg}`,
      cons ? `${cons.valid ? "FRESH" : "HELD"}  mean ${deg(cons.headingRad)} deg` : "no consensus this frame",
      cons ? `accepted ${JSON.stringify(cons.acceptedTrackIds)}` : "",
      cons ? `rejected ${cons.rejectedSamples.map(r => `${r.trackId}@${deg(r.diffRad)}deg`).join(" ") || "-"}` : "",
      cons && cons.reason ? `reason: ${cons.reason}` : "",
      ...beams.map(b => `beam ${b.trackId}: ${deg(b.heading)} deg  w=${b.inlierCount}${b.headingValid ? "" : "  no vote: " + b.headingRejectReason}`),
      "",
      "Circle size = inlier weight. Grey = failed the",
      "heading gate (never votes). Red = outside the",
      "band around the initial weighted mean. If all are",
      "rejected the node holds the last heading.",
    ]);
  }

  function drawCenterline(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const world = makeWorld(p, framePoints(frame), 0.8);
    drawTitle(p, "Centerline", "BuildCenterlineMeasurement: dual = midpoint of aligned L/R lines (validated); single = best-inlier line offset by half width; frozen c fallback");
    world.drawGrid();
    drawFrameRacks(world, frame, 2);
    for (const st of trace.stages) if (st.beamResult) world.drawLine(G.alignLineToHeading(st.beamResult.planeCoefficients, trace.headingToPublish !== null ? trace.headingToPublish : trace.aisleState.headingRad), st.side === "left" ? Colors.faceLeft : Colors.faceRight, 2.5);
    const m = trace.measurementRaw;
    if (m && m.valid) world.drawLine({ a: m.a, b: m.b, c: m.c }, Colors.rawLine, 2);
    if (trace.aisleState.initialized) world.drawLine(stateLine(trace.aisleState), Colors.centerline, 3.5);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    panel(p, "Centerline estimate", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      `mode: ${trace.centerlineMode || "-"}`,
      trace.dualCheck ? `normals dot ${m3(trace.dualCheck.dot)} (>= 0.7)  half width ${m3(trace.dualCheck.halfWidth)} m (0.3..6)${trace.dualCheck.reason ? "  REJECT: " + trace.dualCheck.reason : ""}` : "dual not attempted",
      m && m.valid ? `measurement c ${m3(m.c)}  half width ${m3(m.halfWidthM)}  conf ${m.confidence}` : "no measurement",
      `state c ${m3(trace.aisleState.centerlineC)}  state half width ${m3(trace.aisleState.halfWidthM)}`,
      `expected_rack_distance ${BP.expected_rack_distance}`,
      `calibrated half width ${trace.calibration.isCalibrated ? m3(trace.calibration.halfWidth) : "-"}`,
      `aisle_tracker_dual_gain ${BP.aisle_tracker_dual_gain}  single_gain ${BP.aisle_tracker_single_gain}`,
      "",
      "Blue/yellow: aligned per-side lines. Orange: this",
      "frame's centerline measurement. Green: the EMA state.",
      "In the skew window the dual midpoint still uses the",
      "skewed line (dot 0.94 passes), so c drifts: a real",
      "node trait the consensus gate does not cover.",
    ]);
  }

  function drawCalibration(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const world = makeWorld(p, framePoints(frame), 0.8);
    drawTitle(p, "Calibration", "TryInitialCalibration anchors once on the first dual frame; later c = blend_alpha * measured + (1 - blend_alpha) * anchor");
    world.drawGrid();
    drawFrameRacks(world, frame, 1.8);
    const cal = trace.calibration;
    if (cal.isCalibrated) world.drawLine({ a: cal.a, b: cal.b, c: cal.c }, Colors.calib, 2);
    if (trace.measurementRaw && trace.measurementRaw.valid) world.drawLine({ a: trace.measurementRaw.a, b: trace.measurementRaw.b, c: trace.measurementRaw.c }, Colors.rawLine, 2);
    if (trace.measurement && trace.measurement.valid) world.drawLine({ a: trace.measurement.a, b: trace.measurement.b, c: trace.measurement.c }, Colors.accepted, 2.5);
    if (trace.aisleState.initialized) world.drawLine(stateLine(trace.aisleState), Colors.centerline, 3.5);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    panel(p, "Aisle calibration", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      `isCalibrated ${cal.isCalibrated}  fromSingleRack ${cal.fromSingleRack}`,
      `anchor c ${cal.isCalibrated ? m3(cal.c) : "-"}  half width ${cal.isCalibrated ? m3(cal.halfWidth) : "-"}`,
      trace.measurementRaw && trace.measurementRaw.valid ? `measured c ${m3(trace.measurementRaw.c)}` : "measured c -",
      trace.measurement && trace.measurement.valid ? `blended c ${m3(trace.measurement.c)}` : "blended c -",
      `state c ${m3(trace.aisleState.centerlineC)}`,
      `calibration_blend_alpha ${BP.calibration_blend_alpha}`,
      `allow_single_rack_calibration ${BP.allow_single_rack_calibration}`,
      "",
      "Cyan: the one-shot anchor (never re-anchored).",
      "Orange: raw measurement. Green: blended (30/70).",
      "Lime: EMA state fed by the blended value.",
      "Single-rack frames blend too once an anchor exists;",
      "they never create one unless the flag is on.",
    ]);
  }

  function drawLateralDriftFilter(p, state, simFrame) {
    const cur = current(state, simFrame);
    const rects = worldRect(p);
    const stripRect = { x: rects.world.x, y: rects.world.y + 20, w: rects.world.w, h: rects.world.h - 40 };
    drawTitle(p, "Lateral drift filter (on the centerline offset c)", "LateralDriftFilter::Update on c: jump detection -> hold until confirmed -> EMA -> output step limit");
    drawStrip(p, stripRect, -0.3, 0.9, [
      { values: state.series.rawDist, color: Colors.muted, weight: 1.5 },
      { values: state.series.filtDist, color: Colors.accepted, weight: 3 },
    ], cur.frameIndex, faultWindows(state.world), [{ text: "c from the aisle state", color: Colors.muted }, { text: "c filtered (TF translation)", color: Colors.accepted }]);
    const b = cur.trace && cur.trace.broadcast;
    const l = b && b.lateral;
    panel(p, "Lateral filter", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      l ? `c raw ${m3(l.rawM)}  c filtered ${m3(l.filteredM)}` : "no update this frame",
      l ? `raw delta ${m3(l.rawDeltaM)}  jumpDetected ${l.jumpDetected}` : "",
      l ? `held ${l.held}  jumpCount ${l.jumpCount}  jumpConfirmed ${l.jumpConfirmed}` : "",
      b ? `drone dist to line ${m3(b.distToCenterline)}  drone_y_to_centerline ${m3(F.droneYToCenterlineFromSignedError(b.distToCenterline))}` : "",
      "",
      `lateral_ema_alpha ${BP.lateral_ema_alpha}`,
      `lateral_jump_threshold_m ${BP.lateral_jump_threshold_m}`,
      `lateral_jump_confirm_frames ${BP.lateral_jump_confirm_frames}`,
      `lateral_jump_cluster_threshold_m ${BP.lateral_jump_cluster_threshold_m}`,
      `lateral_max_step_m ${BP.lateral_max_step_m}`,
      "",
      "The filter guards the LINE offset c, which the",
      "aisle-state EMA has already smoothed, so on this",
      "world it never holds. The drone's own motion (75+)",
      "never passes through it. The skew window (55-69)",
      "moves c: the dual midpoint leaks the skewed line,",
      "and the coefficient EMA remembers it ~40 frames.",
    ]);
  }

  function drawXOffset(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const xo = trace.xOffset;
    const w = state.world;
    const nearUprights = w.missionUprights.map(u => W.mapToOdom(w, u.start)).filter(o => Math.hypot(o.x - frame.fcuPose.x, o.y - frame.fcuPose.y) < 7);
    const world = makeWorld(p, [frame.fcuPose, ...nearUprights, ...frame.verticalDetections], 0.8);
    drawTitle(p, "X offset from vertical uprights", "UpdateXOffsetFromVerticalObservations: shift by current raw x, associate within pillar_match_range, median-reject, mean residual -> raw; EMA -> filtered");
    world.drawGrid();
    drawFrameRacks(world, frame, 1.5);
    const rangeM = Config.x_offset_correction.pillar_match_range;
    for (const u of w.missionUprights) {
      const s = world.toScreen(u.start);
      p.push(); p.noFill(); p.stroke(0, 220, 220, 80); p.circle(s.x, s.y, 2 * rangeM * world.scale); p.pop();
      world.drawPoints([u.start], Colors.map, 9, 230);
    }
    for (const dpt of frame.verticalDetections) world.drawPoints([dpt], Colors.rejected, 6, 220);
    if (xo && !xo.skipped) {
      for (const mt of xo.matches) {
        const kept = xo.keptMatches.includes(mt);
        world.drawPoints([mt.correctedObservation], [80, 140, 255], 7, 230);
        world.drawWorldSegment(mt.correctedObservation, mt.upright, kept ? Colors.xoff : Colors.rejected, kept ? 3 : 1.5);
      }
    }
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    const xc = Config.x_offset_correction;
    panel(p, "Pillar matching", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}`,
      xo && xo.skipped ? `skipped: ${xo.skipped}` : xo ? `matched ${xo.matches.length}  kept ${xo.keptMatches.length}  rejected ${xo.rejected}` : "-",
      xo && !xo.skipped ? `current x ${m3(xo.currentX)}  mean residual ${m3(xo.meanResidual)}` : "",
      xo && xo.selected ? `selected id ${xo.selected.upright.id} order ${xo.selected.upright.order} dist ${m3(xo.selected.distanceM)}` : "",
      `x raw ${m3(trace.xOffsetState.xOffsetRaw)}  filtered ${m3(trace.xOffsetState.xOffsetFiltered)}  has_x ${trace.xOffsetState.xOffsetHasMeasurement}`,
      `true odom lag ${w.odomOffset.along} m`,
      "",
      `pillar_match_range ${xc.pillar_match_range}`,
      `pillar_offset_outlier_threshold_m ${xc.pillar_offset_outlier_threshold_m}`,
      `pillar_lateral_score_weight ${xc.pillar_lateral_score_weight}`,
      `x_offset_ema_alpha ${xc.x_offset_ema_alpha}`,
      "",
      "Cyan: mission uprights (map) with the 1.0 m gate.",
      "Red: detections (odom). Blue: shifted by current x.",
      "Yellow: kept associations; red thin: median-rejected.",
    ]);
  }

  function drawCorrection(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame || !trace.broadcast) return;
    const b = trace.broadcast;
    const lat = { x: b.lateralX, y: b.lateralY }, corr = { x: b.correctedX, y: b.correctedY };
    const world = makeWorld(p, [frame.fcuPose, lat, corr, ...frame.tracks.flatMap(t => t.points.slice(0, 200))], 1.0);
    drawTitle(p, "Correction", "BroadcastVisionCorrectedTF: centerline c -> jump guard + EMA on c -> shift odom by c along the normal -> + x offset along heading -> transform");
    world.drawGrid();
    drawFrameRacks(world, frame, 1.5);
    world.drawLine({ a: b.a, b: b.b, c: b.cFiltered }, Colors.centerline, 3.5);
    world.drawWorldSegment(frame.fcuPose, lat, [255, 255, 255, 120], 1.5);
    world.drawPoints([lat], Colors.centerline, 7, 200); label(world, lat, "foot on centerline");
    const shifted = { x: frame.fcuPose.x + b.cFiltered * b.a, y: frame.fcuPose.y + b.cFiltered * b.b };
    world.drawWorldSegment(frame.fcuPose, shifted, Colors.centerline, 3);
    world.drawWorldSegment(shifted, corr, Colors.xoff, 3);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU (odom)");
    world.drawPose(corr, Colors.corrected, "corrected (odom)");
    panel(p, "Lateral + longitudinal", [
      `frame ${cur.frameIndex}  fault: ${faultText(cur)}${b.held ? "  (HELD correction)" : ""}`,
      `c raw ${m3(b.c)}  c filtered ${m3(b.cFiltered)}${b.lateral.held ? "  HELD" : ""}`,
      `drone distance to line ${m3(b.distToCenterline)}`,
      `y intercept (pose_offset_y) ${m3(b.yIntercept)}`,
      `drone_y_to_centerline ${m3(F.droneYToCenterlineFromSignedError(b.distToCenterline))}`,
      `x offset filtered ${m3(trace.xOffsetState.xOffsetFiltered)}`,
      `corrected (odom) ${m3(corr.x)}, ${m3(corr.y)}`,
      `corrected_pose (aisle frame) ${m3(b.tf.correctedPose.x)}, ${m3(b.tf.correctedPose.y)}  yaw ${deg(b.tf.correctedPose.yaw)}`,
      "",
      "Green arrow: shift by c, the same for every point",
      "(laser: -intercept*cos h). Yellow: x offset step.",
      "corrected_pose is R(-aisle_yaw) * corrected + delta:",
      "x = along-aisle position, y = drone's real distance",
      "from the middle (0 when centered).",
    ]);
  }

  function drawFrameAxes(world, origin, yaw, name, len = 1.2) {
    const xa = { x: origin.x + Math.cos(yaw) * len, y: origin.y + Math.sin(yaw) * len };
    const ya = { x: origin.x - Math.sin(yaw) * len * 0.75, y: origin.y + Math.cos(yaw) * len * 0.75 };
    world.drawWorldSegment(origin, xa, [248, 113, 113, 230], 4);
    world.drawWorldSegment(origin, ya, [82, 255, 168, 230], 4);
    label(world, origin, name);
  }
  function drawTfLogic(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame || !trace.broadcast) return;
    const tf = trace.broadcast.tf;
    const parent = { x: tf.mapToVisionOdom.x, y: tf.mapToVisionOdom.y, yaw: tf.mapToVisionOdom.yaw };
    const c = Math.cos(parent.yaw), s = Math.sin(parent.yaw);
    const child = { x: parent.x + c * tf.visionOdomToBase.x - s * tf.visionOdomToBase.y, y: parent.y + s * tf.visionOdomToBase.x + c * tf.visionOdomToBase.y, yaw: parent.yaw + tf.visionOdomToBase.yaw };
    const pts = [{ x: 0, y: 0 }, parent, child, tf.correctedPose, { x: -2, y: -2 }];
    const world = makeWorld(p, pts, 1.5);
    drawTitle(p, "TF logic", "map -> odom_vision_correction (delta, -aisle yaw) -> base_link_odom_vision_correction (RAW pose, RAW yaw); composed yaw = fcu - aisle");
    world.drawGrid();
    drawFrameAxes(world, { x: 0, y: 0 }, 0, "map");
    drawFrameAxes(world, parent, parent.yaw, Config.vision_correction.odom_frame);
    drawFrameAxes(world, child, child.yaw, Config.vision_correction.base_frame);
    world.drawPose(tf.correctedPose, Colors.corrected, "corrected_pose");
    world.drawWorldSegment({ x: 0, y: 0 }, parent, [255, 255, 255, 90], 1);
    world.drawWorldSegment(parent, child, [255, 255, 255, 90], 1);
    panel(p, "Yaw composition", [
      `frame ${cur.frameIndex}`,
      `aisle yaw ${deg(trace.broadcast.aisleYaw)} deg`,
      `raw FCU yaw ${deg(tf.rawYaw)} deg`,
      `map -> ${Config.vision_correction.odom_frame}: yaw ${deg(tf.correctionYaw)} deg`,
      `  translation (${m3(tf.mapToVisionOdom.x)}, ${m3(tf.mapToVisionOdom.y)})`,
      `${Config.vision_correction.odom_frame} -> base: yaw ${deg(tf.childYaw)} deg (raw)`,
      `  translation (${m3(tf.visionOdomToBase.x)}, ${m3(tf.visionOdomToBase.y)}) (raw pose)`,
      `composed yaw ${deg(tf.composedYaw)} deg = fcu - aisle`,
      `corrected_pose (${m3(tf.correctedPose.x)}, ${m3(tf.correctedPose.y)}) yaw ${deg(tf.correctedPose.yaw)}`,
      "",
      "The parent rotates odom by -aisle_yaw and carries",
      "the delta (x offset, c): a shift of the whole odom",
      "frame so the centerline is the x axis. The child is",
      "the raw FCU pose. Composition yields the FCU yaw",
      "relative to the aisle, which corrected_pose publishes.",
      "(Pinned by test_vision_correction_transform.cpp.)",
    ]);
  }

  function drawOutputsHold(p, state, simFrame) {
    const cur = current(state, simFrame);
    const rects = worldRect(p);
    const topRect = { x: rects.world.x, y: rects.world.y, w: rects.world.w, h: rects.world.h * 0.68 };
    const stripRect = { x: rects.world.x, y: rects.world.y + rects.world.h * 0.74, w: rects.world.w, h: rects.world.h * 0.26 };
    const lo = Math.max(0, cur.tickIndex - 90);
    const recent = state.ticks.slice(lo, cur.tickIndex + 1);
    const raw = recent.map(k => k.pose), corr = recent.filter(k => k.tick.published).map(k => k.tick.correctedPose);
    const world = makeWorld(p, [...raw, ...corr], 1.0, topRect);
    drawTitle(p, "Outputs and hold", "VisionCorrectionPropagationTimer: identity until ready, held correction on every tick, measurement keeps the perception stamp");
    world.drawGrid();
    for (let i = 1; i < raw.length; i += 1) world.drawWorldSegment(raw[i - 1], raw[i], Colors.fcu, 2);
    for (let i = 1; i < corr.length; i += 1) world.drawWorldSegment(corr[i - 1], corr[i], Colors.corrected, 2);
    const t = cur.tick.tick;   // the propagation output; cur.tick is the timeline entry
    if (t.published) world.drawPose(t.correctedPose, Colors.corrected, t.isIdentity ? "corrected (IDENTITY)" : "corrected");
    world.drawPose(cur.tick.pose, Colors.fcu, "raw pose");
    // timeline strip
    p.push();
    p.stroke(...Colors.grid); p.noFill(); p.rect(stripRect.x, stripRect.y, stripRect.w, stripRect.h);
    const n = state.ticks.length;
    const toX = k => stripRect.x + (k / (n - 1)) * stripRect.w;
    for (const f of state.world.faults) if (f.id === "dropout") { p.noStroke(); p.fill(255, 255, 255, 30); p.rect(toX(f.from * 3), stripRect.y, toX(f.to * 3 + 2) - toX(f.from * 3), stripRect.h); }
    for (const k of state.ticks) {
      if (k.trace) { p.stroke(...Colors.accepted); p.strokeWeight(1); p.line(toX(k.k), stripRect.y + stripRect.h * 0.55, toX(k.k), stripRect.y + stripRect.h * 0.85); }
      if (k.tick.published && k.tick.isIdentity) { p.stroke(...Colors.muted); p.line(toX(k.k), stripRect.y + stripRect.h * 0.2, toX(k.k), stripRect.y + stripRect.h * 0.45); }
    }
    p.stroke(230, 230, 230, 160); p.line(toX(cur.tickIndex), stripRect.y, toX(cur.tickIndex), stripRect.y + stripRect.h);
    p.noStroke(); p.fill(...Colors.muted); p.textSize(11);
    p.text("identity ticks", stripRect.x + 6, stripRect.y + stripRect.h * 0.4); p.text("perception frames", stripRect.x + 6, stripRect.y + stripRect.h * 0.8);
    p.pop();
    const vc = Config.vision_correction;
    const age = t.measurement ? (t.tickStamp - t.measurement.stamp) : null;
    panel(p, "Propagation timer", [
      `tick ${cur.tickIndex}  t ${t.tickStamp.toFixed(2)} s  frame ${cur.frameIndex}`,
      `fault: ${faultText(cur)}`,
      `published ${t.published}${t.reason ? "  reason: " + t.reason : ""}  isIdentity ${t.isIdentity}`,
      t.measurement ? `measurement stamp ${t.measurement.stamp.toFixed(2)} s  age ${age.toFixed(2)} s` : "measurement: none (identity placeholder)",
      t.measurement ? `centerline_yaw_deg ${t.measurement.centerlineYawDeg.toFixed(2)}` : "",
      t.measurement ? `pose_offset_y_m ${m3(t.measurement.poseOffsetYM)}  pose_offset_x_m ${m3(t.measurement.poseOffsetXM)}  has_x ${t.measurement.hasX}` : "",
      t.diagnostics ? `drone_y_to_centerline ${m3(t.diagnostics.droneYToCenterline)}` : "",
      "",
      `propagation_rate_hz ${vc.propagation_rate_hz} (sim: every tick)`,
      `publish_identity_until_ready ${vc.publish_identity_until_ready}`,
      `max_pose_age_sec ${vc.max_pose_age_sec}`,
      `max_correction_age_sec ${vc.max_correction_age_sec} (0 = no limit)`,
      "",
      "During the dropout (90-99) the TF and corrected",
      "pose keep moving with the raw pose while the",
      "measurement stamp stays frozen at frame 89.",
    ]);
  }

  function drawFailureCases(p, state, simFrame) {
    const cur = current(state, simFrame);
    const { trace, frame } = cur;
    if (!trace || !frame) return;
    const world = makeWorld(p, framePoints(frame), 0.8);
    drawTitle(p, "Failure cases", "The fault schedule drives the real pipeline; the panel shows the node's actual reaction");
    world.drawGrid();
    for (const st of trace.stages) {
      drawTrackPoints(world, st, 2);
      const acc = trace.consensus && trace.consensus.acceptedTrackIds.includes(st.trackId);
      if (st.fit && st.fit.valid) world.drawLine(st.fit.coefficients, !st.beamResult ? Colors.muted : !st.beamResult.headingValid ? Colors.muted : acc ? Colors.accepted : Colors.rejected, 2.5);
    }
    if (trace.aisleState.initialized) world.drawLine(stateLine(trace.aisleState), Colors.centerline, 3.5);
    world.drawPose(frame.fcuPose, Colors.fcu, "FCU");
    if (trace.broadcast) world.drawPose({ x: trace.broadcast.correctedX, y: trace.broadcast.correctedY, yaw: frame.fcuPose.yaw }, Colors.corrected, "corrected");
    const l = trace.broadcast && trace.broadcast.lateral;
    const reaction = [];
    if (cur.liveFrame === null) reaction.push("no frame delivered: timer republishes the held correction; measurement stamp frozen");
    if (trace.hold) reaction.push(`hold: "${trace.hold}" (PublishHeldVisionCorrection)`);
    if (trace.reset) reaction.push(`reset: ${trace.reset} (ResetTrackingState, lateral preserved)`);
    if (!trace.freshHeading && !trace.hold) reaction.push("heading held, lateral live (no heading-qualified beam or all rejected)");
    if (trace.consensus && trace.consensus.rejectedSamples.length) reaction.push(`consensus rejected ${trace.consensus.rejectedSamples.map(r => r.trackId).join(",")} (select_consensus_heading_samples)`);
    for (const st of trace.stages) if (st.beamResult && !st.beamResult.headingValid) reaction.push(`beam ${st.trackId} no vote: ${st.beamResult.headingRejectReason} (IsBeamReliableForHeading)`);
    if (l && l.held) reaction.push(`centerline c HELD jumpCount ${l.jumpCount} (LateralDriftFilter on c)`);
    if (l && l.jumpConfirmed) reaction.push("centerline c jump CONFIRMED (LateralDriftFilter on c)");
    if (cur.fault && cur.fault.id === "glitch-lateral") reaction.push("odom glitch: pose and racks move together; the aisle-state EMA absorbs the line shift, so the corrected pose follows the glitched odom for these frames");
    if (cur.fault && cur.fault.id === "displacement") reaction.push("true displacement: corrected_pose y reflects it at once (line-based shift, no filter on the drone's motion)");
    if (trace.centerlineMode === "dual-fallback-frozen-c") reaction.push("dual failed: c frozen, heading-only (BuildCenterlineMeasurement)");
    for (const st of trace.stages) if (st.beamResult && st.beamResult.smoothingRestarted && cur.frameIndex > 0) reaction.push(`track ${st.trackId}: coefficient EMA restarted (BuildBeamResultFromFit)`);
    if (!reaction.length) reaction.push("normal: fresh heading, dual centerline, live lateral");
    panel(p, cur.fault ? cur.fault.label : "normal", [
      `frame ${cur.frameIndex}  fault: ${cur.fault ? cur.fault.id : "none"}${cur.fault ? ` (${cur.fault.from}-${cur.fault.to})` : ""}`,
      `mode ${trace.centerlineMode || "-"}  fresh ${trace.freshHeading}`,
      "",
      "Node reaction:",
      ...reaction.map(r => "  " + r),
      "",
      "Green line: accepted beam. Red: rejected by the",
      "consensus gate. Grey: failed the heading gate.",
      "The rule: never make a confident correction from",
      "evidence that no longer describes the same racks.",
    ]);
  }

  const Drawers = {
    "pipeline": drawPipeline, "synthetic-input": drawSyntheticInput, "accumulation": drawAccumulation,
    "rotation-filter": drawRotationFilter, "line-fit": drawLineFit, "coefficient-smoothing": drawSmoothing,
    "heading-gates": drawHeadingGates, "heading-consensus": drawHeadingConsensus, "centerline": drawCenterline,
    "calibration": drawCalibration, "lateral-drift-filter": drawLateralDriftFilter, "x-offset": drawXOffset,
    "correction": drawCorrection, "tf-logic": drawTfLogic, "outputs-hold": drawOutputsHold, "failure-cases": drawFailureCases,
  };

  function drawDemo(p, state, demoId, simFrame) {
    p.background(...Colors.bg);
    (Drawers[demoId] || Drawers.pipeline)(p, state, simFrame);
  }

  global.VisionPipelineP5Demos = { Colors, DemoIds, DemoLabels, createDemoState, drawDemo, demoIds: DemoIds, labels: DemoLabels };
}(globalThis));

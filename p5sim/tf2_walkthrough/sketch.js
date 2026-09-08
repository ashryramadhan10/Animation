(function startTF2Walkthrough(root) {
  "use strict";

  const COLORS = {
    background: [7, 10, 15],
    grid: [31, 39, 54],
    gridStrong: [47, 58, 78],
    text: [226, 233, 243],
    muted: [127, 143, 164],
    faint: [76, 89, 108],
    x: [255, 105, 105],
    y: [73, 226, 148],
    z: [102, 158, 255],
    accent: [245, 196, 81],
    cyan: [90, 210, 230],
    purple: [181, 132, 255],
  };

  const tutorial = {
    chapterIndex: 0,
    paused: false,
    time: 8,
    queryTime: 8,
    source: "base_link",
    target: "map",
    showGhosts: true,
    draggingFrame: false,
    dragOffset: { x: 0, y: 0, yaw: 0 },
    orbitYaw: -0.75,
    orbitPitch: -0.42,
    tree: null,
    lookup: null,
    error: null,
    scenario: null,
    lastUiFrame: -1,
  };

  const dom = {};
  let canvas;

  function chapter() {
    return root.TF2_CHAPTERS[tutorial.chapterIndex];
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheDom() {
    [
      "canvasHost", "chapterRail", "chapterCounter", "chapterDuration",
      "chapterEyebrow", "chapterTitle", "chapterSummary", "chapterDetails",
      "chapterHint", "rosCode", "previousButton", "nextButton", "previousLabel",
      "nextLabel", "pauseButton", "resetButton", "modeBadge", "zLegend",
      "sourceFrame", "targetFrame", "queryTime", "queryTimeValue", "timeControl",
      "showGhosts", "lookupTimeBadge", "tfTreeHost", "lookupStatus",
      "transformResult", "lookupTrace", "errorPanel", "compositionReadout",
      "interactionHint", "practiceLink",
    ].forEach((id) => { dom[id] = byId(id); });
  }

  function createChapterRail() {
    dom.chapterRail.innerHTML = "";
    root.TF2_CHAPTERS.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chapter-step";
      button.textContent = item.number;
      button.title = item.title;
      button.setAttribute("aria-label", `Chapter ${index + 1}: ${item.title}`);
      button.addEventListener("click", () => setChapter(index));
      dom.chapterRail.append(button);
    });
  }

  function bindControls() {
    dom.previousButton.addEventListener("click", () => setChapter(tutorial.chapterIndex - 1));
    dom.nextButton.addEventListener("click", () => setChapter(tutorial.chapterIndex + 1));
    dom.pauseButton.addEventListener("click", togglePause);
    dom.resetButton.addEventListener("click", resetChapter);
    dom.sourceFrame.addEventListener("change", () => {
      tutorial.source = dom.sourceFrame.value;
      refreshLookup();
      renderDynamicUi();
    });
    dom.targetFrame.addEventListener("change", () => {
      tutorial.target = dom.targetFrame.value;
      refreshLookup();
      renderDynamicUi();
    });
    dom.queryTime.addEventListener("input", () => {
      tutorial.queryTime = Number(dom.queryTime.value);
      refreshLookup();
      renderDynamicUi();
    });
    dom.showGhosts.addEventListener("change", () => {
      tutorial.showGhosts = dom.showGhosts.checked;
    });
    root.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === "SELECT" || tag === "INPUT") return;
      if (event.key === "ArrowLeft") setChapter(tutorial.chapterIndex - 1);
      if (event.key === "ArrowRight") setChapter(tutorial.chapterIndex + 1);
      if (event.key === " ") {
        event.preventDefault();
        togglePause();
      }
      if (event.key.toLowerCase() === "r") resetChapter();
    });
  }

  function chapterIndexFromHash() {
    const id = root.location.hash.replace(/^#/, "");
    const index = root.TF2_CHAPTERS.findIndex((item) => item.id === id);
    return index >= 0 ? index : 0;
  }

  function setChapter(index) {
    const bounded = Math.max(0, Math.min(root.TF2_CHAPTERS.length - 1, index));
    tutorial.chapterIndex = bounded;
    resetChapter(false);
    root.history.replaceState(null, "", `#${chapter().id}`);
    renderChapterUi();
  }

  function resetChapter(render = true) {
    const current = chapter();
    tutorial.time = current.scene === "time" ? 8 : 6;
    tutorial.queryTime = current.defaultQuery.timeMode === "slider" ? 5.5 : tutorial.time;
    tutorial.source = current.defaultQuery.source;
    tutorial.target = current.defaultQuery.target;
    tutorial.paused = current.scene === "time";
    tutorial.dragOffset = { x: 0, y: 0, yaw: 0 };
    tutorial.error = null;
    tutorial.lookup = null;
    dom.pauseButton.textContent = tutorial.paused ? "Play" : "Pause";
    if (render) renderChapterUi();
  }

  function togglePause() {
    tutorial.paused = !tutorial.paused;
    dom.pauseButton.textContent = tutorial.paused ? "Play" : "Pause";
  }

  const PRACTICE_PUZZLE_BY_CHAPTER = {
    "matrix-stack": "transform-point",
    "data-types": "transform-vector",
    composition: "compose",
    tree: "store-edge",
    "mobile-chain": "lookup-transform",
    "frame-roles": "correction-from-pose",
    broadcasters: "sample-edge",
    lookup: "lookup-transform",
    "stamped-data": "transform-pose",
    "time-buffer": "interpolate-transform",
    "sensor-scenario": "laser-point-to-map",
    se3: "rotate-by-quaternion",
    sandbox: "stamped-lookup",
  };

  function renderChapterUi() {
    const current = chapter();
    dom.chapterCounter.textContent = `${current.number} / ${String(root.TF2_CHAPTERS.length).padStart(2, "0")}`;
    dom.chapterDuration.textContent = current.duration;
    dom.chapterEyebrow.textContent = `${current.number} · ${current.eyebrow}`;
    dom.chapterTitle.textContent = current.title;
    dom.chapterSummary.textContent = current.summary;
    dom.chapterDetails.innerHTML = "";
    current.details.forEach((detail) => {
      const item = document.createElement("li");
      item.textContent = detail;
      dom.chapterDetails.append(item);
    });
    dom.chapterHint.textContent = current.hint;
    dom.practiceLink.href = "puzzle-lab.html#" + PRACTICE_PUZZLE_BY_CHAPTER[current.id];
    dom.rosCode.textContent = current.rosCode;
    dom.modeBadge.textContent = current.scene === "se3" ? "SE(3)" : "SE(2)";
    dom.zLegend.hidden = current.scene !== "se3";
    dom.timeControl.hidden = !["time", "sandbox"].includes(current.scene);
    dom.previousButton.disabled = tutorial.chapterIndex === 0;
    dom.nextButton.disabled = tutorial.chapterIndex === root.TF2_CHAPTERS.length - 1;
    dom.previousLabel.textContent = tutorial.chapterIndex > 0
      ? root.TF2_CHAPTERS[tutorial.chapterIndex - 1].title
      : "Start";
    dom.nextLabel.textContent = tutorial.chapterIndex < root.TF2_CHAPTERS.length - 1
      ? root.TF2_CHAPTERS[tutorial.chapterIndex + 1].title
      : "Complete";
    [...dom.chapterRail.children].forEach((button, index) => {
      button.classList.toggle("is-active", index === tutorial.chapterIndex);
      button.classList.toggle("is-complete", index < tutorial.chapterIndex);
      button.setAttribute("aria-current", index === tutorial.chapterIndex ? "step" : "false");
    });
    const activeStep = dom.chapterRail.children[tutorial.chapterIndex];
    activeStep?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    tutorial.lastUiFrame = -1;
  }

  function sampleTimes(endTime) {
    const end = Math.max(0.5, Math.min(12, endTime));
    const times = [];
    for (let time = 0; time <= end + 1e-9; time += 0.5) {
      times.push(Number(time.toFixed(2)));
    }
    if (Math.abs(times[times.length - 1] - end) > 1e-6) times.push(end);
    return times;
  }

  function odomFromBaseAt(time) {
    return new root.Transform2D(
      -3.2 + time * 0.58,
      0.35 * Math.sin(time * 0.7),
      0.12 * Math.sin(time * 0.45)
    );
  }

  function mapFromOdomAt(time, showCorrection) {
    const correctionActive = showCorrection && time >= 6;
    return new root.Transform2D(
      correctionActive ? -1.15 : -0.045 * time,
      correctionActive ? 0.58 : 0.025 * time,
      correctionActive ? -0.13 : -0.008 * time
    );
  }

  function publishDynamic(tree, parent, child, transformAt, authority, endTime) {
    sampleTimes(endTime).forEach((time) => {
      tree.setTransform({
        parent,
        child,
        transform: transformAt(time),
        time,
        authority,
        isStatic: false,
      });
    });
  }

  function publishMobileTree(tree, scene, endTime) {
    const correctionScene = scene === "roles";
    const draggableScene = scene === "tree" || scene === "sandbox";
    publishDynamic(
      tree,
      "map",
      "odom",
      (time) => mapFromOdomAt(time, correctionScene),
      "localization",
      endTime
    );
    publishDynamic(
      tree,
      "odom",
      "base_link",
      (time) => {
        const pose = odomFromBaseAt(time);
        return draggableScene
          ? new root.Transform2D(
            pose.x + tutorial.dragOffset.x,
            pose.y + tutorial.dragOffset.y,
            pose.yaw + tutorial.dragOffset.yaw
          )
          : pose;
      },
      "wheel_odometry",
      endTime
    );
    tree.setTransform({
      parent: "base_link",
      child: "laser",
      transform: new root.Transform2D(0.72, 0, 0),
      authority: "robot_state_publisher",
      isStatic: true,
    });
    tree.setTransform({
      parent: "base_link",
      child: "camera",
      transform: new root.Transform2D(0.32, 0.28, 0.06),
      authority: "robot_state_publisher",
      isStatic: true,
    });
    if (scene === "se3") {
      tree.setTransform({
        parent: "camera",
        child: "camera_optical",
        transform: new root.Transform2D(0.12, 0, 0),
        authority: "robot_state_publisher",
        isStatic: true,
      });
    }
  }

  function buildScenario(scene, endTime) {
    const tree = new root.TransformTree({ maxSamples: 80 });
    const dragged = tutorial.dragOffset;

    if (scene === "matrix") {
      tree.setTransform({ parent: "map", child: "base_link", transform: new root.Transform2D(1.4 + dragged.x, -0.3 + dragged.y, 0.35 + dragged.yaw), isStatic: true, authority: "p5_matrix_stack" });
    } else if (scene === "types") {
      tree.setTransform({ parent: "map", child: "sensor", transform: new root.Transform2D(1.3, -0.35, 0.55), isStatic: true, authority: "example" });
    } else if (scene === "compose") {
      tree.setTransform({ parent: "map", child: "base_link", transform: new root.Transform2D(-0.8 + dragged.x, 0.15 + dragged.y, 0.4 + dragged.yaw), isStatic: true, authority: "example" });
      tree.setTransform({ parent: "base_link", child: "laser", transform: new root.Transform2D(1.15, 0.25, -0.22), isStatic: true, authority: "robot_state_publisher" });
    } else if (scene === "tree") {
      publishMobileTree(tree, scene, endTime);
      tree.setTransform({ parent: "world", child: "orphan_camera", transform: new root.Transform2D(1.4, 0, 0), isStatic: true, authority: "unconnected_demo" });
    } else {
      publishMobileTree(tree, scene, endTime);
    }

    return {
      tree,
      scene,
      sceneTime: Math.max(0, Math.min(endTime, 12)),
      odomFromBaseAt,
      mapFromOdomAt: (time) => mapFromOdomAt(time, scene === "roles"),
    };
  }

  function availableFrames(tree) {
    return [...tree.frames].sort((a, b) => {
      const priority = ["map", "odom", "base_link", "laser", "camera", "camera_optical"];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return a.localeCompare(b);
    });
  }

  function syncFrameSelects() {
    const frames = availableFrames(tutorial.tree);
    if (!frames.includes(tutorial.source)) tutorial.source = frames[frames.length - 1];
    if (!frames.includes(tutorial.target)) tutorial.target = frames[0];

    for (const select of [dom.targetFrame, dom.sourceFrame]) {
      const selected = select === dom.targetFrame ? tutorial.target : tutorial.source;
      const signature = frames.join("|");
      if (select.dataset.frames !== signature) {
        select.innerHTML = "";
        frames.forEach((frame) => {
          const option = document.createElement("option");
          option.value = frame;
          option.textContent = frame;
          select.append(option);
        });
        select.dataset.frames = signature;
      }
      select.value = selected;
    }
  }

  function lookupTimeForChapter() {
    return chapter().defaultQuery.timeMode === "slider" ? tutorial.queryTime : null;
  }

  function refreshScenario() {
    tutorial.scenario = buildScenario(chapter().scene, tutorial.time);
    tutorial.tree = tutorial.scenario.tree;
    syncFrameSelects();
    refreshLookup();
  }

  function refreshLookup() {
    tutorial.error = null;
    tutorial.lookup = null;
    try {
      tutorial.lookup = tutorial.tree.lookup(
        tutorial.target,
        tutorial.source,
        lookupTimeForChapter()
      );
    } catch (error) {
      tutorial.error = error;
    }
  }

  function formatNumber(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function formatDegrees(radians) {
    return `${formatNumber(radians * 180 / Math.PI, 1)}°`;
  }

  function renderTransformResult() {
    if (chapter().scene === "se3") {
      const yaw = 0.7 + 0.16 * Math.sin(tutorial.time * 0.4);
      const rotation = root.Quaternion.fromEuler(-0.25, 0.38, yaw);
      const transform = new root.Transform3D({ x: 1.4, y: 0.8, z: 1.1 }, rotation);
      const cells = [
        ["x / y / z", `${formatNumber(transform.translation.x)} / ${formatNumber(transform.translation.y)} / ${formatNumber(transform.translation.z)}`],
        ["qx / qy", `${formatNumber(rotation.x, 3)} / ${formatNumber(rotation.y, 3)}`],
        ["qz / qw", `${formatNumber(rotation.z, 3)} / ${formatNumber(rotation.w, 3)}`],
      ];
      dom.transformResult.innerHTML = cells.map(([label, value]) => `<div class="value-cell"><span>${label}</span><strong>${value}</strong></div>`).join("");
      return;
    }

    if (!tutorial.lookup) {
      dom.transformResult.innerHTML = "";
      return;
    }
    const transform = tutorial.lookup.transform;
    const cells = [
      ["x", `${formatNumber(transform.x)} m`],
      ["y", `${formatNumber(transform.y)} m`],
      ["yaw", formatDegrees(transform.yaw)],
    ];
    dom.transformResult.innerHTML = cells.map(([label, value]) => `<div class="value-cell"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function renderLookupTrace() {
    dom.lookupTrace.innerHTML = "";
    if (!tutorial.lookup) return;
    if (!tutorial.lookup.path.length) {
      dom.lookupTrace.innerHTML = '<span class="trace-step">identity: same frame</span>';
      return;
    }
    tutorial.lookup.path.forEach((step) => {
      const item = document.createElement("span");
      item.className = `trace-step${step.inverted ? " is-inverse" : ""}`;
      item.textContent = `${step.from} → ${step.to}${step.inverted ? " · inverse" : ""}`;
      item.title = `authority: ${step.authority}`;
      dom.lookupTrace.append(item);
    });
  }

  function renderTree() {
    dom.tfTreeHost.innerHTML = "";
    let snapshot;
    try {
      snapshot = tutorial.tree.snapshot(tutorial.scenario.sceneTime);
    } catch (error) {
      return;
    }
    const active = new Map();
    tutorial.lookup?.path.forEach((step) => active.set(`${step.parent}>${step.child}`, step));
    snapshot.edges.forEach((edge) => {
      const key = `${edge.parent}>${edge.child}`;
      const step = active.get(key);
      const row = document.createElement("div");
      row.className = "tree-row";
      const parent = document.createElement("span");
      parent.className = "tree-node";
      parent.textContent = edge.parent;
      const link = document.createElement("span");
      link.className = `tree-edge${edge.isStatic ? " is-static" : ""}${step ? " is-active" : ""}`;
      link.title = `${edge.authority} · ${edge.isStatic ? "static" : `dynamic @ ${formatNumber(snapshot.time, 1)}s`}`;
      const badge = document.createElement("span");
      badge.textContent = step?.inverted ? "inverse" : edge.isStatic ? "static" : "dynamic";
      link.append(badge);
      const child = document.createElement("span");
      child.className = "tree-node";
      child.textContent = edge.child;
      row.append(parent, link, child);
      dom.tfTreeHost.append(row);
    });
  }

  function friendlyError(error) {
    const fixes = {
      PAST_EXTRAPOLATION: "Choose a time at or after the oldest buffered sample.",
      FUTURE_EXTRAPOLATION: "Wait for a newer transform or request an earlier time.",
      NO_COMMON_TIME: "Choose a timestamp covered by every dynamic edge in the path.",
      DISCONNECTED: "Connect both frames under one root before requesting the lookup.",
      UNKNOWN_FRAME: "Check the frame spelling and wait until its broadcaster is available.",
      DUPLICATE_PARENT: "Give each child exactly one parent authority.",
      CYCLE: "Remove the edge that makes a frame its own ancestor.",
    };
    return `${error.code}: ${error.message}\n${fixes[error.code] || "Inspect the requested frames and time."}`;
  }

  function renderDynamicUi() {
    const isLatest = chapter().defaultQuery.timeMode !== "slider";
    const effectiveTime = tutorial.lookup?.time ?? tutorial.queryTime;
    dom.queryTime.value = String(tutorial.queryTime);
    dom.queryTimeValue.textContent = `${formatNumber(tutorial.queryTime, 1)} s`;
    dom.lookupTimeBadge.textContent = isLatest ? `latest · ${formatNumber(effectiveTime, 1)} s` : `${formatNumber(tutorial.queryTime, 1)} s`;
    dom.lookupStatus.textContent = tutorial.error ? "unavailable" : "available";
    dom.lookupStatus.className = `status-pill ${tutorial.error ? "status-error" : "status-ok"}`;
    dom.errorPanel.hidden = !tutorial.error;
    dom.errorPanel.textContent = tutorial.error ? friendlyError(tutorial.error) : "";
    renderTransformResult();
    renderLookupTrace();
    renderTree();
    dom.compositionReadout.textContent = tutorial.lookup
      ? `T_${tutorial.target}_${tutorial.source} · ${tutorial.lookup.path.map((step) => `T_${step.to}_${step.from}`).join(" × ") || "I"}`
      : `T_${tutorial.target}_${tutorial.source} · unavailable at requested time`;
    dom.interactionHint.textContent = chapter().hint;
  }

  function screenWorld() {
    return {
      x: width * 0.45,
      y: height * 0.54,
      scale: Math.max(42, Math.min(width / 11.5, height / 8.3)),
    };
  }

  function toScreen(point) {
    const world = screenWorld();
    return { x: world.x + point.x * world.scale, y: world.y - point.y * world.scale };
  }

  function toWorld(point) {
    const world = screenWorld();
    return { x: (point.x - world.x) / world.scale, y: (world.y - point.y) / world.scale };
  }

  function drawGrid() {
    const world = screenWorld();
    push();
    strokeWeight(1);
    for (let x = -8; x <= 8; x += 1) {
      const a = toScreen({ x, y: -6 });
      const b = toScreen({ x, y: 6 });
      stroke(...(x === 0 ? COLORS.gridStrong : COLORS.grid));
      line(a.x, a.y, b.x, b.y);
    }
    for (let y = -6; y <= 6; y += 1) {
      const a = toScreen({ x: -8, y });
      const b = toScreen({ x: 8, y });
      stroke(...(y === 0 ? COLORS.gridStrong : COLORS.grid));
      line(a.x, a.y, b.x, b.y);
    }
    noStroke();
    fill(...COLORS.faint);
    textSize(10);
    textFont("monospace");
    text(`1 grid = 1 m`, 15, height - 18);
    textAlign(RIGHT, BASELINE);
    text(`t = ${formatNumber(tutorial.scenario.sceneTime, 1)} s`, width - 15, height - 18);
    textAlign(LEFT, BASELINE);
    pop();
    return world;
  }

  function arrowHead(x, y, angle, color, size = 6) {
    push();
    translate(x, y);
    rotate(angle);
    noStroke();
    fill(...color);
    triangle(-size, -size * 0.55, -size, size * 0.55, size, 0);
    pop();
  }

  function drawArrow(from, to, color, weight = 2, dashed = false) {
    push();
    stroke(...color);
    strokeWeight(weight);
    if (dashed && drawingContext?.setLineDash) drawingContext.setLineDash([7, 6]);
    line(from.x, from.y, to.x, to.y);
    if (drawingContext?.setLineDash) drawingContext.setLineDash([]);
    arrowHead(to.x, to.y, Math.atan2(to.y - from.y, to.x - from.x), color, 5 + weight);
    pop();
  }

  function withFrame(mapFromFrame, drawLocal) {
    const origin = toScreen({ x: mapFromFrame.x, y: mapFromFrame.y });
    const scale = screenWorld().scale;
    push();
    translate(origin.x, origin.y);
    rotate(-mapFromFrame.yaw);
    scaleCanvas(scale);
    drawLocal();
    pop();
  }

  function scaleCanvas(amount) {
    scale(amount, amount);
  }

  function drawLocalAxes(label, length = 0.85, alpha = 255) {
    push();
    strokeWeight(3 / screenWorld().scale);
    stroke(COLORS.x[0], COLORS.x[1], COLORS.x[2], alpha);
    line(0, 0, length, 0);
    stroke(COLORS.y[0], COLORS.y[1], COLORS.y[2], alpha);
    line(0, 0, 0, -length);
    noStroke();
    fill(COLORS.text[0], COLORS.text[1], COLORS.text[2], alpha);
    textSize(11 / screenWorld().scale);
    textFont("monospace");
    push();
    scale(1, -1);
    text(label, 0.08, 0.2);
    pop();
    pop();
  }

  function drawFrameAt(transform, label, options = {}) {
    withFrame(transform, () => drawLocalAxes(label, options.length || 0.85, options.alpha ?? 255));
  }

  function frameInMap(frame, time = tutorial.scenario.sceneTime) {
    if (frame === "map") return root.Transform2D.identity();
    try {
      return tutorial.tree.lookup("map", frame, time).transform;
    } catch (error) {
      return null;
    }
  }

  function drawRobot(mapFromBase, alpha = 255) {
    if (!mapFromBase) return;
    withFrame(mapFromBase, () => {
      stroke(COLORS.text[0], COLORS.text[1], COLORS.text[2], alpha);
      strokeWeight(2 / screenWorld().scale);
      fill(255, 255, 255, Math.min(alpha, 44));
      triangle(-0.45, -0.3, -0.45, 0.3, 0.52, 0);
      noFill();
      stroke(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2], alpha);
      circle(-0.1, 0, 0.78);
    });
  }

  function drawSensor(mapFromSensor, label, color) {
    if (!mapFromSensor) return;
    const origin = toScreen(mapFromSensor);
    push();
    noStroke();
    fill(...color);
    circle(origin.x, origin.y, 8);
    fill(...COLORS.muted);
    textFont("monospace");
    textSize(10);
    text(label, origin.x + 7, origin.y + 13);
    pop();
  }

  function drawLabel(textValue, point, color = COLORS.text) {
    const screen = toScreen(point);
    push();
    noStroke();
    fill(...color);
    textFont("monospace");
    textSize(11);
    text(textValue, screen.x + 7, screen.y - 8);
    pop();
  }

  function drawPoseHistory(scene) {
    if (!tutorial.showGhosts || !["mobile", "roles", "authority", "lookup", "stamped", "time", "sensor", "sandbox", "se3"].includes(scene)) return;
    push();
    noFill();
    strokeWeight(1.2);
    for (let time = 0; time <= tutorial.scenario.sceneTime; time += 0.75) {
      const odomFromBase = tutorial.scenario.odomFromBaseAt(time);
      const mapFromOdom = tutorial.scenario.mapFromOdomAt(time);
      const mapFromBase = mapFromOdom.compose(odomFromBase);
      const point = toScreen(mapFromBase);
      stroke(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2], 90);
      circle(point.x, point.y, 4);
    }
    pop();
  }

  function drawTransformConnection(a, b, label) {
    const from = toScreen(a);
    const to = toScreen(b);
    drawArrow(from, to, COLORS.accent, 1.6, true);
    push();
    noStroke();
    fill(...COLORS.accent);
    textFont("monospace");
    textSize(10);
    text(label, (from.x + to.x) / 2 + 5, (from.y + to.y) / 2 - 7);
    pop();
  }

  function drawMatrixScene() {
    const mapFromBase = frameInMap("base_link", 0);
    drawFrameAt(root.Transform2D.identity(), "map", { length: 1.05 });
    drawFrameAt(mapFromBase, "base_link", { length: 0.9 });
    drawRobot(mapFromBase);
    const localPoint = { x: 1.25, y: 0.72 };
    const mapPoint = mapFromBase.applyPoint(localPoint);
    const start = toScreen(mapFromBase);
    const end = toScreen(mapPoint);
    drawArrow(start, end, COLORS.purple, 2);
    push();
    noStroke();
    fill(...COLORS.purple);
    circle(end.x, end.y, 9);
    pop();
    drawLabel("p = (1.25, 0.72) in base_link", mapPoint, COLORS.purple);
  }

  function drawTypesScene() {
    const mapFromSensor = frameInMap("sensor", 0);
    drawFrameAt(root.Transform2D.identity(), "map");
    drawFrameAt(mapFromSensor, "sensor");
    const local = { x: 1.3, y: 0.45 };
    const point = mapFromSensor.applyPoint(local);
    const vector = mapFromSensor.applyVector(local);
    const sensorOrigin = toScreen(mapFromSensor);
    const pointScreen = toScreen(point);
    const vectorEnd = {
      x: sensorOrigin.x + vector.x * screenWorld().scale,
      y: sensorOrigin.y - vector.y * screenWorld().scale,
    };
    drawArrow(sensorOrigin, pointScreen, COLORS.purple, 2.4);
    drawArrow({ x: 74, y: 100 }, { x: 74 + vector.x * 45, y: 100 - vector.y * 45 }, COLORS.cyan, 2.4);
    noStroke();
    fill(...COLORS.purple);
    circle(pointScreen.x, pointScreen.y, 9);
    fill(...COLORS.text);
    textFont("monospace");
    textSize(11);
    text("point: rotation + translation", 28, 62);
    fill(...COLORS.cyan);
    text("vector: rotation only", 28, 84);
    drawArrow(sensorOrigin, vectorEnd, COLORS.cyan, 1.2, true);
  }

  function drawCompositionScene() {
    const mapFromBase = frameInMap("base_link", 0);
    const mapFromLaser = frameInMap("laser", 0);
    drawFrameAt(root.Transform2D.identity(), "map");
    drawFrameAt(mapFromBase, "base_link");
    drawFrameAt(mapFromLaser, "laser");
    drawRobot(mapFromBase);
    drawTransformConnection({ x: 0, y: 0 }, mapFromBase, "T_map_base");
    drawTransformConnection(mapFromBase, mapFromLaser, "T_base_laser");
  }

  function drawMobileScene(scene) {
    const time = tutorial.scenario.sceneTime;
    const map = root.Transform2D.identity();
    const odom = frameInMap("odom", time);
    const base = frameInMap("base_link", time);
    const laser = frameInMap("laser", time);
    const cameraFrame = frameInMap("camera", time);
    drawPoseHistory(scene);
    drawFrameAt(map, "map", { length: 1.05 });
    drawFrameAt(odom, "odom", { length: 0.88, alpha: 190 });
    drawFrameAt(base, "base_link", { length: 0.78 });
    drawRobot(base);
    drawSensor(laser, "laser", COLORS.accent);
    drawSensor(cameraFrame, "camera", COLORS.cyan);

    if (scene === "roles") {
      const before = tutorial.scenario.mapFromOdomAt(5.9);
      const after = tutorial.scenario.mapFromOdomAt(6.1);
      drawTransformConnection(before, after, "localization correction");
      const pulse = Math.abs(time - 6) < 0.7;
      if (pulse) {
        noFill();
        stroke(...COLORS.accent);
        strokeWeight(2);
        const location = toScreen(odom);
        circle(location.x, location.y, 36 + 12 * Math.sin(frameCount * 0.15));
      }
    }

    if (scene === "authority") drawAuthorityLabels(time);
    if (scene === "lookup" || scene === "sandbox") drawLookupInWorld(time);
    if (scene === "stamped") drawStampedData(time);
    if (scene === "time") drawTimeBuffer(time);
    if (scene === "sensor") drawSensorScenario(time);
  }

  function drawAuthorityLabels(time) {
    const labels = [
      [frameInMap("odom", time), "localization · dynamic", COLORS.purple],
      [frameInMap("base_link", time), "wheel_odometry · dynamic", COLORS.cyan],
      [frameInMap("laser", time), "robot_state_publisher · static", COLORS.accent],
    ];
    labels.forEach(([pose, label, color]) => {
      if (pose) drawLabel(label, { x: pose.x, y: pose.y - 0.55 }, color);
    });
  }

  function drawLookupInWorld(time) {
    if (!tutorial.lookup) return;
    tutorial.lookup.path.forEach((step, index) => {
      const fromPose = frameInMap(step.from, time);
      const toPose = frameInMap(step.to, time);
      if (!fromPose || !toPose) return;
      const from = toScreen(fromPose);
      const to = toScreen(toPose);
      drawArrow(from, to, COLORS.accent, 2 + index * 0.15, step.isStatic);
    });
  }

  function drawStampedData(time) {
    const laser = frameInMap("laser", time);
    if (!laser) return;
    const localPoint = { x: 1.15, y: 0.45 };
    const mapPoint = laser.applyPoint(localPoint);
    const localVectorInMap = laser.applyVector(localPoint);
    const origin = toScreen(laser);
    const pointEnd = toScreen(mapPoint);
    const vectorEnd = {
      x: origin.x + localVectorInMap.x * screenWorld().scale,
      y: origin.y - localVectorInMap.y * screenWorld().scale,
    };
    drawArrow(origin, pointEnd, COLORS.purple, 2.5);
    drawArrow({ x: 60, y: 105 }, { x: 60 + localVectorInMap.x * 45, y: 105 - localVectorInMap.y * 45 }, COLORS.cyan, 2.5);
    noStroke();
    fill(...COLORS.purple);
    circle(pointEnd.x, pointEnd.y, 9);
    drawLabel("PointStamped · laser", mapPoint, COLORS.purple);
    fill(...COLORS.cyan);
    textFont("monospace");
    textSize(10);
    text("Vector3Stamped ignores translation", 24, 70);
    drawArrow(origin, vectorEnd, COLORS.cyan, 1, true);
  }

  function drawTimeBuffer(currentTime) {
    const left = 48;
    const right = width - 48;
    const y = height - 58;
    const mapTime = (time) => map(time, -2, 14, left, right);
    push();
    strokeWeight(4);
    stroke(...COLORS.faint);
    line(left, y, right, y);
    stroke(...COLORS.y);
    line(mapTime(0), y, mapTime(currentTime), y);
    for (let time = 0; time <= currentTime; time += 0.5) {
      stroke(...COLORS.text);
      strokeWeight(1);
      line(mapTime(time), y - 5, mapTime(time), y + 5);
    }
    const queryX = mapTime(tutorial.queryTime);
    stroke(...(tutorial.error ? COLORS.x : COLORS.accent));
    strokeWeight(2);
    line(queryX, y - 18, queryX, y + 18);
    noStroke();
    fill(...(tutorial.error ? COLORS.x : COLORS.accent));
    textFont("monospace");
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text(`query ${formatNumber(tutorial.queryTime, 1)} s`, queryX, y - 21);
    fill(...COLORS.muted);
    text("oldest", mapTime(0), y + 26);
    text("latest", mapTime(currentTime), y + 26);
    textAlign(LEFT, BASELINE);
    pop();
  }

  function drawSensorScenario(time) {
    const landmark = { x: 3.45, y: 1.25 };
    const frames = ["laser", "base_link", "odom", "map"];
    const colors = [COLORS.accent, COLORS.cyan, COLORS.purple, COLORS.y];
    const mapFromLaser = frameInMap("laser", time);
    if (!mapFromLaser) return;
    const laserFromMap = mapFromLaser.inverse();
    const pointInLaser = laserFromMap.applyPoint(landmark);
    const laserOrigin = toScreen(mapFromLaser);
    const landmarkScreen = toScreen(landmark);
    drawArrow(laserOrigin, landmarkScreen, COLORS.accent, 1.4, true);
    frames.forEach((frame, index) => {
      let pointInFrame;
      try {
        pointInFrame = tutorial.tree.lookup(frame, "laser", time).transform.applyPoint(pointInLaser);
      } catch (error) {
        return;
      }
      const mapFromFrame = frameInMap(frame, time);
      const reconstructedMapPoint = mapFromFrame.applyPoint(pointInFrame);
      const offset = { x: reconstructedMapPoint.x, y: reconstructedMapPoint.y + index * 0.12 };
      const screen = toScreen(offset);
      noStroke();
      fill(...colors[index]);
      circle(screen.x, screen.y, 7 + index);
      drawLabel(`${frame}: (${formatNumber(pointInFrame.x)}, ${formatNumber(pointInFrame.y)})`, offset, colors[index]);
    });
    noFill();
    stroke(...COLORS.y);
    strokeWeight(2);
    circle(landmarkScreen.x, landmarkScreen.y, 22);
  }

  function drawTreeScene() {
    drawMobileScene("tree");
    push();
    const orphan = { x: width - 90, y: 92 };
    stroke(...COLORS.faint);
    strokeWeight(1);
    if (drawingContext?.setLineDash) drawingContext.setLineDash([5, 5]);
    circle(orphan.x, orphan.y, 38);
    if (drawingContext?.setLineDash) drawingContext.setLineDash([]);
    noStroke();
    fill(...COLORS.muted);
    textAlign(CENTER, TOP);
    textFont("monospace");
    textSize(10);
    text("orphan_camera\ndisconnected root", orphan.x, orphan.y + 25);
    textAlign(LEFT, BASELINE);
    pop();
  }

  function prepare2DView() {
    resetMatrix();
    camera(0, 0, 800, 0, 0, 0, 0, 1, 0);
    ortho(-width / 2, width / 2, -height / 2, height / 2, 0, 1600);
    translate(-width / 2, -height / 2, 0);
  }

  function draw2DScene(scene) {
    prepare2DView();
    background(...COLORS.background);
    drawGrid();
    if (scene === "matrix") drawMatrixScene();
    else if (scene === "types") drawTypesScene();
    else if (scene === "compose") drawCompositionScene();
    else if (scene === "tree") drawTreeScene();
    else drawMobileScene(scene);
  }

  function draw3DAxis(origin, direction, color, label) {
    const length = 95;
    stroke(...color);
    strokeWeight(4);
    line(
      origin.x, origin.y, origin.z,
      origin.x + direction.x * length,
      origin.y - direction.y * length,
      origin.z + direction.z * length
    );
    push();
    translate(
      origin.x + direction.x * length,
      origin.y - direction.y * length,
      origin.z + direction.z * length
    );
    noStroke();
    fill(...color);
    sphere(4, 7, 5);
    pop();
  }

  function draw3DFrame(origin, rotation, scaleFactor = 1) {
    const basis = [
      [{ x: 1, y: 0, z: 0 }, COLORS.x, "X"],
      [{ x: 0, y: 1, z: 0 }, COLORS.y, "Y"],
      [{ x: 0, y: 0, z: 1 }, COLORS.z, "Z"],
    ];
    basis.forEach(([axis, color, label]) => {
      const direction = rotation.rotateVector(axis);
      draw3DAxis(origin, {
        x: direction.x * scaleFactor,
        y: direction.y * scaleFactor,
        z: direction.z * scaleFactor,
      }, color, label);
    });
  }

  function draw3DScene() {
    resetMatrix();
    background(...COLORS.background);
    perspective(Math.PI / 3, width / height, 1, 5000);
    const radius = 680;
    const eyeX = Math.cos(tutorial.orbitYaw) * Math.cos(tutorial.orbitPitch) * radius;
    const eyeY = Math.sin(tutorial.orbitPitch) * radius;
    const eyeZ = Math.sin(tutorial.orbitYaw) * Math.cos(tutorial.orbitPitch) * radius;
    camera(eyeX, eyeY, eyeZ, 0, 0, 0, 0, 1, 0);

    push();
    rotateX(Math.PI / 2);
    stroke(...COLORS.grid);
    strokeWeight(1);
    for (let value = -300; value <= 300; value += 50) {
      line(-300, value, 0, 300, value, 0);
      line(value, -300, 0, value, 300, 0);
    }
    pop();

    const mapOrigin = { x: -140, y: 80, z: -50 };
    draw3DFrame(mapOrigin, root.Quaternion.identity(), 0.85);
    const yaw = 0.7 + 0.16 * Math.sin(tutorial.time * 0.4);
    const childRotation = root.Quaternion.fromEuler(-0.25, 0.38, yaw);
    const cameraOrigin = { x: 90, y: -65, z: 105 };
    stroke(...COLORS.accent);
    strokeWeight(2);
    line(mapOrigin.x, mapOrigin.y, mapOrigin.z, cameraOrigin.x, cameraOrigin.y, cameraOrigin.z);
    draw3DFrame(cameraOrigin, childRotation, 1);
    push();
    translate(cameraOrigin.x, cameraOrigin.y, cameraOrigin.z);
    noFill();
    stroke(230, 235, 242, 150);
    box(62, 36, 42);
    pop();
  }

  function setup() {
    cacheDom();
    createChapterRail();
    bindControls();
    tutorial.chapterIndex = chapterIndexFromHash();
    const hostWidth = Math.max(320, dom.canvasHost.clientWidth);
    const hostHeight = Math.max(390, Math.min(720, root.innerHeight - 170));
    canvas = createCanvas(hostWidth, hostHeight, WEBGL);
    canvas.parent(dom.canvasHost);
    canvas.elt.setAttribute("role", "img");
    canvas.elt.setAttribute("aria-label", "Animated coordinate frames and TF2 lookup path");
    pixelDensity(Math.min(root.devicePixelRatio || 1, 2));
    frameRate(60);
    textFont("monospace");
    resetChapter(false);
    renderChapterUi();
    refreshScenario();
    renderDynamicUi();
  }

  function draw() {
    if (!tutorial.paused) {
      tutorial.time += deltaTime / 1000 * 0.42;
      if (tutorial.time > 12) tutorial.time = 2;
      if (chapter().defaultQuery.timeMode === "slider" && chapter().scene === "sandbox") {
        tutorial.queryTime = Math.min(tutorial.queryTime, tutorial.time);
      }
    }
    refreshScenario();
    if (chapter().scene === "se3") draw3DScene();
    else draw2DScene(chapter().scene);

    if (tutorial.lastUiFrame < 0 || frameCount - tutorial.lastUiFrame >= 8) {
      renderDynamicUi();
      tutorial.lastUiFrame = frameCount;
    }
  }

  function pointerInsideCanvas() {
    return mouseX >= 0 && mouseY >= 0 && mouseX <= width && mouseY <= height;
  }

  function mousePressed() {
    if (!pointerInsideCanvas()) return;
    if (chapter().scene === "se3") {
      tutorial.draggingFrame = true;
      return;
    }
    if (["matrix", "compose", "tree", "sandbox"].includes(chapter().scene)) {
      const base = frameInMap("base_link", tutorial.scenario.sceneTime);
      if (!base) return;
      const baseScreen = toScreen(base);
      tutorial.draggingFrame = Math.hypot(mouseX - baseScreen.x, mouseY - baseScreen.y) <= 78;
    }
  }

  function mouseDragged() {
    if (!tutorial.draggingFrame || !pointerInsideCanvas()) return;
    if (chapter().scene === "se3") {
      tutorial.orbitYaw += movedX * 0.009;
      tutorial.orbitPitch = Math.max(-1.1, Math.min(0.25, tutorial.orbitPitch + movedY * 0.009));
      return;
    }
    tutorial.dragOffset.x += movedX / screenWorld().scale;
    tutorial.dragOffset.y -= movedY / screenWorld().scale;
  }

  function mouseReleased() {
    tutorial.draggingFrame = false;
  }

  function windowResized() {
    if (!dom.canvasHost || !canvas) return;
    const hostWidth = Math.max(320, dom.canvasHost.clientWidth);
    const hostHeight = root.innerWidth <= 600 ? 390 : Math.max(460, Math.min(720, root.innerHeight - 170));
    resizeCanvas(hostWidth, hostHeight);
  }

  root.setup = setup;
  root.draw = draw;
  root.mousePressed = mousePressed;
  root.mouseDragged = mouseDragged;
  root.mouseReleased = mouseReleased;
  root.windowResized = windowResized;
})(window);

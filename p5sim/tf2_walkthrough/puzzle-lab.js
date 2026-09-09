(function runPuzzleLab(root) {
  "use strict";

  const puzzles = root.TF2_PUZZLES || [];
  const stages = root.TF2_PUZZLE_STAGES || [];
  const tracks = root.TF2_PUZZLE_TRACKS || [];
  const scenes = root.PuzzleScenes;
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const EDIT_DEBOUNCE_MS = 150;
  const READY_MESSAGE = "Drag the scene or edit the code. The canvas runs your function as you go. Check when it matches.";

  let progress = root.loadProgress(root.localStorage);
  let currentIndex = 0;
  let busy = false;
  let sketch = null;
  let editor = null;
  let session = null;
  let values = {};
  let live = null;
  let editTimer = 0;

  const dom = {};
  const ids = [
    "saveStatus", "stageMap", "puzzleCounter", "puzzleNumber", "puzzleStage", "puzzleTitle",
    "puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink", "referenceLink", "curriculumHeading", "canvasHost", "selectorStrip", "runState",
    "componentShelf", "componentCount", "codeEditor", "runButton", "checkButton", "resetCodeButton",
    "hintButton", "hintPanel", "feedbackPanel", "caseComparison", "previousPuzzle", "previousPuzzleLabel",
    "nextPuzzle", "nextPuzzleLabel", "resetProgress", "solvedCount", "progressFill", "lineStatus",
  ];

  function twoDigits(number) { return String(number).padStart(2, "0"); }
  function currentPuzzle() { return puzzles[currentIndex]; }
  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }

  function save() {
    const saved = root.saveProgress(root.localStorage, progress);
    dom.saveStatus.textContent = saved ? "Saved locally" : "Storage unavailable";
    dom.saveStatus.classList.toggle("is-saving", !saved);
  }

  function storeDraft() {
    const puzzle = currentPuzzle();
    if (!puzzle) return;
    progress.drafts[puzzle.id] = dom.codeEditor.value;
    progress.currentPuzzleId = puzzle.id;
    save();
  }

  function setFeedback(message, kind) {
    dom.feedbackPanel.textContent = message;
    dom.feedbackPanel.classList.toggle("is-success", kind === "success");
    dom.feedbackPanel.classList.toggle("is-error", kind === "error");
    dom.runState.textContent = busy ? "Checking" : kind === "success" ? "Matched" : kind === "error" ? "Needs work" : "Live";
    dom.runState.classList.toggle("is-running", busy);
    dom.runState.classList.toggle("is-success", kind === "success" && !busy);
    dom.runState.classList.toggle("is-error", kind === "error" && !busy);
  }

  function renderComparison(result) {
    if (!result || !result.testCase || result.pass) {
      dom.caseComparison.hidden = true;
      dom.caseComparison.innerHTML = "";
      return;
    }
    const rows = [["Case", result.testCase.label], ["Input", result.testCase.args], ["Expected", result.testCase.expected], ["Yours", result.actual === undefined ? null : result.actual]];
    dom.caseComparison.innerHTML = rows.map((row) => (
      "<div class=\"case-row\"><span>" + row[0] + "</span><code>" + escapeHtml(typeof row[1] === "string" ? row[1] : JSON.stringify(row[1], null, 2)) + "</code></div>"
    )).join("");
    dom.caseComparison.hidden = false;
  }

  function stageProgress(stage) {
    const members = puzzles.filter((puzzle) => puzzle.stage === stage.id);
    return members.filter((puzzle) => progress.solved[puzzle.id]).length + "/" + members.length;
  }

  function renderMap() {
    dom.stageMap.innerHTML = "";
    const states = root.trackStates(tracks, progress);
    tracks.forEach((track) => {
      const state = states.find((entry) => entry.id === track.id).state;
      const block = document.createElement("section");
      block.className = "track-block";
      if (state === "locked") block.classList.add("is-locked");
      const members = puzzles.filter((puzzle) => puzzle.track === track.id);
      const solved = members.filter((puzzle) => progress.solved[puzzle.id]).length;
      const heading = document.createElement("h3");
      heading.className = "track-name";
      heading.innerHTML = "<span>" + escapeHtml(track.title) + "</span><span>" + (members.length ? solved + "/" + members.length : state) + "</span>";
      block.append(heading);
      if (track.note && (state === "locked" || members.length === 0)) {
        const note = document.createElement("p");
        note.className = "track-note";
        note.textContent = state === "locked" ? track.note : "Available. Puzzles arrive with the next track.";
        block.append(note);
      }
      track.stages.forEach((stage) => {
        const section = document.createElement("section");
        section.className = "stage-group";
        const stageHeading = document.createElement("h3");
        stageHeading.className = "stage-name";
        const stageMembers = puzzles.filter((puzzle) => puzzle.stage === stage.id);
        stageHeading.innerHTML = "<span>" + escapeHtml(stage.title) + "</span><span>" + (stageMembers.length ? stageProgress(stage) : "—") + "</span>";
        section.append(stageHeading);
        if (!stageMembers.length) {
          const placeholder = document.createElement("p");
          placeholder.className = "stage-placeholder";
          placeholder.textContent = stage.subtitle;
          section.append(placeholder);
        } else {
          const list = document.createElement("div");
          list.className = "puzzle-list";
          stageMembers.forEach((puzzle) => {
            const index = puzzle.number - 1;
            const solvedPuzzle = Boolean(progress.solved[puzzle.id]);
            const locked = index > progress.highestUnlocked;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "puzzle-map-button";
            if (solvedPuzzle) button.classList.add("is-solved");
            if (index === currentIndex) button.classList.add("is-current");
            button.disabled = locked;
            button.setAttribute("aria-current", index === currentIndex ? "step" : "false");
            button.innerHTML =
              "<span class=\"map-number\">" + twoDigits(puzzle.number) + "</span>" +
              "<span class=\"map-title\">" + escapeHtml(puzzle.title) + "</span>" +
              "<span class=\"map-state\" aria-hidden=\"true\">" + (locked ? "·" : solvedPuzzle ? "✓" : index === currentIndex ? "◆" : "○") + "</span>";
            button.addEventListener("click", () => navigate(index));
            list.append(button);
          });
          section.append(list);
        }
        block.append(section);
      });
      dom.stageMap.append(block);
    });
  }

  function renderComponents() {
    const puzzle = currentPuzzle();
    const requiredIds = new Set(root.collectDependencyIds(puzzles, puzzle));
    const solvedPuzzles = puzzles.filter((entry) => progress.solved[entry.id]);
    dom.componentShelf.innerHTML = "";
    if (!solvedPuzzles.length) {
      dom.componentShelf.innerHTML = "<div class=\"empty-shelf\">Solve a component and it will live here.</div>";
    } else {
      solvedPuzzles.forEach((entry) => {
        const chip = document.createElement("span");
        chip.className = "component-chip";
        if (requiredIds.has(entry.id)) chip.classList.add("is-required");
        chip.textContent = entry.functionName + "()";
        chip.title = (requiredIds.has(entry.id) ? "Used by this puzzle · " : "") + entry.signature;
        dom.componentShelf.append(chip);
      });
    }
    const missing = Array.from(requiredIds).filter((id) => !progress.solved[id]);
    dom.componentCount.textContent = missing.length ? missing.length + " dependency missing" : solvedPuzzles.length + " ready";
  }

  function renderHints() {
    const puzzle = currentPuzzle();
    const level = Math.max(0, Math.min(3, progress.hints[puzzle.id] || 0));
    dom.hintPanel.innerHTML = puzzle.hints.slice(0, level).map((hint, index) => (
      "<div class=\"hint-level\"><strong>Hint " + (index + 1) + "</strong> · " + escapeHtml(hint) + "</div>"
    )).join("");
    dom.hintPanel.hidden = level === 0;
    dom.hintButton.textContent = level >= 3 ? "All hints open" : "Hint " + (level + 1) + " / 3";
    dom.hintButton.disabled = level >= 3;
  }

  function renderFooter() {
    const solved = Object.keys(progress.solved).length;
    const previous = puzzles[currentIndex - 1];
    const next = puzzles[currentIndex + 1];
    dom.previousPuzzle.disabled = !previous;
    dom.previousPuzzleLabel.textContent = previous ? previous.title : "Start";
    dom.nextPuzzle.disabled = !next || currentIndex + 1 > progress.highestUnlocked;
    dom.nextPuzzleLabel.textContent = next ? next.title : "Track complete";
    dom.solvedCount.textContent = solved + " solved";
    dom.progressFill.style.width = (solved / puzzles.length * 100) + "%";
  }

  function renderSelectors() {
    const puzzle = currentPuzzle();
    dom.selectorStrip.innerHTML = "";
    const selectors = puzzle.scene.handles.filter((handle) => handle.type === "selector");
    dom.selectorStrip.hidden = selectors.length === 0;
    selectors.forEach((handle) => {
      const field = document.createElement("label");
      field.className = "selector-field";
      const caption = document.createElement("span");
      caption.textContent = handle.label;
      const select = document.createElement("select");
      handle.options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        item.selected = values[handle.id] === option;
        select.append(item);
      });
      select.addEventListener("change", () => { values[handle.id] = select.value; renderScene(); requestLive(); });
      field.append(caption, select);
      dom.selectorStrip.append(field);
    });
  }

  function renderScene() {
    const puzzle = currentPuzzle();
    let args = [];
    try { args = scenes.toArgs(puzzle, values); } catch (error) { args = []; }
    const context = {
      puzzle, values, args,
      expected: live ? live.expected : null,
      actual: live ? live.actual : null,
      comparison: live ? live.comparison : null,
      diagnosis: live ? live.diagnosis : null,
      error: live && live.error ? live.error : null,
    };
    let primitives;
    try { primitives = scenes.layers(context); } catch (error) { primitives = [{ kind: "label", text: "Scene error: " + error.message, style: "actual", row: 0 }]; }
    sketch.setState({ values, grips: scenes.grips(puzzle, values), primitives });
  }

  function renderPuzzle(options) {
    const settings = options || {};
    const puzzle = currentPuzzle();
    const stage = stageById.get(puzzle.stage);
    dom.puzzleCounter.textContent = twoDigits(puzzle.number) + " / " + puzzles.length;
    dom.puzzleNumber.textContent = twoDigits(puzzle.number);
    dom.puzzleStage.textContent = stage.title;
    dom.puzzleTitle.textContent = puzzle.title;
    dom.puzzleGoal.textContent = puzzle.goal;
    dom.puzzleConcept.textContent = puzzle.concept;
    dom.puzzleSignature.textContent = puzzle.signature;
    dom.walkthroughLink.href = "index.html#" + puzzle.walkthroughChapter;
    dom.walkthroughLink.textContent = "Review " + puzzle.walkthroughChapter.replaceAll("-", " ") + " ↗";
    if (puzzle.reference) {
      dom.referenceLink.href = puzzle.reference.url;
      dom.referenceLink.textContent = puzzle.reference.label + " ↗";
      dom.referenceLink.hidden = false;
    } else {
      dom.referenceLink.hidden = true;
    }
    if (!settings.keepEditor) {
      dom.codeEditor.value = progress.drafts[puzzle.id] || progress.sources[puzzle.id] || puzzle.starterSource;
      const placeholderStart = dom.codeEditor.value.indexOf("return null;");
      if (placeholderStart >= 0) dom.codeEditor.setSelectionRange(placeholderStart, placeholderStart + "return null;".length);
      if (editor) editor.refresh();
    }
    document.title = twoDigits(puzzle.number) + " · " + puzzle.title + " — TF2 Puzzle Lab";
    values = scenes.initialValues(puzzle);
    live = null;
    renderMap();
    renderComponents();
    renderHints();
    renderFooter();
    renderSelectors();
    updateCursorStatus();
    setFeedback(progress.solved[puzzle.id] ? "Solved. Improve this component or continue building." : READY_MESSAGE, progress.solved[puzzle.id] ? "success" : "ready");
    renderComparison(null);
    renderScene();
    requestLive();
  }

  function navigate(index, options) {
    if (index < 0 || index >= puzzles.length || index > progress.highestUnlocked) return;
    currentIndex = index;
    progress.currentPuzzleId = currentPuzzle().id;
    save();
    const hash = "#" + currentPuzzle().id;
    if (root.location.hash !== hash) history.replaceState(null, "", hash);
    renderPuzzle(options);
    root.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initialIndex() {
    const hashId = root.location.hash.replace(/^#/, "");
    const hashIndex = puzzles.findIndex((puzzle) => puzzle.id === hashId);
    if (hashIndex >= 0 && hashIndex <= progress.highestUnlocked) return hashIndex;
    const savedIndex = puzzles.findIndex((puzzle) => puzzle.id === progress.currentPuzzleId);
    if (savedIndex >= 0 && savedIndex <= progress.highestUnlocked) return savedIndex;
    return Math.min(progress.highestUnlocked, puzzles.length - 1);
  }

  function updateCursorStatus() {
    const before = dom.codeEditor.value.slice(0, dom.codeEditor.selectionStart);
    const lines = before.split("\n");
    dom.lineStatus.textContent = "Line " + lines.length + ", column " + (lines[lines.length - 1].length + 1);
  }

  const P5_SKETCH_ONLY = ["createVector", "push", "pop", "translate", "rotate", "scale", "random", "noise", "line", "point", "ellipse", "circle", "rect", "vertex", "beginShape", "endShape", "frameCount", "mouseX", "mouseY", "width", "height", "millis"];
  function undefinedHint(message) {
    const match = /^(\w+) is not defined$/.exec(message || "");
    if (!match) return "";
    if (P5_SKETCH_ONLY.includes(match[1])) {
      return " " + match[1] + " is a p5 sketch helper and is not available inside puzzles. Puzzle code is plain JavaScript: return plain { x, y } objects, and use PI, cos, sin, atan2, sqrt, dist, radians, degrees, or Math.* for the math.";
    }
    return " Puzzle code runs as plain JavaScript in a worker: PI, cos, sin, atan2, sqrt, dist, radians, degrees, lerp, and map are available, but p5 drawing and vector functions are not.";
  }

  function errorResult(error) {
    const kind = (error && error.kind) || "worker";
    const message = (error && error.message) || "The code runner failed.";
    return { kind, message, expected: null, actual: null, comparison: null, diagnosis: null, error: { kind, message } };
  }

  function applyLiveResult(result) {
    live = result;
    if (result.kind === "live-match") setFeedback(result.message, "success");
    else if (result.kind === "live-mismatch") setFeedback(result.message, "error");
    else if (result.kind === "missing-dependency") setFeedback(result.message + " Open it from the map and Check it again.", "error");
    else if (result.kind === "timeout") setFeedback(result.message + " Look for a loop that never ends.", "error");
    else if (result.kind === "syntax") setFeedback("Syntax error: " + result.message, "error");
    else if (result.kind === "runtime") setFeedback("Your function threw: " + result.message + undefinedHint(result.message), "error");
    else setFeedback(result.message, "error");
    renderScene();
  }

  function requestLive() {
    if (busy || !session) return;
    const puzzle = currentPuzzle();
    let program;
    try {
      program = root.buildProgram(puzzles, progress, puzzle, dom.codeEditor.value);
    } catch (error) {
      applyLiveResult(errorResult(error));
      return;
    }
    let args;
    try { args = scenes.toArgs(puzzle, values); } catch (error) { applyLiveResult(errorResult({ kind: "worker", message: error.message })); return; }
    session.evaluate(program, args).then((response) => {
      if (currentPuzzle() !== puzzle) return;
      applyLiveResult(root.evaluateLive(puzzle, response));
    }).catch((error) => {
      if (!error || error.kind === "superseded" || error.kind === "disposed") return;
      if (currentPuzzle() !== puzzle) return;
      applyLiveResult(errorResult(error));
    });
  }

  function scheduleLiveFromEdit() {
    storeDraft();
    updateCursorStatus();
    clearTimeout(editTimer);
    editTimer = setTimeout(requestLive, EDIT_DEBOUNCE_MS);
  }

  async function check() {
    if (busy) return;
    const puzzle = currentPuzzle();
    let program;
    try {
      program = root.buildProgram(puzzles, progress, puzzle, dom.codeEditor.value);
    } catch (error) {
      applyLiveResult(errorResult(error));
      return;
    }
    busy = true;
    dom.runButton.disabled = true;
    dom.checkButton.disabled = true;
    setFeedback("Checking every case…", "ready");
    sketch.setState({ running: true });
    storeDraft();
    const cases = puzzle.publicCases.concat(puzzle.checkCases);
    let response;
    try {
      response = await session.check(program, cases);
    } catch (error) {
      response = { ok: false, error };
    }
    const result = root.evaluateCheck(puzzle, response);
    busy = false;
    dom.runButton.disabled = false;
    dom.checkButton.disabled = false;
    sketch.setState({ running: false });
    setFeedback(result.message, result.pass ? "success" : "error");
    renderComparison(result);
    if (result.pass) {
      const before = root.trackStates(tracks, progress);
      progress = root.completePuzzle(progress, puzzle, dom.codeEditor.value, new Date().toISOString(), puzzles);
      save();
      sketch.celebrate();
      renderMap();
      renderComponents();
      renderFooter();
      const after = root.trackStates(tracks, progress);
      const unlocked = tracks.filter((track, index) => before[index].state === "locked" && after[index].state === "available");
      if (unlocked.length) setFeedback(result.message + " " + unlocked.map((track) => track.title).join(" and ") + " is now available.", "success");
    }
    requestLive();
  }

  function revealHint() {
    const puzzle = currentPuzzle();
    progress.hints[puzzle.id] = Math.min(3, (progress.hints[puzzle.id] || 0) + 1);
    save();
    renderHints();
  }

  function resetCode() {
    const puzzle = currentPuzzle();
    if (progress.solved[puzzle.id]) {
      const dependentIds = root.dependentPuzzleIds(puzzles, puzzle.id).filter((id) => progress.solved[id]);
      const names = dependentIds.map((id) => puzzles.find((entry) => entry.id === id).title);
      const suffix = names.length ? "\n\nThis also invalidates:\n• " + names.join("\n• ") : "";
      if (!root.confirm("Reset " + puzzle.title + "?" + suffix)) return;
      progress = root.resetPuzzle(progress, puzzles, puzzle.id).progress;
    } else if (!root.confirm("Restore the starter code for this puzzle?")) {
      return;
    }
    progress.drafts[puzzle.id] = puzzle.starterSource;
    progress.currentPuzzleId = puzzle.id;
    save();
    renderPuzzle();
  }

  function resetAllProgress() {
    if (!root.confirm("Reset all " + puzzles.length + " puzzles, saved solutions, and hints? The walkthrough is not affected.")) return;
    root.localStorage.removeItem(root.STORAGE_KEY);
    progress = root.createProgress();
    currentIndex = 0;
    history.replaceState(null, "", "#" + puzzles[0].id);
    renderPuzzle();
  }

  function bindEvents() {
    dom.codeEditor.addEventListener("input", scheduleLiveFromEdit);
    dom.codeEditor.addEventListener("click", updateCursorStatus);
    dom.codeEditor.addEventListener("keyup", updateCursorStatus);
    dom.runButton.addEventListener("click", () => { clearTimeout(editTimer); requestLive(); });
    dom.checkButton.addEventListener("click", check);
    dom.hintButton.addEventListener("click", revealHint);
    dom.resetCodeButton.addEventListener("click", resetCode);
    dom.resetProgress.addEventListener("click", resetAllProgress);
    dom.previousPuzzle.addEventListener("click", () => navigate(currentIndex - 1));
    dom.nextPuzzle.addEventListener("click", () => navigate(currentIndex + 1));

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "Enter") { event.preventDefault(); check(); }
      else if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); clearTimeout(editTimer); requestLive(); }
      else if (event.altKey && event.key === "ArrowLeft") { event.preventDefault(); navigate(currentIndex - 1); }
      else if (event.altKey && event.key === "ArrowRight") { event.preventDefault(); navigate(currentIndex + 1); }
      else if (event.key === "Escape") { renderComparison(null); dom.hintPanel.hidden = true; }
    });

    root.addEventListener("hashchange", () => {
      const id = root.location.hash.replace(/^#/, "");
      const index = puzzles.findIndex((puzzle) => puzzle.id === id);
      if (index >= 0 && index <= progress.highestUnlocked) navigate(index);
      else if (index > progress.highestUnlocked) setFeedback("That build is still locked. Complete the preceding components first.", "error");
    });
  }

  function initialize() {
    ids.forEach((id) => { dom[id] = document.getElementById(id); });
    const catalogStatus = root.validateCatalog(puzzles, scenes ? scenes.SCENE_KINDS : null);
    if (!catalogStatus.valid || puzzles.length === 0) {
      dom.feedbackPanel.textContent = catalogStatus.valid ? "The catalog is empty." : catalogStatus.message;
      dom.feedbackPanel.classList.add("is-error");
      return;
    }
    if (typeof Worker === "undefined") {
      dom.feedbackPanel.textContent = "Web Workers are unavailable. Open the lab through the local Python server.";
      dom.feedbackPanel.classList.add("is-error");
      return;
    }
    session = root.createLiveSession({ workerUrl: "puzzle-worker.js" });
    dom.curriculumHeading.textContent = puzzles.length + " geometry builds";
    if (typeof root.createCodeEditor === "function") editor = root.createCodeEditor(dom.codeEditor);
    currentIndex = initialIndex();
    sketch = root.createPuzzleSketch(dom.canvasHost, {
      onDrag(grip, worldPoint) {
        values = scenes.dragHandle(currentPuzzle(), values, grip, worldPoint);
        renderScene();
        requestLive();
      },
    });
    bindEvents();
    history.replaceState(null, "", "#" + currentPuzzle().id);
    renderPuzzle();
  }

  root.addEventListener("DOMContentLoaded", initialize);
})(window);

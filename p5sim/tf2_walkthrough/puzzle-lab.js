(function runPuzzleLab(root) {
  "use strict";

  const config = Object.assign({
    puzzles: root.TF2_PUZZLES || [],
    tracks: root.TF2_PUZZLE_TRACKS || [],
    storageKey: root.STORAGE_KEY,
    title: "TF2 Puzzle Lab",
    heading: "geometry builds",
    curriculumLabel: (count) => count + " connected tracks",
    sceneKicker: "Live geometry",
    resetNote: "The walkthrough is not affected.",
    conceptLink: (puzzle) => ({ href: "index.html#" + puzzle.walkthroughChapter, label: "Review " + puzzle.walkthroughChapter.replaceAll("-", " ") + " ↗" }),
  }, root.PUZZLE_LAB_CONFIG || {});
  const puzzles = config.puzzles;
  const tracks = config.tracks;
  const stages = tracks.flatMap((track) => track.stages);
  const scenes = root.PuzzleScenes;
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const EDIT_DEBOUNCE_MS = 150;
  const READY_MESSAGE = "Edit the code or change an input. The scene updates automatically. Check all cases when it looks right.";

  let progress = root.loadProgress(root.localStorage, config.storageKey);
  let currentIndex = 0;
  let busy = false;
  let sketch = null;
  let editor = null;
  let session = null;
  let values = {};
  let live = null;
  let editTimer = 0;
  const expandedTracks = new Set();
  const expandedStages = new Set();

  const dom = {};
  const ids = [
    "saveStatus", "stageMap", "puzzleCounter", "puzzleNumber", "puzzleStage", "puzzleTitle",
    "puzzleGoal", "puzzleConcept", "puzzleSignature", "walkthroughLink", "referenceLink", "readingLink", "curriculumHeading", "canvasHost", "selectorStrip", "runState",
    "componentShelf", "componentCount", "codeEditor", "runButton", "checkButton", "resetCodeButton",
    "hintButton", "hintPanel", "feedbackPanel", "caseComparison", "previousPuzzle", "previousPuzzleLabel",
    "nextPuzzle", "nextPuzzleLabel", "resetProgress", "solvedCount", "progressFill", "lineStatus",
    "focusToggle", "labCurriculumLabel", "mapToggle", "mapContent", "puzzleSearch", "continuePuzzle",
    "visualizerKicker", "visualizerHeading", "inputLegend", "checkPanel", "preciseControls", "handleControls",
  ];

  const FOCUS_KEY = "tf2-lab-focus-mode";
  function setFocusMode(on) {
    document.body.classList.toggle("is-focused", on);
    dom.focusToggle.setAttribute("aria-expanded", on ? "false" : "true");
    dom.focusToggle.setAttribute("aria-label", on ? "Show puzzle sidebar" : "Hide puzzle sidebar");
    dom.focusToggle.title = on ? "Show puzzle sidebar" : "Hide puzzle sidebar";
    try { localStorage.setItem(FOCUS_KEY, on ? "1" : "0"); } catch (error) { /* private mode */ }
    if (editor) editor.refresh();
  }
  function restoreFocusMode() {
    let stored = null;
    try { stored = localStorage.getItem(FOCUS_KEY); } catch (error) { stored = null; }
    setFocusMode(stored === "1");
  }
  function twoDigits(number) { return String(number).padStart(2, "0"); }
  function currentPuzzle() { return puzzles[currentIndex]; }
  function unlockedNow() { return root.unlockedIds(puzzles, tracks, progress); }
  function isUnlocked(index) { return index >= 0 && index < puzzles.length && unlockedNow().has(puzzles[index].id); }
  function firstOpenIndex() {
    const open = unlockedNow();
    const index = puzzles.findIndex((puzzle) => open.has(puzzle.id) && !progress.solved[puzzle.id]);
    return index >= 0 ? index : 0;
  }
  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }

  function save() {
    const saved = root.saveProgress(root.localStorage, progress, config.storageKey);
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

  function setCheckFeedback(message, kind) {
    dom.checkPanel.hidden = false;
    dom.checkPanel.textContent = message;
    dom.checkPanel.classList.toggle("is-success", kind === "success");
    dom.checkPanel.classList.toggle("is-error", kind === "error");
  }

  function clearCheckFeedback() {
    dom.checkPanel.hidden = true;
    dom.checkPanel.textContent = "";
    renderComparison(null);
  }

  function setMapOpen(open) {
    dom.mapContent.hidden = !open;
    dom.mapToggle.setAttribute("aria-expanded", open ? "true" : "false");
    dom.mapToggle.textContent = open ? "Hide puzzles" : "Browse puzzles";
  }

  function renderComparison(result) {
    if (!result || !result.testCase || result.pass) {
      dom.caseComparison.hidden = true;
      dom.caseComparison.innerHTML = "";
      return;
    }
    const rows = [["Case", result.testCase.label], ["Input", result.testCase.args], ["Expected", result.testCase.expected], ["Yours", result.actual === undefined ? null : result.actual]];
    dom.caseComparison.innerHTML = rows.map((row) => (
      "<div class=\"case-row\"><span>" + row[0] + "</span><code>" + escapeHtml(preview(row[1])) + "</code></div>"
    )).join("");
    dom.caseComparison.hidden = false;
  }

  function preview(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (typeof text !== "string") return String(text);
    return text.length > 600 ? text.slice(0, 600) + "\n… (" + (text.length - 600) + " more characters)" : text;
  }

  function stageProgress(stage) {
    const members = puzzles.filter((puzzle) => puzzle.stage === stage.id);
    return members.filter((puzzle) => progress.solved[puzzle.id]).length + "/" + members.length;
  }

  function renderMap() {
    dom.stageMap.innerHTML = "";
    const open = unlockedNow();
    const states = root.trackStates(tracks, progress);
    const query = dom.puzzleSearch.value.trim().toLowerCase();
    const active = currentPuzzle();
    function matches(puzzle, stage, track) {
      if (!query) return true;
      if (/^\d+$/.test(query)) return puzzle.number === Number(query);
      return [String(puzzle.number), twoDigits(puzzle.number), puzzle.title, stage.title, track.title]
        .some((value) => value.toLowerCase().includes(query));
    }
    function puzzleList(members) {
      const list = document.createElement("div");
      list.className = "puzzle-list";
      members.forEach((puzzle) => {
        const index = puzzle.number - 1;
        const solvedPuzzle = Boolean(progress.solved[puzzle.id]);
        const locked = !open.has(puzzle.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "puzzle-map-button";
        if (solvedPuzzle) button.classList.add("is-solved");
        if (index === currentIndex) button.classList.add("is-current");
        button.disabled = locked;
        button.setAttribute("aria-current", index === currentIndex ? "step" : "false");
        button.setAttribute("aria-label", twoDigits(puzzle.number) + " " + puzzle.title + (locked ? ", locked" : solvedPuzzle ? ", solved" : ", available"));
        button.title = locked ? "Complete the previous build in this track to unlock." : puzzle.title;
        button.innerHTML =
          "<span class=\"map-number\">" + twoDigits(puzzle.number) + "</span>" +
          "<span class=\"map-title\">" + escapeHtml(puzzle.title) + "</span>" +
          "<span class=\"map-state\" aria-hidden=\"true\">" + (locked ? "·" : solvedPuzzle ? "✓" : index === currentIndex ? "◆" : "○") + "</span>";
        button.addEventListener("click", () => navigate(index));
        list.append(button);
      });
      return list;
    }
    tracks.forEach((track) => {
      const state = states.find((entry) => entry.id === track.id).state;
      const visibleStages = track.stages.map((stage) => ({
        stage,
        members: puzzles.filter((puzzle) => puzzle.stage === stage.id && matches(puzzle, stage, track)),
      })).filter((entry) => entry.members.length || (!query && !puzzles.some((puzzle) => puzzle.stage === entry.stage.id)));
      if (!visibleStages.length) return;
      const block = document.createElement("details");
      block.className = "track-block";
      if (state === "locked") block.classList.add("is-locked");
      block.open = Boolean(query) || expandedTracks.has(track.id) || track.id === active.track;
      block.addEventListener("toggle", () => {
        if (dom.puzzleSearch.value.trim()) return;
        if (block.open) expandedTracks.add(track.id);
        else expandedTracks.delete(track.id);
      });
      const members = puzzles.filter((puzzle) => puzzle.track === track.id);
      const solved = members.filter((puzzle) => progress.solved[puzzle.id]).length;
      const heading = document.createElement("summary");
      heading.className = "track-name";
      heading.innerHTML = "<span>" + escapeHtml(track.title) + "</span><span>" + (members.length ? solved + "/" + members.length : state) + "</span>";
      block.append(heading);
      if (track.note && (state === "locked" || members.length === 0)) {
        const note = document.createElement("p");
        note.className = "track-note";
        note.textContent = state === "locked" ? track.note : "Available. Puzzles arrive with the next track.";
        block.append(note);
      }
      visibleStages.forEach(({ stage, members: visibleMembers }) => {
        const stageMembers = puzzles.filter((puzzle) => puzzle.stage === stage.id);
        if (track.stages.length === 1 && stage.title === track.title.replace(/^\d+ · /, "")) {
          block.append(puzzleList(visibleMembers));
          return;
        }
        const section = document.createElement("details");
        section.className = "stage-group";
        section.open = Boolean(query) || expandedStages.has(stage.id) || stage.id === active.stage;
        section.addEventListener("toggle", () => {
          if (dom.puzzleSearch.value.trim()) return;
          if (section.open) expandedStages.add(stage.id);
          else expandedStages.delete(stage.id);
        });
        const stageHeading = document.createElement("summary");
        stageHeading.className = "stage-name";
        stageHeading.innerHTML = "<span>" + escapeHtml(stage.title) + "</span><span>" + (stageMembers.length ? stageProgress(stage) : "—") + "</span>";
        section.append(stageHeading);
        if (!stageMembers.length) {
          const placeholder = document.createElement("p");
          placeholder.className = "stage-placeholder";
          placeholder.textContent = stage.subtitle;
          section.append(placeholder);
        } else {
          section.append(puzzleList(visibleMembers));
        }
        block.append(section);
      });
      dom.stageMap.append(block);
    });
    if (!dom.stageMap.children.length) {
      const empty = document.createElement("p");
      empty.className = "stage-placeholder";
      empty.textContent = "No puzzles match that search.";
      dom.stageMap.append(empty);
    }
  }

  function renderComponents() {
    const puzzle = currentPuzzle();
    const requiredIds = new Set(root.collectDependencyIds(puzzles, puzzle));
    const solvedPuzzles = puzzles.filter((entry) => progress.solved[entry.id]);
    dom.componentShelf.innerHTML = "";
    const required = puzzles.filter((entry) => requiredIds.has(entry.id));
    if (!required.length) {
      dom.componentShelf.innerHTML = "<div class=\"empty-shelf\">This build needs no earlier components.</div>";
    } else {
      required.forEach((entry) => {
        const chip = document.createElement("span");
        chip.className = "component-chip";
        if (progress.solved[entry.id]) chip.classList.add("is-required");
        else chip.classList.add("is-missing");
        chip.textContent = entry.functionName + "()" + (progress.solved[entry.id] ? "" : " · missing");
        chip.title = entry.signature;
        dom.componentShelf.append(chip);
      });
    }
    if (solvedPuzzles.length) {
      const all = document.createElement("details");
      all.className = "all-components";
      const summary = document.createElement("summary");
      summary.textContent = "View all " + solvedPuzzles.length + " solved components";
      const chips = document.createElement("div");
      chips.className = "component-shelf all-component-chips";
      solvedPuzzles.forEach((entry) => {
        const chip = document.createElement("span");
        chip.className = "component-chip";
        chip.textContent = entry.functionName + "()";
        chip.title = entry.signature;
        chips.append(chip);
      });
      all.append(summary, chips);
      dom.componentShelf.append(all);
    }
    const ready = required.filter((entry) => progress.solved[entry.id]).length;
    dom.componentCount.textContent = required.length ? ready + "/" + required.length + " needed" : solvedPuzzles.length + " solved";
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
    dom.previousPuzzle.disabled = !previous || !isUnlocked(currentIndex - 1);
    dom.previousPuzzleLabel.textContent = previous ? previous.title : "Start";
    const nextLocked = Boolean(next) && !isUnlocked(currentIndex + 1);
    dom.nextPuzzle.disabled = !next || nextLocked;
    dom.nextPuzzle.title = nextLocked ? "Press Check (Ctrl+Shift+Enter) on this puzzle to unlock the next one." : "";
    dom.nextPuzzleLabel.textContent = next ? (nextLocked ? "Check to unlock · " + next.title : next.title) : "Track complete";
    dom.solvedCount.textContent = solved + " solved";
    dom.progressFill.style.width = (solved / puzzles.length * 100) + "%";
    const open = unlockedNow();
    const unsolved = puzzles.findIndex((puzzle) => open.has(puzzle.id) && !progress.solved[puzzle.id]);
    dom.continuePuzzle.disabled = unsolved < 0;
    dom.continuePuzzle.textContent = unsolved < 0 ? "All solved" : "Next unsolved";
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

  function renderHandleControls() {
    const handles = currentPuzzle().scene.handles.filter((handle) => handle.type !== "selector");
    dom.preciseControls.hidden = handles.length === 0;
    dom.handleControls.replaceChildren();
    handles.forEach((handle) => {
      const row = document.createElement("div");
      row.className = "handle-control";
      const name = document.createElement("strong");
      name.textContent = handle.label || handle.id;
      const fields = document.createElement("div");
      fields.className = "handle-fields";
      const scalar = ["slider", "timeline", "dial"].includes(handle.type);
      const keys = scalar ? ["value"] : (handle.type === "frame" || handle.type === "pose") ? ["x", "y", "yaw"] : ["x", "y"];
      keys.forEach((key) => {
        const field = document.createElement("label");
        field.className = "handle-field";
        const caption = document.createElement("span");
        caption.textContent = key === "value" ? (handle.type === "dial" ? "angle °" : "value") : key === "yaw" ? "yaw °" : key;
        const input = document.createElement("input");
        input.type = handle.type === "slider" || handle.type === "timeline" ? "range" : "number";
        input.step = input.type === "range" ? "any" : "0.1";
        input.dataset.handleId = handle.id;
        input.dataset.key = key;
        if (input.type === "range") {
          input.min = String(Number.isFinite(handle.start) ? handle.start : handle.min);
          input.max = String(Number.isFinite(handle.end) ? handle.end : handle.max);
        }
        const readout = document.createElement("output");
        input.addEventListener(input.type === "range" ? "input" : "change", () => {
          const number = Number(input.value);
          if (!Number.isFinite(number)) return;
          if (scalar) values[handle.id] = handle.type === "dial" ? number * Math.PI / 180 : number;
          else values[handle.id] = { ...values[handle.id], [key]: key === "yaw" ? number * Math.PI / 180 : number };
          readout.textContent = number.toFixed(2);
          renderScene();
          requestLive();
        });
        field.append(caption, input, readout);
        fields.append(field);
      });
      row.append(name, fields);
      dom.handleControls.append(row);
    });
    syncHandleControls();
  }

  function syncHandleControls() {
    dom.handleControls.querySelectorAll("input[data-handle-id]").forEach((input) => {
      const handle = currentPuzzle().scene.handles.find((entry) => entry.id === input.dataset.handleId);
      const raw = input.dataset.key === "value" ? values[handle.id] : values[handle.id][input.dataset.key];
      const number = handle.type === "dial" || input.dataset.key === "yaw" ? raw * 180 / Math.PI : raw;
      if (!Number.isFinite(number)) return;
      input.value = String(Number(number.toFixed(2)));
      input.nextElementSibling.textContent = number.toFixed(2);
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
    const hasDrag = puzzle.scene.handles.some((handle) => handle.type !== "selector");
    const hasSelector = puzzle.scene.handles.some((handle) => handle.type === "selector");
    dom.visualizerKicker.textContent = config.sceneKicker;
    dom.visualizerHeading.textContent = hasDrag && hasSelector ? "Drag or choose an input" : hasDrag ? "Drag an input to explore" : hasSelector ? "Choose an input to explore" : "Watch your function run";
    dom.inputLegend.hidden = !hasDrag;
    const concept = config.conceptLink(puzzle);
    dom.walkthroughLink.href = concept.href;
    dom.walkthroughLink.textContent = concept.label;
    if (puzzle.reference) {
      dom.referenceLink.href = puzzle.reference.url;
      dom.referenceLink.textContent = puzzle.reference.label + " ↗";
      dom.referenceLink.hidden = false;
    } else {
      dom.referenceLink.hidden = true;
    }
    if (puzzle.reading) {
      dom.readingLink.href = puzzle.reading.url;
      dom.readingLink.textContent = "Also read: " + puzzle.reading.label + " ↗";
      dom.readingLink.hidden = false;
    } else {
      dom.readingLink.hidden = true;
    }
    if (!settings.keepEditor) {
      dom.codeEditor.value = progress.drafts[puzzle.id] || progress.sources[puzzle.id] || puzzle.starterSource;
      const placeholderStart = dom.codeEditor.value.indexOf("return null;");
      if (placeholderStart >= 0) dom.codeEditor.setSelectionRange(placeholderStart, placeholderStart + "return null;".length);
      if (editor) editor.refresh();
    }
    document.title = twoDigits(puzzle.number) + " · " + puzzle.title + " — " + config.title;
    values = scenes.initialValues(puzzle);
    live = null;
    renderMap();
    renderComponents();
    renderHints();
    renderFooter();
    renderSelectors();
    renderHandleControls();
    updateCursorStatus();
    setFeedback(progress.solved[puzzle.id] ? "Solved. Improve this component or continue building." : READY_MESSAGE, progress.solved[puzzle.id] ? "success" : "ready");
    clearCheckFeedback();
    renderScene();
    requestLive();
  }

  function navigate(index, options) {
    if (!isUnlocked(index)) return;
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
    if (hashIndex >= 0 && isUnlocked(hashIndex)) return hashIndex;
    const savedIndex = puzzles.findIndex((puzzle) => puzzle.id === progress.currentPuzzleId);
    if (savedIndex >= 0 && isUnlocked(savedIndex)) return savedIndex;
    return firstOpenIndex();
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
      applyLiveResult(root.evaluateLive(puzzle, response, args));
    }).catch((error) => {
      if (!error || error.kind === "superseded" || error.kind === "disposed") return;
      if (currentPuzzle() !== puzzle) return;
      applyLiveResult(errorResult(error));
    });
  }

  function scheduleLiveFromEdit() {
    storeDraft();
    updateCursorStatus();
    clearCheckFeedback();
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
    setCheckFeedback("Checking every case…", "ready");
    sketch.setState({ running: true });
    storeDraft();
    const cases = root.resolveCases(puzzle);
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
    setCheckFeedback(result.message, result.pass ? "success" : "error");
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
      if (unlocked.length) setCheckFeedback(result.message + " " + unlocked.map((track) => track.title).join(" and ") + " is now available.", "success");
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
    if (!root.confirm("Reset all " + puzzles.length + " puzzles, saved solutions, and hints? " + config.resetNote)) return;
    root.localStorage.removeItem(config.storageKey);
    progress = root.createProgress();
    currentIndex = 0;
    history.replaceState(null, "", "#" + puzzles[0].id);
    renderPuzzle();
  }

  function bindEvents() {
    dom.focusToggle.addEventListener("click", () => setFocusMode(!document.body.classList.contains("is-focused")));
    dom.mapToggle.addEventListener("click", () => setMapOpen(dom.mapContent.hidden));
    dom.puzzleSearch.addEventListener("input", renderMap);
    dom.continuePuzzle.addEventListener("click", () => navigate(firstOpenIndex()));
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
      else if (event.key === "Escape") { dom.hintPanel.hidden = true; }
    });

    root.addEventListener("hashchange", () => {
      const id = root.location.hash.replace(/^#/, "");
      const index = puzzles.findIndex((puzzle) => puzzle.id === id);
      if (index >= 0 && isUnlocked(index)) navigate(index);
      else if (index >= 0) setFeedback("That build is still locked. Complete the preceding components first.", "error");
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
    session = root.createLiveSession({ workerUrl: "puzzle-worker.js", checkTimeoutMs: config.checkTimeoutMs || 750 });
    dom.curriculumHeading.textContent = puzzles.length + " " + config.heading;
    dom.labCurriculumLabel.textContent = typeof config.curriculumLabel === "function" ? config.curriculumLabel(tracks.length) : config.curriculumLabel;
    dom.runButton.textContent = "Run input";
    dom.checkButton.textContent = "Check all";
    if (typeof root.createCodeEditor === "function") editor = root.createCodeEditor(dom.codeEditor);
    restoreFocusMode();
    currentIndex = initialIndex();
    expandedTracks.add(currentPuzzle().track);
    expandedStages.add(currentPuzzle().stage);
    const narrow = root.matchMedia("(max-width: 1260px)");
    setMapOpen(!narrow.matches);
    narrow.addEventListener("change", (event) => setMapOpen(!event.matches));
    sketch = root.createPuzzleSketch(dom.canvasHost, {
      onDrag(grip, worldPoint) {
        values = scenes.dragHandle(currentPuzzle(), values, grip, worldPoint);
        syncHandleControls();
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

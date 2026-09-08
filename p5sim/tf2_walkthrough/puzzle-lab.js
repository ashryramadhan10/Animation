(function runPuzzleLab(root) {
  "use strict";

  const puzzles = root.TF2_PUZZLES || [];
  const stages = root.TF2_PUZZLE_STAGES || [];
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  let progress = root.loadProgress(root.localStorage);
  let currentIndex = 0;
  let busy = false;
  let sketch = null;

  const dom = {};
  const ids = [
    "saveStatus", "stageMap", "puzzleCounter", "puzzleNumber", "puzzleStage", "puzzleTitle",
    "puzzleGoal", "puzzleSignature", "walkthroughLink", "canvasHost", "runState",
    "componentShelf", "componentCount", "codeEditor", "codePieces", "piecesCard", "runButton",
    "checkButton", "resetCodeButton", "hintButton", "hintPanel", "feedbackPanel",
    "caseComparison", "previousPuzzle", "previousPuzzleLabel", "nextPuzzle", "nextPuzzleLabel",
    "resetProgress", "solvedCount", "progressFill", "lineStatus",
  ];

  function twoDigits(number) {
    return String(number).padStart(2, "0");
  }

  function currentPuzzle() {
    return puzzles[currentIndex];
  }

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
    dom.saveStatus.textContent = "Saving…";
    dom.saveStatus.classList.add("is-saving");
    save();
  }

  function setFeedback(message, kind) {
    dom.feedbackPanel.textContent = message;
    dom.feedbackPanel.classList.toggle("is-success", kind === "success");
    dom.feedbackPanel.classList.toggle("is-error", kind === "error");
    dom.runState.textContent = kind === "success" ? "Matched" : kind === "error" ? "Needs work" : busy ? "Running" : "Ready";
    dom.runState.classList.toggle("is-running", busy);
    dom.runState.classList.toggle("is-success", kind === "success");
    dom.runState.classList.toggle("is-error", kind === "error");
  }

  function renderComparison(result) {
    if (!result || !result.testCase || result.pass) {
      dom.caseComparison.hidden = true;
      dom.caseComparison.innerHTML = "";
      return;
    }
    const rows = [
      ["Input", result.testCase.args],
      ["Expected", result.testCase.expected],
      ["Yours", result.actual],
    ];
    dom.caseComparison.innerHTML = rows.map((row) => (
      "<div class=\"case-row\"><span>" + row[0] + "</span><code>" +
      escapeHtml(JSON.stringify(row[1], null, 2)) + "</code></div>"
    )).join("");
    dom.caseComparison.hidden = false;
  }

  function escapeHtml(value) {
    const node = document.createElement("span");
    node.textContent = value;
    return node.innerHTML;
  }

  function stageProgress(stage) {
    const members = puzzles.filter((puzzle) => puzzle.stage === stage.id);
    return members.filter((puzzle) => progress.solved[puzzle.id]).length + "/" + members.length;
  }

  function renderMap() {
    dom.stageMap.innerHTML = "";
    stages.forEach((stage) => {
      const section = document.createElement("section");
      section.className = "stage-group";
      const heading = document.createElement("h3");
      heading.className = "stage-name";
      heading.innerHTML = "<span>" + escapeHtml(stage.title) + "</span><span>" + stageProgress(stage) + "</span>";
      const list = document.createElement("div");
      list.className = "puzzle-list";
      puzzles.filter((puzzle) => puzzle.stage === stage.id).forEach((puzzle) => {
        const index = puzzle.number - 1;
        const solved = Boolean(progress.solved[puzzle.id]);
        const locked = index > progress.highestUnlocked;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "puzzle-map-button";
        if (solved) button.classList.add("is-solved");
        if (index === currentIndex) button.classList.add("is-current");
        button.disabled = locked;
        button.setAttribute("aria-current", index === currentIndex ? "step" : "false");
        button.innerHTML =
          "<span class=\"map-number\">" + twoDigits(puzzle.number) + "</span>" +
          "<span class=\"map-title\">" + escapeHtml(puzzle.title) + "</span>" +
          "<span class=\"map-state\" aria-hidden=\"true\">" + (locked ? "·" : solved ? "✓" : index === currentIndex ? "◆" : "○") + "</span>";
        button.addEventListener("click", () => navigate(index));
        list.append(button);
      });
      section.append(heading, list);
      dom.stageMap.append(section);
    });
  }

  function renderComponents() {
    const puzzle = currentPuzzle();
    const requiredIds = new Set(root.collectDependencyIds(puzzles, puzzle));
    const solvedPuzzles = puzzles.filter((entry) => progress.solved[entry.id]);
    dom.componentShelf.innerHTML = "";
    if (solvedPuzzles.length === 0) {
      dom.componentShelf.innerHTML = "<div class=\"empty-shelf\">Solve a component and it will live here.</div>";
    } else {
      solvedPuzzles.forEach((entry) => {
        const chip = document.createElement("span");
        chip.className = "component-chip";
        if (requiredIds.has(entry.id)) chip.classList.add("is-required");
        chip.textContent = entry.functionName + "()";
        chip.title = requiredIds.has(entry.id) ? "Used by this puzzle" : entry.signature;
        dom.componentShelf.append(chip);
      });
    }
    dom.componentCount.textContent = solvedPuzzles.length + " ready";
  }

  function renderPieces() {
    const puzzle = currentPuzzle();
    dom.codePieces.innerHTML = "";
    dom.piecesCard.hidden = puzzle.codePieces.length === 0;
    puzzle.codePieces.forEach((piece) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "piece-button";
      button.textContent = piece;
      button.addEventListener("click", () => insertPiece(piece));
      dom.codePieces.append(button);
    });
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
    dom.nextPuzzleLabel.textContent = next ? next.title : "Lab complete";
    dom.solvedCount.textContent = solved + " solved";
    dom.progressFill.style.width = (solved / puzzles.length * 100) + "%";
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
    dom.puzzleSignature.textContent = puzzle.signature;
    dom.walkthroughLink.href = "index.html#" + puzzle.walkthroughChapter;
    dom.walkthroughLink.textContent = "Review " + puzzle.walkthroughChapter.replaceAll("-", " ") + " ↗";
    if (!settings.keepEditor) {
      dom.codeEditor.value = progress.drafts[puzzle.id] || progress.sources[puzzle.id] || puzzle.starterSource;
      const placeholderStart = dom.codeEditor.value.indexOf("return null;");
      if (placeholderStart >= 0) {
        dom.codeEditor.setSelectionRange(placeholderStart, placeholderStart + "return null;".length);
      }
    }
    document.title = twoDigits(puzzle.number) + " · " + puzzle.title + " — TF2 Puzzle Lab";
    renderMap();
    renderComponents();
    renderPieces();
    renderHints();
    renderFooter();
    updateCursorStatus();
    setFeedback(progress.solved[puzzle.id] ? "Solved. You can improve this component or continue building." : "Run the visible example whenever you want. Check when the geometry looks right.", progress.solved[puzzle.id] ? "success" : "ready");
    renderComparison(null);
    const publicCase = puzzle.publicCases[0];
    sketch.setState({ puzzle, input: publicCase.args, expected: publicCase.expected, actual: null, comparison: null, running: false });
  }

  function navigate(index, options) {
    if (index < 0 || index >= puzzles.length || index > progress.highestUnlocked) return;
    currentIndex = index;
    const puzzle = currentPuzzle();
    progress.currentPuzzleId = puzzle.id;
    save();
    const hash = "#" + puzzle.id;
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

  function insertPiece(piece) {
    const editor = dom.codeEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    const spacerBefore = before && !/\s$/.test(before) ? " " : "";
    const spacerAfter = after && !/^\s/.test(after) ? " " : "";
    editor.value = before + spacerBefore + piece + spacerAfter + after;
    const caret = before.length + spacerBefore.length + piece.length;
    editor.focus();
    editor.setSelectionRange(caret, caret);
    storeDraft();
    updateCursorStatus();
  }

  function updateCursorStatus() {
    const before = dom.codeEditor.value.slice(0, dom.codeEditor.selectionStart);
    const lines = before.split("\n");
    dom.lineStatus.textContent = "Line " + lines.length + ", column " + (lines[lines.length - 1].length + 1);
  }

  async function execute(mode) {
    if (busy) return;
    const puzzle = currentPuzzle();
    busy = true;
    dom.runButton.disabled = true;
    dom.checkButton.disabled = true;
    setFeedback(mode === "check" ? "Checking every behavior…" : "Running the visible example…", "ready");
    sketch.setState({ running: true });
    storeDraft();

    let dependencies;
    try {
      dependencies = root.dependencySources(puzzles, progress, puzzle);
    } catch (error) {
      busy = false;
      dom.runButton.disabled = false;
      dom.checkButton.disabled = false;
      sketch.setState({ running: false });
      setFeedback(error.message, "error");
      return;
    }

    const cases = mode === "check" ? puzzle.publicCases.concat(puzzle.checkCases) : puzzle.publicCases;
    let response;
    try {
      response = await root.runPuzzleWorker({
        functionName: puzzle.functionName,
        source: dom.codeEditor.value,
        dependencySources: dependencies,
        cases,
      });
    } catch (error) {
      response = { ok: false, error };
    }

    const result = root.evaluateResults(puzzle, response, mode);
    busy = false;
    dom.runButton.disabled = false;
    dom.checkButton.disabled = false;
    sketch.setState({ running: false });
    setFeedback(result.message, result.pass ? "success" : "error");
    renderComparison(result);

    const shownCase = result.testCase || puzzle.publicCases[0];
    sketch.setState({
      puzzle,
      input: shownCase.args,
      expected: shownCase.expected,
      actual: result.actual,
      comparison: result.comparison || { pass: result.pass },
    });

    if (mode === "check" && result.pass) {
      progress = root.completePuzzle(progress, puzzle, dom.codeEditor.value, new Date().toISOString(), puzzles);
      save();
      sketch.celebrate();
      renderMap();
      renderComponents();
      renderFooter();
    }
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
      const result = root.resetPuzzle(progress, puzzles, puzzle.id);
      progress = result.progress;
    } else if (!root.confirm("Restore the starter code for this puzzle?")) {
      return;
    }
    progress.drafts[puzzle.id] = puzzle.starterSource;
    progress.currentPuzzleId = puzzle.id;
    save();
    renderPuzzle();
  }

  function resetAllProgress() {
    if (!root.confirm("Reset all 30 puzzles, saved solutions, and hints? The walkthrough is not affected.")) return;
    root.localStorage.removeItem(root.STORAGE_KEY);
    progress = root.createProgress();
    currentIndex = 0;
    history.replaceState(null, "", "#" + puzzles[0].id);
    renderPuzzle();
  }

  function bindEvents() {
    dom.codeEditor.addEventListener("input", storeDraft);
    dom.codeEditor.addEventListener("click", updateCursorStatus);
    dom.codeEditor.addEventListener("keyup", updateCursorStatus);
    dom.codeEditor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        insertPiece("  ");
      }
    });
    dom.runButton.addEventListener("click", () => execute("run"));
    dom.checkButton.addEventListener("click", () => execute("check"));
    dom.hintButton.addEventListener("click", revealHint);
    dom.resetCodeButton.addEventListener("click", resetCode);
    dom.resetProgress.addEventListener("click", resetAllProgress);
    dom.previousPuzzle.addEventListener("click", () => navigate(currentIndex - 1));
    dom.nextPuzzle.addEventListener("click", () => navigate(currentIndex + 1));

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        execute("check");
      } else if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        execute("run");
      } else if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(currentIndex - 1);
      } else if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        navigate(currentIndex + 1);
      } else if (event.key === "Escape") {
        renderComparison(null);
        dom.hintPanel.hidden = true;
      }
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
    const catalogStatus = root.validateCatalog(puzzles);
    if (!catalogStatus.valid || puzzles.length !== 30) {
      dom.feedbackPanel.textContent = catalogStatus.valid ? "The lab expected 30 puzzles." : catalogStatus.message;
      dom.feedbackPanel.classList.add("is-error");
      return;
    }
    currentIndex = initialIndex();
    sketch = root.createPuzzleSketch(dom.canvasHost, {});
    bindEvents();
    history.replaceState(null, "", "#" + currentPuzzle().id);
    renderPuzzle();
  }

  root.addEventListener("DOMContentLoaded", initialize);
})(window);

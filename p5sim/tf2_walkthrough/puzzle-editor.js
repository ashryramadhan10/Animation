(function exposePuzzleEditor(root) {
  "use strict";

  const KEYWORDS = new Set([
    "function", "return", "var", "let", "const", "if", "else", "for", "while", "do", "break", "continue",
    "new", "typeof", "instanceof", "in", "of", "true", "false", "null", "undefined", "this",
    "switch", "case", "default", "throw", "try", "catch", "finally",
  ]);
  const BUILTINS = new Set([
    "Math", "Infinity", "NaN", "Array", "Object", "Number", "String", "Set", "JSON", "Map", "BigInt",
    "PI", "TWO_PI", "TAU", "HALF_PI", "QUARTER_PI",
    "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sqrt", "sq", "pow", "abs", "floor", "ceil", "round",
    "exp", "log", "min", "max", "radians", "degrees", "constrain", "lerp", "norm", "map", "dist", "mag",
  ]);
  const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|([^\s\w$]+)/g;
  const UNIT = "  ";
  const CLOSERS = { "(": ")", "[": "]", "{": "}" };
  const QUOTES = { "\"": "\"", "'": "'", "`": "`" };

  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(source) {
    let out = "";
    let last = 0;
    source.replace(TOKEN, (match, comment, string, number, word, punct, offset) => {
      out += escapeHtml(source.slice(last, offset));
      last = offset + match.length;
      let cls = "tok-punct";
      if (comment) cls = "tok-comment";
      else if (string) cls = "tok-string";
      else if (number) cls = "tok-number";
      else if (word) {
        if (KEYWORDS.has(word)) cls = "tok-keyword";
        else if (/\.\s*$/.test(source.slice(0, offset))) cls = "tok-property";
        else if (BUILTINS.has(word)) cls = "tok-builtin";
        else if (/^\s*\(/.test(source.slice(last))) cls = "tok-call";
        else cls = "tok-ident";
      }
      out += "<span class=\"" + cls + "\">" + escapeHtml(match) + "</span>";
      return match;
    });
    out += escapeHtml(source.slice(last));
    return out + "\n";
  }

  // ------------------------------------------------------------------ pure text transforms
  // Every transform takes the full text with a selection and returns the text with its new
  // selection, or null when the key should do whatever the browser normally does. Keeping them
  // free of the DOM is what lets the suite test them under Node.
  function lineStartOf(value, position) { return value.lastIndexOf("\n", position - 1) + 1; }
  function lineEndOf(value, position) {
    const at = value.indexOf("\n", position);
    return at === -1 ? value.length : at;
  }
  function blockOf(value, start, end) {
    return { from: lineStartOf(value, start), to: lineEndOf(value, end) };
  }
  function rebuild(value, from, to, text, start, end) {
    return { value: value.slice(0, from) + text + value.slice(to), start, end };
  }

  function indentSelection(value, start, end) {
    const span = blockOf(value, start, end);
    const lines = value.slice(span.from, span.to).split("\n");
    const text = lines.map((line) => UNIT + line).join("\n");
    return rebuild(value, span.from, span.to, text, start + UNIT.length, end + UNIT.length * lines.length);
  }
  function outdentSelection(value, start, end) {
    const span = blockOf(value, start, end);
    const lines = value.slice(span.from, span.to).split("\n");
    let first = 0, total = 0;
    const text = lines.map((line, index) => {
      const match = line.match(/^ {1,2}|^\t/);
      const cut = match ? match[0].length : 0;
      if (index === 0) first = cut;
      total += cut;
      return line.slice(cut);
    }).join("\n");
    if (total === 0) return null;
    return rebuild(value, span.from, span.to, text, Math.max(span.from, start - first), Math.max(span.from, end - total));
  }
  function toggleComment(value, start, end) {
    const span = blockOf(value, start, end);
    const lines = value.slice(span.from, span.to).split("\n");
    const filled = lines.filter((line) => line.trim().length > 0);
    if (filled.length === 0) return null;
    const commented = filled.every((line) => /^\s*\/\//.test(line));
    let first = 0, total = 0;
    const text = lines.map((line, index) => {
      if (line.trim().length === 0) return line;
      let next;
      if (commented) next = line.replace(/^(\s*)\/\/ ?/, "$1");
      else {
        const indent = Math.min.apply(null, filled.map((entry) => entry.match(/^\s*/)[0].length));
        next = line.slice(0, indent) + "// " + line.slice(indent);
      }
      const delta = next.length - line.length;
      if (index === 0) first = delta;
      total += delta;
      return next;
    }).join("\n");
    return rebuild(value, span.from, span.to, text, Math.max(span.from, start + first), Math.max(span.from, end + total));
  }
  function moveLines(value, start, end, direction) {
    const span = blockOf(value, start, end);
    const block = value.slice(span.from, span.to);
    if (direction < 0) {
      if (span.from === 0) return null;
      const above = lineStartOf(value, span.from - 1);
      const previous = value.slice(above, span.from - 1);
      const shift = span.from - above;
      return rebuild(value, above, span.to, block + "\n" + previous, start - shift, end - shift);
    }
    if (span.to >= value.length) return null;
    const below = lineEndOf(value, span.to + 1);
    const following = value.slice(span.to + 1, below);
    const shift = following.length + 1;
    return rebuild(value, span.from, below, following + "\n" + block, start + shift, end + shift);
  }
  function duplicateLines(value, start, end) {
    const span = blockOf(value, start, end);
    const block = value.slice(span.from, span.to);
    const shift = block.length + 1;
    return rebuild(value, span.to, span.to, "\n" + block, start + shift, end + shift);
  }
  function breakLine(value, start, end) {
    const indent = (value.slice(lineStartOf(value, start), start).match(/^[ \t]*/) || [""])[0];
    const opens = /[{(\[]\s*$/.test(value.slice(0, start));
    const closesNext = /^\s*[}\])]/.test(value.slice(end));
    if (opens && closesNext) {
      const inner = "\n" + indent + UNIT;
      const caret = start + inner.length;
      return rebuild(value, start, end, inner + "\n" + indent, caret, caret);
    }
    const text = "\n" + indent + (opens ? UNIT : "");
    return rebuild(value, start, end, text, start + text.length, start + text.length);
  }
  function typeCharacter(value, start, end, char) {
    const closer = CLOSERS[char] || QUOTES[char];
    const next = value.slice(end, end + 1);
    if (start !== end && closer) {
      const inner = value.slice(start, end);
      return rebuild(value, start, end, char + inner + closer, start + 1, end + 1);
    }
    if (start === end && QUOTES[char] && next === char) return { value, start: start + 1, end: start + 1 };
    if (start === end && (char === ")" || char === "]" || char === "}") && next === char) return { value, start: start + 1, end: start + 1 };
    if (start !== end || !closer) return null;
    if (QUOTES[char] && /[\w$"'`]/.test(value.slice(start - 1, start))) return null;
    if (/[\w$]/.test(next)) return null;
    return rebuild(value, start, end, char + closer, start + 1, start + 1);
  }
  function closePair(value, start, end) {
    if (start !== end || start === 0) return null;
    const before = value.slice(start - 1, start);
    const after = value.slice(start, start + 1);
    const closer = CLOSERS[before] || QUOTES[before];
    if (!closer || closer !== after) return null;
    return rebuild(value, start - 1, start + 1, "", start - 1, start - 1);
  }
  function dedentClosing(value, start, end, char) {
    if (start !== end) return null;
    const from = lineStartOf(value, start);
    const line = value.slice(from, start);
    if (!/^ {2,}$/.test(line)) return null;
    const kept = line.slice(UNIT.length);
    return rebuild(value, from, start, kept + char, from + kept.length + 1, from + kept.length + 1);
  }

  const transforms = {
    lineStartOf, lineEndOf, indentSelection, outdentSelection, toggleComment,
    moveLines, duplicateLines, breakLine, typeCharacter, closePair, dedentClosing,
  };

  // ------------------------------------------------------------------ the DOM layer
  function createCodeEditor(textarea) {
    const shell = document.createElement("div");
    shell.className = "code-editor-shell";
    textarea.parentNode.insertBefore(shell, textarea);
    const gutter = document.createElement("div");
    gutter.className = "code-gutter";
    gutter.setAttribute("aria-hidden", "true");
    const numbers = document.createElement("div");
    numbers.className = "code-gutter-lines";
    gutter.append(numbers);
    const band = document.createElement("div");
    band.className = "code-active-line";
    band.setAttribute("aria-hidden", "true");
    const pre = document.createElement("pre");
    pre.className = "code-highlight";
    pre.setAttribute("aria-hidden", "true");
    const code = document.createElement("code");
    pre.append(code);
    shell.append(band, pre, gutter, textarea);
    textarea.classList.add("code-editor-input");
    textarea.setAttribute("wrap", "off");

    let counted = -1;
    let rowHeight = 0;

    function measure() {
      const styles = getComputedStyle(textarea);
      const height = parseFloat(styles.lineHeight);
      rowHeight = Number.isFinite(height) ? height : parseFloat(styles.fontSize) * 1.65;
      shell.style.setProperty("--code-line-height", rowHeight + "px");
    }
    function syncScroll() {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
      numbers.style.transform = "translateY(" + -textarea.scrollTop + "px)";
      placeBand();
    }
    function placeBand() {
      if (!rowHeight) measure();
      const index = textarea.value.slice(0, textarea.selectionStart).split("\n").length - 1;
      band.style.transform = "translateY(" + (index * rowHeight - textarea.scrollTop) + "px)";
      const active = numbers.querySelector(".is-active");
      if (active) active.classList.remove("is-active");
      const target = numbers.children[index];
      if (target) target.classList.add("is-active");
    }
    function refreshGutter() {
      const total = textarea.value.split("\n").length;
      if (total === counted) return;
      counted = total;
      let html = "";
      for (let line = 1; line <= total; line += 1) html += "<span>" + line + "</span>";
      numbers.innerHTML = html;
      shell.style.setProperty("--code-gutter-digits", String(total).length);
    }
    function refresh() {
      code.innerHTML = highlight(textarea.value);
      refreshGutter();
      syncScroll();
    }
    // execCommand keeps the browser's own undo history alive, which assigning to value would wipe.
    function apply(result) {
      if (!result) return false;
      const before = textarea.value;
      if (result.value !== before) {
        let head = 0;
        while (head < before.length && head < result.value.length && before[head] === result.value[head]) head += 1;
        let tail = 0;
        while (tail < before.length - head && tail < result.value.length - head
          && before[before.length - 1 - tail] === result.value[result.value.length - 1 - tail]) tail += 1;
        textarea.setSelectionRange(head, before.length - tail);
        let inserted = false;
        try { inserted = document.execCommand("insertText", false, result.value.slice(head, result.value.length - tail)); }
        catch (error) { inserted = false; }
        if (!inserted) {
          textarea.value = result.value;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      textarea.setSelectionRange(result.start, result.end);
      refresh();
      return true;
    }

    textarea.addEventListener("input", refresh);
    textarea.addEventListener("scroll", syncScroll);
    textarea.addEventListener("click", placeBand);
    textarea.addEventListener("keyup", placeBand);
    textarea.addEventListener("keydown", (event) => {
      const value = textarea.value, start = textarea.selectionStart, end = textarea.selectionEnd;
      const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
      if (event.key.toLowerCase() === "m" && event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        const target = document.getElementById("hintButton");
        if (target) target.focus();
      } else if (event.key === "Tab") {
        event.preventDefault();
        apply(event.shiftKey ? outdentSelection(value, start, end) : (start === end ? rebuild(value, start, end, UNIT, start + UNIT.length, start + UNIT.length) : indentSelection(value, start, end)));
      } else if (event.key === "Enter" && plain) {
        event.preventDefault();
        apply(breakLine(value, start, end));
      } else if (event.key === "Backspace" && plain) {
        if (apply(closePair(value, start, end))) event.preventDefault();
      } else if (event.key === "/" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        apply(toggleComment(value, start, end));
      } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        if (event.shiftKey && event.key === "ArrowDown") apply(duplicateLines(value, start, end));
        else apply(moveLines(value, start, end, event.key === "ArrowUp" ? -1 : 1));
      } else if (plain && event.key.length === 1) {
        const paired = typeCharacter(value, start, end, event.key);
        if (paired) { event.preventDefault(); apply(paired); return; }
        if (event.key === "}" || event.key === ")" || event.key === "]") {
          if (apply(dedentClosing(value, start, end, event.key))) event.preventDefault();
        }
      }
    });

    measure();
    refresh();
    return { refresh, highlight };
  }

  const api = Object.assign({ createCodeEditor, highlight }, transforms);
  root.createCodeEditor = createCodeEditor;
  root.PuzzleEditor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

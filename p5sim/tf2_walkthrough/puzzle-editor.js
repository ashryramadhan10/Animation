(function exposePuzzleEditor(root) {
  "use strict";

  const KEYWORDS = new Set([
    "function", "return", "var", "let", "const", "if", "else", "for", "while", "do", "break", "continue",
    "new", "typeof", "instanceof", "in", "of", "true", "false", "null", "undefined", "this",
    "switch", "case", "default", "throw", "try", "catch", "finally",
  ]);
  const BUILTINS = new Set([
    "Math", "Infinity", "NaN", "Array", "Object", "Number", "String", "Set", "JSON",
    "PI", "TWO_PI", "TAU", "HALF_PI", "QUARTER_PI",
    "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sqrt", "sq", "pow", "abs", "floor", "ceil", "round",
    "exp", "log", "min", "max", "radians", "degrees", "constrain", "lerp", "norm", "map", "dist", "mag",
  ]);
  const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|([^\s\w$]+)/g;

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

  function createCodeEditor(textarea) {
    const shell = document.createElement("div");
    shell.className = "code-editor-shell";
    textarea.parentNode.insertBefore(shell, textarea);
    const pre = document.createElement("pre");
    pre.className = "code-highlight";
    pre.setAttribute("aria-hidden", "true");
    const code = document.createElement("code");
    pre.append(code);
    shell.append(pre, textarea);
    textarea.classList.add("code-editor-input");
    textarea.setAttribute("wrap", "off");

    function syncScroll() {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    }
    function refresh() {
      code.innerHTML = highlight(textarea.value);
      syncScroll();
    }
    function notify() {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function replaceSelection(text, caretOffset) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      const caret = start + (caretOffset === undefined ? text.length : caretOffset);
      textarea.setSelectionRange(caret, caret);
      notify();
    }
    function lineStartAt(position) {
      return textarea.value.lastIndexOf("\n", position - 1) + 1;
    }
    function indentOfLine(position) {
      const line = textarea.value.slice(lineStartAt(position), position);
      return (line.match(/^[ \t]*/) || [""])[0];
    }

    textarea.addEventListener("input", refresh);
    textarea.addEventListener("scroll", syncScroll);
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) {
          const start = textarea.selectionStart;
          const lineStart = lineStartAt(start);
          const removed = textarea.value.slice(lineStart).match(/^ {1,2}/);
          if (!removed) return;
          textarea.value = textarea.value.slice(0, lineStart) + textarea.value.slice(lineStart + removed[0].length);
          const caret = Math.max(lineStart, start - removed[0].length);
          textarea.setSelectionRange(caret, caret);
          notify();
        } else {
          replaceSelection("  ");
        }
      } else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const start = textarea.selectionStart;
        const indent = indentOfLine(start);
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(textarea.selectionEnd);
        const opens = /[{(\[]\s*$/.test(before);
        const closesNext = /^\s*[}\])]/.test(after);
        if (opens && closesNext) {
          const insertion = "\n" + indent + "  \n" + indent;
          replaceSelection(insertion, ("\n" + indent + "  ").length);
        } else {
          replaceSelection("\n" + indent + (opens ? "  " : ""));
        }
      } else if ((event.key === "}" || event.key === ")" || event.key === "]") && textarea.selectionStart === textarea.selectionEnd) {
        const start = textarea.selectionStart;
        const lineStart = lineStartAt(start);
        const line = textarea.value.slice(lineStart, start);
        if (!/^ {2,}$/.test(line)) return;
        event.preventDefault();
        const kept = line.slice(2);
        textarea.value = textarea.value.slice(0, lineStart) + kept + event.key + textarea.value.slice(start);
        const caret = lineStart + kept.length + 1;
        textarea.setSelectionRange(caret, caret);
        notify();
      }
    });

    refresh();
    return { refresh, highlight };
  }

  const api = { createCodeEditor, highlight };
  root.createCodeEditor = createCodeEditor;
  root.PuzzleEditor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

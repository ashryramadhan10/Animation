(function defineAlgoCore(root) {
  "use strict";

  const MOD = 1000000007;
  const BOOK_URL = "https://cses.fi/book/book.pdf";
  const BIG = 200000;

  const SECTION_ORDER = Object.freeze([
    { id: "intro", title: "Introductory Problems", subtitle: "Simulation, arithmetic, greedy scans, constructions, backtracking." },
    { id: "sorting", title: "Sorting and Searching", subtitle: "Sort then scan, prefix sums, binary search, two pointers, sweeps." },
    { id: "dp", title: "Dynamic Programming", subtitle: "Tables built from smaller answers." },
    { id: "graphs", title: "Graph Algorithms", subtitle: "Traversals, components, shortest paths, flows." },
    { id: "range", title: "Range Queries", subtitle: "Prefix sums, sparse tables, Fenwick and segment trees." },
    { id: "trees", title: "Tree Algorithms", subtitle: "Subtrees, diameters, lifting, Euler tours." },
    { id: "math", title: "Mathematics", subtitle: "Modular arithmetic, primes, combinatorics, games." },
    { id: "strings", title: "String Algorithms", subtitle: "Hashing, borders, suffix structures." },
    { id: "geometry", title: "Geometry", subtitle: "Cross products, hulls, sweeps." },
    { id: "window", title: "Sliding Window Problems", subtitle: "Deques and order statistics over a moving window." },
    { id: "bitwise", title: "Bitwise Operations", subtitle: "Xor bases, SOS DP, bit counting." },
    { id: "construction", title: "Construction Problems", subtitle: "Build an object with the required property." },
    { id: "advanced", title: "Advanced Techniques", subtitle: "Meet in the middle, treaps, offline tricks." },
    { id: "advanced-graphs", title: "Advanced Graph Problems", subtitle: "Trees, spanning trees, connectivity, flows." },
    { id: "counting", title: "Counting Problems", subtitle: "Combinatorial counting on grids and permutations." },
    { id: "additional-i", title: "Additional Problems I", subtitle: "Mixed harder tasks." },
    { id: "additional-ii", title: "Additional Problems II", subtitle: "Mixed harder tasks." },
  ]);

  const registry = new Map();
  const shared = {};
  function share(functions) { Object.assign(shared, functions); }

  function lazy(fn) {
    let value, done = false;
    return () => { if (!done) { value = fn(); done = true; } return value; };
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomInts(seed, count, lo, hi) {
    const next = rng(seed);
    const out = new Array(count);
    for (let i = 0; i < count; i += 1) out[i] = lo + Math.floor(next() * (hi - lo + 1));
    return out;
  }
  function randomPermutation(seed, n) {
    const next = rng(seed);
    const out = new Array(n);
    for (let i = 0; i < n; i += 1) out[i] = i + 1;
    for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); const swap = out[i]; out[i] = out[j]; out[j] = swap; }
    return out;
  }
  function randomGrid(seed, rows, cols, wall, wallChar, floorChar, ratio) {
    const next = rng(seed);
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      let row = "";
      for (let c = 0; c < cols; c += 1) row += next() < ratio ? wallChar : floorChar;
      out.push(row);
    }
    return out;
  }
  function randomTreeBosses(seed, n, chain) {
    const next = rng(seed);
    const bosses = [];
    for (let v = 2; v <= n; v += 1) bosses.push(v <= chain ? v - 1 : 1 + Math.floor(next() * (v - 1)));
    return bosses;
  }
  function edgesFromBosses(bosses) { return bosses.map((boss, i) => [boss, i + 2]); }

  function src(fn) { return fn.toString(); }
  function lines() { return Array.from(arguments).join("\n"); }
  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function example(args, expected, label) { return Object.freeze({ args, expected, label }); }
  function run(solve, args, label) { return example(args, solve.apply(null, clone(args)), label); }
  function hidden(label, make) { return Object.freeze({ label, make }); }
  function diagnosis(id, message, fn) { return Object.freeze({ id, message, source: src(fn) }); }
  function book(section, title) { return Object.freeze({ label: "Handbook · " + section + " " + title, url: BOOK_URL }); }
  function preset(id, options, extra) {
    if (Array.isArray(id)) { extra = id; id = undefined; options = undefined; }
    const handle = { id: "preset", type: "selector", label: "input" };
    if (options) { handle.value = options[0]; handle.options = options; }
    return [handle].concat(extra || []);
  }

  function define(sectionId, entries) {
    registry.set(sectionId, (registry.get(sectionId) || []).concat(entries));
  }

  function makePuzzle(config, number, section) {
    const cases = config.cases || [];
    const hiddenList = (config.hidden || []).concat(cases.filter((entry) => typeof entry.make === "function"));
    const staticCases = cases.filter((entry) => typeof entry.make !== "function");
    const handles = config.scene.handles.map((handle) => {
      if (handle.id === "preset" && !handle.options) {
        const options = Object.keys(config.presets || {});
        return Object.freeze({ ...handle, value: options[0], options });
      }
      return Object.freeze(handle);
    });
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      reading: null,
      allowMutation: false,
      ...config,
      number,
      track: section.id,
      stage: section.id,
      walkthroughChapter: String(config.cses.id),
      referenceSource: src(config.solve),
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      presets: config.presets ? Object.freeze(config.presets) : null,
      hidden: Object.freeze(hiddenList),
      publicCases: Object.freeze(staticCases.slice(0, 1)),
      checkCases: Object.freeze(staticCases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(handles),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  function build() {
    const stages = [], tracks = [], puzzles = [];
    SECTION_ORDER.forEach((section) => {
      const entries = registry.get(section.id) || [];
      if (!entries.length) return;
      const first = puzzles.length + 1;
      entries.forEach((entry) => puzzles.push(makePuzzle(entry, puzzles.length + 1, section)));
      const stage = Object.freeze({ id: section.id, title: section.title, subtitle: section.subtitle, range: [first, puzzles.length] });
      stages.push(stage);
      tracks.push(Object.freeze({ id: section.id, title: tracks.length + 1 + " · " + section.title, stages: [stage] }));
    });
    return { STAGES: Object.freeze(stages), TRACKS: Object.freeze(tracks), PUZZLES: Object.freeze(puzzles) };
  }

  const api = Object.freeze({
    MOD, BIG, BOOK_URL, SECTION_ORDER,
    lazy, rng, randomInts, randomPermutation, randomGrid, randomTreeBosses, edgesFromBosses,
    src, lines, starter, clone, example, run, hidden, diagnosis, book, preset,
    define, build, shared, share,
  });
  root.AlgoCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

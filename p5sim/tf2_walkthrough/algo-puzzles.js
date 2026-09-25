(function assembleAlgoPuzzles(root) {
  "use strict";
  const inNode = typeof module !== "undefined" && module.exports;
  const core = inNode ? require("./algo/core.js") : root.AlgoCore;
  if (inNode) ["01-introductory", "02-sorting", "03-dp", "04-graphs", "05-range", "06-trees", "07-math", "07-math-ii", "08-strings", "09-geometry", "10-window", "11-bitwise", "12-construction", "13-advanced", "14-advanced-graphs", "15-counting", "16-additional-i"].forEach((name) => require("./algo/" + name + ".js"));
  const built = core.build();
  const byId = new Map(built.PUZZLES.map((entry) => [entry.id, entry]));
  function getPuzzle(id) { return byId.get(id) || null; }
  const api = Object.freeze({
    ALGO_PUZZLE_STAGES: built.STAGES,
    ALGO_PUZZLE_TRACKS: built.TRACKS,
    ALGO_PUZZLES: built.PUZZLES,
    getPuzzle,
  });
  root.ALGO_PUZZLE_STAGES = built.STAGES;
  root.ALGO_PUZZLE_TRACKS = built.TRACKS;
  root.ALGO_PUZZLES = built.PUZZLES;
  root.getAlgoPuzzle = getPuzzle;
  root.AlgoPuzzles = api;
  if (inNode) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

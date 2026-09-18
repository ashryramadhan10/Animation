(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  // ------------------------------------------------------------------ 1 · introductory
  function weirdAlgorithm(n) {
    const sequence = [n];
    while (n !== 1) {
      n = n % 2 === 0 ? n / 2 : 3 * n + 1;
      sequence.push(n);
    }
    return sequence;
  }
  function missingNumber(values, n) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i];
    return n * (n + 1) / 2 - sum;
  }
  function increasingArray(values) {
    let moves = 0, floor = -Infinity;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] < floor) moves += floor - values[i];
      else floor = values[i];
    }
    return moves;
  }
  function permutations(n) {
    if (n === 1) return [1];
    if (n < 4) return [];
    const out = [];
    for (let even = 2; even <= n; even += 2) out.push(even);
    for (let odd = 1; odd <= n; odd += 2) out.push(odd);
    return out;
  }
  function twoSets(n) {
    const total = n * (n + 1) / 2;
    if (total % 2 !== 0) return { possible: false, a: [], b: [] };
    const a = [], b = [];
    let start = 1;
    if (n % 4 === 3) { a.push(1, 2); b.push(3); start = 4; }
    for (let i = start; i <= n; i += 4) { a.push(i, i + 3); b.push(i + 1, i + 2); }
    return { possible: true, a, b };
  }
  function chessboardAndQueens(board) {
    const cols = new Array(8).fill(false), diag1 = new Array(15).fill(false), diag2 = new Array(15).fill(false);
    let count = 0;
    const place = (row) => {
      if (row === 8) { count += 1; return; }
      for (let col = 0; col < 8; col += 1) {
        if (board[row][col] === "*" || cols[col] || diag1[row + col] || diag2[row - col + 7]) continue;
        cols[col] = diag1[row + col] = diag2[row - col + 7] = true;
        place(row + 1);
        cols[col] = diag1[row + col] = diag2[row - col + 7] = false;
      }
    };
    place(0);
    return count;
  }

  const SAMPLE_BOARD = ["........", "........", "..*.....", "........", "........", ".....**.", "...*....", "........"];
  const EMPTY_BOARD = ["........", "........", "........", "........", "........", "........", "........", "........"];
  const MISSING_BIG = lazy(() => (() => { const out = []; for (let v = 1; v <= BIG; v += 1) if (v !== 123457) out.push(v); return out; })());

  const INTRO = [
    {
      id: "weird-algorithm", track: "intro", title: "Weird Algorithm", cses: { id: 1068, name: "Weird Algorithm" },
      goal: "Simulate the Collatz rule until n reaches 1 and return every value seen.",
      concept: "Most introductory tasks are exact simulation: write the rule, loop until the stopping condition, do not guess a formula.",
      functionName: "weirdAlgorithm", signature: "weirdAlgorithm(n) → array",
      starterSource: starter("weirdAlgorithm", "n", "even → n / 2, odd → 3n + 1; include n itself and the final 1."),
      solve: weirdAlgorithm, comparator: "deep",
      reference: book("1.4", "Working with input and output · simulation"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 30 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("stops-before-one", "The sequence must end with the final 1.", function weirdAlgorithm(n) { const sequence = [n]; while (n > 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; if (n !== 1) sequence.push(n); } return sequence; }),
        diagnosis("odd-rule-wrong", "For odd n the rule is 3n + 1, not n + 1.", function weirdAlgorithm(n) { const sequence = [n]; while (n !== 1) { n = n % 2 === 0 ? n / 2 : n + 1; sequence.push(n); } return sequence; }),
      ],
      hints: ["Start the array with n.", "Loop while n is not 1; halve even values, otherwise 3n + 1.", "Push each new value; the last one pushed is 1."],
      cases: [
        example([3], [3, 10, 5, 16, 8, 4, 2, 1], "CSES sample"),
        example([1], [1], "already one"),
        example([6], [6, 3, 10, 5, 16, 8, 4, 2, 1], "six"),
        run(weirdAlgorithm, [27], "27 takes 111 steps"),
        hidden("n = 837799, time limit", () => [837799]),
      ],
    },
    {
      id: "missing-number", track: "intro", title: "Missing Number", cses: { id: 1083, name: "Missing Number" },
      goal: "Find the one number from 1 to n that is absent.",
      concept: "Arithmetic beats searching: the sum 1 + … + n is n(n + 1) / 2, so the missing value is that minus the sum you were given.",
      functionName: "missingNumber", signature: "missingNumber(values, n) → number",
      starterSource: starter("missingNumber", "values, n"),
      solve: missingNumber, comparator: "scalar",
      reference: book("1.4", "Working with numbers · sum formula"),
      scene: { kind: "algo", view: "bars", handles: preset("missing-number", ["five", "eight", "missing at the end"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("sum-to-n-minus-one", "The full sum is n(n + 1) / 2, not n(n − 1) / 2.", function missingNumber(values, n) { let sum = 0; for (let i = 0; i < values.length; i += 1) sum += values[i]; return n * (n - 1) / 2 - sum; }),
        diagnosis("returns-count", "That returns how many numbers are missing, not which one.", function missingNumber(values, n) { return n - values.length; }),
      ],
      hints: ["Add up the values you were given.", "The complete sum is n(n + 1) / 2.", "Subtract."],
      cases: [
        example([[2, 3, 1, 5], 5], 4, "CSES sample"),
        example([[1], 2], 2, "missing at the end"),
        example([[2], 2], 1, "missing at the start"),
        hidden("n = 200 000, time limit", () => [MISSING_BIG(), BIG]),
      ],
    },
    {
      id: "increasing-array", track: "intro", title: "Increasing Array", cses: { id: 1094, name: "Increasing Array" },
      goal: "Count the minimum number of +1 moves that make the array non-decreasing.",
      concept: "A single greedy pass: carry the highest value seen so far and lift every smaller element up to it.",
      functionName: "increasingArray", signature: "increasingArray(values) → number",
      starterSource: starter("increasingArray", "values"),
      solve: increasingArray, comparator: "scalar",
      reference: book("6", "Greedy algorithms"),
      scene: { kind: "algo", view: "bars", handles: preset("increasing-array", ["sample", "already sorted", "flat", "big drop"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("compares-to-previous-original", "Compare with the raised value of the previous element, not its original value.", function increasingArray(values) { let moves = 0; for (let i = 1; i < values.length; i += 1) if (values[i] < values[i - 1]) moves += values[i - 1] - values[i]; return moves; }),
        diagnosis("counts-violations", "Count the total increase needed, not the number of elements that need raising.", function increasingArray(values) { let moves = 0, floor = -Infinity; for (let i = 0; i < values.length; i += 1) { if (values[i] < floor) moves += 1; else floor = values[i]; } return moves; }),
      ],
      hints: ["Keep the current floor: the largest value seen so far.", "If an element is below the floor, add the gap to the answer.", "Otherwise the element becomes the new floor."],
      cases: [
        example([[3, 2, 5, 1, 7]], 5, "CSES sample"),
        example([[1, 2, 3]], 0, "already increasing"),
        example([[10, 1, 1]], 18, "big drop"),
        example([[5, 5, 5]], 0, "flat"),
        hidden("n = 200 000, time limit", () => [randomInts(3, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "permutations", track: "intro", title: "Permutations", cses: { id: 1070, name: "Permutations" },
      goal: "Arrange 1..n so that no two adjacent numbers differ by exactly one; return [] when impossible.",
      concept: "A constructive answer: all evens then all odds keeps neighbours two apart. This lab expects that exact arrangement.",
      functionName: "permutations", signature: "permutations(n) → array",
      starterSource: starter("permutations", "n", "n = 1 → [1]; n = 2 or 3 → []; otherwise evens ascending then odds ascending."),
      solve: permutations, comparator: "deep",
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "bars", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("odds-first", "Odds first then evens puts n−1 and n next to each other for odd n; use evens first.", function permutations(n) { if (n === 1) return [1]; if (n < 4) return []; const out = []; for (let odd = 1; odd <= n; odd += 2) out.push(odd); for (let even = 2; even <= n; even += 2) out.push(even); return out; }),
        diagnosis("no-small-cases", "n = 2 and n = 3 have no valid arrangement; return [].", function permutations(n) { const out = []; for (let even = 2; even <= n; even += 2) out.push(even); for (let odd = 1; odd <= n; odd += 2) out.push(odd); return out; }),
      ],
      hints: ["Handle n = 1, 2, 3 by hand.", "Push 2, 4, 6, … then 1, 3, 5, ….", "Return the combined array."],
      cases: [
        example([5], [2, 4, 1, 3, 5], "CSES sample"),
        example([1], [1], "single"),
        example([3], [], "impossible"),
        example([4], [2, 4, 1, 3], "four"),
        hidden("n = 200 000, time limit", () => [BIG]),
      ],
    },
    {
      id: "two-sets", track: "intro", title: "Two Sets", cses: { id: 1092, name: "Two Sets" },
      goal: "Split 1..n into two sets with equal sums, or report that it is impossible.",
      concept: "Parity decides: the total n(n + 1) / 2 must be even. The construction pairs i with i + 3 against i + 1 with i + 2.",
      functionName: "twoSets", signature: "twoSets(n) → { possible, a, b }",
      starterSource: starter("twoSets", "n", "n % 4 == 3 → a starts [1, 2], b starts [3], continue from 4; then blocks of four: a gets i, i + 3; b gets i + 1, i + 2."),
      solve: twoSets, comparator: "deep",
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "sets", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 16 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("parity-only", "Knowing it is possible is not enough; build the two sets.", function twoSets(n) { const total = n * (n + 1) / 2; return { possible: total % 2 === 0, a: [], b: [] }; }),
        diagnosis("alternating", "Odd numbers in a and even numbers in b do not have equal sums; use blocks of four.", function twoSets(n) { const total = n * (n + 1) / 2; if (total % 2 !== 0) return { possible: false, a: [], b: [] }; const a = [], b = []; for (let i = 1; i <= n; i += 1) (i % 2 === 1 ? a : b).push(i); return { possible: true, a, b }; }),
      ],
      hints: ["If n(n + 1) / 2 is odd, it is impossible.", "When n % 4 == 3, place 1 and 2 in a, 3 in b, and continue from 4.", "For each block i, i+1, i+2, i+3: a gets i and i+3, b gets i+1 and i+2."],
      cases: [
        example([7], { possible: true, a: [1, 2, 4, 7], b: [3, 5, 6] }, "CSES sample"),
        example([6], { possible: false, a: [], b: [] }, "odd total"),
        example([4], { possible: true, a: [1, 4], b: [2, 3] }, "one block"),
        example([3], { possible: true, a: [1, 2], b: [3] }, "three"),
        hidden("n = 200 000, time limit", () => [BIG]),
      ],
    },
    {
      id: "chessboard-and-queens", track: "intro", title: "Chessboard and Queens", cses: { id: 1624, name: "Chessboard and Queens" },
      goal: "Count the ways to place eight queens on a board with some reserved squares.",
      concept: "Backtracking: place one queen per row, track used columns and both diagonals, undo on the way back.",
      functionName: "chessboardAndQueens", signature: "chessboardAndQueens(board) → number",
      starterSource: starter("chessboardAndQueens", "board", "board is eight strings; '*' is reserved. Diagonals: row + col and row − col + 7."),
      solve: chessboardAndQueens, comparator: "scalar",
      reference: book("5.3", "Backtracking · queen problem"),
      scene: { kind: "algo", view: "board", handles: preset("chessboard-and-queens", ["empty", "CSES sample", "blocked corners", "blocked row"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-diagonals", "Queens also attack along diagonals; track row + col and row − col.", function chessboardAndQueens(board) { const cols = new Array(8).fill(false); let count = 0; const place = (row) => { if (row === 8) { count += 1; return; } for (let col = 0; col < 8; col += 1) { if (board[row][col] === "*" || cols[col]) continue; cols[col] = true; place(row + 1); cols[col] = false; } }; place(0); return count; }),
        diagnosis("ignores-reserved", "Reserved squares cannot hold a queen.", function chessboardAndQueens(board) { const cols = new Array(8).fill(false), diag1 = new Array(15).fill(false), diag2 = new Array(15).fill(false); let count = 0; const place = (row) => { if (row === 8) { count += 1; return; } for (let col = 0; col < 8; col += 1) { if (cols[col] || diag1[row + col] || diag2[row - col + 7]) continue; cols[col] = diag1[row + col] = diag2[row - col + 7] = true; place(row + 1); cols[col] = diag1[row + col] = diag2[row - col + 7] = false; } }; place(0); return count; }),
      ],
      hints: ["Recurse row by row; when row reaches 8, count one placement.", "A column is free if no earlier queen used it and neither diagonal (row + col, row − col + 7) is taken.", "Mark, recurse, unmark."],
      cases: [
        example([SAMPLE_BOARD], 65, "CSES sample"),
        example([EMPTY_BOARD], 92, "empty board"),
        example([["********", "........", "........", "........", "........", "........", "........", "........"]], 0, "first row reserved"),
        run(chessboardAndQueens, [["*.......", "*.......", "*.......", "*.......", "*.......", "*.......", "*.......", "*......."]], "first column reserved"),
      ],
    },
  ];
  core.define("intro", INTRO);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

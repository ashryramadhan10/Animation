(function defineAlgoSection(core) {
  "use strict";
  const { BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;

  // ------------------------------------------------------------------ references
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
  function repetitions(dna) {
    let best = 0, run = 0;
    for (let i = 0; i < dna.length; i += 1) {
      run = i > 0 && dna[i] === dna[i - 1] ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
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
  function numberSpiral(y, x) {
    const m = BigInt(Math.max(y, x));
    const by = BigInt(y), bx = BigInt(x);
    if (m % 2n === 0n) return (by === m ? m * m - bx + 1n : (m - 1n) * (m - 1n) + by).toString();
    return (bx === m ? m * m - by + 1n : (m - 1n) * (m - 1n) + bx).toString();
  }
  function twoKnights(n) {
    const out = [];
    for (let k = 1; k <= n; k += 1) {
      const squares = k * k;
      out.push(squares * (squares - 1) / 2 - 4 * (k - 1) * (k - 2));
    }
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
  function bitStrings(n) {
    let result = 1;
    for (let i = 0; i < n; i += 1) result = (result * 2) % 1000000007;
    return result;
  }
  function trailingZeros(n) {
    let zeros = 0;
    for (let power = 5; power <= n; power *= 5) zeros += Math.floor(n / power);
    return zeros;
  }
  function coinPiles(a, b) {
    return (a + b) % 3 === 0 && 2 * Math.min(a, b) >= Math.max(a, b);
  }
  function palindromeReorder(s) {
    const counts = new Array(26).fill(0);
    for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1;
    let middle = "";
    let left = "";
    for (let c = 0; c < 26; c += 1) {
      if (counts[c] % 2 === 1) {
        if (middle !== "") return null;
        middle = String.fromCharCode(65 + c);
      }
      left += String.fromCharCode(65 + c).repeat(Math.floor(counts[c] / 2));
    }
    return left + middle + left.split("").reverse().join("");
  }
  function grayCode(n) {
    const out = [];
    for (let i = 0; i < (1 << n); i += 1) out.push((i ^ (i >> 1)).toString(2).padStart(n, "0"));
    return out;
  }
  function towerOfHanoi(n) {
    const moves = [];
    const move = (count, from, to, via) => {
      if (count === 0) return;
      move(count - 1, from, via, to);
      moves.push([from, to]);
      move(count - 1, via, to, from);
    };
    move(n, 1, 3, 2);
    return moves;
  }
  function creatingStrings(s) {
    const counts = new Array(26).fill(0);
    for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65 - (s[i] >= "a" ? 32 : 0)] += 1;
    const lower = s[0] >= "a";
    const out = [];
    const current = [];
    const build = () => {
      if (current.length === s.length) { out.push(current.join("")); return; }
      for (let c = 0; c < 26; c += 1) {
        if (counts[c] === 0) continue;
        counts[c] -= 1;
        current.push(String.fromCharCode((lower ? 97 : 65) + c));
        build();
        current.pop();
        counts[c] += 1;
      }
    };
    build();
    return out;
  }
  function appleDivision(weights) {
    const n = weights.length;
    let total = 0;
    for (let i = 0; i < n; i += 1) total += weights[i];
    let best = total;
    for (let mask = 0; mask < (1 << n); mask += 1) {
      let sum = 0;
      for (let i = 0; i < n; i += 1) if (mask & (1 << i)) sum += weights[i];
      const difference = Math.abs(total - 2 * sum);
      if (difference < best) best = difference;
    }
    return best;
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
  function raabGameI(n, a, b) {
    if (a + b > n || (a > 0) !== (b > 0)) return { possible: false, first: [], second: [] };
    const m = a + b;
    const first = [], second = [];
    for (let i = 1; i <= m; i += 1) first.push(i);
    for (let i = a + 1; i <= m; i += 1) second.push(i);
    for (let i = 1; i <= a; i += 1) second.push(i);
    for (let i = m + 1; i <= n; i += 1) { first.push(i); second.push(i); }
    return { possible: true, first, second };
  }
  function mexGridConstruction(n) {
    const rows = [];
    for (let i = 0; i < n; i += 1) {
      const row = [];
      for (let j = 0; j < n; j += 1) row.push(i ^ j);
      rows.push(row);
    }
    return rows;
  }
  function knightMovesGrid(n) {
    const distance = new Int32Array(n * n).fill(-1);
    const queue = [0];
    distance[0] = 0;
    let head = 0;
    const jumps = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    while (head < queue.length) {
      const cell = queue[head];
      head += 1;
      const r = Math.floor(cell / n), c = cell % n;
      for (let k = 0; k < 8; k += 1) {
        const nr = r + jumps[k][0], nc = c + jumps[k][1];
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        const id = nr * n + nc;
        if (distance[id] !== -1) continue;
        distance[id] = distance[cell] + 1;
        queue.push(id);
      }
    }
    const rows = [];
    for (let r = 0; r < n; r += 1) rows.push(Array.from(distance.slice(r * n, r * n + n)));
    return rows;
  }
  function gridColoringI(grid) {
    const rows = grid.length, cols = grid[0].length;
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      let row = "";
      for (let c = 0; c < cols; c += 1) {
        const banned = new Set([grid[r][c]]);
        if (r > 0) banned.add(out[r - 1][c]);
        if (c > 0) banned.add(row[c - 1]);
        let letter = "A";
        while (banned.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1);
        row += letter;
      }
      out.push(row);
    }
    return out;
  }
  function digitQueries(k) {
    let remaining = BigInt(k);
    let length = 1n, count = 9n, start = 1n;
    while (remaining > length * count) {
      remaining -= length * count;
      length += 1n;
      count *= 10n;
      start *= 10n;
    }
    const number = start + (remaining - 1n) / length;
    const index = Number((remaining - 1n) % length);
    return Number(number.toString()[index]);
  }
  function stringReorder(s) {
    const counts = new Array(26).fill(0);
    for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1;
    const out = [];
    let previous = -1;
    for (let position = 0; position < s.length; position += 1) {
      const rest = s.length - position - 1;
      let chosen = -1;
      for (let c = 0; c < 26 && chosen < 0; c += 1) {
        if (counts[c] === 0 || c === previous) continue;
        counts[c] -= 1;
        let maxOther = 0;
        for (let d = 0; d < 26; d += 1) if (d !== c && counts[d] > maxOther) maxOther = counts[d];
        if (maxOther <= Math.ceil(rest / 2) && counts[c] <= Math.floor(rest / 2)) chosen = c;
        else counts[c] += 1;
      }
      if (chosen < 0) return null;
      out.push(String.fromCharCode(65 + chosen));
      previous = chosen;
    }
    return out.join("");
  }
  function gridPathDescription(description) {
    const N = 7;
    const visited = new Uint8Array(N * N);
    let count = 0;
    const step = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
    const order = ["U", "D", "L", "R"];
    const free = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !visited[r * N + c];
    const search = (r, c, index) => {
      if (r === N - 1 && c === 0) { if (index === 48) count += 1; return; }
      if (index === 48) return;
      const up = free(r - 1, c), down = free(r + 1, c), left = free(r, c - 1), right = free(r, c + 1);
      if (!up && !down && left && right) return;
      if (!left && !right && up && down) return;
      const choices = description[index] === "?" ? order : [description[index]];
      for (let k = 0; k < choices.length; k += 1) {
        const nr = r + step[choices[k]][0], nc = c + step[choices[k]][1];
        if (!free(nr, nc)) continue;
        visited[nr * N + nc] = 1;
        search(nr, nc, index + 1);
        visited[nr * N + nc] = 0;
      }
    };
    visited[0] = 1;
    search(0, 0, 0);
    return count;
  }

  // ------------------------------------------------------------------ brute forces and validity checks
  function spiralBrute(y, x) {
    const m = Math.max(y, x);
    const grid = [];
    for (let r = 0; r <= m; r += 1) grid.push(new Array(m + 1).fill(0));
    let value = 1;
    for (let layer = 1; layer <= m; layer += 1) {
      if (layer % 2 === 0) {
        for (let r = 1; r <= layer; r += 1) { grid[r][layer] = value; value += 1; }
        for (let c = layer - 1; c >= 1; c -= 1) { grid[layer][c] = value; value += 1; }
      } else {
        for (let c = 1; c <= layer; c += 1) { grid[layer][c] = value; value += 1; }
        for (let r = layer - 1; r >= 1; r -= 1) { grid[r][layer] = value; value += 1; }
      }
    }
    return String(grid[y][x]);
  }
  function knightsBrute(n) {
    const out = [];
    for (let k = 1; k <= n; k += 1) {
      let count = 0;
      const cells = k * k;
      for (let p = 0; p < cells; p += 1) {
        for (let q = p + 1; q < cells; q += 1) {
          const dr = Math.abs(Math.floor(p / k) - Math.floor(q / k)), dc = Math.abs((p % k) - (q % k));
          if (!((dr === 1 && dc === 2) || (dr === 2 && dc === 1))) count += 1;
        }
      }
      out.push(count);
    }
    return out;
  }
  function trailingBrute(n) {
    let factorial = 1n;
    for (let i = 2n; i <= BigInt(n); i += 1n) factorial *= i;
    const text = factorial.toString();
    let zeros = 0;
    while (zeros < text.length - 1 && text[text.length - 1 - zeros] === "0") zeros += 1;
    return zeros;
  }
  function coinPilesBrute(a, b) {
    const memo = new Map();
    const reach = (x, y) => {
      if (x < 0 || y < 0) return false;
      if (x === 0 && y === 0) return true;
      const key = x * 1000 + y;
      if (memo.has(key)) return memo.get(key);
      memo.set(key, false);
      const result = reach(x - 2, y - 1) || reach(x - 1, y - 2);
      memo.set(key, result);
      return result;
    };
    return reach(a, b);
  }
  function isPermutationOfLetters(a, b) { return a.split("").sort().join("") === b.split("").sort().join(""); }
  function noEqualNeighbours(s) { for (let i = 1; i < s.length; i += 1) if (s[i] === s[i - 1]) return false; return true; }
  function reorderBrute(s) {
    const letters = s.split("").sort();
    let best = null;
    const used = new Array(letters.length).fill(false);
    const current = [];
    const walk = () => {
      if (current.length === letters.length) { const text = current.join(""); if (noEqualNeighbours(text) && (best === null || text < best)) best = text; return; }
      for (let i = 0; i < letters.length; i += 1) {
        if (used[i] || (i > 0 && letters[i] === letters[i - 1] && !used[i - 1])) continue;
        used[i] = true; current.push(letters[i]); walk(); current.pop(); used[i] = false;
      }
    };
    walk();
    return best;
  }
  function digitBrute(k) {
    let text = "";
    for (let i = 1; text.length < Number(k); i += 1) text += String(i);
    return Number(text[Number(k) - 1]);
  }
  function mexBrute(n) {
    const rows = [];
    for (let i = 0; i < n; i += 1) {
      const row = [];
      for (let j = 0; j < n; j += 1) {
        const seen = new Set();
        for (let c = 0; c < j; c += 1) seen.add(row[c]);
        for (let r = 0; r < i; r += 1) seen.add(rows[r][j]);
        let mex = 0;
        while (seen.has(mex)) mex += 1;
        row.push(mex);
      }
      rows.push(row);
    }
    return rows;
  }
  function raabCheck(args, result) {
    const n = args[0], a = args[1], b = args[2];
    if (!result.possible) return a + b > n || (a > 0) !== (b > 0);
    const sorted = (list) => list.slice().sort((p, q) => p - q).join(",");
    const identity = []; for (let i = 1; i <= n; i += 1) identity.push(i);
    if (sorted(result.first) !== identity.join(",") || sorted(result.second) !== identity.join(",")) return false;
    let wonA = 0, wonB = 0;
    for (let i = 0; i < n; i += 1) { if (result.first[i] > result.second[i]) wonA += 1; else if (result.second[i] > result.first[i]) wonB += 1; }
    return wonA === a && wonB === b;
  }
  function coloringCheck(args, result) {
    const grid = args[0];
    if (!Array.isArray(result) || result.length !== grid.length) return false;
    for (let r = 0; r < grid.length; r += 1) {
      if (result[r].length !== grid[r].length) return false;
      for (let c = 0; c < grid[r].length; c += 1) {
        if (!"ABCD".includes(result[r][c]) || result[r][c] === grid[r][c]) return false;
        if (r > 0 && result[r][c] === result[r - 1][c]) return false;
        if (c > 0 && result[r][c] === result[r][c - 1]) return false;
      }
    }
    return true;
  }
  function hanoiCheck(args, moves) {
    const n = args[0];
    const pegs = [[], [], []];
    for (let d = n; d >= 1; d -= 1) pegs[0].push(d);
    if (moves.length !== (1 << n) - 1) return false;
    for (let i = 0; i < moves.length; i += 1) {
      const from = pegs[moves[i][0] - 1], to = pegs[moves[i][1] - 1];
      if (!from.length) return false;
      const disk = from[from.length - 1];
      if (to.length && to[to.length - 1] < disk) return false;
      from.pop(); to.push(disk);
    }
    return pegs[2].length === n;
  }
  function palindromeCheck(args, result) {
    const s = args[0];
    const counts = {};
    for (let i = 0; i < s.length; i += 1) counts[s[i]] = (counts[s[i]] || 0) + 1;
    const odd = Object.keys(counts).filter((key) => counts[key] % 2 === 1).length;
    if (result === null) return odd > 1;
    return isPermutationOfLetters(s, result) && result === result.split("").reverse().join("");
  }
  function grayCheck(args, result) {
    const n = args[0];
    if (result.length !== (1 << n)) return false;
    const seen = new Set(result);
    if (seen.size !== result.length) return false;
    for (let i = 1; i < result.length; i += 1) {
      let differences = 0;
      for (let bit = 0; bit < n; bit += 1) if (result[i][bit] !== result[i - 1][bit]) differences += 1;
      if (differences !== 1) return false;
    }
    return true;
  }
  function randomLetters(seed, count, alphabet) {
    const next = rng(seed);
    let out = "";
    for (let i = 0; i < count; i += 1) out += alphabet[Math.floor(next() * alphabet.length)];
    return out;
  }

  const SAMPLE_BOARD = ["........", "........", "..*.....", "........", "........", ".....**.", "...*....", "........"];
  const EMPTY_BOARD = ["........", "........", "........", "........", "........", "........", "........", "........"];
  const MISSING_BIG = lazy(() => { const out = []; for (let v = 1; v <= BIG; v += 1) if (v !== 123457) out.push(v); return out; });
  const smallInts = (seed, count, lo, hi) => randomInts(seed, count, lo, hi);

  const INTRO = [
    {
      id: "weird-algorithm", title: "Weird Algorithm", cses: { id: 1068, name: "Weird Algorithm" },
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
      id: "missing-number", title: "Missing Number", cses: { id: 1083, name: "Missing Number" },
      goal: "Find the one number from 1 to n that is absent.",
      concept: "Arithmetic beats searching: the sum 1 + … + n is n(n + 1) / 2, so the missing value is that minus the sum you were given.",
      functionName: "missingNumber", signature: "missingNumber(values, n) → number",
      starterSource: starter("missingNumber", "values, n"),
      solve: missingNumber, comparator: "scalar",
      reference: book("1.4", "Working with numbers · sum formula"),
      presets: { five: { a: [2, 3, 1, 5], b: 5 }, eight: { a: [8, 1, 3, 6, 2, 7, 4], b: 8 }, "missing at the end": { a: [1, 2, 3, 4, 5, 6, 7], b: 8 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
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
      id: "repetitions", title: "Repetitions", cses: { id: 1069, name: "Repetitions" },
      goal: "Length of the longest run of one repeated character in a DNA string.",
      concept: "One pass with a running count: extend the run while the character matches the previous one, otherwise start a new run of length 1.",
      functionName: "repetitions", signature: "repetitions(dna) → number",
      starterSource: starter("repetitions", "dna"),
      solve: repetitions, comparator: "scalar",
      reference: book("1.4", "Working with input and output · strings"),
      presets: { "CSES sample": { a: "ATTCGGGA" }, "all same": { a: "AAAAAA" }, alternating: { a: "ACACACAC" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("max-frequency", "The letter that appears most overall is not the same as the longest consecutive run.", function repetitions(dna) { const counts = {}; let best = 0; for (let i = 0; i < dna.length; i += 1) { counts[dna[i]] = (counts[dna[i]] || 0) + 1; if (counts[dna[i]] > best) best = counts[dna[i]]; } return best; }),
        diagnosis("run-starts-at-zero", "A run of one character has length 1, not 0.", function repetitions(dna) { let best = 0, run = 0; for (let i = 1; i < dna.length; i += 1) { run = dna[i] === dna[i - 1] ? run + 1 : 0; if (run > best) best = run; } return best; }),
      ],
      hints: ["Keep the length of the current run.", "Same character as the previous one: run + 1; otherwise run = 1.", "The answer is the largest run seen."],
      cases: [
        example(["ATTCGGGA"], 3, "CSES sample"),
        example(["A"], 1, "single character"),
        example(["AAAA"], 4, "all same"),
        example(["ACGT"], 1, "no repeats"),
        hidden("n = 1 000 000, time limit", () => [randomLetters(101, 1000000, "ACGT")]),
      ],
    },
    {
      id: "increasing-array", title: "Increasing Array", cses: { id: 1094, name: "Increasing Array" },
      goal: "Count the minimum number of +1 moves that make the array non-decreasing.",
      concept: "A single greedy pass: carry the highest value seen so far and lift every smaller element up to it.",
      functionName: "increasingArray", signature: "increasingArray(values) → number",
      starterSource: starter("increasingArray", "values"),
      solve: increasingArray, comparator: "scalar",
      reference: book("6", "Greedy algorithms"),
      presets: { sample: { a: [3, 2, 5, 1, 7] }, "already sorted": { a: [1, 2, 3, 4, 5] }, flat: { a: [5, 5, 5, 5] }, "big drop": { a: [10, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
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
      id: "permutations", title: "Permutations", cses: { id: 1070, name: "Permutations" },
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
      id: "number-spiral", title: "Number Spiral", cses: { id: 1071, name: "Number Spiral" },
      goal: "The number at row y, column x of the infinite spiral, as a decimal string.",
      concept: "Layer m = max(y, x) holds (m−1)² + 1 … m². Even layers run down the right edge then left along the bottom; odd layers the other way. Answers reach 10¹⁸, so use BigInt.",
      functionName: "numberSpiral", signature: "numberSpiral(y, x) → string",
      starterSource: starter("numberSpiral", "y, x", "m = max(y, x). Even m: column m → (m−1)² + y, row m → m² − x + 1. Odd m: row m → (m−1)² + x, column m → m² − y + 1."),
      solve: numberSpiral, comparator: "deep", brute: spiralBrute, small: (round) => { const next = rng(500 + round); return [1 + Math.floor(next() * 12), 1 + Math.floor(next() * 12)]; },
      reference: book("1.4", "Working with numbers · finding a formula"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "y", type: "slider", label: "row y (rounded)", value: 2, min: 1, max: 9 },
        { id: "x", type: "slider", label: "column x (rounded)", value: 3, min: 1, max: 9 },
      ], args: [{ fixture: "roundedY" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("parity-swapped", "Even layers start at the top of the right column; odd layers start at the left of the bottom row. The two rules were swapped.", function numberSpiral(y, x) { const m = BigInt(Math.max(y, x)); const by = BigInt(y), bx = BigInt(x); if (m % 2n === 1n) return (by === m ? m * m - bx + 1n : (m - 1n) * (m - 1n) + by).toString(); return (bx === m ? m * m - by + 1n : (m - 1n) * (m - 1n) + bx).toString(); }),
        diagnosis("no-bigint", "m² reaches 10¹⁸, beyond exact Number arithmetic; use BigInt.", function numberSpiral(y, x) { const m = Math.max(y, x); if (m % 2 === 0) return String(y === m ? m * m - x + 1 : (m - 1) * (m - 1) + y); return String(x === m ? m * m - y + 1 : (m - 1) * (m - 1) + x); }),
      ],
      hints: ["m = max(y, x) is the layer.", "The layer starts at (m−1)² + 1 and ends at m².", "Work out which edge you are on and count along it; keep everything in BigInt."],
      cases: [
        example([2, 3], "8", "CSES sample"),
        example([1, 1], "1", "CSES sample"),
        example([4, 2], "15", "CSES sample"),
        example([999999998, 1000000000], "999999998999999999", "needs BigInt"),
        hidden("y = x = 10⁹", () => [1000000000, 1000000000]),
      ],
    },
    {
      id: "two-knights", title: "Two Knights", cses: { id: 1072, name: "Two Knights" },
      goal: "For every k from 1 to n, the number of ways to place two knights on a k × k board so they do not attack each other.",
      concept: "Count all pairs, then subtract attacking pairs: every 2 × 3 rectangle holds exactly two attacking placements, and there are 4(k−1)(k−2) such rectangles.",
      functionName: "twoKnights", signature: "twoKnights(n) → array of n counts",
      starterSource: starter("twoKnights", "n", "k²(k² − 1) / 2 − 4(k − 1)(k − 2) for each k."),
      solve: twoKnights, comparator: "deep", brute: knightsBrute, small: (round) => [1 + (round % 7)],
      reference: book("1.4", "Working with numbers · counting"),
      scene: { kind: "algo", view: "bars", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 8, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("all-pairs", "Attacking pairs must be subtracted.", function twoKnights(n) { const out = []; for (let k = 1; k <= n; k += 1) { const squares = k * k; out.push(squares * (squares - 1) / 2); } return out; }),
        diagnosis("attacks-doubled", "Each 2 × 3 rectangle gives two attacking placements and there are 4(k−1)(k−2) rectangles; the subtraction was doubled.", function twoKnights(n) { const out = []; for (let k = 1; k <= n; k += 1) { const squares = k * k; out.push(squares * (squares - 1) / 2 - 8 * (k - 1) * (k - 2)); } return out; }),
      ],
      hints: ["Pairs of squares: k²(k² − 1) / 2.", "Attacking pairs: 4(k − 1)(k − 2).", "Subtract, for every k up to n."],
      cases: [
        example([8], [0, 6, 28, 96, 252, 550, 1056, 1848], "CSES sample"),
        example([1], [0], "one square"),
        example([3], [0, 6, 28], "three"),
        hidden("n = 10 000, time limit", () => [10000]),
      ],
    },
    {
      id: "two-sets", title: "Two Sets", cses: { id: 1092, name: "Two Sets" },
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
      id: "bit-strings", title: "Bit Strings", cses: { id: 1617, name: "Bit Strings" },
      goal: "The number of bit strings of length n, modulo 10⁹ + 7.",
      concept: "2ⁿ, but n goes to a million, so build it by repeated doubling with a modulo after every step.",
      functionName: "bitStrings", signature: "bitStrings(n) → number",
      starterSource: starter("bitStrings", "n"),
      solve: bitStrings, comparator: "scalar",
      reference: book("1.4", "Modular arithmetic"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 3, min: 1, max: 40 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("no-mod", "2ⁿ overflows long before n = 10⁶; reduce modulo 10⁹ + 7 after each doubling.", function bitStrings(n) { return Math.pow(2, n); }),
        diagnosis("one-too-few", "Length n means n doublings, not n − 1.", function bitStrings(n) { let result = 1; for (let i = 1; i < n; i += 1) result = (result * 2) % 1000000007; return result; }),
      ],
      hints: ["Start from 1.", "Double n times.", "Take the modulo after every doubling."],
      cases: [
        example([3], 8, "CSES sample"),
        example([1], 2, "one bit"),
        example([30], 73741817, "past the modulus"),
        hidden("n = 1 000 000, time limit", () => [1000000]),
      ],
    },
    {
      id: "trailing-zeros", title: "Trailing Zeros", cses: { id: 1618, name: "Trailing Zeros" },
      goal: "How many zeros end n! in decimal.",
      concept: "A trailing zero needs a factor 10 = 2 × 5, and fives are the scarce part: count multiples of 5, 25, 125, … up to n.",
      functionName: "trailingZeros", signature: "trailingZeros(n) → number",
      starterSource: starter("trailingZeros", "n"),
      solve: trailingZeros, comparator: "scalar", brute: trailingBrute, small: (round) => [1 + (round * 7) % 200],
      reference: book("1.4", "Working with numbers · factorials"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 20, min: 1, max: 130 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("only-first-power", "25 contributes two fives, 125 three; sum over every power of 5.", function trailingZeros(n) { return Math.floor(n / 5); }),
        diagnosis("divides-by-ten", "Multiples of 10 are not the source of zeros; 5 × 2 pairs are, and every second number already supplies a 2.", function trailingZeros(n) { return Math.floor(n / 10); }),
      ],
      hints: ["Count the multiples of 5 below or equal to n.", "Add the multiples of 25, then 125, and so on.", "Stop when the power exceeds n."],
      cases: [
        example([20], 4, "CSES sample"),
        example([4], 0, "no zeros"),
        example([100], 24, "hundred"),
        hidden("n = 10⁹", () => [1000000000]),
      ],
    },
    {
      id: "coin-piles", title: "Coin Piles", cses: { id: 1754, name: "Coin Piles" },
      goal: "Can two piles of a and b coins be emptied by repeatedly removing two from one pile and one from the other?",
      concept: "Each move removes three coins, so a + b must be divisible by 3, and neither pile may exceed twice the other.",
      functionName: "coinPiles", signature: "coinPiles(a, b) → boolean",
      starterSource: starter("coinPiles", "a, b"),
      solve: coinPiles, comparator: "deep", brute: coinPilesBrute, small: (round) => { const next = rng(700 + round); return [Math.floor(next() * 30), Math.floor(next() * 30)]; },
      reference: book("1.4", "Working with numbers · invariants"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "a", type: "slider", label: "a (rounded)", value: 2, min: 0, max: 20 },
        { id: "b", type: "slider", label: "b (rounded)", value: 1, min: 0, max: 20 },
      ], args: [{ fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("sum-only", "Divisibility by 3 is necessary but not sufficient: (0, 3) is stuck.", function coinPiles(a, b) { return (a + b) % 3 === 0; }),
        diagnosis("ratio-only", "The ratio condition alone allows (1, 1), which cannot be emptied.", function coinPiles(a, b) { return 2 * Math.min(a, b) >= Math.max(a, b); }),
      ],
      hints: ["Every move removes exactly three coins.", "The larger pile loses at most two per move, so it cannot be more than twice the smaller.", "Both conditions together are enough."],
      cases: [
        example([2, 1], true, "CSES sample"),
        example([2, 2], false, "CSES sample"),
        example([3, 3], true, "CSES sample"),
        example([0, 0], true, "already empty"),
        example([0, 3], false, "one pile only"),
      ],
    },
    {
      id: "palindrome-reorder", title: "Palindrome Reorder", cses: { id: 1755, name: "Palindrome Reorder" },
      goal: "Rearrange the letters into a palindrome, or null when impossible. This lab builds the alphabetically ordered left half, the odd letter in the middle, then the mirror.",
      concept: "A palindrome needs every letter count even, except at most one. Half of each count goes left, the mirror image goes right.",
      functionName: "palindromeReorder", signature: "palindromeReorder(s) → string or null",
      starterSource: starter("palindromeReorder", "s", "Count letters A–Z; more than one odd count → null."),
      solve: palindromeReorder, comparator: "deep", check: palindromeCheck, small: (round) => [randomLetters(800 + round, 1 + (round % 9), "AABC")],
      reference: book("1.4", "Working with input and output · strings"),
      presets: { "CSES sample": { a: "AAAACACBA" }, impossible: { a: "ABC" }, even: { a: "BBAA" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-two-odds", "Two letters with odd counts cannot both sit in the middle.", function palindromeReorder(s) { const counts = new Array(26).fill(0); for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1; let middle = ""; let left = ""; for (let c = 0; c < 26; c += 1) { if (counts[c] % 2 === 1) middle += String.fromCharCode(65 + c); left += String.fromCharCode(65 + c).repeat(Math.floor(counts[c] / 2)); } return left + middle + left.split("").reverse().join(""); }),
        diagnosis("drops-middle", "The odd letter must appear in the middle; the result must use every letter.", function palindromeReorder(s) { const counts = new Array(26).fill(0); for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1; let odd = 0; let left = ""; for (let c = 0; c < 26; c += 1) { if (counts[c] % 2 === 1) odd += 1; left += String.fromCharCode(65 + c).repeat(Math.floor(counts[c] / 2)); } if (odd > 1) return null; return left + left.split("").reverse().join(""); }),
      ],
      hints: ["Count each letter.", "At most one count may be odd; that letter goes in the middle.", "Left half: each letter repeated count / 2 times in alphabetical order; then append the reverse."],
      cases: [
        example(["AAAACACBA"], "AAACBCAAA", "CSES sample (canonical order)"),
        example(["ABC"], null, "impossible"),
        example(["BBAA"], "ABBA", "even counts"),
        example(["A"], "A", "single letter"),
        hidden("n = 1 000 000, time limit", () => [randomLetters(102, 1000000, "AB").slice(0, 999999) + "A"]),
      ],
    },
    {
      id: "gray-code", title: "Gray Code", cses: { id: 2205, name: "Gray Code" },
      goal: "All 2ⁿ bit strings of length n in an order where neighbours differ in exactly one bit; this lab uses the reflected code i xor (i >> 1).",
      concept: "The reflected Gray code is one xor away from plain binary counting.",
      functionName: "grayCode", signature: "grayCode(n) → array of strings",
      starterSource: starter("grayCode", "n", "(i ^ (i >> 1)) in binary, padded to n bits, for i from 0 to 2ⁿ − 1."),
      solve: grayCode, comparator: "deep", check: grayCheck, small: (round) => [1 + (round % 8)],
      reference: book("5.1", "Generating subsets · Gray codes"),
      scene: { kind: "algo", view: "text", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 2, min: 1, max: 4 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("plain-binary", "Plain counting flips many bits between 01 and 10; xor with the shifted index.", function grayCode(n) { const out = []; for (let i = 0; i < (1 << n); i += 1) out.push(i.toString(2).padStart(n, "0")); return out; }),
        diagnosis("no-padding", "Every string must have exactly n characters.", function grayCode(n) { const out = []; for (let i = 0; i < (1 << n); i += 1) out.push((i ^ (i >> 1)).toString(2)); return out; }),
      ],
      hints: ["Loop i from 0 to 2ⁿ − 1.", "gray = i ^ (i >> 1).", "Format as binary padded with zeros to length n."],
      cases: [
        example([2], ["00", "01", "11", "10"], "CSES sample"),
        example([1], ["0", "1"], "one bit"),
        example([3], ["000", "001", "011", "010", "110", "111", "101", "100"], "three bits"),
        hidden("n = 16, time limit", () => [16]),
      ],
    },
    {
      id: "tower-of-hanoi", title: "Tower of Hanoi", cses: { id: 2165, name: "Tower of Hanoi" },
      goal: "The moves that transfer n disks from peg 1 to peg 3, as [from, to] pairs, using the standard recursion.",
      concept: "Move n − 1 disks out of the way, move the big disk, move the n − 1 back on top: 2ⁿ − 1 moves.",
      functionName: "towerOfHanoi", signature: "towerOfHanoi(n) → array of [from, to]",
      starterSource: starter("towerOfHanoi", "n", "move(count, from, to, via): move(count − 1, from, via, to); push [from, to]; move(count − 1, via, to, from)."),
      solve: towerOfHanoi, comparator: "deep", check: hanoiCheck, small: (round) => [1 + (round % 8)],
      reference: book("5", "Complete search · recursion"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 2, min: 1, max: 6 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("big-disk-first", "The n − 1 smaller disks must leave before the big one moves.", function towerOfHanoi(n) { const moves = []; const move = (count, from, to, via) => { if (count === 0) return; moves.push([from, to]); move(count - 1, from, via, to); move(count - 1, via, to, from); }; move(n, 1, 3, 2); return moves; }),
        diagnosis("wrong-target", "The disks must end on peg 3, not peg 2.", function towerOfHanoi(n) { const moves = []; const move = (count, from, to, via) => { if (count === 0) return; move(count - 1, from, via, to); moves.push([from, to]); move(count - 1, via, to, from); }; move(n, 1, 2, 3); return moves; }),
      ],
      hints: ["Recursion on the number of disks.", "move(n − 1, from, via), then the big disk from → to, then move(n − 1, via, to).", "n = 1 is a single move."],
      cases: [
        example([2], [[1, 2], [1, 3], [2, 3]], "CSES sample"),
        example([1], [[1, 3]], "one disk"),
        run(towerOfHanoi, [3], "three disks"),
        run(towerOfHanoi, [16], "n = 16"),
      ],
    },
    {
      id: "creating-strings", title: "Creating Strings", cses: { id: 1622, name: "Creating Strings" },
      goal: "All distinct rearrangements of the string in alphabetical order.",
      concept: "Backtrack over letter counts instead of positions: choosing letters in alphabetical order produces sorted output with no duplicates.",
      functionName: "creatingStrings", signature: "creatingStrings(s) → array of strings",
      starterSource: starter("creatingStrings", "s"),
      solve: creatingStrings, comparator: "deep",
      reference: book("5.2", "Generating permutations"),
      presets: { "CSES sample": { a: "aabac" }, "all distinct": { a: "abc" }, "one letter": { a: "aaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("duplicates", "Swapping equal letters gives the same string; count letters instead of permuting positions.", function creatingStrings(s) { const out = []; const used = new Array(s.length).fill(false); const current = []; const build = () => { if (current.length === s.length) { out.push(current.join("")); return; } for (let i = 0; i < s.length; i += 1) { if (used[i]) continue; used[i] = true; current.push(s[i]); build(); current.pop(); used[i] = false; } }; build(); return out.sort(); }),
        diagnosis("unsorted", "Iterate the letters in alphabetical order so the output comes out sorted.", function creatingStrings(s) { const letters = s.split(""); const seen = new Set(); const out = []; const used = new Array(letters.length).fill(false); const current = []; const build = () => { if (current.length === letters.length) { const text = current.join(""); if (!seen.has(text)) { seen.add(text); out.push(text); } return; } for (let i = 0; i < letters.length; i += 1) { if (used[i]) continue; used[i] = true; current.push(letters[i]); build(); current.pop(); used[i] = false; } }; build(); return out; }),
      ],
      hints: ["Count each letter.", "At each position try letters a…z that still have count left.", "Decrement, recurse, restore."],
      cases: [
        example(["aabac"], ["aaabc", "aaacb", "aabac", "aabca", "aacab", "aacba", "abaac", "abaca", "abcaa", "acaab", "acaba", "acbaa", "baaac", "baaca", "bacaa", "bcaaa", "caaab", "caaba", "cabaa", "cbaaa"], "CSES sample"),
        example(["abc"], ["abc", "acb", "bac", "bca", "cab", "cba"], "all distinct"),
        example(["aaa"], ["aaa"], "one letter"),
        run(creatingStrings, ["abcdefgh"], "eight distinct letters"),
      ],
    },
    {
      id: "apple-division", title: "Apple Division", cses: { id: 1623, name: "Apple Division" },
      goal: "Split the apples into two groups with the smallest possible weight difference.",
      concept: "With n ≤ 20 you can try every subset: 2²⁰ masks, each summing one group. Greedy by weight is wrong.",
      functionName: "appleDivision", signature: "appleDivision(weights) → number",
      starterSource: starter("appleDivision", "weights", "For every bitmask, sum the chosen apples; track the smallest |total − 2·sum|."),
      solve: appleDivision, comparator: "scalar",
      reference: book("5.1", "Generating subsets"),
      presets: { "CSES sample": { a: [3, 2, 7, 4, 1] }, "greedy fails": { a: [3, 3, 2, 2, 2] }, "one apple": { a: [9] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("greedy", "Putting each apple, heaviest first, into the lighter group is not optimal: 3 3 2 2 2 can be split evenly.", function appleDivision(weights) { const sorted = weights.slice().sort((p, q) => q - p); let a = 0, b = 0; for (let i = 0; i < sorted.length; i += 1) { if (a <= b) a += sorted[i]; else b += sorted[i]; } return Math.abs(a - b); }),
        diagnosis("parity-only", "Whether the total is odd only bounds the answer below.", function appleDivision(weights) { let total = 0; for (let i = 0; i < weights.length; i += 1) total += weights[i]; return total % 2; }),
      ],
      hints: ["total = sum of all weights.", "For mask from 0 to 2ⁿ − 1, sum the apples whose bit is set.", "The difference is |total − 2·sum|; keep the minimum."],
      cases: [
        example([[3, 2, 7, 4, 1]], 1, "CSES sample"),
        example([[3, 3, 2, 2, 2]], 0, "greedy fails"),
        example([[9]], 9, "one apple"),
        hidden("n = 20, time limit", () => [randomInts(103, 20, 1, 1000000000)]),
      ],
    },
    {
      id: "chessboard-and-queens", title: "Chessboard and Queens", cses: { id: 1624, name: "Chessboard and Queens" },
      goal: "Count the ways to place eight queens on a board with some reserved squares.",
      concept: "Backtracking: place one queen per row, track used columns and both diagonals, undo on the way back.",
      functionName: "chessboardAndQueens", signature: "chessboardAndQueens(board) → number",
      starterSource: starter("chessboardAndQueens", "board", "board is eight strings; '*' is reserved. Diagonals: row + col and row − col + 7."),
      solve: chessboardAndQueens, comparator: "scalar",
      reference: book("5.3", "Backtracking · queen problem"),
      presets: { "CSES sample": { a: SAMPLE_BOARD }, empty: { a: EMPTY_BOARD }, "blocked corners": { a: ["*......*", "........", "........", "........", "........", "........", "........", "*......*"] }, "blocked row": { a: ["........", "........", "........", "****....", "........", "........", "........", "........"] } },
      scene: { kind: "algo", view: "board", handles: preset(), args: [{ fixture: "presetA" }] },
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
    {
      id: "raab-game-i", title: "Raab Game I", cses: { id: 3399, name: "Raab Game I" },
      goal: "Two players each hold cards 1..n; a is the number of rounds the first wins, b the second. Return a possible pair of orders, or possible: false. This lab uses the cyclic-shift construction on the first a + b cards.",
      concept: "Card differences over all rounds sum to zero, so one player cannot win rounds while the other wins none. Otherwise shift the first a + b cards: the second player plays a + 1 … a + b then 1 … a, and the rest are ties.",
      functionName: "raabGameI", signature: "raabGameI(n, a, b) → { possible, first, second }",
      starterSource: starter("raabGameI", "n, a, b", "Impossible if a + b > n or exactly one of a, b is zero. first = 1..n; second = a+1..a+b, 1..a, then a+b+1..n."),
      solve: raabGameI, comparator: "deep", check: raabCheck, small: (round) => { const next = rng(900 + round); const n = 1 + Math.floor(next() * 9); return [n, Math.floor(next() * (n + 1)), Math.floor(next() * (n + 1))]; },
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "n (rounded)", value: 4, min: 1, max: 10 },
        { id: "a", type: "slider", label: "a wins (rounded)", value: 1, min: 0, max: 10 },
        { id: "b", type: "slider", label: "b wins (rounded)", value: 2, min: 0, max: 10 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("allows-one-sided", "If only one player wins rounds the card differences cannot sum to zero; that case is impossible.", function raabGameI(n, a, b) { if (a + b > n) return { possible: false, first: [], second: [] }; const m = a + b; const first = [], second = []; for (let i = 1; i <= m; i += 1) first.push(i); for (let i = a + 1; i <= m; i += 1) second.push(i); for (let i = 1; i <= a; i += 1) second.push(i); for (let i = m + 1; i <= n; i += 1) { first.push(i); second.push(i); } return { possible: true, first, second }; }),
        diagnosis("shift-swapped", "Shifting by b instead of a swaps who wins how many rounds.", function raabGameI(n, a, b) { if (a + b > n || (a > 0) !== (b > 0)) return { possible: false, first: [], second: [] }; const m = a + b; const first = [], second = []; for (let i = 1; i <= m; i += 1) first.push(i); for (let i = b + 1; i <= m; i += 1) second.push(i); for (let i = 1; i <= b; i += 1) second.push(i); for (let i = m + 1; i <= n; i += 1) { first.push(i); second.push(i); } return { possible: true, first, second }; }),
      ],
      hints: ["Check a + b ≤ n and that a and b are both zero or both positive.", "First player: 1, 2, …, n in order.", "Second player: a+1 … a+b, then 1 … a, then the remaining cards as ties."],
      cases: [
        example([4, 1, 2], { possible: true, first: [1, 2, 3, 4], second: [2, 3, 1, 4] }, "CSES sample (canonical construction)"),
        example([2, 0, 1], { possible: false, first: [], second: [] }, "CSES sample"),
        example([3, 0, 0], { possible: true, first: [1, 2, 3], second: [1, 2, 3] }, "CSES sample"),
        example([2, 1, 1], { possible: true, first: [1, 2], second: [2, 1] }, "CSES sample"),
        example([4, 4, 1], { possible: false, first: [], second: [] }, "CSES sample"),
      ],
    },
    {
      id: "mex-grid-construction", title: "Mex Grid Construction", cses: { id: 3419, name: "Mex Grid Construction" },
      goal: "The n × n grid where each cell holds the smallest non-negative integer absent from its row to the left and its column above.",
      concept: "Simulating the rule is fine for n ≤ 100, but the pattern is exactly i xor j: the nim-sum table.",
      functionName: "mexGridConstruction", signature: "mexGridConstruction(n) → n arrays of n numbers",
      starterSource: starter("mexGridConstruction", "n"),
      solve: mexGridConstruction, comparator: "deep", brute: mexBrute, small: (round) => [1 + (round % 12)],
      reference: book("25", "Game theory · nim sum"),
      scene: { kind: "algo", view: "number-grid", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 8 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("sum", "i + j repeats values along anti-diagonals; the mex rule gives i xor j.", function mexGridConstruction(n) { const rows = []; for (let i = 0; i < n; i += 1) { const row = []; for (let j = 0; j < n; j += 1) row.push(i + j); rows.push(row); } return rows; }),
        diagnosis("or", "i | j is not the mex either; only xor matches the rule.", function mexGridConstruction(n) { const rows = []; for (let i = 0; i < n; i += 1) { const row = []; for (let j = 0; j < n; j += 1) row.push(i | j); rows.push(row); } return rows; }),
      ],
      hints: ["Simulate: for each cell collect the values to its left and above, take the smallest missing.", "Look at the result: it is i xor j.", "Either implementation is fine at n ≤ 100."],
      cases: [
        example([5], [[0, 1, 2, 3, 4], [1, 0, 3, 2, 5], [2, 3, 0, 1, 6], [3, 2, 1, 0, 7], [4, 5, 6, 7, 0]], "CSES sample"),
        example([1], [[0]], "one cell"),
        example([2], [[0, 1], [1, 0]], "two"),
        run(mexGridConstruction, [100], "n = 100"),
      ],
    },
    {
      id: "knight-moves-grid", title: "Knight Moves Grid", cses: { id: 3217, name: "Knight Moves Grid" },
      goal: "For every square of an n × n board, the minimum number of knight moves to the top-left corner.",
      concept: "Breadth-first search from the corner over the eight knight jumps gives every distance in one pass.",
      functionName: "knightMovesGrid", signature: "knightMovesGrid(n) → n arrays of n distances",
      starterSource: starter("knightMovesGrid", "n"),
      solve: knightMovesGrid, comparator: "deep",
      reference: book("12.2", "Breadth-first search"),
      scene: { kind: "algo", view: "number-grid", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 8, min: 4, max: 8 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("king-moves", "A knight jumps in an L; the eight king steps give the wrong distances.", function knightMovesGrid(n) { const distance = new Int32Array(n * n).fill(-1); const queue = [0]; distance[0] = 0; let head = 0; while (head < queue.length) { const cell = queue[head]; head += 1; const r = Math.floor(cell / n), c = cell % n; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { if (dr === 0 && dc === 0) continue; const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue; const id = nr * n + nc; if (distance[id] !== -1) continue; distance[id] = distance[cell] + 1; queue.push(id); } } const rows = []; for (let r = 0; r < n; r += 1) rows.push(Array.from(distance.slice(r * n, r * n + n))); return rows; }),
        diagnosis("half-the-jumps", "All eight jumps are needed, including the ones that go up or left.", function knightMovesGrid(n) { const distance = new Int32Array(n * n).fill(-1); const queue = [0]; distance[0] = 0; let head = 0; const jumps = [[1, 2], [2, 1], [-1, 2], [2, -1]]; while (head < queue.length) { const cell = queue[head]; head += 1; const r = Math.floor(cell / n), c = cell % n; for (let k = 0; k < jumps.length; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue; const id = nr * n + nc; if (distance[id] !== -1) continue; distance[id] = distance[cell] + 1; queue.push(id); } } const rows = []; for (let r = 0; r < n; r += 1) rows.push(Array.from(distance.slice(r * n, r * n + n))); return rows; }),
      ],
      hints: ["Queue starting at (0, 0) with distance 0.", "Eight jumps: (±1, ±2) and (±2, ±1).", "Fill unvisited squares with distance + 1; return the grid."],
      cases: [
        example([8], [[0, 3, 2, 3, 2, 3, 4, 5], [3, 4, 1, 2, 3, 4, 3, 4], [2, 1, 4, 3, 2, 3, 4, 5], [3, 2, 3, 2, 3, 4, 3, 4], [2, 3, 2, 3, 4, 3, 4, 5], [3, 4, 3, 4, 3, 4, 5, 4], [4, 3, 4, 3, 4, 5, 4, 5], [5, 4, 5, 4, 5, 4, 5, 6]], "CSES sample"),
        example([4], [[0, 3, 2, 5], [3, 4, 1, 2], [2, 1, 4, 3], [5, 2, 3, 2]], "four"),
        run(knightMovesGrid, [5], "five"),
        hidden("n = 600, time limit", () => [600]),
      ],
    },
    {
      id: "grid-coloring-i", title: "Grid Coloring I", cses: { id: 3311, name: "Grid Coloring I" },
      goal: "Change every cell of an A–D grid to a different letter so that no two adjacent cells match. This lab picks, row by row, the smallest letter that differs from the old one, the cell above, and the cell to the left.",
      concept: "Four letters against at most three constraints per cell: a greedy scan can never get stuck, so a solution always exists.",
      functionName: "gridColoringI", signature: "gridColoringI(grid) → array of strings",
      starterSource: starter("gridColoringI", "grid"),
      solve: gridColoringI, comparator: "deep", check: coloringCheck, small: (round) => { const next = rng(1000 + round); const rows = 1 + Math.floor(next() * 4), cols = 1 + Math.floor(next() * 5); const grid = []; for (let r = 0; r < rows; r += 1) { let row = ""; for (let c = 0; c < cols; c += 1) row += "ABCD"[Math.floor(next() * 4)]; grid.push(row); } return [grid]; },
      reference: book("6", "Greedy algorithms"),
      presets: { "CSES sample": { a: ["AAAA", "BBBB", "CCDD"] }, "one row": { a: ["ABCD"] }, "one cell": { a: ["D"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("keeps-old-letter", "The new letter must differ from the old one too.", function gridColoringI(grid) { const rows = grid.length, cols = grid[0].length; const out = []; for (let r = 0; r < rows; r += 1) { let row = ""; for (let c = 0; c < cols; c += 1) { const banned = new Set(); if (r > 0) banned.add(out[r - 1][c]); if (c > 0) banned.add(row[c - 1]); let letter = "A"; while (banned.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1); row += letter; } out.push(row); } return out; }),
        diagnosis("ignores-left", "The cell to the left is adjacent as well.", function gridColoringI(grid) { const rows = grid.length, cols = grid[0].length; const out = []; for (let r = 0; r < rows; r += 1) { let row = ""; for (let c = 0; c < cols; c += 1) { const banned = new Set([grid[r][c]]); if (r > 0) banned.add(out[r - 1][c]); let letter = "A"; while (banned.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1); row += letter; } out.push(row); } return out; }),
      ],
      hints: ["Scan row-major.", "Forbid the old letter, the letter above, and the letter to the left.", "Take the smallest remaining letter; one always remains."],
      cases: [
        example([["AAAA", "BBBB", "CCDD"]], ["BCBC", "ADAD", "BABA"], "CSES sample (canonical greedy)"),
        example([["ABCD"]], ["BABA"], "one row"),
        example([["D"]], ["A"], "one cell"),
        hidden("500 × 500, time limit", () => { const next = rng(104); const grid = []; for (let r = 0; r < 500; r += 1) { let row = ""; for (let c = 0; c < 500; c += 1) row += "ABCD"[Math.floor(next() * 4)]; grid.push(row); } return [grid]; }),
      ],
    },
    {
      id: "digit-queries", title: "Digit Queries", cses: { id: 2431, name: "Digit Queries" },
      goal: "The k-th digit (1-based) of the infinite string 123456789101112…, with k given as a decimal string up to 10¹⁸.",
      concept: "Skip whole blocks: the L-digit numbers contribute 9·10^(L−1)·L characters. Then index into the right number. BigInt keeps k exact.",
      functionName: "digitQueries", signature: "digitQueries(k) → digit",
      starterSource: starter("digitQueries", "k", "k is a string; BigInt(k). Subtract block sizes until k fits, then number = start + (k−1)/L and digit index (k−1) % L."),
      solve: digitQueries, comparator: "scalar", brute: digitBrute, small: (round) => [String(1 + (round * 37) % 1500)],
      reference: book("1.4", "Working with numbers · big integers"),
      scene: { kind: "algo", view: "number", handles: [{ id: "k", type: "slider", label: "k (rounded)", value: 19, min: 1, max: 60 }], args: [{ fixture: "roundedKString" }] },
      diagnoses: [
        diagnosis("block-off-by-one", "The last character of a block belongs to that block: subtract while k is strictly larger than the block size.", function digitQueries(k) { let remaining = BigInt(k); let length = 1n, count = 9n, start = 1n; while (remaining >= length * count) { remaining -= length * count; length += 1n; count *= 10n; start *= 10n; } const number = start + (remaining - 1n) / length; const index = Number((remaining - 1n) % length); return Number(number.toString()[index]); }),
        diagnosis("no-bigint", "k reaches 10¹⁸, so Number arithmetic loses the low digits.", function digitQueries(k) { let remaining = Number(k); let length = 1, count = 9, start = 1; while (remaining > length * count) { remaining -= length * count; length += 1; count *= 10; start *= 10; } const number = start + Math.floor((remaining - 1) / length); const index = (remaining - 1) % length; return Number(String(number)[index]); }),
      ],
      hints: ["Block L has 9·10^(L−1) numbers of L digits each.", "Subtract block sizes while k is larger than the block.", "number = 10^(L−1) + (k − 1) / L; the digit is at (k − 1) % L."],
      cases: [
        example(["7"], 7, "CSES sample"),
        example(["19"], 4, "CSES sample"),
        example(["12"], 1, "CSES sample"),
        example(["9"], 9, "last one-digit character"),
        example(["999999999999999999"], 5, "needs BigInt"),
        hidden("k = 10¹⁸", () => ["1000000000000000000"]),
      ],
    },
    {
      id: "string-reorder", title: "String Reorder", cses: { id: 1743, name: "String Reorder" },
      goal: "The lexicographically smallest rearrangement with no two equal neighbours, or null when none exists.",
      concept: "Greedy letter by letter, but only commit to a letter if the rest can still be arranged: the most frequent remaining letter must fit in the remaining gaps.",
      functionName: "stringReorder", signature: "stringReorder(s) → string or null",
      starterSource: starter("stringReorder", "s", "At each position try A…Z (not the previous letter); accept if, after taking it, max other count ≤ ceil(rest/2) and its own count ≤ floor(rest/2)."),
      solve: stringReorder, comparator: "deep", brute: reorderBrute, small: (round) => [randomLetters(1100 + round, 1 + (round % 7), "AABBC")],
      reference: book("6", "Greedy algorithms"),
      presets: { "CSES sample": { a: "HATTIVATTI" }, "needs lookahead": { a: "ACCB" }, impossible: { a: "AAAB" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-lookahead", "Taking the smallest letter blindly can paint you into a corner: ACCB must become ACBC, not ABCC.", function stringReorder(s) { const counts = new Array(26).fill(0); for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1; const out = []; let previous = -1; for (let position = 0; position < s.length; position += 1) { let chosen = -1; for (let c = 0; c < 26 && chosen < 0; c += 1) { if (counts[c] > 0 && c !== previous) chosen = c; } if (chosen < 0) { for (let c = 0; c < 26 && chosen < 0; c += 1) if (counts[c] > 0) chosen = c; } counts[chosen] -= 1; out.push(String.fromCharCode(65 + chosen)); previous = chosen; } return out.join(""); }),
        diagnosis("never-impossible", "When a letter has more than half the positions no arrangement exists; return null.", function stringReorder(s) { const counts = new Array(26).fill(0); for (let i = 0; i < s.length; i += 1) counts[s.charCodeAt(i) - 65] += 1; const out = []; let previous = -1; for (let position = 0; position < s.length; position += 1) { const rest = s.length - position - 1; let chosen = -1; for (let c = 0; c < 26 && chosen < 0; c += 1) { if (counts[c] === 0 || c === previous) continue; counts[c] -= 1; let maxOther = 0; for (let d = 0; d < 26; d += 1) if (d !== c && counts[d] > maxOther) maxOther = counts[d]; if (maxOther <= Math.ceil(rest / 2) && counts[c] <= Math.floor(rest / 2)) chosen = c; else counts[c] += 1; } if (chosen < 0) { for (let c = 0; c < 26 && chosen < 0; c += 1) if (counts[c] > 0) chosen = c; counts[chosen] -= 1; } out.push(String.fromCharCode(65 + chosen)); previous = chosen; } return out.join(""); }),
      ],
      hints: ["Count the letters.", "For each position try letters in order, skipping the previous letter.", "Accept a letter only if the remaining multiset can still be arranged with that letter not first."],
      cases: [
        example(["HATTIVATTI"], "AHATITITVT", "CSES sample"),
        example(["ACCB"], "ACBC", "needs lookahead"),
        example(["AAAB"], null, "impossible"),
        example(["A"], "A", "single letter"),
        hidden("n = 200 000, time limit", () => [randomLetters(105, BIG, "ABCDEFGH")]),
      ],
    },
    {
      id: "grid-path-description", title: "Grid Path Description", cses: { id: 1625, name: "Grid Path Description" },
      goal: "Count the paths through a 7 × 7 grid from the top-left to the bottom-left corner that visit every square and match a 48-character description of U, D, L, R and ? wildcards.",
      concept: "Backtracking with pruning: stop when the corner is reached early, and stop when the path would cut the free area in two (blocked ahead with both sides open).",
      functionName: "gridPathDescription", signature: "gridPathDescription(description) → number",
      starterSource: starter("gridPathDescription", "description", "Search from (0, 0) with a visited grid; a '?' tries U, D, L, R; prune dead ends."),
      solve: gridPathDescription, comparator: "scalar",
      reference: book("5.4", "Pruning the search"),
      presets: { "CSES sample": { a: "??????R??????U??????????????????????????LD????D?" }, "mostly fixed": { a: "DDDDDDRUUUUUURDDDDDDRUUUUUURDDDDDDRUUUUUURDDDDDD" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("counts-early-arrivals", "Reaching the corner before all 48 moves is a dead end, not a path.", function gridPathDescription(description) { const N = 7; const visited = new Uint8Array(N * N); let count = 0; const step = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] }; const order = ["U", "D", "L", "R"]; const free = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !visited[r * N + c]; const search = (r, c, index) => { if (r === N - 1 && c === 0) { count += 1; return; } if (index === 48) return; const up = free(r - 1, c), down = free(r + 1, c), left = free(r, c - 1), right = free(r, c + 1); if (!up && !down && left && right) return; if (!left && !right && up && down) return; const choices = description[index] === "?" ? order : [description[index]]; for (let k = 0; k < choices.length; k += 1) { const nr = r + step[choices[k]][0], nc = c + step[choices[k]][1]; if (!free(nr, nc)) continue; visited[nr * N + nc] = 1; search(nr, nc, index + 1); visited[nr * N + nc] = 0; } }; visited[0] = 1; search(0, 0, 0); return count; }),
        diagnosis("wrong-corner", "The path must end at the bottom-left corner, row 6 column 0.", function gridPathDescription(description) { const N = 7; const visited = new Uint8Array(N * N); let count = 0; const step = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] }; const order = ["U", "D", "L", "R"]; const free = (r, c) => r >= 0 && c >= 0 && r < N && c < N && !visited[r * N + c]; const search = (r, c, index) => { if (r === N - 1 && c === N - 1) { if (index === 48) count += 1; return; } if (index === 48) return; const up = free(r - 1, c), down = free(r + 1, c), left = free(r, c - 1), right = free(r, c + 1); if (!up && !down && left && right) return; if (!left && !right && up && down) return; const choices = description[index] === "?" ? order : [description[index]]; for (let k = 0; k < choices.length; k += 1) { const nr = r + step[choices[k]][0], nc = c + step[choices[k]][1]; if (!free(nr, nc)) continue; visited[nr * N + nc] = 1; search(nr, nc, index + 1); visited[nr * N + nc] = 0; } }; visited[0] = 1; search(0, 0, 0); return count; }),
      ],
      hints: ["Recursive search over the 48 moves with a visited array.", "Return immediately when the corner is reached; count only if all 48 moves were made.", "Prune when the cell ahead is blocked but both sides are free: the free area would split."],
      cases: [
        example(["??????R??????U??????????????????????????LD????D?"], 201, "CSES sample"),
        example(["DDDDDDRUUUUUURDDDDDDRUUUUUURDDDDDDRUUUUUURDDDDDD"], 0, "wrong end"),
        run(gridPathDescription, ["DDDDDDRUUUUUURDDDDDDRUUUUUURDDDDDDRUUUUUU??????"], "one open tail"),
        example(["DDDRURRD????????????????????????????????????????"], 18, "eight moves fixed"),
        example(["DDDRURRDLDRRUUUL????????????????????????????????"], 1, "sixteen moves fixed"),
      ],
    },
  ];

  core.define("intro", INTRO);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

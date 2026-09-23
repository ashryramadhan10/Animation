(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { heapPush, heapPop } = core.shared;

  // ------------------------------------------------------------------ 12 · construction problems · references
  function inverseInversions(n, k) {
    const out = [];
    let top = n, left = k;
    while (top > 1 && left >= top - 1) {
      out.push(top);
      left -= top - 1;
      top -= 1;
    }
    if (top >= 1) {
      out.push(left + 1);
      for (let value = 1; value <= top; value += 1) if (value !== left + 1) out.push(value);
    }
    return out;
  }
  function monotoneSubsequences(tests) {
    return tests.map((test) => {
      const n = test[0], k = test[1];
      if (k * k < n) return null;
      const out = [];
      for (let start = 1; start <= n; start += k) {
        const end = Math.min(n, start + k - 1);
        for (let value = end; value >= start; value -= 1) out.push(value);
      }
      return out;
    });
  }
  function thirdPermutation(a, b) {
    const n = a.length;
    if (n <= 2) return null;
    if (n === 3) return a.map((value, i) => 6 - value - b[i]);
    let seed = 88172645;
    const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    const c = a.slice();
    for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); const swap = c[i]; c[i] = c[j]; c[j] = swap; }
    const clashes = (i, value) => value === a[i] || value === b[i];
    for (let i = 0; i < n; i += 1) {
      while (clashes(i, c[i])) {
        const j = Math.floor(random() * n);
        if (j !== i && !clashes(i, c[j]) && !clashes(j, c[i])) { const swap = c[i]; c[i] = c[j]; c[j] = swap; }
      }
    }
    return c;
  }
  function permutationPrimeSums(n) {
    const limit = 2 * n + 2;
    const composite = new Uint8Array(limit + 1);
    for (let p = 2; p * p <= limit; p += 1) if (!composite[p]) for (let q = p * p; q <= limit; q += p) composite[q] = 1;
    const partner = new Array(n + 1);
    let top = n;
    while (top >= 1) {
      let prime = top + 1;
      while (composite[prime]) prime += 1;
      for (let i = prime - top; i <= top; i += 1) partner[i] = prime - i;
      top = prime - top - 1;
    }
    const first = [];
    for (let i = 1; i <= n; i += 1) first.push(i);
    return [first, partner.slice(1)];
  }
  function chessTournament(wanted) {
    const heap = [];
    for (let i = 0; i < wanted.length; i += 1) if (wanted[i] > 0) heapPush(heap, [-wanted[i], i + 1]);
    const games = [];
    while (heap.length > 0) {
      const top = heapPop(heap).item;
      const need = -top[0];
      const taken = [];
      for (let k = 0; k < need; k += 1) {
        if (heap.length === 0) return null;
        taken.push(heapPop(heap).item);
      }
      for (let k = 0; k < taken.length; k += 1) {
        games.push([top[1], taken[k][1]]);
        const rest = -taken[k][0] - 1;
        if (rest > 0) heapPush(heap, [-rest, taken[k][1]]);
      }
    }
    return games;
  }
  function distinctSumsGrid(n) {
    if (n <= 3) return null;
    if (n === 4) return [[2, 4, 4, 3], [1, 4, 1, 2], [1, 2, 3, 1], [2, 4, 3, 3]];
    const grid = [];
    for (let i = 0; i < n; i += 1) {
      const row = new Array(n).fill(i + 1);
      row[i] = n - i;
      grid.push(row);
    }
    let cell = null;
    if (n === 7) cell = [3, 0];
    else if (n === 9) cell = [5, 4];
    else if (n % 2 === 1) cell = [3, (n - 1) / 2];
    else if (n % 4 === 0) cell = [n / 2, (3 * n) / 4 - 1];
    if (cell) {
      const swap = grid[0][0];
      grid[0][0] = grid[cell[0]][cell[1]];
      grid[cell[0]][cell[1]] = swap;
    }
    return grid;
  }
  function trominoTileable(n, m) {
    if ((n * m) % 3 !== 0) return false;
    if (n === 1 || m === 1) return false;
    if ((n === 3 && m % 2 === 1) || (m === 3 && n % 2 === 1)) return false;
    return true;
  }
  function fillingTrominos(tests) {
    const FIVE_BY_NINE = [[0, 0, 1, 1, 2, 2, 3, 3, 4], [0, 5, 1, 6, 2, 7, 3, 4, 4], [5, 5, 8, 6, 6, 7, 7, 9, 9], [10, 8, 8, 11, 12, 12, 13, 9, 14], [10, 10, 11, 11, 12, 13, 13, 14, 14]];
    const layout = (n, m) => {
      if (n % 3 !== 0) {
        const turned = layout(m, n);
        const back = [];
        for (let r = 0; r < n; r += 1) { const row = []; for (let c = 0; c < m; c += 1) row.push(turned[c][r]); back.push(row); }
        return back;
      }
      const grid = [];
      for (let r = 0; r < n; r += 1) grid.push(new Array(m).fill(-1));
      let next = 0;
      const put = (cells) => { cells.forEach((cell) => { grid[cell[0]][cell[1]] = next; }); next += 1; };
      const wide = (r, c) => { put([[r, c], [r, c + 1], [r + 1, c]]); put([[r, c + 2], [r + 1, c + 1], [r + 1, c + 2]]); };
      const tall = (r, c) => { put([[r, c], [r, c + 1], [r + 1, c]]); put([[r + 1, c + 1], [r + 2, c], [r + 2, c + 1]]); };
      const evenRows = (top, bottom) => {
        let from = 0;
        if (m % 2 === 1) { for (let r = top; r < bottom; r += 2) wide(r, 0); from = 3; }
        for (let r = top; r < bottom; r += 3) for (let c = from; c < m; c += 2) tall(r, c);
      };
      if (m % 2 === 0) {
        for (let r = 0; r < n; r += 3) for (let c = 0; c < m; c += 2) tall(r, c);
      } else if (n % 2 === 0) {
        evenRows(0, n);
      } else {
        const base = next;
        for (let r = 0; r < 9; r += 1) for (let c = 0; c < 5; c += 1) grid[r][c] = base + FIVE_BY_NINE[c][r];
        next = base + 15;
        for (let r = 0; r < 9; r += 3) for (let c = 5; c < m; c += 2) tall(r, c);
        evenRows(9, n);
      }
      return grid;
    };
    return tests.map((test) => {
      const n = test[0], m = test[1];
      if (!trominoTileable(n, m)) return null;
      const grid = layout(n, m);
      const neighbours = new Map();
      const link = (x, y) => {
        if (x === y) return;
        if (!neighbours.has(x)) neighbours.set(x, new Set());
        if (!neighbours.has(y)) neighbours.set(y, new Set());
        neighbours.get(x).add(y);
        neighbours.get(y).add(x);
      };
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < m; c += 1) {
          if (r + 1 < n) link(grid[r][c], grid[r + 1][c]);
          if (c + 1 < m) link(grid[r][c], grid[r][c + 1]);
        }
      }
      const letter = new Map();
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < m; c += 1) {
          const piece = grid[r][c];
          if (letter.has(piece)) continue;
          const used = new Set();
          (neighbours.get(piece) || new Set()).forEach((other) => { if (letter.has(other)) used.add(letter.get(other)); });
          let pick = 0;
          while (used.has(pick)) pick += 1;
          letter.set(piece, pick);
        }
      }
      return grid.map((row) => row.map((piece) => String.fromCharCode(65 + letter.get(piece))).join(""));
    });
  }
  function gridPathFeasible(n, m, y1, x1, y2, x2) {
    if (y1 === y2 && x1 === x2) return n * m === 1;
    const r1 = y1 - 1, c1 = x1 - 1, r2 = y2 - 1, c2 = x2 - 1;
    const colour1 = (r1 + c1) % 2, colour2 = (r2 + c2) % 2;
    if ((n * m) % 2 === 0) { if (colour1 === colour2) return false; }
    else if (colour1 !== 0 || colour2 !== 0) return false;
    if (n === 1) return (c1 === 0 && c2 === m - 1) || (c2 === 0 && c1 === m - 1);
    if (m === 1) return (r1 === 0 && r2 === n - 1) || (r2 === 0 && r1 === n - 1);
    if (n === 2 && c1 === c2 && c1 > 0 && c1 < m - 1) return false;
    if (m === 2 && r1 === r2 && r1 > 0 && r1 < n - 1) return false;
    const narrow = (ra, ca, rb, cb) => {
      const minorityFirst = (ra + ca) % 2 === 1;
      const minorityRow = minorityFirst ? ra : rb, minorityColumn = minorityFirst ? ca : cb, otherColumn = minorityFirst ? cb : ca;
      return minorityColumn < otherColumn - 1 || (minorityRow === 1 && minorityColumn < otherColumn);
    };
    if (n === 3 && m % 2 === 0) return !narrow(r1, c1, r2, c2);
    if (m === 3 && n % 2 === 0) return !narrow(c1, r1, c2, r2);
    return true;
  }
  function gridPathConstruction(tests) {
    const fits = (box, s, t) => gridPathFeasible(box.h, box.w, s[0] - box.r + 1, s[1] - box.c + 1, t[0] - box.r + 1, t[1] - box.c + 1);
    const inside = (box, p) => p[0] >= box.r && p[0] < box.r + box.h && p[1] >= box.c && p[1] < box.c + box.w;
    const brute = (box, s, t) => {
      const total = box.h * box.w;
      const seen = new Uint8Array(total);
      const index = (p) => (p[0] - box.r) * box.w + (p[1] - box.c);
      const path = [s];
      seen[index(s)] = 1;
      const walk = () => {
        const at = path[path.length - 1];
        if (path.length === total) return at[0] === t[0] && at[1] === t[1];
        if (at[0] === t[0] && at[1] === t[1]) return false;
        const moves = [[at[0] - 1, at[1]], [at[0] + 1, at[1]], [at[0], at[1] - 1], [at[0], at[1] + 1]];
        for (let k = 0; k < 4; k += 1) {
          const next = moves[k];
          if (!inside(box, next) || seen[index(next)]) continue;
          seen[index(next)] = 1;
          path.push(next);
          if (walk()) return true;
          path.pop();
          seen[index(next)] = 0;
        }
        return false;
      };
      return walk() ? path : null;
    };
    const snake = (strip, from, to, vertical) => {
      const out = [];
      if (!vertical) {
        const inner = from[0], outer = inner === strip.r ? strip.r + 1 : strip.r;
        const first = strip.c, last = strip.c + strip.w - 1;
        if (to[1] > from[1]) {
          for (let c = from[1]; c >= first; c -= 1) out.push([inner, c]);
          for (let c = first; c <= last; c += 1) out.push([outer, c]);
          for (let c = last; c >= to[1]; c -= 1) out.push([inner, c]);
        } else {
          for (let c = from[1]; c <= last; c += 1) out.push([inner, c]);
          for (let c = last; c >= first; c -= 1) out.push([outer, c]);
          for (let c = first; c <= to[1]; c += 1) out.push([inner, c]);
        }
      } else {
        const inner = from[1], outer = inner === strip.c ? strip.c + 1 : strip.c;
        const first = strip.r, last = strip.r + strip.h - 1;
        if (to[0] > from[0]) {
          for (let r = from[0]; r >= first; r -= 1) out.push([r, inner]);
          for (let r = first; r <= last; r += 1) out.push([r, outer]);
          for (let r = last; r >= to[0]; r -= 1) out.push([r, inner]);
        } else {
          for (let r = from[0]; r <= last; r += 1) out.push([r, inner]);
          for (let r = last; r >= first; r -= 1) out.push([r, outer]);
          for (let r = first; r <= to[0]; r += 1) out.push([r, inner]);
        }
      }
      return out;
    };
    const solve = (box, s, t) => {
      if (!fits(box, s, t)) return null;
      if (box.h * box.w <= 12) return brute(box, s, t);
      const peels = [
        { strip: { r: box.r, c: box.c, h: 2, w: box.w }, rest: { r: box.r + 2, c: box.c, h: box.h - 2, w: box.w }, edge: box.r + 2, inner: box.r + 1, vertical: false },
        { strip: { r: box.r + box.h - 2, c: box.c, h: 2, w: box.w }, rest: { r: box.r, c: box.c, h: box.h - 2, w: box.w }, edge: box.r + box.h - 3, inner: box.r + box.h - 2, vertical: false },
        { strip: { r: box.r, c: box.c, h: box.h, w: 2 }, rest: { r: box.r, c: box.c + 2, h: box.h, w: box.w - 2 }, edge: box.c + 2, inner: box.c + 1, vertical: true },
        { strip: { r: box.r, c: box.c + box.w - 2, h: box.h, w: 2 }, rest: { r: box.r, c: box.c, h: box.h, w: box.w - 2 }, edge: box.c + box.w - 3, inner: box.c + box.w - 2, vertical: true },
      ];
      for (let k = 0; k < peels.length; k += 1) {
        const peel = peels[k];
        if (peel.rest.h < 1 || peel.rest.w < 1) continue;
        if (inside(peel.strip, s) || inside(peel.strip, t)) continue;
        if (!fits(peel.rest, s, t)) continue;
        const path = solve(peel.rest, s, t);
        if (!path) continue;
        for (let i = 0; i + 1 < path.length; i += 1) {
          const u = path[i], v = path[i + 1];
          const along = peel.vertical ? (u[1] === peel.edge && v[1] === peel.edge) : (u[0] === peel.edge && v[0] === peel.edge);
          if (!along) continue;
          const from = peel.vertical ? [u[0], peel.inner] : [peel.inner, u[1]];
          const to = peel.vertical ? [v[0], peel.inner] : [peel.inner, v[1]];
          return path.slice(0, i + 1).concat(snake(peel.strip, from, to, peel.vertical), path.slice(i + 1));
        }
      }
      const cuts = [];
      for (let k = 1; k < box.h; k += 1) cuts.push({ a: { r: box.r, c: box.c, h: k, w: box.w }, b: { r: box.r + k, c: box.c, h: box.h - k, w: box.w }, vertical: false });
      for (let k = 1; k < box.w; k += 1) cuts.push({ a: { r: box.r, c: box.c, h: box.h, w: k }, b: { r: box.r, c: box.c + k, h: box.h, w: box.w - k }, vertical: true });
      for (let k = 0; k < cuts.length; k += 1) {
        const cut = cuts[k];
        let first = cut.a, second = cut.b;
        if (inside(first, t) && inside(second, s)) { const swap = first; first = second; second = swap; }
        if (!(inside(first, s) && inside(second, t))) continue;
        const span = cut.vertical ? box.h : box.w;
        for (let x = 0; x < span; x += 1) {
          const near = cut.vertical ? [box.r + x, cut.a.c + cut.a.w - 1] : [cut.a.r + cut.a.h - 1, box.c + x];
          const far = cut.vertical ? [box.r + x, cut.b.c] : [cut.b.r, box.c + x];
          const p = inside(first, near) ? near : far, q = inside(first, near) ? far : near;
          if (!fits(first, s, p) || !fits(second, q, t)) continue;
          const head = solve(first, s, p);
          if (!head) continue;
          const tail = solve(second, q, t);
          if (!tail) continue;
          return head.concat(tail);
        }
      }
      return box.h * box.w <= 24 ? brute(box, s, t) : null;
    };
    return tests.map((test) => {
      const n = test[0], m = test[1];
      const path = solve({ r: 0, c: 0, h: n, w: m }, [test[2] - 1, test[3] - 1], [test[4] - 1, test[5] - 1]);
      if (!path) return null;
      let moves = "";
      for (let i = 1; i < path.length; i += 1) {
        const dr = path[i][0] - path[i - 1][0], dc = path[i][1] - path[i - 1][1];
        moves += dr === -1 ? "U" : dr === 1 ? "D" : dc === -1 ? "L" : "R";
      }
      return moves;
    });
  }

  // ------------------------------------------------------------------ validators: in this section they are the specification
  // Every answer here has many correct forms, so each task is judged by checking the answer's
  // properties. These run on the hidden cases as well, so each stays close to linear.
  function permutationProblem(list, n) {
    if (!Array.isArray(list) || list.length !== n) return "Return a permutation of 1.." + n + ".";
    const seen = new Uint8Array(n + 1);
    for (let i = 0; i < n; i += 1) {
      const value = list[i];
      if (!Number.isInteger(value) || value < 1 || value > n) return "Position " + (i + 1) + " holds " + JSON.stringify(value) + ", which is not in 1.." + n + ".";
      if (seen[value]) return "The value " + value + " appears twice.";
      seen[value] = 1;
    }
    return null;
  }
  function countInversions(list) {
    const n = list.length;
    const tree = new Array(n + 1).fill(0);
    let total = 0;
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let k = list[i] - 1; k > 0; k -= k & -k) total += tree[k];
      for (let k = list[i]; k <= n; k += k & -k) tree[k] += 1;
    }
    return total;
  }
  function longestRun(list, increasing) {
    const tails = [];
    for (let i = 0; i < list.length; i += 1) {
      const value = increasing ? list[i] : -list[i];
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < value) lo = mid + 1; else hi = mid; }
      tails[lo] = value;
    }
    return tails.length;
  }
  function impossibleMatches(expected, actual, what) {
    if (expected === null && actual !== null) return "No " + what + " exists for this input; return null.";
    if (expected !== null && actual === null) return "A " + what + " exists for this input; build it.";
    return null;
  }
  function inverseInversionsAccept(args, actual) {
    const n = args[0], k = args[1];
    const problem = permutationProblem(actual, n);
    if (problem) return problem;
    const found = countInversions(actual);
    return found === k ? true : "Your permutation has " + found + " inversions, not " + k + ".";
  }
  function monotoneSubsequencesAccept(args, actual, expected) {
    const tests = args[0];
    if (!Array.isArray(actual) || actual.length !== tests.length) return "Return one answer per test.";
    for (let t = 0; t < tests.length; t += 1) {
      const n = tests[t][0], k = tests[t][1];
      const mismatch = impossibleMatches(expected[t], actual[t], "permutation");
      if (mismatch) return "Test " + (t + 1) + ": " + mismatch;
      if (actual[t] === null) continue;
      const problem = permutationProblem(actual[t], n);
      if (problem) return "Test " + (t + 1) + ": " + problem;
      const longest = Math.max(longestRun(actual[t], true), longestRun(actual[t], false));
      if (longest !== k) return "Test " + (t + 1) + ": the longest monotone subsequence has " + longest + " elements, not " + k + ".";
    }
    return true;
  }
  function thirdPermutationAccept(args, actual, expected) {
    const a = args[0], b = args[1];
    const mismatch = impossibleMatches(expected, actual, "third permutation");
    if (mismatch) return mismatch;
    if (actual === null) return true;
    const problem = permutationProblem(actual, a.length);
    if (problem) return problem;
    for (let i = 0; i < a.length; i += 1) {
      if (actual[i] === a[i]) return "Position " + (i + 1) + " repeats a's value " + a[i] + ".";
      if (actual[i] === b[i]) return "Position " + (i + 1) + " repeats b's value " + b[i] + ".";
    }
    return true;
  }
  function permutationPrimeSumsAccept(args, actual) {
    const n = args[0];
    if (actual === null) return "A pair always exists; build it.";
    if (!Array.isArray(actual) || actual.length !== 2) return "Return [a, b], two permutations.";
    const first = permutationProblem(actual[0], n);
    if (first) return "a: " + first;
    const second = permutationProblem(actual[1], n);
    if (second) return "b: " + second;
    const limit = 2 * n;
    const composite = new Uint8Array(limit + 1);
    composite[0] = 1; composite[1] = 1;
    for (let p = 2; p * p <= limit; p += 1) if (!composite[p]) for (let q = p * p; q <= limit; q += p) composite[q] = 1;
    for (let i = 0; i < n; i += 1) {
      const sum = actual[0][i] + actual[1][i];
      if (composite[sum]) return "Position " + (i + 1) + ": " + actual[0][i] + " + " + actual[1][i] + " = " + sum + " is not prime.";
    }
    return true;
  }
  function chessTournamentAccept(args, actual, expected) {
    const wanted = args[0];
    const n = wanted.length;
    const mismatch = impossibleMatches(expected, actual, "schedule");
    if (mismatch) return mismatch;
    if (actual === null) return true;
    if (!Array.isArray(actual)) return "Return the games as an array of [player, player] pairs.";
    const played = new Array(n + 1).fill(0);
    const pairs = new Set();
    for (let g = 0; g < actual.length; g += 1) {
      const game = actual[g];
      if (!Array.isArray(game) || game.length !== 2) return "Game " + (g + 1) + " must be a pair of players.";
      const u = game[0], v = game[1];
      if (!Number.isInteger(u) || !Number.isInteger(v) || u < 1 || v < 1 || u > n || v > n) return "Game " + (g + 1) + " names a player outside 1.." + n + ".";
      if (u === v) return "Game " + (g + 1) + " has player " + u + " playing themselves.";
      const key = Math.min(u, v) * (n + 1) + Math.max(u, v);
      if (pairs.has(key)) return "Players " + u + " and " + v + " meet twice.";
      pairs.add(key);
      played[u] += 1;
      played[v] += 1;
    }
    for (let i = 1; i <= n; i += 1) if (played[i] !== wanted[i - 1]) return "Player " + i + " plays " + played[i] + " games but wanted " + wanted[i - 1] + ".";
    return true;
  }
  function distinctSumsGridAccept(args, actual, expected) {
    const n = args[0];
    const mismatch = impossibleMatches(expected, actual, "grid");
    if (mismatch) return mismatch;
    if (actual === null) return true;
    if (!Array.isArray(actual) || actual.length !== n) return "Return " + n + " rows.";
    const counts = new Array(n + 1).fill(0);
    const rows = new Array(n).fill(0), columns = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      if (!Array.isArray(actual[i]) || actual[i].length !== n) return "Row " + (i + 1) + " must have " + n + " entries.";
      for (let j = 0; j < n; j += 1) {
        const value = actual[i][j];
        if (!Number.isInteger(value) || value < 1 || value > n) return "Row " + (i + 1) + " holds " + JSON.stringify(value) + ", outside 1.." + n + ".";
        counts[value] += 1;
        rows[i] += value;
        columns[j] += value;
      }
    }
    for (let value = 1; value <= n; value += 1) if (counts[value] !== n) return "The value " + value + " appears " + counts[value] + " times, not " + n + ".";
    const seen = new Map();
    for (let i = 0; i < n; i += 1) { if (seen.has(rows[i])) return "Row " + (i + 1) + " and " + seen.get(rows[i]) + " both sum to " + rows[i] + "."; seen.set(rows[i], "row " + (i + 1)); }
    for (let j = 0; j < n; j += 1) { if (seen.has(columns[j])) return "Column " + (j + 1) + " and " + seen.get(columns[j]) + " both sum to " + columns[j] + "."; seen.set(columns[j], "column " + (j + 1)); }
    return true;
  }
  function trominoProblem(board, n, m) {
    if (!Array.isArray(board) || board.length !== n) return "Return " + n + " rows of letters.";
    for (let r = 0; r < n; r += 1) {
      if (typeof board[r] !== "string" || board[r].length !== m) return "Row " + (r + 1) + " must be a string of " + m + " letters.";
      if (!/^[A-Z]+$/.test(board[r])) return "Row " + (r + 1) + " may only use the letters A to Z.";
    }
    const seen = [];
    for (let r = 0; r < n; r += 1) seen.push(new Uint8Array(m));
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < m; c += 1) {
        if (seen[r][c]) continue;
        const letter = board[r][c];
        const cells = [[r, c]];
        seen[r][c] = 1;
        for (let k = 0; k < cells.length; k += 1) {
          const cr = cells[k][0], cc = cells[k][1];
          const steps = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
          for (let s = 0; s < 4; s += 1) {
            const nr = steps[s][0], nc = steps[s][1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m || seen[nr][nc] || board[nr][nc] !== letter) continue;
            seen[nr][nc] = 1;
            cells.push([nr, nc]);
          }
          if (cells.length > 3) break;
        }
        if (cells.length !== 3) return "The " + letter + " region at row " + (r + 1) + ", column " + (c + 1) + " has " + (cells.length > 3 ? "more than 3" : cells.length) + " cells; touching pieces need different letters.";
        const rs = cells.map((cell) => cell[0]), cs = cells.map((cell) => cell[1]);
        if (Math.max.apply(null, rs) - Math.min.apply(null, rs) !== 1 || Math.max.apply(null, cs) - Math.min.apply(null, cs) !== 1) return "The " + letter + " piece at row " + (r + 1) + ", column " + (c + 1) + " is a straight line, not an L.";
      }
    }
    return null;
  }
  function fillingTrominosAccept(args, actual, expected) {
    const tests = args[0];
    if (!Array.isArray(actual) || actual.length !== tests.length) return "Return one answer per test.";
    for (let t = 0; t < tests.length; t += 1) {
      const mismatch = impossibleMatches(expected[t], actual[t], "tiling");
      if (mismatch) return "Test " + (t + 1) + ": " + mismatch;
      if (actual[t] === null) continue;
      const problem = trominoProblem(actual[t], tests[t][0], tests[t][1]);
      if (problem) return "Test " + (t + 1) + ": " + problem;
    }
    return true;
  }
  function pathProblem(test, moves) {
    const n = test[0], m = test[1];
    if (typeof moves !== "string") return "Return the path as a string of U, D, L and R.";
    if (moves.length !== n * m - 1) return "The path must make " + (n * m - 1) + " moves to visit every square, not " + moves.length + ".";
    const seen = new Uint8Array(n * m);
    let r = test[2] - 1, c = test[3] - 1;
    seen[r * m + c] = 1;
    for (let i = 0; i < moves.length; i += 1) {
      const move = moves[i];
      if (move === "U") r -= 1; else if (move === "D") r += 1; else if (move === "L") c -= 1; else if (move === "R") c += 1;
      else return "Move " + (i + 1) + " is " + JSON.stringify(move) + ", not one of U, D, L, R.";
      if (r < 0 || r >= n || c < 0 || c >= m) return "Move " + (i + 1) + " leaves the grid.";
      if (seen[r * m + c]) return "Move " + (i + 1) + " returns to a square already visited.";
      seen[r * m + c] = 1;
    }
    if (r !== test[4] - 1 || c !== test[5] - 1) return "The path ends at (" + (r + 1) + ", " + (c + 1) + ") instead of (" + test[4] + ", " + test[5] + ").";
    return null;
  }
  function gridPathConstructionAccept(args, actual, expected) {
    const tests = args[0];
    if (!Array.isArray(actual) || actual.length !== tests.length) return "Return one answer per test.";
    for (let t = 0; t < tests.length; t += 1) {
      const mismatch = impossibleMatches(expected[t], actual[t], "path");
      if (mismatch) return "Test " + (t + 1) + ": " + mismatch;
      if (actual[t] === null) continue;
      const problem = pathProblem(tests[t], actual[t]);
      if (problem) return "Test " + (t + 1) + ": " + problem;
    }
    return true;
  }

  // ------------------------------------------------------------------ brute forces: tiny inputs only, used by the stress checks
  function permutationsOf(n) {
    const out = [];
    const used = new Array(n + 1).fill(false);
    const current = [];
    const walk = () => {
      if (current.length === n) { out.push(current.slice()); return; }
      for (let v = 1; v <= n; v += 1) { if (used[v]) continue; used[v] = true; current.push(v); walk(); current.pop(); used[v] = false; }
    };
    walk();
    return out;
  }
  function monotoneExists(n, k) { return permutationsOf(n).some((p) => Math.max(longestRun(p, true), longestRun(p, false)) === k); }
  function thirdExists(a, b) { return permutationsOf(a.length).some((c) => c.every((v, i) => v !== a[i] && v !== b[i])); }
  function scheduleExists(wanted) {
    const n = wanted.length, pairs = [];
    for (let u = 0; u < n; u += 1) for (let v = u + 1; v < n; v += 1) pairs.push([u, v]);
    for (let mask = 0; mask < Math.pow(2, pairs.length); mask += 1) {
      const played = new Array(n).fill(0);
      for (let k = 0; k < pairs.length; k += 1) if (mask & (1 << k)) { played[pairs[k][0]] += 1; played[pairs[k][1]] += 1; }
      if (played.every((count, i) => count === wanted[i])) return true;
    }
    return false;
  }
  function trominoTileableBrute(n, m) {
    const shapes = [[[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [1, -1], [1, 0]]];
    const grid = new Uint8Array(n * m);
    const walk = (start) => {
      let at = start;
      while (at < n * m && grid[at]) at += 1;
      if (at === n * m) return true;
      const r = Math.floor(at / m), c = at % m;
      for (const shape of shapes) {
        const cells = shape.map((d) => [r + d[0], c + d[1]]);
        if (!cells.every((p) => p[0] >= 0 && p[0] < n && p[1] >= 0 && p[1] < m && !grid[p[0] * m + p[1]])) continue;
        cells.forEach((p) => { grid[p[0] * m + p[1]] = 1; });
        if (walk(at + 1)) return true;
        cells.forEach((p) => { grid[p[0] * m + p[1]] = 0; });
      }
      return false;
    };
    return walk(0);
  }
  function gridPathFeasibleBrute(n, m, y1, x1, y2, x2) {
    if (y1 === y2 && x1 === x2) return n * m === 1;
    const total = n * m, seen = new Uint8Array(total);
    const target = (y2 - 1) * m + (x2 - 1);
    const walk = (cell, count) => {
      if (count === total) return cell === target;
      if (cell === target) return false;
      const r = Math.floor(cell / m), c = cell % m;
      const moves = [];
      if (r > 0) moves.push(cell - m);
      if (r < n - 1) moves.push(cell + m);
      if (c > 0) moves.push(cell - 1);
      if (c < m - 1) moves.push(cell + 1);
      for (const next of moves) { if (seen[next]) continue; seen[next] = 1; if (walk(next, count + 1)) return true; seen[next] = 0; }
      return false;
    };
    const start = (y1 - 1) * m + (x1 - 1);
    seen[start] = 1;
    return walk(start, 1);
  }
  function smallTests(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) { const n = 1 + Math.floor(next() * top); out.push([n, 1 + Math.floor(next() * n)]); }
    return out;
  }
  function derangedPair(seed, n) {
    const next = rng(seed);
    const a = randomPermutation(seed, n);
    for (let tries = 0; tries < 1000; tries += 1) {
      const b = a.slice();
      for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); const swap = b[i]; b[i] = b[j]; b[j] = swap; }
      if (b.every((v, i) => v !== a[i])) return [a, b];
    }
    return [a, a.slice(1).concat(a.slice(0, 1))];
  }
  function smallDegrees(seed, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < n; i += 1) out.push(Math.floor(next() * n));
    return out;
  }
  function randomGraphDegrees(seed, n, edges) {
    const next = rng(seed);
    const degree = new Array(n).fill(0);
    const used = new Set();
    let placed = 0, guard = 0;
    while (placed < edges && guard < edges * 20) {
      guard += 1;
      const u = Math.floor(next() * n), v = Math.floor(next() * n);
      if (u === v) continue;
      const key = Math.min(u, v) * n + Math.max(u, v);
      if (used.has(key)) continue;
      used.add(key);
      degree[u] += 1;
      degree[v] += 1;
      placed += 1;
    }
    return degree;
  }
  function randomPathTests(seed, count, top) {
    const next = rng(seed);
    const out = [];
    while (out.length < count) {
      const n = 1 + Math.floor(next() * top), m = 1 + Math.floor(next() * top);
      const y1 = 1 + Math.floor(next() * n), x1 = 1 + Math.floor(next() * m), y2 = 1 + Math.floor(next() * n), x2 = 1 + Math.floor(next() * m);
      if (y1 === y2 && x1 === x2) continue;
      out.push([n, m, y1, x1, y2, x2]);
    }
    return out;
  }
  function randomBoards(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) out.push([1 + Math.floor(next() * top), 1 + Math.floor(next() * top)]);
    return out;
  }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const MONOTONE_TESTS = lazy(() => smallTests(1201, 1000, 100));
  const THIRD_PAIR = lazy(() => derangedPair(1202, 100000));
  const THIRD_ROTATED = lazy(() => { const a = randomPermutation(1203, 100000); return [a, a.slice(1).concat(a.slice(0, 1))]; });
  const CHESS_DEGREES = lazy(() => randomGraphDegrees(1204, 50000, 100000));
  const CHESS_STAR = lazy(() => { const out = new Array(100000).fill(1); out[0] = 99999; return out; });
  const TROMINO_TESTS = lazy(() => randomBoards(1205, 100, 100));
  const PATH_TESTS = lazy(() => randomPathTests(1206, 100, 50));

  const SAMPLE_MONOTONE = [[5, 3], [5, 2], [7, 7]];
  const SAMPLE_TROMINO = [[4, 6], [4, 7]];
  const SAMPLE_PATHS = [[1, 3, 1, 1, 1, 3], [1, 3, 1, 2, 1, 3], [2, 2, 1, 1, 2, 2], [2, 2, 1, 1, 2, 1], [4, 7, 1, 3, 3, 6]];
  const boardHint = (test) => ({ rectangles: [[0, 0, test[1], test[0]]], marks: test.length > 2 ? [[test[3] - 0.5, test[0] - test[2] + 0.5], [test[5] - 0.5, test[0] - test[4] + 0.5]] : [] });

  const CONSTRUCTION = [
    {
      id: "inverse-inversions", title: "Inverse Inversions", cses: { id: 2214, name: "Inverse Inversions" },
      goal: "A permutation of 1..n with exactly k inversions, an inversion being an earlier value larger than a later one. Any such permutation is accepted.",
      concept: "Placing the largest remaining value first makes it an inversion with every value still to come, so it absorbs one fewer inversion than there are values left. Take the largest while k can afford that. Once it cannot, put the value that has exactly the remaining k smaller values after it, then the rest in increasing order, which adds nothing more.",
      functionName: "inverseInversions", signature: "inverseInversions(n, k) → permutation",
      starterSource: starter("inverseInversions", "n, k", "While k ≥ (values left − 1), place the largest and pay that many; then place k + 1 and the rest in order."),
      solve: inverseInversions, comparator: "deep", accept: inverseInversionsAccept, check: (args, out) => inverseInversionsAccept(args, out) === true,
      small: (round) => { const n = 1 + (round % 8); return [n, round % (n * (n - 1) / 2 + 1)]; },
      reference: book("5.1", "Complete search · permutations"),
      presets: { "CSES sample": { a: 5, b: 4 }, "all inversions": { a: 5, b: 10 }, none: { a: 5, b: 0 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("reversed", "Reading the answer backwards turns every inversion into a non-inversion, so it has n(n − 1)/2 − k of them.", function inverseInversions(n, k) { const out = []; let top = n, left = k; while (top > 1 && left >= top - 1) { out.push(top); left -= top - 1; top -= 1; } if (top >= 1) { out.push(left + 1); for (let value = 1; value <= top; value += 1) if (value !== left + 1) out.push(value); } return out.reverse(); }),
        diagnosis("counts-one-too-many", "The largest value is an inversion with each value after it, which is one fewer than the values left, not all of them.", function inverseInversions(n, k) { const out = []; let top = n, left = k; while (top > 1 && left >= top) { out.push(top); left -= top; top -= 1; } if (top >= 1) { out.push(Math.min(top, left + 1)); for (let value = 1; value <= top; value += 1) if (value !== Math.min(top, left + 1)) out.push(value); } return out; }),
      ],
      hints: ["With r values left, placing the largest of them creates r − 1 inversions.", "Keep doing that while the remaining k is at least r − 1.", "Then place k + 1, which has exactly k smaller values behind it, and finish with the rest in increasing order."],
      cases: [
        example([5, 4], [5, 1, 2, 3, 4], "CSES sample"),
        example([5, 10], [5, 4, 3, 2, 1], "every pair inverted"),
        example([5, 0], [1, 2, 3, 4, 5], "no inversions"),
        example([1, 0], [1], "one value"),
        run(inverseInversions, [6, 7], "a middle count"),
        hidden("n = 200 000, time limit", () => [200000, 12345678901]),
      ],
    },
    {
      id: "monotone-subsequences", title: "Monotone Subsequences", cses: { id: 2215, name: "Monotone Subsequences" },
      goal: "For each test [n, k], a permutation of 1..n whose longest increasing or decreasing subsequence has exactly k elements, or null when none exists.",
      concept: "Write the values in blocks of k, each block decreasing and the blocks increasing: 3 2 1 6 5 4 … A decreasing subsequence stays inside one block, so it has at most k elements, and an increasing one takes at most one value per block. That works exactly when the number of blocks is at most k, that is when k² ≥ n, and Erdős and Szekeres showed nothing can do better: every permutation of more than k² values has a monotone run longer than k.",
      functionName: "monotoneSubsequences", signature: "monotoneSubsequences(tests) → array of permutation or null",
      starterSource: starter("monotoneSubsequences", "tests", "null when k · k < n; otherwise blocks of k values, each written from high to low."),
      solve: monotoneSubsequences, comparator: "deep", accept: monotoneSubsequencesAccept, check: (args, out) => { for (let t = 0; t < args[0].length; t += 1) if ((out[t] !== null) !== monotoneExists(args[0][t][0], args[0][t][1])) return false; return monotoneSubsequencesAccept(args, out, out) === true; },
      small: (round) => [smallTests(300 + round, 3, 7)],
      reference: book("22.3", "Combinatorics · Erdős–Szekeres"),
      presets: { "CSES sample": { a: SAMPLE_MONOTONE }, "just possible": { a: [[9, 3]] }, "just impossible": { a: [[10, 3]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("identity", "The sorted order has an increasing run of all n values, which is only right when k = n.", function monotoneSubsequences(tests) { return tests.map((test) => { if (test[1] * test[1] < test[0]) return null; const out = []; for (let v = 1; v <= test[0]; v += 1) out.push(v); return out; }); }),
        diagnosis("never-impossible", "With k² < n the blocks number more than k, so the increasing run through them is too long; no permutation works then.", function monotoneSubsequences(tests) { return tests.map((test) => { const n = test[0], k = test[1]; const out = []; for (let start = 1; start <= n; start += k) { const end = Math.min(n, start + k - 1); for (let value = end; value >= start; value -= 1) out.push(value); } return out; }); }),
      ],
      hints: ["If k · k < n, answer null.", "Split 1..n into consecutive blocks of k values.", "Write each block from its largest value down to its smallest, keeping the blocks in increasing order."],
      cases: [
        example([SAMPLE_MONOTONE], [[3, 2, 1, 5, 4], null, [7, 6, 5, 4, 3, 2, 1]], "CSES sample"),
        example([[[9, 3]]], [[3, 2, 1, 6, 5, 4, 9, 8, 7]], "exactly k squared"),
        example([[[10, 3]]], [null], "one past k squared"),
        example([[[1, 1]]], [[1]], "one value"),
        hidden("1 000 tests with n up to 100, time limit", () => [MONOTONE_TESTS()]),
      ],
    },
    {
      id: "third-permutation", title: "Third Permutation", cses: { id: 3422, name: "Third Permutation" },
      goal: "Given permutations a and b that differ at every position, a permutation c that differs from both at every position, or null when none exists.",
      concept: "Start from a shuffled permutation and repair it one position at a time: when position i clashes, swap it with some j where both values would be allowed. From n = 4 such a j always exists, because the clashing value is forbidden at only one other position while n − 2 values are allowed at i. Each repair leaves both positions fine for good, so the repairs never undo each other. For n = 3 the answer is forced, the value that is neither a nor b, and for n = 2 there is none.",
      functionName: "thirdPermutation", signature: "thirdPermutation(a, b) → permutation | null",
      starterSource: starter("thirdPermutation", "a, b", "n = 2 → null; n = 3 → 6 − a − b; otherwise shuffle, then fix each clash by a swap that is safe on both sides."),
      solve: thirdPermutation, comparator: "deep", accept: thirdPermutationAccept, check: (args, out) => ((out !== null) === thirdExists(args[0], args[1])) && thirdPermutationAccept(args, out, out) === true,
      small: (round) => derangedPair(400 + round, 2 + (round % 6)),
      reference: book("5.1", "Complete search · permutations"),
      presets: { "CSES sample": { a: [1, 3, 2, 5, 4], b: [4, 1, 3, 2, 5] }, "b is a turned by one": { a: [1, 2, 3, 4], b: [2, 3, 4, 1] }, "two values": { a: [1, 2], b: [2, 1] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("turn-without-repair", "Turning a by one position avoids a everywhere but can land exactly on b, and nothing checks for that.", function thirdPermutation(a, b) { const n = a.length; if (n <= 2) return null; return a.slice(1).concat(a.slice(0, 1)); }),
        diagnosis("never-impossible", "With two values, a and b already use both at every position, so there is nothing left for c.", function thirdPermutation(a, b) { const n = a.length; if (n === 3) return a.map((value, i) => 6 - value - b[i]); let seed = 88172645; const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }; const c = a.slice(); for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); const swap = c[i]; c[i] = c[j]; c[j] = swap; } if (n <= 2) return c; const clashes = (i, value) => value === a[i] || value === b[i]; for (let i = 0; i < n; i += 1) { while (clashes(i, c[i])) { const j = Math.floor(random() * n); if (j !== i && !clashes(i, c[j]) && !clashes(j, c[i])) { const swap = c[i]; c[i] = c[j]; c[j] = swap; } } } return c; }),
      ],
      hints: ["n = 2 has no answer; for n = 3 every position is forced to the value that is neither a nor b.", "Otherwise start from a shuffled copy of a.", "While position i clashes, try a random j and swap when c[j] is allowed at i and c[i] is allowed at j."],
      cases: [
        run(thirdPermutation, [[1, 3, 2, 5, 4], [4, 1, 3, 2, 5]], "CSES sample"),
        run(thirdPermutation, [[1, 2, 3, 4], [2, 3, 4, 1]], "b is a turned by one"),
        example([[1, 2], [2, 1]], null, "two values have no answer"),
        example([[1, 2, 3], [2, 3, 1]], [3, 1, 2], "three values are forced"),
        hidden("n = 100 000, time limit", () => THIRD_PAIR()),
        hidden("n = 100 000 with b turned by one, time limit", () => THIRD_ROTATED()),
      ],
    },
    {
      id: "permutation-prime-sums", title: "Permutation Prime Sums", cses: { id: 3423, name: "Permutation Prime Sums" },
      goal: "Two permutations a and b of 1..n such that every aᵢ + bᵢ is prime. Return [a, b]; any valid pair is accepted.",
      concept: "Let a be 1..n in order and build b by pairing. Take the smallest prime p above n. Every value from p − n up to n pairs with p minus itself, which lands in the same range, so that whole stretch sums to p. What is left is 1..p − n − 1, a smaller copy of the same problem. Bertrand's postulate puts p below 2n, so the leftover always shrinks and the pairing always finishes. An answer therefore always exists.",
      functionName: "permutationPrimeSums", signature: "permutationPrimeSums(n) → [a, b]",
      starterSource: starter("permutationPrimeSums", "n", "Sieve to 2n; for top = n down: p = next prime above top; pair i with p − i for i in [p − top, top]; top = p − top − 1."),
      solve: permutationPrimeSums, comparator: "deep", accept: permutationPrimeSumsAccept, check: (args, out) => permutationPrimeSumsAccept(args, out) === true, small: (round) => [1 + round],
      reference: book("21.1", "Number theory · primes"),
      presets: { "CSES sample": { a: 5 }, "one value": { a: 1 }, ten: { a: 10 } },
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 14 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("same-order", "Pairing each value with itself gives even sums, and 2 is the only even prime.", function permutationPrimeSums(n) { const a = []; for (let i = 1; i <= n; i += 1) a.push(i); return [a, a.slice()]; }),
        diagnosis("mirror", "Pairing i with n + 1 − i makes every sum n + 1, which is only prime for some n; the pairing has to aim at primes.", function permutationPrimeSums(n) { const a = [], b = []; for (let i = 1; i <= n; i += 1) { a.push(i); b.push(n + 1 - i); } return [a, b]; }),
      ],
      hints: ["Keep a = 1, 2, …, n and build b.", "For the current top value, find the smallest prime p above it and give every i from p − top to top the partner p − i.", "Repeat with top = p − top − 1 until it reaches zero."],
      cases: [
        example([5], [[1, 2, 3, 4, 5], [1, 5, 4, 3, 2]], "CSES sample size"),
        example([1], [[1], [1]], "one value: 1 + 1 = 2"),
        run(permutationPrimeSums, [10], "ten values"),
        run(permutationPrimeSums, [2], "two values"),
        hidden("n = 100 000, time limit", () => [100000]),
      ],
    },
    {
      id: "chess-tournament", title: "Chess Tournament", cses: { id: 1697, name: "Chess Tournament" },
      goal: "Given how many games each player wants, a list of games [u, v] in which no pair meets twice and everyone plays exactly as many games as wanted, or null when impossible.",
      concept: "This is building a simple graph with given degrees, and Havel and Hakimi showed the greedy that works: take the player who still wants the most games and pair them with the players who want the next most. Choosing the hungriest partners never hurts, because any other choice can be swapped into this one. If there are ever too few partners left, no schedule exists at all. The heap bricks from Sorting keep the largest demands at hand.",
      functionName: "chessTournament", signature: "chessTournament(wanted) → array of [u, v] | null",
      starterSource: starter("chessTournament", "wanted", "Max-heap of [−demand, player]; pop the largest, pop that many partners, record the games, push back partners with demand left."),
      solve: chessTournament, comparator: "deep", dependencies: ["heap-push", "heap-pop"], accept: chessTournamentAccept, check: (args, out) => ((out !== null) === scheduleExists(args[0])) && chessTournamentAccept(args, out, out) === true,
      small: (round) => [smallDegrees(500 + round, 1 + (round % 6))],
      reference: book("12.3", "Graph theory · degree sequences"),
      presets: { "CSES sample": { a: [1, 3, 2, 0, 2] }, "a path": { a: [1, 1, 2, 2] }, "odd total": { a: [1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("first-come", "Pairing players in queue order instead of by remaining demand can strand a hungry player with no one left to play.", function chessTournament(wanted) { const queue = []; for (let i = 0; i < wanted.length; i += 1) if (wanted[i] > 0) queue.push([wanted[i], i + 1]); const games = []; let head = 0; while (head < queue.length) { const front = queue[head]; head += 1; if (front[0] === 0) continue; const partners = []; while (partners.length < front[0] && head < queue.length) { partners.push(queue[head]); head += 1; } if (partners.length < front[0]) return null; partners.forEach((partner) => { games.push([front[1], partner[1]]); partner[0] -= 1; if (partner[0] > 0) queue.push(partner); }); } return games; }),
        diagnosis("one-sided-count", "A game uses up one wanted game for both players, so every partner's demand has to drop as well.", function chessTournament(wanted) { const heap = []; for (let i = 0; i < wanted.length; i += 1) if (wanted[i] > 0) heapPush(heap, [-wanted[i], i + 1]); const games = []; while (heap.length > 0) { const top = heapPop(heap).item; const need = -top[0]; const taken = []; for (let k = 0; k < need; k += 1) { if (heap.length === 0) return null; taken.push(heapPop(heap).item); } for (let k = 0; k < taken.length; k += 1) { games.push([top[1], taken[k][1]]); heapPush(heap, taken[k]); } } return games; }),
      ],
      hints: ["Push [−wanted[i], i + 1] for every player who wants a game, so the heap's top is the hungriest.", "Pop the top; pop as many partners as it needs, answering null if the heap runs out first.", "Record each game, lower each partner's demand by one and push back those who still want games."],
      cases: [
        run(chessTournament, [[1, 3, 2, 0, 2]], "CSES sample"),
        run(chessTournament, [[1, 1, 2, 2]], "a path, where the order of pairing matters"),
        example([[1, 1, 1]], null, "an odd total can never pair up"),
        example([[3, 1, 1]], null, "not enough opponents"),
        example([[0, 0]], [], "nobody wants to play"),
        hidden("n = 50 000 wanting 100 000 games, time limit", () => [CHESS_DEGREES()]),
        hidden("n = 100 000 around one player, time limit", () => [CHESS_STAR()]),
      ],
    },
    {
      id: "distinct-sums-grid", title: "Distinct Sums Grid", cses: { id: 3424, name: "Distinct Sums Grid" },
      goal: "An n × n grid in which every value 1..n appears exactly n times and all 2n row and column sums are different, or null when no such grid exists.",
      concept: "Start from the grid whose row i holds only the value i + 1. Its row sums are n apart, but every column sums to the same total. Replacing the diagonal with n, n − 1, …, 1 keeps each value's count, moves each row only a little, and shifts each column by a different amount, so the columns spread into a narrow band that sits between the widely spaced rows. When n leaves remainder 2 on division by 4 that is already a valid grid; otherwise a collision or two remain, and swapping the corner with one cell chosen by n separates them. No grid exists at all for n of 3 or less.",
      functionName: "distinctSumsGrid", signature: "distinctSumsGrid(n) → grid | null",
      starterSource: starter("distinctSumsGrid", "n", "null for n ≤ 3; otherwise row i full of i + 1 with the diagonal set to n − i, then one corner swap unless n mod 4 = 2."),
      solve: distinctSumsGrid, comparator: "deep", accept: distinctSumsGridAccept, check: (args, out) => distinctSumsGridAccept(args, out, args[0] <= 3 ? null : out) === true, small: (round) => [1 + round],
      reference: book("5.1", "Complete search · constructions"),
      presets: { "CSES sample size": { a: 5 }, "the smallest possible": { a: 4 }, impossible: { a: 3 } },
      scene: { kind: "algo", view: "number-grid", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 8 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("rows-only", "A grid whose rows are constant has distinct row sums, but every column then holds 1..n once and they all sum to the same total.", function distinctSumsGrid(n) { if (n <= 3) return null; const grid = []; for (let i = 0; i < n; i += 1) grid.push(new Array(n).fill(i + 1)); return grid; }),
        diagnosis("no-final-swap", "The reversed diagonal alone only works when n leaves remainder 2 on division by 4; otherwise a row and a column still share a sum.", function distinctSumsGrid(n) { if (n <= 3) return null; const grid = []; for (let i = 0; i < n; i += 1) { const row = new Array(n).fill(i + 1); row[i] = n - i; grid.push(row); } return grid; }),
      ],
      hints: ["There is no grid for n ≤ 3, and n = 4 needs a grid of its own.", "Fill row i with i + 1, then set the diagonal cell of row i to n − i; every value still appears n times.", "Unless n mod 4 = 2, swap the top-left cell with (3, (n − 1)/2) for odd n or with (n/2, 3n/4 − 1) when 4 divides n; 7 and 9 need their own cells."],
      cases: [
        example([5], distinctSumsGrid(5), "CSES sample size"),
        example([4], [[2, 4, 4, 3], [1, 4, 1, 2], [1, 2, 3, 1], [2, 4, 3, 3]], "the smallest possible"),
        example([3], null, "no grid for three"),
        example([1], null, "no grid for one"),
        run(distinctSumsGrid, [6], "six, which needs no swap"),
        run(distinctSumsGrid, [8], "eight, a multiple of four"),
        hidden("n = 500, time limit", () => [500]),
      ],
    },
    {
      id: "tromino-tileable", title: "Tromino Tileable", cses: { id: 2423, name: "Filling Trominos (brick)" },
      goal: "Whether an n × m board can be covered exactly by L-shaped trominoes.",
      concept: "Each piece covers three squares, so three must divide the area, and a board one square wide has no room for the bend. The surprise is the last rule: a board three squares wide can only be tiled when its length is even. Every L across a 3-wide strip pairs up with another to fill a 3 × 2 block, so an odd length always leaves a column over. Those three conditions are the whole story, which exhaustive search confirms for every board up to 9 × 9.",
      functionName: "trominoTileable", signature: "trominoTileable(n, m) → boolean",
      starterSource: starter("trominoTileable", "n, m", "False unless 3 divides n · m; false for a side of 1; false for a side of 3 against an odd side."),
      solve: trominoTileable, comparator: "scalar", brute: trominoTileableBrute, small: (round) => [1 + Math.floor(round / 7) % 7, 1 + (round % 7)],
      reference: book("5.1", "Complete search · tilings"),
      scene: { kind: "algo", view: "rectangle", handles: [{ id: "n", type: "slider", label: "rows (rounded)", value: 2, min: 1, max: 9 }, { id: "m", type: "slider", label: "columns (rounded)", value: 3, min: 1, max: 9 }], args: [{ fixture: "roundedN" }, { fixture: "roundedM" }] },
      diagnoses: [
        diagnosis("area-only", "Three dividing the area is necessary but not enough: a 1 × 3 strip and a 3 × 3 square both have the right area and cannot be tiled.", function trominoTileable(n, m) { return (n * m) % 3 === 0; }),
        diagnosis("forgets-three-by-odd", "A board three squares wide pairs its pieces into 3 × 2 blocks, so an odd length always leaves one column uncovered.", function trominoTileable(n, m) { return (n * m) % 3 === 0 && n > 1 && m > 1; }),
      ],
      hints: ["Three squares per piece means 3 must divide n · m.", "A side of length 1 can never hold the bend of an L.", "A side of 3 needs the other side to be even."],
      cases: [
        example([2, 3], true, "one 2 × 3 block"),
        example([4, 6], true, "CSES sample, first board"),
        example([4, 7], false, "CSES sample, second board"),
        example([3, 3], false, "three by three"),
        example([1, 3], false, "a single row"),
        example([5, 9], true, "odd by odd"),
      ],
    },
    {
      id: "filling-trominos", title: "Filling Trominos", cses: { id: 2423, name: "Filling Trominos" },
      goal: "For each board [n, m], a tiling by L-trominoes written as n strings of letters, where touching squares share a letter exactly when they belong to the same piece, or null when no tiling exists.",
      concept: "Two L-trominoes make a 2 × 3 or a 3 × 2 block, which tile any board with one side divisible by 3 and the other even. An odd other side splits into three columns of 2 × 3 blocks plus an even remainder, which needs the multiple-of-three side to be even. When both sides are odd one fixed 5 × 9 tiling, found by search, covers the corner and blocks fill the rest. The letters come last: pieces touch only a handful of others, so giving each piece the first letter its neighbours have not taken never needs more than a few.",
      functionName: "fillingTrominos", signature: "fillingTrominos(tests) → array of (array of strings) | null",
      starterSource: starter("fillingTrominos", "tests", "trominoTileable decides; lay out 3 × 2 and 2 × 3 blocks, with a 5 × 9 base when both sides are odd; colour the pieces greedily with letters."),
      solve: fillingTrominos, comparator: "deep", dependencies: ["tromino-tileable"], accept: fillingTrominosAccept, check: (args, out) => { for (let t = 0; t < args[0].length; t += 1) if ((out[t] !== null) !== trominoTileableBrute(args[0][t][0], args[0][t][1])) return false; return fillingTrominosAccept(args, out, out) === true; },
      small: (round) => [randomBoards(800 + round, 2, 7)],
      reference: book("5.1", "Complete search · tilings"),
      presets: { "CSES sample": { a: SAMPLE_TROMINO }, "odd by odd": { a: [[5, 9]] }, "one block": { a: [[2, 3]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("one-letter", "Every piece gets its own shape, but touching pieces with the same letter read as one region; neighbours need different letters.", function fillingTrominos(tests) { return tests.map((test) => (trominoTileable(test[0], test[1]) ? new Array(test[0]).fill("A".repeat(test[1])) : null)); }),
        // Built from the reference itself so the only difference is the one wrong condition.
        Object.freeze({ id: "even-sides-only", message: "Boards with an odd side can be tiled too, such as 6 × 5 and 5 × 9; only the 3 × odd boards cannot.", source: fillingTrominos.toString().replace("if (!trominoTileable(n, m)) return null;", "if (!trominoTileable(n, m) || n % 2 === 1 || m % 2 === 1) return null;") }),
      ],
      hints: ["Use trominoTileable first; answer null for boards it rejects.", "If 3 divides the rows and the columns are even, tile with 3 × 2 blocks; with odd columns and even rows, put 2 × 3 blocks in the first three columns first. Transpose when 3 divides the columns instead.", "Letter the pieces in reading order, each with the first letter no touching piece already has."],
      cases: [
        example([SAMPLE_TROMINO], fillingTrominos(SAMPLE_TROMINO), "CSES sample"),
        example([[[5, 9]]], fillingTrominos([[5, 9]]), "odd by odd"),
        example([[[6, 5]]], fillingTrominos([[6, 5]]), "an odd side against a multiple of six"),
        example([[[3, 3], [1, 6]]], [null, null], "two boards that cannot be tiled"),
        example([[[2, 3]]], fillingTrominos([[2, 3]]), "one block"),
        hidden("100 boards up to 100 × 100, time limit", () => [TROMINO_TESTS()]),
      ],
    },
    {
      id: "grid-path-feasible", title: "Grid Path Feasible", cses: { id: 2418, name: "Grid Path Construction (brick)" },
      goal: "Whether an n × m grid has a path from (y₁, x₁) to (y₂, x₂) that visits every square exactly once. A single square counts as a path from itself to itself.",
      concept: "Colour the grid like a chessboard. A path alternates colours, so with an even number of squares the ends must differ in colour, and with an odd number both ends must be the colour of the corners. Beyond that only narrow grids have exceptions. One square wide, the ends must be the two ends. Two wide, the ends cannot share a rung away from the ends. Three wide with an even length, the endpoint of the minority colour cannot lie two or more columns to the left of the other, or in the middle row anywhere to its left. That last rule was read off a brute-force search, and the whole test agrees with brute force on every rectangle up to 25 squares.",
      functionName: "gridPathFeasible", signature: "gridPathFeasible(n, m, y1, x1, y2, x2) → boolean",
      starterSource: starter("gridPathFeasible", "n, m, y1, x1, y2, x2", "Colour test first; then the rules for grids one, two and three squares wide."),
      solve: gridPathFeasible, comparator: "scalar", brute: gridPathFeasibleBrute, small: (round) => randomPathTests(900 + round, 1, 5)[0],
      reference: book("15.2", "Hamiltonian paths · grids"),
      presets: {
        "a 4 × 7 grid": Object.assign({ a: 4, b: 7, c: 1, d: 3, e: 3, f: 6 }, boardHint([4, 7, 1, 3, 3, 6])),
        "same colours": Object.assign({ a: 2, b: 2, c: 1, d: 1, e: 2, f: 2 }, boardHint([2, 2, 1, 1, 2, 2])),
        "a 3 × 4 trap": Object.assign({ a: 3, b: 4, c: 2, d: 1, e: 2, f: 2 }, boardHint([3, 4, 2, 1, 2, 2])),
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("colour-only", "The colour test is necessary but narrow grids add exceptions: on a single row, for instance, the ends must be the two ends of the row.", function gridPathFeasible(n, m, y1, x1, y2, x2) { if (y1 === y2 && x1 === x2) return n * m === 1; const colour1 = (y1 + x1) % 2, colour2 = (y2 + x2) % 2; if ((n * m) % 2 === 0) return colour1 !== colour2; return colour1 === 0 && colour2 === 0; }),
        diagnosis("forgets-width-three", "Grids three squares wide with an even length have their own forbidden placements, which neither the colour test nor the narrow rules catch.", function gridPathFeasible(n, m, y1, x1, y2, x2) { if (y1 === y2 && x1 === x2) return n * m === 1; const r1 = y1 - 1, c1 = x1 - 1, r2 = y2 - 1, c2 = x2 - 1; const colour1 = (r1 + c1) % 2, colour2 = (r2 + c2) % 2; if ((n * m) % 2 === 0) { if (colour1 === colour2) return false; } else if (colour1 !== 0 || colour2 !== 0) return false; if (n === 1) return (c1 === 0 && c2 === m - 1) || (c2 === 0 && c1 === m - 1); if (m === 1) return (r1 === 0 && r2 === n - 1) || (r2 === 0 && r1 === n - 1); if (n === 2 && c1 === c2 && c1 > 0 && c1 < m - 1) return false; if (m === 2 && r1 === r2 && r1 > 0 && r1 < n - 1) return false; return true; }),
      ],
      hints: ["Colour square (r, c) by (r + c) mod 2, counting from 0. An even-sized grid needs ends of different colours; an odd-sized one needs both ends on colour 0.", "One square wide: the ends must be the two ends. Two wide: the ends may not share a rung that is not at either end.", "Three wide with an even length: call b the end of colour 1; it fails when b is two or more columns left of the other end, or in the middle row and anywhere left of it."],
      cases: [
        example([1, 3, 1, 1, 1, 3], true, "CSES sample, first test"),
        example([1, 3, 1, 2, 1, 3], false, "CSES sample, second test"),
        example([2, 2, 1, 1, 2, 2], false, "CSES sample, third test"),
        example([2, 2, 1, 1, 2, 1], true, "CSES sample, fourth test"),
        example([4, 7, 1, 3, 3, 6], true, "CSES sample, fifth test"),
        example([3, 4, 2, 1, 2, 2], false, "a width-three trap"),
        example([2, 5, 1, 3, 2, 3], false, "an inner rung of a two-wide grid"),
      ],
    },
    {
      id: "grid-path-construction", title: "Grid Path Construction", cses: { id: 2418, name: "Grid Path Construction" },
      goal: "For each test [n, m, y₁, x₁, y₂, x₂], a path from (y₁, x₁) to (y₂, x₂) visiting every square exactly once, written as moves U, D, L and R, or null when none exists.",
      concept: "The brick says whether a path exists; building it works by shrinking the grid. A strip two squares thick along one side that holds neither endpoint can be set aside: solve the rest, find a step of that path running along the strip's edge, and detour through the strip in a snake that leaves and rejoins at those two squares. When the endpoints sit on both sides of every strip, cut the grid between them and pick a pair of neighbouring squares across the cut that make both halves solvable. Only rectangles of a dozen squares or fewer are left to brute force.",
      functionName: "gridPathConstruction", signature: "gridPathConstruction(tests) → array of string | null",
      starterSource: starter("gridPathConstruction", "tests", "Recursive solve(box, s, t): brute force small boxes; peel a two-thick strip avoiding s and t and splice a snake through it; otherwise split between s and t."),
      solve: gridPathConstruction, comparator: "deep", dependencies: ["grid-path-feasible"], accept: gridPathConstructionAccept, check: (args, out) => { for (let t = 0; t < args[0].length; t += 1) if ((out[t] !== null) !== gridPathFeasibleBrute.apply(null, args[0][t])) return false; return gridPathConstructionAccept(args, out, out) === true; },
      small: (round) => [randomPathTests(1000 + round, 2, 5)],
      reference: book("15.2", "Hamiltonian paths · grids"),
      presets: {
        "CSES sample, last test": Object.assign({ a: [[4, 7, 1, 3, 3, 6]] }, boardHint([4, 7, 1, 3, 3, 6])),
        "CSES sample": Object.assign({ a: SAMPLE_PATHS }, boardHint([4, 7, 1, 3, 3, 6])),
        "a wide grid": Object.assign({ a: [[5, 12, 3, 6, 3, 7]] }, boardHint([5, 12, 3, 6, 3, 7])),
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("snake-from-corner", "A row-by-row snake visits every square, but it starts in the corner and ends where it ends; the path has to run between the two given squares.", function gridPathConstruction(tests) { return tests.map((test) => { const n = test[0], m = test[1]; if (!gridPathFeasible(n, m, test[2], test[3], test[4], test[5])) return null; let moves = ""; for (let r = 0; r < n; r += 1) { moves += (r % 2 === 0 ? "R" : "L").repeat(m - 1); if (r + 1 < n) moves += "D"; } return moves; }); }),
        diagnosis("forgets-the-strip", "The strip set aside still has to be visited: once the rest is solved, the path must detour through it.", function gridPathConstruction(tests) {
    const fits = (box, s, t) => gridPathFeasible(box.h, box.w, s[0] - box.r + 1, s[1] - box.c + 1, t[0] - box.r + 1, t[1] - box.c + 1);
    const inside = (box, p) => p[0] >= box.r && p[0] < box.r + box.h && p[1] >= box.c && p[1] < box.c + box.w;
    const brute = (box, s, t) => {
      const total = box.h * box.w;
      const seen = new Uint8Array(total);
      const index = (p) => (p[0] - box.r) * box.w + (p[1] - box.c);
      const path = [s];
      seen[index(s)] = 1;
      const walk = () => {
        const at = path[path.length - 1];
        if (path.length === total) return at[0] === t[0] && at[1] === t[1];
        if (at[0] === t[0] && at[1] === t[1]) return false;
        const moves = [[at[0] - 1, at[1]], [at[0] + 1, at[1]], [at[0], at[1] - 1], [at[0], at[1] + 1]];
        for (let k = 0; k < 4; k += 1) {
          const next = moves[k];
          if (!inside(box, next) || seen[index(next)]) continue;
          seen[index(next)] = 1;
          path.push(next);
          if (walk()) return true;
          path.pop();
          seen[index(next)] = 0;
        }
        return false;
      };
      return walk() ? path : null;
    };
    const snake = (strip, from, to, vertical) => {
      const out = [];
      if (!vertical) {
        const inner = from[0], outer = inner === strip.r ? strip.r + 1 : strip.r;
        const first = strip.c, last = strip.c + strip.w - 1;
        if (to[1] > from[1]) {
          for (let c = from[1]; c >= first; c -= 1) out.push([inner, c]);
          for (let c = first; c <= last; c += 1) out.push([outer, c]);
          for (let c = last; c >= to[1]; c -= 1) out.push([inner, c]);
        } else {
          for (let c = from[1]; c <= last; c += 1) out.push([inner, c]);
          for (let c = last; c >= first; c -= 1) out.push([outer, c]);
          for (let c = first; c <= to[1]; c += 1) out.push([inner, c]);
        }
      } else {
        const inner = from[1], outer = inner === strip.c ? strip.c + 1 : strip.c;
        const first = strip.r, last = strip.r + strip.h - 1;
        if (to[0] > from[0]) {
          for (let r = from[0]; r >= first; r -= 1) out.push([r, inner]);
          for (let r = first; r <= last; r += 1) out.push([r, outer]);
          for (let r = last; r >= to[0]; r -= 1) out.push([r, inner]);
        } else {
          for (let r = from[0]; r <= last; r += 1) out.push([r, inner]);
          for (let r = last; r >= first; r -= 1) out.push([r, outer]);
          for (let r = first; r <= to[0]; r += 1) out.push([r, inner]);
        }
      }
      return out;
    };
    const solve = (box, s, t) => {
      if (!fits(box, s, t)) return null;
      if (box.h * box.w <= 12) return brute(box, s, t);
      const peels = [
        { strip: { r: box.r, c: box.c, h: 2, w: box.w }, rest: { r: box.r + 2, c: box.c, h: box.h - 2, w: box.w }, edge: box.r + 2, inner: box.r + 1, vertical: false },
        { strip: { r: box.r + box.h - 2, c: box.c, h: 2, w: box.w }, rest: { r: box.r, c: box.c, h: box.h - 2, w: box.w }, edge: box.r + box.h - 3, inner: box.r + box.h - 2, vertical: false },
        { strip: { r: box.r, c: box.c, h: box.h, w: 2 }, rest: { r: box.r, c: box.c + 2, h: box.h, w: box.w - 2 }, edge: box.c + 2, inner: box.c + 1, vertical: true },
        { strip: { r: box.r, c: box.c + box.w - 2, h: box.h, w: 2 }, rest: { r: box.r, c: box.c, h: box.h, w: box.w - 2 }, edge: box.c + box.w - 3, inner: box.c + box.w - 2, vertical: true },
      ];
      for (let k = 0; k < peels.length; k += 1) {
        const peel = peels[k];
        if (peel.rest.h < 1 || peel.rest.w < 1) continue;
        if (inside(peel.strip, s) || inside(peel.strip, t)) continue;
        if (!fits(peel.rest, s, t)) continue;
        const path = solve(peel.rest, s, t);
        if (path) return path;
      }
      const cuts = [];
      for (let k = 1; k < box.h; k += 1) cuts.push({ a: { r: box.r, c: box.c, h: k, w: box.w }, b: { r: box.r + k, c: box.c, h: box.h - k, w: box.w }, vertical: false });
      for (let k = 1; k < box.w; k += 1) cuts.push({ a: { r: box.r, c: box.c, h: box.h, w: k }, b: { r: box.r, c: box.c + k, h: box.h, w: box.w - k }, vertical: true });
      for (let k = 0; k < cuts.length; k += 1) {
        const cut = cuts[k];
        let first = cut.a, second = cut.b;
        if (inside(first, t) && inside(second, s)) { const swap = first; first = second; second = swap; }
        if (!(inside(first, s) && inside(second, t))) continue;
        const span = cut.vertical ? box.h : box.w;
        for (let x = 0; x < span; x += 1) {
          const near = cut.vertical ? [box.r + x, cut.a.c + cut.a.w - 1] : [cut.a.r + cut.a.h - 1, box.c + x];
          const far = cut.vertical ? [box.r + x, cut.b.c] : [cut.b.r, box.c + x];
          const p = inside(first, near) ? near : far, q = inside(first, near) ? far : near;
          if (!fits(first, s, p) || !fits(second, q, t)) continue;
          const head = solve(first, s, p);
          if (!head) continue;
          const tail = solve(second, q, t);
          if (!tail) continue;
          return head.concat(tail);
        }
      }
      return box.h * box.w <= 24 ? brute(box, s, t) : null;
    };
    return tests.map((test) => {
      const n = test[0], m = test[1];
      const path = solve({ r: 0, c: 0, h: n, w: m }, [test[2] - 1, test[3] - 1], [test[4] - 1, test[5] - 1]);
      if (!path) return null;
      let moves = "";
      for (let i = 1; i < path.length; i += 1) {
        const dr = path[i][0] - path[i - 1][0], dc = path[i][1] - path[i - 1][1];
        moves += dr === -1 ? "U" : dr === 1 ? "D" : dc === -1 ? "L" : "R";
      }
      return moves;
    });
  }),
      ],
      hints: ["Start with gridPathFeasible; answer null when it says no. Solve small boxes by brute force.", "If a two-thick strip along one side holds neither endpoint and the rest is still feasible, solve the rest, find a step running along the strip's edge, and splice in a snake through the strip.", "Otherwise try each cut that separates the endpoints and each pair of neighbouring squares across it, recursing when both halves are feasible."],
      cases: [
        example([SAMPLE_PATHS], gridPathConstruction(SAMPLE_PATHS), "CSES sample"),
        example([[[3, 4, 2, 1, 2, 2]]], [null], "a width-three trap"),
        example([[[5, 12, 3, 6, 3, 7]]], gridPathConstruction([[5, 12, 3, 6, 3, 7]]), "neighbours in the middle of a wide grid"),
        example([[[2, 5, 1, 3, 2, 3], [2, 5, 1, 1, 2, 1]]], gridPathConstruction([[2, 5, 1, 3, 2, 3], [2, 5, 1, 1, 2, 1]]), "an inner rung, and a rung at the end"),
        hidden("100 tests up to 50 × 50, time limit", () => [PATH_TESTS()]),
      ],
    },
  ];
  core.share({ trominoTileable, gridPathFeasible });
  core.define("construction", CONSTRUCTION);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

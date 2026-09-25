(function defineAlgoSection(core) {
  "use strict";
  const { lazy, rng, randomInts, randomPermutation, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { fenwickAdd, fenwickPrefix, fenwickKth, heapPush, heapPop, dsuFind, dsuUnion, maxFlow, minCostFlow, convolve } = core.shared;

  // ------------------------------------------------------------------ 17 · additional problems II · references
  function bouncingBallSteps(tests) {
    const gcd = (p, q) => { while (q) { const t = p % q; p = q; q = t; } return p; };
    return tests.map(([n, m, k]) => {
      // Rows and columns bounce independently: each is a triangle wave with period 2(n − 1) or 2(m − 1).
      const steps = BigInt(k), p = BigInt(n - 1), q = BigInt(m - 1);
      const fold = (half) => { const r = steps % (2n * half); return Number(r <= half ? r : 2n * half - r) + 1; };
      // A turn happens whenever either coordinate reaches a border; corners count once.
      const changes = steps / p + steps / q - steps / (p / gcd(p, q) * q);
      return [fold(p), fold(q), changes.toString()];
    });
  }
  function bouncingBallCycle(tests) {
    const gcd = (p, q) => { while (q) { const t = p % q; p = q; q = t; } return p; };
    return tests.map(([n, m]) => {
      const p = n - 1, q = m - 1, g = gcd(p, q), P = p / g, Q = q / g;
      // Back at the corner when both triangle waves restart: after lcm(2p, 2q) steps.
      const steps = 2n * BigInt(P) * BigInt(q);
      // Cell (x, y) is on the path exactly when x ≡ ±y (mod 2g): count the pairs by folded residue.
      const cells = BigInt(g - 1) * BigInt(P) * BigInt(Q)
        + BigInt(Math.floor(P / 2) + 1) * BigInt(Math.floor(Q / 2) + 1)
        + BigInt(Math.floor((P + 1) / 2)) * BigInt(Math.floor((Q + 1) / 2));
      return [steps.toString(), cells.toString()];
    });
  }
  function knightMovesQueries(queries) {
    return queries.map(([x, y]) => {
      let dx = x - 1, dy = y - 1;
      if (dx < dy) { const t = dx; dx = dy; dy = t; }
      // The open-board formula, plus the one square where the corner blocks the usual two-move route.
      if (dx === 1 && dy === 0) return 3;
      if (dx === 2 && dy === 2) return 4;
      if (dx === 1 && dy === 1) return 4;
      const delta = dx - dy;
      if (dy > delta) return delta - 2 * Math.floor((delta - dy) / 3);
      return delta - 2 * Math.floor((delta - dy) / 4);
    });
  }
  function kSubsetSumsI(values, k) {
    // Start from the sum of all negatives; every other subset adds absolute values to it.
    let base = 0;
    const steps = values.map((v) => { if (v < 0) base += v; return Math.abs(v); }).sort((p, q) => p - q);
    const out = [base], heap = [];
    if (steps.length) heapPush(heap, [base + steps[0], 0]);
    // A subset with largest index i spawns: add steps[i + 1], or swap steps[i] for steps[i + 1].
    while (out.length < k) {
      const [sum, i] = heapPop(heap).item;
      out.push(sum);
      if (i + 1 < steps.length) {
        heapPush(heap, [sum + steps[i + 1], i + 1]);
        heapPush(heap, [sum - steps[i] + steps[i + 1], i + 1]);
      }
    }
    return out;
  }
  function kSubsetSumsII(values, m, k) {
    const a = values.slice().sort((p, q) => p - q), n = a.length;
    let start = 0;
    for (let i = 0; i < m; i += 1) start += a[i];
    // State [sum, x, y, z]: element x sits at position y, the elements after it are fixed with the next one at z,
    // and the elements before it are still at their starting positions.
    const out = [start], heap = [];
    if (m < n) heapPush(heap, [start - a[m - 1] + a[m], m - 1, m, n]);
    while (out.length < k) {
      const [sum, x, y, z] = heapPop(heap).item;
      out.push(sum);
      if (y + 1 < z) heapPush(heap, [sum - a[y] + a[y + 1], x, y + 1, z]);
      if (x > 0 && x < y) heapPush(heap, [sum - a[x - 1] + a[x], x - 1, x, y]);
    }
    return out;
  }
  function increasingArrayII(values) {
    // Slope trick: a max-heap holds the breakpoints; a value below the current top pays the gap and becomes a breakpoint twice.
    const heap = [];
    let total = 0;
    values.forEach((x) => {
      heapPush(heap, [-x]);
      if (-heap[0][0] > x) {
        total += -heap[0][0] - x;
        heapPop(heap);
        heapPush(heap, [-x]);
      }
    });
    return total;
  }
  function foodDivision(have, want) {
    const n = have.length, prefix = new Float64Array(n);
    let run = 0;
    for (let i = 0; i < n; i += 1) { run += have[i] - want[i]; prefix[i] = run; }
    // Food passed across edge i is prefix[i] − c for the flow c around the table; the median c minimises the total.
    const median = Float64Array.from(prefix).sort()[n >> 1];
    let total = 0n;
    for (let i = 0; i < n; i += 1) total += BigInt(Math.abs(prefix[i] - median));
    return total.toString();
  }
  function swapRoundSorting(values) {
    const n = values.length, seen = new Uint8Array(n + 1), first = [], second = [];
    let longest = 1;
    for (let s = 1; s <= n; s += 1) {
      if (seen[s]) continue;
      const cycle = [];
      for (let i = s; !seen[i]; i = values[i - 1]) { seen[i] = 1; cycle.push(i); }
      const L = cycle.length;
      if (L > longest) longest = L;
      if (L === 2) first.push([cycle[0], cycle[1]]);
      // A longer cycle is two reflections: j ↔ −j, then j ↔ 1 − j (indices mod L).
      if (L > 2) {
        for (let j = 1; 2 * j < L; j += 1) first.push([cycle[j], cycle[L - j]]);
        for (let j = 1; 2 * j <= L; j += 1) second.push([cycle[j], cycle[(L + 1 - j) % L]]);
      }
    }
    if (longest === 1) return [];
    return longest === 2 ? [first] : [first, second];
  }
  function binarySubsequences(n) {
    // Appending 0 or 1 maps (x, y) → (x + y, y) or (x, x + y) from (1, 1), and the string has x + y − 2 subsequences.
    const total = n + 2;
    let bestX = 1, bestSteps = Infinity;
    for (let x = 1; x < total; x += 1) {
      let p = x, q = total - x, steps = 0;
      while (q) { steps += Math.floor(p / q); const t = p % q; p = q; q = t; }
      if (p === 1 && steps < bestSteps) { bestSteps = steps; bestX = x; }
    }
    const out = [];
    let X = bestX, Y = total - bestX;
    while (X !== 1 || Y !== 1) { if (X > Y) { out.push("0"); X -= Y; } else { out.push("1"); Y -= X; } }
    return out.reverse().join("");
  }
  function schoolExcursion(n, wishes) {
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    wishes.forEach(([a, b]) => dsuUnion(parent, size, a, b));
    const count = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) if (dsuFind(parent, v) === v) count[size[v]] += 1;
    // Subset sums of the group sizes in a bitset; c groups of one size become pieces 1, 2, 4, … so each size costs O(log c) shifts.
    const words = (n >> 5) + 1, bits = new Uint32Array(words);
    bits[0] = 1;
    const addItem = (w) => {
      const wordShift = w >> 5, bitShift = w & 31;
      for (let i = words - 1; i >= wordShift; i -= 1) {
        let moved = bits[i - wordShift] << bitShift;
        if (bitShift && i - wordShift - 1 >= 0) moved |= bits[i - wordShift - 1] >>> (32 - bitShift);
        bits[i] |= moved;
      }
    };
    for (let s = 1; s <= n; s += 1) {
      let left = count[s];
      for (let piece = 1; left > 0; piece *= 2) { const take = Math.min(piece, left); addItem(take * s); left -= take; }
    }
    const out = [];
    for (let i = 1; i <= n; i += 1) out.push((bits[i >> 5] >>> (i & 31)) & 1 ? "1" : "0");
    return out.join("");
  }
  function coinGrid(grid) {
    const n = grid.length, source = 2 * n + 1, sink = 2 * n + 2, edges = [];
    for (let r = 0; r < n; r += 1) edges.push([source, r + 1, 1]);
    for (let c = 0; c < n; c += 1) edges.push([n + c + 1, sink, 1]);
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (grid[r][c] === "o") edges.push([r + 1, n + c + 1, 1]);
    // König: a maximum matching of rows to columns has the size of the fewest lines covering every coin.
    const { value, flows } = maxFlow(2 * n + 2, edges, source, sink);
    const adjacency = [];
    for (let v = 0; v <= 2 * n + 2; v += 1) adjacency.push([]);
    edges.forEach(([a, b, c], i) => {
      if (c - flows[i] > 0) adjacency[a].push(b);
      if (flows[i] > 0) adjacency[b].push(a);
    });
    const reach = new Uint8Array(2 * n + 3), queue = [source];
    reach[source] = 1;
    for (let h = 0; h < queue.length; h += 1) for (const u of adjacency[queue[h]]) if (!reach[u]) { reach[u] = 1; queue.push(u); }
    // The cover: rows the residual search cannot reach, and columns it can.
    const moves = [];
    for (let r = 1; r <= n; r += 1) if (!reach[r]) moves.push([1, r]);
    for (let c = 1; c <= n; c += 1) if (reach[n + c]) moves.push([2, c]);
    return { count: value, moves };
  }
  function gridColoringII(grid) {
    const n = grid.length, m = grid[0].length, cells = n * m, nodes = 2 * cells;
    // Each cell keeps one of its two other letters: literal 2c means the smaller one, 2c + 1 the larger one.
    const option = new Int8Array(nodes);
    for (let c = 0; c < cells; c += 1) {
      const old = grid[Math.floor(c / m)].charCodeAt(c % m) - 65;
      option[2 * c] = old === 0 ? 1 : 0;
      option[2 * c + 1] = old === 2 ? 1 : 2;
    }
    const from = [], to = [];
    const forbid = (u, v) => {
      // Neighbours u and v may not take the same letter: for every clash, u's choice forces v's other choice.
      for (let a = 0; a < 2; a += 1) for (let b = 0; b < 2; b += 1) {
        if (option[2 * u + a] !== option[2 * v + b]) continue;
        from.push(2 * u + a); to.push(2 * v + 1 - b);
        from.push(2 * v + b); to.push(2 * u + 1 - a);
      }
    };
    for (let r = 0; r < n; r += 1) for (let c = 0; c < m; c += 1) {
      if (c + 1 < m) forbid(r * m + c, r * m + c + 1);
      if (r + 1 < n) forbid(r * m + c, (r + 1) * m + c);
    }
    const csr = (heads, tails) => {
      const start = new Int32Array(nodes + 1), list = new Int32Array(heads.length);
      for (let i = 0; i < heads.length; i += 1) start[heads[i] + 1] += 1;
      for (let v = 0; v < nodes; v += 1) start[v + 1] += start[v];
      const fill = start.slice(0, nodes);
      for (let i = 0; i < heads.length; i += 1) list[fill[heads[i]]++] = tails[i];
      return [start, list];
    };
    const [fs, fl] = csr(from, to), [bs, bl] = csr(to, from);
    // Kosaraju: finishing order on the implications, then components on the reversed graph in topological order.
    const order = new Int32Array(nodes), pointer = new Int32Array(nodes), stack = new Int32Array(nodes), seen = new Uint8Array(nodes);
    let finished = 0;
    for (let s = 0; s < nodes; s += 1) {
      if (seen[s]) continue;
      let top = 0;
      stack[top++] = s; seen[s] = 1; pointer[s] = fs[s];
      while (top) {
        const v = stack[top - 1];
        if (pointer[v] < fs[v + 1]) {
          const u = fl[pointer[v]++];
          if (!seen[u]) { seen[u] = 1; pointer[u] = fs[u]; stack[top++] = u; }
        } else { order[finished++] = v; top -= 1; }
      }
    }
    const comp = new Int32Array(nodes).fill(-1);
    let label = 0;
    for (let i = nodes - 1; i >= 0; i -= 1) {
      const s = order[i];
      if (comp[s] >= 0) continue;
      let top = 0;
      stack[top++] = s; comp[s] = label;
      while (top) {
        const v = stack[--top];
        for (let e = bs[v]; e < bs[v + 1]; e += 1) if (comp[bl[e]] < 0) { comp[bl[e]] = label; stack[top++] = bl[e]; }
      }
      label += 1;
    }
    const out = [];
    for (let r = 0; r < n; r += 1) {
      let row = "";
      for (let c = 0; c < m; c += 1) {
        const cell = r * m + c;
        if (comp[2 * cell] === comp[2 * cell + 1]) return null;
        row += String.fromCharCode(65 + option[comp[2 * cell] > comp[2 * cell + 1] ? 2 * cell : 2 * cell + 1]);
      }
      out.push(row);
    }
    return out;
  }
  function programmersAndArtists(a, b, applicants) {
    const n = applicants.length;
    // Sorted by programming minus art, some optimal hiring takes every programmer before every artist.
    const order = applicants.map((p, i) => i).sort((p, q) => (applicants[q][0] - applicants[q][1]) - (applicants[p][0] - applicants[p][1]));
    const bestPrefix = new Float64Array(n + 1).fill(-Infinity), bestSuffix = new Float64Array(n + 1).fill(-Infinity);
    let heap = [], sum = 0;
    if (a === 0) bestPrefix[0] = 0;
    for (let i = 0; i < n; i += 1) {
      const x = applicants[order[i]][0];
      heapPush(heap, [x]); sum += x;
      if (heap.length > a) sum -= heapPop(heap).item[0];
      if (heap.length === a) bestPrefix[i + 1] = sum;
    }
    heap = []; sum = 0;
    if (b === 0) bestSuffix[n] = 0;
    for (let i = n - 1; i >= 0; i -= 1) {
      const y = applicants[order[i]][1];
      heapPush(heap, [y]); sum += y;
      if (heap.length > b) sum -= heapPop(heap).item[0];
      if (heap.length === b) bestSuffix[i] = sum;
    }
    let best = 0;
    for (let i = a; i <= n - b; i += 1) best = Math.max(best, bestPrefix[i] + bestSuffix[i]);
    return best;
  }
  function removingDigitsII(n) {
    const pow10 = [1n];
    for (let i = 1; i <= 19; i += 1) pow10.push(pow10[i - 1] * 10n);
    const memo = new Map();
    // go(k, m, x): subtract max(m, largest digit of x) from the k-digit x until it drops below 0 (or reaches 0 with m = 0);
    // returns [steps, value afterwards]. After a borrow the lower part is always 10^(k−1) − small, so few states repeat.
    const go = (k, m, x) => {
      if (k === 1) {
        let steps = 0n;
        while (x >= 0n && !(x === 0n && m === 0)) { x -= BigInt(Math.max(m, Number(x))); steps += 1n; }
        return [steps, x];
      }
      const key = k + "," + m + "," + x;
      if (memo.has(key)) return memo.get(key);
      const unit = pow10[k - 1];
      let high = x / unit, low = x % unit, steps = 0n, result = null;
      while (result === null) {
        const [s, rest] = go(k - 1, Math.max(m, Number(high)), low);
        steps += s;
        if (rest >= 0n) result = [steps, 0n];
        else if (high === 0n) result = [steps, rest];
        else { high -= 1n; low = rest + unit; }
      }
      memo.set(key, result);
      return result;
    };
    // Taking the largest digit is always optimal, so only the greedy's step count is needed.
    return go(n.length, 0, BigInt(n))[0].toString();
  }
  function coinArrangement(top, bottom) {
    let upper = 0, lower = 0, moves = 0;
    // Sweep columns carrying each row's surplus (or debt) to the right; swap between rows whenever they disagree in sign.
    for (let i = 0; i < top.length; i += 1) {
      upper += top[i] - 1; lower += bottom[i] - 1;
      if (upper > 0 && lower < 0) { const t = Math.min(upper, -lower); moves += t; upper -= t; lower += t; }
      else if (upper < 0 && lower > 0) { const t = Math.min(-upper, lower); moves += t; upper += t; lower -= t; }
      moves += Math.abs(upper) + Math.abs(lower);
    }
    return moves;
  }
  function replaceWithDifference(values) {
    const n = values.length, total = values.reduce((s, v) => s + v, 0);
    if (total % 2) return -1;
    // The last number is a signed sum, so it is 0 exactly when the values split into two halves of equal sum.
    const half = total / 2, words = (half >> 5) + 1, bits = new Uint32Array(words), first = new Int32Array(half + 1).fill(-1);
    bits[0] = 1; first[0] = n;
    for (let item = 0; item < n; item += 1) {
      const w = values[item], wordShift = w >> 5, bitShift = w & 31;
      for (let i = words - 1; i >= wordShift; i -= 1) {
        let moved = bits[i - wordShift] << bitShift;
        if (bitShift && i - wordShift - 1 >= 0) moved |= bits[i - wordShift - 1] >>> (32 - bitShift);
        let fresh = (moved & ~bits[i]) >>> 0;
        bits[i] |= moved;
        while (fresh) { const b = 31 - Math.clz32(fresh & -fresh), s = i * 32 + b; if (s <= half) first[s] = item; fresh = (fresh & (fresh - 1)) >>> 0; }
      }
    }
    if (first[half] < 0) return -1;
    const inPlus = new Uint8Array(n);
    for (let s = half; s > 0; s -= values[first[s]]) inPlus[first[s]] = 1;
    const plus = [], minus = [];
    values.forEach((v, i) => (inPlus[i] ? plus : minus).push(v));
    // Pair one number from each side; the difference joins the side that was larger, so the sums stay equal.
    const ops = [];
    while (plus.length + minus.length > 1) {
      if (!plus.length || !minus.length) { const side = plus.length ? plus : minus; ops.push([side.pop(), side.pop()]); side.push(0); continue; }
      const p = plus.pop(), q = minus.pop();
      ops.push([p, q]);
      if (p >= q) plus.push(p - q); else minus.push(q - p);
    }
    return ops;
  }
  function gridPuzzleI(rows, cols) {
    const n = rows.length;
    if (rows.reduce((s, v) => s + v, 0) !== cols.reduce((s, v) => s + v, 0)) return -1;
    // Gale–Ryser: fill each row into the columns that still need the most squares.
    const left = cols.slice(), grid = [];
    for (let r = 0; r < n; r += 1) {
      const order = left.map((v, j) => j).sort((p, q) => left[q] - left[p] || p - q);
      const row = new Array(n).fill(".");
      for (let t = 0; t < rows[r]; t += 1) {
        const j = order[t];
        if (left[j] === 0) return -1;
        left[j] -= 1; row[j] = "X";
      }
      grid.push(row.join(""));
    }
    return grid;
  }
  function gridPuzzleII(rows, cols, coins) {
    const n = rows.length, source = 2 * n + 1, sink = 2 * n + 2, edges = [];
    const need = rows.reduce((s, v) => s + v, 0);
    if (need !== cols.reduce((s, v) => s + v, 0)) return -1;
    for (let r = 0; r < n; r += 1) edges.push([source, r + 1, rows[r], 0]);
    for (let c = 0; c < n; c += 1) edges.push([n + c + 1, sink, cols[c], 0]);
    // Every chosen square is one unit of flow through its row and column; cost 1000 − coins keeps costs non-negative.
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) edges.push([r + 1, n + c + 1, 1, 1000 - coins[r][c]]);
    const result = minCostFlow(2 * n + 2, edges, source, sink, need);
    if (result.flow < need) return -1;
    const grid = [];
    for (let r = 0; r < n; r += 1) {
      let row = "";
      for (let c = 0; c < n; c += 1) row += result.flows[2 * n + r * n + c] > 0 ? "X" : ".";
      grid.push(row);
    }
    return { coins: 1000 * need - result.cost, grid };
  }
  function bitSubstrings(s) {
    const n = s.length, gaps = [1];
    for (let i = 0; i < n; i += 1) { if (s.charCodeAt(i) === 49) gaps.push(1); else gaps[gaps.length - 1] += 1; }
    // gaps[i] − 1 zeros lie between the i-th and (i + 1)-th one; substrings with k ones pair gap i with gap i + k.
    const ones = gaps.length - 1, out = new Array(n + 1).fill(0);
    gaps.forEach((g) => { out[0] += g * (g - 1) / 2; });
    if (ones) {
      const product = convolve(gaps, gaps.slice().reverse());
      for (let k = 1; k <= ones; k += 1) out[k] = product[ones - k];
    }
    return out;
  }
  function reversalSorting(values) {
    const n = values.length;
    const left = new Int32Array(n + 1), right = new Int32Array(n + 1), size = new Int32Array(n + 1), low = new Int32Array(n + 1);
    const value = new Int32Array(n + 1), flip = new Uint8Array(n + 1), priority = new Float64Array(n + 1);
    low[0] = n + 1;
    let seed = 20240917;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
    const pull = (t) => { size[t] = 1 + size[left[t]] + size[right[t]]; low[t] = Math.min(value[t], low[left[t]], low[right[t]]); };
    const push = (t) => { if (flip[t]) { const l = left[t]; left[t] = right[t]; right[t] = l; if (left[t]) flip[left[t]] ^= 1; if (right[t]) flip[right[t]] ^= 1; flip[t] = 0; } };
    const merge = (a, b) => {
      if (!a || !b) return a || b;
      if (priority[a] > priority[b]) { push(a); right[a] = merge(right[a], b); pull(a); return a; }
      push(b); left[b] = merge(a, left[b]); pull(b); return b;
    };
    let cutLeft = 0, cutRight = 0;
    const split = (t, k) => {
      if (!t) { cutLeft = 0; cutRight = 0; return; }
      push(t);
      if (size[left[t]] >= k) { split(left[t], k); left[t] = cutRight; pull(t); cutRight = t; }
      else { split(right[t], k - size[left[t]] - 1); right[t] = cutLeft; pull(t); cutLeft = t; }
    };
    let root = 0;
    for (let i = 1; i <= n; i += 1) { value[i] = values[i - 1]; priority[i] = random(); size[i] = 1; low[i] = value[i]; root = merge(root, i); }
    // Selection sort with reversals: the smallest unplaced value is found by walking down the subtree minima.
    const ops = [];
    for (let target = 1; target <= n; target += 1) {
      let t = root, index = 0;
      while (true) {
        push(t);
        if (low[left[t]] === target) t = left[t];
        else if (value[t] === target) { index += size[left[t]] + 1; break; }
        else { index += size[left[t]] + 1; t = right[t]; }
      }
      if (index > 1) {
        ops.push([target, target + index - 1]);
        split(root, index);
        const front = cutLeft, rest = cutRight;
        flip[front] ^= 1;
        root = merge(front, rest);
      }
      split(root, 1);
      root = cutRight;
    }
    return ops;
  }
  function bookShopII(x, prices, pages, copies) {
    let dp = new Int32Array(x + 1), next = new Int32Array(x + 1);
    const queueIndex = new Int32Array(x + 1), queueValue = new Float64Array(x + 1);
    // Bounded knapsack: along each residue class of the price, a sliding-window maximum picks the best copy count.
    for (let b = 0; b < prices.length; b += 1) {
      const h = prices[b], s = pages[b], k = copies[b];
      for (let r = 0; r < h && r <= x; r += 1) {
        let head = 0, tail = 0;
        for (let j = 0, c = r; c <= x; j += 1, c += h) {
          const v = dp[c] - j * s;
          while (tail > head && queueValue[tail - 1] <= v) tail -= 1;
          queueIndex[tail] = j; queueValue[tail] = v; tail += 1;
          if (queueIndex[head] < j - k) head += 1;
          next[c] = queueValue[head] + j * s;
        }
      }
      const swap = dp; dp = next; next = swap;
    }
    return dp[x];
  }
  function gcdSubsets(values) {
    const m = 1000000007, n = values.length;
    const count = new Int32Array(n + 1);
    values.forEach((v) => { count[v] += 1; });
    const power = new Float64Array(n + 1);
    power[0] = 1;
    for (let i = 1; i <= n; i += 1) power[i] = (power[i - 1] * 2) % m;
    // Subsets of multiples of d have gcd a multiple of d; remove the ones whose gcd is a larger multiple.
    const exact = new Float64Array(n + 1);
    for (let d = n; d >= 1; d -= 1) {
      let multiples = 0;
      for (let e = d; e <= n; e += d) multiples += count[e];
      let ways = (power[multiples] - 1 + m) % m;
      for (let e = 2 * d; e <= n; e += d) ways = (ways - exact[e] + m) % m;
      exact[d] = ways;
    }
    return Array.from(exact.subarray(1));
  }
  function minimumCostPairs(values) {
    const sorted = values.slice().sort((p, q) => p - q), n = sorted.length;
    // Pairs join neighbours in sorted order, so choose k non-adjacent gaps; a chosen gap can later be undone by
    // taking its two neighbours instead, which costs left + right − itself.
    const cost = new Float64Array(n + 1), prev = new Int32Array(n + 1), next = new Int32Array(n + 1), gone = new Uint8Array(n + 1);
    cost[0] = Infinity; cost[n] = Infinity;
    for (let i = 1; i < n; i += 1) cost[i] = sorted[i] - sorted[i - 1];
    for (let i = 0; i <= n; i += 1) { prev[i] = i - 1; next[i] = i + 1; }
    const heap = [];
    for (let i = 1; i < n; i += 1) heapPush(heap, [cost[i], i]);
    const out = [];
    let total = 0;
    while (out.length < Math.floor(n / 2)) {
      const [c, i] = heapPop(heap).item;
      if (gone[i] || c !== cost[i]) continue;
      total += c;
      out.push(total);
      const l = prev[i], r = next[i];
      cost[i] = cost[l] + cost[r] - cost[i];
      gone[l] = 1; gone[r] = 1;
      prev[i] = prev[l]; next[i] = next[r];
      if (prev[i] >= 0) next[prev[i]] = i;
      if (next[i] <= n) prev[next[i]] = i;
      heapPush(heap, [cost[i], i]);
    }
    return out;
  }
  function sameSumSubsets(values) {
    const n = values.length, half = n >> 1, total = values.reduce((s, v) => s + v, 0);
    const sums = (list) => {
      const out = new Float64Array(1 << list.length);
      for (let mask = 1; mask < out.length; mask += 1) { const low = mask & -mask; out[mask] = out[mask ^ low] + list[31 - Math.clz32(low)]; }
      return out;
    };
    const L = sums(values.slice(0, half)), R = sums(values.slice(half));
    const Ls = Float64Array.from(L).sort(), Rs = Float64Array.from(R).sort();
    const atMost = (limit) => {
      let count = 0, j = Rs.length - 1;
      for (let i = 0; i < Ls.length; i += 1) { while (j >= 0 && Ls[i] + Rs[j] > limit) j -= 1; if (j < 0) break; count += j + 1; }
      return count;
    };
    // 2^n subsets but at most 2^n − 1 sums: halve the range, keeping the half with more subsets than values.
    let lo = 0, hi = total, below = 0;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2), inside = atMost(mid) - below;
      if (inside > mid - lo + 1) hi = mid; else { below += inside; lo = mid + 1; }
    }
    const lowerBound = (v) => { let a = 0, b = Rs.length; while (a < b) { const c = (a + b) >> 1; if (Rs[c] < v) a = c + 1; else b = c; } return a; };
    const pairs = [];
    for (let l = 0; l < L.length && pairs.length < 2; l += 1) {
      const need = lo - L[l], at = lowerBound(need);
      let matches = 0;
      while (at + matches < Rs.length && Rs[at + matches] === need && matches < 2) matches += 1;
      if (!matches) continue;
      for (let r = 0; r < R.length && matches > 0 && pairs.length < 2; r += 1) if (R[r] === need) { pairs.push([l, r]); matches -= 1; }
    }
    const members = ([l, r]) => { const out = new Set(); for (let i = 0; i < half; i += 1) if (l >> i & 1) out.add(i); for (let i = half; i < n; i += 1) if (r >> (i - half) & 1) out.add(i); return out; };
    const A = members(pairs[0]), B = members(pairs[1]);
    // Drop what the two subsets share; both stay non-empty because every value is positive.
    const onlyA = [], onlyB = [];
    for (let i = 0; i < n; i += 1) { if (A.has(i) && !B.has(i)) onlyA.push(values[i]); if (B.has(i) && !A.has(i)) onlyB.push(values[i]); }
    return [onlyA, onlyB];
  }
  function mexGridQueries(y, x) {
    // The mex grid is the xor table of the zero-based coordinates.
    return (y - 1) ^ (x - 1);
  }
  function maximumBuildingII(grid) {
    const n = grid.length, m = grid[0].length, W = m + 3;
    const heights = new Int32Array(m), leftLower = new Int32Array(m), stack = new Int32Array(m);
    // diff[H][w]: second differences over the width of the rectangles whose lowest column (the rightmost one) has height H.
    const diff = new Float64Array((n + 1) * W);
    for (let r = 0; r < n; r += 1) {
      for (let j = 0; j < m; j += 1) heights[j] = grid[r][j] === "." ? heights[j] + 1 : 0;
      let top = 0;
      for (let j = 0; j < m; j += 1) { while (top && heights[stack[top - 1]] >= heights[j]) top -= 1; leftLower[j] = top ? stack[top - 1] : -1; stack[top++] = j; }
      top = 0;
      for (let j = m - 1; j >= 0; j -= 1) {
        while (top && heights[stack[top - 1]] > heights[j]) top -= 1;
        const rightLower = top ? stack[top - 1] : m;
        stack[top++] = j;
        const H = heights[j];
        if (!H) continue;
        // Windows of width w containing j inside the span: a trapezoid 1, 2, …, min, …, min, …, 1.
        const a = j - leftLower[j], b = rightLower - j, base = H * W;
        diff[base + 1] += 1;
        diff[base + Math.min(a, b) + 1] -= 1;
        diff[base + Math.max(a, b) + 1] -= 1;
        diff[base + a + b + 1] += 1;
      }
    }
    const out = new Array(n), acc = new Float64Array(m + 1);
    for (let H = n; H >= 1; H -= 1) {
      let slope = 0, count = 0;
      const base = H * W;
      for (let w = 1; w <= m; w += 1) { slope += diff[base + w]; count += slope; acc[w] += count; }
      out[H - 1] = Array.from(acc.subarray(1));
    }
    return out;
  }
  function stickDivisions(x, lengths) {
    // Run the cuts backwards: joining the two shortest sticks each time is Huffman's merge.
    const heap = [];
    lengths.forEach((d) => heapPush(heap, [d]));
    let cost = 0;
    while (heap.length > 1) {
      const a = heapPop(heap).item[0], b = heapPop(heap).item[0];
      cost += a + b;
      heapPush(heap, [a + b]);
    }
    return cost;
  }
  function stickDifference(sticks, m) {
    const n = sticks.length, ceilDiv = (a, p) => Math.floor((a + p - 1) / p);
    // U[k]: the shortest possible longest piece after k cuts (always cut the stick with the longest pieces).
    const pieces = new Array(n).fill(1), longest = [];
    let heap = [];
    sticks.forEach((a, i) => heapPush(heap, [-a, i]));
    for (let k = 1; k <= m; k += 1) {
      const i = heapPop(heap).item[1];
      pieces[i] += 1;
      heapPush(heap, [-ceilDiv(sticks[i], pieces[i]), i]);
      longest.push(-heap[0][0]);
    }
    // T[k]: the longest possible shortest piece; the t-th largest value of ⌊a/q⌋ is the best minimum with t pieces.
    const minStick = sticks.reduce((low, a) => Math.min(low, a), Infinity), shortest = [], counts = new Array(n).fill(0);
    heap = [];
    sticks.forEach((a, i) => heapPush(heap, [-a, i]));
    for (let t = 1; t <= n + m; t += 1) {
      const [negative, i] = heapPop(heap).item;
      if (t > n) shortest.push(Math.min(-negative, minStick));
      counts[i] += 1;
      const next = Math.floor(sticks[i] / (counts[i] + 1));
      if (next >= 1) heapPush(heap, [-next, i]);
    }
    // Λ(U): the best shortest piece once every piece is at most U (fewest pieces per stick) — a staircase in U.
    let u = longest[m - 1];
    const starts = [], levels = [];
    heap = [];
    sticks.forEach((a, i) => heapPush(heap, [Math.floor(a / ceilDiv(a, u)), i]));
    const settle = () => {
      while (true) {
        const [stored, i] = heap[0], fresh = Math.floor(sticks[i] / ceilDiv(sticks[i], u));
        if (fresh === stored) return stored;
        heapPop(heap); heapPush(heap, [fresh, i]);
      }
    };
    while (true) {
      const level = settle();
      starts.push(u); levels.push(level);
      if (level >= shortest[0]) break;
      let nextU = u;
      while (heap[0][0] === level) {
        const i = heapPop(heap).item[1], p = ceilDiv(sticks[i], u), fresh = Math.floor(sticks[i] / p);
        if (fresh !== level) { heapPush(heap, [fresh, i]); continue; }
        // Its shortest piece first grows once it may use at most ⌊a / (level + 1)⌋ pieces.
        const fewer = Math.floor(sticks[i] / (level + 1));
        nextU = Math.max(nextU, ceilDiv(sticks[i], fewer));
        heapPush(heap, [Math.floor(sticks[i] / fewer), i]);
      }
      u = nextU;
    }
    // Range minimum of U − Λ(U) over the staircase starts.
    const count = starts.length, table = [starts.map((s, t) => s - levels[t])];
    for (let span = 1; 2 * span <= count; span *= 2) {
      const last = table[table.length - 1], row = [];
      for (let t = 0; t + 2 * span <= count; t += 1) row.push(Math.min(last[t], last[t + span]));
      table.push(row);
    }
    const rangeMin = (a, b) => { const j = 31 - Math.clz32(b - a + 1); return Math.min(table[j][a], table[j][b - (1 << j) + 1]); };
    const firstAtLeast = (target) => { let a = 0, b = count - 1; while (a < b) { const c = (a + b) >> 1; if (levels[c] >= target) b = c; else a = c + 1; } return a; };
    const lastStartAtMost = (value) => { let a = 0, b = count - 1; while (a < b) { const c = (a + b + 1) >> 1; if (starts[c] <= value) a = c; else b = c - 1; } return a; };
    const out = [];
    for (let k = 1; k <= m; k += 1) {
      const U = longest[k - 1], T = shortest[k - 1], cap = firstAtLeast(T);
      // Either pay U* against the full minimum T, or stop earlier on the staircase where Λ(U) < T.
      let best = Math.max(U, starts[cap]) - T;
      const at = lastStartAtMost(U);
      if (at < cap) {
        best = Math.min(best, U - levels[at]);
        if (at + 1 <= cap - 1) best = Math.min(best, rangeMin(at + 1, cap - 1));
      }
      out.push(best);
    }
    return out;
  }
  function codingCompany(skills, x) {
    const mod = 1000000007, t = skills.slice().sort((p, q) => p - q), n = t.length, width = x + 1;
    // dp[j][s]: ways with j teams still open and penalty s so far; an open team pays each gap between sorted skills.
    let dp = new Float64Array((n + 2) * width), next = new Float64Array((n + 2) * width);
    dp[0] = 1;
    for (let i = 0; i < n; i += 1) {
      const gap = i ? t[i] - t[i - 1] : 0;
      next.fill(0);
      for (let j = 0; j <= i; j += 1) {
        const add = j * gap;
        for (let s = 0; s + add <= x; s += 1) {
          const ways = dp[j * width + s];
          if (!ways) continue;
          const at = s + add;
          next[j * width + at] = (next[j * width + at] + ways * (j + 1)) % mod;
          next[(j + 1) * width + at] = (next[(j + 1) * width + at] + ways) % mod;
          if (j) next[(j - 1) * width + at] = (next[(j - 1) * width + at] + ways * j) % mod;
        }
      }
      const swap = dp; dp = next; next = swap;
    }
    let total = 0;
    for (let s = 0; s <= x; s += 1) total = (total + dp[s]) % mod;
    return total;
  }
  function twoStacksSorting(values) {
    const n = values.length, suffixMin = new Int32Array(n + 1), indexOf = new Int32Array(n + 1);
    suffixMin[n] = n + 1;
    for (let i = n - 1; i >= 0; i -= 1) suffixMin[i] = Math.min(values[i], suffixMin[i + 1]);
    values.forEach((v, i) => { indexOf[v] = i; });
    const parent = new Int32Array(n), parity = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) parent[i] = i;
    const find = (v) => {
      let root = v, flips = 0;
      while (parent[root] !== root) { flips ^= parity[root]; root = parent[root]; }
      while (parent[v] !== root) { const up = parent[v], p = parity[v]; parent[v] = root; parity[v] = flips; flips ^= p; v = up; }
      return root;
    };
    const unite = (a, b, differ) => {
      const ra = find(a), rb = find(b), pa = parity[a] * (a !== ra), pb = parity[b] * (b !== rb);
      if (ra === rb) return (pa ^ pb) === differ;
      parent[rb] = ra; parity[rb] = pa ^ pb ^ differ;
      return true;
    };
    // i < j clash when a later value is smaller than both and x_i < x_j: j must differ from every earlier value in
    // (suffix minimum, x_j), so those values share a stack. Linking neighbouring values keeps each merge cheap.
    const present = new Array(n + 1).fill(0), pairs = new Array(n + 1).fill(0), open = new Uint8Array(n + 1);
    let placed = 0;
    for (let j = 0; j < n; j += 1) {
      const lo = suffixMin[j + 1] + 1, hi = values[j] - 1;
      if (lo <= hi) {
        const before = fenwickPrefix(present, lo - 1), upTo = fenwickPrefix(present, hi);
        if (upTo > before) {
          const a = fenwickKth(present, before + 1), b = fenwickKth(present, upTo);
          for (let key = fenwickKth(pairs, fenwickPrefix(pairs, a - 1) + 1); key !== -1 && key < b; key = fenwickKth(pairs, fenwickPrefix(pairs, key) + 1)) {
            const successor = fenwickKth(present, fenwickPrefix(present, key) + 1);
            if (!unite(indexOf[key], indexOf[successor], 0)) return null;
            open[key] = 0; fenwickAdd(pairs, key, -1);
          }
          if (!unite(j, indexOf[a], 1)) return null;
        }
      }
      const v = values[j], rank = fenwickPrefix(present, v);
      const below = rank ? fenwickKth(present, rank) : 0, above = rank < placed ? fenwickKth(present, rank + 1) : 0;
      if (below && !open[below]) { open[below] = 1; fenwickAdd(pairs, below, 1); }
      if (above) { open[v] = 1; fenwickAdd(pairs, v, 1); }
      fenwickAdd(present, v, 1);
      placed += 1;
    }
    return values.map((v, i) => { const root = find(i); return 1 + (i === root ? 0 : parity[i]); });
  }

  // ------------------------------------------------------------------ brute forces (small inputs only)
  function bouncingBallStepsBrute(tests) {
    return tests.map(([n, m, k]) => {
      let r = 1, c = 1, dr = 1, dc = 1, changes = 0;
      for (let step = 0; step < Number(k); step += 1) {
        r += dr; c += dc;
        let turned = false;
        if (r === 1 || r === n) { dr = -dr; turned = true; }
        if (c === 1 || c === m) { dc = -dc; turned = true; }
        if (turned) changes += 1;
      }
      return [r, c, String(changes)];
    });
  }
  function bouncingBallCycleBrute(tests) {
    return tests.map(([n, m]) => {
      let r = 1, c = 1, dr = 1, dc = 1, steps = 0;
      const seen = new Set(["1,1"]);
      do {
        r += dr; c += dc; steps += 1;
        if (r === 1 || r === n) dr = -dr;
        if (c === 1 || c === m) dc = -dc;
        seen.add(r + "," + c);
      } while (r !== 1 || c !== 1);
      return [String(steps), String(seen.size)];
    });
  }
  function knightMovesQueriesBrute(queries) {
    const size = Math.max(...queries.flat()) + 12, dist = new Map([["1,1", 0]]), queue = [[1, 1]];
    const jumps = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    for (let h = 0; h < queue.length; h += 1) {
      const [x, y] = queue[h], d = dist.get(x + "," + y);
      for (const [dx, dy] of jumps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx > size || ny > size || dist.has(nx + "," + ny)) continue;
        dist.set(nx + "," + ny, d + 1);
        queue.push([nx, ny]);
      }
    }
    return queries.map(([x, y]) => dist.get(x + "," + y));
  }
  function kSubsetSumsIBrute(values, k) {
    const sums = [];
    for (let mask = 0; mask < 1 << values.length; mask += 1) { let s = 0; values.forEach((v, i) => { if (mask >> i & 1) s += v; }); sums.push(s); }
    return sums.sort((p, q) => p - q).slice(0, k);
  }
  function kSubsetSumsIIBrute(values, m, k) {
    const sums = [];
    for (let mask = 0; mask < 1 << values.length; mask += 1) {
      let s = 0, count = 0;
      values.forEach((v, i) => { if (mask >> i & 1) { s += v; count += 1; } });
      if (count === m) sums.push(s);
    }
    return sums.sort((p, q) => p - q).slice(0, k);
  }
  function increasingArrayIIBrute(values) {
    const levels = Array.from(new Set(values)).sort((p, q) => p - q);
    let best = levels.map(() => 0);
    values.forEach((x) => {
      let running = Infinity;
      best = levels.map((level, i) => { running = Math.min(running, best[i]); return running + Math.abs(x - level); });
    });
    return Math.min(...best);
  }
  function foodDivisionBrute(have, want) {
    const prefix = [];
    let run = 0;
    have.forEach((h, i) => { run += h - want[i]; prefix.push(run); });
    let best = Infinity;
    for (let c = Math.min(...prefix); c <= Math.max(...prefix); c += 1) best = Math.min(best, prefix.reduce((s, p) => s + Math.abs(p - c), 0));
    return String(best);
  }
  function swapRoundSortingBrute(values) {
    const n = values.length, goal = values.slice().sort((p, q) => p - q).join(",");
    const rounds = [];
    const build = (i, used, pairs) => {
      if (i === n) { rounds.push(pairs.slice()); return; }
      if (used >> i & 1) { build(i + 1, used, pairs); return; }
      build(i + 1, used | (1 << i), pairs);
      for (let j = i + 1; j < n; j += 1) if (!(used >> j & 1)) { pairs.push([i, j]); build(i + 1, used | (1 << i) | (1 << j), pairs); pairs.pop(); }
    };
    build(0, 0, []);
    const dist = new Map([[values.join(","), 0]]), queue = [values.slice()];
    for (let h = 0; h < queue.length; h += 1) {
      const key = queue[h].join(",");
      if (key === goal) return dist.get(key);
      for (const pairs of rounds) {
        const next = queue[h].slice();
        pairs.forEach(([i, j]) => { const t = next[i]; next[i] = next[j]; next[j] = t; });
        const nk = next.join(",");
        if (!dist.has(nk)) { dist.set(nk, dist.get(key) + 1); queue.push(next); }
      }
    }
    return -1;
  }
  function distinctSubsequences(s) {
    // Distinct non-empty subsequences, counted by the letter they end with.
    let end0 = 0, end1 = 0;
    for (const c of s) { if (c === "0") end0 = end0 + end1 + 1; else end1 = end0 + end1 + 1; }
    return end0 + end1;
  }
  function binarySubsequencesBrute(n) {
    for (let length = 1; ; length += 1) {
      for (let mask = 0; mask < 1 << length; mask += 1) {
        const s = mask.toString(2).padStart(length, "0");
        if (distinctSubsequences(s) === n) return s;
      }
    }
  }
  function componentSizes(n, wishes) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    wishes.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); });
    const seen = new Array(n + 1).fill(false), sizes = [];
    for (let s = 1; s <= n; s += 1) {
      if (seen[s]) continue;
      seen[s] = true;
      let count = 0;
      const stack = [s];
      while (stack.length) { const v = stack.pop(); count += 1; adjacency[v].forEach((u) => { if (!seen[u]) { seen[u] = true; stack.push(u); } }); }
      sizes.push(count);
    }
    return sizes;
  }
  function schoolExcursionBrute(n, wishes) {
    const sizes = componentSizes(n, wishes), possible = new Array(n + 1).fill(false);
    for (let mask = 0; mask < 1 << sizes.length; mask += 1) { let s = 0; sizes.forEach((z, i) => { if (mask >> i & 1) s += z; }); possible[s] = true; }
    return possible.slice(1).map((p) => (p ? "1" : "0")).join("");
  }
  function coinGridBrute(grid) {
    const n = grid.length;
    let best = Infinity;
    for (let mask = 0; mask < 1 << n; mask += 1) {
      let rows = 0;
      const columns = new Set();
      for (let r = 0; r < n; r += 1) { if (mask >> r & 1) { rows += 1; continue; } for (let c = 0; c < n; c += 1) if (grid[r][c] === "o") columns.add(c); }
      best = Math.min(best, rows + columns.size);
    }
    return { count: best, moves: null };
  }
  function gridColoringIIBrute(grid) {
    const n = grid.length, m = grid[0].length, out = grid.map((row) => row.split(""));
    const place = (cell) => {
      if (cell === n * m) return true;
      const r = Math.floor(cell / m), c = cell % m;
      for (const letter of "ABC") {
        if (letter === grid[r][c] || (c && out[r][c - 1] === letter) || (r && out[r - 1][c] === letter)) continue;
        out[r][c] = letter;
        if (place(cell + 1)) return true;
      }
      out[r][c] = grid[r][c];
      return false;
    };
    return place(0) ? out.map((row) => row.join("")) : null;
  }
  function programmersAndArtistsBrute(a, b, applicants) {
    let dp = new Map([["0,0", 0]]);
    applicants.forEach(([x, y]) => {
      const next = new Map(dp);
      dp.forEach((value, key) => {
        const [p, q] = key.split(",").map(Number);
        const offer = (k, v) => { if (!next.has(k) || next.get(k) < v) next.set(k, v); };
        if (p < a) offer((p + 1) + "," + q, value + x);
        if (q < b) offer(p + "," + (q + 1), value + y);
      });
      dp = next;
    });
    return dp.get(a + "," + b);
  }
  function removingDigitsIIBrute(n) {
    const limit = Number(n), steps = new Array(limit + 1).fill(0);
    for (let v = 1; v <= limit; v += 1) {
      let best = Infinity;
      for (const d of String(v)) if (d !== "0") best = Math.min(best, steps[v - Number(d)] + 1);
      steps[v] = best;
    }
    return String(steps[limit]);
  }
  function coinArrangementBrute(top, bottom) {
    const n = top.length, coins = [], cells = [];
    for (let c = 0; c < n; c += 1) { for (let t = 0; t < top[c]; t += 1) coins.push([0, c]); for (let t = 0; t < bottom[c]; t += 1) coins.push([1, c]); cells.push([0, c], [1, c]); }
    const best = new Array(1 << cells.length).fill(Infinity);
    best[0] = 0;
    for (let mask = 0; mask < best.length; mask += 1) {
      if (best[mask] === Infinity) continue;
      let used = 0;
      for (let t = mask; t; t &= t - 1) used += 1;
      if (used === coins.length) continue;
      const [r, c] = coins[used];
      cells.forEach(([rr, cc], i) => { if (!(mask >> i & 1)) { const next = mask | (1 << i), cost = best[mask] + Math.abs(r - rr) + Math.abs(c - cc); if (cost < best[next]) best[next] = cost; } });
    }
    return best[best.length - 1];
  }
  function replaceWithDifferenceBrute(values) {
    const memo = new Map();
    const reach = (list) => {
      if (list.length === 1) return list[0] === 0;
      const key = list.join(",");
      if (memo.has(key)) return memo.get(key);
      let ok = false;
      for (let i = 0; i < list.length && !ok; i += 1) for (let j = i + 1; j < list.length && !ok; j += 1) {
        const rest = list.filter((v, t) => t !== i && t !== j);
        rest.push(Math.abs(list[i] - list[j]));
        ok = reach(rest.sort((p, q) => p - q));
      }
      memo.set(key, ok);
      return ok;
    };
    return reach(values.slice().sort((p, q) => p - q)) ? [] : -1;
  }
  function gridPuzzleIBrute(rows, cols) {
    const n = rows.length;
    for (let mask = 0; mask < 1 << (n * n); mask += 1) {
      const grid = [];
      for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) row += mask >> (r * n + c) & 1 ? "X" : "."; grid.push(row); }
      if (grid.every((row, r) => row.split("X").length - 1 === rows[r]) && cols.every((want, c) => grid.filter((row) => row[c] === "X").length === want)) return grid;
    }
    return -1;
  }
  function gridPuzzleIIBrute(rows, cols, coins) {
    const n = rows.length;
    let best = -1;
    for (let mask = 0; mask < 1 << (n * n); mask += 1) {
      const grid = [];
      let total = 0;
      for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) { const on = mask >> (r * n + c) & 1; row += on ? "X" : "."; if (on) total += coins[r][c]; } grid.push(row); }
      if (grid.every((row, r) => row.split("X").length - 1 === rows[r]) && cols.every((want, c) => grid.filter((row) => row[c] === "X").length === want)) {
        if (best === -1 || total > best.coins) best = { coins: total, grid };
      }
    }
    return best;
  }
  function bitSubstringsBrute(s) {
    const out = new Array(s.length + 1).fill(0);
    for (let i = 0; i < s.length; i += 1) { let ones = 0; for (let j = i; j < s.length; j += 1) { if (s[j] === "1") ones += 1; out[ones] += 1; } }
    return out;
  }
  function bookShopIIBrute(x, prices, pages, copies) {
    let dp = new Array(x + 1).fill(0);
    prices.forEach((h, b) => {
      const next = dp.slice();
      for (let c = 0; c <= x; c += 1) for (let t = 1; t <= copies[b] && t * h <= c; t += 1) next[c] = Math.max(next[c], dp[c - t * h] + t * pages[b]);
      dp = next;
    });
    return dp[x];
  }
  function gcdSubsetsBrute(values) {
    const n = values.length, out = new Array(n).fill(0), gcd = (p, q) => (q ? gcd(q, p % q) : p);
    for (let mask = 1; mask < 1 << n; mask += 1) { let g = 0; values.forEach((v, i) => { if (mask >> i & 1) g = gcd(g, v); }); out[g - 1] += 1; }
    return out;
  }
  function minimumCostPairsBrute(values) {
    const n = values.length, best = new Array(Math.floor(n / 2) + 1).fill(Infinity);
    const search = (used, pairs, cost) => {
      if (cost < best[pairs]) best[pairs] = cost;
      let i = 0;
      while (i < n && used >> i & 1) i += 1;
      if (i === n) return;
      search(used | (1 << i), pairs, cost);
      for (let j = i + 1; j < n; j += 1) if (!(used >> j & 1)) search(used | (1 << i) | (1 << j), pairs + 1, cost + Math.abs(values[i] - values[j]));
    };
    search(0, 0, 0);
    return best.slice(1);
  }
  function mexGridQueriesBrute(y, x) {
    const grid = [];
    for (let r = 0; r < y; r += 1) {
      grid.push([]);
      for (let c = 0; c < x; c += 1) {
        const seen = new Set();
        for (let t = 0; t < c; t += 1) seen.add(grid[r][t]);
        for (let t = 0; t < r; t += 1) seen.add(grid[t][c]);
        let v = 0;
        while (seen.has(v)) v += 1;
        grid[r].push(v);
      }
    }
    return grid[y - 1][x - 1];
  }
  function maximumBuildingIIBrute(grid) {
    const n = grid.length, m = grid[0].length, out = [];
    for (let h = 1; h <= n; h += 1) {
      const row = [];
      for (let w = 1; w <= m; w += 1) {
        let count = 0;
        for (let r = 0; r + h <= n; r += 1) for (let c = 0; c + w <= m; c += 1) {
          let empty = true;
          for (let i = r; i < r + h && empty; i += 1) for (let j = c; j < c + w && empty; j += 1) if (grid[i][j] !== ".") empty = false;
          if (empty) count += 1;
        }
        row.push(count);
      }
      out.push(row);
    }
    return out;
  }
  function stickDivisionsBrute(x, lengths) {
    const n = lengths.length, total = [], memo = new Map();
    for (let mask = 0; mask < 1 << n; mask += 1) { let s = 0; lengths.forEach((d, i) => { if (mask >> i & 1) s += d; }); total.push(s); }
    const cost = (mask) => {
      if ((mask & (mask - 1)) === 0) return 0;
      if (memo.has(mask)) return memo.get(mask);
      let best = Infinity;
      for (let part = (mask - 1) & mask; part > 0; part = (part - 1) & mask) best = Math.min(best, cost(part) + cost(mask ^ part));
      memo.set(mask, best + total[mask]);
      return best + total[mask];
    };
    return cost((1 << n) - 1);
  }
  function stickDifferenceBrute(sticks, m) {
    const n = sticks.length, out = [];
    for (let k = 1; k <= m; k += 1) {
      let best = Infinity;
      const pieces = new Array(n).fill(1);
      const spread = (i, left) => {
        if (i === n - 1) {
          const p = pieces[i] + left;
          if (p > sticks[i]) return;
          pieces[i] = p;
          let high = 0, low = Infinity;
          sticks.forEach((a, t) => { high = Math.max(high, Math.ceil(a / pieces[t])); low = Math.min(low, Math.floor(a / pieces[t])); });
          best = Math.min(best, high - low);
          pieces[i] = 1;
          return;
        }
        for (let extra = 0; extra <= left && 1 + extra <= sticks[i]; extra += 1) { pieces[i] = 1 + extra; spread(i + 1, left - extra); }
        pieces[i] = 1;
      };
      spread(0, k);
      out.push(best);
    }
    return out;
  }
  function codingCompanyBrute(skills, x) {
    const n = skills.length, team = new Array(n).fill(0);
    let ways = 0;
    const place = (i, teams) => {
      if (i === n) {
        let penalty = 0;
        for (let t = 0; t < teams; t += 1) { const members = skills.filter((s, j) => team[j] === t); penalty += Math.max(...members) - Math.min(...members); }
        if (penalty <= x) ways += 1;
        return;
      }
      for (let t = 0; t <= teams; t += 1) { team[i] = t; place(i + 1, Math.max(teams, t + 1)); }
    };
    place(0, 0);
    return ways;
  }
  function stacksSort(values, stacks) {
    const piles = [[], []];
    let next = 1;
    for (let i = 0; i < values.length; i += 1) {
      piles[stacks[i] - 1].push(values[i]);
      let moved = true;
      while (moved) {
        moved = false;
        for (const pile of piles) if (pile.length && pile[pile.length - 1] === next) { pile.pop(); next += 1; moved = true; }
      }
    }
    return next === values.length + 1;
  }
  function twoStacksSortingBrute(values) {
    const n = values.length;
    for (let mask = 0; mask < 1 << n; mask += 1) {
      const stacks = values.map((v, i) => 1 + (mask >> i & 1));
      if (stacksSort(values, stacks)) return stacks;
    }
    return null;
  }

  // ------------------------------------------------------------------ validators (answers with more than one correct form)
  function viaBrute(accept, brute) { return (args, out) => accept(args, out, brute.apply(null, JSON.parse(JSON.stringify(args)))) === true; }
  function swapRoundSortingAccept(args, actual, expected) {
    const values = args[0].slice(), n = values.length, need = typeof expected === "number" ? expected : expected.length;
    if (!Array.isArray(actual)) return "Return a list of rounds.";
    if (actual.length !== need) return "The fewest rounds is " + need + ", not " + actual.length + ".";
    for (let r = 0; r < actual.length; r += 1) {
      const used = new Set();
      if (!Array.isArray(actual[r]) || !actual[r].length) return "Round " + (r + 1) + " must list at least one swap.";
      for (const pair of actual[r]) {
        if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((i) => Number.isInteger(i) && i >= 1 && i <= n) || pair[0] === pair[1]) return "Round " + (r + 1) + " has a bad pair " + JSON.stringify(pair) + ".";
        if (used.has(pair[0]) || used.has(pair[1])) return "Round " + (r + 1) + " uses an index twice.";
        used.add(pair[0]); used.add(pair[1]);
      }
      actual[r].forEach(([i, j]) => { const t = values[i - 1]; values[i - 1] = values[j - 1]; values[j - 1] = t; });
    }
    return values.every((v, i) => v === i + 1) ? true : "After the rounds the array is " + JSON.stringify(values.slice(0, 12)) + ", not sorted.";
  }
  function binarySubsequencesAccept(args, actual, expected) {
    if (typeof actual !== "string" || !/^[01]+$/.test(actual)) return "Return a bit string.";
    if (actual.length !== expected.length) return "The shortest such string has length " + expected.length + ", not " + actual.length + ".";
    const count = distinctSubsequences(actual);
    return count === args[0] ? true : actual + " has " + count + " distinct subsequences, not " + args[0] + ".";
  }
  function coinGridAccept(args, actual, expected) {
    const grid = args[0], n = grid.length;
    if (!actual || !Array.isArray(actual.moves)) return "Return { count, moves }.";
    if (actual.count !== expected.count) return "The fewest moves is " + expected.count + ", not " + actual.count + ".";
    if (actual.moves.length !== actual.count) return "List exactly count moves.";
    const rows = new Set(), cols = new Set();
    for (const move of actual.moves) {
      if (!Array.isArray(move) || (move[0] !== 1 && move[0] !== 2) || !Number.isInteger(move[1]) || move[1] < 1 || move[1] > n) return "Bad move " + JSON.stringify(move) + ".";
      (move[0] === 1 ? rows : cols).add(move[1]);
    }
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (grid[r][c] === "o" && !rows.has(r + 1) && !cols.has(c + 1)) return "The coin at row " + (r + 1) + ", column " + (c + 1) + " is never removed.";
    return true;
  }
  function gridColoringIIAccept(args, actual, expected) {
    const grid = args[0], n = grid.length, m = grid[0].length;
    if (expected === null) return actual === null ? true : "No coloring exists here; return null.";
    if (actual === null) return "A coloring exists; null is wrong here.";
    if (!Array.isArray(actual) || actual.length !== n || !actual.every((row) => typeof row === "string" && row.length === m && /^[ABC]+$/.test(row))) return "Return n strings of m letters A, B or C.";
    for (let r = 0; r < n; r += 1) for (let c = 0; c < m; c += 1) {
      if (actual[r][c] === grid[r][c]) return "The cell at row " + (r + 1) + ", column " + (c + 1) + " keeps its letter.";
      if (c + 1 < m && actual[r][c] === actual[r][c + 1]) return "Row " + (r + 1) + " has equal neighbours at columns " + (c + 1) + " and " + (c + 2) + ".";
      if (r + 1 < n && actual[r][c] === actual[r + 1][c]) return "Column " + (c + 1) + " has equal neighbours at rows " + (r + 1) + " and " + (r + 2) + ".";
    }
    return true;
  }
  function replaceWithDifferenceAccept(args, actual, expected) {
    const values = args[0];
    if (expected === -1) return actual === -1 ? true : "The last number can never be 0 here; return −1.";
    if (actual === -1) return "Reaching 0 is possible; −1 is wrong here.";
    if (!Array.isArray(actual) || actual.length !== values.length - 1) return "Return exactly n − 1 operations.";
    const count = new Map();
    values.forEach((v) => count.set(v, (count.get(v) || 0) + 1));
    for (let i = 0; i < actual.length; i += 1) {
      const pair = actual[i];
      if (!Array.isArray(pair) || pair.length !== 2) return "Operation " + (i + 1) + " must be a pair [a, b].";
      const [a, b] = pair;
      if (!(count.get(a) > 0)) return "Operation " + (i + 1) + " takes " + a + ", which is not in the array.";
      count.set(a, count.get(a) - 1);
      if (!(count.get(b) > 0)) { count.set(a, count.get(a) + 1); return "Operation " + (i + 1) + " takes " + b + ", which is not in the array."; }
      count.set(b, count.get(b) - 1);
      const d = Math.abs(a - b);
      count.set(d, (count.get(d) || 0) + 1);
    }
    const last = Array.from(count.entries()).find(([, c]) => c > 0);
    return last && last[0] === 0 ? true : "The last number is " + (last ? last[0] : "missing") + ", not 0.";
  }
  function gridPuzzleCounts(rows, cols, grid) {
    const n = rows.length;
    if (!Array.isArray(grid) || grid.length !== n || !grid.every((row) => typeof row === "string" && row.length === n && /^[X.]*$/.test(row))) return "Return n strings of X and . characters.";
    for (let r = 0; r < n; r += 1) { const got = grid[r].split("X").length - 1; if (got !== rows[r]) return "Row " + (r + 1) + " has " + got + " squares, not " + rows[r] + "."; }
    for (let c = 0; c < n; c += 1) { const got = grid.filter((row) => row[c] === "X").length; if (got !== cols[c]) return "Column " + (c + 1) + " has " + got + " squares, not " + cols[c] + "."; }
    return true;
  }
  function gridPuzzleIAccept(args, actual, expected) {
    if (expected === -1) return actual === -1 ? true : "No grid meets these counts; return −1.";
    if (actual === -1) return "A grid exists; −1 is wrong here.";
    return gridPuzzleCounts(args[0], args[1], actual);
  }
  function gridPuzzleIIAccept(args, actual, expected) {
    const [rows, cols, coins] = args;
    if (expected === -1) return actual === -1 ? true : "No grid meets these counts; return −1.";
    if (actual === -1 || !actual || typeof actual !== "object") return "Return { coins, grid }.";
    const shape = gridPuzzleCounts(rows, cols, actual.grid);
    if (shape !== true) return shape;
    let total = 0;
    actual.grid.forEach((row, r) => { for (let c = 0; c < row.length; c += 1) if (row[c] === "X") total += coins[r][c]; });
    if (total !== actual.coins) return "The chosen squares hold " + total + " coins, not " + actual.coins + ".";
    return total === expected.coins ? true : "That choice collects " + total + " coins, but " + expected.coins + " is possible.";
  }
  function applyReversals(values, ops) {
    // An implicit treap with lazy flips, so long reversals cost O(log n) each.
    const n = values.length, left = new Int32Array(n + 1), right = new Int32Array(n + 1), size = new Int32Array(n + 1), flip = new Uint8Array(n + 1), priority = new Float64Array(n + 1);
    const next = rng(99);
    const push = (t) => { if (flip[t]) { const l = left[t]; left[t] = right[t]; right[t] = l; flip[left[t]] ^= 1; flip[right[t]] ^= 1; flip[t] = 0; flip[0] = 0; } };
    const pull = (t) => { size[t] = 1 + size[left[t]] + size[right[t]]; };
    const merge = (a, b) => { if (!a || !b) return a || b; if (priority[a] > priority[b]) { push(a); right[a] = merge(right[a], b); pull(a); return a; } push(b); left[b] = merge(a, left[b]); pull(b); return b; };
    const split = (t, k) => { if (!t) return [0, 0]; push(t); if (size[left[t]] >= k) { const [a, b] = split(left[t], k); left[t] = b; pull(t); return [a, t]; } const [a, b] = split(right[t], k - size[left[t]] - 1); right[t] = a; pull(t); return [t, b]; };
    let root = 0;
    for (let i = 1; i <= n; i += 1) { priority[i] = next(); size[i] = 1; root = merge(root, i); }
    ops.forEach(([a, b]) => { const [x, rest] = split(root, a - 1), [y, z] = split(rest, b - a + 1); flip[y] ^= 1; root = merge(merge(x, y), z); });
    const out = [], stack = [];
    let t = root;
    while (t || stack.length) { while (t) { push(t); stack.push(t); t = left[t]; } t = stack.pop(); out.push(values[t - 1]); t = right[t]; }
    return out;
  }
  function reversalSortingAccept(args, actual) {
    const values = args[0], n = values.length;
    if (!Array.isArray(actual) || actual.length > n) return "Return at most n reversals.";
    for (const op of actual) if (!Array.isArray(op) || op.length !== 2 || !Number.isInteger(op[0]) || !Number.isInteger(op[1]) || op[0] < 1 || op[0] > op[1] || op[1] > n) return "Bad reversal " + JSON.stringify(op) + ".";
    const result = applyReversals(values, actual);
    return result.every((v, i) => v === i + 1) ? true : "After the reversals the array is " + JSON.stringify(result.slice(0, 12)) + (n > 12 ? "…" : "") + ", not sorted.";
  }
  function sameSumSubsetsAccept(args, actual) {
    const values = args[0];
    if (!Array.isArray(actual) || actual.length !== 2 || !actual.every((part) => Array.isArray(part) && part.length > 0)) return "Return two non-empty subsets.";
    const left = new Map();
    values.forEach((v) => left.set(v, (left.get(v) || 0) + 1));
    for (const v of actual[0].concat(actual[1])) {
      if (!(left.get(v) > 0)) return v + " is not available: the subsets must use distinct elements of the set.";
      left.set(v, left.get(v) - 1);
    }
    const a = actual[0].reduce((s, v) => s + v, 0), b = actual[1].reduce((s, v) => s + v, 0);
    return a === b ? true : "The sums differ: " + a + " and " + b + ".";
  }
  function twoStacksSortingAccept(args, actual, expected) {
    const values = args[0];
    if (expected === null) return actual === null ? true : "These numbers cannot be sorted with two stacks; return null.";
    if (actual === null) return "A solution exists; null is wrong here.";
    if (!Array.isArray(actual) || actual.length !== values.length || !actual.every((s) => s === 1 || s === 2)) return "Return a 1 or 2 for every number.";
    return stacksSort(values, actual) ? true : "With these stacks the output cannot come out sorted.";
  }

  // ------------------------------------------------------------------ input builders
  function smallList(seed, n, lo, hi) { return randomInts(seed, n, lo, hi); }
  function ballTests(seed, count, maxSide, maxSteps) {
    const next = rng(seed), out = [];
    for (let i = 0; i < count; i += 1) out.push([2 + Math.floor(next() * (maxSide - 1)), 2 + Math.floor(next() * (maxSide - 1)), String(Math.floor(next() * (maxSteps + 1)))]);
    return out;
  }
  function bigBallTests(seed, count) {
    const next = rng(seed), out = [];
    for (let i = 0; i < count; i += 1) {
      const n = 2 + Math.floor(next() * 999999999), m = 2 + Math.floor(next() * 999999999);
      let k = "";
      for (let d = 0; d < 18; d += 1) k += Math.floor(next() * 10);
      out.push([n, m, String(BigInt(k))]);
    }
    return out;
  }
  function gridPairs(seed, count, lo, hi) {
    const next = rng(seed), out = [];
    for (let i = 0; i < count; i += 1) out.push([lo + Math.floor(next() * (hi - lo + 1)), lo + Math.floor(next() * (hi - lo + 1))]);
    return out;
  }
  function signedList(seed, n, span) { return randomInts(seed, n, -span, span); }
  function randomWishes(seed, n, m) { const next = rng(seed), out = []; for (let i = 0; i < m; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]); return out; }
  function charGrid(seed, n, m, letters, weights) {
    const next = rng(seed), out = [];
    for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < m; c += 1) { let x = next(), t = 0; while (weights && t < letters.length - 1 && x > weights[t]) { x -= weights[t]; t += 1; } row += weights ? letters[t] : letters[Math.floor(next() * letters.length)]; } out.push(row); }
    return out;
  }
  function coinSpread(seed, n) {
    // 2n coins dropped into a 2 × n grid.
    const next = rng(seed), top = new Array(n).fill(0), bottom = new Array(n).fill(0);
    for (let i = 0; i < 2 * n; i += 1) (next() < 0.5 ? top : bottom)[Math.floor(next() * n)] += 1;
    return [top, bottom];
  }
  function puzzleCounts(seed, n, feasible) {
    // Row and column counts read off a random grid (feasible), or random rows with columns of the same total (often not).
    const next = rng(seed), rows = new Array(n).fill(0), cols = new Array(n).fill(0);
    if (feasible) {
      for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (next() < 0.45) { rows[r] += 1; cols[c] += 1; }
      return [rows, cols];
    }
    let total = 0;
    for (let r = 0; r < n; r += 1) { rows[r] = Math.floor(next() * (n + 1)); total += rows[r]; }
    while (total > 0) { const c = Math.floor(next() * n); if (cols[c] < n) { cols[c] += 1; total -= 1; } }
    return [rows, cols];
  }
  function coinTable(seed, n, top) { const next = rng(seed), out = []; for (let r = 0; r < n; r += 1) { const row = []; for (let c = 0; c < n; c += 1) row.push(Math.floor(next() * (top + 1))); out.push(row); } return out; }
  function bitString(seed, n, density) { const next = rng(seed); let s = ""; for (let i = 0; i < n; i += 1) s += next() < (density === undefined ? 0.5 : density) ? "1" : "0"; return s; }
  function distinctSet(seed, n) {
    // Distinct positive values whose total stays at most 2^n − 2 (resampled until it does).
    const next = rng(seed), limit = Math.pow(2, n) - 2, cap = Math.max(n, Math.floor(limit / n));
    while (true) {
      const seen = new Set(), out = [];
      let total = 0;
      while (out.length < n) { const v = 1 + Math.floor(next() * cap); if (!seen.has(v)) { seen.add(v); out.push(v); total += v; } }
      if (total <= limit) return out;
    }
  }
  function sortableByTwoStacks(seed, n) {
    // Run the sorting backwards from the sorted output: un-pop the largest value onto a stack, or un-push a top to the input front.
    const next = rng(seed), stacks = [[], []], input = [];
    let largest = n;
    while (input.length < n) {
      const canUnpop = largest >= 1, tops = [0, 1].filter((t) => stacks[t].length);
      if (canUnpop && (!tops.length || next() < 0.5)) stacks[next() < 0.5 ? 0 : 1].push(largest--);
      else input.push(stacks[tops[Math.floor(next() * tops.length)]].pop());
    }
    return input.reverse();
  }
  function colorableGrid(seed, n, m) {
    // A random proper colouring, then every original letter differs from it, so a recolouring always exists.
    const next = rng(seed), final = [], out = [];
    for (let r = 0; r < n; r += 1) {
      final.push([]);
      let row = "";
      for (let c = 0; c < m; c += 1) {
        const allowed = "ABC".split("").filter((x) => (c === 0 || final[r][c - 1] !== x) && (r === 0 || final[r - 1][c] !== x));
        final[r].push(allowed[Math.floor(next() * allowed.length)]);
        const others = "ABC".split("").filter((x) => x !== final[r][c]);
        row += others[Math.floor(next() * 2)];
      }
      out.push(row);
    }
    return out;
  }
  function forest(seed, n, m, trees) { const next = rng(seed), out = []; for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < m; c += 1) row += next() < trees ? "*" : "."; out.push(row); } return out; }
  function variant(id, message, fn, edits) {
    let source = fn.toString();
    edits.forEach(([from, to, all]) => {
      if (source.indexOf(from) < 0) throw new Error("variant " + id + " cannot find: " + from);
      source = all ? source.split(from).join(to) : source.replace(from, () => to);
    });
    return Object.freeze({ id, message, source });
  }
  function site(label, url) { return Object.freeze({ label, url }); }
  const CP = "https://cp-algorithms.com/";

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const BALL_TESTS = lazy(() => bigBallTests(1701, 1000));
  const BALL_GRIDS = lazy(() => gridPairs(1702, 1000, 2, 1000000000));
  const KNIGHT_QUERIES = lazy(() => gridPairs(1703, 100000, 1, 1000000000));
  const SIGNED_BIG = lazy(() => signedList(1704, 200000, 1000000000));
  const INCREASING_BIG = lazy(() => smallList(1705, 200000, 1, 1000000000));
  const FOOD_BIG = lazy(() => { const have = smallList(1706, 200000, 0, 1000000); return [have, have.slice().reverse()]; });
  const FOOD_TENT = lazy(() => { const have = [], want = []; for (let i = 0; i < 200000; i += 1) { have.push(i < 100000 ? 1000000 : 0); want.push(i < 100000 ? 0 : 1000000); } return [have, want]; });
  const SWAP_BIG = lazy(() => randomPermutation(1707, 200000));
  const SCHOOL_BIG = lazy(() => randomWishes(1708, 100000, 50000));
  const COIN_GRID_BIG = lazy(() => charGrid(1709, 100, 100, ".o", [0.9, 0.1]));
  const COLOR_BIG = lazy(() => colorableGrid(1710, 500, 500));
  const COLOR_RANDOM = lazy(() => charGrid(1711, 500, 500, "ABC"));
  const PEOPLE_BIG = lazy(() => gridPairs(1712, 200000, 1, 1000000000));
  const COIN_ROWS_BIG = lazy(() => coinSpread(1713, 100000));
  const REPLACE_BIG = lazy(() => { const values = smallList(1714, 1000, 1, 1000); if (values.reduce((t, v) => t + v, 0) % 2) values[0] = values[0] === 1000 ? 999 : values[0] + 1; return values; });
  const REPLACE_NO = lazy(() => [1000].concat(new Array(998).fill(1)));
  const PUZZLE_I_BIG = lazy(() => puzzleCounts(1715, 50, true));
  const PUZZLE_I_NO = lazy(() => puzzleCounts(1716, 50, false));
  const PUZZLE_II_BIG = lazy(() => { const [rows, cols] = puzzleCounts(1717, 50, true); return [rows, cols, coinTable(1718, 50, 1000)]; });
  const BITS_BIG = lazy(() => bitString(1719, 200000));
  const REVERSAL_BIG = lazy(() => randomPermutation(1720, 200000));
  const BOOK_BIG = lazy(() => [100000, smallList(1721, 100, 1, 1000), smallList(1722, 100, 1, 1000), smallList(1723, 100, 1, 1000)]);
  const GCD_BIG = lazy(() => smallList(1724, 200000, 1, 200000));
  const PAIRS_BIG = lazy(() => smallList(1725, 200000, 1, 1000000000));
  const SAME_BIG = lazy(() => distinctSet(1726, 40));
  const FOREST_BIG = lazy(() => forest(1727, 1000, 1000, 0.05));
  const CUTS_BIG = lazy(() => smallList(1728, 200000, 1, 5000));
  const STICKS_BIG = lazy(() => smallList(1729, 100000, 1, 1000000000));
  const CODERS_BIG = lazy(() => smallList(1730, 100, 0, 100));
  const STACKS_BIG = lazy(() => sortableByTwoStacks(1731, 200000));
  const STACKS_NO = lazy(() => randomPermutation(1732, 200000));

  const ADDITIONAL_II = [
    {
      id: "bouncing-ball-steps", title: "Bouncing Ball Steps", cses: { id: 3215, name: "Bouncing Ball Steps" },
      goal: "For each test [n, m, k], where the ball is after k steps and how often it has turned: [row, column, turns]. k (up to 10¹⁸) and the turn count are decimal strings.",
      concept: "The row and the column bounce independently. The row walks 1 → n → 1 again with period 2(n − 1), so its position is a triangle wave of k mod 2(n − 1), and likewise for the column. The ball turns whenever either coordinate touches a border, which happens at every multiple of n − 1 or of m − 1. By inclusion–exclusion that is k/(n − 1) + k/(m − 1) − k/lcm, since a corner is one turn. BigInt keeps k exact.",
      functionName: "bouncingBallSteps", signature: "bouncingBallSteps(tests) → [row, column, turns]",
      starterSource: starter("bouncingBallSteps", "tests", "Per axis: r = k mod 2(n − 1), position 1 + min(r, 2(n − 1) − r). Turns: ⌊k/(n−1)⌋ + ⌊k/(m−1)⌋ − ⌊k/lcm(n−1, m−1)⌋, in BigInt."),
      solve: bouncingBallSteps, comparator: "deep", brute: bouncingBallStepsBrute, small: (round) => [ballTests(17000 + round, 4, 7, 60)],
      reference: book("21.1", "Primes and factors · least common multiple"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "n (rounded)", value: 3, min: 2, max: 12 },
        { id: "m", type: "slider", label: "m (rounded)", value: 4, min: 2, max: 12 },
        { id: "k", type: "slider", label: "k (rounded)", value: 4, min: 0, max: 60 },
      ], args: [{ fixture: "ballTest" }] },
      diagnoses: [
        variant("corners-count-twice", "In a corner both coordinates bounce at once, but the ball turns only once: subtract the multiples of the lcm.", bouncingBallSteps, [["const changes = steps / p + steps / q - steps / (p / gcd(p, q) * q);", "const changes = steps / p + steps / q;"]]),
        variant("wraps-around", "The ball bounces back from the border instead of reappearing at row 1: the position is a triangle wave with period 2(n − 1).", bouncingBallSteps, [["const fold = (half) => { const r = steps % (2n * half); return Number(r <= half ? r : 2n * half - r) + 1; };", "const fold = (half) => Number(steps % (half + 1n)) + 1;"]]),
      ],
      hints: ["Treat the row and the column separately; each moves one cell per step.", "Row after k steps: r = k mod 2(n − 1), then 1 + min(r, 2(n − 1) − r).", "Turns: multiples of n − 1 or m − 1 up to k, counting common multiples once."],
      cases: [
        example([[[3, 4, "0"], [3, 4, "1"], [3, 4, "2"], [3, 4, "3"], [3, 4, "4"], [42, 1337, "123456789"]]], [[1, 1, "0"], [2, 2, "0"], [3, 3, "1"], [2, 4, "2"], [1, 3, "3"], [34, 300, "3101295"]], "CSES sample"),
        run(bouncingBallSteps, [[[3, 3, "4"], [2, 2, "5"], [4, 7, "12"]]], "corners"),
        run(bouncingBallSteps, [ballTests(17100, 6, 9, 100)], "six small grids"),
        hidden("t = 1000, n, m up to 10⁹, k up to 10¹⁸, time limit", () => [BALL_TESTS()]),
      ],
    },
    {
      id: "bouncing-ball-cycle", title: "Bouncing Ball Cycle", cses: { id: 3216, name: "Bouncing Ball Cycle" },
      goal: "For each test [n, m], the steps until the ball is back in the top-left corner and the number of distinct cells it visits on the way, both as decimal strings.",
      concept: "The row returns to 1 every 2(n − 1) steps and the column every 2(m − 1), so the cycle is lcm(2(n − 1), 2(m − 1)) = 2·lcm(n − 1, m − 1). For the cells, fold each coordinate modulo 2g, where g = gcd(n − 1, m − 1): by the Chinese remainder theorem, cell (x, y) (counting from 0) is on the path exactly when x ≡ ±y (mod 2g). Interior residues occur (n − 1)/g times along a row, and the two border residues alternate. So the count is (g − 1)·P·Q plus the two border-residue products, where P = (n − 1)/g and Q = (m − 1)/g.",
      functionName: "bouncingBallCycle", signature: "bouncingBallCycle(tests) → [steps, cells]",
      starterSource: starter("bouncingBallCycle", "tests", "p = n − 1, q = m − 1, g = gcd, P = p/g, Q = q/g. Steps 2·P·q; cells (g − 1)PQ + (⌊P/2⌋ + 1)(⌊Q/2⌋ + 1) + ⌈P/2⌉⌈Q/2⌉, in BigInt."),
      solve: bouncingBallCycle, comparator: "deep", brute: bouncingBallCycleBrute, small: (round) => [gridPairs(17200 + round, 4, 2, 14)],
      reference: book("21.1", "Primes and factors · least common multiple"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "n (rounded)", value: 3, min: 2, max: 20 },
        { id: "m", type: "slider", label: "m (rounded)", value: 4, min: 2, max: 20 },
      ], args: [{ fixture: "ballGrid" }] },
      diagnoses: [
        variant("lcm-not-doubled", "Each coordinate needs a full round trip, 2(n − 1) steps, before it is back at 1: the cycle is 2·lcm(n − 1, m − 1).", bouncingBallCycle, [["const steps = 2n * BigInt(P) * BigInt(q);", "const steps = BigInt(P) * BigInt(q);"]]),
        variant("counts-steps-as-cells", "The ball revisits cells: a diagonal crossing uses the same cell twice, so the cells are fewer than the steps.", bouncingBallCycle, [["return [steps.toString(), cells.toString()];", "return [steps.toString(), steps.toString()];"]]),
      ],
      hints: ["Steps: the row repeats every 2(n − 1), the column every 2(m − 1); take the lcm.", "With g = gcd(n − 1, m − 1), cell (x, y) is visited iff x ≡ y or x ≡ −y (mod 2g).", "Count pairs by the folded residue min(r, 2g − r): interior residues P·Q times each, the residues 0 and g from alternating borders."],
      cases: [
        example([[[3, 4], [2, 2], [19, 18], [42, 1337]]], [["12", "6"], ["2", "2"], ["612", "171"], ["109552", "28077"]], "CSES sample"),
        run(bouncingBallCycle, [[[5, 5], [7, 4], [9, 13]]], "common factors"),
        run(bouncingBallCycle, [gridPairs(17300, 6, 2, 30)], "six small grids"),
        hidden("t = 1000, n, m up to 10⁹, time limit", () => [BALL_GRIDS()]),
      ],
    },
    {
      id: "knight-moves-queries", title: "Knight Moves Queries", cses: { id: 3218, name: "Knight Moves Queries" },
      goal: "For each start [x, y], the fewest knight moves to the top-left corner (1, 1) of a board that is infinite to the right and down.",
      concept: "Far from the corner the knight distance has a closed form. With dx ≥ dy the offsets from the corner and δ = dx − dy, it is δ − 2⌊(δ − dy)/3⌋ when dy > δ and δ − 2⌊(δ − dy)/4⌋ otherwise, which is the lower bound max(⌈dx/2⌉, ⌈(dx + dy)/3⌉) with the colour parity fixed. A few squares near the corner are exceptions: (1, 0) needs 3 and (2, 2) needs 4, and on this board (1, 1) also needs 4, because the two-move route passes over the edge.",
      functionName: "knightMovesQueries", signature: "knightMovesQueries(queries) → moves",
      starterSource: starter("knightMovesQueries", "queries", "dx ≥ dy offsets from (1, 1); special cases (1,0) → 3, (2,2) → 4, (1,1) → 4; then the δ formula."),
      solve: knightMovesQueries, comparator: "deep", brute: knightMovesQueriesBrute, small: (round) => [gridPairs(17400 + round, 20, 1, 24)],
      reference: book("1.4", "Working with numbers · finding a formula"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "x", type: "slider", label: "x (rounded)", value: 4, min: 1, max: 30 },
        { id: "y", type: "slider", label: "y (rounded)", value: 1, min: 1, max: 30 },
      ], args: [{ fixture: "pointQuery" }] },
      diagnoses: [
        variant("misses-the-corner-square", "Next to the corner the usual two-move route to (2, 2) jumps off the board; on this board it needs four moves.", knightMovesQueries, [["if (dx === 1 && dy === 1) return 4;", ""]]),
        diagnosis("lower-bound-only", "max(⌈dx/2⌉, ⌈(dx + dy)/3⌉) is only a lower bound: every move flips the square's colour, so the count must also have the right parity.", function knightMovesQueries(queries) { return queries.map(([x, y]) => { const dx = Math.max(x, y) - 1, dy = Math.min(x, y) - 1; return Math.max(Math.ceil(dx / 2), Math.ceil((dx + dy) / 3)); }); }),
      ],
      hints: ["Work with dx = x − 1, dy = y − 1 and swap so dx ≥ dy.", "Handle (1, 0), (1, 1) and (2, 2) separately.", "δ = dx − dy; if dy > δ answer δ − 2⌊(δ − dy)/3⌋, else δ − 2⌊(δ − dy)/4⌋ (floor division)."],
      cases: [
        example([[[1, 1], [2, 3], [4, 1], [42, 1337]]], [0, 1, 3, 669], "CSES sample"),
        example([[[2, 2], [2, 1], [3, 3]]], [4, 3, 4], "the squares next to the corner"),
        run(knightMovesQueries, [gridPairs(17500, 12, 1, 40)], "twelve starts"),
        hidden("n = 10⁵, coordinates up to 10⁹, time limit", () => [KNIGHT_QUERIES()]),
      ],
    },
    {
      id: "k-subset-sums-i", title: "K Subset Sums I", cses: { id: 3108, name: "K Subset Sums I" },
      goal: "The k smallest sums over all 2ⁿ subsets (the empty subset included), in increasing order.",
      concept: "The smallest sum takes every negative value. Relative to it, each subset adds absolute values: take a positive value, or drop a negative one. So sort the absolute values and grow subsets from a min-heap. A subset whose largest index is i spawns two children: add value i + 1, or swap value i for value i + 1. Every subset has exactly one parent and children never get smaller, so popping k times yields the k smallest.",
      functionName: "kSubsetSumsI", signature: "kSubsetSumsI(values, k) → sums",
      starterSource: starter("kSubsetSumsI", "values, k", "base = sum of negatives; sort |values|; heap of [sum, lastIndex] starting at base + b[0]; each pop pushes add-next and swap-for-next."),
      solve: kSubsetSumsI, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: kSubsetSumsIBrute, small: (round) => { const n = 1 + (round % 9); return [signedList(17600 + round, n, 6), 1 + (round % (1 << n))]; },
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [1, 6, 3, -3], b: 9 }, "all positive": { a: [2, 3, 5], b: 8 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("keeps-the-signs", "The heap only works when every step adds a non-negative amount: start from the sum of the negatives and use absolute values.", kSubsetSumsI, [["const steps = values.map((v) => { if (v < 0) base += v; return Math.abs(v); }).sort((p, q) => p - q);", "const steps = values.slice().sort((p, q) => p - q);"]]),
        variant("forgets-the-first-subset", "The starting subset (all negatives, or empty) is itself one of the sums, the smallest one.", kSubsetSumsI, [["const out = [base], heap = [];", "const out = [], heap = [];"]]),
      ],
      hints: ["base = sum of the negative values; b = sorted absolute values.", "Output base first; push [base + b[0], 0].", "Pop [s, i]: output s, push [s + b[i+1], i+1] and [s − b[i] + b[i+1], i+1]."],
      cases: [
        example([[1, 6, 3, -3], 9], [-3, -2, 0, 0, 1, 1, 3, 3, 4], "CSES sample"),
        example([[2, 3, 5], 8], [0, 2, 3, 5, 5, 7, 8, 10], "every subset"),
        run(kSubsetSumsI, [signedList(17700, 12, 50), 40], "twelve values"),
        hidden("n = k = 2·10⁵, time limit", () => [SIGNED_BIG(), 200000]),
      ],
    },
    {
      id: "k-subset-sums-ii", title: "K Subset Sums II", cses: { id: 3109, name: "K Subset Sums II" },
      goal: "The k smallest sums over all subsets with exactly m elements, in increasing order.",
      concept: "Sort the values; the smallest m-subset is the first m. Every other subset is reached by moving elements right, last element first. A state keeps the element being moved (x), its position (y) and the position of the next element (z); earlier elements have not moved yet. A state spawns two children: move x one step right if it stays before z, or fix x and start moving x − 1 one step. Each subset has one parent and sums never drop along an edge, so a min-heap pops them in order.",
      functionName: "kSubsetSumsII", signature: "kSubsetSumsII(values, m, k) → sums",
      starterSource: starter("kSubsetSumsII", "values, m, k", "Sort; start with the first m; heap of [sum, x, y, z]; children: y → y + 1 (if < z), or x − 1 moves to x (if x < y)."),
      solve: kSubsetSumsII, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: kSubsetSumsIIBrute, small: (round) => { const n = 2 + (round % 8), m = 1 + (round % (n - 1)); let total = 1; for (let i = 0; i < m; i += 1) total = total * (n - i) / (i + 1); return [signedList(17800 + round, n, 6), m, 1 + (round % total)]; },
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [-3, 1, 5, 2, 0], b: 3, c: 9 }, "pairs": { a: [4, 1, 3, 2], b: 2, c: 6 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("unsorted", "Moving an element right only raises the sum when the values are sorted; sort first.", kSubsetSumsII, [["const a = values.slice().sort((p, q) => p - q), n = a.length;", "const a = values.slice(), n = a.length;"]]),
        variant("passes-the-next-element", "An element may only move up to the position before the next chosen one; letting it pass creates repeats.", kSubsetSumsII, [["if (y + 1 < z) heapPush(heap, [sum - a[y] + a[y + 1], x, y + 1, z]);", "if (y + 1 < n) heapPush(heap, [sum - a[y] + a[y + 1], x, y + 1, z]);"]]),
      ],
      hints: ["Sort; the first output is the sum of the m smallest.", "State [sum, x, y, z]: element x sits at y, the next element is fixed at z (n for the last).", "Children: [sum − a[y] + a[y+1], x, y+1, z] if y + 1 < z; [sum − a[x−1] + a[x], x−1, x, y] if x > 0 and x < y."],
      cases: [
        example([[-3, 1, 5, 2, 0], 3, 9], [-2, -1, 0, 2, 3, 3, 4, 6, 7], "CSES sample"),
        example([[4, 1, 3, 2], 2, 6], [3, 4, 5, 5, 6, 7], "all pairs"),
        run(kSubsetSumsII, [signedList(17900, 10, 30), 4, 30], "ten values, subsets of four"),
        hidden("n = k = 2·10⁵, m = 10⁵, time limit", () => [SIGNED_BIG(), 100000, 200000]),
      ],
    },
    {
      id: "increasing-array-ii", title: "Increasing Array II", cses: { id: 2132, name: "Increasing Array II" },
      goal: "The fewest ±1 moves that make the array non-decreasing (values may go up or down).",
      concept: "Slope trick: the cost of the best prefix, as a function of its last value, is convex and piecewise linear, and a max-heap stores its breakpoints. Adding value x pushes x. If the largest breakpoint is above x, the new element and that breakpoint must meet somewhere between them, which costs their gap; the top breakpoint is replaced by x.",
      functionName: "increasingArrayII", signature: "increasingArrayII(values) → moves",
      starterSource: starter("increasingArrayII", "values", "Max-heap (push −x); if the top exceeds x: add the gap, pop, push x again."),
      solve: increasingArrayII, comparator: "scalar", dependencies: ["heap-push", "heap-pop"], brute: increasingArrayIIBrute, small: (round) => [smallList(18000 + round, 1 + (round % 9), 1, 8)],
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [3, 8, 5, 6, 5] }, "a dip": { a: [9, 6, 1, 3] }, "sorted": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("only-raises", "Lowering values is allowed too: raising everything to the running maximum can cost far more.", function increasingArrayII(values) { let top = 0, total = 0; values.forEach((x) => { if (x < top) total += top - x; else top = x; }); return total; }),
        variant("pushes-once", "After paying for the gap, x replaces the popped breakpoint: push it a second time.", increasingArrayII, [["heapPop(heap);\n        heapPush(heap, [-x]);", "heapPop(heap);"]]),
      ],
      hints: ["Keep a max-heap of breakpoints (store −x in the min-heap brick).", "Push x; if the heap top t > x, add t − x.", "Then pop the top and push x again."],
      cases: [
        example([[3, 8, 5, 6, 5]], 4, "CSES sample"),
        example([[1, 2, 3]], 0, "already increasing"),
        example([[9, 6, 1, 3]], 11, "a dip"),
        run(increasingArrayII, [smallList(18100, 20, 1, 30)], "twenty values"),
        hidden("n = 2·10⁵, time limit", () => [INCREASING_BIG()]),
      ],
    },
    {
      id: "food-division", title: "Food Division", cses: { id: 1189, name: "Food Division" },
      goal: "The fewest one-unit passes between neighbours around a round table that give every child the food they want, as a decimal string.",
      concept: "Cut the table between the last and the first child and let c units flow across that cut. Then the food crossing edge i is fixed: prefix[i] − c, where prefix is the running sum of have − want. The total is Σ |prefix[i] − c|, which is smallest when c is a median of the prefix sums. The total can pass 2⁵³, so add it up in BigInt.",
      functionName: "foodDivision", signature: "foodDivision(have, want) → string",
      starterSource: starter("foodDivision", "have, want", "Prefix sums of have − want; c = their median; answer Σ |prefix − c| as a string."),
      solve: foodDivision, comparator: "scalar", brute: foodDivisionBrute, small: (round) => { const n = 1 + (round % 9), have = smallList(18200 + round, n, 0, 6), want = have.slice(); for (let t = 0; t < 5; t += 1) { const i = (round * 7 + t * 3) % n, j = (round + t * 5) % n; if (want[i] > 0) { want[i] -= 1; want[j] += 1; } } return [have, want]; },
      reference: book("6.4", "Greedy algorithms · minimizing sums"),
      presets: { "CSES sample": { a: [3, 5, 0], b: [2, 4, 2] }, "one big transfer": { a: [10, 0, 0, 0, 0], b: [0, 10, 0, 0, 0] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("cuts-the-circle", "The table is round: food may also pass between the last and the first child, which is the flow c.", foodDivision, [["const median = Float64Array.from(prefix).sort()[n >> 1];", "const median = 0;"]]),
        variant("mean-not-median", "Σ |prefix − c| is smallest at a median; the mean minimises squares, not absolute values.", foodDivision, [["const median = Float64Array.from(prefix).sort()[n >> 1];", "const median = Math.round(prefix.reduce((s, v) => s + v, 0) / n);"]]),
      ],
      hints: ["prefix[i] = Σ_{t ≤ i} (have[t] − want[t]).", "Passing c units across the cut changes every edge's flow to prefix[i] − c.", "Take c as the median of the prefix sums and add |prefix[i] − c| in BigInt."],
      cases: [
        example([[3, 5, 0], [2, 4, 2]], "2", "CSES sample"),
        example([[10, 0, 0, 0, 0], [0, 10, 0, 0, 0]], "10", "one big transfer"),
        example([[5, 0, 3], [3, 0, 5]], "2", "around the back"),
        run(foodDivision, [smallList(18300, 12, 0, 9), smallList(18300, 12, 0, 9).reverse()], "twelve children"),
        hidden("n = 2·10⁵, time limit", () => FOOD_BIG()),
        hidden("n = 2·10⁵, half giving 10⁶ each", () => FOOD_TENT()),
      ],
    },
    {
      id: "swap-round-sorting", title: "Swap Round Sorting", cses: { id: 1698, name: "Swap Round Sorting" },
      goal: "Sort the permutation in the fewest rounds, where a round swaps any set of disjoint pairs. Return the rounds, each a list of [i, j] pairs (1-based); any optimal plan is accepted.",
      concept: "Look at the cycles of the permutation. A sorted array needs 0 rounds; if every cycle has length 2, one round swaps them all. Otherwise 2 rounds are needed and enough, because a cycle is the product of two reflections. With the cycle's positions c_0 … c_{L−1}, the first round swaps c_j with c_{−j} and the second swaps c_j with c_{1−j} (indices mod L), which moves every element from c_j to c_{j+1}. Two-cycles go into the first round.",
      functionName: "swapRoundSorting", signature: "swapRoundSorting(values) → rounds",
      starterSource: starter("swapRoundSorting", "values", "Cycles i → values[i]; 2-cycles swap in round 1; longer cycles: round 1 pairs (j, L − j), round 2 pairs (j, 1 − j) mod L."),
      solve: swapRoundSorting, comparator: "deep", accept: swapRoundSortingAccept, check: viaBrute(swapRoundSortingAccept, swapRoundSortingBrute), small: (round) => [randomPermutation(18400 + round, 1 + (round % 6))],
      reference: book("16.3", "Successor paths · cycles and trees"),
      presets: { "CSES sample": { a: [5, 2, 1, 3, 4] }, "only pairs": { a: [2, 1, 4, 3] }, "sorted": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("a-swap-per-round", "Selection sort puts one swap in each round; swaps on different elements can share a round, so two rounds always suffice.", function swapRoundSorting(values) { const a = values.slice(), where = []; a.forEach((v, i) => { where[v] = i + 1; }); const rounds = []; for (let i = 1; i <= a.length; i += 1) { if (a[i - 1] === i) continue; const j = where[i], v = a[i - 1]; rounds.push([[i, j]]); a[j - 1] = v; where[v] = j; a[i - 1] = i; where[i] = i; } return rounds; }),
        variant("both-reflections-in-one-round", "The two reflections of a cycle touch the same positions, so they need separate rounds.", swapRoundSorting, [["return longest === 2 ? [first] : [first, second];", "return [first.concat(second)];"]]),
      ],
      hints: ["Find the cycles: position i holds values[i], which belongs at position values[i].", "No cycle longer than 2 → at most one round.", "For a longer cycle c_0 … c_{L−1}: round 1 swaps c_j with c_{L−j}, round 2 swaps c_j with c_{(1−j) mod L}."],
      cases: [
        example([[5, 2, 1, 3, 4]], [[[1, 3], [4, 5]], [[3, 5]]], "CSES sample"),
        example([[1, 2, 3]], [], "already sorted"),
        example([[2, 1, 4, 3]], [[[1, 2], [3, 4]]], "only pairs: one round"),
        run(swapRoundSorting, [randomPermutation(18500, 12)], "twelve values"),
        hidden("n = 2·10⁵, time limit", () => [SWAP_BIG()]),
      ],
    },
    {
      id: "binary-subsequences", title: "Binary Subsequences", cses: { id: 2430, name: "Binary Subsequences" },
      goal: "A shortest bit string with exactly n distinct non-empty subsequences; any shortest one is accepted.",
      concept: "Count distinct subsequences by their last bit: appending 0 sets end0 = end0 + end1 + 1, appending 1 sets end1 the same way. With X = end0 + 1 and Y = end1 + 1 the pair starts at (1, 1) and each bit adds one coordinate to the other, like the subtractive Euclidean algorithm run backwards. So a string with n subsequences is a coprime pair X + Y = n + 2, and its length is the sum of the Euclidean quotients minus 1. Try every X, keep the cheapest, and walk it back to (1, 1).",
      functionName: "binarySubsequences", signature: "binarySubsequences(n) → string",
      starterSource: starter("binarySubsequences", "n", "For X = 1 … n + 1 with gcd(X, n + 2 − X) = 1: cost = sum of Euclid quotients; walk the best pair back to (1, 1) emitting 0 when X > Y."),
      solve: binarySubsequences, comparator: "scalar", accept: binarySubsequencesAccept, check: viaBrute(binarySubsequencesAccept, binarySubsequencesBrute), small: (round) => [1 + (round % 60)],
      reference: book("5", "Complete search · constructive solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 80 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("all-ones", "n ones do have n distinct subsequences, but mixing bits gets there far sooner.", function binarySubsequences(n) { return "1".repeat(n); }),
        variant("counts-the-empty-subsequence", "Only non-empty subsequences count: from (1, 1) the pair must reach X + Y = n + 2.", binarySubsequences, [["const total = n + 2;", "const total = n + 1;"]]),
      ],
      hints: ["Appending 0: (X, Y) → (X + Y, Y); appending 1: (X, Y) → (X, X + Y); start (1, 1); subsequences = X + Y − 2.", "For each X in 1 … n + 1 with Y = n + 2 − X coprime, the length is Σ quotients − 1.", "Walk back: X > Y means the last bit was 0 (X −= Y), else 1 (Y −= X); reverse."],
      cases: [
        example([6], "101", "CSES sample"),
        example([1], "1", "one subsequence"),
        run(binarySubsequences, [100], "n = 100"),
        run(binarySubsequences, [9999], "n = 9999"),
        hidden("n = 10⁶, time limit", () => [1000000]),
      ],
    },
    {
      id: "school-excursion", title: "School Excursion", cses: { id: 1706, name: "School Excursion" },
      goal: "A bit string whose i-th character (1-based) says whether exactly i children can visit the zoo, when paired children must go to the same place.",
      concept: "Wishes glue children into groups (union-find), and a group goes together. So the possible zoo counts are the subset sums of the group sizes, a knapsack over a bitset. Group sizes add up to n, so there are at most about √(2n) distinct sizes. c groups of the same size become pieces of 1, 2, 4, … groups, so each size costs O(log c) shifts of the bitset.",
      functionName: "schoolExcursion", signature: "schoolExcursion(n, wishes) → string",
      starterSource: starter("schoolExcursion", "n, wishes", "Union-find groups; count groups per size; bitset subset sums with binary splitting; read bits 1 … n."),
      solve: schoolExcursion, comparator: "scalar", dependencies: ["dsu-find", "dsu-union"], brute: schoolExcursionBrute, small: (round) => { const n = 4 + (round % 9); return [n, randomWishes(18600 + round, n, round % 5)]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [1, 5]] }, "no wishes": { a: 4, b: [] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("ignores-the-wishes", "Paired children travel together, so not every count is possible.", function schoolExcursion(n, wishes) { return "1".repeat(n); }),
        variant("one-group-per-size", "Several groups can have the same size; each can go separately, so count every copy.", schoolExcursion, [["let left = count[s];", "let left = Math.min(count[s], 1);"]]),
      ],
      hints: ["Union the paired children and read off the group sizes.", "Possible counts are subset sums of those sizes: shift-or a bitset.", "Split c equal groups into pieces 1, 2, 4, … so every count 0 … c stays reachable."],
      cases: [
        example([5, [[1, 2], [2, 3], [1, 5]]], "10011", "CSES sample"),
        example([4, []], "1111", "no wishes"),
        run(schoolExcursion, [12, [[1, 2], [3, 4], [5, 6], [7, 8], [8, 9], [10, 11]]], "several pairs and a triple"),
        hidden("n = 10⁵, m = 5·10⁴, time limit", () => [100000, SCHOOL_BIG()]),
      ],
    },
    {
      id: "coin-grid", title: "Coin Grid", cses: { id: 1709, name: "Coin Grid" },
      goal: "The fewest row or column clearings that remove every coin, as { count, moves } with moves [1, row] or [2, column]; any optimal plan is accepted.",
      concept: "A coin at (r, c) is an edge between row r and column c, and a set of lines clearing every coin is a vertex cover of that bipartite graph. König's theorem: the smallest cover has the size of a maximum matching. Find the matching with a flow from rows to columns. In the residual graph, the cover is the rows the source cannot reach plus the columns it can.",
      functionName: "coinGrid", signature: "coinGrid(grid) → { count, moves }",
      starterSource: starter("coinGrid", "grid", "maxFlow source → rows → columns → sink; BFS the residual graph from the source; unreached rows and reached columns."),
      solve: coinGrid, comparator: "deep", dependencies: ["max-flow"], accept: coinGridAccept, check: viaBrute(coinGridAccept, coinGridBrute), small: (round) => { const n = 1 + (round % 7); return [charGrid(18700 + round, n, n, ".o", [0.6, 0.4])]; },
      reference: book("20.3", "Maximum matchings · bipartite graphs"),
      presets: { "CSES sample": { a: ["..o", "o.o", "..."] }, "one column": { a: ["o..", "o..", "o.."] }, "busiest is a trap": { a: [".o.", ".oo", "..o"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("every-row-with-a-coin", "Clearing every row that has a coin works, but one column can take several rows' coins at once.", function coinGrid(grid) { const moves = []; grid.forEach((row, r) => { if (row.includes("o")) moves.push([1, r + 1]); }); return { count: moves.length, moves }; }),
        diagnosis("busiest-line-first", "Taking the line with the most coins first can waste moves; the matching bound is what proves optimality.", function coinGrid(grid) { const n = grid.length, g = grid.map((row) => row.split("")), moves = []; while (true) { let best = null, most = 0; for (let r = 0; r < n; r += 1) { const c = g[r].filter((x) => x === "o").length; if (c > most) { most = c; best = [1, r + 1]; } } for (let c = 0; c < n; c += 1) { let k = 0; for (let r = 0; r < n; r += 1) if (g[r][c] === "o") k += 1; if (k > most) { most = k; best = [2, c + 1]; } } if (!best) break; moves.push(best); if (best[0] === 1) g[best[1] - 1].fill("."); else for (let r = 0; r < n; r += 1) g[r][best[1] - 1] = "."; } return { count: moves.length, moves }; }),
      ],
      hints: ["Nodes: source, n rows, n columns, sink; capacity 1 everywhere; row → column for each coin.", "The maximum flow is the answer's count.", "Search the residual graph from the source: take unreached rows and reached columns."],
      cases: [
        example([["..o", "o.o", "..."]], { count: 2, moves: [[1, 2], [2, 3]] }, "CSES sample"),
        run(coinGrid, [["o..", "o..", "o.."]], "one column"),
        run(coinGrid, [[".o.", ".oo", "..o"]], "the busiest line is a trap"),
        run(coinGrid, [charGrid(18800, 8, 8, ".o", [0.7, 0.3])], "an 8 × 8 grid"),
        hidden("n = 100, time limit", () => [COIN_GRID_BIG()]),
      ],
    },
    {
      id: "grid-coloring-ii", title: "Grid Coloring II", cses: { id: 3312, name: "Grid Coloring II" },
      goal: "Change every cell to a different letter among A, B, C so that no two neighbours match; return the new rows, or null if impossible. Any valid grid is accepted.",
      concept: "Each cell has exactly two letters left, so it is a boolean variable. Two neighbours must not take the same letter: for each letter both could take, forbid that pair. That makes a clause (not a) or (not b), which is 2-SAT. Build the implication graph, find strongly connected components (Kosaraju), and answer null if a cell's two choices share a component. Otherwise pick for each cell the choice whose component comes later in topological order.",
      functionName: "gridColoringII", signature: "gridColoringII(grid) → rows or null",
      starterSource: starter("gridColoringII", "grid", "Literal 2c / 2c + 1 = the cell's smaller / larger remaining letter; clauses for equal options of neighbours; Kosaraju; compare component labels."),
      solve: gridColoringII, comparator: "deep", accept: gridColoringIIAccept, check: viaBrute(gridColoringIIAccept, gridColoringIIBrute), small: (round) => [charGrid(18900 + round, 1 + (round % 3), 1 + ((round * 5) % 4), "ABC")],
      reference: book("17.2", "2SAT problem"),
      presets: { "CSES sample": { a: ["AAAA", "CCBB", "ABCA"] }, "impossible": { a: ["AAC", "CBB", "AAA"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("shifts-every-letter", "Moving every letter one step (A → B → C → A) changes each cell, but neighbours that matched still match.", function gridColoringII(grid) { return grid.map((row) => row.split("").map((c) => "BCA"["ABC".indexOf(c)]).join("")); }),
        diagnosis("ignores-the-row-above", "A greedy that only looks left breaks the vertical neighbours; both directions need the global 2-SAT.", function gridColoringII(grid) { return grid.map((row) => { let out = ""; for (let c = 0; c < row.length; c += 1) for (const letter of "ABC") if (letter !== row[c] && (c === 0 || out[c - 1] !== letter)) { out += letter; break; } return out; }); }),
      ],
      hints: ["Variable per cell: false = the smaller remaining letter, true = the larger.", "For neighbours u, v and choices a, b with the same letter: add u=a → v=¬b and v=b → u=¬a.", "SCCs by Kosaraju; a cell whose two literals share a component makes it impossible."],
      cases: [
        example([["AAAA", "CCBB", "ABCA"]], ["BCBC", "ABCA", "CABC"], "CSES sample"),
        example([["AAC", "CBB", "AAA"]], null, "impossible"),
        run(gridColoringII, [["A"]], "one cell"),
        run(gridColoringII, [colorableGrid(19000, 6, 7)], "a 6 × 7 grid"),
        hidden("500 × 500 with a solution, time limit", () => [COLOR_BIG()]),
        hidden("500 × 500 random letters", () => [COLOR_RANDOM()]),
      ],
    },
    {
      id: "programmers-and-artists", title: "Programmers and Artists", cses: { id: 2426, name: "Programmers and Artists" },
      goal: "The largest total skill when hiring a programmers (programming skill counts) and b artists (art skill counts) from the applicants [x, y].",
      concept: "Sort the applicants by x − y, descending. Some optimal hiring takes all programmers before all artists in this order: if an artist came earlier, swapping the two roles would not lose skill. So try every split point: the best a programmers in the prefix and the best b artists in the suffix, each kept by a min-heap of the chosen skills.",
      functionName: "programmersAndArtists", signature: "programmersAndArtists(a, b, applicants) → total",
      starterSource: starter("programmersAndArtists", "a, b, applicants", "Sort by x − y descending; prefix best-a sums of x with a heap; suffix best-b sums of y; maximise over splits."),
      solve: programmersAndArtists, comparator: "scalar", dependencies: ["heap-push", "heap-pop"], brute: programmersAndArtistsBrute, small: (round) => { const n = 2 + (round % 8), a = round % (n + 1), b = Math.max(0, Math.min(n - a, (round * 3) % (n + 1))); return [a, b, gridPairs(19100 + round, n, 1, 9)]; },
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [3, 9, 1, 4], b: [7, 8, 5, 2], c: 2, d: 1, e: [[3, 7], [9, 8], [1, 5], [4, 2]] }, "best programmer is a better artist": { a: [3, 3, 5], b: [1, 2, 5], c: 1, d: 1, e: [[3, 1], [3, 2], [5, 5]] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }] },
      diagnoses: [
        diagnosis("best-programmers-first", "Taking the strongest programmers first can steal someone who is worth more as an artist.", function programmersAndArtists(a, b, applicants) { const order = applicants.map((p, i) => i).sort((p, q) => applicants[q][0] - applicants[p][0]); const chosen = new Set(order.slice(0, a)); const artists = order.filter((i) => !chosen.has(i)).sort((p, q) => applicants[q][1] - applicants[p][1]).slice(0, b); return order.slice(0, a).reduce((s, i) => s + applicants[i][0], 0) + artists.reduce((s, i) => s + applicants[i][1], 0); }),
        diagnosis("largest-difference-first", "Sorting by x − y is right, but the programmers need not be the first a in that order: try every split point.", function programmersAndArtists(a, b, applicants) { const order = applicants.map((p, i) => i).sort((p, q) => (applicants[q][0] - applicants[q][1]) - (applicants[p][0] - applicants[p][1])); const chosen = new Set(order.slice(0, a)); const artists = order.filter((i) => !chosen.has(i)).sort((p, q) => applicants[q][1] - applicants[p][1]).slice(0, b); return order.slice(0, a).reduce((s, i) => s + applicants[i][0], 0) + artists.reduce((s, i) => s + applicants[i][1], 0); }),
      ],
      hints: ["Sort by x − y from largest to smallest.", "prefix[i]: best sum of a programming skills among the first i (min-heap of size a).", "suffix[i]: best sum of b art skills among the rest; answer max prefix[i] + suffix[i] for a ≤ i ≤ n − b."],
      cases: [
        example([2, 1, [[3, 7], [9, 8], [1, 5], [4, 2]]], 20, "CSES sample"),
        example([1, 1, [[3, 1], [3, 2], [5, 5]]], 8, "the best programmer is a better artist"),
        example([1, 1, [[4, 6], [5, 2], [8, 5]]], 14, "not the first in x − y order"),
        run(programmersAndArtists, [3, 2, gridPairs(19200, 8, 1, 20)], "eight applicants"),
        hidden("n = 2·10⁵, a = 7·10⁴, b = 6·10⁴, time limit", () => [70000, 60000, PEOPLE_BIG()]),
      ],
    },
    {
      id: "removing-digits-ii", title: "Removing Digits II", cses: { id: 2174, name: "Removing Digits II" },
      goal: "The fewest steps to reach 0 when each step subtracts one of the number's digits; n (up to 10¹⁸) and the answer are decimal strings.",
      concept: "Subtracting the largest digit is always optimal (as in Removing Digits I), but 10¹⁸ steps cannot be simulated. Split the number into its top digit and the rest, and remember the largest digit m of the digits above. Run the greedy on the rest until it borrows from the top digit. After a borrow the rest is always 10^(k−1) minus a small amount, so only a handful of (length, m, rest) states ever occur, and memoizing them makes the whole greedy take a few thousand steps.",
      functionName: "removingDigitsII", signature: "removingDigitsII(n) → string",
      starterSource: starter("removingDigitsII", "n", "go(k, m, x) → [steps, value after]: split x into top digit and rest, recurse with max(m, top) until the rest borrows; memoize; BigInt."),
      solve: removingDigitsII, comparator: "scalar", brute: removingDigitsIIBrute, small: (round) => [String(1 + ((round * 37) % 3000))],
      reference: book("7.1", "Dynamic programming · optimal solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 27, min: 1, max: 200 }], args: [{ fixture: "roundedNString" }] },
      diagnoses: [
        diagnosis("divides-by-nine", "Each step subtracts at most 9, so ⌈n/9⌉ is only a lower bound: the digits are often smaller.", function removingDigitsII(n) { return ((BigInt(n) + 8n) / 9n).toString(); }),
        diagnosis("divides-by-the-top-digit", "The largest digit changes as the number shrinks; you cannot keep subtracting the starting maximum.", function removingDigitsII(n) { const top = BigInt(Math.max(...n.split("").map(Number))); return ((BigInt(n) + top - 1n) / top).toString(); }),
      ],
      hints: ["The greedy (subtract the largest digit) is optimal; only its step count is needed.", "go(k, m, x): with x < 10^k and outer maximum m, subtract max(m, digit) until x < 0; return steps and the negative remainder.", "Split x into its top digit h and rest; recurse with max(m, h); on a borrow, h −= 1 and rest += 10^(k−1). Memoize."],
      cases: [
        example(["27"], "5", "CSES sample"),
        example(["9"], "1", "one digit"),
        run(removingDigitsII, ["1000000"], "n = 10⁶"),
        run(removingDigitsII, ["123456789012"], "twelve digits"),
        hidden("n = 10¹⁸, time limit", () => ["1000000000000000000"]),
        hidden("n = 999 999 999 999 999 999", () => ["999999999999999999"]),
      ],
    },
    {
      id: "coin-arrangement", title: "Coin Arrangement", cses: { id: 2180, name: "Coin Arrangement" },
      goal: "The fewest one-step coin moves in a 2 × n grid holding 2n coins so that every cell ends with exactly one coin.",
      concept: "Sweep the columns left to right, carrying each row's surplus (or debt) rightwards: every carried unit costs one move per column it crosses. When the top row has a surplus and the bottom a debt, or the other way round, settle as much as possible with vertical moves first, one move each. Settling early never costs extra, because the carry would have to cross that column anyway.",
      functionName: "coinArrangement", signature: "coinArrangement(top, bottom) → moves",
      starterSource: starter("coinArrangement", "top, bottom", "upper += top[i] − 1, lower += bottom[i] − 1; if their signs differ move min(|upper|, |lower|) vertically; add |upper| + |lower|."),
      solve: coinArrangement, comparator: "scalar", brute: coinArrangementBrute, small: (round) => coinSpread(19300 + round, 1 + (round % 5)),
      reference: book("6", "Greedy algorithms"),
      presets: { "CSES sample": { a: [0, 1, 0, 1], b: [2, 0, 1, 3] }, "all in one cell": { a: [4, 0], b: [0, 0] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("never-moves-between-rows", "Coins may move up and down too: settle a surplus in one row against a debt in the other.", coinArrangement, [["if (upper > 0 && lower < 0) { const t = Math.min(upper, -lower); moves += t; upper -= t; lower += t; }", "if (false) { }"], ["else if (upper < 0 && lower > 0) { const t = Math.min(-upper, lower); moves += t; upper += t; lower -= t; }", ""]]),
        variant("moves-down-only", "Surplus in the bottom row can move up just as well as top-row surplus moves down.", coinArrangement, [["else if (upper < 0 && lower > 0) { const t = Math.min(-upper, lower); moves += t; upper += t; lower -= t; }", ""]]),
      ],
      hints: ["Keep upper and lower: coins carried right in each row (negative = owed).", "Per column add top[i] − 1 and bottom[i] − 1; if the signs differ, move min(|upper|, |lower|) vertically.", "Then add |upper| + |lower| for carrying into the next column."],
      cases: [
        example([[0, 1, 0, 1], [2, 0, 1, 3]], 5, "CSES sample"),
        example([[4, 0], [0, 0]], 4, "all in one cell"),
        example([[0, 0], [2, 2]], 2, "straight up"),
        run(coinArrangement, coinSpread(19400, 10), "ten columns"),
        hidden("n = 10⁵, time limit", () => COIN_ROWS_BIG()),
      ],
    },
    {
      id: "replace-with-difference", title: "Replace with Difference", cses: { id: 3159, name: "Replace with Difference" },
      goal: "n − 1 operations, each replacing two numbers a and b by |a − b|, that leave 0 at the end: the pairs [a, b], or −1 if it cannot be done. Any valid sequence is accepted.",
      concept: "Whatever you do, the last number is the values combined with plus and minus signs, both signs used. So it can be 0 exactly when the values split into two groups of equal sum: a subset-sum test with a bitset, remembering which value first reached each sum to rebuild one group. Then always pair a number from each group and put the difference back into the group that had the larger one. The two sums stay equal all the way, so the last number is 0.",
      functionName: "replaceWithDifference", signature: "replaceWithDifference(values) → pairs or −1",
      starterSource: starter("replaceWithDifference", "values", "Odd total → −1; bitset subset sums up to total/2, recording the first item per sum; rebuild one half; pair across the halves."),
      solve: replaceWithDifference, comparator: "deep", accept: replaceWithDifferenceAccept, check: viaBrute(replaceWithDifferenceAccept, replaceWithDifferenceBrute), small: (round) => [smallList(19500 + round, 2 + (round % 5), 1, 9)],
      reference: book("7.4", "Knapsack problems"),
      presets: { "CSES sample": { a: [2, 7, 4, 12, 1] }, "cannot split": { a: [3, 3, 2] }, "largest two first fails": { a: [5, 5, 4, 3, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("largest-two-first", "Always combining the two largest numbers can end above 0 even when an equal split exists, and it never notices when none does.", function replaceWithDifference(values) { const list = values.slice().sort((p, q) => p - q), ops = []; while (list.length > 1) { const a = list.pop(), b = list.pop(), d = a - b; ops.push([a, b]); let i = list.length; list.push(d); while (i > 0 && list[i - 1] > d) { list[i] = list[i - 1]; i -= 1; } list[i] = d; } return ops; }),
        variant("checks-parity-only", "An even total is not enough: some group of values must add up to exactly half of it.", replaceWithDifference, [["if (first[half] < 0) return -1;", ""]]),
      ],
      hints: ["The final number is ±x_1 ± x_2 … with both signs used: it is 0 iff some subset sums to total/2.", "Bitset subset sums; when a bit first turns on, record the item that set it, then walk back from total/2.", "Pair one number from each half; the difference joins the half whose number was larger."],
      cases: [
        example([[2, 7, 4, 12, 1]], [[2, 12], [7, 10], [4, 1], [3, 3]], "CSES sample"),
        example([[3, 3, 2]], -1, "an even total that cannot split"),
        run(replaceWithDifference, [[5, 5, 4, 3, 3]], "the two largest first fails"),
        run(replaceWithDifference, [[1, 1]], "two equal numbers"),
        hidden("n = 1000, time limit", () => [REPLACE_BIG()]),
        hidden("n = 999, one number outweighs the rest", () => [REPLACE_NO()]),
      ],
    },
    {
      id: "grid-puzzle-i", title: "Grid Puzzle I", cses: { id: 2432, name: "Grid Puzzle I" },
      goal: "Choose exactly a_i squares in row i and b_j in column j of an n × n grid: the rows as strings of X and ., or −1 if impossible. Any valid grid is accepted.",
      concept: "Gale–Ryser: fill the rows one after another, each into the columns that still need the most squares. Serving the neediest columns keeps the remaining demands as even as possible, so if any grid exists this greedy never gets stuck. It fails exactly when the totals differ or a row asks for more columns than still need a square.",
      functionName: "gridPuzzleI", signature: "gridPuzzleI(rows, cols) → grid or −1",
      starterSource: starter("gridPuzzleI", "rows, cols", "Totals must match; for each row, sort columns by remaining need (largest first) and take the first rows[i]; a column with no need left means −1."),
      solve: gridPuzzleI, comparator: "deep", accept: gridPuzzleIAccept, check: viaBrute(gridPuzzleIAccept, gridPuzzleIBrute), small: (round) => puzzleCounts(19600 + round, 1 + (round % 3), round % 2 === 0),
      reference: book("6", "Greedy algorithms"),
      presets: { "CSES sample": { a: [0, 1, 3, 2, 0], b: [1, 2, 2, 0, 1] }, "leftmost gets stuck": { a: [0, 1, 3], b: [1, 1, 2] }, "impossible": { a: [2, 0], b: [0, 2] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("leftmost-columns", "Filling the leftmost columns that still need squares can use up a column a later row needed; serve the neediest columns first.", function gridPuzzleI(rows, cols) { const n = rows.length, left = cols.slice(), grid = []; for (let r = 0; r < n; r += 1) { let row = "", need = rows[r]; for (let c = 0; c < n; c += 1) { if (need && left[c]) { row += "X"; left[c] -= 1; need -= 1; } else row += "."; } if (need) return -1; grid.push(row); } return left.every((v) => v === 0) ? grid : -1; }),
        diagnosis("rows-only", "Matching totals are not enough: each column's count has to come out right as well.", function gridPuzzleI(rows, cols) { if (rows.reduce((s, v) => s + v, 0) !== cols.reduce((s, v) => s + v, 0)) return -1; return rows.map((a) => "X".repeat(a) + ".".repeat(rows.length - a)); }),
      ],
      hints: ["If the row and column totals differ, return −1.", "For each row, order the columns by how many squares they still need, largest first.", "Take the first rows[i] of them; if one of those needs nothing, return −1."],
      cases: [
        example([[0, 1, 3, 2, 0], [1, 2, 2, 0, 1]], [".....", "..X..", ".XX.X", "XX...", "....."], "CSES sample"),
        run(gridPuzzleI, [[0, 1, 3], [1, 1, 2]], "the leftmost columns get stuck"),
        example([[2, 0], [0, 2]], -1, "a full row meets an empty column"),
        example([[1], [0]], -1, "the totals differ"),
        hidden("n = 50, time limit", () => PUZZLE_I_BIG()),
        hidden("n = 50, random counts with equal totals", () => PUZZLE_I_NO()),
      ],
    },
    {
      id: "grid-puzzle-ii", title: "Grid Puzzle II", cses: { id: 2131, name: "Grid Puzzle II" },
      goal: "The same row and column counts, now collecting as many coins as possible: { coins, grid }, or −1 if impossible. Any best grid is accepted.",
      concept: "Each chosen square is one unit of flow: source → row r (capacity a_r) → square (capacity 1) → column c → sink (capacity b_c). A flow of Σa is a valid choice, and minimum-cost flow with cost 1000 − coins on the square edges finds the richest one. The shift keeps every cost non-negative, as Dijkstra with potentials needs, and since every unit crosses exactly one square it adds the same 1000 per square to every choice.",
      functionName: "gridPuzzleII", signature: "gridPuzzleII(rows, cols, coins) → { coins, grid } or −1",
      starterSource: starter("gridPuzzleII", "rows, cols, coins", "minCostFlow source → rows → columns → sink with cost 1000 − coins on the square edges; a flow short of Σa means −1; coins = 1000·Σa − cost."),
      solve: gridPuzzleII, comparator: "deep", dependencies: ["min-cost-flow"], accept: gridPuzzleIIAccept, check: viaBrute(gridPuzzleIIAccept, gridPuzzleIIBrute), small: (round) => { const n = 1 + (round % 3), [rows, cols] = puzzleCounts(19700 + round, n, round % 2 === 0); return [rows, cols, coinTable(19750 + round, n, 9)]; },
      reference: site("cp-algorithms · Minimum-cost flow", CP + "graph/min_cost_flow.html"),
      presets: { "CSES sample": { a: [[2, 5, 1, 5, 1], [0, 2, 5, 1, 2], [3, 8, 9, 3, 5], [1, 4, 3, 7, 3], [0, 3, 6, 2, 8]], b: [0, 1, 3, 2, 0], c: [1, 2, 2, 0, 1] } },
      scene: { kind: "algo", view: "number-grid", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetA" }] },
      diagnoses: [
        diagnosis("any-valid-grid", "Grid Puzzle I's greedy meets the counts but ignores the coins; the richest choice needs costs in the flow.", function gridPuzzleII(rows, cols, coins) { const n = rows.length; if (rows.reduce((s, v) => s + v, 0) !== cols.reduce((s, v) => s + v, 0)) return -1; const left = cols.slice(), grid = []; let total = 0; for (let r = 0; r < n; r += 1) { const order = left.map((v, j) => j).sort((p, q) => left[q] - left[p] || p - q), row = new Array(n).fill("."); for (let t = 0; t < rows[r]; t += 1) { const j = order[t]; if (left[j] === 0) return -1; left[j] -= 1; row[j] = "X"; total += coins[r][j]; } grid.push(row.join("")); } return { coins: total, grid }; }),
        diagnosis("richest-cells-first", "Grabbing the richest squares first can leave a row or column impossible to finish, or block a better combination.", function gridPuzzleII(rows, cols, coins) { const n = rows.length, rowLeft = rows.slice(), colLeft = cols.slice(), grid = rows.map(() => new Array(n).fill(".")), cells = []; for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) cells.push([coins[r][c], r, c]); cells.sort((p, q) => q[0] - p[0]); let total = 0; cells.forEach(([v, r, c]) => { if (rowLeft[r] && colLeft[c]) { rowLeft[r] -= 1; colLeft[c] -= 1; grid[r][c] = "X"; total += v; } }); if (rowLeft.some((x) => x) || colLeft.some((x) => x)) return -1; return { coins: total, grid: grid.map((row) => row.join("")) }; }),
      ],
      hints: ["Nodes: source, rows, columns, sink; source → row r capacity a_r, column c → sink capacity b_c.", "Row r → column c: capacity 1, cost 1000 − coins[r][c].", "Push Σa units; if less gets through return −1; coins = 1000·Σa − cost, and flowing square edges are the X's."],
      cases: [
        example([[0, 1, 3, 2, 0], [1, 2, 2, 0, 1], [[2, 5, 1, 5, 1], [0, 2, 5, 1, 2], [3, 8, 9, 3, 5], [1, 4, 3, 7, 3], [0, 3, 6, 2, 8]]], { coins: 32, grid: [".....", "..X..", ".XX.X", "XX...", "....."] }, "CSES sample"),
        run(gridPuzzleII, [[1, 1], [1, 1], [[5, 4], [4, 1]]], "the richest square is a trap"),
        example([[2, 0], [0, 2], [[1, 1], [1, 1]]], -1, "impossible counts"),
        run(gridPuzzleII, (() => { const [rows, cols] = puzzleCounts(19800, 6, true); return [rows, cols, coinTable(19850, 6, 20)]; })(), "a 6 × 6 grid"),
        hidden("n = 50, time limit", () => PUZZLE_II_BIG()),
      ],
    },
    {
      id: "bit-substrings", title: "Bit Substrings", cses: { id: 2115, name: "Bit Substrings" },
      goal: "For each k = 0 … n, the number of non-empty substrings containing exactly k ones.",
      concept: "Split the string at its ones: let g_i be one more than the number of zeros between the i-th and (i + 1)-th one, with the two ends included. A substring with k ≥ 1 ones starts in gap i and ends in gap i + k, so count_k = Σ g_i·g_{i+k}. That is a correlation, and one FFT convolution of g with its reverse gives it for every k at once. Substrings without ones lie inside a single gap: Σ g_i(g_i − 1)/2.",
      functionName: "bitSubstrings", signature: "bitSubstrings(s) → counts",
      starterSource: starter("bitSubstrings", "s", "Gaps g (zeros + 1, ends included); counts[0] = Σ g(g − 1)/2; convolve(g, reversed g); counts[k] = product[ones − k]."),
      solve: bitSubstrings, comparator: "deep", dependencies: ["convolve"], brute: bitSubstringsBrute, small: (round) => [bitString(19900 + round, 1 + (round % 12))],
      reference: site("cp-algorithms · Multiplying polynomials", CP + "algebra/fft.html"),
      presets: { "CSES sample": { a: "101" }, "no ones": { a: "000" }, "all ones": { a: "1111" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("zeros-like-the-rest", "With k = 0 the substring starts and ends in the same gap, so it is g(g − 1)/2 pairs, not g².", bitSubstrings, [["gaps.forEach((g) => { out[0] += g * (g - 1) / 2; });", "gaps.forEach((g) => { out[0] += g * g; });"]]),
        variant("gaps-count-zeros", "A gap offers one more boundary than it has zeros: count zeros + 1 start or end choices.", bitSubstrings, [["const n = s.length, gaps = [1];", "const n = s.length, gaps = [0];"], ["gaps.push(1)", "gaps.push(0)"]]),
      ],
      hints: ["Walk the string: a 1 starts a new gap of size 1, a 0 grows the current gap.", "counts[0] = Σ g(g − 1)/2.", "For k ≥ 1 convolve g with reversed g and read index ones − k."],
      cases: [
        example(["101"], [1, 4, 1, 0], "CSES sample"),
        example(["000"], [6, 0, 0, 0], "no ones"),
        example(["1111"], [0, 4, 3, 2, 1], "all ones"),
        run(bitSubstrings, [bitString(19950, 30)], "thirty bits"),
        hidden("n = 2·10⁵, time limit", () => [BITS_BIG()]),
      ],
    },
    {
      id: "reversal-sorting", title: "Reversal Sorting", cses: { id: 2075, name: "Reversal Sorting" },
      goal: "At most n reversals [a, b] (1-based) that sort the permutation; any valid list is accepted.",
      concept: "Selection sort with reversals: for position i, reverse from i to wherever value i is now, which puts it in place, so at most n reversals. Finding the value quickly needs an implicit treap (keyed by position) that stores subtree sizes and minima and applies reversals lazily as flip flags. The smallest remaining value is found by walking towards the subtree minimum, and each reversal is a split, a flip and a merge.",
      functionName: "reversalSorting", signature: "reversalSorting(values) → reversals",
      starterSource: starter("reversalSorting", "values", "Implicit treap over the unsorted suffix with size, minimum and a lazy flip; find the index of the minimum, reverse that prefix, drop the first element."),
      solve: reversalSorting, comparator: "deep", accept: reversalSortingAccept, check: (args, out) => reversalSortingAccept(args, out) === true, small: (round) => [randomPermutation(20000 + round, 1 + (round % 9))],
      reference: site("cp-algorithms · Implicit treap, reversals", CP + "data_structures/treap.html"),
      presets: { "CSES sample": { a: [2, 3, 1, 4] }, "a swap is not a reversal": { a: [2, 4, 3, 1] }, "reversed": { a: [5, 4, 3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("uses-starting-positions", "Each reversal moves other values, so value i is no longer where it started; track the current positions.", function reversalSorting(values) { const where = []; values.forEach((v, i) => { where[v] = i + 1; }); const ops = []; for (let i = 1; i <= values.length; i += 1) if (where[i] > i) ops.push([i, where[i]]); return ops; }),
        diagnosis("tracks-a-swap", "A reversal turns the whole stretch around, not just its two ends; positions in the middle move too.", function reversalSorting(values) { const a = values.slice(), where = []; a.forEach((v, i) => { where[v] = i + 1; }); const ops = []; for (let i = 1; i <= a.length; i += 1) { const j = where[i]; if (j === i) continue; ops.push([i, j]); const v = a[i - 1]; a[j - 1] = v; where[v] = j; a[i - 1] = i; where[i] = i; } return ops; }),
      ],
      hints: ["Keep only the unsorted suffix in an implicit treap; value i is its minimum.", "Walk down using subtree minima (pushing flips) to find the index of the minimum.", "Reverse that prefix (split, flip, merge), record [i, i + index − 1], then drop the first element."],
      cases: [
        example([[2, 3, 1, 4]], [[1, 3], [2, 3]], "CSES sample"),
        example([[1, 2, 3]], [], "already sorted"),
        run(reversalSorting, [[2, 4, 3, 1]], "a swap is not a reversal"),
        run(reversalSorting, [randomPermutation(20100, 12)], "twelve values"),
        hidden("n = 2·10⁵, time limit", () => [REVERSAL_BIG()]),
      ],
    },
    {
      id: "book-shop-ii", title: "Book Shop II", cses: { id: 1159, name: "Book Shop II" },
      goal: "The most pages for a total price of at most x, when book i costs h_i, has s_i pages and k_i copies.",
      concept: "A bounded knapsack. For one book, the totals reachable with t copies step by h, so treat each residue r mod h on its own. Along it, the new table is dp_new[r + jh] = max over the last k + 1 positions j' of (dp[r + j'h] − j'·s), plus j·s. A monotonic deque keeps that sliding-window maximum, so each book costs O(x) instead of O(x·k).",
      functionName: "bookShopII", signature: "bookShopII(x, prices, pages, copies) → pages",
      starterSource: starter("bookShopII", "x, prices, pages, copies", "For each book and residue r: deque over j of dp[r + jh] − j·s, window k + 1; next[r + jh] = front + j·s."),
      solve: bookShopII, comparator: "scalar", brute: bookShopIIBrute, small: (round) => { const k = 1 + (round % 4); return [3 + (round % 20), smallList(20200 + round, k, 1, 6), smallList(20250 + round, k, 1, 9), smallList(20300 + round, k, 1, 3)]; },
      reference: book("7.4", "Knapsack problems"),
      presets: { "CSES sample": { a: [2, 6, 3], b: [8, 5, 4], c: [3, 5, 2] }, "one copy each": { a: [4, 3, 5], b: [9, 5, 8], c: [1, 1, 1] } },
      scene: { kind: "algo", view: "shop", handles: preset([{ id: "x", type: "slider", label: "budget x (rounded)", value: 10, min: 0, max: 30 }]), args: [{ fixture: "roundedX" }, { fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("unlimited-copies", "Each book has only k copies: the window may reach back at most k steps.", bookShopII, [["if (queueIndex[head] < j - k) head += 1;", ""]]),
        diagnosis("one-copy-each", "Several copies of the same book can be bought; this is a bounded knapsack, not a 0/1 one.", function bookShopII(x, prices, pages, copies) { const dp = new Array(x + 1).fill(0); prices.forEach((h, b) => { for (let c = x; c >= h; c -= 1) dp[c] = Math.max(dp[c], dp[c - h] + pages[b]); }); return dp[x]; }),
      ],
      hints: ["dp[c] = most pages with total price at most c; start with zeros.", "For a book (h, s, k) and residue r, value v_j = dp[r + jh] − j·s.", "next[r + jh] = max of v over j − k … j (monotonic deque) + j·s."],
      cases: [
        example([10, [2, 6, 3], [8, 5, 4], [3, 5, 2]], 28, "CSES sample"),
        example([9, [4, 3, 5], [9, 5, 8], [1, 1, 1]], 17, "one copy of each"),
        run(bookShopII, [50, smallList(20350, 6, 1, 12), smallList(20400, 6, 1, 30), smallList(20450, 6, 1, 5)], "six books"),
        hidden("n = 100, x = 10⁵, time limit", () => BOOK_BIG()),
      ],
    },
    {
      id: "gcd-subsets", title: "GCD Subsets", cses: { id: 3161, name: "GCD Subsets" },
      goal: "For each k = 1 … n, the number of non-empty subsets whose gcd is exactly k, modulo 10⁹ + 7 (every value is at most n).",
      concept: "Let c_d count the values divisible by d: 2^{c_d} − 1 non-empty subsets have a gcd that is a multiple of d. Going from d = n down to 1, subtract the subsets whose gcd is exactly 2d, 3d, … (already computed) to keep those with gcd exactly d. Summing over the multiples of every d is n·(1 + 1/2 + … ) = O(n log n).",
      functionName: "gcdSubsets", signature: "gcdSubsets(values) → counts",
      starterSource: starter("gcdSubsets", "values", "count[v]; powers of 2; for d = n … 1: m = Σ count[kd]; exact[d] = 2^m − 1 − Σ_{k ≥ 2} exact[kd]."),
      solve: gcdSubsets, comparator: "deep", brute: gcdSubsetsBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(20500 + round, n, 1, n)]; },
      reference: book("22.3", "Inclusion–exclusion"),
      presets: { "CSES sample": { a: [5, 4, 4, 2, 3] }, "all ones": { a: [1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("counts-multiples-too", "2^{c_d} − 1 counts subsets whose gcd is any multiple of d; subtract the exact counts of 2d, 3d, ….", gcdSubsets, [["for (let e = 2 * d; e <= n; e += d) ways = (ways - exact[e] + m) % m;", ""]]),
        variant("counts-the-empty-subset", "Only non-empty subsets have a gcd: use 2^{c_d} − 1.", gcdSubsets, [["let ways = (power[multiples] - 1 + m) % m;", "let ways = power[multiples] % m;"]]),
      ],
      hints: ["count[v] = how many times v appears; multiples of d contribute count[d] + count[2d] + ….", "All-divisible subsets: 2^m − 1.", "exact[d] = that minus exact[2d] + exact[3d] + …, going from d = n down."],
      cases: [
        example([[5, 4, 4, 2, 3]], [22, 4, 1, 3, 1], "CSES sample"),
        example([[1, 1]], [3, 0], "all ones"),
        run(gcdSubsets, [smallList(20600, 12, 1, 12)], "twelve values"),
        hidden("n = 2·10⁵, time limit", () => [GCD_BIG()]),
      ],
    },
    {
      id: "minimum-cost-pairs", title: "Minimum Cost Pairs", cses: { id: 3402, name: "Minimum Cost Pairs" },
      goal: "For k = 1 … ⌊n/2⌋, the smallest total |a − b| over k disjoint pairs.",
      concept: "Sort: some best pairing only joins neighbours, so the task is to choose k gaps between consecutive values with no two touching. Greedily take the cheapest gap, then replace it and its two neighbours with a single node worth left + right − itself. Taking that node later means undoing the first choice in favour of both neighbours. A heap with lazy deletion and a linked list make each step O(log n), and the running totals answer every k.",
      functionName: "minimumCostPairs", signature: "minimumCostPairs(values) → costs",
      starterSource: starter("minimumCostPairs", "values", "Sort; gaps with ∞ sentinels; heap of [gap, i]; pop the cheapest live gap, add it, set it to left + right − itself, delete the neighbours, push it back."),
      solve: minimumCostPairs, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: minimumCostPairsBrute, small: (round) => [smallList(20700 + round, 2 + (round % 7), 1, 12)],
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [3, 1, 2, 7, 9, 3, 4, 7] }, "four values": { a: [1, 2, 3, 10] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("gaps-may-share-an-element", "Two chosen gaps may not share a value: each number joins at most one pair.", function minimumCostPairs(values) { const s = values.slice().sort((p, q) => p - q), gaps = []; for (let i = 1; i < s.length; i += 1) gaps.push(s[i] - s[i - 1]); gaps.sort((p, q) => p - q); const out = []; let total = 0; for (let k = 0; k < Math.floor(s.length / 2); k += 1) { total += gaps[k]; out.push(total); } return out; }),
        variant("unsorted", "Pairs should join neighbours in sorted order; in the input order, neighbours can be far apart.", minimumCostPairs, [["const sorted = values.slice().sort((p, q) => p - q), n = sorted.length;", "const sorted = values.slice(), n = sorted.length;"]]),
      ],
      hints: ["Sort and take the n − 1 gaps; add ∞ at both ends.", "Pop the smallest gap still valid, add it to the running total and record the total.", "Replace it by left + right − itself, remove its two neighbours from the list, and push it again."],
      cases: [
        example([[3, 1, 2, 7, 9, 3, 4, 7]], [0, 0, 1, 6], "CSES sample"),
        example([[1, 5]], [4], "one pair"),
        run(minimumCostPairs, [[1, 2, 3, 10]], "the cheapest gap must be undone"),
        run(minimumCostPairs, [smallList(20800, 14, 1, 50)], "fourteen values"),
        hidden("n = 2·10⁵, time limit", () => [PAIRS_BIG()]),
      ],
    },
    {
      id: "same-sum-subsets", title: "Same Sum Subsets", cses: { id: 3425, name: "Same Sum Subsets" },
      goal: "Two disjoint non-empty subsets with equal sums, as [first, second] lists of values; any valid pair is accepted. The constraint Σ ≤ 2ⁿ − 2 guarantees one exists.",
      concept: "There are 2ⁿ subsets but at most 2ⁿ − 1 different sums, so two subsets share a sum; removing their common elements leaves two disjoint non-empty subsets. To find that sum without listing 2⁴⁰ subsets, bisect the range of sums, always keeping a half that holds more subsets than it has values. Counting subsets with sum at most X is a meet-in-the-middle pass over the sorted subset sums of the two halves. Finally find two (left, right) pairs with that sum.",
      functionName: "sameSumSubsets", signature: "sameSumSubsets(values) → [subset, subset]",
      starterSource: starter("sameSumSubsets", "values", "Subset sums of each half, sorted; count(≤ X) by two pointers; bisect [0, Σ] keeping the overfull half; find two pairs with that sum; drop shared elements."),
      solve: sameSumSubsets, comparator: "deep", accept: sameSumSubsetsAccept, check: (args, out) => sameSumSubsetsAccept(args, out) === true, small: (round) => [distinctSet(20900 + round, 3 + (round % 12))],
      reference: book("5.5", "Meet in the middle"),
      presets: { "CSES sample": { a: [1, 2, 3, 5, 7, 8] }, "the smallest set": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("keeps-common-elements", "Two different subsets with the same sum may overlap; remove what they share to make them disjoint.", sameSumSubsets, [["if (A.has(i) && !B.has(i)) onlyA.push(values[i]); if (B.has(i) && !A.has(i)) onlyB.push(values[i]);", "if (A.has(i)) onlyA.push(values[i]); if (B.has(i)) onlyB.push(values[i]);"]]),
        diagnosis("largest-against-greedy", "Filling the largest value with smaller ones greedily rarely hits the sum exactly; the pigeonhole argument is what guarantees a match.", function sameSumSubsets(values) { const sorted = values.slice().sort((p, q) => q - p), second = []; let room = sorted[0]; for (let i = 1; i < sorted.length; i += 1) if (sorted[i] <= room) { second.push(sorted[i]); room -= sorted[i]; } return [[sorted[0]], second]; }),
      ],
      hints: ["2ⁿ subsets, sums in [0, 2ⁿ − 2]: two must collide.", "count(≤ X) over pairs of half-subsets with a two-pointer sweep of the sorted halves; bisect towards the half with more subsets than values.", "At the single sum, pick two (left mask, right mask) pairs and remove the elements they share."],
      cases: [
        example([[1, 2, 3, 5, 7, 8]], [[2, 3], [5]], "CSES sample"),
        example([[1, 2, 3]], [[1, 2], [3]], "the smallest set"),
        run(sameSumSubsets, [[3, 9, 10, 6, 2, 4]], "overlapping subsets"),
        run(sameSumSubsets, [distinctSet(21000, 20)], "twenty values"),
        hidden("n = 40, time limit", () => [SAME_BIG()]),
      ],
    },
    {
      id: "mex-grid-queries", title: "Mex Grid Queries", cses: { id: 1157, name: "Mex Grid Queries" },
      goal: "The value at row y, column x of the grid where every square holds the smallest non-negative integer missing to its left and above it.",
      concept: "A square takes the mex of everything to its left and above: exactly the Grundy value of a two-pile Nim position (y − 1, x − 1), where a move shrinks one pile. By the Sprague–Grundy theorem that value is (y − 1) xor (x − 1). Filling the 4 × 4 corner by hand shows the xor table.",
      functionName: "mexGridQueries", signature: "mexGridQueries(y, x) → value",
      starterSource: starter("mexGridQueries", "y, x", "Return (y − 1) xor (x − 1)."),
      solve: mexGridQueries, comparator: "scalar", brute: mexGridQueriesBrute, small: (round) => [1 + (round % 13), 1 + ((round * 7) % 17)],
      reference: book("25.3", "Sprague–Grundy theorem"),
      scene: { kind: "algo", view: "number-grid", handles: [{ id: "x", type: "slider", label: "column x (rounded)", value: 5, min: 1, max: 16 }, { id: "y", type: "slider", label: "row y (rounded)", value: 3, min: 1, max: 16 }], args: [{ fixture: "roundedY" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("one-based-xor", "The xor rule works on zero-based coordinates: the top-left square (1, 1) holds 0.", function mexGridQueries(y, x) { return y ^ x; }),
        diagnosis("sum-minus-two", "Values do not grow along diagonals: a square equal to one already to its left or above is skipped, so the sum is wrong off the edges.", function mexGridQueries(y, x) { return y + x - 2; }),
      ],
      hints: ["Fill the first few rows by hand and look for a pattern.", "Row 1 is 0, 1, 2, …; row 2 is 1, 0, 3, 2, ….", "The grid is the xor table of y − 1 and x − 1."],
      cases: [
        example([3, 5], 6, "CSES sample"),
        example([1, 2], 1, "the first row"),
        example([4, 4], 0, "the diagonal"),
        run(mexGridQueries, [12, 7], "row 12, column 7"),
        hidden("y, x near 10⁹", () => [1000000000, 123456789]),
      ],
    },
    {
      id: "maximum-building-ii", title: "Maximum Building II", cses: { id: 1148, name: "Maximum Building II" },
      goal: "For every building size h × w, the number of places an all-empty h × w rectangle fits: n rows of m counts.",
      concept: "Take each row as the ground of a histogram of empty cells. Every rectangle standing on that row has a lowest column, made unique by taking the rightmost when heights tie. For column j with height H, the windows of width w containing j between its nearest lower columns form a trapezoid in w (1, 2, …, flat, …, 1), and each counts once for every height up to H. Record each trapezoid as four second-difference marks at height H. After all rows, prefix-sum twice over w and suffix-sum over heights.",
      functionName: "maximumBuildingII", signature: "maximumBuildingII(grid) → counts",
      starterSource: starter("maximumBuildingII", "grid", "Heights per row; nearest lower on the left (<) and right (≤); marks +1 at 1, −1 at min + 1, −1 at max + 1, +1 at a + b + 1 in row H; double prefix over w; suffix over H."),
      solve: maximumBuildingII, comparator: "deep", brute: maximumBuildingIIBrute, small: (round) => [forest(21100 + round, 1 + (round % 5), 1 + ((round * 3) % 6), 0.3)],
      reference: book("8.3", "Amortized analysis · largest rectangle"),
      presets: { "CSES sample": { a: ["...*.*.", ".*.....", ".......", "......*"] }, "all empty": { a: ["...", "..."] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("ties-counted-twice", "When two columns are equally low, the window must be credited to only one of them: break ties to one side.", maximumBuildingII, [["while (top && heights[stack[top - 1]] > heights[j]) top -= 1;", "while (top && heights[stack[top - 1]] >= heights[j]) top -= 1;"]]),
        variant("exact-height-only", "A column of height H also supports every shorter building: accumulate the counts from the tallest height down.", maximumBuildingII, [["acc[w] += count;", "acc[w] = count;"]]),
      ],
      hints: ["heights[j] = empty cells stacked up to this row in column j.", "For each j: a = j − (nearest lower to the left), b = (nearest lower-or-equal to the right) − j; windows of width w containing j form a trapezoid.", "Add the trapezoid's second differences to row H; then prefix twice over w and add rows from H = n down to 1."],
      cases: [
        example([["...*.*.", ".*.....", ".......", "......*"]], [[24, 17, 13, 9, 6, 3, 1], [16, 9, 7, 5, 3, 1, 0], [9, 3, 2, 1, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0]], "CSES sample"),
        example([["...", "..."]], [[6, 4, 2], [3, 2, 1]], "all empty"),
        example([["*"]], [[0]], "one tree"),
        run(maximumBuildingII, [forest(21200, 6, 8, 0.2)], "a 6 × 8 forest"),
        hidden("1000 × 1000, time limit", () => [FOREST_BIG()]),
      ],
    },
    {
      id: "stick-divisions", title: "Stick Divisions", cses: { id: 1161, name: "Stick Divisions" },
      goal: "The smallest total cost of cutting a stick of length x into the given lengths, where each cut costs the length of the stick being cut.",
      concept: "Read the cuts backwards as joins: joining two sticks costs their total length, and a plan is a binary tree whose cost is Σ length × depth. That is exactly Huffman coding, so repeatedly joining the two shortest sticks is optimal.",
      functionName: "stickDivisions", signature: "stickDivisions(x, lengths) → cost",
      starterSource: starter("stickDivisions", "x, lengths", "Min-heap of lengths; while two or more: pop two, add their sum to the cost, push the sum."),
      solve: stickDivisions, comparator: "scalar", dependencies: ["heap-push", "heap-pop"], brute: stickDivisionsBrute, small: (round) => { const lengths = smallList(21300 + round, 1 + (round % 7), 1, 9); return [lengths.reduce((s, v) => s + v, 0), lengths]; },
      reference: book("6.5", "Data compression · Huffman coding"),
      presets: { "CSES sample": { a: [2, 3, 3], b: 8 }, "four equal": { a: [1, 1, 1, 1], b: 4 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetA" }] },
      diagnoses: [
        diagnosis("peels-off-the-largest", "Cutting off the largest piece each time keeps paying for the long remainder; balanced cuts are cheaper.", function stickDivisions(x, lengths) { const s = lengths.slice().sort((p, q) => q - p); let left = x, cost = 0; for (let i = 0; i < s.length - 1; i += 1) { cost += left; left -= s[i]; } return cost; }),
        diagnosis("joins-in-sorted-order", "Joining the growing stick with the next smallest piece is not Huffman: always join the two shortest sticks available, including joined ones.", function stickDivisions(x, lengths) { const s = lengths.slice().sort((p, q) => p - q); let joined = s[0], cost = 0; for (let i = 1; i < s.length; i += 1) { joined += s[i]; cost += joined; } return cost; }),
      ],
      hints: ["Think backwards: a cut undone is a join that costs the joined length.", "Always join the two shortest sticks (a min-heap).", "Add each join's length; stop when one stick of length x remains."],
      cases: [
        example([8, [2, 3, 3]], 13, "CSES sample"),
        example([4, [1, 1, 1, 1]], 8, "four equal pieces"),
        example([7, [7]], 0, "no cuts"),
        run(stickDivisions, [60, [2, 5, 9, 12, 14, 18]], "six pieces"),
        hidden("n = 2·10⁵, time limit", () => [CUTS_BIG().reduce((s, v) => s + v, 0), CUTS_BIG()]),
      ],
    },
    {
      id: "stick-difference", title: "Stick Difference", cses: { id: 3401, name: "Stick Difference" },
      goal: "For k = 1 … m, the smallest possible difference between the longest and the shortest piece after exactly k cuts (pieces stay positive integers).",
      concept: "Pieces fit in [L, U] exactly when every stick has a piece count p with a/U ≤ p ≤ a/L and the counts can total n + k. Two greedy heaps give the extremes for each k: the smallest possible longest piece U* (always cut the stick with the longest pieces) and the largest possible shortest piece T. With U fixed, the best shortest piece is Λ(U) = min over sticks of ⌊a/⌈a/U⌉⌋, a staircase that only rises with U. So the answer is either max(U*, U_T) − T, where U_T is where Λ reaches T, or U − Λ(U) at a staircase step between U* and U_T. A heap sweeps the steps and a sparse table answers each k.",
      functionName: "stickDifference", signature: "stickDifference(sticks, m) → differences",
      starterSource: starter("stickDifference", "sticks, m", "U*[k] by greedy cutting; T[k] = the (n + k)-th largest ⌊a/q⌋; sweep Λ(U)'s steps with a heap; per k compare max(U*, U_T) − T with range minima of U − Λ(U)."),
      solve: stickDifference, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: stickDifferenceBrute, small: (round) => { const count = 1 + (round % 3), sticks = smallList(21400 + round, count, 2, 14), total = sticks.reduce((s, v) => s + v, 0); return [sticks, Math.max(1, Math.min(6, total - count))]; },
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "CSES sample": { a: [7, 3, 2], b: 3 }, "two sticks": { a: [8, 5], b: 4 }, "the bound is not reached": { a: [9, 15], b: 4 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("measures-the-greedy-cut", "Cutting to minimise the longest piece can leave a needlessly short piece; the best difference may use other cuts.", function stickDifference(sticks, m) { const pieces = sticks.map(() => 1), heap = []; sticks.forEach((a, i) => heapPush(heap, [-a, i])); let low = sticks.reduce((s, a) => Math.min(s, a), Infinity); const out = []; for (let k = 1; k <= m; k += 1) { const i = heapPop(heap).item[1]; pieces[i] += 1; low = Math.min(low, Math.floor(sticks[i] / pieces[i])); heapPush(heap, [-Math.ceil(sticks[i] / pieces[i]), i]); out.push(-heap[0][0] - low); } return out; }),
        variant("lower-bound-only", "U* − T is only a bound: the cuts that give the shortest longest piece and the longest shortest piece may not be the same cuts.", stickDifference, [["let best = Math.max(U, starts[cap]) - T;", "let best = U - T;"]]),
      ],
      hints: ["U*[k]: repeatedly add a piece to the stick with the largest ⌈a/p⌉; T[k]: the (n + k)-th largest value of ⌊a/q⌋ over sticks and q.", "Λ(U) = min ⌊a/⌈a/U⌉⌋ rises in steps; move the sticks at the minimum to their next step with a heap.", "Answer(k) = min(max(U*, U_T) − T, U* − Λ(U*), min over steps before U_T of step − Λ)."],
      cases: [
        example([[7, 3, 2], 3], [2, 1, 2], "CSES sample"),
        example([[8, 5], 4], [1, 2, 1, 1], "two sticks"),
        example([[9, 15], 4], [2, 4, 1, 2], "the bound is not reached"),
        run(stickDifference, [smallList(21500, 6, 5, 60), 12], "six sticks, twelve cuts"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [STICKS_BIG(), 200000]),
      ],
    },
    {
      id: "coding-company", title: "Coding Company", cses: { id: 1665, name: "Coding Company" },
      goal: "The number of ways to split the coders into teams whose penalties (best minus worst skill) add up to at most x, modulo 10⁹ + 7.",
      concept: "Sort the skills and add coders from the weakest, tracking how many teams are still open. Between consecutive coders, charge the gap once for every open team: an open team's range grows by exactly that gap, so each team ends up paying its max − min. A new coder can start a team and close it at once, start one that stays open, join one of the j open teams and stay, or join one and close it. That gives dp[j][penalty] in O(n²·x).",
      functionName: "codingCompany", signature: "codingCompany(skills, x) → count",
      starterSource: starter("codingCompany", "skills, x", "Sort; dp[open][penalty]; per coder add open·gap, then alone or join-and-stay (×(j + 1)), open (j + 1), join-and-close (×j, j − 1)."),
      solve: codingCompany, comparator: "scalar", brute: codingCompanyBrute, small: (round) => [smallList(21600 + round, 1 + (round % 7), 0, 9), round % 12],
      reference: book("7.1", "Dynamic programming · counting solutions"),
      presets: { "CSES sample": { a: [2, 5, 3], b: 2 }, "four coders": { a: [4, 4, 5, 3], b: 4 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("forgets-which-team", "Joining is a choice among the j open teams: multiply those ways by j.", codingCompany, [["ways * (j + 1)) % mod", "ways * (j ? 2 : 1)) % mod"], ["ways * j) % mod", "ways) % mod"]]),
        variant("unsorted", "Charging gaps to open teams only measures max − min when coders arrive in skill order: sort first.", codingCompany, [["t = skills.slice().sort((p, q) => p - q)", "t = skills.slice()"]]),
      ],
      hints: ["Sort; dp[j][s] = ways with j open teams and penalty s so far.", "Before coder i, every open team pays t[i] − t[i−1]: s += j·gap.", "Transitions: dp[j] × (j + 1) (alone, or join and stay), dp[j + 1] (open), dp[j − 1] × j (join and close); answer Σ dp[0][s ≤ x]."],
      cases: [
        example([[2, 5, 3], 2], 3, "CSES sample"),
        example([[7], 0], 1, "one coder"),
        run(codingCompany, [[4, 4, 5, 3], 4], "four coders"),
        run(codingCompany, [smallList(21700, 12, 0, 20), 15], "twelve coders"),
        hidden("n = 100, x = 5000, time limit", () => [CODERS_BIG(), 5000]),
      ],
    },
    {
      id: "two-stacks-sorting", title: "Two Stacks Sorting", cses: { id: 2402, name: "Two Stacks Sorting" },
      goal: "For each number of the input list, the stack (1 or 2) it goes to so that the output can come out sorted, or null if no assignment works; any valid assignment is accepted.",
      concept: "Two numbers at positions i < j clash when x_i < x_j and a later number is smaller than both. Then i sits under j but must leave first, and j cannot leave before that smaller number arrives. The input is sortable exactly when this clash graph is bipartite (Even and Itai), and any 2-colouring works. Number j clashes with every earlier value in (smallest later value, x_j), so all of those share one colour. A parity union-find merges them by linking only neighbouring values in the range that are not linked yet; Fenwick trees find neighbours and ranges in O(log n).",
      functionName: "twoStacksSorting", signature: "twoStacksSorting(values) → stacks or null",
      starterSource: starter("twoStacksSorting", "values", "suffixMin; for each j: earlier values in (suffixMin[j+1], x_j) — link unlinked neighbours as the same colour and j as the opposite one; insert x_j."),
      solve: twoStacksSorting, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix", "fenwick-kth"], accept: twoStacksSortingAccept, check: viaBrute(twoStacksSortingAccept, twoStacksSortingBrute), small: (round) => [randomPermutation(21800 + round, 2 + (round % 9))],
      reference: book("12.3", "Applications · bipartiteness check"),
      presets: { "CSES sample": { a: [2, 3, 1, 5, 4] }, "impossible": { a: [4, 5, 2, 6, 1, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("one-stack-only", "One stack sorts only lists without the 2-3-1 pattern; the second stack is there for the clashing numbers.", function twoStacksSorting(values) { return values.map(() => 1); }),
        diagnosis("alternates-stacks", "Alternating stacks ignores which numbers clash: two clashing numbers can still land together.", function twoStacksSorting(values) { return values.map((v, i) => 1 + (i % 2)); }),
      ],
      hints: ["i < j clash when x_i < x_j and min(x after j) < x_i.", "For j, every earlier value in (min after j, x_j) gets the colour opposite to j.", "Parity union-find; link consecutive present values in that range (skipping pairs already linked), then j against any one of them."],
      cases: [
        example([[2, 3, 1, 5, 4]], [1, 2, 1, 1, 2], "CSES sample"),
        example([[4, 5, 2, 6, 1, 3]], null, "impossible"),
        example([[1, 2, 3]], [1, 1, 1], "already sorted"),
        run(twoStacksSorting, [sortableByTwoStacks(21900, 12)], "twelve numbers"),
        hidden("n = 2·10⁵ sortable, time limit", () => [STACKS_BIG()]),
        hidden("n = 2·10⁵ random", () => [STACKS_NO()]),
      ],
    },
  ];
  core.define("additional-ii", ADDITIONAL_II);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

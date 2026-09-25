(function defineAlgoSection(core) {
  "use strict";
  const { lazy, rng, randomInts, randomPermutation, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { lowerBound, fenwickAdd, fenwickPrefix, heapPush, heapPop, crossSign, mulMod, modPow, matrixPower } = core.shared;

  // ------------------------------------------------------------------ 16 · additional problems I · references
  function shortestSubsequence(s) {
    // Cut the string into chunks that each hold all four letters; the letter that completes a chunk extends the answer.
    const seen = new Set();
    let out = "";
    for (let i = 0; i < s.length; i += 1) {
      seen.add(s[i]);
      if (seen.size === 4) { out += s[i]; seen.clear(); }
    }
    for (const c of "ACGT") if (!seen.has(c)) return out + c;
    return out;
  }
  function distinctValuesSum(values) {
    const n = values.length, last = new Map();
    // Credit every distinct value of a subarray to its first occurrence there.
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      const previous = last.has(values[i]) ? last.get(values[i]) : -1;
      total += (i - previous) * (n - i);
      last.set(values[i], i);
    }
    return total;
  }
  function distinctValuesSplits(values) {
    const m = 1000000007, n = values.length, last = new Map();
    // ways[i] = splits of the first i values; the last segment can start anywhere after the window's left edge.
    const prefix = new Array(n + 2).fill(0);
    prefix[1] = 1;
    let left = 0, ways = 1;
    for (let i = 1; i <= n; i += 1) {
      const v = values[i - 1];
      if (last.has(v)) left = Math.max(left, last.get(v));
      last.set(v, i);
      ways = (prefix[i] - prefix[left] + m) % m;
      prefix[i + 1] = (prefix[i] + ways) % m;
    }
    return ways;
  }
  function swapGame(grid) {
    const powers = [];
    for (let p = 0, v = 1; p < 9; p += 1, v *= 9) powers.push(v);
    const encode = (cells) => cells.reduce((sum, c, p) => sum + (c - 1) * powers[p], 0);
    const start = encode(grid.flat()), goal = encode([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const pairs = [];
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) { if (c < 2) pairs.push([3 * r + c, 3 * r + c + 1]); if (r < 2) pairs.push([3 * r + c, 3 * r + c + 3]); }
    // Breadth-first search over the 9! arrangements, each stored as one base-9 number.
    const dist = new Map([[start, 0]]);
    let frontier = [start];
    while (frontier.length) {
      const next = [];
      for (const state of frontier) {
        if (state === goal) return dist.get(state);
        const d = dist.get(state) + 1;
        for (const [p, q] of pairs) {
          const dp = Math.floor(state / powers[p]) % 9, dq = Math.floor(state / powers[q]) % 9;
          const swapped = state + (dq - dp) * powers[p] + (dp - dq) * powers[q];
          if (!dist.has(swapped)) { dist.set(swapped, d); next.push(swapped); }
        }
      }
      frontier = next;
    }
    return -1;
  }
  function beautifulPermutationII(n) {
    if (n === 1) return [1];
    // Take the smallest usable value each time; only the last few values need a real search.
    const tail = Math.min(n, 8), used = new Uint8Array(n + 2), out = [];
    let smallest = 1;
    while (n - out.length > tail) {
      while (used[smallest]) smallest += 1;
      const last = out.length ? out[out.length - 1] : -5;
      let v = smallest;
      while (used[v] || Math.abs(v - last) === 1) v += 1;
      used[v] = 1;
      out.push(v);
    }
    const rest = [];
    for (let v = 1; v <= n; v += 1) if (!used[v]) rest.push(v);
    const pick = [], taken = new Array(rest.length).fill(false);
    const search = () => {
      if (pick.length === rest.length) return true;
      const previous = pick.length ? pick[pick.length - 1] : (out.length ? out[out.length - 1] : -5);
      for (let i = 0; i < rest.length; i += 1) {
        if (taken[i] || Math.abs(rest[i] - previous) === 1) continue;
        taken[i] = true; pick.push(rest[i]);
        if (search()) return true;
        pick.pop(); taken[i] = false;
      }
      return false;
    };
    return search() ? out.concat(pick) : null;
  }
  function multiplicationTable(n) {
    const target = (n * n + 1) / 2;
    // The smallest x with at least half the table ≤ x; row i holds min(n, ⌊x / i⌋) such entries.
    let lo = 1, hi = n * n;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      let count = 0;
      for (let i = 1; i <= n && count < target; i += 1) count += Math.min(n, Math.floor(mid / i));
      if (count >= target) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
  function bubbleSortRoundsI(values) {
    const n = values.length;
    // An element moves left at most one step per round, so the rounds are the longest leftward trip in the stable order.
    const order = values.map((v, i) => i).sort((p, q) => values[p] - values[q] || p - q);
    let rounds = 0;
    order.forEach((i, target) => { rounds = Math.max(rounds, i - target); });
    return rounds;
  }
  function bubbleSortRoundsII(values, k) {
    const n = values.length, rounds = Math.min(k, n);
    // After k rounds, position j holds the smallest value still left among the first j + k + 1.
    const heap = [], out = [];
    for (let i = 0; i < Math.min(rounds, n); i += 1) heapPush(heap, [values[i]]);
    for (let j = 0; j < n; j += 1) {
      if (j + rounds < n) heapPush(heap, [values[j + rounds]]);
      out.push(heapPop(heap).item[0]);
    }
    return out;
  }
  function dominanceMax(points, queries) {
    // Sweep by x; a Fenwick tree over compressed y keeps the largest x + y seen so far per prefix of y.
    const ys = Array.from(new Set(points.map((p) => p[1]).concat(queries.map((q) => q[1])))).sort((p, q) => p - q);
    const index = new Map(ys.map((y, i) => [y, i + 1]));
    const tree = new Float64Array(ys.length + 1).fill(-1);
    const events = [];
    points.forEach((p) => events.push([p[0], 0, p[1], p[0] + p[1]]));
    queries.forEach((q, i) => events.push([q[0], 1, q[1], i]));
    events.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const out = new Array(queries.length).fill(-1);
    events.forEach(([x, kind, y, payload]) => {
      if (kind === 0) { for (let i = index.get(y); i < tree.length; i += i & (-i)) if (payload > tree[i]) tree[i] = payload; }
      else { let best = -1; for (let i = index.get(y); i > 0; i -= i & (-i)) if (tree[i] > best) best = tree[i]; out[payload] = best; }
    });
    return out;
  }
  function nearestCampsitesI(reserved, free) {
    const C = 2000001;
    const nearest = new Array(free.length).fill(Infinity);
    // Each reflection turns one quadrant into "down and left", where the distance is (x + y) − (x' + y').
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
      const flip = (p) => [sx > 0 ? p[0] : C - p[0], sy > 0 ? p[1] : C - p[1]];
      const queries = free.map(flip), found = dominanceMax(reserved.map(flip), queries);
      found.forEach((value, i) => { if (value >= 0) nearest[i] = Math.min(nearest[i], queries[i][0] + queries[i][1] - value); });
    });
    let best = 0;
    nearest.forEach((d) => { if (d > best) best = d; });
    return best;
  }
  function nearestCampsitesII(reserved, free) {
    const C = 2000001;
    const nearest = new Array(free.length).fill(Infinity);
    // Each reflection turns one quadrant into "down and left", where the distance is (x + y) − (x' + y').
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
      const flip = (p) => [sx > 0 ? p[0] : C - p[0], sy > 0 ? p[1] : C - p[1]];
      const queries = free.map(flip), found = dominanceMax(reserved.map(flip), queries);
      found.forEach((value, i) => { if (value >= 0) nearest[i] = Math.min(nearest[i], queries[i][0] + queries[i][1] - value); });
    });
    return nearest;
  }
  function advertisement(heights) {
    const n = heights.length, stack = [];
    let best = 0;
    // Each board is the lowest of the widest span where no board is lower; a monotonic stack finds both ends.
    for (let i = 0; i <= n; i += 1) {
      const h = i < n ? heights[i] : 0;
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const top = stack.pop(), left = stack.length ? stack[stack.length - 1] : -1;
        best = Math.max(best, heights[top] * (i - left - 1));
      }
      stack.push(i);
    }
    return best;
  }
  function specialSubstrings(s) {
    const letters = Array.from(new Set(s)).sort();
    const count = new Map(letters.map((c) => [c, 0]));
    // A substring is special when every letter's count grows by the same amount: equal difference vectors at its ends.
    const key = () => letters.map((c) => count.get(c) - count.get(letters[0])).join(",");
    const seen = new Map([[key(), 1]]);
    let total = 0;
    for (const c of s) {
      count.set(c, count.get(c) + 1);
      const k = key(), before = seen.get(k) || 0;
      total += before;
      seen.set(k, before + 1);
    }
    return total;
  }
  function countingLcmArrays(tests) {
    const m = 1000000007;
    const limit = 31623, sieve = new Uint8Array(limit + 1), primes = [];
    for (let p = 2; p <= limit; p += 1) { if (sieve[p]) continue; primes.push(p); for (let q = p * p; q <= limit; q += p) sieve[q] = 1; }
    return tests.map(([n, k]) => {
      // Primes are independent: exponents may drop below e only where both neighbours keep e.
      let rest = k, answer = 1;
      const exponents = [];
      for (const p of primes) {
        if (p * p > rest) break;
        let e = 0;
        while (rest % p === 0) { rest /= p; e += 1; }
        if (e) exponents.push(e);
      }
      if (rest > 1) exponents.push(1);
      exponents.forEach((e) => {
        const step = matrixPower([[1, 1], [e % m, 0]], n - 1, m);
        const top = (step[0][0] + mulMod(step[0][1], e, m)) % m, low = (step[1][0] + mulMod(step[1][1], e, m)) % m;
        answer = mulMod(answer, (top + low) % m, m);
      });
      return answer;
    });
  }
  function squareSubsets(values) {
    const m = 1000000007, top = 5000;
    const sieve = new Uint8Array(top + 1), primes = [];
    for (let p = 2; p <= top; p += 1) { if (sieve[p]) continue; primes.push(p); for (let q = p * p; q <= top; q += p) sieve[q] = 1; }
    const words = Math.ceil(primes.length / 32);
    // Each number is the parity vector of its prime exponents; square products are the subsets xoring to zero.
    const basis = new Array(primes.length).fill(null);
    let rank = 0;
    values.forEach((x) => {
      const vector = new Int32Array(words);
      let rest = x;
      primes.forEach((p, bit) => { if (p > rest) return; let odd = 0; while (rest % p === 0) { rest /= p; odd ^= 1; } if (odd) vector[bit >> 5] ^= 1 << (bit & 31); });
      for (let w = words - 1; w >= 0; w -= 1) {
        while (vector[w] !== 0) {
          const bit = w * 32 + (31 - Math.clz32(vector[w]));
          if (!basis[bit]) { basis[bit] = vector; rank += 1; w = -1; break; }
          for (let t = 0; t <= w; t += 1) vector[t] ^= basis[bit][t];
        }
      }
    });
    return modPow(2, values.length - rank, m);
  }
  function subarraySumConstraints(n, constraints) {
    // Prefix sums P[0..n]: each constraint fixes P[r] − P[l − 1]; a weighted union-find checks they agree.
    const parent = [], offset = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); offset.push(0); }
    const find = (v) => {
      const path = [];
      while (parent[v] !== v) { path.push(v); v = parent[v]; }
      for (let i = path.length - 1; i >= 0; i -= 1) { const u = path[i]; if (parent[u] !== v) { offset[u] += offset[parent[u]]; parent[u] = v; } }
      return v;
    };
    for (const [l, r, s] of constraints) {
      const a = find(l - 1), b = find(r);
      if (a === b) { if (offset[r] - offset[l - 1] !== s) return null; continue; }
      parent[b] = a; offset[b] = offset[l - 1] + s - offset[r];
    }
    const prefix = [];
    for (let v = 0; v <= n; v += 1) { find(v); prefix.push(offset[v]); }
    const out = [];
    for (let i = 1; i <= n; i += 1) out.push(prefix[i] - prefix[i - 1]);
    return out;
  }
  function waterContainersMoves(a, b, x) {
    if (x > a) return -1;
    const width = b + 1, states = (a + 1) * width;
    const dist = new Float64Array(states).fill(Infinity), via = new Int32Array(states).fill(-1), how = new Int8Array(states);
    const names = ["FILL A", "FILL B", "EMPTY A", "EMPTY B", "MOVE A B", "MOVE B A"];
    // Dial's algorithm: every move costs at most 1000 units, so buckets indexed by distance mod 1001 replace a heap.
    const buckets = [];
    for (let i = 0; i <= 1000; i += 1) buckets.push([]);
    dist[0] = 0; buckets[0].push(0);
    let pending = 1, goal = -1;
    for (let d = 0; pending > 0; d += 1) {
      const bucket = buckets[d % 1001];
      while (bucket.length) {
        const state = bucket.pop();
        pending -= 1;
        if (dist[state] !== d) continue;
        const A = Math.floor(state / width), B = state % width;
        if (A === x) { goal = state; pending = 0; break; }
        const pour = [[a, B, a - A], [A, b, b - B], [0, B, A], [A, 0, B], [A - Math.min(A, b - B), B + Math.min(A, b - B), Math.min(A, b - B)], [A + Math.min(B, a - A), B - Math.min(B, a - A), Math.min(B, a - A)]];
        pour.forEach(([nA, nB, cost], kind) => {
          if (cost <= 0) return;
          const next = nA * width + nB;
          if (d + cost < dist[next]) { dist[next] = d + cost; via[next] = state; how[next] = kind; buckets[(d + cost) % 1001].push(next); pending += 1; }
        });
      }
      if (goal >= 0) break;
    }
    if (goal < 0) return -1;
    const moves = [];
    for (let s = goal; s !== 0; s = via[s]) moves.push(names[how[s]]);
    return { total: dist[goal], moves: moves.reverse() };
  }
  function waterContainersQueries(tests) {
    const gcd = (p, q) => { while (q) { const t = p % q; p = q; q = t; } return p; };
    // Container A can hold exactly the multiples of gcd(a, b) that fit in it.
    return tests.map(([a, b, x]) => x <= a && x % gcd(a, b) === 0);
  }
  function stackWeights(n, moves) {
    // D[j] = (left coins ≥ j) − (right coins ≥ j); the left stack is surely heavier when D ≥ 0 everywhere and > 0 somewhere.
    let size = 1;
    while (size < n) size *= 2;
    const low = new Float64Array(2 * size), high = new Float64Array(2 * size), pending = new Float64Array(2 * size);
    const add = (node, lo, hi, r, delta) => {
      if (lo > r) return;
      if (hi <= r) { low[node] += delta; high[node] += delta; pending[node] += delta; return; }
      const mid = (lo + hi) >> 1;
      add(2 * node, lo, mid, r, delta);
      add(2 * node + 1, mid + 1, hi, r, delta);
      low[node] = Math.min(low[2 * node], low[2 * node + 1]) + pending[node];
      high[node] = Math.max(high[2 * node], high[2 * node + 1]) + pending[node];
    };
    // Coin c on a stack adds ±1 to D[1..c]; positions past n stay 0, which never changes the verdict.
    return moves.map(([coin, stack]) => {
      add(1, 1, size, coin, stack === 1 ? 1 : -1);
      if (low[1] >= 0 && high[1] > 0) return ">";
      if (high[1] <= 0 && low[1] < 0) return "<";
      return "?";
    });
  }
  function maximumAverageSubarrays(values) {
    const n = values.length;
    const prefix = [0];
    for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]);
    // The best start for index i is where a line from (i, P_i) touches the lower hull of earlier prefix points.
    const hull = [0], out = [];
    const cross = (o, a, b) => crossSign(a - o, prefix[a] - prefix[o], b - o, prefix[b] - prefix[o]);
    for (let i = 1; i <= n; i += 1) {
      let lo = 0, hi = hull.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        // Moving to the next hull point helps only when it lies strictly below the line towards i.
        if (cross(hull[mid], hull[mid + 1], i) > 0) lo = mid + 1; else hi = mid;
      }
      out.push(i - hull[lo]);
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], i) <= 0) hull.pop();
      hull.push(i);
    }
    return out;
  }
  function subsetsWithFixedAverage(values, a) {
    const m = 1000000007;
    const up = [], down = [];
    let zeros = 0;
    values.forEach((x) => { if (x > a) up.push(x - a); else if (x < a) down.push(a - x); else zeros += 1; });
    // Average a means the excesses above a balance the shortfalls below it; count both sides by subset sum.
    const cap = Math.min(up.reduce((s, v) => s + v, 0), down.reduce((s, v) => s + v, 0));
    const ways = (list) => {
      const table = new Int32Array(cap + 1);
      table[0] = 1;
      list.forEach((v) => { for (let s = cap; s >= v; s -= 1) { const t = table[s] + table[s - v]; table[s] = t >= m ? t - m : t; } });
      return table;
    };
    const left = ways(up), right = ways(down);
    let balanced = 0;
    for (let s = 0; s <= cap; s += 1) balanced = (balanced + mulMod(left[s], right[s], m)) % m;
    return (mulMod(balanced, modPow(2, zeros, m), m) - 1 + m) % m;
  }
  function twoArrayAverage(first, second) {
    const n = first.length;
    const sumA = [0], sumB = [0];
    for (let i = 0; i < n; i += 1) { sumA.push(sumA[i] + first[i]); sumB.push(sumB[i] + second[i]); }
    // Average ≥ λ exactly when max_i (A_i − λ i) + max_j (B_j − λ j) ≥ 0, so binary search on λ.
    const bestOf = (sums, lambda) => { let best = 1, value = -Infinity; for (let i = 1; i <= n; i += 1) { const v = sums[i] - lambda * i; if (v > value) { value = v; best = i; } } return [value, best]; };
    let lo = 0, hi = 1e9;
    for (let round = 0; round < 100; round += 1) {
      const mid = (lo + hi) / 2;
      if (bestOf(sumA, mid)[0] + bestOf(sumB, mid)[0] >= 0) lo = mid; else hi = mid;
    }
    return [bestOf(sumA, lo)[1], bestOf(sumB, lo)[1]];
  }
  function pyramidArray(values) {
    const n = values.length;
    const order = values.map((v, i) => i).sort((p, q) => values[p] - values[q]);
    const tree = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1);
    // The smallest value must reach one end; it passes every larger value on the cheaper side.
    let total = 0, remaining = n;
    order.forEach((i) => {
      const left = fenwickPrefix(tree, i), right = remaining - fenwickPrefix(tree, i + 1);
      total += Math.min(left, right);
      fenwickAdd(tree, i + 1, -1);
      remaining -= 1;
    });
    return total;
  }
  function permutationSubsequence(a, b) {
    const position = new Map(b.map((v, i) => [v, i]));
    // Common elements, read in a's order, form a common subsequence exactly when their positions in b increase.
    const items = a.filter((v) => position.has(v));
    const tails = [], tailIndex = [], previous = new Array(items.length).fill(-1);
    items.forEach((v, i) => {
      const p = position.get(v), at = lowerBound(tails, p);
      tails[at] = p; tailIndex[at] = i;
      previous[i] = at > 0 ? tailIndex[at - 1] : -1;
    });
    const sequence = [];
    for (let i = tails.length ? tailIndex[tails.length - 1] : -1; i >= 0; i = previous[i]) sequence.push(items[i]);
    return { length: tails.length, sequence: sequence.reverse() };
  }
  function bitInversions(bits, changes) {
    const n = bits.length;
    let size = 1;
    while (size < n) size *= 2;
    const length = new Int32Array(2 * size), prefix = new Int32Array(2 * size), suffix = new Int32Array(2 * size), best = new Int32Array(2 * size);
    const first = new Int8Array(2 * size), last = new Int8Array(2 * size);
    const pull = (v) => {
      const l = 2 * v, r = 2 * v + 1;
      if (!length[r]) { length[v] = length[l]; prefix[v] = prefix[l]; suffix[v] = suffix[l]; best[v] = best[l]; first[v] = first[l]; last[v] = last[l]; return; }
      // A run can cross the middle only when the two halves meet with the same bit.
      const joins = last[l] === first[r];
      length[v] = length[l] + length[r];
      first[v] = first[l]; last[v] = last[r];
      prefix[v] = prefix[l] === length[l] && joins ? length[l] + prefix[r] : prefix[l];
      suffix[v] = suffix[r] === length[r] && joins ? length[r] + suffix[l] : suffix[r];
      best[v] = Math.max(best[l], best[r], joins ? suffix[l] + prefix[r] : 0);
    };
    const current = bits.split("").map((c) => (c === "1" ? 1 : 0));
    for (let i = 0; i < n; i += 1) { const v = size + i; length[v] = prefix[v] = suffix[v] = best[v] = 1; first[v] = last[v] = current[i]; }
    for (let v = size - 1; v >= 1; v -= 1) pull(v);
    return changes.map((x) => {
      let v = size + x - 1;
      current[x - 1] ^= 1; first[v] = last[v] = current[x - 1];
      for (v >>= 1; v >= 1; v >>= 1) pull(v);
      return best[1];
    });
  }
  function writingNumbers(n) {
    const limit = BigInt(n);
    // Key 1 is always the busiest, so find the last x whose numbers 1..x use at most n ones.
    const ones = (x) => {
      let total = 0n;
      for (let place = 1n; place <= x; place *= 10n) {
        const high = x / (place * 10n), digit = (x / place) % 10n, low = x % place;
        total += high * place + (digit > 1n ? place : digit === 1n ? low + 1n : 0n);
      }
      return total;
    };
    let lo = 0n, hi = 10n * limit + 10n;
    while (lo < hi) {
      const mid = (lo + hi + 1n) / 2n;
      if (ones(mid) <= limit) lo = mid; else hi = mid - 1n;
    }
    return lo.toString();
  }
  function letterPairMoveGame(n, start) {
    const code = (s) => Uint8Array.from(s, (c) => (c === "A" ? 1 : c === "B" ? 2 : 0));
    const text = (cells) => Array.from(cells, (c) => (c === 1 ? "A" : c === 2 ? "B" : ".")).join("");
    const score = (cells) => {
      let seen = 0, misplaced = 0, inversions = 0, bs = 0;
      for (let i = 0; i < cells.length; i += 1) { const c = cells[i]; if (!c) continue; if (seen < n - 1 && c === 2) misplaced += 1; seen += 1; if (c === 2) bs += 1; else inversions += bs; }
      return misplaced * 100000 + inversions;
    };
    const gapOf = (cells) => { let g = 0; while (cells[g] || cells[g + 1]) g += 1; return g; };
    const shift = (cells, i, g) => { cells[g] = cells[i]; cells[g + 1] = cells[i + 1]; cells[i] = 0; cells[i + 1] = 0; };
    if (n <= 3) {
      // Tiny boards: breadth-first search decides, and proves the impossible starts.
      const from = new Map([[start, null]]), queue = [start];
      for (let h = 0; h < queue.length; h += 1) {
        const cells = code(queue[h]);
        if (score(cells) === 0) { const path = []; for (let s = queue[h]; from.get(s) !== null; s = from.get(s)) path.push(s); return path.reverse(); }
        const g = gapOf(cells);
        for (let i = 0; i + 1 < cells.length; i += 1) {
          if (!cells[i] || !cells[i + 1]) continue;
          const next = cells.slice();
          shift(next, i, g);
          const key = text(next);
          if (!from.has(key)) { from.set(key, queue[h]); queue.push(key); }
        }
      }
      return -1;
    }
    // Larger boards: greedily take the move that best lowers (B's in the A half, then inversions), never revisiting;
    // later attempts break ties at random in case the plain greedy walks into a dead end.
    let seed = 12345;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const cells = code(start), seen = new Set([start]), path = [];
      while (score(cells) > 0 && path.length < 1000) {
        const g = gapOf(cells);
        let choice = -1, value = Infinity;
        for (let i = 0; i + 1 < cells.length; i += 1) {
          if (!cells[i] || !cells[i + 1]) continue;
          shift(cells, i, g);
          const key = text(cells);
          if (!seen.has(key)) { const v = score(cells) + (attempt ? random() : 0); if (v < value) { value = v; choice = i; } }
          cells[i] = cells[g]; cells[i + 1] = cells[g + 1]; cells[g] = 0; cells[g + 1] = 0;
        }
        if (choice < 0) break;
        shift(cells, choice, g);
        const key = text(cells);
        seen.add(key);
        path.push(key);
      }
      if (score(cells) === 0) return path;
    }
    return -1;
  }
  function maximumBuildingI(grid) {
    const m = grid[0].length, heights = new Array(m).fill(0);
    let best = 0;
    // Each row is the floor of a histogram of empty squares stacked upwards; the best rectangle is an advertisement.
    grid.forEach((row) => {
      for (let j = 0; j < m; j += 1) heights[j] = row[j] === "." ? heights[j] + 1 : 0;
      best = Math.max(best, advertisement(heights));
    });
    return best;
  }
  function sortingMethods(values) {
    const n = values.length;
    const tree = new Array(n + 1).fill(0);
    let inversions = 0;
    // Adjacent swaps: one per inversion.
    for (let i = n - 1; i >= 0; i -= 1) { inversions += fenwickPrefix(tree, values[i] - 1); fenwickAdd(tree, values[i], 1); }
    // Any swaps: each cycle of length c needs c − 1.
    const seen = new Uint8Array(n + 1);
    let cycles = 0;
    for (let v = 1; v <= n; v += 1) { if (seen[v]) continue; cycles += 1; for (let u = v; !seen[u]; u = values[u - 1]) seen[u] = 1; }
    // Moving any element: keep a longest increasing subsequence.
    const tails = [];
    values.forEach((v) => { tails[lowerBound(tails, v)] = v; });
    // Moving to the front: keep the largest values that already appear in increasing order.
    const position = new Array(n + 1);
    values.forEach((v, i) => { position[v] = i; });
    let kept = 1;
    while (kept < n && position[n - kept] < position[n - kept + 1]) kept += 1;
    return [inversions, n - cycles, n - tails.length, n - kept];
  }
  function cyclicArray(values, k) {
    const n = values.length, total = 2 * n;
    // jump[0][i]: where a greedy segment starting at i ends on the doubled array; lift it to count segments per start.
    const levels = [];
    const first = new Int32Array(total + 1);
    let right = 0, sum = 0;
    for (let i = 0; i < total; i += 1) {
      while (right < total && right - i < n && sum + values[right % n] <= k) { sum += values[right % n]; right += 1; }
      first[i] = right;
      sum -= values[i % n];
    }
    first[total] = total;
    levels.push(first);
    for (let j = 1; (1 << j) <= n; j += 1) {
      const last = levels[j - 1], row = new Int32Array(total + 1);
      for (let i = 0; i <= total; i += 1) row[i] = last[last[i]];
      levels.push(row);
    }
    let best = n;
    for (let start = 0; start < n; start += 1) {
      let at = start, count = 0;
      for (let j = levels.length - 1; j >= 0; j -= 1) if (levels[j][at] < start + n) { at = levels[j][at]; count += 1 << j; }
      best = Math.min(best, count + 1);
    }
    return best;
  }
  function listOfSums(n, sums) {
    const sorted = sums.slice().sort((p, q) => p - q);
    const keys = Array.from(new Set(sorted));
    // With a1 ≤ a2 ≤ …: the two smallest sums are a1 + a2 and a1 + a3, and a2 + a3 is one of the next few.
    for (let j = 2; j < sorted.length && j <= n; j += 1) {
      const doubled = sorted[0] + sorted[1] - sorted[j];
      if (doubled <= 0 || doubled % 2) continue;
      const count = new Map();
      sorted.forEach((v) => count.set(v, (count.get(v) || 0) + 1));
      const found = [doubled / 2];
      let ok = true, pointer = 0;
      // The smallest sum still unexplained is always a1 + the next element; removals never go below it.
      while (found.length < n && ok) {
        while (pointer < keys.length && !count.get(keys[pointer])) pointer += 1;
        if (pointer === keys.length) { ok = false; break; }
        const next = keys[pointer] - found[0];
        for (const x of found) {
          const s = x + next, c = count.get(s) || 0;
          if (!c) { ok = false; break; }
          count.set(s, c - 1);
        }
        found.push(next);
      }
      if (ok && found.length === n && found.every((x) => x >= 1)) return found.sort((p, q) => p - q);
    }
    return null;
  }

  // ------------------------------------------------------------------ helpers shared by brutes and validators
  function isSubsequence(small, big) { let at = 0; for (let i = 0; i < big.length && at < small.length; i += 1) if (big[i] === small[at]) at += 1; return at === small.length; }
  function allPermutations(list) {
    if (list.length <= 1) return [list.slice()];
    const out = [];
    list.forEach((x, i) => allPermutations(list.slice(0, i).concat(list.slice(i + 1))).forEach((rest) => out.push([x].concat(rest))));
    return out;
  }
  function letterMoveTarget(from, to) {
    if (typeof from !== "string" || typeof to !== "string" || from.length !== to.length) return false;
    const g = from.indexOf("..");
    const h = to.indexOf("..");
    if (h < 0 || h === g || to[g] === "." || to[g + 1] === ".") return false;
    const expected = from.split("");
    expected[g] = from[h]; expected[g + 1] = from[h + 1]; expected[h] = "."; expected[h + 1] = ".";
    return from[h] !== "." && from[h + 1] !== "." && expected.join("") === to;
  }

  // ------------------------------------------------------------------ brute forces (small inputs only)
  function shortestSubsequenceBrute(s) {
    for (let length = 1; ; length += 1) {
      const total = Math.pow(4, length);
      for (let code = 0; code < total; code += 1) {
        let word = "", rest = code;
        for (let i = 0; i < length; i += 1) { word = "ACGT"[rest % 4] + word; rest = Math.floor(rest / 4); }
        if (!isSubsequence(word, s)) return word;
      }
    }
  }
  function distinctValuesSumBrute(values) {
    let total = 0;
    for (let a = 0; a < values.length; a += 1) { const seen = new Set(); for (let b = a; b < values.length; b += 1) { seen.add(values[b]); total += seen.size; } }
    return total;
  }
  function distinctValuesSplitsBrute(values) {
    const n = values.length;
    let count = 0;
    for (let mask = 0; mask < Math.pow(2, n - 1); mask += 1) {
      let ok = true, seen = new Set();
      for (let i = 0; i < n && ok; i += 1) { if (seen.has(values[i])) ok = false; seen.add(values[i]); if (i < n - 1 && mask & (1 << i)) seen = new Set(); }
      if (ok) count += 1;
    }
    return count % 1000000007;
  }
  function swapGameBrute(grid) {
    const start = grid.flat().join(""), goal = "123456789";
    const dist = new Map([[start, 0]]), queue = [start];
    const pairs = [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]];
    for (let h = 0; h < queue.length; h += 1) {
      const s = queue[h];
      if (s === goal) return dist.get(s);
      pairs.forEach(([p, q]) => { const t = s.split(""); const c = t[p]; t[p] = t[q]; t[q] = c; const key = t.join(""); if (!dist.has(key)) { dist.set(key, dist.get(s) + 1); queue.push(key); } });
    }
    return -1;
  }
  function beautifulPermutationIIBrute(n) {
    const used = new Array(n + 2).fill(false), out = [];
    const search = () => {
      if (out.length === n) return true;
      for (let v = 1; v <= n; v += 1) {
        if (used[v] || (out.length && Math.abs(v - out[out.length - 1]) === 1)) continue;
        used[v] = true; out.push(v);
        if (search()) return true;
        out.pop(); used[v] = false;
      }
      return false;
    };
    return search() ? out : null;
  }
  function multiplicationTableBrute(n) { const all = []; for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) all.push(i * j); all.sort((p, q) => p - q); return all[(n * n - 1) / 2]; }
  function bubbleRound(list) { let swapped = false; for (let i = 0; i + 1 < list.length; i += 1) if (list[i] > list[i + 1]) { const t = list[i]; list[i] = list[i + 1]; list[i + 1] = t; swapped = true; } return swapped; }
  function bubbleSortRoundsIBrute(values) { const list = values.slice(); let rounds = 0; while (bubbleRound(list)) rounds += 1; return rounds; }
  function bubbleSortRoundsIIBrute(values, k) { const list = values.slice(); for (let r = 0; r < Math.min(k, list.length); r += 1) bubbleRound(list); return list; }
  function dominanceMaxBrute(points, queries) { return queries.map(([x, y]) => points.reduce((best, [px, py]) => (px <= x && py <= y ? Math.max(best, px + py) : best), -1)); }
  function nearestDistances(reserved, free) { return free.map(([x, y]) => Math.min(...reserved.map(([p, q]) => Math.abs(x - p) + Math.abs(y - q)))); }
  function nearestCampsitesIBrute(reserved, free) { return Math.max(...nearestDistances(reserved, free)); }
  function nearestCampsitesIIBrute(reserved, free) { return nearestDistances(reserved, free); }
  function advertisementBrute(heights) {
    let best = 0;
    for (let i = 0; i < heights.length; i += 1) { let low = Infinity; for (let j = i; j < heights.length; j += 1) { low = Math.min(low, heights[j]); best = Math.max(best, low * (j - i + 1)); } }
    return best;
  }
  function specialSubstringsBrute(s) {
    const letters = Array.from(new Set(s));
    let total = 0;
    for (let a = 0; a < s.length; a += 1) for (let b = a; b < s.length; b += 1) {
      const count = new Map(letters.map((c) => [c, 0]));
      for (let i = a; i <= b; i += 1) count.set(s[i], count.get(s[i]) + 1);
      if (new Set(count.values()).size === 1) total += 1;
    }
    return total;
  }
  function countingLcmArraysBrute(tests) {
    const gcd = (p, q) => { while (q) { const t = p % q; p = q; q = t; } return p; };
    return tests.map(([n, k]) => {
      const divisors = [];
      for (let d = 1; d <= k; d += 1) if (k % d === 0) divisors.push(d);
      let ways = divisors.map(() => 1);
      for (let i = 1; i < n; i += 1) ways = divisors.map((d) => divisors.reduce((sum, e, j) => (d * e / gcd(d, e) === k ? sum + ways[j] : sum), 0));
      return ways.reduce((sum, w) => sum + w, 0) % 1000000007;
    });
  }
  function squareSubsetsBrute(values) {
    let count = 0;
    for (let mask = 0; mask < Math.pow(2, values.length); mask += 1) {
      let product = 1n;
      values.forEach((v, i) => { if (mask & (1 << i)) product *= BigInt(v); });
      let root = BigInt(Math.round(Math.sqrt(Number(product))));
      while (root * root > product) root -= 1n;
      while ((root + 1n) * (root + 1n) <= product) root += 1n;
      if (root * root === product) count += 1;
    }
    return count;
  }
  function subarraySumConstraintsBrute(n, constraints) {
    const values = new Array(n).fill(-12);
    const holds = () => constraints.every(([l, r, s]) => { let t = 0; for (let i = l - 1; i < r; i += 1) t += values[i]; return t === s; });
    const walk = (i) => {
      if (i === n) return holds();
      for (let v = -12; v <= 12; v += 1) { values[i] = v; if (walk(i + 1)) return true; }
      return false;
    };
    return walk(0) ? values.slice() : null;
  }
  function waterContainersMovesBrute(a, b, x) {
    const key = (A, B) => A * (b + 1) + B, states = (a + 1) * (b + 1);
    const dist = new Array(states).fill(Infinity), done = new Array(states).fill(false), via = new Array(states).fill(null);
    dist[0] = 0;
    const names = ["FILL A", "FILL B", "EMPTY A", "EMPTY B", "MOVE A B", "MOVE B A"];
    for (;;) {
      let s = -1;
      for (let t = 0; t < states; t += 1) if (!done[t] && dist[t] < Infinity && (s < 0 || dist[t] < dist[s])) s = t;
      if (s < 0) return -1;
      done[s] = true;
      const A = Math.floor(s / (b + 1)), B = s % (b + 1);
      if (A === x) { const moves = []; for (let t = s; via[t]; t = via[t][0]) moves.push(via[t][1]); return { total: dist[s], moves: moves.reverse() }; }
      const ab = Math.min(A, b - B), ba = Math.min(B, a - A);
      [[a, B, a - A], [A, b, b - B], [0, B, A], [A, 0, B], [A - ab, B + ab, ab], [A + ba, B - ba, ba]].forEach(([nA, nB, cost], kind) => {
        if (cost <= 0) return;
        const t = key(nA, nB);
        if (dist[s] + cost < dist[t]) { dist[t] = dist[s] + cost; via[t] = [s, names[kind]]; }
      });
    }
  }
  function waterContainersQueriesBrute(tests) {
    return tests.map(([a, b, x]) => {
      const seen = new Set(["0,0"]), queue = [[0, 0]];
      for (let h = 0; h < queue.length; h += 1) {
        const [A, B] = queue[h];
        if (A === x) return true;
        const ab = Math.min(A, b - B), ba = Math.min(B, a - A);
        [[a, B], [A, b], [0, B], [A, 0], [A - ab, B + ab], [A + ba, B - ba]].forEach(([p, q]) => { const k = p + "," + q; if (!seen.has(k)) { seen.add(k); queue.push([p, q]); } });
      }
      return false;
    });
  }
  function stackWeightsBrute(n, moves) {
    const side = new Array(n + 1).fill(0);
    return moves.map(([coin, stack]) => {
      side[coin] = stack === 1 ? 1 : -1;
      let running = 0, low = Infinity, high = -Infinity;
      for (let j = n; j >= 1; j -= 1) { running += side[j]; low = Math.min(low, running); high = Math.max(high, running); }
      return low >= 0 && high > 0 ? ">" : high <= 0 && low < 0 ? "<" : "?";
    });
  }
  function maximumAverageSubarraysBrute(values) {
    return values.map((v, i) => {
      let bestSum = 0n, bestLength = 0n, bestLen = 0, sum = 0n;
      for (let j = i; j >= 0; j -= 1) {
        sum += BigInt(values[j]);
        const length = BigInt(i - j + 1);
        if (bestLen === 0 || sum * bestLength > bestSum * length || sum * bestLength === bestSum * length) { bestSum = sum; bestLength = length; bestLen = i - j + 1; }
      }
      return bestLen;
    });
  }
  function subsetsWithFixedAverageBrute(values, a) {
    let count = 0;
    for (let mask = 1; mask < Math.pow(2, values.length); mask += 1) {
      let sum = 0, size = 0;
      values.forEach((v, i) => { if (mask & (1 << i)) { sum += v; size += 1; } });
      if (sum === a * size) count += 1;
    }
    return count;
  }
  function twoArrayAverageBrute(first, second) {
    let best = [1, 1], bestSum = first[0] + second[0], bestCount = 2, sumA = 0;
    for (let i = 1; i <= first.length; i += 1) {
      sumA += first[i - 1];
      let sumB = 0;
      for (let j = 1; j <= second.length; j += 1) { sumB += second[j - 1]; if ((sumA + sumB) * bestCount > bestSum * (i + j)) { best = [i, j]; bestSum = sumA + sumB; bestCount = i + j; } }
    }
    return best;
  }
  function pyramidArrayBrute(values) {
    const n = values.length, top = values.indexOf(Math.max(...values)), rest = values.filter((v, i) => i !== top);
    let best = Infinity;
    for (let mask = 0; mask < Math.pow(2, rest.length); mask += 1) {
      const left = rest.filter((v, i) => mask & (1 << i)).sort((p, q) => p - q), right = rest.filter((v, i) => !(mask & (1 << i))).sort((p, q) => q - p);
      const target = left.concat([values[top]], right), where = new Map(target.map((v, i) => [v, i]));
      let inversions = 0;
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (where.get(values[i]) > where.get(values[j])) inversions += 1;
      best = Math.min(best, inversions);
    }
    return best;
  }
  function permutationSubsequenceBrute(a, b) {
    const n = a.length, m = b.length, dp = [];
    for (let i = 0; i <= n; i += 1) dp.push(new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const sequence = [];
    for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === b[j]) { sequence.push(a[i]); i += 1; j += 1; } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1; else j += 1; }
    return { length: dp[0][0], sequence };
  }
  function bitInversionsBrute(bits, changes) {
    const list = bits.split("");
    return changes.map((x) => {
      list[x - 1] = list[x - 1] === "1" ? "0" : "1";
      let best = 0, run = 0;
      list.forEach((c, i) => { run = i > 0 && c === list[i - 1] ? run + 1 : 1; best = Math.max(best, run); });
      return best;
    });
  }
  function writingNumbersBrute(n) {
    const limit = Number(n), used = new Array(10).fill(0);
    for (let x = 1; ; x += 1) {
      const digits = String(x).split("").map(Number);
      digits.forEach((d) => { used[d] += 1; });
      if (used.some((u) => u > limit)) return String(x - 1);
    }
  }
  function letterPairMoveGameBrute(n, start) {
    const sorted = (s) => !/B.*A/.test(s.replace(/\./g, ""));
    const from = new Map([[start, null]]), queue = [start];
    for (let h = 0; h < queue.length; h += 1) {
      const s = queue[h];
      if (sorted(s)) { const path = []; for (let t = s; from.get(t) !== null; t = from.get(t)) path.push(t); return path.reverse(); }
      const g = s.indexOf("..");
      for (let i = 0; i + 1 < s.length; i += 1) {
        if (s[i] === "." || s[i + 1] === ".") continue;
        const t = s.split(""); t[g] = s[i]; t[g + 1] = s[i + 1]; t[i] = "."; t[i + 1] = ".";
        const key = t.join("");
        if (!from.has(key)) { from.set(key, s); queue.push(key); }
      }
    }
    return -1;
  }
  function maximumBuildingIBrute(grid) {
    const n = grid.length, m = grid[0].length;
    let best = 0;
    for (let r1 = 0; r1 < n; r1 += 1) for (let c1 = 0; c1 < m; c1 += 1) for (let r2 = r1; r2 < n; r2 += 1) for (let c2 = c1; c2 < m; c2 += 1) {
      let ok = true;
      for (let r = r1; r <= r2 && ok; r += 1) for (let c = c1; c <= c2 && ok; c += 1) if (grid[r][c] !== ".") ok = false;
      if (ok) best = Math.max(best, (r2 - r1 + 1) * (c2 - c1 + 1));
    }
    return best;
  }
  function sortingMethodsBrute(values) {
    const n = values.length, goal = Array.from({ length: n }, (x, i) => i + 1).join(",");
    const methods = [
      (p) => { const out = []; for (let i = 0; i + 1 < n; i += 1) { const q = p.slice(); [q[i], q[i + 1]] = [q[i + 1], q[i]]; out.push(q); } return out; },
      (p) => { const out = []; for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) { const q = p.slice(); [q[i], q[j]] = [q[j], q[i]]; out.push(q); } return out; },
      (p) => { const out = []; for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) { if (i === j) continue; const q = p.slice(); const [x] = q.splice(i, 1); q.splice(j, 0, x); out.push(q); } return out; },
      (p) => { const out = []; for (let i = 1; i < n; i += 1) { const q = p.slice(); const [x] = q.splice(i, 1); q.unshift(x); out.push(q); } return out; },
    ];
    return methods.map((step) => {
      const dist = new Map([[values.join(","), 0]]), queue = [values.slice()];
      for (let h = 0; h < queue.length; h += 1) {
        const key = queue[h].join(",");
        if (key === goal) return dist.get(key);
        step(queue[h]).forEach((q) => { const k = q.join(","); if (!dist.has(k)) { dist.set(k, dist.get(key) + 1); queue.push(q); } });
      }
      return -1;
    });
  }
  function cyclicArrayBrute(values, k) {
    const n = values.length;
    let best = Infinity;
    for (let start = 0; start < n; start += 1) {
      let count = 1, sum = 0;
      for (let t = 0; t < n; t += 1) { const v = values[(start + t) % n]; if (sum + v > k) { count += 1; sum = 0; } sum += v; }
      best = Math.min(best, count);
    }
    return best;
  }

  // ------------------------------------------------------------------ validators (answers with more than one correct form)
  function viaBrute(accept, brute) { return (args, out) => accept(args, out, brute.apply(null, JSON.parse(JSON.stringify(args)))) === true; }
  function shortestSubsequenceAccept(args, actual, expected) {
    const s = args[0];
    if (typeof actual !== "string" || !/^[ACGT]+$/.test(actual)) return "Return a DNA string.";
    if (actual.length !== expected.length) return "The shortest missing subsequence has length " + expected.length + ", not " + actual.length + ".";
    return isSubsequence(actual, s) ? actual + " is a subsequence of the input." : true;
  }
  function subarraySumConstraintsAccept(args, actual, expected) {
    const [n, constraints] = args;
    if (expected === null) return actual === null ? true : "The constraints contradict each other; return null.";
    if (actual === null) return "An array exists; null is wrong here.";
    if (!Array.isArray(actual) || actual.length !== n || !actual.every((x) => Number.isInteger(x) && Math.abs(x) <= 1e15)) return "Return n integers with |x| ≤ 10¹⁵.";
    const prefix = [0];
    actual.forEach((x, i) => prefix.push(prefix[i] + x));
    const broken = constraints.find(([l, r, s]) => prefix[r] - prefix[l - 1] !== s);
    return broken ? "The sum from " + broken[0] + " to " + broken[1] + " is " + (prefix[broken[1]] - prefix[broken[0] - 1]) + ", not " + broken[2] + "." : true;
  }
  function waterContainersMovesAccept(args, actual, expected) {
    const [a, b, x] = args;
    if (expected === -1) return actual === -1 ? true : "x units cannot be measured here; return −1.";
    if (actual === -1) return "It can be measured; −1 is wrong here.";
    if (!actual || !Array.isArray(actual.moves) || typeof actual.total !== "number") return "Return { total, moves }.";
    let A = 0, B = 0, moved = 0;
    for (const move of actual.moves) {
      let amount = 0;
      if (move === "FILL A") { amount = a - A; A = a; }
      else if (move === "FILL B") { amount = b - B; B = b; }
      else if (move === "EMPTY A") { amount = A; A = 0; }
      else if (move === "EMPTY B") { amount = B; B = 0; }
      else if (move === "MOVE A B") { amount = Math.min(A, b - B); A -= amount; B += amount; }
      else if (move === "MOVE B A") { amount = Math.min(B, a - A); B -= amount; A += amount; }
      else return "Unknown move " + JSON.stringify(move) + ".";
      if (amount <= 0) return "The move " + move + " moves no water.";
      moved += amount;
    }
    if (A !== x) return "Container A ends with " + A + " units, not " + x + ".";
    if (moved !== actual.total) return "The moves carry " + moved + " units, not " + actual.total + ".";
    return moved === expected.total ? true : "These moves carry " + moved + " units, but " + expected.total + " is possible.";
  }
  function twoArrayAverageAccept(args, actual, expected) {
    const [first, second] = args, n = first.length;
    if (!Array.isArray(actual) || actual.length !== 2 || !actual.every((v) => Number.isInteger(v) && v >= 1 && v <= n)) return "Return two prefix sizes between 1 and n.";
    const average = ([i, j]) => (first.slice(0, i).reduce((s, v) => s + v, 0) + second.slice(0, j).reduce((s, v) => s + v, 0)) / (i + j);
    const got = average(actual), want = average(expected);
    return got >= want - 1e-6 * Math.max(1, want) ? true : "That average is " + got + "; " + want + " is possible.";
  }
  function permutationSubsequenceAccept(args, actual, expected) {
    const [a, b] = args;
    if (!actual || actual.length !== expected.length) return "The longest common subsequence has length " + expected.length + ".";
    if (!Array.isArray(actual.sequence) || actual.sequence.length !== actual.length) return "The sequence must have the stated length.";
    if (!isSubsequence(actual.sequence, a)) return "The sequence is not a subsequence of the first array.";
    return isSubsequence(actual.sequence, b) ? true : "The sequence is not a subsequence of the second array.";
  }
  function letterPairMoveGameAccept(args, actual, expected) {
    const [n, start] = args;
    if (expected === -1) return actual === -1 ? true : "No sequence of moves works here; return −1.";
    if (actual === -1) return "A solution exists; −1 is wrong here.";
    if (!Array.isArray(actual) || actual.length > 1000) return "Return at most 1000 positions.";
    let current = start;
    for (let i = 0; i < actual.length; i += 1) {
      if (!letterMoveTarget(current, actual[i])) return "Turn " + (i + 1) + " is not a legal move from " + current + ".";
      current = actual[i];
    }
    return /B.*A/.test(current.replace(/\./g, "")) ? "The final position " + current + " still has a B before an A." : true;
  }
  function listOfSumsAccept(args, actual) {
    const [n, sums] = args;
    if (!Array.isArray(actual) || actual.length !== n || !actual.every((x) => Number.isInteger(x) && x >= 1)) return "Return n positive integers.";
    const made = [];
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) made.push(actual[i] + actual[j]);
    made.sort((p, q) => p - q);
    const given = sums.slice().sort((p, q) => p - q);
    return made.every((v, i) => v === given[i]) ? true : "The pair sums of that list differ from B.";
  }

  // ------------------------------------------------------------------ input builders
  function dna(seed, n) { const next = rng(seed); let s = ""; for (let i = 0; i < n; i += 1) s += "ACGT"[Math.floor(next() * 4)]; return s; }
  function smallList(seed, n, lo, hi) { return randomInts(seed, n, lo, hi); }
  function scrambledGrid(seed, swaps) {
    const next = rng(seed), cells = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const pairs = [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]];
    for (let s = 0; s < swaps; s += 1) { const [p, q] = pairs[Math.floor(next() * pairs.length)]; const t = cells[p]; cells[p] = cells[q]; cells[q] = t; }
    return [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)];
  }
  function randomPoints(seed, count, span) {
    const next = rng(seed), seen = new Set(), out = [];
    while (out.length < count) { const x = 1 + Math.floor(next() * span), y = 1 + Math.floor(next() * span); if (seen.has(x * (span + 1) + y)) continue; seen.add(x * (span + 1) + y); out.push([x, y]); }
    return out;
  }
  function splitPoints(seed, reserved, free, span) { const all = randomPoints(seed, reserved + free, span); return [all.slice(0, reserved), all.slice(reserved)]; }
  function letters(seed, n, alphabet) { const next = rng(seed); let s = ""; for (let i = 0; i < n; i += 1) s += String.fromCharCode(97 + Math.floor(next() * alphabet)); return s; }
  // Constraints read off a hidden array (consistent), or with one sum nudged (usually contradictory).
  function sumConstraints(seed, n, m, consistent) {
    const next = rng(seed), hidden = randomInts(seed + 1, n, -5, 5), out = [];
    for (let i = 0; i < m; i += 1) {
      let l = 1 + Math.floor(next() * n), r = 1 + Math.floor(next() * n);
      if (l > r) { const t = l; l = r; r = t; }
      let s = 0;
      for (let t = l - 1; t < r; t += 1) s += hidden[t];
      out.push([l, r, s]);
    }
    if (!consistent && out.length) out[Math.floor(next() * out.length)][2] += 1;
    return out;
  }
  function coinMoves(seed, n) { const next = rng(seed), order = randomPermutation(seed + 1, n); return order.map((c) => [c, next() < 0.5 ? 1 : 2]); }
  function bitString(seed, n) { const next = rng(seed); let s = ""; for (let i = 0; i < n; i += 1) s += next() < 0.5 ? "1" : "0"; return s; }
  function letterPairStart(seed, n) {
    const next = rng(seed), cells = [];
    for (let i = 0; i < n - 1; i += 1) cells.push("A", "B");
    for (let i = cells.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    const g = Math.floor(next() * (cells.length + 1));
    return cells.slice(0, g).join("") + ".." + cells.slice(g).join("");
  }
  function forest(seed, n, m, trees) { const next = rng(seed), out = []; for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < m; c += 1) row += next() < trees ? "*" : "."; out.push(row); } return out; }
  function pairSums(list) { const out = []; for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) out.push(list[i] + list[j]); return out; }
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

  // A random ordering of the 26 letters repeated, so long special substrings are everywhere.
  function repeatedAlphabet(seed, n) { const order = randomPermutation(seed, 26).map((v) => String.fromCharCode(96 + v)).join(""); let s = ""; while (s.length < n) s += order; return s.slice(0, n); }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const DNA_BIG = lazy(() => dna(1601, 1000000));
  const VALUES_BIG = lazy(() => smallList(1602, 200000, 1, 1000));
  const VALUES_WIDE = lazy(() => smallList(1603, 200000, 1, 100000));
  const BUBBLE_BIG = lazy(() => smallList(1604, 200000, 1, 1000000000));
  const DOMINANCE_POINTS = lazy(() => randomPoints(1605, 50000, 1000000));
  const DOMINANCE_QUERIES = lazy(() => randomPoints(1606, 50000, 1000000));
  const CAMPSITES_BIG = lazy(() => splitPoints(1607, 50000, 50000, 1000000));
  const HEIGHTS_BIG = lazy(() => smallList(1608, 200000, 1, 1000000000));
  const SPECIAL_BIG = lazy(() => repeatedAlphabet(1609, 200000));
  const SPECIAL_THREE = lazy(() => letters(1610, 200000, 3));
  const LCM_TESTS = lazy(() => { const ns = smallList(1611, 1000, 2, 1000000000), ks = smallList(1612, 1000, 1, 1000000000); return ns.map((n, i) => [n, i % 5 === 0 ? 735134400 : ks[i]]); });
  const SQUARES_BIG = lazy(() => smallList(1613, 5000, 1, 5000));
  const CONSTRAINTS_OK = lazy(() => sumConstraints(1614, 5000, 200000, true));
  const CONSTRAINTS_BAD = lazy(() => sumConstraints(1615, 5000, 200000, false));
  const WATER_TESTS = lazy(() => { const a = smallList(1616, 1000, 1, 1000000000), b = smallList(1617, 1000, 1, 1000000000), x = smallList(1618, 1000, 1, 1000000000); return a.map((v, i) => [v, b[i], i % 2 ? Math.min(v, x[i]) : x[i]]); });
  const COINS_BIG = lazy(() => coinMoves(1619, 200000));
  const AVERAGE_BIG = lazy(() => smallList(1620, 200000, 1, 1000000));
  const FIXED_BIG = lazy(() => smallList(1621, 500, 1, 500));
  const TWO_A = lazy(() => smallList(1622, 100000, 1, 1000000000));
  const TWO_B = lazy(() => smallList(1623, 100000, 1, 1000000000));
  const PYRAMID_BIG = lazy(() => randomPermutation(1624, 200000));
  const LCS_A = lazy(() => randomPermutation(1625, 200000));
  const LCS_B = lazy(() => randomPermutation(1626, 200000));
  const BITS_BIG = lazy(() => bitString(1627, 200000));
  const FLIPS_BIG = lazy(() => smallList(1628, 200000, 1, 200000));
  const LETTER_BIG = lazy(() => letterPairStart(1633, 100));
  const FOREST_BIG = lazy(() => forest(1629, 1000, 1000, 0.05));
  const SORTING_BIG = lazy(() => randomPermutation(1630, 200000));
  const CYCLIC_BIG = lazy(() => smallList(1631, 200000, 1, 1000000000));
  const SUMS_BIG = lazy(() => pairSums(smallList(1632, 100, 1, 1000000000)));

  const SAMPLE_RESERVED = [[1, 1], [5, 2], [2, 6], [4, 7]], SAMPLE_FREE = [[1, 3], [7, 5]];

  const ADDITIONAL_I = [
    {
      id: "shortest-subsequence", title: "Shortest Subsequence", cses: { id: 1087, name: "Shortest Subsequence" },
      goal: "A shortest DNA string over A, C, G, T that is not a subsequence of the given string; any shortest one is accepted.",
      concept: "Scan the string and cut it into chunks, each ending the moment all four letters have appeared. To embed a string letter by letter, one letter per chunk is the best any embedding can do, and the letter that completes a chunk is the one that forces the embedding to use the whole chunk. So those completing letters, followed by a letter missing from the unfinished last chunk, cannot be embedded, and nothing shorter works.",
      functionName: "shortestSubsequence", signature: "shortestSubsequence(s) → string",
      starterSource: starter("shortestSubsequence", "s", "Collect letters until all four appear; that letter goes into the answer and the set resets; finish with a letter missing from the last set."),
      solve: shortestSubsequence, comparator: "scalar", accept: shortestSubsequenceAccept, check: viaBrute(shortestSubsequenceAccept, shortestSubsequenceBrute), small: (round) => [dna(16000 + round, 1 + (round % 12))],
      reference: book("6", "Greedy algorithms"),
      presets: { "CSES sample": { a: "ACGTACGT" }, "one letter": { a: "AAAA" }, "all four once": { a: "GATC" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("forgets-the-last-letter", "The chunk letters alone can still be embedded; one more letter, missing from the unfinished last chunk, is what breaks it.", shortestSubsequence, [["return out + c;", "return out;"]]),
        diagnosis("first-letter-of-each-chunk", "The letter that ends a chunk is the one an embedding cannot place earlier; the chunk's first letter fits right at its start.", function shortestSubsequence(s) { const seen = new Set(); let out = "", first = ""; for (let i = 0; i < s.length; i += 1) { if (seen.size === 0) first = s[i]; seen.add(s[i]); if (seen.size === 4) { out += first; seen.clear(); } } for (const c of "ACGT") if (!seen.has(c)) return out + c; return out; }),
      ],
      hints: ["Keep the set of letters seen in the current chunk.", "When the set reaches four letters, append the current letter to the answer and clear the set.", "At the end append any letter not in the set."],
      cases: [
        example(["ACGTACGT"], "AAA", "CSES sample"),
        example(["AAAA"], "C", "a missing letter is enough"),
        example(["GATC"], "CA", "every letter once"),
        run(shortestSubsequence, [dna(16100, 40)], "forty letters"),
        hidden("n = 10⁶, time limit", () => [DNA_BIG()]),
      ],
    },
    {
      id: "distinct-values-sum", title: "Distinct Values Sum", cses: { id: 3150, name: "Distinct Values Sum" },
      goal: "The sum, over all subarrays, of the number of distinct values in the subarray.",
      concept: "Count each distinct value once, at its first occurrence inside the subarray. Position i is that first occurrence exactly when the subarray starts after the previous occurrence of the same value and still contains i: (i − prev) choices for the start and (n − i) for the end. Summing over i gives the answer in one pass.",
      functionName: "distinctValuesSum", signature: "distinctValuesSum(values) → sum",
      starterSource: starter("distinctValuesSum", "values", "Remember the last index of each value; position i adds (i − previous) · (n − i)."),
      solve: distinctValuesSum, comparator: "scalar", brute: distinctValuesSumBrute, small: (round) => [smallList(16200 + round, 1 + (round % 9), 1, 4)],
      reference: book("1.4", "Working with numbers · counting"),
      presets: { "CSES sample": { a: [1, 2, 3, 1, 1] }, "all equal": { a: [7, 7, 7] }, "all different": { a: [1, 2, 3, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("counts-every-occurrence", "A value repeated inside the subarray is still one distinct value; start counting after its previous occurrence.", distinctValuesSum, [["const previous = last.has(values[i]) ? last.get(values[i]) : -1;", "const previous = -1;"]]),
        variant("left-choices-only", "Each allowed start pairs with every end from i to the last index: multiply by n − i.", distinctValuesSum, [["total += (i - previous) * (n - i);", "total += i - previous;"]]),
      ],
      hints: ["Walk left to right with a map value → last index (−1 if unseen).", "Position i is the first copy of its value in (i − previous) · (n − i) subarrays.", "Add that for every i and update the map."],
      cases: [
        example([[1, 2, 3, 1, 1]], 29, "CSES sample"),
        example([[7, 7, 7]], 6, "all equal: one distinct value per subarray"),
        example([[1, 2, 3, 4]], 20, "all different"),
        run(distinctValuesSum, [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]], "eleven values"),
        hidden("n = 2·10⁵, time limit", () => [VALUES_BIG()]),
      ],
    },
    {
      id: "distinct-values-splits", title: "Distinct Values Splits", cses: { id: 3190, name: "Distinct Values Splits" },
      goal: "The number of ways to cut the array into contiguous segments that each hold distinct values, modulo 10⁹ + 7.",
      concept: "ways[i] counts the splits of the first i values. The last segment ends at i and may start anywhere after the leftmost point where a value repeats inside it, and that left edge only moves right as i grows, so two pointers track it. Then ways[i] is a window sum of earlier ways, read off prefix sums in O(1).",
      functionName: "distinctValuesSplits", signature: "distinctValuesSplits(values) → count",
      starterSource: starter("distinctValuesSplits", "values", "Two pointers for the leftmost allowed start; ways[i] = sum of ways over the window, from prefix sums."),
      solve: distinctValuesSplits, comparator: "scalar", brute: distinctValuesSplitsBrute, small: (round) => [smallList(16300 + round, 1 + (round % 9), 1, 4)],
      reference: book("8.1", "Two pointers method"),
      presets: { "CSES sample": { a: [1, 2, 1, 3] }, "all equal": { a: [5, 5, 5] }, "all different": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("forgets-earlier-duplicates", "The window's left edge never moves back: a value repeated further left still blocks longer segments, so keep the maximum.", distinctValuesSplits, [["if (last.has(v)) left = Math.max(left, last.get(v));", "left = last.has(v) ? last.get(v) : 0;"]]),
        variant("ignores-repeats", "Segments must hold distinct values; only starts after the window's left edge are allowed.", distinctValuesSplits, [["ways = (prefix[i] - prefix[left] + m) % m;", "ways = prefix[i] % m;"]]),
      ],
      hints: ["prefix[t] = ways[0] + … + ways[t − 1], with ways[0] = 1.", "Moving to value i: left = max(left, previous position of this value).", "ways[i] = prefix[i] − prefix[left]; the answer is ways[n]."],
      cases: [
        example([[1, 2, 1, 3]], 6, "CSES sample"),
        example([[5, 5, 5]], 1, "all equal: only singletons"),
        example([[1, 2, 3]], 4, "all different: any cuts"),
        run(distinctValuesSplits, [[1, 2, 3, 1, 2, 4, 3, 5, 1]], "nine values"),
        hidden("n = 2·10⁵, time limit", () => [VALUES_WIDE()]),
      ],
    },
    {
      id: "swap-game", title: "Swap Game", cses: { id: 1670, name: "Swap Game" },
      goal: "The minimum number of swaps of adjacent squares that turn the 3 × 3 grid into 1 … 9 in order.",
      concept: "There are only 9! = 362 880 arrangements, so breadth-first search over all of them is small. Store each arrangement as one base-9 number: swapping two squares changes it by a fixed amount you can compute from the two digits, with no strings or arrays per state.",
      functionName: "swapGame", signature: "swapGame(grid) → moves",
      starterSource: starter("swapGame", "grid", "BFS from the start; states as base-9 numbers; the 12 adjacent pairs are the moves."),
      solve: swapGame, comparator: "scalar", brute: swapGameBrute, small: (round) => [scrambledGrid(16400 + round, 1 + (round % 9))],
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample": { a: [[2, 1, 3], [7, 5, 9], [8, 4, 6]] }, "already sorted": { a: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] } },
      scene: { kind: "algo", view: "number-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("misplaced-over-two", "One swap fixes at most two squares, so misplaced / 2 is only a lower bound; far-away numbers need many swaps.", function swapGame(grid) { const cells = grid.flat(); let wrong = 0; cells.forEach((c, i) => { if (c !== i + 1) wrong += 1; }); return Math.ceil(wrong / 2); }),
        diagnosis("manhattan-over-two", "Half the total distance is a lower bound, not the answer: swaps rarely move both numbers where they need to go.", function swapGame(grid) { const cells = grid.flat(); let total = 0; cells.forEach((c, i) => { total += Math.abs(Math.floor(i / 3) - Math.floor((c - 1) / 3)) + Math.abs(i % 3 - (c - 1) % 3); }); return Math.ceil(total / 2); }),
      ],
      hints: ["Encode a grid as Σ (cell − 1) · 9^position.", "Swapping positions p and q with digits dp, dq adds (dq − dp)(9^p − 9^q).", "BFS level by level until the sorted grid appears."],
      cases: [
        example([[[2, 1, 3], [7, 5, 9], [8, 4, 6]]], 4, "CSES sample"),
        example([[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], 0, "already sorted"),
        example([[[2, 1, 3], [4, 5, 6], [7, 8, 9]]], 1, "one swap"),
        run(swapGame, [[[3, 2, 1], [6, 5, 4], [9, 8, 7]]], "every row reversed"),
        run(swapGame, [scrambledGrid(16500, 12)], "a scrambled grid"),
        hidden("the reversed grid, time limit", () => [[[9, 8, 7], [6, 5, 4], [3, 2, 1]]]),
      ],
    },
    {
      id: "beautiful-permutation-ii", title: "Beautiful Permutation II", cses: { id: 3175, name: "Beautiful Permutation II" },
      goal: "The lexicographically smallest permutation of 1 … n with no two adjacent values differing by 1, or null if none exists.",
      concept: "Greedy: at each step take the smallest unused value that does not touch the previous one. That is safe for a long time, because with many values left there is always a way to finish; only near the end can the greedy choice trap you. So place all but the last eight values greedily, then finish with an exhaustive search in increasing order, which finds the smallest completion.",
      functionName: "beautifulPermutationII", signature: "beautifulPermutationII(n) → permutation or null",
      starterSource: starter("beautifulPermutationII", "n", "Greedy smallest non-adjacent value while more than eight remain; exhaustive lexicographic search for the rest."),
      solve: beautifulPermutationII, comparator: "deep", brute: beautifulPermutationIIBrute, small: (round) => [1 + (round % 14)],
      reference: book("6", "Greedy algorithms"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 16 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("evens-then-odds", "Evens then odds is beautiful but not the smallest: starting with 1 is possible from n = 5 on.", function beautifulPermutationII(n) { if (n === 1) return [1]; if (n < 4) return null; const out = []; for (let v = 2; v <= n; v += 2) out.push(v); for (let v = 1; v <= n; v += 2) out.push(v); return out; }),
        variant("no-lookahead", "Taking the smallest valid value to the very end can leave the last values stuck together; search the tail.", beautifulPermutationII, [["const tail = Math.min(n, 8)", "const tail = Math.min(n, 1)"]]),
      ],
      hints: ["Track the smallest unused value; the candidate skips values that are used or differ from the previous one by 1.", "Stop the greedy when eight values remain.", "Try the remaining values in increasing order with backtracking; the first complete order is the answer (null if none)."],
      cases: [
        example([5], [1, 3, 5, 2, 4], "CSES sample 1"),
        example([3], null, "CSES sample 2"),
        example([4], [2, 4, 1, 3], "n = 4 must start with 2"),
        example([7], [1, 3, 5, 2, 6, 4, 7], "the greedy alone would get stuck"),
        run(beautifulPermutationII, [20], "n = 20"),
        hidden("n = 10⁶, time limit", () => [1000000]),
      ],
    },
    {
      id: "multiplication-table", title: "Multiplication Table", cses: { id: 2422, name: "Multiplication Table" },
      goal: "The middle element of the sorted n × n multiplication table (n odd).",
      concept: "Binary search on the answer x. Row i contains min(n, ⌊x / i⌋) entries ≤ x, so the count of table entries ≤ x takes O(n). The middle element is the smallest x whose count reaches (n² + 1) / 2.",
      functionName: "multiplicationTable", signature: "multiplicationTable(n) → value",
      starterSource: starter("multiplicationTable", "n", "Binary search x in [1, n²]; count = Σ min(n, ⌊x / i⌋); find the smallest x with count ≥ (n² + 1) / 2."),
      solve: multiplicationTable, comparator: "scalar", brute: multiplicationTableBrute, small: (round) => [1 + 2 * (round % 20)],
      reference: book("3.3", "Binary search"),
      scene: { kind: "algo", view: "number", handles: [{ id: "k", type: "slider", label: "k, with n = 2k − 1", value: 2, min: 1, max: 21, integer: true }], args: [{ fixture: "roundedOddN" }] },
      diagnoses: [
        variant("rows-not-capped", "A row holds only n numbers; ⌊x / i⌋ can exceed that and counts entries that do not exist.", multiplicationTable, [["count += Math.min(n, Math.floor(mid / i));", "count += Math.floor(mid / i);"]]),
        variant("counts-strictly-smaller", "Count the entries ≤ x; counting only those < x finds the element after the middle one.", multiplicationTable, [["Math.floor(mid / i)", "Math.floor((mid - 1) / i)"]]),
      ],
      hints: ["target = (n² + 1) / 2.", "count(x) = Σ_{i=1..n} min(n, ⌊x / i⌋), stopping early once it reaches target.", "Binary search the smallest x with count(x) ≥ target."],
      cases: [
        example([3], 3, "CSES sample"),
        example([1], 1, "one cell"),
        example([5], 8, "n = 5"),
        run(multiplicationTable, [99], "n = 99"),
        hidden("n = 999 999, time limit", () => [999999]),
      ],
    },
    {
      id: "bubble-sort-rounds-i", title: "Bubble Sort Rounds I", cses: { id: 3151, name: "Bubble Sort Rounds I" },
      goal: "The number of bubble sort rounds needed to sort the array.",
      concept: "In one round an element can move right any distance, carried along as the running maximum, but it moves left at most one step. So the rounds needed are the longest distance any element has to travel left. With equal values keeping their order (bubble sort is stable), that is the largest i − target(i) over the sorted positions.",
      functionName: "bubbleSortRoundsI", signature: "bubbleSortRoundsI(values) → rounds",
      starterSource: starter("bubbleSortRoundsI", "values", "Stable sort of the indices by value; answer max(0, index − sorted position)."),
      solve: bubbleSortRoundsI, comparator: "scalar", brute: bubbleSortRoundsIBrute, small: (round) => [smallList(16600 + round, 1 + (round % 9), 1, 5)],
      reference: book("3.1", "Sorting theory · bubble sort"),
      presets: { "CSES sample": { a: [3, 2, 4, 1, 4] }, "sorted": { a: [1, 2, 3] }, "reversed": { a: [4, 3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("counts-rightward-trips", "A large element rides to the right within one round; it is the leftward trips, one step per round, that take time.", bubbleSortRoundsI, [["rounds = Math.max(rounds, i - target);", "rounds = Math.max(rounds, target - i);"]]),
        variant("ties-reversed", "Bubble sort never swaps equal values, so equal values keep their order: break ties by index.", bubbleSortRoundsI, [["values[p] - values[q] || p - q", "values[p] - values[q] || q - p"]]),
      ],
      hints: ["Sort the indices by (value, index).", "Element i ends at position target(i).", "The answer is the largest i − target(i), or 0."],
      cases: [
        example([[3, 2, 4, 1, 4]], 3, "CSES sample"),
        example([[1, 2, 3]], 0, "already sorted"),
        example([[4, 3, 2, 1]], 3, "reversed"),
        example([[1, 2, 1, 2]], 1, "equal values never swap"),
        run(bubbleSortRoundsI, [smallList(16700, 20, 1, 10)], "twenty values"),
        hidden("n = 2·10⁵, time limit", () => [BUBBLE_BIG()]),
      ],
    },
    {
      id: "bubble-sort-rounds-ii", title: "Bubble Sort Rounds II", cses: { id: 3152, name: "Bubble Sort Rounds II" },
      goal: "The array after k rounds of bubble sort (k can be up to 10⁹).",
      concept: "After k rounds the value at position j has moved left at most k steps, so it came from the first j + k + 1 values, and it is the smallest of those not already placed. A min-heap holding a window of k + 1 values produces the result left to right in O(n log n). More than n rounds change nothing.",
      functionName: "bubbleSortRoundsII", signature: "bubbleSortRoundsII(values, k) → values",
      starterSource: starter("bubbleSortRoundsII", "values, k", "k = min(k, n); heap of the first k values; for each j push value j + k (if any) and pop the minimum."),
      solve: bubbleSortRoundsII, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: bubbleSortRoundsIIBrute, small: (round) => [smallList(16800 + round, 1 + (round % 9), 1, 5), round % 12],
      reference: book("3.1", "Sorting theory · bubble sort"),
      presets: { "CSES sample": { a: [3, 2, 4, 1, 4], b: 2 }, "one round": { a: [5, 1, 4, 2], b: 1 }, "enough rounds": { a: [3, 1, 2], b: 1000000000 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("window-one-short", "After k rounds the window of candidates for a position holds k + 1 values, not k.", bubbleSortRoundsII, [["rounds = Math.min(k, n)", "rounds = Math.max(0, Math.min(k, n) - 1)"]]),
        diagnosis("sorts-completely", "k rounds are not always enough to finish; values still out of place stay out of place.", function bubbleSortRoundsII(values, k) { return values.slice().sort((p, q) => p - q); }),
      ],
      hints: ["rounds = min(k, n).", "Push values[0 … rounds − 1] into a min-heap.", "For j = 0 … n − 1: push values[j + rounds] if it exists, then pop the minimum into position j."],
      cases: [
        example([[3, 2, 4, 1, 4], 2], [2, 1, 3, 4, 4], "CSES sample"),
        example([[5, 1, 4, 2], 1], [1, 4, 2, 5], "one round"),
        example([[3, 1, 2], 1000000000], [1, 2, 3], "enough rounds to sort"),
        example([[2, 1], 0], [2, 1], "no rounds"),
        run(bubbleSortRoundsII, [smallList(16900, 15, 1, 10), 3], "three rounds of fifteen values"),
        hidden("n = 2·10⁵, k = 1000, time limit", () => [BUBBLE_BIG(), 1000]),
        hidden("n = 2·10⁵, k = 10⁹", () => [BUBBLE_BIG(), 1000000000]),
      ],
    },
    {
      id: "dominance-max", title: "Dominance Maximum", cses: { id: 3306, name: "Nearest Campsites I (brick)" },
      goal: "For each query point (x, y), the largest x' + y' over the points with x' ≤ x and y' ≤ y, or −1 if there is none.",
      concept: "Sweep all points and queries by x, points first on ties. When a point is swept, record x' + y' at its y in a Fenwick tree that keeps prefix maxima over compressed y. When a query is swept, every point with x' ≤ x is already in, so the prefix maximum up to its y answers it. O((n + q) log n).",
      functionName: "dominanceMax", signature: "dominanceMax(points, queries) → values",
      starterSource: starter("dominanceMax", "points, queries", "Compress y; sort events by x with points before queries; a max-Fenwick over y."),
      solve: dominanceMax, comparator: "deep", brute: dominanceMaxBrute, small: (round) => [randomPoints(17000 + round, 2 + (round % 6), 8), randomPoints(17050 + round, 1 + (round % 5), 8)],
      reference: book("9.2", "Binary indexed tree"),
      presets: { "a few points": { points: [[1, 1], [3, 2], [2, 5]], marks: [[3, 3], [1, 4], [4, 6]], a: [[1, 1], [3, 2], [2, 5]], b: [[3, 3], [1, 4], [4, 6]] } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("strict-dominance", "A point with the same x as the query counts too, so sweep points before queries on ties.", dominanceMax, [["events.sort((p, q) => p[0] - q[0] || p[1] - q[1]);", "events.sort((p, q) => p[0] - q[0] || q[1] - p[1]);"]]),
        variant("ignores-y", "Points above the query do not count; the Fenwick query stops at the query's own y.", dominanceMax, [["for (let i = index.get(y); i > 0;", "for (let i = ys.length; i > 0;"]]),
      ],
      hints: ["Compress all y values of points and queries.", "Events sorted by x, points before queries at equal x.", "Point: raise the prefix-max tree at its y to x + y. Query: read the prefix maximum up to its y (−1 when empty)."],
      cases: [
        run(dominanceMax, [[[1, 1], [3, 2], [2, 5]], [[3, 3], [1, 4], [4, 6]]], "a few points"),
        example([[[2, 2]], [[1, 1], [2, 2]]], [-1, 4], "a point on the query counts"),
        run(dominanceMax, [randomPoints(17100, 12, 20), randomPoints(17150, 8, 20)], "twelve points"),
        hidden("n = q = 5·10⁴, time limit", () => [DOMINANCE_POINTS(), DOMINANCE_QUERIES()]),
      ],
    },
    {
      id: "nearest-campsites-i", title: "Nearest Campsites I", cses: { id: 3306, name: "Nearest Campsites I" },
      goal: "The largest Manhattan distance from a free campsite to its nearest reserved campsite.",
      concept: "Split the reserved sites by quadrant around each free site. In the lower-left quadrant the distance is (x + y) − (x' + y'), so the nearest one there has the largest x' + y' dominated by the free site, which is exactly the dominance brick. Reflecting the coordinates turns each of the other three quadrants into the lower-left one. Take each free site's minimum over the four, then the maximum over the free sites.",
      functionName: "nearestCampsitesI", signature: "nearestCampsitesI(reserved, free) → distance",
      starterSource: starter("nearestCampsitesI", "reserved, free", "Four reflections × dominanceMax give each free site's nearest distance; return the largest."),
      solve: nearestCampsitesI, comparator: "scalar", dependencies: ["dominance-max"], brute: nearestCampsitesIBrute, small: (round) => splitPoints(17200 + round, 1 + (round % 5), 1 + (round % 6), 12),
      reference: book("29.7", "Manhattan distances"),
      presets: { "CSES sample": { points: SAMPLE_RESERVED, marks: SAMPLE_FREE, a: SAMPLE_RESERVED, b: SAMPLE_FREE } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("smallest-instead-of-largest", "The question asks for the worst-off free site: the largest of the nearest distances.", nearestCampsitesI, [["nearest.forEach((d) => { if (d > best) best = d; });", "best = nearest.reduce((low, d) => Math.min(low, d), Infinity);"]]),
        variant("first-free-site-only", "Every free site counts; take the maximum over all of them.", nearestCampsitesI, [["nearest.forEach((d) => { if (d > best) best = d; });", "best = nearest[0];"]]),
      ],
      hints: ["For each reflection (sx, sy) map both sets with x → C − x or y → C − y (C = 2 000 001).", "dominanceMax(reflected reserved, reflected free) gives the best x' + y'; the distance is (x + y) − that.", "Keep each free site's minimum over the four reflections, then return the largest."],
      cases: [
        example([SAMPLE_RESERVED, SAMPLE_FREE], 5, "CSES sample"),
        example([[[5, 5]], [[5, 6], [1, 1]]], 8, "two free sites"),
        run(nearestCampsitesI, splitPoints(17300, 6, 6, 20), "six and six"),
        hidden("n = m = 5·10⁴ (CSES allows 10⁵), time limit", () => CAMPSITES_BIG()),
      ],
    },
    {
      id: "nearest-campsites-ii", title: "Nearest Campsites II", cses: { id: 3307, name: "Nearest Campsites II" },
      goal: "For each free campsite, the Manhattan distance to its nearest reserved campsite.",
      concept: "The same four-quadrant idea as Nearest Campsites I, but every free site reports its own minimum. Each reflection makes one quadrant the lower-left, where the nearest reserved site maximises x' + y' among the dominated ones.",
      functionName: "nearestCampsitesII", signature: "nearestCampsitesII(reserved, free) → distances",
      starterSource: starter("nearestCampsitesII", "reserved, free", "Four reflections × dominanceMax; each free site keeps its smallest (x + y) − best."),
      solve: nearestCampsitesII, comparator: "deep", dependencies: ["dominance-max"], brute: nearestCampsitesIIBrute, small: (round) => splitPoints(17400 + round, 1 + (round % 5), 1 + (round % 6), 12),
      reference: book("29.7", "Manhattan distances"),
      presets: { "CSES sample": { points: SAMPLE_RESERVED, marks: SAMPLE_FREE, a: SAMPLE_RESERVED, b: SAMPLE_FREE } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("first-quadrant-found", "The nearest site can be in any quadrant; take the minimum over all four, not the first one that has a site.", nearestCampsitesII, [["if (value >= 0) nearest[i] = Math.min(nearest[i], queries[i][0] + queries[i][1] - value);", "if (value >= 0 && nearest[i] === Infinity) nearest[i] = queries[i][0] + queries[i][1] - value;"]]),
        variant("two-quadrants", "Up-left and down-right neighbours are just as close; all four reflections are needed.", nearestCampsitesII, [["[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach", "[[1, 1], [-1, -1]].forEach"], ["new Array(free.length).fill(Infinity)", "new Array(free.length).fill(4000000)"]]),
      ],
      hints: ["For each reflection (sx, sy) map both sets with x → C − x or y → C − y.", "dominanceMax gives the best x' + y' below and left of each reflected free site.", "nearest[i] = min over reflections of (x + y) − best."],
      cases: [
        example([SAMPLE_RESERVED, SAMPLE_FREE], [2, 5], "CSES sample"),
        example([[[5, 5]], [[5, 6], [1, 1]]], [1, 8], "two free sites"),
        example([[[1, 5], [5, 1]], [[4, 4]]], [4], "the nearest are up-left and down-right"),
        example([[[1, 1], [5, 6]], [[5, 5]]], [1], "a site down-left, but a nearer one above"),
        run(nearestCampsitesII, splitPoints(17500, 6, 6, 20), "six and six"),
        hidden("n = m = 5·10⁴ (CSES allows 10⁵), time limit", () => CAMPSITES_BIG()),
      ],
    },
    {
      id: "advertisement", title: "Advertisement", cses: { id: 1142, name: "Advertisement" },
      goal: "The largest rectangle that fits under the fence's boards (the largest rectangle in a histogram).",
      concept: "In the best rectangle some board is the lowest, and the rectangle spans as far as the boards stay at least that tall. A stack of increasing heights finds, for every board, the nearest lower board on each side: when a lower board arrives it pops the taller ones, and each popped board's span runs between the new board and the one below it on the stack. O(n).",
      functionName: "advertisement", signature: "advertisement(heights) → area",
      starterSource: starter("advertisement", "heights", "Monotonic stack; pop while the top is at least as tall as the new board; the popped board spans between its neighbours."),
      solve: advertisement, comparator: "scalar", brute: advertisementBrute, small: (round) => [smallList(17600 + round, 1 + (round % 9), 1, 6)],
      reference: book("8.2", "Nearest smaller elements"),
      presets: { "CSES sample": { a: [4, 1, 5, 3, 3, 2, 4, 1] }, "one board": { a: [7] }, "a staircase": { a: [1, 2, 3, 4, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("tallest-board-only", "A wider rectangle over several shorter boards can beat the tallest single board.", function advertisement(heights) { return heights.reduce((best, h) => Math.max(best, h), 0); }),
        variant("width-one-short", "The span between the lower neighbours at left and i holds i − left − 1 boards.", advertisement, [["heights[top] * (i - left - 1)", "heights[top] * (i - left - 2)"]]),
      ],
      hints: ["Walk i = 0 … n with a sentinel height 0 at the end.", "While the stack top is at least as tall as heights[i], pop it; left = the new top (or −1).", "The popped board's rectangle is heights[top] · (i − left − 1)."],
      cases: [
        example([[4, 1, 5, 3, 3, 2, 4, 1]], 10, "CSES sample"),
        example([[7]], 7, "one board"),
        example([[1, 2, 3, 4, 5]], 9, "a staircase"),
        example([[2, 2, 2]], 6, "equal boards"),
        run(advertisement, [smallList(17700, 20, 1, 10)], "twenty boards"),
        hidden("n = 2·10⁵, time limit", () => [HEIGHTS_BIG()]),
      ],
    },
    {
      id: "special-substrings", title: "Special Substrings", cses: { id: 2186, name: "Special Substrings" },
      goal: "The number of substrings in which every letter of the whole string appears the same number of times.",
      concept: "Take prefix counts of each letter that occurs in the string, and describe a prefix by the differences between each count and the first letter's count. A substring is special exactly when its two ends have the same difference vector, because then every letter grew by the same amount. Count equal vectors with a map: each new prefix pairs with all earlier prefixes of the same vector.",
      functionName: "specialSubstrings", signature: "specialSubstrings(s) → count",
      starterSource: starter("specialSubstrings", "s", "Letters of the string; key of a prefix = counts minus the first letter's count; count earlier prefixes with the same key."),
      solve: specialSubstrings, comparator: "scalar", brute: specialSubstringsBrute, small: (round) => [letters(17800 + round, 3 + (round % 9), 1 + (round % 3))],
      reference: book("9.1", "Static array queries · sum queries with a hash map"),
      presets: { "CSES sample": { a: "abccabab" }, "one letter": { a: "aaa" }, "repeated block": { a: "abcabc" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("includes-absent-letters", "Only letters of the string matter; comparing all 26 against 'a' treats a missing letter as one that must stay level.", specialSubstrings, [["const letters = Array.from(new Set(s)).sort();", "const letters = \"abcdefghijklmnopqrstuvwxyz\".split(\"\");"]]),
        variant("counts-empty-substrings", "A substring needs at least one letter; a prefix does not pair with itself.", specialSubstrings, [["total += before;", "total += before + 1;"]]),
      ],
      hints: ["letters = the distinct letters of s; start with all counts 0.", "key = letters.map(c ⇒ count[c] − count[letters[0]]).join(',').", "Before counting a prefix add the number of earlier prefixes with the same key."],
      cases: [
        example(["abccabab"], 5, "CSES sample"),
        example(["aaa"], 6, "one letter: every substring"),
        example(["abcabc"], 5, "a repeated block"),
        example(["ab"], 1, "only the whole string"),
        run(specialSubstrings, ["abacabcbacbacbca"], "sixteen letters"),
        hidden("n = 2·10⁵, a repeated alphabet, time limit", () => [SPECIAL_BIG()]),
        hidden("n = 2·10⁵ over three letters", () => [SPECIAL_THREE()]),
      ],
    },
    {
      id: "counting-lcm-arrays", title: "Counting LCM Arrays", cses: { id: 3169, name: "Counting LCM Arrays" },
      goal: "For each test [n, k], the number of arrays of length n whose adjacent pairs all have lcm k, modulo 10⁹ + 7.",
      concept: "Every element divides k, and each prime of k can be handled on its own. For a prime with exponent e, an element's exponent is either e ('full') or one of e smaller values ('low'), and two lows may never be neighbours. Counting such sequences is a two-state recurrence, full ← full + low and low ← e · full, raised to length n with a 2 × 2 matrix power. The answer is the product over k's primes.",
      functionName: "countingLcmArrays", signature: "countingLcmArrays(tests) → counts",
      starterSource: starter("countingLcmArrays", "tests", "Factor k by trial division; per prime exponent e, [[1, 1], [e, 0]]^(n − 1) applied to (1, e); multiply the totals."),
      solve: countingLcmArrays, comparator: "deep", dependencies: ["mul-mod", "matrix-power"], brute: countingLcmArraysBrute, small: (round) => [[[2 + (round % 4), 1 + (round % 60)], [2 + (round % 3), 12], [3, 1 + ((round * 7) % 40)]]],
      reference: book("23.2", "Linear recurrences"),
      presets: { "CSES sample": { a: [4, 6, 42], b: [[3, 4], [4, 6], [1337, 42]] }, "k = 1": { a: [1], b: [[5, 1]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetB" }] },
      diagnoses: [
        variant("every-element-a-divisor", "Each element divides k, but neighbours must reach the full exponent together; (e + 1)^n counts arrays whose lcm falls short.", countingLcmArrays, [["answer = mulMod(answer, (top + low) % m, m);", "answer = mulMod(answer, matrixPower([[e + 1]], n, m)[0][0], m);"]]),
        variant("low-as-one-choice", "A 'low' exponent can be any of 0 … e − 1: e choices, not one.", countingLcmArrays, [["[[1, 1], [e % m, 0]]", "[[1, 1], [1, 0]]"]]),
      ],
      hints: ["Factor k by trial division up to √k; a leftover above 1 is a prime with exponent 1.", "For exponent e: full(i+1) = full(i) + low(i), low(i+1) = e · full(i), starting from (1, e).", "matrixPower([[1, 1], [e, 0]], n − 1, mod) turns (1, e) into (full(n), low(n)); multiply full + low over the primes."],
      cases: [
        example([[[3, 4], [4, 6], [1337, 42]]], [11, 64, 602746233], "CSES sample"),
        example([[[5, 1]]], [1], "k = 1: all ones"),
        example([[[2, 2]]], [3], "k = 2: [1, 2], [2, 1], [2, 2]"),
        run(countingLcmArrays, [[[6, 360], [10, 97], [3, 1000000007 - 8]]], "three tests"),
        hidden("t = 1000, n and k up to 10⁹, time limit", () => [LCM_TESTS()]),
      ],
    },
    {
      id: "square-subsets", title: "Square Subsets", cses: { id: 3193, name: "Square Subsets" },
      goal: "The number of subsets (the empty one included) whose product is a perfect square, modulo 10⁹ + 7.",
      concept: "A product is a square when every prime appears an even number of times, so describe each number by the parities of its prime exponents: a vector over GF(2) with one bit per prime up to 5000. Square subsets are the subsets whose vectors xor to zero, and by linear algebra there are 2^(n − rank) of them. Gaussian elimination on bitsets finds the rank.",
      functionName: "squareSubsets", signature: "squareSubsets(values) → count",
      starterSource: starter("squareSubsets", "values", "Parity vectors over primes ≤ 5000 as Int32 bitsets; insert into a xor basis; answer 2^(n − rank)."),
      solve: squareSubsets, comparator: "scalar", dependencies: ["mod-pow"], brute: squareSubsetsBrute, small: (round) => [smallList(17900 + round, 2 + (round % 9), 1, 30)],
      reference: book("10.4", "Bit optimizations · xor basis"),
      presets: { "CSES sample": { a: [2, 2, 3, 6] }, "all squares": { a: [1, 4, 9] }, "distinct primes": { a: [2, 3, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("square-elements-only", "Non-squares can combine into a square, like 2 · 8 or 2 · 3 · 6.", function squareSubsets(values) { let squares = 0; values.forEach((v) => { const r = Math.round(Math.sqrt(v)); if (r * r === v) squares += 1; }); return modPow(2, squares, 1000000007); }),
        variant("forgets-the-empty-subset", "The empty subset has product 1, a square, and counts.", squareSubsets, [["return modPow(2, values.length - rank, m);", "return (modPow(2, values.length - rank, m) - 1 + m) % m;"]]),
      ],
      hints: ["Sieve the primes up to 5000 (669 of them) and give each a bit.", "For each value build its parity bitset and reduce it by the basis from the highest bit down; a nonzero remainder joins the basis.", "The answer is 2^(n − rank)."],
      cases: [
        example([[2, 2, 3, 6]], 4, "CSES sample"),
        example([[1, 4, 9]], 8, "all squares: every subset"),
        example([[2, 3, 5]], 1, "distinct primes: only the empty subset"),
        run(squareSubsets, [[6, 10, 15, 2, 3, 5, 12, 18, 30, 7]], "ten numbers"),
        hidden("n = 5000, time limit", () => [SQUARES_BIG()]),
      ],
    },
    {
      id: "subarray-sum-constraints", title: "Subarray Sum Constraints", cses: { id: 3294, name: "Subarray Sum Constraints" },
      goal: "An array satisfying every constraint 'x_l + … + x_r = s', or null if the constraints contradict each other; any valid array is accepted.",
      concept: "With prefix sums P, a constraint says P[r] − P[l − 1] = s. A union-find that stores each node's offset from its root merges these equations, and an equation between two nodes already joined is a consistency check. At the end set every root's P to 0, read the offsets, and x_i = P[i] − P[i − 1].",
      functionName: "subarraySumConstraints", signature: "subarraySumConstraints(n, constraints) → array or null",
      starterSource: starter("subarraySumConstraints", "n, constraints", "Weighted union-find over prefix indices 0 … n; offset = P[v] − P[root]; check or merge each equation; difference the prefix values."),
      solve: subarraySumConstraints, comparator: "deep", accept: subarraySumConstraintsAccept, check: viaBrute(subarraySumConstraintsAccept, subarraySumConstraintsBrute), small: (round) => { const n = 1 + (round % 4); return [n, sumConstraints(18000 + round, n, 1 + (round % 5), round % 4 !== 0)]; },
      reference: book("15.2", "Union-find structure · weighted"),
      presets: { "CSES sample": { a: [[1, 3, 3], [3, 5, 3], [4, 4, -1]], b: 5 }, "a contradiction": { a: [[1, 2, 3], [1, 1, 1], [2, 2, 1]], b: 2 } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetA" }] },
      diagnoses: [
        variant("never-checks-conflicts", "An equation between two prefix values that are already linked must agree with them; if not, there is no solution.", subarraySumConstraints, [["if (a === b) { if (offset[r] - offset[l - 1] !== s) return null; continue; }", "if (a === b) continue;"]]),
        variant("sign-flipped", "P[r] − P[l − 1] = s, so the new root's offset is offset[l − 1] + s − offset[r].", subarraySumConstraints, [["offset[b] = offset[l - 1] + s - offset[r];", "offset[b] = offset[l - 1] - s - offset[r];"]]),
      ],
      hints: ["Nodes 0 … n are prefix sums; offset[v] = P[v] − P[root(v)], updated during path compression.", "For (l, r, s): roots a of l − 1 and b of r. Equal roots → check offset[r] − offset[l − 1] = s; else parent[b] = a with offset[b] = offset[l − 1] + s − offset[r].", "Finally P[v] = offset[v] and x_i = P[i] − P[i − 1]."],
      cases: [
        example([5, [[1, 3, 3], [3, 5, 3], [4, 4, -1]]], [0, 2, 1, -1, 3], "CSES sample"),
        example([2, [[1, 2, 3], [1, 1, 1], [2, 2, 1]]], null, "a contradiction"),
        example([3, []], [0, 0, 0], "no constraints"),
        run(subarraySumConstraints, [6, sumConstraints(18100, 6, 8, true)], "six values, eight constraints"),
        hidden("n = 5000, m = 2·10⁵, consistent, time limit", () => [5000, CONSTRAINTS_OK()]),
        hidden("n = 5000, m = 2·10⁵ with one bad sum", () => [5000, CONSTRAINTS_BAD()]),
      ],
    },
    {
      id: "water-containers-moves", title: "Water Containers Moves", cses: { id: 3213, name: "Water Containers Moves" },
      goal: "Moves that leave exactly x units in container A while moving the least total water: { total, moves } with moves named FILL A/B, EMPTY A/B, MOVE A B, MOVE B A, or −1 if x cannot be measured. Any cheapest plan is accepted.",
      concept: "A state is the pair (water in A, water in B), at most 1001 × 1001 of them, and each of the six moves is an edge whose cost is the water it moves. So this is a shortest path from (0, 0) to any state with x in A. Every cost is at most 1000, so Dijkstra can use 1001 buckets indexed by distance instead of a heap (Dial's algorithm). Parent links rebuild the moves.",
      functionName: "waterContainersMoves", signature: "waterContainersMoves(a, b, x) → { total, moves } or −1",
      starterSource: starter("waterContainersMoves", "a, b, x", "Dijkstra over states A · (b + 1) + B; an edge's cost is the water it moves; stop at the first state with A = x."),
      solve: waterContainersMoves, comparator: "deep", accept: waterContainersMovesAccept, check: viaBrute(waterContainersMovesAccept, waterContainersMovesBrute), small: (round) => [1 + (round % 6), 1 + ((round * 5) % 6), 1 + ((round * 3) % 6)],
      reference: book("13.2", "Dijkstra's algorithm"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "a", type: "slider", label: "a (rounded)", value: 5, min: 1, max: 12 },
        { id: "b", type: "slider", label: "b (rounded)", value: 3, min: 1, max: 12 },
        { id: "x", type: "slider", label: "x (rounded)", value: 4, min: 1, max: 12 },
      ], args: [{ fixture: "roundedA" }, { fixture: "roundedB" }, { fixture: "roundedX" }] },
      diagnoses: [
        variant("counts-moves-not-water", "The cost is the water each move carries; the cheapest plan can take more moves than the shortest one.", waterContainersMoves, [["d + cost", "d + 1", true]]),
        variant("stops-when-b-has-x", "The x units must end up in container A; reaching x in B is not the goal.", waterContainersMoves, [["if (A === x) {", "if (A === x || B === x) {"]]),
      ],
      hints: ["State index A · (b + 1) + B; start at (0, 0) with distance 0.", "From (A, B): fill, empty or pour, each costing the water that moves; skip moves that move nothing.", "Pop states in order of distance (1001 buckets suffice); the first with A = x is the answer, and the parent links give the moves."],
      cases: [
        example([5, 3, 4], { total: 19, moves: ["FILL A", "MOVE A B", "EMPTY B", "MOVE A B", "FILL A", "MOVE A B"] }, "CSES sample"),
        example([2, 4, 3], -1, "x larger than container A"),
        example([4, 6, 3], -1, "gcd(4, 6) = 2 cannot make 3"),
        run(waterContainersMoves, [3, 5, 2], "the water reaches 2 in B first"),
        run(waterContainersMoves, [7, 11, 5], "a = 7, b = 11"),
        hidden("a = 1000, b = 999, x = 500, time limit", () => [1000, 999, 500]),
        hidden("a = 997, b = 991, x = 1", () => [997, 991, 1]),
      ],
    },
    {
      id: "water-containers-queries", title: "Water Containers Queries", cses: { id: 3214, name: "Water Containers Queries" },
      goal: "For each test [a, b, x], whether exactly x units can be left in container A (true/false).",
      concept: "Every amount you can ever have is a combination p·a + q·b, so it is a multiple of g = gcd(a, b). Conversely, pouring B into A over and over produces every multiple of g up to a (Bézout's identity). So the answer is x ≤ a and x divisible by g.",
      functionName: "waterContainersQueries", signature: "waterContainersQueries(tests) → booleans",
      starterSource: starter("waterContainersQueries", "tests", "For each test: x ≤ a && x % gcd(a, b) === 0."),
      solve: waterContainersQueries, comparator: "deep", brute: waterContainersQueriesBrute, small: (round) => [[[1 + (round % 8), 1 + ((round * 5) % 8), 1 + ((round * 3) % 9)], [2 + (round % 5), 4, 1 + (round % 6)]]],
      reference: book("21.3", "Solving equations"),
      presets: { "CSES sample": { a: [4, 1, 2, 1, 42, 123, 123], b: [[5, 3, 4], [1, 1, 1], [1, 1, 2], [2, 2, 1], [123, 456, 42], [1000, 999, 123], [1000, 998, 123]] }, "x must fit in A": { a: [4, 2, 7], b: [[2, 4, 4], [6, 4, 2], [7, 3, 7]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetB" }] },
      diagnoses: [
        variant("ignores-capacity", "The water has to fit in container A: x can never exceed a.", waterContainersQueries, [["x <= a && x % gcd(a, b) === 0", "x % gcd(a, b) === 0"]]),
        variant("fits-in-either", "The x units must end up in A, so only A's size limits x, even when B is larger.", waterContainersQueries, [["x <= a && x % gcd(a, b) === 0", "x <= Math.max(a, b) && x % gcd(a, b) === 0"]]),
      ],
      hints: ["gcd by Euclid's algorithm.", "Only multiples of gcd(a, b) can ever be measured.", "They also have to fit: x ≤ a."],
      cases: [
        example([[[5, 3, 4], [1, 1, 1], [1, 1, 2], [2, 2, 1], [123, 456, 42], [1000, 999, 123], [1000, 998, 123]]], [true, true, false, false, true, true, false], "CSES sample"),
        example([[[2, 4, 4], [6, 4, 2], [7, 3, 7]]], [false, true, true], "x must fit in A"),
        run(waterContainersQueries, [[[12, 18, 6], [12, 18, 4], [9, 6, 3], [1000000000, 999999999, 1]]], "four tests"),
        hidden("t = 1000, values up to 10⁹, time limit", () => [WATER_TESTS()]),
      ],
    },
    {
      id: "stack-weights", title: "Stack Weights", cses: { id: 2425, name: "Stack Weights" },
      goal: "Coins 1 … n have distinct weights in that order (coin n heaviest). After each move of a coin onto the left (1) or right (2) stack, '>' if the left stack is surely heavier, '<' if the right one surely is, else '?'.",
      concept: "Let D[j] be the number of left coins with index ≥ j minus the number of right coins with index ≥ j. If D[j] ≥ 0 for every j, each right coin can be matched with a heavier left coin, so the left stack is heavier whatever the weights (strictly, once some D[j] > 0). If some D[j] < 0, weights can be chosen that make the right side win. Placing coin c adds ±1 to D[1 … c], so a segment tree with lazy range addition that keeps the minimum and maximum answers each move in O(log n).",
      functionName: "stackWeights", signature: "stackWeights(n, moves) → symbols",
      starterSource: starter("stackWeights", "n, moves", "Range add ±1 on D[1..coin]; '>' if min ≥ 0 and max > 0, '<' if max ≤ 0 and min < 0, else '?'."),
      solve: stackWeights, comparator: "deep", brute: stackWeightsBrute, small: (round) => { const n = 1 + (round % 9); return [n, coinMoves(19000 + round, n)]; },
      reference: book("9.4", "Lazy propagation"),
      presets: { "CSES sample": { a: [2, 1], b: [3], c: 3, d: [[2, 1], [3, 2], [1, 1]] }, "two light against one heavy": { a: [1, 2], b: [3], c: 3, d: [[1, 1], [2, 1], [3, 2]] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetD" }] },
      diagnoses: [
        diagnosis("compares-counts", "More coins are not surely heavier: one heavy coin can outweigh several light ones.", function stackWeights(n, moves) { let left = 0, right = 0; return moves.map(([coin, stack]) => { if (stack === 1) left += 1; else right += 1; return left > right ? ">" : left < right ? "<" : "?"; }); }),
        diagnosis("compares-heaviest-coin", "The heaviest coin alone does not decide it: the coins just below it can add up to more.", function stackWeights(n, moves) { let left = 0, right = 0; return moves.map(([coin, stack]) => { if (stack === 1) left = Math.max(left, coin); else right = Math.max(right, coin); return left > right ? ">" : left < right ? "<" : "?"; }); }),
      ],
      hints: ["D[j] = (left coins ≥ j) − (right coins ≥ j), all zero at the start.", "Coin c on the left adds 1 to D[1..c]; on the right it subtracts 1.", "Keep min and max of D in a lazy segment tree: all ≥ 0 with some > 0 means '>', the mirror means '<'."],
      cases: [
        example([3, [[2, 1], [3, 2], [1, 1]]], [">", "<", "?"], "CSES sample"),
        example([2, [[1, 1], [2, 2]]], [">", "<"], "the heavier coin decides"),
        example([3, [[1, 1], [2, 1], [3, 2]]], [">", ">", "?"], "two light coins against a heavy one"),
        example([3, [[1, 1], [3, 1], [2, 2]]], [">", ">", ">"], "the heaviest coin plus one more"),
        run(stackWeights, [8, coinMoves(19100, 8)], "eight coins"),
        hidden("n = 2·10⁵, time limit", () => [200000, COINS_BIG()]),
      ],
    },
    {
      id: "maximum-average-subarrays", title: "Maximum Average Subarrays", cses: { id: 3301, name: "Maximum Average Subarrays" },
      goal: "For each index i, the length of the subarray ending at i with the largest average; on ties, the longest one.",
      concept: "With prefix sums P, the average of the subarray (j, i] is the slope from the point (j, P_j) to (i, P_i). The largest slope into (i, P_i) touches the lower convex hull of the earlier points, and along the hull the slopes towards i first rise then fall, so a binary search finds the tangent (staying left on ties, for the longest). Then i joins the hull, popping points that fall above it.",
      functionName: "maximumAverageSubarrays", signature: "maximumAverageSubarrays(values) → lengths",
      starterSource: starter("maximumAverageSubarrays", "values", "Prefix points (i, P_i); lower hull with crossSign; binary search the tangent from each new point; answer i − j."),
      solve: maximumAverageSubarrays, comparator: "deep", dependencies: ["cross-sign"], brute: maximumAverageSubarraysBrute, small: (round) => [smallList(20000 + round, 1 + (round % 9), 1, round % 3 ? 5 : 1000000)],
      reference: book("29.6", "Convex hull"),
      presets: { "CSES sample": { a: [1, 6, 4, 6, 2, 5, 5] }, "equal values": { a: [3, 3, 3] }, "a late dip": { a: [9, 9, 9, 10, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("shortest-on-ties", "On equal averages the longest subarray wins: stay on the earlier hull point when the slopes tie.", maximumAverageSubarrays, [["if (cross(hull[mid], hull[mid + 1], i) > 0) lo = mid + 1;", "if (cross(hull[mid], hull[mid + 1], i) >= 0) lo = mid + 1;"]]),
        diagnosis("extends-previous-best", "Appending to the previous best is not enough: after a low value, starting further left can dilute it less.", function maximumAverageSubarrays(values) { const out = []; let sum = 0, length = 0; values.forEach((x) => { if (length && sum >= x * length) { sum += x; length += 1; } else { sum = x; length = 1; } out.push(length); }); return out; }),
      ],
      hints: ["P_0 = 0 and P_i = P_{i−1} + x_i; the hull starts as [0].", "For i, binary search the first hull point after which the next one is not strictly below the line to (i, P_i).", "Answer i − that point; then pop while the last two hull points and i do not turn left, and push i."],
      cases: [
        example([[1, 6, 4, 6, 2, 5, 5]], [1, 1, 2, 1, 4, 1, 2], "CSES sample"),
        example([[3, 3, 3]], [1, 2, 3], "equal values: the longest"),
        example([[9, 9, 9, 10, 0]], [1, 2, 3, 1, 5], "a low value makes the long start win"),
        run(maximumAverageSubarrays, [smallList(20100, 16, 1, 9)], "sixteen values"),
        hidden("n = 2·10⁵, time limit", () => [AVERAGE_BIG()]),
      ],
    },
    {
      id: "subsets-with-fixed-average", title: "Subsets with Fixed Average", cses: { id: 3302, name: "Subsets with Fixed Average" },
      goal: "The number of nonempty subsets whose average is exactly a, modulo 10⁹ + 7.",
      concept: "Subtract a from every value: a subset has average a exactly when its shifted values sum to 0. Split them into excesses above a and shortfalls below it; the subset balances when its excesses and shortfalls have equal totals. Counting subsets of each side by total is a counting knapsack up to the smaller side's sum, and values equal to a can be in or out freely. Subtract 1 for the empty subset.",
      functionName: "subsetsWithFixedAverage", signature: "subsetsWithFixedAverage(values, a) → count",
      starterSource: starter("subsetsWithFixedAverage", "values, a", "Excesses and shortfalls; subset-count tables by sum; Σ up[s] · down[s] · 2^(values equal to a) − 1."),
      solve: subsetsWithFixedAverage, comparator: "scalar", dependencies: ["mul-mod", "mod-pow"], brute: subsetsWithFixedAverageBrute, small: (round) => [smallList(21000 + round, 3 + (round % 9), 1, 6), 1 + (round % 5)],
      reference: book("7.4", "Knapsack problems"),
      presets: { "CSES sample": { a: [1, 1, 2, 3, 4], b: 2 }, "all equal to a": { a: [5, 5, 5], b: 5 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("forgets-values-equal-to-a", "A value equal to a keeps any balanced subset balanced, so each doubles the count.", subsetsWithFixedAverage, [["return (mulMod(balanced, modPow(2, zeros, m), m) - 1 + m) % m;", "return (balanced - 1 + m) % m;"]]),
        variant("counts-the-empty-subset", "The empty subset has no average; leave it out.", subsetsWithFixedAverage, [["return (mulMod(balanced, modPow(2, zeros, m), m) - 1 + m) % m;", "return mulMod(balanced, modPow(2, zeros, m), m);"]]),
      ],
      hints: ["up = values above a minus a; down = a minus values below a; count the values equal to a.", "ways(list)[s] = subsets of list with sum s, a 0/1 knapsack count up to min(Σup, Σdown).", "Σ_s ways(up)[s] · ways(down)[s] · 2^equal, minus 1."],
      cases: [
        example([[1, 1, 2, 3, 4], 2], 7, "CSES sample"),
        example([[5, 5, 5], 5], 7, "every value equals a"),
        example([[1, 2], 5], 0, "a above every value"),
        run(subsetsWithFixedAverage, [[3, 1, 4, 1, 5, 9, 2, 6], 4], "eight values"),
        hidden("n = 500, a = 250, time limit", () => [FIXED_BIG(), 250]),
        hidden("n = 500, a = 1", () => [FIXED_BIG(), 1]),
      ],
    },
    {
      id: "two-array-average", title: "Two Array Average", cses: { id: 3361, name: "Two Array Average" },
      goal: "Nonempty prefix lengths [i, j] of the two arrays whose combined average is as large as possible; any best pair is accepted.",
      concept: "Binary search on the answer λ. Some pair reaches average ≥ λ exactly when (A_i − λ·i) + (B_j − λ·j) ≥ 0 for some i, j, and the two terms can be maximised separately, so each test is one pass. After enough halvings, the best i and j at the final λ are an optimal pair.",
      functionName: "twoArrayAverage", signature: "twoArrayAverage(first, second) → [i, j]",
      starterSource: starter("twoArrayAverage", "first, second", "Prefix sums; bisect λ: feasible if max_i (A_i − λi) + max_j (B_j − λj) ≥ 0; return the maximisers at the end."),
      solve: twoArrayAverage, comparator: "deep", accept: twoArrayAverageAccept, check: viaBrute(twoArrayAverageAccept, twoArrayAverageBrute), small: (round) => [smallList(22000 + round, 1 + (round % 9), 1, 9), smallList(22050 + round, 1 + (round % 9), 1, 9)],
      reference: book("3.3", "Binary search"),
      presets: { "CSES sample": { a: [1, 5, 5, 2], b: [3, 1, 3, 1] }, "a low second array": { a: [5, 4], b: [1, 1] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("best-prefix-of-each", "The best prefix of each array on its own is not the best pair: a lower second array rewards a longer first prefix.", function twoArrayAverage(first, second) { const best = (list) => { let sum = 0, at = 1, value = -1; list.forEach((v, i) => { sum += v; if (sum / (i + 1) > value) { value = sum / (i + 1); at = i + 1; } }); return at; }; return [best(first), best(second)]; }),
        diagnosis("equal-lengths", "The two prefixes may have different lengths.", function twoArrayAverage(first, second) { let sum = 0, at = 1, value = -1; for (let k = 1; k <= first.length; k += 1) { sum += first[k - 1] + second[k - 1]; if (sum / (2 * k) > value) { value = sum / (2 * k); at = k; } } return [at, at]; }),
      ],
      hints: ["Prefix sums A and B.", "Feasible(λ): max_i (A_i − λi) + max_j (B_j − λj) ≥ 0.", "Bisect λ for about 100 rounds between 0 and 10⁹; return the maximising i and j at the lower end."],
      cases: [
        example([[1, 5, 5, 2], [3, 1, 3, 1]], [3, 1], "CSES sample"),
        example([[5, 4], [1, 1]], [2, 1], "a longer first prefix pays off"),
        run(twoArrayAverage, [smallList(22100, 10, 1, 20), smallList(22150, 10, 1, 20)], "ten and ten"),
        hidden("n = 10⁵, time limit", () => [TWO_A(), TWO_B()]),
      ],
    },
    {
      id: "pyramid-array", title: "Pyramid Array", cses: { id: 1747, name: "Pyramid Array" },
      goal: "The fewest adjacent swaps that make the distinct values first increase and then decrease.",
      concept: "Settle the values from the smallest up. The smallest value must end at one of the two ends, and taking it there costs one swap per larger value on that side; nothing else changes the larger values' order. So pay the cheaper side and forget the value. A Fenwick tree over positions counts the values still present on each side.",
      functionName: "pyramidArray", signature: "pyramidArray(values) → swaps",
      starterSource: starter("pyramidArray", "values", "Fenwick tree of present positions; for values in increasing order add min(present to the left, present to the right) and remove the value."),
      solve: pyramidArray, comparator: "scalar", dependencies: ["fenwick-add", "fenwick-prefix"], brute: pyramidArrayBrute, small: (round) => [randomPermutation(23000 + round, 1 + (round % 9)).map((v) => v * 3)],
      reference: book("9.2", "Fenwick tree · counting inversions"),
      presets: { "CSES sample": { a: [2, 1, 5, 3] }, "increasing": { a: [1, 2, 3] }, "smallest in the middle": { a: [3, 1, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("always-to-the-left", "The smallest value may leave by either end; take whichever side has fewer values left.", pyramidArray, [["total += Math.min(left, right);", "total += left;"]]),
        variant("counts-settled-values", "Values already sent to an end are no longer in the way; count only the ones still present.", pyramidArray, [["const left = fenwickPrefix(tree, i), right = remaining - fenwickPrefix(tree, i + 1);", "const left = i, right = values.length - 1 - i;"]]),
      ],
      hints: ["Fenwick tree with a 1 at every position.", "For each value from the smallest: left = present before it, right = present after it.", "Add min(left, right), then clear its position."],
      cases: [
        example([[2, 1, 5, 3]], 1, "CSES sample"),
        example([[1, 2, 3]], 0, "already increasing"),
        example([[3, 1, 2]], 1, "the smallest must reach an end"),
        run(pyramidArray, [[7, 2, 9, 4, 1, 8, 3, 6, 5]], "nine values"),
        hidden("n = 2·10⁵, time limit", () => [PYRAMID_BIG()]),
      ],
    },
    {
      id: "permutation-subsequence", title: "Permutation Subsequence", cses: { id: 3404, name: "Permutation Subsequence" },
      goal: "A longest common subsequence of two permutations, as { length, sequence }; any longest one is accepted.",
      concept: "Replace each value of the first array by its position in the second, dropping values the second lacks. A common subsequence is exactly a run of those positions that increases, so the answer is a longest increasing subsequence: patience sorting with lower bound in O(n log n), keeping a predecessor link for each element to rebuild the sequence.",
      functionName: "permutationSubsequence", signature: "permutationSubsequence(a, b) → { length, sequence }",
      starterSource: starter("permutationSubsequence", "a, b", "Positions in b; LIS over those positions with lowerBound on tails; predecessor links rebuild the values."),
      solve: permutationSubsequence, comparator: "deep", dependencies: ["lower-bound"], accept: permutationSubsequenceAccept, check: viaBrute(permutationSubsequenceAccept, permutationSubsequenceBrute), small: (round) => [randomPermutation(24000 + round, 1 + (round % 9)), randomPermutation(24050 + round, 1 + ((round * 3) % 9))],
      reference: book("7.2", "Longest increasing subsequence"),
      presets: { "CSES sample": { a: [3, 1, 2, 8, 5, 7, 6, 4], b: [6, 5, 1, 2, 3, 4] }, "reversed": { a: [1, 2, 3], b: [3, 2, 1] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("increasing-values", "Increasing values are not the point; the positions in the second array must increase.", permutationSubsequence, [["const p = position.get(v), at = lowerBound(tails, p);", "const p = v, at = lowerBound(tails, p);"]]),
        variant("reads-the-tails", "The tails array is not a subsequence: each tail may come from a different candidate. Follow the predecessor links from the last tail.", permutationSubsequence, [["for (let i = tails.length ? tailIndex[tails.length - 1] : -1; i >= 0; i = previous[i]) sequence.push(items[i]);", "tailIndex.slice().reverse().forEach((i) => sequence.push(items[i]));"]]),
      ],
      hints: ["position[v] = index of v in b; keep only the values of a that b contains.", "Patience sorting: tails[k] = smallest last position of an increasing run of length k + 1; record which element sits there.", "Each element links to the element at tails[k − 1] when it arrives; walk back from the last tail."],
      cases: [
        example([[3, 1, 2, 8, 5, 7, 6, 4], [6, 5, 1, 2, 3, 4]], { length: 3, sequence: [1, 2, 4] }, "CSES sample"),
        example([[1, 2, 3], [3, 2, 1]], { length: 1, sequence: [3] }, "reversed: any single value"),
        example([[1, 2], [3, 1, 2]], { length: 2, sequence: [1, 2] }, "values missing from a are skipped"),
        run(permutationSubsequence, [randomPermutation(24100, 12), randomPermutation(24150, 10)], "twelve and ten"),
        hidden("n = m = 2·10⁵, time limit", () => [LCS_A(), LCS_B()]),
      ],
    },
    {
      id: "bit-inversions", title: "Bit Inversions", cses: { id: 1188, name: "Bit Inversions" },
      goal: "After each flip of one bit, the length of the longest run of equal bits.",
      concept: "A segment tree whose nodes store their length, first and last bit, longest prefix run, longest suffix run and longest run. Two halves combine by joining the left suffix run and the right prefix run when the bits at the seam match (and a prefix run that fills a whole half continues into the other). A flip changes one leaf and its O(log n) ancestors.",
      functionName: "bitInversions", signature: "bitInversions(bits, changes) → lengths",
      starterSource: starter("bitInversions", "bits, changes", "Segment tree of (length, first, last, prefix, suffix, best); merge across the seam when the bits match; flip a leaf and recompute its ancestors."),
      solve: bitInversions, comparator: "deep", brute: bitInversionsBrute, small: (round) => { const n = 1 + (round % 9); return [bitString(25000 + round, n), smallList(25050 + round, 5, 1, n)]; },
      reference: book("9.3", "Segment tree · additional information in nodes"),
      presets: { "CSES sample": { a: "001011", b: [3, 2, 5] }, "alternating": { a: "0101", b: [2, 3] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("ignores-the-seam", "The longest run can cross the middle of a node: add the left suffix and right prefix runs when the bits match.", bitInversions, [["best[v] = Math.max(best[l], best[r], joins ? suffix[l] + prefix[r] : 0);", "best[v] = Math.max(best[l], best[r]);"]]),
        variant("prefix-stops-at-the-seam", "When a whole half is one run, the prefix (or suffix) run keeps going into the other half.", bitInversions, [["prefix[v] = prefix[l] === length[l] && joins ? length[l] + prefix[r] : prefix[l];", "prefix[v] = prefix[l];"], ["suffix[v] = suffix[r] === length[r] && joins ? length[r] + suffix[l] : suffix[r];", "suffix[v] = suffix[r];"]]),
      ],
      hints: ["Leaves: length 1 and prefix = suffix = best = 1.", "joins = last bit of the left child equals first bit of the right child.", "prefix extends when the left prefix covers the whole left child; best = max(both bests, suffix(l) + prefix(r) if joins)."],
      cases: [
        example(["001011", [3, 2, 5]], [4, 2, 3], "CSES sample"),
        example(["1", [1, 1]], [1, 1], "one bit"),
        example(["0101", [2, 3]], [3, 2], "alternating bits"),
        run(bitInversions, [bitString(25100, 20), smallList(25150, 10, 1, 20)], "twenty bits"),
        hidden("n = m = 2·10⁵, time limit", () => [BITS_BIG(), FLIPS_BIG()]),
      ],
    },
    {
      id: "writing-numbers", title: "Writing Numbers", cses: { id: 1086, name: "Writing Numbers" },
      goal: "Each key 0–9 can be pressed at most n times: the last number of 1, 2, 3, … you can write. n (up to 10¹⁸) and the answer are decimal strings.",
      concept: "Among 1 … x the digit 1 is always used at least as often as any other digit, so key 1 runs out first. Binary search the largest x whose numbers 1 … x contain at most n ones, counting the ones place by place: for each power of ten, the full cycles above it and the partial digit at it. BigInt keeps 10¹⁸ exact.",
      functionName: "writingNumbers", signature: "writingNumbers(n) → string",
      starterSource: starter("writingNumbers", "n", "ones(x) counts digit 1 in 1..x place by place; binary search the largest x with ones(x) ≤ n, all in BigInt."),
      solve: writingNumbers, comparator: "scalar", brute: writingNumbersBrute, small: (round) => [String(1 + (round % 90))],
      reference: book("3.3", "Binary search"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 60 }], args: [{ fixture: "roundedNString" }] },
      diagnoses: [
        variant("first-unwritable", "The answer is the last number you can finish; the next one already needs one press too many.", writingNumbers, [["return lo.toString();", "return (lo + 1n).toString();"]]),
        variant("units-place-only", "A 1 in the tens, hundreds, … place uses the key too: 11 alone presses it twice.", writingNumbers, [["for (let place = 1n; place <= x; place *= 10n)", "for (let place = 1n; place <= x && place < 10n; place *= 10n)"]]),
      ],
      hints: ["For place p: high = ⌊x / 10p⌋, digit = ⌊x / p⌋ mod 10, low = x mod p.", "Ones at p: high · p, plus p if digit > 1, plus low + 1 if digit = 1.", "Binary search x in [0, 10n + 10] with BigInt; return the largest x with ones(x) ≤ n as a string."],
      cases: [
        example(["5"], "12", "CSES sample"),
        example(["1"], "9", "one press of each key"),
        run(writingNumbers, ["20"], "n = 20"),
        run(writingNumbers, ["1000"], "n = 1000"),
        hidden("n = 10¹⁸", () => ["1000000000000000000"]),
      ],
    },
    {
      id: "letter-pair-move-game", title: "Letter Pair Move Game", cses: { id: 2427, name: "Letter Pair Move Game" },
      goal: "Positions after each turn (at most 1000) that bring every A before every B, where a turn slides two adjacent letters, in order, into the two empty boxes; or −1 if impossible. Any valid sequence is accepted.",
      concept: "Small boards (n ≤ 3) have few positions, so breadth-first search decides them and proves the impossible ones. Exhaustive search finds every start solvable from n = 4 on (checked up to n = 7), and a greedy finds one: always make the unvisited move that most lowers the count of B's among the first n − 1 letters, then the B-before-A inversions. If it ever stalls, it retries with random tie-breaks.",
      functionName: "letterPairMoveGame", signature: "letterPairMoveGame(n, start) → positions or −1",
      starterSource: starter("letterPairMoveGame", "n, start", "n ≤ 3: BFS over positions. Otherwise: greedy on (misplaced B's, inversions) without revisiting, retrying with random tie-breaks."),
      solve: letterPairMoveGame, comparator: "deep", accept: letterPairMoveGameAccept, check: viaBrute(letterPairMoveGameAccept, letterPairMoveGameBrute), small: (round) => { const n = 2 + (round % 4); return [n, letterPairStart(27000 + round, n)]; },
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample 1": { a: "AB..BA", b: 3 }, "CSES sample 2": { a: "ABAB..", b: 3 }, "four pairs": { a: "BBBA..AA", b: 4 } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetA" }] },
      diagnoses: [
        variant("swaps-the-pair", "A turn keeps the two letters in their order; they may not swap on the way.", letterPairMoveGame, [["const next = cells.slice();\n          shift(next, i, g);", "const next = cells.slice();\n          next[g] = cells[i + 1]; next[g + 1] = cells[i]; next[i] = 0; next[i + 1] = 0;"]]),
        variant("final-position-only", "List the position after every turn, not just the last one.", letterPairMoveGame, [["return path.reverse();", "return path.slice(0, 1);"], ["if (score(cells) === 0) return path;", "if (score(cells) === 0) return path.slice(-1);"]]),
      ],
      hints: ["The empty pair is where two adjacent boxes are '.'; a move takes any two adjacent letters there and leaves '..' behind.", "For n ≤ 3 run BFS from the start and rebuild the path, or return −1.", "Otherwise pick the unvisited move with the smallest (B's in the first n − 1 letters, inversions) until sorted."],
      cases: [
        example([3, "AB..BA"], ["ABBA..", "A..ABB"], "CSES sample 1"),
        example([3, "ABAB.."], -1, "CSES sample 2"),
        example([1, ".."], [], "no letters at all"),
        example([2, "BA.."], -1, "one pair can only slide back and forth"),
        run(letterPairMoveGame, [4, "BBBA..AA"], "four pairs"),
        run(letterPairMoveGame, [6, letterPairStart(27100, 6)], "six pairs"),
        hidden("n = 100, time limit", () => [100, LETTER_BIG()]),
      ],
    },
    {
      id: "maximum-building-i", title: "Maximum Building I", cses: { id: 1147, name: "Maximum Building I" },
      goal: "The largest rectangle of empty squares ('.') in a grid with trees ('*').",
      concept: "Take each row as the ground of a histogram, where a column's height is the number of empty squares stacked up to that row. The largest building standing on that row is the largest rectangle under the histogram, which is exactly Advertisement, O(m) per row. Heights update in O(1): +1 for an empty square, 0 at a tree.",
      functionName: "maximumBuildingI", signature: "maximumBuildingI(grid) → area",
      starterSource: starter("maximumBuildingI", "grid", "Column heights of empty squares ending at each row; advertisement(heights) per row; keep the best."),
      solve: maximumBuildingI, comparator: "scalar", dependencies: ["advertisement"], brute: maximumBuildingIBrute, small: (round) => [forest(28000 + round, 1 + (round % 5), 1 + ((round * 3) % 6), 0.3)],
      reference: book("8.3", "Amortized analysis · largest rectangle"),
      presets: { "CSES sample": { a: ["...*.*.", ".*.....", ".......", "......*"] }, "no trees": { a: ["...", "..."] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("one-row-only", "A building can span several rows: stack the heights instead of restarting every row.", maximumBuildingI, [["heights[j] = row[j] === \".\" ? heights[j] + 1 : 0;", "heights[j] = row[j] === \".\" ? 1 : 0;"]]),
        variant("trees-do-not-cut", "A tree breaks the column: the height starts again at 0 below it.", maximumBuildingI, [["heights[j] = row[j] === \".\" ? heights[j] + 1 : 0;", "heights[j] = row[j] === \".\" ? heights[j] + 1 : heights[j];"]]),
      ],
      hints: ["heights[j] = empty squares directly above and including row r in column j.", "Update: '.' adds 1, '*' resets to 0.", "Run advertisement(heights) for every row and keep the maximum."],
      cases: [
        example([["...*.*.", ".*.....", ".......", "......*"]], 12, "CSES sample"),
        example([["*"]], 0, "all forest"),
        example([["...", "..."]], 6, "no trees"),
        example([[".*.", "...", ".*."]], 3, "trees in the middle column"),
        run(maximumBuildingI, [forest(28100, 8, 10, 0.2)], "an 8 × 10 forest"),
        hidden("1000 × 1000, time limit", () => [FOREST_BIG()]),
      ],
    },
    {
      id: "sorting-methods", title: "Sorting Methods", cses: { id: 1162, name: "Sorting Methods" },
      goal: "For a permutation, the fewest steps to sort it by [adjacent swaps, any swaps, moving any element anywhere, moving any element to the front].",
      concept: "Adjacent swaps remove one inversion each: count inversions with a Fenwick tree. Any swap can fix a cycle of length c in c − 1 steps: n − cycles. Moving elements anywhere keeps the untouched ones in place, so they must already increase: n − longest increasing subsequence. Moving to the front leaves the untouched ones at the back, so they must be the largest values n, n − 1, … already in increasing order: count how many are.",
      functionName: "sortingMethods", signature: "sortingMethods(values) → [adjacent, any swap, any move, front move]",
      starterSource: starter("sortingMethods", "values", "Inversions (Fenwick), n − cycles, n − LIS (lowerBound), n − (largest values already in order)."),
      solve: sortingMethods, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix", "lower-bound"], brute: sortingMethodsBrute, small: (round) => [randomPermutation(29000 + round, 1 + (round % 6))],
      reference: book("9.2", "Fenwick tree · counting inversions"),
      presets: { "CSES sample": { a: [7, 8, 2, 6, 5, 1, 3, 4] }, "sorted": { a: [1, 2, 3] }, "one rotation": { a: [3, 1, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("front-keeps-any-increasing-run", "Moving only to the front, the kept elements end at the back, so they must be the largest values, not any increasing run.", sortingMethods, [["return [inversions, n - cycles, n - tails.length, n - kept];", "return [inversions, n - cycles, n - tails.length, n - tails.length];"]]),
        variant("one-swap-per-misplaced", "A swap can fix two elements at once: a cycle of c misplaced values needs only c − 1 swaps.", sortingMethods, [["return [inversions, n - cycles, n - tails.length, n - kept];", "return [inversions, values.filter((v, i) => v !== i + 1).length, n - tails.length, n - kept];"]]),
      ],
      hints: ["Inversions: scan from the right, count smaller values already seen.", "Cycles: follow i → values[i] until back; any swaps = n − cycles; any moves = n − LIS.", "Front moves: kept = 1, grow while position[n − kept] < position[n − kept + 1]; answer n − kept."],
      cases: [
        example([[7, 8, 2, 6, 5, 1, 3, 4]], [20, 6, 5, 6], "CSES sample"),
        example([[1, 2, 3]], [0, 0, 0, 0], "already sorted"),
        example([[2, 1]], [1, 1, 1, 1], "one swap"),
        example([[3, 1, 2]], [2, 2, 1, 2], "one rotation"),
        run(sortingMethods, [randomPermutation(29100, 12)], "twelve values"),
        hidden("n = 2·10⁵, time limit", () => [SORTING_BIG()]),
      ],
    },
    {
      id: "cyclic-array", title: "Cyclic Array", cses: { id: 1191, name: "Cyclic Array" },
      goal: "The fewest contiguous pieces of the cyclic array, each with sum at most k (k can reach 10¹⁸; every value is at most k).",
      concept: "Unroll the cycle by doubling the array. From each start the greedy piece extends as far as the sum allows, and two pointers find that end for every start at once. Those ends form jump pointers; binary lifting counts, for every start, how many greedy pieces cover the next n values. The answer is the minimum over all starts.",
      functionName: "cyclicArray", signature: "cyclicArray(values, k) → pieces",
      starterSource: starter("cyclicArray", "values, k", "Doubled array; next[i] = end of the greedy piece from i (two pointers); binary lifting counts pieces from each start; take the minimum."),
      solve: cyclicArray, comparator: "scalar", brute: cyclicArrayBrute, small: (round) => [smallList(30000 + round, 1 + (round % 9), 1, 5), 5 + (round % 6)],
      reference: book("16.3", "Successor paths · binary lifting"),
      presets: { "CSES sample": { a: [2, 2, 2, 1, 3, 1, 2, 1], b: 5 }, "everything fits": { a: [1, 1, 1], b: 10 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("linear-array", "The array is cyclic: a piece may wrap from the end to the start, so the cut can go anywhere.", function cyclicArray(values, k) { let count = 1, sum = 0; for (const v of values) { if (sum + v > k) { count += 1; sum = 0; } sum += v; } return count; }),
        variant("forgets-the-last-piece", "The jumps count the pieces that end before the start comes round again; the last piece counts too.", cyclicArray, [["best = Math.min(best, count + 1);", "best = Math.min(best, count);"]]),
      ],
      hints: ["Doubled index i in 0 … 2n − 1 reads values[i mod n].", "next[i] = first index the greedy piece from i cannot include (and at most i + n).", "Lift next; from each start take the largest jumps that stay below start + n, count them, add 1 for the final piece."],
      cases: [
        example([[2, 2, 2, 1, 3, 1, 2, 1], 5], 3, "CSES sample"),
        example([[1, 1, 1], 10], 1, "everything fits"),
        example([[3, 3, 3], 3], 3, "one value per piece"),
        run(cyclicArray, [smallList(30100, 15, 1, 9), 12], "fifteen values"),
        hidden("n = 2·10⁵, k = 5·10⁹, time limit", () => [CYCLIC_BIG(), 5000000000]),
        hidden("n = 2·10⁵, k = 10¹⁸", () => [CYCLIC_BIG(), 1000000000000000000]),
      ],
    },
    {
      id: "list-of-sums", title: "List of Sums", cses: { id: 2414, name: "List of Sums" },
      goal: "A list A of n positive integers whose pairwise sums are exactly the given list B; any valid A is accepted.",
      concept: "Sort A ascending. The two smallest sums are a1 + a2 and a1 + a3, and a2 + a3 is among the first n sums, so guess which one it is: each guess fixes a1 = (s1 + s2 − guess) / 2. Then peel: the smallest sum not yet explained must be a1 plus the next element, so take it and remove its sums with every element found so far from a multiset. A guess fails as soon as a needed sum is missing.",
      functionName: "listOfSums", signature: "listOfSums(n, sums) → list",
      starterSource: starter("listOfSums", "n, sums", "Sort B; for each guess j of a2 + a3: a1 = (B0 + B1 − Bj) / 2; peel the smallest unexplained sum with a multiset."),
      solve: listOfSums, comparator: "deep", accept: listOfSumsAccept, check: (args, out) => listOfSumsAccept(args, out) === true, small: (round) => { const list = smallList(31000 + round, 3 + (round % 6), 1, 9); return [list.length, pairSums(list)]; },
      reference: book("5", "Complete search · constructive solutions"),
      presets: { "CSES sample": { a: [4, 4, 4, 6, 6, 6], b: 4 }, "a2 + a3 is not third": { a: [6, 7, 8, 11, 12, 13], b: 4 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetA" }] },
      diagnoses: [
        variant("skips-the-check", "Every sum a new element makes with the earlier ones must be in B; without that check a wrong guess for a2 + a3 slips through.", listOfSums, [["if (!c) { ok = false; break; }", "if (!c) continue;"]]),
        variant("forgets-to-remove-sums", "B is a multiset: remove each explained sum once, or the same smallest sum keeps coming back.", listOfSums, [["count.set(s, c - 1);", "count.set(s, c);"]]),
      ],
      hints: ["Sort B; a1 + a2 = B0 and a1 + a3 = B1.", "Guess a2 + a3 = Bj for j = 2 … n; a1 = (B0 + B1 − Bj) / 2 must be a positive integer.", "Repeatedly: next = smallest remaining sum − a1; remove next + x for every found x; fail if one is missing."],
      cases: [
        example([4, [4, 4, 4, 6, 6, 6]], [2, 2, 2, 4], "CSES sample"),
        example([3, [3, 4, 5]], [1, 2, 3], "three values"),
        run(listOfSums, [4, pairSums([1, 5, 6, 7])], "a2 + a3 is not the third smallest"),
        run(listOfSums, [5, pairSums([1, 5, 6, 8, 20])], "the first guess for a2 + a3 is wrong"),
        run(listOfSums, [7, pairSums([12, 3, 7, 7, 20, 1, 9])], "seven values"),
        hidden("n = 100, values up to 10⁹, time limit", () => [100, SUMS_BIG()]),
      ],
    },
  ];
  core.share({ dominanceMax });
  core.define("additional-i", ADDITIONAL_I);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

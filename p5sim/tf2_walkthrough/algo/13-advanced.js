(function defineAlgoSection(core) {
  "use strict";
  const { lazy, rng, randomInts, randomPermutation, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { courseSchedule, planetsAndKingdoms, dsuUnion, modPow, liChaoInsert, liChaoQuery } = core.shared;

  // ------------------------------------------------------------------ 13 · advanced techniques · references
  function subsetSums(values) {
    let sums = [0];
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i];
      const merged = new Array(sums.length * 2);
      let p = 0, q = 0, out = 0;
      while (p < sums.length || q < sums.length) {
        if (q >= sums.length || (p < sums.length && sums[p] <= sums[q] + v)) { merged[out] = sums[p]; p += 1; }
        else { merged[out] = sums[q] + v; q += 1; }
        out += 1;
      }
      sums = merged;
    }
    return sums;
  }
  function meetInTheMiddle(values, x) {
    const half = values.length >> 1;
    const left = subsetSums(values.slice(0, half));
    const right = subsetSums(values.slice(half));
    let count = 0, j = right.length - 1;
    for (let i = 0; i < left.length;) {
      let same = 1;
      while (i + same < left.length && left[i + same] === left[i]) same += 1;
      const need = x - left[i];
      while (j >= 0 && right[j] > need) j -= 1;
      let match = 0;
      while (j - match >= 0 && right[j - match] === need) match += 1;
      count += same * match;
      i += same;
    }
    return count;
  }
  function popcount(x) {
    let v = x - ((x >>> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    v = (v + (v >>> 4)) & 0x0f0f0f0f;
    return Math.imul(v, 0x01010101) >>> 24;
  }
  function hammingDistance(strings) {
    const n = strings.length;
    const words = new Int32Array(n);
    for (let i = 0; i < n; i += 1) words[i] = parseInt(strings[i], 2) | 0;
    let best = 32;
    for (let i = 0; i < n && best > 0; i += 1) {
      const word = words[i];
      for (let j = i + 1; j < n; j += 1) {
        const d = popcount(word ^ words[j]);
        if (d < best) best = d;
      }
    }
    return best;
  }
  function cornerSubgridCheck(grid, k) {
    const n = grid.length;
    // Bucket every row's columns by letter once, so each letter's pass reads only its own cells.
    const start = new Int32Array(n * 27);
    const columns = new Int16Array(n * n);
    for (let r = 0; r < n; r += 1) {
      const row = grid[r];
      const counts = new Int32Array(27);
      for (let c = 0; c < n; c += 1) counts[row.charCodeAt(c) - 64] += 1;
      let at = r * n;
      for (let letter = 0; letter < 27; letter += 1) { start[r * 27 + letter] = at; at += counts[letter]; }
      const fill = start.slice(r * 27, r * 27 + 27);
      for (let c = 0; c < n; c += 1) { const letter = row.charCodeAt(c) - 64; columns[fill[letter]] = c; fill[letter] += 1; }
    }
    const seen = new Uint8Array(n * n);
    const answers = [];
    for (let letter = 1; letter <= k; letter += 1) {
      let found = false;
      for (let r = 0; r < n && !found; r += 1) {
        const from = start[r * 27 + letter];
        const to = letter < 26 ? start[r * 27 + letter + 1] : (r + 1) * n;
        for (let p = from; p < to && !found; p += 1) {
          const base = columns[p] * n;
          for (let q = p + 1; q < to; q += 1) {
            const cell = base + columns[q];
            if (seen[cell] === letter) { found = true; break; }
            seen[cell] = letter;
          }
        }
      }
      answers.push(found);
    }
    return answers;
  }
  function cornerSubgridCount(grid) {
    const n = grid.length, words = (n + 31) >> 5;
    const bits = new Int32Array(n * words);
    for (let r = 0; r < n; r += 1) {
      const row = grid[r];
      for (let c = 0; c < n; c += 1) if (row.charCodeAt(c) === 49) bits[r * words + (c >> 5)] |= 1 << (c & 31);
    }
    let total = 0;
    for (let a = 0; a < n; a += 1) {
      for (let b = a + 1; b < n; b += 1) {
        let common = 0;
        for (let w = 0; w < words; w += 1) common += popcount(bits[a * words + w] & bits[b * words + w]);
        total += common * (common - 1) / 2;
      }
    }
    return total;
  }
  function reachableNodes(n, edges) {
    const order = courseSchedule(n, edges);
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]);
    const WORDS = 64, SPAN = WORDS * 32;
    const bits = new Int32Array((n + 1) * WORDS);
    const counts = new Array(n).fill(0);
    for (let base = 1; base <= n; base += SPAN) {
      bits.fill(0);
      for (let i = n - 1; i >= 0; i -= 1) {
        const v = order[i], at = v * WORDS;
        const offset = v - base;
        if (offset >= 0 && offset < SPAN) bits[at + (offset >> 5)] |= 1 << (offset & 31);
        const list = adjacency[v];
        for (let e = 0; e < list.length; e += 1) {
          const from = list[e] * WORDS;
          for (let w = 0; w < WORDS; w += 1) bits[at + w] |= bits[from + w];
        }
        let reached = 0;
        for (let w = 0; w < WORDS; w += 1) reached += popcount(bits[at + w]);
        counts[v - 1] += reached;
      }
    }
    return counts;
  }
  function reachabilityQueries(n, edges, queries) {
    const label = planetsAndKingdoms(n, edges);
    let c = 0;
    for (let i = 0; i < n; i += 1) if (label[i] > c) c = label[i];
    const adjacency = [];
    for (let x = 0; x <= c; x += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) {
      const x = label[edges[i][0] - 1], y = label[edges[i][1] - 1];
      if (x !== y) adjacency[x].push(y);
    }
    const WORDS = 64, SPAN = WORDS * 32;
    const bits = new Int32Array((c + 1) * WORDS);
    const answers = new Array(queries.length).fill(false);
    const byBlock = [];
    for (let i = 0; i < queries.length; i += 1) {
      const block = Math.floor((label[queries[i][1] - 1] - 1) / SPAN);
      while (byBlock.length <= block) byBlock.push([]);
      byBlock[block].push(i);
    }
    for (let block = 0; block < byBlock.length; block += 1) {
      if (!byBlock[block].length) continue;
      const base = 1 + block * SPAN;
      bits.fill(0);
      // Kingdoms are numbered in topological order, so every edge leads to a larger label.
      for (let x = c; x >= 1; x -= 1) {
        const at = x * WORDS, offset = x - base;
        if (offset >= 0 && offset < SPAN) bits[at + (offset >> 5)] |= 1 << (offset & 31);
        const list = adjacency[x];
        for (let e = 0; e < list.length; e += 1) {
          const from = list[e] * WORDS;
          for (let w = 0; w < WORDS; w += 1) bits[at + w] |= bits[from + w];
        }
      }
      byBlock[block].forEach((i) => {
        const offset = label[queries[i][1] - 1] - base;
        answers[i] = (bits[label[queries[i][0] - 1] * WORDS + (offset >> 5)] & (1 << (offset & 31))) !== 0;
      });
    }
    return answers;
  }
  function treapMerge(a, b) {
    const size = (t) => (t ? t.size : 0);
    const sum = (t) => (t ? t.sum : 0);
    const push = (t) => {
      if (!t.flip) return;
      const swap = t.left; t.left = t.right; t.right = swap;
      if (t.left) t.left.flip = !t.left.flip;
      if (t.right) t.right.flip = !t.right.flip;
      t.flip = false;
    };
    const pull = (t) => { t.size = 1 + size(t.left) + size(t.right); t.sum = t.value + sum(t.left) + sum(t.right); };
    const merge = (x, y) => {
      if (!x) return y;
      if (!y) return x;
      if (x.priority > y.priority) { push(x); x.right = merge(x.right, y); pull(x); return x; }
      push(y); y.left = merge(x, y.left); pull(y); return y;
    };
    return merge(a, b);
  }
  function treapSplit(root, k) {
    const size = (t) => (t ? t.size : 0);
    const sum = (t) => (t ? t.sum : 0);
    const push = (t) => {
      if (!t.flip) return;
      const swap = t.left; t.left = t.right; t.right = swap;
      if (t.left) t.left.flip = !t.left.flip;
      if (t.right) t.right.flip = !t.right.flip;
      t.flip = false;
    };
    const pull = (t) => { t.size = 1 + size(t.left) + size(t.right); t.sum = t.value + sum(t.left) + sum(t.right); };
    const split = (t, count) => {
      if (!t) return [null, null];
      push(t);
      if (size(t.left) >= count) { const parts = split(t.left, count); t.left = parts[1]; pull(t); return [parts[0], t]; }
      const parts = split(t.right, count - size(t.left) - 1);
      t.right = parts[0]; pull(t);
      return [t, parts[1]];
    };
    return split(root, k);
  }
  function cutAndPaste(s, ops) {
    let root = null;
    for (let i = 0; i < s.length; i += 1) {
      const code = s.charCodeAt(i);
      root = treapMerge(root, { value: code, priority: Math.random(), size: 1, sum: code, flip: false, left: null, right: null });
    }
    for (let i = 0; i < ops.length; i += 1) {
      const a = ops[i][0], b = ops[i][1];
      const outer = treapSplit(root, a - 1);
      const inner = treapSplit(outer[1], b - a + 1);
      root = treapMerge(treapMerge(outer[0], inner[1]), inner[0]);
    }
    const codes = [];
    const stack = [];
    let t = root;
    while (t || stack.length) {
      while (t) { stack.push(t); t = t.left; }
      t = stack.pop();
      codes.push(t.value);
      t = t.right;
    }
    let out = "";
    for (let i = 0; i < codes.length; i += 8192) out += String.fromCharCode.apply(null, codes.slice(i, i + 8192));
    return out;
  }
  function substringReversals(s, ops) {
    let root = null;
    for (let i = 0; i < s.length; i += 1) {
      const code = s.charCodeAt(i);
      root = treapMerge(root, { value: code, priority: Math.random(), size: 1, sum: code, flip: false, left: null, right: null });
    }
    for (let i = 0; i < ops.length; i += 1) {
      const a = ops[i][0], b = ops[i][1];
      const outer = treapSplit(root, a - 1);
      const inner = treapSplit(outer[1], b - a + 1);
      inner[0].flip = !inner[0].flip;
      root = treapMerge(treapMerge(outer[0], inner[0]), inner[1]);
    }
    const codes = [];
    // Walk in order while honouring pending flips: a flipped subtree is read right to left.
    const frames = [[root, false, 0]];
    while (frames.length) {
      const frame = frames.pop();
      const node = frame[0];
      if (!node) continue;
      const reversed = frame[1] !== node.flip;
      if (frame[2] === 1) { codes.push(node.value); continue; }
      const first = reversed ? node.right : node.left, second = reversed ? node.left : node.right;
      frames.push([second, reversed, 0], [node, frame[1], 1], [first, reversed, 0]);
    }
    let out = "";
    for (let i = 0; i < codes.length; i += 8192) out += String.fromCharCode.apply(null, codes.slice(i, i + 8192));
    return out;
  }
  function reversalsAndSums(values, ops) {
    let root = null;
    for (let i = 0; i < values.length; i += 1) root = treapMerge(root, { value: values[i], priority: Math.random(), size: 1, sum: values[i], flip: false, left: null, right: null });
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      const type = ops[i][0], a = ops[i][1], b = ops[i][2];
      const outer = treapSplit(root, a - 1);
      const inner = treapSplit(outer[1], b - a + 1);
      if (type === 1) inner[0].flip = !inner[0].flip;
      else answers.push(inner[0].sum);
      root = treapMerge(treapMerge(outer[0], inner[0]), inner[1]);
    }
    return answers;
  }
  function lowLink(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1], i); adjacency[edges[i][1]].push(edges[i][0], i); }
    const tin = new Array(n + 1).fill(-1), low = new Array(n + 1).fill(-1), parentEdge = new Array(n + 1).fill(-1);
    const pointer = new Array(n + 1).fill(0);
    let timer = 0;
    for (let root = 1; root <= n; root += 1) {
      if (tin[root] >= 0) continue;
      tin[root] = low[root] = timer; timer += 1;
      const stack = [root];
      while (stack.length) {
        const v = stack[stack.length - 1];
        const list = adjacency[v];
        if (pointer[v] < list.length) {
          const u = list[pointer[v]], e = list[pointer[v] + 1];
          pointer[v] += 2;
          if (e === parentEdge[v]) continue;
          if (tin[u] < 0) { tin[u] = low[u] = timer; timer += 1; parentEdge[u] = e; stack.push(u); }
          else if (tin[u] < low[v]) low[v] = tin[u];
        } else {
          stack.pop();
          if (stack.length) { const p = stack[stack.length - 1]; if (low[v] < low[p]) low[p] = low[v]; }
        }
      }
    }
    return { tin: tin.slice(1), low: low.slice(1), parentEdge: parentEdge.slice(1) };
  }
  function necessaryRoads(n, edges) {
    const link = lowLink(n, edges);
    const roads = [];
    for (let v = 1; v <= n; v += 1) {
      const e = link.parentEdge[v - 1];
      if (e >= 0 && link.low[v - 1] === link.tin[v - 1]) roads.push([edges[e][0], edges[e][1]]);
    }
    return roads;
  }
  function necessaryCities(n, edges) {
    const link = lowLink(n, edges);
    const children = new Array(n + 1).fill(0);
    const cut = new Array(n + 1).fill(false);
    for (let v = 1; v <= n; v += 1) {
      const e = link.parentEdge[v - 1];
      if (e < 0) continue;
      const p = edges[e][0] === v ? edges[e][1] : edges[e][0];
      children[p] += 1;
      if (link.parentEdge[p - 1] >= 0 && link.low[v - 1] >= link.tin[p - 1]) cut[p] = true;
    }
    const cities = [];
    for (let v = 1; v <= n; v += 1) if (cut[v] || (link.parentEdge[v - 1] < 0 && children[v] >= 2)) cities.push(v);
    return cities;
  }
  function eulerianSubgraphs(n, edges) {
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    let components = n;
    for (let i = 0; i < edges.length; i += 1) if (dsuUnion(parent, size, edges[i][0], edges[i][1]) > 0) components -= 1;
    return modPow(2, edges.length - n + components, 1000000007);
  }
  function monsterGameI(x, strengths, factors) {
    const n = strengths.length;
    const slopes = [x], intercepts = [0];
    let head = 0, best = 0;
    const at = (j, s) => slopes[j] * s + intercepts[j];
    // Line b is useless once line c overtakes line a no later than b does; BigInt keeps the products exact.
    const useless = (a, b, c) => BigInt(intercepts[c] - intercepts[a]) * BigInt(slopes[a] - slopes[b]) <= BigInt(intercepts[b] - intercepts[a]) * BigInt(slopes[a] - slopes[c]);
    for (let i = 0; i < n; i += 1) {
      const s = strengths[i];
      while (slopes.length - head >= 2 && at(head + 1, s) <= at(head, s)) head += 1;
      best = at(head, s);
      if (i === n - 1) break;
      const f = factors[i];
      const last = slopes.length - 1;
      if (slopes[last] === f) {
        if (intercepts[last] <= best) continue;
        slopes.pop(); intercepts.pop();
        if (head > slopes.length - 1) head = slopes.length;
      }
      slopes.push(f); intercepts.push(best);
      while (slopes.length - head >= 3 && useless(slopes.length - 3, slopes.length - 2, slopes.length - 1)) {
        slopes.splice(slopes.length - 2, 1); intercepts.splice(intercepts.length - 2, 1);
      }
    }
    return best;
  }
  function monsterGameII(x, strengths, factors) {
    const size = 1 << 20;
    const tree = new Array(2 * size).fill(null);
    liChaoInsert(tree, 1, 0, size - 1, -x, 0);
    let best = 0;
    for (let i = 0; i < strengths.length; i += 1) {
      best = -liChaoQuery(tree, size, strengths[i]);
      if (i < strengths.length - 1) liChaoInsert(tree, 1, 0, size - 1, -factors[i], -best);
    }
    return best;
  }
  function subarraySquares(values, k) {
    const n = values.length;
    let total = 0;
    for (let i = 0; i < n; i += 1) total += values[i];
    // Every cost is at most total²; below 2⁵³ doubles are exact, above it the same code runs on BigInt.
    const lift = total * total > 9007199254740991 ? BigInt : Number;
    const prefix = [lift(0)];
    for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + lift(values[i]));
    let previous = prefix.map((p) => p * p);
    for (let layer = 2; layer <= k; layer += 1) {
      const current = new Array(n + 1).fill(null);
      const solve = (lo, hi, optLo, optHi) => {
        if (lo > hi) return;
        const mid = (lo + hi) >> 1;
        let best = null, bestAt = optLo;
        for (let j = optLo; j <= Math.min(mid - 1, optHi); j += 1) {
          const d = prefix[mid] - prefix[j];
          const cost = previous[j] + d * d;
          if (best === null || cost < best) { best = cost; bestAt = j; }
        }
        current[mid] = best;
        solve(lo, mid - 1, optLo, bestAt);
        solve(mid + 1, hi, bestAt, optHi);
      };
      solve(layer, n, layer - 1, n - 1);
      previous = current;
    }
    return String(previous[n]);
  }
  function housesAndSchools(children, k) {
    const n = children.length;
    const count = [0], weight = [0];
    for (let i = 1; i <= n; i += 1) { count.push(count[i - 1] + children[i - 1]); weight.push(weight[i - 1] + i * children[i - 1]); }
    // One school for houses l..r sits at the weighted median, found by binary search on the prefix counts.
    const cost = (l, r) => {
      const base = count[l - 1], all = count[r] - base;
      let lo = l, hi = r;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (2 * (count[mid] - base) >= all) hi = mid; else lo = mid + 1; }
      const m = lo;
      return m * (count[m] - base) - (weight[m] - weight[l - 1]) + (weight[r] - weight[m]) - m * (count[r] - count[m]);
    };
    let previous = new Array(n + 1).fill(Infinity);
    for (let i = 1; i <= n; i += 1) previous[i] = cost(1, i);
    for (let layer = 2; layer <= k; layer += 1) {
      const current = new Array(n + 1).fill(Infinity);
      const solve = (lo, hi, optLo, optHi) => {
        if (lo > hi) return;
        const mid = (lo + hi) >> 1;
        let best = Infinity, bestAt = optLo;
        for (let j = optLo; j <= Math.min(mid - 1, optHi); j += 1) {
          const value = previous[j] + cost(j + 1, mid);
          if (value < best) { best = value; bestAt = j; }
        }
        current[mid] = best;
        solve(lo, mid - 1, optLo, bestAt);
        solve(mid + 1, hi, bestAt, optHi);
      };
      solve(layer, n, layer - 1, n - 1);
      previous = current;
    }
    return previous[n];
  }
  function knuthDivision(values) {
    const n = values.length;
    const prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i += 1) prefix[i + 1] = prefix[i] + values[i];
    const dp = new Float64Array(n * n), opt = new Int32Array(n * n);
    for (let i = 0; i < n; i += 1) opt[i * n + i] = i;
    for (let length = 2; length <= n; length += 1) {
      for (let i = 0; i + length - 1 < n; i += 1) {
        const j = i + length - 1;
        // Knuth: the best split for i..j lies between the best splits for i..j-1 and i+1..j.
        const from = opt[i * n + j - 1], to = Math.min(opt[(i + 1) * n + j], j - 1);
        let best = Infinity, bestAt = from;
        for (let m = from; m <= to; m += 1) {
          const value = dp[i * n + m] + dp[(m + 1) * n + j];
          if (value < best) { best = value; bestAt = m; }
        }
        dp[i * n + j] = best + prefix[j + 1] - prefix[i];
        opt[i * n + j] = bestAt;
      }
    }
    return dp[n - 1];
  }
  function fft(re, im, invert) {
    const n = re.length;
    const a = Float64Array.from(re), b = Float64Array.from(im);
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = a[i]; a[i] = a[j]; a[j] = t; t = b[i]; b[i] = b[j]; b[j] = t; }
    }
    for (let length = 2; length <= n; length <<= 1) {
      const half = length >> 1;
      const angle = (invert ? 2 : -2) * Math.PI / length;
      const cos = new Float64Array(half), sin = new Float64Array(half);
      for (let k = 0; k < half; k += 1) { cos[k] = Math.cos(angle * k); sin[k] = Math.sin(angle * k); }
      for (let start = 0; start < n; start += length) {
        for (let k = 0; k < half; k += 1) {
          const p = start + k, q = p + half;
          const xr = a[q] * cos[k] - b[q] * sin[k], xi = a[q] * sin[k] + b[q] * cos[k];
          a[q] = a[p] - xr; b[q] = b[p] - xi;
          a[p] += xr; b[p] += xi;
        }
      }
    }
    if (invert) for (let i = 0; i < n; i += 1) { a[i] /= n; b[i] /= n; }
    return { re: Array.from(a), im: Array.from(b) };
  }
  function convolve(a, b) {
    const length = a.length + b.length - 1;
    let size = 1;
    while (size < length) size *= 2;
    const pad = (list) => { const out = new Array(size).fill(0); for (let i = 0; i < list.length; i += 1) out[i] = list[i]; return out; };
    const zero = new Array(size).fill(0);
    const fa = fft(pad(a), zero, false), fb = fft(pad(b), zero, false);
    const re = new Array(size), im = new Array(size);
    for (let i = 0; i < size; i += 1) {
      re[i] = fa.re[i] * fb.re[i] - fa.im[i] * fb.im[i];
      im[i] = fa.re[i] * fb.im[i] + fa.im[i] * fb.re[i];
    }
    const back = fft(re, im, true);
    const out = new Array(length);
    for (let i = 0; i < length; i += 1) { const v = Math.round(back.re[i]); out[i] = v === 0 ? 0 : v; }
    return out;
  }
  function applesAndBananas(k, apples, bananas) {
    const a = new Array(k).fill(0), b = new Array(k).fill(0);
    for (let i = 0; i < apples.length; i += 1) a[apples[i] - 1] += 1;
    for (let i = 0; i < bananas.length; i += 1) b[bananas[i] - 1] += 1;
    return convolve(a, b);
  }
  function oneBitPositions(s) {
    const n = s.length;
    const bits = new Array(n), reversed = new Array(n);
    for (let i = 0; i < n; i += 1) { bits[i] = s.charCodeAt(i) === 49 ? 1 : 0; reversed[n - 1 - i] = bits[i]; }
    return convolve(bits, reversed).slice(n, 2 * n - 1);
  }
  function signalProcessing(signal, mask) {
    return convolve(signal, mask.slice().reverse());
  }
  function newRoadsQueries(n, roads, queries) {
    const parent = new Int32Array(n + 1), size = new Int32Array(n + 1), time = new Int32Array(n + 1);
    for (let v = 0; v <= n; v += 1) { parent[v] = v; size[v] = 1; }
    const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
    for (let i = 0; i < roads.length; i += 1) {
      let ra = find(roads[i][0]), rb = find(roads[i][1]);
      if (ra === rb) continue;
      if (size[ra] < size[rb]) { const swap = ra; ra = rb; rb = swap; }
      parent[rb] = ra; size[ra] += size[rb]; time[rb] = i + 1;
    }
    const depth = (x) => { let d = 0; while (parent[x] !== x) { x = parent[x]; d += 1; } return d; };
    return queries.map((query) => {
      let a = query[0], b = query[1];
      if (a === b) return 0;
      if (find(a) !== find(b)) return -1;
      // Link times grow towards the root, so the answer is the largest link on the path between a and b.
      let da = depth(a), db = depth(b), latest = 0;
      while (da > db) { latest = Math.max(latest, time[a]); a = parent[a]; da -= 1; }
      while (db > da) { latest = Math.max(latest, time[b]); b = parent[b]; db -= 1; }
      while (a !== b) { latest = Math.max(latest, time[a], time[b]); a = parent[a]; b = parent[b]; }
      return latest;
    });
  }
  function rollbackUnion(dsu, a, b) {
    let ra = a, rb = b;
    while (dsu.parent[ra] !== ra) ra = dsu.parent[ra];
    while (dsu.parent[rb] !== rb) rb = dsu.parent[rb];
    if (ra === rb) { dsu.history.push(-1); return dsu; }
    if (dsu.size[ra] < dsu.size[rb]) { const swap = ra; ra = rb; rb = swap; }
    dsu.parent[rb] = ra;
    dsu.size[ra] += dsu.size[rb];
    dsu.components -= 1;
    dsu.history.push(rb);
    return dsu;
  }
  function dynamicConnectivity(n, edges, events) {
    const k = events.length;
    const key = (a, b) => (a < b ? a * (n + 1) + b : b * (n + 1) + a);
    const since = new Map();
    const intervals = [];
    for (let i = 0; i < edges.length; i += 1) since.set(key(edges[i][0], edges[i][1]), [edges[i][0], edges[i][1], 0]);
    for (let t = 1; t <= k; t += 1) {
      const type = events[t - 1][0], a = events[t - 1][1], b = events[t - 1][2];
      if (type === 1) since.set(key(a, b), [a, b, t]);
      else { const open = since.get(key(a, b)); since.delete(key(a, b)); if (open[2] <= t - 1) intervals.push([open[0], open[1], open[2], t - 1]); }
    }
    since.forEach((open) => intervals.push([open[0], open[1], open[2], k]));
    // Each edge lives on O(log k) segment-tree nodes over the timeline 0..k.
    const nodes = [];
    for (let i = 0; i < 4 * (k + 1); i += 1) nodes.push([]);
    const place = (node, lo, hi, from, to, edge) => {
      if (to < lo || hi < from) return;
      if (from <= lo && hi <= to) { nodes[node].push(edge); return; }
      const mid = (lo + hi) >> 1;
      place(2 * node, lo, mid, from, to, edge);
      place(2 * node + 1, mid + 1, hi, from, to, edge);
    };
    intervals.forEach((edge) => place(1, 0, k, edge[2], edge[3], edge));
    const dsu = { parent: [], size: [], history: [], components: n };
    for (let v = 0; v <= n; v += 1) { dsu.parent.push(v); dsu.size.push(1); }
    const answers = new Array(k + 1).fill(0);
    const undo = () => {
      const rb = dsu.history.pop();
      if (rb < 0) return;
      const ra = dsu.parent[rb];
      dsu.size[ra] -= dsu.size[rb];
      dsu.parent[rb] = rb;
      dsu.components += 1;
    };
    const walk = (node, lo, hi) => {
      const list = nodes[node];
      for (let i = 0; i < list.length; i += 1) rollbackUnion(dsu, list[i][0], list[i][1]);
      if (lo === hi) answers[lo] = dsu.components;
      else { const mid = (lo + hi) >> 1; walk(2 * node, lo, mid); walk(2 * node + 1, mid + 1, hi); }
      for (let i = 0; i < list.length; i += 1) undo();
    };
    walk(1, 0, k);
    return answers;
  }
  function minCostFlow(n, edges, source, sink, limit) {
    const m = edges.length;
    const to = new Int32Array(2 * m), cap = new Float64Array(2 * m), cost = new Float64Array(2 * m);
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < m; i += 1) {
      const [a, b, c, w] = edges[i];
      to[2 * i] = b; cap[2 * i] = c; cost[2 * i] = w; adjacency[a].push(2 * i);
      to[2 * i + 1] = a; cap[2 * i + 1] = 0; cost[2 * i + 1] = -w; adjacency[b].push(2 * i + 1);
    }
    const potential = new Float64Array(n + 1);
    let flow = 0, total = 0;
    while (flow < limit) {
      // Dijkstra on reduced costs, which the potentials keep non-negative.
      const dist = new Float64Array(n + 1).fill(Infinity), via = new Int32Array(n + 1).fill(-1);
      dist[source] = 0;
      const heap = [[0, source]];
      while (heap.length) {
        let top = heap[0];
        const last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          let i = 0;
          while (true) {
            const l = 2 * i + 1, r = l + 1;
            let small = i;
            if (l < heap.length && heap[l][0] < heap[small][0]) small = l;
            if (r < heap.length && heap[r][0] < heap[small][0]) small = r;
            if (small === i) break;
            const swap = heap[i]; heap[i] = heap[small]; heap[small] = swap; i = small;
          }
        }
        const d = top[0], v = top[1];
        if (d > dist[v]) continue;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const e = list[k];
          if (cap[e] <= 0) continue;
          const u = to[e], next = d + cost[e] + potential[v] - potential[u];
          if (next < dist[u]) {
            dist[u] = next; via[u] = e;
            heap.push([next, u]);
            let i = heap.length - 1;
            while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; const swap = heap[p]; heap[p] = heap[i]; heap[i] = swap; i = p; }
          }
        }
      }
      if (dist[sink] === Infinity) break;
      for (let v = 1; v <= n; v += 1) if (dist[v] < Infinity) potential[v] += dist[v];
      let push = limit - flow;
      for (let v = sink; v !== source; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
      for (let v = sink; v !== source; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; total += push * cost[via[v]]; }
      flow += push;
    }
    const flows = [];
    for (let i = 0; i < m; i += 1) flows.push(cap[2 * i + 1]);
    return { flow, cost: total, flows };
  }
  function parcelDelivery(n, routes, k) {
    const result = minCostFlow(n, routes, 1, n, k);
    return result.flow < k ? -1 : result.cost;
  }
  function taskAssignment(costs) {
    const n = costs.length;
    const source = 2 * n + 1, sink = 2 * n + 2;
    const edges = [];
    for (let i = 0; i < n; i += 1) edges.push([source, i + 1, 1, 0]);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) edges.push([i + 1, n + j + 1, 1, costs[i][j]]);
    for (let j = 0; j < n; j += 1) edges.push([n + j + 1, sink, 1, 0]);
    const result = minCostFlow(2 * n + 2, edges, source, sink, n);
    const assignment = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) if (result.flows[n + i * n + j] > 0) assignment[i] = j + 1;
    return { cost: result.cost, assignment };
  }
  function distinctRoutesII(n, teleporters, k) {
    const edges = teleporters.map((t) => [t[0], t[1], 1, 1]);
    const result = minCostFlow(n, edges, 1, n, k);
    if (result.flow < k) return -1;
    const out = [];
    for (let v = 0; v <= n; v += 1) out.push([]);
    for (let i = 0; i < edges.length; i += 1) if (result.flows[i] > 0) out[edges[i][0]].push(edges[i][1]);
    const routes = [];
    for (let day = 0; day < k; day += 1) {
      const route = [1];
      let v = 1;
      while (v !== n) { v = out[v].pop(); route.push(v); }
      routes.push(route);
    }
    return { coins: result.cost, routes };
  }

  // ------------------------------------------------------------------ brute forces (small inputs only)
  function subsetSumsBrute(values) {
    const out = [];
    for (let mask = 0; mask < Math.pow(2, values.length); mask += 1) {
      let sum = 0;
      for (let i = 0; i < values.length; i += 1) if (mask & (1 << i)) sum += values[i];
      out.push(sum);
    }
    return out.sort((p, q) => p - q);
  }
  function meetInTheMiddleBrute(values, x) { return subsetSumsBrute(values).filter((sum) => sum === x).length; }
  function popcountBrute(x) { let count = 0; const bits = (x >>> 0).toString(2); for (const c of bits) if (c === "1") count += 1; return count; }
  function hammingDistanceBrute(strings) {
    let best = Infinity;
    for (let i = 0; i < strings.length; i += 1) {
      for (let j = i + 1; j < strings.length; j += 1) {
        let d = 0;
        for (let c = 0; c < strings[i].length; c += 1) if (strings[i][c] !== strings[j][c]) d += 1;
        best = Math.min(best, d);
      }
    }
    return best;
  }
  function cornerSubgridCheckBrute(grid, k) {
    const n = grid.length, answers = [];
    for (let letter = 0; letter < k; letter += 1) {
      const ch = String.fromCharCode(65 + letter);
      let found = false;
      for (let r1 = 0; r1 < n && !found; r1 += 1) for (let r2 = r1 + 1; r2 < n && !found; r2 += 1) for (let c1 = 0; c1 < n && !found; c1 += 1) for (let c2 = c1 + 1; c2 < n && !found; c2 += 1) {
        if (grid[r1][c1] === ch && grid[r1][c2] === ch && grid[r2][c1] === ch && grid[r2][c2] === ch) found = true;
      }
      answers.push(found);
    }
    return answers;
  }
  function cornerSubgridCountBrute(grid) {
    const n = grid.length;
    let count = 0;
    for (let r1 = 0; r1 < n; r1 += 1) for (let r2 = r1 + 1; r2 < n; r2 += 1) for (let c1 = 0; c1 < n; c1 += 1) for (let c2 = c1 + 1; c2 < n; c2 += 1) {
      if (grid[r1][c1] === "1" && grid[r1][c2] === "1" && grid[r2][c1] === "1" && grid[r2][c2] === "1") count += 1;
    }
    return count;
  }
  function reachFrom(n, edges, start) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    edges.forEach(([a, b]) => adjacency[a].push(b));
    const seen = new Array(n + 1).fill(false);
    const stack = [start];
    seen[start] = true;
    while (stack.length) { const v = stack.pop(); adjacency[v].forEach((u) => { if (!seen[u]) { seen[u] = true; stack.push(u); } }); }
    return seen;
  }
  function reachableNodesBrute(n, edges) {
    const out = [];
    for (let v = 1; v <= n; v += 1) out.push(reachFrom(n, edges, v).filter(Boolean).length);
    return out;
  }
  function reachabilityQueriesBrute(n, edges, queries) { return queries.map(([a, b]) => reachFrom(n, edges, a)[b]); }
  function cutAndPasteBrute(s, ops) {
    let text = s;
    ops.forEach(([a, b]) => { text = text.slice(0, a - 1) + text.slice(b) + text.slice(a - 1, b); });
    return text;
  }
  function substringReversalsBrute(s, ops) {
    let text = s;
    ops.forEach(([a, b]) => { text = text.slice(0, a - 1) + text.slice(a - 1, b).split("").reverse().join("") + text.slice(b); });
    return text;
  }
  function reversalsAndSumsBrute(values, ops) {
    const list = values.slice(), out = [];
    ops.forEach(([type, a, b]) => {
      if (type === 1) { const middle = list.slice(a - 1, b).reverse(); for (let i = 0; i < middle.length; i += 1) list[a - 1 + i] = middle[i]; }
      else { let sum = 0; for (let i = a - 1; i < b; i += 1) sum += list[i]; out.push(sum); }
    });
    return out;
  }
  function componentsWithout(n, edges, skipEdge, skipNode) {
    const parent = [];
    for (let v = 0; v <= n; v += 1) parent.push(v);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    edges.forEach(([a, b], i) => { if (i === skipEdge || a === skipNode || b === skipNode) return; parent[find(a)] = find(b); });
    let count = 0;
    for (let v = 1; v <= n; v += 1) if (v !== skipNode && find(v) === v) count += 1;
    return count;
  }
  function lowLinkBrute(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    edges.forEach(([a, b], i) => { adjacency[a].push([b, i]); adjacency[b].push([a, i]); });
    const tin = new Array(n + 1).fill(-1), low = new Array(n + 1).fill(-1), parentEdge = new Array(n + 1).fill(-1);
    let timer = 0;
    const visit = (v) => {
      tin[v] = low[v] = timer; timer += 1;
      adjacency[v].forEach(([u, e]) => {
        if (e === parentEdge[v]) return;
        if (tin[u] < 0) { parentEdge[u] = e; visit(u); low[v] = Math.min(low[v], low[u]); }
        else low[v] = Math.min(low[v], tin[u]);
      });
    };
    for (let v = 1; v <= n; v += 1) if (tin[v] < 0) visit(v);
    return { tin: tin.slice(1), low: low.slice(1), parentEdge: parentEdge.slice(1) };
  }
  function necessaryRoadsBrute(n, edges) {
    const base = componentsWithout(n, edges, -1, 0);
    return edges.filter((edge, i) => componentsWithout(n, edges, i, 0) > base).map((edge) => edge.slice());
  }
  function necessaryCitiesBrute(n, edges) {
    const out = [];
    for (let v = 1; v <= n; v += 1) if (componentsWithout(n, edges, -1, v) > 1) out.push(v);
    return out;
  }
  function eulerianSubgraphsBrute(n, edges) {
    let count = 0;
    for (let mask = 0; mask < Math.pow(2, edges.length); mask += 1) {
      const degree = new Array(n + 1).fill(0);
      edges.forEach(([a, b], i) => { if (mask & (1 << i)) { degree[a] += 1; degree[b] += 1; } });
      if (degree.every((d) => d % 2 === 0)) count += 1;
    }
    return count % 1000000007;
  }
  function monsterGameBrute(x, strengths, factors) {
    const n = strengths.length;
    const best = new Array(n).fill(Infinity);
    for (let i = 0; i < n; i += 1) {
      best[i] = strengths[i] * x;
      for (let j = 0; j < i; j += 1) best[i] = Math.min(best[i], best[j] + strengths[i] * factors[j]);
    }
    return best[n - 1];
  }
  function subarraySquaresBrute(values, k) {
    const n = values.length;
    const prefix = [0n];
    values.forEach((v) => prefix.push(prefix[prefix.length - 1] + BigInt(v)));
    let previous = prefix.map((p) => p * p);
    for (let layer = 2; layer <= k; layer += 1) {
      const current = new Array(n + 1).fill(null);
      for (let i = layer; i <= n; i += 1) for (let j = layer - 1; j < i; j += 1) { const d = prefix[i] - prefix[j]; const cost = previous[j] + d * d; if (current[i] === null || cost < current[i]) current[i] = cost; }
      previous = current;
    }
    return String(previous[n]);
  }
  function housesAndSchoolsBrute(children, k) {
    const n = children.length;
    const cost = (l, r) => {
      let best = Infinity;
      for (let m = l; m <= r; m += 1) { let total = 0; for (let i = l; i <= r; i += 1) total += children[i - 1] * Math.abs(i - m); best = Math.min(best, total); }
      return best;
    };
    let previous = [0];
    for (let i = 1; i <= n; i += 1) previous.push(cost(1, i));
    for (let layer = 2; layer <= k; layer += 1) {
      const current = new Array(n + 1).fill(Infinity);
      for (let i = layer; i <= n; i += 1) for (let j = layer - 1; j < i; j += 1) current[i] = Math.min(current[i], previous[j] + cost(j + 1, i));
      previous = current;
    }
    return previous[n];
  }
  function knuthDivisionBrute(values) {
    const n = values.length;
    const memo = new Map();
    const best = (i, j) => {
      if (i === j) return 0;
      const key = i * n + j;
      if (memo.has(key)) return memo.get(key);
      let sum = 0;
      for (let t = i; t <= j; t += 1) sum += values[t];
      let value = Infinity;
      for (let m = i; m < j; m += 1) value = Math.min(value, best(i, m) + best(m + 1, j));
      memo.set(key, value + sum);
      return value + sum;
    };
    return best(0, n - 1);
  }
  function fftBrute(re, im, invert) {
    const n = re.length, outRe = [], outIm = [];
    for (let k = 0; k < n; k += 1) {
      let sr = 0, si = 0;
      for (let j = 0; j < n; j += 1) { const angle = (invert ? 2 : -2) * Math.PI * j * k / n; sr += re[j] * Math.cos(angle) - im[j] * Math.sin(angle); si += re[j] * Math.sin(angle) + im[j] * Math.cos(angle); }
      outRe.push(invert ? sr / n : sr); outIm.push(invert ? si / n : si);
    }
    return { re: outRe, im: outIm };
  }
  function convolveBrute(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i += 1) for (let j = 0; j < b.length; j += 1) out[i + j] += a[i] * b[j];
    return out;
  }
  function applesAndBananasBrute(k, apples, bananas) {
    const out = new Array(2 * k - 1).fill(0);
    apples.forEach((a) => bananas.forEach((b) => { out[a + b - 2] += 1; }));
    return out;
  }
  function oneBitPositionsBrute(s) {
    const n = s.length, out = new Array(n - 1).fill(0);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < i; j += 1) if (s[i] === "1" && s[j] === "1") out[i - j - 1] += 1;
    return out;
  }
  function signalProcessingBrute(signal, mask) {
    const n = signal.length, m = mask.length, out = [];
    for (let shift = 0; shift < n + m - 1; shift += 1) {
      let sum = 0;
      for (let j = 0; j < m; j += 1) { const i = shift - (m - 1) + j; if (i >= 0 && i < n) sum += signal[i] * mask[j]; }
      out.push(sum);
    }
    return out;
  }
  function newRoadsQueriesBrute(n, roads, queries) {
    return queries.map(([a, b]) => {
      if (a === b) return 0;
      const parent = [];
      for (let v = 0; v <= n; v += 1) parent.push(v);
      const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      for (let day = 0; day < roads.length; day += 1) { parent[find(roads[day][0])] = find(roads[day][1]); if (find(a) === find(b)) return day + 1; }
      return -1;
    });
  }
  function dynamicConnectivityBrute(n, edges, events) {
    const alive = new Map();
    const key = (a, b) => Math.min(a, b) + "," + Math.max(a, b);
    edges.forEach(([a, b]) => alive.set(key(a, b), [a, b]));
    const count = () => componentsWithout(n, Array.from(alive.values()), -1, 0);
    const out = [count()];
    events.forEach(([type, a, b]) => { if (type === 1) alive.set(key(a, b), [a, b]); else alive.delete(key(a, b)); out.push(count()); });
    return out;
  }
  function minCostFlowBrute(n, edges, source, sink, limit) {
    let best = null;
    const flows = new Array(edges.length).fill(0);
    const visit = (i) => {
      if (i === edges.length) {
        const net = new Array(n + 1).fill(0);
        edges.forEach(([a, b], e) => { net[a] -= flows[e]; net[b] += flows[e]; });
        for (let v = 1; v <= n; v += 1) if (v !== source && v !== sink && net[v] !== 0) return;
        const value = net[sink];
        if (value < 0 || value > limit || net[source] !== -value) return;
        const cost = edges.reduce((total, edge, e) => total + flows[e] * edge[3], 0);
        if (!best || value > best.flow || (value === best.flow && cost < best.cost)) best = { flow: value, cost, flows: flows.slice() };
        return;
      }
      for (let f = 0; f <= Math.min(edges[i][2], limit); f += 1) { flows[i] = f; visit(i + 1); }
      flows[i] = 0;
    };
    visit(0);
    return best;
  }
  function taskAssignmentBrute(costs) {
    const n = costs.length;
    let best = null;
    const used = new Array(n).fill(false), pick = [];
    const visit = (i, total) => {
      if (best && total >= best.cost) return;
      if (i === n) { best = { cost: total, assignment: pick.map((j) => j + 1) }; return; }
      for (let j = 0; j < n; j += 1) if (!used[j]) { used[j] = true; pick.push(j); visit(i + 1, total + costs[i][j]); pick.pop(); used[j] = false; }
    };
    visit(0, 0);
    return best;
  }
  function distinctRoutesIIBrute(n, teleporters, k) {
    const result = minCostFlowBrute(n, teleporters.map((t) => [t[0], t[1], 1, 1]), 1, n, k);
    if (!result || result.flow < k) return -1;
    const out = [];
    for (let v = 0; v <= n; v += 1) out.push([]);
    teleporters.forEach(([a, b], i) => { if (result.flows[i] > 0) out[a].push(b); });
    const routes = [];
    for (let day = 0; day < k; day += 1) { const route = [1]; let v = 1; while (v !== n) { v = out[v].pop(); route.push(v); } routes.push(route); }
    return { coins: result.cost, routes };
  }

  // ------------------------------------------------------------------ validators (answers with more than one correct form)
  function viaBrute(accept, brute) { return (args, out) => accept(args, out, brute.apply(null, JSON.parse(JSON.stringify(args)))) === true; }
  // Reads a treap in order, honouring pending flips, and checks every size, sum and priority on the way.
  function treapFacts(root) {
    const values = [];
    if (root === null) return { values, problem: null };
    if (!root || typeof root !== "object") return { values, problem: "a treap is a node object or null" };
    const frames = [[root, false, 0]];
    let nodes = 0;
    while (frames.length) {
      const [node, flipped, stage] = frames.pop();
      if (!node) continue;
      if (stage === 1) { values.push(node.value); continue; }
      nodes += 1;
      if (nodes > 5000000) return { values, problem: "the treap links loop back on themselves" };
      const size = (t) => (t ? t.size : 0), sum = (t) => (t ? t.sum : 0);
      if (node.size !== 1 + size(node.left) + size(node.right)) return { values, problem: "node " + node.value + " has size " + node.size + " but its subtree holds " + (1 + size(node.left) + size(node.right)) };
      if (node.sum !== node.value + sum(node.left) + sum(node.right)) return { values, problem: "node " + node.value + " has a stale sum" };
      if ((node.left && node.left.priority > node.priority) || (node.right && node.right.priority > node.priority)) return { values, problem: "a child outranks its parent: the larger priority must stay on top" };
      const reversed = flipped !== Boolean(node.flip);
      const first = reversed ? node.right : node.left, second = reversed ? node.left : node.right;
      frames.push([second, reversed, 0], [node, flipped, 1], [first, reversed, 0]);
    }
    return { values, problem: null };
  }
  function treapMatches(actual, expected, label) {
    const got = treapFacts(actual), want = treapFacts(expected);
    if (got.problem) return label + ": " + got.problem + ".";
    if (got.values.length !== want.values.length) return label + " holds " + got.values.length + " values, expected " + want.values.length + ".";
    for (let i = 0; i < want.values.length; i += 1) if (got.values[i] !== want.values[i]) return label + " reads " + JSON.stringify(got.values.slice(0, 12)) + " in order, expected " + JSON.stringify(want.values.slice(0, 12)) + ".";
    return true;
  }
  function treapMergeAccept(args, actual, expected) { return treapMatches(actual, expected, "The merged treap"); }
  function treapSplitAccept(args, actual, expected) {
    if (!Array.isArray(actual) || actual.length !== 2) return "Return [left, right].";
    const left = treapMatches(actual[0], expected[0], "The left part");
    return left === true ? treapMatches(actual[1], expected[1], "The right part") : left;
  }
  function edgeSetAccept(args, actual, expected) {
    if (!Array.isArray(actual)) return "Return a list of [a, b] roads.";
    const norm = (list) => list.map((e) => (Array.isArray(e) ? Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1]) : "?")).sort();
    const got = norm(actual), want = norm(expected);
    if (got.length !== want.length) return "Found " + got.length + " necessary roads, expected " + want.length + ".";
    for (let i = 0; i < want.length; i += 1) if (got[i] !== want[i]) return "Road " + got[i] + " is not necessary, or a necessary road is missing.";
    return true;
  }
  function nodeSetAccept(args, actual, expected) {
    if (!Array.isArray(actual)) return "Return a list of cities.";
    const got = actual.slice().sort((p, q) => p - q), want = expected.slice().sort((p, q) => p - q);
    if (got.length !== want.length) return "Found " + got.length + " necessary cities, expected " + want.length + ".";
    for (let i = 0; i < want.length; i += 1) if (got[i] !== want[i]) return "City " + got[i] + " is not necessary, or a necessary city is missing.";
    return true;
  }
  function fftAccept(args, actual, expected) {
    if (!actual || !Array.isArray(actual.re) || !Array.isArray(actual.im) || actual.re.length !== expected.re.length || actual.im.length !== expected.im.length) return "Return { re, im } with one entry per input value.";
    let scale = 1;
    expected.re.forEach((v, i) => { scale = Math.max(scale, Math.abs(v), Math.abs(expected.im[i])); });
    for (let i = 0; i < expected.re.length; i += 1) {
      if (!(Math.abs(actual.re[i] - expected.re[i]) <= 1e-7 * scale) || !(Math.abs(actual.im[i] - expected.im[i]) <= 1e-7 * scale)) return "Entry " + i + " is " + actual.re[i] + " + " + actual.im[i] + "i, expected " + expected.re[i] + " + " + expected.im[i] + "i.";
    }
    return true;
  }
  function minCostFlowAccept(args, actual, expected) {
    const [n, edges, source, sink] = args;
    if (!actual || typeof actual.flow !== "number" || typeof actual.cost !== "number" || !Array.isArray(actual.flows) || actual.flows.length !== edges.length) return "Return { flow, cost, flows } with one flow per edge.";
    if (actual.flow !== expected.flow) return "The flow is " + actual.flow + ", but " + expected.flow + " units can be sent.";
    if (actual.cost !== expected.cost) return "The cost is " + actual.cost + ", but this flow can be sent for " + expected.cost + ".";
    const net = new Array(n + 1).fill(0);
    let cost = 0;
    for (let i = 0; i < edges.length; i += 1) {
      const f = actual.flows[i];
      if (!Number.isInteger(f) || f < 0 || f > edges[i][2]) return "Edge " + (i + 1) + " carries " + f + " units but holds " + edges[i][2] + ".";
      net[edges[i][0]] -= f; net[edges[i][1]] += f; cost += f * edges[i][3];
    }
    for (let v = 1; v <= n; v += 1) if (v !== source && v !== sink && net[v] !== 0) return "Flow is not conserved at node " + v + ".";
    if (source !== sink && net[sink] !== actual.flow) return "The flows deliver " + net[sink] + " units to the sink, not " + actual.flow + ".";
    if (cost !== actual.cost) return "The flows cost " + cost + ", not " + actual.cost + ".";
    return true;
  }
  function taskAssignmentAccept(args, actual, expected) {
    const costs = args[0], n = costs.length;
    if (!actual || typeof actual.cost !== "number" || !Array.isArray(actual.assignment) || actual.assignment.length !== n) return "Return { cost, assignment } with one task per employee.";
    const taken = new Array(n + 1).fill(false);
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      const task = actual.assignment[i];
      if (!Number.isInteger(task) || task < 1 || task > n || taken[task]) return "Employee " + (i + 1) + " gets task " + task + ", which is not a free task.";
      taken[task] = true;
      total += costs[i][task - 1];
    }
    if (total !== actual.cost) return "The assignment costs " + total + ", not " + actual.cost + ".";
    if (total !== expected.cost) return "This assignment costs " + total + ", but " + expected.cost + " is possible.";
    return true;
  }
  function distinctRoutesIIAccept(args, actual, expected) {
    const [n, teleporters, k] = args;
    if (expected === -1) return actual === -1 ? true : "There are not " + k + " routes that share no teleporter; return -1.";
    if (actual === -1) return k + " routes exist; -1 is wrong here.";
    if (!actual || typeof actual.coins !== "number" || !Array.isArray(actual.routes) || actual.routes.length !== k) return "Return { coins, routes } with " + k + " routes.";
    const available = new Map();
    teleporters.forEach(([a, b]) => available.set(a * (n + 1) + b, true));
    let coins = 0;
    for (let d = 0; d < k; d += 1) {
      const route = actual.routes[d];
      if (!Array.isArray(route) || route[0] !== 1 || route[route.length - 1] !== n) return "Route " + (d + 1) + " must start in room 1 and end in room " + n + ".";
      for (let i = 0; i + 1 < route.length; i += 1) {
        const key = route[i] * (n + 1) + route[i + 1];
        if (!available.has(key)) return "Route " + (d + 1) + " uses a teleporter " + route[i] + " → " + route[i + 1] + " that does not exist.";
        if (!available.get(key)) return "The teleporter " + route[i] + " → " + route[i + 1] + " is used twice.";
        available.set(key, false);
        coins += 1;
      }
    }
    if (coins !== actual.coins) return "The routes use " + coins + " teleporters, not " + actual.coins + ".";
    if (coins !== expected.coins) return "These routes cost " + coins + " coins, but " + expected.coins + " is possible.";
    return true;
  }

  // ------------------------------------------------------------------ input builders
  // A treap over values with the given priorities, built by the unique max-priority rule.
  function treapOf(values, priorities) {
    const build = (lo, hi) => {
      if (lo > hi) return null;
      let top = lo;
      for (let i = lo + 1; i <= hi; i += 1) if (priorities[i] > priorities[top]) top = i;
      const left = build(lo, top - 1), right = build(top + 1, hi);
      const size = 1 + (left ? left.size : 0) + (right ? right.size : 0);
      const sum = values[top] + (left ? left.sum : 0) + (right ? right.sum : 0);
      return { value: values[top], priority: priorities[top], size, sum, flip: false, left, right };
    };
    return build(0, values.length - 1);
  }
  function smallTreap(seed, count, offset) {
    const next = rng(seed);
    const values = [], priorities = [];
    for (let i = 0; i < count; i += 1) { values.push(offset + i); priorities.push(Math.floor(next() * 1000000)); }
    return treapOf(values, priorities);
  }
  function smallList(seed, n, lo, hi) { return randomInts(seed, n, lo, hi); }
  function smallBits(seed, count, width) {
    const next = rng(seed), out = [];
    for (let i = 0; i < count; i += 1) { let s = ""; for (let c = 0; c < width; c += 1) s += next() < 0.5 ? "1" : "0"; out.push(s); }
    return out;
  }
  function letterGrid(seed, n, k) {
    const next = rng(seed), out = [];
    for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) row += String.fromCharCode(65 + Math.floor(next() * k)); out.push(row); }
    return out;
  }
  function bitGrid(seed, n, density) {
    const next = rng(seed), out = [];
    for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) row += next() < density ? "1" : "0"; out.push(row); }
    return out;
  }
  // A DAG: edges run forward along a hidden random order.
  function randomDag(seed, n, m) {
    const next = rng(seed), order = randomPermutation(seed + 1, n), seen = new Set(), edges = [];
    while (edges.length < m) {
      const i = Math.floor(next() * n), j = Math.floor(next() * n);
      if (i === j) continue;
      const a = order[Math.min(i, j)], b = order[Math.max(i, j)];
      if (seen.has(a * (n + 1) + b)) continue;
      seen.add(a * (n + 1) + b);
      edges.push([a, b]);
    }
    return edges;
  }
  // Mostly forward edges with a few backward ones, so strongly connected pieces stay small.
  function randomDigraph(seed, n, m, back) {
    const next = rng(seed), order = randomPermutation(seed + 1, n), seen = new Set(), edges = [];
    while (edges.length < m) {
      const i = Math.floor(next() * n), span = 1 + Math.floor(next() * Math.min(n - 1, 40));
      const j = next() < back ? i - span : i + span;
      if (j < 0 || j >= n) continue;
      const a = order[i], b = order[j];
      if (seen.has(a * (n + 1) + b)) continue;
      seen.add(a * (n + 1) + b);
      edges.push([a, b]);
    }
    return edges;
  }
  function randomQueries(seed, n, q) {
    const next = rng(seed), out = [];
    for (let i = 0; i < q; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]);
    return out;
  }
  // A connected simple graph: a random tree plus extra edges kept inside the first `dense` nodes.
  function connectedGraph(seed, n, m, dense) {
    const next = rng(seed), seen = new Set(), edges = [];
    const add = (a, b) => { const key = Math.min(a, b) * (n + 1) + Math.max(a, b); if (a === b || seen.has(key)) return false; seen.add(key); edges.push([a, b]); return true; };
    for (let v = 2; v <= n; v += 1) add(1 + Math.floor(next() * (v - 1)), v);
    const limit = Math.max(2, Math.min(n, dense));
    let tries = 0;
    while (edges.length < m && tries < 50 * m) { tries += 1; add(1 + Math.floor(next() * limit), 1 + Math.floor(next() * limit)); }
    return edges;
  }
  function randomSimpleGraph(seed, n, m) {
    const next = rng(seed), seen = new Set(), edges = [];
    let tries = 0;
    while (edges.length < m && tries < 50 * m + 100) {
      tries += 1;
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      const key = Math.min(a, b) * (n + 1) + Math.max(a, b);
      if (a === b || seen.has(key)) continue;
      seen.add(key); edges.push([a, b]);
    }
    return edges;
  }
  function rangeOps(seed, n, m, types) {
    const next = rng(seed), out = [];
    for (let i = 0; i < m; i += 1) {
      let a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (a > b) { const swap = a; a = b; b = swap; }
      out.push(types ? [types[Math.floor(next() * types.length)], a, b] : [a, b]);
    }
    return out;
  }
  function randomLetters(seed, n, alphabet) {
    const next = rng(seed);
    let s = "";
    for (let i = 0; i < n; i += 1) s += String.fromCharCode(65 + Math.floor(next() * alphabet));
    return s;
  }
  function monsterInput(seed, n, sorted) {
    const next = rng(seed);
    let strengths = randomInts(seed + 1, n, 1, 1000000), factors = randomInts(seed + 2, n, 1, 1000000);
    const x = sorted ? 1000000 : 1 + Math.floor(next() * 1000000);
    if (sorted) { strengths = strengths.sort((p, q) => p - q); factors = factors.sort((p, q) => q - p); }
    return [x, strengths, factors];
  }
  function connectivityEvents(seed, n, m, k) {
    const next = rng(seed);
    const edges = randomSimpleGraph(seed + 1, n, m);
    const alive = edges.slice(), present = new Set(edges.map(([a, b]) => Math.min(a, b) * (n + 1) + Math.max(a, b)));
    const events = [];
    while (events.length < k) {
      if (alive.length && next() < 0.5) {
        const at = Math.floor(next() * alive.length);
        const [a, b] = alive[at];
        alive[at] = alive[alive.length - 1]; alive.pop();
        present.delete(Math.min(a, b) * (n + 1) + Math.max(a, b));
        events.push([2, a, b]);
      } else {
        const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
        const key = Math.min(a, b) * (n + 1) + Math.max(a, b);
        if (a === b || present.has(key)) continue;
        present.add(key); alive.push([a, b]);
        events.push([1, a, b]);
      }
    }
    return [n, edges, events];
  }
  function flowNetwork(seed, n, m, capacity, price) {
    const next = rng(seed), edges = [];
    for (let i = 0; i < m; i += 1) {
      const a = 1 + Math.floor(next() * n);
      let b = 1 + Math.floor(next() * n);
      if (b === a) b = a === n ? 1 : a + 1;
      edges.push([a, b, 1 + Math.floor(next() * capacity), 1 + Math.floor(next() * price)]);
    }
    return edges;
  }
  function teleporterGraph(seed, n, m) {
    const next = rng(seed), seen = new Set(), edges = [];
    let tries = 0;
    while (edges.length < m && tries < 100 * m) {
      tries += 1;
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (a === b || seen.has(a * (n + 1) + b)) continue;
      seen.add(a * (n + 1) + b); edges.push([a, b]);
    }
    return edges;
  }
  function costMatrix(seed, n, hi) {
    const next = rng(seed), out = [];
    for (let i = 0; i < n; i += 1) { const row = []; for (let j = 0; j < n; j += 1) row.push(1 + Math.floor(next() * hi)); out.push(row); }
    return out;
  }
  function freshDsu(n) {
    const dsu = { parent: [], size: [], history: [], components: n };
    for (let v = 0; v <= n; v += 1) { dsu.parent.push(v); dsu.size.push(1); }
    return dsu;
  }

  // A named mistake made from a reference by swapping exact snippets of its source; a missing snippet fails loudly.
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

  // Treap entries in order ([value, priority]), honouring pending flips; the brutes rebuild the unique treap from them.
  function treapEntries(root) {
    const out = [];
    const frames = [[root, false, 0]];
    while (frames.length) {
      const [node, flipped, stage] = frames.pop();
      if (!node) continue;
      if (stage === 1) { out.push([node.value, node.priority]); continue; }
      const reversed = flipped !== Boolean(node.flip);
      frames.push([reversed ? node.left : node.right, reversed, 0], [node, flipped, 1], [reversed ? node.right : node.left, reversed, 0]);
    }
    return out;
  }
  function treapMergeBrute(a, b) { const all = treapEntries(a).concat(treapEntries(b)); return treapOf(all.map((e) => e[0]), all.map((e) => e[1])); }
  function treapSplitBrute(root, k) {
    const all = treapEntries(root);
    const part = (list) => treapOf(list.map((e) => e[0]), list.map((e) => e[1]));
    return [part(all.slice(0, k)), part(all.slice(k))];
  }
  function flippedTreap(values, priorities) { const root = treapOf(values, priorities); root.flip = true; return root; }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const SUBSET_BIG = lazy(() => randomInts(1301, 20, 1, 1000000000));
  const MEET_SMALL = lazy(() => randomInts(1302, 40, 1, 100));
  const MEET_BIG = lazy(() => { const values = randomInts(1303, 40, 1, 50000000); let x = 0; values.forEach((v, i) => { if (i % 4 === 1) x += v; }); return [values, x]; });
  const BITS_BIG = lazy(() => smallBits(1304, 20000, 30));
  const LETTERS_BIG = lazy(() => letterGrid(1305, 2000, 26));
  const LETTERS_RARE = lazy(() => { const grid = letterGrid(1306, 2000, 2); grid[777] = grid[777].slice(0, 500) + "C" + grid[777].slice(501); return grid; });
  const BITGRID_BIG = lazy(() => bitGrid(1307, 1600, 0.5));
  const DAG_BIG = lazy(() => randomDag(1308, 30000, 60000));
  const DIGRAPH_BIG = lazy(() => [randomDigraph(1309, 40000, 80000, 0.1), randomQueries(1310, 40000, 100000)]);
  const LETTERS_LONG = lazy(() => randomLetters(1311, 50000, 26));
  const CUTS_BIG = lazy(() => rangeOps(1312, 50000, 50000));
  const REVERSALS_BIG = lazy(() => rangeOps(1313, 50000, 50000));
  const SUM_VALUES_BIG = lazy(() => randomInts(1314, 100000, 0, 1000000000));
  const SUM_OPS_BIG = lazy(() => rangeOps(1315, 100000, 50000, [1, 2]));
  const LINK_GRAPH_BIG = lazy(() => connectedGraph(1316, 100000, 200000, 50000));
  const EULER_GRAPH_BIG = lazy(() => randomSimpleGraph(1317, 100000, 200000));
  const MONSTER_SORTED = lazy(() => monsterInput(1318, 200000, true));
  const MONSTER_FREE = lazy(() => monsterInput(1319, 200000, false));
  const SQUARES_MID = lazy(() => randomInts(1320, 3000, 1, 30000));
  const SQUARES_HUGE = lazy(() => randomInts(1321, 3000, 1, 100000));
  const HOUSES_BIG = lazy(() => randomInts(1322, 3000, 1, 1000000000));
  const KNUTH_BIG = lazy(() => randomInts(1323, 2000, 1, 1000000000));
  const FFT_BIG = lazy(() => randomInts(1324, 131072, 0, 1000));
  const FFT_ZERO = lazy(() => new Array(131072).fill(0));
  const CONV_A = lazy(() => randomInts(1325, 100000, 0, 100));
  const CONV_B = lazy(() => randomInts(1326, 100000, 0, 100));
  const APPLES_A = lazy(() => randomInts(1327, 100000, 1, 100000));
  const APPLES_B = lazy(() => randomInts(1328, 100000, 1, 100000));
  const BITSTRING_BIG = lazy(() => smallBits(1329, 1, 100000)[0]);
  const SIGNAL_A = lazy(() => randomInts(1330, 100000, 1, 100));
  const SIGNAL_B = lazy(() => randomInts(1331, 100000, 1, 100));
  const ROADS_BIG = lazy(() => randomQueries(1332, 200000, 200000));
  const ROAD_QUERIES_BIG = lazy(() => randomQueries(1333, 200000, 200000));
  const CONNECTIVITY_BIG = lazy(() => connectivityEvents(1334, 100000, 100000, 100000));
  // Random routes plus a fan out of city 1 and a fan into city 500, so 100 parcels can get through.
  const PARCEL_BIG = lazy(() => {
    const edges = flowNetwork(1335, 500, 960, 1000, 1000);
    for (let v = 2; v <= 21; v += 1) edges.push([1, v, 10, 1 + ((v * 37) % 1000)]);
    for (let v = 480; v <= 499; v += 1) edges.push([v, 500, 10, 1 + ((v * 53) % 1000)]);
    return edges;
  });
  const TASKS_BIG = lazy(() => costMatrix(1336, 200, 1000));
  const ROUTES_BIG = lazy(() => {
    const tele = teleporterGraph(1337, 500, 700);
    const seen = new Set(tele.map(([a, b]) => a * 501 + b));
    for (let v = 2; v <= 120; v += 1) if (!seen.has(501 + v)) tele.push([1, v]);
    for (let v = 380; v <= 499; v += 1) if (!seen.has(v * 501 + 500)) tele.push([v, 500]);
    return [500, tele, 60];
  });

  const SAMPLE_ROADS = [[1, 2], [1, 4], [2, 4], [3, 5], [4, 5]];
  const SAMPLE_DAG = [[1, 2], [1, 3], [1, 4], [2, 3], [3, 5], [4, 5]];
  const SAMPLE_QUERY_GRAPH = [[1, 2], [2, 3], [3, 1], [4, 3]];

  const ADVANCED = [
    {
      id: "subset-sums", title: "Subset Sums, Sorted", cses: { id: 1628, name: "Meet in the Middle (brick)" },
      goal: "Every subset sum of values — 2^k of them, repeats kept — in increasing order.",
      concept: "Adding one more value v doubles the list: the old sums, and the old sums plus v. Both halves are already sorted, so one merge keeps the whole list sorted with no sort call, O(2^k) in total. This is the half of meet in the middle that turns 2^20 subsets into a sorted array you can sweep.",
      functionName: "subsetSums", signature: "subsetSums(values) → sums",
      starterSource: starter("subsetSums", "values", "Start from [0]; for each v, merge the sorted list with the same list shifted up by v."),
      solve: subsetSums, comparator: "deep", brute: subsetSumsBrute, small: (round) => [smallList(13000 + round, round % 7, 1, 6)],
      reference: book("5.5", "Meet in the middle"),
      presets: { "two values": { a: [1, 2] }, "four values": { a: [5, 1, 4, 2] }, repeats: { a: [2, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("concatenates", "sums.concat(shifted) keeps each half sorted but not the whole list; merge the two halves instead.", function subsetSums(values) { let sums = [0]; for (let i = 0; i < values.length; i += 1) { const v = values[i]; sums = sums.concat(sums.map((s) => s + v)); } return sums; }),
        diagnosis("drops-repeats", "Two different subsets can share a sum; each one is its own entry, so keep the repeats.", function subsetSums(values) { let sums = [0]; for (let i = 0; i < values.length; i += 1) { const v = values[i]; const merged = []; let p = 0, q = 0; while (p < sums.length || q < sums.length) { const next = q >= sums.length || (p < sums.length && sums[p] <= sums[q] + v) ? sums[p++] : sums[q++] + v; if (merged.length === 0 || merged[merged.length - 1] !== next) merged.push(next); } sums = merged; } return sums; }),
      ],
      hints: ["sums = [0]. For each value v the new list is the merge of sums and sums.map((s) => s + v).", "Both lists are sorted, so merge them with two pointers p and q: take sums[p] while it is ≤ sums[q] + v.", "Keep duplicates: two different subsets with the same sum are two entries."],
      cases: [
        example([[1, 2]], [0, 1, 2, 3], "two values"),
        example([[3, 1]], [0, 1, 3, 4], "out of order"),
        example([[2, 2]], [0, 2, 2, 4], "repeats stay"),
        example([[]], [0], "no values: only the empty subset"),
        run(subsetSums, [[5, 1, 4, 2]], "four values"),
        hidden("k = 20 values up to 10⁹, time limit", () => [SUBSET_BIG()]),
      ],
    },
    {
      id: "meet-in-the-middle", title: "Meet in the Middle", cses: { id: 1628, name: "Meet in the Middle" },
      goal: "The number of subsets of values whose sum is exactly x (n ≤ 40).",
      concept: "2^40 subsets are far too many, but 2^20 are fine. Split the array into two halves, list the sorted subset sums of each half with the brick, and count pairs left + right = x with two pointers: walk the left sums upward and the right sums downward. Equal sums come in blocks, and a block of a equal left sums meeting a block of b matching right sums contributes a · b subsets.",
      functionName: "meetInTheMiddle", signature: "meetInTheMiddle(values, x) → count",
      starterSource: starter("meetInTheMiddle", "values, x", "left = subsetSums(first half), right = subsetSums(second half); two pointers from opposite ends, multiplying block sizes."),
      solve: meetInTheMiddle, comparator: "scalar", dependencies: ["subset-sums"], brute: meetInTheMiddleBrute, small: (round) => [smallList(13050 + round, 1 + (round % 12), 1, 5), 1 + (round % 15)],
      reference: book("5.5", "Meet in the middle"),
      presets: { "CSES sample": { a: [1, 2, 3, 2], b: 5 }, "every pair of ones": { a: [1, 1, 1, 1], b: 2 }, "ten numbers": { a: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3], b: 15 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("counts-one-match", "Several right-half subsets can share the needed sum; each of them pairs with every left subset in the block.", meetInTheMiddle, [["count += same * match;", "count += same * Math.min(match, 1);"]]),
        variant("drops-the-middle", "The right half starts at index half itself; slicing from half + 1 loses one number.", meetInTheMiddle, [["values.slice(half)", "values.slice(half + 1)"]]),
      ],
      hints: ["half = values.length >> 1; left = subsetSums(values.slice(0, half)); right = subsetSums(values.slice(half)).", "Walk i up through left and j down through right; while right[j] > x − left[i], move j down.", "Count the run of equal left sums (same) and the run of right sums equal to x − left[i] (match); add same · match."],
      cases: [
        example([[1, 2, 3, 2], 5], 3, "CSES sample"),
        example([[5], 5], 1, "one number"),
        example([[1, 1, 1, 1], 2], 6, "every pair of ones"),
        example([[4, 6], 5], 0, "no subset hits x"),
        run(meetInTheMiddle, [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3], 15], "ten numbers"),
        hidden("n = 40 values up to 100, x = 1000: the count passes 2·10⁹", () => [MEET_SMALL(), 1000]),
        hidden("n = 40 values up to 5·10⁷", () => MEET_BIG()),
      ],
    },
    {
      id: "popcount", title: "Popcount", cses: { id: 2136, name: "Hamming Distance (brick)" },
      goal: "The number of 1 bits in the 32-bit pattern of x; a negative x counts its sign bit.",
      concept: "Counting bits one at a time takes 32 steps. The SWAR trick counts them in parallel inside the word: first every 2-bit field holds the count of its own two bits, then every 4-bit field, then every byte, and one multiplication adds the four byte counts into the top byte. Five operations and no loop, and Hamming distances, corner counts and bitset reachability all lean on it.",
      functionName: "popcount", signature: "popcount(x) → count",
      starterSource: starter("popcount", "x", "Pairs, then nibbles, then bytes: v = x − ((x >>> 1) & 0x55555555); … then multiply by 0x01010101 and keep the top byte."),
      solve: popcount, comparator: "scalar", brute: popcountBrute, small: (round) => [randomInts(13100 + round, 1, -2147483648, 2147483647)[0]],
      reference: site("cp-algorithms · Bit manipulation", CP + "algebra/bit-manipulation.html"),
      scene: { kind: "algo", view: "number", handles: [{ id: "x", type: "slider", label: "x (rounded)", value: 11, min: 0, max: 1023 }], args: [{ fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("stops-at-a-zero-bit", "A zero bit in the middle does not end the count; every one of the 32 positions has to be looked at.", function popcount(x) { let count = 0; while (x & 1) { count += 1; x >>>= 1; } return count; }),
        diagnosis("loses-the-sign-bit", "A negative number has bit 31 set, so while (x > 0) never enters the loop; shift with >>> and loop while x !== 0.", function popcount(x) { let count = 0; while (x > 0) { count += x & 1; x >>= 1; } return count; }),
      ],
      hints: ["v = x − ((x >>> 1) & 0x55555555) leaves the count of each bit pair inside that pair.", "v = (v & 0x33333333) + ((v >>> 2) & 0x33333333), then v = (v + (v >>> 4)) & 0x0f0f0f0f gives one count per byte.", "Math.imul(v, 0x01010101) >>> 24 adds the four byte counts; >>> keeps the result unsigned."],
      cases: [
        example([11], 3, "eleven is 1011"),
        example([0], 0, "zero"),
        example([-1], 32, "all 32 bits set"),
        example([-2147483648], 1, "only the sign bit"),
        example([1431655765], 16, "alternating bits 0x55555555"),
        example([4294967295], 32, "2³² − 1 is the same pattern as −1"),
      ],
    },
    {
      id: "hamming-distance", title: "Hamming Distance", cses: { id: 2136, name: "Hamming Distance" },
      goal: "The smallest Hamming distance between any two of the bit strings.",
      concept: "With k ≤ 30 every string fits in one integer, so comparing two strings is one xor and one popcount instead of k character tests: the xor has a 1 exactly where they differ. That turns the n²/2 pairs into about 2·10⁸ word operations, the handbook's bit optimization. Stop early once the distance reaches 0.",
      functionName: "hammingDistance", signature: "hammingDistance(strings) → distance",
      starterSource: starter("hammingDistance", "strings", "parseInt(s, 2) each string, then the minimum popcount(a ^ b) over all pairs i < j."),
      solve: hammingDistance, comparator: "scalar", dependencies: ["popcount"], brute: hammingDistanceBrute, small: (round) => [smallBits(13300 + round, 2 + (round % 7), 1 + (round % 8))],
      reference: book("10.4", "Bit optimizations · Hamming distances"),
      presets: { "CSES sample": { a: ["110111", "001000", "100001", "101000", "101110"] }, "no close pair": { a: ["1111", "0000", "0011"] }, twins: { a: ["1010", "0110", "1010"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("compares-a-string-with-itself", "Every string is at distance 0 from itself; the pairs must be two different strings, j > i.", hammingDistance, [["for (let j = i + 1;", "for (let j = i;"]]),
        variant("one-direction", "a & ~b only counts places where a has a 1 and b a 0; the xor counts both kinds of difference.", hammingDistance, [["popcount(word ^ words[j])", "popcount(word & ~words[j])"]]),
      ],
      hints: ["words[i] = parseInt(strings[i], 2); k ≤ 30 keeps every value a small positive integer.", "For every pair i < j the distance is popcount(words[i] ^ words[j]).", "Keep the minimum; you can stop as soon as it is 0."],
      cases: [
        example([["110111", "001000", "100001", "101000", "101110"]], 1, "CSES sample"),
        example([["0", "1"]], 1, "two one-bit strings"),
        example([["1010", "1010"]], 0, "two equal strings"),
        example([["1111", "0000", "0011"]], 2, "no pair differs in one place"),
        run(hammingDistance, [smallBits(13200, 12, 10)], "twelve strings of ten bits"),
        hidden("n = 20 000 strings of 30 bits, time limit", () => [BITS_BIG()]),
      ],
    },
    {
      id: "corner-subgrid-check", title: "Corner Subgrid Check", cses: { id: 3360, name: "Corner Subgrid Check" },
      goal: "For each of the first k letters, whether some subgrid of height and width at least two has that letter in all four corners.",
      concept: "Fix a letter. A valid subgrid is two rows that both hold the letter in the same two columns c1 < c2. So walk the rows and, in each row, mark every column pair (c1, c2) where the letter appears; the answer is YES the first time a pair is marked twice. There are only n(n − 1)/2 pairs, so by pigeonhole each letter stops after at most that many marks plus one: the work is bounded by the table, not by the n⁴ subgrids.",
      functionName: "cornerSubgridCheck", signature: "cornerSubgridCheck(grid, k) → booleans",
      starterSource: starter("cornerSubgridCheck", "grid, k", "Per letter: in each row list the columns holding it and mark every pair c1 < c2 in an n × n table; a pair marked before means YES."),
      solve: cornerSubgridCheck, comparator: "deep", brute: cornerSubgridCheckBrute, small: (round) => [letterGrid(13500 + round, 1 + (round % 6), 1 + (round % 4)), 1 + (round % 4)],
      reference: book("10.4", "Bit optimizations · counting subgrids"),
      presets: { "CSES sample": { a: ["AAAA", "CBBC", "CBBE", "AAAA"], b: 5 }, "too narrow": { a: ["AB", "AB"], b: 2 }, "a 2 × 2 block": { a: ["AA", "AA"], b: 1 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("width-one", "The same column twice is a subgrid of width one; the two columns of a pair must differ, q > p.", cornerSubgridCheck, [["for (let q = p + 1; q < to; q += 1)", "for (let q = p; q < to; q += 1)"]]),
        variant("shared-marks", "A pair marked by another letter says nothing about this one; compare the mark with this letter's stamp.", cornerSubgridCheck, [["if (seen[cell] === letter)", "if (seen[cell] !== 0)"]]),
      ],
      hints: ["Handle one letter at a time. In each row, collect the columns where it appears.", "For every pair of those columns c1 < c2 look at seen[c1 · n + c2]: if this letter already marked it in an earlier row, the answer is YES.", "Stamp marks with the letter's number (1…26) so one Uint8Array serves every letter without clearing."],
      cases: [
        example([["AAAA", "CBBC", "CBBE", "AAAA"], 5], [true, true, false, false, false], "CSES sample"),
        example([["AB", "AB"], 2], [false, false], "one column of A is not wide enough"),
        example([["AA", "AA"], 1], [true], "a 2 × 2 block"),
        example([["A"], 1], [false], "a single square"),
        run(cornerSubgridCheck, [letterGrid(13400, 6, 3), 3], "six by six, three letters"),
        hidden("n = 2000, k = 26, time limit", () => [LETTERS_BIG(), 26]),
        hidden("n = 2000 with a single C", () => [LETTERS_RARE(), 3]),
      ],
    },
    {
      id: "corner-subgrid-count", title: "Corner Subgrid Count", cses: { id: 2137, name: "Corner Subgrid Count" },
      goal: "The number of subgrids of height and width at least two whose four corners are all black (1).",
      concept: "Two rows a < b form C(c, 2) beautiful subgrids, where c counts the columns black in both rows: any two of those columns make the corners. Store each row as 32-bit words; the common columns of two rows are the popcount of their word-wise AND. That is n²/2 row pairs times n/32 words, and the 32× bit-parallel speedup is what makes n = 3000 fit.",
      functionName: "cornerSubgridCount", signature: "cornerSubgridCount(grid) → count",
      starterSource: starter("cornerSubgridCount", "grid", "Pack each row into Int32 words; for every row pair c = Σ popcount(rowA[w] & rowB[w]); add c·(c − 1)/2."),
      solve: cornerSubgridCount, comparator: "scalar", dependencies: ["popcount"], brute: cornerSubgridCountBrute, small: (round) => [bitGrid(13700 + round, 1 + (round % 7), 0.6)],
      reference: book("10.4", "Bit optimizations · counting subgrids"),
      presets: { "CSES sample": { a: ["00010", "11111", "00110", "11001", "00010"] }, "all black": { a: ["111", "111", "111"] }, sparse: { a: ["1001", "0110", "1001", "0000"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("counts-common-columns", "c common columns give C(c, 2) subgrids, one per pair of columns, not c.", cornerSubgridCount, [["total += common * (common - 1) / 2;", "total += common;"]]),
        variant("pairs-a-row-with-itself", "A subgrid needs two different rows; b starts at a + 1.", cornerSubgridCount, [["for (let b = a + 1;", "for (let b = a;"]]),
      ],
      hints: ["words = (n + 31) >> 5; set bit c & 31 of word c >> 5 when row[c] is '1'.", "For rows a < b: common = Σ popcount(bits[a][w] & bits[b][w]).", "Each pair of rows adds common · (common − 1) / 2."],
      cases: [
        example([["00010", "11111", "00110", "11001", "00010"]], 4, "CSES sample"),
        example([["11", "11"]], 1, "one 2 × 2 block"),
        example([["111", "111", "111"]], 9, "all black 3 × 3"),
        example([["1"]], 0, "one square"),
        run(cornerSubgridCount, [bitGrid(13600, 8, 0.6)], "eight by eight"),
        hidden("n = 1600 (CSES allows 3000), time limit", () => [BITGRID_BIG()]),
      ],
    },
    {
      id: "reachable-nodes", title: "Reachable Nodes", cses: { id: 2138, name: "Reachable Nodes" },
      goal: "For each node of a directed acyclic graph, how many nodes it can reach, itself included.",
      concept: "Reachability sets overlap, so adding up the children's counts double-counts every diamond. Give every node a bitset of what it reaches instead: its own bit OR the bitsets of its children, filled in reverse topological order. Full bitsets would take n²/32 words, so work in slabs of 2048 target nodes with 64 words per node, adding each node's popcount after every slab. The total is (n + m) · n / 32 word operations.",
      functionName: "reachableNodes", signature: "reachableNodes(n, edges) → counts",
      starterSource: starter("reachableNodes", "n, edges", "order = courseSchedule(n, edges); for each slab of 2048 targets sweep the order backwards, OR-ing the children's words, and add popcounts."),
      solve: reachableNodes, comparator: "deep", dependencies: ["popcount", "course-schedule"], brute: reachableNodesBrute, small: (round) => { const n = 1 + (round % 8); return [n, randomDag(13900 + round, n, Math.min(n * (n - 1) / 2, round % 12))]; },
      reference: book("16.2", "Dynamic programming on acyclic graphs"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_DAG, directed: true }, "a diamond": { a: 4, b: [[1, 2], [1, 3], [2, 4], [3, 4]], directed: true }, "no edges": { a: 3, b: [], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-paths", "Adding the children's counts counts a node once per path to it; a diamond reaches its sink by two paths but it is one node.", function reachableNodes(n, edges) { const order = courseSchedule(n, edges); const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const count = new Array(n + 1).fill(1); for (let i = n - 1; i >= 0; i -= 1) { const v = order[i]; for (let e = 0; e < adjacency[v].length; e += 1) count[v] += count[adjacency[v][e]]; } return count.slice(1); }),
        variant("forward-order", "A node can only copy its children's bits once they are complete, so sweep the topological order backwards.", reachableNodes, [["for (let i = n - 1; i >= 0; i -= 1)", "for (let i = 0; i < n; i += 1)"]]),
      ],
      hints: ["courseSchedule(n, edges) returns a topological order; go through it backwards so every child is finished first.", "Per slab of targets base … base + 2047: bits[v] = its own bit (when v is in the slab) OR bits[child] for each child, 64 Int32 words each.", "After each node, add the popcount of its 64 words to counts[v − 1]."],
      cases: [
        example([5, SAMPLE_DAG], [5, 3, 2, 2, 1], "CSES sample"),
        example([3, []], [1, 1, 1], "no edges"),
        example([4, [[1, 2], [1, 3], [2, 4], [3, 4]]], [4, 2, 2, 1], "a diamond reaches its sink once"),
        run(reachableNodes, [8, randomDag(13800, 8, 12)], "eight nodes"),
        hidden("n = 3·10⁴, m = 6·10⁴ (CSES allows 5·10⁴ and 10⁵), time limit", () => [30000, DAG_BIG()]),
      ],
    },
    {
      id: "reachability-queries", title: "Reachability Queries", cses: { id: 2143, name: "Reachability Queries" },
      goal: "For each query [a, b], whether node b can be reached from node a in a directed graph that may have cycles.",
      concept: "Inside a strongly connected component every node reaches every other, so first shrink each component to one node with the Planets and Kingdoms brick; its labels are already a topological order of the condensed graph. Then run the Reachable Nodes sweep on the component DAG, but only for slabs of targets that some query asks about, testing one bit per query instead of counting.",
      functionName: "reachabilityQueries", signature: "reachabilityQueries(n, edges, queries) → booleans",
      starterSource: starter("reachabilityQueries", "n, edges, queries", "label = planetsAndKingdoms(n, edges); build the component DAG; per slab of target labels, OR bitsets from the largest label down and test one bit per query."),
      solve: reachabilityQueries, comparator: "deep", dependencies: ["planets-and-kingdoms"], brute: reachabilityQueriesBrute, small: (round) => { const n = 2 + (round % 7); return [n, randomDigraph(14200 + round, n, Math.min(n * (n - 1), 1 + (round % 12)), 0.3), randomQueries(14300 + round, n, 6)]; },
      reference: book("17.1", "Kosaraju's algorithm"),
      presets: { "CSES sample": { a: 4, b: SAMPLE_QUERY_GRAPH, c: [[1, 3], [1, 4], [4, 1]], directed: true }, "one edge": { a: 3, b: [[1, 2]], c: [[1, 1], [2, 1], [1, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("ignores-direction", "Roads here are one-way: being in the same undirected piece does not mean b can be reached from a.", function reachabilityQueries(n, edges, queries) { const parent = []; for (let v = 0; v <= n; v += 1) parent.push(v); const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }; for (let i = 0; i < edges.length; i += 1) parent[find(edges[i][0])] = find(edges[i][1]); return queries.map((q) => find(q[0]) === find(q[1])); }),
        diagnosis("same-kingdom-only", "Different kingdoms can still be connected one way; follow the condensed edges downstream from a's kingdom.", function reachabilityQueries(n, edges, queries) { const label = planetsAndKingdoms(n, edges); return queries.map((q) => label[q[0] - 1] === label[q[1] - 1]); }),
      ],
      hints: ["label[v − 1] numbers the kingdoms in topological order, so every edge between kingdoms runs from a smaller label to a larger one.", "Group the queries by the slab (2048 labels) of their target's kingdom; for each slab sweep the kingdoms from the largest label down, OR-ing children.", "A query is YES when bit label(b) − base is set in the words of label(a)."],
      cases: [
        example([4, SAMPLE_QUERY_GRAPH, [[1, 3], [1, 4], [4, 1]]], [true, false, true], "CSES sample"),
        example([3, [[1, 2]], [[1, 1], [2, 1], [1, 2]]], [true, false, true], "a node reaches itself, edges are one-way"),
        run(reachabilityQueries, [7, randomDigraph(14000, 7, 12, 0.3), randomQueries(14100, 7, 8)], "seven nodes"),
        hidden("n = 4·10⁴, m = 8·10⁴, q = 10⁵ (CSES allows 5·10⁴ and 10⁵), time limit", () => [40000].concat(DIGRAPH_BIG())),
      ],
    },
    {
      id: "treap-merge", title: "Treap Merge", cses: { id: 2072, name: "Cut and Paste (brick)" },
      goal: "Merge two treaps, every value of a coming before every value of b, keeping the larger priority on top; return the new root. A node is { value, priority, size, sum, flip, left, right }.",
      concept: "A treap is a binary tree ordered by position (its in-order walk is the sequence) and heap-ordered by random priorities, which keeps it about 2·ln n deep. Merging compares the two roots: the larger priority stays on top, so either a's root keeps its left subtree and takes merge(a.right, b) on the right, or b's root keeps its right subtree and takes merge(a, b.left) on the left. Every node carries the size and sum of its subtree, refreshed on the way back up, and a pending flip that has to be pushed to the children before you walk into them.",
      functionName: "treapMerge", signature: "treapMerge(a, b) → root",
      starterSource: starter("treapMerge", "a, b", "If either is null return the other. Larger priority on top; push the flip before descending, recompute size and sum after."),
      solve: treapMerge, comparator: "deep", allowMutation: true, accept: treapMergeAccept, check: viaBrute(treapMergeAccept, treapMergeBrute), small: (round) => [smallTreap(14600 + round, round % 7, 0), smallTreap(14700 + round, (round * 3) % 8, 100)],
      reference: site("cp-algorithms · Treap", CP + "data_structures/treap.html"),
      presets: { "two small treaps": { a: treapOf([1, 2, 3], [20, 50, 10]), b: treapOf([4, 5], [40, 30]) }, "right root on top": { a: treapOf([1, 2], [5, 3]), b: treapOf([3, 4], [9, 1]) }, "a pending flip": { a: flippedTreap([1, 2, 3], [3, 9, 1]), b: treapOf([4], [5]) } },
      scene: { kind: "algo", view: "treap", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("no-size-update", "After relinking a child the node's size and sum describe its old subtree; pull them up to date on the way back.", treapMerge, [["x.right = merge(x.right, y); pull(x);", "x.right = merge(x.right, y);"], ["y.left = merge(x, y.left); pull(y);", "y.left = merge(x, y.left);"]]),
        variant("smaller-priority-on-top", "The heap keeps the larger priority on top; putting the smaller one there breaks the order every later split relies on.", treapMerge, [["if (x.priority > y.priority)", "if (x.priority < y.priority)"]]),
      ],
      hints: ["if (!a) return b; if (!b) return a;", "If a.priority > b.priority: push(a), a.right = treapMerge(a.right, b), pull(a), return a. Otherwise push(b), b.left = treapMerge(a, b.left), pull(b), return b.", "push swaps left and right when flip is set and toggles the children's flips; pull sets size = 1 + the children's sizes and sum = value + their sums."],
      cases: [
        run(treapMerge, [treapOf([1, 2, 3], [20, 50, 10]), treapOf([4, 5], [40, 30])], "two small treaps"),
        run(treapMerge, [null, treapOf([7], [1])], "merging with an empty treap"),
        run(treapMerge, [treapOf([1, 2], [5, 3]), treapOf([3, 4], [9, 1])], "the right root goes on top"),
        run(treapMerge, [flippedTreap([1, 2, 3], [3, 9, 1]), treapOf([4], [5])], "a pending flip is pushed first"),
        run(treapMerge, [smallTreap(14400, 12, 0), smallTreap(14500, 9, 100)], "twelve and nine nodes"),
      ],
    },
    {
      id: "treap-split", title: "Treap Split", cses: { id: 2072, name: "Cut and Paste (brick)" },
      goal: "Split a treap into [left, right] where left holds the first k values; return both roots.",
      concept: "Walk down from the root. If the left subtree already holds at least k values, the root and its right subtree belong to the right part: split the left subtree and hang its right piece under the root. Otherwise the root goes left, and you split its right subtree for the k − size(left) − 1 values still missing. Push the flip before looking at the children and pull after relinking.",
      functionName: "treapSplit", signature: "treapSplit(root, k) → [left, right]",
      starterSource: starter("treapSplit", "root, k", "Null gives [null, null]. Push, then compare size(root.left) with k and recurse into one side, relinking and pulling on the way back."),
      solve: treapSplit, comparator: "deep", allowMutation: true, accept: treapSplitAccept, check: viaBrute(treapSplitAccept, treapSplitBrute), small: (round) => { const size = round % 9; return [smallTreap(14800 + round, size, 0), round % (size + 1)]; },
      reference: site("cp-algorithms · Treap", CP + "data_structures/treap.html"),
      presets: { "first two values": { a: treapOf([1, 2, 3, 4, 5], [20, 50, 10, 40, 30]), b: 2 }, "k = 0": { a: treapOf([1, 2, 3], [2, 3, 1]), b: 0 }, "a pending flip": { a: flippedTreap([1, 2, 3, 4], [3, 9, 1, 5]), b: 1 } },
      scene: { kind: "algo", view: "treap", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("off-by-one", "When the left subtree holds exactly k values the root already belongs to the right part; the test is size(left) ≥ k.", treapSplit, [["if (size(t.left) >= count)", "if (size(t.left) > count)"]]),
        variant("no-pull", "Relinking a child changes the subtree; recompute size and sum before returning the node.", treapSplit, [["t.left = parts[1]; pull(t);", "t.left = parts[1];"], ["t.right = parts[0]; pull(t);", "t.right = parts[0];"]]),
      ],
      hints: ["if (!root) return [null, null]; push(root) first.", "If size(root.left) ≥ k: [l, r] = treapSplit(root.left, k); root.left = r; pull(root); return [l, root].", "Otherwise [l, r] = treapSplit(root.right, k − size(root.left) − 1); root.right = l; pull(root); return [root, r]."],
      cases: [
        run(treapSplit, [treapOf([1, 2, 3, 4, 5], [20, 50, 10, 40, 30]), 2], "first two values"),
        run(treapSplit, [treapOf([1, 2, 3], [2, 3, 1]), 0], "k = 0 leaves everything on the right"),
        run(treapSplit, [treapOf([1, 2, 3], [2, 3, 1]), 3], "k = size leaves everything on the left"),
        run(treapSplit, [flippedTreap([1, 2, 3, 4], [3, 9, 1, 5]), 1], "a pending flip is pushed first"),
        run(treapSplit, [smallTreap(14900, 15, 0), 7], "fifteen nodes"),
      ],
    },
    {
      id: "cut-and-paste", title: "Cut and Paste", cses: { id: 2072, name: "Cut and Paste" },
      goal: "Apply every [a, b] 'cut the substring a..b and paste it at the end' to s and return the final string.",
      concept: "In an implicit treap a string is addressed by position: splitting at a − 1 and then at b − a + 1 gives the three pieces left, middle and right in O(log n), and merging them back as left + right + middle is the whole operation. Build the treap by merging one node per character with random priorities, and read the final string with an in-order walk.",
      functionName: "cutAndPaste", signature: "cutAndPaste(s, ops) → string",
      starterSource: starter("cutAndPaste", "s, ops", "One node per character merged onto the root; per operation split at a − 1 and b − a + 1, then merge left + right + middle."),
      solve: cutAndPaste, comparator: "scalar", dependencies: ["treap-merge", "treap-split"], brute: cutAndPasteBrute, small: (round) => { const n = 1 + (round % 9); return [randomLetters(15000 + round, n, 4), rangeOps(15100 + round, n, 1 + (round % 6))]; },
      reference: site("cp-algorithms · Implicit treap", CP + "data_structures/treap.html"),
      presets: { "CSES sample": { a: "AYBABTU", b: [[3, 5], [3, 5]] }, "first letter": { a: "ABC", b: [[1, 1]] }, "three cuts": { a: "TREAPS", b: [[2, 3], [1, 2], [4, 6]] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("pastes-at-the-front", "The cut piece goes to the end: merge left and right first, then the middle.", cutAndPaste, [["root = treapMerge(treapMerge(outer[0], inner[1]), inner[0]);", "root = treapMerge(inner[0], treapMerge(outer[0], inner[1]));"]]),
        variant("cuts-one-short", "a..b holds b − a + 1 characters, both ends included.", cutAndPaste, [["treapSplit(outer[1], b - a + 1)", "treapSplit(outer[1], b - a)"]]),
      ],
      hints: ["Node per character: { value: code, priority: Math.random(), size: 1, sum: code, flip: false, left: null, right: null }, merged onto the root one by one.", "[left, rest] = treapSplit(root, a − 1); [middle, right] = treapSplit(rest, b − a + 1).", "root = treapMerge(treapMerge(left, right), middle); at the end walk in order and String.fromCharCode the values."],
      cases: [
        example(["AYBABTU", [[3, 5], [3, 5]]], "AYABTUB", "CSES sample"),
        example(["ABC", [[1, 1]]], "BCA", "cut the first letter"),
        example(["ABC", [[1, 3]]], "ABC", "cutting everything changes nothing"),
        run(cutAndPaste, [randomLetters(15200, 12, 4), rangeOps(15300, 12, 6)], "twelve letters, six cuts"),
        hidden("n = m = 5·10⁴ (CSES allows 2·10⁵), time limit", () => [LETTERS_LONG(), CUTS_BIG()]),
      ],
    },
    {
      id: "substring-reversals", title: "Substring Reversals", cses: { id: 2073, name: "Substring Reversals" },
      goal: "Apply every [a, b] 'reverse the substring a..b' to s and return the final string.",
      concept: "Reverse a whole piece of the treap lazily: split out the middle piece and toggle its flip flag, which is O(1), then merge back. The flag means 'this subtree is stored mirrored'; the bricks push it down, swapping the children and toggling theirs, whenever they walk through, so later splits still count positions correctly. The final in-order walk has to honour the flags too.",
      functionName: "substringReversals", signature: "substringReversals(s, ops) → string",
      starterSource: starter("substringReversals", "s, ops", "Split into left, middle, right; toggle middle.flip; merge back. Read the result in order, honouring flips."),
      solve: substringReversals, comparator: "scalar", dependencies: ["treap-merge", "treap-split"], brute: substringReversalsBrute, small: (round) => { const n = 1 + (round % 9); return [randomLetters(15400 + round, n, 4), rangeOps(15500 + round, n, 1 + (round % 6))]; },
      reference: site("cp-algorithms · Implicit treap, reversals", CP + "data_structures/treap.html"),
      presets: { "CSES sample": { a: "AYBABTU", b: [[3, 4], [4, 7]] }, "reverse everything": { a: "ABCD", b: [[1, 4]] }, overlapping: { a: "ABCDE", b: [[1, 3], [2, 5]] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("reverses-to-the-end", "Only a..b is reversed; take b − a + 1 characters for the middle piece, not the whole rest of the string.", substringReversals, [["const inner = treapSplit(outer[1], b - a + 1);", "const inner = treapSplit(outer[1], outer[1].size);"]]),
        variant("reverses-one-short", "a..b holds b − a + 1 characters, both ends included.", substringReversals, [["treapSplit(outer[1], b - a + 1)", "treapSplit(outer[1], Math.max(1, b - a))"]]),
      ],
      hints: ["Split into left, middle and right exactly as in Cut and Paste.", "middle.flip = !middle.flip, then root = treapMerge(treapMerge(left, middle), right).", "Read the result in order, visiting the right child first inside any subtree whose accumulated flip is odd (or push every flag on the way down)."],
      cases: [
        example(["AYBABTU", [[3, 4], [4, 7]]], "AYAUTBB", "CSES sample"),
        example(["ABCD", [[1, 4]]], "DCBA", "reverse everything"),
        example(["ABCD", [[2, 2]]], "ABCD", "a single letter stays"),
        example(["ABCDE", [[1, 3], [2, 5]]], "CEDAB", "two overlapping reversals"),
        run(substringReversals, [randomLetters(15600, 12, 4), rangeOps(15700, 12, 6)], "twelve letters, six reversals"),
        hidden("n = m = 5·10⁴ (CSES allows 2·10⁵), time limit", () => [LETTERS_LONG(), REVERSALS_BIG()]),
      ],
    },
    {
      id: "reversals-and-sums", title: "Reversals and Sums", cses: { id: 2074, name: "Reversals and Sums" },
      goal: "Process [1, a, b] 'reverse a..b' and [2, a, b] 'sum of a..b'; return the sums in order.",
      concept: "The same split, flip and merge as Substring Reversals, but every node also keeps the sum of its subtree. A reversal does not change a sum, so a flipped piece's sum is still right, and a sum question is just the middle piece's root.sum after the two splits.",
      functionName: "reversalsAndSums", signature: "reversalsAndSums(values, ops) → sums",
      starterSource: starter("reversalsAndSums", "values, ops", "Treap over the values; split into three pieces; type 1 toggles middle.flip, type 2 records middle.sum; merge back."),
      solve: reversalsAndSums, comparator: "deep", dependencies: ["treap-merge", "treap-split"], brute: reversalsAndSumsBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(15800 + round, n, 0, 9), rangeOps(15900 + round, n, 1 + (round % 8), [1, 2])]; },
      reference: site("cp-algorithms · Implicit treap", CP + "data_structures/treap.html"),
      presets: { "CSES sample": { a: [2, 1, 3, 4, 5, 3, 4, 4], b: [[2, 2, 4], [1, 3, 6], [2, 2, 4]] }, "last value first": { a: [5, 1, 2], b: [[2, 1, 1], [1, 1, 3], [2, 1, 1]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("sums-the-original-array", "Reversals move values around, so prefix sums of the starting array go stale after the first one.", function reversalsAndSums(values, ops) { const prefix = [0]; for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] + values[i]); const out = []; for (let i = 0; i < ops.length; i += 1) if (ops[i][0] === 2) out.push(prefix[ops[i][2]] - prefix[ops[i][1] - 1]); return out; }),
        variant("sum-one-short", "a..b holds b − a + 1 values, both ends included.", reversalsAndSums, [["const inner = treapSplit(outer[1], b - a + 1);", "const inner = treapSplit(outer[1], type === 2 ? Math.max(1, b - a) : b - a + 1);"]]),
      ],
      hints: ["Build the treap from the values; each node's sum starts as its value.", "Split into left, middle (b − a + 1 values) and right. Type 1: toggle middle.flip. Type 2: record middle.sum.", "Merge the three pieces back in order after every operation."],
      cases: [
        example([[2, 1, 3, 4, 5, 3, 4, 4], [[2, 2, 4], [1, 3, 6], [2, 2, 4]]], [8, 9], "CSES sample"),
        example([[5, 1, 2], [[2, 1, 1], [1, 1, 3], [2, 1, 1]]], [5, 2], "a reversal moves the last value first"),
        example([[1, 2, 3], [[1, 1, 3], [1, 1, 3], [2, 1, 2]]], [3], "two reversals cancel"),
        run(reversalsAndSums, [smallList(16000, 12, 0, 20), rangeOps(16100, 12, 10, [1, 2])], "twelve values, ten operations"),
        hidden("n = 10⁵, m = 5·10⁴ (CSES allows 2·10⁵ and 10⁵), time limit", () => [SUM_VALUES_BIG(), SUM_OPS_BIG()]),
      ],
    },
    {
      id: "low-link", title: "Low-Link Values", cses: { id: 2076, name: "Necessary Roads (brick)" },
      goal: "Depth-first search the graph and return { tin, low, parentEdge }: entry times, low values and the index of the edge each node was entered by (−1 for a root), one entry per node.",
      concept: "Number the nodes in DFS order (tin). low[v] is the smallest tin reachable from v's subtree using tree edges downward and at most one back edge upward, never the tree edge back to the parent itself. A subtree that cannot climb above v's parent hangs on a single edge, a bridge; a node whose child subtree cannot climb above it cuts that subtree off, an articulation point. The exact numbers depend on the order: start at node 1 (then any unvisited node in increasing order), visit neighbours in the order their edges appear in the input, and count tin from 0. An explicit stack keeps 10⁵ nodes safe from recursion limits.",
      functionName: "lowLink", signature: "lowLink(n, edges) → { tin, low, parentEdge }",
      starterSource: starter("lowLink", "n, edges", "Iterative DFS with an edge pointer per node; skip the parent edge by index; low[v] = min over back edges' tin and the children's low."),
      solve: lowLink, comparator: "deep", brute: lowLinkBrute, small: (round) => { const n = 1 + (round % 8); return [n, randomSimpleGraph(16200 + round, n, round % 11)]; },
      reference: site("cp-algorithms · Finding bridges", CP + "graph/bridge-searching.html"),
      presets: { "Necessary Roads sample": { a: 5, b: SAMPLE_ROADS }, "a triangle": { a: 3, b: [[1, 2], [2, 3], [3, 1]] }, "a path": { a: 4, b: [[1, 2], [2, 3], [3, 4]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("climbs-back-over-the-parent-edge", "The tree edge to the parent is not a back edge; using it makes every low value reach the parent and hides every bridge.", lowLink, [["if (e === parentEdge[v]) continue;", ""]]),
        variant("keeps-low-local", "A node can climb through any descendant's back edge, so fold each finished child's low into its parent.", lowLink, [["if (stack.length) { const p = stack[stack.length - 1]; if (low[v] < low[p]) low[p] = low[v]; }", ""]]),
      ],
      hints: ["Adjacency in input order, storing (neighbour, edge index). tin = low = −1 and parentEdge = −1; a node is visited once tin ≥ 0.", "On edge e from v to u: skip it when e === parentEdge[v]; if u is new set tin[u] = low[u] = timer++, parentEdge[u] = e and go down; otherwise low[v] = min(low[v], tin[u]).", "When v is finished, fold it into its parent: low[p] = min(low[p], low[v]). Return the arrays without the unused index 0."],
      cases: [
        run(lowLink, [5, SAMPLE_ROADS], "the Necessary Roads sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], { tin: [0, 1, 2], low: [0, 0, 0], parentEdge: [-1, 0, 1] }, "a triangle"),
        example([4, [[1, 2], [2, 3], [3, 4]]], { tin: [0, 1, 2, 3], low: [0, 1, 2, 3], parentEdge: [-1, 0, 1, 2] }, "a path"),
        run(lowLink, [9, connectedGraph(16300, 9, 13, 9)], "nine cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, LINK_GRAPH_BIG()]),
      ],
    },
    {
      id: "necessary-roads", title: "Necessary Roads", cses: { id: 2076, name: "Necessary Roads" },
      goal: "Every road whose removal disconnects some pair of cities (the bridges), in any order.",
      concept: "A tree edge p → v is a bridge exactly when nothing in v's subtree has a back edge climbing to p or above: low[v] > tin[p], which is the same as low[v] = tin[v]. A back edge is never a bridge because it sits on a cycle. One low-link pass finds them all in O(n + m).",
      functionName: "necessaryRoads", signature: "necessaryRoads(n, edges) → roads",
      starterSource: starter("necessaryRoads", "n, edges", "link = lowLink(n, edges); keep the entering edge of every node whose low equals its tin."),
      solve: necessaryRoads, comparator: "deep", dependencies: ["low-link"], accept: edgeSetAccept, check: viaBrute(edgeSetAccept, necessaryRoadsBrute), small: (round) => { const n = 2 + (round % 7); return [n, connectedGraph(16400 + round, n, n - 1 + (round % 5), n)]; },
      reference: site("cp-algorithms · Finding bridges", CP + "graph/bridge-searching.html"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_ROADS }, "a cycle": { a: 3, b: [[1, 2], [2, 3], [3, 1]] }, "a path": { a: 4, b: [[1, 2], [2, 3], [3, 4]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("every-tree-edge", "A tree edge whose subtree has a back edge above it sits on a cycle; only the ones with low[v] = tin[v] are necessary.", necessaryRoads, [["if (e >= 0 && link.low[v - 1] === link.tin[v - 1])", "if (e >= 0)"]]),
        variant("cut-city-test", "low[v] ≥ tin[p] is the test for cities; a back edge landing on p itself already saves the road, so roads need low[v] > tin[p].", necessaryRoads, [["if (e >= 0 && link.low[v - 1] === link.tin[v - 1])", "if (e >= 0 && link.low[v - 1] >= link.tin[(edges[e][0] === v ? edges[e][1] : edges[e][0]) - 1])"]]),
      ],
      hints: ["link = lowLink(n, edges).", "For every node v with parentEdge[v − 1] ≥ 0, the road edges[parentEdge[v − 1]] is necessary when low[v − 1] === tin[v − 1].", "Return those roads as [a, b]; the order does not matter."],
      cases: [
        example([5, SAMPLE_ROADS], [[3, 5], [4, 5]], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], [], "a cycle has no necessary road"),
        example([4, [[1, 2], [2, 3], [3, 4]]], [[1, 2], [2, 3], [3, 4]], "every road of a path"),
        example([4, [[1, 2], [2, 3], [3, 1], [3, 4]]], [[3, 4]], "a triangle with a tail"),
        run(necessaryRoads, [9, connectedGraph(16500, 9, 12, 6)], "nine cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, LINK_GRAPH_BIG()]),
      ],
    },
    {
      id: "necessary-cities", title: "Necessary Cities", cses: { id: 2077, name: "Necessary Cities" },
      goal: "Every city whose removal disconnects the remaining cities (the articulation points), in any order.",
      concept: "A non-root node p is a cut city when some child v cannot climb above p: low[v] ≥ tin[p]. It is ≥ here, because a back edge landing exactly on p does not help once p itself is gone. The root is special, having no ancestor to climb to: it is a cut city exactly when it has two or more DFS children.",
      functionName: "necessaryCities", signature: "necessaryCities(n, edges) → cities",
      starterSource: starter("necessaryCities", "n, edges", "link = lowLink(n, edges); for each tree edge p → v test low[v] ≥ tin[p] (not for the root); the root needs two children."),
      solve: necessaryCities, comparator: "deep", dependencies: ["low-link"], accept: nodeSetAccept, check: viaBrute(nodeSetAccept, necessaryCitiesBrute), small: (round) => { const n = 2 + (round % 7); return [n, connectedGraph(16600 + round, n, n - 1 + (round % 5), n)]; },
      reference: site("cp-algorithms · Articulation points", CP + "graph/cutpoints.html"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_ROADS }, "a star": { a: 3, b: [[1, 2], [1, 3]] }, "a cycle hanging off 2": { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 2]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("root-tested-like-the-rest", "The root has nothing above it, so low ≥ tin always holds there; the root is a cut city only with two or more children.", necessaryCities, [["if (link.parentEdge[p - 1] >= 0 && link.low[v - 1] >= link.tin[p - 1]) cut[p] = true;", "if (link.low[v - 1] >= link.tin[p - 1]) cut[p] = true;"]]),
        variant("strict-low-test", "A back edge that lands on p itself is useless once p is removed, so the test is low[v] ≥ tin[p].", necessaryCities, [["link.low[v - 1] >= link.tin[p - 1]", "link.low[v - 1] > link.tin[p - 1]"]]),
      ],
      hints: ["link = lowLink(n, edges); for each v with a parent edge, its parent p is the other end of that edge.", "Count every node's children; mark p when p is not the root and low[v − 1] ≥ tin[p − 1].", "The root (parentEdge −1) is a cut city only with at least two children."],
      cases: [
        example([5, SAMPLE_ROADS], [4, 5], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], [], "a triangle survives losing any one city"),
        example([3, [[1, 2], [1, 3]]], [1], "the centre of a star"),
        example([4, [[1, 2], [2, 3], [3, 4], [4, 2]]], [2], "a cycle hanging off city 2"),
        run(necessaryCities, [9, connectedGraph(16700, 9, 12, 6)], "nine cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, LINK_GRAPH_BIG()]),
      ],
    },
    {
      id: "eulerian-subgraphs", title: "Eulerian Subgraphs", cses: { id: 2078, name: "Eulerian Subgraphs" },
      goal: "The number of edge subsets in which every node has even degree, modulo 10⁹ + 7.",
      concept: "Even-degree edge sets are exactly the sets you get by xoring cycles together, so they form a vector space over GF(2), the cycle space. Take a spanning forest: every non-forest edge closes exactly one cycle, and those m − n + c cycles are independent and span everything, where c counts the connected components. So the answer is 2^(m − n + c), and c is one union-find pass.",
      functionName: "eulerianSubgraphs", signature: "eulerianSubgraphs(n, edges) → count",
      starterSource: starter("eulerianSubgraphs", "n, edges", "Count components with dsuUnion; the answer is modPow(2, m − n + components, 10⁹ + 7)."),
      solve: eulerianSubgraphs, comparator: "scalar", dependencies: ["dsu-union", "mod-pow"], brute: eulerianSubgraphsBrute, small: (round) => { const n = 1 + (round % 6); return [n, randomSimpleGraph(16800 + round, n, round % 9)]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [1, 3], [2, 3]] }, "two triangles on an edge": { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 1], [1, 3]] }, "two separate triangles": { a: 6, b: [[1, 2], [2, 3], [3, 1], [4, 5], [5, 6], [6, 4]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("one-component-assumed", "Each connected piece has its own spanning tree, so the exponent is m − n + c, not m − n + 1.", eulerianSubgraphs, [["edges.length - n + components", "edges.length - n + 1"]]),
        variant("counts-cycles", "m − n + c is the number of independent cycles; every subset of them gives a different Eulerian subgraph, so the answer is 2 to that power.", eulerianSubgraphs, [["return modPow(2, edges.length - n + components, 1000000007);", "return edges.length - n + components;"]]),
      ],
      hints: ["parent[v] = v and size[v] = 1 for v = 0 … n; components = n.", "dsuUnion(parent, size, a, b) returns 0 when a and b were already joined; otherwise there is one component fewer.", "Return modPow(2, m − n + components, 1000000007)."],
      cases: [
        example([4, [[1, 2], [1, 3], [2, 3]]], 2, "CSES sample"),
        example([3, []], 1, "no edges: only the empty subgraph"),
        example([4, [[1, 2], [2, 3], [3, 4], [4, 1], [1, 3]]], 4, "two triangles sharing an edge"),
        example([6, [[1, 2], [2, 3], [3, 1], [4, 5], [5, 6], [6, 4]]], 4, "two separate triangles"),
        run(eulerianSubgraphs, [10, randomSimpleGraph(16900, 10, 16)], "ten nodes"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, EULER_GRAPH_BIG()]),
      ],
    },
    {
      id: "monster-game-i", title: "Monster Game I", cses: { id: 2084, name: "Monster Game I" },
      goal: "The minimum total time to win: killing monster i costs s_i times your current skill factor, a kill replaces the factor by f_i, and the last monster must be killed. Strengths rise and factors fall along the levels.",
      concept: "best[i] = min over the last kill j before i of best[j] + s_i · f_j, with f of 'no kill yet' being x. Each earlier kill is a line y = f_j · s + best[j], and best[i] is the lowest line at s = s_i: a convex hull trick. Here slopes only fall and queries only rise, so a deque suffices: drop lines from the front once the next one is lower at the current s, and before adding a line drop from the back any line that can never be lowest. That test multiplies differences up to 10¹² by differences up to 10⁶, past 2⁵³, so it runs on BigInt.",
      functionName: "monsterGameI", signature: "monsterGameI(x, strengths, factors) → time",
      starterSource: starter("monsterGameI", "x, strengths, factors", "Lines (slope f, intercept best) in a deque: pop the front while the next line is lower at s_i; add (f_i, best_i) after popping useless lines from the back."),
      solve: monsterGameI, comparator: "scalar", brute: monsterGameBrute, small: (round) => monsterInput(17000 + round, 1 + (round % 9), true),
      reference: site("cp-algorithms · Convex hull trick", CP + "geometry/convex_hull_trick.html"),
      presets: { "CSES sample": { a: [20, 30, 30, 50, 90], b: [90, 60, 20, 20, 10], c: 100 }, "one level": { a: [7], b: [3], c: 5 }, "upgrade early": { a: [1, 100, 100], b: [1, 1, 1], c: 50 } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("kills-every-monster", "Escaping is allowed on every level but the last; only the kills that pay for themselves should happen.", function monsterGameI(x, strengths, factors) { let factor = x, total = 0; for (let i = 0; i < strengths.length; i += 1) { total += strengths[i] * factor; factor = factors[i]; } return total; }),
        diagnosis("never-upgrades", "Killing an earlier monster can pay for itself: its new factor makes every later kill cheaper.", function monsterGameI(x, strengths, factors) { return strengths[strengths.length - 1] * x; }),
      ],
      hints: ["Keep the lines as parallel arrays slopes = [x] and intercepts = [0] with a head index for the front.", "For s = strengths[i]: while the line after head is at least as low at s, head += 1; best = slopes[head] · s + intercepts[head].", "Add (factors[i], best): with a, b the last two lines and c the new one, drop b while (c.b − a.b)(a.m − b.m) ≤ (b.b − a.b)(a.m − c.m), computed on BigInt."],
      cases: [
        example([100, [20, 30, 30, 50, 90], [90, 60, 20, 20, 10]], 4800, "CSES sample"),
        example([5, [7], [3]], 35, "one level: the final monster at the start factor"),
        example([50, [1, 100, 100], [1, 1, 1]], 150, "a cheap early kill pays off"),
        run(monsterGameI, monsterInput(17100, 12, true), "twelve levels"),
        hidden("n = 2·10⁵, time limit", () => MONSTER_SORTED()),
      ],
    },
    {
      id: "monster-game-ii", title: "Monster Game II", cses: { id: 2085, name: "Monster Game II" },
      goal: "Monster Game I without the ordering: strengths and factors can be anything, and the minimum total time to win is still wanted.",
      concept: "The recurrence is the same, best[i] = min over j of best[j] + s_i · f_j, but slopes and queries now arrive in any order, so the deque's two shortcuts are gone. A Li Chao tree over s = 0 … 2²⁰ − 1 takes lines in any order and answers any query in O(log C). The geometry brick keeps maxima, so store every line negated, y = −f · s − best, and negate what the query returns.",
      functionName: "monsterGameII", signature: "monsterGameII(x, strengths, factors) → time",
      starterSource: starter("monsterGameII", "x, strengths, factors", "Li Chao tree of size 2²⁰: insert (−x, 0); for each level query at s_i, negate, then insert (−f_i, −best)."),
      solve: monsterGameII, comparator: "scalar", dependencies: ["li-chao-insert", "li-chao-query"], brute: monsterGameBrute, small: (round) => monsterInput(17200 + round, 1 + (round % 9), false),
      reference: site("cp-algorithms · Li Chao tree", CP + "geometry/convex_hull_trick.html"),
      presets: { "CSES sample": { a: [50, 20, 30, 90, 30], b: [60, 20, 20, 10, 90], c: 100 }, "one level": { a: [7], b: [3], c: 5 }, unsorted: { a: [9, 1, 8], b: [1, 5, 2], c: 10 } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("assumes-sorted-input", "The deque of Monster Game I relies on falling factors and rising strengths; here they come in any order, so use the Li Chao tree.", monsterGameI, [["function monsterGameI(", "function monsterGameII("]]),
        diagnosis("never-upgrades", "Killing an earlier monster can pay for itself: its new factor makes every later kill cheaper.", function monsterGameII(x, strengths, factors) { return strengths[strengths.length - 1] * x; }),
      ],
      hints: ["size = 1 << 20 covers every strength up to 10⁶; tree = new Array(2 · size).fill(null).", "liChaoInsert(tree, 1, 0, size − 1, −x, 0) is the 'no kill yet' line.", "For level i: best = −liChaoQuery(tree, size, s_i); unless it is the last level, liChaoInsert(tree, 1, 0, size − 1, −f_i, −best)."],
      cases: [
        example([100, [50, 20, 30, 90, 30], [60, 20, 20, 10, 90]], 2600, "CSES sample"),
        example([5, [7], [3]], 35, "one level"),
        run(monsterGameII, [10, [9, 1, 8], [1, 5, 2]], "strengths out of order"),
        run(monsterGameII, monsterInput(17300, 12, false), "twelve levels"),
        hidden("n = 2·10⁵, time limit", () => MONSTER_FREE()),
      ],
    },
    {
      id: "subarray-squares", title: "Subarray Squares", cses: { id: 2086, name: "Subarray Squares" },
      goal: "Divide the array into k contiguous parts to minimise the sum of the squares of the part sums; return the minimum as a decimal string, since it can pass 2⁵³.",
      concept: "cost_k[i] = min over j of cost_{k−1}[j] + (P[i] − P[j])² is O(k n²) done directly. The best split j only moves right as i grows, so divide and conquer: solve the middle i by scanning its allowed range of j, then the left half of the i's only needs j up to that best split and the right half only from it. That is O(k n log n). With values up to 10⁵ the whole-array cost reaches 9·10¹⁶, so when the total squared passes 2⁵³ the same code runs on BigInt.",
      functionName: "subarraySquares", signature: "subarraySquares(values, k) → string",
      starterSource: starter("subarraySquares", "values, k", "Layer by layer: solve(lo, hi, optLo, optHi) fills the middle i from j in [optLo, min(mid − 1, optHi)] and recurses on both halves with the best j as a bound."),
      solve: subarraySquares, comparator: "scalar", brute: subarraySquaresBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(17400 + round, n, 1, round % 3 === 0 ? 100000 : 9), 1 + (round % n)]; },
      reference: site("cp-algorithms · Divide and conquer DP", CP + "dynamic_programming/divide-and-conquer-dp.html"),
      presets: { "CSES sample": { a: [2, 3, 1, 2, 2, 3, 4, 1], b: 3 }, "one part": { a: [1, 2, 3], b: 1 }, "every value alone": { a: [4, 1, 3], b: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("equal-lengths", "Parts of equal length are not parts of equal sum; the best cuts depend on the values.", function subarraySquares(values, k) { const n = values.length; let total = 0n, start = 0; for (let part = 0; part < k; part += 1) { const end = Math.round((part + 1) * n / k); let sum = 0n; for (let i = start; i < end; i += 1) sum += BigInt(values[i]); total += sum * sum; start = end; } return String(total); }),
        variant("one-cut-too-many", "k parts need k − 1 cuts; the layers run from 2 up to k, not k + 1.", subarraySquares, [["layer <= k;", "layer <= Math.min(k + 1, n);"]]),
      ],
      hints: ["prefix[i] = sum of the first i values; the first layer is prefix[i]².", "For layers 2 … k: solve(lo, hi, optLo, optHi) with mid = (lo + hi) >> 1 scans j from optLo to min(mid − 1, optHi), keeps the best j, and recurses on (lo, mid − 1, optLo, best) and (mid + 1, hi, best, optHi).", "If total² > 2⁵³ − 1 run the same arithmetic on BigInt (prefix sums, squares and costs); return String of the answer."],
      cases: [
        example([[2, 3, 1, 2, 2, 3, 4, 1], 3], "110", "CSES sample"),
        example([[1, 2, 3], 1], "36", "one part is the whole sum squared"),
        example([[4, 1, 3], 3], "26", "k = n puts every value alone"),
        example([[100000, 100000, 100000], 1], "90000000000", "big values"),
        run(subarraySquares, [[5, 1, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9], 4], "twelve values in four parts"),
        hidden("n = 3000, k = 60, values up to 3·10⁴, time limit", () => [SQUARES_MID(), 60]),
        hidden("n = 3000, k = 2, values up to 10⁵: the cost passes 2⁵³", () => [SQUARES_HUGE(), 2]),
      ],
    },
    {
      id: "houses-and-schools", title: "Houses and Schools", cses: { id: 2087, name: "Houses and Schools" },
      goal: "Place k schools in houses on a street to minimise the total walking distance of all children, each walking to the nearest school.",
      concept: "Children walking to their nearest school split the street into k contiguous groups, one school each. A group l..r does best with its school at the weighted median, and prefix sums of c_i and i · c_i give the group's cost in O(1) once the median is found by binary search. The layered recurrence has monotone best splits, so the same divide and conquer as Subarray Squares brings it to O(k n log² n).",
      functionName: "housesAndSchools", signature: "housesAndSchools(children, k) → distance",
      starterSource: starter("housesAndSchools", "children, k", "cost(l, r): school at the weighted median of l..r, priced with prefix sums of c and i·c; then divide and conquer over k layers."),
      solve: housesAndSchools, comparator: "scalar", brute: housesAndSchoolsBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(17500 + round, n, 1, round % 3 === 0 ? 1000000000 : 9), 1 + (round % n)]; },
      reference: site("cp-algorithms · Divide and conquer DP", CP + "dynamic_programming/divide-and-conquer-dp.html"),
      presets: { "CSES sample": { a: [2, 7, 1, 4, 6, 4], b: 2 }, "one school": { a: [1, 1, 1], b: 1 }, "a crowded end": { a: [1, 1, 1, 1, 50], b: 1 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("school-in-the-middle-house", "The best school spot is the weighted median of the children, not the middle house of the group.", housesAndSchools, [["const m = lo;", "const m = (l + r) >> 1;"]]),
        variant("counts-houses-not-children", "Every child walks, so a house's distance counts once per child living there.", housesAndSchools, [["const n = children.length;", "const n = children.length; children = children.map(() => 1);"]]),
      ],
      hints: ["count[i] and weight[i] are prefix sums of c and of i · c over houses 1 … i.", "cost(l, r): binary search the first m with 2 · (count[m] − count[l − 1]) ≥ count[r] − count[l − 1]; the cost is m·left − weightLeft + weightRight − m·right.", "previous[i] = cost(1, i); each further layer fills current[i] = min over j of previous[j] + cost(j + 1, i) with divide and conquer on the best j."],
      cases: [
        example([[2, 7, 1, 4, 6, 4], 2], 11, "CSES sample"),
        example([[1, 1, 1], 1], 2, "one school in the middle"),
        example([[1, 1, 1, 1, 50], 1], 10, "a crowded house pulls the school to it"),
        example([[5, 5], 2], 0, "a school in every house"),
        run(housesAndSchools, [[3, 9, 2, 7, 4, 8, 1, 6, 5, 10], 3], "ten houses, three schools"),
        hidden("n = 3000, k = 40 (CSES allows k up to n), time limit", () => [HOUSES_BIG(), 40]),
      ],
    },
    {
      id: "knuth-division", title: "Knuth Division", cses: { id: 2088, name: "Knuth Division" },
      goal: "Split the array into single elements, one split at a time, where splitting a piece costs its sum; return the minimum total cost.",
      concept: "Read backwards it is merging: dp[i][j] = sum(i, j) + min over m of dp[i][m] + dp[m + 1][j], an O(n³) interval DP. Knuth's observation: the best split point for i..j lies between the best splits for i..j − 1 and i + 1..j. Scanning only that window makes every diagonal cost O(n) in total, so the whole table is O(n²).",
      functionName: "knuthDivision", signature: "knuthDivision(values) → cost",
      starterSource: starter("knuthDivision", "values", "Interval DP by length; for i..j scan m from opt[i][j − 1] to opt[i + 1][j] only, and remember the best m in opt[i][j]."),
      solve: knuthDivision, comparator: "scalar", brute: knuthDivisionBrute, small: (round) => [smallList(17600 + round, 1 + (round % 9), 1, 9)],
      reference: site("cp-algorithms · Knuth's optimization", CP + "dynamic_programming/knuth-optimization.html"),
      presets: { "CSES sample": { a: [2, 7, 3, 2, 5] }, "two values": { a: [4, 6] }, lopsided: { a: [1, 1, 1, 9, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("free-last-splits", "Splitting a piece of two values still costs their sum; only single values are free.", knuthDivision, [["dp[i * n + j] = best + prefix[j + 1] - prefix[i];", "dp[i * n + j] = best + (length > 2 ? prefix[j + 1] - prefix[i] : 0);"]]),
        diagnosis("balances-the-halves", "Cutting where the two sums balance is a greedy guess; a lopsided array can do better by peeling off the heavy end first.", function knuthDivision(values) { const n = values.length; const prefix = [0]; for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]); const split = (i, j) => { if (i === j) return 0; let best = i, gap = Infinity; for (let m = i; m < j; m += 1) { const left = prefix[m + 1] - prefix[i], right = prefix[j + 1] - prefix[m + 1]; if (Math.abs(left - right) < gap) { gap = Math.abs(left - right); best = m; } } return prefix[j + 1] - prefix[i] + split(i, best) + split(best + 1, j); }; return split(0, n - 1); }),
      ],
      hints: ["prefix sums give sum(i, j) in O(1); dp[i][i] = 0 and opt[i][i] = i.", "For length 2 … n and every i with j = i + length − 1: scan m from opt[i][j − 1] to min(opt[i + 1][j], j − 1), minimising dp[i][m] + dp[m + 1][j].", "dp[i][j] = that minimum + sum(i, j) and opt[i][j] = the m that achieved it; the answer is dp[0][n − 1]."],
      cases: [
        example([[2, 7, 3, 2, 5]], 43, "CSES sample"),
        example([[4, 6]], 10, "two values: one split"),
        example([[7]], 0, "one value needs no split"),
        run(knuthDivision, [[1, 1, 1, 9, 1]], "a lopsided array"),
        run(knuthDivision, [[5, 1, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9]], "twelve values"),
        hidden("n = 2000 (CSES allows 5000), time limit", () => [KNUTH_BIG()]),
      ],
    },
    {
      id: "fft", title: "Fast Fourier Transform", cses: { id: 2111, name: "Apples and Bananas (brick)" },
      goal: "The discrete Fourier transform of the complex array re + i·im (length a power of two) as { re, im }; with invert the inverse transform, divided by the length. The forward transform uses e^(−2πi·jk/n).",
      concept: "A DFT of length n is two DFTs of length n/2, one over the even positions and one over the odd, glued with the twiddle factors e^(−2πik/n): X_k = E_k + w^k O_k and X_{k+n/2} = E_k − w^k O_k. Doing it bottom-up means first putting the input in bit-reversed order, then running butterflies of length 2, 4, 8 … in place. That is O(n log n) instead of O(n²), and the inverse is the same code with the conjugate angle and a division by n.",
      functionName: "fft", signature: "fft(re, im, invert) → { re, im }",
      starterSource: starter("fft", "re, im, invert", "Copy, bit-reverse the order, then butterflies of length 2, 4, … with angle ∓2π/length; divide by n when inverting."),
      solve: fft, comparator: "deep", accept: fftAccept, brute: fftBrute, small: (round) => { const size = 1 << (round % 5); return [smallList(17700 + round, size, -5, 9), smallList(17800 + round, size, -5, 9), round % 2 === 1]; },
      reference: site("cp-algorithms · Fast Fourier transform", CP + "algebra/fft.html"),
      presets: { "an impulse": { a: [1, 0, 0, 0], b: [0, 0, 0, 0], c: false }, "a constant": { a: [1, 1, 1, 1], b: [0, 0, 0, 0], c: false }, "back again": { a: [4, 0, 0, 0], b: [0, 0, 0, 0], c: true } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("no-bit-reversal", "The in-place butterflies expect the input in bit-reversed order; without the swaps the halves they combine are the wrong ones.", fft, [["if (i < j) {", "if (false) {"]]),
        variant("inverse-not-scaled", "The inverse transform returns n times the original until every entry is divided by n.", fft, [["if (invert) for (let i = 0; i < n; i += 1) { a[i] /= n; b[i] /= n; }", ""]]),
      ],
      hints: ["Copy re and im into Float64Arrays; swap a[i] with a[j] (and b) whenever i < j, where j is i with its log₂ n bits reversed.", "For length = 2, 4, … n: angle = (invert ? 2 : −2) · π / length; for each block and k < length/2, x = w^k · (a[q], b[q]) with q = p + length/2, then (p, q) ← (p + x, p − x).", "When inverting divide every entry by n; return { re: Array.from(a), im: Array.from(b) }."],
      cases: [
        example([[1, 0, 0, 0], [0, 0, 0, 0], false], { re: [1, 1, 1, 1], im: [0, 0, 0, 0] }, "an impulse spreads out"),
        example([[1, 1, 1, 1], [0, 0, 0, 0], false], { re: [4, 0, 0, 0], im: [0, 0, 0, 0] }, "a constant collapses"),
        example([[4, 0, 0, 0], [0, 0, 0, 0], true], { re: [1, 1, 1, 1], im: [0, 0, 0, 0] }, "the inverse divides by n"),
        run(fft, [[3, 1, 4, 1, 5, 9, 2, 6], [0, 0, 0, 0, 0, 0, 0, 0], false], "eight values"),
        run(fft, [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1], true], "an inverse on complex input"),
        hidden("length 2¹⁷, time limit", () => [FFT_BIG(), FFT_ZERO(), false]),
      ],
    },
    {
      id: "convolve", title: "Polynomial Multiplication", cses: { id: 2111, name: "Apples and Bananas (brick)" },
      goal: "The convolution of two integer arrays, out[t] = Σ a[i] · b[t − i], of length a.length + b.length − 1, exact.",
      concept: "Convolution is polynomial multiplication, and the Fourier transform turns it into pointwise multiplication: pad both arrays with zeros to a power of two at least a.length + b.length − 1 (so nothing wraps around), transform both, multiply the complex values, transform back and round. Three transforms of length N make it O(N log N), and while the results stay far below 2⁵³ the rounding recovers every integer exactly.",
      functionName: "convolve", signature: "convolve(a, b) → array",
      starterSource: starter("convolve", "a, b", "Pad to a power of two ≥ a.length + b.length − 1, fft both, multiply pointwise, inverse fft, round."),
      solve: convolve, comparator: "deep", dependencies: ["fft"], brute: convolveBrute, small: (round) => [smallList(17900 + round, 1 + (round % 7), 0, 9), smallList(18000 + round, 1 + (round % 5), 0, 9)],
      reference: site("cp-algorithms · Multiplying polynomials", CP + "algebra/fft.html"),
      presets: { "two short arrays": { a: [1, 2, 3], b: [4, 5] }, "a single one": { a: [1], b: [7, 8, 9] }, "all ones": { a: [1, 1, 1, 1], b: [1, 1, 1] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("cyclic-wraparound", "A transform of length N multiplies cyclically; unless N ≥ a.length + b.length − 1 the high terms wrap onto the low ones.", convolve, [["while (size < length) size *= 2;", "while (size < Math.max(a.length, b.length)) size *= 2;"]]),
        variant("real-parts-only", "Transformed values are complex: (p + qi)(r + si) = (pr − qs) + (ps + qr)i, both parts needed.", convolve, [["re[i] = fa.re[i] * fb.re[i] - fa.im[i] * fb.im[i];", "re[i] = fa.re[i] * fb.re[i];"]]),
      ],
      hints: ["length = a.length + b.length − 1; size = the smallest power of two ≥ length; pad both arrays with zeros to size.", "fa = fft(a, zeros, false), fb = fft(b, zeros, false); multiply entry by entry as complex numbers.", "back = fft(re, im, true); out[t] = Math.round(back.re[t]) for t < length."],
      cases: [
        example([[1, 2, 3], [4, 5]], [4, 13, 22, 15], "two short arrays"),
        example([[1], [7, 8, 9]], [7, 8, 9], "multiplying by one"),
        example([[1, 1, 1, 1], [1, 1, 1]], [1, 2, 3, 3, 2, 1], "all ones count the overlaps"),
        run(convolve, [[3, 0, 4, 1, 5], [9, 2, 6]], "five by three"),
        hidden("two arrays of 10⁵ values, time limit", () => [CONV_A(), CONV_B()]),
      ],
    },
    {
      id: "apples-and-bananas", title: "Apples and Bananas", cses: { id: 2111, name: "Apples and Bananas" },
      goal: "For every weight w from 2 to 2k, the number of ways to pick one apple and one banana weighing w together.",
      concept: "Count the apples of each weight and the bananas of each weight. The number of pairs weighing w is Σ apples[i] · bananas[w − i], which is exactly the convolution of the two count arrays, so one polynomial multiplication answers every w at once in O(k log k) instead of O(n · m).",
      functionName: "applesAndBananas", signature: "applesAndBananas(k, apples, bananas) → counts",
      starterSource: starter("applesAndBananas", "k, apples, bananas", "Count arrays indexed by weight − 1, then convolve them: entry t is the weight t + 2."),
      solve: applesAndBananas, comparator: "deep", dependencies: ["convolve"], brute: applesAndBananasBrute, small: (round) => { const k = 1 + (round % 6); return [k, smallList(18100 + round, 1 + (round % 5), 1, k), smallList(18200 + round, 1 + (round % 5), 1, k)]; },
      reference: site("cp-algorithms · Multiplying polynomials", CP + "algebra/fft.html"),
      presets: { "CSES sample": { a: [5, 2, 5], b: [4, 3, 2, 3], c: 5 }, "one of each": { a: [1], b: [1], c: 1 }, "same weights": { a: [2, 2], b: [2, 2, 2], c: 3 } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("presence-not-count", "Two apples of the same weight make two different pairs; count them, do not just mark the weight.", applesAndBananas, [["a[apples[i] - 1] += 1;", "a[apples[i] - 1] = 1;"], ["b[bananas[i] - 1] += 1;", "b[bananas[i] - 1] = 1;"]]),
        variant("weights-from-zero", "Weights start at 1, so the smallest total is 2; indexing the counts from weight 0 shifts every answer and adds two extra entries.", applesAndBananas, [["return convolve(a, b);", "return convolve([0].concat(a), [0].concat(b));"]]),
      ],
      hints: ["a[w − 1] = number of apples of weight w, b[w − 1] likewise for bananas, both of length k.", "convolve(a, b) has length 2k − 1.", "Entry t of the convolution is the number of pairs of total weight t + 2, which is exactly the list asked for."],
      cases: [
        example([5, [5, 2, 5], [4, 3, 2, 3]], [0, 0, 1, 2, 1, 2, 4, 2, 0], "CSES sample"),
        example([1, [1], [1]], [1], "one of each"),
        example([3, [2, 2], [2, 2, 2]], [0, 0, 6, 0, 0], "repeated weights multiply"),
        run(applesAndBananas, [6, [1, 6, 3, 3, 5], [2, 2, 4, 6]], "k = 6"),
        hidden("k = n = m = 10⁵ (CSES allows 2·10⁵), time limit", () => [100000, APPLES_A(), APPLES_B()]),
      ],
    },
    {
      id: "one-bit-positions", title: "One Bit Positions", cses: { id: 2112, name: "One Bit Positions" },
      goal: "For every distance k from 1 to n − 1, the number of pairs of positions i − j = k that both hold a one bit.",
      concept: "Pairs at a fixed distance are a correlation, not a convolution: convolution adds indices, and differences are wanted. Reverse one copy of the bit string: position j of the reversed copy is n − 1 − j, so the convolution's entry n − 1 + k collects exactly the pairs with i − j = k. One polynomial multiplication, then read off the entries after the middle.",
      functionName: "oneBitPositions", signature: "oneBitPositions(s) → counts",
      starterSource: starter("oneBitPositions", "s", "bits and reversed bits as 0/1 arrays; convolve; the answer is entries n … 2n − 2."),
      solve: oneBitPositions, comparator: "deep", dependencies: ["convolve"], brute: oneBitPositionsBrute, small: (round) => [smallBits(18300 + round, 1, 2 + (round % 10))[0]],
      reference: site("cp-algorithms · Multiplying polynomials", CP + "algebra/fft.html"),
      presets: { "CSES sample": { a: "1001011010" }, "all ones": { a: "1111" }, "two far apart": { a: "100001" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("counts-distance-zero", "Distance 0 pairs a bit with itself and is not asked for; the list starts at k = 1.", oneBitPositions, [[".slice(n, 2 * n - 1)", ".slice(n - 1, 2 * n - 2)"]]),
        variant("not-reversed", "Convolving the string with itself adds positions; reversing one copy turns the sum into the difference i − j.", oneBitPositions, [["return convolve(bits, reversed)", "return convolve(bits, bits)"]]),
      ],
      hints: ["bits[i] = 1 when s[i] is '1'; reversed[n − 1 − i] = bits[i].", "convolve(bits, reversed)[t] counts pairs with i − j = t − (n − 1).", "Return the entries for t = n … 2n − 2, which are the distances 1 … n − 1."],
      cases: [
        example(["1001011010"], [1, 2, 3, 0, 2, 1, 0, 1, 0], "CSES sample"),
        example(["11"], [1], "two ones"),
        example(["1111"], [3, 2, 1], "all ones"),
        example(["100001"], [0, 0, 0, 0, 1], "two far apart"),
        run(oneBitPositions, ["110100111010"], "twelve bits"),
        hidden("n = 10⁵ (CSES allows 2·10⁵), time limit", () => [BITSTRING_BIG()]),
      ],
    },
    {
      id: "signal-processing", title: "Signal Processing", cses: { id: 2113, name: "Signal Processing" },
      goal: "Slide the mask across the signal from left to right; at each of the n + m − 1 positions, the sum of products of the overlapping signal and mask values.",
      concept: "At each position the mask's last value meets the signal first, so the mask is read against the signal backwards compared with a convolution. Reverse the mask and every sliding sum becomes one entry of an ordinary convolution, including the partial overlaps at both ends.",
      functionName: "signalProcessing", signature: "signalProcessing(signal, mask) → sums",
      starterSource: starter("signalProcessing", "signal, mask", "convolve(signal, the mask reversed)."),
      solve: signalProcessing, comparator: "deep", dependencies: ["convolve"], brute: signalProcessingBrute, small: (round) => [smallList(18400 + round, 1 + (round % 7), 1, 9), smallList(18500 + round, 1 + (round % 5), 1, 9)],
      reference: site("cp-algorithms · Multiplying polynomials", CP + "algebra/fft.html"),
      presets: { "CSES sample": { a: [1, 3, 2, 1, 4], b: [1, 2, 3] }, "mask longer than signal": { a: [2], b: [1, 2, 3] }, "one-value mask": { a: [4, 5, 6], b: [2] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("mask-not-reversed", "In the first position the mask's last value meets the signal's first; reverse the mask so a plain convolution lines them up.", signalProcessing, [["return convolve(signal, mask.slice().reverse());", "return convolve(signal, mask.slice());"]]),
        variant("full-overlap-only", "The partial overlaps at both ends count too: there are n + m − 1 positions.", signalProcessing, [["return convolve(signal, mask.slice().reverse());", "return convolve(signal, mask.slice().reverse()).slice(mask.length - 1, signal.length);"]]),
      ],
      hints: ["The first position overlaps only signal[0] with mask[m − 1].", "Reversing the mask makes position t equal to Σ signal[i] · reversed[t − i].", "return convolve(signal, mask.slice().reverse())."],
      cases: [
        example([[1, 3, 2, 1, 4], [1, 2, 3]], [3, 11, 13, 10, 16, 9, 4], "CSES sample"),
        example([[2], [1, 2, 3]], [6, 4, 2], "a mask longer than the signal"),
        example([[4, 5, 6], [2]], [8, 10, 12], "a one-value mask scales"),
        run(signalProcessing, [[5, 1, 4, 1, 5, 9, 2], [2, 7, 1]], "seven by three"),
        hidden("n = m = 10⁵ (CSES allows 2·10⁵), time limit", () => [SIGNAL_A(), SIGNAL_B()]),
      ],
    },
    {
      id: "new-roads-queries", title: "New Roads Queries", cses: { id: 2101, name: "New Roads Queries" },
      goal: "Roads are built one per day; for each query [a, b], the first day after which a and b are connected, 0 if a = b, or −1 if never.",
      concept: "Union by size without path compression keeps every tree O(log n) deep, and recording the day each root was linked under another makes the forest remember history: link days only grow towards the root. Two cities become connected exactly when the last link between them and their lowest common ancestor is made, so the answer is the largest link day on the path between them, found by climbing both nodes in O(log n).",
      functionName: "newRoadsQueries", signature: "newRoadsQueries(n, roads, queries) → days",
      starterSource: starter("newRoadsQueries", "n, roads, queries", "Union by size, no path compression, time[child root] = day. Per query climb both nodes to their meeting point, keeping the largest link day."),
      solve: newRoadsQueries, comparator: "deep", brute: newRoadsQueriesBrute, small: (round) => { const n = 1 + (round % 7); return [n, randomQueries(18600 + round, n, round % 9), randomQueries(18700 + round, n, 6)]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [1, 3], [2, 5]], c: [[1, 3], [3, 4], [3, 5]] }, "the same city": { a: 2, b: [[1, 2]], c: [[1, 1], [2, 1]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("earliest-link-on-path", "The cities are connected only once every link on the path between them exists, so it is the latest link day that counts.", newRoadsQueries, [["latest = 0;", "latest = Infinity;"], ["Math.max(", "Math.min(", true]]),
        variant("compresses-paths", "Path compression rewires nodes straight to the root and throws away the link days along the old path.", newRoadsQueries, [["const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };", "const find = (x) => { let root = x; while (parent[root] !== root) root = parent[root]; while (parent[x] !== root) { const up = parent[x]; parent[x] = root; x = up; } return root; };"]]),
      ],
      hints: ["Union by size without path compression; when root rb goes under ra on day i + 1, set time[rb] = i + 1.", "For a query: 0 if a = b, −1 if the roots differ.", "Lift the deeper node until both have the same depth, then lift both until they meet, keeping the maximum time[] of every node you lift."],
      cases: [
        example([5, [[1, 2], [2, 3], [1, 3], [2, 5]], [[1, 3], [3, 4], [3, 5]]], [2, -1, 4], "CSES sample"),
        example([2, [[1, 2]], [[1, 1], [2, 1]]], [0, 1], "a city is connected to itself on day 0"),
        example([4, [[1, 2], [3, 4], [2, 3]], [[1, 4], [1, 2], [3, 4]]], [3, 1, 2], "two pairs joined on day 3"),
        run(newRoadsQueries, [8, randomQueries(18800, 8, 10), randomQueries(18900, 8, 8)], "eight cities"),
        hidden("n = m = q = 2·10⁵, time limit", () => [200000, ROADS_BIG(), ROAD_QUERIES_BIG()]),
      ],
    },
    {
      id: "rollback-union", title: "Rollback Union", cses: { id: 2133, name: "Dynamic Connectivity (brick)" },
      goal: "Union a and b in the undoable structure dsu = { parent, size, history, components } and return it: union by size, no path compression, and push the root that moved (or −1 if nothing moved) onto history.",
      concept: "Path compression makes union-find fast but rewrites many parents, which cannot be undone cheaply. Union by size alone still keeps trees O(log n) deep, and then a union changes exactly one parent pointer and one size, so writing down which root moved is enough to undo it: pop the root, subtract its size from its new parent and make it a root again. Ties put b's root under a's root.",
      functionName: "rollbackUnion", signature: "rollbackUnion(dsu, a, b) → dsu",
      starterSource: starter("rollbackUnion", "dsu, a, b", "Climb to both roots without compressing; if equal push −1; else hang the smaller under the larger, update size and components, push the moved root."),
      solve: rollbackUnion, comparator: "deep", allowMutation: true,
      reference: site("cp-algorithms · Deleting in O(log n): DSU with rollbacks", CP + "data_structures/deleting_in_log_n.html"),
      presets: { "two roots": { a: freshDsu(4), b: 1, c: 2 }, "already joined": { a: rollbackUnion(freshDsu(3), 1, 2), b: 2, c: 1 }, "a deep node": { a: rollbackUnion(rollbackUnion(rollbackUnion(freshDsu(5), 1, 2), 3, 4), 1, 3), b: 4, c: 5 } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("compresses-while-finding", "Pointing a straight at its root changes a parent that no history entry records, so the union can no longer be undone exactly.", rollbackUnion, [["while (dsu.parent[ra] !== ra) ra = dsu.parent[ra];", "while (dsu.parent[ra] !== ra) ra = dsu.parent[ra]; dsu.parent[a] = ra;"]]),
        variant("no-record-when-joined", "Every call needs exactly one history entry, even when nothing moves, or the undo steps no longer line up with the unions.", rollbackUnion, [["if (ra === rb) { dsu.history.push(-1); return dsu; }", "if (ra === rb) return dsu;"]]),
      ],
      hints: ["ra = a, rb = b; climb each with ra = dsu.parent[ra] until parent[ra] === ra, changing nothing.", "If ra === rb push −1 and return. If size[ra] < size[rb] swap them, so b's root goes under a's on a tie.", "parent[rb] = ra, size[ra] += size[rb], components −= 1, history.push(rb); return dsu."],
      cases: [
        example([freshDsu(4), 1, 2], { parent: [0, 1, 1, 3, 4], size: [1, 2, 1, 1, 1], history: [2], components: 3 }, "two roots"),
        run(rollbackUnion, [rollbackUnion(freshDsu(3), 1, 2), 2, 1], "already joined: history gets −1"),
        run(rollbackUnion, [rollbackUnion(rollbackUnion(rollbackUnion(freshDsu(5), 1, 2), 3, 4), 1, 3), 4, 5], "a node two steps below its root"),
        run(rollbackUnion, [rollbackUnion(rollbackUnion(freshDsu(6), 1, 2), 3, 4), 4, 2], "equal sizes: b's root goes under a's"),
      ],
    },
    {
      id: "dynamic-connectivity", title: "Dynamic Connectivity", cses: { id: 2133, name: "Dynamic Connectivity" },
      goal: "Edges appear and disappear; return the number of components before the first event and after every event.",
      concept: "Deletions are what union-find cannot do, so go offline. Every edge is alive during one or more intervals of the timeline 0 … k; store each interval on the O(log k) nodes of a segment tree over time that cover it. A depth-first walk of that tree unions a node's edges on the way in and rolls them back on the way out, so at each leaf exactly the edges alive at that moment are joined. That is O((m + k) log k log n).",
      functionName: "dynamicConnectivity", signature: "dynamicConnectivity(n, edges, events) → counts",
      starterSource: starter("dynamicConnectivity", "n, edges, events", "Turn each edge into alive intervals [from, to]; put them on segment-tree nodes over 0..k; walk the tree with rollbackUnion, undoing on the way out."),
      solve: dynamicConnectivity, comparator: "deep", dependencies: ["rollback-union"], brute: dynamicConnectivityBrute, small: (round) => { const n = 2 + (round % 6); return connectivityEvents(19000 + round, n, Math.min(n * (n - 1) / 2, 1 + (round % 4)), 1 + (round % 8)); },
      reference: site("cp-algorithms · Deleting in O(log n)", CP + "data_structures/deleting_in_log_n.html"),
      presets: { "CSES sample": { a: 5, b: [[1, 4], [2, 3], [3, 5]], c: [[1, 2, 5], [2, 3, 5], [1, 1, 2]] }, "add then remove": { a: 3, b: [], c: [[1, 1, 2], [1, 2, 3], [2, 1, 2]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("removals-ignored", "Removed edges stop joining their ends; counting as if every edge stayed forever overcounts connections.", function dynamicConnectivity(n, edges, events) { const parent = []; for (let v = 0; v <= n; v += 1) parent.push(v); const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }; let components = n; const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) { parent[ra] = rb; components -= 1; } }; edges.forEach((e) => join(e[0], e[1])); const out = [components]; events.forEach((e) => { if (e[0] === 1) join(e[1], e[2]); out.push(components); }); return out; }),
        variant("removal-one-event-late", "An edge removed by event t is already gone in the count after event t, so its last alive moment is t − 1.", dynamicConnectivity, [["intervals.push([open[0], open[1], open[2], t - 1]);", "intervals.push([open[0], open[1], open[2], t]);"]]),
      ],
      hints: ["Moment 0 is before the first event and moment t is after event t. An edge added at moment s and removed by event t is alive on [s, t − 1]; edges never removed live until k.", "Place each interval on the segment-tree nodes over 0 … k that it covers completely.", "walk(node): rollbackUnion every edge stored there; at a leaf record dsu.components; recurse; then undo as many history entries as you pushed."],
      cases: [
        example([5, [[1, 4], [2, 3], [3, 5]], [[1, 2, 5], [2, 3, 5], [1, 1, 2]]], [2, 2, 2, 1], "CSES sample"),
        example([3, [], [[1, 1, 2], [1, 2, 3], [2, 1, 2]]], [3, 2, 1, 2], "add then remove"),
        example([2, [[1, 2]], [[2, 1, 2], [1, 1, 2]]], [1, 2, 1], "remove and add back"),
        run(dynamicConnectivity, connectivityEvents(19100, 7, 6, 10), "seven nodes, ten events"),
        hidden("n = m = k = 10⁵, time limit", () => CONNECTIVITY_BIG()),
      ],
    },
    {
      id: "min-cost-flow", title: "Minimum Cost Flow", cses: { id: 2121, name: "Parcel Delivery (brick)" },
      goal: "Send as much flow as possible, up to limit, from source to sink through edges [a, b, capacity, cost] (costs ≥ 0), as cheaply as possible; return { flow, cost, flows } with one flow per edge.",
      concept: "Successive shortest paths: repeatedly push flow along the cheapest path in the residual graph, where every edge has a reverse edge of negative cost that lets later paths reroute earlier ones. Negative reverse costs would break Dijkstra, so keep a potential per node and use reduced costs cost + p(u) − p(v), which stay non-negative; after each search add the distances to the potentials. Each augmentation is one Dijkstra, and every path pushes its bottleneck.",
      functionName: "minCostFlow", signature: "minCostFlow(n, edges, source, sink, limit) → { flow, cost, flows }",
      starterSource: starter("minCostFlow", "n, edges, source, sink, limit", "Residual edges in pairs (2i forward, 2i + 1 reverse with −cost); Dijkstra on reduced costs; add distances to potentials; push the bottleneck; repeat."),
      solve: minCostFlow, comparator: "deep", accept: minCostFlowAccept, check: viaBrute(minCostFlowAccept, minCostFlowBrute), small: (round) => { const n = 2 + (round % 3); return [n, flowNetwork(19200 + round, n, 1 + (round % 4), 3, 9), 1, n, 1 + (round % 3)]; },
      reference: site("cp-algorithms · Minimum-cost flow", CP + "graph/min_cost_flow.html"),
      presets: { "Parcel Delivery sample": { a: 4, b: [[1, 2, 5, 100], [1, 3, 10, 50], [1, 4, 7, 500], [2, 4, 8, 350], [3, 4, 2, 100]], c: 1, d: 4, e: 3 }, "a reroute": { a: 4, b: [[1, 2, 1, 1], [2, 3, 1, 1], [3, 4, 1, 1], [1, 3, 1, 5], [2, 4, 1, 5]], c: 1, d: 4, e: 2 } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }] },
      diagnoses: [
        variant("no-undo-edges", "Pushing flow must open the reverse edge; without it a later path can never reroute an earlier one.", minCostFlow, [["cap[via[v] ^ 1] += push;", ""]]),
        variant("positive-undo-cost", "Undoing a unit of flow refunds its cost, so the reverse edge costs −w, not +w.", minCostFlow, [["cost[2 * i + 1] = -w;", "cost[2 * i + 1] = w;"]]),
      ],
      hints: ["Edge i becomes residual edges 2i (capacity c, cost w) and 2i + 1 (capacity 0, cost −w); e ^ 1 is the partner.", "Dijkstra from the source with reduced cost cost[e] + p[v] − p[u]; if the sink is unreachable stop, else p[v] += dist[v] for every reached v.", "Walk back from the sink to find the bottleneck (never more than limit − flow), subtract it forward and add it backward, and add bottleneck · cost to the total. flows[i] is the capacity of edge 2i + 1."],
      cases: [
        run(minCostFlow, [4, [[1, 2, 5, 100], [1, 3, 10, 50], [1, 4, 7, 500], [2, 4, 8, 350], [3, 4, 2, 100]], 1, 4, 3], "the Parcel Delivery sample"),
        example([4, [[1, 2, 1, 1], [2, 3, 1, 1], [3, 4, 1, 1], [1, 3, 1, 5], [2, 4, 1, 5]], 1, 4, 2], { flow: 2, cost: 12, flows: [1, 0, 1, 1, 1] }, "the second path reroutes the first"),
        example([3, [[1, 2, 4, 3]], 1, 3, 5], { flow: 0, cost: 0, flows: [0] }, "no path to the sink"),
        run(minCostFlow, [6, flowNetwork(19300, 6, 12, 4, 9), 1, 6, 5], "six nodes"),
        hidden("n = 500, m = 1000, limit 100, time limit", () => [500, PARCEL_BIG(), 1, 500, 100]),
      ],
    },
    {
      id: "parcel-delivery", title: "Parcel Delivery", cses: { id: 2121, name: "Parcel Delivery" },
      goal: "The cheapest cost to send k parcels from city 1 to city n along routes [a, b, r, c] carrying at most r parcels at c each, or −1 if k parcels cannot get through.",
      concept: "Parcels are units of flow, a route's parcel limit is its capacity and its price per parcel is its cost, so this is exactly a minimum-cost flow limited to k units. If fewer than k units reach city n there is no way to deliver them all.",
      functionName: "parcelDelivery", signature: "parcelDelivery(n, routes, k) → cost",
      starterSource: starter("parcelDelivery", "n, routes, k", "minCostFlow(n, routes, 1, n, k): −1 if the flow is below k, otherwise its cost."),
      solve: parcelDelivery, comparator: "scalar", dependencies: ["min-cost-flow"], brute: (n, routes, k) => { const best = minCostFlowBrute(n, routes, 1, n, k); return best.flow < k ? -1 : best.cost; }, small: (round) => { const n = 2 + (round % 3); return [n, flowNetwork(19400 + round, n, 1 + (round % 4), 3, 9), 1 + (round % 3)]; },
      reference: site("cp-algorithms · Minimum-cost flow", CP + "graph/min_cost_flow.html"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 5, 100], [1, 3, 10, 50], [1, 4, 7, 500], [2, 4, 8, 350], [3, 4, 2, 100]], c: 3 }, "too many parcels": { a: 3, b: [[1, 2, 2, 1], [2, 3, 1, 1]], c: 2 } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("cheapest-path-times-k", "The cheapest route may not carry all k parcels; once it is full the rest must take dearer routes.", function parcelDelivery(n, routes, k) { const dist = new Array(n + 1).fill(Infinity); dist[1] = 0; for (let round = 1; round < n; round += 1) { let changed = false; for (let i = 0; i < routes.length; i += 1) { const [a, b, r, c] = routes[i]; if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; changed = true; } } if (!changed) break; } return dist[n] === Infinity ? -1 : dist[n] * k; }),
        variant("partial-delivery", "If fewer than k parcels can reach city n the delivery is impossible; report −1, not the cost of the parcels that made it.", parcelDelivery, [["return result.flow < k ? -1 : result.cost;", "return result.cost;"]]),
      ],
      hints: ["The routes are already [a, b, capacity, cost] edges.", "result = minCostFlow(n, routes, 1, n, k).", "Return −1 when result.flow < k, otherwise result.cost."],
      cases: [
        example([4, [[1, 2, 5, 100], [1, 3, 10, 50], [1, 4, 7, 500], [2, 4, 8, 350], [3, 4, 2, 100]], 3], 750, "CSES sample"),
        example([3, [[1, 2, 2, 1], [2, 3, 1, 1]], 2], -1, "only one parcel fits through"),
        example([2, [[1, 2, 5, 7]], 5], 35, "one direct route"),
        run(parcelDelivery, [6, flowNetwork(19500, 6, 12, 4, 9), 3], "six cities"),
        hidden("n = 500, m = 1000, k = 100, time limit", () => [500, PARCEL_BIG(), 100]),
      ],
    },
    {
      id: "task-assignment", title: "Task Assignment", cses: { id: 2129, name: "Task Assignment" },
      goal: "Assign each employee exactly one task, each task to one employee, at minimum total cost; return { cost, assignment } with assignment[i] the task (1-based) of employee i + 1. Any optimal assignment is accepted.",
      concept: "Make a flow network: the source feeds every employee one unit, employee i reaches task j at cost c_ij, and every task sends one unit to the sink. A flow of n units is a perfect assignment and its cost is the total, so the minimum-cost flow is the optimal assignment (the Hungarian algorithm is the specialised version of the same idea). Read the assignment off the employee-to-task edges that carry flow.",
      functionName: "taskAssignment", signature: "taskAssignment(costs) → { cost, assignment }",
      starterSource: starter("taskAssignment", "costs", "Source → employees (1, 0), employees → tasks (1, c), tasks → sink (1, 0); minCostFlow for n units; read which employee edge carries flow."),
      solve: taskAssignment, comparator: "deep", dependencies: ["min-cost-flow"], accept: taskAssignmentAccept, check: viaBrute(taskAssignmentAccept, taskAssignmentBrute), small: (round) => [costMatrix(19600 + round, 1 + (round % 6), 20)],
      reference: site("cp-algorithms · Assignment problem via min-cost flow", CP + "graph/Assignment-problem-min-flow.html"),
      presets: { "CSES sample": { a: [[17, 8, 16, 9], [7, 15, 12, 19], [6, 9, 10, 11], [14, 7, 13, 10]] }, "one person": { a: [[5]] }, "greedy trap": { a: [[1, 2], [1, 100]] } },
      scene: { kind: "algo", view: "number-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("greedy-by-employee", "Letting each employee grab the cheapest free task can leave a later employee with a terrible one; the choice has to be global.", function taskAssignment(costs) { const n = costs.length; const taken = new Array(n).fill(false); const assignment = []; let cost = 0; for (let i = 0; i < n; i += 1) { let best = -1; for (let j = 0; j < n; j += 1) if (!taken[j] && (best < 0 || costs[i][j] < costs[i][best])) best = j; taken[best] = true; assignment.push(best + 1); cost += costs[i][best]; } return { cost, assignment }; }),
        diagnosis("row-minimums", "Every task can go to only one employee; the cheapest task of each row may be the same task.", function taskAssignment(costs) { const assignment = [], n = costs.length; let cost = 0; for (let i = 0; i < n; i += 1) { let best = 0; for (let j = 1; j < n; j += 1) if (costs[i][j] < costs[i][best]) best = j; assignment.push(best + 1); cost += costs[i][best]; } return { cost, assignment }; }),
      ],
      hints: ["Nodes: employees 1 … n, tasks n + 1 … 2n, source 2n + 1, sink 2n + 2.", "Edges: [source, i, 1, 0], [i, n + j, 1, costs[i − 1][j − 1]], [n + j, sink, 1, 0]; run minCostFlow for n units.", "Employee i does task j when the edge from i to n + j carries flow; the total cost is the flow's cost."],
      cases: [
        example([[[17, 8, 16, 9], [7, 15, 12, 19], [6, 9, 10, 11], [14, 7, 13, 10]]], { cost: 33, assignment: [4, 1, 3, 2] }, "CSES sample"),
        example([[[5]]], { cost: 5, assignment: [1] }, "one employee"),
        example([[[1, 2], [1, 100]]], { cost: 3, assignment: [2, 1] }, "the first employee must give up its favourite"),
        run(taskAssignment, [costMatrix(19700, 6, 30)], "six employees"),
        hidden("n = 200, time limit", () => [TASKS_BIG()]),
      ],
    },
    {
      id: "distinct-routes-ii", title: "Distinct Routes II", cses: { id: 2130, name: "Distinct Routes II" },
      goal: "Play k days from room 1 to room n using every teleporter at most once over the whole game, paying one coin per teleport; return { coins, routes } with the minimum coins, or −1 if k days are impossible. Any optimal set of routes is accepted.",
      concept: "Routes that share no teleporter are units of flow through unit-capacity edges, and a coin per teleport is a cost of 1 per edge, so the cheapest k routes are a minimum-cost flow of k units. Taking shortest routes one at a time can block a better pair; the reverse edges of the flow reroute exactly those cases. Split the final flow into routes by walking from room 1 along used teleporters; a minimum-cost flow never contains a cycle, so every walk reaches room n.",
      functionName: "distinctRoutesII", signature: "distinctRoutesII(n, teleporters, k) → { coins, routes } or −1",
      starterSource: starter("distinctRoutesII", "n, teleporters, k", "minCostFlow on [a, b, 1, 1] edges for k units; −1 if short; otherwise walk k routes from room 1 along teleporters that carry flow."),
      solve: distinctRoutesII, comparator: "deep", dependencies: ["min-cost-flow"], accept: distinctRoutesIIAccept, check: viaBrute(distinctRoutesIIAccept, distinctRoutesIIBrute), small: (round) => { const n = 2 + (round % 4); return [n, teleporterGraph(19800 + round, n, Math.min(n * (n - 1), 1 + (round % 6))), 1 + (round % 2)]; },
      reference: site("cp-algorithms · Minimum-cost flow", CP + "graph/min_cost_flow.html"),
      presets: { "CSES sample": { a: 8, b: [[1, 2], [1, 3], [2, 5], [2, 4], [3, 5], [3, 6], [4, 8], [5, 8], [6, 7], [7, 8]], c: 2, directed: true }, "a greedy trap": { a: 8, b: [[1, 2], [2, 3], [3, 8], [1, 4], [4, 5], [5, 3], [2, 6], [6, 7], [7, 8]], c: 2, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("greedy-shortest-routes", "Taking the shortest route first and deleting its teleporters can block the only way to fit k routes; let later routes reroute earlier ones.", function distinctRoutesII(n, teleporters, k) { const used = new Array(teleporters.length).fill(false); const routes = []; let coins = 0; for (let day = 0; day < k; day += 1) { const via = new Array(n + 1).fill(-2); via[1] = -1; const queue = [1]; for (let h = 0; h < queue.length && via[n] === -2; h += 1) { const v = queue[h]; for (let i = 0; i < teleporters.length; i += 1) if (!used[i] && teleporters[i][0] === v && via[teleporters[i][1]] === -2) { via[teleporters[i][1]] = i; queue.push(teleporters[i][1]); } } if (via[n] === -2) return -1; const route = [n]; for (let v = n; v !== 1; v = teleporters[via[v]][0]) { used[via[v]] = true; route.push(teleporters[via[v]][0]); coins += 1; } routes.push(route.reverse()); } return { coins, routes }; }),
        variant("counts-rooms", "A route through r rooms uses r − 1 teleporters; coins count teleports, not rooms.", distinctRoutesII, [["return { coins: result.cost, routes };", "return { coins: result.cost + k, routes };"]]),
      ],
      hints: ["edges = teleporters.map(([a, b]) => [a, b, 1, 1]); result = minCostFlow(n, edges, 1, n, k).", "If result.flow < k return −1; otherwise list, for every room, the teleporters out of it that carry flow.", "Build each route by starting at room 1 and repeatedly taking (and removing) a used teleporter out of the current room until room n; coins = result.cost."],
      cases: [
        example([8, [[1, 2], [1, 3], [2, 5], [2, 4], [3, 5], [3, 6], [4, 8], [5, 8], [6, 7], [7, 8]], 2], { coins: 6, routes: [[1, 2, 4, 8], [1, 3, 5, 8]] }, "CSES sample"),
        example([8, [[1, 2], [2, 3], [3, 8], [1, 4], [4, 5], [5, 3], [2, 6], [6, 7], [7, 8]], 2], { coins: 8, routes: [[1, 2, 6, 7, 8], [1, 4, 5, 3, 8]] }, "the shortest route blocks the second one"),
        example([3, [[1, 2], [2, 3]], 2], -1, "only one route exists"),
        run(distinctRoutesII, [6, teleporterGraph(19900, 6, 14), 2], "six rooms"),
        hidden("n = 500, about 940 teleporters, k = 60, time limit", () => ROUTES_BIG()),
      ],
    },
  ];
  core.share({ subsetSums, popcount, treapMerge, treapSplit, lowLink, fft, convolve, rollbackUnion, minCostFlow });
  core.define("advanced", ADVANCED);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

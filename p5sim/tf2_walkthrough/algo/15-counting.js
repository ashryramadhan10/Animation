(function defineAlgoSection(core) {
  "use strict";
  const { lazy, rng, randomInts, randomPermutation, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { mulMod, modPow, factorialTables, choose, fenwickAdd, fenwickPrefix } = core.shared;

  // ------------------------------------------------------------------ 15 · counting problems · references
  function filledSubgridCountI(grid, k) {
    const n = grid.length;
    const counts = new Array(k).fill(0);
    let above = new Int32Array(n), current = new Int32Array(n);
    for (let i = 0; i < n; i += 1) {
      const row = grid[i], up = i > 0 ? grid[i - 1] : null;
      for (let j = 0; j < n; j += 1) {
        const c = row.charCodeAt(j);
        // The largest one-letter square ending here grows from the three squares touching it.
        if (i > 0 && j > 0 && up.charCodeAt(j) === c && row.charCodeAt(j - 1) === c && up.charCodeAt(j - 1) === c) {
          current[j] = 1 + Math.min(above[j], current[j - 1], above[j - 1]);
        } else current[j] = 1;
        counts[c - 65] += current[j];
      }
      const swap = above; above = current; current = swap;
    }
    return counts;
  }
  function filledSubgridCountII(grid, k) {
    const n = grid.length;
    const counts = new Array(k).fill(0);
    const height = new Int32Array(n), stack = new Int32Array(n), sum = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      const row = grid[i], up = i > 0 ? grid[i - 1] : null;
      for (let j = 0; j < n; j += 1) height[j] = up && up.charCodeAt(j) === row.charCodeAt(j) ? height[j] + 1 : 1;
      // sum[j] = one-letter rectangles whose bottom-right corner is (i, j); the stack restarts where the letter changes.
      let top = 0, runStart = 0;
      for (let j = 0; j < n; j += 1) {
        if (j > 0 && row.charCodeAt(j) !== row.charCodeAt(j - 1)) { top = 0; runStart = j; }
        while (top > 0 && height[stack[top - 1]] >= height[j]) top -= 1;
        const left = top > 0 ? stack[top - 1] : runStart - 1;
        sum[j] = (top > 0 ? sum[left] : 0) + height[j] * (j - left);
        stack[top] = j; top += 1;
        counts[row.charCodeAt(j) - 65] += sum[j];
      }
    }
    return counts;
  }
  function allLetterSubgridCountI(grid, k) {
    const n = grid.length;
    // need[i][j] = the side of the smallest square with top-left (i, j) holding every letter.
    const need = new Int32Array(n * n);
    let below = new Int32Array(n + 1), current = new Int32Array(n + 1);
    for (let letter = 0; letter < k; letter += 1) {
      const code = 65 + letter, far = 1 << 20;
      below.fill(far);
      for (let i = n - 1; i >= 0; i -= 1) {
        const row = grid[i];
        current[n] = far;
        for (let j = n - 1; j >= 0; j -= 1) {
          current[j] = row.charCodeAt(j) === code ? 1 : 1 + Math.min(below[j], current[j + 1], below[j + 1]);
          if (current[j] > need[i * n + j]) need[i * n + j] = current[j];
        }
        const swap = below; below = current; current = swap;
      }
    }
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const room = Math.min(n - i, n - j), s = need[i * n + j];
        if (s <= room) total += room - s + 1;
      }
    }
    return total;
  }
  function allLetterSubgridCountII(grid, k) {
    const n = grid.length, full = (1 << k) - 1;
    const bits = [];
    for (let i = 0; i < n; i += 1) { const row = new Int32Array(n); for (let j = 0; j < n; j += 1) row[j] = 1 << (grid[i].charCodeAt(j) - 65); bits.push(row); }
    const column = new Int32Array(n);
    // A queue of column masks as two stacks, so the OR of the window survives removals at the front.
    const frontMask = new Int32Array(n), frontAgg = new Int32Array(n), backMask = new Int32Array(n);
    let total = 0;
    for (let top = 0; top < n; top += 1) {
      column.fill(0);
      for (let bottom = top; bottom < n; bottom += 1) {
        const row = bits[bottom];
        for (let j = 0; j < n; j += 1) column[j] |= row[j];
        let frontSize = 0, backSize = 0, backAgg = 0, left = 0;
        for (let right = 0; right < n; right += 1) {
          backMask[backSize] = column[right]; backSize += 1; backAgg |= column[right];
          while (true) {
            if (frontSize === 0) {
              for (let t = backSize - 1; t >= 0; t -= 1) { frontMask[frontSize] = backMask[t]; frontAgg[frontSize] = backMask[t] | (frontSize > 0 ? frontAgg[frontSize - 1] : 0); frontSize += 1; }
              backSize = 0; backAgg = 0;
            }
            const withoutFirst = (frontSize > 1 ? frontAgg[frontSize - 2] : 0) | backAgg;
            if (left < right && withoutFirst === full) { frontSize -= 1; left += 1; } else break;
          }
          if (((frontSize > 0 ? frontAgg[frontSize - 1] : 0) | backAgg) === full) total += left + 1;
        }
      }
    }
    return total;
  }
  function borderSubgridCountI(grid, k) {
    const n = grid.length;
    const counts = new Array(k).fill(0);
    // Runs of one letter in each direction; a square fits when both corners' runs reach its size.
    const right = new Int32Array(n * n), down = new Int32Array(n * n), left = new Int32Array(n * n), up = new Int32Array(n * n);
    for (let i = n - 1; i >= 0; i -= 1) for (let j = n - 1; j >= 0; j -= 1) {
      const c = grid[i].charCodeAt(j);
      right[i * n + j] = j + 1 < n && grid[i].charCodeAt(j + 1) === c ? right[i * n + j + 1] + 1 : 1;
      down[i * n + j] = i + 1 < n && grid[i + 1].charCodeAt(j) === c ? down[(i + 1) * n + j] + 1 : 1;
    }
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
      const c = grid[i].charCodeAt(j);
      left[i * n + j] = j > 0 && grid[i].charCodeAt(j - 1) === c ? left[i * n + j - 1] + 1 : 1;
      up[i * n + j] = i > 0 && grid[i - 1].charCodeAt(j) === c ? up[(i - 1) * n + j] + 1 : 1;
    }
    const tree = new Float64Array(n + 1);
    const expire = [];
    for (let t = 0; t <= n; t += 1) expire.push([]);
    for (let d = -(n - 1); d <= n - 1; d += 1) {
      const i0 = Math.max(0, -d), j0 = Math.max(0, d), length = n - Math.max(i0, j0);
      tree.fill(0);
      for (let t = 0; t <= length; t += 1) expire[t].length = 0;
      // Top-left corners p stay open for q = p … p + reach − 1; count the open ones the bottom-right corner can see.
      for (let q = 0; q < length; q += 1) {
        const cell = (i0 + q) * n + j0 + q;
        const reach = Math.min(right[cell], down[cell]);
        fenwickAdd(tree, q + 1, 1);
        expire[Math.min(length, q + reach)].push(q);
        expire[q].forEach((p) => fenwickAdd(tree, p + 1, -1));
        const back = Math.min(left[cell], up[cell]);
        counts[grid[i0 + q].charCodeAt(j0 + q) - 65] += fenwickPrefix(tree, q + 1) - fenwickPrefix(tree, q + 1 - back);
      }
    }
    return counts;
  }
  function borderSubgridCountII(grid, k) {
    const n = grid.length;
    const counts = new Array(k).fill(0);
    const down = [];
    for (let i = 0; i < n; i += 1) down.push(new Int32Array(n));
    for (let i = n - 1; i >= 0; i -= 1) for (let j = 0; j < n; j += 1) down[i][j] = i + 1 < n && grid[i + 1][j] === grid[i][j] ? down[i + 1][j] + 1 : 1;
    // Fix the top and bottom rows; inside a stretch where both rows show one letter, any two pillars close a border.
    for (let top = 0; top < n; top += 1) {
      const a = grid[top];
      for (let bottom = top; bottom < n; bottom += 1) {
        const b = grid[bottom], tall = bottom - top + 1;
        let pillars = 0;
        for (let j = 0; j < n; j += 1) {
          const c = a.charCodeAt(j);
          if (b.charCodeAt(j) !== c) { pillars = 0; continue; }
          if (j > 0 && (a.charCodeAt(j - 1) !== c || b.charCodeAt(j - 1) !== c)) pillars = 0;
          if (down[top][j] >= tall) { pillars += 1; counts[c - 65] += pillars; }
        }
      }
    }
    return counts;
  }
  function raabGameII(tests) {
    const m = 1000000007;
    let top = 0;
    tests.forEach(([n]) => { top = Math.max(top, n); });
    const tables = factorialTables(top + 1);
    // d[b] = derangements of `size` cards with exactly b cards above their place, one row per size.
    const bySize = [];
    for (let s = 0; s <= top; s += 1) bySize.push([]);
    tests.forEach(([n, a, b], i) => { if (a + b <= n) bySize[a + b].push(i); });
    const answers = new Array(tests.length).fill(0);
    let older = [1], previous = [0];
    const answer = (size, row) => bySize[size].forEach((i) => {
      const [n, a, b] = tests[i];
      answers[i] = mulMod(mulMod(tables.fact[n], choose(tables, n, n - size), m), row[b] || 0, m);
    });
    answer(0, older);
    if (top >= 1) answer(1, previous);
    for (let size = 2; size <= top; size += 1) {
      const current = new Array(size + 1).fill(0);
      // Every multiplier is at most 5000, so each product stays exact below 2^53 without mulMod.
      for (let b = 1; b < size; b += 1) current[b] = (b * (previous[b] || 0) + (size - b) * (previous[b - 1] || 0) + (size - 1) * (older[b - 1] || 0)) % m;
      answer(size, current);
      older = previous; previous = current;
    }
    return answers;
  }
  function emptyString(s) {
    const n = s.length, m = 1000000007;
    const tables = factorialTables(n);
    // ways[l][r]: orders that erase s[l..r]; s[l] leaves together with some s[j], after the inside is gone.
    const ways = [];
    for (let l = 0; l <= n; l += 1) ways.push(new Array(n + 1).fill(0));
    const get = (l, r) => (l > r ? 1 : ways[l][r]);
    for (let length = 2; length <= n; length += 2) {
      for (let l = 0; l + length - 1 < n; l += 1) {
        const r = l + length - 1;
        let total = 0;
        for (let j = l + 1; j <= r; j += 2) {
          if (s[j] !== s[l]) continue;
          const inner = get(l + 1, j - 1), rest = get(j + 1, r);
          if (!inner || !rest) continue;
          total = (total + mulMod(mulMod(inner, rest, m), choose(tables, length / 2, (j - l + 1) / 2), m)) % m;
        }
        ways[l][r] = total;
      }
    }
    return n % 2 === 1 ? 0 : get(0, n - 1);
  }
  function permutationInversions(n, k) {
    const m = 1000000007;
    let row = new Array(k + 1).fill(0);
    row[0] = 1;
    // Inserting the i-th largest value creates between 0 and i − 1 new inversions.
    for (let i = 2; i <= n; i += 1) {
      const next = new Array(k + 1).fill(0);
      let window = 0;
      for (let j = 0; j <= k; j += 1) {
        window = (window + row[j]) % m;
        if (j - i >= 0) window = (window - row[j - i] + m) % m;
        next[j] = window;
      }
      row = next;
    }
    return row[k];
  }
  function countingBishops(n, k) {
    const m = 1000000007;
    if (k > 2 * n - 1) return 0;
    // Diagonals of one color, shortest first: every earlier bishop blocks exactly one square of the next diagonal.
    const lengths = [[], []];
    for (let d = 0; d < 2 * n - 1; d += 1) lengths[d % 2].push(d < n ? d + 1 : 2 * n - 1 - d);
    const ways = lengths.map((list) => {
      list.sort((p, q) => p - q);
      let row = new Array(k + 1).fill(0);
      row[0] = 1;
      list.forEach((length) => {
        const next = row.slice();
        for (let j = 1; j <= k; j += 1) if (length - (j - 1) > 0) next[j] = (next[j] + mulMod(row[j - 1], length - (j - 1), m)) % m;
        row = next;
      });
      return row;
    });
    let total = 0;
    for (let j = 0; j <= k; j += 1) total = (total + mulMod(ways[0][j], ways[1][k - j], m)) % m;
    return total;
  }
  function countingSequences(n, k) {
    const m = 1000000007;
    const tables = factorialTables(k);
    // i^n is multiplicative, so fast powers are only needed for primes; composites reuse smaller powers.
    const power = new Array(k + 1).fill(0), smallest = new Int32Array(k + 1);
    if (k >= 1) power[1] = 1;
    for (let i = 2; i <= k; i += 1) {
      if (smallest[i] === 0) { for (let j = i; j <= k; j += i) if (smallest[j] === 0) smallest[j] = i; power[i] = modPow(i, n, m); }
      else power[i] = mulMod(power[smallest[i]], power[i / smallest[i]], m);
    }
    // Inclusion–exclusion over the values that are missing.
    let total = 0;
    for (let i = 0; i <= k; i += 1) {
      const term = mulMod(choose(tables, k, i), power[k - i], m);
      total = i % 2 === 0 ? (total + term) % m : (total - term + m) % m;
    }
    return total;
  }
  function gridPathsII(n, traps) {
    const m = 1000000007;
    const tables = factorialTables(2 * n);
    const points = traps.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]).concat([[n, n]]);
    const paths = (y1, x1, y2, x2) => (y2 < y1 || x2 < x1 ? 0 : choose(tables, y2 - y1 + x2 - x1, y2 - y1));
    // free[i]: paths to point i that avoid every earlier trap; subtract the ones whose first trap is j.
    const free = [];
    for (let i = 0; i < points.length; i += 1) {
      let value = paths(1, 1, points[i][0], points[i][1]);
      for (let j = 0; j < i; j += 1) value = (value - mulMod(free[j], paths(points[j][0], points[j][1], points[i][0], points[i][1]), m) + m) % m;
      free.push(value);
    }
    return free[free.length - 1];
  }
  function countingPermutations(n) {
    const m = 1000000007;
    const tables = factorialTables(n + 1);
    const powers = [1];
    for (let i = 1; i <= n; i += 1) powers.push(powers[i - 1] * 2 % m);
    // Inclusion–exclusion over k forced bonds (i, i+1) forming c blocks, each block readable both ways.
    let total = tables.fact[n];
    for (let bonds = 1; bonds < n; bonds += 1) {
      let arrangements = 0;
      for (let blocks = 1; blocks <= bonds; blocks += 1) {
        const choices = mulMod(choose(tables, bonds - 1, blocks - 1), choose(tables, n - bonds, blocks), m);
        arrangements = (arrangements + mulMod(choices, powers[blocks], m)) % m;
      }
      const term = mulMod(arrangements, tables.fact[n - bonds], m);
      total = bonds % 2 === 0 ? (total + term) % m : (total - term + m) % m;
    }
    return total;
  }
  function gridCompletion(grid) {
    const n = grid.length, m = 1000000007;
    const tables = factorialTables(n);
    const rowA = new Array(n).fill(false), rowB = new Array(n).fill(false), colA = new Array(n).fill(false), colB = new Array(n).fill(false);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
      if (grid[i][j] === "A") { rowA[i] = true; colA[j] = true; }
      if (grid[i][j] === "B") { rowB[i] = true; colB[j] = true; }
    }
    let freeA = 0, freeB = 0, rowsBoth = 0, colsBoth = 0, blockA = 0, blockB = 0;
    for (let i = 0; i < n; i += 1) { if (!rowA[i]) freeA += 1; if (!rowB[i]) freeB += 1; if (!rowA[i] && !rowB[i]) rowsBoth += 1; if (!colA[i] && !colB[i]) colsBoth += 1; }
    // A placed letter blocks the other letter's new placement when its row and column still need that letter.
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
      if (grid[i][j] === "B" && !rowA[i] && !colA[j]) blockA += 1;
      if (grid[i][j] === "A" && !rowB[i] && !colB[j]) blockB += 1;
    }
    const avoiding = (free, blocked, used) => {
      let total = 0;
      for (let j = 0; j <= blocked && j <= free - used; j += 1) {
        const term = mulMod(choose(tables, blocked, j), tables.fact[free - used - j], m);
        total = j % 2 === 0 ? (total + term) % m : (total - term + m) % m;
      }
      return total;
    };
    // Inclusion–exclusion over i cells where the new A and the new B would land together.
    let total = 0;
    for (let i = 0; i <= Math.min(rowsBoth, colsBoth, freeA, freeB); i += 1) {
      const clash = mulMod(mulMod(choose(tables, rowsBoth, i), choose(tables, colsBoth, i), m), tables.fact[i], m);
      const term = mulMod(clash, mulMod(avoiding(freeA, blockA, i), avoiding(freeB, blockB, i), m), m);
      total = i % 2 === 0 ? (total + term) % m : (total - term + m) % m;
    }
    return total;
  }
  function countingReorders(s) {
    const m = 1000000007, n = s.length;
    const tables = factorialTables(n);
    const count = new Array(26).fill(0);
    for (let i = 0; i < n; i += 1) count[s.charCodeAt(i) - 97] += 1;
    // Each letter glued into j blocks: C(c − 1, j − 1) ways, sign (−1)^(c − j), and 1/j! since its blocks are alike.
    let product = [1];
    count.forEach((c) => {
      if (!c) return;
      const factor = new Array(c + 1).fill(0);
      for (let j = 1; j <= c; j += 1) {
        const value = mulMod(choose(tables, c - 1, j - 1), tables.inverseFact[j], m);
        factor[j] = (c - j) % 2 === 0 ? value : (m - value) % m;
      }
      const next = new Array(product.length + c).fill(0);
      for (let a = 0; a < product.length; a += 1) {
        if (!product[a]) continue;
        for (let b = 1; b <= c; b += 1) next[a + b] = (next[a + b] + mulMod(product[a], factor[b], m)) % m;
      }
      product = next;
    });
    let total = 0;
    for (let blocks = 0; blocks < product.length; blocks += 1) total = (total + mulMod(product[blocks], tables.fact[blocks], m)) % m;
    return total;
  }
  function tournamentGraphDistribution(n) {
    const m = 1000000007;
    const tables = factorialTables(n);
    const all = [1], strong = [0];
    for (let size = 1; size <= n; size += 1) all.push(modPow(2, size * (size - 1) / 2, m));
    // The strongly connected pieces of a tournament form a chain; peel off the first one.
    for (let size = 1; size <= n; size += 1) {
      let value = all[size];
      for (let first = 1; first < size; first += 1) value = (value - mulMod(mulMod(choose(tables, size, first), strong[first], m), all[size - first], m) + m) % m;
      strong.push(value);
    }
    // Divided by size!, a chain of pieces is a plain convolution power of the strong counts.
    const piece = strong.map((value, size) => mulMod(value, tables.inverseFact[size], m));
    let layer = new Array(n + 1).fill(0);
    layer[0] = 1;
    const answers = [];
    for (let pieces = 1; pieces <= n; pieces += 1) {
      const next = new Array(n + 1).fill(0);
      for (let size = pieces; size <= n; size += 1) {
        let value = 0;
        for (let first = 1; first <= size - pieces + 1; first += 1) value = (value + mulMod(piece[first], layer[size - first], m)) % m;
        next[size] = value;
      }
      layer = next;
      answers.push(mulMod(layer[n], tables.fact[n], m));
    }
    return answers;
  }
  function collectingNumbersDistribution(n) {
    const m = 1000000007;
    // Rounds = 1 + descents of the positions of 1, 2, …, n: an Eulerian number, built row by row.
    let row = [1];
    for (let size = 2; size <= n; size += 1) {
      const next = new Array(size).fill(0);
      for (let d = 0; d < size; d += 1) next[d] = ((d + 1) * (row[d] || 0) + (size - d) * (d > 0 ? row[d - 1] : 0)) % m;
      row = next;
    }
    return row;
  }
  function functionalGraphDistribution(n) {
    const m = 1000000007;
    const tables = factorialTables(n);
    // weight[c]: choose the c cyclic nodes and hang the rest as a forest rooted at them (c · n^(n−c−1) ways).
    const weight = new Array(n + 1).fill(0);
    for (let c = 1; c <= n; c += 1) weight[c] = mulMod(choose(tables, n, c), c === n ? 1 : mulMod(c, modPow(n, n - c - 1, m), m), m);
    // Components are the cycles on the cyclic nodes: Σ weight[c] · x(x+1)…(x+c−1), folded Horner-style from c = n down.
    let poly = [weight[n]];
    for (let c = n - 1; c >= 1; c -= 1) {
      const next = new Array(poly.length + 1).fill(0);
      for (let k = 0; k < poly.length; k += 1) { next[k] = (next[k] + c * poly[k]) % m; next[k + 1] = (next[k + 1] + poly[k]) % m; }
      next[0] = (next[0] + weight[c]) % m;
      poly = next;
    }
    const answers = [];
    for (let k = 1; k <= n; k += 1) answers.push(poly[k - 1] || 0);
    return answers;
  }

  // ------------------------------------------------------------------ brute forces (small inputs only)
  const BRUTE_MOD = 1000000007n;
  function allPermutations(n) {
    const out = [], used = new Array(n + 1).fill(false), current = [];
    const walk = () => {
      if (current.length === n) { out.push(current.slice()); return; }
      for (let v = 1; v <= n; v += 1) if (!used[v]) { used[v] = true; current.push(v); walk(); current.pop(); used[v] = false; }
    };
    walk();
    return out;
  }
  function subgridLetters(grid, r1, c1, r2, c2) {
    const seen = new Set();
    for (let i = r1; i <= r2; i += 1) for (let j = c1; j <= c2; j += 1) seen.add(grid[i][j]);
    return seen;
  }
  function borderLetters(grid, r1, c1, r2, c2) {
    const seen = new Set();
    for (let j = c1; j <= c2; j += 1) { seen.add(grid[r1][j]); seen.add(grid[r2][j]); }
    for (let i = r1; i <= r2; i += 1) { seen.add(grid[i][c1]); seen.add(grid[i][c2]); }
    return seen;
  }
  function eachSubgrid(n, squares, visit) {
    for (let r1 = 0; r1 < n; r1 += 1) for (let c1 = 0; c1 < n; c1 += 1) for (let r2 = r1; r2 < n; r2 += 1) for (let c2 = c1; c2 < n; c2 += 1) if (!squares || r2 - r1 === c2 - c1) visit(r1, c1, r2, c2);
  }
  function uniformCounts(grid, k, squares, letters) {
    const counts = new Array(k).fill(0);
    eachSubgrid(grid.length, squares, (r1, c1, r2, c2) => { const seen = letters(grid, r1, c1, r2, c2); if (seen.size === 1) counts[seen.values().next().value.charCodeAt(0) - 65] += 1; });
    return counts;
  }
  function filledSubgridCountIBrute(grid, k) { return uniformCounts(grid, k, true, subgridLetters); }
  function filledSubgridCountIIBrute(grid, k) { return uniformCounts(grid, k, false, subgridLetters); }
  function borderSubgridCountIBrute(grid, k) { return uniformCounts(grid, k, true, borderLetters); }
  function borderSubgridCountIIBrute(grid, k) { return uniformCounts(grid, k, false, borderLetters); }
  function allLetterCount(grid, k, squares) {
    let total = 0;
    eachSubgrid(grid.length, squares, (r1, c1, r2, c2) => { if (subgridLetters(grid, r1, c1, r2, c2).size === k) total += 1; });
    return total;
  }
  function allLetterSubgridCountIBrute(grid, k) { return allLetterCount(grid, k, true); }
  function allLetterSubgridCountIIBrute(grid, k) { return allLetterCount(grid, k, false); }
  function raabGameIIBrute(tests) {
    return tests.map(([n, a, b]) => {
      let count = 0;
      allPermutations(n).forEach((q) => { let wins = 0, losses = 0; q.forEach((v, i) => { if (i + 1 > v) wins += 1; else if (i + 1 < v) losses += 1; }); if (wins === a && losses === b) count += 1; });
      let fact = 1;
      for (let i = 2; i <= n; i += 1) fact *= i;
      return Number(BigInt(count) * BigInt(fact) % BRUTE_MOD);
    });
  }
  function emptyStringBrute(s) {
    const memo = new Map();
    const ways = (text) => {
      if (text === "") return 1n;
      if (memo.has(text)) return memo.get(text);
      let total = 0n;
      for (let i = 0; i + 1 < text.length; i += 1) if (text[i] === text[i + 1]) total += ways(text.slice(0, i) + text.slice(i + 2));
      memo.set(text, total);
      return total;
    };
    return Number(ways(s) % BRUTE_MOD);
  }
  function permutationInversionsBrute(n, k) {
    return allPermutations(n).filter((p) => { let inv = 0; for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (p[i] > p[j]) inv += 1; return inv === k; }).length;
  }
  function countingBishopsBrute(n, k) {
    const cells = [];
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) cells.push([i, j]);
    let count = 0;
    const place = (start, left, used1, used2) => {
      if (left === 0) { count += 1; return; }
      for (let t = start; t < cells.length; t += 1) {
        const [i, j] = cells[t];
        if (used1.has(i + j) || used2.has(i - j)) continue;
        used1.add(i + j); used2.add(i - j);
        place(t + 1, left - 1, used1, used2);
        used1.delete(i + j); used2.delete(i - j);
      }
    };
    place(0, k, new Set(), new Set());
    return count % 1000000007;
  }
  function countingSequencesBrute(n, k) {
    let count = 0;
    const seq = [];
    const walk = () => {
      if (seq.length === n) { if (new Set(seq).size === k) count += 1; return; }
      for (let v = 1; v <= k; v += 1) { seq.push(v); walk(); seq.pop(); }
    };
    walk();
    return count;
  }
  function gridPathsIIBrute(n, traps) {
    const blocked = new Set(traps.map(([y, x]) => y * (n + 1) + x));
    const ways = [];
    for (let y = 0; y <= n; y += 1) ways.push(new Array(n + 1).fill(0n));
    for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) {
      if (blocked.has(y * (n + 1) + x)) continue;
      ways[y][x] = y === 1 && x === 1 ? 1n : ways[y - 1][x] + ways[y][x - 1];
    }
    return Number(ways[n][n] % BRUTE_MOD);
  }
  function countingPermutationsBrute(n) { return allPermutations(n).filter((p) => p.every((v, i) => i === 0 || Math.abs(v - p[i - 1]) !== 1)).length; }
  function gridCompletionBrute(grid) {
    const n = grid.length, perms = allPermutations(n);
    const fits = (perm, letter) => perm.every((c, i) => { for (let j = 0; j < n; j += 1) { if (grid[i][j] === letter && j !== c - 1) return false; } return true; });
    const aList = perms.filter((p) => fits(p, "A")), bList = perms.filter((p) => fits(p, "B"));
    let count = 0;
    aList.forEach((a) => bList.forEach((b) => { if (a.every((c, i) => c !== b[i] && grid[i][c - 1] !== "B" && grid[i][b[i] - 1] !== "A")) count += 1; }));
    return count;
  }
  function countingReordersBrute(s) {
    const count = new Map();
    for (const ch of s) count.set(ch, (count.get(ch) || 0) + 1);
    let total = 0;
    const walk = (last, left) => {
      if (left === 0) { total += 1; return; }
      count.forEach((c, ch) => { if (c > 0 && ch !== last) { count.set(ch, c - 1); walk(ch, left - 1); count.set(ch, c); } });
    };
    walk("", s.length);
    return total;
  }
  function sccCount(n, edges) {
    const reach = [];
    for (let v = 0; v < n; v += 1) {
      const seen = new Array(n).fill(false), stack = [v];
      seen[v] = true;
      while (stack.length) { const x = stack.pop(); edges.forEach(([a, b]) => { if (a === x && !seen[b]) { seen[b] = true; stack.push(b); } }); }
      reach.push(seen);
    }
    const label = new Array(n).fill(-1);
    let count = 0;
    for (let v = 0; v < n; v += 1) { if (label[v] >= 0) continue; for (let u = 0; u < n; u += 1) if (reach[v][u] && reach[u][v]) label[u] = count; count += 1; }
    return count;
  }
  function tournamentGraphDistributionBrute(n) {
    const pairs = [];
    for (let a = 0; a < n; a += 1) for (let b = a + 1; b < n; b += 1) pairs.push([a, b]);
    const out = new Array(n).fill(0);
    for (let mask = 0; mask < Math.pow(2, pairs.length); mask += 1) out[sccCount(n, pairs.map(([a, b], i) => (mask & (1 << i) ? [b, a] : [a, b]))) - 1] += 1;
    return out;
  }
  function collectingNumbersDistributionBrute(n) {
    const out = new Array(n).fill(0);
    allPermutations(n).forEach((array) => { const at = new Array(n + 1); array.forEach((v, i) => { at[v] = i; }); let rounds = 1; for (let v = 1; v < n; v += 1) if (at[v + 1] < at[v]) rounds += 1; out[rounds - 1] += 1; });
    return out;
  }
  function functionalGraphDistributionBrute(n) {
    const out = new Array(n).fill(0), f = new Array(n).fill(0);
    const walk = (i) => {
      if (i === n) {
        const parent = Array.from({ length: n }, (x, v) => v);
        const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
        for (let v = 0; v < n; v += 1) parent[find(v)] = find(f[v]);
        let comps = 0;
        for (let v = 0; v < n; v += 1) if (find(v) === v) comps += 1;
        out[comps - 1] += 1;
        return;
      }
      for (let t = 0; t < n; t += 1) { f[i] = t; walk(i + 1); }
    };
    walk(0);
    return out;
  }

  // ------------------------------------------------------------------ input builders and helpers
  function letterGrid(seed, n, k) {
    const next = rng(seed), out = [];
    for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) row += String.fromCharCode(65 + Math.floor(next() * k)); out.push(row); }
    return out;
  }
  // Big blobs of one letter, so uniform and bordered subgrids are plentiful.
  function blobGrid(seed, n, k, blob) {
    const next = rng(seed), out = [];
    const colors = [];
    for (let r = 0; r < Math.ceil(n / blob); r += 1) { const row = []; for (let c = 0; c < Math.ceil(n / blob); c += 1) row.push(Math.floor(next() * k)); colors.push(row); }
    for (let r = 0; r < n; r += 1) { let row = ""; for (let c = 0; c < n; c += 1) row += String.fromCharCode(65 + (next() < 0.02 ? Math.floor(next() * k) : colors[Math.floor(r / blob)][Math.floor(c / blob)])); out.push(row); }
    return out;
  }
  function randomWord(seed, n, alphabet) { const next = rng(seed); let s = ""; for (let i = 0; i < n; i += 1) s += String.fromCharCode(97 + Math.floor(next() * alphabet)); return s; }
  // Words built from nested and side-by-side equal pairs, so they can always be erased.
  function erasableWord(seed, n, alphabet) {
    const next = rng(seed);
    const build = (length) => {
      if (length === 0) return "";
      const inner = 2 * Math.floor(next() * (length / 2));
      const letter = String.fromCharCode(97 + Math.floor(next() * alphabet));
      return letter + build(inner) + letter + build(length - 2 - inner);
    };
    return build(n - (n % 2));
  }
  function randomTraps(seed, n, m) {
    const next = rng(seed), seen = new Set(), out = [];
    while (out.length < m && seen.size < n * n - 2) {
      const y = 1 + Math.floor(next() * n), x = 1 + Math.floor(next() * n);
      if ((y === 1 && x === 1) || (y === n && x === n) || seen.has(y * (n + 1) + x)) continue;
      seen.add(y * (n + 1) + x); out.push([y, x]);
    }
    return out;
  }
  // Traps near the main diagonal of a huge grid, where they actually block paths.
  function diagonalTraps(seed, n, m) {
    const next = rng(seed), seen = new Set(), out = [];
    while (out.length < m) {
      const t = 1 + Math.floor(next() * n), y = Math.max(1, Math.min(n, t + Math.floor(next() * 5) - 2)), x = Math.max(1, Math.min(n, t + Math.floor(next() * 5) - 2));
      if ((y === 1 && x === 1) || (y === n && x === n) || seen.has(y * (n + 1) + x)) continue;
      seen.add(y * (n + 1) + x); out.push([y, x]);
    }
    return out;
  }
  // A valid partial A/B grid: complete a random pair of permutations, then keep some letters.
  function partialGrid(seed, n, keep) {
    const next = rng(seed), a = randomPermutation(seed + 1, n);
    let b = randomPermutation(seed + 2, n);
    for (let tries = 0; a.some((c, i) => c === b[i]) && tries < 200; tries += 1) b = randomPermutation(seed + 3 + tries, n);
    const rows = [];
    for (let i = 0; i < n; i += 1) {
      const row = new Array(n).fill(".");
      if (a[i] !== b[i]) { if (next() < keep) row[a[i] - 1] = "A"; if (next() < keep) row[b[i] - 1] = "B"; }
      rows.push(row.join(""));
    }
    return rows;
  }
  function multisetWord(seed, n, alphabet) { return randomWord(seed, n, alphabet); }
  function raabTests(seed, count, largest) {
    const next = rng(seed), out = [];
    for (let i = 0; i < count; i += 1) { const n = 1 + Math.floor(next() * largest); const a = Math.floor(next() * (n + 1)), b = Math.floor(next() * (n + 1 - a)); out.push([n, a, b]); }
    return out;
  }
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

  // A small board drawn with '#' for traps, for the Grid Paths II scene.
  function trapBoard(n, traps) { const rows = []; for (let y = 1; y <= n; y += 1) { let row = ""; for (let x = 1; x <= n; x += 1) row += traps.some((t) => t[0] === y && t[1] === x) ? "#" : "."; rows.push(row); } return rows; }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const BLOBS_BIG = lazy(() => blobGrid(1501, 3000, 26, 40));
  const LETTERS_WIDE = lazy(() => letterGrid(1502, 1000, 26));
  const LETTERS_THREE = lazy(() => letterGrid(1503, 2000, 3));
  const LETTERS_FOUR_HUNDRED = lazy(() => letterGrid(1504, 350, 26));
  const BORDER_BIG = lazy(() => blobGrid(1505, 1500, 5, 30));
  const BORDER_RECT = lazy(() => blobGrid(1506, 500, 3, 20));
  const RAAB_BIG = lazy(() => raabTests(1507, 1000, 5000));
  const EMPTY_BIG = lazy(() => erasableWord(1508, 500, 3));
  const TRAPS_BIG = lazy(() => diagonalTraps(1509, 1000000, 1000));
  const COMPLETION_BIG = lazy(() => partialGrid(1510, 500, 0.3));
  const REORDER_BIG = lazy(() => randomWord(1511, 3000, 26));
  const REORDER_TWO = lazy(() => randomWord(1512, 2000, 3));

  const SAMPLE_GRID = ["ABBBC", "BBBBC", "BCAAA", "AAAAA", "AAAAA"];
  const SAMPLE_BORDER_GRID = ["ABBBC", "ABABC", "ABBBC", "ABBBC", "CCCCC"];

  const COUNTING = [
    {
      id: "filled-subgrid-count-i", title: "Filled Subgrid Count I", cses: { id: 3413, name: "Filled Subgrid Count I" },
      goal: "For each of the first k letters, the number of square subgrids made entirely of that letter.",
      concept: "Let size(i, j) be the side of the largest one-letter square with its bottom-right corner at (i, j). When the three neighbours above, to the left and diagonally share the letter, size(i, j) = 1 + the smallest of their sizes; otherwise it is 1. Every one-letter square ends at exactly one bottom-right corner, and that corner ends squares of sides 1 … size, so adding size(i, j) to its letter counts everything in O(n²).",
      functionName: "filledSubgridCountI", signature: "filledSubgridCountI(grid, k) → counts",
      starterSource: starter("filledSubgridCountI", "grid, k", "Row by row: size = 1 + min(three neighbours) when they share the letter, else 1; add size to that letter's count."),
      solve: filledSubgridCountI, comparator: "deep", brute: filledSubgridCountIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [round % 2 ? letterGrid(15000 + round, n, k) : blobGrid(15100 + round, n, k, 2), k]; },
      reference: book("7.5", "Paths in a grid"),
      presets: { "CSES sample": { a: SAMPLE_GRID, b: 3 }, "one letter": { a: ["AAA", "AAA", "AAA"], b: 1 }, "a checkerboard": { a: ["AB", "BA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("checks-the-diagonal-only", "A square grows only if the cells above and to the left share the letter too, not just the diagonal one.", filledSubgridCountI, [["up.charCodeAt(j) === c && row.charCodeAt(j - 1) === c && up.charCodeAt(j - 1) === c", "up.charCodeAt(j - 1) === c"]]),
        variant("grows-from-the-largest", "The square is limited by its weakest neighbour: take the smallest of the three sizes.", filledSubgridCountI, [["Math.min(above[j], current[j - 1], above[j - 1])", "Math.max(above[j], current[j - 1], above[j - 1])"]]),
      ],
      hints: ["Keep the sizes of the previous row and of the current row.", "size(i, j) = 1 + min(size up, size left, size up-left) when those three cells have the letter of (i, j); otherwise 1.", "Add size(i, j) to the count of the letter at (i, j)."],
      cases: [
        example([SAMPLE_GRID, 3], [21, 10, 3], "CSES sample"),
        example([["AAA", "AAA", "AAA"], 1], [14], "a 3 × 3 block holds 9 + 4 + 1 squares"),
        example([["AB", "BA"], 2], [2, 2], "a checkerboard has only single cells"),
        run(filledSubgridCountI, [blobGrid(15200, 8, 3, 3), 3], "eight by eight"),
        hidden("n = 3000, k = 26, time limit", () => [BLOBS_BIG(), 26]),
      ],
    },
    {
      id: "filled-subgrid-count-ii", title: "Filled Subgrid Count II", cses: { id: 3414, name: "Filled Subgrid Count II" },
      goal: "For each of the first k letters, the number of rectangular subgrids made entirely of that letter.",
      concept: "Fix the bottom row. height[j] counts the cells of the same letter stacked upwards from (i, j). Within a run of one letter along the row, the rectangles with bottom-right corner j number sum[j] = sum[l] + height[j] · (j − l), where l is the last column to the left with a smaller height, found with a monotonic stack. A letter change ends every rectangle, so the stack restarts there. Each row is O(n), the grid O(n²).",
      functionName: "filledSubgridCountII", signature: "filledSubgridCountII(grid, k) → counts",
      starterSource: starter("filledSubgridCountII", "grid, k", "Heights of same-letter stacks; per row a monotonic stack restarted at letter changes; sum[j] = sum[l] + height[j] · (j − l)."),
      solve: filledSubgridCountII, comparator: "deep", brute: filledSubgridCountIIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [round % 2 ? letterGrid(15300 + round, n, k) : blobGrid(15400 + round, n, k, 2), k]; },
      reference: book("7.5", "Paths in a grid"),
      presets: { "CSES sample": { a: SAMPLE_GRID, b: 3 }, "one letter": { a: ["AA", "AA"], b: 1 }, "stripes": { a: ["AAA", "BBB", "AAA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("ignores-letter-changes", "A rectangle cannot cross a letter change in its bottom row; restart the stack there.", filledSubgridCountII, [["if (j > 0 && row.charCodeAt(j) !== row.charCodeAt(j - 1)) { top = 0; runStart = j; }", ""]]),
        variant("counts-columns-only", "Rectangles can be wider than one column: add the rectangles reaching further left, sum[l] + height · (j − l).", filledSubgridCountII, [["sum[j] = (top > 0 ? sum[left] : 0) + height[j] * (j - left);", "sum[j] = height[j];"]]),
      ],
      hints: ["height[j] = height[j] + 1 if the cell above has the same letter, else 1.", "In a run of one letter: pop the stack while its top is at least as tall; l = the new top, or the run's start − 1.", "sum[j] = (stack was non-empty ? sum[l] : 0) + height[j] · (j − l); add it to the letter's count."],
      cases: [
        example([SAMPLE_GRID, 3], [64, 24, 4], "CSES sample"),
        example([["AA", "AA"], 1], [9], "a 2 × 2 block holds 9 rectangles"),
        example([["AAA", "BBB", "AAA"], 2], [12, 6], "stripes"),
        run(filledSubgridCountII, [blobGrid(15500, 8, 3, 3), 3], "eight by eight"),
        hidden("n = 3000, k = 26, time limit", () => [BLOBS_BIG(), 26]),
      ],
    },
    {
      id: "all-letter-subgrid-count-i", title: "All Letter Subgrid Count I", cses: { id: 3415, name: "All Letter Subgrid Count I" },
      goal: "The number of square subgrids that contain every one of the first k letters.",
      concept: "For one letter, let side(i, j) be the smallest square with top-left corner (i, j) that contains it: 1 if the cell holds the letter, otherwise 1 + the smallest side of the three squares starting right, below and diagonally, which together cover the bigger square. A square contains all letters once it reaches the largest of these sides over the letters. Every larger square from the same corner also works, so each corner adds (room − need + 1).",
      functionName: "allLetterSubgridCountI", signature: "allLetterSubgridCountI(grid, k) → count",
      starterSource: starter("allLetterSubgridCountI", "grid, k", "Per letter a bottom-up DP of the smallest square holding it; need = max over letters; each corner adds room − need + 1."),
      solve: allLetterSubgridCountI, comparator: "scalar", brute: allLetterSubgridCountIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [letterGrid(15600 + round, n, k), k]; },
      reference: book("7.5", "Paths in a grid"),
      presets: { "CSES sample": { a: SAMPLE_GRID, b: 3 }, "two letters": { a: ["AB", "BA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("any-letter-suffices", "The square needs every letter, so it must reach the largest of the per-letter sizes, not the smallest.", allLetterSubgridCountI, [["if (current[j] > need[i * n + j]) need[i * n + j] = current[j];", "if (letter === 0 || current[j] < need[i * n + j]) need[i * n + j] = current[j];"]]),
        variant("one-size-short", "Sizes need … room all work: that is room − need + 1 squares.", allLetterSubgridCountI, [["total += room - s + 1;", "total += room - s;"]]),
      ],
      hints: ["For each letter, from the bottom-right: side = 1 if the cell holds the letter, else 1 + min(side right, side below, side diagonal), with ∞ outside.", "need(i, j) = max over the letters of side(i, j).", "room = min(n − i, n − j); when need ≤ room, add room − need + 1."],
      cases: [
        example([SAMPLE_GRID, 3], 15, "CSES sample"),
        example([["AB", "BA"], 2], 1, "only the whole grid"),
        example([["A"], 1], 1, "one letter, one cell"),
        run(allLetterSubgridCountI, [letterGrid(15700, 8, 3), 3], "eight by eight"),
        hidden("n = 1000, k = 26 (CSES allows n = 3000), time limit", () => [LETTERS_WIDE(), 26]),
        hidden("n = 2000, k = 3", () => [LETTERS_THREE(), 3]),
      ],
    },
    {
      id: "all-letter-subgrid-count-ii", title: "All Letter Subgrid Count II", cses: { id: 3416, name: "All Letter Subgrid Count II" },
      goal: "The number of rectangular subgrids that contain every one of the first k letters (n ≤ 500).",
      concept: "Fix the top and bottom rows; each column becomes one bitmask of the letters it holds between them, updated in O(n) as the bottom row moves down. Now count column ranges whose OR is all k bits with two pointers: for each right end keep the window as short as possible while it stays complete, and then every left end up to the window's start works. The OR must survive removals at the front, so the window is a queue made of two stacks with running ORs. Total O(n³).",
      functionName: "allLetterSubgridCountII", signature: "allLetterSubgridCountII(grid, k) → count",
      starterSource: starter("allLetterSubgridCountII", "grid, k", "Top row, then bottom row with column masks OR-ed in; two pointers over columns with a two-stack OR queue; add left + 1 when complete."),
      solve: allLetterSubgridCountII, comparator: "scalar", brute: allLetterSubgridCountIIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [letterGrid(15800 + round, n, k), k]; },
      reference: book("8.2", "Sliding window"),
      presets: { "CSES sample": { a: SAMPLE_GRID, b: 3 }, "two letters": { a: ["AB", "BA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("one-per-right-end", "When the shortest complete window starts at column l, every left end 0 … l also works: add l + 1.", allLetterSubgridCountII, [["total += left + 1;", "total += 1;"]]),
        variant("misses-the-last-letter", "All k letters are needed: the full mask is (1 << k) − 1.", allLetterSubgridCountII, [["full = (1 << k) - 1", "full = (1 << (k - 1)) - 1"]]),
      ],
      hints: ["Masks: bit (letter − 'A'); for top = 0 … n − 1 clear the column masks, then for bottom = top … n − 1 OR in row bottom.", "Two pointers over columns: push column r at the back; while the window without its first column still has every bit, pop the front.", "The queue is two stacks, the front one storing suffix ORs; when the window's OR is complete add left + 1."],
      cases: [
        example([SAMPLE_GRID, 3], 70, "CSES sample"),
        example([["AB", "BA"], 2], 5, "two letters"),
        example([["A"], 1], 1, "one cell"),
        run(allLetterSubgridCountII, [letterGrid(15900, 7, 3), 3], "seven by seven"),
        hidden("n = 350, k = 26 (CSES allows n = 500), time limit", () => [LETTERS_FOUR_HUNDRED(), 26]),
      ],
    },
    {
      id: "border-subgrid-count-i", title: "Border Subgrid Count I", cses: { id: 3417, name: "Border Subgrid Count I" },
      goal: "For each of the first k letters, the number of square subgrids whose border consists of that letter.",
      concept: "A square is fixed by its top-left corner p and bottom-right corner q on one diagonal. The top and left sides need runs from p of at least the side length, and the bottom and right sides need runs from q. So along each diagonal, p stays usable for q up to p + reach(p) − 1, and q can use any p at least q − back(q) + 1. Sweep q, add and expire the p's in a Fenwick tree, and count the usable ones in range: O(n² log n).",
      functionName: "borderSubgridCountI", signature: "borderSubgridCountI(grid, k) → counts",
      starterSource: starter("borderSubgridCountI", "grid, k", "Runs in four directions; per diagonal, p is open for q ≤ p + min(right, down) − 1; q counts open p ≥ q − min(left, up) + 1 in a Fenwick tree."),
      solve: borderSubgridCountI, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix"], brute: borderSubgridCountIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [round % 2 ? letterGrid(16000 + round, n, k) : blobGrid(16100 + round, n, k, 2), k]; },
      reference: book("9.2", "Binary indexed tree"),
      presets: { "CSES sample": { a: SAMPLE_BORDER_GRID, b: 3 }, "a ring": { a: ["AAA", "ABA", "AAA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("top-left-corner-only", "The bottom and right sides are checked from the bottom-right corner: q only reaches back min(left, up) cells.", borderSubgridCountI, [["const back = Math.min(left[cell], up[cell]);", "const back = q + 1;"]]),
        variant("checks-one-side", "From the top-left corner both the top side and the left side must be long enough: min(right, down).", borderSubgridCountI, [["const reach = Math.min(right[cell], down[cell]);", "const reach = right[cell];"]]),
      ],
      hints: ["right, down, left, up: how many cells of the same letter run from each cell in that direction, itself included.", "On a diagonal at position q: open p = q until q + min(right, down) (exclusive), and close the p's whose time is up.", "Add (open p's in [q − min(left, up) + 1, q]) to the letter at q, using fenwickPrefix differences."],
      cases: [
        example([SAMPLE_BORDER_GRID, 3], [5, 14, 9], "CSES sample"),
        example([["AAA", "ABA", "AAA"], 2], [9, 1], "a ring around one B"),
        example([["AB", "BA"], 2], [2, 2], "single cells only"),
        run(borderSubgridCountI, [blobGrid(16200, 8, 3, 3), 3], "eight by eight"),
        hidden("n = 1500, k = 5 (CSES allows n = 3000), time limit", () => [BORDER_BIG(), 5]),
      ],
    },
    {
      id: "border-subgrid-count-ii", title: "Border Subgrid Count II", cses: { id: 3418, name: "Border Subgrid Count II" },
      goal: "For each of the first k letters, the number of rectangular subgrids whose border consists of that letter (n ≤ 500).",
      concept: "Fix the top and bottom rows. The rectangle's top and bottom sides need both rows to show one letter along a stretch of columns, and its left and right sides must be pillars: columns whose cells from top to bottom all share that letter. Within one such stretch any two pillars, or one pillar alone, close a border. So scan the columns keeping the number of pillars in the current stretch: O(n³).",
      functionName: "borderSubgridCountII", signature: "borderSubgridCountII(grid, k) → counts",
      starterSource: starter("borderSubgridCountII", "grid, k", "down runs per cell; for each pair of rows scan columns: stretches where both rows show one letter; each pillar adds the pillars so far."),
      solve: borderSubgridCountII, comparator: "deep", brute: borderSubgridCountIIBrute, small: (round) => { const n = 1 + (round % 6), k = 1 + (round % 3); return [round % 2 ? letterGrid(16300 + round, n, k) : blobGrid(16400 + round, n, k, 2), k]; },
      reference: book("7.5", "Paths in a grid"),
      presets: { "CSES sample": { a: SAMPLE_BORDER_GRID, b: 3 }, "a ring": { a: ["AAA", "ABA", "AAA"], b: 2 } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("no-pillar-check", "The left and right sides must also be the letter all the way down; only pillar columns can be sides.", borderSubgridCountII, [["if (down[top][j] >= tall) { pillars += 1; counts[c - 65] += pillars; }", "pillars += 1; counts[c - 65] += pillars;"]]),
        variant("pairs-only", "A single pillar is a rectangle of width one; count it too.", borderSubgridCountII, [["counts[c - 65] += pillars; }", "counts[c - 65] += pillars - 1; }"]]),
      ],
      hints: ["down[i][j] = the length of the same-letter run from (i, j) downwards.", "For rows top ≤ bottom, scan the columns; a column continues the stretch when both rows show the same letter here and in the previous column.", "A column is a pillar when down[top][j] ≥ bottom − top + 1; each pillar adds the number of pillars so far in the stretch."],
      cases: [
        example([SAMPLE_BORDER_GRID, 3], [11, 38, 29], "CSES sample"),
        example([["AAA", "ABA", "AAA"], 2], [21, 1], "a ring around one B"),
        example([["AB", "BA"], 2], [2, 2], "single cells only"),
        run(borderSubgridCountII, [blobGrid(16500, 7, 3, 3), 3], "seven by seven"),
        hidden("n = 500, k = 3, time limit", () => [BORDER_RECT(), 3]),
      ],
    },
    {
      id: "raab-game-ii", title: "Raab Game II", cses: { id: 3400, name: "Raab Game II" },
      goal: "For each test [n, a, b], the number of games where the players' final scores are a and b, modulo 10⁹ + 7.",
      concept: "Order the turns by the first player's card; that order can be any of n! ways. What remains is a permutation of the second player's cards: a positions where it is lower, b where it is higher, and n − a − b ties. Choose the tie positions, C(n, n − a − b) ways, and the rest must form a derangement of a + b cards with exactly b cards above their place. Those counts satisfy d(m, b) = b·d(m−1, b) + (m−b)·d(m−1, b−1) + (m−1)·d(m−2, b−1), filled row by row once for all tests.",
      functionName: "raabGameII", signature: "raabGameII(tests) → counts",
      starterSource: starter("raabGameII", "tests", "Rows of d(m, ·) for m = 0 … max n; each test with a + b = m reads n! · C(n, n − m) · d(m, b)."),
      solve: raabGameII, comparator: "deep", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: raabGameIIBrute, small: (round) => [raabTests(16600 + round, 4, 6)],
      reference: book("22.3", "Derangements"),
      presets: { "CSES sample": { a: [3, 1, 2], b: [[3, 1, 2], [2, 0, 1], [5, 2, 2], [9, 3, 5], [4, 4, 1]] }, "all ties": { a: [4, 0, 0], b: [[4, 0, 0]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetB" }] },
      diagnoses: [
        variant("forgets-the-first-players-order", "The first player's cards can come in any of n! orders, and each gives a different game.", raabGameII, [["mulMod(mulMod(tables.fact[n], choose(tables, n, n - size), m), row[b] || 0, m)", "mulMod(choose(tables, n, n - size), row[b] || 0, m)"]]),
        variant("forgets-the-tie-positions", "The n − a − b ties can sit at any positions: multiply by C(n, n − a − b).", raabGameII, [["mulMod(mulMod(tables.fact[n], choose(tables, n, n - size), m), row[b] || 0, m)", "mulMod(tables.fact[n], row[b] || 0, m)"]]),
      ],
      hints: ["Group the tests by m = a + b (tests with a + b > n answer 0).", "d(0, 0) = 1, d(1, ·) = 0, and d(m, b) = b·d(m−1, b) + (m−b)·d(m−1, b−1) + (m−1)·d(m−2, b−1).", "A test (n, a, b) answers n! · C(n, n − m) · d(m, b)."],
      cases: [
        example([[[3, 1, 2], [2, 0, 1], [5, 2, 2], [9, 3, 5], [4, 4, 1]]], [6, 0, 4200, 976757050, 0], "CSES sample"),
        example([[[4, 0, 0]]], [24], "all ties: the second player copies the first"),
        example([[[1, 0, 0], [1, 1, 0]]], [1, 0], "one card"),
        run(raabGameII, [raabTests(16700, 6, 8)], "six small tests"),
        hidden("t = 1000, n ≤ 5000, time limit", () => [RAAB_BIG()]),
      ],
    },
    {
      id: "empty-string", title: "Empty String", cses: { id: 1080, name: "Empty String" },
      goal: "The number of ways to erase the whole string by repeatedly removing two equal adjacent letters, modulo 10⁹ + 7.",
      concept: "In s[l..r], the first letter s[l] is removed together with some equal s[j], and only after everything between them is gone. So ways(l, r) = Σ over such j of ways(l+1, j−1) · ways(j+1, r) · C(steps, steps of the left block): the two independent parts can interleave their removal steps in any order. That is an O(n³) interval DP over even lengths.",
      functionName: "emptyString", signature: "emptyString(s) → count",
      starterSource: starter("emptyString", "s", "Interval DP: pair s[l] with an equal s[j]; multiply the inside, the rest, and C(total steps, steps of l..j)."),
      solve: emptyString, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: emptyStringBrute, small: (round) => [round % 3 ? erasableWord(16800 + round, 2 + (round % 9), 2) : randomWord(16850 + round, 1 + (round % 9), 2)],
      reference: book("7.4", "Knapsack problems · interval DP"),
      presets: { "CSES sample": { a: "aabccb" }, "all equal": { a: "aaaa" }, "not erasable": { a: "abab" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("forgets-interleaving", "The steps inside the pair and the steps to its right can be done in any interleaving: multiply by the binomial.", emptyString, [["mulMod(mulMod(inner, rest, m), choose(tables, length / 2, (j - l + 1) / 2), m)", "mulMod(inner, rest, m)"]]),
        variant("adjacent-pairs-only", "s[l] may pair with a letter further away once the letters between them are erased.", emptyString, [["for (let j = l + 1; j <= r; j += 2) {", "for (let j = l + 1; j <= l + 1; j += 2) {"]]),
      ],
      hints: ["ways(l, r) = 1 for an empty range; only even lengths can vanish.", "For j = l + 1, l + 3, … with s[j] = s[l]: inside = ways(l + 1, j − 1), rest = ways(j + 1, r).", "Add inside · rest · C((r − l + 1)/2, (j − l + 1)/2)."],
      cases: [
        example(["aabccb"], 3, "CSES sample"),
        example(["aaaa"], 3, "all equal"),
        example(["abab"], 0, "not erasable"),
        example(["a"], 0, "odd length"),
        run(emptyString, ["abbaccddaa"], "ten letters"),
        hidden("n = 500, time limit", () => [EMPTY_BIG()]),
      ],
    },
    {
      id: "permutation-inversions", title: "Permutation Inversions", cses: { id: 2229, name: "Permutation Inversions" },
      goal: "The number of permutations of 1 … n with exactly k inversions, modulo 10⁹ + 7.",
      concept: "Build the permutation by inserting n, n − 1, … into place: the value inserted at step i can go to any of i positions and creates 0 … i − 1 new inversions. So row_i[j] = row_(i−1)[j] + row_(i−1)[j−1] + … + row_(i−1)[j−i+1], a sliding-window sum over the previous row, O(n · k) in total.",
      functionName: "permutationInversions", signature: "permutationInversions(n, k) → count",
      starterSource: starter("permutationInversions", "n, k", "Rows over inversion counts; each new row is a sliding sum of window i over the previous one."),
      solve: permutationInversions, comparator: "scalar", brute: permutationInversionsBrute, small: (round) => { const n = 1 + (round % 7); return [n, round % (n * (n - 1) / 2 + 1)]; },
      reference: book("7.1", "Coin problem · counting solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 4, min: 1, max: 8 }, { id: "k", type: "slider", label: "k (rounded)", value: 3, min: 0, max: 20 }], args: [{ fixture: "roundedN" }, { fixture: "roundedK" }] },
      diagnoses: [
        variant("window-too-wide", "The i-th value creates at most i − 1 inversions, so the window holds i terms, not i + 1.", permutationInversions, [["if (j - i >= 0) window = (window - row[j - i] + m) % m;", "if (j - i - 1 >= 0) window = (window - row[j - i - 1] + m) % m;"]]),
        variant("at-most-k", "Exactly k inversions are wanted, not up to k.", permutationInversions, [["return row[k];", "return row.reduce((a, b) => (a + b) % m, 0);"]]),
      ],
      hints: ["row[0] = 1 for one element.", "For i = 2 … n: next[j] = Σ row[j − t] for t = 0 … i − 1, kept as a running window.", "Add row[j] and drop row[j − i] as j moves; answer row[k]."],
      cases: [
        example([4, 3], 6, "CSES sample"),
        example([3, 0], 1, "sorted"),
        example([3, 3], 1, "reversed"),
        example([5, 11], 0, "more inversions than possible"),
        run(permutationInversions, [7, 10], "seven values"),
        hidden("n = 500, k = 62 375, time limit", () => [500, 62375]),
      ],
    },
    {
      id: "counting-bishops", title: "Counting Bishops", cses: { id: 2176, name: "Counting Bishops" },
      goal: "The number of ways to place k bishops on an n × n board with no two attacking, modulo 10⁹ + 7.",
      concept: "Bishops on dark and light squares never meet, so count each color apart and combine. On one color, take its diagonals in one direction sorted by length. Each earlier bishop blocks exactly one square of the next, longer diagonal, so ways[i][j] = ways[i−1][j] + ways[i−1][j−1] · (length_i − (j − 1)). The answer is Σ_j dark[j] · light[k − j].",
      functionName: "countingBishops", signature: "countingBishops(n, k) → count",
      starterSource: starter("countingBishops", "n, k", "Diagonals split by color and sorted by length; knapsack-style DP of bishops per color; convolve the two colors."),
      solve: countingBishops, comparator: "scalar", dependencies: ["mul-mod"], brute: countingBishopsBrute, small: (round) => { const n = 1 + (round % 4); return [n, 1 + (round % (2 * n))]; },
      reference: book("7.1", "Coin problem · counting solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 10 }, { id: "k", type: "slider", label: "k (rounded)", value: 4, min: 1, max: 12 }], args: [{ fixture: "roundedN" }, { fixture: "roundedK" }] },
      diagnoses: [
        variant("unsorted-diagonals", "The 'one blocked square per earlier bishop' count only holds when diagonals come shortest first.", countingBishops, [["list.sort((p, q) => p - q);", ""]]),
        diagnosis("ignores-colors", "Diagonals of different colors never cross, so a bishop on one color blocks nothing on the other; count each color separately.", function countingBishops(n, k) { const m = 1000000007; if (k > 2 * n - 1) return 0; const list = []; for (let d = 0; d < 2 * n - 1; d += 1) list.push(d < n ? d + 1 : 2 * n - 1 - d); list.sort((p, q) => p - q); let row = new Array(k + 1).fill(0); row[0] = 1; list.forEach((length) => { const next = row.slice(); for (let j = 1; j <= k; j += 1) if (length - (j - 1) > 0) next[j] = (next[j] + mulMod(row[j - 1], length - (j - 1), m)) % m; row = next; }); return row[k]; }),
      ],
      hints: ["Diagonal d = i + j has length d + 1 for d < n and 2n − 1 − d after; its color is d mod 2.", "Per color, sorted by length: next[j] += row[j − 1] · (length − (j − 1)).", "Combine: Σ_j first[j] · second[k − j]; more than 2n − 1 bishops is impossible."],
      cases: [
        example([5, 4], 2728, "CSES sample"),
        example([2, 2], 4, "a 2 × 2 board"),
        example([3, 5], 0, "too many bishops"),
        example([1, 1], 1, "one square"),
        run(countingBishops, [6, 5], "a 6 × 6 board"),
        hidden("n = 500, k = 500, time limit", () => [500, 500]),
        hidden("n = 500, k = 998", () => [500, 998]),
      ],
    },
    {
      id: "counting-sequences", title: "Counting Sequences", cses: { id: 2228, name: "Counting Sequences" },
      goal: "The number of sequences of length n over 1 … k that use every value at least once, modulo 10⁹ + 7.",
      concept: "Inclusion–exclusion over the missing values: Σ_i (−1)^i · C(k, i) · (k − i)^n. The powers are the expensive part, but i^n is multiplicative, so with a sieve only primes need a fast power and every composite reuses two smaller powers.",
      functionName: "countingSequences", signature: "countingSequences(n, k) → count",
      starterSource: starter("countingSequences", "n, k", "Σ (−1)^i C(k, i) (k − i)^n; powers of composites from their smallest prime factor."),
      solve: countingSequences, comparator: "scalar", dependencies: ["mul-mod", "mod-pow", "factorial-tables", "choose"], brute: countingSequencesBrute, small: (round) => { const n = 1 + (round % 7); return [n, 1 + (round % n)]; },
      reference: book("22.4", "Inclusion-exclusion"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 12 }, { id: "k", type: "slider", label: "k (rounded)", value: 4, min: 1, max: 12 }], args: [{ fixture: "roundedN" }, { fixture: "roundedK" }] },
      diagnoses: [
        variant("no-alternating-signs", "Sequences missing two values were subtracted twice, so they have to be added back: the signs alternate.", countingSequences, [["total = i % 2 === 0 ? (total + term) % m : (total - term + m) % m;", "total = (total + term) % m;"]]),
        diagnosis("all-sequences", "k^n counts every sequence, including those that skip some value.", function countingSequences(n, k) { return modPow(k, n, 1000000007); }),
      ],
      hints: ["Sieve the smallest prime factor of 2 … k.", "power[p] = modPow(p, n) for primes, power[i] = power[spf] · power[i / spf] otherwise.", "Sum (−1)^i · C(k, i) · power[k − i]."],
      cases: [
        example([6, 4], 1560, "CSES sample"),
        example([3, 3], 6, "every value exactly once"),
        example([5, 1], 1, "one value"),
        run(countingSequences, [9, 4], "n = 9, k = 4"),
        hidden("n = k = 10⁶, time limit", () => [1000000, 1000000]),
      ],
    },
    {
      id: "grid-paths-ii", title: "Grid Paths II", cses: { id: 1078, name: "Grid Paths II" },
      goal: "The number of right/down paths across an n × n grid (n ≤ 10⁶) that avoid all m ≤ 1000 traps, modulo 10⁹ + 7.",
      concept: "Paths between two squares number C(dy + dx, dy). Sort the traps and treat the target as one more; free[i] = paths to point i that meet no earlier trap = all paths to it minus, for each earlier trap j, free[j] · paths(j → i). Every bad path is subtracted exactly once, at its first trap, so the whole count is O(m²) binomials.",
      functionName: "gridPathsII", signature: "gridPathsII(n, traps) → count",
      starterSource: starter("gridPathsII", "n, traps", "Sort the traps, append (n, n); free[i] = C(to i) − Σ free[j] · C(j → i)."),
      solve: gridPathsII, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: gridPathsIIBrute, small: (round) => { const n = 1 + (round % 7); return [n, randomTraps(16900 + round, n, round % 5)]; },
      reference: book("22.2", "Binomial coefficients · paths in a grid"),
      presets: { "CSES sample": { a: trapBoard(3, [[2, 2]]), b: 3, c: [[2, 2]] }, "a wall with a gap": { a: trapBoard(4, [[2, 1], [2, 2], [2, 3]]), b: 4, c: [[2, 1], [2, 2], [2, 3]] } },
      scene: { kind: "algo", view: "grid", handles: preset(), args: [{ fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("subtracts-each-trap-once", "A path through two traps would be subtracted twice; subtract only the paths whose first trap is j, free[j].", gridPathsII, [["mulMod(free[j], paths(points[j][0], points[j][1], points[i][0], points[i][1]), m)", "mulMod(paths(1, 1, points[j][0], points[j][1]), paths(points[j][0], points[j][1], points[i][0], points[i][1]), m)"]]),
        variant("unsorted-traps", "free[j] must be final before it is used, so traps have to be handled in path order: sort by row, then column.", gridPathsII, [["traps.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1])", "traps.slice()"]]),
      ],
      hints: ["paths(y1, x1, y2, x2) = C(y2 − y1 + x2 − x1, y2 − y1), or 0 when going backwards.", "Sort the traps by (row, column) and append (n, n).", "free[i] = paths(1, 1 → i) − Σ_{j<i} free[j] · paths(j → i); answer free of the last point."],
      cases: [
        example([3, [[2, 2]]], 2, "CSES sample"),
        example([4, [[2, 1], [2, 2], [2, 3]]], 1, "a wall with one gap"),
        example([2, [[1, 2], [2, 1]]], 0, "both ways blocked"),
        run(gridPathsII, [8, [[3, 3], [2, 5], [5, 2], [6, 6]]], "four traps"),
        hidden("n = 10⁶, m = 1000, time limit", () => [1000000, TRAPS_BIG()]),
      ],
    },
    {
      id: "counting-permutations", title: "Counting Permutations", cses: { id: 1075, name: "Counting Permutations" },
      goal: "The number of permutations of 1 … n with no two adjacent elements differing by 1, modulo 10⁹ + 7.",
      concept: "Inclusion–exclusion over bonds: a bond forces i and i + 1 to be adjacent. Choosing k of the n − 1 bonds so that they form c blocks can be done in C(k − 1, c − 1) · C(n − k, c) ways; each block can run up or down (2^c), and the n − k resulting units can be arranged in (n − k)! orders. So the answer is Σ_k (−1)^k (n − k)! Σ_c C(k − 1, c − 1) C(n − k, c) 2^c, O(n²).",
      functionName: "countingPermutations", signature: "countingPermutations(n) → count",
      starterSource: starter("countingPermutations", "n", "Inclusion–exclusion over k bonds in c blocks: C(k − 1, c − 1) · C(n − k, c) · 2^c · (n − k)!, alternating in k."),
      solve: countingPermutations, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: countingPermutationsBrute, small: (round) => [1 + (round % 8)],
      reference: book("22.4", "Inclusion-exclusion"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        variant("blocks-one-way", "A forced block like 3 4 5 can also appear as 5 4 3; every block counts twice.", countingPermutations, [["mulMod(choices, powers[blocks], m)", "choices"]]),
        variant("adds-every-term", "Inclusion–exclusion alternates: arrangements with k forced bonds are subtracted for odd k and added for even k.", countingPermutations, [["total = bonds % 2 === 0 ? (total + term) % m : (total - term + m) % m;", "total = (total + term) % m;"]]),
      ],
      hints: ["Start from n! (no bonds forced).", "For k bonds forming c blocks: C(k − 1, c − 1) · C(n − k, c) choices, times 2^c orientations, times (n − k)! arrangements.", "Subtract the terms with odd k and add those with even k."],
      cases: [
        example([5], 14, "CSES sample"),
        example([1], 1, "one element"),
        example([2], 0, "1 2 and 2 1 both touch"),
        example([4], 2, "only 2 4 1 3 and 3 1 4 2"),
        run(countingPermutations, [9], "n = 9"),
        hidden("n = 1000, time limit", () => [1000]),
      ],
    },
    {
      id: "grid-completion", title: "Grid Completion", cses: { id: 2429, name: "Grid Completion" },
      goal: "The number of ways to complete the grid so every row and column holds exactly one A and one B, modulo 10⁹ + 7.",
      concept: "The missing A's form a matching of the rows and columns still lacking an A, (free A)! ways, and likewise for B. What goes wrong is a clash: a new A and a new B in the same cell, or a new letter on a placed letter of the other kind. Inclusion–exclusion over i clashing new cells, C(p, i) · C(q, i) · i! choices among rows and columns lacking both letters, and inside each letter's count over j blocked placed cells, Σ (−1)^j C(x, j) (free − i − j)!.",
      functionName: "gridCompletion", signature: "gridCompletion(grid) → count",
      starterSource: starter("gridCompletion", "grid", "Count free rows/columns per letter, rows/columns missing both, and placed letters blocking the other; nested inclusion–exclusion."),
      solve: gridCompletion, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: gridCompletionBrute, small: (round) => [partialGrid(17000 + round, 2 + (round % 4), 0.4)],
      reference: book("22.4", "Inclusion-exclusion"),
      presets: { "CSES sample": { a: [".....", "..AB.", ".....", "B....", "...A."] }, "empty 3 × 3": { a: ["...", "...", "..."] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("placed-letters-never-block", "A placed B sits in its cell for good: a new A cannot land there, so those cells must be excluded too.", gridCompletion, [["blockA += 1;", "blockA += 0;"], ["blockB += 1;", "blockB += 0;"]]),
        variant("ignores-collisions", "A new A and a new B may choose the same empty cell; subtract those placements by inclusion–exclusion.", gridCompletion, [["for (let i = 0; i <= Math.min(rowsBoth, colsBoth, freeA, freeB); i += 1) {", "for (let i = 0; i <= 0; i += 1) {"]]),
      ],
      hints: ["freeA = rows without an A (equal to columns without an A); likewise freeB. p, q = rows and columns missing both letters.", "blockA = placed B's whose row and column both still need an A; blockB likewise. avoiding(free, blocked, i) = Σ_j (−1)^j C(blocked, j) (free − i − j)!.", "Answer Σ_i (−1)^i C(p, i) C(q, i) i! · avoiding(freeA, blockA, i) · avoiding(freeB, blockB, i)."],
      cases: [
        example([[".....", "..AB.", ".....", "B....", "...A."]], 16, "CSES sample"),
        example([["..", ".."]], 2, "an empty 2 × 2"),
        example([["...", "...", "..."]], 12, "an empty 3 × 3"),
        run(gridCompletion, [partialGrid(17100, 6, 0.3)], "six by six"),
        hidden("n = 500, time limit", () => [COMPLETION_BIG()]),
      ],
    },
    {
      id: "counting-reorders", title: "Counting Reorders", cses: { id: 2421, name: "Counting Reorders" },
      goal: "The number of rearrangements of the string with no two equal adjacent letters, modulo 10⁹ + 7.",
      concept: "Inclusion–exclusion by gluing: a letter with c copies is cut into j blocks of consecutive copies in C(c − 1, j − 1) ways, with sign (−1)^(c − j). The blocks are then arranged in (Σ j)! / Π j! orders, since blocks of one letter are alike. Multiply the per-letter polynomials Σ_j sign · C(c − 1, j − 1) / j! · x^j, then add coefficient × (number of blocks)!.",
      functionName: "countingReorders", signature: "countingReorders(s) → count",
      starterSource: starter("countingReorders", "s", "Per letter a polynomial over block counts with sign (−1)^(c − j) · C(c − 1, j − 1) / j!; multiply them; Σ coefficient · J!."),
      solve: countingReorders, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables", "choose"], brute: countingReordersBrute, small: (round) => [randomWord(17200 + round, 1 + (round % 8), 1 + (round % 3))],
      reference: book("22.4", "Inclusion-exclusion"),
      presets: { "CSES sample": { a: "aabc" }, "too many a's": { a: "aaab" }, "two pairs": { a: "aabb" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        variant("no-alternating-signs", "Gluing forces adjacencies, so those arrangements must be subtracted and re-added in turn: sign (−1)^(c − j).", countingReorders, [["factor[j] = (c - j) % 2 === 0 ? value : (m - value) % m;", "factor[j] = value;"]]),
        variant("letters-distinguishable", "Blocks of the same letter are interchangeable, so divide by j! for each letter.", countingReorders, [["mulMod(choose(tables, c - 1, j - 1), tables.inverseFact[j], m)", "choose(tables, c - 1, j - 1)"]]),
      ],
      hints: ["Count each letter; a letter with c copies contributes the polynomial with coefficients (−1)^(c−j) · C(c − 1, j − 1) · (1/j!) for j = 1 … c.", "Multiply the polynomials of all letters (degrees add up to n).", "Answer Σ_J coefficient[J] · J!."],
      cases: [
        example(["aabc"], 6, "CSES sample"),
        example(["aaab"], 0, "too many a's"),
        example(["aabb"], 2, "abab and baba"),
        example(["abc"], 6, "all different"),
        run(countingReorders, ["aabbccd"], "seven letters"),
        hidden("n = 3000 over 26 letters (CSES allows 5000), time limit", () => [REORDER_BIG()]),
        hidden("n = 2000 over three letters", () => [REORDER_TWO()]),
      ],
    },
    {
      id: "tournament-graph-distribution", title: "Tournament Graph Distribution", cses: { id: 3232, name: "Tournament Graph Distribution" },
      goal: "For k = 1 … n, the number of tournaments on n labeled nodes with exactly k strongly connected components, modulo 10⁹ + 7.",
      concept: "The components of a tournament always form a chain, every edge between two of them pointing forward. So the strongly connected tournaments satisfy S(m) = 2^C(m,2) − Σ_{i<m} C(m, i) S(i) 2^C(m−i,2), peeling off the first component. A tournament with k components is a chain of k strong ones, and after dividing by factorials that is the k-th convolution power of S(i)/i!.",
      functionName: "tournamentGraphDistribution", signature: "tournamentGraphDistribution(n) → counts",
      starterSource: starter("tournamentGraphDistribution", "n", "S(m) by peeling the first component; then layer_k = layer_(k−1) convolved with S(i)/i!; answer layer_k[n] · n!."),
      solve: tournamentGraphDistribution, comparator: "deep", dependencies: ["mul-mod", "mod-pow", "factorial-tables", "choose"], brute: tournamentGraphDistributionBrute, small: (round) => [1 + (round % 5)],
      reference: book("17.1", "Kosaraju's algorithm"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 3, min: 1, max: 8 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        variant("strong-as-total", "Each link of the chain must itself be strongly connected; using all 2^C(i,2) tournaments counts chains of any shape.", tournamentGraphDistribution, [["strong.map((value, size) => mulMod(value, tables.inverseFact[size], m))", "all.map((value, size) => (size === 0 ? 0 : mulMod(value, tables.inverseFact[size], m)))"]]),
        variant("forgets-labels", "The convolution worked with counts divided by size!; multiply by n! at the end to label the nodes again.", tournamentGraphDistribution, [["answers.push(mulMod(layer[n], tables.fact[n], m));", "answers.push(layer[n]);"]]),
      ],
      hints: ["all[m] = 2^(m(m−1)/2); strong[m] = all[m] − Σ_{i<m} C(m, i) · strong[i] · all[m − i].", "piece[i] = strong[i] / i!; layer_0 = [1, 0, …].", "layer_k[size] = Σ_i piece[i] · layer_(k−1)[size − i]; the answer for k is layer_k[n] · n!."],
      cases: [
        example([3], [2, 0, 6], "CSES sample"),
        example([1], [1], "one node"),
        example([2], [0, 2], "two nodes are never strongly connected"),
        example([4], [24, 16, 0, 24], "four nodes"),
        run(tournamentGraphDistribution, [7], "n = 7"),
        hidden("n = 250 (CSES allows 500), time limit", () => [250]),
      ],
    },
    {
      id: "collecting-numbers-distribution", title: "Collecting Numbers Distribution", cses: { id: 3157, name: "Collecting Numbers Distribution" },
      goal: "For k = 1 … n, the number of arrays (permutations of 1 … n) that need exactly k rounds of Collecting Numbers, modulo 10⁹ + 7.",
      concept: "A new round starts exactly when i + 1 stands left of i. So the rounds are 1 + the descents of the sequence of positions of 1, 2, …, n, and that sequence is itself any permutation. Permutations of n with d descents are the Eulerian numbers A(n, d) = (d + 1) A(n−1, d) + (n − d) A(n−1, d−1), a row at a time.",
      functionName: "collectingNumbersDistribution", signature: "collectingNumbersDistribution(n) → counts",
      starterSource: starter("collectingNumbersDistribution", "n", "Eulerian numbers row by row; the answer for k rounds is A(n, k − 1)."),
      solve: collectingNumbersDistribution, comparator: "deep", brute: collectingNumbersDistributionBrute, small: (round) => [1 + (round % 7)],
      reference: site("cp-algorithms · Stirling and Eulerian numbers", CP + "combinatorics/stirling-numbers.html"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 3, min: 1, max: 10 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        variant("swapped-weights", "A new largest element lands in a descent gap (keeping the count) or elsewhere (adding one): the weights are d + 1 and n − d.", collectingNumbersDistribution, [["((d + 1) * (row[d] || 0) + (size - d) * (d > 0 ? row[d - 1] : 0))", "(d * (row[d] || 0) + (size - d + 1) * (d > 0 ? row[d - 1] : 0))"]]),
        variant("one-round-shift", "k rounds means k − 1 descents: the answer for k is A(n, k − 1).", collectingNumbersDistribution, [["return row;", "return row.slice(1).concat([0]);"]]),
      ],
      hints: ["A(1, 0) = 1.", "A(n, d) = (d + 1) · A(n − 1, d) + (n − d) · A(n − 1, d − 1); the multipliers are small, so plain products stay exact.", "Return A(n, 0 … n − 1): entry k − 1 is the answer for k rounds."],
      cases: [
        example([3], [1, 4, 1], "CSES sample"),
        example([1], [1], "one number"),
        example([4], [1, 11, 11, 1], "four numbers"),
        run(collectingNumbersDistribution, [8], "n = 8"),
        hidden("n = 5000, time limit", () => [5000]),
      ],
    },
    {
      id: "functional-graph-distribution", title: "Functional Graph Distribution", cses: { id: 2415, name: "Functional Graph Distribution" },
      goal: "For k = 1 … n, the number of functional graphs on n labeled nodes with exactly k components, modulo 10⁹ + 7.",
      concept: "A functional graph is a set of cyclic nodes with rooted trees hanging from them, and its components are the cycles. Choosing c cyclic nodes and hanging the other n − c as a forest rooted at them gives C(n, c) · c · n^(n−c−1) ways. The cycles are a permutation of the c nodes, counted by the Stirling numbers of the first kind, the coefficients of x(x+1)…(x+c−1). Summing weight(c) times those polynomials Horner-style keeps every multiplier small.",
      functionName: "functionalGraphDistribution", signature: "functionalGraphDistribution(n) → counts",
      starterSource: starter("functionalGraphDistribution", "n", "weight(c) = C(n, c) · c · n^(n−c−1) (1 when c = n); Σ weight(c) · x(x+1)…(x+c−1) by Horner; entry k − 1 is the answer for k."),
      solve: functionalGraphDistribution, comparator: "deep", dependencies: ["mul-mod", "mod-pow", "factorial-tables", "choose"], brute: functionalGraphDistributionBrute, small: (round) => [1 + (round % 6)],
      reference: site("cp-algorithms · Stirling numbers of the first kind", CP + "combinatorics/stirling-numbers.html"),
      scene: { kind: "algo", view: "sequence", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 3, min: 1, max: 8 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        variant("forest-count-off", "A forest on n nodes with c chosen roots has c · n^(n−c−1) shapes, not n^(n−c).", functionalGraphDistribution, [["mulMod(c, modPow(n, n - c - 1, m), m)", "modPow(n, n - c, m)"]]),
        variant("one-cycle-only", "The cyclic nodes can form several cycles, one per component; weigh them by the Stirling numbers.", functionalGraphDistribution, [["for (let k = 1; k <= n; k += 1) answers.push(poly[k - 1] || 0);", "const one = poly.reduce((a, b) => (a + b) % m, 0); for (let k = 1; k <= n; k += 1) answers.push(k === 1 ? one : 0);"]]),
      ],
      hints: ["weight(c) = C(n, c) · c · n^(n−c−1) for c < n, and weight(n) = 1.", "Horner: poly = [weight(n)]; for c = n − 1 down to 1, poly = weight(c) + (x + c) · poly.", "The final sum is x · poly, so the answer for k components is poly[k − 1]."],
      cases: [
        example([3], [17, 9, 1], "CSES sample"),
        example([1], [1], "one node pointing to itself"),
        example([2], [3, 1], "two nodes"),
        run(functionalGraphDistribution, [7], "n = 7"),
        hidden("n = 5000, time limit", () => [5000]),
      ],
    },
  ];
  core.define("counting", COUNTING);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

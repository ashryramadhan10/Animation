(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { prefixSums, lowerBound, upperBound, fenwickAdd, fenwickPrefix, fenwickKth } = core.shared;

  // ------------------------------------------------------------------ 5 · range queries · references
  function staticRangeSumQueries(values, queries) {
    const prefix = prefixSums(values);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] - prefix[queries[i][0] - 1]);
    return answers;
  }
  function sparseTable(values) {
    const n = values.length;
    const table = [values.slice()];
    for (let j = 1; (1 << j) <= n; j += 1) {
      const previous = table[j - 1], half = 1 << (j - 1);
      const row = new Array(n - (1 << j) + 1);
      for (let i = 0; i < row.length; i += 1) row[i] = Math.min(previous[i], previous[i + half]);
      table.push(row);
    }
    return table;
  }
  function staticRangeMinimumQueries(values, queries) {
    const table = sparseTable(values);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      const l = queries[i][0] - 1, r = queries[i][1] - 1;
      const level = 31 - Math.clz32(r - l + 1);
      answers.push(Math.min(table[level][l], table[level][r - (1 << level) + 1]));
    }
    return answers;
  }
  function buildSegmentTree(values) {
    const n = values.length;
    const tree = new Array(2 * n).fill(0);
    for (let i = 0; i < n; i += 1) tree[n + i] = values[i];
    for (let i = n - 1; i >= 1; i -= 1) tree[i] = tree[2 * i] + tree[2 * i + 1];
    return tree;
  }
  function segmentTreeUpdate(tree, index, value) {
    const n = tree.length / 2;
    let position = n + index;
    tree[position] = value;
    while (position > 1) {
      position >>= 1;
      tree[position] = tree[2 * position] + tree[2 * position + 1];
    }
    return tree;
  }
  function segmentTreeQuery(tree, l, r) {
    const n = tree.length / 2;
    let lo = l + n, hi = r + n + 1, sum = 0;
    while (lo < hi) {
      if (lo & 1) { sum += tree[lo]; lo += 1; }
      if (hi & 1) { hi -= 1; sum += tree[hi]; }
      lo >>= 1;
      hi >>= 1;
    }
    return sum;
  }
  function dynamicRangeSumQueries(values, ops) {
    const tree = buildSegmentTree(values);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) segmentTreeUpdate(tree, ops[i][1] - 1, ops[i][2]);
      else answers.push(segmentTreeQuery(tree, ops[i][1] - 1, ops[i][2] - 1));
    }
    return answers;
  }
  function dynamicRangeMinimumQueries(values, ops) {
    const n = values.length;
    const tree = new Array(2 * n).fill(Infinity);
    for (let i = 0; i < n; i += 1) tree[n + i] = values[i];
    for (let i = n - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) {
        let position = n + ops[i][1] - 1;
        tree[position] = ops[i][2];
        while (position > 1) { position >>= 1; tree[position] = Math.min(tree[2 * position], tree[2 * position + 1]); }
      } else {
        let lo = n + ops[i][1] - 1, hi = n + ops[i][2], best = Infinity;
        while (lo < hi) {
          if (lo & 1) { best = Math.min(best, tree[lo]); lo += 1; }
          if (hi & 1) { hi -= 1; best = Math.min(best, tree[hi]); }
          lo >>= 1;
          hi >>= 1;
        }
        answers.push(best);
      }
    }
    return answers;
  }
  function rangeXorQueries(values, queries) {
    const prefix = [0];
    for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] ^ values[i]);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] ^ prefix[queries[i][0] - 1]);
    return answers;
  }
  function rangeUpdateQueries(values, ops) {
    const n = values.length;
    const tree = new Array(n + 1).fill(0);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) {
        fenwickAdd(tree, ops[i][1], ops[i][3]);
        if (ops[i][2] + 1 <= n) fenwickAdd(tree, ops[i][2] + 1, -ops[i][3]);
      } else {
        answers.push(values[ops[i][1] - 1] + fenwickPrefix(tree, ops[i][1]));
      }
    }
    return answers;
  }
  function forestQueries(grid, queries) {
    const n = grid.length, width = n + 1;
    const prefix = new Array(width * width).fill(0);
    for (let y = 1; y <= n; y += 1) {
      for (let x = 1; x <= n; x += 1) {
        prefix[y * width + x] = prefix[(y - 1) * width + x] + prefix[y * width + x - 1] - prefix[(y - 1) * width + x - 1] + (grid[y - 1][x - 1] === "*" ? 1 : 0);
      }
    }
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      const y1 = queries[i][0], x1 = queries[i][1], y2 = queries[i][2], x2 = queries[i][3];
      answers.push(prefix[y2 * width + x2] - prefix[(y1 - 1) * width + x2] - prefix[y2 * width + x1 - 1] + prefix[(y1 - 1) * width + x1 - 1]);
    }
    return answers;
  }
  function hotelQueries(rooms, groups) {
    let size = 1;
    while (size < rooms.length) size *= 2;
    const tree = new Array(2 * size).fill(0);
    for (let i = 0; i < rooms.length; i += 1) tree[size + i] = rooms[i];
    for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]);
    const answers = [];
    for (let g = 0; g < groups.length; g += 1) {
      const need = groups[g];
      if (tree[1] < need) { answers.push(0); continue; }
      let v = 1;
      while (v < size) v = tree[2 * v] >= need ? 2 * v : 2 * v + 1;
      answers.push(v - size + 1);
      tree[v] -= need;
      for (let p = v >> 1; p >= 1; p >>= 1) tree[p] = Math.max(tree[2 * p], tree[2 * p + 1]);
    }
    return answers;
  }
  function listRemovals(values, positions) {
    const n = values.length;
    const tree = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1);
    const removed = [];
    for (let i = 0; i < positions.length; i += 1) {
      const index = fenwickKth(tree, positions[i]);
      removed.push(values[index - 1]);
      fenwickAdd(tree, index, -1);
    }
    return removed;
  }
  function salaryQueries(salaries, ops) {
    const all = salaries.slice();
    for (let i = 0; i < ops.length; i += 1) if (ops[i][0] === 1) all.push(ops[i][2]);
    all.sort((p, q) => p - q);
    const distinct = [];
    for (let i = 0; i < all.length; i += 1) if (i === 0 || all[i] !== all[i - 1]) distinct.push(all[i]);
    const tree = new Array(distinct.length + 1).fill(0);
    const current = salaries.slice();
    for (let i = 0; i < current.length; i += 1) fenwickAdd(tree, lowerBound(distinct, current[i]) + 1, 1);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) {
        const k = ops[i][1] - 1;
        fenwickAdd(tree, lowerBound(distinct, current[k]) + 1, -1);
        current[k] = ops[i][2];
        fenwickAdd(tree, lowerBound(distinct, current[k]) + 1, 1);
      } else {
        answers.push(fenwickPrefix(tree, upperBound(distinct, ops[i][2])) - fenwickPrefix(tree, lowerBound(distinct, ops[i][1])));
      }
    }
    return answers;
  }
  function prefixSumQueries(values, ops) {
    let size = 1;
    while (size < values.length) size *= 2;
    const sum = new Array(2 * size).fill(0), best = new Array(2 * size).fill(0);
    for (let i = 0; i < values.length; i += 1) { sum[size + i] = values[i]; best[size + i] = Math.max(0, values[i]); }
    for (let i = size - 1; i >= 1; i -= 1) { sum[i] = sum[2 * i] + sum[2 * i + 1]; best[i] = Math.max(best[2 * i], sum[2 * i] + best[2 * i + 1]); }
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) {
        let v = size + ops[i][1] - 1;
        sum[v] = ops[i][2];
        best[v] = Math.max(0, ops[i][2]);
        for (v >>= 1; v >= 1; v >>= 1) { sum[v] = sum[2 * v] + sum[2 * v + 1]; best[v] = Math.max(best[2 * v], sum[2 * v] + best[2 * v + 1]); }
      } else {
        let lo = size + ops[i][1] - 1, hi = size + ops[i][2];
        let leftSum = 0, leftBest = 0, rightSum = 0, rightBest = 0;
        while (lo < hi) {
          if (lo & 1) { leftBest = Math.max(leftBest, leftSum + best[lo]); leftSum += sum[lo]; lo += 1; }
          if (hi & 1) { hi -= 1; rightBest = Math.max(best[hi], sum[hi] + rightBest); rightSum += sum[hi]; }
          lo >>= 1;
          hi >>= 1;
        }
        answers.push(Math.max(leftBest, leftSum + rightBest));
      }
    }
    return answers;
  }
  function pizzeriaQueries(prices, ops) {
    const n = prices.length;
    let size = 1;
    while (size < n) size *= 2;
    const left = new Array(2 * size).fill(Infinity), right = new Array(2 * size).fill(Infinity);
    for (let i = 0; i < n; i += 1) { left[size + i] = prices[i] - (i + 1); right[size + i] = prices[i] + (i + 1); }
    for (let i = size - 1; i >= 1; i -= 1) { left[i] = Math.min(left[2 * i], left[2 * i + 1]); right[i] = Math.min(right[2 * i], right[2 * i + 1]); }
    const rangeMin = (tree, lo, hi) => {
      let best = Infinity;
      lo += size; hi += size + 1;
      while (lo < hi) {
        if (lo & 1) { best = Math.min(best, tree[lo]); lo += 1; }
        if (hi & 1) { hi -= 1; best = Math.min(best, tree[hi]); }
        lo >>= 1; hi >>= 1;
      }
      return best;
    };
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      const k = ops[i][1];
      if (ops[i][0] === 1) {
        let v = size + k - 1;
        left[v] = ops[i][2] - k;
        right[v] = ops[i][2] + k;
        for (v >>= 1; v >= 1; v >>= 1) { left[v] = Math.min(left[2 * v], left[2 * v + 1]); right[v] = Math.min(right[2 * v], right[2 * v + 1]); }
      } else {
        answers.push(Math.min(rangeMin(left, 0, k - 1) + k, rangeMin(right, k - 1, n - 1) - k));
      }
    }
    return answers;
  }
  function visibleBuildingsQueries(heights, queries) {
    const n = heights.length;
    const next = new Array(n + 2).fill(n + 1);
    const stack = [];
    for (let i = n; i >= 1; i -= 1) {
      while (stack.length && heights[stack[stack.length - 1] - 1] <= heights[i - 1]) stack.pop();
      next[i] = stack.length ? stack[stack.length - 1] : n + 1;
      stack.push(i);
    }
    const up = [next];
    for (let j = 1; j < 18; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 2).fill(n + 1);
      for (let i = 1; i <= n + 1; i += 1) row[i] = previous[previous[i]];
      up.push(row);
    }
    return queries.map((query) => {
      let i = query[0], count = 1;
      for (let j = 17; j >= 0; j -= 1) {
        if (up[j][i] <= query[1]) { count += 1 << j; i = up[j][i]; }
      }
      return count;
    });
  }
  function rangeIntervalQueries(values, queries) {
    const n = values.length;
    const points = [];
    for (let i = 0; i < n; i += 1) points.push([values[i], i + 1]);
    points.sort((p, q) => p[0] - q[0]);
    const events = [];
    for (let i = 0; i < queries.length; i += 1) { events.push([queries[i][3], i, 1]); events.push([queries[i][2] - 1, i, -1]); }
    events.sort((p, q) => p[0] - q[0]);
    const tree = new Array(n + 1).fill(0);
    const answers = new Array(queries.length).fill(0);
    let taken = 0;
    for (let e = 0; e < events.length; e += 1) {
      const threshold = events[e][0], index = events[e][1], sign = events[e][2];
      while (taken < n && points[taken][0] <= threshold) { fenwickAdd(tree, points[taken][1], 1); taken += 1; }
      answers[index] += sign * (fenwickPrefix(tree, queries[index][1]) - fenwickPrefix(tree, queries[index][0] - 1));
    }
    return answers;
  }
  function mergeSubarrayNodes(left, right) {
    return {
      sum: left.sum + right.sum,
      prefix: Math.max(left.prefix, left.sum + right.prefix),
      suffix: Math.max(right.suffix, right.sum + left.suffix),
      best: Math.max(left.best, right.best, left.suffix + right.prefix),
    };
  }
  function subarraySumQueries(values, updates) {
    let size = 1;
    while (size < values.length) size *= 2;
    const leaf = (v) => ({ sum: v, prefix: Math.max(0, v), suffix: Math.max(0, v), best: Math.max(0, v) });
    const tree = new Array(2 * size);
    for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : 0);
    for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]);
    const answers = [];
    for (let u = 0; u < updates.length; u += 1) {
      let v = size + updates[u][0] - 1;
      tree[v] = leaf(updates[u][1]);
      for (v >>= 1; v >= 1; v >>= 1) tree[v] = mergeSubarrayNodes(tree[2 * v], tree[2 * v + 1]);
      answers.push(tree[1].best);
    }
    return answers;
  }
  function subarraySumQueriesII(values, queries) {
    let size = 1;
    while (size < values.length) size *= 2;
    const leaf = (v) => ({ sum: v, prefix: Math.max(0, v), suffix: Math.max(0, v), best: Math.max(0, v) });
    const tree = new Array(2 * size);
    for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : 0);
    for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]);
    const empty = { sum: 0, prefix: 0, suffix: 0, best: 0 };
    return queries.map((query) => {
      let lo = size + query[0] - 1, hi = size + query[1];
      let left = empty, right = empty;
      while (lo < hi) {
        if (lo & 1) { left = mergeSubarrayNodes(left, tree[lo]); lo += 1; }
        if (hi & 1) { hi -= 1; right = mergeSubarrayNodes(tree[hi], right); }
        lo >>= 1;
        hi >>= 1;
      }
      return mergeSubarrayNodes(left, right).best;
    });
  }
  function distinctValuesQueries(values, queries) {
    const n = values.length;
    const order = [];
    for (let i = 0; i < queries.length; i += 1) order.push(i);
    order.sort((p, q) => queries[p][1] - queries[q][1]);
    const tree = new Array(n + 1).fill(0);
    const last = new Map();
    const answers = new Array(queries.length).fill(0);
    let pointer = 0;
    for (let i = 1; i <= n; i += 1) {
      const value = values[i - 1];
      if (last.has(value)) fenwickAdd(tree, last.get(value), -1);
      fenwickAdd(tree, i, 1);
      last.set(value, i);
      while (pointer < order.length && queries[order[pointer]][1] === i) {
        const query = queries[order[pointer]];
        answers[order[pointer]] = fenwickPrefix(tree, query[1]) - fenwickPrefix(tree, query[0] - 1);
        pointer += 1;
      }
    }
    return answers;
  }
  function distinctValuesQueriesII(values, ops) {
    const n = values.length;
    const positions = new Map();
    const place = (value, index) => {
      if (!positions.has(value)) positions.set(value, []);
      const list = positions.get(value);
      const at = lowerBound(list, index);
      list.splice(at, 0, index);
      return list;
    };
    const current = values.slice();
    for (let i = 1; i <= n; i += 1) place(current[i - 1], i);
    let size = 1;
    while (size < n) size *= 2;
    const tree = new Array(2 * size).fill(n + 1);
    const successor = (value, index) => { const list = positions.get(value); const at = lowerBound(list, index + 1); return at < list.length ? list[at] : n + 1; };
    const setNext = (index, value) => { let v = size + index - 1; tree[v] = value; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.min(tree[2 * v], tree[2 * v + 1]); };
    for (let i = 1; i <= n; i += 1) tree[size + i - 1] = successor(current[i - 1], i);
    for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]);
    const answers = [];
    for (let o = 0; o < ops.length; o += 1) {
      if (ops[o][0] === 1) {
        const k = ops[o][1], u = ops[o][2], old = current[k - 1];
        if (old === u) continue;
        const oldList = positions.get(old);
        const at = lowerBound(oldList, k);
        oldList.splice(at, 1);
        if (at > 0) setNext(oldList[at - 1], at < oldList.length ? oldList[at] : n + 1);
        current[k - 1] = u;
        const newList = place(u, k);
        const where = lowerBound(newList, k);
        if (where > 0) setNext(newList[where - 1], k);
        setNext(k, where + 1 < newList.length ? newList[where + 1] : n + 1);
      } else {
        let lo = size + ops[o][1] - 1, hi = size + ops[o][2], smallest = n + 1;
        while (lo < hi) {
          if (lo & 1) { smallest = Math.min(smallest, tree[lo]); lo += 1; }
          if (hi & 1) { hi -= 1; smallest = Math.min(smallest, tree[hi]); }
          lo >>= 1; hi >>= 1;
        }
        answers.push(smallest > ops[o][2]);
      }
    }
    return answers;
  }
  function increasingArrayQueries(values, queries) {
    const n = values.length;
    const prefix = [0];
    for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]);
    const next = new Array(n + 2).fill(n + 1);
    const stack = [];
    for (let i = n; i >= 1; i -= 1) {
      while (stack.length && values[stack[stack.length - 1] - 1] <= values[i - 1]) stack.pop();
      next[i] = stack.length ? stack[stack.length - 1] : n + 1;
      stack.push(i);
    }
    const cost0 = new Array(n + 2).fill(0);
    for (let i = 1; i <= n; i += 1) cost0[i] = values[i - 1] * (next[i] - i) - (prefix[next[i] - 1] - prefix[i - 1]);
    const up = [next], cost = [cost0];
    for (let j = 1; j < 18; j += 1) {
      const previousUp = up[j - 1], previousCost = cost[j - 1];
      const rowUp = new Array(n + 2).fill(n + 1), rowCost = new Array(n + 2).fill(0);
      for (let i = 1; i <= n + 1; i += 1) { rowUp[i] = previousUp[previousUp[i]]; rowCost[i] = previousCost[i] + previousCost[previousUp[i]]; }
      up.push(rowUp);
      cost.push(rowCost);
    }
    return queries.map((query) => {
      let i = query[0], total = 0;
      const b = query[1];
      for (let j = 17; j >= 0; j -= 1) {
        if (up[j][i] <= b) { total += cost[j][i]; i = up[j][i]; }
      }
      return total + values[i - 1] * (b - i + 1) - (prefix[b] - prefix[i - 1]);
    });
  }
  function movieFestivalQueries(movies, queries) {
    const n = movies.length;
    const sorted = movies.slice().sort((p, q) => p[0] - q[0]);
    const starts = sorted.map((m) => m[0]), ends = sorted.map((m) => m[1]);
    const suffixBest = new Array(n + 1).fill(n);
    for (let k = n - 1; k >= 0; k -= 1) {
      const candidate = suffixBest[k + 1];
      suffixBest[k] = candidate === n || ends[k] <= ends[candidate] ? k : candidate;
    }
    const first = (time) => suffixBest[lowerBound(starts, time)];
    const up = [new Array(n + 1).fill(n)];
    for (let m = 0; m < n; m += 1) up[0][m] = first(ends[m]);
    for (let j = 1; j < 18; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 1).fill(n);
      for (let m = 0; m <= n; m += 1) row[m] = previous[previous[m]];
      up.push(row);
    }
    return queries.map((query) => {
      let m = first(query[0]);
      if (m === n || ends[m] > query[1]) return 0;
      let count = 1;
      for (let j = 17; j >= 0; j -= 1) {
        const target = up[j][m];
        if (target !== n && ends[target] <= query[1]) { count += 1 << j; m = target; }
      }
      return count;
    });
  }
  function forestQueriesII(grid, ops) {
    const n = grid.length, width = n + 1;
    const state = new Array(width * width).fill(0), tree = new Array(width * width).fill(0);
    for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) { const v = grid[y - 1][x - 1] === "*" ? 1 : 0; state[y * width + x] = v; tree[y * width + x] = v; }
    for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) { const px = x + (x & (-x)); if (px <= n) tree[y * width + px] += tree[y * width + x]; }
    for (let x = 1; x <= n; x += 1) for (let y = 1; y <= n; y += 1) { const py = y + (y & (-y)); if (py <= n) tree[py * width + x] += tree[y * width + x]; }
    const add = (y, x, delta) => { for (let i = y; i <= n; i += i & (-i)) for (let j = x; j <= n; j += j & (-j)) tree[i * width + j] += delta; };
    const sum = (y, x) => { let total = 0; for (let i = y; i > 0; i -= i & (-i)) for (let j = x; j > 0; j -= j & (-j)) total += tree[i * width + j]; return total; };
    const answers = [];
    for (let o = 0; o < ops.length; o += 1) {
      if (ops[o][0] === 1) {
        const y = ops[o][1], x = ops[o][2];
        const delta = state[y * width + x] ? -1 : 1;
        state[y * width + x] += delta;
        add(y, x, delta);
      } else {
        const y1 = ops[o][1], x1 = ops[o][2], y2 = ops[o][3], x2 = ops[o][4];
        answers.push(sum(y2, x2) - sum(y1 - 1, x2) - sum(y2, x1 - 1) + sum(y1 - 1, x1 - 1));
      }
    }
    return answers;
  }
  function rangeUpdatesAndSums(values, ops) {
    const n = values.length;
    const sum = new Array(4 * n).fill(0), addLazy = new Array(4 * n).fill(0), setLazy = new Array(4 * n).fill(-1);
    const build = (node, l, r) => {
      if (l === r) { sum[node] = values[l - 1]; return; }
      const mid = (l + r) >> 1;
      build(2 * node, l, mid);
      build(2 * node + 1, mid + 1, r);
      sum[node] = sum[2 * node] + sum[2 * node + 1];
    };
    const apply = (node, length, set, add) => {
      if (set >= 0) { sum[node] = set * length; setLazy[node] = set; addLazy[node] = 0; }
      if (add !== 0) { sum[node] += add * length; if (setLazy[node] >= 0) setLazy[node] += add; else addLazy[node] += add; }
    };
    const push = (node, l, r) => {
      const mid = (l + r) >> 1;
      apply(2 * node, mid - l + 1, setLazy[node], addLazy[node]);
      apply(2 * node + 1, r - mid, setLazy[node], addLazy[node]);
      setLazy[node] = -1;
      addLazy[node] = 0;
    };
    const update = (node, l, r, a, b, set, add) => {
      if (b < l || r < a) return;
      if (a <= l && r <= b) { apply(node, r - l + 1, set, add); return; }
      push(node, l, r);
      const mid = (l + r) >> 1;
      update(2 * node, l, mid, a, b, set, add);
      update(2 * node + 1, mid + 1, r, a, b, set, add);
      sum[node] = sum[2 * node] + sum[2 * node + 1];
    };
    const query = (node, l, r, a, b) => {
      if (b < l || r < a) return 0;
      if (a <= l && r <= b) return sum[node];
      push(node, l, r);
      const mid = (l + r) >> 1;
      return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b);
    };
    build(1, 1, n);
    const answers = [];
    for (let o = 0; o < ops.length; o += 1) {
      if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2], -1, ops[o][3]);
      else if (ops[o][0] === 2) update(1, 1, n, ops[o][1], ops[o][2], ops[o][3], 0);
      else answers.push(query(1, 1, n, ops[o][1], ops[o][2]));
    }
    return answers;
  }
  function polynomialQueries(values, ops) {
    const n = values.length;
    const sum = new Array(4 * n).fill(0), firstLazy = new Array(4 * n).fill(0), stepLazy = new Array(4 * n).fill(0);
    const build = (node, l, r) => {
      if (l === r) { sum[node] = values[l - 1]; return; }
      const mid = (l + r) >> 1;
      build(2 * node, l, mid);
      build(2 * node + 1, mid + 1, r);
      sum[node] = sum[2 * node] + sum[2 * node + 1];
    };
    const apply = (node, length, first, step) => {
      sum[node] += first * length + step * (length * (length - 1) / 2);
      firstLazy[node] += first;
      stepLazy[node] += step;
    };
    const push = (node, l, r) => {
      if (firstLazy[node] === 0 && stepLazy[node] === 0) return;
      const mid = (l + r) >> 1;
      apply(2 * node, mid - l + 1, firstLazy[node], stepLazy[node]);
      apply(2 * node + 1, r - mid, firstLazy[node] + stepLazy[node] * (mid - l + 1), stepLazy[node]);
      firstLazy[node] = 0;
      stepLazy[node] = 0;
    };
    const update = (node, l, r, a, b) => {
      if (b < l || r < a) return;
      if (a <= l && r <= b) { apply(node, r - l + 1, l - a + 1, 1); return; }
      push(node, l, r);
      const mid = (l + r) >> 1;
      update(2 * node, l, mid, a, b);
      update(2 * node + 1, mid + 1, r, a, b);
      sum[node] = sum[2 * node] + sum[2 * node + 1];
    };
    const query = (node, l, r, a, b) => {
      if (b < l || r < a) return 0;
      if (a <= l && r <= b) return sum[node];
      push(node, l, r);
      const mid = (l + r) >> 1;
      return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b);
    };
    build(1, 1, n);
    const answers = [];
    for (let o = 0; o < ops.length; o += 1) {
      if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2]);
      else answers.push(query(1, 1, n, ops[o][1], ops[o][2]));
    }
    return answers;
  }
  function rangeQueriesAndCopies(values, ops) {
    const n = values.length;
    const left = [0], right = [0], sum = [0];
    const node = (l, r, s) => { left.push(l); right.push(r); sum.push(s); return left.length - 1; };
    const build = (l, r) => {
      if (l === r) return node(0, 0, values[l - 1]);
      const mid = (l + r) >> 1;
      const a = build(l, mid), b = build(mid + 1, r);
      return node(a, b, sum[a] + sum[b]);
    };
    const update = (prev, l, r, position, x) => {
      if (l === r) return node(0, 0, x);
      const mid = (l + r) >> 1;
      let a = left[prev], b = right[prev];
      if (position <= mid) a = update(a, l, mid, position, x);
      else b = update(b, mid + 1, r, position, x);
      return node(a, b, sum[a] + sum[b]);
    };
    const query = (root, l, r, a, b) => {
      if (b < l || r < a) return 0;
      if (a <= l && r <= b) return sum[root];
      const mid = (l + r) >> 1;
      return query(left[root], l, mid, a, b) + query(right[root], mid + 1, r, a, b);
    };
    const roots = [build(1, n)];
    const answers = [];
    for (let o = 0; o < ops.length; o += 1) {
      const k = ops[o][1] - 1;
      if (ops[o][0] === 1) roots[k] = update(roots[k], 1, n, ops[o][2], ops[o][3]);
      else if (ops[o][0] === 2) answers.push(query(roots[k], 1, n, ops[o][2], ops[o][3]));
      else roots.push(roots[k]);
    }
    return answers;
  }
  function missingCoinSumQueries(coins, queries) {
    const n = coins.length;
    const distinct = coins.slice().sort((p, q) => p - q).filter((v, i, list) => i === 0 || v !== list[i - 1]);
    const m = distinct.length;
    const left = [0], right = [0], sum = [0];
    const node = (l, r, s) => { left.push(l); right.push(r); sum.push(s); return left.length - 1; };
    const insert = (prev, l, r, rank, value) => {
      if (l === r) return node(0, 0, sum[prev] + value);
      const mid = (l + r) >> 1;
      let a = left[prev], b = right[prev];
      if (rank <= mid) a = insert(a, l, mid, rank, value);
      else b = insert(b, mid + 1, r, rank, value);
      return node(a, b, sum[a] + sum[b]);
    };
    const versions = [0];
    for (let i = 0; i < n; i += 1) versions.push(insert(versions[i], 1, m, lowerBound(distinct, coins[i]) + 1, coins[i]));
    const sumUpTo = (newer, older, l, r, limit) => {
      if (limit < l || newer === older) return 0;
      if (r <= limit) return sum[newer] - sum[older];
      const mid = (l + r) >> 1;
      return sumUpTo(left[newer], left[older], l, mid, limit) + sumUpTo(right[newer], right[older], mid + 1, r, limit);
    };
    return queries.map((query) => {
      const newer = versions[query[1]], older = versions[query[0] - 1];
      let reach = 0;
      while (true) {
        const total = sumUpTo(newer, older, 1, m, upperBound(distinct, reach + 1));
        if (total === reach) return reach + 1;
        reach = total;
      }
    });
  }

  // ------------------------------------------------------------------ brute forces for the stress tests
  const rangeOf = (values, a, b) => values.slice(a - 1, b);
  function sparseTableBrute(values) {
    const n = values.length;
    const table = [values.slice()];
    for (let j = 1; (1 << j) <= n; j += 1) {
      const row = [];
      for (let i = 0; i + (1 << j) <= n; i += 1) row.push(Math.min(...values.slice(i, i + (1 << j))));
      table.push(row);
    }
    return table;
  }
  function staticRangeMinimumBrute(values, queries) { return queries.map((q) => Math.min(...rangeOf(values, q[0], q[1]))); }
  function dynamicRangeMinimumBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) { if (op[0] === 1) current[op[1] - 1] = op[2]; else out.push(Math.min(...rangeOf(current, op[1], op[2]))); }
    return out;
  }
  function rangeXorBrute(values, queries) { return queries.map((q) => rangeOf(values, q[0], q[1]).reduce((acc, v) => acc ^ v, 0)); }
  function rangeUpdateBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) { if (op[0] === 1) { for (let i = op[1]; i <= op[2]; i += 1) current[i - 1] += op[3]; } else out.push(current[op[1] - 1]); }
    return out;
  }
  function forestBrute(grid, queries) {
    return queries.map((q) => { let count = 0; for (let y = q[0]; y <= q[2]; y += 1) for (let x = q[1]; x <= q[3]; x += 1) if (grid[y - 1][x - 1] === "*") count += 1; return count; });
  }
  function hotelBrute(rooms, groups) {
    const free = rooms.slice();
    return groups.map((need) => { for (let i = 0; i < free.length; i += 1) if (free[i] >= need) { free[i] -= need; return i + 1; } return 0; });
  }
  function listRemovalsBrute(values, positions) {
    const list = values.slice();
    return positions.map((p) => list.splice(p - 1, 1)[0]);
  }
  function salaryBrute(salaries, ops) {
    const current = salaries.slice();
    const out = [];
    for (const op of ops) { if (op[0] === 1) current[op[1] - 1] = op[2]; else out.push(current.filter((s) => s >= op[1] && s <= op[2]).length); }
    return out;
  }
  function prefixSumBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) {
      if (op[0] === 1) { current[op[1] - 1] = op[2]; continue; }
      let best = 0, running = 0;
      for (let i = op[1]; i <= op[2]; i += 1) { running += current[i - 1]; best = Math.max(best, running); }
      out.push(best);
    }
    return out;
  }
  function pizzeriaBrute(prices, ops) {
    const current = prices.slice();
    const out = [];
    for (const op of ops) { if (op[0] === 1) current[op[1] - 1] = op[2]; else { let best = Infinity; for (let i = 1; i <= current.length; i += 1) best = Math.min(best, current[i - 1] + Math.abs(i - op[1])); out.push(best); } }
    return out;
  }
  function visibleBuildingsBrute(heights, queries) {
    return queries.map((q) => { let count = 0, tallest = 0; for (let i = q[0]; i <= q[1]; i += 1) if (heights[i - 1] > tallest) { tallest = heights[i - 1]; count += 1; } return count; });
  }
  function rangeIntervalBrute(values, queries) {
    return queries.map((q) => { let count = 0; for (let i = q[0]; i <= q[1]; i += 1) if (values[i - 1] >= q[2] && values[i - 1] <= q[3]) count += 1; return count; });
  }
  function kadane(list) { let best = 0, running = 0; for (const v of list) { running = Math.max(0, running + v); best = Math.max(best, running); } return best; }
  function subarraySumBrute(values, updates) {
    const current = values.slice();
    return updates.map((u) => { current[u[0] - 1] = u[1]; return kadane(current); });
  }
  function subarraySumIIBrute(values, queries) { return queries.map((q) => kadane(rangeOf(values, q[0], q[1]))); }
  function distinctValuesBrute(values, queries) { return queries.map((q) => new Set(rangeOf(values, q[0], q[1])).size); }
  function distinctValuesIIBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) { if (op[0] === 1) current[op[1] - 1] = op[2]; else { const slice = rangeOf(current, op[1], op[2]); out.push(new Set(slice).size === slice.length); } }
    return out;
  }
  function increasingArrayBrute(values, queries) {
    return queries.map((q) => { let cost = 0, top = 0; for (let i = q[0]; i <= q[1]; i += 1) { top = Math.max(top, values[i - 1]); cost += top - values[i - 1]; } return cost; });
  }
  function movieFestivalBrute(movies, queries) {
    const byEnd = movies.slice().sort((p, q) => p[1] - q[1]);
    return queries.map((q) => { let time = q[0], count = 0; for (const m of byEnd) if (m[0] >= time && m[1] <= q[1]) { count += 1; time = m[1]; } return count; });
  }
  function forestIIBrute(grid, ops) {
    const cells = grid.map((row) => row.split("").map((ch) => (ch === "*" ? 1 : 0)));
    const out = [];
    for (const op of ops) {
      if (op[0] === 1) cells[op[1] - 1][op[2] - 1] ^= 1;
      else { let count = 0; for (let y = op[1]; y <= op[3]; y += 1) for (let x = op[2]; x <= op[4]; x += 1) count += cells[y - 1][x - 1]; out.push(count); }
    }
    return out;
  }
  function rangeUpdatesAndSumsBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) {
      if (op[0] === 1) { for (let i = op[1]; i <= op[2]; i += 1) current[i - 1] += op[3]; }
      else if (op[0] === 2) { for (let i = op[1]; i <= op[2]; i += 1) current[i - 1] = op[3]; }
      else { let total = 0; for (let i = op[1]; i <= op[2]; i += 1) total += current[i - 1]; out.push(total); }
    }
    return out;
  }
  function polynomialBrute(values, ops) {
    const current = values.slice();
    const out = [];
    for (const op of ops) {
      if (op[0] === 1) { for (let i = op[1]; i <= op[2]; i += 1) current[i - 1] += i - op[1] + 1; }
      else { let total = 0; for (let i = op[1]; i <= op[2]; i += 1) total += current[i - 1]; out.push(total); }
    }
    return out;
  }
  function rangeQueriesAndCopiesBrute(values, ops) {
    const arrays = [values.slice()];
    const out = [];
    for (const op of ops) {
      const k = op[1] - 1;
      if (op[0] === 1) arrays[k][op[2] - 1] = op[3];
      else if (op[0] === 2) { let total = 0; for (let i = op[2]; i <= op[3]; i += 1) total += arrays[k][i - 1]; out.push(total); }
      else arrays.push(arrays[k].slice());
    }
    return out;
  }
  function missingCoinSumBrute(coins, queries) {
    return queries.map((q) => { const sorted = rangeOf(coins, q[0], q[1]).sort((p, r) => p - r); let reach = 0; for (const c of sorted) { if (c > reach + 1) break; reach += c; } return reach + 1; });
  }

  // ------------------------------------------------------------------ generators
  function smallList(seed, count, lo, hi) { return randomInts(seed, count, lo, hi); }
  function smallRanges(seed, count, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) { let a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n); if (a > b) { const swap = a; a = b; b = swap; } out.push([a, b]); }
    return out;
  }
  function smallOps(seed, count, n, lo, hi, kinds) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const kind = kinds[Math.floor(next() * kinds.length)];
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n), x = lo + Math.floor(next() * (hi - lo + 1));
      if (kind === "set") out.push([1, a, x]);
      else if (kind === "point") out.push([2, a]);
      else if (kind === "rangeAdd") out.push([1, Math.min(a, b), Math.max(a, b), x]);
      else if (kind === "rangeSet") out.push([2, Math.min(a, b), Math.max(a, b), x]);
      else if (kind === "sum3") out.push([3, Math.min(a, b), Math.max(a, b)]);
      else out.push([2, Math.min(a, b), Math.max(a, b)]);
    }
    return out;
  }
  function bigRanges(seed, count, n) {
    const a = randomInts(seed, count, 1, n), b = randomInts(seed + 1, count, 1, n);
    return a.map((v, i) => (v <= b[i] ? [v, b[i]] : [b[i], v]));
  }
  function bigOps(seed, count, n, lo, hi, kinds) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const kind = kinds[Math.floor(next() * kinds.length)];
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n), x = lo + Math.floor(next() * (hi - lo + 1));
      if (kind === "set") out.push([1, a, x]);
      else if (kind === "point") out.push([2, a]);
      else if (kind === "rangeAdd") out.push([1, Math.min(a, b), Math.max(a, b), x]);
      else if (kind === "rangeSet") out.push([2, Math.min(a, b), Math.max(a, b), x]);
      else if (kind === "sum3") out.push([3, Math.min(a, b), Math.max(a, b)]);
      else out.push([2, Math.min(a, b), Math.max(a, b)]);
    }
    return out;
  }
  function rectangles(seed, count, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      let y1 = 1 + Math.floor(next() * n), y2 = 1 + Math.floor(next() * n), x1 = 1 + Math.floor(next() * n), x2 = 1 + Math.floor(next() * n);
      if (y1 > y2) { const s = y1; y1 = y2; y2 = s; }
      if (x1 > x2) { const s = x1; x1 = x2; x2 = s; }
      out.push([y1, x1, y2, x2]);
    }
    return out;
  }
  function forestOps(seed, count, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      if (next() < 0.5) out.push([1, 1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]);
      else { const r = rectangles(Math.floor(next() * 1000000), 1, n)[0]; out.push([2, r[0], r[1], r[2], r[3]]); }
    }
    return out;
  }
  function copyOps(seed, count, n, hi) {
    const next = rng(seed);
    const out = [];
    let arrays = 1;
    for (let i = 0; i < count; i += 1) {
      const roll = next(), k = 1 + Math.floor(next() * arrays);
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (roll < 0.4) out.push([1, k, a, 1 + Math.floor(next() * hi)]);
      else if (roll < 0.8) out.push([2, k, Math.min(a, b), Math.max(a, b)]);
      else { out.push([3, k]); arrays += 1; }
    }
    return out;
  }
  function intervalQueries(seed, count, n, hi) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      let a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n), c = 1 + Math.floor(next() * hi), d = 1 + Math.floor(next() * hi);
      if (a > b) { const s = a; a = b; b = s; }
      if (c > d) { const s = c; c = d; d = s; }
      out.push([a, b, c, d]);
    }
    return out;
  }
  function moviePairs(seed, count, hi) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) { let a = 1 + Math.floor(next() * hi), b = 1 + Math.floor(next() * hi); if (a === b) b = a < hi ? a + 1 : a - 1; if (a > b) { const s = a; a = b; b = s; } out.push([a, b]); }
    return out;
  }
  function removalPositions(seed, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < n; i += 1) out.push(1 + Math.floor(next() * (n - i)));
    return out;
  }
  const RANGE_VALUES_BIG = lazy(() => randomInts(41, BIG, 1, 1000000000));
  const RANGE_QUERIES_BIG = lazy(() => bigRanges(42, BIG, BIG));
  const RANGE_OPS_BIG = lazy(() => bigOps(44, BIG, BIG, 1, 1000000000, ["set", "range"]));
  const SIGNED_BIG = lazy(() => randomInts(50, BIG, -1000000000, 1000000000));
  const SIGNED_OPS_BIG = lazy(() => bigOps(51, BIG, BIG, -1000000000, 1000000000, ["set", "range"]));
  const UPDATE_OPS_BIG = lazy(() => bigOps(52, BIG, BIG, 1, 1000000000, ["rangeAdd", "point"]));
  const FOREST_BIG = lazy(() => randomGrid(53, 1000, 1000, "*", "*", ".", 0.5));
  const RECTANGLES_BIG = lazy(() => rectangles(54, BIG, 1000));
  const FOREST_OPS_BIG = lazy(() => forestOps(55, BIG, 1000));
  const GROUPS_BIG = lazy(() => randomInts(56, BIG, 1, 1000000000));
  const REMOVALS_BIG = lazy(() => removalPositions(57, BIG));
  const SALARY_OPS_BIG = lazy(() => bigOps(58, BIG, BIG, 1, 1000000000, ["set", "range"]));
  const PIZZERIA_OPS_BIG = lazy(() => bigOps(59, BIG, BIG, 1, 1000000000, ["set", "point"]));
  const HEIGHTS_BIG = lazy(() => randomInts(60, 100000, 1, 1000000000));
  const VISIBLE_QUERIES_BIG = lazy(() => bigRanges(61, BIG, 100000));
  const INTERVAL_QUERIES_BIG = lazy(() => intervalQueries(62, 100000, 100000, 1000000000));
  const SUBARRAY_UPDATES_BIG = lazy(() => { const k = randomInts(63, BIG, 1, BIG), x = randomInts(64, BIG, -1000000000, 1000000000); return k.map((v, i) => [v, x[i]]); });
  const SMALL_VALUES_BIG = lazy(() => randomInts(65, BIG, 1, BIG));
  const DISTINCT_OPS_BIG = lazy(() => bigOps(66, BIG, BIG, 1, BIG, ["set", "range"]));
  const MOVIES_BIG = lazy(() => moviePairs(67, BIG, 1000000));
  const MOVIE_QUERIES_BIG = lazy(() => moviePairs(68, BIG, 1000000));
  const MILLION_VALUES_BIG = lazy(() => randomInts(69, BIG, 1, 1000000));
  const RUS_OPS_BIG = lazy(() => bigOps(70, BIG, BIG, 1, 1000000, ["rangeAdd", "rangeSet", "sum3"]));
  const POLY_OPS_BIG = lazy(() => bigOps(71, BIG, BIG, 1, 1, ["range", "range", "range3"]).map((op) => (op[0] === 3 ? [1, op[1], op[2]] : op)));
  const COPY_OPS_BIG = lazy(() => copyOps(72, BIG, BIG, 1000000000));

  const SAMPLE8 = [3, 2, 4, 5, 1, 1, 5, 3];
  const RANGE = [
    {
      id: "static-range-sum-queries", track: "range", title: "Static Range Sum Queries", cses: { id: 1646, name: "Static Range Sum Queries" },
      goal: "Answer many [l, r] sum queries (1-based, inclusive) on a fixed array.",
      concept: "Prefix sums make every query O(1): sum(l..r) = prefix[r] − prefix[l − 1].",
      functionName: "staticRangeSumQueries", signature: "staticRangeSumQueries(values, queries) → answers",
      starterSource: starter("staticRangeSumQueries", "values, queries"),
      solve: staticRangeSumQueries, comparator: "deep", dependencies: ["prefix-sums"],
      reference: book("9.1", "Static array queries · sum queries"),
      scene: { kind: "algo", view: "bars", handles: preset("static-range-sum-queries", ["CSES sample", "ones"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("excludes-left", "prefix[r] − prefix[l] drops the element at l; subtract prefix[l − 1].", function staticRangeSumQueries(values, queries) { const prefix = prefixSums(values); const answers = []; for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] - prefix[queries[i][0]]); return answers; }),
        diagnosis("excludes-right", "prefix[r − 1] drops the element at r.", function staticRangeSumQueries(values, queries) { const prefix = prefixSums(values); const answers = []; for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1] - 1] - prefix[queries[i][0] - 1]); return answers; }),
      ],
      hints: ["Build the prefix array once with prefixSums.", "For [l, r]: prefix[r] − prefix[l − 1].", "Collect the answers in order."],
      cases: [
        example([[3, 2, 4, 5, 1, 1, 5, 3], [[2, 4], [5, 6], [1, 8], [3, 3]]], [11, 2, 24, 4], "CSES sample"),
        example([[1, 1, 1], [[1, 1], [1, 3]]], [1, 3], "ones"),
        example([[5], [[1, 1]]], [5], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "sparse-table", title: "Sparse Table", cses: { id: 1647, name: "Static Range Minimum Queries (brick)" },
      goal: "The minimum of every block whose length is a power of two: table[j][i] = min(values[i .. i + 2ʲ − 1]).",
      concept: "Level j is built from level j − 1: a block of 2ʲ is two blocks of 2ʲ⁻¹ side by side. n log n numbers, and any range is covered by two overlapping blocks, so minimum queries become O(1).",
      functionName: "sparseTable", signature: "sparseTable(values) → number[][]",
      starterSource: starter("sparseTable", "values", "table[0] = copy; for j while 2^j ≤ n: table[j][i] = min(table[j−1][i], table[j−1][i + 2^(j−1)]) for i + 2^j ≤ n."),
      solve: sparseTable, comparator: "deep", brute: sparseTableBrute, small: (round) => [smallList(5300 + round, 1 + (round % 9), 1, 9)],
      reference: book("9.1", "Static array queries · minimum queries"),
      presets: { "CSES sample": { a: SAMPLE8 }, increasing: { a: [1, 2, 3, 4, 5] }, single: { a: [7] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("row-too-short", "Level j has n − 2ʲ + 1 entries: the block starting at n − 2ʲ still fits.", function sparseTable(values) { const n = values.length; const table = [values.slice()]; for (let j = 1; (1 << j) <= n; j += 1) { const previous = table[j - 1], half = 1 << (j - 1); const row = new Array(Math.max(0, n - (1 << j))); for (let i = 0; i < row.length; i += 1) row[i] = Math.min(previous[i], previous[i + half]); table.push(row); } return table; }),
        diagnosis("sum-not-min", "This table answers minimum queries: combine with Math.min, not +.", function sparseTable(values) { const n = values.length; const table = [values.slice()]; for (let j = 1; (1 << j) <= n; j += 1) { const previous = table[j - 1], half = 1 << (j - 1); const row = new Array(n - (1 << j) + 1); for (let i = 0; i < row.length; i += 1) row[i] = previous[i] + previous[i + half]; table.push(row); } return table; }),
      ],
      hints: ["table[0] is a copy of the values.", "For j = 1, 2, … while 2ʲ ≤ n: row i = min(table[j − 1][i], table[j − 1][i + 2ʲ⁻¹]) for i from 0 to n − 2ʲ.", "Return the array of rows."],
      cases: [
        example([[3, 2, 4, 5, 1, 1, 5, 3]], [[3, 2, 4, 5, 1, 1, 5, 3], [2, 2, 4, 1, 1, 1, 3], [2, 1, 1, 1, 1], [1]], "CSES sample"),
        example([[7]], [[7]], "single value"),
        example([[1, 2, 3, 4, 5]], [[1, 2, 3, 4, 5], [1, 2, 3, 4], [1, 2]], "increasing"),
        hidden("n = 50 000, time limit", () => [RANGE_VALUES_BIG().slice(0, 50000)]),
      ],
    },
    {
      id: "static-range-minimum-queries", title: "Static Range Minimum Queries", cses: { id: 1647, name: "Static Range Minimum Queries" },
      goal: "Answer many [a, b] minimum queries on a fixed array.",
      concept: "With the sparse table, a range of length len is covered by two blocks of 2ᵏ where k = ⌊log₂ len⌋: one starting at a, one ending at b. Overlap does not matter for a minimum.",
      functionName: "staticRangeMinimumQueries", signature: "staticRangeMinimumQueries(values, queries) → answers",
      starterSource: starter("staticRangeMinimumQueries", "values, queries", "table = sparseTable(values); k = 31 − Math.clz32(len); min(table[k][l], table[k][r − 2^k + 1]) with 0-based l, r."),
      solve: staticRangeMinimumQueries, comparator: "deep", dependencies: ["sparse-table"], brute: staticRangeMinimumBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(5400 + round, n, 1, 9), smallRanges(5500 + round, 4, n)]; },
      reference: book("9.1", "Static array queries · minimum queries"),
      presets: { "CSES sample": { a: SAMPLE8, b: [[2, 4], [5, 6], [1, 8], [3, 3]] }, increasing: { a: [1, 2, 3, 4, 5], b: [[1, 5], [3, 5]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("left-block-only", "One block of 2ᵏ covers only the start of the range; take the minimum with the block ending at r.", function staticRangeMinimumQueries(values, queries) { const table = sparseTable(values); const answers = []; for (let i = 0; i < queries.length; i += 1) { const l = queries[i][0] - 1, r = queries[i][1] - 1; const level = 31 - Math.clz32(r - l + 1); answers.push(table[level][l]); } return answers; }),
        diagnosis("level-too-high", "k must satisfy 2ᵏ ≤ len; rounding the logarithm up reads blocks that stick out of the range.", function staticRangeMinimumQueries(values, queries) { const table = sparseTable(values); const answers = []; for (let i = 0; i < queries.length; i += 1) { const l = queries[i][0] - 1, r = queries[i][1] - 1; const len = r - l + 1; let level = 31 - Math.clz32(len); if ((1 << level) < len && level + 1 < table.length) level += 1; const second = r - (1 << level) + 1; answers.push(Math.min(table[level][l] === undefined ? Infinity : table[level][l], second >= 0 && table[level][second] !== undefined ? table[level][second] : Infinity)); } return answers; }),
      ],
      hints: ["Convert a, b to 0-based l, r; len = r − l + 1.", "k = 31 − Math.clz32(len) is ⌊log₂ len⌋.", "Answer min(table[k][l], table[k][r − 2ᵏ + 1])."],
      cases: [
        example([SAMPLE8, [[2, 4], [5, 6], [1, 8], [3, 3]]], [2, 1, 1, 4], "CSES sample"),
        example([[1, 2, 3, 4, 5], [[1, 5], [3, 5], [2, 2]]], [1, 3, 2], "increasing"),
        example([[9, 7, 8], [[1, 3], [1, 2], [2, 3]]], [7, 7, 7], "three values"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "build-segment-tree", track: "range", title: "Build a Segment Tree", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Build the bottom-up array form: leaves at n..2n − 1, node i = node 2i + node 2i + 1.",
      concept: "The iterative segment tree stores the array in the second half and sums upward; index 0 is unused.",
      functionName: "buildSegmentTree", signature: "buildSegmentTree(values) → tree array of length 2n",
      starterSource: starter("buildSegmentTree", "values"),
      solve: buildSegmentTree, comparator: "deep",
      reference: book("9.3", "Segment tree"),
      scene: { kind: "algo", view: "segtree", handles: preset("build-segment-tree", ["eight values", "ones"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("leaves-only", "The internal nodes must hold the sums of their children.", function buildSegmentTree(values) { const n = values.length; const tree = new Array(2 * n).fill(0); for (let i = 0; i < n; i += 1) tree[n + i] = values[i]; return tree; }),
        diagnosis("max-not-sum", "This tree answers sum queries, so internal nodes are sums, not maxima.", function buildSegmentTree(values) { const n = values.length; const tree = new Array(2 * n).fill(0); for (let i = 0; i < n; i += 1) tree[n + i] = values[i]; for (let i = n - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); return tree; }),
      ],
      hints: ["tree has 2n entries; copy values into tree[n..2n − 1].", "For i from n − 1 down to 1: tree[i] = tree[2i] + tree[2i + 1].", "Leave tree[0] as 0."],
      cases: [
        example([[1, 2, 3, 4]], [0, 10, 3, 7, 1, 2, 3, 4], "four values"),
        example([[5]], [0, 5], "single"),
        example([[1, 2, 3]], [0, 6, 5, 1, 2, 3], "three values"),
        hidden("n = 200 000, time limit", () => [RANGE_VALUES_BIG()]),
      ],
    },
    {
      id: "segment-tree-update", track: "range", title: "Segment Tree Point Update", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Set one leaf and refresh the sums on the path to the root; the tree is modified in place and returned.",
      concept: "Only the log n ancestors of a leaf change, which is why updates are cheap.",
      functionName: "segmentTreeUpdate", signature: "segmentTreeUpdate(tree, index, value) → tree",
      starterSource: starter("segmentTreeUpdate", "tree, index, value", "index is 0-based into the original array."),
      solve: segmentTreeUpdate, comparator: "deep", allowMutation: true,
      reference: book("9.3", "Segment tree · update"),
      scene: { kind: "algo", view: "segtree", handles: preset("segment-tree-update", ["eight values", "ones"], [
        { id: "index", type: "slider", label: "index (rounded)", value: 1, min: 0, max: 7 },
        { id: "value", type: "slider", label: "new value (rounded)", value: 5, min: 0, max: 9 },
      ]), args: [{ fixture: "builtTree" }, { fixture: "roundedIndex" }, { fixture: "roundedValue" }] },
      diagnoses: [
        diagnosis("leaf-only", "The ancestors must be recomputed after changing the leaf.", function segmentTreeUpdate(tree, index, value) { const n = tree.length / 2; tree[n + index] = value; return tree; }),
        diagnosis("adds-instead-of-sets", "The task sets the value; do not add it.", function segmentTreeUpdate(tree, index, value) { const n = tree.length / 2; let position = n + index; tree[position] += value; while (position > 1) { position >>= 1; tree[position] = tree[2 * position] + tree[2 * position + 1]; } return tree; }),
      ],
      hints: ["position = n + index; tree[position] = value.", "While position > 1: position >>= 1; tree[position] = tree[2·position] + tree[2·position + 1].", "Return the same array."],
      cases: [
        example([[0, 10, 3, 7, 1, 2, 3, 4], 1, 5], [0, 13, 6, 7, 1, 5, 3, 4], "update the second leaf"),
        example([[0, 5], 0, 9], [0, 9], "single leaf"),
        example([[0, 6, 5, 1, 2, 3], 2, 0], [0, 3, 2, 1, 2, 0], "three values"),
      ],
    },
    {
      id: "segment-tree-query", track: "range", title: "Segment Tree Range Sum", cses: { id: 1648, name: "Dynamic Range Sum Queries (brick)" },
      goal: "Sum of the leaves in [l, r] (0-based, inclusive).",
      concept: "Walk lo and hi upward; whenever lo is a right child or hi is a left child, take that node and step inward.",
      functionName: "segmentTreeQuery", signature: "segmentTreeQuery(tree, l, r) → number",
      starterSource: starter("segmentTreeQuery", "tree, l, r", "lo = l + n, hi = r + n + 1; while lo < hi: if lo odd take tree[lo++]; if hi odd take tree[--hi]; halve both."),
      solve: segmentTreeQuery, comparator: "scalar",
      reference: book("9.3", "Segment tree · sum query"),
      scene: { kind: "algo", view: "segtree", handles: preset("segment-tree-query", ["eight values", "ones"], [
        { id: "l", type: "slider", label: "l (rounded)", value: 2, min: 0, max: 7 },
        { id: "r", type: "slider", label: "r (rounded)", value: 5, min: 0, max: 7 },
      ]), args: [{ fixture: "builtTree" }, { fixture: "rangeLo" }, { fixture: "rangeHi" }] },
      diagnoses: [
        diagnosis("inclusive-right-bug", "hi must start at r + n + 1, one past the last leaf.", function segmentTreeQuery(tree, l, r) { const n = tree.length / 2; let lo = l + n, hi = r + n, sum = 0; while (lo < hi) { if (lo & 1) { sum += tree[lo]; lo += 1; } if (hi & 1) { hi -= 1; sum += tree[hi]; } lo >>= 1; hi >>= 1; } return sum; }),
        diagnosis("forgets-left-odd", "A right child at lo must be taken before moving up.", function segmentTreeQuery(tree, l, r) { const n = tree.length / 2; let lo = l + n, hi = r + n + 1, sum = 0; while (lo < hi) { if (hi & 1) { hi -= 1; sum += tree[hi]; } lo >>= 1; hi >>= 1; } return sum; }),
      ],
      hints: ["lo = l + n, hi = r + n + 1 (half-open).", "If lo is odd, add tree[lo] and move lo right; if hi is odd, move hi left and add tree[hi].", "Halve both and repeat while lo < hi."],
      cases: [
        example([[0, 10, 3, 7, 1, 2, 3, 4], 1, 2], 5, "middle two"),
        example([[0, 10, 3, 7, 1, 2, 3, 4], 0, 3], 10, "everything"),
        example([[0, 10, 3, 7, 1, 2, 3, 4], 2, 2], 3, "single leaf"),
        example([[0, 6, 5, 1, 2, 3], 1, 2], 5, "three values, last two"),
      ],
    },
    {
      id: "dynamic-range-sum-queries", track: "range", title: "Dynamic Range Sum Queries", cses: { id: 1648, name: "Dynamic Range Sum Queries" },
      goal: "Process updates [1, k, u] (set position k to u) and queries [2, a, b] (sum of a..b), 1-based; return the query answers.",
      concept: "Build once, then every operation is a walk of log n nodes. Prefix sums cannot do this because an update would change every later prefix.",
      functionName: "dynamicRangeSumQueries", signature: "dynamicRangeSumQueries(values, ops) → answers",
      starterSource: starter("dynamicRangeSumQueries", "values, ops"),
      solve: dynamicRangeSumQueries, comparator: "deep", dependencies: ["build-segment-tree", "segment-tree-update", "segment-tree-query"],
      reference: book("9.3", "Segment tree"),
      scene: { kind: "algo", view: "segtree", handles: preset("dynamic-range-sum-queries", ["CSES sample", "ones"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("ignores-updates", "Updates must change the tree before later queries.", function dynamicRangeSumQueries(values, ops) { const tree = buildSegmentTree(values); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 2) answers.push(segmentTreeQuery(tree, ops[i][1] - 1, ops[i][2] - 1)); } return answers; }),
        diagnosis("one-based-into-tree", "Positions in the operations are 1-based; the bricks take 0-based indexes.", function dynamicRangeSumQueries(values, ops) { const tree = buildSegmentTree(values); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) segmentTreeUpdate(tree, ops[i][1], ops[i][2]); else answers.push(segmentTreeQuery(tree, ops[i][1], ops[i][2])); } return answers; }),
      ],
      hints: ["tree = buildSegmentTree(values).", "Type 1: segmentTreeUpdate(tree, k − 1, u). Type 2: push segmentTreeQuery(tree, a − 1, b − 1).", "Return only the query answers."],
      cases: [
        example([[3, 2, 4, 5, 1, 1, 5, 3], [[2, 1, 4], [2, 5, 6], [1, 3, 1], [2, 1, 4]]], [14, 2, 11], "CSES sample"),
        example([[1, 1, 1], [[2, 1, 3], [1, 2, 5], [2, 1, 3]]], [3, 7], "ones"),
        example([[7], [[1, 1, 2], [2, 1, 1]]], [2], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_OPS_BIG()]),
      ],
    },
    {
      id: "dynamic-range-minimum-queries", title: "Dynamic Range Minimum Queries", cses: { id: 1649, name: "Dynamic Range Minimum Queries" },
      goal: "Process updates [1, k, u] and minimum queries [2, a, b] on an array; return the query answers.",
      concept: "The same bottom-up segment tree with Math.min as the combine rule: internal nodes hold the minimum of their children, updates refresh one root path, queries fold the O(log n) covering nodes.",
      functionName: "dynamicRangeMinimumQueries", signature: "dynamicRangeMinimumQueries(values, ops) → answers",
      starterSource: starter("dynamicRangeMinimumQueries", "values, ops", "tree of size 2n with Infinity; leaves at n; internal = min of children; update walks up; query folds lo/hi with Math.min."),
      solve: dynamicRangeMinimumQueries, comparator: "deep", dependencies: ["build-segment-tree", "segment-tree-update", "segment-tree-query"], brute: dynamicRangeMinimumBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(5600 + round, n, 1, 9), smallOps(5700 + round, 5, n, 1, 9, ["set", "range"])]; },
      reference: book("9.3", "Segment tree · minimum queries"),
      presets: { "CSES sample": { a: SAMPLE8, b: [[2, 1, 4], [2, 5, 6], [1, 2, 3], [2, 1, 4]] }, ones: { a: [1, 1, 1, 1], b: [[1, 2, 9], [2, 1, 4], [2, 2, 2]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("sum-tree", "The internal nodes and the query fold must use Math.min, not addition.", function dynamicRangeMinimumQueries(values, ops) { const tree = buildSegmentTree(values); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) segmentTreeUpdate(tree, ops[i][1] - 1, ops[i][2]); else answers.push(segmentTreeQuery(tree, ops[i][1] - 1, ops[i][2] - 1)); } return answers; }),
        diagnosis("ignores-updates", "Updates must change the tree before later queries.", function dynamicRangeMinimumQueries(values, ops) { const n = values.length; const tree = new Array(2 * n).fill(Infinity); for (let i = 0; i < n; i += 1) tree[n + i] = values[i]; for (let i = n - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] !== 2) continue; let lo = n + ops[i][1] - 1, hi = n + ops[i][2], best = Infinity; while (lo < hi) { if (lo & 1) { best = Math.min(best, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; best = Math.min(best, tree[hi]); } lo >>= 1; hi >>= 1; } answers.push(best); } return answers; }),
      ],
      hints: ["tree = 2n entries filled with Infinity; leaves n + i; tree[i] = min(tree[2i], tree[2i + 1]) for i from n − 1 down to 1.", "Update: set the leaf, then climb halving the index and recomputing the minimum.", "Query [a, b]: lo = n + a − 1, hi = n + b; fold with Math.min while lo < hi."],
      cases: [
        example([SAMPLE8, [[2, 1, 4], [2, 5, 6], [1, 2, 3], [2, 1, 4]]], [2, 1, 3], "CSES sample"),
        example([[1, 1, 1, 1], [[1, 2, 9], [2, 1, 4], [2, 2, 2]]], [1, 9], "ones"),
        example([[5], [[2, 1, 1], [1, 1, 2], [2, 1, 1]]], [5, 2], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_OPS_BIG()]),
      ],
    },
    {
      id: "range-xor-queries", title: "Range Xor Queries", cses: { id: 1650, name: "Range Xor Queries" },
      goal: "Answer many [a, b] xor queries on a fixed array.",
      concept: "Xor is its own inverse, so prefix xors work like prefix sums: xor(a..b) = prefix[b] ⊕ prefix[a − 1].",
      functionName: "rangeXorQueries", signature: "rangeXorQueries(values, queries) → answers",
      starterSource: starter("rangeXorQueries", "values, queries", "prefix[i + 1] = prefix[i] ^ values[i]; answer prefix[b] ^ prefix[a − 1]."),
      solve: rangeXorQueries, comparator: "deep", brute: rangeXorBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(5800 + round, n, 1, 15), smallRanges(5900 + round, 4, n)]; },
      reference: book("9.1", "Static array queries · prefix sums"),
      presets: { "CSES sample": { a: SAMPLE8, b: [[2, 4], [5, 6], [1, 8], [3, 3]] }, "same twice": { a: [6, 6, 6], b: [[1, 2], [1, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("subtracts", "Undo a prefix with xor, not subtraction: prefix[b] ^ prefix[a − 1].", function rangeXorQueries(values, queries) { const prefix = [0]; for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] ^ values[i]); return queries.map((q) => prefix[q[1]] - prefix[q[0] - 1]); }),
        diagnosis("excludes-left", "prefix[a] already contains the element at a; xor with prefix[a − 1].", function rangeXorQueries(values, queries) { const prefix = [0]; for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] ^ values[i]); return queries.map((q) => prefix[q[1]] ^ prefix[q[0]]); }),
      ],
      hints: ["prefix[0] = 0; prefix[i + 1] = prefix[i] ^ values[i].", "Each query: prefix[b] ^ prefix[a − 1].", "Collect the answers in order."],
      cases: [
        example([SAMPLE8, [[2, 4], [5, 6], [1, 8], [3, 3]]], [3, 0, 6, 4], "CSES sample"),
        example([[6, 6, 6], [[1, 2], [1, 3]]], [0, 6], "same twice cancels"),
        example([[5], [[1, 1]]], [5], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "range-update-queries", title: "Range Update Queries", cses: { id: 1651, name: "Range Update Queries" },
      goal: "Process [1, a, b, u] (add u to every value in a..b) and [2, k] (report the value at k); return the reported values.",
      concept: "Store the additions as a difference array in a Fenwick tree: +u at a and −u at b + 1. The value at k is the original plus the prefix sum of differences up to k.",
      functionName: "rangeUpdateQueries", signature: "rangeUpdateQueries(values, ops) → answers",
      starterSource: starter("rangeUpdateQueries", "values, ops", "tree of n + 1 zeros; type 1: fenwickAdd(tree, a, u), fenwickAdd(tree, b + 1, −u) if b < n; type 2: values[k − 1] + fenwickPrefix(tree, k)."),
      solve: rangeUpdateQueries, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix"], brute: rangeUpdateBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(6000 + round, n, 1, 9), smallOps(6100 + round, 5, n, 1, 9, ["rangeAdd", "point"])]; },
      reference: book("9.4", "Range updates · difference arrays"),
      presets: { "CSES sample": { a: SAMPLE8, b: [[2, 4], [1, 2, 5, 1], [2, 4]] }, "whole array": { a: [1, 1, 1], b: [[1, 1, 3, 4], [2, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-cancel", "The addition must stop after b: add −u at b + 1.", function rangeUpdateQueries(values, ops) { const n = values.length; const tree = new Array(n + 1).fill(0); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) fenwickAdd(tree, ops[i][1], ops[i][3]); else answers.push(values[ops[i][1] - 1] + fenwickPrefix(tree, ops[i][1])); } return answers; }),
        diagnosis("forgets-original", "The reported value is the original plus the accumulated additions.", function rangeUpdateQueries(values, ops) { const n = values.length; const tree = new Array(n + 1).fill(0); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { fenwickAdd(tree, ops[i][1], ops[i][3]); if (ops[i][2] + 1 <= n) fenwickAdd(tree, ops[i][2] + 1, -ops[i][3]); } else answers.push(fenwickPrefix(tree, ops[i][1])); } return answers; }),
      ],
      hints: ["A Fenwick tree over differences: adding u to a..b is +u at a and −u at b + 1.", "Skip the −u when b + 1 exceeds n.", "Value at k = values[k − 1] + fenwickPrefix(tree, k)."],
      cases: [
        example([SAMPLE8, [[2, 4], [1, 2, 5, 1], [2, 4]]], [5, 6], "CSES sample"),
        example([[1, 1, 1], [[1, 1, 3, 4], [2, 3], [1, 3, 3, 2], [2, 2], [2, 3]]], [5, 5, 7], "whole array then the end"),
        example([[7], [[2, 1], [1, 1, 1, 3], [2, 1]]], [7, 10], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), UPDATE_OPS_BIG()]),
      ],
    },
    {
      id: "forest-queries", title: "Forest Queries", cses: { id: 1652, name: "Forest Queries" },
      goal: "Count the trees ('*') inside rectangles [y1, x1, y2, x2] of a fixed grid (rows y, columns x, 1-based).",
      concept: "Two-dimensional prefix sums: P[y][x] counts trees in the top-left y × x block, built with inclusion–exclusion, and a rectangle is four lookups.",
      functionName: "forestQueries", signature: "forestQueries(grid, queries) → answers",
      starterSource: starter("forestQueries", "grid, queries", "P[y][x] = P[y−1][x] + P[y][x−1] − P[y−1][x−1] + tree; answer P[y2][x2] − P[y1−1][x2] − P[y2][x1−1] + P[y1−1][x1−1]."),
      solve: forestQueries, comparator: "deep", brute: forestBrute, small: (round) => { const n = 1 + (round % 6); return [randomGrid(6200 + round, n, n, "*", "*", ".", 0.5), rectangles(6300 + round, 4, n)]; },
      reference: book("9.1", "Static array queries · two dimensions"),
      presets: { "CSES sample": { a: [".*..", "*.**", "**..", "****"], b: [[2, 2, 3, 4], [3, 1, 3, 1], [1, 1, 2, 2]] }, "all trees": { a: ["**", "**"], b: [[1, 1, 2, 2], [2, 2, 2, 2]] } },
      scene: { kind: "algo", view: "grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("corner-term-missing", "Subtracting the top and left strips removes their shared corner twice; add P[y1 − 1][x1 − 1] back.", function forestQueries(grid, queries) { const n = grid.length, width = n + 1; const prefix = new Array(width * width).fill(0); for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) prefix[y * width + x] = prefix[(y - 1) * width + x] + prefix[y * width + x - 1] - prefix[(y - 1) * width + x - 1] + (grid[y - 1][x - 1] === "*" ? 1 : 0); return queries.map((q) => prefix[q[2] * width + q[3]] - prefix[(q[0] - 1) * width + q[3]] - prefix[q[2] * width + q[1] - 1]); }),
        diagnosis("axes-swapped", "Queries give y (row) first, then x (column).", function forestQueries(grid, queries) { const n = grid.length, width = n + 1; const prefix = new Array(width * width).fill(0); for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) prefix[y * width + x] = prefix[(y - 1) * width + x] + prefix[y * width + x - 1] - prefix[(y - 1) * width + x - 1] + (grid[y - 1][x - 1] === "*" ? 1 : 0); return queries.map((q) => { const y1 = q[1], x1 = q[0], y2 = q[3], x2 = q[2]; return prefix[y2 * width + x2] - prefix[(y1 - 1) * width + x2] - prefix[y2 * width + x1 - 1] + prefix[(y1 - 1) * width + x1 - 1]; }); }),
      ],
      hints: ["A (n + 1) × (n + 1) table with a zero row and column.", "P[y][x] = P[y − 1][x] + P[y][x − 1] − P[y − 1][x − 1] + (tree ? 1 : 0).", "Rectangle = P[y2][x2] − P[y1 − 1][x2] − P[y2][x1 − 1] + P[y1 − 1][x1 − 1]."],
      cases: [
        example([[".*..", "*.**", "**..", "****"], [[2, 2, 3, 4], [3, 1, 3, 1], [1, 1, 2, 2]]], [3, 1, 2], "CSES sample"),
        example([["**", "**"], [[1, 1, 2, 2], [2, 2, 2, 2]]], [4, 1], "all trees"),
        example([["."], [[1, 1, 1, 1]]], [0], "single empty cell"),
        hidden("1000 × 1000, q = 200 000, time limit", () => [FOREST_BIG(), RECTANGLES_BIG()]),
      ],
    },
    {
      id: "hotel-queries", title: "Hotel Queries", cses: { id: 1143, name: "Hotel Queries" },
      goal: "For each group in order, the number of the first hotel with enough free rooms (0 if none); the group then takes those rooms.",
      concept: "A maximum segment tree over free rooms answers 'is there any hotel with ≥ r rooms?' at the root, and descending left-first whenever the left child suffices finds the first such hotel in O(log n).",
      functionName: "hotelQueries", signature: "hotelQueries(rooms, groups) → answers",
      starterSource: starter("hotelQueries", "rooms, groups", "Power-of-two size max tree; if tree[1] < need → 0; else descend: v = tree[2v] ≥ need ? 2v : 2v + 1; subtract at the leaf and refresh."),
      solve: hotelQueries, comparator: "deep", brute: hotelBrute, small: (round) => [smallList(6400 + round, 1 + (round % 8), 1, 9), smallList(6500 + round, 1 + (round % 6), 1, 9)],
      reference: book("9.3", "Segment tree · finding the first position"),
      presets: { "CSES sample": { a: [3, 2, 4, 1, 5, 5, 2, 6], b: [4, 4, 7, 1, 1] }, "one hotel": { a: [5], b: [3, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("rooms-not-taken", "A group occupies its rooms: subtract at the leaf and refresh the ancestors.", function hotelQueries(rooms, groups) { let size = 1; while (size < rooms.length) size *= 2; const tree = new Array(2 * size).fill(0); for (let i = 0; i < rooms.length; i += 1) tree[size + i] = rooms[i]; for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); return groups.map((need) => { if (tree[1] < need) return 0; let v = 1; while (v < size) v = tree[2 * v] >= need ? 2 * v : 2 * v + 1; return v - size + 1; }); }),
        diagnosis("descends-right-first", "The first hotel is wanted: prefer the left child whenever it has enough rooms.", function hotelQueries(rooms, groups) { let size = 1; while (size < rooms.length) size *= 2; const tree = new Array(2 * size).fill(0); for (let i = 0; i < rooms.length; i += 1) tree[size + i] = rooms[i]; for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); return groups.map((need) => { if (tree[1] < need) return 0; let v = 1; while (v < size) v = tree[2 * v + 1] >= need ? 2 * v + 1 : 2 * v; const answer = v - size + 1; tree[v] -= need; for (let p = v >> 1; p >= 1; p >>= 1) tree[p] = Math.max(tree[2 * p], tree[2 * p + 1]); return answer; }); }),
      ],
      hints: ["size = the first power of two ≥ n; leaves size + i; internal nodes hold the max.", "Root smaller than the need → 0. Otherwise descend: left child if its max ≥ need, else right child.", "Hotel = v − size + 1; tree[v] −= need; recompute the ancestors."],
      cases: [
        example([[3, 2, 4, 1, 5, 5, 2, 6], [4, 4, 7, 1, 1]], [3, 5, 0, 1, 1], "CSES sample"),
        example([[5], [3, 3]], [1, 0], "one hotel"),
        example([[1, 9, 9], [5, 5, 5]], [2, 3, 0], "fill in order"),
        hidden("n = m = 200 000, time limit", () => [RANGE_VALUES_BIG(), GROUPS_BIG()]),
      ],
    },
    {
      id: "list-removals", title: "List Removals", cses: { id: 1749, name: "List Removals" },
      goal: "Remove the element at position p₁ (1-based in the current list), then position p₂ in what remains, and so on; report the removed values.",
      concept: "A Fenwick tree of ones marks which original positions are still present. The p-th remaining element is the p-th one in that tree, which the k-th-element brick finds in O(log n); removing it sets its one to zero.",
      functionName: "listRemovals", signature: "listRemovals(values, positions) → removed values",
      starterSource: starter("listRemovals", "values, positions", "tree of n + 1 with a one at each index; index = fenwickKth(tree, p); push values[index − 1]; fenwickAdd(tree, index, −1)."),
      solve: listRemovals, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix", "fenwick-kth"], brute: listRemovalsBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(6600 + round, n, 1, 9), removalPositions(6700 + round, n)]; },
      reference: book("9.2", "Binary indexed tree · k-th element"),
      presets: { "CSES sample": { a: [2, 6, 1, 4, 2], b: [3, 1, 3, 1, 1] }, "always first": { a: [5, 6, 7], b: [1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-renumbering", "After a removal the later elements shift left; positions refer to the current list, not the original.", function listRemovals(values, positions) { return positions.map((p) => values[p - 1]); }),
        diagnosis("not-removed", "The removed element must leave the tree: fenwickAdd(tree, index, −1).", function listRemovals(values, positions) { const n = values.length; const tree = new Array(n + 1).fill(0); for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1); return positions.map((p) => values[fenwickKth(tree, p) - 1]); }),
      ],
      hints: ["Build a Fenwick tree with a 1 at every index 1..n.", "For each p: index = fenwickKth(tree, p) is the original position of the p-th remaining element.", "Record values[index − 1] and fenwickAdd(tree, index, −1)."],
      cases: [
        example([[2, 6, 1, 4, 2], [3, 1, 3, 1, 1]], [1, 2, 2, 6, 4], "CSES sample"),
        example([[5, 6, 7], [1, 1, 1]], [5, 6, 7], "always the first"),
        example([[5, 6, 7], [3, 2, 1]], [7, 6, 5], "always the last"),
        hidden("n = 200 000, time limit", () => [RANGE_VALUES_BIG(), REMOVALS_BIG()]),
      ],
    },
    {
      id: "salary-queries", title: "Salary Queries", cses: { id: 1144, name: "Salary Queries" },
      goal: "Process [1, k, x] (employee k now earns x) and [2, a, b] (how many employees earn between a and b); return the counts.",
      concept: "Salaries reach 10⁹ but only n + q distinct values ever appear: collect them all up front, sort, and index a Fenwick tree by rank. A count in [a, b] is prefix(rank of b, inclusive) − prefix(rank of a, exclusive).",
      functionName: "salaryQueries", signature: "salaryQueries(salaries, ops) → answers",
      starterSource: starter("salaryQueries", "salaries, ops", "distinct = sorted unique of salaries and every update value; rank(v) = lowerBound(distinct, v) + 1; counts in a Fenwick tree; [a, b] → prefix(upperBound(distinct, b)) − prefix(lowerBound(distinct, a))."),
      solve: salaryQueries, comparator: "deep", dependencies: ["lower-bound", "upper-bound", "fenwick-add", "fenwick-prefix"], brute: salaryBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(6800 + round, n, 1, 9), smallOps(6900 + round, 6, n, 1, 9, ["set", "range"])]; },
      reference: book("9.2", "Binary indexed tree · coordinate compression"),
      presets: { "CSES sample": { a: [3, 7, 2, 2, 5], b: [[2, 2, 3], [1, 3, 6], [2, 2, 3]] }, "new value appears": { a: [1, 1], b: [[1, 1, 9], [2, 5, 9]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("upper-bound-missing", "b is inclusive: the rank limit is upperBound(distinct, b), the count of distinct values ≤ b.", function salaryQueries(salaries, ops) { const all = salaries.slice(); for (let i = 0; i < ops.length; i += 1) if (ops[i][0] === 1) all.push(ops[i][2]); all.sort((p, q) => p - q); const distinct = []; for (let i = 0; i < all.length; i += 1) if (i === 0 || all[i] !== all[i - 1]) distinct.push(all[i]); const tree = new Array(distinct.length + 1).fill(0); const current = salaries.slice(); for (let i = 0; i < current.length; i += 1) fenwickAdd(tree, lowerBound(distinct, current[i]) + 1, 1); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { const k = ops[i][1] - 1; fenwickAdd(tree, lowerBound(distinct, current[k]) + 1, -1); current[k] = ops[i][2]; fenwickAdd(tree, lowerBound(distinct, current[k]) + 1, 1); } else answers.push(fenwickPrefix(tree, lowerBound(distinct, ops[i][2])) - fenwickPrefix(tree, lowerBound(distinct, ops[i][1]))); } return answers; }),
        diagnosis("old-salary-kept", "An update removes the old salary from the tree before adding the new one.", function salaryQueries(salaries, ops) { const all = salaries.slice(); for (let i = 0; i < ops.length; i += 1) if (ops[i][0] === 1) all.push(ops[i][2]); all.sort((p, q) => p - q); const distinct = []; for (let i = 0; i < all.length; i += 1) if (i === 0 || all[i] !== all[i - 1]) distinct.push(all[i]); const tree = new Array(distinct.length + 1).fill(0); const current = salaries.slice(); for (let i = 0; i < current.length; i += 1) fenwickAdd(tree, lowerBound(distinct, current[i]) + 1, 1); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { const k = ops[i][1] - 1; current[k] = ops[i][2]; fenwickAdd(tree, lowerBound(distinct, current[k]) + 1, 1); } else answers.push(fenwickPrefix(tree, upperBound(distinct, ops[i][2])) - fenwickPrefix(tree, lowerBound(distinct, ops[i][1]))); } return answers; }),
      ],
      hints: ["Gather every salary and every update value, sort, dedupe: distinct.", "rank(v) = lowerBound(distinct, v) + 1; add 1 at each employee's rank.", "Update: −1 at the old rank, +1 at the new. Count: prefix(upperBound(distinct, b)) − prefix(lowerBound(distinct, a))."],
      cases: [
        example([[3, 7, 2, 2, 5], [[2, 2, 3], [1, 3, 6], [2, 2, 3]]], [3, 2], "CSES sample"),
        example([[1, 1], [[1, 1, 9], [2, 5, 9], [2, 1, 1]]], [1, 1], "a new value appears"),
        example([[4], [[2, 4, 4], [2, 5, 9]]], [1, 0], "single employee"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), SALARY_OPS_BIG()]),
      ],
    },
    {
      id: "prefix-sum-queries", title: "Prefix Sum Queries", cses: { id: 2166, name: "Prefix Sum Queries" },
      goal: "Process [1, k, u] updates and [2, a, b] queries asking the maximum prefix sum inside a..b (the empty prefix, 0, allowed); return the query answers.",
      concept: "Each node stores its sum and its best prefix. Two neighbours combine as best = max(left.best, left.sum + right.best), so the tree answers the question with the same walk as a sum tree, folding left parts and right parts in order.",
      functionName: "prefixSumQueries", signature: "prefixSumQueries(values, ops) → answers",
      starterSource: starter("prefixSumQueries", "values, ops", "Power-of-two size; sum[] and best[] (leaf best = max(0, v)); combine best = max(L.best, L.sum + R.best); query folds a left accumulator and a right accumulator."),
      solve: prefixSumQueries, comparator: "deep", brute: prefixSumBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(7000 + round, n, -5, 5), smallOps(7100 + round, 6, n, -5, 5, ["set", "range"])]; },
      reference: book("9.3", "Segment tree · additional information in nodes"),
      presets: { "CSES sample": { a: [1, 2, -1, 3, 1, -5, 1, 4], b: [[2, 2, 6], [1, 4, -2], [2, 2, 6], [2, 3, 4]] }, "all negative": { a: [-2, -3], b: [[2, 1, 2]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-empty-prefix", "The empty prefix counts: a leaf's best is max(0, value) and an answer is never negative.", function prefixSumQueries(values, ops) { let size = 1; while (size < values.length) size *= 2; const sum = new Array(2 * size).fill(0), best = new Array(2 * size).fill(-Infinity); for (let i = 0; i < values.length; i += 1) { sum[size + i] = values[i]; best[size + i] = values[i]; } for (let i = size - 1; i >= 1; i -= 1) { sum[i] = sum[2 * i] + sum[2 * i + 1]; best[i] = Math.max(best[2 * i], sum[2 * i] + best[2 * i + 1]); } const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { let v = size + ops[i][1] - 1; sum[v] = ops[i][2]; best[v] = ops[i][2]; for (v >>= 1; v >= 1; v >>= 1) { sum[v] = sum[2 * v] + sum[2 * v + 1]; best[v] = Math.max(best[2 * v], sum[2 * v] + best[2 * v + 1]); } } else { let lo = size + ops[i][1] - 1, hi = size + ops[i][2]; let leftSum = 0, leftBest = -Infinity, rightSum = 0, rightBest = -Infinity; while (lo < hi) { if (lo & 1) { leftBest = Math.max(leftBest, leftSum + best[lo]); leftSum += sum[lo]; lo += 1; } if (hi & 1) { hi -= 1; rightBest = Math.max(best[hi], sum[hi] + rightBest); rightSum += sum[hi]; } lo >>= 1; hi >>= 1; } answers.push(Math.max(leftBest, leftSum + rightBest)); } } return answers; }),
        diagnosis("best-without-left-sum", "A prefix that reaches into the right part carries the whole left sum: best = max(L.best, L.sum + R.best).", function prefixSumQueries(values, ops) { let size = 1; while (size < values.length) size *= 2; const sum = new Array(2 * size).fill(0), best = new Array(2 * size).fill(0); for (let i = 0; i < values.length; i += 1) { sum[size + i] = values[i]; best[size + i] = Math.max(0, values[i]); } for (let i = size - 1; i >= 1; i -= 1) { sum[i] = sum[2 * i] + sum[2 * i + 1]; best[i] = Math.max(best[2 * i], best[2 * i + 1]); } const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { let v = size + ops[i][1] - 1; sum[v] = ops[i][2]; best[v] = Math.max(0, ops[i][2]); for (v >>= 1; v >= 1; v >>= 1) { sum[v] = sum[2 * v] + sum[2 * v + 1]; best[v] = Math.max(best[2 * v], best[2 * v + 1]); } } else { let lo = size + ops[i][1] - 1, hi = size + ops[i][2]; let leftBest = 0, rightBest = 0; while (lo < hi) { if (lo & 1) { leftBest = Math.max(leftBest, best[lo]); lo += 1; } if (hi & 1) { hi -= 1; rightBest = Math.max(best[hi], rightBest); } lo >>= 1; hi >>= 1; } answers.push(Math.max(leftBest, rightBest)); } } return answers; }),
      ],
      hints: ["Leaves: sum = v, best = max(0, v). Node: sum = L.sum + R.sum, best = max(L.best, L.sum + R.best).", "Query: fold left pieces into (leftSum, leftBest) left to right and right pieces into (rightSum, rightBest) right to left.", "Answer max(leftBest, leftSum + rightBest)."],
      cases: [
        example([[1, 2, -1, 3, 1, -5, 1, 4], [[2, 2, 6], [1, 4, -2], [2, 2, 6], [2, 3, 4]]], [5, 2, 0], "CSES sample"),
        example([[-2, -3], [[2, 1, 2], [1, 1, 4], [2, 1, 2]]], [0, 4], "all negative, then a positive"),
        example([[5], [[2, 1, 1]]], [5], "single"),
        hidden("n = q = 200 000, time limit", () => [SIGNED_BIG(), SIGNED_OPS_BIG()]),
      ],
    },
    {
      id: "pizzeria-queries", title: "Pizzeria Queries", cses: { id: 2206, name: "Pizzeria Queries" },
      goal: "Process [1, k, x] (pizzeria k now charges x) and [2, k] (cheapest pizza delivered to building k: price plus distance); return the query answers.",
      concept: "Split the absolute value: for i ≤ k the cost is (pᵢ − i) + k, for i ≥ k it is (pᵢ + i) − k. Two minimum trees, one over pᵢ − i and one over pᵢ + i, answer each side with a prefix and a suffix minimum.",
      functionName: "pizzeriaQueries", signature: "pizzeriaQueries(prices, ops) → answers",
      starterSource: starter("pizzeriaQueries", "prices, ops", "left tree over p − i, right tree over p + i (1-based i); answer min(min(left[1..k]) + k, min(right[k..n]) − k)."),
      solve: pizzeriaQueries, comparator: "deep", brute: pizzeriaBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(7200 + round, n, 1, 9), smallOps(7300 + round, 6, n, 1, 9, ["set", "point"])]; },
      reference: book("9.3", "Segment tree · two trees for an absolute value"),
      presets: { "CSES sample": { a: [8, 6, 4, 5, 7, 5], b: [[2, 2], [1, 5, 1], [2, 2]] }, "cheap far away": { a: [9, 9, 1], b: [[2, 1]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("left-side-only", "Pizzerias to the right of k count too: min over i ≥ k of (pᵢ + i) − k.", function pizzeriaQueries(prices, ops) { const n = prices.length; let size = 1; while (size < n) size *= 2; const left = new Array(2 * size).fill(Infinity); for (let i = 0; i < n; i += 1) left[size + i] = prices[i] - (i + 1); for (let i = size - 1; i >= 1; i -= 1) left[i] = Math.min(left[2 * i], left[2 * i + 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { const k = ops[i][1]; if (ops[i][0] === 1) { let v = size + k - 1; left[v] = ops[i][2] - k; for (v >>= 1; v >= 1; v >>= 1) left[v] = Math.min(left[2 * v], left[2 * v + 1]); } else { let lo = size, hi = size + k, best = Infinity; while (lo < hi) { if (lo & 1) { best = Math.min(best, left[lo]); lo += 1; } if (hi & 1) { hi -= 1; best = Math.min(best, left[hi]); } lo >>= 1; hi >>= 1; } answers.push(best + k); } } return answers; }),
        diagnosis("no-distance", "The distance |i − k| is part of the cost; the cheapest price alone is not the answer.", function pizzeriaQueries(prices, ops) { const n = prices.length; let size = 1; while (size < n) size *= 2; const tree = new Array(2 * size).fill(Infinity); for (let i = 0; i < n; i += 1) tree[size + i] = prices[i]; for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { let v = size + ops[i][1] - 1; tree[v] = ops[i][2]; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.min(tree[2 * v], tree[2 * v + 1]); } else answers.push(tree[1]); } return answers; }),
      ],
      hints: ["Two minimum trees: left leaf i = pᵢ − i, right leaf i = pᵢ + i (1-based i).", "An update rewrites both leaves and their root paths.", "Query k: min over left[1..k] + k versus min over right[k..n] − k; take the smaller."],
      cases: [
        example([[8, 6, 4, 5, 7, 5], [[2, 2], [1, 5, 1], [2, 2]]], [5, 4], "CSES sample"),
        example([[9, 9, 1], [[2, 1], [2, 3]]], [3, 1], "cheap one far away"),
        example([[4], [[2, 1], [1, 1, 2], [2, 1]]], [4, 2], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), PIZZERIA_OPS_BIG()]),
      ],
    },
    {
      id: "visible-buildings-queries", title: "Visible Buildings Queries", cses: { id: 3304, name: "Visible Buildings Queries" },
      goal: "For each [a, b], how many buildings you see standing left of a, looking right, if only buildings a..b existed: a building is visible when it is taller than everything between a and it.",
      concept: "The visible buildings are a, then the next taller building after a, then the next taller after that, and so on: a chain of 'next greater' pointers. Binary lifting on that chain counts the hops that stay ≤ b in O(log n).",
      functionName: "visibleBuildingsQueries", signature: "visibleBuildingsQueries(heights, queries) → answers",
      starterSource: starter("visibleBuildingsQueries", "heights, queries", "next[i] = first j > i with h[j] > h[i] (stack from the right, n + 1 when none); up[j][i] tables; count = 1 + hops while up[j][i] ≤ b."),
      solve: visibleBuildingsQueries, comparator: "deep", brute: visibleBuildingsBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(7400 + round, n, 1, 6), smallRanges(7500 + round, 4, n)]; },
      reference: book("16.3", "Successor paths · binary lifting"),
      presets: { "CSES sample": { a: [4, 1, 2, 2, 3], b: [[1, 5], [2, 5], [3, 4]] }, increasing: { a: [1, 2, 3, 4], b: [[1, 4], [2, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("equal-height-visible", "A building of equal height is hidden; the next pointer must go to a strictly taller building.", function visibleBuildingsQueries(heights, queries) { const n = heights.length; const next = new Array(n + 2).fill(n + 1); const stack = []; for (let i = n; i >= 1; i -= 1) { while (stack.length && heights[stack[stack.length - 1] - 1] < heights[i - 1]) stack.pop(); next[i] = stack.length ? stack[stack.length - 1] : n + 1; stack.push(i); } const up = [next]; for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 2).fill(n + 1); for (let i = 1; i <= n + 1; i += 1) row[i] = previous[previous[i]]; up.push(row); } return queries.map((query) => { let i = query[0], count = 1; for (let j = 17; j >= 0; j -= 1) { if (up[j][i] <= query[1]) { count += 1 << j; i = up[j][i]; } } return count; }); }),
        diagnosis("first-building-uncounted", "Building a itself is always visible: start the count at 1.", function visibleBuildingsQueries(heights, queries) { const n = heights.length; const next = new Array(n + 2).fill(n + 1); const stack = []; for (let i = n; i >= 1; i -= 1) { while (stack.length && heights[stack[stack.length - 1] - 1] <= heights[i - 1]) stack.pop(); next[i] = stack.length ? stack[stack.length - 1] : n + 1; stack.push(i); } const up = [next]; for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 2).fill(n + 1); for (let i = 1; i <= n + 1; i += 1) row[i] = previous[previous[i]]; up.push(row); } return queries.map((query) => { let i = query[0], count = 0; for (let j = 17; j >= 0; j -= 1) { if (up[j][i] <= query[1]) { count += 1 << j; i = up[j][i]; } } return count; }); }),
      ],
      hints: ["Scan from the right with a stack of indices whose heights decrease; pop while the top is ≤ h[i]; next[i] = top or n + 1.", "up[0] = next; up[j][i] = up[j − 1][up[j − 1][i]]; the sentinel n + 1 maps to itself.", "Query: i = a, count = 1; for j high to low: if up[j][i] ≤ b then count += 2ʲ and jump."],
      cases: [
        example([[4, 1, 2, 2, 3], [[1, 5], [2, 5], [3, 4]]], [1, 3, 1], "CSES sample"),
        example([[1, 2, 3, 4], [[1, 4], [2, 3]]], [4, 2], "increasing"),
        example([[5, 5, 5], [[1, 3]]], [1], "equal heights"),
        hidden("n = 100 000, q = 200 000, time limit", () => [HEIGHTS_BIG(), VISIBLE_QUERIES_BIG()]),
      ],
    },
    {
      id: "range-interval-queries", title: "Range Interval Queries", cses: { id: 3163, name: "Range Interval Queries" },
      goal: "For each [a, b, c, d], how many positions i in a..b hold a value between c and d.",
      concept: "Offline sweep over values: count(values ≤ d in a..b) − count(values ≤ c − 1 in a..b). Sort the positions by value and the thresholds by value; insert positions into a Fenwick tree as the threshold rises and read the range count at each threshold.",
      functionName: "rangeIntervalQueries", signature: "rangeIntervalQueries(values, queries) → answers",
      starterSource: starter("rangeIntervalQueries", "values, queries", "points sorted by value; events [threshold, query, sign] for d (+1) and c − 1 (−1) sorted; sweep adding positions ≤ threshold; answer[q] += sign · (prefix(b) − prefix(a − 1))."),
      solve: rangeIntervalQueries, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix"], brute: rangeIntervalBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(7600 + round, n, 1, 9), intervalQueries(7700 + round, 4, n, 9)]; },
      reference: book("9.4", "Offline queries · sweeping over values"),
      presets: { "CSES sample": { a: SAMPLE8, b: [[2, 4, 2, 4], [5, 6, 2, 9], [1, 8, 1, 5], [3, 3, 4, 4]] }, "narrow band": { a: [1, 5, 3, 5], b: [[1, 4, 5, 5], [2, 3, 1, 4]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("lower-threshold-off", "The subtracted count must use c − 1 so that values equal to c stay counted.", function rangeIntervalQueries(values, queries) { const n = values.length; const points = []; for (let i = 0; i < n; i += 1) points.push([values[i], i + 1]); points.sort((p, q) => p[0] - q[0]); const events = []; for (let i = 0; i < queries.length; i += 1) { events.push([queries[i][3], i, 1]); events.push([queries[i][2], i, -1]); } events.sort((p, q) => p[0] - q[0]); const tree = new Array(n + 1).fill(0); const answers = new Array(queries.length).fill(0); let taken = 0; for (let e = 0; e < events.length; e += 1) { const threshold = events[e][0], index = events[e][1], sign = events[e][2]; while (taken < n && points[taken][0] <= threshold) { fenwickAdd(tree, points[taken][1], 1); taken += 1; } answers[index] += sign * (fenwickPrefix(tree, queries[index][1]) - fenwickPrefix(tree, queries[index][0] - 1)); } return answers; }),
        diagnosis("ignores-positions", "Only positions a..b count: read prefix(b) − prefix(a − 1), not the whole tree.", function rangeIntervalQueries(values, queries) { const n = values.length; const points = []; for (let i = 0; i < n; i += 1) points.push([values[i], i + 1]); points.sort((p, q) => p[0] - q[0]); const events = []; for (let i = 0; i < queries.length; i += 1) { events.push([queries[i][3], i, 1]); events.push([queries[i][2] - 1, i, -1]); } events.sort((p, q) => p[0] - q[0]); const tree = new Array(n + 1).fill(0); const answers = new Array(queries.length).fill(0); let taken = 0; for (let e = 0; e < events.length; e += 1) { const threshold = events[e][0], index = events[e][1], sign = events[e][2]; while (taken < n && points[taken][0] <= threshold) { fenwickAdd(tree, points[taken][1], 1); taken += 1; } answers[index] += sign * fenwickPrefix(tree, n); } return answers; }),
      ],
      hints: ["points = [value, position] sorted by value; events = [d, q, +1] and [c − 1, q, −1] sorted by threshold.", "Sweep the events; before each, add every point with value ≤ threshold to the Fenwick tree at its position.", "answers[q] += sign · (prefix(b) − prefix(a − 1))."],
      cases: [
        example([SAMPLE8, [[2, 4, 2, 4], [5, 6, 2, 9], [1, 8, 1, 5], [3, 3, 4, 4]]], [2, 0, 8, 1], "CSES sample"),
        example([[1, 5, 3, 5], [[1, 4, 5, 5], [2, 3, 1, 4]]], [2, 1], "narrow band"),
        example([[7], [[1, 1, 7, 7], [1, 1, 8, 9]]], [1, 0], "single"),
        hidden("n = q = 100 000, time limit", () => [RANGE_VALUES_BIG().slice(0, 100000), INTERVAL_QUERIES_BIG()]),
      ],
    },
    {
      id: "subarray-node-merge", title: "Subarray Node Merge", cses: { id: 1190, name: "Subarray Sum Queries (brick)" },
      goal: "Combine two neighbouring segments described by {sum, prefix, suffix, best} (best prefix sum, best suffix sum, best subarray sum, empty allowed) into the description of their concatenation.",
      concept: "A best subarray of the joined segment lies inside the left, inside the right, or straddles the seam as left.suffix + right.prefix. The prefix and suffix extend across the seam the same way.",
      functionName: "mergeSubarrayNodes", signature: "mergeSubarrayNodes(left, right) → { sum, prefix, suffix, best }",
      starterSource: starter("mergeSubarrayNodes", "left, right", "sum = L.sum + R.sum; prefix = max(L.prefix, L.sum + R.prefix); suffix = max(R.suffix, R.sum + L.suffix); best = max(L.best, R.best, L.suffix + R.prefix)."),
      solve: mergeSubarrayNodes, comparator: "deep",
      reference: book("9.3", "Segment tree · maximum subarray sum"),
      presets: { "[2, −1] + [3, −4]": { a: { sum: 1, prefix: 2, suffix: 1, best: 2 }, b: { sum: -1, prefix: 3, suffix: 0, best: 3 } }, "two positives": { a: { sum: 4, prefix: 4, suffix: 4, best: 4 }, b: { sum: 5, prefix: 5, suffix: 5, best: 5 } } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-seam", "The best subarray may cross the seam: include left.suffix + right.prefix.", function mergeSubarrayNodes(left, right) { return { sum: left.sum + right.sum, prefix: Math.max(left.prefix, left.sum + right.prefix), suffix: Math.max(right.suffix, right.sum + left.suffix), best: Math.max(left.best, right.best) }; }),
        diagnosis("prefix-without-left-sum", "A prefix reaching into the right segment carries the whole left sum: max(left.prefix, left.sum + right.prefix).", function mergeSubarrayNodes(left, right) { return { sum: left.sum + right.sum, prefix: Math.max(left.prefix, right.prefix), suffix: Math.max(left.suffix, right.suffix), best: Math.max(left.best, right.best, left.suffix + right.prefix) }; }),
      ],
      hints: ["sum adds.", "prefix = max(L.prefix, L.sum + R.prefix); suffix = max(R.suffix, R.sum + L.suffix).", "best = max(L.best, R.best, L.suffix + R.prefix)."],
      cases: [
        example([{ sum: 1, prefix: 2, suffix: 1, best: 2 }, { sum: -1, prefix: 3, suffix: 0, best: 3 }], { sum: 0, prefix: 4, suffix: 0, best: 4 }, "[2, −1] + [3, −4]"),
        example([{ sum: 4, prefix: 4, suffix: 4, best: 4 }, { sum: 5, prefix: 5, suffix: 5, best: 5 }], { sum: 9, prefix: 9, suffix: 9, best: 9 }, "two positives"),
        example([{ sum: -3, prefix: 0, suffix: 0, best: 0 }, { sum: 2, prefix: 2, suffix: 2, best: 2 }], { sum: -1, prefix: 0, suffix: 2, best: 2 }, "[−3] + [2]"),
        example([{ sum: 0, prefix: 0, suffix: 0, best: 0 }, { sum: -1, prefix: 0, suffix: 0, best: 0 }], { sum: -1, prefix: 0, suffix: 0, best: 0 }, "empty + [−1]"),
      ],
    },
    {
      id: "subarray-sum-queries", title: "Subarray Sum Queries", cses: { id: 1190, name: "Subarray Sum Queries" },
      goal: "After each update [k, x] (position k becomes x), the maximum subarray sum of the whole array (empty allowed).",
      concept: "A segment tree whose nodes are subarray descriptors: a leaf is {v, max(0, v), max(0, v), max(0, v)}, an internal node is the merge of its children. After a point update the root's best is the answer.",
      functionName: "subarraySumQueries", signature: "subarraySumQueries(values, updates) → answers",
      starterSource: starter("subarraySumQueries", "values, updates", "Power-of-two size; padding leaves are {0, 0, 0, 0}; update the leaf and re-merge up; push tree[1].best."),
      solve: subarraySumQueries, comparator: "deep", dependencies: ["subarray-node-merge"], brute: subarraySumBrute, small: (round) => { const n = 1 + (round % 8); const next = rng(7800 + round); const updates = []; for (let i = 0; i < 4; i += 1) updates.push([1 + Math.floor(next() * n), -5 + Math.floor(next() * 11)]); return [smallList(7900 + round, n, -5, 5), updates]; },
      reference: book("9.3", "Segment tree · maximum subarray sum"),
      presets: { "CSES sample": { a: [1, 2, -3, 5, -1], b: [[2, 6], [3, 1], [2, -2]] }, "all negative": { a: [-1, -2], b: [[1, -3], [2, 4]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-empty-subarray", "The empty subarray (sum 0) is allowed: leaves use max(0, v) and the answer is never negative.", function subarraySumQueries(values, updates) { let size = 1; while (size < values.length) size *= 2; const leaf = (v) => ({ sum: v, prefix: v, suffix: v, best: v }); const tree = new Array(2 * size); for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : 0); for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let u = 0; u < updates.length; u += 1) { let v = size + updates[u][0] - 1; tree[v] = leaf(updates[u][1]); for (v >>= 1; v >= 1; v >>= 1) tree[v] = mergeSubarrayNodes(tree[2 * v], tree[2 * v + 1]); answers.push(tree[1].best); } return answers; }),
        diagnosis("prefix-as-answer", "The answer is the root's best, not its best prefix.", function subarraySumQueries(values, updates) { let size = 1; while (size < values.length) size *= 2; const leaf = (v) => ({ sum: v, prefix: Math.max(0, v), suffix: Math.max(0, v), best: Math.max(0, v) }); const tree = new Array(2 * size); for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : 0); for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let u = 0; u < updates.length; u += 1) { let v = size + updates[u][0] - 1; tree[v] = leaf(updates[u][1]); for (v >>= 1; v >= 1; v >>= 1) tree[v] = mergeSubarrayNodes(tree[2 * v], tree[2 * v + 1]); answers.push(tree[1].prefix); } return answers; }),
      ],
      hints: ["leaf(v) = { sum: v, prefix: max(0, v), suffix: max(0, v), best: max(0, v) }; pad to a power of two with leaf(0).", "tree[i] = mergeSubarrayNodes(tree[2i], tree[2i + 1]) from size − 1 down to 1.", "Update: replace the leaf, re-merge the ancestors, record tree[1].best."],
      cases: [
        example([[1, 2, -3, 5, -1], [[2, 6], [3, 1], [2, -2]]], [9, 13, 6], "CSES sample"),
        example([[-1, -2], [[1, -3], [2, 4]]], [0, 4], "all negative, then a positive"),
        example([[5], [[1, -5], [1, 7]]], [0, 7], "single"),
        hidden("n = 200 000, m = 100 000, time limit", () => [SIGNED_BIG(), SUBARRAY_UPDATES_BIG().slice(0, 100000)]),
      ],
    },
    {
      id: "subarray-sum-queries-ii", title: "Subarray Sum Queries II", cses: { id: 3226, name: "Subarray Sum Queries II" },
      goal: "For each [a, b], the maximum subarray sum inside a..b (empty allowed).",
      concept: "The same descriptor tree answers range queries: fold the covering nodes in order, a left accumulator growing rightwards and a right accumulator growing leftwards, then merge the two.",
      functionName: "subarraySumQueriesII", signature: "subarraySumQueriesII(values, queries) → answers",
      starterSource: starter("subarraySumQueriesII", "values, queries", "Descriptor tree; empty = {0, 0, 0, 0}; while lo < hi: odd lo → left = merge(left, tree[lo++]); odd hi → right = merge(tree[--hi], right); answer merge(left, right).best."),
      solve: subarraySumQueriesII, comparator: "deep", dependencies: ["subarray-node-merge"], brute: subarraySumIIBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(8000 + round, n, -5, 5), smallRanges(8100 + round, 4, n)]; },
      reference: book("9.3", "Segment tree · maximum subarray sum"),
      presets: { "CSES sample": { a: [2, 5, 1, -2, 3, -1, -7, 1], b: [[2, 4], [2, 5], [6, 7], [4, 8]] }, "all negative": { a: [-4, -2, -9], b: [[1, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("unordered-fold", "Segments must be merged in array order; folding right pieces onto the left accumulator scrambles prefixes and suffixes.", function subarraySumQueriesII(values, queries) { let size = 1; while (size < values.length) size *= 2; const leaf = (v) => ({ sum: v, prefix: Math.max(0, v), suffix: Math.max(0, v), best: Math.max(0, v) }); const tree = new Array(2 * size); for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : 0); for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]); return queries.map((query) => { let lo = size + query[0] - 1, hi = size + query[1]; let acc = { sum: 0, prefix: 0, suffix: 0, best: 0 }; while (lo < hi) { if (lo & 1) { acc = mergeSubarrayNodes(acc, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; acc = mergeSubarrayNodes(acc, tree[hi]); } lo >>= 1; hi >>= 1; } return acc.best; }); }),
        diagnosis("no-empty-subarray", "The empty subarray (sum 0) is allowed; an all-negative range answers 0.", function subarraySumQueriesII(values, queries) { let size = 1; while (size < values.length) size *= 2; const leaf = (v) => ({ sum: v, prefix: v, suffix: v, best: v }); const tree = new Array(2 * size); for (let i = 0; i < size; i += 1) tree[size + i] = leaf(i < values.length ? values[i] : -Infinity); for (let i = size - 1; i >= 1; i -= 1) tree[i] = mergeSubarrayNodes(tree[2 * i], tree[2 * i + 1]); return queries.map((query) => { let lo = size + query[0] - 1, hi = size + query[1]; let left = null, right = null; while (lo < hi) { if (lo & 1) { left = left ? mergeSubarrayNodes(left, tree[lo]) : tree[lo]; lo += 1; } if (hi & 1) { hi -= 1; right = right ? mergeSubarrayNodes(tree[hi], right) : tree[hi]; } lo >>= 1; hi >>= 1; } const node = left && right ? mergeSubarrayNodes(left, right) : (left || right); return node.best; }); }),
      ],
      hints: ["Build the descriptor tree as in Subarray Sum Queries.", "Query with two accumulators: left grows on odd lo (merge(left, node)), right grows on odd hi (merge(node, right)).", "Return mergeSubarrayNodes(left, right).best."],
      cases: [
        example([[2, 5, 1, -2, 3, -1, -7, 1], [[2, 4], [2, 5], [6, 7], [4, 8]]], [6, 7, 0, 3], "CSES sample"),
        example([[-4, -2, -9], [[1, 3], [2, 2]]], [0, 0], "all negative"),
        example([[3, -1, 4], [[1, 3], [2, 3]]], [6, 4], "cross the middle"),
        hidden("n = q = 200 000, time limit", () => [SIGNED_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "distinct-values-queries", title: "Distinct Values Queries", cses: { id: 1734, name: "Distinct Values Queries" },
      goal: "For each [a, b], the number of distinct values in a..b.",
      concept: "Offline by right endpoint: sweep i from left to right keeping, for every value, a 1 only at its latest position (the earlier one is cancelled). At i, the distinct count of any [a, i] is the number of ones in a..i, a Fenwick prefix difference.",
      functionName: "distinctValuesQueries", signature: "distinctValuesQueries(values, queries) → answers",
      starterSource: starter("distinctValuesQueries", "values, queries", "Sort query indices by b; sweep i: −1 at last[value] if any, +1 at i, last[value] = i; answer queries with b === i as prefix(b) − prefix(a − 1)."),
      solve: distinctValuesQueries, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix"], brute: distinctValuesBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(8200 + round, n, 1, 4), smallRanges(8300 + round, 4, n)]; },
      reference: book("9.4", "Offline queries · sweeping over positions"),
      presets: { "CSES sample": { a: [3, 2, 3, 1, 2], b: [[1, 3], [2, 4], [1, 5]] }, "all same": { a: [7, 7, 7], b: [[1, 3], [2, 2]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("previous-not-cancelled", "When a value reappears, its earlier position must lose its 1, otherwise duplicates are counted.", function distinctValuesQueries(values, queries) { const n = values.length; const order = []; for (let i = 0; i < queries.length; i += 1) order.push(i); order.sort((p, q) => queries[p][1] - queries[q][1]); const tree = new Array(n + 1).fill(0); const answers = new Array(queries.length).fill(0); let pointer = 0; for (let i = 1; i <= n; i += 1) { fenwickAdd(tree, i, 1); while (pointer < order.length && queries[order[pointer]][1] === i) { const query = queries[order[pointer]]; answers[order[pointer]] = fenwickPrefix(tree, query[1]) - fenwickPrefix(tree, query[0] - 1); pointer += 1; } } return answers; }),
        diagnosis("answered-in-input-order", "Queries must be answered when the sweep reaches their right endpoint, so sort them by b first.", function distinctValuesQueries(values, queries) { const n = values.length; const tree = new Array(n + 1).fill(0); const last = new Map(); const answers = new Array(queries.length).fill(0); let pointer = 0; for (let i = 1; i <= n; i += 1) { const value = values[i - 1]; if (last.has(value)) fenwickAdd(tree, last.get(value), -1); fenwickAdd(tree, i, 1); last.set(value, i); while (pointer < queries.length && queries[pointer][1] <= i) { answers[pointer] = fenwickPrefix(tree, queries[pointer][1]) - fenwickPrefix(tree, queries[pointer][0] - 1); pointer += 1; } } return answers; }),
      ],
      hints: ["order = query indices sorted by b; a Map last from value to its latest position.", "Sweep i = 1..n: cancel last[value] with −1, add +1 at i, record last[value] = i.", "While the next query in order has b === i: answer prefix(b) − prefix(a − 1)."],
      cases: [
        example([[3, 2, 3, 1, 2], [[1, 3], [2, 4], [1, 5]]], [2, 3, 3], "CSES sample"),
        example([[7, 7, 7], [[1, 3], [2, 2]]], [1, 1], "all the same"),
        example([[1, 2, 3], [[1, 3], [3, 3], [1, 2]]], [3, 1, 2], "all different, out of order"),
        hidden("n = q = 200 000, time limit", () => [SMALL_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "distinct-values-queries-ii", title: "Distinct Values Queries II", cses: { id: 3356, name: "Distinct Values Queries II" },
      goal: "Process [1, k, u] updates and [2, a, b] questions 'are all values in a..b distinct?'; return the answers as booleans.",
      concept: "next[i] = the next position holding the same value (n + 1 if none). A range is all-distinct exactly when min(next[a..b]) > b. Keep the positions of each value in a sorted list so an update can repair the three next pointers it disturbs, and a minimum tree over next answers the questions.",
      functionName: "distinctValuesQueriesII", signature: "distinctValuesQueriesII(values, ops) → booleans",
      starterSource: starter("distinctValuesQueriesII", "values, ops", "Map value → sorted positions; next[i] from the successor; min tree over next. Update: remove k from the old list (fix its predecessor), insert into the new list (fix the predecessor and k). Query: min(next[a..b]) > b."),
      solve: distinctValuesQueriesII, comparator: "deep", dependencies: ["lower-bound"], brute: distinctValuesIIBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(8400 + round, n, 1, 4), smallOps(8500 + round, 6, n, 1, 4, ["set", "range"])]; },
      reference: book("9.3", "Segment tree · next occurrence"),
      presets: { "CSES sample": { a: [3, 2, 7, 2, 8], b: [[2, 3, 5], [2, 2, 5], [1, 2, 9], [2, 2, 5]] }, "update creates a duplicate": { a: [1, 2, 3], b: [[2, 1, 3], [1, 3, 1], [2, 1, 3], [2, 2, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("predecessor-not-repaired", "Removing k from its old value's list changes the next pointer of the position before it; repair it.", function distinctValuesQueriesII(values, ops) { const n = values.length; const positions = new Map(); const place = (value, index) => { if (!positions.has(value)) positions.set(value, []); const list = positions.get(value); list.splice(lowerBound(list, index), 0, index); return list; }; const current = values.slice(); for (let i = 1; i <= n; i += 1) place(current[i - 1], i); let size = 1; while (size < n) size *= 2; const tree = new Array(2 * size).fill(n + 1); const successor = (value, index) => { const list = positions.get(value); const at = lowerBound(list, index + 1); return at < list.length ? list[at] : n + 1; }; const setNext = (index, value) => { let v = size + index - 1; tree[v] = value; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.min(tree[2 * v], tree[2 * v + 1]); }; for (let i = 1; i <= n; i += 1) tree[size + i - 1] = successor(current[i - 1], i); for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) { const k = ops[o][1], u = ops[o][2], old = current[k - 1]; if (old === u) continue; const oldList = positions.get(old); oldList.splice(lowerBound(oldList, k), 1); current[k - 1] = u; const newList = place(u, k); const where = lowerBound(newList, k); if (where > 0) setNext(newList[where - 1], k); setNext(k, where + 1 < newList.length ? newList[where + 1] : n + 1); } else { let lo = size + ops[o][1] - 1, hi = size + ops[o][2], smallest = n + 1; while (lo < hi) { if (lo & 1) { smallest = Math.min(smallest, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; smallest = Math.min(smallest, tree[hi]); } lo >>= 1; hi >>= 1; } answers.push(smallest > ops[o][2]); } } return answers; }),
        diagnosis("boundary-inclusive", "A next pointer equal to b is a duplicate inside the range; the range is distinct only when min(next) > b.", function distinctValuesQueriesII(values, ops) { const n = values.length; const positions = new Map(); const place = (value, index) => { if (!positions.has(value)) positions.set(value, []); const list = positions.get(value); list.splice(lowerBound(list, index), 0, index); return list; }; const current = values.slice(); for (let i = 1; i <= n; i += 1) place(current[i - 1], i); let size = 1; while (size < n) size *= 2; const tree = new Array(2 * size).fill(n + 1); const successor = (value, index) => { const list = positions.get(value); const at = lowerBound(list, index + 1); return at < list.length ? list[at] : n + 1; }; const setNext = (index, value) => { let v = size + index - 1; tree[v] = value; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.min(tree[2 * v], tree[2 * v + 1]); }; for (let i = 1; i <= n; i += 1) tree[size + i - 1] = successor(current[i - 1], i); for (let i = size - 1; i >= 1; i -= 1) tree[i] = Math.min(tree[2 * i], tree[2 * i + 1]); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) { const k = ops[o][1], u = ops[o][2], old = current[k - 1]; if (old === u) continue; const oldList = positions.get(old); const at = lowerBound(oldList, k); oldList.splice(at, 1); if (at > 0) setNext(oldList[at - 1], at < oldList.length ? oldList[at] : n + 1); current[k - 1] = u; const newList = place(u, k); const where = lowerBound(newList, k); if (where > 0) setNext(newList[where - 1], k); setNext(k, where + 1 < newList.length ? newList[where + 1] : n + 1); } else { let lo = size + ops[o][1] - 1, hi = size + ops[o][2], smallest = n + 1; while (lo < hi) { if (lo & 1) { smallest = Math.min(smallest, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; smallest = Math.min(smallest, tree[hi]); } lo >>= 1; hi >>= 1; } answers.push(smallest >= ops[o][2]); } } return answers; }),
      ],
      hints: ["positions: Map value → sorted array of positions (insert with lowerBound + splice); next[i] = successor of i in its value's list or n + 1; a min tree over next.", "Update k → u: remove k from the old list and set the predecessor's next to k's old successor; insert k into u's list, set the predecessor's next to k and k's next to its successor.", "Query: min(next[a..b]) > b."],
      cases: [
        example([[3, 2, 7, 2, 8], [[2, 3, 5], [2, 2, 5], [1, 2, 9], [2, 2, 5]]], [true, false, true], "CSES sample"),
        example([[1, 2, 3], [[2, 1, 3], [1, 3, 1], [2, 1, 3], [2, 2, 3]]], [true, false, true], "an update creates a duplicate"),
        example([[5, 5], [[2, 1, 2], [1, 1, 6], [2, 1, 2], [2, 2, 2]]], [false, true, true], "an update removes a duplicate"),
        hidden("n = q = 200 000, time limit", () => [SMALL_VALUES_BIG(), DISTINCT_OPS_BIG()]),
      ],
    },
    {
      id: "increasing-array-queries", title: "Increasing Array Queries", cses: { id: 2416, name: "Increasing Array Queries" },
      goal: "For each [a, b], the minimum number of +1 operations that make a..b non-decreasing.",
      concept: "Inside the range the running maximum is piecewise constant: x_a until the next greater element, then that element until its next greater, and so on. Each piece costs max · length − sum. Binary lifting over the next-greater chain adds whole pieces in O(log n); the last, partial piece is computed directly.",
      functionName: "increasingArrayQueries", signature: "increasingArrayQueries(values, queries) → answers",
      starterSource: starter("increasingArrayQueries", "values, queries", "next[i] = first j > i with x[j] > x[i] (n + 1 if none); cost[0][i] = x[i]·(next[i] − i) − sum(i..next[i] − 1); lifting tables up/cost; query jumps while up ≤ b, then adds the partial piece to b."),
      solve: increasingArrayQueries, comparator: "deep", brute: increasingArrayBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(8600 + round, n, 1, 9), smallRanges(8700 + round, 4, n)]; },
      reference: book("16.3", "Successor paths · binary lifting with sums"),
      presets: { "CSES sample": { a: [2, 10, 4, 2, 5], b: [[3, 5], [2, 2], [1, 4]] }, decreasing: { a: [5, 4, 3, 2, 1], b: [[1, 5], [2, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("stops-before-b", "A piece may end exactly at b: jump while up[j][i] ≤ b, otherwise the last partial piece spans a taller element.", function increasingArrayQueries(values, queries) { const n = values.length; const prefix = [0]; for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]); const next = new Array(n + 2).fill(n + 1); const stack = []; for (let i = n; i >= 1; i -= 1) { while (stack.length && values[stack[stack.length - 1] - 1] <= values[i - 1]) stack.pop(); next[i] = stack.length ? stack[stack.length - 1] : n + 1; stack.push(i); } const cost0 = new Array(n + 2).fill(0); for (let i = 1; i <= n; i += 1) cost0[i] = values[i - 1] * (next[i] - i) - (prefix[next[i] - 1] - prefix[i - 1]); const up = [next], cost = [cost0]; for (let j = 1; j < 18; j += 1) { const previousUp = up[j - 1], previousCost = cost[j - 1]; const rowUp = new Array(n + 2).fill(n + 1), rowCost = new Array(n + 2).fill(0); for (let i = 1; i <= n + 1; i += 1) { rowUp[i] = previousUp[previousUp[i]]; rowCost[i] = previousCost[i] + previousCost[previousUp[i]]; } up.push(rowUp); cost.push(rowCost); } return queries.map((query) => { let i = query[0], total = 0; const b = query[1]; for (let j = 17; j >= 0; j -= 1) { if (up[j][i] < b) { total += cost[j][i]; i = up[j][i]; } } return total + values[i - 1] * (b - i + 1) - (prefix[b] - prefix[i - 1]); }); }),
        diagnosis("partial-piece-missing", "After the last full jump the piece from i to b still costs x[i]·(b − i + 1) − sum(i..b).", function increasingArrayQueries(values, queries) { const n = values.length; const prefix = [0]; for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]); const next = new Array(n + 2).fill(n + 1); const stack = []; for (let i = n; i >= 1; i -= 1) { while (stack.length && values[stack[stack.length - 1] - 1] <= values[i - 1]) stack.pop(); next[i] = stack.length ? stack[stack.length - 1] : n + 1; stack.push(i); } const cost0 = new Array(n + 2).fill(0); for (let i = 1; i <= n; i += 1) cost0[i] = values[i - 1] * (next[i] - i) - (prefix[next[i] - 1] - prefix[i - 1]); const up = [next], cost = [cost0]; for (let j = 1; j < 18; j += 1) { const previousUp = up[j - 1], previousCost = cost[j - 1]; const rowUp = new Array(n + 2).fill(n + 1), rowCost = new Array(n + 2).fill(0); for (let i = 1; i <= n + 1; i += 1) { rowUp[i] = previousUp[previousUp[i]]; rowCost[i] = previousCost[i] + previousCost[previousUp[i]]; } up.push(rowUp); cost.push(rowCost); } return queries.map((query) => { let i = query[0], total = 0; for (let j = 17; j >= 0; j -= 1) { if (up[j][i] <= query[1]) { total += cost[j][i]; i = up[j][i]; } } return total; }); }),
      ],
      hints: ["Prefix sums; next[i] via a stack from the right popping while the top is ≤ x[i] (equal values may split a piece, the cost is the same).", "cost[0][i] = x[i]·(next[i] − i) − (prefix[next[i] − 1] − prefix[i − 1]); up[j] and cost[j] by doubling, sentinel n + 1 maps to itself with cost 0.", "Query: i = a; for j high to low, if up[j][i] ≤ b add cost[j][i] and jump; finally add x[i]·(b − i + 1) − sum(i..b)."],
      cases: [
        example([[2, 10, 4, 2, 5], [[3, 5], [2, 2], [1, 4]]], [2, 0, 14], "CSES sample"),
        example([[5, 4, 3, 2, 1], [[1, 5], [2, 3]]], [10, 1], "decreasing"),
        example([[3, 3, 3], [[1, 3]]], [0], "equal values cost nothing"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
    {
      id: "movie-festival-queries", title: "Movie Festival Queries", cses: { id: 1664, name: "Movie Festival Queries" },
      goal: "For each visitor [arrival, departure], the maximum number of whole movies they can watch (a movie may start exactly when the previous one ends).",
      concept: "Greedy: from any moment, the best next movie is the one that ends earliest among those starting at or after it. That defines a successor for every movie; binary lifting counts how many successors fit before the departure.",
      functionName: "movieFestivalQueries", signature: "movieFestivalQueries(movies, queries) → answers",
      starterSource: starter("movieFestivalQueries", "movies, queries", "Sort movies by start; suffixBest[k] = movie with the earliest end among k..; first(t) = suffixBest[lowerBound(starts, t)]; up[0][m] = first(end[m]); count jumps whose end ≤ departure."),
      solve: movieFestivalQueries, comparator: "deep", dependencies: ["lower-bound", "upper-bound"], brute: movieFestivalBrute, small: (round) => [moviePairs(8800 + round, 1 + (round % 7), 9), moviePairs(8900 + round, 4, 9)],
      reference: book("16.3", "Successor paths · binary lifting"),
      presets: { "CSES sample": { a: [[2, 5], [6, 10], [4, 7], [9, 10]], b: [[5, 9], [2, 10], [7, 10]] }, "back to back": { a: [[1, 2], [2, 3], [3, 4]], b: [[1, 4], [2, 3]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("touching-forbidden", "A movie may start exactly when the previous one ends: first(t) looks at starts ≥ t, not > t.", function movieFestivalQueries(movies, queries) { const n = movies.length; const sorted = movies.slice().sort((p, q) => p[0] - q[0]); const starts = sorted.map((m) => m[0]), ends = sorted.map((m) => m[1]); const suffixBest = new Array(n + 1).fill(n); for (let k = n - 1; k >= 0; k -= 1) { const candidate = suffixBest[k + 1]; suffixBest[k] = candidate === n || ends[k] <= ends[candidate] ? k : candidate; } const first = (time) => suffixBest[upperBound(starts, time)]; const up = [new Array(n + 1).fill(n)]; for (let m = 0; m < n; m += 1) up[0][m] = first(ends[m]); for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(n); for (let m = 0; m <= n; m += 1) row[m] = previous[previous[m]]; up.push(row); } return queries.map((query) => { let m = suffixBest[lowerBound(starts, query[0])]; if (m === n || ends[m] > query[1]) return 0; let count = 1; for (let j = 17; j >= 0; j -= 1) { const target = up[j][m]; if (target !== n && ends[target] <= query[1]) { count += 1 << j; m = target; } } return count; }); }),
        diagnosis("earliest-start-not-earliest-end", "Choosing the movie that starts first is not optimal; take the one that ends first among those you can still start.", function movieFestivalQueries(movies, queries) { const n = movies.length; const sorted = movies.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const starts = sorted.map((m) => m[0]), ends = sorted.map((m) => m[1]); const first = (time) => { const k = lowerBound(starts, time); return k < n ? k : n; }; const up = [new Array(n + 1).fill(n)]; for (let m = 0; m < n; m += 1) up[0][m] = first(ends[m]); for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(n); for (let m = 0; m <= n; m += 1) row[m] = previous[previous[m]]; up.push(row); } return queries.map((query) => { let m = first(query[0]); if (m === n || ends[m] > query[1]) return 0; let count = 1; for (let j = 17; j >= 0; j -= 1) { const target = up[j][m]; if (target !== n && ends[target] <= query[1]) { count += 1 << j; m = target; } } return count; }); }),
      ],
      hints: ["Sort by start; suffixBest[k] = index with the smallest end among movies k..n − 1 (n = none).", "first(t) = suffixBest[lowerBound(starts, t)]; up[0][m] = first(end[m]); doubling tables with n mapping to itself.", "Query: m = first(arrival); none or end > departure → 0; else count = 1 plus jumps whose end ≤ departure."],
      cases: [
        example([[[2, 5], [6, 10], [4, 7], [9, 10]], [[5, 9], [2, 10], [7, 10]]], [0, 2, 1], "CSES sample"),
        example([[[1, 2], [2, 3], [3, 4]], [[1, 4], [2, 3], [1, 2]]], [3, 1, 1], "back to back"),
        example([[[1, 9], [2, 3], [4, 5]], [[1, 9]]], [2], "short ones beat the long one"),
        hidden("n = q = 200 000, time limit", () => [MOVIES_BIG(), MOVIE_QUERIES_BIG()]),
      ],
    },
    {
      id: "forest-queries-ii", title: "Forest Queries II", cses: { id: 1739, name: "Forest Queries II" },
      goal: "Process [1, y, x] (toggle a cell between empty and tree) and [2, y1, x1, y2, x2] (count trees in the rectangle); return the counts.",
      concept: "A two-dimensional Fenwick tree: each dimension is a Fenwick tree of Fenwick trees, so a point update touches log² n cells and a prefix count reads log² n cells; a rectangle is the usual four-corner combination.",
      functionName: "forestQueriesII", signature: "forestQueriesII(grid, ops) → answers",
      starterSource: starter("forestQueriesII", "grid, ops", "(n + 1)² tree; add(y, x, delta) loops i += i & −i and j += j & −j; sum(y, x) loops downward; toggle = ±1 from a state array."),
      solve: forestQueriesII, comparator: "deep", brute: forestIIBrute, small: (round) => { const n = 1 + (round % 5); return [randomGrid(9000 + round, n, n, "*", "*", ".", 0.5), forestOps(9100 + round, 6, n)]; },
      reference: book("9.2", "Binary indexed tree · two dimensions"),
      presets: { "CSES sample": { a: [".*..", "*.**", "**..", "****"], b: [[2, 2, 2, 3, 4], [1, 3, 3], [2, 2, 2, 3, 4]] }, "toggle twice": { a: ["..", ".."], b: [[1, 1, 1], [1, 1, 1], [2, 1, 1, 2, 2]] } },
      scene: { kind: "algo", view: "grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("toggle-always-adds", "A toggle removes a tree that is there: the delta is −1 when the cell currently has a tree.", function forestQueriesII(grid, ops) { const n = grid.length, width = n + 1; const tree = new Array(width * width).fill(0); const add = (y, x, delta) => { for (let i = y; i <= n; i += i & (-i)) for (let j = x; j <= n; j += j & (-j)) tree[i * width + j] += delta; }; const sum = (y, x) => { let total = 0; for (let i = y; i > 0; i -= i & (-i)) for (let j = x; j > 0; j -= j & (-j)) total += tree[i * width + j]; return total; }; for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) if (grid[y - 1][x - 1] === "*") add(y, x, 1); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) add(ops[o][1], ops[o][2], 1); else answers.push(sum(ops[o][3], ops[o][4]) - sum(ops[o][1] - 1, ops[o][4]) - sum(ops[o][3], ops[o][2] - 1) + sum(ops[o][1] - 1, ops[o][2] - 1)); } return answers; }),
        diagnosis("axes-swapped", "Operations give y (row) first, then x (column).", function forestQueriesII(grid, ops) { const n = grid.length, width = n + 1; const state = new Array(width * width).fill(0), tree = new Array(width * width).fill(0); const add = (y, x, delta) => { for (let i = y; i <= n; i += i & (-i)) for (let j = x; j <= n; j += j & (-j)) tree[i * width + j] += delta; }; const sum = (y, x) => { let total = 0; for (let i = y; i > 0; i -= i & (-i)) for (let j = x; j > 0; j -= j & (-j)) total += tree[i * width + j]; return total; }; for (let y = 1; y <= n; y += 1) for (let x = 1; x <= n; x += 1) if (grid[y - 1][x - 1] === "*") { state[y * width + x] = 1; add(y, x, 1); } const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) { const y = ops[o][2], x = ops[o][1]; const delta = state[y * width + x] ? -1 : 1; state[y * width + x] += delta; add(y, x, delta); } else { const y1 = ops[o][2], x1 = ops[o][1], y2 = ops[o][4], x2 = ops[o][3]; answers.push(sum(y2, x2) - sum(y1 - 1, x2) - sum(y2, x1 - 1) + sum(y1 - 1, x1 - 1)); } } return answers; }),
      ],
      hints: ["Flat (n + 1) × (n + 1) arrays for the tree and for the current state.", "add(y, x, delta): for i = y; i ≤ n; i += i & −i: for j = x; j ≤ n; j += j & −j: tree[i][j] += delta. sum(y, x) walks downward the same way.", "Toggle: delta = state ? −1 : +1; rectangle = sum(y2, x2) − sum(y1 − 1, x2) − sum(y2, x1 − 1) + sum(y1 − 1, x1 − 1)."],
      cases: [
        example([[".*..", "*.**", "**..", "****"], [[2, 2, 2, 3, 4], [1, 3, 3], [2, 2, 2, 3, 4]]], [3, 4], "CSES sample"),
        example([["..", ".."], [[1, 1, 1], [1, 1, 1], [2, 1, 1, 2, 2], [1, 2, 2], [2, 2, 2, 2, 2]]], [0, 1], "toggle twice, then once"),
        example([["*"], [[2, 1, 1, 1, 1], [1, 1, 1], [2, 1, 1, 1, 1]]], [1, 0], "single cell"),
        hidden("1000 × 1000, q = 200 000, time limit", () => [FOREST_BIG(), FOREST_OPS_BIG()]),
      ],
    },
    {
      id: "range-updates-and-sums", title: "Range Updates and Sums", cses: { id: 1735, name: "Range Updates and Sums" },
      goal: "Process [1, a, b, x] (add x to a..b), [2, a, b, x] (set a..b to x) and [3, a, b] (sum of a..b); return the sums.",
      concept: "A lazy segment tree: a node stores the sum of its range and two pending tags, 'set to s' and 'add d'. A set wipes any pending add; an add on top of a pending set folds into it. Tags are pushed to the children only when a smaller range is visited.",
      functionName: "rangeUpdatesAndSums", signature: "rangeUpdatesAndSums(values, ops) → answers",
      starterSource: starter("rangeUpdatesAndSums", "values, ops", "Recursive tree over [1, n]: sum[], addLazy[], setLazy[] (−1 = none); apply(node, len, set, add); push before descending; update and query by halves."),
      solve: rangeUpdatesAndSums, comparator: "deep", brute: rangeUpdatesAndSumsBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(9200 + round, n, 1, 9), smallOps(9300 + round, 7, n, 1, 9, ["rangeAdd", "rangeSet", "sum3"])]; },
      reference: book("9.4", "Lazy propagation"),
      presets: { "CSES sample": { a: [2, 3, 1, 1, 5, 3], b: [[3, 3, 5], [1, 2, 4, 2], [3, 3, 5], [2, 2, 4, 5], [3, 3, 5]] }, "set then add": { a: [1, 1, 1], b: [[2, 1, 3, 4], [1, 2, 2, 1], [3, 1, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("set-keeps-pending-add", "A set overrides everything pending on that node: clear the pending add when a set arrives.", function rangeUpdatesAndSums(values, ops) { const n = values.length; const sum = new Array(4 * n).fill(0), addLazy = new Array(4 * n).fill(0), setLazy = new Array(4 * n).fill(-1); const build = (node, l, r) => { if (l === r) { sum[node] = values[l - 1]; return; } const mid = (l + r) >> 1; build(2 * node, l, mid); build(2 * node + 1, mid + 1, r); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const apply = (node, length, set, add) => { if (set >= 0) { sum[node] = set * length; setLazy[node] = set; } if (add !== 0) { sum[node] += add * length; if (setLazy[node] >= 0) setLazy[node] += add; else addLazy[node] += add; } }; const push = (node, l, r) => { const mid = (l + r) >> 1; apply(2 * node, mid - l + 1, setLazy[node], addLazy[node]); apply(2 * node + 1, r - mid, setLazy[node], addLazy[node]); setLazy[node] = -1; addLazy[node] = 0; }; const update = (node, l, r, a, b, set, add) => { if (b < l || r < a) return; if (a <= l && r <= b) { apply(node, r - l + 1, set, add); return; } push(node, l, r); const mid = (l + r) >> 1; update(2 * node, l, mid, a, b, set, add); update(2 * node + 1, mid + 1, r, a, b, set, add); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const query = (node, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[node]; push(node, l, r); const mid = (l + r) >> 1; return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b); }; build(1, 1, n); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2], -1, ops[o][3]); else if (ops[o][0] === 2) update(1, 1, n, ops[o][1], ops[o][2], ops[o][3], 0); else answers.push(query(1, 1, n, ops[o][1], ops[o][2])); } return answers; }),
        diagnosis("no-push", "Pending tags must be pushed to the children before a smaller range is visited, or the children answer with stale sums.", function rangeUpdatesAndSums(values, ops) { const n = values.length; const sum = new Array(4 * n).fill(0), addLazy = new Array(4 * n).fill(0), setLazy = new Array(4 * n).fill(-1); const build = (node, l, r) => { if (l === r) { sum[node] = values[l - 1]; return; } const mid = (l + r) >> 1; build(2 * node, l, mid); build(2 * node + 1, mid + 1, r); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const apply = (node, length, set, add) => { if (set >= 0) { sum[node] = set * length; setLazy[node] = set; addLazy[node] = 0; } if (add !== 0) { sum[node] += add * length; if (setLazy[node] >= 0) setLazy[node] += add; else addLazy[node] += add; } }; const update = (node, l, r, a, b, set, add) => { if (b < l || r < a) return; if (a <= l && r <= b) { apply(node, r - l + 1, set, add); return; } const mid = (l + r) >> 1; update(2 * node, l, mid, a, b, set, add); update(2 * node + 1, mid + 1, r, a, b, set, add); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const query = (node, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[node]; const mid = (l + r) >> 1; return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b); }; build(1, 1, n); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2], -1, ops[o][3]); else if (ops[o][0] === 2) update(1, 1, n, ops[o][1], ops[o][2], ops[o][3], 0); else answers.push(query(1, 1, n, ops[o][1], ops[o][2])); } return answers; }),
      ],
      hints: ["apply(node, len, set, add): a set makes sum = set·len, records the set and clears the add; an add makes sum += add·len and folds into the pending set if one exists, else into the pending add.", "push(node): apply both tags to the two children, then clear them. Call push before descending in update and query.", "update covers [a, b] recursively; query sums the covering nodes."],
      cases: [
        example([[2, 3, 1, 1, 5, 3], [[3, 3, 5], [1, 2, 4, 2], [3, 3, 5], [2, 2, 4, 5], [3, 3, 5]]], [7, 11, 15], "CSES sample"),
        example([[1, 1, 1], [[2, 1, 3, 4], [1, 2, 2, 1], [3, 1, 3]]], [13], "set then add"),
        example([[9], [[1, 1, 1, 1], [2, 1, 1, 2], [3, 1, 1]]], [2], "add then set"),
        hidden("n = q = 200 000, time limit", () => [MILLION_VALUES_BIG(), RUS_OPS_BIG()]),
      ],
    },
    {
      id: "polynomial-queries", title: "Polynomial Queries", cses: { id: 1736, name: "Polynomial Queries" },
      goal: "Process [1, a, b] (add 1, 2, 3, … to the values at a, a + 1, a + 2, …, b) and [2, a, b] (sum of a..b); return the sums.",
      concept: "An arithmetic progression added to a node's range is described by two numbers, first and step: it adds first·len + step·len(len − 1)/2 to the sum, two progressions add componentwise, and pushing to the right child shifts first by step times the left child's length.",
      functionName: "polynomialQueries", signature: "polynomialQueries(values, ops) → answers",
      starterSource: starter("polynomialQueries", "values, ops", "Lazy tags firstLazy[], stepLazy[]; apply(node, len, first, step); a range update covering [l, r] inside [a, b] applies first = l − a + 1, step = 1; push shifts the right child's first."),
      solve: polynomialQueries, comparator: "deep", brute: polynomialBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(9400 + round, n, 1, 9), smallOps(9500 + round, 6, n, 1, 1, ["range", "range3"]).map((op) => (op[0] === 3 ? [1, op[1], op[2]] : op))]; },
      reference: book("9.4", "Lazy propagation · arithmetic progressions"),
      presets: { "CSES sample": { a: [4, 2, 3, 1, 7], b: [[2, 1, 5], [1, 1, 5], [2, 1, 5]] }, "two updates": { a: [0, 0, 0], b: [[1, 1, 3], [1, 2, 3], [2, 1, 3], [2, 3, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("constant-add", "The update is a progression 1, 2, 3, …, not a constant: keep a step of 1 and a first term that depends on the node's offset from a.", function polynomialQueries(values, ops) { const n = values.length; const sum = new Array(4 * n).fill(0), lazy = new Array(4 * n).fill(0); const build = (node, l, r) => { if (l === r) { sum[node] = values[l - 1]; return; } const mid = (l + r) >> 1; build(2 * node, l, mid); build(2 * node + 1, mid + 1, r); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const apply = (node, length, add) => { sum[node] += add * length; lazy[node] += add; }; const push = (node, l, r) => { if (!lazy[node]) return; const mid = (l + r) >> 1; apply(2 * node, mid - l + 1, lazy[node]); apply(2 * node + 1, r - mid, lazy[node]); lazy[node] = 0; }; const update = (node, l, r, a, b) => { if (b < l || r < a) return; if (a <= l && r <= b) { apply(node, r - l + 1, 1); return; } push(node, l, r); const mid = (l + r) >> 1; update(2 * node, l, mid, a, b); update(2 * node + 1, mid + 1, r, a, b); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const query = (node, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[node]; push(node, l, r); const mid = (l + r) >> 1; return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b); }; build(1, 1, n); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2]); else answers.push(query(1, 1, n, ops[o][1], ops[o][2])); } return answers; }),
        diagnosis("right-child-not-shifted", "When a progression is pushed down, the right child starts where the left child ended: first + step · (left length).", function polynomialQueries(values, ops) { const n = values.length; const sum = new Array(4 * n).fill(0), firstLazy = new Array(4 * n).fill(0), stepLazy = new Array(4 * n).fill(0); const build = (node, l, r) => { if (l === r) { sum[node] = values[l - 1]; return; } const mid = (l + r) >> 1; build(2 * node, l, mid); build(2 * node + 1, mid + 1, r); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const apply = (node, length, first, step) => { sum[node] += first * length + step * (length * (length - 1) / 2); firstLazy[node] += first; stepLazy[node] += step; }; const push = (node, l, r) => { if (firstLazy[node] === 0 && stepLazy[node] === 0) return; const mid = (l + r) >> 1; apply(2 * node, mid - l + 1, firstLazy[node], stepLazy[node]); apply(2 * node + 1, r - mid, firstLazy[node], stepLazy[node]); firstLazy[node] = 0; stepLazy[node] = 0; }; const update = (node, l, r, a, b) => { if (b < l || r < a) return; if (a <= l && r <= b) { apply(node, r - l + 1, l - a + 1, 1); return; } push(node, l, r); const mid = (l + r) >> 1; update(2 * node, l, mid, a, b); update(2 * node + 1, mid + 1, r, a, b); sum[node] = sum[2 * node] + sum[2 * node + 1]; }; const query = (node, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[node]; push(node, l, r); const mid = (l + r) >> 1; return query(2 * node, l, mid, a, b) + query(2 * node + 1, mid + 1, r, a, b); }; build(1, 1, n); const answers = []; for (let o = 0; o < ops.length; o += 1) { if (ops[o][0] === 1) update(1, 1, n, ops[o][1], ops[o][2]); else answers.push(query(1, 1, n, ops[o][1], ops[o][2])); } return answers; }),
      ],
      hints: ["apply(node, len, first, step): sum += first·len + step·len(len − 1)/2; firstLazy += first; stepLazy += step.", "push: left child gets (first, step); right child gets (first + step·leftLen, step); clear the tags.", "A fully covered node [l, r] inside an update [a, b] receives first = l − a + 1, step = 1."],
      cases: [
        example([[4, 2, 3, 1, 7], [[2, 1, 5], [1, 1, 5], [2, 1, 5]]], [17, 32], "CSES sample"),
        example([[0, 0, 0], [[1, 1, 3], [1, 2, 3], [2, 1, 3], [2, 3, 3]]], [9, 5], "two overlapping updates"),
        example([[5], [[1, 1, 1], [2, 1, 1]]], [6], "single"),
        hidden("n = q = 200 000, time limit", () => [MILLION_VALUES_BIG(), POLY_OPS_BIG()]),
      ],
    },
    {
      id: "range-queries-and-copies", title: "Range Queries and Copies", cses: { id: 1737, name: "Range Queries and Copies" },
      goal: "Maintain a list of arrays: [1, k, a, x] sets position a of array k to x, [2, k, a, b] sums a..b of array k, [3, k] appends a copy of array k; return the sums.",
      concept: "A persistent segment tree never edits a node: an update creates a new root path of log n nodes and shares everything else with the old version. A copy is just another reference to the same root, so it costs nothing.",
      functionName: "rangeQueriesAndCopies", signature: "rangeQueriesAndCopies(values, ops) → answers",
      starterSource: starter("rangeQueriesAndCopies", "values, ops", "Node arrays left[], right[], sum[] (node 0 = empty); build returns a root; update(prev, l, r, pos, x) returns a new root; roots[k] per array; copy pushes roots[k]."),
      solve: rangeQueriesAndCopies, comparator: "deep", brute: rangeQueriesAndCopiesBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(9600 + round, n, 1, 9), copyOps(9700 + round, 7, n, 9)]; },
      reference: book("9.4", "Persistent segment trees"),
      presets: { "CSES sample": { a: [2, 3, 1, 2, 5], b: [[3, 1], [2, 1, 1, 5], [2, 2, 1, 5], [1, 2, 2, 5], [2, 1, 1, 5], [2, 2, 1, 5]] }, "copy of a copy": { a: [1, 1], b: [[3, 1], [1, 2, 1, 5], [3, 2], [2, 3, 1, 2], [2, 1, 1, 2]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("copies-share-updates", "After a copy the two arrays must diverge: an update creates new nodes instead of editing shared ones.", function rangeQueriesAndCopies(values, ops) { const n = values.length; const left = [0], right = [0], sum = [0]; const node = (l, r, s) => { left.push(l); right.push(r); sum.push(s); return left.length - 1; }; const build = (l, r) => { if (l === r) return node(0, 0, values[l - 1]); const mid = (l + r) >> 1; const a = build(l, mid), b = build(mid + 1, r); return node(a, b, sum[a] + sum[b]); }; const update = (root, l, r, position, x) => { if (l === r) { sum[root] = x; return; } const mid = (l + r) >> 1; if (position <= mid) update(left[root], l, mid, position, x); else update(right[root], mid + 1, r, position, x); sum[root] = sum[left[root]] + sum[right[root]]; }; const query = (root, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[root]; const mid = (l + r) >> 1; return query(left[root], l, mid, a, b) + query(right[root], mid + 1, r, a, b); }; const roots = [build(1, n)]; const answers = []; for (let o = 0; o < ops.length; o += 1) { const k = ops[o][1] - 1; if (ops[o][0] === 1) update(roots[k], 1, n, ops[o][2], ops[o][3]); else if (ops[o][0] === 2) answers.push(query(roots[k], 1, n, ops[o][2], ops[o][3])); else roots.push(roots[k]); } return answers; }),
        diagnosis("array-index-off", "Arrays are numbered from 1 in the operations; index roots with k − 1.", function rangeQueriesAndCopies(values, ops) { const n = values.length; const left = [0], right = [0], sum = [0]; const node = (l, r, s) => { left.push(l); right.push(r); sum.push(s); return left.length - 1; }; const build = (l, r) => { if (l === r) return node(0, 0, values[l - 1]); const mid = (l + r) >> 1; const a = build(l, mid), b = build(mid + 1, r); return node(a, b, sum[a] + sum[b]); }; const update = (prev, l, r, position, x) => { if (l === r) return node(0, 0, x); const mid = (l + r) >> 1; let a = left[prev], b = right[prev]; if (position <= mid) a = update(a, l, mid, position, x); else b = update(b, mid + 1, r, position, x); return node(a, b, sum[a] + sum[b]); }; const query = (root, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return sum[root]; const mid = (l + r) >> 1; return query(left[root], l, mid, a, b) + query(right[root], mid + 1, r, a, b); }; const roots = [build(1, n)]; const answers = []; for (let o = 0; o < ops.length; o += 1) { const k = Math.min(ops[o][1], roots.length - 1); if (ops[o][0] === 1) roots[k] = update(roots[k], 1, n, ops[o][2], ops[o][3]); else if (ops[o][0] === 2) answers.push(query(roots[k], 1, n, ops[o][2], ops[o][3])); else roots.push(roots[k]); } return answers; }),
      ],
      hints: ["Parallel arrays left, right, sum with node 0 as the empty node; node(l, r, s) appends and returns the new index.", "update(prev, l, r, pos, x) copies the path: a new leaf, then new internal nodes whose other child is shared with prev.", "roots[k − 1] holds each array's root; [3, k] pushes the same root again."],
      cases: [
        example([[2, 3, 1, 2, 5], [[3, 1], [2, 1, 1, 5], [2, 2, 1, 5], [1, 2, 2, 5], [2, 1, 1, 5], [2, 2, 1, 5]]], [13, 13, 13, 15], "CSES sample"),
        example([[1, 1], [[3, 1], [1, 2, 1, 5], [3, 2], [2, 3, 1, 2], [2, 1, 1, 2]]], [6, 2], "copy of a copy"),
        example([[4], [[2, 1, 1, 1], [1, 1, 1, 9], [2, 1, 1, 1]]], [4, 9], "single"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), COPY_OPS_BIG()]),
      ],
    },
    {
      id: "missing-coin-sum-queries", title: "Missing Coin Sum Queries", cses: { id: 2184, name: "Missing Coin Sum Queries" },
      goal: "For each [a, b], the smallest sum that cannot be made from the coins at positions a..b.",
      concept: "If every sum up to s is reachable, all coins of value ≤ s + 1 can be added; their total t is the new reach, and when t = s the answer is s + 1. Each round at least doubles the reach, so O(log) rounds suffice, each asking 'sum of coins ≤ v inside a..b': a persistent tree over sorted coin values, one version per prefix of positions, answers that in O(log n).",
      functionName: "missingCoinSumQueries", signature: "missingCoinSumQueries(coins, queries) → answers",
      starterSource: starter("missingCoinSumQueries", "coins, queries", "distinct sorted values; persistent sum tree over ranks, version i after coins[0..i−1]; sumUpTo(version b, version a − 1, rank limit); loop reach → total until equal."),
      solve: missingCoinSumQueries, comparator: "deep", dependencies: ["lower-bound", "upper-bound"], brute: missingCoinSumBrute, small: (round) => { const n = 1 + (round % 9); return [smallList(9800 + round, n, 1, 9), smallRanges(9900 + round, 4, n)]; },
      reference: book("9.4", "Persistent segment trees · sums over values"),
      presets: { "CSES sample": { a: [2, 9, 1, 2, 7], b: [[2, 4], [4, 4], [1, 5]] }, "powers of two": { a: [1, 2, 4, 8], b: [[1, 4], [2, 4]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("threshold-off-by-one", "The coins that can extend a reach of s are those with value ≤ s + 1, not ≤ s.", function missingCoinSumQueries(coins, queries) { const n = coins.length; const distinct = coins.slice().sort((p, q) => p - q).filter((v, i, list) => i === 0 || v !== list[i - 1]); const m = distinct.length; const left = [0], right = [0], sum = [0]; const node = (l, r, s) => { left.push(l); right.push(r); sum.push(s); return left.length - 1; }; const insert = (prev, l, r, rank, value) => { if (l === r) return node(0, 0, sum[prev] + value); const mid = (l + r) >> 1; let a = left[prev], b = right[prev]; if (rank <= mid) a = insert(a, l, mid, rank, value); else b = insert(b, mid + 1, r, rank, value); return node(a, b, sum[a] + sum[b]); }; const versions = [0]; for (let i = 0; i < n; i += 1) versions.push(insert(versions[i], 1, m, lowerBound(distinct, coins[i]) + 1, coins[i])); const sumUpTo = (newer, older, l, r, limit) => { if (limit < l || newer === older) return 0; if (r <= limit) return sum[newer] - sum[older]; const mid = (l + r) >> 1; return sumUpTo(left[newer], left[older], l, mid, limit) + sumUpTo(right[newer], right[older], mid + 1, r, limit); }; return queries.map((query) => { const newer = versions[query[1]], older = versions[query[0] - 1]; let reach = 0; for (let round = 0; round < 60; round += 1) { const total = sumUpTo(newer, older, 1, m, upperBound(distinct, Math.max(1, reach))); if (total === reach) return reach + 1; reach = total; } return reach + 1; }); }),
        diagnosis("whole-array", "Only the coins at positions a..b count; subtract version a − 1 from version b.", function missingCoinSumQueries(coins, queries) { const sorted = coins.slice().sort((p, q) => p - q); let reach = 0; for (let i = 0; i < sorted.length; i += 1) { if (sorted[i] > reach + 1) break; reach += sorted[i]; } return queries.map(() => reach + 1); }),
      ],
      hints: ["distinct = sorted unique coin values; rank(v) = lowerBound(distinct, v) + 1.", "versions[i] = tree after inserting coins 1..i (node 0 is empty; insert copies one root path). sumUpTo(newer, older, limit) subtracts the older version node by node.", "Query: reach = 0; loop: total = sumUpTo(versions[b], versions[a − 1], upperBound(distinct, reach + 1)); if total === reach return reach + 1; reach = total."],
      cases: [
        example([[2, 9, 1, 2, 7], [[2, 4], [4, 4], [1, 5]]], [4, 1, 6], "CSES sample"),
        example([[1, 2, 4, 8], [[1, 4], [2, 4], [1, 1]]], [16, 1, 2], "powers of two"),
        example([[3, 1, 1], [[1, 3], [1, 1]]], [6, 1], "small coins first"),
        hidden("n = q = 200 000, time limit", () => [RANGE_VALUES_BIG(), RANGE_QUERIES_BIG()]),
      ],
    },
  ];
  core.share({ buildSegmentTree, segmentTreeUpdate, segmentTreeQuery, sparseTable, mergeSubarrayNodes });
  core.define("range", RANGE);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

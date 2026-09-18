(function defineAlgoSection(core) {
  "use strict";
  const { BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;

  // ------------------------------------------------------------------ bricks
  function lowerBound(sorted, x) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function upperBound(sorted, x) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function prefixSums(values) {
    const prefix = [0];
    for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] + values[i]);
    return prefix;
  }
  function fenwickAdd(tree, index, delta) {
    for (let i = index; i < tree.length; i += i & (-i)) tree[i] += delta;
    return tree;
  }
  function fenwickPrefix(tree, index) {
    let sum = 0;
    for (let i = index; i > 0; i -= i & (-i)) sum += tree[i];
    return sum;
  }
  function fenwickKth(tree, k) {
    const n = tree.length - 1;
    if (k < 1 || fenwickPrefix(tree, n) < k) return -1;
    let position = 0, remaining = k;
    let step = 1;
    while (step * 2 <= n) step *= 2;
    for (; step > 0; step >>= 1) {
      const next = position + step;
      if (next <= n && tree[next] < remaining) { position = next; remaining -= tree[next]; }
    }
    return position + 1;
  }
  function heapPush(heap, item) {
    heap.push(item);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent][0] <= heap[index][0]) break;
      const swap = heap[parent]; heap[parent] = heap[index]; heap[index] = swap;
      index = parent;
    }
    return heap;
  }
  function heapPop(heap) {
    if (heap.length === 0) return { item: null, heap };
    const item = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let index = 0;
      while (true) {
        const left = 2 * index + 1, right = left + 1;
        let smallest = index;
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
        if (smallest === index) break;
        const swap = heap[smallest]; heap[smallest] = heap[index]; heap[index] = swap;
        index = smallest;
      }
    }
    return { item, heap };
  }

  // ------------------------------------------------------------------ references
  function distinctNumbers(values) {
    const sorted = values.slice().sort((p, q) => p - q);
    let count = 0;
    for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) count += 1;
    return count;
  }
  function apartments(applicants, sizes, k) {
    const a = applicants.slice().sort((p, q) => p - q), b = sizes.slice().sort((p, q) => p - q);
    let i = 0, j = 0, matched = 0;
    while (i < a.length && j < b.length) {
      if (Math.abs(a[i] - b[j]) <= k) { matched += 1; i += 1; j += 1; }
      else if (b[j] < a[i]) j += 1;
      else i += 1;
    }
    return matched;
  }
  function ferrisWheel(weights, x) {
    const sorted = weights.slice().sort((p, q) => p - q);
    let lo = 0, hi = sorted.length - 1, gondolas = 0;
    while (lo <= hi) {
      if (lo !== hi && sorted[lo] + sorted[hi] <= x) lo += 1;
      hi -= 1;
      gondolas += 1;
    }
    return gondolas;
  }
  function concertTickets(prices, budgets) {
    const sorted = prices.slice().sort((p, q) => p - q);
    const tree = new Array(sorted.length + 1).fill(0);
    for (let i = 0; i < sorted.length; i += 1) fenwickAdd(tree, i + 1, 1);
    const out = [];
    for (let c = 0; c < budgets.length; c += 1) {
      const count = fenwickPrefix(tree, upperBound(sorted, budgets[c]));
      if (count === 0) { out.push(-1); continue; }
      const position = fenwickKth(tree, count);
      out.push(sorted[position - 1]);
      fenwickAdd(tree, position, -1);
    }
    return out;
  }
  function restaurantCustomers(visits) {
    const events = [];
    for (let i = 0; i < visits.length; i += 1) { events.push([visits[i][0], 1]); events.push([visits[i][1], -1]); }
    events.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    let current = 0, best = 0;
    for (let i = 0; i < events.length; i += 1) { current += events[i][1]; if (current > best) best = current; }
    return best;
  }
  function movieFestival(movies) {
    const order = movies.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    let count = 0, free = -Infinity;
    for (let i = 0; i < order.length; i += 1) {
      if (order[i][0] >= free) { count += 1; free = order[i][1]; }
    }
    return count;
  }
  function sumOfTwoValues(values, target) {
    const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q);
    let lo = 0, hi = order.length - 1;
    while (lo < hi) {
      const sum = values[order[lo]] + values[order[hi]];
      if (sum === target) {
        const a = order[lo] + 1, b = order[hi] + 1;
        return a < b ? [a, b] : [b, a];
      }
      if (sum < target) lo += 1;
      else hi -= 1;
    }
    return null;
  }
  function maximumSubarraySum(values) {
    let best = values[0], current = values[0];
    for (let i = 1; i < values.length; i += 1) {
      current = Math.max(values[i], current + values[i]);
      best = Math.max(best, current);
    }
    return best;
  }
  function stickLengths(sticks) {
    const sorted = sticks.slice().sort((p, q) => p - q);
    const median = sorted[Math.floor(sorted.length / 2)];
    let cost = 0;
    for (let i = 0; i < sorted.length; i += 1) cost += Math.abs(sorted[i] - median);
    return cost;
  }
  function missingCoinSum(coins) {
    const sorted = coins.slice().sort((p, q) => p - q);
    let reach = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] > reach + 1) break;
      reach += sorted[i];
    }
    return reach + 1;
  }
  function collectingNumbers(values) {
    const position = new Array(values.length + 1);
    for (let i = 0; i < values.length; i += 1) position[values[i]] = i;
    let rounds = 1;
    for (let v = 2; v <= values.length; v += 1) if (position[v] < position[v - 1]) rounds += 1;
    return rounds;
  }
  function collectingNumbersII(values, swaps) {
    const n = values.length;
    const array = values.slice();
    const position = new Array(n + 2).fill(-1);
    for (let i = 0; i < n; i += 1) position[array[i]] = i;
    const bad = (v) => (v >= 2 && v <= n && position[v] < position[v - 1] ? 1 : 0);
    let rounds = 1;
    for (let v = 2; v <= n; v += 1) rounds += bad(v);
    const out = [];
    for (let s = 0; s < swaps.length; s += 1) {
      const a = swaps[s][0] - 1, b = swaps[s][1] - 1;
      const x = array[a], y = array[b];
      const affected = [x, x + 1, y, y + 1].filter((v, index, list) => list.indexOf(v) === index);
      for (let k = 0; k < affected.length; k += 1) rounds -= bad(affected[k]);
      array[a] = y; array[b] = x;
      position[y] = a; position[x] = b;
      for (let k = 0; k < affected.length; k += 1) rounds += bad(affected[k]);
      out.push(rounds);
    }
    return out;
  }
  function playlist(songs) {
    const lastSeen = new Map();
    let left = 0, best = 0;
    for (let right = 0; right < songs.length; right += 1) {
      const previous = lastSeen.get(songs[right]);
      if (previous !== undefined && previous >= left) left = previous + 1;
      lastSeen.set(songs[right], right);
      if (right - left + 1 > best) best = right - left + 1;
    }
    return best;
  }
  function towers(cubes) {
    const tops = [];
    for (let i = 0; i < cubes.length; i += 1) {
      const index = upperBound(tops, cubes[i]);
      if (index === tops.length) tops.push(cubes[i]);
      else tops[index] = cubes[i];
    }
    return tops.length;
  }
  function trafficLights(x, positions) {
    const n = positions.length;
    const sorted = positions.map((p, i) => [p, i]).sort((p, q) => p[0] - q[0]);
    const rank = new Array(n);
    for (let i = 0; i < n; i += 1) rank[sorted[i][1]] = i;
    const coordinates = [0].concat(sorted.map((entry) => entry[0]), [x]);
    const previous = new Array(n + 2), next = new Array(n + 2);
    for (let i = 0; i <= n + 1; i += 1) { previous[i] = i - 1; next[i] = i + 1; }
    let longest = 0;
    for (let i = 0; i <= n; i += 1) longest = Math.max(longest, coordinates[i + 1] - coordinates[i]);
    const answers = new Array(n);
    for (let step = n - 1; step >= 0; step -= 1) {
      answers[step] = longest;
      const node = rank[step] + 1;
      const p = previous[node], q = next[node];
      next[p] = q; previous[q] = p;
      longest = Math.max(longest, coordinates[q] - coordinates[p]);
    }
    return answers;
  }
  function distinctValuesSubarrays(values) {
    const counts = new Map();
    let left = 0, total = 0;
    for (let right = 0; right < values.length; right += 1) {
      counts.set(values[right], (counts.get(values[right]) || 0) + 1);
      while (counts.get(values[right]) > 1) { counts.set(values[left], counts.get(values[left]) - 1); left += 1; }
      total += right - left + 1;
    }
    return total;
  }
  function distinctValuesSubsequences(values) {
    const counts = new Map();
    for (let i = 0; i < values.length; i += 1) counts.set(values[i], (counts.get(values[i]) || 0) + 1);
    let product = 1;
    counts.forEach((count) => {
      const factor = (count + 1) % 1000000007;
      const hi = Math.floor(factor / 65536), lo = factor % 65536;
      product = ((product * hi % 1000000007) * 65536 + product * lo) % 1000000007;
    });
    return (product - 1 + 1000000007) % 1000000007;
  }
  function josephusProblemI(n) {
    const queue = [];
    for (let i = 1; i <= n; i += 1) queue.push(i);
    const out = [];
    let head = 0;
    while (out.length < n) {
      queue.push(queue[head]); head += 1;
      out.push(queue[head]); head += 1;
    }
    return out;
  }
  function josephusProblemII(n, k) {
    const tree = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1);
    const out = [];
    let index = 0;
    for (let remaining = n; remaining >= 1; remaining -= 1) {
      index = (index + k) % remaining;
      const position = fenwickKth(tree, index + 1);
      out.push(position);
      fenwickAdd(tree, position, -1);
    }
    return out;
  }
  function nestedRangesCheck(ranges) {
    const n = ranges.length;
    const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[q][1] - ranges[p][1]);
    const contains = new Array(n).fill(0), contained = new Array(n).fill(0);
    let minY = Infinity;
    for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; if (minY <= ranges[id][1]) contains[id] = 1; minY = Math.min(minY, ranges[id][1]); }
    let maxY = -Infinity;
    for (let i = 0; i < n; i += 1) { const id = order[i]; if (maxY >= ranges[id][1]) contained[id] = 1; maxY = Math.max(maxY, ranges[id][1]); }
    return { contains, contained };
  }
  function nestedRangesCount(ranges) {
    const n = ranges.length;
    const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[q][1] - ranges[p][1]);
    const ys = ranges.map((range) => range[1]).sort((p, q) => p - q);
    const distinct = ys.filter((y, i) => i === 0 || y !== ys[i - 1]);
    const rankOf = (y) => lowerBound(distinct, y) + 1;
    const contains = new Array(n).fill(0), contained = new Array(n).fill(0);
    let tree = new Array(distinct.length + 1).fill(0);
    for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; contains[id] = fenwickPrefix(tree, rankOf(ranges[id][1])); fenwickAdd(tree, rankOf(ranges[id][1]), 1); }
    tree = new Array(distinct.length + 1).fill(0);
    for (let i = 0; i < n; i += 1) { const id = order[i]; contained[id] = i - fenwickPrefix(tree, rankOf(ranges[id][1]) - 1); fenwickAdd(tree, rankOf(ranges[id][1]), 1); }
    return { contains, contained };
  }
  function roomAllocation(customers) {
    const order = customers.map((c, index) => index).sort((p, q) => customers[p][0] - customers[q][0] || customers[p][1] - customers[q][1]);
    const assignment = new Array(customers.length).fill(0);
    const heap = [];
    let rooms = 0;
    for (let i = 0; i < order.length; i += 1) {
      const id = order[i];
      if (heap.length && heap[0][0] < customers[id][0]) {
        const freed = heapPop(heap).item;
        assignment[id] = freed[1];
      } else {
        rooms += 1;
        assignment[id] = rooms;
      }
      heapPush(heap, [customers[id][1], assignment[id]]);
    }
    return { rooms, assignment };
  }
  function factoryMachines(times, products) {
    let fastest = times[0];
    for (let i = 1; i < times.length; i += 1) if (times[i] < fastest) fastest = times[i];
    let lo = 0n, hi = BigInt(fastest) * BigInt(products);
    const useBig = hi > 9007199254740992n;
    while (lo < hi) {
      const mid = (lo + hi) / 2n;
      let made = 0;
      if (useBig) {
        let total = 0n;
        for (let i = 0; i < times.length && total < BigInt(products); i += 1) total += mid / BigInt(times[i]);
        made = total >= BigInt(products) ? products : 0;
      } else {
        const t = Number(mid);
        for (let i = 0; i < times.length && made < products; i += 1) made += Math.floor(t / times[i]);
      }
      if (made >= products) hi = mid;
      else lo = mid + 1n;
    }
    return lo.toString();
  }
  function tasksAndDeadlines(tasks) {
    const order = tasks.slice().sort((p, q) => p[0] - q[0]);
    let time = 0, reward = 0;
    for (let i = 0; i < order.length; i += 1) { time += order[i][0]; reward += order[i][1] - time; }
    return reward;
  }
  function readingBooks(times) {
    let sum = 0, longest = 0;
    for (let i = 0; i < times.length; i += 1) { sum += times[i]; if (times[i] > longest) longest = times[i]; }
    return Math.max(sum, 2 * longest);
  }
  function sumOfThreeValues(values, target) {
    const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q);
    const n = order.length;
    for (let i = 0; i < n; i += 1) {
      let lo = i + 1, hi = n - 1;
      while (lo < hi) {
        const sum = values[order[i]] + values[order[lo]] + values[order[hi]];
        if (sum === target) return [order[i] + 1, order[lo] + 1, order[hi] + 1].sort((p, q) => p - q);
        if (sum < target) lo += 1;
        else hi -= 1;
      }
    }
    return null;
  }
  function sumOfFourValues(values, target) {
    const n = values.length;
    const seen = new Map();
    for (let c = 0; c < n; c += 1) {
      for (let d = c + 1; d < n; d += 1) {
        const pair = seen.get(target - values[c] - values[d]);
        if (pair) return [pair[0] + 1, pair[1] + 1, c + 1, d + 1].sort((p, q) => p - q);
      }
      for (let b = 0; b < c; b += 1) {
        const sum = values[b] + values[c];
        if (!seen.has(sum)) seen.set(sum, [b, c]);
      }
    }
    return null;
  }
  function nearestSmallerValues(values) {
    const stack = [];
    const out = [];
    for (let i = 0; i < values.length; i += 1) {
      while (stack.length && values[stack[stack.length - 1]] >= values[i]) stack.pop();
      out.push(stack.length ? stack[stack.length - 1] + 1 : 0);
      stack.push(i);
    }
    return out;
  }
  function subarraySumsI(values, target) {
    let left = 0, sum = 0, count = 0;
    for (let right = 0; right < values.length; right += 1) {
      sum += values[right];
      while (sum > target && left <= right) { sum -= values[left]; left += 1; }
      if (sum === target) count += 1;
    }
    return count;
  }
  function subarraySumsII(values, target) {
    const seen = new Map([[0, 1]]);
    let prefix = 0, count = 0;
    for (let i = 0; i < values.length; i += 1) {
      prefix += values[i];
      count += seen.get(prefix - target) || 0;
      seen.set(prefix, (seen.get(prefix) || 0) + 1);
    }
    return count;
  }
  function subarrayDivisibility(values) {
    const n = values.length;
    const counts = new Array(n).fill(0);
    counts[0] = 1;
    let remainder = 0, total = 0;
    for (let i = 0; i < n; i += 1) {
      remainder = (((remainder + values[i]) % n) + n) % n;
      total += counts[remainder];
      counts[remainder] += 1;
    }
    return total;
  }
  function distinctValuesSubarraysII(values, k) {
    const counts = new Map();
    let left = 0, distinct = 0, total = 0;
    for (let right = 0; right < values.length; right += 1) {
      const c = counts.get(values[right]) || 0;
      if (c === 0) distinct += 1;
      counts.set(values[right], c + 1);
      while (distinct > k) {
        const d = counts.get(values[left]) - 1;
        counts.set(values[left], d);
        if (d === 0) distinct -= 1;
        left += 1;
      }
      total += right - left + 1;
    }
    return total;
  }
  function arrayDivision(values, k) {
    let lo = 0, hi = 0;
    for (let i = 0; i < values.length; i += 1) { lo = Math.max(lo, values[i]); hi += values[i]; }
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      let pieces = 1, sum = 0;
      for (let i = 0; i < values.length; i += 1) {
        if (sum + values[i] > mid) { pieces += 1; sum = values[i]; }
        else sum += values[i];
      }
      if (pieces <= k) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  function movieFestivalII(movies, k) {
    const order = movies.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    const times = [0].concat(order.map((movie) => movie[1])).sort((p, q) => p - q);
    const distinct = times.filter((t, i) => i === 0 || t !== times[i - 1]);
    const rankOf = (t) => lowerBound(distinct, t) + 1;
    const tree = new Array(distinct.length + 1).fill(0);
    fenwickAdd(tree, rankOf(0), k);
    let count = 0;
    for (let i = 0; i < order.length; i += 1) {
      const available = fenwickPrefix(tree, upperBound(distinct, order[i][0]));
      if (available === 0) continue;
      const position = fenwickKth(tree, available);
      fenwickAdd(tree, position, -1);
      fenwickAdd(tree, rankOf(order[i][1]), 1);
      count += 1;
    }
    return count;
  }
  function maximumSubarraySumII(values, a, b) {
    const n = values.length;
    const prefix = [0];
    for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]);
    const deque = [];
    let head = 0, best = -Infinity;
    for (let r = a; r <= n; r += 1) {
      const enter = r - a;
      while (deque.length > head && prefix[deque[deque.length - 1]] >= prefix[enter]) deque.pop();
      deque.push(enter);
      while (deque[head] < r - b) head += 1;
      best = Math.max(best, prefix[r] - prefix[deque[head]]);
    }
    return best;
  }

  // ------------------------------------------------------------------ brute forces and validity checks
  function pairsList(seed, count, lo, hi) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      let a = lo + Math.floor(next() * (hi - lo + 1)), b = lo + Math.floor(next() * (hi - lo + 1));
      if (a > b) { const swap = a; a = b; b = swap; }
      if (a === b) b += 1;
      out.push([a, b]);
    }
    return out;
  }
  function distinctPairs(seed, count, lo, hi) {
    const next = rng(seed);
    const seen = new Set();
    const out = [];
    while (out.length < count) {
      let a = lo + Math.floor(next() * (hi - lo + 1)), b = lo + Math.floor(next() * (hi - lo + 1));
      if (a >= b) continue;
      const key = a + "," + b;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
    return out;
  }
  function apartmentsBrute(applicants, sizes, k) {
    const used = new Array(sizes.length).fill(false);
    const go = (i) => {
      if (i === applicants.length) return 0;
      let best = go(i + 1);
      for (let j = 0; j < sizes.length; j += 1) {
        if (!used[j] && Math.abs(applicants[i] - sizes[j]) <= k) { used[j] = true; best = Math.max(best, 1 + go(i + 1)); used[j] = false; }
      }
      return best;
    };
    return go(0);
  }
  function concertBrute(prices, budgets) {
    const left = prices.slice();
    const out = [];
    for (let c = 0; c < budgets.length; c += 1) {
      let bestIndex = -1;
      for (let i = 0; i < left.length; i += 1) if (left[i] <= budgets[c] && (bestIndex < 0 || left[i] > left[bestIndex])) bestIndex = i;
      if (bestIndex < 0) out.push(-1);
      else { out.push(left[bestIndex]); left.splice(bestIndex, 1); }
    }
    return out;
  }
  function restaurantBrute(visits) {
    let best = 0;
    for (let t = 0; t <= 40; t += 1) {
      let count = 0;
      for (let i = 0; i < visits.length; i += 1) if (visits[i][0] <= t && t < visits[i][1]) count += 1;
      best = Math.max(best, count);
    }
    return best;
  }
  function movieBrute(movies) {
    let best = 0;
    for (let mask = 0; mask < (1 << movies.length); mask += 1) {
      const chosen = [];
      for (let i = 0; i < movies.length; i += 1) if (mask & (1 << i)) chosen.push(movies[i]);
      chosen.sort((p, q) => p[0] - q[0]);
      let ok = true;
      for (let i = 1; i < chosen.length; i += 1) if (chosen[i][0] < chosen[i - 1][1]) ok = false;
      if (ok) best = Math.max(best, chosen.length);
    }
    return best;
  }
  function stickBrute(sticks) {
    let best = Infinity;
    for (let target = 0; target <= 30; target += 1) { let cost = 0; for (let i = 0; i < sticks.length; i += 1) cost += Math.abs(sticks[i] - target); best = Math.min(best, cost); }
    return best;
  }
  function coinSumBrute(coins) {
    const sums = new Set([0]);
    for (let i = 0; i < coins.length; i += 1) { const more = []; sums.forEach((s) => more.push(s + coins[i])); more.forEach((s) => sums.add(s)); }
    let answer = 1;
    while (sums.has(answer)) answer += 1;
    return answer;
  }
  function collectingBrute(values) {
    let rounds = 0, collected = 0;
    while (collected < values.length) {
      rounds += 1;
      for (let i = 0; i < values.length; i += 1) if (values[i] === collected + 1) collected += 1;
    }
    return rounds;
  }
  function collectingIIBrute(values, swaps) {
    const array = values.slice();
    const out = [];
    for (let s = 0; s < swaps.length; s += 1) {
      const a = swaps[s][0] - 1, b = swaps[s][1] - 1;
      const swap = array[a]; array[a] = array[b]; array[b] = swap;
      out.push(collectingBrute(array));
    }
    return out;
  }
  function playlistBrute(songs) {
    let best = 0;
    for (let i = 0; i < songs.length; i += 1) { const seen = new Set(); for (let j = i; j < songs.length && !seen.has(songs[j]); j += 1) { seen.add(songs[j]); best = Math.max(best, j - i + 1); } }
    return best;
  }
  function towersBrute(cubes) {
    let best = Infinity;
    const tops = [];
    const go = (i) => {
      if (tops.length >= best) return;
      if (i === cubes.length) { best = Math.min(best, tops.length); return; }
      for (let t = 0; t < tops.length; t += 1) { if (tops[t] > cubes[i]) { const saved = tops[t]; tops[t] = cubes[i]; go(i + 1); tops[t] = saved; } }
      tops.push(cubes[i]); go(i + 1); tops.pop();
    };
    go(0);
    return best;
  }
  function trafficBrute(x, positions) {
    const out = [];
    for (let i = 0; i < positions.length; i += 1) {
      const points = [0, x].concat(positions.slice(0, i + 1)).sort((p, q) => p - q);
      let longest = 0;
      for (let j = 1; j < points.length; j += 1) longest = Math.max(longest, points[j] - points[j - 1]);
      out.push(longest);
    }
    return out;
  }
  function distinctSubarraysBrute(values) {
    let total = 0;
    for (let i = 0; i < values.length; i += 1) { const seen = new Set(); for (let j = i; j < values.length && !seen.has(values[j]); j += 1) { seen.add(values[j]); total += 1; } }
    return total;
  }
  function distinctSubsequencesBrute(values) {
    let total = 0;
    for (let mask = 1; mask < (1 << values.length); mask += 1) {
      const seen = new Set();
      let ok = true;
      for (let i = 0; i < values.length && ok; i += 1) if (mask & (1 << i)) { if (seen.has(values[i])) ok = false; seen.add(values[i]); }
      if (ok) total += 1;
    }
    return total % 1000000007;
  }
  function josephusBrute(n, k) {
    const people = [];
    for (let i = 1; i <= n; i += 1) people.push(i);
    const out = [];
    let index = 0;
    while (people.length) { index = (index + k) % people.length; out.push(people[index]); people.splice(index, 1); }
    return out;
  }
  function nestedCountBrute(ranges) {
    const n = ranges.length;
    const contains = new Array(n).fill(0), contained = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (ranges[i][0] <= ranges[j][0] && ranges[j][1] <= ranges[i][1]) { contains[i] += 1; contained[j] += 1; }
    }
    return { contains, contained };
  }
  function nestedCheckBrute(ranges) {
    const counts = nestedCountBrute(ranges);
    return { contains: counts.contains.map((c) => (c > 0 ? 1 : 0)), contained: counts.contained.map((c) => (c > 0 ? 1 : 0)) };
  }
  function roomCheck(args, result) {
    const customers = args[0];
    let overlap = 0;
    for (let t = 0; t <= 40; t += 1) { let count = 0; for (let i = 0; i < customers.length; i += 1) if (customers[i][0] <= t && t <= customers[i][1]) count += 1; overlap = Math.max(overlap, count); }
    if (result.rooms !== overlap || result.assignment.length !== customers.length) return false;
    for (let i = 0; i < customers.length; i += 1) for (let j = i + 1; j < customers.length; j += 1) {
      if (result.assignment[i] !== result.assignment[j]) continue;
      if (customers[i][0] <= customers[j][1] && customers[j][0] <= customers[i][1]) return false;
    }
    return result.assignment.every((room) => room >= 1 && room <= result.rooms);
  }
  function factoryBrute(times, products) {
    let t = 0, made = 0;
    while (made < products) { t += 1; made = 0; for (let i = 0; i < times.length; i += 1) made += Math.floor(t / times[i]); }
    return String(t);
  }
  function deadlinesBrute(tasks) {
    let best = -Infinity;
    const used = new Array(tasks.length).fill(false);
    const go = (time, reward, left) => {
      if (left === 0) { best = Math.max(best, reward); return; }
      for (let i = 0; i < tasks.length; i += 1) if (!used[i]) { used[i] = true; go(time + tasks[i][0], reward + tasks[i][1] - time - tasks[i][0], left - 1); used[i] = false; }
    };
    go(0, 0, tasks.length);
    return best;
  }
  function threeCheck(args, result) {
    const values = args[0], target = args[1];
    let exists = false;
    for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) for (let k = j + 1; k < values.length; k += 1) if (values[i] + values[j] + values[k] === target) exists = true;
    if (result === null) return !exists;
    if (result.length !== 3 || new Set(result).size !== 3) return false;
    return result.every((p) => p >= 1 && p <= values.length) && values[result[0] - 1] + values[result[1] - 1] + values[result[2] - 1] === target;
  }
  function fourCheck(args, result) {
    const values = args[0], target = args[1];
    let exists = false;
    for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) for (let k = j + 1; k < values.length; k += 1) for (let l = k + 1; l < values.length; l += 1) if (values[i] + values[j] + values[k] + values[l] === target) exists = true;
    if (result === null) return !exists;
    if (result.length !== 4 || new Set(result).size !== 4) return false;
    return result.every((p) => p >= 1 && p <= values.length) && result.reduce((sum, p) => sum + values[p - 1], 0) === target;
  }
  function smallerBrute(values) {
    const out = [];
    for (let i = 0; i < values.length; i += 1) { let answer = 0; for (let j = i - 1; j >= 0; j -= 1) if (values[j] < values[i]) { answer = j + 1; break; } out.push(answer); }
    return out;
  }
  function subarraySumBrute(values, target) {
    let count = 0;
    for (let i = 0; i < values.length; i += 1) { let sum = 0; for (let j = i; j < values.length; j += 1) { sum += values[j]; if (sum === target) count += 1; } }
    return count;
  }
  function divisibilityBrute(values) {
    let count = 0;
    for (let i = 0; i < values.length; i += 1) { let sum = 0; for (let j = i; j < values.length; j += 1) { sum += values[j]; if (sum % values.length === 0) count += 1; } }
    return count;
  }
  function distinctIIBrute(values, k) {
    let count = 0;
    for (let i = 0; i < values.length; i += 1) { const seen = new Set(); for (let j = i; j < values.length; j += 1) { seen.add(values[j]); if (seen.size > k) break; count += 1; } }
    return count;
  }
  function divisionBrute(values, k) {
    let best = Infinity;
    const go = (index, pieces, current, largest) => {
      if (index === values.length) { best = Math.min(best, Math.max(largest, current)); return; }
      go(index + 1, pieces, current + values[index], largest);
      if (pieces < k && index > 0) go(index + 1, pieces + 1, values[index], Math.max(largest, current));
    };
    go(0, 1, 0, 0);
    return best;
  }
  function subarrayIIBrute(values, a, b) {
    let best = -Infinity;
    for (let i = 0; i < values.length; i += 1) { let sum = 0; for (let j = i; j < values.length; j += 1) { sum += values[j]; const length = j - i + 1; if (length >= a && length <= b) best = Math.max(best, sum); } }
    return best;
  }
  function festivalIIBrute(movies, k) {
    let best = 0;
    const free = new Array(k).fill(0);
    const order = movies.slice().sort((p, q) => p[1] - q[1]);
    const go = (index, count) => {
      if (index === order.length) { best = Math.max(best, count); return; }
      go(index + 1, count);
      for (let m = 0; m < k; m += 1) if (free[m] <= order[index][0]) { const saved = free[m]; free[m] = order[index][1]; go(index + 1, count + 1); free[m] = saved; }
    };
    go(0, 0);
    return best;
  }
  const smallList = (seed, count, lo, hi) => randomInts(seed, count, lo, hi);
  const PAIR_BIG = lazy(() => { const out = randomInts(11, BIG, 1, 500000000).map((v) => v * 2); out[777] = 123457; out[199999] = 1000000001 - 123457; return out; });
  const FOUR_BIG = lazy(() => { const out = randomInts(12, 1000, 1, 250000000).map((v) => v * 4); out[10] = 1; out[500] = 2; out[900] = 4; out[999] = 1000000000 - 7; return out; });

  function treeOf(counts) {
    const tree = new Array(counts.length + 1).fill(0);
    for (let i = 0; i < counts.length; i += 1) if (counts[i]) fenwickAdd(tree, i + 1, counts[i]);
    return tree;
  }

  const SORTING = [
    {
      id: "distinct-numbers", title: "Distinct Numbers", cses: { id: 1621, name: "Distinct Numbers" },
      goal: "Count how many different values appear.",
      concept: "Sort first, then a single scan sees equal values next to each other. Sorting turns many O(n²) questions into O(n log n).",
      functionName: "distinctNumbers", signature: "distinctNumbers(values) → number",
      starterSource: starter("distinctNumbers", "values", "Sort a copy, count positions where the value changes."),
      solve: distinctNumbers, comparator: "scalar",
      reference: book("3.1", "Sorting theory · why sorting helps"),
      presets: { sample: { a: [2, 3, 2, 2, 3, 5, 1, 5] }, "all same": { a: [4, 4, 4, 4] }, "all different": { a: [1, 2, 3, 4, 5, 6] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("scan-without-sort", "Adjacent comparison only works after sorting.", function distinctNumbers(values) { let count = 0; for (let i = 0; i < values.length; i += 1) if (i === 0 || values[i] !== values[i - 1]) count += 1; return count; }),
        diagnosis("returns-length", "That counts all values, duplicates included.", function distinctNumbers(values) { return values.length; }),
      ],
      hints: ["Copy and sort with a numeric comparator: (a, b) => a − b.", "Walk the sorted array.", "Count an element when it differs from the one before it (the first always counts)."],
      cases: [
        example([[2, 3, 2, 2, 3]], 2, "CSES sample"),
        example([[4, 4, 4]], 1, "all same"),
        example([[1, 2, 3]], 3, "all different"),
        hidden("n = 200 000, time limit", () => [randomInts(7, BIG, 1, 1000)]),
      ],
    },
    {
      id: "apartments", title: "Apartments", cses: { id: 1084, name: "Apartments" },
      goal: "Maximum number of applicants who get an apartment whose size is within k of their wish.",
      concept: "Sort both lists and walk them together: a pair that fits is always safe to take; otherwise drop whichever side is smaller.",
      functionName: "apartments", signature: "apartments(applicants, sizes, k) → number",
      starterSource: starter("apartments", "applicants, sizes, k"),
      solve: apartments, comparator: "scalar", brute: apartmentsBrute, small: (round) => { const next = rng(2000 + round); return [smallList(2100 + round, 1 + Math.floor(next() * 5), 1, 10), smallList(2200 + round, 1 + Math.floor(next() * 5), 1, 10), Math.floor(next() * 4)]; },
      reference: book("6", "Greedy algorithms · two pointers after sorting"),
      presets: { "CSES sample": { a: [60, 45, 80, 60], b: [30, 60, 75] }, "nobody fits": { a: [1, 2], b: [10, 20] }, "exact sizes": { a: [5, 5, 7], b: [5, 7, 7] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 5] },
      diagnoses: [
        diagnosis("drops-applicant-always", "When the pair does not fit, drop the smaller side: dropping the applicant every time loses matches.", function apartments(applicants, sizes, k) { const a = applicants.slice().sort((p, q) => p - q), b = sizes.slice().sort((p, q) => p - q); let i = 0, j = 0, matched = 0; while (i < a.length && j < b.length) { if (Math.abs(a[i] - b[j]) <= k) { matched += 1; i += 1; j += 1; } else i += 1; } return matched; }),
        diagnosis("reuses-apartments", "Each apartment goes to one applicant.", function apartments(applicants, sizes, k) { const b = sizes.slice().sort((p, q) => p - q); let matched = 0; for (let i = 0; i < applicants.length; i += 1) { let lo = 0, hi = b.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (b[mid] < applicants[i] - k) lo = mid + 1; else hi = mid; } if (lo < b.length && b[lo] <= applicants[i] + k) matched += 1; } return matched; }),
      ],
      hints: ["Sort applicants and apartments.", "If |a[i] − b[j]| ≤ k, match them and advance both.", "Otherwise advance the smaller of the two."],
      cases: [
        example([[60, 45, 80, 60], [30, 60, 75], 5], 2, "CSES sample"),
        example([[1, 2], [10, 20], 3], 0, "nobody fits"),
        example([[5, 5, 7], [5, 7, 7], 0], 2, "exact sizes"),
        hidden("n = m = 200 000, time limit", () => [randomInts(21, BIG, 1, 1000000000), randomInts(22, BIG, 1, 1000000000), 10000]),
      ],
    },
    {
      id: "ferris-wheel", title: "Ferris Wheel", cses: { id: 1090, name: "Ferris Wheel" },
      goal: "Minimum gondolas when each gondola holds at most two children with total weight at most x.",
      concept: "Sort, then pair the heaviest child with the lightest one if they fit; otherwise the heaviest rides alone. Two pointers make it one pass.",
      functionName: "ferrisWheel", signature: "ferrisWheel(weights, x) → number",
      starterSource: starter("ferrisWheel", "weights, x"),
      solve: ferrisWheel, comparator: "scalar",
      reference: book("6", "Greedy algorithms · with two pointers (8.1)"),
      presets: { "CSES sample": { a: [7, 2, 3, 9] }, "all light": { a: [1, 1, 1, 1, 2] }, "all heavy": { a: [9, 8, 9, 7] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "x", type: "slider", label: "max weight x (rounded)", value: 10, min: 1, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("pairs-neighbours", "Pairing adjacent weights after sorting wastes capacity; pair the heaviest with the lightest.", function ferrisWheel(weights, x) { const sorted = weights.slice().sort((p, q) => p - q); let gondolas = 0; for (let i = 0; i < sorted.length; i += 1) { if (i + 1 < sorted.length && sorted[i] + sorted[i + 1] <= x) i += 1; gondolas += 1; } return gondolas; }),
        diagnosis("never-pairs", "Children can share a gondola.", function ferrisWheel(weights, x) { return weights.length; }),
      ],
      hints: ["Sort a copy ascending.", "lo at the lightest, hi at the heaviest; if they fit together, advance lo.", "Always retire hi and count one gondola."],
      cases: [
        example([[7, 2, 3, 9], 10], 3, "CSES sample"),
        example([[1, 1, 1, 1], 2], 2, "all light"),
        example([[5, 5], 10], 1, "exactly fits"),
        example([[6], 5], 1, "single child"),
        hidden("n = 200 000, time limit", () => [randomInts(14, BIG, 1, 1000000000), 1000000000]),
      ],
    },
    {
      id: "lower-bound", title: "Lower Bound", cses: { id: 1091, name: "Concert Tickets (brick)" },
      goal: "Return the first index whose value is at least x, or the length when none is.",
      concept: "Binary search halves the range each step: keep an invariant like 'everything before lo is smaller than x' and it cannot go wrong.",
      functionName: "lowerBound", signature: "lowerBound(sorted, x) → index",
      starterSource: starter("lowerBound", "sorted, x", "lo = 0, hi = length; while lo < hi: mid; if sorted[mid] < x then lo = mid + 1 else hi = mid."),
      solve: lowerBound, comparator: "scalar",
      reference: book("3.3", "Binary search"),
      presets: { sample: { a: [1, 2, 3, 4, 5, 6, 7, 8] }, "with gaps": { a: [1, 3, 3, 5, 8, 8, 9] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "x", type: "slider", label: "x (rounded)", value: 4, min: 0, max: 10 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("upper-bound", "That finds the first value greater than x; lower bound wants at least x.", function lowerBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; } return lo; }),
        diagnosis("off-by-one", "The answer is lo itself, not lo − 1.", function lowerBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; } return lo - 1; }),
      ],
      hints: ["lo = 0, hi = sorted.length.", "mid = (lo + hi) >> 1; if sorted[mid] < x move lo past mid, else hi = mid.", "Stop when lo == hi and return lo."],
      cases: [
        example([[1, 3, 3, 5], 3], 1, "first of the equal values"),
        example([[1, 3, 3, 5], 4], 3, "between values"),
        example([[1, 3, 3, 5], 6], 4, "beyond the end"),
        example([[1, 3, 3, 5], 0], 0, "before the start"),
        example([[], 1], 0, "empty"),
      ],
    },
    {
      id: "upper-bound", title: "Upper Bound", cses: { id: 1073, name: "Towers (brick)" },
      goal: "Return the first index whose value is greater than x, or the length when none is.",
      concept: "The twin of lower bound: the comparison becomes ≤. Together they bracket every run of equal values.",
      functionName: "upperBound", signature: "upperBound(sorted, x) → index",
      starterSource: starter("upperBound", "sorted, x"),
      solve: upperBound, comparator: "scalar",
      reference: book("3.3", "Binary search"),
      presets: { sample: { a: [1, 2, 3, 4, 5, 6, 7, 8] }, "with gaps": { a: [1, 3, 3, 5, 8, 8, 9] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "x", type: "slider", label: "x (rounded)", value: 3, min: 0, max: 10 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("lower-bound", "Values equal to x belong before the answer; use ≤ when moving lo.", function upperBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; } return lo; }),
        diagnosis("last-not-greater", "The answer is the first index greater than x, not the last index ≤ x.", function upperBound(sorted, x) { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; } return lo - 1; }),
      ],
      hints: ["Same loop as lowerBound.", "Move lo past mid when sorted[mid] ≤ x.", "Return lo."],
      cases: [
        example([[1, 3, 3, 5], 3], 3, "past the equal values"),
        example([[1, 3, 3, 5], 4], 3, "between values"),
        example([[1, 3, 3, 5], 5], 4, "beyond the end"),
        example([[1, 3, 3, 5], 0], 0, "before the start"),
      ],
    },
    {
      id: "fenwick-add", title: "Fenwick Tree: Add", cses: { id: 1091, name: "Concert Tickets (brick)" },
      goal: "Add delta at a 1-based index of a Fenwick (binary indexed) tree, in place, and return the tree.",
      concept: "Cell i covers the i & −i values ending at i. Adding walks upward by adding the lowest set bit each step.",
      functionName: "fenwickAdd", signature: "fenwickAdd(tree, index, delta) → tree",
      starterSource: starter("fenwickAdd", "tree, index, delta", "for (i = index; i < tree.length; i += i & -i) tree[i] += delta."),
      solve: fenwickAdd, comparator: "deep", allowMutation: true,
      reference: book("9.2", "Binary indexed tree"),
      presets: { "eight zeros": { a: [0, 0, 0, 0, 0, 0, 0, 0, 0] }, ones: { a: [0, 1, 2, 1, 4, 1, 2, 1, 8] } },
      scene: { kind: "algo", view: "bars", handles: preset([
        { id: "index", type: "slider", label: "index (rounded)", value: 3, min: 1, max: 8 },
        { id: "delta", type: "slider", label: "delta (rounded)", value: 5, min: -5, max: 9 },
      ]), args: [{ fixture: "presetA" }, { fixture: "roundedIndex" }, { fixture: "roundedDelta" }] },
      diagnoses: [
        diagnosis("single-cell", "Every cell that covers the index must change, not only tree[index].", function fenwickAdd(tree, index, delta) { tree[index] += delta; return tree; }),
        diagnosis("steps-by-one", "The step is the lowest set bit i & −i, not 1.", function fenwickAdd(tree, index, delta) { for (let i = index; i < tree.length; i += 1) tree[i] += delta; return tree; }),
      ],
      hints: ["Start at index.", "tree[i] += delta, then i += i & −i.", "Stop when i reaches the array length."],
      cases: [
        example([[0, 0, 0, 0, 0, 0, 0, 0, 0], 3, 5], [0, 0, 0, 5, 5, 0, 0, 0, 5], "index 3 touches 3, 4, 8"),
        example([[0, 0, 0, 0, 0, 0, 0, 0, 0], 1, 1], [0, 1, 1, 0, 1, 0, 0, 0, 1], "index 1 touches every power of two"),
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 6, -1], [0, 1, 2, 1, 4, 1, 1, 1, 7], "subtract"),
      ],
    },
    {
      id: "fenwick-prefix", title: "Fenwick Tree: Prefix Sum", cses: { id: 1091, name: "Concert Tickets (brick)" },
      goal: "Sum of the values at 1..index from a Fenwick tree.",
      concept: "Walk downward by removing the lowest set bit; each visited cell contributes a disjoint block.",
      functionName: "fenwickPrefix", signature: "fenwickPrefix(tree, index) → number",
      starterSource: starter("fenwickPrefix", "tree, index", "for (i = index; i > 0; i -= i & -i) sum += tree[i]."),
      solve: fenwickPrefix, comparator: "scalar",
      reference: book("9.2", "Binary indexed tree"),
      presets: { ones: { a: [0, 1, 2, 1, 4, 1, 2, 1, 8] }, mixed: { a: [0, 3, 5, 1, 9, 2, 2, 4, 15] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "index", type: "slider", label: "index (rounded)", value: 5, min: 0, max: 8 }]), args: [{ fixture: "presetA" }, { fixture: "roundedIndex" }] },
      diagnoses: [
        diagnosis("single-cell", "tree[index] alone covers only the last block; keep removing the lowest set bit.", function fenwickPrefix(tree, index) { return index > 0 ? tree[index] : 0; }),
        diagnosis("steps-by-one", "Stepping by one double counts; the step is i & −i.", function fenwickPrefix(tree, index) { let sum = 0; for (let i = index; i > 0; i -= 1) sum += tree[i]; return sum; }),
      ],
      hints: ["Start at index with sum 0.", "sum += tree[i], then i −= i & −i.", "Stop at 0."],
      cases: [
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 5], 5, "five ones"),
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 8], 8, "whole array"),
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 0], 0, "empty prefix"),
        example([[0, 3, 5, 1, 9, 2, 2, 4, 15], 3], 6, "mixed values"),
      ],
    },
    {
      id: "fenwick-kth", title: "Fenwick Tree: k-th Element", cses: { id: 2163, name: "Josephus Problem II (brick)" },
      goal: "Given a Fenwick tree of counts, the smallest index whose prefix sum reaches k, or −1 when the total is smaller than k.",
      concept: "Descend from the largest power of two: jump right whenever the block's count stays below what is still needed. That turns the tree into a sorted multiset with O(log n) selection.",
      functionName: "fenwickKth", signature: "fenwickKth(tree, k) → index or −1",
      starterSource: starter("fenwickKth", "tree, k", "step = largest power of two ≤ n; position = 0; while step: if position + step ≤ n and tree[position + step] < k, move there and subtract."),
      solve: fenwickKth, comparator: "scalar", dependencies: ["fenwick-prefix"],
      reference: book("9.2", "Binary indexed tree · finding the k-th element"),
      presets: { ones: { a: [0, 1, 2, 1, 4, 1, 2, 1, 8] }, gaps: { a: treeOf([1, 0, 2, 0, 1, 0, 0, 3]) } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "k", type: "slider", label: "k (rounded)", value: 3, min: 1, max: 9 }]), args: [{ fixture: "presetA" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("returns-position", "The descent ends one before the answer; return position + 1.", function fenwickKth(tree, k) { const n = tree.length - 1; if (k < 1 || fenwickPrefix(tree, n) < k) return -1; let position = 0, remaining = k; let step = 1; while (step * 2 <= n) step *= 2; for (; step > 0; step >>= 1) { const next = position + step; if (next <= n && tree[next] < remaining) { position = next; remaining -= tree[next]; } } return position; }),
        diagnosis("no-total-check", "When k exceeds the total count there is no such element; return −1.", function fenwickKth(tree, k) { const n = tree.length - 1; let position = 0, remaining = k; let step = 1; while (step * 2 <= n) step *= 2; for (; step > 0; step >>= 1) { const next = position + step; if (next <= n && tree[next] < remaining) { position = next; remaining -= tree[next]; } } return position + 1; }),
      ],
      hints: ["If the total (prefix of n) is below k, return −1.", "Start with the largest power of two not above n.", "At each step, if tree[position + step] < remaining, move there and subtract; halve the step."],
      cases: [
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 3], 3, "third of eight ones"),
        example([[0, 1, 2, 1, 4, 1, 2, 1, 8], 9], -1, "more than the total"),
        example([treeOf([1, 0, 2, 0, 1, 0, 0, 3]), 3], 3, "counts with gaps"),
        example([treeOf([1, 0, 2, 0, 1, 0, 0, 3]), 5], 8, "into the last block"),
        example([treeOf([0, 0, 0, 4]), 1], 4, "leading zeros"),
      ],
    },
    {
      id: "concert-tickets", title: "Concert Tickets", cses: { id: 1091, name: "Concert Tickets" },
      goal: "Each customer in turn buys the most expensive ticket priced at most their maximum, or gets −1.",
      concept: "A sorted multiset with removal: Fenwick counts over the sorted prices, upper bound to count affordable tickets, k-th to find the last of them.",
      functionName: "concertTickets", signature: "concertTickets(prices, budgets) → array",
      starterSource: starter("concertTickets", "prices, budgets", "sorted prices; tree of counts; per budget: count = prefix(upperBound(sorted, budget)); if 0 → −1 else kth(count), remove it."),
      solve: concertTickets, comparator: "deep", dependencies: ["upper-bound", "fenwick-add", "fenwick-prefix", "fenwick-kth"], brute: concertBrute, small: (round) => { const next = rng(2300 + round); return [smallList(2400 + round, 1 + Math.floor(next() * 6), 1, 9), smallList(2500 + round, 1 + Math.floor(next() * 6), 1, 9)]; },
      reference: book("4.2", "Set structures · multiset with lower bound"),
      presets: { "CSES sample": { a: [5, 3, 7, 8, 5], b: [4, 8, 3] }, "runs out": { a: [2, 2], b: [5, 5, 5] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("cheapest-affordable", "The customer takes the most expensive affordable ticket, not the cheapest.", function concertTickets(prices, budgets) { const sorted = prices.slice().sort((p, q) => p - q); const tree = new Array(sorted.length + 1).fill(0); for (let i = 0; i < sorted.length; i += 1) fenwickAdd(tree, i + 1, 1); const out = []; for (let c = 0; c < budgets.length; c += 1) { const count = fenwickPrefix(tree, upperBound(sorted, budgets[c])); if (count === 0) { out.push(-1); continue; } const position = fenwickKth(tree, 1); out.push(sorted[position - 1]); fenwickAdd(tree, position, -1); } return out; }),
        diagnosis("tickets-reused", "A sold ticket must be removed.", function concertTickets(prices, budgets) { const sorted = prices.slice().sort((p, q) => p - q); const out = []; for (let c = 0; c < budgets.length; c += 1) { const index = upperBound(sorted, budgets[c]); out.push(index === 0 ? -1 : sorted[index - 1]); } return out; }),
      ],
      hints: ["Sort the prices and put a count of 1 at every position in a Fenwick tree.", "Affordable tickets = prefix(upperBound(sorted, budget)); zero means −1.", "Otherwise take fenwickKth(tree, count), report its price, and subtract 1 there."],
      cases: [
        example([[5, 3, 7, 8, 5], [4, 8, 3]], [3, 8, -1], "CSES sample"),
        example([[2, 2], [5, 5, 5]], [2, 2, -1], "runs out"),
        example([[10], [5]], [-1], "too expensive"),
        hidden("n = m = 200 000, time limit", () => [randomInts(23, BIG, 1, 1000000000), randomInts(24, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "restaurant-customers", title: "Restaurant Customers", cses: { id: 1619, name: "Restaurant Customers" },
      goal: "Maximum number of customers present at the same time; arrival and departure times are all distinct.",
      concept: "Sweep line: turn every visit into an arrival (+1) and a departure (−1), sort the events, and track the running count.",
      functionName: "restaurantCustomers", signature: "restaurantCustomers(visits) → number",
      starterSource: starter("restaurantCustomers", "visits", "visits are [arrival, departure]."),
      solve: restaurantCustomers, comparator: "scalar", brute: restaurantBrute, small: (round) => [distinctPairs(2600 + round, 1 + (round % 6), 1, 20)],
      reference: book("30", "Sweep line algorithms · intersection points"),
      presets: { "CSES sample": { a: [[5, 8], [2, 4], [3, 9]] }, nested: { a: [[1, 10], [2, 9], [3, 8]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("arrival-after-departure", "At equal times a departure comes first; sorting arrivals first overcounts.", function restaurantCustomers(visits) { const events = []; for (let i = 0; i < visits.length; i += 1) { events.push([visits[i][0], 1]); events.push([visits[i][1], -1]); } events.sort((p, q) => p[0] - q[0] || q[1] - p[1]); let current = 0, best = 0; for (let i = 0; i < events.length; i += 1) { current += events[i][1]; if (current > best) best = current; } return best; }),
        diagnosis("counts-everyone", "Customers who never overlap should not add up.", function restaurantCustomers(visits) { return visits.length; }),
      ],
      hints: ["Two events per visit.", "Sort by time; departures before arrivals on ties.", "Running sum; keep the maximum."],
      cases: [
        example([[[5, 8], [2, 4], [3, 9]]], 2, "CSES sample"),
        example([[[1, 10], [2, 9], [3, 8]]], 3, "nested"),
        example([[[1, 2], [2, 3]]], 1, "touching visits"),
        hidden("n = 200 000, time limit", () => [pairsList(25, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "movie-festival", title: "Movie Festival", cses: { id: 1629, name: "Movie Festival" },
      goal: "Maximum number of whole movies one person can watch; a movie may start exactly when the previous one ends.",
      concept: "Sort by end time and always take the movie that ends first; it leaves the most room for the rest.",
      functionName: "movieFestival", signature: "movieFestival(movies) → number",
      starterSource: starter("movieFestival", "movies", "movies are [start, end]."),
      solve: movieFestival, comparator: "scalar", brute: movieBrute, small: (round) => [pairsList(2700 + round, 1 + (round % 8), 1, 12)],
      reference: book("6.1", "Greedy algorithms · scheduling"),
      presets: { "CSES sample": { a: [[3, 5], [4, 9], [5, 8]] }, "back to back": { a: [[1, 3], [3, 5], [5, 7]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("sort-by-start", "Choosing by earliest start can pick a long movie that blocks two short ones; sort by end.", function movieFestival(movies) { const order = movies.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); let count = 0, free = -Infinity; for (let i = 0; i < order.length; i += 1) { if (order[i][0] >= free) { count += 1; free = order[i][1]; } } return count; }),
        diagnosis("strict-gap", "A movie starting exactly when the previous ends is allowed.", function movieFestival(movies) { const order = movies.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]); let count = 0, free = -Infinity; for (let i = 0; i < order.length; i += 1) { if (order[i][0] > free) { count += 1; free = order[i][1]; } } return count; }),
      ],
      hints: ["Sort by end time.", "Take a movie if its start is at or after the current free time.", "Update the free time to its end."],
      cases: [
        example([[[3, 5], [4, 9], [5, 8]]], 2, "CSES sample"),
        example([[[1, 3], [3, 5], [5, 7]]], 3, "back to back"),
        example([[[1, 10], [2, 3], [4, 5]]], 2, "long one blocks nothing"),
        hidden("n = 200 000, time limit", () => [pairsList(26, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "sum-of-two-values", title: "Sum of Two Values", cses: { id: 1640, name: "Sum of Two Values" },
      goal: "Find two positions (1-based, ascending) whose values add up to the target, or null.",
      concept: "Sort the indexes by value and walk two pointers inwards: a small sum moves the left pointer, a large sum moves the right one.",
      functionName: "sumOfTwoValues", signature: "sumOfTwoValues(values, target) → [i, j] or null",
      starterSource: starter("sumOfTwoValues", "values, target", "Sort an index array by value; two pointers; return original positions + 1 in ascending order."),
      solve: sumOfTwoValues, comparator: "deep",
      reference: book("8.1", "Two pointers method · 2SUM"),
      presets: { sample: { a: [2, 7, 5, 1] }, "no pair": { a: [1, 2, 3] }, "equal halves": { a: [3, 3, 8] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "target", type: "slider", label: "target (rounded)", value: 9, min: 2, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("moves-wrong-pointer", "When the sum is too small, move the left pointer up; the right pointer only moves when the sum is too large.", function sumOfTwoValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); let lo = 0, hi = order.length - 1; while (lo < hi) { const sum = values[order[lo]] + values[order[hi]]; if (sum === target) { const a = order[lo] + 1, b = order[hi] + 1; return a < b ? [a, b] : [b, a]; } hi -= 1; } return null; }),
        diagnosis("zero-based", "CSES positions are 1-based.", function sumOfTwoValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); let lo = 0, hi = order.length - 1; while (lo < hi) { const sum = values[order[lo]] + values[order[hi]]; if (sum === target) { const a = order[lo], b = order[hi]; return a < b ? [a, b] : [b, a]; } if (sum < target) lo += 1; else hi -= 1; } return null; }),
      ],
      hints: ["Sorting the values loses their positions, so sort an array of indexes instead.", "lo at the smallest, hi at the largest; compare their sum with the target.", "Return the two original positions + 1, smaller first."],
      cases: [
        example([[2, 7, 5, 1], 9], [1, 2], "CSES sample"),
        example([[1, 2, 3], 7], null, "no pair"),
        example([[3, 3], 6], [1, 2], "equal halves"),
        example([[4, 1, 5, 9], 6], [2, 3], "unsorted input"),
        hidden("n = 200 000 with one pair, time limit", () => [PAIR_BIG(), 1000000001]),
        hidden("n = 200 000 without a pair, time limit", () => [randomInts(12, BIG, 1, 500000000).map((v) => v * 2), 1000000001]),
      ],
    },
    {
      id: "maximum-subarray-sum", title: "Maximum Subarray Sum", cses: { id: 1643, name: "Maximum Subarray Sum" },
      goal: "Return the largest sum of a non-empty contiguous subarray.",
      concept: "Kadane's rule: at each position either extend the best subarray ending before it or start fresh, whichever is larger.",
      functionName: "maximumSubarraySum", signature: "maximumSubarraySum(values) → number",
      starterSource: starter("maximumSubarraySum", "values", "current = max(v, current + v); best = max(best, current)."),
      solve: maximumSubarraySum, comparator: "scalar",
      reference: book("2.4", "Estimating efficiency · maximum subarray sum"),
      presets: { "CSES sample": { a: [-1, 3, -2, 5, 3, -5, 2, 2] }, "all negative": { a: [-3, -1, -2] }, alternating: { a: [2, -1, 2, -1, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-empty", "The subarray must be non-empty; when every value is negative the answer is the largest value, not 0.", function maximumSubarraySum(values) { let best = 0, current = 0; for (let i = 0; i < values.length; i += 1) { current = Math.max(0, current + values[i]); best = Math.max(best, current); } return best; }),
        diagnosis("sums-positives", "Positive values that are separated by negatives cannot all be taken.", function maximumSubarraySum(values) { let sum = 0; for (let i = 0; i < values.length; i += 1) if (values[i] > 0) sum += values[i]; return sum; }),
      ],
      hints: ["Track the best sum ending at the current position.", "current = max(values[i], current + values[i]).", "The answer is the maximum current seen."],
      cases: [
        example([[-1, 3, -2, 5, 3, -5, 2, 2]], 9, "CSES sample"),
        example([[-3, -1, -2]], -1, "all negative"),
        example([[5]], 5, "single"),
        example([[2, -1, 2, -1, 2]], 4, "alternating"),
        hidden("n = 200 000, time limit", () => [randomInts(13, BIG, -1000000000, 1000000000)]),
      ],
    },
    {
      id: "stick-lengths", title: "Stick Lengths", cses: { id: 1074, name: "Stick Lengths" },
      goal: "Minimum total cost to make every stick the same length, paying |change| per stick.",
      concept: "The sum of absolute deviations is minimised at the median, never at the mean.",
      functionName: "stickLengths", signature: "stickLengths(sticks) → number",
      starterSource: starter("stickLengths", "sticks"),
      solve: stickLengths, comparator: "scalar", brute: stickBrute, small: (round) => [smallList(2800 + round, 1 + (round % 7), 1, 30)],
      reference: book("6.4", "Greedy algorithms · minimizing sums"),
      presets: { "CSES sample": { a: [2, 3, 1, 5, 2] }, "one outlier": { a: [1, 1, 1, 100] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("mean", "The mean minimises squared error; absolute error wants the median.", function stickLengths(sticks) { let sum = 0; for (let i = 0; i < sticks.length; i += 1) sum += sticks[i]; const target = Math.round(sum / sticks.length); let cost = 0; for (let i = 0; i < sticks.length; i += 1) cost += Math.abs(sticks[i] - target); return cost; }),
        diagnosis("shortest", "Cutting everything down to the shortest stick is not optimal.", function stickLengths(sticks) { let shortest = Infinity; for (let i = 0; i < sticks.length; i += 1) shortest = Math.min(shortest, sticks[i]); let cost = 0; for (let i = 0; i < sticks.length; i += 1) cost += sticks[i] - shortest; return cost; }),
      ],
      hints: ["Sort a copy.", "Take the middle element as the target.", "Sum the absolute differences."],
      cases: [
        example([[2, 3, 1, 5, 2]], 5, "CSES sample"),
        example([[1, 1, 1, 100]], 99, "one outlier"),
        example([[7]], 0, "single stick"),
        hidden("n = 200 000, time limit", () => [randomInts(27, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "missing-coin-sum", title: "Missing Coin Sum", cses: { id: 2183, name: "Missing Coin Sum" },
      goal: "The smallest positive sum that cannot be made from any subset of the coins.",
      concept: "Sort the coins. If every sum up to reach is makeable and the next coin is at most reach + 1, every sum up to reach + coin is makeable too.",
      functionName: "missingCoinSum", signature: "missingCoinSum(coins) → number",
      starterSource: starter("missingCoinSum", "coins"),
      solve: missingCoinSum, comparator: "scalar", brute: coinSumBrute, small: (round) => [smallList(2900 + round, 1 + (round % 8), 1, 12)],
      reference: book("6", "Greedy algorithms · invariants"),
      presets: { "CSES sample": { a: [2, 9, 1, 2, 7] }, "starts at one": { a: [1, 1, 1, 1] }, "no one": { a: [2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-sort", "The argument only works on sorted coins.", function missingCoinSum(coins) { let reach = 0; for (let i = 0; i < coins.length; i += 1) { if (coins[i] > reach + 1) break; reach += coins[i]; } return reach + 1; }),
        diagnosis("total-plus-one", "Gaps below the total are missed.", function missingCoinSum(coins) { let sum = 0; for (let i = 0; i < coins.length; i += 1) sum += coins[i]; return sum + 1; }),
      ],
      hints: ["Sort ascending; reach = 0.", "For each coin: if coin > reach + 1, stop; else reach += coin.", "Answer: reach + 1."],
      cases: [
        example([[2, 9, 1, 2, 7]], 6, "CSES sample"),
        example([[1, 1, 1, 1]], 5, "starts at one"),
        example([[2, 3]], 1, "no one"),
        hidden("n = 200 000, time limit", () => [randomInts(28, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "collecting-numbers", title: "Collecting Numbers", cses: { id: 2216, name: "Collecting Numbers" },
      goal: "How many left-to-right passes are needed to collect 1..n in order.",
      concept: "A new pass starts exactly when the next number sits to the left of the previous one: count those descents in the position array.",
      functionName: "collectingNumbers", signature: "collectingNumbers(values) → number",
      starterSource: starter("collectingNumbers", "values", "position[v] = index of value v; rounds = 1 + number of v with position[v] < position[v − 1]."),
      solve: collectingNumbers, comparator: "scalar", brute: collectingBrute, small: (round) => [randomPermutation(3000 + round, 1 + (round % 9))],
      reference: book("6", "Greedy algorithms · position arrays"),
      presets: { "CSES sample": { a: [4, 2, 1, 5, 3] }, sorted: { a: [1, 2, 3, 4, 5] }, reversed: { a: [5, 4, 3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("array-descents", "Descents between neighbouring array cells are not the same as descents between consecutive values.", function collectingNumbers(values) { let rounds = 1; for (let i = 1; i < values.length; i += 1) if (values[i] < values[i - 1]) rounds += 1; return rounds; }),
        diagnosis("always-one", "Only a sorted array takes a single round.", function collectingNumbers(values) { return 1; }),
      ],
      hints: ["Build position[value] = index.", "For v from 2 to n, a descent position[v] < position[v−1] costs one extra round.", "Start from one round."],
      cases: [
        example([[4, 2, 1, 5, 3]], 3, "CSES sample"),
        example([[1, 2, 3, 4, 5]], 1, "sorted"),
        example([[5, 4, 3, 2, 1]], 5, "reversed"),
        hidden("n = 200 000, time limit", () => [randomPermutation(29, BIG)]),
      ],
    },
    {
      id: "collecting-numbers-ii", title: "Collecting Numbers II", cses: { id: 2217, name: "Collecting Numbers II" },
      goal: "After each swap of two positions, the number of rounds needed.",
      concept: "A swap changes at most four adjacent-value pairs: (x−1, x), (x, x+1), (y−1, y), (y, y+1). Subtract their old contribution, swap, add the new one.",
      functionName: "collectingNumbersII", signature: "collectingNumbersII(values, swaps) → array",
      starterSource: starter("collectingNumbersII", "values, swaps", "swaps are 1-based position pairs."),
      solve: collectingNumbersII, comparator: "deep", brute: collectingIIBrute, small: (round) => { const n = 2 + (round % 7); const next = rng(3100 + round); const swaps = []; for (let s = 0; s < 1 + (round % 4); s += 1) swaps.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]); return [randomPermutation(3200 + round, n), swaps]; },
      reference: book("6", "Greedy algorithms · maintaining an invariant under updates"),
      presets: { "CSES sample": { a: [4, 2, 1, 5, 3], b: [[2, 3], [1, 5], [2, 3]] }, "swap same": { a: [3, 1, 2], b: [[1, 1], [2, 3]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("only-two-pairs", "Both values and their successors change; four pairs must be re-evaluated, not two.", function collectingNumbersII(values, swaps) { const n = values.length; const array = values.slice(); const position = new Array(n + 2).fill(-1); for (let i = 0; i < n; i += 1) position[array[i]] = i; const bad = (v) => (v >= 2 && v <= n && position[v] < position[v - 1] ? 1 : 0); let rounds = 1; for (let v = 2; v <= n; v += 1) rounds += bad(v); const out = []; for (let s = 0; s < swaps.length; s += 1) { const a = swaps[s][0] - 1, b = swaps[s][1] - 1; const x = array[a], y = array[b]; const affected = [x, y].filter((v, index, list) => list.indexOf(v) === index); for (let k = 0; k < affected.length; k += 1) rounds -= bad(affected[k]); array[a] = y; array[b] = x; position[y] = a; position[x] = b; for (let k = 0; k < affected.length; k += 1) rounds += bad(affected[k]); out.push(rounds); } return out; }),
        diagnosis("no-swap", "The swap must actually be applied before counting.", function collectingNumbersII(values, swaps) { const rounds = collectingNumbers(values); const out = []; for (let s = 0; s < swaps.length; s += 1) out.push(rounds); return out; }),
      ],
      hints: ["Keep position[] and the current round count.", "For a swap of values x and y, the affected values are x, x+1, y, y+1 (deduplicated).", "Subtract their descents, apply the swap, add them back."],
      cases: [
        example([[4, 2, 1, 5, 3], [[2, 3], [1, 5], [2, 3]]], [2, 3, 4], "CSES sample"),
        example([[3, 1, 2], [[1, 1], [2, 3]]], [2, 3], "swap with itself, then a real swap"),
        example([[1, 2], [[1, 2]]], [2], "two elements"),
        hidden("n = m = 200 000, time limit", () => { const a = randomInts(30, BIG, 1, BIG), b = randomInts(31, BIG, 1, BIG); return [randomPermutation(32, BIG), a.map((v, i) => [v, b[i]])]; }),
      ],
    },
    {
      id: "playlist", title: "Playlist", cses: { id: 1141, name: "Playlist" },
      goal: "Length of the longest stretch of consecutive songs with no repeats.",
      concept: "Two pointers with the last position of each song: when a repeat appears, jump the left edge past its previous occurrence.",
      functionName: "playlist", signature: "playlist(songs) → number",
      starterSource: starter("playlist", "songs"),
      solve: playlist, comparator: "scalar", brute: playlistBrute, small: (round) => [smallList(3300 + round, 1 + (round % 10), 1, 4)],
      reference: book("8.1", "Two pointers method"),
      presets: { "CSES sample": { a: [1, 2, 1, 3, 2, 7, 4, 2] }, "all same": { a: [5, 5, 5] }, "all different": { a: [1, 2, 3, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("restart-at-repeat", "On a repeat the window restarts just after the previous occurrence, not at the current song.", function playlist(songs) { const seen = new Set(); let left = 0, best = 0; for (let right = 0; right < songs.length; right += 1) { if (seen.has(songs[right])) { seen.clear(); left = right; } seen.add(songs[right]); best = Math.max(best, right - left + 1); } return best; }),
        diagnosis("distinct-count", "The number of distinct songs ignores their order.", function playlist(songs) { return new Set(songs).size; }),
      ],
      hints: ["Map each song to the last index where it played.", "If that index is inside the window, move left past it.", "Track the largest window."],
      cases: [
        example([[1, 2, 1, 3, 2, 7, 4, 2]], 5, "CSES sample"),
        example([[5, 5, 5]], 1, "all same"),
        example([[1, 2, 3, 4]], 4, "all different"),
        hidden("n = 200 000, time limit", () => [randomInts(33, BIG, 1, 1000)]),
      ],
    },
    {
      id: "towers", title: "Towers", cses: { id: 1073, name: "Towers" },
      goal: "Minimum number of towers when each cube goes on a tower whose top is strictly larger, or starts a new tower.",
      concept: "Keep the tower tops sorted. Put the cube on the smallest top that is larger than it (upper bound); that top becomes the cube. The array stays sorted.",
      functionName: "towers", signature: "towers(cubes) → number",
      starterSource: starter("towers", "cubes", "tops sorted ascending; index = upperBound(tops, cube); replace tops[index] or push."),
      solve: towers, comparator: "scalar", dependencies: ["upper-bound"], brute: towersBrute, small: (round) => [smallList(3400 + round, 1 + (round % 7), 1, 8)],
      reference: book("6", "Greedy algorithms · patience sorting"),
      presets: { "CSES sample": { a: [3, 8, 2, 1, 5] }, increasing: { a: [1, 2, 3] }, decreasing: { a: [3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-equal", "A cube cannot go on a tower with an equal top; use the first top strictly greater (upper bound).", function towers(cubes) { const tops = []; for (let i = 0; i < cubes.length; i += 1) { const index = lowerBound(tops, cubes[i]); if (index === tops.length) tops.push(cubes[i]); else tops[index] = cubes[i]; } return tops.length; }),
        diagnosis("always-new-tower", "Cubes can be stacked.", function towers(cubes) { return cubes.length; }),
      ],
      hints: ["tops starts empty.", "index = upperBound(tops, cube); if index is the length, push a new tower.", "Otherwise tops[index] = cube."],
      cases: [
        example([[3, 8, 2, 1, 5]], 2, "CSES sample"),
        example([[1, 2, 3]], 3, "increasing"),
        example([[3, 2, 1]], 1, "decreasing"),
        example([[2, 2, 2]], 3, "equal cubes"),
        hidden("n = 200 000, time limit", () => [randomInts(34, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "traffic-lights", title: "Traffic Lights", cses: { id: 1163, name: "Traffic Lights" },
      goal: "After each new traffic light on a street of length x, the longest stretch without lights.",
      concept: "Offline in reverse: with all lights placed, gaps only grow as lights are removed, so a linked list of neighbours and a running maximum answer every step.",
      functionName: "trafficLights", signature: "trafficLights(x, positions) → array",
      starterSource: starter("trafficLights", "x, positions", "Sort positions; linked list prev/next over 0, positions, x; remove in reverse order and keep the max gap."),
      solve: trafficLights, comparator: "deep", brute: trafficBrute, small: (round) => { const next = rng(3500 + round); const count = 1 + (round % 6); const seen = new Set(); const positions = []; while (positions.length < count) { const p = 1 + Math.floor(next() * 19); if (!seen.has(p)) { seen.add(p); positions.push(p); } } return [20, positions]; },
      reference: book("4.2", "Set structures · offline processing"),
      presets: { "CSES sample": { a: 8, b: [3, 6, 2] }, ends: { a: 10, b: [1, 9, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("ignores-ends", "The stretches from 0 to the first light and from the last light to x count too.", function trafficLights(x, positions) { const n = positions.length; const sorted = positions.map((p, i) => [p, i]).sort((p, q) => p[0] - q[0]); const rank = new Array(n); for (let i = 0; i < n; i += 1) rank[sorted[i][1]] = i; const coordinates = sorted.map((entry) => entry[0]); const previous = new Array(n), next = new Array(n); for (let i = 0; i < n; i += 1) { previous[i] = i - 1; next[i] = i + 1; } let longest = 0; for (let i = 0; i + 1 < n; i += 1) longest = Math.max(longest, coordinates[i + 1] - coordinates[i]); const answers = new Array(n); for (let step = n - 1; step >= 0; step -= 1) { answers[step] = longest; const node = rank[step]; const p = previous[node], q = next[node]; if (p >= 0) next[p] = q; if (q < n) previous[q] = p; if (p >= 0 && q < n) longest = Math.max(longest, coordinates[q] - coordinates[p]); } return answers; }),
        diagnosis("merged-gap-only", "The answer is the longest of all gaps, not just the gap that the last light split.", function trafficLights(x, positions) { const n = positions.length; const sorted = positions.map((p, i) => [p, i]).sort((p, q) => p[0] - q[0]); const rank = new Array(n); for (let i = 0; i < n; i += 1) rank[sorted[i][1]] = i; const coordinates = [0].concat(sorted.map((entry) => entry[0]), [x]); const previous = new Array(n + 2), next = new Array(n + 2); for (let i = 0; i <= n + 1; i += 1) { previous[i] = i - 1; next[i] = i + 1; } const answers = new Array(n); for (let step = n - 1; step >= 0; step -= 1) { const node = rank[step] + 1; const p = previous[node], q = next[node]; answers[step] = Math.max(coordinates[node] - coordinates[p], coordinates[q] - coordinates[node]); next[p] = q; previous[q] = p; } return answers; }),
      ],
      hints: ["Sort all positions once and remember each light's rank.", "Build prev/next links over 0, the sorted lights, and x; the longest gap now is the last answer.", "Remove lights in reverse order: unlink, take the merged gap into the running maximum, record it."],
      cases: [
        example([8, [3, 6, 2]], [5, 3, 3], "CSES sample"),
        example([10, [1, 9, 5]], [9, 8, 4], "ends"),
        example([5, [2]], [3], "single light"),
        hidden("n = 200 000, time limit", () => [1000000000, randomPermutation(35, BIG).map((v) => v * 4999)]),
      ],
    },
    {
      id: "distinct-values-subarrays", title: "Distinct Values Subarrays", cses: { id: 3420, name: "Distinct Values Subarrays" },
      goal: "Count the subarrays whose values are all distinct.",
      concept: "Two pointers: for every right end, shrink the left end until the newest value is unique; every left position in the window then gives a valid subarray.",
      functionName: "distinctValuesSubarrays", signature: "distinctValuesSubarrays(values) → number",
      starterSource: starter("distinctValuesSubarrays", "values"),
      solve: distinctValuesSubarrays, comparator: "scalar", brute: distinctSubarraysBrute, small: (round) => [smallList(3600 + round, 1 + (round % 9), 1, 4)],
      reference: book("8.1", "Two pointers method"),
      presets: { "CSES sample": { a: [1, 2, 1, 3] }, "all same": { a: [2, 2, 2] }, "all distinct": { a: [1, 2, 3, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("never-shrinks", "The left end must move past the earlier copy of a repeated value.", function distinctValuesSubarrays(values) { let total = 0; for (let right = 0; right < values.length; right += 1) total += right + 1; return total; }),
        diagnosis("off-by-one", "A window from left to right holds right − left + 1 subarrays ending at right.", function distinctValuesSubarrays(values) { const counts = new Map(); let left = 0, total = 0; for (let right = 0; right < values.length; right += 1) { counts.set(values[right], (counts.get(values[right]) || 0) + 1); while (counts.get(values[right]) > 1) { counts.set(values[left], counts.get(values[left]) - 1); left += 1; } total += right - left; } return total; }),
      ],
      hints: ["Count occurrences inside the window.", "While the newest value occurs twice, drop values from the left.", "Add right − left + 1."],
      cases: [
        example([[1, 2, 1, 3]], 8, "CSES sample"),
        example([[2, 2, 2]], 3, "all same"),
        example([[1, 2, 3, 4]], 10, "all distinct"),
        hidden("n = 200 000, time limit", () => [randomInts(36, BIG, 1, 100000)]),
      ],
    },
    {
      id: "distinct-values-subsequences", title: "Distinct Values Subsequences", cses: { id: 3421, name: "Distinct Values Subsequences" },
      goal: "Count the non-empty subsequences whose values are all distinct, modulo 10⁹ + 7.",
      concept: "Each distinct value is either absent or taken from one of its copies: multiply (count + 1) over the values and subtract the empty choice. The product needs overflow-safe multiplication.",
      functionName: "distinctValuesSubsequences", signature: "distinctValuesSubsequences(values) → number",
      starterSource: starter("distinctValuesSubsequences", "values", "Multiply (count + 1) mod 1e9+7 with a split multiply so no product exceeds 2⁵³; subtract 1."),
      solve: distinctValuesSubsequences, comparator: "scalar", brute: distinctSubsequencesBrute, small: (round) => [smallList(3700 + round, 1 + (round % 11), 1, 4)],
      reference: book("1.4", "Modular arithmetic · products"),
      presets: { "CSES sample": { a: [1, 2, 1, 3] }, "all same": { a: [7, 7, 7] }, "all distinct": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("counts-empty", "The empty subsequence is not counted; subtract one.", function distinctValuesSubsequences(values) { const counts = new Map(); for (let i = 0; i < values.length; i += 1) counts.set(values[i], (counts.get(values[i]) || 0) + 1); let product = 1; counts.forEach((count) => { const factor = (count + 1) % 1000000007; const hi = Math.floor(factor / 65536), lo = factor % 65536; product = ((product * hi % 1000000007) * 65536 + product * lo) % 1000000007; }); return product; }),
        diagnosis("sums-not-products", "Choices for different values multiply, they do not add.", function distinctValuesSubsequences(values) { const counts = new Map(); for (let i = 0; i < values.length; i += 1) counts.set(values[i], (counts.get(values[i]) || 0) + 1); let sum = 0; counts.forEach((count) => { sum = (sum + count) % 1000000007; }); return sum; }),
      ],
      hints: ["Count each distinct value.", "Answer = Π (count + 1) − 1.", "Multiply modulo 10⁹ + 7 by splitting one factor into 16-bit halves."],
      cases: [
        example([[1, 2, 1, 3]], 11, "CSES sample"),
        example([[7, 7, 7]], 3, "all same"),
        example([[1, 2, 3]], 7, "all distinct"),
        hidden("n = 200 000, time limit", () => [randomInts(37, BIG, 1, 50000)]),
      ],
    },
    {
      id: "josephus-problem-i", title: "Josephus Problem I", cses: { id: 2162, name: "Josephus Problem I" },
      goal: "Children 1..n stand in a circle; every second child is removed. Return the removal order.",
      concept: "A queue simulates the circle: move the skipped child to the back, remove the next. Linear time because every child is touched at most twice per round.",
      functionName: "josephusProblemI", signature: "josephusProblemI(n) → array",
      starterSource: starter("josephusProblemI", "n"),
      solve: josephusProblemI, comparator: "deep", brute: (n) => josephusBrute(n, 1), small: (round) => [1 + (round % 12)],
      reference: book("4.5", "Other structures · deque"),
      scene: { kind: "algo", view: "bars", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("removes-first", "The first child is skipped, the second removed.", function josephusProblemI(n) { const queue = []; for (let i = 1; i <= n; i += 1) queue.push(i); const out = []; let head = 0; while (out.length < n) { out.push(queue[head]); head += 1; if (head < queue.length) { queue.push(queue[head]); head += 1; } } return out; }),
        diagnosis("single-pass", "Removal continues around the circle until nobody is left.", function josephusProblemI(n) { const out = []; for (let i = 2; i <= n; i += 2) out.push(i); return out; }),
      ],
      hints: ["Queue with 1..n and a head pointer.", "Push the child at the head to the back, then output the next child.", "Repeat until n children are out."],
      cases: [
        example([7], [2, 4, 6, 1, 5, 3, 7], "CSES sample"),
        example([1], [1], "single child"),
        example([4], [2, 4, 3, 1], "four"),
        hidden("n = 200 000, time limit", () => [BIG]),
      ],
    },
    {
      id: "josephus-problem-ii", title: "Josephus Problem II", cses: { id: 2163, name: "Josephus Problem II" },
      goal: "Every (k + 1)-th remaining child is removed; return the removal order.",
      concept: "Order statistics on a shrinking set: a Fenwick tree of ones lets you find the k-th remaining child and remove it in O(log n).",
      functionName: "josephusProblemII", signature: "josephusProblemII(n, k) → array",
      starterSource: starter("josephusProblemII", "n, k", "index = (index + k) % remaining; child = fenwickKth(tree, index + 1); remove."),
      solve: josephusProblemII, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix", "fenwick-kth"], brute: josephusBrute, small: (round) => [1 + (round % 9), round % 5],
      reference: book("9.2", "Binary indexed tree · finding the k-th element"),
      scene: { kind: "algo", view: "bars", handles: [
        { id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 12 },
        { id: "k", type: "slider", label: "k (rounded)", value: 2, min: 0, max: 6 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("skips-one-less", "k children are skipped, so the removed one is index + k, not index + k − 1.", function josephusProblemII(n, k) { const tree = new Array(n + 1).fill(0); for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1); const out = []; let index = 0; for (let remaining = n; remaining >= 1; remaining -= 1) { index = (index + Math.max(0, k - 1)) % remaining; const position = fenwickKth(tree, index + 1); out.push(position); fenwickAdd(tree, position, -1); } return out; }),
        diagnosis("index-not-reduced", "After a removal the index refers to the remaining children; take it modulo the remaining count.", function josephusProblemII(n, k) { const tree = new Array(n + 1).fill(0); for (let i = 1; i <= n; i += 1) fenwickAdd(tree, i, 1); const out = []; let index = 0; for (let remaining = n; remaining >= 1; remaining -= 1) { index = (index + k) % n; const position = fenwickKth(tree, (index % remaining) + 1); out.push(position); fenwickAdd(tree, position, -1); } return out; }),
      ],
      hints: ["Fenwick tree with a 1 for every child.", "index = (index + k) % remaining; the child is the (index + 1)-th remaining.", "Remove it with fenwickAdd(tree, child, −1)."],
      cases: [
        example([7, 2], [3, 6, 2, 7, 5, 1, 4], "CSES sample"),
        example([5, 0], [1, 2, 3, 4, 5], "k = 0 removes in order"),
        example([4, 1], [2, 4, 3, 1], "k = 1 is Josephus I"),
        hidden("n = 200 000, time limit", () => [BIG, 12345]),
      ],
    },
    {
      id: "nested-ranges-check", title: "Nested Ranges Check", cses: { id: 2168, name: "Nested Ranges Check" },
      goal: "For each range, whether it contains some other range and whether some other range contains it.",
      concept: "Sort by start ascending and end descending; then a range contains a later one iff a later end is not larger, and is contained by an earlier one iff an earlier end is not smaller. Two sweeps with a running min and max.",
      functionName: "nestedRangesCheck", signature: "nestedRangesCheck(ranges) → { contains, contained }",
      starterSource: starter("nestedRangesCheck", "ranges", "ranges are [x, y]; results are arrays of 0/1 in input order."),
      solve: nestedRangesCheck, comparator: "deep", brute: nestedCheckBrute, small: (round) => [distinctPairs(3800 + round, 1 + (round % 7), 1, 9)],
      reference: book("30", "Sweep line algorithms"),
      presets: { "CSES sample": { a: [[1, 6], [2, 4], [4, 8], [3, 6]] }, disjoint: { a: [[1, 2], [3, 4], [5, 6]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ties-ascending", "Ranges sharing a start must be ordered by end descending, so the larger one comes first.", function nestedRangesCheck(ranges) { const n = ranges.length; const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[p][1] - ranges[q][1]); const contains = new Array(n).fill(0), contained = new Array(n).fill(0); let minY = Infinity; for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; if (minY <= ranges[id][1]) contains[id] = 1; minY = Math.min(minY, ranges[id][1]); } let maxY = -Infinity; for (let i = 0; i < n; i += 1) { const id = order[i]; if (maxY >= ranges[id][1]) contained[id] = 1; maxY = Math.max(maxY, ranges[id][1]); } return { contains, contained }; }),
        diagnosis("swapped", "The two answers were swapped.", function nestedRangesCheck(ranges) { const result = (function () { const n = ranges.length; const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[q][1] - ranges[p][1]); const contains = new Array(n).fill(0), contained = new Array(n).fill(0); let minY = Infinity; for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; if (minY <= ranges[id][1]) contains[id] = 1; minY = Math.min(minY, ranges[id][1]); } let maxY = -Infinity; for (let i = 0; i < n; i += 1) { const id = order[i]; if (maxY >= ranges[id][1]) contained[id] = 1; maxY = Math.max(maxY, ranges[id][1]); } return { contains, contained }; })(); return { contains: result.contained, contained: result.contains }; }),
      ],
      hints: ["Sort indexes by (x ascending, y descending).", "Sweep from the right with the minimum end seen: a range contains something if that minimum ≤ its end.", "Sweep from the left with the maximum end seen: a range is contained if that maximum ≥ its end."],
      cases: [
        example([[[1, 6], [2, 4], [4, 8], [3, 6]]], { contains: [1, 0, 0, 0], contained: [0, 1, 0, 1] }, "CSES sample"),
        example([[[1, 2], [3, 4], [5, 6]]], { contains: [0, 0, 0], contained: [0, 0, 0] }, "disjoint"),
        example([[[1, 9], [1, 5], [1, 3]]], { contains: [1, 1, 0], contained: [0, 1, 1] }, "shared start"),
        hidden("n = 200 000, time limit", () => [distinctPairs(38, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "nested-ranges-count", title: "Nested Ranges Count", cses: { id: 2169, name: "Nested Ranges Count" },
      goal: "For each range, how many other ranges it contains and how many contain it.",
      concept: "Same sweep as the check, but counting: a Fenwick tree over compressed end coordinates answers 'how many ends so far are ≤ mine' in O(log n).",
      functionName: "nestedRangesCount", signature: "nestedRangesCount(ranges) → { contains, contained }",
      starterSource: starter("nestedRangesCount", "ranges", "Sort by (x asc, y desc); compress y; sweep right-to-left with prefix(rank(y)) for contains, left-to-right with i − prefix(rank(y) − 1) for contained."),
      solve: nestedRangesCount, comparator: "deep", dependencies: ["lower-bound", "fenwick-add", "fenwick-prefix"], brute: nestedCountBrute, small: (round) => [distinctPairs(3900 + round, 1 + (round % 7), 1, 9)],
      reference: book("9.2", "Binary indexed tree · offline counting"),
      presets: { "CSES sample": { a: [[1, 6], [2, 4], [4, 8], [3, 6]] }, nested: { a: [[1, 9], [2, 8], [3, 7]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("excludes-equal-ends", "A later range with the same end is still contained; count ends ≤ y, not < y.", function nestedRangesCount(ranges) { const n = ranges.length; const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[q][1] - ranges[p][1]); const ys = ranges.map((range) => range[1]).sort((p, q) => p - q); const distinct = ys.filter((y, i) => i === 0 || y !== ys[i - 1]); const rankOf = (y) => lowerBound(distinct, y) + 1; const contains = new Array(n).fill(0), contained = new Array(n).fill(0); let tree = new Array(distinct.length + 1).fill(0); for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; contains[id] = fenwickPrefix(tree, rankOf(ranges[id][1]) - 1); fenwickAdd(tree, rankOf(ranges[id][1]), 1); } tree = new Array(distinct.length + 1).fill(0); for (let i = 0; i < n; i += 1) { const id = order[i]; contained[id] = i - fenwickPrefix(tree, rankOf(ranges[id][1])); fenwickAdd(tree, rankOf(ranges[id][1]), 1); } return { contains, contained }; }),
        diagnosis("swapped", "The two answers were swapped.", function nestedRangesCount(ranges) { const result = (function () { const n = ranges.length; const order = ranges.map((range, index) => index).sort((p, q) => ranges[p][0] - ranges[q][0] || ranges[q][1] - ranges[p][1]); const ys = ranges.map((range) => range[1]).sort((p, q) => p - q); const distinct = ys.filter((y, i) => i === 0 || y !== ys[i - 1]); const rankOf = (y) => lowerBound(distinct, y) + 1; const contains = new Array(n).fill(0), contained = new Array(n).fill(0); let tree = new Array(distinct.length + 1).fill(0); for (let i = n - 1; i >= 0; i -= 1) { const id = order[i]; contains[id] = fenwickPrefix(tree, rankOf(ranges[id][1])); fenwickAdd(tree, rankOf(ranges[id][1]), 1); } tree = new Array(distinct.length + 1).fill(0); for (let i = 0; i < n; i += 1) { const id = order[i]; contained[id] = i - fenwickPrefix(tree, rankOf(ranges[id][1]) - 1); fenwickAdd(tree, rankOf(ranges[id][1]), 1); } return { contains, contained }; })(); return { contains: result.contained, contained: result.contains }; }),
      ],
      hints: ["Same order as the check; compress the ends with lowerBound over the sorted distinct ends.", "Right-to-left: contains = prefix(rank(y)) before inserting y.", "Left-to-right: contained = (inserted so far) − prefix(rank(y) − 1)."],
      cases: [
        example([[[1, 6], [2, 4], [4, 8], [3, 6]]], { contains: [2, 0, 0, 0], contained: [0, 1, 0, 1] }, "CSES sample"),
        example([[[1, 9], [2, 8], [3, 7]]], { contains: [2, 1, 0], contained: [0, 1, 2] }, "nested"),
        example([[[1, 5], [2, 5], [3, 5]]], { contains: [2, 1, 0], contained: [0, 1, 2] }, "shared ends"),
        hidden("n = 200 000, time limit", () => [distinctPairs(39, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "heap-push", title: "Heap Push", cses: { id: 1164, name: "Room Allocation (brick)" },
      goal: "Append an item to a binary min-heap array and sift it up. Items are [key, value]; the heap is modified in place and returned.",
      concept: "JavaScript has no priority queue, so greedy scheduling and Dijkstra need one you wrote. The array form: children of i are 2i + 1 and 2i + 2.",
      functionName: "heapPush", signature: "heapPush(heap, item) → heap",
      starterSource: starter("heapPush", "heap, item", "Push, then while the parent's key is larger, swap upward."),
      solve: heapPush, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "small heap": { a: [[1, 10], [3, 20], [2, 30]] }, empty: { a: [] }, chain: { a: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]] } },
      scene: { kind: "algo", view: "heap", handles: preset([{ id: "key", type: "slider", label: "key to push (rounded)", value: 0, min: 0, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "pushItem" }] },
      diagnoses: [
        diagnosis("no-sift", "Appending alone breaks the heap order; swap the item upward while its parent has a larger key.", function heapPush(heap, item) { heap.push(item); return heap; }),
        diagnosis("wrong-parent-index", "The parent of index i is (i − 1) >> 1, not i >> 1.", function heapPush(heap, item) { heap.push(item); let index = heap.length - 1; while (index > 0) { const parent = index >> 1; if (heap[parent][0] <= heap[index][0]) break; const swap = heap[parent]; heap[parent] = heap[index]; heap[index] = swap; index = parent; } return heap; }),
      ],
      hints: ["heap.push(item); index = heap.length − 1.", "parent = (index − 1) >> 1; stop when heap[parent][0] <= heap[index][0].", "Otherwise swap and continue from the parent."],
      cases: [
        example([[[1, 10], [3, 20], [2, 30]], [0, 40]], [[0, 40], [1, 10], [2, 30], [3, 20]], "new minimum"),
        example([[], [5, 1]], [[5, 1]], "empty heap"),
        example([[[1, 10], [3, 20], [2, 30]], [9, 40]], [[1, 10], [3, 20], [2, 30], [9, 40]], "stays at the end"),
        example([[[1, 10], [3, 20], [2, 30]], [2, 40]], [[1, 10], [2, 40], [2, 30], [3, 20]], "one swap"),
        example([[[2, 10], [3, 20]], [1, 30]], [[1, 30], [3, 20], [2, 10]], "lands at index 2"),
      ],
    },
    {
      id: "heap-pop", title: "Heap Pop", cses: { id: 1164, name: "Room Allocation (brick)" },
      goal: "Remove the minimum item: move the last item to the root and sift it down. Return { item, heap }.",
      concept: "Sift down picks the smaller child each step, so the root is always the minimum afterwards.",
      functionName: "heapPop", signature: "heapPop(heap) → { item, heap }",
      starterSource: starter("heapPop", "heap", "Empty heap → { item: null, heap }."),
      solve: heapPop, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      presets: { "small heap": { a: [[0, 40], [1, 10], [2, 30], [3, 20]] }, "two items": { a: [[1, 10], [2, 20]] }, chain: { a: [[1, 1], [5, 2], [2, 3], [6, 4], [7, 5]] } },
      scene: { kind: "algo", view: "heap", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("pops-last", "The minimum is at index 0, not at the end.", function heapPop(heap) { if (heap.length === 0) return { item: null, heap }; const item = heap.pop(); return { item, heap }; }),
        diagnosis("no-sift-down", "After moving the last item to the root it must sift down.", function heapPop(heap) { if (heap.length === 0) return { item: null, heap }; const item = heap[0]; const last = heap.pop(); if (heap.length > 0) heap[0] = last; return { item, heap }; }),
      ],
      hints: ["Remember heap[0]; pop the last item; if the heap is not empty put it at index 0.", "At index i compare with children 2i + 1 and 2i + 2; swap with the smaller if it is smaller than you.", "Stop when neither child is smaller."],
      cases: [
        example([[[0, 40], [1, 10], [2, 30], [3, 20]]], { item: [0, 40], heap: [[1, 10], [3, 20], [2, 30]] }, "sift down left"),
        example([[[1, 10], [2, 20]]], { item: [1, 10], heap: [[2, 20]] }, "two items"),
        example([[]], { item: null, heap: [] }, "empty"),
        example([[[1, 1], [5, 2], [2, 3], [6, 4], [7, 5]]], { item: [1, 1], heap: [[2, 3], [5, 2], [7, 5], [6, 4]] }, "sift down right"),
      ],
    },
    {
      id: "room-allocation", title: "Room Allocation", cses: { id: 1164, name: "Room Allocation" },
      goal: "Fewest rooms for customers with arrival and departure days, and a room for each customer; a room is reused only if the previous guest departs strictly before the new arrival.",
      concept: "Sort by arrival; keep departures in a min-heap. If the earliest departure is before this arrival, reuse that room; otherwise open a new one.",
      functionName: "roomAllocation", signature: "roomAllocation(customers) → { rooms, assignment }",
      starterSource: starter("roomAllocation", "customers", "customers are [arrival, departure]; heap items are [departure, room]."),
      solve: roomAllocation, comparator: "deep", dependencies: ["heap-push", "heap-pop"], check: roomCheck, small: (round) => [pairsList(4000 + round, 1 + (round % 7), 1, 12)],
      reference: book("6.1", "Greedy algorithms · scheduling with a priority queue"),
      presets: { "CSES sample": { a: [[1, 2], [2, 4], [4, 4]] }, "all overlap": { a: [[1, 5], [2, 6], [3, 7]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("same-day-reuse", "A room whose guest departs on the arrival day cannot be reused that day.", function roomAllocation(customers) { const order = customers.map((c, index) => index).sort((p, q) => customers[p][0] - customers[q][0] || customers[p][1] - customers[q][1]); const assignment = new Array(customers.length).fill(0); const heap = []; let rooms = 0; for (let i = 0; i < order.length; i += 1) { const id = order[i]; if (heap.length && heap[0][0] <= customers[id][0]) { const freed = heapPop(heap).item; assignment[id] = freed[1]; } else { rooms += 1; assignment[id] = rooms; } heapPush(heap, [customers[id][1], assignment[id]]); } return { rooms, assignment }; }),
        diagnosis("new-room-each", "Rooms can be reused after a departure.", function roomAllocation(customers) { return { rooms: customers.length, assignment: customers.map((c, index) => index + 1) }; }),
      ],
      hints: ["Sort customers by arrival, keeping their original index.", "Heap of [departure, room]; reuse when heap[0][0] < arrival.", "Push the new [departure, room] after assigning."],
      cases: [
        example([[[1, 2], [2, 4], [4, 4]]], { rooms: 2, assignment: [1, 2, 1] }, "CSES sample"),
        example([[[1, 5], [2, 6], [3, 7]]], { rooms: 3, assignment: [1, 2, 3] }, "all overlap"),
        example([[[1, 1], [2, 2], [3, 3]]], { rooms: 1, assignment: [1, 1, 1] }, "one after another"),
        hidden("n = 200 000, time limit", () => [pairsList(40, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "factory-machines", title: "Factory Machines", cses: { id: 1620, name: "Factory Machines" },
      goal: "Minimum time for machines with per-product times to make t products together, as a decimal string.",
      concept: "Binary search on the answer: for a candidate time T, Σ floor(T / kᵢ) products get made, and that count grows with T. The answer can reach 10¹⁸, so use BigInt for the search.",
      functionName: "factoryMachines", signature: "factoryMachines(times, products) → string",
      starterSource: starter("factoryMachines", "times, products", "lo = 0, hi = min(times) × products as BigInt; while lo < hi: mid; count products; move lo or hi."),
      solve: factoryMachines, comparator: "deep", brute: factoryBrute, small: (round) => { const next = rng(4100 + round); return [smallList(4200 + round, 1 + Math.floor(next() * 4), 1, 6), 1 + Math.floor(next() * 12)]; },
      reference: book("3.3", "Binary search · finding the smallest solution"),
      presets: { "CSES sample": { a: [3, 2, 5], b: 7 }, "one machine": { a: [4], b: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("fastest-only", "All machines work in parallel; the fastest alone is a pessimistic bound.", function factoryMachines(times, products) { let fastest = times[0]; for (let i = 1; i < times.length; i += 1) if (times[i] < fastest) fastest = times[i]; return (BigInt(fastest) * BigInt(products)).toString(); }),
        diagnosis("off-by-one", "The loop leaves lo at the smallest feasible time; do not subtract one.", function factoryMachines(times, products) { let fastest = times[0]; for (let i = 1; i < times.length; i += 1) if (times[i] < fastest) fastest = times[i]; let lo = 0n, hi = BigInt(fastest) * BigInt(products); while (lo < hi) { const mid = (lo + hi) / 2n; const t = Number(mid); let made = 0; for (let i = 0; i < times.length && made < products; i += 1) made += Math.floor(t / times[i]); if (made >= products) hi = mid; else lo = mid + 1n; } return (lo - 1n).toString(); }),
      ],
      hints: ["Feasibility of T: Σ floor(T / kᵢ) ≥ t; stop summing once it reaches t.", "Binary search the smallest feasible T between 0 and min(k) × t.", "Keep the bounds as BigInt and return a string."],
      cases: [
        example([[3, 2, 5], 7], "8", "CSES sample"),
        example([[4], 3], "12", "one machine"),
        example([[1, 1], 1], "1", "instant"),
        hidden("n = 200 000, t = 10⁹, time limit", () => [randomInts(41, BIG, 1, 1000000000), 1000000000]),
      ],
    },
    {
      id: "tasks-and-deadlines", title: "Tasks and Deadlines", cses: { id: 1630, name: "Tasks and Deadlines" },
      goal: "Order the tasks to maximise the total of (deadline − finishing time).",
      concept: "Deadlines cancel out of the ordering decision; only the sum of finishing times matters, and shortest-first minimises it.",
      functionName: "tasksAndDeadlines", signature: "tasksAndDeadlines(tasks) → number",
      starterSource: starter("tasksAndDeadlines", "tasks", "tasks are [duration, deadline]."),
      solve: tasksAndDeadlines, comparator: "scalar", brute: deadlinesBrute, small: (round) => [pairsList(4300 + round, 1 + (round % 6), 1, 15)],
      reference: book("6.3", "Greedy algorithms · tasks and deadlines"),
      presets: { "CSES sample": { a: [[6, 10], [8, 15], [5, 12]] }, "equal durations": { a: [[3, 5], [3, 9]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("sort-by-deadline", "Earliest deadline first is not optimal here; the deadlines do not affect the order.", function tasksAndDeadlines(tasks) { const order = tasks.slice().sort((p, q) => p[1] - q[1]); let time = 0, reward = 0; for (let i = 0; i < order.length; i += 1) { time += order[i][0]; reward += order[i][1] - time; } return reward; }),
        diagnosis("input-order", "The tasks must be reordered by duration.", function tasksAndDeadlines(tasks) { let time = 0, reward = 0; for (let i = 0; i < tasks.length; i += 1) { time += tasks[i][0]; reward += tasks[i][1] - time; } return reward; }),
      ],
      hints: ["Sort by duration ascending.", "Run them in that order, tracking the finishing time.", "Add deadline − finishing time for each."],
      cases: [
        example([[[6, 10], [8, 15], [5, 12]]], 2, "CSES sample"),
        example([[[3, 5], [3, 9]]], 5, "equal durations"),
        example([[[1, 1]]], 0, "single task"),
        hidden("n = 200 000, time limit", () => [pairsList(42, BIG, 1, 1000000)]),
      ],
    },
    {
      id: "reading-books", title: "Reading Books", cses: { id: 1631, name: "Reading Books" },
      goal: "Minimum time for two people to both read every book, never sharing a book at the same time.",
      concept: "Either the total reading time is the bottleneck, or one huge book is: whoever reads it second must wait for it. The answer is max(sum, 2 × longest).",
      functionName: "readingBooks", signature: "readingBooks(times) → number",
      starterSource: starter("readingBooks", "times"),
      solve: readingBooks, comparator: "scalar",
      reference: book("6", "Greedy algorithms · lower bounds"),
      presets: { "CSES sample": { a: [2, 8, 3] }, balanced: { a: [4, 4, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("sum-only", "A single long book forces one reader to wait; the answer is at least twice its length.", function readingBooks(times) { let sum = 0; for (let i = 0; i < times.length; i += 1) sum += times[i]; return sum; }),
        diagnosis("longest-only", "When no book dominates, the total time is the bottleneck.", function readingBooks(times) { let longest = 0; for (let i = 0; i < times.length; i += 1) if (times[i] > longest) longest = times[i]; return 2 * longest; }),
      ],
      hints: ["Compute the sum and the maximum.", "Answer = max(sum, 2 × maximum).", "That is all."],
      cases: [
        example([[2, 8, 3]], 16, "CSES sample"),
        example([[4, 4, 4]], 12, "balanced"),
        example([[5]], 10, "single book"),
        hidden("n = 200 000, time limit", () => [randomInts(43, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "sum-of-three-values", title: "Sum of Three Values", cses: { id: 1641, name: "Sum of Three Values" },
      goal: "Three distinct positions whose values add to the target, ascending, or null. This lab fixes the first index in value order and runs two pointers on the rest, returning the first triple found.",
      concept: "Fix one element, then 2SUM on the remainder with two pointers: O(n²) instead of O(n³).",
      functionName: "sumOfThreeValues", signature: "sumOfThreeValues(values, target) → [i, j, k] or null",
      starterSource: starter("sumOfThreeValues", "values, target", "Sort indexes by value; for each i, lo = i + 1, hi = n − 1; return original positions + 1, sorted."),
      solve: sumOfThreeValues, comparator: "deep", check: threeCheck, small: (round) => { const next = rng(4400 + round); return [smallList(4500 + round, 3 + Math.floor(next() * 5), 1, 9), 3 + Math.floor(next() * 20)]; },
      reference: book("8.1", "Two pointers method · 3SUM"),
      presets: { "CSES sample": { a: [2, 7, 5, 1] }, "no triple": { a: [1, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "target", type: "slider", label: "target (rounded)", value: 8, min: 3, max: 25 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("zero-based", "CSES positions are 1-based.", function sumOfThreeValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); const n = order.length; for (let i = 0; i < n; i += 1) { let lo = i + 1, hi = n - 1; while (lo < hi) { const sum = values[order[i]] + values[order[lo]] + values[order[hi]]; if (sum === target) return [order[i], order[lo], order[hi]].sort((p, q) => p - q); if (sum < target) lo += 1; else hi -= 1; } } return null; }),
        diagnosis("reuses-index", "The three positions must be distinct; start the two pointers after i.", function sumOfThreeValues(values, target) { const order = values.map((value, index) => index).sort((p, q) => values[p] - values[q] || p - q); const n = order.length; for (let i = 0; i < n; i += 1) { let lo = i, hi = n - 1; while (lo < hi) { const sum = values[order[i]] + values[order[lo]] + values[order[hi]]; if (sum === target) return [order[i] + 1, order[lo] + 1, order[hi] + 1].sort((p, q) => p - q); if (sum < target) lo += 1; else hi -= 1; } } return null; }),
      ],
      hints: ["Sort an index array by value.", "For each i, two pointers lo = i + 1 and hi = n − 1 on the sum of three.", "Return the original positions + 1 in ascending order."],
      cases: [
        example([[2, 7, 5, 1], 8], [1, 3, 4], "CSES sample"),
        example([[1, 1, 1, 1], 10], null, "no triple"),
        example([[3, 3, 3], 9], [1, 2, 3], "all equal"),
        hidden("n = 5000 without a triple, time limit", () => [randomInts(44, 5000, 1, 100000000).map((v) => v * 3), 1000000000]),
      ],
    },
    {
      id: "sum-of-four-values", title: "Sum of Four Values", cses: { id: 1642, name: "Sum of Four Values" },
      goal: "Four distinct positions whose values add to the target, ascending, or null. This lab sweeps pairs (c, d) and looks the missing pair sum up among earlier pairs, returning the first hit.",
      concept: "Hash the sums of pairs that end before c: O(n²) lookups instead of O(n⁴).",
      functionName: "sumOfFourValues", signature: "sumOfFourValues(values, target) → [a, b, c, d] or null",
      starterSource: starter("sumOfFourValues", "values, target", "For c from 0: for d > c look up target − v[c] − v[d] in a map of pair sums; then add every pair (b, c) with b < c to the map."),
      solve: sumOfFourValues, comparator: "deep", check: fourCheck, small: (round) => { const next = rng(4600 + round); return [smallList(4700 + round, 4 + Math.floor(next() * 4), 1, 6), 4 + Math.floor(next() * 20)]; },
      reference: book("8.1", "Two pointers method · 4SUM"),
      presets: { "CSES sample": { a: [3, 2, 7, 8, 1, 1, 10, 5] }, "no quadruple": { a: [1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "target", type: "slider", label: "target (rounded)", value: 15, min: 4, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("zero-based", "CSES positions are 1-based.", function sumOfFourValues(values, target) { const n = values.length; const seen = new Map(); for (let c = 0; c < n; c += 1) { for (let d = c + 1; d < n; d += 1) { const pair = seen.get(target - values[c] - values[d]); if (pair) return [pair[0], pair[1], c, d].sort((p, q) => p - q); } for (let b = 0; b < c; b += 1) { const sum = values[b] + values[c]; if (!seen.has(sum)) seen.set(sum, [b, c]); } } return null; }),
        diagnosis("overlapping-pairs", "Pairs added to the map must end before c, or an index can be used twice.", function sumOfFourValues(values, target) { const n = values.length; const seen = new Map(); for (let b = 0; b < n; b += 1) for (let c = b + 1; c < n; c += 1) { const sum = values[b] + values[c]; if (!seen.has(sum)) seen.set(sum, [b, c]); } for (let c = 0; c < n; c += 1) { for (let d = c + 1; d < n; d += 1) { const pair = seen.get(target - values[c] - values[d]); if (pair) return [pair[0] + 1, pair[1] + 1, c + 1, d + 1].sort((p, q) => p - q); } } return null; }),
      ],
      hints: ["Map from pair sum to one pair of indexes, filled only with pairs ending before the current c.", "For each (c, d) with d > c, look up target − v[c] − v[d].", "Return the four positions + 1 sorted."],
      cases: [
        run(sumOfFourValues, [[3, 2, 7, 8, 1, 1, 10, 5], 15], "CSES sample (first hit)"),
        example([[1, 1, 1, 1, 1], 10], null, "no quadruple"),
        example([[2, 2, 2, 2], 8], [1, 2, 3, 4], "all equal"),
        hidden("n = 1000 with one quadruple, time limit", () => [FOUR_BIG(), 1000000000]),
      ],
    },
    {
      id: "nearest-smaller-values", title: "Nearest Smaller Values", cses: { id: 1645, name: "Nearest Smaller Values" },
      goal: "For each position, the nearest position to its left with a strictly smaller value, or 0.",
      concept: "A monotonic stack: pop everything not smaller than the current value; what remains on top is the answer, then push the current index.",
      functionName: "nearestSmallerValues", signature: "nearestSmallerValues(values) → array of positions",
      starterSource: starter("nearestSmallerValues", "values"),
      solve: nearestSmallerValues, comparator: "deep", brute: smallerBrute, small: (round) => [smallList(4800 + round, 1 + (round % 9), 1, 6)],
      reference: book("8.2", "Nearest smaller elements"),
      presets: { "CSES sample": { a: [2, 5, 1, 4, 8, 3, 2, 5] }, increasing: { a: [1, 2, 3, 4] }, decreasing: { a: [4, 3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-equal", "Equal values do not count as smaller; pop them too.", function nearestSmallerValues(values) { const stack = []; const out = []; for (let i = 0; i < values.length; i += 1) { while (stack.length && values[stack[stack.length - 1]] > values[i]) stack.pop(); out.push(stack.length ? stack[stack.length - 1] + 1 : 0); stack.push(i); } return out; }),
        diagnosis("previous-index", "The previous position is not necessarily smaller.", function nearestSmallerValues(values) { const out = []; for (let i = 0; i < values.length; i += 1) out.push(i > 0 && values[i - 1] < values[i] ? i : 0); return out; }),
      ],
      hints: ["Stack of indexes with increasing values.", "Pop while the top's value ≥ the current value.", "Answer is the top's position + 1, or 0; then push the current index."],
      cases: [
        example([[2, 5, 1, 4, 8, 3, 2, 5]], [0, 1, 0, 3, 4, 3, 3, 7], "CSES sample"),
        example([[1, 2, 3, 4]], [0, 1, 2, 3], "increasing"),
        example([[4, 3, 2, 1]], [0, 0, 0, 0], "decreasing"),
        example([[2, 2, 2]], [0, 0, 0], "equal values"),
        hidden("n = 200 000, time limit", () => [randomInts(45, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "prefix-sums", title: "Prefix Sums", cses: { id: 1661, name: "Subarray Sums II (brick)" },
      goal: "Build the array prefix where prefix[i] is the sum of the first i values (prefix[0] = 0).",
      concept: "One pass of preprocessing makes every range sum a subtraction. The leading zero is what keeps the arithmetic clean.",
      functionName: "prefixSums", signature: "prefixSums(values) → array of length n + 1",
      starterSource: starter("prefixSums", "values"),
      solve: prefixSums, comparator: "deep",
      reference: book("9.1", "Static array queries · sum queries"),
      presets: { sample: { a: [3, 2, 4, 5, 1, 1, 5, 3] }, "with negatives": { a: [2, -3, 4, -1, 2] }, ones: { a: [1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-leading-zero", "prefix[0] must be 0 so that prefix[r] − prefix[l − 1] works for l = 1.", function prefixSums(values) { const prefix = []; let sum = 0; for (let i = 0; i < values.length; i += 1) { sum += values[i]; prefix.push(sum); } return prefix; }),
        diagnosis("skips-first", "Every value must be included, starting with values[0].", function prefixSums(values) { const prefix = [0]; for (let i = 1; i < values.length; i += 1) prefix.push(prefix[i - 1] + values[i]); return prefix; }),
      ],
      hints: ["Start with [0].", "prefix[i + 1] = prefix[i] + values[i].", "The result has one more entry than the input."],
      cases: [
        example([[1, 2, 3]], [0, 1, 3, 6], "three values"),
        example([[]], [0], "empty"),
        example([[5, -2]], [0, 5, 3], "with a negative"),
        hidden("n = 200 000, time limit", () => [randomInts(8, BIG, 1, 1000000000)]),
      ],
    },
    {
      id: "subarray-sums-i", title: "Subarray Sums I", cses: { id: 1660, name: "Subarray Sums I" },
      goal: "Count subarrays of positive values with sum exactly x.",
      concept: "With positive values the window sum is monotonic, so two pointers suffice: extend right, shrink left while the sum is too large.",
      functionName: "subarraySumsI", signature: "subarraySumsI(values, target) → number",
      starterSource: starter("subarraySumsI", "values, target"),
      solve: subarraySumsI, comparator: "scalar", brute: subarraySumBrute, small: (round) => { const next = rng(4900 + round); return [smallList(5000 + round, 1 + (round % 9), 1, 5), 1 + Math.floor(next() * 12)]; },
      reference: book("8.1", "Two pointers method · subarray sum"),
      presets: { "CSES sample": { a: [2, 4, 1, 2, 7] }, ones: { a: [1, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "target", type: "slider", label: "target x (rounded)", value: 7, min: 1, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("never-shrinks", "When the window sum exceeds x, drop values from the left.", function subarraySumsI(values, target) { let sum = 0, count = 0; for (let right = 0; right < values.length; right += 1) { sum += values[right]; if (sum === target) count += 1; } return count; }),
        diagnosis("shrinks-too-late", "Shrink while the sum is greater than x, not only when it exceeds it after the check.", function subarraySumsI(values, target) { let left = 0, sum = 0, count = 0; for (let right = 0; right < values.length; right += 1) { sum += values[right]; if (sum === target) count += 1; while (sum > target && left <= right) { sum -= values[left]; left += 1; } } return count; }),
      ],
      hints: ["Extend the window to the right, adding the value.", "While the sum is above x, remove values from the left.", "Count a hit when the sum equals x."],
      cases: [
        example([[2, 4, 1, 2, 7], 7], 3, "CSES sample"),
        example([[1, 1, 1, 1], 2], 3, "ones"),
        example([[5], 3], 0, "none"),
        hidden("n = 200 000, time limit", () => [randomInts(46, BIG, 1, 1000), 5000]),
      ],
    },
    {
      id: "subarray-sums-ii", title: "Subarray Sums II", cses: { id: 1661, name: "Subarray Sums II" },
      goal: "Count subarrays with sum exactly x when values may be negative.",
      concept: "sum(l..r) = prefix[r] − prefix[l − 1], so count, for every prefix, how many earlier prefixes equal prefix − x. A hash map does it in one pass.",
      functionName: "subarraySumsII", signature: "subarraySumsII(values, target) → number",
      starterSource: starter("subarraySumsII", "values, target", "Map of prefix sum → count, starting with {0: 1}."),
      solve: subarraySumsII, comparator: "scalar", dependencies: ["prefix-sums"], brute: subarraySumBrute, small: (round) => { const next = rng(5100 + round); return [smallList(5200 + round, 1 + (round % 9), -4, 5), -3 + Math.floor(next() * 10)]; },
      reference: book("9.1", "Static array queries · sum queries with a hash map"),
      presets: { "CSES sample": { a: [2, -1, 3, 4, -1] }, zeros: { a: [0, 0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "target", type: "slider", label: "target x (rounded)", value: 7, min: -5, max: 12 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
      diagnoses: [
        diagnosis("no-empty-prefix", "The empty prefix (sum 0) must start in the map, or subarrays starting at the first element are missed.", function subarraySumsII(values, target) { const seen = new Map(); let prefix = 0, count = 0; for (let i = 0; i < values.length; i += 1) { prefix += values[i]; count += seen.get(prefix - target) || 0; seen.set(prefix, (seen.get(prefix) || 0) + 1); } return count; }),
        diagnosis("two-pointers", "Two pointers need positive values; with negatives the window sum is not monotonic.", function subarraySumsII(values, target) { let left = 0, sum = 0, count = 0; for (let right = 0; right < values.length; right += 1) { sum += values[right]; while (sum > target && left <= right) { sum -= values[left]; left += 1; } if (sum === target) count += 1; } return count; }),
      ],
      hints: ["Running prefix sum, map starting with {0: 1}.", "For each prefix add map[prefix − x] to the count.", "Then increment map[prefix]."],
      cases: [
        example([[2, -1, 3, 4, -1], 7], 2, "CSES sample"),
        example([[0, 0, 0], 0], 6, "zeros"),
        example([[1, -1, 1, -1], 0], 4, "alternating"),
        hidden("n = 200 000, time limit", () => [randomInts(47, BIG, -1000, 1000), 0]),
      ],
    },
    {
      id: "subarray-divisibility", title: "Subarray Divisibility", cses: { id: 1662, name: "Subarray Divisibility" },
      goal: "Count subarrays whose sum is divisible by n, the array length.",
      concept: "Two prefixes with the same remainder modulo n bracket a divisible subarray, so count equal remainders. Normalise negatives into [0, n).",
      functionName: "subarrayDivisibility", signature: "subarrayDivisibility(values) → number",
      starterSource: starter("subarrayDivisibility", "values"),
      solve: subarrayDivisibility, comparator: "scalar", brute: divisibilityBrute, small: (round) => [smallList(5300 + round, 1 + (round % 9), -6, 6)],
      reference: book("9.1", "Static array queries · remainders of prefix sums"),
      presets: { "CSES sample": { a: [3, 1, 2, 7, 4] }, negatives: { a: [-1, 2, -3, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("negative-remainder", "JavaScript's % keeps the sign; add n and take % again.", function subarrayDivisibility(values) { const n = values.length; const counts = new Map([[0, 1]]); let remainder = 0, total = 0; for (let i = 0; i < n; i += 1) { remainder = (remainder + values[i]) % n; total += counts.get(remainder) || 0; counts.set(remainder, (counts.get(remainder) || 0) + 1); } return total; }),
        diagnosis("no-empty-prefix", "The empty prefix has remainder 0 and must be counted first.", function subarrayDivisibility(values) { const n = values.length; const counts = new Array(n).fill(0); let remainder = 0, total = 0; for (let i = 0; i < n; i += 1) { remainder = (((remainder + values[i]) % n) + n) % n; total += counts[remainder]; counts[remainder] += 1; } return total; }),
      ],
      hints: ["counts[0] = 1 for the empty prefix.", "remainder = ((remainder + v) % n + n) % n.", "Add counts[remainder] to the answer, then increment it."],
      cases: [
        example([[3, 1, 2, 7, 4]], 1, "CSES sample"),
        example([[-1, 2, -3, 4]], 2, "negatives"),
        example([[5]], 1, "single"),
        hidden("n = 200 000, time limit", () => [randomInts(48, BIG, -1000000000, 1000000000)]),
      ],
    },
    {
      id: "distinct-values-subarrays-ii", title: "Distinct Values Subarrays II", cses: { id: 2428, name: "Distinct Values Subarrays II" },
      goal: "Count subarrays with at most k distinct values.",
      concept: "Two pointers with a count map: track how many distinct values the window holds, shrink from the left when it exceeds k.",
      functionName: "distinctValuesSubarraysII", signature: "distinctValuesSubarraysII(values, k) → number",
      starterSource: starter("distinctValuesSubarraysII", "values, k"),
      solve: distinctValuesSubarraysII, comparator: "scalar", brute: distinctIIBrute, small: (round) => { const next = rng(5400 + round); const n = 1 + (round % 9); return [smallList(5500 + round, n, 1, 4), 1 + Math.floor(next() * n)]; },
      reference: book("8.1", "Two pointers method"),
      presets: { "CSES sample": { a: [1, 2, 3, 1, 1] }, "all same": { a: [4, 4, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "k", type: "slider", label: "k (rounded)", value: 2, min: 1, max: 5 }]), args: [{ fixture: "presetA" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("exactly-k", "Windows with fewer than k distinct values count too.", function distinctValuesSubarraysII(values, k) { const atMost = (limit) => { const counts = new Map(); let left = 0, distinct = 0, total = 0; for (let right = 0; right < values.length; right += 1) { const c = counts.get(values[right]) || 0; if (c === 0) distinct += 1; counts.set(values[right], c + 1); while (distinct > limit) { const d = counts.get(values[left]) - 1; counts.set(values[left], d); if (d === 0) distinct -= 1; left += 1; } total += right - left + 1; } return total; }; return atMost(k) - atMost(k - 1); }),
        diagnosis("never-shrinks", "Shrink the window while it holds more than k distinct values.", function distinctValuesSubarraysII(values, k) { let total = 0; for (let right = 0; right < values.length; right += 1) total += right + 1; return total; }),
      ],
      hints: ["Map value → count in the window; distinct = number of keys with count > 0.", "After adding values[right], shrink from the left while distinct > k.", "Add right − left + 1."],
      cases: [
        example([[1, 2, 3, 1, 1], 2], 10, "CSES sample"),
        example([[4, 4, 4], 1], 6, "all same"),
        example([[1, 2, 3], 3], 6, "everything allowed"),
        hidden("n = 200 000, time limit", () => [randomInts(49, BIG, 1, 100000), 100]),
      ],
    },
    {
      id: "array-division", title: "Array Division", cses: { id: 1085, name: "Array Division" },
      goal: "Split the array into k contiguous pieces so that the largest piece sum is as small as possible; return that sum.",
      concept: "Binary search on the answer: a greedy left-to-right cut tells whether a bound is achievable with at most k pieces.",
      functionName: "arrayDivision", signature: "arrayDivision(values, k) → number",
      starterSource: starter("arrayDivision", "values, k", "lo = max value, hi = total; feasible(mid) greedily counts pieces."),
      solve: arrayDivision, comparator: "scalar", brute: divisionBrute, small: (round) => { const next = rng(5600 + round); const n = 1 + (round % 8); return [smallList(5700 + round, n, 1, 9), 1 + Math.floor(next() * n)]; },
      reference: book("3.3", "Binary search · finding the smallest solution"),
      presets: { "CSES sample": { a: [2, 4, 7, 3, 5] }, "one piece": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "k", type: "slider", label: "k (rounded)", value: 3, min: 1, max: 5 }]), args: [{ fixture: "presetA" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("lower-bound-zero", "The answer is at least the largest single value; start the search there.", function arrayDivision(values, k) { let lo = 0, hi = 0; for (let i = 0; i < values.length; i += 1) hi += values[i]; while (lo < hi) { const mid = Math.floor((lo + hi) / 2); let pieces = 1, sum = 0; for (let i = 0; i < values.length; i += 1) { if (sum + values[i] > mid) { pieces += 1; sum = values[i]; } else sum += values[i]; } if (pieces <= k) hi = mid; else lo = mid + 1; } return lo; }),
        diagnosis("strict-pieces", "Using at most k pieces is allowed; do not demand fewer than k.", function arrayDivision(values, k) { let lo = 0, hi = 0; for (let i = 0; i < values.length; i += 1) { lo = Math.max(lo, values[i]); hi += values[i]; } while (lo < hi) { const mid = Math.floor((lo + hi) / 2); let pieces = 1, sum = 0; for (let i = 0; i < values.length; i += 1) { if (sum + values[i] > mid) { pieces += 1; sum = values[i]; } else sum += values[i]; } if (pieces < k) hi = mid; else lo = mid + 1; } return lo; }),
      ],
      hints: ["lo = largest value, hi = total sum.", "feasible(mid): sweep, starting a new piece whenever adding would exceed mid; count pieces.", "Binary search the smallest mid with pieces ≤ k."],
      cases: [
        example([[2, 4, 7, 3, 5], 3], 8, "CSES sample"),
        example([[1, 2, 3], 1], 6, "one piece"),
        example([[1, 2, 3], 3], 3, "one value per piece"),
        hidden("n = 200 000, time limit", () => [randomInts(50, BIG, 1, 1000000000), 1000]),
      ],
    },
    {
      id: "movie-festival-ii", title: "Movie Festival II", cses: { id: 1632, name: "Movie Festival II" },
      goal: "Maximum total movies watched by k club members, each watching whole movies one after another.",
      concept: "Sort by end time; give each movie to the member who became free latest but still before its start. A Fenwick multiset of free times finds that member with a predecessor query.",
      functionName: "movieFestivalII", signature: "movieFestivalII(movies, k) → number",
      starterSource: starter("movieFestivalII", "movies, k", "Free times as counts over compressed end times (k members free at 0). For each movie by end: predecessor of its start; if found, move that count to the movie's end."),
      solve: movieFestivalII, comparator: "scalar", dependencies: ["lower-bound", "upper-bound", "fenwick-add", "fenwick-prefix", "fenwick-kth"], brute: festivalIIBrute, small: (round) => { const next = rng(5800 + round); return [pairsList(5900 + round, 1 + (round % 7), 1, 12), 1 + Math.floor(next() * 3)]; },
      reference: book("9.2", "Binary indexed tree · as a sorted multiset"),
      presets: { "CSES sample": { a: [[1, 5], [8, 10], [3, 6], [2, 5], [6, 9]], b: 2 }, "latest member matters": { a: [[1, 3], [2, 10], [4, 5]], b: 2 } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("earliest-free-member", "Take the member who became free latest before the start, not the earliest; the earliest one may be needed for a movie that starts sooner.", function movieFestivalII(movies, k) { const order = movies.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]); const times = [0].concat(order.map((movie) => movie[1])).sort((p, q) => p - q); const distinct = times.filter((t, i) => i === 0 || t !== times[i - 1]); const rankOf = (t) => lowerBound(distinct, t) + 1; const tree = new Array(distinct.length + 1).fill(0); fenwickAdd(tree, rankOf(0), k); let count = 0; for (let i = 0; i < order.length; i += 1) { const available = fenwickPrefix(tree, upperBound(distinct, order[i][0])); if (available === 0) continue; const position = fenwickKth(tree, 1); fenwickAdd(tree, position, -1); fenwickAdd(tree, rankOf(order[i][1]), 1); count += 1; } return count; }),
        diagnosis("single-member", "All k members can watch at the same time.", function movieFestivalII(movies, k) { return movieFestival(movies); }),
      ],
      hints: ["Sort by end; compress all end times plus 0; put k at time 0.", "available = prefix(upperBound(distinct, start)); zero means skip.", "Otherwise remove the available-th element (the latest free time ≤ start) and add one at the movie's end."],
      cases: [
        example([[[1, 5], [8, 10], [3, 6], [2, 5], [6, 9]], 2], 4, "CSES sample"),
        example([[[1, 3], [2, 10], [4, 5]], 2], 3, "latest member matters"),
        example([[[1, 2], [1, 2], [1, 2]], 1], 1, "one member, overlapping"),
        hidden("n = 200 000, k = 1000, time limit", () => [pairsList(51, BIG, 1, 1000000000), 1000]),
      ],
    },
    {
      id: "maximum-subarray-sum-ii", title: "Maximum Subarray Sum II", cses: { id: 1644, name: "Maximum Subarray Sum II" },
      goal: "Maximum sum of a subarray whose length is between a and b.",
      concept: "prefix[r] − min(prefix[r − b .. r − a]) for every r; a monotonic deque keeps that sliding minimum in O(1) each.",
      functionName: "maximumSubarraySumII", signature: "maximumSubarraySumII(values, a, b) → number",
      starterSource: starter("maximumSubarraySumII", "values, a, b", "Prefix sums; for r from a to n, push index r − a into a deque of increasing prefixes, drop indexes below r − b, take prefix[r] − prefix[front]."),
      solve: maximumSubarraySumII, comparator: "scalar", dependencies: ["prefix-sums"], brute: subarrayIIBrute, small: (round) => { const next = rng(6000 + round); const n = 1 + (round % 9); const a = 1 + Math.floor(next() * n); return [smallList(6100 + round, n, -5, 5), a, a + Math.floor(next() * (n - a + 1))]; },
      reference: book("8.3", "Sliding window minimum"),
      presets: { "CSES sample": { a: [-1, 3, -2, 5, 3, -5, 2, 2] }, "all negative": { a: [-3, -1, -2] } },
      scene: { kind: "algo", view: "bars", handles: preset([
        { id: "a", type: "slider", label: "min length a (rounded)", value: 1, min: 1, max: 4 },
        { id: "b", type: "slider", label: "max length b (rounded)", value: 2, min: 1, max: 8 },
      ]), args: [{ fixture: "presetA" }, { fixture: "roundedA" }, { fixture: "roundedBAtLeastA" }] },
      diagnoses: [
        diagnosis("length-exactly-a", "Lengths between a and b are allowed, not only a.", function maximumSubarraySumII(values, a, b) { const n = values.length; const prefix = [0]; for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]); let best = -Infinity; for (let r = a; r <= n; r += 1) best = Math.max(best, prefix[r] - prefix[r - a]); return best; }),
        diagnosis("ignores-b", "Prefixes older than r − b must leave the window.", function maximumSubarraySumII(values, a, b) { const n = values.length; const prefix = [0]; for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]); let best = -Infinity, minPrefix = Infinity; for (let r = a; r <= n; r += 1) { minPrefix = Math.min(minPrefix, prefix[r - a]); best = Math.max(best, prefix[r] - minPrefix); } return best; }),
      ],
      hints: ["Prefix sums first.", "For each r ≥ a, the candidate left prefixes are r − b … r − a.", "Keep a deque of indexes with increasing prefix values; pop the back while larger, drop the front when it falls below r − b."],
      cases: [
        example([[-1, 3, -2, 5, 3, -5, 2, 2], 1, 2], 8, "CSES sample"),
        example([[-3, -1, -2], 1, 3], -1, "all negative"),
        example([[1, 2, 3], 2, 2], 5, "exact length"),
        hidden("n = 200 000, time limit", () => [randomInts(52, BIG, -1000000000, 1000000000), 100, 5000]),
      ],
    },
  ];

  core.share({ prefixSums, lowerBound, upperBound, fenwickAdd, fenwickPrefix, fenwickKth, heapPush, heapPop });
  core.define("sorting", SORTING);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

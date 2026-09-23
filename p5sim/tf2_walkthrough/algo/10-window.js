(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { mulMod, lowerBound, fenwickAdd, fenwickPrefix, fenwickKth, heapPush, heapPop, liChaoInsertRange, liChaoQuery } = core.shared;

  // ------------------------------------------------------------------ 10 · sliding window · references
  function generatedArray(n, x, a, b, c) {
    const values = new Array(n);
    values[0] = x;
    for (let i = 1; i < n; i += 1) values[i] = (mulMod(a, values[i - 1], c) + b) % c;
    return values;
  }
  function slidingWindowSum(n, k, x, a, b, c) {
    const values = generatedArray(n, x, a, b, c);
    const SHIFT = 4294967296;
    let high = 0, low = 0, xorHigh = 0, xorLow = 0;
    for (let i = 0; i < n; i += 1) {
      low += values[i];
      if (low >= SHIFT) { low -= SHIFT; high += 1; }
      if (i >= k) {
        low -= values[i - k];
        if (low < 0) { low += SHIFT; high -= 1; }
      }
      if (i >= k - 1) { xorHigh ^= high; xorLow = (xorLow ^ low) >>> 0; }
    }
    return xorHigh * SHIFT + xorLow;
  }
  function windowMinimums(values, k) {
    const n = values.length;
    const deque = new Int32Array(n);
    const out = new Array(n - k + 1);
    let head = 0, tail = 0;
    for (let i = 0; i < n; i += 1) {
      while (tail > head && values[deque[tail - 1]] >= values[i]) tail -= 1;
      deque[tail] = i;
      tail += 1;
      if (deque[head] <= i - k) head += 1;
      if (i >= k - 1) out[i - k + 1] = values[deque[head]];
    }
    return out;
  }
  function slidingWindowMinimum(n, k, x, a, b, c) {
    const minimums = windowMinimums(generatedArray(n, x, a, b, c), k);
    let answer = 0;
    for (let i = 0; i < minimums.length; i += 1) answer = (answer ^ minimums[i]) >>> 0;
    return answer;
  }
  function slidingWindowXor(n, k, x, a, b, c) {
    const values = generatedArray(n, x, a, b, c);
    let window = 0, answer = 0;
    for (let i = 0; i < n; i += 1) {
      window = (window ^ values[i]) >>> 0;
      if (i >= k) window = (window ^ values[i - k]) >>> 0;
      if (i >= k - 1) answer = (answer ^ window) >>> 0;
    }
    return answer;
  }
  function slidingWindowOr(n, k, x, a, b, c) {
    const values = generatedArray(n, x, a, b, c);
    const front = new Array(k + 1);
    let frontSize = 0, backOr = 0, backStart = 0, answer = 0;
    for (let i = 0; i < n; i += 1) {
      backOr = (backOr | values[i]) >>> 0;
      if (i >= k) {
        if (frontSize === 0) {
          let running = 0;
          for (let j = i; j >= backStart; j -= 1) {
            running = (running | values[j]) >>> 0;
            front[frontSize] = running;
            frontSize += 1;
          }
          backStart = i + 1;
          backOr = 0;
        }
        frontSize -= 1;
      }
      if (i >= k - 1) answer = (answer ^ ((frontSize > 0 ? front[frontSize - 1] : 0) | backOr)) >>> 0;
    }
    return answer;
  }
  function slidingWindowDistinctValues(values, k) {
    const counts = new Map();
    const out = new Array(values.length - k + 1);
    let distinct = 0;
    for (let i = 0; i < values.length; i += 1) {
      const seen = counts.get(values[i]) || 0;
      if (seen === 0) distinct += 1;
      counts.set(values[i], seen + 1);
      if (i >= k) {
        const gone = counts.get(values[i - k]);
        if (gone === 1) distinct -= 1;
        counts.set(values[i - k], gone - 1);
      }
      if (i >= k - 1) out[i - k + 1] = distinct;
    }
    return out;
  }
  function slidingWindowMode(values, k) {
    const counts = new Map();
    const buckets = [];
    const out = new Array(values.length - k + 1);
    let best = 0;
    const bucketAt = (frequency) => {
      while (buckets.length <= frequency) buckets.push([]);
      return buckets[frequency];
    };
    const smallestAtBest = () => {
      const heap = bucketAt(best);
      while (heap.length > 0 && counts.get(heap[0][0]) !== best) heapPop(heap);
      return heap.length > 0 ? heap[0][0] : null;
    };
    for (let i = 0; i < values.length; i += 1) {
      const raised = (counts.get(values[i]) || 0) + 1;
      counts.set(values[i], raised);
      heapPush(bucketAt(raised), [values[i]]);
      if (raised > best) best = raised;
      if (i >= k) {
        const lowered = counts.get(values[i - k]) - 1;
        counts.set(values[i - k], lowered);
        if (lowered > 0) heapPush(bucketAt(lowered), [values[i - k]]);
        while (best > 0 && smallestAtBest() === null) best -= 1;
      }
      if (i >= k - 1) out[i - k + 1] = smallestAtBest();
    }
    return out;
  }
  function slidingWindowMex(values, k) {
    let width = 1;
    while (width < k + 2) width *= 2;
    const tree = new Int32Array(2 * width);
    const bump = (value, delta) => {
      if (value > k) return;
      let node = width + value;
      tree[node] += delta;
      node >>= 1;
      while (node >= 1) {
        tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]);
        node >>= 1;
      }
    };
    const out = new Array(values.length - k + 1);
    for (let i = 0; i < values.length; i += 1) {
      bump(values[i], 1);
      if (i >= k) bump(values[i - k], -1);
      if (i >= k - 1) {
        let node = 1;
        while (node < width) node = tree[2 * node] === 0 ? 2 * node : 2 * node + 1;
        out[i - k + 1] = node - width;
      }
    }
    return out;
  }
  function compressValues(values) {
    const sorted = values.slice().sort((p, q) => p - q);
    const unique = [];
    for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) unique.push(sorted[i]);
    const ranks = new Array(values.length);
    for (let i = 0; i < values.length; i += 1) ranks[i] = lowerBound(unique, values[i]);
    return { unique, ranks };
  }
  function slidingWindowMedian(values, k) {
    const table = compressValues(values);
    const unique = table.unique, ranks = table.ranks;
    const tree = new Array(unique.length + 1).fill(0);
    const out = new Array(values.length - k + 1);
    const middle = Math.floor((k + 1) / 2);
    for (let i = 0; i < values.length; i += 1) {
      fenwickAdd(tree, ranks[i] + 1, 1);
      if (i >= k) fenwickAdd(tree, ranks[i - k] + 1, -1);
      if (i >= k - 1) out[i - k + 1] = unique[fenwickKth(tree, middle) - 1];
    }
    return out;
  }
  function slidingWindowCost(values, k) {
    const table = compressValues(values);
    const unique = table.unique, ranks = table.ranks;
    const counts = new Array(unique.length + 1).fill(0);
    const sums = new Array(unique.length + 1).fill(0);
    const out = new Array(values.length - k + 1);
    const middle = Math.floor((k + 1) / 2);
    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      fenwickAdd(counts, ranks[i] + 1, 1);
      fenwickAdd(sums, ranks[i] + 1, values[i]);
      total += values[i];
      if (i >= k) {
        fenwickAdd(counts, ranks[i - k] + 1, -1);
        fenwickAdd(sums, ranks[i - k] + 1, -values[i - k]);
        total -= values[i - k];
      }
      if (i >= k - 1) {
        const position = fenwickKth(counts, middle);
        const median = unique[position - 1];
        const below = fenwickPrefix(counts, position);
        const belowSum = fenwickPrefix(sums, position);
        out[i - k + 1] = (median * below - belowSum) + ((total - belowSum) - median * (k - below));
      }
    }
    return out;
  }
  function slidingWindowInversions(values, k) {
    const table = compressValues(values);
    const ranks = table.ranks;
    const size = table.unique.length;
    const tree = new Array(size + 1).fill(0);
    const out = new Array(values.length - k + 1);
    let inversions = 0, inside = 0;
    for (let i = 0; i < values.length; i += 1) {
      inversions += inside - fenwickPrefix(tree, ranks[i] + 1);
      fenwickAdd(tree, ranks[i] + 1, 1);
      inside += 1;
      if (i >= k) {
        const leaving = ranks[i - k];
        fenwickAdd(tree, leaving + 1, -1);
        inside -= 1;
        inversions -= fenwickPrefix(tree, leaving);
      }
      if (i >= k - 1) out[i - k + 1] = inversions;
    }
    return out;
  }
  function slidingWindowAdvertisement(values, k) {
    const n = values.length;
    const left = new Array(n), right = new Array(n);
    const stack = [];
    for (let i = 0; i < n; i += 1) {
      while (stack.length && values[stack[stack.length - 1]] >= values[i]) stack.pop();
      left[i] = stack.length ? stack[stack.length - 1] + 1 : 0;
      stack.push(i);
    }
    stack.length = 0;
    for (let i = n - 1; i >= 0; i -= 1) {
      while (stack.length && values[stack[stack.length - 1]] > values[i]) stack.pop();
      right[i] = stack.length ? stack[stack.length - 1] - 1 : n - 1;
      stack.push(i);
    }
    const windows = n - k + 1;
    const tree = new Array(4 * windows).fill(null);
    const cover = (from, to, slope, intercept) => {
      const lo = Math.max(0, from), hi = Math.min(windows - 1, to);
      if (lo <= hi) liChaoInsertRange(tree, windows, slope, intercept, lo, hi);
    };
    for (let i = 0; i < n; i += 1) {
      const height = values[i], a = left[i], b = right[i];
      cover(b - k + 1, a, 0, height * (b - a + 1));
      cover(Math.max(a + 1, b - k + 1), i, -height, height * (b + 1));
      cover(i - k + 1, Math.min(a, b - k), height, height * (k - a));
      cover(Math.max(a + 1, i - k + 1), Math.min(b - k, i), 0, height * k);
    }
    const out = new Array(windows);
    for (let l = 0; l < windows; l += 1) out[l] = liChaoQuery(tree, windows, l);
    return out;
  }

  // ------------------------------------------------------------------ helpers, brute forces and generators for the stress tests
  function windowsOf(values, k) {
    const out = [];
    for (let i = 0; i + k <= values.length; i += 1) out.push(values.slice(i, i + k));
    return out;
  }
  function smallValues(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) out.push(1 + Math.floor(next() * top));
    return out;
  }
  function smallWindow(round, seed, top) {
    const n = 1 + (round % 9);
    return [smallValues(seed + round, n, top || 6), 1 + (round % n)];
  }
  function smallGenerator(round, seed) {
    const next = rng(seed + round);
    const n = 1 + (round % 9);
    return [n, 1 + (round % n), Math.floor(next() * 40), Math.floor(next() * 40), Math.floor(next() * 40), 1 + Math.floor(next() * 40)];
  }
  function generatedArrayBrute(n, x, a, b, c) {
    const out = [BigInt(x)];
    for (let i = 1; i < n; i += 1) out.push((BigInt(a) * out[i - 1] + BigInt(b)) % BigInt(c));
    return out.map(Number);
  }
  function foldXor(list) {
    let answer = 0n;
    for (let i = 0; i < list.length; i += 1) answer ^= BigInt(list[i]);
    return Number(answer);
  }
  function slidingWindowSumBrute(n, k, x, a, b, c) {
    const values = generatedArrayBrute(n, x, a, b, c);
    return foldXor(windowsOf(values, k).map((window) => window.reduce((sum, value) => sum + value, 0)));
  }
  function windowMinimumsBrute(values, k) { return windowsOf(values, k).map((window) => Math.min.apply(null, window)); }
  function slidingWindowMinimumBrute(n, k, x, a, b, c) { return foldXor(windowMinimumsBrute(generatedArrayBrute(n, x, a, b, c), k)); }
  function slidingWindowXorBrute(n, k, x, a, b, c) {
    return foldXor(windowsOf(generatedArrayBrute(n, x, a, b, c), k).map((window) => foldXor(window)));
  }
  function slidingWindowOrBrute(n, k, x, a, b, c) {
    return foldXor(windowsOf(generatedArrayBrute(n, x, a, b, c), k).map((window) => window.reduce((left, right) => Number(BigInt(left) | BigInt(right)), 0)));
  }
  function slidingWindowDistinctValuesBrute(values, k) { return windowsOf(values, k).map((window) => new Set(window).size); }
  function slidingWindowModeBrute(values, k) {
    return windowsOf(values, k).map((window) => {
      const counts = new Map();
      window.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
      let best = 0, pick = Infinity;
      counts.forEach((count, value) => {
        if (count > best) { best = count; pick = value; }
        else if (count === best && value < pick) pick = value;
      });
      return pick;
    });
  }
  function slidingWindowMexBrute(values, k) {
    return windowsOf(values, k).map((window) => {
      const seen = new Set(window);
      let mex = 0;
      while (seen.has(mex)) mex += 1;
      return mex;
    });
  }
  function medianOf(window, k) { return window.slice().sort((p, q) => p - q)[Math.floor((k + 1) / 2) - 1]; }
  function slidingWindowMedianBrute(values, k) { return windowsOf(values, k).map((window) => medianOf(window, k)); }
  function slidingWindowCostBrute(values, k) {
    return windowsOf(values, k).map((window) => {
      const median = medianOf(window, k);
      return window.reduce((sum, value) => sum + Math.abs(value - median), 0);
    });
  }
  function slidingWindowInversionsBrute(values, k) {
    return windowsOf(values, k).map((window) => {
      let count = 0;
      for (let i = 0; i < window.length; i += 1) for (let j = i + 1; j < window.length; j += 1) if (window[i] > window[j]) count += 1;
      return count;
    });
  }
  function slidingWindowAdvertisementBrute(values, k) {
    return windowsOf(values, k).map((window) => {
      let best = 0;
      for (let i = 0; i < window.length; i += 1) {
        let low = window[i];
        for (let j = i; j < window.length; j += 1) {
          if (window[j] < low) low = window[j];
          if (low * (j - i + 1) > best) best = low * (j - i + 1);
        }
      }
      return best;
    });
  }
  function compressValuesBrute(values) {
    const unique = Array.from(new Set(values)).sort((p, q) => p - q);
    return { unique, ranks: values.map((value) => unique.indexOf(value)) };
  }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const GENERATED_BIG = [2000000, 1000, 123456789, 998244353, 12345, 1000000000];
  const GENERATED_ONE = [2000000, 1, 987654321, 1103515245, 12345, 999999937];
  const GENERATED_WIDE = [2000000, 2000000, 5, 1103515245, 12345, 1000000000];
  const VALUES_MID = lazy(() => randomInts(1001, 100000, 1, 1000000000));
  const VALUES_SMALL_RANGE = lazy(() => randomInts(1002, 100000, 1, 40));
  const VALUES_MEX = lazy(() => randomInts(1003, 100000, 0, 300));
  const VALUES_SORTED = lazy(() => randomInts(1004, 100000, 1, 1000000000).sort((p, q) => q - p));
  const GENERATOR_ARGS = [500000, 123456789, 998244353, 12345, 1000000000];
  const DEQUE_VALUES = lazy(() => randomInts(1005, 200000, 1, 1000000000));
  const DEQUE_DECREASING = lazy(() => { const out = new Array(200000); for (let i = 0; i < 200000; i += 1) out[i] = 200000 - i; return out; });

  const SAMPLE_SERIES = [3, 0, 1, 8, 2, 4, 7, 6];
  const SAMPLE_POINTS = SAMPLE_SERIES.map((value, index) => [index, value]);
  const SAMPLE_GENERATOR = { a: 8, b: 5, c: 3, d: 7, e: 1, f: 11, points: SAMPLE_POINTS };
  const SAMPLE_DISTINCT = [1, 2, 3, 2, 5, 2, 2, 2];
  const SAMPLE_MODE = [1, 2, 3, 2, 5, 2, 4, 4];
  const SAMPLE_MEX = [1, 2, 1, 0, 5, 1, 1, 0];
  const SAMPLE_MEDIAN = [2, 4, 3, 5, 8, 1, 2, 1];
  const SAMPLE_FENCE = [4, 1, 5, 3, 3, 2, 4, 1];

  const WINDOW = [
    {
      id: "generated-array", title: "Generated Array", cses: { id: 3220, name: "Sliding Window Sum (brick)" },
      goal: "Build the array the first four tasks work on: x₁ = x and xᵢ = (a · xᵢ₋₁ + b) mod c. Return all n values.",
      concept: "These tasks allow ten million elements, far more than a statement could list, so the array arrives as six numbers instead. The catch is in the recurrence: a and the previous value both reach a billion, and their product reaches 10¹⁸, past the 2⁵³ where doubles stop counting by ones. The split multiplication from the Mathematics section is what keeps every term exact.",
      functionName: "generatedArray", signature: "generatedArray(n, x, a, b, c) → array",
      starterSource: starter("generatedArray", "n, x, a, b, c", "values[0] = x; then values[i] = (mulMod(a, values[i - 1], c) + b) % c."),
      solve: generatedArray, comparator: "deep", dependencies: ["mul-mod"], brute: generatedArrayBrute,
      small: (round) => { const args = smallGenerator(round, 100); return [args[0], args[2], args[3], args[4], args[5]]; },
      reference: book("21.1", "Randomised algorithms · generators"),
      presets: {
        "CSES sample": { a: 8, b: 3, c: 7, d: 1, e: 11, points: SAMPLE_POINTS },
        "a short cycle": { a: 6, b: 1, c: 2, d: 0, e: 5, points: [[0, 1], [1, 2], [2, 4], [3, 3], [4, 1], [5, 2]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }] },
      diagnoses: [
        diagnosis("plain-multiply", "a · xᵢ₋₁ reaches 10¹⁸, so the product is rounded before the remainder is taken and the whole sequence drifts.", function generatedArray(n, x, a, b, c) { const values = new Array(n); values[0] = x; for (let i = 1; i < n; i += 1) values[i] = (a * values[i - 1] + b) % c; return values; }),
        diagnosis("reduces-the-seed", "x₁ is the seed exactly as given, not the seed reduced modulo c.", function generatedArray(n, x, a, b, c) { const values = new Array(n); values[0] = x % c; for (let i = 1; i < n; i += 1) values[i] = (mulMod(a, values[i - 1], c) + b) % c; return values; }),
      ],
      hints: ["The first value is x itself.", "Each later value is (mulMod(a, previous, c) + b) % c.", "Return all n values in order."],
      cases: [
        example([8, 3, 7, 1, 11], SAMPLE_SERIES, "CSES sample"),
        example([1, 5, 9, 9, 3], [5], "one value keeps the seed"),
        example([4, 0, 0, 7, 5], [0, 2, 2, 2], "a constant tail"),
        run(generatedArray, [5, 1000000000, 999999999, 999999998, 1000000000], "a product past 2⁵³"),
        hidden("n = 500 000, time limit", () => GENERATOR_ARGS.slice()),
      ],
    },
    {
      id: "sliding-window-sum", title: "Sliding Window Sum", cses: { id: 3220, name: "Sliding Window Sum" },
      goal: "The xor of the sums of every window of k consecutive values, where the array comes from the generator.",
      concept: "One value enters and one leaves, so the sum only needs adding and subtracting. Two things break here though. A window sum reaches 10¹⁶, past 2⁵³, and JavaScript's xor is a 32 bit operator that would throw away everything above. Carrying the sum as a high and a low half of 32 bits each fixes both at once: the halves stay exact, and each can be xored on its own.",
      functionName: "slidingWindowSum", signature: "slidingWindowSum(n, k, x, a, b, c) → number",
      starterSource: starter("slidingWindowSum", "n, k, x, a, b, c", "Keep the running sum as high and low halves of 2³²; xor each half separately; answer = high · 2³² + low."),
      solve: slidingWindowSum, comparator: "scalar", dependencies: ["generated-array"], brute: slidingWindowSumBrute, small: (round) => smallGenerator(round, 200),
      reference: book("8.3", "Amortized analysis · sliding window"),
      presets: { "CSES sample": SAMPLE_GENERATOR, "every element": { a: 6, b: 6, c: 1, d: 2, e: 0, f: 100, points: [[0, 1], [1, 2], [2, 4], [3, 8], [4, 16], [5, 32]] } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("thirty-two-bit-xor", "JavaScript's xor works on 32 bits, so a sum above four billion loses its top half before it is folded in.", function slidingWindowSum(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let sum = 0, answer = 0; for (let i = 0; i < n; i += 1) { sum += values[i]; if (i >= k) sum -= values[i - k]; if (i >= k - 1) answer = (answer ^ sum) >>> 0; } return answer; }),
        diagnosis("never-removes", "The value leaving the window has to come off the running total, otherwise every window reports the sum of the whole prefix.", function slidingWindowSum(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); const SHIFT = 4294967296; let high = 0, low = 0, xorHigh = 0, xorLow = 0; for (let i = 0; i < n; i += 1) { low += values[i]; if (low >= SHIFT) { low -= SHIFT; high += 1; } if (i >= k - 1) { xorHigh ^= high; xorLow = (xorLow ^ low) >>> 0; } } return xorHigh * SHIFT + xorLow; }),
      ],
      hints: ["Build the array once with generatedArray.", "Keep low in [0, 2³²) and carry into high when it overflows or goes negative.", "Fold with xorHigh ^= high and xorLow = (xorLow ^ low) >>> 0, then return xorHigh · 2³² + xorLow."],
      cases: [
        example([8, 5, 3, 7, 1, 11], 12, "CSES sample"),
        example([1, 1, 7, 0, 0, 100], 7, "one window"),
        run(slidingWindowSum, [6, 6, 1, 2, 0, 100], "a single wide window"),
        run(slidingWindowSum, [40, 30, 999999999, 999999998, 999999997, 1000000000], "sums past 2⁵³"),
        hidden("n = 2 000 000, k = 1 000, time limit", () => GENERATED_BIG.slice()),
        hidden("n = 2 000 000, k = 1, time limit", () => GENERATED_ONE.slice()),
      ],
    },
    {
      id: "window-minimums", title: "Monotonic Deque", cses: { id: 3221, name: "Sliding Window Minimum (brick)" },
      goal: "The minimum of every window of k consecutive values. Return n − k + 1 numbers.",
      concept: "Keep the indices of the candidates in a deque, smallest value at the front. A new value that is not larger than the back one makes that back one useless forever: it leaves the window no later and it is never smaller. So pop from the back while that holds, push the new index, and drop the front once it falls out of the window. Every index enters and leaves once, so the whole sweep is linear.",
      functionName: "windowMinimums", signature: "windowMinimums(values, k) → array",
      starterSource: starter("windowMinimums", "values, k", "Deque of indices; pop the back while its value ≥ the new one; drop the front when it leaves the window."),
      solve: windowMinimums, comparator: "deep", brute: windowMinimumsBrute, small: (round) => smallWindow(round, 300),
      reference: book("8.3", "Amortized analysis · sliding window minimum"),
      presets: { "CSES sample": { a: SAMPLE_SERIES, b: 5 }, decreasing: { a: [5, 4, 3, 2, 1], b: 2 }, increasing: { a: [1, 2, 3, 4, 5], b: 2 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("comparison-flipped", "Popping while the back value is smaller leaves the deque decreasing, so the front holds the largest value of the window rather than the smallest.", function windowMinimums(values, k) { const n = values.length; const deque = []; const out = []; for (let i = 0; i < n; i += 1) { while (deque.length && values[deque[deque.length - 1]] <= values[i]) deque.pop(); deque.push(i); if (deque[0] <= i - k) deque.shift(); if (i >= k - 1) out.push(values[deque[0]]); } return out; }),
        diagnosis("never-drops-the-front", "The front index eventually falls out of the window; without dropping it the answer keeps reporting a value that has already left.", function windowMinimums(values, k) { const n = values.length; const deque = []; const out = []; for (let i = 0; i < n; i += 1) { while (deque.length && values[deque[deque.length - 1]] >= values[i]) deque.pop(); deque.push(i); if (i >= k - 1) out.push(values[deque[0]]); } return out; }),
      ],
      hints: ["Store indices, not values, so you can tell when one leaves the window.", "Before pushing i, pop the back while its value is ≥ values[i].", "Drop the front when it is ≤ i − k, then read values[front] once i reaches k − 1."],
      cases: [
        example([SAMPLE_SERIES, 5], [0, 0, 1, 2], "CSES sample"),
        example([[5, 4, 3, 2, 1], 2], [4, 3, 2, 1], "decreasing"),
        example([[1, 2, 3, 4, 5], 2], [1, 2, 3, 4], "increasing"),
        example([[2, 2, 2], 2], [2, 2], "all equal"),
        example([[7], 1], [7], "one element"),
        hidden("n = 200 000, k = 1 000, time limit", () => [DEQUE_VALUES(), 1000]),
        hidden("n = 200 000 decreasing, k = 1 000, time limit", () => [DEQUE_DECREASING(), 1000]),
      ],
    },
    {
      id: "sliding-window-minimum", title: "Sliding Window Minimum", cses: { id: 3221, name: "Sliding Window Minimum" },
      goal: "The xor of the minimums of every window of k values, where the array comes from the generator.",
      concept: "The deque does the work and the fold is one line. Every value is below a billion, so a plain xor is safe here; only the sums of the previous task needed splitting.",
      functionName: "slidingWindowMinimum", signature: "slidingWindowMinimum(n, k, x, a, b, c) → number",
      starterSource: starter("slidingWindowMinimum", "n, k, x, a, b, c", "windowMinimums over generatedArray, then xor the results together."),
      solve: slidingWindowMinimum, comparator: "scalar", dependencies: ["generated-array", "window-minimums"], brute: slidingWindowMinimumBrute, small: (round) => smallGenerator(round, 400),
      reference: book("8.3", "Amortized analysis · sliding window minimum"),
      presets: { "CSES sample": SAMPLE_GENERATOR, "a wide window": { a: 8, b: 8, c: 3, d: 7, e: 1, f: 11, points: SAMPLE_POINTS } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("first-window-only", "Every window contributes to the fold, not only the first one.", function slidingWindowMinimum(n, k, x, a, b, c) { const minimums = windowMinimums(generatedArray(n, x, a, b, c), k); return minimums.length ? minimums[0] : 0; }),
        diagnosis("xors-the-array", "The fold is over the window minimums, not over the generated values themselves.", function slidingWindowMinimum(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let answer = 0; for (let i = 0; i < values.length; i += 1) answer = (answer ^ values[i]) >>> 0; return answer; }),
      ],
      hints: ["Build the array, then call windowMinimums on it.", "Fold the returned list with xor, keeping the result unsigned.", "Return the folded value."],
      cases: [
        example([8, 5, 3, 7, 1, 11], 3, "CSES sample"),
        example([1, 1, 9, 0, 0, 100], 9, "one window"),
        run(slidingWindowMinimum, [8, 8, 3, 7, 1, 11], "one wide window"),
        run(slidingWindowMinimum, [50, 3, 7, 13, 5, 1000], "a longer run"),
        hidden("n = 2 000 000, k = 1 000, time limit", () => GENERATED_BIG.slice()),
        hidden("n = k = 2 000 000, time limit", () => GENERATED_WIDE.slice()),
      ],
    },
    {
      id: "sliding-window-xor", title: "Sliding Window Xor", cses: { id: 3426, name: "Sliding Window Xor" },
      goal: "The xor of the xors of every window of k values, where the array comes from the generator.",
      concept: "Xor is its own inverse: xoring the same value twice cancels it. So the window xor needs no structure at all, just fold the entering value in and the leaving value back out.",
      functionName: "slidingWindowXor", signature: "slidingWindowXor(n, k, x, a, b, c) → number",
      starterSource: starter("slidingWindowXor", "n, k, x, a, b, c", "Fold values[i] in; once i ≥ k fold values[i − k] back out; collect once the window is full."),
      solve: slidingWindowXor, comparator: "scalar", dependencies: ["generated-array"], brute: slidingWindowXorBrute, small: (round) => smallGenerator(round, 500),
      reference: book("10.2", "Bit manipulation · xor"),
      presets: { "CSES sample": SAMPLE_GENERATOR, "single elements": { a: 8, b: 1, c: 3, d: 7, e: 1, f: 11, points: SAMPLE_POINTS } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("never-removes", "The value leaving the window has to be xored out again, otherwise the running value covers the whole prefix.", function slidingWindowXor(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let window = 0, answer = 0; for (let i = 0; i < n; i += 1) { window = (window ^ values[i]) >>> 0; if (i >= k - 1) answer = (answer ^ window) >>> 0; } return answer; }),
        diagnosis("subtracts-instead", "Xor is undone by xoring again, not by subtracting.", function slidingWindowXor(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let window = 0, answer = 0; for (let i = 0; i < n; i += 1) { window = (window ^ values[i]) >>> 0; if (i >= k) window = window - values[i - k]; if (i >= k - 1) answer = (answer ^ window) >>> 0; } return answer; }),
      ],
      hints: ["window = (window ^ values[i]) >>> 0 as each value arrives.", "Once i ≥ k, xor values[i − k] out of it again.", "From i = k − 1 onwards fold the window value into the answer."],
      cases: [
        example([8, 5, 3, 7, 1, 11], 0, "CSES sample"),
        example([1, 1, 6, 0, 0, 100], 6, "one window"),
        run(slidingWindowXor, [8, 1, 3, 7, 1, 11], "windows of one"),
        run(slidingWindowXor, [60, 7, 12, 31, 9, 1024], "a longer run"),
        hidden("n = 2 000 000, k = 1 000, time limit", () => GENERATED_BIG.slice()),
        hidden("n = 2 000 000, k = 1, time limit", () => GENERATED_ONE.slice()),
      ],
    },
    {
      id: "sliding-window-or", title: "Sliding Window Or", cses: { id: 3405, name: "Sliding Window Or" },
      goal: "The xor of the bitwise ors of every window of k values, where the array comes from the generator.",
      concept: "Or cannot be undone: once a bit is set the window has forgotten how many values set it. The general answer is to build the queue from two stacks. New values pile onto a back stack that keeps a running or. When the front stack runs dry, the back is poured into it, recording the or of every suffix as it goes. The window's or is then the front's top combined with the back's running value, and each element is moved across exactly once.",
      functionName: "slidingWindowOr", signature: "slidingWindowOr(n, k, x, a, b, c) → number",
      starterSource: starter("slidingWindowOr", "n, k, x, a, b, c", "Two stacks: a back running or, and a front of suffix ors rebuilt from the back whenever it empties."),
      solve: slidingWindowOr, comparator: "scalar", dependencies: ["generated-array"], brute: slidingWindowOrBrute, small: (round) => smallGenerator(round, 600),
      reference: book("10.2", "Bit manipulation · or"),
      presets: { "CSES sample": SAMPLE_GENERATOR, "powers of two": { a: 6, b: 3, c: 1, d: 2, e: 0, f: 100, points: [[0, 1], [1, 2], [2, 4], [3, 8], [4, 16], [5, 32]] } },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("never-forgets", "Without the two stacks the or only ever grows, so every window reports the or of the whole prefix.", function slidingWindowOr(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let window = 0, answer = 0; for (let i = 0; i < n; i += 1) { window = (window | values[i]) >>> 0; if (i >= k - 1) answer = (answer ^ window) >>> 0; } return answer; }),
        diagnosis("xors-out-the-old", "Or has no inverse; xoring the leaving value out clears bits that other values in the window still set.", function slidingWindowOr(n, k, x, a, b, c) { const values = generatedArray(n, x, a, b, c); let window = 0, answer = 0; for (let i = 0; i < n; i += 1) { window = (window | values[i]) >>> 0; if (i >= k) window = (window ^ values[i - k]) >>> 0; if (i >= k - 1) answer = (answer ^ window) >>> 0; } return answer; }),
      ],
      hints: ["Keep backOr as the or of everything pushed since the last pour, and a front array of suffix ors.", "When the front is empty and a value must leave, walk the back from its newest element down to its oldest, pushing running ors into the front, then reset the back.", "The window or is the front's top combined with backOr; fold that into the answer with xor."],
      cases: [
        example([8, 5, 3, 7, 1, 11], 4, "CSES sample"),
        example([1, 1, 5, 0, 0, 100], 5, "one window"),
        run(slidingWindowOr, [6, 3, 1, 2, 0, 100], "powers of two"),
        run(slidingWindowOr, [60, 7, 12, 31, 9, 1024], "a longer run"),
        hidden("n = 2 000 000, k = 1 000, time limit", () => GENERATED_BIG.slice()),
        hidden("n = k = 2 000 000, time limit", () => GENERATED_WIDE.slice()),
      ],
    },
    {
      id: "sliding-window-distinct-values", title: "Sliding Window Distinct Values", cses: { id: 3222, name: "Sliding Window Distinct Values" },
      goal: "The number of distinct values in every window of k elements. Return n − k + 1 numbers.",
      concept: "Keep how many times each value sits in the window. A value that arrives at count zero adds one to the distinct total, and a value that leaves at count one takes one away. Nothing else can change the total, so each step is constant work.",
      functionName: "slidingWindowDistinctValues", signature: "slidingWindowDistinctValues(values, k) → array",
      starterSource: starter("slidingWindowDistinctValues", "values, k", "Map of counts; raise the total when a count goes 0 → 1 and lower it when it goes 1 → 0."),
      solve: slidingWindowDistinctValues, comparator: "deep", brute: slidingWindowDistinctValuesBrute, small: (round) => smallWindow(round, 700, 4),
      reference: book("8.3", "Amortized analysis · sliding window"),
      presets: { "CSES sample": { a: SAMPLE_DISTINCT, b: 3 }, "all equal": { a: [4, 4, 4, 4], b: 2 }, "all different": { a: [1, 2, 3, 4], b: 2 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-arrivals", "A value already in the window does not add to the total; only a count rising from zero does.", function slidingWindowDistinctValues(values, k) { const counts = new Map(); const out = []; let distinct = 0; for (let i = 0; i < values.length; i += 1) { distinct += 1; counts.set(values[i], (counts.get(values[i]) || 0) + 1); if (i >= k) { const gone = counts.get(values[i - k]); if (gone === 1) distinct -= 1; counts.set(values[i - k], gone - 1); } if (i >= k - 1) out.push(distinct); } return out; }),
        diagnosis("drops-on-every-exit", "A value leaving still has copies behind it unless its count was one.", function slidingWindowDistinctValues(values, k) { const counts = new Map(); const out = []; let distinct = 0; for (let i = 0; i < values.length; i += 1) { const seen = counts.get(values[i]) || 0; if (seen === 0) distinct += 1; counts.set(values[i], seen + 1); if (i >= k) { distinct -= 1; counts.set(values[i - k], counts.get(values[i - k]) - 1); } if (i >= k - 1) out.push(distinct); } return out; }),
      ],
      hints: ["Keep a Map from value to how many copies sit in the window.", "On arrival: if the old count was 0, the distinct total rises.", "On departure: if the old count was 1, the distinct total falls."],
      cases: [
        example([SAMPLE_DISTINCT, 3], [3, 2, 3, 2, 2, 1], "CSES sample"),
        example([[4, 4, 4, 4], 2], [1, 1, 1], "all equal"),
        example([[1, 2, 3, 4], 2], [2, 2, 2], "all different"),
        example([[1, 2, 3], 3], [3], "one window"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 from a small range, k = 1 000, time limit", () => [VALUES_SMALL_RANGE(), 1000]),
      ],
    },
    {
      id: "sliding-window-mode", title: "Sliding Window Mode", cses: { id: 3224, name: "Sliding Window Mode" },
      goal: "The mode of every window of k elements: the most frequent value, and the smallest one when several tie. Return n − k + 1 numbers.",
      concept: "Counting is easy; finding the smallest value at the top frequency is not. Keep a heap of values for each frequency, and push a value into the heap for its new count every time that count rises. A heap may then hold values whose count has since moved on, so before reading the top, pop the entries that no longer belong. Each push is matched by at most one pop, so the whole sweep stays near linear. The top frequency only ever moves by one per step, so it is easy to follow.",
      functionName: "slidingWindowMode", signature: "slidingWindowMode(values, k) → array",
      starterSource: starter("slidingWindowMode", "values, k", "Counts per value; a min-heap per frequency; drop stale heap tops before reading; lower the best frequency when its heap runs dry."),
      solve: slidingWindowMode, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: slidingWindowModeBrute, small: (round) => smallWindow(round, 800, 4),
      reference: book("8.3", "Amortized analysis · sliding window"),
      presets: { "CSES sample": { a: SAMPLE_MODE, b: 3 }, "all equal": { a: [4, 4, 4, 4], b: 2 }, "all different": { a: [3, 1, 2, 4], b: 2 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("largest-on-a-tie", "When several values share the top frequency the answer is the smallest of them; a heap ordered the other way returns the largest.", function slidingWindowMode(values, k) { const counts = new Map(); const buckets = []; const out = []; let best = 0; const bucketAt = (frequency) => { while (buckets.length <= frequency) buckets.push([]); return buckets[frequency]; }; const largestAtBest = () => { const heap = bucketAt(best); while (heap.length > 0 && counts.get(-heap[0][0]) !== best) heapPop(heap); return heap.length > 0 ? -heap[0][0] : null; }; for (let i = 0; i < values.length; i += 1) { const raised = (counts.get(values[i]) || 0) + 1; counts.set(values[i], raised); heapPush(bucketAt(raised), [-values[i]]); if (raised > best) best = raised; if (i >= k) { const lowered = counts.get(values[i - k]) - 1; counts.set(values[i - k], lowered); if (lowered > 0) heapPush(bucketAt(lowered), [-values[i - k]]); while (best > 0 && largestAtBest() === null) best -= 1; } if (i >= k - 1) out.push(largestAtBest()); } return out; }),
        diagnosis("best-never-falls", "When the last value at the top frequency leaves, the top frequency drops by one; holding it fixed leaves an empty heap to read.", function slidingWindowMode(values, k) { const counts = new Map(); const buckets = []; const out = []; let best = 0; const bucketAt = (frequency) => { while (buckets.length <= frequency) buckets.push([]); return buckets[frequency]; }; const smallestAtBest = () => { const heap = bucketAt(best); while (heap.length > 0 && counts.get(heap[0][0]) !== best) heapPop(heap); return heap.length > 0 ? heap[0][0] : null; }; for (let i = 0; i < values.length; i += 1) { const raised = (counts.get(values[i]) || 0) + 1; counts.set(values[i], raised); heapPush(bucketAt(raised), [values[i]]); if (raised > best) best = raised; if (i >= k) { const lowered = counts.get(values[i - k]) - 1; counts.set(values[i - k], lowered); if (lowered > 0) heapPush(bucketAt(lowered), [values[i - k]]); } if (i >= k - 1) out.push(smallestAtBest()); } return out; }),
      ],
      hints: ["counts maps a value to how many copies are in the window; buckets[f] is a min-heap of values whose count reached f.", "When a count rises to f, push the value into buckets[f]; when it falls to f > 0, push it into buckets[f] as well.", "To read the answer, pop entries off buckets[best] whose count is no longer best; if it empties, lower best by one and try again."],
      cases: [
        example([SAMPLE_MODE, 3], [1, 2, 2, 2, 2, 4], "CSES sample"),
        example([[4, 4, 4, 4], 2], [4, 4, 4], "all equal"),
        example([[3, 1, 2, 4], 2], [1, 1, 2], "ties take the smallest"),
        example([[5, 5, 1, 1], 4], [1], "two values tie across the whole window"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 from a small range, k = 1 000, time limit", () => [VALUES_SMALL_RANGE(), 1000]),
      ],
    },
    {
      id: "sliding-window-mex", title: "Sliding Window Mex", cses: { id: 3219, name: "Sliding Window Mex" },
      goal: "The mex of every window of k elements: the smallest non-negative integer missing from it. Return n − k + 1 numbers.",
      concept: "A window of k values can contain at most k different ones, so its mex never exceeds k and every value above k can be ignored outright. Count the rest in a segment tree that keeps the smallest count in each range. The mex is then the leftmost position holding a zero, which one walk down from the root finds.",
      functionName: "slidingWindowMex", signature: "slidingWindowMex(values, k) → array",
      starterSource: starter("slidingWindowMex", "values, k", "Segment tree of counts over 0..k keeping range minima; descend left whenever the left child still holds a zero."),
      solve: slidingWindowMex, comparator: "deep", brute: slidingWindowMexBrute, small: (round) => { const args = smallWindow(round, 900, 4); return [args[0].map((value) => value - 1), args[1]]; },
      reference: book("8.3", "Amortized analysis · sliding window"),
      presets: { "CSES sample": { a: SAMPLE_MEX, b: 3 }, "zero missing": { a: [1, 1, 1, 1], b: 2 }, "a full run": { a: [0, 1, 2, 3], b: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("never-removes", "The value leaving the window has to be uncounted, otherwise the counts only ever grow and the mex can never come back down.", function slidingWindowMex(values, k) { let width = 1; while (width < k + 2) width *= 2; const tree = new Int32Array(2 * width); const bump = (value, delta) => { if (value > k) return; let node = width + value; tree[node] += delta; node >>= 1; while (node >= 1) { tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]); node >>= 1; } }; const out = []; for (let i = 0; i < values.length; i += 1) { bump(values[i], 1); if (i >= k - 1) { let node = 1; while (node < width) node = tree[2 * node] === 0 ? 2 * node : 2 * node + 1; out.push(node - width); } } return out; }),
        diagnosis("descends-right-first", "The mex is the leftmost missing value, so the walk takes the left child whenever it still holds a zero.", function slidingWindowMex(values, k) { let width = 1; while (width < k + 2) width *= 2; const tree = new Int32Array(2 * width); const bump = (value, delta) => { if (value > k) return; let node = width + value; tree[node] += delta; node >>= 1; while (node >= 1) { tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]); node >>= 1; } }; const out = []; for (let i = 0; i < values.length; i += 1) { bump(values[i], 1); if (i >= k) bump(values[i - k], -1); if (i >= k - 1) { let node = 1; while (node < width) node = tree[2 * node + 1] === 0 ? 2 * node + 1 : 2 * node; out.push(node - width); } } return out; }),
      ],
      hints: ["Only values from 0 to k can matter; ignore anything larger.", "Store counts in a segment tree whose nodes keep the minimum count below them.", "Descend from the root taking the left child whenever its minimum is 0; the leaf you land on is the mex."],
      cases: [
        example([SAMPLE_MEX, 3], [0, 3, 2, 2, 0, 2], "CSES sample"),
        example([[1, 1, 1, 1], 2], [0, 0, 0], "zero is always missing"),
        example([[0, 1, 2, 3], 3], [3, 0], "a full run, then zero goes missing"),
        example([[0, 0, 0], 1], [1, 1, 1], "windows of one"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MEX(), 1000]),
      ],
    },
    {
      id: "compress-values", title: "Value Compression", cses: { id: 1076, name: "Sliding Window Median (brick)" },
      goal: "Return { unique, ranks }: the distinct values in increasing order, and for each input value its position in that list.",
      concept: "A Fenwick tree is indexed by position, not by value, and these tasks have values up to a billion with at most a few hundred thousand of them. Sorting the distinct values turns each one into a small index, which is what makes counting structures over them possible at all. The lookup is a binary search, so the whole thing costs one sort.",
      functionName: "compressValues", signature: "compressValues(values) → { unique, ranks }",
      starterSource: starter("compressValues", "values", "Sort a copy, drop repeats into unique, then map every value to its index with lowerBound."),
      solve: compressValues, comparator: "deep", dependencies: ["lower-bound"], brute: compressValuesBrute, small: (round) => [smallValues(1000 + round, 1 + (round % 9), 5)],
      reference: book("9.1", "Range queries · index compression"),
      presets: { "CSES sample": { a: SAMPLE_MEDIAN }, repeats: { a: [7, 7, 3, 7, 3] }, sorted: { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("keeps-repeats", "unique holds each distinct value once, so repeated values share a rank.", function compressValues(values) { const unique = values.slice().sort((p, q) => p - q); const ranks = values.map((value) => lowerBound(unique, value)); return { unique, ranks }; }),
        diagnosis("sorts-in-place", "Sorting the given array rearranges the caller's values, so the ranks then describe the wrong order.", function compressValues(values) { const unique = []; const sorted = values.sort((p, q) => p - q); for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) unique.push(sorted[i]); const ranks = new Array(values.length); for (let i = 0; i < values.length; i += 1) ranks[i] = lowerBound(unique, values[i]); return { unique, ranks }; }),
      ],
      hints: ["Sort a copy of the values so the input is left alone.", "Walk the sorted copy and keep a value only when it differs from the one before it.", "ranks[i] = lowerBound(unique, values[i])."],
      cases: [
        example([SAMPLE_MEDIAN], { unique: [1, 2, 3, 4, 5, 8], ranks: [1, 3, 2, 4, 5, 0, 1, 0] }, "CSES sample values"),
        example([[7, 7, 3, 7, 3]], { unique: [3, 7], ranks: [1, 1, 0, 1, 0] }, "repeats share a rank"),
        example([[1, 2, 3]], { unique: [1, 2, 3], ranks: [0, 1, 2] }, "already sorted"),
        example([[5]], { unique: [5], ranks: [0] }, "one value"),
        hidden("n = 100 000, time limit", () => [VALUES_MID()]),
      ],
    },
    {
      id: "sliding-window-median", title: "Sliding Window Median", cses: { id: 1076, name: "Sliding Window Median" },
      goal: "The median of every window of k elements, taking the smaller of the two middles when k is even. Return n − k + 1 numbers.",
      concept: "The median is an order statistic, and a Fenwick tree of counts over the compressed values answers order statistics directly: walk down the tree spending the count at each step, and land on the position where the running total first reaches the one you want. Sliding the window is two count updates.",
      functionName: "slidingWindowMedian", signature: "slidingWindowMedian(values, k) → array",
      starterSource: starter("slidingWindowMedian", "values, k", "Compress; Fenwick of counts; the answer is the ⌊(k + 1) / 2⌋-th smallest, found with fenwickKth."),
      solve: slidingWindowMedian, comparator: "deep", dependencies: ["compress-values", "fenwick-add", "fenwick-kth"], brute: slidingWindowMedianBrute, small: (round) => smallWindow(round, 1100, 8),
      reference: book("9.2", "Fenwick tree · order statistics"),
      presets: { "CSES sample": { a: SAMPLE_MEDIAN, b: 3 }, "an even window": { a: SAMPLE_MEDIAN, b: 4 }, "all equal": { a: [6, 6, 6, 6], b: 2 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("larger-middle", "For an even window the task asks for the smaller of the two middles, which is the ⌊(k + 1) / 2⌋-th and not the (k / 2 + 1)-th.", function slidingWindowMedian(values, k) { const table = compressValues(values); const unique = table.unique, ranks = table.ranks; const tree = new Array(unique.length + 1).fill(0); const out = []; const middle = Math.floor(k / 2) + 1; for (let i = 0; i < values.length; i += 1) { fenwickAdd(tree, ranks[i] + 1, 1); if (i >= k) fenwickAdd(tree, ranks[i - k] + 1, -1); if (i >= k - 1) out.push(unique[fenwickKth(tree, middle) - 1]); } return out; }),
        diagnosis("reports-the-rank", "fenwickKth gives a position in the compressed list; the answer is the value stored there.", function slidingWindowMedian(values, k) { const table = compressValues(values); const ranks = table.ranks; const tree = new Array(table.unique.length + 1).fill(0); const out = []; const middle = Math.floor((k + 1) / 2); for (let i = 0; i < values.length; i += 1) { fenwickAdd(tree, ranks[i] + 1, 1); if (i >= k) fenwickAdd(tree, ranks[i - k] + 1, -1); if (i >= k - 1) out.push(fenwickKth(tree, middle)); } return out; }),
      ],
      hints: ["Compress once, then keep a Fenwick tree of counts indexed by rank + 1.", "Add the arriving value's rank and subtract the leaving one's.", "The median is unique[fenwickKth(tree, ⌊(k + 1) / 2⌋) − 1]."],
      cases: [
        example([SAMPLE_MEDIAN, 3], [3, 4, 5, 5, 2, 1], "CSES sample"),
        run(slidingWindowMedian, [SAMPLE_MEDIAN, 4], "an even window takes the smaller middle"),
        example([[6, 6, 6, 6], 2], [6, 6, 6], "all equal"),
        example([[9], 1], [9], "one element"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 already sorted, k = 1 000, time limit", () => [VALUES_SORTED(), 1000]),
      ],
    },
    {
      id: "sliding-window-cost", title: "Sliding Window Cost", cses: { id: 1077, name: "Sliding Window Cost" },
      goal: "For every window of k elements, the smallest total cost of making all of them equal, where changing a value costs the difference. Return n − k + 1 numbers.",
      concept: "The cheapest target is the median, because moving it towards either side gains as many values as it loses. With the median known, the cost is the values above it minus the values below it, adjusted by how many sit on each side. A second Fenwick tree holding sums answers that in the same walk that finds the median.",
      functionName: "slidingWindowCost", signature: "slidingWindowCost(values, k) → array",
      starterSource: starter("slidingWindowCost", "values, k", "Two Fenwick trees over the ranks, one of counts and one of sums; cost = median · below − sumBelow + sumAbove − median · above."),
      solve: slidingWindowCost, comparator: "deep", dependencies: ["compress-values", "fenwick-add", "fenwick-prefix", "fenwick-kth"], brute: slidingWindowCostBrute, small: (round) => smallWindow(round, 1200, 8),
      reference: book("9.2", "Fenwick tree · order statistics"),
      presets: { "CSES sample": { a: SAMPLE_MEDIAN, b: 3 }, "already equal": { a: [5, 5, 5, 5], b: 2 }, "a wide spread": { a: [1, 100, 1, 100], b: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("targets-the-mean", "The mean minimises the squared distance; for plain differences the median is what costs least.", function slidingWindowCost(values, k) { const out = []; let total = 0; for (let i = 0; i < values.length; i += 1) { total += values[i]; if (i >= k) total -= values[i - k]; if (i >= k - 1) { const target = Math.round(total / k); let cost = 0; for (let j = i - k + 1; j <= i; j += 1) cost += Math.abs(values[j] - target); out.push(cost); } } return out; }),
        diagnosis("one-sided", "The values above the median cost as much to bring down as the ones below cost to bring up; both halves count.", function slidingWindowCost(values, k) { const table = compressValues(values); const unique = table.unique, ranks = table.ranks; const counts = new Array(unique.length + 1).fill(0); const sums = new Array(unique.length + 1).fill(0); const out = []; const middle = Math.floor((k + 1) / 2); for (let i = 0; i < values.length; i += 1) { fenwickAdd(counts, ranks[i] + 1, 1); fenwickAdd(sums, ranks[i] + 1, values[i]); if (i >= k) { fenwickAdd(counts, ranks[i - k] + 1, -1); fenwickAdd(sums, ranks[i - k] + 1, -values[i - k]); } if (i >= k - 1) { const position = fenwickKth(counts, middle); const median = unique[position - 1]; const below = fenwickPrefix(counts, position); const belowSum = fenwickPrefix(sums, position); out.push(median * below - belowSum); } } return out; }),
      ],
      hints: ["Keep the running total of the window as well as the two Fenwick trees.", "position = fenwickKth(counts, ⌊(k + 1) / 2⌋); median = unique[position − 1]; below and belowSum are the prefixes up to position.", "cost = (median · below − belowSum) + ((total − belowSum) − median · (k − below))."],
      cases: [
        example([SAMPLE_MEDIAN, 3], [2, 2, 5, 7, 7, 1], "CSES sample"),
        example([[5, 5, 5, 5], 2], [0, 0, 0], "already equal"),
        run(slidingWindowCost, [[1, 100, 1, 100], 3], "a wide spread"),
        example([[9], 1], [0], "one element"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 already sorted, k = 1 000, time limit", () => [VALUES_SORTED(), 1000]),
      ],
    },
    {
      id: "sliding-window-inversions", title: "Sliding Window Inversions", cses: { id: 3223, name: "Sliding Window Inversions" },
      goal: "The number of inversions in every window of k elements, an inversion being an earlier element larger than a later one. Return n − k + 1 numbers.",
      concept: "Recounting each window is far too slow, but the change from one window to the next is small. The value arriving at the right makes an inversion with every larger value already in the window, and the value leaving at the left takes with it one inversion for every smaller value still there. Both counts are a single Fenwick range query over the compressed values.",
      functionName: "slidingWindowInversions", signature: "slidingWindowInversions(values, k) → array",
      starterSource: starter("slidingWindowInversions", "values, k", "Fenwick of counts over the ranks; on arrival add the number of larger values present, on departure subtract the number of smaller ones."),
      solve: slidingWindowInversions, comparator: "deep", dependencies: ["compress-values", "fenwick-add", "fenwick-prefix"], brute: slidingWindowInversionsBrute, small: (round) => smallWindow(round, 1300, 8),
      reference: book("9.2", "Fenwick tree · counting inversions"),
      presets: { "CSES sample": { a: SAMPLE_MODE, b: 3 }, decreasing: { a: [4, 3, 2, 1], b: 3 }, increasing: { a: [1, 2, 3, 4], b: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-smaller-on-arrival", "An arriving value sits at the right end, so it pairs with the larger values already present, not the smaller ones.", function slidingWindowInversions(values, k) { const table = compressValues(values); const ranks = table.ranks; const tree = new Array(table.unique.length + 1).fill(0); const out = []; let inversions = 0, inside = 0; for (let i = 0; i < values.length; i += 1) { inversions += fenwickPrefix(tree, ranks[i]); fenwickAdd(tree, ranks[i] + 1, 1); inside += 1; if (i >= k) { const leaving = ranks[i - k]; fenwickAdd(tree, leaving + 1, -1); inside -= 1; inversions -= fenwickPrefix(tree, leaving); } if (i >= k - 1) out.push(inversions); } return out; }),
        diagnosis("counts-equals-on-exit", "Only strictly smaller values behind it were inversions with the leaving value; counting the equal ones too removes pairs that were never there.", function slidingWindowInversions(values, k) { const table = compressValues(values); const ranks = table.ranks; const tree = new Array(table.unique.length + 1).fill(0); const out = []; let inversions = 0, inside = 0; for (let i = 0; i < values.length; i += 1) { inversions += inside - fenwickPrefix(tree, ranks[i] + 1); fenwickAdd(tree, ranks[i] + 1, 1); inside += 1; if (i >= k) { const leaving = ranks[i - k]; fenwickAdd(tree, leaving + 1, -1); inside -= 1; inversions -= fenwickPrefix(tree, leaving + 1); } if (i >= k - 1) out.push(inversions); } return out; }),
      ],
      hints: ["Compress the values and keep a Fenwick tree of how many of each rank sit in the window, plus how many are in it altogether.", "Arriving: add (count in the window) − (count of ranks ≤ its own), which is the number of strictly larger values.", "Leaving: after removing it, subtract the number of ranks strictly below it that remain."],
      cases: [
        example([SAMPLE_MODE, 3], [0, 1, 1, 1, 2, 0], "CSES sample"),
        example([[4, 3, 2, 1], 3], [3, 3], "every pair inverted"),
        example([[1, 2, 3, 4], 3], [0, 0], "already sorted"),
        example([[2, 2, 2], 2], [0, 0], "equal values are not inversions"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 already sorted, k = 1 000, time limit", () => [VALUES_SORTED(), 1000]),
      ],
    },
    {
      id: "sliding-window-advertisement", title: "Sliding Window Advertisement", cses: { id: 3227, name: "Sliding Window Advertisement" },
      goal: "For every window of k boards, the largest rectangle that fits under those board heights. Return n − k + 1 numbers.",
      concept: "Every rectangle is as tall as its shortest board, so each board owns the stretch around it where nothing is shorter. Inside a window that stretch is clipped by the window's own ends, and the clipped width is either constant or moves one for one with the window's start. So each board becomes a straight line over the range of window starts it can serve, and the answer for each start is the highest line above it, which is what the Li Chao tree from the Geometry section reports.",
      functionName: "slidingWindowAdvertisement", signature: "slidingWindowAdvertisement(values, k) → array",
      starterSource: starter("slidingWindowAdvertisement", "values, k", "Nearest smaller board on each side gives every board its stretch; split into the four clipping cases; insert each as a line over its range of starts and query every start."),
      solve: slidingWindowAdvertisement, comparator: "deep", dependencies: ["li-chao-insert-range", "li-chao-query"], brute: slidingWindowAdvertisementBrute, small: (round) => smallWindow(round, 1400, 6),
      reference: book("8.3", "Amortized analysis · largest rectangle"),
      presets: { "CSES sample": { a: SAMPLE_FENCE, b: 3 }, "all equal": { a: [3, 3, 3, 3], b: 2 }, "a single tall board": { a: [1, 9, 1, 1], b: 2 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("tallest-board-only", "The best advertisement is often wide and short rather than tall and thin; every board has to be tried.", function slidingWindowAdvertisement(values, k) { const out = []; for (let i = 0; i + k <= values.length; i += 1) { let tallest = 0; for (let j = i; j < i + k; j += 1) if (values[j] > tallest) tallest = values[j]; out.push(tallest); } return out; }),
        diagnosis("ignores-the-window-edges", "A board's stretch has to be cut back to the window; using its full stretch reports rectangles that stick out of the window.", function slidingWindowAdvertisement(values, k) { const n = values.length; const left = new Array(n), right = new Array(n); const stack = []; for (let i = 0; i < n; i += 1) { while (stack.length && values[stack[stack.length - 1]] >= values[i]) stack.pop(); left[i] = stack.length ? stack[stack.length - 1] + 1 : 0; stack.push(i); } stack.length = 0; for (let i = n - 1; i >= 0; i -= 1) { while (stack.length && values[stack[stack.length - 1]] > values[i]) stack.pop(); right[i] = stack.length ? stack[stack.length - 1] - 1 : n - 1; stack.push(i); } const out = []; for (let l = 0; l + k <= n; l += 1) { let best = 0; for (let i = l; i < l + k; i += 1) { const area = values[i] * (right[i] - left[i] + 1); if (area > best) best = area; } out.push(best); } return out; }),
      ],
      hints: ["For each board find the first shorter board to its left and to its right; between them is its stretch [a, b].", "For a window starting at l the clipped width is min(l + k − 1, b) − max(l, a) + 1, which gives four cases: both ends free, the left clipped, the right clipped, or both.", "Each case is a line in l over a range of starts, so insert it with liChaoInsertRange and read every start with liChaoQuery."],
      cases: [
        example([SAMPLE_FENCE, 3], [5, 6, 9, 6, 6, 4], "CSES sample"),
        example([[3, 3, 3, 3], 2], [6, 6, 6], "all equal"),
        example([[1, 9, 1, 1], 2], [9, 9, 2], "a single tall board"),
        example([[5], 1], [5], "one board"),
        run(slidingWindowAdvertisement, [[2, 1, 2, 1, 2, 1, 2], 7], "one window over the whole fence"),
        hidden("n = 100 000, k = 1 000, time limit", () => [VALUES_MID(), 1000]),
        hidden("n = 100 000 already sorted, k = 1 000, time limit", () => [VALUES_SORTED(), 1000]),
      ],
    },
  ];
  core.share({ generatedArray, windowMinimums, compressValues });
  core.define("window", WINDOW);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

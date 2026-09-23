(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;

  // ------------------------------------------------------------------ 11 · bitwise operations · references
  function countingBits(n) {
    let total = 0n;
    for (let bit = 0; bit < 50; bit += 1) {
      const half = Math.pow(2, bit);
      if (half > n) break;
      const period = half * 2;
      const full = Math.floor((n + 1) / period);
      const rest = (n + 1) - full * period;
      total += BigInt(full) * BigInt(half) + BigInt(Math.max(0, rest - half));
    }
    return total.toString();
  }
  function maximumXorSubarray(values) {
    const BITS = 30;
    const n = values.length;
    const next = new Int32Array(2 * ((BITS + 1) * (n + 1) + 2));
    let nodes = 1;
    const insert = (value) => {
      let node = 0;
      for (let bit = BITS; bit >= 0; bit -= 1) {
        const side = (value >> bit) & 1;
        if (next[2 * node + side] === 0) { next[2 * node + side] = nodes; nodes += 1; }
        node = next[2 * node + side];
      }
    };
    const partner = (value) => {
      let node = 0, best = 0;
      for (let bit = BITS; bit >= 0; bit -= 1) {
        const side = (value >> bit) & 1;
        const other = side ^ 1;
        if (next[2 * node + other] !== 0) { best += Math.pow(2, bit); node = next[2 * node + other]; }
        else node = next[2 * node + side];
      }
      return best;
    };
    let running = 0, answer = 0;
    insert(0);
    for (let i = 0; i < n; i += 1) {
      running = (running ^ values[i]) >>> 0;
      const found = partner(running);
      if (found > answer) answer = found;
      insert(running);
    }
    return answer;
  }
  function xorBasis(values) {
    const pivots = new Array(31).fill(0);
    for (let i = 0; i < values.length; i += 1) {
      let current = values[i];
      for (let bit = 30; bit >= 0 && current !== 0; bit -= 1) {
        if (((current >> bit) & 1) === 0) continue;
        if (pivots[bit] === 0) { pivots[bit] = current; current = 0; break; }
        current ^= pivots[bit];
      }
    }
    for (let bit = 0; bit <= 30; bit += 1) {
      if (pivots[bit] === 0) continue;
      for (let higher = bit + 1; higher <= 30; higher += 1) {
        if (pivots[higher] !== 0 && ((pivots[higher] >> bit) & 1) === 1) pivots[higher] ^= pivots[bit];
      }
    }
    const out = [];
    for (let bit = 0; bit <= 30; bit += 1) if (pivots[bit] !== 0) out.push(pivots[bit]);
    return out;
  }
  function maximumXorSubset(values) {
    const basis = xorBasis(values);
    let answer = 0;
    for (let i = 0; i < basis.length; i += 1) answer ^= basis[i];
    return answer;
  }
  function numberOfSubsetXors(values) {
    return Math.pow(2, xorBasis(values).length);
  }
  function kSubsetXors(values, k) {
    const basis = xorBasis(values);
    const free = values.length - basis.length;
    const repeats = free >= 21 ? Infinity : Math.pow(2, free);
    const out = [];
    let index = 0;
    while (out.length < k) {
      let value = 0;
      for (let bit = 0; bit < basis.length; bit += 1) if ((index >> bit) & 1) value ^= basis[bit];
      const times = Math.min(repeats, k - out.length);
      for (let t = 0; t < times; t += 1) out.push(value);
      index += 1;
    }
    return out;
  }
  function walshHadamard(values) {
    const out = values.slice();
    const n = out.length;
    for (let width = 1; width < n; width *= 2) {
      for (let start = 0; start < n; start += 2 * width) {
        for (let i = start; i < start + width; i += 1) {
          const low = out[i], high = out[i + width];
          out[i] = low + high;
          out[i + width] = low - high;
        }
      }
    }
    return out;
  }
  function allSubarrayXors(values) {
    const n = values.length;
    const prefix = new Array(n + 1);
    prefix[0] = 0;
    let top = 0;
    for (let i = 0; i < n; i += 1) {
      prefix[i + 1] = (prefix[i] ^ values[i]) >>> 0;
      if (prefix[i + 1] > top) top = prefix[i + 1];
    }
    let width = 1;
    while (width <= top) width *= 2;
    const counts = new Float64Array(width);
    for (let i = 0; i <= n; i += 1) counts[prefix[i]] += 1;
    const spectrum = walshHadamard(counts);
    for (let i = 0; i < width; i += 1) spectrum[i] = spectrum[i] * spectrum[i];
    const pairs = walshHadamard(spectrum);
    const out = [];
    for (let value = 0; value < width; value += 1) {
      const count = Math.round(pairs[value] / width);
      if (value === 0 ? count > n + 1 : count > 0) out.push(value);
    }
    return out;
  }
  function xorPyramidPeak(values) {
    const mask = values.length - 1;
    let answer = 0;
    for (let i = 0; i < values.length; i += 1) if ((i & mask) === i) answer ^= values[i];
    return answer;
  }
  function submaskXor(values) {
    const out = values.slice();
    const n = out.length;
    for (let bit = 1; bit < n; bit *= 2) {
      for (let mask = 0; mask < n; mask += 1) if (mask & bit) out[mask] ^= out[mask ^ bit];
    }
    return out;
  }
  function xorPyramidDiagonal(values) {
    const n = values.length;
    let width = 1;
    while (width < n) width *= 2;
    const padded = new Array(width).fill(0);
    for (let i = 0; i < n; i += 1) padded[i] = values[i];
    return submaskXor(padded).slice(0, n);
  }
  function xorPyramidRow(values, k) {
    let current = values.slice();
    const drop = values.length - k;
    for (let bit = 1; bit <= drop; bit *= 2) {
      if ((drop & bit) === 0) continue;
      const next = new Array(current.length - bit);
      for (let j = 0; j + bit < current.length; j += 1) next[j] = (current[j] ^ current[j + bit]) >>> 0;
      current = next;
    }
    return current;
  }
  function submaskSums(values) {
    const out = values.slice();
    const n = out.length;
    for (let bit = 1; bit < n; bit *= 2) {
      for (let mask = 0; mask < n; mask += 1) if (mask & bit) out[mask] += out[mask ^ bit];
    }
    return out;
  }
  function sosBitProblem(values) {
    const n = values.length;
    let top = 0;
    for (let i = 0; i < n; i += 1) if (values[i] > top) top = values[i];
    let width = 1;
    while (width <= top) width *= 2;
    const counts = new Array(width).fill(0);
    for (let i = 0; i < n; i += 1) counts[values[i]] += 1;
    const below = submaskSums(counts);
    const above = counts.slice();
    for (let bit = 1; bit < width; bit *= 2) {
      for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit];
    }
    const full = width - 1;
    const out = new Array(n);
    for (let i = 0; i < n; i += 1) out[i] = [below[values[i]], above[values[i]], n - below[full ^ values[i]]];
    return out;
  }
  function andSubsetCount(values) {
    const MODULUS = 1000000007;
    const n = values.length;
    let width = 1;
    while (width <= n) width *= 2;
    const counts = new Array(width).fill(0);
    for (let i = 0; i < n; i += 1) counts[values[i]] += 1;
    const above = counts;
    for (let bit = 1; bit < width; bit *= 2) {
      for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit];
    }
    const power = new Array(n + 1);
    power[0] = 1;
    for (let i = 1; i <= n; i += 1) power[i] = power[i - 1] * 2 % MODULUS;
    const totals = new Array(width);
    for (let mask = 0; mask < width; mask += 1) totals[mask] = (power[above[mask]] - 1 + MODULUS) % MODULUS;
    for (let bit = 1; bit < width; bit *= 2) {
      for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) totals[mask] = (totals[mask] - totals[mask | bit] + MODULUS) % MODULUS;
    }
    return totals.slice(0, n + 1);
  }

  // ------------------------------------------------------------------ helpers, brute forces and generators for the stress tests
  function smallList(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) out.push(Math.floor(next() * top));
    return out;
  }
  function powerOfTwoList(seed, bits, top) {
    const next = rng(seed);
    const size = Math.pow(2, bits);
    const out = new Array(size);
    for (let i = 0; i < size; i += 1) out[i] = Math.floor(next() * top);
    return out;
  }
  function subsetXorsBrute(values) {
    const out = [];
    for (let mask = 0; mask < Math.pow(2, values.length); mask += 1) {
      let value = 0;
      for (let i = 0; i < values.length; i += 1) if (mask & (1 << i)) value ^= values[i];
      out.push(value);
    }
    return out;
  }
  function pyramidRowsBrute(values) {
    const rows = [values.slice()];
    while (rows[rows.length - 1].length > 1) {
      const previous = rows[rows.length - 1];
      const row = [];
      for (let i = 0; i + 1 < previous.length; i += 1) row.push(previous[i] ^ previous[i + 1]);
      rows.push(row);
    }
    return rows;
  }
  function countingBitsBrute(n) {
    let total = 0n;
    for (let value = 1; value <= n; value += 1) {
      let rest = value, ones = 0n;
      while (rest > 0) { ones += BigInt(rest & 1); rest = Math.floor(rest / 2); }
      total += ones;
    }
    return total.toString();
  }
  function maximumXorSubarrayBrute(values) {
    let best = 0;
    for (let i = 0; i < values.length; i += 1) {
      let running = 0;
      for (let j = i; j < values.length; j += 1) {
        running = (running ^ values[j]) >>> 0;
        if (running > best) best = running;
      }
    }
    return best;
  }
  function xorBasisCheck(args, out) {
    const values = args[0];
    if (!Array.isArray(out)) return false;
    const spanned = new Set(subsetXorsBrute(values));
    const fromBasis = new Set(subsetXorsBrute(out));
    if (spanned.size !== fromBasis.size) return false;
    let same = true;
    spanned.forEach((value) => { if (!fromBasis.has(value)) same = false; });
    return same && out.length === Math.round(Math.log2(spanned.size));
  }
  function maximumXorSubsetBrute(values) { return Math.max.apply(null, subsetXorsBrute(values)); }
  function numberOfSubsetXorsBrute(values) { return new Set(subsetXorsBrute(values)).size; }
  function kSubsetXorsBrute(values, k) { return subsetXorsBrute(values).sort((p, q) => p - q).slice(0, k); }
  function walshHadamardBrute(values) {
    const n = values.length;
    const out = new Array(n).fill(0);
    const parity = (value) => { let bits = 0, rest = value; while (rest > 0) { bits ^= rest & 1; rest >>= 1; } return bits; };
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) out[i] += parity(i & j) ? -values[j] : values[j];
    return out;
  }
  function allSubarrayXorsBrute(values) {
    const seen = new Set();
    for (let i = 0; i < values.length; i += 1) {
      let running = 0;
      for (let j = i; j < values.length; j += 1) { running = (running ^ values[j]) >>> 0; seen.add(running); }
    }
    return Array.from(seen).sort((p, q) => p - q);
  }
  function xorPyramidPeakBrute(values) { const rows = pyramidRowsBrute(values); return rows[rows.length - 1][0]; }
  function xorPyramidDiagonalBrute(values) { return pyramidRowsBrute(values).map((row) => row[0]); }
  function xorPyramidRowBrute(values, k) { return pyramidRowsBrute(values)[values.length - k]; }
  function submaskXorBrute(values) {
    return values.map((ignored, mask) => {
      let answer = 0;
      for (let sub = 0; sub < values.length; sub += 1) if ((sub & mask) === sub) answer ^= values[sub];
      return answer;
    });
  }
  function submaskSumsBrute(values) {
    return values.map((ignored, mask) => {
      let answer = 0;
      for (let sub = 0; sub < values.length; sub += 1) if ((sub & mask) === sub) answer += values[sub];
      return answer;
    });
  }
  function sosBitProblemBrute(values) {
    return values.map((x) => [
      values.filter((y) => (x | y) === x).length,
      values.filter((y) => (x & y) === x).length,
      values.filter((y) => (x & y) !== 0).length,
    ]);
  }
  function andSubsetCountBrute(values) {
    const n = values.length;
    const out = new Array(n + 1).fill(0);
    for (let mask = 1; mask < Math.pow(2, n); mask += 1) {
      let running = -1;
      for (let i = 0; i < n; i += 1) if (mask & (1 << i)) running = running === -1 ? values[i] : (running & values[i]);
      if (running >= 0 && running <= n) out[running] += 1;
    }
    return out;
  }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const VALUES_BIG = lazy(() => randomInts(1101, 200000, 0, 1000000000));
  const VALUES_MID = lazy(() => randomInts(1102, 100000, 0, 1000000000));
  const VALUES_NARROW = lazy(() => randomInts(1103, 200000, 0, 32767));
  const VALUES_MILLION = lazy(() => randomInts(1104, 100000, 1, 1000000));
  const VALUES_BOUNDED = lazy(() => randomInts(1105, 200000, 0, 200000));
  const MASKS_BIG = lazy(() => randomInts(1106, 32768, 0, 1000000000));
  const MASKS_SMALL = lazy(() => randomInts(1107, 32768, 0, 1000));
  const PEAK_BIG = lazy(() => randomInts(1108, 200000, 1, 1000000000));

  const SAMPLE_ARRAY = [5, 1, 5, 9];
  const SAMPLE_PYRAMID = [2, 10, 5, 12, 9, 5, 1, 5];
  const SAMPLE_SOS = [3, 7, 2, 9, 2];

  const BITWISE = [
    {
      id: "counting-bits", title: "Counting Bits", cses: { id: 1146, name: "Counting Bits" },
      goal: "How many one bits appear altogether in the binary forms of 1, 2, …, n. Return the total as a decimal string.",
      concept: "Look at one bit position at a time. Along the whole number line, bit b turns on and off in a block pattern of period 2ᵇ⁺¹: off for 2ᵇ numbers, then on for 2ᵇ. So the count for that bit is whole blocks times 2ᵇ, plus whatever of the last partial block has reached the on half. Fifty positions cover 10¹⁵, and the total passes 2⁵³, so it is summed in BigInt.",
      functionName: "countingBits", signature: "countingBits(n) → decimal string",
      starterSource: starter("countingBits", "n", "For each bit: period = 2ᵇ⁺¹; full blocks give 2ᵇ ones each; the leftover contributes whatever exceeds 2ᵇ."),
      solve: countingBits, comparator: "scalar", brute: countingBitsBrute, small: (round) => [1 + round * 7],
      reference: book("10.2", "Bit manipulation"),
      presets: { "CSES sample": { a: 7 }, "a power of two": { a: 8 }, one: { a: 1 } },
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 64 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("float-total", "The total passes 2⁵³ long before n reaches 10¹⁵, so a plain number stops counting by ones.", function countingBits(n) { let total = 0; for (let bit = 0; bit < 50; bit += 1) { const half = Math.pow(2, bit); if (half > n) break; const period = half * 2; const full = Math.floor((n + 1) / period); const rest = (n + 1) - full * period; total += full * half + Math.max(0, rest - half); } return String(total); }),
        diagnosis("forgets-the-partial-block", "The last block is usually cut off partway, and whatever of it has passed the halfway point still counts.", function countingBits(n) { let total = 0n; for (let bit = 0; bit < 50; bit += 1) { const half = Math.pow(2, bit); if (half > n) break; const period = half * 2; const full = Math.floor((n + 1) / period); total += BigInt(full) * BigInt(half); } return total.toString(); }),
      ],
      hints: ["Count each bit position on its own and add the results.", "For bit b: period = 2ᵇ⁺¹, full = ⌊(n + 1) / period⌋, and those blocks give full · 2ᵇ ones.", "The leftover is (n + 1) − full · period; it adds max(0, leftover − 2ᵇ)."],
      cases: [
        example([7], "12", "CSES sample"),
        example([1], "1", "just one"),
        example([8], "13", "a power of two"),
        run(countingBits, [1000000], "a million"),
        hidden("n = 10¹⁵, the largest allowed, time limit", () => [1000000000000000]),
      ],
    },
    {
      id: "maximum-xor-subarray", title: "Maximum Xor Subarray", cses: { id: 1655, name: "Maximum Xor Subarray" },
      goal: "The largest xor of any contiguous subarray.",
      concept: "The xor of a subarray is the xor of two prefix xors, so the question becomes: which two prefixes differ the most. Put every prefix into a binary trie from the top bit down. Then for a given prefix, walk the trie always trying the opposite bit first, because a differing bit high up beats every bit below it. Each walk is thirty steps.",
      functionName: "maximumXorSubarray", signature: "maximumXorSubarray(values) → number",
      starterSource: starter("maximumXorSubarray", "values", "Trie of prefix xors, starting with 0; for each new prefix take the opposite branch whenever it exists."),
      solve: maximumXorSubarray, comparator: "scalar", brute: maximumXorSubarrayBrute, small: (round) => [smallList(100 + round, 1 + (round % 9), 32)],
      reference: book("26.2", "Trie structure"),
      presets: { "CSES sample": { a: SAMPLE_ARRAY }, "one element": { a: [7] }, "all zeros": { a: [0, 0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("forgets-the-empty-prefix", "A subarray that starts at the beginning pairs with the empty prefix, so 0 has to be in the trie before the walk starts.", function maximumXorSubarray(values) { const BITS = 30; const n = values.length; const next = new Int32Array(2 * ((BITS + 1) * (n + 1) + 2)); let nodes = 1; const insert = (value) => { let node = 0; for (let bit = BITS; bit >= 0; bit -= 1) { const side = (value >> bit) & 1; if (next[2 * node + side] === 0) { next[2 * node + side] = nodes; nodes += 1; } node = next[2 * node + side]; } }; const partner = (value) => { let node = 0, best = 0; for (let bit = BITS; bit >= 0; bit -= 1) { const side = (value >> bit) & 1; const other = side ^ 1; if (next[2 * node + other] !== 0) { best += Math.pow(2, bit); node = next[2 * node + other]; } else node = next[2 * node + side]; } return best; }; let running = 0, answer = 0; for (let i = 0; i < n; i += 1) { running = (running ^ values[i]) >>> 0; if (i > 0) { const found = partner(running); if (found > answer) answer = found; } insert(running); } return answer; }),
        diagnosis("same-branch-first", "The walk wants the branch that differs from the current bit, because that is what sets the bit in the xor.", function maximumXorSubarray(values) { const BITS = 30; const n = values.length; const next = new Int32Array(2 * ((BITS + 1) * (n + 1) + 2)); let nodes = 1; const insert = (value) => { let node = 0; for (let bit = BITS; bit >= 0; bit -= 1) { const side = (value >> bit) & 1; if (next[2 * node + side] === 0) { next[2 * node + side] = nodes; nodes += 1; } node = next[2 * node + side]; } }; const partner = (value) => { let node = 0, best = 0; for (let bit = BITS; bit >= 0; bit -= 1) { const side = (value >> bit) & 1; if (next[2 * node + side] !== 0) node = next[2 * node + side]; else { best += Math.pow(2, bit); node = next[2 * node + (side ^ 1)]; } } return best; }; let running = 0, answer = 0; insert(0); for (let i = 0; i < n; i += 1) { running = (running ^ values[i]) >>> 0; const found = partner(running); if (found > answer) answer = found; insert(running); } return answer; }),
      ],
      hints: ["Insert 0 into the trie first: it is the prefix before any element.", "Keep a running prefix xor; before inserting it, walk the trie for its best partner.", "At each bit prefer the child for the opposite bit, and add 2ᵇ to the answer when you can take it."],
      cases: [
        example([SAMPLE_ARRAY], 13, "CSES sample"),
        example([[7]], 7, "one element"),
        example([[0, 0, 0]], 0, "all zeros"),
        example([[1, 2, 4]], 7, "the whole array"),
        run(maximumXorSubarray, [[1000000000, 999999999, 123456789]], "large values"),
        hidden("n = 100 000 with values to 10⁹, time limit", () => [VALUES_MID()]),
      ],
    },
    {
      id: "xor-basis", title: "Xor Basis", cses: { id: 3191, name: "Maximum Xor Subset (brick)" },
      goal: "A reduced basis of the values under xor: the shortest list whose subset xors are exactly the subset xors of the input. Return it in increasing order, fully reduced so that each leading bit appears in only one entry.",
      concept: "Under xor the integers behave like vectors over the two element field, so a set of numbers has a basis and a rank exactly as vectors do. Insert each value by cancelling it against the entry that owns its top bit; whatever survives owns a new top bit, and a value that cancels to zero added nothing. Reducing afterwards, so that no entry carries another entry's leading bit, is what makes the span easy to walk in order later.",
      functionName: "xorBasis", signature: "xorBasis(values) → array",
      starterSource: starter("xorBasis", "values", "pivots[bit] owns that leading bit; cancel a value down until it finds an empty bit or vanishes; then clear each pivot bit out of the entries above it."),
      solve: xorBasis, comparator: "deep", check: xorBasisCheck, small: (round) => [smallList(200 + round, 1 + (round % 9), 32)],
      reference: book("10.2", "Bit manipulation · xor"),
      presets: { "CSES sample": { a: [1, 6, 12, 6] }, dependent: { a: [3, 6, 5] }, "all zeros": { a: [0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("not-reduced", "Leaving one entry's leading bit inside another still spans the same set, but the span can no longer be walked in order by the bits of an index.", function xorBasis(values) { const pivots = new Array(31).fill(0); for (let i = 0; i < values.length; i += 1) { let current = values[i]; for (let bit = 30; bit >= 0 && current !== 0; bit -= 1) { if (((current >> bit) & 1) === 0) continue; if (pivots[bit] === 0) { pivots[bit] = current; current = 0; break; } current ^= pivots[bit]; } } const out = []; for (let bit = 0; bit <= 30; bit += 1) if (pivots[bit] !== 0) out.push(pivots[bit]); return out; }),
        diagnosis("keeps-dependent-values", "A value that cancels away to zero is already covered by the entries it cancelled against, so it must not be added.", function xorBasis(values) { const pivots = new Array(31).fill(0); const extra = []; for (let i = 0; i < values.length; i += 1) { let current = values[i]; for (let bit = 30; bit >= 0 && current !== 0; bit -= 1) { if (((current >> bit) & 1) === 0) continue; if (pivots[bit] === 0) { pivots[bit] = current; current = 0; break; } current ^= pivots[bit]; } if (current === 0 && values[i] !== 0) extra.push(values[i]); } for (let bit = 0; bit <= 30; bit += 1) { if (pivots[bit] === 0) continue; for (let higher = bit + 1; higher <= 30; higher += 1) if (pivots[higher] !== 0 && ((pivots[higher] >> bit) & 1) === 1) pivots[higher] ^= pivots[bit]; } const out = []; for (let bit = 0; bit <= 30; bit += 1) if (pivots[bit] !== 0) out.push(pivots[bit]); return out.concat(extra).sort((p, q) => p - q); }),
      ],
      hints: ["Keep pivots[bit] for the entry whose highest set bit is bit.", "Walk a value from bit 30 down: skip clear bits; take an empty pivot slot; otherwise xor by the pivot there and carry on.", "Afterwards, for each pivot from the bottom up, clear its bit out of every higher pivot, then list the non-zero pivots in increasing order."],
      cases: [
        example([[1, 6, 12, 6]], [1, 6, 10], "CSES sample values"),
        example([[3, 6, 5]], [3, 5], "the third value is dependent, and reducing changes the second"),
        example([[0, 0]], [], "zeros span nothing"),
        example([[1, 2, 4]], [1, 2, 4], "already independent"),
        example([[8, 12]], [4, 8], "reduction changes the entries"),
        hidden("n = 200 000 with values to 10⁹, time limit", () => [VALUES_BIG()]),
      ],
    },
    {
      id: "maximum-xor-subset", title: "Maximum Xor Subset", cses: { id: 3191, name: "Maximum Xor Subset" },
      goal: "The largest xor obtainable from any subset of the values.",
      concept: "In a reduced basis every entry owns a bit that no other entry has, so including it always turns that bit on and can never turn another entry's bit off. There is nothing to weigh up: the maximum is the xor of the whole basis.",
      functionName: "maximumXorSubset", signature: "maximumXorSubset(values) → number",
      starterSource: starter("maximumXorSubset", "values", "xorBasis, then xor every entry together."),
      solve: maximumXorSubset, comparator: "scalar", dependencies: ["xor-basis"], brute: maximumXorSubsetBrute, small: (round) => [smallList(300 + round, 1 + (round % 9), 32)],
      reference: book("10.2", "Bit manipulation · xor"),
      presets: { "CSES sample": { a: [1, 6, 12, 6] }, dependent: { a: [3, 6, 5] }, "all zeros": { a: [0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("largest-value", "The best subset usually combines several values; the largest single one is only a starting point.", function maximumXorSubset(values) { let best = 0; for (let i = 0; i < values.length; i += 1) if (values[i] > best) best = values[i]; return best; }),
        diagnosis("greedy-on-raw-values", "Folding the values in as they come ignores that an earlier choice can be undone; the basis is what removes the interference.", function maximumXorSubset(values) { let answer = 0; for (let i = 0; i < values.length; i += 1) if ((answer ^ values[i]) > answer) answer ^= values[i]; return answer; }),
      ],
      hints: ["Build the reduced basis first.", "Every entry owns a leading bit that no other entry touches.", "So xor them all together and return that."],
      cases: [
        example([[1, 6, 12, 6]], 13, "CSES sample"),
        example([[3, 6, 5]], 6, "a dependent value adds nothing"),
        example([[0, 0]], 0, "all zeros"),
        example([[8, 12]], 12, "two values"),
        hidden("n = 200 000 with values to 10⁹, time limit", () => [VALUES_BIG()]),
      ],
    },
    {
      id: "number-of-subset-xors", title: "Number of Subset Xors", cses: { id: 3211, name: "Number of Subset Xors" },
      goal: "How many different values appear as the xor of some subset, counting the empty subset's zero.",
      concept: "The reachable values are exactly the span of the basis, and a span over the two element field has one element for each combination of basis entries. So the count is two to the rank, however many values were given.",
      functionName: "numberOfSubsetXors", signature: "numberOfSubsetXors(values) → number",
      starterSource: starter("numberOfSubsetXors", "values", "2 to the power of the basis length."),
      solve: numberOfSubsetXors, comparator: "scalar", dependencies: ["xor-basis"], brute: numberOfSubsetXorsBrute, small: (round) => [smallList(400 + round, 1 + (round % 9), 32)],
      reference: book("10.2", "Bit manipulation · xor"),
      presets: { "CSES sample": { a: [3, 6, 5] }, independent: { a: [1, 2, 4] }, "all zeros": { a: [0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("two-to-the-n", "Different subsets very often share a xor; the count is two to the rank, not two to the number of values.", function numberOfSubsetXors(values) { return Math.pow(2, values.length); }),
        diagnosis("forgets-the-empty-subset", "The empty subset xors to zero, and zero is always one of the reachable values.", function numberOfSubsetXors(values) { return Math.pow(2, xorBasis(values).length) - 1; }),
      ],
      hints: ["The reachable set is the span of the basis.", "Every choice of basis entries gives a different value, and every value comes from exactly one choice.", "So the answer is 2 raised to the basis length."],
      cases: [
        example([[3, 6, 5]], 4, "CSES sample"),
        example([[1, 2, 4]], 8, "three independent values"),
        example([[0, 0]], 1, "only zero is reachable"),
        example([[5, 5, 5]], 2, "one distinct value"),
        hidden("n = 200 000 with values to 10⁹, time limit", () => [VALUES_BIG()]),
      ],
    },
    {
      id: "k-subset-xors", title: "K Subset Xors", cses: { id: 3192, name: "K Subset Xors" },
      goal: "The k smallest subset xors, counted with repetition over all 2ⁿ subsets, in increasing order.",
      concept: "Every reachable value is produced by the same number of subsets, namely two to the power of however many values were dependent. And because the basis is reduced, reading the bits of an index as a choice of basis entries lists the span in increasing order. So walk the index upwards, repeat each value that many times, and stop at k. When the repeat count already exceeds k the answer is just k zeros.",
      functionName: "kSubsetXors", signature: "kSubsetXors(values, k) → array",
      starterSource: starter("kSubsetXors", "values, k", "basis = xorBasis(values); index 0, 1, 2 … gives the span in order; each value repeats 2^(n − rank) times."),
      solve: kSubsetXors, comparator: "deep", dependencies: ["xor-basis"], brute: kSubsetXorsBrute, small: (round) => { const list = smallList(500 + round, 1 + (round % 8), 16); return [list, 1 + (round % Math.pow(2, list.length))]; },
      reference: book("10.2", "Bit manipulation · xor"),
      presets: { "CSES sample": { a: [3, 5, 14, 8], b: 9 }, "all zeros": { a: [0, 0], b: 3 }, independent: { a: [1, 2], b: 4 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("distinct-only", "Subsets are counted with repetition, so each reachable value appears two to the power of the dependent count times.", function kSubsetXors(values, k) { const basis = xorBasis(values); const out = []; let index = 0; while (out.length < k) { let value = 0; for (let bit = 0; bit < basis.length; bit += 1) if ((index >> bit) & 1) value ^= basis[bit]; out.push(value); index += 1; } return out; }),
        diagnosis("index-bits-unsorted", "Reading an index against an unreduced basis no longer walks the span in increasing order.", function kSubsetXors(values, k) { const pivots = new Array(31).fill(0); for (let i = 0; i < values.length; i += 1) { let current = values[i]; for (let bit = 30; bit >= 0 && current !== 0; bit -= 1) { if (((current >> bit) & 1) === 0) continue; if (pivots[bit] === 0) { pivots[bit] = current; current = 0; break; } current ^= pivots[bit]; } } const basis = []; for (let bit = 0; bit <= 30; bit += 1) if (pivots[bit] !== 0) basis.push(pivots[bit]); const free = values.length - basis.length; const repeats = free >= 21 ? Infinity : Math.pow(2, free); const out = []; let index = 0; while (out.length < k) { let value = 0; for (let bit = 0; bit < basis.length; bit += 1) if ((index >> bit) & 1) value ^= basis[bit]; const times = Math.min(repeats, k - out.length); for (let t = 0; t < times; t += 1) out.push(value); index += 1; } return out; }),
      ],
      hints: ["rank is the basis length; every reachable value comes from 2^(n − rank) subsets.", "For index 0, 1, 2, …, xor the basis entries whose position is set in the index; with a reduced basis that is increasing order.", "Push each value its repeat count of times, stopping as soon as k values are out."],
      cases: [
        example([[3, 5, 14, 8], 9], [0, 0, 3, 3, 5, 5, 6, 6, 8], "CSES sample"),
        example([[0, 0], 3], [0, 0, 0], "zeros repeat"),
        example([[1, 2], 4], [0, 1, 2, 3], "four distinct values"),
        run(kSubsetXors, [[7], 2], "one value"),
        hidden("n = 200 000, k = 200 000, time limit", () => [VALUES_BIG(), 200000]),
      ],
    },
    {
      id: "walsh-hadamard", title: "Walsh-Hadamard Transform", cses: { id: 3233, name: "All Subarray Xors (brick)" },
      goal: "Transform an array whose length is a power of two, so that multiplying two transforms pointwise and transforming back gives their xor convolution. The transform is its own inverse apart from dividing by the length.",
      concept: "It is the same butterfly shape as a fast Fourier transform, but over xor instead of addition, so the twiddle factors collapse to a plus and a minus. Pair each index with the one that differs in a single bit, replace the pair by its sum and its difference, and repeat for every bit. Running it twice returns the array scaled by its length, which is why the inverse needs no separate code.",
      functionName: "walshHadamard", signature: "walshHadamard(values) → array",
      starterSource: starter("walshHadamard", "values", "For width = 1, 2, 4 … pair i with i + width inside each block and replace them by low + high and low − high."),
      solve: walshHadamard, comparator: "deep", brute: walshHadamardBrute, small: (round) => [powerOfTwoList(600 + round, round % 4, 8)],
      reference: book("10.2", "Bit manipulation · xor convolution"),
      presets: { "two values": { a: [1, 2] }, "four values": { a: [1, 0, 0, 1] }, "an impulse": { a: [1, 0, 0, 0] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("sum-only", "Each butterfly produces both a sum and a difference; keeping only the sum throws away half the transform.", function walshHadamard(values) { const out = values.slice(); const n = out.length; for (let width = 1; width < n; width *= 2) { for (let start = 0; start < n; start += 2 * width) { for (let i = start; i < start + width; i += 1) { const low = out[i], high = out[i + width]; out[i] = low + high; out[i + width] = low + high; } } } return out; }),
        diagnosis("overwrites-the-partner", "Writing the sum before reading the partner loses the old value, so the difference comes out wrong.", function walshHadamard(values) { const out = values.slice(); const n = out.length; for (let width = 1; width < n; width *= 2) { for (let start = 0; start < n; start += 2 * width) { for (let i = start; i < start + width; i += 1) { out[i] = out[i] + out[i + width]; out[i + width] = out[i] - out[i + width]; } } } return out; }),
      ],
      hints: ["Copy the input; the length is already a power of two.", "For width = 1, 2, 4, … step through the array in blocks of 2 · width.", "Read low and high into locals first, then write low + high and low − high."],
      cases: [
        example([[1, 2]], [3, -1], "two values"),
        example([[1, 0, 0, 1]], [2, 0, 0, 2], "four values"),
        example([[1, 0, 0, 0]], [1, 1, 1, 1], "an impulse spreads out"),
        example([[5]], [5], "a single value"),
        run(walshHadamard, [[3, 1, 4, 1, 5, 9, 2, 6]], "eight values"),
        hidden("2¹⁵ values, time limit", () => [MASKS_SMALL()]),
      ],
    },
    {
      id: "all-subarray-xors", title: "All Subarray Xors", cses: { id: 3233, name: "All Subarray Xors" },
      goal: "Every distinct value that is the xor of some contiguous subarray, in increasing order.",
      concept: "A subarray xor is a xor of two prefix xors, so the reachable values are exactly the pairwise xors of the prefix set. Counting how many ordered pairs give each value is a xor convolution of the prefix indicator with itself, which the transform does in one pass: transform, square pointwise, transform back, divide by the length. Only zero needs care, because every prefix pairs with itself and contributes a count that was never a real subarray.",
      functionName: "allSubarrayXors", signature: "allSubarrayXors(values) → array",
      starterSource: starter("allSubarrayXors", "values", "Indicator of the prefix xors over a power-of-two width; transform, square, transform back; keep the values with a positive count, discounting the n + 1 self pairs at zero."),
      solve: allSubarrayXors, comparator: "deep", dependencies: ["walsh-hadamard"], brute: allSubarrayXorsBrute, small: (round) => [smallList(700 + round, 1 + (round % 9), 16)],
      reference: book("10.2", "Bit manipulation · xor convolution"),
      presets: { "CSES sample": { a: SAMPLE_ARRAY }, "one element": { a: [7] }, repeats: { a: [3, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("zero-always-counted", "Every prefix xors with itself to zero, so zero only counts when two different prefixes are equal.", function allSubarrayXors(values) { const n = values.length; const prefix = new Array(n + 1); prefix[0] = 0; let top = 0; for (let i = 0; i < n; i += 1) { prefix[i + 1] = (prefix[i] ^ values[i]) >>> 0; if (prefix[i + 1] > top) top = prefix[i + 1]; } let width = 1; while (width <= top) width *= 2; const counts = new Float64Array(width); for (let i = 0; i <= n; i += 1) counts[prefix[i]] += 1; const spectrum = walshHadamard(counts); for (let i = 0; i < width; i += 1) spectrum[i] = spectrum[i] * spectrum[i]; const pairs = walshHadamard(spectrum); const out = []; for (let value = 0; value < width; value += 1) if (Math.round(pairs[value] / width) > 0) out.push(value); return out; }),
        diagnosis("no-inverse-scale", "Running the transform twice multiplies everything by the length, so the counts have to be divided back down before they mean anything.", function allSubarrayXors(values) { const n = values.length; const prefix = new Array(n + 1); prefix[0] = 0; let top = 0; for (let i = 0; i < n; i += 1) { prefix[i + 1] = (prefix[i] ^ values[i]) >>> 0; if (prefix[i + 1] > top) top = prefix[i + 1]; } let width = 1; while (width <= top) width *= 2; const counts = new Float64Array(width); for (let i = 0; i <= n; i += 1) counts[prefix[i]] += 1; const spectrum = walshHadamard(counts); for (let i = 0; i < width; i += 1) spectrum[i] = spectrum[i] * spectrum[i]; const pairs = walshHadamard(spectrum); const out = []; for (let value = 0; value < width; value += 1) { const count = Math.round(pairs[value]); if (value === 0 ? count > n + 1 : count > 0) out.push(value); } return out; }),
      ],
      hints: ["Build the prefix xors including the empty prefix 0, and count each one in an array whose length is a power of two above the largest.", "transform, square every entry, transform again, then divide each entry by the length to get the number of ordered prefix pairs.", "Keep every value whose count is positive, except zero, which needs a count above n + 1 because of the self pairs."],
      cases: [
        example([SAMPLE_ARRAY], [1, 4, 5, 8, 9, 12, 13], "CSES sample"),
        example([[7]], [7], "one element"),
        example([[3, 3]], [0, 3], "two equal prefixes make zero reachable"),
        example([[0]], [0], "a single zero"),
        run(allSubarrayXors, [[1, 2, 3, 4, 5]], "five values"),
        hidden("n = 200 000 with values below 2¹⁵, time limit", () => [VALUES_NARROW()]),
      ],
    },
    {
      id: "xor-pyramid-peak", title: "Xor Pyramid Peak", cses: { id: 2419, name: "Xor Pyramid Peak" },
      goal: "The single value at the top of the pyramid, where each cell is the xor of the two cells below it.",
      concept: "Climbing n − 1 rows, the bottom cell at offset i reaches the top through C(n − 1, i) different paths, and xor only keeps what arrives an odd number of times. By Kummer's rule that binomial is odd exactly when i is a submask of n − 1, so the peak is the xor of the bottom cells at those offsets and nothing else has to be built.",
      functionName: "xorPyramidPeak", signature: "xorPyramidPeak(values) → number",
      starterSource: starter("xorPyramidPeak", "values", "mask = n − 1; xor values[i] for every i with (i & mask) === i."),
      solve: xorPyramidPeak, comparator: "scalar", brute: xorPyramidPeakBrute, small: (round) => [smallList(800 + round, 1 + (round % 9), 64)],
      reference: book("10.2", "Bit manipulation"),
      presets: { "CSES sample": { a: SAMPLE_PYRAMID }, "one cell": { a: [5] }, "two cells": { a: [6, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("xors-everything", "Only the offsets that are submasks of n − 1 reach the top an odd number of times; the rest cancel.", function xorPyramidPeak(values) { let answer = 0; for (let i = 0; i < values.length; i += 1) answer ^= values[i]; return answer; }),
        diagnosis("mask-off-by-one", "The climb is n − 1 rows tall, so the submask test is against n − 1 rather than n.", function xorPyramidPeak(values) { const mask = values.length; let answer = 0; for (let i = 0; i < values.length; i += 1) if ((i & mask) === i) answer ^= values[i]; return answer; }),
      ],
      hints: ["A bottom cell reaches the top through C(n − 1, i) paths.", "That count is odd exactly when i & (n − 1) === i.", "Xor those cells together."],
      cases: [
        example([SAMPLE_PYRAMID], 9, "CSES sample"),
        example([[5]], 5, "one cell"),
        example([[6, 3]], 5, "two cells"),
        example([[1, 2, 3]], 2, "three cells drop the middle"),
        run(xorPyramidPeak, [[1, 2, 3, 4, 5]], "five cells"),
        hidden("n = 200 000, time limit", () => [PEAK_BIG()]),
      ],
    },
    {
      id: "submask-xor", title: "Submask Xor", cses: { id: 3194, name: "Xor Pyramid Diagonal (brick)" },
      goal: "For every mask, the xor of the entries at all of its submasks. The input length is a power of two and the result has the same length.",
      concept: "Doing it directly costs three to the number of bits. Instead handle one bit at a time: once every mask already holds the answer for its submasks within the earlier bits, a mask containing the new bit just needs the entry for itself with that bit removed. One pass per bit, each touching every mask once.",
      functionName: "submaskXor", signature: "submaskXor(values) → array",
      starterSource: starter("submaskXor", "values", "For each bit, for each mask holding that bit: out[mask] ^= out[mask ^ bit]."),
      solve: submaskXor, comparator: "deep", brute: submaskXorBrute, small: (round) => [powerOfTwoList(900 + round, round % 4, 32)],
      reference: book("10.3", "Bit manipulation · sum over subsets"),
      presets: { "four entries": { a: [1, 2, 4, 8] }, "an impulse": { a: [7, 0, 0, 0] }, "two entries": { a: [3, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("wrong-direction", "The entry to fold in is the one with the bit removed, not the one with it added.", function submaskXor(values) { const out = values.slice(); const n = out.length; for (let bit = 1; bit < n; bit *= 2) { for (let mask = 0; mask < n; mask += 1) if ((mask & bit) === 0) out[mask] ^= out[mask | bit]; } return out; }),
        diagnosis("one-pass-only", "One sweep over the lowest bit only reaches submasks that differ in that bit; every bit needs its own pass.", function submaskXor(values) { const out = values.slice(); const n = out.length; for (let mask = 0; mask < n; mask += 1) if (mask & 1) out[mask] ^= out[mask ^ 1]; return out; }),
      ],
      hints: ["Start from a copy of the input.", "Loop bit over 1, 2, 4, … up to the length.", "For every mask that contains that bit, xor in the entry at mask without the bit."],
      cases: [
        example([[1, 2, 4, 8]], [1, 3, 5, 15], "four entries"),
        example([[7, 0, 0, 0]], [7, 7, 7, 7], "an impulse reaches every mask"),
        example([[3, 5]], [3, 6], "two entries"),
        example([[9]], [9], "one entry"),
        run(submaskXor, [[1, 2, 3, 4, 5, 6, 7, 8]], "eight entries"),
        hidden("2¹⁵ entries, time limit", () => [MASKS_BIG()]),
      ],
    },
    {
      id: "xor-pyramid-diagonal", title: "Xor Pyramid Diagonal", cses: { id: 3194, name: "Xor Pyramid Diagonal" },
      goal: "The leftmost value of every row, from the bottom row up to the peak.",
      concept: "The leftmost cell r rows up is the xor of the bottom cells at offsets that are submasks of r, the same rule the peak used with r = n − 1. So all n answers are one submask xor over the bottom row, padded up to a power of two so the masks line up.",
      functionName: "xorPyramidDiagonal", signature: "xorPyramidDiagonal(values) → array",
      starterSource: starter("xorPyramidDiagonal", "values", "Pad to a power of two, run submaskXor, and keep the first n entries."),
      solve: xorPyramidDiagonal, comparator: "deep", dependencies: ["submask-xor"], brute: xorPyramidDiagonalBrute, small: (round) => [smallList(1000 + round, 1 + (round % 9), 64)],
      reference: book("10.3", "Bit manipulation · sum over subsets"),
      presets: { "CSES sample": { a: SAMPLE_PYRAMID }, "one cell": { a: [5] }, "three cells": { a: [1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("running-xor", "Row r takes the submasks of r, not the first r + 1 cells; those only agree while r is one less than a power of two.", function xorPyramidDiagonal(values) { const out = []; let running = 0; for (let i = 0; i < values.length; i += 1) { running ^= values[i]; out.push(running); } return out; }),
        diagnosis("top-down", "The rows are asked for from the bottom upwards, so the peak comes last.", function xorPyramidDiagonal(values) { const n = values.length; let width = 1; while (width < n) width *= 2; const padded = new Array(width).fill(0); for (let i = 0; i < n; i += 1) padded[i] = values[i]; return submaskXor(padded).slice(0, n).reverse(); }),
      ],
      hints: ["Row r up from the bottom has its leftmost cell equal to the xor of values[i] over i submask of r.", "Pad the row with zeros up to a power of two so every mask exists.", "Run submaskXor and return the first n entries."],
      cases: [
        example([SAMPLE_PYRAMID], [2, 8, 7, 1, 11, 4, 15, 9], "CSES sample"),
        example([[5]], [5], "one cell"),
        example([[1, 2, 3]], [1, 3, 2], "three cells"),
        example([[6, 3]], [6, 5], "two cells"),
        hidden("n = 200 000, time limit", () => [PEAK_BIG()]),
      ],
    },
    {
      id: "xor-pyramid-row", title: "Xor Pyramid Row", cses: { id: 3195, name: "Xor Pyramid Row" },
      goal: "The k values on the k-th row counted from the top, given the bottom row of n values.",
      concept: "That row sits n − k steps above the bottom, so each of its cells is the xor of the bottom cells whose offset is a submask of n − k. Listing those submasks would be far too many, but the same set is produced by folding once per set bit of n − k: xoring each cell with the one that far to its right adds that bit to every offset already reachable. At most eighteen folds cover any allowed height.",
      functionName: "xorPyramidRow", signature: "xorPyramidRow(values, k) → array",
      starterSource: starter("xorPyramidRow", "values, k", "For every set bit of n − k, replace the row by current[j] ^ current[j + bit], which shortens it by that bit each time."),
      solve: xorPyramidRow, comparator: "deep", brute: xorPyramidRowBrute, small: (round) => { const list = smallList(1100 + round, 1 + (round % 9), 64); return [list, 1 + (round % list.length)]; },
      reference: book("10.2", "Bit manipulation"),
      presets: { "CSES sample": { a: SAMPLE_PYRAMID, b: 5 }, "the bottom row": { a: SAMPLE_PYRAMID, b: 8 }, "the peak": { a: SAMPLE_PYRAMID, b: 1 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("folds-k-rows", "The row sits n − k steps above the bottom; folding k times climbs to the wrong height entirely.", function xorPyramidRow(values, k) { let current = values.slice(); for (let bit = 1; bit <= k; bit *= 2) { if ((k & bit) === 0) continue; const next = new Array(Math.max(0, current.length - bit)); for (let j = 0; j + bit < current.length; j += 1) next[j] = (current[j] ^ current[j + bit]) >>> 0; current = next; } return current; }),
        diagnosis("every-bit-folded", "Only the set bits of n − k are folded; folding a clear bit adds offsets that never reach this row.", function xorPyramidRow(values, k) { let current = values.slice(); const drop = values.length - k; for (let bit = 1; bit <= drop; bit *= 2) { const next = new Array(Math.max(0, current.length - bit)); for (let j = 0; j + bit < current.length; j += 1) next[j] = (current[j] ^ current[j + bit]) >>> 0; current = next; } return current.slice(0, k); }),
      ],
      hints: ["The row is drop = n − k steps above the bottom.", "For each set bit of drop, replace current[j] by current[j] ^ current[j + bit]; the row shortens by exactly that bit.", "After all the set bits are folded the row holds k values."],
      cases: [
        example([SAMPLE_PYRAMID, 5], [1, 10, 5, 1, 8], "CSES sample"),
        example([SAMPLE_PYRAMID, 8], SAMPLE_PYRAMID, "the bottom row is unchanged"),
        example([SAMPLE_PYRAMID, 1], [9], "the peak"),
        example([[1, 2, 3], 2], [3, 1], "one fold"),
        hidden("n = 200 000, k = 100 000, time limit", () => [PEAK_BIG(), 100000]),
      ],
    },
    {
      id: "submask-sums", title: "Submask Sums", cses: { id: 1654, name: "SOS Bit Problem (brick)" },
      goal: "For every mask, the sum of the entries at all of its submasks. The input length is a power of two and the result has the same length.",
      concept: "Exactly the submask xor with addition in place of xor, which is worth noticing: the shape of the sweep has nothing to do with the operator. Anything that combines associatively and commutatively can be summed over subsets this way, and reversing the loop condition sums over supersets instead.",
      functionName: "submaskSums", signature: "submaskSums(values) → array",
      starterSource: starter("submaskSums", "values", "For each bit, for each mask holding that bit: out[mask] += out[mask ^ bit]."),
      solve: submaskSums, comparator: "deep", brute: submaskSumsBrute, small: (round) => [powerOfTwoList(1200 + round, round % 4, 20)],
      reference: book("10.3", "Bit manipulation · sum over subsets"),
      presets: { "four entries": { a: [1, 2, 4, 8] }, "an impulse": { a: [7, 0, 0, 0] }, "two entries": { a: [3, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("double-counts", "Adding the whole mask's own entry again on each pass counts it once per bit instead of once.", function submaskSums(values) { const out = values.slice(); const n = out.length; for (let bit = 1; bit < n; bit *= 2) { for (let mask = 0; mask < n; mask += 1) if (mask & bit) out[mask] += out[mask ^ bit] + values[mask]; } return out; }),
        diagnosis("supersets-instead", "This sweep collects submasks; flipping the test collects supermasks, which is the other question.", function submaskSums(values) { const out = values.slice(); const n = out.length; for (let bit = 1; bit < n; bit *= 2) { for (let mask = 0; mask < n; mask += 1) if ((mask & bit) === 0) out[mask] += out[mask | bit]; } return out; }),
      ],
      hints: ["Start from a copy of the input.", "Loop bit over 1, 2, 4, … up to the length.", "For every mask that contains that bit, add the entry at mask without the bit."],
      cases: [
        example([[1, 2, 4, 8]], [1, 3, 5, 15], "four entries"),
        example([[7, 0, 0, 0]], [7, 7, 7, 7], "an impulse reaches every mask"),
        example([[3, 5]], [3, 8], "two entries"),
        example([[9]], [9], "one entry"),
        run(submaskSums, [[1, 1, 1, 1, 1, 1, 1, 1]], "eight ones"),
        hidden("2¹⁵ entries, time limit", () => [MASKS_SMALL()]),
      ],
    },
    {
      id: "sos-bit-problem", title: "SOS Bit Problem", cses: { id: 1654, name: "SOS Bit Problem" },
      goal: "For each value x, three counts: how many values y satisfy x | y = x, how many satisfy x & y = x, and how many satisfy x & y ≠ 0.",
      concept: "The first asks how many values are submasks of x and the second how many are supermasks, so they are the two directions of the same sweep over a table of how often each value occurs. The third looks different but is the first one in disguise: x & y = 0 means y is a submask of the complement of x, so count those and subtract from n.",
      functionName: "sosBitProblem", signature: "sosBitProblem(values) → array of [submasks, supermasks, overlapping]",
      starterSource: starter("sosBitProblem", "values", "Count occurrences into a power-of-two table; submaskSums for one direction and the mirrored loop for the other; the third is n minus the submask count of the complement."),
      solve: sosBitProblem, comparator: "deep", dependencies: ["submask-sums"], brute: sosBitProblemBrute, small: (round) => [smallList(1300 + round, 1 + (round % 9), 16).map((value) => value + 1)],
      reference: book("10.3", "Bit manipulation · sum over subsets"),
      presets: { "CSES sample": { a: SAMPLE_SOS }, "one value": { a: [5] }, "powers of two": { a: [1, 2, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("misses-itself", "Every value is both a submask and a supermask of itself, so it counts in its own first two answers.", function sosBitProblem(values) { const n = values.length; let top = 0; for (let i = 0; i < n; i += 1) if (values[i] > top) top = values[i]; let width = 1; while (width <= top) width *= 2; const counts = new Array(width).fill(0); for (let i = 0; i < n; i += 1) counts[values[i]] += 1; const below = submaskSums(counts); const above = counts.slice(); for (let bit = 1; bit < width; bit *= 2) for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit]; const full = width - 1; const out = new Array(n); for (let i = 0; i < n; i += 1) out[i] = [below[values[i]] - 1, above[values[i]] - 1, n - below[full ^ values[i]]]; return out; }),
        diagnosis("overlap-counts-submasks", "Values that overlap x are the ones that are not submasks of the complement of x, so the complement is what gets looked up.", function sosBitProblem(values) { const n = values.length; let top = 0; for (let i = 0; i < n; i += 1) if (values[i] > top) top = values[i]; let width = 1; while (width <= top) width *= 2; const counts = new Array(width).fill(0); for (let i = 0; i < n; i += 1) counts[values[i]] += 1; const below = submaskSums(counts); const above = counts.slice(); for (let bit = 1; bit < width; bit *= 2) for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit]; const out = new Array(n); for (let i = 0; i < n; i += 1) out[i] = [below[values[i]], above[values[i]], n - below[values[i]]]; return out; }),
      ],
      hints: ["Tally the values into an array whose length is a power of two above the largest one.", "submaskSums answers the first question at index x; the mirrored loop, adding out[mask | bit] into masks without the bit, answers the second.", "The third is n minus the submask count at (width − 1) ^ x."],
      cases: [
        example([SAMPLE_SOS], [[3, 2, 5], [4, 1, 5], [2, 4, 4], [1, 1, 3], [2, 4, 4]], "CSES sample"),
        example([[5]], [[1, 1, 1]], "one value"),
        example([[1, 2, 4]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], "powers of two never overlap"),
        example([[3, 3]], [[2, 2, 2], [2, 2, 2]], "two equal values"),
        hidden("n = 100 000 with values to 10⁶, time limit", () => [VALUES_MILLION()]),
      ],
    },
    {
      id: "and-subset-count", title: "And Subset Count", cses: { id: 3141, name: "And Subset Count" },
      goal: "For every k from 0 to n, how many non-empty subsets have a bitwise and of exactly k, modulo 10⁹ + 7.",
      concept: "Counting subsets whose and is exactly k is hard directly, but counting those whose and merely contains k is easy: every element that is a supermask of k can be taken or left, so it is two to that count, minus the empty choice. Going from at-least to exactly is inclusion and exclusion over supermasks, which is the sum-over-supersets sweep run backwards with a subtraction in place of the addition.",
      functionName: "andSubsetCount", signature: "andSubsetCount(values) → array of n + 1 numbers",
      starterSource: starter("andSubsetCount", "values", "Supermask counts of each k; totals = 2^count − 1; then the same sweep backwards subtracting totals[mask | bit]."),
      solve: andSubsetCount, comparator: "deep", brute: andSubsetCountBrute, small: (round) => { const n = 1 + (round % 8); return [smallList(1400 + round, n, n + 1)]; },
      reference: book("10.3", "Bit manipulation · sum over subsets"),
      presets: { "CSES sample": { a: [3, 1, 3, 4] }, "one value": { a: [1] }, "all equal": { a: [2, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("stops-at-at-least", "Two to the supermask count counts every subset whose and contains k, which includes the ones whose and has extra bits.", function andSubsetCount(values) { const MODULUS = 1000000007; const n = values.length; let width = 1; while (width <= n) width *= 2; const above = new Array(width).fill(0); for (let i = 0; i < n; i += 1) above[values[i]] += 1; for (let bit = 1; bit < width; bit *= 2) for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit]; const power = new Array(n + 1); power[0] = 1; for (let i = 1; i <= n; i += 1) power[i] = power[i - 1] * 2 % MODULUS; const totals = new Array(width); for (let mask = 0; mask < width; mask += 1) totals[mask] = (power[above[mask]] - 1 + MODULUS) % MODULUS; return totals.slice(0, n + 1); }),
        diagnosis("counts-the-empty-subset", "The empty subset has no and at all, so each at-least count drops one before the inclusion and exclusion.", function andSubsetCount(values) { const MODULUS = 1000000007; const n = values.length; let width = 1; while (width <= n) width *= 2; const above = new Array(width).fill(0); for (let i = 0; i < n; i += 1) above[values[i]] += 1; for (let bit = 1; bit < width; bit *= 2) for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) above[mask] += above[mask | bit]; const power = new Array(n + 1); power[0] = 1; for (let i = 1; i <= n; i += 1) power[i] = power[i - 1] * 2 % MODULUS; const totals = new Array(width); for (let mask = 0; mask < width; mask += 1) totals[mask] = power[above[mask]]; for (let bit = 1; bit < width; bit *= 2) for (let mask = 0; mask < width; mask += 1) if ((mask & bit) === 0) totals[mask] = (totals[mask] - totals[mask | bit] + MODULUS) % MODULUS; return totals.slice(0, n + 1); }),
      ],
      hints: ["Tally the values, then sweep supermasks so above[k] counts the elements whose and with k is k.", "totals[k] = 2^above[k] − 1 is the number of non-empty subsets whose and contains k.", "Run the same sweep again subtracting instead of adding, then return the first n + 1 entries."],
      cases: [
        example([[3, 1, 3, 4]], [7, 4, 0, 3, 1], "CSES sample"),
        example([[1]], [0, 1], "one value"),
        example([[2, 2]], [0, 0, 3], "all equal"),
        example([[0, 0]], [3, 0, 0], "zeros"),
        run(andSubsetCount, [[1, 2, 3, 4, 5]], "five values"),
        hidden("n = 200 000, time limit", () => [VALUES_BOUNDED()]),
      ],
    },
  ];
  core.share({ xorBasis, walshHadamard, submaskXor, submaskSums });
  core.define("bitwise", BITWISE);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

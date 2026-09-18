(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  // ------------------------------------------------------------------ 2 · sorting and searching
  function distinctNumbers(values) {
    const sorted = values.slice().sort((p, q) => p - q);
    let count = 0;
    for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) count += 1;
    return count;
  }
  function prefixSums(values) {
    const prefix = [0];
    for (let i = 0; i < values.length; i += 1) prefix.push(prefix[i] + values[i]);
    return prefix;
  }
  function lowerBound(sorted, x) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
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

  const PAIR_BIG = lazy(() => (() => { const out = randomInts(11, BIG, 1, 500000000).map((v) => v * 2); out[777] = 123457; out[199999] = 1000000001 - 123457; return out; })());

  const SORTING = [
    {
      id: "distinct-numbers", track: "sorting", title: "Distinct Numbers", cses: { id: 1621, name: "Distinct Numbers" },
      goal: "Count how many different values appear.",
      concept: "Sort first, then a single scan sees equal values next to each other. Sorting turns many O(n²) questions into O(n log n).",
      functionName: "distinctNumbers", signature: "distinctNumbers(values) → number",
      starterSource: starter("distinctNumbers", "values", "Sort a copy, count positions where the value changes."),
      solve: distinctNumbers, comparator: "scalar",
      reference: book("3.1", "Sorting theory · why sorting helps"),
      scene: { kind: "algo", view: "bars", handles: preset("distinct-numbers", ["sample", "all same", "all different"]), args: [{ fixture: "presetA" }] },
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
      id: "prefix-sums", track: "sorting", title: "Prefix Sums", cses: { id: 1646, name: "Static Range Sum Queries (brick)" },
      goal: "Build the array prefix where prefix[i] is the sum of the first i values (prefix[0] = 0).",
      concept: "One pass of preprocessing makes every range sum a subtraction. The leading zero is what keeps the arithmetic clean.",
      functionName: "prefixSums", signature: "prefixSums(values) → array of length n + 1",
      starterSource: starter("prefixSums", "values"),
      solve: prefixSums, comparator: "deep",
      reference: book("9.1", "Static array queries · sum queries"),
      scene: { kind: "algo", view: "bars", handles: preset("prefix-sums", ["sample", "with negatives", "ones"]), args: [{ fixture: "presetA" }] },
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
      id: "lower-bound", track: "sorting", title: "Lower Bound", cses: { id: 1091, name: "Concert Tickets (brick)" },
      goal: "Return the first index whose value is at least x, or the length when none is.",
      concept: "Binary search halves the range each step: keep an invariant like 'everything before lo is smaller than x' and it cannot go wrong.",
      functionName: "lowerBound", signature: "lowerBound(sorted, x) → index",
      starterSource: starter("lowerBound", "sorted, x", "lo = 0, hi = length; while lo < hi: mid; if sorted[mid] < x then lo = mid + 1 else hi = mid."),
      solve: lowerBound, comparator: "scalar",
      reference: book("3.3", "Binary search"),
      scene: { kind: "algo", view: "bars", handles: preset("lower-bound", ["sample", "with gaps"], [{ id: "x", type: "slider", label: "x (rounded)", value: 4, min: 0, max: 10 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
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
        hidden("n = 200 000", () => [randomInts(9, BIG, 1, 1000000000).sort((p, q) => p - q), 500000000]),
      ],
    },
    {
      id: "sum-of-two-values", track: "sorting", title: "Sum of Two Values", cses: { id: 1640, name: "Sum of Two Values" },
      goal: "Find two positions (1-based, ascending) whose values add up to the target, or null.",
      concept: "Sort the indexes by value and walk two pointers inwards: a small sum moves the left pointer, a large sum moves the right one.",
      functionName: "sumOfTwoValues", signature: "sumOfTwoValues(values, target) → [i, j] or null",
      starterSource: starter("sumOfTwoValues", "values, target", "Sort an index array by value; two pointers; return original positions + 1 in ascending order."),
      solve: sumOfTwoValues, comparator: "deep",
      reference: book("8.1", "Two pointers method · 2SUM"),
      scene: { kind: "algo", view: "bars", handles: preset("sum-of-two-values", ["sample", "no pair", "equal halves"], [{ id: "target", type: "slider", label: "target (rounded)", value: 9, min: 2, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedTarget" }] },
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
      id: "maximum-subarray-sum", track: "sorting", title: "Maximum Subarray Sum", cses: { id: 1643, name: "Maximum Subarray Sum" },
      goal: "Return the largest sum of a non-empty contiguous subarray.",
      concept: "Kadane's rule: at each position either extend the best subarray ending before it or start fresh, whichever is larger.",
      functionName: "maximumSubarraySum", signature: "maximumSubarraySum(values) → number",
      starterSource: starter("maximumSubarraySum", "values", "current = max(v, current + v); best = max(best, current)."),
      solve: maximumSubarraySum, comparator: "scalar",
      reference: book("2.4", "Estimating efficiency · maximum subarray sum"),
      scene: { kind: "algo", view: "bars", handles: preset("maximum-subarray-sum", ["CSES sample", "all negative", "alternating"]), args: [{ fixture: "presetA" }] },
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
      id: "ferris-wheel", track: "sorting", title: "Ferris Wheel", cses: { id: 1090, name: "Ferris Wheel" },
      goal: "Minimum gondolas when each gondola holds at most two children with total weight at most x.",
      concept: "Sort, then pair the heaviest child with the lightest one if they fit; otherwise the heaviest rides alone. Two pointers make it one pass.",
      functionName: "ferrisWheel", signature: "ferrisWheel(weights, x) → number",
      starterSource: starter("ferrisWheel", "weights, x"),
      solve: ferrisWheel, comparator: "scalar",
      reference: book("6", "Greedy algorithms · with two pointers (8.1)"),
      scene: { kind: "algo", view: "bars", handles: preset("ferris-wheel", ["CSES sample", "all light", "all heavy"], [{ id: "x", type: "slider", label: "max weight x (rounded)", value: 10, min: 1, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
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
  ];
  core.share({ prefixSums, lowerBound });
  core.define("sorting", SORTING);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

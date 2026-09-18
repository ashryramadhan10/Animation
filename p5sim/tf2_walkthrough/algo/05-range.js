(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { prefixSums } = core.shared;
  // ------------------------------------------------------------------ 5 · range queries
  function staticRangeSumQueries(values, queries) {
    const prefix = prefixSums(values);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) answers.push(prefix[queries[i][1]] - prefix[queries[i][0] - 1]);
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

  const RANGE_VALUES_BIG = lazy(() => randomInts(41, BIG, 1, 1000000000));
  const RANGE_QUERIES_BIG = lazy(() => (() => { const a = randomInts(42, BIG, 1, BIG), b = randomInts(43, BIG, 1, BIG); return a.map((v, i) => (v <= b[i] ? [v, b[i]] : [b[i], v])); })());
  const RANGE_OPS_BIG = lazy(() => (() => { const kind = randomInts(44, BIG, 1, 2), a = randomInts(45, BIG, 1, BIG), b = randomInts(46, BIG, 1, BIG), u = randomInts(47, BIG, 1, 1000000000); return kind.map((k, i) => (k === 1 ? [1, a[i], u[i]] : (a[i] <= b[i] ? [2, a[i], b[i]] : [2, b[i], a[i]]))); })());

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
  ];
  core.share({ buildSegmentTree, segmentTreeUpdate, segmentTreeQuery });
  core.define("range", RANGE);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

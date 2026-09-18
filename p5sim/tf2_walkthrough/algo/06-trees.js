(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  // ------------------------------------------------------------------ 6 · tree algorithms
  function subordinates(n, bosses) {
    const size = new Array(n + 1).fill(0);
    for (let v = n; v >= 2; v -= 1) {
      size[v] += 1;
      size[bosses[v - 2]] += size[v];
    }
    return size.slice(1).map((count, i) => (i === 0 ? count : count - 1));
  }
  function treeDiameter(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const bfs = (start) => {
      const distance = new Array(n + 1).fill(-1);
      const queue = [start];
      distance[start] = 0;
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          if (distance[list[k]] === -1) { distance[list[k]] = distance[v] + 1; queue.push(list[k]); }
        }
      }
      return distance;
    };
    const first = bfs(1);
    let far = 1;
    for (let v = 1; v <= n; v += 1) if (first[v] > first[far]) far = v;
    const second = bfs(far);
    let best = 0;
    for (let v = 1; v <= n; v += 1) if (second[v] > best) best = second[v];
    return best;
  }
  function treeDistances(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const bfs = (start) => {
      const distance = new Array(n + 1).fill(-1);
      const queue = [start];
      distance[start] = 0;
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          if (distance[list[k]] === -1) { distance[list[k]] = distance[v] + 1; queue.push(list[k]); }
        }
      }
      return distance;
    };
    const first = bfs(1);
    let a = 1;
    for (let v = 1; v <= n; v += 1) if (first[v] > first[a]) a = v;
    const fromA = bfs(a);
    let b = a;
    for (let v = 1; v <= n; v += 1) if (fromA[v] > fromA[b]) b = v;
    const fromB = bfs(b);
    const out = [];
    for (let v = 1; v <= n; v += 1) out.push(Math.max(fromA[v], fromB[v]));
    return out;
  }
  function binaryLiftingTable(n, bosses, levels) {
    const up = [];
    const first = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2];
    up.push(first);
    for (let k = 1; k < levels; k += 1) {
      const previous = up[k - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return up;
  }
  function kthAncestor(up, v, k) {
    let node = v;
    for (let bit = 0; bit < up.length && node !== 0; bit += 1) {
      if (k & (1 << bit)) node = up[bit][node];
    }
    if (k >= (1 << up.length)) node = 0;
    return node === 0 ? -1 : node;
  }
  function companyQueriesII(n, bosses, queries) {
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    const up = binaryLiftingTable(n, bosses, levels);
    const depth = new Array(n + 1).fill(0);
    for (let v = 2; v <= n; v += 1) depth[v] = depth[bosses[v - 2]] + 1;
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      let a = queries[i][0], b = queries[i][1];
      if (depth[a] < depth[b]) { const swap = a; a = b; b = swap; }
      const lifted = kthAncestor(up, a, depth[a] - depth[b]);
      a = lifted === -1 ? a : lifted;
      if (a === b) { answers.push(a); continue; }
      for (let k = levels - 1; k >= 0; k -= 1) {
        if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; }
      }
      answers.push(up[0][a]);
    }
    return answers;
  }

  const TREE_BIG_BOSSES = lazy(() => randomTreeBosses(51, BIG, 1000));
  const TREE_BIG_EDGES = lazy(() => edgesFromBosses(TREE_BIG_BOSSES()));
  const DEEP_BOSSES = lazy(() => randomTreeBosses(52, 50000, 25000));
  const LCA_QUERIES_BIG = lazy(() => (() => { const a = randomInts(53, BIG, 1, 50000), b = randomInts(54, BIG, 1, 50000); return a.map((v, i) => [v, b[i]]); })());

  const TREES = [
    {
      id: "subordinates", track: "trees", title: "Subordinates", cses: { id: 1674, name: "Subordinates" },
      goal: "For every employee, count all subordinates (direct and indirect). bosses[i] is the boss of employee i + 2, and every boss has a smaller number.",
      concept: "Because bosses have smaller numbers, walking employees from n down to 2 processes each subtree before its root: add your size to your boss.",
      functionName: "subordinates", signature: "subordinates(n, bosses) → array (index i is employee i + 1)",
      starterSource: starter("subordinates", "n, bosses"),
      solve: subordinates, comparator: "deep",
      reference: book("14.1", "Tree traversal · subtree sizes"),
      scene: { kind: "algo", view: "tree", handles: preset("subordinates", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("direct-only", "Indirect subordinates count too.", function subordinates(n, bosses) { const count = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) count[bosses[v - 2]] += 1; return count.slice(1); }),
        diagnosis("includes-self", "An employee is not their own subordinate.", function subordinates(n, bosses) { const size = new Array(n + 1).fill(0); for (let v = n; v >= 2; v -= 1) { size[v] += 1; size[bosses[v - 2]] += size[v]; } size[1] += 1; return size.slice(1); }),
      ],
      hints: ["size[v] starts at 0; walking v from n down to 2, add 1 for v itself and pass size[v] up to its boss.", "The answer for v is its accumulated size, the count of its descendants.", "Return values for employees 1..n in order."],
      cases: [
        example([5, [1, 1, 2, 3]], [4, 1, 1, 0, 0], "CSES sample"),
        example([1, []], [0], "alone"),
        example([3, [1, 2]], [2, 1, 0], "chain"),
        hidden("n = 200 000, time limit", () => [BIG, TREE_BIG_BOSSES()]),
      ],
    },
    {
      id: "tree-diameter", track: "trees", title: "Tree Diameter", cses: { id: 1131, name: "Tree Diameter" },
      goal: "Length in edges of the longest path in the tree.",
      concept: "Two BFS: the farthest node from any start is an endpoint of a diameter; the farthest node from that endpoint gives the length.",
      functionName: "treeDiameter", signature: "treeDiameter(n, edges) → number",
      starterSource: starter("treeDiameter", "n, edges"),
      solve: treeDiameter, comparator: "scalar",
      reference: book("14.2", "Diameter"),
      scene: { kind: "algo", view: "tree", handles: preset("tree-diameter", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetEdges" }] },
      diagnoses: [
        diagnosis("single-bfs", "The farthest distance from node 1 is not the diameter; BFS again from that farthest node.", function treeDiameter(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const distance = new Array(n + 1).fill(-1); const queue = [1]; distance[1] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } let best = 0; for (let v = 1; v <= n; v += 1) if (distance[v] > best) best = distance[v]; return best; }),
        diagnosis("counts-nodes", "The diameter counts edges, not nodes.", function treeDiameter(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const bfs = (start) => { const distance = new Array(n + 1).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance; }; const first = bfs(1); let far = 1; for (let v = 1; v <= n; v += 1) if (first[v] > first[far]) far = v; const second = bfs(far); let best = 0; for (let v = 1; v <= n; v += 1) if (second[v] > best) best = second[v]; return best + 1; }),
      ],
      hints: ["Adjacency lists, then BFS from node 1 to find the farthest node.", "BFS again from that node.", "The largest distance found is the diameter."],
      cases: [
        example([5, [[1, 2], [1, 3], [3, 4], [3, 5]]], 3, "CSES sample"),
        example([1, []], 0, "single node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], 3, "chain"),
        hidden("n = 200 000, time limit", () => [BIG, TREE_BIG_EDGES()]),
      ],
    },
    {
      id: "tree-distances", track: "trees", title: "Tree Distances I", cses: { id: 1132, name: "Tree Distances I" },
      goal: "For every node, the distance to the farthest node.",
      concept: "The farthest node from anywhere is one of the two diameter endpoints, so three BFS answer every node at once.",
      functionName: "treeDistances", signature: "treeDistances(n, edges) → array (index i is node i + 1)",
      starterSource: starter("treeDistances", "n, edges"),
      solve: treeDistances, comparator: "deep",
      reference: book("14.3", "All longest paths"),
      scene: { kind: "algo", view: "tree", handles: preset("tree-distances", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetEdges" }] },
      diagnoses: [
        diagnosis("from-node-one", "Distance from node 1 is not the farthest distance for every node.", function treeDistances(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const distance = new Array(n + 1).fill(-1); const queue = [1]; distance[1] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance.slice(1); }),
        diagnosis("single-endpoint", "One diameter endpoint is not enough; take the maximum over both.", function treeDistances(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const bfs = (start) => { const distance = new Array(n + 1).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance; }; const first = bfs(1); let a = 1; for (let v = 1; v <= n; v += 1) if (first[v] > first[a]) a = v; return bfs(a).slice(1); }),
      ],
      hints: ["Find endpoint a (farthest from 1) and endpoint b (farthest from a).", "BFS from a and from b.", "Answer for v = max(distA[v], distB[v])."],
      cases: [
        example([5, [[1, 2], [1, 3], [3, 4], [3, 5]]], [2, 3, 2, 3, 3], "CSES sample"),
        example([1, []], [0], "single node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], [3, 2, 2, 3], "chain"),
        hidden("n = 200 000, time limit", () => [BIG, TREE_BIG_EDGES()]),
      ],
    },
    {
      id: "binary-lifting-table", track: "trees", title: "Binary Lifting Table", cses: { id: 1687, name: "Company Queries I (brick)" },
      goal: "up[k][v] is the 2^k-th ancestor of v (0 when it does not exist), for k below levels.",
      concept: "Jumping 2^k steps is jumping 2^(k−1) twice: up[k][v] = up[k−1][up[k−1][v]]. Row 0 is the boss array itself.",
      functionName: "binaryLiftingTable", signature: "binaryLiftingTable(n, bosses, levels) → up[levels][n + 1]",
      starterSource: starter("binaryLiftingTable", "n, bosses, levels", "Row 0: up[0][v] = boss of v (0 for the root); index 0 stays 0 in every row."),
      solve: binaryLiftingTable, comparator: "deep",
      reference: book("18.1", "Finding ancestors"),
      scene: { kind: "algo", view: "tree", handles: preset("binary-lifting-table", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 3] },
      diagnoses: [
        diagnosis("levels-off-by-one", "The table must have exactly levels rows.", function binaryLiftingTable(n, bosses, levels) { const up = []; const first = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2]; up.push(first); for (let k = 1; k < levels - 1; k += 1) { const previous = up[k - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return up; }),
        diagnosis("no-composition", "Row k must compose row k − 1 with itself, not repeat the parents.", function binaryLiftingTable(n, bosses, levels) { const up = []; const first = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) first[v] = bosses[v - 2]; for (let k = 0; k < levels; k += 1) up.push(first.slice()); return up; }),
      ],
      hints: ["Row 0 from the bosses; the root's parent is 0.", "For each next row: row[v] = previous[previous[v]].", "Index 0 maps to 0, which makes missing ancestors fall through cleanly."],
      cases: [
        example([5, [1, 1, 2, 3], 3], [[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], "CSES sample"),
        example([1, [], 2], [[0, 0], [0, 0]], "single node"),
        example([4, [1, 2, 3], 3], [[0, 0, 1, 2, 3], [0, 0, 0, 1, 2], [0, 0, 0, 0, 0]], "chain"),
        hidden("n = 50 000, 16 levels, time limit", () => [50000, DEEP_BOSSES(), 16]),
      ],
    },
    {
      id: "kth-ancestor", track: "trees", title: "Company Queries I", cses: { id: 1687, name: "Company Queries I" },
      goal: "The k-th ancestor of v using the lifting table, or −1 when it does not exist.",
      concept: "Write k in binary and take the jumps that correspond to its set bits; the order does not matter.",
      functionName: "kthAncestor", signature: "kthAncestor(up, v, k) → node or −1",
      starterSource: starter("kthAncestor", "up, v, k", "For each bit of k, jump with the matching row; 0 means no ancestor."),
      solve: kthAncestor, comparator: "scalar",
      reference: book("18.1", "Finding ancestors"),
      scene: { kind: "algo", view: "tree", handles: preset("kth-ancestor", ["CSES sample", "chain", "star"], [
        { id: "v", type: "slider", label: "node v (rounded)", value: 4, min: 1, max: 5 },
        { id: "k", type: "slider", label: "k (rounded)", value: 1, min: 0, max: 4 },
      ]), args: [{ fixture: "liftingTable" }, { fixture: "roundedV" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("returns-zero", "A missing ancestor is reported as −1, not 0.", function kthAncestor(up, v, k) { let node = v; for (let bit = 0; bit < up.length && node !== 0; bit += 1) { if (k & (1 << bit)) node = up[bit][node]; } if (k >= (1 << up.length)) node = 0; return node; }),
        diagnosis("k-minus-one", "Use the bits of k itself; the boss is the 1st ancestor.", function kthAncestor(up, v, k) { let node = v; const steps = k - 1; if (steps < 0) return v; for (let bit = 0; bit < up.length && node !== 0; bit += 1) { if (steps & (1 << bit)) node = up[bit][node]; } return node === 0 ? -1 : node; }),
      ],
      hints: ["node = v; for bit in 0..levels − 1: if k has that bit, node = up[bit][node].", "Stop early when node becomes 0.", "Return −1 for 0, otherwise the node."],
      cases: [
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 1], 2, "boss"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 2], 1, "grand boss"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 4, 3], -1, "no such ancestor"),
        example([[[0, 0, 1, 1, 2, 3], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 0]], 5, 0], 5, "zero steps"),
      ],
    },
    {
      id: "company-queries-ii", track: "trees", title: "Company Queries II", cses: { id: 1688, name: "Company Queries II" },
      goal: "Lowest common ancestor for each query pair.",
      concept: "Lift the deeper node to the same depth, then jump both up by the largest powers of two that keep them apart; their parent is the answer.",
      functionName: "companyQueriesII", signature: "companyQueriesII(n, bosses, queries) → answers",
      starterSource: starter("companyQueriesII", "n, bosses, queries", "levels = enough rows for n; depths from the bosses; equalise with kthAncestor; then descend from the top row."),
      solve: companyQueriesII, comparator: "deep", dependencies: ["binary-lifting-table", "kth-ancestor"],
      reference: book("18.3", "Lowest common ancestor"),
      scene: { kind: "algo", view: "tree", handles: preset("company-queries-ii", ["CSES sample", "chain", "star"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("no-depth-equalise", "Both nodes must be at the same depth before jumping together.", function companyQueriesII(n, bosses, queries) { let levels = 1; while ((1 << levels) <= n) levels += 1; const up = binaryLiftingTable(n, bosses, levels); const answers = []; for (let i = 0; i < queries.length; i += 1) { let a = queries[i][0], b = queries[i][1]; if (a === b) { answers.push(a); continue; } for (let k = levels - 1; k >= 0; k -= 1) { if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; } } answers.push(up[0][a] === 0 ? 1 : up[0][a]); } return answers; }),
        diagnosis("forgets-final-parent", "After the descent a and b are children of the answer; return their parent.", function companyQueriesII(n, bosses, queries) { let levels = 1; while ((1 << levels) <= n) levels += 1; const up = binaryLiftingTable(n, bosses, levels); const depth = new Array(n + 1).fill(0); for (let v = 2; v <= n; v += 1) depth[v] = depth[bosses[v - 2]] + 1; const answers = []; for (let i = 0; i < queries.length; i += 1) { let a = queries[i][0], b = queries[i][1]; if (depth[a] < depth[b]) { const swap = a; a = b; b = swap; } const lifted = kthAncestor(up, a, depth[a] - depth[b]); a = lifted === -1 ? a : lifted; if (a === b) { answers.push(a); continue; } for (let k = levels - 1; k >= 0; k -= 1) { if (up[k][a] !== up[k][b]) { a = up[k][a]; b = up[k][b]; } } answers.push(a); } return answers; }),
      ],
      hints: ["levels: the smallest count with 2^levels > n; build the table and the depths.", "Lift the deeper node by the depth difference; if they meet, that is the answer.", "From the top row down: if the 2^k ancestors differ, jump both; finally return up[0][a]."],
      cases: [
        example([5, [1, 1, 2, 3], [[4, 5], [2, 5], [1, 3], [4, 2], [5, 5]]], [1, 1, 1, 2, 5], "CSES sample plus two"),
        example([1, [], [[1, 1]]], [1], "single node"),
        example([4, [1, 2, 3], [[4, 2], [3, 4]]], [2, 3], "chain"),
        hidden("n = 50 000, q = 200 000 on a deep tree, time limit", () => [50000, DEEP_BOSSES(), LCA_QUERIES_BIG()]),
      ],
    },
  ];
  core.share({ binaryLiftingTable, kthAncestor });
  core.define("trees", TREES);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

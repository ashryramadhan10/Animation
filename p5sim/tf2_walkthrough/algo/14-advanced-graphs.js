(function defineAlgoSection(core) {
  "use strict";
  const { lazy, rng, randomInts, randomPermutation, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { heapPush, heapPop, dsuFind, dsuUnion, planetsAndKingdoms, courseSchedule, rootedAncestors, treeLca, eulerTour, lowLink, rollbackUnion } = core.shared;

  // ------------------------------------------------------------------ 14 · advanced graph problems · references
  function nearestShops(n, shops, roads) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < roads.length; i += 1) { adjacency[roads[i][0]].push(roads[i][1]); adjacency[roads[i][1]].push(roads[i][0]); }
    // Every city keeps its two nearest shops from different sources; each city is expanded at most twice.
    const firstDist = new Int32Array(n + 1).fill(-1), firstSource = new Int32Array(n + 1);
    const secondDist = new Int32Array(n + 1).fill(-1);
    const queueNode = [], queueSource = [], queueDist = [];
    for (let i = 0; i < shops.length; i += 1) {
      const s = shops[i];
      firstDist[s] = 0; firstSource[s] = s;
      queueNode.push(s); queueSource.push(s); queueDist.push(0);
    }
    for (let head = 0; head < queueNode.length; head += 1) {
      const v = queueNode[head], source = queueSource[head], d = queueDist[head] + 1;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (firstDist[u] < 0) { firstDist[u] = d; firstSource[u] = source; }
        else if (secondDist[u] < 0 && firstSource[u] !== source) secondDist[u] = d;
        else continue;
        queueNode.push(u); queueSource.push(source); queueDist.push(d);
      }
    }
    const answers = [];
    for (let v = 1; v <= n; v += 1) answers.push(firstDist[v] === 0 ? secondDist[v] : firstDist[v]);
    return answers;
  }
  function pruferCode(n, code) {
    const degree = new Array(n + 1).fill(1);
    for (let i = 0; i < code.length; i += 1) degree[code[i]] += 1;
    const leaves = [];
    for (let v = 1; v <= n; v += 1) if (degree[v] === 1) heapPush(leaves, [v]);
    const edges = [];
    for (let i = 0; i < code.length; i += 1) {
      const leaf = heapPop(leaves).item[0], next = code[i];
      edges.push([leaf, next]);
      degree[next] -= 1;
      if (degree[next] === 1) heapPush(leaves, [next]);
    }
    const u = heapPop(leaves).item[0], w = heapPop(leaves).item[0];
    edges.push([u, w]);
    return edges;
  }
  function treeTraversals(preorder, inorder) {
    const n = preorder.length;
    const position = new Array(n + 1);
    for (let i = 0; i < n; i += 1) position[inorder[i]] = i;
    const post = [];
    // Frames are [preStart, inStart, size, stage]; stage 1 emits the root after both subtrees.
    const stack = [[0, 0, n, 0]];
    while (stack.length) {
      const [preStart, inStart, size, stage] = stack.pop();
      if (size === 0) continue;
      const root = preorder[preStart];
      if (stage === 1) { post.push(root); continue; }
      const leftSize = position[root] - inStart;
      stack.push([preStart, inStart, size, 1]);
      stack.push([preStart + 1 + leftSize, inStart + leftSize + 1, size - leftSize - 1, 0]);
      stack.push([preStart + 1, inStart, leftSize, 0]);
    }
    return post;
  }
  function courseScheduleII(n, requirements) {
    const back = [];
    for (let v = 0; v <= n; v += 1) back.push([]);
    const remaining = new Array(n + 1).fill(0);
    for (let i = 0; i < requirements.length; i += 1) { back[requirements[i][1]].push(requirements[i][0]); remaining[requirements[i][0]] += 1; }
    // Build the order from the end: among courses nothing still waits on, the largest goes last.
    const ready = [];
    for (let v = 1; v <= n; v += 1) if (remaining[v] === 0) heapPush(ready, [-v]);
    const order = [];
    while (ready.length) {
      const v = -heapPop(ready).item[0];
      order.push(v);
      const list = back[v];
      for (let k = 0; k < list.length; k += 1) { remaining[list[k]] -= 1; if (remaining[list[k]] === 0) heapPush(ready, [-list[k]]); }
    }
    return order.reverse();
  }
  function acyclicGraphEdges(n, edges) {
    return edges.map(([a, b]) => (a < b ? [a, b] : [b, a]));
  }
  function stronglyConnectedEdges(n, edges) {
    const link = lowLink(n, edges);
    for (let v = 2; v <= n; v += 1) if (link.parentEdge[v - 1] < 0) return null;
    const out = [];
    for (let i = 0; i < edges.length; i += 1) {
      const a = edges[i][0], b = edges[i][1];
      if (link.parentEdge[b - 1] === i || link.parentEdge[a - 1] === i) {
        const child = link.parentEdge[b - 1] === i ? b : a;
        if (link.low[child - 1] === link.tin[child - 1]) return null;
        out.push(child === b ? [a, b] : [b, a]);
      } else out.push(link.tin[a - 1] > link.tin[b - 1] ? [a, b] : [b, a]);
    }
    return out;
  }
  function evenOutdegreeEdges(n, edges) {
    const link = lowLink(n, edges);
    const m = edges.length;
    const byTin = new Array(n);
    for (let v = 1; v <= n; v += 1) byTin[link.tin[v - 1]] = v;
    const parentOf = (v) => { const e = link.parentEdge[v - 1]; return edges[e][0] === v ? edges[e][1] : edges[e][0]; };
    const root = new Array(n + 1).fill(0);
    for (let t = 0; t < n; t += 1) { const v = byTin[t]; root[v] = link.parentEdge[v - 1] < 0 ? v : root[parentOf(v)]; }
    const count = new Array(n + 1).fill(0);
    for (let i = 0; i < m; i += 1) count[root[edges[i][0]]] += 1;
    for (let v = 1; v <= n; v += 1) if (count[v] % 2 === 1) return null;
    const out = new Array(m), outdegree = new Array(n + 1).fill(0);
    for (let i = 0; i < m; i += 1) {
      const a = edges[i][0], b = edges[i][1];
      if (link.parentEdge[a - 1] === i || link.parentEdge[b - 1] === i) continue;
      const from = link.tin[a - 1] > link.tin[b - 1] ? a : b, to = from === a ? b : a;
      out[i] = [from, to]; outdegree[from] += 1;
    }
    // Children before parents: each tree edge fixes the parity of the child it hangs from.
    for (let t = n - 1; t >= 0; t -= 1) {
      const v = byTin[t], e = link.parentEdge[v - 1];
      if (e < 0) continue;
      const p = parentOf(v);
      if (outdegree[v] % 2 === 1) { out[e] = [v, p]; outdegree[v] += 1; }
      else { out[e] = [p, v]; outdegree[p] += 1; }
    }
    return out;
  }
  function graphGirth(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const dist = new Int32Array(n + 1), parent = new Int32Array(n + 1), queue = new Int32Array(n + 1);
    let best = Infinity;
    for (let s = 1; s <= n; s += 1) {
      dist.fill(-1);
      dist[s] = 0; parent[s] = 0;
      let head = 0, tail = 0;
      queue[tail++] = s;
      while (head < tail) {
        const v = queue[head++];
        if (2 * dist[v] + 1 >= best) break;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const u = list[k];
          if (dist[u] < 0) { dist[u] = dist[v] + 1; parent[u] = v; queue[tail++] = u; }
          else if (u !== parent[v]) best = Math.min(best, dist[v] + dist[u] + 1);
        }
      }
    }
    return best === Infinity ? -1 : best;
  }
  function fixedLengthWalkQueries(n, edges, queries) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const bySource = new Map();
    for (let i = 0; i < queries.length; i += 1) { const a = queries[i][0]; if (!bySource.has(a)) bySource.set(a, []); bySource.get(a).push(i); }
    const answers = new Array(queries.length).fill(false);
    // State 2v + p: at v after a walk of parity p. The shortest walk of each parity decides every longer one.
    const dist = new Int32Array(2 * (n + 1)), queue = new Int32Array(2 * (n + 1));
    bySource.forEach((list, a) => {
      dist.fill(-1);
      let head = 0, tail = 0;
      dist[2 * a] = 0; queue[tail++] = 2 * a;
      while (head < tail) {
        const state = queue[head++], v = state >> 1, p = state & 1, next = dist[state] + 1;
        const around = adjacency[v];
        for (let k = 0; k < around.length; k += 1) {
          const target = 2 * around[k] + (p ^ 1);
          if (dist[target] < 0) { dist[target] = next; queue[tail++] = target; }
        }
      }
      list.forEach((i) => { const b = queries[i][1], x = queries[i][2], d = dist[2 * b + (x & 1)]; answers[i] = d >= 0 && d <= x; });
    });
    return answers;
  }
  function transferSpeedsSum(n, connections) {
    const order = connections.slice().sort((p, q) => q[2] - p[2]);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    // Adding connections fastest first, the new one is the slowest link for every pair it joins.
    let total = 0n;
    for (let i = 0; i < order.length; i += 1) {
      const [a, b, x] = order[i];
      const ra = dsuFind(parent, a), rb = dsuFind(parent, b);
      total += BigInt(x) * BigInt(size[ra]) * BigInt(size[rb]);
      dsuUnion(parent, size, a, b);
    }
    return total.toString();
  }
  function mstEdgeCheck(n, edges) {
    const m = edges.length;
    const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    const answers = new Array(m).fill(false);
    for (let i = 0; i < m;) {
      let j = i;
      while (j < m && edges[order[j]][2] === edges[order[i]][2]) j += 1;
      // Judge the whole weight group against strictly lighter edges, then add the group.
      for (let k = i; k < j; k += 1) { const e = edges[order[k]]; answers[order[k]] = dsuFind(parent, e[0]) !== dsuFind(parent, e[1]); }
      for (let k = i; k < j; k += 1) { const e = edges[order[k]]; dsuUnion(parent, size, e[0], e[1]); }
      i = j;
    }
    return answers;
  }
  function mstEdgeSetCheck(n, edges, sets) {
    const m = edges.length;
    const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]);
    const items = [];
    for (let s = 0; s < sets.length; s += 1) for (let k = 0; k < sets[s].length; k += 1) { const e = sets[s][k] - 1; items.push([edges[e][2], s, e]); }
    items.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    const scratch = { parent: parent.slice(), size: size.slice(), history: [], components: n + 1 };
    const undo = () => {
      const rb = scratch.history.pop();
      if (rb < 0) return;
      const ra = scratch.parent[rb];
      scratch.size[ra] -= scratch.size[rb]; scratch.parent[rb] = rb; scratch.components += 1;
    };
    const ok = new Array(sets.length).fill(true);
    let added = 0;
    for (let t = 0; t < items.length;) {
      const w = items[t][0];
      while (added < m && edges[order[added]][2] < w) { dsuUnion(parent, size, edges[order[added]][0], edges[order[added]][1]); added += 1; }
      let end = t;
      while (end < items.length && items[end][0] === w) end += 1;
      // One set's edges of this weight must form a forest over the components of the lighter edges.
      for (let g = t; g < end;) {
        let h = g;
        while (h < end && items[h][1] === items[g][1]) h += 1;
        for (let k = g; k < h; k += 1) {
          const e = edges[items[k][2]];
          const before = scratch.components;
          rollbackUnion(scratch, dsuFind(parent, e[0]), dsuFind(parent, e[1]));
          if (scratch.components === before) ok[items[k][1]] = false;
        }
        for (let k = g; k < h; k += 1) undo();
        g = h;
      }
      t = end;
    }
    return ok;
  }
  function pathMaxTable(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { const [a, b, w] = edges[i]; adjacency[a].push(b, w); adjacency[b].push(a, w); }
    const parent = new Array(n + 1).fill(0), weight = new Array(n + 1).fill(0), depth = new Array(n + 1).fill(0);
    const seen = new Array(n + 1).fill(false);
    const order = [1];
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i], list = adjacency[v];
      for (let k = 0; k < list.length; k += 2) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; weight[u] = list[k + 1]; depth[u] = depth[v] + 1; order.push(u); }
      }
    }
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    const up = [parent], best = [weight];
    for (let j = 1; j < levels; j += 1) {
      const lastUp = up[j - 1], lastBest = best[j - 1];
      const rowUp = new Array(n + 1).fill(0), rowBest = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) { rowUp[v] = lastUp[lastUp[v]]; rowBest[v] = Math.max(lastBest[v], lastBest[lastUp[v]]); }
      up.push(rowUp); best.push(rowBest);
    }
    return { depth, up, best };
  }
  function pathMax(table, a, b) {
    const { depth, up, best } = table;
    let x = a, y = b, answer = 0;
    if (depth[x] < depth[y]) { const swap = x; x = y; y = swap; }
    let diff = depth[x] - depth[y];
    for (let j = 0; diff > 0; j += 1, diff >>= 1) if (diff & 1) { answer = Math.max(answer, best[j][x]); x = up[j][x]; }
    if (x === y) return answer;
    for (let j = up.length - 1; j >= 0; j -= 1) {
      if (up[j][x] !== up[j][y]) { answer = Math.max(answer, best[j][x], best[j][y]); x = up[j][x]; y = up[j][y]; }
    }
    return Math.max(answer, best[0][x], best[0][y]);
  }
  function mstEdgeCost(n, edges) {
    const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    const tree = [];
    let total = 0;
    for (let k = 0; k < order.length; k += 1) {
      const e = edges[order[k]];
      if (dsuUnion(parent, size, e[0], e[1]) > 0) { tree.push(e); total += e[2]; }
    }
    // Forcing an edge in swaps it for the heaviest tree edge on the cycle it closes.
    const table = pathMaxTable(n, tree);
    return edges.map(([a, b, w]) => total - pathMax(table, a, b) + w);
  }
  function networkBreakdown(n, connections, breakdowns) {
    const key = (a, b) => (a < b ? a * (n + 1) + b : b * (n + 1) + a);
    const broken = new Set(breakdowns.map(([a, b]) => key(a, b)));
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    let components = n;
    for (let i = 0; i < connections.length; i += 1) {
      const [a, b] = connections[i];
      if (!broken.has(key(a, b)) && dsuUnion(parent, size, a, b) > 0) components -= 1;
    }
    // Run time backwards: repairing the breakdowns in reverse only ever merges components.
    const answers = new Array(breakdowns.length);
    for (let i = breakdowns.length - 1; i >= 0; i -= 1) {
      answers[i] = components;
      if (dsuUnion(parent, size, breakdowns[i][0], breakdowns[i][1]) > 0) components -= 1;
    }
    return answers;
  }
  function treeCoinCollectingI(n, coins, edges, queries) {
    const table = rootedAncestors(n, edges);
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const near = new Array(n + 1).fill(-1), queue = [];
    for (let v = 1; v <= n; v += 1) if (coins[v - 1] === 1) { near[v] = 0; queue.push(v); }
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      adjacency[v].forEach((u) => { if (near[u] < 0) { near[u] = near[v] + 1; queue.push(u); } });
    }
    near[0] = Infinity;
    // low[j][v] = the smallest coin distance among the 2^j nodes from v upwards.
    const up = table.up, low = [near];
    for (let j = 1; j < up.length; j += 1) {
      const last = low[j - 1], row = new Array(n + 1).fill(Infinity);
      for (let v = 1; v <= n; v += 1) row[v] = Math.min(last[v], last[up[j - 1][v]]);
      low.push(row);
    }
    const climb = (x, count) => {
      let best = Infinity, node = x;
      for (let j = 0; count > 0; j += 1, count >>= 1) if (count & 1) { best = Math.min(best, low[j][node]); node = up[j][node]; }
      return best;
    };
    return queries.map(([a, b]) => {
      const top = treeLca(table, a, b), depth = table.depth;
      const best = Math.min(climb(a, depth[a] - depth[top] + 1), climb(b, depth[b] - depth[top]));
      return depth[a] + depth[b] - 2 * depth[top] + 2 * best;
    });
  }
  function treeCoinCollectingII(n, coins, edges, queries) {
    const table = rootedAncestors(n, edges), tin = eulerTour(n, edges).tin;
    const dist = (a, b) => table.depth[a] + table.depth[b] - 2 * table.depth[treeLca(table, a, b)];
    const marked = [];
    for (let v = 1; v <= n; v += 1) if (coins[v - 1] === 1) marked.push(v);
    marked.sort((p, q) => tin[p] - tin[q]);
    const k = marked.length, tins = marked.map((v) => tin[v]);
    // Walking the marked nodes in DFS order and back covers every edge of their subtree twice.
    let cycle = 0;
    for (let i = 0; i < k; i += 1) cycle += dist(marked[i], marked[(i + 1) % k]);
    const steiner = cycle / 2;
    const around = (x) => {
      let lo = 0, hi = k;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tins[mid] < tin[x]) lo = mid + 1; else hi = mid; }
      return [marked[(lo - 1 + k) % k], marked[lo % k]];
    };
    const between = (x, y, z) => (x < z ? x < y && y < z : x > z ? y > x || y < z : y !== x);
    const added = (x, p, q) => (dist(p, x) + dist(x, q) - dist(p, q)) / 2;
    return queries.map(([a, b]) => {
      let extra = 0;
      if (coins[a - 1] !== 1) { const [p, q] = around(a); extra += added(a, p, q); }
      if (coins[b - 1] !== 1 && b !== a) {
        let [p, q] = around(b);
        if (coins[a - 1] !== 1) {
          if (between(tin[p], tin[a], tin[b])) p = a;
          if (between(tin[b], tin[a], tin[q])) q = a;
        }
        extra += added(b, p, q);
      }
      return 2 * (steiner + extra) - dist(a, b);
    });
  }
  function ahuCodes(n, edges, root, dictionary) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0), order = [root];
    const seen = new Array(n + 1).fill(false);
    seen[root] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      adjacency[v].forEach((u) => { if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } });
    }
    // A subtree's code names the sorted list of its children's codes; equal codes mean isomorphic subtrees.
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    const codes = new Array(n).fill(0);
    let known = Object.keys(dictionary).length;
    for (let i = order.length - 1; i >= 0; i -= 1) {
      const v = order[i];
      const key = children[v].sort((p, q) => p - q).join(",");
      if (!Object.prototype.hasOwnProperty.call(dictionary, key)) { known += 1; dictionary[key] = known; }
      codes[v - 1] = dictionary[key];
      if (parent[v]) children[parent[v]].push(codes[v - 1]);
    }
    return codes;
  }
  function treeIsomorphismI(n, first, second) {
    const dictionary = {};
    return ahuCodes(n, first, 1, dictionary)[0] === ahuCodes(n, second, 1, dictionary)[0];
  }
  function treeCenters(n, edges) {
    if (n === 1) return [1];
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    const degree = new Array(n + 1).fill(0);
    for (let i = 0; i < edges.length; i += 1) { const [a, b] = edges[i]; adjacency[a].push(b); adjacency[b].push(a); degree[a] += 1; degree[b] += 1; }
    let layer = [];
    for (let v = 1; v <= n; v += 1) if (degree[v] === 1) layer.push(v);
    let remaining = n;
    // Peel every leaf at once until one or two nodes are left: they are the middle of every longest path.
    while (remaining > 2) {
      remaining -= layer.length;
      const next = [];
      layer.forEach((leaf) => adjacency[leaf].forEach((u) => { degree[u] -= 1; if (degree[u] === 1) next.push(u); }));
      layer = next;
    }
    return layer.sort((p, q) => p - q);
  }
  function treeIsomorphismII(n, first, second) {
    const c1 = treeCenters(n, first), c2 = treeCenters(n, second);
    if (c1.length !== c2.length) return false;
    const dictionary = {};
    const code = ahuCodes(n, first, c1[0], dictionary)[c1[0] - 1];
    return c2.some((c) => ahuCodes(n, second, c, dictionary)[c - 1] === code);
  }
  function flightRouteRequests(n, requests) {
    const label = planetsAndKingdoms(n, requests);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    for (let i = 0; i < requests.length; i += 1) dsuUnion(parent, size, requests[i][0], requests[i][1]);
    const kingdomSize = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) kingdomSize[label[v - 1]] += 1;
    const cyclic = new Array(n + 1).fill(false);
    for (let v = 1; v <= n; v += 1) if (kingdomSize[label[v - 1]] > 1) cyclic[dsuFind(parent, v)] = true;
    // A piece of k cities needs k − 1 flights as a tree of routes, or k as one big cycle when it must loop.
    let total = 0;
    for (let v = 1; v <= n; v += 1) if (dsuFind(parent, v) === v) total += size[v] - 1 + (cyclic[v] ? 1 : 0);
    return total;
  }
  function criticalCities(n, flights) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < flights.length; i += 1) adjacency[flights[i][0]].push(flights[i][1]);
    const from = new Int32Array(n + 1).fill(-1), queue = [1];
    from[1] = 0;
    for (let head = 0; head < queue.length; head += 1) adjacency[queue[head]].forEach((u) => { if (from[u] < 0) { from[u] = queue[head]; queue.push(u); } });
    const path = [];
    for (let v = n; v !== 0; v = from[v]) path.push(v);
    path.reverse();
    const index = new Int32Array(n + 1).fill(-1);
    path.forEach((v, i) => { index[v] = i; });
    // A path city is critical unless something reachable before it jumps past it.
    const seen = new Uint8Array(n + 1);
    const critical = [];
    let far = 0;
    for (let i = 0; i < path.length; i += 1) {
      if (far <= i) critical.push(path[i]);
      const stack = [path[i]];
      while (stack.length) {
        const v = stack.pop();
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const u = list[k];
          if (index[u] >= 0) { if (index[u] > far) far = index[u]; }
          else if (!seen[u]) { seen[u] = 1; stack.push(u); }
        }
      }
    }
    return critical.sort((p, q) => p - q);
  }
  function visitingCities(n, flights) {
    const shortest = (source, forward) => {
      const adjacency = [];
      for (let v = 0; v <= n; v += 1) adjacency.push([]);
      for (let i = 0; i < flights.length; i += 1) { const [a, b, c] = flights[i]; if (forward) adjacency[a].push(b, c); else adjacency[b].push(a, c); }
      const dist = new Array(n + 1).fill(Infinity);
      dist[source] = 0;
      const heap = [[0, source]];
      while (heap.length) {
        const [d, v] = heapPop(heap).item;
        if (d > dist[v]) continue;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 2) { const u = list[k], next = d + list[k + 1]; if (next < dist[u]) { dist[u] = next; heapPush(heap, [next, u]); } }
      }
      return dist;
    };
    const from = shortest(1, true), to = shortest(n, false), total = from[n];
    const levels = [];
    for (let v = 1; v <= n; v += 1) if (from[v] + to[v] === total) levels.push(from[v]);
    const distinct = Array.from(new Set(levels)).sort((p, q) => p - q);
    const index = new Map(distinct.map((d, i) => [d, i]));
    const count = new Array(distinct.length).fill(0);
    levels.forEach((d) => { count[index.get(d)] += 1; });
    // A shortest-route flight that jumps over a level lets some shortest route skip it.
    const cover = new Array(distinct.length + 1).fill(0);
    for (let i = 0; i < flights.length; i += 1) {
      const [a, b, c] = flights[i];
      if (from[a] + c + to[b] !== total) continue;
      const lo = index.get(from[a]) + 1, hi = index.get(from[b]);
      if (lo < hi) { cover[lo] += 1; cover[hi] -= 1; }
    }
    for (let i = 1; i <= distinct.length; i += 1) cover[i] += cover[i - 1];
    const out = [];
    for (let v = 1; v <= n; v += 1) {
      if (from[v] + to[v] !== total) continue;
      const i = index.get(from[v]);
      if (count[i] === 1 && cover[i] === 0) out.push(v);
    }
    return out;
  }
  function graphColoring(n, edges) {
    const neighbours = new Array(n).fill(0);
    for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0] - 1, b = edges[i][1] - 1; neighbours[a] |= 1 << b; neighbours[b] |= 1 << a; }
    const full = (1 << n) - 1;
    const independent = new Uint8Array(full + 1);
    independent[0] = 1;
    for (let mask = 1; mask <= full; mask += 1) {
      const low = mask & -mask, v = 31 - Math.clz32(low), rest = mask ^ low;
      independent[mask] = independent[rest] && (neighbours[v] & rest) === 0 ? 1 : 0;
    }
    // colors[mask] = fewest colors for the nodes in mask; the class holding the lowest node is tried every way.
    const colors = new Uint8Array(full + 1), choice = new Int32Array(full + 1);
    for (let mask = 1; mask <= full; mask += 1) {
      const low = mask & -mask, rest = mask ^ low;
      let best = 255, pick = low;
      for (let s = rest; ; s = (s - 1) & rest) {
        const group = s | low;
        if (independent[group] && colors[mask ^ group] + 1 < best) { best = colors[mask ^ group] + 1; pick = group; }
        if (s === 0) break;
      }
      colors[mask] = best; choice[mask] = pick;
    }
    const result = new Array(n).fill(0);
    let color = 0;
    for (let mask = full; mask; mask ^= choice[mask]) {
      color += 1;
      for (let v = 0; v < n; v += 1) if (choice[mask] & (1 << v)) result[v] = color;
    }
    return { k: colors[full], colors: result };
  }
  function busCompanies(n, costs, companies) {
    const m = costs.length;
    const memberOf = [];
    for (let v = 0; v <= n; v += 1) memberOf.push([]);
    for (let j = 0; j < m; j += 1) companies[j].forEach((v) => memberOf[v].push(j));
    // Every company is a hub: paying its price takes a city to the hub, and the hub reaches its cities free.
    const dist = new Array(n + m + 1).fill(Infinity);
    dist[1] = 0;
    const heap = [[0, 1]];
    while (heap.length) {
      const [d, v] = heapPop(heap).item;
      if (d > dist[v]) continue;
      if (v <= n) {
        const list = memberOf[v];
        for (let k = 0; k < list.length; k += 1) { const hub = n + 1 + list[k], next = d + costs[list[k]]; if (next < dist[hub]) { dist[hub] = next; heapPush(heap, [next, hub]); } }
      } else {
        const list = companies[v - n - 1];
        for (let k = 0; k < list.length; k += 1) if (d < dist[list[k]]) { dist[list[k]] = d; heapPush(heap, [d, list[k]]); }
      }
    }
    return dist.slice(1, n + 1);
  }
  function splitIntoTwoPaths(n, edges) {
    const order = courseSchedule(n, edges);
    const has = new Set(), incoming = [];
    for (let v = 0; v <= n; v += 1) incoming.push([]);
    for (let i = 0; i < edges.length; i += 1) { has.add(edges[i][0] * (n + 1) + edges[i][1]); incoming[edges[i][1]].push(edges[i][0]); }
    const index = new Int32Array(n + 1);
    order.forEach((v, i) => { index[v] = i + 1; });
    // After position p one path ends at t_p; the set holds every position j where the other path can end (0: empty).
    const member = new Int32Array(n + 1).fill(-1), from = new Int32Array(n + 2);
    let epoch = 0, anyMember = 0;
    member[0] = 0;
    for (let p = 1; p < n; p += 1) {
      const v = order[p - 1], w = order[p];
      const keep = has.has(v * (n + 1) + w);
      let via = -1;
      if (member[0] === epoch) via = 0;
      else {
        const list = incoming[w];
        for (let k = 0; k < list.length; k += 1) { const j = index[list[k]]; if (j < p && member[j] === epoch) { via = j; break; } }
      }
      if (!keep) { if (via < 0) return null; epoch += 1; }
      if (via >= 0) { member[p] = epoch; from[p + 1] = via; anyMember = p; }
    }
    const paths = [[], []];
    let current = 0, p = n, j = anyMember;
    while (p >= 1) {
      paths[current].push(order[p - 1]);
      if (p === 1) break;
      if (j < p - 1) p -= 1;
      else { const previous = from[p]; current = 1 - current; p -= 1; j = previous; }
    }
    return [paths[0].reverse(), paths[1].reverse()];
  }
  function networkRenovation(n, connections) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < connections.length; i += 1) { adjacency[connections[i][0]].push(connections[i][1]); adjacency[connections[i][1]].push(connections[i][0]); }
    let root = 1;
    while (adjacency[root].length === 1) root += 1;
    const leaves = [], stack = [root], seen = new Array(n + 1).fill(false);
    seen[root] = true;
    while (stack.length) {
      const v = stack.pop();
      if (adjacency[v].length === 1) leaves.push(v);
      for (let k = adjacency[v].length - 1; k >= 0; k -= 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; stack.push(u); } }
    }
    // Leaves in DFS order: joining each leaf to the one half the list later puts every tree edge on a cycle.
    const half = Math.floor(leaves.length / 2), count = Math.ceil(leaves.length / 2);
    const out = [];
    for (let i = 0; i < count; i += 1) out.push([leaves[i], leaves[i + half]]);
    return out;
  }
  function forbiddenCities(n, roads, queries) {
    const link = lowLink(n, roads);
    const tin = link.tin, low = link.low;
    const byTin = new Array(n);
    for (let v = 1; v <= n; v += 1) byTin[tin[v - 1]] = v;
    const parent = new Array(n + 1).fill(0), size = new Array(n + 1).fill(1), children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let t = 0; t < n; t += 1) {
      const v = byTin[t], e = link.parentEdge[v - 1];
      if (e >= 0) { parent[v] = roads[e][0] === v ? roads[e][1] : roads[e][0]; children[parent[v]].push(v); }
    }
    for (let t = n - 1; t > 0; t -= 1) { const v = byTin[t]; if (parent[v]) size[parent[v]] += size[v]; }
    const inside = (x, v) => tin[x - 1] >= tin[v - 1] && tin[x - 1] < tin[v - 1] + size[v];
    // After removing c, x lives in c's child subtree if that subtree cannot climb above c, else with the rest (0).
    const piece = (x, c) => {
      if (!inside(x, c)) return 0;
      const list = children[c];
      let lo = 0, hi = list.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tin[list[mid] - 1] <= tin[x - 1]) lo = mid; else hi = mid - 1; }
      const child = list[lo];
      return low[child - 1] >= tin[c - 1] ? child : 0;
    };
    return queries.map(([a, b, c]) => {
      if (a === c || b === c) return false;
      return piece(a, c) === piece(b, c);
    });
  }
  function centroidAncestors(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const removed = new Uint8Array(n + 1), parent = new Int32Array(n + 1), size = new Int32Array(n + 1), dist = new Int32Array(n + 1), queue = new Int32Array(n + 1);
    const lists = [];
    for (let v = 0; v < n; v += 1) lists.push([]);
    const entries = [1];
    while (entries.length) {
      const s = entries.pop();
      let head = 0, tail = 0;
      queue[tail++] = s; parent[s] = 0;
      while (head < tail) {
        const v = queue[head++], list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (u !== parent[v] && !removed[u]) { parent[u] = v; queue[tail++] = u; } }
      }
      const total = tail;
      for (let i = total - 1; i >= 0; i -= 1) {
        const v = queue[i], list = adjacency[v];
        size[v] = 1;
        for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (u !== parent[v] && !removed[u]) size[v] += size[u]; }
      }
      // Walk from the entry towards any child holding more than half the piece; where none does is the centroid.
      let c = s;
      while (true) {
        let next = 0;
        const list = adjacency[c];
        for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (u !== parent[c] && !removed[u] && size[u] * 2 > total) { next = u; break; } }
        if (!next) break;
        c = next;
      }
      head = 0; tail = 0;
      queue[tail++] = c; parent[c] = 0; dist[c] = 0;
      while (head < tail) {
        const v = queue[head++], list = adjacency[v];
        lists[v - 1].push(c, dist[v]);
        for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (u !== parent[v] && !removed[u]) { parent[u] = v; dist[u] = dist[v] + 1; queue[tail++] = u; } }
      }
      removed[c] = 1;
      for (let k = adjacency[c].length - 1; k >= 0; k -= 1) if (!removed[adjacency[c][k]]) entries.push(adjacency[c][k]);
    }
    return lists;
  }
  function creatingOffices(n, d, roads) {
    const lists = centroidAncestors(n, roads);
    const order = rootedAncestors(n, roads).order;
    // Deepest first: an office there blocks the least of what is still open.
    const nearest = new Array(n + 1).fill(Infinity);
    const offices = [];
    for (let i = n - 1; i >= 0; i -= 1) {
      const v = order[i], list = lists[v - 1];
      let closest = Infinity;
      for (let k = 0; k < list.length; k += 2) closest = Math.min(closest, nearest[list[k]] + list[k + 1]);
      if (closest < d) continue;
      offices.push(v);
      for (let k = 0; k < list.length; k += 2) nearest[list[k]] = Math.min(nearest[list[k]], list[k + 1]);
    }
    return offices;
  }
  function newFlightRoutes(n, flights) {
    const label = planetsAndKingdoms(n, flights);
    let c = 0;
    for (let v = 1; v <= n; v += 1) c = Math.max(c, label[v - 1]);
    if (c === 1) return [];
    const city = new Array(c + 1).fill(0), indegree = new Array(c + 1).fill(0), outdegree = new Array(c + 1).fill(0), next = [];
    for (let x = 0; x <= c; x += 1) next.push([]);
    for (let v = 1; v <= n; v += 1) if (!city[label[v - 1]]) city[label[v - 1]] = v;
    for (let i = 0; i < flights.length; i += 1) {
      const x = label[flights[i][0] - 1], y = label[flights[i][1] - 1];
      if (x !== y) { next[x].push(y); outdegree[x] += 1; indegree[y] += 1; }
    }
    const sources = [], sinks = [];
    for (let x = 1; x <= c; x += 1) { if (indegree[x] === 0) sources.push(x); if (outdegree[x] === 0) sinks.push(x); }
    // Match sources to sinks they reach; a node is marked when entered, so every marked sink is matched.
    const visited = new Uint8Array(c + 1), matchedSource = new Uint8Array(c + 1), matchedSink = new Uint8Array(c + 1);
    const pairs = [];
    for (let i = 0; i < sources.length; i += 1) {
      const stack = [sources[i]];
      let found = 0;
      while (stack.length && !found) {
        const x = stack.pop();
        if (visited[x]) continue;
        visited[x] = 1;
        if (outdegree[x] === 0) { found = x; break; }
        for (let k = 0; k < next[x].length; k += 1) if (!visited[next[x][k]]) stack.push(next[x][k]);
      }
      if (found) { pairs.push([sources[i], found]); matchedSource[sources[i]] = 1; matchedSink[found] = 1; }
    }
    const out = [];
    const add = (x, y) => out.push([city[x], city[y]]);
    for (let i = 0; i < pairs.length; i += 1) add(pairs[i][1], pairs[(i + 1) % pairs.length][0]);
    const restSources = sources.filter((x) => !matchedSource[x]), restSinks = sinks.filter((x) => !matchedSink[x]);
    const both = Math.min(restSources.length, restSinks.length);
    for (let i = 0; i < both; i += 1) add(restSinks[i], restSources[i]);
    for (let i = both; i < restSinks.length; i += 1) add(restSinks[i], pairs[0][0]);
    for (let i = both; i < restSources.length; i += 1) add(pairs[0][1], restSources[i]);
    return out;
  }

  // ------------------------------------------------------------------ shared helpers for brutes and validators
  function adjacencyOf(n, edges, directed) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    edges.forEach((e) => { adjacency[e[0]].push(e[1]); if (!directed) adjacency[e[1]].push(e[0]); });
    return adjacency;
  }
  function bfsFrom(n, adjacency, start, blocked) {
    const dist = new Array(n + 1).fill(-1);
    if (start === blocked) return dist;
    dist[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head += 1) adjacency[queue[head]].forEach((u) => { if (dist[u] < 0 && u !== blocked) { dist[u] = dist[queue[head]] + 1; queue.push(u); } });
    return dist;
  }
  function kruskal(n, edges, forced) {
    const parent = [];
    for (let v = 0; v <= n; v += 1) parent.push(v);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    let total = 0, cycle = false;
    (forced || []).forEach((i) => { const [a, b, w] = edges[i]; if (find(a) === find(b)) cycle = true; else { parent[find(a)] = find(b); total += w; } });
    edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]).forEach((i) => { const [a, b, w] = edges[i]; if (find(a) !== find(b)) { parent[find(a)] = find(b); total += w; } });
    return cycle ? Infinity : total;
  }
  function stronglyConnected(n, directed) {
    const forward = adjacencyOf(n, directed, true), backward = adjacencyOf(n, directed.map(([a, b]) => [b, a]), true);
    const reach = (adjacency) => bfsFrom(n, adjacency, 1, 0).slice(1).every((d) => d >= 0);
    return reach(forward) && reach(backward);
  }
  function sameEdgesAnyDirection(edges, actual) {
    if (!Array.isArray(actual) || actual.length !== edges.length) return "Return one directed edge for every input edge.";
    const left = new Map();
    const key = (a, b) => Math.min(a, b) + "-" + Math.max(a, b);
    edges.forEach(([a, b]) => left.set(key(a, b), (left.get(key(a, b)) || 0) + 1));
    for (const e of actual) {
      if (!Array.isArray(e) || e.length !== 2 || !left.get(key(e[0], e[1]))) return "The edge " + JSON.stringify(e) + " is not one of the input edges (or appears too often).";
      left.set(key(e[0], e[1]), left.get(key(e[0], e[1])) - 1);
    }
    return true;
  }
  function bridgeless(n, edges) {
    const link = lowLink(n, edges);
    for (let v = 1; v <= n; v += 1) { if (v > 1 && link.parentEdge[v - 1] < 0) return false; if (link.parentEdge[v - 1] >= 0 && link.low[v - 1] === link.tin[v - 1]) return false; }
    return true;
  }
  function treeDistances(n, edges) {
    const adjacency = adjacencyOf(n, edges, false), all = [null];
    for (let v = 1; v <= n; v += 1) all.push(bfsFrom(n, adjacency, v, 0));
    return all;
  }
  function permutations(list) {
    if (list.length <= 1) return [list.slice()];
    const out = [];
    list.forEach((x, i) => permutations(list.slice(0, i).concat(list.slice(i + 1))).forEach((rest) => out.push([x].concat(rest))));
    return out;
  }
  function canonicalRooted(n, edges, root) {
    const adjacency = adjacencyOf(n, edges, false);
    const canon = (v, parent) => "(" + adjacency[v].filter((u) => u !== parent).map((u) => canon(u, v)).sort().join("") + ")";
    return canon(root, 0);
  }

  // ------------------------------------------------------------------ brute forces (small inputs only)
  function nearestShopsBrute(n, shops, roads) {
    const adjacency = adjacencyOf(n, roads, false), isShop = new Set(shops), out = [];
    for (let v = 1; v <= n; v += 1) {
      const dist = bfsFrom(n, adjacency, v, 0);
      let best = -1;
      for (let u = 1; u <= n; u += 1) if (u !== v && isShop.has(u) && dist[u] >= 0 && (best < 0 || dist[u] < best)) best = dist[u];
      out.push(best);
    }
    return out;
  }
  function pruferCodeBrute(n, code) {
    const degree = new Array(n + 1).fill(1), edges = [];
    code.forEach((x) => { degree[x] += 1; });
    code.forEach((x) => { let leaf = 1; while (degree[leaf] !== 1) leaf += 1; edges.push([leaf, x]); degree[leaf] -= 1; degree[x] -= 1; });
    const rest = [];
    for (let v = 1; v <= n; v += 1) if (degree[v] === 1) rest.push(v);
    edges.push(rest);
    return edges;
  }
  function treeTraversalsBrute(preorder, inorder) {
    if (!preorder.length) return [];
    const root = preorder[0], at = inorder.indexOf(root);
    return treeTraversalsBrute(preorder.slice(1, at + 1), inorder.slice(0, at)).concat(treeTraversalsBrute(preorder.slice(at + 1), inorder.slice(at + 1)), [root]);
  }
  function courseScheduleIIBrute(n, requirements) {
    let best = null, bestKey = null;
    permutations(Array.from({ length: n }, (x, i) => i + 1)).forEach((order) => {
      const at = new Array(n + 1);
      order.forEach((v, i) => { at[v] = i; });
      if (!requirements.every(([a, b]) => at[a] < at[b])) return;
      const key = at.slice(1);
      const first = bestKey ? key.findIndex((x, i) => x !== bestKey[i]) : -1;
      if (!bestKey || (first >= 0 && key[first] < bestKey[first])) { best = order; bestKey = key; }
    });
    return best;
  }
  function orientationsBrute(n, edges, good) {
    for (let mask = 0; mask < Math.pow(2, edges.length); mask += 1) {
      const directed = edges.map(([a, b], i) => (mask & (1 << i) ? [b, a] : [a, b]));
      if (good(directed)) return directed;
    }
    return null;
  }
  function stronglyConnectedEdgesBrute(n, edges) { return orientationsBrute(n, edges, (directed) => stronglyConnected(n, directed)); }
  function evenOutdegreeEdgesBrute(n, edges) {
    return orientationsBrute(n, edges, (directed) => { const out = new Array(n + 1).fill(0); directed.forEach(([a]) => { out[a] += 1; }); return out.every((d) => d % 2 === 0); });
  }
  function graphGirthBrute(n, edges) {
    let best = Infinity;
    edges.forEach(([a, b], i) => {
      const dist = bfsFrom(n, adjacencyOf(n, edges.filter((e, j) => j !== i), false), a, 0);
      if (dist[b] >= 0) best = Math.min(best, dist[b] + 1);
    });
    return best === Infinity ? -1 : best;
  }
  function fixedLengthWalkQueriesBrute(n, edges, queries) {
    const adjacency = adjacencyOf(n, edges, false);
    return queries.map(([a, b, x]) => {
      let at = new Set([a]);
      for (let step = 0; step < x; step += 1) { const next = new Set(); at.forEach((v) => adjacency[v].forEach((u) => next.add(u))); at = next; }
      return at.has(b);
    });
  }
  function transferSpeedsSumBrute(n, connections) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    connections.forEach(([a, b, x]) => { adjacency[a].push([b, x]); adjacency[b].push([a, x]); });
    let total = 0n;
    for (let s = 1; s <= n; s += 1) {
      const slowest = new Array(n + 1).fill(-1);
      slowest[s] = Infinity;
      const stack = [s];
      while (stack.length) { const v = stack.pop(); adjacency[v].forEach(([u, x]) => { if (slowest[u] < 0) { slowest[u] = Math.min(slowest[v], x); stack.push(u); } }); }
      for (let t = s + 1; t <= n; t += 1) total += BigInt(slowest[t]);
    }
    return total.toString();
  }
  function mstEdgeCheckBrute(n, edges) { const best = kruskal(n, edges, []); return edges.map((e, i) => kruskal(n, edges, [i]) === best); }
  function mstEdgeSetCheckBrute(n, edges, sets) { const best = kruskal(n, edges, []); return sets.map((set) => kruskal(n, edges, set.map((e) => e - 1)) === best); }
  function pathMaxBrute(table, a, b) {
    const up = table.up[0], best = table.best[0], depth = table.depth;
    let x = a, y = b, answer = 0;
    while (x !== y) {
      if (depth[x] >= depth[y]) { answer = Math.max(answer, best[x]); x = up[x]; }
      else { answer = Math.max(answer, best[y]); y = up[y]; }
    }
    return answer;
  }
  function mstEdgeCostBrute(n, edges) { return edges.map((e, i) => kruskal(n, edges, [i])); }
  function networkBreakdownBrute(n, connections, breakdowns) {
    const key = (a, b) => Math.min(a, b) + "," + Math.max(a, b);
    const alive = new Map(connections.map((e) => [key(e[0], e[1]), e]));
    return breakdowns.map(([a, b]) => {
      alive.delete(key(a, b));
      const adjacency = adjacencyOf(n, Array.from(alive.values()), false), seen = new Array(n + 1).fill(false);
      let count = 0;
      for (let v = 1; v <= n; v += 1) if (!seen[v]) { count += 1; bfsFrom(n, adjacency, v, 0).forEach((d, u) => { if (d >= 0) seen[u] = true; }); }
      return count;
    });
  }
  function treeCoinCollectingIBrute(n, coins, edges, queries) {
    const dist = treeDistances(n, edges);
    return queries.map(([a, b]) => { let best = Infinity; for (let c = 1; c <= n; c += 1) if (coins[c - 1] === 1) best = Math.min(best, dist[a][c] + dist[c][b]); return best; });
  }
  function treeCoinCollectingIIBrute(n, coins, edges, queries) {
    const adjacency = adjacencyOf(n, edges, false), marked = [];
    for (let v = 1; v <= n; v += 1) if (coins[v - 1] === 1) marked.push(v);
    const bit = (v) => { const i = marked.indexOf(v); return i < 0 ? 0 : 1 << i; }, all = (1 << marked.length) - 1;
    return queries.map(([a, b]) => {
      const dist = new Map(), start = a * 64 + bit(a), queue = [start];
      dist.set(start, 0);
      for (let head = 0; head < queue.length; head += 1) {
        const state = queue[head], v = Math.floor(state / 64), mask = state % 64;
        if (v === b && mask === all) return dist.get(state);
        adjacency[v].forEach((u) => { const next = u * 64 + (mask | bit(u)); if (!dist.has(next)) { dist.set(next, dist.get(state) + 1); queue.push(next); } });
      }
      return -1;
    });
  }
  function treeIsomorphismIBrute(n, first, second) { return canonicalRooted(n, first, 1) === canonicalRooted(n, second, 1); }
  function treeIsomorphismIIBrute(n, first, second) {
    const target = canonicalRooted(n, first, 1);
    for (let r = 1; r <= n; r += 1) if (canonicalRooted(n, second, r) === target) return true;
    return false;
  }
  function treeCentersBrute(n, edges) {
    const dist = treeDistances(n, edges), ecc = [];
    for (let v = 1; v <= n; v += 1) ecc.push(Math.max(...dist[v].slice(1)));
    const best = Math.min(...ecc);
    return ecc.map((e, i) => (e === best ? i + 1 : 0)).filter(Boolean);
  }
  function flightRouteRequestsBrute(n, requests) {
    const pairs = [];
    for (let a = 1; a <= n; a += 1) for (let b = 1; b <= n; b += 1) if (a !== b) pairs.push([a, b]);
    let best = Infinity;
    for (let mask = 0; mask < Math.pow(2, pairs.length); mask += 1) {
      let size = 0;
      for (let i = 0; i < pairs.length; i += 1) if (mask & (1 << i)) size += 1;
      if (size >= best) continue;
      const adjacency = adjacencyOf(n, pairs.filter((p, i) => mask & (1 << i)), true);
      if (requests.every(([a, b]) => bfsFrom(n, adjacency, a, 0)[b] >= 0)) best = size;
    }
    return best;
  }
  function criticalCitiesBrute(n, flights) {
    const adjacency = adjacencyOf(n, flights, true), out = [];
    for (let v = 1; v <= n; v += 1) if (v === 1 || v === n || bfsFrom(n, adjacency, 1, v)[n] < 0) out.push(v);
    return out;
  }
  function visitingCitiesBrute(n, flights) {
    const routes = [];
    const walk = (v, cost, path) => {
      if (v === n) { routes.push([cost, path.slice()]); return; }
      flights.forEach(([a, b, c]) => { if (a === v && !path.includes(b)) { path.push(b); walk(b, cost + c, path); path.pop(); } });
    };
    walk(1, 0, [1]);
    const best = Math.min(...routes.map((r) => r[0]));
    const shortest = routes.filter((r) => r[0] === best).map((r) => r[1]);
    const out = [];
    for (let v = 1; v <= n; v += 1) if (shortest.every((path) => path.includes(v))) out.push(v);
    return out;
  }
  function graphColoringBrute(n, edges) {
    for (let k = 1; k <= n; k += 1) {
      const colors = new Array(n + 1).fill(0);
      const place = (v) => {
        if (v > n) return true;
        for (let c = 1; c <= k; c += 1) {
          if (edges.some(([a, b]) => (a === v && colors[b] === c) || (b === v && colors[a] === c))) continue;
          colors[v] = c;
          if (place(v + 1)) return true;
          colors[v] = 0;
        }
        return false;
      };
      if (place(1)) return { k, colors: colors.slice(1) };
    }
    return { k: 0, colors: [] };
  }
  function busCompaniesBrute(n, costs, companies) {
    const dist = new Array(n + 1).fill(Infinity);
    dist[1] = 0;
    for (let round = 0; round < n; round += 1) companies.forEach((list, j) => list.forEach((a) => list.forEach((b) => { if (dist[a] + costs[j] < dist[b]) dist[b] = dist[a] + costs[j]; })));
    return dist.slice(1);
  }
  function splitIntoTwoPathsBrute(n, edges) {
    const order = courseSchedule(n, edges), has = new Set(edges.map(([a, b]) => a * (n + 1) + b));
    const isPath = (list) => list.every((v, i) => i === 0 || has.has(list[i - 1] * (n + 1) + v));
    for (let mask = 0; mask < Math.pow(2, n); mask += 1) {
      const first = order.filter((v, i) => mask & (1 << i)), second = order.filter((v, i) => !(mask & (1 << i)));
      if (isPath(first) && isPath(second)) return [first, second];
    }
    return null;
  }
  function networkRenovationBrute(n, connections) {
    const candidates = [];
    for (let a = 1; a <= n; a += 1) for (let b = a + 1; b <= n; b += 1) candidates.push([a, b]);
    for (let count = 0; count <= candidates.length; count += 1) {
      const pick = (start, chosen) => {
        if (chosen.length === count) return bridgeless(n, connections.concat(chosen)) ? chosen.slice() : null;
        for (let i = start; i < candidates.length; i += 1) { chosen.push(candidates[i]); const found = pick(i + 1, chosen); chosen.pop(); if (found) return found; }
        return null;
      };
      const found = pick(0, []);
      if (found) return found;
    }
    return null;
  }
  function forbiddenCitiesBrute(n, roads, queries) {
    const adjacency = adjacencyOf(n, roads, false);
    return queries.map(([a, b, c]) => a !== c && b !== c && bfsFrom(n, adjacency, a, c)[b] >= 0);
  }
  function creatingOfficesBrute(n, d, roads) {
    const dist = treeDistances(n, roads);
    let best = [];
    for (let mask = 1; mask < Math.pow(2, n); mask += 1) {
      const chosen = [];
      for (let v = 1; v <= n; v += 1) if (mask & (1 << (v - 1))) chosen.push(v);
      if (chosen.length <= best.length) continue;
      if (chosen.every((u, i) => chosen.every((w, j) => j <= i || dist[u][w] >= d))) best = chosen;
    }
    return best;
  }
  function newFlightRoutesBrute(n, flights) {
    const pairs = [];
    for (let a = 1; a <= n; a += 1) for (let b = 1; b <= n; b += 1) if (a !== b) pairs.push([a, b]);
    for (let count = 0; count <= pairs.length; count += 1) {
      const pick = (start, chosen) => {
        if (chosen.length === count) return stronglyConnected(n, flights.concat(chosen)) ? chosen.slice() : null;
        for (let i = start; i < pairs.length; i += 1) { chosen.push(pairs[i]); const found = pick(i + 1, chosen); chosen.pop(); if (found) return found; }
        return null;
      };
      const found = pick(0, []);
      if (found) return found;
    }
    return null;
  }

  // ------------------------------------------------------------------ validators (answers with more than one correct form)
  function viaBrute(accept, brute) { return (args, out) => accept(args, out, brute.apply(null, JSON.parse(JSON.stringify(args)))) === true; }
  function treeEdgesAccept(args, actual, expected) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return "Return the n − 1 edges of the tree.";
    const norm = (list) => list.map((e) => (Array.isArray(e) ? Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1]) : "?")).sort();
    const got = norm(actual), want = norm(expected);
    for (let i = 0; i < want.length; i += 1) if (got[i] !== want[i]) return "Edge " + got[i] + " is not in the tree this code describes.";
    return true;
  }
  function acyclicAccept(args, actual) {
    const [n, edges] = args;
    const same = sameEdgesAnyDirection(edges, actual);
    if (same !== true) return same;
    return courseSchedule(n, actual) ? true : "These directions leave a directed cycle.";
  }
  function stronglyConnectedAccept(args, actual, expected) {
    const [n, edges] = args;
    if (expected === null) return actual === null ? true : "No orientation works here (the graph is disconnected or has a bridge); return null.";
    if (actual === null) return "An orientation exists; null is wrong here.";
    const same = sameEdgesAnyDirection(edges, actual);
    if (same !== true) return same;
    return stronglyConnected(n, actual) ? true : "Some city cannot reach every other city with these directions.";
  }
  function evenOutdegreeAccept(args, actual, expected) {
    const [n, edges] = args;
    if (expected === null) return actual === null ? true : "Some connected piece has an odd number of edges, so no orientation works; return null.";
    if (actual === null) return "An orientation exists; null is wrong here.";
    const same = sameEdgesAnyDirection(edges, actual);
    if (same !== true) return same;
    const out = new Array(n + 1).fill(0);
    actual.forEach(([a]) => { out[a] += 1; });
    const odd = out.findIndex((d) => d % 2 === 1);
    return odd < 0 ? true : "Node " + odd + " has odd outdegree " + out[odd] + ".";
  }
  function ahuAccept(args, actual) {
    const [n, edges, root] = args;
    if (!Array.isArray(actual) || actual.length !== n || !actual.every((c) => Number.isInteger(c) && c >= 1)) return "Return one positive integer code per node.";
    const adjacency = adjacencyOf(n, edges, false), parent = new Array(n + 1).fill(0), order = [root];
    const seen = new Array(n + 1).fill(false);
    seen[root] = true;
    for (let i = 0; i < order.length; i += 1) adjacency[order[i]].forEach((u) => { if (!seen[u]) { seen[u] = true; parent[u] = order[i]; order.push(u); } });
    const canon = new Array(n + 1), children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let i = order.length - 1; i >= 0; i -= 1) { const v = order[i]; canon[v] = "(" + children[v].sort().join("") + ")"; if (parent[v]) children[parent[v]].push(canon[v]); }
    const byCode = new Map(), byCanon = new Map();
    for (let v = 1; v <= n; v += 1) {
      const code = actual[v - 1];
      if (byCode.has(code) && byCode.get(code) !== canon[v]) return "Nodes with different subtree shapes share code " + code + ".";
      if (byCanon.has(canon[v]) && byCanon.get(canon[v]) !== code) return "Two subtrees of the same shape got different codes.";
      byCode.set(code, canon[v]); byCanon.set(canon[v], code);
    }
    return true;
  }
  function centersAccept(args, actual, expected) {
    if (!Array.isArray(actual)) return "Return the centers as a list.";
    const got = actual.slice().sort((p, q) => p - q);
    return JSON.stringify(got) === JSON.stringify(expected) ? true : "The centers are " + JSON.stringify(expected) + ".";
  }
  function coloringAccept(args, actual, expected) {
    const [n, edges] = args;
    if (!actual || !Number.isInteger(actual.k) || !Array.isArray(actual.colors) || actual.colors.length !== n) return "Return { k, colors } with one color per node.";
    if (actual.k !== expected.k) return "The fewest colors is " + expected.k + ", not " + actual.k + ".";
    if (!actual.colors.every((c) => Number.isInteger(c) && c >= 1 && c <= actual.k)) return "Every color must be between 1 and k.";
    const clash = edges.find(([a, b]) => actual.colors[a - 1] === actual.colors[b - 1]);
    return clash ? "Nodes " + clash[0] + " and " + clash[1] + " share an edge and a color." : true;
  }
  function splitAccept(args, actual, expected) {
    const [n, edges] = args;
    if (expected === null) return actual === null ? true : "No two paths cover every node here; return null.";
    if (actual === null) return "Two such paths exist; null is wrong here.";
    if (!Array.isArray(actual) || actual.length !== 2 || !actual.every(Array.isArray)) return "Return [firstPath, secondPath].";
    const has = new Set(edges.map(([a, b]) => a * (n + 1) + b)), seen = new Array(n + 1).fill(false);
    for (const path of actual) {
      for (let i = 0; i < path.length; i += 1) {
        const v = path[i];
        if (!Number.isInteger(v) || v < 1 || v > n || seen[v]) return "Node " + v + " is missing, repeated or out of range.";
        seen[v] = true;
        if (i > 0 && !has.has(path[i - 1] * (n + 1) + v)) return "There is no edge " + path[i - 1] + " → " + v + ".";
      }
    }
    return seen.slice(1).every(Boolean) ? true : "Every node must be on one of the paths.";
  }
  function renovationAccept(args, actual, expected) {
    const [n, connections] = args;
    if (!Array.isArray(actual) || !actual.every((e) => Array.isArray(e) && e.length === 2 && e.every((v) => Number.isInteger(v) && v >= 1 && v <= n) && e[0] !== e[1])) return "Return a list of new connections [a, b].";
    if (actual.length !== expected.length) return actual.length + " connections were added, but " + expected.length + " are enough.";
    return bridgeless(n, connections.concat(actual)) ? true : "Some connection can still break the network.";
  }
  function officesAccept(args, actual, expected) {
    const [n, d, roads] = args;
    if (!Array.isArray(actual) || !actual.every((v) => Number.isInteger(v) && v >= 1 && v <= n) || new Set(actual).size !== actual.length) return "Return distinct cities.";
    if (actual.length !== expected.length) return actual.length + " offices, but " + expected.length + " fit.";
    const lists = centroidAncestors(n, roads), nearest = new Array(n + 1).fill(Infinity);
    for (const v of actual) {
      const list = lists[v - 1];
      for (let k = 0; k < list.length; k += 2) if (nearest[list[k]] + list[k + 1] < d) return "City " + v + " is closer than " + d + " to another office.";
      for (let k = 0; k < list.length; k += 2) nearest[list[k]] = Math.min(nearest[list[k]], list[k + 1]);
    }
    return true;
  }
  function newFlightsAccept(args, actual, expected) {
    const [n, flights] = args;
    if (!Array.isArray(actual) || !actual.every((e) => Array.isArray(e) && e.length === 2 && e.every((v) => Number.isInteger(v) && v >= 1 && v <= n))) return "Return a list of new flights [a, b].";
    if (actual.length !== expected.length) return actual.length + " new flights, but " + expected.length + " are enough.";
    const label = planetsAndKingdoms(n, flights.concat(actual));
    return label.every((x) => x === label[0]) ? true : "Some city still cannot reach every other city.";
  }
  // Checks a centroid decomposition by its meaning: every piece is connected, its centroid is inside it with the
  // right distances, removing the centroid splits it into exactly the next pieces, and each of those is at most half.
  function centroidAccept(args, actual) {
    const [n, edges] = args;
    if (!Array.isArray(actual) || actual.length !== n) return "Return one list per node.";
    const limit = Math.floor(Math.log2(n)) + 1;
    const groups = new Map(), pieceOf = [];
    for (let v = 1; v <= n; v += 1) {
      const list = actual[v - 1];
      if (!Array.isArray(list) || list.length % 2 || list.length < 2 || list[list.length - 2] !== v || list[list.length - 1] !== 0) return "The list of node " + v + " must end with " + v + ", 0.";
      if (list.length / 2 > limit) return "Node " + v + " sits under " + list.length / 2 + " centroids; halving pieces allow at most " + limit + ".";
      let key = "";
      const keys = [];
      for (let k = 0; k < list.length; k += 2) {
        key += "," + list[k];
        keys.push(key);
        if (!groups.has(key)) groups.set(key, { centroid: list[k], level: k / 2, members: [] });
        groups.get(key).members.push([v, list[k + 1]]);
      }
      pieceOf.push(keys);
    }
    const adjacency = adjacencyOf(n, edges, false);
    for (const [key, group] of groups) {
      const c = group.centroid, own = pieceOf[c - 1];
      if (own.length !== group.level + 1 || own[group.level] !== key) return "Centroid " + c + " must end its own list at the level of the piece it splits.";
      const inside = new Set(group.members.map((m) => m[0]));
      const dist = new Map([[c, 0]]), queue = [c];
      for (let head = 0; head < queue.length; head += 1) adjacency[queue[head]].forEach((u) => { if (inside.has(u) && !dist.has(u)) { dist.set(u, dist.get(queue[head]) + 1); queue.push(u); } });
      if (dist.size !== inside.size) return "The piece split by centroid " + c + " is not connected.";
      for (const [v, d] of group.members) if (dist.get(v) !== d) return "Node " + v + " is " + dist.get(v) + " from centroid " + c + ", not " + d + ".";
      const below = new Map();
      for (const [v] of group.members) {
        if (v === c) continue;
        const next = pieceOf[v - 1][group.level + 1];
        below.set(next, (below.get(next) || 0) + 1);
        for (const u of adjacency[v]) if (u !== c && inside.has(u) && pieceOf[u - 1][group.level + 1] !== next) return "Nodes " + v + " and " + u + " are joined after removing " + c + " but sit in different pieces.";
      }
      for (const [, count] of below) if (count * 2 > group.members.length) return "Removing " + c + " leaves a piece of " + count + " nodes out of " + group.members.length + "; a centroid leaves at most half.";
    }
    return true;
  }

  // ------------------------------------------------------------------ input builders
  function randomTree(seed, n) {
    const next = rng(seed), order = randomPermutation(seed + 7, n), edges = [];
    for (let i = 1; i < n; i += 1) edges.push([order[Math.floor(next() * i)], order[i]]);
    return edges;
  }
  function pathTree(n) { const edges = []; for (let v = 2; v <= n; v += 1) edges.push([v - 1, v]); return edges; }
  function weighted(seed, edges, lo, hi) { const w = randomInts(seed, edges.length, lo, hi); return edges.map((e, i) => [e[0], e[1], w[i]]); }
  function randomGraph(seed, n, m) {
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
  function connectedGraph(seed, n, m) {
    const tree = randomTree(seed, n), seen = new Set(tree.map(([a, b]) => Math.min(a, b) * (n + 1) + Math.max(a, b))), edges = tree.slice();
    const next = rng(seed + 1);
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
  function randomDag(seed, n, m) {
    const next = rng(seed), order = randomPermutation(seed + 1, n), seen = new Set(), edges = [];
    let tries = 0;
    while (edges.length < m && tries < 50 * m + 100) {
      tries += 1;
      const i = Math.floor(next() * n), j = Math.floor(next() * n);
      if (i === j) continue;
      const a = order[Math.min(i, j)], b = order[Math.max(i, j)];
      if (seen.has(a * (n + 1) + b)) continue;
      seen.add(a * (n + 1) + b); edges.push([a, b]);
    }
    return edges;
  }
  function randomDigraph(seed, n, m) {
    const next = rng(seed), seen = new Set(), edges = [];
    let tries = 0;
    while (edges.length < m && tries < 50 * m + 100) {
      tries += 1;
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (a === b || seen.has(a * (n + 1) + b)) continue;
      seen.add(a * (n + 1) + b); edges.push([a, b]);
    }
    return edges;
  }
  function randomPairs(seed, n, q) { const next = rng(seed), out = []; for (let i = 0; i < q; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]); return out; }
  function randomTriples(seed, n, q) { const next = rng(seed), out = []; for (let i = 0; i < q; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]); return out; }
  function relabel(seed, n, edges) { const p = randomPermutation(seed, n); return edges.map(([a, b]) => [p[a - 1], p[b - 1]]); }
  function relabelKeepRoot(seed, n, edges) { const p = [1].concat(randomPermutation(seed, n - 1).map((v) => v + 1)); return edges.map(([a, b]) => [p[a - 1], p[b - 1]]); }
  function coinList(seed, n, ratio) { const next = rng(seed), out = []; for (let i = 0; i < n; i += 1) out.push(next() < ratio ? 1 : 0); if (!out.includes(1)) out[Math.floor(next() * n)] = 1; return out; }
  function randomSets(seed, m, count, largest) {
    const next = rng(seed), order = randomPermutation(seed + 3, m), out = [];
    let at = 0;
    for (let i = 0; i < count && at < m; i += 1) { const size = Math.min(m - at, 1 + Math.floor(next() * largest)); out.push(order.slice(at, at + size)); at += size; }
    return out;
  }
  function walkQueries(seed, n, q, maxLength) { const next = rng(seed), out = []; for (let i = 0; i < q; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n), Math.floor(next() * (maxLength + 1))]); return out; }
  function companyList(seed, n, m, largest) {
    const next = rng(seed), out = [];
    for (let j = 0; j < m; j += 1) { const size = 2 + Math.floor(next() * (largest - 1)); const set = new Set(); while (set.size < Math.min(size, n)) set.add(1 + Math.floor(next() * n)); out.push(Array.from(set)); }
    return out;
  }
  // Companies chained so every city is reachable from city 1.
  function reachableCompanies(seed, n, m, largest) {
    const list = companyList(seed, n, m, largest), order = randomPermutation(seed + 5, n);
    const at = order.indexOf(1);
    order[at] = order[0]; order[0] = 1;
    for (let i = 1; i < n; i += 1) list.push([order[i - 1], order[i]]);
    return list;
  }
  // Two random chains through all nodes, plus decoy edges that keep the graph acyclic.
  function twoPathDag(seed, n, extra, splittable) {
    const next = rng(seed), order = randomPermutation(seed + 1, n), side = [], edges = [], seen = new Set();
    order.forEach(() => side.push(next() < 0.5 ? 0 : 1));
    const add = (a, b) => { if (a !== b && !seen.has(a * (n + 1) + b)) { seen.add(a * (n + 1) + b); edges.push([a, b]); } };
    const last = [0, 0];
    order.forEach((v, i) => { const s = side[i]; if (last[s]) add(last[s], v); last[s] = v; });
    for (let k = 0; k < extra; k += 1) { const i = Math.floor(next() * n), j = Math.floor(next() * n); if (i < j) add(order[i], order[j]); }
    if (!splittable) { const cut = edges.findIndex(() => next() < 0.3); if (cut >= 0) edges.splice(cut, 1); }
    return edges;
  }
  function shortestRouteGraph(seed, n, m, lo, hi) {
    const tree = randomDag(seed, n, m).map(([a, b]) => [a, b]), next = rng(seed + 2), edges = [];
    for (let v = 1; v < n; v += 1) edges.push([v, v + 1, lo + Math.floor(next() * (hi - lo + 1))]);
    tree.forEach(([a, b]) => { const x = Math.min(a, b), y = Math.max(a, b); if (x !== y) edges.push([x, y, lo + Math.floor(next() * (hi - lo + 1)) * (y - x)]); });
    return edges;
  }
  // A path 1 → … → n with side detours and back edges, so some path cities are bypassed and some are not.
  function criticalGraph(seed, n, m) {
    const next = rng(seed), edges = [], seen = new Set();
    const add = (a, b) => { if (a !== b && !seen.has(a * (n + 1) + b)) { seen.add(a * (n + 1) + b); edges.push([a, b]); } };
    for (let v = 1; v < n; v += 1) add(v, v + 1);
    for (let tries = 0; edges.length < m && tries < 50 * m + 100; tries += 1) { const a = 1 + Math.floor(next() * n), span = 1 + Math.floor(next() * 3); add(a, Math.max(1, Math.min(n, next() < 0.8 ? a + span : a - span))); }
    return edges;
  }
  function deepTreeChain(seed, n) { const edges = []; const next = rng(seed); for (let v = 2; v <= n; v += 1) edges.push([Math.max(1, v - 1 - Math.floor(next() * 3)), v]); return edges; }
  function site(label, url) { return Object.freeze({ label, url }); }
  const CP = "https://cp-algorithms.com/";
  function variant(id, message, fn, edits) {
    let source = fn.toString();
    edits.forEach(([from, to, all]) => {
      if (source.indexOf(from) < 0) throw new Error("variant " + id + " cannot find: " + from);
      source = all ? source.split(from).join(to) : source.replace(from, () => to);
    });
    return Object.freeze({ id, message, source });
  }

  // A random binary tree's preorder and inorder, built without recursion so a long chain is safe.
  function binaryTreeOrders(seed, n, chain) {
    const next = rng(seed), labels = randomPermutation(seed + 1, n), left = new Array(n + 1).fill(0), right = new Array(n + 1).fill(0);
    for (let i = 1; i < n; i += 1) {
      if (chain) { right[labels[i - 1]] = labels[i]; continue; }
      let at = labels[0];
      while (true) { const side = next() < 0.5 ? left : right; if (side[at]) at = side[at]; else { side[at] = labels[i]; break; } }
    }
    const pre = [], ino = [], stack = [];
    let v = labels[0];
    const walk = [labels[0]];
    while (walk.length) { const x = walk.pop(); pre.push(x); if (right[x]) walk.push(right[x]); if (left[x]) walk.push(left[x]); }
    while (v || stack.length) { while (v) { stack.push(v); v = left[v]; } v = stack.pop(); ino.push(v); v = right[v]; }
    return [pre, ino];
  }
  // A cycle through every node plus chords: no bridges, so an orientation exists; a pendant node adds a bridge.
  function bridgelessGraph(seed, n, m, pendant) {
    const order = randomPermutation(seed, n - (pendant ? 1 : 0)), edges = [], seen = new Set();
    const add = (a, b) => { const key = Math.min(a, b) * (n + 1) + Math.max(a, b); if (a !== b && !seen.has(key)) { seen.add(key); edges.push([a, b]); } };
    for (let i = 0; i < order.length; i += 1) add(order[i], order[(i + 1) % order.length]);
    const next = rng(seed + 1);
    while (edges.length < m - (pendant ? 1 : 0)) add(order[Math.floor(next() * order.length)], order[Math.floor(next() * order.length)]);
    if (pendant) edges.push([n, order[0]]);
    return edges;
  }
  function cycleGraph(n) { const edges = []; for (let v = 1; v <= n; v += 1) edges.push([v, (v % n) + 1]); return edges; }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const SHOPS_BIG = lazy(() => [100000, randomPermutation(1401, 100000).slice(0, 10000), randomGraph(1402, 100000, 200000)]);
  const PRUFER_BIG = lazy(() => randomInts(1403, 199998, 1, 200000));
  const TRAVERSAL_BIG = lazy(() => binaryTreeOrders(1404, 100000, false));
  const TRAVERSAL_CHAIN = lazy(() => binaryTreeOrders(1405, 100000, true));
  const COURSES_BIG = lazy(() => randomDag(1406, 100000, 200000));
  const ACYCLIC_BIG = lazy(() => randomGraph(1407, 100000, 200000));
  const ORIENT_YES = lazy(() => bridgelessGraph(1408, 100000, 200000, false));
  const ORIENT_BRIDGE = lazy(() => bridgelessGraph(1409, 100000, 200000, true));
  const EVEN_YES = lazy(() => connectedGraph(1410, 100000, 200000));
  const EVEN_ODD = lazy(() => connectedGraph(1411, 100000, 199999));
  const GIRTH_RANDOM = lazy(() => randomGraph(1412, 2500, 5000));
  const WALK_GRAPH = lazy(() => connectedGraph(1413, 2500, 5000));
  const WALK_QUERIES = lazy(() => walkQueries(1414, 2500, 100000, 1000000000));
  const SPEEDS_BIG = lazy(() => weighted(1415, randomTree(1416, 200000), 1, 1000000));
  const MST_TIES = lazy(() => weighted(1417, connectedGraph(1418, 100000, 200000), 1, 100));
  const MST_SETS = lazy(() => randomSets(1419, 200000, 100000, 3));
  const MST_WIDE = lazy(() => weighted(1420, connectedGraph(1421, 100000, 200000), 1, 1000000000));
  const PATH_TREE = lazy(() => weighted(1422, randomTree(1423, 20000), 1, 1000000000));
  const BREAKDOWN_BIG = lazy(() => { const c = randomGraph(1424, 100000, 200000); return [100000, c, randomPermutation(1425, c.length).map((i) => c[i - 1].slice())]; });

  const COIN_TREE_BIG = lazy(() => randomTree(1426, 100000));
  const COINS_BIG = lazy(() => coinList(1427, 100000, 0.01));
  const COIN_QUERIES_BIG = lazy(() => randomPairs(1428, 100000, 100000));
  const ISO_TREE = lazy(() => randomTree(1429, 100000));
  const ISO_ROOTED_COPY = lazy(() => relabelKeepRoot(1430, 100000, ISO_TREE()));
  const ISO_COPY = lazy(() => relabel(1431, 100000, ISO_TREE()));
  // The same tree with one leaf hung somewhere else.
  const ISO_MOVED = lazy(() => {
    const edges = ISO_TREE().map((e) => e.slice()), degree = new Array(100001).fill(0);
    edges.forEach(([a, b]) => { degree[a] += 1; degree[b] += 1; });
    const at = edges.findIndex(([a, b]) => degree[b] === 1 && a !== 1 && b !== 1);
    const [a, b] = edges[at];
    let target = 2;
    while (target === a || target === b) target += 1;
    edges[at] = [target, b];
    return edges;
  });
  const CENTERS_TREE = lazy(() => randomTree(1432, 200000));
  const REQUESTS_BIG = lazy(() => randomDigraph(1433, 100000, 200000));
  const CRITICAL_BIG = lazy(() => criticalGraph(1434, 100000, 200000));
  const VISITING_BIG = lazy(() => shortestRouteGraph(1435, 100000, 100000, 1, 3));
  const COLORING_BIG = lazy(() => randomGraph(1436, 16, 60));
  const BUS_BIG = lazy(() => { const companies = reachableCompanies(1437, 50000, 30000, 3); return [50000, randomInts(1438, companies.length, 1, 1000000000), companies]; });
  const SPLIT_YES = lazy(() => twoPathDag(1439, 100000, 150000, true));
  const SPLIT_NO = lazy(() => twoPathDag(1440, 100000, 150000, false));
  const RENOVATION_TREE = lazy(() => randomTree(1441, 100000));
  const FORBIDDEN_GRAPH = lazy(() => connectedGraph(1442, 100000, 200000));
  const FORBIDDEN_QUERIES = lazy(() => randomTriples(1443, 100000, 100000));
  const CENTROID_TREE = lazy(() => randomTree(1444, 20000));
  const OFFICES_TREE = lazy(() => randomTree(1445, 100000));
  const NEW_FLIGHTS_BIG = lazy(() => randomDigraph(1446, 100000, 100000));

  const SAMPLE_MST = [[1, 2, 4], [1, 3, 2], [2, 4, 2], [3, 4, 1], [3, 5, 3], [4, 5, 3]];
  const SAMPLE_COIN_TREE = [[2, 4], [2, 3], [1, 3], [3, 5]];

  const ADVANCED_GRAPHS = [
    {
      id: "nearest-shops", title: "Nearest Shops", cses: { id: 3303, name: "Nearest Shops" },
      goal: "For every city, the distance to the nearest city with a shop other than itself, or −1 if there is none.",
      concept: "One breadth-first search from all shops at once gives every city its nearest shop, but a shop city then just finds itself. So let every city remember its two nearest shops from different sources: a city is expanded again only when a second, different shop reaches it. Each city enters the queue at most twice, and a shop city answers with its second shop.",
      functionName: "nearestShops", signature: "nearestShops(n, shops, roads) → distances",
      starterSource: starter("nearestShops", "n, shops, roads", "Multi-source BFS where each city keeps its nearest shop and its nearest different shop; shop cities answer with the second."),
      solve: nearestShops, comparator: "deep", brute: nearestShopsBrute, small: (round) => { const n = 1 + (round % 8); return [n, randomPermutation(14000 + round, n).slice(0, 1 + (round % Math.min(3, n))), randomGraph(14100 + round, n, round % 10)]; },
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample": { a: 9, b: [[1, 2], [1, 3], [1, 8], [2, 4], [3, 4], [5, 6]], c: [2, 4, 5, 7], marks: [2, 4, 5, 7] }, "a lonely shop": { a: 3, b: [[1, 2], [2, 3]], c: [2], marks: [2] }, "blocked by its own area": { a: 5, b: [[1, 2], [2, 3], [3, 4], [4, 5]], c: [1, 5], marks: [1, 5] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("counts-its-own-shop", "A shop city wants the nearest shop in another city; its own shop at distance 0 does not count.", nearestShops, [["answers.push(firstDist[v] === 0 ? secondDist[v] : firstDist[v]);", "answers.push(firstDist[v]);"]]),
        diagnosis("one-source-per-city", "With one source per city, a shop's whole neighbourhood can belong to it and hide the next shop; keep a second, different source too.", function nearestShops(n, shops, roads) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < roads.length; i += 1) { adjacency[roads[i][0]].push(roads[i][1]); adjacency[roads[i][1]].push(roads[i][0]); } const dist = new Array(n + 1).fill(-1), source = new Array(n + 1).fill(0), queue = []; shops.forEach((s) => { dist[s] = 0; source[s] = s; queue.push(s); }); for (let head = 0; head < queue.length; head += 1) { const v = queue[head]; adjacency[v].forEach((u) => { if (dist[u] < 0) { dist[u] = dist[v] + 1; source[u] = source[v]; queue.push(u); } }); } const answers = []; for (let v = 1; v <= n; v += 1) { if (dist[v] !== 0) { answers.push(dist[v]); continue; } let best = -1; adjacency[v].forEach((u) => { if (source[u] !== v && dist[u] >= 0 && (best < 0 || dist[u] + 1 < best)) best = dist[u] + 1; }); answers.push(best); } return answers; }),
      ],
      hints: ["Queue entries are (city, shop, distance); start with every shop at distance 0 from itself.", "Reaching u from shop s: if u has no shop yet, s is its first; else if u has no second shop and s differs from the first, s is its second; only then enqueue (u, s).", "A shop city answers with its second distance, every other city with its first (−1 when missing)."],
      cases: [
        example([9, [2, 4, 5, 7], [[1, 2], [1, 3], [1, 8], [2, 4], [3, 4], [5, 6]]], [1, 1, 1, 1, -1, 1, -1, 2, -1], "CSES sample"),
        example([3, [2], [[1, 2], [2, 3]]], [1, -1, 1], "the only shop has no other shop"),
        example([5, [1, 5], [[1, 2], [2, 3], [3, 4], [4, 5]]], [4, 1, 2, 1, 4], "the other shop is behind the area nearest to this one"),
        run(nearestShops, [8, [2, 6], randomGraph(14200, 8, 10)], "eight cities"),
        hidden("n = 10⁵, m = 2·10⁵, k = 10⁴, time limit", () => SHOPS_BIG()),
      ],
    },
    {
      id: "prufer-code", title: "Prüfer Code", cses: { id: 1134, name: "Prüfer Code" },
      goal: "The n − 1 edges of the tree whose Prüfer code is given, in any order.",
      concept: "Encoding removed the smallest leaf again and again and wrote down its neighbour, so a node appears in the code exactly (degree − 1) times. Decoding replays that: the nodes that never appear still to come are the current leaves, and a min-heap hands out the smallest one. Join it to the next code value, and when that value has no appearances left it becomes a leaf too. The last two remaining nodes form the final edge.",
      functionName: "pruferCode", signature: "pruferCode(n, code) → edges",
      starterSource: starter("pruferCode", "n, code", "degree = 1 + appearances; heap of degree-1 nodes; for each code value join the smallest leaf to it; the last two leaves form the final edge."),
      solve: pruferCode, comparator: "deep", dependencies: ["heap-push", "heap-pop"], accept: treeEdgesAccept, check: viaBrute(treeEdgesAccept, pruferCodeBrute), small: (round) => { const n = 3 + (round % 7); return [n, randomInts(14300 + round, n - 2, 1, n)]; },
      reference: site("cp-algorithms · Prüfer code", CP + "graph/pruefer_code.html"),
      presets: { "CSES sample": { a: 5, b: [], c: [2, 2, 4] }, "a star": { a: 5, b: [], c: [3, 3, 3] }, "a path": { a: 5, b: [], c: [2, 3, 4] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("largest-leaf-first", "The code always removed the smallest leaf; decoding has to take the smallest one too.", pruferCode, [["heapPush(leaves, [v])", "heapPush(leaves, [-v])"], ["heapPush(leaves, [next])", "heapPush(leaves, [-next])"], ["heapPop(leaves).item[0]", "-heapPop(leaves).item[0]", true]]),
        variant("forgets-the-last-edge", "The code has n − 2 values but the tree has n − 1 edges: the two nodes left at the end are joined too.", pruferCode, [["edges.push([u, w]);", ""]]),
      ],
      hints: ["degree[v] = 1 + the number of times v appears in the code; the nodes of degree 1 are the first leaves.", "For each code value x: take the smallest leaf, add [leaf, x], lower degree[x], and push x when its degree reaches 1.", "The two nodes left in the heap at the end form the last edge."],
      cases: [
        example([5, [2, 2, 4]], [[1, 2], [2, 3], [2, 4], [4, 5]], "CSES sample"),
        example([3, [2]], [[1, 2], [3, 2]], "three nodes"),
        example([5, [3, 3, 3]], [[1, 3], [2, 3], [4, 3], [3, 5]], "a star"),
        run(pruferCode, [9, [4, 4, 7, 1, 9, 2, 2]], "nine nodes"),
        hidden("n = 2·10⁵, time limit", () => [200000, PRUFER_BIG()]),
      ],
    },
    {
      id: "tree-traversals", title: "Tree Traversals", cses: { id: 1702, name: "Tree Traversals" },
      goal: "The postorder of the binary tree with the given preorder and inorder.",
      concept: "The first preorder value is the root, and its place in the inorder splits the inorder into the left and the right subtree, which also fixes how many preorder values belong to each side. Recursing on both sides and writing the root last gives the postorder. A chain of 10⁵ nodes would overflow the call stack, so the recursion runs on an explicit stack of (preorder start, inorder start, size) frames.",
      functionName: "treeTraversals", signature: "treeTraversals(preorder, inorder) → postorder",
      starterSource: starter("treeTraversals", "preorder, inorder", "position of every value in the inorder; an explicit stack of frames: left subtree, right subtree, then the root."),
      solve: treeTraversals, comparator: "deep", brute: treeTraversalsBrute, small: (round) => binaryTreeOrders(14400 + round, 1 + (round % 9), round % 7 === 0),
      reference: book("14.1", "Tree traversal"),
      presets: { "CSES sample": { a: [5, 3, 2, 1, 4], b: [3, 5, 1, 2, 4] }, "a left chain": { a: [3, 2, 1], b: [1, 2, 3] }, "one node": { a: [1], b: [1] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("right-subtree-first", "Postorder finishes the left subtree before starting the right one.", treeTraversals, [["      stack.push([preStart + 1 + leftSize, inStart + leftSize + 1, size - leftSize - 1, 0]);\n      stack.push([preStart + 1, inStart, leftSize, 0]);", "      stack.push([preStart + 1, inStart, leftSize, 0]);\n      stack.push([preStart + 1 + leftSize, inStart + leftSize + 1, size - leftSize - 1, 0]);"]]),
        variant("root-first", "Postorder writes the root after both subtrees; writing it first gives the preorder back.", treeTraversals, [["stack.push([preStart, inStart, size, 1]);", "post.push(root);"]]),
      ],
      hints: ["position[x] = index of x in the inorder.", "For a frame (preStart, inStart, size): root = preorder[preStart], leftSize = position[root] − inStart; the right subtree starts at preStart + 1 + leftSize and inStart + leftSize + 1.", "Push (root, emit later), then the right frame, then the left frame, so the left subtree comes out first and the root last."],
      cases: [
        example([[5, 3, 2, 1, 4], [3, 5, 1, 2, 4]], [3, 1, 4, 2, 5], "CSES sample"),
        example([[1], [1]], [1], "one node"),
        example([[3, 2, 1], [1, 2, 3]], [1, 2, 3], "a left chain"),
        example([[1, 2, 3], [1, 2, 3]], [3, 2, 1], "a right chain"),
        run(treeTraversals, binaryTreeOrders(14500, 12, false), "twelve nodes"),
        hidden("n = 10⁵, time limit", () => TRAVERSAL_BIG()),
        hidden("a chain of 10⁵ nodes", () => TRAVERSAL_CHAIN()),
      ],
    },
    {
      id: "course-schedule-ii", title: "Course Schedule II", cses: { id: 1757, name: "Course Schedule II" },
      goal: "The order of all courses that finishes course 1 as early as possible, then course 2, and so on, respecting every requirement.",
      concept: "Taking the smallest available course first is not enough: course 1 may wait behind a larger course that another small course does not need. Think from the end instead. Among the courses nothing still depends on, put the largest one last, because any course placed later would only delay smaller numbers. Repeating that with a max-heap on the reversed graph and reversing the result is exactly the order wanted.",
      functionName: "courseScheduleII", signature: "courseScheduleII(n, requirements) → order",
      starterSource: starter("courseScheduleII", "n, requirements", "Reverse graph; heap of courses with no remaining dependants, largest first; build the order from the end and reverse it."),
      solve: courseScheduleII, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: courseScheduleIIBrute, small: (round) => { const n = 1 + (round % 6); return [n, randomDag(14600 + round, n, Math.min(n * (n - 1) / 2, round % 8))]; },
      reference: book("16.1", "Topological sorting"),
      presets: { "CSES sample": { a: 4, b: [[2, 1], [2, 3]], directed: true }, "a smallest-first trap": { a: 3, b: [[3, 1]], directed: true }, "a chain": { a: 4, b: [[4, 3], [3, 2], [2, 1]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("smallest-first", "The smallest available course first gives the smallest order, not course 1 first: 2 may be free while 1 still waits on 3.", function courseScheduleII(n, requirements) { const next = [], indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) next.push([]); requirements.forEach(([a, b]) => { next[a].push(b); indegree[b] += 1; }); const ready = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) heapPush(ready, [v]); const order = []; while (ready.length) { const v = heapPop(ready).item[0]; order.push(v); next[v].forEach((u) => { indegree[u] -= 1; if (indegree[u] === 0) heapPush(ready, [u]); }); } return order; }),
        variant("forgets-to-reverse", "The order is built from the last course backwards, so it has to be reversed at the end.", courseScheduleII, [["return order.reverse();", "return order;"]]),
      ],
      hints: ["For every requirement a → b store a in back[b] and count remaining[a] += 1 (courses still to come after a).", "Heap of courses with remaining = 0, keyed by −v so the largest comes out first; each popped course goes to the end of the schedule.", "Popping v frees every a in back[v] whose remaining drops to 0; reverse the collected order at the end."],
      cases: [
        example([4, [[2, 1], [2, 3]]], [2, 1, 3, 4], "CSES sample"),
        example([3, [[3, 1]]], [3, 1, 2], "course 1 waits on course 3"),
        example([4, [[4, 3], [3, 2], [2, 1]]], [4, 3, 2, 1], "a chain fixes the order"),
        example([3, []], [1, 2, 3], "no requirements"),
        run(courseScheduleII, [8, randomDag(14700, 8, 10)], "eight courses"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, COURSES_BIG()]),
      ],
    },
    {
      id: "acyclic-graph-edges", title: "Acyclic Graph Edges", cses: { id: 1756, name: "Acyclic Graph Edges" },
      goal: "A direction for every edge so that the directed graph has no cycle; any valid answer is accepted.",
      concept: "Any fixed order of the nodes works: point every edge from its earlier node to its later node, and a cycle would have to return to an earlier node, which no edge does. Node numbers are already such an order, so direct each edge from the smaller number to the larger.",
      functionName: "acyclicGraphEdges", signature: "acyclicGraphEdges(n, edges) → directed edges",
      starterSource: starter("acyclicGraphEdges", "n, edges", "Point every edge from its smaller endpoint to its larger one."),
      solve: acyclicGraphEdges, comparator: "deep", accept: acyclicAccept, check: (args, out) => acyclicAccept(args, out) === true, small: (round) => { const n = 2 + (round % 6); return [n, randomGraph(14800 + round, n, 1 + (round % 9))]; },
      reference: book("16.1", "Topological sorting"),
      presets: { "CSES sample": { a: 3, b: [[1, 2], [2, 3], [3, 1]] }, "a square": { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 1]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("keeps-input-directions", "The input order of an edge's ends is arbitrary; a triangle written 1 2, 2 3, 3 1 is already a cycle.", function acyclicGraphEdges(n, edges) { return edges.map(([a, b]) => [a, b]); }),
        diagnosis("higher-degree-first", "Degrees tie easily, and ties fall back to the input direction, which can close a cycle; use an order in which no two nodes tie.", function acyclicGraphEdges(n, edges) { const degree = new Array(n + 1).fill(0); edges.forEach(([a, b]) => { degree[a] += 1; degree[b] += 1; }); return edges.map(([a, b]) => (degree[b] > degree[a] ? [b, a] : [a, b])); }),
      ],
      hints: ["A graph whose edges all go forward in some order of the nodes has no cycle.", "The node numbers are such an order.", "Return [min(a, b), max(a, b)] for every edge."],
      cases: [
        example([3, [[1, 2], [2, 3], [3, 1]]], [[1, 2], [2, 3], [1, 3]], "CSES sample"),
        example([4, [[1, 2], [2, 3], [3, 4], [4, 1]]], [[1, 2], [2, 3], [3, 4], [1, 4]], "a square"),
        example([2, [[2, 1]]], [[1, 2]], "one edge"),
        run(acyclicGraphEdges, [7, randomGraph(14900, 7, 12)], "seven nodes"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, ACYCLIC_BIG()]),
      ],
    },
    {
      id: "strongly-connected-edges", title: "Strongly Connected Edges", cses: { id: 2177, name: "Strongly Connected Edges" },
      goal: "Directions for all edges that make the graph strongly connected, or null if that is impossible; any valid answer is accepted.",
      concept: "It is possible exactly when the graph is connected and has no bridge, since a bridge can be crossed only one way. When it is, the DFS tree does the job: tree edges point down from parent to child, and every other edge, which always joins a node to one of its ancestors, points up. Every subtree then has a back edge climbing out of it (that is what 'no bridge' means), so every node can climb back to the root and the root reaches everything.",
      functionName: "stronglyConnectedEdges", signature: "stronglyConnectedEdges(n, edges) → directed edges or null",
      starterSource: starter("stronglyConnectedEdges", "n, edges", "link = lowLink(n, edges); null if some node besides 1 is a root or some tree edge is a bridge; tree edges down, back edges from the later tin to the earlier."),
      solve: stronglyConnectedEdges, comparator: "deep", dependencies: ["low-link"], accept: stronglyConnectedAccept, check: viaBrute(stronglyConnectedAccept, stronglyConnectedEdgesBrute), small: (round) => { const n = 2 + (round % 5); return [n, randomGraph(15000 + round, n, Math.min(n * (n - 1) / 2, 1 + (round % 8)))]; },
      reference: site("cp-algorithms · Strong orientation", CP + "graph/strong-orientation.html"),
      presets: { "CSES sample": { a: 3, b: [[1, 2], [1, 3], [2, 3]] }, "a bridge": { a: 4, b: [[1, 2], [2, 3], [3, 1], [3, 4]] }, "two triangles": { a: 5, b: [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [5, 3]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("ignores-bridges", "A bridge can only be crossed one way, so with a bridge no orientation works: return null.", stronglyConnectedEdges, [["if (link.low[child - 1] === link.tin[child - 1]) return null;", ""]]),
        variant("every-edge-downward", "Pointing every edge from the earlier-visited end to the later one leaves no way back up; back edges must climb to the ancestor.", stronglyConnectedEdges, [["out.push(link.tin[a - 1] > link.tin[b - 1] ? [a, b] : [b, a]);", "out.push(link.tin[a - 1] < link.tin[b - 1] ? [a, b] : [b, a]);"]]),
      ],
      hints: ["link = lowLink(n, edges). If any node other than 1 has parentEdge −1, the graph is disconnected: null.", "Edge i is a tree edge when it is the parentEdge of one of its ends (the child); if low[child] = tin[child] it is a bridge: null. Otherwise direct it parent → child.", "Every other edge joins a node to an ancestor: direct it from the end with the larger tin to the end with the smaller tin."],
      cases: [
        example([3, [[1, 2], [1, 3], [2, 3]]], [[1, 2], [2, 3], [3, 1]], "CSES sample"),
        example([4, [[1, 2], [2, 3], [3, 1], [3, 4]]], null, "a bridge makes it impossible"),
        example([4, [[1, 2], [3, 4]]], null, "a disconnected graph"),
        run(stronglyConnectedEdges, [5, [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [5, 3]]], "two triangles sharing a node"),
        hidden("n = 10⁵, m = 2·10⁵, bridgeless, time limit", () => [100000, ORIENT_YES()]),
        hidden("n = 10⁵, m = 2·10⁵ with one bridge", () => [100000, ORIENT_BRIDGE()]),
      ],
    },
    {
      id: "even-outdegree-edges", title: "Even Outdegree Edges", cses: { id: 2179, name: "Even Outdegree Edges" },
      goal: "Directions for all edges so that every node has an even outdegree, or null if that is impossible; any valid answer is accepted.",
      concept: "Outdegrees add up to the number of edges, so a connected piece with an odd number of edges can never work. Otherwise take a DFS tree, point the non-tree edges any way you like, and fix parities from the leaves up: a node that is odd so far takes its tree edge towards its parent, an even node gives it to the parent. Every node below the root ends even, and the root is even too because the piece's total is even.",
      functionName: "evenOutdegreeEdges", signature: "evenOutdegreeEdges(n, edges) → directed edges or null",
      starterSource: starter("evenOutdegreeEdges", "n, edges", "lowLink for the DFS forest; null if a piece has an odd edge count; non-tree edges any way; then children before parents, each tree edge fixes the child's parity."),
      solve: evenOutdegreeEdges, comparator: "deep", dependencies: ["low-link"], accept: evenOutdegreeAccept, check: viaBrute(evenOutdegreeAccept, evenOutdegreeEdgesBrute), small: (round) => { const n = 2 + (round % 5); return [n, randomGraph(15100 + round, n, Math.min(n * (n - 1) / 2, 1 + (round % 8)))]; },
      reference: book("12.1", "Depth-first search"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [3, 4], [1, 4]] }, "a triangle": { a: 3, b: [[1, 2], [2, 3], [3, 1]] }, "a triangle with a tail": { a: 4, b: [[1, 2], [2, 3], [3, 1], [1, 4]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("checks-the-total-only", "Each connected piece needs an even number of edges on its own; two odd pieces make an even total but still fail.", evenOutdegreeEdges, [["for (let v = 1; v <= n; v += 1) if (count[v] % 2 === 1) return null;", "if (m % 2 === 1) return null;"]]),
        variant("parents-first", "A tree edge can only fix its child's parity once everything below the child is decided, so go from the leaves up.", evenOutdegreeEdges, [["for (let t = n - 1; t >= 0; t -= 1) {", "for (let t = 0; t < n; t += 1) {"]]),
      ],
      hints: ["link = lowLink(n, edges); nodes sorted by tin, a node's piece is the root reached through parent edges.", "Count the edges of each piece; any odd count means null. Direct each non-tree edge from its later-visited end and count outdegrees.", "Visit nodes by decreasing tin: if v's outdegree is odd, direct its tree edge v → parent, otherwise parent → v."],
      cases: [
        example([4, [[1, 2], [2, 3], [3, 4], [1, 4]]], [[1, 2], [3, 2], [3, 4], [1, 4]], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], null, "three edges cannot be split evenly"),
        example([4, [[1, 2], [3, 4]]], null, "two pieces with one edge each"),
        example([4, [[1, 2], [2, 3], [3, 1], [1, 4]]], [[1, 2], [3, 2], [3, 1], [1, 4]], "a triangle with a tail"),
        run(evenOutdegreeEdges, [6, connectedGraph(15200, 6, 8)], "six nodes, eight edges"),
        hidden("n = 10⁵, m = 2·10⁵ in one piece, time limit", () => [100000, EVEN_YES()]),
        hidden("n = 10⁵, m = 2·10⁵ − 1", () => [100000, EVEN_ODD()]),
      ],
    },
    {
      id: "graph-girth", title: "Graph Girth", cses: { id: 1707, name: "Graph Girth" },
      goal: "The length of the shortest cycle, or −1 if the graph has none.",
      concept: "Breadth-first search from a node s: the first non-tree edge between u and w closes a cycle through s of length at most dist(u) + dist(w) + 1, and for the shortest cycle and any s on it, the search from s finds it exactly. So run the search from every node and keep the minimum. With n ≤ 2500 and m ≤ 5000 that is 2500 searches of 7500 steps, and a search can stop once 2·dist + 1 reaches the best cycle so far.",
      functionName: "graphGirth", signature: "graphGirth(n, edges) → length",
      starterSource: starter("graphGirth", "n, edges", "BFS from every node; an edge to a visited node that is not your parent closes a cycle of dist[u] + dist[w] + 1."),
      solve: graphGirth, comparator: "scalar", brute: graphGirthBrute, small: (round) => { const n = 2 + (round % 7); return [n, randomGraph(15300 + round, n, 1 + (round % 10))]; },
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 4], [4, 5]] }, "a tree": { a: 4, b: [[1, 2], [1, 3], [1, 4]] }, "a pentagon": { a: 5, b: cycleGraph(5) } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("counts-the-parent-edge", "The edge you arrived by leads back to a visited node but closes no cycle; skip the parent.", graphGirth, [["else if (u !== parent[v]) best", "else best"]]),
        variant("one-start-only", "One search finds the shortest cycle through its start, which may miss the shortest cycle overall; search from every node.", graphGirth, [["for (let s = 1; s <= n; s += 1) {", "for (let s = 1; s <= Math.min(n, 1); s += 1) {"]]),
      ],
      hints: ["For every start s: BFS with dist and parent arrays.", "Scanning v's neighbour u: new → dist[u] = dist[v] + 1; already seen and u ≠ parent[v] → a cycle of dist[v] + dist[u] + 1.", "Keep the minimum over all starts; −1 if none was found."],
      cases: [
        example([5, [[1, 2], [1, 3], [2, 4], [2, 5], [3, 4], [4, 5]]], 3, "CSES sample"),
        example([4, [[1, 2], [1, 3], [1, 4]]], -1, "a tree has no cycle"),
        example([5, cycleGraph(5)], 5, "a pentagon"),
        example([6, [[1, 2], [2, 3], [3, 1], [4, 5], [5, 6], [6, 4], [3, 4]]], 3, "two triangles joined"),
        run(graphGirth, [9, randomGraph(15400, 9, 11)], "nine nodes"),
        hidden("one cycle of 2500 nodes", () => [2500, cycleGraph(2500)]),
        hidden("n = 2500, m = 5000, time limit", () => [2500, GIRTH_RANDOM()]),
      ],
    },
    {
      id: "fixed-length-walk-queries", title: "Fixed Length Walk Queries", cses: { id: 3357, name: "Fixed Length Walk Queries" },
      goal: "For each query [a, b, x], whether some walk from a to b uses exactly x moves.",
      concept: "Once a walk reaches b it can step away and back, adding 2 moves at a time. So only the shortest walk of each parity matters: x works when it is at least the shortest walk to b with the same parity as x. Those come from a search on doubled states (node, parity of moves so far). There are at most 2500 distinct starts, and one search each is cheap.",
      functionName: "fixedLengthWalkQueries", signature: "fixedLengthWalkQueries(n, edges, queries) → booleans",
      starterSource: starter("fixedLengthWalkQueries", "n, edges, queries", "Group queries by start; BFS over states 2v + parity; answer d[b][x mod 2] ≤ x (and reachable)."),
      solve: fixedLengthWalkQueries, comparator: "deep", brute: fixedLengthWalkQueriesBrute, small: (round) => { const n = 2 + (round % 6); return [n, connectedGraph(15500 + round, n, n - 1 + (round % 4)), walkQueries(15600 + round, n, 6, 7)]; },
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [1, 3], [2, 4], [3, 4]], c: [[1, 2, 2], [1, 4, 1], [1, 4, 5], [2, 2, 1], [2, 2, 2], [3, 4, 8]] }, "a path is bipartite": { a: 3, b: [[1, 2], [2, 3]], c: [[1, 3, 3], [1, 3, 4], [1, 1, 0]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("ignores-parity", "Walking back and forth adds moves two at a time, so being far enough is not enough: the parity must fit too.", function fixedLengthWalkQueries(n, edges, queries) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); edges.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); }); const cache = new Map(); return queries.map(([a, b, x]) => { if (!cache.has(a)) { const dist = new Array(n + 1).fill(-1), queue = [a]; dist[a] = 0; for (let h = 0; h < queue.length; h += 1) adjacency[queue[h]].forEach((u) => { if (dist[u] < 0) { dist[u] = dist[queue[h]] + 1; queue.push(u); } }); cache.set(a, dist); } const d = cache.get(a)[b]; return d >= 0 && x >= d; }); }),
        diagnosis("parity-of-the-shortest-path", "An odd cycle lets a walk switch parity, so the other parity may also be reachable, just later; track the shortest walk of each parity.", function fixedLengthWalkQueries(n, edges, queries) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); edges.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); }); const cache = new Map(); return queries.map(([a, b, x]) => { if (!cache.has(a)) { const dist = new Array(n + 1).fill(-1), queue = [a]; dist[a] = 0; for (let h = 0; h < queue.length; h += 1) adjacency[queue[h]].forEach((u) => { if (dist[u] < 0) { dist[u] = dist[queue[h]] + 1; queue.push(u); } }); cache.set(a, dist); } const d = cache.get(a)[b]; return d >= 0 && x >= d && (x - d) % 2 === 0; }); }),
      ],
      hints: ["A walk of length d from a to b extends to d + 2, d + 4, … by stepping back and forth.", "BFS over states 2v + p (at v after a walk of parity p): from (v, p) every neighbour u gives (u, 1 − p).", "Query (a, b, x): YES when the distance to state 2b + (x mod 2) exists and is at most x."],
      cases: [
        example([4, [[1, 2], [2, 3], [1, 3], [2, 4], [3, 4]], [[1, 2, 2], [1, 4, 1], [1, 4, 5], [2, 2, 1], [2, 2, 2], [3, 4, 8]]], [true, false, true, false, true, true], "CSES sample"),
        example([3, [[1, 2], [2, 3]], [[1, 3, 3], [1, 3, 4], [1, 1, 0]]], [false, true, true], "a path never changes parity"),
        example([3, [[1, 2], [2, 3], [3, 1]], [[1, 1, 3], [1, 2, 2], [2, 2, 1]]], [true, true, false], "a triangle switches parity"),
        run(fixedLengthWalkQueries, [7, connectedGraph(15700, 7, 9), walkQueries(15800, 7, 10, 9)], "seven nodes"),
        hidden("n = 2500, m = 5000, q = 10⁵, time limit", () => [2500, WALK_GRAPH(), WALK_QUERIES()]),
      ],
    },
    {
      id: "transfer-speeds-sum", title: "Transfer Speeds Sum", cses: { id: 3111, name: "Transfer Speeds Sum" },
      goal: "The sum over all pairs of computers of the slowest connection on the route between them, as a decimal string since it can pass 2⁵³.",
      concept: "Add the connections from fastest to slowest with union-find. When a connection of speed x joins two groups of sizes s and t, every pair across the two groups is joined for the first time, and x is the slowest connection on their route, since everything added before was faster. So it contributes x · s · t. With sums up to about 2·10¹⁶ the total is kept in BigInt.",
      functionName: "transferSpeedsSum", signature: "transferSpeedsSum(n, connections) → string",
      starterSource: starter("transferSpeedsSum", "n, connections", "Sort by speed, fastest first; each union adds x · size(a) · size(b) to a BigInt total."),
      solve: transferSpeedsSum, comparator: "scalar", dependencies: ["dsu-union"], brute: transferSpeedsSumBrute, small: (round) => { const n = 1 + (round % 8); return [n, weighted(15900 + round, randomTree(15950 + round, n), 1, 9)]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 5], [2, 3, 1], [2, 4, 2]], directed: false, tree: true }, "a path": { a: 4, b: [[1, 2, 3], [2, 3, 1], [3, 4, 3]], directed: false, tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("slowest-first", "The connection that joins two groups is the slowest on their route only if every earlier one was faster: add them fastest first.", transferSpeedsSum, [[".sort((p, q) => q[2] - p[2])", ".sort((p, q) => p[2] - q[2])"]]),
        variant("counts-each-connection-once", "A connection is the bottleneck for every pair it joins, s · t of them at once.", transferSpeedsSum, [["total += BigInt(x) * BigInt(size[ra]) * BigInt(size[rb]);", "total += BigInt(x);"]]),
      ],
      hints: ["Sort the connections by speed, fastest first.", "Before joining a and b read ra = dsuFind(parent, a), rb = dsuFind(parent, b) and their sizes.", "total += BigInt(x) · BigInt(size[ra]) · BigInt(size[rb]), then dsuUnion; return total.toString()."],
      cases: [
        example([4, [[1, 2, 5], [2, 3, 1], [2, 4, 2]]], "12", "CSES sample"),
        example([1, []], "0", "one computer"),
        example([4, [[1, 2, 3], [2, 3, 1], [3, 4, 3]]], "10", "a path"),
        run(transferSpeedsSum, [9, weighted(16000, randomTree(16050, 9), 1, 20)], "nine computers"),
        hidden("n = 2·10⁵, speeds up to 10⁶: the sum passes 2⁵³", () => [200000, SPEEDS_BIG()]),
      ],
    },
    {
      id: "mst-edge-check", title: "MST Edge Check", cses: { id: 3407, name: "MST Edge Check" },
      goal: "For every edge, whether some minimum spanning tree contains it.",
      concept: "An edge of weight w fits into a minimum spanning tree exactly when its ends are not already connected by edges lighter than w. So sort the edges and take them one weight at a time: judge every edge of the weight against a union-find built from strictly lighter edges only, and add the whole weight group afterwards. Edges of equal weight must not see each other, or the second of two interchangeable edges would be rejected.",
      functionName: "mstEdgeCheck", signature: "mstEdgeCheck(n, edges) → booleans",
      starterSource: starter("mstEdgeCheck", "n, edges", "Sort by weight; per weight group first test find(a) ≠ find(b) for every edge, then union the whole group."),
      solve: mstEdgeCheck, comparator: "deep", dependencies: ["dsu-union"], brute: mstEdgeCheckBrute, small: (round) => { const n = 2 + (round % 6); return [n, weighted(16100 + round, connectedGraph(16150 + round, n, n - 1 + (round % 5)), 1, 4)]; },
      reference: book("15.1", "Kruskal's algorithm"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_MST, directed: false }, "a tie": { a: 3, b: [[1, 2, 1], [2, 3, 1], [1, 3, 1]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("one-kruskal-run", "One run of Kruskal picks one of several equal edges; the others belong to a different minimum spanning tree.", function mstEdgeCheck(n, edges) { const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]); const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } const answers = new Array(edges.length).fill(false); order.forEach((i) => { if (dsuUnion(parent, size, edges[i][0], edges[i][1]) > 0) answers[i] = true; }); return answers; }),
        diagnosis("includes-own-weight", "Only strictly lighter edges may connect the ends; adding the edge's own weight group first joins them before the edge is judged.", function mstEdgeCheck(n, edges) { const m = edges.length; const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]); const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } const answers = new Array(m).fill(false); for (let i = 0; i < m;) { let j = i; while (j < m && edges[order[j]][2] === edges[order[i]][2]) j += 1; for (let k = i; k < j; k += 1) dsuUnion(parent, size, edges[order[k]][0], edges[order[k]][1]); for (let k = i; k < j; k += 1) answers[order[k]] = dsuFind(parent, edges[order[k]][0]) !== dsuFind(parent, edges[order[k]][1]); i = j; } return answers; }),
      ],
      hints: ["Sort edge indices by weight and walk them in groups of equal weight.", "For every edge in the group: YES when dsuFind of its ends differ, using only the lighter edges added so far.", "After judging the whole group, union all of its edges."],
      cases: [
        example([5, SAMPLE_MST], [false, true, true, true, true, true], "CSES sample"),
        example([3, [[1, 2, 1], [2, 3, 1], [1, 3, 1]]], [true, true, true], "a triangle of equal edges"),
        example([3, [[1, 2, 1], [2, 3, 1], [1, 3, 2]]], [true, true, false], "the heaviest edge of a cycle"),
        run(mstEdgeCheck, [7, weighted(16200, connectedGraph(16250, 7, 11), 1, 4)], "seven nodes with ties"),
        hidden("n = 10⁵, m = 2·10⁵, weights up to 100, time limit", () => [100000, MST_TIES()]),
      ],
    },
    {
      id: "mst-edge-set-check", title: "MST Edge Set Check", cses: { id: 3408, name: "MST Edge Set Check" },
      goal: "For each set of edges (1-based), whether one minimum spanning tree can contain all of them at once.",
      concept: "Each edge must be usable on its own, and within one weight the chosen edges must not form a cycle over the components of the lighter edges; different weights never interfere. So handle all sets offline by weight: build the union-find of lighter edges once, and for each set's edges of the current weight, union their component roots in a scratch union-find that is rolled back right after. A union that finds its ends already joined means that set fails.",
      functionName: "mstEdgeSetCheck", signature: "mstEdgeSetCheck(n, edges, sets) → booleans",
      starterSource: starter("mstEdgeSetCheck", "n, edges, sets", "Sort the sets' edges by weight; add lighter edges to a base union-find; per set and weight, union the base roots with rollbackUnion and undo afterwards."),
      solve: mstEdgeSetCheck, comparator: "deep", dependencies: ["dsu-union", "rollback-union"], brute: mstEdgeSetCheckBrute, small: (round) => { const n = 2 + (round % 6); const g = weighted(16300 + round, connectedGraph(16350 + round, n, n - 1 + (round % 5)), 1, 4); return [n, g, randomSets(16400 + round, g.length, 3, 3)]; },
      reference: book("15.1", "Kruskal's algorithm"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_MST, c: [[2, 3, 4], [1], [2, 6], [5, 6]], directed: false }, "equal edges on a cycle": { a: 3, b: [[1, 2, 1], [2, 3, 1], [1, 3, 1]], c: [[1, 2], [1, 2, 3]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("edges-checked-alone", "Two edges can each fit some minimum spanning tree yet not the same one: together they may close a cycle with lighter edges.", function mstEdgeSetCheck(n, edges, sets) { const m = edges.length; const order = edges.map((e, i) => i).sort((p, q) => edges[p][2] - edges[q][2]); const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } const valid = new Array(m).fill(false); for (let i = 0; i < m;) { let j = i; while (j < m && edges[order[j]][2] === edges[order[i]][2]) j += 1; for (let k = i; k < j; k += 1) valid[order[k]] = dsuFind(parent, edges[order[k]][0]) !== dsuFind(parent, edges[order[k]][1]); for (let k = i; k < j; k += 1) dsuUnion(parent, size, edges[order[k]][0], edges[order[k]][1]); i = j; } return sets.map((set) => set.every((e) => valid[e - 1])); }),
        variant("ignores-lighter-edges", "The set's edges must form a forest over the components of the lighter edges, not just among themselves.", mstEdgeSetCheck, [["rollbackUnion(scratch, dsuFind(parent, e[0]), dsuFind(parent, e[1]));", "rollbackUnion(scratch, e[0], e[1]);"]]),
      ],
      hints: ["List every (weight, set, edge) and sort by weight, then by set.", "Before a weight w, union every edge lighter than w into the base union-find.", "For one set's edges of weight w: rollbackUnion(scratch, find(a), find(b)); if the component count did not drop, the set fails. Undo every union before the next set."],
      cases: [
        example([5, SAMPLE_MST, [[2, 3, 4], [1], [2, 6], [5, 6]]], [true, false, true, false], "CSES sample"),
        example([3, [[1, 2, 1], [2, 3, 1], [1, 3, 1]], [[1, 2], [1, 2, 3]]], [true, false], "all three equal edges close a cycle"),
        run(mstEdgeSetCheck, [7, weighted(16500, connectedGraph(16550, 7, 11), 1, 3), [[1, 2], [3, 4, 5], [6], [7, 8, 9, 10]]], "seven nodes"),
        hidden("n = 10⁵, m = 2·10⁵, 10⁵ sets, time limit", () => [100000, MST_TIES(), MST_SETS()]),
      ],
    },
    {
      id: "path-max-table", title: "Path Maximum Table", cses: { id: 3409, name: "MST Edge Cost (brick)" },
      goal: "Root the weighted tree at node 1 (BFS, neighbours in input order) and return { depth, up, best }: up[j][v] is the 2^j-th ancestor (0 above the root) and best[j][v] the heaviest edge among those 2^j steps.",
      concept: "Binary lifting stores, for every node, where 2^j steps up lead. Carrying the heaviest edge along each jump costs nothing extra: a jump of 2^j is two jumps of 2^(j−1), so its maximum is the larger of their two maxima. With the table, any path maximum takes O(log n) jumps.",
      functionName: "pathMaxTable", signature: "pathMaxTable(n, edges) → { depth, up, best }",
      starterSource: starter("pathMaxTable", "n, edges", "BFS from 1 for parent, parent-edge weight and depth; up[0] = parent, best[0] = weight; row j combines two jumps of row j − 1."),
      solve: pathMaxTable, comparator: "deep", small: (round) => { const n = 1 + (round % 9); return [n, weighted(16600 + round, randomTree(16650 + round, n), 1, 20)]; },
      reference: book("18.1", "Finding ancestors"),
      presets: { "a small tree": { a: 5, b: [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]], directed: false, tree: true }, "a path": { a: 4, b: [[1, 2, 5], [2, 3, 1], [3, 4, 3]], directed: false, tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("keeps-the-upper-half", "A jump of 2^j covers both halves; its heaviest edge is the larger of the two halves' maxima, not just the upper one.", pathMaxTable, [["rowBest[v] = Math.max(lastBest[v], lastBest[lastUp[v]]);", "rowBest[v] = lastBest[lastUp[v]];"]]),
        variant("never-doubles", "Row j must jump twice as far as row j − 1: up[j][v] = up[j − 1][up[j − 1][v]].", pathMaxTable, [["rowUp[v] = lastUp[lastUp[v]];", "rowUp[v] = lastUp[v];"]]),
      ],
      hints: ["BFS from node 1 over neighbours in input order: parent[u], weight[u] (the edge to the parent) and depth[u].", "levels = the smallest L with 2^L > n; up[0] = parent and best[0] = weight, both 0 at index 0.", "up[j][v] = up[j − 1][up[j − 1][v]] and best[j][v] = max(best[j − 1][v], best[j − 1][up[j − 1][v]])."],
      cases: [
        run(pathMaxTable, [5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]], "a small tree"),
        example([1, []], { depth: [0, 0], up: [[0, 0]], best: [[0, 0]] }, "a single node"),
        run(pathMaxTable, [4, [[1, 2, 5], [2, 3, 1], [3, 4, 3]]], "a path"),
        run(pathMaxTable, [10, weighted(16700, randomTree(16750, 10), 1, 50)], "ten nodes"),
        hidden("n = 2·10⁴, time limit", () => [20000, PATH_TREE()]),
      ],
    },
    {
      id: "path-max-query", title: "Path Maximum Query", cses: { id: 3409, name: "MST Edge Cost (brick)" },
      goal: "The heaviest edge on the tree path between a and b, using the table from Path Maximum Table (0 when a = b).",
      concept: "Lift the deeper node until both are at the same depth, taking the maximum of every jump. If they now coincide, that node was the ancestor. Otherwise lift both together by the largest jumps that keep them apart; they end as the two children of the lowest common ancestor, and the two edges into it are the last to include.",
      functionName: "pathMax", signature: "pathMax(table, a, b) → weight",
      starterSource: starter("pathMax", "table, a, b", "Equalise depths with the bits of the difference, then lift both while up[j] differs, taking best[j] of every jump; finish with best[0] of both."),
      solve: pathMax, comparator: "scalar", brute: pathMaxBrute, small: (round) => { const n = 1 + (round % 9); const table = pathMaxTable(n, weighted(16800 + round, randomTree(16850 + round, n), 1, 20)); return [table, 1 + (round % n), 1 + ((round * 5) % n)]; },
      reference: book("18.1", "Finding ancestors"),
      presets: { "across the root": { a: 5, b: [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]], c: pathMaxTable(5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]), d: 2, e: 4, directed: false, tree: true }, "siblings": { a: 5, b: [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]], c: pathMaxTable(5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]), d: 4, e: 5, directed: false, tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }] },
      diagnoses: [
        variant("forgets-the-final-step", "Lifting stops at the two children of the common ancestor; the edges from them into it are still on the path.", pathMax, [["return Math.max(answer, best[0][x], best[0][y]);", "return answer;"]]),
        variant("lifts-one-side-only", "Both nodes climb in the second phase, so both jumps' maxima count.", pathMax, [["answer = Math.max(answer, best[j][x], best[j][y]);", "answer = Math.max(answer, best[j][x]);"]]),
      ],
      hints: ["Make x the deeper node; for every set bit j of depth[x] − depth[y]: answer = max(answer, best[j][x]), x = up[j][x].", "If x === y you are done. Otherwise for j from high to low, when up[j][x] ≠ up[j][y], take both best[j] values and lift both.", "Finally include best[0][x] and best[0][y], the edges into the common ancestor."],
      cases: [
        run(pathMax, [pathMaxTable(5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]), 2, 4], "across the root"),
        run(pathMax, [pathMaxTable(5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]), 4, 5], "two siblings"),
        example([pathMaxTable(5, [[1, 2, 4], [1, 3, 2], [3, 4, 7], [3, 5, 1]]), 5, 5], 0, "a node to itself"),
        example([pathMaxTable(5, [[1, 2, 1], [1, 3, 1], [2, 4, 1], [3, 5, 9]]), 4, 5], 9, "the heavy edge is on the second climber's side"),
        run(pathMax, [pathMaxTable(10, weighted(16900, randomTree(16950, 10), 1, 50)), 3, 8], "ten nodes"),
      ],
    },
    {
      id: "mst-edge-cost", title: "MST Edge Cost", cses: { id: 3409, name: "MST Edge Cost" },
      goal: "For every edge, the cost of the cheapest spanning tree that must contain it.",
      concept: "Build one minimum spanning tree of cost T. Forcing an edge (a, b, w) into it closes a cycle with the tree path from a to b, and the cheapest repair drops the heaviest edge on that path. So the answer is T − pathMax(a, b) + w, which is T itself for the tree's own edges. The path maximum comes from the lifting table in O(log n) per edge.",
      functionName: "mstEdgeCost", signature: "mstEdgeCost(n, edges) → costs",
      starterSource: starter("mstEdgeCost", "n, edges", "Kruskal for the tree and its cost T; pathMaxTable of the tree; every edge costs T − pathMax(a, b) + w."),
      solve: mstEdgeCost, comparator: "deep", dependencies: ["dsu-union", "path-max-table", "path-max-query"], brute: mstEdgeCostBrute, small: (round) => { const n = 2 + (round % 6); return [n, weighted(17000 + round, connectedGraph(17050 + round, n, n - 1 + (round % 5)), 1, 9)]; },
      reference: book("15.1", "Kruskal's algorithm"),
      presets: { "CSES sample": { a: 5, b: [[1, 2, 4], [1, 3, 2], [2, 4, 2], [3, 4, 1], [3, 5, 4], [4, 5, 3]], directed: false }, "a square": { a: 4, b: [[1, 2, 1], [2, 3, 2], [3, 4, 3], [4, 1, 4]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("adds-without-swapping", "Forcing an extra edge into the tree closes a cycle; one tree edge on that cycle has to leave again.", mstEdgeCost, [["return edges.map(([a, b, w]) => total - pathMax(table, a, b) + w);", "return edges.map(([a, b, w]) => (pathMax(table, a, b) === w ? total : total + w));"]]),
        variant("swaps-the-heaviest-tree-edge", "Only an edge on the cycle can leave, so drop the heaviest edge on the path between a and b, not the heaviest in the whole tree.", mstEdgeCost, [["const table = pathMaxTable(n, tree);", "const table = pathMaxTable(n, tree); const heaviest = tree.reduce((h, e) => Math.max(h, e[2]), 0);"], ["total - pathMax(table, a, b) + w", "total - heaviest + w"]]),
      ],
      hints: ["Kruskal: sort by weight, keep the edges whose dsuUnion merges something, and add up their weights as total.", "table = pathMaxTable(n, treeEdges).", "Edge (a, b, w) costs total − pathMax(table, a, b) + w."],
      cases: [
        example([5, [[1, 2, 4], [1, 3, 2], [2, 4, 2], [3, 4, 1], [3, 5, 4], [4, 5, 3]]], [10, 8, 8, 8, 9, 8], "CSES sample"),
        example([4, [[1, 2, 1], [2, 3, 2], [3, 4, 3], [4, 1, 4]]], [6, 6, 6, 7], "a square"),
        example([2, [[1, 2, 5]]], [5], "one edge"),
        run(mstEdgeCost, [7, weighted(17100, connectedGraph(17150, 7, 11), 1, 20)], "seven nodes"),
        hidden("n = 10⁵, m = 2·10⁵, weights up to 10⁹, time limit", () => [100000, MST_WIDE()]),
      ],
    },
    {
      id: "network-breakdown", title: "Network Breakdown", cses: { id: 1677, name: "Network Breakdown" },
      goal: "The number of components after each connection breaks down, in order.",
      concept: "Union-find can join but not split. Run time backwards instead: start from the network with every broken connection already gone, then repair the breakdowns from the last to the first. Repairs only merge, so each answer is the component count just before its own connection is repaired.",
      functionName: "networkBreakdown", signature: "networkBreakdown(n, connections, breakdowns) → counts",
      starterSource: starter("networkBreakdown", "n, connections, breakdowns", "Union every connection that never breaks; then for breakdowns from last to first record the count and repair it."),
      solve: networkBreakdown, comparator: "deep", dependencies: ["dsu-union"], brute: networkBreakdownBrute, small: (round) => { const n = 2 + (round % 6); const c = randomGraph(17200 + round, n, 1 + (round % 8)); return [n, c, randomPermutation(17250 + round, c.length).slice(0, 1 + (round % c.length)).map((i) => c[i - 1].slice())]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 3], [3, 4], [4, 5]], c: [[3, 4], [2, 3], [4, 5]] }, "a path falls apart": { a: 4, b: [[1, 2], [2, 3], [3, 4]], c: [[2, 3], [1, 2], [3, 4]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        variant("counts-before-each-breakdown", "Each answer is the count after its connection breaks: record it before repairing that connection, not after.", networkBreakdown, [["      answers[i] = components;\n      if (dsuUnion(parent, size, breakdowns[i][0], breakdowns[i][1]) > 0) components -= 1;", "      if (dsuUnion(parent, size, breakdowns[i][0], breakdowns[i][1]) > 0) components -= 1;\n      answers[i] = components;"]]),
        variant("never-removes-a-connection", "The starting network for the backward pass has every broken connection removed.", networkBreakdown, [["if (!broken.has(key(a, b)) && dsuUnion", "if (dsuUnion"]]),
      ],
      hints: ["Put the breakdowns in a Set keyed by the unordered pair.", "Union every connection that is not in that set and count components.", "For i from k − 1 down to 0: answers[i] = components, then union breakdowns[i] (a merge lowers the count)."],
      cases: [
        example([5, [[1, 2], [1, 3], [2, 3], [3, 4], [4, 5]], [[3, 4], [2, 3], [4, 5]]], [2, 2, 3], "CSES sample"),
        example([4, [[1, 2], [2, 3], [3, 4]], [[2, 3], [1, 2], [3, 4]]], [2, 3, 4], "a path falls apart"),
        example([3, [[1, 2], [2, 3], [3, 1]], [[1, 2]]], [1], "a cycle survives one break"),
        run(networkBreakdown, [7, randomGraph(17300, 7, 10), randomGraph(17300, 7, 10).slice(0, 6)], "seven computers"),
        hidden("n = 10⁵, m = k = 2·10⁵, time limit", () => BREAKDOWN_BIG()),
      ],
    },
    {
      id: "tree-coin-collecting-i", title: "Tree Coin Collecting I", cses: { id: 3114, name: "Tree Coin Collecting I" },
      goal: "For each query [a, b], the length of the shortest walk from a to b that visits at least one node with a coin.",
      concept: "The best walk follows the path from a to b and makes one detour to the nearest coin from some node on it, there and back. So the answer is dist(a, b) + 2 · (smallest coin distance of a node on the path). Coin distances for all nodes come from one multi-source search, and a lifting table of path minima, built on top of the ancestor table, answers each query in O(log n).",
      functionName: "treeCoinCollectingI", signature: "treeCoinCollectingI(n, coins, edges, queries) → lengths",
      starterSource: starter("treeCoinCollectingI", "n, coins, edges, queries", "BFS from all coins for near[v]; low[j][v] = min near over 2^j nodes upwards; answer dist(a, b) + 2 · min near on the path."),
      solve: treeCoinCollectingI, comparator: "deep", dependencies: ["rooted-ancestors", "tree-lca"], brute: treeCoinCollectingIBrute, small: (round) => { const n = 1 + (round % 8); return [n, coinList(17400 + round, n, 0.3), randomTree(17450 + round, n), randomPairs(17480 + round, n, 5)]; },
      reference: book("18.1", "Finding ancestors"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_COIN_TREE, c: [1, 0, 0, 1, 0], d: [[1, 5], [3, 2], [4, 4], [5, 5]], marks: [1, 4], tree: true }, "a coin off the path": { a: 5, b: [[1, 2], [2, 3], [2, 4], [4, 5]], c: [0, 0, 0, 0, 1], d: [[1, 3]], marks: [5], tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }, { fixture: "presetD" }] },
      diagnoses: [
        variant("coin-near-an-end", "The detour can leave from any node of the path, not only from a or b; take the minimum over the whole path.", treeCoinCollectingI, [["const best = Math.min(climb(a, depth[a] - depth[top] + 1), climb(b, depth[b] - depth[top]));", "const best = Math.min(near[a], near[b]);"]]),
        variant("detour-counted-once", "The detour to the coin has to come back to the path: it costs twice the distance.", treeCoinCollectingI, [["+ 2 * best;", "+ best;"]]),
      ],
      hints: ["near[v] = distance to the nearest coin, from one BFS started at every coin.", "low[0] = near, low[j][v] = min(low[j − 1][v], low[j − 1][up[j − 1][v]]), with node 0 as +∞.", "For (a, b): top = treeLca; the path is depth[a] − depth[top] + 1 nodes from a upwards and depth[b] − depth[top] from b; answer = dist + 2 · min."],
      cases: [
        example([5, [1, 0, 0, 1, 0], SAMPLE_COIN_TREE, [[1, 5], [3, 2], [4, 4], [5, 5]]], [2, 3, 0, 4], "CSES sample"),
        example([5, [0, 0, 0, 0, 1], [[1, 2], [2, 3], [2, 4], [4, 5]], [[1, 3]]], [6], "the coin is two steps off the path"),
        example([1, [1], [], [[1, 1]]], [0], "one node with a coin"),
        run(treeCoinCollectingI, [9, [0, 1, 0, 0, 0, 0, 1, 0, 0], randomTree(17500, 9), randomPairs(17550, 9, 6)], "nine nodes"),
        hidden("n = q = 10⁵ (CSES allows 2·10⁵), time limit", () => [100000, COINS_BIG(), COIN_TREE_BIG(), COIN_QUERIES_BIG()]),
      ],
    },
    {
      id: "tree-coin-collecting-ii", title: "Tree Coin Collecting II", cses: { id: 3149, name: "Tree Coin Collecting II" },
      goal: "For each query [a, b], the length of the shortest walk from a to b that visits every node with a coin.",
      concept: "The walk must cover the smallest subtree S' holding all coins plus a and b. Edges on the a–b path are walked once and every other edge of S' twice, so the answer is 2·|S'| − dist(a, b). The subtree of the coins alone has |S| = half the cyclic sum of distances between consecutive coins in DFS order. Adding one more node x costs (d(p, x) + d(x, q) − d(p, q)) / 2, where p and q are its neighbours in that cyclic order, found by binary search on DFS times. Add a first, then b with a taken into account.",
      functionName: "treeCoinCollectingII", signature: "treeCoinCollectingII(n, coins, edges, queries) → lengths",
      starterSource: starter("treeCoinCollectingII", "n, coins, edges, queries", "Coins sorted by DFS time; |S| = cyclic distance sum / 2; add a, then b, via their cyclic neighbours; answer 2(|S| + added) − dist(a, b)."),
      solve: treeCoinCollectingII, comparator: "deep", dependencies: ["rooted-ancestors", "tree-lca", "euler-tour"], brute: treeCoinCollectingIIBrute, small: (round) => { const n = 1 + (round % 8); const coins = coinList(17600 + round, n, 0.3); const few = coins.map((c, i) => (c && coins.slice(0, i).filter(Boolean).length < 4 ? 1 : 0)); if (!few.includes(1)) few[0] = 1; return [n, few, randomTree(17650 + round, n), randomPairs(17680 + round, n, 5)]; },
      reference: book("18.2", "Lowest common ancestor"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_COIN_TREE, c: [1, 0, 0, 1, 0], d: [[1, 5], [3, 2], [4, 4], [5, 5]], marks: [1, 4], tree: true }, "one coin": { a: 4, b: [[1, 2], [2, 3], [3, 4]], c: [0, 0, 1, 0], d: [[1, 4], [1, 1]], marks: [3], tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }, { fixture: "presetD" }] },
      diagnoses: [
        variant("ignores-the-endpoints", "The walk starts at a and ends at b, which may lie outside the coins' subtree; add them before counting.", treeCoinCollectingII, [["return 2 * (steiner + extra) - dist(a, b);", "return 2 * steiner;"]]),
        variant("returns-to-the-start", "Edges on the path from a to b are walked only once, so subtract dist(a, b) from the round trip.", treeCoinCollectingII, [["return 2 * (steiner + extra) - dist(a, b);", "return 2 * (steiner + extra);"]]),
      ],
      hints: ["table = rootedAncestors(n, edges) for distances, tin = eulerTour(n, edges).tin; sort the coins by tin.", "|S| = (Σ dist(coin_i, coin_(i+1)) cyclically) / 2. For a node x not in the set, its cyclic neighbours p, q come from a binary search on the tins, and adding x adds (d(p, x) + d(x, q) − d(p, q)) / 2.", "Add a, then b (if a is new and lies between b's neighbours in cyclic order, it replaces one of them); answer 2 · (|S| + added) − dist(a, b)."],
      cases: [
        example([5, [1, 0, 0, 1, 0], SAMPLE_COIN_TREE, [[1, 5], [3, 2], [4, 4], [5, 5]]], [6, 5, 6, 8], "CSES sample"),
        example([4, [0, 0, 1, 0], [[1, 2], [2, 3], [3, 4]], [[1, 4], [1, 1]]], [3, 4], "one coin on a path"),
        example([1, [1], [], [[1, 1]]], [0], "one node with a coin"),
        run(treeCoinCollectingII, [9, [0, 1, 0, 0, 1, 0, 1, 0, 0], randomTree(17700, 9), randomPairs(17750, 9, 6)], "nine nodes"),
        hidden("n = q = 10⁵ (CSES allows 2·10⁵), time limit", () => [100000, COINS_BIG(), COIN_TREE_BIG(), COIN_QUERIES_BIG()]),
      ],
    },
    {
      id: "ahu-codes", title: "Rooted Tree Codes", cses: { id: 1700, name: "Tree Isomorphism I (brick)" },
      goal: "Root the tree at root and give every node an integer code so that two nodes get the same code exactly when their subtrees have the same shape. The dictionary (key → code) is shared between calls and may already hold codes.",
      concept: "Process nodes children-first. A node's key is the sorted list of its children's codes, and the dictionary turns each distinct key into a small integer, handing out the next unused number for a new key. Sorting makes the key ignore child order, so equal shapes get equal keys and equal codes. Passing the same dictionary to two trees makes their codes comparable.",
      functionName: "ahuCodes", signature: "ahuCodes(n, edges, root, dictionary) → codes",
      starterSource: starter("ahuCodes", "n, edges, root, dictionary", "BFS from root; in reverse BFS order key = sorted children codes joined by ','; a new key gets the next number in the dictionary."),
      solve: ahuCodes, comparator: "deep", allowMutation: true, accept: ahuAccept, check: (args, out) => ahuAccept(args, out) === true, small: (round) => { const n = 1 + (round % 9); return [n, randomTree(17800 + round, n), 1 + (round % n), {}]; },
      reference: site("cp-algorithms · Tree isomorphism", CP + "graph/tree_isomorphism.html"),
      presets: { "a small tree": { a: 5, b: [[1, 2], [1, 3], [3, 4], [3, 5]], c: 1, d: {}, tree: true }, "mirror branches": { a: 7, b: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7]], c: 1, d: {}, tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }] },
      diagnoses: [
        variant("unsorted-children", "Children come in whatever order the edges list them; sort their codes so the key describes the shape, not the input order.", ahuCodes, [["children[v].sort((p, q) => p - q).join(\",\")", "children[v].join(\",\")"]]),
        variant("counts-children-only", "The number of children does not fix a shape: two children can be a leaf and a big subtree, or two leaves.", ahuCodes, [["children[v].sort((p, q) => p - q).join(\",\")", "String(children[v].length)"]]),
      ],
      hints: ["BFS from root gives an order where every parent comes before its children.", "Walk that order backwards; key = the node's children's codes, sorted ascending, joined with ','.", "If the key is new, dictionary[key] = number of keys so far + 1; code = dictionary[key]; append it to the parent's children."],
      cases: [
        run(ahuCodes, [5, [[1, 2], [1, 3], [3, 4], [3, 5]], 1, {}], "a small tree"),
        run(ahuCodes, [7, [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7]], 1, {}], "two mirror branches get one code"),
        run(ahuCodes, [4, [[1, 2], [2, 3], [3, 4]], 2, {}], "a path rooted in the middle"),
        run(ahuCodes, [8, randomTree(17850, 8), 1, {}], "eight nodes"),
        hidden("n = 10⁵, time limit", () => [100000, ISO_TREE(), 1, {}]),
      ],
    },
    {
      id: "tree-isomorphism-i", title: "Tree Isomorphism I", cses: { id: 1700, name: "Tree Isomorphism I" },
      goal: "Whether two trees rooted at node 1 are isomorphic.",
      concept: "Code both trees with one shared dictionary. Equal shapes always receive equal codes, so the rooted trees are isomorphic exactly when their roots' codes match.",
      functionName: "treeIsomorphismI", signature: "treeIsomorphismI(n, first, second) → boolean",
      starterSource: starter("treeIsomorphismI", "n, first, second", "One dictionary; compare ahuCodes of both trees at the root."),
      solve: treeIsomorphismI, comparator: "scalar", dependencies: ["ahu-codes"], brute: treeIsomorphismIBrute, small: (round) => { const n = 1 + (round % 7); const t = randomTree(17900 + round, n); return [n, t, round % 2 ? relabelKeepRoot(17950 + round, n, t) : randomTree(17980 + round, n)]; },
      reference: site("cp-algorithms · Tree isomorphism", CP + "graph/tree_isomorphism.html"),
      presets: { "CSES sample, first test": { a: 3, b: [[1, 2], [2, 3]], c: [[1, 2], [1, 3]] }, "CSES sample, second test": { a: 3, b: [[1, 2], [2, 3]], c: [[1, 3], [3, 2]] } },
      scene: { kind: "algo", view: "two-trees", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("compares-degrees", "Equal degree lists do not make equal shapes: a node's children can be arranged very differently below it.", function treeIsomorphismI(n, first, second) { const degrees = (edges) => { const d = new Array(n + 1).fill(0); edges.forEach(([a, b]) => { d[a] += 1; d[b] += 1; }); return d[1] + "|" + d.slice(1).sort((p, q) => p - q).join(","); }; return degrees(first) === degrees(second); }),
        diagnosis("unsorted-children", "Without sorting, the key depends on the order children are listed in, so the same shape can get two codes.", function treeIsomorphismI(n, first, second) { const dictionary = {}; let known = 0; const code = (edges) => { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); edges.forEach(([a, b]) => { adjacency[a].push(b); adjacency[b].push(a); }); const parent = new Array(n + 1).fill(0), order = [1], seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) adjacency[order[i]].forEach((u) => { if (!seen[u]) { seen[u] = true; parent[u] = order[i]; order.push(u); } }); const children = []; for (let v = 0; v <= n; v += 1) children.push([]); const codes = new Array(n + 1).fill(0); for (let i = order.length - 1; i >= 0; i -= 1) { const v = order[i], key = children[v].join(","); if (!(key in dictionary)) { known += 1; dictionary[key] = known; } codes[v] = dictionary[key]; if (parent[v]) children[parent[v]].push(codes[v]); } return codes[1]; }; return code(first) === code(second); }),
      ],
      hints: ["const dictionary = {}.", "ahuCodes(n, first, 1, dictionary)[0] is the code of the first tree's root.", "Compare it with ahuCodes(n, second, 1, dictionary)[0]."],
      cases: [
        example([3, [[1, 2], [2, 3]], [[1, 2], [1, 3]]], false, "CSES sample, first test"),
        example([3, [[1, 2], [2, 3]], [[1, 3], [3, 2]]], true, "CSES sample, second test"),
        example([5, [[1, 2], [2, 3], [3, 4], [1, 5]], [[1, 2], [1, 3], [2, 4], [3, 5]]], false, "same degrees, different shape"),
        example([4, [[1, 2], [1, 3], [3, 4]], [[1, 3], [3, 4], [1, 2]]], true, "the same shape with the children listed the other way round"),
        run(treeIsomorphismI, [8, randomTree(18000, 8), relabelKeepRoot(18050, 8, randomTree(18000, 8))], "a relabelled copy"),
        hidden("n = 10⁵, isomorphic, time limit", () => [100000, ISO_TREE(), ISO_ROOTED_COPY()]),
        hidden("n = 10⁵, one leaf moved", () => [100000, ISO_TREE(), ISO_MOVED()]),
      ],
    },
    {
      id: "tree-centers", title: "Tree Centers", cses: { id: 1701, name: "Tree Isomorphism II (brick)" },
      goal: "The one or two centers of the tree (the nodes whose farthest node is nearest), in increasing order.",
      concept: "Remove all leaves at once, then the new leaves, and so on. Every round shortens every longest path by one at each end, so the last one or two nodes standing are the middle of every longest path. An isomorphism maps centers to centers, which is what makes them a canonical place to root an unrooted tree.",
      functionName: "treeCenters", signature: "treeCenters(n, edges) → centers",
      starterSource: starter("treeCenters", "n, edges", "Peel the leaves layer by layer while more than two nodes remain; the last layer is the answer."),
      solve: treeCenters, comparator: "deep", accept: centersAccept, brute: treeCentersBrute, small: (round) => { const n = 1 + (round % 9); return [n, randomTree(18100 + round, n)]; },
      reference: book("14.2", "Diameter"),
      presets: { "a path of five": { a: 5, b: [[1, 2], [2, 3], [3, 4], [4, 5]], tree: true }, "a path of four": { a: 4, b: [[1, 2], [2, 3], [3, 4]], tree: true }, "a star": { a: 5, b: [[1, 5], [2, 5], [3, 5], [4, 5]], tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("stops-a-layer-early", "Peel until at most two nodes remain; stopping at three can leave the ends of a short path instead of its middle.", treeCenters, [["while (remaining > 2) {", "while (remaining > 3) {"]]),
        diagnosis("largest-degree", "The busiest node is not the middle of the longest path; a long branch pulls the center away from it.", function treeCenters(n, edges) { const degree = new Array(n + 1).fill(0); edges.forEach(([a, b]) => { degree[a] += 1; degree[b] += 1; }); let best = 1; for (let v = 2; v <= n; v += 1) if (degree[v] > degree[best]) best = v; return [best]; }),
      ],
      hints: ["n = 1 has center 1. Otherwise start with every node of degree 1.", "While more than two nodes remain: remove the whole layer, lowering each neighbour's degree; neighbours that drop to degree 1 form the next layer.", "Return the last layer, sorted."],
      cases: [
        example([5, [[1, 2], [2, 3], [3, 4], [4, 5]]], [3], "a path of five"),
        example([4, [[1, 2], [2, 3], [3, 4]]], [2, 3], "a path of four has two centers"),
        example([1, []], [1], "one node"),
        example([6, [[1, 2], [2, 3], [3, 4], [4, 5], [1, 6]]], [2, 3], "a long branch moves the center"),
        run(treeCenters, [10, randomTree(18150, 10)], "ten nodes"),
        hidden("n = 2·10⁵, time limit", () => [200000, CENTERS_TREE()]),
      ],
    },
    {
      id: "tree-isomorphism-ii", title: "Tree Isomorphism II", cses: { id: 1701, name: "Tree Isomorphism II" },
      goal: "Whether two unrooted trees are isomorphic.",
      concept: "Unrooted trees need a canonical root, and the center is one: an isomorphism must send centers to centers. Different numbers of centers already mean no. Otherwise root the first tree at its first center and compare its code with the second tree rooted at each of its centers, all with one dictionary.",
      functionName: "treeIsomorphismII", signature: "treeIsomorphismII(n, first, second) → boolean",
      starterSource: starter("treeIsomorphismII", "n, first, second", "treeCenters of both; codes rooted at the centers with one dictionary; match the first tree's code against each center of the second."),
      solve: treeIsomorphismII, comparator: "scalar", dependencies: ["ahu-codes", "tree-centers"], brute: treeIsomorphismIIBrute, small: (round) => { const n = 1 + (round % 7); const t = randomTree(18200 + round, n); return [n, t, round % 2 ? relabel(18250 + round, n, t) : randomTree(18280 + round, n)]; },
      reference: site("cp-algorithms · Tree isomorphism", CP + "graph/tree_isomorphism.html"),
      presets: { "CSES sample, first test": { a: 3, b: [[1, 2], [2, 3]], c: [[1, 2], [1, 3]] }, "two centers": { a: 5, b: [[1, 2], [2, 3], [3, 4], [2, 5]], c: [[4, 3], [3, 2], [2, 1], [3, 5]] } },
      scene: { kind: "algo", view: "two-trees", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("rooted-at-node-1", "Node 1 has no special place in an unrooted tree; root both trees at their centers.", function treeIsomorphismII(n, first, second) { const dictionary = {}; return ahuCodes(n, first, 1, dictionary)[0] === ahuCodes(n, second, 1, dictionary)[0]; }),
        variant("first-centers-only", "With two centers the matching center of the second tree may be either one; try both.", treeIsomorphismII, [["return c2.some((c) => ahuCodes(n, second, c, dictionary)[c - 1] === code);", "return ahuCodes(n, second, c2[0], dictionary)[c2[0] - 1] === code;"]]),
      ],
      hints: ["c1 = treeCenters(n, first), c2 = treeCenters(n, second); different lengths → false.", "One dictionary; code = ahuCodes(n, first, c1[0], dictionary)[c1[0] − 1].", "True when some c in c2 has ahuCodes(n, second, c, dictionary)[c − 1] === code."],
      cases: [
        example([3, [[1, 2], [2, 3]], [[1, 2], [1, 3]]], true, "CSES sample, first test"),
        example([3, [[1, 2], [2, 3]], [[1, 3], [3, 2]]], true, "CSES sample, second test"),
        example([5, [[1, 2], [2, 3], [3, 4], [2, 5]], [[4, 3], [3, 2], [2, 1], [3, 5]]], true, "two centers, matched crosswise"),
        example([4, [[1, 2], [2, 3], [3, 4]], [[1, 2], [1, 3], [1, 4]]], false, "a path and a star"),
        run(treeIsomorphismII, [8, randomTree(18300, 8), relabel(18350, 8, randomTree(18300, 8))], "a relabelled copy"),
        hidden("n = 10⁵, isomorphic, time limit", () => [100000, ISO_TREE(), ISO_COPY()]),
        hidden("n = 10⁵, one leaf moved", () => [100000, ISO_TREE(), ISO_MOVED()]),
      ],
    },
    {
      id: "flight-route-requests", title: "Flight Route Requests", cses: { id: 1699, name: "Flight Route Requests" },
      goal: "The fewest one-way flights so that every requested route a → b can be travelled.",
      concept: "Cities joined by requests, ignoring direction, form independent pieces. A piece of k cities needs at least k − 1 flights just to connect it, and k − 1 are enough when its requests have no directed cycle: lay the cities along a topological order. If the requests do contain a cycle, k − 1 flights form a tree that cannot go round, but k flights make one big cycle through the whole piece, which serves everything. Strongly connected components reveal the cycles.",
      functionName: "flightRouteRequests", signature: "flightRouteRequests(n, requests) → flights",
      starterSource: starter("flightRouteRequests", "n, requests", "Pieces by union-find; a piece is cyclic if it holds a kingdom of two or more cities; add size − 1, plus 1 when cyclic."),
      solve: flightRouteRequests, comparator: "scalar", dependencies: ["planets-and-kingdoms", "dsu-union"], brute: flightRouteRequestsBrute, small: (round) => { const n = 1 + (round % 4); return [n, randomDigraph(18400 + round, n, Math.min(n * (n - 1), round % 6))]; },
      reference: book("17.1", "Kosaraju's algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [2, 4], [3, 1], [3, 4]], directed: true }, "a chain": { a: 3, b: [[1, 2], [2, 3], [1, 3]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("ignores-cycles", "A piece whose requests go round a cycle cannot be served by a tree of flights; it needs one more to close a big cycle.", flightRouteRequests, [["+ (cyclic[v] ? 1 : 0)", ""]]),
        diagnosis("one-cycle-overall", "Every piece with a cycle needs its own closing flight; one extra flight cannot serve two separate pieces.", function flightRouteRequests(n, requests) { const label = planetsAndKingdoms(n, requests); const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } requests.forEach(([a, b]) => dsuUnion(parent, size, a, b)); const kingdom = new Array(n + 1).fill(0); label.forEach((x) => { kingdom[x] += 1; }); let total = 0; for (let v = 1; v <= n; v += 1) if (dsuFind(parent, v) === v) total += size[v] - 1; return total + (kingdom.some((k) => k > 1) ? 1 : 0); }),
      ],
      hints: ["label = planetsAndKingdoms(n, requests); union every request's ends to find the pieces.", "A piece is cyclic when it contains a kingdom with two or more cities.", "Answer = Σ over pieces (size − 1 + [cyclic])."],
      cases: [
        example([4, [[1, 2], [2, 3], [2, 4], [3, 1], [3, 4]]], 4, "CSES sample"),
        example([3, [[1, 2], [2, 3], [1, 3]]], 2, "a chain covers the shortcut"),
        example([4, [[1, 2], [2, 1], [3, 4], [4, 3]]], 4, "two separate cycles"),
        run(flightRouteRequests, [8, randomDigraph(18450, 8, 9)], "eight cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, REQUESTS_BIG()]),
      ],
    },
    {
      id: "critical-cities", title: "Critical Cities", cses: { id: 1703, name: "Critical Cities" },
      goal: "The cities that every route from city 1 to city n passes through, in increasing order.",
      concept: "A critical city lies on every route, so it lies on any one route P found by BFS. Walk along P: a city of P is avoidable exactly when something reachable before it, without using it, jumps to a later city of P. So explore from each P city through cities off P (each explored once overall) and keep the farthest index of P reached so far. City P[i] is critical when that farthest index is still at most i when you arrive.",
      functionName: "criticalCities", signature: "criticalCities(n, flights) → cities",
      starterSource: starter("criticalCities", "n, flights", "BFS path 1 → n; walk it keeping far = farthest path index reached from earlier path cities through off-path cities; P[i] is critical when far ≤ i."),
      solve: criticalCities, comparator: "deep", brute: criticalCitiesBrute, small: (round) => { const n = 2 + (round % 7); return [n, criticalGraph(18500 + round, n, n - 1 + (round % 6))]; },
      reference: book("12.1", "Depth-first search"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [2, 4], [3, 5], [4, 5]], directed: true }, "a direct jump": { a: 4, b: [[1, 2], [2, 3], [3, 4], [1, 3]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("every-path-city", "A city on one route is not necessarily on every route; a detour may skip it.", criticalCities, [["if (far <= i) critical.push(path[i]);", "critical.push(path[i]);"]]),
        variant("stops-at-the-first-hop", "A detour can pass through several cities off the path before rejoining it; keep exploring through them.", criticalCities, [["else if (!seen[u]) { seen[u] = 1; stack.push(u); }", ""]]),
      ],
      hints: ["BFS from 1 with parents gives a path P to n; index[v] = position of v on P (−1 elsewhere).", "For i = 0, 1, …: if far ≤ i, P[i] is critical. Then explore from P[i]: an edge to a path city j raises far to j; an edge to an unseen off-path city continues the search.", "Return the critical cities sorted."],
      cases: [
        example([5, [[1, 2], [2, 3], [2, 4], [3, 5], [4, 5]]], [1, 2, 5], "CSES sample"),
        example([4, [[1, 2], [2, 3], [3, 4], [1, 3]]], [1, 3, 4], "a direct flight skips city 2"),
        example([2, [[1, 2]]], [1, 2], "only the two ends"),
        run(criticalCities, [9, criticalGraph(18550, 9, 14)], "nine cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, CRITICAL_BIG()]),
      ],
    },
    {
      id: "visiting-cities", title: "Visiting Cities", cses: { id: 1203, name: "Visiting Cities" },
      goal: "The cities that every cheapest route from city 1 to city n passes through, in increasing order.",
      concept: "Dijkstra from city 1 and, on reversed flights, from city n: a city is on some cheapest route when the two distances add up to the best total. Every cheapest route climbs through the distance levels, so a city on it is certain exactly when no other on-route city shares its distance level and no cheapest-route flight jumps over that level. Mark the jumped-over levels with a difference array.",
      functionName: "visitingCities", signature: "visitingCities(n, flights) → cities",
      starterSource: starter("visitingCities", "n, flights", "Dijkstra both ways; on-route cities by level; a level is certain when it holds one city and no on-route flight jumps over it."),
      solve: visitingCities, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: visitingCitiesBrute, small: (round) => { const n = 2 + (round % 6); return [n, shortestRouteGraph(18600 + round, n, round % 6, 1, 3)]; },
      reference: book("13.2", "Dijkstra's algorithm"),
      presets: { "CSES sample": { a: 5, b: [[1, 2, 3], [1, 3, 4], [2, 3, 1], [2, 4, 5], [3, 4, 1], [4, 5, 8]] }, "two equal routes": { a: 4, b: [[1, 2, 1], [1, 3, 1], [2, 4, 1], [3, 4, 1]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("every-cheapest-route-city", "A city on some cheapest route is not certain; another equally cheap route may avoid it.", visitingCities, [["if (count[i] === 1 && cover[i] === 0) out.push(v);", "out.push(v);"]]),
        variant("ignores-jumping-flights", "A cheapest-route flight can leap over a city's distance level, giving a route that never visits that level at all.", visitingCities, [["if (count[i] === 1 && cover[i] === 0) out.push(v);", "if (count[i] === 1) out.push(v);"]]),
      ],
      hints: ["from = Dijkstra from 1, to = Dijkstra from n on reversed flights, total = from[n]; v is on a route when from[v] + to[v] = total.", "Group on-route cities by from[v]; a flight (a, b, c) is on a route when from[a] + c + to[b] = total, and it jumps over every level strictly between from[a] and from[b].", "Certain cities: alone on their level and never jumped over."],
      cases: [
        example([5, [[1, 2, 3], [1, 3, 4], [2, 3, 1], [2, 4, 5], [3, 4, 1], [4, 5, 8]]], [1, 3, 4, 5], "CSES sample"),
        example([4, [[1, 2, 1], [1, 3, 1], [2, 4, 1], [3, 4, 1]]], [1, 4], "two equally cheap routes"),
        example([3, [[1, 2, 1], [2, 3, 1], [1, 3, 2]]], [1, 3], "a direct flight as cheap as the stop"),
        run(visitingCities, [8, shortestRouteGraph(18650, 8, 6, 1, 3)], "eight cities"),
        hidden("n = 10⁵, m = 2·10⁵, time limit", () => [100000, VISITING_BIG()]),
      ],
    },
    {
      id: "graph-coloring", title: "Graph Coloring", cses: { id: 3308, name: "Graph Coloring" },
      goal: "The fewest colors for the nodes (n ≤ 16) so that no edge joins two nodes of one color, with a coloring; any optimal coloring is accepted.",
      concept: "Each color class is an independent set. Mark every independent subset of the nodes in O(2^n), then let colors[mask] be the fewest colors for the nodes in mask: the class holding mask's lowest node is some independent subset, and trying every one of them costs about 3^n / 2 steps in total, fine for n = 16. Remember the chosen class to rebuild the coloring.",
      functionName: "graphColoring", signature: "graphColoring(n, edges) → { k, colors }",
      starterSource: starter("graphColoring", "n, edges", "independent[mask] by adding the lowest node; colors[mask] = 1 + min over independent classes holding the lowest node; rebuild from the choices."),
      solve: graphColoring, comparator: "deep", accept: coloringAccept, check: viaBrute(coloringAccept, graphColoringBrute), small: (round) => { const n = 1 + (round % 7); return [n, randomGraph(18700 + round, n, round % 12)]; },
      reference: book("10.5", "Dynamic programming over subsets"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [3, 4], [4, 1]] }, "a greedy trap": { a: 4, b: [[1, 4], [2, 3], [3, 4]] }, "a five-cycle": { a: 5, b: cycleGraph(5) } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("greedy-in-order", "Giving each node the smallest free color in number order can waste colors: the order decides, not the graph.", function graphColoring(n, edges) { const colors = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) { const used = new Set(); edges.forEach(([a, b]) => { if (a === v && colors[b]) used.add(colors[b]); if (b === v && colors[a]) used.add(colors[a]); }); let c = 1; while (used.has(c)) c += 1; colors[v] = c; } return { k: Math.max(...colors.slice(1)), colors: colors.slice(1) }; }),
        diagnosis("degree-bound", "Maximum degree + 1 colors always suffice, but far fewer are often enough: a star needs only two.", function graphColoring(n, edges) { const degree = new Array(n + 1).fill(0); edges.forEach(([a, b]) => { degree[a] += 1; degree[b] += 1; }); const colors = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) { const used = new Set(); edges.forEach(([a, b]) => { if (a === v && colors[b]) used.add(colors[b]); if (b === v && colors[a]) used.add(colors[a]); }); let c = 1; while (used.has(c)) c += 1; colors[v] = c; } return { k: Math.max(...degree) + 1, colors: colors.slice(1) }; }),
      ],
      hints: ["neighbours[v] as a bitmask; independent[mask] = independent[mask without its lowest node v] and v has no neighbour in the rest.", "For each mask: low = mask & −mask; for every subset s of the rest, the class s | low is a candidate when independent; colors[mask] = 1 + min colors[mask ^ class].", "Store the best class per mask and peel classes off the full mask to assign colors 1, 2, …."],
      cases: [
        example([4, [[1, 2], [2, 3], [3, 4], [4, 1]]], { k: 2, colors: [1, 2, 1, 2] }, "CSES sample"),
        example([4, [[1, 4], [2, 3], [3, 4]]], { k: 2, colors: [1, 2, 1, 2] }, "a path listed in a greedy-unfriendly order"),
        example([5, cycleGraph(5)], { k: 3, colors: [1, 2, 1, 2, 3] }, "an odd cycle needs three"),
        example([3, []], { k: 1, colors: [1, 1, 1] }, "no edges"),
        run(graphColoring, [9, randomGraph(18750, 9, 16)], "nine nodes"),
        hidden("n = 16, m = 60, time limit", () => [16, COLORING_BIG()]),
        hidden("n = 16, no edges", () => [16, []]),
      ],
    },
    {
      id: "bus-companies", title: "Bus Companies", cses: { id: 3158, name: "Bus Companies" },
      goal: "The cheapest cost from city 1 to every city, where a company's ticket lets you travel between any two of its cities.",
      concept: "Joining every pair of a company's cities would take k² edges. Give each company a hub node instead: a city reaches the hub by paying the ticket price, and the hub reaches its cities for free. Dijkstra over cities and hubs then has only 2 · Σk edges, and each hub is expanded once.",
      functionName: "busCompanies", signature: "busCompanies(n, costs, companies) → costs",
      starterSource: starter("busCompanies", "n, costs, companies", "Nodes 1..n are cities, n + 1 + j is company j's hub; city → hub costs c_j, hub → city costs 0; Dijkstra from city 1."),
      solve: busCompanies, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: busCompaniesBrute, small: (round) => { const n = 2 + (round % 6); const c = reachableCompanies(18800 + round, n, 3 + (round % 3), 3); return [n, randomInts(18850 + round, c.length, 1, 9), c]; },
      reference: book("13.2", "Dijkstra's algorithm"),
      presets: { "CSES sample": { a: [4, 3, 2], b: [[1, 4, 3], [5, 1], [2, 3, 4, 5]], c: 5 }, "a cheap chain": { a: [10, 1, 1], b: [[1, 2, 3], [1, 2], [2, 3]], c: 3 } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetC" }, { fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("pays-both-ways", "One ticket covers the whole trip inside a company; pay when you board, not again when you get off.", busCompanies, [["for (let k = 0; k < list.length; k += 1) if (d < dist[list[k]]) { dist[list[k]] = d; heapPush(heap, [d, list[k]]); }", "for (let k = 0; k < list.length; k += 1) { const next = d + costs[v - n - 1]; if (next < dist[list[k]]) { dist[list[k]] = next; heapPush(heap, [next, list[k]]); } }"]]),
        diagnosis("one-ticket-only", "Routes may change companies; one ticket from city 1 is only the first leg.", function busCompanies(n, costs, companies) { const out = new Array(n).fill(-1); out[0] = 0; companies.forEach((list, j) => { if (!list.includes(1)) return; list.forEach((v) => { if (v !== 1 && (out[v - 1] < 0 || costs[j] < out[v - 1])) out[v - 1] = costs[j]; }); }); return out; }),
      ],
      hints: ["memberOf[v] = the companies serving city v.", "Dijkstra over n + m nodes: from city v to hub n + 1 + j with cost costs[j] for every j in memberOf[v]; from hub j to each of its cities with cost 0.", "Return the distances of cities 1 … n."],
      cases: [
        example([5, [4, 3, 2], [[1, 4, 3], [5, 1], [2, 3, 4, 5]]], [0, 5, 4, 4, 3], "CSES sample"),
        example([3, [10, 1, 1], [[1, 2, 3], [1, 2], [2, 3]]], [0, 1, 2], "two cheap tickets beat one dear one"),
        example([2, [7], [[1, 2]]], [0, 7], "one company"),
        run(busCompanies, [7, randomInts(18900, 9, 1, 20), reachableCompanies(18950, 7, 3, 4)], "seven cities"),
        hidden("n = 5·10⁴, about 8·10⁴ companies, Σk ≈ 1.75·10⁵, time limit", () => BUS_BIG()),
      ],
    },
    {
      id: "split-into-two-paths", title: "Split into Two Paths", cses: { id: 3358, name: "Split into Two Paths" },
      goal: "Two paths along edges of the acyclic graph that together contain every node exactly once (one may be empty), or null; any valid pair is accepted.",
      concept: "Each path follows the edges, so its nodes appear in the same order in every topological order; merging the two paths therefore gives any fixed topological order back. Walk that order. After position p one path ends at t_p, and the set S holds every position where the other path can end (0 for empty). Moving to t_(p+1): if t_p → t_(p+1) is an edge, all of S survives; and if some j in S can step to t_(p+1) (or the other path is empty), the path at t_p becomes the other one, adding p to S. Otherwise S empties and the answer is null. Each step checks only the in-edges of t_(p+1), so the whole scan is O(n + m).",
      functionName: "splitIntoTwoPaths", signature: "splitIntoTwoPaths(n, edges) → [path, path] or null",
      starterSource: starter("splitIntoTwoPaths", "n, edges", "Topological order; the set S of possible ends of the other path, kept with an epoch counter; remember where each switch came from and walk back to build the paths."),
      solve: splitIntoTwoPaths, comparator: "deep", dependencies: ["course-schedule"], accept: splitAccept, check: viaBrute(splitAccept, splitIntoTwoPathsBrute), small: (round) => { const n = 2 + (round % 7); return [n, round % 3 === 0 ? randomDag(19000 + round, n, round % 9) : twoPathDag(19050 + round, n, round % 4, round % 2 === 0)]; },
      reference: book("16.1", "Topological sorting"),
      presets: { "CSES sample 1": { a: 5, b: [[1, 2], [1, 4], [3, 4], [4, 5]], directed: true }, "CSES sample 2": { a: 5, b: [[1, 2], [1, 3], [1, 4], [1, 5]], directed: true }, "switch paths": { a: 4, b: [[1, 3], [2, 4], [3, 4]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("one-path-only", "One of the two paths may be needed: a graph without a single path through everything can still split into two.", function splitIntoTwoPaths(n, edges) { const order = courseSchedule(n, edges); const has = new Set(edges.map(([a, b]) => a * (n + 1) + b)); for (let i = 1; i < n; i += 1) if (!has.has(order[i - 1] * (n + 1) + order[i])) return null; return [order, []]; }),
        diagnosis("greedy-first-path", "Extending the first path whenever possible can strand a later node; keep every place the other path could end.", function splitIntoTwoPaths(n, edges) { const order = courseSchedule(n, edges); const has = new Set(edges.map(([a, b]) => a * (n + 1) + b)); const first = [order[0]], second = []; for (let i = 1; i < n; i += 1) { const w = order[i]; if (has.has(first[first.length - 1] * (n + 1) + w)) first.push(w); else if (second.length === 0 || has.has(second[second.length - 1] * (n + 1) + w)) second.push(w); else return null; } return [first, second]; }),
      ],
      hints: ["order = courseSchedule(n, edges); an edge set gives O(1) tests of t_p → t_(p+1); index[v] = position of v.", "member[j] === epoch means j ∈ S. Step p → p + 1: keep = edge t_p → t_(p+1); via = 0 if 0 ∈ S, else an in-neighbour of t_(p+1) at a position j < p with j ∈ S. If !keep: via < 0 → null, else epoch += 1. If via ≥ 0: add p to S and remember from[p + 1] = via.", "Walk back from (n, any j in S): if j < p − 1 the previous node of the current path is t_(p−1); if j = p − 1 switch paths and continue from from[p]."],
      cases: [
        example([5, [[1, 2], [1, 4], [3, 4], [4, 5]]], [[1, 2], [3, 4, 5]], "CSES sample 1"),
        example([5, [[1, 2], [1, 3], [1, 4], [1, 5]]], null, "CSES sample 2"),
        example([4, [[1, 3], [2, 4], [3, 4]]], [[1, 3, 4], [2]], "the paths have to switch roles"),
        example([2, []], [[1], [2]], "two lonely nodes"),
        example([6, [[1, 3], [2, 1], [3, 4], [6, 3], [5, 4], [1, 5]]], [[6, 3, 4], [2, 1, 5]], "extending the first path greedily strands a node"),
        run(splitIntoTwoPaths, [9, twoPathDag(19100, 9, 4, true)], "nine nodes"),
        hidden("n = 10⁵, m ≈ 1.7·10⁵ (CSES allows 2·10⁵ and 5·10⁵), time limit", () => [100000, SPLIT_YES()]),
        hidden("n = 10⁵ with a broken chain", () => [100000, SPLIT_NO()]),
      ],
    },
    {
      id: "network-renovation", title: "Network Renovation", cses: { id: 1704, name: "Network Renovation" },
      goal: "The fewest new connections that keep the tree network connected after any single connection breaks, as a list; any valid list is accepted.",
      concept: "Every leaf needs a new connection, and one new connection serves at most two leaves, so ⌈L/2⌉ is a lower bound. It is also enough: list the leaves in DFS order from a non-leaf root and join leaf i to leaf i + ⌊L/2⌋. Every tree edge has leaves on both sides that are paired across it, so every edge then lies on a cycle.",
      functionName: "networkRenovation", signature: "networkRenovation(n, connections) → new connections",
      starterSource: starter("networkRenovation", "n, connections", "DFS from a node of degree ≥ 2 listing leaves in order; join leaves[i] with leaves[i + ⌊L/2⌋] for i < ⌈L/2⌉."),
      solve: networkRenovation, comparator: "deep", accept: renovationAccept, check: viaBrute(renovationAccept, networkRenovationBrute), small: (round) => { const n = 3 + (round % 4); return [n, randomTree(19200 + round, n)]; },
      reference: site("cp-algorithms · Bridges and 2-edge-connectivity", CP + "graph/bridge-searching.html"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [3, 4], [3, 5]], tree: true }, "a path": { a: 4, b: [[1, 2], [2, 3], [3, 4]], tree: true }, "a star": { a: 5, b: [[1, 2], [1, 3], [1, 4], [1, 5]], tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("pairs-neighbouring-leaves", "Two leaves next to each other in DFS order often hang off the same branch; joining them leaves that branch's edge a single point of failure.", networkRenovation, [["for (let i = 0; i < count; i += 1) out.push([leaves[i], leaves[i + half]]);", "for (let i = 0; i < count; i += 1) out.push([leaves[2 * i], leaves[(2 * i + 1) % leaves.length]]);"]]),
        variant("a-connection-per-leaf", "One new connection can serve two leaves at once, so ⌈L/2⌉ are enough, not L.", networkRenovation, [["for (let i = 0; i < count; i += 1) out.push([leaves[i], leaves[i + half]]);", "for (let i = 0; i < leaves.length; i += 1) out.push([leaves[i], leaves[(i + 1) % leaves.length]]);"]]),
      ],
      hints: ["Root at any node of degree at least 2 (n ≥ 3 guarantees one).", "Collect the leaves in DFS order; L = their number, half = ⌊L/2⌋.", "Add [leaves[i], leaves[i + half]] for i = 0 … ⌈L/2⌉ − 1."],
      cases: [
        example([5, [[1, 2], [1, 3], [3, 4], [3, 5]]], [[2, 4], [4, 5]], "CSES sample"),
        example([3, [[1, 2], [2, 3]]], [[1, 3]], "a path of three"),
        example([5, [[1, 2], [1, 3], [1, 4], [1, 5]]], [[2, 4], [3, 5]], "a star of four leaves"),
        run(networkRenovation, [9, randomTree(19250, 9)], "nine computers"),
        hidden("n = 10⁵, time limit", () => [100000, RENOVATION_TREE()]),
      ],
    },
    {
      id: "forbidden-cities", title: "Forbidden Cities", cses: { id: 1705, name: "Forbidden Cities" },
      goal: "For each query [a, b, c], whether a route from a to b exists that never enters city c.",
      concept: "Removing c splits the graph into pieces: each DFS child of c whose subtree cannot climb above c (low ≥ tin[c]) becomes its own piece, and everything else stays together. So find, for a and for b, which child subtree of c holds it, by binary search on the children's entry times and the subtree ranges; the answer is YES when both land in the same piece. A query that starts or ends at c is NO.",
      functionName: "forbiddenCities", signature: "forbiddenCities(n, roads, queries) → booleans",
      starterSource: starter("forbiddenCities", "n, roads, queries", "lowLink; subtree sizes and children sorted by tin; the piece of x after removing c; compare the pieces of a and b."),
      solve: forbiddenCities, comparator: "deep", dependencies: ["low-link"], brute: forbiddenCitiesBrute, small: (round) => { const n = 2 + (round % 7); return [n, connectedGraph(19300 + round, n, n - 1 + (round % 4)), randomTriples(19350 + round, n, 8)]; },
      reference: site("cp-algorithms · Articulation points", CP + "graph/cutpoints.html"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5]], c: [[1, 4, 2], [3, 5, 4], [3, 5, 2]] }, "a path": { a: 4, b: [[1, 2], [2, 3], [3, 4]], c: [[1, 4, 2], [1, 2, 4], [2, 2, 3]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("cut-city-blocks-everything", "A cut city separates only some pairs; two cities on the same side still reach each other.", function forbiddenCities(n, roads, queries) { const link = lowLink(n, roads); const cut = new Array(n + 1).fill(false), children = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) { const e = link.parentEdge[v - 1]; if (e < 0) continue; const p = roads[e][0] === v ? roads[e][1] : roads[e][0]; children[p] += 1; if (link.parentEdge[p - 1] >= 0 && link.low[v - 1] >= link.tin[p - 1]) cut[p] = true; } for (let v = 1; v <= n; v += 1) if (link.parentEdge[v - 1] < 0 && children[v] >= 2) cut[v] = true; return queries.map(([a, b, c]) => a !== c && b !== c && !cut[c]); }),
        variant("endpoints-allowed", "The route starts in a and ends in b, so if either is c the route enters c: the answer is NO.", forbiddenCities, [["if (a === c || b === c) return false;", "if (a === c || b === c) return true;"]]),
      ],
      hints: ["link = lowLink(n, roads); order the nodes by tin to get parents, children lists sorted by tin and subtree sizes.", "piece(x, c): 0 if x is outside c's subtree; otherwise the child ch of c whose tin range holds x (binary search), or 0 if low[ch] < tin[c].", "NO when a = c or b = c; otherwise YES exactly when piece(a, c) === piece(b, c)."],
      cases: [
        example([5, [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5]], [[1, 4, 2], [3, 5, 4], [3, 5, 2]]], [true, false, true], "CSES sample"),
        example([4, [[1, 2], [2, 3], [3, 4]], [[1, 4, 2], [1, 2, 4], [2, 2, 3]]], [false, true, true], "a path"),
        example([3, [[1, 2], [2, 3]], [[1, 3, 1], [2, 2, 2]]], [false, false], "the forbidden city is an endpoint"),
        run(forbiddenCities, [8, connectedGraph(19400, 8, 10), randomTriples(19450, 8, 8)], "eight cities"),
        hidden("n = 10⁵, m = 2·10⁵, q = 10⁵, time limit", () => [100000, FORBIDDEN_GRAPH(), FORBIDDEN_QUERIES()]),
      ],
    },
    {
      id: "centroid-ancestors", title: "Centroid Ancestors", cses: { id: 1752, name: "Creating Offices (brick)" },
      goal: "Centroid-decompose the tree and return, for every node v, the flat list [c₁, d₁, c₂, d₂, …, v, 0] of the centroids above it from the top down, each with its distance to v. Any valid decomposition is accepted.",
      concept: "A centroid leaves pieces of at most half the size when removed, so recursing on the pieces goes only about log₂ n levels deep. Find it by walking from any node of the piece towards a neighbour whose side holds more than half. Every node sits in one piece per level, so it records at most ⌊log₂ n⌋ + 1 centroids, and any path between two nodes passes through the deepest centroid they share. That turns 'distance to the nearest marked node' into a minimum over a node's own list.",
      functionName: "centroidAncestors", signature: "centroidAncestors(n, edges) → lists",
      starterSource: starter("centroidAncestors", "n, edges", "Stack of pieces; per piece: sizes by BFS, walk to the centroid, BFS from it recording (centroid, distance) for each node, remove it, push the neighbouring pieces."),
      solve: centroidAncestors, comparator: "deep", accept: centroidAccept, check: (args, out) => centroidAccept(args, out) === true, small: (round) => { const n = 1 + (round % 10); return [n, randomTree(19500 + round, n)]; },
      reference: site("cp-algorithms · Centroid decomposition", CP + "graph/centroid-decomposition.html"),
      presets: { "a path of seven": { a: 7, b: pathTree(7), tree: true }, "a star": { a: 5, b: [[1, 2], [1, 3], [1, 4], [1, 5]], tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("entry-node-as-centroid", "The node you enter a piece by can sit at its edge; walking towards the heavy side is what keeps every piece at most half.", centroidAncestors, [["        if (!next) break;\n        c = next;", "        break;"]]),
        variant("one-step-only", "Walk towards the heavy side until no neighbour's side holds more than half; one step may not be enough.", centroidAncestors, [["        if (!next) break;\n        c = next;", "        if (next) c = next;\n        break;"]]),
      ],
      hints: ["Keep a stack of entry nodes, starting with 1, and a removed flag per node.", "For a piece entered at s: BFS for parents and subtree sizes; from s, move to a child u with 2 · size[u] > total while one exists — that node is the centroid c.", "BFS from c inside the piece and append c, distance to every visited node's list; mark c removed and push its unremoved neighbours."],
      cases: [
        run(centroidAncestors, [7, pathTree(7)], "a path of seven"),
        example([1, []], [[1, 0]], "one node"),
        run(centroidAncestors, [5, [[1, 2], [1, 3], [1, 4], [1, 5]]], "a star"),
        run(centroidAncestors, [12, randomTree(19550, 12)], "twelve nodes"),
        hidden("n = 2·10⁴, time limit", () => [20000, CENTROID_TREE()]),
      ],
    },
    {
      id: "creating-offices", title: "Creating Offices", cses: { id: 1752, name: "Creating Offices" },
      goal: "As many offices as possible in cities of the tree with every two offices at distance at least d; any maximum set is accepted.",
      concept: "Greedy from the deepest city up: placing an office at the deepest open city blocks as little as possible of what remains, and an exchange argument shows this is optimal. The check 'is some office within distance d − 1?' is a minimum over the city's centroid list: nearest[c] + dist(c, v), where nearest[c] is the closest office to centroid c. Placing an office updates the same list, so each city costs O(log n).",
      functionName: "creatingOffices", signature: "creatingOffices(n, d, roads) → offices",
      starterSource: starter("creatingOffices", "n, d, roads", "Centroid lists; cities by decreasing depth; open when min over the list of nearest[c] + dist ≥ d, then lower nearest[c] along the list."),
      solve: creatingOffices, comparator: "deep", dependencies: ["centroid-ancestors", "rooted-ancestors"], accept: officesAccept, check: viaBrute(officesAccept, creatingOfficesBrute), small: (round) => { const n = 1 + (round % 9); return [n, 1 + (round % 5), randomTree(19600 + round, n)]; },
      reference: site("cp-algorithms · Centroid decomposition", CP + "graph/centroid-decomposition.html"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [3, 4], [3, 5]], c: 3, tree: true }, "a path, d = 2": { a: 5, b: pathTree(5), c: 2, tree: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }] },
      diagnoses: [
        variant("shallowest-first", "An office near the root blocks cities in every direction; the deepest open city blocks the least.", creatingOffices, [["for (let i = n - 1; i >= 0; i -= 1) {", "for (let i = 0; i < n; i += 1) {"]]),
        variant("strictly-farther", "Offices exactly d apart are allowed; only closer ones clash.", creatingOffices, [["if (closest < d) continue;", "if (closest <= d) continue;"]]),
      ],
      hints: ["lists = centroidAncestors(n, roads); order = rootedAncestors(n, roads).order (BFS, so by depth).", "Visit order from the end: closest = min over pairs (c, dist) of nearest[c] + dist.", "If closest ≥ d open an office and set nearest[c] = min(nearest[c], dist) for every pair."],
      cases: [
        example([5, 3, [[1, 2], [2, 3], [3, 4], [3, 5]]], [1, 4], "CSES sample"),
        example([5, 2, pathTree(5)], [1, 3, 5], "every other city of a path"),
        example([4, 1, [[1, 2], [2, 3], [3, 4]]], [1, 2, 3, 4], "d = 1 allows every city"),
        example([1, 5, []], [1], "one city"),
        run(creatingOffices, [12, 3, randomTree(19650, 12)], "twelve cities"),
        hidden("n = 10⁵, d = 5 (CSES allows 2·10⁵), time limit", () => [100000, 5, OFFICES_TREE()]),
      ],
    },
    {
      id: "new-flight-routes", title: "New Flight Routes", cses: { id: 1685, name: "New Flight Routes" },
      goal: "The fewest new flights that let every city reach every other city, as a list; any valid list is accepted.",
      concept: "Shrink strongly connected kingdoms: the kingdom graph is acyclic with s sources and t sinks, and every source needs a new flight in and every sink a new flight out, so max(s, t) is a lower bound (0 when there is one kingdom). The Eswaran–Tarjan construction reaches it. Match sources to sinks they reach, with a depth-first search that marks a kingdom only when it enters it; link the matched pairs into one cycle (sink i → source i + 1); pair up the unmatched sinks and sources; and send any leftovers into or out of the cycle.",
      functionName: "newFlightRoutes", signature: "newFlightRoutes(n, flights) → new flights",
      starterSource: starter("newFlightRoutes", "n, flights", "Kingdoms; sources and sinks; greedy source-to-sink matching by DFS; cycle through the pairs, pair the rest, attach the leftovers."),
      solve: newFlightRoutes, comparator: "deep", dependencies: ["planets-and-kingdoms"], accept: newFlightsAccept, check: viaBrute(newFlightsAccept, newFlightRoutesBrute), small: (round) => { const n = 1 + (round % 4); return [n, randomDigraph(19700 + round, n, Math.min(n * (n - 1), round % 5))]; },
      reference: book("17.1", "Kosaraju's algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [3, 1], [1, 4], [3, 4]], directed: true }, "a star out of 1": { a: 4, b: [[1, 2], [1, 3], [1, 4]], directed: true }, "no flights": { a: 3, b: [], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("sources-plus-sinks", "A flight from a sink to a source serves both at once, so max(s, t) flights suffice, not s + t.", function newFlightRoutes(n, flights) { const label = planetsAndKingdoms(n, flights); let c = 0; label.forEach((x) => { c = Math.max(c, x); }); if (c === 1) return []; const city = new Array(c + 1).fill(0), indegree = new Array(c + 1).fill(0), outdegree = new Array(c + 1).fill(0); for (let v = 1; v <= n; v += 1) if (!city[label[v - 1]]) city[label[v - 1]] = v; flights.forEach(([a, b]) => { const x = label[a - 1], y = label[b - 1]; if (x !== y) { outdegree[x] += 1; indegree[y] += 1; } }); const out = []; for (let x = 1; x <= c; x += 1) { if (outdegree[x] === 0) out.push([city[x], city[1]]); if (indegree[x] === 0) out.push([city[c], city[x]]); } return out; }),
        diagnosis("pairs-without-matching", "Joining sinks to sources in list order ignores which sources reach which sinks, and can leave some kingdom unreachable.", function newFlightRoutes(n, flights) { const label = planetsAndKingdoms(n, flights); let c = 0; label.forEach((x) => { c = Math.max(c, x); }); if (c === 1) return []; const city = new Array(c + 1).fill(0), indegree = new Array(c + 1).fill(0), outdegree = new Array(c + 1).fill(0); for (let v = 1; v <= n; v += 1) if (!city[label[v - 1]]) city[label[v - 1]] = v; flights.forEach(([a, b]) => { const x = label[a - 1], y = label[b - 1]; if (x !== y) { outdegree[x] += 1; indegree[y] += 1; } }); const sources = [], sinks = []; for (let x = 1; x <= c; x += 1) { if (indegree[x] === 0) sources.push(x); if (outdegree[x] === 0) sinks.push(x); } const out = []; for (let i = 0; i < Math.max(sources.length, sinks.length); i += 1) out.push([city[sinks[i % sinks.length]], city[sources[(i + 1) % sources.length]]]); return out; }),
      ],
      hints: ["label = planetsAndKingdoms(n, flights); one kingdom means no flights. Otherwise find the source and sink kingdoms of the kingdom graph and a city in each kingdom.", "For each source, DFS marking a kingdom when it is entered; the first unmarked sink entered is its partner.", "Add sink_i → source_(i+1) around the matched pairs, unmatched sink_j → unmatched source_j, extra sinks → source_1 and sink_1 → extra sources."],
      cases: [
        example([4, [[1, 2], [2, 3], [3, 1], [1, 4], [3, 4]]], [[4, 2]], "CSES sample"),
        example([4, [[1, 2], [1, 3], [1, 4]]], [[2, 1], [3, 1], [4, 1]], "three sinks"),
        example([3, []], [[1, 2], [2, 3], [3, 1]], "no flights at all"),
        example([2, [[1, 2], [2, 1]]], [], "already connected"),
        run(newFlightRoutes, [8, randomDigraph(19750, 8, 8)], "eight cities"),
        hidden("n = 10⁵, m = 10⁵, time limit", () => [100000, NEW_FLIGHTS_BIG()]),
      ],
    },
  ];
  core.share({ pathMaxTable, pathMax, ahuCodes, treeCenters, centroidAncestors });
  core.define("advanced-graphs", ADVANCED_GRAPHS);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

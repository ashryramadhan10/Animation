(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { fenwickAdd, fenwickPrefix, distinctValuesQueries } = core.shared;

  // ------------------------------------------------------------------ 6 · tree algorithms · references
  function subordinates(n, bosses) {
    const size = new Array(n + 1).fill(0);
    for (let v = n; v >= 2; v -= 1) {
      size[v] += 1;
      size[bosses[v - 2]] += size[v];
    }
    return size.slice(1).map((count, i) => (i === 0 ? count : count - 1));
  }
  function treeMatching(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); }
      }
    }
    const matched = new Array(n + 1).fill(false);
    let count = 0;
    for (let i = order.length - 1; i >= 1; i -= 1) {
      const v = order[i];
      if (!matched[v] && !matched[parent[v]]) { matched[v] = true; matched[parent[v]] = true; count += 1; }
    }
    return count;
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
  function treeDistancesII(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); }
      }
    }
    const size = new Array(n + 1).fill(1);
    const inside = new Array(n + 1).fill(0);
    for (let i = order.length - 1; i >= 1; i -= 1) {
      const v = order[i];
      size[parent[v]] += size[v];
      inside[parent[v]] += inside[v] + size[v];
    }
    const answer = new Array(n + 1).fill(0);
    answer[1] = inside[1];
    for (let i = 1; i < order.length; i += 1) {
      const v = order[i];
      answer[v] = answer[parent[v]] - size[v] + (n - size[v]);
    }
    return answer.slice(1);
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
  function rootedAncestors(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const depth = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); }
      }
    }
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    const up = [parent.slice()];
    for (let j = 1; j < levels; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return { parent, depth, order, up };
  }
  function treeLca(table, a, b) {
    const depth = table.depth, up = table.up;
    let x = a, y = b;
    if (depth[x] < depth[y]) { const swap = x; x = y; y = swap; }
    let diff = depth[x] - depth[y];
    for (let j = 0; diff > 0; j += 1) {
      if (diff & 1) x = up[j][x];
      diff >>= 1;
    }
    if (x === y) return x;
    for (let j = up.length - 1; j >= 0; j -= 1) {
      if (up[j][x] !== up[j][y]) { x = up[j][x]; y = up[j][y]; }
    }
    return up[0][x];
  }
  function distanceQueries(n, edges, queries) {
    const table = rootedAncestors(n, edges);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      const a = queries[i][0], b = queries[i][1];
      answers.push(table.depth[a] + table.depth[b] - 2 * table.depth[treeLca(table, a, b)]);
    }
    return answers;
  }
  function countingPaths(n, edges, paths) {
    const table = rootedAncestors(n, edges);
    const diff = new Array(n + 1).fill(0);
    for (let i = 0; i < paths.length; i += 1) {
      const a = paths[i][0], b = paths[i][1];
      const top = treeLca(table, a, b);
      diff[a] += 1;
      diff[b] += 1;
      diff[top] -= 1;
      if (table.parent[top] !== 0) diff[table.parent[top]] -= 1;
    }
    const order = table.order;
    for (let i = order.length - 1; i >= 1; i -= 1) {
      const v = order[i];
      diff[table.parent[v]] += diff[v];
    }
    return diff.slice(1);
  }
  function eulerTour(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const tin = new Array(n + 1).fill(0);
    const size = new Array(n + 1).fill(1);
    const pointer = new Array(n + 1).fill(0);
    const order = [1];
    const stack = [1];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const list = adjacency[v];
      if (pointer[v] < list.length) {
        const u = list[pointer[v]];
        pointer[v] += 1;
        if (u === parent[v]) continue;
        parent[u] = v;
        tin[u] = order.length;
        order.push(u);
        stack.push(u);
      } else {
        stack.pop();
        if (parent[v] !== 0) size[parent[v]] += size[v];
      }
    }
    return { parent, order, tin, size };
  }
  function subtreeQueries(values, edges, ops) {
    const n = values.length;
    const tour = eulerTour(n, edges);
    const tree = new Array(n + 1).fill(0);
    const current = values.slice();
    for (let v = 1; v <= n; v += 1) fenwickAdd(tree, tour.tin[v] + 1, values[v - 1]);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      const s = ops[i][1];
      if (ops[i][0] === 1) {
        fenwickAdd(tree, tour.tin[s] + 1, ops[i][2] - current[s - 1]);
        current[s - 1] = ops[i][2];
      } else {
        const lo = tour.tin[s], hi = tour.tin[s] + tour.size[s];
        answers.push(fenwickPrefix(tree, hi) - fenwickPrefix(tree, lo));
      }
    }
    return answers;
  }
  function pathQueries(values, edges, ops) {
    const n = values.length;
    const tour = eulerTour(n, edges);
    const tree = new Array(n + 2).fill(0);
    const current = values.slice();
    const spread = (v, delta) => {
      fenwickAdd(tree, tour.tin[v] + 1, delta);
      fenwickAdd(tree, tour.tin[v] + tour.size[v] + 1, -delta);
    };
    for (let v = 1; v <= n; v += 1) spread(v, values[v - 1]);
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      const s = ops[i][1];
      if (ops[i][0] === 1) {
        spread(s, ops[i][2] - current[s - 1]);
        current[s - 1] = ops[i][2];
      } else {
        answers.push(fenwickPrefix(tree, tour.tin[s] + 1));
      }
    }
    return answers;
  }
  function heavyLight(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const depth = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); }
      }
    }
    const size = new Array(n + 1).fill(1);
    const heavy = new Array(n + 1).fill(0);
    for (let i = order.length - 1; i >= 1; i -= 1) {
      const v = order[i];
      const p = parent[v];
      size[p] += size[v];
      if (heavy[p] === 0 || size[v] > size[heavy[p]]) heavy[p] = v;
    }
    const head = new Array(n + 1).fill(0);
    const position = new Array(n + 1).fill(0);
    let counter = 0;
    const stack = [1];
    while (stack.length) {
      const top = stack.pop();
      for (let v = top; v !== 0; v = heavy[v]) {
        head[v] = top;
        position[v] = counter;
        counter += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const u = list[k];
          if (u !== parent[v] && u !== heavy[v]) stack.push(u);
        }
      }
    }
    return { parent, depth, head, position };
  }
  function pathQueriesII(values, edges, ops) {
    const n = values.length;
    const chains = heavyLight(n, edges);
    let width = 1;
    while (width < n) width *= 2;
    const tree = new Array(2 * width).fill(0);
    for (let v = 1; v <= n; v += 1) tree[width + chains.position[v]] = values[v - 1];
    for (let i = width - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]);
    const rangeMax = (l, r) => {
      let lo = width + l, hi = width + r + 1, best = 0;
      while (lo < hi) {
        if (lo & 1) { best = Math.max(best, tree[lo]); lo += 1; }
        if (hi & 1) { hi -= 1; best = Math.max(best, tree[hi]); }
        lo >>= 1;
        hi >>= 1;
      }
      return best;
    };
    const answers = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) {
        let v = width + chains.position[ops[i][1]];
        tree[v] = ops[i][2];
        for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.max(tree[2 * v], tree[2 * v + 1]);
        continue;
      }
      let a = ops[i][1], b = ops[i][2], best = 0;
      while (chains.head[a] !== chains.head[b]) {
        if (chains.depth[chains.head[a]] < chains.depth[chains.head[b]]) { const swap = a; a = b; b = swap; }
        best = Math.max(best, rangeMax(chains.position[chains.head[a]], chains.position[a]));
        a = chains.parent[chains.head[a]];
      }
      if (chains.depth[a] > chains.depth[b]) { const swap = a; a = b; b = swap; }
      answers.push(Math.max(best, rangeMax(chains.position[a], chains.position[b])));
    }
    return answers;
  }
  function distinctColors(colors, edges) {
    const n = colors.length;
    const tour = eulerTour(n, edges);
    const flat = new Array(n);
    for (let v = 1; v <= n; v += 1) flat[tour.tin[v]] = colors[v - 1];
    const ranges = new Array(n);
    for (let v = 1; v <= n; v += 1) ranges[v - 1] = [tour.tin[v] + 1, tour.tin[v] + tour.size[v]];
    return distinctValuesQueries(flat, ranges);
  }
  function findCentroid(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); }
      }
    }
    const size = new Array(n + 1).fill(1);
    for (let i = order.length - 1; i >= 1; i -= 1) size[parent[order[i]]] += size[order[i]];
    let node = 1;
    while (true) {
      let next = 0;
      const list = adjacency[node];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (u !== parent[node] && size[u] * 2 > n) { next = u; break; }
      }
      if (next === 0) return node;
      node = next;
    }
  }
  function fixedLengthPathsI(n, k, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const removed = new Array(n + 1).fill(false);
    const parent = new Array(n + 1).fill(0);
    const size = new Array(n + 1).fill(0);
    const count = new Array(k + 1).fill(0);
    const component = [];
    let answer = 0;
    const roots = [1];
    while (roots.length) {
      const root = roots.pop();
      if (removed[root]) continue;
      component.length = 0;
      component.push(root);
      parent[root] = 0;
      for (let i = 0; i < component.length; i += 1) {
        const v = component[i];
        const list = adjacency[v];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); }
        }
      }
      const total = component.length;
      for (let i = total - 1; i >= 0; i -= 1) {
        const v = component[i];
        size[v] = 1;
        const list = adjacency[v];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[v] && !removed[u]) size[v] += size[u];
        }
      }
      let centroid = root;
      while (true) {
        let next = 0;
        const list = adjacency[centroid];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; }
        }
        if (next === 0) break;
        centroid = next;
      }
      count[0] = 1;
      let deepest = 0;
      const branches = adjacency[centroid];
      const queue = [], depths = [];
      for (let j = 0; j < branches.length; j += 1) {
        const start = branches[j];
        if (removed[start]) continue;
        queue.length = 0;
        depths.length = 0;
        queue.push(start);
        depths.push(1);
        parent[start] = centroid;
        for (let i = 0; i < queue.length; i += 1) {
          const v = queue[i], d = depths[i];
          if (d <= k) answer += count[k - d];
          const list = adjacency[v];
          for (let t = 0; t < list.length; t += 1) {
            const u = list[t];
            if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(d + 1); }
          }
        }
        for (let i = 0; i < depths.length; i += 1) {
          const d = depths[i];
          if (d <= k) { count[d] += 1; if (d > deepest) deepest = d; }
        }
      }
      for (let d = 0; d <= deepest; d += 1) count[d] = 0;
      removed[centroid] = true;
      for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]);
    }
    return answer;
  }
  function fixedLengthPathsII(n, k1, k2, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const removed = new Array(n + 1).fill(false);
    const parent = new Array(n + 1).fill(0);
    const size = new Array(n + 1).fill(0);
    const bucket = new Array(n + 2).fill(0);
    const pairsAtMost = (sorted, limit) => {
      if (limit < 0) return 0;
      let lo = 0, hi = sorted.length - 1, total = 0;
      while (lo < hi) {
        if (sorted[lo] + sorted[hi] <= limit) { total += hi - lo; lo += 1; }
        else hi -= 1;
      }
      return total;
    };
    const inRange = (sorted) => pairsAtMost(sorted, k2) - pairsAtMost(sorted, k1 - 1);
    const sortDepths = (lists, extraZero) => {
      let deepest = 0, total = extraZero ? 1 : 0;
      if (extraZero) bucket[0] += 1;
      for (let j = 0; j < lists.length; j += 1) {
        const list = lists[j];
        for (let i = 0; i < list.length; i += 1) { bucket[list[i]] += 1; if (list[i] > deepest) deepest = list[i]; total += 1; }
      }
      const out = new Array(total);
      let at = 0;
      for (let d = 0; d <= deepest; d += 1) {
        while (bucket[d] > 0) { out[at] = d; at += 1; bucket[d] -= 1; }
      }
      return out;
    };
    let answer = 0;
    const component = [];
    const roots = [1];
    while (roots.length) {
      const root = roots.pop();
      if (removed[root]) continue;
      component.length = 0;
      component.push(root);
      parent[root] = 0;
      for (let i = 0; i < component.length; i += 1) {
        const v = component[i];
        const list = adjacency[v];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); }
        }
      }
      const total = component.length;
      for (let i = total - 1; i >= 0; i -= 1) {
        const v = component[i];
        size[v] = 1;
        const list = adjacency[v];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[v] && !removed[u]) size[v] += size[u];
        }
      }
      let centroid = root;
      while (true) {
        let next = 0;
        const list = adjacency[centroid];
        for (let j = 0; j < list.length; j += 1) {
          const u = list[j];
          if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; }
        }
        if (next === 0) break;
        centroid = next;
      }
      const branches = adjacency[centroid];
      const lists = [];
      for (let j = 0; j < branches.length; j += 1) {
        const start = branches[j];
        if (removed[start]) continue;
        const queue = [start], depths = [1];
        parent[start] = centroid;
        for (let i = 0; i < queue.length; i += 1) {
          const v = queue[i];
          const list = adjacency[v];
          for (let t = 0; t < list.length; t += 1) {
            const u = list[t];
            if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(depths[i] + 1); }
          }
        }
        lists.push(depths);
      }
      answer += inRange(sortDepths(lists, true));
      for (let j = 0; j < lists.length; j += 1) answer -= inRange(sortDepths([lists[j]], false));
      removed[centroid] = true;
      for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]);
    }
    return answer;
  }

  // ------------------------------------------------------------------ validity checks for the structures CSES leaves open
  function neighbourSets(n, edges) {
    const out = [];
    for (let v = 0; v <= n; v += 1) out.push(new Set());
    for (let i = 0; i < edges.length; i += 1) { out[edges[i][0]].add(edges[i][1]); out[edges[i][1]].add(edges[i][0]); }
    return out;
  }
  function shapedArrays(actual, names, length) {
    if (!actual || typeof actual !== "object") return "Return { " + names.join(", ") + " }.";
    for (let i = 0; i < names.length; i += 1) {
      const list = actual[names[i]];
      if (!Array.isArray(list) || list.length !== length) return names[i] + " must have " + length + " entries.";
    }
    return true;
  }
  function eulerTourAccept(args, actual) {
    const n = args[0], edges = args[1];
    if (!actual || typeof actual !== "object") return "Return { parent, order, tin, size }.";
    const parent = actual.parent, order = actual.order, tin = actual.tin, size = actual.size;
    if (!Array.isArray(order) || order.length !== n || order[0] !== 1) return "order must list all n nodes in visit order, starting at the root 1.";
    if (!Array.isArray(parent) || parent.length !== n + 1) return "parent must have n + 1 entries (index 0 unused).";
    if (!Array.isArray(tin) || tin.length !== n + 1) return "tin must have n + 1 entries.";
    if (!Array.isArray(size) || size.length !== n + 1) return "size must have n + 1 entries.";
    const seen = new Array(n + 1).fill(false);
    for (let i = 0; i < n; i += 1) {
      const v = order[i];
      if (!Number.isInteger(v) || v < 1 || v > n || seen[v]) return "order must be a permutation of 1..n.";
      seen[v] = true;
      if (tin[v] !== i) return "tin[" + v + "] must be the position of " + v + " in order.";
    }
    if (parent[1] !== 0) return "parent[1] must be 0: node 1 is the root.";
    const neighbours = neighbourSets(n, edges);
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let v = 1; v <= n; v += 1) {
      if (v === 1) continue;
      if (!neighbours[v].has(parent[v])) return "parent[" + v + "] must be a neighbour of " + v + ".";
      if (tin[parent[v]] >= tin[v]) return "A parent must be visited before its children.";
      children[parent[v]].push(v);
    }
    const expected = new Array(n + 1).fill(1);
    for (let i = n - 1; i >= 1; i -= 1) expected[parent[order[i]]] += expected[order[i]];
    for (let v = 1; v <= n; v += 1) if (size[v] !== expected[v]) return "size[" + v + "] should be " + expected[v] + ".";
    for (let v = 1; v <= n; v += 1) {
      const list = children[v].slice().sort((p, q) => tin[p] - tin[q]);
      let at = tin[v] + 1;
      for (let i = 0; i < list.length; i += 1) {
        if (tin[list[i]] !== at) return "The subtree of " + v + " must occupy one unbroken stretch of the tour.";
        at += size[list[i]];
      }
      if (at !== tin[v] + size[v]) return "The subtree of " + v + " must occupy one unbroken stretch of the tour.";
    }
    return true;
  }
  function rootedAncestorsAccept(args, actual) {
    const n = args[0], edges = args[1];
    if (!actual || typeof actual !== "object") return "Return { parent, depth, order, up }.";
    const parent = actual.parent, depth = actual.depth, order = actual.order, up = actual.up;
    if (!Array.isArray(order) || order.length !== n || order[0] !== 1) return "order must list all n nodes with the root 1 first.";
    if (!Array.isArray(parent) || parent.length !== n + 1) return "parent must have n + 1 entries (index 0 unused).";
    if (!Array.isArray(depth) || depth.length !== n + 1) return "depth must have n + 1 entries.";
    let levels = 1;
    while ((1 << levels) <= n) levels += 1;
    if (!Array.isArray(up) || up.length !== levels) return "up needs " + levels + " rows when n = " + n + ".";
    const place = new Array(n + 1).fill(-1);
    for (let i = 0; i < n; i += 1) {
      const v = order[i];
      if (!Number.isInteger(v) || v < 1 || v > n || place[v] !== -1) return "order must be a permutation of 1..n.";
      place[v] = i;
    }
    if (parent[1] !== 0 || depth[1] !== 0) return "The root has parent 0 and depth 0.";
    const neighbours = neighbourSets(n, edges);
    for (let v = 1; v <= n; v += 1) {
      if (v === 1) continue;
      if (!neighbours[v].has(parent[v])) return "parent[" + v + "] must be a neighbour of " + v + ".";
      if (place[parent[v]] >= place[v]) return "A parent must come before its children in order.";
      if (depth[v] !== depth[parent[v]] + 1) return "depth[" + v + "] should be one more than its parent's.";
    }
    for (let j = 0; j < levels; j += 1) {
      if (!Array.isArray(up[j]) || up[j].length !== n + 1) return "Row " + j + " of up must have n + 1 entries.";
      if (up[j][0] !== 0) return "up[j][0] must be 0 so that missing ancestors stay missing.";
    }
    for (let v = 1; v <= n; v += 1) if (up[0][v] !== parent[v]) return "Row 0 of up must be the parents.";
    for (let j = 1; j < levels; j += 1) {
      const row = up[j], previous = up[j - 1];
      for (let v = 1; v <= n; v += 1) if (row[v] !== previous[previous[v]]) return "up[" + j + "][" + v + "] must be row " + (j - 1) + " applied twice.";
    }
    return true;
  }
  function heavyLightAccept(args, actual) {
    const n = args[0], edges = args[1];
    const shape = shapedArrays(actual, ["parent", "depth", "head", "position"], n + 1);
    if (shape !== true) return shape;
    const parent = actual.parent, depth = actual.depth, head = actual.head, position = actual.position;
    const taken = new Array(n).fill(false);
    for (let v = 1; v <= n; v += 1) {
      const p = position[v];
      if (!Number.isInteger(p) || p < 0 || p >= n || taken[p]) return "position must be a permutation of 0..n − 1.";
      taken[p] = true;
    }
    if (parent[1] !== 0 || depth[1] !== 0) return "The root has parent 0 and depth 0.";
    const neighbours = neighbourSets(n, edges);
    const byDepth = [];
    for (let v = 1; v <= n; v += 1) {
      if (v !== 1) {
        if (!neighbours[v].has(parent[v])) return "parent[" + v + "] must be a neighbour of " + v + ".";
        if (depth[v] !== depth[parent[v]] + 1) return "depth[" + v + "] should be one more than its parent's.";
      }
      const d = depth[v];
      if (!Number.isInteger(d) || d < 0 || d >= n) return "depth[" + v + "] is out of range.";
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(v);
    }
    const order = [];
    for (let d = 0; d < byDepth.length; d += 1) if (byDepth[d]) for (let i = 0; i < byDepth[d].length; i += 1) order.push(byDepth[d][i]);
    if (order.length !== n || order[0] !== 1) return "parent and depth must describe the tree rooted at node 1.";
    const size = new Array(n + 1).fill(1);
    for (let i = n - 1; i >= 1; i -= 1) size[parent[order[i]]] += size[order[i]];
    if (size[1] !== n) return "parent must describe one tree rooted at node 1.";
    const children = [];
    for (let v = 0; v <= n; v += 1) children.push([]);
    for (let v = 2; v <= n; v += 1) children[parent[v]].push(v);
    for (let v = 1; v <= n; v += 1) {
      if (head[head[v]] !== head[v]) return "head[head[v]] must equal head[v].";
      if (head[v] !== v) {
        if (head[parent[v]] !== head[v]) return "A chain runs from head[v] down through parents to v.";
        if (position[v] !== position[parent[v]] + 1) return "Positions along one chain must be consecutive.";
      }
      const list = children[v];
      let chainChildren = 0, chainChild = 0, biggest = 0;
      for (let i = 0; i < list.length; i += 1) {
        if (size[list[i]] > biggest) biggest = size[list[i]];
        if (head[list[i]] === head[v]) { chainChildren += 1; chainChild = list[i]; }
      }
      if (list.length === 0) { if (chainChildren !== 0) return "A leaf ends its chain."; continue; }
      if (chainChildren !== 1) return "Every node with children continues its chain into exactly one of them.";
      if (size[chainChild] !== biggest) return "The chain must continue into a child with the largest subtree.";
    }
    return true;
  }
  function findCentroidAccept(args, actual) {
    const n = args[0], edges = args[1];
    if (!Number.isInteger(actual) || actual < 1 || actual > n) return "Return one node number.";
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const limit = Math.floor(n / 2);
    const seen = new Array(n + 1).fill(false);
    seen[actual] = true;
    for (let k = 0; k < adjacency[actual].length; k += 1) {
      const start = adjacency[actual][k];
      if (seen[start]) continue;
      seen[start] = true;
      const queue = [start];
      for (let i = 0; i < queue.length; i += 1) {
        const list = adjacency[queue[i]];
        for (let j = 0; j < list.length; j += 1) if (!seen[list[j]]) { seen[list[j]] = true; queue.push(list[j]); }
      }
      if (queue.length > limit) return "Rooting at " + actual + " leaves a subtree of " + queue.length + " nodes, more than ⌊n/2⌋ = " + limit + ".";
    }
    return true;
  }

  // ------------------------------------------------------------------ brute forces for the stress tests
  function rootedTree(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    const order = [1];
    const seen = new Array(n + 1).fill(false);
    seen[1] = true;
    for (let i = 0; i < order.length; i += 1) {
      const v = order[i];
      for (let k = 0; k < adjacency[v].length; k += 1) {
        const u = adjacency[v][k];
        if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); }
      }
    }
    return { adjacency, parent, order };
  }
  function bfsDistances(n, adjacency, start) {
    const distance = new Array(n + 1).fill(-1);
    distance[start] = 0;
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
      const v = queue[i];
      for (let k = 0; k < adjacency[v].length; k += 1) {
        const u = adjacency[v][k];
        if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); }
      }
    }
    return distance;
  }
  function treeMatchingBrute(n, edges) {
    let best = 0;
    for (let mask = 0; mask < (1 << edges.length); mask += 1) {
      const used = new Array(n + 1).fill(false);
      let ok = true, count = 0;
      for (let i = 0; i < edges.length && ok; i += 1) {
        if (!(mask & (1 << i))) continue;
        const a = edges[i][0], b = edges[i][1];
        if (used[a] || used[b]) ok = false;
        used[a] = true;
        used[b] = true;
        count += 1;
      }
      if (ok && count > best) best = count;
    }
    return best;
  }
  function treeDistancesIIBrute(n, edges) {
    const tree = rootedTree(n, edges);
    const out = [];
    for (let v = 1; v <= n; v += 1) {
      const distance = bfsDistances(n, tree.adjacency, v);
      let total = 0;
      for (let u = 1; u <= n; u += 1) total += distance[u];
      out.push(total);
    }
    return out;
  }
  function distanceQueriesBrute(n, edges, queries) {
    const tree = rootedTree(n, edges);
    return queries.map((query) => bfsDistances(n, tree.adjacency, query[0])[query[1]]);
  }
  function pathNodes(n, edges, a, b) {
    const tree = rootedTree(n, edges);
    const depth = bfsDistances(n, tree.adjacency, 1);
    let x = a, y = b;
    const left = [], right = [];
    while (depth[x] > depth[y]) { left.push(x); x = tree.parent[x]; }
    while (depth[y] > depth[x]) { right.push(y); y = tree.parent[y]; }
    while (x !== y) { left.push(x); right.push(y); x = tree.parent[x]; y = tree.parent[y]; }
    return left.concat([x], right.reverse());
  }
  function countingPathsBrute(n, edges, paths) {
    const out = new Array(n).fill(0);
    for (let i = 0; i < paths.length; i += 1) {
      const nodes = pathNodes(n, edges, paths[i][0], paths[i][1]);
      for (let k = 0; k < nodes.length; k += 1) out[nodes[k] - 1] += 1;
    }
    return out;
  }
  function subtreeOf(n, edges, root) {
    const tree = rootedTree(n, edges);
    const inside = [root];
    const seen = new Array(n + 1).fill(false);
    seen[root] = true;
    for (let i = 0; i < inside.length; i += 1) {
      const v = inside[i];
      for (let k = 0; k < tree.adjacency[v].length; k += 1) {
        const u = tree.adjacency[v][k];
        if (!seen[u] && u !== tree.parent[v]) { seen[u] = true; inside.push(u); }
      }
    }
    return inside;
  }
  function subtreeQueriesBrute(values, edges, ops) {
    const n = values.length;
    const current = values.slice();
    const out = [];
    for (let i = 0; i < ops.length; i += 1) {
      const s = ops[i][1];
      if (ops[i][0] === 1) current[s - 1] = ops[i][2];
      else {
        const inside = subtreeOf(n, edges, s);
        let total = 0;
        for (let k = 0; k < inside.length; k += 1) total += current[inside[k] - 1];
        out.push(total);
      }
    }
    return out;
  }
  function pathQueriesBrute(values, edges, ops) {
    const n = values.length;
    const tree = rootedTree(n, edges);
    const current = values.slice();
    const out = [];
    for (let i = 0; i < ops.length; i += 1) {
      const s = ops[i][1];
      if (ops[i][0] === 1) current[s - 1] = ops[i][2];
      else {
        let total = 0;
        for (let v = s; v !== 0; v = tree.parent[v]) total += current[v - 1];
        out.push(total);
      }
    }
    return out;
  }
  function pathQueriesIIBrute(values, edges, ops) {
    const n = values.length;
    const current = values.slice();
    const out = [];
    for (let i = 0; i < ops.length; i += 1) {
      if (ops[i][0] === 1) { current[ops[i][1] - 1] = ops[i][2]; continue; }
      const nodes = pathNodes(n, edges, ops[i][1], ops[i][2]);
      let best = 0;
      for (let k = 0; k < nodes.length; k += 1) best = Math.max(best, current[nodes[k] - 1]);
      out.push(best);
    }
    return out;
  }
  function distinctColorsBrute(colors, edges) {
    const n = colors.length;
    const out = [];
    for (let v = 1; v <= n; v += 1) {
      const inside = subtreeOf(n, edges, v);
      const seen = new Set();
      for (let k = 0; k < inside.length; k += 1) seen.add(colors[inside[k] - 1]);
      out.push(seen.size);
    }
    return out;
  }
  function pathLengthCounts(n, edges) {
    const tree = rootedTree(n, edges);
    const counts = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) {
      const distance = bfsDistances(n, tree.adjacency, v);
      for (let u = v + 1; u <= n; u += 1) counts[distance[u]] += 1;
    }
    return counts;
  }
  function fixedLengthPathsIBrute(n, k, edges) { return pathLengthCounts(n, edges)[k] || 0; }
  function fixedLengthPathsIIBrute(n, k1, k2, edges) {
    const counts = pathLengthCounts(n, edges);
    let total = 0;
    for (let d = k1; d <= k2 && d < counts.length; d += 1) total += counts[d];
    return total;
  }
  function treeLcaBrute(table, a, b) {
    const seen = new Set();
    for (let v = a; v !== 0; v = table.parent[v]) seen.add(v);
    for (let v = b; v !== 0; v = table.parent[v]) if (seen.has(v)) return v;
    return 0;
  }

  // ------------------------------------------------------------------ generators
  function randomTreeEdges(seed, n, chain) {
    const bosses = randomTreeBosses(seed, n, chain || 0);
    const label = randomPermutation(seed + 7919, n);
    const next = rng(seed + 104729);
    const edges = [];
    for (let v = 2; v <= n; v += 1) {
      const a = label[bosses[v - 2] - 1], b = label[v - 1];
      edges.push(next() < 0.5 ? [a, b] : [b, a]);
    }
    return edges;
  }
  function randomPairs(seed, count, n) {
    const a = randomInts(seed, count, 1, n), b = randomInts(seed + 1, count, 1, n);
    return a.map((v, i) => [v, b[i]]);
  }
  function smallPairs(seed, count, n) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) out.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]);
    return out;
  }
  function valueOps(seed, count, n, hi, queryKind) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      if (next() < 0.4) out.push([1, 1 + Math.floor(next() * n), 1 + Math.floor(next() * hi)]);
      else if (queryKind === "pair") out.push([2, 1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]);
      else out.push([2, 1 + Math.floor(next() * n)]);
    }
    if (!out.some((op) => op[0] === 2)) out.push(queryKind === "pair" ? [2, 1, n] : [2, 1]);
    return out;
  }

  const TREE_BIG_BOSSES = lazy(() => randomTreeBosses(51, BIG, 1000));
  const TREE_BIG_EDGES = lazy(() => edgesFromBosses(TREE_BIG_BOSSES()));
  const DEEP_BOSSES = lazy(() => randomTreeBosses(52, 50000, 25000));
  const LCA_QUERIES_BIG = lazy(() => (() => { const a = randomInts(53, BIG, 1, 50000), b = randomInts(54, BIG, 1, 50000); return a.map((v, i) => [v, b[i]]); })());
  const SHUFFLED_BIG = lazy(() => randomTreeEdges(55, BIG, 1000));
  const SHUFFLED_MID = lazy(() => randomTreeEdges(56, 100000, 500));
  const SHUFFLED_SMALL = lazy(() => randomTreeEdges(57, 50000, 300));
  const DEEP_EDGES = lazy(() => randomTreeEdges(58, 100000, 60000));
  const PAIRS_BIG = lazy(() => randomPairs(59, BIG, BIG));
  const PAIRS_MID = lazy(() => randomPairs(61, 100000, 100000));
  const VALUES_BIG = lazy(() => randomInts(63, BIG, 1, 1000000000));
  const VALUES_MID = lazy(() => randomInts(64, 100000, 1, 1000000000));
  const COLORS_MID = lazy(() => randomInts(69, 100000, 1, 1000000000));
  const SUBTREE_OPS_MID = lazy(() => valueOps(70, 100000, 100000, 1000000000, "single"));
  const PATH_OPS_MID = lazy(() => valueOps(71, 100000, 100000, 1000000000, "single"));
  const PATH_II_OPS_MID = lazy(() => valueOps(72, 100000, 100000, 1000000000, "pair"));
  const COLORS_BIG = lazy(() => randomInts(65, BIG, 1, 1000000000));
  const SUBTREE_OPS_BIG = lazy(() => valueOps(66, BIG, BIG, 1000000000, "single"));
  const PATH_OPS_BIG = lazy(() => valueOps(67, BIG, BIG, 1000000000, "single"));
  const PATH_II_OPS_BIG = lazy(() => valueOps(68, BIG, 100000, 1000000000, "pair"));

  const SAMPLE_EDGES = [[1, 2], [1, 3], [3, 4], [3, 5]];
  const CHAIN_EDGES = [[1, 2], [2, 3], [3, 4], [4, 5]];
  const STAR_EDGES = [[1, 2], [1, 3], [1, 4], [1, 5]];
  const DEEP_LCA_EDGES = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [7, 8], [8, 9], [9, 10], [10, 11]];
  const sampleTable = () => rootedAncestors(5, SAMPLE_EDGES);
  const deepTable = () => rootedAncestors(11, DEEP_LCA_EDGES);

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
      id: "tree-matching", title: "Tree Matching", cses: { id: 1130, name: "Tree Matching" },
      goal: "Largest number of edges that can be chosen so that no node is an endpoint of two of them.",
      concept: "Greedy from the leaves up: walk the nodes in reverse breadth-first order, so children come before parents. If a node is still free and its parent is still free, matching them is never a mistake, because the only edge that node could ever use instead is the one to its parent.",
      functionName: "treeMatching", signature: "treeMatching(n, edges) → number",
      starterSource: starter("treeMatching", "n, edges", "BFS from 1 recording parent[] and the visit order; then walk the order backwards matching a free node with its free parent."),
      solve: treeMatching, comparator: "scalar", brute: treeMatchingBrute, small: (round) => { const n = 1 + (round % 8); return [n, randomTreeEdges(1000 + round, n, round % 3)]; },
      reference: book("14.1", "Tree traversal · greedy from the leaves"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("greedy-from-the-root", "Matching from the root downwards is not optimal: on a path of four nodes it takes the middle edge and stops at one, when two fit.", function treeMatching(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } } } const matched = new Array(n + 1).fill(false); let count = 0; for (let i = 1; i < order.length; i += 1) { const v = order[i]; if (!matched[v] && !matched[parent[v]]) { matched[v] = true; matched[parent[v]] = true; count += 1; } } return count; }),
        diagnosis("counts-nodes", "The answer counts edges in the matching, not the nodes they cover.", function treeMatching(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } } } const matched = new Array(n + 1).fill(false); let count = 0; for (let i = order.length - 1; i >= 1; i -= 1) { const v = order[i]; if (!matched[v] && !matched[parent[v]]) { matched[v] = true; matched[parent[v]] = true; count += 2; } } return count; }),
      ],
      hints: ["BFS from node 1 storing parent[u] and pushing nodes into an order array.", "Walk that array from the last node back to index 1, so every node is seen before its parent.", "If neither the node nor its parent is matched yet, mark both matched and add one to the count."],
      cases: [
        example([5, SAMPLE_EDGES], 2, "CSES sample"),
        example([1, []], 0, "one node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], 2, "path of four"),
        example([5, STAR_EDGES], 1, "star"),
        hidden("n = 200 000, time limit", () => [BIG, SHUFFLED_BIG()]),
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
      id: "tree-distances-ii", title: "Tree Distances II", cses: { id: 1133, name: "Tree Distances II" },
      goal: "For every node, the sum of the distances from it to all other nodes.",
      concept: "Root the tree and compute, for each node, its subtree size and the sum of distances inside its subtree. Then reroot downwards: stepping from a parent to a child, the child's subtree gets one step closer and everything else one step further, so answer(child) = answer(parent) − size(child) + (n − size(child)).",
      functionName: "treeDistancesII", signature: "treeDistancesII(n, edges) → array (index i is node i + 1)",
      starterSource: starter("treeDistancesII", "n, edges", "BFS order from 1; backwards pass for size[] and inside[]; answer[1] = inside[1]; forwards pass for the rest."),
      solve: treeDistancesII, comparator: "deep", brute: treeDistancesIIBrute, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(1100 + round, n, round % 4)]; },
      reference: book("14.3", "All longest paths · rerooting"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("subtree-only", "inside[v] only counts the nodes below v; every node outside the subtree contributes too.", function treeDistancesII(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } } } const size = new Array(n + 1).fill(1); const inside = new Array(n + 1).fill(0); for (let i = order.length - 1; i >= 1; i -= 1) { const v = order[i]; size[parent[v]] += size[v]; inside[parent[v]] += inside[v] + size[v]; } return inside.slice(1); }),
        diagnosis("reroot-sign", "Moving to a child brings its size(child) nodes one step closer and pushes the other n − size(child) one step away; the two terms have opposite signs.", function treeDistancesII(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } } } const size = new Array(n + 1).fill(1); const inside = new Array(n + 1).fill(0); for (let i = order.length - 1; i >= 1; i -= 1) { const v = order[i]; size[parent[v]] += size[v]; inside[parent[v]] += inside[v] + size[v]; } const answer = new Array(n + 1).fill(0); answer[1] = inside[1]; for (let i = 1; i < order.length; i += 1) { const v = order[i]; answer[v] = answer[parent[v]] + size[v] + (n - size[v]); } return answer.slice(1); }),
      ],
      hints: ["BFS from 1 for parent[] and the visit order; size[v] and inside[v] = Σ over children (inside[child] + size[child]) accumulate on the backwards pass.", "answer[1] = inside[1].", "Forwards pass: answer[v] = answer[parent[v]] − size[v] + (n − size[v])."],
      cases: [
        example([5, SAMPLE_EDGES], [6, 9, 5, 8, 8], "CSES sample"),
        example([1, []], [0], "single node"),
        example([4, [[1, 2], [2, 3], [3, 4]]], [6, 4, 4, 6], "path of four"),
        example([5, STAR_EDGES], [4, 7, 7, 7, 7], "star"),
        hidden("n = 200 000, time limit", () => [BIG, SHUFFLED_BIG()]),
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
    {
      id: "rooted-ancestors", title: "Rooted Ancestors", cses: { id: 1135, name: "Distance Queries (brick)" },
      goal: "Root an edge-list tree at node 1 and return { parent, depth, order, up }: the parent and depth of every node, a visit order in which parents come before their children, and the binary lifting table with the smallest number of rows that covers n. Any such order is accepted.",
      concept: "Company Queries hands you the parents directly. A tree given as an edge list has to be rooted first: one traversal from node 1 fixes the parent and depth of every node, and then the lifting table is built exactly as before.",
      functionName: "rootedAncestors", signature: "rootedAncestors(n, edges) → { parent, depth, order, up }",
      starterSource: starter("rootedAncestors", "n, edges", "Adjacency lists; BFS from 1 filling parent[], depth[] and order; levels = smallest with 2^levels > n; up[0] = parent; up[j][v] = up[j−1][up[j−1][v]]."),
      solve: rootedAncestors, comparator: "deep", accept: rootedAncestorsAccept, check: (args, out) => rootedAncestorsAccept(args, out) === true, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(1200 + round, n, round % 4)]; },
      reference: book("18.1", "Finding ancestors · rooting an edge list"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("root-has-a-parent", "The root has no parent: parent[1] and depth[1] are 0, and up[j][0] must stay 0 so missing ancestors stay missing.", function rootedAncestors(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const depth = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; parent[1] = 1; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); } } } let levels = 1; while ((1 << levels) <= n) levels += 1; const up = [parent.slice()]; for (let j = 1; j < levels; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return { parent, depth, order, up }; }),
        diagnosis("too-few-levels", "The table needs enough rows to jump past the deepest node: the smallest levels with 2^levels > n.", function rootedAncestors(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const depth = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); } } } let levels = 1; while ((1 << levels) < n) levels += 1; const up = [parent.slice()]; for (let j = 1; j < levels; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return { parent, depth, order, up }; }),
      ],
      hints: ["Build adjacency lists from the edges, then BFS from node 1: when u is first reached from v, parent[u] = v and depth[u] = depth[v] + 1, and u joins the order.", "levels: start at 1 and raise it while 2^levels ≤ n.", "up[0] is a copy of parent; each later row is the previous row applied twice. Index 0 stays 0 everywhere."],
      cases: [
        run(rootedAncestors, [5, SAMPLE_EDGES], "CSES sample"),
        run(rootedAncestors, [1, []], "single node"),
        run(rootedAncestors, [5, CHAIN_EDGES], "chain"),
        run(rootedAncestors, [5, STAR_EDGES], "star"),
        run(rootedAncestors, [4, [[1, 2], [2, 3], [3, 4]]], "n = 4 needs three rows, not two"),
        hidden("n = 50 000, time limit", () => [50000, SHUFFLED_SMALL()]),
      ],
    },
    {
      id: "tree-lca", title: "Lowest Common Ancestor", cses: { id: 1135, name: "Distance Queries (brick)" },
      goal: "The deepest node that is an ancestor of both a and b (a node counts as its own ancestor), using a table from Rooted Ancestors.",
      concept: "Same two moves as Company Queries II, now on an edge-list tree: lift the deeper node until the depths match, and if that already lands on the other node it is the answer. Otherwise jump both up by every power of two that keeps them apart, so they stop just below the meeting point.",
      functionName: "treeLca", signature: "treeLca(table, a, b) → node",
      starterSource: starter("treeLca", "table, a, b", "table is { parent, depth, order, up }. Equalise depths with the bits of the difference, then descend the rows from the top."),
      solve: treeLca, comparator: "scalar", brute: treeLcaBrute, small: (round) => { const n = 2 + (round % 9); const edges = randomTreeEdges(1300 + round, n, round % 4); const next = rng(1400 + round); return [rootedAncestors(n, edges), 1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]; },
      reference: book("18.3", "Lowest common ancestor"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset([
        { id: "a", type: "slider", label: "node a (rounded)", value: 4, min: 1, max: 5 },
        { id: "b", type: "slider", label: "node b (rounded)", value: 5, min: 1, max: 5 },
      ]), args: [{ fixture: "ancestorTable" }, { fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("no-ancestor-case", "When the shallower node is itself an ancestor of the deeper one, lifting already lands on it and that is the answer; the descent would walk past it.", function treeLca(table, a, b) { const depth = table.depth, up = table.up; let x = a, y = b; if (depth[x] < depth[y]) { const swap = x; x = y; y = swap; } let diff = depth[x] - depth[y]; for (let j = 0; diff > 0; j += 1) { if (diff & 1) x = up[j][x]; diff >>= 1; } for (let j = up.length - 1; j >= 0; j -= 1) { if (up[j][x] !== up[j][y]) { x = up[j][x]; y = up[j][y]; } } return up[0][x]; }),
        diagnosis("descends-upwards", "The descent has to run from the widest jump to the narrowest; from the bottom up it jumps past the meeting point.", function treeLca(table, a, b) { const depth = table.depth, up = table.up; let x = a, y = b; if (depth[x] < depth[y]) { const swap = x; x = y; y = swap; } let diff = depth[x] - depth[y]; for (let j = 0; diff > 0; j += 1) { if (diff & 1) x = up[j][x]; diff >>= 1; } if (x === y) return x; for (let j = 0; j < up.length; j += 1) { if (up[j][x] !== up[j][y]) { x = up[j][x]; y = up[j][y]; } } return up[0][x]; }),
      ],
      hints: ["Swap so that x is the deeper node; diff = depth[x] − depth[y].", "Walk the bits of diff from the lowest: a set bit means x = up[j][x]. If x === y now, return it.", "For j from up.length − 1 down to 0: if up[j][x] !== up[j][y], move both. Finally return up[0][x]."],
      cases: [
        example([sampleTable(), 4, 5], 3, "siblings under 3"),
        example([sampleTable(), 2, 5], 1, "across the root"),
        example([sampleTable(), 3, 4], 3, "one is the ancestor"),
        example([sampleTable(), 5, 5], 5, "the same node twice"),
        example([deepTable(), 6, 11], 1, "two long branches: the jumps must shrink"),
      ],
    },
    {
      id: "distance-queries", title: "Distance Queries", cses: { id: 1135, name: "Distance Queries" },
      goal: "For each query pair, the number of edges between the two nodes.",
      concept: "Root the tree once. The path from a to b climbs to their lowest common ancestor and comes back down, so its length is depth(a) + depth(b) − 2 · depth(lca(a, b)).",
      functionName: "distanceQueries", signature: "distanceQueries(n, edges, queries) → answers",
      starterSource: starter("distanceQueries", "n, edges, queries", "table = rootedAncestors(n, edges); per query use treeLca and the depths."),
      solve: distanceQueries, comparator: "deep", dependencies: ["rooted-ancestors", "tree-lca"], brute: distanceQueriesBrute, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(1500 + round, n, round % 4), smallPairs(1600 + round, 4, n)]; },
      reference: book("18.3", "Lowest common ancestor · distances"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES, c: [[1, 3], [2, 5], [1, 4]] }, chain: { a: 5, b: CHAIN_EDGES, c: [[1, 5], [2, 4]] }, star: { a: 5, b: STAR_EDGES, c: [[2, 3], [1, 4]] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("depths-added", "Adding the two depths counts the stretch above the meeting point twice; subtract 2 · depth(lca).", function distanceQueries(n, edges, queries) { const table = rootedAncestors(n, edges); const answers = []; for (let i = 0; i < queries.length; i += 1) answers.push(table.depth[queries[i][0]] + table.depth[queries[i][1]]); return answers; }),
        diagnosis("one-lca-depth", "Both halves of the path avoid the part above the meeting point, so its depth comes off twice, not once.", function distanceQueries(n, edges, queries) { const table = rootedAncestors(n, edges); const answers = []; for (let i = 0; i < queries.length; i += 1) { const a = queries[i][0], b = queries[i][1]; answers.push(table.depth[a] + table.depth[b] - table.depth[treeLca(table, a, b)]); } return answers; }),
      ],
      hints: ["Build the table once, outside the query loop.", "For each pair: top = treeLca(table, a, b).", "Distance = depth[a] + depth[b] − 2 · depth[top]."],
      cases: [
        example([5, SAMPLE_EDGES, [[1, 3], [2, 5], [1, 4]]], [1, 3, 2], "CSES sample"),
        example([1, [], [[1, 1]]], [0], "single node"),
        example([5, CHAIN_EDGES, [[1, 5], [2, 4], [3, 3]]], [4, 2, 0], "chain"),
        hidden("n = q = 100 000, time limit", () => [100000, SHUFFLED_MID(), PAIRS_MID()]),
      ],
    },
    {
      id: "counting-paths", title: "Counting Paths", cses: { id: 1136, name: "Counting Paths" },
      goal: "Given m paths in the tree, report for every node how many of them pass through it.",
      concept: "Marking every node of every path is too slow. Instead add +1 at each endpoint, −1 at their meeting point and −1 at the node above it; then every node's answer is the sum of those marks over its own subtree. One backwards pass over a rooted order collects all of them.",
      functionName: "countingPaths", signature: "countingPaths(n, edges, paths) → array (index i is node i + 1)",
      starterSource: starter("countingPaths", "n, edges, paths", "table = rootedAncestors(n, edges); per path: diff[a]++, diff[b]++, diff[top]--, diff[parent[top]]-- when it exists; then accumulate children into parents."),
      solve: countingPaths, comparator: "deep", dependencies: ["rooted-ancestors", "tree-lca"], brute: countingPathsBrute, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(1700 + round, n, round % 4), smallPairs(1800 + round, 1 + (round % 5), n)]; },
      reference: book("18.2", "Subtrees and paths · path sums"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES, c: [[1, 3], [2, 5], [1, 4]] }, chain: { a: 5, b: CHAIN_EDGES, c: [[1, 5], [2, 4]] }, star: { a: 5, b: STAR_EDGES, c: [[2, 3]] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("meeting-point-once", "The two +1 marks both travel up through the meeting point, so it needs −1 there and another −1 just above it.", function countingPaths(n, edges, paths) { const table = rootedAncestors(n, edges); const diff = new Array(n + 1).fill(0); for (let i = 0; i < paths.length; i += 1) { const a = paths[i][0], b = paths[i][1]; const top = treeLca(table, a, b); diff[a] += 1; diff[b] += 1; diff[top] -= 2; } const order = table.order; for (let i = order.length - 1; i >= 1; i -= 1) diff[table.parent[order[i]]] += diff[order[i]]; return diff.slice(1); }),
        diagnosis("endpoints-only", "The marks have to be summed over each subtree; on their own they only count paths that end at the node.", function countingPaths(n, edges, paths) { const table = rootedAncestors(n, edges); const diff = new Array(n + 1).fill(0); for (let i = 0; i < paths.length; i += 1) { const a = paths[i][0], b = paths[i][1]; const top = treeLca(table, a, b); diff[a] += 1; diff[b] += 1; diff[top] -= 1; if (table.parent[top] !== 0) diff[table.parent[top]] -= 1; } return diff.slice(1); }),
      ],
      hints: ["top = treeLca(table, a, b) for each path.", "diff[a] += 1; diff[b] += 1; diff[top] -= 1; and diff[parent[top]] -= 1 when top is not the root.", "Walk table.order backwards adding diff[v] into diff[parent[v]]; the answer for v is diff[v]."],
      cases: [
        example([5, SAMPLE_EDGES, [[1, 3], [2, 5], [1, 4]]], [3, 1, 3, 1, 1], "CSES sample"),
        example([1, [], [[1, 1]]], [1], "single node"),
        example([5, CHAIN_EDGES, [[1, 5]]], [1, 1, 1, 1, 1], "one path along a chain"),
        example([5, SAMPLE_EDGES, [[4, 5], [4, 5]]], [0, 0, 2, 2, 2], "the same path twice"),
        hidden("n = m = 100 000, time limit", () => [100000, SHUFFLED_MID(), PAIRS_MID()]),
      ],
    },
    {
      id: "euler-tour", title: "Tree Traversal Array", cses: { id: 1137, name: "Subtree Queries (brick)" },
      goal: "Flatten the tree rooted at node 1 into an array: return { parent, order, tin, size } where order is a depth-first visit order, tin[v] is the position of v in it and size[v] is the number of nodes in v's subtree. Any depth-first order is accepted.",
      concept: "A depth-first walk visits a whole subtree before it leaves it, so every subtree lands on one unbroken stretch of the array: positions tin[v] to tin[v] + size[v] − 1. That turns every subtree question into a range question over an ordinary array.",
      functionName: "eulerTour", signature: "eulerTour(n, edges) → { parent, order, tin, size }",
      starterSource: starter("eulerTour", "n, edges", "Depth-first from 1 with an explicit stack and a pointer per node; record parent and tin on the way down, add size into the parent on the way back up."),
      solve: eulerTour, comparator: "deep", accept: eulerTourAccept, check: (args, out) => eulerTourAccept(args, out) === true, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(1900 + round, n, round % 4)]; },
      reference: book("18.2", "Subtrees and paths · the tree traversal array"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("breadth-first", "A breadth-first order breaks subtrees apart: node 1's children are listed before any grandchild, so a subtree is no longer one stretch.", function eulerTour(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const tin = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(1); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; tin[u] = order.length; order.push(u); } } } for (let i = order.length - 1; i >= 1; i -= 1) size[parent[order[i]]] += size[order[i]]; return { parent, order, tin, size }; }),
        diagnosis("size-one", "size[v] counts the whole subtree, so each child's size has to be added into its parent once the child is finished.", function eulerTour(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const tin = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(1); const pointer = new Array(n + 1).fill(0); const order = [1]; const stack = [1]; while (stack.length) { const v = stack[stack.length - 1]; const list = adjacency[v]; if (pointer[v] < list.length) { const u = list[pointer[v]]; pointer[v] += 1; if (u === parent[v]) continue; parent[u] = v; tin[u] = order.length; order.push(u); stack.push(u); } else stack.pop(); } return { parent, order, tin, size }; }),
      ],
      hints: ["Adjacency lists, a stack holding the current path, and pointer[v] counting how many of v's neighbours have been tried.", "Taking neighbour u (not the parent): set parent[u], tin[u] = order.length, push u onto order and onto the stack.", "When pointer[v] runs out, pop v and add size[v] into size[parent[v]]."],
      cases: [
        run(eulerTour, [5, SAMPLE_EDGES], "CSES sample"),
        run(eulerTour, [1, []], "single node"),
        run(eulerTour, [5, CHAIN_EDGES], "chain"),
        run(eulerTour, [5, STAR_EDGES], "star"),
        hidden("n = 100 000, time limit", () => [100000, SHUFFLED_MID()]),
      ],
    },
    {
      id: "subtree-queries", title: "Subtree Queries", cses: { id: 1137, name: "Subtree Queries" },
      goal: "Process [1, s, x] (node s now holds x) and [2, s] (sum of the values in s's subtree) on a tree rooted at node 1; return the sums.",
      concept: "Lay the values out in tour order. A subtree is then the range tin[s] .. tin[s] + size[s] − 1, so a Fenwick tree over the tour answers both operations: a point change at tin[s] and a range sum.",
      functionName: "subtreeQueries", signature: "subtreeQueries(values, edges, ops) → answers",
      starterSource: starter("subtreeQueries", "values, edges, ops", "tour = eulerTour(values.length, edges); Fenwick over 1..n with value[v] at tin[v] + 1; a query is prefix(tin[s] + size[s]) − prefix(tin[s])."),
      solve: subtreeQueries, comparator: "deep", dependencies: ["euler-tour", "fenwick-add", "fenwick-prefix"], brute: subtreeQueriesBrute, small: (round) => { const n = 1 + (round % 8); return [randomInts(2000 + round, n, 1, 9), randomTreeEdges(2100 + round, n, round % 4), valueOps(2200 + round, 5, n, 9, "single")]; },
      reference: book("18.2", "Subtrees and paths · subtree queries"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES, c: [[2, 3], [1, 5, 3], [2, 3]], d: [4, 2, 5, 2, 1] }, chain: { a: 5, b: CHAIN_EDGES, c: [[2, 1], [1, 3, 9], [2, 2]], d: [1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetD" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("adds-the-new-value", "An update replaces the old value, so the Fenwick tree receives the difference x − old, not x itself.", function subtreeQueries(values, edges, ops) { const n = values.length; const tour = eulerTour(n, edges); const tree = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) fenwickAdd(tree, tour.tin[v] + 1, values[v - 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { const s = ops[i][1]; if (ops[i][0] === 1) fenwickAdd(tree, tour.tin[s] + 1, ops[i][2]); else answers.push(fenwickPrefix(tree, tour.tin[s] + tour.size[s]) - fenwickPrefix(tree, tour.tin[s])); } return answers; }),
        diagnosis("excludes-the-root", "The subtree of s includes s itself: the range starts at tin[s], so subtract the prefix up to tin[s], not up to tin[s] + 1.", function subtreeQueries(values, edges, ops) { const n = values.length; const tour = eulerTour(n, edges); const tree = new Array(n + 1).fill(0); const current = values.slice(); for (let v = 1; v <= n; v += 1) fenwickAdd(tree, tour.tin[v] + 1, values[v - 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { const s = ops[i][1]; if (ops[i][0] === 1) { fenwickAdd(tree, tour.tin[s] + 1, ops[i][2] - current[s - 1]); current[s - 1] = ops[i][2]; } else answers.push(fenwickPrefix(tree, tour.tin[s] + tour.size[s]) - fenwickPrefix(tree, tour.tin[s] + 1)); } return answers; }),
      ],
      hints: ["Build the tour once, then add each value at position tin[v] + 1 of a Fenwick tree (Fenwick indices start at 1).", "Keep a copy of the current values so an update can add the difference x − current.", "Subtree sum of s = fenwickPrefix(tree, tin[s] + size[s]) − fenwickPrefix(tree, tin[s])."],
      cases: [
        example([[4, 2, 5, 2, 1], SAMPLE_EDGES, [[2, 3], [1, 5, 3], [2, 3]]], [8, 10], "CSES sample"),
        example([[1, 1, 1, 1, 1], SAMPLE_EDGES, [[2, 1]]], [5], "whole tree"),
        example([[7], [], [[2, 1], [1, 1, 3], [2, 1]]], [7, 3], "single node"),
        example([[1, 1, 1, 1, 1], CHAIN_EDGES, [[2, 5], [1, 5, 4], [2, 4]]], [1, 5], "chain"),
        hidden("n = q = 100 000, time limit", () => [VALUES_MID(), SHUFFLED_MID(), SUBTREE_OPS_MID()]),
      ],
    },
    {
      id: "path-queries", title: "Path Queries", cses: { id: 1138, name: "Path Queries" },
      goal: "Process [1, s, x] (node s now holds x) and [2, s] (sum of the values from the root down to s); return the sums.",
      concept: "Turn it around: node v's value belongs to the answer of every node in v's subtree. So a value change is a range change over the tour and a query is a single position, the mirror image of Subtree Queries. A Fenwick tree of differences does range-add and point-read.",
      functionName: "pathQueries", signature: "pathQueries(values, edges, ops) → answers",
      starterSource: starter("pathQueries", "values, edges, ops", "tour = eulerTour(values.length, edges); spread(v, d) = fenwickAdd at tin[v] + 1 and −d at tin[v] + size[v] + 1; a query reads fenwickPrefix(tree, tin[s] + 1)."),
      solve: pathQueries, comparator: "deep", dependencies: ["euler-tour", "fenwick-add", "fenwick-prefix"], brute: pathQueriesBrute, small: (round) => { const n = 1 + (round % 8); return [randomInts(2300 + round, n, 1, 9), randomTreeEdges(2400 + round, n, round % 4), valueOps(2500 + round, 5, n, 9, "single")]; },
      reference: book("18.2", "Subtrees and paths · path queries"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES, c: [[2, 4], [1, 3, 2], [2, 4]], d: [4, 2, 5, 2, 1] }, chain: { a: 5, b: CHAIN_EDGES, c: [[2, 5], [1, 1, 9], [2, 5]], d: [1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetD" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("point-not-range", "A node's value reaches every node below it, so it must be added across the whole subtree range, not at one position.", function pathQueries(values, edges, ops) { const n = values.length; const tour = eulerTour(n, edges); const tree = new Array(n + 2).fill(0); const current = values.slice(); for (let v = 1; v <= n; v += 1) fenwickAdd(tree, tour.tin[v] + 1, values[v - 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { const s = ops[i][1]; if (ops[i][0] === 1) { fenwickAdd(tree, tour.tin[s] + 1, ops[i][2] - current[s - 1]); current[s - 1] = ops[i][2]; } else answers.push(fenwickPrefix(tree, tour.tin[s] + 1)); } return answers; }),
        diagnosis("no-closing-mark", "A range add needs the closing −delta one place past the subtree, or the value leaks into everything that follows it in the tour.", function pathQueries(values, edges, ops) { const n = values.length; const tour = eulerTour(n, edges); const tree = new Array(n + 2).fill(0); const current = values.slice(); const spread = (v, delta) => { fenwickAdd(tree, tour.tin[v] + 1, delta); }; for (let v = 1; v <= n; v += 1) spread(v, values[v - 1]); const answers = []; for (let i = 0; i < ops.length; i += 1) { const s = ops[i][1]; if (ops[i][0] === 1) { spread(s, ops[i][2] - current[s - 1]); current[s - 1] = ops[i][2]; } else answers.push(fenwickPrefix(tree, tour.tin[s] + 1)); } return answers; }),
      ],
      hints: ["The Fenwick tree holds differences, so it needs n + 2 entries: the closing mark can sit at position n + 1.", "spread(v, delta): fenwickAdd(tree, tin[v] + 1, delta) and fenwickAdd(tree, tin[v] + size[v] + 1, −delta).", "Seed with spread(v, values[v − 1]) for every node; a query is fenwickPrefix(tree, tin[s] + 1)."],
      cases: [
        example([[4, 2, 5, 2, 1], SAMPLE_EDGES, [[2, 4], [1, 3, 2], [2, 4]]], [11, 8], "CSES sample"),
        example([[1, 1, 1, 1, 1], CHAIN_EDGES, [[2, 5], [1, 1, 9], [2, 5]]], [5, 13], "chain"),
        example([[7], [], [[2, 1], [1, 1, 3], [2, 1]]], [7, 3], "single node"),
        example([[1, 1, 1, 1, 1], SAMPLE_EDGES, [[2, 1], [2, 2]]], [1, 2], "root and a child"),
        hidden("n = q = 100 000, time limit", () => [VALUES_MID(), SHUFFLED_MID(), PATH_OPS_MID()]),
      ],
    },
    {
      id: "heavy-light-decomposition", title: "Heavy Path Decomposition", cses: { id: 2134, name: "Path Queries II (brick)" },
      goal: "Cut the tree rooted at 1 into downward chains and lay them out: return { parent, depth, head, position } where each node's chain continues into a child with the largest subtree, head[v] is the top of v's chain, and one chain occupies consecutive positions. Any choice among tied children is accepted.",
      concept: "Send each node's chain into its biggest child. Every time a walk to the root leaves a chain, the subtree it enters is more than twice as large, so no root path crosses more than log₂ n chains. Numbering each chain consecutively makes any path a handful of ranges over one array.",
      functionName: "heavyLight", signature: "heavyLight(n, edges) → { parent, depth, head, position }",
      starterSource: starter("heavyLight", "n, edges", "BFS from 1 for parent/depth/order; backwards pass for size[] and heavy[]; then walk chains from each head assigning consecutive positions, pushing the light children as new heads."),
      solve: heavyLight, comparator: "deep", accept: heavyLightAccept, check: (args, out) => heavyLightAccept(args, out) === true, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(2600 + round, n, round % 4)]; },
      reference: book("18.2", "Subtrees and paths · path decomposition"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 4], [2, 5]] }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("first-child-is-heavy", "The chain has to follow a child with the largest subtree; following the first child listed leaves long paths crossing many chains.", function heavyLight(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const depth = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); } } } const heavy = new Array(n + 1).fill(0); for (let i = 1; i < order.length; i += 1) { const v = order[i]; if (heavy[parent[v]] === 0) heavy[parent[v]] = v; } const head = new Array(n + 1).fill(0); const position = new Array(n + 1).fill(0); let counter = 0; const stack = [1]; while (stack.length) { const top = stack.pop(); for (let v = top; v !== 0; v = heavy[v]) { head[v] = top; position[v] = counter; counter += 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (u !== parent[v] && u !== heavy[v]) stack.push(u); } } } return { parent, depth, head, position }; }),
        diagnosis("positions-by-node-number", "Numbering the nodes 1, 2, 3, … breaks the chains apart; the positions along one chain must be consecutive.", function heavyLight(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const depth = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; depth[u] = depth[v] + 1; order.push(u); } } } const size = new Array(n + 1).fill(1); const heavy = new Array(n + 1).fill(0); for (let i = order.length - 1; i >= 1; i -= 1) { const v = order[i]; size[parent[v]] += size[v]; if (heavy[parent[v]] === 0 || size[v] > size[heavy[parent[v]]]) heavy[parent[v]] = v; } const head = new Array(n + 1).fill(0); const position = new Array(n + 1).fill(0); const stack = [1]; while (stack.length) { const top = stack.pop(); for (let v = top; v !== 0; v = heavy[v]) { head[v] = top; position[v] = v - 1; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (u !== parent[v] && u !== heavy[v]) stack.push(u); } } } return { parent, depth, head, position }; }),
      ],
      hints: ["BFS from 1 for parent, depth and a visit order; then walk the order backwards accumulating size[] and remembering, for each node, the child with the largest subtree as heavy[].", "Keep a stack of chain heads starting with node 1. For a head, walk v = head, heavy[head], heavy[heavy[head]], … assigning head[v] and the next consecutive position.", "While walking, push every child that is not the parent and not the heavy child: each is the head of its own chain."],
      cases: [
        run(heavyLight, [5, [[1, 2], [1, 3], [2, 4], [2, 5]]], "CSES sample"),
        run(heavyLight, [1, []], "single node"),
        run(heavyLight, [5, CHAIN_EDGES], "chain"),
        run(heavyLight, [5, STAR_EDGES], "star"),
        hidden("n = 100 000, time limit", () => [100000, SHUFFLED_MID()]),
      ],
    },
    {
      id: "path-queries-ii", title: "Path Queries II", cses: { id: 2134, name: "Path Queries II" },
      goal: "Process [1, s, x] (node s now holds x) and [2, a, b] (largest value on the path between a and b); return the maxima.",
      concept: "With the heavy decomposition the path splits into chain pieces. While a and b sit on different chains, take the range maximum from the deeper chain's head down to its node and step to the node above that head. Once they share a chain, one more range finishes the path.",
      functionName: "pathQueriesII", signature: "pathQueriesII(values, edges, ops) → answers",
      starterSource: starter("pathQueriesII", "values, edges, ops", "chains = heavyLight(values.length, edges); a maximum segment tree over position[]; climb while head[a] !== head[b], then one last range."),
      solve: pathQueriesII, comparator: "deep", dependencies: ["heavy-light-decomposition"], brute: pathQueriesIIBrute, small: (round) => { const n = 1 + (round % 8); return [randomInts(2700 + round, n, 1, 9), randomTreeEdges(2800 + round, n, round % 4), valueOps(2900 + round, 5, n, 9, "pair")]; },
      reference: book("18.2", "Subtrees and paths · path decomposition"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 4], [2, 5]], c: [[2, 3, 5], [1, 2, 2], [2, 3, 5]], d: [2, 4, 1, 3, 3] }, chain: { a: 5, b: CHAIN_EDGES, c: [[2, 1, 5], [1, 3, 9], [2, 2, 4]], d: [1, 2, 3, 4, 5] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetD" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("shallower-chain-first", "Always climb from the node whose chain head is deeper; stepping off the shallower chain can jump straight past the meeting point.", function pathQueriesII(values, edges, ops) { const n = values.length; const chains = heavyLight(n, edges); let width = 1; while (width < n) width *= 2; const tree = new Array(2 * width).fill(0); for (let v = 1; v <= n; v += 1) tree[width + chains.position[v]] = values[v - 1]; for (let i = width - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); const rangeMax = (l, r) => { let lo = width + l, hi = width + r + 1, best = 0; while (lo < hi) { if (lo & 1) { best = Math.max(best, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; best = Math.max(best, tree[hi]); } lo >>= 1; hi >>= 1; } return best; }; const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { let v = width + chains.position[ops[i][1]]; tree[v] = ops[i][2]; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.max(tree[2 * v], tree[2 * v + 1]); continue; } let a = ops[i][1], b = ops[i][2], best = 0, guard = 0; while (chains.head[a] !== chains.head[b] && guard <= n) { guard += 1; best = Math.max(best, rangeMax(chains.position[chains.head[a]], chains.position[a])); a = chains.parent[chains.head[a]]; if (a === 0) { a = b; break; } } if (chains.depth[a] > chains.depth[b]) { const swap = a; a = b; b = swap; } answers.push(Math.max(best, rangeMax(chains.position[a], chains.position[b]))); } return answers; }),
        diagnosis("skips-the-last-piece", "After the climb both nodes share one chain, and the stretch between them still has to be measured.", function pathQueriesII(values, edges, ops) { const n = values.length; const chains = heavyLight(n, edges); let width = 1; while (width < n) width *= 2; const tree = new Array(2 * width).fill(0); for (let v = 1; v <= n; v += 1) tree[width + chains.position[v]] = values[v - 1]; for (let i = width - 1; i >= 1; i -= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1]); const rangeMax = (l, r) => { let lo = width + l, hi = width + r + 1, best = 0; while (lo < hi) { if (lo & 1) { best = Math.max(best, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; best = Math.max(best, tree[hi]); } lo >>= 1; hi >>= 1; } return best; }; const answers = []; for (let i = 0; i < ops.length; i += 1) { if (ops[i][0] === 1) { let v = width + chains.position[ops[i][1]]; tree[v] = ops[i][2]; for (v >>= 1; v >= 1; v >>= 1) tree[v] = Math.max(tree[2 * v], tree[2 * v + 1]); continue; } let a = ops[i][1], b = ops[i][2], best = 0; while (chains.head[a] !== chains.head[b]) { if (chains.depth[chains.head[a]] < chains.depth[chains.head[b]]) { const swap = a; a = b; b = swap; } best = Math.max(best, rangeMax(chains.position[chains.head[a]], chains.position[a])); a = chains.parent[chains.head[a]]; } answers.push(best); } return answers; }),
      ],
      hints: ["Build a maximum segment tree of width 2^k ≥ n with values[v − 1] at leaf position[v]; every value is at least 1, so 0 is a safe starting maximum.", "Query: while head[a] !== head[b], swap so that depth[head[a]] ≥ depth[head[b]], take rangeMax(position[head[a]], position[a]) and set a = parent[head[a]].", "Then swap so that depth[a] ≤ depth[b] and finish with rangeMax(position[a], position[b])."],
      cases: [
        example([[2, 4, 1, 3, 3], [[1, 2], [1, 3], [2, 4], [2, 5]], [[2, 3, 5], [1, 2, 2], [2, 3, 5]]], [4, 3], "CSES sample"),
        example([[1, 2, 3, 4, 5], CHAIN_EDGES, [[2, 1, 5], [2, 2, 4], [1, 3, 9], [2, 2, 4]]], [5, 4, 9], "chain"),
        example([[7], [], [[2, 1, 1], [1, 1, 3], [2, 1, 1]]], [7, 3], "single node"),
        example([[5, 1, 1, 1, 1], STAR_EDGES, [[2, 2, 3], [2, 3, 4]]], [5, 5], "through the root"),
        hidden("n = q = 100 000 on a deep tree, time limit", () => [VALUES_MID(), DEEP_EDGES(), PATH_II_OPS_MID()]),
      ],
    },
    {
      id: "distinct-colors", title: "Distinct Colors", cses: { id: 1139, name: "Distinct Colors" },
      goal: "For every node, how many different colours appear in its subtree.",
      concept: "The tour turns each subtree into a range, and 'how many different values in a range' is exactly Distinct Values Queries from the range section. Flatten the colours into tour order, make one range per node, and hand the whole batch over. Merging colour sets from the leaves upwards, always into the larger set, is the other standard route.",
      functionName: "distinctColors", signature: "distinctColors(colors, edges) → array (index i is node i + 1)",
      starterSource: starter("distinctColors", "colors, edges", "tour = eulerTour(colors.length, edges); flat[tin[v]] = colors[v − 1]; range for v is [tin[v] + 1, tin[v] + size[v]]; return distinctValuesQueries(flat, ranges)."),
      solve: distinctColors, comparator: "deep", dependencies: ["euler-tour", "distinct-values-queries"], brute: distinctColorsBrute, small: (round) => { const n = 1 + (round % 9); return [randomInts(3000 + round, n, 1, 4), randomTreeEdges(3100 + round, n, round % 4)]; },
      reference: book("18.4", "Merging data structures"),
      presets: { "CSES sample": { a: 5, b: SAMPLE_EDGES, d: [2, 3, 2, 2, 1] }, chain: { a: 5, b: CHAIN_EDGES, d: [1, 2, 1, 2, 1] }, star: { a: 5, b: STAR_EDGES, d: [1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetD" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-nodes", "A subtree can hold the same colour many times; count the different colours, not the nodes.", function distinctColors(colors, edges) { const n = colors.length; const tour = eulerTour(n, edges); return tour.size.slice(1); }),
        diagnosis("tin-not-range", "Every node of the subtree counts, so the range runs from tin[v] to tin[v] + size[v] − 1, not just the node's own position.", function distinctColors(colors, edges) { const n = colors.length; const tour = eulerTour(n, edges); const flat = new Array(n); for (let v = 1; v <= n; v += 1) flat[tour.tin[v]] = colors[v - 1]; const ranges = new Array(n); for (let v = 1; v <= n; v += 1) ranges[v - 1] = [tour.tin[v] + 1, tour.tin[v] + 1]; return distinctValuesQueries(flat, ranges); }),
      ],
      hints: ["Build the tour, then flat[tin[v]] = colors[v − 1] lays the colours out so every subtree is contiguous.", "Node v's range is 1-based over flat: [tin[v] + 1, tin[v] + size[v]].", "Collect the ranges in node order and return distinctValuesQueries(flat, ranges)."],
      cases: [
        example([[2, 3, 2, 2, 1], SAMPLE_EDGES], [3, 1, 2, 1, 1], "CSES sample"),
        example([[1, 1, 1, 1, 1], STAR_EDGES], [1, 1, 1, 1, 1], "one colour"),
        example([[1, 2, 1, 2, 1], CHAIN_EDGES], [2, 2, 2, 2, 1], "alternating chain"),
        example([[9], []], [1], "single node"),
        hidden("n = 100 000, time limit", () => [COLORS_MID(), SHUFFLED_MID()]),
      ],
    },
    {
      id: "finding-a-centroid", title: "Finding a Centroid", cses: { id: 2079, name: "Finding a Centroid" },
      goal: "A node that, taken as the root, leaves every subtree with at most ⌊n/2⌋ nodes. Any centroid is accepted.",
      concept: "Root anywhere and compute the subtree sizes. From the root, walk into any child whose subtree holds more than half the nodes; there is at most one, so the walk never branches, and where it stops is a centroid.",
      functionName: "findCentroid", signature: "findCentroid(n, edges) → node",
      starterSource: starter("findCentroid", "n, edges", "BFS from 1 for parent and order; backwards pass for size[]; then step into a child with size · 2 > n until none exists."),
      solve: findCentroid, comparator: "scalar", accept: findCentroidAccept, check: (args, out) => findCentroidAccept(args, out) === true, small: (round) => { const n = 1 + (round % 9); return [n, randomTreeEdges(3200 + round, n, round % 4)]; },
      reference: book("14.1", "Tree traversal · centroids"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [3, 4], [3, 5]] }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("returns-the-root", "Node 1 is only a centroid by luck; the heavy child has to be followed.", function findCentroid(n, edges) { return 1; }),
        diagnosis("largest-subtree", "The node with the biggest subtree below it is usually near the root, and the part above it is then too large.", function findCentroid(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); const order = [1]; const seen = new Array(n + 1).fill(false); seen[1] = true; for (let i = 0; i < order.length; i += 1) { const v = order[i]; for (let k = 0; k < adjacency[v].length; k += 1) { const u = adjacency[v][k]; if (!seen[u]) { seen[u] = true; parent[u] = v; order.push(u); } } } const size = new Array(n + 1).fill(1); for (let i = order.length - 1; i >= 1; i -= 1) size[parent[order[i]]] += size[order[i]]; let best = 1; for (let v = 2; v <= n; v += 1) if (size[v] > size[best]) best = v; return best; }),
      ],
      hints: ["Root at node 1 and accumulate subtree sizes on a backwards pass over the BFS order.", "From node = 1, look for a child u (any neighbour that is not the parent) with size[u] · 2 > n.", "Move to it and repeat; when no such child exists, that node is a centroid."],
      cases: [
        example([5, [[1, 2], [2, 3], [3, 4], [3, 5]]], 3, "CSES sample"),
        example([1, []], 1, "single node"),
        run(findCentroid, [5, CHAIN_EDGES], "chain"),
        run(findCentroid, [5, STAR_EDGES], "star"),
        hidden("n = 200 000, time limit", () => [BIG, SHUFFLED_BIG()]),
      ],
    },
    {
      id: "fixed-length-paths-i", title: "Fixed-Length Paths I", cses: { id: 2080, name: "Fixed-Length Paths I" },
      goal: "Count the paths that use exactly k edges.",
      concept: "Centroid decomposition. Remove a centroid: every remaining path either passed through it or lies entirely inside one of the pieces, and each piece holds at most half the nodes, so the recursion is only log n deep. Paths through the centroid are counted by walking its branches one at a time, asking a depth tally how many earlier nodes sit at distance k − d, then adding the branch's own depths to the tally.",
      functionName: "fixedLengthPathsI", signature: "fixedLengthPathsI(n, k, edges) → number",
      starterSource: starter("fixedLengthPathsI", "n, k, edges", "Loop over components: collect it, size it, walk down to the centroid; count[0] = 1, then per branch add count[k − d] for each depth d before adding that branch's depths; clear, remove the centroid, queue the pieces."),
      solve: fixedLengthPathsI, comparator: "scalar", brute: fixedLengthPathsIBrute, small: (round) => { const n = 1 + (round % 9); return [n, 1 + (round % 4), randomTreeEdges(3300 + round, n, round % 4)]; },
      reference: book("14.1", "Tree traversal · centroid decomposition"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [3, 4], [3, 5]] }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset([{ id: "k", type: "slider", label: "k (rounded)", value: 2, min: 1, max: 4 }]), args: [{ fixture: "presetA" }, { fixture: "roundedK" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("same-branch-pairs", "Two nodes in the same branch do not meet at the centroid: a branch may only be matched against the branches already tallied.", function fixedLengthPathsI(n, k, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const removed = new Array(n + 1).fill(false); const parent = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(0); const count = new Array(k + 1).fill(0); const component = []; let answer = 0; const roots = [1]; while (roots.length) { const root = roots.pop(); if (removed[root]) continue; component.length = 0; component.push(root); parent[root] = 0; for (let i = 0; i < component.length; i += 1) { const v = component[i]; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); } } } const total = component.length; for (let i = total - 1; i >= 0; i -= 1) { const v = component[i]; size[v] = 1; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) size[v] += size[u]; } } let centroid = root; while (true) { let next = 0; for (let j = 0; j < adjacency[centroid].length; j += 1) { const u = adjacency[centroid][j]; if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; } } if (next === 0) break; centroid = next; } count[0] = 1; let deepest = 0; const branches = adjacency[centroid]; const all = []; for (let j = 0; j < branches.length; j += 1) { const start = branches[j]; if (removed[start]) continue; const queue = [start], depths = [1]; parent[start] = centroid; for (let i = 0; i < queue.length; i += 1) { const v = queue[i]; for (let t = 0; t < adjacency[v].length; t += 1) { const u = adjacency[v][t]; if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(depths[i] + 1); } } } for (let i = 0; i < depths.length; i += 1) { const d = depths[i]; if (d <= k) { count[d] += 1; if (d > deepest) deepest = d; } } all.push(depths); } for (let j = 0; j < all.length; j += 1) { const depths = all[j]; for (let i = 0; i < depths.length; i += 1) if (depths[i] <= k) answer += count[k - depths[i]]; } for (let d = 0; d <= deepest; d += 1) count[d] = 0; removed[centroid] = true; for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]); } return answer; }),
        diagnosis("centroid-not-counted", "count[0] = 1 stands for the centroid itself, which is how the paths that simply run k edges down from it get counted.", function fixedLengthPathsI(n, k, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const removed = new Array(n + 1).fill(false); const parent = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(0); const count = new Array(k + 1).fill(0); const component = []; let answer = 0; const roots = [1]; while (roots.length) { const root = roots.pop(); if (removed[root]) continue; component.length = 0; component.push(root); parent[root] = 0; for (let i = 0; i < component.length; i += 1) { const v = component[i]; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); } } } const total = component.length; for (let i = total - 1; i >= 0; i -= 1) { const v = component[i]; size[v] = 1; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) size[v] += size[u]; } } let centroid = root; while (true) { let next = 0; for (let j = 0; j < adjacency[centroid].length; j += 1) { const u = adjacency[centroid][j]; if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; } } if (next === 0) break; centroid = next; } let deepest = 0; const branches = adjacency[centroid]; for (let j = 0; j < branches.length; j += 1) { const start = branches[j]; if (removed[start]) continue; const queue = [start], depths = [1]; parent[start] = centroid; for (let i = 0; i < queue.length; i += 1) { const v = queue[i]; if (depths[i] <= k) answer += count[k - depths[i]]; for (let t = 0; t < adjacency[v].length; t += 1) { const u = adjacency[v][t]; if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(depths[i] + 1); } } } for (let i = 0; i < depths.length; i += 1) { const d = depths[i]; if (d <= k) { count[d] += 1; if (d > deepest) deepest = d; } } } for (let d = 0; d <= deepest; d += 1) count[d] = 0; removed[centroid] = true; for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]); } return answer; }),
      ],
      hints: ["Keep a removed[] flag and a queue of component roots. For a component: collect it with a walk that skips removed nodes, size it on a backwards pass, then step into any child with size · 2 > total until none remains.", "count[0] = 1 for the centroid. Walk each branch with a BFS that records depth d (starting at 1): add count[k − d] to the answer for every node with d ≤ k, and only afterwards raise count[d] for that branch's nodes.", "Clear the entries you touched, mark the centroid removed and push its surviving neighbours as new roots."],
      cases: [
        example([5, 2, [[1, 2], [2, 3], [3, 4], [3, 5]]], 4, "CSES sample"),
        example([1, 1, []], 0, "single node"),
        example([5, 1, CHAIN_EDGES], 4, "every edge is a path of one"),
        example([5, 2, STAR_EDGES], 6, "star: all pairs of leaves"),
        example([5, 4, CHAIN_EDGES], 1, "the whole chain"),
        hidden("n = 50 000, k = 3, time limit", () => [50000, 3, SHUFFLED_SMALL()]),
      ],
    },
    {
      id: "fixed-length-paths-ii", title: "Fixed-Length Paths II", cses: { id: 2081, name: "Fixed-Length Paths II" },
      goal: "Count the paths that use at least k₁ and at most k₂ edges.",
      concept: "Same decomposition, but a range of lengths cannot be read off a single tally entry. Sort all the depths at a centroid, including the centroid at depth 0, and count pairs whose depths sum into the range with two pointers; then subtract the pairs that sit inside one branch, which never pass through the centroid. Counting-sorting the depths keeps it linear per component.",
      functionName: "fixedLengthPathsII", signature: "fixedLengthPathsII(n, k1, k2, edges) → number",
      starterSource: starter("fixedLengthPathsII", "n, k1, k2, edges", "pairsAtMost(sorted, limit) with two pointers; inRange = pairsAtMost(k2) − pairsAtMost(k1 − 1); per centroid add inRange(all depths plus a 0) and subtract inRange(each branch alone)."),
      solve: fixedLengthPathsII, comparator: "scalar", brute: fixedLengthPathsIIBrute, small: (round) => { const n = 1 + (round % 9); const k1 = 1 + (round % 3); return [n, k1, k1 + (round % 3), randomTreeEdges(3400 + round, n, round % 4)]; },
      reference: book("14.1", "Tree traversal · centroid decomposition"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [3, 4], [3, 5]] }, chain: { a: 5, b: CHAIN_EDGES }, star: { a: 5, b: STAR_EDGES } },
      scene: { kind: "algo", view: "tree", handles: preset([
        { id: "l", type: "slider", label: "k₁ (rounded)", value: 2, min: 1, max: 4 },
        { id: "r", type: "slider", label: "k₂ (rounded)", value: 3, min: 1, max: 4 },
      ]), args: [{ fixture: "presetA" }, { fixture: "rangeLo" }, { fixture: "rangeHi" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("same-branch-not-subtracted", "Pairs inside one branch are counted by the combined list but their path does not pass the centroid; subtract each branch on its own.", function fixedLengthPathsII(n, k1, k2, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const removed = new Array(n + 1).fill(false); const parent = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(0); const pairsAtMost = (sorted, limit) => { if (limit < 0) return 0; let lo = 0, hi = sorted.length - 1, total = 0; while (lo < hi) { if (sorted[lo] + sorted[hi] <= limit) { total += hi - lo; lo += 1; } else hi -= 1; } return total; }; const inRange = (sorted) => pairsAtMost(sorted, k2) - pairsAtMost(sorted, k1 - 1); let answer = 0; const component = []; const roots = [1]; while (roots.length) { const root = roots.pop(); if (removed[root]) continue; component.length = 0; component.push(root); parent[root] = 0; for (let i = 0; i < component.length; i += 1) { const v = component[i]; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); } } } const total = component.length; for (let i = total - 1; i >= 0; i -= 1) { const v = component[i]; size[v] = 1; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) size[v] += size[u]; } } let centroid = root; while (true) { let next = 0; for (let j = 0; j < adjacency[centroid].length; j += 1) { const u = adjacency[centroid][j]; if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; } } if (next === 0) break; centroid = next; } const branches = adjacency[centroid]; const all = [0]; for (let j = 0; j < branches.length; j += 1) { const start = branches[j]; if (removed[start]) continue; const queue = [start], depths = [1]; parent[start] = centroid; for (let i = 0; i < queue.length; i += 1) { const v = queue[i]; for (let t = 0; t < adjacency[v].length; t += 1) { const u = adjacency[v][t]; if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(depths[i] + 1); } } } for (let i = 0; i < depths.length; i += 1) all.push(depths[i]); } all.sort((p, q) => p - q); answer += inRange(all); removed[centroid] = true; for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]); } return answer; }),
        diagnosis("lower-bound-off", "pairsAtMost(k₁) already includes the paths of exactly k₁ edges; subtract pairsAtMost(k₁ − 1).", function fixedLengthPathsII(n, k1, k2, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const removed = new Array(n + 1).fill(false); const parent = new Array(n + 1).fill(0); const size = new Array(n + 1).fill(0); const pairsAtMost = (sorted, limit) => { if (limit < 0) return 0; let lo = 0, hi = sorted.length - 1, total = 0; while (lo < hi) { if (sorted[lo] + sorted[hi] <= limit) { total += hi - lo; lo += 1; } else hi -= 1; } return total; }; const inRange = (sorted) => pairsAtMost(sorted, k2) - pairsAtMost(sorted, k1); let answer = 0; const component = []; const roots = [1]; while (roots.length) { const root = roots.pop(); if (removed[root]) continue; component.length = 0; component.push(root); parent[root] = 0; for (let i = 0; i < component.length; i += 1) { const v = component[i]; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) { parent[u] = v; component.push(u); } } } const total = component.length; for (let i = total - 1; i >= 0; i -= 1) { const v = component[i]; size[v] = 1; for (let j = 0; j < adjacency[v].length; j += 1) { const u = adjacency[v][j]; if (u !== parent[v] && !removed[u]) size[v] += size[u]; } } let centroid = root; while (true) { let next = 0; for (let j = 0; j < adjacency[centroid].length; j += 1) { const u = adjacency[centroid][j]; if (u !== parent[centroid] && !removed[u] && size[u] * 2 > total) { next = u; break; } } if (next === 0) break; centroid = next; } const branches = adjacency[centroid]; const lists = []; for (let j = 0; j < branches.length; j += 1) { const start = branches[j]; if (removed[start]) continue; const queue = [start], depths = [1]; parent[start] = centroid; for (let i = 0; i < queue.length; i += 1) { const v = queue[i]; for (let t = 0; t < adjacency[v].length; t += 1) { const u = adjacency[v][t]; if (u !== parent[v] && !removed[u]) { parent[u] = v; queue.push(u); depths.push(depths[i] + 1); } } } lists.push(depths); } const all = [0]; for (let j = 0; j < lists.length; j += 1) for (let i = 0; i < lists[j].length; i += 1) all.push(lists[j][i]); all.sort((p, q) => p - q); answer += inRange(all); for (let j = 0; j < lists.length; j += 1) answer -= inRange(lists[j]); removed[centroid] = true; for (let j = 0; j < branches.length; j += 1) if (!removed[branches[j]]) roots.push(branches[j]); } return answer; }),
      ],
      hints: ["pairsAtMost(sorted, limit): lo = 0, hi = last; while lo < hi, if sorted[lo] + sorted[hi] ≤ limit add hi − lo and raise lo, else lower hi. inRange = pairsAtMost(k₂) − pairsAtMost(k₁ − 1).",
        "A breadth-first walk already produces each branch's depths in order, so the combined list only needs a counting sort over a shared bucket array.",
        "Per centroid: add inRange(all depths together with one extra 0 for the centroid), then subtract inRange(depths of each branch alone)."],
      cases: [
        example([5, 2, 3, [[1, 2], [2, 3], [3, 4], [3, 5]]], 6, "CSES sample"),
        example([1, 1, 1, []], 0, "single node"),
        example([5, 1, 4, CHAIN_EDGES], 10, "every pair on a chain"),
        example([5, 2, 2, STAR_EDGES], 6, "star: all pairs of leaves"),
        example([5, 3, 4, STAR_EDGES], 0, "star has no long path"),
        hidden("n = 50 000, k₁ = 2, k₂ = 4, time limit", () => [50000, 2, 4, SHUFFLED_SMALL()]),
      ],
    },
  ];
  core.share({ binaryLiftingTable, kthAncestor, rootedAncestors, treeLca, eulerTour, heavyLight });
  core.define("trees", TREES);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

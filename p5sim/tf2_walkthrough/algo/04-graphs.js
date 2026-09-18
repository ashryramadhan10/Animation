(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { heapPush, heapPop } = core.shared;

  // ------------------------------------------------------------------ 4 · graph algorithms · references
  // Every reference is self-contained (it runs from its source text inside the worker); bricks it calls are declared as dependencies.
  function countingRooms(grid) {
    const rows = grid.length, cols = grid[0].length;
    const seen = new Uint8Array(rows * cols);
    let rooms = 0;
    const stack = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] !== "." || seen[r * cols + c]) continue;
        rooms += 1;
        seen[r * cols + c] = 1;
        stack.push(r * cols + c);
        while (stack.length) {
          const cell = stack.pop();
          const cr = Math.floor(cell / cols), cc = cell % cols;
          const next = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
          for (let k = 0; k < 4; k += 1) {
            const nr = next[k][0], nc = next[k][1];
            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== "." || seen[nr * cols + nc]) continue;
            seen[nr * cols + nc] = 1;
            stack.push(nr * cols + nc);
          }
        }
      }
    }
    return rooms;
  }
  function labyrinth(grid) {
    const rows = grid.length, cols = grid[0].length;
    let start = -1, goal = -1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] === "A") start = r * cols + c;
        if (grid[r][c] === "B") goal = r * cols + c;
      }
    }
    const distance = new Int32Array(rows * cols).fill(-1);
    const queue = [start];
    distance[start] = 0;
    let head = 0;
    while (head < queue.length) {
      const cell = queue[head];
      head += 1;
      if (cell === goal) return distance[cell];
      const cr = Math.floor(cell / cols), cc = cell % cols;
      const next = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
      for (let k = 0; k < 4; k += 1) {
        const nr = next[k][0], nc = next[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (distance[id] !== -1) continue;
        distance[id] = distance[cell] + 1;
        queue.push(id);
      }
    }
    return -1;
  }
  function labyrinthPath(grid) {
    const rows = grid.length, cols = grid[0].length;
    let start = -1, goal = -1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] === "A") start = r * cols + c;
        if (grid[r][c] === "B") goal = r * cols + c;
      }
    }
    const parent = new Int32Array(rows * cols).fill(-1);
    const move = new Array(rows * cols).fill("");
    const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]];
    const queue = [start];
    parent[start] = start;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      if (cell === goal) break;
      const cr = Math.floor(cell / cols), cc = cell % cols;
      for (let k = 0; k < 4; k += 1) {
        const nr = cr + steps[k][0], nc = cc + steps[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (parent[id] !== -1) continue;
        parent[id] = cell;
        move[id] = steps[k][2];
        queue.push(id);
      }
    }
    if (parent[goal] === -1) return null;
    const out = [];
    for (let cell = goal; cell !== start; cell = parent[cell]) out.push(move[cell]);
    return out.reverse().join("");
  }
  function buildingRoads(n, edges) {
    const parent = new Array(n + 1);
    for (let i = 0; i <= n; i += 1) parent[i] = i;
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let i = 0; i < edges.length; i += 1) {
      const ra = find(edges[i][0]), rb = find(edges[i][1]);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
    const representatives = [];
    for (let v = 1; v <= n; v += 1) if (find(v) === v) representatives.push(v);
    const roads = [];
    for (let i = 0; i + 1 < representatives.length; i += 1) roads.push([representatives[i], representatives[i + 1]]);
    return roads;
  }
  function messageRoute(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0);
    parent[1] = 1;
    const queue = [1];
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      if (v === n) break;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (parent[u] !== 0) continue;
        parent[u] = v;
        queue.push(u);
      }
    }
    if (parent[n] === 0) return null;
    const path = [];
    for (let v = n; v !== 1; v = parent[v]) path.push(v);
    path.push(1);
    return path.reverse();
  }
  function buildingTeams(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const team = new Array(n + 1).fill(0);
    for (let s = 1; s <= n; s += 1) {
      if (team[s]) continue;
      team[s] = 1;
      const queue = [s];
      let head = 0;
      while (head < queue.length) {
        const v = queue[head];
        head += 1;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const u = list[k];
          if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); }
          else if (team[u] === team[v]) return null;
        }
      }
    }
    return team.slice(1);
  }
  function roundTrip(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    const parent = new Array(n + 1).fill(0), visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0);
    for (let s = 1; s <= n; s += 1) {
      if (visited[s]) continue;
      visited[s] = true;
      const stack = [s];
      while (stack.length) {
        const v = stack[stack.length - 1];
        if (pointer[v] >= adjacency[v].length) { stack.pop(); continue; }
        const u = adjacency[v][pointer[v]];
        pointer[v] += 1;
        if (!visited[u]) { visited[u] = true; parent[u] = v; stack.push(u); }
        else if (u !== parent[v] && parent[u] !== v) {
          const path = [];
          for (let w = v; w !== u; w = parent[w]) path.push(w);
          return [u].concat(path.reverse(), [u]);
        }
      }
    }
    return null;
  }
  function monsters(grid) {
    const rows = grid.length, cols = grid[0].length, total = rows * cols;
    const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]];
    const monsterTime = new Int32Array(total).fill(-1);
    const queue = [];
    let start = -1;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c] === "M") { monsterTime[r * cols + c] = 0; queue.push(r * cols + c); }
        if (grid[r][c] === "A") start = r * cols + c;
      }
    }
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const cr = Math.floor(cell / cols), cc = cell % cols;
      for (let k = 0; k < 4; k += 1) {
        const nr = cr + steps[k][0], nc = cc + steps[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (monsterTime[id] !== -1) continue;
        monsterTime[id] = monsterTime[cell] + 1;
        queue.push(id);
      }
    }
    const time = new Int32Array(total).fill(-1), parent = new Int32Array(total).fill(-1);
    const move = new Array(total).fill("");
    time[start] = 0;
    const mine = [start];
    for (let head = 0; head < mine.length; head += 1) {
      const cell = mine[head];
      const cr = Math.floor(cell / cols), cc = cell % cols;
      if (cr === 0 || cc === 0 || cr === rows - 1 || cc === cols - 1) {
        const out = [];
        for (let c = cell; c !== start; c = parent[c]) out.push(move[c]);
        return out.reverse().join("");
      }
      for (let k = 0; k < 4; k += 1) {
        const nr = cr + steps[k][0], nc = cc + steps[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (time[id] !== -1) continue;
        if (monsterTime[id] !== -1 && monsterTime[id] <= time[cell] + 1) continue;
        time[id] = time[cell] + 1;
        parent[id] = cell;
        move[id] = steps[k][2];
        mine.push(id);
      }
    }
    return null;
  }
  function shortestRoutes(n, edges, source) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]);
    const distance = new Array(n + 1).fill(-1);
    const heap = [];
    heapPush(heap, [0, source]);
    while (heap.length) {
      const top = heapPop(heap).item;
      const d = top[0], v = top[1];
      if (distance[v] !== -1) continue;
      distance[v] = d;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        if (distance[list[k][0]] === -1) heapPush(heap, [d + list[k][1], list[k][0]]);
      }
    }
    return distance.slice(1);
  }
  function shortestRoutesII(n, edges, queries) {
    const dist = new Array((n + 1) * (n + 1)).fill(Infinity);
    for (let v = 1; v <= n; v += 1) dist[v * (n + 1) + v] = 0;
    for (let i = 0; i < edges.length; i += 1) {
      const a = edges[i][0], b = edges[i][1], c = edges[i][2];
      if (c < dist[a * (n + 1) + b]) { dist[a * (n + 1) + b] = c; dist[b * (n + 1) + a] = c; }
    }
    for (let k = 1; k <= n; k += 1) {
      for (let i = 1; i <= n; i += 1) {
        const ik = dist[i * (n + 1) + k];
        if (ik === Infinity) continue;
        for (let j = 1; j <= n; j += 1) {
          const candidate = ik + dist[k * (n + 1) + j];
          if (candidate < dist[i * (n + 1) + j]) dist[i * (n + 1) + j] = candidate;
        }
      }
    }
    return queries.map((q) => { const d = dist[q[0] * (n + 1) + q[1]]; return d === Infinity ? -1 : d; });
  }
  function highScore(n, edges) {
    const score = new Array(n + 1).fill(-Infinity);
    score[1] = 0;
    for (let round = 0; round < n - 1; round += 1) {
      let changed = false;
      for (let i = 0; i < edges.length; i += 1) {
        const a = edges[i][0], b = edges[i][1], x = edges[i][2];
        if (score[a] !== -Infinity && score[a] + x > score[b]) { score[b] = score[a] + x; changed = true; }
      }
      if (!changed) break;
    }
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]);
    const unbounded = new Array(n + 1).fill(false);
    const queue = [];
    for (let i = 0; i < edges.length; i += 1) {
      const a = edges[i][0], b = edges[i][1], x = edges[i][2];
      if (score[a] !== -Infinity && score[a] + x > score[b] && !unbounded[b]) { unbounded[b] = true; queue.push(b); }
    }
    for (let head = 0; head < queue.length; head += 1) {
      const list = adjacency[queue[head]];
      for (let k = 0; k < list.length; k += 1) if (!unbounded[list[k]]) { unbounded[list[k]] = true; queue.push(list[k]); }
    }
    return unbounded[n] ? -1 : score[n];
  }
  function flightDiscount(n, edges) {
    const forward = [], backward = [];
    for (let v = 0; v <= n; v += 1) { forward.push([]); backward.push([]); }
    for (let i = 0; i < edges.length; i += 1) { forward[edges[i][0]].push([edges[i][1], edges[i][2]]); backward[edges[i][1]].push([edges[i][0], edges[i][2]]); }
    const dijkstra = (adjacency, source) => {
      const distance = new Array(n + 1).fill(Infinity);
      const heap = [];
      heapPush(heap, [0, source]);
      const settled = new Array(n + 1).fill(false);
      while (heap.length) {
        const top = heapPop(heap).item;
        const d = top[0], v = top[1];
        if (settled[v]) continue;
        settled[v] = true;
        distance[v] = d;
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) if (!settled[list[k][0]]) heapPush(heap, [d + list[k][1], list[k][0]]);
      }
      return distance;
    };
    const fromStart = dijkstra(forward, 1), toEnd = dijkstra(backward, n);
    let best = Infinity;
    for (let i = 0; i < edges.length; i += 1) {
      const a = edges[i][0], b = edges[i][1], c = edges[i][2];
      const candidate = fromStart[a] + Math.floor(c / 2) + toEnd[b];
      if (candidate < best) best = candidate;
    }
    return best;
  }
  function cycleFinding(n, edges) {
    const dist = new Array(n + 1).fill(0), parent = new Array(n + 1).fill(0);
    let last = 0;
    for (let round = 0; round < n; round += 1) {
      last = 0;
      for (let i = 0; i < edges.length; i += 1) {
        const a = edges[i][0], b = edges[i][1], c = edges[i][2];
        if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; parent[b] = a; last = b; }
      }
      if (last === 0) return null;
    }
    let node = last;
    for (let k = 0; k < n; k += 1) node = parent[node];
    const cycle = [node];
    for (let v = parent[node]; v !== node; v = parent[v]) cycle.push(v);
    cycle.push(node);
    return cycle.reverse();
  }
  function flightRoutes(n, edges, k) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]);
    const popped = new Array(n + 1).fill(0);
    const heap = [];
    heapPush(heap, [0, 1]);
    const out = [];
    while (heap.length && out.length < k) {
      const top = heapPop(heap).item;
      const d = top[0], v = top[1];
      if (popped[v] >= k) continue;
      popped[v] += 1;
      if (v === n) out.push(d);
      const list = adjacency[v];
      for (let i = 0; i < list.length; i += 1) if (popped[list[i][0]] < k) heapPush(heap, [d + list[i][1], list[i][0]]);
    }
    return out;
  }
  function roundTripII(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]);
    const colour = new Array(n + 1).fill(0), parent = new Array(n + 1).fill(0), pointer = new Array(n + 1).fill(0);
    for (let s = 1; s <= n; s += 1) {
      if (colour[s]) continue;
      colour[s] = 1;
      const stack = [s];
      while (stack.length) {
        const v = stack[stack.length - 1];
        if (pointer[v] >= adjacency[v].length) { colour[v] = 2; stack.pop(); continue; }
        const u = adjacency[v][pointer[v]];
        pointer[v] += 1;
        if (colour[u] === 0) { colour[u] = 1; parent[u] = v; stack.push(u); }
        else if (colour[u] === 1) {
          const path = [];
          for (let w = v; w !== u; w = parent[w]) path.push(w);
          return [u].concat(path.reverse(), [u]);
        }
      }
    }
    return null;
  }
  function courseSchedule(n, edges) {
    const adjacency = [];
    const indegree = new Array(n + 1).fill(0);
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; }
    const order = [];
    for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v);
    for (let head = 0; head < order.length; head += 1) {
      const list = adjacency[order[head]];
      for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); }
    }
    return order.length === n ? order : null;
  }
  function longestFlightRoute(n, edges) {
    const adjacency = [];
    const indegree = new Array(n + 1).fill(0);
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; }
    const order = [];
    for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v);
    for (let head = 0; head < order.length; head += 1) {
      const list = adjacency[order[head]];
      for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); }
    }
    const best = new Array(n + 1).fill(-Infinity), parent = new Array(n + 1).fill(0);
    best[1] = 1;
    for (let head = 0; head < order.length; head += 1) {
      const v = order[head];
      if (best[v] === -Infinity) continue;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k];
        if (best[v] + 1 > best[u]) { best[u] = best[v] + 1; parent[u] = v; }
      }
    }
    if (best[n] === -Infinity) return null;
    const path = [];
    for (let v = n; v !== 1; v = parent[v]) path.push(v);
    path.push(1);
    return path.reverse();
  }
  function gameRoutes(n, edges) {
    const adjacency = [];
    const indegree = new Array(n + 1).fill(0);
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; }
    const order = [];
    for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v);
    for (let head = 0; head < order.length; head += 1) {
      const list = adjacency[order[head]];
      for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); }
    }
    const ways = new Array(n + 1).fill(0);
    ways[1] = 1;
    for (let head = 0; head < order.length; head += 1) {
      const v = order[head];
      if (ways[v] === 0) continue;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) ways[list[k]] = (ways[list[k]] + ways[v]) % 1000000007;
    }
    return ways[n];
  }
  function investigation(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]);
    const distance = new Array(n + 1).fill(Infinity), ways = new Array(n + 1).fill(0);
    const fewest = new Array(n + 1).fill(0), most = new Array(n + 1).fill(0), settled = new Array(n + 1).fill(false);
    distance[1] = 0;
    ways[1] = 1;
    const heap = [];
    heapPush(heap, [0, 1]);
    while (heap.length) {
      const top = heapPop(heap).item;
      const v = top[1];
      if (settled[v]) continue;
      settled[v] = true;
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) {
        const u = list[k][0], candidate = distance[v] + list[k][1];
        if (candidate < distance[u]) {
          distance[u] = candidate;
          ways[u] = ways[v];
          fewest[u] = fewest[v] + 1;
          most[u] = most[v] + 1;
          heapPush(heap, [candidate, u]);
        } else if (candidate === distance[u]) {
          ways[u] = (ways[u] + ways[v]) % 1000000007;
          fewest[u] = Math.min(fewest[u], fewest[v] + 1);
          most[u] = Math.max(most[u], most[v] + 1);
        }
      }
    }
    return [distance[n], ways[n], fewest[n], most[n]];
  }
  function planetsQueriesI(t, queries) {
    const n = t.length;
    const up = [];
    const first = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) first[v] = t[v - 1];
    up.push(first);
    for (let j = 1; j < 30; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return queries.map((query) => {
      let v = query[0], k = query[1];
      for (let j = 0; j < 30 && k > 0; j += 1) {
        if (k & 1) v = up[j][v];
        k = Math.floor(k / 2);
      }
      return v;
    });
  }
  function planetsQueriesII(t, queries) {
    const n = t.length;
    const next = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) next[v] = t[v - 1];
    const state = new Array(n + 1).fill(0), cycleId = new Array(n + 1).fill(0), position = new Array(n + 1).fill(0), cycleLength = [0];
    for (let s = 1; s <= n; s += 1) {
      if (state[s]) continue;
      const path = [];
      let v = s;
      while (state[v] === 0) { state[v] = 1; path.push(v); v = next[v]; }
      if (state[v] === 1) {
        const start = path.indexOf(v);
        const id = cycleLength.length;
        cycleLength.push(path.length - start);
        for (let i = start; i < path.length; i += 1) { cycleId[path[i]] = id; position[path[i]] = i - start; }
      }
      for (let i = 0; i < path.length; i += 1) state[path[i]] = 2;
    }
    const depth = new Array(n + 1).fill(-1), entry = new Array(n + 1).fill(0);
    for (let v = 1; v <= n; v += 1) if (cycleId[v]) { depth[v] = 0; entry[v] = v; }
    for (let s = 1; s <= n; s += 1) {
      if (depth[s] !== -1) continue;
      const path = [];
      let v = s;
      while (depth[v] === -1) { path.push(v); v = next[v]; }
      for (let i = path.length - 1; i >= 0; i -= 1) { depth[path[i]] = depth[v] + 1; entry[path[i]] = entry[v]; v = path[i]; }
    }
    const up = [next];
    for (let j = 1; j < 18; j += 1) {
      const previous = up[j - 1];
      const row = new Array(n + 1).fill(0);
      for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]];
      up.push(row);
    }
    return queries.map((query) => {
      const a = query[0], b = query[1];
      if (cycleId[b]) {
        if (cycleId[entry[a]] !== cycleId[b]) return -1;
        const length = cycleLength[cycleId[b]];
        return depth[a] + ((position[b] - position[entry[a]] + length) % length);
      }
      if (depth[a] < depth[b]) return -1;
      let v = a, k = depth[a] - depth[b];
      for (let j = 0; j < 18 && k > 0; j += 1) {
        if (k & 1) v = up[j][v];
        k = Math.floor(k / 2);
      }
      return v === b ? depth[a] - depth[b] : -1;
    });
  }
  function planetsCycles(t) {
    const n = t.length;
    const answer = new Array(n + 1).fill(0), state = new Array(n + 1).fill(0);
    for (let s = 1; s <= n; s += 1) {
      if (state[s]) continue;
      const path = [];
      let v = s;
      while (state[v] === 0) { state[v] = 1; path.push(v); v = t[v - 1]; }
      let from = path.length;
      if (state[v] === 1) {
        const start = path.indexOf(v);
        const length = path.length - start;
        for (let i = start; i < path.length; i += 1) answer[path[i]] = length;
        from = start;
      }
      for (let i = from - 1; i >= 0; i -= 1) { const following = i + 1 < path.length ? path[i + 1] : v; answer[path[i]] = answer[following] + 1; }
      for (let i = 0; i < path.length; i += 1) state[path[i]] = 2;
    }
    return answer.slice(1);
  }
  function dsuFind(parent, x) {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) { const up = parent[x]; parent[x] = root; x = up; }
    return root;
  }
  function dsuUnion(parent, size, a, b) {
    let ra = dsuFind(parent, a), rb = dsuFind(parent, b);
    if (ra === rb) return 0;
    if (size[ra] < size[rb]) { const swap = ra; ra = rb; rb = swap; }
    parent[rb] = ra;
    size[ra] += size[rb];
    return size[ra];
  }
  function roadReparation(n, edges) {
    const order = edges.slice().sort((p, q) => p[2] - q[2]);
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    let cost = 0, joined = 0;
    for (let i = 0; i < order.length; i += 1) {
      if (dsuUnion(parent, size, order[i][0], order[i][1])) { cost += order[i][2]; joined += 1; }
    }
    return joined === n - 1 ? cost : null;
  }
  function roadConstruction(n, edges) {
    const parent = [], size = [];
    for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); }
    let components = n, largest = 1;
    const out = [];
    for (let i = 0; i < edges.length; i += 1) {
      const merged = dsuUnion(parent, size, edges[i][0], edges[i][1]);
      if (merged) {
        components -= 1;
        if (merged > largest) largest = merged;
      }
      out.push([components, largest]);
    }
    return out;
  }
  function flightRoutesCheck(n, edges) {
    const forward = [], backward = [];
    for (let v = 0; v <= n; v += 1) { forward.push([]); backward.push([]); }
    for (let i = 0; i < edges.length; i += 1) { forward[edges[i][0]].push(edges[i][1]); backward[edges[i][1]].push(edges[i][0]); }
    const reach = (adjacency) => {
      const seen = new Array(n + 1).fill(false);
      seen[1] = true;
      const queue = [1];
      for (let head = 0; head < queue.length; head += 1) {
        const list = adjacency[queue[head]];
        for (let k = 0; k < list.length; k += 1) if (!seen[list[k]]) { seen[list[k]] = true; queue.push(list[k]); }
      }
      return seen;
    };
    const fromOne = reach(forward);
    for (let v = 1; v <= n; v += 1) if (!fromOne[v]) return [1, v];
    const toOne = reach(backward);
    for (let v = 1; v <= n; v += 1) if (!toOne[v]) return [v, 1];
    return null;
  }
  function planetsAndKingdoms(n, edges) {
    const forward = [], backward = [];
    for (let v = 0; v <= n; v += 1) { forward.push([]); backward.push([]); }
    for (let i = 0; i < edges.length; i += 1) { forward[edges[i][0]].push(edges[i][1]); backward[edges[i][1]].push(edges[i][0]); }
    const visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0);
    const finished = [];
    for (let s = 1; s <= n; s += 1) {
      if (visited[s]) continue;
      visited[s] = true;
      const stack = [s];
      while (stack.length) {
        const v = stack[stack.length - 1];
        if (pointer[v] >= forward[v].length) { finished.push(v); stack.pop(); continue; }
        const u = forward[v][pointer[v]];
        pointer[v] += 1;
        if (!visited[u]) { visited[u] = true; stack.push(u); }
      }
    }
    const label = new Array(n + 1).fill(0);
    let count = 0;
    for (let i = finished.length - 1; i >= 0; i -= 1) {
      const s = finished[i];
      if (label[s]) continue;
      count += 1;
      label[s] = count;
      const stack = [s];
      while (stack.length) {
        const v = stack.pop();
        const list = backward[v];
        for (let k = 0; k < list.length; k += 1) if (!label[list[k]]) { label[list[k]] = count; stack.push(list[k]); }
      }
    }
    return label.slice(1);
  }
  function giantPizza(wishes, m) {
    const node = (literal) => (literal > 0 ? 2 * literal - 1 : -2 * literal);
    const edges = [];
    for (let i = 0; i < wishes.length; i += 1) {
      const p = wishes[i][0], q = wishes[i][1];
      edges.push([node(-p), node(q)]);
      edges.push([node(-q), node(p)]);
    }
    const label = planetsAndKingdoms(2 * m, edges);
    const out = [];
    for (let x = 1; x <= m; x += 1) {
      const yes = label[2 * x - 2], no = label[2 * x - 1];
      if (yes === no) return null;
      out.push(no < yes ? "+" : "-");
    }
    return out;
  }
  function coinCollector(n, edges, coins) {
    const label = planetsAndKingdoms(n, edges);
    let count = 0;
    for (let v = 0; v < n; v += 1) if (label[v] > count) count = label[v];
    const total = new Array(count + 1).fill(0);
    for (let v = 0; v < n; v += 1) total[label[v]] += coins[v];
    const best = total.slice();
    const outgoing = [];
    for (let c = 0; c <= count; c += 1) outgoing.push([]);
    for (let i = 0; i < edges.length; i += 1) {
      const a = label[edges[i][0] - 1], b = label[edges[i][1] - 1];
      if (a !== b) outgoing[a].push(b);
    }
    let answer = 0;
    for (let c = 1; c <= count; c += 1) {
      if (best[c] > answer) answer = best[c];
      const list = outgoing[c];
      for (let k = 0; k < list.length; k += 1) if (best[c] + total[list[k]] > best[list[k]]) best[list[k]] = best[c] + total[list[k]];
    }
    return answer;
  }
  function mailDelivery(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push([edges[i][1], i]); adjacency[edges[i][1]].push([edges[i][0], i]); }
    for (let v = 1; v <= n; v += 1) if (adjacency[v].length % 2 !== 0) return null;
    const used = new Array(edges.length).fill(false), pointer = new Array(n + 1).fill(0);
    const stack = [1], route = [];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const list = adjacency[v];
      while (pointer[v] < list.length && used[list[pointer[v]][1]]) pointer[v] += 1;
      if (pointer[v] >= list.length) { route.push(v); stack.pop(); continue; }
      const step = list[pointer[v]];
      used[step[1]] = true;
      stack.push(step[0]);
    }
    return route.length === edges.length + 1 ? route.reverse() : null;
  }
  function deBruijnSequence(n) {
    if (n === 1) return "01";
    const nodes = 1 << (n - 1), mask = nodes - 1;
    const pointer = new Array(nodes).fill(0);
    const stack = [[0, -1]];
    const bits = [];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const v = top[0];
      if (pointer[v] < 2) {
        const bit = pointer[v];
        pointer[v] += 1;
        stack.push([((v << 1) | bit) & mask, bit]);
      } else {
        stack.pop();
        if (top[1] >= 0) bits.push(top[1]);
      }
    }
    return "0".repeat(n - 1) + bits.reverse().join("");
  }
  function teleportersPath(n, edges) {
    const adjacency = [];
    const indegree = new Array(n + 1).fill(0);
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; }
    for (let v = 1; v <= n; v += 1) {
      const out = adjacency[v].length, inn = indegree[v];
      if (v === 1 && out !== inn + 1) return null;
      if (v === n && inn !== out + 1) return null;
      if (v !== 1 && v !== n && out !== inn) return null;
    }
    const pointer = new Array(n + 1).fill(0);
    const stack = [1], route = [];
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (pointer[v] >= adjacency[v].length) { route.push(v); stack.pop(); continue; }
      const u = adjacency[v][pointer[v]];
      pointer[v] += 1;
      stack.push(u);
    }
    return route.length === edges.length + 1 && route[0] === n ? route.reverse() : null;
  }
  function hamiltonianFlights(n, edges) {
    const incoming = [];
    for (let v = 0; v < n; v += 1) incoming.push(new Array(n).fill(0));
    for (let i = 0; i < edges.length; i += 1) incoming[edges[i][1] - 1][edges[i][0] - 1] += 1;
    const full = (1 << n) - 1;
    const ways = new Array((1 << n) * n).fill(0);
    ways[1 * n + 0] = 1;
    for (let mask = 1; mask <= full; mask += 1) {
      if (!(mask & 1)) continue;
      if ((mask & (1 << (n - 1))) && mask !== full) continue;
      for (let v = 1; v < n; v += 1) {
        if (!(mask & (1 << v))) continue;
        const rest = mask ^ (1 << v);
        let sum = 0;
        for (let u = 0; u < n; u += 1) {
          if (!(rest & (1 << u)) || incoming[v][u] === 0) continue;
          sum = (sum + incoming[v][u] * ways[rest * n + u]) % 1000000007;
        }
        ways[mask * n + v] = sum;
      }
    }
    return ways[full * n + (n - 1)];
  }
  function knightsTour(x, y) {
    const board = [];
    for (let r = 0; r < 8; r += 1) board.push(new Array(8).fill(0));
    const jumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
    const degree = (r, c) => { let count = 0; for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === 0) count += 1; } return count; };
    const visit = (r, c, step) => {
      board[r][c] = step;
      if (step === 64) return true;
      const options = [];
      for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === 0) options.push([degree(nr, nc), nr, nc]); }
      options.sort((p, q) => p[0] - q[0]);
      for (let i = 0; i < options.length; i += 1) if (visit(options[i][1], options[i][2], step + 1)) return true;
      board[r][c] = 0;
      return false;
    };
    visit(y - 1, x - 1, 1);
    return board;
  }
  function maxFlow(n, edges, source, sink) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    const to = [], capacity = [];
    for (let i = 0; i < edges.length; i += 1) {
      to.push(edges[i][1], edges[i][0]);
      capacity.push(edges[i][2], 0);
      adjacency[edges[i][0]].push(2 * i);
      adjacency[edges[i][1]].push(2 * i + 1);
    }
    let value = 0;
    while (true) {
      const via = new Array(n + 1).fill(-1);
      via[source] = -2;
      const queue = [source];
      for (let head = 0; head < queue.length && via[sink] === -1; head += 1) {
        const v = queue[head];
        const list = adjacency[v];
        for (let k = 0; k < list.length; k += 1) {
          const e = list[k];
          if (capacity[e] > 0 && via[to[e]] === -1) { via[to[e]] = e; queue.push(to[e]); }
        }
      }
      if (via[sink] === -1) break;
      let push = Infinity;
      for (let v = sink; v !== source; v = to[via[v] ^ 1]) push = Math.min(push, capacity[via[v]]);
      for (let v = sink; v !== source; v = to[via[v] ^ 1]) { capacity[via[v]] -= push; capacity[via[v] ^ 1] += push; }
      value += push;
    }
    const flows = [];
    for (let i = 0; i < edges.length; i += 1) flows.push(edges[i][2] - capacity[2 * i]);
    return { value, flows };
  }
  function downloadSpeed(n, edges) {
    return maxFlow(n, edges, 1, n).value;
  }
  function policeChase(n, streets) {
    const edges = [];
    for (let i = 0; i < streets.length; i += 1) { edges.push([streets[i][0], streets[i][1], 1]); edges.push([streets[i][1], streets[i][0], 1]); }
    const flow = maxFlow(n, edges, 1, n);
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) {
      if (edges[i][2] - flow.flows[i] > 0) adjacency[edges[i][0]].push(edges[i][1]);
      if (flow.flows[i] > 0) adjacency[edges[i][1]].push(edges[i][0]);
    }
    const side = new Array(n + 1).fill(false);
    side[1] = true;
    const queue = [1];
    for (let head = 0; head < queue.length; head += 1) {
      const list = adjacency[queue[head]];
      for (let k = 0; k < list.length; k += 1) if (!side[list[k]]) { side[list[k]] = true; queue.push(list[k]); }
    }
    const out = [];
    for (let i = 0; i < streets.length; i += 1) if (side[streets[i][0]] !== side[streets[i][1]]) out.push([streets[i][0], streets[i][1]]);
    return out;
  }
  function schoolDance(n, m, pairs) {
    const source = n + m + 1, sink = n + m + 2;
    const edges = [];
    for (let boy = 1; boy <= n; boy += 1) edges.push([source, boy, 1]);
    for (let girl = 1; girl <= m; girl += 1) edges.push([n + girl, sink, 1]);
    for (let i = 0; i < pairs.length; i += 1) edges.push([pairs[i][0], n + pairs[i][1], 1]);
    const flow = maxFlow(n + m + 2, edges, source, sink);
    const out = [];
    for (let i = 0; i < pairs.length; i += 1) if (flow.flows[n + m + i] === 1) out.push([pairs[i][0], pairs[i][1]]);
    return out;
  }
  function distinctRoutes(n, edges) {
    const capacities = edges.map((edge) => [edge[0], edge[1], 1]);
    const flow = maxFlow(n, capacities, 1, n);
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) if (flow.flows[i] === 1) adjacency[edges[i][0]].push(edges[i][1]);
    const pointer = new Array(n + 1).fill(0);
    const routes = [];
    for (let r = 0; r < flow.value; r += 1) {
      const route = [1];
      let v = 1;
      while (v !== n) { const u = adjacency[v][pointer[v]]; pointer[v] += 1; v = u; route.push(v); }
      routes.push(route);
    }
    return routes;
  }

  // ------------------------------------------------------------------ validity checks (accept) and brute forces for the stress tests
  // accept(args, actual, expected) runs on the main thread: true passes, false or a string (the reason) fails.
  function pairCounts(edges, undirected) {
    const counts = new Map();
    for (let i = 0; i < edges.length; i += 1) {
      const key = edges[i][0] + "," + edges[i][1];
      counts.set(key, (counts.get(key) || 0) + 1);
      if (undirected) { const back = edges[i][1] + "," + edges[i][0]; counts.set(back, (counts.get(back) || 0) + 1); }
    }
    return counts;
  }
  function isIntList(list) { return Array.isArray(list) && list.every((v) => Number.isInteger(v)); }
  function undirectedLists(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); }
    return adjacency;
  }
  function directedLists(n, edges) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]);
    return adjacency;
  }
  function reachableFrom(adjacency, source) {
    const seen = new Array(adjacency.length).fill(false);
    seen[source] = true;
    const queue = [source];
    for (let head = 0; head < queue.length; head += 1) {
      const list = adjacency[queue[head]];
      for (let k = 0; k < list.length; k += 1) if (!seen[list[k]]) { seen[list[k]] = true; queue.push(list[k]); }
    }
    return seen;
  }
  function bfsDistance(adjacency, source, target) {
    const distance = new Array(adjacency.length).fill(-1);
    distance[source] = 0;
    const queue = [source];
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      if (v === target) return distance[v];
      const list = adjacency[v];
      for (let k = 0; k < list.length; k += 1) if (distance[list[k]] === -1) { distance[list[k]] = distance[v] + 1; queue.push(list[k]); }
    }
    return -1;
  }
  function gridWalk(grid, start, text) {
    const rows = grid.length, cols = grid[0].length;
    const delta = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
    let r = Math.floor(start / cols), c = start % cols;
    const cells = [start];
    for (let i = 0; i < text.length; i += 1) {
      const step = delta[text[i]];
      if (!step) return null;
      r += step[0]; c += step[1];
      if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] === "#") return null;
      cells.push(r * cols + c);
    }
    return cells;
  }
  function findCell(grid, letter) {
    for (let r = 0; r < grid.length; r += 1) for (let c = 0; c < grid[r].length; c += 1) if (grid[r][c] === letter) return r * grid[r].length + c;
    return -1;
  }
  function labyrinthPathAccept(args, actual, expected) {
    const grid = args[0];
    if (expected === null) return actual === null || "B is unreachable, return null.";
    if (typeof actual !== "string") return "Return the moves as a string of U, D, L and R.";
    if (actual.length !== expected.length) return "The path has " + actual.length + " moves; the shortest has " + expected.length + ".";
    const cells = gridWalk(grid, findCell(grid, "A"), actual);
    if (!cells) return "The path walks into a wall or off the grid.";
    return cells[cells.length - 1] === findCell(grid, "B") || "The path does not end at B.";
  }
  function messageRouteAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (expected === null) return actual === null || "There is no route, return null.";
    if (!isIntList(actual)) return "Return the route as an array of computers.";
    if (actual.length !== expected.length) return "The route visits " + actual.length + " computers; the shortest visits " + expected.length + ".";
    if (actual[0] !== 1 || actual[actual.length - 1] !== n) return "The route must start at 1 and end at " + n + ".";
    const counts = pairCounts(edges, true);
    for (let i = 0; i + 1 < actual.length; i += 1) if (!counts.has(actual[i] + "," + actual[i + 1])) return actual[i] + " and " + actual[i + 1] + " are not connected.";
    return true;
  }
  function cycleAccept(edges, undirected, actual, expected, minimum) {
    if (expected === null) return actual === null || "There is no such cycle, return null.";
    if (!isIntList(actual)) return "Return the cycle as an array of nodes, first node repeated at the end.";
    if (actual.length < minimum + 1) return "A cycle needs at least " + minimum + " nodes plus the repeat.";
    if (actual[0] !== actual[actual.length - 1]) return "The last node must repeat the first.";
    const seen = new Set();
    for (let i = 0; i + 1 < actual.length; i += 1) { if (seen.has(actual[i])) return "Node " + actual[i] + " appears twice inside the cycle."; seen.add(actual[i]); }
    const counts = pairCounts(edges, undirected);
    for (let i = 0; i + 1 < actual.length; i += 1) if (!counts.has(actual[i] + "," + actual[i + 1])) return "There is no edge " + actual[i] + " → " + actual[i + 1] + ".";
    return true;
  }
  function roundTripAccept(args, actual, expected) { return cycleAccept(args[1], true, actual, expected, 3); }
  function roundTripIIAccept(args, actual, expected) { return cycleAccept(args[1], false, actual, expected, 1); }
  function monsterTimes(grid) {
    const rows = grid.length, cols = grid[0].length;
    const time = new Array(rows * cols).fill(-1);
    const queue = [];
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) if (grid[r][c] === "M") { time[r * cols + c] = 0; queue.push(r * cols + c); }
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head], cr = Math.floor(cell / cols), cc = cell % cols;
      const next = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
      for (let k = 0; k < 4; k += 1) {
        const nr = next[k][0], nc = next[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#" || time[nr * cols + nc] !== -1) continue;
        time[nr * cols + nc] = time[cell] + 1;
        queue.push(nr * cols + nc);
      }
    }
    return time;
  }
  function monstersAccept(args, actual, expected) {
    const grid = args[0], rows = grid.length, cols = grid[0].length;
    if (expected === null) return actual === null || "Escape is impossible, return null.";
    if (typeof actual !== "string") return "Return the moves as a string of U, D, L and R (empty when A already stands on the boundary).";
    if (actual.length > rows * cols) return "The path is longer than n × m moves.";
    const cells = gridWalk(grid, findCell(grid, "A"), actual);
    if (!cells) return "The path walks into a wall or off the grid.";
    const time = monsterTimes(grid);
    for (let t = 1; t < cells.length; t += 1) if (time[cells[t]] !== -1 && time[cells[t]] <= t) return "A monster reaches the square of move " + t + " first.";
    const last = cells[cells.length - 1], r = Math.floor(last / cols), c = last % cols;
    return (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) || "The path does not end on the boundary.";
  }
  function cycleFindingAccept(args, actual, expected) {
    const edges = args[1];
    if (expected === null) return actual === null || "There is no negative cycle, return null.";
    if (!isIntList(actual) || actual.length < 2) return "Return the cycle as an array of nodes, first node repeated at the end.";
    if (actual[0] !== actual[actual.length - 1]) return "The last node must repeat the first.";
    const cheapest = new Map();
    for (let i = 0; i < edges.length; i += 1) { const key = edges[i][0] + "," + edges[i][1]; if (!cheapest.has(key) || edges[i][2] < cheapest.get(key)) cheapest.set(key, edges[i][2]); }
    let sum = 0;
    for (let i = 0; i + 1 < actual.length; i += 1) { const key = actual[i] + "," + actual[i + 1]; if (!cheapest.has(key)) return "There is no edge " + actual[i] + " → " + actual[i + 1] + "."; sum += cheapest.get(key); }
    return sum < 0 || "That cycle has total weight " + sum + ", not negative.";
  }
  function courseScheduleAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (expected === null) return actual === null || "The requirements contain a cycle, return null.";
    if (!isIntList(actual) || actual.length !== n) return "Return every course exactly once.";
    const position = new Array(n + 1).fill(-1);
    for (let i = 0; i < n; i += 1) { if (actual[i] < 1 || actual[i] > n || position[actual[i]] !== -1) return "Course " + actual[i] + " is missing or repeated."; position[actual[i]] = i; }
    for (let i = 0; i < edges.length; i += 1) if (position[edges[i][0]] > position[edges[i][1]]) return "Course " + edges[i][0] + " must come before " + edges[i][1] + ".";
    return true;
  }
  function longestFlightRouteAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (expected === null) return actual === null || "There is no route, return null.";
    if (!isIntList(actual)) return "Return the route as an array of cities.";
    if (actual.length !== expected.length) return "The route visits " + actual.length + " cities; the longest visits " + expected.length + ".";
    if (actual[0] !== 1 || actual[actual.length - 1] !== n) return "The route must start at 1 and end at " + n + ".";
    const counts = pairCounts(edges, false);
    for (let i = 0; i + 1 < actual.length; i += 1) if (!counts.has(actual[i] + "," + actual[i + 1])) return "There is no flight " + actual[i] + " → " + actual[i + 1] + ".";
    return true;
  }
  function flightRoutesCheckAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (expected === null) return actual === null || "Every city reaches every other, return null.";
    if (!isIntList(actual) || actual.length !== 2 || actual[0] < 1 || actual[1] < 1 || actual[0] > n || actual[1] > n) return "Return [a, b] with b unreachable from a.";
    return !reachableFrom(directedLists(n, edges), actual[0])[actual[1]] || "City " + actual[1] + " is reachable from " + actual[0] + ".";
  }
  function planetsAndKingdomsAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (!isIntList(actual) || actual.length !== n) return "Return one kingdom label per planet.";
    const forward = new Map(), backward = new Map(), labels = new Set();
    let top = 0;
    for (let v = 0; v < n; v += 1) {
      if (actual[v] < 1) return "Labels start at 1.";
      labels.add(actual[v]);
      if (actual[v] > top) top = actual[v];
      if (forward.has(expected[v]) && forward.get(expected[v]) !== actual[v]) return "Planets " + (v + 1) + " and another of the same kingdom got different labels.";
      if (backward.has(actual[v]) && backward.get(actual[v]) !== expected[v]) return "Label " + actual[v] + " covers two different kingdoms.";
      forward.set(expected[v], actual[v]);
      backward.set(actual[v], expected[v]);
    }
    if (top !== labels.size) return "Labels must be 1..k with no gaps.";
    for (let i = 0; i < edges.length; i += 1) if (actual[edges[i][0] - 1] > actual[edges[i][1] - 1]) return "Teleporter " + edges[i][0] + " → " + edges[i][1] + " goes from a later label to an earlier one; number the kingdoms in topological order.";
    return true;
  }
  function giantPizzaAccept(args, actual, expected) {
    const wishes = args[0], m = args[1];
    if (expected === null) return actual === null || "No selection satisfies everyone, return null.";
    if (!Array.isArray(actual) || actual.length !== m || actual.some((s) => s !== "+" && s !== "-")) return "Return one '+' or '-' per topping.";
    for (let i = 0; i < wishes.length; i += 1) {
      const ok = wishes[i].some((literal) => actual[Math.abs(literal) - 1] === (literal > 0 ? "+" : "-"));
      if (!ok) return "Family member " + (i + 1) + " gets neither wish.";
    }
    return true;
  }
  function trailAccept(edges, undirected, actual, expected, start, end) {
    if (expected === null) return actual === null || "There is no such route, return null.";
    if (!isIntList(actual)) return "Return the route as an array of nodes.";
    if (actual.length !== edges.length + 1) return "The route must use every edge exactly once: " + (edges.length + 1) + " nodes.";
    if (actual[0] !== start || actual[actual.length - 1] !== end) return "The route must start at " + start + " and end at " + end + ".";
    const counts = pairCounts(edges, undirected);
    for (let i = 0; i + 1 < actual.length; i += 1) {
      const key = actual[i] + "," + actual[i + 1];
      if (!counts.get(key)) return "Edge " + actual[i] + " – " + actual[i + 1] + " is missing or already used.";
      counts.set(key, counts.get(key) - 1);
      if (undirected) counts.set(actual[i + 1] + "," + actual[i], counts.get(actual[i + 1] + "," + actual[i]) - 1);
    }
    return true;
  }
  function mailDeliveryAccept(args, actual, expected) { return trailAccept(args[1], true, actual, expected, 1, 1); }
  function teleportersPathAccept(args, actual, expected) { return trailAccept(args[1], false, actual, expected, 1, args[0]); }
  function deBruijnAccept(args, actual) {
    const n = args[0];
    if (typeof actual !== "string" || /[^01]/.test(actual)) return "Return a string of 0s and 1s.";
    if (actual.length !== (1 << n) + n - 1) return "The string must have length 2ⁿ + n − 1 = " + ((1 << n) + n - 1) + ".";
    const seen = new Set();
    for (let i = 0; i + n <= actual.length; i += 1) { const window = actual.slice(i, i + n); if (seen.has(window)) return "Substring " + window + " appears twice, so another is missing."; seen.add(window); }
    return true;
  }
  function knightsTourAccept(args, actual) {
    const x = args[0], y = args[1];
    if (!Array.isArray(actual) || actual.length !== 8 || actual.some((row) => !isIntList(row) || row.length !== 8)) return "Return an 8 × 8 array of move numbers.";
    const where = new Array(65).fill(null);
    for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) { const k = actual[r][c]; if (k < 1 || k > 64 || where[k]) return "Move numbers must be 1..64, each once."; where[k] = [r, c]; }
    if (actual[y - 1][x - 1] !== 1) return "Move 1 must be at the starting square.";
    for (let k = 1; k < 64; k += 1) { const dr = Math.abs(where[k][0] - where[k + 1][0]), dc = Math.abs(where[k][1] - where[k + 1][1]); if (!((dr === 1 && dc === 2) || (dr === 2 && dc === 1))) return "Move " + k + " to " + (k + 1) + " is not a knight move."; }
    return true;
  }
  function maxFlowAccept(args, actual, expected) {
    const n = args[0], edges = args[1], source = args[2], sink = args[3];
    if (!actual || typeof actual !== "object" || !Number.isFinite(actual.value) || !Array.isArray(actual.flows)) return "Return { value, flows } with one flow per edge.";
    if (actual.value !== expected.value) return "The flow value is " + actual.value + "; the maximum is " + expected.value + ".";
    if (actual.flows.length !== edges.length) return "flows needs one entry per edge.";
    const net = new Array(n + 1).fill(0);
    for (let i = 0; i < edges.length; i += 1) {
      const f = actual.flows[i];
      if (!Number.isFinite(f) || f < 0 || f > edges[i][2]) return "Edge " + i + " carries " + f + ", outside 0.." + edges[i][2] + ".";
      net[edges[i][0]] += f;
      net[edges[i][1]] -= f;
    }
    for (let v = 1; v <= n; v += 1) if (v !== source && v !== sink && net[v] !== 0) return "Flow is not conserved at node " + v + ".";
    return net[source] === actual.value || "The flow leaving the source does not equal value.";
  }
  function policeChaseAccept(args, actual, expected) {
    const n = args[0], streets = args[1];
    if (!Array.isArray(actual) || actual.some((s) => !isIntList(s) || s.length !== 2)) return "Return the streets to close as [a, b] pairs.";
    if (actual.length !== expected.length) return "You close " + actual.length + " streets; " + expected.length + " suffice.";
    const counts = pairCounts(streets, true);
    const closed = new Set();
    for (let i = 0; i < actual.length; i += 1) { const key = actual[i][0] + "," + actual[i][1]; if (!counts.has(key)) return "There is no street " + actual[i][0] + " – " + actual[i][1] + "."; closed.add(key); closed.add(actual[i][1] + "," + actual[i][0]); }
    const remaining = streets.filter((s) => !closed.has(s[0] + "," + s[1]));
    return !reachableFrom(undirectedLists(n, remaining), 1)[n] || "The harbour is still reachable after closing those streets.";
  }
  function schoolDanceAccept(args, actual, expected) {
    const pairs = args[2];
    if (!Array.isArray(actual) || actual.some((p) => !isIntList(p) || p.length !== 2)) return "Return the dancing pairs as [boy, girl].";
    if (actual.length !== expected.length) return "You formed " + actual.length + " pairs; " + expected.length + " are possible.";
    const allowed = pairCounts(pairs, false);
    const boys = new Set(), girls = new Set();
    for (let i = 0; i < actual.length; i += 1) {
      if (!allowed.has(actual[i][0] + "," + actual[i][1])) return "Boy " + actual[i][0] + " and girl " + actual[i][1] + " do not want to dance together.";
      if (boys.has(actual[i][0]) || girls.has(actual[i][1])) return "Someone dances twice.";
      boys.add(actual[i][0]); girls.add(actual[i][1]);
    }
    return true;
  }
  function distinctRoutesAccept(args, actual, expected) {
    const n = args[0], edges = args[1];
    if (!Array.isArray(actual) || actual.some((route) => !isIntList(route))) return "Return an array of routes, each an array of rooms.";
    if (actual.length !== expected.length) return "You found " + actual.length + " routes; " + expected.length + " are possible.";
    const counts = pairCounts(edges, false);
    for (let r = 0; r < actual.length; r += 1) {
      const route = actual[r];
      if (route.length < 2 || route[0] !== 1 || route[route.length - 1] !== n) return "Every route must start at 1 and end at " + n + ".";
      for (let i = 0; i + 1 < route.length; i += 1) { const key = route[i] + "," + route[i + 1]; if (!counts.get(key)) return "Teleporter " + route[i] + " → " + route[i + 1] + " is missing or used twice."; counts.set(key, counts.get(key) - 1); }
    }
    return true;
  }

  // brute forces: same shape as the reference answer so the accept checks can use them as `expected`
  function messageRouteBrute(n, edges) { const d = bfsDistance(undirectedLists(n, edges), 1, n); return d === -1 ? null : new Array(d + 1).fill(0); }
  function hasUndirectedCycle(n, edges) {
    const parent = []; for (let v = 0; v <= n; v += 1) parent.push(v);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (let i = 0; i < edges.length; i += 1) { const a = find(edges[i][0]), b = find(edges[i][1]); if (a === b) return true; parent[a] = b; }
    return false;
  }
  function roundTripBrute(n, edges) { return hasUndirectedCycle(n, edges) ? [] : null; }
  function hasDirectedCycle(n, edges) {
    const adjacency = directedLists(n, edges);
    const colour = new Array(n + 1).fill(0);
    const visit = (v) => { colour[v] = 1; for (const u of adjacency[v]) { if (colour[u] === 1 || (colour[u] === 0 && visit(u))) return true; } colour[v] = 2; return false; };
    for (let v = 1; v <= n; v += 1) if (colour[v] === 0 && visit(v)) return true;
    return false;
  }
  function roundTripIIBrute(n, edges) { return hasDirectedCycle(n, edges) ? [] : null; }
  function courseScheduleBrute(n, edges) { return hasDirectedCycle(n, edges) ? null : []; }
  function monstersBrute(grid) {
    const rows = grid.length, cols = grid[0].length, total = rows * cols;
    const time = monsterTimes(grid);
    const start = findCell(grid, "A");
    const seen = new Set([start + ",0"]);
    const queue = [[start, 0]];
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head][0], t = queue[head][1];
      const r = Math.floor(cell / cols), c = cell % cols;
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) return "";
      if (t >= total) continue;
      const next = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      for (let k = 0; k < 4; k += 1) {
        const nr = next[k][0], nc = next[k][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue;
        const id = nr * cols + nc;
        if (time[id] !== -1 && time[id] <= t + 1) continue;
        const key = id + "," + (t + 1);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push([id, t + 1]);
      }
    }
    return null;
  }
  function dijkstraSquare(n, adjacency, source) {
    const distance = new Array(n + 1).fill(Infinity), done = new Array(n + 1).fill(false);
    distance[source] = 0;
    for (let round = 0; round < n; round += 1) {
      let v = -1;
      for (let u = 1; u <= n; u += 1) if (!done[u] && distance[u] !== Infinity && (v === -1 || distance[u] < distance[v])) v = u;
      if (v === -1) break;
      done[v] = true;
      for (const [u, w] of adjacency[v]) if (distance[v] + w < distance[u]) distance[u] = distance[v] + w;
    }
    return distance;
  }
  function weightedLists(n, edges, undirected) {
    const adjacency = [];
    for (let v = 0; v <= n; v += 1) adjacency.push([]);
    for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); if (undirected) adjacency[edges[i][1]].push([edges[i][0], edges[i][2]]); }
    return adjacency;
  }
  function shortestRoutesIIBrute(n, edges, queries) {
    const adjacency = weightedLists(n, edges, true);
    return queries.map((q) => { const d = dijkstraSquare(n, adjacency, q[0])[q[1]]; return d === Infinity ? -1 : d; });
  }
  function highScoreBrute(n, edges) {
    const limit = 40 * n;
    let current = new Array(n + 1).fill(-Infinity);
    current[1] = 0;
    let bestShort = -Infinity, bestLong = -Infinity;
    for (let step = 0; step <= limit; step += 1) {
      if (current[n] !== -Infinity) { if (step <= 20 * n) bestShort = Math.max(bestShort, current[n]); bestLong = Math.max(bestLong, current[n]); }
      const next = new Array(n + 1).fill(-Infinity);
      for (const [a, b, x] of edges) if (current[a] !== -Infinity && current[a] + x > next[b]) next[b] = current[a] + x;
      current = next;
    }
    return bestLong > bestShort ? -1 : bestShort;
  }
  function flightDiscountBrute(n, edges) {
    let best = Infinity;
    for (let i = 0; i < edges.length; i += 1) {
      const copy = edges.map((e, j) => (j === i ? [e[0], e[1], Math.floor(e[2] / 2)] : e));
      best = Math.min(best, dijkstraSquare(n, weightedLists(n, copy, false), 1)[n]);
    }
    return best;
  }
  function cycleFindingBrute(n, edges) {
    const adjacency = weightedLists(n, edges, false);
    const onPath = new Array(n + 1).fill(false);
    let found = false;
    const visit = (v, sum, start) => {
      if (found) return;
      for (const [u, w] of adjacency[v]) {
        if (u === start) { if (sum + w < 0) found = true; }
        else if (!onPath[u] && u > start) { onPath[u] = true; visit(u, sum + w, start); onPath[u] = false; }
      }
    };
    for (let s = 1; s <= n && !found; s += 1) { onPath[s] = true; visit(s, 0, s); onPath[s] = false; }
    return found ? [] : null;
  }
  function flightRoutesBrute(n, edges, k) {
    let current = new Array(n + 1).fill(null).map(() => []);
    current[1] = [0];
    const arrivals = [];
    for (let step = 0; step < 24; step += 1) {
      arrivals.push(...current[n]);
      const next = new Array(n + 1).fill(null).map(() => []);
      for (const [a, b, c] of edges) for (const cost of current[a]) next[b].push(cost + c);
      for (let v = 1; v <= n; v += 1) { next[v].sort((p, q) => p - q); next[v] = next[v].slice(0, 60); }
      current = next;
    }
    arrivals.sort((p, q) => p - q);
    return arrivals.slice(0, k);
  }
  function longestFlightRouteBrute(n, edges) {
    const adjacency = directedLists(n, edges);
    let best = 0;
    const visit = (v, length) => { if (v === n) { best = Math.max(best, length); return; } for (const u of adjacency[v]) visit(u, length + 1); };
    visit(1, 1);
    return best === 0 ? null : new Array(best).fill(0);
  }
  function gameRoutesBrute(n, edges) {
    const adjacency = directedLists(n, edges);
    let count = 0;
    const visit = (v) => { if (v === n) { count += 1; return; } for (const u of adjacency[v]) visit(u); };
    visit(1);
    return count % 1000000007;
  }
  function investigationBrute(n, edges) {
    const adjacency = weightedLists(n, edges, false);
    const onPath = new Array(n + 1).fill(false);
    let price = Infinity, count = 0, fewest = Infinity, most = 0;
    const visit = (v, cost, flights) => {
      if (v === n) {
        if (cost < price) { price = cost; count = 1; fewest = flights; most = flights; }
        else if (cost === price) { count += 1; fewest = Math.min(fewest, flights); most = Math.max(most, flights); }
        return;
      }
      for (const [u, w] of adjacency[v]) if (!onPath[u]) { onPath[u] = true; visit(u, cost + w, flights + 1); onPath[u] = false; }
    };
    onPath[1] = true;
    visit(1, 0, 0);
    return [price, count % 1000000007, fewest, most];
  }
  function planetsQueriesIBrute(t, queries) { return queries.map((q) => { let v = q[0]; for (let i = 0; i < q[1]; i += 1) v = t[v - 1]; return v; }); }
  function planetsQueriesIIBrute(t, queries) {
    return queries.map((q) => { let v = q[0], steps = 0; const seen = new Set(); while (v !== q[1]) { if (seen.has(v)) return -1; seen.add(v); v = t[v - 1]; steps += 1; } return steps; });
  }
  function planetsCyclesBrute(t) {
    const out = [];
    for (let s = 1; s <= t.length; s += 1) { const seen = new Set(); let v = s, steps = 0; while (!seen.has(v)) { seen.add(v); v = t[v - 1]; steps += 1; } out.push(steps); }
    return out;
  }
  function roadReparationBrute(n, edges) {
    let best = null;
    for (let mask = 0; mask < (1 << edges.length); mask += 1) {
      const chosen = edges.filter((e, i) => mask & (1 << i));
      const seen = reachableFrom(undirectedLists(n, chosen), 1);
      let all = true;
      for (let v = 1; v <= n; v += 1) if (!seen[v]) all = false;
      if (!all) continue;
      const cost = chosen.reduce((sum, e) => sum + e[2], 0);
      if (best === null || cost < best) best = cost;
    }
    return best;
  }
  function roadConstructionBrute(n, edges) {
    const out = [];
    for (let i = 1; i <= edges.length; i += 1) {
      const adjacency = undirectedLists(n, edges.slice(0, i));
      const seen = new Array(n + 1).fill(false);
      let components = 0, largest = 0;
      for (let s = 1; s <= n; s += 1) {
        if (seen[s]) continue;
        components += 1;
        const queue = [s]; seen[s] = true;
        for (let head = 0; head < queue.length; head += 1) for (const u of adjacency[queue[head]]) if (!seen[u]) { seen[u] = true; queue.push(u); }
        largest = Math.max(largest, queue.length);
      }
      out.push([components, largest]);
    }
    return out;
  }
  function flightRoutesCheckBrute(n, edges) {
    const adjacency = directedLists(n, edges);
    for (let s = 1; s <= n; s += 1) { const seen = reachableFrom(adjacency, s); for (let v = 1; v <= n; v += 1) if (!seen[v]) return []; }
    return null;
  }
  function planetsAndKingdomsBrute(n, edges) {
    const adjacency = directedLists(n, edges);
    const reach = [];
    for (let v = 0; v <= n; v += 1) reach.push(v === 0 ? null : reachableFrom(adjacency, v));
    const label = new Array(n).fill(0);
    let count = 0;
    for (let v = 1; v <= n; v += 1) {
      if (label[v - 1]) continue;
      count += 1;
      for (let u = v; u <= n; u += 1) if (!label[u - 1] && reach[v][u] && reach[u][v]) label[u - 1] = count;
    }
    return label;
  }
  function giantPizzaBrute(wishes, m) {
    for (let mask = 0; mask < (1 << m); mask += 1) {
      const ok = wishes.every((wish) => wish.some((literal) => ((mask >> (Math.abs(literal) - 1)) & 1) === (literal > 0 ? 1 : 0)));
      if (ok) return [];
    }
    return null;
  }
  function coinCollectorBrute(n, edges, coins) {
    const adjacency = directedLists(n, edges);
    let best = 0;
    const seen = new Set();
    for (let s = 1; s <= n; s += 1) {
      const queue = [[s, 1 << (s - 1)]];
      seen.clear();
      seen.add(s + "," + (1 << (s - 1)));
      for (let head = 0; head < queue.length; head += 1) {
        const v = queue[head][0], mask = queue[head][1];
        let total = 0;
        for (let u = 1; u <= n; u += 1) if (mask & (1 << (u - 1))) total += coins[u - 1];
        best = Math.max(best, total);
        for (const u of adjacency[v]) { const next = mask | (1 << (u - 1)); const key = u + "," + next; if (!seen.has(key)) { seen.add(key); queue.push([u, next]); } }
      }
    }
    return best;
  }
  function eulerTrailExists(n, edges, undirected, start, end) {
    if (edges.length === 0) return start === end;
    const outdeg = new Array(n + 1).fill(0), indeg = new Array(n + 1).fill(0);
    for (const [a, b] of edges) { outdeg[a] += 1; indeg[b] += 1; if (undirected) { outdeg[b] += 1; indeg[a] += 1; } }
    for (let v = 1; v <= n; v += 1) {
      if (undirected) { if (outdeg[v] % 2 !== 0) return false; }
      else if (v === start && start !== end) { if (outdeg[v] !== indeg[v] + 1) return false; }
      else if (v === end && start !== end) { if (indeg[v] !== outdeg[v] + 1) return false; }
      else if (outdeg[v] !== indeg[v]) return false;
    }
    const seen = reachableFrom(undirected ? undirectedLists(n, edges) : directedLists(n, edges), start);
    return edges.every(([a, b]) => seen[a] && seen[b]);
  }
  function mailDeliveryBrute(n, edges) { return eulerTrailExists(n, edges, true, 1, 1) ? [] : null; }
  function teleportersPathBrute(n, edges) { return eulerTrailExists(n, edges, false, 1, n) ? [] : null; }
  function hamiltonianFlightsBrute(n, edges) {
    const adjacency = directedLists(n, edges);
    let count = 0;
    const seen = new Array(n + 1).fill(false);
    const visit = (v, visited) => {
      if (visited === n) { if (v === n) count += 1; return; }
      if (v === n) return;
      for (const u of adjacency[v]) if (!seen[u]) { seen[u] = true; visit(u, visited + 1); seen[u] = false; }
    };
    seen[1] = true;
    visit(1, 1);
    return count % 1000000007;
  }
  function minCutValue(n, edges, source, sink) {
    let best = Infinity;
    for (let mask = 0; mask < (1 << n); mask += 1) {
      if (!(mask & (1 << (source - 1))) || (mask & (1 << (sink - 1)))) continue;
      let cut = 0;
      for (const [a, b, c] of edges) if ((mask & (1 << (a - 1))) && !(mask & (1 << (b - 1)))) cut += c;
      best = Math.min(best, cut);
    }
    return best;
  }
  function maxFlowBrute(n, edges, source, sink) { return { value: minCutValue(n, edges, source, sink), flows: null }; }
  function downloadSpeedBrute(n, edges) { return minCutValue(n, edges, 1, n); }
  function policeChaseBrute(n, streets) {
    const edges = [];
    for (const [a, b] of streets) edges.push([a, b, 1], [b, a, 1]);
    return new Array(minCutValue(n, edges, 1, n)).fill(0);
  }
  function schoolDanceBrute(n, m, pairs) {
    let best = 0;
    for (let mask = 0; mask < (1 << pairs.length); mask += 1) {
      const boys = new Set(), girls = new Set();
      let ok = true, size = 0;
      for (let i = 0; i < pairs.length && ok; i += 1) {
        if (!(mask & (1 << i))) continue;
        if (boys.has(pairs[i][0]) || girls.has(pairs[i][1])) ok = false;
        boys.add(pairs[i][0]); girls.add(pairs[i][1]); size += 1;
      }
      if (ok) best = Math.max(best, size);
    }
    return new Array(best).fill(0);
  }
  function distinctRoutesBrute(n, edges) { return new Array(minCutValue(n, edges.map((e) => [e[0], e[1], 1]), 1, n)).fill(0); }

  // ------------------------------------------------------------------ generators
  function smallGraph(seed, n, m, options) {
    const opts = options || {};
    const next = rng(seed);
    const edges = [];
    const seen = new Set();
    let guard = 0;
    while (edges.length < m && guard < 50 * m + 50) {
      guard += 1;
      let a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (a === b && !opts.selfLoops) continue;
      if (opts.acyclic && a > b) { const swap = a; a = b; b = swap; }
      if (opts.acyclic && a === b) continue;
      const key = opts.undirected ? Math.min(a, b) + "," + Math.max(a, b) : a + "," + b;
      if (opts.distinct && seen.has(key)) continue;
      seen.add(key);
      const edge = [a, b];
      if (opts.weights) edge.push(opts.weights[0] + Math.floor(next() * (opts.weights[1] - opts.weights[0] + 1)));
      edges.push(edge);
    }
    return edges;
  }
  function bigGraph(seed, n, m, options) {
    const opts = options || {};
    const a = randomInts(seed, m, 1, n), b = randomInts(seed + 1, m, 1, n);
    const w = opts.weights ? randomInts(seed + 2, m, opts.weights[0], opts.weights[1]) : null;
    const edges = [];
    for (let i = 0; i < m; i += 1) {
      let p = a[i], q = b[i];
      if (p === q) q = q % n + 1;
      if (opts.acyclic && p > q) { const swap = p; p = q; q = swap; }
      edges.push(w ? [p, q, w[i]] : [p, q]);
    }
    if (opts.chain) for (let v = 1; v < n; v += 1) edges.push(w ? [v, v + 1, opts.chainWeight || 1000000000] : [v, v + 1]);
    return edges;
  }
  function randomWalkEdges(seed, n, m, closed) {
    const next = rng(seed);
    const edges = [];
    let current = 1;
    for (let i = 0; i < m - 1; i += 1) {
      let to = 1 + Math.floor(next() * n);
      if (to === current) to = to % n + 1;
      edges.push([current, to]);
      current = to;
    }
    const last = closed ? 1 : n;
    if (current === last) { const mid = last === 1 ? 2 : 1; edges[edges.length - 1][1] = mid; edges.push([mid, last]); }
    else edges.push([current, last]);
    return edges;
  }
  function randomMonsterGrid(seed, rows, cols) {
    const next = rng(seed);
    const grid = [];
    for (let r = 0; r < rows; r += 1) {
      let row = "";
      for (let c = 0; c < cols; c += 1) { const roll = next(); row += roll < 0.2 ? "#" : (roll < 0.2005 ? "M" : "."); }
      grid.push(row);
    }
    const mid = Math.floor(rows / 2);
    grid[mid] = grid[mid].slice(0, Math.floor(cols / 2)) + "A" + grid[mid].slice(Math.floor(cols / 2) + 1);
    return grid;
  }
  function satisfiableWishes(seed, count, m) {
    const next = rng(seed);
    const truth = [];
    for (let x = 0; x < m; x += 1) truth.push(next() < 0.5);
    const wishes = [];
    for (let i = 0; i < count; i += 1) {
      const x = 1 + Math.floor(next() * m), y = 1 + Math.floor(next() * m);
      const sx = truth[x - 1] ? 1 : -1;
      const sy = next() < 0.5 ? 1 : -1;
      wishes.push(next() < 0.5 ? [sx * x, sy * y] : [sy * y, sx * x]);
    }
    return wishes;
  }
  const ROOMS_BIG = lazy(() => randomGrid(31, 1000, 1000, "#", "#", ".", 0.3));
  const LAB_BIG = lazy(() => (() => { const grid = randomGrid(32, 1000, 1000, "#", "#", ".", 0.25); grid[0] = "A" + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "B"; return grid; })());
  const ROADS_BIG_EDGES = lazy(() => bigGraph(33, 100000, 100000));
  const TEAMS_BIG_EDGES = lazy(() => (() => { const a = randomInts(35, BIG, 1, 50000), b = randomInts(36, BIG, 1, 50000); return a.map((v, i) => [2 * v - 1, 2 * b[i]]); })());
  const ROUTES_BIG_EDGES = lazy(() => bigGraph(37, 100000, BIG, { weights: [1, 1000000000], chain: true }));
  const UNDIRECTED_BIG = lazy(() => bigGraph(40, 100000, BIG));
  const DIRECTED_BIG = lazy(() => bigGraph(43, 100000, BIG));
  const DAG_BIG = lazy(() => bigGraph(46, 100000, BIG, { acyclic: true, chain: true }));
  const DAG_WEIGHTED_BIG = lazy(() => bigGraph(49, 2500, 5000, { acyclic: true, weights: [-1000000000, 1000000000], chain: true, chainWeight: 1 }));
  const CYCLE_BIG = lazy(() => bigGraph(52, 2500, 5000, { weights: [-1000000000, 1000000000] }));
  const FLIGHT_BIG = lazy(() => bigGraph(55, 50000, 100000, { weights: [1, 1000000000], chain: true }));
  const DENSE_500 = lazy(() => bigGraph(58, 500, 5000, { weights: [1, 1000000000] }));
  const QUERIES_500 = lazy(() => { const a = randomInts(61, 100000, 1, 500), b = randomInts(62, 100000, 1, 500); return a.map((v, i) => [v, b[i]]); });
  const TELEPORTERS_BIG = lazy(() => randomInts(63, BIG, 1, BIG));
  const PLANET_QUERIES_BIG = lazy(() => { const x = randomInts(64, BIG, 1, BIG), k = randomInts(65, BIG, 0, 1000000000); return x.map((v, i) => [v, k[i]]); });
  const PLANET_PAIRS_BIG = lazy(() => { const a = randomInts(66, BIG, 1, BIG), b = randomInts(67, BIG, 1, BIG); return a.map((v, i) => [v, b[i]]); });
  const MONSTER_BIG = lazy(() => randomMonsterGrid(68, 1000, 1000));
  const MAIL_BIG = lazy(() => randomWalkEdges(69, 100000, BIG, true));
  const TELEPORT_PATH_BIG = lazy(() => randomWalkEdges(70, 100000, BIG, false));
  const WISHES_BIG = lazy(() => satisfiableWishes(71, 100000, 100000));
  const COINS_BIG = lazy(() => randomInts(72, 100000, 1, 1000000000));
  const FLOW_BIG = lazy(() => bigGraph(73, 500, 1000, { weights: [1, 1000000000] }));
  const STREETS_BIG = lazy(() => bigGraph(76, 500, 1000));
  const DANCE_BIG = lazy(() => { const a = randomInts(79, 1000, 1, 500), b = randomInts(80, 1000, 1, 500); return a.map((v, i) => [v, b[i]]); });
  const ROUTES_500 = lazy(() => smallGraph(81, 500, 1000, { distinct: true }));
  const HAMILTON_16 = lazy(() => { const edges = []; for (let a = 1; a <= 16; a += 1) for (let b = 1; b <= 16; b += 1) if (a !== b) edges.push([a, b]); return edges; });

  const viaBrute = (accept, brute) => (args, out) => accept(args, out, brute.apply(null, JSON.parse(JSON.stringify(args)))) === true;
  const diamondChain = (layers) => { const edges = []; let n = 1; for (let i = 0; i < layers; i += 1) { edges.push([n, n + 1, 1], [n, n + 2, 1], [n + 1, n + 3, 1], [n + 2, n + 3, 1]); n += 3; } return [n, edges]; };

  const GRAPHS = [
    {
      id: "counting-rooms", track: "graphs", title: "Counting Rooms", cses: { id: 1192, name: "Counting Rooms" },
      goal: "Count the connected regions of floor cells.",
      concept: "Flood fill: every unvisited floor cell starts a new room; a DFS or BFS marks everything reachable from it. Use an explicit stack, recursion overflows on 1000 × 1000.",
      functionName: "countingRooms", signature: "countingRooms(grid) → number",
      starterSource: starter("countingRooms", "grid", "'.' is floor, '#' is wall. Four-directional moves."),
      solve: countingRooms, comparator: "scalar",
      reference: book("12.1", "Depth-first search · connectivity"),
      scene: { kind: "algo", view: "grid", handles: preset("counting-rooms", ["CSES sample", "one room", "checkerboard"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("eight-neighbours", "Rooms connect through edges only, not corners.", function countingRooms(grid) { const rows = grid.length, cols = grid[0].length; const seen = new Uint8Array(rows * cols); let rooms = 0; const stack = []; for (let r = 0; r < rows; r += 1) { for (let c = 0; c < cols; c += 1) { if (grid[r][c] !== "." || seen[r * cols + c]) continue; rooms += 1; seen[r * cols + c] = 1; stack.push(r * cols + c); while (stack.length) { const cell = stack.pop(); const cr = Math.floor(cell / cols), cc = cell % cols; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const nr = cr + dr, nc = cc + dc; if ((dr === 0 && dc === 0) || nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== "." || seen[nr * cols + nc]) continue; seen[nr * cols + nc] = 1; stack.push(nr * cols + nc); } } } } return rooms; }),
        diagnosis("counts-cells", "That counts floor cells; a room is a whole connected region.", function countingRooms(grid) { let count = 0; for (let r = 0; r < grid.length; r += 1) for (let c = 0; c < grid[r].length; c += 1) if (grid[r][c] === ".") count += 1; return count; }),
      ],
      hints: ["Scan every cell; an unvisited floor cell means a new room.", "Flood from it with a stack, marking cells as seen.", "Only the four edge neighbours count."],
      cases: [
        example([["########", "#..#...#", "####.#.#", "#..#...#", "########"]], 3, "CSES sample"),
        example([["."]], 1, "one cell"),
        example([["#"]], 0, "no floor"),
        example([[".#.", "#.#", ".#."]], 5, "checkerboard"),
        hidden("1000 × 1000 grid, time limit", () => [ROOMS_BIG()]),
      ],
    },
    {
      id: "labyrinth", track: "graphs", title: "Labyrinth", cses: { id: 1193, name: "Labyrinth (distance)" },
      goal: "Shortest number of steps from A to B, or −1.",
      concept: "Breadth-first search visits cells in order of distance, so the first time B is reached is the shortest path. Depth-first search does not have that property.",
      functionName: "labyrinth", signature: "labyrinth(grid) → number",
      starterSource: starter("labyrinth", "grid", "Queue starting at A; distance array; four neighbours; stop when B is dequeued."),
      solve: labyrinth, comparator: "scalar",
      reference: book("12.2", "Breadth-first search"),
      scene: { kind: "algo", view: "grid", handles: preset("labyrinth", ["CSES sample", "straight", "blocked"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("dfs-distance", "A depth-first walk finds a path, not the shortest one; use a queue.", function labyrinth(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const seen = new Uint8Array(rows * cols); const stack = [[start, 0]]; seen[start] = 1; while (stack.length) { const top = stack.pop(); const cell = top[0], steps = top[1]; if (cell === goal) return steps; const cr = Math.floor(cell / cols), cc = cell % cols; const next = [[cr, cc + 1], [cr, cc - 1], [cr + 1, cc], [cr - 1, cc]]; for (let k = 0; k < 4; k += 1) { const nr = next[k][0], nc = next[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (seen[id]) continue; seen[id] = 1; stack.push([id, steps + 1]); } } return -1; }),
        diagnosis("eight-neighbours", "Diagonal steps are not allowed.", function labyrinth(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const distance = new Int32Array(rows * cols).fill(-1); const queue = [start]; distance[start] = 0; let head = 0; while (head < queue.length) { const cell = queue[head]; head += 1; if (cell === goal) return distance[cell]; const cr = Math.floor(cell / cols), cc = cell % cols; for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const nr = cr + dr, nc = cc + dc; if ((dr === 0 && dc === 0) || nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (distance[id] !== -1) continue; distance[id] = distance[cell] + 1; queue.push(id); } } return -1; }),
      ],
      hints: ["Find A and B; distance[A] = 0, everything else −1.", "Pop from the front of the queue, push unvisited free neighbours with distance + 1.", "Return distance[B] when B comes out of the queue; −1 if the queue empties."],
      cases: [
        example([["########", "#.A#...#", "#.##.#B#", "#......#", "########"]], 9, "CSES sample"),
        example([["AB"]], 1, "adjacent"),
        example([["A#B"]], -1, "blocked"),
        example([["A.", ".B"]], 2, "diagonal needs two steps"),
        hidden("1000 × 1000 grid, time limit", () => [LAB_BIG()]),
      ],
    },
    {
      id: "labyrinth-path", title: "Labyrinth: the Path", cses: { id: 1193, name: "Labyrinth (path)" },
      goal: "The moves of a shortest path from A to B as a string of U, D, L, R (null when B is unreachable). CSES accepts any shortest path; this lab tries neighbours in the order U, D, L, R.",
      concept: "Remember, for every cell, the cell it was discovered from and the move that did it. Walking those parent pointers back from B and reversing them recovers one shortest path.",
      functionName: "labyrinthPath", signature: "labyrinthPath(grid) → string or null",
      starterSource: starter("labyrinthPath", "grid", "BFS with parent[cell] and move[cell]; from B follow parents back to A and reverse the collected moves."),
      solve: labyrinthPath, comparator: "deep", accept: labyrinthPathAccept, check: (args, out) => labyrinthPathAccept(args, out, labyrinth(args[0]) === -1 ? null : new Array(labyrinth(args[0])).fill("")) === true, small: (round) => [smallMaze(1200 + round, 2 + (round % 5), 2 + ((round * 3) % 6))],
      reference: book("12.2", "Breadth-first search · shortest paths"),
      presets: { "CSES sample": { a: ["########", "#.A#...#", "#.##.#B#", "#......#", "########"] }, straight: { a: ["A......B"] }, blocked: { a: ["A.#.B", "..#..", "..#.."] } },
      scene: { kind: "algo", view: "grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("dfs-path", "A depth-first walk reaches B by some path, rarely the shortest one; use a queue.", function labyrinthPath(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const parent = new Int32Array(rows * cols).fill(-1); const move = new Array(rows * cols).fill(""); const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]]; const stack = [start]; parent[start] = start; while (stack.length) { const cell = stack.pop(); if (cell === goal) break; const cr = Math.floor(cell / cols), cc = cell % cols; for (let k = 0; k < 4; k += 1) { const nr = cr + steps[k][0], nc = cc + steps[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (parent[id] !== -1) continue; parent[id] = cell; move[id] = steps[k][2]; stack.push(id); } } if (parent[goal] === -1) return null; const out = []; for (let cell = goal; cell !== start; cell = parent[cell]) out.push(move[cell]); return out.reverse().join(""); }),
        diagnosis("moves-not-reversed", "Parent pointers are walked from B back to A, so the collected moves must be reversed.", function labyrinthPath(grid) { const rows = grid.length, cols = grid[0].length; let start = -1, goal = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "A") start = r * cols + c; if (grid[r][c] === "B") goal = r * cols + c; } const parent = new Int32Array(rows * cols).fill(-1); const move = new Array(rows * cols).fill(""); const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]]; const queue = [start]; parent[start] = start; for (let head = 0; head < queue.length; head += 1) { const cell = queue[head]; if (cell === goal) break; const cr = Math.floor(cell / cols), cc = cell % cols; for (let k = 0; k < 4; k += 1) { const nr = cr + steps[k][0], nc = cc + steps[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (parent[id] !== -1) continue; parent[id] = cell; move[id] = steps[k][2]; queue.push(id); } } if (parent[goal] === -1) return null; const out = []; for (let cell = goal; cell !== start; cell = parent[cell]) out.push(move[cell]); return out.join(""); }),
      ],
      hints: ["BFS from A; when a neighbour is discovered store parent[neighbour] = cell and move[neighbour] = the letter.", "If B was never discovered return null.", "Walk from B to A through parent, collecting move letters, then reverse and join."],
      cases: [
        run(labyrinthPath, [["########", "#.A#...#", "#.##.#B#", "#......#", "########"]], "CSES sample (canonical order)"),
        example([["AB"]], "R", "one step"),
        example([["A#B"]], null, "blocked"),
        run(labyrinthPath, [["A..", "##.", "B.."]], "around the wall"),
        hidden("1000 × 1000 grid, time limit", () => [LAB_BIG()]),
      ],
    },
    {
      id: "building-roads", track: "graphs", title: "Building Roads", cses: { id: 1666, name: "Building Roads" },
      goal: "List roads that connect all components; this lab connects consecutive component representatives (the smallest node of each component).",
      concept: "Components are the whole story: k components need k − 1 roads. Union-find or a DFS per unvisited node finds them.",
      functionName: "buildingRoads", signature: "buildingRoads(n, edges) → [[a, b], …]",
      starterSource: starter("buildingRoads", "n, edges", "Find the smallest node of every component in ascending order; road i joins representative i to representative i + 1."),
      solve: buildingRoads, comparator: "deep",
      reference: book("12.3", "Applications · connectivity check"),
      scene: { kind: "algo", view: "graph", handles: preset("building-roads", ["CSES sample", "three islands", "connected"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("star-from-first", "CSES accepts any tree of roads, but this lab expects consecutive representatives so answers can be compared.", function buildingRoads(n, edges) { const parent = new Array(n + 1); for (let i = 0; i <= n; i += 1) parent[i] = i; const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }; for (let i = 0; i < edges.length; i += 1) { const ra = find(edges[i][0]), rb = find(edges[i][1]); if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb); } const representatives = []; for (let v = 1; v <= n; v += 1) if (find(v) === v) representatives.push(v); const roads = []; for (let i = 1; i < representatives.length; i += 1) roads.push([representatives[0], representatives[i]]); return roads; }),
        diagnosis("ignores-edges", "Existing roads already connect cities; only separate components need a new road.", function buildingRoads(n, edges) { const roads = []; for (let v = 1; v < n; v += 1) roads.push([v, v + 1]); return roads; }),
      ],
      hints: ["Union-find: attach the larger root under the smaller one so each root is its component's smallest node.", "Collect nodes that are their own root, in increasing order.", "Join consecutive representatives."],
      cases: [
        example([4, [[1, 2], [3, 4]]], [[1, 3]], "CSES sample"),
        example([3, []], [[1, 2], [2, 3]], "no roads yet"),
        example([3, [[1, 2], [2, 3]]], [], "already connected"),
        example([5, [[2, 3], [4, 5]]], [[1, 2], [2, 4]], "three components"),
        hidden("n = 100 000, m = 100 000, time limit", () => [100000, ROADS_BIG_EDGES()]),
      ],
    },
    {
      id: "message-route", title: "Message Route", cses: { id: 1667, name: "Message Route" },
      goal: "A shortest route from computer 1 to computer n as an array of computers, or null when there is none. Any shortest route is accepted.",
      concept: "Breadth-first search on a graph is the labyrinth BFS with adjacency lists instead of grid neighbours; parent pointers give the route back.",
      functionName: "messageRoute", signature: "messageRoute(n, edges) → number[] or null",
      starterSource: starter("messageRoute", "n, edges", "Undirected edges [a, b]. BFS from 1 with parent[]; stop at n; walk parents back and reverse."),
      solve: messageRoute, comparator: "deep", accept: messageRouteAccept, check: viaBrute(messageRouteAccept, messageRouteBrute), small: (round) => [4 + (round % 5), smallGraph(1300 + round, 4 + (round % 5), 2 + (round % 7), { undirected: true, distinct: true })],
      reference: book("12.2", "Breadth-first search"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [1, 4], [2, 3], [5, 4]] }, "no route": { a: 4, b: [[1, 2], [3, 4]] }, "direct link": { a: 3, b: [[1, 2], [2, 3], [1, 3]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("dfs-route", "A depth-first route is a route, not the shortest one; use a queue.", function messageRoute(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); parent[1] = 1; const stack = [1]; while (stack.length) { const v = stack.pop(); if (v === n) break; const list = adjacency[v]; for (let k = list.length - 1; k >= 0; k -= 1) { const u = list[k]; if (parent[u] !== 0) continue; parent[u] = v; stack.push(u); } } if (parent[n] === 0) return null; const path = []; for (let v = n; v !== 1; v = parent[v]) path.push(v); path.push(1); return path.reverse(); }),
        diagnosis("route-reversed", "The parent walk runs from n back to 1; reverse it so the route starts at 1.", function messageRoute(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0); parent[1] = 1; const queue = [1]; for (let head = 0; head < queue.length; head += 1) { const v = queue[head]; if (v === n) break; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (parent[u] !== 0) continue; parent[u] = v; queue.push(u); } } if (parent[n] === 0) return null; const path = []; for (let v = n; v !== 1; v = parent[v]) path.push(v); path.push(1); return path; }),
      ],
      hints: ["Adjacency lists in both directions; parent[1] = 1 marks the start as seen.", "BFS: pop from the front, push unseen neighbours with parent = current.", "If parent[n] is still 0 return null; else walk n → … → 1 and reverse."],
      cases: [
        run(messageRoute, [5, [[1, 2], [1, 3], [1, 4], [2, 3], [5, 4]]], "CSES sample"),
        example([4, [[1, 2], [3, 4]]], null, "no route"),
        example([3, [[1, 2], [2, 3], [1, 3]]], [1, 3], "direct link"),
        example([2, [[1, 2]]], [1, 2], "two computers"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, UNDIRECTED_BIG()]),
      ],
    },
    {
      id: "building-teams", track: "graphs", title: "Building Teams", cses: { id: 1668, name: "Building Teams" },
      goal: "Assign teams 1 and 2 so that no friends share a team, or null; the smallest node of each component gets team 1.",
      concept: "Bipartite check by BFS colouring: neighbours get the opposite colour, and a neighbour that already has your colour proves an odd cycle.",
      functionName: "buildingTeams", signature: "buildingTeams(n, edges) → array of length n or null",
      starterSource: starter("buildingTeams", "n, edges"),
      solve: buildingTeams, comparator: "deep",
      reference: book("12.3", "Applications · bipartiteness check"),
      scene: { kind: "algo", view: "graph", handles: preset("building-teams", ["CSES sample", "triangle", "square"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-conflict-check", "When a coloured neighbour has the same colour there is no valid split; return null.", function buildingTeams(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const team = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (team[s]) continue; team[s] = 1; const queue = [s]; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); } } } } return team.slice(1); }),
        diagnosis("starts-with-two", "This lab gives team 1 to the first node of each component.", function buildingTeams(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const team = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (team[s]) continue; team[s] = 2; const queue = [s]; let head = 0; while (head < queue.length) { const v = queue[head]; head += 1; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (team[u] === 0) { team[u] = 3 - team[v]; queue.push(u); } else if (team[u] === team[v]) return null; } } } return team.slice(1); }),
      ],
      hints: ["Build adjacency lists.", "For each uncoloured node in order, colour it 1 and BFS; neighbours get 3 − colour.", "A coloured neighbour with the same colour means null."],
      cases: [
        example([5, [[1, 2], [1, 3], [4, 5]]], [1, 2, 2, 1, 2], "CSES sample"),
        example([3, [[1, 2], [2, 3], [1, 3]]], null, "triangle"),
        example([2, []], [1, 1], "no friendships"),
        example([4, [[1, 2], [2, 3], [3, 4], [4, 1]]], [1, 2, 1, 2], "square"),
        hidden("n = 100 000 bipartite, time limit", () => [100000, TEAMS_BIG_EDGES()]),
        hidden("n = 100 000 with an odd cycle, time limit", () => [100000, TEAMS_BIG_EDGES().concat([[1, 3]])]),
      ],
    },
    {
      id: "round-trip", title: "Round Trip", cses: { id: 1669, name: "Round Trip" },
      goal: "Any cycle of at least three distinct cities as an array that repeats the first city at the end, or null when the road network is a forest.",
      concept: "In an undirected DFS every edge to an already visited node that is neither the parent link nor a finished child is a back edge to an ancestor: the ancestor, the DFS path down to the current node, and the edge back form a cycle.",
      functionName: "roundTrip", signature: "roundTrip(n, edges) → number[] or null",
      starterSource: starter("roundTrip", "n, edges", "Iterative DFS with parent[]; on a visited neighbour u (u ≠ parent[v], parent[u] ≠ v) return u, …path…, v, u."),
      solve: roundTrip, comparator: "deep", accept: roundTripAccept, check: viaBrute(roundTripAccept, roundTripBrute), small: (round) => [3 + (round % 6), smallGraph(1400 + round, 3 + (round % 6), 2 + (round % 8), { undirected: true, distinct: true })],
      reference: book("12.3", "Applications · finding cycles"),
      presets: { "CSES sample": { a: 5, b: [[1, 3], [1, 2], [5, 3], [1, 5], [2, 4], [4, 5]] }, tree: { a: 4, b: [[1, 2], [2, 3], [2, 4]] }, triangle: { a: 3, b: [[1, 2], [2, 3], [3, 1]] } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("parent-edge-as-cycle", "The edge back to the parent is the same road, not a cycle; skip u === parent[v].", function roundTrip(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0), visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (visited[s]) continue; visited[s] = true; const stack = [s]; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; if (!visited[u]) { visited[u] = true; parent[u] = v; stack.push(u); } else { const path = []; for (let w = v; w !== u && path.length <= n; w = parent[w]) path.push(w); return [u].concat(path.reverse(), [u]); } } } return null; }),
        diagnosis("not-closed", "The route must return to the city it started from: repeat the first city at the end.", function roundTrip(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0), visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (visited[s]) continue; visited[s] = true; const stack = [s]; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; if (!visited[u]) { visited[u] = true; parent[u] = v; stack.push(u); } else if (u !== parent[v] && parent[u] !== v) { const path = []; for (let w = v; w !== u; w = parent[w]) path.push(w); return [u].concat(path.reverse()); } } } return null; }),
      ],
      hints: ["Iterative DFS: a stack of nodes and pointer[v] into its adjacency list.", "A visited neighbour u with u ≠ parent[v] and parent[u] ≠ v is an ancestor on the current path.", "Collect v, parent[v], … up to u; the answer is u, that path reversed, u."],
      cases: [
        run(roundTrip, [5, [[1, 3], [1, 2], [5, 3], [1, 5], [2, 4], [4, 5]]], "CSES sample"),
        example([4, [[1, 2], [2, 3], [2, 4]]], null, "a tree"),
        run(roundTrip, [3, [[1, 2], [2, 3], [3, 1]]], "triangle"),
        example([3, [[1, 2]]], null, "one road"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, UNDIRECTED_BIG()]),
      ],
    },
    {
      id: "monsters", title: "Monsters", cses: { id: 1194, name: "Monsters" },
      goal: "Moves (U, D, L, R) that bring A to a boundary square before any monster can reach the same square, an empty string if A already stands on the boundary, or null when escape is impossible.",
      concept: "Two breadth-first searches: first from every monster at once, giving the earliest time a monster can stand on each cell; then from A, entering a cell only if you arrive strictly earlier than the monsters.",
      functionName: "monsters", signature: "monsters(grid) → string or null",
      starterSource: starter("monsters", "grid", "Multi-source BFS from all M gives monsterTime; BFS from A may enter a cell when time + 1 < monsterTime; stop on the boundary."),
      solve: monsters, comparator: "deep", accept: monstersAccept, check: viaBrute(monstersAccept, monstersBrute), small: (round) => [smallMonsterGrid(1500 + round, 3 + (round % 4), 3 + ((round * 5) % 5))],
      reference: book("12.2", "Breadth-first search · multiple sources"),
      presets: { "CSES sample": { a: ["########", "#M..A..#", "#.#.M#.#", "#M#..#..", "#.######"] }, "race to the edge": { a: ["#####", "#M.A#", "#.#.#", "#...#", "#.#.."] }, trapped: { a: ["#####", "#M.A#", "#####"] } },
      scene: { kind: "algo", view: "grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-monsters", "Monsters move too; a square must be entered strictly before any monster can reach it.", function monsters(grid) { const rows = grid.length, cols = grid[0].length, total = rows * cols; const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]]; let start = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) if (grid[r][c] === "A") start = r * cols + c; const time = new Int32Array(total).fill(-1), parent = new Int32Array(total).fill(-1); const move = new Array(total).fill(""); time[start] = 0; const mine = [start]; for (let head = 0; head < mine.length; head += 1) { const cell = mine[head]; const cr = Math.floor(cell / cols), cc = cell % cols; if (cr === 0 || cc === 0 || cr === rows - 1 || cc === cols - 1) { const out = []; for (let c = cell; c !== start; c = parent[c]) out.push(move[c]); return out.reverse().join(""); } for (let k = 0; k < 4; k += 1) { const nr = cr + steps[k][0], nc = cc + steps[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#" || grid[nr][nc] === "M") continue; const id = nr * cols + nc; if (time[id] !== -1) continue; time[id] = time[cell] + 1; parent[id] = cell; move[id] = steps[k][2]; mine.push(id); } } return null; }),
        diagnosis("allows-tie", "Arriving at the same time as a monster is being caught; require time + 1 < monsterTime.", function monsters(grid) { const rows = grid.length, cols = grid[0].length, total = rows * cols; const steps = [[-1, 0, "U"], [1, 0, "D"], [0, -1, "L"], [0, 1, "R"]]; const monsterTime = new Int32Array(total).fill(-1); const queue = []; let start = -1; for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) { if (grid[r][c] === "M") { monsterTime[r * cols + c] = 0; queue.push(r * cols + c); } if (grid[r][c] === "A") start = r * cols + c; } for (let head = 0; head < queue.length; head += 1) { const cell = queue[head]; const cr = Math.floor(cell / cols), cc = cell % cols; for (let k = 0; k < 4; k += 1) { const nr = cr + steps[k][0], nc = cc + steps[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (monsterTime[id] !== -1) continue; monsterTime[id] = monsterTime[cell] + 1; queue.push(id); } } const time = new Int32Array(total).fill(-1), parent = new Int32Array(total).fill(-1); const move = new Array(total).fill(""); time[start] = 0; const mine = [start]; for (let head = 0; head < mine.length; head += 1) { const cell = mine[head]; const cr = Math.floor(cell / cols), cc = cell % cols; if (cr === 0 || cc === 0 || cr === rows - 1 || cc === cols - 1) { const out = []; for (let c = cell; c !== start; c = parent[c]) out.push(move[c]); return out.reverse().join(""); } for (let k = 0; k < 4; k += 1) { const nr = cr + steps[k][0], nc = cc + steps[k][1]; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === "#") continue; const id = nr * cols + nc; if (time[id] !== -1) continue; if (monsterTime[id] !== -1 && monsterTime[id] < time[cell] + 1) continue; time[id] = time[cell] + 1; parent[id] = cell; move[id] = steps[k][2]; mine.push(id); } } return null; }),
      ],
      hints: ["Seed one queue with every M at time 0 and spread through free cells: monsterTime.", "BFS from A with parent and move arrays; enter a cell only if monsterTime is −1 or greater than your arrival time.", "The first dequeued boundary cell ends the search; walk the parents back and reverse."],
      cases: [
        run(monsters, [["########", "#M..A..#", "#.#.M#.#", "#M#..#..", "#.######"]], "CSES sample"),
        example([["#####", "#M.A#", "#####"]], null, "trapped"),
        run(monsters, [["#####", "#M.A#", "#.#.#", "#...#", "#.#.."]], "race to the edge"),
        example([["A.."]], "", "already on the boundary"),
        example([["##.##", "#M.A#", "#####"]], null, "arriving together is a catch"),
        hidden("1000 × 1000 grid, time limit", () => [MONSTER_BIG()]),
      ],
    },
    {
      id: "shortest-routes", track: "graphs", title: "Shortest Routes I", cses: { id: 1671, name: "Shortest Routes I" },
      goal: "Dijkstra: shortest distance from the source to every node in a directed weighted graph (−1 if unreachable).",
      concept: "Always settle the closest unsettled node. The heap gives it to you in O(log n); stale entries are skipped when their node is already settled.",
      functionName: "shortestRoutes", signature: "shortestRoutes(n, edges, source) → distances (index i is node i + 1)",
      starterSource: starter("shortestRoutes", "n, edges, source", "edges are [from, to, weight]. Push [distance, node]; skip nodes already settled."),
      solve: shortestRoutes, comparator: "deep", dependencies: ["heap-push", "heap-pop"],
      reference: book("13.2", "Dijkstra's algorithm"),
      scene: { kind: "algo", view: "graph", handles: preset("shortest-routes", ["CSES sample", "detour is shorter", "unreachable"]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 1] },
      diagnoses: [
        diagnosis("queue-not-heap", "A plain FIFO queue settles nodes in the wrong order; use the heap so the smallest distance comes out first.", function shortestRoutes(n, edges, source) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(-1); const queue = [[0, source]]; let head = 0; while (head < queue.length) { const top = queue[head]; head += 1; const d = top[0], v = top[1]; if (distance[v] !== -1) continue; distance[v] = d; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { if (distance[list[k][0]] === -1) queue.push([d + list[k][1], list[k][0]]); } } return distance.slice(1); }),
        diagnosis("relax-overwrites", "A node's distance is fixed when it is settled; later, longer entries must not overwrite it.", function shortestRoutes(n, edges, source) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(-1); const heap = []; heapPush(heap, [0, source]); while (heap.length) { const top = heapPop(heap).item; const d = top[0], v = top[1]; if (distance[v] !== -1 && distance[v] !== d) { distance[v] = d; continue; } distance[v] = d; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { if (distance[list[k][0]] === -1) heapPush(heap, [d + list[k][1], list[k][0]]); } } return distance.slice(1); }),
      ],
      hints: ["Adjacency lists of [to, weight].", "Heap of [distance, node]; pop; if the node is settled, continue; otherwise settle it.", "Push [d + w, to] for every unsettled neighbour."],
      cases: [
        example([3, [[1, 2, 6], [1, 3, 2], [3, 2, 3]], 1], [0, 5, 2], "CSES sample"),
        example([2, [], 1], [0, -1], "unreachable"),
        example([4, [[1, 2, 1], [2, 3, 1], [3, 4, 1], [1, 4, 5]], 1], [0, 1, 2, 3], "detour is shorter"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, ROUTES_BIG_EDGES(), 1]),
      ],
    },
    {
      id: "shortest-routes-ii", title: "Shortest Routes II", cses: { id: 1672, name: "Shortest Routes II" },
      goal: "Answer shortest-route queries between any two cities of an undirected weighted graph with n ≤ 500 (−1 when disconnected).",
      concept: "Floyd–Warshall: allow intermediate cities one at a time. With k as the outer loop, dist[i][j] after round k is the best route using only intermediates 1..k. Parallel roads keep the cheapest.",
      functionName: "shortestRoutesII", signature: "shortestRoutesII(n, edges, queries) → number[]",
      starterSource: starter("shortestRoutesII", "n, edges, queries", "edges [a, b, c] undirected; queries [a, b]. dist table with Infinity, 0 on the diagonal, min over parallel roads; for k, i, j: relax."),
      solve: shortestRoutesII, comparator: "deep", brute: shortestRoutesIIBrute, small: (round) => { const n = 2 + (round % 5); return [n, smallGraph(1600 + round, n, 1 + (round % 7), { undirected: true, weights: [1, 9] }), smallGraph(1700 + round, n, 4, { selfLoops: true })]; },
      reference: book("13.3", "Floyd–Warshall algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 5], [1, 3, 9], [2, 3, 3]], c: [[1, 2], [2, 1], [1, 3], [1, 4], [3, 2]], directed: false }, "parallel roads": { a: 2, b: [[1, 2, 7], [1, 2, 3]], c: [[1, 2]], directed: false }, chain: { a: 3, b: [[1, 2, 1], [2, 3, 1]], c: [[1, 3], [3, 1]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("k-innermost", "The intermediate city must be the outer loop; with k innermost, later intermediates never combine.", function shortestRoutesII(n, edges, queries) { const dist = new Array((n + 1) * (n + 1)).fill(Infinity); for (let v = 1; v <= n; v += 1) dist[v * (n + 1) + v] = 0; for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], c = edges[i][2]; if (c < dist[a * (n + 1) + b]) { dist[a * (n + 1) + b] = c; dist[b * (n + 1) + a] = c; } } for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) for (let k = 1; k <= n; k += 1) { const candidate = dist[i * (n + 1) + k] + dist[k * (n + 1) + j]; if (candidate < dist[i * (n + 1) + j]) dist[i * (n + 1) + j] = candidate; } return queries.map((q) => { const d = dist[q[0] * (n + 1) + q[1]]; return d === Infinity ? -1 : d; }); }),
        diagnosis("last-parallel-road-wins", "Two roads between the same cities: keep the cheaper, do not overwrite.", function shortestRoutesII(n, edges, queries) { const dist = new Array((n + 1) * (n + 1)).fill(Infinity); for (let v = 1; v <= n; v += 1) dist[v * (n + 1) + v] = 0; for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], c = edges[i][2]; dist[a * (n + 1) + b] = c; dist[b * (n + 1) + a] = c; } for (let k = 1; k <= n; k += 1) for (let i = 1; i <= n; i += 1) for (let j = 1; j <= n; j += 1) { const candidate = dist[i * (n + 1) + k] + dist[k * (n + 1) + j]; if (candidate < dist[i * (n + 1) + j]) dist[i * (n + 1) + j] = candidate; } return queries.map((q) => { const d = dist[q[0] * (n + 1) + q[1]]; return d === Infinity ? -1 : d; }); }),
      ],
      hints: ["dist[i][j] = Infinity, dist[i][i] = 0, roads set both directions with a minimum.", "for k in 1..n: for i: for j: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).", "Answer each query from the table; Infinity becomes −1."],
      cases: [
        example([4, [[1, 2, 5], [1, 3, 9], [2, 3, 3]], [[1, 2], [2, 1], [1, 3], [1, 4], [3, 2]]], [5, 5, 8, -1, 3], "CSES sample"),
        example([2, [[1, 2, 7], [1, 2, 3]], [[1, 2]]], [3], "parallel roads"),
        example([3, [[1, 2, 1], [2, 3, 1]], [[1, 3], [3, 1], [2, 2]]], [2, 2, 0], "chain"),
        example([5, [[1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [1, 5, 10]], [[1, 5]]], [4], "long way round is shorter"),
        hidden("n = 500, m = 5000, q = 100 000, time limit", () => [500, DENSE_500(), QUERIES_500()]),
      ],
    },
    {
      id: "high-score", title: "High Score", cses: { id: 1673, name: "High Score" },
      goal: "Maximum score of a route from room 1 to room n when tunnels add positive or negative scores, or −1 when the score can grow without bound.",
      concept: "Bellman–Ford on maxima: relax every tunnel n − 1 times. A tunnel that still improves afterwards sits on or after a positive cycle reachable from 1; if any room reachable from such a tunnel is room n, the score is unbounded.",
      functionName: "highScore", signature: "highScore(n, edges) → number",
      starterSource: starter("highScore", "n, edges", "edges [a, b, x]. score[1] = 0, others −Infinity; n − 1 rounds of relaxation; then mark rooms still improving and everything reachable from them."),
      solve: highScore, comparator: "scalar", brute: highScoreBrute, small: (round) => { const n = 2 + (round % 5); return [n, smallGraph(1800 + round, n, 1 + (round % 8), { weights: [-5, 5] }).concat([[1, n, -3 - (round % 4)]])]; },
      reference: book("13.1", "Bellman–Ford algorithm · negative cycles"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 3], [2, 4, -1], [1, 3, -2], [3, 4, 7], [1, 4, 4]], directed: true }, "unbounded": { a: 3, b: [[1, 2, 1], [2, 1, 1], [2, 3, 1]], directed: true }, "harmless cycle": { a: 3, b: [[1, 3, 2], [2, 2, 5]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("any-positive-cycle", "A positive cycle only matters if it lies on a route from 1 to n.", function highScore(n, edges) { const score = new Array(n + 1).fill(-Infinity); score[1] = 0; for (let round = 0; round < n - 1; round += 1) { for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], x = edges[i][2]; if (score[a] !== -Infinity && score[a] + x > score[b]) score[b] = score[a] + x; } } for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], x = edges[i][2]; if (score[a] !== -Infinity && score[a] + x > score[b]) return -1; } return score[n]; }),
        diagnosis("no-cycle-check", "After n − 1 rounds a tunnel that still improves means an unbounded score; check for it.", function highScore(n, edges) { const score = new Array(n + 1).fill(-Infinity); score[1] = 0; for (let round = 0; round < n - 1; round += 1) { for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], x = edges[i][2]; if (score[a] !== -Infinity && score[a] + x > score[b]) score[b] = score[a] + x; } } return score[n]; }),
      ],
      hints: ["score[1] = 0, everything else −Infinity; repeat n − 1 times: for each tunnel, score[b] = max(score[b], score[a] + x).", "One more pass: every tunnel that still improves marks room b as unbounded.", "BFS from the marked rooms along tunnels; if room n is marked return −1, else score[n]."],
      cases: [
        example([4, [[1, 2, 3], [2, 4, -1], [1, 3, -2], [3, 4, 7], [1, 4, 4]]], 5, "CSES sample"),
        example([3, [[1, 2, 1], [2, 1, 1], [2, 3, 1]]], -1, "unbounded"),
        example([3, [[1, 3, 2], [2, 2, 5]]], 2, "a cycle that is not on the route"),
        example([4, [[1, 2, 1], [2, 3, 1], [3, 2, 1], [1, 4, 10]]], 10, "a reachable cycle that never reaches n"),
        hidden("n = 2500, m = 5000, random scores, time limit", () => [2500, CYCLE_BIG()]),
        hidden("n = 2500, m = 5000, acyclic, time limit", () => [2500, DAG_WEIGHTED_BIG()]),
      ],
    },
    {
      id: "flight-discount", title: "Flight Discount", cses: { id: 1195, name: "Flight Discount" },
      goal: "Cheapest route from city 1 to city n when exactly one flight may be taken at half price (rounded down).",
      concept: "Two Dijkstra runs: from 1 along the flights and from n against them. For every flight a → b the route 1 ⇝ a, a → b at half price, b ⇝ n costs from[a] + ⌊c/2⌋ + to[b]; take the minimum.",
      functionName: "flightDiscount", signature: "flightDiscount(n, edges) → number",
      starterSource: starter("flightDiscount", "n, edges", "edges [a, b, c] directed. Dijkstra forward from 1 and on the reversed graph from n; min over edges of from[a] + floor(c / 2) + to[b]."),
      solve: flightDiscount, comparator: "scalar", dependencies: ["heap-push", "heap-pop"], brute: flightDiscountBrute, small: (round) => { const n = 2 + (round % 5); return [n, smallGraph(1900 + round, n, 1 + (round % 8), { weights: [1, 9] }).concat([[1, n, 10 + (round % 5)]])]; },
      reference: book("13.2", "Dijkstra's algorithm · reversed graph"),
      presets: { "CSES sample": { a: 3, b: [[1, 2, 3], [2, 3, 1], [1, 3, 7], [2, 1, 5]], directed: true }, "halve the big flight": { a: 3, b: [[1, 2, 10], [2, 3, 10], [1, 3, 28]], directed: true }, "odd price": { a: 2, b: [[1, 2, 5]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("halve-on-shortest-route", "The best route with a discount is not always the cheapest route with its priciest flight halved.", function flightDiscount(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(Infinity), parentCost = new Array(n + 1).fill(0), parent = new Array(n + 1).fill(0); const settled = new Array(n + 1).fill(false); const heap = []; heapPush(heap, [0, 1]); distance[1] = 0; while (heap.length) { const top = heapPop(heap).item; const v = top[1]; if (settled[v]) continue; settled[v] = true; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k][0], candidate = distance[v] + list[k][1]; if (candidate < distance[u]) { distance[u] = candidate; parent[u] = v; parentCost[u] = list[k][1]; heapPush(heap, [candidate, u]); } } } let priciest = 0; for (let v = n; v !== 1; v = parent[v]) priciest = Math.max(priciest, parentCost[v]); return distance[n] - priciest + Math.floor(priciest / 2); }),
        diagnosis("rounds-up", "The discounted price is rounded down: floor(c / 2).", function flightDiscount(n, edges) { const forward = [], backward = []; for (let v = 0; v <= n; v += 1) { forward.push([]); backward.push([]); } for (let i = 0; i < edges.length; i += 1) { forward[edges[i][0]].push([edges[i][1], edges[i][2]]); backward[edges[i][1]].push([edges[i][0], edges[i][2]]); } const dijkstra = (adjacency, source) => { const distance = new Array(n + 1).fill(Infinity); const heap = []; heapPush(heap, [0, source]); const settled = new Array(n + 1).fill(false); while (heap.length) { const top = heapPop(heap).item; const d = top[0], v = top[1]; if (settled[v]) continue; settled[v] = true; distance[v] = d; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) if (!settled[list[k][0]]) heapPush(heap, [d + list[k][1], list[k][0]]); } return distance; }; const fromStart = dijkstra(forward, 1), toEnd = dijkstra(backward, n); let best = Infinity; for (let i = 0; i < edges.length; i += 1) { const candidate = fromStart[edges[i][0]] + Math.ceil(edges[i][2] / 2) + toEnd[edges[i][1]]; if (candidate < best) best = candidate; } return best; }),
      ],
      hints: ["Build the forward and the reversed adjacency lists.", "Dijkstra from 1 on the forward lists and from n on the reversed lists.", "Answer = min over flights of from[a] + floor(c / 2) + to[b]."],
      cases: [
        example([3, [[1, 2, 3], [2, 3, 1], [1, 3, 7], [2, 1, 5]]], 2, "CSES sample"),
        example([3, [[1, 2, 10], [2, 3, 10], [1, 3, 28]]], 14, "halve the big flight"),
        example([2, [[1, 2, 5]]], 2, "odd price rounds down"),
        example([4, [[1, 2, 1], [2, 3, 1], [3, 4, 1]]], 2, "halving a 1 gives 0"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, ROUTES_BIG_EDGES()]),
      ],
    },
    {
      id: "cycle-finding", title: "Cycle Finding", cses: { id: 1197, name: "Cycle Finding" },
      goal: "Any negative-weight cycle as an array of nodes that repeats the first at the end, or null when none exists.",
      concept: "Bellman–Ford from a virtual source (every distance starts at 0). If the n-th round still relaxes some node, a negative cycle exists; walk parent pointers n times from that node to be sure you are inside the cycle, then collect it.",
      functionName: "cycleFinding", signature: "cycleFinding(n, edges) → number[] or null",
      starterSource: starter("cycleFinding", "n, edges", "dist all 0, parent all 0; n rounds; remember the last relaxed node; if a round relaxes nothing return null; else step back n parents and collect the cycle."),
      solve: cycleFinding, comparator: "deep", accept: cycleFindingAccept, check: viaBrute(cycleFindingAccept, cycleFindingBrute), small: (round) => { const n = 2 + (round % 4); return [n, smallGraph(2000 + round, n, 1 + (round % 7), { weights: [-4, 6] })]; },
      reference: book("13.1", "Bellman–Ford algorithm · negative cycles"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 1], [2, 4, 1], [3, 1, 1], [4, 1, -3], [4, 3, -2]], directed: true }, "no negative cycle": { a: 3, b: [[1, 2, -1], [2, 3, -1], [3, 1, 5]], directed: true }, "far from node 1": { a: 4, b: [[1, 2, 1], [3, 4, -1], [4, 3, -1]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-back-walk", "The last relaxed node may hang off the cycle rather than sit on it; follow parents n times first.", function cycleFinding(n, edges) { const dist = new Array(n + 1).fill(0), parent = new Array(n + 1).fill(0); let last = 0; for (let round = 0; round < n; round += 1) { last = 0; for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], c = edges[i][2]; if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; parent[b] = a; last = b; } } if (last === 0) return null; } const cycle = [last]; let guard = 0; for (let v = parent[last]; v !== last && guard <= n; v = parent[v]) { cycle.push(v); guard += 1; } cycle.push(last); return cycle.reverse(); }),
        diagnosis("only-from-node-1", "Starting only from node 1 misses cycles it cannot reach; start every node at distance 0.", function cycleFinding(n, edges) { const dist = new Array(n + 1).fill(Infinity), parent = new Array(n + 1).fill(0); dist[1] = 0; let last = 0; for (let round = 0; round < n; round += 1) { last = 0; for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0], b = edges[i][1], c = edges[i][2]; if (dist[a] !== Infinity && dist[a] + c < dist[b]) { dist[b] = dist[a] + c; parent[b] = a; last = b; } } if (last === 0) return null; } let node = last; for (let k = 0; k < n; k += 1) node = parent[node]; const cycle = [node]; for (let v = parent[node]; v !== node; v = parent[v]) cycle.push(v); cycle.push(node); return cycle.reverse(); }),
      ],
      hints: ["dist[v] = 0 and parent[v] = 0 for every node; run n rounds over all edges.", "If a round relaxes nothing, return null; otherwise remember the last relaxed node.", "node = last; repeat n times node = parent[node]; collect node, parent[node], … until node repeats; reverse."],
      cases: [
        run(cycleFinding, [4, [[1, 2, 1], [2, 4, 1], [3, 1, 1], [4, 1, -3], [4, 3, -2]]], "CSES sample"),
        example([3, [[1, 2, -1], [2, 3, -1], [3, 1, 5]]], null, "cycle with positive total"),
        run(cycleFinding, [4, [[1, 2, 1], [3, 4, -1], [4, 3, -1]]], "far from node 1"),
        run(cycleFinding, [2, [[1, 1, -1]]], "self loop"),
        hidden("n = 2500, m = 5000, time limit", () => [2500, CYCLE_BIG()]),
        hidden("n = 2500, m = 5000, acyclic, time limit", () => [2500, DAG_WEIGHTED_BIG()]),
      ],
    },
    {
      id: "flight-routes", title: "Flight Routes", cses: { id: 1196, name: "Flight Routes" },
      goal: "The prices of the k cheapest routes from city 1 to city n, in increasing order; routes may repeat cities and equal prices count separately.",
      concept: "Dijkstra where each city may be popped up to k times: the j-th pop of a city is the j-th cheapest way to reach it, and the first k pops of city n are the answer.",
      functionName: "flightRoutes", signature: "flightRoutes(n, edges, k) → number[]",
      starterSource: starter("flightRoutes", "n, edges, k", "edges [a, b, c] directed. Heap of [price, city]; popped[city] counts pops; skip a city popped k times; collect pops of n."),
      solve: flightRoutes, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: flightRoutesBrute, small: (round) => { const n = 2 + (round % 4); return [n, smallGraph(2100 + round, n, 2 + (round % 6), { weights: [1, 5] }).concat([[1, n, 3], [n, 1, 2]]), 1 + (round % 4)]; },
      reference: book("13.2", "Dijkstra's algorithm · k shortest walks"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 1], [1, 3, 3], [2, 3, 2], [2, 4, 6], [3, 2, 8], [3, 4, 1]], c: 3, directed: true }, "loop": { a: 2, b: [[1, 2, 1], [2, 1, 1]], c: 3, directed: true }, "two parallel": { a: 2, b: [[1, 2, 4], [1, 2, 4]], c: 2, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("single-pop", "Plain Dijkstra settles each city once and finds only the cheapest route; allow k pops per city.", function flightRoutes(n, edges, k) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const popped = new Array(n + 1).fill(0); const heap = []; heapPush(heap, [0, 1]); const out = []; while (heap.length && out.length < k) { const top = heapPop(heap).item; const d = top[0], v = top[1]; if (popped[v] >= 1) continue; popped[v] += 1; if (v === n) out.push(d); const list = adjacency[v]; for (let i = 0; i < list.length; i += 1) if (popped[list[i][0]] < 1) heapPush(heap, [d + list[i][1], list[i][0]]); } return out; }),
        diagnosis("skips-equal-prices", "Two routes with the same price are two routes; do not deduplicate prices.", function flightRoutes(n, edges, k) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const popped = new Array(n + 1).fill(0); const heap = []; heapPush(heap, [0, 1]); const out = []; while (heap.length && out.length < k) { const top = heapPop(heap).item; const d = top[0], v = top[1]; if (popped[v] >= k) continue; popped[v] += 1; if (v === n && (out.length === 0 || out[out.length - 1] !== d)) out.push(d); const list = adjacency[v]; for (let i = 0; i < list.length; i += 1) if (popped[list[i][0]] < k) heapPush(heap, [d + list[i][1], list[i][0]]); } return out; }),
      ],
      hints: ["popped[v] counts how many times v has left the heap; skip v once it reaches k.", "Every pop of n appends its price; stop after k of them. Keep relaxing from n too: a route may pass through n and come back.", "Relax outgoing flights into cities not yet popped k times."],
      cases: [
        example([4, [[1, 2, 1], [1, 3, 3], [2, 3, 2], [2, 4, 6], [3, 2, 8], [3, 4, 1]], 3], [4, 4, 7], "CSES sample"),
        example([2, [[1, 2, 1], [2, 1, 1]], 3], [1, 3, 5], "loop around"),
        example([2, [[1, 2, 4], [1, 2, 4]], 2], [4, 4], "two parallel flights"),
        example([3, [[1, 2, 2], [2, 3, 2], [1, 3, 5]], 2], [4, 5], "two different routes"),
        hidden("n = 50 000, m = 150 000, k = 10, time limit", () => [50000, FLIGHT_BIG(), 10]),
      ],
    },
    {
      id: "round-trip-ii", title: "Round Trip II", cses: { id: 1678, name: "Round Trip II" },
      goal: "Any directed cycle as an array that repeats the first city at the end, or null when the flight network is acyclic.",
      concept: "Three colours: white unseen, grey on the current DFS path, black finished. An edge into a grey node closes a cycle; an edge into a black node is harmless (a cross or forward edge). The grey path from that node to the current one is the cycle.",
      functionName: "roundTripII", signature: "roundTripII(n, edges) → number[] or null",
      starterSource: starter("roundTripII", "n, edges", "Directed edges [a, b]. Iterative DFS with colour[] and parent[]; on a grey neighbour u return u, …path…, v, u."),
      solve: roundTripII, comparator: "deep", accept: roundTripIIAccept, check: viaBrute(roundTripIIAccept, roundTripIIBrute), small: (round) => [3 + (round % 5), smallGraph(2200 + round, 3 + (round % 5), 2 + (round % 7), { selfLoops: round % 4 === 0 })],
      reference: book("16.4", "Cycle detection · directed graphs"),
      presets: { "CSES sample": { a: 4, b: [[1, 3], [2, 1], [2, 4], [3, 2], [3, 4]], directed: true }, acyclic: { a: 4, b: [[1, 2], [2, 3], [1, 3], [3, 4]], directed: true }, "self loop": { a: 2, b: [[1, 2], [2, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("black-as-grey", "A finished (black) node reached again is not a cycle; only nodes still on the DFS path (grey) are.", function roundTripII(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const colour = new Array(n + 1).fill(0), parent = new Array(n + 1).fill(0), pointer = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (colour[s]) continue; colour[s] = 1; const stack = [s]; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { colour[v] = 2; stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; if (colour[u] === 0) { colour[u] = 1; parent[u] = v; stack.push(u); } else { const path = []; for (let w = v; w !== u && path.length <= n; w = parent[w]) path.push(w); return [u].concat(path.reverse(), [u]); } } } return null; }),
        diagnosis("edges-as-undirected", "Flights are one-way; do not add the reverse direction.", function roundTripII(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); adjacency[edges[i][1]].push(edges[i][0]); } const parent = new Array(n + 1).fill(0), visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (visited[s]) continue; visited[s] = true; const stack = [s]; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; if (!visited[u]) { visited[u] = true; parent[u] = v; stack.push(u); } else if (u !== parent[v] && parent[u] !== v) { const path = []; for (let w = v; w !== u && path.length <= n; w = parent[w]) path.push(w); return [u].concat(path.reverse(), [u]); } } } return null; }),
      ],
      hints: ["colour[v]: 0 unseen, 1 on the path, 2 finished. Iterative DFS with pointer[v].", "Neighbour with colour 1: cycle found; colour 2: skip; colour 0: mark 1, set parent, push.", "When v runs out of neighbours set colour 2 and pop."],
      cases: [
        run(roundTripII, [4, [[1, 3], [2, 1], [2, 4], [3, 2], [3, 4]]], "CSES sample"),
        example([4, [[1, 2], [2, 3], [1, 3], [3, 4]]], null, "acyclic"),
        run(roundTripII, [2, [[1, 2], [2, 2]]], "self loop"),
        example([3, [[1, 2], [1, 3], [2, 3]]], null, "diamond without a cycle"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, DIRECTED_BIG()]),
      ],
    },
    {
      id: "course-schedule", title: "Course Schedule", cses: { id: 1679, name: "Course Schedule" },
      goal: "An order of all courses that respects every 'a before b' requirement, or null when the requirements contain a cycle. Any valid order is accepted; later puzzles call this function to get a topological order.",
      concept: "Kahn's algorithm: repeatedly take a course with no remaining prerequisites. Removing it lowers the in-degree of its dependants; when the queue runs dry before every course is placed, a cycle remains.",
      functionName: "courseSchedule", signature: "courseSchedule(n, edges) → number[] or null",
      starterSource: starter("courseSchedule", "n, edges", "indegree[]; queue of courses with indegree 0 (in increasing order); pop, append, decrement dependants; null if fewer than n placed."),
      solve: courseSchedule, comparator: "deep", accept: courseScheduleAccept, check: viaBrute(courseScheduleAccept, courseScheduleBrute), small: (round) => [3 + (round % 5), smallGraph(2300 + round, 3 + (round % 5), 2 + (round % 6), { acyclic: round % 3 !== 0, distinct: true })],
      reference: book("16.1", "Topological sorting"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [3, 1], [4, 5]], directed: true }, cyclic: { a: 3, b: [[1, 2], [2, 3], [3, 1]], directed: true }, chain: { a: 4, b: [[4, 3], [3, 2], [2, 1]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("partial-order-on-cycle", "If fewer than n courses come out, the rest sit on a cycle: return null, not the partial order.", function courseSchedule(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } return order; }),
        diagnosis("edges-reversed", "A requirement [a, b] means a before b: the edge goes a → b and raises the in-degree of b.", function courseSchedule(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][1]].push(edges[i][0]); indegree[edges[i][0]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } return order.length === n ? order : null; }),
      ],
      hints: ["Count in-degrees while building adjacency lists.", "Start the queue with every course of in-degree 0, in increasing number; process the queue as a growing array.", "Each processed course decrements its dependants; a dependant reaching 0 joins the queue. Fewer than n processed → null."],
      cases: [
        run(courseSchedule, [5, [[1, 2], [3, 1], [4, 5]]], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], null, "cycle"),
        example([4, [[4, 3], [3, 2], [2, 1]]], [4, 3, 2, 1], "chain"),
        example([2, [[1, 1]]], null, "self requirement"),
        hidden("n = 100 000, m = 300 000, acyclic, time limit", () => [100000, DAG_BIG()]),
        hidden("n = 100 000 with one cycle, time limit", () => [100000, DAG_BIG().concat([[100000, 1]])]),
      ],
    },
    {
      id: "longest-flight-route", title: "Longest Flight Route", cses: { id: 1680, name: "Longest Flight Route" },
      goal: "A route from city 1 to city n through the largest possible number of cities in an acyclic flight network, as an array of cities, or null when n is unreachable. Any longest route is accepted.",
      concept: "Dynamic programming over a topological order: best[v] = the most cities on a route from 1 ending at v. Processing cities in topological order guarantees every predecessor is final; parent pointers rebuild the route.",
      functionName: "longestFlightRoute", signature: "longestFlightRoute(n, edges) → number[] or null",
      starterSource: starter("longestFlightRoute", "n, edges", "Topological order (Kahn); best[1] = 1, others −Infinity; relax best[u] = max(best[u], best[v] + 1) with parent; rebuild from n."),
      solve: longestFlightRoute, comparator: "deep", accept: longestFlightRouteAccept, check: viaBrute(longestFlightRouteAccept, longestFlightRouteBrute), small: (round) => [2 + (round % 6), smallGraph(2400 + round, 2 + (round % 6), 1 + (round % 8), { acyclic: true, distinct: true })],
      reference: book("16.2", "Dynamic programming on a DAG"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 5], [1, 3], [3, 4], [4, 5]], directed: true }, unreachable: { a: 3, b: [[2, 3]], directed: true }, "direct flight only": { a: 2, b: [[1, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("shortest-route", "A BFS route uses the fewest cities; the task wants the most.", function longestFlightRoute(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const parent = new Array(n + 1).fill(0); parent[1] = 1; const queue = [1]; for (let head = 0; head < queue.length; head += 1) { const list = adjacency[queue[head]]; for (let k = 0; k < list.length; k += 1) if (parent[list[k]] === 0) { parent[list[k]] = queue[head]; queue.push(list[k]); } } if (parent[n] === 0) return null; const path = []; for (let v = n; v !== 1; v = parent[v]) path.push(v); path.push(1); return path.reverse(); }),
        diagnosis("starts-anywhere", "Only routes that start at city 1 count: best[1] = 1 and every other city starts at −Infinity.", function longestFlightRoute(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } const best = new Array(n + 1).fill(1), parent = new Array(n + 1).fill(0); for (let head = 0; head < order.length; head += 1) { const v = order[head]; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k]; if (best[v] + 1 > best[u]) { best[u] = best[v] + 1; parent[u] = v; } } } const path = []; for (let v = n; v !== 0; v = parent[v]) path.push(v); return path.reverse(); }),
      ],
      hints: ["Kahn's algorithm gives the topological order (courseSchedule does exactly this).", "best[1] = 1, others −Infinity; walk the order and relax best[u] = best[v] + 1 with parent[u] = v when it improves.", "best[n] still −Infinity → null; else follow parents from n and reverse."],
      cases: [
        run(longestFlightRoute, [5, [[1, 2], [2, 5], [1, 3], [3, 4], [4, 5]]], "CSES sample"),
        example([3, [[2, 3]]], null, "unreachable"),
        example([2, [[1, 2]]], [1, 2], "direct flight only"),
        run(longestFlightRoute, [4, [[1, 4], [1, 2], [2, 3], [3, 4]]], "the long way"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, DAG_BIG()]),
      ],
    },
    {
      id: "game-routes", title: "Game Routes", cses: { id: 1681, name: "Game Routes" },
      goal: "Number of different paths from level 1 to level n in an acyclic level graph, modulo 10⁹ + 7.",
      concept: "Counting on a DAG: ways[1] = 1, and in topological order every level pushes its count along its teleporters. Because predecessors are final when processed, each path is counted exactly once.",
      functionName: "gameRoutes", signature: "gameRoutes(n, edges) → number",
      starterSource: starter("gameRoutes", "n, edges", "Kahn order; ways[1] = 1; for v in order: for each teleporter v → u: ways[u] += ways[v] mod 1e9+7."),
      solve: gameRoutes, comparator: "scalar", brute: gameRoutesBrute, small: (round) => [2 + (round % 6), smallGraph(2500 + round, 2 + (round % 6), 1 + (round % 9), { acyclic: true })],
      reference: book("16.2", "Dynamic programming on a DAG · counting paths"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 4], [1, 3], [3, 4], [1, 4]], directed: true }, "no path": { a: 3, b: [[2, 3]], directed: true }, "parallel teleporters": { a: 2, b: [[1, 2], [1, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7.", function gameRoutes(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } const ways = new Array(n + 1).fill(0); ways[1] = 1; for (let head = 0; head < order.length; head += 1) { const v = order[head]; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) ways[list[k]] += ways[v]; } return ways[n]; }),
        diagnosis("starts-anywhere", "Only level 1 starts with one way; the other levels start at 0.", function gameRoutes(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } const ways = new Array(n + 1).fill(1); for (let head = 0; head < order.length; head += 1) { const v = order[head]; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) ways[list[k]] = (ways[list[k]] + ways[v]) % 1000000007; } return ways[n]; }),
      ],
      hints: ["Topological order by Kahn's algorithm.", "ways[1] = 1; process levels in order, adding ways[v] to every target.", "Modulo after each addition; answer ways[n]."],
      cases: [
        example([4, [[1, 2], [2, 4], [1, 3], [3, 4], [1, 4]]], 3, "CSES sample"),
        example([3, [[2, 3]]], 0, "no path"),
        example([2, [[1, 2], [1, 2]]], 2, "parallel teleporters"),
        example([1, []], 1, "already there"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, DAG_BIG()]),
      ],
    },
    {
      id: "investigation", title: "Investigation", cses: { id: 1202, name: "Investigation" },
      goal: "For routes from city 1 to city n: [minimum price, number of minimum-price routes mod 10⁹ + 7, fewest flights on such a route, most flights on such a route].",
      concept: "Dijkstra with bookkeeping: when a relaxation strictly improves a city, it inherits count, min and max from the predecessor; when it ties, the count adds and the min/max merge. Positive prices guarantee the predecessor is final.",
      functionName: "investigation", signature: "investigation(n, edges) → [price, count, fewest, most]",
      starterSource: starter("investigation", "n, edges", "edges [a, b, c] directed. Dijkstra with ways[], fewest[], most[]; strict improvement copies, equality merges."),
      solve: investigation, comparator: "deep", dependencies: ["heap-push", "heap-pop"], brute: investigationBrute, small: (round) => { const n = 2 + (round % 5); return [n, smallGraph(2600 + round, n, 2 + (round % 8), { weights: [1, 3] }).concat([[1, n, 4]])]; },
      reference: book("13.2", "Dijkstra's algorithm · counting shortest paths"),
      presets: { "CSES sample": { a: 4, b: [[1, 4, 5], [1, 2, 4], [2, 4, 5], [1, 3, 2], [3, 4, 3]], directed: true }, "two equal routes": { a: 3, b: [[1, 2, 1], [2, 3, 1], [1, 3, 2]], directed: true }, "one flight": { a: 2, b: [[1, 2, 7]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("ties-ignored", "A route of equal price is another minimum-price route: add its count and merge fewest/most.", function investigation(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(Infinity), ways = new Array(n + 1).fill(0); const fewest = new Array(n + 1).fill(0), most = new Array(n + 1).fill(0), settled = new Array(n + 1).fill(false); distance[1] = 0; ways[1] = 1; const heap = []; heapPush(heap, [0, 1]); while (heap.length) { const top = heapPop(heap).item; const v = top[1]; if (settled[v]) continue; settled[v] = true; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k][0], candidate = distance[v] + list[k][1]; if (candidate < distance[u]) { distance[u] = candidate; ways[u] = ways[v]; fewest[u] = fewest[v] + 1; most[u] = most[v] + 1; heapPush(heap, [candidate, u]); } } } return [distance[n], ways[n], fewest[n], most[n]]; }),
        diagnosis("count-no-mod", "The count of routes grows exponentially; keep it modulo 10⁹ + 7.", function investigation(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const distance = new Array(n + 1).fill(Infinity), ways = new Array(n + 1).fill(0); const fewest = new Array(n + 1).fill(0), most = new Array(n + 1).fill(0), settled = new Array(n + 1).fill(false); distance[1] = 0; ways[1] = 1; const heap = []; heapPush(heap, [0, 1]); while (heap.length) { const top = heapPop(heap).item; const v = top[1]; if (settled[v]) continue; settled[v] = true; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const u = list[k][0], candidate = distance[v] + list[k][1]; if (candidate < distance[u]) { distance[u] = candidate; ways[u] = ways[v]; fewest[u] = fewest[v] + 1; most[u] = most[v] + 1; heapPush(heap, [candidate, u]); } else if (candidate === distance[u]) { ways[u] += ways[v]; fewest[u] = Math.min(fewest[u], fewest[v] + 1); most[u] = Math.max(most[u], most[v] + 1); } } } return [distance[n], ways[n], fewest[n], most[n]]; }),
      ],
      hints: ["Dijkstra with a settled[] array; relax only from settled cities.", "Strictly better: distance, ways = ways[v], fewest = fewest[v] + 1, most = most[v] + 1, push.", "Equal: ways += ways[v] (mod), fewest = min, most = max."],
      cases: [
        example([4, [[1, 4, 5], [1, 2, 4], [2, 4, 5], [1, 3, 2], [3, 4, 3]]], [5, 2, 1, 2], "CSES sample"),
        example([3, [[1, 2, 1], [2, 3, 1], [1, 3, 2]]], [2, 2, 1, 2], "two equal routes"),
        example([2, [[1, 2, 7]]], [7, 1, 1, 1], "one flight"),
        run(investigation, diamondChain(40), "40 diamonds: 2⁴⁰ routes"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, ROUTES_BIG_EDGES()]),
      ],
    },
    {
      id: "planets-queries-i", title: "Planets Queries I", cses: { id: 1750, name: "Planets Queries I" },
      goal: "For each query [x, k], the planet reached from x after k teleportations (k up to 10⁹).",
      concept: "Binary lifting on a successor function: up[j][v] = where v lands after 2ʲ steps, built from up[j − 1]. A query decomposes k into powers of two and jumps once per set bit.",
      functionName: "planetsQueriesI", signature: "planetsQueriesI(t, queries) → number[]",
      starterSource: starter("planetsQueriesI", "t, queries", "t[i] is the teleporter of planet i + 1. up[0][v] = t[v − 1]; up[j][v] = up[j − 1][up[j − 1][v]] for j < 30; jump per bit of k."),
      solve: planetsQueriesI, comparator: "deep", brute: planetsQueriesIBrute, small: (round) => { const n = 1 + (round % 7); return [randomInts(2700 + round, n, 1, n), [[1 + (round % n), round % 40], [1, 1 + (round % 9)], [n, 0]]]; },
      reference: book("16.3", "Successor paths · binary lifting"),
      presets: { "CSES sample": { a: [2, 1, 1, 4], c: [[1, 2], [3, 4], [4, 1]], functional: true, directed: true }, "one big cycle": { a: [2, 3, 4, 1], c: [[1, 1000000000], [2, 3]], functional: true, directed: true }, "fixed point": { a: [1], c: [[1, 5]], functional: true, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("too-few-levels", "k reaches 10⁹ ≈ 2³⁰; 18 levels only cover jumps below 2¹⁸.", function planetsQueriesI(t, queries) { const n = t.length; const up = []; const first = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) first[v] = t[v - 1]; up.push(first); for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return queries.map((query) => { let v = query[0], k = query[1]; for (let j = 0; j < 18 && k > 0; j += 1) { if (k & 1) v = up[j][v]; k = Math.floor(k / 2); } return v; }); }),
        diagnosis("level-zero-is-identity", "up[0][v] is one teleportation, t[v − 1], not v itself.", function planetsQueriesI(t, queries) { const n = t.length; const up = []; const first = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) first[v] = v; up.push(first); for (let j = 1; j < 30; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = t[previous[v] - 1]; up.push(row); } return queries.map((query) => { let v = query[0], k = query[1]; for (let j = 0; j < 30 && k > 0; j += 1) { if (k & 1) v = up[j][v]; k = Math.floor(k / 2); } return v; }); }),
      ],
      hints: ["Level 0 is the teleporter itself; build 30 levels: up[j][v] = up[j − 1][up[j − 1][v]].", "For a query walk the bits of k from low to high; a set bit means v = up[j][v].", "Use Math.floor(k / 2), not k >> 1, because k can exceed 2³¹."],
      cases: [
        example([[2, 1, 1, 4], [[1, 2], [3, 4], [4, 1]]], [1, 2, 4], "CSES sample"),
        example([[2, 3, 4, 1], [[1, 1000000000], [2, 3]]], [1, 1], "one big cycle, k = 10⁹"),
        example([[1], [[1, 5]]], [1], "fixed point"),
        example([[2, 3, 3], [[1, 0], [1, 1], [1, 7]]], [1, 2, 3], "tail into a fixed point"),
        hidden("n = q = 200 000, time limit", () => [TELEPORTERS_BIG(), PLANET_QUERIES_BIG()]),
      ],
    },
    {
      id: "planets-queries-ii", title: "Planets Queries II", cses: { id: 1160, name: "Planets Queries II" },
      goal: "For each query [a, b], the minimum number of teleportations from a to b, or −1 when b is never reached.",
      concept: "A successor graph is trees hanging off cycles. Label every cycle node with its cycle and position; give every other node its depth and the cycle node it enters. Then b on a cycle: depth[a] plus the cycle distance; b in a tree: b must be an ancestor of a, checked by jumping depth[a] − depth[b] steps with binary lifting.",
      functionName: "planetsQueriesII", signature: "planetsQueriesII(t, queries) → number[]",
      starterSource: starter("planetsQueriesII", "t, queries", "Find cycles by colouring walks; depth/entry for tree nodes; 18 lifting levels; answer per the two cases."),
      solve: planetsQueriesII, comparator: "deep", brute: planetsQueriesIIBrute, small: (round) => { const n = 1 + (round % 8); const next = rng(2800 + round); const queries = []; for (let i = 0; i < 6; i += 1) queries.push([1 + Math.floor(next() * n), 1 + Math.floor(next() * n)]); return [randomInts(2900 + round, n, 1, n), queries]; },
      reference: book("16.3", "Successor paths · cycles and trees"),
      presets: { "CSES sample": { a: [2, 3, 2, 3, 2], c: [[1, 2], [1, 3], [1, 4]], functional: true, directed: true }, "around the cycle": { a: [2, 3, 1], c: [[1, 3], [3, 2]], functional: true, directed: true }, "up the tree": { a: [1, 1, 2, 3], c: [[4, 1], [1, 4], [4, 2]], functional: true, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("cycle-case-missing", "When b lies on the cycle that a's path enters, the answer is depth[a] plus the distance around the cycle, not −1.", function planetsQueriesII(t, queries) { const n = t.length; const next = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) next[v] = t[v - 1]; const state = new Array(n + 1).fill(0), cycleId = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (state[s]) continue; const path = []; let v = s; while (state[v] === 0) { state[v] = 1; path.push(v); v = next[v]; } if (state[v] === 1) { const start = path.indexOf(v); for (let i = start; i < path.length; i += 1) cycleId[path[i]] = 1; } for (let i = 0; i < path.length; i += 1) state[path[i]] = 2; } const depth = new Array(n + 1).fill(-1); for (let v = 1; v <= n; v += 1) if (cycleId[v]) depth[v] = 0; for (let s = 1; s <= n; s += 1) { if (depth[s] !== -1) continue; const path = []; let v = s; while (depth[v] === -1) { path.push(v); v = next[v]; } for (let i = path.length - 1; i >= 0; i -= 1) { depth[path[i]] = depth[v] + 1; v = path[i]; } } const up = [next]; for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return queries.map((query) => { const a = query[0], b = query[1]; if (depth[a] < depth[b]) return -1; let v = a, k = depth[a] - depth[b]; for (let j = 0; j < 18 && k > 0; j += 1) { if (k & 1) v = up[j][v]; k = Math.floor(k / 2); } return v === b ? depth[a] - depth[b] : -1; }); }),
        diagnosis("cycle-direction-reversed", "Teleporters go one way around the cycle: the distance is (position[b] − position[entry]) mod length, not the other way.", function planetsQueriesII(t, queries) { const n = t.length; const next = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) next[v] = t[v - 1]; const state = new Array(n + 1).fill(0), cycleId = new Array(n + 1).fill(0), position = new Array(n + 1).fill(0), cycleLength = [0]; for (let s = 1; s <= n; s += 1) { if (state[s]) continue; const path = []; let v = s; while (state[v] === 0) { state[v] = 1; path.push(v); v = next[v]; } if (state[v] === 1) { const start = path.indexOf(v); const id = cycleLength.length; cycleLength.push(path.length - start); for (let i = start; i < path.length; i += 1) { cycleId[path[i]] = id; position[path[i]] = i - start; } } for (let i = 0; i < path.length; i += 1) state[path[i]] = 2; } const depth = new Array(n + 1).fill(-1), entry = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) if (cycleId[v]) { depth[v] = 0; entry[v] = v; } for (let s = 1; s <= n; s += 1) { if (depth[s] !== -1) continue; const path = []; let v = s; while (depth[v] === -1) { path.push(v); v = next[v]; } for (let i = path.length - 1; i >= 0; i -= 1) { depth[path[i]] = depth[v] + 1; entry[path[i]] = entry[v]; v = path[i]; } } const up = [next]; for (let j = 1; j < 18; j += 1) { const previous = up[j - 1]; const row = new Array(n + 1).fill(0); for (let v = 1; v <= n; v += 1) row[v] = previous[previous[v]]; up.push(row); } return queries.map((query) => { const a = query[0], b = query[1]; if (cycleId[b]) { if (cycleId[entry[a]] !== cycleId[b]) return -1; const length = cycleLength[cycleId[b]]; return depth[a] + ((position[entry[a]] - position[b] + length) % length); } if (depth[a] < depth[b]) return -1; let v = a, k = depth[a] - depth[b]; for (let j = 0; j < 18 && k > 0; j += 1) { if (k & 1) v = up[j][v]; k = Math.floor(k / 2); } return v === b ? depth[a] - depth[b] : -1; }); }),
      ],
      hints: ["Walk from each unvisited node marking 1 (on this walk); hitting a node marked 1 closes a cycle: record its id, length and positions; mark the walk 2 afterwards.", "Tree nodes: depth = distance to the cycle, entry = the cycle node reached; fill by walking until a known node and unwinding.", "Query: b on a cycle → same cycle as entry[a]? depth[a] + (position[b] − position[entry[a]] mod length); else jump depth[a] − depth[b] from a and compare with b."],
      cases: [
        example([[2, 3, 2, 3, 2], [[1, 2], [1, 3], [1, 4]]], [1, 2, -1], "CSES sample"),
        example([[2, 3, 1], [[1, 3], [3, 2], [2, 2]]], [2, 2, 0], "around the cycle"),
        example([[1, 1, 2, 3], [[4, 1], [1, 4], [4, 2], [4, 4]]], [3, -1, 2, 0], "up the tree"),
        example([[2, 2], [[1, 2], [2, 1]]], [1, -1], "tail then fixed point"),
        hidden("n = q = 200 000, time limit", () => [TELEPORTERS_BIG(), PLANET_PAIRS_BIG()]),
      ],
    },
    {
      id: "planets-cycles", title: "Planets Cycles", cses: { id: 1751, name: "Planets Cycles" },
      goal: "For every starting planet, the number of teleportations until a planet repeats.",
      concept: "Walk from each unresolved planet, marking the walk. Meeting a planet of the current walk closes a cycle: every cycle planet answers the cycle length. Meeting a resolved planet, or unwinding the walk, gives answer = answer of the next planet + 1.",
      functionName: "planetsCycles", signature: "planetsCycles(t) → number[]",
      starterSource: starter("planetsCycles", "t", "state 0/1/2 per planet; walk with a path array; cycle planets get the length; unwind the rest as next + 1."),
      solve: planetsCycles, comparator: "deep", brute: planetsCyclesBrute, small: (round) => { const n = 1 + (round % 9); return [randomInts(3000 + round, n, 1, n)]; },
      reference: book("16.3", "Successor paths · cycle detection"),
      presets: { "CSES sample": { a: [2, 4, 3, 1, 4], functional: true, directed: true }, "one cycle": { a: [2, 3, 1], functional: true, directed: true }, "all fixed": { a: [1, 2, 3], functional: true, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("cycle-length-only", "Planets before the cycle also count their tail: answer = tail length + cycle length.", function planetsCycles(t) { const n = t.length; const answer = new Array(n + 1).fill(0), state = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (state[s]) continue; const path = []; let v = s; while (state[v] === 0) { state[v] = 1; path.push(v); v = t[v - 1]; } let length = answer[v]; if (state[v] === 1) length = path.length - path.indexOf(v); for (let i = 0; i < path.length; i += 1) { answer[path[i]] = length; state[path[i]] = 2; } } return answer.slice(1); }),
        diagnosis("stops-at-cycle-entry", "The walk continues around the cycle until the entry planet repeats; count the whole cycle, not just the step into it.", function planetsCycles(t) { const n = t.length; const answer = new Array(n + 1).fill(0), state = new Array(n + 1).fill(0); for (let s = 1; s <= n; s += 1) { if (state[s]) continue; const path = []; let v = s; while (state[v] === 0) { state[v] = 1; path.push(v); v = t[v - 1]; } let from = path.length; if (state[v] === 1) { const start = path.indexOf(v); for (let i = start; i < path.length; i += 1) answer[path[i]] = 1; from = start; } for (let i = from - 1; i >= 0; i -= 1) { const following = i + 1 < path.length ? path[i + 1] : v; answer[path[i]] = answer[following] + 1; } for (let i = 0; i < path.length; i += 1) state[path[i]] = 2; } return answer.slice(1); }),
      ],
      hints: ["For each planet with state 0, walk with a path array, marking state 1, until you hit a planet with state ≠ 0.", "State 1 means the cycle starts at its index in the path: cycle planets get path.length − index.", "Unwind the remaining path from the back: answer = answer[next] + 1; mark everything state 2."],
      cases: [
        example([[2, 4, 3, 1, 4]], [3, 3, 1, 3, 4], "CSES sample"),
        example([[2, 3, 1]], [3, 3, 3], "one cycle"),
        example([[1, 2, 3]], [1, 1, 1], "all fixed points"),
        example([[2, 3, 4, 4]], [4, 3, 2, 1], "long tail"),
        hidden("n = 200 000, time limit", () => [TELEPORTERS_BIG()]),
      ],
    },
    {
      id: "dsu-find", title: "Union-Find: Find", cses: { id: 1675, name: "Road Reparation (brick)" },
      goal: "The representative (root) of the set containing x, compressing the path so later finds are faster. The parent array is modified in place.",
      concept: "A set is a tree of parent pointers; the root points to itself. Walk up to the root, then point every node on the way directly at it: path compression keeps the trees flat.",
      functionName: "dsuFind", signature: "dsuFind(parent, x) → number",
      starterSource: starter("dsuFind", "parent, x", "root = x; while parent[root] !== root: root = parent[root]; then rewrite parent[] along the path; return root."),
      solve: dsuFind, comparator: "scalar", allowMutation: true,
      reference: book("15.2", "Union-find structure"),
      presets: { chain: { a: [0, 1, 1, 2, 3, 4] }, "two sets": { a: [0, 1, 1, 3, 3, 4] }, singletons: { a: [0, 1, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "x", type: "slider", label: "node x (rounded)", value: 5, min: 1, max: 5 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("one-step", "parent[x] is only the next node up; keep climbing until parent[root] === root.", function dsuFind(parent, x) { return parent[x]; }),
        diagnosis("index-shift", "Nodes are 1-based here and parent[i] = i marks a root; do not shift the index.", function dsuFind(parent, x) { let root = Math.max(0, x - 1); while (parent[root] !== root) root = parent[root]; return root; }),
      ],
      hints: ["Climb: while parent[root] !== root, root = parent[root].", "Second pass from x: set parent[node] = root for each node on the path.", "Return root."],
      cases: [
        example([[0, 1, 1, 2, 3, 4], 5], 1, "chain of five"),
        example([[0, 1, 1, 3, 3, 4], 5], 3, "second set"),
        example([[0, 1, 2, 3], 2], 2, "already a root"),
        example([[0, 1, 1, 2, 3, 4], 1], 1, "the root itself"),
      ],
    },
    {
      id: "dsu-union", title: "Union-Find: Union", cses: { id: 1675, name: "Road Reparation (brick)" },
      goal: "Merge the sets of a and b by size: return the merged size, or 0 when they were already the same set. parent and size are modified in place.",
      concept: "Attach the smaller tree under the larger root and add the sizes. Union by size keeps every tree's height logarithmic; together with path compression the operations are almost constant time.",
      functionName: "dsuUnion", signature: "dsuUnion(parent, size, a, b) → number",
      starterSource: starter("dsuUnion", "parent, size, a, b", "ra = dsuFind(parent, a), rb = dsuFind(parent, b); same root → 0; else hang the smaller under the larger, add sizes, return the new size."),
      solve: dsuUnion, comparator: "scalar", allowMutation: true, dependencies: ["dsu-find"],
      reference: book("15.2", "Union-find structure · union by size"),
      presets: { "two sets": { a: [0, 1, 1, 3, 3, 4], b: [0, 2, 1, 3, 1, 1] }, singletons: { a: [0, 1, 2, 3, 4, 5], b: [0, 1, 1, 1, 1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "a", type: "slider", label: "a (rounded)", value: 2, min: 1, max: 5 }, { id: "b", type: "slider", label: "b (rounded)", value: 4, min: 1, max: 5 }]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("merges-same-set", "When a and b already share a root nothing changes: return 0, do not double the size.", function dsuUnion(parent, size, a, b) { let ra = dsuFind(parent, a), rb = dsuFind(parent, b); if (size[ra] < size[rb]) { const swap = ra; ra = rb; rb = swap; } parent[rb] = ra; size[ra] += size[rb]; return size[ra]; }),
        diagnosis("size-not-added", "The merged set has size[ra] + size[rb] members.", function dsuUnion(parent, size, a, b) { let ra = dsuFind(parent, a), rb = dsuFind(parent, b); if (ra === rb) return 0; if (size[ra] < size[rb]) { const swap = ra; ra = rb; rb = swap; } parent[rb] = ra; return size[ra]; }),
      ],
      hints: ["Find both roots; equal roots mean already merged, return 0.", "Swap so that ra is the root of the larger set.", "parent[rb] = ra; size[ra] += size[rb]; return size[ra]."],
      cases: [
        example([[0, 1, 1, 3, 3, 4], [0, 2, 1, 3, 1, 1], 2, 4], 5, "two sets merge"),
        example([[0, 1, 1, 3, 3, 4], [0, 2, 1, 3, 1, 1], 1, 2], 0, "already together"),
        example([[0, 1, 2, 3, 4, 5], [0, 1, 1, 1, 1, 1], 5, 1], 2, "two singletons"),
        example([[0, 1, 1, 3, 3, 4], [0, 2, 1, 3, 1, 1], 5, 5], 0, "a node with itself"),
      ],
    },
    {
      id: "road-reparation", title: "Road Reparation", cses: { id: 1675, name: "Road Reparation" },
      goal: "Minimum total cost of roads to repair so that every city is reachable from every other, or null when the network cannot be connected.",
      concept: "Kruskal: sort the roads by cost and take each one that joins two different sets. Union-find answers 'different sets?' almost instantly; n − 1 successful joins mean the cities are connected.",
      functionName: "roadReparation", signature: "roadReparation(n, edges) → number or null",
      starterSource: starter("roadReparation", "n, edges", "edges [a, b, c]. Sort a copy by c; dsuUnion each; sum the costs of successful unions; null unless n − 1 succeed."),
      solve: roadReparation, comparator: "scalar", dependencies: ["dsu-find", "dsu-union"], brute: roadReparationBrute, small: (round) => { const n = 2 + (round % 5); return [n, smallGraph(3100 + round, n, 1 + (round % 8), { undirected: true, weights: [1, 9] })]; },
      reference: book("15.1", "Kruskal's algorithm"),
      presets: { "CSES sample": { a: 5, b: [[1, 2, 3], [2, 3, 5], [2, 4, 2], [3, 4, 8], [5, 1, 7], [5, 4, 4]], directed: false }, disconnected: { a: 4, b: [[1, 2, 1], [3, 4, 1]], directed: false }, triangle: { a: 3, b: [[1, 2, 5], [2, 3, 1], [3, 1, 2]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("input-order", "Roads must be considered from cheapest to most expensive; sort them first.", function roadReparation(n, edges) { const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } let cost = 0, joined = 0; for (let i = 0; i < edges.length; i += 1) { if (dsuUnion(parent, size, edges[i][0], edges[i][1])) { cost += edges[i][2]; joined += 1; } } return joined === n - 1 ? cost : null; }),
        diagnosis("no-connectivity-check", "Fewer than n − 1 successful unions means some city stays cut off: return null.", function roadReparation(n, edges) { const order = edges.slice().sort((p, q) => p[2] - q[2]); const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } let cost = 0; for (let i = 0; i < order.length; i += 1) { if (dsuUnion(parent, size, order[i][0], order[i][1])) cost += order[i][2]; } return cost; }),
      ],
      hints: ["Copy and sort the roads by cost.", "parent[v] = v, size[v] = 1; for each road, dsuUnion(parent, size, a, b) > 0 means it joins two sets: add its cost.", "Count the joins; return the cost only if there were n − 1."],
      cases: [
        example([5, [[1, 2, 3], [2, 3, 5], [2, 4, 2], [3, 4, 8], [5, 1, 7], [5, 4, 4]]], 14, "CSES sample"),
        example([4, [[1, 2, 1], [3, 4, 1]]], null, "disconnected"),
        example([3, [[1, 2, 5], [2, 3, 1], [3, 1, 2]]], 3, "triangle"),
        example([1, []], 0, "single city"),
        hidden("n = 100 000, m = 300 000, time limit", () => [100000, ROUTES_BIG_EDGES()]),
      ],
    },
    {
      id: "road-construction", title: "Road Construction", cses: { id: 1676, name: "Road Construction" },
      goal: "After each new road, [number of components, size of the largest component].",
      concept: "Union-find keeps both counts live: a successful union lowers the component count by one and its returned size is a candidate for the largest.",
      functionName: "roadConstruction", signature: "roadConstruction(n, edges) → [[components, largest], …]",
      starterSource: starter("roadConstruction", "n, edges", "components = n, largest = 1; per road: merged = dsuUnion(...); if merged: components −= 1, largest = max(largest, merged); push the pair."),
      solve: roadConstruction, comparator: "deep", dependencies: ["dsu-find", "dsu-union"], brute: roadConstructionBrute, small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(3200 + round, n, 1 + (round % 8), { undirected: true })]; },
      reference: book("15.2", "Union-find structure"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [4, 5]], directed: false }, "repeated road": { a: 3, b: [[1, 2], [1, 2], [2, 3]], directed: false }, chain: { a: 4, b: [[1, 2], [2, 3], [3, 4]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-every-road", "A road inside an existing component changes nothing; only a successful union lowers the count.", function roadConstruction(n, edges) { const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } let components = n, largest = 1; const out = []; for (let i = 0; i < edges.length; i += 1) { const merged = dsuUnion(parent, size, edges[i][0], edges[i][1]); components -= 1; if (merged > largest) largest = merged; out.push([components, largest]); } return out; }),
        diagnosis("largest-before-merge", "The merged component is the sum of both sizes; compare that with the largest so far.", function roadConstruction(n, edges) { const parent = [], size = []; for (let v = 0; v <= n; v += 1) { parent.push(v); size.push(1); } let components = n, largest = 1; const out = []; for (let i = 0; i < edges.length; i += 1) { const sa = size[dsuFind(parent, edges[i][0])], sb = size[dsuFind(parent, edges[i][1])]; const merged = dsuUnion(parent, size, edges[i][0], edges[i][1]); if (merged) { components -= 1; largest = Math.max(largest, sa, sb); } out.push([components, largest]); } return out; }),
      ],
      hints: ["Start with n components of size 1.", "dsuUnion returns the merged size or 0.", "On a merge: components − 1 and largest = max(largest, merged); record the pair after every road."],
      cases: [
        example([5, [[1, 2], [1, 3], [4, 5]]], [[4, 2], [3, 3], [2, 3]], "CSES sample"),
        example([3, [[1, 2], [1, 2], [2, 3]]], [[2, 2], [2, 2], [1, 3]], "repeated road"),
        example([4, [[1, 2], [3, 4], [2, 3]]], [[3, 2], [2, 2], [1, 4]], "two pairs then a bridge"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, UNDIRECTED_BIG()]),
      ],
    },
    {
      id: "flight-routes-check", title: "Flight Routes Check", cses: { id: 1682, name: "Flight Routes Check" },
      goal: "null when every city can reach every other; otherwise a pair [a, b] such that b cannot be reached from a. Any such pair is accepted.",
      concept: "Strong connectivity has a two-search test: every city must be reachable from city 1, and city 1 must be reachable from every city, which is reachability from 1 in the reversed graph.",
      functionName: "flightRoutesCheck", signature: "flightRoutesCheck(n, edges) → null or [a, b]",
      starterSource: starter("flightRoutesCheck", "n, edges", "BFS from 1 on the forward lists: an unreached v gives [1, v]. BFS from 1 on the reversed lists: an unreached v gives [v, 1]."),
      solve: flightRoutesCheck, comparator: "deep", accept: flightRoutesCheckAccept, check: viaBrute(flightRoutesCheckAccept, flightRoutesCheckBrute), small: (round) => [2 + (round % 5), smallGraph(3300 + round, 2 + (round % 5), 2 + (round % 8))],
      reference: book("17.1", "Strong connectivity · Kosaraju's algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 3], [3, 1], [1, 4], [3, 4]], directed: true }, "strongly connected": { a: 3, b: [[1, 2], [2, 3], [3, 1]], directed: true }, "cannot come back": { a: 2, b: [[1, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("forward-only", "Reaching every city from 1 is half the story; every city must also reach 1 (search the reversed graph).", function flightRoutesCheck(n, edges) { const forward = []; for (let v = 0; v <= n; v += 1) forward.push([]); for (let i = 0; i < edges.length; i += 1) forward[edges[i][0]].push(edges[i][1]); const seen = new Array(n + 1).fill(false); seen[1] = true; const queue = [1]; for (let head = 0; head < queue.length; head += 1) { const list = forward[queue[head]]; for (let k = 0; k < list.length; k += 1) if (!seen[list[k]]) { seen[list[k]] = true; queue.push(list[k]); } } for (let v = 1; v <= n; v += 1) if (!seen[v]) return [1, v]; return null; }),
        diagnosis("edges-as-undirected", "Flights are one-way; the reversed search must use reversed lists, not undirected ones.", function flightRoutesCheck(n, edges) { const both = []; for (let v = 0; v <= n; v += 1) both.push([]); for (let i = 0; i < edges.length; i += 1) { both[edges[i][0]].push(edges[i][1]); both[edges[i][1]].push(edges[i][0]); } const seen = new Array(n + 1).fill(false); seen[1] = true; const queue = [1]; for (let head = 0; head < queue.length; head += 1) { const list = both[queue[head]]; for (let k = 0; k < list.length; k += 1) if (!seen[list[k]]) { seen[list[k]] = true; queue.push(list[k]); } } for (let v = 1; v <= n; v += 1) if (!seen[v]) return [1, v]; return null; }),
      ],
      hints: ["Build forward and reversed adjacency lists.", "BFS from 1 forward; the first unreached city v gives [1, v].", "BFS from 1 on the reversed lists; the first unreached city v gives [v, 1]; otherwise null."],
      cases: [
        run(flightRoutesCheck, [4, [[1, 2], [2, 3], [3, 1], [1, 4], [3, 4]]], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], null, "strongly connected"),
        run(flightRoutesCheck, [2, [[1, 2]]], "cannot come back"),
        run(flightRoutesCheck, [3, [[2, 1], [3, 1]]], "cannot leave 1"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, DIRECTED_BIG()]),
      ],
    },
    {
      id: "planets-and-kingdoms", title: "Planets and Kingdoms", cses: { id: 1683, name: "Planets and Kingdoms" },
      goal: "A kingdom label for every planet: planets share a label exactly when each can reach the other. Labels run 1..k and must follow the topological order of the kingdoms (every teleporter goes from a label to an equal or larger one), so later puzzles can build on this function.",
      concept: "Kosaraju: a DFS records finish order on the original graph; a second sweep on the reversed graph, taking start nodes in decreasing finish time, carves out one strongly connected component at a time, in topological order.",
      functionName: "planetsAndKingdoms", signature: "planetsAndKingdoms(n, edges) → number[]",
      starterSource: starter("planetsAndKingdoms", "n, edges", "Iterative DFS on forward lists collecting finished[]; then for s in reverse finish order, flood the reversed lists with a new label."),
      solve: planetsAndKingdoms, comparator: "deep", accept: planetsAndKingdomsAccept, check: viaBrute(planetsAndKingdomsAccept, planetsAndKingdomsBrute), small: (round) => [2 + (round % 6), smallGraph(3400 + round, 2 + (round % 6), 2 + (round % 9))],
      reference: book("17.1", "Kosaraju's algorithm"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [5, 4]], directed: true }, "one kingdom": { a: 3, b: [[1, 2], [2, 3], [3, 1]], directed: true }, "a chain of kingdoms": { a: 3, b: [[3, 2], [2, 1]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("weak-components", "Ignoring direction merges planets that can reach each other one way only; kingdoms need routes both ways.", function planetsAndKingdoms(n, edges) { const both = []; for (let v = 0; v <= n; v += 1) both.push([]); for (let i = 0; i < edges.length; i += 1) { both[edges[i][0]].push(edges[i][1]); both[edges[i][1]].push(edges[i][0]); } const label = new Array(n + 1).fill(0); let count = 0; for (let s = 1; s <= n; s += 1) { if (label[s]) continue; count += 1; label[s] = count; const stack = [s]; while (stack.length) { const v = stack.pop(); for (const u of both[v]) if (!label[u]) { label[u] = count; stack.push(u); } } } return label.slice(1); }),
        diagnosis("reverse-topological-order", "This lab numbers kingdoms in topological order: sweep the reversed graph from the last finished node first (Tarjan users: renumber k + 1 − label).", function planetsAndKingdoms(n, edges) { const forward = [], backward = []; for (let v = 0; v <= n; v += 1) { forward.push([]); backward.push([]); } for (let i = 0; i < edges.length; i += 1) { forward[edges[i][0]].push(edges[i][1]); backward[edges[i][1]].push(edges[i][0]); } const visited = new Array(n + 1).fill(false), pointer = new Array(n + 1).fill(0); const finished = []; for (let s = 1; s <= n; s += 1) { if (visited[s]) continue; visited[s] = true; const stack = [s]; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= forward[v].length) { finished.push(v); stack.pop(); continue; } const u = forward[v][pointer[v]]; pointer[v] += 1; if (!visited[u]) { visited[u] = true; stack.push(u); } } } const label = new Array(n + 1).fill(0); let count = 0; for (let i = finished.length - 1; i >= 0; i -= 1) { const s = finished[i]; if (label[s]) continue; count += 1; label[s] = count; const stack = [s]; while (stack.length) { const v = stack.pop(); for (const u of backward[v]) if (!label[u]) { label[u] = count; stack.push(u); } } } return label.slice(1).map((value) => count + 1 - value); }),
      ],
      hints: ["First pass: iterative DFS over the forward lists; push a node to finished[] when its pointer runs out.", "Second pass: for i from finished.length − 1 down to 0, if unlabelled, flood the reversed lists with the next label.", "Return labels for planets 1..n."],
      cases: [
        example([5, [[1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [5, 4]]], [1, 1, 1, 2, 2], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], [1, 1, 1], "one kingdom"),
        run(planetsAndKingdoms, [3, [[3, 2], [2, 1]]], "a chain of kingdoms"),
        run(planetsAndKingdoms, [4, [[1, 2], [2, 1], [3, 4], [4, 3], [2, 3]]], "two kingdoms with a one-way link"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, DIRECTED_BIG()]),
      ],
    },
    {
      id: "giant-pizza", title: "Giant Pizza", cses: { id: 1684, name: "Giant Pizza" },
      goal: "A '+' or '-' per topping such that every family member gets at least one of their two wishes, or null when impossible. Wishes are pairs of signed topping numbers; any satisfying selection is accepted.",
      concept: "2-SAT: a wish (p ∨ q) means ¬p → q and ¬q → p. Build that implication graph on 2m literal nodes and take its strongly connected components: a topping whose two literals share a component is contradictory; otherwise pick the literal whose component comes later in topological order.",
      functionName: "giantPizza", signature: "giantPizza(wishes, m) → array of '+' / '-' or null",
      starterSource: starter("giantPizza", "wishes, m", "node(+x) = 2x − 1, node(−x) = 2x; edges node(−p) → node(q), node(−q) → node(p); labels = planetsAndKingdoms(2m, edges); x is '+' when label[node(−x)] < label[node(+x)]."),
      solve: giantPizza, comparator: "deep", dependencies: ["planets-and-kingdoms"], accept: giantPizzaAccept, check: viaBrute(giantPizzaAccept, giantPizzaBrute), small: (round) => { const m = 1 + (round % 5); const next = rng(3500 + round); const wishes = []; for (let i = 0; i < 1 + (round % 6); i += 1) wishes.push([(next() < 0.5 ? 1 : -1) * (1 + Math.floor(next() * m)), (next() < 0.5 ? 1 : -1) * (1 + Math.floor(next() * m))]); return [wishes, m]; },
      reference: book("17.2", "2SAT problem"),
      presets: { "CSES sample": { a: [[1, 2], [-1, 3], [4, -2]], b: 5 }, contradiction: { a: [[1, 1], [-1, -1]], b: 1 }, forced: { a: [[1, 1], [1, 2], [-2, -2]], b: 2 } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-contradiction-check", "A topping whose '+' and '−' literals share a component cannot be chosen either way: return null.", function giantPizza(wishes, m) { const node = (literal) => (literal > 0 ? 2 * literal - 1 : -2 * literal); const edges = []; for (let i = 0; i < wishes.length; i += 1) { const p = wishes[i][0], q = wishes[i][1]; edges.push([node(-p), node(q)]); edges.push([node(-q), node(p)]); } const label = planetsAndKingdoms(2 * m, edges); const out = []; for (let x = 1; x <= m; x += 1) { const yes = label[2 * x - 2], no = label[2 * x - 1]; out.push(no < yes ? "+" : "-"); } return out; }),
        diagnosis("rule-flipped", "Choose the literal whose component comes later in topological order: '+' when the '−' literal's label is smaller.", function giantPizza(wishes, m) { const node = (literal) => (literal > 0 ? 2 * literal - 1 : -2 * literal); const edges = []; for (let i = 0; i < wishes.length; i += 1) { const p = wishes[i][0], q = wishes[i][1]; edges.push([node(-p), node(q)]); edges.push([node(-q), node(p)]); } const label = planetsAndKingdoms(2 * m, edges); const out = []; for (let x = 1; x <= m; x += 1) { const yes = label[2 * x - 2], no = label[2 * x - 1]; if (yes === no) return null; out.push(no < yes ? "-" : "+"); } return out; }),
      ],
      hints: ["Literal nodes: +x → 2x − 1, −x → 2x; a wish [p, q] adds edges ¬p → q and ¬q → p.", "labels = planetsAndKingdoms(2m, edges); if label[+x] === label[−x] return null.", "x gets '+' when label[−x] < label[+x], otherwise '−'."],
      cases: [
        run(giantPizza, [[[1, 2], [-1, 3], [4, -2]], 5], "CSES sample"),
        example([[[1, 1], [-1, -1]], 1], null, "contradiction"),
        example([[[1, 1], [1, 2], [-2, -2]], 2], ["+", "-"], "forced choices"),
        run(giantPizza, [[[1, 2]], 3], "one wish, three toppings"),
        hidden("n = m = 100 000, satisfiable, time limit", () => [WISHES_BIG(), 100000]),
      ],
    },
    {
      id: "coin-collector", title: "Coin Collector", cses: { id: 1686, name: "Coin Collector" },
      goal: "Maximum number of coins collectable on a walk through one-way tunnels, starting and ending anywhere; each room's coins count once.",
      concept: "Inside a strongly connected component every room is reachable from every other, so a walk can take all of its coins. Condense the graph to components (a DAG, already in topological order by label) and take the best path sum over it.",
      functionName: "coinCollector", signature: "coinCollector(n, edges, coins) → number",
      starterSource: starter("coinCollector", "n, edges, coins", "label = planetsAndKingdoms(n, edges); total[c] = sum of coins per component; best[c] = total[c] + max best over incoming components, in label order."),
      solve: coinCollector, comparator: "scalar", dependencies: ["planets-and-kingdoms"], brute: coinCollectorBrute, small: (round) => { const n = 1 + (round % 6); return [n, smallGraph(3600 + round, n, 1 + (round % 8)), randomInts(3700 + round, n, 1, 9)]; },
      reference: book("17.1", "Strong connectivity · condensation"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [2, 1], [1, 3], [2, 4]], c: [4, 5, 2, 7], directed: true }, "one cycle": { a: 3, b: [[1, 2], [2, 3], [3, 1]], c: [1, 2, 3], directed: true }, "no tunnels": { a: 3, b: [], c: [5, 1, 4], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("no-condensation", "Rooms on a cycle never enter a topological order of the raw graph; condense the components first.", function coinCollector(n, edges, coins) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } const order = []; for (let v = 1; v <= n; v += 1) if (indegree[v] === 0) order.push(v); for (let head = 0; head < order.length; head += 1) { const list = adjacency[order[head]]; for (let k = 0; k < list.length; k += 1) { indegree[list[k]] -= 1; if (indegree[list[k]] === 0) order.push(list[k]); } } const best = new Array(n + 1).fill(0); let answer = 0; for (let head = 0; head < order.length; head += 1) { const v = order[head]; best[v] += coins[v - 1]; if (best[v] > answer) answer = best[v]; for (const u of adjacency[v]) if (best[v] > best[u]) best[u] = best[v]; } return answer; }),
        diagnosis("single-component", "A walk may leave a component for a later one; chain the component sums along the condensation.", function coinCollector(n, edges, coins) { const label = planetsAndKingdoms(n, edges); let count = 0; for (let v = 0; v < n; v += 1) if (label[v] > count) count = label[v]; const total = new Array(count + 1).fill(0); for (let v = 0; v < n; v += 1) total[label[v]] += coins[v]; let answer = 0; for (let c = 1; c <= count; c += 1) if (total[c] > answer) answer = total[c]; return answer; }),
      ],
      hints: ["Labels from planetsAndKingdoms are in topological order of the condensation.", "total[c] sums the coins of component c; best[c] starts as total[c].", "For c = 1..k: answer = max(answer, best[c]); for every tunnel leaving c to a different component d: best[d] = max(best[d], best[c] + total[d])."],
      cases: [
        example([4, [[1, 2], [2, 1], [1, 3], [2, 4]], [4, 5, 2, 7]], 16, "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]], [1, 2, 3]], 6, "one cycle"),
        example([3, [], [5, 1, 4]], 5, "no tunnels"),
        example([4, [[1, 2], [3, 2], [2, 4]], [1, 1, 10, 1]], 12, "best chain starts at 3"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, DIRECTED_BIG(), COINS_BIG()]),
      ],
    },
    {
      id: "mail-delivery", title: "Mail Delivery", cses: { id: 1691, name: "Mail Delivery" },
      goal: "A route that starts and ends at crossing 1 and uses every street exactly once, as the array of crossings visited, or null when none exists. Any such route is accepted.",
      concept: "Euler circuit: it exists exactly when every crossing has even degree and all streets hang together. Hierholzer's algorithm walks unused streets from the top of a stack, and a crossing whose streets are exhausted is popped onto the route; the route comes out reversed.",
      functionName: "mailDelivery", signature: "mailDelivery(n, edges) → number[] or null",
      starterSource: starter("mailDelivery", "n, edges", "Adjacency of [to, edgeId]; even degrees or null; stack = [1], used[]; pop exhausted nodes onto route; route.length === m + 1 or null; reverse."),
      solve: mailDelivery, comparator: "deep", accept: mailDeliveryAccept, check: viaBrute(mailDeliveryAccept, mailDeliveryBrute), small: (round) => [2 + (round % 5), round % 4 === 0 ? smallGraph(3800 + round, 2 + (round % 5), 2 + (round % 6), { undirected: true, distinct: true }) : randomWalkEdges(3900 + round, 2 + (round % 5), 2 + (round % 7), true)],
      reference: book("19.1", "Eulerian paths · Hierholzer's algorithm"),
      presets: { "CSES sample": { a: 6, b: [[1, 2], [1, 3], [2, 3], [2, 4], [2, 6], [3, 5], [3, 6], [4, 5]], directed: false }, "odd degree": { a: 3, b: [[1, 2], [2, 3]], directed: false }, "two triangles": { a: 5, b: [[1, 2], [2, 3], [3, 1], [1, 4], [4, 5], [5, 1]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-degree-check", "An odd-degree crossing makes a circuit impossible; check the degrees (or the route length) and return null.", function mailDelivery(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push([edges[i][1], i]); adjacency[edges[i][1]].push([edges[i][0], i]); } const used = new Array(edges.length).fill(false), pointer = new Array(n + 1).fill(0); const stack = [1], route = []; while (stack.length) { const v = stack[stack.length - 1]; const list = adjacency[v]; while (pointer[v] < list.length && used[list[pointer[v]][1]]) pointer[v] += 1; if (pointer[v] >= list.length) { route.push(v); stack.pop(); continue; } const step = list[pointer[v]]; used[step[1]] = true; stack.push(step[0]); } return route.reverse(); }),
        diagnosis("greedy-walk", "Walking unused streets until stuck leaves streets behind; Hierholzer's stack splices the leftover loops in.", function mailDelivery(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push([edges[i][1], i]); adjacency[edges[i][1]].push([edges[i][0], i]); } for (let v = 1; v <= n; v += 1) if (adjacency[v].length % 2 !== 0) return null; const used = new Array(edges.length).fill(false), pointer = new Array(n + 1).fill(0); const route = [1]; let v = 1; while (true) { const list = adjacency[v]; while (pointer[v] < list.length && used[list[pointer[v]][1]]) pointer[v] += 1; if (pointer[v] >= list.length) break; const step = list[pointer[v]]; used[step[1]] = true; v = step[0]; route.push(v); } return route; }),
      ],
      hints: ["Adjacency entries [neighbour, edgeIndex] so an undirected street can be marked used from either side.", "If any crossing has odd degree return null. stack = [1]; while the stack is not empty: skip used streets of the top; if none left, pop it onto route; else mark the street used and push the neighbour.", "route must have m + 1 crossings (otherwise the streets were not all connected); reverse it."],
      cases: [
        run(mailDelivery, [6, [[1, 2], [1, 3], [2, 3], [2, 4], [2, 6], [3, 5], [3, 6], [4, 5]]], "CSES sample"),
        example([3, [[1, 2], [2, 3]]], null, "odd degrees"),
        run(mailDelivery, [5, [[1, 2], [2, 3], [3, 1], [1, 4], [4, 5], [5, 1]]], "two triangles through 1"),
        example([4, [[1, 2], [2, 1], [3, 4], [4, 3]]], null, "a loop that 1 cannot reach"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, MAIL_BIG()]),
      ],
    },
    {
      id: "de-bruijn-sequence", title: "De Bruijn Sequence", cses: { id: 1692, name: "De Bruijn Sequence" },
      goal: "A bit string of length 2ⁿ + n − 1 that contains every n-bit string as a substring. Any such string is accepted.",
      concept: "Take the (n − 1)-bit strings as nodes; appending a bit is an edge, so each edge is an n-bit string. Every node has in-degree and out-degree 2, so an Euler circuit exists, and reading the appended bits along it after n − 1 zeros lists every n-bit string once.",
      functionName: "deBruijnSequence", signature: "deBruijnSequence(n) → string",
      starterSource: starter("deBruijnSequence", "n", "n = 1 → '01'. Nodes 0..2^(n−1) − 1, edge bit b leads to ((v << 1) | b) & mask; Hierholzer from 0 collecting bits; prefix n − 1 zeros."),
      solve: deBruijnSequence, comparator: "deep", accept: deBruijnAccept, check: (args, out) => deBruijnAccept(args, out) === true, small: (round) => [1 + (round % 8)],
      reference: book("19.3", "De Bruijn sequences"),
      scene: { kind: "algo", view: "text", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 3, min: 1, max: 6 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("missing-prefix", "The circuit's bits alone are 2ⁿ long; the first n − 1 zeros (the start node) must be prepended.", function deBruijnSequence(n) { if (n === 1) return "01"; const nodes = 1 << (n - 1), mask = nodes - 1; const pointer = new Array(nodes).fill(0); const stack = [[0, -1]]; const bits = []; while (stack.length) { const top = stack[stack.length - 1]; const v = top[0]; if (pointer[v] < 2) { const bit = pointer[v]; pointer[v] += 1; stack.push([((v << 1) | bit) & mask, bit]); } else { stack.pop(); if (top[1] >= 0) bits.push(top[1]); } } return bits.reverse().join(""); }),
        diagnosis("greedy-walk", "Taking unused edges until stuck can strand edges; Hierholzer's stack is needed to splice the leftovers.", function deBruijnSequence(n) { if (n === 1) return "01"; const nodes = 1 << (n - 1), mask = nodes - 1; const pointer = new Array(nodes).fill(0); let v = 0; let bits = ""; while (pointer[v] < 2) { const bit = pointer[v]; pointer[v] += 1; v = ((v << 1) | bit) & mask; bits += bit; } return "0".repeat(n - 1) + bits; }),
      ],
      hints: ["Nodes are (n − 1)-bit numbers; from v the edge with bit b goes to ((v << 1) | b) & mask, where mask = 2^(n−1) − 1.", "Hierholzer with a stack of [node, bitUsedToGetHere]; pointer[v] counts the bits already tried (0, 1); popping a finished node records its bit.", "Reverse the recorded bits and prepend n − 1 zeros."],
      cases: [
        example([2], "00110", "CSES sample"),
        example([1], "01", "n = 1"),
        run(deBruijnSequence, [3], "n = 3"),
        run(deBruijnSequence, [5], "n = 5"),
        hidden("n = 15", () => [15]),
      ],
    },
    {
      id: "teleporters-path", title: "Teleporters Path", cses: { id: 1693, name: "Teleporters Path" },
      goal: "A route from level 1 to level n that uses every teleporter exactly once, as the array of levels visited, or null. Any such route is accepted.",
      concept: "Directed Euler path: level 1 needs one more outgoing than incoming teleporter, level n one more incoming, every other level a balance, and all teleporters must be reachable from 1. Hierholzer from level 1 then produces the route (reversed).",
      functionName: "teleportersPath", signature: "teleportersPath(n, edges) → number[] or null",
      starterSource: starter("teleportersPath", "n, edges", "Check out/in degrees; stack = [1] with pointer[v] into adjacency; pop exhausted levels onto route; route.length === m + 1 and route starts (after reversal) at 1, ends at n, else null."),
      solve: teleportersPath, comparator: "deep", accept: teleportersPathAccept, check: viaBrute(teleportersPathAccept, teleportersPathBrute), small: (round) => [2 + (round % 5), round % 4 === 0 ? smallGraph(4000 + round, 2 + (round % 5), 2 + (round % 6)) : randomWalkEdges(4100 + round, 2 + (round % 5), 2 + (round % 7), false)],
      reference: book("19.1", "Eulerian paths · directed graphs"),
      presets: { "CSES sample": { a: 5, b: [[1, 2], [1, 3], [2, 4], [2, 5], [3, 1], [4, 2]], directed: true }, "wrong balance": { a: 3, b: [[1, 2], [2, 3], [3, 1]], directed: true }, straight: { a: 3, b: [[1, 2], [2, 3]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-degree-check", "Without the degree conditions the walk ends somewhere else or leaves teleporters unused; check them (or the route) and return null.", function teleportersPath(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const pointer = new Array(n + 1).fill(0); const stack = [1], route = []; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { route.push(v); stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; stack.push(u); } return route.reverse(); }),
        diagnosis("requires-circuit", "This is a path, not a circuit: level 1 has one extra departure and level n one extra arrival; only the other levels must be balanced.", function teleportersPath(n, edges) { const adjacency = []; const indegree = new Array(n + 1).fill(0); for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) { adjacency[edges[i][0]].push(edges[i][1]); indegree[edges[i][1]] += 1; } for (let v = 1; v <= n; v += 1) if (adjacency[v].length !== indegree[v]) return null; const pointer = new Array(n + 1).fill(0); const stack = [1], route = []; while (stack.length) { const v = stack[stack.length - 1]; if (pointer[v] >= adjacency[v].length) { route.push(v); stack.pop(); continue; } const u = adjacency[v][pointer[v]]; pointer[v] += 1; stack.push(u); } return route.length === edges.length + 1 && route[0] === n ? route.reverse() : null; }),
      ],
      hints: ["out(1) = in(1) + 1, in(n) = out(n) + 1, every other level balanced; otherwise null.", "Hierholzer: stack = [1]; while not empty, take the next unused teleporter of the top or pop the top onto route.", "route reversed must have m + 1 levels and end at n; otherwise null."],
      cases: [
        run(teleportersPath, [5, [[1, 2], [1, 3], [2, 4], [2, 5], [3, 1], [4, 2]]], "CSES sample"),
        example([3, [[1, 2], [2, 3], [3, 1]]], null, "a circuit is not a path"),
        example([3, [[1, 2], [2, 3]]], [1, 2, 3], "straight"),
        example([4, [[1, 4], [2, 3], [3, 2]]], null, "unreachable teleporters"),
        hidden("n = 100 000, m = 200 000, time limit", () => [100000, TELEPORT_PATH_BIG()]),
      ],
    },
    {
      id: "hamiltonian-flights", title: "Hamiltonian Flights", cses: { id: 1690, name: "Hamiltonian Flights" },
      goal: "Number of routes from city 1 to city n that visit every city exactly once (n ≤ 20), modulo 10⁹ + 7.",
      concept: "Dynamic programming over subsets: ways[mask][v] = routes that start at 1, visit exactly the cities in mask and end at v. Extend by any flight u → v with u in mask; city n may only be entered last.",
      functionName: "hamiltonianFlights", signature: "hamiltonianFlights(n, edges) → number",
      starterSource: starter("hamiltonianFlights", "n, edges", "incoming[v][u] counts flights u → v (0-based). ways[1][0] = 1; for masks containing bit 0: skip masks that contain n − 1 unless full; sum over u in mask of ways[mask ^ v][u] · incoming[v][u]."),
      solve: hamiltonianFlights, comparator: "scalar", brute: hamiltonianFlightsBrute, small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(4200 + round, n, 2 + (round % 12))]; },
      reference: book("19.2", "Hamiltonian paths · subset DP"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [1, 3], [2, 3], [3, 2], [2, 4], [3, 4]], directed: true }, "two endings": { a: 3, b: [[1, 2], [2, 3], [1, 3], [3, 2]], directed: true }, "parallel flights": { a: 2, b: [[1, 2], [1, 2]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7.", function hamiltonianFlights(n, edges) { const incoming = []; for (let v = 0; v < n; v += 1) incoming.push(new Array(n).fill(0)); for (let i = 0; i < edges.length; i += 1) incoming[edges[i][1] - 1][edges[i][0] - 1] += 1; const full = (1 << n) - 1; const ways = new Array((1 << n) * n).fill(0); ways[1 * n + 0] = 1; for (let mask = 1; mask <= full; mask += 1) { if (!(mask & 1)) continue; if ((mask & (1 << (n - 1))) && mask !== full) continue; for (let v = 1; v < n; v += 1) { if (!(mask & (1 << v))) continue; const rest = mask ^ (1 << v); let sum = 0; for (let u = 0; u < n; u += 1) { if (!(rest & (1 << u)) || incoming[v][u] === 0) continue; sum += incoming[v][u] * ways[rest * n + u]; } ways[mask * n + v] = sum; } } return ways[full * n + (n - 1)]; }),
        diagnosis("any-ending", "Only routes that end at city n count; do not sum over every last city.", function hamiltonianFlights(n, edges) { const incoming = []; for (let v = 0; v < n; v += 1) incoming.push(new Array(n).fill(0)); for (let i = 0; i < edges.length; i += 1) incoming[edges[i][1] - 1][edges[i][0] - 1] += 1; const full = (1 << n) - 1; const ways = new Array((1 << n) * n).fill(0); ways[1 * n + 0] = 1; for (let mask = 1; mask <= full; mask += 1) { if (!(mask & 1)) continue; for (let v = 1; v < n; v += 1) { if (!(mask & (1 << v))) continue; const rest = mask ^ (1 << v); let sum = 0; for (let u = 0; u < n; u += 1) { if (!(rest & (1 << u)) || incoming[v][u] === 0) continue; sum = (sum + incoming[v][u] * ways[rest * n + u]) % 1000000007; } ways[mask * n + v] = sum; } } let total = 0; for (let v = 0; v < n; v += 1) total = (total + ways[full * n + v]) % 1000000007; return n === 1 ? 1 : total; }),
      ],
      hints: ["ways as a flat array of size 2ⁿ · n; ways[1 · n + 0] = 1 (mask {1}, ending at city 1).", "For each mask with bit 0 set (and bit n − 1 only when mask is full), for each v in mask: sum ways[mask without v][u] · flights(u → v) over u in the rest.", "Answer ways[full · n + (n − 1)] modulo 10⁹ + 7."],
      cases: [
        example([4, [[1, 2], [1, 3], [2, 3], [3, 2], [2, 4], [3, 4]]], 2, "CSES sample"),
        example([3, [[1, 2], [2, 3], [1, 3], [3, 2]]], 1, "route ending at 2 does not count"),
        example([2, [[1, 2], [1, 2]]], 2, "parallel flights"),
        example([3, [[1, 3], [3, 2]]], 0, "n must be last"),
        hidden("n = 16, every flight, time limit", () => [16, HAMILTON_16()]),
      ],
    },
    {
      id: "knights-tour", title: "Knight's Tour", cses: { id: 1689, name: "Knight's Tour" },
      goal: "An 8 × 8 board of move numbers 1..64 for a knight's tour starting at column x, row y. Any tour is accepted.",
      concept: "Warnsdorff's rule: always jump to the square with the fewest onward moves, which keeps the knight from stranding corners. With backtracking as a safety net it finds a tour from every start almost immediately.",
      functionName: "knightsTour", signature: "knightsTour(x, y) → number[8][8]",
      starterSource: starter("knightsTour", "x, y", "board[row][col] with row = y − 1, col = x − 1. DFS: sort the free jumps by their onward degree, recurse, undo on failure."),
      solve: knightsTour, comparator: "deep", accept: knightsTourAccept, check: (args, out) => knightsTourAccept(args, out) === true, small: (round) => [1 + (round % 8), 1 + Math.floor(round / 8) % 8],
      reference: book("19.4", "Knight's tours · Warnsdorff's rule"),
      scene: { kind: "algo", view: "number-grid", handles: [{ id: "x", type: "slider", label: "column x (rounded)", value: 2, min: 1, max: 8 }, { id: "y", type: "slider", label: "row y (rounded)", value: 1, min: 1, max: 8 }], args: [{ fixture: "roundedX" }, { fixture: "roundedY" }] },
      diagnoses: [
        diagnosis("axes-swapped", "x is the column and y the row: move 1 belongs at board[y − 1][x − 1].", function knightsTour(x, y) { const board = []; for (let r = 0; r < 8; r += 1) board.push(new Array(8).fill(0)); const jumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]; const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8; const degree = (r, c) => { let count = 0; for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === 0) count += 1; } return count; }; const visit = (r, c, step) => { board[r][c] = step; if (step === 64) return true; const options = []; for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === 0) options.push([degree(nr, nc), nr, nc]); } options.sort((p, q) => p[0] - q[0]); for (let i = 0; i < options.length; i += 1) if (visit(options[i][1], options[i][2], step + 1)) return true; board[r][c] = 0; return false; }; visit(x - 1, y - 1, 1); return board; }),
        diagnosis("zero-based-moves", "Moves are numbered from 1 to 64.", function knightsTour(x, y) { const board = []; for (let r = 0; r < 8; r += 1) board.push(new Array(8).fill(-1)); const jumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]; const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8; const degree = (r, c) => { let count = 0; for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === -1) count += 1; } return count; }; const visit = (r, c, step) => { board[r][c] = step; if (step === 63) return true; const options = []; for (let k = 0; k < 8; k += 1) { const nr = r + jumps[k][0], nc = c + jumps[k][1]; if (inside(nr, nc) && board[nr][nc] === -1) options.push([degree(nr, nc), nr, nc]); } options.sort((p, q) => p[0] - q[0]); for (let i = 0; i < options.length; i += 1) if (visit(options[i][1], options[i][2], step + 1)) return true; board[r][c] = -1; return false; }; visit(y - 1, x - 1, 0); return board; }),
      ],
      hints: ["Eight jump offsets; inside(r, c) and a degree(r, c) that counts free onward squares.", "visit(r, c, step): place the number; if step === 64 succeed; collect free jumps, sort by degree, recurse; on failure clear the square.", "Start at visit(y − 1, x − 1, 1) and return the board."],
      cases: [
        run(knightsTour, [2, 1], "CSES sample start"),
        run(knightsTour, [1, 1], "corner"),
        run(knightsTour, [8, 8], "far corner"),
        run(knightsTour, [5, 8], "bottom row"),
        run(knightsTour, [6, 8], "bottom row again"),
        run(knightsTour, [7, 8], "bottom row once more"),
      ],
    },
    {
      id: "max-flow", title: "Maximum Flow", cses: { id: 1694, name: "Download Speed (brick)" },
      goal: "The maximum flow from source to sink and a flow per edge that achieves it, as { value, flows }. Any maximum flow is accepted.",
      concept: "Edmonds–Karp: while a BFS in the residual graph finds a path from source to sink, push the bottleneck along it. Every edge gets a paired reverse edge whose capacity grows as flow is pushed, so later paths can undo earlier choices.",
      functionName: "maxFlow", signature: "maxFlow(n, edges, source, sink) → { value, flows }",
      starterSource: starter("maxFlow", "n, edges, source, sink", "edges [a, b, capacity]. Edge 2i is a → b, edge 2i + 1 its reverse with capacity 0; BFS records via[node] = edge; bottleneck; update both directions; flows[i] = capacity − residual of edge 2i."),
      solve: maxFlow, comparator: "deep", accept: maxFlowAccept, check: viaBrute(maxFlowAccept, maxFlowBrute), small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(4300 + round, n, 1 + (round % 9), { weights: [1, 9] }), 1, n]; },
      reference: book("20.1", "Ford–Fulkerson algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 3], [2, 4, 2], [1, 3, 4], [3, 4, 5], [4, 1, 3]], c: 1, d: 4, directed: true }, "needs a reverse edge": { a: 4, b: [[1, 2, 1], [1, 3, 1], [2, 3, 1], [2, 4, 1], [3, 4, 1]], c: 1, d: 4, directed: true }, "one pipe": { a: 2, b: [[1, 2, 7]], c: 1, d: 2, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }] },
      diagnoses: [
        diagnosis("no-reverse-edges", "Without reverse edges an early path cannot be rerouted: a depth-first walk that takes 1→2→3→4 first strands the second unit.", function maxFlow(n, edges, source, sink) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); const to = [], capacity = []; for (let i = 0; i < edges.length; i += 1) { to.push(edges[i][1]); capacity.push(edges[i][2]); adjacency[edges[i][0]].push(i); } let value = 0, rounds = 0; while (rounds < 2000) { rounds += 1; const via = new Array(n + 1).fill(-1); via[source] = -2; const walk = (v) => { if (v === sink) return true; const list = adjacency[v]; for (let k = 0; k < list.length; k += 1) { const e = list[k]; if (capacity[e] > 0 && via[to[e]] === -1) { via[to[e]] = e; if (walk(to[e])) return true; } } return false; }; if (!walk(source)) break; const from = (e) => edges[e][0]; let push = Infinity; for (let v = sink; v !== source; v = from(via[v])) push = Math.min(push, capacity[via[v]]); for (let v = sink; v !== source; v = from(via[v])) capacity[via[v]] -= push; value += push; } const flows = []; for (let i = 0; i < edges.length; i += 1) flows.push(edges[i][2] - capacity[i]); return { value, flows }; }),
        diagnosis("source-capacity", "The capacity leaving the source is only an upper bound; the flow must actually reach the sink.", function maxFlow(n, edges, source, sink) { let value = 0; const flows = []; for (let i = 0; i < edges.length; i += 1) { flows.push(0); if (edges[i][0] === source) value += edges[i][2]; } return { value, flows }; }),
      ],
      hints: ["Arrays to[] and capacity[] with edge 2i forward and 2i + 1 backward; adjacency lists hold edge indices; e ^ 1 is the paired edge.", "BFS from source over edges with capacity > 0, storing via[node]; stop when the sink is reached; no path → done.", "Bottleneck = min capacity along via; subtract it forward and add it to the paired edges; value += bottleneck. flows[i] = cap − capacity[2i]."],
      cases: [
        run(maxFlow, [4, [[1, 2, 3], [2, 4, 2], [1, 3, 4], [3, 4, 5], [4, 1, 3]], 1, 4], "CSES sample"),
        run(maxFlow, [4, [[1, 2, 1], [1, 3, 1], [2, 3, 1], [2, 4, 1], [3, 4, 1]], 1, 4], "needs a reverse edge"),
        run(maxFlow, [2, [[1, 2, 7]], 1, 2], "one pipe"),
        run(maxFlow, [3, [[1, 2, 5]], 1, 3], "no path"),
        hidden("n = 500, m = 1000, time limit", () => [500, FLOW_BIG(), 1, 500]),
      ],
    },
    {
      id: "download-speed", title: "Download Speed", cses: { id: 1694, name: "Download Speed" },
      goal: "Maximum total speed from computer 1 to computer n through connections with individual speed limits.",
      concept: "This is the value of a maximum flow from 1 to n: the connections are capacities and the download splits over many routes at once.",
      functionName: "downloadSpeed", signature: "downloadSpeed(n, edges) → number",
      starterSource: starter("downloadSpeed", "n, edges", "return maxFlow(n, edges, 1, n).value"),
      solve: downloadSpeed, comparator: "scalar", dependencies: ["max-flow"], brute: downloadSpeedBrute, small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(4400 + round, n, 1 + (round % 9), { weights: [1, 9] })]; },
      reference: book("20.1", "Ford–Fulkerson algorithm"),
      presets: { "CSES sample": { a: 4, b: [[1, 2, 3], [2, 4, 2], [1, 3, 4], [3, 4, 5], [4, 1, 3]], directed: true }, "bottleneck": { a: 3, b: [[1, 2, 9], [2, 3, 2]], directed: true }, "two routes": { a: 4, b: [[1, 2, 4], [2, 4, 4], [1, 3, 1], [3, 4, 1]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("single-route", "One augmenting path is only the first route; keep augmenting until no path remains.", function downloadSpeed(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push([edges[i][1], edges[i][2]]); const via = new Array(n + 1).fill(null); via[1] = [1, Infinity]; const queue = [1]; for (let head = 0; head < queue.length && !via[n]; head += 1) { const v = queue[head]; for (const [u, c] of adjacency[v]) if (!via[u]) { via[u] = [v, c]; queue.push(u); } } if (!via[n]) return 0; let best = Infinity; for (let v = n; v !== 1; v = via[v][0]) best = Math.min(best, via[v][1]); return best; }),
        diagnosis("source-capacity", "The connections leaving computer 1 only bound the answer; downstream limits matter too.", function downloadSpeed(n, edges) { let total = 0; for (let i = 0; i < edges.length; i += 1) if (edges[i][0] === 1) total += edges[i][2]; return total; }),
      ],
      hints: ["The connections are already [a, b, capacity].", "Call maxFlow with source 1 and sink n.", "Return its value."],
      cases: [
        example([4, [[1, 2, 3], [2, 4, 2], [1, 3, 4], [3, 4, 5], [4, 1, 3]]], 6, "CSES sample"),
        example([3, [[1, 2, 9], [2, 3, 2]]], 2, "bottleneck"),
        example([4, [[1, 2, 4], [2, 4, 4], [1, 3, 1], [3, 4, 1]]], 5, "two routes"),
        example([3, [[1, 2, 5]]], 0, "no route"),
        hidden("n = 500, m = 1000, time limit", () => [500, FLOW_BIG()]),
      ],
    },
    {
      id: "police-chase", title: "Police Chase", cses: { id: 1695, name: "Police Chase" },
      goal: "A smallest set of streets whose closure separates the bank (crossing 1) from the harbour (crossing n), as [a, b] pairs. Any minimum cut is accepted.",
      concept: "Minimum cut equals maximum flow. Model each street as two one-way arcs of capacity 1, run the flow, then take the crossings still reachable from 1 in the residual graph: the streets leaving that set are the cut.",
      functionName: "policeChase", signature: "policeChase(n, streets) → [[a, b], …]",
      starterSource: starter("policeChase", "n, streets", "edges: both arcs per street with capacity 1; flow = maxFlow(n, edges, 1, n); residual BFS from 1 (forward arcs with room, backward arcs with flow); streets with endpoints on different sides."),
      solve: policeChase, comparator: "deep", dependencies: ["max-flow"], accept: policeChaseAccept, check: viaBrute(policeChaseAccept, policeChaseBrute), small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(4500 + round, n, 1 + (round % 9), { undirected: true, distinct: true })]; },
      reference: book("20.1", "Ford–Fulkerson algorithm · minimum cuts"),
      presets: { "CSES sample": { a: 4, b: [[1, 2], [1, 3], [2, 3], [3, 4], [1, 4]], directed: false }, "one street": { a: 2, b: [[1, 2]], directed: false }, "already separated": { a: 3, b: [[1, 2]], directed: false } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("streets-of-the-bank", "Closing every street at crossing 1 works but is not minimal; the residual reachability picks the cheapest cut.", function policeChase(n, streets) { const out = []; for (let i = 0; i < streets.length; i += 1) if (streets[i][0] === 1 || streets[i][1] === 1) out.push([streets[i][0], streets[i][1]]); return out; }),
        diagnosis("first-k-streets", "The flow value says how many streets to close, not which ones; find them from the residual graph.", function policeChase(n, streets) { const edges = []; for (let i = 0; i < streets.length; i += 1) { edges.push([streets[i][0], streets[i][1], 1]); edges.push([streets[i][1], streets[i][0], 1]); } const flow = maxFlow(n, edges, 1, n); return streets.slice(0, flow.value).map((s) => [s[0], s[1]]); }),
      ],
      hints: ["Two arcs per street, capacity 1 each; maxFlow(n, edges, 1, n) gives flows per arc.", "Residual BFS from 1: arc i is usable if edges[i][2] − flows[i] > 0, and its reverse direction is usable if flows[i] > 0.", "Output every street whose two crossings end up on different sides."],
      cases: [
        run(policeChase, [4, [[1, 2], [1, 3], [2, 3], [3, 4], [1, 4]]], "CSES sample"),
        example([2, [[1, 2]]], [[1, 2]], "one street"),
        example([3, [[1, 2]]], [], "already separated"),
        run(policeChase, [5, [[1, 2], [1, 3], [2, 4], [3, 4], [4, 5]]], "the harbour's only street"),
        hidden("n = 500, m = 1000, time limit", () => [500, STREETS_BIG()]),
      ],
    },
    {
      id: "school-dance", title: "School Dance", cses: { id: 1696, name: "School Dance" },
      goal: "A largest set of dancing pairs [boy, girl] from the allowed pairs, each person in at most one pair. Any maximum matching is accepted.",
      concept: "Maximum bipartite matching is a flow: a source feeding every boy, every girl draining to a sink, and the allowed pairs as unit-capacity edges in between. Edges that carry flow are the matched pairs.",
      functionName: "schoolDance", signature: "schoolDance(n, m, pairs) → [[boy, girl], …]",
      starterSource: starter("schoolDance", "n, m, pairs", "Nodes: boys 1..n, girls n + 1..n + m, source n + m + 1, sink n + m + 2; unit edges; pairs whose edge has flow 1."),
      solve: schoolDance, comparator: "deep", dependencies: ["max-flow"], accept: schoolDanceAccept, check: viaBrute(schoolDanceAccept, schoolDanceBrute), small: (round) => { const n = 1 + (round % 4), m = 1 + ((round * 3) % 4); const next = rng(4600 + round); const pairs = []; const seen = new Set(); for (let i = 0; i < 1 + (round % 6); i += 1) { const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * m); if (!seen.has(a + "," + b)) { seen.add(a + "," + b); pairs.push([a, b]); } } return [n, m, pairs]; },
      reference: book("20.3", "Maximum matchings · bipartite graphs"),
      presets: { "CSES sample": { a: 3, b: 2, c: [[1, 1], [1, 2], [2, 1], [3, 1]] }, "greedy fails": { a: 2, b: 2, c: [[1, 1], [1, 2], [2, 1]] }, "everyone paired": { a: 2, b: 2, c: [[1, 1], [2, 2]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("greedy-in-order", "Taking pairs greedily in input order can block a larger matching; augmenting paths (the flow) reassign partners.", function schoolDance(n, m, pairs) { const boys = new Set(), girls = new Set(); const out = []; for (let i = 0; i < pairs.length; i += 1) { if (boys.has(pairs[i][0]) || girls.has(pairs[i][1])) continue; boys.add(pairs[i][0]); girls.add(pairs[i][1]); out.push([pairs[i][0], pairs[i][1]]); } return out; }),
        diagnosis("girls-shared", "Every girl, like every boy, dances at most once: give the girl → sink edges capacity 1.", function schoolDance(n, m, pairs) { const source = n + m + 1, sink = n + m + 2; const edges = []; for (let boy = 1; boy <= n; boy += 1) edges.push([source, boy, 1]); for (let girl = 1; girl <= m; girl += 1) edges.push([n + girl, sink, n]); for (let i = 0; i < pairs.length; i += 1) edges.push([pairs[i][0], n + pairs[i][1], 1]); const flow = maxFlow(n + m + 2, edges, source, sink); const out = []; for (let i = 0; i < pairs.length; i += 1) if (flow.flows[n + m + i] === 1) out.push([pairs[i][0], pairs[i][1]]); return out; }),
      ],
      hints: ["Number the nodes: boy b is b, girl g is n + g, source n + m + 1, sink n + m + 2.", "Edges: source → boy (1), girl → sink (1), boy → girl (1) for each allowed pair; run maxFlow.", "The pair edges come after the n + m source/sink edges: pair i is edge n + m + i; output those with flow 1."],
      cases: [
        run(schoolDance, [3, 2, [[1, 1], [1, 2], [2, 1], [3, 1]]], "CSES sample"),
        run(schoolDance, [2, 2, [[1, 1], [1, 2], [2, 1]]], "greedy fails"),
        example([2, 2, [[1, 1], [2, 2]]], [[1, 1], [2, 2]], "everyone paired"),
        example([2, 1, [[1, 1], [2, 1]]], [[1, 1]], "one girl"),
        hidden("n = m = 500, k = 1000, time limit", () => [500, 500, DANCE_BIG()]),
      ],
    },
    {
      id: "distinct-routes", title: "Distinct Routes", cses: { id: 1711, name: "Distinct Routes" },
      goal: "A largest set of routes from room 1 to room n that share no teleporter, each route as an array of rooms. Any such set is accepted.",
      concept: "Edge-disjoint paths are a unit-capacity flow: the value is the number of routes, and walking the teleporters that carry flow, consuming each once, peels the routes off one at a time.",
      functionName: "distinctRoutes", signature: "distinctRoutes(n, edges) → number[][]",
      starterSource: starter("distinctRoutes", "n, edges", "flow = maxFlow(n, edges with capacity 1, 1, n); adjacency of teleporters with flow 1; for each of flow.value routes walk from 1 to n consuming teleporters."),
      solve: distinctRoutes, comparator: "deep", dependencies: ["max-flow"], accept: distinctRoutesAccept, check: viaBrute(distinctRoutesAccept, distinctRoutesBrute), small: (round) => { const n = 2 + (round % 6); return [n, smallGraph(4700 + round, n, 1 + (round % 10), { distinct: true })]; },
      reference: book("20.2", "Disjoint paths · edge-disjoint"),
      presets: { "CSES sample": { a: 6, b: [[1, 2], [1, 3], [2, 6], [3, 4], [3, 5], [4, 6], [5, 6]], directed: true }, "shared teleporter": { a: 4, b: [[1, 2], [1, 3], [2, 4], [3, 2]], directed: true }, "no route": { a: 3, b: [[2, 3]], directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("single-route", "One route is rarely the maximum; the flow value tells how many disjoint routes exist.", function distinctRoutes(n, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const parent = new Array(n + 1).fill(0); parent[1] = 1; const queue = [1]; for (let head = 0; head < queue.length; head += 1) for (const u of adjacency[queue[head]]) if (parent[u] === 0) { parent[u] = queue[head]; queue.push(u); } if (parent[n] === 0) return []; const route = []; for (let v = n; v !== 1; v = parent[v]) route.push(v); route.push(1); return [route.reverse()]; }),
        diagnosis("teleporters-reused", "Routes must not share a teleporter; consume each flow-carrying teleporter once.", function distinctRoutes(n, edges) { const capacities = edges.map((edge) => [edge[0], edge[1], 1]); const flow = maxFlow(n, capacities, 1, n); const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) if (flow.flows[i] === 1) adjacency[edges[i][0]].push(edges[i][1]); const routes = []; for (let r = 0; r < flow.value; r += 1) { const route = [1]; let v = 1, guard = 0; while (v !== n && guard <= n) { v = adjacency[v][0]; route.push(v); guard += 1; } routes.push(route); } return routes; }),
      ],
      hints: ["maxFlow with every teleporter at capacity 1; the value is the number of routes.", "Build adjacency lists from the teleporters whose flow is 1, with a pointer per room.", "For each route: from 1, take the next unconsumed teleporter of the current room until n; conservation guarantees one exists."],
      cases: [
        run(distinctRoutes, [6, [[1, 2], [1, 3], [2, 6], [3, 4], [3, 5], [4, 6], [5, 6]]], "CSES sample"),
        run(distinctRoutes, [4, [[1, 2], [1, 3], [2, 4], [3, 2]]], "shared teleporter"),
        example([3, [[2, 3]]], [], "no route"),
        example([2, [[1, 2]]], [[1, 2]], "one route"),
        hidden("n = 500, m = 1000, time limit", () => [500, ROUTES_500()]),
      ],
    },
  ];
  function smallMaze(seed, rows, cols) {
    const next = rng(seed);
    const grid = [];
    for (let r = 0; r < rows; r += 1) { let row = ""; for (let c = 0; c < cols; c += 1) row += next() < 0.25 ? "#" : "."; grid.push(row); }
    grid[0] = "A" + grid[0].slice(1);
    grid[rows - 1] = grid[rows - 1].slice(0, cols - 1) + "B";
    if (rows === 1) grid[0] = "A" + grid[0].slice(1, cols - 1) + "B";
    return grid;
  }
  function smallMonsterGrid(seed, rows, cols) {
    const next = rng(seed);
    const grid = [];
    for (let r = 0; r < rows; r += 1) { let row = ""; for (let c = 0; c < cols; c += 1) { const roll = next(); row += roll < 0.2 ? "#" : (roll < 0.35 ? "M" : "."); } grid.push(row); }
    const r = Math.floor(next() * rows), c = Math.floor(next() * cols);
    grid[r] = grid[r].slice(0, c) + "A" + grid[r].slice(c + 1);
    return grid;
  }
  core.share({ dsuFind, dsuUnion, maxFlow, planetsAndKingdoms, courseSchedule });
  core.define("graphs", GRAPHS);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

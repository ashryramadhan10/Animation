(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  // ------------------------------------------------------------------ 4 · graph algorithms
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

  const ROOMS_BIG = lazy(() => randomGrid(31, 1000, 1000, "#", "#", ".", 0.3));
  const LAB_BIG = lazy(() => (() => { const grid = randomGrid(32, 1000, 1000, "#", "#", ".", 0.25); grid[0] = "A" + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "B"; return grid; })());
  const ROADS_BIG_EDGES = lazy(() => (() => { const a = randomInts(33, 100000, 1, 100000), b = randomInts(34, 100000, 1, 100000); return a.map((v, i) => [v, b[i]]); })());
  const TEAMS_BIG_EDGES = lazy(() => (() => { const a = randomInts(35, BIG, 1, 50000), b = randomInts(36, BIG, 1, 50000); return a.map((v, i) => [2 * v - 1, 2 * b[i]]); })());
  const ROUTES_BIG_EDGES = lazy(() => (() => { const a = randomInts(37, BIG, 1, 100000), b = randomInts(38, BIG, 1, 100000), w = randomInts(39, BIG, 1, 1000000000); const list = a.map((v, i) => [v, b[i], w[i]]); for (let v = 1; v < 100000; v += 1) list.push([v, v + 1, 1000000000]); return list; })());

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
      id: "heap-push", track: "graphs", title: "Heap Push", cses: { id: 1671, name: "Shortest Routes I (brick)" },
      goal: "Append an item to a binary min-heap array and sift it up. Items are [key, value]; the heap is modified in place and returned.",
      concept: "JavaScript has no priority queue, so Dijkstra needs one you wrote. The array form: children of i are 2i + 1 and 2i + 2.",
      functionName: "heapPush", signature: "heapPush(heap, item) → heap",
      starterSource: starter("heapPush", "heap, item", "Push, then while the parent's key is larger, swap upward."),
      solve: heapPush, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      scene: { kind: "algo", view: "heap", handles: preset("heap-push", ["small heap", "empty", "chain"], [{ id: "key", type: "slider", label: "key to push (rounded)", value: 0, min: 0, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "pushItem" }] },
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
      id: "heap-pop", track: "graphs", title: "Heap Pop", cses: { id: 1671, name: "Shortest Routes I (brick)" },
      goal: "Remove the minimum item: move the last item to the root and sift it down. Return { item, heap }.",
      concept: "Sift down picks the smaller child each step, so the root is always the minimum afterwards.",
      functionName: "heapPop", signature: "heapPop(heap) → { item, heap }",
      starterSource: starter("heapPop", "heap", "Empty heap → { item: null, heap }."),
      solve: heapPop, comparator: "deep", allowMutation: true,
      reference: book("4.5", "Other structures · priority queue"),
      scene: { kind: "algo", view: "heap", handles: preset("heap-pop", ["small heap", "two items", "chain"]), args: [{ fixture: "presetA" }] },
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
  ];
  core.share({ heapPush, heapPop });
  core.define("graphs", GRAPHS);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { fenwickAdd, fenwickPrefix } = core.shared;

  // ------------------------------------------------------------------ 9 · geometry · references
  function crossSign(ax, ay, bx, by) {
    const approx = ax * by - ay * bx;
    const bound = (Math.abs(ax * by) + Math.abs(ay * bx)) * 1e-12;
    if (approx > bound) return 1;
    if (approx < -bound) return -1;
    const exact = BigInt(ax) * BigInt(by) - BigInt(ay) * BigInt(bx);
    return exact > 0n ? 1 : (exact < 0n ? -1 : 0);
  }
  function pointLocationTest(tests) {
    const answers = [];
    for (let i = 0; i < tests.length; i += 1) {
      const t = tests[i];
      const side = crossSign(t[2] - t[0], t[3] - t[1], t[4] - t[0], t[5] - t[1]);
      answers.push(side > 0 ? "LEFT" : (side < 0 ? "RIGHT" : "TOUCH"));
    }
    return answers;
  }
  function lineSegmentIntersection(tests) {
    const between = (a, b, c) => Math.min(a, b) <= c && c <= Math.max(a, b);
    const answers = [];
    for (let i = 0; i < tests.length; i += 1) {
      const t = tests[i];
      const x1 = t[0], y1 = t[1], x2 = t[2], y2 = t[3], x3 = t[4], y3 = t[5], x4 = t[6], y4 = t[7];
      const d1 = crossSign(x2 - x1, y2 - y1, x3 - x1, y3 - y1);
      const d2 = crossSign(x2 - x1, y2 - y1, x4 - x1, y4 - y1);
      const d3 = crossSign(x4 - x3, y4 - y3, x1 - x3, y1 - y3);
      const d4 = crossSign(x4 - x3, y4 - y3, x2 - x3, y2 - y3);
      if (d1 * d2 < 0 && d3 * d4 < 0) { answers.push(true); continue; }
      if (d1 === 0 && between(x1, x2, x3) && between(y1, y2, y3)) { answers.push(true); continue; }
      if (d2 === 0 && between(x1, x2, x4) && between(y1, y2, y4)) { answers.push(true); continue; }
      if (d3 === 0 && between(x3, x4, x1) && between(y3, y4, y1)) { answers.push(true); continue; }
      if (d4 === 0 && between(x3, x4, x2) && between(y3, y4, y2)) { answers.push(true); continue; }
      answers.push(false);
    }
    return answers;
  }
  function polygonArea(points) {
    const n = points.length;
    let total = 0n;
    for (let i = 0; i < n; i += 1) {
      const p = points[i], q = points[(i + 1) % n];
      total += BigInt(p[0]) * BigInt(q[1]) - BigInt(q[0]) * BigInt(p[1]);
    }
    return (total < 0n ? -total : total).toString();
  }
  function pointInPolygon(polygon, queries) {
    const n = polygon.length;
    const answers = [];
    for (let q = 0; q < queries.length; q += 1) {
      const x = queries[q][0], y = queries[q][1];
      let inside = false, boundary = false;
      for (let i = 0, j = n - 1; i < n && !boundary; j = i, i += 1) {
        const x1 = polygon[j][0], y1 = polygon[j][1], x2 = polygon[i][0], y2 = polygon[i][1];
        const side = crossSign(x2 - x1, y2 - y1, x - x1, y - y1);
        if (side === 0 && Math.min(x1, x2) <= x && x <= Math.max(x1, x2) && Math.min(y1, y2) <= y && y <= Math.max(y1, y2)) { boundary = true; break; }
        if ((y1 > y) !== (y2 > y) && (side > 0) === (y2 > y1)) inside = !inside;
      }
      answers.push(boundary ? "BOUNDARY" : (inside ? "INSIDE" : "OUTSIDE"));
    }
    return answers;
  }
  function polygonLatticePoints(points) {
    const n = points.length;
    const gcd = (a, b) => { let x = a, y = b; while (y) { const t = x % y; x = y; y = t; } return x; };
    let twiceArea = 0n, boundary = 0;
    for (let i = 0; i < n; i += 1) {
      const p = points[i], q = points[(i + 1) % n];
      twiceArea += BigInt(p[0]) * BigInt(q[1]) - BigInt(q[0]) * BigInt(p[1]);
      boundary += gcd(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]));
    }
    if (twiceArea < 0n) twiceArea = -twiceArea;
    const interior = (twiceArea - BigInt(boundary) + 2n) / 2n;
    return [interior.toString(), String(boundary)];
  }
  function minimumEuclideanDistance(points) {
    const byX = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const n = byX.length;
    const buffer = new Array(n);
    let best = Infinity;
    const consider = (p, q) => {
      const dx = p[0] - q[0], dy = p[1] - q[1];
      const value = dx * dx + dy * dy;
      if (value < best) best = value;
    };
    const solve = (lo, hi) => {
      if (hi - lo <= 3) {
        for (let i = lo; i < hi; i += 1) for (let j = i + 1; j < hi; j += 1) consider(byX[i], byX[j]);
        for (let i = lo + 1; i < hi; i += 1) { const item = byX[i]; let j = i - 1; while (j >= lo && byX[j][1] > item[1]) { byX[j + 1] = byX[j]; j -= 1; } byX[j + 1] = item; }
        return;
      }
      const mid = (lo + hi) >> 1;
      const midX = byX[mid][0];
      solve(lo, mid);
      solve(mid, hi);
      let i = lo, j = mid, k = lo;
      while (i < mid || j < hi) {
        if (j >= hi || (i < mid && byX[i][1] <= byX[j][1])) { buffer[k] = byX[i]; i += 1; } else { buffer[k] = byX[j]; j += 1; }
        k += 1;
      }
      for (let t = lo; t < hi; t += 1) byX[t] = buffer[t];
      const strip = [];
      for (let t = lo; t < hi; t += 1) { const dx = byX[t][0] - midX; if (dx * dx < best) strip.push(byX[t]); }
      for (let a = 0; a < strip.length; a += 1) {
        for (let b = a + 1; b < strip.length && b <= a + 7; b += 1) {
          const dy = strip[b][1] - strip[a][1];
          if (dy * dy >= best) break;
          consider(strip[a], strip[b]);
        }
      }
    };
    solve(0, n);
    if (best <= 9007199254740992) return String(best);
    let exact = null;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = BigInt(byX[i][0] - byX[j][0]), dy = BigInt(byX[i][1] - byX[j][1]);
        const value = dx * dx + dy * dy;
        if (exact === null || value < exact) exact = value;
      }
    }
    return exact.toString();
  }
  function convexHull(points) {
    const sorted = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const build = (list) => {
      const stack = [];
      for (let i = 0; i < list.length; i += 1) {
        const p = list[i];
        while (stack.length >= 2) {
          const a = stack[stack.length - 2], b = stack[stack.length - 1];
          if (crossSign(b[0] - a[0], b[1] - a[1], p[0] - a[0], p[1] - a[1]) < 0) stack.pop();
          else break;
        }
        stack.push(p);
      }
      return stack;
    };
    const lower = build(sorted);
    const upper = build(sorted.slice().reverse());
    const seen = new Set();
    const hull = [];
    lower.concat(upper).forEach((p) => {
      const key = p[0] + "," + p[1];
      if (seen.has(key)) return;
      seen.add(key);
      hull.push([p[0], p[1]]);
    });
    return hull;
  }
  function maximumManhattanDistances(points) {
    const answers = [];
    let maxU = -Infinity, minU = Infinity, maxV = -Infinity, minV = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const u = points[i][0] + points[i][1], v = points[i][0] - points[i][1];
      if (u > maxU) maxU = u;
      if (u < minU) minU = u;
      if (v > maxV) maxV = v;
      if (v < minV) minV = v;
      answers.push(Math.max(maxU - minU, maxV - minV));
    }
    return answers;
  }
  function allManhattanDistances(points) {
    const axisTotal = (index) => {
      const values = points.map((p) => p[index]).sort((a, b) => a - b);
      let total = 0n, prefix = 0n;
      for (let i = 0; i < values.length; i += 1) {
        const value = BigInt(values[i]);
        total += value * BigInt(i) - prefix;
        prefix += value;
      }
      return total;
    };
    return (axisTotal(0) + axisTotal(1)).toString();
  }
  function intersectionPoints(segments) {
    const horizontal = [], vertical = [], ys = [];
    for (let i = 0; i < segments.length; i += 1) {
      const s = segments[i];
      if (s[1] === s[3]) { horizontal.push([Math.min(s[0], s[2]), Math.max(s[0], s[2]), s[1]]); ys.push(s[1]); }
      else vertical.push([s[0], Math.min(s[1], s[3]), Math.max(s[1], s[3])]);
    }
    ys.sort((a, b) => a - b);
    const unique = [];
    for (let i = 0; i < ys.length; i += 1) if (i === 0 || ys[i] !== ys[i - 1]) unique.push(ys[i]);
    const rankOf = (y) => {
      let lo = 0, hi = unique.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (unique[mid] < y) lo = mid + 1; else hi = mid; }
      return lo;
    };
    const starts = horizontal.slice().sort((a, b) => a[0] - b[0]);
    const ends = horizontal.slice().sort((a, b) => a[1] - b[1]);
    vertical.sort((a, b) => a[0] - b[0]);
    const tree = new Array(unique.length + 1).fill(0);
    let added = 0, removed = 0, total = 0;
    for (let i = 0; i < vertical.length; i += 1) {
      const x = vertical[i][0];
      while (added < starts.length && starts[added][0] <= x) { fenwickAdd(tree, rankOf(starts[added][2]) + 1, 1); added += 1; }
      while (removed < ends.length && ends[removed][1] < x) { fenwickAdd(tree, rankOf(ends[removed][2]) + 1, -1); removed += 1; }
      const lo = rankOf(vertical[i][1]);
      let hi = rankOf(vertical[i][2]);
      if (hi < unique.length && unique[hi] === vertical[i][2]) hi += 1;
      total += fenwickPrefix(tree, hi) - fenwickPrefix(tree, lo);
    }
    return total;
  }
  function liChaoInsert(tree, node, lo, hi, a, b) {
    let at = node, low = lo, high = hi, slope = a, intercept = b;
    while (true) {
      const current = tree[at];
      if (!current) { tree[at] = [slope, intercept]; return tree; }
      const mid = Math.floor((low + high) / 2);
      const leftBetter = slope * low + intercept > current[0] * low + current[1];
      const midBetter = slope * mid + intercept > current[0] * mid + current[1];
      if (midBetter) { tree[at] = [slope, intercept]; slope = current[0]; intercept = current[1]; }
      if (low === high) return tree;
      if (leftBetter !== midBetter) { high = mid; at = 2 * at; }
      else { low = mid + 1; at = 2 * at + 1; }
    }
  }
  function liChaoQuery(tree, size, x) {
    let at = 1, low = 0, high = size - 1, best = null;
    while (true) {
      const current = tree[at];
      if (current) { const value = current[0] * x + current[1]; if (best === null || value > best) best = value; }
      if (low === high) return best;
      const mid = Math.floor((low + high) / 2);
      if (x <= mid) { high = mid; at = 2 * at; }
      else { low = mid + 1; at = 2 * at + 1; }
    }
  }
  function liChaoInsertRange(tree, size, a, b, l, r) {
    const walk = (node, lo, hi) => {
      if (r < lo || hi < l) return;
      if (l <= lo && hi <= r) { liChaoInsert(tree, node, lo, hi, a, b); return; }
      const mid = Math.floor((lo + hi) / 2);
      walk(2 * node, lo, mid);
      walk(2 * node + 1, mid + 1, hi);
    };
    walk(1, 0, size - 1);
    return tree;
  }
  function lineSegmentsTraceI(m, ends) {
    const size = m + 1;
    const tree = new Array(4 * size).fill(null);
    for (let i = 0; i < ends.length; i += 1) {
      const slope = (ends[i][1] - ends[i][0]) / m;
      liChaoInsert(tree, 1, 0, size - 1, slope, ends[i][0]);
    }
    const answers = new Array(size);
    for (let x = 0; x <= m; x += 1) answers[x] = liChaoQuery(tree, size, x);
    return answers;
  }
  function lineSegmentsTraceII(m, segments) {
    const size = m + 1;
    const tree = new Array(4 * size).fill(null);
    for (let i = 0; i < segments.length; i += 1) {
      const s = segments[i];
      const slope = (s[3] - s[1]) / (s[2] - s[0]);
      liChaoInsertRange(tree, size, slope, s[1] - slope * s[0], s[0], s[2]);
    }
    const answers = new Array(size);
    for (let x = 0; x <= m; x += 1) { const best = liChaoQuery(tree, size, x); answers[x] = best === null ? -1 : best; }
    return answers;
  }
  function linesAndQueriesI(queries) {
    const size = 100001;
    const tree = new Array(4 * size).fill(null);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      if (queries[i][0] === 1) liChaoInsert(tree, 1, 0, size - 1, queries[i][1], queries[i][2]);
      else answers.push(liChaoQuery(tree, size, queries[i][1]));
    }
    return answers;
  }
  function linesAndQueriesII(queries) {
    const size = 100001;
    const tree = new Array(4 * size).fill(null);
    const answers = [];
    for (let i = 0; i < queries.length; i += 1) {
      if (queries[i][0] === 1) liChaoInsertRange(tree, size, queries[i][1], queries[i][2], queries[i][3], queries[i][4]);
      else answers.push(liChaoQuery(tree, size, queries[i][1]));
    }
    return answers;
  }
  function coverageAdd(tree, l, r, delta) {
    const leaves = tree.ys.length - 1;
    const walk = (node, lo, hi) => {
      if (r < lo || hi < l) return;
      if (l <= lo && hi <= r) tree.count[node] += delta;
      else {
        const mid = (lo + hi) >> 1;
        walk(2 * node, lo, mid);
        walk(2 * node + 1, mid + 1, hi);
      }
      if (tree.count[node] > 0) tree.covered[node] = tree.ys[hi + 1] - tree.ys[lo];
      else if (lo === hi) tree.covered[node] = 0;
      else tree.covered[node] = tree.covered[2 * node] + tree.covered[2 * node + 1];
    };
    if (l <= r && leaves > 0) walk(1, 0, leaves - 1);
    return tree;
  }
  function areaOfRectangles(rectangles) {
    const ys = [];
    for (let i = 0; i < rectangles.length; i += 1) ys.push(rectangles[i][1], rectangles[i][3]);
    ys.sort((a, b) => a - b);
    const unique = [];
    for (let i = 0; i < ys.length; i += 1) if (i === 0 || ys[i] !== ys[i - 1]) unique.push(ys[i]);
    const rankOf = new Map();
    for (let i = 0; i < unique.length; i += 1) rankOf.set(unique[i], i);
    const events = [];
    for (let i = 0; i < rectangles.length; i += 1) {
      const r = rectangles[i];
      events.push([r[0], 1, rankOf.get(r[1]), rankOf.get(r[3])]);
      events.push([r[2], -1, rankOf.get(r[1]), rankOf.get(r[3])]);
    }
    events.sort((a, b) => a[0] - b[0]);
    const tree = { ys: unique, count: new Array(4 * unique.length).fill(0), covered: new Array(4 * unique.length).fill(0) };
    let area = 0, previous = events.length ? events[0][0] : 0;
    for (let i = 0; i < events.length; i += 1) {
      area += tree.covered[1] * (events[i][0] - previous);
      previous = events[i][0];
      coverageAdd(tree, events[i][2], events[i][3] - 1, events[i][1]);
    }
    return area;
  }
  function robotPath(commands) {
    const stepOf = { U: [0, 1], D: [0, -1], L: [-1, 0], R: [1, 0] };
    const opposite = { U: "D", D: "U", L: "R", R: "L" };
    const moves = [];
    for (let i = 0; i < commands.length; i += 1) {
      const direction = commands[i][0], length = commands[i][1];
      if (moves.length && moves[moves.length - 1][0] === direction) moves[moves.length - 1][1] += length;
      else moves.push([direction, length]);
    }
    const n = moves.length;
    const xs = [0], ys = [0], prefix = [0];
    for (let i = 0; i < n; i += 1) {
      const d = stepOf[moves[i][0]];
      xs.push(xs[i] + d[0] * moves[i][1]);
      ys.push(ys[i] + d[1] * moves[i][1]);
      prefix.push(prefix[i] + moves[i][1]);
    }
    let backtrack = n + 1;
    for (let i = 1; i < n; i += 1) if (moves[i][0] === opposite[moves[i - 1][0]]) { backtrack = i + 1; break; }
    const limit = Math.min(n, backtrack - 1);

    const horizontal = [], vertical = [];
    for (let i = 0; i < n; i += 1) {
      if (ys[i] === ys[i + 1]) horizontal.push({ index: i, lo: Math.min(xs[i], xs[i + 1]), hi: Math.max(xs[i], xs[i + 1]), line: ys[i] });
      else vertical.push({ index: i, lo: Math.min(ys[i], ys[i + 1]), hi: Math.max(ys[i], ys[i + 1]), line: xs[i] });
    }
    const groupBy = (list) => {
      const groups = new Map();
      for (let i = 0; i < list.length; i += 1) {
        if (!groups.has(list[i].line)) groups.set(list[i].line, []);
        groups.get(list[i].line).push(list[i]);
      }
      groups.forEach((group) => group.sort((a, b) => a.lo - b.lo));
      return groups;
    };
    const horizontalGroups = groupBy(horizontal), verticalGroups = groupBy(vertical);
    const overlaps = (groups, k) => {
      let found = false;
      groups.forEach((group) => {
        if (found) return;
        let reach = -Infinity;
        for (let i = 0; i < group.length; i += 1) {
          if (group[i].index >= k) continue;
          if (group[i].lo <= reach) { found = true; return; }
          if (group[i].hi > reach) reach = group[i].hi;
        }
      });
      return found;
    };
    const levels = [];
    for (let i = 0; i < horizontal.length; i += 1) levels.push(horizontal[i].line);
    levels.sort((a, b) => a - b);
    const uniqueLevels = [];
    for (let i = 0; i < levels.length; i += 1) if (i === 0 || levels[i] !== levels[i - 1]) uniqueLevels.push(levels[i]);
    const rankOf = (y) => {
      let lo = 0, hi = uniqueLevels.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (uniqueLevels[mid] < y) lo = mid + 1; else hi = mid; }
      return lo;
    };
    const byStart = horizontal.slice().sort((a, b) => a.lo - b.lo);
    const byEnd = horizontal.slice().sort((a, b) => a.hi - b.hi);
    const byLine = vertical.slice().sort((a, b) => a.line - b.line);
    const tree = new Array(uniqueLevels.length + 1).fill(0);
    const crossesTwice = (k) => {
      for (let i = 0; i <= uniqueLevels.length; i += 1) tree[i] = 0;
      let added = 0, removed = 0, crossings = 0;
      for (let i = 0; i < byLine.length; i += 1) {
        if (byLine[i].index >= k) continue;
        const x = byLine[i].line;
        while (added < byStart.length && byStart[added].lo <= x) { if (byStart[added].index < k) fenwickAdd(tree, rankOf(byStart[added].line) + 1, 1); added += 1; }
        while (removed < byEnd.length && byEnd[removed].hi < x) { if (byEnd[removed].index < k) fenwickAdd(tree, rankOf(byEnd[removed].line) + 1, -1); removed += 1; }
        let hi = rankOf(byLine[i].hi);
        if (hi < uniqueLevels.length && uniqueLevels[hi] === byLine[i].hi) hi += 1;
        crossings += fenwickPrefix(tree, hi) - fenwickPrefix(tree, rankOf(byLine[i].lo));
        if (crossings > k - 1) return true;
      }
      return false;
    };
    const touches = (k) => overlaps(horizontalGroups, k) || overlaps(verticalGroups, k) || crossesTwice(k);

    let found = 0;
    let lo = 1, hi = limit;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (touches(mid)) { found = mid; hi = mid - 1; } else lo = mid + 1;
    }
    if (found === 0) return backtrack <= n ? prefix[backtrack - 1] : prefix[n];

    const i = found - 1;
    const ax = xs[i], ay = ys[i], bx = xs[i + 1], by = ys[i + 1];
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    const length = moves[i][1];
    const horizontalI = ay === by;
    let best = Infinity;
    for (let j = 0; j < i; j += 1) {
      const cx = xs[j], cy = ys[j], ex = xs[j + 1], ey = ys[j + 1];
      const horizontalJ = cy === ey;
      if (horizontalI === horizontalJ) {
        if (horizontalI ? cy !== ay : cx !== ax) continue;
        const travel = (px, py) => (dx !== 0 ? (px - ax) * dx : (py - ay) * dy);
        const t1 = travel(cx, cy), t2 = travel(ex, ey);
        const low = Math.max(0, Math.min(t1, t2)), high = Math.min(length, Math.max(t1, t2));
        if (high < low || high <= 0) continue;
        if (low < best) best = low;
      } else {
        const qx = horizontalI ? cx : ax;
        const qy = horizontalI ? ay : cy;
        if (Math.min(ax, bx) <= qx && qx <= Math.max(ax, bx) && Math.min(ay, by) <= qy && qy <= Math.max(ay, by)
          && Math.min(cx, ex) <= qx && qx <= Math.max(cx, ex) && Math.min(cy, ey) <= qy && qy <= Math.max(cy, ey)) {
          const t = dx !== 0 ? (qx - ax) * dx : (qy - ay) * dy;
          if (t > 0 && t < best) best = t;
        }
      }
    }
    return prefix[i] + best;
  }

  // ------------------------------------------------------------------ helpers, brute forces and validators for the stress tests
  function randomPoints(seed, count, span) {
    const next = rng(seed);
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard += 1;
      const x = Math.floor(next() * span) - Math.floor(span / 2);
      const y = Math.floor(next() * span) - Math.floor(span / 2);
      const key = x + "," + y;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([x, y]);
    }
    return out;
  }
  function randomPolygon(seed, n, radius) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const angle = 2 * Math.PI * (i + 0.4 * next()) / n;
      const r = radius * (0.6 + 0.4 * next());
      out.push([Math.round(Math.cos(angle) * r), Math.round(Math.sin(angle) * r)]);
    }
    return out;
  }
  function randomTests(seed, count, span, width) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const row = [];
      for (let k = 0; k < width; k += 1) row.push(Math.floor(next() * span) - Math.floor(span / 2));
      if (row[0] === row[2] && row[1] === row[3]) row[2] += 1;
      if (width === 8 && row[4] === row[6] && row[5] === row[7]) row[6] += 1;
      out.push(row);
    }
    return out;
  }
  function randomAxisSegments(seed, count, span, maxLength) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(next() * span) - Math.floor(span / 2);
      const y = Math.floor(next() * span) - Math.floor(span / 2);
      const length = 1 + Math.floor(next() * maxLength);
      if (next() < 0.5) out.push([x, y, x + length, y]);
      else out.push([x, y, x, y + length]);
    }
    return out;
  }
  function randomRectangles(seed, count, span, maxSide) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(next() * span) - Math.floor(span / 2);
      const y = Math.floor(next() * span) - Math.floor(span / 2);
      out.push([x, y, x + 1 + Math.floor(next() * maxSide), y + 1 + Math.floor(next() * maxSide)]);
    }
    return out;
  }
  function randomCommands(seed, count, maxLength) {
    const next = rng(seed);
    const letters = "UDLR";
    const out = [];
    for (let i = 0; i < count; i += 1) out.push([letters[Math.floor(next() * 4)], 1 + Math.floor(next() * maxLength)]);
    return out;
  }
  function spiralCommands(count) {
    const order = ["R", "U", "L", "D"];
    const out = [];
    for (let i = 0; i < count; i += 1) out.push([order[i % 4], 2 + i]);
    return out;
  }
  function randomLineQueries(seed, count, top, ranged) {
    const next = rng(seed);
    const out = [ranged ? [1, 1, 2, 0, top] : [1, 1, 2]];
    for (let i = 1; i < count; i += 1) {
      if (next() < 0.5) {
        const a = Math.floor(next() * 2000000000) - 1000000000, b = Math.floor(next() * 2000000000) - 1000000000;
        if (!ranged) out.push([1, a, b]);
        else { const l = Math.floor(next() * (top + 1)); out.push([1, a, b, l, l + Math.floor(next() * (top + 1 - l))]); }
      } else out.push([2, Math.floor(next() * (top + 1))]);
    }
    return out;
  }
  function randomTraceEnds(seed, count, m, span) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const y1 = Math.floor(next() * span);
      const slope = Math.floor(next() * 21) - 10;
      out.push([y1, y1 + slope * m]);
    }
    return out;
  }
  function randomTraceSegments(seed, count, m, span) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const x1 = Math.floor(next() * m);
      const x2 = x1 + 1 + Math.floor(next() * (m - x1));
      const y1 = Math.floor(next() * span);
      const slope = Math.floor(next() * 21) - 10;
      out.push([x1, y1, x2, y1 + slope * (x2 - x1)]);
    }
    return out;
  }
  function emptyLiChao(size) { return new Array(4 * size).fill(null); }
  function filledLiChao(size, list) {
    const tree = emptyLiChao(size);
    for (let i = 0; i < list.length; i += 1) liChaoInsert(tree, 1, 0, size - 1, list[i][0], list[i][1]);
    return tree;
  }
  function emptyCoverage(ys) { return { ys: ys.slice(), count: new Array(4 * ys.length).fill(0), covered: new Array(4 * ys.length).fill(0) }; }
  function coverageState(ys, updates) {
    const tree = emptyCoverage(ys);
    for (let i = 0; i < updates.length; i += 1) coverageAdd(tree, updates[i][0], updates[i][1], updates[i][2]);
    return tree;
  }

  function crossSignBrute(ax, ay, bx, by) {
    const exact = BigInt(ax) * BigInt(by) - BigInt(ay) * BigInt(bx);
    return exact > 0n ? 1 : (exact < 0n ? -1 : 0);
  }
  function pointLocationBrute(tests) {
    return tests.map((t) => {
      const side = crossSignBrute(t[2] - t[0], t[3] - t[1], t[4] - t[0], t[5] - t[1]);
      return side > 0 ? "LEFT" : (side < 0 ? "RIGHT" : "TOUCH");
    });
  }
  function segmentIntersectionBrute(tests) {
    // Solves A + t(B - A) = C + s(D - C) exactly with fractions, instead of comparing orientations.
    return tests.map((t) => {
      const ax = BigInt(t[0]), ay = BigInt(t[1]), bx = BigInt(t[2]), by = BigInt(t[3]);
      const cx = BigInt(t[4]), cy = BigInt(t[5]), dx = BigInt(t[6]), dy = BigInt(t[7]);
      const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy;
      const determinant = ux * vy - uy * vx;
      if (determinant !== 0n) {
        const tNumerator = (cx - ax) * vy - (cy - ay) * vx;
        const sNumerator = (cx - ax) * uy - (cy - ay) * ux;
        const inRange = (numerator, denominator) => (denominator > 0n ? numerator >= 0n && numerator <= denominator : numerator <= 0n && numerator >= denominator);
        return inRange(tNumerator, determinant) && inRange(sNumerator, determinant);
      }
      if ((cx - ax) * uy - (cy - ay) * ux !== 0n) return false;
      const along = (px, py) => (ux !== 0n ? (px - ax) * ux : (py - ay) * uy);
      const span = ux !== 0n ? ux * ux : uy * uy;
      const first = along(cx, cy), second = along(dx, dy);
      const low = first < second ? first : second, high = first < second ? second : first;
      return low <= span && high >= 0n;
    });
  }
  function latticeCountBrute(points) {
    // Counts lattice points directly; only used on tiny polygons.
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const queries = [];
    for (let x = Math.min.apply(null, xs); x <= Math.max.apply(null, xs); x += 1) {
      for (let y = Math.min.apply(null, ys); y <= Math.max.apply(null, ys); y += 1) queries.push([x, y]);
    }
    const marks = pointInPolygonBrute(points, queries);
    let interior = 0, boundary = 0;
    marks.forEach((mark) => { if (mark === "INSIDE") interior += 1; else if (mark === "BOUNDARY") boundary += 1; });
    return [interior, boundary];
  }
  function polygonAreaBrute(points) {
    const counts = latticeCountBrute(points);
    return String(2 * counts[0] + counts[1] - 2);
  }
  function polygonLatticePointsBrute(points) {
    const counts = latticeCountBrute(points);
    return [String(counts[0]), String(counts[1])];
  }
  function pointInPolygonBrute(polygon, queries) {
    // Winding number by quadrant crossings, instead of the even-odd ray rule.
    const n = polygon.length;
    return queries.map((query) => {
      const x = query[0], y = query[1];
      let winding = 0;
      for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
        const x1 = polygon[j][0], y1 = polygon[j][1], x2 = polygon[i][0], y2 = polygon[i][1];
        const side = crossSignBrute(x2 - x1, y2 - y1, x - x1, y - y1);
        if (side === 0 && Math.min(x1, x2) <= x && x <= Math.max(x1, x2) && Math.min(y1, y2) <= y && y <= Math.max(y1, y2)) return "BOUNDARY";
        if (y1 <= y) { if (y2 > y && side > 0) winding += 1; }
        else if (y2 <= y && side < 0) winding -= 1;
      }
      return winding !== 0 ? "INSIDE" : "OUTSIDE";
    });
  }
  function minimumEuclideanDistanceBrute(points) {
    let best = null;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = BigInt(points[i][0] - points[j][0]), dy = BigInt(points[i][1] - points[j][1]);
        const value = dx * dx + dy * dy;
        if (best === null || value < best) best = value;
      }
    }
    return best.toString();
  }
  function convexHullBrute(points) {
    // Every pair that leaves all other points on one side spans a hull edge.
    const onHull = new Set();
    for (let i = 0; i < points.length; i += 1) {
      for (let j = 0; j < points.length; j += 1) {
        if (i === j) continue;
        let left = 0, right = 0;
        for (let k = 0; k < points.length; k += 1) {
          const side = crossSignBrute(points[j][0] - points[i][0], points[j][1] - points[i][1], points[k][0] - points[i][0], points[k][1] - points[i][1]);
          if (side > 0) left += 1;
          if (side < 0) right += 1;
        }
        if (left > 0 && right > 0) continue;
        for (let k = 0; k < points.length; k += 1) {
          const side = crossSignBrute(points[j][0] - points[i][0], points[j][1] - points[i][1], points[k][0] - points[i][0], points[k][1] - points[i][1]);
          if (side !== 0) continue;
          if (Math.min(points[i][0], points[j][0]) <= points[k][0] && points[k][0] <= Math.max(points[i][0], points[j][0])
            && Math.min(points[i][1], points[j][1]) <= points[k][1] && points[k][1] <= Math.max(points[i][1], points[j][1])) onHull.add(points[k][0] + "," + points[k][1]);
        }
      }
    }
    return Array.from(onHull).sort();
  }
  function convexHullAccept(args, actual, expected) {
    const points = args[0];
    if (!Array.isArray(actual)) return "Return the hull points as an array of [x, y] pairs.";
    const allowed = new Set(points.map((p) => p[0] + "," + p[1]));
    const seen = new Set();
    for (let i = 0; i < actual.length; i += 1) {
      const p = actual[i];
      if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return "Every entry must be a pair [x, y].";
      const key = p[0] + "," + p[1];
      if (!allowed.has(key)) return "(" + p[0] + ", " + p[1] + ") is not one of the given points.";
      if (seen.has(key)) return "(" + p[0] + ", " + p[1] + ") is listed twice.";
      seen.add(key);
    }
    const wanted = new Set((expected || []).map((p) => p[0] + "," + p[1]));
    let missing = null, extra = null;
    wanted.forEach((key) => { if (!seen.has(key)) missing = key; });
    seen.forEach((key) => { if (!wanted.has(key)) extra = key; });
    if (missing) return "(" + missing + ") lies on the hull but is missing; every point on the hull counts, including the ones inside an edge.";
    if (extra) return "(" + extra + ") is strictly inside the hull.";
    return true;
  }
  function convexHullCheck(args, out) {
    if (!Array.isArray(out)) return false;
    const wanted = convexHullBrute(args[0]);
    const got = out.map((p) => p[0] + "," + p[1]).sort();
    return got.length === wanted.length && got.every((key, i) => key === wanted[i]);
  }
  function maximumManhattanBrute(points) {
    const answers = [];
    let best = 0;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = 0; j < i; j += 1) best = Math.max(best, Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]));
      answers.push(best);
    }
    return answers;
  }
  function allManhattanBrute(points) {
    let total = 0n;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) total += BigInt(Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]));
    }
    return total.toString();
  }
  function intersectionPointsBrute(segments) {
    let total = 0;
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const a = segments[i], b = segments[j];
        const aHorizontal = a[1] === a[3], bHorizontal = b[1] === b[3];
        if (aHorizontal === bHorizontal) continue;
        const h = aHorizontal ? a : b, v = aHorizontal ? b : a;
        if (Math.min(h[0], h[2]) <= v[0] && v[0] <= Math.max(h[0], h[2]) && Math.min(v[1], v[3]) <= h[1] && h[1] <= Math.max(v[1], v[3])) total += 1;
      }
    }
    return total;
  }
  function liChaoLines(tree) {
    const out = [];
    for (let i = 0; i < tree.length; i += 1) if (tree[i]) out.push(tree[i]);
    return out;
  }
  function liChaoInsertAccept(args, actual) {
    const before = args[0], node = args[1], lo = args[2], hi = args[3], a = args[4], b = args[5];
    if (!Array.isArray(actual)) return "Return the tree array.";
    if (actual.length !== before.length) return "The tree keeps its length; lines are stored in the existing slots.";
    const wanted = liChaoLines(before).concat([[a, b]]);
    const key = (line) => line[0] + "x+" + line[1];
    const allowed = new Set(wanted.map(key));
    const got = liChaoLines(actual);
    for (let i = 0; i < got.length; i += 1) if (!allowed.has(key(got[i]))) return "The tree holds a line that was never inserted: " + key(got[i]) + ".";
    for (let x = lo; x <= hi; x += 1) {
      let best = null;
      for (let i = 0; i < wanted.length; i += 1) { const value = wanted[i][0] * x + wanted[i][1]; if (best === null || value > best) best = value; }
      if (liChaoQuery(actual, hi + 1, x) !== best) return "At x = " + x + " a root-to-leaf walk of your tree misses the maximum " + best + ".";
    }
    return true;
  }
  function liChaoRangeAccept(args, actual) {
    const before = args[0], size = args[1], a = args[2], b = args[3], l = args[4], r = args[5];
    if (!Array.isArray(actual) || actual.length !== before.length) return "Return the tree array, keeping its length.";
    const previous = [];
    for (let x = 0; x < size; x += 1) previous.push(liChaoQuery(before, size, x));
    for (let x = 0; x < size; x += 1) {
      let best = previous[x];
      if (l <= x && x <= r) { const value = a * x + b; if (best === null || value > best) best = value; }
      if (liChaoQuery(actual, size, x) !== best) return "At x = " + x + " the maximum should be " + best + " but your tree answers " + liChaoQuery(actual, size, x) + ".";
    }
    return true;
  }
  function liChaoQueryBrute(tree, size, x) {
    let best = null;
    const list = liChaoLines(tree);
    for (let i = 0; i < list.length; i += 1) { const value = list[i][0] * x + list[i][1]; if (best === null || value > best) best = value; }
    return best;
  }
  function traceIBrute(m, ends) {
    const out = [];
    for (let x = 0; x <= m; x += 1) {
      let best = -Infinity;
      for (let i = 0; i < ends.length; i += 1) best = Math.max(best, ends[i][0] + (ends[i][1] - ends[i][0]) / m * x);
      out.push(best);
    }
    return out;
  }
  function traceIIBrute(m, segments) {
    const out = [];
    for (let x = 0; x <= m; x += 1) {
      let best = null;
      for (let i = 0; i < segments.length; i += 1) {
        const s = segments[i];
        if (x < s[0] || x > s[2]) continue;
        const value = s[1] + (s[3] - s[1]) / (s[2] - s[0]) * (x - s[0]);
        if (best === null || value > best) best = value;
      }
      out.push(best === null ? -1 : best);
    }
    return out;
  }
  function linesIBrute(queries) {
    const list = [], out = [];
    queries.forEach((query) => {
      if (query[0] === 1) list.push([query[1], query[2]]);
      else {
        let best = null;
        list.forEach((line) => { const value = line[0] * query[1] + line[1]; if (best === null || value > best) best = value; });
        out.push(best);
      }
    });
    return out;
  }
  function linesIIBrute(queries) {
    const list = [], out = [];
    queries.forEach((query) => {
      if (query[0] === 1) list.push(query.slice(1));
      else {
        let best = null;
        list.forEach((line) => {
          if (query[1] < line[2] || query[1] > line[3]) return;
          const value = line[0] * query[1] + line[1];
          if (best === null || value > best) best = value;
        });
        out.push(best);
      }
    });
    return out;
  }
  function areaOfRectanglesBrute(rectangles) {
    const xs = [], ys = [];
    rectangles.forEach((r) => { xs.push(r[0], r[2]); ys.push(r[1], r[3]); });
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    let area = 0;
    for (let i = 0; i + 1 < xs.length; i += 1) {
      if (xs[i] === xs[i + 1]) continue;
      for (let j = 0; j + 1 < ys.length; j += 1) {
        if (ys[j] === ys[j + 1]) continue;
        const covered = rectangles.some((r) => r[0] <= xs[i] && xs[i + 1] <= r[2] && r[1] <= ys[j] && ys[j + 1] <= r[3]);
        if (covered) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      }
    }
    return area;
  }
  function robotPathBrute(commands) {
    // Walks one unit at a time: stepping onto a visited corner stops the robot, and
    // retracing a unit of path stops it with nothing left to travel.
    const stepOf = { U: [0, 1], D: [0, -1], L: [-1, 0], R: [1, 0] };
    const corners = new Set(["0,0"]);
    const edges = new Set();
    let x = 0, y = 0, distance = 0;
    for (let i = 0; i < commands.length; i += 1) {
      const d = stepOf[commands[i][0]];
      for (let step = 0; step < commands[i][1]; step += 1) {
        const nx = x + d[0], ny = y + d[1];
        const edge = Math.min(x, nx) + "," + Math.min(y, ny) + "," + Math.max(x, nx) + "," + Math.max(y, ny);
        if (edges.has(edge)) return distance;
        edges.add(edge);
        x = nx;
        y = ny;
        distance += 1;
        if (corners.has(x + "," + y)) return distance;
        corners.add(x + "," + y);
      }
    }
    return distance;
  }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const POINTS_BIG = lazy(() => randomPoints(901, 200000, 2000000000));
  const POINTS_MID = lazy(() => randomPoints(902, 100000, 2000000000));
  const POLYGON_BIG = lazy(() => randomPolygon(903, 100000, 1000000000));
  const POLYGON_SMALL = lazy(() => randomPolygon(904, 1000, 1000000000));
  const POLYGON_QUERIES = lazy(() => randomPoints(905, 1000, 1400000000));
  const TESTS_SIX = lazy(() => randomTests(906, 50000, 2000000000, 6));
  const TESTS_EIGHT = lazy(() => randomTests(907, 50000, 2000000000, 8));
  const AXIS_SEGMENTS = lazy(() => randomAxisSegments(908, 50000, 2000000, 4000));
  const TRACE_ENDS = lazy(() => randomTraceEnds(909, 50000, 50000, 1000000000));
  const TRACE_SEGMENTS = lazy(() => randomTraceSegments(910, 25000, 25000, 1000000));
  const LINE_QUERIES = lazy(() => randomLineQueries(911, 100000, 100000, false));
  const RANGE_QUERIES = lazy(() => randomLineQueries(912, 50000, 100000, true));
  const RECTANGLES_BIG = lazy(() => randomRectangles(913, 25000, 1900000, 50000));
  const SPIRAL_BIG = lazy(() => spiralCommands(20000));
  const SPIRAL_CROSSING = lazy(() => spiralCommands(20000).concat([["R", 1000000]]));

  const SAMPLE_POLYGON = [[1, 1], [4, 2], [3, 5], [1, 4]];
  const LATTICE_POLYGON = [[1, 1], [5, 3], [3, 5], [1, 4]];
  const SAMPLE_HULL_POINTS = [[2, 1], [2, 5], [3, 3], [4, 3], [4, 4], [6, 3]];
  const SAMPLE_MANHATTAN = [[1, 1], [3, 2], [2, 4], [2, 1], [4, 5]];
  const SAMPLE_LOCATION = [[1, 1, 5, 3, 2, 3], [1, 1, 5, 3, 4, 1], [1, 1, 5, 3, 3, 2]];
  const SAMPLE_CROSSING = [[1, 1, 5, 3, 1, 2, 4, 3], [1, 1, 5, 3, 1, 1, 4, 3], [1, 1, 5, 3, 2, 3, 4, 1], [1, 1, 5, 3, 2, 4, 4, 1], [1, 1, 5, 3, 3, 2, 7, 4]];
  const SAMPLE_AXIS = [[2, 3, 7, 3], [3, 1, 3, 5], [6, 2, 6, 6]];
  const NEAR_TIE = [1999999999, 1999999998, 1999999997, 1999999996];

  const GEOMETRY = [
    {
      id: "cross-sign", title: "Cross Product Sign", cses: { id: 2189, name: "Point Location Test (brick)" },
      goal: "The sign of the cross product ax·by − ay·bx, exactly: 1, −1 or 0. The four numbers are integers up to 2·10⁹ in absolute value.",
      concept: "Every question in this section is really this one: which way does a turn go. The products reach 4·10¹⁸, past 2⁵³ where doubles stop counting by ones, so the plain subtraction can return the wrong sign. The rounding error of each product is a known fraction of its size, so when the float result is far larger than that bound its sign is certain; only when it is close to zero is BigInt needed.",
      functionName: "crossSign", signature: "crossSign(ax, ay, bx, by) → 1, -1 or 0",
      starterSource: starter("crossSign", "ax, ay, bx, by", "Take the float difference; trust its sign when it beats the error bound, otherwise redo the two products with BigInt."),
      solve: crossSign, comparator: "scalar", brute: crossSignBrute, small: (round) => { const t = randomTests(200 + round, 1, round % 3 === 0 ? 4000000000 : 12, 4)[0]; return [t[0], t[1], t[2], t[3]]; },
      reference: book("29.1", "Geometry · complex numbers and cross products"),
      presets: {
        "a left turn": { a: 4, b: 2, c: 1, d: 2, segments: [[0, 0, 4, 2], [0, 0, 1, 2]], marks: [[4, 2], [1, 2]] },
        "a right turn": { a: 4, b: 2, c: 3, d: 0, segments: [[0, 0, 4, 2], [0, 0, 3, 0]], marks: [[4, 2], [3, 0]] },
        "the near tie": { a: NEAR_TIE[0], b: NEAR_TIE[1], c: NEAR_TIE[2], d: NEAR_TIE[3], segments: [[0, 0, NEAR_TIE[0], NEAR_TIE[1]], [0, 0, NEAR_TIE[2], NEAR_TIE[3]]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }] },
      diagnoses: [
        diagnosis("floats-only", "Past 2⁵³ doubles count in steps of 512, so a small cross product drowns in the rounding of two huge ones.", function crossSign(ax, ay, bx, by) { const value = ax * by - ay * bx; return value > 0 ? 1 : (value < 0 ? -1 : 0); }),
        diagnosis("swapped-terms", "The cross product is ax·by − ay·bx; swapping the two products flips every answer.", function crossSign(ax, ay, bx, by) { const exact = BigInt(ay) * BigInt(bx) - BigInt(ax) * BigInt(by); return exact > 0n ? 1 : (exact < 0n ? -1 : 0); }),
      ],
      hints: ["approx = ax * by - ay * bx; bound = (|ax * by| + |ay * bx|) * 1e-12.", "If approx > bound return 1; if approx < -bound return -1.", "Otherwise recompute with BigInt(ax) * BigInt(by) - BigInt(ay) * BigInt(bx) and read its sign."],
      cases: [
        example([4, 2, 1, 2], 1, "a left turn"),
        example([4, 2, 3, 0], -1, "a right turn"),
        example([4, 2, 2, 1], 0, "the same direction"),
        example([0, 0, 5, 5], 0, "a zero vector"),
        example(NEAR_TIE, -1, "a near tie past 2⁵³: the exact value is −2"),
        example([2000000000, 1999999999, 1999999999, 2000000000], 1, "large but not close"),
      ],
    },
    {
      id: "point-location-test", title: "Point Location Test", cses: { id: 2189, name: "Point Location Test" },
      goal: "For each test [x₁, y₁, x₂, y₂, x₃, y₃], whether p₃ is LEFT of, RIGHT of, or TOUCHing the line through p₁ and p₂, looking from p₁ towards p₂.",
      concept: "Move p₁ to the origin. The sign of the cross product of p₂ − p₁ with p₃ − p₁ is positive when the turn from the first vector to the second goes anticlockwise, which is exactly the left side.",
      functionName: "pointLocationTest", signature: "pointLocationTest(tests) → array of strings",
      starterSource: starter("pointLocationTest", "tests", "Per test: crossSign(x2 - x1, y2 - y1, x3 - x1, y3 - y1) → LEFT / RIGHT / TOUCH."),
      solve: pointLocationTest, comparator: "deep", dependencies: ["cross-sign"], brute: pointLocationBrute, small: (round) => [randomTests(1000 + round, 1 + (round % 5), round % 3 === 0 ? 4000000000 : 14, 6)],
      reference: book("29.2", "Points and lines"),
      presets: {
        "CSES sample": { a: SAMPLE_LOCATION, segments: [[1, 1, 5, 3]], marks: [[2, 3], [4, 1], [3, 2]] },
        "a vertical line": { a: [[0, 0, 0, 4, -2, 2], [0, 0, 0, 4, 3, 1]], segments: [[0, 0, 0, 4]], marks: [[-2, 2], [3, 1]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("left-and-right-swapped", "Looking from p₁ towards p₂, a positive cross product is the left side.", function pointLocationTest(tests) { const answers = []; for (let i = 0; i < tests.length; i += 1) { const t = tests[i]; const side = crossSign(t[2] - t[0], t[3] - t[1], t[4] - t[0], t[5] - t[1]); answers.push(side > 0 ? "RIGHT" : (side < 0 ? "LEFT" : "TOUCH")); } return answers; }),
        diagnosis("wrong-origin", "Both vectors must start at p₁; measuring p₃ from the origin instead answers a different question.", function pointLocationTest(tests) { const answers = []; for (let i = 0; i < tests.length; i += 1) { const t = tests[i]; const side = crossSign(t[2] - t[0], t[3] - t[1], t[4], t[5]); answers.push(side > 0 ? "LEFT" : (side < 0 ? "RIGHT" : "TOUCH")); } return answers; }),
      ],
      hints: ["The two vectors are p₂ − p₁ and p₃ − p₁.", "side = crossSign(x2 - x1, y2 - y1, x3 - x1, y3 - y1).", "Positive is LEFT, negative is RIGHT, zero is TOUCH."],
      cases: [
        example([SAMPLE_LOCATION], ["LEFT", "RIGHT", "TOUCH"], "CSES sample"),
        example([[[0, 0, 4, 0, 2, 1]]], ["LEFT"], "above a rightward line"),
        example([[[0, 0, 4, 0, 2, -1]]], ["RIGHT"], "below it"),
        example([[[0, 0, 0, 4, -2, 2], [0, 0, 0, 4, 3, 1]]], ["LEFT", "RIGHT"], "a vertical line points up"),
        example([[[-1000000000, -1000000000, 1000000000, 1000000000, 1000000000, -1000000000]]], ["RIGHT"], "the far corners"),
        hidden("t = 50 000 with coordinates to 10⁹, time limit", () => [TESTS_SIX()]),
      ],
    },
    {
      id: "line-segment-intersection", title: "Line Segment Intersection", cses: { id: 2190, name: "Line Segment Intersection" },
      goal: "For each test [x₁, y₁, x₂, y₂, x₃, y₃, x₄, y₄], whether segment p₁p₂ touches segment p₃p₄; return booleans.",
      concept: "Two segments cross properly when each one separates the endpoints of the other, that is when both pairs of turn signs disagree. Everything else is a touch: some endpoint has cross product zero and lies inside the other segment's box. That single extra test also covers two segments lying along the same line.",
      functionName: "lineSegmentIntersection", signature: "lineSegmentIntersection(tests) → booleans",
      starterSource: starter("lineSegmentIntersection", "tests", "Four turn signs. Opposite pairs mean a proper crossing; a zero sign with the point inside the other box means a touch."),
      solve: lineSegmentIntersection, comparator: "deep", dependencies: ["cross-sign"], brute: segmentIntersectionBrute, small: (round) => [randomTests(2000 + round, 1 + (round % 4), round % 4 === 0 ? 4000000000 : 9, 8)],
      reference: book("29.2", "Points and lines · segment intersection"),
      presets: {
        "CSES sample": { a: SAMPLE_CROSSING, segments: [[1, 1, 5, 3], [2, 3, 4, 1]] },
        "along one line": { a: [[0, 0, 4, 0, 2, 0, 6, 0], [0, 0, 2, 0, 3, 0, 6, 0]], segments: [[0, 0, 4, 0], [2, 0, 6, 0]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("proper-only", "Touching at an endpoint counts; a zero turn sign with the point inside the other segment is an intersection too.", function lineSegmentIntersection(tests) { const answers = []; for (let i = 0; i < tests.length; i += 1) { const t = tests[i]; const d1 = crossSign(t[2] - t[0], t[3] - t[1], t[4] - t[0], t[5] - t[1]); const d2 = crossSign(t[2] - t[0], t[3] - t[1], t[6] - t[0], t[7] - t[1]); const d3 = crossSign(t[6] - t[4], t[7] - t[5], t[0] - t[4], t[1] - t[5]); const d4 = crossSign(t[6] - t[4], t[7] - t[5], t[2] - t[4], t[3] - t[5]); answers.push(d1 * d2 < 0 && d3 * d4 < 0); } return answers; }),
        diagnosis("lines-not-segments", "Zero turn signs put the point on the infinite line; it still has to lie between the endpoints.", function lineSegmentIntersection(tests) { const answers = []; for (let i = 0; i < tests.length; i += 1) { const t = tests[i]; const d1 = crossSign(t[2] - t[0], t[3] - t[1], t[4] - t[0], t[5] - t[1]); const d2 = crossSign(t[2] - t[0], t[3] - t[1], t[6] - t[0], t[7] - t[1]); const d3 = crossSign(t[6] - t[4], t[7] - t[5], t[0] - t[4], t[1] - t[5]); const d4 = crossSign(t[6] - t[4], t[7] - t[5], t[2] - t[4], t[3] - t[5]); answers.push((d1 * d2 < 0 && d3 * d4 < 0) || d1 === 0 || d2 === 0 || d3 === 0 || d4 === 0); } return answers; }),
      ],
      hints: ["d1, d2 = the turn signs of p₃ and p₄ about the directed segment p₁→p₂; d3, d4 = the signs of p₁ and p₂ about p₃→p₄.", "A proper crossing is d1 · d2 < 0 and d3 · d4 < 0.", "Otherwise, for each zero sign check that the point lies within the other segment's x-range and y-range."],
      cases: [
        example([SAMPLE_CROSSING], [false, true, true, true, true], "CSES sample"),
        example([[[0, 0, 4, 0, 2, 0, 6, 0]]], [true], "overlapping along one line"),
        example([[[0, 0, 2, 0, 3, 0, 6, 0]]], [false], "apart along one line"),
        example([[[0, 0, 4, 4, 0, 4, 4, 0]]], [true], "a proper crossing"),
        example([[[0, 0, 1, 1, 2, 2, 3, 3]]], [false], "same line, no overlap"),
        example([[[-1000000000, -1000000000, 1000000000, 1000000000, -1000000000, 1000000000, 1000000000, -1000000000]]], [true], "the far diagonals"),
        hidden("t = 50 000 with coordinates to 10⁹, time limit", () => [TESTS_EIGHT()]),
      ],
    },
    {
      id: "polygon-area", title: "Polygon Area", cses: { id: 2191, name: "Polygon Area" },
      goal: "Twice the area of the simple polygon, as a decimal string. Doubling keeps the answer a whole number.",
      concept: "The shoelace formula: each edge contributes the cross product of its two endpoints, which is twice the signed area of the triangle it makes with the origin. Areas outside the polygon are added and subtracted away. One term can reach 2·10¹⁸ and a thousand of them 2·10²¹, so the sum is built with BigInt.",
      functionName: "polygonArea", signature: "polygonArea(points) → decimal string",
      starterSource: starter("polygonArea", "points", "Sum BigInt(x_i) * BigInt(y_next) - BigInt(x_next) * BigInt(y_i) around the polygon; return the absolute value as a string."),
      solve: polygonArea, comparator: "scalar", brute: polygonAreaBrute, small: (round) => [randomPolygon(3000 + round, 3 + (round % 6), 7 + (round % 4))],
      reference: book("29.3", "Polygon area"),
      presets: {
        "CSES sample": { a: SAMPLE_POLYGON, polygon: SAMPLE_POLYGON },
        "a unit square": { a: [[0, 0], [1, 0], [1, 1], [0, 1]], polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] },
        "a triangle": { a: [[0, 0], [4, 0], [0, 3]], polygon: [[0, 0], [4, 0], [0, 3]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("float-sum", "Doubles stop counting by ones at 2⁵³, and one shoelace term alone can reach 2·10¹⁸.", function polygonArea(points) { const n = points.length; let total = 0; for (let i = 0; i < n; i += 1) { const p = points[i], q = points[(i + 1) % n]; total += p[0] * q[1] - q[0] * p[1]; } return String(Math.abs(total)); }),
        diagnosis("signed-area", "A clockwise polygon gives a negative sum; the area is its absolute value.", function polygonArea(points) { const n = points.length; let total = 0n; for (let i = 0; i < n; i += 1) { const p = points[i], q = points[(i + 1) % n]; total += BigInt(p[0]) * BigInt(q[1]) - BigInt(q[0]) * BigInt(p[1]); } return total.toString(); }),
      ],
      hints: ["Walk i from 0 to n − 1 and pair each point with points[(i + 1) % n].", "Add BigInt(x_i) * BigInt(y_next) - BigInt(x_next) * BigInt(y_i).", "Take the absolute value at the end and return total.toString()."],
      cases: [
        example([SAMPLE_POLYGON], "16", "CSES sample"),
        example([[[0, 0], [1, 0], [1, 1], [0, 1]]], "2", "a unit square"),
        example([[[0, 0], [4, 0], [0, 3]]], "12", "a triangle"),
        example([[[0, 0], [0, 3], [4, 0]]], "12", "the same triangle clockwise"),
        example([[[-1000000000, -1000000000], [1000000000, -1000000000], [1000000000, 1000000000], [-1000000000, 1000000000]]], "8000000000000000000", "the whole coordinate square"),
        hidden("n = 1 000 with coordinates to 10⁹, time limit", () => [POLYGON_SMALL()]),
      ],
    },
    {
      id: "point-in-polygon", title: "Point in Polygon", cses: { id: 2192, name: "Point in Polygon" },
      goal: "For each query point, whether it is INSIDE, OUTSIDE, or on the BOUNDARY of the simple polygon.",
      concept: "Send a ray to the right from the point and count the edges it crosses: an odd count means inside, because every crossing swaps sides. Comparing the endpoints' heights with a half-open rule counts a vertex once rather than twice, and the crossing is decided by a cross product so nothing is divided. Boundary is checked first: a zero cross product with the point inside the edge's box.",
      functionName: "pointInPolygon", signature: "pointInPolygon(polygon, queries) → array of strings",
      starterSource: starter("pointInPolygon", "polygon, queries", "Per query: boundary test on every edge, then count crossings where (y1 > y) differs from (y2 > y) and the cross product puts the edge to the right."),
      solve: pointInPolygon, comparator: "deep", dependencies: ["cross-sign"], brute: pointInPolygonBrute, small: (round) => [randomPolygon(4000 + round, 3 + (round % 6), 7 + (round % 4)), randomPoints(4500 + round, 1 + (round % 6), 16)],
      reference: book("29.4", "Point in polygon"),
      presets: {
        "CSES sample": { a: SAMPLE_POLYGON, b: [[2, 3], [3, 1], [1, 3]], polygon: SAMPLE_POLYGON, marks: [[2, 3], [3, 1], [1, 3]] },
        "a square": { a: [[0, 0], [4, 0], [4, 4], [0, 4]], b: [[2, 2], [5, 2], [0, 2], [4, 4]], polygon: [[0, 0], [4, 0], [4, 4], [0, 4]], marks: [[2, 2], [5, 2], [0, 2], [4, 4]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-boundary", "A point sitting exactly on an edge is BOUNDARY, whatever the crossing count says.", function pointInPolygon(polygon, queries) { const n = polygon.length; const answers = []; for (let q = 0; q < queries.length; q += 1) { const x = queries[q][0], y = queries[q][1]; let inside = false; for (let i = 0, j = n - 1; i < n; j = i, i += 1) { const x1 = polygon[j][0], y1 = polygon[j][1], x2 = polygon[i][0], y2 = polygon[i][1]; const side = crossSign(x2 - x1, y2 - y1, x - x1, y - y1); if ((y1 > y) !== (y2 > y) && (side > 0) === (y2 > y1)) inside = !inside; } answers.push(inside ? "INSIDE" : "OUTSIDE"); } return answers; }),
        diagnosis("counts-both-sides", "The ray only goes one way, so an edge that crosses its height on the other side of the point must not be counted.", function pointInPolygon(polygon, queries) { const n = polygon.length; const answers = []; for (let q = 0; q < queries.length; q += 1) { const x = queries[q][0], y = queries[q][1]; let inside = false, boundary = false; for (let i = 0, j = n - 1; i < n && !boundary; j = i, i += 1) { const x1 = polygon[j][0], y1 = polygon[j][1], x2 = polygon[i][0], y2 = polygon[i][1]; const side = crossSign(x2 - x1, y2 - y1, x - x1, y - y1); if (side === 0 && Math.min(x1, x2) <= x && x <= Math.max(x1, x2) && Math.min(y1, y2) <= y && y <= Math.max(y1, y2)) { boundary = true; break; } if ((y1 > y) !== (y2 > y)) inside = !inside; } answers.push(boundary ? "BOUNDARY" : (inside ? "INSIDE" : "OUTSIDE")); } return answers; }),
      ],
      hints: ["For every edge (x1, y1) → (x2, y2): side = crossSign(x2 - x1, y2 - y1, x - x1, y - y1).", "Boundary when side is 0 and x, y lie inside the edge's box; answer BOUNDARY straight away.", "Otherwise flip an inside flag when (y1 > y) !== (y2 > y) and (side > 0) === (y2 > y1)."],
      cases: [
        example([SAMPLE_POLYGON, [[2, 3], [3, 1], [1, 3]]], ["INSIDE", "OUTSIDE", "BOUNDARY"], "CSES sample"),
        example([[[0, 0], [4, 0], [4, 4], [0, 4]], [[2, 2], [5, 2], [0, 2], [4, 4], [2, 0]]], ["INSIDE", "OUTSIDE", "BOUNDARY", "BOUNDARY", "BOUNDARY"], "a square with corners and edges"),
        example([[[0, 0], [4, 0], [4, 4], [0, 4]], [[2, 4], [-1, 4]]], ["BOUNDARY", "OUTSIDE"], "level with the top edge"),
        example([[[0, 0], [4, 0], [2, 4]], [[2, 1], [2, 3], [0, 3]]], ["INSIDE", "INSIDE", "OUTSIDE"], "a triangle"),
        hidden("n = m = 1 000 with coordinates to 10⁹, time limit", () => [POLYGON_SMALL(), POLYGON_QUERIES()]),
      ],
    },
    {
      id: "polygon-lattice-points", title: "Polygon Lattice Points", cses: { id: 2193, name: "Polygon Lattice Points" },
      goal: "Two decimal strings: the number of lattice points strictly inside the simple polygon, and the number on its boundary.",
      concept: "Pick's theorem ties them together: the area equals interior + boundary/2 − 1. The boundary count is easy, because an edge with steps dx and dy passes through gcd(|dx|, |dy|) lattice points before its far end. Rearranged, interior = (2·area − boundary + 2) / 2, and 2·area is the shoelace sum, so nothing is ever divided by two on its own.",
      functionName: "polygonLatticePoints", signature: "polygonLatticePoints(points) → [interior, boundary] as decimal strings",
      starterSource: starter("polygonLatticePoints", "points", "Shoelace with BigInt for 2A; boundary = Σ gcd(|dx|, |dy|); interior = (2A − boundary + 2) / 2."),
      solve: polygonLatticePoints, comparator: "deep", brute: polygonLatticePointsBrute, small: (round) => [randomPolygon(5000 + round, 3 + (round % 6), 7 + (round % 4))],
      reference: book("29.3", "Polygon area · Pick's theorem"),
      presets: {
        "CSES sample": { a: LATTICE_POLYGON, polygon: LATTICE_POLYGON },
        "a square": { a: [[0, 0], [3, 0], [3, 3], [0, 3]], polygon: [[0, 0], [3, 0], [3, 3], [0, 3]] },
        "a slanted edge": { a: [[0, 0], [4, 2], [0, 2]], polygon: [[0, 0], [4, 2], [0, 2]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("counts-endpoints-twice", "gcd(|dx|, |dy|) already counts one endpoint per edge, so every corner is covered exactly once around the loop.", function polygonLatticePoints(points) { const n = points.length; const gcd = (a, b) => { let x = a, y = b; while (y) { const t = x % y; x = y; y = t; } return x; }; let twiceArea = 0n, boundary = 0; for (let i = 0; i < n; i += 1) { const p = points[i], q = points[(i + 1) % n]; twiceArea += BigInt(p[0]) * BigInt(q[1]) - BigInt(q[0]) * BigInt(p[1]); boundary += gcd(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])) + 1; } if (twiceArea < 0n) twiceArea = -twiceArea; const interior = (twiceArea - BigInt(boundary) + 2n) / 2n; return [interior.toString(), String(boundary)]; }),
        diagnosis("boundary-not-subtracted", "Pick's theorem gives area = interior + boundary/2 − 1, so the boundary points have to come off before halving.", function polygonLatticePoints(points) { const n = points.length; const gcd = (a, b) => { let x = a, y = b; while (y) { const t = x % y; x = y; y = t; } return x; }; let twiceArea = 0n, boundary = 0; for (let i = 0; i < n; i += 1) { const p = points[i], q = points[(i + 1) % n]; twiceArea += BigInt(p[0]) * BigInt(q[1]) - BigInt(q[0]) * BigInt(p[1]); boundary += gcd(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])); } if (twiceArea < 0n) twiceArea = -twiceArea; const interior = (twiceArea + 2n) / 2n; return [interior.toString(), String(boundary)]; }),
      ],
      hints: ["Walk the edges once, accumulating the shoelace sum in BigInt and the boundary count as a number.", "An edge from p to q contributes gcd(|qx − px|, |qy − py|) boundary points.", "interior = (|2A| − boundary + 2n) / 2n; return both as strings."],
      cases: [
        example([LATTICE_POLYGON], ["6", "8"], "CSES sample"),
        example([[[0, 0], [3, 0], [3, 3], [0, 3]]], ["4", "12"], "a 3 × 3 square"),
        example([[[0, 0], [1, 0], [1, 1], [0, 1]]], ["0", "4"], "a unit square"),
        example([[[0, 0], [4, 2], [0, 2]]], ["1", "8"], "a slanted edge passes through a lattice point"),
        example([[[-1000000000, -1000000000], [1000000000, -1000000000], [1000000000, 1000000000], [-1000000000, 1000000000]]], ["3999999996000000001", "8000000000"], "the whole coordinate square"),
        hidden("n = 100 000 with coordinates to 10⁹, time limit", () => [POLYGON_BIG()]),
      ],
    },
    {
      id: "minimum-euclidean-distance", title: "Minimum Euclidean Distance", cses: { id: 2194, name: "Minimum Euclidean Distance" },
      goal: "The smallest squared distance between two of the given distinct points, as a decimal string.",
      concept: "Split the points down the middle by x and solve both halves. A closer pair that crosses the split must lie in a strip of width d either side, and inside that strip, sorted by y, only a handful of neighbours can be within d, because more than that would be closer to each other than d. Merging the halves by y as the recursion returns keeps the whole thing n log n.",
      functionName: "minimumEuclideanDistance", signature: "minimumEuclideanDistance(points) → decimal string",
      starterSource: starter("minimumEuclideanDistance", "points", "Sort by x; recurse on halves; merge by y; scan the strip comparing each point with the next few."),
      solve: minimumEuclideanDistance, comparator: "scalar", brute: minimumEuclideanDistanceBrute, small: (round) => [randomPoints(6000 + round, 2 + (round % 9), 14)],
      reference: book("29.5", "Closest pair"),
      presets: {
        "CSES sample": { a: [[2, 1], [4, 4], [1, 2], [6, 3]], points: [[2, 1], [4, 4], [1, 2], [6, 3]] },
        "a tight pair": { a: [[0, 0], [5, 0], [6, 0], [20, 0]], points: [[0, 0], [5, 0], [6, 0], [20, 0]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("halves-only", "The closest pair can straddle the split line; the strip either side of it has to be scanned too.", function minimumEuclideanDistance(points) { const byX = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); let best = Infinity; const solve = (lo, hi) => { if (hi - lo <= 3) { for (let i = lo; i < hi; i += 1) for (let j = i + 1; j < hi; j += 1) { const dx = byX[i][0] - byX[j][0], dy = byX[i][1] - byX[j][1]; if (dx * dx + dy * dy < best) best = dx * dx + dy * dy; } return; } const mid = (lo + hi) >> 1; solve(lo, mid); solve(mid, hi); }; solve(0, byX.length); return String(best); }),
        diagnosis("plain-distance", "The answer is the squared distance, which keeps it a whole number; no square root is taken.", function minimumEuclideanDistance(points) { const byX = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const n = byX.length; const buffer = new Array(n); let best = Infinity; const consider = (p, q) => { const dx = p[0] - q[0], dy = p[1] - q[1]; const value = dx * dx + dy * dy; if (value < best) best = value; }; const solve = (lo, hi) => { if (hi - lo <= 3) { for (let i = lo; i < hi; i += 1) for (let j = i + 1; j < hi; j += 1) consider(byX[i], byX[j]); for (let i = lo + 1; i < hi; i += 1) { const item = byX[i]; let j = i - 1; while (j >= lo && byX[j][1] > item[1]) { byX[j + 1] = byX[j]; j -= 1; } byX[j + 1] = item; } return; } const mid = (lo + hi) >> 1; const midX = byX[mid][0]; solve(lo, mid); solve(mid, hi); let i = lo, j = mid, k = lo; while (i < mid || j < hi) { if (j >= hi || (i < mid && byX[i][1] <= byX[j][1])) { buffer[k] = byX[i]; i += 1; } else { buffer[k] = byX[j]; j += 1; } k += 1; } for (let t = lo; t < hi; t += 1) byX[t] = buffer[t]; const strip = []; for (let t = lo; t < hi; t += 1) { const dx = byX[t][0] - midX; if (dx * dx < best) strip.push(byX[t]); } for (let a = 0; a < strip.length; a += 1) for (let b = a + 1; b < strip.length && b <= a + 7; b += 1) { const dy = strip[b][1] - strip[a][1]; if (dy * dy >= best) break; consider(strip[a], strip[b]); } }; solve(0, n); return String(Math.round(Math.sqrt(best))); }),
      ],
      hints: ["Sort by x once. The base case of three or fewer points compares them all and leaves them sorted by y.", "After both halves return, merge them by y, then collect the points whose x is within the current best of the split.", "In the strip, compare each point with the following ones until the y gap alone exceeds the best."],
      cases: [
        example([[[2, 1], [4, 4], [1, 2], [6, 3]]], "2", "CSES sample"),
        example([[[0, 0], [3, 4]]], "25", "two points"),
        example([[[0, 0], [5, 0], [6, 0], [20, 0]]], "1", "the closest pair straddles the middle"),
        example([[[-1000000000, -1000000000], [1000000000, 1000000000]]], "8000000000000000000", "past 2⁵³"),
        hidden("n = 100 000 with coordinates to 10⁹, time limit", () => [POINTS_MID()]),
      ],
    },
    {
      id: "convex-hull", title: "Convex Hull", cses: { id: 2195, name: "Convex Hull" },
      goal: "Every given point that lies on the convex hull, including the ones inside a hull edge. Return them as [x, y] pairs in any order.",
      concept: "Sort the points by x, then y, and sweep them twice: once along the bottom and once back along the top. Keep a stack and pop whenever the last three make a right turn. Popping only on a strict right turn leaves the points that sit inside an edge in place, which is what this task asks for.",
      functionName: "convexHull", signature: "convexHull(points) → array of [x, y]",
      starterSource: starter("convexHull", "points", "Sort; build the lower chain popping while the turn is strictly right; repeat over the reversed list for the upper chain; drop repeats."),
      solve: convexHull, comparator: "deep", dependencies: ["cross-sign"], accept: convexHullAccept, check: convexHullCheck, small: (round) => [randomPoints(16000 + round, 3 + (round % 8), 9)],
      reference: book("29.6", "Convex hull"),
      presets: {
        "CSES sample": { a: SAMPLE_HULL_POINTS, points: SAMPLE_HULL_POINTS },
        "a square with a middle": { a: [[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]], points: [[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]] },
        "points along an edge": { a: [[0, 0], [2, 0], [4, 0], [0, 4]], points: [[0, 0], [2, 0], [4, 0], [0, 4]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("drops-collinear", "Popping when the turn is not strictly left throws away the points that lie inside a hull edge, and this task wants them.", function convexHull(points) { const sorted = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const build = (list) => { const stack = []; for (let i = 0; i < list.length; i += 1) { const p = list[i]; while (stack.length >= 2) { const a = stack[stack.length - 2], b = stack[stack.length - 1]; if (crossSign(b[0] - a[0], b[1] - a[1], p[0] - a[0], p[1] - a[1]) <= 0) stack.pop(); else break; } stack.push(p); } return stack; }; const lower = build(sorted), upper = build(sorted.slice().reverse()); const seen = new Set(), hull = []; lower.concat(upper).forEach((p) => { const key = p[0] + "," + p[1]; if (seen.has(key)) return; seen.add(key); hull.push([p[0], p[1]]); }); return hull; }),
        diagnosis("lower-chain-only", "One sweep covers the bottom of the hull; the top needs a second sweep over the reversed order.", function convexHull(points) { const sorted = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const stack = []; for (let i = 0; i < sorted.length; i += 1) { const p = sorted[i]; while (stack.length >= 2) { const a = stack[stack.length - 2], b = stack[stack.length - 1]; if (crossSign(b[0] - a[0], b[1] - a[1], p[0] - a[0], p[1] - a[1]) < 0) stack.pop(); else break; } stack.push(p); } return stack.map((p) => [p[0], p[1]]); }),
      ],
      hints: ["Sort by x and break ties by y.", "Chain: for each point, while the last two stack entries and the new point turn strictly right (crossSign < 0), pop.", "Run the chain over the sorted list and again over its reverse, then drop points that appear in both."],
      cases: [
        example([SAMPLE_HULL_POINTS], [[2, 1], [6, 3], [4, 4], [2, 5]], "CSES sample"),
        example([[[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]], [[0, 0], [4, 0], [4, 4], [0, 4]], "the middle point is not on the hull"),
        example([[[0, 0], [2, 0], [4, 0], [0, 4]]], [[0, 0], [2, 0], [4, 0], [0, 4]], "points inside an edge count"),
        example([[[0, 0], [1, 0], [0, 1]]], [[0, 0], [1, 0], [0, 1]], "a triangle"),
        hidden("n = 100 000 with coordinates to 10⁹, time limit", () => [POINTS_MID()]),
      ],
    },
    {
      id: "maximum-manhattan-distances", title: "Maximum Manhattan Distances", cses: { id: 3410, name: "Maximum Manhattan Distances" },
      goal: "After each point is added, the largest Manhattan distance between two points added so far. The first answer is 0.",
      concept: "Turn the plane 45 degrees: with u = x + y and v = x − y, the Manhattan distance |Δx| + |Δy| becomes the larger of |Δu| and |Δv|. The absolute values are gone, so the answer is just the wider of the two spreads, and four running extremes track it.",
      functionName: "maximumManhattanDistances", signature: "maximumManhattanDistances(points) → array",
      starterSource: starter("maximumManhattanDistances", "points", "Track max and min of x + y and of x − y; after each point push max(spread of u, spread of v)."),
      solve: maximumManhattanDistances, comparator: "deep", brute: maximumManhattanBrute, small: (round) => [randomPoints(7000 + round, 1 + (round % 9), 14)],
      reference: book("29.7", "Manhattan distances"),
      presets: {
        "CSES sample": { a: SAMPLE_MANHATTAN, points: SAMPLE_MANHATTAN },
        "a diagonal": { a: [[0, 0], [1, 1], [2, 2]], points: [[0, 0], [1, 1], [2, 2]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("one-rotation-only", "The rotation gives two coordinates; the answer is the wider spread, and u alone misses pairs that spread along v.", function maximumManhattanDistances(points) { const answers = []; let maxU = -Infinity, minU = Infinity; for (let i = 0; i < points.length; i += 1) { const u = points[i][0] + points[i][1]; if (u > maxU) maxU = u; if (u < minU) minU = u; answers.push(maxU - minU); } return answers; }),
        diagnosis("spread-of-coordinates", "The spread of x plus the spread of y can come from different pairs, so it overshoots.", function maximumManhattanDistances(points) { const answers = []; let maxX = -Infinity, minX = Infinity, maxY = -Infinity, minY = Infinity; for (let i = 0; i < points.length; i += 1) { if (points[i][0] > maxX) maxX = points[i][0]; if (points[i][0] < minX) minX = points[i][0]; if (points[i][1] > maxY) maxY = points[i][1]; if (points[i][1] < minY) minY = points[i][1]; answers.push(maxX - minX + maxY - minY); } return answers; }),
      ],
      hints: ["For each point compute u = x + y and v = x − y.", "Keep the running maximum and minimum of both.", "The answer after each point is max(maxU − minU, maxV − minV)."],
      cases: [
        example([SAMPLE_MANHATTAN], [0, 3, 4, 4, 7], "CSES sample"),
        example([[[0, 0]]], [0], "one point"),
        example([[[0, 0], [1, 1], [2, 2]]], [0, 2, 4], "along a diagonal"),
        example([[[0, 0], [2, -2], [-2, 2]]], [0, 4, 8], "the other diagonal"),
        example([[[-1000000000, -1000000000], [1000000000, 1000000000]]], [0, 4000000000], "the far corners"),
        hidden("n = 100 000 with coordinates to 10⁹, time limit", () => [POINTS_MID()]),
      ],
    },
    {
      id: "all-manhattan-distances", title: "All Manhattan Distances", cses: { id: 3411, name: "All Manhattan Distances" },
      goal: "The sum of the Manhattan distances over all pairs of points, as a decimal string.",
      concept: "|Δx| + |Δy| splits into two independent one-dimensional sums. Sorted, the i-th value is larger than the i before it, so it contributes i·value minus their total, and one pass over each sorted axis adds up every pair. With 2·10⁵ points the total passes 10¹⁹, so it is accumulated in BigInt.",
      functionName: "allManhattanDistances", signature: "allManhattanDistances(points) → decimal string",
      starterSource: starter("allManhattanDistances", "points", "For each axis: sort, then add value * i − (running total of the smaller ones); sum both axes in BigInt."),
      solve: allManhattanDistances, comparator: "scalar", brute: allManhattanBrute, small: (round) => [randomPoints(8000 + round, 1 + (round % 9), 14)],
      reference: book("29.7", "Manhattan distances"),
      presets: {
        "CSES sample": { a: SAMPLE_MANHATTAN, points: SAMPLE_MANHATTAN },
        "a line": { a: [[0, 0], [1, 0], [3, 0]], points: [[0, 0], [1, 0], [3, 0]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("unsorted", "Without sorting, value − earlier values is not the distance; the absolute value only disappears in order.", function allManhattanDistances(points) { const axisTotal = (index) => { const values = points.map((p) => p[index]); let total = 0n, prefix = 0n; for (let i = 0; i < values.length; i += 1) { const value = BigInt(values[i]); total += value * BigInt(i) - prefix; prefix += value; } return total; }; return (axisTotal(0) + axisTotal(1)).toString(); }),
        diagnosis("float-total", "Two hundred thousand points give twenty billion pairs; the total runs past 2⁵³ long before the end.", function allManhattanDistances(points) { const axisTotal = (index) => { const values = points.map((p) => p[index]).sort((a, b) => a - b); let total = 0, prefix = 0; for (let i = 0; i < values.length; i += 1) { total += values[i] * i - prefix; prefix += values[i]; } return total; }; return String(axisTotal(0) + axisTotal(1)); }),
      ],
      hints: ["Handle the x values and the y values separately and add the two answers.", "Sort the values. Keep a running total of the ones already seen.", "At index i add BigInt(value) * BigInt(i) − prefix, then add the value to prefix."],
      cases: [
        example([SAMPLE_MANHATTAN], "36", "CSES sample"),
        example([[[0, 0]]], "0", "one point"),
        example([[[0, 0], [1, 0], [3, 0]]], "6", "three on a line"),
        example([[[0, 0], [1, 1]]], "2", "one pair"),
        example([[[-1000000000, -1000000000], [1000000000, 1000000000]]], "4000000000", "the far corners"),
        hidden("n = 100 000 with coordinates to 10⁹, time limit", () => [POINTS_MID()]),
      ],
    },
    {
      id: "intersection-points", title: "Intersection Points", cses: { id: 1740, name: "Intersection Points" },
      goal: "The number of points where a horizontal segment meets a vertical one. No two parallel segments touch and no endpoint is an intersection.",
      concept: "Sweep a line left to right. A horizontal segment is present between its two ends, so add it when the sweep reaches its left end and drop it after its right end, keeping the live segments in a Fenwick tree indexed by height. A vertical segment at the sweep's position then crosses exactly the live horizontals whose height lies in its range, which is one range sum.",
      functionName: "intersectionPoints", signature: "intersectionPoints(segments) → number",
      starterSource: starter("intersectionPoints", "segments", "Split into horizontals and verticals; sweep by x adding, removing and querying a Fenwick tree over compressed heights."),
      solve: intersectionPoints, comparator: "scalar", dependencies: ["fenwick-add", "fenwick-prefix"], brute: intersectionPointsBrute, small: (round) => [randomAxisSegments(9000 + round, 1 + (round % 8), 10, 5)],
      reference: book("29.8", "Sweep line algorithms"),
      presets: {
        "CSES sample": { a: SAMPLE_AXIS, segments: SAMPLE_AXIS },
        "a grid": { a: [[0, 0, 4, 0], [0, 2, 4, 2], [1, -1, 1, 3], [3, -1, 3, 3]], segments: [[0, 0, 4, 0], [0, 2, 4, 2], [1, -1, 1, 3], [3, -1, 3, 3]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("never-removed", "A horizontal segment stops counting past its right end; without the removals every later vertical sees it.", function intersectionPoints(segments) { const horizontal = [], vertical = [], ys = []; for (let i = 0; i < segments.length; i += 1) { const s = segments[i]; if (s[1] === s[3]) { horizontal.push([Math.min(s[0], s[2]), Math.max(s[0], s[2]), s[1]]); ys.push(s[1]); } else vertical.push([s[0], Math.min(s[1], s[3]), Math.max(s[1], s[3])]); } ys.sort((a, b) => a - b); const unique = []; for (let i = 0; i < ys.length; i += 1) if (i === 0 || ys[i] !== ys[i - 1]) unique.push(ys[i]); const rankOf = (y) => { let lo = 0, hi = unique.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (unique[mid] < y) lo = mid + 1; else hi = mid; } return lo; }; const starts = horizontal.slice().sort((a, b) => a[0] - b[0]); vertical.sort((a, b) => a[0] - b[0]); const tree = new Array(unique.length + 1).fill(0); let added = 0, total = 0; for (let i = 0; i < vertical.length; i += 1) { const x = vertical[i][0]; while (added < starts.length && starts[added][0] <= x) { fenwickAdd(tree, rankOf(starts[added][2]) + 1, 1); added += 1; } const lo = rankOf(vertical[i][1]); let hi = rankOf(vertical[i][2]); if (hi < unique.length && unique[hi] === vertical[i][2]) hi += 1; total += fenwickPrefix(tree, hi) - fenwickPrefix(tree, lo); } return total; }),
        diagnosis("ignores-the-height-range", "A live horizontal only crosses the vertical when its height falls inside the vertical's range; counting them all counts segments that pass well above or below.", function intersectionPoints(segments) { const horizontal = [], vertical = [], ys = []; for (let i = 0; i < segments.length; i += 1) { const s = segments[i]; if (s[1] === s[3]) { horizontal.push([Math.min(s[0], s[2]), Math.max(s[0], s[2]), s[1]]); ys.push(s[1]); } else vertical.push([s[0], Math.min(s[1], s[3]), Math.max(s[1], s[3])]); } ys.sort((a, b) => a - b); const unique = []; for (let i = 0; i < ys.length; i += 1) if (i === 0 || ys[i] !== ys[i - 1]) unique.push(ys[i]); const rankOf = (y) => { let lo = 0, hi = unique.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (unique[mid] < y) lo = mid + 1; else hi = mid; } return lo; }; const starts = horizontal.slice().sort((a, b) => a[0] - b[0]); const ends = horizontal.slice().sort((a, b) => a[1] - b[1]); vertical.sort((a, b) => a[0] - b[0]); const tree = new Array(unique.length + 1).fill(0); let added = 0, removed = 0, total = 0; for (let i = 0; i < vertical.length; i += 1) { const x = vertical[i][0]; while (added < starts.length && starts[added][0] <= x) { fenwickAdd(tree, rankOf(starts[added][2]) + 1, 1); added += 1; } while (removed < ends.length && ends[removed][1] < x) { fenwickAdd(tree, rankOf(ends[removed][2]) + 1, -1); removed += 1; } total += fenwickPrefix(tree, unique.length); } return total; }),
      ],
      hints: ["Separate the horizontal segments from the vertical ones and compress the horizontal heights.", "Walk the verticals by x. Before each, add every horizontal whose left end has been passed and remove every one whose right end is behind.", "The answer for a vertical is the Fenwick range sum over the heights it spans, both ends included."],
      cases: [
        example([SAMPLE_AXIS], 2, "CSES sample"),
        example([[[0, 0, 4, 0], [0, 2, 4, 2], [1, -1, 1, 3], [3, -1, 3, 3]]], 4, "a grid"),
        example([[[0, 0, 4, 0]]], 0, "one segment"),
        example([[[0, 0, 4, 0], [5, -1, 5, 1]]], 0, "the vertical is past the right end"),
        example([[[0, 0, 4, 0], [2, 1, 2, 3]]], 0, "the vertical is above"),
        hidden("n = 50 000 with coordinates to 10⁶, time limit", () => [AXIS_SEGMENTS()]),
      ],
    },
    {
      id: "li-chao-insert", title: "Li Chao Insert", cses: { id: 3427, name: "Line Segments Trace I (brick)" },
      goal: "Add the line a·x + b to a Li Chao tree. The tree is an array where index 1 is the root and node k has children 2k and 2k + 1; each entry is null or a stored line [a, b]. The call covers the range [lo, hi] at the given node. Return the tree.",
      concept: "Each node keeps one line: the one that wins at the middle of its range. Two straight lines cross at most once, so once the winner at the middle is settled, the loser can only win on the side where it already beats the winner at that end. Push the loser to that child and repeat. A line therefore travels down one path, and a query reading every node from the root to a leaf is guaranteed to meet the best line.",
      functionName: "liChaoInsert", signature: "liChaoInsert(tree, node, lo, hi, a, b) → tree",
      starterSource: starter("liChaoInsert", "tree, node, lo, hi, a, b", "Loop down: if the slot is empty store the line; otherwise keep the winner at the middle and carry the loser to the side where it wins at the end."),
      solve: liChaoInsert, comparator: "deep", allowMutation: true, accept: liChaoInsertAccept, check: (args, out) => liChaoInsertAccept(args, out) === true,
      small: (round) => { const size = 4 + (round % 8); return [filledLiChao(size, [[1, 2], [-1, 5], [0, 3]].slice(0, round % 4)), 1, 0, size - 1, (round % 7) - 3, (round % 11) - 5]; },
      reference: book("29.9", "Li Chao tree"),
      presets: {
        "into an empty tree": { a: emptyLiChao(8), b: 1, c: 0, d: 7, e: 1, f: 2, lines: [[1, 2]], xlo: 0, xhi: 7 },
        "a crossing line": { a: filledLiChao(8, [[1, 2]]), b: 1, c: 0, d: 7, e: -1, f: 8, lines: [[1, 2], [-1, 8]], xlo: 0, xhi: 7 },
        "a line below": { a: filledLiChao(8, [[1, 2]]), b: 1, c: 0, d: 7, e: 1, f: 0, lines: [[1, 2], [1, 0]], xlo: 0, xhi: 7 },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("keeps-the-first", "The line that wins at the middle belongs at this node; leaving the old one there loses the new line entirely.", function liChaoInsert(tree, node, lo, hi, a, b) { let at = node, low = lo, high = hi; while (true) { const current = tree[at]; if (!current) { tree[at] = [a, b]; return tree; } const mid = Math.floor((low + high) / 2); if (low === high) return tree; const leftBetter = a * low + b > current[0] * low + current[1]; const midBetter = a * mid + b > current[0] * mid + current[1]; if (leftBetter !== midBetter) { high = mid; at = 2 * at; } else { low = mid + 1; at = 2 * at + 1; } } }),
        diagnosis("always-goes-left", "The loser only survives on the side where it already beats the winner at that end; always walking left drops it on the other side.", function liChaoInsert(tree, node, lo, hi, a, b) { let at = node, low = lo, high = hi, slope = a, intercept = b; while (true) { const current = tree[at]; if (!current) { tree[at] = [slope, intercept]; return tree; } const mid = Math.floor((low + high) / 2); const midBetter = slope * mid + intercept > current[0] * mid + current[1]; if (midBetter) { tree[at] = [slope, intercept]; slope = current[0]; intercept = current[1]; } if (low === high) return tree; high = mid; at = 2 * at; } }),
      ],
      hints: ["Walk down with the current node and its range. An empty slot takes the line and the work is done.", "Compare the new line with the stored one at lo and at mid. If the new line wins at mid, store it here and carry the old one on.", "If the winners at lo and mid differ, the carried line belongs on the left child; otherwise on the right. A leaf ends the walk."],
      cases: [
        run(liChaoInsert, [emptyLiChao(8), 1, 0, 7, 1, 2], "into an empty tree"),
        run(liChaoInsert, [filledLiChao(8, [[1, 2]]), 1, 0, 7, -1, 8], "a crossing line"),
        run(liChaoInsert, [filledLiChao(8, [[1, 2]]), 1, 0, 7, 1, 0], "a line that never wins"),
        run(liChaoInsert, [filledLiChao(4, [[1, 0], [-1, 3]]), 1, 0, 3, 0, 2], "a third line"),
        run(liChaoInsert, [emptyLiChao(1), 1, 0, 0, 5, 5], "a single leaf"),
        run(liChaoInsert, [filledLiChao(8, [[0, 0]]), 1, 0, 7, 0, 5], "a line that wins everywhere"),
        run(liChaoInsert, [filledLiChao(8, [[1, 0]]), 1, 0, 7, -1, 7], "the carried line still wins on the right"),
      ],
    },
    {
      id: "li-chao-query", title: "Li Chao Query", cses: { id: 3427, name: "Line Segments Trace I (brick)" },
      goal: "The largest value any stored line takes at x, walking the Li Chao tree of the given size from the root to the leaf for x. Return null when no line is stored on that path.",
      concept: "The insert rule guarantees that the best line at x is stored somewhere on the path from the root down to x's leaf. So the query reads one line per level and keeps the largest value, without ever looking at the rest of the tree.",
      functionName: "liChaoQuery", signature: "liChaoQuery(tree, size, x) → number | null",
      starterSource: starter("liChaoQuery", "tree, size, x", "Walk from node 1 over [0, size − 1] towards x, taking the best value of every line met."),
      solve: liChaoQuery, comparator: "scalar", brute: liChaoQueryBrute,
      small: (round) => { const size = 4 + (round % 8); return [filledLiChao(size, [[1, 2], [-1, 5], [0, 3], [2, -4]].slice(0, round % 5)), size, round % size]; },
      reference: book("29.9", "Li Chao tree"),
      presets: {
        "one line": { a: filledLiChao(8, [[1, 2]]), b: 8, c: 3, lines: [[1, 2]], xlo: 0, xhi: 7 },
        "two crossing lines": { a: filledLiChao(8, [[1, 2], [-1, 8]]), b: 8, c: 3, lines: [[1, 2], [-1, 8]], xlo: 0, xhi: 7 },
        "an empty tree": { a: emptyLiChao(8), b: 8, c: 3, lines: [], xlo: 0, xhi: 7 },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("root-only", "The best line for x may sit at any depth along the path, not only at the root.", function liChaoQuery(tree, size, x) { return tree[1] ? tree[1][0] * x + tree[1][1] : null; }),
        diagnosis("leaf-only", "Every node on the way down holds a candidate; keeping only the last one throws the others away.", function liChaoQuery(tree, size, x) { let at = 1, low = 0, high = size - 1, best = null; while (true) { if (tree[at]) best = tree[at][0] * x + tree[at][1]; if (low === high) return best; const mid = Math.floor((low + high) / 2); if (x <= mid) { high = mid; at = 2 * at; } else { low = mid + 1; at = 2 * at + 1; } } }),
      ],
      hints: ["Start at node 1 covering [0, size − 1] with best = null.", "At each node, if a line is stored, evaluate it at x and keep it when it beats best.", "Step to the left child when x ≤ mid, otherwise the right child; stop at a leaf."],
      cases: [
        example([filledLiChao(8, [[1, 2]]), 8, 3], 5, "one line"),
        example([filledLiChao(8, [[1, 2], [-1, 8]]), 8, 3], 5, "two crossing lines, left of the crossing"),
        example([filledLiChao(8, [[1, 2], [-1, 8]]), 8, 6], 8, "right of the crossing"),
        example([emptyLiChao(8), 8, 3], null, "no lines stored"),
        example([filledLiChao(8, [[0, 4], [1, 0], [-1, 7]]), 8, 0], 7, "three lines at the left end"),
        example([filledLiChao(8, [[0, 4], [1, 0], [-1, 9]]), 8, 6], 6, "the best line sits above the leaf"),
      ],
    },
    {
      id: "line-segments-trace-i", title: "Line Segments Trace I", cses: { id: 3427, name: "Line Segments Trace I" },
      goal: "Each segment runs from (0, y₁) to (m, y₂) and has an integer slope. For every x from 0 to m, the highest point on any segment.",
      concept: "Every segment spans the whole width, so they are just lines and the answer is their upper envelope. A Li Chao tree collects the lines in any order and answers each x by reading one line per level.",
      functionName: "lineSegmentsTraceI", signature: "lineSegmentsTraceI(m, ends) → array of m + 1 values",
      starterSource: starter("lineSegmentsTraceI", "m, ends", "Tree of 4(m + 1) nulls; insert slope (y2 − y1) / m with intercept y1; query every x."),
      solve: lineSegmentsTraceI, comparator: "deep", dependencies: ["li-chao-insert", "li-chao-query"], brute: traceIBrute, small: (round) => [1 + (round % 6), randomTraceEnds(10000 + round, 1 + (round % 5), 1 + (round % 6), 40)],
      reference: book("29.9", "Li Chao tree"),
      presets: {
        "CSES sample": { a: 5, b: [[1, 6], [7, 2], [5, 5], [10, 0]], lines: [[1, 1], [-1, 7], [0, 5], [-2, 10]], xlo: 0, xhi: 5 },
        "one segment": { a: 4, b: [[0, 8]], lines: [[2, 0]], xlo: 0, xhi: 4 },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("intercept-at-m", "The stored intercept is the value at x = 0, which is y₁, not y₂.", function lineSegmentsTraceI(m, ends) { const size = m + 1; const tree = new Array(4 * size).fill(null); for (let i = 0; i < ends.length; i += 1) liChaoInsert(tree, 1, 0, size - 1, (ends[i][1] - ends[i][0]) / m, ends[i][1]); const answers = new Array(size); for (let x = 0; x <= m; x += 1) answers[x] = liChaoQuery(tree, size, x); return answers; }),
        diagnosis("first-and-last-only", "The highest segment can change in the middle; the two ends do not decide the whole row.", function lineSegmentsTraceI(m, ends) { let bestStart = -Infinity, bestEnd = -Infinity; for (let i = 0; i < ends.length; i += 1) { if (ends[i][0] > bestStart) bestStart = ends[i][0]; if (ends[i][1] > bestEnd) bestEnd = ends[i][1]; } const answers = new Array(m + 1); for (let x = 0; x <= m; x += 1) answers[x] = bestStart + (bestEnd - bestStart) / m * x; return answers; }),
      ],
      hints: ["The line through (0, y₁) and (m, y₂) is y = ((y₂ − y₁) / m) · x + y₁.", "Insert every line into a Li Chao tree over [0, m].", "Read the answer for each x with one query."],
      cases: [
        example([5, [[1, 6], [7, 2], [5, 5], [10, 0]]], [10, 8, 6, 5, 5, 6], "CSES sample"),
        example([4, [[0, 8]]], [0, 2, 4, 6, 8], "one segment"),
        example([1, [[5, 5], [0, 9]]], [5, 9], "m = 1"),
        example([3, [[9, 0], [0, 9]]], [9, 6, 6, 9], "two crossing segments"),
        hidden("n = m = 50 000, time limit", () => [50000, TRACE_ENDS()]),
      ],
    },
    {
      id: "li-chao-insert-range", title: "Li Chao Segment Insert", cses: { id: 3428, name: "Line Segments Trace II (brick)" },
      goal: "Add the line a·x + b, but only over the range [l, r] of a Li Chao tree of the given size. Return the tree.",
      concept: "Cut [l, r] into the O(log n) nodes a segment tree would use, and run the ordinary insert at each one. Inside those nodes the line is present everywhere, so the usual rule applies; outside them it was never stored. A query still reads the root-to-leaf path, so each of the two levels of splitting costs one logarithm and the insert costs log squared.",
      functionName: "liChaoInsertRange", signature: "liChaoInsertRange(tree, size, a, b, l, r) → tree",
      starterSource: starter("liChaoInsertRange", "tree, size, a, b, l, r", "Walk the tree; on a node fully inside [l, r] call liChaoInsert there and stop; skip nodes fully outside."),
      solve: liChaoInsertRange, comparator: "deep", allowMutation: true, dependencies: ["li-chao-insert"], accept: liChaoRangeAccept, check: (args, out) => liChaoRangeAccept(args, out) === true,
      small: (round) => { const size = 4 + (round % 8); const tree = emptyLiChao(size); liChaoInsertRange(tree, size, 1, 0, 0, size - 1); const l = round % size; return [tree, size, (round % 7) - 3, (round % 11) - 5, l, l + (round % (size - l))]; },
      reference: book("29.9", "Li Chao tree · segments"),
      presets: {
        "the left half": { a: emptyLiChao(8), b: 8, c: 1, d: 0, e: 0, f: 3, lines: [[1, 0]], xlo: 0, xhi: 7 },
        "one point": { a: emptyLiChao(8), b: 8, c: 0, d: 5, e: 4, f: 4, lines: [[0, 5]], xlo: 0, xhi: 7 },
        "the whole range": { a: emptyLiChao(8), b: 8, c: -1, d: 9, e: 0, f: 7, lines: [[-1, 9]], xlo: 0, xhi: 7 },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }, { fixture: "presetE" }, { fixture: "presetF" }] },
      diagnoses: [
        diagnosis("whole-range", "The line is only active on [l, r]; inserting it at the root makes it win outside its range too.", function liChaoInsertRange(tree, size, a, b, l, r) { liChaoInsert(tree, 1, 0, size - 1, a, b); return tree; }),
        diagnosis("ignores-the-left-end", "A node counts as covered only when its whole range lies inside [l, r]; dropping the test at the left end spreads the line down to zero.", function liChaoInsertRange(tree, size, a, b, l, r) { const walk = (node, lo, hi) => { if (r < lo) return; if (hi <= r) { liChaoInsert(tree, node, lo, hi, a, b); return; } const mid = Math.floor((lo + hi) / 2); walk(2 * node, lo, mid); walk(2 * node + 1, mid + 1, hi); }; walk(1, 0, size - 1); return tree; }),
      ],
      hints: ["Recurse from node 1 over [0, size − 1].", "Return at once when the node's range misses [l, r] entirely.", "When the node's range lies inside [l, r], call liChaoInsert(tree, node, lo, hi, a, b) and stop; otherwise recurse into both children."],
      cases: [
        run(liChaoInsertRange, [emptyLiChao(8), 8, 1, 0, 0, 3], "the left half"),
        run(liChaoInsertRange, [emptyLiChao(8), 8, 0, 5, 4, 4], "a single point"),
        run(liChaoInsertRange, [emptyLiChao(8), 8, -1, 9, 0, 7], "the whole range"),
        run(liChaoInsertRange, [filledLiChao(8, [[0, 3]]), 8, 2, -2, 2, 6], "over an existing line"),
      ],
    },
    {
      id: "line-segments-trace-ii", title: "Line Segments Trace II", cses: { id: 3428, name: "Line Segments Trace II" },
      goal: "Each segment runs from (x₁, y₁) to (x₂, y₂) with an integer slope. For every x from 0 to m, the highest point on any segment that covers x, or −1 when none does.",
      concept: "The same upper envelope as before, except a segment now exists only between its own ends. Inserting it over that range and nowhere else is exactly what the range insert does, and the query is unchanged.",
      functionName: "lineSegmentsTraceII", signature: "lineSegmentsTraceII(m, segments) → array of m + 1 values",
      starterSource: starter("lineSegmentsTraceII", "m, segments", "slope = (y2 − y1) / (x2 − x1); insert over [x1, x2] with intercept y1 − slope · x1; query every x, null becomes −1."),
      solve: lineSegmentsTraceII, comparator: "deep", dependencies: ["li-chao-insert-range", "li-chao-query"], brute: traceIIBrute, small: (round) => [1 + (round % 6), randomTraceSegments(11000 + round, 1 + (round % 5), 1 + (round % 6), 40)],
      reference: book("29.9", "Li Chao tree · segments"),
      presets: {
        "CSES sample": { a: 5, b: [[1, 1, 3, 3], [1, 2, 4, 2], [2, 4, 5, 7], [2, 8, 5, 2]], segments: [[1, 1, 3, 3], [1, 2, 4, 2], [2, 4, 5, 7], [2, 8, 5, 2]] },
        "a gap": { a: 4, b: [[0, 1, 1, 1], [3, 2, 4, 2]], segments: [[0, 1, 1, 1], [3, 2, 4, 2]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("intercept-at-x1", "The intercept is the line's value at x = 0, so the slope has to be taken back from x₁ to zero.", function lineSegmentsTraceII(m, segments) { const size = m + 1; const tree = new Array(4 * size).fill(null); for (let i = 0; i < segments.length; i += 1) { const s = segments[i]; liChaoInsertRange(tree, size, (s[3] - s[1]) / (s[2] - s[0]), s[1], s[0], s[2]); } const answers = new Array(size); for (let x = 0; x <= m; x += 1) { const best = liChaoQuery(tree, size, x); answers[x] = best === null ? -1 : best; } return answers; }),
        diagnosis("empty-is-zero", "An x that no segment covers answers −1, which is not the same as a height of zero.", function lineSegmentsTraceII(m, segments) { const size = m + 1; const tree = new Array(4 * size).fill(null); for (let i = 0; i < segments.length; i += 1) { const s = segments[i]; const slope = (s[3] - s[1]) / (s[2] - s[0]); liChaoInsertRange(tree, size, slope, s[1] - slope * s[0], s[0], s[2]); } const answers = new Array(size); for (let x = 0; x <= m; x += 1) { const best = liChaoQuery(tree, size, x); answers[x] = best === null ? 0 : best; } return answers; }),
      ],
      hints: ["slope = (y₂ − y₁) / (x₂ − x₁) and the intercept is y₁ − slope · x₁.", "Insert each line over its own range [x₁, x₂] only.", "Query every x from 0 to m and turn null into −1."],
      cases: [
        example([5, [[1, 1, 3, 3], [1, 2, 4, 2], [2, 4, 5, 7], [2, 8, 5, 2]]], [-1, 2, 8, 6, 6, 7], "CSES sample"),
        example([4, [[0, 1, 1, 1], [3, 2, 4, 2]]], [1, 1, -1, 2, 2], "a gap in the middle"),
        example([2, [[0, 5, 2, 5]]], [5, 5, 5], "one flat segment"),
        example([3, [[1, 0, 2, 3]]], [-1, 0, 3, -1], "covered only in the middle"),
        hidden("n = m = 25 000, time limit", () => [25000, TRACE_SEGMENTS()]),
      ],
    },
    {
      id: "lines-and-queries-i", title: "Lines and Queries I", cses: { id: 3429, name: "Lines and Queries I" },
      goal: "Process [1, a, b] to add the line a·x + b and [2, x] to ask for the highest line at x, where 0 ≤ x ≤ 10⁵. Return the answers to the type 2 queries.",
      concept: "Exactly the Li Chao tree, used as it was meant to be used: the lines arrive one at a time and each question has to be answered before the next line shows up. The tree never needs the lines sorted or known in advance.",
      functionName: "linesAndQueriesI", signature: "linesAndQueriesI(queries) → array",
      starterSource: starter("linesAndQueriesI", "queries", "One tree over [0, 100000]; type 1 inserts, type 2 queries."),
      solve: linesAndQueriesI, comparator: "deep", dependencies: ["li-chao-insert", "li-chao-query"], brute: linesIBrute, small: (round) => [randomLineQueries(12000 + round, 1 + (round % 9), 40, false)],
      reference: book("29.9", "Li Chao tree"),
      presets: {
        "CSES sample": { a: [[1, 1, 2], [2, 1], [2, 3], [1, 0, 4], [2, 1], [2, 3]], lines: [[1, 2], [0, 4]], xlo: 0, xhi: 5 },
        "a falling line": { a: [[1, -1, 6], [2, 0], [2, 5]], lines: [[-1, 6]], xlo: 0, xhi: 5 },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("answers-every-query", "Only type 2 queries produce an answer; an insert adds nothing to the output.", function linesAndQueriesI(queries) { const size = 100001; const tree = new Array(4 * size).fill(null); const answers = []; for (let i = 0; i < queries.length; i += 1) { if (queries[i][0] === 1) { liChaoInsert(tree, 1, 0, size - 1, queries[i][1], queries[i][2]); answers.push(null); } else answers.push(liChaoQuery(tree, size, queries[i][1])); } return answers; }),
        diagnosis("last-line-only", "A later line does not replace the earlier ones; the answer is the maximum over all of them.", function linesAndQueriesI(queries) { let line = null; const answers = []; for (let i = 0; i < queries.length; i += 1) { if (queries[i][0] === 1) line = [queries[i][1], queries[i][2]]; else answers.push(line === null ? null : line[0] * queries[i][1] + line[1]); } return answers; }),
      ],
      hints: ["Make one tree of 4 · 100001 nulls before the loop.", "A [1, a, b] query calls liChaoInsert(tree, 1, 0, 100000, a, b).", "A [2, x] query pushes liChaoQuery(tree, 100001, x)."],
      cases: [
        example([[[1, 1, 2], [2, 1], [2, 3], [1, 0, 4], [2, 1], [2, 3]]], [3, 5, 4, 5], "CSES sample"),
        example([[[1, -1, 6], [2, 0], [2, 5]]], [6, 1], "a falling line"),
        example([[[1, 0, 7], [2, 100000]]], [7], "a flat line at the far end"),
        example([[[1, 1, 0], [1, -1, 0], [2, 0], [2, 4]]], [0, 4], "two lines crossing at zero"),
        hidden("n = 100 000, time limit", () => [LINE_QUERIES()]),
      ],
    },
    {
      id: "lines-and-queries-ii", title: "Lines and Queries II", cses: { id: 3430, name: "Lines and Queries II" },
      goal: "Process [1, a, b, l, r] to add the line a·x + b active only on [l, r], and [2, x] to ask for the highest active line at x. Return null for a query with nothing active there.",
      concept: "The same session as before, with the range insert doing the work. A line stored on O(log n) nodes still lies on the root-to-leaf path of exactly the x values it covers, so the query never has to know which lines were ranged.",
      functionName: "linesAndQueriesII", signature: "linesAndQueriesII(queries) → array (null where nothing is active)",
      starterSource: starter("linesAndQueriesII", "queries", "One tree over [0, 100000]; type 1 uses the range insert; type 2 queries and may answer null."),
      solve: linesAndQueriesII, comparator: "deep", dependencies: ["li-chao-insert-range", "li-chao-query"], brute: linesIIBrute, small: (round) => [randomLineQueries(13000 + round, 1 + (round % 9), 40, true)],
      reference: book("29.9", "Li Chao tree · segments"),
      presets: {
        "CSES sample": { a: [[1, 1, 2, 1, 3], [2, 3], [2, 4], [1, 0, 4, 1, 5], [2, 3], [2, 4]], segments: [[1, 3, 3, 5], [1, 4, 5, 4]] },
        "nothing active": { a: [[1, 1, 0, 0, 1], [2, 3]], segments: [[0, 0, 1, 1]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-the-range", "A ranged line must not answer outside [l, r]; a plain insert makes it win everywhere.", function linesAndQueriesII(queries) { const size = 100001; const tree = new Array(4 * size).fill(null); const answers = []; for (let i = 0; i < queries.length; i += 1) { if (queries[i][0] === 1) liChaoInsert(tree, 1, 0, size - 1, queries[i][1], queries[i][2]); else answers.push(liChaoQuery(tree, size, queries[i][1])); } return answers; }),
        diagnosis("zero-for-empty", "With no active line the answer is null, not a height of zero.", function linesAndQueriesII(queries) { const size = 100001; const tree = new Array(4 * size).fill(null); const answers = []; for (let i = 0; i < queries.length; i += 1) { if (queries[i][0] === 1) liChaoInsertRange(tree, size, queries[i][1], queries[i][2], queries[i][3], queries[i][4]); else { const best = liChaoQuery(tree, size, queries[i][1]); answers.push(best === null ? 0 : best); } } return answers; }),
      ],
      hints: ["One tree over [0, 100000], as before.", "A [1, a, b, l, r] query calls liChaoInsertRange(tree, 100001, a, b, l, r).", "A [2, x] query pushes liChaoQuery(tree, 100001, x), which is already null when the path holds no line."],
      cases: [
        example([[[1, 1, 2, 1, 3], [2, 3], [2, 4], [1, 0, 4, 1, 5], [2, 3], [2, 4]]], [5, null, 5, 4], "CSES sample"),
        example([[[1, 1, 0, 0, 1], [2, 3]]], [null], "the query is outside the range"),
        example([[[1, 0, 5, 2, 2], [2, 2], [2, 1]]], [5, null], "a line active at one point"),
        example([[[1, 1, 0, 0, 10], [1, -1, 10, 0, 10], [2, 0], [2, 10]]], [10, 10], "two lines over the same range"),
        hidden("n = 50 000, time limit", () => [RANGE_QUERIES()]),
      ],
    },
    {
      id: "coverage-add", title: "Covered Length", cses: { id: 1741, name: "Area of Rectangles (brick)" },
      goal: "Add delta to the cover count of leaves l through r and repair the tree. The tree is { ys, count, covered } where leaf i stands for the strip between ys[i] and ys[i + 1]; covered[node] is the total length of that node's range that is covered at least once. Return the tree.",
      concept: "This is the structure that makes a sweep line work: intervals are added and removed, and the total covered length is read off the root. The trick is that count is never pushed down. A node whose own count is positive is covered wholly by the intervals that stopped there, so its covered length is its full width; otherwise it is whatever its children report. Removals therefore repair themselves.",
      functionName: "coverageAdd", signature: "coverageAdd(tree, l, r, delta) → tree",
      starterSource: starter("coverageAdd", "tree, l, r, delta", "Recurse over the leaves; add delta to count on a fully covered node; afterwards set covered from count, the width, or the two children."),
      solve: coverageAdd, comparator: "deep", allowMutation: true,
      reference: book("29.8", "Sweep line algorithms · area of a union"),
      presets: {
        "cover the middle": { a: emptyCoverage([0, 1, 2, 3]), b: 1, c: 1, d: 1, segments: [[0, 1, 0, 2]] },
        "cover everything": { a: emptyCoverage([0, 1, 2, 3]), b: 0, c: 2, d: 1, segments: [[0, 0, 0, 3]] },
        "remove one": { a: coverageState([0, 1, 2, 3], [[0, 2, 1], [1, 1, 1]]), b: 1, c: 1, d: -1, segments: [[0, 0, 0, 3]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "presetC" }, { fixture: "presetD" }] },
      diagnoses: [
        diagnosis("children-always", "A node covered by its own count reports its whole width; asking the children instead loses everything the interval covered.", function coverageAdd(tree, l, r, delta) { const leaves = tree.ys.length - 1; const walk = (node, lo, hi) => { if (r < lo || hi < l) return; if (l <= lo && hi <= r) tree.count[node] += delta; else { const mid = (lo + hi) >> 1; walk(2 * node, lo, mid); walk(2 * node + 1, mid + 1, hi); } if (lo === hi) tree.covered[node] = tree.count[node] > 0 ? tree.ys[hi + 1] - tree.ys[lo] : 0; else tree.covered[node] = tree.covered[2 * node] + tree.covered[2 * node + 1]; }; if (l <= r && leaves > 0) walk(1, 0, leaves - 1); return tree; }),
        diagnosis("counts-leaves", "The covered amount is a length in the original coordinates, not a number of leaves.", function coverageAdd(tree, l, r, delta) { const leaves = tree.ys.length - 1; const walk = (node, lo, hi) => { if (r < lo || hi < l) return; if (l <= lo && hi <= r) tree.count[node] += delta; else { const mid = (lo + hi) >> 1; walk(2 * node, lo, mid); walk(2 * node + 1, mid + 1, hi); } if (tree.count[node] > 0) tree.covered[node] = hi - lo + 1; else if (lo === hi) tree.covered[node] = 0; else tree.covered[node] = tree.covered[2 * node] + tree.covered[2 * node + 1]; }; if (l <= r && leaves > 0) walk(1, 0, leaves - 1); return tree; }),
      ],
      hints: ["Recurse from node 1 over the leaves [0, ys.length − 2]; leave when the node misses [l, r].", "Add delta to count[node] when the node lies inside [l, r], otherwise recurse into both children.", "On the way back: covered[node] = ys[hi + 1] − ys[lo] when count[node] > 0, else 0 at a leaf, else the sum of the children."],
      cases: [
        run(coverageAdd, [emptyCoverage([0, 1, 2, 3]), 1, 1, 1], "cover the middle strip"),
        run(coverageAdd, [emptyCoverage([0, 1, 2, 3]), 0, 2, 1], "cover everything"),
        run(coverageAdd, [coverageState([0, 1, 2, 3], [[0, 2, 1], [1, 1, 1]]), 1, 1, -1], "remove an overlapping cover"),
        run(coverageAdd, [emptyCoverage([0, 2, 5, 9]), 0, 1, 1], "uneven strips measure length, not leaves"),
        run(coverageAdd, [coverageState([0, 2, 5, 9], [[0, 1, 1]]), 0, 1, -1], "uncover uneven strips"),
      ],
    },
    {
      id: "area-of-rectangles", title: "Area of Rectangles", cses: { id: 1741, name: "Area of Rectangles" },
      goal: "The total area covered by at least one of the rectangles.",
      concept: "Sweep a vertical line across. Between two neighbouring events the covered height never changes, so that slab contributes height times width. A rectangle turns its height range on at its left edge and off at its right edge, and the coverage tree keeps the total covered height through both.",
      functionName: "areaOfRectangles", signature: "areaOfRectangles(rectangles) → number",
      starterSource: starter("areaOfRectangles", "rectangles", "Compress the y values; events at x1 (+1) and x2 (−1); between events add covered[1] × the x gap."),
      solve: areaOfRectangles, comparator: "scalar", dependencies: ["coverage-add"], brute: areaOfRectanglesBrute, small: (round) => [randomRectangles(14000 + round, 1 + (round % 7), 12, 6)],
      reference: book("29.8", "Sweep line algorithms · area of a union"),
      presets: {
        "CSES sample": { a: [[1, 3, 4, 5], [3, 1, 7, 4], [5, 3, 8, 6]], rectangles: [[1, 3, 4, 5], [3, 1, 7, 4], [5, 3, 8, 6]] },
        "one inside another": { a: [[0, 0, 6, 6], [2, 2, 4, 4]], rectangles: [[0, 0, 6, 6], [2, 2, 4, 4]] },
        "apart": { a: [[0, 0, 2, 2], [4, 4, 6, 6]], rectangles: [[0, 0, 2, 2], [4, 4, 6, 6]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("areas-added", "Overlapping rectangles would be counted twice; the sweep exists to count each piece of the plane once.", function areaOfRectangles(rectangles) { let area = 0; for (let i = 0; i < rectangles.length; i += 1) area += (rectangles[i][2] - rectangles[i][0]) * (rectangles[i][3] - rectangles[i][1]); return area; }),
        diagnosis("slab-after-the-event", "The covered height to use for a slab is the one before the event at its right edge is applied.", function areaOfRectangles(rectangles) { const ys = []; for (let i = 0; i < rectangles.length; i += 1) ys.push(rectangles[i][1], rectangles[i][3]); ys.sort((a, b) => a - b); const unique = []; for (let i = 0; i < ys.length; i += 1) if (i === 0 || ys[i] !== ys[i - 1]) unique.push(ys[i]); const rankOf = new Map(); for (let i = 0; i < unique.length; i += 1) rankOf.set(unique[i], i); const events = []; for (let i = 0; i < rectangles.length; i += 1) { const r = rectangles[i]; events.push([r[0], 1, rankOf.get(r[1]), rankOf.get(r[3])]); events.push([r[2], -1, rankOf.get(r[1]), rankOf.get(r[3])]); } events.sort((a, b) => a[0] - b[0]); const tree = { ys: unique, count: new Array(4 * unique.length).fill(0), covered: new Array(4 * unique.length).fill(0) }; let area = 0, previous = events.length ? events[0][0] : 0; for (let i = 0; i < events.length; i += 1) { coverageAdd(tree, events[i][2], events[i][3] - 1, events[i][1]); area += tree.covered[1] * (events[i][0] - previous); previous = events[i][0]; } return area; }),
      ],
      hints: ["Collect and sort the distinct y values; leaf i is the strip between ys[i] and ys[i + 1].", "Each rectangle makes two events: +1 at x₁ and −1 at x₂, both over leaves rank(y₁) to rank(y₂) − 1.", "Walk the events by x: first add covered[1] × (this x − the previous x) to the area, then apply the event."],
      cases: [
        example([[[1, 3, 4, 5], [3, 1, 7, 4], [5, 3, 8, 6]]], 24, "CSES sample"),
        example([[[0, 0, 2, 2]]], 4, "one rectangle"),
        example([[[0, 0, 6, 6], [2, 2, 4, 4]]], 36, "one inside another"),
        example([[[0, 0, 2, 2], [4, 4, 6, 6]]], 8, "apart"),
        example([[[0, 0, 2, 2], [1, 1, 3, 3]]], 7, "an overlap"),
        example([[[-1000000, -1000000, 1000000, 1000000]]], 4000000000000, "the whole coordinate square"),
        hidden("n = 25 000 with coordinates to 10⁶, time limit", () => [RECTANGLES_BIG()]),
      ],
    },
    {
      id: "robot-path", title: "Robot Path", cses: { id: 1742, name: "Robot Path" },
      goal: "The robot starts at (0, 0) and runs the commands [direction, distance]. It stops early the moment it reaches a point it has already been to. Return the distance it travels.",
      concept: "The path is a chain of axis-parallel segments, and the robot stops at the first point of a later segment that lies on an earlier one. Whether the first k moves touch themselves only ever becomes more true as k grows, so a binary search finds the move it happens on. Testing one prefix is a sweep line: the corners between consecutive moves are the only crossings allowed, so one extra crossing, or any two parallel segments sharing a point, means the path has closed on itself. With the move known, one pass over the earlier segments finds where along it the robot stops.",
      functionName: "robotPath", signature: "robotPath(commands) → number",
      starterSource: starter("robotPath", "commands", "Merge equal directions; an immediate reversal stops at once. Binary search the first prefix that touches itself, then scan the earlier segments for the nearest touch along the last move."),
      solve: robotPath, comparator: "scalar", dependencies: ["fenwick-add", "fenwick-prefix"], brute: robotPathBrute, small: (round) => [randomCommands(15000 + round, 1 + (round % 9), 4)],
      reference: book("29.8", "Sweep line algorithms"),
      presets: {
        "CSES sample": { a: [["U", 2], ["R", 3], ["D", 1], ["L", 5], ["U", 2]], segments: [[0, 0, 0, 2], [0, 2, 3, 2], [3, 2, 3, 1], [3, 1, 0, 1]] },
        "a closing square": { a: [["U", 2], ["R", 2], ["D", 2], ["L", 2]], segments: [[0, 0, 0, 2], [0, 2, 2, 2], [2, 2, 2, 0], [2, 0, 0, 0]] },
        "an immediate turn back": { a: [["U", 2], ["D", 1]], segments: [[0, 0, 0, 2]] },
      },
      scene: { kind: "algo", view: "plane", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("corners-only", "The robot stops at the first point it reaches twice, which is usually inside a move rather than at its end.", function robotPath(commands) { const stepOf = { U: [0, 1], D: [0, -1], L: [-1, 0], R: [1, 0] }; const seen = new Set(["0,0"]); let x = 0, y = 0, distance = 0; for (let i = 0; i < commands.length; i += 1) { const d = stepOf[commands[i][0]]; x += d[0] * commands[i][1]; y += d[1] * commands[i][1]; distance += commands[i][1]; const key = x + "," + y; if (seen.has(key)) return distance; seen.add(key); } return distance; }),
        diagnosis("finishes-the-move", "The robot stops the instant it meets its old path, partway through the move, not at the end of it.", function robotPath(commands) { const stepOf = { U: [0, 1], D: [0, -1], L: [-1, 0], R: [1, 0] }; const opposite = { U: "D", D: "U", L: "R", R: "L" }; const moves = []; for (let i = 0; i < commands.length; i += 1) { const direction = commands[i][0], length = commands[i][1]; if (moves.length && moves[moves.length - 1][0] === direction) moves[moves.length - 1][1] += length; else moves.push([direction, length]); } const n = moves.length; const xs = [0], ys = [0], prefix = [0]; for (let i = 0; i < n; i += 1) { const d = stepOf[moves[i][0]]; xs.push(xs[i] + d[0] * moves[i][1]); ys.push(ys[i] + d[1] * moves[i][1]); prefix.push(prefix[i] + moves[i][1]); } let backtrack = n + 1; for (let i = 1; i < n; i += 1) if (moves[i][0] === opposite[moves[i - 1][0]]) { backtrack = i + 1; break; } const limit = Math.min(n, backtrack - 1); const horizontal = [], vertical = []; for (let i = 0; i < n; i += 1) { if (ys[i] === ys[i + 1]) horizontal.push({ index: i, lo: Math.min(xs[i], xs[i + 1]), hi: Math.max(xs[i], xs[i + 1]), line: ys[i] }); else vertical.push({ index: i, lo: Math.min(ys[i], ys[i + 1]), hi: Math.max(ys[i], ys[i + 1]), line: xs[i] }); } const groupBy = (list) => { const groups = new Map(); for (let i = 0; i < list.length; i += 1) { if (!groups.has(list[i].line)) groups.set(list[i].line, []); groups.get(list[i].line).push(list[i]); } groups.forEach((group) => group.sort((a, b) => a.lo - b.lo)); return groups; }; const horizontalGroups = groupBy(horizontal), verticalGroups = groupBy(vertical); const overlaps = (groups, k) => { let found = false; groups.forEach((group) => { if (found) return; let reach = -Infinity; for (let i = 0; i < group.length; i += 1) { if (group[i].index >= k) continue; if (group[i].lo <= reach) { found = true; return; } if (group[i].hi > reach) reach = group[i].hi; } }); return found; }; const levels = []; for (let i = 0; i < horizontal.length; i += 1) levels.push(horizontal[i].line); levels.sort((a, b) => a - b); const uniqueLevels = []; for (let i = 0; i < levels.length; i += 1) if (i === 0 || levels[i] !== levels[i - 1]) uniqueLevels.push(levels[i]); const rankOf = (y) => { let lo = 0, hi = uniqueLevels.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (uniqueLevels[mid] < y) lo = mid + 1; else hi = mid; } return lo; }; const byStart = horizontal.slice().sort((a, b) => a.lo - b.lo); const byEnd = horizontal.slice().sort((a, b) => a.hi - b.hi); const byLine = vertical.slice().sort((a, b) => a.line - b.line); const tree = new Array(uniqueLevels.length + 1).fill(0); const crossesTwice = (k) => { for (let i = 0; i <= uniqueLevels.length; i += 1) tree[i] = 0; let added = 0, removed = 0, crossings = 0; for (let i = 0; i < byLine.length; i += 1) { if (byLine[i].index >= k) continue; const x = byLine[i].line; while (added < byStart.length && byStart[added].lo <= x) { if (byStart[added].index < k) fenwickAdd(tree, rankOf(byStart[added].line) + 1, 1); added += 1; } while (removed < byEnd.length && byEnd[removed].hi < x) { if (byEnd[removed].index < k) fenwickAdd(tree, rankOf(byEnd[removed].line) + 1, -1); removed += 1; } let hi = rankOf(byLine[i].hi); if (hi < uniqueLevels.length && uniqueLevels[hi] === byLine[i].hi) hi += 1; crossings += fenwickPrefix(tree, hi) - fenwickPrefix(tree, rankOf(byLine[i].lo)); if (crossings > k - 1) return true; } return false; }; const touches = (k) => overlaps(horizontalGroups, k) || overlaps(verticalGroups, k) || crossesTwice(k); let found = 0; let lo = 1, hi = limit; while (lo <= hi) { const mid = (lo + hi) >> 1; if (touches(mid)) { found = mid; hi = mid - 1; } else lo = mid + 1; } if (found === 0) return backtrack <= n ? prefix[backtrack - 1] : prefix[n]; const i = found - 1; const ax = xs[i], ay = ys[i], bx = xs[i + 1], by = ys[i + 1]; const dx = Math.sign(bx - ax), dy = Math.sign(by - ay); const length = moves[i][1]; const horizontalI = ay === by; let best = Infinity; for (let j = 0; j < i; j += 1) { const cx = xs[j], cy = ys[j], ex = xs[j + 1], ey = ys[j + 1]; const horizontalJ = cy === ey; if (horizontalI === horizontalJ) { if (horizontalI ? cy !== ay : cx !== ax) continue; const travel = (px, py) => (dx !== 0 ? (px - ax) * dx : (py - ay) * dy); const t1 = travel(cx, cy), t2 = travel(ex, ey); const low = Math.max(0, Math.min(t1, t2)), high = Math.min(length, Math.max(t1, t2)); if (high < low || high <= 0) continue; if (low < best) best = low; } else { const qx = horizontalI ? cx : ax; const qy = horizontalI ? ay : cy; if (Math.min(ax, bx) <= qx && qx <= Math.max(ax, bx) && Math.min(ay, by) <= qy && qy <= Math.max(ay, by) && Math.min(cx, ex) <= qx && qx <= Math.max(cx, ex) && Math.min(cy, ey) <= qy && qy <= Math.max(cy, ey)) { const t = dx !== 0 ? (qx - ax) * dx : (qy - ay) * dy; if (t > 0 && t < best) best = t; } } } return prefix[found]; }),
      ],
      hints: ["Merge consecutive commands with the same direction, then note the first move that reverses the one before it: the robot stops there having gone no further.", "For the rest, binary search the shortest prefix whose segments touch anywhere but at the corners between consecutive moves; a sweep line counts crossings and a scan of each line catches parallel overlaps.", "On that move, take every earlier segment, work out where it meets the move, and keep the smallest distance greater than zero."],
      cases: [
        example([[["U", 2], ["R", 3], ["D", 1], ["L", 5], ["U", 2]]], 9, "CSES sample"),
        example([[["U", 2], ["R", 3]]], 5, "never touches"),
        example([[["U", 2], ["D", 1]]], 2, "turns straight back"),
        example([[["U", 2], ["R", 2], ["D", 2], ["L", 2]]], 8, "closes a square"),
        example([[["R", 1000000]]], 1000000, "one long move"),
        hidden("n = 20 000 spiral moves, time limit", () => [SPIRAL_BIG()]),
        hidden("n = 20 001 spiral moves then a crossing, time limit", () => [SPIRAL_CROSSING()]),
      ],
    },
  ];
  core.share({ crossSign, liChaoInsert, liChaoQuery, liChaoInsertRange, coverageAdd, convexHull });
  core.define("geometry", GEOMETRY);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

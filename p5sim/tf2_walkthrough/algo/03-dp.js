(function defineAlgoSection(core) {
  "use strict";
  const { BIG, lazy, rng, randomInts, randomGrid, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { lowerBound, upperBound, fenwickAdd, fenwickPrefix } = core.shared;

  // ------------------------------------------------------------------ 3 · dynamic programming · references
  function diceCombinations(n) {
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let sum = 1; sum <= n; sum += 1) {
      for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] = (dp[sum] + dp[sum - face]) % 1000000007;
    }
    return dp[n];
  }
  function minimizingCoins(coins, x) {
    const INF = Number.MAX_SAFE_INTEGER;
    const dp = new Array(x + 1).fill(INF);
    dp[0] = 0;
    for (let sum = 1; sum <= x; sum += 1) {
      for (let i = 0; i < coins.length; i += 1) {
        if (coins[i] <= sum && dp[sum - coins[i]] + 1 < dp[sum]) dp[sum] = dp[sum - coins[i]] + 1;
      }
    }
    return dp[x] === INF ? -1 : dp[x];
  }
  function coinCombinationsI(coins, x) {
    const dp = new Array(x + 1).fill(0);
    dp[0] = 1;
    for (let sum = 1; sum <= x; sum += 1) {
      for (let i = 0; i < coins.length; i += 1) {
        if (coins[i] <= sum) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007;
      }
    }
    return dp[x];
  }
  function coinCombinationsII(coins, x) {
    const dp = new Array(x + 1).fill(0);
    dp[0] = 1;
    for (let i = 0; i < coins.length; i += 1) {
      for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007;
    }
    return dp[x];
  }
  function removingDigits(n) {
    const dp = new Array(n + 1).fill(0);
    for (let value = 1; value <= n; value += 1) {
      let best = Infinity;
      for (let rest = value; rest > 0; rest = Math.floor(rest / 10)) {
        const digit = rest % 10;
        if (digit > 0 && dp[value - digit] + 1 < best) best = dp[value - digit] + 1;
      }
      dp[value] = best;
    }
    return dp[n];
  }
  function gridPaths(grid) {
    const n = grid.length;
    let previous = new Array(n).fill(0);
    for (let r = 0; r < n; r += 1) {
      const current = new Array(n).fill(0);
      for (let c = 0; c < n; c += 1) {
        if (grid[r][c] === "*") continue;
        if (r === 0 && c === 0) current[c] = 1;
        else current[c] = (previous[c] + (c > 0 ? current[c - 1] : 0)) % 1000000007;
      }
      previous = current;
    }
    return previous[n - 1];
  }
  function bookShop(prices, pages, x) {
    const dp = new Array(x + 1).fill(0);
    for (let i = 0; i < prices.length; i += 1) {
      for (let budget = x; budget >= prices[i]; budget -= 1) {
        const candidate = dp[budget - prices[i]] + pages[i];
        if (candidate > dp[budget]) dp[budget] = candidate;
      }
    }
    return dp[x];
  }
  function arrayDescription(values, m) {
    let previous = new Array(m + 2).fill(0);
    for (let i = 0; i < values.length; i += 1) {
      const current = new Array(m + 2).fill(0);
      for (let v = 1; v <= m; v += 1) {
        if (values[i] !== 0 && values[i] !== v) continue;
        current[v] = i === 0 ? 1 : (previous[v - 1] + previous[v] + previous[v + 1]) % 1000000007;
      }
      previous = current;
    }
    let total = 0;
    for (let v = 1; v <= m; v += 1) total = (total + previous[v]) % 1000000007;
    return total;
  }
  function countingTowers(n) {
    let split = 1, wide = 1;
    for (let height = 2; height <= n; height += 1) {
      const nextSplit = (4 * split + wide) % 1000000007;
      const nextWide = (split + 2 * wide) % 1000000007;
      split = nextSplit;
      wide = nextWide;
    }
    return (split + wide) % 1000000007;
  }
  function editDistance(a, b) {
    let previous = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j += 1) previous[j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const current = new Array(b.length + 1);
      current[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const replace = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
        current[j] = Math.min(replace, previous[j] + 1, current[j - 1] + 1);
      }
      previous = current;
    }
    return previous[b.length];
  }
  function longestCommonSubsequence(a, b) {
    const n = a.length, m = b.length;
    const dp = [];
    for (let i = 0; i <= n; i += 1) dp.push(new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i += 1) {
      for (let j = 1; j <= m; j += 1) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const out = [];
    let i = n, j = m;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { out.push(a[i - 1]); i -= 1; j -= 1; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
      else j -= 1;
    }
    return out.reverse();
  }
  function rectangleCutting(a, b) {
    const dp = [];
    for (let w = 0; w <= a; w += 1) dp.push(new Array(b + 1).fill(0));
    for (let w = 1; w <= a; w += 1) {
      for (let h = 1; h <= b; h += 1) {
        if (w === h) continue;
        let best = Infinity;
        for (let cut = 1; cut < w; cut += 1) best = Math.min(best, dp[cut][h] + dp[w - cut][h] + 1);
        for (let cut = 1; cut < h; cut += 1) best = Math.min(best, dp[w][cut] + dp[w][h - cut] + 1);
        dp[w][h] = best;
      }
    }
    return dp[a][b];
  }
  function minimalGridPath(grid) {
    const n = grid.length;
    let text = grid[0][0];
    let frontier = [0];
    for (let step = 1; step <= 2 * n - 2; step += 1) {
      let best = "Z";
      for (let f = 0; f < frontier.length; f += 1) {
        const row = frontier[f], col = step - 1 - row;
        if (row + 1 < n && grid[row + 1][col] < best) best = grid[row + 1][col];
        if (col + 1 < n && grid[row][col + 1] < best) best = grid[row][col + 1];
      }
      const next = [];
      const seen = new Array(n).fill(false);
      for (let f = 0; f < frontier.length; f += 1) {
        const row = frontier[f], col = step - 1 - row;
        if (row + 1 < n && grid[row + 1][col] === best && !seen[row + 1]) { seen[row + 1] = true; next.push(row + 1); }
        if (col + 1 < n && grid[row][col + 1] === best && !seen[row]) { seen[row] = true; next.push(row); }
      }
      frontier = next;
      text += best;
    }
    return text;
  }
  function moneySums(coins) {
    let total = 0;
    for (let i = 0; i < coins.length; i += 1) total += coins[i];
    const reachable = new Array(total + 1).fill(false);
    reachable[0] = true;
    for (let i = 0; i < coins.length; i += 1) {
      for (let sum = total; sum >= coins[i]; sum -= 1) if (reachable[sum - coins[i]]) reachable[sum] = true;
    }
    const out = [];
    for (let sum = 1; sum <= total; sum += 1) if (reachable[sum]) out.push(sum);
    return out;
  }
  function removalGame(values) {
    const n = values.length;
    const prefix = [0];
    for (let i = 0; i < n; i += 1) prefix.push(prefix[i] + values[i]);
    let best = values.slice();
    for (let length = 2; length <= n; length += 1) {
      const next = new Array(n - length + 1);
      for (let l = 0; l + length <= n; l += 1) {
        const r = l + length - 1;
        next[l] = prefix[r + 1] - prefix[l] - Math.min(best[l + 1], best[l]);
      }
      best = next;
    }
    return best[0];
  }
  function twoSetsII(n) {
    const total = n * (n + 1) / 2;
    if (total % 2 !== 0) return 0;
    const target = total / 2;
    const ways = new Array(target + 1).fill(0);
    ways[0] = 1;
    for (let value = 1; value < n; value += 1) {
      for (let sum = target; sum >= value; sum -= 1) ways[sum] = (ways[sum] + ways[sum - value]) % 1000000007;
    }
    return ways[target];
  }
  function mountainRange(heights) {
    const n = heights.length;
    const left = new Array(n), right = new Array(n);
    const stack = [];
    for (let i = 0; i < n; i += 1) {
      while (stack.length && heights[stack[stack.length - 1]] < heights[i]) stack.pop();
      left[i] = stack.length ? stack[stack.length - 1] : -1;
      stack.push(i);
    }
    stack.length = 0;
    for (let i = n - 1; i >= 0; i -= 1) {
      while (stack.length && heights[stack[stack.length - 1]] < heights[i]) stack.pop();
      right[i] = stack.length ? stack[stack.length - 1] : n;
      stack.push(i);
    }
    const order = [];
    for (let i = 0; i < n; i += 1) order.push(i);
    order.sort((p, q) => heights[p] - heights[q]);
    let size = 1;
    while (size < n) size *= 2;
    const tree = new Array(2 * size).fill(0);
    let answer = 0;
    for (let k = 0; k < n; k += 1) {
      const i = order[k];
      let lo = left[i] + 1 + size, hi = right[i] + size;
      let top = 0;
      while (lo < hi) {
        if (lo & 1) { top = Math.max(top, tree[lo]); lo += 1; }
        if (hi & 1) { hi -= 1; top = Math.max(top, tree[hi]); }
        lo >>= 1;
        hi >>= 1;
      }
      const value = top + 1;
      for (let p = i + size; p >= 1; p >>= 1) if (tree[p] < value) tree[p] = value;
      answer = Math.max(answer, value);
    }
    return answer;
  }
  function increasingSubsequence(values) {
    const tails = [];
    for (let i = 0; i < values.length; i += 1) {
      const index = lowerBound(tails, values[i]);
      if (index === tails.length) tails.push(values[i]);
      else tails[index] = values[i];
    }
    return tails.length;
  }
  function projects(list) {
    const sorted = list.slice().sort((p, q) => p[1] - q[1]);
    const ends = sorted.map((p) => p[1]);
    const best = [0];
    for (let i = 0; i < sorted.length; i += 1) {
      const before = lowerBound(ends, sorted[i][0]);
      best.push(Math.max(best[i], best[before] + sorted[i][2]));
    }
    return best[sorted.length];
  }
  function elevatorRides(weights, x) {
    const n = weights.length;
    const rides = new Array(1 << n).fill(0), last = new Array(1 << n).fill(0);
    rides[0] = 1;
    for (let mask = 1; mask < (1 << n); mask += 1) {
      rides[mask] = n + 1;
      last[mask] = 0;
      for (let p = 0; p < n; p += 1) {
        if (!(mask & (1 << p))) continue;
        const rest = mask ^ (1 << p);
        let r = rides[rest], w = last[rest] + weights[p];
        if (w > x) { r += 1; w = weights[p]; }
        if (r < rides[mask] || (r === rides[mask] && w < last[mask])) { rides[mask] = r; last[mask] = w; }
      }
    }
    return rides[(1 << n) - 1];
  }
  function countingTilings(n, m) {
    let dp = new Array(1 << n).fill(0);
    dp[0] = 1;
    for (let col = 0; col < m; col += 1) {
      for (let row = 0; row < n; row += 1) {
        const next = new Array(1 << n).fill(0);
        for (let mask = 0; mask < (1 << n); mask += 1) {
          const ways = dp[mask];
          if (ways === 0) continue;
          if (mask & 1) { next[mask >> 1] = (next[mask >> 1] + ways) % 1000000007; continue; }
          if (col + 1 < m) { const target = (mask >> 1) | (1 << (n - 1)); next[target] = (next[target] + ways) % 1000000007; }
          if (row + 1 < n && !(mask & 2)) { const target = (mask >> 1) | 1; next[target] = (next[target] + ways) % 1000000007; }
        }
        dp = next;
      }
    }
    return dp[0];
  }
  function countingNumbers(a, b) {
    const count = (text) => {
      const digits = text.split("").map(Number);
      const memo = new Map();
      const go = (pos, last, tight, started) => {
        if (pos === digits.length) return 1n;
        const key = pos * 400 + (last + 1) * 4 + (tight ? 2 : 0) + (started ? 1 : 0);
        if (memo.has(key)) return memo.get(key);
        let total = 0n;
        const top = tight ? digits[pos] : 9;
        for (let d = 0; d <= top; d += 1) {
          if (started && d === last) continue;
          const begins = started || d > 0;
          total += go(pos + 1, begins ? d : -1, tight && d === top, begins);
        }
        memo.set(key, total);
        return total;
      };
      return go(0, -1, true, false);
    };
    const lower = BigInt(a), upper = BigInt(b);
    const total = count(String(upper)) - (lower > 0n ? count(String(lower - 1n)) : 0n);
    return String(total);
  }
  function increasingSubsequenceII(values) {
    const sorted = values.slice().sort((p, q) => p - q);
    const distinct = [];
    for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) distinct.push(sorted[i]);
    const tree = new Array(distinct.length + 1).fill(0);
    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      const rank = lowerBound(distinct, values[i]) + 1;
      const ending = (1 + fenwickPrefix(tree, rank - 1)) % 1000000007;
      fenwickAdd(tree, rank, ending);
      total = (total + ending) % 1000000007;
    }
    return total;
  }

  // ------------------------------------------------------------------ brute forces and checks for the stress tests
  function removingDigitsBrute(n) {
    const dist = new Array(n + 1).fill(-1);
    dist[n] = 0;
    const queue = [n];
    for (let head = 0; head < queue.length; head += 1) {
      const value = queue[head];
      if (value === 0) return dist[0];
      const text = String(value);
      for (let i = 0; i < text.length; i += 1) {
        const digit = Number(text[i]);
        if (digit > 0 && dist[value - digit] < 0) { dist[value - digit] = dist[value] + 1; queue.push(value - digit); }
      }
    }
    return dist[0];
  }
  function arrayDescriptionBrute(values, m) {
    let count = 0;
    const go = (index, last) => {
      if (index === values.length) { count += 1; return; }
      for (let v = 1; v <= m; v += 1) {
        if (values[index] !== 0 && values[index] !== v) continue;
        if (index > 0 && Math.abs(v - last) > 1) continue;
        go(index + 1, v);
      }
    };
    go(0, 0);
    return count % 1000000007;
  }
  function countingTowersBrute(n) {
    let count = 0;
    const go = (row, below) => {
      if (row === n) { count += 1; return; }
      const splitOptions = below === "split" ? 4 : 1;
      for (let option = 0; option < splitOptions; option += 1) go(row + 1, "split");
      const wideOptions = below === "wide" ? 2 : 1;
      for (let option = 0; option < wideOptions; option += 1) go(row + 1, "wide");
    };
    go(0, null);
    return count % 1000000007;
  }
  function editDistanceBrute(a, b) {
    const go = (i, j) => {
      if (i === a.length) return b.length - j;
      if (j === b.length) return a.length - i;
      return Math.min(go(i + 1, j) + 1, go(i, j + 1) + 1, go(i + 1, j + 1) + (a[i] === b[j] ? 0 : 1));
    };
    return go(0, 0);
  }
  function lcsCheck(args, output) {
    const a = args[0], b = args[1];
    if (!Array.isArray(output)) return false;
    const isSubsequence = (needle, haystack) => {
      let at = 0;
      for (let i = 0; i < haystack.length && at < needle.length; i += 1) if (haystack[i] === needle[at]) at += 1;
      return at === needle.length;
    };
    if (!isSubsequence(output, a) || !isSubsequence(output, b)) return false;
    let best = 0;
    for (let mask = 0; mask < (1 << a.length); mask += 1) {
      const candidate = [];
      for (let i = 0; i < a.length; i += 1) if (mask & (1 << i)) candidate.push(a[i]);
      if (candidate.length > best && isSubsequence(candidate, b)) best = candidate.length;
    }
    return output.length === best;
  }
  function minimalGridPathBrute(grid) {
    const n = grid.length;
    let best = null;
    const go = (r, c, text) => {
      if (r === n - 1 && c === n - 1) { if (best === null || text < best) best = text; return; }
      if (r + 1 < n) go(r + 1, c, text + grid[r + 1][c]);
      if (c + 1 < n) go(r, c + 1, text + grid[r][c + 1]);
    };
    go(0, 0, grid[0][0]);
    return best;
  }
  function moneySumsBrute(coins) {
    const sums = new Set();
    for (let mask = 1; mask < (1 << coins.length); mask += 1) {
      let sum = 0;
      for (let i = 0; i < coins.length; i += 1) if (mask & (1 << i)) sum += coins[i];
      sums.add(sum);
    }
    return Array.from(sums).sort((p, q) => p - q);
  }
  function removalGameBrute(values) {
    const play = (l, r) => {
      if (l > r) return [0, 0];
      const afterLeft = play(l + 1, r), afterRight = play(l, r - 1);
      const takeLeft = values[l] + afterLeft[1], takeRight = values[r] + afterRight[1];
      return takeLeft >= takeRight ? [takeLeft, afterLeft[0]] : [takeRight, afterRight[0]];
    };
    return play(0, values.length - 1)[0];
  }
  function twoSetsIIBrute(n) {
    const total = n * (n + 1) / 2;
    if (total % 2 !== 0) return 0;
    let count = 0;
    for (let mask = 0; mask < (1 << n); mask += 1) {
      let sum = 0;
      for (let v = 1; v <= n; v += 1) if (mask & (1 << (v - 1))) sum += v;
      if (sum * 2 === total) count += 1;
    }
    return count / 2;
  }
  function mountainRangeBrute(heights) {
    const n = heights.length;
    const memo = new Array(n).fill(0);
    const visit = (i) => {
      if (memo[i]) return memo[i];
      let best = 1;
      for (let j = 0; j < n; j += 1) {
        if (heights[j] >= heights[i]) continue;
        let clear = true;
        for (let k = Math.min(i, j) + 1; k < Math.max(i, j); k += 1) if (heights[k] >= heights[i]) { clear = false; break; }
        if (clear) best = Math.max(best, 1 + visit(j));
      }
      memo[i] = best;
      return best;
    };
    let answer = 0;
    for (let i = 0; i < n; i += 1) answer = Math.max(answer, visit(i));
    return answer;
  }
  function lisBrute(values) {
    const n = values.length;
    const dp = new Array(n).fill(1);
    let best = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < i; j += 1) if (values[j] < values[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
      best = Math.max(best, dp[i]);
    }
    return best;
  }
  function projectsBrute(list) {
    let best = 0;
    for (let mask = 0; mask < (1 << list.length); mask += 1) {
      const chosen = [];
      for (let i = 0; i < list.length; i += 1) if (mask & (1 << i)) chosen.push(list[i]);
      chosen.sort((p, q) => p[0] - q[0]);
      let ok = true, reward = 0;
      for (let i = 0; i < chosen.length; i += 1) {
        reward += chosen[i][2];
        if (i > 0 && chosen[i][0] <= chosen[i - 1][1]) ok = false;
      }
      if (ok) best = Math.max(best, reward);
    }
    return best;
  }
  function elevatorRidesBrute(weights, x) {
    const n = weights.length;
    let best = n;
    const used = new Array(n).fill(false);
    const go = (placed, rides, load) => {
      if (placed === n) { best = Math.min(best, rides); return; }
      if (rides >= best) return;
      for (let p = 0; p < n; p += 1) {
        if (used[p]) continue;
        used[p] = true;
        if (load + weights[p] <= x) go(placed + 1, rides, load + weights[p]);
        go(placed + 1, rides + 1, weights[p]);
        used[p] = false;
      }
    };
    go(0, 0, Infinity);
    return best;
  }
  function countingTilingsBrute(n, m) {
    const filled = [];
    for (let r = 0; r < n; r += 1) filled.push(new Array(m).fill(false));
    let count = 0;
    const go = () => {
      let r = -1, c = -1;
      for (let i = 0; i < n && r < 0; i += 1) {
        for (let j = 0; j < m; j += 1) if (!filled[i][j]) { r = i; c = j; break; }
      }
      if (r < 0) { count += 1; return; }
      filled[r][c] = true;
      if (c + 1 < m && !filled[r][c + 1]) { filled[r][c + 1] = true; go(); filled[r][c + 1] = false; }
      if (r + 1 < n && !filled[r + 1][c]) { filled[r + 1][c] = true; go(); filled[r + 1][c] = false; }
      filled[r][c] = false;
    };
    go();
    return count % 1000000007;
  }
  function countingNumbersBrute(a, b) {
    let count = 0;
    for (let v = Number(a); v <= Number(b); v += 1) {
      const text = String(v);
      let ok = true;
      for (let i = 1; i < text.length; i += 1) if (text[i] === text[i - 1]) ok = false;
      if (ok) count += 1;
    }
    return String(count);
  }
  function increasingSubsequencesBrute(values) {
    let count = 0;
    for (let mask = 1; mask < (1 << values.length); mask += 1) {
      let last = -Infinity, ok = true;
      for (let i = 0; i < values.length && ok; i += 1) {
        if (!(mask & (1 << i))) continue;
        if (values[i] <= last) ok = false;
        last = values[i];
      }
      if (ok) count += 1;
    }
    return count % 1000000007;
  }

  // ------------------------------------------------------------------ generators
  function smallList(seed, count, lo, hi) { return randomInts(seed, count, lo, hi); }
  function randomLetters(seed, count, alphabet) {
    const next = rng(seed);
    let out = "";
    for (let i = 0; i < count; i += 1) out += alphabet[Math.floor(next() * alphabet.length)];
    return out;
  }
  function randomLetterGrid(seed, n, alphabet) {
    const next = rng(seed);
    const rows = [];
    for (let r = 0; r < n; r += 1) {
      let row = "";
      for (let c = 0; c < n; c += 1) row += alphabet[Math.floor(next() * alphabet.length)];
      rows.push(row);
    }
    return rows;
  }
  function smallProjects(seed, count) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const a = 1 + Math.floor(next() * 10);
      out.push([a, a + Math.floor(next() * 4), 1 + Math.floor(next() * 9)]);
    }
    return out;
  }

  const COINS_BIG = lazy(() => randomInts(21, 100, 1, 1000));
  const GRID_BIG = lazy(() => (() => { const grid = randomGrid(22, 1000, 1000, "*", "*", ".", 0.1); grid[0] = "." + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "."; return grid; })());
  const DESCRIPTION_BIG = lazy(() => { const next = rng(25); const out = new Array(100000); for (let i = 0; i < out.length; i += 1) out[i] = next() < 0.7 ? 0 : 1 + Math.floor(next() * 100); return out; });
  const LETTERS_A = lazy(() => randomLetters(26, 5000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  const LETTERS_B = lazy(() => randomLetters(27, 5000, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  const LCS_BIG = lazy(() => {
    const next = rng(28);
    const a = [], b = [];
    for (let v = 1; v <= 1000; v += 1) a.push(v);
    let fresh = 1001;
    for (let i = 0; i < a.length; i += 1) { if (next() < 0.4) { b.push(fresh); fresh += 1; } else b.push(a[i]); }
    return [a, b];
  });
  const GRID_PATH_BIG = lazy(() => randomLetterGrid(29, 1500, "AB"));
  const MOUNTAINS_BIG = lazy(() => randomInts(30, BIG, 1, 1000000000));
  const PROJECTS_BIG = lazy(() => { const next = rng(31); const out = []; for (let i = 0; i < BIG; i += 1) { const a = 1 + Math.floor(next() * 999000000); out.push([a, a + Math.floor(next() * 1000), 1 + Math.floor(next() * 1000000000)]); } return out; });
  const WEIGHTS_BIG = lazy(() => randomInts(32, 20, 1, 1000000000));
  const REMOVAL_BIG = lazy(() => randomInts(33, 3000, -1000000000, 1000000000));
  const LIS_BIG = lazy(() => randomInts(34, BIG, 1, 1000000000));
  const LIS2_BIG = lazy(() => randomInts(35, BIG, 1, 1000000000));

  const DP = [
    {
      id: "dice-combinations", track: "dp", title: "Dice Combinations", cses: { id: 1633, name: "Dice Combinations" },
      goal: "Count the ordered ways to reach sum n with dice throws of 1 to 6, modulo 10⁹ + 7.",
      concept: "The first dynamic programme: ways(n) = ways(n − 1) + … + ways(n − 6), with ways(0) = 1. Build the table upward.",
      functionName: "diceCombinations", signature: "diceCombinations(n) → number",
      starterSource: starter("diceCombinations", "n", "dp[0] = 1; dp[s] = Σ dp[s − face] for faces 1..6 that fit, each addition mod 1e9+7."),
      solve: diceCombinations, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 30 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7 or the numbers overflow.", function diceCombinations(n) { const dp = new Array(n + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= n; sum += 1) { for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] += dp[sum - face]; } return dp[n]; }),
        diagnosis("base-case-zero", "dp[0] must be 1: there is exactly one way to make sum 0, throw nothing.", function diceCombinations(n) { const dp = new Array(n + 1).fill(0); for (let sum = 1; sum <= n; sum += 1) { for (let face = 1; face <= 6 && face <= sum; face += 1) dp[sum] = (dp[sum] + dp[sum - face]) % 1000000007; } return dp[n]; }),
      ],
      hints: ["dp[0] = 1.", "For each sum from 1 to n, add dp[sum − face] for every face that fits.", "Apply the modulo after each addition."],
      cases: [
        example([3], 4, "CSES sample"),
        example([1], 1, "one"),
        example([4], 8, "four"),
        example([10], 492, "ten"),
        hidden("n = 1 000 000, time limit", () => [1000000]),
      ],
    },
    {
      id: "minimizing-coins", track: "dp", title: "Minimizing Coins", cses: { id: 1634, name: "Minimizing Coins" },
      goal: "Fewest coins that sum to x, or −1 when impossible.",
      concept: "Same table, different combine rule: a minimum instead of a sum, with 'infinity' for unreachable sums. Greedy fails here.",
      functionName: "minimizingCoins", signature: "minimizingCoins(coins, x) → number",
      starterSource: starter("minimizingCoins", "coins, x"),
      solve: minimizingCoins, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · coin problem"),
      scene: { kind: "algo", view: "coins", handles: preset("minimizing-coins", ["1 5 7", "4 3", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 11, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("greedy", "Taking the largest coin first fails: with coins 4 and 3, x = 6 needs 3 + 3.", function minimizingCoins(coins, x) { const sorted = coins.slice().sort((p, q) => q - p); let count = 0, left = x; for (let i = 0; i < sorted.length; i += 1) { while (left >= sorted[i]) { left -= sorted[i]; count += 1; } } return left === 0 ? count : -1; }),
        diagnosis("infinity-returned", "An unreachable sum must return −1, not the infinity placeholder.", function minimizingCoins(coins, x) { const INF = Number.MAX_SAFE_INTEGER; const dp = new Array(x + 1).fill(INF); dp[0] = 0; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum && dp[sum - coins[i]] + 1 < dp[sum]) dp[sum] = dp[sum - coins[i]] + 1; } } return dp[x]; }),
      ],
      hints: ["dp[0] = 0, every other dp starts as infinity.", "dp[sum] = min over coins of dp[sum − coin] + 1.", "Return −1 if dp[x] is still infinity."],
      cases: [
        example([[1, 5, 7], 11], 3, "CSES sample"),
        example([[4, 3], 6], 2, "greedy fails"),
        example([[2], 3], -1, "impossible"),
        example([[1], 0], 0, "zero"),
        hidden("100 coins, x = 200 000, time limit", () => [COINS_BIG(), BIG]),
      ],
    },
    {
      id: "coin-combinations-i", track: "dp", title: "Coin Combinations I", cses: { id: 1635, name: "Coin Combinations I" },
      goal: "Count ordered ways to make x, modulo 10⁹ + 7.",
      concept: "Outer loop over sums, inner loop over coins: every order of the same coins counts separately.",
      functionName: "coinCombinationsI", signature: "coinCombinationsI(coins, x) → number",
      starterSource: starter("coinCombinationsI", "coins, x", "for sum in 1..x: for coin: dp[sum] += dp[sum − coin]."),
      solve: coinCombinationsI, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "coins", handles: preset("coin-combinations-i", ["2 3 5", "1 2", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 9, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("unordered", "Coins as the outer loop counts each multiset once; this task counts every order.", function coinCombinationsI(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let i = 0; i < coins.length; i += 1) { for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } return dp[x]; }),
        diagnosis("no-mod", "Take the modulo after each addition.", function coinCombinationsI(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum) dp[sum] += dp[sum - coins[i]]; } } return dp[x]; }),
      ],
      hints: ["dp[0] = 1.", "Outer loop: sum from 1 to x. Inner loop: each coin that fits.", "dp[sum] += dp[sum − coin], modulo 10⁹ + 7."],
      cases: [
        example([[2, 3, 5], 9], 8, "CSES sample"),
        example([[1, 2], 3], 3, "1+1+1, 1+2, 2+1"),
        example([[2], 3], 0, "impossible"),
        example([[1], 5], 1, "single coin"),
        hidden("100 coins, x = 200 000, time limit", () => [COINS_BIG(), BIG]),
      ],
    },
    {
      id: "coin-combinations-ii", track: "dp", title: "Coin Combinations II", cses: { id: 1636, name: "Coin Combinations II" },
      goal: "Count unordered ways to make x, modulo 10⁹ + 7.",
      concept: "Swap the loops: outer over coins, inner over sums. Each coin is decided once, so 2 + 3 and 3 + 2 collapse into one way.",
      functionName: "coinCombinationsII", signature: "coinCombinationsII(coins, x) → number",
      starterSource: starter("coinCombinationsII", "coins, x", "for coin: for sum in coin..x: dp[sum] += dp[sum − coin]."),
      solve: coinCombinationsII, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "coins", handles: preset("coin-combinations-ii", ["2 3 5", "1 2", "2 only"], [{ id: "x", type: "slider", label: "x (rounded)", value: 9, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("ordered", "Sums as the outer loop counts every order; put the coin loop outside.", function coinCombinationsII(coins, x) { const dp = new Array(x + 1).fill(0); dp[0] = 1; for (let sum = 1; sum <= x; sum += 1) { for (let i = 0; i < coins.length; i += 1) { if (coins[i] <= sum) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } } return dp[x]; }),
        diagnosis("base-case-zero", "dp[0] must be 1.", function coinCombinationsII(coins, x) { const dp = new Array(x + 1).fill(0); for (let i = 0; i < coins.length; i += 1) { for (let sum = coins[i]; sum <= x; sum += 1) dp[sum] = (dp[sum] + dp[sum - coins[i]]) % 1000000007; } return dp[x]; }),
      ],
      hints: ["dp[0] = 1.", "Outer loop: each coin. Inner loop: sum from coin to x.", "dp[sum] += dp[sum − coin], modulo 10⁹ + 7."],
      cases: [
        example([[2, 3, 5], 9], 3, "CSES sample"),
        example([[1, 2], 3], 2, "{1,1,1} and {1,2}"),
        example([[2], 3], 0, "impossible"),
        example([[1], 5], 1, "single coin"),
        hidden("100 coins, x = 200 000, time limit", () => [COINS_BIG(), BIG]),
      ],
    },
    {
      id: "removing-digits", title: "Removing Digits", cses: { id: 1637, name: "Removing Digits" },
      goal: "Minimum number of steps to reach 0 when each step subtracts one of the number's digits.",
      concept: "steps(v) = 1 + min over the non-zero digits d of v of steps(v − d). Every value from 1 to n is a state; fill them upward so each smaller answer is ready when needed.",
      functionName: "removingDigits", signature: "removingDigits(n) → number",
      starterSource: starter("removingDigits", "n", "dp[0] = 0; dp[v] = 1 + min dp[v − d] over the non-zero digits d of v."),
      solve: removingDigits, comparator: "scalar", brute: removingDigitsBrute, small: (round) => [1 + (round * 37) % 500],
      reference: book("7.1", "Dynamic programming · optimal solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 27, min: 1, max: 99 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("smallest-digit", "Subtracting the smallest digit is not optimal: 27 → 20 → 18 → 10 → 9 → 0 takes five steps.", function removingDigits(n) { let steps = 0, value = n; while (value > 0) { let smallest = 9; for (let rest = value; rest > 0; rest = Math.floor(rest / 10)) { const digit = rest % 10; if (digit > 0 && digit < smallest) smallest = digit; } value -= smallest; steps += 1; } return steps; }),
        diagnosis("last-digit-only", "Every digit of the number is a legal move, not only the last one.", function removingDigits(n) { const dp = new Array(n + 1).fill(0); for (let value = 1; value <= n; value += 1) { const digit = value % 10; dp[value] = digit > 0 ? dp[value - digit] + 1 : dp[value - 1] + 1; } return dp[n]; }),
      ],
      hints: ["dp[0] = 0.", "For v from 1 to n, look at each digit d > 0 of v: candidate dp[v − d] + 1.", "dp[v] is the smallest candidate; the answer is dp[n]."],
      cases: [
        example([27], 5, "CSES sample"),
        example([1], 1, "one step"),
        example([10], 2, "10 → 9 → 0"),
        example([21], 4, "21 → 19 → 10 → 9 → 0"),
        hidden("n = 1 000 000, time limit", () => [1000000]),
      ],
    },
    {
      id: "grid-paths", track: "dp", title: "Grid Paths I", cses: { id: 1638, name: "Grid Paths I" },
      goal: "Count paths from the top-left to the bottom-right moving only right or down, avoiding traps, modulo 10⁹ + 7.",
      concept: "Each cell's count is the sum of the cell above and the cell to the left; a trap contributes zero. One row of memory is enough.",
      functionName: "gridPaths", signature: "gridPaths(grid) → number",
      starterSource: starter("gridPaths", "grid", "grid is n strings of '.' and '*'."),
      solve: gridPaths, comparator: "scalar",
      reference: book("7.3", "Paths in a grid"),
      scene: { kind: "algo", view: "grid", handles: preset("grid-paths", ["CSES sample", "open 3×3", "blocked"]), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-traps", "A trap cell must contribute zero paths.", function gridPaths(grid) { const n = grid.length; let previous = new Array(n).fill(0); for (let r = 0; r < n; r += 1) { const current = new Array(n).fill(0); for (let c = 0; c < n; c += 1) { if (r === 0 && c === 0) current[c] = 1; else current[c] = (previous[c] + (c > 0 ? current[c - 1] : 0)) % 1000000007; } previous = current; } return previous[n - 1]; }),
        diagnosis("no-mod", "Take the modulo after each addition.", function gridPaths(grid) { const n = grid.length; let previous = new Array(n).fill(0); for (let r = 0; r < n; r += 1) { const current = new Array(n).fill(0); for (let c = 0; c < n; c += 1) { if (grid[r][c] === "*") continue; if (r === 0 && c === 0) current[c] = 1; else current[c] = previous[c] + (c > 0 ? current[c - 1] : 0); } previous = current; } return previous[n - 1]; }),
      ],
      hints: ["The start cell has 1 path (unless it is a trap).", "Every other free cell: paths = above + left, modulo 10⁹ + 7.", "Traps stay 0; the answer is the bottom-right cell."],
      cases: [
        example([["....", ".*..", "...*", "*..."]], 3, "CSES sample"),
        example([["."]], 1, "single cell"),
        example([["*"]], 0, "trapped start"),
        example([["..", ".."]], 2, "two by two"),
        hidden("1000 × 1000 grid, time limit", () => [GRID_BIG()]),
      ],
    },
    {
      id: "book-shop", track: "dp", title: "Book Shop", cses: { id: 1158, name: "Book Shop" },
      goal: "Maximum pages for at most x money, each book bought at most once.",
      concept: "0/1 knapsack in one array: iterate the budget downwards so a book is never counted twice in the same pass.",
      functionName: "bookShop", signature: "bookShop(prices, pages, x) → number",
      starterSource: starter("bookShop", "prices, pages, x", "for each book: for budget from x down to price: dp[budget] = max(dp[budget], dp[budget − price] + pages)."),
      solve: bookShop, comparator: "scalar",
      reference: book("7.4", "Knapsack problems"),
      scene: { kind: "algo", view: "shop", handles: preset("book-shop", ["CSES sample", "cheap and thick", "all expensive"], [{ id: "x", type: "slider", label: "budget x (rounded)", value: 10, min: 0, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "presetB" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("unbounded", "Iterating the budget upwards lets the same book be bought many times.", function bookShop(prices, pages, x) { const dp = new Array(x + 1).fill(0); for (let i = 0; i < prices.length; i += 1) { for (let budget = prices[i]; budget <= x; budget += 1) { const candidate = dp[budget - prices[i]] + pages[i]; if (candidate > dp[budget]) dp[budget] = candidate; } } return dp[x]; }),
        diagnosis("greedy-cheapest", "Buying the cheapest books first is not optimal.", function bookShop(prices, pages, x) { const order = prices.map((price, index) => index).sort((p, q) => prices[p] - prices[q]); let left = x, total = 0; for (let i = 0; i < order.length; i += 1) { if (prices[order[i]] <= left) { left -= prices[order[i]]; total += pages[order[i]]; } } return total; }),
      ],
      hints: ["dp[budget] = best pages with that much money.", "For each book, walk the budget from x down to its price.", "dp[budget] = max(dp[budget], dp[budget − price] + pages)."],
      cases: [
        example([[4, 8, 5, 3], [5, 12, 8, 1], 10], 13, "CSES sample"),
        example([[5], [10], 4], 0, "cannot afford"),
        example([[1, 1], [3, 4], 2], 7, "buy both"),
        hidden("300 books, x = 100 000, time limit", () => [randomInts(23, 300, 1, 1000), randomInts(24, 300, 1, 1000), 100000]),
      ],
    },
    {
      id: "array-description", title: "Array Description", cses: { id: 1746, name: "Array Description" },
      goal: "Count the arrays with values 1..m and adjacent values differing by at most 1 that match the description (0 = unknown), modulo 10⁹ + 7.",
      concept: "A table over (position, value): ways[i][v] = ways[i − 1][v − 1] + ways[i − 1][v] + ways[i − 1][v + 1], but only for values the description allows at position i. Only the previous row is needed.",
      functionName: "arrayDescription", signature: "arrayDescription(values, m) → number",
      starterSource: starter("arrayDescription", "values, m", "values[i] is 0 (unknown) or a fixed value in 1..m."),
      solve: arrayDescription, comparator: "scalar", brute: arrayDescriptionBrute, small: (round) => { const next = rng(3900 + round); const m = 1 + Math.floor(next() * 4); const count = 1 + Math.floor(next() * 5); const values = []; for (let i = 0; i < count; i += 1) values.push(next() < 0.5 ? 0 : 1 + Math.floor(next() * m)); return [values, m]; },
      reference: book("7.1", "Dynamic programming · counting solutions"),
      presets: { "CSES sample": { a: [2, 0, 2] }, "all unknown": { a: [0, 0, 0, 0] }, impossible: { a: [1, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "m", type: "slider", label: "m (rounded)", value: 5, min: 1, max: 9 }]), args: [{ fixture: "presetA" }, { fixture: "roundedM" }] },
      diagnoses: [
        diagnosis("allows-zero-value", "Values run from 1 to m; 0 marks an unknown, it is not a value.", function arrayDescription(values, m) { let previous = new Array(m + 2).fill(0); for (let i = 0; i < values.length; i += 1) { const current = new Array(m + 2).fill(0); for (let v = 0; v <= m; v += 1) { if (values[i] !== 0 && values[i] !== v) continue; current[v] = i === 0 ? 1 : ((v > 0 ? previous[v - 1] : 0) + previous[v] + previous[v + 1]) % 1000000007; } previous = current; } let total = 0; for (let v = 0; v <= m; v += 1) total = (total + previous[v]) % 1000000007; return total; }),
        diagnosis("ignores-known-values", "A known value fixes that position; only unknown positions may take any value.", function arrayDescription(values, m) { let previous = new Array(m + 2).fill(0); for (let i = 0; i < values.length; i += 1) { const current = new Array(m + 2).fill(0); for (let v = 1; v <= m; v += 1) current[v] = i === 0 ? 1 : (previous[v - 1] + previous[v] + previous[v + 1]) % 1000000007; previous = current; } let total = 0; for (let v = 1; v <= m; v += 1) total = (total + previous[v]) % 1000000007; return total; }),
      ],
      hints: ["Row 0: ways[v] = 1 for every value allowed at position 0.", "Next row: for each allowed v, sum the previous row at v − 1, v and v + 1 (treat v = 0 and v = m + 1 as 0).", "Answer: the sum of the last row, modulo 10⁹ + 7."],
      cases: [
        example([[2, 0, 2], 5], 3, "CSES sample"),
        example([[0], 1], 1, "single unknown"),
        example([[0, 0], 2], 4, "two unknowns"),
        example([[1, 3], 3], 0, "impossible"),
        example([[0, 0, 0], 3], 17, "three unknowns"),
        hidden("n = 100 000, m = 100, time limit", () => [DESCRIPTION_BIG(), 100]),
      ],
    },
    {
      id: "counting-towers", title: "Counting Towers", cses: { id: 2413, name: "Counting Towers" },
      goal: "Count the towers of width 2 and height n built from blocks of width 1 or 2 and any integer height, modulo 10⁹ + 7.",
      concept: "Only the top row matters: it is either two width-1 blocks (split) or one width-2 block (wide). split(h) = 4·split(h − 1) + wide(h − 1): over a split top each column continues or starts anew, over a wide top both start. wide(h) = split(h − 1) + 2·wide(h − 1).",
      functionName: "countingTowers", signature: "countingTowers(n) → number",
      starterSource: starter("countingTowers", "n", "split = wide = 1 at height 1; step the pair up to height n; answer split + wide."),
      solve: countingTowers, comparator: "scalar", brute: countingTowersBrute, small: (round) => [1 + (round % 8)],
      reference: book("7.6", "Counting tilings"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7.", function countingTowers(n) { let split = 1, wide = 1; for (let height = 2; height <= n; height += 1) { const nextSplit = 4 * split + wide; const nextWide = split + 2 * wide; split = nextSplit; wide = nextWide; } return split + wide; }),
        diagnosis("missing-continuation", "Over a split top there are four options: each of the two columns continues or starts a new block. 3·split misses one.", function countingTowers(n) { let split = 1, wide = 1; for (let height = 2; height <= n; height += 1) { const nextSplit = (3 * split + wide) % 1000000007; const nextWide = (split + 2 * wide) % 1000000007; split = nextSplit; wide = nextWide; } return (split + wide) % 1000000007; }),
      ],
      hints: ["Two states per height: split top (two width-1 blocks) and wide top (one width-2 block); both are 1 at height 1.", "split' = 4·split + wide; wide' = split + 2·wide, each modulo 10⁹ + 7.", "Answer split + wide at height n."],
      cases: [
        example([2], 8, "CSES sample"),
        example([6], 2864, "CSES sample, n = 6"),
        example([1337], 640403945, "CSES sample, n = 1337"),
        example([1], 2, "height one"),
        hidden("n = 1 000 000, time limit", () => [1000000]),
      ],
    },
    {
      id: "edit-distance", title: "Edit Distance", cses: { id: 1639, name: "Edit Distance" },
      goal: "Minimum number of single-letter inserts, deletes and replacements that turn string a into string b.",
      concept: "distance(i, j) for the prefixes of length i and j: matching last letters cost nothing on top of distance(i − 1, j − 1); otherwise 1 + min(delete, insert, replace) = 1 + min(distance(i − 1, j), distance(i, j − 1), distance(i − 1, j − 1)). Row i only needs row i − 1.",
      functionName: "editDistance", signature: "editDistance(a, b) → number",
      starterSource: starter("editDistance", "a, b", "row[j] = j for the empty prefix of a; then for each letter of a build the next row."),
      solve: editDistance, comparator: "scalar", brute: editDistanceBrute, small: (round) => [randomLetters(4000 + round, 1 + (round % 5), "ABC"), randomLetters(4100 + round, 1 + ((round * 7) % 5), "ABC")],
      reference: book("7.5", "Edit distance"),
      presets: { "CSES sample": { a: "LOVE", b: "MOVIE" }, identical: { a: "ABC", b: "ABC" }, disjoint: { a: "AAA", b: "BB" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-replace", "Replacing a letter is one operation, not a delete plus an insert.", function editDistance(a, b) { let previous = new Array(b.length + 1); for (let j = 0; j <= b.length; j += 1) previous[j] = j; for (let i = 1; i <= a.length; i += 1) { const current = new Array(b.length + 1); current[0] = i; for (let j = 1; j <= b.length; j += 1) { current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] : Math.min(previous[j] + 1, current[j - 1] + 1); } previous = current; } return previous[b.length]; }),
        diagnosis("zero-base-row", "Turning the empty prefix into j letters costs j inserts: the first row is 0, 1, 2, … and each row starts with i.", function editDistance(a, b) { let previous = new Array(b.length + 1).fill(0); for (let i = 1; i <= a.length; i += 1) { const current = new Array(b.length + 1).fill(0); for (let j = 1; j <= b.length; j += 1) { const replace = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1); current[j] = Math.min(replace, previous[j] + 1, current[j - 1] + 1); } previous = current; } return previous[b.length]; }),
      ],
      hints: ["Row 0 is 0, 1, 2, …, m (inserts only); each later row starts with i (deletes only).", "Matching last letters: copy the diagonal. Otherwise 1 + min(up, left, diagonal).", "The answer is the last cell of the last row."],
      cases: [
        example(["LOVE", "MOVIE"], 2, "CSES sample"),
        example(["ABC", "ABC"], 0, "identical"),
        example(["AAA", "BB"], 3, "replace two, delete one"),
        example(["A", "ABCD"], 3, "three inserts"),
        hidden("two strings of 5000 letters, time limit", () => [LETTERS_A(), LETTERS_B()]),
      ],
    },
    {
      id: "longest-common-subsequence", title: "Longest Common Subsequence", cses: { id: 3403, name: "Longest Common Subsequence" },
      goal: "Return one longest common subsequence of the two arrays. CSES accepts any; this lab returns the one found by walking back from the corner of the table, stepping up (dropping a's last element) whenever that keeps the length.",
      concept: "lcs(i, j) over prefixes: equal last elements extend the diagonal by one; otherwise take the better of dropping one element from either side. Keep the whole table so the answer can be read back from the corner.",
      functionName: "longestCommonSubsequence", signature: "longestCommonSubsequence(a, b) → number[]",
      starterSource: starter("longestCommonSubsequence", "a, b", "Fill dp[i][j]; then from (n, m) walk back: match → take it; else up if dp[i−1][j] ≥ dp[i][j−1], else left."),
      solve: longestCommonSubsequence, comparator: "deep", check: lcsCheck, small: (round) => [smallList(4200 + round, 1 + (round % 7), 1, 4), smallList(4300 + round, 1 + ((round * 5) % 7), 1, 4)],
      reference: book("7.5", "Edit distance · related tables"),
      presets: { "CSES sample": { a: [3, 1, 3, 2, 7, 4, 8, 2], b: [6, 5, 1, 2, 3, 4] }, identical: { a: [1, 2, 3], b: [1, 2, 3] }, disjoint: { a: [1, 1], b: [2, 2] } },
      scene: { kind: "algo", view: "two-arrays", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("length-only", "The task asks for the subsequence itself, not only its length.", function longestCommonSubsequence(a, b) { const n = a.length, m = b.length; const dp = []; for (let i = 0; i <= n; i += 1) dp.push(new Array(m + 1).fill(0)); for (let i = 1; i <= n; i += 1) { for (let j = 1; j <= m; j += 1) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); } return dp[n][m]; }),
        diagnosis("greedy-match", "Matching each element of a with its next occurrence in b is not optimal; the table considers skipping either side.", function longestCommonSubsequence(a, b) { const out = []; let at = 0; for (let i = 0; i < a.length; i += 1) { for (let j = at; j < b.length; j += 1) { if (b[j] === a[i]) { out.push(a[i]); at = j + 1; break; } } } return out; }),
      ],
      hints: ["dp[i][j] = dp[i − 1][j − 1] + 1 when a[i − 1] === b[j − 1], else max(dp[i − 1][j], dp[i][j − 1]).", "Walk back from (n, m): on a match push the element and step diagonally.", "Otherwise step up when dp[i − 1][j] ≥ dp[i][j − 1], else step left; reverse the collected elements."],
      cases: [
        example([[3, 1, 3, 2, 7, 4, 8, 2], [6, 5, 1, 2, 3, 4]], [1, 3, 4], "CSES sample (canonical order)"),
        example([[1, 2, 3], [1, 2, 3]], [1, 2, 3], "identical"),
        example([[1, 1], [2, 2]], [], "nothing in common"),
        example([[1, 2, 3], [3, 1, 2]], [1, 2], "unique answer"),
        example([[2, 7, 1, 8, 2, 8], [7, 1, 8, 2, 8, 2]], [7, 1, 8, 2, 8], "drop the first element"),
        hidden("n = m = 1000, time limit", () => LCS_BIG()),
      ],
    },
    {
      id: "rectangle-cutting", title: "Rectangle Cutting", cses: { id: 1744, name: "Rectangle Cutting" },
      goal: "Minimum number of straight integer cuts that turn an a × b rectangle into squares.",
      concept: "cuts(w, h) = 0 when w = h; otherwise 1 + the best split, trying every horizontal and every vertical cut position. Every part is smaller, so a table over (w, h) fills in increasing size.",
      functionName: "rectangleCutting", signature: "rectangleCutting(a, b) → number",
      starterSource: starter("rectangleCutting", "a, b", "dp[w][h] = 0 if w === h, else 1 + min over cuts of dp[cut][h] + dp[w − cut][h] and dp[w][cut] + dp[w][h − cut]."),
      solve: rectangleCutting, comparator: "scalar",
      reference: book("7.1", "Dynamic programming · optimal solutions"),
      scene: { kind: "algo", view: "rectangle", handles: [{ id: "a", type: "slider", label: "a (rounded)", value: 3, min: 1, max: 12 }, { id: "b", type: "slider", label: "b (rounded)", value: 5, min: 1, max: 12 }], args: [{ fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("greedy-largest-square", "Always cutting off the largest square is not optimal: 6 × 7 needs 4 cuts, the greedy makes 6.", function rectangleCutting(a, b) { let cuts = 0, w = a, h = b; while (w !== h) { if (w > h) w -= h; else h -= w; cuts += 1; } return cuts; }),
        diagnosis("counts-pieces", "Count the cuts, not the squares: the answer is one less than the number of pieces.", function rectangleCutting(a, b) { const dp = []; for (let w = 0; w <= a; w += 1) dp.push(new Array(b + 1).fill(0)); for (let w = 1; w <= a; w += 1) { for (let h = 1; h <= b; h += 1) { if (w === h) continue; let best = Infinity; for (let cut = 1; cut < w; cut += 1) best = Math.min(best, dp[cut][h] + dp[w - cut][h] + 1); for (let cut = 1; cut < h; cut += 1) best = Math.min(best, dp[w][cut] + dp[w][h - cut] + 1); dp[w][h] = best; } } return dp[a][b] + 1; }),
      ],
      hints: ["dp[w][w] = 0.", "For w ≠ h try every cut position along both axes; each candidate is 1 + the two parts.", "Fill w and h upward so the parts are ready; answer dp[a][b]."],
      cases: [
        example([3, 5], 3, "CSES sample"),
        example([1, 1], 0, "already a square"),
        example([2, 3], 2, "two cuts"),
        example([6, 7], 4, "greedy fails"),
        example([1, 6], 5, "strip"),
        hidden("300 × 299, time limit", () => [300, 299]),
      ],
    },
    {
      id: "minimal-grid-path", title: "Minimal Grid Path", cses: { id: 3359, name: "Minimal Grid Path" },
      goal: "Lexicographically smallest string read along a path from the top-left to the bottom-right corner, moving only right or down.",
      concept: "All paths of the same length end on the same anti-diagonal. Keep every cell on the current diagonal that is reachable with the best string so far; the next letter is the smallest among their right and down neighbours, and the new frontier is every neighbour carrying it.",
      functionName: "minimalGridPath", signature: "minimalGridPath(grid) → string",
      starterSource: starter("minimalGridPath", "grid", "frontier = [row 0]; each step: best = smallest neighbour letter; new frontier = the neighbours with that letter (each row once)."),
      solve: minimalGridPath, comparator: "deep", brute: minimalGridPathBrute, small: (round) => [randomLetterGrid(4400 + round, 1 + (round % 5), round % 3 === 0 ? "ABC" : "AB")],
      reference: book("7.3", "Paths in a grid"),
      presets: { "CSES sample": { a: ["AACA", "BABC", "ABDA", "AACA"] }, "tie trap": { a: ["AAA", "ABA", "ABA"] }, single: { a: ["A"] } },
      scene: { kind: "algo", view: "letter-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("single-greedy-path", "One path that picks the smaller neighbour at each step cannot see that the other branch pays off later; keep every tied cell.", function minimalGridPath(grid) { const n = grid.length; let r = 0, c = 0, text = grid[0][0]; while (r + c < 2 * n - 2) { const down = r + 1 < n ? grid[r + 1][c] : null, right = c + 1 < n ? grid[r][c + 1] : null; if (right === null || (down !== null && down <= right)) { r += 1; text += down; } else { c += 1; text += right; } } return text; }),
        diagnosis("keeps-one-cell", "Several cells can tie for the best letter; dropping all but the first loses the paths through the others.", function minimalGridPath(grid) { const n = grid.length; let text = grid[0][0]; let frontier = [0]; for (let step = 1; step <= 2 * n - 2; step += 1) { let best = "Z"; for (let f = 0; f < frontier.length; f += 1) { const row = frontier[f], col = step - 1 - row; if (row + 1 < n && grid[row + 1][col] < best) best = grid[row + 1][col]; if (col + 1 < n && grid[row][col + 1] < best) best = grid[row][col + 1]; } let chosen = -1; for (let f = 0; f < frontier.length && chosen < 0; f += 1) { const row = frontier[f], col = step - 1 - row; if (row + 1 < n && grid[row + 1][col] === best) chosen = row + 1; else if (col + 1 < n && grid[row][col + 1] === best) chosen = row; } frontier = [chosen]; text += best; } return text; }),
      ],
      hints: ["Cells reached after s steps satisfy row + col = s; track the rows of the live cells.", "For each live cell look at its down and right neighbour; the smallest letter seen is the next character.", "The new live set is every neighbour with that letter, each row at most once."],
      cases: [
        example([["AACA", "BABC", "ABDA", "AACA"]], "AAABACA", "CSES sample"),
        example([["A"]], "A", "single cell"),
        example([["AAA", "ABA", "ABA"]], "AAAAA", "tie trap"),
        example([["BA", "AB"]], "BAB", "forced"),
        hidden("n = 1500, letters A and B, time limit", () => [GRID_PATH_BIG()]),
      ],
    },
    {
      id: "money-sums", title: "Money Sums", cses: { id: 1745, name: "Money Sums" },
      goal: "Every distinct sum some subset of the coins can make, in increasing order.",
      concept: "Subset sum as a reachability table: reachable[0] is true and each coin extends it, sweeping the sums downward so the coin is used at most once.",
      functionName: "moneySums", signature: "moneySums(coins) → number[]",
      starterSource: starter("moneySums", "coins", "reachable[0] = true; for each coin: for sum from total down to coin: reachable[sum] ||= reachable[sum − coin]."),
      solve: moneySums, comparator: "deep", brute: moneySumsBrute, small: (round) => [smallList(4500 + round, 1 + (round % 8), 1, 9)],
      reference: book("7.4", "Knapsack problems"),
      presets: { "CSES sample": { a: [4, 2, 5, 2] }, "one coin": { a: [7] }, "powers of two": { a: [1, 2, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("unbounded", "Sweeping the sums upward reuses the same coin; sweep downward.", function moneySums(coins) { let total = 0; for (let i = 0; i < coins.length; i += 1) total += coins[i]; const reachable = new Array(total + 1).fill(false); reachable[0] = true; for (let i = 0; i < coins.length; i += 1) { for (let sum = coins[i]; sum <= total; sum += 1) if (reachable[sum - coins[i]]) reachable[sum] = true; } const out = []; for (let sum = 1; sum <= total; sum += 1) if (reachable[sum]) out.push(sum); return out; }),
        diagnosis("includes-zero", "The empty subset's sum 0 is not a money sum.", function moneySums(coins) { let total = 0; for (let i = 0; i < coins.length; i += 1) total += coins[i]; const reachable = new Array(total + 1).fill(false); reachable[0] = true; for (let i = 0; i < coins.length; i += 1) { for (let sum = total; sum >= coins[i]; sum -= 1) if (reachable[sum - coins[i]]) reachable[sum] = true; } const out = []; for (let sum = 0; sum <= total; sum += 1) if (reachable[sum]) out.push(sum); return out; }),
      ],
      hints: ["total = sum of all coins; reachable has total + 1 entries, only reachable[0] true.", "For each coin, for sum from total down to coin: if reachable[sum − coin] then reachable[sum] = true.", "Collect every sum ≥ 1 that is reachable."],
      cases: [
        example([[4, 2, 5, 2]], [2, 4, 5, 6, 7, 8, 9, 11, 13], "CSES sample"),
        example([[7]], [7], "one coin"),
        example([[1, 1]], [1, 2], "two equal coins"),
        example([[1, 2, 4]], [1, 2, 3, 4, 5, 6, 7], "powers of two"),
        hidden("100 coins up to 1000, time limit", () => [randomInts(36, 100, 1, 1000)]),
      ],
    },
    {
      id: "removal-game", title: "Removal Game", cses: { id: 1097, name: "Removal Game" },
      goal: "Two players alternately take the first or the last number of the list; both play optimally for their own total. Return the first player's total.",
      concept: "Whatever segment l..r remains, the mover gets sum(l..r) minus what the opponent gets from the rest: best(l, r) = sum(l..r) − min(best(l + 1, r), best(l, r − 1)), leave the opponent the worse remainder. Intervals grow by length; one array per length is enough.",
      functionName: "removalGame", signature: "removalGame(values) → number",
      starterSource: starter("removalGame", "values", "prefix sums; best over length 1 = the values; best(l, r) = sum(l..r) − min(best(l + 1, r), best(l, r − 1))."),
      solve: removalGame, comparator: "scalar", brute: removalGameBrute, small: (round) => [smallList(4600 + round, 1 + (round % 8), -5, 9)],
      reference: book("7.1", "Dynamic programming · game states"),
      presets: { "CSES sample": { a: [4, 5, 1, 3] }, "middle for the second player": { a: [1, 9, 1] }, negatives: { a: [-3, 4, -2, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("greedy-larger-end", "Taking the larger end now can hand the opponent a better position; the table looks ahead.", function removalGame(values) { let l = 0, r = values.length - 1, first = 0, second = 0, turn = 0; while (l <= r) { const pick = values[l] >= values[r] ? values[l++] : values[r--]; if (turn === 0) first += pick; else second += pick; turn ^= 1; } return first; }),
        diagnosis("returns-difference", "That is the score difference; the first player's score is (total + difference) / 2.", function removalGame(values) { const n = values.length; let best = values.slice(); for (let length = 2; length <= n; length += 1) { const next = new Array(n - length + 1); for (let l = 0; l + length <= n; l += 1) { const r = l + length - 1; next[l] = Math.max(values[l] - best[l + 1], values[r] - best[l]); } best = next; } return best[0]; }),
      ],
      hints: ["prefix[i] = sum of the first i values, so sum(l..r) = prefix[r + 1] − prefix[l].", "best over length 1 is the value itself; build lengths 2, 3, … from the previous length.", "best(l, r) = sum(l..r) − min(best(l + 1, r), best(l, r − 1)); answer best(0, n − 1)."],
      cases: [
        example([[4, 5, 1, 3]], 8, "CSES sample"),
        example([[1, 9, 1]], 2, "the middle goes to the second player"),
        example([[7]], 7, "single value"),
        example([[-3, 4, -2, 5]], 9, "negatives"),
        hidden("n = 3000, time limit", () => [REMOVAL_BIG()]),
      ],
    },
    {
      id: "two-sets-ii", title: "Two Sets II", cses: { id: 1093, name: "Two Sets II" },
      goal: "Count the ways to split 1..n into two sets of equal sum, modulo 10⁹ + 7.",
      concept: "A subset-sum count: ways[s] = number of subsets with sum s. Counting the subsets of 1..n − 1 with sum total/2 counts each split exactly once: that subset is the set without n.",
      functionName: "twoSetsII", signature: "twoSetsII(n) → number",
      starterSource: starter("twoSetsII", "n", "total = n(n + 1)/2; odd → 0; count subsets of 1..n − 1 with sum total/2, sums swept downward."),
      solve: twoSetsII, comparator: "scalar", brute: twoSetsIIBrute, small: (round) => [1 + (round % 12)],
      reference: book("7.4", "Knapsack problems"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 7, min: 1, max: 30 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("double-counts", "Counting the subsets of 1..n with sum total/2 counts every split twice, once per side; leave n out of the choice.", function twoSetsII(n) { const total = n * (n + 1) / 2; if (total % 2 !== 0) return 0; const target = total / 2; const ways = new Array(target + 1).fill(0); ways[0] = 1; for (let value = 1; value <= n; value += 1) { for (let sum = target; sum >= value; sum -= 1) ways[sum] = (ways[sum] + ways[sum - value]) % 1000000007; } return ways[target]; }),
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7.", function twoSetsII(n) { const total = n * (n + 1) / 2; if (total % 2 !== 0) return 0; const target = total / 2; const ways = new Array(target + 1).fill(0); ways[0] = 1; for (let value = 1; value < n; value += 1) { for (let sum = target; sum >= value; sum -= 1) ways[sum] += ways[sum - value]; } return ways[target]; }),
      ],
      hints: ["total = n(n + 1)/2; if it is odd the answer is 0.", "ways[0] = 1; for value from 1 to n − 1 sweep sum from target down to value: ways[sum] += ways[sum − value].", "Answer ways[target] modulo 10⁹ + 7."],
      cases: [
        example([7], 4, "CSES sample"),
        example([3], 1, "{1,2} and {3}"),
        example([2], 0, "odd total"),
        example([8], 7, "n = 8"),
        hidden("n = 500, time limit", () => [500]),
      ],
    },
    {
      id: "mountain-range", title: "Mountain Range", cses: { id: 3314, name: "Mountain Range" },
      goal: "Maximum number of mountains on a route where each glide goes from a mountain to a lower one with nothing as high as the start in between.",
      concept: "From mountain i you can reach exactly the mountains strictly between the nearest mountain at least as high on each side (a monotonic stack, as in Nearest Smaller Values), and all of them are lower. Process mountains from lowest to highest: best(i) = 1 + max best over that range, kept in a segment tree of range maximum.",
      functionName: "mountainRange", signature: "mountainRange(heights) → number",
      starterSource: starter("mountainRange", "heights", "left/right = nearest index with height ≥ (stacks); sort indices by height; best = 1 + range max over (left, right); store best at the index."),
      solve: mountainRange, comparator: "scalar", brute: mountainRangeBrute, small: (round) => [smallList(4700 + round, 1 + (round % 8), 1, 6)],
      reference: book("9.3", "Segment tree · range maximum"),
      presets: { "CSES sample": { a: [20, 15, 17, 35, 25, 40, 12, 19, 13, 12] }, "equal peaks": { a: [3, 3, 3] }, staircase: { a: [5, 1, 4, 2, 3] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-equal-height", "A glide needs a strictly lower target with nothing as high as the start in between; stop the stacks at heights ≥, not only >.", function mountainRange(heights) { const n = heights.length; const left = new Array(n), right = new Array(n); const stack = []; for (let i = 0; i < n; i += 1) { while (stack.length && heights[stack[stack.length - 1]] <= heights[i]) stack.pop(); left[i] = stack.length ? stack[stack.length - 1] : -1; stack.push(i); } stack.length = 0; for (let i = n - 1; i >= 0; i -= 1) { while (stack.length && heights[stack[stack.length - 1]] <= heights[i]) stack.pop(); right[i] = stack.length ? stack[stack.length - 1] : n; stack.push(i); } const order = []; for (let i = 0; i < n; i += 1) order.push(i); order.sort((p, q) => heights[p] - heights[q]); let size = 1; while (size < n) size *= 2; const tree = new Array(2 * size).fill(0); let answer = 0; for (let k = 0; k < n; k += 1) { const i = order[k]; let lo = left[i] + 1 + size, hi = right[i] + size; let top = 0; while (lo < hi) { if (lo & 1) { top = Math.max(top, tree[lo]); lo += 1; } if (hi & 1) { hi -= 1; top = Math.max(top, tree[hi]); } lo >>= 1; hi >>= 1; } const value = top + 1; for (let p = i + size; p >= 1; p >>= 1) if (tree[p] < value) tree[p] = value; answer = Math.max(answer, value); } return answer; }),
        diagnosis("adjacent-only", "A glide can pass over lower mountains; only the neighbours were considered.", function mountainRange(heights) { const n = heights.length; const order = []; for (let i = 0; i < n; i += 1) order.push(i); order.sort((p, q) => heights[p] - heights[q]); const best = new Array(n).fill(0); let answer = 0; for (let k = 0; k < n; k += 1) { const i = order[k]; let top = 0; if (i > 0 && heights[i - 1] < heights[i]) top = Math.max(top, best[i - 1]); if (i + 1 < n && heights[i + 1] < heights[i]) top = Math.max(top, best[i + 1]); best[i] = top + 1; answer = Math.max(answer, best[i]); } return answer; }),
      ],
      hints: ["Two stack passes give left[i] and right[i], the nearest indices with height ≥ heights[i] (−1 and n when none).", "Sort the indices by height. For each, query the maximum best over positions left + 1 .. right − 1 (all lower, all already stored).", "best = that maximum + 1; store it at position i in a max segment tree; the answer is the largest best."],
      cases: [
        example([[20, 15, 17, 35, 25, 40, 12, 19, 13, 12]], 5, "CSES sample"),
        example([[3, 3, 3]], 1, "equal peaks"),
        example([[1, 2, 3]], 3, "descend the staircase"),
        example([[5, 1, 4, 2, 3]], 4, "glide over a valley"),
        hidden("n = 200 000, time limit", () => [MOUNTAINS_BIG()]),
      ],
    },
    {
      id: "increasing-subsequence", title: "Increasing Subsequence", cses: { id: 1145, name: "Increasing Subsequence" },
      goal: "Length of the longest strictly increasing subsequence.",
      concept: "tails[k] = the smallest possible last value of an increasing subsequence of length k + 1. Each value replaces the first tail that is ≥ it (lower bound) or extends the list; tails stays sorted, so binary search makes it O(n log n).",
      functionName: "increasingSubsequence", signature: "increasingSubsequence(values) → number",
      starterSource: starter("increasingSubsequence", "values", "tails = []; index = lowerBound(tails, v); replace or push; answer tails.length."),
      solve: increasingSubsequence, comparator: "scalar", dependencies: ["lower-bound", "upper-bound"], brute: lisBrute, small: (round) => [smallList(4800 + round, 1 + (round % 9), 1, 6)],
      reference: book("7.2", "Longest increasing subsequence"),
      presets: { "CSES sample": { a: [7, 3, 5, 3, 6, 2, 9, 8] }, "all equal": { a: [4, 4, 4] }, decreasing: { a: [5, 4, 3, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("non-strict", "Equal values do not extend an increasing subsequence; the lower bound replaces an equal tail instead of appending after it.", function increasingSubsequence(values) { const tails = []; for (let i = 0; i < values.length; i += 1) { const index = upperBound(tails, values[i]); if (index === tails.length) tails.push(values[i]); else tails[index] = values[i]; } return tails.length; }),
        diagnosis("contiguous-run", "A subsequence may skip elements; the longest increasing run is a different thing.", function increasingSubsequence(values) { let best = 0, run = 0; for (let i = 0; i < values.length; i += 1) { run = i > 0 && values[i] > values[i - 1] ? run + 1 : 1; best = Math.max(best, run); } return best; }),
      ],
      hints: ["Keep tails sorted; it starts empty.", "For each value: index = lowerBound(tails, value).", "If index === tails.length push the value, else tails[index] = value. The answer is tails.length."],
      cases: [
        example([[7, 3, 5, 3, 6, 2, 9, 8]], 4, "CSES sample"),
        example([[4, 4, 4]], 1, "all equal"),
        example([[5, 4, 3, 2]], 1, "decreasing"),
        example([[1, 3, 2, 4]], 3, "skip the 3 or the 2"),
        hidden("n = 200 000, time limit", () => [LIS_BIG()]),
      ],
    },
    {
      id: "projects", title: "Projects", cses: { id: 1140, name: "Projects" },
      goal: "Maximum total reward from projects [start, end, reward] that do not overlap; the next project may start only after the previous one has ended (end < start).",
      concept: "Sort by end day. best[i] = the best reward using the first i projects: skip project i, or take it plus best[k] where k counts the projects that end before it starts (a binary search on the sorted ends).",
      functionName: "projects", signature: "projects(list) → number",
      starterSource: starter("projects", "list", "list[i] = [a, b, p]. Sort by b; best[0] = 0; best[i + 1] = max(best[i], p + best[lowerBound(ends, a)])."),
      solve: projects, comparator: "scalar", dependencies: ["lower-bound", "upper-bound"], brute: projectsBrute, small: (round) => [smallProjects(4900 + round, 1 + (round % 8))],
      reference: book("7.4", "Knapsack problems · weighted scheduling"),
      presets: { "CSES sample": { a: [[2, 4, 4], [3, 6, 6], [6, 8, 2], [5, 7, 3]] }, "one big or two small": { a: [[1, 2, 1], [3, 4, 1], [1, 4, 5]] }, touching: { a: [[1, 3, 2], [3, 5, 2]] } },
      scene: { kind: "algo", view: "intervals", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("allows-touching", "A project ending on day b blocks one starting on day b; count only projects with end < start (lower bound, not upper bound).", function projects(list) { const sorted = list.slice().sort((p, q) => p[1] - q[1]); const ends = sorted.map((p) => p[1]); const best = [0]; for (let i = 0; i < sorted.length; i += 1) { const before = upperBound(ends, sorted[i][0]); best.push(Math.max(best[i], best[before] + sorted[i][2])); } return best[sorted.length]; }),
        diagnosis("greedy-earliest-end", "Taking every compatible project in end order maximises the count, not the reward.", function projects(list) { const sorted = list.slice().sort((p, q) => p[1] - q[1]); let reward = 0, lastEnd = -Infinity; for (let i = 0; i < sorted.length; i += 1) { if (sorted[i][0] > lastEnd) { reward += sorted[i][2]; lastEnd = sorted[i][1]; } } return reward; }),
      ],
      hints: ["Sort a copy by end day and keep the ends in an array.", "before = lowerBound(ends, start) = how many projects end strictly before this start.", "best[i + 1] = max(best[i], best[before] + reward); answer best[n]."],
      cases: [
        example([[[2, 4, 4], [3, 6, 6], [6, 8, 2], [5, 7, 3]]], 7, "CSES sample"),
        example([[[1, 2, 1], [3, 4, 1], [1, 4, 5]]], 5, "one big beats two small"),
        example([[[1, 3, 2], [3, 5, 2]]], 2, "touching projects overlap"),
        example([[[1, 1, 5]]], 5, "single day"),
        hidden("n = 200 000, time limit", () => [PROJECTS_BIG()]),
      ],
    },
    {
      id: "elevator-rides", title: "Elevator Rides", cses: { id: 1653, name: "Elevator Rides" },
      goal: "Minimum number of elevator rides for n ≤ 20 people when one ride carries at most x in total weight.",
      concept: "A state per subset of people: (rides used, weight in the last ride), the smaller pair being better. Adding person p to a subset either fits in the last ride or starts a new one. 2ⁿ states × n transitions.",
      functionName: "elevatorRides", signature: "elevatorRides(weights, x) → number",
      starterSource: starter("elevatorRides", "weights, x", "rides[0] = 1, last[0] = 0; for each mask and each p in it: from mask without p, add weights[p] or start a ride; keep the smaller (rides, last) pair."),
      solve: elevatorRides, comparator: "scalar", brute: elevatorRidesBrute, small: (round) => { const next = rng(5000 + round); const x = 5 + Math.floor(next() * 10); const count = 1 + (round % 6); const weights = []; for (let i = 0; i < count; i += 1) weights.push(1 + Math.floor(next() * x)); return [weights, x]; },
      reference: book("10.5", "Bit manipulation · dynamic programming over subsets"),
      presets: { "CSES sample": { a: [4, 8, 6, 1] }, "first fit fails": { a: [5, 5, 4, 4, 3, 3, 3, 3] }, "one each": { a: [9, 9, 9] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "x", type: "slider", label: "capacity x (rounded)", value: 10, min: 1, max: 20 }]), args: [{ fixture: "presetA" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("first-fit-decreasing", "Sorting by weight and filling the first ride with room is a heuristic: with capacity 10, weights 5 5 4 4 3 3 3 3 need 3 rides, first fit uses 4.", function elevatorRides(weights, x) { const sorted = weights.slice().sort((p, q) => q - p); const loads = []; for (let i = 0; i < sorted.length; i += 1) { let placed = false; for (let r = 0; r < loads.length && !placed; r += 1) { if (loads[r] + sorted[i] <= x) { loads[r] += sorted[i]; placed = true; } } if (!placed) loads.push(sorted[i]); } return loads.length; }),
        diagnosis("rides-only", "Two ways to reach the same subset with equal rides can leave different weights in the last ride; keep the lighter one.", function elevatorRides(weights, x) { const n = weights.length; const rides = new Array(1 << n).fill(0), last = new Array(1 << n).fill(0); rides[0] = 1; for (let mask = 1; mask < (1 << n); mask += 1) { rides[mask] = n + 1; for (let p = 0; p < n; p += 1) { if (!(mask & (1 << p))) continue; const rest = mask ^ (1 << p); let r = rides[rest], w = last[rest] + weights[p]; if (w > x) { r += 1; w = weights[p]; } if (r < rides[mask]) { rides[mask] = r; last[mask] = w; } } } return rides[(1 << n) - 1]; }),
      ],
      hints: ["Arrays rides and last of size 2ⁿ; the empty set has 1 ride with weight 0.", "For each mask and each person p in it, take the state of mask without p and add p: same ride if the weight fits, else rides + 1 and weight = weights[p].", "Keep the candidate with fewer rides, or equal rides and less weight; the answer is rides of the full mask."],
      cases: [
        example([[4, 8, 6, 1], 10], 2, "CSES sample"),
        example([[5, 5, 4, 4, 3, 3, 3, 3], 10], 3, "first fit fails"),
        example([[9, 9, 9], 10], 3, "one per ride"),
        example([[1, 1, 1], 10], 1, "all together"),
        hidden("n = 20, time limit", () => [WEIGHTS_BIG(), 1500000000]),
      ],
    },
    {
      id: "counting-tilings", title: "Counting Tilings", cses: { id: 2181, name: "Counting Tilings" },
      goal: "Count the tilings of an n × m grid (n ≤ 10) with 1 × 2 and 2 × 1 dominoes, modulo 10⁹ + 7.",
      concept: "Broken-profile DP: walk the cells column by column, top to bottom, with a bit mask saying which of the next n cells are already covered. A free cell takes a horizontal domino (marks the cell n ahead) or a vertical one (marks the next cell, only inside the column).",
      functionName: "countingTilings", signature: "countingTilings(n, m) → number",
      starterSource: starter("countingTilings", "n, m", "dp over masks; per cell: covered → shift; else horizontal → (mask >> 1) | 1 << (n − 1); vertical → (mask >> 1) | 1 when row + 1 < n and bit 1 is clear."),
      solve: countingTilings, comparator: "scalar", brute: countingTilingsBrute, small: (round) => [1 + (round % 4), 1 + ((round * 7) % 5)],
      reference: book("7.6", "Counting tilings"),
      scene: { kind: "algo", view: "rectangle", handles: [{ id: "n", type: "slider", label: "rows n (rounded)", value: 4, min: 1, max: 8 }, { id: "m", type: "slider", label: "columns m (rounded)", value: 7, min: 1, max: 12 }], args: [{ fixture: "roundedN" }, { fixture: "roundedM" }] },
      diagnoses: [
        diagnosis("no-mod", "Take every sum modulo 10⁹ + 7.", function countingTilings(n, m) { let dp = new Array(1 << n).fill(0); dp[0] = 1; for (let col = 0; col < m; col += 1) { for (let row = 0; row < n; row += 1) { const next = new Array(1 << n).fill(0); for (let mask = 0; mask < (1 << n); mask += 1) { const ways = dp[mask]; if (ways === 0) continue; if (mask & 1) { next[mask >> 1] += ways; continue; } if (col + 1 < m) next[(mask >> 1) | (1 << (n - 1))] += ways; if (row + 1 < n && !(mask & 2)) next[(mask >> 1) | 1] += ways; } dp = next; } } return dp[0]; }),
        diagnosis("horizontal-only", "Vertical dominoes are allowed too: a 2 × 2 grid has two tilings.", function countingTilings(n, m) { let dp = new Array(1 << n).fill(0); dp[0] = 1; for (let col = 0; col < m; col += 1) { for (let row = 0; row < n; row += 1) { const next = new Array(1 << n).fill(0); for (let mask = 0; mask < (1 << n); mask += 1) { const ways = dp[mask]; if (ways === 0) continue; if (mask & 1) { next[mask >> 1] = (next[mask >> 1] + ways) % 1000000007; continue; } if (col + 1 < m) { const target = (mask >> 1) | (1 << (n - 1)); next[target] = (next[target] + ways) % 1000000007; } } dp = next; } } return dp[0]; }),
      ],
      hints: ["dp has 2ⁿ entries; dp[0] = 1 before the first cell. Bit k means the cell k steps ahead (down the column, then the next column) is already covered.", "Covered cell (bit 0 set): dp'[mask >> 1] += dp[mask]. Free cell: horizontal → dp'[(mask >> 1) | 1 << (n − 1)] (needs a next column); vertical → dp'[(mask >> 1) | 1] (needs row + 1 < n and bit 1 clear).", "After all n·m cells the answer is dp[0]."],
      cases: [
        example([4, 7], 781, "CSES sample"),
        example([2, 2], 2, "two by two"),
        example([1, 4], 1, "single row"),
        example([3, 3], 0, "odd area"),
        example([2, 3], 3, "two by three"),
        hidden("10 × 1000, time limit", () => [10, 1000]),
      ],
    },
    {
      id: "counting-numbers", title: "Counting Numbers", cses: { id: 2220, name: "Counting Numbers" },
      goal: "Count the integers in [a, b] (up to 10¹⁸, given as decimal strings) in which no two adjacent digits are equal. Return the count as a decimal string.",
      concept: "Digit DP: build numbers digit by digit from the most significant one, remembering only (position, previous digit, still tight to the limit, started). count(b) − count(a − 1) gives the range; leading zeros are not digits yet, so they never clash.",
      functionName: "countingNumbers", signature: "countingNumbers(a, b) → string",
      starterSource: starter("countingNumbers", "a, b", "a and b are decimal strings. BigInt for the counts; count(limit) via go(pos, last, tight, started) with a memo."),
      solve: countingNumbers, comparator: "deep", brute: countingNumbersBrute, small: (round) => { const next = rng(5100 + round); const lo = Math.floor(next() * 300); return [String(lo), String(lo + Math.floor(next() * 1500))]; },
      reference: book("7.1", "Dynamic programming · counting solutions"),
      scene: { kind: "algo", view: "number", handles: [{ id: "a", type: "slider", label: "a (rounded)", value: 123, min: 0, max: 400 }, { id: "b", type: "slider", label: "b (rounded, at least a)", value: 321, min: 0, max: 400 }], args: [{ fixture: "roundedA" }, { fixture: "roundedBAtLeastA" }] },
      diagnoses: [
        diagnosis("leading-zero-clash", "Leading zeros are not digits: before the number starts, a 0 must not block the next 0, otherwise every number shorter than the limit is dropped.", function countingNumbers(a, b) { const count = (text) => { const digits = text.split("").map(Number); const memo = new Map(); const go = (pos, last, tight) => { if (pos === digits.length) return 1n; const key = pos * 40 + (last + 1) * 2 + (tight ? 1 : 0); if (memo.has(key)) return memo.get(key); let total = 0n; const top = tight ? digits[pos] : 9; for (let d = 0; d <= top; d += 1) { if (d === last) continue; total += go(pos + 1, d, tight && d === top); } memo.set(key, total); return total; }; return go(0, 0, true); }; const lower = BigInt(a), upper = BigInt(b); return String(count(String(upper)) - (lower > 0n ? count(String(lower - 1n)) : 0n)); }),
        diagnosis("excludes-a", "The range includes a: subtract count(a − 1), not count(a).", function countingNumbers(a, b) { const count = (text) => { const digits = text.split("").map(Number); const memo = new Map(); const go = (pos, last, tight, started) => { if (pos === digits.length) return 1n; const key = pos * 400 + (last + 1) * 4 + (tight ? 2 : 0) + (started ? 1 : 0); if (memo.has(key)) return memo.get(key); let total = 0n; const top = tight ? digits[pos] : 9; for (let d = 0; d <= top; d += 1) { if (started && d === last) continue; const begins = started || d > 0; total += go(pos + 1, begins ? d : -1, tight && d === top, begins); } memo.set(key, total); return total; }; return go(0, -1, true, false); }; return String(count(String(BigInt(b))) - count(String(BigInt(a)))); }),
      ],
      hints: ["count(limit) = numbers in [0, limit]; answer count(b) − count(a − 1), or just count(b) when a is 0.", "State: position, previous digit (−1 before the number starts), tight (the prefix equals the limit so far), started.", "At each position try d from 0 to (tight ? limit digit : 9); skip d === previous once started."],
      cases: [
        example(["123", "321"], "171", "CSES sample"),
        example(["0", "10"], "11", "zero to ten"),
        example(["11", "11"], "0", "one rejected number"),
        example(["0", "0"], "1", "zero alone"),
        hidden("0 to 10¹⁸, needs BigInt", () => ["0", "1000000000000000000"]),
      ],
    },
    {
      id: "increasing-subsequence-ii", title: "Increasing Subsequence II", cses: { id: 1748, name: "Increasing Subsequence II" },
      goal: "Count the non-empty strictly increasing subsequences, modulo 10⁹ + 7.",
      concept: "ending(i) = 1 + Σ ending(j) over earlier j with a smaller value. Compress the values to ranks and keep the sums in a Fenwick tree indexed by rank, so each prefix sum is a log-time query.",
      functionName: "increasingSubsequenceII", signature: "increasingSubsequenceII(values) → number",
      starterSource: starter("increasingSubsequenceII", "values", "ranks via sorted distinct values + lowerBound; ending = 1 + fenwickPrefix(tree, rank − 1); fenwickAdd(tree, rank, ending); total += ending."),
      solve: increasingSubsequenceII, comparator: "scalar", dependencies: ["lower-bound", "upper-bound", "fenwick-add", "fenwick-prefix"], brute: increasingSubsequencesBrute, small: (round) => [smallList(5200 + round, 1 + (round % 10), 1, 5)],
      reference: book("9.2", "Binary indexed tree"),
      presets: { "CSES sample": { a: [2, 1, 3] }, "all equal": { a: [2, 2, 2] }, increasing: { a: [1, 2, 3, 4] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("non-strict", "Equal values may not follow each other; sum the ranks strictly below (prefix up to rank − 1).", function increasingSubsequenceII(values) { const sorted = values.slice().sort((p, q) => p - q); const distinct = []; for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) distinct.push(sorted[i]); const tree = new Array(distinct.length + 1).fill(0); let total = 0; for (let i = 0; i < values.length; i += 1) { const rank = lowerBound(distinct, values[i]) + 1; const ending = (1 + fenwickPrefix(tree, rank)) % 1000000007; fenwickAdd(tree, rank, ending); total = (total + ending) % 1000000007; } return total; }),
        diagnosis("no-mod", "Take the sums modulo 10⁹ + 7; the counts grow exponentially.", function increasingSubsequenceII(values) { const sorted = values.slice().sort((p, q) => p - q); const distinct = []; for (let i = 0; i < sorted.length; i += 1) if (i === 0 || sorted[i] !== sorted[i - 1]) distinct.push(sorted[i]); const tree = new Array(distinct.length + 1).fill(0); let total = 0; for (let i = 0; i < values.length; i += 1) { const rank = lowerBound(distinct, values[i]) + 1; const ending = 1 + fenwickPrefix(tree, rank - 1); fenwickAdd(tree, rank, ending); total += ending; } return total; }),
      ],
      hints: ["distinct = sorted unique values; rank = lowerBound(distinct, v) + 1 (1-based for the Fenwick tree).", "ending = 1 + fenwickPrefix(tree, rank − 1), modulo 10⁹ + 7.", "fenwickAdd(tree, rank, ending) and add ending to the total."],
      cases: [
        example([[2, 1, 3]], 5, "CSES sample"),
        example([[2, 2, 2]], 3, "all equal"),
        example([[1, 2, 3, 4]], 15, "all subsets"),
        example([[3, 2, 1]], 3, "decreasing"),
        hidden("n = 200 000, time limit", () => [LIS2_BIG()]),
      ],
    },
  ];
  core.define("dp", DP);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

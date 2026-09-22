(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { mulMod, modPow, modInverse } = core.shared;

  // ------------------------------------------------------------------ 7 · mathematics · matrices, probability and games
  function matrixMultiply(a, b, m) {
    const rows = a.length, inner = b.length, cols = b[0].length;
    const out = [];
    for (let i = 0; i < rows; i += 1) {
      const row = new Array(cols).fill(0);
      for (let t = 0; t < inner; t += 1) {
        const value = a[i][t] % m;
        if (value === 0) continue;
        const other = b[t];
        for (let j = 0; j < cols; j += 1) row[j] = (row[j] + mulMod(value, other[j] % m, m)) % m;
      }
      out.push(row);
    }
    return out;
  }
  function matrixPower(matrix, exponent, m) {
    const size = matrix.length;
    let result = [];
    for (let i = 0; i < size; i += 1) {
      const row = new Array(size).fill(0);
      row[i] = 1 % m;
      result.push(row);
    }
    let factor = matrix.map((row) => row.slice());
    let left = BigInt(exponent);
    while (left > 0n) {
      if (left & 1n) result = matrixMultiply(result, factor, m);
      factor = matrixMultiply(factor, factor, m);
      left >>= 1n;
    }
    return result;
  }
  function fibonacciNumbers(n) {
    const p = 1000000007;
    return matrixPower([[1, 1], [1, 0]], n, p)[0][1];
  }
  function throwingDice(n) {
    const p = 1000000007;
    const step = [];
    for (let i = 0; i < 6; i += 1) {
      const row = new Array(6).fill(0);
      if (i === 0) for (let j = 0; j < 6; j += 1) row[j] = 1;
      else row[i - 1] = 1;
      step.push(row);
    }
    return matrixPower(step, n, p)[0][0];
  }
  function graphPathsI(n, k, edges) {
    const p = 1000000007;
    const base = [];
    for (let i = 0; i < n; i += 1) base.push(new Array(n).fill(0));
    for (let i = 0; i < edges.length; i += 1) base[edges[i][0] - 1][edges[i][1] - 1] += 1;
    return matrixPower(base, String(k), p)[0][n - 1];
  }
  function graphPathsII(n, k, edges) {
    const base = [];
    for (let i = 0; i < n; i += 1) base.push(new Array(n).fill(Infinity));
    for (let i = 0; i < edges.length; i += 1) {
      const a = edges[i][0] - 1, b = edges[i][1] - 1, cost = edges[i][2];
      if (cost < base[a][b]) base[a][b] = cost;
    }
    const combine = (x, y) => {
      const out = [];
      for (let i = 0; i < n; i += 1) {
        const row = new Array(n).fill(Infinity);
        for (let t = 0; t < n; t += 1) {
          const left = x[i][t];
          if (left === Infinity) continue;
          const other = y[t];
          for (let j = 0; j < n; j += 1) {
            const candidate = left + other[j];
            if (candidate < row[j]) row[j] = candidate;
          }
        }
        out.push(row);
      }
      return out;
    };
    let result = null, factor = base, left = k;
    while (left > 0) {
      if (left % 2 === 1) result = result === null ? factor : combine(result, factor);
      left = Math.floor(left / 2);
      if (left > 0) factor = combine(factor, factor);
    }
    const answer = result[0][n - 1];
    return answer === Infinity ? -1 : answer;
  }
  function systemOfLinearEquations(rows) {
    const p = 1000000007;
    const n = rows.length, m = rows[0].length - 1;
    const grid = rows.map((row) => row.slice());
    const pivotRow = new Array(m).fill(-1);
    let used = 0;
    for (let col = 0; col < m && used < n; col += 1) {
      let pivot = -1;
      for (let i = used; i < n; i += 1) if (grid[i][col] % p !== 0) { pivot = i; break; }
      if (pivot === -1) continue;
      const swap = grid[used]; grid[used] = grid[pivot]; grid[pivot] = swap;
      const inverse = modInverse(grid[used][col], p);
      for (let j = col; j <= m; j += 1) grid[used][j] = mulMod(grid[used][j] % p, inverse, p);
      for (let i = 0; i < n; i += 1) {
        if (i === used || grid[i][col] === 0) continue;
        const factor = grid[i][col];
        for (let j = col; j <= m; j += 1) grid[i][j] = (grid[i][j] - mulMod(factor, grid[used][j], p) + p) % p;
      }
      pivotRow[col] = used;
      used += 1;
    }
    for (let i = used; i < n; i += 1) {
      let allZero = true;
      for (let j = 0; j < m; j += 1) if (grid[i][j] % p !== 0) allZero = false;
      if (allZero && grid[i][m] % p !== 0) return null;
    }
    const answer = new Array(m).fill(0);
    for (let col = 0; col < m; col += 1) if (pivotRow[col] !== -1) answer[col] = grid[pivotRow[col]][m];
    return answer;
  }
  function sumOfFourSquares(values) {
    const isqrt = (x) => {
      let root = Math.floor(Math.sqrt(x));
      while (root > 0 && root * root > x) root -= 1;
      while ((root + 1) * (root + 1) <= x) root += 1;
      return root;
    };
    return values.map((n) => {
      for (let a = isqrt(n); a >= 0; a -= 1) {
        const afterA = n - a * a;
        for (let b = isqrt(afterA); b >= 0; b -= 1) {
          const afterB = afterA - b * b;
          for (let c = isqrt(afterB); c >= 0; c -= 1) {
            const rest = afterB - c * c;
            const d = isqrt(rest);
            if (d * d === rest) return [a, b, c, d];
          }
        }
      }
      return [0, 0, 0, 0];
    });
  }
  function triangleNumberSums(values) {
    let top = 1;
    for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i];
    const limit = Math.max(2, Math.ceil(Math.sqrt(8 * top + 2)));
    const composite = new Array(limit + 1).fill(false);
    const primes = [];
    for (let i = 2; i <= limit; i += 1) {
      if (composite[i]) continue;
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) composite[j] = true;
    }
    const isSquare = (x) => {
      if (x < 0) return false;
      let root = Math.floor(Math.sqrt(x));
      while (root > 0 && root * root > x) root -= 1;
      while ((root + 1) * (root + 1) <= x) root += 1;
      return root * root === x;
    };
    const sumOfTwoSquares = (x) => {
      let rest = x;
      for (let i = 0; i < primes.length; i += 1) {
        const q = primes[i];
        if (q * q > rest) break;
        if (rest % q !== 0) continue;
        let power = 0;
        while (rest % q === 0) { rest /= q; power += 1; }
        if (q % 4 === 3 && power % 2 === 1) return false;
      }
      return !(rest > 1 && rest % 4 === 3);
    };
    return values.map((n) => {
      if (isSquare(8 * n + 1)) return 1;
      if (sumOfTwoSquares(8 * n + 2)) return 2;
      return 3;
    });
  }
  function diceProbability(n, a, b) {
    const top = 6 * n;
    let ways = new Array(top + 1).fill(0);
    ways[0] = 1;
    for (let thrown = 1; thrown <= n; thrown += 1) {
      const next = new Array(top + 1).fill(0);
      for (let sum = 0; sum <= top; sum += 1) {
        const share = ways[sum];
        if (share === 0) continue;
        for (let face = 1; face <= 6; face += 1) if (sum + face <= top) next[sum + face] += share / 6;
      }
      ways = next;
    }
    let total = 0;
    for (let sum = a; sum <= Math.min(b, top); sum += 1) total += ways[sum];
    return total;
  }
  function movingRobots(k) {
    const size = 8;
    const neighbours = [];
    for (let cell = 0; cell < size * size; cell += 1) {
      const r = Math.floor(cell / size), c = cell % size;
      const list = [];
      if (r > 0) list.push(cell - size);
      if (r < size - 1) list.push(cell + size);
      if (c > 0) list.push(cell - 1);
      if (c < size - 1) list.push(cell + 1);
      neighbours.push(list);
    }
    const empty = new Array(size * size).fill(1);
    for (let start = 0; start < size * size; start += 1) {
      let chance = new Array(size * size).fill(0);
      chance[start] = 1;
      for (let step = 0; step < k; step += 1) {
        const next = new Array(size * size).fill(0);
        for (let cell = 0; cell < size * size; cell += 1) {
          const share = chance[cell];
          if (share === 0) continue;
          const list = neighbours[cell];
          const part = share / list.length;
          for (let i = 0; i < list.length; i += 1) next[list[i]] += part;
        }
        chance = next;
      }
      for (let cell = 0; cell < size * size; cell += 1) empty[cell] *= 1 - chance[cell];
    }
    let total = 0;
    for (let cell = 0; cell < size * size; cell += 1) total += empty[cell];
    return total;
  }
  function candyLottery(n, k) {
    let total = 0;
    for (let value = 1; value <= k; value += 1) {
      total += value * (Math.pow(value / k, n) - Math.pow((value - 1) / k, n));
    }
    return total;
  }
  function inversionProbability(bounds) {
    const n = bounds.length;
    let total = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const first = bounds[i], second = bounds[j];
        let count = 0;
        for (let value = 1; value <= second; value += 1) count += first - Math.min(value, first);
        total += count / (first * second);
      }
    }
    return total;
  }
  function stickGame(n, moves) {
    const winning = new Array(n + 1).fill(false);
    for (let sticks = 1; sticks <= n; sticks += 1) {
      for (let i = 0; i < moves.length; i += 1) {
        const take = moves[i];
        if (take <= sticks && !winning[sticks - take]) { winning[sticks] = true; break; }
      }
    }
    let out = "";
    for (let sticks = 1; sticks <= n; sticks += 1) out += winning[sticks] ? "W" : "L";
    return out;
  }
  function nimGameI(tests) {
    return tests.map((heaps) => {
      let total = 0;
      for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i];
      return total === 0 ? "second" : "first";
    });
  }
  function nimGameII(tests) {
    return tests.map((heaps) => {
      let total = 0;
      for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i] % 4;
      return total === 0 ? "second" : "first";
    });
  }
  function stairGame(tests) {
    return tests.map((stairs) => {
      let total = 0;
      for (let i = 1; i < stairs.length; i += 2) total ^= stairs[i];
      return total === 0 ? "second" : "first";
    });
  }
  function grundysGame(values) {
    let top = 1;
    for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i];
    const limit = Math.min(5000, Math.max(2, top));
    const grundy = new Array(limit + 1).fill(0);
    const mark = new Array(limit + 4).fill(-1);
    for (let n = 3; n <= limit; n += 1) {
      for (let a = 1; a * 2 < n; a += 1) mark[grundy[a] ^ grundy[n - a]] = n;
      let mex = 0;
      while (mark[mex] === n) mex += 1;
      grundy[n] = mex;
    }
    return values.map((n) => (n > limit ? "first" : (grundy[n] === 0 ? "second" : "first")));
  }
  function anotherGame(tests) {
    return tests.map((heaps) => {
      let odd = false;
      for (let i = 0; i < heaps.length; i += 1) if (heaps[i] % 2 === 1) odd = true;
      return odd ? "first" : "second";
    });
  }

  // ------------------------------------------------------------------ validity checks and brute forces
  const PRIME = 1000000007n;
  function systemAccept(args, actual, expected) {
    const rows = args[0];
    if (expected === null) return actual === null || "This system has no solution, so return null.";
    if (!Array.isArray(actual) || actual.length !== rows[0].length - 1) return "Return one value per variable.";
    for (let i = 0; i < actual.length; i += 1) {
      if (!Number.isInteger(actual[i]) || actual[i] < 0 || actual[i] >= 1000000007) return "Every value must be an integer in 0..10⁹ + 6.";
    }
    for (let i = 0; i < rows.length; i += 1) {
      let total = 0n;
      for (let j = 0; j < actual.length; j += 1) total += BigInt(rows[i][j]) * BigInt(actual[j]);
      if (total % PRIME !== BigInt(rows[i][actual.length]) % PRIME) return "Equation " + (i + 1) + " is not satisfied by those values.";
    }
    return true;
  }
  function fourSquaresAccept(args, actual) {
    const values = args[0];
    if (!Array.isArray(actual) || actual.length !== values.length) return "Return one quadruple per value.";
    for (let i = 0; i < values.length; i += 1) {
      const quad = actual[i];
      if (!Array.isArray(quad) || quad.length !== 4) return "Each answer is four numbers.";
      let total = 0;
      for (let k = 0; k < 4; k += 1) {
        if (!Number.isInteger(quad[k]) || quad[k] < 0) return "The four numbers must be non-negative integers.";
        total += quad[k] * quad[k];
      }
      if (total !== values[i]) return "The squares for " + values[i] + " add up to " + total + ".";
    }
    return true;
  }
  function matrixMultiplyBrute(a, b, m) {
    const big = BigInt(m);
    const rows = a.length, inner = b.length, cols = b[0].length;
    const out = [];
    for (let i = 0; i < rows; i += 1) {
      const row = [];
      for (let j = 0; j < cols; j += 1) {
        let total = 0n;
        for (let t = 0; t < inner; t += 1) total += BigInt(a[i][t]) * BigInt(b[t][j]);
        row.push(Number(total % big));
      }
      out.push(row);
    }
    return out;
  }
  function matrixPowerBrute(matrix, exponent, m) {
    const size = matrix.length;
    let result = [];
    for (let i = 0; i < size; i += 1) { const row = new Array(size).fill(0); row[i] = 1 % m; result.push(row); }
    for (let step = 0; step < Number(exponent); step += 1) result = matrixMultiplyBrute(result, matrix, m);
    return result;
  }
  function fibonacciBrute(n) {
    const count = Number(n);
    let previous = 0n, current = 1n;
    for (let i = 0; i < count; i += 1) { const next = (previous + current) % PRIME; previous = current; current = next; }
    return Number(previous % PRIME);
  }
  function throwingDiceBrute(n) {
    const count = Number(n);
    const ways = new Array(count + 1).fill(0n);
    ways[0] = 1n;
    for (let sum = 1; sum <= count; sum += 1) {
      for (let face = 1; face <= 6 && face <= sum; face += 1) ways[sum] = (ways[sum] + ways[sum - face]) % PRIME;
    }
    return Number(ways[count]);
  }
  function graphPathsIBrute(n, k, edges) {
    let counts = new Array(n + 1).fill(0n);
    counts[1] = 1n;
    for (let step = 0; step < k; step += 1) {
      const next = new Array(n + 1).fill(0n);
      for (let i = 0; i < edges.length; i += 1) next[edges[i][1]] = (next[edges[i][1]] + counts[edges[i][0]]) % PRIME;
      counts = next;
    }
    return Number(counts[n]);
  }
  function graphPathsIIBrute(n, k, edges) {
    let best = new Array(n + 1).fill(Infinity);
    best[1] = 0;
    for (let step = 0; step < k; step += 1) {
      const next = new Array(n + 1).fill(Infinity);
      for (let i = 0; i < edges.length; i += 1) {
        const from = best[edges[i][0]];
        if (from === Infinity) continue;
        const candidate = from + edges[i][2];
        if (candidate < next[edges[i][1]]) next[edges[i][1]] = candidate;
      }
      best = next;
    }
    return best[n] === Infinity ? -1 : best[n];
  }
  function triangleNumbersUpTo(n) {
    const out = [];
    for (let k = 1; k * (k + 1) / 2 <= n; k += 1) out.push(k * (k + 1) / 2);
    return out;
  }
  function triangleNumberSumsBrute(values) {
    return values.map((n) => {
      const list = triangleNumbersUpTo(n);
      for (let i = 0; i < list.length; i += 1) if (list[i] === n) return 1;
      const seen = new Set(list);
      for (let i = 0; i < list.length; i += 1) if (seen.has(n - list[i])) return 2;
      return 3;
    });
  }
  function diceProbabilityBrute(n, a, b) {
    let good = 0, total = 0;
    const walk = (thrown, sum) => {
      if (thrown === n) { total += 1; if (sum >= a && sum <= b) good += 1; return; }
      for (let face = 1; face <= 6; face += 1) walk(thrown + 1, sum + face);
    };
    walk(0, 0);
    return good / total;
  }
  function movingRobotsBrute(k) {
    const size = 8;
    const moveOf = (cell) => {
      const r = Math.floor(cell / size), c = cell % size;
      const list = [];
      if (r > 0) list.push(cell - size);
      if (r < size - 1) list.push(cell + size);
      if (c > 0) list.push(cell - 1);
      if (c < size - 1) list.push(cell + 1);
      return list;
    };
    const empty = new Array(size * size).fill(1);
    for (let start = 0; start < size * size; start += 1) {
      const chance = new Array(size * size).fill(0);
      const walk = (cell, step, probability) => {
        if (step === k) { chance[cell] += probability; return; }
        const list = moveOf(cell);
        for (let i = 0; i < list.length; i += 1) walk(list[i], step + 1, probability / list.length);
      };
      walk(start, 0, 1);
      for (let cell = 0; cell < size * size; cell += 1) empty[cell] *= 1 - chance[cell];
    }
    let total = 0;
    for (let cell = 0; cell < size * size; cell += 1) total += empty[cell];
    return total;
  }
  function candyLotteryBrute(n, k) {
    let total = 0, outcomes = 0;
    const walk = (child, best) => {
      if (child === n) { outcomes += 1; total += best; return; }
      for (let value = 1; value <= k; value += 1) walk(child + 1, Math.max(best, value));
    };
    walk(0, 0);
    return total / outcomes;
  }
  function inversionProbabilityBrute(bounds) {
    const n = bounds.length;
    let total = 0, outcomes = 0;
    const current = new Array(n).fill(0);
    const walk = (index) => {
      if (index === n) {
        outcomes += 1;
        for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (current[i] > current[j]) total += 1;
        return;
      }
      for (let value = 1; value <= bounds[index]; value += 1) { current[index] = value; walk(index + 1); }
    };
    walk(0);
    return total / outcomes;
  }
  function stickGameBrute(n, moves) {
    const memo = new Array(n + 1).fill(-1);
    memo[0] = 0;
    for (let sticks = 1; sticks <= n; sticks += 1) {
      let result = 0;
      for (let i = 0; i < moves.length && result === 0; i += 1) if (moves[i] <= sticks && memo[sticks - moves[i]] === 0) result = 1;
      memo[sticks] = result;
    }
    let out = "";
    for (let sticks = 1; sticks <= n; sticks += 1) out += memo[sticks] ? "W" : "L";
    return out;
  }
  function searchWinner(state, movesOf) {
    const memo = new Map();
    const win = (current) => {
      const key = current.join(",");
      if (memo.has(key)) return memo.get(key);
      const options = movesOf(current);
      let result = false;
      for (let i = 0; i < options.length && !result; i += 1) if (!win(options[i])) result = true;
      memo.set(key, result);
      return result;
    };
    return win(state) ? "first" : "second";
  }
  function tidy(heaps) { return heaps.filter((v) => v > 0).sort((p, q) => p - q); }
  function nimGameIBrute(tests) {
    return tests.map((heaps) => searchWinner(tidy(heaps), (state) => {
      const out = [];
      for (let i = 0; i < state.length; i += 1) {
        for (let take = 1; take <= state[i]; take += 1) {
          const next = state.slice();
          next[i] -= take;
          out.push(tidy(next));
        }
      }
      return out;
    }));
  }
  function nimGameIIBrute(tests) {
    return tests.map((heaps) => searchWinner(tidy(heaps), (state) => {
      const out = [];
      for (let i = 0; i < state.length; i += 1) {
        for (let take = 1; take <= 3 && take <= state[i]; take += 1) {
          const next = state.slice();
          next[i] -= take;
          out.push(tidy(next));
        }
      }
      return out;
    }));
  }
  function stairGameBrute(tests) {
    return tests.map((stairs) => searchWinner(stairs.slice(), (state) => {
      const out = [];
      for (let k = 1; k < state.length; k += 1) {
        for (let move = 1; move <= state[k]; move += 1) {
          const next = state.slice();
          next[k] -= move;
          next[k - 1] += move;
          out.push(next);
        }
      }
      return out;
    }));
  }
  function anotherGameBrute(tests) {
    return tests.map((heaps) => searchWinner(tidy(heaps), (state) => {
      const out = [];
      for (let mask = 1; mask < (1 << state.length); mask += 1) {
        const next = state.slice();
        for (let i = 0; i < state.length; i += 1) if (mask & (1 << i)) next[i] -= 1;
        out.push(tidy(next));
      }
      return out;
    }));
  }
  function grundysGameBrute(values) {
    return values.map((n) => searchWinner([n], (state) => {
      const out = [];
      for (let i = 0; i < state.length; i += 1) {
        for (let part = 1; part * 2 < state[i]; part += 1) {
          const next = state.slice();
          next.splice(i, 1, part, state[i] - part);
          out.push(next.slice().sort((p, q) => p - q));
        }
      }
      return out;
    }));
  }

  // ------------------------------------------------------------------ generators
  function smallMatrix(seed, size, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < size; i += 1) {
      const row = [];
      for (let j = 0; j < size; j += 1) row.push(Math.floor(next() * top));
      out.push(row);
    }
    return out;
  }
  function smallDigraph(seed, n, m, weighted) {
    const next = rng(seed);
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < m && guard < 40 * m + 40) {
      guard += 1;
      const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n);
      if (a === b) continue;
      const key = a + "," + b;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(weighted ? [a, b, 1 + Math.floor(next() * 9)] : [a, b]);
    }
    return out;
  }
  function smallSystem(seed, n, m) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const row = [];
      for (let j = 0; j <= m; j += 1) row.push(Math.floor(next() * 5));
      out.push(row);
    }
    return out;
  }
  function smallHeaps(seed, tests, heaps, top) {
    const next = rng(seed);
    const out = [];
    for (let t = 0; t < tests; t += 1) {
      const list = [];
      const count = 1 + Math.floor(next() * heaps);
      for (let i = 0; i < count; i += 1) list.push(1 + Math.floor(next() * top));
      out.push(list);
    }
    return out;
  }
  function bigHeaps(seed, tests, heaps, top) {
    const next = rng(seed);
    const out = [];
    for (let t = 0; t < tests; t += 1) {
      const list = [];
      for (let i = 0; i < heaps; i += 1) list.push(1 + Math.floor(next() * top));
      out.push(list);
    }
    return out;
  }
  function denseDigraph(seed, n, m, weighted, top) {
    const a = randomInts(seed, m, 1, n), b = randomInts(seed + 1, m, 1, n), w = randomInts(seed + 2, m, 1, top || 1000);
    const out = [];
    for (let i = 0; i < m; i += 1) {
      let from = a[i], to = b[i];
      if (from === to) to = to % n + 1;
      out.push(weighted ? [from, to, w[i]] : [from, to]);
    }
    for (let v = 1; v < n; v += 1) out.push(weighted ? [v, v + 1, 1] : [v, v + 1]);
    return out;
  }
  function bigSystem(seed, n, m) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const row = [];
      for (let j = 0; j <= m; j += 1) row.push(Math.floor(next() * 1000000007));
      out.push(row);
    }
    return out;
  }
  const DICE_MATRIX = () => { const step = []; for (let i = 0; i < 6; i += 1) { const row = new Array(6).fill(0); if (i === 0) for (let j = 0; j < 6; j += 1) row[j] = 1; else row[i - 1] = 1; step.push(row); } return step; };
  const PATHS_GRAPH = lazy(() => denseDigraph(501, 50, 1000, false));
  const PATHS_WEIGHTED = lazy(() => denseDigraph(504, 50, 1000, true, 1000));
  const BIG_SYSTEM = lazy(() => bigSystem(507, 120, 120));
  const FOUR_SQUARE_VALUES = lazy(() => randomInts(508, 10, 900000, 1000000));
  const TRIANGLE_VALUES = lazy(() => randomInts(509, 20, 1, 1000000000000));
  const NIM_TESTS = lazy(() => bigHeaps(510, 100, 2000, 1000000000));
  const STAIR_TESTS = lazy(() => bigHeaps(511, 100, 2000, 1000000000));
  const GRUNDY_VALUES = lazy(() => randomInts(512, 100000, 1, 1000000));
  const STICK_MOVES = lazy(() => { const out = [1]; for (let i = 2; i <= 50; i += 1) out.push(i * 3); return out; });

  const FIB_MATRIX = [[1, 1], [1, 0]];
  const SAMPLE_PATHS = [[1, 2], [2, 3], [3, 1], [3, 2]];
  const SAMPLE_WEIGHTED = [[1, 2, 5], [2, 3, 4], [3, 1, 1], [3, 2, 2]];

  const MATH_II = [
    {
      id: "matrix-multiply", title: "Matrix Product", cses: { id: 1722, name: "Fibonacci Numbers (brick)" },
      goal: "The product of two matrices with every entry taken modulo m.",
      concept: "Entry (i, j) of the product is the dot product of row i and column j. Each term is a product of two residues near 10⁹, so it needs the split multiplication; skipping a zero row entry saves the whole inner sweep.",
      functionName: "matrixMultiply", signature: "matrixMultiply(a, b, m) → matrix",
      starterSource: starter("matrixMultiply", "a, b, m", "For each row i and each shared index t, add mulMod(a[i][t], b[t][j], m) into row[j] for every column j."),
      solve: matrixMultiply, comparator: "deep", dependencies: ["mul-mod"], brute: matrixMultiplyBrute, small: (round) => { const size = 1 + (round % 4); return [smallMatrix(600 + round, size, 1000000007), smallMatrix(610 + round, size, 1000000007), 1000000007]; },
      reference: book("23.1", "Matrix operations"),
      presets: { "two by two": { a: [[1, 1], [1, 0]], b: [[1, 1], [1, 0]] }, identity: { a: [[1, 0], [0, 1]], b: [[7, 8], [9, 10]] } },
      scene: { kind: "algo", view: "number-grid", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }, 1000000007] },
      diagnoses: [
        diagnosis("plain-product", "Two residues near 10⁹ multiply past 2⁵³, so each term needs mulMod.", function matrixMultiply(a, b, m) { const rows = a.length, inner = b.length, cols = b[0].length; const out = []; for (let i = 0; i < rows; i += 1) { const row = new Array(cols).fill(0); for (let t = 0; t < inner; t += 1) { for (let j = 0; j < cols; j += 1) row[j] = (row[j] + a[i][t] * b[t][j]) % m; } out.push(row); } return out; }),
        diagnosis("indices-swapped", "Entry (i, j) pairs row i of the left matrix with column j of the right one.", function matrixMultiply(a, b, m) { const rows = a.length, inner = b.length, cols = b[0].length; const out = []; for (let i = 0; i < rows; i += 1) { const row = new Array(cols).fill(0); for (let t = 0; t < inner; t += 1) { const value = a[t][i] % m; for (let j = 0; j < cols; j += 1) row[j] = (row[j] + mulMod(value, b[j][t] % m, m)) % m; } out.push(row); } return out; }),
      ],
      hints: ["The result has a.length rows and b[0].length columns.", "Loop i, then the shared index t, then j, so each a[i][t] is read once.", "row[j] = (row[j] + mulMod(a[i][t], b[t][j], m)) % m."],
      cases: [
        example([[[1, 1], [1, 0]], [[1, 1], [1, 0]], 1000000007], [[2, 1], [1, 1]], "the Fibonacci step squared"),
        example([[[1, 0], [0, 1]], [[7, 8], [9, 10]], 1000000007], [[7, 8], [9, 10]], "the identity"),
        example([[[2]], [[3]], 5], [[1]], "one by one with a small modulus"),
        example([[[1000000006, 1000000006], [1000000006, 1000000006]], [[1000000006, 1000000006], [1000000006, 1000000006]], 1000000007], [[2, 2], [2, 2]], "every entry is −1"),
      ],
    },
    {
      id: "matrix-power", title: "Matrix Power", cses: { id: 1722, name: "Fibonacci Numbers (brick)" },
      goal: "A square matrix raised to a power, modulo m. The exponent arrives as a decimal string, because it can reach 10¹⁸.",
      concept: "Square and multiply again, now on matrices: the identity is the starting value and each bit of the exponent either folds in the current square or not. A power of 10¹⁸ costs about sixty matrix products.",
      functionName: "matrixPower", signature: "matrixPower(matrix, exponent, m) → matrix",
      starterSource: starter("matrixPower", "matrix, exponent, m", "result = identity; left = BigInt(exponent); while left > 0n: odd bit folds in the factor, then square the factor and shift left right by one."),
      solve: matrixPower, comparator: "deep", dependencies: ["matrix-multiply"], brute: matrixPowerBrute, small: (round) => { const size = 1 + (round % 3); return [smallMatrix(620 + round, size, 1000), String(round % 12), 1000000007]; },
      reference: book("23.2", "Linear recurrences"),
      presets: { "Fibonacci step": { a: FIB_MATRIX }, "two by two": { a: [[2, 1], [1, 3]] } },
      scene: { kind: "algo", view: "number-grid", handles: preset([{ id: "k", type: "slider", label: "exponent (rounded)", value: 5, min: 0, max: 30 }]), args: [{ fixture: "presetA" }, { fixture: "roundedKString" }, 1000000007] },
      diagnoses: [
        diagnosis("starts-from-the-matrix", "The empty product is the identity; starting from the matrix itself gives one factor too many.", function matrixPower(matrix, exponent, m) { let result = matrix.map((row) => row.slice()); let factor = matrix.map((row) => row.slice()); let left = BigInt(exponent); while (left > 0n) { if (left & 1n) result = matrixMultiply(result, factor, m); factor = matrixMultiply(factor, factor, m); left >>= 1n; } return result; }),
        diagnosis("number-exponent", "An exponent of 10¹⁸ cannot be held exactly by a double, so its low bits are lost; read it with BigInt.", function matrixPower(matrix, exponent, m) { const size = matrix.length; let result = []; for (let i = 0; i < size; i += 1) { const row = new Array(size).fill(0); row[i] = 1 % m; result.push(row); } let factor = matrix.map((row) => row.slice()); let left = Number(exponent); while (left > 0) { if (left % 2 === 1) result = matrixMultiply(result, factor, m); factor = matrixMultiply(factor, factor, m); left = Math.floor(left / 2); } return result; }),
      ],
      hints: ["Build the identity of the same size, with 1 % m on the diagonal.", "left = BigInt(exponent); test a bit with left & 1n and shift with left >>= 1n.", "Fold the factor into the result on a set bit, and square the factor on every pass."],
      cases: [
        example([FIB_MATRIX, "1", 1000000007], [[1, 1], [1, 0]], "the first power"),
        example([FIB_MATRIX, "0", 1000000007], [[1, 0], [0, 1]], "the zeroth power is the identity"),
        example([FIB_MATRIX, "10", 1000000007], [[89, 55], [55, 34]], "ten steps of Fibonacci"),
        run(matrixPower, [FIB_MATRIX, "999999999999999999", 1000000007], "an odd exponent past 2⁵³"),
        hidden("a six by six matrix to the power 10¹⁸, time limit", () => [DICE_MATRIX(), "1000000000000000000", 1000000007]),
      ],
    },
    {
      id: "fibonacci-numbers", title: "Fibonacci Numbers", cses: { id: 1722, name: "Fibonacci Numbers" },
      goal: "F(n) modulo 10⁹ + 7 for n up to 10¹⁸, with n given as a decimal string.",
      concept: "One step of the recurrence is a matrix: [[1,1],[1,0]] turns (F(k), F(k−1)) into (F(k+1), F(k)). So n steps is that matrix to the n, and squaring gets there in sixty products. Its top-right entry is F(n).",
      functionName: "fibonacciNumbers", signature: "fibonacciNumbers(n) → number",
      starterSource: starter("fibonacciNumbers", "n", "return matrixPower([[1, 1], [1, 0]], n, 1000000007)[0][1]"),
      solve: fibonacciNumbers, comparator: "scalar", dependencies: ["matrix-power"], brute: fibonacciBrute, small: (round) => [String(round * 7 % 200)],
      reference: book("23.2", "Linear recurrences"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 10, min: 0, max: 90 }], args: [{ fixture: "roundedNString" }] },
      diagnoses: [
        diagnosis("wrong-entry", "The power holds F(n+1) and F(n) around the diagonal; F(n) is the top-right entry, not the top-left.", function fibonacciNumbers(n) { const p = 1000000007; return matrixPower([[1, 1], [1, 0]], n, p)[0][0]; }),
        diagnosis("loops-once-per-step", "A loop that adds one Fibonacci number at a time needs 10¹⁸ passes.", function fibonacciNumbers(n) { const p = 1000000007; const count = Math.min(Number(n), 100000); let previous = 0, current = 1; for (let i = 0; i < count; i += 1) { const next = (previous + current) % p; previous = current; current = next; } return previous; }),
      ],
      hints: ["[[1,1],[1,0]] to the power n has F(n+1), F(n), F(n), F(n−1) reading across.", "Pass n straight to matrixPower, which takes the exponent as a string.", "Return entry [0][1]."],
      cases: [
        example(["10"], 55, "CSES sample"),
        example(["0"], 0, "F(0)"),
        example(["1"], 1, "F(1)"),
        run(fibonacciNumbers, ["1000000000000000000"], "n = 10¹⁸"),
        hidden("n = 10¹⁸ − 1, time limit", () => ["999999999999999999"]),
      ],
    },
    {
      id: "throwing-dice", title: "Throwing Dice", cses: { id: 1096, name: "Throwing Dice" },
      goal: "How many ordered sequences of dice throws add up to n, modulo 10⁹ + 7, for n up to 10¹⁸.",
      concept: "ways(n) = ways(n−1) + … + ways(n−6), the same shape as Fibonacci with six terms. The step matrix keeps the last six counts: its first row sums them and the rest shift them down, so the answer is one matrix power away.",
      functionName: "throwingDice", signature: "throwingDice(n) → number",
      starterSource: starter("throwingDice", "n", "A 6 × 6 step matrix: first row all ones, and row i keeps row i − 1. Answer is matrixPower(step, n, 10⁹ + 7)[0][0]."),
      solve: throwingDice, comparator: "scalar", dependencies: ["matrix-power"], brute: throwingDiceBrute, small: (round) => [String(1 + round * 3 % 120)],
      reference: book("23.2", "Linear recurrences"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 8, min: 1, max: 30 }], args: [{ fixture: "roundedNString" }] },
      diagnoses: [
        diagnosis("five-faces", "A die has six faces, so the recurrence looks back six steps.", function throwingDice(n) { const p = 1000000007; const step = []; for (let i = 0; i < 5; i += 1) { const row = new Array(5).fill(0); if (i === 0) for (let j = 0; j < 5; j += 1) row[j] = 1; else row[i - 1] = 1; step.push(row); } return matrixPower(step, n, p)[0][0]; }),
        diagnosis("shift-rows-wrong", "Row i has to remember what row i − 1 held, so its single 1 sits in column i − 1.", function throwingDice(n) { const p = 1000000007; const step = []; for (let i = 0; i < 6; i += 1) { const row = new Array(6).fill(0); if (i === 0) for (let j = 0; j < 6; j += 1) row[j] = 1; else row[i] = 1; step.push(row); } return matrixPower(step, n, p)[0][0]; }),
      ],
      hints: ["The state is (ways(k), ways(k−1), …, ways(k−5)); at k = 0 that is (1, 0, 0, 0, 0, 0).", "The step matrix has a first row of ones and 1 at [i][i−1] for i from 1 to 5.", "Answer = matrixPower(step, n, 10⁹ + 7)[0][0]."],
      cases: [
        example(["8"], 125, "CSES sample"),
        example(["1"], 1, "one throw"),
        example(["2"], 2, "two ways"),
        run(throwingDice, ["1000000000000000000"], "n = 10¹⁸"),
        hidden("n = 10¹⁸ − 1, time limit", () => ["999999999999999999"]),
      ],
    },
    {
      id: "graph-paths-i", title: "Graph Paths I", cses: { id: 1723, name: "Graph Paths I" },
      goal: "How many walks of exactly k edges run from node 1 to node n in a directed graph, modulo 10⁹ + 7.",
      concept: "Entry (i, j) of the adjacency matrix counts the walks of one edge from i to j, and multiplying two such matrices sums over the meeting point, which counts walks of two. So the k-th power counts walks of k, and squaring reaches k = 10⁹ in thirty products.",
      functionName: "graphPathsI", signature: "graphPathsI(n, k, edges) → number",
      starterSource: starter("graphPathsI", "n, k, edges", "Adjacency matrix counting parallel edges; matrixPower(base, String(k), 10⁹ + 7)[0][n − 1]."),
      solve: graphPathsI, comparator: "scalar", dependencies: ["matrix-power"], brute: graphPathsIBrute, small: (round) => { const n = 2 + (round % 4); return [n, 1 + (round % 7), smallDigraph(630 + round, n, 2 + (round % 5), false)]; },
      reference: book("23.3", "Graphs and matrices"),
      presets: { "CSES sample": { a: 3, b: SAMPLE_PATHS, c: 8, directed: true }, "one edge": { a: 2, b: [[1, 2]], c: 1, directed: true }, "no walk": { a: 3, b: [[1, 2]], c: 2, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-shortest", "The task counts walks of exactly k edges, not the shortest route.", function graphPathsI(n, k, edges) { const adjacency = []; for (let v = 0; v <= n; v += 1) adjacency.push([]); for (let i = 0; i < edges.length; i += 1) adjacency[edges[i][0]].push(edges[i][1]); const distance = new Array(n + 1).fill(-1); distance[1] = 0; const queue = [1]; for (let i = 0; i < queue.length; i += 1) { const v = queue[i]; for (let t = 0; t < adjacency[v].length; t += 1) { const u = adjacency[v][t]; if (distance[u] === -1) { distance[u] = distance[v] + 1; queue.push(u); } } } return distance[n] === k ? 1 : 0; }),
        diagnosis("matrix-transposed", "Entry (i, j) of the adjacency matrix marks an edge from i to j, so the answer is at [0][n − 1].", function graphPathsI(n, k, edges) { const p = 1000000007; const base = []; for (let i = 0; i < n; i += 1) base.push(new Array(n).fill(0)); for (let i = 0; i < edges.length; i += 1) base[edges[i][1] - 1][edges[i][0] - 1] += 1; return matrixPower(base, String(k), p)[0][n - 1]; }),
      ],
      hints: ["An n × n matrix of zeros; each edge a → b adds one at [a − 1][b − 1], counting parallel edges.", "matrixPower takes the exponent as a string, so pass String(k).", "Read entry [0][n − 1] of the power."],
      cases: [
        example([3, 8, SAMPLE_PATHS], 2, "CSES sample"),
        example([2, 1, [[1, 2]]], 1, "one edge"),
        example([3, 2, [[1, 2]]], 0, "no walk of that length"),
        example([2, 2, [[1, 2], [2, 1]]], 0, "back and forth ends where it started"),
        hidden("n = 50, m = 1049, k = 10⁹, time limit", () => [50, 1000000000, PATHS_GRAPH()]),
      ],
    },
    {
      id: "graph-paths-ii", title: "Graph Paths II", cses: { id: 1724, name: "Graph Paths II" },
      goal: "The cheapest walk of exactly k edges from node 1 to node n, or −1 when there is none. This lab keeps the weights small enough that the totals stay exact in a double.",
      concept: "The same power, in a different arithmetic: replace addition by a minimum and multiplication by a sum. Combining two tables then means 'best meeting point', so the k-th power in that min-plus arithmetic holds the cheapest walk of k edges, and squaring still works because the operation is associative.",
      functionName: "graphPathsII", signature: "graphPathsII(n, k, edges) → number",
      starterSource: starter("graphPathsII", "n, k, edges", "Start from the weight matrix with Infinity for absent edges; combine(x, y)[i][j] = min over t of x[i][t] + y[t][j]; square and multiply over the bits of k."),
      solve: graphPathsII, comparator: "scalar", brute: graphPathsIIBrute, small: (round) => { const n = 2 + (round % 4); return [n, 1 + (round % 6), smallDigraph(640 + round, n, 2 + (round % 5), true)]; },
      reference: book("23.3", "Graphs and matrices · min-plus products"),
      presets: { "CSES sample": { a: 3, b: SAMPLE_WEIGHTED, c: 8, directed: true }, "one edge": { a: 2, b: [[1, 2, 7]], c: 1, directed: true }, "no walk": { a: 3, b: [[1, 2, 4]], c: 2, directed: true } },
      scene: { kind: "algo", view: "graph", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("zero-filled-start", "A result table of zeros claims every pair is already reachable at no cost, so walks appear out of nowhere; leave the result unset until the first set bit of k.", function graphPathsII(n, k, edges) { const base = []; for (let i = 0; i < n; i += 1) base.push(new Array(n).fill(Infinity)); for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0] - 1, b = edges[i][1] - 1, cost = edges[i][2]; if (cost < base[a][b]) base[a][b] = cost; } const combine = (x, y) => { const out = []; for (let i = 0; i < n; i += 1) { const row = new Array(n).fill(Infinity); for (let t = 0; t < n; t += 1) { const left = x[i][t]; if (left === Infinity) continue; for (let j = 0; j < n; j += 1) { const candidate = left + y[t][j]; if (candidate < row[j]) row[j] = candidate; } } out.push(row); } return out; }; let result = []; for (let i = 0; i < n; i += 1) result.push(new Array(n).fill(0)); let factor = base, left = k; while (left > 0) { if (left % 2 === 1) result = combine(result, factor); left = Math.floor(left / 2); if (left > 0) factor = combine(factor, factor); } const answer = result[0][n - 1]; return answer === Infinity ? -1 : answer; }),
        diagnosis("sums-instead-of-minimum", "Min-plus replaces the sum by a minimum; adding the candidates counts walks instead of pricing the cheapest.", function graphPathsII(n, k, edges) { const base = []; for (let i = 0; i < n; i += 1) base.push(new Array(n).fill(Infinity)); for (let i = 0; i < edges.length; i += 1) { const a = edges[i][0] - 1, b = edges[i][1] - 1, cost = edges[i][2]; if (cost < base[a][b]) base[a][b] = cost; } const combine = (x, y) => { const out = []; for (let i = 0; i < n; i += 1) { const row = new Array(n).fill(Infinity); for (let t = 0; t < n; t += 1) { const left = x[i][t]; if (left === Infinity) continue; for (let j = 0; j < n; j += 1) { const candidate = left + y[t][j]; if (candidate === Infinity) continue; row[j] = row[j] === Infinity ? candidate : row[j] + candidate; } } out.push(row); } return out; }; let result = null, factor = base, left = k; while (left > 0) { if (left % 2 === 1) result = result === null ? factor : combine(result, factor); left = Math.floor(left / 2); if (left > 0) factor = combine(factor, factor); } const answer = result[0][n - 1]; return answer === Infinity ? -1 : answer; }),
      ],
      hints: ["The base table holds the cheapest single edge between each pair, Infinity when there is none.", "combine(x, y)[i][j] = min over t of x[i][t] + y[t][j]; skip a row entry that is Infinity.", "Leave the result unset until the first set bit of k, then combine; Infinity at the end means −1."],
      cases: [
        example([3, 8, SAMPLE_WEIGHTED], 27, "CSES sample"),
        example([2, 1, [[1, 2, 7]]], 7, "one edge"),
        example([3, 2, [[1, 2, 4]]], -1, "no walk of that length"),
        example([2, 3, [[1, 2, 1], [2, 1, 1]]], 3, "back and forth"),
        hidden("n = 50, m = 1049, k = 10⁹, time limit", () => [50, 1000000000, PATHS_WEIGHTED()]),
      ],
    },
    {
      id: "system-of-linear-equations", title: "System of Linear Equations", cses: { id: 3154, name: "System of Linear Equations" },
      goal: "Values for the variables that satisfy every equation modulo 10⁹ + 7, or null when the system is inconsistent. Any solution is accepted; free variables may take any value.",
      concept: "Gauss–Jordan elimination, with division replaced by multiplication by a modular inverse. Each column that still has a non-zero entry becomes a pivot: scale its row to 1 and clear that column everywhere else. A leftover row that reads 0 = something non-zero means no solution; columns without a pivot are free, and setting them to zero gives one valid answer.",
      functionName: "systemOfLinearEquations", signature: "systemOfLinearEquations(rows) → values or null",
      starterSource: starter("systemOfLinearEquations", "rows", "Each row is the m coefficients followed by the right-hand side. Walk the columns, pick a pivot, scale by modInverse, clear the column, and finally read the pivot rows."),
      solve: systemOfLinearEquations, comparator: "deep", dependencies: ["mul-mod", "mod-inverse"], accept: systemAccept, check: (args, out) => systemAccept(args, out, out) === true, small: (round) => [smallSystem(650 + round, 1 + (round % 4), 1 + ((round * 3) % 4))],
      reference: book("21.3", "Solving equations"),
      presets: { "CSES sample": { a: [[2, 0, 1, 7], [1, 2, 0, 0], [1, 3, 1, 2]] }, "no solution": { a: [[1, 1, 5], [1, 1, 6]] }, "free variable": { a: [[1, 1, 3]] } },
      scene: { kind: "algo", view: "number-grid", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("divides-normally", "Dividing a row by its pivot means multiplying by the pivot's modular inverse; ordinary division leaves fractions that are not residues.", function systemOfLinearEquations(rows) { const p = 1000000007; const n = rows.length, m = rows[0].length - 1; const grid = rows.map((row) => row.slice()); const pivotRow = new Array(m).fill(-1); let used = 0; for (let col = 0; col < m && used < n; col += 1) { let pivot = -1; for (let i = used; i < n; i += 1) if (grid[i][col] % p !== 0) { pivot = i; break; } if (pivot === -1) continue; const swap = grid[used]; grid[used] = grid[pivot]; grid[pivot] = swap; const value = grid[used][col]; for (let j = col; j <= m; j += 1) grid[used][j] = Math.round(grid[used][j] / value) % p; for (let i = 0; i < n; i += 1) { if (i === used || grid[i][col] === 0) continue; const factor = grid[i][col]; for (let j = col; j <= m; j += 1) grid[i][j] = (grid[i][j] - mulMod(factor, grid[used][j], p) + p) % p; } pivotRow[col] = used; used += 1; } for (let i = used; i < n; i += 1) { let allZero = true; for (let j = 0; j < m; j += 1) if (grid[i][j] % p !== 0) allZero = false; if (allZero && grid[i][m] % p !== 0) return null; } const answer = new Array(m).fill(0); for (let col = 0; col < m; col += 1) if (pivotRow[col] !== -1) answer[col] = grid[pivotRow[col]][m]; return answer; }),
        diagnosis("no-inconsistency-check", "A row left reading 0 = something non-zero means the system has no solution at all.", function systemOfLinearEquations(rows) { const p = 1000000007; const n = rows.length, m = rows[0].length - 1; const grid = rows.map((row) => row.slice()); const pivotRow = new Array(m).fill(-1); let used = 0; for (let col = 0; col < m && used < n; col += 1) { let pivot = -1; for (let i = used; i < n; i += 1) if (grid[i][col] % p !== 0) { pivot = i; break; } if (pivot === -1) continue; const swap = grid[used]; grid[used] = grid[pivot]; grid[pivot] = swap; const inverse = modInverse(grid[used][col], p); for (let j = col; j <= m; j += 1) grid[used][j] = mulMod(grid[used][j] % p, inverse, p); for (let i = 0; i < n; i += 1) { if (i === used || grid[i][col] === 0) continue; const factor = grid[i][col]; for (let j = col; j <= m; j += 1) grid[i][j] = (grid[i][j] - mulMod(factor, grid[used][j], p) + p) % p; } pivotRow[col] = used; used += 1; } const answer = new Array(m).fill(0); for (let col = 0; col < m; col += 1) if (pivotRow[col] !== -1) answer[col] = grid[pivotRow[col]][m]; return answer; }),
      ],
      hints: ["Copy the rows so the input is not modified; m = rows[0].length − 1.", "For each column, find a row at or below the current one with a non-zero entry, swap it up, scale it by modInverse of the pivot and subtract it from every other row.", "Check the remaining rows for 0 = non-zero, then read each pivot column's right-hand side; leave free columns at 0."],
      cases: [
        example([[[2, 0, 1, 7], [1, 2, 0, 0], [1, 3, 1, 2]]], [2, 1000000006, 3], "CSES sample"),
        example([[[1, 1, 5], [1, 1, 6]]], null, "no solution"),
        run(systemOfLinearEquations, [[[1, 1, 3]]], "one equation, two unknowns"),
        example([[[1, 0, 4], [0, 1, 5]]], [4, 5], "already solved"),
        hidden("120 equations in 120 unknowns, time limit", () => [BIG_SYSTEM()]),
      ],
    },
    {
      id: "sum-of-four-squares", title: "Sum of Four Squares", cses: { id: 3355, name: "Sum of Four Squares" },
      goal: "For each value, four non-negative integers whose squares add up to it. Every non-negative integer has such a quadruple, and any one is accepted.",
      concept: "Search from the largest square downward. Taking the biggest square that fits leaves a small remainder, so the next choice is already limited, and the last two are a short scan: fix one and test whether what remains is a perfect square. Starting from the top makes the first attempts almost always succeed.",
      functionName: "sumOfFourSquares", signature: "sumOfFourSquares(values) → [[a, b, c, d], …]",
      starterSource: starter("sumOfFourSquares", "values", "An integer square root with a correction loop; then a from isqrt(n) down, b from isqrt(rest) down, c from isqrt(rest) down, and test the last remainder."),
      solve: sumOfFourSquares, comparator: "deep", accept: fourSquaresAccept, check: (args, out) => fourSquaresAccept(args, out) === true, small: (round) => [randomInts(660 + round, 4, 0, 2000)],
      reference: book("21.4", "Number theory · other results"),
      presets: { "CSES sample": { c: [5, 30, 322266] }, "perfect squares": { c: [0, 1, 4, 9] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("three-squares", "Some numbers need all four squares: 7 is 4 + 1 + 1 + 1 and cannot be done with three.", function sumOfFourSquares(values) { const isqrt = (x) => { let root = Math.floor(Math.sqrt(x)); while (root > 0 && root * root > x) root -= 1; while ((root + 1) * (root + 1) <= x) root += 1; return root; }; return values.map((n) => { for (let a = isqrt(n); a >= 0; a -= 1) { const afterA = n - a * a; for (let b = isqrt(afterA); b >= 0; b -= 1) { const rest = afterA - b * b; const c = isqrt(rest); if (c * c === rest) return [a, b, c, 0]; } } return [0, 0, 0, 0]; }); }),
        diagnosis("greedy-only", "Taking the largest square and never reconsidering fails: 12 would go 9 + 1 + 1 + 1, which is 12 but leaves nothing for a number like 23.", function sumOfFourSquares(values) { const isqrt = (x) => { let root = Math.floor(Math.sqrt(x)); while (root > 0 && root * root > x) root -= 1; while ((root + 1) * (root + 1) <= x) root += 1; return root; }; return values.map((n) => { let rest = n; const out = []; for (let k = 0; k < 4; k += 1) { const root = isqrt(rest); out.push(root); rest -= root * root; } return out; }); }),
      ],
      hints: ["isqrt(x): Math.floor(Math.sqrt(x)) then correct down while root² > x and up while (root+1)² ≤ x.", "Loop a from isqrt(n) downward, then b from isqrt(n − a²) downward, then c the same way.", "For each triple, the remainder must be a perfect square; return as soon as it is."],
      cases: [
        run(sumOfFourSquares, [[5, 30, 322266]], "CSES sample"),
        example([[0]], [[0, 0, 0, 0]], "zero"),
        run(sumOfFourSquares, [[7, 23, 28]], "numbers that need four squares"),
        run(sumOfFourSquares, [[1, 4, 9, 16]], "perfect squares"),
        hidden("10 values near 10⁶, time limit", () => [FOUR_SQUARE_VALUES()]),
      ],
    },
    {
      id: "triangle-number-sums", title: "Triangle Number Sums", cses: { id: 3406, name: "Triangle Number Sums" },
      goal: "For each value, the fewest triangle numbers 1, 3, 6, 10, … that add up to it.",
      concept: "Gauss proved three always suffice, so the answer is 1, 2 or 3. Multiplying by 8 and adding turns the tests into squares: n is triangular exactly when 8n + 1 is a perfect square, and n is a sum of two triangle numbers exactly when 8n + 2 is a sum of two squares, which holds unless some prime that is 3 modulo 4 divides it an odd number of times.",
      functionName: "triangleNumberSums", signature: "triangleNumberSums(values) → answers",
      starterSource: starter("triangleNumberSums", "values", "Sieve primes to 3·10⁶ (enough for √(8·10¹²)); 8n + 1 square → 1; 8n + 2 a sum of two squares → 2; otherwise 3."),
      solve: triangleNumberSums, comparator: "deep", brute: triangleNumberSumsBrute, small: (round) => [randomInts(670 + round, 4, 1, 3000)],
      reference: book("21.4", "Number theory · other results"),
      presets: { "CSES sample": { c: [1, 2, 3, 42, 1337] }, "large values": { c: [1000000000000, 999999999999] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("greedy-largest", "Taking the largest triangle number that fits and repeating is not optimal: 2 needs 1 + 1, but after taking 1 from 12 the greedy path is longer than the best.", function triangleNumberSums(values) { return values.map((n) => { let rest = n, count = 0; while (rest > 0) { let k = Math.floor((Math.sqrt(8 * rest + 1) - 1) / 2); while (k * (k + 1) / 2 > rest) k -= 1; rest -= k * (k + 1) / 2; count += 1; } return count; }); }),
        diagnosis("two-squares-sign", "A prime that is 3 modulo 4 blocks a sum of two squares only when its exponent is odd; an even power is fine.", function triangleNumberSums(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const limit = Math.max(2, Math.ceil(Math.sqrt(8 * top + 2))); const composite = new Array(limit + 1).fill(false); const primes = []; for (let i = 2; i <= limit; i += 1) { if (composite[i]) continue; primes.push(i); for (let j = i * i; j <= limit; j += i) composite[j] = true; } const isSquare = (x) => { if (x < 0) return false; let root = Math.floor(Math.sqrt(x)); while (root > 0 && root * root > x) root -= 1; while ((root + 1) * (root + 1) <= x) root += 1; return root * root === x; }; const sumOfTwoSquares = (x) => { let rest = x; for (let i = 0; i < primes.length; i += 1) { const q = primes[i]; if (q * q > rest) break; if (rest % q !== 0) continue; let power = 0; while (rest % q === 0) { rest /= q; power += 1; } if (q % 4 === 3) return false; } return !(rest > 1 && rest % 4 === 3); }; return values.map((n) => { if (isSquare(8 * n + 1)) return 1; if (sumOfTwoSquares(8 * n + 2)) return 2; return 3; }); }),
      ],
      hints: ["n = k(k+1)/2 rearranges to 8n + 1 = (2k+1)², so one triangle number means 8n + 1 is a perfect square.", "Two triangle numbers give (2a+1)² + (2b+1)² = 8n + 2, so test whether 8n + 2 is a sum of two squares.", "That test factorises: it fails exactly when some prime congruent to 3 modulo 4 appears to an odd power. Otherwise the answer is 3."],
      cases: [
        example([[1, 2, 3, 42, 1337]], [1, 2, 1, 2, 3], "CSES sample"),
        example([[6, 10, 15]], [1, 1, 1], "triangle numbers themselves"),
        example([[4, 7, 1337]], [2, 2, 3], "two, two and three"),
        run(triangleNumberSums, [[1000000000000, 999999999999]], "values near 10¹²"),
        hidden("20 values up to 10¹², time limit", () => [TRIANGLE_VALUES()]),
      ],
    },
    {
      id: "dice-probability", title: "Dice Probability", cses: { id: 1725, name: "Dice Probability" },
      goal: "The probability that n dice throws add up to something between a and b.",
      concept: "Spread the probability over the reachable sums one throw at a time: each sum passes a sixth of its weight to the six sums above it. After n throws the array holds the distribution, and the answer is the slice from a to b.",
      functionName: "diceProbability", signature: "diceProbability(n, a, b) → number",
      starterSource: starter("diceProbability", "n, a, b", "ways[0] = 1; per throw, move ways[sum] / 6 into sum + 1 .. sum + 6; add up ways[a..b]."),
      solve: diceProbability, comparator: "scalar", tolerance: 1e-9, brute: diceProbabilityBrute, small: (round) => { const n = 1 + (round % 6); const next = rng(680 + round); const a = 1 + Math.floor(next() * 6 * n); return [n, a, a + Math.floor(next() * 6)]; },
      reference: book("24.1", "Probability calculation"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "throws n (rounded)", value: 2, min: 1, max: 12 },
        { id: "a", type: "slider", label: "a (rounded)", value: 9, min: 1, max: 40 },
        { id: "b", type: "slider", label: "b (rounded)", value: 10, min: 1, max: 40 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("counts-not-probability", "Each face carries one sixth of the weight, so the array has to be divided by 6 on every step, not counted raw.", function diceProbability(n, a, b) { const top = 6 * n; let ways = new Array(top + 1).fill(0); ways[0] = 1; for (let thrown = 1; thrown <= n; thrown += 1) { const next = new Array(top + 1).fill(0); for (let sum = 0; sum <= top; sum += 1) { if (ways[sum] === 0) continue; for (let face = 1; face <= 6; face += 1) if (sum + face <= top) next[sum + face] += ways[sum]; } ways = next; } let total = 0; for (let sum = a; sum <= Math.min(b, top); sum += 1) total += ways[sum]; return total; }),
        diagnosis("excludes-b", "The range is inclusive at both ends.", function diceProbability(n, a, b) { const top = 6 * n; let ways = new Array(top + 1).fill(0); ways[0] = 1; for (let thrown = 1; thrown <= n; thrown += 1) { const next = new Array(top + 1).fill(0); for (let sum = 0; sum <= top; sum += 1) { if (ways[sum] === 0) continue; for (let face = 1; face <= 6; face += 1) if (sum + face <= top) next[sum + face] += ways[sum] / 6; } ways = next; } let total = 0; for (let sum = a; sum < Math.min(b, top); sum += 1) total += ways[sum]; return total; }),
      ],
      hints: ["The largest reachable sum is 6n, so one array of that size is enough.", "Start with ways[0] = 1 and repeat n times: each sum gives ways[sum] / 6 to each of the next six sums.", "Add ways[a] through ways[b]."],
      cases: [
        example([2, 9, 10], 7 / 36, "CSES sample, printed as 0.194444"),
        example([1, 1, 6], 1, "one throw always lands in range"),
        example([1, 7, 8], 0, "out of reach"),
        example([2, 2, 2], 1 / 36, "snake eyes"),
        hidden("n = 100, time limit", () => [100, 300, 400]),
      ],
    },
    {
      id: "moving-robots", title: "Moving Robots", cses: { id: 1726, name: "Moving Robots" },
      goal: "Every square of an 8 × 8 board starts with a robot; each takes k random steps, never off the board. The expected number of empty squares afterwards.",
      concept: "Expectation adds, so the answer is the sum over squares of the probability that the square ends up empty. The robots move independently, so that probability is the product over starting squares of one minus the chance that robot lands there. One distribution sweep per start gives every one of those chances.",
      functionName: "movingRobots", signature: "movingRobots(k) → number",
      starterSource: starter("movingRobots", "k", "Neighbour lists for the 64 squares; per start, spread the probability k times; multiply (1 − chance) into an empty[] accumulator; sum it."),
      solve: movingRobots, comparator: "scalar", brute: movingRobotsBrute, small: (round) => [1 + (round % 4)],
      reference: book("24.3", "Random variables · expected value"),
      scene: { kind: "algo", view: "number", handles: [{ id: "k", type: "slider", label: "steps k (rounded)", value: 10, min: 1, max: 40 }], args: [{ fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("counts-one-robot", "Every one of the 64 robots can land on a square, so the empty chance is a product over all of them.", function movingRobots(k) { const size = 8; const neighbours = []; for (let cell = 0; cell < 64; cell += 1) { const r = Math.floor(cell / size), c = cell % size; const list = []; if (r > 0) list.push(cell - size); if (r < size - 1) list.push(cell + size); if (c > 0) list.push(cell - 1); if (c < size - 1) list.push(cell + 1); neighbours.push(list); } let chance = new Array(64).fill(0); chance[0] = 1; for (let step = 0; step < k; step += 1) { const next = new Array(64).fill(0); for (let cell = 0; cell < 64; cell += 1) { if (chance[cell] === 0) continue; const list = neighbours[cell]; const part = chance[cell] / list.length; for (let i = 0; i < list.length; i += 1) next[list[i]] += part; } chance = next; } let total = 0; for (let cell = 0; cell < 64; cell += 1) total += 1 - chance[cell]; return total; }),
        diagnosis("uniform-directions", "A robot on an edge has three choices and one in a corner has two, so the share depends on how many moves that square allows.", function movingRobots(k) { const size = 8; const neighbours = []; for (let cell = 0; cell < 64; cell += 1) { const r = Math.floor(cell / size), c = cell % size; const list = []; if (r > 0) list.push(cell - size); if (r < size - 1) list.push(cell + size); if (c > 0) list.push(cell - 1); if (c < size - 1) list.push(cell + 1); neighbours.push(list); } const empty = new Array(64).fill(1); for (let start = 0; start < 64; start += 1) { let chance = new Array(64).fill(0); chance[start] = 1; for (let step = 0; step < k; step += 1) { const next = new Array(64).fill(0); for (let cell = 0; cell < 64; cell += 1) { if (chance[cell] === 0) continue; const list = neighbours[cell]; for (let i = 0; i < list.length; i += 1) next[list[i]] += chance[cell] / 4; } chance = next; } for (let cell = 0; cell < 64; cell += 1) empty[cell] *= 1 - chance[cell]; } let total = 0; for (let cell = 0; cell < 64; cell += 1) total += empty[cell]; return total; }),
      ],
      hints: ["Precompute, for each of the 64 squares, the list of squares it can step to.", "For each starting square, run k sweeps spreading chance[cell] evenly over its neighbours.", "empty[cell] *= 1 − chance[cell] over all starts, then add the 64 values."],
      cases: [
        example([10], 23.120740, "CSES sample"),
        run(movingRobots, [1], "one step"),
        run(movingRobots, [2], "two steps"),
        run(movingRobots, [3], "three steps"),
        hidden("k = 100, time limit", () => [100]),
      ],
    },
    {
      id: "candy-lottery", title: "Candy Lottery", cses: { id: 1727, name: "Candy Lottery" },
      goal: "n children each get a uniformly random number of candies between 1 and k. The expected largest amount any child receives.",
      concept: "The chance that every child stays at or below v is (v/k)ⁿ, so the chance that the maximum is exactly v is that minus the same for v − 1. Summing v times those differences gives the expectation without touching the kⁿ outcomes.",
      functionName: "candyLottery", signature: "candyLottery(n, k) → number",
      starterSource: starter("candyLottery", "n, k", "Σ over v from 1 to k of v · ((v/k)^n − ((v−1)/k)^n)."),
      solve: candyLottery, comparator: "scalar", tolerance: 1e-9, brute: candyLotteryBrute, small: (round) => { const k = 1 + (round % 5); const n = 1 + (round % 4); return [n, k]; },
      reference: book("24.3", "Random variables · expected value"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "children n (rounded)", value: 2, min: 1, max: 20 },
        { id: "k", type: "slider", label: "candies k (rounded)", value: 3, min: 1, max: 20 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedK" }] },
      diagnoses: [
        diagnosis("cumulative-not-exact", "(v/k)ⁿ is the chance of staying at or below v; the chance of exactly v needs the previous one subtracted.", function candyLottery(n, k) { let total = 0; for (let value = 1; value <= k; value += 1) total += value * Math.pow(value / k, n); return total; }),
        diagnosis("expected-of-one", "The expected maximum is not the expected value of a single child, which is (k + 1)/2.", function candyLottery(n, k) { return (k + 1) / 2; }),
      ],
      hints: ["P(max ≤ v) = (v/k)ⁿ, because every child independently has to land at or below v.", "P(max = v) = (v/k)ⁿ − ((v−1)/k)ⁿ.", "The expectation is Σ v · P(max = v) over v from 1 to k."],
      cases: [
        example([2, 3], 22 / 9, "CSES sample, printed as 2.444444"),
        example([1, 1], 1, "one child, one candy"),
        example([1, 6], 3.5, "one child is just the average"),
        run(candyLottery, [10, 10], "ten and ten"),
        hidden("n = k = 100, time limit", () => [100, 100]),
      ],
    },
    {
      id: "inversion-probability", title: "Inversion Probability", cses: { id: 1728, name: "Inversion Probability" },
      goal: "Each position i holds a uniformly random integer between 1 and r[i]. The expected number of pairs i < j with x[i] > x[j].",
      concept: "Expectation adds over the pairs, so every pair can be handled on its own: fix the later value and count how many earlier values beat it. That is one short sweep per pair, and the pairs never interact.",
      functionName: "inversionProbability", signature: "inversionProbability(bounds) → number",
      starterSource: starter("inversionProbability", "bounds", "For each pair (i, j) with i < j, sum over v from 1 to r[j] of max(0, r[i] − v), divided by r[i]·r[j]."),
      solve: inversionProbability, comparator: "scalar", tolerance: 1e-9, brute: inversionProbabilityBrute, small: (round) => [randomInts(690 + round, 1 + (round % 4), 1, 4)],
      reference: book("24.3", "Random variables · linearity"),
      presets: { "CSES sample": { a: [5, 2, 7] }, "all the same": { a: [3, 3, 3] }, "single value": { a: [1, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("counts-ties", "An inversion needs x[i] strictly greater than x[j], so a tie does not count.", function inversionProbability(bounds) { const n = bounds.length; let total = 0; for (let i = 0; i < n; i += 1) { for (let j = i + 1; j < n; j += 1) { const first = bounds[i], second = bounds[j]; let count = 0; for (let value = 1; value <= second; value += 1) count += first - Math.min(value - 1, first); total += count / (first * second); } } return total; }),
        diagnosis("ordered-pairs", "Only pairs with i < j count, so each pair is considered once.", function inversionProbability(bounds) { const n = bounds.length; let total = 0; for (let i = 0; i < n; i += 1) { for (let j = 0; j < n; j += 1) { if (i === j) continue; const first = bounds[i], second = bounds[j]; let count = 0; for (let value = 1; value <= second; value += 1) count += first - Math.min(value, first); total += count / (first * second); } } return total; }),
      ],
      hints: ["Expectation adds, so sum P(x[i] > x[j]) over the pairs with i < j.", "For a fixed value v at position j, the earlier position beats it in max(0, r[i] − v) ways.", "Divide the count by r[i]·r[j] and add it in."],
      cases: [
        example([[5, 2, 7]], 1.0571428571428572, "CSES sample, printed as 1.057143"),
        example([[1, 1]], 0, "no inversion is possible"),
        example([[2, 2]], 0.25, "two coin flips"),
        example([[3]], 0, "one position"),
        hidden("n = 100 with bounds up to 100, time limit", () => [randomInts(700, 100, 1, 100)]),
      ],
    },
    {
      id: "stick-game", title: "Stick Game", cses: { id: 1729, name: "Stick Game" },
      goal: "With the allowed take sizes given, report W or L for every heap size from 1 to n, from the first player's point of view.",
      concept: "A position wins exactly when some move leads to a losing position. Because every move shrinks the heap, filling the answers from 1 upward means the positions a move reaches are already known.",
      functionName: "stickGame", signature: "stickGame(n, moves) → string of W and L",
      starterSource: starter("stickGame", "n, moves", "winning[0] = false; for sticks upward, winning[sticks] is true when some allowed take leaves a losing position."),
      solve: stickGame, comparator: "deep", brute: stickGameBrute, small: (round) => { const n = 1 + (round % 20); const next = rng(710 + round); const moves = [1]; for (let i = 2; i <= 4; i += 1) if (next() < 0.6) moves.push(i); return [n, moves]; },
      reference: book("25.1", "Game states"),
      presets: { "CSES sample": { a: [1, 3, 4] }, "only one": { a: [1] }, "one and two": { a: [1, 2] } },
      scene: { kind: "algo", view: "bars", handles: preset([{ id: "n", type: "slider", label: "n (rounded)", value: 10, min: 1, max: 30 }]), args: [{ fixture: "roundedN" }, { fixture: "presetA" }] },
      diagnoses: [
        diagnosis("wins-if-any-winning", "A position wins by handing the opponent a loss, so it needs a move into a losing position, not into a winning one.", function stickGame(n, moves) { const winning = new Array(n + 1).fill(false); for (let sticks = 1; sticks <= n; sticks += 1) { for (let i = 0; i < moves.length; i += 1) { const take = moves[i]; if (take <= sticks && winning[sticks - take]) { winning[sticks] = true; break; } } } let out = ""; for (let sticks = 1; sticks <= n; sticks += 1) out += winning[sticks] ? "W" : "L"; return out; }),
        diagnosis("empty-heap-wins", "The player facing an empty heap cannot move and has lost, so position 0 is a loss.", function stickGame(n, moves) { const winning = new Array(n + 1).fill(false); winning[0] = true; for (let sticks = 1; sticks <= n; sticks += 1) { for (let i = 0; i < moves.length; i += 1) { const take = moves[i]; if (take <= sticks && !winning[sticks - take]) { winning[sticks] = true; break; } } } let out = ""; for (let sticks = 1; sticks <= n; sticks += 1) out += winning[sticks] ? "W" : "L"; return out; }),
      ],
      hints: ["An empty heap is a loss for whoever has to move.", "For sticks from 1 to n, try every allowed take that fits.", "If any of them lands on a losing position, this one wins; build the string from positions 1..n."],
      cases: [
        example([10, [1, 3, 4]], "WLWWWWLWLW", "CSES sample"),
        example([5, [1]], "WLWLW", "taking one at a time"),
        example([6, [1, 2]], "WWLWWL", "one or two"),
        example([1, [1]], "W", "a single stick"),
        hidden("n = 200 000 with 50 moves, time limit", () => [200000, STICK_MOVES()]),
      ],
    },
    {
      id: "nim-game-i", title: "Nim Game I", cses: { id: 1730, name: "Nim Game I" },
      goal: "For each test, who wins the heaps game where a move takes any number of sticks from one heap.",
      concept: "The xor of the heap sizes decides it. When the xor is zero every move breaks it, and when it is not zero some move restores it, so the player facing a zero xor always loses under optimal play.",
      functionName: "nimGameI", signature: "nimGameI(tests) → array of \"first\" or \"second\"",
      starterSource: starter("nimGameI", "tests", "Per test, xor the heap sizes: zero means \"second\", anything else \"first\"."),
      solve: nimGameI, comparator: "deep", brute: nimGameIBrute, small: (round) => [smallHeaps(720 + round, 3, 3, 4)],
      reference: book("25.2", "Nim game"),
      presets: { "CSES sample": { a: [5, 7, 2, 5], c: [[5, 7, 2, 5], [4, 1], [3, 5, 6]] }, "balanced": { a: [4, 4], c: [[4, 4], [1, 1, 1, 1]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("sum-not-xor", "Nim turns on the xor of the heaps, not their total; two equal heaps have an even total and are also a loss, but three heaps of 1 have an odd total and are a win.", function nimGameI(tests) { return tests.map((heaps) => { let total = 0; for (let i = 0; i < heaps.length; i += 1) total += heaps[i]; return total % 2 === 0 ? "second" : "first"; }); }),
        diagnosis("verdict-flipped", "A xor of zero is the position you do not want to be in, so it is the second player who wins.", function nimGameI(tests) { return tests.map((heaps) => { let total = 0; for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i]; return total === 0 ? "first" : "second"; }); }),
      ],
      hints: ["Xor every heap size together with ^.", "Zero means the player to move loses.", "Return \"first\" when the xor is non-zero, \"second\" otherwise."],
      cases: [
        example([[[5, 7, 2, 5], [4, 1], [3, 5, 6]]], ["first", "first", "second"], "CSES sample"),
        example([[[1]]], ["first"], "one stick"),
        example([[[4, 4]]], ["second"], "two equal heaps"),
        example([[[1, 1, 1]]], ["first"], "three single heaps"),
        hidden("100 tests of 2000 heaps, time limit", () => [NIM_TESTS()]),
      ],
    },
    {
      id: "nim-game-ii", title: "Nim Game II", cses: { id: 1098, name: "Nim Game II" },
      goal: "The same question when a move takes one, two or three sticks from one heap.",
      concept: "A single heap of size x now behaves like a Nim heap of size x modulo 4, because from a multiple of four every reply can be answered back to the next multiple of four. So xor the remainders instead of the sizes.",
      functionName: "nimGameII", signature: "nimGameII(tests) → array of \"first\" or \"second\"",
      starterSource: starter("nimGameII", "tests", "Per test, xor the heap sizes modulo 4; zero means \"second\"."),
      solve: nimGameII, comparator: "deep", brute: nimGameIIBrute, small: (round) => [smallHeaps(730 + round, 3, 3, 6)],
      reference: book("25.3", "Sprague–Grundy theorem"),
      presets: { "CSES sample": { a: [5, 7, 2, 5], c: [[5, 7, 2, 5], [4, 1], [4, 4, 4]] }, "multiples of four": { a: [4, 8], c: [[4, 8], [4]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("plain-xor", "With at most three taken, a heap of four is a loss just like an empty one, so the Grundy value is the size modulo 4.", function nimGameII(tests) { return tests.map((heaps) => { let total = 0; for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i]; return total === 0 ? "second" : "first"; }); }),
        diagnosis("modulo-three", "Three is the largest take, so the cycle length is four, not three.", function nimGameII(tests) { return tests.map((heaps) => { let total = 0; for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i] % 3; return total === 0 ? "second" : "first"; }); }),
      ],
      hints: ["A single heap is a loss exactly when its size is a multiple of four.", "That makes the Grundy value of a heap its size modulo 4.", "Xor those remainders; zero means the second player wins."],
      cases: [
        example([[[5, 7, 2, 5], [4, 1], [4, 4, 4]]], ["first", "first", "second"], "CSES sample"),
        example([[[4]]], ["second"], "a heap of four"),
        example([[[3]]], ["first"], "a heap of three"),
        example([[[8, 4]]], ["second"], "two multiples of four"),
        hidden("100 tests of 2000 heaps, time limit", () => [NIM_TESTS()]),
      ],
    },
    {
      id: "stair-game", title: "Stair Game", cses: { id: 1099, name: "Stair Game" },
      goal: "Balls sit on n stairs; a move carries any number of balls from stair k down to stair k − 1, and whoever cannot move loses. Who wins each test.",
      concept: "Only the balls on the odd-numbered steps counting from the bottom matter. Moving a ball from an even stair to an odd one is a Nim move on that odd pile; moving from an odd stair to an even one can always be answered by pushing the same balls one step further, which undoes it. So the game is Nim on the balls of stairs 2, 4, 6, ….",
      functionName: "stairGame", signature: "stairGame(tests) → array of \"first\" or \"second\"",
      starterSource: starter("stairGame", "tests", "Per test, xor the counts at the even 1-based stairs, which are the odd indices of the array."),
      solve: stairGame, comparator: "deep", brute: stairGameBrute, small: (round) => { const next = rng(740 + round); const out = []; for (let t = 0; t < 3; t += 1) { const list = []; const count = 1 + Math.floor(next() * 3); for (let i = 0; i < count; i += 1) list.push(Math.floor(next() * 3)); out.push(list); } return [out]; },
      reference: book("25.2", "Nim game · staircase nim"),
      presets: { "CSES sample": { a: [0, 2, 1], c: [[0, 2, 1], [1, 1, 1, 1], [5, 3]] }, "bottom only": { a: [7], c: [[7], [0, 0]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("all-stairs", "Balls on the odd-numbered stairs can always be mirrored by the opponent, so they do not count.", function stairGame(tests) { return tests.map((stairs) => { let total = 0; for (let i = 0; i < stairs.length; i += 1) total ^= stairs[i]; return total === 0 ? "second" : "first"; }); }),
        diagnosis("wrong-parity", "Stair 1 cannot be moved from, so the piles that matter are stairs 2, 4, 6, …, which sit at the odd indices of the array.", function stairGame(tests) { return tests.map((stairs) => { let total = 0; for (let i = 0; i < stairs.length; i += 2) total ^= stairs[i]; return total === 0 ? "second" : "first"; }); }),
      ],
      hints: ["Nothing can leave stair 1, so its balls are dead weight.", "A ball on stair 2 can be moved once; think of it as a Nim stick.", "Xor the counts at array indices 1, 3, 5, … and read zero as a win for the second player."],
      cases: [
        example([[[0, 2, 1], [1, 1, 1, 1], [5, 3]]], ["first", "second", "first"], "CSES sample"),
        example([[[7]]], ["second"], "everything stuck on stair 1"),
        example([[[0, 1]]], ["first"], "one ball on stair 2"),
        example([[[0, 2, 0, 2]]], ["second"], "two matching piles"),
        hidden("100 tests of 2000 stairs, time limit", () => [STAIR_TESTS()]),
      ],
    },
    {
      id: "grundys-game", title: "Grundy's Game", cses: { id: 2207, name: "Grundy's Game" },
      goal: "A move splits one heap into two non-empty heaps of different sizes, and whoever cannot move loses. Who wins for each starting heap.",
      concept: "Grundy values: a heap's value is the smallest number not among the xors of its two parts, and a position loses exactly when its value is zero. The losing heaps thin out quickly and none is known above about 1300, so computing the values up to a few thousand and answering \"first\" beyond that is what accepted solutions rely on.",
      functionName: "grundysGame", signature: "grundysGame(values) → array of \"first\" or \"second\"",
      starterSource: starter("grundysGame", "values", "Grundy values up to 5000: for n, mark grundy[a] ^ grundy[n − a] for every a with 2a < n, then take the smallest unmarked. Above the table answer \"first\"."),
      solve: grundysGame, comparator: "deep", brute: grundysGameBrute, small: (round) => [randomInts(750 + round, 3, 1, 22)],
      reference: book("25.3", "Sprague–Grundy theorem"),
      presets: { "CSES sample": { c: [6, 7, 8] }, "small heaps": { c: [1, 2, 3, 4, 5] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("equal-parts-allowed", "The two parts must differ, so a is limited to 2a < n; allowing an even split changes the values.", function grundysGame(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const limit = Math.min(5000, Math.max(2, top)); const grundy = new Array(limit + 1).fill(0); const mark = new Array(limit + 4).fill(-1); for (let n = 3; n <= limit; n += 1) { for (let a = 1; a * 2 <= n; a += 1) mark[grundy[a] ^ grundy[n - a]] = n; let mex = 0; while (mark[mex] === n) mex += 1; grundy[n] = mex; } return values.map((n) => (n > limit ? "first" : (grundy[n] === 0 ? "second" : "first"))); }),
        diagnosis("any-nonzero-move", "A position wins when some move leads to Grundy value zero, which is exactly what the smallest missing value captures; treating every splittable heap as a win ignores that.", function grundysGame(values) { return values.map((n) => (n >= 3 ? "first" : "second")); }),
      ],
      hints: ["grundy[1] and grundy[2] are 0: neither can be split into two different parts.", "For n from 3 up, mark grundy[a] ^ grundy[n − a] for every a with 2a < n and take the smallest value not marked.", "A heap loses exactly when its Grundy value is 0; past the table every heap is a win for the first player."],
      cases: [
        example([[6, 7, 8]], ["first", "second", "first"], "CSES sample"),
        example([[1, 2]], ["second", "second"], "heaps that cannot be split"),
        example([[3, 4, 5]], ["first", "second", "first"], "the first few heaps"),
        example([[10, 20]], ["second", "second"], "two larger losing heaps"),
        hidden("100 000 values up to 10⁶, time limit", () => [GRUNDY_VALUES()]),
      ],
    },
    {
      id: "another-game", title: "Another Game", cses: { id: 2208, name: "Another Game" },
      goal: "A move picks any non-empty set of the non-empty heaps and takes one coin from each. Who wins each test.",
      concept: "Only the parities matter. If every heap is even, whatever the first player takes leaves an odd heap, and the second player can always answer by taking one from exactly the heaps that are now odd, restoring all-even. Since all-even with no coins left is a loss, the first player wins exactly when some heap is odd.",
      functionName: "anotherGame", signature: "anotherGame(tests) → array of \"first\" or \"second\"",
      starterSource: starter("anotherGame", "tests", "Per test, answer \"first\" when some heap is odd and \"second\" when every heap is even."),
      solve: anotherGame, comparator: "deep", brute: anotherGameBrute, small: (round) => [smallHeaps(760 + round, 3, 3, 3)],
      reference: book("25.1", "Game states"),
      presets: { "CSES sample": { a: [1, 2, 3], c: [[1, 2, 3], [2, 2], [5, 5, 4, 5]] }, "all even": { a: [2, 4, 6], c: [[2, 4, 6]] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("xor-rule", "This is not Nim: a move touches many heaps at once, so the xor of the sizes says nothing.", function anotherGame(tests) { return tests.map((heaps) => { let total = 0; for (let i = 0; i < heaps.length; i += 1) total ^= heaps[i]; return total === 0 ? "second" : "first"; }); }),
        diagnosis("all-odd-needed", "One odd heap is enough; the first player does not need every heap to be odd.", function anotherGame(tests) { return tests.map((heaps) => { let allOdd = true; for (let i = 0; i < heaps.length; i += 1) if (heaps[i] % 2 === 0) allOdd = false; return allOdd ? "first" : "second"; }); }),
      ],
      hints: ["Think about what an all-even position allows.", "From all-even, any move creates at least one odd heap, and the reply takes one from exactly the odd heaps.", "So answer \"first\" when some heap is odd, \"second\" when none is."],
      cases: [
        example([[[1, 2, 3], [2, 2], [5, 5, 4, 5]]], ["first", "second", "first"], "CSES sample"),
        example([[[2]]], ["second"], "one even heap"),
        example([[[1]]], ["first"], "one odd heap"),
        example([[[2, 4, 6]]], ["second"], "all even"),
        hidden("100 tests of 2000 heaps, time limit", () => [NIM_TESTS()]),
      ],
    },
  ];
  core.share({ matrixMultiply, matrixPower });
  core.define("math", MATH_II);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

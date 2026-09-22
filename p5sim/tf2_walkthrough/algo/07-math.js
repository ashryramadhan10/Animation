(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;

  // ------------------------------------------------------------------ 7 · mathematics · number theory and combinatorics
  function mulMod(a, b, m) {
    const high = Math.floor(a / 65536), low = a % 65536;
    return ((high * b % m) * 65536 + low * b) % m;
  }
  function modPow(base, exponent, m) {
    let result = 1 % m, factor = base % m, left = exponent;
    while (left > 0) {
      if (left % 2 === 1) result = mulMod(result, factor, m);
      factor = mulMod(factor, factor, m);
      left = Math.floor(left / 2);
    }
    return result;
  }
  function modInverse(a, m) {
    return modPow(a % m, m - 2, m);
  }
  function factorialTables(limit) {
    const m = 1000000007;
    const fact = new Array(limit + 1);
    fact[0] = 1;
    for (let i = 1; i <= limit; i += 1) fact[i] = mulMod(fact[i - 1], i, m);
    const inverseFact = new Array(limit + 1);
    inverseFact[limit] = modInverse(fact[limit], m);
    for (let i = limit; i >= 1; i -= 1) inverseFact[i - 1] = mulMod(inverseFact[i], i, m);
    return { fact, inverseFact };
  }
  function choose(tables, a, b) {
    if (b < 0 || b > a) return 0;
    const m = 1000000007;
    return mulMod(mulMod(tables.fact[a], tables.inverseFact[b], m), tables.inverseFact[a - b], m);
  }
  function smallestPrimeFactor(limit) {
    const spf = new Array(limit + 1).fill(0);
    for (let i = 2; i <= limit; i += 1) {
      if (spf[i] !== 0) continue;
      for (let j = i; j <= limit; j += i) if (spf[j] === 0) spf[j] = i;
    }
    return spf;
  }
  function factorize(spf, x) {
    const out = [];
    let rest = x;
    while (rest > 1) {
      const prime = spf[rest];
      let power = 0;
      while (rest % prime === 0) { rest /= prime; power += 1; }
      out.push([prime, power]);
    }
    return out;
  }
  function josephusQueries(queries) {
    const pick = (n, k) => {
      if (n === 1) return 1;
      const half = Math.floor(n / 2);
      if (k <= half) return 2 * k;
      const inner = pick(n - half, k - half);
      if (n % 2 === 0) return 2 * inner - 1;
      return inner === 1 ? n : 2 * inner - 3;
    };
    return queries.map((query) => pick(query[0], query[1]));
  }
  function exponentiation(queries) {
    const m = 1000000007;
    return queries.map((query) => modPow(query[0], query[1], m));
  }
  function exponentiationII(queries) {
    const m = 1000000007;
    return queries.map((query) => {
      const a = query[0], b = query[1], c = query[2];
      if (a === 0) return b === 0 && c > 0 ? 1 : 0;
      return modPow(a, modPow(b, c, m - 1), m);
    });
  }
  function countingDivisors(values) {
    let top = 1;
    for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i];
    const spf = smallestPrimeFactor(top);
    return values.map((x) => {
      let count = 1;
      const factors = factorize(spf, x);
      for (let i = 0; i < factors.length; i += 1) count *= factors[i][1] + 1;
      return count;
    });
  }
  function commonDivisors(values) {
    let top = 1;
    for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i];
    const present = new Array(top + 1).fill(0);
    for (let i = 0; i < values.length; i += 1) present[values[i]] += 1;
    for (let d = top; d >= 1; d -= 1) {
      let count = 0;
      for (let multiple = d; multiple <= top; multiple += d) count += present[multiple];
      if (count >= 2) return d;
    }
    return 1;
  }
  function sumOfDivisors(n) {
    const m = 1000000007;
    let total = 0, d = 1;
    while (d <= n) {
      const quotient = Math.floor(n / d);
      const last = Math.floor(n / quotient);
      const span = last - d + 1;
      const block = (d + last) % 2 === 0
        ? mulMod(((d + last) / 2) % m, span % m, m)
        : mulMod((d + last) % m, (span / 2) % m, m);
      total = (total + mulMod(block, quotient % m, m)) % m;
      d = last + 1;
    }
    return total;
  }
  function divisorAnalysis(factors) {
    const m = 1000000007, order = 1000000006;
    const n = factors.length;
    let count = 1, sum = 1;
    for (let i = 0; i < n; i += 1) {
      const prime = factors[i][0], power = factors[i][1];
      count = mulMod(count, (power + 1) % m, m);
      const top = (modPow(prime, power + 1, m) - 1 + m) % m;
      sum = mulMod(sum, mulMod(top, modInverse((prime - 1) % m, m), m), m);
    }
    const before = new Array(n + 1).fill(1), after = new Array(n + 1).fill(1);
    for (let i = 0; i < n; i += 1) before[i + 1] = mulMod(before[i], (factors[i][1] + 1) % order, order);
    for (let i = n - 1; i >= 0; i -= 1) after[i] = mulMod(after[i + 1], (factors[i][1] + 1) % order, order);
    let product = 1;
    for (let i = 0; i < n; i += 1) {
      const power = factors[i][1];
      const triangle = power % 2 === 0
        ? mulMod((power / 2) % order, (power + 1) % order, order)
        : mulMod(power % order, ((power + 1) / 2) % order, order);
      const exponent = mulMod(triangle, mulMod(before[i], after[i + 1], order), order);
      product = mulMod(product, modPow(factors[i][0], exponent, m), m);
    }
    return [count, sum, product];
  }
  function primeMultiples(n, primes) {
    const limit = BigInt(n);
    const k = primes.length;
    let total = 0n;
    const walk = (index, product, chosen) => {
      if (index === k) {
        if (chosen > 0) total += (chosen % 2 === 1 ? 1n : -1n) * (limit / product);
        return;
      }
      walk(index + 1, product, chosen);
      const next = product * BigInt(primes[index]);
      if (next <= limit) walk(index + 1, next, chosen + 1);
    };
    walk(0, 1n, 0);
    return String(total);
  }
  function countingCoprimePairs(values) {
    let top = 1;
    for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i];
    const present = new Array(top + 1).fill(0);
    for (let i = 0; i < values.length; i += 1) present[values[i]] += 1;
    const mobius = new Array(top + 1).fill(0);
    mobius[1] = 1;
    for (let i = 1; i <= top; i += 1) {
      if (mobius[i] === 0) continue;
      for (let j = 2 * i; j <= top; j += i) mobius[j] -= mobius[i];
    }
    let total = 0;
    for (let d = 1; d <= top; d += 1) {
      if (mobius[d] === 0) continue;
      let count = 0;
      for (let multiple = d; multiple <= top; multiple += d) count += present[multiple];
      total += mobius[d] * (count * (count - 1) / 2);
    }
    return total;
  }
  function nextPrime(values) {
    const limit = 1000000;
    const composite = new Array(limit + 1).fill(false);
    const primes = [];
    for (let i = 2; i <= limit; i += 1) {
      if (composite[i]) continue;
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) composite[j] = true;
    }
    const isPrime = (x) => {
      if (x < 2) return false;
      for (let i = 0; i < primes.length; i += 1) {
        const p = primes[i];
        if (p * p > x) break;
        if (x % p === 0) return false;
      }
      return true;
    };
    return values.map((n) => {
      let candidate = n + 1;
      while (!isPrime(candidate)) candidate += 1;
      return candidate;
    });
  }
  function binomialCoefficients(queries) {
    let top = 1;
    for (let i = 0; i < queries.length; i += 1) if (queries[i][0] > top) top = queries[i][0];
    const tables = factorialTables(top);
    return queries.map((query) => choose(tables, query[0], query[1]));
  }
  function creatingStringsII(text) {
    const m = 1000000007;
    const counts = new Map();
    for (let i = 0; i < text.length; i += 1) counts.set(text[i], (counts.get(text[i]) || 0) + 1);
    const tables = factorialTables(text.length);
    let answer = tables.fact[text.length];
    counts.forEach((count) => { answer = mulMod(answer, tables.inverseFact[count], m); });
    return answer;
  }
  function distributingApples(n, m) {
    const tables = factorialTables(n + m);
    return choose(tables, n + m - 1, m);
  }
  function christmasParty(n) {
    const m = 1000000007;
    if (n === 1) return 0;
    let previous = 1, current = 0;
    for (let i = 2; i <= n; i += 1) {
      const next = mulMod((i - 1) % m, (current + previous) % m, m);
      previous = current;
      current = next;
    }
    return current;
  }
  function permutationOrder(queries) {
    const fact = [1n];
    for (let i = 1; i <= 20; i += 1) fact.push(fact[i - 1] * BigInt(i));
    return queries.map((query) => {
      const n = query[1];
      if (query[0] === 1) {
        let rank = BigInt(query[2]) - 1n;
        const pool = [];
        for (let v = 1; v <= n; v += 1) pool.push(v);
        const out = [];
        for (let position = n - 1; position >= 0; position -= 1) {
          const block = fact[position];
          const index = Number(rank / block);
          rank %= block;
          out.push(pool[index]);
          pool.splice(index, 1);
        }
        return out;
      }
      const permutation = query[2];
      const pool = [];
      for (let v = 1; v <= n; v += 1) pool.push(v);
      let rank = 0n;
      for (let i = 0; i < n; i += 1) {
        const index = pool.indexOf(permutation[i]);
        rank += BigInt(index) * fact[n - 1 - i];
        pool.splice(index, 1);
      }
      return String(rank + 1n);
    });
  }
  function permutationRounds(permutation) {
    const n = permutation.length;
    const m = 1000000007;
    const spf = smallestPrimeFactor(n);
    const seen = new Array(n + 1).fill(false);
    const strongest = new Map();
    for (let start = 1; start <= n; start += 1) {
      if (seen[start]) continue;
      let length = 0, v = start;
      while (!seen[v]) { seen[v] = true; v = permutation[v - 1]; length += 1; }
      const factors = factorize(spf, length);
      for (let i = 0; i < factors.length; i += 1) {
        const prime = factors[i][0], power = factors[i][1];
        if (!strongest.has(prime) || strongest.get(prime) < power) strongest.set(prime, power);
      }
    }
    let answer = 1;
    strongest.forEach((power, prime) => { answer = mulMod(answer, modPow(prime, power, m), m); });
    return answer;
  }
  function bracketSequencesI(n) {
    const m = 1000000007;
    if (n % 2 !== 0) return 0;
    const tables = factorialTables(n + 1);
    const half = n / 2;
    return mulMod(choose(tables, n, half), modInverse(half + 1, m), m);
  }
  function bracketSequencesII(n, prefix) {
    const m = 1000000007;
    let depth = 0;
    for (let i = 0; i < prefix.length; i += 1) {
      depth += prefix[i] === "(" ? 1 : -1;
      if (depth < 0) return 0;
    }
    const rest = n - prefix.length;
    if (rest < depth || (rest - depth) % 2 !== 0) return 0;
    const tables = factorialTables(n + 1);
    const ups = (rest - depth) / 2;
    const inside = choose(tables, rest, ups);
    const outside = ups >= 1 ? choose(tables, rest, ups - 1) : 0;
    return (inside - outside + m) % m;
  }
  function countingNecklaces(n, m) {
    const p = 1000000007;
    const totient = (x) => {
      let result = x, rest = x;
      for (let d = 2; d * d <= rest; d += 1) {
        if (rest % d !== 0) continue;
        while (rest % d === 0) rest /= d;
        result = result / d * (d - 1);
      }
      if (rest > 1) result = result / rest * (rest - 1);
      return result;
    };
    let total = 0;
    for (let d = 1; d * d <= n; d += 1) {
      if (n % d !== 0) continue;
      const other = n / d;
      total = (total + mulMod(totient(other) % p, modPow(m, d, p), p)) % p;
      if (other !== d) total = (total + mulMod(totient(d) % p, modPow(m, other, p), p)) % p;
    }
    return mulMod(total, modInverse(n % p, p), p);
  }
  function countingGrids(n) {
    const p = 1000000007, order = 1000000006n;
    const side = BigInt(n);
    const cells = side * side;
    const odd = side % 2n === 1n;
    const quarter = odd ? (cells - 1n) / 4n + 1n : cells / 4n;
    const half = odd ? (cells - 1n) / 2n + 1n : cells / 2n;
    const powerOfTwo = (exponent) => modPow(2, Number(exponent % order), p);
    const total = (powerOfTwo(cells) + 2 * powerOfTwo(quarter) + powerOfTwo(half)) % p;
    return mulMod(total, modInverse(4, p), p);
  }

  // ------------------------------------------------------------------ brute forces and checks for the stress tests
  const BIG_MOD = 1000000007n;
  function bigPowMod(base, exponent, m) {
    let result = 1n, factor = base % m, left = exponent;
    while (left > 0n) {
      if (left & 1n) result = result * factor % m;
      factor = factor * factor % m;
      left >>= 1n;
    }
    return result;
  }
  function gcd(a, b) { let x = a, y = b; while (y) { const t = x % y; x = y; y = t; } return x; }
  function josephusBrute(queries) {
    return queries.map((query) => {
      const circle = [];
      for (let v = 1; v <= query[0]; v += 1) circle.push(v);
      let at = 0;
      for (let step = 0; step < query[1] - 1; step += 1) {
        at = (at + 1) % circle.length;
        circle.splice(at, 1);
        at %= Math.max(1, circle.length);
      }
      return circle[(at + 1) % circle.length];
    });
  }
  function exponentiationBrute(queries) {
    return queries.map((query) => Number(bigPowMod(BigInt(query[0]), BigInt(query[1]), BIG_MOD)));
  }
  function exponentiationIIBrute(queries) {
    return queries.map((query) => {
      const a = BigInt(query[0]), b = BigInt(query[1]), c = BigInt(query[2]);
      let exponent = 1n;
      for (let i = 0n; i < c; i += 1n) exponent *= b;
      if (a === 0n) return exponent === 0n ? 1 : 0;
      return Number(bigPowMod(a, exponent, BIG_MOD));
    });
  }
  function divisorsOf(x) {
    const out = [];
    for (let d = 1; d * d <= x; d += 1) {
      if (x % d !== 0) continue;
      out.push(d);
      if (d !== x / d) out.push(x / d);
    }
    return out.sort((p, q) => p - q);
  }
  function countingDivisorsBrute(values) { return values.map((x) => divisorsOf(x).length); }
  function commonDivisorsBrute(values) {
    let best = 1;
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) best = Math.max(best, gcd(values[i], values[j]));
    }
    return best;
  }
  function sumOfDivisorsBrute(n) {
    let total = 0n;
    for (let i = 1; i <= n; i += 1) total += BigInt(i) * BigInt(Math.floor(n / i));
    return Number(total % BIG_MOD);
  }
  function divisorAnalysisBrute(factors) {
    let value = 1n;
    for (let i = 0; i < factors.length; i += 1) value *= BigInt(factors[i][0]) ** BigInt(factors[i][1]);
    const divisors = [];
    for (let d = 1n; d * d <= value; d += 1n) {
      if (value % d !== 0n) continue;
      divisors.push(d);
      if (d !== value / d) divisors.push(value / d);
    }
    let sum = 0n, product = 1n;
    for (let i = 0; i < divisors.length; i += 1) { sum += divisors[i]; product = product * (divisors[i] % BIG_MOD) % BIG_MOD; }
    return [divisors.length % 1000000007, Number(sum % BIG_MOD), Number(product)];
  }
  function primeMultiplesBrute(n, primes) {
    let count = 0;
    for (let v = 1; v <= Number(n); v += 1) {
      for (let i = 0; i < primes.length; i += 1) if (v % primes[i] === 0) { count += 1; break; }
    }
    return String(count);
  }
  function coprimePairsBrute(values) {
    let count = 0;
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) if (gcd(values[i], values[j]) === 1) count += 1;
    }
    return count;
  }
  function nextPrimeBrute(values) {
    const isPrime = (x) => { if (x < 2) return false; for (let d = 2; d * d <= x; d += 1) if (x % d === 0) return false; return true; };
    return values.map((n) => { let candidate = n + 1; while (!isPrime(candidate)) candidate += 1; return candidate; });
  }
  function bigChoose(a, b) {
    if (b < 0 || b > a) return 0n;
    let result = 1n;
    for (let i = 0; i < b; i += 1) result = result * BigInt(a - i) / BigInt(i + 1);
    return result;
  }
  function binomialBrute(queries) { return queries.map((query) => Number(bigChoose(query[0], query[1]) % BIG_MOD)); }
  function creatingStringsIIBrute(text) {
    const counts = new Map();
    for (let i = 0; i < text.length; i += 1) counts.set(text[i], (counts.get(text[i]) || 0) + 1);
    let result = 1n;
    for (let i = 1; i <= text.length; i += 1) result *= BigInt(i);
    counts.forEach((count) => { let f = 1n; for (let i = 1; i <= count; i += 1) f *= BigInt(i); result /= f; });
    return Number(result % BIG_MOD);
  }
  function distributingApplesBrute(n, m) {
    let ways = new Array(m + 1).fill(0);
    ways[0] = 1n;
    for (let i = 0; i <= m; i += 1) ways[i] = i === 0 ? 1n : 0n;
    for (let child = 1; child <= n; child += 1) {
      const next = new Array(m + 1).fill(0n);
      let running = 0n;
      for (let apples = 0; apples <= m; apples += 1) { running += ways[apples]; next[apples] = running; }
      ways = next;
    }
    return Number(ways[m] % BIG_MOD);
  }
  function permutationsOf(n) {
    const out = [];
    const used = new Array(n + 1).fill(false);
    const current = [];
    const walk = () => {
      if (current.length === n) { out.push(current.slice()); return; }
      for (let v = 1; v <= n; v += 1) {
        if (used[v]) continue;
        used[v] = true;
        current.push(v);
        walk();
        current.pop();
        used[v] = false;
      }
    };
    walk();
    return out;
  }
  function christmasPartyBrute(n) {
    if (n > 8) return null;
    let count = 0;
    permutationsOf(n).forEach((perm) => {
      let ok = true;
      for (let i = 0; i < n; i += 1) if (perm[i] === i + 1) ok = false;
      if (ok) count += 1;
    });
    return count % 1000000007;
  }
  function permutationOrderBrute(queries) {
    return queries.map((query) => {
      const n = query[1];
      const all = permutationsOf(n);
      if (query[0] === 1) return all[Number(BigInt(query[2]) - 1n)];
      const target = query[2].join(",");
      for (let i = 0; i < all.length; i += 1) if (all[i].join(",") === target) return String(i + 1);
      return "0";
    });
  }
  function permutationRoundsBrute(permutation) {
    const n = permutation.length;
    let current = [];
    for (let v = 1; v <= n; v += 1) current.push(v);
    for (let round = 1; round <= 100000; round += 1) {
      const next = new Array(n);
      for (let i = 0; i < n; i += 1) next[permutation[i] - 1] = current[i];
      current = next;
      let sorted = true;
      for (let i = 0; i < n; i += 1) if (current[i] !== i + 1) sorted = false;
      if (sorted) return round % 1000000007;
    }
    return -1;
  }
  function bracketStrings(n) {
    const out = [];
    const walk = (text, depth) => {
      if (text.length === n) { if (depth === 0) out.push(text); return; }
      walk(text + "(", depth + 1);
      if (depth > 0) walk(text + ")", depth - 1);
    };
    walk("", 0);
    return out;
  }
  function bracketSequencesIBrute(n) { return n > 16 ? null : bracketStrings(n).length % 1000000007; }
  function bracketSequencesIIBrute(n, prefix) {
    if (n > 16) return null;
    let count = 0;
    bracketStrings(n).forEach((text) => { if (text.slice(0, prefix.length) === prefix) count += 1; });
    return count % 1000000007;
  }
  function countingNecklacesBrute(n, m) {
    if (Math.pow(m, n) > 200000) return null;
    const seen = new Set();
    const total = Math.pow(m, n);
    for (let code = 0; code < total; code += 1) {
      const pearls = [];
      let rest = code;
      for (let i = 0; i < n; i += 1) { pearls.push(rest % m); rest = Math.floor(rest / m); }
      let best = null;
      for (let shift = 0; shift < n; shift += 1) {
        const rotated = pearls.slice(shift).concat(pearls.slice(0, shift)).join(",");
        if (best === null || rotated < best) best = rotated;
      }
      seen.add(best);
    }
    return seen.size % 1000000007;
  }
  function countingGridsBrute(n) {
    if (n > 3) return null;
    const cells = n * n;
    const rotate = (grid) => {
      const out = new Array(cells).fill(0);
      for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) out[c * n + (n - 1 - r)] = grid[r * n + c];
      return out;
    };
    const seen = new Set();
    for (let code = 0; code < (1 << cells); code += 1) {
      const grid = [];
      for (let i = 0; i < cells; i += 1) grid.push((code >> i) & 1);
      let best = null, current = grid;
      for (let turn = 0; turn < 4; turn += 1) {
        const text = current.join("");
        if (best === null || text < best) best = text;
        current = rotate(current);
      }
      seen.add(best);
    }
    return seen.size % 1000000007;
  }

  // ------------------------------------------------------------------ generators
  function smallPairs(seed, count, lo, hi) {
    const a = randomInts(seed, count, lo, hi), b = randomInts(seed + 1, count, lo, hi);
    return a.map((v, i) => [v, b[i]]);
  }
  function smallJosephus(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) { const n = 1 + Math.floor(next() * top); out.push([n, 1 + Math.floor(next() * n)]); }
    return out;
  }
  function smallBinomials(seed, count, top) {
    const next = rng(seed);
    const out = [];
    for (let i = 0; i < count; i += 1) { const a = Math.floor(next() * (top + 1)); out.push([a, Math.floor(next() * (a + 1))]); }
    return out;
  }
  function randomLetters(seed, count, alphabet) {
    const next = rng(seed);
    let out = "";
    for (let i = 0; i < count; i += 1) out += alphabet[Math.floor(next() * alphabet.length)];
    return out;
  }
  function randomFactors(seed, count, primeTop, powerTop) {
    const next = rng(seed);
    const spf = smallestPrimeFactor(primeTop);
    const picked = [];
    for (let i = 2; i <= primeTop && picked.length < count; i += 1) {
      if (spf[i] === i) picked.push([i, 1 + Math.floor(next() * powerTop)]);
    }
    return picked;
  }
  function primeList(limit, count, seed) {
    const spf = smallestPrimeFactor(limit);
    const primes = [];
    for (let i = 2; i <= limit; i += 1) if (spf[i] === i) primes.push(i);
    if (!count) return primes;
    const next = rng(seed || 1);
    const picked = [];
    const used = new Set();
    while (picked.length < count) {
      const prime = primes[Math.floor(next() * primes.length)];
      if (used.has(prime)) continue;
      used.add(prime);
      picked.push(prime);
    }
    return picked.sort((p, q) => p - q);
  }
  function smallPermutation(seed, n) { return randomPermutation(seed, n); }

  const EXPONENT_QUERIES = lazy(() => smallPairs(101, BIG, 0, 1000000000));
  const EXPONENT_II_QUERIES = lazy(() => { const a = randomInts(103, 100000, 0, 1000000000), b = randomInts(104, 100000, 0, 1000000000), c = randomInts(105, 100000, 0, 1000000000); return a.map((v, i) => [v, b[i], c[i]]); });
  const JOSEPHUS_QUERIES = lazy(() => smallJosephus(106, 100000, 1000000000));
  const DIVISOR_VALUES = lazy(() => randomInts(107, 100000, 1, 1000000));
  const MILLION_VALUES = lazy(() => randomInts(108, BIG, 1, 1000000));
  const COPRIME_VALUES = lazy(() => randomInts(109, 100000, 1, 1000000));
  const NEXT_PRIME_VALUES = lazy(() => randomInts(110, 20, 1, 1000000000000));
  const BINOMIAL_QUERIES = lazy(() => smallBinomials(111, 100000, 1000000));
  const LETTERS_BIG = lazy(() => randomLetters(112, 1000000, "abcdefghijklmnopqrstuvwxyz"));
  const FACTOR_LIST = lazy(() => randomFactors(113, 30000, 1000000, 1000000000));
  const BIG_PRIMES = lazy(() => primeList(1000, 20, 114));
  const PERMUTATION_BIG = lazy(() => randomPermutation(115, BIG));
  const PERMUTATION_ORDER_QUERIES = lazy(() => {
    const next = rng(116);
    let total = 1n;
    for (let i = 1; i <= 20; i += 1) total *= BigInt(i);
    const out = [];
    for (let i = 0; i < 1000; i += 1) {
      if (i % 2 === 0) {
        let k = 0n;
        for (let d = 0; d < 7; d += 1) k = k * 1000n + BigInt(Math.floor(next() * 1000));
        out.push([1, 20, String(k % total + 1n)]);
      } else {
        out.push([2, 20, randomPermutation(117 + i, 20)]);
      }
    }
    return out;
  });
  const BRACKET_PREFIX = lazy(() => "(".repeat(300000));

  const sampleTables = () => factorialTables(12);
  const sampleSpf = () => smallestPrimeFactor(60);

  const MATH = [
    {
      id: "josephus-queries", title: "Josephus Queries", cses: { id: 2164, name: "Josephus Queries" },
      goal: "For each query [n, k], which of n children standing in a circle is the k-th to be removed when every second child leaves, starting with child 2.",
      concept: "The first pass removes 2, 4, 6, …, so for k in the first half the answer is simply 2k. Past that the survivors are the odd children, which is the same puzzle on about half as many, and the answer is translated back. Each step halves n, so a query costs about 30 steps.",
      functionName: "josephusQueries", signature: "josephusQueries(queries) → answers",
      starterSource: starter("josephusQueries", "queries", "pick(n, k): n === 1 → 1; k ≤ ⌊n/2⌋ → 2k; otherwise recurse on (n − ⌊n/2⌋, k − ⌊n/2⌋) and translate."),
      solve: josephusQueries, comparator: "deep", brute: josephusBrute, small: (round) => [smallJosephus(200 + round, 4, 1 + (round % 12))],
      reference: book("21.4", "Number theory · other results"),
      presets: { "CSES sample": { c: [[7, 1], [7, 3], [2, 2], [1337, 1313]] }, "first half": { c: [[10, 1], [10, 2], [10, 5]] }, "one child": { c: [[1, 1]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("halves-without-parity", "After the first pass an even n leaves the pointer past the last child and an odd n leaves it on the last survivor; the translation back differs.", function josephusQueries(queries) { const pick = (n, k) => { if (n === 1) return 1; const half = Math.floor(n / 2); if (k <= half) return 2 * k; return 2 * pick(n - half, k - half) - 1; }; return queries.map((query) => pick(query[0], query[1])); }),
        diagnosis("first-half-off-by-one", "The k-th child removed in the first pass is 2k, not 2k − 1: counting starts by skipping child 1.", function josephusQueries(queries) { const pick = (n, k) => { if (n === 1) return 1; const half = Math.floor(n / 2); if (k <= half) return 2 * k - 1; const inner = pick(n - half, k - half); if (n % 2 === 0) return 2 * inner - 1; return inner === 1 ? n : 2 * inner - 3; }; return queries.map((query) => pick(query[0], query[1])); }),
      ],
      hints: ["half = ⌊n/2⌋ children leave in the first pass: the k-th of them is child 2k.", "For larger k the survivors are the odd children; recurse with n − half children and k − half removals.", "Translate the inner answer: even n gives 2·inner − 1; odd n gives n when inner is 1 and 2·inner − 3 otherwise."],
      cases: [
        example([[[7, 1], [7, 3], [2, 2], [1337, 1313]]], [2, 6, 1, 1107], "CSES sample"),
        example([[[1, 1]]], [1], "one child"),
        example([[[10, 1], [10, 2], [10, 5]]], [2, 4, 10], "the whole first pass"),
        run(josephusQueries, [[[7, 4], [7, 7]]], "after the first pass"),
        hidden("q = 100 000, n up to 10⁹, time limit", () => [JOSEPHUS_QUERIES()]),
      ],
    },
    {
      id: "mul-mod", title: "Multiply Modulo", cses: { id: 1095, name: "Exponentiation (brick)" },
      goal: "(a · b) mod m for a, b below m and m up to about 10⁹, exactly.",
      concept: "JavaScript numbers are exact only up to 2⁵³ ≈ 9·10¹⁵, and two factors near 10⁹ multiply to 10¹⁸, so the plain product silently rounds. Splitting a into a high and a low half of 16 bits keeps every partial product inside the exact range.",
      functionName: "mulMod", signature: "mulMod(a, b, m) → number",
      starterSource: starter("mulMod", "a, b, m", "high = ⌊a / 65536⌋, low = a mod 65536; ((high · b mod m) · 65536 + low · b) mod m."),
      solve: mulMod, comparator: "scalar", brute: (a, b, m) => Number(BigInt(a) * BigInt(b) % BigInt(m)), small: (round) => { const next = rng(300 + round); return [Math.floor(next() * 1000000007), Math.floor(next() * 1000000007), 1000000007]; },
      reference: book("21.2", "Modular arithmetic"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "a", type: "slider", label: "a (rounded)", value: 999999937, min: 0, max: 1000000006 },
        { id: "b", type: "slider", label: "b (rounded)", value: 999999917, min: 0, max: 1000000006 },
      ], args: [{ fixture: "roundedA" }, { fixture: "roundedB" }, 1000000007] },
      diagnoses: [
        diagnosis("plain-product", "a · b overflows the exact range of a double once the factors pass about 10⁸, and the result is quietly wrong.", function mulMod(a, b, m) { return a * b % m; }),
        diagnosis("high-part-unshifted", "The high half stands for 65536 · high, so its product has to be multiplied by 65536 again after the modulo.", function mulMod(a, b, m) { const high = Math.floor(a / 65536), low = a % 65536; return ((high * b % m) + low * b) % m; }),
      ],
      hints: ["Split a: high = Math.floor(a / 65536) and low = a % 65536, so a = 65536 · high + low.", "high · b is at most about 1.5·10¹³ and stays exact; reduce it modulo m before scaling.", "Answer = ((high · b % m) · 65536 + low · b) % m."],
      cases: [
        example([999999937, 999999917, 1000000007], 6300, "two large primes"),
        example([2, 3, 1000000007], 6, "small numbers"),
        example([1000000006, 1000000006, 1000000007], 1, "both are −1"),
        run(mulMod, [123456789, 987654321, 1000000007], "nine digits each"),
      ],
    },
    {
      id: "mod-pow", title: "Modular Exponentiation", cses: { id: 1095, name: "Exponentiation (brick)" },
      goal: "base^exponent mod m, with 0^0 = 1.",
      concept: "Square and multiply: reading the exponent in binary, each bit either contributes the current square or not, so one multiplication and one squaring per bit gives about 30 steps instead of a billion.",
      functionName: "modPow", signature: "modPow(base, exponent, m) → number",
      starterSource: starter("modPow", "base, exponent, m", "result = 1 % m; while the exponent is left, use mulMod for the odd bit, square the factor and halve the exponent."),
      solve: modPow, comparator: "scalar", dependencies: ["mul-mod"], brute: (base, exponent, m) => Number(bigPowMod(BigInt(base), BigInt(exponent), BigInt(m))), small: (round) => { const next = rng(310 + round); return [Math.floor(next() * 1000000007), Math.floor(next() * 1000000000), 1000000007]; },
      reference: book("21.2", "Modular arithmetic · exponentiation"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "a", type: "slider", label: "base (rounded)", value: 3, min: 0, max: 100 },
        { id: "b", type: "slider", label: "exponent (rounded)", value: 4, min: 0, max: 100 },
      ], args: [{ fixture: "roundedA" }, { fixture: "roundedB" }, 1000000007] },
      diagnoses: [
        diagnosis("float-power", "Math.pow builds the whole power as a floating-point number, which loses every digit past 2⁵³ before the modulo can help.", function modPow(base, exponent, m) { return Math.pow(base, exponent) % m; }),
        diagnosis("squares-after-use", "The factor must be squared on every bit, not only on the bits that are set.", function modPow(base, exponent, m) { let result = 1 % m, factor = base % m, left = exponent; while (left > 0) { if (left % 2 === 1) { result = mulMod(result, factor, m); factor = mulMod(factor, factor, m); } left = Math.floor(left / 2); } return result; }),
      ],
      hints: ["result = 1 % m, factor = base % m, left = exponent.", "While left > 0: if left is odd, result = mulMod(result, factor, m).", "Then factor = mulMod(factor, factor, m) and left = Math.floor(left / 2), on every pass."],
      cases: [
        example([3, 4, 1000000007], 81, "three to the fourth"),
        example([0, 0, 1000000007], 1, "zero to the zero is one"),
        run(modPow, [2, 1000000000, 1000000007], "a billion bits of exponent"),
        example([123, 123, 1000000007], 921450052, "CSES sample line"),
      ],
    },
    {
      id: "exponentiation", title: "Exponentiation", cses: { id: 1095, name: "Exponentiation" },
      goal: "For each query [a, b], a^b modulo 10⁹ + 7, with 0^0 = 1.",
      concept: "One call to the square-and-multiply brick per query. Nothing is shared between queries, so the whole batch costs about 30 multiplications each.",
      functionName: "exponentiation", signature: "exponentiation(queries) → answers",
      starterSource: starter("exponentiation", "queries", "Map each [a, b] to modPow(a, b, 1000000007)."),
      solve: exponentiation, comparator: "deep", dependencies: ["mod-pow"], brute: exponentiationBrute, small: (round) => [smallPairs(320 + round, 4, 0, 1000)],
      reference: book("21.2", "Modular arithmetic · exponentiation"),
      presets: { "CSES sample": { c: [[3, 4], [2, 8], [123, 123]] }, "zero cases": { c: [[0, 0], [0, 5], [5, 0]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("no-mod", "Take the result modulo 10⁹ + 7; a^b is astronomically large.", function exponentiation(queries) { return queries.map((query) => Math.pow(query[0], query[1])); }),
        diagnosis("zero-power-zero", "This task defines 0^0 as 1.", function exponentiation(queries) { const m = 1000000007; return queries.map((query) => (query[1] === 0 && query[0] === 0 ? 0 : modPow(query[0], query[1], m))); }),
      ],
      hints: ["The modulus is 10⁹ + 7.", "modPow already handles an exponent of 0 by starting from 1.", "Return the answers in query order."],
      cases: [
        example([[[3, 4], [2, 8], [123, 123]]], [81, 256, 921450052], "CSES sample"),
        example([[[0, 0]]], [1], "zero to the zero"),
        example([[[0, 5], [5, 0]]], [0, 1], "zero base and zero exponent"),
        hidden("n = 200 000 queries, time limit", () => [EXPONENT_QUERIES()]),
      ],
    },
    {
      id: "exponentiation-ii", title: "Exponentiation II", cses: { id: 1712, name: "Exponentiation II" },
      goal: "For each query [a, b, c], a^(b^c) modulo 10⁹ + 7, with 0^0 = 1.",
      concept: "The exponent b^c is far too large to build. Fermat's little theorem says a^(p−1) ≡ 1 for a prime p not dividing a, so the exponent only matters modulo p − 1. That reduces the tower to two ordinary modular powers. A base of 0 has to be handled apart, because Fermat does not apply.",
      functionName: "exponentiationII", signature: "exponentiationII(queries) → answers",
      starterSource: starter("exponentiationII", "queries", "a === 0 → 1 when b === 0 and c > 0, else 0; otherwise modPow(a, modPow(b, c, m − 1), m)."),
      solve: exponentiationII, comparator: "deep", dependencies: ["mod-pow"], brute: exponentiationIIBrute, small: (round) => { const next = rng(330 + round); const out = []; for (let i = 0; i < 4; i += 1) out.push([Math.floor(next() * 20), Math.floor(next() * 5), Math.floor(next() * 4)]); return [out]; },
      reference: book("21.2", "Modular arithmetic · Fermat's theorem"),
      presets: { "CSES sample": { c: [[3, 7, 1], [15, 2, 2], [3, 4, 5]] }, "zero cases": { c: [[0, 0, 0], [0, 0, 5], [0, 3, 0], [2, 0, 4]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("reduces-modulo-p", "The exponent is reduced modulo p − 1, not modulo p: that is what Fermat's theorem gives.", function exponentiationII(queries) { const m = 1000000007; return queries.map((query) => { const a = query[0], b = query[1], c = query[2]; if (a === 0) return b === 0 && c > 0 ? 1 : 0; return modPow(a, modPow(b, c, m), m); }); }),
        diagnosis("zero-base", "A base of 0 is not covered by Fermat: 0^(b^c) is 1 only when b^c is 0, which happens when b is 0 and c is positive.", function exponentiationII(queries) { const m = 1000000007; return queries.map((query) => modPow(query[0], modPow(query[1], query[2], m - 1), m)); }),
      ],
      hints: ["The modulus p = 10⁹ + 7 is prime, so a^(p−1) ≡ 1 for every a from 1 to p − 1.", "Inner power: modPow(b, c, p − 1) gives b^c reduced to what the outer power needs.", "Handle a === 0 before that: the answer is 1 when b === 0 and c > 0, otherwise 0."],
      cases: [
        example([[[3, 7, 1], [15, 2, 2], [3, 4, 5]]], [2187, 50625, 763327764], "CSES sample"),
        example([[[0, 0, 0]]], [0], "zero to the zero to the zero"),
        example([[[0, 0, 5], [0, 3, 0], [2, 0, 4]]], [1, 0, 1], "the zero corners"),
        example([[[0, 1000000006, 1]]], [0], "zero base with an exponent that vanishes modulo p − 1"),
        hidden("n = 100 000 queries, time limit", () => [EXPONENT_II_QUERIES()]),
      ],
    },
    {
      id: "smallest-prime-factor", title: "Smallest Prime Factor Sieve", cses: { id: 1713, name: "Counting Divisors (brick)" },
      goal: "An array where entry i holds the smallest prime that divides i, for i up to limit (entries 0 and 1 stay 0).",
      concept: "One sieve pass gives more than a list of primes. Walking each prime and stamping its untouched multiples records, for every number, the first prime that reached it, which is enough to factorise any number below the limit in a handful of divisions.",
      functionName: "smallestPrimeFactor", signature: "smallestPrimeFactor(limit) → number[]",
      starterSource: starter("smallestPrimeFactor", "limit", "For i from 2: if spf[i] is still 0 then i is prime, so stamp spf[j] = i for every multiple j that is still 0."),
      solve: smallestPrimeFactor, comparator: "deep", brute: (limit) => { const out = new Array(limit + 1).fill(0); for (let i = 2; i <= limit; i += 1) { for (let d = 2; d <= i; d += 1) if (i % d === 0) { out[i] = d; break; } } return out; }, small: (round) => [1 + (round % 40)],
      reference: book("21.1", "Primes and factors · sieve of Eratosthenes"),
      scene: { kind: "algo", view: "bars", handles: [{ id: "n", type: "slider", label: "limit (rounded)", value: 20, min: 1, max: 40 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("largest-prime-factor", "Only the first prime to reach a number may stamp it; overwriting leaves the largest factor instead of the smallest.", function smallestPrimeFactor(limit) { const spf = new Array(limit + 1).fill(0); for (let i = 2; i <= limit; i += 1) { if (spf[i] !== 0 && spf[i] !== i) continue; for (let j = i; j <= limit; j += i) spf[j] = i; } return spf; }),
        diagnosis("skips-the-prime-itself", "A prime's own entry is itself, so the stamping starts at i, not at 2i.", function smallestPrimeFactor(limit) { const spf = new Array(limit + 1).fill(0); for (let i = 2; i <= limit; i += 1) { if (spf[i] !== 0) continue; for (let j = 2 * i; j <= limit; j += i) if (spf[j] === 0) spf[j] = i; } return spf; }),
      ],
      hints: ["Start with an array of limit + 1 zeros.", "For i from 2 to limit: a zero at i means i is prime.", "Then for j = i, 2i, 3i, … set spf[j] = i only where spf[j] is still 0."],
      cases: [
        example([10], [0, 0, 2, 3, 2, 5, 2, 7, 2, 3, 2], "up to ten"),
        example([1], [0, 0], "nothing to sieve"),
        example([2], [0, 0, 2], "just two"),
        example([16], [0, 0, 2, 3, 2, 5, 2, 7, 2, 3, 2, 11, 2, 13, 2, 3, 2], "up to sixteen"),
        hidden("limit = 200 000, time limit", () => [200000]),
      ],
    },
    {
      id: "factorize", title: "Factorise with the Sieve", cses: { id: 1713, name: "Counting Divisors (brick)" },
      goal: "The prime factorisation of x as [prime, exponent] pairs in increasing order of prime, using a smallest-prime-factor array.",
      concept: "Divide out the smallest prime factor repeatedly. Each division at least halves the number, so a factorisation costs at most about 20 steps instead of a trial division up to the square root.",
      functionName: "factorize", signature: "factorize(spf, x) → [[prime, exponent], …]",
      starterSource: starter("factorize", "spf, x", "While x > 1: prime = spf[x]; count how many times it divides; push [prime, count]."),
      solve: factorize, comparator: "deep", brute: (spf, x) => { const out = []; let rest = x; for (let d = 2; d * d <= rest; d += 1) { if (rest % d !== 0) continue; let power = 0; while (rest % d === 0) { rest /= d; power += 1; } out.push([d, power]); } if (rest > 1) out.push([rest, 1]); return out; }, small: (round) => [sampleSpf(), 1 + (round % 60)],
      reference: book("21.1", "Primes and factors · factorisation"),
      presets: { "up to 60": { a: 60 } },
      scene: { kind: "algo", view: "number", handles: preset([{ id: "x", type: "slider", label: "x (rounded)", value: 18, min: 1, max: 60 }]), args: [{ fixture: "spfTable" }, { fixture: "roundedX" }] },
      diagnoses: [
        diagnosis("one-copy-each", "A prime can divide x several times; count the copies instead of dividing once.", function factorize(spf, x) { const out = []; let rest = x; while (rest > 1) { const prime = spf[rest]; rest /= prime; out.push([prime, 1]); } return out; }),
        diagnosis("includes-one", "1 has no prime factors, so the loop must stop at 1 rather than reporting it.", function factorize(spf, x) { const out = []; let rest = x; while (rest >= 1) { if (rest === 1) { out.push([1, 1]); break; } const prime = spf[rest]; let power = 0; while (rest % prime === 0) { rest /= prime; power += 1; } out.push([prime, power]); } return out; }),
      ],
      hints: ["rest = x; loop while rest > 1.", "prime = spf[rest]; divide rest by prime while it divides, counting the divisions.", "Push [prime, count] and continue; the primes come out in increasing order."],
      cases: [
        example([sampleSpf(), 18], [[2, 1], [3, 2]], "eighteen"),
        example([sampleSpf(), 1], [], "one has no factors"),
        example([sampleSpf(), 32], [[2, 5]], "a power of two"),
        example([sampleSpf(), 59], [[59, 1]], "a prime"),
      ],
    },
    {
      id: "counting-divisors", title: "Counting Divisors", cses: { id: 1713, name: "Counting Divisors" },
      goal: "For each of the given numbers, how many divisors it has.",
      concept: "A divisor picks, independently for each prime, how many copies to take: from 0 up to its exponent. So the count is the product of (exponent + 1). One sieve up to the largest input serves every query.",
      functionName: "countingDivisors", signature: "countingDivisors(values) → answers",
      starterSource: starter("countingDivisors", "values", "spf = smallestPrimeFactor(largest value); per value multiply (exponent + 1) over factorize(spf, value)."),
      solve: countingDivisors, comparator: "deep", dependencies: ["smallest-prime-factor", "factorize"], brute: countingDivisorsBrute, small: (round) => [randomInts(340 + round, 4, 1, 200)],
      reference: book("21.1", "Primes and factors · number of divisors"),
      presets: { "CSES sample": { a: [16, 17, 18] }, "highly divisible": { a: [720720, 1000000, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("counts-primes", "The number of distinct primes is not the number of divisors; every choice of exponents gives one.", function countingDivisors(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const spf = smallestPrimeFactor(top); return values.map((x) => factorize(spf, x).length); }),
        diagnosis("exponent-not-plus-one", "Taking 0 copies of a prime is also a choice, so each factor contributes exponent + 1.", function countingDivisors(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const spf = smallestPrimeFactor(top); return values.map((x) => { let count = 1; const factors = factorize(spf, x); for (let i = 0; i < factors.length; i += 1) count *= Math.max(1, factors[i][1]); return count; }); }),
      ],
      hints: ["Sieve once, up to the largest value in the list.", "Factorise each value with the sieve.", "Multiply (exponent + 1) over its prime factors; 1 has no factors and so has 1 divisor."],
      cases: [
        example([[16, 17, 18]], [5, 2, 6], "CSES sample"),
        example([[1]], [1], "one"),
        example([[720720]], [240], "a highly divisible number"),
        example([[999983, 1000000]], [2, 49], "a large prime and a large power"),
        hidden("n = 100 000 values up to 10⁶, time limit", () => [DIVISOR_VALUES()]),
      ],
    },
    {
      id: "common-divisors", title: "Common Divisors", cses: { id: 1081, name: "Common Divisors" },
      goal: "The largest number that divides at least two of the given values.",
      concept: "Turn it around: instead of trying pairs, ask for each candidate d how many values it divides, by walking its multiples through a presence table. The largest d that reaches two values is the answer, and the whole sweep costs about M log M.",
      functionName: "commonDivisors", signature: "commonDivisors(values) → number",
      starterSource: starter("commonDivisors", "values", "present[v] counts the values equal to v; for d from the largest down, sum present over the multiples of d and stop at the first count ≥ 2."),
      solve: commonDivisors, comparator: "scalar", brute: commonDivisorsBrute, small: (round) => [randomInts(350 + round, 2 + (round % 6), 1, 60)],
      reference: book("21.1", "Primes and factors · divisors"),
      presets: { "CSES sample": { a: [3, 14, 15, 7, 9] }, "two equal": { a: [6, 6, 5] }, coprime: { a: [2, 3, 5] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("largest-value", "The answer divides two of the values; it is rarely one of them.", function commonDivisors(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; return top; }),
        diagnosis("counts-one", "A divisor of a single value is not a common divisor; the count has to reach two.", function commonDivisors(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const present = new Array(top + 1).fill(0); for (let i = 0; i < values.length; i += 1) present[values[i]] += 1; for (let d = top; d >= 1; d -= 1) { let count = 0; for (let multiple = d; multiple <= top; multiple += d) count += present[multiple]; if (count >= 1) return d; } return 1; }),
      ],
      hints: ["Build present[] over 0..largest, counting how many times each value occurs (duplicates matter).", "For d from largest down to 1, add present[d], present[2d], present[3d], … .", "Return the first d whose count is at least 2."],
      cases: [
        example([[3, 14, 15, 7, 9]], 7, "CSES sample"),
        example([[6, 6, 5]], 6, "two equal values"),
        example([[2, 3, 5]], 1, "pairwise coprime"),
        example([[12, 18, 5]], 6, "neither value is the answer"),
        hidden("n = 200 000 values up to 10⁶, time limit", () => [MILLION_VALUES()]),
      ],
    },
    {
      id: "sum-of-divisors", title: "Sum of Divisors", cses: { id: 1082, name: "Sum of Divisors" },
      goal: "Σ σ(i) for i from 1 to n, modulo 10⁹ + 7, where σ is the sum of divisors. n reaches 10¹².",
      concept: "Count each divisor's contribution instead: d is a divisor of exactly ⌊n/d⌋ numbers, so the total is Σ d·⌊n/d⌋. The quotient ⌊n/d⌋ only takes about 2√n distinct values, and d runs over a block for each one, so the sum of a block times its quotient finishes in 2√n steps.",
      functionName: "sumOfDivisors", signature: "sumOfDivisors(n) → number",
      starterSource: starter("sumOfDivisors", "n", "d = 1; per block q = ⌊n/d⌋ and last = ⌊n/q⌋; add (sum of d..last) · q modulo 10⁹ + 7; jump d to last + 1."),
      solve: sumOfDivisors, comparator: "scalar", dependencies: ["mul-mod"], brute: sumOfDivisorsBrute, small: (round) => [1 + (round * 37) % 900],
      reference: book("21.1", "Primes and factors · sum of divisors"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 5, min: 1, max: 200 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("counts-divisors", "Each divisor d contributes d for every multiple, so the block sum is multiplied by the quotient, not counted once.", function sumOfDivisors(n) { const m = 1000000007; let total = 0, d = 1; while (d <= n) { const quotient = Math.floor(n / d); const last = Math.floor(n / quotient); total = (total + mulMod((last - d + 1) % m, quotient % m, m)) % m; d = last + 1; } return total; }),
        diagnosis("block-sum-overflows", "The block sum (d + last)(last − d + 1)/2 reaches 10²⁴ for n near 10¹², far past the exact range of a double; halve an even factor and reduce before multiplying.", function sumOfDivisors(n) { const m = 1000000007; let total = 0, d = 1; while (d <= n) { const quotient = Math.floor(n / d); const last = Math.floor(n / quotient); const block = (d + last) * (last - d + 1) / 2 % m; total = (total + mulMod(block, quotient % m, m)) % m; d = last + 1; } return total; }),
      ],
      hints: ["Σ σ(i) for i ≤ n equals Σ over d of d · ⌊n/d⌋.", "For a block, q = ⌊n/d⌋ and the block runs to last = ⌊n/q⌋.", "Sum of d..last is (d + last)(last − d + 1)/2; halve the even factor first so the product stays exact, then use mulMod."],
      cases: [
        example([5], 21, "CSES sample"),
        example([1], 1, "one"),
        example([10], 87, "up to ten"),
        run(sumOfDivisors, [1000000], "a million"),
        hidden("n = 10¹², time limit", () => [1000000000000]),
      ],
    },
    {
      id: "mod-inverse", title: "Modular Inverse", cses: { id: 2182, name: "Divisor Analysis (brick)" },
      goal: "The number x below the prime m with a · x ≡ 1, so that dividing by a modulo m becomes multiplying by x.",
      concept: "Fermat's little theorem gives a^(m−1) ≡ 1 for a prime m not dividing a, so a^(m−2) is the inverse. One modular power and division becomes multiplication.",
      functionName: "modInverse", signature: "modInverse(a, m) → number",
      starterSource: starter("modInverse", "a, m", "return modPow(a % m, m - 2, m)"),
      solve: modInverse, comparator: "scalar", dependencies: ["mod-pow"], check: (args, out) => mulMod(args[0] % args[1], out, args[1]) === 1 % args[1], small: (round) => [1 + (round * 7919) % 1000000006, 1000000007],
      reference: book("21.2", "Modular arithmetic · modular inverse"),
      scene: { kind: "algo", view: "number", handles: [{ id: "a", type: "slider", label: "a (rounded)", value: 3, min: 1, max: 1000 }], args: [{ fixture: "roundedA" }, 1000000007] },
      diagnoses: [
        diagnosis("power-m-minus-one", "a^(m−1) is 1, not the inverse; one factor of a has to come back out, so the exponent is m − 2.", function modInverse(a, m) { return modPow(a % m, m - 1, m); }),
        diagnosis("real-reciprocal", "There is no division here: modular inverse means a companion number, not 1/a.", function modInverse(a, m) { return Math.round(1 / a * m) % m; }),
      ],
      hints: ["m is prime, so Fermat's little theorem applies to every a that m does not divide.", "a^(m−1) ≡ 1, so a · a^(m−2) ≡ 1.", "Return modPow(a % m, m − 2, m)."],
      cases: [
        example([3, 1000000007], 333333336, "the inverse of three"),
        example([1, 1000000007], 1, "one is its own inverse"),
        example([2, 1000000007], 500000004, "the inverse of two"),
        example([1000000006, 1000000007], 1000000006, "−1 is its own inverse"),
      ],
    },
    {
      id: "divisor-analysis", title: "Divisor Analysis", cses: { id: 2182, name: "Divisor Analysis" },
      goal: "From a prime factorisation given as [prime, exponent] pairs, the number of divisors, their sum and their product, each modulo 10⁹ + 7.",
      concept: "Three products over the primes. The count multiplies (k + 1); the sum multiplies the geometric series (p^(k+1) − 1)/(p − 1), where the division is a modular inverse. The product of all divisors is p raised to k(k+1)/2 times the number of divisors of the other primes, an exponent far too large to hold, so Fermat reduces it modulo 10⁹ + 6. Prefix and suffix products supply each prime's share, because that modulus is not prime and cannot be divided by.",
      functionName: "divisorAnalysis", signature: "divisorAnalysis(factors) → [count, sum, product]",
      starterSource: starter("divisorAnalysis", "factors", "count: Π (k + 1). sum: Π (p^(k+1) − 1) · inverse(p − 1). product: Π p^(k(k+1)/2 · Π other (k + 1)) with the exponent modulo 10⁹ + 6."),
      solve: divisorAnalysis, comparator: "deep", dependencies: ["mul-mod", "mod-pow", "mod-inverse"], brute: divisorAnalysisBrute, small: (round) => [randomFactors(360 + round, 1 + (round % 3), 12, 3)],
      reference: book("21.1", "Primes and factors · divisor products"),
      presets: { "CSES sample": { c: [[2, 2], [3, 1]] }, "one prime": { c: [[5, 3]] }, "large exponents": { c: [[2, 1000000000], [3, 999999999]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("exponent-mod-p", "The exponent of the divisor product is reduced modulo 10⁹ + 6, the order of the multiplicative group, not modulo 10⁹ + 7.", function divisorAnalysis(factors) { const m = 1000000007; const n = factors.length; let count = 1, sum = 1; for (let i = 0; i < n; i += 1) { const prime = factors[i][0], power = factors[i][1]; count = mulMod(count, (power + 1) % m, m); const top = (modPow(prime, power + 1, m) - 1 + m) % m; sum = mulMod(sum, mulMod(top, modInverse((prime - 1) % m, m), m), m); } const before = new Array(n + 1).fill(1), after = new Array(n + 1).fill(1); for (let i = 0; i < n; i += 1) before[i + 1] = mulMod(before[i], (factors[i][1] + 1) % m, m); for (let i = n - 1; i >= 0; i -= 1) after[i] = mulMod(after[i + 1], (factors[i][1] + 1) % m, m); let product = 1; for (let i = 0; i < n; i += 1) { const power = factors[i][1]; const triangle = power % 2 === 0 ? mulMod((power / 2) % m, (power + 1) % m, m) : mulMod(power % m, ((power + 1) / 2) % m, m); const exponent = mulMod(triangle, mulMod(before[i], after[i + 1], m), m); product = mulMod(product, modPow(factors[i][0], exponent, m), m); } return [count, sum, product]; }),
        diagnosis("sum-without-inverse", "The geometric series is divided by p − 1, which modulo a prime means multiplying by its inverse.", function divisorAnalysis(factors) { const m = 1000000007, order = 1000000006; const n = factors.length; let count = 1, sum = 1; for (let i = 0; i < n; i += 1) { const prime = factors[i][0], power = factors[i][1]; count = mulMod(count, (power + 1) % m, m); sum = mulMod(sum, (modPow(prime, power + 1, m) - 1 + m) % m, m); } const before = new Array(n + 1).fill(1), after = new Array(n + 1).fill(1); for (let i = 0; i < n; i += 1) before[i + 1] = mulMod(before[i], (factors[i][1] + 1) % order, order); for (let i = n - 1; i >= 0; i -= 1) after[i] = mulMod(after[i + 1], (factors[i][1] + 1) % order, order); let product = 1; for (let i = 0; i < n; i += 1) { const power = factors[i][1]; const triangle = power % 2 === 0 ? mulMod((power / 2) % order, (power + 1) % order, order) : mulMod(power % order, ((power + 1) / 2) % order, order); const exponent = mulMod(triangle, mulMod(before[i], after[i + 1], order), order); product = mulMod(product, modPow(factors[i][0], exponent, m), m); } return [count, sum, product]; }),
      ],
      hints: ["count = Π (k + 1) modulo 10⁹ + 7.", "sum = Π (p^(k+1) − 1) · inverse(p − 1); every prime is below the modulus so p − 1 is invertible.", "product: prefix and suffix products of (k + 1) modulo 10⁹ + 6 give Π of the other primes; multiply by k(k+1)/2, halving the even factor first, and raise p to that."],
      cases: [
        example([[[2, 2], [3, 1]]], [6, 28, 1728], "CSES sample"),
        example([[[5, 3]]], [4, 156, 15625], "one prime"),
        example([[[2, 1]]], [2, 3, 2], "a single square-free prime"),
        run(divisorAnalysis, [[[2, 1000000000], [3, 999999999]]], "exponents near a billion"),
        hidden("n = 30 000 primes, time limit", () => [FACTOR_LIST()]),
      ],
    },
    {
      id: "prime-multiples", title: "Prime Multiples", cses: { id: 2185, name: "Prime Multiples" },
      goal: "How many of the integers 1..n are divisible by at least one of the given distinct primes. n is a decimal string up to 10¹⁸ and the answer is returned as a string.",
      concept: "Inclusion–exclusion over the subsets: add the multiples of each prime, take back the multiples of each pair, add the triples, and so on. A depth-first walk over the subsets stops early once a product passes n, and BigInt keeps the counts exact beyond 2⁵³.",
      functionName: "primeMultiples", signature: "primeMultiples(n, primes) → string",
      starterSource: starter("primeMultiples", "n, primes", "Walk the primes deciding to include each; a non-empty subset with product ≤ n adds ±⌊n / product⌋ by the parity of its size."),
      solve: primeMultiples, comparator: "deep", brute: primeMultiplesBrute, small: (round) => { const next = rng(370 + round); return [String(10 + Math.floor(next() * 200)), primeList(30, 1 + (round % 4), 380 + round)]; },
      reference: book("22.3", "Inclusion–exclusion"),
      presets: { "CSES sample": { a: "20", c: [2, 5] }, "three primes": { a: "1000", c: [2, 3, 5] }, "huge n": { a: "1000000000000000000", c: [2, 3, 5, 7, 11, 13, 17, 19] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetC" }] },
      diagnoses: [
        diagnosis("adds-every-subset", "Every subset of even size has to be subtracted, or numbers divisible by two of the primes are counted twice.", function primeMultiples(n, primes) { const limit = BigInt(n); const k = primes.length; let total = 0n; const walk = (index, product, chosen) => { if (index === k) { if (chosen > 0) total += limit / product; return; } walk(index + 1, product, chosen); const next = product * BigInt(primes[index]); if (next <= limit) walk(index + 1, next, chosen + 1); }; walk(0, 1n, 0); return String(total); }),
        diagnosis("plain-numbers", "n reaches 10¹⁸, past the exact range of a double, so the quotients and the running total need BigInt.", function primeMultiples(n, primes) { const limit = Number(n); const k = primes.length; let total = 0; const walk = (index, product, chosen) => { if (index === k) { if (chosen > 0) total += (chosen % 2 === 1 ? 1 : -1) * Math.floor(limit / product); return; } walk(index + 1, product, chosen); const next = product * primes[index]; if (next <= limit) walk(index + 1, next, chosen + 1); }; walk(0, 1, 0); return String(total); }),
      ],
      hints: ["Convert n once with BigInt and keep the running total as a BigInt.", "Walk the primes with an index, a running product and the number chosen; recurse once skipping and once including.", "A subset of odd size adds ⌊n / product⌋ and one of even size subtracts it; prune as soon as the product passes n."],
      cases: [
        example(["20", [2, 5]], "12", "CSES sample"),
        example(["1000", [2, 3, 5]], "734", "three primes"),
        example(["10", [7]], "1", "one prime"),
        run(primeMultiples, ["1000000000000000000", [2, 3, 5, 7, 11, 13, 17, 19]], "n = 10¹⁸"),
        hidden("n = 10¹⁸ with 20 primes, time limit", () => ["1000000000000000000", BIG_PRIMES()]),
      ],
    },
    {
      id: "counting-coprime-pairs", title: "Counting Coprime Pairs", cses: { id: 2417, name: "Counting Coprime Pairs" },
      goal: "How many pairs of the given values have greatest common divisor 1.",
      concept: "Counting pairs sharing a factor d is easy: it is the pairs among the values divisible by d. The Möbius function turns that into the coprime count, because Σ over the divisors of g of μ equals 1 exactly when g is 1. So the answer is Σ μ(d) · C(count of multiples of d, 2), and μ itself falls out of one sieve pass.",
      functionName: "countingCoprimePairs", signature: "countingCoprimePairs(values) → number",
      starterSource: starter("countingCoprimePairs", "values", "μ[1] = 1 then for i ascending subtract μ[i] from every later multiple; count multiples of d through a presence table; sum μ(d)·C(count, 2)."),
      solve: countingCoprimePairs, comparator: "scalar", brute: coprimePairsBrute, small: (round) => [randomInts(390 + round, 2 + (round % 7), 1, 40)],
      reference: book("22.3", "Inclusion–exclusion · Möbius function"),
      presets: { "CSES sample": { a: [5, 4, 20, 1, 16, 17, 5, 15] }, "all coprime": { a: [2, 3, 5, 7] }, "all even": { a: [2, 4, 6] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-mobius", "Counting the pairs whose gcd is divisible by d overcounts; the Möbius weights are what cancel the multiples.", function countingCoprimePairs(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const present = new Array(top + 1).fill(0); for (let i = 0; i < values.length; i += 1) present[values[i]] += 1; let count = 0; for (let multiple = 1; multiple <= top; multiple += 1) count += present[multiple]; return count * (count - 1) / 2; }),
        diagnosis("mobius-sign-flipped", "μ(1) is 1 and each later multiple subtracts the value at its divisor; flipping that sign counts the wrong pairs.", function countingCoprimePairs(values) { let top = 1; for (let i = 0; i < values.length; i += 1) if (values[i] > top) top = values[i]; const present = new Array(top + 1).fill(0); for (let i = 0; i < values.length; i += 1) present[values[i]] += 1; const mobius = new Array(top + 1).fill(0); mobius[1] = 1; for (let i = 1; i <= top; i += 1) { if (mobius[i] === 0) continue; for (let j = 2 * i; j <= top; j += i) mobius[j] += mobius[i]; } let total = 0; for (let d = 1; d <= top; d += 1) { if (mobius[d] === 0) continue; let count = 0; for (let multiple = d; multiple <= top; multiple += d) count += present[multiple]; total += mobius[d] * (count * (count - 1) / 2); } return total; }),
      ],
      hints: ["present[v] counts how many values equal v; the largest value bounds the sieve.", "μ: start with μ[1] = 1, then for i from 1 upward subtract μ[i] from μ[j] for every multiple j = 2i, 3i, … .", "For each d with μ(d) ≠ 0, count the values divisible by d and add μ(d) · count(count − 1)/2."],
      cases: [
        example([[5, 4, 20, 1, 16, 17, 5, 15]], 19, "CSES sample"),
        example([[2, 3, 5, 7]], 6, "every pair is coprime"),
        example([[2, 4, 6]], 0, "no pair is coprime"),
        example([[1, 1]], 1, "two ones"),
        hidden("n = 100 000 values up to 10⁶, time limit", () => [COPRIME_VALUES()]),
      ],
    },
    {
      id: "next-prime", title: "Next Prime", cses: { id: 3396, name: "Next Prime" },
      goal: "For each given n up to 10¹², the smallest prime strictly greater than n.",
      concept: "Primes below 10¹² cannot be sieved, but their factors can: a number under 10¹² that is composite has a factor below 10⁶. So sieve the primes up to 10⁶ once and trial divide each candidate by them. Gaps between primes are small, so only a few candidates are tried, and the composites fall out after a handful of divisions.",
      functionName: "nextPrime", signature: "nextPrime(values) → answers",
      starterSource: starter("nextPrime", "values", "Sieve primes up to 10⁶; isPrime(x) trial divides by them while p · p ≤ x; walk candidates upward from n + 1."),
      solve: nextPrime, comparator: "deep", brute: nextPrimeBrute, small: (round) => [randomInts(400 + round, 3, 1, 5000)],
      reference: book("21.1", "Primes and factors · primality testing"),
      presets: { "CSES sample": { a: [1, 2, 3, 42, 1337] }, "large values": { a: [1000000000000, 999999999989] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("includes-n", "The answer is strictly greater than n, so 2 follows 1 and 3 follows 2.", function nextPrime(values) { const limit = 1000000; const composite = new Array(limit + 1).fill(false); const primes = []; for (let i = 2; i <= limit; i += 1) { if (composite[i]) continue; primes.push(i); for (let j = i * i; j <= limit; j += i) composite[j] = true; } const isPrime = (x) => { if (x < 2) return false; for (let i = 0; i < primes.length; i += 1) { const p = primes[i]; if (p * p > x) break; if (x % p === 0) return false; } return true; }; return values.map((n) => { let candidate = n; while (!isPrime(candidate)) candidate += 1; return candidate; }); }),
        diagnosis("sieve-too-small", "A composite under 10¹² can hide a factor as large as 10⁶, so trial division has to reach that far.", function nextPrime(values) { const limit = 1000; const composite = new Array(limit + 1).fill(false); const primes = []; for (let i = 2; i <= limit; i += 1) { if (composite[i]) continue; primes.push(i); for (let j = i * i; j <= limit; j += i) composite[j] = true; } const isPrime = (x) => { if (x < 2) return false; for (let i = 0; i < primes.length; i += 1) { const p = primes[i]; if (p * p > x) break; if (x % p === 0) return false; } return true; }; return values.map((n) => { let candidate = n + 1; while (!isPrime(candidate)) candidate += 1; return candidate; }); }),
      ],
      hints: ["Sieve the primes up to 10⁶ once, outside the per-value loop.", "isPrime(x): divide by each sieved prime p while p · p ≤ x; a hit means composite.", "Start at n + 1 and step up until isPrime holds."],
      cases: [
        example([[1, 2, 3, 42, 1337]], [2, 3, 5, 43, 1361], "CSES sample"),
        run(nextPrime, [[1000000000000]], "past a trillion"),
        run(nextPrime, [[999999999989]], "starting from a prime"),
        example([[4]], [5], "after a composite"),
        hidden("20 values up to 10¹², time limit", () => [NEXT_PRIME_VALUES()]),
      ],
    },
    {
      id: "factorial-tables", title: "Factorial Tables", cses: { id: 1079, name: "Binomial Coefficients (brick)" },
      goal: "Factorials and inverse factorials up to limit, modulo 10⁹ + 7, as { fact, inverseFact }.",
      concept: "Factorials come from one forward pass. Their inverses would cost a modular power each, but one power gives the inverse of the largest factorial, and walking back multiplies by i to step down: inverse of (i − 1)! is i times the inverse of i!.",
      functionName: "factorialTables", signature: "factorialTables(limit) → { fact, inverseFact }",
      starterSource: starter("factorialTables", "limit", "fact[0] = 1 and fact[i] = mulMod(fact[i − 1], i); inverseFact[limit] = modInverse(fact[limit]); inverseFact[i − 1] = mulMod(inverseFact[i], i)."),
      solve: factorialTables, comparator: "deep", dependencies: ["mul-mod", "mod-inverse"],
      reference: book("22.1", "Binomial coefficients"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "limit (rounded)", value: 6, min: 0, max: 20 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("inverse-of-i", "inverseFact[i] is the inverse of i factorial, not the inverse of i.", function factorialTables(limit) { const m = 1000000007; const fact = new Array(limit + 1); fact[0] = 1; for (let i = 1; i <= limit; i += 1) fact[i] = mulMod(fact[i - 1], i, m); const inverseFact = new Array(limit + 1); inverseFact[0] = 1; for (let i = 1; i <= limit; i += 1) inverseFact[i] = modInverse(i, m); return { fact, inverseFact }; }),
        diagnosis("backwards-step-wrong", "Stepping down from the inverse of i! to the inverse of (i − 1)! multiplies by i, because i! = i · (i − 1)!.", function factorialTables(limit) { const m = 1000000007; const fact = new Array(limit + 1); fact[0] = 1; for (let i = 1; i <= limit; i += 1) fact[i] = mulMod(fact[i - 1], i, m); const inverseFact = new Array(limit + 1); inverseFact[limit] = modInverse(fact[limit], m); for (let i = limit; i >= 1; i -= 1) inverseFact[i - 1] = mulMod(inverseFact[i], i - 1 === 0 ? 1 : i - 1, m); return { fact, inverseFact }; }),
      ],
      hints: ["fact has limit + 1 entries with fact[0] = 1.", "One call to modInverse gives inverseFact[limit] from fact[limit].", "Then for i from limit down to 1: inverseFact[i − 1] = mulMod(inverseFact[i], i, 10⁹ + 7)."],
      cases: [
        example([4], { fact: [1, 1, 2, 6, 24], inverseFact: [1, 1, 500000004, 166666668, 41666667] }, "up to four"),
        example([0], { fact: [1], inverseFact: [1] }, "just zero"),
        example([1], { fact: [1, 1], inverseFact: [1, 1] }, "up to one"),
        run(factorialTables, [12], "up to twelve"),
        hidden("limit = 200 000, time limit", () => [200000]),
      ],
    },
    {
      id: "choose", title: "Binomial Coefficient", cses: { id: 1079, name: "Binomial Coefficients (brick)" },
      goal: "C(a, b) modulo 10⁹ + 7 from the factorial tables, and 0 when b is outside 0..a.",
      concept: "a! / (b!(a − b)!) becomes one multiplication of a factorial by two inverse factorials, so every coefficient is three lookups once the tables exist.",
      functionName: "choose", signature: "choose(tables, a, b) → number",
      starterSource: starter("choose", "tables, a, b", "b < 0 or b > a → 0; otherwise fact[a] · inverseFact[b] · inverseFact[a − b] modulo 10⁹ + 7."),
      solve: choose, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables"], brute: (tables, a, b) => Number(bigChoose(a, b) % BIG_MOD), small: (round) => { const next = rng(410 + round); const a = Math.floor(next() * 13); return [sampleTables(), a, Math.floor(next() * (a + 1))]; },
      reference: book("22.1", "Binomial coefficients"),
      presets: { "tables to twelve": { a: 12 } },
      scene: { kind: "algo", view: "number", handles: preset([
        { id: "a", type: "slider", label: "a (rounded)", value: 5, min: 0, max: 12 },
        { id: "b", type: "slider", label: "b (rounded)", value: 3, min: 0, max: 12 },
      ]), args: [{ fixture: "factorialTable" }, { fixture: "roundedA" }, { fixture: "roundedB" }] },
      diagnoses: [
        diagnosis("multiplies-factorials", "Dividing by b! modulo a prime means multiplying by the inverse of b!, not by b! itself.", function choose(tables, a, b) { if (b < 0 || b > a) return 0; const m = 1000000007; return mulMod(mulMod(tables.fact[a], tables.fact[b], m), tables.fact[a - b], m); }),
        diagnosis("one-inverse", "Both b! and (a − b)! divide, so two inverse factorials are needed.", function choose(tables, a, b) { if (b < 0 || b > a) return 0; const m = 1000000007; return mulMod(tables.fact[a], tables.inverseFact[b], m); }),
      ],
      hints: ["Guard b < 0 and b > a first and return 0.", "C(a, b) = a! · (b!)⁻¹ · ((a − b)!)⁻¹.", "Two mulMod calls with the modulus 10⁹ + 7."],
      cases: [
        example([sampleTables(), 5, 3], 10, "five choose three"),
        example([sampleTables(), 8, 0], 1, "choose nothing"),
        example([sampleTables(), 4, 5], 0, "b larger than a"),
        example([sampleTables(), 12, 6], 924, "twelve choose six"),
      ],
    },
    {
      id: "binomial-coefficients", title: "Binomial Coefficients", cses: { id: 1079, name: "Binomial Coefficients" },
      goal: "For each query [a, b], C(a, b) modulo 10⁹ + 7.",
      concept: "Build the factorial tables once, up to the largest a in the batch, and every query is then a constant-time lookup. Pascal's triangle would need a million rows.",
      functionName: "binomialCoefficients", signature: "binomialCoefficients(queries) → answers",
      starterSource: starter("binomialCoefficients", "queries", "tables = factorialTables(largest a); map each query through choose."),
      solve: binomialCoefficients, comparator: "deep", dependencies: ["factorial-tables", "choose"], brute: binomialBrute, small: (round) => [smallBinomials(420 + round, 4, 15)],
      reference: book("22.1", "Binomial coefficients"),
      presets: { "CSES sample": { c: [[5, 3], [8, 1], [9, 5]] }, edges: { c: [[0, 0], [6, 0], [6, 6]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("real-division", "Modulo a prime there is no real division: a! / (b! · (a − b)!) on the residues is meaningless, so multiply by the inverse factorials instead.", function binomialCoefficients(queries) { let top = 1; for (let i = 0; i < queries.length; i += 1) if (queries[i][0] > top) top = queries[i][0]; const tables = factorialTables(top); return queries.map((query) => { const a = query[0], b = query[1]; if (b < 0 || b > a) return 0; return Math.round(tables.fact[a] / (tables.fact[b] * tables.fact[a - b])) % 1000000007; }); }),
        diagnosis("tables-too-small", "The tables have to reach the largest a in the whole batch, not the first one.", function binomialCoefficients(queries) { const tables = factorialTables(queries[0][0]); return queries.map((query) => (query[0] <= queries[0][0] ? choose(tables, query[0], query[1]) : 0)); }),
      ],
      hints: ["Scan the queries once for the largest a.", "factorialTables(that a) once, before the loop.", "Map every query through choose(tables, a, b)."],
      cases: [
        example([[[5, 3], [8, 1], [9, 5]]], [10, 8, 126], "CSES sample"),
        example([[[0, 0]]], [1], "zero choose zero"),
        example([[[6, 0], [6, 6]]], [1, 1], "both ends"),
        run(binomialCoefficients, [[[1000000, 500000]]], "a million choose half"),
        hidden("n = 100 000 queries with a up to 10⁶, time limit", () => [BINOMIAL_QUERIES()]),
      ],
    },
    {
      id: "creating-strings-ii", title: "Creating Strings II", cses: { id: 1715, name: "Creating Strings II" },
      goal: "How many different strings can be built from the letters of the given string, modulo 10⁹ + 7.",
      concept: "All n! orderings, divided by the orderings inside each group of equal letters, which are indistinguishable. That is the multinomial n! / Π (count of each letter)!, and the inverse factorials turn the division into multiplication.",
      functionName: "creatingStringsII", signature: "creatingStringsII(text) → number",
      starterSource: starter("creatingStringsII", "text", "Count each letter; tables = factorialTables(text.length); answer = fact[n] times inverseFact[count] for every letter."),
      solve: creatingStringsII, comparator: "scalar", dependencies: ["mul-mod", "factorial-tables"], brute: creatingStringsIIBrute, small: (round) => [randomLetters(430 + round, 1 + (round % 9), "aabc")],
      reference: book("22.1", "Binomial coefficients · multinomial"),
      presets: { "CSES sample": { a: "aabac" }, "all equal": { a: "aaaa" }, "all different": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("plain-factorial", "Repeated letters make orderings identical, so n! has to be divided by each letter's factorial.", function creatingStringsII(text) { const tables = factorialTables(text.length); return tables.fact[text.length]; }),
        diagnosis("divides-by-count", "The division is by the factorial of each count, not by the count itself.", function creatingStringsII(text) { const m = 1000000007; const counts = new Map(); for (let i = 0; i < text.length; i += 1) counts.set(text[i], (counts.get(text[i]) || 0) + 1); const tables = factorialTables(text.length); let answer = tables.fact[text.length]; counts.forEach((count) => { answer = mulMod(answer, modInverse(count, m), m); }); return answer; }),
      ],
      hints: ["A Map from letter to how many times it occurs.", "factorialTables(text.length) gives fact and inverseFact.", "Start from fact[n] and multiply by inverseFact[count] once per distinct letter."],
      cases: [
        example(["aabac"], 20, "CSES sample"),
        example(["aaaa"], 1, "one arrangement"),
        example(["abcd"], 24, "all different"),
        example(["a"], 1, "one letter"),
        hidden("n = 10⁶ letters, time limit", () => [LETTERS_BIG()]),
      ],
    },
    {
      id: "distributing-apples", title: "Distributing Apples", cses: { id: 1716, name: "Distributing Apples" },
      goal: "In how many ways can m apples be handed to n children, modulo 10⁹ + 7. Children may receive none.",
      concept: "Stars and bars: write the apples as m stars and the splits between children as n − 1 bars. Any arrangement of the m + n − 1 symbols describes one distribution, so the count is C(n + m − 1, m).",
      functionName: "distributingApples", signature: "distributingApples(n, m) → number",
      starterSource: starter("distributingApples", "n, m", "tables = factorialTables(n + m); return choose(tables, n + m - 1, m)."),
      solve: distributingApples, comparator: "scalar", dependencies: ["factorial-tables", "choose"], brute: distributingApplesBrute, small: (round) => [1 + (round % 7), 1 + ((round * 3) % 8)],
      reference: book("22.1", "Binomial coefficients · boxes and balls"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "children n (rounded)", value: 3, min: 1, max: 12 },
        { id: "m", type: "slider", label: "apples m (rounded)", value: 2, min: 1, max: 12 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedM" }] },
      diagnoses: [
        diagnosis("bars-miscounted", "n children need n − 1 bars, so the row holds m + n − 1 symbols.", function distributingApples(n, m) { const tables = factorialTables(n + m); return choose(tables, n + m, m); }),
        diagnosis("children-distinct-ignored", "Apples are identical but children are not, so it is the positions of the bars that are chosen.", function distributingApples(n, m) { const tables = factorialTables(n + m); return choose(tables, m + n - 1, n); }),
      ],
      hints: ["Picture m identical stars and n − 1 bars in a row.", "Each of the C(n + m − 1, m) arrangements is one distribution.", "Build the tables to n + m and call choose once."],
      cases: [
        example([3, 2], 6, "CSES sample"),
        example([1, 5], 1, "one child takes everything"),
        example([5, 1], 5, "one apple, five children"),
        example([2, 2], 3, "two and two"),
        hidden("n = m = 10⁶, time limit", () => [1000000, 1000000]),
      ],
    },
    {
      id: "christmas-party", title: "Christmas Party", cses: { id: 1717, name: "Christmas Party" },
      goal: "In how many ways can n children swap gifts so that nobody gets their own, modulo 10⁹ + 7.",
      concept: "Derangements. Child n either swaps with one of the n − 1 others, leaving a derangement of the remaining n − 2, or displaces someone who then takes over its place, leaving a derangement of n − 1. Both cases have n − 1 choices: D(n) = (n − 1)·(D(n − 1) + D(n − 2)).",
      functionName: "christmasParty", signature: "christmasParty(n) → number",
      starterSource: starter("christmasParty", "n", "D(1) = 0, D(2) = 1; step the pair forward with D(i) = (i − 1)·(D(i − 1) + D(i − 2))."),
      solve: christmasParty, comparator: "scalar", dependencies: ["mul-mod"], brute: christmasPartyBrute, small: (round) => [1 + (round % 8)],
      reference: book("22.1", "Binomial coefficients · derangements"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 4, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("factorial", "Counting every permutation includes the ones where a child gets their own gift.", function christmasParty(n) { const tables = factorialTables(n); return tables.fact[n]; }),
        diagnosis("wrong-base", "D(1) is 0 and D(2) is 1: a single child cannot avoid their own gift.", function christmasParty(n) { const m = 1000000007; if (n === 1) return 1; let previous = 1, current = 1; for (let i = 2; i <= n; i += 1) { const next = mulMod((i - 1) % m, (current + previous) % m, m); previous = current; current = next; } return current; }),
      ],
      hints: ["D(1) = 0 and D(2) = 1.", "For i from 2 up to n: D(i) = (i − 1)·(D(i − 1) + D(i − 2)), taken modulo 10⁹ + 7.", "Keep only the last two values as you go."],
      cases: [
        example([4], 9, "CSES sample"),
        example([1], 0, "one child cannot swap"),
        example([2], 1, "two children swap"),
        example([5], 44, "five children"),
        hidden("n = 10⁶, time limit", () => [1000000]),
      ],
    },
    {
      id: "permutation-order", title: "Permutation Order", cses: { id: 3397, name: "Permutation Order" },
      goal: "Two kinds of query on the permutations of 1..n in lexicographic order: [1, n, k] asks for the k-th permutation (k is a decimal string, because 20! passes 2⁵³), and [2, n, permutation] asks for its position.",
      concept: "The permutations starting with a given first value form one block of (n − 1)! of them. So the first value is the k-th block, the remainder recurses, and the ranking runs the same argument backwards: each value contributes its index among the values still unused, times the factorial of the places left.",
      functionName: "permutationOrder", signature: "permutationOrder(queries) → answers",
      starterSource: starter("permutationOrder", "queries", "BigInt factorials to 20. Type 1: take rank / block from a pool of unused values. Type 2: add index-in-pool times the factorial of the remaining places."),
      solve: permutationOrder, comparator: "deep", brute: permutationOrderBrute, small: (round) => { const next = rng(440 + round); const n = 1 + (round % 6); let fact = 1; for (let i = 2; i <= n; i += 1) fact *= i; const out = []; for (let i = 0; i < 3; i += 1) { if (next() < 0.5) out.push([1, n, String(1 + Math.floor(next() * fact))]); else out.push([2, n, randomPermutation(450 + round * 7 + i, n)]); } return [out]; },
      reference: book("22.1", "Binomial coefficients · counting orderings"),
      presets: { "CSES sample": { c: [[1, 4, "1"], [1, 4, "2"], [2, 4, [1, 2, 3, 4]], [2, 4, [1, 2, 4, 3]], [1, 5, "42"], [2, 5, [2, 4, 5, 3, 1]]] }, "last permutation": { c: [[1, 4, "24"], [2, 4, [4, 3, 2, 1]]] } },
      scene: { kind: "algo", view: "number", handles: preset(), args: [{ fixture: "presetC" }] },
      diagnoses: [
        diagnosis("rank-not-zero-based", "The k-th permutation is found from k − 1, because the first block covers ranks 1..(n − 1)!.", function permutationOrder(queries) { const fact = [1n]; for (let i = 1; i <= 20; i += 1) fact.push(fact[i - 1] * BigInt(i)); return queries.map((query) => { const n = query[1]; if (query[0] === 1) { let rank = BigInt(query[2]); const pool = []; for (let v = 1; v <= n; v += 1) pool.push(v); const out = []; for (let position = n - 1; position >= 0; position -= 1) { const block = fact[position]; const index = Number(rank / block); rank %= block; out.push(pool[Math.min(index, pool.length - 1)]); pool.splice(Math.min(index, pool.length - 1), 1); } return out; } const permutation = query[2]; const pool = []; for (let v = 1; v <= n; v += 1) pool.push(v); let rank = 0n; for (let i = 0; i < n; i += 1) { const index = pool.indexOf(permutation[i]); rank += BigInt(index) * fact[n - 1 - i]; pool.splice(index, 1); } return String(rank + 1n); }); }),
        diagnosis("index-in-full-range", "The digit for each place is the value's index among the values still unused, not the value itself.", function permutationOrder(queries) { const fact = [1n]; for (let i = 1; i <= 20; i += 1) fact.push(fact[i - 1] * BigInt(i)); return queries.map((query) => { const n = query[1]; if (query[0] === 1) { let rank = BigInt(query[2]) - 1n; const pool = []; for (let v = 1; v <= n; v += 1) pool.push(v); const out = []; for (let position = n - 1; position >= 0; position -= 1) { const block = fact[position]; const index = Number(rank / block); rank %= block; out.push(pool[index]); pool.splice(index, 1); } return out; } const permutation = query[2]; let rank = 0n; for (let i = 0; i < n; i += 1) rank += BigInt(permutation[i] - 1) * fact[n - 1 - i]; return String(rank + 1n); }); }),
      ],
      hints: ["Factorials up to 20 need BigInt; so does k.", "Type 1: rank = BigInt(k) − 1; for each place from the left, index = rank / (places left)! picks from the pool of unused values, then rank %= that factorial.", "Type 2: for each value in turn, add its index in the pool times the factorial of the places after it; the answer is that sum plus one, as a string."],
      cases: [
        example([[[1, 4, "1"], [1, 4, "2"], [2, 4, [1, 2, 3, 4]], [2, 4, [1, 2, 4, 3]], [1, 5, "42"], [2, 5, [2, 4, 5, 3, 1]]]], [[1, 2, 3, 4], [1, 2, 4, 3], "1", "2", [2, 4, 5, 3, 1], "42"], "CSES sample"),
        example([[[1, 1, "1"], [2, 1, [1]]]], [[1], "1"], "one value"),
        example([[[1, 4, "24"], [2, 4, [4, 3, 2, 1]]]], [[4, 3, 2, 1], "24"], "the last permutation"),
        run(permutationOrder, [[[1, 20, "2432902008176640000"], [2, 20, [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]]]], "twenty values, the last permutation"),
        hidden("1000 queries with n = 20, time limit", () => [PERMUTATION_ORDER_QUERIES()]),
      ],
    },
    {
      id: "permutation-rounds", title: "Permutation Rounds", cses: { id: 3398, name: "Permutation Rounds" },
      goal: "Applying the permutation repeatedly to a sorted array, how many rounds until it is sorted again, modulo 10⁹ + 7.",
      concept: "The permutation splits into cycles, and a cycle of length L returns to its start every L rounds. Everything is back together at the least common multiple of the lengths. Taking that modulo 10⁹ + 7 means collecting the largest power of each prime across all the cycle lengths, because a modular result cannot be divided back down.",
      functionName: "permutationRounds", signature: "permutationRounds(permutation) → number",
      starterSource: starter("permutationRounds", "permutation", "Walk each unvisited cycle to get its length; factorise it with the sieve and keep the largest exponent per prime; multiply the prime powers modulo 10⁹ + 7."),
      solve: permutationRounds, comparator: "scalar", dependencies: ["mul-mod", "mod-pow", "smallest-prime-factor", "factorize"], brute: permutationRoundsBrute, small: (round) => [randomPermutation(460 + round, 1 + (round % 8))],
      reference: book("21.1", "Primes and factors · least common multiple"),
      presets: { "CSES sample": { a: [5, 3, 2, 6, 4, 1, 8, 7] }, identity: { a: [1, 2, 3] }, "one long cycle": { a: [2, 3, 4, 5, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("product-of-lengths", "Cycles of length 2 and 4 come back together after 4 rounds, not 8: the answer is the least common multiple, not the product.", function permutationRounds(permutation) { const n = permutation.length; const m = 1000000007; const seen = new Array(n + 1).fill(false); let answer = 1; for (let start = 1; start <= n; start += 1) { if (seen[start]) continue; let length = 0, v = start; while (!seen[v]) { seen[v] = true; v = permutation[v - 1]; length += 1; } answer = mulMod(answer, length % m, m); } return answer; }),
        diagnosis("lcm-with-gcd", "A least common multiple built by dividing out the greatest common divisor cannot survive the modulo: once a value is reduced it can no longer be divided. Collect prime powers instead.", function permutationRounds(permutation) { const n = permutation.length; const m = 1000000007; const seen = new Array(n + 1).fill(false); let answer = 1; for (let start = 1; start <= n; start += 1) { if (seen[start]) continue; let length = 0, v = start; while (!seen[v]) { seen[v] = true; v = permutation[v - 1]; length += 1; } let a = answer % m, b = length; while (b) { const t = a % b; a = b; b = t; } answer = mulMod(answer, Math.floor(length / Math.max(1, a)) % m, m); } return answer; }),
      ],
      hints: ["Follow each unvisited index through permutation[v − 1] to measure its cycle.", "Factorise every cycle length with the smallest-prime-factor sieve over n and remember the largest exponent seen for each prime.", "Multiply modPow(prime, exponent) over the collected primes, modulo 10⁹ + 7."],
      cases: [
        example([[5, 3, 2, 6, 4, 1, 8, 7]], 4, "CSES sample"),
        example([[1, 2, 3]], 1, "already sorted"),
        example([[2, 3, 4, 5, 1]], 5, "one long cycle"),
        example([[2, 1, 4, 5, 3]], 6, "a two-cycle and a three-cycle"),
        hidden("n = 200 000, time limit", () => [PERMUTATION_BIG()]),
      ],
    },
    {
      id: "bracket-sequences-i", title: "Bracket Sequences I", cses: { id: 2064, name: "Bracket Sequences I" },
      goal: "How many valid bracket sequences of length n exist, modulo 10⁹ + 7.",
      concept: "Half the characters open and half close, so an odd length gives nothing. Of the C(n, n/2) ways to choose the opening positions, the invalid ones pair up exactly with a smaller choice, and what survives is the Catalan number C(n, n/2)/(n/2 + 1).",
      functionName: "bracketSequencesI", signature: "bracketSequencesI(n) → number",
      starterSource: starter("bracketSequencesI", "n", "Odd n → 0; otherwise choose(tables, n, n/2) times the inverse of n/2 + 1."),
      solve: bracketSequencesI, comparator: "scalar", dependencies: ["mul-mod", "mod-inverse", "factorial-tables", "choose"], brute: bracketSequencesIBrute, small: (round) => [round % 15],
      reference: book("22.2", "Catalan numbers"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 20 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("plain-central-binomial", "Choosing the opening positions also counts sequences that close too early; the Catalan number divides that by n/2 + 1.", function bracketSequencesI(n) { if (n % 2 !== 0) return 0; const tables = factorialTables(n + 1); return choose(tables, n, n / 2); }),
        diagnosis("odd-length", "A sequence of odd length can never balance, so the answer is 0.", function bracketSequencesI(n) { const m = 1000000007; const tables = factorialTables(n + 1); const half = Math.floor(n / 2); return mulMod(choose(tables, n, half), modInverse(half + 1, m), m); }),
      ],
      hints: ["An odd n answers 0.", "Build the tables to n + 1 and take choose(tables, n, n / 2).", "Multiply by modInverse(n / 2 + 1, 10⁹ + 7)."],
      cases: [
        example([6], 5, "CSES sample"),
        example([1], 0, "odd length"),
        example([2], 1, "one pair"),
        example([4], 2, "two pairs"),
        hidden("n = 10⁶, time limit", () => [1000000]),
      ],
    },
    {
      id: "bracket-sequences-ii", title: "Bracket Sequences II", cses: { id: 2187, name: "Bracket Sequences II" },
      goal: "How many valid bracket sequences of length n start with the given prefix, modulo 10⁹ + 7.",
      concept: "The prefix only matters through the depth it leaves open. Counting the completions is counting the walks of the remaining length from that depth down to 0 that never go negative, and the reflection argument gives C(rest, ups) − C(rest, ups − 1), where ups is how many of the remaining characters open.",
      functionName: "bracketSequencesII", signature: "bracketSequencesII(n, prefix) → number",
      starterSource: starter("bracketSequencesII", "n, prefix", "Track the depth through the prefix, rejecting a negative one; rest = n − prefix.length; ups = (rest − depth)/2; answer C(rest, ups) − C(rest, ups − 1)."),
      solve: bracketSequencesII, comparator: "scalar", dependencies: ["factorial-tables", "choose"], brute: bracketSequencesIIBrute, small: (round) => { const n = 2 + (round % 12); const next = rng(470 + round); let prefix = "", depth = 0; const length = 1 + Math.floor(next() * Math.min(4, n)); for (let i = 0; i < length; i += 1) { if (depth === 0 || next() < 0.6) { prefix += "("; depth += 1; } else { prefix += ")"; depth -= 1; } } return [n, prefix]; },
      reference: book("22.2", "Catalan numbers · ballot numbers"),
      presets: { "CSES sample": { a: "(()" }, "already closed": { a: "()" }, "too deep": { a: "((((" } },
      scene: { kind: "algo", view: "text", handles: preset([{ id: "n", type: "slider", label: "n (rounded)", value: 6, min: 1, max: 20 }]), args: [{ fixture: "roundedN" }, { fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-reflection", "The plain count of walks with the right number of openings includes the ones that dip below zero; the second binomial removes them.", function bracketSequencesII(n, prefix) { let depth = 0; for (let i = 0; i < prefix.length; i += 1) { depth += prefix[i] === "(" ? 1 : -1; if (depth < 0) return 0; } const rest = n - prefix.length; if (rest < depth || (rest - depth) % 2 !== 0) return 0; const tables = factorialTables(n + 1); return choose(tables, rest, (rest - depth) / 2); }),
        diagnosis("prefix-not-checked", "A prefix that already closes too many brackets can never be completed, whatever the counts say.", function bracketSequencesII(n, prefix) { const m = 1000000007; let depth = 0; for (let i = 0; i < prefix.length; i += 1) depth += prefix[i] === "(" ? 1 : -1; const rest = n - prefix.length; if (rest < Math.abs(depth) || (rest - depth) % 2 !== 0) return 0; const tables = factorialTables(n + 1); const ups = (rest - depth) / 2; const inside = choose(tables, rest, ups); const outside = ups >= 1 ? choose(tables, rest, ups - 1) : 0; return (inside - outside + m) % m; }),
      ],
      hints: ["Walk the prefix keeping a depth; a depth below zero means the answer is 0.", "rest = n − prefix.length; the completion needs ups = (rest − depth)/2 opening characters, so a wrong parity or rest < depth answers 0.", "Answer = C(rest, ups) − C(rest, ups − 1), kept non-negative modulo 10⁹ + 7."],
      cases: [
        example([6, "(()"], 2, "CSES sample"),
        example([2, "()"], 1, "already complete"),
        example([4, "(((("], 0, "too deep to close"),
        example([6, "("], 5, "one open bracket"),
        example([4, "()"], 1, "two characters left"),
        example([4, ")("], 0, "the prefix closes too early"),
        hidden("n = 10⁶ with a prefix of 300 000, time limit", () => [1000000, BRACKET_PREFIX()]),
      ],
    },
    {
      id: "counting-necklaces", title: "Counting Necklaces", cses: { id: 2209, name: "Counting Necklaces" },
      goal: "How many necklaces of n pearls in m colours are different, counting two as the same when one is a rotation of the other, modulo 10⁹ + 7.",
      concept: "Burnside's lemma: the number of classes is the average, over the n rotations, of how many colourings each one fixes. A rotation by i fixes the colourings that repeat with period gcd(i, n), so it fixes m^gcd(i,n). Grouping the rotations by that gcd turns the average into a sum over the divisors of n weighted by Euler's totient.",
      functionName: "countingNecklaces", signature: "countingNecklaces(n, m) → number",
      starterSource: starter("countingNecklaces", "n, m", "Σ over divisors d of n of φ(n/d) · m^d, times the inverse of n. Find the divisors in pairs up to the square root."),
      solve: countingNecklaces, comparator: "scalar", dependencies: ["mul-mod", "mod-pow", "mod-inverse"], brute: countingNecklacesBrute, small: (round) => [1 + (round % 7), 1 + (round % 4)],
      reference: book("22.4", "Burnside's lemma"),
      scene: { kind: "algo", view: "number", handles: [
        { id: "n", type: "slider", label: "pearls n (rounded)", value: 4, min: 1, max: 12 },
        { id: "m", type: "slider", label: "colours m (rounded)", value: 3, min: 1, max: 6 },
      ], args: [{ fixture: "roundedN" }, { fixture: "roundedM" }] },
      diagnoses: [
        diagnosis("divide-by-nothing", "Burnside averages over the rotations, so the sum has to be divided by n, which modulo a prime means multiplying by its inverse.", function countingNecklaces(n, m) { const p = 1000000007; const totient = (x) => { let result = x, rest = x; for (let d = 2; d * d <= rest; d += 1) { if (rest % d !== 0) continue; while (rest % d === 0) rest /= d; result = result / d * (d - 1); } if (rest > 1) result = result / rest * (rest - 1); return result; }; let total = 0; for (let d = 1; d * d <= n; d += 1) { if (n % d !== 0) continue; const other = n / d; total = (total + mulMod(totient(other) % p, modPow(m, d, p), p)) % p; if (other !== d) total = (total + mulMod(totient(d) % p, modPow(m, other, p), p)) % p; } return total; }),
        diagnosis("all-colourings", "Every necklace is counted once, not once per rotation; m^n counts the coloured strings.", function countingNecklaces(n, m) { const p = 1000000007; return modPow(m, n, p); }),
      ],
      hints: ["A rotation by i fixes m^gcd(i, n) colourings, and exactly φ(n/d) rotations have gcd d.", "Walk d from 1 while d·d ≤ n; for each divisor handle both d and n/d.", "Add φ(n/d) · m^d for each, then multiply the sum by modInverse(n, 10⁹ + 7)."],
      cases: [
        example([4, 3], 24, "CSES sample"),
        example([1, 5], 5, "one pearl"),
        example([3, 2], 4, "three pearls, two colours"),
        example([6, 1], 1, "one colour"),
        hidden("n = m = 10⁶, time limit", () => [1000000, 1000000]),
      ],
    },
    {
      id: "counting-grids", title: "Counting Grids", cses: { id: 2210, name: "Counting Grids" },
      goal: "How many n × n black-and-white grids are different, counting two as the same when one is a rotation of the other, modulo 10⁹ + 7.",
      concept: "Burnside again, now over four rotations. The identity fixes all 2^(n²) grids. A quarter turn forces each orbit of four squares to agree, and the middle square of an odd grid sits alone, so it fixes 2 raised to the number of orbits. A half turn pairs the squares the same way. The exponents reach 10¹⁸, so Fermat reduces them modulo 10⁹ + 6.",
      functionName: "countingGrids", signature: "countingGrids(n) → number",
      starterSource: starter("countingGrids", "n", "cells = n²; quarter and half orbit counts by parity; (2^cells + 2·2^quarter + 2^half) times the inverse of 4, exponents taken modulo 10⁹ + 6 with BigInt."),
      solve: countingGrids, comparator: "scalar", dependencies: ["mul-mod", "mod-pow", "mod-inverse"], brute: countingGridsBrute, small: (round) => [1 + (round % 3)],
      reference: book("22.4", "Burnside's lemma"),
      scene: { kind: "algo", view: "number", handles: [{ id: "n", type: "slider", label: "n (rounded)", value: 4, min: 1, max: 12 }], args: [{ fixture: "roundedN" }] },
      diagnoses: [
        diagnosis("forgets-the-centre", "An odd grid has a middle square that a rotation leaves alone, so it is its own orbit and adds one to the count.", function countingGrids(n) { const p = 1000000007, order = 1000000006n; const side = BigInt(n); const cells = side * side; const powerOfTwo = (exponent) => modPow(2, Number(exponent % order), p); const total = (powerOfTwo(cells) + 2 * powerOfTwo(cells / 4n) + powerOfTwo(cells / 2n)) % p; return mulMod(total, modInverse(4, p), p); }),
        diagnosis("two-rotations", "There are four rotations, and the quarter turn and the three-quarter turn fix the same grids, so that term counts twice.", function countingGrids(n) { const p = 1000000007, order = 1000000006n; const side = BigInt(n); const cells = side * side; const odd = side % 2n === 1n; const quarter = odd ? (cells - 1n) / 4n + 1n : cells / 4n; const half = odd ? (cells - 1n) / 2n + 1n : cells / 2n; const powerOfTwo = (exponent) => modPow(2, Number(exponent % order), p); const total = (powerOfTwo(cells) + powerOfTwo(quarter) + powerOfTwo(half)) % p; return mulMod(total, modInverse(4, p), p); }),
      ],
      hints: ["cells = n² needs BigInt once n passes 10⁹ in the square.", "A quarter turn has (cells − 1)/4 + 1 orbits when n is odd and cells/4 when it is even; a half turn has (cells − 1)/2 + 1 and cells/2.", "Answer = (2^cells + 2·2^quarter + 2^half) · modInverse(4), with every exponent reduced modulo 10⁹ + 6."],
      cases: [
        example([4], 16456, "CSES sample"),
        example([1], 2, "one square"),
        example([2], 6, "two by two"),
        example([3], 140, "three by three"),
        hidden("n = 10⁹, time limit", () => [1000000000]),
      ],
    },
  ];
  core.share({ mulMod, modPow, modInverse, factorialTables, choose, smallestPrimeFactor, factorize });
  core.define("math", MATH);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

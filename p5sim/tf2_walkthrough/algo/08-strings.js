(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomPermutation, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  const { fenwickAdd, fenwickPrefix, mulMod } = core.shared;

  // ------------------------------------------------------------------ 8 · string algorithms · references
  function wordCombinations(text, words) {
    const m = 1000000007;
    let total = 1;
    for (let i = 0; i < words.length; i += 1) total += words[i].length;
    const child = new Int32Array(26 * (total + 1));
    const terminal = new Uint8Array(total + 1);
    let nodes = 1;
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      let node = 0;
      for (let j = 0; j < word.length; j += 1) {
        const slot = node * 26 + (word.charCodeAt(j) - 97);
        if (child[slot] === 0) { child[slot] = nodes; nodes += 1; }
        node = child[slot];
      }
      terminal[node] = 1;
    }
    const n = text.length;
    const ways = new Array(n + 1).fill(0);
    ways[0] = 1;
    for (let i = 0; i < n; i += 1) {
      if (ways[i] === 0) continue;
      let node = 0;
      for (let j = i; j < n; j += 1) {
        node = child[node * 26 + (text.charCodeAt(j) - 97)];
        if (node === 0) break;
        if (terminal[node] === 1) ways[j + 1] = (ways[j + 1] + ways[i]) % m;
      }
    }
    return ways[n];
  }
  function prefixFunction(text) {
    const n = text.length;
    const pi = new Array(n).fill(0);
    for (let i = 1; i < n; i += 1) {
      let k = pi[i - 1];
      while (k > 0 && text[i] !== text[k]) k = pi[k - 1];
      if (text[i] === text[k]) k += 1;
      pi[i] = k;
    }
    return pi;
  }
  function zFunction(text) {
    const n = text.length;
    const z = new Array(n).fill(0);
    let left = 0, right = 0;
    for (let i = 1; i < n; i += 1) {
      if (i < right) z[i] = Math.min(right - i, z[i - left]);
      while (i + z[i] < n && text[z[i]] === text[i + z[i]]) z[i] += 1;
      if (i + z[i] > right) { left = i; right = i + z[i]; }
    }
    return z;
  }
  function stringMatching(text, pattern) {
    const m = pattern.length;
    const z = zFunction(pattern + "#" + text);
    let count = 0;
    for (let i = m + 1; i < z.length; i += 1) if (z[i] >= m) count += 1;
    return count;
  }
  function findingBorders(text) {
    const pi = prefixFunction(text);
    const borders = [];
    let k = pi[text.length - 1];
    while (k > 0) { borders.push(k); k = pi[k - 1]; }
    return borders.reverse();
  }
  function findingPeriods(text) {
    const n = text.length;
    const pi = prefixFunction(text);
    const periods = [];
    let k = pi[n - 1];
    while (k > 0) { periods.push(n - k); k = pi[k - 1]; }
    periods.push(n);
    return periods;
  }
  function minimalRotation(text) {
    const n = text.length;
    let i = 0, j = 1, k = 0;
    while (i < n && j < n && k < n) {
      const a = text[(i + k) % n], b = text[(j + k) % n];
      if (a === b) { k += 1; continue; }
      if (a > b) i += k + 1; else j += k + 1;
      if (i === j) j += 1;
      k = 0;
    }
    const start = Math.min(i, j);
    return text.slice(start) + text.slice(0, start);
  }
  function manacher(text) {
    const n = text.length;
    const odd = new Array(n).fill(0), even = new Array(n).fill(0);
    for (let i = 0, left = 0, right = -1; i < n; i += 1) {
      let k = i > right ? 1 : Math.min(odd[left + right - i], right - i + 1);
      while (i - k >= 0 && i + k < n && text[i - k] === text[i + k]) k += 1;
      odd[i] = k;
      if (i + k - 1 > right) { left = i - k + 1; right = i + k - 1; }
    }
    for (let i = 0, left = 0, right = -1; i < n; i += 1) {
      let k = i > right ? 0 : Math.min(even[left + right - i + 1], right - i + 1);
      while (i - k - 1 >= 0 && i + k < n && text[i - k - 1] === text[i + k]) k += 1;
      even[i] = k;
      if (i + k - 1 > right) { left = i - k; right = i + k - 1; }
    }
    return { odd, even };
  }
  function longestPalindrome(text) {
    const radii = manacher(text);
    let bestStart = 0, bestLength = 1;
    for (let i = 0; i < text.length; i += 1) {
      if (2 * radii.odd[i] - 1 > bestLength) { bestLength = 2 * radii.odd[i] - 1; bestStart = i - radii.odd[i] + 1; }
      if (2 * radii.even[i] > bestLength) { bestLength = 2 * radii.even[i]; bestStart = i - radii.even[i]; }
    }
    return text.substr(bestStart, bestLength);
  }
  function allPalindromes(text) {
    const n = text.length;
    const radii = manacher(text);
    const best = new Array(n).fill(1);
    for (let i = 0; i < n; i += 1) {
      const oddEnd = i + radii.odd[i] - 1;
      if (2 * radii.odd[i] - 1 > best[oddEnd]) best[oddEnd] = 2 * radii.odd[i] - 1;
      if (radii.even[i] > 0) {
        const evenEnd = i + radii.even[i] - 1;
        if (2 * radii.even[i] > best[evenEnd]) best[evenEnd] = 2 * radii.even[i];
      }
    }
    for (let j = n - 1; j >= 1; j -= 1) if (best[j] - 2 > best[j - 1]) best[j - 1] = best[j] - 2;
    return best;
  }
  function requiredSubstring(n, pattern) {
    const m = 1000000007;
    const k = pattern.length;
    const pi = prefixFunction(pattern);
    const go = [];
    for (let state = 0; state < k; state += 1) {
      const row = new Array(26);
      for (let c = 0; c < 26; c += 1) {
        if (pattern.charCodeAt(state) - 65 === c) row[c] = state + 1;
        else row[c] = state === 0 ? 0 : go[pi[state - 1]][c];
      }
      go.push(row);
    }
    let ways = new Array(k).fill(0);
    ways[0] = 1;
    for (let step = 0; step < n; step += 1) {
      const next = new Array(k).fill(0);
      for (let state = 0; state < k; state += 1) {
        if (ways[state] === 0) continue;
        const row = go[state];
        for (let c = 0; c < 26; c += 1) { const to = row[c]; if (to < k) next[to] = (next[to] + ways[state]) % m; }
      }
      ways = next;
    }
    let avoiding = 0;
    for (let state = 0; state < k; state += 1) avoiding = (avoiding + ways[state]) % m;
    let total = 1;
    for (let step = 0; step < n; step += 1) total = total * 26 % m;
    return ((total - avoiding) % m + m) % m;
  }
  function palindromeQueries(text, operations) {
    const m = 1000000007, base = 911382323;
    const n = text.length;
    const power = new Array(n + 2);
    power[0] = 1;
    for (let i = 1; i <= n + 1; i += 1) power[i] = mulMod(power[i - 1], base, m);
    const letters = new Array(n + 1).fill(0);
    const forward = new Array(n + 1).fill(0), backward = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i += 1) {
      letters[i] = text.charCodeAt(i - 1) - 96;
      fenwickAdd(forward, i, mulMod(letters[i], power[i], m));
      fenwickAdd(backward, i, mulMod(letters[i], power[n + 1 - i], m));
    }
    const answers = [];
    for (let t = 0; t < operations.length; t += 1) {
      const op = operations[t];
      if (op[0] === 1) {
        const k = op[1], code = op[2].charCodeAt(0) - 96;
        const delta = ((code - letters[k]) % m + m) % m;
        letters[k] = code;
        fenwickAdd(forward, k, mulMod(delta, power[k], m));
        fenwickAdd(backward, k, mulMod(delta, power[n + 1 - k], m));
      } else {
        const a = op[1], b = op[2];
        const f = ((fenwickPrefix(forward, b) - fenwickPrefix(forward, a - 1)) % m + m) % m;
        const r = ((fenwickPrefix(backward, b) - fenwickPrefix(backward, a - 1)) % m + m) % m;
        answers.push(mulMod(f, power[n + 1 - b], m) === mulMod(r, power[a], m));
      }
    }
    return answers;
  }
  function suffixAutomaton(text) {
    const next = [{}], link = [-1], len = [0], first = [-1], cloned = [false];
    let last = 0;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      const cur = len.length;
      next.push({}); link.push(-1); len.push(len[last] + 1); first.push(i); cloned.push(false);
      let p = last;
      while (p !== -1 && next[p][c] === undefined) { next[p][c] = cur; p = link[p]; }
      if (p === -1) link[cur] = 0;
      else {
        const q = next[p][c];
        if (len[p] + 1 === len[q]) link[cur] = q;
        else {
          const copy = len.length;
          next.push(Object.assign({}, next[q])); link.push(link[q]); len.push(len[p] + 1); first.push(first[q]); cloned.push(true);
          while (p !== -1 && next[p][c] === q) { next[p][c] = copy; p = link[p]; }
          link[q] = copy;
          link[cur] = copy;
        }
      }
      last = cur;
    }
    const states = len.length;
    const count = new Array(states).fill(0);
    for (let v = 1; v < states; v += 1) if (!cloned[v]) count[v] = 1;
    const bucket = new Array(text.length + 2).fill(0);
    for (let v = 0; v < states; v += 1) bucket[len[v]] += 1;
    for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1];
    const order = new Array(states);
    for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; }
    for (let i = states - 1; i >= 1; i -= 1) { const v = order[i]; if (link[v] > 0) count[link[v]] += count[v]; }
    return { next, link, len, count, first };
  }
  function findingPatterns(text, patterns) {
    const automaton = suffixAutomaton(text);
    const answers = [];
    for (let i = 0; i < patterns.length; i += 1) {
      let v = 0;
      for (let j = 0; j < patterns[i].length && v !== -1; j += 1) { const u = automaton.next[v][patterns[i][j]]; v = u === undefined ? -1 : u; }
      answers.push(v !== -1);
    }
    return answers;
  }
  function countingPatterns(text, patterns) {
    const automaton = suffixAutomaton(text);
    const answers = [];
    for (let i = 0; i < patterns.length; i += 1) {
      let v = 0;
      for (let j = 0; j < patterns[i].length && v !== -1; j += 1) { const u = automaton.next[v][patterns[i][j]]; v = u === undefined ? -1 : u; }
      answers.push(v === -1 ? 0 : automaton.count[v]);
    }
    return answers;
  }
  function patternPositions(text, patterns) {
    const automaton = suffixAutomaton(text);
    const answers = [];
    for (let i = 0; i < patterns.length; i += 1) {
      let v = 0;
      for (let j = 0; j < patterns[i].length && v !== -1; j += 1) { const u = automaton.next[v][patterns[i][j]]; v = u === undefined ? -1 : u; }
      answers.push(v === -1 ? -1 : automaton.first[v] - patterns[i].length + 2);
    }
    return answers;
  }
  function suffixArray(text) {
    const n = text.length;
    const sa = new Array(n), rank = new Array(n), fresh = new Array(n), second = new Array(n);
    const count = new Array(Math.max(256, n) + 1).fill(0);
    for (let i = 0; i < n; i += 1) { rank[i] = text.charCodeAt(i); count[rank[i]] += 1; }
    for (let c = 1; c < 256; c += 1) count[c] += count[c - 1];
    for (let i = n - 1; i >= 0; i -= 1) { count[rank[i]] -= 1; sa[count[rank[i]]] = i; }
    let classes = 1;
    fresh[sa[0]] = 0;
    for (let i = 1; i < n; i += 1) { if (rank[sa[i]] !== rank[sa[i - 1]]) classes += 1; fresh[sa[i]] = classes - 1; }
    for (let i = 0; i < n; i += 1) rank[i] = fresh[i];
    for (let k = 1; k < n && classes < n; k *= 2) {
      let p = 0;
      for (let i = n - k; i < n; i += 1) { second[p] = i; p += 1; }
      for (let i = 0; i < n; i += 1) if (sa[i] >= k) { second[p] = sa[i] - k; p += 1; }
      for (let c = 0; c <= classes; c += 1) count[c] = 0;
      for (let i = 0; i < n; i += 1) count[rank[i]] += 1;
      for (let c = 1; c < classes; c += 1) count[c] += count[c - 1];
      for (let i = n - 1; i >= 0; i -= 1) { const v = second[i]; count[rank[v]] -= 1; sa[count[rank[v]]] = v; }
      fresh[sa[0]] = 0;
      classes = 1;
      for (let i = 1; i < n; i += 1) {
        const a = sa[i - 1], b = sa[i];
        const tailA = a + k < n ? rank[a + k] : -1, tailB = b + k < n ? rank[b + k] : -1;
        if (rank[a] !== rank[b] || tailA !== tailB) classes += 1;
        fresh[b] = classes - 1;
      }
      for (let i = 0; i < n; i += 1) rank[i] = fresh[i];
    }
    return sa;
  }
  function lcpArray(text, sa) {
    const n = text.length;
    const rank = new Array(n);
    for (let i = 0; i < n; i += 1) rank[sa[i]] = i;
    const lcp = new Array(n).fill(0);
    let h = 0;
    for (let i = 0; i < n; i += 1) {
      if (rank[i] === 0) { h = 0; continue; }
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && text[i + h] === text[j + h]) h += 1;
      lcp[rank[i]] = h;
      if (h > 0) h -= 1;
    }
    return lcp;
  }
  function distinctSubstrings(text) {
    const n = text.length;
    const sa = suffixArray(text), lcp = lcpArray(text, sa);
    let total = n * (n + 1) / 2;
    for (let i = 0; i < n; i += 1) total -= lcp[i];
    return total;
  }
  function distinctSubsequences(text) {
    const m = 1000000007;
    const last = new Array(26).fill(0);
    let total = 1;
    for (let i = 0; i < text.length; i += 1) {
      const c = text.charCodeAt(i) - 97;
      const fresh = ((2 * total - last[c]) % m + m) % m;
      last[c] = total;
      total = fresh;
    }
    return ((total - 1) % m + m) % m;
  }
  function repeatingSubstring(text) {
    const sa = suffixArray(text), lcp = lcpArray(text, sa);
    let best = 0, at = 0;
    for (let i = 1; i < lcp.length; i += 1) if (lcp[i] > best) { best = lcp[i]; at = i; }
    return best === 0 ? null : text.substr(sa[at], best);
  }
  function stringFunctions(text) {
    return [zFunction(text), prefixFunction(text)];
  }
  function inverseSuffixArray(order) {
    const n = order.length;
    const rank = new Array(n + 2).fill(-1);
    for (let i = 0; i < n; i += 1) rank[order[i]] = i;
    const letters = new Array(n + 1).fill(0);
    let code = 0;
    for (let i = 1; i < n; i += 1) {
      if (rank[order[i - 1] + 1] > rank[order[i] + 1]) code += 1;
      if (code >= 26) return null;
      letters[order[i]] = code;
    }
    let out = "";
    for (let position = 1; position <= n; position += 1) out += String.fromCharCode(97 + letters[position]);
    return out;
  }
  function stringTransform(transformed) {
    const n = transformed.length;
    const codes = new Array(n);
    const count = new Array(28).fill(0);
    for (let i = 0; i < n; i += 1) { codes[i] = transformed[i] === "#" ? 0 : transformed.charCodeAt(i) - 96; count[codes[i] + 1] += 1; }
    for (let c = 1; c < 28; c += 1) count[c] += count[c - 1];
    const jump = new Array(n);
    for (let i = 0; i < n; i += 1) { jump[i] = count[codes[i]]; count[codes[i]] += 1; }
    const out = new Array(n - 1);
    let row = 0;
    for (let k = n - 2; k >= 0; k -= 1) { out[k] = transformed[row]; row = jump[row]; }
    return out.join("");
  }
  function substringOrderI(text, k) {
    const n = text.length;
    const sa = suffixArray(text), lcp = lcpArray(text, sa);
    let left = k;
    for (let i = 0; i < n; i += 1) {
      const fresh = n - sa[i] - lcp[i];
      if (left <= fresh) return text.substr(sa[i], lcp[i] + left);
      left -= fresh;
    }
    return null;
  }
  function substringOrderII(text, k) {
    const automaton = suffixAutomaton(text);
    const next = automaton.next, len = automaton.len, count = automaton.count;
    const states = len.length;
    const bucket = new Array(text.length + 2).fill(0);
    for (let v = 0; v < states; v += 1) bucket[len[v]] += 1;
    for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1];
    const order = new Array(states);
    for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; }
    const paths = new Array(states).fill(0);
    for (let i = states - 1; i >= 0; i -= 1) {
      const v = order[i];
      let total = count[v];
      const row = next[v];
      for (const c in row) total += paths[row[c]];
      paths[v] = total;
    }
    let v = 0, left = k, out = "";
    while (left > 0) {
      let moved = false;
      for (let c = 0; c < 26; c += 1) {
        const letter = String.fromCharCode(97 + c);
        const u = next[v][letter];
        if (u === undefined) continue;
        if (left <= paths[u]) { out += letter; left -= count[u]; v = u; moved = true; break; }
        left -= paths[u];
      }
      if (!moved) return null;
    }
    return out;
  }
  function substringDistribution(text) {
    const n = text.length;
    const sa = suffixArray(text), lcp = lcpArray(text, sa);
    const diff = new Array(n + 2).fill(0);
    for (let i = 0; i < n; i += 1) { diff[lcp[i] + 1] += 1; diff[n - sa[i] + 1] -= 1; }
    const out = new Array(n);
    let running = 0;
    for (let length = 1; length <= n; length += 1) { running += diff[length]; out[length - 1] = running; }
    return out;
  }

  // ------------------------------------------------------------------ helpers, brute forces and validators for the stress tests
  function randomLetters(seed, count, alphabet) {
    const next = rng(seed);
    let out = "";
    for (let i = 0; i < count; i += 1) out += alphabet[Math.floor(next() * alphabet.length)];
    return out;
  }
  function randomWords(seed, count, maxLength, alphabet) {
    const next = rng(seed);
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < count && guard < count * 20) {
      guard += 1;
      const length = 1 + Math.floor(next() * maxLength);
      let word = "";
      for (let i = 0; i < length; i += 1) word += alphabet[Math.floor(next() * alphabet.length)];
      if (seen.has(word)) continue;
      seen.add(word);
      out.push(word);
    }
    return out;
  }
  function randomPatterns(seed, count, maxLength, alphabet) {
    const next = rng(seed);
    const out = [];
    for (let p = 0; p < count; p += 1) {
      const length = 1 + Math.floor(next() * maxLength);
      let word = "";
      for (let i = 0; i < length; i += 1) word += alphabet[Math.floor(next() * alphabet.length)];
      out.push(word);
    }
    return out;
  }
  function randomPalindromeOps(seed, n, count) {
    const next = rng(seed);
    const out = [];
    for (let t = 0; t < count; t += 1) {
      if (next() < 0.5) out.push([1, 1 + Math.floor(next() * n), "abc"[Math.floor(next() * 3)]]);
      else if (next() < 0.5) { const a = 1 + Math.floor(next() * n); out.push([2, a, Math.min(n, a + Math.floor(next() * 3))]); }
      else { const a = 1 + Math.floor(next() * n), b = 1 + Math.floor(next() * n); out.push([2, Math.min(a, b), Math.max(a, b)]); }
    }
    return out;
  }
  function bwtOf(text) {
    const marked = text + "#";
    const sa = suffixArray(marked);
    const out = new Array(sa.length);
    for (let i = 0; i < sa.length; i += 1) out[i] = marked[(sa[i] + sa.length - 1) % sa.length];
    return out.join("");
  }
  function isPalindrome(text) {
    for (let i = 0, j = text.length - 1; i < j; i += 1, j -= 1) if (text[i] !== text[j]) return false;
    return true;
  }
  function allSubstrings(text) {
    const out = [];
    for (let i = 0; i < text.length; i += 1) for (let j = i + 1; j <= text.length; j += 1) out.push(text.slice(i, j));
    return out;
  }
  function occurrences(text, pattern) {
    let count = 0;
    for (let p = 0; p + pattern.length <= text.length; p += 1) if (text.startsWith(pattern, p)) count += 1;
    return count;
  }
  function wordCombinationsBrute(text, words) {
    const n = text.length;
    const ways = new Array(n + 1).fill(0);
    ways[0] = 1;
    for (let i = 0; i < n; i += 1) {
      for (let w = 0; w < words.length; w += 1) if (text.startsWith(words[w], i)) ways[i + words[w].length] = (ways[i + words[w].length] + ways[i]) % 1000000007;
    }
    return ways[n];
  }
  function prefixFunctionBrute(text) {
    const n = text.length;
    const pi = new Array(n).fill(0);
    for (let i = 1; i < n; i += 1) {
      for (let k = i; k >= 1; k -= 1) if (text.slice(0, k) === text.slice(i - k + 1, i + 1)) { pi[i] = k; break; }
    }
    return pi;
  }
  function zFunctionBrute(text) {
    const n = text.length;
    const z = new Array(n).fill(0);
    for (let i = 1; i < n; i += 1) while (i + z[i] < n && text[z[i]] === text[i + z[i]]) z[i] += 1;
    return z;
  }
  function stringMatchingBrute(text, pattern) { return occurrences(text, pattern); }
  function findingBordersBrute(text) {
    const out = [];
    for (let k = 1; k < text.length; k += 1) if (text.slice(0, k) === text.slice(text.length - k)) out.push(k);
    return out;
  }
  function findingPeriodsBrute(text) {
    const out = [];
    for (let p = 1; p <= text.length; p += 1) {
      let ok = true;
      for (let i = p; i < text.length && ok; i += 1) if (text[i] !== text[i - p]) ok = false;
      if (ok) out.push(p);
    }
    return out;
  }
  function minimalRotationBrute(text) {
    let best = text;
    for (let s = 1; s < text.length; s += 1) { const candidate = text.slice(s) + text.slice(0, s); if (candidate < best) best = candidate; }
    return best;
  }
  function manacherBrute(text) {
    const n = text.length;
    const odd = new Array(n).fill(0), even = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      while (i - odd[i] >= 0 && i + odd[i] < n && text[i - odd[i]] === text[i + odd[i]]) odd[i] += 1;
      while (i - even[i] - 1 >= 0 && i + even[i] < n && text[i - even[i] - 1] === text[i + even[i]]) even[i] += 1;
    }
    return { odd, even };
  }
  function longestPalindromeBrute(text) {
    let best = text[0];
    allSubstrings(text).forEach((sub) => { if (sub.length > best.length && isPalindrome(sub)) best = sub; });
    return best;
  }
  function longestPalindromeAccept(args, actual, expected) {
    const text = args[0];
    if (typeof actual !== "string") return "Return the palindrome itself as a string.";
    if (actual.length === 0 || text.indexOf(actual) === -1) return "The answer must be a substring of the text.";
    if (!isPalindrome(actual)) return "The answer is not a palindrome.";
    if (actual.length !== expected.length) return "A palindrome of length " + expected.length + " exists; yours has length " + actual.length + ".";
    return true;
  }
  function allPalindromesBrute(text) {
    const out = [];
    for (let j = 0; j < text.length; j += 1) {
      let best = 1;
      for (let l = j + 1; l >= 1; l -= 1) if (isPalindrome(text.slice(j - l + 1, j + 1))) { best = l; break; }
      out.push(best);
    }
    return out;
  }
  function requiredSubstringBrute(n, pattern) {
    let count = 0;
    const total = Math.pow(26, n);
    for (let code = 0; code < total; code += 1) {
      let rest = code, word = "";
      for (let i = 0; i < n; i += 1) { word += String.fromCharCode(65 + (rest % 26)); rest = Math.floor(rest / 26); }
      if (word.includes(pattern)) count += 1;
    }
    return count % 1000000007;
  }
  function palindromeQueriesBrute(text, operations) {
    const letters = text.split("");
    const out = [];
    operations.forEach((op) => {
      if (op[0] === 1) letters[op[1] - 1] = op[2];
      else out.push(isPalindrome(letters.slice(op[1] - 1, op[2]).join("")));
    });
    return out;
  }
  function canonicalStates(automaton) {
    const next = automaton.next;
    const states = next.length;
    const map = new Array(states).fill(-1);
    const order = [0];
    map[0] = 0;
    for (let i = 0; i < order.length; i += 1) {
      const row = next[order[i]];
      if (!row || typeof row !== "object") return "next[" + order[i] + "] must be an object mapping letters to states.";
      const keys = Object.keys(row).sort();
      for (let k = 0; k < keys.length; k += 1) {
        const u = row[keys[k]];
        if (!Number.isInteger(u) || u < 0 || u >= states) return "next[" + order[i] + "][" + keys[k] + "] points outside the automaton.";
        if (map[u] === -1) { map[u] = order.length; order.push(u); }
      }
    }
    if (order.length !== states) return "Every state must be reachable from the root by transitions.";
    return { map, order };
  }
  function suffixAutomatonAccept(args, actual, expected) {
    if (!actual || typeof actual !== "object") return "Return { next, link, len, count, first }.";
    const parts = ["next", "link", "len", "count", "first"];
    for (let i = 0; i < parts.length; i += 1) if (!Array.isArray(actual[parts[i]])) return parts[i] + " must be an array with one entry per state.";
    const states = actual.next.length;
    for (let i = 1; i < parts.length; i += 1) if (actual[parts[i]].length !== states) return parts[i] + " must have one entry per state (" + states + ").";
    if (states !== expected.next.length) return "The automaton for this text has " + expected.next.length + " states; yours has " + states + ".";
    const mine = canonicalStates(actual);
    if (typeof mine === "string") return mine;
    const theirs = canonicalStates(expected);
    for (let i = 0; i < states; i += 1) {
      const a = mine.order[i], e = theirs.order[i];
      const where = i === 0 ? "the root" : "the state of the string reached first in alphabetical order (#" + i + ")";
      if (actual.len[a] !== expected.len[e]) return "len is wrong at " + where + ": expected " + expected.len[e] + ".";
      const linkA = actual.link[a] === -1 ? -1 : mine.map[actual.link[a]];
      const linkE = expected.link[e] === -1 ? -1 : theirs.map[expected.link[e]];
      if (linkA !== linkE) return "The suffix link is wrong at " + where + ".";
      if (i > 0 && actual.count[a] !== expected.count[e]) return "count is wrong at " + where + ": expected " + expected.count[e] + ".";
      if (actual.first[a] !== expected.first[e]) return "first is wrong at " + where + ": expected " + expected.first[e] + ".";
      const keysA = Object.keys(actual.next[a]).sort(), keysE = Object.keys(expected.next[e]).sort();
      if (keysA.join("") !== keysE.join("")) return "The transitions differ at " + where + ": expected letters " + keysE.join(", ") + ".";
      for (let k = 0; k < keysA.length; k += 1) if (mine.map[actual.next[a][keysA[k]]] !== theirs.map[expected.next[e][keysE[k]]]) return "Transition " + keysA[k] + " from " + where + " leads to the wrong state.";
    }
    return true;
  }
  function suffixAutomatonCheck(args, out) {
    const text = args[0];
    const n = text.length;
    if (!out || !Array.isArray(out.next) || out.next.length > 2 * Math.max(1, n)) return false;
    const walk = (word) => { let v = 0; for (let i = 0; i < word.length; i += 1) { v = out.next[v][word[i]]; if (v === undefined) return -1; } return v; };
    const seen = new Set(allSubstrings(text));
    let ok = true;
    seen.forEach((sub) => {
      if (!ok) return;
      const v = walk(sub);
      if (v === -1) { ok = false; return; }
      let firstEnd = -1;
      for (let p = 0; p + sub.length <= n && firstEnd < 0; p += 1) if (text.startsWith(sub, p)) firstEnd = p + sub.length - 1;
      if (out.count[v] !== occurrences(text, sub) || out.first[v] !== firstEnd || out.len[v] < sub.length) ok = false;
      if (v !== 0 && out.len[out.link[v]] >= out.len[v]) ok = false;
    });
    if (!ok) return false;
    const queue = [""];
    for (let i = 0; i < queue.length; i += 1) {
      if (queue[i].length >= 3) continue;
      for (const letter of "abc") { const word = queue[i] + letter; queue.push(word); if ((walk(word) !== -1) !== seen.has(word)) return false; }
    }
    return true;
  }
  function findingPatternsBrute(text, patterns) { return patterns.map((pattern) => text.includes(pattern)); }
  function countingPatternsBrute(text, patterns) { return patterns.map((pattern) => occurrences(text, pattern)); }
  function patternPositionsBrute(text, patterns) { return patterns.map((pattern) => { const at = text.indexOf(pattern); return at === -1 ? -1 : at + 1; }); }
  function suffixArrayBrute(text) {
    const out = [];
    for (let i = 0; i < text.length; i += 1) out.push(i);
    return out.sort((a, b) => (text.slice(a) < text.slice(b) ? -1 : 1));
  }
  function lcpArrayBrute(text, sa) {
    const out = [0];
    for (let i = 1; i < sa.length; i += 1) {
      let h = 0;
      while (sa[i] + h < text.length && sa[i - 1] + h < text.length && text[sa[i] + h] === text[sa[i - 1] + h]) h += 1;
      out.push(h);
    }
    return out;
  }
  function distinctSubstringsBrute(text) { return new Set(allSubstrings(text)).size; }
  function distinctSubsequencesBrute(text) {
    const seen = new Set();
    for (let mask = 1; mask < (1 << text.length); mask += 1) {
      let word = "";
      for (let i = 0; i < text.length; i += 1) if (mask & (1 << i)) word += text[i];
      seen.add(word);
    }
    return seen.size % 1000000007;
  }
  function repeatingSubstringBrute(text) {
    for (let length = text.length - 1; length >= 1; length -= 1) {
      const seen = new Set();
      for (let i = 0; i + length <= text.length; i += 1) { const sub = text.substr(i, length); if (seen.has(sub)) return sub; seen.add(sub); }
    }
    return null;
  }
  function repeatingSubstringAccept(args, actual, expected) {
    const text = args[0];
    if (expected === null) return actual === null ? true : "No substring occurs twice in this text; return null.";
    if (actual === null) return "A substring of length " + expected.length + " occurs twice; return it.";
    if (typeof actual !== "string" || actual.length === 0) return "Return the repeating substring itself as a string.";
    const first = text.indexOf(actual);
    if (first === -1 || text.indexOf(actual, first + 1) === -1) return "The answer must occur at least twice in the text.";
    if (actual.length !== expected.length) return "A repeating substring of length " + expected.length + " exists; yours has length " + actual.length + ".";
    return true;
  }
  function stringFunctionsBrute(text) { return [zFunctionBrute(text), prefixFunctionBrute(text)]; }
  function inverseSuffixArrayAccept(args, actual, expected) {
    const order = args[0];
    const n = order.length;
    if (expected === null) return actual === null ? true : "No string over a–z has this suffix array; return null.";
    if (actual === null) return "A string with this suffix array exists; build it.";
    if (typeof actual !== "string" || actual.length !== n) return "Return a string of length " + n + ".";
    if (!/^[a-z]+$/.test(actual)) return "Use only the letters a–z.";
    const sa = suffixArray(actual);
    for (let i = 0; i < n; i += 1) if (sa[i] + 1 !== order[i]) return "The suffix array of your string differs at position " + (i + 1) + ": suffix " + (sa[i] + 1) + " instead of " + order[i] + ".";
    return true;
  }
  function stringTransformCheck(args, out) { return typeof out === "string" && out.length === args[0].length - 1 && bwtOf(out) === args[0]; }
  function substringOrderIBrute(text, k) { return Array.from(new Set(allSubstrings(text))).sort()[k - 1]; }
  function substringOrderIIBrute(text, k) { return allSubstrings(text).sort()[k - 1]; }
  function substringDistributionBrute(text) {
    const out = [];
    for (let length = 1; length <= text.length; length += 1) {
      const seen = new Set();
      for (let i = 0; i + length <= text.length; i += 1) seen.add(text.substr(i, length));
      out.push(seen.size);
    }
    return out;
  }
  function suffixOrderOf(text) { return suffixArray(text).map((position) => position + 1); }
  function smallText(seed, round, alphabet) { return randomLetters(seed + round, 1 + (round % 10), alphabet || (round % 2 === 0 ? "ab" : "abc")); }

  // ------------------------------------------------------------------ hidden inputs (built once, on demand)
  const TEXT_BIG_AB = lazy(() => randomLetters(801, 1000000, "ab"));
  const TEXT_MID_AB = lazy(() => randomLetters(802, 100000, "ab"));
  const TEXT_MID_ABC = lazy(() => randomLetters(803, 100000, "abc"));
  const TEXT_ALPHA_BIG = lazy(() => randomLetters(804, 500000, "abcdefghijklmnopqrstuvwxyz"));
  const WORD_TEXT = lazy(() => randomLetters(805, 5000, "ab"));
  const WORD_LIST = lazy(() => randomWords(806, 10000, 30, "ab"));
  const PATTERNS_MID = lazy(() => randomPatterns(807, 100000, 8, "abc"));
  const PALINDROME_TEXT = lazy(() => randomLetters(808, 200000, "ab"));
  const PALINDROME_OPS = lazy(() => randomPalindromeOps(809, 200000, 200000));
  const SUFFIX_ORDER_MID = lazy(() => suffixOrderOf(TEXT_MID_AB()));
  const TRANSFORM_BIG = lazy(() => bwtOf(randomLetters(810, 500000, "ab")));
  const ORDER_I_K = lazy(() => Math.floor(distinctSubstrings(TEXT_MID_AB()) * 0.61));
  const REQUIRED_PATTERN = lazy(() => randomLetters(811, 100, "AB"));
  const ALL_A_BIG = lazy(() => "a".repeat(1000000));
  const ALL_A_MID = lazy(() => "a".repeat(100000));
  const PALINDROME_ALL_A = lazy(() => "a".repeat(200000));
  const SUFFIX_ARRAY_MID = lazy(() => suffixArray(TEXT_MID_AB()));
  const AB_REPEAT_BIG = lazy(() => "ab".repeat(500000));
  const PALINDROME_TEXT_SHORT = lazy(() => TEXT_BIG_AB().slice(0, 200000));
  const DESCENDING_30 = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  const SAMPLE_TEXT = "aybabtu";
  const SAMPLE_OPS = [[2, 3, 5], [1, 3, "x"], [2, 3, 5], [1, 5, "x"], [2, 3, 5]];
  const SAMPLE_PATTERNS = ["bab", "abc", "ayba"];
  const SAMPLE_PATTERNS_II = ["bab", "abc", "a"];

  const STRINGS = [
    {
      id: "word-combinations", title: "Word Combinations", cses: { id: 1731, name: "Word Combinations" },
      goal: "Count the ways to write the text as a concatenation of dictionary words (a word may be reused), modulo 10⁹ + 7.",
      concept: "ways[i] = the number of ways to build the first i letters. From each position walk the text down a trie of the words; every terminal node passed is a word that ends there, and it adds ways[i] to the position after it.",
      functionName: "wordCombinations", signature: "wordCombinations(text, words) → number",
      starterSource: starter("wordCombinations", "text, words", "Build a trie of the words; ways[0] = 1; from each i with ways[i] > 0 walk the trie along the text."),
      solve: wordCombinations, comparator: "scalar", brute: wordCombinationsBrute, small: (round) => [randomLetters(100 + round, 1 + (round % 8), "ab"), randomWords(200 + round, 1 + (round % 4), 3, "ab")],
      reference: book("26.2", "Trie structure"),
      presets: { "CSES sample": { a: "ababc", b: ["ab", "abab", "c", "cb"] }, "two ways": { a: "aaaa", b: ["a", "aa"] }, none: { a: "abc", b: ["ab", "c", "bc"] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-once", "Each word found from position i continues all ways[i] partial builds, not one.", function wordCombinations(text, words) { const m = 1000000007; let total = 1; for (let i = 0; i < words.length; i += 1) total += words[i].length; const child = new Int32Array(26 * (total + 1)); const terminal = new Uint8Array(total + 1); let nodes = 1; for (let i = 0; i < words.length; i += 1) { let node = 0; for (let j = 0; j < words[i].length; j += 1) { const slot = node * 26 + (words[i].charCodeAt(j) - 97); if (child[slot] === 0) { child[slot] = nodes; nodes += 1; } node = child[slot]; } terminal[node] = 1; } const n = text.length; const ways = new Array(n + 1).fill(0); ways[0] = 1; for (let i = 0; i < n; i += 1) { if (ways[i] === 0) continue; let node = 0; for (let j = i; j < n; j += 1) { node = child[node * 26 + (text.charCodeAt(j) - 97)]; if (node === 0) break; if (terminal[node] === 1) ways[j + 1] = (ways[j + 1] + 1) % m; } } return ways[n]; }),
        diagnosis("stops-at-first-word", "A longer word can start at the same position; keep walking after a terminal node.", function wordCombinations(text, words) { const m = 1000000007; let total = 1; for (let i = 0; i < words.length; i += 1) total += words[i].length; const child = new Int32Array(26 * (total + 1)); const terminal = new Uint8Array(total + 1); let nodes = 1; for (let i = 0; i < words.length; i += 1) { let node = 0; for (let j = 0; j < words[i].length; j += 1) { const slot = node * 26 + (words[i].charCodeAt(j) - 97); if (child[slot] === 0) { child[slot] = nodes; nodes += 1; } node = child[slot]; } terminal[node] = 1; } const n = text.length; const ways = new Array(n + 1).fill(0); ways[0] = 1; for (let i = 0; i < n; i += 1) { if (ways[i] === 0) continue; let node = 0; for (let j = i; j < n; j += 1) { node = child[node * 26 + (text.charCodeAt(j) - 97)]; if (node === 0) break; if (terminal[node] === 1) { ways[j + 1] = (ways[j + 1] + ways[i]) % m; break; } } } return ways[n]; }),
      ],
      hints: ["Trie: child[node][letter] and a terminal flag per node; insert every word.", "ways[0] = 1. For each i with ways[i] > 0: node = root; for j from i: step by text[j], stop when there is no child; when the node is terminal add ways[i] to ways[j + 1].", "Reduce modulo 10⁹ + 7 and return ways[n]."],
      cases: [
        example(["ababc", ["ab", "abab", "c", "cb"]], 2, "CSES sample"),
        example(["aaaa", ["a", "aa"]], 5, "fibonacci splits"),
        example(["abc", ["ab", "c", "bc"]], 1, "one way"),
        example(["abc", ["ab", "bc"]], 0, "no way"),
        hidden("n = 5 000 with 10 000 words, time limit", () => [WORD_TEXT(), WORD_LIST()]),
      ],
    },
    {
      id: "prefix-function", title: "Prefix Function", cses: { id: 1753, name: "String Matching (brick)" },
      goal: "For every i, the length of the longest proper prefix of text[0..i] that is also its suffix (the KMP failure function).",
      concept: "If the border of the previous position has length k and the next letters agree, the border grows to k + 1. If they disagree, the next candidate is the border of the border, pi[k − 1], and so on down to 0. Every step down was paid for by an earlier step up, so the whole thing is linear.",
      functionName: "prefixFunction", signature: "prefixFunction(text) → array",
      starterSource: starter("prefixFunction", "text", "pi[0] = 0; for i ≥ 1 start from k = pi[i − 1], fall back while text[i] ≠ text[k], extend on a match."),
      solve: prefixFunction, comparator: "deep", brute: prefixFunctionBrute, small: (round) => [smallText(300, round)],
      reference: book("26.1", "String terminology · borders"),
      presets: { "CSES sample": { a: "abaabca" }, periodic: { a: "abcabcab" }, "all equal": { a: "aaaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("restarts-from-zero", "On a mismatch the next candidate border is pi[k − 1], not 0; a shorter border may still extend.", function prefixFunction(text) { const n = text.length; const pi = new Array(n).fill(0); for (let i = 1; i < n; i += 1) { let k = pi[i - 1]; if (k > 0 && text[i] !== text[k]) k = 0; if (text[i] === text[k]) k += 1; pi[i] = k; } return pi; }),
        diagnosis("never-extends", "After the fall-back loop, a match of text[i] with text[k] extends the border by one.", function prefixFunction(text) { const n = text.length; const pi = new Array(n).fill(0); for (let i = 1; i < n; i += 1) { let k = pi[i - 1]; while (k > 0 && text[i] !== text[k]) k = pi[k - 1]; pi[i] = k; } return pi; }),
      ],
      hints: ["pi[0] = 0.", "k = pi[i − 1]; while (k > 0 && text[i] !== text[k]) k = pi[k − 1];", "if (text[i] === text[k]) k += 1; pi[i] = k."],
      cases: [
        example(["abaabca"], [0, 0, 1, 1, 2, 0, 1], "CSES sample"),
        example(["aabaaab"], [0, 1, 0, 1, 2, 2, 3], "fall back twice"),
        example(["abcabcab"], [0, 0, 0, 1, 2, 3, 4, 5], "periodic"),
        example(["a"], [0], "one letter"),
        hidden("n = 10⁶, time limit", () => [TEXT_BIG_AB()]),
      ],
    },
    {
      id: "z-function", title: "Z-Function", cses: { id: 1753, name: "String Matching (brick)" },
      goal: "For every i ≥ 1, the length of the longest substring starting at i that is also a prefix of the text; z[0] = 0.",
      concept: "Keep the rightmost match window [left, right) found so far. Inside it, position i mirrors position i − left of the prefix, so z[i] starts at min(z[i − left], right − i) instead of 0 and only needs extending past the window.",
      functionName: "zFunction", signature: "zFunction(text) → array",
      starterSource: starter("zFunction", "text", "Window [left, right); z[i] = min(right − i, z[i − left]) when i < right; extend while letters agree; move the window when it grows."),
      solve: zFunction, comparator: "deep", brute: zFunctionBrute, small: (round) => [smallText(400, round)],
      reference: book("26.4", "Z-algorithm"),
      presets: { "CSES sample": { a: "abaabca" }, "all equal": { a: "aaaaa" }, periodic: { a: "abababab" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("z-zero-is-n", "By the CSES convention z[0] = 0, not the whole length.", function zFunction(text) { const n = text.length; const z = new Array(n).fill(0); z[0] = n; let left = 0, right = 0; for (let i = 1; i < n; i += 1) { if (i < right) z[i] = Math.min(right - i, z[i - left]); while (i + z[i] < n && text[z[i]] === text[i + z[i]]) z[i] += 1; if (i + z[i] > right) { left = i; right = i + z[i]; } } return z; }),
        diagnosis("no-window-clip", "The copied value must be clipped to right − i; beyond the window nothing is known yet.", function zFunction(text) { const n = text.length; const z = new Array(n).fill(0); let left = 0, right = 0; for (let i = 1; i < n; i += 1) { if (i < right) z[i] = z[i - left]; while (i + z[i] < n && text[z[i]] === text[i + z[i]]) z[i] += 1; if (i + z[i] > right) { left = i; right = i + z[i]; } } return z; }),
      ],
      hints: ["left = right = 0; z[0] = 0.", "For i ≥ 1: if i < right, z[i] = min(right − i, z[i − left]).", "Extend while text[z[i]] === text[i + z[i]]; if i + z[i] > right, set left = i, right = i + z[i]."],
      cases: [
        example(["abaabca"], [0, 0, 1, 2, 0, 0, 1], "CSES sample"),
        example(["aaaaa"], [0, 4, 3, 2, 1], "all equal"),
        example(["abababab"], [0, 0, 6, 0, 4, 0, 2, 0], "periodic"),
        example(["a"], [0], "one letter"),
        hidden("n = 10⁶, time limit", () => [TEXT_BIG_AB()]),
      ],
    },
    {
      id: "string-matching", title: "String Matching", cses: { id: 1753, name: "String Matching" },
      goal: "Count the positions where the pattern occurs in the text.",
      concept: "Glue pattern + '#' + text with a letter that appears in neither. In the Z-array of that string, a position inside the text part matches the pattern exactly when its z-value reaches the pattern length; the separator stops any match from running past the pattern.",
      functionName: "stringMatching", signature: "stringMatching(text, pattern) → number",
      starterSource: starter("stringMatching", "text, pattern", "z = zFunction(pattern + '#' + text); count z[i] ≥ pattern.length over the text part."),
      solve: stringMatching, comparator: "scalar", dependencies: ["z-function", "prefix-function"], brute: stringMatchingBrute, small: (round) => [randomLetters(500 + round, 1 + (round % 10), "ab"), randomLetters(600 + round, 1 + (round % 3), "ab")],
      reference: book("26.4", "Z-algorithm · pattern matching"),
      presets: { "CSES sample": { a: "saippuakauppias", b: "pp" }, overlapping: { a: "aaaa", b: "aa" }, none: { a: "abcd", b: "e" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("no-separator", "Without a separator the tail of the pattern can match into the text and be counted.", function stringMatching(text, pattern) { const m = pattern.length; const z = zFunction(pattern + text); let count = 0; for (let i = 1; i < z.length; i += 1) if (z[i] >= m) count += 1; return count; }),
        diagnosis("skips-overlaps", "Occurrences may overlap; every position counts, not only non-overlapping ones.", function stringMatching(text, pattern) { const m = pattern.length; const z = zFunction(pattern + "#" + text); let count = 0; let i = m + 1; while (i < z.length) { if (z[i] >= m) { count += 1; i += m; } else i += 1; } return count; }),
      ],
      hints: ["Build pattern + '#' + text.", "Run zFunction (or prefixFunction) on it.", "Count indices i > pattern.length with z[i] ≥ pattern.length."],
      cases: [
        example(["saippuakauppias", "pp"], 2, "CSES sample"),
        example(["aaaa", "aa"], 3, "overlapping occurrences"),
        example(["ab", "aa"], 0, "tail of the pattern must not match into the text"),
        example(["abcd", "e"], 0, "none"),
        example(["abc", "abc"], 1, "whole text"),
        hidden("n = 10⁶, m = 3, time limit", () => [TEXT_BIG_AB(), "aba"]),
        hidden("n = 10⁶ of a, m = 1 000 of a, time limit", () => [ALL_A_BIG(), "a".repeat(1000)]),
      ],
    },
    {
      id: "finding-borders", title: "Finding Borders", cses: { id: 1732, name: "Finding Borders" },
      goal: "All border lengths of the text in increasing order: a border is a proper prefix that is also a suffix.",
      concept: "The longest border is pi[n − 1]. Every shorter border of the text is a border of that border, so following pi[k − 1] from k = pi[n − 1] lists them all from longest to shortest.",
      functionName: "findingBorders", signature: "findingBorders(text) → array",
      starterSource: starter("findingBorders", "text", "pi = prefixFunction(text); k = pi[n − 1]; while k > 0 collect k and set k = pi[k − 1]; return in increasing order."),
      solve: findingBorders, comparator: "deep", dependencies: ["prefix-function"], brute: findingBordersBrute, small: (round) => [smallText(700, round)],
      reference: book("26.1", "String terminology · borders"),
      presets: { "CSES sample": { a: "abcababcab" }, "all equal": { a: "aaaa" }, none: { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("includes-whole", "The whole string is not a border; only proper prefixes count.", function findingBorders(text) { const pi = prefixFunction(text); const borders = []; let k = pi[text.length - 1]; while (k > 0) { borders.push(k); k = pi[k - 1]; } borders.reverse(); borders.push(text.length); return borders; }),
        diagnosis("longest-only", "Shorter borders are borders of the longest one; follow pi[k − 1] down.", function findingBorders(text) { const pi = prefixFunction(text); const k = pi[text.length - 1]; return k > 0 ? [k] : []; }),
      ],
      hints: ["pi = prefixFunction(text).", "k = pi[n − 1]; while (k > 0) { push k; k = pi[k − 1]; }", "Reverse the list so it increases."],
      cases: [
        example(["abcababcab"], [2, 5], "CSES sample"),
        example(["aaaa"], [1, 2, 3], "all equal"),
        example(["abcd"], [], "no border"),
        example(["a"], [], "one letter"),
        hidden("n = 10⁶ of ab repeated, time limit", () => [AB_REPEAT_BIG()]),
      ],
    },
    {
      id: "finding-periods", title: "Finding Periods", cses: { id: 1733, name: "Finding Periods" },
      goal: "All period lengths of the text in increasing order: p is a period when text[i] = text[i − p] for every i ≥ p.",
      concept: "A period p and a border of length n − p are the same fact seen from two sides: shifting the string by p onto itself matches exactly when the last n − p letters equal the first n − p. So the periods are n − k for every border k, plus n itself.",
      functionName: "findingPeriods", signature: "findingPeriods(text) → array",
      starterSource: starter("findingPeriods", "text", "Follow the border chain from pi[n − 1]; each border k gives period n − k; finish with n."),
      solve: findingPeriods, comparator: "deep", dependencies: ["prefix-function"], brute: findingPeriodsBrute, small: (round) => [smallText(800, round)],
      reference: book("26.1", "String terminology · periods"),
      presets: { "CSES sample": { a: "abcabca" }, "all equal": { a: "aaaa" }, none: { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("borders-not-periods", "A border of length k means a period of n − k, not k.", function findingPeriods(text) { const n = text.length; const pi = prefixFunction(text); const borders = []; let k = pi[n - 1]; while (k > 0) { borders.push(k); k = pi[k - 1]; } borders.reverse(); borders.push(n); return borders; }),
        diagnosis("drops-full-length", "The whole length n is always a period (the repetition happens zero times).", function findingPeriods(text) { const n = text.length; const pi = prefixFunction(text); const periods = []; let k = pi[n - 1]; while (k > 0) { periods.push(n - k); k = pi[k - 1]; } return periods; }),
      ],
      hints: ["The border chain from pi[n − 1] is decreasing, so n − k is increasing along it.", "Push n − k for each border k.", "Push n at the end."],
      cases: [
        example(["abcabca"], [3, 6, 7], "CSES sample"),
        example(["aaaa"], [1, 2, 3, 4], "all equal"),
        example(["abcd"], [4], "no repetition"),
        example(["a"], [1], "one letter"),
        hidden("n = 10⁶ of ab repeated, time limit", () => [AB_REPEAT_BIG()]),
      ],
    },
    {
      id: "minimal-rotation", title: "Minimal Rotation", cses: { id: 1110, name: "Minimal Rotation" },
      goal: "The lexicographically smallest rotation of the text.",
      concept: "Keep two candidate starts i and j and the length k of their common prefix. When the rotations first differ at offset k, the loser cannot start any smaller rotation, and neither can any of the k positions after it (each of those is beaten by the corresponding position after the winner), so the loser jumps past all of them. Total work is linear.",
      functionName: "minimalRotation", signature: "minimalRotation(text) → string",
      starterSource: starter("minimalRotation", "text", "i = 0, j = 1, k = 0; compare text[(i + k) % n] with text[(j + k) % n]; on a tie k += 1, otherwise the larger side jumps by k + 1 (and j ≠ i)."),
      solve: minimalRotation, comparator: "scalar", brute: minimalRotationBrute, small: (round) => [smallText(900, round)],
      reference: book("26.1", "String terminology · rotations"),
      presets: { "CSES sample": { a: "acab" }, periodic: { a: "abab" }, "already minimal": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("smallest-letter-start", "Starting at the first smallest letter is not enough; what follows it decides between equal first letters.", function minimalRotation(text) { let start = 0; for (let i = 1; i < text.length; i += 1) if (text[i] < text[start]) start = i; return text.slice(start) + text.slice(0, start); }),
        diagnosis("maximal-rotation", "The comparison is backwards: the candidate with the larger letter is the one to discard.", function minimalRotation(text) { const n = text.length; let i = 0, j = 1, k = 0; while (i < n && j < n && k < n) { const a = text[(i + k) % n], b = text[(j + k) % n]; if (a === b) { k += 1; continue; } if (a < b) i += k + 1; else j += k + 1; if (i === j) j += 1; k = 0; } const start = Math.min(i, j); return text.slice(start) + text.slice(0, start); }),
      ],
      hints: ["Compare text[(i + k) % n] and text[(j + k) % n]; equal letters extend k.", "If the i side is larger: i += k + 1, else j += k + 1; if i === j, j += 1; then k = 0.", "Stop when i, j or k reaches n; the answer starts at min(i, j)."],
      cases: [
        example(["acab"], "abac", "CSES sample"),
        example(["abab"], "abab", "periodic"),
        example(["abcd"], "abcd", "already minimal"),
        example(["baaab"], "aaabb", "run of smallest letters"),
        example(["a"], "a", "one letter"),
        hidden("n = 10⁶, time limit", () => [TEXT_BIG_AB()]),
        hidden("n = 10⁶ of ab repeated, time limit", () => [AB_REPEAT_BIG()]),
      ],
    },
    {
      id: "manacher", title: "Palindrome Radii", cses: { id: 1111, name: "Longest Palindrome (brick)" },
      goal: "Return { odd, even }: odd[i] is the number of odd-length palindromes centred at i (the longest has length 2 · odd[i] − 1); even[i] is the number of even-length palindromes centred between i − 1 and i (the longest has length 2 · even[i]).",
      concept: "Manacher's trick: keep the palindrome that reaches furthest right. A centre inside it has a mirror centre on the left whose radius is already known, so the new radius starts at min(mirror radius, distance to the right edge) and only has to be extended from there.",
      functionName: "manacher", signature: "manacher(text) → { odd, even }",
      starterSource: starter("manacher", "text", "Two passes with a window [left, right]: start k from the mirror value clipped to the window, extend while letters agree, move the window when it grows."),
      solve: manacher, comparator: "deep", brute: manacherBrute, small: (round) => [smallText(1000, round)],
      reference: book("26.1", "String terminology · palindromes"),
      presets: { "CSES sample": { a: "aybabtu" }, "even centre": { a: "abba" }, "all equal": { a: "aaaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("odd-only", "Even-length palindromes have their centre between two letters; they need the second pass.", function manacher(text) { const n = text.length; const odd = new Array(n).fill(0), even = new Array(n).fill(0); for (let i = 0, left = 0, right = -1; i < n; i += 1) { let k = i > right ? 1 : Math.min(odd[left + right - i], right - i + 1); while (i - k >= 0 && i + k < n && text[i - k] === text[i + k]) k += 1; odd[i] = k; if (i + k - 1 > right) { left = i - k + 1; right = i + k - 1; } } return { odd, even }; }),
        diagnosis("radius-not-count", "odd[i] counts the palindromes centred at i, so the single letter itself counts as 1.", function manacher(text) { const n = text.length; const odd = new Array(n).fill(0), even = new Array(n).fill(0); for (let i = 0, left = 0, right = -1; i < n; i += 1) { let k = i > right ? 1 : Math.min(odd[left + right - i] + 1, right - i + 1); while (i - k >= 0 && i + k < n && text[i - k] === text[i + k]) k += 1; odd[i] = k - 1; if (i + k - 1 > right) { left = i - k + 1; right = i + k - 1; } } for (let i = 0, left = 0, right = -1; i < n; i += 1) { let k = i > right ? 0 : Math.min(even[left + right - i + 1], right - i + 1); while (i - k - 1 >= 0 && i + k < n && text[i - k - 1] === text[i + k]) k += 1; even[i] = k; if (i + k - 1 > right) { left = i - k; right = i + k - 1; } } return { odd, even }; }),
      ],
      hints: ["Odd pass: k = i > right ? 1 : min(odd[left + right − i], right − i + 1); extend while text[i − k] === text[i + k]; odd[i] = k; if i + k − 1 > right, left = i − k + 1, right = i + k − 1.", "Even pass: k = i > right ? 0 : min(even[left + right − i + 1], right − i + 1); extend while text[i − k − 1] === text[i + k]; even[i] = k; window left = i − k, right = i + k − 1.", "Return { odd, even }."],
      cases: [
        example(["aybabtu"], { odd: [1, 1, 1, 2, 1, 1, 1], even: [0, 0, 0, 0, 0, 0, 0] }, "CSES sample"),
        example(["abba"], { odd: [1, 1, 1, 1], even: [0, 0, 2, 0] }, "even centre"),
        example(["aaaa"], { odd: [1, 2, 2, 1], even: [0, 1, 2, 1] }, "all equal"),
        example(["a"], { odd: [1], even: [0] }, "one letter"),
        hidden("n = 200 000, time limit", () => [PALINDROME_TEXT_SHORT()]),
        hidden("n = 200 000 of a, time limit", () => [PALINDROME_ALL_A()]),
      ],
    },
    {
      id: "longest-palindrome", title: "Longest Palindrome", cses: { id: 1111, name: "Longest Palindrome" },
      goal: "A longest palindromic substring of the text. Any one of them is accepted.",
      concept: "With the radii known, the longest palindrome is the largest of 2 · odd[i] − 1 and 2 · even[i] over all centres; the start follows from the centre and the radius.",
      functionName: "longestPalindrome", signature: "longestPalindrome(text) → string",
      starterSource: starter("longestPalindrome", "text", "radii = manacher(text); scan both arrays for the largest length and cut it out."),
      solve: longestPalindrome, comparator: "scalar", dependencies: ["manacher"], accept: longestPalindromeAccept, check: (args, out) => longestPalindromeAccept(args, out, longestPalindromeBrute(args[0])) === true, small: (round) => [smallText(1100, round)],
      reference: book("26.1", "String terminology · palindromes"),
      presets: { "CSES sample": { a: "aybabtu" }, "even length": { a: "cabbad" }, "no repeats": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("odd-only", "An even-length palindrome can be the longest; check the even radii too.", function longestPalindrome(text) { const radii = manacher(text); let bestStart = 0, bestLength = 1; for (let i = 0; i < text.length; i += 1) if (2 * radii.odd[i] - 1 > bestLength) { bestLength = 2 * radii.odd[i] - 1; bestStart = i - radii.odd[i] + 1; } return text.substr(bestStart, bestLength); }),
        diagnosis("half-length", "odd[i] is the radius; the palindrome has length 2 · odd[i] − 1 and starts at i − odd[i] + 1.", function longestPalindrome(text) { const radii = manacher(text); let best = 0; for (let i = 0; i < text.length; i += 1) if (radii.odd[i] > radii.odd[best]) best = i; return text.substr(best - radii.odd[best] + 1, radii.odd[best]); }),
      ],
      hints: ["radii = manacher(text).", "Odd candidate at i: length 2 · odd[i] − 1 starting at i − odd[i] + 1. Even candidate: length 2 · even[i] starting at i − even[i].", "Keep the longest and return text.substr(start, length)."],
      cases: [
        example(["aybabtu"], "bab", "CSES sample"),
        example(["cabbad"], "abba", "even length"),
        example(["abcd"], "a", "single letter"),
        example(["aaaa"], "aaaa", "whole text"),
        hidden("n = 10⁶, time limit", () => [TEXT_BIG_AB()]),
      ],
    },
    {
      id: "all-palindromes", title: "All Palindromes", cses: { id: 3138, name: "All Palindromes" },
      goal: "For every position, the length of the longest palindrome that ends there.",
      concept: "Each centre's longest palindrome ends at one position; record it there. Stripping the outer two letters of a palindrome leaves a palindrome ending one position earlier, so a right-to-left pass with best[j − 1] = max(best[j − 1], best[j] − 2) hands every longer answer down to the positions before it.",
      functionName: "allPalindromes", signature: "allPalindromes(text) → array",
      starterSource: starter("allPalindromes", "text", "radii = manacher(text); best[end] = max over centres ending there; then sweep right to left with best[j] − 2."),
      solve: allPalindromes, comparator: "deep", dependencies: ["manacher"], brute: allPalindromesBrute, small: (round) => [smallText(1200, round)],
      reference: book("26.1", "String terminology · palindromes"),
      presets: { "CSES sample": { a: "ababbababaa" }, "all equal": { a: "aaaa" }, "no repeats": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-propagation", "A palindrome ending at j also gives one of length − 2 ending at j − 1; the right-to-left pass is needed.", function allPalindromes(text) { const n = text.length; const radii = manacher(text); const best = new Array(n).fill(1); for (let i = 0; i < n; i += 1) { const oddEnd = i + radii.odd[i] - 1; if (2 * radii.odd[i] - 1 > best[oddEnd]) best[oddEnd] = 2 * radii.odd[i] - 1; if (radii.even[i] > 0) { const evenEnd = i + radii.even[i] - 1; if (2 * radii.even[i] > best[evenEnd]) best[evenEnd] = 2 * radii.even[i]; } } return best; }),
        diagnosis("centres-not-ends", "The question is about palindromes ending at each position, not centred there.", function allPalindromes(text) { const radii = manacher(text); const out = []; for (let i = 0; i < text.length; i += 1) out.push(Math.max(2 * radii.odd[i] - 1, 2 * radii.even[i])); return out; }),
      ],
      hints: ["best[j] = 1 for every j.", "For each centre i: the odd palindrome ends at i + odd[i] − 1 with length 2 · odd[i] − 1; the even one (if even[i] > 0) ends at i + even[i] − 1 with length 2 · even[i].", "for j from n − 1 down to 1: best[j − 1] = max(best[j − 1], best[j] − 2)."],
      cases: [
        example(["ababbababaa"], [1, 1, 3, 3, 2, 4, 6, 8, 5, 5, 2], "CSES sample"),
        example(["aaaa"], [1, 2, 3, 4], "all equal"),
        example(["abcd"], [1, 1, 1, 1], "no repeats"),
        example(["abacaba"], [1, 1, 3, 1, 3, 5, 7], "nested"),
        hidden("n = 200 000, time limit", () => [PALINDROME_TEXT_SHORT()]),
      ],
    },
    {
      id: "required-substring", title: "Required Substring", cses: { id: 1112, name: "Required Substring" },
      goal: "Count the strings of length n over A–Z that contain the pattern as a substring, modulo 10⁹ + 7.",
      concept: "Count the strings that avoid the pattern and subtract from 26ⁿ. While a string is read, the only thing that matters is how much of the pattern its tail currently matches; that is a KMP automaton state, and the prefix function gives the state after every letter. Count strings per state, n steps long, never entering the full-match state.",
      functionName: "requiredSubstring", signature: "requiredSubstring(n, pattern) → number",
      starterSource: starter("requiredSubstring", "n, pattern", "go[state][letter] from prefixFunction(pattern); ways over states for n steps avoiding state m; answer = 26ⁿ − avoiders."),
      solve: requiredSubstring, comparator: "scalar", dependencies: ["prefix-function"], brute: requiredSubstringBrute, small: (round) => [1 + (round % 3), randomLetters(1300 + round, 1 + (round % 3), "AB")],
      reference: book("26.4", "Z-algorithm · pattern automaton"),
      presets: { "CSES sample": { a: 6, b: "ABCDB" }, "two As": { a: 3, b: "AA" }, "one letter": { a: 2, b: "Q" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("fallback-to-start", "After a mismatch the matched tail may still match a shorter prefix; the next state is go[pi[state − 1]][letter], not 0.", function requiredSubstring(n, pattern) { const m = 1000000007; const k = pattern.length; const go = []; for (let state = 0; state < k; state += 1) { const row = new Array(26).fill(0); for (let c = 0; c < 26; c += 1) if (pattern.charCodeAt(state) - 65 === c) row[c] = state + 1; go.push(row); } let ways = new Array(k).fill(0); ways[0] = 1; for (let step = 0; step < n; step += 1) { const next = new Array(k).fill(0); for (let state = 0; state < k; state += 1) { if (ways[state] === 0) continue; for (let c = 0; c < 26; c += 1) { const to = go[state][c]; if (to < k) next[to] = (next[to] + ways[state]) % m; } } ways = next; } let avoiding = 0; for (let state = 0; state < k; state += 1) avoiding = (avoiding + ways[state]) % m; let total = 1; for (let step = 0; step < n; step += 1) total = total * 26 % m; return ((total - avoiding) % m + m) % m; }),
        diagnosis("counts-avoiders", "The automaton counts the strings that avoid the pattern; subtract them from 26ⁿ.", function requiredSubstring(n, pattern) { const m = 1000000007; const k = pattern.length; const pi = prefixFunction(pattern); const go = []; for (let state = 0; state < k; state += 1) { const row = new Array(26); for (let c = 0; c < 26; c += 1) { if (pattern.charCodeAt(state) - 65 === c) row[c] = state + 1; else row[c] = state === 0 ? 0 : go[pi[state - 1]][c]; } go.push(row); } let ways = new Array(k).fill(0); ways[0] = 1; for (let step = 0; step < n; step += 1) { const next = new Array(k).fill(0); for (let state = 0; state < k; state += 1) { if (ways[state] === 0) continue; for (let c = 0; c < 26; c += 1) { const to = go[state][c]; if (to < k) next[to] = (next[to] + ways[state]) % m; } } ways = next; } let avoiding = 0; for (let state = 0; state < k; state += 1) avoiding = (avoiding + ways[state]) % m; return avoiding; }),
      ],
      hints: ["go[state][c] = state + 1 when pattern[state] is letter c, else go[pi[state − 1]][c] (0 when state is 0).", "ways[0] = 1; repeat n times: move every state's count along all 26 letters, dropping moves into state m.", "Answer = 26ⁿ − Σ ways, reduced modulo 10⁹ + 7."],
      cases: [
        example([6, "ABCDB"], 52, "CSES sample"),
        example([3, "AA"], 51, "two As"),
        run(requiredSubstring, [4, "AAB"], "pattern with a border"),
        example([2, "Q"], 51, "one letter"),
        example([1, "AB"], 0, "pattern longer than n"),
        hidden("n = 1 000, m = 100, time limit", () => [1000, REQUIRED_PATTERN()]),
      ],
    },
    {
      id: "palindrome-queries", title: "Palindrome Queries", cses: { id: 2420, name: "Palindrome Queries" },
      goal: "Process [1, k, x] (set letter k to x) and [2, a, b] (is text[a..b] a palindrome?) with 1-based positions; return the answers as booleans.",
      concept: "A polynomial hash Σ letter · Bⁱ is a sum, so a Fenwick tree can hold it and update one letter at a time. Keep one tree with weights Bⁱ and one with weights Bⁿ⁺¹⁻ⁱ; the second reads the string backwards. A range is a palindrome when its forward and backward hashes agree after aligning their powers: F · Bⁿ⁺¹⁻ᵇ = R · Bᵃ (mod p).",
      functionName: "palindromeQueries", signature: "palindromeQueries(text, operations) → booleans",
      starterSource: starter("palindromeQueries", "text, operations", "power[i] = Bⁱ mod p via mulMod; two Fenwick trees over letter · power; compare mulMod(f, power[n + 1 − b]) with mulMod(r, power[a])."),
      solve: palindromeQueries, comparator: "deep", dependencies: ["fenwick-add", "fenwick-prefix", "mul-mod"], brute: palindromeQueriesBrute, small: (round) => { const n = 1 + (round % 8); return [randomLetters(1400 + round, n, "ab"), randomPalindromeOps(1500 + round, n, 1 + (round % 6))]; },
      reference: book("26.3", "String hashing"),
      presets: { "CSES sample": { a: "aybabtu", b: SAMPLE_OPS }, "make one": { a: "abcd", b: [[2, 1, 4], [1, 4, "a"], [1, 3, "b"], [2, 1, 4]] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("powers-not-aligned", "The two hashes use different power offsets; multiply the forward one by Bⁿ⁺¹⁻ᵇ and the backward one by Bᵃ before comparing.", function palindromeQueries(text, operations) { const m = 1000000007, base = 911382323; const n = text.length; const power = new Array(n + 2); power[0] = 1; for (let i = 1; i <= n + 1; i += 1) power[i] = mulMod(power[i - 1], base, m); const letters = new Array(n + 1).fill(0); const forward = new Array(n + 1).fill(0), backward = new Array(n + 1).fill(0); for (let i = 1; i <= n; i += 1) { letters[i] = text.charCodeAt(i - 1) - 96; fenwickAdd(forward, i, mulMod(letters[i], power[i], m)); fenwickAdd(backward, i, mulMod(letters[i], power[n + 1 - i], m)); } const answers = []; for (let t = 0; t < operations.length; t += 1) { const op = operations[t]; if (op[0] === 1) { const k = op[1], code = op[2].charCodeAt(0) - 96; const delta = ((code - letters[k]) % m + m) % m; letters[k] = code; fenwickAdd(forward, k, mulMod(delta, power[k], m)); fenwickAdd(backward, k, mulMod(delta, power[n + 1 - k], m)); } else { const a = op[1], b = op[2]; const f = ((fenwickPrefix(forward, b) - fenwickPrefix(forward, a - 1)) % m + m) % m; const r = ((fenwickPrefix(backward, b) - fenwickPrefix(backward, a - 1)) % m + m) % m; answers.push(f === r); } } return answers; }),
        diagnosis("ignores-updates", "Type 1 operations change the string; both trees must be updated by (new − old) · power.", function palindromeQueries(text, operations) { const m = 1000000007, base = 911382323; const n = text.length; const power = new Array(n + 2); power[0] = 1; for (let i = 1; i <= n + 1; i += 1) power[i] = mulMod(power[i - 1], base, m); const forward = new Array(n + 1).fill(0), backward = new Array(n + 1).fill(0); for (let i = 1; i <= n; i += 1) { const code = text.charCodeAt(i - 1) - 96; fenwickAdd(forward, i, mulMod(code, power[i], m)); fenwickAdd(backward, i, mulMod(code, power[n + 1 - i], m)); } const answers = []; for (let t = 0; t < operations.length; t += 1) { const op = operations[t]; if (op[0] !== 2) continue; const a = op[1], b = op[2]; const f = ((fenwickPrefix(forward, b) - fenwickPrefix(forward, a - 1)) % m + m) % m; const r = ((fenwickPrefix(backward, b) - fenwickPrefix(backward, a - 1)) % m + m) % m; answers.push(mulMod(f, power[n + 1 - b], m) === mulMod(r, power[a], m)); } return answers; }),
      ],
      hints: ["power[i] = mulMod(power[i − 1], B, p) for i up to n + 1; letters as codes 1..26.", "forward gets letter · power[i] at i; backward gets letter · power[n + 1 − i]. An update adds (new − old mod p) · power to both.", "f = range sum of forward over a..b mod p, r likewise; palindrome ⇔ mulMod(f, power[n + 1 − b], p) === mulMod(r, power[a], p)."],
      cases: [
        example(["aybabtu", SAMPLE_OPS], [true, false, true], "CSES sample"),
        example(["abcd", [[2, 1, 4], [1, 4, "a"], [1, 3, "b"], [2, 1, 4]]], [false, true], "made into a palindrome"),
        example(["a", [[2, 1, 1], [1, 1, "z"], [2, 1, 1]]], [true, true], "one letter"),
        example(["abba", [[2, 2, 3], [2, 1, 3], [2, 1, 4]]], [true, false, true], "several ranges"),
        hidden("n = m = 200 000, time limit", () => [PALINDROME_TEXT(), PALINDROME_OPS()]),
      ],
    },
    {
      id: "suffix-automaton", title: "Suffix Automaton", cses: { id: 2102, name: "Finding Patterns (brick)" },
      goal: "Build the suffix automaton of the text: return { next, link, len, count, first } where next[v] is a plain object mapping a letter to a state, link[v] the suffix link (−1 for the root), len[v] the longest string of the state, count[v] its number of occurrences in the text (0 for the root) and first[v] the end index of its first occurrence (−1 for the root). States may be numbered in any order.",
      concept: "Every substring is a path from the root, and substrings with the same set of end positions share a state. Appending one letter adds a state and walks the suffix links of the previous last state; when a link target already has that letter but with a longer string, the target is split by cloning it. Counting sort states by len, then push each state's count into its link to get occurrence counts.",
      functionName: "suffixAutomaton", signature: "suffixAutomaton(text) → { next, link, len, count, first }",
      starterSource: starter("suffixAutomaton", "text", "Standard construction: cur = new state; walk p = last along links adding next[p][c] = cur; on an existing target q either link to it (len[p] + 1 === len[q]) or clone q; then counts via len-sorted order."),
      solve: suffixAutomaton, comparator: "deep", accept: suffixAutomatonAccept, check: suffixAutomatonCheck, small: (round) => [smallText(1600, round)],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu" }, "needs a clone": { a: "abab" }, "all equal": { a: "aaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("never-clones", "When len[p] + 1 ≠ len[q] the state q holds strings that are too long for the new suffix; it must be split by a clone.", function suffixAutomaton(text) { const next = [{}], link = [-1], len = [0], first = [-1]; let last = 0; for (let i = 0; i < text.length; i += 1) { const c = text[i]; const cur = len.length; next.push({}); link.push(-1); len.push(len[last] + 1); first.push(i); let p = last; while (p !== -1 && next[p][c] === undefined) { next[p][c] = cur; p = link[p]; } link[cur] = p === -1 ? 0 : next[p][c]; last = cur; } const states = len.length; const count = new Array(states).fill(0); for (let v = 1; v < states; v += 1) count[v] = 1; const bucket = new Array(text.length + 2).fill(0); for (let v = 0; v < states; v += 1) bucket[len[v]] += 1; for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1]; const order = new Array(states); for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; } for (let i = states - 1; i >= 1; i -= 1) { const v = order[i]; if (link[v] > 0) count[link[v]] += count[v]; } return { next, link, len, count, first }; }),
        diagnosis("clones-counted", "A clone is not an end position of its own; only the states created for a letter start with count 1.", function suffixAutomaton(text) { const next = [{}], link = [-1], len = [0], first = [-1]; let last = 0; for (let i = 0; i < text.length; i += 1) { const c = text[i]; const cur = len.length; next.push({}); link.push(-1); len.push(len[last] + 1); first.push(i); let p = last; while (p !== -1 && next[p][c] === undefined) { next[p][c] = cur; p = link[p]; } if (p === -1) link[cur] = 0; else { const q = next[p][c]; if (len[p] + 1 === len[q]) link[cur] = q; else { const copy = len.length; next.push(Object.assign({}, next[q])); link.push(link[q]); len.push(len[p] + 1); first.push(first[q]); while (p !== -1 && next[p][c] === q) { next[p][c] = copy; p = link[p]; } link[q] = copy; link[cur] = copy; } } last = cur; } const states = len.length; const count = new Array(states).fill(1); count[0] = 0; const bucket = new Array(text.length + 2).fill(0); for (let v = 0; v < states; v += 1) bucket[len[v]] += 1; for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1]; const order = new Array(states); for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; } for (let i = states - 1; i >= 1; i -= 1) { const v = order[i]; if (link[v] > 0) count[link[v]] += count[v]; } return { next, link, len, count, first }; }),
      ],
      hints: ["Root: next = {}, link = −1, len = 0, first = −1. For letter c at index i: cur with len[last] + 1 and first = i; p = last; while p ≠ −1 and next[p][c] is undefined: next[p][c] = cur, p = link[p].", "If p is −1, link[cur] = 0. Else q = next[p][c]: if len[p] + 1 === len[q], link[cur] = q; otherwise clone q (copy its transitions, link and first, len = len[p] + 1), redirect next[p][c] === q to the clone along the links, and link both q and cur to the clone.", "count = 1 for non-clone states; sort states by len (counting sort) and add count[v] into count[link[v]] from longest to shortest, leaving the root at 0."],
      cases: [
        run(suffixAutomaton, ["aybabtu"], "CSES sample"),
        run(suffixAutomaton, ["abab"], "needs a clone"),
        run(suffixAutomaton, ["aaa"], "all equal"),
        run(suffixAutomaton, ["a"], "one letter"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB()]),
      ],
    },
    {
      id: "finding-patterns", title: "Finding Patterns", cses: { id: 2102, name: "Finding Patterns" },
      goal: "For each pattern, whether it occurs in the text; return booleans.",
      concept: "Every substring of the text is a path from the root of its suffix automaton, and nothing else is. Walking a pattern letter by letter either follows transitions all the way (it occurs) or falls off (it does not).",
      functionName: "findingPatterns", signature: "findingPatterns(text, patterns) → booleans",
      starterSource: starter("findingPatterns", "text, patterns", "automaton = suffixAutomaton(text); walk each pattern from state 0."),
      solve: findingPatterns, comparator: "deep", dependencies: ["suffix-automaton"], brute: findingPatternsBrute, small: (round) => [randomLetters(1700 + round, 1 + (round % 8), "ab"), randomPatterns(1800 + round, 1 + (round % 4), 3, "ab")],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu", b: SAMPLE_PATTERNS }, letters: { a: "ab", b: ["ba", "ab", "b"] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("prefix-only", "A pattern may start anywhere in the text; the automaton handles that, a startsWith check does not.", function findingPatterns(text, patterns) { return patterns.map((pattern) => text.startsWith(pattern)); }),
        diagnosis("letters-only", "Having every letter somewhere in the text is not the same as containing the pattern.", function findingPatterns(text, patterns) { const present = new Set(text.split("")); return patterns.map((pattern) => pattern.split("").every((letter) => present.has(letter))); }),
      ],
      hints: ["Build the automaton once.", "v = 0; for each letter: v = next[v][letter]; stop with false when it is undefined.", "true when all letters were followed."],
      cases: [
        example(["aybabtu", SAMPLE_PATTERNS], [true, false, true], "CSES sample"),
        example(["ab", ["ba", "ab", "b"]], [false, true, true], "letters present but not in order"),
        example(["aaa", ["aaaa", "aaa", "a"]], [false, true, true], "longer than the text"),
        hidden("n = 100 000, k = 100 000, time limit", () => [TEXT_MID_ABC(), PATTERNS_MID()]),
      ],
    },
    {
      id: "counting-patterns", title: "Counting Patterns", cses: { id: 2103, name: "Counting Patterns" },
      goal: "For each pattern, the number of positions where it occurs in the text.",
      concept: "All strings of one automaton state end at the same positions, so a state's count is the number of occurrences of every string in it. Walk the pattern to its state and read count.",
      functionName: "countingPatterns", signature: "countingPatterns(text, patterns) → array",
      starterSource: starter("countingPatterns", "text, patterns", "Walk each pattern in suffixAutomaton(text); answer count[v] or 0."),
      solve: countingPatterns, comparator: "deep", dependencies: ["suffix-automaton"], brute: countingPatternsBrute, small: (round) => [randomLetters(1900 + round, 1 + (round % 8), "ab"), randomPatterns(2000 + round, 1 + (round % 4), 3, "ab")],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu", b: SAMPLE_PATTERNS_II }, overlapping: { a: "aaaa", b: ["aa", "a", "aaaa"] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("presence-only", "The state's count is the number of occurrences; 1 only says the pattern exists.", function countingPatterns(text, patterns) { const automaton = suffixAutomaton(text); return patterns.map((pattern) => { let v = 0; for (let j = 0; j < pattern.length && v !== -1; j += 1) { const u = automaton.next[v][pattern[j]]; v = u === undefined ? -1 : u; } return v === -1 ? 0 : 1; }); }),
        diagnosis("state-size", "len[v] − len[link[v]] counts the distinct strings in the state, not the pattern's occurrences.", function countingPatterns(text, patterns) { const automaton = suffixAutomaton(text); return patterns.map((pattern) => { let v = 0; for (let j = 0; j < pattern.length && v !== -1; j += 1) { const u = automaton.next[v][pattern[j]]; v = u === undefined ? -1 : u; } return v === -1 ? 0 : automaton.len[v] - automaton.len[automaton.link[v]]; }); }),
      ],
      hints: ["automaton = suffixAutomaton(text).", "Walk the pattern; if it falls off, the count is 0.", "Otherwise the answer is automaton.count[v]."],
      cases: [
        example(["aybabtu", SAMPLE_PATTERNS_II], [1, 0, 2], "CSES sample"),
        example(["aaaa", ["aa", "a", "aaaa"]], [3, 4, 1], "overlapping occurrences"),
        example(["abab", ["ab", "ba", "abab", "bb"]], [2, 1, 1, 0], "mixed"),
        hidden("n = 100 000, k = 100 000, time limit", () => [TEXT_MID_ABC(), PATTERNS_MID()]),
      ],
    },
    {
      id: "pattern-positions", title: "Pattern Positions", cses: { id: 2104, name: "Pattern Positions" },
      goal: "For each pattern, the 1-based position of its first occurrence in the text, or −1.",
      concept: "first[v] is the end index of the earliest occurrence of the state's strings; the pattern starts |pattern| − 1 before that end. A clone inherits first from the state it was split from, since it shares those end positions.",
      functionName: "patternPositions", signature: "patternPositions(text, patterns) → array",
      starterSource: starter("patternPositions", "text, patterns", "Walk each pattern; answer first[v] − pattern.length + 2, or −1."),
      solve: patternPositions, comparator: "deep", dependencies: ["suffix-automaton"], brute: patternPositionsBrute, small: (round) => [randomLetters(2100 + round, 1 + (round % 8), "ab"), randomPatterns(2200 + round, 1 + (round % 4), 3, "ab")],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu", b: SAMPLE_PATTERNS_II }, repeated: { a: "abab", b: ["ab", "bab", "b"] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("end-position", "first[v] is where the first occurrence ends; the question asks where it starts.", function patternPositions(text, patterns) { const automaton = suffixAutomaton(text); return patterns.map((pattern) => { let v = 0; for (let j = 0; j < pattern.length && v !== -1; j += 1) { const u = automaton.next[v][pattern[j]]; v = u === undefined ? -1 : u; } return v === -1 ? -1 : automaton.first[v] + 1; }); }),
        diagnosis("zero-indexed", "CSES positions are 1-based; add one to the start index.", function patternPositions(text, patterns) { const automaton = suffixAutomaton(text); return patterns.map((pattern) => { let v = 0; for (let j = 0; j < pattern.length && v !== -1; j += 1) { const u = automaton.next[v][pattern[j]]; v = u === undefined ? -1 : u; } return v === -1 ? -1 : automaton.first[v] - pattern.length + 1; }); }),
      ],
      hints: ["Walk the pattern to state v (−1 if it falls off).", "The first occurrence ends at index first[v], so it starts at first[v] − pattern.length + 1 (0-based).", "Return that + 1, or −1."],
      cases: [
        example(["aybabtu", SAMPLE_PATTERNS_II], [3, -1, 1], "CSES sample"),
        example(["abab", ["ab", "bab", "b"]], [1, 2, 2], "repeated pattern"),
        example(["aaaa", ["aaaa", "aa"]], [1, 1], "whole text"),
        hidden("n = 100 000, k = 100 000, time limit", () => [TEXT_MID_ABC(), PATTERNS_MID()]),
      ],
    },
    {
      id: "suffix-array", title: "Suffix Array", cses: { id: 2105, name: "Distinct Substrings (brick)" },
      goal: "The starting indices (0-based) of all suffixes of the text in lexicographic order; a shorter suffix comes before a longer one that starts with it.",
      concept: "Prefix doubling: after round k every suffix has a rank by its first k letters. Sorting pairs (rank[i], rank[i + k]) gives ranks by 2k letters, with a missing second half ranked below everything. Two counting sorts per round make each round linear, and the ranks are all distinct after log n rounds.",
      functionName: "suffixArray", signature: "suffixArray(text) → array",
      starterSource: starter("suffixArray", "text", "Counting sort by letter; then for k = 1, 2, 4, …: order by second half (empty first), stable counting sort by first rank, recompute ranks from equal pairs."),
      solve: suffixArray, comparator: "deep", brute: suffixArrayBrute, small: (round) => [smallText(2300, round)],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu" }, banana: { a: "banana" }, "all equal": { a: "aaaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("first-letter-only", "Suffixes with the same first letter still have to be ordered by what follows; keep doubling until every rank is distinct.", function suffixArray(text) { const n = text.length; const sa = new Array(n), rank = new Array(n); const count = new Array(257).fill(0); for (let i = 0; i < n; i += 1) { rank[i] = text.charCodeAt(i); count[rank[i]] += 1; } for (let c = 1; c < 256; c += 1) count[c] += count[c - 1]; for (let i = n - 1; i >= 0; i -= 1) { count[rank[i]] -= 1; sa[count[rank[i]]] = i; } return sa; }),
        diagnosis("empty-tail-largest", "A suffix that runs out of letters is the smaller one, so a missing second half ranks below every real rank.", function suffixArray(text) { const n = text.length; const sa = new Array(n), rank = new Array(n), fresh = new Array(n), second = new Array(n); const count = new Array(Math.max(256, n) + 2).fill(0); for (let i = 0; i < n; i += 1) { rank[i] = text.charCodeAt(i); count[rank[i]] += 1; } for (let c = 1; c < 256; c += 1) count[c] += count[c - 1]; for (let i = n - 1; i >= 0; i -= 1) { count[rank[i]] -= 1; sa[count[rank[i]]] = i; } let classes = 1; fresh[sa[0]] = 0; for (let i = 1; i < n; i += 1) { if (rank[sa[i]] !== rank[sa[i - 1]]) classes += 1; fresh[sa[i]] = classes - 1; } for (let i = 0; i < n; i += 1) rank[i] = fresh[i]; for (let k = 1; k < n && classes < n; k *= 2) { let p = 0; for (let i = 0; i < n; i += 1) if (sa[i] >= k) { second[p] = sa[i] - k; p += 1; } for (let i = n - k; i < n; i += 1) { second[p] = i; p += 1; } for (let c = 0; c <= classes; c += 1) count[c] = 0; for (let i = 0; i < n; i += 1) count[rank[i]] += 1; for (let c = 1; c < classes; c += 1) count[c] += count[c - 1]; for (let i = n - 1; i >= 0; i -= 1) { const v = second[i]; count[rank[v]] -= 1; sa[count[rank[v]]] = v; } fresh[sa[0]] = 0; classes = 1; for (let i = 1; i < n; i += 1) { const a = sa[i - 1], b = sa[i]; const tailA = a + k < n ? rank[a + k] : n, tailB = b + k < n ? rank[b + k] : n; if (rank[a] !== rank[b] || tailA !== tailB) classes += 1; fresh[b] = classes - 1; } for (let i = 0; i < n; i += 1) rank[i] = fresh[i]; } return sa; }),
      ],
      hints: ["Round 0: counting sort indices by letter code; compress the codes to ranks 0..classes − 1.", "Round k: list suffixes by their second half (indices ≥ n − k first, then sa[i] − k for sa[i] ≥ k); stable counting sort that list by rank; a suffix whose second half is missing has tail rank −1.", "New rank increases whenever (rank, tail rank) differs from the previous pair; stop when classes === n."],
      cases: [
        example(["aybabtu"], [3, 0, 2, 4, 5, 6, 1], "CSES sample (Inverse Suffix Array)"),
        example(["banana"], [5, 3, 1, 0, 4, 2], "banana"),
        example(["aaaa"], [3, 2, 1, 0], "all equal: shorter first"),
        example(["abab"], [2, 0, 3, 1], "periodic"),
        example(["a"], [0], "one letter"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB()]),
        hidden("n = 100 000 of a, time limit", () => [ALL_A_MID()]),
      ],
    },
    {
      id: "lcp-array", title: "LCP Array", cses: { id: 2105, name: "Distinct Substrings (brick)" },
      goal: "Given the text and its suffix array, lcp[i] = the length of the longest common prefix of the suffixes sa[i − 1] and sa[i]; lcp[0] = 0.",
      concept: "Kasai's observation: if suffix i shares h letters with its predecessor in the suffix array, then suffix i + 1 shares at least h − 1 letters with its own predecessor. Processing suffixes in text order and only ever dropping h by one keeps the total work linear.",
      functionName: "lcpArray", signature: "lcpArray(text, sa) → array",
      starterSource: starter("lcpArray", "text, sa", "rank[sa[i]] = i; h = 0; for i in text order with rank[i] > 0: extend h against sa[rank[i] − 1], store, then h = max(h − 1, 0)."),
      solve: lcpArray, comparator: "deep", brute: lcpArrayBrute, small: (round) => { const text = smallText(2400, round); return [text, suffixArray(text)]; },
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "aybabtu", b: [3, 0, 2, 4, 5, 6, 1] }, banana: { a: "banana", b: [5, 3, 1, 0, 4, 2] }, "all equal": { a: "aaaa", b: [3, 2, 1, 0] } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("shifted-convention", "lcp[i] pairs sa[i] with sa[i − 1], so the first entry is 0 and the last one is meaningful.", function lcpArray(text, sa) { const n = text.length; const rank = new Array(n); for (let i = 0; i < n; i += 1) rank[sa[i]] = i; const lcp = new Array(n).fill(0); let h = 0; for (let i = 0; i < n; i += 1) { if (rank[i] === 0) { h = 0; continue; } const j = sa[rank[i] - 1]; while (i + h < n && j + h < n && text[i + h] === text[j + h]) h += 1; lcp[rank[i]] = h; if (h > 0) h -= 1; } const shifted = new Array(n).fill(0); for (let i = 0; i + 1 < n; i += 1) shifted[i] = lcp[i + 1]; return shifted; }),
        diagnosis("off-by-one", "h counts matching letters only; the first mismatching letter is not part of the common prefix.", function lcpArray(text, sa) { const n = text.length; const rank = new Array(n); for (let i = 0; i < n; i += 1) rank[sa[i]] = i; const lcp = new Array(n).fill(0); let h = 0; for (let i = 0; i < n; i += 1) { if (rank[i] === 0) { h = 0; continue; } const j = sa[rank[i] - 1]; while (i + h < n && j + h < n && text[i + h] === text[j + h]) h += 1; lcp[rank[i]] = h + 1; if (h > 0) h -= 1; } return lcp; }),
      ],
      hints: ["rank[sa[i]] = i.", "For i from 0 to n − 1: if rank[i] === 0, h = 0; else j = sa[rank[i] − 1], extend h while text[i + h] === text[j + h], lcp[rank[i]] = h.", "After storing, decrease h by one (not below 0) before the next i."],
      cases: [
        example(["aybabtu", [3, 0, 2, 4, 5, 6, 1]], [0, 1, 0, 1, 0, 0, 0], "CSES sample text"),
        example(["banana", [5, 3, 1, 0, 4, 2]], [0, 1, 3, 0, 0, 2], "banana"),
        example(["aaaa", [3, 2, 1, 0]], [0, 1, 2, 3], "all equal"),
        example(["a", [0]], [0], "one letter"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB(), SUFFIX_ARRAY_MID()]),
      ],
    },
    {
      id: "distinct-substrings", title: "Distinct Substrings", cses: { id: 2105, name: "Distinct Substrings" },
      goal: "The number of distinct non-empty substrings of the text.",
      concept: "Every substring is a prefix of some suffix. Walking the suffix array, suffix sa[i] contributes n − sa[i] prefixes, of which the first lcp[i] were already contributed by its predecessor. So the answer is n(n + 1)/2 − Σ lcp.",
      functionName: "distinctSubstrings", signature: "distinctSubstrings(text) → number",
      starterSource: starter("distinctSubstrings", "text", "sa = suffixArray(text); lcp = lcpArray(text, sa); n(n + 1)/2 − sum of lcp."),
      solve: distinctSubstrings, comparator: "scalar", dependencies: ["suffix-array", "lcp-array"], brute: distinctSubstringsBrute, small: (round) => [smallText(2500, round)],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "abaa" }, "all equal": { a: "aaaa" }, "all distinct": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("forgets-lcp", "n(n + 1)/2 counts every substring position; equal substrings must be removed via the LCP values.", function distinctSubstrings(text) { const n = text.length; return n * (n + 1) / 2; }),
        diagnosis("max-lcp-only", "Every adjacent pair in the suffix array repeats lcp[i] substrings; subtract all of them, not the largest.", function distinctSubstrings(text) { const n = text.length; const sa = suffixArray(text), lcp = lcpArray(text, sa); let best = 0; for (let i = 0; i < n; i += 1) if (lcp[i] > best) best = lcp[i]; return n * (n + 1) / 2 - best; }),
      ],
      hints: ["sa = suffixArray(text); lcp = lcpArray(text, sa).", "total = n · (n + 1) / 2.", "Subtract every lcp[i]."],
      cases: [
        example(["abaa"], 8, "CSES sample"),
        example(["aaaa"], 4, "all equal"),
        example(["abcd"], 10, "all distinct"),
        example(["a"], 1, "one letter"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB()]),
        hidden("n = 100 000 of a, time limit", () => [ALL_A_MID()]),
      ],
    },
    {
      id: "distinct-subsequences", title: "Distinct Subsequences", cses: { id: 1149, name: "Distinct Subsequences" },
      goal: "The number of distinct non-empty strings obtainable by deleting characters, modulo 10⁹ + 7.",
      concept: "Let total be the number of distinct subsequences so far, counting the empty one. Appending letter c doubles it, except that every subsequence ending in c that existed just before the previous c was appended is now counted twice. Remember total at the time each letter was last seen and subtract it.",
      functionName: "distinctSubsequences", signature: "distinctSubsequences(text) → number",
      starterSource: starter("distinctSubsequences", "text", "total = 1; per letter: fresh = 2 · total − last[c]; last[c] = total; total = fresh; answer total − 1."),
      solve: distinctSubsequences, comparator: "scalar", brute: distinctSubsequencesBrute, small: (round) => [smallText(2600, round)],
      reference: book("7", "Dynamic programming · counting subsequences"),
      presets: { "CSES sample": { a: "aybabtu" }, "all equal": { a: "aaa" }, "all distinct": { a: "abc" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("no-subtraction", "Doubling alone gives 2ⁿ − 1 and counts equal subsequences several times.", function distinctSubsequences(text) { const m = 1000000007; let total = 1; for (let i = 0; i < text.length; i += 1) total = 2 * total % m; return ((total - 1) % m + m) % m; }),
        diagnosis("subtracts-current", "last[c] must hold the total from just before the previous c, so store the old total, not the new one.", function distinctSubsequences(text) { const m = 1000000007; const last = new Array(26).fill(0); let total = 1; for (let i = 0; i < text.length; i += 1) { const c = text.charCodeAt(i) - 97; total = ((2 * total - last[c]) % m + m) % m; last[c] = total; } return ((total - 1) % m + m) % m; }),
      ],
      hints: ["total = 1 (the empty subsequence); last[c] = 0 for every letter.", "For each letter: fresh = 2 · total − last[c] (mod p), then last[c] = total, total = fresh.", "Return total − 1 (mod p)."],
      cases: [
        example(["aybabtu"], 103, "CSES sample"),
        example(["aaa"], 3, "all equal"),
        example(["abc"], 7, "all distinct"),
        example(["abab"], 11, "repeats"),
        hidden("n = 500 000, time limit", () => [TEXT_ALPHA_BIG()]),
      ],
    },
    {
      id: "repeating-substring", title: "Repeating Substring", cses: { id: 2106, name: "Repeating Substring" },
      goal: "A longest substring that occurs at least twice, or null when no substring repeats. Any longest one is accepted.",
      concept: "Two occurrences of a substring are prefixes of two suffixes, and the closest such pair in sorted order is adjacent in the suffix array. So the longest repeat is the largest LCP value, and it starts at the corresponding suffix.",
      functionName: "repeatingSubstring", signature: "repeatingSubstring(text) → string | null",
      starterSource: starter("repeatingSubstring", "text", "sa, lcp; find the largest lcp[i]; return text.substr(sa[i], lcp[i]) or null when it is 0."),
      solve: repeatingSubstring, comparator: "scalar", dependencies: ["suffix-array", "lcp-array"], accept: repeatingSubstringAccept, check: (args, out) => repeatingSubstringAccept(args, out, repeatingSubstringBrute(args[0])) === true, small: (round) => [smallText(2700, round)],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "cabababc" }, "no repeat": { a: "abcd" }, "all equal": { a: "aaaa" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("first-repeat-not-longest", "The first positive LCP is not necessarily the largest; scan the whole array for the maximum.", function repeatingSubstring(text) { const sa = suffixArray(text), lcp = lcpArray(text, sa); for (let i = 1; i < lcp.length; i += 1) if (lcp[i] > 0) return text.substr(sa[i], lcp[i]); return null; }),
        diagnosis("shorter-by-one", "The whole common prefix repeats; do not drop its last letter.", function repeatingSubstring(text) { const sa = suffixArray(text), lcp = lcpArray(text, sa); let best = 0, at = 0; for (let i = 1; i < lcp.length; i += 1) if (lcp[i] > best) { best = lcp[i]; at = i; } return best === 0 ? null : text.substr(sa[at], Math.max(1, best - 1)); }),
      ],
      hints: ["sa = suffixArray(text); lcp = lcpArray(text, sa).", "Find i with the largest lcp[i].", "If it is 0 return null, else text.substr(sa[i], lcp[i])."],
      cases: [
        example(["cabababc"], "abab", "CSES sample"),
        example(["aabab"], "ab", "longest is not the first repeat"),
        example(["abcd"], null, "no repeat"),
        example(["aaaa"], "aaa", "all equal"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB()]),
      ],
    },
    {
      id: "string-functions", title: "String Functions", cses: { id: 2107, name: "String Functions" },
      goal: "Return [z, pi]: the Z-array (z[0] = 0) and the prefix function of the text.",
      concept: "Both arrays describe how the text matches its own prefix, from the two ends of a substring: z looks forward from a start, pi looks backward from an end. With the two bricks in hand this task is one line.",
      functionName: "stringFunctions", signature: "stringFunctions(text) → [z, pi]",
      starterSource: starter("stringFunctions", "text", "return [zFunction(text), prefixFunction(text)];"),
      solve: stringFunctions, comparator: "deep", dependencies: ["z-function", "prefix-function"], brute: stringFunctionsBrute, small: (round) => [smallText(2800, round)],
      reference: book("26.4", "Z-algorithm"),
      presets: { "CSES sample": { a: "abaabca" }, "all equal": { a: "aaaa" }, "all distinct": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("z-zero-is-n", "CSES defines z(1) = 0; do not report the whole length at the first position.", function stringFunctions(text) { const z = zFunction(text); z[0] = text.length; return [z, prefixFunction(text)]; }),
        diagnosis("swapped", "The Z-array comes first, then the prefix function.", function stringFunctions(text) { return [prefixFunction(text), zFunction(text)]; }),
      ],
      hints: ["zFunction(text) already has z[0] = 0.", "prefixFunction(text) is the second array.", "Return them in that order."],
      cases: [
        example(["abaabca"], [[0, 0, 1, 2, 0, 0, 1], [0, 0, 1, 1, 2, 0, 1]], "CSES sample"),
        example(["aaaa"], [[0, 3, 2, 1], [0, 1, 2, 3]], "all equal"),
        example(["abcd"], [[0, 0, 0, 0], [0, 0, 0, 0]], "all distinct"),
        hidden("n = 10⁶, time limit", () => [TEXT_BIG_AB()]),
      ],
    },
    {
      id: "inverse-suffix-array", title: "Inverse Suffix Array", cses: { id: 3225, name: "Inverse Suffix Array" },
      goal: "Given a suffix array (1-based positions in sorted order), return any string over a–z that has it, or null when none exists.",
      concept: "Letters must not decrease along the suffix array. Two adjacent suffixes may share a letter only when their tails (the suffixes one position later) are already in the right order; otherwise the letter has to grow. Growing only when forced uses the fewest letters, so if that needs more than 26 there is no string.",
      functionName: "inverseSuffixArray", signature: "inverseSuffixArray(order) → string | null",
      starterSource: starter("inverseSuffixArray", "order", "rank[position] from order, with rank[n + 1] = −1; walk the order: new letter when rank[prev + 1] > rank[cur + 1]; null past z."),
      solve: inverseSuffixArray, comparator: "scalar", accept: inverseSuffixArrayAccept, check: (args, out) => inverseSuffixArrayAccept(args, out, "") === true, small: (round) => [suffixOrderOf(smallText(2900, round))],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: [4, 1, 3, 5, 6, 7, 2] }, "four letters": { a: [3, 1, 2, 4] }, "all equal": { a: [4, 3, 2, 1] } },
      scene: { kind: "algo", view: "bars", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("always-new-letter", "A new letter is only needed when the tails are out of order; using one every time runs out of letters at 27 positions.", function inverseSuffixArray(order) { const n = order.length; if (n > 26) return null; const letters = new Array(n + 1).fill(0); for (let i = 0; i < n; i += 1) letters[order[i]] = i; let out = ""; for (let position = 1; position <= n; position += 1) out += String.fromCharCode(97 + letters[position]); return out; }),
        diagnosis("never-grows", "Equal letters leave the order to the tails; when the tails are in the wrong order the letter must be larger.", function inverseSuffixArray(order) { return "a".repeat(order.length); }),
      ],
      hints: ["rank[order[i]] = i; rank[n + 1] = −1 stands for the empty suffix.", "code = 0 for order[0]; for i ≥ 1: if rank[order[i − 1] + 1] > rank[order[i] + 1] then code += 1; assign code to position order[i].", "If code reaches 26 return null; otherwise build the string position by position."],
      cases: [
        example([[4, 1, 3, 5, 6, 7, 2]], "aybabtu", "CSES sample"),
        example([[3, 1, 2, 4]], "bcad", "every step forced"),
        example([[4, 3, 2, 1]], "aaaa", "all equal"),
        example([DESCENDING_30], "a".repeat(30), "thirty equal letters"),
        example([randomPermutation(812, 60)], null, "a random permutation of 60 needs more than 26 letters"),
        hidden("n = 100 000, time limit", () => [SUFFIX_ORDER_MID()]),
      ],
    },
    {
      id: "string-transform", title: "String Transform", cses: { id: 1113, name: "String Transform" },
      goal: "Undo the Burrows–Wheeler transform: given the last column of the sorted rotations of text + '#', recover the text.",
      concept: "Sorting the given letters gives the first column. The k-th copy of a letter in the last column is the same character as the k-th copy in the first column, which tells which row its rotation moves to. Row 0 starts with '#', so its last letter is the last letter of the text; following the mapping reads the text backwards.",
      functionName: "stringTransform", signature: "stringTransform(transformed) → string",
      starterSource: starter("stringTransform", "transformed", "Counting sort the letters ('#' smallest); jump[i] = first-column row of the i-th letter; row = 0; fill the answer from the back."),
      solve: stringTransform, comparator: "scalar", check: stringTransformCheck, small: (round) => [bwtOf(smallText(3000, round))],
      reference: book("26.1", "String terminology · Burrows–Wheeler"),
      presets: { "CSES sample": { a: "cb#ab" }, banana: { a: bwtOf("banana") }, "all equal": { a: "aaa#" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("forward-order", "Each jump moves to the rotation one letter earlier, so the letters come out from the end of the text.", function stringTransform(transformed) { const n = transformed.length; const codes = new Array(n); const count = new Array(28).fill(0); for (let i = 0; i < n; i += 1) { codes[i] = transformed[i] === "#" ? 0 : transformed.charCodeAt(i) - 96; count[codes[i] + 1] += 1; } for (let c = 1; c < 28; c += 1) count[c] += count[c - 1]; const jump = new Array(n); for (let i = 0; i < n; i += 1) { jump[i] = count[codes[i]]; count[codes[i]] += 1; } const out = new Array(n - 1); let row = 0; for (let k = 0; k <= n - 2; k += 1) { out[k] = transformed[row]; row = jump[row]; } return out.join(""); }),
        diagnosis("sorted-letters", "The first column is only a step; the text is recovered by following the rows.", function stringTransform(transformed) { return transformed.split("").filter((letter) => letter !== "#").sort().join(""); }),
      ],
      hints: ["Codes: '#' → 0, a–z → 1..26. count[c] = number of letters with a smaller code = the first-column row where letter c begins.", "jump[i] = count[code[i]]; then count[code[i]] += 1, so equal letters keep their order.", "row = 0; for k from n − 2 down to 0: out[k] = transformed[row]; row = jump[row]."],
      cases: [
        example(["cb#ab"], "babc", "CSES sample"),
        example([bwtOf("banana")], "banana", "banana"),
        example(["aaa#"], "aaa", "all equal"),
        example(["a#"], "a", "one letter"),
        hidden("n = 500 000, time limit", () => [TRANSFORM_BIG()]),
      ],
    },
    {
      id: "substring-order-i", title: "Substring Order I", cses: { id: 2108, name: "Substring Order I" },
      goal: "The k-th smallest distinct substring in lexicographic order.",
      concept: "In suffix-array order, the substrings starting at suffix sa[i] appear in increasing length, and the first lcp[i] of them were already listed under the previous suffix. So suffix sa[i] contributes n − sa[i] − lcp[i] new substrings; skip whole suffixes while k allows, then the answer is a prefix of the suffix where k lands.",
      functionName: "substringOrderI", signature: "substringOrderI(text, k) → string",
      starterSource: starter("substringOrderI", "text, k", "sa, lcp; for each i: fresh = n − sa[i] − lcp[i]; if k ≤ fresh return text.substr(sa[i], lcp[i] + k); else k −= fresh."),
      solve: substringOrderI, comparator: "scalar", dependencies: ["suffix-array", "lcp-array"], brute: substringOrderIBrute, small: (round) => { const text = smallText(3100, round); return [text, 1 + (round % distinctSubstringsBrute(text))]; },
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "babaacbaab", b: 10 }, periodic: { a: "abab", b: 7 }, "all equal": { a: "aaa", b: 2 } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("counts-duplicates", "The first lcp[i] prefixes of suffix sa[i] were already counted under the previous suffix.", function substringOrderI(text, k) { const n = text.length; const sa = suffixArray(text), lcp = lcpArray(text, sa); let left = k; for (let i = 0; i < n; i += 1) { const fresh = n - sa[i]; if (left <= fresh) return text.substr(sa[i], left); left -= fresh; } return null; }),
        diagnosis("forgets-shared-prefix", "The k-th new substring of this suffix has length lcp[i] + k, not k.", function substringOrderI(text, k) { const n = text.length; const sa = suffixArray(text), lcp = lcpArray(text, sa); let left = k; for (let i = 0; i < n; i += 1) { const fresh = n - sa[i] - lcp[i]; if (left <= fresh) return text.substr(sa[i], left); left -= fresh; } return null; }),
      ],
      hints: ["sa = suffixArray(text); lcp = lcpArray(text, sa).", "fresh = n − sa[i] − lcp[i] new substrings at suffix i.", "If k ≤ fresh: text.substr(sa[i], lcp[i] + k); else k −= fresh and continue."],
      cases: [
        example(["babaacbaab", 10], "aba", "CSES sample"),
        example(["abab", 1], "a", "first"),
        example(["abab", 7], "bab", "last distinct"),
        example(["aaa", 2], "aa", "all equal"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB(), ORDER_I_K()]),
      ],
    },
    {
      id: "substring-order-ii", title: "Substring Order II", cses: { id: 2109, name: "Substring Order II" },
      goal: "The k-th smallest substring in lexicographic order when every occurrence counts separately.",
      concept: "In the suffix automaton, paths[v] = count[v] + Σ paths over transitions counts the occurrences of all strings that continue from v. Descend from the root in alphabetical order: skip a transition whose subtree holds fewer than k, otherwise take it; arriving at a state uses up count[v] occurrences of the current string.",
      functionName: "substringOrderII", signature: "substringOrderII(text, k) → string",
      starterSource: starter("substringOrderII", "text, k", "automaton; paths by decreasing len; walk letters a..z: if k ≤ paths[u] take it and k −= count[u], else k −= paths[u]."),
      solve: substringOrderII, comparator: "scalar", dependencies: ["suffix-automaton"], brute: substringOrderIIBrute, small: (round) => { const text = smallText(3200, round); return [text, 1 + (round % (text.length * (text.length + 1) / 2))]; },
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "baabaa", b: 10 }, periodic: { a: "abab", b: 10 }, "all equal": { a: "aaa", b: 6 } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }, { fixture: "presetB" }] },
      diagnoses: [
        diagnosis("distinct-only", "Every occurrence counts here; weight each state by count, not by 1.", function substringOrderII(text, k) { const automaton = suffixAutomaton(text); const next = automaton.next, len = automaton.len; const states = len.length; const bucket = new Array(text.length + 2).fill(0); for (let v = 0; v < states; v += 1) bucket[len[v]] += 1; for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1]; const order = new Array(states); for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; } const paths = new Array(states).fill(0); for (let i = states - 1; i >= 0; i -= 1) { const v = order[i]; let total = v === 0 ? 0 : 1; const row = next[v]; for (const c in row) total += paths[row[c]]; paths[v] = total; } let v = 0, left = k, out = ""; while (left > 0) { let moved = false; for (let c = 0; c < 26; c += 1) { const letter = String.fromCharCode(97 + c); const u = next[v][letter]; if (u === undefined) continue; if (left <= paths[u]) { out += letter; left -= 1; v = u; moved = true; break; } left -= paths[u]; } if (!moved) return null; } return out; }),
        diagnosis("no-count-step", "Arriving at a state lists its own string count[u] times before any longer one; subtract that.", function substringOrderII(text, k) { const automaton = suffixAutomaton(text); const next = automaton.next, len = automaton.len, count = automaton.count; const states = len.length; const bucket = new Array(text.length + 2).fill(0); for (let v = 0; v < states; v += 1) bucket[len[v]] += 1; for (let l = 1; l <= text.length; l += 1) bucket[l] += bucket[l - 1]; const order = new Array(states); for (let v = states - 1; v >= 0; v -= 1) { bucket[len[v]] -= 1; order[bucket[len[v]]] = v; } const paths = new Array(states).fill(0); for (let i = states - 1; i >= 0; i -= 1) { const v = order[i]; let total = count[v]; const row = next[v]; for (const c in row) total += paths[row[c]]; paths[v] = total; } let v = 0, left = k, out = ""; while (left > 0) { let moved = false; for (let c = 0; c < 26; c += 1) { const letter = String.fromCharCode(97 + c); const u = next[v][letter]; if (u === undefined) continue; if (left <= paths[u]) { out += letter; v = u; moved = true; if (left <= count[u]) left = 0; break; } left -= paths[u]; } if (!moved) return null; } return out; }),
      ],
      hints: ["Order states by len (counting sort); paths[v] = count[v] + Σ paths[next[v][c]] from longest to shortest.", "From v = 0, try letters a..z: u = next[v][letter]; if k > paths[u], k −= paths[u] and try the next letter.", "Otherwise append the letter, k −= count[u], v = u; stop when k ≤ 0."],
      cases: [
        example(["baabaa", 10], "ab", "CSES sample"),
        example(["abab", 1], "a", "first"),
        example(["abab", 10], "bab", "last"),
        example(["aaa", 6], "aaa", "all equal"),
        hidden("n = 100 000, k = 3 · 10⁹, time limit", () => [TEXT_MID_ABC(), 3000000000]),
      ],
    },
    {
      id: "substring-distribution", title: "Substring Distribution", cses: { id: 2110, name: "Substring Distribution" },
      goal: "For every length 1..n, the number of distinct substrings of that length.",
      concept: "Suffix sa[i] contributes exactly the new substrings of lengths lcp[i] + 1 through n − sa[i]. Adding one to a range of lengths is a difference array: +1 at lcp[i] + 1, −1 after n − sa[i], then a prefix sum over lengths.",
      functionName: "substringDistribution", signature: "substringDistribution(text) → array",
      starterSource: starter("substringDistribution", "text", "sa, lcp; diff[lcp[i] + 1] += 1; diff[n − sa[i] + 1] −= 1; prefix sums over lengths 1..n."),
      solve: substringDistribution, comparator: "deep", dependencies: ["suffix-array", "lcp-array"], brute: substringDistributionBrute, small: (round) => [smallText(3300, round)],
      reference: book("26.1", "String terminology · suffix structures"),
      presets: { "CSES sample": { a: "abab" }, "all equal": { a: "aaaa" }, "all distinct": { a: "abcd" } },
      scene: { kind: "algo", view: "text", handles: preset(), args: [{ fixture: "presetA" }] },
      diagnoses: [
        diagnosis("ignores-shared-prefix", "Lengths up to lcp[i] were already counted for the previous suffix; start the range at lcp[i] + 1.", function substringDistribution(text) { const n = text.length; const sa = suffixArray(text); const diff = new Array(n + 2).fill(0); for (let i = 0; i < n; i += 1) { diff[1] += 1; diff[n - sa[i] + 1] -= 1; } const out = new Array(n); let running = 0; for (let length = 1; length <= n; length += 1) { running += diff[length]; out[length - 1] = running; } return out; }),
        diagnosis("never-ends", "Each suffix stops contributing after its own length n − sa[i]; the −1 is needed.", function substringDistribution(text) { const n = text.length; const sa = suffixArray(text), lcp = lcpArray(text, sa); const diff = new Array(n + 2).fill(0); for (let i = 0; i < n; i += 1) diff[lcp[i] + 1] += 1; const out = new Array(n); let running = 0; for (let length = 1; length <= n; length += 1) { running += diff[length]; out[length - 1] = running; } return out; }),
      ],
      hints: ["sa = suffixArray(text); lcp = lcpArray(text, sa).", "For each i: diff[lcp[i] + 1] += 1; diff[n − sa[i] + 1] −= 1.", "Prefix-sum diff over lengths 1..n."],
      cases: [
        example(["abab"], [2, 2, 2, 1], "CSES sample"),
        example(["aaaa"], [1, 1, 1, 1], "all equal"),
        example(["abcd"], [4, 3, 2, 1], "all distinct"),
        example(["a"], [1], "one letter"),
        hidden("n = 100 000, time limit", () => [TEXT_MID_AB()]),
      ],
    },
  ];
  core.share({ prefixFunction, zFunction, manacher, suffixAutomaton, suffixArray, lcpArray });
  core.define("strings", STRINGS);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

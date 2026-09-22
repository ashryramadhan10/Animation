# Algo Lab Phase 8: String Algorithms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the String Algorithms section of the Algo Lab: all 21 CSES tasks in site order (the roadmap said 20; the site lists 21) plus the bricks they need, each anchored on the official sample, with a brute force or validity check for every task.

**Architecture:** One section file, `algo/08-strings.js`, defining the `strings` section. Six bricks placed right before their first user: prefix function and Z-function (before String Matching), Manacher's radii (before Longest Palindrome), the suffix automaton (before Finding Patterns), the suffix array and Kasai's LCP array (before Distinct Substrings). Palindrome Queries reuses the Fenwick bricks from Sorting and the multiply-modulo brick from Mathematics, which is the first time a section leans on three earlier ones. Tasks whose answers are not unique (Longest Palindrome, Repeating Substring, Inverse Suffix Array) accept any valid answer, and the suffix automaton brick is accepted up to state renumbering.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section file, tests

- [ ] **Step 1: Borders, matching and palindromes**

Word Combinations (trie plus positions DP), the prefix function and Z-function bricks, String Matching, Finding Borders, Finding Periods, Minimal Rotation (two candidate starts advanced by their common prefix), the Manacher brick, Longest Palindrome, All Palindromes (longest palindrome from every centre, then propagated leftwards by stripping two characters), Required Substring (KMP automaton DP) and Palindrome Queries (forward and reversed polynomial hashes in two Fenwick trees).

- [ ] **Step 2: Suffix structures**

The suffix automaton brick returns `{ next, link, len, count, first }` and powers Finding Patterns, Counting Patterns, Pattern Positions and Substring Order II. The suffix array brick (prefix doubling with counting sorts) and the LCP brick power Distinct Substrings, Repeating Substring, Substring Order I and Substring Distribution, and validate Inverse Suffix Array. Distinct Subsequences, String Functions and String Transform (inverse Burrows–Wheeler by the first-column mapping) are self-contained.

- [ ] **Step 3: Sizes that fit the Check budget and the stress loop**

Every hidden case must finish four runs inside 4 s: linear-time tasks take 10⁶ characters, suffix-structure tasks 10⁵, and the string transform 2 · 10⁵ because its input is generated with a suffix array on the main thread.

- [ ] **Step 4: Wiring and tests**

Add the file to `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js`, add the `strings` track, its id list and the new first unlocked puzzle. No new scene fixtures: every string task takes its text as input.

- [ ] **Step 5: Verify and commit**

Run the Node suite, render the string scenes headlessly, and run real worker Checks on all 27 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/08-strings.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md
git commit -m "feat: complete the String Algorithms section of the Algo Lab"
```

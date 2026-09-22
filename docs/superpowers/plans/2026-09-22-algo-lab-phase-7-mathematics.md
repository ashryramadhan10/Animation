# Algo Lab Phase 7: Mathematics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Mathematics section of the Algo Lab: all 37 CSES tasks in site order (the roadmap said 36; the site lists 37) plus the bricks they need, each anchored on the official sample, with a brute force or validity check for every task.

**Architecture:** The section is large enough to split across two files that both define into the `math` section: `algo/07-math.js` holds number theory and combinatorics (27 puzzles) and `algo/07-math-ii.js` holds matrices, probability and game theory (19 puzzles). Nine bricks: multiply modulo, modular exponentiation, modular inverse, factorial tables, binomial coefficient, smallest-prime-factor sieve, factorise, matrix product and matrix power. The first brick exists because JavaScript numbers are exact only to 2⁵³ and two residues near 10⁹ multiply past that, so the whole section rests on a split multiplication.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Both section files, scenes, tests

- [ ] **Step 1: Number theory and combinatorics**

Josephus Queries, the modular arithmetic bricks, Exponentiation, Exponentiation II (Fermat on the exponent), the sieve bricks, Counting Divisors, Common Divisors, Sum of Divisors (divisor blocks), Divisor Analysis, Prime Multiples (inclusion–exclusion with BigInt), Counting Coprime Pairs (Möbius), Next Prime, the factorial bricks, Binomial Coefficients, Creating Strings II, Distributing Apples, Christmas Party, Permutation Order (BigInt ranks), Permutation Rounds (least common multiple by prime powers), Bracket Sequences I and II, Counting Necklaces and Counting Grids (Burnside).

- [ ] **Step 2: Matrices, probability and games**

The matrix bricks, Fibonacci Numbers, Throwing Dice, Graph Paths I, Graph Paths II (min-plus power), System of Linear Equations (Gauss–Jordan modulo a prime, any solution accepted), Sum of Four Squares (any quadruple accepted), Triangle Number Sums, Dice Probability, Moving Robots, Candy Lottery, Inversion Probability, Stick Game, Nim Game I and II, Stair Game, Grundy's Game, Another Game.

Exponents that pass 2⁵³ arrive as decimal strings, so the matrix power brick and its users take the exponent as a string and read it with BigInt.

- [ ] **Step 3: Sizes that fit the Check budget and the stress loop**

Every hidden case must finish four runs inside 4 s. Two tasks rebuilt a large table on every call, which made the 60-round stress loop unusable; both now size the table from the largest input. Four mistake variants were slow but correct, which both stalls the check and makes the variant useless as a diagnosis; all four were replaced with fast wrong ones.

- [ ] **Step 4: Scenes and tests**

New fixtures for a string exponent, the factorial tables and the sieve; the number-grid view draws a matrix input. Wire the two files into `algo-puzzles.js`, `algo-lab.html` and `tests.html`. In `puzzle-tests.js`, add the `math` track, its id list, the six single-operation bricks and the new first unlocked puzzle.

- [ ] **Step 5: Verify and commit**

Run the Node suite, render the math scenes headlessly, and run real worker Checks on all 46 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/07-math.js p5sim/tf2_walkthrough/algo/07-math-ii.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-scenes.js p5sim/tf2_walkthrough/puzzle-tests.js docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md
git commit -m "feat: complete the Mathematics section of the Algo Lab"
```

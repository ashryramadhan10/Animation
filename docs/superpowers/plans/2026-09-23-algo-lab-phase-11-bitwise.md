# Algo Lab Phase 11: Bitwise Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Bitwise Operations section of the Algo Lab: all 11 CSES tasks in site order plus the bricks they need, each anchored on the official sample, with a brute force for every task.

**Architecture:** One section file, `algo/11-bitwise.js`, defining the `bitwise` section. Four bricks placed right before their first user: the xor basis (before Maximum Xor Subset), the Walsh-Hadamard transform (before All Subarray Xors), the submask xor (before Xor Pyramid Diagonal) and the submask sum (before SOS Bit Problem).

The section is built on one idea seen from four sides. Xor makes the integers a vector space over two elements, so a set of numbers has a basis, a rank and a span. That single fact answers Maximum Xor Subset, Number of Subset Xors and K Subset Xors at once, and it is why the basis is the first brick. The other three bricks are the same loop over bits with a different operator in the middle, which is worth seeing laid side by side.

**Spec:** `docs/superpowers/specs/2026-09-18-algo-lab-full-cses-roadmap.md`

---

### Task 1: Section file, tests

- [ ] **Step 1: Counting and the basis**

Counting Bits counts each bit position separately, and its answer passes ten to the sixteenth, so it accumulates in BigInt and returns a decimal string. Maximum Xor Subarray turns subarrays into prefix xors and walks a binary trie for the best partner. The basis brick reduces to row echelon form, which is what makes the span enumerable in order: the maximum is the xor of the whole basis, the count of distinct xors is two to the rank, and the i-th smallest is read straight off the bits of i.

- [ ] **Step 2: Transforms over bits**

All Subarray Xors asks which values appear as a prefix xor pair, which is a xor convolution, so the Walsh-Hadamard transform answers it in one pass. The three pyramid tasks are the same binomial-parity fact from three angles: a cell is the xor of the bottom cells whose offset is a submask of the height. The peak reads that directly, the diagonal is a submask xor over every row at once, and a row applies one shift per set bit of the height.

- [ ] **Step 3: Sums over subsets**

SOS Bit Problem wants counts over submasks and over supermasks, which are the same loop run in the two directions. And Subset Count counts supermasks, raises two to that power, then runs the same loop backwards as a Mobius inversion to pull out the exact ands.

- [ ] **Step 4: Sizes that fit the Check budget**

Everything here runs in well under a tenth of a second, so the limit is the size of the answer rather than the work. The tasks that return one value per input take two hundred thousand; the ones that return a value per bit pattern are held to thirty two thousand so cloning the result stays cheap.

- [ ] **Step 5: Verify and commit**

Run the Node suites, render the scenes headlessly, and run real worker Checks on all 15 puzzles.

```bash
git add p5sim/tf2_walkthrough/algo/11-bitwise.js p5sim/tf2_walkthrough/algo-puzzles.js p5sim/tf2_walkthrough/algo-lab.html p5sim/tf2_walkthrough/tests.html p5sim/tf2_walkthrough/puzzle-tests.js
git commit -m "feat: complete the Bitwise Operations section of the Algo Lab"
```

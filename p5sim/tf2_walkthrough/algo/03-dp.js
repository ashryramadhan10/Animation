(function defineAlgoSection(core) {
  "use strict";
  const { MOD, BIG, lazy, rng, randomInts, randomGrid, randomTreeBosses, edgesFromBosses, lines, starter, example, run, hidden, diagnosis, book, preset } = core;
  // ------------------------------------------------------------------ 3 · dynamic programming
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

  const COINS_BIG = lazy(() => randomInts(21, 100, 1, 1000));
  const GRID_BIG = lazy(() => (() => { const grid = randomGrid(22, 1000, 1000, "*", "*", ".", 0.1); grid[0] = "." + grid[0].slice(1); grid[999] = grid[999].slice(0, 999) + "."; return grid; })());

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
      id: "grid-paths", track: "dp", title: "Grid Paths", cses: { id: 1638, name: "Grid Paths I" },
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
  ];
  core.define("dp", DP);
})(typeof window !== "undefined" ? window.AlgoCore : require("./core.js"));

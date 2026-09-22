# Algo Lab · Full CSES Roadmap

## Goal

Turn the Algo Lab into a complete, judge-like companion to the CSES Problem Set: every task in every section becomes a puzzle, in site order, with hidden CSES-size cases, named mistakes, and links to the handbook and the task page. The learner works section by section, exactly as on cses.fi, but writes plain JavaScript functions and gets live scenes and diagnoses.

## Scope

CSES lists 423 tasks in 19 sections. Excluded: the 6 Interactive Problems (they need a dialogue with a judge, not a function) and the General section (one placeholder page). That leaves 416 tasks plus technique bricks where a task needs a structure that JavaScript lacks (heap, sorted multiset, Fenwick tree, segment tree, union-find, sparse table, suffix structures).

## Infrastructure (Phase 0)

1. **Per-track prefix unlock.** A puzzle is open when its track is available and every earlier puzzle in its track is solved. All 18 Algo Lab tracks are available from the start, so the learner can move between sections like on the site. The TF2 and side labs keep their behaviour: their tracks gate with `unlockAfter`, and inside a track the same prefix rule applies. The engine exposes `unlockedIds(puzzles, tracks, progress)`; the lab no longer reads `highestUnlocked`.
2. **Split catalog.** `algo/core.js` (builder, generators, references, registry), one file per section `algo/NN-<section>.js` that registers its puzzles, and `algo-puzzles.js` that assembles them in section order and numbers them. Progress is keyed by puzzle id, so numbers may shift as sections fill in. Storage key `algo-lab:v2`.
3. **Lazy hidden cases.** A puzzle declares `hidden: [{ label, make }]`; `resolveCases(puzzle)` materialises them on first Check (or in tests) and computes the expected output with the puzzle's own `solve` function, cached per puzzle. Nothing large is built at page load.
4. **Presets in the catalog.** Each puzzle carries `presets` (the CSES sample first); the scene selector lists them. Generic views cover the input shapes: bars, two arrays, intervals, text, grid, board, graph, tree, heap, segment tree, coins, shop, number, sets, sequence, and later points for geometry.
5. **Stress tests.** A puzzle may carry `brute` (a slow obviously-correct solver) and `small` (a random small-input generator); the test runner compares `solve` against `brute` on 100 random inputs. Every task's first case is the official CSES sample.

## Conventions

- Vectors of node values are 0-based arrays whose index i holds node i + 1. Node ids in inputs are 1-based as on CSES. Grids are arrays of strings. Strings are strings.
- Counting answers use modulo 1 000 000 007; products use BigInt or split multiplication inside the reference so no double exceeds 2⁵³.
- Where CSES accepts many answers, the puzzle fixes one canonical answer and states it in the goal text (evens then odds, smallest representative, lexicographically smallest, and so on).
- Hidden cases use the task's real limits (usually n = 2·10⁵ or 10⁶ for simple loops, 1000 × 1000 grids). The Algo Lab check budget is four seconds because Check also runs the reference and the diagnoses.

## Phases

Each phase is one spec-plan-build-verify-commit cycle of roughly 20 to 40 puzzles.

| Phase | Section(s) | Tasks | Bricks likely needed |
|---|---|---|---|
| 0 | Infrastructure + restructure of the 36 existing puzzles | — | — |
| 1 | Introductory Problems | 25 | — |
| 2 | Sorting and Searching | 40 | sorted multiset (Concert Tickets, Room Allocation, Josephus II), Fenwick tree (Collecting Numbers II, Josephus II) |
| 3 | Dynamic Programming | 23 | — |
| 4 | Graph Algorithms | 36 | union-find, topological order, SCC (Tarjan/Kosaraju), Euler tour, 2-SAT, max flow, bipartite matching |
| 5 | Range Queries | 25 | Fenwick tree, sparse table, lazy segment tree, persistent tree, offline sorting |
| 6 | Tree Algorithms | 16 | Euler tour + segment tree, centroid decomposition, small-to-large merging |
| 7 | Mathematics | 37 | modular BigInt arithmetic, sieve, factorials and inverses, matrix power, Gaussian elimination, Grundy |
| 8 | String Algorithms | 21 | polynomial hashing, Z-function, KMP, Manacher, suffix array, Aho-Corasick |
| 9 | Geometry | 16 | cross product, convex hull, sweep line |
| 10 | Sliding Window, Bitwise Operations, Construction Problems | 30 | monotonic deque, order-statistic structure, xor basis, SOS DP |
| 11 | Advanced Techniques | 26 | meet in the middle, treap, offline DSU, Knuth optimisation, FFT |
| 12 | Advanced Graph Problems | 28 | Prüfer codes, tree hashing, bridges and articulation points, min cost flow |
| 13 | Counting Problems | 18 | combinatorics on grids, distributions |
| 14 | Additional Problems I | 29 | mixed |
| 15 | Additional Problems II | 30 | mixed |

## Task lists (site order)

**Introductory Problems (25):** Weird Algorithm 1068, Missing Number 1083, Repetitions 1069, Increasing Array 1094, Permutations 1070, Number Spiral 1071, Two Knights 1072, Two Sets 1092, Bit Strings 1617, Trailing Zeros 1618, Coin Piles 1754, Palindrome Reorder 1755, Gray Code 2205, Tower of Hanoi 2165, Creating Strings 1622, Apple Division 1623, Chessboard and Queens 1624, Raab Game I 3399, Mex Grid Construction 3419, Knight Moves Grid 3217, Grid Coloring I 3311, Digit Queries 2431, String Reorder 1743, Grid Path Description 1625.

**Sorting and Searching (40):** Distinct Numbers 1621, Apartments 1084, Ferris Wheel 1090, Concert Tickets 1091, Restaurant Customers 1619, Movie Festival 1629, Sum of Two Values 1640, Maximum Subarray Sum 1643, Stick Lengths 1074, Missing Coin Sum 2183, Collecting Numbers 2216, Collecting Numbers II 2217, Playlist 1141, Towers 1073, Traffic Lights 1163, Distinct Values Subarrays 3420, Distinct Values Subsequences 3421, Josephus Problem I 2162, Josephus Problem II 2163, Nested Ranges Check 2168, Nested Ranges Count 2169, Room Allocation 1164, Factory Machines 1620, Tasks and Deadlines 1630, Reading Books 1631, Sum of Three Values 1641, Sum of Four Values 1642, Nearest Smaller Values 1645, Subarray Sums I 1660, Subarray Sums II 1661, Subarray Divisibility 1662, Distinct Values Subarrays II 2428, Array Division 1085, Movie Festival II 1632, Maximum Subarray Sum II 1644.

**Dynamic Programming (23):** Dice Combinations 1633, Minimizing Coins 1634, Coin Combinations I 1635, Coin Combinations II 1636, Removing Digits 1637, Grid Paths I 1638, Book Shop 1158, Array Description 1746, Counting Towers 2413, Edit Distance 1639, Longest Common Subsequence 3403, Rectangle Cutting 1744, Minimal Grid Path 3359, Money Sums 1745, Removal Game 1097, Two Sets II 1093, Mountain Range 3314, Increasing Subsequence 1145, Projects 1140, Elevator Rides 1653, Counting Tilings 2181, Counting Numbers 2220, Increasing Subsequence II 1748.

**Graph Algorithms (36):** Counting Rooms 1192, Labyrinth 1193, Building Roads 1666, Message Route 1667, Building Teams 1668, Round Trip 1669, Monsters 1194, Shortest Routes I 1671, Shortest Routes II 1672, High Score 1673, Flight Discount 1195, Cycle Finding 1197, Flight Routes 1196, Round Trip II 1678, Course Schedule 1679, Longest Flight Route 1680, Game Routes 1681, Investigation 1202, Planets Queries I 1750, Planets Queries II 1160, Planets Cycles 1751, Road Reparation 1675, Road Construction 1676, Flight Routes Check 1682, Planets and Kingdoms 1683, Giant Pizza 1684, Coin Collector 1686, Mail Delivery 1691, De Bruijn Sequence 1692, Teleporters Path 1693, Hamiltonian Flights 1690, Knight's Tour 1689, Download Speed 1694, Police Chase 1695, School Dance 1696, Distinct Routes 1711.

**Range Queries (25):** Static Range Sum Queries 1646, Static Range Minimum Queries 1647, Dynamic Range Sum Queries 1648, Dynamic Range Minimum Queries 1649, Range Xor Queries 1650, Range Update Queries 1651, Forest Queries 1652, Hotel Queries 1143, List Removals 1749, Salary Queries 1144, Prefix Sum Queries 2166, Pizzeria Queries 2206, Visible Buildings Queries 3304, Range Interval Queries 3163, Subarray Sum Queries 1190, Subarray Sum Queries II 3226, Distinct Values Queries 1734, Distinct Values Queries II 3356, Increasing Array Queries 2416, Movie Festival Queries 1664, Forest Queries II 1739, Range Updates and Sums 1735, Polynomial Queries 1736, Range Queries and Copies 1737, Missing Coin Sum Queries 2184.

**Tree Algorithms (16):** Subordinates 1674, Tree Matching 1130, Tree Diameter 1131, Tree Distances I 1132, Tree Distances II 1133, Company Queries I 1687, Company Queries II 1688, Distance Queries 1135, Counting Paths 1136, Subtree Queries 1137, Path Queries 1138, Path Queries II 2134, Distinct Colors 1139, Finding a Centroid 2079, Fixed-Length Paths I 2080, Fixed-Length Paths II 2081.

**Mathematics (37):** Josephus Queries 2164, Exponentiation 1095, Exponentiation II 1712, Counting Divisors 1713, Common Divisors 1081, Sum of Divisors 1082, Divisor Analysis 2182, Prime Multiples 2185, Counting Coprime Pairs 2417, Next Prime 3396, Binomial Coefficients 1079, Creating Strings II 1715, Distributing Apples 1716, Christmas Party 1717, Permutation Order 3397, Permutation Rounds 3398, Bracket Sequences I 2064, Bracket Sequences II 2187, Counting Necklaces 2209, Counting Grids 2210, Fibonacci Numbers 1722, Throwing Dice 1096, Graph Paths I 1723, Graph Paths II 1724, System of Linear Equations 3154, Sum of Four Squares 3355, Triangle Number Sums 3406, Dice Probability 1725, Moving Robots 1726, Candy Lottery 1727, Inversion Probability 1728, Stick Game 1729, Nim Game I 1730, Nim Game II 1098, Stair Game 1099, Grundy's Game 2207, Another Game 2208.

**String Algorithms (21):** Word Combinations 1731, String Matching 1753, Finding Borders 1732, Finding Periods 1733, Minimal Rotation 1110, Longest Palindrome 1111, All Palindromes 3138, Required Substring 1112, Palindrome Queries 2420, Finding Patterns 2102, Counting Patterns 2103, Pattern Positions 2104, Distinct Substrings 2105, Distinct Subsequences 1149, Repeating Substring 2106, String Functions 2107, Inverse Suffix Array 3225, String Transform 1113, Substring Order I 2108, Substring Order II 2109, Substring Distribution 2110.

**Geometry (16):** Point Location Test 2189, Line Segment Intersection 2190, Polygon Area 2191, Point in Polygon 2192, Polygon Lattice Points 2193, Minimum Euclidean Distance 2194, Convex Hull 2195, Maximum Manhattan Distances 3410, All Manhattan Distances 3411, Intersection Points 1740, Line Segments Trace I 3427, Line Segments Trace II 3428, Lines and Queries I 3429, Lines and Queries II 3430, Area of Rectangles 1741, Robot Path 1742.

**Advanced Techniques (26):** Meet in the Middle 1628, Hamming Distance 2136, Corner Subgrid Check 3360, Corner Subgrid Count 2137, Reachable Nodes 2138, Reachability Queries 2143, Cut and Paste 2072, Substring Reversals 2073, Reversals and Sums 2074, Necessary Roads 2076, Necessary Cities 2077, Eulerian Subgraphs 2078, Monster Game I 2084, Monster Game II 2085, Subarray Squares 2086, Houses and Schools 2087, Knuth Division 2088, Apples and Bananas 2111, One Bit Positions 2112, Signal Processing 2113, New Roads Queries 2101, Dynamic Connectivity 2133, Parcel Delivery 2121, Task Assignment 2129, Distinct Routes II 2130.

**Sliding Window Problems (11):** Sliding Window Sum 3220, Sliding Window Minimum 3221, Sliding Window Xor 3426, Sliding Window Or 3405, Sliding Window Distinct Values 3222, Sliding Window Mode 3224, Sliding Window Mex 3219, Sliding Window Median 1076, Sliding Window Cost 1077, Sliding Window Inversions 3223, Sliding Window Advertisement 3227.

**Bitwise Operations (11):** Counting Bits 1146, Maximum Xor Subarray 1655, Maximum Xor Subset 3191, Number of Subset Xors 3211, K Subset Xors 3192, All Subarray Xors 3233, Xor Pyramid Peak 2419, Xor Pyramid Diagonal 3194, Xor Pyramid Row 3195, SOS Bit Problem 1654, And Subset Count 3141.

**Construction Problems (8):** Inverse Inversions 2214, Monotone Subsequences 2215, Third Permutation 3422, Permutation Prime Sums 3423, Chess Tournament 1697, Distinct Sums Grid 3424, Filling Trominos 2423, Grid Path Construction 2418.

**Advanced Graph Problems (28):** Nearest Shops 3303, Prüfer Code 1134, Tree Traversals 1702, Course Schedule II 1757, Acyclic Graph Edges 1756, Strongly Connected Edges 2177, Even Outdegree Edges 2179, Graph Girth 1707, Fixed Length Walk Queries 3357, Transfer Speeds Sum 3111, MST Edge Check 3407, MST Edge Set Check 3408, MST Edge Cost 3409, Network Breakdown 1677, Tree Coin Collecting I 3114, Tree Coin Collecting II 3149, Tree Isomorphism I 1700, Tree Isomorphism II 1701, Flight Route Requests 1699, Critical Cities 1703, Visiting Cities 1203, Graph Coloring 3308, Bus Companies 3158, Split into Two Paths 3358, Network Renovation 1704, Forbidden Cities 1705, Creating Offices 1752, New Flight Routes 1685.

**Counting Problems (18):** Filled Subgrid Count I 3413, Filled Subgrid Count II 3414, All Letter Subgrid Count I 3415, All Letter Subgrid Count II 3416, Border Subgrid Count I 3417, Border Subgrid Count II 3418, Raab Game II 3400, Empty String 1080, Permutation Inversions 2229, Counting Bishops 2176, Counting Sequences 2228, Grid Paths II 1078, Counting Permutations 1075, Grid Completion 2429, Counting Reorders 2421, Tournament Graph Distribution 3232, Collecting Numbers Distribution 3157, Functional Graph Distribution 2415.

**Additional Problems I (29):** Shortest Subsequence 1087, Distinct Values Sum 3150, Distinct Values Splits 3190, Swap Game 1670, Beautiful Permutation II 3175, Multiplication Table 2422, Bubble Sort Rounds I 3151, Bubble Sort Rounds II 3152, Nearest Campsites I 3306, Nearest Campsites II 3307, Advertisement 1142, Special Substrings 2186, Counting LCM Arrays 3169, Square Subsets 3193, Subarray Sum Constraints 3294, Water Containers Moves 3213, Water Containers Queries 3214, Stack Weights 2425, Maximum Average Subarrays 3301, Subsets with Fixed Average 3302, Two Array Average 3361, Pyramid Array 1747, Permutation Subsequence 3404, Bit Inversions 1188, Writing Numbers 1086, Letter Pair Move Game 2427, Maximum Building I 1147, Sorting Methods 1162, Cyclic Array 1191, List of Sums 2414.

**Additional Problems II (30):** Bouncing Ball Steps 3215, Bouncing Ball Cycle 3216, Knight Moves Queries 3218, K Subset Sums I 3108, K Subset Sums II 3109, Increasing Array II 2132, Food Division 1189, Swap Round Sorting 1698, Binary Subsequences 2430, School Excursion 1706, Coin Grid 1709, Grid Coloring II 3312, Programmers and Artists 2426, Removing Digits II 2174, Coin Arrangement 2180, Replace with Difference 3159, Grid Puzzle I 2432, Grid Puzzle II 2131, Bit Substrings 2115, Reversal Sorting 2075, Book Shop II 1159, GCD Subsets 3161, Minimum Cost Pairs 3402, Same Sum Subsets 3425, Mex Grid Queries 1157, Maximum Building II 1148, Stick Divisions 1161, Stick Difference 3401, Coding Company 1665, Two Stacks Sorting 2402.

## Verification per phase

Node tests: catalog validates, ids per section in site order, every reference passes its official sample and hidden cases, every diagnosis differs, stress tests pass for puzzles with a brute solver, every scene builds. Headless render of the Algo Lab and every scene, and a real worker Check on the heaviest puzzles of the phase.

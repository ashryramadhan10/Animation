# TF2 Bayesian Filters Track Design

## Purpose

Add a sixth track that rebuilds the estimation story the way *Kalman and Bayesian Filters in Python* (Labbe, `references/Kalman-and-Bayesian-Filters-in-Python-master`) tells it: a g-h filter, a discrete Bayes filter over a hallway, Gaussians as beliefs, the one-dimensional Kalman filter, the multivariate Kalman filter for a position-velocity tracker, sigma points and the unscented transform, and Rauch-Tung-Striebel smoothing. Track 5 already covers the EKF and particle filters, so this track supplies the ground-up half and links the book from both tracks.

## Conventions

Earlier tracks' conventions hold. Additions:

- A **1D Gaussian** is `{ mean, variance }`.
- A **discrete belief** is an array of probabilities over hallway cells that wraps around; a **kernel** is `[pUnder, pCorrect, pOver]`, so `discretePredict` follows the book's `predict_move_convolution`: `prior[i] += pdf[(i + 1 - k - offset) mod N] * kernel[k]`.
- A **2D state** for the tracker is `[position, velocity]` (a two-element array); `P`, `F`, `Q` are 2×2 nested arrays; a scalar position measurement `z` uses `H = [[1, 0]]` (a 1×2 nested array) and scalar `R`.
- The constant-velocity model is `F = [[1, dt], [0, 1]]` and the discrete white noise `Q = var · [[dt⁴/4, dt³/2], [dt³/2, dt²]]` (filterpy `Q_discrete_white_noise(dim=2)`).
- Sigma points follow Van der Merwe: `λ = α²(n + κ) − n`, `X₀ = mean`, `X_i = mean + row_i(U)`, `X_{n+i} = mean − row_i(U)` where `UᵀU = (n + λ) P` is the upper Cholesky factor (for 2×2: `U = [[√a, b/√a], [0, √(d − b²/a)]]`), `Wm₀ = λ/(n+λ)`, `Wc₀ = Wm₀ + 1 − α² + β`, `Wm_i = Wc_i = 1/(2(n+λ))`. Points are `{ x, y }` objects and the mean is `{ x, y }`.
- The RTS backward step for `(x_k, P_k)` given the smoothed `(x_{k+1}, P_{k+1})`: `Pp = F P_k Fᵀ + Q`, `K = P_k Fᵀ Pp⁻¹`, `x = x_k + K (x_{k+1} − F x_k)`, `P = P_k + K (P_{k+1} − Pp) Kᵀ`.
- A puzzle may carry an optional second link `reading: { label, url }`, shown under the primary reference as "Also read".

## Tracks

Track 6 · Bayesian Filters, puzzles 88 to 102, `track: "bayes"`, unlocked by `ekf-localize-step`.

## Curriculum

### Stage 22, Scalar Filters (chapters 1 to 4)

88. `gh-filter-step` — `ghFilterStep(x, dx, z, g, h, dt) → { x, dx }`. Scene `bayes` view `gh`. Reference `01-g-h-filter · g_h_filter`. Diagnoses: `residual-from-prior`, `h-not-over-dt`.
89. `discrete-predict` — `discretePredict(belief, offset, kernel) → belief`. Scene `bayes` view `hallway-predict`. Reference `02-Discrete-Bayes · predict_move_convolution`. Diagnoses: `no-wrap`, `kernel-mirrored`.
90. `discrete-update` — `discreteUpdate(belief, likelihood) → belief`. Scene `bayes` view `hallway-update`. Reference `02-Discrete-Bayes · update`. Diagnoses: `unnormalized`, `sum-not-product`.
91. `gaussian-multiply` — `gaussianMultiply(a, b) → { mean, variance }`. Scene `bayes` view `gaussians`. Reference `04-One-Dimensional-Kalman-Filters · gaussian_multiply`. Diagnoses: `mean-average`, `variance-sum`.
92. `kalman-1d-step` — `kalman1dStep(prior, movement, z, measurementVariance) → { mean, variance }`. Depends on `gaussian-multiply`. Scene `bayes` view `kalman-1d`. Reference `04-One-Dimensional-Kalman-Filters · predict / update`. Diagnoses: `update-before-predict`, `movement-noise-dropped`.

### Stage 23, Multivariate Kalman (chapters 5 to 8)

93. `mat-mul-2` — `matMul2(a, b) → 2×2`. Scene `bayes` view `matrix2`. Reference `05-Multivariate-Gaussians`. Diagnoses: `elementwise`, `transposed`.
94. `mat-inv-2` — `matInv2(m) → 2×2`. Scene `bayes` view `matrix2`. Reference `07-Kalman-Filter-Math`. Diagnoses: `no-determinant`, `diagonal-not-swapped`.
95. `constant-velocity-model` — `constantVelocityModel(dt, processVariance) → { F, Q }`. Scene `bayes` view `cv-model`. Reference `06-Multivariate-Kalman-Filters · Q_discrete_white_noise`. Diagnoses: `f-without-dt`, `q-diagonal-only`.
96. `kf-predict` — `kfPredict(x, P, F, Q) → { x, P }`. Depends on `mat-mul-2`. Scene `bayes` view `kf-predict`. Reference `06-Multivariate-Kalman-Filters · predict`. Diagnoses: `no-transpose`, `state-unchanged`.
97. `kf-update` — `kfUpdate(x, P, z, H, R) → { x, P }`. Depends on `mat-mul-2`. Scene `bayes` view `kf-update`. Reference `06-Multivariate-Kalman-Filters · update`. Diagnoses: `full-gain`, `covariance-unchanged`.
98. `kalman-track-step` — `kalmanTrackStep(x, P, z, dt, processVariance, R) → { x, P }`. Depends on `constant-velocity-model`, `kf-predict`, `kf-update`. Scene `bayes` view `kf-track`. Reference `06-Multivariate-Kalman-Filters · pos_vel_filter`. Diagnoses: `update-before-predict`, `no-update`.

### Stage 24, Nonlinear & Smoothing (chapters 9, 10, 13)

99. `sigma-points` — `sigmaPoints(mean, P, alpha, beta, kappa) → { points, wm, wc }`. Scene `bayes` view `sigma-points`. Reference `10-Unscented-Kalman-Filter · MerweScaledSigmaPoints`. Diagnoses: `no-lambda-scale`, `wc0-without-beta`.
100. `unscented-transform` — `unscentedTransform(points, wm, wc) → { mean, P }`. Scene `bayes` view `unscented`. Reference `10-Unscented-Kalman-Filter · unscented_transform`. Diagnoses: `wm-for-covariance`, `covariance-around-first-point`.
101. `unscented-polar` — `unscentedPolarToCartesian(mean, P, alpha, beta, kappa) → { mean, P }` where `mean = { x: range, y: bearing }` and points map through `(r cos θ, r sin θ)`. Depends on `sigma-points`, `unscented-transform`. Scene `bayes` view `polar`. Reference `09-Nonlinear-Filtering` and `10-Unscented-Kalman-Filter`. Diagnoses: `mean-through-function`, `no-transform`.
102. `rts-smoother-step` — `rtsSmootherStep(x, P, xNext, PNext, F, Q) → { x, P }`. Depends on `mat-mul-2`, `mat-inv-2`. Scene `bayes` view `rts`. Reference `13-Smoothing · rts_smoother`. Diagnoses: `no-process-noise`, `gain-not-transposed`.

## Book links into Track 5

`reading` is added to: `covariance-propagate-motion` (11-Extended-Kalman-Filters), `compose-uncertain` and `covariance-ellipse` (05-Multivariate-Gaussians), `ekf-predict`, `ekf-update-position`, `ekf-localize-step` (11-Extended-Kalman-Filters), `particle-weights` and `resample-particles` (12-Particle-Filters).

## Scenes

`bayes` kind with views `gh` (number line with prior, prediction, measurement, estimate), `hallway-predict` and `hallway-update` (bars over ten cells), `gaussians` and `kalman-1d` (Gaussian curves on a number line), `matrix2` (input columns and result columns as arrows), `cv-model` (F applied to a unit state and the Q ellipse), `kf-predict`, `kf-update`, `kf-track` (position-velocity ellipses), `sigma-points`, `unscented` (point clouds with weights), `polar` (banana-shaped truth cloud next to the recovered ellipse), `rts` (filtered, next, and smoothed ellipses).

## Lab

`puzzle-lab.html` gains a second anchor under the reference link; `puzzle-lab.js` shows `puzzle.reading` as "Also read: label ↗" when present.

## Verification

Node tests for ids, references, diagnoses, and every scene view; analytic checks: the unscented transform of `sigmaPoints(mean, P)` returns `mean` and `P`; `kalman1dStep` equals the gain form `K = P/(P+R)`; `rtsSmootherStep` with `xNext = F x` and `PNext = Pp` returns the input; `discretePredict` conserves total probability. Headless render of the lab and every Track 6 scene.

## Non-Goals

Full UKF predict/update loop, adaptive filtering, H-infinity, ensemble Kalman filters, least-squares filters.

# TF2 Uncertainty & Estimation Track Design

## Purpose

Add a fifth track that moves from transforms to estimation: where odometry comes from (wheel and gyro kinematics), how velocities move between frames, how uncertainty propagates through motion and composition, how measurements are gated and fused (EKF), and how particle filters weight and resample. It mirrors PythonRobotics' Localization examples and closes the "advanced" gap named in the lab's own assessment.

## Conventions

Earlier tracks' conventions hold. Additions:

- A 2D **state** is a pose `{ x, y, yaw }`; its **covariance** `P` is a 3×3 nested array ordered (x, y, yaw). A **control** is `{ v, omega }`.
- The motion Jacobian for `integrateMotion` at the *previous* state is `F = [[1, 0, −v·dt·sin yaw], [0, 1, v·dt·cos yaw], [0, 0, 1]]` (PythonRobotics `jacob_f`).
- A **position measurement** is `{ x, y }` with 2×2 covariance `R`; `H = [[1, 0, 0], [0, 1, 0]]`.
- An **uncertain transform** is `{ transform, covariance }`. Compounding uses the first-order Jacobians `J_A = [[1, 0, −(sin θ_A·x_B + cos θ_A·y_B)], [0, 1, cos θ_A·x_B − sin θ_A·y_B], [0, 0, 1]]` and `J_B = [[cos θ_A, −sin θ_A, 0], [sin θ_A, cos θ_A, 0], [0, 0, 1]]`.
- Gyro rates are body-frame `{ x, y, z }` rad/s; integration right-multiplies the current quaternion by the rotation of `|ω|·dt` about `ω/|ω|`.
- A body twist `{ vx, vy, wz }` at a rigidly attached sensor frame `baseFromSensor` is `rotate(v + ω × r, −yaw)` with `r` the sensor offset.
- Particles are `{ x, y }`; weights are normalized to sum 1; low-variance resampling takes a start offset `u0 ∈ [0, 1/N)` for determinism.

## Tracks

Track 5 · Uncertainty & Estimation, puzzles 76 to 87, `track: "estimation"`, unlocked by `aisle-correction-step`.

## Curriculum

### Stage 19, Kinematics

76. `diff-drive-twist` — `diffDriveTwist(vLeft, vRight, wheelBase) → { v, omega }`. Scene `estimation` view `diffdrive`. Reference ros2_control `diff_drive_controller`. Diagnoses: `omega-sign`, `no-wheelbase`.
77. `integrate-gyro` — `integrateGyro(q, omega, dt) → quaternion`. Depends on `quaternion-multiply`, `quaternion-from-axis-angle`. Scene `se3` view `gyro`. Reference `imu_filter_madgwick` (gyro integration step). Diagnoses: `world-frame-rates`, `rate-not-scaled-by-dt`.
78. `twist-in-sensor-frame` — `twistInSensorFrame(twist, baseFromSensor) → twist`. Depends on `rotate-vector`. Scene `estimation` view `sensor-twist`. Reference `tf2_geometry_msgs` (twist transforms need the lever arm). Diagnoses: `lever-arm-ignored`, `rotation-ignored`.

### Stage 20, Uncertainty

79. `covariance-propagate-motion` — `predictCovariance(P, pose, v, dt, Q) → 3×3` as `F P Fᵀ + Q`. Depends on `mat-mul-3`. Scene `estimation` view `predict-cov`. Reference PythonRobotics `extended_kalman_filter.py · jacob_f, PPred`. Diagnoses: `no-transpose`, `jacobian-identity`.
80. `compose-uncertain` — `composeUncertain(a, b) → { transform, covariance }`. Depends on `compose`, `mat-mul-3`. Scene `estimation` view `compose-uncertain`. Reference Smith, Self & Cheeseman, "Estimating Uncertain Spatial Relationships in Robotics". Diagnoses: `sum-only`, `no-yaw-lever`.
81. `mahalanobis-distance` — `mahalanobisDistance(innovation, covariance) → number` (squared) with an inline 2×2 inverse. Scene `estimation` view `mahalanobis`. Reference PythonRobotics `ekf_slam.py · search_correspond_landmark_id`. Diagnoses: `no-inverse`, `euclidean`.
82. `covariance-ellipse` — `covarianceEllipse(cov, sigmas) → { angle, major, minor }`. Scene `estimation` view `ellipse`. Reference PythonRobotics `utils/plot.py · plot_covariance_ellipse`. Diagnoses: `variance-not-stddev`, `angle-not-halved`.

### Stage 21, Estimation

83. `ekf-predict` — `ekfPredict(state, P, u, dt, Q) → { state, P }`. Depends on `integrate-motion`, `covariance-propagate-motion`. Scene `estimation` view `ekf-predict`. Reference `extended_kalman_filter.py · ekf_estimation` (predict). Diagnoses: `jacobian-at-new-state`, `covariance-unchanged`.
84. `ekf-update-position` — `ekfUpdatePosition(state, P, z, R) → { state, P }` with the 2×2 innovation covariance inverted inline. Scene `estimation` view `ekf-update`. Reference `ekf_estimation` (update). Diagnoses: `full-gain`, `covariance-unchanged`.
85. `particle-weights` — `particleWeights(particles, z, sigma) → weights`. Scene `estimation` view `particles`. Reference `particle_filter.py · gauss_likelihood`. Diagnoses: `unnormalized`, `no-square`.
86. `resample-particles` — `resampleLowVariance(particles, weights, u0) → particles`. Scene `estimation` view `resample`. Reference `particle_filter.py · re_sampling`. Diagnoses: `max-weight-only`, `no-cumulative`.
87. `ekf-localize-step` — `ekfLocalizeStep(state, P, u, z, dt, Q, R) → { state, P }` = predict then update. Depends on `ekf-predict`, `ekf-update-position`. Scene `estimation` view `ekf-step`. Reference `ekf_estimation`. Diagnoses: `update-before-predict`, `no-update`.

## Scenes

- `se3` gains view `gyro` (rate sliders and dt; the integrated basis is drawn).
- `estimation` kind with views `diffdrive`, `sensor-twist`, `predict-cov`, `compose-uncertain`, `mahalanobis`, `ellipse`, `ekf-predict`, `ekf-update`, `particles`, `resample`, `ekf-step`, reusing glyphs, ellipses, points, arrows, and arcs. Covariance ellipses draw the (x, y) block at 2σ.

## Verification

Node tests for ids, references, diagnoses, and every scene view; analytic checks: `covarianceEllipse` of a rotated diagonal recovers the slider angle, `ekfUpdatePosition` with a perfect measurement lands on it, and `resampleLowVariance` with uniform weights returns the input order. Headless render of the lab and every Track 5 scene.

## Non-Goals

UKF, particle-filter full loop, landmark SLAM, path planning and tracking; these can follow as further tracks.

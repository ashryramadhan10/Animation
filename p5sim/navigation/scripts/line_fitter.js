(function exposeLineFitter(root) {
  "use strict";
  // Mirrors src/beam_pointcloud/recursive_linreg_fitter.cpp (RecursiveLinRegFitter)
  // and include/.../beam_pointcloud/rotation_search_filter.hpp (RotationSearchFilter,
  // ApplyTwoStageRotationFilter), plus the inlier-chord extent computed inline in
  // PoseCorrectorNode::BuildBeamResultFromFit. Points are {x, y} in odom XY; a
  // line is {a, b, c} with a*x + b*y + c = 0 and a^2 + b^2 = 1.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const G = inNode ? require("./geometry.js") : sim.geometry;

  // FitLine2D — ordinary least squares, regressing on the better-conditioned axis.
  // Returns {A, B, C, isValid} normalised so A^2 + B^2 = 1.
  function fitLine2D(pts, minPointsForFitting) {
    const r = { A: 0, B: 0, C: 0, isValid: false };
    if (pts.length < minPointsForFitting) return r;
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; }
    const mx = sx / pts.length, my = sy / pts.length;
    let varX = 0, varY = 0;
    for (const p of pts) { varX += (p.x - mx) * (p.x - mx); varY += (p.y - my) * (p.y - my); }
    let A, B, C;
    if (varX >= varY) {
      // Regress y on x: y = slope*x + intercept
      let num = 0;
      for (const p of pts) num += (p.x - mx) * (p.y - my);
      if (Math.abs(varX) < 1e-9) { A = 1; B = 0; C = -mx; }
      else {
        const slope = num / varX, intercept = my - slope * mx;
        const norm = Math.hypot(slope, 1);
        A = slope / norm; B = -1 / norm; C = intercept / norm;
      }
    } else {
      // Regress x on y (near-vertical walls)
      let num = 0;
      for (const p of pts) num += (p.y - my) * (p.x - mx);
      if (Math.abs(varY) < 1e-9) { A = 0; B = 1; C = -my; }
      else {
        const slope = num / varY, intercept = mx - slope * my;
        const norm = Math.hypot(1, slope);
        A = 1 / norm; B = -slope / norm; C = -intercept / norm;
      }
    }
    r.A = A; r.B = B; r.C = C; r.isValid = true;
    return r;
  }

  // Maps beam_pointcloud.linreg_* YAML keys onto the fitter config (node ctor lines 169-183).
  function fitterConfigFromYaml(bp) {
    return {
      distance_threshold: bp.linreg_distance_threshold,
      min_inlier_ratio: bp.linreg_min_inlier_ratio,
      min_points_for_fitting: bp.min_points_for_fitting,
      max_iterations: bp.linreg_max_iterations,
      max_allowed_gap: bp.linreg_max_allowed_gap,
      min_line_length: bp.linreg_min_line_length,
    };
  }

  class RecursiveLinRegFitter {
    constructor(config) {
      this.config = Object.assign({
        distance_threshold: 0.05, min_inlier_ratio: 0.5, min_points_for_fitting: 10,
        max_iterations: 10, max_allowed_gap: 3.0, min_line_length: 0.5,
      }, config);
    }
    getConfig() { return this.config; }

    // FitPlane — iterative inlier refinement, then ratio / gap / length validation.
    // `iterations` and `reason` are sim additions (the line-fit page animates the
    // refinement; the node logs the failure on its side).
    fitPlane(points) {
      const cfg = this.config;
      const result = { valid: false, coefficients: { a: 0, b: 0, c: 0 }, inlierIndices: [], inlierRatio: 0, reason: "", iterations: [] };
      if (!points || points.length < cfg.min_points_for_fitting) { result.reason = "too few points"; return result; }
      const n = points.length;
      let active = points.map((_, i) => i);
      let line = { A: 0, B: 0, C: 0, isValid: false };
      for (let iter = 0; iter < cfg.max_iterations; iter += 1) {
        const candidate = fitLine2D(active.map(i => points[i]), cfg.min_points_for_fitting);
        if (!candidate.isValid) break;
        const nextActive = [];
        for (const i of active) {
          const dist = Math.abs(candidate.A * points[i].x + candidate.B * points[i].y + candidate.C);
          if (dist <= cfg.distance_threshold) nextActive.push(i);
        }
        result.iterations.push({ line: { a: candidate.A, b: candidate.B, c: candidate.C }, inlierIndices: nextActive.slice() });
        if (nextActive.length === active.length) { line = candidate; active = nextActive; break; }   // converged
        if (nextActive.length < cfg.min_points_for_fitting) break;                                   // keep previous line/active
        line = candidate; active = nextActive;
      }
      if (!line.isValid || active.length === 0) { result.reason = "no valid line"; return result; }
      const inlierRatio = active.length / n;
      result.inlierRatio = inlierRatio;
      if (inlierRatio < cfg.min_inlier_ratio) { result.reason = "inlier ratio"; return result; }
      if (cfg.max_allowed_gap > 0 || cfg.min_line_length > 0) {
        const dirX = -line.B, dirY = line.A;
        const proj = active.map(i => dirX * points[i].x + dirY * points[i].y).sort((p, q) => p - q);
        if (cfg.max_allowed_gap > 0) {
          let maxGap = 0;
          for (let k = 1; k < proj.length; k += 1) maxGap = Math.max(maxGap, proj[k] - proj[k - 1]);
          if (maxGap > cfg.max_allowed_gap) { result.reason = "gap"; return result; }
        }
        if (cfg.min_line_length > 0 && proj[proj.length - 1] - proj[0] < cfg.min_line_length) { result.reason = "line length"; return result; }
      }
      result.coefficients = { a: line.A, b: line.B, c: line.C };
      result.inlierIndices = active;
      result.valid = true;
      return result;
    }

    // ExtractInliers — the inlier subset in the original order.
    extractInliers(points, inlierIndices) {
      const out = [];
      for (const idx of inlierIndices) if (idx >= 0 && idx < points.length) out.push(points[idx]);
      return out;
    }
  }

  // Inlier chord length along the fitted line (BuildBeamResultFromFit, node 2315-2327).
  function lineExtent(points, inlierIndices, coefficients) {
    if (!points || !inlierIndices || !inlierIndices.length) return 0;
    const dirX = -coefficients.b, dirY = coefficients.a;
    let tMin = Infinity, tMax = -Infinity;
    for (const idx of inlierIndices) {
      const t = dirX * points[idx].x + dirY * points[idx].y;
      tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
    }
    return tMax > tMin ? tMax - tMin : 0;
  }

  // RotationSearchFilter — sweep angles about a pivot offset from the centroid and
  // keep the thin wall-face layer. `debug` is a sim addition for the demo page.
  function rotationSearchFilter(points, estimatedAngle, pivotDistance, searchRangeDeg, searchStepDeg, filterThreshold, isLeftSide) {
    if (!points || !points.length) return { points: [], bestAngle: estimatedAngle, debug: null };
    const n = points.length;
    const avg = G.meanPoint(points);
    // Pivot: left wall -> (+sin, -cos) side; right wall -> (-sin, +cos) side.
    const pivotSign = isLeftSide ? 1 : -1;
    const pivot = { x: avg.x + pivotSign * pivotDistance * Math.sin(estimatedAngle), y: avg.y - pivotSign * pivotDistance * Math.cos(estimatedAngle) };
    const dx = new Array(n), dy = new Array(n);
    for (let i = 0; i < n; i += 1) { dx[i] = points[i].x - pivot.x; dy[i] = points[i].y - pivot.y; }
    const angleStart = estimatedAngle - searchRangeDeg * Math.PI / 180;
    const stepRad = searchStepDeg * Math.PI / 180;
    const numAngles = Math.floor(2 * searchRangeDeg / searchStepDeg) + 1;
    const angles = [], metrics = [], rotatedValues = [];
    let bestK = 0;
    let bestMetric = isLeftSide ? -1e10 : 1e10;
    for (let k = 0; k < numAngles; k += 1) {
      const angle = angleStart + k * stepRad;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const values = new Array(n);
      let metric = isLeftSide ? 1e10 : -1e10;
      for (let i = 0; i < n; i += 1) {
        const ry = cosA * dy[i] - sinA * dx[i];
        values[i] = ry;
        if (isLeftSide) { if (ry < metric) metric = ry; } else if (ry > metric) metric = ry;
      }
      angles.push(angle); metrics.push(metric); rotatedValues.push(values);
      const better = isLeftSide ? metric > bestMetric : metric < bestMetric;
      if (better) { bestMetric = metric; bestK = k; }
    }
    const bestValues = rotatedValues[bestK];
    const kept = [];
    for (let i = 0; i < n; i += 1) {
      const keep = isLeftSide ? bestValues[i] < bestMetric + filterThreshold : bestValues[i] > bestMetric - filterThreshold;
      if (keep) kept.push(points[i]);
    }
    return { points: kept, bestAngle: angles[bestK], debug: { pivot, angles, metrics, rotatedValues, bestIndex: bestK, bestMetric } };
  }

  // Maps beam_pointcloud.rot_* YAML keys onto RotationFilterConfig (node ctor 192-210).
  function rotationFilterConfigFromYaml(bp) {
    return {
      coarse_pivot_distance: bp.rot_coarse_pivot_distance,
      coarse_search_range_deg: bp.rot_coarse_search_range_deg,
      coarse_search_step_deg: bp.rot_coarse_search_step_deg,
      coarse_filter_threshold: bp.rot_coarse_filter_threshold,
      fine_pivot_distance: bp.rot_fine_pivot_distance,
      fine_search_range_deg: bp.rot_fine_search_range_deg,
      fine_search_step_deg: bp.rot_fine_search_step_deg,
      fine_filter_threshold: bp.rot_fine_filter_threshold,
    };
  }

  // ApplyTwoStageRotationFilter — coarse sweep, then a fine sweep around the coarse best.
  function applyTwoStageRotationFilter(points, estimatedAngle, isLeftSide, cfg) {
    if (!points || !points.length) return { points: points || [], coarse: null, fine: null };
    const coarse = rotationSearchFilter(points, estimatedAngle, cfg.coarse_pivot_distance, cfg.coarse_search_range_deg, cfg.coarse_search_step_deg, cfg.coarse_filter_threshold, isLeftSide);
    if (!coarse.points.length) return { points: coarse.points, coarse, fine: null };
    const fine = rotationSearchFilter(coarse.points, coarse.bestAngle, cfg.fine_pivot_distance, cfg.fine_search_range_deg, cfg.fine_search_step_deg, cfg.fine_filter_threshold, isLeftSide);
    return { points: fine.points, coarse, fine };
  }

  const api = { fitLine2D, fitterConfigFromYaml, RecursiveLinRegFitter, lineExtent, rotationSearchFilter, rotationFilterConfigFromYaml, applyTwoStageRotationFilter };
  if (inNode) module.exports = api;
  else sim.lineFitter = api;
})(typeof window !== "undefined" ? window : globalThis);

(function exposeXOffset(root) {
  "use strict";
  // Mirrors the X-offset correction section of PoseCorrectorNode in
  // src/pose_corrector_node.cpp (lines 1679-1930): VerticalObservation,
  // MissionUprightProjection, PillarAssociation, ProjectAlongAisle,
  // ProjectAcrossAisle, BuildVerticalObservation, ApplyXOffsetToObservation,
  // BuildProjectedMissionUprights, AssociateVerticalObservation, Median,
  // UpdateXOffsetFromVerticalObservations. Detected vertical uprights (already
  // in odom XY) are shifted by the current raw x correction, matched to mission
  // uprights inside pillar_match_range, and the accepted residuals increment
  // the running raw x offset; the filtered output is an EMA of that.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});

  // ProjectAlongAisle / ProjectAcrossAisle — s/l decomposition along the aisle heading.
  function projectAlongAisle(x, y, heading) { return Math.cos(heading) * x + Math.sin(heading) * y; }
  function projectAcrossAisle(x, y, heading) { return -Math.sin(heading) * x + Math.cos(heading) * y; }

  // BuildVerticalObservation — one detected upright position with its s/l projection.
  function buildVerticalObservation(xMap, yMap, heading) {
    return { x: xMap, y: yMap, s: projectAlongAisle(xMap, yMap, heading), l: projectAcrossAisle(xMap, yMap, heading) };
  }

  // ApplyXOffsetToObservation — shift a detection along the aisle by the current x correction.
  function applyXOffsetToObservation(observation, aisleHeadingRad, xOffsetM) {
    return {
      x: observation.x + xOffsetM * Math.cos(aisleHeadingRad),
      y: observation.y + xOffsetM * Math.sin(aisleHeadingRad),
      s: observation.s + xOffsetM,
      l: observation.l,
    };
  }

  // BuildProjectedMissionUprights — mission uprights (start/end midpoints) projected
  // and sorted along the aisle; `order` is the sorted index.
  function buildProjectedMissionUprights(uprights, heading) {
    const projected = [];
    for (const upright of uprights || []) {
      const x = (upright.start.x + upright.end.x) * 0.5;
      const y = (upright.start.y + upright.end.y) * 0.5;
      projected.push({ id: upright.id, order: 0, x, y, s: projectAlongAisle(x, y, heading), l: projectAcrossAisle(x, y, heading) });
    }
    projected.sort((a, b) => a.s - b.s);
    projected.forEach((u, i) => { u.order = i; });
    return projected;
  }

  // AssociateVerticalObservation — nearest mission upright inside pillar_match_range,
  // scored by distance plus a weighted across-aisle residual.
  function associateVerticalObservation(observation, uprights, aisleHeadingRad, currentXOffsetM, cfg) {
    if (!uprights || !uprights.length) return null;
    const correctedObservation = applyXOffsetToObservation(observation, aisleHeadingRad, currentXOffsetM);
    let best = null;
    let bestScore = Infinity;
    for (const upright of uprights) {
      const errX = upright.x - correctedObservation.x;
      const errY = upright.y - correctedObservation.y;
      const distance = Math.hypot(errX, errY);
      if (cfg.pillar_match_range > 0 && distance > cfg.pillar_match_range) continue;
      const lateralResidual = Math.abs(upright.l - correctedObservation.l);
      const score = distance + cfg.pillar_lateral_score_weight * lateralResidual;
      if (best === null || score < bestScore) {
        best = {
          observation, correctedObservation, upright, errX, errY,
          distanceM: distance, residualM: upright.s - correctedObservation.s,
          lateralResidualM: lateralResidual, scoreM: score,
        };
        bestScore = score;
      }
    }
    return best;
  }

  // Median — nth_element median; even counts average the middle pair.
  function median(values) {
    if (!values || !values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    let result = sorted[mid];
    if (sorted.length % 2 === 0) result = 0.5 * (result + sorted[mid - 1]);
    return result;
  }

  // UpdateXOffsetFromVerticalObservations — one frame of pillar matching. Mutates
  // state.{xOffsetRaw, xOffsetFiltered, xOffsetHasMeasurement} exactly as the node.
  function updateXOffsetFromVerticalObservations(state, observations, aisleHeadingRad, uprights, cfg) {
    const out = { updated: false, reason: "", currentX: 0, matches: [], keptMatches: [], rejected: 0, meanResidual: 0, selected: null, projectedUprights: [] };
    if (!uprights || !uprights.length) { out.reason = "no map"; return out; }
    if (!observations || !observations.length) { out.reason = "no observations"; return out; }
    const projected = buildProjectedMissionUprights(uprights, aisleHeadingRad);
    out.projectedUprights = projected;
    const currentXForMatching = state.xOffsetHasMeasurement ? state.xOffsetRaw : 0;
    out.currentX = currentXForMatching;
    const bestByUprightId = new Map();
    for (const observation of observations) {
      const association = associateVerticalObservation(observation, projected, aisleHeadingRad, currentXForMatching, cfg);
      if (!association) { out.rejected += 1; continue; }
      const existing = bestByUprightId.get(association.upright.id);
      if (!existing || association.scoreM < existing.scoreM) bestByUprightId.set(association.upright.id, association);
    }
    const matches = Array.from(bestByUprightId.values());
    out.matches = matches;
    if (!matches.length) { out.reason = "no match"; return out; }
    const medianResidual = median(matches.map(m => m.residualM));
    let kept = matches.filter(m => !(matches.length > 1 && cfg.pillar_offset_outlier_threshold_m > 0 &&
      Math.abs(m.residualM - medianResidual) > cfg.pillar_offset_outlier_threshold_m));
    if (!kept.length) kept = [matches.reduce((a, b) => (b.scoreM < a.scoreM ? b : a))];
    const meanResidual = kept.reduce((sum, m) => sum + m.residualM, 0) / kept.length;
    const selected = kept.reduce((a, b) => (Math.abs(b.residualM - meanResidual) < Math.abs(a.residualM - meanResidual) ? b : a));
    state.xOffsetRaw = currentXForMatching + meanResidual;
    if (!state.xOffsetHasMeasurement) {
      state.xOffsetFiltered = state.xOffsetRaw;
      state.xOffsetHasMeasurement = true;
    } else {
      state.xOffsetFiltered = (1 - cfg.x_offset_ema_alpha) * state.xOffsetFiltered + cfg.x_offset_ema_alpha * state.xOffsetRaw;
    }
    out.updated = true; out.keptMatches = kept; out.meanResidual = meanResidual; out.selected = selected;
    return out;
  }

  const api = { projectAlongAisle, projectAcrossAisle, buildVerticalObservation, applyXOffsetToObservation, buildProjectedMissionUprights, associateVerticalObservation, median, updateXOffsetFromVerticalObservations };
  if (inNode) module.exports = api;
  else sim.xOffset = api;
})(typeof window !== "undefined" ? window : globalThis);

(function exposeSyntheticWorld(root) {
  "use strict";
  // Sim-only. Builds a deterministic warehouse aisle in the MAP frame, then
  // expresses everything the node would see in ODOM by subtracting a constant
  // odom offset (map = odom + offset). A fault schedule injects the situations
  // the node's guards exist for. Nothing here mirrors C++.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});
  const G = inNode ? require("./geometry.js") : sim.geometry;

  const DEG = Math.PI / 180;

  // The fault schedule. Windows are inclusive frame ranges; frames outside every
  // window are "none".
  function buildFaultSchedule() {
    return [
      { id: "missing-right", label: "right rack missing", from: 30, to: 44 },
      { id: "short-both", label: "both beams short (extent 1.2 m)", from: 45, to: 54 },
      { id: "skew-right", label: "right beam skewed +20 deg, sparse", from: 55, to: 69 },
      { id: "glitch-lateral", label: "odom pose glitch +0.35 m (2 frames)", from: 70, to: 71 },
      { id: "displacement", label: "true lateral displacement +0.35 m", from: 75, to: 89 },
      { id: "dropout", label: "perception dropout (timer only)", from: 90, to: 99 },
      { id: "id-switch", label: "left track id 1 -> 3", from: 100, to: 109 },
    ];
  }

  function faultAt(world, frameIndex) {
    for (const f of world.faults) if (frameIndex >= f.from && frameIndex <= f.to) return f;
    return null;
  }

  function mapToOdom(world, p) { return { x: p.x - world.odomOffset.vec.x, y: p.y - world.odomOffset.vec.y }; }
  function odomToMap(world, p) { return { x: p.x + world.odomOffset.vec.x, y: p.y + world.odomOffset.vec.y }; }

  // One rack per side: face points along +/-halfExtent with normal noise, plus
  // interior points 0.06-0.25 m behind the face (away from the aisle).
  function rackPoints(rng, dir, normal, along, sideSign, halfWidth, halfExtent, faceCount, interiorCount, skewRad) {
    const base = { x: dir.x * along + normal.x * sideSign * halfWidth, y: dir.y * along + normal.y * sideSign * halfWidth };
    const outward = { x: normal.x * sideSign, y: normal.y * sideSign };
    const pts = [];
    for (let i = 0; i < faceCount; i += 1) {
      const t = G.randRange(rng, -halfExtent, halfExtent);
      const n = G.randNormal(rng, 0, 0.018);
      pts.push({ x: base.x + dir.x * t + outward.x * n, y: base.y + dir.y * t + outward.y * n, kind: "face" });
    }
    for (let i = 0; i < interiorCount; i += 1) {
      const t = G.randRange(rng, -halfExtent, halfExtent);
      const depth = G.randRange(rng, 0.06, 0.25) + G.randNormal(rng, 0, 0.025);
      pts.push({ x: base.x + dir.x * t + outward.x * depth, y: base.y + dir.y * t + outward.y * depth, kind: "interior" });
    }
    if (skewRad) {
      const c = Math.cos(skewRad), s = Math.sin(skewRad);
      for (const p of pts) {
        const dx = p.x - base.x, dy = p.y - base.y;
        p.x = base.x + c * dx - s * dy;
        p.y = base.y + s * dx + c * dy;
      }
    }
    return pts;
  }

  function buildWorld(options = {}) {
    const o = Object.assign({
      seed: 73, headingDeg: 33.5, halfWidth: 1.6, uprightSpacing: 2.8, frameCount: 150, dt: 0.1,
      odomAlongOffsetM: 0.6, odomLateralOffsetM: 0.2,
    }, options);
    const headingRad = o.headingDeg * DEG;
    const dir = G.headingVector(headingRad);
    const normal = G.normalVector(headingRad);
    const vec = { x: dir.x * o.odomAlongOffsetM + normal.x * o.odomLateralOffsetM, y: dir.y * o.odomAlongOffsetM + normal.y * o.odomLateralOffsetM };
    const world = {
      seed: o.seed, headingRad, halfWidth: o.halfWidth, uprightSpacing: o.uprightSpacing,
      frameCount: o.frameCount, dt: o.dt,
      odomOffset: { along: o.odomAlongOffsetM, lateral: o.odomLateralOffsetM, vec },
      missionUprights: [],
      trueCenterlineMap: { a: normal.x, b: normal.y, c: 0 },
      trueCenterlineOdom: { a: normal.x, b: normal.y, c: o.odomLateralOffsetM },
      faults: buildFaultSchedule(),
      frames: [],
      truth: [],
    };

    // Mission uprights every spacing along both rack faces (map frame).
    const sMin = -o.uprightSpacing, sMax = 0.16 * o.frameCount + 6;
    let k = 0;
    for (let s = sMin; s <= sMax; s += o.uprightSpacing, k += 1) {
      for (const [sideSign, idBase] of [[1, 100], [-1, 200]]) {
        const x = dir.x * s + normal.x * sideSign * o.halfWidth, y = dir.y * s + normal.y * sideSign * o.halfWidth;
        world.missionUprights.push({ id: idBase + k, type: 2, start: { x, y }, end: { x, y } });
      }
    }

    for (let i = 0; i < o.frameCount; i += 1) {
      const fault = faultAt(world, i);
      const id = fault ? fault.id : "none";
      const along = 0.16 * i;
      let lateral = 0.08 * Math.sin(0.025 * i) + 0.05;
      if (id === "displacement" || i > 89) lateral += 0.35;   // the drone really moved and stays there
      const yaw = headingRad + 4 * DEG * Math.sin(0.21 * i);
      const mapPose = { x: dir.x * along + normal.x * lateral, y: dir.y * along + normal.y * lateral, z: 2.0, yaw };
      world.truth.push({ mapPose, along, lateral });

      if (id === "dropout") { world.frames.push(null); continue; }

      const rng = G.makeRng(o.seed * 1000 + i);
      const glitch = id === "glitch-lateral" ? 0.35 : 0;   // reported odom shifts; pose and points together
      const toOdom = p => ({ x: p.x - vec.x + normal.x * glitch, y: p.y - vec.y + normal.y * glitch });

      const tracks = [];
      const halfExtent = id === "short-both" ? 0.6 : 1.6;
      const sides = id === "missing-right" ? ["left"] : ["left", "right"];
      for (const side of sides) {
        const sideSign = side === "left" ? 1 : -1;
        let faceCount = 640, interiorCount = 200, skew = 0;
        if (id === "skew-right") {
          if (side === "left") { faceCount = 1000; interiorCount = 300; }
          else { faceCount = 520; interiorCount = 160; skew = 20 * DEG; }
        }
        const pts = rackPoints(rng, dir, normal, along, sideSign, o.halfWidth, halfExtent, faceCount, interiorCount, skew)
          .map(p => Object.assign(toOdom(p), { kind: p.kind }));
        let trackId = side === "left" ? 1 : 2;
        if (id === "id-switch" && side === "left") trackId = 3;
        tracks.push({ trackId, side, points: pts });
      }

      // Vertical detections: uprights within [-2.5, +4] m of the drone along the aisle.
      const verticalDetections = [];
      let nearest = null;
      for (const u of world.missionUprights) {
        const s = dir.x * u.start.x + dir.y * u.start.y;
        if (s < along - 2.5 || s > along + 4) continue;
        if (!nearest || Math.abs(s - along) < Math.abs(nearest.s - along)) nearest = { u, s };
        verticalDetections.push(toOdom({ x: u.start.x + G.randNormal(rng, 0, 0.05), y: u.start.y + G.randNormal(rng, 0, 0.05) }));
      }
      if (i % 17 === 0 && nearest) {
        verticalDetections.push(toOdom({ x: nearest.u.start.x + dir.x * 0.9, y: nearest.u.start.y + dir.y * 0.9 }));
      }

      const fcuOdom = toOdom(mapPose);
      world.frames.push({
        frameIndex: i, stamp: i * o.dt, fault: id,
        fcuPose: { x: fcuOdom.x, y: fcuOdom.y, z: mapPose.z, yaw },
        tracks, verticalDetections,
      });
    }
    return world;
  }

  // Odom pose interpolated between the truth poses (the FCU keeps reporting during dropouts).
  function poseAtTime(world, tSec) {
    const f = tSec / world.dt;
    const i0 = Math.max(0, Math.min(world.frameCount - 1, Math.floor(f)));
    const i1 = Math.max(0, Math.min(world.frameCount - 1, i0 + 1));
    const alpha = Math.max(0, Math.min(1, f - i0));
    const p0 = world.truth[i0].mapPose, p1 = world.truth[i1].mapPose;
    const map = { x: p0.x + alpha * (p1.x - p0.x), y: p0.y + alpha * (p1.y - p0.y), z: p0.z + alpha * (p1.z - p0.z) };
    const odom = mapToOdom(world, map);
    return { x: odom.x, y: odom.y, z: map.z, yaw: G.blendAngleCircular(p0.yaw, p1.yaw, alpha), stamp: tSec };
  }

  const api = { buildWorld, buildFaultSchedule, faultAt, mapToOdom, odomToMap, poseAtTime };
  if (inNode) module.exports = api;
  else sim.syntheticWorld = api;
})(typeof window !== "undefined" ? window : globalThis);

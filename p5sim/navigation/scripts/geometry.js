(function exposeGeometry(root) {
  "use strict";
  // Mirrors include/warehouse_pose_corrector_vision_based/aisle_types.hpp
  // (blend_angle_circular, resolve_heading_to_reference),
  // src/common/rack_geometry_utils.cpp (NormalizeAngle), and the node helpers
  // ComputeHeadingFromLineCoefficients / AlignLineToHeading in
  // src/pose_corrector_node.cpp. Vector helpers and the seeded RNG are sim-only.
  const inNode = typeof module !== "undefined" && module.exports;
  const sim = inNode ? null : (root.PoseCorrectorSim = root.PoseCorrectorSim || {});

  // ── 2D vectors ─────────────────────────────────────────────────────────────
  function v(x, y) { return { x, y }; }
  function add(a, b) { return v(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return v(a.x - b.x, a.y - b.y); }
  function mul(a, s) { return v(a.x * s, a.y * s); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function normalize(a) { const n = len(a); return n < 1e-9 ? v(0, 0) : mul(a, 1 / n); }
  // Unit vector along an aisle heading.
  function headingVector(yaw) { return v(Math.cos(yaw), Math.sin(yaw)); }
  // Left normal of an aisle heading: the (a, b) of a rack line ax+by+c=0 aligned to it.
  function normalVector(yaw) { return v(-Math.sin(yaw), Math.cos(yaw)); }
  function degToRad(deg) { return deg * Math.PI / 180; }
  function radToDeg(rad) { return rad * 180 / Math.PI; }
  function meanPoint(points) {
    if (!points.length) return v(0, 0);
    let sx = 0, sy = 0;
    for (const p of points) { sx += p.x; sy += p.y; }
    return v(sx / points.length, sy / points.length);
  }

  // ── angles ─────────────────────────────────────────────────────────────────
  // NormalizeAngle — twin of RackGeometryUtils::NormalizeAngle: wrap into [-pi, pi].
  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  // blend_angle_circular — wrap-safe weighted blend. `w` is the weight on `b`.
  function blendAngleCircular(a, b, w) {
    const s = (1 - w) * Math.sin(a) + w * Math.sin(b);
    const c = (1 - w) * Math.cos(a) + w * Math.cos(b);
    return Math.atan2(s, c);
  }

  // ResolveHeadingToReference — pick heading or heading+pi, whichever is closer
  // to the reference (a line's direction is ambiguous modulo pi).
  function resolveHeadingToReference(heading, reference) {
    if (reference === null || reference === undefined) return heading;
    const alt = normalizeAngle(heading + Math.PI);
    const diff = Math.abs(normalizeAngle(heading - reference));
    const altDiff = Math.abs(normalizeAngle(alt - reference));
    return altDiff < diff ? alt : heading;
  }

  // ── lines: {a, b, c} meaning a*x + b*y + c = 0 ─────────────────────────────
  // ComputeHeadingFromLineCoefficients — direction (-b, a) forced into the +x half-plane.
  function computeHeadingFromLineCoefficients(line) {
    let dx = -line.b;
    let dy = line.a;
    const norm = Math.hypot(dx, dy);
    if (norm < 1e-6) return 0;
    dx /= norm; dy /= norm;
    if (dx < 0) { dx = -dx; dy = -dy; }
    return Math.atan2(dy, dx);
  }

  // AlignLineToHeading — normalize and flip the sign so the normal points along (-sin, cos).
  function alignLineToHeading(line, aisleYawRad) {
    let a = line.a, b = line.b, c = line.c;
    const norm = Math.hypot(a, b);
    if (norm < 1e-6) return { a: 0, b: 1, c: 0 };
    a /= norm; b /= norm; c /= norm;
    const refA = -Math.sin(aisleYawRad);
    const refB = Math.cos(aisleYawRad);
    if (a * refA + b * refB < 0) { a = -a; b = -b; c = -c; }
    return { a, b, c };
  }

  // Signed distance of a point from a line with a unit normal.
  function lineSignedDistance(line, point) { return line.a * point.x + line.b * point.y + line.c; }

  // ── seeded random (sim-only, deterministic worlds) ─────────────────────────
  function makeRng(seed) {
    let state = seed >>> 0;
    return function rand() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randRange(rng, min, max) { return min + (max - min) * rng(); }
  function randNormal(rng, mean = 0, std = 1) {
    const u1 = Math.max(1e-9, rng());
    const u2 = Math.max(1e-9, rng());
    return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
  }

  const api = {
    v, add, sub, mul, dot, len, normalize, headingVector, normalVector, degToRad, radToDeg, meanPoint,
    normalizeAngle, blendAngleCircular, resolveHeadingToReference,
    computeHeadingFromLineCoefficients, alignLineToHeading, lineSignedDistance,
    makeRng, randRange, randNormal,
  };
  if (inNode) module.exports = api;
  else sim.geometry = api;
})(typeof window !== "undefined" ? window : globalThis);

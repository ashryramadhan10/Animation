(function defineSidePuzzles(root) {
  "use strict";

  const PI = Math.PI;
  const NOC = "https://natureofcode.com/";

  const STAGES = Object.freeze([
    { id: "vectors", title: "Vectors", subtitle: "Length, direction, dot products, and projections.", range: [1, 7] },
    { id: "forces", title: "Forces", subtitle: "F = ma, Euler steps, friction, drag, attraction, wrapping.", range: [8, 13] },
    { id: "steering", title: "Steering", subtitle: "Seek, flee, arrive, pursue, wander, flow fields, paths.", range: [14, 21] },
    { id: "flocking", title: "Flocking", subtitle: "Separate, align, cohere, and weigh them together.", range: [22, 25] },
    { id: "chains", title: "Procedural Chains", subtitle: "Angle wrapping, cones, joint chains, and border wraps.", range: [26, 29] },
    { id: "randomness", title: "Randomness", subtitle: "Bins, histograms, and normalized counts.", range: [30, 32] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "nature", title: "Side Lab · Nature of Code Core", stages: STAGES }),
  ]);

  function lines() { return Array.from(arguments).join("\n"); }
  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }
  function example(args, expected, label) { return Object.freeze({ args, expected, label }); }
  function diagnosis(id, message, source) { return Object.freeze({ id, message, source }); }
  function noc(chapter, symbol) { return Object.freeze({ label: "Nature of Code · " + chapter + (symbol ? " · " + symbol : ""), url: NOC + chapter + "/" }); }
  function docref(label, url) { return Object.freeze({ label, url }); }

  function puzzle(config) {
    const stage = STAGES.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Side puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      reading: null,
      ...config,
      track: "nature",
      stage: stage.id,
      walkthroughChapter: config.source,
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(config.scene.handles.map((handle) => Object.freeze(handle))),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  const AGENT_HANDLES = [
    { id: "agent", type: "pose", label: "agent (drag the heading grip to turn)", value: { x: -2, y: -0.5, yaw: 0.4 } },
    { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
  ];
  const STEER = [1.5, 0.6];
  const ZERO = { x: 0, y: 0 };
  const AT_REST = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } };

  const VECTORS = [
    puzzle({
      number: 1, id: "normalize", title: "Normalize a Vector", source: "scalar_projection/sketch.js",
      goal: "Return the unit vector with the same direction, or the zero vector for zero input.",
      concept: "Every steering formula starts by throwing away length and keeping direction.",
      functionName: "normalize", signature: "normalize(v) → { x, y }",
      starterSource: starter("normalize", "v", "Divide by the length; guard against length 0."),
      referenceSource: lines(
        "function normalize(v) {",
        "  var length = Math.sqrt(v.x * v.x + v.y * v.y);",
        "  if (length === 0) return { x: 0, y: 0 };",
        "  return { x: v.x / length, y: v.y / length };",
        "}"
      ),
      comparator: "vector2",
      reference: noc("vectors", "normalize"),
      scene: { kind: "nature", view: "unary", handles: [{ id: "v", type: "vector", label: "v", value: { x: 2.4, y: 1.2 } }], args: [{ handle: "v" }] },
      diagnoses: [
        diagnosis("divides-by-squared-length", "That divides by x² + y²; the length is its square root.", "function normalize(v) { var squared = v.x * v.x + v.y * v.y; if (squared === 0) return { x: 0, y: 0 }; return { x: v.x / squared, y: v.y / squared }; }"),
        diagnosis("no-zero-guard", "A zero vector has no direction; return { x: 0, y: 0 } instead of dividing by zero.", "function normalize(v) { var length = Math.sqrt(v.x * v.x + v.y * v.y); return { x: v.x / length, y: v.y / length }; }"),
      ],
      hints: ["Length is sqrt(x² + y²).", "Divide both components by it.", "If the length is 0, return { x: 0, y: 0 }."],
      cases: [
        example([{ x: 3, y: 4 }], { x: 0.6, y: 0.8 }, "3-4-5"),
        example([{ x: 0, y: -2 }], { x: 0, y: -1 }, "straight down"),
        example([{ x: 0, y: 0 }], { x: 0, y: 0 }, "zero vector"),
        example([{ x: -1, y: -1 }], { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }, "diagonal"),
      ],
    }),
    puzzle({
      number: 2, id: "set-magnitude", title: "Set the Magnitude", source: "agents/vehicle.js",
      goal: "Keep the direction, replace the length.",
      concept: "desired.setMag(maxspeed) is how every vehicle turns a direction into a speed.",
      functionName: "setMagnitude", signature: "setMagnitude(v, m) → { x, y }",
      starterSource: starter("setMagnitude", "v, m"),
      referenceSource: "function setMagnitude(v, m) { var unit = normalize(v); return { x: unit.x * m, y: unit.y * m }; }",
      comparator: "vector2", dependencies: ["normalize"],
      reference: noc("vectors", "setMag"),
      scene: { kind: "nature", view: "unary", handles: [
        { id: "v", type: "vector", label: "v", value: { x: 2.4, y: 1.2 } },
        { id: "m", type: "slider", label: "new magnitude", value: 1.5, min: 0.2, max: 3 },
      ], args: [{ handle: "v" }, { handle: "m" }] },
      diagnoses: [
        diagnosis("adds-magnitude", "Adding m to each component changes the direction; scale the unit vector instead.", "function setMagnitude(v, m) { return { x: v.x + m, y: v.y + m }; }"),
        diagnosis("scales-unnormalized", "Multiplying the raw vector by m gives length |v|·m, not m.", "function setMagnitude(v, m) { return { x: v.x * m, y: v.y * m }; }"),
      ],
      hints: ["Normalize first.", "Then multiply both components by m.", "Zero input stays zero."],
      cases: [
        example([{ x: 3, y: 4 }, 10], { x: 6, y: 8 }, "stretch"),
        example([{ x: 0, y: 2 }, 0.5], { x: 0, y: 0.5 }, "shrink"),
        example([{ x: 1, y: 0 }, -2], { x: -2, y: 0 }, "negative flips"),
        example([{ x: 0, y: 0 }, 3], { x: 0, y: 0 }, "zero stays zero"),
      ],
    }),
    puzzle({
      number: 3, id: "limit-vector", title: "Limit a Vector", source: "agents/vehicle.js",
      goal: "Cap the length at max; shorter vectors pass through unchanged.",
      concept: "steer.limit(maxforce) is the single most important line for life-like motion: it bounds how sharply a vehicle can turn.",
      functionName: "limitVector", signature: "limitVector(v, max) → { x, y }",
      starterSource: starter("limitVector", "v, max"),
      referenceSource: lines(
        "function limitVector(v, max) {",
        "  var length = Math.sqrt(v.x * v.x + v.y * v.y);",
        "  if (length > max) return setMagnitude(v, max);",
        "  return { x: v.x, y: v.y };",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude"],
      reference: noc("vectors", "limit"),
      scene: { kind: "nature", view: "unary", handles: [
        { id: "v", type: "vector", label: "v", value: { x: 2.4, y: 1.2 } },
        { id: "max", type: "slider", label: "max length", value: 1, min: 0.2, max: 3 },
      ], args: [{ handle: "v" }, { handle: "max" }] },
      diagnoses: [
        diagnosis("always-scales", "Short vectors must pass through unchanged; only scale when the length exceeds max.", "function limitVector(v, max) { return setMagnitude(v, max); }"),
        diagnosis("clamps-components", "Clamping x and y separately changes the direction; compare the length instead.", "function limitVector(v, max) { return { x: Math.max(-max, Math.min(max, v.x)), y: Math.max(-max, Math.min(max, v.y)) }; }"),
      ],
      hints: ["Compute the length.", "If it is above max, setMagnitude(v, max).", "Otherwise return a copy of v."],
      cases: [
        example([{ x: 3, y: 4 }, 10], { x: 3, y: 4 }, "already short"),
        example([{ x: 3, y: 4 }, 1], { x: 0.6, y: 0.8 }, "capped"),
        example([{ x: 0, y: 0 }, 1], { x: 0, y: 0 }, "zero"),
        example([{ x: -6, y: 8 }, 5], { x: -3, y: 4 }, "capped, negative x"),
      ],
    }),
    puzzle({
      number: 4, id: "dot-product", title: "Dot Product", source: "scalar_projection/sketch.js",
      goal: "Sum the products of matching components.",
      concept: "The dot product measures how much two vectors agree: positive when they point together, zero when perpendicular.",
      functionName: "dot", signature: "dot(a, b) → number",
      starterSource: starter("dot", "a, b"),
      referenceSource: "function dot(a, b) { return a.x * b.x + a.y * b.y; }",
      comparator: "scalar",
      reference: noc("vectors", "dot product"),
      scene: { kind: "nature", view: "binary", handles: [
        { id: "a", type: "vector", label: "a", value: { x: 2.5, y: 1.5 } },
        { id: "b", type: "vector", label: "b", value: { x: 3, y: -0.8 } },
      ], args: [{ handle: "a" }, { handle: "b" }] },
      diagnoses: [
        diagnosis("cross-product", "ax·by − ay·bx is the 2D cross product (a signed area), not the dot product.", "function dot(a, b) { return a.x * b.y - a.y * b.x; }"),
        diagnosis("magnitude-product", "|a|·|b| ignores the angle between them.", "function dot(a, b) { return Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y); }"),
      ],
      hints: ["Multiply x with x and y with y.", "Add the two products.", "That is all."],
      cases: [
        example([{ x: 1, y: 0 }, { x: 0, y: 1 }], 0, "perpendicular"),
        example([{ x: 2, y: 3 }, { x: 4, y: -1 }], 5, "mixed"),
        example([{ x: 1, y: 1 }, { x: 1, y: 1 }], 2, "with itself"),
        example([{ x: -2, y: 0 }, { x: 3, y: 0 }], -6, "opposite"),
      ],
    }),
    puzzle({
      number: 5, id: "angle-between", title: "Angle Between Two Vectors", source: "scalar_projection/sketch.js",
      goal: "Return the unsigned angle in [0, π] from the dot product.",
      concept: "cos θ = a·b / (|a||b|). Clamp the cosine before acos so rounding never produces NaN.",
      functionName: "angleBetween", signature: "angleBetween(a, b) → radians",
      starterSource: starter("angleBetween", "a, b", "acos(dot / (|a|·|b|)), cosine clamped to [−1, 1]."),
      referenceSource: lines(
        "function angleBetween(a, b) {",
        "  var product = Math.sqrt(a.x * a.x + a.y * a.y) * Math.sqrt(b.x * b.x + b.y * b.y);",
        "  var cosine = Math.max(-1, Math.min(1, dot(a, b) / product));",
        "  return Math.acos(cosine);",
        "}"
      ),
      comparator: "scalar", dependencies: ["dot-product"],
      reference: noc("vectors", "angleBetween"),
      scene: { kind: "nature", view: "binary", handles: [
        { id: "a", type: "vector", label: "a", value: { x: 2.5, y: 1.5 } },
        { id: "b", type: "vector", label: "b", value: { x: 3, y: -0.8 } },
      ], args: [{ handle: "a" }, { handle: "b" }] },
      diagnoses: [
        diagnosis("no-normalization", "acos needs a cosine: divide the dot product by both lengths first.", "function angleBetween(a, b) { return Math.acos(dot(a, b)); }"),
        diagnosis("heading-of-b", "That is b's heading from the x axis, not the angle between a and b.", "function angleBetween(a, b) { return Math.atan2(b.y, b.x); }"),
      ],
      hints: ["dot(a, b) divided by |a|·|b| is cos θ.", "Clamp that to [−1, 1].", "Return Math.acos of it."],
      cases: [
        example([{ x: 1, y: 0 }, { x: 0, y: 1 }], PI / 2, "right angle"),
        example([{ x: 1, y: 0 }, { x: 1, y: 1 }], PI / 4, "45°"),
        example([{ x: 1, y: 0 }, { x: -1, y: 0 }], PI, "opposite"),
        example([{ x: 2, y: 0 }, { x: 0, y: -3 }], PI / 2, "unsigned"),
        example([{ x: 1, y: 0 }, { x: 1, y: 0 }], 0, "same direction"),
      ],
    }),
    puzzle({
      number: 6, id: "scalar-projection", title: "Project a onto b", source: "scalar_projection/sketch.js",
      goal: "Return the component of a that lies along b, as a vector.",
      concept: "The red segment in the sketch: a·b̂ tells how far along b, and b̂ times that is the projected vector.",
      functionName: "scalarProjection", signature: "scalarProjection(a, b) → { x, y }",
      starterSource: starter("scalarProjection", "a, b", "b̂ = normalize(b); length = dot(a, b̂); return b̂ scaled by length."),
      referenceSource: lines(
        "function scalarProjection(a, b) {",
        "  var unit = normalize(b);",
        "  var along = dot(a, unit);",
        "  return { x: unit.x * along, y: unit.y * along };",
        "}"
      ),
      comparator: "vector2", dependencies: ["normalize", "dot-product"],
      reference: noc("vectors", "scalar projection"),
      scene: { kind: "nature", view: "binary", handles: [
        { id: "a", type: "vector", label: "a", value: { x: 2.5, y: 1.5 } },
        { id: "b", type: "vector", label: "b", value: { x: 3, y: -0.8 } },
      ], args: [{ handle: "a" }, { handle: "b" }] },
      diagnoses: [
        diagnosis("projects-onto-a", "The result must lie along b; this projects b onto a.", "function scalarProjection(a, b) { var unit = normalize(a); var along = dot(b, unit); return { x: unit.x * along, y: unit.y * along }; }"),
        diagnosis("unnormalized-b", "Scaling the raw b by a·b multiplies in |b|² too; use the unit vector of b for both steps.", "function scalarProjection(a, b) { var along = dot(a, b); return { x: b.x * along, y: b.y * along }; }"),
      ],
      hints: ["Normalize b.", "dot(a, b̂) is the signed length along b.", "Multiply b̂ by that length."],
      cases: [
        example([{ x: 3, y: 4 }, { x: 1, y: 0 }], { x: 3, y: 0 }, "onto the x axis"),
        example([{ x: 3, y: 4 }, { x: 0, y: 2 }], { x: 0, y: 4 }, "onto the y axis"),
        example([{ x: 2, y: 0 }, { x: 1, y: 1 }], { x: 1, y: 1 }, "onto a diagonal"),
        example([{ x: -2, y: 1 }, { x: 0, y: 1 }], { x: 0, y: 1 }, "negative x ignored"),
        example([{ x: 1, y: 1 }, { x: 1, y: 1 }], { x: 1, y: 1 }, "onto itself"),
      ],
    }),
    puzzle({
      number: 7, id: "nearest-point-on-segment", title: "Nearest Point on a Segment", source: "agents/following_path.js",
      goal: "Project p onto the line through a and b, then clamp to the segment.",
      concept: "getNormalVectorOfLineSegment in the sketch, with the proper clamp: t = ((p − a)·(b − a)) / |b − a|² limited to [0, 1].",
      functionName: "nearestPointOnSegment", signature: "nearestPointOnSegment(p, a, b) → { x, y }",
      starterSource: starter("nearestPointOnSegment", "p, a, b", "t = dot(p − a, b − a) / |b − a|², clamped to [0, 1]; return a + t·(b − a)."),
      referenceSource: lines(
        "function nearestPointOnSegment(p, a, b) {",
        "  var ab = { x: b.x - a.x, y: b.y - a.y };",
        "  var squared = ab.x * ab.x + ab.y * ab.y;",
        "  if (squared === 0) return { x: a.x, y: a.y };",
        "  var t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / squared;",
        "  t = Math.max(0, Math.min(1, t));",
        "  return { x: a.x + ab.x * t, y: a.y + ab.y * t };",
        "}"
      ),
      comparator: "vector2",
      reference: noc("autonomous-agents", "path following · getNormalPoint"),
      scene: { kind: "nature", view: "segment", handles: [
        { id: "p", type: "point", label: "p", value: { x: 1, y: 2 } },
        { id: "a", type: "point", label: "a", value: { x: -3, y: -1 } },
        { id: "b", type: "point", label: "b", value: { x: 3, y: 0.5 } },
      ], args: [{ handle: "p" }, { handle: "a" }, { handle: "b" }] },
      diagnoses: [
        diagnosis("no-clamp", "The projection can land beyond the ends; clamp t to [0, 1].", lines(
          "function nearestPointOnSegment(p, a, b) {",
          "  var ab = { x: b.x - a.x, y: b.y - a.y };",
          "  var squared = ab.x * ab.x + ab.y * ab.y;",
          "  if (squared === 0) return { x: a.x, y: a.y };",
          "  var t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / squared;",
          "  return { x: a.x + ab.x * t, y: a.y + ab.y * t };",
          "}"
        )),
        diagnosis("nearest-endpoint", "Only the endpoints were considered; the nearest point is usually in between.", lines(
          "function nearestPointOnSegment(p, a, b) {",
          "  var da = (p.x - a.x) * (p.x - a.x) + (p.y - a.y) * (p.y - a.y);",
          "  var db = (p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y);",
          "  return da <= db ? { x: a.x, y: a.y } : { x: b.x, y: b.y };",
          "}"
        )),
      ],
      hints: ["ab = b − a; ap = p − a.", "t = dot(ap, ab) / dot(ab, ab), then clamp to [0, 1].", "Return a + t·ab (return a when ab is zero)."],
      cases: [
        example([{ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 }], { x: 1, y: 0 }, "drops straight down"),
        example([{ x: 5, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 }], { x: 2, y: 0 }, "clamped to b"),
        example([{ x: -3, y: 2 }, { x: 0, y: 0 }, { x: 2, y: 0 }], { x: 0, y: 0 }, "clamped to a"),
        example([{ x: 0, y: 2 }, { x: 0, y: 0 }, { x: 2, y: 2 }], { x: 1, y: 1 }, "diagonal segment"),
        example([{ x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 0 }], { x: 1, y: 0 }, "degenerate segment"),
      ],
    }),
  ];

  const FORCES = [
    puzzle({
      number: 8, id: "apply-force", title: "Apply a Force", source: "force/mover.js",
      goal: "Accumulate a force into the acceleration, divided by mass.",
      concept: "F = m·a, so a += F / m. Heavier movers respond less to the same push.",
      functionName: "applyForce", signature: "applyForce(acc, force, mass) → { x, y }",
      starterSource: starter("applyForce", "acc, force, mass"),
      referenceSource: "function applyForce(acc, force, mass) { return { x: acc.x + force.x / mass, y: acc.y + force.y / mass }; }",
      comparator: "vector2",
      reference: noc("forces", "applyForce"),
      scene: { kind: "nature", view: "apply-force", handles: [
        { id: "force", type: "vector", label: "force", value: { x: 1.5, y: 1 } },
        { id: "mass", type: "slider", label: "mass", value: 2, min: 0.5, max: 4 },
      ], args: [{ fixture: "accBefore" }, { handle: "force" }, { handle: "mass" }] },
      diagnoses: [
        diagnosis("ignores-mass", "Newton's second law divides by mass; a 4 kg mover accelerates a quarter as much.", "function applyForce(acc, force, mass) { return { x: acc.x + force.x, y: acc.y + force.y }; }"),
        diagnosis("multiplies-mass", "Mass divides the force, it does not multiply it.", "function applyForce(acc, force, mass) { return { x: acc.x + force.x * mass, y: acc.y + force.y * mass }; }"),
      ],
      hints: ["Divide the force by the mass.", "Add the result to the current acceleration.", "Return a new vector; do not modify the input."],
      cases: [
        example([{ x: 0, y: 0 }, { x: 2, y: 0 }, 2], { x: 1, y: 0 }, "half"),
        example([{ x: 0.5, y: 0 }, { x: 0, y: -1 }, 4], { x: 0.5, y: -0.25 }, "accumulates"),
        example([{ x: 1, y: 1 }, { x: -3, y: 3 }, 1], { x: -2, y: 4 }, "unit mass"),
        example([{ x: 0, y: 0 }, { x: 0, y: 0 }, 5], { x: 0, y: 0 }, "no force"),
      ],
    }),
    puzzle({
      number: 9, id: "step-mover", title: "One Frame of Motion", source: "force/mover.js",
      goal: "Euler step: velocity += acceleration (capped at maxSpeed), position += velocity, acceleration cleared.",
      concept: "The update() every mover and vehicle shares. Clearing acc is what makes forces per-frame instead of permanent.",
      functionName: "stepMover", signature: "stepMover(mover, maxSpeed) → { pos, vel, acc }",
      starterSource: starter("stepMover", "mover, maxSpeed", "mover has pos, vel, acc. Return new objects."),
      referenceSource: lines(
        "function stepMover(mover, maxSpeed) {",
        "  var vel = limitVector({ x: mover.vel.x + mover.acc.x, y: mover.vel.y + mover.acc.y }, maxSpeed);",
        "  return { pos: { x: mover.pos.x + vel.x, y: mover.pos.y + vel.y }, vel: vel, acc: { x: 0, y: 0 } };",
        "}"
      ),
      comparator: "deep", dependencies: ["limit-vector"],
      reference: noc("forces", "update"),
      scene: { kind: "nature", view: "step", handles: [
        { id: "agent", type: "pose", label: "mover (heading = velocity direction)", value: { x: -2, y: 1, yaw: 0.3 } },
        { id: "speed", type: "slider", label: "speed", value: 1, min: 0, max: 2 },
        { id: "maxSpeed", type: "slider", label: "max speed", value: 1.2, min: 0.2, max: 2 },
      ], args: [{ fixture: "mover" }, { handle: "maxSpeed" }] },
      diagnoses: [
        diagnosis("position-before-velocity", "Position moved with the old velocity; add the acceleration first, then move.", lines(
          "function stepMover(mover, maxSpeed) {",
          "  var pos = { x: mover.pos.x + mover.vel.x, y: mover.pos.y + mover.vel.y };",
          "  var vel = limitVector({ x: mover.vel.x + mover.acc.x, y: mover.vel.y + mover.acc.y }, maxSpeed);",
          "  return { pos: pos, vel: vel, acc: { x: 0, y: 0 } };",
          "}"
        )),
        diagnosis("acceleration-kept", "Acceleration must reset to zero each frame, or forces accumulate forever.", lines(
          "function stepMover(mover, maxSpeed) {",
          "  var vel = limitVector({ x: mover.vel.x + mover.acc.x, y: mover.vel.y + mover.acc.y }, maxSpeed);",
          "  return { pos: { x: mover.pos.x + vel.x, y: mover.pos.y + vel.y }, vel: vel, acc: { x: mover.acc.x, y: mover.acc.y } };",
          "}"
        )),
      ],
      hints: ["vel = limitVector(vel + acc, maxSpeed).", "pos = pos + the new vel.", "acc becomes { x: 0, y: 0 }."],
      cases: [
        example([{ pos: { x: 0, y: 0 }, vel: { x: 1, y: 0 }, acc: { x: 0, y: 1 } }, 10], { pos: { x: 1, y: 1 }, vel: { x: 1, y: 1 }, acc: { x: 0, y: 0 } }, "accelerates upward"),
        example([{ pos: { x: 2, y: 2 }, vel: { x: 3, y: 0 }, acc: { x: 1, y: 0 } }, 2], { pos: { x: 4, y: 2 }, vel: { x: 2, y: 0 }, acc: { x: 0, y: 0 } }, "speed capped"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 } }, 5], { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 } }, "at rest"),
        example([{ pos: { x: 1, y: -1 }, vel: { x: 0, y: 1 }, acc: { x: 0, y: -2 } }, 5], { pos: { x: 1, y: -2 }, vel: { x: 0, y: -1 }, acc: { x: 0, y: 0 } }, "reverses"),
      ],
    }),
    puzzle({
      number: 10, id: "friction-force", title: "Friction", source: "force/mover.js",
      goal: "A force of size μ·N pointing against the velocity.",
      concept: "Friction does not care how fast you go, only which way: unit velocity, flipped, scaled by μN.",
      functionName: "frictionForce", signature: "frictionForce(vel, mu, normal) → { x, y }",
      starterSource: starter("frictionForce", "vel, mu, normal"),
      referenceSource: "function frictionForce(vel, mu, normal) { var unit = normalize(vel); return { x: -unit.x * mu * normal, y: -unit.y * mu * normal }; }",
      comparator: "vector2", dependencies: ["normalize"],
      reference: noc("forces", "friction"),
      scene: { kind: "nature", view: "friction", handles: [
        { id: "vel", type: "vector", label: "velocity", value: { x: 2, y: 1 } },
        { id: "mu", type: "slider", label: "μ", value: 0.3, min: 0, max: 1 },
      ], args: [{ handle: "vel" }, { handle: "mu" }, 2] },
      diagnoses: [
        diagnosis("wrong-direction", "Friction opposes motion; the sign is negative.", "function frictionForce(vel, mu, normal) { var unit = normalize(vel); return { x: unit.x * mu * normal, y: unit.y * mu * normal }; }"),
        diagnosis("scaled-by-speed", "Friction's size is μ·N regardless of speed; normalize the velocity first.", "function frictionForce(vel, mu, normal) { return { x: -vel.x * mu * normal, y: -vel.y * mu * normal }; }"),
      ],
      hints: ["Normalize the velocity.", "Multiply by −1.", "Scale by μ·N."],
      cases: [
        example([{ x: 3, y: 0 }, 0.1, 10], { x: -1, y: 0 }, "sliding right"),
        example([{ x: 0, y: -2 }, 0.5, 4], { x: 0, y: 2 }, "sliding down"),
        example([{ x: 3, y: 4 }, 0.2, 5], { x: -0.6, y: -0.8 }, "diagonal"),
        example([{ x: 0, y: 0 }, 0.3, 9], { x: 0, y: 0 }, "at rest"),
      ],
    }),
    puzzle({
      number: 11, id: "drag-force", title: "Fluid Drag", source: "force/mover.js",
      goal: "A force of size c·|v|² pointing against the velocity.",
      concept: "Drag grows with the square of speed, which is why falling movers settle at a terminal velocity.",
      functionName: "dragForce", signature: "dragForce(vel, c) → { x, y }",
      starterSource: starter("dragForce", "vel, c"),
      referenceSource: lines(
        "function dragForce(vel, c) {",
        "  var speedSquared = vel.x * vel.x + vel.y * vel.y;",
        "  var unit = normalize(vel);",
        "  return { x: -unit.x * c * speedSquared, y: -unit.y * c * speedSquared };",
        "}"
      ),
      comparator: "vector2", dependencies: ["normalize"],
      reference: noc("forces", "drag"),
      scene: { kind: "nature", view: "drag", handles: [
        { id: "vel", type: "vector", label: "velocity", value: { x: 2, y: 1 } },
        { id: "c", type: "slider", label: "drag coefficient c", value: 0.3, min: 0, max: 1 },
      ], args: [{ handle: "vel" }, { handle: "c" }] },
      diagnoses: [
        diagnosis("linear-in-speed", "Drag scales with speed squared, not speed.", "function dragForce(vel, c) { var speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y); var unit = normalize(vel); return { x: -unit.x * c * speed, y: -unit.y * c * speed }; }"),
        diagnosis("wrong-direction", "Drag opposes motion; the sign is negative.", "function dragForce(vel, c) { var speedSquared = vel.x * vel.x + vel.y * vel.y; var unit = normalize(vel); return { x: unit.x * c * speedSquared, y: unit.y * c * speedSquared }; }"),
      ],
      hints: ["|v|² is x² + y², no square root needed.", "Direction is −normalize(v).", "Scale by c·|v|²."],
      cases: [
        example([{ x: 2, y: 0 }, 0.5], { x: -2, y: 0 }, "speed 2"),
        example([{ x: 0, y: 3 }, 1], { x: 0, y: -9 }, "speed 3"),
        example([{ x: 3, y: 4 }, 0.1], { x: -1.5, y: -2 }, "diagonal"),
        example([{ x: 0, y: 0 }, 1], { x: 0, y: 0 }, "at rest"),
      ],
    }),
    puzzle({
      number: 12, id: "gravitational-attraction", title: "Gravitational Attraction", source: "force/attractor.js",
      goal: "Pull the mover toward the attractor with G·m₁·m₂ / d², with the distance clamped to a range.",
      concept: "The clamp is the trick that keeps the sketch stable: too close would explode, too far would never move.",
      functionName: "gravitationalAttraction", signature: "gravitationalAttraction(attractor, mover, G, minDistance, maxDistance) → { x, y }",
      starterSource: starter("gravitationalAttraction", "attractor, mover, G, minDistance, maxDistance", "attractor and mover have pos and mass. Clamp d² to [min², max²]."),
      referenceSource: lines(
        "function gravitationalAttraction(attractor, mover, G, minDistance, maxDistance) {",
        "  var direction = { x: attractor.pos.x - mover.pos.x, y: attractor.pos.y - mover.pos.y };",
        "  var squared = direction.x * direction.x + direction.y * direction.y;",
        "  squared = Math.max(minDistance * minDistance, Math.min(maxDistance * maxDistance, squared));",
        "  var strength = G * attractor.mass * mover.mass / squared;",
        "  return setMagnitude(direction, strength);",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude"],
      reference: noc("forces", "gravitational attraction"),
      scene: { kind: "nature", view: "attract", handles: [
        { id: "attractor", type: "point", label: "attractor", value: { x: 1.5, y: 0.5 } },
        { id: "mover", type: "point", label: "mover", value: { x: -2, y: -1 } },
      ], args: [{ fixture: "attractor" }, { fixture: "moverBody" }, 1, 1, 4] },
      diagnoses: [
        diagnosis("no-distance-clamp", "Without the clamp the force explodes up close and vanishes far away.", lines(
          "function gravitationalAttraction(attractor, mover, G, minDistance, maxDistance) {",
          "  var direction = { x: attractor.pos.x - mover.pos.x, y: attractor.pos.y - mover.pos.y };",
          "  var squared = direction.x * direction.x + direction.y * direction.y;",
          "  var strength = G * attractor.mass * mover.mass / squared;",
          "  return setMagnitude(direction, strength);",
          "}"
        )),
        diagnosis("inverse-distance", "Gravity falls off with distance squared, not distance.", lines(
          "function gravitationalAttraction(attractor, mover, G, minDistance, maxDistance) {",
          "  var direction = { x: attractor.pos.x - mover.pos.x, y: attractor.pos.y - mover.pos.y };",
          "  var distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);",
          "  distance = Math.max(minDistance, Math.min(maxDistance, distance));",
          "  var strength = G * attractor.mass * mover.mass / distance;",
          "  return setMagnitude(direction, strength);",
          "}"
        )),
      ],
      hints: ["direction = attractor.pos − mover.pos.", "Clamp |direction|² between min² and max².", "strength = G·m₁·m₂ / d²; return setMagnitude(direction, strength)."],
      cases: [
        example([{ pos: { x: 2, y: 0 }, mass: 10 }, { pos: { x: 0, y: 0 }, mass: 1 }, 1, 1, 10], { x: 2.5, y: 0 }, "two units apart"),
        example([{ pos: { x: 0, y: 0 }, mass: 4 }, { pos: { x: 0, y: 3 }, mass: 2 }, 2, 1, 10], { x: 0, y: -16 / 9 }, "pulls down"),
        example([{ pos: { x: 0.1, y: 0 }, mass: 5 }, { pos: { x: 0, y: 0 }, mass: 1 }, 1, 1, 5], { x: 5, y: 0 }, "too close, clamped"),
        example([{ pos: { x: 20, y: 0 }, mass: 5 }, { pos: { x: 0, y: 0 }, mass: 1 }, 1, 1, 5], { x: 0.2, y: 0 }, "too far, clamped"),
      ],
    }),
    puzzle({
      number: 13, id: "wrap-edges", title: "Wrap Around the Edges", source: "force/mover.js",
      goal: "Teleport a position that left the box (by more than its radius) to the opposite side.",
      concept: "edges() in every sketch: the world is a torus, and the radius margin lets the body fully disappear before reappearing.",
      functionName: "wrapEdges", signature: "wrapEdges(pos, radius, width, height) → { x, y }",
      starterSource: starter("wrapEdges", "pos, radius, width, height", "x > width + r → −r; x < −r → width + r; same for y."),
      referenceSource: lines(
        "function wrapEdges(pos, radius, width, height) {",
        "  var x = pos.x, y = pos.y;",
        "  if (x > width + radius) x = -radius;",
        "  else if (x < -radius) x = width + radius;",
        "  if (y > height + radius) y = -radius;",
        "  else if (y < -radius) y = height + radius;",
        "  return { x: x, y: y };",
        "}"
      ),
      comparator: "vector2",
      reference: noc("forces", "edges"),
      scene: { kind: "nature", view: "wrap", handles: [{ id: "pos", type: "point", label: "position", value: { x: 4.3, y: 1 } }], args: [{ fixture: "boxPos" }, 0.5, 8, 5] },
      diagnoses: [
        diagnosis("clamps", "Clamping stops the body at the wall; wrapping moves it to the opposite side.", "function wrapEdges(pos, radius, width, height) { return { x: Math.max(-radius, Math.min(width + radius, pos.x)), y: Math.max(-radius, Math.min(height + radius, pos.y)) }; }"),
        diagnosis("wraps-at-zero", "The margin matters: wrap only past width + radius, and reappear at −radius.", lines(
          "function wrapEdges(pos, radius, width, height) {",
          "  var x = pos.x, y = pos.y;",
          "  if (x > width) x = 0;",
          "  else if (x < 0) x = width;",
          "  if (y > height) y = 0;",
          "  else if (y < 0) y = height;",
          "  return { x: x, y: y };",
          "}"
        )),
      ],
      hints: ["Check x against width + radius and −radius.", "Do the same for y with height.", "Return a new point."],
      cases: [
        example([{ x: 9.5, y: 2 }, 1, 8, 5], { x: -1, y: 2 }, "off the right"),
        example([{ x: -2, y: 3 }, 1, 8, 5], { x: 9, y: 3 }, "off the left"),
        example([{ x: 4, y: 6.5 }, 1, 8, 5], { x: 4, y: -1 }, "off the top"),
        example([{ x: 4, y: 2 }, 1, 8, 5], { x: 4, y: 2 }, "inside"),
        example([{ x: 8.5, y: 2 }, 1, 8, 5], { x: 8.5, y: 2 }, "inside the margin"),
      ],
    }),
  ];

  const STEERING = [
    puzzle({
      number: 14, id: "seek", title: "Seek", source: "agents/vehicle.js",
      goal: "Steer toward a target: desired velocity at max speed, minus the current velocity, limited.",
      concept: "Reynolds' formula. Steering is a correction to velocity, never the velocity itself.",
      functionName: "seek", signature: "seek(agent, target, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("seek", "agent, target, maxSpeed, maxForce", "agent has pos and vel; target is a point."),
      referenceSource: lines(
        "function seek(agent, target, maxSpeed, maxForce) {",
        "  var desired = setMagnitude({ x: target.x - agent.pos.x, y: target.y - agent.pos.y }, maxSpeed);",
        "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude", "limit-vector"],
      reference: noc("autonomous-agents", "seek"),
      scene: { kind: "nature", view: "steer", handles: AGENT_HANDLES.concat([{ id: "target", type: "point", label: "target", value: { x: 2.5, y: 1.2 } }]), args: [{ fixture: "agent" }, { handle: "target" }].concat(STEER) },
      diagnoses: [
        diagnosis("desired-not-scaled", "The desired velocity must be set to max speed; a far target would otherwise produce a huge force.", lines(
          "function seek(agent, target, maxSpeed, maxForce) {",
          "  var desired = { x: target.x - agent.pos.x, y: target.y - agent.pos.y };",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
        diagnosis("no-velocity-subtraction", "Steering = desired − velocity; without the subtraction the agent keeps accelerating when it is already on course.", lines(
          "function seek(agent, target, maxSpeed, maxForce) {",
          "  var desired = setMagnitude({ x: target.x - agent.pos.x, y: target.y - agent.pos.y }, maxSpeed);",
          "  return limitVector(desired, maxForce);",
          "}"
        )),
      ],
      hints: ["desired = target − pos, set to maxSpeed.", "steering = desired − vel.", "Limit the steering to maxForce."],
      cases: [
        example([AT_REST, { x: 10, y: 0 }, 2, 1], { x: 1, y: 0 }, "from rest"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, { x: 10, y: 0 }, 2, 1], { x: 0, y: 0 }, "already on course"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 0, y: 2 } }, { x: 10, y: 0 }, 2, 10], { x: 2, y: -2 }, "turning"),
        example([{ pos: { x: 1, y: 1 }, vel: { x: 0, y: 0 } }, { x: 1, y: 1 }, 2, 1], { x: 0, y: 0 }, "at the target"),
      ],
    }),
    puzzle({
      number: 15, id: "flee", title: "Flee", source: "agents/vehicle.js",
      goal: "The opposite of seek.",
      concept: "Fleeing is seeking with the steering negated, which is exactly how the sketch writes it.",
      functionName: "flee", signature: "flee(agent, target, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("flee", "agent, target, maxSpeed, maxForce"),
      referenceSource: "function flee(agent, target, maxSpeed, maxForce) { var steering = seek(agent, target, maxSpeed, maxForce); return { x: -steering.x, y: -steering.y }; }",
      comparator: "vector2", dependencies: ["seek"],
      reference: noc("autonomous-agents", "flee"),
      scene: { kind: "nature", view: "steer", handles: AGENT_HANDLES.concat([{ id: "target", type: "point", label: "threat", value: { x: 2.5, y: 1.2 } }]), args: [{ fixture: "agent" }, { handle: "target" }].concat(STEER) },
      diagnoses: [
        diagnosis("not-negated", "That still seeks; multiply the steering by −1.", "function flee(agent, target, maxSpeed, maxForce) { return seek(agent, target, maxSpeed, maxForce); }"),
        diagnosis("negates-target", "Negating the target point is not the same as negating the steering.", "function flee(agent, target, maxSpeed, maxForce) { return seek(agent, { x: -target.x, y: -target.y }, maxSpeed, maxForce); }"),
      ],
      hints: ["Call seek.", "Negate both components.", "Return the negated vector."],
      cases: [
        example([AT_REST, { x: 10, y: 0 }, 2, 1], { x: -1, y: 0 }, "from rest"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 0, y: 2 } }, { x: 10, y: 0 }, 2, 10], { x: -2, y: 2 }, "turning away"),
        example([{ pos: { x: 3, y: 0 }, vel: { x: 0, y: 0 } }, { x: 0, y: 0 }, 1, 1], { x: 1, y: 0 }, "threat behind"),
      ],
    }),
    puzzle({
      number: 16, id: "arrive", title: "Arrive", source: "agents/vehicle.js",
      goal: "Seek, but scale the desired speed down inside the slow radius so the agent stops on the target.",
      concept: "map(distance, 0, slowRadius, 0, maxSpeed) turns overshooting into a smooth stop.",
      functionName: "arrive", signature: "arrive(agent, target, maxSpeed, maxForce, slowRadius) → { x, y }",
      starterSource: starter("arrive", "agent, target, maxSpeed, maxForce, slowRadius"),
      referenceSource: lines(
        "function arrive(agent, target, maxSpeed, maxForce, slowRadius) {",
        "  var offset = { x: target.x - agent.pos.x, y: target.y - agent.pos.y };",
        "  var distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);",
        "  var speed = distance < slowRadius ? distance / slowRadius * maxSpeed : maxSpeed;",
        "  var desired = setMagnitude(offset, speed);",
        "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude", "limit-vector"],
      reference: noc("autonomous-agents", "arrive"),
      scene: { kind: "nature", view: "steer", handles: AGENT_HANDLES.concat([{ id: "target", type: "point", label: "target", value: { x: 2.5, y: 1.2 } }]), args: [{ fixture: "agent" }, { handle: "target" }].concat(STEER, [2]) },
      diagnoses: [
        diagnosis("never-slows", "Inside the slow radius the desired speed must shrink with distance.", lines(
          "function arrive(agent, target, maxSpeed, maxForce, slowRadius) {",
          "  var desired = setMagnitude({ x: target.x - agent.pos.x, y: target.y - agent.pos.y }, maxSpeed);",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
        diagnosis("slows-everywhere", "Outside the slow radius the desired speed is max speed, not distance / slowRadius · maxSpeed.", lines(
          "function arrive(agent, target, maxSpeed, maxForce, slowRadius) {",
          "  var offset = { x: target.x - agent.pos.x, y: target.y - agent.pos.y };",
          "  var distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);",
          "  var desired = setMagnitude(offset, distance / slowRadius * maxSpeed);",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
      ],
      hints: ["Measure the distance to the target.", "speed = distance < slowRadius ? distance / slowRadius · maxSpeed : maxSpeed.", "Then it is seek with that speed."],
      cases: [
        example([AT_REST, { x: 10, y: 0 }, 2, 10, 4], { x: 2, y: 0 }, "far away"),
        example([AT_REST, { x: 2, y: 0 }, 2, 10, 4], { x: 1, y: 0 }, "halfway in"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, { x: 1, y: 0 }, 2, 10, 4], { x: -1.5, y: 0 }, "braking"),
        example([AT_REST, { x: 0, y: 3 }, 3, 1, 6], { x: 0, y: 1 }, "force limited"),
      ],
    }),
    puzzle({
      number: 17, id: "pursue", title: "Pursue", source: "agents/vehicle.js",
      goal: "Seek where the target will be, not where it is.",
      concept: "Prediction is target.pos + target.vel × lookAhead. Evade is this with the steering negated.",
      functionName: "pursue", signature: "pursue(agent, target, lookAhead, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("pursue", "agent, target, lookAhead, maxSpeed, maxForce", "target has pos and vel."),
      referenceSource: lines(
        "function pursue(agent, target, lookAhead, maxSpeed, maxForce) {",
        "  var predicted = { x: target.pos.x + target.vel.x * lookAhead, y: target.pos.y + target.vel.y * lookAhead };",
        "  return seek(agent, predicted, maxSpeed, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["seek"],
      reference: noc("autonomous-agents", "pursue"),
      scene: { kind: "nature", view: "steer", handles: AGENT_HANDLES.concat([
        { id: "target", type: "pose", label: "target (heading = its velocity)", value: { x: 2, y: 1, yaw: 2 } },
        { id: "targetSpeed", type: "slider", label: "target speed", value: 0.8, min: 0, max: 2 },
      ]), args: [{ fixture: "agent" }, { fixture: "target" }, 2].concat(STEER) },
      diagnoses: [
        diagnosis("no-prediction", "That seeks the target's current position; add its velocity times the look-ahead.", "function pursue(agent, target, lookAhead, maxSpeed, maxForce) { return seek(agent, target.pos, maxSpeed, maxForce); }"),
        diagnosis("predicts-with-own-velocity", "The prediction uses the target's velocity, not the pursuer's.", lines(
          "function pursue(agent, target, lookAhead, maxSpeed, maxForce) {",
          "  var predicted = { x: target.pos.x + agent.vel.x * lookAhead, y: target.pos.y + agent.vel.y * lookAhead };",
          "  return seek(agent, predicted, maxSpeed, maxForce);",
          "}"
        )),
      ],
      hints: ["predicted = target.pos + target.vel · lookAhead.", "seek that point.", "Same maxSpeed and maxForce."],
      cases: [
        example([AT_REST, { pos: { x: 0, y: 10 }, vel: { x: 1, y: 0 } }, 10, 2, 10], { x: Math.SQRT2, y: Math.SQRT2 }, "leads the target"),
        example([AT_REST, { pos: { x: 5, y: 0 }, vel: { x: 0, y: 0 } }, 10, 2, 1], { x: 1, y: 0 }, "stationary target"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 1, y: 0 } }, { pos: { x: 0, y: 5 }, vel: { x: 0, y: 0 } }, 3, 1, 10], { x: -1, y: 1 }, "turning toward it"),
        example([AT_REST, { pos: { x: 2, y: 0 }, vel: { x: -1, y: 0 } }, 2, 1, 1], { x: 0, y: 0 }, "target will arrive on its own"),
      ],
    }),
    puzzle({
      number: 18, id: "wander-target", title: "Wander Target", source: "agents/vehicle.js",
      goal: "A point on a circle placed ahead of the agent, at angle theta.",
      concept: "Wandering is seeking a target that drifts around a circle in front of you; noise moves theta a little each frame.",
      functionName: "wanderTarget", signature: "wanderTarget(agent, distance, radius, theta) → { x, y }",
      starterSource: starter("wanderTarget", "agent, distance, radius, theta", "centre = pos + normalize(vel)·distance; target = centre + radius·(cos θ, sin θ)."),
      referenceSource: lines(
        "function wanderTarget(agent, distance, radius, theta) {",
        "  var heading = normalize(agent.vel);",
        "  var centre = { x: agent.pos.x + heading.x * distance, y: agent.pos.y + heading.y * distance };",
        "  return { x: centre.x + radius * Math.cos(theta), y: centre.y + radius * Math.sin(theta) };",
        "}"
      ),
      comparator: "vector2", dependencies: ["normalize"],
      reference: noc("autonomous-agents", "wander"),
      scene: { kind: "nature", view: "wander", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: -1, y: 0, yaw: 0.2 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
        { id: "theta", type: "dial", label: "θ on the wander circle", value: 1, center: { x: 4.2, y: 2.3 }, radius: 0.8 },
      ], args: [{ fixture: "agent" }, 2, 1, { handle: "theta" }] },
      diagnoses: [
        diagnosis("circle-at-position", "The circle sits ahead of the agent, not on it; add normalize(vel)·distance first.", "function wanderTarget(agent, distance, radius, theta) { return { x: agent.pos.x + radius * Math.cos(theta), y: agent.pos.y + radius * Math.sin(theta) }; }"),
        diagnosis("unnormalized-heading", "The circle centre is a fixed distance ahead, so normalize the velocity before scaling.", lines(
          "function wanderTarget(agent, distance, radius, theta) {",
          "  var centre = { x: agent.pos.x + agent.vel.x * distance, y: agent.pos.y + agent.vel.y * distance };",
          "  return { x: centre.x + radius * Math.cos(theta), y: centre.y + radius * Math.sin(theta) };",
          "}"
        )),
      ],
      hints: ["Unit heading = normalize(vel).", "centre = pos + heading · distance.", "target = centre + radius · (cos θ, sin θ)."],
      cases: [
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, 3, 1, 0], { x: 4, y: 0 }, "straight ahead"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 0, y: 5 } }, 2, 1, PI / 2], { x: 0, y: 3 }, "heading up"),
        example([{ pos: { x: 1, y: 1 }, vel: { x: 1, y: 0 } }, 1, 2, PI], { x: 0, y: 1 }, "θ = π points back"),
        example([AT_REST, 3, 1, 0], { x: 1, y: 0 }, "no velocity"),
      ],
    }),
    puzzle({
      number: 19, id: "flow-field-lookup", title: "Flow Field Lookup", source: "agents/flow_field.js",
      goal: "Find the cell under a position and return a copy of its vector, clamping to the grid.",
      concept: "index = row · cols + col. The clamp keeps agents near the border from reading outside the array.",
      functionName: "flowFieldLookup", signature: "flowFieldLookup(field, cols, rows, resolution, pos) → { x, y }",
      starterSource: starter("flowFieldLookup", "field, cols, rows, resolution, pos", "col = floor(constrain(pos.x / resolution, 0, cols − 1)); same for row."),
      referenceSource: lines(
        "function flowFieldLookup(field, cols, rows, resolution, pos) {",
        "  var col = Math.floor(Math.max(0, Math.min(cols - 1, pos.x / resolution)));",
        "  var row = Math.floor(Math.max(0, Math.min(rows - 1, pos.y / resolution)));",
        "  var cell = field[row * cols + col];",
        "  return { x: cell.x, y: cell.y };",
        "}"
      ),
      comparator: "vector2",
      reference: noc("autonomous-agents", "flow field · lookup"),
      scene: { kind: "nature", view: "field", handles: [{ id: "pos", type: "point", label: "position", value: { x: 0.5, y: 0.5 } }], args: [{ fixture: "field" }, 6, 4, 1, { fixture: "fieldPos" }] },
      diagnoses: [
        diagnosis("no-clamp", "Positions past the edge index outside the array; clamp col and row.", lines(
          "function flowFieldLookup(field, cols, rows, resolution, pos) {",
          "  var col = Math.floor(pos.x / resolution);",
          "  var row = Math.floor(pos.y / resolution);",
          "  var cell = field[row * cols + col];",
          "  return cell ? { x: cell.x, y: cell.y } : null;",
          "}"
        )),
        diagnosis("row-col-swapped", "The field is stored row-major: index = row · cols + col.", lines(
          "function flowFieldLookup(field, cols, rows, resolution, pos) {",
          "  var col = Math.floor(Math.max(0, Math.min(cols - 1, pos.x / resolution)));",
          "  var row = Math.floor(Math.max(0, Math.min(rows - 1, pos.y / resolution)));",
          "  var cell = field[col * rows + row];",
          "  return { x: cell.x, y: cell.y };",
          "}"
        )),
      ],
      hints: ["Divide the position by the resolution and floor it.", "Clamp col to [0, cols − 1] and row to [0, rows − 1].", "Read field[row · cols + col] and return a copy."],
      cases: [
        example([[{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }], 2, 2, 10, { x: 5, y: 5 }], { x: 1, y: 0 }, "first cell"),
        example([[{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }], 2, 2, 10, { x: 15, y: 5 }], { x: 0, y: 1 }, "second column"),
        example([[{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }], 2, 2, 10, { x: 5, y: 15 }], { x: -1, y: 0 }, "second row"),
        example([[{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }], 2, 2, 10, { x: 100, y: 100 }], { x: 0, y: -1 }, "clamped to the last cell"),
        example([[{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }], 2, 2, 10, { x: -5, y: -5 }], { x: 1, y: 0 }, "clamped to the first cell"),
      ],
    }),
    puzzle({
      number: 20, id: "follow-field", title: "Follow the Field", source: "agents/vehicle.js",
      goal: "Steer toward the field's direction at max speed.",
      concept: "Same shape as seek, but the desired direction comes from the grid instead of a target point.",
      functionName: "followField", signature: "followField(agent, fieldVector, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("followField", "agent, fieldVector, maxSpeed, maxForce"),
      referenceSource: lines(
        "function followField(agent, fieldVector, maxSpeed, maxForce) {",
        "  var desired = setMagnitude(fieldVector, maxSpeed);",
        "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude", "limit-vector"],
      reference: noc("autonomous-agents", "flow field · follow"),
      scene: { kind: "nature", view: "follow-field", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: 0.5, y: 0.5, yaw: 2.5 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
      ], args: [{ fixture: "agent" }, { fixture: "fieldAtAgent" }].concat(STEER) },
      diagnoses: [
        diagnosis("no-velocity-subtraction", "Steering = desired − velocity.", "function followField(agent, fieldVector, maxSpeed, maxForce) { return limitVector(setMagnitude(fieldVector, maxSpeed), maxForce); }"),
        diagnosis("field-not-scaled", "The field vector is a direction; set its magnitude to max speed before subtracting the velocity.", "function followField(agent, fieldVector, maxSpeed, maxForce) { return limitVector({ x: fieldVector.x - agent.vel.x, y: fieldVector.y - agent.vel.y }, maxForce); }"),
      ],
      hints: ["desired = setMagnitude(fieldVector, maxSpeed).", "steering = desired − vel.", "Limit to maxForce."],
      cases: [
        example([AT_REST, { x: 1, y: 0 }, 2, 1], { x: 1, y: 0 }, "from rest"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, { x: 1, y: 0 }, 2, 1], { x: 0, y: 0 }, "already aligned"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 0, y: 1 } }, { x: 1, y: 0 }, 1, 10], { x: 1, y: -1 }, "turning"),
        example([AT_REST, { x: 3, y: 0 }, 1, 10], { x: 1, y: 0 }, "long field vector"),
        example([AT_REST, { x: 0, y: 0 }, 2, 1], { x: 0, y: 0 }, "empty cell"),
      ],
    }),
    puzzle({
      number: 21, id: "path-target", title: "Path Following Target", source: "agents/following_path.js",
      goal: "Predict a point ahead, find its nearest point on the path, and place the target a little further along that segment.",
      concept: "The sketch's pursue(path): future position → normal point on the closest segment → target = normal + direction × aheadDistance.",
      functionName: "pathTarget", signature: "pathTarget(agent, points, lookAhead, aheadDistance) → { future, normal, target }",
      starterSource: starter("pathTarget", "agent, points, lookAhead, aheadDistance", "future = pos + normalize(vel)·lookAhead; for each segment use nearestPointOnSegment; keep the closest."),
      referenceSource: lines(
        "function pathTarget(agent, points, lookAhead, aheadDistance) {",
        "  var heading = normalize(agent.vel);",
        "  var future = { x: agent.pos.x + heading.x * lookAhead, y: agent.pos.y + heading.y * lookAhead };",
        "  var best = null, bestDistance = Infinity, target = null;",
        "  for (var i = 0; i < points.length - 1; i += 1) {",
        "    var a = points[i], b = points[i + 1];",
        "    var normal = nearestPointOnSegment(future, a, b);",
        "    var distance = Math.sqrt((future.x - normal.x) * (future.x - normal.x) + (future.y - normal.y) * (future.y - normal.y));",
        "    if (distance < bestDistance) {",
        "      bestDistance = distance;",
        "      best = normal;",
        "      var direction = normalize({ x: b.x - a.x, y: b.y - a.y });",
        "      target = { x: normal.x + direction.x * aheadDistance, y: normal.y + direction.y * aheadDistance };",
        "    }",
        "  }",
        "  return { future: future, normal: best, target: target };",
        "}"
      ),
      comparator: "deep", dependencies: ["normalize", "nearest-point-on-segment"],
      reference: noc("autonomous-agents", "path following"),
      scene: { kind: "nature", view: "path", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: -1, y: -1.5, yaw: 0.5 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
      ], args: [{ fixture: "agent" }, { fixture: "path" }, 1.5, 0.6] },
      diagnoses: [
        diagnosis("nearest-vertex", "The normal point lies on a segment, not on a vertex; project onto each segment.", lines(
          "function pathTarget(agent, points, lookAhead, aheadDistance) {",
          "  var heading = normalize(agent.vel);",
          "  var future = { x: agent.pos.x + heading.x * lookAhead, y: agent.pos.y + heading.y * lookAhead };",
          "  var best = null, bestDistance = Infinity, target = null;",
          "  for (var i = 0; i < points.length - 1; i += 1) {",
          "    var a = points[i], b = points[i + 1];",
          "    var distance = Math.sqrt((future.x - a.x) * (future.x - a.x) + (future.y - a.y) * (future.y - a.y));",
          "    if (distance < bestDistance) {",
          "      bestDistance = distance;",
          "      best = { x: a.x, y: a.y };",
          "      var direction = normalize({ x: b.x - a.x, y: b.y - a.y });",
          "      target = { x: a.x + direction.x * aheadDistance, y: a.y + direction.y * aheadDistance };",
          "    }",
          "  }",
          "  return { future: future, normal: best, target: target };",
          "}"
        )),
        diagnosis("no-lookahead", "Project the predicted future position, not the current one; that is what keeps the motion smooth.", lines(
          "function pathTarget(agent, points, lookAhead, aheadDistance) {",
          "  var future = { x: agent.pos.x, y: agent.pos.y };",
          "  var best = null, bestDistance = Infinity, target = null;",
          "  for (var i = 0; i < points.length - 1; i += 1) {",
          "    var a = points[i], b = points[i + 1];",
          "    var normal = nearestPointOnSegment(future, a, b);",
          "    var distance = Math.sqrt((future.x - normal.x) * (future.x - normal.x) + (future.y - normal.y) * (future.y - normal.y));",
          "    if (distance < bestDistance) {",
          "      bestDistance = distance;",
          "      best = normal;",
          "      var direction = normalize({ x: b.x - a.x, y: b.y - a.y });",
          "      target = { x: normal.x + direction.x * aheadDistance, y: normal.y + direction.y * aheadDistance };",
          "    }",
          "  }",
          "  return { future: future, normal: best, target: target };",
          "}"
        )),
      ],
      hints: ["future = pos + normalize(vel) · lookAhead.", "For every consecutive pair of points, nearestPointOnSegment(future, a, b); keep the closest.", "target = normal + normalize(b − a) · aheadDistance."],
      cases: [
        example([{ pos: { x: 2, y: 3 }, vel: { x: 1, y: 0 } }, [{ x: 0, y: 0 }, { x: 10, y: 0 }], 2, 1], { future: { x: 4, y: 3 }, normal: { x: 4, y: 0 }, target: { x: 5, y: 0 } }, "one segment"),
        example([{ pos: { x: 12, y: 2 }, vel: { x: 0, y: 1 } }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2, 1], { future: { x: 12, y: 4 }, normal: { x: 10, y: 4 }, target: { x: 10, y: 5 } }, "picks the second segment"),
        example([{ pos: { x: 8, y: 0 }, vel: { x: 1, y: 0 } }, [{ x: 0, y: 0 }, { x: 4, y: 0 }], 1, 1], { future: { x: 9, y: 0 }, normal: { x: 4, y: 0 }, target: { x: 5, y: 0 } }, "past the end"),
        example([{ pos: { x: 2, y: 1 }, vel: { x: 0, y: 0 } }, [{ x: 0, y: 0 }, { x: 0, y: 4 }], 3, 1], { future: { x: 2, y: 1 }, normal: { x: 0, y: 1 }, target: { x: 0, y: 2 } }, "no velocity"),
      ],
    }),
  ];

  const FLOCKING = [
    puzzle({
      number: 22, id: "separate", title: "Separation", source: "agents/separation.js",
      goal: "Steer away from neighbours that are too close, weighting nearer ones more.",
      concept: "Each too-close neighbour contributes (pos − other) normalized and divided by distance; the average becomes the desired direction.",
      functionName: "separate", signature: "separate(agent, others, desiredSeparation, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("separate", "agent, others, desiredSeparation, maxSpeed, maxForce", "others is an array of { pos, vel }. Return { x: 0, y: 0 } when nobody is close."),
      referenceSource: lines(
        "function separate(agent, others, desiredSeparation, maxSpeed, maxForce) {",
        "  var sum = { x: 0, y: 0 }, count = 0;",
        "  for (var i = 0; i < others.length; i += 1) {",
        "    var dx = agent.pos.x - others[i].pos.x, dy = agent.pos.y - others[i].pos.y;",
        "    var distance = Math.sqrt(dx * dx + dy * dy);",
        "    if (distance > 0 && distance < desiredSeparation) {",
        "      var away = normalize({ x: dx, y: dy });",
        "      sum.x += away.x / distance; sum.y += away.y / distance;",
        "      count += 1;",
        "    }",
        "  }",
        "  if (count === 0) return { x: 0, y: 0 };",
        "  var desired = setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed);",
        "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["normalize", "set-magnitude", "limit-vector"],
      reference: noc("autonomous-agents", "separation"),
      scene: { kind: "nature", view: "flock", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: 0, y: 0, yaw: 0.8 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
      ], args: [{ fixture: "agent" }, { fixture: "others" }, 1.2].concat(STEER) },
      diagnoses: [
        diagnosis("not-weighted-by-distance", "Closer neighbours must push harder: divide each unit vector by its distance.", lines(
          "function separate(agent, others, desiredSeparation, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) {",
          "    var dx = agent.pos.x - others[i].pos.x, dy = agent.pos.y - others[i].pos.y;",
          "    var distance = Math.sqrt(dx * dx + dy * dy);",
          "    if (distance > 0 && distance < desiredSeparation) {",
          "      var away = normalize({ x: dx, y: dy });",
          "      sum.x += away.x; sum.y += away.y;",
          "      count += 1;",
          "    }",
          "  }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  var desired = setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed);",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
        diagnosis("wrong-direction", "The push points from the neighbour to the agent (pos − other), not the other way round.", lines(
          "function separate(agent, others, desiredSeparation, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) {",
          "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
          "    var distance = Math.sqrt(dx * dx + dy * dy);",
          "    if (distance > 0 && distance < desiredSeparation) {",
          "      var away = normalize({ x: dx, y: dy });",
          "      sum.x += away.x / distance; sum.y += away.y / distance;",
          "      count += 1;",
          "    }",
          "  }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  var desired = setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed);",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
      ],
      hints: ["For each other with 0 < d < desiredSeparation: away = normalize(pos − other.pos) / d.", "Average the sum over the count; return zero if the count is zero.", "setMagnitude to maxSpeed, subtract vel, limit to maxForce."],
      cases: [
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: ZERO }], 2, 2, 1], { x: -1, y: 0 }, "one neighbour to the right"),
        example([AT_REST, [{ pos: { x: 5, y: 0 }, vel: ZERO }], 2, 2, 1], { x: 0, y: 0 }, "nobody close"),
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: ZERO }, { pos: { x: 0, y: 2 }, vel: ZERO }], 3, 3, 10], { x: -6 / Math.sqrt(5), y: -3 / Math.sqrt(5) }, "nearer one dominates"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 1, y: 0 } }, [{ pos: { x: -1, y: 0 }, vel: ZERO }], 2, 1, 10], { x: 0, y: 0 }, "already moving away"),
      ],
    }),
    puzzle({
      number: 23, id: "align", title: "Alignment", source: "agents/boid.js",
      goal: "Steer toward the average velocity of nearby boids.",
      concept: "Alignment averages velocities, not positions; the result is then treated as the desired velocity.",
      functionName: "align", signature: "align(agent, others, radius, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("align", "agent, others, radius, maxSpeed, maxForce"),
      referenceSource: lines(
        "function align(agent, others, radius, maxSpeed, maxForce) {",
        "  var sum = { x: 0, y: 0 }, count = 0;",
        "  for (var i = 0; i < others.length; i += 1) {",
        "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
        "    var distance = Math.sqrt(dx * dx + dy * dy);",
        "    if (distance > 0 && distance < radius) { sum.x += others[i].vel.x; sum.y += others[i].vel.y; count += 1; }",
        "  }",
        "  if (count === 0) return { x: 0, y: 0 };",
        "  var desired = setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed);",
        "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["set-magnitude", "limit-vector"],
      reference: noc("autonomous-agents", "alignment"),
      scene: { kind: "nature", view: "flock", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: 0, y: 0, yaw: 0.8 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
      ], args: [{ fixture: "agent" }, { fixture: "others" }, 2.5].concat(STEER) },
      diagnoses: [
        diagnosis("averages-positions", "Alignment averages neighbour velocities, not their positions.", lines(
          "function align(agent, others, radius, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) {",
          "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
          "    var distance = Math.sqrt(dx * dx + dy * dy);",
          "    if (distance > 0 && distance < radius) { sum.x += others[i].pos.x; sum.y += others[i].pos.y; count += 1; }",
          "  }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  var desired = setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed);",
          "  return limitVector({ x: desired.x - agent.vel.x, y: desired.y - agent.vel.y }, maxForce);",
          "}"
        )),
        diagnosis("no-velocity-subtraction", "Steering = desired − velocity.", lines(
          "function align(agent, others, radius, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) {",
          "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
          "    var distance = Math.sqrt(dx * dx + dy * dy);",
          "    if (distance > 0 && distance < radius) { sum.x += others[i].vel.x; sum.y += others[i].vel.y; count += 1; }",
          "  }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  return limitVector(setMagnitude({ x: sum.x / count, y: sum.y / count }, maxSpeed), maxForce);",
          "}"
        )),
      ],
      hints: ["Sum the velocities of others within the radius (excluding distance 0).", "Average, then setMagnitude to maxSpeed.", "Subtract vel and limit."],
      cases: [
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: { x: 0, y: 3 } }], 2, 2, 1], { x: 0, y: 1 }, "one neighbour moving up"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, [{ pos: { x: 1, y: 0 }, vel: { x: 1, y: 0 } }], 2, 2, 1], { x: 0, y: 0 }, "already aligned"),
        example([AT_REST, [{ pos: { x: 10, y: 0 }, vel: { x: 0, y: 3 } }], 2, 2, 1], { x: 0, y: 0 }, "out of range"),
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: { x: 1, y: 0 } }, { pos: { x: 0, y: 1 }, vel: { x: 0, y: 1 } }], 2, 1, 10], { x: Math.SQRT1_2, y: Math.SQRT1_2 }, "two neighbours"),
      ],
    }),
    puzzle({
      number: 24, id: "cohere", title: "Cohesion", source: "agents/boid.js",
      goal: "Seek the centre of the nearby boids.",
      concept: "Cohesion is seek with a computed target: the average position of neighbours within the radius.",
      functionName: "cohere", signature: "cohere(agent, others, radius, maxSpeed, maxForce) → { x, y }",
      starterSource: starter("cohere", "agent, others, radius, maxSpeed, maxForce"),
      referenceSource: lines(
        "function cohere(agent, others, radius, maxSpeed, maxForce) {",
        "  var sum = { x: 0, y: 0 }, count = 0;",
        "  for (var i = 0; i < others.length; i += 1) {",
        "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
        "    var distance = Math.sqrt(dx * dx + dy * dy);",
        "    if (distance > 0 && distance < radius) { sum.x += others[i].pos.x; sum.y += others[i].pos.y; count += 1; }",
        "  }",
        "  if (count === 0) return { x: 0, y: 0 };",
        "  return seek(agent, { x: sum.x / count, y: sum.y / count }, maxSpeed, maxForce);",
        "}"
      ),
      comparator: "vector2", dependencies: ["seek"],
      reference: noc("autonomous-agents", "cohesion"),
      scene: { kind: "nature", view: "flock", handles: [
        { id: "agent", type: "pose", label: "agent", value: { x: 0, y: 0, yaw: 0.8 } },
        { id: "speed", type: "slider", label: "agent speed", value: 1, min: 0, max: 2 },
      ], args: [{ fixture: "agent" }, { fixture: "others" }, 2.5].concat(STEER) },
      diagnoses: [
        diagnosis("centroid-as-steering", "The centroid is a target to seek, not a force.", lines(
          "function cohere(agent, others, radius, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) {",
          "    var dx = others[i].pos.x - agent.pos.x, dy = others[i].pos.y - agent.pos.y;",
          "    var distance = Math.sqrt(dx * dx + dy * dy);",
          "    if (distance > 0 && distance < radius) { sum.x += others[i].pos.x; sum.y += others[i].pos.y; count += 1; }",
          "  }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  return limitVector({ x: sum.x / count - agent.pos.x, y: sum.y / count - agent.pos.y }, maxForce);",
          "}"
        )),
        diagnosis("ignores-radius", "Only neighbours inside the radius count.", lines(
          "function cohere(agent, others, radius, maxSpeed, maxForce) {",
          "  var sum = { x: 0, y: 0 }, count = 0;",
          "  for (var i = 0; i < others.length; i += 1) { sum.x += others[i].pos.x; sum.y += others[i].pos.y; count += 1; }",
          "  if (count === 0) return { x: 0, y: 0 };",
          "  return seek(agent, { x: sum.x / count, y: sum.y / count }, maxSpeed, maxForce);",
          "}"
        )),
      ],
      hints: ["Average the positions of others within the radius.", "Return zero when there are none.", "seek(agent, centroid, maxSpeed, maxForce)."],
      cases: [
        example([AT_REST, [{ pos: { x: 4, y: 0 }, vel: ZERO }], 5, 2, 1], { x: 1, y: 0 }, "one neighbour"),
        example([AT_REST, [{ pos: { x: 4, y: 0 }, vel: ZERO }, { pos: { x: 0, y: 4 }, vel: ZERO }], 5, 2, 10], { x: Math.SQRT2, y: Math.SQRT2 }, "centroid between two"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 1, y: 0 } }, [{ pos: { x: 10, y: 0 }, vel: ZERO }], 5, 2, 1], { x: 0, y: 0 }, "out of range"),
        example([{ pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 } }, [{ pos: { x: 3, y: 0 }, vel: ZERO }], 5, 2, 1], { x: 0, y: 0 }, "already heading there"),
      ],
    }),
    puzzle({
      number: 25, id: "flock", title: "Flock", source: "agents/boid.js",
      goal: "Weight and add the three flocking forces.",
      concept: "The sketch multiplies separation by 3.5 and the others by 1.5; those weights are the personality of the flock.",
      functionName: "flock", signature: "flock(agent, others, weights, params) → { x, y }",
      starterSource: starter("flock", "agent, others, weights, params", "weights: { separation, alignment, cohesion }; params: { separation, neighbourRadius, maxSpeed, maxForce }."),
      referenceSource: lines(
        "function flock(agent, others, weights, params) {",
        "  var sep = separate(agent, others, params.separation, params.maxSpeed, params.maxForce);",
        "  var ali = align(agent, others, params.neighbourRadius, params.maxSpeed, params.maxForce);",
        "  var coh = cohere(agent, others, params.neighbourRadius, params.maxSpeed, params.maxForce);",
        "  return {",
        "    x: sep.x * weights.separation + ali.x * weights.alignment + coh.x * weights.cohesion,",
        "    y: sep.y * weights.separation + ali.y * weights.alignment + coh.y * weights.cohesion,",
        "  };",
        "}"
      ),
      comparator: "vector2", dependencies: ["separate", "align", "cohere"],
      reference: noc("autonomous-agents", "flocking"),
      scene: { kind: "nature", view: "flock", handles: [
        { id: "agent", type: "pose", label: "agent (speed 1)", value: { x: 0, y: 0, yaw: 0.8 } },
        { id: "wSeparation", type: "slider", label: "separation weight", value: 1.5, min: 0, max: 3 },
        { id: "wAlignment", type: "slider", label: "alignment weight", value: 1, min: 0, max: 3 },
        { id: "wCohesion", type: "slider", label: "cohesion weight", value: 1, min: 0, max: 3 },
      ], args: [{ fixture: "agentUnit" }, { fixture: "others" }, { fixture: "flockWeights" }, { fixture: "flockParams" }] },
      diagnoses: [
        diagnosis("unweighted", "The weights were ignored.", lines(
          "function flock(agent, others, weights, params) {",
          "  var sep = separate(agent, others, params.separation, params.maxSpeed, params.maxForce);",
          "  var ali = align(agent, others, params.neighbourRadius, params.maxSpeed, params.maxForce);",
          "  var coh = cohere(agent, others, params.neighbourRadius, params.maxSpeed, params.maxForce);",
          "  return { x: sep.x + ali.x + coh.x, y: sep.y + ali.y + coh.y };",
          "}"
        )),
        diagnosis("separation-only", "Alignment and cohesion are missing.", lines(
          "function flock(agent, others, weights, params) {",
          "  var sep = separate(agent, others, params.separation, params.maxSpeed, params.maxForce);",
          "  return { x: sep.x * weights.separation, y: sep.y * weights.separation };",
          "}"
        )),
      ],
      hints: ["separate uses params.separation; align and cohere use params.neighbourRadius.", "Multiply each force by its weight.", "Add the three."],
      cases: [
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: { x: 0, y: 3 } }], { separation: 1, alignment: 1, cohesion: 1 }, { separation: 2, neighbourRadius: 5, maxSpeed: 2, maxForce: 1 }], { x: 0, y: 1 }, "all three, unit weights"),
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: { x: 0, y: 3 } }], { separation: 2, alignment: 0, cohesion: 0 }, { separation: 2, neighbourRadius: 5, maxSpeed: 2, maxForce: 1 }], { x: -2, y: 0 }, "separation only"),
        example([AT_REST, [{ pos: { x: 1, y: 0 }, vel: { x: 0, y: 3 } }], { separation: 0, alignment: 0, cohesion: 1 }, { separation: 2, neighbourRadius: 5, maxSpeed: 2, maxForce: 1 }], { x: 1, y: 0 }, "cohesion only"),
        example([AT_REST, [], { separation: 1, alignment: 1, cohesion: 1 }, { separation: 2, neighbourRadius: 5, maxSpeed: 2, maxForce: 1 }], { x: 0, y: 0 }, "alone"),
      ],
    }),
  ];

  const CHAINS = [
    puzzle({
      number: 26, id: "simplify-angle", title: "Wrap an Angle to [0, 2π)", source: "procedural_animation/sketch.js",
      goal: "Bring any angle into [0, 2π).",
      concept: "The chain compares angles, so every angle must live on the same interval first.",
      functionName: "simplifyAngle", signature: "simplifyAngle(angle) → radians in [0, 2π)",
      starterSource: starter("simplifyAngle", "angle"),
      referenceSource: lines(
        "function simplifyAngle(angle) {",
        "  var twoPi = 2 * Math.PI;",
        "  var wrapped = angle % twoPi;",
        "  if (wrapped < 0) wrapped += twoPi;",
        "  return wrapped;",
        "}"
      ),
      comparator: "scalar",
      reference: docref("argonaut · A simple procedural animation technique", "https://www.youtube.com/watch?v=qlfh_rv6khY"),
      scene: { kind: "nature", view: "angle", handles: [{ id: "angle", type: "dial", label: "angle (keep turning)", value: -1, accumulate: true }], args: [{ handle: "angle" }] },
      diagnoses: [
        diagnosis("wraps-to-pi", "This wraps into [−π, π); the chain expects [0, 2π).", "function simplifyAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }"),
        diagnosis("no-negative-fix", "A negative remainder must have 2π added.", "function simplifyAngle(angle) { return angle % (2 * Math.PI); }"),
      ],
      hints: ["angle % 2π keeps the sign of the input.", "If the remainder is negative, add 2π.", "Return the result."],
      cases: [
        example([7], 7 - 2 * PI, "just past a full turn"),
        example([-1], 2 * PI - 1, "negative"),
        example([0], 0, "zero"),
        example([2 * PI], 0, "exactly a full turn"),
        example([-7], 4 * PI - 7, "two turns back"),
      ],
    }),
    puzzle({
      number: 27, id: "constrain-angle", title: "Constrain an Angle to a Cone", source: "procedural_animation/sketch.js",
      goal: "Clamp an angle to within ± constraint of an anchor angle, working across the 0 / 2π seam.",
      concept: "Compare through the wrapped relative angle: relative = simplifyAngle(angle − anchor + π) − π lands in [−π, π).",
      functionName: "constrainAngle", signature: "constrainAngle(angle, anchor, constraint) → radians in [0, 2π)",
      starterSource: starter("constrainAngle", "angle, anchor, constraint", "relative = simplifyAngle(angle − anchor + π) − π; clamp relative to ±constraint; return simplifyAngle(anchor + clamped)."),
      referenceSource: lines(
        "function constrainAngle(angle, anchor, constraint) {",
        "  var relative = simplifyAngle(angle - anchor + Math.PI) - Math.PI;",
        "  if (Math.abs(relative) <= constraint) return simplifyAngle(angle);",
        "  if (relative > constraint) return simplifyAngle(anchor + constraint);",
        "  return simplifyAngle(anchor - constraint);",
        "}"
      ),
      comparator: "scalar", dependencies: ["simplify-angle"],
      reference: docref("argonaut · A simple procedural animation technique", "https://www.youtube.com/watch?v=qlfh_rv6khY"),
      scene: { kind: "nature", view: "cone", handles: [
        { id: "angle", type: "dial", label: "angle", value: 2.4, accumulate: true },
        { id: "anchor", type: "slider", label: "anchor angle", value: 1.57, min: 0, max: 6.28 },
        { id: "constraint", type: "slider", label: "constraint (half cone)", value: 0.5, min: 0, max: 3.14 },
      ], args: [{ handle: "angle" }, { handle: "anchor" }, { handle: "constraint" }] },
      diagnoses: [
        diagnosis("no-wrap-in-diff", "angle − anchor without wrapping breaks near 0 / 2π: an angle of 0.1 next to an anchor of 6.2 looks 6 radians away.", lines(
          "function constrainAngle(angle, anchor, constraint) {",
          "  var relative = angle - anchor;",
          "  if (Math.abs(relative) <= constraint) return simplifyAngle(angle);",
          "  if (relative > constraint) return simplifyAngle(anchor + constraint);",
          "  return simplifyAngle(anchor - constraint);",
          "}"
        )),
        diagnosis("clamps-wrong-side", "An angle above the cone clamps to anchor + constraint, below it to anchor − constraint; the two were swapped.", lines(
          "function constrainAngle(angle, anchor, constraint) {",
          "  var relative = simplifyAngle(angle - anchor + Math.PI) - Math.PI;",
          "  if (Math.abs(relative) <= constraint) return simplifyAngle(angle);",
          "  if (relative > constraint) return simplifyAngle(anchor - constraint);",
          "  return simplifyAngle(anchor + constraint);",
          "}"
        )),
      ],
      hints: ["relative = simplifyAngle(angle − anchor + π) − π.", "Inside ±constraint: return simplifyAngle(angle).", "Otherwise return simplifyAngle(anchor ± constraint) on the side you exceeded."],
      cases: [
        example([PI / 2 + 0.1, PI / 2, 0.5], PI / 2 + 0.1, "inside the cone"),
        example([PI / 2 + 1, PI / 2, 0.5], PI / 2 + 0.5, "clamped from above"),
        example([PI / 2 - 1, PI / 2, 0.5], PI / 2 - 0.5, "clamped from below"),
        example([0.1, 2 * PI - 0.1, 0.5], 0.1, "across the seam"),
        example([3, -3, 0.1], 2 * PI - 3.1, "negative anchor"),
      ],
    }),
    puzzle({
      number: 28, id: "chain-follow", title: "Chain Link Follow", source: "procedural_animation/sketch.js",
      goal: "Place the next joint at link length from the anchor, pointing at where it wants to be, within the angle cone of the previous link.",
      concept: "arrowTo in the sketch: heading of (joint − anchor), constrained by the previous angle, then polar to cartesian at the ring radius.",
      functionName: "chainFollow", signature: "chainFollow(anchor, joint, linkLength, prevAngle, constraint) → { pos, angle }",
      starterSource: starter("chainFollow", "anchor, joint, linkLength, prevAngle, constraint", "prevAngle is null for the first link."),
      referenceSource: lines(
        "function chainFollow(anchor, joint, linkLength, prevAngle, constraint) {",
        "  var angle = Math.atan2(joint.y - anchor.y, joint.x - anchor.x);",
        "  angle = prevAngle === null ? simplifyAngle(angle) : constrainAngle(angle, prevAngle, constraint);",
        "  return { pos: { x: anchor.x + Math.cos(angle) * linkLength, y: anchor.y + Math.sin(angle) * linkLength }, angle: angle };",
        "}"
      ),
      comparator: "deep", dependencies: ["simplify-angle", "constrain-angle"],
      reference: docref("argonaut · A simple procedural animation technique", "https://www.youtube.com/watch?v=qlfh_rv6khY"),
      scene: { kind: "nature", view: "chain", handles: [
        { id: "anchor", type: "point", label: "anchor", value: { x: -1, y: 0 } },
        { id: "joint", type: "point", label: "joint (where it wants to be)", value: { x: 1.5, y: 1.2 } },
        { id: "prevAngle", type: "slider", label: "previous link angle", value: 0.3, min: 0, max: 6.28 },
        { id: "constraint", type: "slider", label: "constraint (half cone)", value: 0.8, min: 0, max: 3.14 },
      ], args: [{ handle: "anchor" }, { handle: "joint" }, 1.5, { handle: "prevAngle" }, { handle: "constraint" }] },
      diagnoses: [
        diagnosis("unconstrained", "The heading must be clamped to the previous link's cone when prevAngle is given.", lines(
          "function chainFollow(anchor, joint, linkLength, prevAngle, constraint) {",
          "  var angle = simplifyAngle(Math.atan2(joint.y - anchor.y, joint.x - anchor.x));",
          "  return { pos: { x: anchor.x + Math.cos(angle) * linkLength, y: anchor.y + Math.sin(angle) * linkLength }, angle: angle };",
          "}"
        )),
        diagnosis("keeps-joint-distance", "The joint must sit exactly linkLength from the anchor, not wherever it was.", lines(
          "function chainFollow(anchor, joint, linkLength, prevAngle, constraint) {",
          "  var angle = Math.atan2(joint.y - anchor.y, joint.x - anchor.x);",
          "  angle = prevAngle === null ? simplifyAngle(angle) : constrainAngle(angle, prevAngle, constraint);",
          "  return { pos: { x: joint.x, y: joint.y }, angle: angle };",
          "}"
        )),
      ],
      hints: ["angle = atan2(joint − anchor).", "If prevAngle is not null, constrainAngle(angle, prevAngle, constraint); otherwise simplifyAngle(angle).", "pos = anchor + linkLength · (cos angle, sin angle)."],
      cases: [
        example([{ x: 0, y: 0 }, { x: 5, y: 0 }, 2, null, 1], { pos: { x: 2, y: 0 }, angle: 0 }, "first link"),
        example([{ x: 0, y: 0 }, { x: 0, y: 3 }, 1, null, 1], { pos: { x: 0, y: 1 }, angle: PI / 2 }, "pointing up"),
        example([{ x: 0, y: 0 }, { x: 0, y: 3 }, 1, 0, PI / 4], { pos: { x: Math.SQRT1_2, y: Math.SQRT1_2 }, angle: PI / 4 }, "clamped by the cone"),
        example([{ x: 1, y: 1 }, { x: 1, y: -4 }, 2, 0, PI / 2], { pos: { x: 1, y: -1 }, angle: 3 * PI / 2 }, "pointing down, inside the cone"),
      ],
    }),
    puzzle({
      number: 29, id: "wrap-offset", title: "Wrap With an Offset", source: "procedural_animation/sketch.js",
      goal: "Wrap the head across the border and report the jump so every follower can be moved by the same amount.",
      concept: "The jump is −(width + 2·margin), not −width: the head leaves at width + margin and reappears at −margin.",
      functionName: "wrapOffset", signature: "wrapOffset(pos, margin, width, height) → { pos, offset }",
      starterSource: starter("wrapOffset", "pos, margin, width, height"),
      referenceSource: lines(
        "function wrapOffset(pos, margin, width, height) {",
        "  var x = pos.x, y = pos.y, offset = { x: 0, y: 0 };",
        "  if (x > width + margin) { x = -margin; offset.x = -(width + 2 * margin); }",
        "  else if (x < -margin) { x = width + margin; offset.x = width + 2 * margin; }",
        "  if (y > height + margin) { y = -margin; offset.y = -(height + 2 * margin); }",
        "  else if (y < -margin) { y = height + margin; offset.y = height + 2 * margin; }",
        "  return { pos: { x: x, y: y }, offset: offset };",
        "}"
      ),
      comparator: "deep",
      reference: docref("argonaut · A simple procedural animation technique", "https://www.youtube.com/watch?v=qlfh_rv6khY"),
      scene: { kind: "nature", view: "wrap-offset", handles: [{ id: "pos", type: "point", label: "head position", value: { x: 4.3, y: 1 } }], args: [{ fixture: "boxPos" }, 0.5, 8, 5] },
      diagnoses: [
        diagnosis("offset-without-margin", "The head jumps from width + margin to −margin, so the offset is width + 2·margin.", lines(
          "function wrapOffset(pos, margin, width, height) {",
          "  var x = pos.x, y = pos.y, offset = { x: 0, y: 0 };",
          "  if (x > width + margin) { x = -margin; offset.x = -width; }",
          "  else if (x < -margin) { x = width + margin; offset.x = width; }",
          "  if (y > height + margin) { y = -margin; offset.y = -height; }",
          "  else if (y < -margin) { y = height + margin; offset.y = height; }",
          "  return { pos: { x: x, y: y }, offset: offset };",
          "}"
        )),
        diagnosis("pos-not-wrapped", "The offset was reported but the head itself stayed outside.", lines(
          "function wrapOffset(pos, margin, width, height) {",
          "  var offset = { x: 0, y: 0 };",
          "  if (pos.x > width + margin) offset.x = -(width + 2 * margin);",
          "  else if (pos.x < -margin) offset.x = width + 2 * margin;",
          "  if (pos.y > height + margin) offset.y = -(height + 2 * margin);",
          "  else if (pos.y < -margin) offset.y = height + 2 * margin;",
          "  return { pos: { x: pos.x, y: pos.y }, offset: offset };",
          "}"
        )),
      ],
      hints: ["Same tests as wrapEdges, with margin as the radius.", "When wrapping, also record the jump in offset.", "Return both the new position and the offset."],
      cases: [
        example([{ x: 9.5, y: 2 }, 1, 8, 5], { pos: { x: -1, y: 2 }, offset: { x: -10, y: 0 } }, "off the right"),
        example([{ x: -2, y: 3 }, 1, 8, 5], { pos: { x: 9, y: 3 }, offset: { x: 10, y: 0 } }, "off the left"),
        example([{ x: 4, y: 6.5 }, 1, 8, 5], { pos: { x: 4, y: -1 }, offset: { x: 0, y: -7 } }, "off the top"),
        example([{ x: 4, y: 2 }, 1, 8, 5], { pos: { x: 4, y: 2 }, offset: { x: 0, y: 0 } }, "inside"),
      ],
    }),
  ];

  const RANDOMNESS = [
    puzzle({
      number: 30, id: "bin-index", title: "Which Bin?", source: "random_distribution/sketch.js",
      goal: "Map a value in [lo, hi] to a bin index, keeping hi itself in the last bin.",
      concept: "floor(random(bins)) in the sketch is this with lo = 0 and hi = bins.",
      functionName: "binIndex", signature: "binIndex(value, lo, hi, bins) → integer",
      starterSource: starter("binIndex", "value, lo, hi, bins", "floor((value − lo) / (hi − lo) · bins), clamped to [0, bins − 1]."),
      referenceSource: lines(
        "function binIndex(value, lo, hi, bins) {",
        "  var index = Math.floor((value - lo) / (hi - lo) * bins);",
        "  return Math.max(0, Math.min(bins - 1, index));",
        "}"
      ),
      comparator: "scalar",
      reference: noc("random", "uniform distribution"),
      scene: { kind: "nature", view: "bins", handles: [
        { id: "value", type: "slider", label: "value", value: 0.35, min: 0, max: 1 },
        { id: "bins", type: "slider", label: "bins (rounded)", value: 6, min: 2, max: 10 },
      ], args: [{ handle: "value" }, 0, 1, { fixture: "binCount" }] },
      diagnoses: [
        diagnosis("no-clamp-at-hi", "value = hi would fall into bin number bins; clamp to bins − 1.", "function binIndex(value, lo, hi, bins) { return Math.floor((value - lo) / (hi - lo) * bins); }"),
        diagnosis("rounds", "Bins are floor divisions; rounding shifts values in the upper half of each bin.", "function binIndex(value, lo, hi, bins) { var index = Math.round((value - lo) / (hi - lo) * bins); return Math.max(0, Math.min(bins - 1, index)); }"),
      ],
      hints: ["Normalize the value to [0, 1].", "Multiply by bins and floor.", "Clamp to [0, bins − 1]."],
      cases: [
        example([0.35, 0, 1, 10], 3, "middle"),
        example([1, 0, 1, 10], 9, "the top edge stays inside"),
        example([-0.5, 0, 1, 10], 0, "below the range"),
        example([5, 0, 10, 4], 2, "wider range"),
        example([2.999, 0, 3, 3], 2, "just under a boundary"),
      ],
    }),
    puzzle({
      number: 31, id: "histogram", title: "Histogram", source: "random_distribution/sketch.js",
      goal: "Count how many samples land in each bin.",
      concept: "randomCount[floor(random(bins))]++ every frame; over time a uniform source fills the bins evenly.",
      functionName: "histogram", signature: "histogram(samples, lo, hi, bins) → counts",
      starterSource: starter("histogram", "samples, lo, hi, bins"),
      referenceSource: lines(
        "function histogram(samples, lo, hi, bins) {",
        "  var counts = [];",
        "  for (var i = 0; i < bins; i += 1) counts.push(0);",
        "  for (var j = 0; j < samples.length; j += 1) counts[binIndex(samples[j], lo, hi, bins)] += 1;",
        "  return counts;",
        "}"
      ),
      comparator: "deep", dependencies: ["bin-index"],
      reference: noc("random", "random distribution"),
      scene: { kind: "nature", view: "histogram", handles: [{ id: "bins", type: "slider", label: "bins (rounded)", value: 4, min: 2, max: 8 }], args: [{ fixture: "samples" }, 0, 1, { fixture: "binCount" }] },
      diagnoses: [
        diagnosis("off-by-one-bins", "The array must have exactly bins entries.", lines(
          "function histogram(samples, lo, hi, bins) {",
          "  var counts = [];",
          "  for (var i = 0; i <= bins; i += 1) counts.push(0);",
          "  for (var j = 0; j < samples.length; j += 1) counts[binIndex(samples[j], lo, hi, bins)] += 1;",
          "  return counts;",
          "}"
        )),
        diagnosis("drops-max", "A sample equal to hi belongs in the last bin, not nowhere.", lines(
          "function histogram(samples, lo, hi, bins) {",
          "  var counts = [];",
          "  for (var i = 0; i < bins; i += 1) counts.push(0);",
          "  for (var j = 0; j < samples.length; j += 1) { if (samples[j] < hi) counts[binIndex(samples[j], lo, hi, bins)] += 1; }",
          "  return counts;",
          "}"
        )),
      ],
      hints: ["Start with bins zeros.", "For each sample, binIndex tells which entry to increment.", "Return the counts."],
      cases: [
        example([[0.1, 0.15, 0.5, 0.99], 0, 1, 4], [2, 0, 1, 1], "four samples"),
        example([[], 0, 1, 3], [0, 0, 0], "no samples"),
        example([[1, 1, 1], 0, 1, 2], [0, 3], "samples on the top edge"),
        example([[0, 2.5, 5, 7.5, 10], 0, 10, 4], [1, 1, 1, 2], "wider range"),
      ],
    }),
    puzzle({
      number: 32, id: "normalize-histogram", title: "Normalize a Histogram", source: "random_distribution/sketch.js",
      goal: "Turn counts into fractions that sum to one.",
      concept: "Dividing by the total turns a histogram into a probability distribution, the same normalization as the discrete Bayes update.",
      functionName: "normalizeHistogram", signature: "normalizeHistogram(counts) → fractions",
      starterSource: starter("normalizeHistogram", "counts", "Divide by the total; an all-zero histogram stays all zeros."),
      referenceSource: lines(
        "function normalizeHistogram(counts) {",
        "  var total = 0;",
        "  for (var i = 0; i < counts.length; i += 1) total += counts[i];",
        "  if (total === 0) return counts.map(function () { return 0; });",
        "  return counts.map(function (count) { return count / total; });",
        "}"
      ),
      comparator: "deep",
      reference: noc("random", "probability"),
      scene: { kind: "nature", view: "normalize-histogram", handles: [{ id: "boost", type: "slider", label: "extra samples in the last bin", value: 0, min: 0, max: 12 }], args: [{ fixture: "counts" }] },
      diagnoses: [
        diagnosis("divides-by-bins", "Divide by the number of samples, not the number of bins.", "function normalizeHistogram(counts) { return counts.map(function (count) { return count / counts.length; }); }"),
        diagnosis("divides-by-max", "Dividing by the tallest bin makes it 1, but the fractions no longer sum to 1.", "function normalizeHistogram(counts) { var peak = Math.max.apply(null, counts); return counts.map(function (count) { return peak === 0 ? 0 : count / peak; }); }"),
      ],
      hints: ["Sum the counts.", "If the sum is zero, return zeros.", "Otherwise divide every count by the sum."],
      cases: [
        example([[2, 0, 1, 1]], [0.5, 0, 0.25, 0.25], "four bins"),
        example([[0, 0]], [0, 0], "empty"),
        example([[5]], [1], "one bin"),
        example([[1, 3]], [0.25, 0.75], "two bins"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(VECTORS.concat(FORCES, STEERING, FLOCKING, CHAINS, RANDOMNESS));
  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));
  function getPuzzle(id) { return byId.get(id) || null; }

  const api = Object.freeze({
    SIDE_PUZZLE_STAGES: STAGES,
    SIDE_PUZZLE_TRACKS: TRACKS,
    SIDE_PUZZLES: PUZZLES,
    getPuzzle,
  });

  root.SIDE_PUZZLE_STAGES = STAGES;
  root.SIDE_PUZZLE_TRACKS = TRACKS;
  root.SIDE_PUZZLES = PUZZLES;
  root.getSidePuzzle = getPuzzle;
  root.SidePuzzles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

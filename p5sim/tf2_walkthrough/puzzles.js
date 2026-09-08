(function exposeTF2Puzzles(root) {
  "use strict";

  const PI = Math.PI;
  const FRAME_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser", "camera"]);
  const CHAIN_OPTIONS = Object.freeze(["map", "odom", "base_link", "laser"]);

  const STAGES = Object.freeze([
    { id: "rotation-bricks", title: "Rotation Bricks", subtitle: "cos, sin, atan2, and the angle wrap.", range: [1, 5] },
    { id: "frames", title: "Frames (SE(2))", subtitle: "Apply, compose, invert, and relate rigid transforms.", range: [6, 11] },
    { id: "tree", title: "Tree", subtitle: "Turn parent-child edges into traversable structure.", range: [12, 16] },
    { id: "lookup-robot", title: "Lookup & Robot Frames", subtitle: "Resolve map, odom, base_link, and laser questions.", range: [17, 19] },
    { id: "time", title: "Time", subtitle: "Interpolate samples and respect buffer boundaries.", range: [20, 23] },
    { id: "se3", title: "SE(3)", subtitle: "Lift the same ideas into quaternion-based 3D.", range: [24, 26] },
    { id: "capstone", title: "Capstone", subtitle: "Answer a stamped lookup end to end.", range: [27, 27] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "tf2", title: "Track 1 · TF2", stages: STAGES }),
    Object.freeze({
      id: "pose-correction",
      title: "Track 2 · Pose Correction",
      unlockAfter: "stamped-lookup",
      note: "Unlocks after the stamped lookup capstone. Puzzles arrive with the next track.",
      stages: Object.freeze([
        { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points, line fits, and distances.", range: [0, 0] },
        { id: "rack-filters", title: "Rack Filters", subtitle: "Accumulate, filter, smooth, and agree.", range: [0, 0] },
        { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, lateral error, corrected pose.", range: [0, 0] },
        { id: "correction-capstone", title: "Correction Capstone", subtitle: "Publish map → odom on a drifting robot.", range: [0, 0] },
      ]),
    }),
  ]);

  function lines() {
    return Array.from(arguments).join("\n");
  }

  function starter(functionName, args, comment) {
    return comment
      ? lines("function " + functionName + "(" + args + ") {", "  // " + comment, "  return null;", "}")
      : lines("function " + functionName + "(" + args + ") {", "  return null;", "}");
  }

  function example(args, expected, label) {
    return Object.freeze({ args, expected, label });
  }

  function diagnosis(id, message, source) {
    return Object.freeze({ id, message, source });
  }

  function handle(config) {
    return Object.freeze(config);
  }

  function puzzle(config) {
    const stage = STAGES.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      ...config,
      track: "tf2",
      stage: stage.id,
      dependencies: Object.freeze(config.dependencies || []),
      diagnoses: Object.freeze(config.diagnoses || []),
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      scene: Object.freeze({
        kind: config.scene.kind,
        view: config.scene.view || null,
        handles: Object.freeze(config.scene.handles.map(handle)),
        args: config.scene.args ? Object.freeze(config.scene.args) : null,
      }),
    });
  }

  const STAGE_1_2 = [
    puzzle({
      number: 1, id: "heading-vector", title: "Point Along a Yaw",
      goal: "Turn a yaw angle into the unit vector that points along it.",
      concept: "Every rotation in SE(2) is built from this pair: cos for x and sin for y.",
      functionName: "headingVector", signature: "headingVector(yaw) → { x, y }",
      starterSource: starter("headingVector", "yaw", "The unit vector along yaw: cos for x, sin for y."),
      referenceSource: "function headingVector(yaw) { return { x: Math.cos(yaw), y: Math.sin(yaw) }; }",
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "dial", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }] },
      diagnoses: [diagnosis("swapped", "Mirrored across the diagonal: x should use cos(yaw) and y should use sin(yaw).", "function headingVector(yaw) { return { x: Math.sin(yaw), y: Math.cos(yaw) }; }")],
      hints: ["A heading is a direction, so its vector has length one.", "On the unit circle, x = cos(yaw) and y = sin(yaw).", "Return { x: Math.cos(yaw), y: Math.sin(yaw) }."],
      cases: [
        example([PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([0], { x: 1, y: 0 }, "zero yaw"),
        example([PI], { x: -1, y: 0 }, "half turn"),
        example([-PI / 4], { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 2, id: "heading-of", title: "Vector to Heading",
      goal: "Recover the signed yaw of a direction in every quadrant.",
      concept: "atan2 keeps the quadrant that a plain ratio throws away.",
      functionName: "headingOf", signature: "headingOf(v) → radians",
      starterSource: starter("headingOf", "v", "Use the two-argument arctangent."),
      referenceSource: "function headingOf(v) { return Math.atan2(v.y, v.x); }",
      comparator: "angle", walkthroughChapter: "data-types",
      scene: { kind: "vector", handles: [{ id: "v", type: "vector", label: "v", value: { x: 2, y: 1.2 } }] },
      diagnoses: [
        diagnosis("atan2-swapped", "Arguments swapped: atan2 takes (y, x), so the angle is measured from the wrong axis.", "function headingOf(v) { return Math.atan2(v.x, v.y); }"),
        diagnosis("atan-ratio", "atan(y / x) loses the quadrant: a vector pointing left comes back as if it pointed right.", "function headingOf(v) { return Math.atan(v.y / v.x); }"),
      ],
      hints: ["A direction's angle depends on both components and their signs.", "Math.atan2(y, x) keeps the quadrant; a plain ratio does not.", "Return Math.atan2(v.y, v.x)."],
      cases: [
        example([{ x: 0, y: 3 }], PI / 2, "positive Y"),
        example([{ x: 2, y: 0 }], 0, "positive X"),
        example([{ x: -1, y: -1 }], -3 * PI / 4, "third quadrant"),
        example([{ x: -2, y: 0 }], PI, "negative X"),
      ],
    }),
    puzzle({
      number: 3, id: "wrap-angle", title: "Wrap an Angle",
      goal: "Bring any angle into the range [-π, π) without changing its direction.",
      concept: "Angles repeat every full turn; TF2 compares and interpolates yaw only after wrapping.",
      functionName: "wrapAngle", signature: "wrapAngle(angle) → radians in [-π, π)",
      starterSource: starter("wrapAngle", "angle", "Shift by π, reduce modulo 2π, fix a negative remainder, shift back."),
      referenceSource: lines(
        "function wrapAngle(angle) {",
        "  var wrapped = (angle + Math.PI) % (2 * Math.PI);",
        "  if (wrapped < 0) wrapped += 2 * Math.PI;",
        "  return wrapped - Math.PI;",
        "}"
      ),
      comparator: "scalar", walkthroughChapter: "data-types",
      scene: { kind: "dial", handles: [{ id: "angle", type: "dial", label: "angle", value: 4.0, accumulate: true }] },
      diagnoses: [diagnosis("unwrapped", "Same direction, but not wrapped: the value must land inside [-π, π).", "function wrapAngle(angle) { return angle; }")],
      hints: ["Angles repeat every full turn; two values can mean the same direction.", "Shift by π, take the remainder modulo 2π, fix a negative remainder, then shift back.", "wrapped = (angle + π) mod 2π; add 2π if negative; return wrapped − π."],
      cases: [
        example([4], 4 - 2 * PI, "past π"),
        example([0.5], 0.5, "already inside"),
        example([-4], -4 + 2 * PI, "below −π"),
        example([7], 7 - 2 * PI, "more than a turn"),
        example([PI], -PI, "exactly π maps to −π"),
      ],
    }),
    puzzle({
      number: 4, id: "rotate-vector", title: "Turn a Direction",
      goal: "Rotate a vector by yaw without translating it.",
      concept: "The 2×2 rotation matrix mixes x and y; a flipped sin sign mirrors the result.",
      functionName: "rotateVector", signature: "rotateVector(v, yaw) → vector",
      starterSource: starter("rotateVector", "v, yaw", "Apply the 2×2 rotation matrix rows [cos, -sin] and [sin, cos]."),
      referenceSource: lines(
        "function rotateVector(v, yaw) {",
        "  var c = Math.cos(yaw);",
        "  var s = Math.sin(yaw);",
        "  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      scene: { kind: "vector-dial", handles: [
        { id: "v", type: "vector", label: "v", value: { x: 2, y: 0.5 } },
        { id: "yaw", type: "dial", label: "yaw", value: 0.8 },
      ] },
      diagnoses: [
        diagnosis("negated-yaw", "Rotated the wrong way: the sign of sin is flipped, which mirrors the rotation.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: c * v.x + s * v.y, y: -s * v.x + c * v.y }; }"),
        diagnosis("swapped-rows", "Rows swapped: x′ should be cos·x − sin·y and y′ should be sin·x + cos·y.", "function rotateVector(v, yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return { x: s * v.x + c * v.y, y: c * v.x - s * v.y }; }"),
      ],
      hints: ["A rotation mixes x and y but never adds an offset.", "Use the matrix rows [cos, −sin] and [sin, cos].", "x′ = cos(yaw)·x − sin(yaw)·y; y′ = sin(yaw)·x + cos(yaw)·y."],
      cases: [
        example([{ x: 1, y: 0 }, PI / 2], { x: 0, y: 1 }, "quarter turn"),
        example([{ x: 2, y: -3 }, PI], { x: -2, y: 3 }, "half turn"),
        example([{ x: 0, y: 2 }, PI / 2], { x: -2, y: 0 }, "quarter turn of +Y"),
        example([{ x: 3, y: 4 }, 0], { x: 3, y: 4 }, "zero yaw"),
      ],
    }),
    puzzle({
      number: 5, id: "yaw-delta", title: "Shortest Turn",
      goal: "Return the shortest signed turn from one heading to another.",
      concept: "Interpolation, correction, and comparison all need the short way around the circle.",
      functionName: "yawDelta", signature: "yawDelta(from, to) → radians in [-π, π)",
      starterSource: starter("yawDelta", "from, to", "Subtract, then wrap with your wrapAngle."),
      referenceSource: "function yawDelta(from, to) { return wrapAngle(to - from); }",
      comparator: "scalar", walkthroughChapter: "time-buffer",
      dependencies: ["wrap-angle"],
      scene: { kind: "two-dials", handles: [
        { id: "from", type: "dial", label: "from", value: 2.8, radius: 1.6 },
        { id: "to", type: "dial", label: "to", value: -2.6, radius: 2.4 },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: yawDelta measures the turn from `from` to `to`, so subtract from, not to.", "function yawDelta(from, to) { return wrapAngle(from - to); }"),
        diagnosis("long-way", "Took the long way around: wrap the difference so the turn is the shortest signed one.", "function yawDelta(from, to) { return to - from; }"),
      ],
      hints: ["The shortest turn is never more than half a circle.", "Subtract to − from, then wrap the result with your wrapAngle.", "Return wrapAngle(to - from)."],
      cases: [
        example([170 * PI / 180, -170 * PI / 180], PI / 9, "across the wrap"),
        example([0, PI / 2], PI / 2, "quarter turn left"),
        example([1, 0.5], -0.5, "small turn right"),
        example([-PI / 2, PI / 2], -PI, "half turn"),
      ],
    }),
    puzzle({
      number: 6, id: "transform-point", title: "Move a Point Between Frames",
      goal: "Express a source-frame point in target-frame coordinates.",
      concept: "T_target_source rotates first, then translates. The point does not move; its numbers change.",
      functionName: "transformPoint", signature: "transformPoint(transform, point) → point",
      starterSource: starter("transformPoint", "transform, point", "Rotate point by transform.yaw, then add transform.x and transform.y."),
      referenceSource: lines(
        "function transformPoint(transform, point) {",
        "  var rotated = rotateVector(point, transform.yaw);",
        "  return { x: rotated.x + transform.x, y: rotated.y + transform.y };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [
        diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too. Rotate the point first, then add the translation.", "function transformPoint(transform, point) { var shifted = { x: point.x + transform.x, y: point.y + transform.y }; return rotateVector(shifted, transform.yaw); }"),
        diagnosis("rotation-ignored", "Rotation ignored: the point was only shifted.", "function transformPoint(transform, point) { return { x: point.x + transform.x, y: point.y + transform.y }; }"),
        diagnosis("negated-yaw", "Rotated by −yaw: the point went the wrong way around the frame origin.", "function transformPoint(transform, point) { var rotated = rotateVector(point, -transform.yaw); return { x: rotated.x + transform.x, y: rotated.y + transform.y }; }"),
      ],
      hints: ["T_target_source turns source coordinates into target coordinates.", "A rigid transform rotates first, then translates.", "Rotate point by transform.yaw with rotateVector, then add transform.x and transform.y."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn transform"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([{ x: 1, y: 1, yaw: -PI / 2 }, { x: 0, y: 2 }], { x: 3, y: 1 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 7, id: "transform-vector", title: "Move a Vector Between Frames",
      goal: "Express a source-frame vector in target-frame coordinates.",
      concept: "Vectors are displacements: they rotate with the frame but ignore where its origin is.",
      functionName: "transformVector", signature: "transformVector(transform, vector) → vector",
      starterSource: starter("transformVector", "transform, vector", "Only the rotation applies to a vector."),
      referenceSource: "function transformVector(transform, vector) { return rotateVector(vector, transform.yaw); }",
      comparator: "vector2", walkthroughChapter: "data-types",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-vector", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "vector", type: "vector", label: "v", value: { x: 2, y: 0 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("translated", "A vector was translated: directions and displacements ignore where the frame origin is.", "function transformVector(transform, vector) { var r = rotateVector(vector, transform.yaw); return { x: r.x + transform.x, y: r.y + transform.y }; }")],
      hints: ["A vector is a displacement; moving the origin does not change it.", "Only the rotation part of the transform applies.", "Return rotateVector(vector, transform.yaw)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 0, y: 2 }, "rotated only"),
        example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -2, y: 3 }, "half turn"),
        example([{ x: 10, y: 10, yaw: 0 }, { x: 1, y: 1 }], { x: 1, y: 1 }, "translation ignored"),
      ],
    }),
    puzzle({
      number: 8, id: "transform-pose", title: "Move a Pose Between Frames",
      goal: "Transform position and heading together.",
      concept: "A pose is a point plus a yaw; the yaws add and the sum is wrapped.",
      functionName: "transformPose", signature: "transformPose(transform, pose) → pose",
      starterSource: starter("transformPose", "transform, pose", "Transform the point, then compose the headings."),
      referenceSource: lines(
        "function transformPose(transform, pose) {",
        "  var point = transformPoint(transform, pose);",
        "  return { x: point.x, y: point.y, yaw: wrapAngle(transform.yaw + pose.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "stamped-data",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-pose", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "pose", type: "pose", label: "pose", value: { x: 1, y: 0, yaw: PI / 2 }, in: "transform" },
      ] },
      diagnoses: [diagnosis("yaw-not-composed", "Position moved but heading did not: add the frame's yaw to the pose's yaw.", "function transformPose(transform, pose) { var point = transformPoint(transform, pose); return { x: point.x, y: point.y, yaw: pose.yaw }; }")],
      hints: ["A pose is a point plus a heading.", "Transform the point, then add the yaws and wrap.", "Use transformPoint for x, y and wrapAngle(transform.yaw + pose.yaw) for yaw."],
      cases: [
        example([{ x: 2, y: 1, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 2, y: 2, yaw: PI }, "pose composition"),
        example([{ x: 0, y: 0, yaw: 3 * PI / 4 }, { x: 0, y: 0, yaw: 3 * PI / 4 }], { x: 0, y: 0, yaw: -PI / 2 }, "yaw wrapping"),
        example([{ x: 1, y: -1, yaw: 0 }, { x: 2, y: 2, yaw: 0.3 }], { x: 3, y: 1, yaw: 0.3 }, "pure translation"),
      ],
    }),
    puzzle({
      number: 9, id: "compose", title: "Chain Two Transforms",
      goal: "Create T_a_c from T_a_b and T_b_c.",
      concept: "The right operand acts first; the child origin is pushed through the parent transform.",
      functionName: "compose", signature: "compose(aFromB, bFromC) → aFromC",
      starterSource: starter("compose", "aFromB, bFromC", "Push c's origin through aFromB, then add the yaws."),
      referenceSource: lines(
        "function compose(aFromB, bFromC) {",
        "  var origin = transformPoint(aFromB, { x: bFromC.x, y: bFromC.y });",
        "  return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["transform-point", "wrap-angle"],
      scene: { kind: "frame-chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ] },
      diagnoses: [
        diagnosis("reversed-order", "Composed in the wrong order: the right operand acts first, so c's origin must be pushed through aFromB, not the other way round.", "function compose(aFromB, bFromC) { var origin = transformPoint(bFromC, { x: aFromB.x, y: aFromB.y }); return { x: origin.x, y: origin.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
        diagnosis("translation-unrotated", "Child translation was not rotated by the parent yaw before adding.", "function compose(aFromB, bFromC) { return { x: aFromB.x + bFromC.x, y: aFromB.y + bFromC.y, yaw: wrapAngle(aFromB.yaw + bFromC.yaw) }; }"),
      ],
      hints: ["Follow the names: a←b then b←c gives a←c.", "The child's origin lives in b; move it into a with aFromB, then add the yaws.", "origin = transformPoint(aFromB, bFromC); yaw = wrapAngle(aFromB.yaw + bFromC.yaw)."],
      cases: [
        example([{ x: 10, y: 0, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 10, y: 1, yaw: PI }, "turning chain"),
        example([{ x: 2, y: -1, yaw: -PI / 2 }, { x: 0, y: 3, yaw: PI }], { x: 5, y: -1, yaw: PI / 2 }, "order-sensitive chain"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: 0.5 }], { x: 4, y: 2, yaw: 0.5 }, "identity parent"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 1, y: 0, yaw: 0 }], { x: 0, y: 1, yaw: -PI }, "half-turn parent"),
      ],
    }),
    puzzle({
      number: 10, id: "invert", title: "Walk an Edge Backward",
      goal: "Invert a rigid transform so target and source exchange roles.",
      concept: "Negate the yaw, then express the reversed translation in the rotated frame.",
      functionName: "invert", signature: "invert(transform) → inverse",
      starterSource: starter("invert", "transform", "Negate yaw; rotate the negated translation by the negated yaw."),
      referenceSource: lines(
        "function invert(transform) {",
        "  var yaw = -transform.yaw;",
        "  var shifted = rotateVector({ x: -transform.x, y: -transform.y }, yaw);",
        "  return { x: shifted.x, y: shifted.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["rotate-vector"],
      scene: { kind: "frame-inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated: the reversed translation must also be rotated by −yaw.", "function invert(transform) { return { x: -transform.x, y: -transform.y, yaw: -transform.yaw }; }"),
        diagnosis("rotated-by-positive-yaw", "Rotated the reversed translation by +yaw instead of −yaw.", "function invert(transform) { var shifted = rotateVector({ x: -transform.x, y: -transform.y }, transform.yaw); return { x: shifted.x, y: shifted.y, yaw: -transform.yaw }; }"),
      ],
      hints: ["The inverse walks the same edge backward.", "Negate the yaw, then express the reversed translation in the rotated frame.", "yaw′ = −yaw; t′ = rotateVector(−t, yaw′)."],
      cases: [
        example([{ x: 3, y: 1, yaw: PI / 2 }], { x: -1, y: 3, yaw: -PI / 2 }, "quarter-turn inverse"),
        example([{ x: 2, y: -4, yaw: 0 }], { x: -2, y: 4, yaw: 0 }, "translation inverse"),
        example([{ x: 0, y: 0, yaw: PI / 3 }], { x: 0, y: 0, yaw: -PI / 3 }, "rotation inverse"),
        example([{ x: 1, y: 1, yaw: PI }], { x: 1, y: 1, yaw: -PI }, "half-turn inverse"),
      ],
    }),
    puzzle({
      number: 11, id: "relative-transform", title: "Where Is b, Seen From a?",
      goal: "Compute aFromB from two world poses.",
      concept: "This is lookup in miniature: go from b up to world, then from world down into a.",
      functionName: "relativeTransform", signature: "relativeTransform(worldFromA, worldFromB) → aFromB",
      starterSource: starter("relativeTransform", "worldFromA, worldFromB", "Invert a, then compose with b."),
      referenceSource: "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromA), worldFromB); }",
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert"],
      scene: { kind: "two-frames", handles: [
        { id: "worldFromA", type: "frame", label: "a", value: { x: -1.5, y: 0.5, yaw: PI / 4 } },
        { id: "worldFromB", type: "frame", label: "b", value: { x: 2, y: 1.5, yaw: -PI / 6 } },
      ] },
      diagnoses: [
        diagnosis("reversed", "Reversed: this is bFromA. aFromB expresses b in a's coordinates, so invert a and then apply b.", "function relativeTransform(worldFromA, worldFromB) { return compose(invert(worldFromB), worldFromA); }"),
        diagnosis("difference-only", "Subtracted world positions without rotating into a's frame.", "function relativeTransform(worldFromA, worldFromB) { return { x: worldFromB.x - worldFromA.x, y: worldFromB.y - worldFromA.y, yaw: wrapAngle(worldFromB.yaw - worldFromA.yaw) }; }"),
      ],
      hints: ["Where is b, as seen from a?", "Go from b up to world, then from world down into a: invert a, then compose.", "Return compose(invert(worldFromA), worldFromB)."],
      cases: [
        example([{ x: 1, y: 0, yaw: PI / 2 }, { x: 1, y: 2, yaw: PI / 2 }], { x: 2, y: 0, yaw: 0 }, "b ahead of a"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 3, y: 2, yaw: 0.5 }], { x: 3, y: 2, yaw: 0.5 }, "a is the world"),
        example([{ x: 2, y: 2, yaw: PI }, { x: 2, y: 0, yaw: PI }], { x: 0, y: 2, yaw: 0 }, "b beside a"),
      ],
    }),
  ];

  const ROBOT_TREE_CASE = {
    odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } },
    base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } },
    laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } },
  };

  const STAGE_3_4 = [
    puzzle({
      number: 12, id: "store-edge", title: "Store One TF Edge",
      goal: "Store parentFromChild under the child name without mutating the current tree.",
      concept: "Every non-root frame has exactly one parent, so the child name is the key.",
      functionName: "storeEdge", signature: "storeEdge(tree, edge) → newTree",
      starterSource: starter("storeEdge", "tree, edge"),
      referenceSource: lines(
        "function storeEdge(tree, edge) {",
        "  var next = Object.assign({}, tree);",
        "  next[edge.child] = { parent: edge.parent, transform: edge.transform };",
        "  return next;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "tree-result", handles: [
        { id: "edge", type: "selector", label: "edge to add", value: "base_link", options: ["odom", "base_link", "laser", "camera"] },
      ], args: [{ fixture: "treeWithoutEdge" }, { fixture: "selectedEdge" }] },
      hints: ["The child uniquely identifies its incoming edge.", "Copy the tree, then assign next[edge.child].", "Store both parent and parentFromChild transform under the child key."],
      cases: [
        example([{}, { parent: "map", child: "odom", transform: { x: 1, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, "first edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "odom", child: "base_link", transform: { x: 2, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } } }, "second edge"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "base_link", child: "laser", transform: { x: 0.5, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, "detached edge"),
      ],
    }),
    puzzle({
      number: 13, id: "ancestor-chain", title: "Climb to the Root",
      goal: "List a frame and every ancestor until the root frame.",
      concept: "Each child record points one step upward; the root has no incoming edge.",
      functionName: "ancestorChain", signature: "ancestorChain(tree, frame) → frame[]",
      starterSource: starter("ancestorChain", "tree, frame"),
      referenceSource: lines(
        "function ancestorChain(tree, frame) {",
        "  var chain = [frame];",
        "  var current = frame;",
        "  while (tree[current]) { current = tree[current].parent; chain.push(current); }",
        "  return chain;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "node-list", handles: [
        { id: "frame", type: "selector", label: "frame", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "frame" }] },
      hints: ["Each child record points one step upward.", "Repeat while tree[current] exists.", "Push the parent, make it current, and stop at a name with no incoming edge."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser"], ["laser", "base_link", "odom", "map"], "sensor chain"),
        example([{ child: { parent: "root" } }, "root"], ["root"], "already root"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, camera: { parent: "base_link" } }, "base_link"], ["base_link", "odom", "map"], "middle of the chain"),
      ],
    }),
    puzzle({
      number: 14, id: "common-ancestor", title: "Find the Join",
      goal: "Find the nearest frame shared by two ancestor chains.",
      concept: "Every lookup passes through exactly one nearest common ancestor.",
      functionName: "commonAncestor", signature: "commonAncestor(tree, a, b) → frame | null",
      starterSource: starter("commonAncestor", "tree, a, b"),
      referenceSource: lines(
        "function commonAncestor(tree, a, b) {",
        "  var aChain = ancestorChain(tree, a);",
        "  var bSet = new Set(ancestorChain(tree, b));",
        "  for (var i = 0; i < aChain.length; i += 1) { if (bSet.has(aChain[i])) return aChain[i]; }",
        "  return null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["ancestor-chain"],
      scene: { kind: "tree", view: "single-node", handles: [
        { id: "a", type: "selector", label: "a", value: "laser", options: FRAME_OPTIONS },
        { id: "b", type: "selector", label: "b", value: "camera", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "a" }, { handle: "b" }] },
      hints: ["Start from one frame so the first match is the nearest.", "Put one chain in a Set, then scan the other from its frame upward.", "Return null when the roots are disconnected."],
      cases: [
        example([{ left: { parent: "base" }, right: { parent: "base" }, base: { parent: "map" } }, "left", "right"], "base", "sibling join"),
        example([{ a: { parent: "rootA" }, b: { parent: "rootB" } }, "a", "b"], null, "disconnected roots"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser", "odom"], "odom", "ancestor is the join"),
      ],
    }),
    puzzle({
      number: 15, id: "directed-path", title: "Mark the Traversal",
      goal: "Build source-to-target steps and mark when an edge must be inverted.",
      concept: "Child-to-parent uses the stored edge; parent-to-child needs its inverse.",
      functionName: "directedPath", signature: "directedPath(tree, target, source) → step[] | null",
      starterSource: starter("directedPath", "tree, target, source"),
      referenceSource: lines(
        "function directedPath(tree, target, source) {",
        "  var join = commonAncestor(tree, target, source);",
        "  if (join === null) return null;",
        "  var steps = [];",
        "  var current = source;",
        "  while (current !== join) { var up = tree[current]; steps.push({ from: current, to: up.parent, child: current, inverse: false }); current = up.parent; }",
        "  var targetChain = ancestorChain(tree, target);",
        "  var down = targetChain.slice(0, targetChain.indexOf(join)).reverse();",
        "  for (var i = 0; i < down.length; i += 1) { steps.push({ from: tree[down[i]].parent, to: down[i], child: down[i], inverse: true }); }",
        "  return steps;",
        "}"
      ),
      comparator: "path", walkthroughChapter: "lookup",
      dependencies: ["ancestor-chain", "common-ancestor"],
      scene: { kind: "tree", view: "steps", handles: [
        { id: "target", type: "selector", label: "target", value: "map", options: FRAME_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: FRAME_OPTIONS },
      ], args: [{ fixture: "tree" }, { handle: "target" }, { handle: "source" }] },
      hints: ["Walk source upward normally, then walk from the join down toward target.", "Child-to-parent uses stored parentFromChild; parent-to-child needs its inverse.", "Build the upward steps first, then reverse target's pre-join ancestor slice for downward steps."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "map", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "odom", child: "base_link", inverse: false }, { from: "odom", to: "map", child: "odom", inverse: false }], "upward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" } }, "base_link", "map"], [{ from: "map", to: "odom", child: "odom", inverse: true }, { from: "odom", to: "base_link", child: "base_link", inverse: true }], "downward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" }, camera: { parent: "base_link" } }, "camera", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "camera", child: "camera", inverse: true }], "sibling lookup"),
      ],
    }),
    puzzle({
      number: 16, id: "validate-tree", title: "Protect the Tree",
      goal: "Reject duplicate parents and cycles before accepting TF edges.",
      concept: "TF allows one parent per child and no frame may be its own ancestor.",
      functionName: "validateTree", signature: "validateTree(edges) → { valid, code? }",
      starterSource: starter("validateTree", "edges"),
      referenceSource: lines(
        "function validateTree(edges) {",
        "  var parents = {};",
        "  for (var i = 0; i < edges.length; i += 1) { if (parents[edges[i].child] && parents[edges[i].child] !== edges[i].parent) return { valid: false, code: \"DUPLICATE_PARENT\" }; parents[edges[i].child] = edges[i].parent; }",
        "  var children = Object.keys(parents);",
        "  for (var j = 0; j < children.length; j += 1) { var seen = new Set(); var current = children[j]; while (parents[current]) { if (seen.has(current)) return { valid: false, code: \"CYCLE\" }; seen.add(current); current = parents[current]; } }",
        "  return { valid: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "tree",
      scene: { kind: "tree", view: "validation", handles: [
        { id: "edgeSet", type: "selector", label: "edge set", value: "duplicate-parent", options: ["valid-chain", "duplicate-parent", "cycle"] },
      ], args: [{ fixture: "edgeSet" }] },
      hints: ["TF allows only one parent for each child.", "After recording parents, walk upward from every child and watch for repeats.", "Return DUPLICATE_PARENT first; otherwise return CYCLE when an ancestor repeats."],
      cases: [
        example([[{ parent: "map", child: "base" }, { parent: "odom", child: "base" }]], { valid: false, code: "DUPLICATE_PARENT" }, "duplicate parent"),
        example([[{ parent: "a", child: "b" }, { parent: "b", child: "a" }]], { valid: false, code: "CYCLE" }, "cycle"),
        example([[{ parent: "map", child: "odom" }, { parent: "odom", child: "base" }]], { valid: true }, "valid chain"),
      ],
    }),
    puzzle({
      number: 17, id: "lookup-transform", title: "Resolve T_target_source",
      goal: "Compose each directed path step to answer a transform lookup.",
      concept: "Start with identity at the source; every step goes on the left, inverted when it walks downward.",
      functionName: "lookupTransform", signature: "lookupTransform(tree, target, source) → transform | null",
      starterSource: starter("lookupTransform", "tree, target, source"),
      referenceSource: lines(
        "function lookupTransform(tree, target, source) {",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return null;",
        "  var result = { x: 0, y: 0, yaw: 0 };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = tree[steps[i].child].transform;",
        "    var step = steps[i].inverse ? invert(edge) : edge;",
        "    result = compose(step, result);",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "lookup",
      dependencies: ["compose", "invert", "directed-path"],
      scene: { kind: "robot-chain", view: "lookup", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 2, y: 0, yaw: PI / 2 }, in: "odom" },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "chainTree" }, { handle: "target" }, { handle: "source" }] },
      diagnoses: [
        diagnosis("inverse-flags-ignored", "Inverse flags ignored: a step that walks parent → child must use invert(edge).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { result = compose(tree[steps[i].child].transform, result); }",
          "  return result;",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: each new step goes on the left, compose(step, result).", lines(
          "function lookupTransform(tree, target, source) {",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return null;",
          "  var result = { x: 0, y: 0, yaw: 0 };",
          "  for (var i = 0; i < steps.length; i += 1) { var edge = tree[steps[i].child].transform; var step = steps[i].inverse ? invert(edge) : edge; result = compose(result, step); }",
          "  return result;",
          "}"
        )),
      ],
      hints: ["Start with identity at the source frame.", "For every step, invert only the downward traversal and left-compose it.", "result = compose(stepTransform, result)."],
      cases: [
        example([ROBOT_TREE_CASE, "map", "laser"], { x: 3, y: 1, yaw: PI / 2 }, "map from laser"),
        example([ROBOT_TREE_CASE, "laser", "map"], { x: -1, y: 3, yaw: -PI / 2 }, "laser from map"),
        example([ROBOT_TREE_CASE, "odom", "laser"], { x: 2, y: 1, yaw: PI / 2 }, "odom from laser"),
        example([{ a: { parent: "rootA", transform: { x: 0, y: 0, yaw: 0 } }, b: { parent: "rootB", transform: { x: 1, y: 0, yaw: 0 } } }, "a", "b"], null, "disconnected"),
      ],
    }),
    puzzle({
      number: 18, id: "laser-point-to-map", title: "Project a Laser Point",
      goal: "Transform a measurement from laser coordinates into map coordinates.",
      concept: "If the math is right, the projected hit stays glued to the landmark while the robot moves.",
      functionName: "laserPointToMap", signature: "laserPointToMap(tree, pointInLaser) → pointInMap",
      starterSource: starter("laserPointToMap", "tree, pointInLaser"),
      referenceSource: lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var mapFromLaser = lookupTransform(tree, \"map\", \"laser\");",
        "  return transformPoint(mapFromLaser, pointInLaser);",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      dependencies: ["lookup-transform", "transform-point"],
      scene: { kind: "robot-chain", view: "landmark", handles: [
        { id: "odom", type: "frame", label: "odom", value: { x: 1, y: 0.5, yaw: 0.2 } },
        { id: "base_link", type: "frame", label: "base_link", value: { x: 1.5, y: 0, yaw: 0.6 }, in: "odom" },
      ], args: [{ fixture: "chainTree" }, { fixture: "laserHit" }] },
      diagnoses: [diagnosis("wrong-direction", "Wrong direction: you applied laserFromMap. The point starts in laser, so you need mapFromLaser (target first).", lines(
        "function laserPointToMap(tree, pointInLaser) {",
        "  var laserFromMap = lookupTransform(tree, \"laser\", \"map\");",
        "  return transformPoint(laserFromMap, pointInLaser);",
        "}"
      ))],
      hints: ["The point starts in laser and must end in map.", "Ask for mapFromLaser; the target name comes first.", "transformPoint(lookupTransform(tree, \"map\", \"laser\"), pointInLaser)."],
      cases: [
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, { x: 1, y: 0 }], { x: 4.5, y: 0 }, "forward laser hit"),
        example([{ odom: { parent: "map", transform: { x: 0, y: 0, yaw: PI / 2 } }, base_link: { parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0, y: 0, yaw: 0 } } }, { x: 2, y: 0 }], { x: 0, y: 3 }, "rotated map frame"),
        example([ROBOT_TREE_CASE, { x: 0, y: 1 }], { x: 2, y: 1 }, "sideways hit"),
      ],
    }),
    puzzle({
      number: 19, id: "correction-from-pose", title: "Publish map → odom",
      goal: "Turn a corrected robot pose into the map → odom transform without touching odom → base_link.",
      concept: "A localizer or SLAM node never rewrites odometry; it publishes the correction above it.",
      functionName: "correctionFromPose", signature: "correctionFromPose(mapFromBase, odomFromBase) → mapFromOdom",
      starterSource: starter("correctionFromPose", "mapFromBase, odomFromBase"),
      referenceSource: "function correctionFromPose(mapFromBase, odomFromBase) { return compose(mapFromBase, invert(odomFromBase)); }",
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["compose", "invert"],
      scene: { kind: "correction", handles: [
        { id: "odomInMap", type: "frame", label: "odom (drifted)", value: { x: 1.5, y: -0.5, yaw: 0.35 } },
        { id: "odomFromBase", type: "pose", label: "base_link (odometry)", value: { x: 2, y: 0.5, yaw: 0.2 }, in: "odomInMap" },
      ], args: [{ fixture: "mapFromBase" }, { handle: "odomFromBase" }] },
      diagnoses: [
        diagnosis("reversed", "Reversed: that is odomFromMap. map → odom must satisfy mapFromBase = compose(mapFromOdom, odomFromBase).", "function correctionFromPose(mapFromBase, odomFromBase) { return compose(odomFromBase, invert(mapFromBase)); }"),
        diagnosis("difference-only", "Subtracted poses component-wise: the odometry translation must be rotated by the yaw correction first.", "function correctionFromPose(mapFromBase, odomFromBase) { return { x: mapFromBase.x - odomFromBase.x, y: mapFromBase.y - odomFromBase.y, yaw: wrapAngle(mapFromBase.yaw - odomFromBase.yaw) }; }"),
      ],
      hints: ["mapFromBase = mapFromOdom ∘ odomFromBase; solve for mapFromOdom.", "Right-multiply both sides by invert(odomFromBase).", "Return compose(mapFromBase, invert(odomFromBase))."],
      cases: [
        example([{ x: 5, y: 3, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 5, y: 1, yaw: PI / 2 }, "rotated correction"),
        example([{ x: 0, y: 2, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { x: 0, y: 0, yaw: PI / 2 }, "global yaw correction"),
        example([{ x: 3, y: 3, yaw: 0 }, { x: 3, y: 3, yaw: 0 }], { x: 0, y: 0, yaw: 0 }, "no drift"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 0, yaw: PI / 2 }], { x: 1, y: 1, yaw: PI / 2 }, "pure yaw drift"),
      ],
    }),
  ];

  const SAMPLE_HISTORY = [
    { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
    { time: 2, transform: { x: 2, y: 0, yaw: 0 } },
    { time: 5, transform: { x: 5, y: 0, yaw: 0 } },
    { time: 9, transform: { x: 9, y: 0, yaw: 0 } },
  ];
  const DYNAMIC_EDGE_CASE = {
    parent: "map", child: "odom",
    samples: [
      { time: 0, transform: { x: 0, y: 0, yaw: 0 } },
      { time: 4, transform: { x: 4, y: 0, yaw: PI / 2 } },
      { time: 10, transform: { x: 4, y: 6, yaw: PI / 2 } },
    ],
  };
  const STAMPED_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 10, y: 0, yaw: 0 } }] },
    { parent: "odom", child: "base_link", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 6, transform: { x: 6, y: 0, yaw: 0 } }] },
    { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } },
  ];
  const HALF = Math.SQRT1_2;
  const Z90 = { x: 0, y: 0, z: HALF, w: HALF };
  const Y90 = { x: 0, y: HALF, z: 0, w: HALF };
  const IDENTITY_Q = { x: 0, y: 0, z: 0, w: 1 };

  const STAGE_5_7 = [
    puzzle({
      number: 20, id: "interpolate-transform", title: "Blend Two Poses",
      goal: "Interpolate translation linearly and yaw along the shortest turn.",
      concept: "TF2 blends between the two samples that surround a query time.",
      functionName: "interpolateTransform", signature: "interpolateTransform(a, b, amount) → transform",
      starterSource: starter("interpolateTransform", "a, b, amount"),
      referenceSource: lines(
        "function interpolateTransform(a, b, amount) {",
        "  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "time-buffer",
      dependencies: ["yaw-delta", "wrap-angle"],
      scene: { kind: "pose-lerp", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -3, y: -1, yaw: 2.9 } },
        { id: "b", type: "pose", label: "b", value: { x: 2.5, y: 1.5, yaw: -2.7 } },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ] },
      diagnoses: [
        diagnosis("yaw-long-way", "Yaw went the long way around: use yawDelta so the turn crosses ±π on the short side.", "function interpolateTransform(a, b, amount) { return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount, yaw: wrapAngle(a.yaw + (b.yaw - a.yaw) * amount) }; }"),
        diagnosis("amount-inverted", "Amount inverted: amount 0 must return a and amount 1 must return b.", "function interpolateTransform(a, b, amount) { return { x: b.x + (a.x - b.x) * amount, y: b.y + (a.y - b.y) * amount, yaw: wrapAngle(b.yaw + yawDelta(b.yaw, a.yaw) * amount) }; }"),
      ],
      hints: ["amount 0 selects a; amount 1 selects b.", "Blend x and y linearly; blend yaw along yawDelta(a.yaw, b.yaw).", "yaw = wrapAngle(a.yaw + yawDelta(a.yaw, b.yaw) * amount)."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 4, y: 2, yaw: PI / 2 }, 0.5], { x: 2, y: 1, yaw: PI / 4 }, "midpoint"),
        example([{ x: 0, y: 2, yaw: 170 * PI / 180 }, { x: 10, y: 6, yaw: -170 * PI / 180 }, 0.5], { x: 5, y: 4, yaw: PI }, "across the wrap"),
        example([{ x: -4, y: 8, yaw: 0.5 }, { x: 2, y: -4, yaw: 0.5 }, 0.5], { x: -1, y: 2, yaw: 0.5 }, "constant yaw"),
        example([{ x: 1, y: 1, yaw: 1 }, { x: 2, y: 2, yaw: 2 }, 0], { x: 1, y: 1, yaw: 1 }, "amount zero"),
      ],
    }),
    puzzle({
      number: 21, id: "bracket-samples", title: "Find the Surrounding Samples",
      goal: "Locate the two samples around a time and the fraction between them.",
      concept: "A buffer answers a time by bracketing it, then interpolating.",
      functionName: "bracketSamples", signature: "bracketSamples(samples, time) → { beforeIndex, afterIndex, amount }",
      starterSource: starter("bracketSamples", "samples, time"),
      referenceSource: lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: (time - samples[i].time) / (samples[i + 1].time - samples[i].time) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline", handles: [
        { id: "time", type: "timeline", label: "time", value: 3.4, start: -1, end: 11 },
      ], args: [{ fixture: "samples" }, { handle: "time" }] },
      diagnoses: [diagnosis("amount-unnormalized", "Amount is not normalized: divide by the gap between the two samples so it runs from 0 to 1.", lines(
        "function bracketSamples(samples, time) {",
        "  var last = samples.length - 1;",
        "  if (time < samples[0].time) return { beforeIndex: 0, afterIndex: 0, amount: 0 };",
        "  if (time >= samples[last].time) return { beforeIndex: last, afterIndex: last, amount: 0 };",
        "  var i = 0;",
        "  while (samples[i + 1].time <= time) i += 1;",
        "  return { beforeIndex: i, afterIndex: i + 1, amount: time - samples[i].time };",
        "}"
      ))],
      hints: ["Find the two samples that surround the time.", "amount = (time − before.time) / (after.time − before.time); clamp outside the history.", "Walk the samples while the next one is still at or before time."],
      cases: [
        example([SAMPLE_HISTORY, 3], { beforeIndex: 1, afterIndex: 2, amount: 1 / 3 }, "between samples"),
        example([SAMPLE_HISTORY, 2], { beforeIndex: 1, afterIndex: 2, amount: 0 }, "exactly on a sample"),
        example([SAMPLE_HISTORY, -1], { beforeIndex: 0, afterIndex: 0, amount: 0 }, "before the history"),
        example([SAMPLE_HISTORY, 12], { beforeIndex: 3, afterIndex: 3, amount: 0 }, "after the history"),
        example([SAMPLE_HISTORY, 0], { beforeIndex: 0, afterIndex: 1, amount: 0 }, "on the first sample"),
      ],
    }),
    puzzle({
      number: 22, id: "latest-common-time", title: "Find a Valid Query Time",
      goal: "Intersect dynamic buffer ranges and classify past or future extrapolation.",
      concept: "TimePointZero means the latest time every edge on the path can answer.",
      functionName: "latestCommonTime", signature: "latestCommonTime(ranges, requestedTime) → availability",
      starterSource: starter("latestCommonTime", "ranges, requestedTime"),
      referenceSource: lines(
        "function latestCommonTime(ranges, requestedTime) {",
        "  var start = Math.max.apply(null, ranges.map(function (range) { return range.start; }));",
        "  var end = Math.min.apply(null, ranges.map(function (range) { return range.end; }));",
        "  if (start > end) return { ok: false, code: \"NO_COMMON_TIME\", bounds: { start: start, end: end } };",
        "  var time = requestedTime === null ? end : requestedTime;",
        "  if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\", bounds: { start: start, end: end } };",
        "  return { ok: true, time: time, bounds: { start: start, end: end } };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      scene: { kind: "timeline-ranges", handles: [
        { id: "requested", type: "timeline", label: "requested time", value: 5, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
      ], args: [{ fixture: "ranges" }, { fixture: "requestedOrNull" }] },
      hints: ["The common start is the maximum start; the common end is the minimum end.", "No overlap occurs when the common start exceeds the common end.", "Use the common end for latest; classify requests below start as past and above end as future."],
      cases: [
        example([[{ start: 0, end: 8 }, { start: 2, end: 6 }], null], { ok: true, time: 6, bounds: { start: 2, end: 6 } }, "latest overlap"),
        example([[{ start: 2, end: 4 }], 1], { ok: false, code: "PAST_EXTRAPOLATION", bounds: { start: 2, end: 4 } }, "past request"),
        example([[{ start: 0, end: 1 }, { start: 2, end: 3 }], null], { ok: false, code: "NO_COMMON_TIME", bounds: { start: 2, end: 1 } }, "no overlap"),
        example([[{ start: 0, end: 5 }], 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
      ],
    }),
    puzzle({
      number: 23, id: "sample-edge", title: "Sample an Edge at a Time",
      goal: "Return the transform an edge reports at a time: static passthrough or bracketed interpolation.",
      concept: "Static edges are valid at every time; dynamic edges interpolate their history.",
      functionName: "sampleEdge", signature: "sampleEdge(edge, time) → transform",
      starterSource: starter("sampleEdge", "edge, time"),
      referenceSource: lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  return interpolateTransform(edge.samples[bracket.beforeIndex].transform, edge.samples[bracket.afterIndex].transform, bracket.amount);",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "broadcasters",
      dependencies: ["bracket-samples", "interpolate-transform"],
      scene: { kind: "timeline-frame", handles: [
        { id: "time", type: "timeline", label: "time", value: 2.5, start: -1, end: 11 },
        { id: "edgeKind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "edge" }, { handle: "time" }] },
      diagnoses: [diagnosis("nearest-sample", "Snapped to the nearest sample: TF2 interpolates between the surrounding samples.", lines(
        "function sampleEdge(edge, time) {",
        "  if (edge.isStatic) return { x: edge.transform.x, y: edge.transform.y, yaw: edge.transform.yaw };",
        "  var bracket = bracketSamples(edge.samples, time);",
        "  var index = bracket.amount < 0.5 ? bracket.beforeIndex : bracket.afterIndex;",
        "  var t = edge.samples[index].transform;",
        "  return { x: t.x, y: t.y, yaw: t.yaw };",
        "}"
      ))],
      hints: ["A static edge ignores time.", "Bracket the samples, then interpolate between the two transforms.", "interpolateTransform(before.transform, after.transform, bracket.amount)."],
      cases: [
        example([DYNAMIC_EDGE_CASE, 2], { x: 2, y: 0, yaw: PI / 4 }, "halfway through the first segment"),
        example([DYNAMIC_EDGE_CASE, 7], { x: 4, y: 3, yaw: PI / 2 }, "second segment"),
        example([DYNAMIC_EDGE_CASE, 12], { x: 4, y: 6, yaw: PI / 2 }, "clamped after the history"),
        example([{ parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } }, 99], { x: 1, y: 0, yaw: 0 }, "static edge"),
      ],
    }),
    puzzle({
      number: 24, id: "quaternion-multiply", title: "Multiply Quaternions",
      goal: "Compute the Hamilton product a × b.",
      concept: "Rotations compose by quaternion multiplication, and the order matters.",
      functionName: "quaternionMultiply", signature: "quaternionMultiply(a, b) → quaternion",
      starterSource: starter("quaternionMultiply", "a, b"),
      referenceSource: lines(
        "function quaternionMultiply(a, b) {",
        "  return {",
        "    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,",
        "    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,",
        "    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,",
        "    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,",
        "  };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      scene: { kind: "se3", view: "multiply", handles: [
        { id: "yawA", type: "slider", label: "a: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "quatA" }, { fixture: "quatB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied in the wrong order: quaternion products do not commute; compute a × b with a on the left.", lines(
          "function quaternionMultiply(b, a) {",
          "  return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z };",
          "}"
        )),
        diagnosis("component-sum", "Added components: rotations compose by the Hamilton product, not by adding quaternions.", "function quaternionMultiply(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, w: a.w + b.w }; }"),
      ],
      hints: ["A quaternion is a scalar w plus a vector (x, y, z).", "w′ = w₁w₂ − v₁·v₂; v′ = w₁v₂ + w₂v₁ + v₁×v₂.", "Write the four component formulas of the Hamilton product with a on the left."],
      cases: [
        example([Z90, Z90], { x: 0, y: 0, z: 1, w: 0 }, "two quarter turns"),
        example([IDENTITY_Q, Z90], Z90, "identity on the left"),
        example([Z90, Y90], { x: -0.5, y: 0.5, z: 0.5, w: 0.5 }, "Z then Y"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 0, y: 0, z: 0, w: 3 }], { x: 0, y: 0, z: 0, w: 6 }, "scalars multiply"),
      ],
    }),
    puzzle({
      number: 25, id: "rotate-by-quaternion", title: "Rotate with a Quaternion",
      goal: "Normalize a quaternion and rotate a 3D vector with it.",
      concept: "q v q⁻¹ rotates the pure quaternion v; the conjugate of a unit quaternion is its inverse.",
      functionName: "rotateByQuaternion", signature: "rotateByQuaternion(q, v) → vector3",
      starterSource: starter("rotateByQuaternion", "q, v"),
      referenceSource: lines(
        "function rotateByQuaternion(q, v) {",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
        "  var rotated = quaternionMultiply(quaternionMultiply(unit, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
        "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      scene: { kind: "se3", view: "rotate", handles: [
        { id: "yaw", type: "slider", label: "q: yaw about Z", value: PI / 2, min: -PI, max: PI },
      ], args: [{ fixture: "quat" }, { fixture: "vector" }] },
      diagnoses: [
        diagnosis("inverse-rotation", "Rotated the wrong way: q⁻¹ v q is the inverse rotation. Use q v q⁻¹.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "  var conjugate = { x: -unit.x, y: -unit.y, z: -unit.z, w: unit.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(conjugate, { x: v.x, y: v.y, z: v.z, w: 0 }), unit);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized first, so the vector length was scaled.", lines(
          "function rotateByQuaternion(q, v) {",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var rotated = quaternionMultiply(quaternionMultiply(q, { x: v.x, y: v.y, z: v.z, w: 0 }), conjugate);",
          "  return { x: rotated.x, y: rotated.y, z: rotated.z };",
          "}"
        )),
      ],
      hints: ["A valid rotation quaternion has unit length.", "Treat v as a pure quaternion with w = 0 and compute q v q⁻¹.", "For a unit q, q⁻¹ is the conjugate (−x, −y, −z, w)."],
      cases: [
        example([Z90, { x: 1, y: 0, z: 0 }], { x: 0, y: 1, z: 0 }, "Z quarter turn"),
        example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 1, y: -2, z: 3 }], { x: 1, y: -2, z: 3 }, "non-unit identity"),
        example([Y90, { x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 26, id: "compose-se3", title: "Compose SE(3)",
      goal: "Rotate the child translation, add it to the parent translation, and multiply rotations.",
      concept: "SE(3) composition has the same rotate-then-translate structure as SE(2).",
      functionName: "composeSE3", signature: "composeSE3(aFromB, bFromC) → aFromC",
      starterSource: starter("composeSE3", "aFromB, bFromC"),
      referenceSource: lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var shifted = rotateByQuaternion(aFromB.rotation, bFromC.translation);",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return {",
        "    translation: { x: aFromB.translation.x + shifted.x, y: aFromB.translation.y + shifted.y, z: aFromB.translation.z + shifted.z },",
        "    rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length },",
        "  };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "se3",
      dependencies: ["rotate-by-quaternion", "quaternion-multiply"],
      scene: { kind: "se3", view: "compose", handles: [
        { id: "yawA", type: "slider", label: "a→b: yaw about Z", value: PI / 2, min: -PI, max: PI },
        { id: "pitchB", type: "slider", label: "b→c: pitch about Y", value: PI / 4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromB" }, { fixture: "bFromC" }] },
      diagnoses: [diagnosis("translation-unrotated", "Child translation was not rotated by the parent rotation before adding.", lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var q = quaternionMultiply(aFromB.rotation, bFromC.rotation);",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { translation: { x: aFromB.translation.x + bFromC.translation.x, y: aFromB.translation.y + bFromC.translation.y, z: aFromB.translation.z + bFromC.translation.z }, rotation: { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length } };",
        "}"
      ))],
      hints: ["SE(3) composition has the same rotate-then-translate structure as SE(2).", "Rotate bFromC.translation by aFromB.rotation before adding.", "Multiply quaternions parent × child and normalize the result."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }, { translation: { x: 0, y: 2, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 2, z: 0 }, rotation: IDENTITY_Q }, "translation chain"),
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 1, y: 1, z: 0 }, rotation: Z90 }, "rotated child translation"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }, { translation: { x: 1, y: 0, z: 0 }, rotation: IDENTITY_Q }], { translation: { x: 0, y: 0, z: 0 }, rotation: Y90 }, "pitch pushes X down"),
      ],
    }),
    puzzle({
      number: 27, id: "stamped-lookup", title: "Answer a Stamped Lookup",
      goal: "Resolve a source-to-target transform at a requested or latest common time.",
      concept: "A lookup is a pipeline: choose the time, sample every edge, build the tree, traverse.",
      functionName: "lookupStampedTransform", signature: "lookupStampedTransform(edges, target, source, requestedTime) → result",
      starterSource: starter("lookupStampedTransform", "edges, target, source, requestedTime"),
      referenceSource: lines(
        "function lookupStampedTransform(edges, target, source, requestedTime) {",
        "  var ranges = [];",
        "  for (var i = 0; i < edges.length; i += 1) {",
        "    if (!edges[i].isStatic) ranges.push({ start: edges[i].samples[0].time, end: edges[i].samples[edges[i].samples.length - 1].time });",
        "  }",
        "  var availability = ranges.length ? latestCommonTime(ranges, requestedTime) : { ok: true, time: requestedTime === null ? 0 : requestedTime };",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  for (var j = 0; j < edges.length; j += 1) {",
        "    tree = storeEdge(tree, { parent: edges[j].parent, child: edges[j].child, transform: sampleEdge(edges[j], availability.time) });",
        "  }",
        "  return { ok: true, time: availability.time, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["sample-edge", "latest-common-time", "store-edge", "lookup-transform"],
      scene: { kind: "robot-chain-time", handles: [
        { id: "time", type: "timeline", label: "requested time", value: 4, start: 0, end: 10 },
        { id: "mode", type: "selector", label: "time", value: "requested", options: ["requested", "latest"] },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "source" }, { fixture: "requestedOrNull" }] },
      hints: ["A lookup is a pipeline: choose time, sample edges, build the tree, traverse.", "Use the intersection of all dynamic histories; static edges are valid at every time.", "sampleEdge every edge at the resolved time, storeEdge each one, then lookupTransform on the sampled tree."],
      cases: [
        example([STAMPED_EDGES_CASE, "map", "laser", null], { ok: true, time: 6, transform: { x: 13, y: 0, yaw: 0 } }, "latest stamped lookup"),
        example([[{ parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, transform: { x: 5, y: 0, yaw: 0 } }] }], "map", "odom", 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
        example([STAMPED_EDGES_CASE, "map", "base_link", 3], { ok: true, time: 3, transform: { x: 6, y: 0, yaw: 0 } }, "interpolated request"),
        example([STAMPED_EDGES_CASE, "laser", "map", null], { ok: true, time: 6, transform: { x: -13, y: 0, yaw: 0 } }, "inverse direction"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7));
  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));

  function getPuzzle(id) {
    return byId.get(id) || null;
  }

  const api = Object.freeze({
    TF2_PUZZLE_STAGES: STAGES,
    TF2_PUZZLE_TRACKS: TRACKS,
    TF2_PUZZLES: PUZZLES,
    getPuzzle,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

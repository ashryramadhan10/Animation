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

  const PUZZLES = Object.freeze(STAGE_1_2);
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

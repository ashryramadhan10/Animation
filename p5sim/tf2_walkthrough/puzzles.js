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

  const TOOLKIT_STAGES = Object.freeze([
    { id: "matrix-form", title: "Matrix Form", subtitle: "SE(2) as a 3×3 homogeneous matrix.", range: [28, 33] },
    { id: "orientation-3d", title: "3D Orientation", subtitle: "RPY, quaternions, slerp, and SE(3).", range: [34, 40] },
    { id: "motion-uncertainty", title: "Motion & Uncertainty", subtitle: "Integrate odometry and rotate covariance.", range: [41, 43] },
    { id: "time-travel", title: "Time Travel", subtitle: "Move an observation across time through a fixed frame.", range: [44, 44] },
    { id: "rigid-alignment", title: "Rigid Alignment", subtitle: "Recover a transform from two point clouds.", range: [45, 51] },
  ]);

  const ADVANCED_STAGES = Object.freeze([
    { id: "conversions", title: "Conversions", subtitle: "Rotation matrices and axis-angle, both directions.", range: [52, 55] },
    { id: "sensors-motion", title: "Sensors & Motion", subtitle: "URDF mounts, body twists, and lidar de-skewing.", range: [56, 58] },
    { id: "buffer-semantics", title: "Buffer Semantics", subtitle: "Latching, pruning, arrival, reparenting, lookup.", range: [59, 63] },
  ]);

  const TRACKS = Object.freeze([
    Object.freeze({ id: "tf2", title: "Track 1 · TF2", stages: STAGES }),
    Object.freeze({
      id: "toolkit",
      title: "Track 2 · Transform Toolkit",
      unlockAfter: "stamped-lookup",
      note: "Unlocks after the stamped lookup capstone.",
      stages: TOOLKIT_STAGES,
    }),
    Object.freeze({
      id: "advanced",
      title: "Track 3 · Buffers & Sensors",
      unlockAfter: "icp-match",
      note: "Unlocks after the ICP finale.",
      stages: ADVANCED_STAGES,
    }),
    Object.freeze({
      id: "pose-correction",
      title: "Track 4 · Pose Correction",
      unlockAfter: "buffer-lookup",
      note: "Unlocks after the buffer lookup finale. Puzzles arrive with the next track.",
      stages: Object.freeze([
        { id: "pointcloud-bricks", title: "Point-Cloud Bricks", subtitle: "Rack points, line fits, and distances.", range: [0, 0] },
        { id: "rack-filters", title: "Rack Filters", subtitle: "Accumulate, filter, smooth, and agree.", range: [0, 0] },
        { id: "aisle-correction", title: "Aisle Correction", subtitle: "Centerline, lateral error, corrected pose.", range: [0, 0] },
        { id: "correction-capstone", title: "Correction Capstone", subtitle: "Publish map → odom on a drifting robot.", range: [0, 0] },
      ]),
    }),
  ]);

  const PYROBOTICS = "https://github.com/AtsushiSakai/PythonRobotics/blob/master/";

  function pyref(path, symbol) {
    return Object.freeze({ label: "PythonRobotics · " + path + (symbol ? " · " + symbol : ""), url: PYROBOTICS + path });
  }

  function docref(label, url) {
    return Object.freeze({ label, url });
  }

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
    const track = config.track || "tf2";
    const stageList = track === "toolkit" ? TOOLKIT_STAGES : (track === "advanced" ? ADVANCED_STAGES : STAGES);
    const stage = stageList.find((candidate) => config.number >= candidate.range[0] && config.number <= candidate.range[1]);
    if (!stage) throw new Error("Puzzle " + config.number + " has no stage");
    return Object.freeze({
      tolerance: 1e-6,
      reference: null,
      ...config,
      track,
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
      functionName: "wrapAngle", signature: "wrapAngle(angle) → radians in [-π, π]",
      starterSource: starter("wrapAngle", "angle", "Shift by π, reduce modulo 2π, fix a negative remainder, shift back."),
      referenceSource: lines(
        "function wrapAngle(angle) {",
        "  var wrapped = (angle + Math.PI) % (2 * Math.PI);",
        "  if (wrapped < 0) wrapped += 2 * Math.PI;",
        "  return wrapped - Math.PI;",
        "}"
      ),
      comparator: "wrapped", walkthroughChapter: "data-types",
      scene: { kind: "dial", handles: [{ id: "angle", type: "dial", label: "angle", value: 4.0, accumulate: true }] },
      diagnoses: [diagnosis("unwrapped", "Same direction, but not wrapped: the value must land inside [-π, π].", "function wrapAngle(angle) { return angle; }")],
      hints: ["Angles repeat every full turn; two values can mean the same direction.", "Shift by π, take the remainder modulo 2π, fix a negative remainder, then shift back.", "wrapped = (angle + π) mod 2π; add 2π if negative; return wrapped − π."],
      cases: [
        example([4], 4 - 2 * PI, "past π"),
        example([0.5], 0.5, "already inside"),
        example([-4], -4 + 2 * PI, "below −π"),
        example([7], 7 - 2 * PI, "more than a turn"),
        example([PI], -PI, "exactly π (either sign is accepted)"),
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
      functionName: "yawDelta", signature: "yawDelta(from, to) → radians in [-π, π]",
      starterSource: starter("yawDelta", "from, to", "Subtract, then wrap with your wrapAngle."),
      referenceSource: "function yawDelta(from, to) { return wrapAngle(to - from); }",
      comparator: "wrapped", walkthroughChapter: "time-buffer",
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

  const IDENTITY_3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const ROT90_T31 = [[0, -1, 3], [1, 0, 1], [0, 0, 1]];

  const TOOLKIT_8 = [
    puzzle({
      number: 28, id: "rot-mat-2d", track: "toolkit", title: "Rotation as a Matrix",
      goal: "Build the 2×2 rotation matrix for a yaw angle.",
      concept: "The columns are the rotated x and y axes; rotateVector was this matrix all along.",
      functionName: "rotMat2d", signature: "rotMat2d(yaw) → [[c, -s], [s, c]]",
      starterSource: starter("rotMat2d", "yaw", "Row-major nested arrays: first row [cos, -sin], second row [sin, cos]."),
      referenceSource: "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, -s], [s, c]]; }",
      comparator: "deep", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "rot_mat_2d"),
      scene: { kind: "matrix", view: "rotation", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.7 }] },
      diagnoses: [diagnosis("transposed", "Transposed: that matrix rotates by −yaw. The first row is [cos, −sin].", "function rotMat2d(yaw) { var c = Math.cos(yaw), s = Math.sin(yaw); return [[c, s], [-s, c]]; }")],
      hints: ["The first column is where the x axis goes: (cos, sin).", "Row-major: row 0 is [cos, −sin], row 1 is [sin, cos].", "Return [[Math.cos(yaw), -Math.sin(yaw)], [Math.sin(yaw), Math.cos(yaw)]]."],
      cases: [
        example([PI / 2], [[0, -1], [1, 0]], "quarter turn"),
        example([0], [[1, 0], [0, 1]], "identity"),
        example([PI], [[-1, 0], [0, -1]], "half turn"),
        example([-PI / 4], [[Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2]], "negative yaw"),
      ],
    }),
    puzzle({
      number: 29, id: "homogeneous-from-pose", track: "toolkit", title: "Pose to Homogeneous Matrix",
      goal: "Pack a pose into a 3×3 homogeneous matrix.",
      concept: "Rotation in the top-left, translation in the last column, [0 0 1] on the bottom: that is what the p5 matrix stack multiplies.",
      functionName: "homogeneousFromPose", signature: "homogeneousFromPose(transform) → 3×3",
      starterSource: starter("homogeneousFromPose", "transform", "Reuse rotMat2d for the top-left block."),
      referenceSource: lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], transform.x], [r[1][0], r[1][1], transform.y], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "matrix-stack",
      dependencies: ["rot-mat-2d"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "pose", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: 2, y: 1, yaw: PI / 3 } }] },
      diagnoses: [diagnosis("translation-in-last-row", "Translation landed in the bottom row: column vectors need it in the last column.", lines(
        "function homogeneousFromPose(transform) {",
        "  var r = rotMat2d(transform.yaw);",
        "  return [[r[0][0], r[0][1], 0], [r[1][0], r[1][1], 0], [transform.x, transform.y, 1]];",
        "}"
      ))],
      hints: ["The matrix must move [x, y, 1] the way transformPoint does.", "Top-left 2×2 is the rotation, last column is (x, y, 1).", "[[c, −s, x], [s, c, y], [0, 0, 1]]."],
      cases: [
        example([{ x: 2, y: 1, yaw: 0 }], [[1, 0, 2], [0, 1, 1], [0, 0, 1]], "pure translation"),
        example([{ x: 0, y: 0, yaw: PI / 2 }], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], "pure rotation"),
        example([{ x: -3, y: 4, yaw: PI }], [[-1, 0, -3], [0, -1, 4], [0, 0, 1]], "half turn with offset"),
      ],
    }),
    puzzle({
      number: 30, id: "mat-mul-3", track: "toolkit", title: "Multiply Homogeneous Matrices",
      goal: "Multiply two 3×3 matrices; the right operand acts first, exactly like compose.",
      concept: "push(); translate(); rotate(); is matrix multiplication in disguise.",
      functionName: "matMul3", signature: "matMul3(a, b) → 3×3",
      starterSource: starter("matMul3", "a, b", "result[i][j] = sum over k of a[i][k] * b[k][j]."),
      referenceSource: lines(
        "function matMul3(a, b) {",
        "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
        "  for (var i = 0; i < 3; i += 1) {",
        "    for (var j = 0; j < 3; j += 1) {",
        "      for (var k = 0; k < 3; k += 1) result[i][j] += a[i][k] * b[k][j];",
        "    }",
        "  }",
        "  return result;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix (Hin @ H)"),
      scene: { kind: "matrix", view: "chain", handles: [
        { id: "aFromB", type: "frame", label: "b", value: { x: 2, y: 1, yaw: PI / 2 } },
        { id: "bFromC", type: "frame", label: "c", value: { x: 1.5, y: 0, yaw: PI / 4 }, in: "aFromB" },
      ], args: [{ fixture: "matrixA" }, { fixture: "matrixB" }] },
      diagnoses: [
        diagnosis("reversed-order", "Multiplied b × a: matrix products do not commute; a is on the left.", lines(
          "function matMul3(a, b) {",
          "  var result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];",
          "  for (var i = 0; i < 3; i += 1) for (var j = 0; j < 3; j += 1) for (var k = 0; k < 3; k += 1) result[i][j] += b[i][k] * a[k][j];",
          "  return result;",
          "}"
        )),
        diagnosis("element-wise", "Multiplied element by element: a matrix product sums over the inner index.", "function matMul3(a, b) { return [[a[0][0]*b[0][0], a[0][1]*b[0][1], a[0][2]*b[0][2]], [a[1][0]*b[1][0], a[1][1]*b[1][1], a[1][2]*b[1][2]], [a[2][0]*b[2][0], a[2][1]*b[2][1], a[2][2]*b[2][2]]]; }"),
      ],
      hints: ["Each output entry is a row of a dotted with a column of b.", "Three nested loops over i, j, k.", "result[i][j] += a[i][k] * b[k][j]."],
      cases: [
        example([[[0, -1, 10], [1, 0, 0], [0, 0, 1]], [[0, -1, 1], [1, 0, 0], [0, 0, 1]]], [[-1, 0, 10], [0, -1, 1], [0, 0, 1]], "turning chain"),
        example([IDENTITY_3, ROT90_T31], ROT90_T31, "identity on the left"),
        example([[[1, 0, 2], [0, 1, -1], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], [[0, -1, 2], [1, 0, -1], [0, 0, 1]], "order-sensitive"),
      ],
    }),
    puzzle({
      number: 31, id: "apply-homogeneous", track: "toolkit", title: "Apply a Homogeneous Matrix",
      goal: "Move a point with a 3×3 matrix by treating it as [x, y, 1].",
      concept: "The trailing 1 is what lets one multiplication both rotate and translate.",
      functionName: "applyHomogeneous", signature: "applyHomogeneous(matrix, point) → point",
      starterSource: starter("applyHomogeneous", "matrix, point", "Multiply the first two rows by [x, y, 1]."),
      referenceSource: lines(
        "function applyHomogeneous(matrix, point) {",
        "  return { x: matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2], y: matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "matrix-stack",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (Rt @ current_points + Tt)"),
      scene: { kind: "matrix", view: "point", handles: [
        { id: "transform", type: "frame", label: "source", value: { x: 3, y: 1, yaw: PI / 2 } },
        { id: "point", type: "point", label: "p", value: { x: 2, y: 0 }, in: "transform" },
      ], args: [{ fixture: "matrixOfTransform" }, { handle: "point" }] },
      diagnoses: [
        diagnosis("rotation-ignored", "Only the last column was used: the rotation block must multiply x and y.", "function applyHomogeneous(matrix, point) { return { x: point.x + matrix[0][2], y: point.y + matrix[1][2] }; }"),
        diagnosis("homogeneous-coordinate-dropped", "The trailing 1 was dropped, so the translation column never contributes.", "function applyHomogeneous(matrix, point) { return { x: matrix[0][0] * point.x + matrix[0][1] * point.y, y: matrix[1][0] * point.x + matrix[1][1] * point.y }; }"),
      ],
      hints: ["Extend the point to [x, y, 1].", "x′ = m00·x + m01·y + m02·1, and the same with row 1 for y′.", "Return { x: m[0][0]*x + m[0][1]*y + m[0][2], y: m[1][0]*x + m[1][1]*y + m[1][2] }."],
      cases: [
        example([ROT90_T31, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"),
        example([IDENTITY_3, { x: 5, y: -2 }], { x: 5, y: -2 }, "identity"),
        example([[[-1, 0, -1], [0, -1, 4], [0, 0, 1]], { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn matrix"),
      ],
    }),
    puzzle({
      number: 32, id: "pose-from-homogeneous", track: "toolkit", title: "Read a Pose Back Out",
      goal: "Extract x, y, and yaw from a homogeneous matrix.",
      concept: "The first column is the rotated x axis, so atan2 of it recovers yaw with the right sign.",
      functionName: "poseFromHomogeneous", signature: "poseFromHomogeneous(matrix) → { x, y, yaw }",
      starterSource: starter("poseFromHomogeneous", "matrix", "Translation is the last column; yaw comes from the first column."),
      referenceSource: "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[1][0], matrix[0][0]) }; }",
      comparator: "se2", walkthroughChapter: "matrix-stack",
      reference: pyref("utils/angle.py", "angle_mod"),
      scene: { kind: "matrix", view: "readback", handles: [{ id: "transform", type: "frame", label: "pose", value: { x: -1, y: 2, yaw: -PI / 3 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("acos-yaw", "acos(m00) loses the sign of the rotation: use atan2(m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.acos(matrix[0][0]) }; }"),
        diagnosis("atan2-swapped", "atan2 arguments swapped: it takes (sin, cos), which are (m10, m00).", "function poseFromHomogeneous(matrix) { return { x: matrix[0][2], y: matrix[1][2], yaw: Math.atan2(matrix[0][0], matrix[1][0]) }; }"),
      ],
      hints: ["x and y sit in the last column.", "m10 is sin(yaw) and m00 is cos(yaw).", "yaw = Math.atan2(matrix[1][0], matrix[0][0])."],
      cases: [
        example([ROT90_T31], { x: 3, y: 1, yaw: PI / 2 }, "quarter turn"),
        example([[[1, 0, 5], [0, 1, -2], [0, 0, 1]]], { x: 5, y: -2, yaw: 0 }, "pure translation"),
        example([[[0.5, Math.sqrt(3) / 2, 0], [-Math.sqrt(3) / 2, 0.5, 0], [0, 0, 1]]], { x: 0, y: 0, yaw: -PI / 3 }, "negative yaw"),
      ],
    }),
    puzzle({
      number: 33, id: "invert-homogeneous", track: "toolkit", title: "Invert a Homogeneous Matrix",
      goal: "Invert a rigid 3×3 matrix without a general matrix inverse.",
      concept: "A rotation's inverse is its transpose, and the translation becomes −Rᵀt.",
      functionName: "invertHomogeneous", signature: "invertHomogeneous(matrix) → 3×3",
      starterSource: starter("invertHomogeneous", "matrix", "Transpose the rotation block; the new translation is −Rᵀ · t."),
      referenceSource: lines(
        "function invertHomogeneous(matrix) {",
        "  var r00 = matrix[0][0], r01 = matrix[0][1], r10 = matrix[1][0], r11 = matrix[1][1];",
        "  var tx = matrix[0][2], ty = matrix[1][2];",
        "  return [[r00, r10, -(r00 * tx + r10 * ty)], [r01, r11, -(r01 * tx + r11 * ty)], [0, 0, 1]];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "update_homogeneous_matrix"),
      scene: { kind: "matrix", view: "inverse", handles: [{ id: "transform", type: "frame", label: "b", value: { x: 3, y: 1, yaw: PI / 2 } }], args: [{ fixture: "matrixOfTransform" }] },
      diagnoses: [
        diagnosis("negated-only", "Only the translation was negated: it must also be rotated by the transposed block.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[0][1], -matrix[0][2]], [matrix[1][0], matrix[1][1], -matrix[1][2]], [0, 0, 1]]; }"),
        diagnosis("transpose-whole-matrix", "Transposing the whole 3×3 moves the translation into the bottom row; only the rotation block transposes.", "function invertHomogeneous(matrix) { return [[matrix[0][0], matrix[1][0], 0], [matrix[0][1], matrix[1][1], 0], [matrix[0][2], matrix[1][2], 1]]; }"),
      ],
      hints: ["For rotations, Rᵀ is R⁻¹.", "Inverse = [Rᵀ, −Rᵀ t; 0 0 1].", "Swap m01 and m10; new tx = −(m00·tx + m10·ty); new ty = −(m01·tx + m11·ty)."],
      cases: [
        example([ROT90_T31], [[0, 1, -1], [-1, 0, 3], [0, 0, 1]], "quarter-turn inverse"),
        example([[[1, 0, 2], [0, 1, -4], [0, 0, 1]]], [[1, 0, -2], [0, 1, 4], [0, 0, 1]], "translation inverse"),
        example([[[-1, 0, 1], [0, -1, 1], [0, 0, 1]]], [[-1, 0, 1], [0, -1, 1], [0, 0, 1]], "half turn is its own inverse"),
      ],
    }),
  ];

  const X90 = { x: HALF, y: 0, z: 0, w: HALF };
  const RP60 = { x: 0.4330127018922193, y: 0.4330127018922193, z: -0.25, w: 0.75 };
  const Z170 = { x: 0, y: 0, z: Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const Z_MINUS_170 = { x: 0, y: 0, z: -Math.sin(85 * PI / 180), w: Math.cos(85 * PI / 180) };
  const RPY_SLIDERS = [
    { id: "roll", type: "slider", label: "roll", value: 0.3, min: -PI, max: PI },
    { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
    { id: "yaw", type: "slider", label: "yaw", value: 1.0, min: -PI, max: PI },
  ];

  const TOOLKIT_9 = [
    puzzle({
      number: 34, id: "quaternion-from-rpy", track: "toolkit", title: "Quaternion from Roll, Pitch, Yaw",
      goal: "Build the quaternion tf2's setRPY builds: yaw about Z, then pitch about Y, then roll about X.",
      concept: "Euler angles are three half-angle quaternions multiplied in Z-Y-X order.",
      functionName: "quaternionFromRPY", signature: "quaternionFromRPY(roll, pitch, yaw) → quaternion",
      starterSource: starter("quaternionFromRPY", "roll, pitch, yaw", "q = qz(yaw) × qy(pitch) × qx(roll), each built from half angles."),
      referenceSource: lines(
        "function quaternionFromRPY(roll, pitch, yaw) {",
        "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
        "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
        "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
        "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      dependencies: ["quaternion-multiply"],
      reference: docref("tf2 · Quaternion::setRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS },
      diagnoses: [
        diagnosis("xyz-order", "Multiplied in X-Y-Z order: setRPY applies yaw first, so the product is qz × qy × qx.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll / 2), y: 0, z: 0, w: Math.cos(roll / 2) };",
          "  var qy = { x: 0, y: Math.sin(pitch / 2), z: 0, w: Math.cos(pitch / 2) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) };",
          "  return quaternionMultiply(quaternionMultiply(qx, qy), qz);",
          "}"
        )),
        diagnosis("half-angle-missing", "Used the full angle: a quaternion stores sin and cos of half the angle.", lines(
          "function quaternionFromRPY(roll, pitch, yaw) {",
          "  var qx = { x: Math.sin(roll), y: 0, z: 0, w: Math.cos(roll) };",
          "  var qy = { x: 0, y: Math.sin(pitch), z: 0, w: Math.cos(pitch) };",
          "  var qz = { x: 0, y: 0, z: Math.sin(yaw), w: Math.cos(yaw) };",
          "  return quaternionMultiply(quaternionMultiply(qz, qy), qx);",
          "}"
        )),
      ],
      hints: ["Each axis rotation is its own quaternion with half angles.", "Order matters: qz × qy × qx (yaw, then pitch, then roll).", "Build qx, qy, qz with sin(angle/2) on their axis and cos(angle/2) in w, then multiply."],
      cases: [
        example([0, 0, PI / 2], Z90, "yaw only"),
        example([PI / 2, 0, 0], X90, "roll only"),
        example([0, PI / 2, 0], Y90, "pitch only"),
        example([PI / 3, PI / 3, 0], RP60, "roll and pitch"),
        example([PI / 2, 0, PI / 2], { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 35, id: "yaw-from-quaternion", track: "toolkit", title: "Yaw from a Quaternion",
      goal: "Extract the yaw angle from any quaternion, the way tf2::getYaw does.",
      concept: "The shortcut 2·atan2(z, w) only works when roll and pitch are zero.",
      functionName: "yawFromQuaternion", signature: "yawFromQuaternion(q) → radians",
      starterSource: starter("yawFromQuaternion", "q", "yaw = atan2(2(w·z + x·y), 1 − 2(y² + z²))."),
      referenceSource: "function yawFromQuaternion(q) { return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)); }",
      comparator: "angle", walkthroughChapter: "se3",
      reference: docref("tf2 · getYaw (tf2/utils.h)", "https://docs.ros.org/en/rolling/p/tf2/generated/namespacetf2.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.6, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("pure-yaw-shortcut", "2·atan2(z, w) assumes no roll or pitch; use the full formula with x·y and y² terms.", "function yawFromQuaternion(q) { return 2 * Math.atan2(q.z, q.w); }")],
      hints: ["Yaw is the rotation of the body x axis projected onto the XY plane.", "Numerator 2(wz + xy); denominator 1 − 2(y² + z²).", "Return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))."],
      cases: [
        example([Z90], PI / 2, "pure yaw"),
        example([X90], 0, "pure roll"),
        example([RP60], 0, "roll and pitch, no yaw"),
        example([{ x: 0, y: 0, z: -HALF, w: HALF }], -PI / 2, "negative yaw"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], PI / 2, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 36, id: "rpy-from-quaternion", track: "toolkit", title: "Roll, Pitch, Yaw from a Quaternion",
      goal: "Recover all three Euler angles from a quaternion.",
      concept: "Pitch comes from an asin that must be clamped; roll and yaw come from atan2 pairs.",
      functionName: "rpyFromQuaternion", signature: "rpyFromQuaternion(q) → { roll, pitch, yaw }",
      starterSource: starter("rpyFromQuaternion", "q", "roll = atan2(2(wx + yz), 1 − 2(x² + y²)); pitch = asin(2(wy − zx)); reuse yawFromQuaternion."),
      referenceSource: lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)), pitch: Math.asin(sinp), yaw: yawFromQuaternion(q) };",
        "}"
      ),
      comparator: "angles", walkthroughChapter: "se3",
      dependencies: ["yaw-from-quaternion"],
      reference: docref("tf2 · Matrix3x3::getRPY", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html"),
      scene: { kind: "se3", view: "rpy", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.3, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 2.0, min: -PI, max: PI },
      ], args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [diagnosis("roll-yaw-swapped", "Roll and yaw are swapped: roll uses (wx + yz) and the x², y² terms; yaw uses (wz + xy).", lines(
        "function rpyFromQuaternion(q) {",
        "  var sinp = 2 * (q.w * q.y - q.z * q.x);",
        "  if (sinp > 1) sinp = 1;",
        "  if (sinp < -1) sinp = -1;",
        "  return { roll: yawFromQuaternion(q), pitch: Math.asin(sinp), yaw: Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)) };",
        "}"
      ))],
      hints: ["Each angle has its own pair of quaternion terms.", "Clamp the asin argument to [−1, 1] before calling it.", "roll: atan2(2(wx + yz), 1 − 2(x² + y²)); pitch: asin(2(wy − zx)); yaw: yawFromQuaternion(q)."],
      cases: [
        example([Z90], { roll: 0, pitch: 0, yaw: PI / 2 }, "pure yaw"),
        example([X90], { roll: PI / 2, pitch: 0, yaw: 0 }, "pure roll"),
        example([RP60], { roll: PI / 3, pitch: PI / 3, yaw: 0 }, "roll and pitch"),
        example([{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }], { roll: PI / 2, pitch: 0, yaw: PI / 2 }, "roll and yaw"),
      ],
    }),
    puzzle({
      number: 37, id: "slerp-quaternion", track: "toolkit", title: "Slerp Between Rotations",
      goal: "Interpolate two quaternions along the shortest arc, the way TF2 interpolates 3D orientation.",
      concept: "Flip the sign when the dot product is negative, then weight by sines of the arc angle.",
      functionName: "slerpQuaternion", signature: "slerpQuaternion(a, b, amount) → quaternion",
      starterSource: starter("slerpQuaternion", "a, b, amount"),
      referenceSource: lines(
        "function slerpQuaternion(a, b, amount) {",
        "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
        "  var target = b;",
        "  if (dot < 0) { dot = -dot; target = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }; }",
        "  var wa, wb;",
        "  if (dot > 0.9995) { wa = 1 - amount; wb = amount; }",
        "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
        "  var q = { x: wa * a.x + wb * target.x, y: wa * a.y + wb * target.y, z: wa * a.z + wb * target.z, w: wa * a.w + wb * target.w };",
        "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "time-buffer",
      reference: docref("tf2 · Quaternion::slerp", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html"),
      scene: { kind: "se3", view: "slerp", handles: [
        { id: "yawA", type: "slider", label: "a: yaw", value: 2.9, min: -PI, max: PI },
        { id: "yawB", type: "slider", label: "b: yaw", value: -2.7, min: -PI, max: PI },
        { id: "amount", type: "slider", label: "amount", value: 0.5, min: 0, max: 1 },
      ], args: [{ fixture: "slerpA" }, { fixture: "slerpB" }, { handle: "amount" }] },
      diagnoses: [
        diagnosis("component-lerp", "Linear interpolation of components does not move at constant angular speed; weight by sin((1−t)θ) and sin(tθ).", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var target = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;",
          "  var q = { x: (1 - amount) * a.x + amount * target.x, y: (1 - amount) * a.y + amount * target.y, z: (1 - amount) * a.z + amount * target.z, w: (1 - amount) * a.w + amount * target.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
        diagnosis("long-way", "Took the long way around: when the dot product is negative, negate b first.", lines(
          "function slerpQuaternion(a, b, amount) {",
          "  var dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;",
          "  var wa, wb;",
          "  if (Math.abs(dot) > 0.9995) { wa = 1 - amount; wb = amount; }",
          "  else { var theta = Math.acos(dot); wa = Math.sin((1 - amount) * theta) / Math.sin(theta); wb = Math.sin(amount * theta) / Math.sin(theta); }",
          "  var q = { x: wa * a.x + wb * b.x, y: wa * a.y + wb * b.y, z: wa * a.z + wb * b.z, w: wa * a.w + wb * b.w };",
          "  var length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };",
          "}"
        )),
      ],
      hints: ["q and −q are the same rotation, so pick the closer sign of b first.", "θ = acos(a·b); weights are sin((1−t)θ)/sin θ and sin(tθ)/sin θ.", "Fall back to a normalized linear blend when a·b > 0.9995 to avoid dividing by sin θ ≈ 0."],
      cases: [
        example([IDENTITY_Q, Z90, 0.5], { x: 0, y: 0, z: Math.sin(PI / 8), w: Math.cos(PI / 8) }, "halfway to a quarter turn"),
        example([IDENTITY_Q, Z90, 0.25], { x: 0, y: 0, z: Math.sin(PI / 16), w: Math.cos(PI / 16) }, "quarter of the way"),
        example([Z170, Z_MINUS_170, 0.5], { x: 0, y: 0, z: 1, w: 0 }, "across the wrap"),
        example([X90, Y90, 1], Y90, "amount one"),
        example([X90, Y90, 0], X90, "amount zero"),
      ],
    }),
    puzzle({
      number: 38, id: "transform-point-3d", track: "toolkit", title: "Transform a 3D Point",
      goal: "Apply an SE(3) transform to a point: rotate by the quaternion, then translate.",
      concept: "Same rotate-then-translate order as transformPoint, with a quaternion doing the rotating.",
      functionName: "transformPoint3D", signature: "transformPoint3D(aFromB, point) → vector3",
      starterSource: starter("transformPoint3D", "aFromB, point", "rotateByQuaternion first, then add the translation."),
      referenceSource: lines(
        "function transformPoint3D(aFromB, point) {",
        "  var rotated = rotateByQuaternion(aFromB.rotation, point);",
        "  return { x: rotated.x + aFromB.translation.x, y: rotated.y + aFromB.translation.y, z: rotated.z + aFromB.translation.z };",
        "}"
      ),
      comparator: "vector3", walkthroughChapter: "stamped-data",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · doTransform(PointStamped)", "https://docs.ros.org/en/rolling/p/tf2_geometry_msgs/"),
      scene: { kind: "se3", view: "point3d", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: PI / 2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.3, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }, { fixture: "point3" }] },
      diagnoses: [diagnosis("translate-then-rotate", "Translated before rotating: the offset got rotated too.", lines(
        "function transformPoint3D(aFromB, point) {",
        "  var shifted = { x: point.x + aFromB.translation.x, y: point.y + aFromB.translation.y, z: point.z + aFromB.translation.z };",
        "  return rotateByQuaternion(aFromB.rotation, shifted);",
        "}"
      ))],
      hints: ["A rigid transform rotates first, then translates.", "Rotate the point with rotateByQuaternion(aFromB.rotation, point).", "Add aFromB.translation component-wise to the rotated point."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }, { x: 1, y: 0, z: 0 }], { x: 1, y: 1, z: 0 }, "quarter turn then shift"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: IDENTITY_Q }, { x: 2, y: 3, z: 4 }], { x: 2, y: 3, z: 5 }, "pure translation"),
        example([{ translation: { x: 1, y: 1, z: 1 }, rotation: Y90 }, { x: 0, y: 0, z: 1 }], { x: 2, y: 1, z: 1 }, "pitch then shift"),
      ],
    }),
    puzzle({
      number: 39, id: "invert-se3", track: "toolkit", title: "Invert an SE(3) Transform",
      goal: "Invert a translation-plus-quaternion transform.",
      concept: "The inverse rotation is the conjugate, and the inverse translation is that rotation applied to −t.",
      functionName: "invertSE3", signature: "invertSE3(aFromB) → bFromA",
      starterSource: starter("invertSE3", "aFromB", "conjugate = (−x, −y, −z, w); translation = rotate(conjugate, −t)."),
      referenceSource: lines(
        "function invertSE3(aFromB) {",
        "  var q = aFromB.rotation;",
        "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
        "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
        "  return { translation: t, rotation: conjugate };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "composition",
      dependencies: ["rotate-by-quaternion"],
      reference: docref("tf2 · Transform::inverse", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Transform.html"),
      scene: { kind: "se3", view: "inverse", handles: [
        { id: "yaw", type: "slider", label: "b: yaw", value: 0.9, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "b: pitch", value: 0.4, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "aFromBSliders" }] },
      diagnoses: [
        diagnosis("negated-only", "Only negated the translation: it must be rotated by the conjugate as well.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  return { translation: { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z }, rotation: { x: -q.x, y: -q.y, z: -q.z, w: q.w } };",
          "}"
        )),
        diagnosis("rotation-not-inverted", "The rotation was kept as is: the inverse needs the conjugate quaternion.", lines(
          "function invertSE3(aFromB) {",
          "  var q = aFromB.rotation;",
          "  var conjugate = { x: -q.x, y: -q.y, z: -q.z, w: q.w };",
          "  var t = rotateByQuaternion(conjugate, { x: -aFromB.translation.x, y: -aFromB.translation.y, z: -aFromB.translation.z });",
          "  return { translation: t, rotation: q };",
          "}"
        )),
      ],
      hints: ["For a unit quaternion the inverse is the conjugate.", "bFromA translation = conjugate applied to −t.", "Return { translation: rotateByQuaternion(conjugate, −t), rotation: conjugate }."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: Z90 }], { translation: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: -HALF, w: HALF } }, "quarter-turn inverse"),
        example([{ translation: { x: 2, y: -4, z: 6 }, rotation: IDENTITY_Q }], { translation: { x: -2, y: 4, z: -6 }, rotation: IDENTITY_Q }, "translation inverse"),
        example([{ translation: { x: 0, y: 0, z: 1 }, rotation: Y90 }], { translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: -HALF, z: 0, w: HALF } }, "pitch inverse"),
      ],
    }),
    puzzle({
      number: 40, id: "optical-to-body", track: "toolkit", title: "Camera Optical Frame to Body Frame",
      goal: "Re-express a camera_optical vector (x right, y down, z forward) in the body frame (x forward, y left, z up).",
      concept: "REP-103: optical z is body x, optical x is body −y, optical y is body −z.",
      functionName: "opticalToBody", signature: "opticalToBody(v) → vector3",
      starterSource: starter("opticalToBody", "v", "body.x = v.z; body.y = −v.x; body.z = −v.y."),
      referenceSource: "function opticalToBody(v) { return { x: v.z, y: -v.x, z: -v.y }; }",
      comparator: "vector3", walkthroughChapter: "se3",
      reference: docref("REP-103 · Standard Units of Measure and Coordinate Conventions (suffix frames)", "https://www.ros.org/reps/rep-0103.html#suffix-frames"),
      scene: { kind: "se3", view: "optical", handles: [
        { id: "yaw", type: "slider", label: "ray yaw (body)", value: 0.5, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "ray pitch (body)", value: 0.2, min: -PI / 2, max: PI / 2 },
      ], args: [{ fixture: "opticalRay" }] },
      diagnoses: [
        diagnosis("axes-swapped-only", "Axes were permuted but not flipped: optical x points right, which is body −y; optical y points down, which is body −z.", "function opticalToBody(v) { return { x: v.z, y: v.x, z: v.y }; }"),
        diagnosis("body-to-optical", "That is the inverse mapping (body → optical). This puzzle converts optical → body.", "function opticalToBody(v) { return { x: -v.y, y: -v.z, z: v.x }; }"),
      ],
      hints: ["Optical z is forward, which is body x.", "Optical x is right (body −y); optical y is down (body −z).", "Return { x: v.z, y: -v.x, z: -v.y }."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }], { x: 1, y: 0, z: 0 }, "optical forward"),
        example([{ x: 1, y: 0, z: 0 }], { x: 0, y: -1, z: 0 }, "optical right"),
        example([{ x: 0, y: 1, z: 0 }], { x: 0, y: 0, z: -1 }, "optical down"),
        example([{ x: 0.5, y: -0.25, z: 2 }], { x: 2, y: -0.5, z: 0.25 }, "general ray"),
      ],
    }),
  ];

  const TOOLKIT_10 = [
    puzzle({
      number: 41, id: "integrate-motion", track: "toolkit", title: "Integrate One Odometry Step",
      goal: "Advance a pose by velocity v and yaw rate ω over dt, exactly like the EKF motion model.",
      concept: "This is how odom → base_link is produced, one dead-reckoned step at a time.",
      functionName: "integrateMotion", signature: "integrateMotion(pose, v, omega, dt) → pose",
      starterSource: starter("integrateMotion", "pose, v, omega, dt", "x += v·dt·cos(yaw); y += v·dt·sin(yaw); yaw = wrapAngle(yaw + ω·dt)."),
      referenceSource: lines(
        "function integrateMotion(pose, v, omega, dt) {",
        "  return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: wrapAngle(pose.yaw + omega * dt) };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["wrap-angle"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "motion_model"),
      scene: { kind: "motion", handles: [
        { id: "pose", type: "pose", label: "pose", value: { x: -2, y: -0.5, yaw: 0.4 } },
        { id: "v", type: "slider", label: "v (m/s)", value: 1.5, min: 0, max: 3 },
        { id: "omega", type: "slider", label: "ω (rad/s)", value: 0.8, min: -2, max: 2 },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("yaw-updated-first", "The translation used the new yaw: the model moves along the current heading, then turns.", lines(
          "function integrateMotion(pose, v, omega, dt) {",
          "  var yaw = wrapAngle(pose.yaw + omega * dt);",
          "  return { x: pose.x + v * dt * Math.cos(yaw), y: pose.y + v * dt * Math.sin(yaw), yaw: yaw };",
          "}"
        )),
        diagnosis("omega-ignored", "The yaw rate was ignored: yaw must advance by ω·dt.", "function integrateMotion(pose, v, omega, dt) { return { x: pose.x + v * dt * Math.cos(pose.yaw), y: pose.y + v * dt * Math.sin(pose.yaw), yaw: pose.yaw }; }"),
      ],
      hints: ["Distance travelled is v·dt along the current heading.", "Turn by ω·dt after moving, and wrap the result.", "Return { x: x + v·dt·cos(yaw), y: y + v·dt·sin(yaw), yaw: wrapAngle(yaw + ω·dt) }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, 1, 0.1, 0.1], { x: 0.1, y: 0, yaw: 0.01 }, "PythonRobotics defaults"),
        example([{ x: 1, y: 2, yaw: PI / 2 }, 2, 0, 0.5], { x: 1, y: 3, yaw: PI / 2 }, "straight along +y"),
        example([{ x: 0, y: 0, yaw: PI }, 1, 1, PI], { x: -PI, y: 0, yaw: 0 }, "move then wrap"),
        example([{ x: 0, y: 0, yaw: 0 }, 0, 0.5, 2], { x: 0, y: 0, yaw: 1 }, "turn in place"),
      ],
    }),
    puzzle({
      number: 42, id: "dead-reckon", track: "toolkit", title: "Dead Reckoning",
      goal: "Fold a list of (v, ω, dt) commands into a final pose.",
      concept: "Odometry drift is what happens when these commands carry small errors and nothing corrects them.",
      functionName: "deadReckon", signature: "deadReckon(start, commands) → pose",
      starterSource: starter("deadReckon", "start, commands", "Apply integrateMotion for each command in order."),
      referenceSource: lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = 0; i < commands.length; i += 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "frame-roles",
      dependencies: ["integrate-motion"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "observation (xDR dead reckoning)"),
      scene: { kind: "motion-trail", handles: [{ id: "start", type: "pose", label: "start", value: { x: -3, y: -1, yaw: 0.3 } }], args: [{ handle: "start" }, { fixture: "commands" }] },
      diagnoses: [diagnosis("commands-reversed", "Commands were applied last to first: dead reckoning replays them in order.", lines(
        "function deadReckon(start, commands) {",
        "  var pose = { x: start.x, y: start.y, yaw: start.yaw };",
        "  for (var i = commands.length - 1; i >= 0; i -= 1) pose = integrateMotion(pose, commands[i].v, commands[i].omega, commands[i].dt);",
        "  return pose;",
        "}"
      ))],
      hints: ["Start from a copy of the start pose.", "Each command is one integrateMotion step.", "Loop over commands in order and feed the result back in."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 1, omega: 0, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 2, y: 0, yaw: 0 }, "two straight steps"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 0, omega: PI / 2, dt: 1 }, { v: 1, omega: 0, dt: 1 }]], { x: 0, y: 1, yaw: PI / 2 }, "turn then move"),
        example([{ x: 1, y: 1, yaw: 0 }, []], { x: 1, y: 1, yaw: 0 }, "no commands"),
        example([{ x: 0, y: 0, yaw: 0 }, [{ v: 2, omega: 1, dt: 0.5 }]], { x: 1, y: 0, yaw: 0.5 }, "single step"),
      ],
    }),
    puzzle({
      number: 43, id: "rotate-covariance", track: "toolkit", title: "Rotate a Covariance",
      goal: "Express a 2×2 position covariance in a frame rotated by yaw: R Σ Rᵀ.",
      concept: "Uncertainty is a quadratic form, so it transforms with R on both sides, not once.",
      functionName: "rotateCovariance", signature: "rotateCovariance(cov, yaw) → 2×2",
      starterSource: starter("rotateCovariance", "cov, yaw", "Compute R·Σ first, then multiply by Rᵀ on the right."),
      referenceSource: lines(
        "function rotateCovariance(cov, yaw) {",
        "  var r = rotMat2d(yaw);",
        "  var rs = [",
        "    [r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]],",
        "    [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]],",
        "  ];",
        "  return [",
        "    [rs[0][0] * r[0][0] + rs[0][1] * r[0][1], rs[0][0] * r[1][0] + rs[0][1] * r[1][1]],",
        "    [rs[1][0] * r[0][0] + rs[1][1] * r[0][1], rs[1][0] * r[1][0] + rs[1][1] * r[1][1]],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["rot-mat-2d"],
      reference: pyref("Localization/extended_kalman_filter/extended_kalman_filter.py", "ekf_estimation (jF @ PEst @ jF.T)"),
      scene: { kind: "covariance", handles: [{ id: "yaw", type: "dial", label: "yaw", value: 0.6 }], args: [{ fixture: "covariance" }, { handle: "yaw" }] },
      diagnoses: [
        diagnosis("no-transpose", "Multiplied R Σ R: the right-hand factor must be the transpose Rᵀ.", lines(
          "function rotateCovariance(cov, yaw) {",
          "  var r = rotMat2d(yaw);",
          "  var rs = [[r[0][0] * cov[0][0] + r[0][1] * cov[1][0], r[0][0] * cov[0][1] + r[0][1] * cov[1][1]], [r[1][0] * cov[0][0] + r[1][1] * cov[1][0], r[1][0] * cov[0][1] + r[1][1] * cov[1][1]]];",
          "  return [[rs[0][0] * r[0][0] + rs[0][1] * r[1][0], rs[0][0] * r[0][1] + rs[0][1] * r[1][1]], [rs[1][0] * r[0][0] + rs[1][1] * r[1][0], rs[1][0] * r[0][1] + rs[1][1] * r[1][1]]];",
          "}"
        )),
        diagnosis("unchanged", "The covariance was returned as is: a rotated frame sees a rotated ellipse.", "function rotateCovariance(cov, yaw) { return [[cov[0][0], cov[0][1]], [cov[1][0], cov[1][1]]]; }"),
      ],
      hints: ["A covariance transforms as R Σ Rᵀ.", "Build R with rotMat2d, multiply Σ on the left, then Rᵀ on the right.", "(R Σ Rᵀ)[i][j] = Σₖ (RΣ)[i][k] · R[j][k]."],
      cases: [
        example([[[4, 0], [0, 1]], PI / 2], [[1, 0], [0, 4]], "quarter turn swaps the axes"),
        example([[[1, 0], [0, 1]], 0.7], [[1, 0], [0, 1]], "isotropic is invariant"),
        example([[[2, 1], [1, 2]], PI], [[2, 1], [1, 2]], "half turn is invariant"),
        example([[[4, 0], [0, 1]], PI / 4], [[2.5, 1.5], [1.5, 2.5]], "45 degrees mixes the axes"),
      ],
    }),
  ];

  const ROTATING_EDGES_CASE = [
    { parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 0, y: 0, yaw: PI } }] },
    { parent: "odom", child: "base_link", isStatic: true, transform: { x: 2, y: 0, yaw: 0 } },
  ];

  const TOOLKIT_11 = [
    puzzle({
      number: 44, id: "lookup-across-time", track: "toolkit", title: "Look Up Across Time",
      goal: "Answer tf2's advanced lookup: where was source at time t₂, seen from target at time t₁, through a fixed frame?",
      concept: "T_target(t₁)←source(t₂) = T_target(t₁)←fixed ∘ T_fixed←source(t₂); the fixed frame is the bridge between the two moments.",
      functionName: "lookupAcrossTime", signature: "lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) → result",
      starterSource: starter("lookupAcrossTime", "edges, target, targetTime, source, sourceTime, fixedFrame"),
      referenceSource: lines(
        "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
        "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
        "  if (!targetFromFixed.ok) return targetFromFixed;",
        "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
        "  if (!fixedFromSource.ok) return fixedFromSource;",
        "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["stamped-lookup", "compose"],
      reference: docref("tf2 · Buffer::lookupTransform(target, target_time, source, source_time, fixed_frame)", "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html"),
      scene: { kind: "robot-chain-time", view: "across-time", handles: [
        { id: "targetTime", type: "timeline", label: "target time t₁", value: 3, start: 0, end: 10 },
        { id: "sourceTime", type: "timeline", label: "source time t₂", value: 7, start: 0, end: 10 },
        { id: "target", type: "selector", label: "target", value: "base_link", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "stampedEdges" }, { handle: "target" }, { handle: "targetTime" }, { handle: "source" }, { handle: "sourceTime" }, "map"] },
      diagnoses: [
        diagnosis("single-time", "Both ends were looked up at the target time: the source side must be sampled at sourceTime.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, targetTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(targetFromFixed.transform, fixedFromSource.transform) };",
          "}"
        )),
        diagnosis("reversed-composition", "Composed in the wrong order: target←fixed goes on the left, fixed←source on the right.", lines(
          "function lookupAcrossTime(edges, target, targetTime, source, sourceTime, fixedFrame) {",
          "  var targetFromFixed = lookupStampedTransform(edges, target, fixedFrame, targetTime);",
          "  if (!targetFromFixed.ok) return targetFromFixed;",
          "  var fixedFromSource = lookupStampedTransform(edges, fixedFrame, source, sourceTime);",
          "  if (!fixedFromSource.ok) return fixedFromSource;",
          "  return { ok: true, targetTime: targetTime, sourceTime: sourceTime, transform: compose(fixedFromSource.transform, targetFromFixed.transform) };",
          "}"
        )),
      ],
      hints: ["Two ordinary stamped lookups, both through the fixed frame.", "target←fixed at t₁, then fixed←source at t₂.", "Return the first availability error, otherwise compose(targetFromFixed, fixedFromSource)."],
      cases: [
        example([STAMPED_EDGES_CASE, "base_link", 2, "base_link", 5, "map"], { ok: true, targetTime: 2, sourceTime: 5, transform: { x: 6, y: 0, yaw: 0 } }, "where the robot went"),
        example([STAMPED_EDGES_CASE, "laser", 0, "map", 6, "map"], { ok: true, targetTime: 0, sourceTime: 6, transform: { x: -1, y: 0, yaw: 0 } }, "map seen from the laser"),
        example([STAMPED_EDGES_CASE, "map", 8, "base_link", 3, "map"], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 6 } }, "target time unavailable"),
        example([ROTATING_EDGES_CASE, "base_link", 0, "base_link", 10, "map"], { ok: true, targetTime: 0, sourceTime: 10, transform: { x: -4, y: 0, yaw: PI } }, "rotation across time"),
      ],
    }),
  ];

  function poseApply(t, p) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: c * p.x - s * p.y + t.x, y: s * p.x + c * p.y + t.y };
  }
  function poseInvert(t) {
    var c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    return { x: -(c * t.x + s * t.y), y: -(-s * t.x + c * t.y), yaw: -t.yaw };
  }
  const DIAMOND = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  const DIAMOND_ROTATED = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const DIAMOND_MOVED = [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: -2, y: 2 }, { x: -3, y: 1 }];
  const DIAMOND_AT_23 = DIAMOND.map((p) => ({ x: p.x + 2, y: p.y + 3 }));
  const DIAMOND_AT_12 = DIAMOND.map((p) => ({ x: p.x + 1, y: p.y + 2 }));
  const A20 = 20 * PI / 180;
  const DIAMOND_TURNED_20 = DIAMOND.map((p) => poseApply({ x: 0, y: 0, yaw: -A20 }, p));
  const LINE3 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  const LINE4 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const LINE4_SHIFTED = [{ x: 0.1, y: 0 }, { x: 1.1, y: 0 }, { x: 2.1, y: 0 }, { x: 3.1, y: 0 }];
  const LINE4_REVERSED = [{ x: 3.1, y: 0 }, { x: 2.1, y: 0 }, { x: 1.1, y: 0 }, { x: 0.1, y: 0 }];
  const CORNER = [{ x: -1.5, y: 1 }, { x: -1, y: 1 }, { x: -0.5, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: -0.5 }, { x: 0, y: -1 }];
  const CORNER_MOTION = { x: 0.3, y: -0.2, yaw: 0.15 };
  const CORNER_MOVED = [4, 0, 7, 2, 5, 1, 6, 3].map((index) => poseApply(poseInvert(CORNER_MOTION), CORNER[index]));
  const ICP_OPTIONS = { maxIterations: 30, eps: 1e-6 };

  const TOOLKIT_12 = [
    puzzle({
      number: 45, id: "centroid", track: "toolkit", title: "Centroid of a Cloud",
      goal: "Average a list of points.",
      concept: "Alignment removes the centroids first so only rotation is left to solve.",
      functionName: "centroid", signature: "centroid(points) → { x, y }",
      starterSource: starter("centroid", "points", "Sum x and y, divide by the count."),
      referenceSource: lines(
        "function centroid(points) {",
        "  var sx = 0, sy = 0;",
        "  for (var i = 0; i < points.length; i += 1) { sx += points[i].x; sy += points[i].y; }",
        "  return { x: sx / points.length, y: sy / points.length };",
        "}"
      ),
      comparator: "vector2", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (np.mean)"),
      scene: { kind: "cloud-align", view: "centroid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "current" }] },
      hints: ["The centroid is the mean of x and the mean of y.", "Accumulate both sums in one loop.", "Return { x: sumX / n, y: sumY / n }."],
      cases: [
        example([[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }]], { x: 1, y: 1 }, "square"),
        example([[{ x: 1, y: 1 }]], { x: 1, y: 1 }, "single point"),
        example([[{ x: -3, y: 4 }, { x: 5, y: -2 }, { x: 1, y: 7 }]], { x: 1, y: 3 }, "three points"),
      ],
    }),
    puzzle({
      number: 46, id: "cross-covariance", track: "toolkit", title: "Cross-Covariance of Two Clouds",
      goal: "Accumulate W = Σ (cᵢ − c̄)(pᵢ − p̄)ᵀ over paired points.",
      concept: "W holds every rotation clue between the clouds; PythonRobotics feeds it to an SVD.",
      functionName: "crossCovariance", signature: "crossCovariance(previous, current) → 2×2",
      starterSource: starter("crossCovariance", "previous, current", "Center both clouds with centroid, then sum the outer products c′ · p′ᵀ."),
      referenceSource: lines(
        "function crossCovariance(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var w = [[0, 0], [0, 0]];",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
        "    w[0][0] += cx * px; w[0][1] += cx * py; w[1][0] += cy * px; w[1][1] += cy * py;",
        "  }",
        "  return w;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["centroid"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (W = c_shift @ p_shift.T)"),
      scene: { kind: "cloud-align", view: "covariance", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("not-centered", "The clouds were not centered: subtract each centroid before the outer products.", lines(
          "function crossCovariance(previous, current) {",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) { w[0][0] += current[i].x * previous[i].x; w[0][1] += current[i].x * previous[i].y; w[1][0] += current[i].y * previous[i].x; w[1][1] += current[i].y * previous[i].y; }",
          "  return w;",
          "}"
        )),
        diagnosis("transposed", "Outer products are p′ · c′ᵀ: that is Wᵀ, which flips the recovered rotation.", lines(
          "function crossCovariance(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var w = [[0, 0], [0, 0]];",
          "  for (var i = 0; i < previous.length; i += 1) {",
          "    var px = previous[i].x - pm.x, py = previous[i].y - pm.y, cx = current[i].x - cm.x, cy = current[i].y - cm.y;",
          "    w[0][0] += px * cx; w[0][1] += px * cy; w[1][0] += py * cx; w[1][1] += py * cy;",
          "  }",
          "  return w;",
          "}"
        )),
      ],
      hints: ["Center both clouds on their centroids first.", "Each pair adds the outer product of the centered current point and the centered previous point.", "w[0][0] += cx·px; w[0][1] += cx·py; w[1][0] += cy·px; w[1][1] += cy·py."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], [[0, 2], [-2, 0]], "quarter turn"),
        example([DIAMOND, DIAMOND], [[2, 0], [0, 2]], "identical clouds"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], [[2, 0], [0, 2]], "translation only"),
      ],
    }),
    puzzle({
      number: 47, id: "alignment-yaw", track: "toolkit", title: "Rotation from W",
      goal: "Read the aligning yaw straight out of the 2×2 cross-covariance.",
      concept: "In 2D the Kabsch/SVD solution collapses to one atan2; no SVD needed.",
      functionName: "alignmentYaw", signature: "alignmentYaw(W) → radians",
      starterSource: starter("alignmentYaw", "W", "yaw = atan2(W[0][1] − W[1][0], W[0][0] + W[1][1])."),
      referenceSource: "function alignmentYaw(W) { return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1]); }",
      comparator: "angle", walkthroughChapter: "composition",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation (R = (u @ vh).T)"),
      scene: { kind: "cloud-align", view: "yaw", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "crossCovariance" }] },
      diagnoses: [diagnosis("sign-flipped", "The numerator is W01 − W10; swapping them recovers the inverse rotation.", "function alignmentYaw(W) { return Math.atan2(W[1][0] - W[0][1], W[0][0] + W[1][1]); }")],
      hints: ["The trace of W measures cos(yaw); the antisymmetric part measures sin(yaw).", "sin ∝ W01 − W10, cos ∝ W00 + W11.", "Return Math.atan2(W[0][1] - W[1][0], W[0][0] + W[1][1])."],
      cases: [
        example([[[0, 2], [-2, 0]]], PI / 2, "quarter turn"),
        example([[[2, 0], [0, 2]]], 0, "no rotation"),
        example([[[1, -1], [1, 1]]], -PI / 4, "negative rotation"),
        example([[[-2, 0], [0, -2]]], PI, "half turn"),
      ],
    }),
    puzzle({
      number: 48, id: "rigid-transform-from-pairs", track: "toolkit", title: "Rigid Transform from Paired Points",
      goal: "Find the transform that maps the current cloud onto the previous cloud, given index-paired points.",
      concept: "PythonRobotics' svd_motion_estimation: rotation from W, then t = p̄ − R c̄.",
      functionName: "rigidTransformFromPairs", signature: "rigidTransformFromPairs(previous, current) → { x, y, yaw }",
      starterSource: starter("rigidTransformFromPairs", "previous, current"),
      referenceSource: lines(
        "function rigidTransformFromPairs(previous, current) {",
        "  var pm = centroid(previous), cm = centroid(current);",
        "  var yaw = alignmentYaw(crossCovariance(previous, current));",
        "  var rotated = rotateVector(cm, yaw);",
        "  return { x: pm.x - rotated.x, y: pm.y - rotated.y, yaw: yaw };",
        "}"
      ),
      comparator: "se2", walkthroughChapter: "composition",
      dependencies: ["centroid", "cross-covariance", "alignment-yaw", "rotate-vector"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "svd_motion_estimation"),
      scene: { kind: "cloud-align", view: "rigid", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "current" }] },
      diagnoses: [
        diagnosis("translation-unrotated", "t = p̄ − c̄ ignores the rotation: rotate the current centroid first, t = p̄ − R·c̄.", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = alignmentYaw(crossCovariance(previous, current));",
          "  return { x: pm.x - cm.x, y: pm.y - cm.y, yaw: yaw };",
          "}"
        )),
        diagnosis("reversed", "That maps previous onto current. The convention is previous ≈ T(current).", lines(
          "function rigidTransformFromPairs(previous, current) {",
          "  var pm = centroid(previous), cm = centroid(current);",
          "  var yaw = -alignmentYaw(crossCovariance(previous, current));",
          "  var rotated = rotateVector(pm, yaw);",
          "  return { x: cm.x - rotated.x, y: cm.y - rotated.y, yaw: yaw };",
          "}"
        )),
      ],
      hints: ["Centroids give the translation once the rotation is known.", "yaw from alignmentYaw(crossCovariance(previous, current)).", "t = p̄ − rotateVector(c̄, yaw)."],
      cases: [
        example([DIAMOND, DIAMOND_ROTATED], { x: 0, y: 0, yaw: PI / 2 }, "pure rotation"),
        example([DIAMOND_AT_23, DIAMOND_AT_12], { x: 1, y: 1, yaw: 0 }, "pure translation"),
        example([DIAMOND, DIAMOND_MOVED], { x: 1, y: 2, yaw: PI / 2 }, "rotation and translation"),
      ],
    }),
    puzzle({
      number: 49, id: "nearest-neighbors", track: "toolkit", title: "Nearest-Neighbour Association",
      goal: "For every current point, find the index of the nearest previous point and sum those distances.",
      concept: "Association is what turns two unordered clouds into pairs the rigid solver can use.",
      functionName: "nearestNeighbors", signature: "nearestNeighbors(previous, current) → { indexes, error }",
      starterSource: starter("nearestNeighbors", "previous, current"),
      referenceSource: lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < current.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < previous.length; j += 1) {",
        "      var d = Math.hypot(previous[j].x - current[i].x, previous[j].y - current[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "nearest_neighbor_association (this puzzle sums nearest distances)"),
      scene: { kind: "cloud-align", view: "neighbors", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("reversed-roles", "You searched from previous to current. The output has one index per current point.", lines(
        "function nearestNeighbors(previous, current) {",
        "  var indexes = [], error = 0;",
        "  for (var i = 0; i < previous.length; i += 1) {",
        "    var best = 0, bestDistance = Infinity;",
        "    for (var j = 0; j < current.length; j += 1) {",
        "      var d = Math.hypot(current[j].x - previous[i].x, current[j].y - previous[i].y);",
        "      if (d < bestDistance) { bestDistance = d; best = j; }",
        "    }",
        "    indexes.push(best);",
        "    error += bestDistance;",
        "  }",
        "  return { indexes: indexes, error: error };",
        "}"
      ))],
      hints: ["Loop over current points; for each, scan every previous point.", "Keep the smallest distance and its index.", "Sum the winning distances into error."],
      cases: [
        example([LINE3, [{ x: 2.1, y: 0 }, { x: 0.1, y: 0 }]], { indexes: [2, 0], error: 0.2 }, "two queries"),
        example([LINE3, LINE3], { indexes: [0, 1, 2], error: 0 }, "identical clouds"),
        example([[{ x: 0, y: 0 }, { x: 3, y: 4 }], [{ x: 3, y: 3 }, { x: 0, y: 1 }, { x: 1, y: 0 }]], { indexes: [1, 0, 0], error: 3 }, "shared neighbour"),
      ],
    }),
    puzzle({
      number: 50, id: "icp-step", track: "toolkit", title: "One ICP Iteration",
      goal: "Associate, estimate the rigid transform on the paired points, and move the current cloud.",
      concept: "Every ICP iteration is association followed by one closed-form alignment.",
      functionName: "icpStep", signature: "icpStep(previous, current) → { transform, moved, error }",
      starterSource: starter("icpStep", "previous, current"),
      referenceSource: lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var paired = match.indexes.map(function (index) { return previous[index]; });",
        "  var transform = rigidTransformFromPairs(paired, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["nearest-neighbors", "rigid-transform-from-pairs", "transform-point"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (loop body)"),
      scene: { kind: "cloud-align", view: "step", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }] },
      diagnoses: [diagnosis("unpaired-estimate", "The rigid solve used the clouds in index order; pair each current point with its nearest previous point first.", lines(
        "function icpStep(previous, current) {",
        "  var match = nearestNeighbors(previous, current);",
        "  var transform = rigidTransformFromPairs(previous, current);",
        "  var moved = current.map(function (point) { return transformPoint(transform, point); });",
        "  return { transform: transform, moved: moved, error: match.error };",
        "}"
      ))],
      hints: ["Association first, then estimation, then application.", "paired[i] = previous[indexes[i]] lines the previous cloud up with current.", "moved = current mapped through transformPoint with the estimated transform."],
      cases: [
        example([LINE4, LINE4_SHIFTED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: LINE4, error: 0.4 }, "shifted line"),
        example([LINE4, LINE4_REVERSED], { transform: { x: -0.1, y: 0, yaw: 0 }, moved: [{ x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], error: 0.4 }, "reversed order"),
        example([DIAMOND, DIAMOND], { transform: { x: 0, y: 0, yaw: 0 }, moved: DIAMOND, error: 0 }, "already aligned"),
      ],
    }),
    puzzle({
      number: 51, id: "icp-match", track: "toolkit", title: "Iterative Closest Point",
      goal: "Repeat icpStep until the association error stops improving, accumulating the total transform.",
      concept: "Each step's transform goes on the left of the running total, because it acts on already-moved points.",
      functionName: "icpMatch", signature: "icpMatch(previous, current, options) → { transform, error }",
      starterSource: starter("icpMatch", "previous, current, options"),
      referenceSource: lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(step.transform, accumulated);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ),
      comparator: "deep", tolerance: 1e-3, walkthroughChapter: "sensor-scenario",
      dependencies: ["icp-step", "compose"],
      reference: pyref("SLAM/ICPMatching/icp_matching.py", "icp_matching (this puzzle accumulates by left-multiplication)"),
      scene: { kind: "cloud-align", view: "icp", handles: [{ id: "motion", type: "frame", label: "true motion", value: { x: 0.2, y: -0.1, yaw: 0.12 } }], args: [{ fixture: "previous" }, { fixture: "currentShuffled" }, { fixture: "icpOptions" }] },
      diagnoses: [diagnosis("right-multiplied", "Accumulated on the right: each new step acts on already-moved points, so it goes on the left, compose(step, total).", lines(
        "function icpMatch(previous, current, options) {",
        "  var maxIterations = options && options.maxIterations ? options.maxIterations : 50;",
        "  var eps = options && typeof options.eps === \"number\" ? options.eps : 0.0001;",
        "  var accumulated = { x: 0, y: 0, yaw: 0 };",
        "  var points = current;",
        "  var previousError = Infinity, error = Infinity, iterations = 0;",
        "  while (iterations < maxIterations) {",
        "    var step = icpStep(previous, points);",
        "    iterations += 1;",
        "    error = step.error;",
        "    accumulated = compose(accumulated, step.transform);",
        "    points = step.moved;",
        "    var change = previousError - error;",
        "    previousError = error;",
        "    if (change < eps) break;",
        "  }",
        "  return { transform: accumulated, error: error };",
        "}"
      ))],
      hints: ["Keep a running transform and the moved cloud between iterations.", "total = compose(step.transform, total); stop when the error stops dropping by more than eps.", "Return the accumulated transform and the last association error."],
      cases: [
        example([LINE4, LINE4_SHIFTED, ICP_OPTIONS], { transform: { x: -0.1, y: 0, yaw: 0 }, error: 0 }, "shifted line"),
        example([DIAMOND, DIAMOND_TURNED_20, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: A20 }, error: 0 }, "turned diamond"),
        example([CORNER, CORNER_MOVED, ICP_OPTIONS], { transform: CORNER_MOTION, error: 0 }, "moved corner"),
        example([DIAMOND, DIAMOND, ICP_OPTIONS], { transform: { x: 0, y: 0, yaw: 0 }, error: 0 }, "already aligned"),
      ],
    }),
  ];

  const TF2_MATRIX3 = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Matrix3x3.html";
  const TF2_QUATERNION = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1Quaternion.html";
  const IDENTITY_M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const Z90_M3 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
  const Y90_M3 = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
  const X90_M3 = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  const Z180_M3 = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]];
  const AXIS_SLIDERS = [
    { id: "axisYaw", type: "slider", label: "axis yaw", value: 0.8, min: -PI, max: PI },
    { id: "axisPitch", type: "slider", label: "axis pitch", value: 0.5, min: -PI / 2, max: PI / 2 },
    { id: "angle", type: "slider", label: "angle", value: 1.2, min: -PI, max: PI },
  ];

  const ADVANCED_13 = [
    puzzle({
      number: 52, id: "rotation-matrix-from-quaternion", track: "advanced", title: "Quaternion to Rotation Matrix",
      goal: "Convert a quaternion into the 3×3 rotation matrix whose columns are the rotated axes.",
      concept: "Eigen, tf2::Matrix3x3, and every SLAM paper switch between these forms constantly.",
      functionName: "rotationMatrixFromQuaternion", signature: "rotationMatrixFromQuaternion(q) → 3×3",
      starterSource: starter("rotationMatrixFromQuaternion", "q", "Normalize first; then the standard 1 − 2(y² + z²), 2(xy − wz), … formula."),
      referenceSource: lines(
        "function rotationMatrixFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  return [",
        "    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],",
        "    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],",
        "    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],",
        "  ];",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::setRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "quatFromRPY" }] },
      diagnoses: [
        diagnosis("transposed", "That is the transpose, the inverse rotation: the sign pattern is +wz in row 1 column 0 and −wz in row 0 column 1.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)], [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)], [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
        diagnosis("not-normalized", "The quaternion was not normalized: a scaled quaternion produces a scaled, non-orthonormal matrix.", lines(
          "function rotationMatrixFromQuaternion(q) {",
          "  var x = q.x, y = q.y, z = q.z, w = q.w;",
          "  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];",
          "}"
        )),
      ],
      hints: ["Each column is where one axis lands: R·(1,0,0), R·(0,1,0), R·(0,0,1).", "Diagonal: 1 − 2(sum of the other two squares); off-diagonal: 2(product ± w·other).", "Row 0: [1 − 2(y²+z²), 2(xy − wz), 2(xz + wy)]; then cycle."],
      cases: [
        example([IDENTITY_Q], IDENTITY_M3, "identity"),
        example([Z90], Z90_M3, "Z quarter turn"),
        example([Y90], Y90_M3, "Y quarter turn"),
        example([X90], X90_M3, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 * HALF, w: 2 * HALF }], Z90_M3, "non-unit input"),
      ],
    }),
    puzzle({
      number: 53, id: "quaternion-from-rotation-matrix", track: "advanced", title: "Rotation Matrix to Quaternion",
      goal: "Recover a quaternion from a rotation matrix without losing precision at 180°.",
      concept: "Pick the largest of the trace and the three diagonal entries so the division is never by a tiny number.",
      functionName: "quaternionFromRotationMatrix", signature: "quaternionFromRotationMatrix(m) → quaternion",
      starterSource: starter("quaternionFromRotationMatrix", "m"),
      referenceSource: lines(
        "function quaternionFromRotationMatrix(m) {",
        "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
        "  if (trace > 0) {",
        "    s = Math.sqrt(trace + 1) * 2;",
        "    return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
        "  }",
        "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;",
        "    return { x: 0.25 * s, y: (m[0][1] + m[1][0]) / s, z: (m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s };",
        "  }",
        "  if (m[1][1] > m[2][2]) {",
        "    s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;",
        "    return { x: (m[0][1] + m[1][0]) / s, y: 0.25 * s, z: (m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s };",
        "  }",
        "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
        "  return { x: (m[0][2] + m[2][0]) / s, y: (m[1][2] + m[2][1]) / s, z: 0.25 * s, w: (m[1][0] - m[0][1]) / s };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Matrix3x3::getRotation", TF2_MATRIX3),
      scene: { kind: "se3", view: "rpy", handles: RPY_SLIDERS, args: [{ fixture: "matrixFromRPY" }] },
      diagnoses: [
        diagnosis("trace-only", "Only the trace branch was used: at 180° the trace is −1 and the square root is zero, so the result blows up. Branch on the largest diagonal entry.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var s = Math.sqrt(m[0][0] + m[1][1] + m[2][2] + 1) * 2;",
          "  return { x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s, w: 0.25 * s };",
          "}"
        )),
        diagnosis("conjugated", "The vector part has the wrong sign: x uses m21 − m12, not m12 − m21.", lines(
          "function quaternionFromRotationMatrix(m) {",
          "  var trace = m[0][0] + m[1][1] + m[2][2], s;",
          "  if (trace > 0) { s = Math.sqrt(trace + 1) * 2; return { x: (m[1][2] - m[2][1]) / s, y: (m[2][0] - m[0][2]) / s, z: (m[0][1] - m[1][0]) / s, w: 0.25 * s }; }",
          "  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; return { x: -0.25 * s, y: -(m[0][1] + m[1][0]) / s, z: -(m[0][2] + m[2][0]) / s, w: (m[2][1] - m[1][2]) / s }; }",
          "  if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; return { x: -(m[0][1] + m[1][0]) / s, y: -0.25 * s, z: -(m[1][2] + m[2][1]) / s, w: (m[0][2] - m[2][0]) / s }; }",
          "  s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;",
          "  return { x: -(m[0][2] + m[2][0]) / s, y: -(m[1][2] + m[2][1]) / s, z: -0.25 * s, w: (m[1][0] - m[0][1]) / s };",
          "}"
        )),
      ],
      hints: ["When the trace is positive, w = √(trace + 1) / 2 and the vector part comes from the antisymmetric entries.", "Otherwise pick the largest diagonal entry and solve for that component first.", "Four branches: trace, m00, m11, m22; each divides by s = 2·√(1 + chosen − others)."],
      cases: [
        example([IDENTITY_M3], IDENTITY_Q, "identity"),
        example([Z90_M3], Z90, "Z quarter turn"),
        example([Z180_M3], { x: 0, y: 0, z: 1, w: 0 }, "Z half turn (trace −1)"),
        example([X90_M3], X90, "X quarter turn"),
        example([Y90_M3], Y90, "Y quarter turn"),
      ],
    }),
    puzzle({
      number: 54, id: "quaternion-from-axis-angle", track: "advanced", title: "Axis-Angle to Quaternion",
      goal: "Build the quaternion for a rotation of angle about an axis.",
      concept: "A quaternion is literally (axis · sin(θ/2), cos(θ/2)); yaw quaternions were the Z-axis special case.",
      functionName: "quaternionFromAxisAngle", signature: "quaternionFromAxisAngle(axis, angle) → quaternion",
      starterSource: starter("quaternionFromAxisAngle", "axis, angle", "Normalize the axis; multiply it by sin(angle/2); w = cos(angle/2)."),
      referenceSource: lines(
        "function quaternionFromAxisAngle(axis, angle) {",
        "  var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);",
        "  var s = Math.sin(angle / 2);",
        "  return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle / 2) };",
        "}"
      ),
      comparator: "quaternion", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::setRotation(axis, angle)", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "axisFromSliders" }, { handle: "angle" }] },
      diagnoses: [
        diagnosis("full-angle", "Used the full angle: quaternions store half angles.", "function quaternionFromAxisAngle(axis, angle) { var n = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z); var s = Math.sin(angle); return { x: axis.x / n * s, y: axis.y / n * s, z: axis.z / n * s, w: Math.cos(angle) }; }"),
        diagnosis("axis-not-normalized", "The axis was not normalized, so the quaternion length depends on the axis length.", "function quaternionFromAxisAngle(axis, angle) { var s = Math.sin(angle / 2); return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) }; }"),
      ],
      hints: ["The axis must be a unit vector.", "Vector part = axis · sin(angle/2); scalar part = cos(angle/2).", "Divide the axis by its length before scaling by sin(angle/2)."],
      cases: [
        example([{ x: 0, y: 0, z: 1 }, PI / 2], Z90, "Z quarter turn"),
        example([{ x: 1, y: 0, z: 0 }, PI / 2], X90, "X quarter turn"),
        example([{ x: 0, y: 0, z: 2 }, PI], { x: 0, y: 0, z: 1, w: 0 }, "non-unit axis"),
        example([{ x: 1, y: 1, z: 0 }, PI], { x: HALF, y: HALF, z: 0, w: 0 }, "diagonal axis"),
        example([{ x: 0, y: 1, z: 0 }, 0], IDENTITY_Q, "zero angle"),
      ],
    }),
    puzzle({
      number: 55, id: "axis-angle-from-quaternion", track: "advanced", title: "Quaternion to Axis-Angle",
      goal: "Recover the rotation axis and the angle in [0, π] from a quaternion.",
      concept: "q and −q are the same rotation, so flip the sign when w is negative to get the short angle.",
      functionName: "axisAngleFromQuaternion", signature: "axisAngleFromQuaternion(q) → { axis, angle }",
      starterSource: starter("axisAngleFromQuaternion", "q", "Normalize; flip q if w < 0; angle = 2·atan2(|v|, w); axis = v / |v| (or +Z when |v| ≈ 0)."),
      referenceSource: lines(
        "function axisAngleFromQuaternion(q) {",
        "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
        "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
        "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
        "  var s = Math.sqrt(x * x + y * y + z * z);",
        "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
        "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "se3",
      reference: docref("tf2 · Quaternion::getAxis / getAngle", TF2_QUATERNION),
      scene: { kind: "se3", view: "axis-angle", handles: AXIS_SLIDERS, args: [{ fixture: "quatFromAxisAngle" }] },
      diagnoses: [
        diagnosis("no-flip", "A negative w gives the long way around (angle > π) and a flipped axis: negate the whole quaternion first.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x / s, y: y / s, z: z / s }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
        diagnosis("axis-unnormalized", "The axis is the vector part divided by its length, not the raw vector part.", lines(
          "function axisAngleFromQuaternion(q) {",
          "  var n = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);",
          "  var x = q.x / n, y = q.y / n, z = q.z / n, w = q.w / n;",
          "  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }",
          "  var s = Math.sqrt(x * x + y * y + z * z);",
          "  if (s < 1e-9) return { axis: { x: 0, y: 0, z: 1 }, angle: 0 };",
          "  return { axis: { x: x, y: y, z: z }, angle: 2 * Math.atan2(s, w) };",
          "}"
        )),
      ],
      hints: ["|v| = sin(θ/2) and w = cos(θ/2) for a unit quaternion.", "angle = 2·atan2(|v|, w); axis = v / |v|.", "Negate q when w < 0 so the angle stays within [0, π]; return +Z with angle 0 for the identity."],
      cases: [
        example([Z90], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "Z quarter turn"),
        example([X90], { axis: { x: 1, y: 0, z: 0 }, angle: PI / 2 }, "X quarter turn"),
        example([{ x: 0, y: 0, z: 1, w: 0 }], { axis: { x: 0, y: 0, z: 1 }, angle: PI }, "half turn"),
        example([IDENTITY_Q], { axis: { x: 0, y: 0, z: 1 }, angle: 0 }, "identity"),
        example([{ x: 0, y: 0, z: -HALF, w: -HALF }], { axis: { x: 0, y: 0, z: 1 }, angle: PI / 2 }, "negated quaternion"),
      ],
    }),
  ];

  const ADVANCED_14 = [
    puzzle({
      number: 56, id: "static-from-urdf", track: "advanced", title: "Static Mount from URDF",
      goal: "Turn a URDF <origin xyz rpy> into the SE(3) transform a static broadcaster publishes.",
      concept: "Every sensor mount on a real robot is specified exactly this way; robot_state_publisher turns it into a static TF.",
      functionName: "staticFromUrdf", signature: "staticFromUrdf(xyz, rpy) → { translation, rotation }",
      starterSource: starter("staticFromUrdf", "xyz, rpy", "xyz is [x, y, z] metres; rpy is [roll, pitch, yaw] radians."),
      referenceSource: lines(
        "function staticFromUrdf(xyz, rpy) {",
        "  return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) };",
        "}"
      ),
      comparator: "se3", walkthroughChapter: "broadcasters",
      dependencies: ["quaternion-from-rpy"],
      reference: docref("URDF · <joint> <origin xyz rpy>", "https://wiki.ros.org/urdf/XML/joint"),
      scene: { kind: "se3", view: "urdf", handles: [
        { id: "roll", type: "slider", label: "roll", value: 0.2, min: -PI, max: PI },
        { id: "pitch", type: "slider", label: "pitch", value: -0.1, min: -PI / 2, max: PI / 2 },
        { id: "yaw", type: "slider", label: "yaw", value: 1.2, min: -PI, max: PI },
      ], args: [{ fixture: "urdfXyz" }, { fixture: "rpyArray" }] },
      diagnoses: [
        diagnosis("degrees-assumed", "URDF angles are radians already; converting from degrees shrinks them.", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0] * Math.PI / 180, rpy[1] * Math.PI / 180, rpy[2] * Math.PI / 180) }; }"),
        diagnosis("rpy-order-swapped", "The array is [roll, pitch, yaw]; it was read as [yaw, pitch, roll].", "function staticFromUrdf(xyz, rpy) { return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[2], rpy[1], rpy[0]) }; }"),
      ],
      hints: ["Translation is the xyz triple as is.", "Rotation is quaternionFromRPY(roll, pitch, yaw) with the array in that order.", "Return { translation: { x: xyz[0], y: xyz[1], z: xyz[2] }, rotation: quaternionFromRPY(rpy[0], rpy[1], rpy[2]) }."],
      cases: [
        example([[0.2, 0, 0.1], [0, 0, PI / 2]], { translation: { x: 0.2, y: 0, z: 0.1 }, rotation: Z90 }, "laser mount"),
        example([[0, 0, 0], [PI / 2, 0, 0]], { translation: { x: 0, y: 0, z: 0 }, rotation: X90 }, "roll only"),
        example([[1, 2, 3], [0, 0, 0]], { translation: { x: 1, y: 2, z: 3 }, rotation: IDENTITY_Q }, "translation only"),
        example([[0, 0, 0], [-PI / 2, 0, -PI / 2]], { translation: { x: 0, y: 0, z: 0 }, rotation: { x: -0.5, y: 0.5, z: -0.5, w: 0.5 } }, "camera optical mount"),
      ],
    }),
    puzzle({
      number: 57, id: "twist-from-poses", track: "advanced", title: "Twist from Two Poses",
      goal: "Estimate the body-frame velocity between two stamped poses.",
      concept: "Odometry messages carry a twist in the child frame; it is relativeTransform divided by dt.",
      functionName: "twistFromPoses", signature: "twistFromPoses(a, b, dt) → { vx, vy, wz }",
      starterSource: starter("twistFromPoses", "a, b, dt", "relativeTransform(a, b) is the motion seen from a; divide by dt."),
      referenceSource: lines(
        "function twistFromPoses(a, b, dt) {",
        "  var relative = relativeTransform(a, b);",
        "  return { vx: relative.x / dt, vy: relative.y / dt, wz: relative.yaw / dt };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "frame-roles",
      dependencies: ["relative-transform"],
      reference: docref("nav_msgs/Odometry · twist is expressed in the child frame", "https://docs.ros.org/en/rolling/p/nav_msgs/msg/Odometry.html"),
      scene: { kind: "twist", handles: [
        { id: "a", type: "pose", label: "a", value: { x: -2, y: -0.5, yaw: 0.3 } },
        { id: "b", type: "pose", label: "b", value: { x: 0.5, y: 0.8, yaw: 0.9 } },
        { id: "dt", type: "slider", label: "dt (s)", value: 1.0, min: 0.1, max: 2 },
      ] },
      diagnoses: [
        diagnosis("world-frame-delta", "That is the world-frame displacement: a twist is expressed in a's body frame, so use relativeTransform first.", "function twistFromPoses(a, b, dt) { return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt, wz: wrapAngle(b.yaw - a.yaw) / dt }; }"),
        diagnosis("no-dt", "Not divided by dt: a twist is a rate, not a displacement.", "function twistFromPoses(a, b, dt) { var relative = relativeTransform(a, b); return { vx: relative.x, vy: relative.y, wz: relative.yaw }; }"),
      ],
      hints: ["Where is b as seen from a? That is relativeTransform(a, b).", "Divide each component by dt.", "Return { vx: rel.x / dt, vy: rel.y / dt, wz: rel.yaw / dt }."],
      cases: [
        example([{ x: 0, y: 0, yaw: 0 }, { x: 1, y: 0, yaw: 0 }, 0.5], { vx: 2, vy: 0, wz: 0 }, "forward"),
        example([{ x: 0, y: 0, yaw: PI / 2 }, { x: 0, y: 1, yaw: PI / 2 }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing +y"),
        example([{ x: 0, y: 0, yaw: 0 }, { x: 0, y: 0, yaw: 0.2 }, 0.1], { vx: 0, vy: 0, wz: 2 }, "turn in place"),
        example([{ x: 1, y: 1, yaw: PI }, { x: 0, y: 1, yaw: PI }, 1], { vx: 1, vy: 0, wz: 0 }, "forward while facing −x"),
      ],
    }),
    puzzle({
      number: 58, id: "deskew-scan", track: "advanced", title: "De-skew a Lidar Scan",
      goal: "Re-express every scan point, measured at its own time, in the sensor frame at the end of the scan.",
      concept: "A spinning lidar moves while it scans; without de-skewing, a straight wall bends.",
      functionName: "deskewScan", signature: "deskewScan(points, times, samples, endTime) → points",
      starterSource: starter("deskewScan", "points, times, samples, endTime"),
      referenceSource: lines(
        "function deskewScan(points, times, samples, endTime) {",
        "  var toEnd = invert(sampleEdge({ samples: samples }, endTime));",
        "  var out = [];",
        "  for (var i = 0; i < points.length; i += 1) {",
        "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
        "    out.push(transformPoint(compose(toEnd, poseAtTime), points[i]));",
        "  }",
        "  return out;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sensor-scenario",
      dependencies: ["sample-edge", "compose", "invert", "transform-point"],
      reference: docref("laser_geometry · LaserProjection::transformLaserScanToPointCloud", "https://docs.ros.org/en/rolling/p/laser_geometry/"),
      scene: { kind: "deskew", handles: [{ id: "end", type: "pose", label: "sensor at t=1", value: { x: 1.2, y: 0.3, yaw: 0.4 } }], args: [{ fixture: "rawPoints" }, { fixture: "times" }, { fixture: "samples" }, 1] },
      diagnoses: [
        diagnosis("no-interpolation", "Every point used the end pose, so nothing moved: sample the pose at each point's own time.", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var toEnd = invert(endPose);",
          "  return points.map(function (point) { return transformPoint(compose(toEnd, endPose), point); });",
          "}"
        )),
        diagnosis("inverse-direction", "The composition is backwards: go from the point's frame up to odom, then down into the end frame: compose(invert(endPose), poseAtTime).", lines(
          "function deskewScan(points, times, samples, endTime) {",
          "  var endPose = sampleEdge({ samples: samples }, endTime);",
          "  var out = [];",
          "  for (var i = 0; i < points.length; i += 1) {",
          "    var poseAtTime = sampleEdge({ samples: samples }, times[i]);",
          "    out.push(transformPoint(compose(invert(poseAtTime), endPose), points[i]));",
          "  }",
          "  return out;",
          "}"
        )),
      ],
      hints: ["Each point lives in the sensor frame at its own time.", "Go up to odom with the pose at that time, then down into the end frame with the inverse of the end pose.", "T = compose(invert(pose(endTime)), pose(times[i])); apply it to points[i]."],
      cases: [
        example([[{ x: 3, y: 0 }, { x: 3, y: 1 }], [0, 0.5], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: 0 } }], 1], [{ x: 3, y: 0 }, { x: 3, y: 1 }], "stationary sensor"),
        example([[{ x: 3, y: 0 }, { x: 2.5, y: 0 }, { x: 2, y: 0 }], [0, 0.5, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [{ x: 2, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 0 }], "moving forward"),
        example([[{ x: 1, y: 0 }, { x: 0.5, y: 0 }], [0, 1], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 0, y: 0, yaw: PI / 2 } }], 1], [{ x: 0, y: -1 }, { x: 0.5, y: 0 }], "turning in place"),
        example([[], [], [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 1, transform: { x: 1, y: 0, yaw: 0 } }], 1], [], "empty scan"),
      ],
    }),
  ];

  const TF2_BUFFER_CORE = "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1BufferCore.html";
  const TF2_ROS_BUFFER = "https://docs.ros.org/en/rolling/p/tf2_ros/generated/classtf2__ros_1_1Buffer.html";
  const EMPTY_BUFFER = { duration: 10, edges: {} };
  const LASER_STATIC_EDGE = { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] };
  const ODOM_TWO = { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] };
  const CHAIN_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 10, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 2, parent: "odom", transform: { x: 0, y: 0, yaw: 0 } }, { time: 9, parent: "odom", transform: { x: 7, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
    camera: { isStatic: false, samples: [{ time: 8, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }, { time: 9, parent: "base_link", transform: { x: 0, y: 0.3, yaw: 0 } }] },
  } };
  const REPARENT_BUFFER = { duration: 10, edges: {
    odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }, { time: 10, parent: "map", transform: { x: 2, y: 0, yaw: 0 } }] },
    base_link: { isStatic: false, samples: [{ time: 0, parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, { time: 6, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 9, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }] },
    laser: LASER_STATIC_EDGE,
  } };
  const ARRIVALS = [{ time: 0, arrival: 0.2 }, { time: 1, arrival: 1.3 }, { time: 2, arrival: 2.1 }, { time: 3, arrival: 3.6 }, { time: 4, arrival: 4.2 }];

  const ADVANCED_15 = [
    puzzle({
      number: 59, id: "insert-transform", track: "advanced", title: "Insert into a TF Buffer",
      goal: "Latch a static transform, or append a dynamic one and prune history older than the buffer duration.",
      concept: "This is the whole static-versus-dynamic difference: one latched sample forever, versus a sliding window of stamped samples.",
      functionName: "insertTransform", signature: "insertTransform(buffer, sample, isStatic) → newBuffer",
      starterSource: starter("insertTransform", "buffer, sample, isStatic", "sample is { child, parent, time, transform }. Return a new buffer; do not mutate."),
      referenceSource: lines(
        "function insertTransform(buffer, sample, isStatic) {",
        "  var edges = Object.assign({}, buffer.edges);",
        "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
        "  if (isStatic) {",
        "    edges[sample.child] = { isStatic: true, samples: [entry] };",
        "    return { duration: buffer.duration, edges: edges };",
        "  }",
        "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
        "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
        "  var newest = samples[samples.length - 1].time;",
        "  samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; });",
        "  edges[sample.child] = { isStatic: false, samples: samples };",
        "  return { duration: buffer.duration, edges: edges };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "broadcasters",
      reference: docref("tf2 · BufferCore::setTransform and TimeCache pruning", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "insert", handles: [
        { id: "time", type: "timeline", label: "sample time", value: 14, start: 0, end: 20 },
        { id: "kind", type: "selector", label: "edge", value: "dynamic", options: ["dynamic", "static"] },
      ], args: [{ fixture: "buffer" }, { fixture: "insertedSample" }, { fixture: "insertIsStatic" }] },
      diagnoses: [
        diagnosis("no-pruning", "Old samples were kept: a dynamic edge only holds samples newer than newest − duration.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  if (isStatic) { edges[sample.child] = { isStatic: true, samples: [entry] }; return { duration: buffer.duration, edges: edges }; }",
          "  var existing = edges[sample.child] && !edges[sample.child].isStatic ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  edges[sample.child] = { isStatic: false, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
        diagnosis("static-appended", "A static transform was appended like a dynamic sample: static edges are latched, one sample that replaces the previous one.", lines(
          "function insertTransform(buffer, sample, isStatic) {",
          "  var edges = Object.assign({}, buffer.edges);",
          "  var entry = { time: sample.time, parent: sample.parent, transform: sample.transform };",
          "  var existing = edges[sample.child] ? edges[sample.child].samples : [];",
          "  var samples = existing.concat([entry]).sort(function (a, b) { return a.time - b.time; });",
          "  if (!isStatic) { var newest = samples[samples.length - 1].time; samples = samples.filter(function (s) { return s.time >= newest - buffer.duration; }); }",
          "  edges[sample.child] = { isStatic: isStatic, samples: samples };",
          "  return { duration: buffer.duration, edges: edges };",
          "}"
        )),
      ],
      hints: ["Copy buffer.edges; never modify the input.", "Static: edges[child] = { isStatic: true, samples: [entry] }.", "Dynamic: append, sort by time, then keep only samples with time ≥ newest − buffer.duration."],
      cases: [
        example([EMPTY_BUFFER, { child: "laser", parent: "base_link", time: 0, transform: { x: 1, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 0, parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } }] } } }, "latch a static edge"),
        example([{ duration: 10, edges: { odom: ODOM_TWO } }, { child: "odom", parent: "map", time: 14, transform: { x: 14, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 5, parent: "map", transform: { x: 5, y: 0, yaw: 0 } }, { time: 14, parent: "map", transform: { x: 14, y: 0, yaw: 0 } }] } } }, "append and prune"),
        example([{ duration: 10, edges: { laser: LASER_STATIC_EDGE } }, { child: "laser", parent: "base_link", time: 3, transform: { x: 2, y: 0, yaw: 0 } }, true], { duration: 10, edges: { laser: { isStatic: true, samples: [{ time: 3, parent: "base_link", transform: { x: 2, y: 0, yaw: 0 } }] } } }, "republish a static edge"),
        example([{ duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, { child: "odom", parent: "map", time: 4, transform: { x: 4, y: 0, yaw: 0 } }, false], { duration: 10, edges: { odom: { isStatic: false, samples: [{ time: 0, parent: "map", transform: { x: 0, y: 0, yaw: 0 } }, { time: 4, parent: "map", transform: { x: 4, y: 0, yaw: 0 } }, { time: 8, parent: "map", transform: { x: 8, y: 0, yaw: 0 } }] } } }, "out-of-order arrival"),
      ],
    }),
    puzzle({
      number: 60, id: "parent-at", track: "advanced", title: "Parent at a Time",
      goal: "Find a frame's parent at a given time, and refuse to interpolate across a reparenting.",
      concept: "TF2 allows a child's parent to change over time; the two samples around a lookup must agree.",
      functionName: "parentAt", signature: "parentAt(buffer, child, time) → parent | null",
      starterSource: starter("parentAt", "buffer, child, time"),
      referenceSource: lines(
        "function parentAt(buffer, child, time) {",
        "  var edge = buffer.edges[child];",
        "  if (!edge || !edge.samples.length) return null;",
        "  if (edge.isStatic) return edge.samples[0].parent;",
        "  var b = bracketSamples(edge.samples, time);",
        "  var before = edge.samples[b.beforeIndex], after = edge.samples[b.afterIndex];",
        "  if (b.amount === 0) return before.parent;",
        "  return before.parent === after.parent ? before.parent : null;",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "tree",
      dependencies: ["bracket-samples"],
      reference: docref("tf2 · TimeCache::getParent", "https://docs.ros.org/en/rolling/p/tf2/generated/classtf2_1_1TimeCache.html"),
      scene: { kind: "buffer", view: "parents", handles: [{ id: "time", type: "timeline", label: "time", value: 3, start: -1, end: 11 }], args: [{ fixture: "reparentBuffer" }, "base_link", { handle: "time" }] },
      diagnoses: [
        diagnosis("latest-only", "Always returned the newest sample's parent: the parent must be read at the requested time.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  return edge.samples[edge.samples.length - 1].parent;",
          "}"
        )),
        diagnosis("ignores-change", "Returned the earlier sample's parent even when the later one differs: interpolating across a reparenting is not allowed, return null.", lines(
          "function parentAt(buffer, child, time) {",
          "  var edge = buffer.edges[child];",
          "  if (!edge || !edge.samples.length) return null;",
          "  if (edge.isStatic) return edge.samples[0].parent;",
          "  var b = bracketSamples(edge.samples, time);",
          "  return edge.samples[b.beforeIndex].parent;",
          "}"
        )),
      ],
      hints: ["Static edges have one parent for all time.", "Bracket the dynamic samples with bracketSamples; an exact hit (amount 0) uses that sample's parent.", "If the two bracketing samples name different parents, return null."],
      cases: [
        example([REPARENT_BUFFER, "base_link", 7], "map", "after the reparenting"),
        example([REPARENT_BUFFER, "base_link", 3], null, "across the reparenting"),
        example([REPARENT_BUFFER, "base_link", -1], "odom", "before the history"),
        example([REPARENT_BUFFER, "laser", 42], "base_link", "static edge"),
        example([REPARENT_BUFFER, "camera", 1], null, "unknown child"),
        example([REPARENT_BUFFER, "base_link", 0], "odom", "exactly on a sample"),
      ],
    }),
    puzzle({
      number: 61, id: "buffer-can-transform", track: "advanced", title: "Can the Buffer Answer?",
      goal: "Decide whether a lookup is answerable: connected path, every dynamic edge on it covers the time, no reparenting in between.",
      concept: "Static edges never limit a lookup; only the dynamic edges on the actual path do.",
      functionName: "canTransform", signature: "canTransform(buffer, target, source, time) → { ok } | { ok: false, code }",
      starterSource: starter("canTransform", "buffer, target, source, time", "Codes: DISCONNECTED, PAST_EXTRAPOLATION, FUTURE_EXTRAPOLATION, PARENT_CHANGE."),
      referenceSource: lines(
        "function canTransform(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent };",
        "  });",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
        "  for (var i = 0; i < steps.length; i += 1) {",
        "    var edge = buffer.edges[steps[i].child];",
        "    if (edge.isStatic) continue;",
        "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
        "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
        "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
        "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
        "  }",
        "  return { ok: true };",
        "}"
      ),
      comparator: "error", walkthroughChapter: "time-buffer",
      dependencies: ["parent-at", "directed-path"],
      reference: docref("tf2_ros · Buffer::canTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "can", handles: [
        { id: "time", type: "timeline", label: "time", value: 5, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [
        diagnosis("static-ranged", "A static edge was treated as a range around its latch time: static edges are valid at every time.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  for (var i = 0; i < steps.length; i += 1) {",
          "    var edge = buffer.edges[steps[i].child];",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, steps[i].child, time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
        diagnosis("whole-buffer-range", "Every dynamic edge in the buffer was checked: only the edges on the path between target and source matter.", lines(
          "function canTransform(buffer, target, source, time) {",
          "  var tree = {};",
          "  Object.keys(buffer.edges).forEach(function (child) { var edge = buffer.edges[child]; tree[child] = { parent: parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent }; });",
          "  var steps = directedPath(tree, target, source);",
          "  if (steps === null) return { ok: false, code: \"DISCONNECTED\" };",
          "  var children = Object.keys(buffer.edges);",
          "  for (var i = 0; i < children.length; i += 1) {",
          "    var edge = buffer.edges[children[i]];",
          "    if (edge.isStatic) continue;",
          "    var start = edge.samples[0].time, end = edge.samples[edge.samples.length - 1].time;",
          "    if (time < start) return { ok: false, code: \"PAST_EXTRAPOLATION\" };",
          "    if (time > end) return { ok: false, code: \"FUTURE_EXTRAPOLATION\" };",
          "    if (parentAt(buffer, children[i], time) === null) return { ok: false, code: \"PARENT_CHANGE\" };",
          "  }",
          "  return { ok: true };",
          "}"
        )),
      ],
      hints: ["Build a plain tree of parents at the requested time, then reuse directedPath.", "Only the edges on the path matter, and static ones always pass.", "For each dynamic step: PAST if time < first sample, FUTURE if time > last sample, PARENT_CHANGE if parentAt is null."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true }, "inside every range"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "before base_link history"),
        example([CHAIN_BUFFER, "map", "base_link", 9.5], { ok: false, code: "FUTURE_EXTRAPOLATION" }, "after base_link history"),
        example([CHAIN_BUFFER, "map", "nowhere", 5], { ok: false, code: "DISCONNECTED" }, "unknown frame"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true }, "static-only path at any time"),
        example([CHAIN_BUFFER, "map", "base_link", 2], { ok: true }, "off-path camera edge does not matter"),
        example([REPARENT_BUFFER, "map", "base_link", 3], { ok: false, code: "PARENT_CHANGE" }, "across a reparenting"),
      ],
    }),
    puzzle({
      number: 62, id: "wait-for-transform", track: "advanced", title: "When Does the Answer Arrive?",
      goal: "Given when each sample reached the buffer, find the earliest wall time a lookup at a stamp becomes answerable.",
      concept: "Transforms arrive late. A lookup needs the sample *after* the stamp too, so nodes wait or time out.",
      functionName: "waitForTransform", signature: "waitForTransform(samples, stamp) → wallTime | null",
      starterSource: starter("waitForTransform", "samples, stamp", "samples are { time, arrival } sorted by time. Bracket the stamp; the answer is the later arrival."),
      referenceSource: lines(
        "function waitForTransform(samples, stamp) {",
        "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
        "  var b = bracketSamples(samples, stamp);",
        "  if (b.amount === 0) return samples[b.beforeIndex].arrival;",
        "  return Math.max(samples[b.beforeIndex].arrival, samples[b.afterIndex].arrival);",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "time-buffer",
      dependencies: ["bracket-samples"],
      reference: docref("tf2_ros · Buffer::canTransform(…, timeout) and waitForTransform", TF2_ROS_BUFFER),
      scene: { kind: "buffer", view: "wait", handles: [{ id: "stamp", type: "timeline", label: "requested stamp", value: 1.5, start: -0.5, end: 4.5 }], args: [{ fixture: "arrivals" }, { handle: "stamp" }] },
      diagnoses: [
        diagnosis("before-only", "Only the earlier sample's arrival was used: interpolation also needs the sample after the stamp.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return samples[b.beforeIndex].arrival;",
          "}"
        )),
        diagnosis("stamp-not-arrival", "The sample's stamp was returned instead of its arrival time.", lines(
          "function waitForTransform(samples, stamp) {",
          "  if (!samples.length || stamp < samples[0].time || stamp > samples[samples.length - 1].time) return null;",
          "  var b = bracketSamples(samples, stamp);",
          "  return Math.max(samples[b.beforeIndex].time, samples[b.afterIndex].time);",
          "}"
        )),
      ],
      hints: ["No bracket, no answer: return null outside the stamped history.", "An exact stamp needs only that one sample's arrival.", "Otherwise the lookup waits for the later of the two bracketing arrivals."],
      cases: [
        example([ARRIVALS, 0.5], 1.3, "between samples"),
        example([ARRIVALS, 1], 1.3, "exact stamp"),
        example([ARRIVALS, 2.5], 3.6, "late arrival dominates"),
        example([ARRIVALS, 4], 4.2, "last stamp"),
        example([ARRIVALS, 4.5], null, "not yet answerable"),
        example([ARRIVALS, -1], null, "before the history"),
      ],
    }),
    puzzle({
      number: 63, id: "buffer-lookup", track: "advanced", title: "Buffer-Aware Lookup",
      goal: "Answer a lookup from a real buffer: check availability, sample every edge at the time with the right parent, then traverse.",
      concept: "Static edges pass their latched transform through; dynamic edges interpolate; parents come from parentAt.",
      functionName: "bufferLookup", signature: "bufferLookup(buffer, target, source, time) → { ok: true, transform } | { ok: false, code }",
      starterSource: starter("bufferLookup", "buffer, target, source, time"),
      referenceSource: lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var availability = canTransform(buffer, target, source, time);",
        "  if (!availability.ok) return availability;",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  return { ok: true, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", walkthroughChapter: "sandbox",
      dependencies: ["buffer-can-transform", "parent-at", "sample-edge", "store-edge", "lookup-transform"],
      reference: docref("tf2 · BufferCore::lookupTransform", TF2_BUFFER_CORE),
      scene: { kind: "buffer", view: "lookup", handles: [
        { id: "time", type: "timeline", label: "time", value: 4, start: -1, end: 12 },
        { id: "target", type: "selector", label: "target", value: "map", options: CHAIN_OPTIONS },
        { id: "source", type: "selector", label: "source", value: "laser", options: CHAIN_OPTIONS },
      ], args: [{ fixture: "buffer" }, { handle: "target" }, { handle: "source" }, { handle: "time" }] },
      diagnoses: [diagnosis("skips-availability", "The lookup never asked canTransform, so it answers with clamped data at times the buffer cannot cover.", lines(
        "function bufferLookup(buffer, target, source, time) {",
        "  var tree = {};",
        "  Object.keys(buffer.edges).forEach(function (child) {",
        "    var edge = buffer.edges[child];",
        "    var parent = parentAt(buffer, child, time) || edge.samples[edge.samples.length - 1].parent;",
        "    var transform = edge.isStatic ? edge.samples[0].transform : sampleEdge({ samples: edge.samples }, time);",
        "    tree = storeEdge(tree, { parent: parent, child: child, transform: transform });",
        "  });",
        "  var transform = lookupTransform(tree, target, source);",
        "  return transform === null ? { ok: false, code: \"DISCONNECTED\" } : { ok: true, transform: transform };",
        "}"
      ))],
      hints: ["canTransform first; return its error object unchanged.", "Static edges contribute samples[0].transform; dynamic edges contribute sampleEdge({ samples }, time).", "storeEdge each child with parentAt's answer, then lookupTransform(tree, target, source)."],
      cases: [
        example([CHAIN_BUFFER, "map", "laser", 5], { ok: true, transform: { x: 9, y: 0, yaw: 0 } }, "interpolated chain"),
        example([CHAIN_BUFFER, "map", "laser", 1], { ok: false, code: "PAST_EXTRAPOLATION" }, "unavailable time"),
        example([CHAIN_BUFFER, "laser", "base_link", 100], { ok: true, transform: { x: -1, y: 0, yaw: 0 } }, "static-only path"),
        example([REPARENT_BUFFER, "map", "base_link", 8], { ok: true, transform: { x: 5, y: 0, yaw: 0 } }, "after reparenting to map"),
        example([REPARENT_BUFFER, "map", "base_link", 2], { ok: false, code: "PARENT_CHANGE" }, "across the reparenting"),
      ],
    }),
  ];

  const PUZZLES = Object.freeze(STAGE_1_2.concat(STAGE_3_4, STAGE_5_7, TOOLKIT_8, TOOLKIT_9, TOOLKIT_10, TOOLKIT_11, TOOLKIT_12, ADVANCED_13, ADVANCED_14, ADVANCED_15));
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

(function exposeTF2Puzzles(root) {
  "use strict";

  const PI = Math.PI;

  const STAGES = Object.freeze([
    { id: "coordinate-bricks", title: "Coordinate Bricks", subtitle: "Make the smallest useful geometric values.", range: [1, 5] },
    { id: "local-geometry", title: "Local Geometry", subtitle: "Move values without losing their meaning.", range: [6, 10] },
    { id: "se2-components", title: "SE(2) Components", subtitle: "Build a rigid 2D transform from reusable operations.", range: [11, 15] },
    { id: "tree-components", title: "Tree Components", subtitle: "Turn parent-child edges into traversable structure.", range: [16, 20] },
    { id: "lookup-robot", title: "TF Lookup & Robot Frames", subtitle: "Resolve real map, odom, base, and sensor questions.", range: [21, 24] },
    { id: "time", title: "Time", subtitle: "Interpolate samples and respect buffer boundaries.", range: [25, 27] },
    { id: "se3", title: "SE(3)", subtitle: "Lift the same ideas into quaternion-based 3D.", range: [28, 29] },
    { id: "capstone", title: "Capstone", subtitle: "Assemble a small stamped TF buffer.", range: [30, 30] },
  ]);

  function lines() {
    return Array.from(arguments).join("\n");
  }

  function starter(functionName, args, comment) {
    return lines(
      "function " + functionName + "(" + args + ") {",
      "  // " + comment,
      "  return null;",
      "}"
    );
  }

  function example(args, expected, label) {
    return Object.freeze({ args, expected, label });
  }

  function puzzle(config) {
    const stage = STAGES.find((candidate) => (
      config.number >= candidate.range[0] && config.number <= candidate.range[1]
    ));
    return Object.freeze({
      tolerance: 1e-6,
      dependencies: Object.freeze([]),
      codePieces: Object.freeze([]),
      ...config,
      stage: stage.id,
      hints: Object.freeze(config.hints),
      publicCases: Object.freeze(config.cases.slice(0, 1)),
      checkCases: Object.freeze(config.cases.slice(1)),
      dependencies: Object.freeze(config.dependencies || []),
      codePieces: Object.freeze(config.codePieces || []),
      preview: Object.freeze(config.preview),
    });
  }

  const PUZZLES = Object.freeze([
    puzzle({
      number: 1, id: "make-point", title: "Place a Point",
      goal: "Construct a point at the supplied coordinates. A point answers: where?",
      functionName: "makePoint", signature: "makePoint(x, y) → { x, y }",
      starterSource: starter("makePoint", "x, y", "Return one object that stores this position."),
      referenceSource: "function makePoint(x, y) { return { x: x, y: y }; }",
      comparator: "vector2", preview: { kind: "vector", valueRole: "point" }, walkthroughChapter: "data-types",
      hints: ["A point needs one horizontal and one vertical coordinate.", "Use an object with x and y properties.", "Return { x: x, y: y }."],
      codePieces: ["return", "{ x: x, y: y }", ";"],
      cases: [example([2, 3], { x: 2, y: 3 }, "first quadrant"), example([-4, 1.5], { x: -4, y: 1.5 }, "signed coordinates")],
    }),
    puzzle({
      number: 2, id: "make-vector", title: "Build a Vector",
      goal: "Construct a displacement. It uses the same numbers as a point but means how far and which way.",
      functionName: "makeVector", signature: "makeVector(x, y) → { x, y }",
      starterSource: starter("makeVector", "x, y", "Return the displacement components."),
      referenceSource: "function makeVector(x, y) { return { x: x, y: y }; }",
      comparator: "vector2", preview: { kind: "vector", valueRole: "vector" }, walkthroughChapter: "data-types",
      hints: ["Store both displacement components.", "The data shape is { x, y }; its meaning comes from use.", "Return { x: x, y: y }."],
      codePieces: ["return", "{ x: x, y: y }", ";"],
      cases: [example([3, -2], { x: 3, y: -2 }, "directed displacement"), example([0, 4], { x: 0, y: 4 }, "vertical displacement")],
    }),
    puzzle({
      number: 3, id: "add-vectors", title: "Join Two Moves",
      goal: "Add two displacements component by component.",
      functionName: "addVectors", signature: "addVectors(a, b) → vector",
      starterSource: starter("addVectors", "a, b", "Combine the two moves."),
      referenceSource: "function addVectors(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }",
      comparator: "vector2", preview: { kind: "vector", valueRole: "sum" }, walkthroughChapter: "composition",
      hints: ["Horizontal motion combines independently from vertical motion.", "Add a.x to b.x, and a.y to b.y.", "Return a new { x, y } object; do not edit either input."],
      codePieces: ["a.x + b.x", "a.y + b.y", "return { x:", ", y:", "};"],
      cases: [example([{ x: 2, y: 1 }, { x: -1, y: 3 }], { x: 1, y: 4 }, "head-to-tail sum"), example([{ x: -4, y: 0.5 }, { x: 7, y: -2 }], { x: 3, y: -1.5 }, "mixed signs")],
    }),
    puzzle({
      number: 4, id: "point-difference", title: "Point to Point",
      goal: "Subtract the start point from the destination to obtain the vector between them.",
      functionName: "pointDifference", signature: "pointDifference(to, from) → vector",
      starterSource: starter("pointDifference", "to, from", "Return the arrow from from to to."),
      referenceSource: "function pointDifference(to, from) { return { x: to.x - from.x, y: to.y - from.y }; }",
      comparator: "vector2", preview: { kind: "point-vector" }, walkthroughChapter: "data-types",
      hints: ["The direction matters: destination minus start.", "Compute the x and y differences separately.", "Return { x: to.x - from.x, y: to.y - from.y }."],
      codePieces: ["to.x - from.x", "to.y - from.y", "return { x:", ", y:", "};"],
      cases: [example([{ x: 5, y: 3 }, { x: 2, y: -1 }], { x: 3, y: 4 }, "3-4-5 displacement"), example([{ x: -2, y: 1 }, { x: 3, y: 5 }], { x: -5, y: -4 }, "reverse quadrant")],
    }),
    puzzle({
      number: 5, id: "vector-magnitude", title: "Measure a Vector",
      goal: "Compute Euclidean length from orthogonal components.",
      functionName: "vectorMagnitude", signature: "vectorMagnitude(v) → number",
      starterSource: starter("vectorMagnitude", "v", "Use the Pythagorean relationship."),
      referenceSource: "function vectorMagnitude(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }",
      comparator: "scalar", preview: { kind: "scalar" }, walkthroughChapter: "data-types",
      hints: ["The components form the legs of a right triangle.", "Length squared is x² + y².", "Return Math.sqrt(v.x * v.x + v.y * v.y)."],
      codePieces: ["Math.sqrt(", "v.x * v.x", "+", "v.y * v.y", ")", "return"],
      cases: [example([{ x: 3, y: 4 }], 5, "3-4-5 triangle"), example([{ x: -5, y: 12 }], 13, "signed components")],
    }),
    puzzle({
      number: 6, id: "normalize-vector", title: "Keep Direction, Set Length",
      goal: "Return a unit vector, while treating the zero vector as a special case.",
      functionName: "normalizeVector", signature: "normalizeVector(v) → vector",
      starterSource: starter("normalizeVector", "v", "Reuse vectorMagnitude(v), then divide safely."),
      referenceSource: lines("function normalizeVector(v) {", "  var length = vectorMagnitude(v);", "  return length === 0 ? { x: 0, y: 0 } : { x: v.x / length, y: v.y / length };", "}"),
      comparator: "vector2", preview: { kind: "vector", valueRole: "unit" }, walkthroughChapter: "data-types",
      dependencies: ["vector-magnitude"],
      hints: ["Divide every component by the vector length.", "The zero vector has no direction, so return zero safely.", "Use var length = vectorMagnitude(v), then divide x and y by length."],
      codePieces: ["var length = vectorMagnitude(v);", "length === 0", "{ x: 0, y: 0 }", "{ x: v.x / length, y: v.y / length }", "return"],
      cases: [example([{ x: 3, y: 4 }], { x: 0.6, y: 0.8 }, "unit direction"), example([{ x: 0, y: 0 }], { x: 0, y: 0 }, "zero guard")],
    }),
    puzzle({
      number: 7, id: "rotate-vector", title: "Turn a Direction",
      goal: "Rotate a vector by yaw without translating it.",
      functionName: "rotateVector", signature: "rotateVector(v, yaw) → vector",
      starterSource: starter("rotateVector", "v, yaw", "Apply the 2×2 rotation matrix."),
      referenceSource: lines("function rotateVector(v, yaw) {", "  var c = Math.cos(yaw);", "  var s = Math.sin(yaw);", "  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };", "}"),
      comparator: "vector2", preview: { kind: "vector", valueRole: "rotation" }, walkthroughChapter: "matrix-stack",
      hints: ["A rotation mixes x and y but does not add an offset.", "Use rows [cos, -sin] and [sin, cos].", "x′ = cos(yaw)x - sin(yaw)y; y′ = sin(yaw)x + cos(yaw)y."],
      codePieces: ["var c = Math.cos(yaw);", "var s = Math.sin(yaw);", "c * v.x - s * v.y", "s * v.x + c * v.y", "return { x:", ", y:", "};"],
      cases: [example([{ x: 1, y: 0 }, PI / 2], { x: 0, y: 1 }, "quarter turn"), example([{ x: 2, y: -3 }, PI], { x: -2, y: 3 }, "half turn")],
    }),
    puzzle({
      number: 8, id: "translate-point", title: "Move a Point",
      goal: "Move a position by a displacement using your vector adder.",
      functionName: "translatePoint", signature: "translatePoint(point, offset) → point",
      starterSource: starter("translatePoint", "point, offset", "A translated point is point + offset."),
      referenceSource: "function translatePoint(point, offset) { return addVectors(point, offset); }",
      comparator: "vector2", preview: { kind: "point-vector" }, walkthroughChapter: "matrix-stack",
      dependencies: ["add-vectors"],
      hints: ["Translation changes where a point is.", "A point plus a vector has the same component arithmetic as vector addition.", "Return addVectors(point, offset)."],
      codePieces: ["addVectors(point, offset)", "return", ";"],
      cases: [example([{ x: 1, y: 2 }, { x: 4, y: -1 }], { x: 5, y: 1 }, "point shift"), example([{ x: -3, y: 5 }, { x: 0.5, y: 2 }], { x: -2.5, y: 7 }, "fractional shift")],
    }),
    puzzle({
      number: 9, id: "point-vs-vector", title: "Point or Vector?",
      goal: "Apply translation only when the value represents a point; a free vector ignores origin shifts.",
      functionName: "applyOffset", signature: "applyOffset(value, offset, isPoint) → value",
      starterSource: starter("applyOffset", "value, offset, isPoint", "Branch on geometric meaning."),
      referenceSource: "function applyOffset(value, offset, isPoint) { return isPoint ? { x: value.x + offset.x, y: value.y + offset.y } : { x: value.x, y: value.y }; }",
      comparator: "vector2", preview: { kind: "point-vector" }, walkthroughChapter: "data-types",
      hints: ["Changing the origin moves positions, not free directions.", "If isPoint is false, copy the vector unchanged.", "Use a conditional expression returning a new object in both branches."],
      codePieces: ["isPoint ?", ": { x: value.x, y: value.y }", "{ x: value.x + offset.x, y: value.y + offset.y }", "return"],
      cases: [example([{ x: 1, y: 2 }, { x: 10, y: -5 }, true], { x: 11, y: -3 }, "point receives offset"), example([{ x: 1, y: 2 }, { x: 10, y: -5 }, false], { x: 1, y: 2 }, "vector ignores offset")],
    }),
    puzzle({
      number: 10, id: "recover-heading", title: "Vector to Heading",
      goal: "Recover a signed yaw from a direction in every quadrant.",
      functionName: "recoverHeading", signature: "recoverHeading(v) → radians",
      starterSource: starter("recoverHeading", "v", "Use the two-argument arctangent."),
      referenceSource: "function recoverHeading(v) { return Math.atan2(v.y, v.x); }",
      comparator: "angle", preview: { kind: "vector", valueRole: "heading" }, walkthroughChapter: "data-types",
      hints: ["A ratio alone loses quadrant information.", "JavaScript provides Math.atan2(y, x).", "Return Math.atan2(v.y, v.x)."],
      codePieces: ["Math.atan2(", "v.y", ",", "v.x", ")", "return"],
      cases: [example([{ x: 0, y: 2 }], PI / 2, "positive Y"), example([{ x: -1, y: -1 }], -3 * PI / 4, "third quadrant")],
    }),
    puzzle({
      number: 11, id: "apply-se2", title: "Apply T_target_source",
      goal: "Rotate in the source frame, then translate into the target frame.",
      functionName: "applySE2", signature: "applySE2(transform, point) → point",
      starterSource: lines("function applySE2(transform, point) {", "  var rotated = rotateVector(point, transform.yaw);", "  return null;", "}"),
      referenceSource: lines("function applySE2(transform, point) {", "  var rotated = rotateVector(point, transform.yaw);", "  return translatePoint(rotated, transform);", "}"),
      comparator: "vector2", preview: { kind: "se2" }, walkthroughChapter: "matrix-stack",
      dependencies: ["rotate-vector", "translate-point"],
      hints: ["The frame name order tells you where the result lands.", "Rigid transforms apply rotation before translation.", "Rotate point by transform.yaw, then translate by transform.x and transform.y."],
      cases: [example([{ x: 3, y: 1, yaw: PI / 2 }, { x: 2, y: 0 }], { x: 3, y: 3 }, "rotate then shift"), example([{ x: -1, y: 4, yaw: PI }, { x: 2, y: -3 }], { x: -3, y: 7 }, "half-turn transform")],
    }),
    puzzle({
      number: 12, id: "compose-se2", title: "Compose Two Transforms",
      goal: "Create T_A_C from T_A_B and T_B_C in the correct order.",
      functionName: "composeSE2", signature: "composeSE2(aFromB, bFromC) → aFromC",
      starterSource: lines("function composeSE2(aFromB, bFromC) {", "  var translation = applySE2(aFromB, { x: bFromC.x, y: bFromC.y });", "  return null;", "}"),
      referenceSource: lines("function composeSE2(aFromB, bFromC) {", "  var translation = applySE2(aFromB, { x: bFromC.x, y: bFromC.y });", "  var yaw = Math.atan2(Math.sin(aFromB.yaw + bFromC.yaw), Math.cos(aFromB.yaw + bFromC.yaw));", "  return { x: translation.x, y: translation.y, yaw: yaw };", "}"),
      comparator: "se2", preview: { kind: "se2" }, walkthroughChapter: "composition",
      dependencies: ["apply-se2"],
      hints: ["The right transform acts first.", "The child translation must be rotated by the parent yaw before it is added.", "Apply aFromB to bFromC's translation and add the two yaws modulo 2π."],
      cases: [example([{ x: 10, y: 0, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 10, y: 1, yaw: PI }, "turning chain"), example([{ x: 2, y: -1, yaw: -PI / 2 }, { x: 0, y: 3, yaw: PI }], { x: 5, y: -1, yaw: PI / 2 }, "order-sensitive chain")],
    }),
    puzzle({
      number: 13, id: "invert-se2", title: "Walk an Edge Backward",
      goal: "Invert a rigid transform so target and source exchange roles.",
      functionName: "invertSE2", signature: "invertSE2(targetFromSource) → sourceFromTarget",
      starterSource: lines("function invertSE2(transform) {", "  var yaw = -transform.yaw;", "  return null;", "}"),
      referenceSource: lines("function invertSE2(transform) {", "  var yaw = -transform.yaw;", "  var shifted = rotateVector({ x: -transform.x, y: -transform.y }, yaw);", "  return { x: shifted.x, y: shifted.y, yaw: yaw };", "}"),
      comparator: "se2", preview: { kind: "se2" }, walkthroughChapter: "composition",
      dependencies: ["rotate-vector"],
      hints: ["Undo translation in the inverse orientation.", "Negate yaw, then rotate the negated translation by that yaw.", "R⁻¹ and -R⁻¹t form the inverse transform."],
      cases: [example([{ x: 3, y: 1, yaw: PI / 2 }], { x: -1, y: 3, yaw: -PI / 2 }, "quarter-turn inverse"), example([{ x: 2, y: -4, yaw: 0 }], { x: -2, y: 4, yaw: 0 }, "translation inverse")],
    }),
    puzzle({
      number: 14, id: "transform-pose", title: "Transform a Pose",
      goal: "Transform position and heading together.",
      functionName: "transformPose", signature: "transformPose(transform, pose) → pose",
      starterSource: lines("function transformPose(transform, pose) {", "  var point = applySE2(transform, pose);", "  return null;", "}"),
      referenceSource: lines("function transformPose(transform, pose) {", "  var point = applySE2(transform, pose);", "  var yaw = Math.atan2(Math.sin(transform.yaw + pose.yaw), Math.cos(transform.yaw + pose.yaw));", "  return { x: point.x, y: point.y, yaw: yaw };", "}"),
      comparator: "se2", preview: { kind: "se2" }, walkthroughChapter: "data-types",
      dependencies: ["apply-se2"],
      hints: ["A pose contains both a point and an orientation.", "Transform the point, then compose the headings.", "Normalize the yaw sum with atan2(sin(sum), cos(sum))."],
      cases: [example([{ x: 2, y: 1, yaw: PI / 2 }, { x: 1, y: 0, yaw: PI / 2 }], { x: 2, y: 2, yaw: PI }, "pose composition"), example([{ x: 0, y: 0, yaw: 3 * PI / 4 }, { x: 0, y: 0, yaw: 3 * PI / 4 }], { x: 0, y: 0, yaw: -PI / 2 }, "yaw wrapping")],
    }),
    puzzle({
      number: 15, id: "round-trip", title: "Close the Loop",
      goal: "Apply a transform and its inverse; the original point must return.",
      functionName: "roundTrip", signature: "roundTrip(transform, point) → point",
      starterSource: lines("function roundTrip(transform, point) {", "  var moved = applySE2(transform, point);", "  return null;", "}"),
      referenceSource: lines("function roundTrip(transform, point) {", "  var moved = applySE2(transform, point);", "  return applySE2(invertSE2(transform), moved);", "}"),
      comparator: "vector2", preview: { kind: "se2" }, walkthroughChapter: "composition",
      dependencies: ["apply-se2", "invert-se2"],
      hints: ["The second operation must exactly undo the first.", "Create the inverse transform and apply it to the moved point.", "applySE2(invertSE2(transform), applySE2(transform, point))."],
      cases: [example([{ x: 3, y: -2, yaw: 0.7 }, { x: 4, y: 1 }], { x: 4, y: 1 }, "general round trip"), example([{ x: -5, y: 8, yaw: -2.2 }, { x: -3, y: 6 }], { x: -3, y: 6 }, "signed round trip")],
    }),
    puzzle({
      number: 16, id: "store-edge", title: "Store One TF Edge",
      goal: "Store parentFromChild under the child name without mutating the current tree.",
      functionName: "storeEdge", signature: "storeEdge(tree, edge) → newTree",
      starterSource: lines("function storeEdge(tree, edge) {", "  var next = Object.assign({}, tree);", "  return null;", "}"),
      referenceSource: lines("function storeEdge(tree, edge) {", "  var next = Object.assign({}, tree);", "  next[edge.child] = { parent: edge.parent, transform: edge.transform };", "  return next;", "}"),
      comparator: "deep", preview: { kind: "tree" }, walkthroughChapter: "tree",
      hints: ["The child uniquely identifies its incoming edge.", "Copy the tree, then assign next[edge.child].", "Store both parent and parentFromChild transform under the child key."],
      cases: [example([{}, { parent: "map", child: "odom", transform: { x: 1, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, "first edge"), example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } } }, { parent: "odom", child: "base_link", transform: { x: 2, y: 0, yaw: 0 } }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } } }, "second edge")],
    }),
    puzzle({
      number: 17, id: "ancestor-chain", title: "Climb to the Root",
      goal: "List a frame and every ancestor until the root frame.",
      functionName: "ancestorChain", signature: "ancestorChain(tree, frame) → frame[]",
      starterSource: lines("function ancestorChain(tree, frame) {", "  var chain = [frame];", "  var current = frame;", "  return chain;", "}"),
      referenceSource: lines("function ancestorChain(tree, frame) {", "  var chain = [frame];", "  var current = frame;", "  while (tree[current]) { current = tree[current].parent; chain.push(current); }", "  return chain;", "}"),
      comparator: "deep", preview: { kind: "tree" }, walkthroughChapter: "tree",
      hints: ["Each child record points one step upward.", "Repeat while tree[current] exists.", "Push parent, assign it to current, and stop at a name with no incoming edge."],
      cases: [example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "laser"], ["laser", "base_link", "odom", "map"], "sensor chain"), example([{ child: { parent: "root" } }, "root"], ["root"], "already root")],
    }),
    puzzle({
      number: 18, id: "common-ancestor", title: "Find the Join",
      goal: "Find the nearest frame shared by two ancestor chains.",
      functionName: "commonAncestor", signature: "commonAncestor(tree, a, b) → frame | null",
      starterSource: lines("function commonAncestor(tree, a, b) {", "  var aChain = ancestorChain(tree, a);", "  var bChain = ancestorChain(tree, b);", "  return null;", "}"),
      referenceSource: lines("function commonAncestor(tree, a, b) {", "  var aChain = ancestorChain(tree, a);", "  var bSet = new Set(ancestorChain(tree, b));", "  for (var i = 0; i < aChain.length; i += 1) { if (bSet.has(aChain[i])) return aChain[i]; }", "  return null;", "}"),
      comparator: "deep", preview: { kind: "tree" }, walkthroughChapter: "tree",
      dependencies: ["ancestor-chain"],
      hints: ["Start from one frame so the first match is the nearest.", "Put one chain in a Set, then scan the other from its frame upward.", "Return null when the roots are disconnected."],
      cases: [example([{ left: { parent: "base" }, right: { parent: "base" }, base: { parent: "map" } }, "left", "right"], "base", "sibling join"), example([{ a: { parent: "rootA" }, b: { parent: "rootB" } }, "a", "b"], null, "disconnected roots")],
    }),
    puzzle({
      number: 19, id: "directed-path", title: "Mark the Traversal",
      goal: "Build source-to-target steps and mark when an edge must be inverted.",
      functionName: "directedPath", signature: "directedPath(tree, target, source) → step[] | null",
      starterSource: lines("function directedPath(tree, target, source) {", "  var join = commonAncestor(tree, target, source);", "  if (join === null) return null;", "  var steps = [];", "  return steps;", "}"),
      referenceSource: lines(
        "function directedPath(tree, target, source) {",
        "  var join = commonAncestor(tree, target, source);",
        "  if (join === null) return null;",
        "  var steps = [];",
        "  var current = source;",
        "  while (current !== join) { var up = tree[current]; steps.push({ from: current, to: up.parent, child: current, inverse: false }); current = up.parent; }",
        "  var down = ancestorChain(tree, target).slice(0, ancestorChain(tree, target).indexOf(join)).reverse();",
        "  for (var i = 0; i < down.length; i += 1) { var child = down[i]; steps.push({ from: tree[child].parent, to: child, child: child, inverse: true }); }",
        "  return steps;",
        "}"
      ),
      comparator: "path", preview: { kind: "tree" }, walkthroughChapter: "lookup",
      dependencies: ["ancestor-chain", "common-ancestor"],
      hints: ["Walk source upward normally, then walk from the join down toward target.", "Child-to-parent uses stored parentFromChild; parent-to-child needs its inverse.", "Build the upward steps first, then reverse target's pre-join ancestor slice for downward steps."],
      cases: [
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } }, "map", "laser"], [{ from: "laser", to: "base_link", child: "laser", inverse: false }, { from: "base_link", to: "odom", child: "base_link", inverse: false }, { from: "odom", to: "map", child: "odom", inverse: false }], "upward lookup"),
        example([{ odom: { parent: "map" }, base_link: { parent: "odom" } }, "base_link", "map"], [{ from: "map", to: "odom", child: "odom", inverse: true }, { from: "odom", to: "base_link", child: "base_link", inverse: true }], "downward lookup"),
      ],
    }),
    puzzle({
      number: 20, id: "validate-tree", title: "Protect the Tree",
      goal: "Reject duplicate parents and cycles before accepting TF edges.",
      functionName: "validateTree", signature: "validateTree(edges) → { valid, code? }",
      starterSource: lines("function validateTree(edges) {", "  var parents = {};", "  return { valid: true };", "}"),
      referenceSource: lines(
        "function validateTree(edges) {",
        "  var parents = {};",
        "  for (var i = 0; i < edges.length; i += 1) { if (parents[edges[i].child] && parents[edges[i].child] !== edges[i].parent) return { valid: false, code: \"DUPLICATE_PARENT\" }; parents[edges[i].child] = edges[i].parent; }",
        "  var children = Object.keys(parents);",
        "  for (var j = 0; j < children.length; j += 1) { var seen = new Set(); var current = children[j]; while (parents[current]) { if (seen.has(current)) return { valid: false, code: \"CYCLE\" }; seen.add(current); current = parents[current]; } }",
        "  return { valid: true };",
        "}"
      ),
      comparator: "error", preview: { kind: "tree" }, walkthroughChapter: "tree",
      hints: ["TF allows only one parent for each child.", "After recording parents, walk upward from every child and watch for repeats.", "Return DUPLICATE_PARENT first; otherwise return CYCLE when an ancestor repeats."],
      cases: [example([[{ parent: "map", child: "base" }, { parent: "odom", child: "base" }]], { valid: false, code: "DUPLICATE_PARENT" }, "duplicate parent"), example([[{ parent: "a", child: "b" }, { parent: "b", child: "a" }]], { valid: false, code: "CYCLE" }, "cycle"), example([[{ parent: "map", child: "odom" }, { parent: "odom", child: "base" }]], { valid: true }, "valid chain")],
    }),
    puzzle({
      number: 21, id: "lookup-transform", title: "Resolve T_target_source",
      goal: "Compose each directed path step to answer a transform lookup.",
      functionName: "lookupTransform", signature: "lookupTransform(tree, target, source) → transform | null",
      starterSource: starter("lookupTransform", "tree, target, source", "Use directedPath, invert backward edges, and compose each step."),
      referenceSource: lines(
        "function lookupTransform(tree, target, source) {",
        "  var steps = directedPath(tree, target, source);",
        "  if (steps === null) return null;",
        "  var result = { x: 0, y: 0, yaw: 0 };",
        "  for (var i = 0; i < steps.length; i += 1) { var edge = tree[steps[i].child].transform; var transform = steps[i].inverse ? invertSE2(edge) : edge; result = composeSE2(transform, result); }",
        "  return result;",
        "}"
      ),
      comparator: "se2", preview: { kind: "tree" }, walkthroughChapter: "lookup",
      dependencies: ["compose-se2", "invert-se2", "directed-path"],
      hints: ["Start with identity at the source frame.", "For every step, invert only the downward traversal and left-compose it.", "result = composeSE2(stepTransform, result)."],
      cases: [
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } }, laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } } }, "map", "laser"], { x: 3, y: 1, yaw: PI / 2 }, "map from laser"),
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: PI / 2 } }, laser: { parent: "base_link", transform: { x: 1, y: 0, yaw: 0 } } }, "laser", "map"], { x: -1, y: 3, yaw: -PI / 2 }, "laser from map"),
      ],
    }),
    puzzle({
      number: 22, id: "robot-frame-chain", title: "Assemble the Robot Tree",
      goal: "Build map → odom → base_link → laser from three parentFromChild transforms.",
      functionName: "buildRobotTree", signature: "buildRobotTree(mapFromOdom, odomFromBase, baseFromLaser) → tree",
      starterSource: starter("buildRobotTree", "mapFromOdom, odomFromBase, baseFromLaser", "Use storeEdge three times in chain order."),
      referenceSource: lines("function buildRobotTree(mapFromOdom, odomFromBase, baseFromLaser) {", "  var tree = {};", "  tree = storeEdge(tree, { parent: \"map\", child: \"odom\", transform: mapFromOdom });", "  tree = storeEdge(tree, { parent: \"odom\", child: \"base_link\", transform: odomFromBase });", "  return storeEdge(tree, { parent: \"base_link\", child: \"laser\", transform: baseFromLaser });", "}"),
      comparator: "deep", preview: { kind: "robot-chain" }, walkthroughChapter: "mobile-chain",
      dependencies: ["store-edge"],
      hints: ["Each transform name becomes one edge with the right parent and child.", "Store map/odom, odom/base_link, then base_link/laser.", "Pass the returned tree into the next storeEdge call."],
      cases: [
        example([{ x: 1, y: 0, yaw: 0 }, { x: 2, y: 0, yaw: 0 }, { x: 0.5, y: 0, yaw: 0 }], { odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, "standard robot chain"),
        example([{ x: 0, y: 1, yaw: 0.2 }, { x: 0, y: 0, yaw: -0.1 }, { x: 0.2, y: 0.1, yaw: 0 }], { odom: { parent: "map", transform: { x: 0, y: 1, yaw: 0.2 } }, base_link: { parent: "odom", transform: { x: 0, y: 0, yaw: -0.1 } }, laser: { parent: "base_link", transform: { x: 0.2, y: 0.1, yaw: 0 } } }, "rotated robot chain"),
      ],
    }),
    puzzle({
      number: 23, id: "laser-to-map", title: "Project a Laser Point",
      goal: "Transform a measurement from laser coordinates into map coordinates.",
      functionName: "laserPointToMap", signature: "laserPointToMap(tree, pointInLaser) → pointInMap",
      starterSource: starter("laserPointToMap", "tree, pointInLaser", "Look up mapFromLaser, then apply it."),
      referenceSource: lines("function laserPointToMap(tree, pointInLaser) {", "  var mapFromLaser = lookupTransform(tree, \"map\", \"laser\");", "  return applySE2(mapFromLaser, pointInLaser);", "}"),
      comparator: "vector2", preview: { kind: "robot-chain" }, walkthroughChapter: "stamped-data",
      dependencies: ["lookup-transform", "apply-se2"],
      hints: ["The point starts in laser and must end in map.", "Ask for mapFromLaser; the target name comes first.", "applySE2(lookupTransform(tree, \"map\", \"laser\"), pointInLaser)."],
      cases: [
        example([{ odom: { parent: "map", transform: { x: 1, y: 0, yaw: 0 } }, base_link: { parent: "odom", transform: { x: 2, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0.5, y: 0, yaw: 0 } } }, { x: 1, y: 0 }], { x: 4.5, y: 0 }, "forward laser hit"),
        example([{ odom: { parent: "map", transform: { x: 0, y: 0, yaw: PI / 2 } }, base_link: { parent: "odom", transform: { x: 1, y: 0, yaw: 0 } }, laser: { parent: "base_link", transform: { x: 0, y: 0, yaw: 0 } } }, { x: 2, y: 0 }], { x: 0, y: 3 }, "rotated map frame"),
      ],
    }),
    puzzle({
      number: 24, id: "map-odom-correction", title: "Keep Odom Smooth",
      goal: "Apply the global map correction above odom without rewriting the smooth odom pose.",
      functionName: "applyMapCorrection", signature: "applyMapCorrection(mapFromOdom, odomFromBase) → { odomFromBase, mapFromBase }",
      starterSource: starter("applyMapCorrection", "mapFromOdom, odomFromBase", "Compose for map pose but preserve the odom pose."),
      referenceSource: "function applyMapCorrection(mapFromOdom, odomFromBase) { return { odomFromBase: { x: odomFromBase.x, y: odomFromBase.y, yaw: odomFromBase.yaw }, mapFromBase: composeSE2(mapFromOdom, odomFromBase) }; }",
      comparator: "deep", preview: { kind: "robot-chain" }, walkthroughChapter: "frame-roles",
      dependencies: ["compose-se2"],
      hints: ["Localization corrects mapFromOdom; wheel odometry still owns odomFromBase.", "Return both poses so their roles remain visible.", "mapFromBase is composeSE2(mapFromOdom, odomFromBase)."],
      cases: [example([{ x: 10, y: 0, yaw: 0 }, { x: 2, y: 1, yaw: 0.1 }], { odomFromBase: { x: 2, y: 1, yaw: 0.1 }, mapFromBase: { x: 12, y: 1, yaw: 0.1 } }, "global translation correction"), example([{ x: 0, y: 0, yaw: PI / 2 }, { x: 2, y: 0, yaw: 0 }], { odomFromBase: { x: 2, y: 0, yaw: 0 }, mapFromBase: { x: 0, y: 2, yaw: PI / 2 } }, "global yaw correction")],
    }),
    puzzle({
      number: 25, id: "interpolate-translation", title: "Interpolate Position",
      goal: "Find the translation between two stamped samples.",
      functionName: "interpolateTranslation", signature: "interpolateTranslation(a, b, amount) → vector",
      starterSource: starter("interpolateTranslation", "a, b, amount", "Blend each component with the same amount."),
      referenceSource: "function interpolateTranslation(a, b, amount) { return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount }; }",
      comparator: "vector2", preview: { kind: "time" }, walkthroughChapter: "time-buffer",
      hints: ["amount 0 selects a; amount 1 selects b.", "Use a + (b - a) × amount independently for x and y.", "Return a new interpolated vector."],
      cases: [example([{ x: 0, y: 2 }, { x: 10, y: 6 }, 0.25], { x: 2.5, y: 3 }, "quarter time"), example([{ x: -4, y: 8 }, { x: 2, y: -4 }, 0.5], { x: -1, y: 2 }, "midpoint")],
    }),
    puzzle({
      number: 26, id: "interpolate-yaw", title: "Cross the Angle Wrap",
      goal: "Interpolate yaw along the shortest route across ±π.",
      functionName: "interpolateYaw", signature: "interpolateYaw(a, b, amount) → radians",
      starterSource: starter("interpolateYaw", "a, b, amount", "Normalize the delta before blending."),
      referenceSource: lines("function interpolateYaw(a, b, amount) {", "  var delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));", "  var yaw = a + delta * amount;", "  return Math.atan2(Math.sin(yaw), Math.cos(yaw));", "}"),
      comparator: "angle", preview: { kind: "time" }, walkthroughChapter: "time-buffer",
      hints: ["Raw subtraction can choose the long way around the circle.", "Normalize b - a with atan2(sin(delta), cos(delta)).", "Blend the normalized delta from a, then normalize the result again."],
      cases: [example([170 * PI / 180, -170 * PI / 180, 0.5], PI, "wrap midpoint"), example([-PI / 2, PI / 2, 0.25], -PI / 4, "ordinary interpolation")],
    }),
    puzzle({
      number: 27, id: "latest-common-time", title: "Find a Valid Query Time",
      goal: "Intersect dynamic buffer ranges and classify past or future extrapolation.",
      functionName: "latestCommonTime", signature: "latestCommonTime(ranges, requestedTime) → availability",
      starterSource: starter("latestCommonTime", "ranges, requestedTime", "Intersect [start, end] ranges, then classify the request."),
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
      comparator: "error", preview: { kind: "time" }, walkthroughChapter: "time-buffer",
      hints: ["The common start is the maximum start; the common end is the minimum end.", "No overlap occurs when common start exceeds common end.", "Use common end for latest; classify requests below start as past and above end as future."],
      cases: [example([[{ start: 0, end: 8 }, { start: 2, end: 6 }], null], { ok: true, time: 6, bounds: { start: 2, end: 6 } }, "latest overlap"), example([[{ start: 2, end: 4 }], 1], { ok: false, code: "PAST_EXTRAPOLATION", bounds: { start: 2, end: 4 } }, "past request"), example([[{ start: 0, end: 1 }, { start: 2, end: 3 }], null], { ok: false, code: "NO_COMMON_TIME", bounds: { start: 2, end: 1 } }, "no overlap")],
    }),
    puzzle({
      number: 28, id: "rotate-quaternion", title: "Rotate with a Quaternion",
      goal: "Normalize a quaternion and rotate a 3D vector.",
      functionName: "rotateByQuaternion", signature: "rotateByQuaternion(q, v) → vector3",
      starterSource: starter("rotateByQuaternion", "q, v", "Normalize q, then compute q · v · q⁻¹."),
      referenceSource: lines(
        "function rotateByQuaternion(q, v) {",
        "  var length = Math.sqrt(q.x*q.x + q.y*q.y + q.z*q.z + q.w*q.w);",
        "  var x = q.x/length, y = q.y/length, z = q.z/length, w = q.w/length;",
        "  var ix = w*v.x + y*v.z - z*v.y, iy = w*v.y + z*v.x - x*v.z, iz = w*v.z + x*v.y - y*v.x, iw = -x*v.x - y*v.y - z*v.z;",
        "  return { x: ix*w + iw*-x + iy*-z - iz*-y, y: iy*w + iw*-y + iz*-x - ix*-z, z: iz*w + iw*-z + ix*-y - iy*-x };",
        "}"
      ),
      comparator: "vector3", preview: { kind: "se3" }, walkthroughChapter: "se3",
      hints: ["A valid rotation quaternion has unit length.", "Treat v as a pure quaternion with w = 0 and compute qvq⁻¹.", "The Hamilton product signs matter; verify with a 90° Z rotation mapping +X to +Y."],
      cases: [example([{ x: 0, y: 0, z: Math.sin(PI / 4), w: Math.cos(PI / 4) }, { x: 1, y: 0, z: 0 }], { x: 0, y: 1, z: 0 }, "Z quarter turn"), example([{ x: 0, y: 0, z: 0, w: 2 }, { x: 1, y: -2, z: 3 }], { x: 1, y: -2, z: 3 }, "non-unit identity input")],
    }),
    puzzle({
      number: 29, id: "compose-se3", title: "Compose SE(3)",
      goal: "Rotate the child translation, add it to the parent translation, and multiply rotations.",
      functionName: "composeSE3", signature: "composeSE3(aFromB, bFromC) → aFromC",
      starterSource: starter("composeSE3", "aFromB, bFromC", "Compose translation and quaternion rotation in parent-child order."),
      referenceSource: lines(
        "function composeSE3(aFromB, bFromC) {",
        "  var shifted = rotateByQuaternion(aFromB.rotation, bFromC.translation);",
        "  var a = aFromB.rotation, b = bFromC.rotation;",
        "  var q = { x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y, y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x, z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w, w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z };",
        "  var length = Math.sqrt(q.x*q.x + q.y*q.y + q.z*q.z + q.w*q.w);",
        "  return { translation: { x: aFromB.translation.x + shifted.x, y: aFromB.translation.y + shifted.y, z: aFromB.translation.z + shifted.z }, rotation: { x: q.x/length, y: q.y/length, z: q.z/length, w: q.w/length } };",
        "}"
      ),
      comparator: "se3", preview: { kind: "se3" }, walkthroughChapter: "se3",
      dependencies: ["rotate-quaternion"],
      hints: ["SE(3) composition has the same rotate-then-translate structure as SE(2).", "Rotate bFromC.translation by aFromB.rotation before adding.", "Multiply quaternions parent × child and normalize the result."],
      cases: [
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }, { translation: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }], { translation: { x: 1, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }, "translation chain"),
        example([{ translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: Math.sin(PI / 4), w: Math.cos(PI / 4) } }, { translation: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }], { translation: { x: 1, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: Math.sin(PI / 4), w: Math.cos(PI / 4) } }, "rotated child translation"),
      ],
    }),
    puzzle({
      number: 30, id: "tf-buffer-capstone", title: "Build a Stamped TF Buffer",
      goal: "Resolve a source-to-target transform at a requested or latest common time.",
      functionName: "lookupStampedTF", signature: "lookupStampedTF(edges, target, source, requestedTime) → result",
      starterSource: starter("lookupStampedTF", "edges, target, source, requestedTime", "Resolve availability, sample every edge, build a tree, then look up targetFromSource."),
      referenceSource: lines(
        "function lookupStampedTF(edges, target, source, requestedTime) {",
        "  var dynamic = edges.filter(function (edge) { return !edge.isStatic; });",
        "  var ranges = dynamic.map(function (edge) { return { start: edge.samples[0].time, end: edge.samples[edge.samples.length - 1].time }; });",
        "  var availability = ranges.length ? latestCommonTime(ranges, requestedTime) : { ok: true, time: requestedTime === null ? 0 : requestedTime };",
        "  if (!availability.ok) return availability;",
        "  var time = availability.time, tree = {};",
        "  for (var i = 0; i < edges.length; i += 1) {",
        "    var edge = edges[i], transform = edge.transform;",
        "    if (!edge.isStatic) { var before = edge.samples[0], after = edge.samples[edge.samples.length - 1]; for (var j = 0; j < edge.samples.length - 1; j += 1) { if (edge.samples[j].time <= time && time <= edge.samples[j + 1].time) { before = edge.samples[j]; after = edge.samples[j + 1]; break; } } var amount = after.time === before.time ? 0 : (time - before.time) / (after.time - before.time); var xy = interpolateTranslation(before.transform, after.transform, amount); transform = { x: xy.x, y: xy.y, yaw: interpolateYaw(before.transform.yaw, after.transform.yaw, amount) }; }",
        "    tree[edge.child] = { parent: edge.parent, transform: transform };",
        "  }",
        "  return { ok: true, time: time, transform: lookupTransform(tree, target, source) };",
        "}"
      ),
      comparator: "deep", preview: { kind: "buffer" }, walkthroughChapter: "sandbox",
      dependencies: ["lookup-transform", "interpolate-translation", "interpolate-yaw", "latest-common-time"],
      hints: ["A lookup is a pipeline: choose time, sample edges, build the tree, traverse.", "Use the intersection of all dynamic histories; static edges are valid at every time.", "Interpolate each dynamic transform at the resolved time, then call lookupTransform on the sampled tree."],
      cases: [
        example([[{ parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 10, transform: { x: 10, y: 0, yaw: 0 } }] }, { parent: "odom", child: "base_link", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 6, transform: { x: 6, y: 0, yaw: 0 } }] }, { parent: "base_link", child: "laser", isStatic: true, transform: { x: 1, y: 0, yaw: 0 } }], "map", "laser", null], { ok: true, time: 6, transform: { x: 13, y: 0, yaw: 0 } }, "latest stamped lookup"),
        example([[{ parent: "map", child: "odom", samples: [{ time: 0, transform: { x: 0, y: 0, yaw: 0 } }, { time: 5, transform: { x: 5, y: 0, yaw: 0 } }] }], "map", "odom", 8], { ok: false, code: "FUTURE_EXTRAPOLATION", bounds: { start: 0, end: 5 } }, "future request"),
      ],
    }),
  ]);

  const byId = new Map(PUZZLES.map((entry) => [entry.id, entry]));

  function getPuzzle(id) {
    return byId.get(id) || null;
  }

  const api = Object.freeze({
    TF2_PUZZLE_STAGES: STAGES,
    TF2_PUZZLES: PUZZLES,
    getPuzzle,
  });

  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

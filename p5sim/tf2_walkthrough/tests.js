(function runTF2Tests(root) {
  "use strict";

  const runningInNode = typeof module !== "undefined" && module.exports;
  const tests = [];

  function loadModule(path) {
    if (!runningInNode) return root;
    try {
      return require(path);
    } catch (error) {
      if (error && error.code === "MODULE_NOT_FOUND") return null;
      throw error;
    }
  }

  const math2d = loadModule("./transform2d.js");
  const tfApi = loadModule("./transform-tree.js");
  const tf3Api = loadModule("./transform3d.js");
  const chapterApi = loadModule("./chapters.js");

  function test(name, run) {
    tests.push({ name, run });
  }

  function near(actual, expected, epsilon = 1e-6) {
    if (Math.abs(actual - expected) > epsilon) {
      throw new Error(`expected ${expected}, received ${actual}`);
    }
  }

  function requireApi(api, name) {
    if (!api) throw new Error(`${name} is not implemented`);
    return api;
  }

  test("SE2 identity leaves a point unchanged", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const result = Transform2D.identity().applyPoint({ x: 2, y: -3 });
    near(result.x, 2);
    near(result.y, -3);
  });

  test("SE2 composition applies the right operand first", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const worldFromRobot = new Transform2D(10, 0, Math.PI / 2);
    const robotFromLaser = new Transform2D(1, 0, 0);
    const result = worldFromRobot.compose(robotFromLaser).applyPoint({ x: 0, y: 0 });
    near(result.x, 10);
    near(result.y, 1);
  });

  test("SE2 inverse produces an identity round trip", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const transform = new Transform2D(3, -4, 0.7);
    const point = { x: 2, y: 5 };
    const result = transform.inverse().applyPoint(transform.applyPoint(point));
    near(result.x, point.x);
    near(result.y, point.y);
  });

  test("SE2 pose application composes heading", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const transform = new Transform2D(2, 1, Math.PI / 2);
    const result = transform.applyPose({ x: 1, y: 0, yaw: Math.PI / 2 });
    near(result.x, 2);
    near(result.y, 2);
    near(Math.abs(result.yaw), Math.PI);
  });

  test("SE2 interpolation takes the shortest angle path", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const from = new Transform2D(0, 0, 170 * Math.PI / 180);
    const to = new Transform2D(10, 0, -170 * Math.PI / 180);
    const result = Transform2D.interpolate(from, to, 0.5);
    near(result.x, 5);
    near(Math.abs(result.yaw), Math.PI);
  });

  test("tree looks up mapFromLaser through the chain", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "odom", transform: new Transform2D(1, 0, 0), isStatic: true, authority: "localization" });
    tree.setTransform({ parent: "odom", child: "base_link", transform: new Transform2D(2, 0, 0), isStatic: true, authority: "odometry" });
    tree.setTransform({ parent: "base_link", child: "laser", transform: new Transform2D(0.5, 0, 0), isStatic: true, authority: "robot_state_publisher" });
    const result = tree.lookup("map", "laser");
    near(result.transform.x, 3.5);
    if (result.path.length !== 3) throw new Error("expected three traversed edges");
  });

  test("tree lookup works in the inverse direction", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "robot", transform: new Transform2D(2, 0, 0), isStatic: true });
    near(tree.lookup("robot", "map").transform.x, -2);
  });

  test("tree rejects a second parent", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "base_link", transform: Transform2D.identity(), isStatic: true });
    try {
      tree.setTransform({ parent: "odom", child: "base_link", transform: Transform2D.identity(), isStatic: true });
      throw new Error("expected duplicate parent rejection");
    } catch (error) {
      if (error.code !== "DUPLICATE_PARENT") throw error;
    }
  });

  test("tree rejects cycles", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "odom", transform: Transform2D.identity(), isStatic: true });
    try {
      tree.setTransform({ parent: "odom", child: "map", transform: Transform2D.identity(), isStatic: true });
      throw new Error("expected cycle rejection");
    } catch (error) {
      if (error.code !== "CYCLE") throw error;
    }
  });

  test("tree reports unknown frames", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "odom", transform: Transform2D.identity(), isStatic: true });
    try {
      tree.lookup("map", "missing");
      throw new Error("expected unknown frame rejection");
    } catch (error) {
      if (error.code !== "UNKNOWN_FRAME") throw error;
    }
  });

  test("tree reports disconnected roots", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "robot", transform: Transform2D.identity(), isStatic: true });
    tree.setTransform({ parent: "world", child: "camera", transform: Transform2D.identity(), isStatic: true });
    try {
      tree.lookup("robot", "camera");
      throw new Error("expected disconnected rejection");
    } catch (error) {
      if (error.code !== "DISCONNECTED") throw error;
    }
  });

  test("dynamic edges interpolate at the requested time", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "odom", child: "base_link", transform: new Transform2D(0, 0, 0), time: 0 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: new Transform2D(10, 0, Math.PI), time: 10 });
    const result = tree.lookup("odom", "base_link", 5);
    near(result.transform.x, 5);
    near(Math.abs(result.transform.yaw), Math.PI / 2);
  });

  test("static edges are valid at arbitrary times", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "base_link", child: "laser", transform: new Transform2D(0.4, 0, 0), isStatic: true });
    near(tree.lookup("base_link", "laser", 5000).transform.x, 0.4);
  });

  test("latest lookup uses the latest common dynamic time", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "odom", transform: new Transform2D(1, 0, 0), time: 0 });
    tree.setTransform({ parent: "map", child: "odom", transform: new Transform2D(2, 0, 0), time: 8 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: new Transform2D(3, 0, 0), time: 0 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: new Transform2D(4, 0, 0), time: 6 });
    const result = tree.lookup("map", "base_link");
    near(result.time, 6);
  });

  test("lookup reports past and future extrapolation", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "odom", child: "base_link", transform: Transform2D.identity(), time: 2 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: Transform2D.identity(), time: 4 });
    for (const [time, code] of [[1, "PAST_EXTRAPOLATION"], [5, "FUTURE_EXTRAPOLATION"]]) {
      try {
        tree.lookup("odom", "base_link", time);
        throw new Error(`expected ${code}`);
      } catch (error) {
        if (error.code !== code) throw error;
      }
    }
  });

  test("latest lookup rejects dynamic histories without overlap", () => {
    const { Transform2D } = requireApi(math2d, "transform2d.js");
    const { TransformTree } = requireApi(tfApi, "transform-tree.js");
    const tree = new TransformTree();
    tree.setTransform({ parent: "map", child: "odom", transform: Transform2D.identity(), time: 0 });
    tree.setTransform({ parent: "map", child: "odom", transform: Transform2D.identity(), time: 1 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: Transform2D.identity(), time: 2 });
    tree.setTransform({ parent: "odom", child: "base_link", transform: Transform2D.identity(), time: 3 });
    try {
      tree.lookup("map", "base_link");
      throw new Error("expected no common time rejection");
    } catch (error) {
      if (error.code !== "NO_COMMON_TIME") throw error;
    }
  });

  test("quaternion rotates X onto Y around Z", () => {
    const { Quaternion } = requireApi(tf3Api, "transform3d.js");
    const q = Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    const result = q.rotateVector({ x: 1, y: 0, z: 0 });
    near(result.x, 0);
    near(result.y, 1);
    near(result.z, 0);
  });

  test("quaternion inverse reverses rotation", () => {
    const { Quaternion } = requireApi(tf3Api, "transform3d.js");
    const q = Quaternion.fromEuler(0.3, -0.2, 0.7);
    const point = { x: 1, y: 2, z: 3 };
    const result = q.inverse().rotateVector(q.rotateVector(point));
    near(result.x, point.x);
    near(result.y, point.y);
    near(result.z, point.z);
  });

  test("SE3 composition applies the child transform first", () => {
    const { Quaternion, Transform3D } = requireApi(tf3Api, "transform3d.js");
    const parentFromChild = new Transform3D({ x: 1, y: 0, z: 0 }, Quaternion.identity());
    const childFromSensor = new Transform3D({ x: 0, y: 2, z: 0 }, Quaternion.identity());
    const result = parentFromChild.compose(childFromSensor).applyPoint({ x: 0, y: 0, z: 3 });
    near(result.x, 1);
    near(result.y, 2);
    near(result.z, 3);
  });

  test("quaternion constructor normalizes finite input", () => {
    const { Quaternion } = requireApi(tf3Api, "transform3d.js");
    const q = new Quaternion(0, 0, 0, 2);
    near(q.w, 1);
    try {
      new Quaternion(0, 0, 0, 0);
      throw new Error("expected zero quaternion rejection");
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
  });

  test("chapter catalog contains the full guided sequence", () => {
    const { TF2_CHAPTERS } = requireApi(chapterApi, "chapters.js");
    const expected = [
      "matrix-stack",
      "data-types",
      "composition",
      "tree",
      "mobile-chain",
      "frame-roles",
      "broadcasters",
      "lookup",
      "stamped-data",
      "time-buffer",
      "sensor-scenario",
      "se3",
      "sandbox",
    ];
    const actual = TF2_CHAPTERS.map((chapter) => chapter.id);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`unexpected chapter order: ${actual.join(", ")}`);
    }
    for (const chapter of TF2_CHAPTERS) {
      for (const key of ["title", "eyebrow", "summary", "details", "rosCode", "scene", "hint"]) {
        const value = chapter[key];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          throw new Error(`${chapter.id} is missing ${key}`);
        }
      }
    }
  });

  function runAllTests() {
    let passed = 0;
    const failures = [];

    for (const item of tests) {
      try {
        item.run();
        passed += 1;
      } catch (error) {
        failures.push({ name: item.name, error });
      }
    }

    if (runningInNode) {
      failures.forEach(({ name, error }) => console.error(`FAIL ${name}: ${error.message}`));
      console.log(`${passed}/${tests.length} tests passed`);
      if (failures.length) process.exitCode = 1;
    } else if (typeof root.renderTestResults === "function") {
      root.renderTestResults({ passed, total: tests.length, failures });
    }
  }

  if (runningInNode) runAllTests();
  else root.addEventListener("DOMContentLoaded", runAllTests);
})(typeof window !== "undefined" ? window : globalThis);

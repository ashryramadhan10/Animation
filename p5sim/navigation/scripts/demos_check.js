// Headless render check: loads the modules the way the browser does, builds the
// demo state, and calls every drawer at several animation frames against a
// no-op p5 stub. Exit code 1 on any exception. Run: node p5sim/navigation/scripts/demos_check.js
"use strict";
const path = require("path");
const here = __dirname;
globalThis.PoseCorrectorSim = {
  config: require(path.join(here, "config.js")),
  geometry: require(path.join(here, "geometry.js")),
  lineFitter: require(path.join(here, "line_fitter.js")),
  aisleState: require(path.join(here, "aisle_state.js")),
  lateralDriftFilter: require(path.join(here, "lateral_drift_filter.js")),
  heading: require(path.join(here, "heading.js")),
  xOffset: require(path.join(here, "x_offset.js")),
  correctionTransform: require(path.join(here, "correction_transform.js")),
  poseCorrector: require(path.join(here, "pose_corrector.js")),
  syntheticWorld: require(path.join(here, "synthetic_world.js")),
};
require(path.join(here, "renderer.js"));
require(path.join(here, "demos.js"));
const Demos = globalThis.VisionPipelineP5Demos;
const calls = {};
const p = new Proxy({ width: 1200, height: 800, BOLD: "bold", NORMAL: "normal" }, {
  get(target, key) {
    if (key in target) return target[key];
    return (...args) => { calls[key] = (calls[key] || 0) + 1; if (key === "textWidth") return 10; return undefined; };
  },
});
const t0 = Date.now();
const state = Demos.createDemoState();
console.log(`createDemoState: ${Date.now() - t0} ms, ticks ${state.ticks.length}`);
let failures = 0;
for (const id of Demos.DemoIds) {
  for (const f of [0, 90, 200, 260, 300, 359, 420]) {
    try { Demos.drawDemo(p, state, id, f); } catch (e) { failures += 1; console.error(`FAIL ${id} @${f}: ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
  }
}
console.log(`${Demos.DemoIds.length} demos x 7 frames drawn, ${failures} failures, p5 calls: ${Object.keys(calls).length} distinct`);
process.exitCode = failures ? 1 : 0;

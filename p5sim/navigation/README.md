# p5js Vision Pointcloud Pipeline Simulator

This is a browser/p5js version of the Python simulator. It is meant to be read
like p5js or Raylib code: simple vectors, simple draw functions, and explicit
pipeline stages.

Run it by opening:

```text
utils/vision_pointcloud_pipeline/p5js/index.html
```

The page loads p5js from CDN:

```html
https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js
```

## File Map

- `core.js`: math, seeded random, synthetic pointcloud generation, line fitting,
  centerline, correction, and the full pipeline data model.
- `renderer.js`: p5 drawing helpers for points, lines, arrows, panels, legends,
  and world-to-screen conversion.
- `demos.js`: one readable simulation function per demo.
- `sketch.js`: p5 setup/draw loop and browser controls.

## Demo Coverage

- `pipeline`: full end-to-end synthetic correction pipeline.
- `synthetic-input`: rack face/interior points, tracks, and FCU pose.
- `accumulation`: current frame points vs accumulated points.
- `rotation-filter`: pivot, sweep angle, rotated_y boundary selection.
- `line-fit`: recursive inlier refinement.
- `coefficient-smoothing`: raw line vs EMA-smoothed line.
- `heading-consensus`: weighted heading mean and outlier rejection.
- `centerline`: rack lines to aisle centerline.
- `correction`: lateral correction from FCU pose to centerline.
- `tf-logic`: correction-frame yaw convention versus world corrected yaw.
- `failure-cases`: missing beam, outlier heading, track id switch.

## One-Method Sketches

The combined page is still available at `index.html`. For slower reading, each
demo also has its own folder with a local `sketch.js`:

- `pipeline/index.html`
- `synthetic-input/index.html`
- `accumulation/index.html`
- `rotation-filter/index.html`
- `line-fit/index.html`
- `coefficient-smoothing/index.html`
- `heading-consensus/index.html`
- `centerline/index.html`
- `correction/index.html`
- `tf-logic/index.html`
- `failure-cases/index.html`

Each standalone sketch pins one `DEMO_ID`, creates its own p5 canvas, and keeps
the method-specific simulation code directly inside that local `sketch.js`. This
intentionally duplicates some simple vector, fitting, and drawing helpers so the
file can be read on its own without jumping back to the combined app renderer.

The shared `scripts/core.js`, `scripts/renderer.js`, and `scripts/demos.js`
still power the combined selector page. The per-method folders are for learning:
open one folder, read one `sketch.js`, and follow that method from top to
bottom.

## How To Read It

Start with `core.js`. It intentionally uses small functions:

1. Generate synthetic rack pointclouds.
2. Accumulate points by stable track id.
3. Filter the rack face using rotation search.
4. Fit a line with recursive linear regression.
5. Smooth line coefficients.
6. Estimate heading consensus.
7. Estimate centerline.
8. Shift FCU pose laterally to corrected pose.

Then read `demos.js`. Each demo calls the core functions and draws only one idea.
This keeps the p5 version useful for learning the C++ implementation stage by
stage.

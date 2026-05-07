const DEMO_ID = "coefficient-smoothing";

// Creates a noisy fitted-line measurement for one animation frame.
function rawLineAt(frame) {
  const trueSlope = 0.62;
  const noisySlope =
      trueSlope + 0.09 * Math.sin(frame * 0.33) + 0.035 * Math.sin(frame * 1.2);
  const noisyC =
      0.72 + 0.16 * Math.sin(frame * 0.21) + 0.06 * Math.cos(frame * 0.77);
  return {m : noisySlope, b : noisyC};
}

// Applies EMA smoothing to line coefficients over time.
function smoothLines(count, alpha) {
  const out = [];
  let smooth = null;
  for (let i = 0; i < count; i += 1) {
    const raw = rawLineAt(i);
    smooth = smooth ? {
      m : alpha * raw.m + (1 - alpha) * smooth.m,
      b : alpha * raw.b + (1 - alpha) * smooth.b
    }
                    : {...raw};
    out.push({raw, smooth});
  }
  return out;
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const bounds = {minX : -3, maxX : 3, minY : -1, maxY : 3};
  const scale = Math.min(rect.w / 6, rect.h / 4);
  return {
    toScreen(point) {
      return {
        x : rect.x + rect.w * 0.5 + point.x * scale,
        y : rect.y + rect.h * 0.5 - (point.y - 1.0) * scale,
      };
    },
    grid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      p.pop();
    },
    line(line, color, weight) {
      const a =
          this.toScreen({x : bounds.minX, y : line.m * bounds.minX + line.b});
      const b =
          this.toScreen({x : bounds.maxX, y : line.m * bounds.maxX + line.b});
      p.push();
      p.stroke(color);
      p.strokeWeight(weight);
      p.line(a.x, a.y, b.x, b.y);
      p.pop();
    },
    pointsOnLine(line) {
      p.push();
      p.noStroke();
      p.fill(111, 126, 153, 110);
      for (let i = 0; i < 120; i += 1) {
        const x = -2.6 + i / 119 * 5.2;
        const y = line.m * x + line.b + 0.05 * Math.sin(i * 0.9);
        const s = this.toScreen({x, y});
        p.circle(s.x, s.y, 3);
      }
      p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, lines) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235);
  p.stroke(47, 58, 82);
  p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke();
  p.fill(230);
  p.textStyle(p.BOLD);
  p.text("Coefficient EMA", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

const alpha = 0.3;
const history = smoothLines(180, alpha);
let paused = false;
let simFrame = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton")
    .addEventListener("click", () => { simFrame = 0; });

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;

  const index = Math.floor(simFrame / 3) % history.length;
  const item = history[index];
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Coefficient smoothing", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: smooth fitted line coefficients before using them in heading/centerline logic",
      22, 50);
  w.grid();
  w.pointsOnLine(item.raw);
  w.line(item.raw, p.color(255, 142, 88), 2);
  w.line(item.smooth, p.color(87, 220, 255), 4);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `alpha: ${alpha.toFixed(2)}`,
    `raw slope: ${item.raw.m.toFixed(3)}`,
    `smoothed slope: ${item.smooth.m.toFixed(3)}`,
    `raw intercept: ${item.raw.b.toFixed(3)}`,
    `smoothed intercept: ${item.smooth.b.toFixed(3)}`,
    "",
    "Orange is the newest fitted line.",
    "Cyan is the EMA-smoothed line.",
    "",
    "This damps noisy mask/pointcloud",
    "geometry without changing the core",
    "line representation.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

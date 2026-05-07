const DEMO_ID = "centerline";
const DEG = Math.PI / 180;
const HEADING = 33.4 * DEG;

// Creates a rack or centerline equation from a lateral aisle offset.
function lineFromOffset(offset) {
  const a = -Math.sin(HEADING);
  const b = Math.cos(HEADING);
  return {a, b, c : -offset};
}

// Samples a point on a line at a chosen along-aisle distance.
function linePoint(line, along) {
  const dir = {x : Math.cos(HEADING), y : Math.sin(HEADING)};
  const normal = {x : line.a, y : line.b};
  const base = {x : -normal.x * line.c, y : -normal.y * line.c};
  return {x : base.x + dir.x * along, y : base.y + dir.y * along};
}

// Averages left and right rack lines to estimate the dual-beam centerline.
function averageLines(left, right) {
  return {
    a : (left.a + right.a) * 0.5,
    b : (left.b + right.b) * 0.5,
    c : (left.c + right.c) * 0.5
  };
}

// Offsets one observed rack line to estimate centerline in single-beam mode.
function offsetSingleLine(line, sideSign, halfWidth) {
  return {a : line.a, b : line.b, c : line.c - sideSign * halfWidth};
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const bounds = {minX : -3, maxX : 6, minY : -3, maxY : 4};
  const scale = Math.min(rect.w / 9, rect.h / 7);
  return {
    toScreen(point) {
      return {
        x : rect.x + rect.w * 0.5 + (point.x - 1.5) * scale,
        y : rect.y + rect.h * 0.5 - (point.y - 0.5) * scale,
      };
    },
    grid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      p.pop();
    },
    segment(a, b, color, weight) {
      const sa = this.toScreen(a);
      const sb = this.toScreen(b);
      p.push();
      p.stroke(color);
      p.strokeWeight(weight);
      p.line(sa.x, sa.y, sb.x, sb.y);
      p.pop();
    },
    line(line, color, weight) {
      this.segment(linePoint(line, -5), linePoint(line, 8), color, weight);
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
  p.text("Centerline", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

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

  const halfWidth = 1.55 + 0.06 * Math.sin(simFrame * 0.025);
  const left = lineFromOffset(halfWidth);
  const right = lineFromOffset(-halfWidth);
  const dualCenter = averageLines(left, right);
  const singleCenter = offsetSingleLine(left, 1, halfWidth);
  const showDual = Math.floor(simFrame / 90) % 2 === 0;
  const center = showDual ? dualCenter : singleCenter;
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Centerline estimation", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: average two rack lines, or offset one rack line by expected aisle half-width",
      22, 50);
  w.grid();
  w.line(left, p.color(83, 198, 255), 3);
  if (showDual)
    w.line(right, p.color(255, 199, 87), 3);
  w.line(center, p.color(163, 230, 53), 5);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `mode: ${showDual ? "dual beam" : "single beam fallback"}`,
    `half width: ${halfWidth.toFixed(3)} m`,
    `heading: ${(HEADING / DEG).toFixed(2)} deg`,
    "",
    "Dual: center.c = average(left.c, right.c).",
    "Single: shift the observed rack line",
    "by the expected aisle half-width.",
    "",
    "Green is the estimated aisle center.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

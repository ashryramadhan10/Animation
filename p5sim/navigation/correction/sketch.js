const DEMO_ID = "correction";
const HEADING = 33.5 * Math.PI / 180;
const CENTERLINE = {
  a : -Math.sin(HEADING),
  b : Math.cos(HEADING),
  c : 0.0
};

// Computes signed lateral distance from FCU pose to the centerline.
function signedDistance(point, line) {
  return line.a * point.x + line.b * point.y + line.c;
}

// Moves the FCU pose laterally toward the centerline using smoothed error.
function correctedPose(fcu, smoothedDist) {
  return {
    x : fcu.x - smoothedDist * CENTERLINE.a,
    y : fcu.y - smoothedDist * CENTERLINE.b,
    yaw : HEADING,
  };
}

// Creates a moving FCU pose with lateral drift around the aisle centerline.
function makeFcu(frame) {
  const dir = {x : Math.cos(HEADING), y : Math.sin(HEADING)};
  const norm = {x : CENTERLINE.a, y : CENTERLINE.b};
  const along = frame * 0.045;
  const lateral = 0.45 * Math.sin(frame * 0.035) + 0.16;
  return {
    x : dir.x * along + norm.x * lateral,
    y : dir.y * along + norm.y * lateral,
    yaw : HEADING + 0.25 * Math.sin(frame * 0.05),
  };
}

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const bounds = {minX : -2, maxX : 7, minY : -3, maxY : 4};
  const scale = Math.min(rect.w / 9, rect.h / 7);
  return {
    toScreen(point) {
      return {
        x : rect.x + rect.w * 0.5 + (point.x - 2.4) * scale,
        y : rect.y + rect.h * 0.5 - (point.y - 0.6) * scale,
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
    pose(pose, color, label) {
      const s = this.toScreen(pose);
      p.push();
      p.noStroke();
      p.fill(color);
      p.circle(s.x, s.y, 12);
      p.stroke(color);
      p.strokeWeight(3);
      p.line(s.x, s.y, s.x + Math.cos(pose.yaw) * 45,
             s.y - Math.sin(pose.yaw) * 45);
      p.noStroke();
      p.fill(230);
      p.text(label, s.x + 10, s.y - 10);
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
  p.text("Corrected pose", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  lines.forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
  p.pop();
}

let paused = false;
let simFrame = 0;
let smoothedDist = 0;
document.getElementById("pauseButton").addEventListener("click", (event) => {
  paused = !paused;
  event.currentTarget.textContent = paused ? "Resume" : "Pause";
});
document.getElementById("resetButton").addEventListener("click", () => {
  simFrame = 0;
  smoothedDist = 0;
});

// Creates the p5 canvas and fixes the animation update rate.
function setup() {
  createCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
  frameRate(30);
}

// Runs one animation frame and redraws the current method state.
function draw() {
  const p = window;

  const fcu = makeFcu(simFrame);
  const rawDist = signedDistance(fcu, CENTERLINE);
  smoothedDist = 0.08 * rawDist + 0.92 * smoothedDist;
  const corrected = correctedPose(fcu, smoothedDist);
  const dir = {x : Math.cos(HEADING), y : Math.sin(HEADING)};
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Lateral pose correction", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: signed distance to centerline -> EMA -> shift FCU pose perpendicular to aisle",
      22, 50);
  w.grid();
  w.segment({x : -4 * dir.x, y : -4 * dir.y}, {x : 9 * dir.x, y : 9 * dir.y},
            p.color(163, 230, 53), 5);
  w.segment(fcu, corrected, p.color(255, 255, 255, 170), 2);
  w.pose(fcu, p.color(255, 199, 87), "FCU");
  w.pose(corrected, p.color(82, 255, 168), "corrected");
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `raw distance: ${rawDist.toFixed(3)} m`,
    `smoothed distance: ${smoothedDist.toFixed(3)} m`,
    `corrected yaw: ${(HEADING * 180 / Math.PI).toFixed(2)} deg`,
    "",
    "The correction vector is perpendicular",
    "to the aisle centerline.",
    "",
    "The corrected heading is the aisle",
    "heading in world/map coordinates.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

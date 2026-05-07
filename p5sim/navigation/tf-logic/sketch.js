const DEMO_ID = "tf-logic";
const AISLE_YAW = 33.5 * Math.PI / 180;

// Builds a tiny world-to-screen renderer for this sketch.
function makeWorld(p) {
  const rect = {x : 22, y : 70, w : p.width - 360, h : p.height - 95};
  const scale = Math.min(rect.w / 8, rect.h / 6);
  return {
    toScreen(point) {
      return {
        x : rect.x + rect.w * 0.5 + point.x * scale,
        y : rect.y + rect.h * 0.5 - point.y * scale,
      };
    },
    grid() {
      p.push();
      p.stroke(42, 51, 72);
      p.noFill();
      p.rect(rect.x, rect.y, rect.w, rect.h);
      for (let x = -4; x <= 4; x += 1) {
        const a = this.toScreen({x, y : -3});
        const b = this.toScreen({x, y : 3});
        p.line(a.x, a.y, b.x, b.y);
      }
      for (let y = -3; y <= 3; y += 1) {
        const a = this.toScreen({x : -4, y});
        const b = this.toScreen({x : 4, y});
        p.line(a.x, a.y, b.x, b.y);
      }
      p.pop();
    },
    axis(origin, yaw, label) {
      const s = this.toScreen(origin);
      const xTip = this.toScreen(
          {x : origin.x + Math.cos(yaw), y : origin.y + Math.sin(yaw)});
      const yTip = this.toScreen({
        x : origin.x - Math.sin(yaw) * 0.8,
        y : origin.y + Math.cos(yaw) * 0.8
      });
      p.push();
      p.strokeWeight(4);
      p.stroke(248, 113, 113);
      p.line(s.x, s.y, xTip.x, xTip.y);
      p.stroke(82, 255, 168);
      p.line(s.x, s.y, yTip.x, yTip.y);
      p.noStroke();
      p.fill(230);
      p.text(label, s.x + 8, s.y - 8);
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
  p.text("TF yaw logic", x + 14, 96);
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

  const parentYaw = -AISLE_YAW;
  const childYaw = AISLE_YAW;
  const composedYaw = parentYaw + childYaw;
  const pulse = 0.2 * Math.sin(simFrame * 0.04);
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("TF correction frame logic", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: parent rotates by -aisle_yaw and child rotates by +aisle_yaw",
      22, 50);
  w.grid();
  w.axis({x : -2.2, y : 0}, 0, "map");
  w.axis({x : 0.0, y : pulse}, parentYaw, "odom_vision_correction");
  w.axis({x : 2.2, y : 0}, composedYaw, "composed local yaw");
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `aisle yaw: ${(AISLE_YAW * 180 / Math.PI).toFixed(2)} deg`,
    `map -> correction yaw: ${(parentYaw * 180 / Math.PI).toFixed(2)} deg`,
    `correction -> base yaw: ${(childYaw * 180 / Math.PI).toFixed(2)} deg`,
    `composed yaw: ${(composedYaw * 180 / Math.PI).toFixed(2)} deg`,
    "",
    "Read this like nested game objects:",
    "parent rotation + child rotation",
    "produces the local composed result.",
    "",
    "This does not mean the world",
    "corrected pose has zero yaw.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

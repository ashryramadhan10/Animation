const DEMO_ID = "heading-consensus";
const DEG = Math.PI / 180;

// Wraps an angle into the -pi to +pi range for heading comparison.
function normalizeAngle(angle) {
  return ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) -
         Math.PI;
}

// Computes weighted heading consensus and rejects angular outliers.
function consensus(beams, previousHeading) {
  const sorted =
      beams.slice().sort((a, b) => b.inliers - a.inliers).slice(0, 3);
  let sx = 0;
  let sy = 0;
  for (const beam of sorted) {
    sx += Math.cos(beam.heading) * beam.inliers;
    sy += Math.sin(beam.heading) * beam.inliers;
  }
  const mean = Math.atan2(sy, sx);
  const accepted = sorted.filter(
      beam => Math.abs(normalizeAngle(beam.heading - mean)) < 10 * DEG);
  if (!accepted.length)
    return {mean : previousHeading, accepted : []};
  sx = 0;
  sy = 0;
  for (const beam of accepted) {
    sx += Math.cos(beam.heading) * beam.inliers;
    sy += Math.sin(beam.heading) * beam.inliers;
  }
  return {mean : Math.atan2(sy, sx), accepted};
}

// Creates synthetic beam heading measurements with one possible outlier.
function makeBeams(frame) {
  const base = (33 + Math.sin(frame * 0.035) * 1.2) * DEG;
  return [
    {
      id : 1,
      heading : base + Math.sin(frame * 0.11) * 1.2 * DEG,
      inliers : 35000
    },
    {
      id : 2,
      heading : base + Math.cos(frame * 0.09) * 1.5 * DEG,
      inliers : 29000
    },
    {
      id : 3,
      heading : base + (16 + Math.sin(frame * 0.05) * 2.0) * DEG,
      inliers : 5500
    },
  ];
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
  p.text("Heading consensus", x + 14, 96);
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

  const beams = makeBeams(simFrame);
  const result = consensus(beams, 33 * DEG);
  const acceptedIds = new Set(result.accepted.map(beam => beam.id));
  const x0 = 70;
  const x1 = p.width - 390;
  const y = p.height * 0.52;
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Heading consensus", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: weighted circular mean, then reject beams outside the angular gate",
      22, 50);
  p.stroke(42, 51, 72);
  p.strokeWeight(2);
  p.line(x0, y, x1, y);
  for (let deg = 15; deg <= 55; deg += 5) {
    const x = x0 + (deg - 15) / 40 * (x1 - x0);
    p.line(x, y - 10, x, y + 10);
    p.noStroke();
    p.fill(149, 163, 184);
    p.text(`${deg}`, x - 7, y + 30);
    p.stroke(42, 51, 72);
  }
  for (const beam of beams) {
    const deg = beam.heading / DEG;
    const x = x0 + (deg - 15) / 40 * (x1 - x0);
    p.noStroke();
    p.fill(acceptedIds.has(beam.id) ? p.color(82, 255, 168)
                                    : p.color(248, 113, 113));
    p.circle(x, y, Math.max(10, Math.min(24, beam.inliers / 1800)));
    p.fill(230);
    p.text(`beam ${beam.id}`, x - 18, y - 24);
  }
  const meanX = x0 + (result.mean / DEG - 15) / 40 * (x1 - x0);
  p.stroke(163, 230, 53);
  p.strokeWeight(4);
  p.line(meanX, y - 70, meanX, y + 70);
  panel(p, [
    `const DEMO_ID = "${DEMO_ID}"`,
    `accepted beams: ${result.accepted.length}/${beams.length}`,
    `mean heading: ${(result.mean / DEG).toFixed(2)} deg`,
    "threshold: 10.00 deg",
    "",
    "Circle size is inlier count.",
    "Green beams shape the final mean.",
    "Red beams are outliers and should",
    "not steer the aisle yaw.",
  ]);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

const DEMO_ID = "failure-cases";
const CASES = [
  {
    title : "normal",
    beams : [
      {angle : 33, color : [ 82, 255, 168 ], accepted : true},
      {angle : 34, color : [ 82, 255, 168 ], accepted : true},
    ],
    notes : [
      "Both beams agree.", "Use the consensus heading and update correction."
    ],
  },
  {
    title : "missing beam",
    beams : [
      {angle : 33, color : [ 82, 255, 168 ], accepted : true},
    ],
    notes : [
      "Only one beam is reliable.",
      "Offset by expected half-width or freeze lateral state."
    ],
  },
  {
    title : "heading outlier",
    beams : [
      {angle : 33, color : [ 82, 255, 168 ], accepted : true},
      {angle : 52, color : [ 248, 113, 113 ], accepted : false},
    ],
    notes : [
      "One beam disagrees with the aisle.",
      "Reject it instead of steering into a bad yaw."
    ],
  },
  {
    title : "track id switch",
    beams : [
      {angle : 33, color : [ 82, 255, 168 ], accepted : true},
      {angle : 33, color : [ 248, 113, 113 ], accepted : false, shifted : true},
    ],
    notes : [
      "The id no longer means the same beam.",
      "Reset accumulated geometry for that id."
    ],
  },
];

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
      p.pop();
    },
    beam(angleDeg, offset, color) {
      const yaw = angleDeg * Math.PI / 180;
      const dir = {x : Math.cos(yaw), y : Math.sin(yaw)};
      const norm = {x : -Math.sin(yaw), y : Math.cos(yaw)};
      const center = {x : norm.x * offset, y : norm.y * offset};
      const a = this.toScreen(
          {x : center.x - dir.x * 3.2, y : center.y - dir.y * 3.2});
      const b = this.toScreen(
          {x : center.x + dir.x * 3.2, y : center.y + dir.y * 3.2});
      p.push();
      p.stroke(color[0], color[1], color[2]);
      p.strokeWeight(4);
      p.line(a.x, a.y, b.x, b.y);
      p.pop();
    },
  };
}

// Draws the right-side explanation panel for the current animation state.
function panel(p, current) {
  const x = p.width - 320;
  p.push();
  p.fill(14, 18, 28, 235);
  p.stroke(47, 58, 82);
  p.rect(x, 70, 300, p.height - 95, 8);
  p.noStroke();
  p.fill(230);
  p.textStyle(p.BOLD);
  p.text("Failure case", x + 14, 96);
  p.textStyle(p.NORMAL);
  p.fill(210, 220, 235);
  p.textSize(12);
  [`const DEMO_ID = "${DEMO_ID}"`,
   `case: ${current.title}`,
   `accepted beams: ${current.beams.filter(beam => beam.accepted).length}/${
       current.beams.length}`,
   "",
   ...current.notes,
   "",
   "Principle: do not update correction",
   "from geometry that no longer describes",
   "the same physical rack/aisle evidence.",
  ].forEach((line, i) => p.text(line, x + 14, 128 + i * 18));
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

  const current = CASES[Math.floor(simFrame / 90) % CASES.length];
  const w = makeWorld(p);
  p.background(8, 10, 16);
  p.noStroke();
  p.fill(232, 238, 248);
  p.textSize(18);
  p.text("Failure cases", 22, 30);
  p.fill(149, 163, 184);
  p.textSize(12);
  p.text(
      "One sketch: visualize when correction should reject, reset, or freeze state",
      22, 50);
  w.grid();
  current.beams.forEach((beam, i) => w.beam(beam.angle,
                                            beam.shifted ? 1.2
                                            : i === 0    ? 1.4
                                                         : -1.4,
                                            beam.color));
  w.beam(33, 0, [ 163, 230, 53 ]);
  panel(p, current);
  if (!paused)
    simFrame += 1;
}

// Resizes the canvas when the browser window changes.
function windowResized() {
  resizeCanvas(Math.max(760, window.innerWidth - 28),
               Math.max(540, window.innerHeight - 118));
}

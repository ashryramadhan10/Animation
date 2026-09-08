(function exposePuzzleSketch(root) {
  "use strict";

  function createPuzzleSketch(host, initialState) {
    let state = initialState || {};
    let celebrationStarted = 0;

    const instance = new p5((p) => {
      const colors = {
        grid: [39, 49, 66],
        gridStrong: [55, 68, 91],
        text: [218, 228, 241],
        muted: [119, 135, 157],
        expected: [95, 177, 213],
        actual: [255, 124, 139],
        success: [97, 221, 161],
        x: [255, 114, 114],
        y: [85, 230, 156],
        z: [112, 167, 255],
        accent: [245, 196, 81],
      };

      function canvasSize() {
        const width = Math.max(300, host.clientWidth || 640);
        return { width, height: Math.max(300, Math.min(470, width * 0.625)) };
      }

      function world(point, scale) {
        const unit = scale || Math.min(p.width, p.height) / 10;
        return { x: p.width * 0.5 + point.x * unit, y: p.height * 0.55 - point.y * unit };
      }

      function drawGrid() {
        p.strokeWeight(1);
        for (let x = -12; x <= 12; x += 1) {
          const a = world({ x, y: -8 });
          const b = world({ x, y: 8 });
          p.stroke.apply(p, (x === 0 ? colors.gridStrong : colors.grid).concat([x === 0 ? 180 : 100]));
          p.line(a.x, a.y, b.x, b.y);
        }
        for (let y = -8; y <= 8; y += 1) {
          const a = world({ x: -12, y });
          const b = world({ x: 12, y });
          p.stroke.apply(p, (y === 0 ? colors.gridStrong : colors.grid).concat([y === 0 ? 180 : 100]));
          p.line(a.x, a.y, b.x, b.y);
        }
      }

      function drawLabel(text, x, y, color) {
        p.noStroke();
        p.fill.apply(p, color || colors.muted);
        p.textFont("ui-monospace, Consolas, monospace");
        p.textSize(11);
        p.text(text, x, y);
      }

      function drawArrow(from, to, color, weight, dashed) {
        const a = world(from);
        const b = world(to);
        p.push();
        p.stroke.apply(p, color);
        p.strokeWeight(weight || 2);
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([7, 6]);
        p.line(a.x, a.y, b.x, b.y);
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([]);
        const heading = Math.atan2(b.y - a.y, b.x - a.x);
        p.translate(b.x, b.y);
        p.rotate(heading);
        p.noStroke();
        p.fill.apply(p, color);
        p.triangle(0, 0, -9, -4, -9, 4);
        p.pop();
      }

      function drawPoint(value, color, label, dashed) {
        if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return;
        const spot = world(value);
        p.push();
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([5, 4]);
        p.stroke.apply(p, color);
        p.strokeWeight(2);
        p.fill(7, 11, 17);
        p.circle(spot.x, spot.y, 13);
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([]);
        p.pop();
        drawLabel(label, spot.x + 9, spot.y - 9, color);
      }

      function drawFrame(transform, label, alpha) {
        if (!transform || !Number.isFinite(transform.x) || !Number.isFinite(transform.y)) return;
        const yaw = Number.isFinite(transform.yaw) ? transform.yaw : 0;
        const origin = { x: transform.x, y: transform.y };
        const xEnd = { x: origin.x + Math.cos(yaw) * 1.15, y: origin.y + Math.sin(yaw) * 1.15 };
        const yEnd = { x: origin.x - Math.sin(yaw) * 1.15, y: origin.y + Math.cos(yaw) * 1.15 };
        drawArrow(origin, xEnd, colors.x.concat([alpha || 255]), 2);
        drawArrow(origin, yEnd, colors.y.concat([alpha || 255]), 2);
        const at = world(origin);
        drawLabel(label, at.x + 8, at.y + 17, colors.text);
      }

      function format(value) {
        if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(3) : String(value);
        if (value === null || value === undefined) return "—";
        if (typeof value === "object" && Number.isFinite(value.x) && Number.isFinite(value.y)) {
          return "(" + value.x.toFixed(2) + ", " + value.y.toFixed(2) + ")";
        }
        const serialized = JSON.stringify(value);
        return serialized && serialized.length > 58 ? serialized.slice(0, 55) + "…" : serialized;
      }

      function outputColors() {
        const passing = state.comparison && state.comparison.pass;
        return { actual: passing ? colors.success : colors.actual, passing };
      }

      function renderVectorScene() {
        const puzzle = state.puzzle;
        const args = state.input || [];
        const output = outputColors();
        if (puzzle.id === "add-vectors") {
          const a = args[0] || { x: 0, y: 0 };
          const b = args[1] || { x: 0, y: 0 };
          drawArrow({ x: 0, y: 0 }, a, colors.x, 2);
          drawArrow(a, { x: a.x + b.x, y: a.y + b.y }, colors.y, 2);
        } else if (puzzle.id === "point-difference") {
          drawPoint(args[1], colors.muted, "from");
          drawPoint(args[0], colors.expected, "to");
          drawArrow(args[1], args[0], colors.accent, 2);
        } else if (args[0] && typeof args[0] === "object") {
          const input = args[0];
          if (puzzle.preview.valueRole === "point") drawPoint(input, colors.muted, "input");
          else drawArrow({ x: 0, y: 0 }, input, colors.muted, 2);
        }
        if (state.expected && typeof state.expected === "object") {
          drawArrow({ x: 0, y: 0 }, state.expected, colors.expected, 2, true);
          drawPoint(state.expected, colors.expected, "expected", true);
        }
        if (state.actual && typeof state.actual === "object") {
          drawArrow({ x: 0, y: 0 }, state.actual, output.actual, 3);
          drawPoint(state.actual, output.actual, output.passing ? "match" : "yours");
          if (state.expected && !output.passing) drawArrow(state.actual, state.expected, colors.actual, 1, true);
        }
      }

      function renderScalarScene() {
        const vector = (state.input && state.input[0]) || { x: 0, y: 0 };
        drawArrow({ x: 0, y: 0 }, vector, colors.accent, 3);
        const endpoint = world(vector);
        const expected = state.expected === undefined ? "?" : format(state.expected);
        const actual = state.actual === undefined || state.actual === null ? "?" : format(state.actual);
        drawLabel("expected length: " + expected, 18, 28, colors.expected);
        drawLabel("your length: " + actual, 18, 47, outputColors().actual);
        drawLabel("√(x² + y²)", endpoint.x + 10, endpoint.y + 18, colors.muted);
      }

      function renderSE2Scene() {
        const args = state.input || [];
        const transform = args[0] && Number.isFinite(args[0].yaw) ? args[0] : { x: 0, y: 0, yaw: 0 };
        drawFrame({ x: 0, y: 0, yaw: 0 }, "source", 170);
        drawFrame(transform, "target", 255);
        const point = args[1] && Number.isFinite(args[1].x) ? args[1] : { x: 1.4, y: 0.6 };
        drawPoint(point, colors.muted, "input");
        if (state.expected && Number.isFinite(state.expected.x)) drawPoint(state.expected, colors.expected, "expected", true);
        if (state.actual && Number.isFinite(state.actual.x)) {
          drawPoint(state.actual, outputColors().actual, outputColors().passing ? "match" : "yours");
          if (state.expected && !outputColors().passing) drawArrow(state.actual, state.expected, colors.actual, 1, true);
        }
        drawLabel("rotate → translate", 18, 28, colors.muted);
      }

      function treeLayout(names) {
        const known = ["map", "odom", "base_link", "laser"];
        const order = known.filter((name) => names.includes(name)).concat(names.filter((name) => !known.includes(name)));
        const positions = {};
        order.forEach((name, index) => {
          positions[name] = { x: p.width * 0.18 + (index % 4) * p.width * 0.21, y: p.height * 0.48 + (index % 2 ? 30 : -30) };
        });
        return positions;
      }

      function drawTreeNode(name, position, active) {
        p.stroke.apply(p, active ? colors.accent : colors.gridStrong);
        p.strokeWeight(active ? 2 : 1);
        p.fill(active ? 34 : 15, active ? 29 : 20, active ? 14 : 30);
        p.rect(position.x - 42, position.y - 18, 84, 36, 8);
        p.noStroke();
        p.fill.apply(p, active ? colors.text : colors.muted);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(11);
        p.text(name, position.x, position.y);
        p.textAlign(p.LEFT, p.BASELINE);
      }

      function renderTreeScene() {
        const input = state.input || [];
        let tree = input[0];
        if (Array.isArray(tree)) {
          tree = {};
          input[0].forEach((edge) => { tree[edge.child] = { parent: edge.parent }; });
        }
        if (!tree || typeof tree !== "object") tree = { odom: { parent: "map" }, base_link: { parent: "odom" }, laser: { parent: "base_link" } };
        const names = Array.from(new Set(Object.keys(tree).concat(Object.values(tree).map((edge) => edge.parent))));
        const positions = treeLayout(names);
        Object.keys(tree).forEach((child) => {
          const parent = tree[child].parent;
          if (!positions[parent] || !positions[child]) return;
          p.stroke.apply(p, colors.gridStrong);
          p.strokeWeight(2);
          p.line(positions[parent].x + 42, positions[parent].y, positions[child].x - 42, positions[child].y);
        });
        names.forEach((name) => drawTreeNode(name, positions[name], name === input[1] || name === input[2]));
        drawLabel("parentFromChild edges", 18, 28, colors.muted);
        if (state.actual !== undefined && state.actual !== null) drawLabel("result: " + format(state.actual), 18, p.height - 22, outputColors().actual);
      }

      function renderTimeScene() {
        const input = state.input || [];
        const left = 42;
        const right = p.width - 34;
        const centerY = p.height * 0.54;
        p.stroke.apply(p, colors.gridStrong);
        p.strokeWeight(2);
        p.line(left, centerY, right, centerY);
        for (let index = 0; index <= 10; index += 1) {
          const x = p.lerp(left, right, index / 10);
          p.line(x, centerY - 5, x, centerY + 5);
        }
        const amount = typeof input[input.length - 1] === "number" && input.length > 2 ? input[input.length - 1] : 0.5;
        const markerX = p.lerp(left, right, Math.max(0, Math.min(1, amount)));
        p.stroke.apply(p, colors.accent);
        p.line(markerX, centerY - 52, markerX, centerY + 52);
        p.noStroke();
        p.fill.apply(p, colors.accent);
        p.circle(markerX, centerY, 10);
        drawLabel("past", left, centerY + 28, colors.muted);
        drawLabel("future", right - 38, centerY + 28, colors.muted);
        drawLabel("expected: " + format(state.expected), 18, 28, colors.expected);
        drawLabel("yours: " + format(state.actual), 18, 47, outputColors().actual);
      }

      function project3D(value) {
        const scale = Math.min(p.width, p.height) / 7;
        return {
          x: p.width * 0.5 + (value.x - value.y) * scale * 0.75,
          y: p.height * 0.58 - value.z * scale + (value.x + value.y) * scale * 0.34,
        };
      }

      function draw3DArrow(value, color, label, dashed) {
        const origin = project3D({ x: 0, y: 0, z: 0 });
        const end = project3D(value);
        p.push();
        p.stroke.apply(p, color);
        p.strokeWeight(3);
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([7, 6]);
        p.line(origin.x, origin.y, end.x, end.y);
        if (dashed && p.drawingContext.setLineDash) p.drawingContext.setLineDash([]);
        p.pop();
        drawLabel(label, end.x + 8, end.y - 8, color);
      }

      function renderSE3Scene() {
        draw3DArrow({ x: 1.3, y: 0, z: 0 }, colors.x, "+X");
        draw3DArrow({ x: 0, y: 1.3, z: 0 }, colors.y, "+Y");
        draw3DArrow({ x: 0, y: 0, z: 1.3 }, colors.z, "+Z");
        const expected = state.expected && state.expected.translation ? state.expected.translation : state.expected;
        const actual = state.actual && state.actual.translation ? state.actual.translation : state.actual;
        if (expected && Number.isFinite(expected.z)) draw3DArrow(expected, colors.expected, "expected", true);
        if (actual && Number.isFinite(actual.z)) draw3DArrow(actual, outputColors().actual, outputColors().passing ? "match" : "yours");
        drawLabel("3D uses the same parent-from-child composition idea", 18, 28, colors.muted);
      }

      function renderBufferScene() {
        renderTreeScene();
        const y = p.height - 52;
        p.stroke.apply(p, colors.gridStrong);
        p.line(38, y, p.width - 38, y);
        p.stroke.apply(p, colors.accent);
        p.line(p.width * 0.62, y - 12, p.width * 0.62, y + 12);
        drawLabel("query time", p.width * 0.62 + 7, y - 8, colors.accent);
      }

      p.setup = function setup() {
        const size = canvasSize();
        p.createCanvas(size.width, size.height).parent(host);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.textFont("ui-monospace, Consolas, monospace");
        if (typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver(() => {
            const next = canvasSize();
            p.resizeCanvas(next.width, next.height);
          });
          observer.observe(host);
        }
      };

      p.draw = function draw() {
        p.background(8, 12, 18);
        drawGrid();
        const puzzle = state.puzzle;
        if (!puzzle) {
          drawLabel("Choose a puzzle to begin.", 18, 28, colors.muted);
          return;
        }

        const kind = puzzle.preview.kind;
        if (kind === "scalar") renderScalarScene();
        else if (kind === "vector" || kind === "point-vector") renderVectorScene();
        else if (kind === "se2") renderSE2Scene();
        else if (kind === "tree" || kind === "robot-chain") renderTreeScene();
        else if (kind === "time") renderTimeScene();
        else if (kind === "se3") renderSE3Scene();
        else if (kind === "buffer") renderBufferScene();

        if (state.running) {
          p.noStroke();
          p.fill(7, 9, 14, 170);
          p.rect(0, 0, p.width, p.height);
          p.fill.apply(p, colors.accent);
          p.circle(p.width / 2, p.height / 2, 10 + Math.sin(p.frameCount * 0.15) * 4);
          drawLabel("running your function…", p.width / 2 - 66, p.height / 2 + 30, colors.text);
        }

        const elapsed = performance.now() - celebrationStarted;
        if (celebrationStarted && elapsed < 1000) {
          const amount = elapsed / 1000;
          p.noFill();
          p.stroke.apply(p, colors.success.concat([255 * (1 - amount)]));
          p.strokeWeight(3);
          p.circle(p.width / 2, p.height / 2, 40 + amount * Math.min(p.width, p.height) * 0.7);
        }
      };
    }, host);

    return {
      setState(nextState) {
        state = { ...state, ...nextState };
      },
      celebrate() {
        celebrationStarted = performance.now();
      },
      remove() {
        instance.remove();
      },
    };
  }

  root.createPuzzleSketch = createPuzzleSketch;
  if (typeof module !== "undefined" && module.exports) module.exports = { createPuzzleSketch };
})(typeof window !== "undefined" ? window : globalThis);

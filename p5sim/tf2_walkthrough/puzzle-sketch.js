(function exposePuzzleSketch(root) {
  "use strict";

  const STYLE_COLORS = {
    input: [245, 196, 81],
    expected: [95, 177, 213],
    actual: [255, 124, 139],
    match: [97, 221, 161],
    muted: [119, 135, 157],
    accent: [245, 196, 81],
    text: [218, 228, 241],
    x: [255, 114, 114],
    y: [85, 230, 156],
    z: [112, 167, 255],
    grid: [39, 49, 66],
    gridStrong: [55, 68, 91],
  };

  function createPuzzleSketch(host, callbacks) {
    const handlers = callbacks || {};
    let state = { values: {}, grips: [], primitives: [], running: false };
    let celebrationStarted = 0;
    let activeGrip = null;
    let hoverGrip = null;

    const instance = new p5((p) => {
      function color(style, alpha) {
        const rgb = STYLE_COLORS[style] || STYLE_COLORS.muted;
        return rgb.concat([alpha === undefined ? 255 : alpha]);
      }
      function canvasSize() {
        const width = Math.max(300, host.clientWidth || 640);
        return { width, height: Math.max(300, Math.min(470, width * 0.625)) };
      }
      function unit() { return Math.min(p.width / 11.5, p.height / 7.6); }
      function toScreen(point) { const u = unit(); return { x: p.width * 0.5 + point.x * u, y: p.height * 0.5 - point.y * u }; }
      function toWorld(x, y) { const u = unit(); return { x: (x - p.width * 0.5) / u, y: (p.height * 0.5 - y) / u }; }
      function setDash(on) { if (p.drawingContext.setLineDash) p.drawingContext.setLineDash(on ? [6, 5] : []); }

      function drawGrid() {
        p.strokeWeight(1);
        for (let x = -6; x <= 6; x += 1) {
          const a = toScreen({ x, y: -4 });
          const b = toScreen({ x, y: 4 });
          p.stroke.apply(p, x === 0 ? color("gridStrong", 180) : color("grid", 100));
          p.line(a.x, a.y, b.x, b.y);
        }
        for (let y = -4; y <= 4; y += 1) {
          const a = toScreen({ x: -6, y });
          const b = toScreen({ x: 6, y });
          p.stroke.apply(p, y === 0 ? color("gridStrong", 180) : color("grid", 100));
          p.line(a.x, a.y, b.x, b.y);
        }
      }

      function drawText(text, x, y, style, size) {
        p.noStroke();
        p.fill.apply(p, color(style || "muted"));
        p.textSize(size || 11);
        p.text(text, x, y);
      }

      function strokeLine(from, to, style, options) {
        const settings = options || {};
        const a = toScreen(from);
        const b = toScreen(to);
        p.push();
        p.stroke.apply(p, color(style, settings.alpha));
        p.strokeWeight(settings.weight || 2);
        setDash(Boolean(settings.dashed));
        p.line(a.x, a.y, b.x, b.y);
        setDash(false);
        p.pop();
        return { a, b };
      }

      function arrowHead(screenAt, heading, style, alpha, size) {
        p.push();
        p.translate(screenAt.x, screenAt.y);
        p.rotate(heading);
        p.noStroke();
        p.fill.apply(p, color(style, alpha));
        p.triangle(0, 0, -(size || 9), -4, -(size || 9), 4);
        p.pop();
      }

      function drawArrow(primitive) {
        const ends = strokeLine(primitive.from, primitive.to, primitive.style, primitive);
        arrowHead(ends.b, Math.atan2(ends.b.y - ends.a.y, ends.b.x - ends.a.x), primitive.style, primitive.alpha);
        if (primitive.label) drawText(primitive.label, ends.b.x + 8, ends.b.y - 8, primitive.style);
      }

      function drawFrame(primitive) {
        const t = primitive.transform;
        if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.yaw)) return;
        const size = primitive.size || 1;
        const origin = { x: t.x, y: t.y };
        const xEnd = { x: t.x + Math.cos(t.yaw) * size, y: t.y + Math.sin(t.yaw) * size };
        const yEnd = { x: t.x - Math.sin(t.yaw) * size, y: t.y + Math.cos(t.yaw) * size };
        const alpha = primitive.alpha === undefined ? (primitive.style === "muted" ? 150 : 255) : primitive.alpha;
        drawArrow({ from: origin, to: xEnd, style: "x", alpha, dashed: primitive.dashed, weight: primitive.dashed ? 2 : 2.5 });
        drawArrow({ from: origin, to: yEnd, style: "y", alpha, dashed: primitive.dashed, weight: primitive.dashed ? 2 : 2.5 });
        const at = toScreen(origin);
        p.push();
        p.noFill();
        p.stroke.apply(p, color(primitive.style, alpha));
        p.strokeWeight(primitive.style === "muted" ? 1 : 2);
        setDash(Boolean(primitive.dashed));
        p.circle(at.x, at.y, 9);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 8, at.y + 16, primitive.style);
      }

      function drawPoint(primitive) {
        if (!primitive.at || !Number.isFinite(primitive.at.x) || !Number.isFinite(primitive.at.y)) return;
        const at = toScreen(primitive.at);
        p.push();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.fill(7, 11, 17);
        p.circle(at.x, at.y, 13);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 9, at.y - 9, primitive.style);
      }

      function drawArc(primitive) {
        const center = toScreen(primitive.center);
        const diameter = primitive.radius * unit() * 2;
        p.push();
        p.noFill();
        if (primitive.track) {
          p.stroke.apply(p, color("grid", 200));
          p.strokeWeight(1);
          p.circle(center.x, center.y, diameter);
        }
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(primitive.weight || 2);
        setDash(Boolean(primitive.dashed));
        const sweep = primitive.to - primitive.from;
        if (Math.abs(sweep) >= Math.PI * 2 - 1e-9) {
          p.circle(center.x, center.y, diameter);
        } else if (Math.abs(sweep) > 1e-6) {
          const start = sweep > 0 ? -primitive.to : -primitive.from;
          const stop = sweep > 0 ? -primitive.from : -primitive.to;
          p.arc(center.x, center.y, diameter, diameter, start, stop);
        }
        setDash(false);
        p.pop();
        if (primitive.arrowhead && Math.abs(sweep) > 1e-6) {
          const tip = { x: primitive.center.x + Math.cos(primitive.to) * primitive.radius, y: primitive.center.y + Math.sin(primitive.to) * primitive.radius };
          const screenTip = toScreen(tip);
          const tangent = -primitive.to + (sweep > 0 ? -Math.PI / 2 : Math.PI / 2);
          arrowHead(screenTip, tangent, primitive.style, 255, 8);
        }
      }

      function drawGlyph(primitive) {
        const pose = primitive.pose;
        if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.yaw)) return;
        const at = toScreen(pose);
        const size = unit() * 0.42;
        p.push();
        p.translate(at.x, at.y);
        p.rotate(-pose.yaw);
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.fill(7, 11, 17, primitive.dashed ? 0 : 230);
        p.triangle(size, 0, -size * 0.7, size * 0.6, -size * 0.7, -size * 0.6);
        setDash(false);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + size + 6, at.y + 4, primitive.style);
      }

      function drawLane(primitive) {
        strokeLine(primitive.from, primitive.to, primitive.style, { weight: primitive.weight || 2, dashed: primitive.dashed });
        (primitive.marks || []).forEach((mark) => {
          const at = toScreen(mark.at);
          p.push();
          p.stroke.apply(p, color(primitive.style));
          p.strokeWeight(1);
          p.line(at.x, at.y - 5, at.x, at.y + 5);
          p.pop();
          if (mark.label) drawText(mark.label, at.x - 8, at.y + 17, "muted", 10);
        });
        if (primitive.label) {
          const at = toScreen(primitive.from);
          drawText(primitive.label, at.x, at.y - 9, primitive.style, 10);
        }
      }

      function drawMarker(primitive) {
        const at = toScreen(primitive.at);
        const height = (primitive.height || 0.2) * unit();
        p.push();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.line(at.x, at.y - height, at.x, at.y + height);
        setDash(false);
        p.noStroke();
        p.fill.apply(p, color(primitive.style));
        p.circle(at.x, at.y, 7);
        p.pop();
        if (primitive.label) drawText(primitive.label, at.x + 6, at.y - height - 4, primitive.style, 10);
      }

      function drawShade(primitive) {
        const a = toScreen(primitive.from);
        const b = toScreen(primitive.to);
        p.push();
        p.noStroke();
        p.fill.apply(p, color(primitive.style, 34));
        p.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        p.pop();
      }

      function drawLabel(primitive) {
        if (primitive.at) {
          const at = toScreen(primitive.at);
          drawText(primitive.text, at.x, at.y, primitive.style);
        } else {
          drawText(primitive.text, 18, 28 + (primitive.row || 0) * 19, primitive.style);
        }
      }

      function treeLayout(nodes, edges) {
        const parentOf = {};
        edges.forEach((edge) => { parentOf[edge.child] = edge.parent; });
        const depth = {};
        function depthOf(name, seen) {
          if (depth[name] !== undefined) return depth[name];
          if (seen.has(name)) return 0;
          seen.add(name);
          const parent = parentOf[name];
          depth[name] = parent === undefined ? 0 : depthOf(parent, seen) + 1;
          return depth[name];
        }
        nodes.forEach((node) => depthOf(node.id, new Set()));
        const columns = {};
        nodes.forEach((node) => { (columns[depth[node.id]] = columns[depth[node.id]] || []).push(node.id); });
        const depths = Object.keys(columns).map(Number);
        const maxDepth = Math.max.apply(null, depths.concat([0]));
        const positions = {};
        depths.forEach((d) => {
          const column = columns[d];
          column.forEach((name, index) => {
            positions[name] = {
              x: p.width * (0.14 + (maxDepth ? d / maxDepth : 0) * 0.72),
              y: p.height * (column.length === 1 ? 0.46 : 0.24 + index / (column.length - 1) * 0.46),
            };
          });
        });
        return positions;
      }

      function drawTree(primitive) {
        const positions = treeLayout(primitive.nodes, primitive.edges);
        function edgeLine(from, to, style, options) {
          const a = positions[from];
          const b = positions[to];
          if (!a || !b) return;
          const settings = options || {};
          const heading = Math.atan2(b.y - a.y, b.x - a.x);
          const start = { x: a.x + Math.cos(heading) * 44, y: a.y + Math.sin(heading) * 44 };
          const end = { x: b.x - Math.cos(heading) * 44, y: b.y - Math.sin(heading) * 44 };
          const offset = settings.offset || 0;
          const ox = -Math.sin(heading) * offset;
          const oy = Math.cos(heading) * offset;
          p.push();
          p.stroke.apply(p, color(style));
          p.strokeWeight(settings.weight || 2);
          setDash(Boolean(settings.dashed));
          p.line(start.x + ox, start.y + oy, end.x + ox, end.y + oy);
          setDash(false);
          p.pop();
          arrowHead({ x: end.x + ox, y: end.y + oy }, heading, style, 255, 8);
          if (settings.text) drawText(settings.text, (start.x + end.x) / 2 + ox + 4, (start.y + end.y) / 2 + oy - 4, style, 10);
        }
        primitive.edges.forEach((edge) => edgeLine(edge.parent, edge.child, edge.style || "muted", { dashed: edge.dashed }));
        primitive.steps.forEach((step, index) => edgeLine(step.from, step.to, step.style, { dashed: step.dashed, weight: 3, offset: step.dashed ? -9 : 9, text: step.inverse ? "inverse" : "" }));
        primitive.nodes.forEach((node) => {
          const at = positions[node.id];
          const highlighted = node.style && node.style !== "muted";
          p.push();
          p.stroke.apply(p, color(highlighted ? node.style : "gridStrong"));
          p.strokeWeight(highlighted ? 2 : 1);
          p.fill(highlighted ? 24 : 15, highlighted ? 26 : 20, highlighted ? 30 : 30);
          p.rect(at.x - 42, at.y - 18, 84, 36, 8);
          if (node.expected) {
            p.noFill();
            p.stroke.apply(p, color("expected"));
            setDash(true);
            p.rect(at.x - 47, at.y - 23, 94, 46, 10);
            setDash(false);
          }
          p.noStroke();
          p.fill.apply(p, color(highlighted ? "text" : "muted"));
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(11);
          p.text(node.id, at.x, at.y);
          p.textAlign(p.LEFT, p.BASELINE);
          p.pop();
        });
        if (primitive.caption) drawText(primitive.caption, 18, p.height - 16, "muted", 10);
      }

      function project3D(value) {
        const scale = Math.min(p.width, p.height) / 7;
        return {
          x: p.width * 0.5 + (value.x - value.y) * scale * 0.75,
          y: p.height * 0.5 - value.z * scale + (value.x + value.y) * scale * 0.34,
        };
      }

      function draw3DLine(from, to, style, options) {
        const settings = options || {};
        const a = project3D(from);
        const b = project3D(to);
        p.push();
        p.stroke.apply(p, color(style, settings.alpha));
        p.strokeWeight(settings.weight || 2.5);
        setDash(Boolean(settings.dashed));
        p.line(a.x, a.y, b.x, b.y);
        setDash(false);
        p.pop();
        arrowHead(b, Math.atan2(b.y - a.y, b.x - a.x), style, settings.alpha, 8);
        return b;
      }

      function drawAxes3d(primitive) {
        const origin = primitive.origin;
        const alpha = primitive.style === "muted" ? 110 : 255;
        const length = primitive.size || 1.2;
        ["x", "y", "z"].forEach((axis) => {
          const basis = primitive.basis[axis];
          draw3DLine(origin, { x: origin.x + basis.x * length, y: origin.y + basis.y * length, z: origin.z + basis.z * length }, axis, { alpha, dashed: primitive.dashed });
        });
        const at = project3D(origin);
        if (primitive.label) drawText(primitive.label, at.x + 8, at.y + 16, primitive.style);
      }

      function drawArrow3d(primitive) {
        const end = draw3DLine(primitive.from, primitive.to, primitive.style, { dashed: primitive.dashed, weight: 3 });
        if (primitive.label) drawText(primitive.label, end.x + 8, end.y - 8, primitive.style);
      }

      function drawPoints(primitive) {
        const size = primitive.size || 5;
        p.push();
        p.noStroke();
        p.fill.apply(p, color(primitive.style, primitive.alpha === undefined ? 230 : primitive.alpha));
        (primitive.points || []).forEach((item) => {
          if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
          const at = toScreen(item);
          p.circle(at.x, at.y, size);
        });
        p.pop();
        if (primitive.label && primitive.points && primitive.points.length) {
          const at = toScreen(primitive.points[0]);
          drawText(primitive.label, at.x + 8, at.y - 8, primitive.style, 10);
        }
      }

      function drawSegments(primitive) {
        (primitive.pairs || []).forEach((pair) => {
          if (!pair || !pair[0] || !pair[1]) return;
          strokeLine(pair[0], pair[1], primitive.style, { weight: primitive.weight || 1, dashed: primitive.dashed, alpha: primitive.alpha });
        });
      }

      function drawEllipse(primitive) {
        const cov = primitive.covariance;
        if (!cov || !cov[0] || !cov[1] || ![cov[0][0], cov[0][1], cov[1][0], cov[1][1]].every(Number.isFinite)) return;
        const a = cov[0][0];
        const b = (cov[0][1] + cov[1][0]) / 2;
        const d = cov[1][1];
        const mean = (a + d) / 2;
        const spread = Math.sqrt(Math.max(0, ((a - d) / 2) * ((a - d) / 2) + b * b));
        const major = Math.sqrt(Math.max(0, mean + spread));
        const minor = Math.sqrt(Math.max(0, mean - spread));
        const angle = 0.5 * Math.atan2(2 * b, a - d);
        const k = primitive.scale || 2;
        const center = toScreen(primitive.center);
        p.push();
        p.translate(center.x, center.y);
        p.rotate(-angle);
        p.noFill();
        p.stroke.apply(p, color(primitive.style));
        p.strokeWeight(2);
        setDash(Boolean(primitive.dashed));
        p.ellipse(0, 0, 2 * k * major * unit(), 2 * k * minor * unit());
        setDash(false);
        p.pop();
        if (primitive.label) {
          const tip = { x: center.x + k * major * unit() * Math.cos(angle) + 8, y: center.y - k * major * unit() * Math.sin(angle) - 6 };
          drawText(primitive.label, tip.x, tip.y, primitive.style, 10);
        }
      }

      function drawPrimitive(primitive) {
        switch (primitive.kind) {
          case "frame": return drawFrame(primitive);
          case "point": return drawPoint(primitive);
          case "arrow": return drawArrow(primitive);
          case "arc": return drawArc(primitive);
          case "label": return drawLabel(primitive);
          case "glyph": return drawGlyph(primitive);
          case "lane": return drawLane(primitive);
          case "marker": return drawMarker(primitive);
          case "shade": return drawShade(primitive);
          case "tree": return drawTree(primitive);
          case "axes3d": return drawAxes3d(primitive);
          case "arrow3d": return drawArrow3d(primitive);
          case "points": return drawPoints(primitive);
          case "segments": return drawSegments(primitive);
          case "ellipse": return drawEllipse(primitive);
          default: return undefined;
        }
      }

      function drawGrips() {
        state.grips.forEach((grip) => {
          const at = toScreen(grip.at);
          const active = activeGrip && activeGrip.handleId === grip.handleId && activeGrip.grip === grip.grip;
          const hovered = hoverGrip && hoverGrip.handleId === grip.handleId && hoverGrip.grip === grip.grip;
          p.push();
          p.noFill();
          p.stroke.apply(p, color("input", active ? 255 : hovered ? 200 : 110));
          p.strokeWeight(active ? 2.5 : 1.5);
          p.circle(at.x, at.y, grip.grip === "origin" ? 22 : 16);
          p.pop();
        });
      }

      function gripAt(x, y) {
        const world = toWorld(x, y);
        let best = null;
        state.grips.forEach((grip) => {
          const distance = Math.hypot(grip.at.x - world.x, grip.at.y - world.y);
          if (distance <= Math.max(grip.radius, 0.3) && (!best || distance < best.distance)) best = { grip, distance };
        });
        return best ? best.grip : null;
      }

      function insideCanvas() {
        return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
      }

      p.setup = function setup() {
        const size = canvasSize();
        p.createCanvas(size.width, size.height).parent(host);
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        p.textFont("ui-monospace, Consolas, monospace");
        if (typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver(() => { const next = canvasSize(); p.resizeCanvas(next.width, next.height); });
          observer.observe(host);
        }
      };

      p.draw = function draw() {
        p.background(8, 12, 18);
        drawGrid();
        if (!state.primitives.length) drawText("Choose a puzzle to begin.", 18, 28, "muted");
        const primitives = state.primitives.slice();
        primitives.filter((item) => item.kind === "shade").forEach(drawPrimitive);
        primitives.filter((item) => item.kind !== "shade" && item.kind !== "label").forEach(drawPrimitive);
        drawGrips();
        primitives.filter((item) => item.kind === "label").forEach(drawPrimitive);
        if (state.running) {
          p.noStroke();
          p.fill(7, 9, 14, 150);
          p.rect(0, 0, p.width, p.height);
          p.fill.apply(p, color("accent"));
          p.circle(p.width / 2, p.height / 2, 10 + Math.sin(p.frameCount * 0.15) * 4);
          drawText("checking every case…", p.width / 2 - 62, p.height / 2 + 30, "text");
        }
        const elapsed = performance.now() - celebrationStarted;
        if (celebrationStarted && elapsed < 1000) {
          const amount = elapsed / 1000;
          p.noFill();
          p.stroke.apply(p, color("match", 255 * (1 - amount)));
          p.strokeWeight(3);
          p.circle(p.width / 2, p.height / 2, 40 + amount * Math.min(p.width, p.height) * 0.7);
        }
      };

      p.mouseMoved = function mouseMoved() {
        hoverGrip = insideCanvas() ? gripAt(p.mouseX, p.mouseY) : null;
        host.style.cursor = hoverGrip ? "grab" : "default";
      };

      p.mousePressed = function mousePressed() {
        if (!insideCanvas()) return true;
        activeGrip = gripAt(p.mouseX, p.mouseY);
        if (activeGrip) { host.style.cursor = "grabbing"; return false; }
        return true;
      };

      p.mouseDragged = function mouseDragged() {
        if (!activeGrip) return true;
        if (typeof handlers.onDrag === "function") handlers.onDrag(activeGrip, toWorld(p.mouseX, p.mouseY));
        return false;
      };

      p.mouseReleased = function mouseReleased() {
        if (activeGrip && typeof handlers.onDragEnd === "function") handlers.onDragEnd(activeGrip);
        activeGrip = null;
        host.style.cursor = hoverGrip ? "grab" : "default";
      };

      p.touchStarted = p.mousePressed;
      p.touchMoved = p.mouseDragged;
      p.touchEnded = p.mouseReleased;
    }, host);

    return {
      setState(next) { state = { ...state, ...next }; },
      celebrate() { celebrationStarted = performance.now(); },
      remove() { instance.remove(); },
    };
  }

  root.createPuzzleSketch = createPuzzleSketch;
  if (typeof module !== "undefined" && module.exports) module.exports = { createPuzzleSketch };
})(typeof window !== "undefined" ? window : globalThis);

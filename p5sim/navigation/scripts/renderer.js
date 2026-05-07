(function (global) {
  "use strict";

  class WorldRenderer {
    constructor(p, bounds, screenRect) {
      this.p = p;
      this.bounds = bounds;
      this.screenRect = screenRect;
      this.scale = this.computeScale();
    }

    computeScale() {
      const worldW = this.bounds.maxX - this.bounds.minX;
      const worldH = this.bounds.maxY - this.bounds.minY;
      return Math.min(this.screenRect.w / worldW, this.screenRect.h / worldH);
    }

    toScreen(point) {
      const cx = (this.bounds.minX + this.bounds.maxX) * 0.5;
      const cy = (this.bounds.minY + this.bounds.maxY) * 0.5;
      const sx = this.screenRect.x + this.screenRect.w * 0.5 + (point.x - cx) * this.scale;
      const sy = this.screenRect.y + this.screenRect.h * 0.5 - (point.y - cy) * this.scale;
      return { x: sx, y: sy };
    }

    drawGrid() {
      const p = this.p;
      p.push();
      p.noFill();
      p.stroke(42, 51, 72);
      p.strokeWeight(1);
      p.rect(this.screenRect.x, this.screenRect.y, this.screenRect.w, this.screenRect.h);
      for (let x = Math.ceil(this.bounds.minX); x <= this.bounds.maxX; x += 1) {
        const a = this.toScreen({ x, y: this.bounds.minY });
        const b = this.toScreen({ x, y: this.bounds.maxY });
        p.line(a.x, a.y, b.x, b.y);
      }
      for (let y = Math.ceil(this.bounds.minY); y <= this.bounds.maxY; y += 1) {
        const a = this.toScreen({ x: this.bounds.minX, y });
        const b = this.toScreen({ x: this.bounds.maxX, y });
        p.line(a.x, a.y, b.x, b.y);
      }
      p.pop();
    }

    drawPoints(points, color, size = 4, alpha = 180) {
      const p = this.p;
      p.push();
      p.noStroke();
      p.fill(color[0], color[1], color[2], alpha);
      for (const point of points) {
        const s = this.toScreen(point);
        p.circle(s.x, s.y, size);
      }
      p.pop();
    }

    drawLine(line, color, weight = 2) {
      const p = this.p;
      const yAt = x => Math.abs(line.b) > 1e-9 ? -(line.a * x + line.c) / line.b : this.bounds.minY;
      const x0 = this.bounds.minX;
      const x1 = this.bounds.maxX;
      const a = Math.abs(line.b) > 1e-9
        ? this.toScreen({ x: x0, y: yAt(x0) })
        : this.toScreen({ x: -line.c / line.a, y: this.bounds.minY });
      const b = Math.abs(line.b) > 1e-9
        ? this.toScreen({ x: x1, y: yAt(x1) })
        : this.toScreen({ x: -line.c / line.a, y: this.bounds.maxY });
      p.push();
      p.stroke(color[0], color[1], color[2], color[3] ?? 255);
      p.strokeWeight(weight);
      p.line(a.x, a.y, b.x, b.y);
      p.pop();
    }

    drawWorldSegment(a, b, color, weight = 1) {
      const p = this.p;
      const sa = this.toScreen(a);
      const sb = this.toScreen(b);
      p.push();
      p.stroke(color[0], color[1], color[2], color[3] ?? 255);
      p.strokeWeight(weight);
      p.line(sa.x, sa.y, sb.x, sb.y);
      p.pop();
    }

    drawPose(pose, color, label) {
      const p = this.p;
      const s = this.toScreen(pose);
      const len = 0.55 * this.scale;
      const tip = {
        x: s.x + Math.cos(pose.yaw) * len,
        y: s.y - Math.sin(pose.yaw) * len,
      };
      p.push();
      p.noStroke();
      p.fill(color[0], color[1], color[2]);
      p.circle(s.x, s.y, 11);
      p.stroke(color[0], color[1], color[2]);
      p.strokeWeight(3);
      p.line(s.x, s.y, tip.x, tip.y);
      p.noStroke();
      p.textSize(12);
      p.fill(230);
      p.text(label, s.x + 9, s.y - 9);
      p.pop();
    }
  }

  function computeBounds(points, pad = 1.0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function drawPanel(p, x, y, w, h, title) {
    p.push();
    p.fill(14, 18, 28, 235);
    p.stroke(47, 58, 82);
    p.rect(x, y, w, h, 8);
    p.noStroke();
    p.fill(230);
    p.textSize(14);
    p.textStyle(p.BOLD);
    p.text(title, x + 14, y + 22);
    p.textStyle(p.NORMAL);
    p.pop();
  }

  function drawTextBlock(p, lines, x, y, lineHeight = 17) {
    p.push();
    p.noStroke();
    p.fill(210, 220, 235);
    p.textSize(12);
    for (let i = 0; i < lines.length; i += 1) {
      p.text(lines[i], x, y + i * lineHeight);
    }
    p.pop();
  }

  function drawLegend(p, items, x, y) {
    p.push();
    p.textSize(12);
    items.forEach((item, index) => {
      const yy = y + index * 18;
      p.noStroke();
      p.fill(item.color[0], item.color[1], item.color[2], item.color[3] ?? 255);
      p.circle(x + 6, yy - 4, 8);
      p.fill(215);
      p.text(item.label, x + 18, yy);
    });
    p.pop();
  }

  global.VisionPipelineRenderer = {
    WorldRenderer,
    computeBounds,
    drawLegend,
    drawPanel,
    drawTextBlock,
  };
}(globalThis));

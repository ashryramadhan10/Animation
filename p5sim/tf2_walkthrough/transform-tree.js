(function exposeTransformTree(root) {
  "use strict";

  const math2d = typeof module !== "undefined" && module.exports
    ? require("./transform2d.js")
    : root;
  const { Transform2D } = math2d;

  class TFError extends Error {
    constructor(code, message, details = {}) {
      super(message);
      this.name = "TFError";
      this.code = code;
      this.details = details;
    }
  }

  class TransformTree {
    constructor({ maxSamples = 120 } = {}) {
      if (!Number.isInteger(maxSamples) || maxSamples < 1) {
        throw new TypeError("maxSamples must be a positive integer");
      }
      this.edgesByChild = new Map();
      this.frames = new Set();
      this.maxSamples = maxSamples;
    }

    validateFrame(frame) {
      if (typeof frame !== "string" || !frame.trim() || /\s/.test(frame)) {
        throw new TFError("INVALID_FRAME", "Frame names must be non-empty strings without spaces", { frame });
      }
    }

    requireFrame(frame) {
      this.validateFrame(frame);
      if (!this.frames.has(frame)) {
        throw new TFError("UNKNOWN_FRAME", `Frame '${frame}' is not in the tree`, { frame });
      }
    }

    setTransform({
      parent,
      child,
      transform,
      time = 0,
      authority = "unknown",
      isStatic = false,
    }) {
      this.validateFrame(parent);
      this.validateFrame(child);
      if (!(transform instanceof Transform2D)) {
        throw new TFError("INVALID_TRANSFORM", "Transform must be a Transform2D", { parent, child });
      }
      if (!Number.isFinite(time)) {
        throw new TFError("INVALID_TIME", "Transform time must be finite", { parent, child, time });
      }
      if (parent === child) {
        throw new TFError("CYCLE", "A frame cannot parent itself", { parent, child });
      }

      const existing = this.edgesByChild.get(child);
      if (existing && existing.parent !== parent) {
        throw new TFError(
          "DUPLICATE_PARENT",
          `Frame '${child}' already has parent '${existing.parent}'`,
          { parent, child, existingParent: existing.parent }
        );
      }

      for (let cursor = parent; cursor; cursor = this.edgesByChild.get(cursor)?.parent) {
        if (cursor === child) {
          throw new TFError("CYCLE", `Adding ${parent} -> ${child} creates a cycle`, { parent, child });
        }
      }

      const edge = existing || {
        parent,
        child,
        authority,
        isStatic: Boolean(isStatic),
        samples: [],
      };
      edge.authority = authority || "unknown";
      edge.isStatic = Boolean(isStatic);
      edge.samples = edge.isStatic
        ? [{ time: 0, transform }]
        : this.insertSample(edge.samples, { time, transform });
      this.edgesByChild.set(child, edge);
      this.frames.add(parent);
      this.frames.add(child);
      return edge;
    }

    insertSample(samples, sample) {
      const next = samples.filter((item) => item.time !== sample.time);
      next.push(sample);
      next.sort((a, b) => a.time - b.time);
      return next.slice(-this.maxSamples);
    }

    chainToRoot(frame) {
      this.requireFrame(frame);
      const frames = [frame];
      const edges = [];
      let cursor = frame;
      while (this.edgesByChild.has(cursor)) {
        const edge = this.edgesByChild.get(cursor);
        edges.push(edge);
        cursor = edge.parent;
        frames.push(cursor);
      }
      return { root: cursor, frames, edges };
    }

    latestCommonTime(edges) {
      const dynamicEdges = edges.filter((edge) => !edge.isStatic);
      if (!dynamicEdges.length) return 0;
      return Math.min(...dynamicEdges.map((edge) => edge.samples[edge.samples.length - 1].time));
    }

    sampleEdge(edge, time) {
      if (edge.isStatic) return edge.samples[0].transform;
      const exact = edge.samples.find((sample) => sample.time === time);
      if (exact) return exact.transform;
      throw new TFError("MISSING_SAMPLE", `No sample for ${edge.parent} -> ${edge.child} at ${time}`, {
        parent: edge.parent,
        child: edge.child,
        requested: time,
      });
    }

    rootFromFrame(frame, time) {
      let rootFromCurrent = Transform2D.identity();
      let cursor = frame;
      while (this.edgesByChild.has(cursor)) {
        const edge = this.edgesByChild.get(cursor);
        const parentFromChild = this.sampleEdge(edge, time);
        rootFromCurrent = parentFromChild.compose(rootFromCurrent);
        cursor = edge.parent;
      }
      return rootFromCurrent;
    }

    pathBetween(source, target) {
      const sourceChain = this.chainToRoot(source);
      const targetChain = this.chainToRoot(target);
      const targetFrames = new Set(targetChain.frames);
      const common = sourceChain.frames.find((frame) => targetFrames.has(frame));
      if (!common) {
        throw new TFError("DISCONNECTED", `${source} and ${target} are disconnected`, { source, target });
      }

      const path = [];
      let cursor = source;
      while (cursor !== common) {
        const edge = this.edgesByChild.get(cursor);
        path.push({
          parent: edge.parent,
          child: edge.child,
          from: edge.child,
          to: edge.parent,
          inverted: false,
          authority: edge.authority,
          isStatic: edge.isStatic,
        });
        cursor = edge.parent;
      }

      const downward = [];
      cursor = target;
      while (cursor !== common) {
        const edge = this.edgesByChild.get(cursor);
        downward.push(edge);
        cursor = edge.parent;
      }
      downward.reverse().forEach((edge) => {
        path.push({
          parent: edge.parent,
          child: edge.child,
          from: edge.parent,
          to: edge.child,
          inverted: true,
          authority: edge.authority,
          isStatic: edge.isStatic,
        });
      });
      return path;
    }

    lookup(target, source, time = null) {
      this.requireFrame(target);
      this.requireFrame(source);
      if (target === source) {
        return { transform: Transform2D.identity(), path: [], time: time ?? 0 };
      }

      const sourceChain = this.chainToRoot(source);
      const targetChain = this.chainToRoot(target);
      if (sourceChain.root !== targetChain.root) {
        throw new TFError("DISCONNECTED", `${source} and ${target} are disconnected`, {
          source,
          target,
          sourceRoot: sourceChain.root,
          targetRoot: targetChain.root,
        });
      }

      const lookupTime = time === null
        ? this.latestCommonTime([...sourceChain.edges, ...targetChain.edges])
        : time;
      const rootFromSource = this.rootFromFrame(source, lookupTime);
      const rootFromTarget = this.rootFromFrame(target, lookupTime);
      return {
        transform: rootFromTarget.inverse().compose(rootFromSource),
        path: this.pathBetween(source, target),
        time: lookupTime,
        source,
        target,
      };
    }

    snapshot(time = null) {
      const edges = [...this.edgesByChild.values()];
      const sampleTime = time === null ? this.latestCommonTime(edges) : time;
      return {
        frames: [...this.frames].sort(),
        roots: [...this.frames].filter((frame) => !this.edgesByChild.has(frame)).sort(),
        edges: edges.map((edge) => ({
          parent: edge.parent,
          child: edge.child,
          authority: edge.authority,
          isStatic: edge.isStatic,
          transform: this.sampleEdge(edge, edge.isStatic ? 0 : sampleTime),
          earliest: edge.samples[0].time,
          latest: edge.samples[edge.samples.length - 1].time,
        })),
        time: sampleTime,
      };
    }
  }

  const api = { TFError, TransformTree };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);

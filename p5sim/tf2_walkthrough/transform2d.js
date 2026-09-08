(function exposeTransform2D(root) {
  "use strict";

  const TAU = Math.PI * 2;

  function normalizeAngle(angle) {
    if (!Number.isFinite(angle)) throw new TypeError("Angle must be finite");
    let result = (angle + Math.PI) % TAU;
    if (result < 0) result += TAU;
    return result - Math.PI;
  }

  function validatePoint(point, label) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new TypeError(`${label} must contain finite x and y values`);
    }
  }

  class Transform2D {
    constructor(x = 0, y = 0, yaw = 0) {
      if (![x, y, yaw].every(Number.isFinite)) {
        throw new TypeError("Transform values must be finite");
      }
      this.x = x;
      this.y = y;
      this.yaw = normalizeAngle(yaw);
      Object.freeze(this);
    }

    static identity() {
      return new Transform2D();
    }

    static interpolate(from, to, amount) {
      if (!(from instanceof Transform2D) || !(to instanceof Transform2D)) {
        throw new TypeError("Interpolation requires two Transform2D values");
      }
      if (!Number.isFinite(amount)) throw new TypeError("Interpolation amount must be finite");
      const t = Math.max(0, Math.min(1, amount));
      const deltaYaw = normalizeAngle(to.yaw - from.yaw);
      return new Transform2D(
        from.x + (to.x - from.x) * t,
        from.y + (to.y - from.y) * t,
        from.yaw + deltaYaw * t
      );
    }

    compose(other) {
      if (!(other instanceof Transform2D)) {
        throw new TypeError("compose() requires a Transform2D");
      }
      const cosine = Math.cos(this.yaw);
      const sine = Math.sin(this.yaw);
      return new Transform2D(
        this.x + cosine * other.x - sine * other.y,
        this.y + sine * other.x + cosine * other.y,
        this.yaw + other.yaw
      );
    }

    inverse() {
      const cosine = Math.cos(this.yaw);
      const sine = Math.sin(this.yaw);
      return new Transform2D(
        -cosine * this.x - sine * this.y,
        sine * this.x - cosine * this.y,
        -this.yaw
      );
    }

    applyPoint(point) {
      validatePoint(point, "Point");
      const cosine = Math.cos(this.yaw);
      const sine = Math.sin(this.yaw);
      return {
        x: this.x + cosine * point.x - sine * point.y,
        y: this.y + sine * point.x + cosine * point.y,
      };
    }

    applyVector(vector) {
      validatePoint(vector, "Vector");
      const cosine = Math.cos(this.yaw);
      const sine = Math.sin(this.yaw);
      return {
        x: cosine * vector.x - sine * vector.y,
        y: sine * vector.x + cosine * vector.y,
      };
    }

    applyPose(pose) {
      validatePoint(pose, "Pose");
      if (!Number.isFinite(pose.yaw)) throw new TypeError("Pose yaw must be finite");
      const point = this.applyPoint(pose);
      return {
        x: point.x,
        y: point.y,
        yaw: normalizeAngle(this.yaw + pose.yaw),
      };
    }
  }

  const api = { Transform2D, normalizeAngle };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);

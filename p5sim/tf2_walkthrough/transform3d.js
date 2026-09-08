(function exposeTransform3D(root) {
  "use strict";

  function finiteVector(vector, label) {
    if (
      !vector
      || !Number.isFinite(vector.x)
      || !Number.isFinite(vector.y)
      || !Number.isFinite(vector.z)
    ) {
      throw new TypeError(`${label} must contain finite x, y, and z values`);
    }
  }

  class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      if (![x, y, z, w].every(Number.isFinite)) {
        throw new TypeError("Quaternion values must be finite");
      }
      const magnitude = Math.hypot(x, y, z, w);
      if (magnitude <= Number.EPSILON) {
        throw new TypeError("Quaternion magnitude must be greater than zero");
      }
      this.x = x / magnitude;
      this.y = y / magnitude;
      this.z = z / magnitude;
      this.w = w / magnitude;
      Object.freeze(this);
    }

    static identity() {
      return new Quaternion();
    }

    static fromAxisAngle(axis, angle) {
      finiteVector(axis, "Axis");
      if (!Number.isFinite(angle)) throw new TypeError("Axis angle must be finite");
      const axisMagnitude = Math.hypot(axis.x, axis.y, axis.z);
      if (axisMagnitude <= Number.EPSILON) {
        throw new TypeError("Rotation axis magnitude must be greater than zero");
      }
      const halfAngle = angle / 2;
      const scale = Math.sin(halfAngle) / axisMagnitude;
      return new Quaternion(
        axis.x * scale,
        axis.y * scale,
        axis.z * scale,
        Math.cos(halfAngle)
      );
    }

    static fromEuler(roll, pitch, yaw) {
      if (![roll, pitch, yaw].every(Number.isFinite)) {
        throw new TypeError("Euler angles must be finite");
      }
      const qx = Quaternion.fromAxisAngle({ x: 1, y: 0, z: 0 }, roll);
      const qy = Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, pitch);
      const qz = Quaternion.fromAxisAngle({ x: 0, y: 0, z: 1 }, yaw);
      return qz.multiply(qy).multiply(qx);
    }

    normalize() {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }

    multiply(other) {
      if (!(other instanceof Quaternion)) {
        throw new TypeError("multiply() requires a Quaternion");
      }
      return new Quaternion(
        this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
        this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
        this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
        this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z
      );
    }

    inverse() {
      return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }

    rotateVector(vector) {
      finiteVector(vector, "Vector");
      const qVector = { x: this.x, y: this.y, z: this.z };
      const twiceCross = {
        x: 2 * (qVector.y * vector.z - qVector.z * vector.y),
        y: 2 * (qVector.z * vector.x - qVector.x * vector.z),
        z: 2 * (qVector.x * vector.y - qVector.y * vector.x),
      };
      const crossAgain = {
        x: qVector.y * twiceCross.z - qVector.z * twiceCross.y,
        y: qVector.z * twiceCross.x - qVector.x * twiceCross.z,
        z: qVector.x * twiceCross.y - qVector.y * twiceCross.x,
      };
      return {
        x: vector.x + this.w * twiceCross.x + crossAgain.x,
        y: vector.y + this.w * twiceCross.y + crossAgain.y,
        z: vector.z + this.w * twiceCross.z + crossAgain.z,
      };
    }
  }

  class Transform3D {
    constructor(
      translation = { x: 0, y: 0, z: 0 },
      rotation = Quaternion.identity()
    ) {
      finiteVector(translation, "Translation");
      if (!(rotation instanceof Quaternion)) {
        throw new TypeError("Rotation must be a Quaternion");
      }
      this.translation = Object.freeze({
        x: translation.x,
        y: translation.y,
        z: translation.z,
      });
      this.rotation = rotation.normalize();
      Object.freeze(this);
    }

    static identity() {
      return new Transform3D();
    }

    compose(other) {
      if (!(other instanceof Transform3D)) {
        throw new TypeError("compose() requires a Transform3D");
      }
      const shifted = this.rotation.rotateVector(other.translation);
      return new Transform3D(
        {
          x: this.translation.x + shifted.x,
          y: this.translation.y + shifted.y,
          z: this.translation.z + shifted.z,
        },
        this.rotation.multiply(other.rotation)
      );
    }

    inverse() {
      const inverseRotation = this.rotation.inverse();
      const translation = inverseRotation.rotateVector({
        x: -this.translation.x,
        y: -this.translation.y,
        z: -this.translation.z,
      });
      return new Transform3D(translation, inverseRotation);
    }

    applyPoint(point) {
      finiteVector(point, "Point");
      const rotated = this.rotation.rotateVector(point);
      return {
        x: rotated.x + this.translation.x,
        y: rotated.y + this.translation.y,
        z: rotated.z + this.translation.z,
      };
    }
  }

  const api = { Quaternion, Transform3D };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);

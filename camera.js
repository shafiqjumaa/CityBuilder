import * as THREE from "three";

/**
 * CameraRig
 * A city-builder style camera: orbits around a floating "target" point on the
 * ground, supports mouse-drag pan, right/middle-drag rotate, wheel zoom and
 * WASD/arrow-key panning. The target is clamped to the buildable map bounds
 * so the player can never lose the city.
 */
export class CameraRig {
  constructor(renderer, mapBounds) {
    this.renderer = renderer;
    this.domElement = renderer.domElement;
    this.mapBounds = mapBounds; // { minX, maxX, minZ, maxZ }

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      2000
    );

    // Spherical orbit state around `target`
    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = {
      radius: 90,
      minRadius: 20,
      maxRadius: 220,
      // isometric-ish starting angles
      theta: Math.PI * 0.25, // horizontal
      phi: Math.PI * 0.32, // vertical (from +Y)
      minPhi: 0.12,
      maxPhi: Math.PI * 0.47,
    };

    this.keys = { w: false, a: false, s: false, d: false };
    this.panSpeed = 60; // units / second at radius=90
    this.dragState = null;

    this._bindEvents();
    this._updateCameraPosition();
  }

  _bindEvents() {
    const el = this.domElement;

    el.addEventListener("contextmenu", (e) => e.preventDefault());

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      this.dragState = {
        button: e.button,
        lastX: e.clientX,
        lastY: e.clientY,
      };
    });

    window.addEventListener("pointerup", () => {
      this.dragState = null;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.dragState) return;
      const dx = e.clientX - this.dragState.lastX;
      const dy = e.clientY - this.dragState.lastY;
      this.dragState.lastX = e.clientX;
      this.dragState.lastY = e.clientY;

      // Left-drag OR middle-drag = pan; Right-drag = rotate
      if (this.dragState.button === 2) {
        this._rotate(dx, dy);
      } else {
        this._panByScreenDelta(dx, dy);
      }
    });

    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const dir = Math.sign(e.deltaY);
        const s = this.spherical;
        s.radius = THREE.MathUtils.clamp(
          s.radius + dir * s.radius * 0.12,
          s.minRadius,
          s.maxRadius
        );
      },
      { passive: false }
    );

    window.addEventListener("keydown", (e) => this._setKey(e.code, true));
    window.addEventListener("keyup", (e) => this._setKey(e.code, false));

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _setKey(code, pressed) {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.keys.w = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        this.keys.s = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.keys.a = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        this.keys.d = pressed;
        break;
    }
  }

  _rotate(dx, dy) {
    const s = this.spherical;
    s.theta -= dx * 0.005;
    s.phi = THREE.MathUtils.clamp(s.phi - dy * 0.004, s.minPhi, s.maxPhi);
  }

  _panByScreenDelta(dx, dy) {
    // Move target along camera-relative right/forward vectors projected onto the ground plane
    const s = this.spherical;
    const panScale = (s.radius / 90) * 0.12;

    const forward = new THREE.Vector3(
      Math.sin(s.theta),
      0,
      Math.cos(s.theta)
    );
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    this.target.addScaledVector(right, -dx * panScale);
    this.target.addScaledVector(forward, dy * panScale);
    this._clampTarget();
  }

  _clampTarget() {
    const b = this.mapBounds;
    this.target.x = THREE.MathUtils.clamp(this.target.x, b.minX, b.maxX);
    this.target.z = THREE.MathUtils.clamp(this.target.z, b.minZ, b.maxZ);
  }

  update(dt) {
    // WASD keyboard panning
    const s = this.spherical;
    const speed = this.panSpeed * (s.radius / 90) * dt;
    if (this.keys.w || this.keys.a || this.keys.s || this.keys.d) {
      const forward = new THREE.Vector3(
        Math.sin(s.theta),
        0,
        Math.cos(s.theta)
      );
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      if (this.keys.w) this.target.addScaledVector(forward, -speed);
      if (this.keys.s) this.target.addScaledVector(forward, speed);
      if (this.keys.a) this.target.addScaledVector(right, -speed);
      if (this.keys.d) this.target.addScaledVector(right, speed);
      this._clampTarget();
    }

    this._updateCameraPosition();
  }

  _updateCameraPosition() {
    const s = this.spherical;
    const sinPhi = Math.sin(s.phi);
    const x = this.target.x + s.radius * sinPhi * Math.sin(s.theta);
    const y = this.target.y + s.radius * Math.cos(s.phi);
    const z = this.target.z + s.radius * sinPhi * Math.cos(s.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

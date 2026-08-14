import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement, bounds) {
    this.camera = camera;
    this.dom = domElement;
    this.bounds = bounds;

    this.target = new THREE.Vector3(0, 0, 0);
    this.distance = 72;
    this.azimuth = Math.PI / 4;
    this.elevation = THREE.MathUtils.degToRad(48);

    this.keys = new Set();
    this.dragging = false;
    this.panDragging = false;
    this.lastPointer = new THREE.Vector2();

    this._bind();
    this._apply();
  }

  _bind() {
    this.dom.addEventListener('contextmenu', e => e.preventDefault());

    this.dom.addEventListener('pointerdown', e => {
      this.lastPointer.set(e.clientX, e.clientY);
      if (e.button === 2) this.panDragging = true;
      else if (e.button === 0) this.dragging = true;
      this.dom.setPointerCapture?.(e.pointerId);
    });

    this.dom.addEventListener('pointermove', e => {
      if (!this.dragging && !this.panDragging) return;

      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer.set(e.clientX, e.clientY);

      if (this.dragging) {
        this.azimuth -= dx * 0.006;
        this.elevation = THREE.MathUtils.clamp(
          this.elevation + dy * 0.006,
          THREE.MathUtils.degToRad(20),
          THREE.MathUtils.degToRad(78)
        );
      } else {
        const panSpeed = this.distance * 0.0015;
        const forward = new THREE.Vector3(
          Math.sin(this.azimuth), 0, Math.cos(this.azimuth)
        ).normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(forward, dy * panSpeed);
      }

      this._clampTarget();
      this._apply();
    });

    const stop = e => {
      this.dragging = false;
      this.panDragging = false;
      this.dom.releasePointerCapture?.(e.pointerId);
    };
    this.dom.addEventListener('pointerup', stop);
    this.dom.addEventListener('pointercancel', stop);

    this.dom.addEventListener('wheel', e => {
      e.preventDefault();
      this.distance *= Math.exp(e.deltaY * 0.001);
      this.distance = THREE.MathUtils.clamp(this.distance, 18, 150);
      this._apply();
    }, { passive: false });

    addEventListener('keydown', e => {
      this.keys.add(e.key.toLowerCase());
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
  }

  update(delta) {
    if (!this.keys.size) return;

    const speed = this.distance * 0.8 * delta;
    const forward = new THREE.Vector3(Math.sin(this.azimuth), 0, Math.cos(this.azimuth)).normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    if (this.keys.has('w') || this.keys.has('arrowup')) this.target.addScaledVector(forward, -speed);
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.target.addScaledVector(forward, speed);
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.target.addScaledVector(right, -speed);
    if (this.keys.has('d') || this.keys.has('arrowright')) this.target.addScaledVector(right, speed);

    this._clampTarget();
    this._apply();
  }

  _clampTarget() {
    this.target.x = THREE.MathUtils.clamp(this.target.x, this.bounds.minX + 10, this.bounds.maxX - 10);
    this.target.z = THREE.MathUtils.clamp(this.target.z, this.bounds.minZ + 10, this.bounds.maxZ - 10);
  }

  _apply() {
    const horizontal = this.distance * Math.cos(this.elevation);
    const y = this.distance * Math.sin(this.elevation);

    this.camera.position.set(
      this.target.x + horizontal * Math.sin(this.azimuth),
      this.target.y + y,
      this.target.z + horizontal * Math.cos(this.azimuth)
    );
    this.camera.lookAt(this.target);
  }
}

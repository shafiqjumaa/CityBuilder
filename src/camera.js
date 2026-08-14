import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MAP_SIZE, CELL_SIZE } from './config.js';

const HALF_MAP = (MAP_SIZE * CELL_SIZE) / 2;

/**
 * Wraps THREE OrbitControls (target-based orbit/zoom) and adds:
 *  - WASD / arrow key panning
 *  - clamped target so the camera can't leave the map bounds
 *  - an isometric-ish starting angle
 */
export class CameraController {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.domElement = game.renderer.domElement;

    this.camera.position.set(90, 95, 90);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47; // stop just short of the horizon
    this.controls.minPolarAngle = Math.PI * 0.12; // stop near top-down
    this.controls.minDistance = 18;
    this.controls.maxDistance = 260;
    this.controls.panSpeed = 0.8;
    this.controls.zoomSpeed = 0.9;
    this.controls.screenSpacePanning = false;
    this.controls.update();

    this.keys = { w: false, a: false, s: false, d: false };
    this.panSpeed = 60; // world units / second at zoom level 1

    this._bindKeys();
  }

  _bindKeys() {
    const map = { w: 'w', arrowup: 'w', a: 'a', arrowleft: 'a', s: 's', arrowdown: 's', d: 'd', arrowright: 'd' };
    window.addEventListener('keydown', (e) => {
      const k = map[e.key.toLowerCase()];
      if (k) this.keys[k] = true;
    });
    window.addEventListener('keyup', (e) => {
      const k = map[e.key.toLowerCase()];
      if (k) this.keys[k] = false;
    });
  }

  update(delta) {
    // WASD panning relative to camera facing direction (flattened to XZ plane)
    if (this.keys.w || this.keys.a || this.keys.s || this.keys.d) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

      // scale pan speed by current zoom distance so it feels consistent
      const dist = this.camera.position.distanceTo(this.controls.target);
      const speed = this.panSpeed * (dist / 90) * delta;

      const move = new THREE.Vector3();
      if (this.keys.w) move.add(forward);
      if (this.keys.s) move.sub(forward);
      if (this.keys.d) move.add(right);
      if (this.keys.a) move.sub(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        this.controls.target.add(move);
        this.camera.position.add(move);
      }
    }

    // Clamp target inside the map bounds so the player can't orbit away forever
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -HALF_MAP, HALF_MAP);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -HALF_MAP, HALF_MAP);
    this.controls.target.y = 0;

    this.controls.update();
  }
}

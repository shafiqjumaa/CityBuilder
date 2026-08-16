import * as THREE from 'three';
import { CELL_SIZE } from './config.js';

const DIRS = [
  { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
];

const CAR_COLORS = [0xd64545, 0x3a6fd6, 0xdfd83a, 0x3ac462, 0xe0e0e0, 0x2b2b2b, 0xe08a2b];

/**
 * TrafficManager — Phase 6 (simplified for this pass).
 *
 * Vehicles travel along the road-cell graph maintained by RoadManager.
 * Movement uses a lightweight random-walk (pick any connected road cell
 * that isn't an immediate U-turn) rather than full A*/origin-destination
 * routing — visually convincing traffic without needing real
 * home/work assignment yet. Vehicle count auto-scales with the number
 * of built buildings via onBuildingsChanged(), called by BuildingManager
 * whenever the city grows.
 */
export class TrafficManager {
  constructor(game) {
    this.game = game;
    this.map = game.mapManager;

    this.group = new THREE.Group();
    this.group.name = 'traffic';
    game.scene.add(this.group);

    this.vehicles = [];
    this.vehicleCount = 0;
    this.maxVehicles = 60;

    this._bodyGeo = new THREE.BoxGeometry(1.5, 0.55, 0.85);
    this._cabinGeo = new THREE.BoxGeometry(0.8, 0.4, 0.78);
  }

  // -------------------------------------------------------- population
  onBuildingsChanged() {
    const bm = this.game.buildingManager;
    if (!bm) return;
    const totalBuildings = bm.buildings.size;
    const desired = Math.min(this.maxVehicles, Math.floor(totalBuildings * 1.4));
    this._resizeFleet(desired);
  }

  _resizeFleet(desired) {
    while (this.vehicles.length < desired) {
      const v = this._spawnVehicle();
      if (!v) break; // no roads yet
      this.vehicles.push(v);
    }
    while (this.vehicles.length > desired) {
      const v = this.vehicles.pop();
      this.group.remove(v.mesh);
    }
    this.vehicleCount = this.vehicles.length;
  }

  _spawnVehicle() {
    const roadManager = this.game.roadManager;
    if (!roadManager || roadManager.roadCells.size === 0) return null;

    const keys = Array.from(roadManager.roadCells.keys());
    const startKey = keys[Math.floor(Math.random() * keys.length)];
    const [gx, gz] = startKey.split(',').map(Number);
    const next = this._pickNextCell({ gx, gz }, null);
    if (!next) return null;

    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.3, metalness: 0.1 });

    const mesh = new THREE.Group();
    const body = new THREE.Mesh(this._bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    const cabin = new THREE.Mesh(this._cabinGeo, cabinMat);
    cabin.position.y = 0.58;
    mesh.add(body, cabin);
    this.group.add(mesh);

    return {
      mesh,
      cur: { gx, gz },
      next,
      prev: null,
      t: 0,
      speed: 3.5 + Math.random() * 2.5, // world units / second
      laneOffset: (Math.random() < 0.5 ? -1 : 1) * CELL_SIZE * 0.18,
    };
  }

  _pickNextCell(cell, prev) {
    const roadManager = this.game.roadManager;
    const options = DIRS
      .map((d) => ({ gx: cell.gx + d.dx, gz: cell.gz + d.dz }))
      .filter((c) => roadManager.hasRoadAt(c.gx, c.gz));

    if (options.length === 0) return null;
    const nonReverse = prev ? options.filter((c) => !(c.gx === prev.gx && c.gz === prev.gz)) : options;
    const pool = nonReverse.length > 0 ? nonReverse : options;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ------------------------------------------------------------- update
  update(delta) {
    if (this.vehicles.length === 0) return;

    for (const v of this.vehicles) {
      v.t += (v.speed * delta) / CELL_SIZE;
      if (v.t >= 1) {
        v.t = 0;
        v.prev = v.cur;
        v.cur = v.next;
        const next = this._pickNextCell(v.cur, v.prev);
        if (!next) {
          // dead end: bounce back
          v.next = v.prev;
          v.prev = v.cur;
        } else {
          v.next = next;
        }
      }

      const from = this.map.cellToWorld(v.cur.gx, v.cur.gz);
      const to = this.map.cellToWorld(v.next.gx, v.next.gz);
      const x = THREE.MathUtils.lerp(from.x, to.x, v.t);
      const z = THREE.MathUtils.lerp(from.z, to.z, v.t);

      const dirX = to.x - from.x;
      const dirZ = to.z - from.z;
      const angle = Math.atan2(dirX, dirZ);
      // small perpendicular lane offset so opposing traffic doesn't overlap
      const offX = Math.cos(angle) * v.laneOffset;
      const offZ = -Math.sin(angle) * v.laneOffset;

      v.mesh.position.set(x + offX, 0.12, z + offZ);
      v.mesh.rotation.y = angle;
    }
  }
}

import * as THREE from 'three';
import { CELL_SIZE } from './config.js';

const DIRS = [
  { dx: 1, dz: 0 }, { dx: -1, dz: 0 }, { dx: 0, dz: 1 }, { dx: 0, dz: -1 },
];

const SHIRT_COLORS = [0xd64545, 0x3a6fd6, 0xdfd83a, 0x3ac462, 0xe0a72b, 0x8a4fd6, 0xe0e0e0];
const SKIN_TONES = [0xe0b088, 0xc98a5f, 0x8a5a3c, 0xf0cfa8];

/**
 * CitizenManager.
 *
 * Full population simulation (home/workplace/income/happiness/health/
 * education/age per citizen) is a later phase — see monthlyTick(). For
 * now this class also owns the visual pedestrian NPCs: small low-poly
 * figures that wander the road network on foot (offset to the "sidewalk"
 * edge of each road cell), purely for atmosphere. Their count scales
 * with the city's population via onBuildingsChanged().
 */
export class CitizenManager {
  constructor(game) {
    this.game = game;
    this.map = game.mapManager;
    this.citizens = [];

    this.pedestrians = [];
    this.maxPedestrians = 40;

    this.group = new THREE.Group();
    this.group.name = 'pedestrians';
    game.scene.add(this.group);

    this._bodyGeo = new THREE.CapsuleGeometry(0.16, 0.42, 4, 8);
    this._headGeo = new THREE.SphereGeometry(0.14, 8, 8);
  }

  monthlyTick() {
    // TODO (Phase 5): re-evaluate jobs, happiness, health, education
    // for every citizen. Population itself is currently derived directly
    // from residential building capacity in BuildingManager.
  }

  // -------------------------------------------------------- pedestrians
  onBuildingsChanged() {
    const population = this.game.stats.population || 0;
    const desired = Math.min(this.maxPedestrians, Math.floor(population / 40));
    this._resizeCrowd(desired);
  }

  _resizeCrowd(desired) {
    while (this.pedestrians.length < desired) {
      const p = this._spawnPedestrian();
      if (!p) break; // no roads yet to walk beside
      this.pedestrians.push(p);
    }
    while (this.pedestrians.length > desired) {
      const p = this.pedestrians.pop();
      this.group.remove(p.mesh);
    }
  }

  _spawnPedestrian() {
    const roadManager = this.game.roadManager;
    if (!roadManager || roadManager.roadCells.size === 0) return null;

    const keys = Array.from(roadManager.roadCells.keys());
    const startKey = keys[Math.floor(Math.random() * keys.length)];
    const [gx, gz] = startKey.split(',').map(Number);
    const next = this._pickNextCell({ gx, gz }, null);
    if (!next) return null;

    const shirt = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
    const headMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });

    const mesh = new THREE.Group();
    const body = new THREE.Mesh(this._bodyGeo, bodyMat);
    body.position.y = 0.42;
    body.castShadow = true;
    const head = new THREE.Mesh(this._headGeo, headMat);
    head.position.y = 0.78;
    head.castShadow = true;
    mesh.add(body, head);
    this.group.add(mesh);

    // walk on the sidewalk edge, not down the middle of the road
    const side = Math.random() < 0.5 ? -1 : 1;

    return {
      mesh,
      cur: { gx, gz },
      next,
      prev: null,
      t: Math.random(),
      speed: 0.9 + Math.random() * 0.6,
      sideOffset: side * CELL_SIZE * 0.42,
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

  update(delta) {
    if (this.pedestrians.length === 0) return;

    for (const p of this.pedestrians) {
      p.t += (p.speed * delta) / CELL_SIZE;
      if (p.t >= 1) {
        p.t = 0;
        p.prev = p.cur;
        p.cur = p.next;
        const next = this._pickNextCell(p.cur, p.prev);
        if (!next) {
          p.next = p.prev;
          p.prev = p.cur;
        } else {
          p.next = next;
        }
      }

      const from = this.map.cellToWorld(p.cur.gx, p.cur.gz);
      const to = this.map.cellToWorld(p.next.gx, p.next.gz);
      const x = THREE.MathUtils.lerp(from.x, to.x, p.t);
      const z = THREE.MathUtils.lerp(from.z, to.z, p.t);

      const dirX = to.x - from.x;
      const dirZ = to.z - from.z;
      const angle = Math.atan2(dirX, dirZ);
      const offX = Math.cos(angle) * p.sideOffset;
      const offZ = -Math.sin(angle) * p.sideOffset;

      p.mesh.position.set(x + offX, 0, z + offZ);
      p.mesh.rotation.y = angle;
    }
  }
}

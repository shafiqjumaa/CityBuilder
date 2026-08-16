import * as THREE from 'three';
import { CELL_SIZE } from './config.js';
import { BUILDINGS } from '../data/buildings.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * BuildingManager — Phase 4.
 *
 * Each in-game day, dailyGrowthTick() scans zoned-but-undeveloped cells
 * that touch a road and tries to grow a building on them: it picks a
 * random building type valid for that zone's category, tries both
 * footprint orientations, and requires every cell in the footprint to be
 * zoned (same type), undeveloped, and for at least one footprint cell to
 * be road-adjacent. A handful of attempts happen per day so the city
 * fills in gradually rather than all at once.
 *
 * Buildings are procedurally modeled with THREE primitives (no external
 * assets) — see _buildProcedural — so every one of the 15 catalogue
 * entries (5 residential / 5 commercial / 5 industrial) gets a distinct
 * silhouette from just a handful of reusable shape "styles".
 */
export class BuildingManager {
  constructor(game) {
    this.game = game;
    this.map = game.mapManager;

    this.group = new THREE.Group();
    this.group.name = 'buildings';
    game.scene.add(this.group);

    /** @type {Map<string, object>} keyed "gx,gz" (footprint origin) -> building record */
    this.buildings = new Map();

    this.maxGrowthAttemptsPerDay = 6;
  }

  // -------------------------------------------------------------- growth
  dailyGrowthTick() {
    const zoneManager = this.game.zoneManager;
    const roadManager = this.game.roadManager;
    if (!zoneManager || !roadManager) return;

    const eligible = [];
    for (const [key, cellData] of zoneManager.cells) {
      if (cellData.developed) continue;
      const [gx, gz] = key.split(',').map(Number);
      if (!roadManager.isAdjacentToRoad(gx, gz)) continue;
      eligible.push({ gx, gz, type: cellData.type });
    }
    if (eligible.length === 0) return;

    shuffle(eligible);
    const attempts = Math.min(eligible.length, this.maxGrowthAttemptsPerDay);
    let grown = 0;
    for (let i = 0; i < attempts; i++) {
      const { gx, gz, type } = eligible[i];
      if (this._tryPlaceBuilding(gx, gz, type)) grown++;
    }
    if (grown > 0) this._updateAggregateStats();
  }

  _tryPlaceBuilding(gx, gz, zoneType) {
    const defs = shuffle(Object.values(BUILDINGS).filter((d) => d.zone === zoneType));
    for (const def of defs) {
      const orientations = shuffle([
        [def.footprint[0], def.footprint[1]],
        [def.footprint[1], def.footprint[0]],
      ]);
      for (const [w, d] of orientations) {
        if (this._footprintFits(gx, gz, w, d, zoneType)) {
          this._placeBuilding(gx, gz, w, d, def, zoneType);
          return true;
        }
      }
    }
    return false;
  }

  _footprintFits(gx, gz, w, d, zoneType) {
    let touchesRoad = false;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const cx = gx + i, cz = gz + j;
        if (!this.map.isInBounds(cx, cz)) return false;
        const zone = this.game.zoneManager.getZone(cx, cz);
        if (!zone || zone.type !== zoneType || zone.developed) return false;
        if (this.game.roadManager.isAdjacentToRoad(cx, cz)) touchesRoad = true;
      }
    }
    return touchesRoad;
  }

  _placeBuilding(gx, gz, w, d, def, zoneType) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const rec = this.game.zoneManager.getZone(gx + i, gz + j);
        if (rec) {
          rec.developed = true;
          if (rec.mesh) rec.mesh.visible = false; // hide the flat zone tile under the building
        }
      }
    }

    const mesh = this._buildProcedural(def, w, d);
    const center = this.map.footprintCenter(gx, gz, w, d);
    mesh.position.set(center.x, 0, center.z);
    mesh.userData = { gx, gz, w, d, defId: def.id };
    this.group.add(mesh);

    const key = `${gx},${gz}`;
    this.buildings.set(key, {
      id: key,
      type: def.id,
      zoneType,
      level: def.level || 1,
      capacity: def.capacity || 0,
      jobs: def.jobs || 0,
      workers: 0,
      electricity: false,
      water: false,
      happiness: 70,
      taxIncome: 0,
      maintenanceCost: 0,
      footprint: [w, d],
      gx, gz,
    });
  }

  _updateAggregateStats() {
    let population = 0;
    let jobs = 0;
    for (const b of this.buildings.values()) {
      if (b.zoneType === 'RESIDENTIAL') population += b.capacity;
      else jobs += b.jobs;
    }
    this.game.stats.population = population;
    this.jobCount = jobs;
    this.game.uiManager?.refreshTopbar();
    this.game.trafficManager?.onBuildingsChanged();
    this.game.citizenManager?.onBuildingsChanged();
  }

  getBuildingAt(gx, gz) {
    for (const b of this.buildings.values()) {
      const [w, d] = b.footprint;
      if (gx >= b.gx && gx < b.gx + w && gz >= b.gz && gz < b.gz + d) return b;
    }
    return null;
  }

  // ---------------------------------------------------------- modeling
  /** Builds a small procedural low-poly Group for a building def, sized to its footprint. */
  _buildProcedural(def, w, d) {
    const group = new THREE.Group();
    const width = w * CELL_SIZE * 0.86;
    const depth = d * CELL_SIZE * 0.86;
    const h = def.height;

    const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofMat = new THREE.MeshStandardMaterial({ color: def.roofColor ?? 0x888888, roughness: 0.8 });

    switch (def.style) {
      case 'house': {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, h * 0.55, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = h + (h * 0.55) / 2;
        roof.castShadow = true;
        group.add(roof);
        break;
      }
      case 'shop': {
        const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, 0.15, depth * 0.32), roofMat);
        awning.position.set(0, h * 0.62, depth * 0.4);
        awning.castShadow = true;
        group.add(awning);
        break;
      }
      case 'tower': {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.97, 0.35, depth * 0.97), roofMat);
        cap.position.y = h + 0.18;
        group.add(cap);
        // subtle window banding via a slightly inset, lighter mid band
        const bandMat = new THREE.MeshStandardMaterial({ color: def.roofColor ?? 0xffffff, roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.5 });
        const band = new THREE.Mesh(new THREE.BoxGeometry(width * 1.001, h * 0.06, depth * 1.001), bandMat);
        band.position.y = h * 0.6;
        group.add(band);
        break;
      }
      case 'flatcap': {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 0.3, depth * 0.95), roofMat);
        cap.position.y = h + 0.15;
        group.add(cap);
        break;
      }
      case 'factory': {
        const chimMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const count = def.chimneys || 1;
        for (let i = 0; i < count; i++) {
          const chimH = h * 0.9;
          const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, chimH, 8), chimMat);
          chim.position.set((i - (count - 1) / 2) * width * 0.3, h + chimH / 2, -depth * 0.25);
          chim.castShadow = true;
          group.add(chim);
        }
        const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 0.25, depth * 0.95), roofMat);
        cap.position.y = h + 0.12;
        group.add(cap);
        break;
      }
      case 'complex': {
        const siloMat = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.55, metalness: 0.25 });
        for (let i = 0; i < 2; i++) {
          const siloH = h * 0.85;
          const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, siloH, 10), siloMat);
          silo.position.set(width * 0.36, siloH / 2, i === 0 ? depth * 0.3 : -depth * 0.3);
          silo.castShadow = true;
          group.add(silo);
        }
        const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 0.25, depth * 0.95), roofMat);
        cap.position.y = h + 0.12;
        group.add(cap);
        break;
      }
      default:
        break;
    }

    return group;
  }
}

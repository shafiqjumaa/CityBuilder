import * as THREE from 'three';
import { CELL_SIZE } from './config.js';
import { ROAD } from '../data/buildings.js';

const HALF_CELL = CELL_SIZE / 2;

// The 4 orthogonal neighbor directions every tile checks for connections.
const DIRS = [
  { dx: 1, dz: 0 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: 0, dz: -1 },
];

/**
 * RoadManager — Phase 2 (visually upgraded).
 *
 * Each road cell is a small THREE.Group built from shared geometries:
 *  - a full-cell asphalt slab (tiles butt up against each other, no gaps)
 *  - a lane-marking stripe running from the tile center toward every
 *    neighboring road cell (so straight roads read as one continuous
 *    line, corners bend, T-junctions/crossroads fan out correctly)
 *  - a curb along any edge that does NOT face another road, so a road
 *    reads as a defined strip rather than a bare cube sitting on grass
 *
 * Whenever a tile is added or removed, that tile AND its 4 neighbors are
 * rebuilt, since a new/removed neighbor changes both the stripe pattern
 * and the curb placement.
 */
export class RoadManager {
  constructor(game) {
    this.game = game;
    this.map = game.mapManager;

    this.group = new THREE.Group();
    this.group.name = 'roads';
    game.scene.add(this.group);

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'roadPreview';
    game.scene.add(this.previewGroup);

    /** @type {Map<string, THREE.Group>} keyed "gx,gz" */
    this.roadCells = new Map();

    this.costPerSegment = ROAD.costPerSegment;
    this.startCell = null;
    this.previewCells = [];
    this.previewValid = false;
    this.previewCost = 0;
    this.previewActive = false;

    this._initGeometry();
  }

  _initGeometry() {
    // Slab covers the FULL cell (not shrunk) so neighboring tiles touch
    // seamlessly instead of leaving visible gaps between "cubes".
    this._baseGeo = new THREE.BoxGeometry(CELL_SIZE, 0.1, CELL_SIZE);
    this._baseMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.95 });

    // Stripe runs from the tile center out to one edge (half a cell).
    // Reused for all 4 directions via rotation, built along local X.
    this._stripeGeo = new THREE.BoxGeometry(HALF_CELL - 0.15, 0.03, CELL_SIZE * 0.07);
    this._stripeMat = new THREE.MeshStandardMaterial({
      color: 0xe8d98a,
      roughness: 0.6,
      emissive: 0x332b10,
      emissiveIntensity: 0.15,
    });

    // Curb runs along one full edge of the cell, built along local X.
    this._curbGeo = new THREE.BoxGeometry(CELL_SIZE, 0.22, CELL_SIZE * 0.09);
    this._curbMat = new THREE.MeshStandardMaterial({ color: 0xb7b2a6, roughness: 0.85 });

    // Preview reuses the base slab shape with a translucent overlay material.
    this._previewMatValid = new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.55 });
    this._previewMatInvalid = new THREE.MeshBasicMaterial({ color: 0xf56565, transparent: true, opacity: 0.55 });
  }

  key(gx, gz) {
    return `${gx},${gz}`;
  }

  // --------------------------------------------------------------- input
  handleClick(cell) {
    if (!this.map.isInBounds(cell.gx, cell.gz)) {
      console.warn('[Urbanova] road click out of bounds', cell);
      return;
    }

    if (this.startCell === null) {
      this.startCell = cell;
      console.log('[Urbanova] road start point set', cell);
      this.updatePreview(cell);
      return;
    }

    console.log('[Urbanova] road end point clicked, committing', { start: this.startCell, end: cell, valid: this.previewValid, cost: this.previewCost });
    this._commit();
  }

  cancelPreview() {
    this.startCell = null;
    this.previewActive = false;
    this._clearPreviewMeshes();
    this.previewCells = [];
    this.previewCost = 0;
  }

  // ------------------------------------------------------------- preview
  updatePreview(cell) {
    if (this.startCell === null) return;

    const path = this._computeStraightPath(this.startCell, cell);
    this.previewCells = path;

    let cost = 0;
    let valid = path.length > 0;
    for (const c of path) {
      if (!this.map.isInBounds(c.gx, c.gz)) { valid = false; continue; }
      const occ = this.map.occupancy[c.gx][c.gz];
      const isExistingRoad = occ && occ.type === 'road';
      if (occ && !isExistingRoad) valid = false; // blocked by water/zone/building
      if (!isExistingRoad) cost += this.costPerSegment;
    }
    if (cost > this.game.stats.money) valid = false;

    this.previewValid = valid;
    this.previewCost = cost;
    this.previewActive = true;

    this._redrawPreviewMeshes();
  }

  _redrawPreviewMeshes() {
    this._clearPreviewMeshes();
    const mat = this.previewValid ? this._previewMatValid : this._previewMatInvalid;
    for (const c of this.previewCells) {
      if (!this.map.isInBounds(c.gx, c.gz)) continue;
      const mesh = new THREE.Mesh(this._baseGeo, mat);
      const pos = this.map.cellToWorld(c.gx, c.gz);
      mesh.position.set(pos.x, 0.09, pos.z);
      this.previewGroup.add(mesh);
    }
  }

  _clearPreviewMeshes() {
    while (this.previewGroup.children.length) {
      this.previewGroup.remove(this.previewGroup.children[0]);
    }
  }

  // -------------------------------------------------------------- commit
  _commit() {
    if (!this.previewValid || this.previewCells.length === 0) {
      this.game.uiManager?.notify(
        this.previewCost > this.game.stats.money ? 'Insufficient funds.' : 'Cannot build a road there.',
        'warn'
      );
      this.startCell = null;
      this.previewActive = false;
      this._clearPreviewMeshes();
      return;
    }

    this.game.stats.money -= this.previewCost;
    for (const c of this.previewCells) {
      this._registerTile(c.gx, c.gz);
    }
    this._refreshAffectedTiles(this.previewCells);

    this.game.uiManager?.refreshTopbar();
    this.startCell = null;
    this.previewActive = false;
    this._clearPreviewMeshes();
    this.previewCells = [];
  }

  /** Creates the (initially empty) group for a new road cell and marks occupancy. */
  _registerTile(gx, gz) {
    const k = this.key(gx, gz);
    if (this.roadCells.has(k)) return; // already a road here

    const group = new THREE.Group();
    const pos = this.map.cellToWorld(gx, gz);
    group.position.set(pos.x, 0, pos.z);
    group.userData = { gx, gz };
    this.group.add(group);

    this.roadCells.set(k, group);
    this.map.setOccupancy(gx, gz, { type: 'road', ref: group });
  }

  /** Rebuilds the visual content (slab + stripes + curbs) of one tile from its current neighbors. */
  _rebuildTile(gx, gz) {
    const group = this.roadCells.get(this.key(gx, gz));
    if (!group) return;

    while (group.children.length) group.remove(group.children[0]);

    const base = new THREE.Mesh(this._baseGeo, this._baseMat);
    base.position.y = 0.05;
    base.receiveShadow = true;
    group.add(base);

    for (const { dx, dz } of DIRS) {
      const connected = this.hasRoadAt(gx + dx, gz + dz);
      if (connected) {
        const stripe = new THREE.Mesh(this._stripeGeo, this._stripeMat);
        stripe.position.set((dx * HALF_CELL) / 2, 0.11, (dz * HALF_CELL) / 2);
        if (dz !== 0) stripe.rotation.y = Math.PI / 2;
        group.add(stripe);
      } else {
        const curb = new THREE.Mesh(this._curbGeo, this._curbMat);
        const edgeOffset = HALF_CELL - 0.05;
        curb.position.set(dx * edgeOffset, 0.12, dz * edgeOffset);
        if (dx !== 0) curb.rotation.y = Math.PI / 2;
        curb.castShadow = true;
        group.add(curb);
      }
    }
  }

  /** Rebuilds a set of cells plus their neighbors (dedup'd) — call after any add/remove. */
  _refreshAffectedTiles(cells) {
    const toRefresh = new Set();
    for (const c of cells) {
      toRefresh.add(this.key(c.gx, c.gz));
      for (const { dx, dz } of DIRS) {
        toRefresh.add(this.key(c.gx + dx, c.gz + dz));
      }
    }
    for (const k of toRefresh) {
      const [gx, gz] = k.split(',').map(Number);
      if (this.hasRoadAt(gx, gz)) this._rebuildTile(gx, gz);
    }
  }

  // ------------------------------------------------------------ demolish
  demolishAt(cell) {
    const k = this.key(cell.gx, cell.gz);
    const group = this.roadCells.get(k);
    if (!group) return false;

    this.group.remove(group);
    this.roadCells.delete(k);
    this.map.setOccupancy(cell.gx, cell.gz, null);
    this._refreshAffectedTiles([cell]);
    return true;
  }

  // ------------------------------------------------------------- helpers
  hasRoadAt(gx, gz) {
    return this.roadCells.has(this.key(gx, gz));
  }

  /** True if any of the 4 orthogonal neighbors of (gx,gz) is a road tile. */
  isAdjacentToRoad(gx, gz) {
    return DIRS.some(({ dx, dz }) => this.hasRoadAt(gx + dx, gz + dz));
  }

  /** Straight-line path (dominant axis only) between two grid cells. */
  _computeStraightPath(a, b) {
    const dx = b.gx - a.gx;
    const dz = b.gz - a.gz;
    const path = [];

    if (Math.abs(dx) >= Math.abs(dz)) {
      const step = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      if (step === 0) {
        path.push({ gx: a.gx, gz: a.gz });
      } else {
        for (let x = a.gx; step > 0 ? x <= b.gx : x >= b.gx; x += step) {
          path.push({ gx: x, gz: a.gz });
        }
      }
    } else {
      const step = dz === 0 ? 0 : dz > 0 ? 1 : -1;
      for (let z = a.gz; step > 0 ? z <= b.gz : z >= b.gz; z += step) {
        path.push({ gx: a.gx, gz: z });
      }
    }
    return path;
  }
}

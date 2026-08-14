import * as THREE from 'three';
import { CELL_SIZE } from './config.js';
import { ROAD } from '../data/buildings.js';

/**
 * RoadManager — Phase 2.
 *
 * Flow:
 *  1. Player clicks a start cell (handleClick) while ROAD tool is active.
 *  2. Moving the mouse calls updatePreview(cell), which draws a live
 *     straight-line preview (green = affordable/valid, red = blocked or
 *     unaffordable) and computes the cost.
 *  3. A second click (handleClick again) commits the road: deducts money,
 *     spawns permanent tiles, and marks map occupancy so zones/buildings
 *     can later query road adjacency.
 *  4. Escape cancels an in-progress placement.
 *  5. The DEMOLISH tool calls demolishAt(cell) to remove a single tile.
 *
 * Roads are grid-aligned and straight only (per spec — curves are a
 * later-phase enhancement). A road tile occupies exactly one cell.
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

    /** @type {Map<string, THREE.Mesh>} keyed "gx,gz" */
    this.roadCells = new Map();

    this.costPerSegment = ROAD.costPerSegment;
    this.startCell = null;
    this.previewCells = [];
    this.previewValid = false;
    this.previewCost = 0;
    this.previewActive = false;

    this._tileGeo = new THREE.BoxGeometry(CELL_SIZE * 0.94, 0.16, CELL_SIZE * 0.94);
    this._roadMat = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.9 });
    this._previewMatValid = new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.55 });
    this._previewMatInvalid = new THREE.MeshBasicMaterial({ color: 0xf56565, transparent: true, opacity: 0.55 });
  }

  key(gx, gz) {
    return `${gx},${gz}`;
  }

  // --------------------------------------------------------------- input
  handleClick(cell) {
    if (!this.map.isInBounds(cell.gx, cell.gz)) return;

    if (this.startCell === null) {
      this.startCell = cell;
      this.updatePreview(cell);
      return;
    }

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
      const mesh = new THREE.Mesh(this._tileGeo, mat);
      const pos = this.map.cellToWorld(c.gx, c.gz);
      mesh.position.set(pos.x, 0.1, pos.z);
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
      this._placeTile(c.gx, c.gz);
    }

    this.game.uiManager?.refreshTopbar();
    this.startCell = null;
    this.previewActive = false;
    this._clearPreviewMeshes();
    this.previewCells = [];
  }

  _placeTile(gx, gz) {
    const k = this.key(gx, gz);
    if (this.roadCells.has(k)) return; // already a road here, nothing to add

    const mesh = new THREE.Mesh(this._tileGeo, this._roadMat);
    const pos = this.map.cellToWorld(gx, gz);
    mesh.position.set(pos.x, 0.08, pos.z);
    mesh.receiveShadow = true;
    mesh.userData = { gx, gz, kind: 'road' };
    this.group.add(mesh);

    this.roadCells.set(k, mesh);
    this.map.setOccupancy(gx, gz, { type: 'road', ref: mesh });
  }

  // ------------------------------------------------------------ demolish
  demolishAt(cell) {
    const k = this.key(cell.gx, cell.gz);
    const mesh = this.roadCells.get(k);
    if (!mesh) return false;

    this.group.remove(mesh);
    this.roadCells.delete(k);
    this.map.setOccupancy(cell.gx, cell.gz, null);
    return true;
  }

  // ------------------------------------------------------------- helpers
  hasRoadAt(gx, gz) {
    return this.roadCells.has(this.key(gx, gz));
  }

  /** True if any of the 4 orthogonal neighbors of (gx,gz) is a road tile. */
  isAdjacentToRoad(gx, gz) {
    return (
      this.hasRoadAt(gx + 1, gz) ||
      this.hasRoadAt(gx - 1, gz) ||
      this.hasRoadAt(gx, gz + 1) ||
      this.hasRoadAt(gx, gz - 1)
    );
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

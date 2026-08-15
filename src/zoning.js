import * as THREE from 'three';
import { CELL_SIZE } from './config.js';

export const ZONE_TYPES = {
  RESIDENTIAL: { id: 'RESIDENTIAL', color: '#4caf50', label: 'Residential', icon: '🏠' },
  COMMERCIAL: { id: 'COMMERCIAL', color: '#2196f3', label: 'Commercial', icon: '🏬' },
  INDUSTRIAL: { id: 'INDUSTRIAL', color: '#ffb300', label: 'Industrial', icon: '🏭' },
};

/**
 * ZoneManager — Phase 3.
 *
 * Flow: with the ZONE tool + a zone-type subtool active, the player
 * click-drags a rectangle across the grid. Mouse-move updates a live
 * preview (only cells that are actually paintable light up), and
 * mouse-up commits the paint. Each zone type gets a distinct color AND
 * a distinct hatch pattern baked into its texture, so it never relies
 * on color alone to be readable.
 *
 * Zoning itself is free — cost arrives with actual buildings in Phase 4,
 * which will read these cells to decide what/where to grow.
 */
export class ZoneManager {
  constructor(game) {
    this.game = game;
    this.map = game.mapManager;

    this.group = new THREE.Group();
    this.group.name = 'zones';
    game.scene.add(this.group);

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'zonePreview';
    game.scene.add(this.previewGroup);

    /** @type {Map<string, {type:string, mesh:THREE.Mesh, developed:boolean}>} */
    this.cells = new Map();

    this.paintStart = null;
    this.paintType = null;
    this.previewCells = []; // [{gx, gz, valid}]

    this._initMaterials();
    this._tileGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
  }

  key(gx, gz) {
    return `${gx},${gz}`;
  }

  // ------------------------------------------------------------ textures
  _initMaterials() {
    this._fillMats = {};
    this._previewMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this._previewMatInvalid = new THREE.MeshBasicMaterial({
      color: 0xf56565,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });

    for (const type of Object.keys(ZONE_TYPES)) {
      const texture = this._makeHatchTexture(type);
      this._fillMats[type] = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
    }
  }

  /** Bakes a small canvas texture: solid fill + a pattern unique per zone type. */
  _makeHatchTexture(type) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = ZONE_TYPES[type].color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;

    if (type === 'RESIDENTIAL') {
      // thin diagonal lines
      for (let i = -size; i < size * 2; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
      }
    } else if (type === 'COMMERCIAL') {
      // crosshatch grid
      for (let i = 0; i <= size; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
    } else {
      // industrial: bold dashed horizontal bars
      ctx.lineWidth = 4;
      for (let i = 6; i < size; i += 14) {
        ctx.beginPath();
        ctx.setLineDash([8, 6]);
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // --------------------------------------------------------------- input
  startPaint(cell, subTool) {
    if (!subTool || !ZONE_TYPES[subTool]) {
      this.game.uiManager?.notify('Pick a zone type first.', 'warn');
      return;
    }
    this.paintStart = cell;
    this.paintType = subTool;
    this.updatePaintPreview(cell);
  }

  updatePaintPreview(cell) {
    if (!this.paintStart) return;

    const minX = Math.min(this.paintStart.gx, cell.gx);
    const maxX = Math.max(this.paintStart.gx, cell.gx);
    const minZ = Math.min(this.paintStart.gz, cell.gz);
    const maxZ = Math.max(this.paintStart.gz, cell.gz);

    const cells = [];
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (!this.map.isInBounds(x, z)) continue;
        cells.push({ gx: x, gz: z, valid: this._canPaint(x, z) });
      }
    }
    this.previewCells = cells;
    this._redrawPreview();
  }

  commitPaint() {
    if (!this.paintStart || this.previewCells.length === 0) {
      this._resetPaint();
      return;
    }
    let painted = 0;
    for (const c of this.previewCells) {
      if (!c.valid) continue;
      this._setZone(c.gx, c.gz, this.paintType);
      painted++;
    }
    if (painted === 0) {
      this.game.uiManager?.notify('No valid cells to zone there.', 'warn');
    }
    this._resetPaint();
  }

  cancelPaint() {
    this._resetPaint();
  }

  _resetPaint() {
    this.paintStart = null;
    this.previewCells = [];
    this._clearPreviewMeshes();
  }

  _canPaint(gx, gz) {
    const occ = this.map.occupancy[gx][gz];
    return !occ || occ.type === 'zone'; // free land, or re-zoning existing zoned land
  }

  // ------------------------------------------------------------- preview
  _redrawPreview() {
    this._clearPreviewMeshes();
    for (const c of this.previewCells) {
      const mat = c.valid ? this._previewMat : this._previewMatInvalid;
      const mesh = new THREE.Mesh(this._tileGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      const pos = this.map.cellToWorld(c.gx, c.gz);
      mesh.position.set(pos.x, 0.04, pos.z);
      this.previewGroup.add(mesh);
    }
  }

  _clearPreviewMeshes() {
    while (this.previewGroup.children.length) {
      this.previewGroup.remove(this.previewGroup.children[0]);
    }
  }

  // -------------------------------------------------------------- commit
  _setZone(gx, gz, type) {
    const k = this.key(gx, gz);
    const existing = this.cells.get(k);
    if (existing) {
      this.group.remove(existing.mesh);
    }

    const mesh = new THREE.Mesh(this._tileGeo, this._fillMats[type]);
    mesh.rotation.x = -Math.PI / 2;
    const pos = this.map.cellToWorld(gx, gz);
    mesh.position.set(pos.x, 0.035, pos.z);
    this.group.add(mesh);

    this.cells.set(k, { type, mesh, developed: false });
    this.map.setOccupancy(gx, gz, { type: 'zone', zoneType: type });
  }

  // ------------------------------------------------------------ demolish
  demolishAt(cell) {
    const k = this.key(cell.gx, cell.gz);
    const record = this.cells.get(k);
    if (!record) return false;

    this.group.remove(record.mesh);
    this.cells.delete(k);
    this.map.setOccupancy(cell.gx, cell.gz, null);
    return true;
  }

  // ------------------------------------------------------------- helpers
  getZone(gx, gz) {
    return this.cells.get(this.key(gx, gz)) || null;
  }
}

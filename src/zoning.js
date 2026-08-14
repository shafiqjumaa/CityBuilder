import * as THREE from 'three';

export const ZONE_TYPES = {
  RESIDENTIAL: { id: 'RESIDENTIAL', color: 0x4caf50, label: 'Residential' },
  COMMERCIAL: { id: 'COMMERCIAL', color: 0x2196f3, label: 'Commercial' },
  INDUSTRIAL: { id: 'INDUSTRIAL', color: 0xffb300, label: 'Industrial' },
};

/**
 * ZoneManager — Phase 3.
 * Will own: painting zone cells on the grid, per-cell zone data,
 * and handing eligible cells to BuildingManager for auto-growth.
 */
export class ZoneManager {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'zones';
    game.scene.add(this.group);

    /** @type {Map<string, {type:string, developed:boolean}>} keyed "gx,gz" */
    this.cells = new Map();
  }

  // TODO (Phase 3): paintZone(gx, gz, type), clearZone(gx, gz), getZone(gx, gz)
}

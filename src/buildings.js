import * as THREE from 'three';

/**
 * BuildingManager — Phase 4.
 * Will own: instantiating building meshes on developed zone cells,
 * building data (type/level/capacity/workers/electricity/water/
 * happiness/taxIncome/maintenanceCost), and the auto-growth rules
 * described in the design brief (road access + utilities -> growth).
 */
export class BuildingManager {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'buildings';
    game.scene.add(this.group);

    /** @type {Map<string, object>} keyed "gx,gz" -> building record */
    this.buildings = new Map();
  }

  // TODO (Phase 4): placeBuilding(gx, gz, def), growZoneCell(cell), demolish(gx, gz)
}

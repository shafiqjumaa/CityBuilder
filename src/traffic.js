import * as THREE from 'three';

/**
 * TrafficManager — Phase 6.
 * Will own: vehicle instances, origin/destination assignment against
 * RoadManager's node graph, A* pathfinding along road nodes, and
 * per-frame vehicle movement.
 */
export class TrafficManager {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'traffic';
    game.scene.add(this.group);

    this.vehicles = [];
    this.vehicleCount = 0;
  }

  update(delta) {
    // TODO (Phase 6): advance each vehicle along its path.
  }
}

import * as THREE from 'three';

/**
 * RoadManager — Phase 2.
 * Will own: road segments, the road-tool click/drag/preview flow,
 * snapping to existing roads, intersections, and per-segment cost.
 *
 * Phase 1 only sets up the data structures and an empty group so the
 * rest of the engine (BuildingManager adjacency checks, TrafficManager
 * pathfinding) can already reference `game.roadManager` safely.
 */
export class RoadManager {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'roads';
    game.scene.add(this.group);

    /** @type {Array<{a:{gx:number,gz:number}, b:{gx:number,gz:number}}>} */
    this.segments = [];
    this.costPerSegment = 100;
  }

  // TODO (Phase 2): startPreview(cell), updatePreview(cell), commitRoad(a, b),
  // deleteRoad(segment), getNodeGraph() for pathfinding.
}

import * as THREE from 'three';
import { MAP_SIZE, CELL_SIZE } from './config.js';

const HALF = (MAP_SIZE * CELL_SIZE) / 2;

/**
 * Builds the static world: ground terrain, buildable grid overlay,
 * a water body along one edge, scattered low-poly trees, and a
 * boundary wall marking the edge of the playable city.
 *
 * Also tracks a simple occupancy grid (per-cell) that RoadManager /
 * ZoneManager / BuildingManager consult before placing anything, so
 * nothing overlaps.
 */
export class MapManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;

    // occupancy[gx][gz] = null | { type: 'road'|'zone'|'building'|'water', ref }
    this.occupancy = Array.from({ length: MAP_SIZE }, () => new Array(MAP_SIZE).fill(null));
    this._markWaterOccupancy();
  }

  build() {
    this._buildGround();
    this._buildGrid();
    this._buildWater();
    this._buildBoundary();
    this._scatterTrees();
  }

  // ------------------------------------------------------------- helpers
  /** Convert a grid cell (integer) to world-space center coordinates. */
  cellToWorld(gx, gz) {
    return new THREE.Vector3(
      (gx - MAP_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2,
      0,
      (gz - MAP_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2
    );
  }

  /** Convert a world position to the nearest grid cell. */
  worldToCell(worldPos) {
    const gx = Math.floor((worldPos.x + HALF) / CELL_SIZE);
    const gz = Math.floor((worldPos.z + HALF) / CELL_SIZE);
    return { gx, gz };
  }

  /** World-space center of a multi-cell footprint starting at (gx,gz), size w x d cells. */
  footprintCenter(gx, gz, w, d) {
    const corner = this.cellToWorld(gx, gz);
    return new THREE.Vector3(
      corner.x + ((w - 1) * CELL_SIZE) / 2,
      0,
      corner.z + ((d - 1) * CELL_SIZE) / 2
    );
  }

  isInBounds(gx, gz) {
    return gx >= 0 && gx < MAP_SIZE && gz >= 0 && gz < MAP_SIZE;
  }

  isFree(gx, gz) {
    if (!this.isInBounds(gx, gz)) return false;
    return this.occupancy[gx][gz] === null;
  }

  setOccupancy(gx, gz, value) {
    if (this.isInBounds(gx, gz)) this.occupancy[gx][gz] = value;
  }

  _markWaterOccupancy() {
    // Water strip along the -Z (north) edge, ~14 cells deep
    for (let gx = 0; gx < MAP_SIZE; gx++) {
      for (let gz = 0; gz < 14; gz++) {
        this.occupancy[gx][gz] = { type: 'water' };
      }
    }
  }

  // -------------------------------------------------------------- ground
  _buildGround() {
    const size = MAP_SIZE * CELL_SIZE;
    const segments = 64;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    // gentle procedural undulation so it doesn't read as a dead-flat plane
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h =
        Math.sin(x * 0.015) * 0.6 +
        Math.cos(z * 0.02) * 0.5 +
        Math.sin((x + z) * 0.008) * 0.8;
      // flatten near the water edge (north) so shoreline sits at y=0
      const edgeFalloff = THREE.MathUtils.smoothstep(z, -HALF, -HALF + 40);
      pos.setY(i, h * edgeFalloff * 0.4);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x6a9c58,
      roughness: 0.95,
      metalness: 0.0,
    });
    // subtle two-tone patchwork by vertex color would need extra work;
    // keep it simple + performant for Phase 1
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    ground.name = 'terrain';
    this.scene.add(ground);
    this.terrainMesh = ground;

    // Sandy buildable "pad" edge ring so the city area reads clearly
    const padGeo = new THREE.RingGeometry(size / 2 - 1, size / 2 + 6, 4, 1);
    padGeo.rotateX(-Math.PI / 2);
  }

  // ---------------------------------------------------------------- grid
  _buildGrid() {
    const divisions = MAP_SIZE;
    const size = MAP_SIZE * CELL_SIZE;
    const grid = new THREE.GridHelper(size, divisions, 0x2c3e34, 0x2c3e34);
    grid.material.opacity = 0.08;
    grid.material.transparent = true;
    grid.position.y = 0.02;
    grid.name = 'buildGrid';
    this.scene.add(grid);
    this.gridHelper = grid;
  }

  // --------------------------------------------------------------- water
  _buildWater() {
    const width = MAP_SIZE * CELL_SIZE;
    const depth = 14 * CELL_SIZE;
    const geo = new THREE.PlaneGeometry(width, depth, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2f7fb5,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.set(0, -0.15, -HALF + depth / 2);
    water.name = 'water';
    water.receiveShadow = true;
    this.scene.add(water);
    this.waterMesh = water;
  }

  // ------------------------------------------------------------ boundary
  _buildBoundary() {
    const size = MAP_SIZE * CELL_SIZE;
    const postGeo = new THREE.BoxGeometry(0.6, 2, 0.6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.9 });
    const posts = new THREE.InstancedMesh(postGeo, postMat, (MAP_SIZE / 4) * 4);
    let idx = 0;
    const half = size / 2;
    const dummy = new THREE.Object3D();
    for (let i = 0; i <= MAP_SIZE; i += 4) {
      const t = (i - MAP_SIZE / 2) * CELL_SIZE;
      // south + north edges
      dummy.position.set(t, 1, half); dummy.updateMatrix(); posts.setMatrixAt(idx++, dummy.matrix);
      dummy.position.set(t, 1, -half); dummy.updateMatrix(); posts.setMatrixAt(idx++, dummy.matrix);
      // east + west edges
      dummy.position.set(half, 1, t); dummy.updateMatrix(); posts.setMatrixAt(idx++, dummy.matrix);
      dummy.position.set(-half, 1, t); dummy.updateMatrix(); posts.setMatrixAt(idx++, dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate = true;
    posts.castShadow = true;
    posts.name = 'boundaryPosts';
    this.scene.add(posts);
  }

  // ----------------------------------------------------------- scenery
  _scatterTrees() {
    const TREE_COUNT = 900;
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 1 });
    const leavesGeo = new THREE.ConeGeometry(1.1, 2.4, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x3f7a45, roughness: 0.85 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
    const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, TREE_COUNT);
    trunks.castShadow = true;
    leaves.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;
    let attempts = 0;
    const size = MAP_SIZE * CELL_SIZE;

    while (placed < TREE_COUNT && attempts < TREE_COUNT * 6) {
      attempts++;
      const x = (Math.random() - 0.5) * size;
      const z = (Math.random() - 0.5) * size;
      const { gx, gz } = this.worldToCell(new THREE.Vector3(x, 0, z));
      if (!this.isInBounds(gx, gz)) continue;
      if (this.occupancy[gx][gz] !== null) continue; // skip water/reserved cells
      // keep a scattered, semi-clustered look rather than perfectly uniform
      if (Math.random() > 0.5 && Math.random() > 0.35) continue;

      const scale = 0.7 + Math.random() * 0.6;
      const rot = Math.random() * Math.PI * 2;

      dummy.position.set(x, 0.6 * scale, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, 1.7 * scale, z);
      dummy.updateMatrix();
      leaves.setMatrixAt(placed, dummy.matrix);

      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    trunks.name = 'treeTrunks';
    leaves.name = 'treeLeaves';
    this.scene.add(trunks);
    this.scene.add(leaves);
  }
}

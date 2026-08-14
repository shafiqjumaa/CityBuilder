import * as THREE from "three";

/**
 * MapManager
 * Builds the city terrain: a flat buildable plot with a visible construction
 * grid, a wider "outskirts" terrain with gentle undulation, a lake along one
 * edge, scattered low-poly trees (instanced for performance) and a soft
 * boundary marker so the player always sees the edge of their city.
 */
export class MapManager {
  constructor(scene) {
    this.scene = scene;

    // Buildable area is a square grid of `size` x `size` tiles, each `tile` units wide.
    this.tileSize = 2;
    this.gridTiles = 100; // 100 x 100 tiles => 200 x 200 units
    this.size = this.tileSize * this.gridTiles;
    this.half = this.size / 2;

    this.bounds = {
      minX: -this.half,
      maxX: this.half,
      minZ: -this.half,
      maxZ: this.half,
    };

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._buildGround();
    this._buildGrid();
    this._buildOutskirts();
    this._buildWater();
    this._buildBoundary();
    this._buildTrees();
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3c6e4f,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    ground.name = "buildable-ground";
    this.group.add(ground);
  }

  _buildGrid() {
    // A subtle construction grid drawn with LineSegments, faded via opacity.
    const divisions = this.gridTiles;
    const helper = new THREE.GridHelper(
      this.size,
      divisions,
      0x9fe6c9,
      0x9fe6c9
    );
    helper.position.y = 0.02;
    helper.material.transparent = true;
    helper.material.opacity = 0.08;
    helper.name = "construction-grid";
    this.group.add(helper);
  }

  _buildOutskirts() {
    // A much larger, gently undulating terrain ring surrounding the buildable
    // plot so the city doesn't float in a void. Kept low-poly & cheap.
    const outerSize = this.size * 3;
    const segs = 60;
    const geo = new THREE.PlaneGeometry(outerSize, outerSize, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Only undulate outside the buildable square, keep the plot flat.
      const distOutside = Math.max(
        Math.abs(x) - this.half,
        Math.abs(z) - this.half
      );
      if (distOutside > 0) {
        const n =
          Math.sin(x * 0.04) * Math.cos(z * 0.045) * 2.2 +
          Math.sin(x * 0.11 + z * 0.07) * 0.8;
        const falloff = Math.min(distOutside / 20, 1);
        pos.setY(i, n * falloff - 0.15);
      } else {
        pos.setY(i, -0.15);
      }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2f5b3d,
      roughness: 1,
    });
    const outskirts = new THREE.Mesh(geo, mat);
    outskirts.receiveShadow = true;
    outskirts.position.y = -0.05;
    outskirts.name = "outskirts";
    this.group.add(outskirts);
  }

  _buildWater() {
    // A lake occupying one corner/edge of the map.
    const waterGeo = new THREE.PlaneGeometry(this.size * 0.9, this.size * 0.55);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2f7a9c,
      roughness: 0.15,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(
      this.half * 0.15,
      -0.08,
      -this.half - this.size * 0.18
    );
    water.name = "lake";
    water.receiveShadow = true;
    this.group.add(water);
    this.water = water;

    // Sandy shoreline strip between the plot and the lake
    const shoreGeo = new THREE.PlaneGeometry(this.size * 0.95, 6);
    shoreGeo.rotateX(-Math.PI / 2);
    const shoreMat = new THREE.MeshStandardMaterial({
      color: 0xd9c48a,
      roughness: 1,
    });
    const shore = new THREE.Mesh(shoreGeo, shoreMat);
    shore.position.set(this.half * 0.15, -0.06, -this.half - 3);
    this.group.add(shore);
  }

  _buildBoundary() {
    // Slim glowing boundary line around the buildable plot.
    const pts = [
      new THREE.Vector3(-this.half, 0.05, -this.half),
      new THREE.Vector3(this.half, 0.05, -this.half),
      new THREE.Vector3(this.half, 0.05, this.half),
      new THREE.Vector3(-this.half, 0.05, this.half),
      new THREE.Vector3(-this.half, 0.05, -this.half),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x4fd1c5,
      transparent: true,
      opacity: 0.55,
    });
    const line = new THREE.Line(geo, mat);
    line.name = "city-boundary";
    this.group.add(line);
  }

  _buildTrees() {
    // Simple low-poly pine: cone + cylinder trunk, instanced for performance.
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.6, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a35 });
    const leavesGeo = new THREE.ConeGeometry(0.9, 2.1, 6);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2f7d4f });

    const count = 260;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, count);
    trunks.castShadow = true;
    leaves.castShadow = true;
    leaves.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;
    let attempts = 0;
    const maxOuter = this.size * 1.4;

    while (placed < count && attempts < count * 20) {
      attempts++;
      const x = THREE.MathUtils.randFloatSpread(maxOuter);
      const z = THREE.MathUtils.randFloatSpread(maxOuter);

      const insideBuildable =
        Math.abs(x) < this.half - 2 && Math.abs(z) < this.half - 2;
      const nearLake =
        Math.abs(x - this.half * 0.15) < this.size * 0.5 &&
        z < -this.half - 2 &&
        z > -this.half - this.size * 0.5;

      if (insideBuildable || nearLake) continue;

      const scale = THREE.MathUtils.randFloat(0.7, 1.4);
      const rot = Math.random() * Math.PI * 2;

      dummy.position.set(x, 0.3 * scale, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, 1.35 * scale, z);
      dummy.updateMatrix();
      leaves.setMatrixAt(placed, dummy.matrix);

      placed++;
    }

    trunks.count = placed;
    leaves.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;

    trunks.name = "trees-trunks";
    leaves.name = "trees-leaves";
    this.group.add(trunks, leaves);
  }

  /** Snap a world X/Z to the nearest tile center. */
  snapToGrid(x, z) {
    const t = this.tileSize;
    return {
      x: Math.round(x / t) * t,
      z: Math.round(z / t) * t,
    };
  }

  isInsideBounds(x, z) {
    return (
      x >= this.bounds.minX &&
      x <= this.bounds.maxX &&
      z >= this.bounds.minZ &&
      z <= this.bounds.maxZ
    );
  }
}

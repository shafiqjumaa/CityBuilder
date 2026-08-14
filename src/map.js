import * as THREE from 'three';

export class MapManager {
  constructor(scene) {
    this.scene = scene;
    this.size = 160;
    this.gridSize = 4;
    this.bounds = {
      minX: -this.size / 2,
      maxX: this.size / 2,
      minZ: -this.size / 2,
      maxZ: this.size / 2
    };
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  build() {
    this._buildTerrain();
    this._buildGrid();
    this._buildWater();
    this._buildNature();
    this._buildBoundary();
  }

  _buildTerrain() {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, 48, 48);
    const pos = geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave = Math.sin(x * 0.075) * 0.7 + Math.cos(y * 0.055) * 0.55;
      const gentle = Math.sin((x + y) * 0.025) * 0.6;
      pos.setZ(i, wave + gentle);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x526b55,
      roughness: 1
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'Terrain';
    this.group.add(terrain);
    this.terrain = terrain;
  }

  _buildGrid() {
    const divisions = this.size / this.gridSize;
    const grid = new THREE.GridHelper(this.size, divisions, 0x6f8980, 0x6f8980);
    grid.position.y = 0.14;
    grid.material.transparent = true;
    grid.material.opacity = 0.13;
    this.group.add(grid);
  }

  _buildWater() {
    const geometry = new THREE.PlaneGeometry(44, 160);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3e879d,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.9
    });
    const water = new THREE.Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-58, 0.05, 0);
    water.receiveShadow = true;
    this.group.add(water);

    const shore = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 160),
      new THREE.MeshStandardMaterial({ color: 0xb4a47a, roughness: 1 })
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(-35, 0.07, 0);
    this.group.add(shore);
  }

  _buildNature() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4635, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x365e46, roughness: 1 });

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, 1.8, 7), trunkMat);
    trunk.position.y = .9;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 8), crownMat);
    crown.position.y = 2.65;
    tree.add(trunk, crown);

    const spots = [
      [-62,-55],[-58,-45],[-60,-34],[-56,47],[-48,57],[-35,62],
      [48,-58],[60,-50],[55,45],[65,58],[34,62],[20,-62],
      [-12,66],[8,62]
    ];

    for (const [x,z] of spots) {
      const t = tree.clone();
      const scale = 0.75 + Math.random() * .55;
      t.scale.setScalar(scale);
      t.position.set(x, 0, z);
      this.group.add(t);
    }
  }

  _buildBoundary() {
    const material = new THREE.LineBasicMaterial({
      color: 0x9bc4b6,
      transparent: true,
      opacity: .5
    });

    const points = [
      new THREE.Vector3(this.bounds.minX, .35, this.bounds.minZ),
      new THREE.Vector3(this.bounds.maxX, .35, this.bounds.minZ),
      new THREE.Vector3(this.bounds.maxX, .35, this.bounds.maxZ),
      new THREE.Vector3(this.bounds.minX, .35, this.bounds.maxZ),
      new THREE.Vector3(this.bounds.minX, .35, this.bounds.minZ)
    ];

    this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
}

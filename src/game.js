import * as THREE from 'three';
import { CameraController } from './camera.js';
import { MapManager } from './map.js';
import { UIManager } from './ui.js';

export class Game {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x91b8ca);
    this.scene.fog = new THREE.Fog(0x91b8ca, 90, 260);

    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(48, 48, 48);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.ui = new UIManager(this.uiRoot, this);
    this.map = new MapManager(this.scene);

    this.cameraController = new CameraController(
      this.camera,
      this.renderer.domElement,
      this.map.bounds
    );

    this.simulation = {
      day: 1,
      month: 1,
      year: 2026,
      minutes: 8 * 60,
      speed: 1,
      paused: false
    };

    this._bindResize();
  }

  start() {
    this._setupLighting();
    this.map.build();
    this.ui.bind();
    this.ui.toast('City initialized', 'The Phase 1 foundation is running.');
    this.animate();
  }

  _setupLighting() {
    const hemi = new THREE.HemisphereLight(0xd8efff, 0x3b4a42, 2.0);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff2d6, 3.0);
    this.sun.position.set(70, 100, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90;
    this.sun.shadow.camera.bottom = -90;
    this.scene.add(this.sun);

    const fill = new THREE.DirectionalLight(0x9cc9ff, 0.65);
    fill.position.set(-70, 35, -70);
    this.scene.add(fill);
  }

  updateSimulation(delta) {
    if (this.simulation.paused) return;

    const minutesPerSecond = 4 * this.simulation.speed;
    this.simulation.minutes += delta * minutesPerSecond;

    while (this.simulation.minutes >= 1440) {
      this.simulation.minutes -= 1440;
      this.simulation.day++;
      if (this.simulation.day > 30) {
        this.simulation.day = 1;
        this.simulation.month++;
      }
      if (this.simulation.month > 12) {
        this.simulation.month = 1;
        this.simulation.year++;
      }
    }
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.cameraController.update(delta);
    this.updateSimulation(delta);
    this.ui.update(this.simulation);

    this.renderer.render(this.scene, this.camera);
  };

  _bindResize() {
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }
}

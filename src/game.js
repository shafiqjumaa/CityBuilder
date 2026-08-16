import * as THREE from 'three';
import { CameraController } from './camera.js';
import { InteractionManager } from './interaction.js';
import { MapManager } from './map.js';
import { UIManager } from './ui.js';
import { ToolManager } from './tools.js';
import { RoadManager } from './roads.js';
import { ZoneManager } from './zoning.js';
import { BuildingManager } from './buildings.js';
import { CitizenManager } from './citizens.js';
import { TrafficManager } from './traffic.js';
import { EconomyManager } from './economy.js';
import { UtilityManager } from './utilities.js';
import { ServiceManager } from './services.js';
import { SaveManager } from './saveSystem.js';
import { MAP_SIZE, CELL_SIZE } from './config.js';

// Re-exported here too so any file that still does
// `import { MAP_SIZE } from './game.js'` keeps working.
export { MAP_SIZE, CELL_SIZE };

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.debugMode = false;

    // Simulation time state
    this.time = {
      day: 1,
      month: 1,
      year: 1,
      speed: 0, // 0 = paused, 1 = normal, 3 = fast
      dayLengthSeconds: 12, // real seconds per in-game day at speed 1
      _accum: 0,
    };

    // Core economy/city stats (Phase 1: static placeholders, wired up
      // for real by EconomyManager/CitizenManager in later phases)
    this.stats = {
      money: 50000,
      population: 0,
      happiness: 78,
      income: 0,
    };
  }

  init() {
    this._initRenderer();
    this._initScene();
    this._initLights();

    // Managers — order matters for dependencies
    this.mapManager = new MapManager(this);
    this.mapManager.build();

    this.cameraController = new CameraController(this);

    this.economyManager = new EconomyManager(this);
    this.utilityManager = new UtilityManager(this);
    this.roadManager = new RoadManager(this);
    this.zoneManager = new ZoneManager(this);
    this.buildingManager = new BuildingManager(this);
    this.serviceManager = new ServiceManager(this);
    this.citizenManager = new CitizenManager(this);
    this.trafficManager = new TrafficManager(this);
    this.saveManager = new SaveManager(this);

    this.toolManager = new ToolManager(this);
    this.uiManager = new UIManager(this);
    this.uiManager.init();
    this.interactionManager = new InteractionManager(this);

    this._bindGlobalEvents();
    this._animate();
  }

  // ---------------------------------------------------------------- render
  _initRenderer() {
    const container = document.getElementById('viewport');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd4ec);
    this.scene.fog = new THREE.FogExp2(0xbcd9ea, 0.0028);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      3000
    );
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x445544, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2d9, 1.3);
    this.sunLight.position.set(160, 220, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 220;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 700;
    this.sunLight.shadow.bias = -0.0015;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambient);
  }

  _bindGlobalEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.debugMode = !this.debugMode;
        document.getElementById('debug-panel').classList.toggle('hidden', !this.debugMode);
      }
    });
  }

  // ------------------------------------------------------------ time/loop
  setTimeSpeed(speed) {
    this.time.speed = speed;
    this.uiManager?.refreshClockButtons();
  }

  _updateTime(delta) {
    if (this.time.speed <= 0) return;
    this.time._accum += delta * this.time.speed;
    if (this.time._accum >= this.time.dayLengthSeconds) {
      this.time._accum -= this.time.dayLengthSeconds;
      this._advanceDay();
    }
  }

  _advanceDay() {
    this.time.day += 1;
    if (this.time.day > 30) {
      this.time.day = 1;
      this.time.month += 1;
    }
    if (this.time.month > 12) {
      this.time.month = 1;
      this.time.year += 1;
    }
    // Daily: buildings grow gradually on eligible zoned+road-adjacent cells
    this.buildingManager?.dailyGrowthTick();

    // Monthly tick: economy/citizens resolve on day 1
    if (this.time.day === 1) {
      this.economyManager?.monthlyTick();
      this.citizenManager?.monthlyTick();
    }
    this.uiManager?.refreshTopbar();
  }

  _animate = () => {
    requestAnimationFrame(this._animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this._updateTime(delta);
    this.cameraController.update(delta);
    this.trafficManager?.update(delta);
    this.citizenManager?.update(delta);
    this.uiManager?.updateDebug(delta);

    this.renderer.render(this.scene, this.camera);
  };
}

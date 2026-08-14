import * as THREE from "three";
import { CameraRig } from "./camera.js";
import { MapManager } from "./map.js";
import { UIManager } from "./ui.js";

/**
 * Game
 * Top-level orchestrator. Owns the renderer, scene and render loop, and
 * wires together the other managers.
 */
export class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.clock = new THREE.Clock();

    this.activeTool = "SELECT";
    this.timeSpeed = 1; // 0 = paused, 1 = normal, 4 = fast

    // --- Simulation state ---
    this.economy = {
      money: 125000,
      population: 0,
      happiness: 78,
      income: 0,
    };
    this.calendar = { day: 1, month: 1, year: 1, dayAccumulator: 0 };
    this.secondsPerDay = 2.2; // at timeSpeed = 1

    this._debugAccum = 0;
    this._frameCount = 0;
    this._fps = 0;

    this._initRenderer();
    this._initScene();
    this._initLights();

    this.map = new MapManager(this.scene);
    this.cameraRig = new CameraRig(this.renderer, this.map.bounds);
    this.ui = new UIManager(this);

    window.addEventListener("resize", () => this._onResize());

    this.ui.updateStats(this.economy);
    this.ui.updateClock(this.calendar);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fc7e8);
    this.scene.fog = new THREE.FogExp2(0x9fd0ec, 0.0028);
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xbfe0ff, 0x3c6e4f, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2d6, 1.35);
    this.sunLight.position.set(120, 160, 80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.bias = -0.0012;
    
    // إضافة الشمس وهدفها إلى المشهد بشكل صحيح لتجنب أخطاء التحديث
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    
    this.ambient = new THREE.AmbientLight(0xffffff, 0.18);
    this.scene.add(this.ambient);
  }

  setActiveTool(tool) {
    this.activeTool = tool;
  }

  setTimeSpeed(speed) {
    this.timeSpeed = speed;
  }

  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // تحديث الكاميرا عند تغيير حجم النافذة
    if (this.cameraRig && this.cameraRig.camera) {
      this.cameraRig.camera.aspect = window.innerWidth / window.innerHeight;
      this.cameraRig.camera.updateProjectionMatrix();
    }
  }

  _tickCalendar(dt) {
    if (this.timeSpeed === 0) return;
    this.calendar.dayAccumulator += dt * this.timeSpeed;
    if (this.calendar.dayAccumulator >= this.secondsPerDay) {
      this.calendar.dayAccumulator -= this.secondsPerDay;
      this.calendar.day++;
      if (this.calendar.day > 30) {
        this.calendar.day = 1;
        this.calendar.month++;
        if (this.calendar.month > 12) {
          this.calendar.month = 1;
          this.calendar.year++;
        }
      }
      this.ui.updateClock(this.calendar);
    }
  }

  start() {
    // إخفاء شاشة التحميل بشكل قاطع عند استدعاء دالة البدء
    this.ui.hideLoadingOverlay();
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
    
    this.renderer.setAnimationLoop((t) => this._loop(t));
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.cameraRig && typeof this.cameraRig.update === "function") {
      this.cameraRig.update(dt);
    }
    
    this._tickCalendar(dt);

    if (this.cameraRig && this.cameraRig.camera) {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }

    this._updateDebug(dt);
  }

  _updateDebug(dt) {
    this._frameCount++;
    this._debugAccum += dt;
    if (this._debugAccum >= 0.5) {
      this._fps = Math.round(this._frameCount / this._debugAccum);
      this._frameCount = 0;
      this._debugAccum = 0;

      let objects = 0;
      let triangles = 0;
      this.scene.traverse((obj) => {
        objects++;
        if (obj.isMesh || obj.isInstancedMesh) {
          const geo = obj.geometry;
          if (geo) {
            const idx = geo.index;
            const triCount = idx
              ? idx.count / 3
              : (geo.attributes && geo.attributes.position ? geo.attributes.position.count / 3 : 0);
            const instances = obj.isInstancedMesh ? obj.count : 1;
            triangles += triCount * instances;
          }
        }
      });

      this.ui.updateDebug({
        fps: this._fps,
        objects,
        triangles: Math.round(triangles).toLocaleString(),
        simTime: `Y${this.calendar.year} M${this.calendar.month} D${this.calendar.day}`,
      });
    }
  }
}

import * as THREE from 'three';
import { TOOLS } from './tools.js';

/**
 * Bridges mouse input to the active build tool.
 *
 * Mouse buttons are split so building never fights with camera control:
 *  - LEFT   -> tool actions (place/select/demolish/zone-paint)
 *  - MIDDLE -> camera pan   (see camera.js)
 *  - RIGHT  -> camera orbit (see camera.js)
 *
 * ROAD works as click-then-click (two discrete points).
 * ZONE works as click-drag-release (rectangle paint), since a single
 * click wouldn't let the player select an area.
 */
export class InteractionManager {
  constructor(game) {
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hoverCell = null;
    this.isPaintingZone = false;

    this._bind();
  }

  _bind() {
    const dom = this.game.renderer.domElement;
    dom.addEventListener('mousemove', (e) => this._onMove(e));
    dom.addEventListener('mousedown', (e) => this._onDown(e));
    window.addEventListener('mouseup', (e) => this._onUp(e));
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._cancelCurrentTool();
    });

    this.game.toolManager.onChange(() => this._cancelCurrentTool());
  }

  _groundPointFromEvent(e) {
    const rect = this.game.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.game.camera);
    const point = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, point);
    return hit ? point : null;
  }

  _onMove(e) {
    const point = this._groundPointFromEvent(e);
    if (!point) return;
    const cell = this.game.mapManager.worldToCell(point);
    this.hoverCell = cell;

    const tool = this.game.toolManager.current;
    if (tool === TOOLS.ROAD) {
      this.game.roadManager.updatePreview(cell);
    } else if (tool === TOOLS.ZONE && this.isPaintingZone) {
      this.game.zoneManager.updatePaintPreview(cell);
    }
    this._updateCostTooltip(e, tool);
  }

  _onDown(e) {
    if (e.button !== 0) return; // left click drives tools; middle/right drive the camera
    const point = this._groundPointFromEvent(e);
    if (!point) {
      console.warn('[Urbanova] click did not hit the ground plane');
      return;
    }
    const cell = this.game.mapManager.worldToCell(point);
    const tool = this.game.toolManager.current;

    if (tool === TOOLS.ROAD) {
      this.game.roadManager.handleClick(cell);
    } else if (tool === TOOLS.ZONE) {
      this.isPaintingZone = true;
      this.game.zoneManager.startPaint(cell, this.game.toolManager.subTool);
    } else if (tool === TOOLS.DEMOLISH) {
      this._demolishAt(cell);
    } else if (tool === TOOLS.SELECT) {
      this._selectAt(cell);
    }
  }

  _selectAt(cell) {
    const b = this.game.buildingManager?.getBuildingAt(cell.gx, cell.gz);
    if (!b) {
      document.getElementById('info-panel').classList.add('hidden');
      return;
    }
    this.game.uiManager?.showInfoPanel(b.type.replace(/_/g, ' '), [
      ['Zone', b.zoneType],
      ['Level', b.level],
      ['Capacity', b.capacity || '—'],
      ['Jobs', b.jobs || '—'],
      ['Happiness', b.happiness + '%'],
      ['Footprint', `${b.footprint[0]}×${b.footprint[1]}`],
    ]);
  }

  _onUp(e) {
    if (e.button !== 0) return;
    if (this.isPaintingZone) {
      this.isPaintingZone = false;
      this.game.zoneManager.commitPaint();
    }
  }

  _demolishAt(cell) {
    const removedZone = this.game.zoneManager.demolishAt(cell);
    if (removedZone) return;
    const removedRoad = this.game.roadManager.demolishAt(cell);
    if (!removedRoad) this.game.uiManager?.notify('Nothing to demolish there.', 'warn');
  }

  _cancelCurrentTool() {
    this.game.roadManager?.cancelPreview();
    this.game.zoneManager?.cancelPaint();
    this.isPaintingZone = false;
    document.getElementById('cost-tooltip').classList.add('hidden');
  }

  _updateCostTooltip(e, tool) {
    const tooltip = document.getElementById('cost-tooltip');
    if (tool === TOOLS.ROAD && this.game.roadManager.previewActive) {
      const cost = this.game.roadManager.previewCost;
      const valid = this.game.roadManager.previewValid;
      tooltip.textContent = valid ? `Road — $${cost}` : 'Blocked / insufficient funds';
      tooltip.style.left = e.clientX + 16 + 'px';
      tooltip.style.top = e.clientY + 12 + 'px';
      tooltip.classList.remove('hidden');
    } else {
      tooltip.classList.add('hidden');
    }
  }
}


import { TOOLS } from './tools.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._fpsLast = 0;
  }

  init() {
    this._bindToolbar();
    this._bindClock();
    this._bindInfoPanel();
    this.refreshTopbar();
    this.refreshClockButtons();
    this._drawMinimapStatic();
  }

  // ------------------------------------------------------------ toolbar
  _bindToolbar() {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.game.toolManager.setTool(tool);
        buttons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    // SELECT starts active
    document.querySelector('.tool-btn[data-tool="SELECT"]')?.classList.add('selected');
  }

  // -------------------------------------------------------------- clock
  _bindClock() {
    document.getElementById('btn-pause').addEventListener('click', () => this.game.setTimeSpeed(0));
    document.getElementById('btn-play').addEventListener('click', () => this.game.setTimeSpeed(1));
    document.getElementById('btn-fast').addEventListener('click', () => this.game.setTimeSpeed(3));
  }

  refreshClockButtons() {
    const map = { 0: 'btn-pause', 1: 'btn-play', 3: 'btn-fast' };
    ['btn-pause', 'btn-play', 'btn-fast'].forEach((id) =>
      document.getElementById(id).classList.remove('active')
    );
    const activeId = map[this.game.time.speed];
    if (activeId) document.getElementById(activeId).classList.add('active');
  }

  // ------------------------------------------------------------- topbar
  refreshTopbar() {
    const { money, population, happiness, income } = this.game.stats;
    const { day, month, year } = this.game.time;
    document.getElementById('val-money').textContent = '$' + Math.round(money).toLocaleString();
    document.getElementById('val-population').textContent = population.toLocaleString();
    document.getElementById('val-happiness').textContent = Math.round(happiness) + '%';
    document.getElementById('val-income').textContent =
      (income >= 0 ? '+$' : '-$') + Math.abs(Math.round(income)).toLocaleString();
    document.getElementById('val-date').textContent = `Day ${day}, Month ${month}, Year ${year}`;
  }

  // --------------------------------------------------------- info panel
  _bindInfoPanel() {
    document.getElementById('info-close').addEventListener('click', () => {
      document.getElementById('info-panel').classList.add('hidden');
    });
  }

  showInfoPanel(title, rows) {
    const panel = document.getElementById('info-panel');
    document.getElementById('info-title').textContent = title;
    const body = document.getElementById('info-body');
    body.innerHTML = '';
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${label}</span><span>${value}</span>`;
      body.appendChild(row);
    });
    panel.classList.remove('hidden');
  }

  // ------------------------------------------------------------- notify
  notify(message, kind = 'info') {
    const center = document.getElementById('notification-center');
    const el = document.createElement('div');
    el.className = 'notif ' + (kind === 'warn' ? 'warn' : kind === 'good' ? 'good' : '');
    el.textContent = message;
    center.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // -------------------------------------------------------------- debug
  updateDebug(delta) {
    this._fpsAccum += delta;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this._fpsLast = Math.round(this._fpsFrames / this._fpsAccum);
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }
    if (!this.game.debugMode) return;

    const renderer = this.game.renderer;
    document.getElementById('dbg-fps').textContent = this._fpsLast;
    document.getElementById('dbg-objects').textContent = renderer.info.render.calls;
    document.getElementById('dbg-triangles').textContent = renderer.info.render.triangles;
    document.getElementById('dbg-population').textContent = this.game.stats.population;
    document.getElementById('dbg-vehicles').textContent = this.game.trafficManager?.vehicleCount ?? 0;
    document.getElementById('dbg-simtime').textContent =
      `${this.game.time.year}-${this.game.time.month}-${this.game.time.day}`;
  }

  // ------------------------------------------------------------ minimap
  // Phase 1: static placeholder showing map bounds + water strip.
  // Wired up to real roads/zones/camera frustum in a later phase.
  _drawMinimapStatic() {
    const canvas = document.getElementById('minimap-canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#274a33';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2f7fb5';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.15);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }
}

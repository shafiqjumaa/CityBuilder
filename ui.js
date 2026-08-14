/**
 * UIManager
 * Wires up the DOM overlay: top HUD stats, the tool toolbar, the time/clock
 * controls and the F3 debug panel. Keeps all DOM lookups in one place so
 * gameplay modules never touch the DOM directly.
 */
export class UIManager {
  constructor(game) {
    this.game = game;

    this.el = {
      money: document.getElementById("money-value"),
      population: document.getElementById("population-value"),
      happiness: document.getElementById("happiness-value"),
      income: document.getElementById("income-value"),
      day: document.getElementById("time-day"),
      month: document.getElementById("time-month"),
      year: document.getElementById("time-year"),
      btnPause: document.getElementById("btn-pause"),
      btnPlay: document.getElementById("btn-play"),
      btnFast: document.getElementById("btn-fast"),
      toolbar: document.getElementById("toolbar"),
      loadingOverlay: document.getElementById("loading-overlay"),
      debugPanel: document.getElementById("debug-panel"),
      dbgFps: document.getElementById("dbg-fps"),
      dbgObjects: document.getElementById("dbg-objects"),
      dbgTriangles: document.getElementById("dbg-triangles"),
      dbgSimTime: document.getElementById("dbg-simtime"),
    };

    this._bindToolbar();
    this._bindTimeControls();
    this._bindDebugToggle();
  }

  _bindToolbar() {
    const buttons = this.el.toolbar.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.game.setActiveTool(btn.dataset.tool);
      });
    });
  }

  _bindTimeControls() {
    const setSpeed = (speed, activeBtn) => {
      this.game.setTimeSpeed(speed);
      [this.el.btnPause, this.el.btnPlay, this.el.btnFast].forEach((b) =>
        b.classList.remove("active")
      );
      activeBtn.classList.add("active");
    };

    this.el.btnPause.addEventListener("click", () =>
      setSpeed(0, this.el.btnPause)
    );
    this.el.btnPlay.addEventListener("click", () =>
      setSpeed(1, this.el.btnPlay)
    );
    this.el.btnFast.addEventListener("click", () =>
      setSpeed(4, this.el.btnFast)
    );
  }

  _bindDebugToggle() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "F3") {
        e.preventDefault();
        this.el.debugPanel.classList.toggle("hidden");
      }
    });
  }

  hideLoadingOverlay() {
    this.el.loadingOverlay.classList.add("fade-out");
    setTimeout(() => this.el.loadingOverlay.remove(), 600);
  }

  updateStats({ money, population, happiness, income }) {
    this.el.money.textContent = `$${Math.round(money).toLocaleString()}`;
    this.el.population.textContent = population.toLocaleString();
    this.el.happiness.textContent = `${Math.round(happiness)}%`;
    const sign = income >= 0 ? "+" : "-";
    this.el.income.textContent = `${sign}$${Math.abs(Math.round(income)).toLocaleString()}`;
  }

  updateClock({ day, month, year }) {
    this.el.day.textContent = `Day ${day}`;
    this.el.month.textContent = `Month ${month}`;
    this.el.year.textContent = `Year ${year}`;
  }

  updateDebug({ fps, objects, triangles, simTime }) {
    if (this.el.debugPanel.classList.contains("hidden")) return;
    this.el.dbgFps.textContent = fps;
    this.el.dbgObjects.textContent = objects;
    this.el.dbgTriangles.textContent = triangles;
    this.el.dbgSimTime.textContent = simTime;
  }
}

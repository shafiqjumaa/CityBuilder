const SAVE_KEY = 'urbanova_save_v1';

/**
 * SaveManager persists game state to localStorage.
 * Phase 1 saves time/stats only. Each later phase should extend
 * `_serialize`/`_restore` to include its own manager's data
 * (roads, zones, buildings, population, taxes, utilities...) —
 * per the design brief's save-system requirements.
 */
export class SaveManager {
  constructor(game) {
    this.game = game;
  }

  save() {
    const data = this._serialize();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.game.uiManager?.notify('City saved.', 'good');
      return true;
    } catch (err) {
      console.error('[SaveManager] save failed:', err);
      this.game.uiManager?.notify('Save failed — storage unavailable.', 'warn');
      return false;
    }
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      this.game.uiManager?.notify('No saved city found.', 'warn');
      return false;
    }
    try {
      const data = JSON.parse(raw);
      this._restore(data);
      this.game.uiManager?.notify('City loaded.', 'good');
      return true;
    } catch (err) {
      console.error('[SaveManager] load failed:', err);
      this.game.uiManager?.notify('Save file is corrupted.', 'warn');
      return false;
    }
  }

  resetCity() {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  }

  _serialize() {
    const g = this.game;
    return {
      version: 1,
      time: g.time,
      stats: g.stats,
      // TODO: roads, zones, buildings, population, taxes, utilities
      // as each manager gains real state in later phases.
    };
  }

  _restore(data) {
    const g = this.game;
    if (data.time) Object.assign(g.time, data.time);
    if (data.stats) Object.assign(g.stats, data.stats);
    g.uiManager?.refreshTopbar();
    g.uiManager?.refreshClockButtons();
  }
}

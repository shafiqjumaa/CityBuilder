export class SaveManager {
  static save(state) {
    localStorage.setItem('city-builder-save-v1', JSON.stringify(state));
  }

  static load() {
    const raw = localStorage.getItem('city-builder-save-v1');
    return raw ? JSON.parse(raw) : null;
  }

  static reset() {
    localStorage.removeItem('city-builder-save-v1');
  }
}

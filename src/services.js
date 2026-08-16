/**
 * ServiceManager — Phase 6.
 * Will own: school/hospital/police/fire buildings, their coverage
 * radius + capacity, and the resulting effect on citizen happiness,
 * health, crime, and fire risk.
 */
export class ServiceManager {
  constructor(game) {
    this.game = game;
    this.services = []; // { type, gx, gz, radius, capacity, used }
  }

  // TODO (Phase 6): registerService(def), coverageAt(gx, gz)
}

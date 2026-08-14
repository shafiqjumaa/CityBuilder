/**
 * CitizenManager — Phase 4/5.
 * Will own: the simplified population simulation (home/workplace/income/
 * happiness/health/education/age aggregates), job matching against
 * BuildingManager capacity, and the population/employed/students/children
 * breakdown shown in the Statistics panel.
 *
 * Phase 1 provides a no-op monthlyTick so Game's time loop has something
 * real to call once population actually exists (Phase 4+).
 */
export class CitizenManager {
  constructor(game) {
    this.game = game;
    this.citizens = [];
  }

  monthlyTick() {
    // TODO (Phase 4/5): re-evaluate jobs, happiness, health, education
    // for every citizen and update game.stats.population accordingly.
  }
}

/**
 * EconomyManager — Phase 5.
 * Will own: tax rates (residential/commercial/industrial), income from
 * taxes, expenses (road maintenance, police, fire, healthcare, education,
 * electricity, water, garbage), and the monthly profit/loss resolution.
 *
 * Phase 1 wires a minimal monthlyTick so the clock -> economy -> UI loop
 * is real end-to-end, even though income/expenses are still 0 until
 * buildings exist.
 */
export class EconomyManager {
  constructor(game) {
    this.game = game;
    this.taxRates = {
      RESIDENTIAL: 0.09,
      COMMERCIAL: 0.09,
      INDUSTRIAL: 0.09,
    };
    this.monthlyExpenses = 0; // sums road/service upkeep once those exist
  }

  monthlyTick() {
    const stats = this.game.stats;
    const income = this._calculateIncome();
    const expenses = this.monthlyExpenses;
    const profit = income - expenses;

    stats.income = profit;
    stats.money += profit;

    this.game.uiManager?.refreshTopbar();
  }

  _calculateIncome() {
    // TODO (Phase 5): sum taxIncome across all buildings by zone type
    // and tax rate. Returns 0 until BuildingManager tracks real buildings.
    return 0;
  }
}

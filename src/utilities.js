/**
 * UtilityManager — Phase 5.
 * Will own: electricity production/consumption, water production/
 * consumption, and a simplified radius/network coverage model deciding
 * whether a given building cell is Powered / Not Powered / No Water.
 */
export class UtilityManager {
  constructor(game) {
    this.game = game;
    this.electricity = { produced: 0, consumed: 0 };
    this.water = { produced: 0, consumed: 0 };
  }

  // TODO (Phase 5): isPowered(gx, gz), hasWater(gx, gz), registerPlant(building)
}

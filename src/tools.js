/**
 * Central registry of the currently active build tool.
 * Individual managers (RoadManager, ZoneManager, BuildingManager, ...)
 * read `game.toolManager.current` to decide how to react to clicks/moves
 * on the terrain. Kept deliberately dumb in Phase 1 — the interaction
 * logic for each tool arrives with its own phase (roads in Phase 2, etc).
 */
export const TOOLS = {
  SELECT: 'SELECT',
  ROAD: 'ROAD',
  ZONE: 'ZONE',
  BUILDING: 'BUILDING',
  ELECTRICITY: 'ELECTRICITY',
  WATER: 'WATER',
  SERVICES: 'SERVICES',
  TRANSPORT: 'TRANSPORT',
  DEMOLISH: 'DEMOLISH',
};

export class ToolManager {
  constructor(game) {
    this.game = game;
    this.current = TOOLS.SELECT;
    this.subTool = null; // e.g. which zone type, which building, etc.
    this.listeners = [];
  }

  setTool(tool) {
    if (!TOOLS[tool]) return;
    this.current = tool;
    // Auto-pick a sensible default subtool so the player can act immediately.
    this.subTool = tool === TOOLS.ZONE ? 'RESIDENTIAL' : null;
    this.listeners.forEach((fn) => fn(tool));
  }

  setSubTool(subTool) {
    this.subTool = subTool;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }
}

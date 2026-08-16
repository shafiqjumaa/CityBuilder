/**
 * Shared map constants.
 * Kept in their own file (not inside game.js) so camera.js, map.js, and
 * any future manager can import them without creating a circular
 * import with game.js (which itself imports those managers).
 */
export const MAP_SIZE = 128; // cells
export const CELL_SIZE = 4; // world units per cell

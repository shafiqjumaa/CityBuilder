/**
 * Central catalogue of every building type in the game, per the design
 * brief's cost table (§26) and service specs (§15). BuildingManager
 * (Phase 4) and ServiceManager (Phase 6) consume this instead of
 * hardcoding numbers inline.
 */
export const BUILDINGS = {
  // ---------------------------------------------------------- residential
  HOUSE_SMALL: { id: 'HOUSE_SMALL', zone: 'RESIDENTIAL', level: 1, cost: 2000, capacity: 4, footprint: [1, 1] },
  HOUSE_MEDIUM: { id: 'HOUSE_MEDIUM', zone: 'RESIDENTIAL', level: 2, cost: 6000, capacity: 12, footprint: [1, 1] },
  APARTMENT: { id: 'APARTMENT', zone: 'RESIDENTIAL', level: 3, cost: 15000, capacity: 40, footprint: [2, 2] },

  // ----------------------------------------------------------- commercial
  SHOP_SMALL: { id: 'SHOP_SMALL', zone: 'COMMERCIAL', level: 1, cost: 5000, jobs: 6, footprint: [1, 1] },
  SHOP_MEDIUM: { id: 'SHOP_MEDIUM', zone: 'COMMERCIAL', level: 2, cost: 12000, jobs: 18, footprint: [1, 1] },
  COMMERCIAL_TOWER: { id: 'COMMERCIAL_TOWER', zone: 'COMMERCIAL', level: 3, cost: 30000, jobs: 60, footprint: [2, 2] },

  // ----------------------------------------------------------- industrial
  FACTORY_SMALL: { id: 'FACTORY_SMALL', zone: 'INDUSTRIAL', level: 1, cost: 8000, jobs: 20, footprint: [1, 1] },
  FACTORY_MEDIUM: { id: 'FACTORY_MEDIUM', zone: 'INDUSTRIAL', level: 2, cost: 18000, jobs: 45, footprint: [2, 1] },
  WAREHOUSE: { id: 'WAREHOUSE', zone: 'INDUSTRIAL', level: 2, cost: 14000, jobs: 15, footprint: [2, 2] },
};

export const SERVICES = {
  SCHOOL: { id: 'SCHOOL', cost: 25000, capacity: 500, coverage: 800, monthlyCost: 500 },
  HOSPITAL: { id: 'HOSPITAL', cost: 50000, capacity: 1000, coverage: 1200, monthlyCost: 900 },
  POLICE: { id: 'POLICE', cost: 20000, coverage: 1000, monthlyCost: 400 },
  FIRE_DEPT: { id: 'FIRE_DEPT', cost: 20000, coverage: 1000, monthlyCost: 400 },
  POWER_PLANT: { id: 'POWER_PLANT', cost: 100000, output: 5000, monthlyCost: 1200 },
  WATER_PLANT: { id: 'WATER_PLANT', cost: 60000, output: 5000, monthlyCost: 800 },
  SEWAGE_PLANT: { id: 'SEWAGE_PLANT', cost: 45000, capacity: 5000, monthlyCost: 600 },
  GARBAGE_STATION: { id: 'GARBAGE_STATION', cost: 15000, capacity: 3000, monthlyCost: 300 },
};

export const ROAD = {
  costPerSegment: 100,
  width: 3, // world units
};

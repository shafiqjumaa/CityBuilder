/**
 * Central catalogue of every building type in the game.
 * `footprint: [w, d]` is in grid cells (BuildingManager also tries the
 * rotated [d, w] orientation when checking if a type fits an area).
 * `style` selects which procedural low-poly shape BuildingManager builds
 * (see buildings.js _buildProcedural) — no external model files needed.
 */
export const BUILDINGS = {
  // ---------------------------------------------------------- residential
  HOUSE_TINY: {
    id: 'HOUSE_TINY', zone: 'RESIDENTIAL', level: 1, cost: 1500,
    footprint: [1, 1], height: 2.1, color: 0xd8c9a3, roofColor: 0x8a5a3c,
    style: 'house', capacity: 4,
  },
  HOUSE_SMALL: {
    id: 'HOUSE_SMALL', zone: 'RESIDENTIAL', level: 1, cost: 2500,
    footprint: [1, 1], height: 2.7, color: 0xc9d2a3, roofColor: 0x7a4a34,
    style: 'house', capacity: 6,
  },
  TOWNHOUSE: {
    id: 'TOWNHOUSE', zone: 'RESIDENTIAL', level: 2, cost: 5000,
    footprint: [1, 2], height: 3.6, color: 0xd9a37a, roofColor: 0x6b3f2a,
    style: 'house', capacity: 12,
  },
  APARTMENT_LOW: {
    id: 'APARTMENT_LOW', zone: 'RESIDENTIAL', level: 3, cost: 14000,
    footprint: [2, 2], height: 7.5, color: 0xb9c4cc, roofColor: 0xf3f6f8,
    style: 'tower', capacity: 30,
  },
  APARTMENT_TOWER: {
    id: 'APARTMENT_TOWER', zone: 'RESIDENTIAL', level: 4, cost: 30000,
    footprint: [2, 2], height: 14, color: 0x9fb8c9, roofColor: 0xe8f4ff,
    style: 'tower', capacity: 65,
  },

  // ----------------------------------------------------------- commercial
  KIOSK: {
    id: 'KIOSK', zone: 'COMMERCIAL', level: 1, cost: 2500,
    footprint: [1, 1], height: 2, color: 0xdf7a5a, roofColor: 0xb5432a,
    style: 'shop', jobs: 4,
  },
  SHOP_SMALL: {
    id: 'SHOP_SMALL', zone: 'COMMERCIAL', level: 1, cost: 5000,
    footprint: [1, 1], height: 2.8, color: 0xe0955a, roofColor: 0xa8552a,
    style: 'shop', jobs: 8,
  },
  STRIP_MALL: {
    id: 'STRIP_MALL', zone: 'COMMERCIAL', level: 2, cost: 10000,
    footprint: [2, 1], height: 3.2, color: 0x5aa7c9, roofColor: 0x2c6e8f,
    style: 'shop', jobs: 16,
  },
  OFFICE_LOW: {
    id: 'OFFICE_LOW', zone: 'COMMERCIAL', level: 3, cost: 22000,
    footprint: [2, 2], height: 9, color: 0x7d93a6, roofColor: 0xd7e6ee,
    style: 'tower', jobs: 38,
  },
  COMMERCIAL_TOWER: {
    id: 'COMMERCIAL_TOWER', zone: 'COMMERCIAL', level: 4, cost: 38000,
    footprint: [2, 2], height: 17, color: 0x6f8fae, roofColor: 0xbfe6f2,
    style: 'tower', jobs: 75,
  },

  // ----------------------------------------------------------- industrial
  WORKSHOP: {
    id: 'WORKSHOP', zone: 'INDUSTRIAL', level: 1, cost: 4000,
    footprint: [1, 1], height: 2.3, color: 0xb8a54a, roofColor: 0x8f7d38,
    style: 'factory', chimneys: 1, jobs: 10,
  },
  FACTORY_SMALL: {
    id: 'FACTORY_SMALL', zone: 'INDUSTRIAL', level: 2, cost: 8000,
    footprint: [1, 2], height: 4, color: 0x9a9a92, roofColor: 0x74746c,
    style: 'factory', chimneys: 1, jobs: 20,
  },
  FACTORY_MEDIUM: {
    id: 'FACTORY_MEDIUM', zone: 'INDUSTRIAL', level: 3, cost: 16000,
    footprint: [2, 2], height: 5, color: 0x84847c, roofColor: 0x5f5f58,
    style: 'factory', chimneys: 2, jobs: 42,
  },
  WAREHOUSE: {
    id: 'WAREHOUSE', zone: 'INDUSTRIAL', level: 2, cost: 9000,
    footprint: [2, 1], height: 3.4, color: 0x8a6f52, roofColor: 0x5c4a38,
    style: 'flatcap', jobs: 14,
  },
  INDUSTRIAL_COMPLEX: {
    id: 'INDUSTRIAL_COMPLEX', zone: 'INDUSTRIAL', level: 4, cost: 26000,
    footprint: [3, 2], height: 6, color: 0x707070, roofColor: 0x4a4a4a,
    style: 'complex', jobs: 68,
  },
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

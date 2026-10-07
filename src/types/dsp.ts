export type ViewMode = 'SYSTEM' | 'PLANET' | 'BLUEPRINT' | 'DYSON';

export type PlanetId = 'planet-foundry' | 'planet-titanium' | 'planet-gas' | 'planet-vulcan';

export interface CargoItem {
  id: number;
  name: string;
  code: string;
  color: string;
  glowColor: string;
  category: 'raw' | 'processed' | 'component' | 'matrix' | 'dyson';
}

export const CARGO_ITEMS: Record<number, CargoItem> = {
  1: { id: 1, name: '鐵礦 (Iron Ore)', code: 'FE', color: '#58a6ff', glowColor: 'rgba(88, 166, 255, 0.6)', category: 'raw' },
  2: { id: 2, name: '銅礦 (Copper Ore)', code: 'CU', color: '#f0883e', glowColor: 'rgba(240, 136, 62, 0.6)', category: 'raw' },
  3: { id: 3, name: '鈦礦 (Titanium Ore)', code: 'TI', color: '#e3b341', glowColor: 'rgba(227, 179, 65, 0.6)', category: 'raw' },
  4: { id: 4, name: '高純矽 (Silicon)', code: 'SI', color: '#7ee787', glowColor: 'rgba(126, 231, 135, 0.6)', category: 'processed' },
  5: { id: 5, name: '鈦合金 (Titanium Alloy)', code: 'TI-A', color: '#ffa657', glowColor: 'rgba(255, 166, 87, 0.6)', category: 'processed' },
  6: { id: 6, name: '電磁矩陣 (Blue Matrix)', code: 'MAT-1', color: '#388bfd', glowColor: 'rgba(56, 139, 253, 0.8)', category: 'matrix' },
  7: { id: 7, name: '能量矩陣 (Red Matrix)', code: 'MAT-2', color: '#f85149', glowColor: 'rgba(248, 81, 73, 0.8)', category: 'matrix' },
  8: { id: 8, name: '結構矩陣 (Yellow Matrix)', code: 'MAT-3', color: '#d29922', glowColor: 'rgba(210, 153, 34, 0.8)', category: 'matrix' },
  9: { id: 9, name: '宇宙矩陣 (White Matrix)', code: 'MAT-6', color: '#ffffff', glowColor: 'rgba(255, 255, 255, 0.9)', category: 'matrix' },
  10: { id: 10, name: '太陽帆 (Solar Sail)', code: 'SAIL', color: '#00f0ff', glowColor: 'rgba(0, 240, 255, 0.9)', category: 'dyson' },
  11: { id: 11, name: '小型運載火箭 (Rocket)', code: 'RCKT', color: '#bc8cff', glowColor: 'rgba(188, 140, 255, 0.8)', category: 'dyson' },
};

export type BuildingType = 
  | 'NONE'
  | 'BELT'
  | 'MINER'
  | 'SMELTER'
  | 'ASSEMBLER'
  | 'ILS'
  | 'PLS'
  | 'RAY_RECEIVER'
  | 'EM_EJECTOR'
  | 'SOLAR_PANEL';

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  color: string;
  footprint: { bands: number; segments: number };
  powerDemand: number; // in kW
  outputItemId?: number;
  inputItemId?: number;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDefinition> = {
  NONE: { type: 'NONE', name: '選取模式', description: '檢查地塊與建築資訊', color: '#8b949e', footprint: { bands: 1, segments: 1 }, powerDemand: 0 },
  BELT: { type: 'BELT', name: '傳送帶 (Mk.III)', description: '以 30/s 高速在連續記憶體中搬運貨物', color: '#00f0ff', footprint: { bands: 1, segments: 1 }, powerDemand: 0 },
  MINER: { type: 'MINER', name: '大型採礦機', description: '自動採集礦脈並送出礦石', color: '#3fb950', footprint: { bands: 2, segments: 2 }, powerDemand: 420 },
  SMELTER: { type: 'SMELTER', name: '電弧熔爐', description: '高溫冶煉：鐵/銅/鈦礦石 -> 金屬錠', color: '#d29922', footprint: { bands: 2, segments: 2 }, powerDemand: 360, inputItemId: 3, outputItemId: 5 },
  ASSEMBLER: { type: 'ASSEMBLER', name: '組裝機 (Mk.III)', description: '合成科技矩陣與戴森球太陽帆', color: '#bc8cff', footprint: { bands: 2, segments: 2 }, powerDemand: 480, inputItemId: 5, outputItemId: 10 },
  ILS: { type: 'ILS', name: '星際物流運輸站', description: '跨行星供需撮合與曲率飛船調度總站', color: '#58a6ff', footprint: { bands: 3, segments: 3 }, powerDemand: 12000 },
  PLS: { type: 'PLS', name: '行星內物流運輸站', description: '本星球短途無人機高吞吐轉運站', color: '#1f6feb', footprint: { bands: 2, segments: 2 }, powerDemand: 3000 },
  RAY_RECEIVER: { type: 'RAY_RECEIVER', name: '射線接收站', description: '吸收戴森雲高能光子，提供千瓦級電力', color: '#ff7b72', footprint: { bands: 2, segments: 2 }, powerDemand: -15000 },
  EM_EJECTOR: { type: 'EM_EJECTOR', name: '電磁軌道彈射器', description: '以高初速發射太陽帆至戴森雲軌道', color: '#2ea043', footprint: { bands: 2, segments: 2 }, powerDemand: 1200 },
  SOLAR_PANEL: { type: 'SOLAR_PANEL', name: '太陽能板陣列', description: '根據日照角度持續發電', color: '#79c0ff', footprint: { bands: 1, segments: 1 }, powerDemand: -360 },
};

export interface GridCell {
  bandIndex: number;
  segmentIndex: number;
  buildingType: BuildingType;
  buildingId?: number;
  resourceDeposit?: {
    type: number; // item ID
    amount: number;
  };
}

export interface PlacedBuilding {
  id: number;
  type: BuildingType;
  bandIndex: number;
  segmentIndex: number;
  planetId: PlanetId;
  status: 'ACTIVE' | 'IDLE' | 'NO_POWER';
  outputBeltId?: number;
  inputBeltId?: number;
  progress: number;
  productionCount: number;
}

export interface PlanetData {
  id: PlanetId;
  name: string;
  type: string;
  color: string;
  orbitRadius: number; // in AU / screen units
  orbitSpeed: number;
  orbitAngle: number;
  radius: number; // visual radius
  rotationSpeed: number;
  rotationAngle: number;
  features: string;
  ilsStorage: Record<number, { local: number; remote: number; role: 'SUPPLY' | 'DEMAND' | 'STORAGE'; max: number }>;
}

export interface LogisticsShip {
  id: string;
  sourcePlanet: PlanetId;
  targetPlanet: PlanetId;
  itemId: number;
  amount: number;
  progress: number; // 0..1
  isWarp: boolean;
  speed: number;
  state: 'OUTBOUND' | 'UNLOADING' | 'RETURNING' | 'DOCKING';
  currPos: { x: number; y: number; z: number };
}

export interface DysonRing {
  id: number;
  radius: number;
  inclination: number; // in radians
  rotationSpeed: number;
  sailCount: number;
  color: string;
}

export interface DysonNode {
  id: number;
  ringId: number;
  theta: number;
  powerMW: number;
}

// MAPA DO TESOURO - Game Type Definitions

export type BuildingCategory = 'RA' | 'OE' | 'AO';
export type TileStatus = 'green' | 'yellow' | 'red';
export type GameLevel = 1 | 2 | 3 | 4 | 5;
export type BiomeType = 'floresta' | 'praia' | 'montanha' | 'cerrado' | 'lagoa' | 'cidade';
export type AvatarPreset = 'explorador' | 'construtor' | 'guardiao' | 'cientista';

export interface GameBars {
  ra: number; // 0-100 Natureza
  oe: number; // 0-100 Infraestrutura
  ao: number; // 0-100 Organização
}

export interface Building {
  id: string;
  name: string;
  emoji: string;
  category: BuildingCategory;
  effects: { ra: number; oe: number; ao: number };
  cost: number;
  description: string;
  color: string;
  height: number;
  unlockLevel: GameLevel;
}

export interface PlacedBuilding {
  buildingId: string;
  x: number;
  y: number;
}

export interface GameEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  choices: EventChoice[];
  condition?: (bars: GameBars) => boolean;
}

export interface EventChoice {
  label: string;
  type: 'smart' | 'quick' | 'risky';
  emoji: string;
  effects: { ra: number; oe: number; ao: number; coins?: number };
  message: string;
}

export interface AvatarConfig {
  preset: AvatarPreset;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
}

export interface CouncilDecision {
  id: string;
  question: string;
  emoji: string;
  options: {
    label: string;
    effects: { ra: number; oe: number; ao: number };
    feedback: string;
  }[];
}

export interface GameState {
  bars: GameBars;
  coins: number;
  level: GameLevel;
  xp: number;
  grid: (PlacedBuilding | null)[][];
  avatar: AvatarConfig;
  biome: BiomeType;
  currentEvent: GameEvent | null;
  currentCouncil: CouncilDecision | null;
  turn: number;
  visitors: number;
  isSetup: boolean;
  eventLog: string[];
}

export const LEVEL_NAMES: Record<GameLevel, string> = {
  1: 'Vila Inicial',
  2: 'Comunidade Sustentável',
  3: 'Cidade Organizada',
  4: 'Destino Reconhecido',
  5: 'Cidade do Futuro',
};

export const LEVEL_XP: Record<GameLevel, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 800,
};

export const BIOME_INFO: Record<BiomeType, { name: string; emoji: string; groundColor: string; description: string }> = {
  floresta: { name: 'Floresta', emoji: '🌳', groundColor: '#2d5a27', description: 'Rica em natureza e biodiversidade' },
  praia: { name: 'Praia', emoji: '🏖️', groundColor: '#c2b280', description: 'Litoral com praias e mar' },
  montanha: { name: 'Montanha', emoji: '⛰️', groundColor: '#6b705c', description: 'Terreno elevado e clima frio' },
  cerrado: { name: 'Cerrado', emoji: '🌾', groundColor: '#a68a64', description: 'Vegetação típica do interior' },
  lagoa: { name: 'Lagoa', emoji: '🏞️', groundColor: '#4a7c59', description: 'Rios e lagoas naturais' },
  cidade: { name: 'Cidade Moderna', emoji: '🏙️', groundColor: '#7a7a7a', description: 'Centro urbano desenvolvido' },
};

// MAPA DO TESOURO - Game Type Definitions

export type BuildingCategory = 'RA' | 'OE' | 'AO';
export type TileStatus = 'green' | 'yellow' | 'red';
export type GameLevel = 1 | 2 | 3 | 4 | 5;
export type BiomeType = 'floresta' | 'praia' | 'montanha' | 'cerrado' | 'lagoa' | 'cidade';
export type AvatarPreset = 'explorador' | 'construtor' | 'guardiao' | 'cientista';

export interface ProfileScores {
  explorador: number;
  construtor: number;
  guardiao: number;
  cientista: number;
}

/** Educational metrics tracked throughout gameplay */
export interface EduMetrics {
  proNatureDecisions: number;
  proInfraDecisions: number;
  proGovDecisions: number;
  excessiveBuilding: number; // times OE > RA+30
  turnsInGreen: number; // turns with equilibrium >= 60
  turnsInRed: number; // turns with equilibrium < 30
  totalBuildings: number;
  totalEventsResolved: number;
  smartChoices: number;
  riskyChoices: number;
  quickChoices: number;
}

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
  /** IDs of buildings that must exist on the grid before this can be placed */
  requires?: string[];
  /** Bonus effects when placed adjacent to specific buildings */
  synergies?: { withId: string; bonus: { ra: number; oe: number; ao: number }; description: string }[];
  /** Maintenance cost per turn (deducted from coins) */
  maintenance?: number;
}

export interface Disaster {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Which bar triggers this disaster when too low */
  trigger: { bar: keyof GameBars; threshold: number };
  /** Number of buildings destroyed */
  destroys: number;
  /** Bar penalties */
  effects: { ra: number; oe: number; ao: number; coins?: number };
  /** Priority categories to destroy first */
  targetCategory?: BuildingCategory;
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

export const PROFILE_INFO: Record<AvatarPreset, { name: string; emoji: string; description: string }> = {
  explorador: { name: 'Explorador(a)', emoji: '🧭', description: 'Descobre novos caminhos na natureza' },
  construtor: { name: 'Construtor(a)', emoji: '🔨', description: 'Cria infraestrutura para todos' },
  guardiao: { name: 'Guardião(ã)', emoji: '🛡️', description: 'Protege e organiza a comunidade' },
  cientista: { name: 'Cientista', emoji: '🔬', description: 'Mantém o equilíbrio perfeito' },
};

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

export interface VictoryCondition {
  id: string;
  label: string;
  emoji: string;
  description: string;
  check: (state: GameState) => boolean;
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
  isGameOver: boolean;
  gameOverReason: string | null;
  isVictory: boolean;
  victoryReason: string | null;
  disasterCount: number;
  profileScores: ProfileScores;
  eduMetrics: EduMetrics;
  unlockedSkins: string[];
}

export const VICTORY_CONDITIONS: Omit<VictoryCondition, 'check'>[] = [
  { id: 'level5', label: 'Nível 5', emoji: '⭐', description: 'Alcançar o nível "Cidade do Futuro"' },
  { id: 'equilibrium', label: 'Equilíbrio ≥ 70', emoji: '⚖️', description: 'Manter equilíbrio acima de 70%' },
  { id: 'bars', label: 'Barras ≥ 50', emoji: '📊', description: 'Todas as barras acima de 50' },
  { id: 'visitors', label: '200+ Visitantes', emoji: '👥', description: 'Atrair pelo menos 200 visitantes' },
];

/** Biome starting bonuses and risks */
export const BIOME_MODIFIERS: Record<BiomeType, { startBars: Partial<GameBars>; startCoins: number; risk: string; bonus: string }> = {
  floresta: { startBars: { ra: 65, oe: 20, ao: 30 }, startCoins: 40, risk: 'Incêndios florestais', bonus: '+15 RA inicial' },
  praia: { startBars: { ra: 45, oe: 35, ao: 25 }, startCoins: 55, risk: 'Erosão costeira', bonus: '+5 moedas iniciais' },
  montanha: { startBars: { ra: 55, oe: 15, ao: 35 }, startCoins: 35, risk: 'Deslizamentos', bonus: '+5 AO inicial' },
  cerrado: { startBars: { ra: 50, oe: 25, ao: 30 }, startCoins: 45, risk: 'Secas severas', bonus: 'Equilíbrio balanceado' },
  lagoa: { startBars: { ra: 60, oe: 20, ao: 30 }, startCoins: 45, risk: 'Poluição da água', bonus: '+10 RA inicial' },
  cidade: { startBars: { ra: 25, oe: 50, ao: 35 }, startCoins: 70, risk: 'Poluição urbana', bonus: '+20 moedas iniciais' },
};

/** Unlockable skins earned through gameplay */
export const UNLOCKABLE_SKINS: { id: string; name: string; emoji: string; condition: string; check: (state: GameState) => boolean }[] = [
  { id: 'eco_hero', name: 'Herói Ecológico', emoji: '🌿', condition: 'RA ≥ 80 por 3 turnos', check: (s) => s.bars.ra >= 80 && s.eduMetrics.turnsInGreen >= 3 },
  { id: 'master_builder', name: 'Mestre Construtor', emoji: '🏗️', condition: '10+ construções', check: (s) => s.eduMetrics.totalBuildings >= 10 },
  { id: 'wise_leader', name: 'Líder Sábio', emoji: '👑', condition: 'AO ≥ 70 e 5+ decisões smart', check: (s) => s.bars.ao >= 70 && s.eduMetrics.smartChoices >= 5 },
  { id: 'survivor', name: 'Sobrevivente', emoji: '🛡️', condition: 'Sobreviver a 3+ desastres', check: (s) => s.disasterCount >= 3 && !s.isGameOver },
  { id: 'balanced', name: 'Equilibrista', emoji: '⚖️', condition: '10+ turnos no verde', check: (s) => s.eduMetrics.turnsInGreen >= 10 },
  { id: 'scientist', name: 'Cientista Mirim', emoji: '🔬', condition: 'Perfil Cientista dominante', check: (s) => {
    const scores = s.profileScores;
    return scores.cientista >= scores.explorador && scores.cientista >= scores.construtor && scores.cientista >= scores.guardiao && scores.cientista > 10;
  }},
];

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

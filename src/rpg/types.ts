export interface BiomeStats {
  biodiversidade: number; // 0-100
  poluicao: number;       // 0-100 (lower is better)
  comunidade: number;     // 0-100
  recursos: number;       // 0-100
}

export type BiomeId = 'floresta' | 'praia' | 'cerrado' | 'montanha' | 'caatinga';

export interface StoryChoice {
  text: string;
  effects: Partial<BiomeStats>;
  nextScene: string;
  feedback: string;
  type: 'sustentavel' | 'arriscado' | 'neutro';
}

export interface StoryScene {
  id: string;
  chapter: number;
  title: string;
  narrative: string;
  emoji: string;
  choices: StoryChoice[];
  isEnding?: boolean;
  endingType?: 'restaurado' | 'degradado' | 'neutro';
}

export interface BiomeStory {
  biomeId: BiomeId;
  biomeName: string;
  biomeEmoji: string;
  biomeColor: string;
  description: string;
  backgroundGradient: string;
  scenes: StoryScene[];
}

export interface RPGState {
  biome: BiomeId | null;
  currentScene: string;
  stats: BiomeStats;
  history: string[];
  choicesMade: number;
  started: boolean;
  finished: boolean;
}

export const INITIAL_STATS: BiomeStats = {
  biodiversidade: 50,
  poluicao: 40,
  comunidade: 50,
  recursos: 50,
};

export const BIOME_INFO: Record<BiomeId, { name: string; emoji: string; color: string; gradient: string; description: string }> = {
  floresta: {
    name: 'Floresta Amazônica',
    emoji: '🌳',
    color: 'hsl(142, 76%, 36%)',
    gradient: 'from-green-900 via-green-800 to-emerald-900',
    description: 'Explore a maior floresta tropical do mundo e enfrente ameaças de desmatamento, queimadas e mineração ilegal.',
  },
  praia: {
    name: 'Litoral Tropical',
    emoji: '🏖️',
    color: 'hsl(199, 89%, 48%)',
    gradient: 'from-cyan-900 via-blue-800 to-sky-900',
    description: 'Proteja ecossistemas costeiros contra poluição marinha, turismo predatório e erosão.',
  },
  cerrado: {
    name: 'Cerrado Brasileiro',
    emoji: '🌾',
    color: 'hsl(43, 96%, 56%)',
    gradient: 'from-amber-900 via-yellow-800 to-orange-900',
    description: 'Defenda a savana mais biodiversa do planeta contra o avanço agrícola e queimadas.',
  },
  montanha: {
    name: 'Serra da Mantiqueira',
    emoji: '🏔️',
    color: 'hsl(215, 28%, 50%)',
    gradient: 'from-slate-800 via-gray-700 to-stone-800',
    description: 'Preserve nascentes, fauna endêmica e comunidades tradicionais das montanhas.',
  },
  caatinga: {
    name: 'Caatinga Nordestina',
    emoji: '🌵',
    color: 'hsl(30, 80%, 55%)',
    gradient: 'from-orange-900 via-amber-800 to-yellow-900',
    description: 'Combata a desertificação e proteja a riqueza única do semiárido brasileiro.',
  },
};

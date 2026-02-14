// MAPA DO TESOURO - Card Game Types & Deck System

import type { BiomeType, GameBars, BuildingCategory } from './types';

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type CardType = 'build' | 'action' | 'event' | 'policy';

export interface GameCard {
  id: string;
  name: string;
  emoji: string;
  type: CardType;
  category: BuildingCategory;
  rarity: CardRarity;
  cost: number;
  effects: { ra: number; oe: number; ao: number; coins?: number; xp?: number };
  description: string;
  /** Flavor text for educational value */
  flavor?: string;
  /** If true, card is removed from deck after playing (one-time use) */
  exhaust?: boolean;
  /** Biome exclusivity */
  biomeOnly?: BiomeType;
  /** Minimum level to appear in rewards */
  minLevel?: number;
  /** Special keyword tags for synergies */
  tags?: string[];
}

export interface DeckState {
  drawPile: GameCard[];
  hand: GameCard[];
  discardPile: GameCard[];
  exhaustPile: GameCard[];
  /** Max cards drawn per turn */
  drawCount: number;
  /** Max hand size */
  maxHand: number;
}

// ── CARD DEFINITIONS ──────────────────────────────────────────

export const ALL_CARDS: GameCard[] = [
  // ━━ RA – Natureza ━━
  { id: 'plant_tree', name: 'Plantar Árvore', emoji: '🌳', type: 'build', category: 'RA', rarity: 'common', cost: 3,
    effects: { ra: 8, oe: 0, ao: 0 }, description: 'Uma árvore nova para o mundo!',
    flavor: 'Árvores purificam o ar e protegem o solo.', tags: ['nature', 'basic'] },

  { id: 'create_park', name: 'Criar Parque', emoji: '🌿', type: 'build', category: 'RA', rarity: 'common', cost: 8,
    effects: { ra: 12, oe: 2, ao: 2 }, description: 'Área verde para todos curtirem!',
    flavor: 'Parques melhoram a saúde e a felicidade.', tags: ['nature', 'community'] },

  { id: 'nature_reserve', name: 'Área Protegida', emoji: '🦜', type: 'build', category: 'RA', rarity: 'uncommon', cost: 15,
    effects: { ra: 18, oe: -2, ao: 3 }, description: 'Protege a biodiversidade!',
    flavor: 'Reservas naturais salvam espécies em extinção.', tags: ['nature', 'protection'], minLevel: 2 },

  { id: 'eco_trail', name: 'Trilha Ecológica', emoji: '🥾', type: 'build', category: 'RA', rarity: 'common', cost: 5,
    effects: { ra: 6, oe: 4, ao: 1 }, description: 'Caminho para explorar a natureza.',
    flavor: 'Trilhas conectam as pessoas com o meio ambiente.', tags: ['nature', 'tourism'] },

  { id: 'botanical_garden', name: 'Jardim Botânico', emoji: '🌻', type: 'build', category: 'RA', rarity: 'uncommon', cost: 10,
    effects: { ra: 10, oe: 3, ao: 1 }, description: 'Flores, ciência e beleza!',
    flavor: 'Jardins botânicos preservam espécies raras de plantas.', tags: ['nature', 'education'], minLevel: 2 },

  { id: 'reforestation', name: 'Reflorestamento', emoji: '🌲', type: 'action', category: 'RA', rarity: 'uncommon', cost: 12,
    effects: { ra: 20, oe: -3, ao: 5 }, description: 'Plantio massivo de árvores nativas!',
    flavor: 'Reflorestar é devolver a vida ao solo.', exhaust: true, tags: ['nature', 'restoration'], minLevel: 2 },

  { id: 'seed_bomb', name: 'Bomba de Sementes', emoji: '💚', type: 'action', category: 'RA', rarity: 'rare', cost: 6,
    effects: { ra: 15, oe: 0, ao: 3, xp: 10 }, description: 'Espalhe vida por toda parte!',
    flavor: 'Sementes viajam pelo vento e criam novas florestas.', exhaust: true, tags: ['nature'] },

  // ━━ OE – Infraestrutura ━━
  { id: 'build_house', name: 'Construir Casa', emoji: '🏠', type: 'build', category: 'OE', rarity: 'common', cost: 5,
    effects: { ra: -2, oe: 8, ao: 1 }, description: 'Moradia para as famílias.',
    flavor: 'Todo mundo merece um lar seguro.', tags: ['infra', 'basic'] },

  { id: 'build_school', name: 'Construir Escola', emoji: '🏫', type: 'build', category: 'OE', rarity: 'uncommon', cost: 12,
    effects: { ra: 0, oe: 10, ao: 5 }, description: 'Educação transforma o futuro!',
    flavor: 'Escolas são a base de toda comunidade.', tags: ['infra', 'education'], minLevel: 1 },

  { id: 'build_hotel', name: 'Construir Hotel', emoji: '🏨', type: 'build', category: 'OE', rarity: 'rare', cost: 20,
    effects: { ra: -5, oe: 15, ao: 2, coins: 5 }, description: 'Hospedagem para visitantes.',
    flavor: 'Hotéis atraem turistas e geram empregos.', tags: ['infra', 'tourism'], minLevel: 3 },

  { id: 'clean_transport', name: 'Transporte Limpo', emoji: '🚲', type: 'build', category: 'OE', rarity: 'uncommon', cost: 10,
    effects: { ra: 3, oe: 8, ao: 2 }, description: 'Ciclovias e bondinhos!',
    flavor: 'Transporte limpo reduz a poluição do ar.', tags: ['infra', 'green'], minLevel: 2 },

  { id: 'dirty_transport', name: 'Transporte Poluente', emoji: '🚗', type: 'build', category: 'OE', rarity: 'common', cost: 4,
    effects: { ra: -8, oe: 12, ao: 1 }, description: '⚠️ Polui muito!',
    flavor: 'Carros poluem, mas são rápidos.', tags: ['infra', 'polluting'] },

  { id: 'build_hospital', name: 'Construir Hospital', emoji: '🏥', type: 'build', category: 'OE', rarity: 'rare', cost: 22,
    effects: { ra: 0, oe: 12, ao: 4 }, description: 'Saúde para toda comunidade!',
    flavor: 'Hospitais salvam vidas todos os dias.', tags: ['infra', 'health'], minLevel: 3 },

  { id: 'emergency_build', name: 'Construção Express', emoji: '⚡', type: 'action', category: 'OE', rarity: 'uncommon', cost: 8,
    effects: { ra: -5, oe: 18, ao: -2 }, description: 'Constrói rápido, mas com custo!',
    flavor: 'A pressa é inimiga da perfeição.', exhaust: true, tags: ['infra'] },

  // ━━ AO – Organização ━━
  { id: 'council', name: 'Conselho Mirim', emoji: '🤝', type: 'build', category: 'AO', rarity: 'uncommon', cost: 12,
    effects: { ra: 2, oe: 2, ao: 15 }, description: 'Decisões em grupo!',
    flavor: 'Democracia começa com a participação de todos.', tags: ['gov', 'community'], minLevel: 1 },

  { id: 'cleanup_program', name: 'Mutirão de Limpeza', emoji: '🧹', type: 'action', category: 'AO', rarity: 'common', cost: 5,
    effects: { ra: 5, oe: 3, ao: 10 }, description: 'Cidade limpa e bonita!',
    flavor: 'Quando todos ajudam, tudo fica melhor.', tags: ['gov', 'community'] },

  { id: 'edu_signs', name: 'Placas Educativas', emoji: '🪧', type: 'build', category: 'AO', rarity: 'common', cost: 4,
    effects: { ra: 3, oe: 1, ao: 8 }, description: 'Informação para todos.',
    flavor: 'Placas informam e educam visitantes.', tags: ['gov', 'education'] },

  { id: 'community_center', name: 'Centro Comunitário', emoji: '🏛️', type: 'build', category: 'AO', rarity: 'rare', cost: 16,
    effects: { ra: 1, oe: 5, ao: 12 }, description: 'Ponto de encontro e cultura!',
    flavor: 'Centros comunitários fortalecem laços sociais.', tags: ['gov', 'community'], minLevel: 2 },

  { id: 'recycling', name: 'Programa de Reciclagem', emoji: '♻️', type: 'build', category: 'AO', rarity: 'uncommon', cost: 9,
    effects: { ra: 8, oe: 2, ao: 8 }, description: 'Cuide do lixo!',
    flavor: 'Reciclar economiza recursos e protege a natureza.', tags: ['gov', 'green'], minLevel: 2 },

  { id: 'town_meeting', name: 'Assembleia Popular', emoji: '📢', type: 'action', category: 'AO', rarity: 'common', cost: 3,
    effects: { ra: 1, oe: 1, ao: 12 }, description: 'Todos têm voz!',
    flavor: 'A força da comunidade está na união.', tags: ['gov'] },

  { id: 'sustainability_plan', name: 'Plano de Sustentabilidade', emoji: '📋', type: 'policy', category: 'AO', rarity: 'rare', cost: 15,
    effects: { ra: 8, oe: 5, ao: 10, xp: 15 }, description: 'Estratégia de longo prazo!',
    flavor: 'Planejamento garante um futuro melhor.', exhaust: true, tags: ['gov', 'strategy'], minLevel: 3 },

  // ━━ POLICY CARDS (powerful, exhaust) ━━
  { id: 'eco_law', name: 'Lei Ambiental', emoji: '⚖️', type: 'policy', category: 'RA', rarity: 'legendary', cost: 20,
    effects: { ra: 25, oe: -5, ao: 10, xp: 20 }, description: 'Proteção máxima da natureza!',
    flavor: 'Leis protegem o que é de todos.', exhaust: true, tags: ['nature', 'policy'], minLevel: 4 },

  { id: 'smart_city', name: 'Cidade Inteligente', emoji: '🌐', type: 'policy', category: 'OE', rarity: 'legendary', cost: 25,
    effects: { ra: 5, oe: 20, ao: 10, coins: 10, xp: 20 }, description: 'Tecnologia a serviço de todos!',
    flavor: 'Cidades inteligentes usam dados para melhorar a vida.', exhaust: true, tags: ['infra', 'policy'], minLevel: 4 },

  { id: 'public_governance', name: 'Governança Participativa', emoji: '🗳️', type: 'policy', category: 'AO', rarity: 'legendary', cost: 22,
    effects: { ra: 5, oe: 5, ao: 25, xp: 20 }, description: 'O povo decide!',
    flavor: 'Governança participativa é a democracia em ação.', exhaust: true, tags: ['gov', 'policy'], minLevel: 4 },
];

// ── BIOME-EXCLUSIVE CARDS ──────────────────────────────────────

export const BIOME_CARDS: GameCard[] = [
  // Floresta
  { id: 'fire_brigade', name: 'Brigada de Incêndio', emoji: '🧑‍🚒', type: 'action', category: 'AO', rarity: 'uncommon', cost: 8,
    effects: { ra: 5, oe: 0, ao: 12 }, description: 'Proteção contra queimadas!',
    flavor: 'Brigadistas voluntários protegem a floresta.', biomeOnly: 'floresta', tags: ['nature', 'protection'] },

  { id: 'canopy_walk', name: 'Passarela nas Copas', emoji: '🌿', type: 'build', category: 'RA', rarity: 'rare', cost: 18,
    effects: { ra: 10, oe: 8, ao: 3, coins: 8 }, description: 'Turismo nas alturas!',
    flavor: 'Caminhar sobre as copas é uma experiência única.', biomeOnly: 'floresta', tags: ['nature', 'tourism'], minLevel: 2 },

  // Praia
  { id: 'mangrove', name: 'Replantio de Mangue', emoji: '🌱', type: 'action', category: 'RA', rarity: 'uncommon', cost: 10,
    effects: { ra: 15, oe: 0, ao: 5 }, description: 'Mangue protege a costa!',
    flavor: 'Manguezais são berçários da vida marinha.', biomeOnly: 'praia', tags: ['nature', 'restoration'] },

  { id: 'beach_cleanup', name: 'Limpeza de Praia', emoji: '🏖️', type: 'action', category: 'AO', rarity: 'common', cost: 4,
    effects: { ra: 8, oe: 2, ao: 8 }, description: 'Praia limpa, mar feliz!',
    flavor: 'Cada pedaço de lixo recolhido salva um animal marinho.', biomeOnly: 'praia', tags: ['nature', 'community'] },

  // Montanha
  { id: 'slope_reforest', name: 'Reflorestamento de Encosta', emoji: '⛰️', type: 'action', category: 'RA', rarity: 'uncommon', cost: 12,
    effects: { ra: 12, oe: 2, ao: 8 }, description: 'Raízes seguram o solo!',
    flavor: 'Árvores nas encostas previnem deslizamentos.', biomeOnly: 'montanha', tags: ['nature', 'protection'] },

  { id: 'mountain_lodge', name: 'Pousada de Montanha', emoji: '🏔️', type: 'build', category: 'OE', rarity: 'rare', cost: 16,
    effects: { ra: -2, oe: 12, ao: 3, coins: 8 }, description: 'Aconchego nas alturas!',
    flavor: 'Pousadas sustentáveis geram renda sem destruir.', biomeOnly: 'montanha', tags: ['infra', 'tourism'], minLevel: 2 },

  // Cerrado
  { id: 'cistern', name: 'Cisterna Comunitária', emoji: '💧', type: 'build', category: 'AO', rarity: 'uncommon', cost: 10,
    effects: { ra: 8, oe: 3, ao: 10 }, description: 'Água guardada para a seca!',
    flavor: 'Cisternas captam e armazenam água da chuva.', biomeOnly: 'cerrado', tags: ['gov', 'water'] },

  { id: 'native_seeds', name: 'Banco de Sementes', emoji: '🌾', type: 'action', category: 'RA', rarity: 'rare', cost: 14,
    effects: { ra: 18, oe: 0, ao: 5, xp: 10 }, description: 'Preservar espécies nativas!',
    flavor: 'Sementes nativas são tesouros do cerrado.', biomeOnly: 'cerrado', exhaust: true, tags: ['nature'], minLevel: 2 },

  // Lagoa
  { id: 'bio_treatment', name: 'Tratamento Biológico', emoji: '🧪', type: 'action', category: 'RA', rarity: 'uncommon', cost: 10,
    effects: { ra: 14, oe: 2, ao: 5 }, description: 'Plantas limpam a água!',
    flavor: 'A natureza tem suas próprias soluções de limpeza.', biomeOnly: 'lagoa', tags: ['nature', 'water'] },

  { id: 'floating_garden', name: 'Jardim Flutuante', emoji: '🪷', type: 'build', category: 'RA', rarity: 'rare', cost: 14,
    effects: { ra: 12, oe: 5, ao: 3, coins: 5 }, description: 'Beleza e ecologia na água!',
    flavor: 'Jardins flutuantes filtram a água e encantam visitantes.', biomeOnly: 'lagoa', tags: ['nature', 'tourism'], minLevel: 2 },

  // Cidade
  { id: 'green_roof', name: 'Telhado Verde', emoji: '🏙️', type: 'build', category: 'RA', rarity: 'uncommon', cost: 10,
    effects: { ra: 10, oe: 5, ao: 2 }, description: 'Natureza no concreto!',
    flavor: 'Telhados verdes resfriam edifícios e purificam o ar.', biomeOnly: 'cidade', tags: ['nature', 'infra'] },

  { id: 'metro', name: 'Metrô Leve', emoji: '🚇', type: 'build', category: 'OE', rarity: 'rare', cost: 22,
    effects: { ra: 5, oe: 15, ao: 8, coins: 5 }, description: 'Transporte urbano eficiente!',
    flavor: 'Metrôs reduzem congestionamento e poluição.', biomeOnly: 'cidade', tags: ['infra', 'green'], minLevel: 3 },
];

// ── DECK BUILDER HELPERS ──────────────────────────────────────

/** Create the starting deck for a biome */
export function createStartingDeck(biome: BiomeType): GameCard[] {
  // Base cards everyone gets (2x basic of each pillar)
  const base: GameCard[] = [
    ...findCards(['plant_tree', 'plant_tree', 'create_park']),
    ...findCards(['build_house', 'build_house', 'dirty_transport']),
    ...findCards(['cleanup_program', 'edu_signs', 'town_meeting']),
  ];

  // Biome-specific starters
  const biomeStarters: Record<BiomeType, string[]> = {
    floresta: ['plant_tree', 'eco_trail', 'fire_brigade'],
    praia: ['beach_cleanup', 'eco_trail', 'mangrove'],
    montanha: ['slope_reforest', 'edu_signs', 'build_house'],
    cerrado: ['cistern', 'plant_tree', 'cleanup_program'],
    lagoa: ['bio_treatment', 'create_park', 'town_meeting'],
    cidade: ['green_roof', 'build_school', 'clean_transport'],
  };

  const extras = findCards(biomeStarters[biome]);
  return [...base, ...extras];
}

function findCards(ids: string[]): GameCard[] {
  const pool = [...ALL_CARDS, ...BIOME_CARDS];
  return ids.map(id => {
    const card = pool.find(c => c.id === id);
    if (!card) return pool[0]; // fallback
    return { ...card }; // clone
  });
}

/** Get reward card pool for a given biome and level */
export function getRewardPool(biome: BiomeType, level: number): GameCard[] {
  const pool = [...ALL_CARDS, ...BIOME_CARDS];
  return pool.filter(c => {
    if (c.biomeOnly && c.biomeOnly !== biome) return false;
    if (c.minLevel && c.minLevel > level) return false;
    return true;
  });
}

/** Pick N random cards from a pool, weighted by rarity */
export function pickRandomCards(pool: GameCard[], count: number): GameCard[] {
  const weights: Record<CardRarity, number> = { common: 4, uncommon: 3, rare: 2, legendary: 1 };
  const weighted = pool.flatMap(c => Array(weights[c.rarity]).fill(c));
  const picked: GameCard[] = [];
  const available = [...weighted];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const card = available[idx];
    // Avoid duplicates in pick
    if (!picked.find(p => p.id === card.id)) {
      picked.push({ ...card });
    } else {
      i--; // retry
    }
    available.splice(idx, 1);
    if (available.length === 0) break;
  }

  return picked;
}

/** Shuffle an array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rarity colors */
export const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; text: string }> = {
  common: { bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', text: 'text-slate-600 dark:text-slate-300' },
  uncommon: { bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-400 dark:border-emerald-600', text: 'text-emerald-700 dark:text-emerald-300' },
  rare: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-400 dark:border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  legendary: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-400 dark:border-amber-500', text: 'text-amber-700 dark:text-amber-300' },
};

export const CATEGORY_COLORS: Record<BuildingCategory, { gradient: string; emoji: string; label: string }> = {
  RA: { gradient: 'from-green-500 to-emerald-600', emoji: '🌳', label: 'Natureza' },
  OE: { gradient: 'from-blue-500 to-indigo-600', emoji: '🏗️', label: 'Conforto' },
  AO: { gradient: 'from-purple-500 to-violet-600', emoji: '🤝', label: 'Organização' },
};

export const TYPE_LABELS: Record<CardType, { label: string; emoji: string }> = {
  build: { label: 'Construção', emoji: '🏗️' },
  action: { label: 'Ação', emoji: '⚡' },
  event: { label: 'Evento', emoji: '🎲' },
  policy: { label: 'Política', emoji: '📜' },
};

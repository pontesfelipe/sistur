// MAPA DO TESOURO - Threat Card System (opponent auto-generated challenges)

import type { BiomeType } from './types';

export type ThreatType = 'pollution' | 'storm' | 'overcrowding' | 'deforestation' | 'corruption' | 'drought' | 'erosion' | 'fire' | 'disease' | 'exodus';

export interface ThreatCard {
  id: string;
  name: string;
  emoji: string;
  type: ThreatType;
  /** Which pillar this threat targets */
  target: 'RA' | 'OE' | 'AO';
  /** Power of the threat (damage to pillar) */
  power: number;
  /** Secondary effects */
  effects: { ra: number; oe: number; ao: number; coins?: number };
  description: string;
  flavor: string;
  /** Threat intensity tier */
  tier: 1 | 2 | 3;
  /** Biome exclusivity */
  biomeOnly?: BiomeType;
}

// ── UNIVERSAL THREATS ──────────────────────────────────────

const UNIVERSAL_THREATS: ThreatCard[] = [
  // Tier 1 (mild)
  { id: 'light_rain', name: 'Chuva Leve', emoji: '🌦️', type: 'storm', target: 'OE', power: 3,
    effects: { ra: 2, oe: -3, ao: 0 }, description: 'Chuva molha construções.', flavor: 'Nem toda chuva é ruim...', tier: 1 },
  { id: 'trash_wave', name: 'Onda de Lixo', emoji: '🗑️', type: 'pollution', target: 'RA', power: 4,
    effects: { ra: -4, oe: 0, ao: -2 }, description: 'Lixo se acumula na cidade.', flavor: 'Sem reciclagem, o lixo cresce.', tier: 1 },
  { id: 'noise', name: 'Barulho Excessivo', emoji: '📢', type: 'overcrowding', target: 'AO', power: 3,
    effects: { ra: -1, oe: 0, ao: -3 }, description: 'Moradores reclamam do barulho.', flavor: 'A paz é preciosa.', tier: 1 },
  { id: 'small_crowd', name: 'Turistas Desordenados', emoji: '🧳', type: 'overcrowding', target: 'AO', power: 4,
    effects: { ra: -2, oe: 1, ao: -4 }, description: 'Turistas sem orientação.', flavor: 'Turismo sem planejamento causa problemas.', tier: 1 },
  { id: 'weeds', name: 'Ervas Daninhas', emoji: '🌿', type: 'deforestation', target: 'RA', power: 3,
    effects: { ra: -3, oe: 0, ao: -1 }, description: 'Plantas invasoras se espalham.', flavor: 'Espécies exóticas ameaçam as nativas.', tier: 1 },
  { id: 'bureaucracy', name: 'Burocracia', emoji: '📋', type: 'corruption', target: 'AO', power: 3,
    effects: { ra: 0, oe: -1, ao: -3 }, description: 'Papelada atrasa tudo.', flavor: 'Processos lentos desanimam.', tier: 1 },
  { id: 'pothole', name: 'Buracos na Estrada', emoji: '🕳️', type: 'erosion', target: 'OE', power: 3,
    effects: { ra: 0, oe: -3, ao: -1 }, description: 'Estradas deteriorando.', flavor: 'Manutenção é essencial.', tier: 1 },

  // Tier 2 (moderate)
  { id: 'heavy_rain', name: 'Tempestade', emoji: '⛈️', type: 'storm', target: 'OE', power: 7,
    effects: { ra: -2, oe: -7, ao: -3 }, description: 'Tempestade forte causa estragos.', flavor: 'A natureza é poderosa.', tier: 2 },
  { id: 'smog', name: 'Nuvem de Poluição', emoji: '🏭', type: 'pollution', target: 'RA', power: 8,
    effects: { ra: -8, oe: -2, ao: -3 }, description: 'Poluição tóxica no ar.', flavor: 'O preço do progresso sem cuidado.', tier: 2 },
  { id: 'protest', name: 'Protesto Popular', emoji: '✊', type: 'corruption', target: 'AO', power: 7,
    effects: { ra: 0, oe: -3, ao: -7 }, description: 'Moradores insatisfeitos protestam.', flavor: 'O povo quer ser ouvido.', tier: 2 },
  { id: 'overcrowding', name: 'Superlotação', emoji: '👥', type: 'overcrowding', target: 'OE', power: 6,
    effects: { ra: -3, oe: -6, ao: -4 }, description: 'Cidade lotada demais!', flavor: 'Crescer sem planejar é perigoso.', tier: 2 },
  { id: 'landslide', name: 'Deslizamento', emoji: '🪨', type: 'erosion', target: 'OE', power: 8,
    effects: { ra: -3, oe: -8, ao: -2 }, description: 'Terra desliza encosta abaixo.', flavor: 'Sem árvores, o solo não segura.', tier: 2 },
  { id: 'epidemic', name: 'Surto de Doença', emoji: '🦠', type: 'disease', target: 'AO', power: 7,
    effects: { ra: 0, oe: -4, ao: -7 }, description: 'Doença se espalha na comunidade.', flavor: 'Saúde pública é prioridade.', tier: 2 },

  // Tier 3 (severe)
  { id: 'hurricane', name: 'Furacão', emoji: '🌪️', type: 'storm', target: 'OE', power: 12,
    effects: { ra: -5, oe: -12, ao: -5 }, description: 'Furacão devastador!', flavor: 'A fúria da natureza.', tier: 3 },
  { id: 'toxic_spill', name: 'Vazamento Tóxico', emoji: '☢️', type: 'pollution', target: 'RA', power: 14,
    effects: { ra: -14, oe: -3, ao: -5 }, description: 'Contaminação química grave!', flavor: 'Devastação ambiental.', tier: 3 },
  { id: 'total_chaos', name: 'Caos Total', emoji: '🔥', type: 'corruption', target: 'AO', power: 12,
    effects: { ra: -3, oe: -5, ao: -12 }, description: 'Governança colapsou!', flavor: 'Sem liderança, tudo desmorona.', tier: 3 },
  { id: 'mass_exodus', name: 'Êxodo em Massa', emoji: '🏚️', type: 'exodus', target: 'OE', power: 10,
    effects: { ra: 0, oe: -10, ao: -8, coins: -20 }, description: 'Moradores abandonam a cidade!', flavor: 'Quando não há esperança, partem.', tier: 3 },
];

// ── BIOME-SPECIFIC THREATS ──────────────────────────────────

const BIOME_THREATS: ThreatCard[] = [
  // Floresta
  { id: 'wildfire', name: 'Incêndio Florestal', emoji: '🔥', type: 'fire', target: 'RA', power: 10,
    effects: { ra: -10, oe: -3, ao: -2 }, description: 'Queimada na floresta!', flavor: 'O fogo destrói tudo.', tier: 2, biomeOnly: 'floresta' },
  { id: 'illegal_logging', name: 'Desmatamento Ilegal', emoji: '🪓', type: 'deforestation', target: 'RA', power: 9,
    effects: { ra: -9, oe: 2, ao: -4 }, description: 'Madeireiros avançam.', flavor: 'A ganância derruba a floresta.', tier: 2, biomeOnly: 'floresta' },

  // Praia
  { id: 'oil_spill', name: 'Mancha de Óleo', emoji: '🛢️', type: 'pollution', target: 'RA', power: 11,
    effects: { ra: -11, oe: -2, ao: -3 }, description: 'Óleo contamina a costa!', flavor: 'O mar pede socorro.', tier: 2, biomeOnly: 'praia' },
  { id: 'coastal_erosion', name: 'Erosão Costeira', emoji: '🌊', type: 'erosion', target: 'OE', power: 8,
    effects: { ra: -3, oe: -8, ao: -2 }, description: 'O mar avança sobre a terra.', flavor: 'A costa recua sem proteção.', tier: 2, biomeOnly: 'praia' },

  // Montanha
  { id: 'avalanche', name: 'Avalanche', emoji: '❄️', type: 'storm', target: 'OE', power: 10,
    effects: { ra: -3, oe: -10, ao: -3 }, description: 'Avalanche desce a montanha!', flavor: 'A neve pode ser cruel.', tier: 2, biomeOnly: 'montanha' },
  { id: 'mining', name: 'Mineração Predatória', emoji: '⛏️', type: 'deforestation', target: 'RA', power: 9,
    effects: { ra: -9, oe: 3, ao: -5 }, description: 'Mineração destrói encostas.', flavor: 'Riqueza de curto prazo, ruína eterna.', tier: 2, biomeOnly: 'montanha' },

  // Cerrado
  { id: 'severe_drought', name: 'Seca Severa', emoji: '🏜️', type: 'drought', target: 'RA', power: 9,
    effects: { ra: -9, oe: -2, ao: -3 }, description: 'Seca extrema!', flavor: 'O cerrado queima de sede.', tier: 2, biomeOnly: 'cerrado' },
  { id: 'monoculture', name: 'Monocultura Invasiva', emoji: '🌾', type: 'deforestation', target: 'RA', power: 8,
    effects: { ra: -8, oe: 3, ao: -4 }, description: 'Plantações destroem o cerrado.', flavor: 'Diversidade é resistência.', tier: 2, biomeOnly: 'cerrado' },

  // Lagoa
  { id: 'algae_bloom', name: 'Floração de Algas', emoji: '🟢', type: 'pollution', target: 'RA', power: 8,
    effects: { ra: -8, oe: -2, ao: -3 }, description: 'Algas cobrem a lagoa!', flavor: 'Nutrientes demais sufocam a vida.', tier: 2, biomeOnly: 'lagoa' },
  { id: 'fish_death', name: 'Morte de Peixes', emoji: '🐟', type: 'pollution', target: 'RA', power: 9,
    effects: { ra: -9, oe: -3, ao: -4 }, description: 'Peixes morrem na lagoa!', flavor: 'A água tóxica mata.', tier: 2, biomeOnly: 'lagoa' },

  // Cidade
  { id: 'traffic_jam', name: 'Trânsito Parado', emoji: '🚗', type: 'pollution', target: 'OE', power: 6,
    effects: { ra: -4, oe: -6, ao: -2 }, description: 'Congestionamento total!', flavor: 'A cidade para.', tier: 2, biomeOnly: 'cidade' },
  { id: 'gentrification', name: 'Gentrificação', emoji: '🏢', type: 'exodus', target: 'AO', power: 8,
    effects: { ra: -2, oe: 2, ao: -8 }, description: 'Moradores expulsos pelo custo.', flavor: 'O progresso sem inclusão exclui.', tier: 2, biomeOnly: 'cidade' },
];

// ── THREAT GENERATION ──────────────────────────────────────

/** Get the threat pool for a given biome */
export function getThreatPool(biome: BiomeType): ThreatCard[] {
  const biomeSpecific = BIOME_THREATS.filter(t => t.biomeOnly === biome);
  return [...UNIVERSAL_THREATS, ...biomeSpecific];
}

/** Generate threats for a turn based on game state */
export function generateThreats(
  biome: BiomeType,
  turn: number,
  bars: { ra: number; oe: number; ao: number },
): ThreatCard[] {
  const pool = getThreatPool(biome);
  
  // Determine how many threats to generate (1-3 based on turn)
  const baseCount = turn <= 3 ? 1 : turn <= 8 ? 2 : Math.min(3, 1 + Math.floor(turn / 5));
  
  // Determine max tier based on turn
  const maxTier = turn <= 4 ? 1 : turn <= 10 ? 2 : 3;
  
  // Filter by tier
  const eligible = pool.filter(t => t.tier <= maxTier);
  
  // Weight towards threats that target low pillars (smarter AI)
  const weighted = eligible.map(t => {
    let weight = 1;
    if (t.target === 'RA' && bars.ra < 40) weight += 2;
    if (t.target === 'OE' && bars.oe < 40) weight += 2;
    if (t.target === 'AO' && bars.ao < 40) weight += 2;
    // Higher tier = less frequent
    if (t.tier === 2) weight *= 0.6;
    if (t.tier === 3) weight *= 0.3;
    return { threat: t, weight };
  });
  
  // Pick threats
  const threats: ThreatCard[] = [];
  for (let i = 0; i < baseCount; i++) {
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;
    
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) {
        // Avoid exact duplicates
        if (!threats.find(t => t.id === w.threat.id)) {
          threats.push({ ...w.threat });
        }
        break;
      }
    }
  }
  
  return threats;
}

/** Threat target colors */
export const THREAT_TARGET_COLORS: Record<string, { gradient: string; glow: string }> = {
  RA: { gradient: 'from-red-600 to-orange-600', glow: 'shadow-red-500/50' },
  OE: { gradient: 'from-purple-600 to-pink-600', glow: 'shadow-purple-500/50' },
  AO: { gradient: 'from-gray-700 to-gray-900', glow: 'shadow-gray-500/50' },
};

export const THREAT_TYPE_ICONS: Record<ThreatType, string> = {
  pollution: '☠️',
  storm: '⛈️',
  overcrowding: '👥',
  deforestation: '🪓',
  corruption: '💀',
  drought: '🏜️',
  erosion: '🌊',
  fire: '🔥',
  disease: '🦠',
  exodus: '🏚️',
};

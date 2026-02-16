export type CellType = 'empty' | 'player' | 'treasure' | 'trap' | 'riddle' | 'exit' | 'wall' | 'fog';

export interface Position {
  row: number;
  col: number;
}

export interface TreasureItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  points: number;
}

export interface Trap {
  id: string;
  name: string;
  emoji: string;
  description: string;
  damage: number;
}

export interface Riddle {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reward: number;
}

export interface MapCell {
  type: CellType;
  revealed: boolean;
  item?: TreasureItem;
  trap?: Trap;
  riddle?: Riddle;
}

export interface MapTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  bgEmoji: string;
}

export interface TreasureGameState {
  map: MapCell[][];
  player: Position;
  score: number;
  health: number;
  maxHealth: number;
  moves: number;
  treasuresCollected: number;
  totalTreasures: number;
  riddlesSolved: number;
  trapsHit: number;
  isGameOver: boolean;
  isVictory: boolean;
  currentRiddle: Riddle | null;
  riddlePosition: Position | null;
  theme: MapTheme;
  message: string | null;
}

export const MAP_THEMES: MapTheme[] = [
  { id: 'floresta', name: 'Floresta Tropical', emoji: '🌳', description: 'Explore a densa floresta tropical coletando sementes raras', gradient: 'from-green-900 via-emerald-800 to-green-950', bgEmoji: '🌿' },
  { id: 'oceano', name: 'Fundo do Oceano', emoji: '🌊', description: 'Mergulhe no oceano e resgate tesouros marinhos', gradient: 'from-blue-900 via-cyan-800 to-blue-950', bgEmoji: '🐚' },
  { id: 'montanha', name: 'Trilha da Montanha', emoji: '⛰️', description: 'Escale as montanhas e encontre cristais ecológicos', gradient: 'from-slate-800 via-indigo-900 to-slate-900', bgEmoji: '🪨' },
  { id: 'mangue', name: 'Manguezal', emoji: '🦀', description: 'Navegue pelo mangue protegendo espécies ameaçadas', gradient: 'from-teal-900 via-emerald-900 to-lime-950', bgEmoji: '🌴' },
];

export const TREASURES: Record<string, TreasureItem[]> = {
  floresta: [
    { id: 't1', name: 'Semente Rara', emoji: '🌱', description: 'Uma semente de espécie nativa ameaçada', points: 15 },
    { id: 't2', name: 'Orquídea Especial', emoji: '🌺', description: 'Orquídea endêmica da mata atlântica', points: 20 },
    { id: 't3', name: 'Mel Silvestre', emoji: '🍯', description: 'Mel de abelhas nativas sem ferrão', points: 10 },
    { id: 't4', name: 'Fruto do Cerrado', emoji: '🫐', description: 'Fruto nutritivo e medicinal', points: 12 },
    { id: 't5', name: 'Madeira Certificada', emoji: '🪵', description: 'Amostra de manejo sustentável', points: 18 },
  ],
  oceano: [
    { id: 't1', name: 'Coral Restaurado', emoji: '🪸', description: 'Fragmento de recife em recuperação', points: 20 },
    { id: 't2', name: 'Pérola Natural', emoji: '🫧', description: 'Pérola formada naturalmente', points: 15 },
    { id: 't3', name: 'Concha Rara', emoji: '🐚', description: 'Concha de espécie protegida', points: 12 },
    { id: 't4', name: 'Alga Medicinal', emoji: '🌿', description: 'Alga com propriedades curativas', points: 10 },
    { id: 't5', name: 'Estrela do Mar', emoji: '⭐', description: 'Espécie indicadora de saúde marinha', points: 18 },
  ],
  montanha: [
    { id: 't1', name: 'Cristal Quartzo', emoji: '💎', description: 'Cristal formado ao longo de milênios', points: 20 },
    { id: 't2', name: 'Nascente Pura', emoji: '💧', description: 'Água de nascente protegida', points: 15 },
    { id: 't3', name: 'Líquen Ancestral', emoji: '🍃', description: 'Líquen centenário bioindicador', points: 12 },
    { id: 't4', name: 'Fóssil Vegetal', emoji: '🪨', description: 'Fóssil de planta antiga', points: 18 },
    { id: 't5', name: 'Erva Medicinal', emoji: '🌿', description: 'Planta medicinal de altitude', points: 10 },
  ],
  mangue: [
    { id: 't1', name: 'Muda de Mangue', emoji: '🌱', description: 'Muda para reflorestamento costeiro', points: 20 },
    { id: 't2', name: 'Ostra Nativa', emoji: '🦪', description: 'Ostra filtro natural da água', points: 12 },
    { id: 't3', name: 'Caranguejo Azul', emoji: '🦀', description: 'Espécie rara do manguezal', points: 18 },
    { id: 't4', name: 'Cavalho-marinho', emoji: '🐴', description: 'Espécie ameaçada de extinção', points: 15 },
    { id: 't5', name: 'Siri Ornamental', emoji: '🦞', description: 'Crustáceo indicador ambiental', points: 10 },
  ],
};

export const TRAPS: Record<string, Trap[]> = {
  floresta: [
    { id: 'p1', name: 'Área Desmatada', emoji: '🪓', description: 'Desmatamento ilegal!', damage: 20 },
    { id: 'p2', name: 'Queimada', emoji: '🔥', description: 'Incêndio florestal!', damage: 25 },
    { id: 'p3', name: 'Lixo Tóxico', emoji: '☠️', description: 'Descarte irregular de resíduos!', damage: 15 },
  ],
  oceano: [
    { id: 'p1', name: 'Rede de Pesca', emoji: '🪤', description: 'Rede de arrasto ilegal!', damage: 20 },
    { id: 'p2', name: 'Derrame de Óleo', emoji: '🛢️', description: 'Vazamento de petróleo!', damage: 25 },
    { id: 'p3', name: 'Plástico', emoji: '🥤', description: 'Poluição plástica no oceano!', damage: 15 },
  ],
  montanha: [
    { id: 'p1', name: 'Mineração Ilegal', emoji: '⛏️', description: 'Garimpo sem licença!', damage: 25 },
    { id: 'p2', name: 'Deslizamento', emoji: '🏔️', description: 'Erosão por desmatamento!', damage: 20 },
    { id: 'p3', name: 'Agrotóxico', emoji: '💀', description: 'Contaminação química!', damage: 15 },
  ],
  mangue: [
    { id: 'p1', name: 'Aterramento', emoji: '🏗️', description: 'Destruição do mangue para construção!', damage: 25 },
    { id: 'p2', name: 'Esgoto', emoji: '🚰', description: 'Esgoto in natura no mangue!', damage: 20 },
    { id: 'p3', name: 'Pesca Predatória', emoji: '🎣', description: 'Pesca com explosivos!', damage: 15 },
  ],
};

export const RIDDLES: Riddle[] = [
  { id: 'r1', question: 'Qual gás as árvores absorvem da atmosfera?', options: ['Oxigênio', 'Gás Carbônico', 'Nitrogênio', 'Hélio'], correctIndex: 1, explanation: 'Árvores absorvem CO₂ no processo de fotossíntese!', reward: 25 },
  { id: 'r2', question: 'O que significa a sigla ESG?', options: ['Energia Solar Global', 'Environmental Social Governance', 'Estratégia Sustentável Geral', 'Ecologia e Saúde Global'], correctIndex: 1, explanation: 'ESG se refere a práticas Ambientais, Sociais e de Governança.', reward: 20 },
  { id: 'r3', question: 'Qual é o maior bioma brasileiro?', options: ['Cerrado', 'Mata Atlântica', 'Amazônia', 'Pantanal'], correctIndex: 2, explanation: 'A Amazônia ocupa cerca de 49% do território brasileiro!', reward: 15 },
  { id: 'r4', question: 'O que são espécies endêmicas?', options: ['Espécies extintas', 'Espécies invasoras', 'Espécies que só existem em uma região', 'Espécies migratórias'], correctIndex: 2, explanation: 'Endêmicas são exclusivas de uma região geográfica específica.', reward: 20 },
  { id: 'r5', question: 'Qual prática reduz a pegada de carbono?', options: ['Usar carro diesel', 'Queimar lixo', 'Usar transporte público', 'Consumir mais plástico'], correctIndex: 2, explanation: 'O transporte público reduz emissões per capita significativamente.', reward: 15 },
  { id: 'r6', question: 'O que é economia circular?', options: ['Economia que cresce em círculos', 'Sistema onde tudo é reutilizado e reciclado', 'Economia baseada em moedas redondas', 'Comércio entre países vizinhos'], correctIndex: 1, explanation: 'Economia circular elimina o conceito de "lixo", tudo é recurso!', reward: 25 },
  { id: 'r7', question: 'Qual é a principal causa de extinção de espécies?', options: ['Mudança climática', 'Perda de habitat', 'Caça ilegal', 'Poluição'], correctIndex: 1, explanation: 'A destruição de habitats é a principal ameaça à biodiversidade.', reward: 20 },
  { id: 'r8', question: 'O que são Unidades de Conservação?', options: ['Fábricas verdes', 'Áreas protegidas por lei', 'Usinas de reciclagem', 'Centros de pesquisa'], correctIndex: 1, explanation: 'São áreas naturais protegidas legalmente para conservação.', reward: 15 },
];

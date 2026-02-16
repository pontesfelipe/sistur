export interface MemoryCardData {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: 'fauna' | 'flora' | 'clima' | 'sustentabilidade' | 'bioma' | 'recurso';
}

export interface MemoryCard {
  uid: string;
  pairId: string;
  side: 'image' | 'text';
  data: MemoryCardData;
  flipped: boolean;
  matched: boolean;
}

export interface MemoryTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
}

export interface MemoryGameState {
  cards: MemoryCard[];
  columns: number;
  flippedIndices: number[];
  matchedPairs: number;
  totalPairs: number;
  errors: number;
  maxErrors: number;
  moves: number;
  score: number;
  isGameOver: boolean;
  isVictory: boolean;
  theme: MemoryTheme;
  timeRemaining: number;
  maxTime: number;
  message: string | null;
  isChecking: boolean;
}

export const MEMORY_THEMES: MemoryTheme[] = [
  { id: 'floresta', name: 'Floresta Tropical', emoji: '🌳', description: 'Descubra os segredos da fauna e flora tropical', gradient: 'from-green-900 via-emerald-800 to-green-950' },
  { id: 'oceano', name: 'Fundo do Oceano', emoji: '🌊', description: 'Associe criaturas marinhas e seus habitats', gradient: 'from-blue-900 via-cyan-800 to-blue-950' },
  { id: 'montanha', name: 'Trilha da Montanha', emoji: '⛰️', description: 'Conecte fenômenos naturais e ecossistemas', gradient: 'from-slate-800 via-indigo-900 to-slate-900' },
  { id: 'mangue', name: 'Manguezal', emoji: '🦀', description: 'Identifique espécies e conceitos da zona costeira', gradient: 'from-teal-900 via-emerald-900 to-lime-950' },
];

export const MEMORY_PAIRS: Record<string, MemoryCardData[]> = {
  floresta: [
    { id: 'f1', emoji: '🌳', name: 'Árvore Nativa', description: 'Absorve CO₂ e produz oxigênio pela fotossíntese', category: 'flora' },
    { id: 'f2', emoji: '🦜', name: 'Arara-azul', description: 'Ave ameaçada de extinção que depende de palmeiras', category: 'fauna' },
    { id: 'f3', emoji: '🌱', name: 'Reflorestamento', description: 'Plantio de espécies nativas para restaurar ecossistemas', category: 'sustentabilidade' },
    { id: 'f4', emoji: '🐆', name: 'Onça-pintada', description: 'Maior felino das Américas, topo da cadeia alimentar', category: 'fauna' },
    { id: 'f5', emoji: '🍯', name: 'Abelha Nativa', description: 'Polinizadora essencial para 75% das culturas agrícolas', category: 'fauna' },
    { id: 'f6', emoji: '🌺', name: 'Orquídea', description: 'Planta epífita indicadora de floresta preservada', category: 'flora' },
    { id: 'f7', emoji: '♻️', name: 'Reciclagem', description: 'Processo de transformar resíduos em novos produtos', category: 'sustentabilidade' },
    { id: 'f8', emoji: '🌍', name: 'Biodiversidade', description: 'Variedade de seres vivos em um ecossistema', category: 'bioma' },
    { id: 'f9', emoji: '💧', name: 'Nascente', description: 'Ponto onde a água subterrânea brota na superfície', category: 'recurso' },
    { id: 'f10', emoji: '🐒', name: 'Macaco-muriqui', description: 'Primata endêmico da Mata Atlântica em risco crítico', category: 'fauna' },
    { id: 'f11', emoji: '🪵', name: 'Manejo Florestal', description: 'Uso sustentável da madeira sem destruir a floresta', category: 'sustentabilidade' },
    { id: 'f12', emoji: '🦋', name: 'Borboleta-morpho', description: 'Inseto polinizador e bioindicador de saúde ambiental', category: 'fauna' },
  ],
  oceano: [
    { id: 'o1', emoji: '🐋', name: 'Baleia-jubarte', description: 'Mamífero marinho migratório que se reproduz na costa brasileira', category: 'fauna' },
    { id: 'o2', emoji: '🪸', name: 'Recife de Coral', description: 'Ecossistema marinho que abriga 25% das espécies oceânicas', category: 'bioma' },
    { id: 'o3', emoji: '🐢', name: 'Tartaruga Marinha', description: 'Réptil ameaçado por plástico e perda de habitat costeiro', category: 'fauna' },
    { id: 'o4', emoji: '🌊', name: 'Corrente Marinha', description: 'Movimento de água que regula o clima global do planeta', category: 'clima' },
    { id: 'o5', emoji: '🦈', name: 'Tubarão', description: 'Predador de topo essencial para o equilíbrio marinho', category: 'fauna' },
    { id: 'o6', emoji: '🫧', name: 'Fitoplâncton', description: 'Produz mais de 50% do oxigênio da atmosfera terrestre', category: 'flora' },
    { id: 'o7', emoji: '🐙', name: 'Polvo', description: 'Molusco inteligente indicador de saúde do ecossistema', category: 'fauna' },
    { id: 'o8', emoji: '🥤', name: 'Poluição Plástica', description: '8 milhões de toneladas de plástico vão ao oceano por ano', category: 'sustentabilidade' },
    { id: 'o9', emoji: '🐠', name: 'Peixe-palhaço', description: 'Vive em simbiose com anêmonas nos recifes de coral', category: 'fauna' },
    { id: 'o10', emoji: '🦑', name: 'Lula Gigante', description: 'Espécie das profundezas essencial na cadeia alimentar', category: 'fauna' },
    { id: 'o11', emoji: '🏖️', name: 'Zona Costeira', description: 'Área de transição entre terra e mar, rica em vida', category: 'bioma' },
    { id: 'o12', emoji: '⚓', name: 'Pesca Sustentável', description: 'Captura que respeita limites de reprodução das espécies', category: 'sustentabilidade' },
  ],
  montanha: [
    { id: 'm1', emoji: '🦅', name: 'Águia', description: 'Ave de rapina que controla populações de roedores', category: 'fauna' },
    { id: 'm2', emoji: '❄️', name: 'Geleira', description: 'Reservatório natural de água doce em derretimento acelerado', category: 'clima' },
    { id: 'm3', emoji: '🌿', name: 'Líquen', description: 'Bioindicador que só cresce em ambientes não poluídos', category: 'flora' },
    { id: 'm4', emoji: '🏔️', name: 'Nascente de Rio', description: 'Origem dos rios protegida por APPs — Áreas Preservadas', category: 'recurso' },
    { id: 'm5', emoji: '🌬️', name: 'Energia Eólica', description: 'Fonte renovável que usa a força do vento sem poluir', category: 'sustentabilidade' },
    { id: 'm6', emoji: '🦎', name: 'Lagarto de Altitude', description: 'Réptil endêmico que vive apenas em altitudes elevadas', category: 'fauna' },
    { id: 'm7', emoji: '🪨', name: 'Erosão do Solo', description: 'Desgaste causado por desmatamento e chuvas intensas', category: 'clima' },
    { id: 'm8', emoji: '☀️', name: 'Energia Solar', description: 'Captação de luz do sol para gerar eletricidade limpa', category: 'sustentabilidade' },
    { id: 'm9', emoji: '🌲', name: 'Araucária', description: 'Árvore símbolo do Sul, ameaçada de extinção', category: 'flora' },
    { id: 'm10', emoji: '💎', name: 'Mineração', description: 'Extração de recursos que pode degradar ecossistemas', category: 'recurso' },
    { id: 'm11', emoji: '🐻', name: 'Lobo-guará', description: 'Maior canídeo da América do Sul, símbolo do Cerrado', category: 'fauna' },
    { id: 'm12', emoji: '🌡️', name: 'Aquecimento Global', description: 'Aumento da temperatura média da Terra por gases estufa', category: 'clima' },
  ],
  mangue: [
    { id: 'g1', emoji: '🦀', name: 'Caranguejo-uçá', description: 'Crustáceo essencial para a cadeia alimentar do mangue', category: 'fauna' },
    { id: 'g2', emoji: '🌴', name: 'Mangue-vermelho', description: 'Árvore com raízes aéreas que filtra sal da água', category: 'flora' },
    { id: 'g3', emoji: '🐟', name: 'Berçário Marinho', description: 'Manguezais são locais de reprodução de 80% dos peixes', category: 'bioma' },
    { id: 'g4', emoji: '🦪', name: 'Ostra de Mangue', description: 'Molusco que filtra até 200 litros de água por dia', category: 'fauna' },
    { id: 'g5', emoji: '🌱', name: 'Carbono Azul', description: 'Manguezais armazenam até 10x mais carbono que florestas', category: 'clima' },
    { id: 'g6', emoji: '🐊', name: 'Jacaré-do-papo-amarelo', description: 'Réptil que ajuda a controlar populações de peixes', category: 'fauna' },
    { id: 'g7', emoji: '🚰', name: 'Esgoto in natura', description: 'Principal ameaça aos manguezais: poluição por esgoto', category: 'sustentabilidade' },
    { id: 'g8', emoji: '🦩', name: 'Guará-vermelho', description: 'Ave icônica dos mangues cuja cor vem dos crustáceos', category: 'fauna' },
    { id: 'g9', emoji: '🏗️', name: 'Aterramento', description: 'Destruição ilegal de mangues para construção urbana', category: 'sustentabilidade' },
    { id: 'g10', emoji: '🐴', name: 'Cavalo-marinho', description: 'Peixe ameaçado que se camufla entre raízes do mangue', category: 'fauna' },
    { id: 'g11', emoji: '🌊', name: 'Proteção Costeira', description: 'Manguezais protegem a costa contra tsunamis e erosão', category: 'bioma' },
    { id: 'g12', emoji: '🤝', name: 'Comunidade Ribeirinha', description: 'Populações tradicionais que dependem do manguezal', category: 'sustentabilidade' },
  ],
};

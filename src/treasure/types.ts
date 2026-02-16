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
  riddleErrors: number;
  maxRiddleErrors: number;
  trapsHit: number;
  isGameOver: boolean;
  isVictory: boolean;
  currentRiddle: Riddle | null;
  riddlePosition: Position | null;
  theme: MapTheme;
  message: string | null;
  timeRemaining: number;
  maxTime: number;
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
  { id: 'r9', question: 'Qual é o papel dos manguezais?', options: ['Produzir madeira', 'Berçário de espécies marinhas', 'Gerar energia eólica', 'Filtrar poluição do ar'], correctIndex: 1, explanation: 'Manguezais são berçários naturais para peixes e crustáceos.', reward: 20 },
  { id: 'r10', question: 'O que é pegada hídrica?', options: ['Marca de chuva no solo', 'Volume de água para produzir um bem', 'Caminho de rios no mapa', 'Nível do mar'], correctIndex: 1, explanation: 'A pegada hídrica mede o consumo total de água em cadeias produtivas.', reward: 20 },
  { id: 'r11', question: 'Qual gás é o principal causador do efeito estufa?', options: ['Oxigênio', 'Metano', 'Dióxido de carbono', 'Hidrogênio'], correctIndex: 2, explanation: 'O CO₂ é responsável por cerca de 75% do efeito estufa.', reward: 15 },
  { id: 'r12', question: 'O que significa biodiversidade?', options: ['Diversidade de biomas', 'Variedade de seres vivos', 'Tipos de solo', 'Variedade de climas'], correctIndex: 1, explanation: 'Biodiversidade é a variedade de formas de vida em um ecossistema.', reward: 20 },
  { id: 'r13', question: 'Qual material leva mais tempo para se decompor?', options: ['Papel', 'Vidro', 'Madeira', 'Tecido de algodão'], correctIndex: 1, explanation: 'O vidro pode levar mais de 1 milhão de anos para se decompor!', reward: 25 },
  { id: 'r14', question: 'O que é turismo sustentável?', options: ['Turismo barato', 'Turismo que preserva o ambiente e a cultura local', 'Turismo de aventura', 'Turismo internacional'], correctIndex: 1, explanation: 'Turismo sustentável minimiza impactos e beneficia comunidades locais.', reward: 20 },
  { id: 'r15', question: 'Qual é a função da camada de ozônio?', options: ['Produzir chuva', 'Filtrar radiação ultravioleta', 'Regular marés', 'Gerar ventos'], correctIndex: 1, explanation: 'A camada de ozônio protege a vida na Terra dos raios UV nocivos.', reward: 15 },
  { id: 'r16', question: 'O que são energias renováveis?', options: ['Energia nuclear', 'Fontes que se regeneram naturalmente', 'Combustíveis fósseis', 'Energia importada'], correctIndex: 1, explanation: 'Solar, eólica e hidrelétrica são fontes renováveis de energia.', reward: 20 },
  { id: 'r17', question: 'O que é compostagem?', options: ['Queima de lixo', 'Transformação de resíduos orgânicos em adubo', 'Reciclagem de plástico', 'Tratamento de esgoto'], correctIndex: 1, explanation: 'A compostagem transforma restos orgânicos em fertilizante natural.', reward: 15 },
  { id: 'r18', question: 'Qual bioma brasileiro é considerado berço das águas?', options: ['Amazônia', 'Cerrado', 'Pantanal', 'Caatinga'], correctIndex: 1, explanation: 'O Cerrado abriga nascentes de grandes bacias hidrográficas brasileiras.', reward: 20 },
  { id: 'r19', question: 'O que é aquecimento global?', options: ['Aumento da temperatura dos oceanos', 'Aumento médio da temperatura da Terra', 'Derretimento das geleiras', 'Aumento das chuvas'], correctIndex: 1, explanation: 'É o aumento da temperatura média do planeta causado por gases de efeito estufa.', reward: 15 },
  { id: 'r20', question: 'Qual animal é considerado polinizador essencial?', options: ['Gato', 'Abelha', 'Cachorro', 'Cobra'], correctIndex: 1, explanation: 'As abelhas são responsáveis pela polinização de cerca de 75% das culturas agrícolas.', reward: 20 },
  { id: 'r21', question: 'O que é desertificação?', options: ['Criação de desertos artificiais', 'Degradação do solo em regiões áridas', 'Plantio no deserto', 'Irrigação excessiva'], correctIndex: 1, explanation: 'Desertificação é o processo de degradação do solo que o torna improdutivo.', reward: 25 },
  { id: 'r22', question: 'Qual é a principal fonte de energia do Brasil?', options: ['Petróleo', 'Hidrelétrica', 'Nuclear', 'Carvão'], correctIndex: 1, explanation: 'A energia hidrelétrica representa mais de 60% da matriz elétrica brasileira.', reward: 15 },
  { id: 'r23', question: 'O que são créditos de carbono?', options: ['Dinheiro para plantar árvores', 'Certificados que representam redução de emissões', 'Impostos sobre poluição', 'Multas ambientais'], correctIndex: 1, explanation: 'Créditos de carbono são instrumentos de mercado para compensar emissões de CO₂.', reward: 25 },
  { id: 'r24', question: 'Qual é o maior recife de coral do mundo?', options: ['Recife de Abrolhos', 'Grande Barreira de Coral', 'Recife do Caribe', 'Atol das Rocas'], correctIndex: 1, explanation: 'A Grande Barreira de Coral na Austrália tem mais de 2.300 km de extensão.', reward: 20 },
  { id: 'r25', question: 'O que significa "desenvolvimento sustentável"?', options: ['Crescimento econômico rápido', 'Desenvolvimento que atende o presente sem comprometer o futuro', 'Preservação total sem desenvolvimento', 'Industrialização verde'], correctIndex: 1, explanation: 'Busca equilibrar crescimento econômico, justiça social e preservação ambiental.', reward: 20 },
  { id: 'r26', question: 'Qual é o efeito do desmatamento nos rios?', options: ['Aumenta o volume de água', 'Causa assoreamento e seca', 'Melhora a qualidade da água', 'Não tem efeito'], correctIndex: 1, explanation: 'O desmatamento causa erosão e assoreamento, reduzindo a capacidade dos rios.', reward: 15 },
  { id: 'r27', question: 'O que são Objetivos de Desenvolvimento Sustentável (ODS)?', options: ['Metas do governo brasileiro', 'Agenda global da ONU com 17 objetivos', 'Regras de comércio internacional', 'Leis ambientais europeias'], correctIndex: 1, explanation: 'Os 17 ODS da ONU são uma agenda global para 2030 envolvendo todos os países.', reward: 25 },
  { id: 'r28', question: 'Qual a importância das áreas de preservação permanente (APP)?', options: ['São áreas para construção', 'Protegem recursos hídricos e biodiversidade', 'São reservas de madeira', 'São áreas de mineração'], correctIndex: 1, explanation: 'APPs protegem margens de rios, nascentes, topos de morros e encostas.', reward: 20 },
  { id: 'r29', question: 'O que é lixo eletrônico?', options: ['Spam na internet', 'Equipamentos eletrônicos descartados', 'Energia desperdiçada', 'Dados deletados'], correctIndex: 1, explanation: 'Lixo eletrônico contém metais pesados tóxicos e exige descarte especial.', reward: 15 },
  { id: 'r30', question: 'Qual prática agrícola preserva o solo?', options: ['Queimada', 'Monocultura', 'Plantio direto', 'Uso intensivo de agrotóxicos'], correctIndex: 2, explanation: 'O plantio direto mantém a cobertura vegetal e protege o solo da erosão.', reward: 20 },
  { id: 'r31', question: 'O que é a Mata Atlântica?', options: ['Floresta do norte do Brasil', 'Bioma costeiro com alta biodiversidade', 'Savana tropical', 'Floresta de pinheiros'], correctIndex: 1, explanation: 'A Mata Atlântica é um dos biomas mais ameaçados, restando cerca de 12% da área original.', reward: 25 },
  { id: 'r32', question: 'Qual é a função dos corredores ecológicos?', options: ['Estradas para animais', 'Conectar fragmentos de habitat', 'Trilhas para turistas', 'Canais de irrigação'], correctIndex: 1, explanation: 'Corredores ecológicos permitem o fluxo genético entre populações isoladas.', reward: 20 },
];

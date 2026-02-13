import type { Building, GameEvent, CouncilDecision } from './types';

export const GRID_SIZE = 6;

export const BUILDINGS: Building[] = [
  // RA - Natureza
  { id: 'tree', name: 'Árvore', emoji: '🌳', category: 'RA', effects: { ra: 8, oe: 0, ao: 0 }, cost: 5, description: 'Plante uma árvore!', color: '#2d8a4e', height: 1.2, unlockLevel: 1 },
  { id: 'park', name: 'Parque', emoji: '🌿', category: 'RA', effects: { ra: 12, oe: 2, ao: 2 }, cost: 15, description: 'Área verde para todos', color: '#3cb371', height: 0.5, unlockLevel: 1 },
  { id: 'reserve', name: 'Área Protegida', emoji: '🦜', category: 'RA', effects: { ra: 18, oe: -2, ao: 3 }, cost: 25, description: 'Protege a natureza!', color: '#228b22', height: 1.5, unlockLevel: 2 },
  { id: 'trail', name: 'Trilha', emoji: '🥾', category: 'RA', effects: { ra: 6, oe: 4, ao: 1 }, cost: 10, description: 'Caminho na natureza', color: '#8b6914', height: 0.2, unlockLevel: 1 },
  { id: 'garden', name: 'Jardim', emoji: '🌻', category: 'RA', effects: { ra: 10, oe: 3, ao: 1 }, cost: 12, description: 'Flores e borboletas', color: '#90ee90', height: 0.6, unlockLevel: 2 },

  // OE - Infraestrutura
  { id: 'house', name: 'Casa', emoji: '🏠', category: 'OE', effects: { ra: -2, oe: 8, ao: 1 }, cost: 10, description: 'Moradia para famílias', color: '#d4a574', height: 1.5, unlockLevel: 1 },
  { id: 'school', name: 'Escola', emoji: '🏫', category: 'OE', effects: { ra: 0, oe: 10, ao: 5 }, cost: 20, description: 'Educação para todos', color: '#ffd700', height: 2.0, unlockLevel: 1 },
  { id: 'hotel', name: 'Hotel', emoji: '🏨', category: 'OE', effects: { ra: -5, oe: 15, ao: 2 }, cost: 30, description: 'Hospedagem para visitantes', color: '#4169e1', height: 2.5, unlockLevel: 2 },
  { id: 'clean_transport', name: 'Transporte Limpo', emoji: '🚲', category: 'OE', effects: { ra: 3, oe: 8, ao: 2 }, cost: 15, description: 'Ciclovias e bondinhos', color: '#87ceeb', height: 0.8, unlockLevel: 2 },
  { id: 'dirty_transport', name: 'Transporte Poluente', emoji: '🚗', category: 'OE', effects: { ra: -8, oe: 12, ao: 1 }, cost: 10, description: 'Cuidado com a poluição!', color: '#696969', height: 1.0, unlockLevel: 1 },
  { id: 'hospital', name: 'Hospital', emoji: '🏥', category: 'OE', effects: { ra: 0, oe: 12, ao: 4 }, cost: 35, description: 'Saúde para todos', color: '#ff6b6b', height: 2.2, unlockLevel: 3 },

  // AO - Organização
  { id: 'council', name: 'Conselho Mirim', emoji: '🤝', category: 'AO', effects: { ra: 2, oe: 2, ao: 15 }, cost: 20, description: 'Decisões em grupo!', color: '#9b59b6', height: 1.8, unlockLevel: 1 },
  { id: 'cleanup', name: 'Programa de Limpeza', emoji: '🧹', category: 'AO', effects: { ra: 5, oe: 3, ao: 10 }, cost: 12, description: 'Cidade limpa e bonita', color: '#1abc9c', height: 0.4, unlockLevel: 1 },
  { id: 'signs', name: 'Placas Educativas', emoji: '🪧', category: 'AO', effects: { ra: 3, oe: 1, ao: 8 }, cost: 8, description: 'Informação para todos', color: '#e67e22', height: 1.0, unlockLevel: 1 },
  { id: 'community_center', name: 'Centro Comunitário', emoji: '🏛️', category: 'AO', effects: { ra: 1, oe: 5, ao: 12 }, cost: 25, description: 'Lugar de encontro', color: '#e74c3c', height: 2.0, unlockLevel: 2 },
  { id: 'recycling', name: 'Reciclagem', emoji: '♻️', category: 'AO', effects: { ra: 8, oe: 2, ao: 8 }, cost: 15, description: 'Cuide do lixo!', color: '#27ae60', height: 0.6, unlockLevel: 3 },
];

export const EVENTS: GameEvent[] = [
  {
    id: 'storm',
    name: 'Chuva Forte',
    emoji: '🌧️',
    description: 'Uma tempestade atingiu sua vila! O que fazer?',
    choices: [
      { label: 'Plantar árvores para segurar a terra', type: 'smart', emoji: '🌳', effects: { ra: 10, oe: -3, ao: 5 }, message: 'As árvores protegeram o solo! Boa escolha! 🌟' },
      { label: 'Construir um muro rápido', type: 'quick', emoji: '🧱', effects: { ra: -5, oe: 8, ao: 0 }, message: 'O muro ajudou, mas causou erosão...' },
      { label: 'Esperar a chuva passar', type: 'risky', emoji: '🤞', effects: { ra: -8, oe: -5, ao: -3 }, message: 'A enchente causou danos! 😢' },
    ],
  },
  {
    id: 'festival',
    name: 'Festival Cultural',
    emoji: '🎉',
    description: 'A cidade quer fazer um festival! Como organizar?',
    choices: [
      { label: 'Festival eco-cultural ao ar livre', type: 'smart', emoji: '🎭', effects: { ra: 5, oe: 5, ao: 8, coins: 20 }, message: 'Festival incrível e sustentável! 🎊' },
      { label: 'Grande show com fogos', type: 'quick', emoji: '🎆', effects: { ra: -10, oe: 8, ao: 3, coins: 15 }, message: 'Foi divertido, mas os animais fugiram...' },
      { label: 'Rifa surpresa de prêmios', type: 'risky', emoji: '🎰', effects: { ra: 0, oe: 0, ao: -5, coins: 30 }, message: 'Ganhou dinheiro mas ninguém organizou nada...' },
    ],
  },
  {
    id: 'rare_animal',
    name: 'Animal Raro',
    emoji: '🐆',
    description: 'Um animal raro apareceu perto da vila!',
    choices: [
      { label: 'Criar área protegida', type: 'smart', emoji: '🌿', effects: { ra: 15, oe: -3, ao: 5 }, message: 'O animal está protegido e atrai visitantes! 🦋' },
      { label: 'Fazer um zoológico', type: 'quick', emoji: '🏗️', effects: { ra: -8, oe: 10, ao: 2, coins: 10 }, message: 'O animal ficou triste preso...' },
      { label: 'Tirar fotos e postar', type: 'risky', emoji: '📸', effects: { ra: -3, oe: 3, ao: -2, coins: 5 }, message: 'As fotos fizeram sucesso, mas o animal fugiu!' },
    ],
  },
  {
    id: 'vip_visitor',
    name: 'Visitante Especial',
    emoji: '🧑‍💼',
    description: 'Um visitante famoso quer conhecer sua vila!',
    choices: [
      { label: 'Mostrar a natureza e a cultura local', type: 'smart', emoji: '🗺️', effects: { ra: 5, oe: 5, ao: 10, coins: 25 }, message: 'Ele adorou e vai contar para todo mundo! ⭐' },
      { label: 'Construir coisas novas rápido', type: 'quick', emoji: '🏗️', effects: { ra: -8, oe: 12, ao: -3, coins: 15 }, message: 'Ficou bonito por fora, mas não é de verdade...' },
      { label: 'Fazer uma festa surpresa', type: 'risky', emoji: '🎊', effects: { ra: -2, oe: 2, ao: -5, coins: 10 }, message: 'A festa foi legal, mas desorganizada!' },
    ],
  },
  {
    id: 'pollution',
    name: 'Poluição Inesperada',
    emoji: '🏭',
    description: 'Uma fábrica quer se instalar perto da vila!',
    choices: [
      { label: 'Recusar e criar eco-negócios', type: 'smart', emoji: '🌱', effects: { ra: 8, oe: 5, ao: 8 }, message: 'Economia verde e sustentável! 💚' },
      { label: 'Aceitar a fábrica', type: 'quick', emoji: '💰', effects: { ra: -15, oe: 10, ao: -5, coins: 30 }, message: 'Dinheiro fácil, mas a natureza sofreu muito...' },
      { label: 'Negociar com condições', type: 'risky', emoji: '🤝', effects: { ra: -5, oe: 8, ao: 5, coins: 15 }, message: 'Conseguiu um acordo, mas é arriscado...' },
    ],
  },
  {
    id: 'drought',
    name: 'Seca Prolongada',
    emoji: '☀️',
    description: 'Não chove há semanas! A água está acabando!',
    choices: [
      { label: 'Cisterna e reflorestamento', type: 'smart', emoji: '💧', effects: { ra: 12, oe: 3, ao: 8 }, message: 'Água guardada e árvores atraem chuva! 🌧️' },
      { label: 'Comprar água de caminhão', type: 'quick', emoji: '🚛', effects: { ra: -3, oe: 5, ao: 0, coins: -15 }, message: 'Resolveu agora, mas e amanhã?' },
      { label: 'Dança da chuva', type: 'risky', emoji: '💃', effects: { ra: 2, oe: -2, ao: 3 }, message: 'A dança animou todo mundo, mas a chuva não veio...' },
    ],
    condition: (bars) => bars.ra < 60,
  },
  {
    id: 'tourists',
    name: 'Onda de Turistas',
    emoji: '🧳',
    description: 'Muitos turistas querem visitar sua vila!',
    choices: [
      { label: 'Turismo controlado com guias', type: 'smart', emoji: '🗺️', effects: { ra: 2, oe: 8, ao: 10, coins: 25 }, message: 'Turismo responsável! Todos felizes! 😊' },
      { label: 'Abrir tudo sem limites', type: 'quick', emoji: '🚪', effects: { ra: -12, oe: 5, ao: -8, coins: 35 }, message: 'Muito dinheiro, mas a vila ficou suja e barulhenta...' },
      { label: 'Fechar a vila por uma semana', type: 'risky', emoji: '🚫', effects: { ra: 5, oe: -5, ao: 5, coins: -10 }, message: 'Descansou, mas perdeu visitantes...' },
    ],
    condition: (bars) => bars.oe > 40,
  },
];

export const COUNCIL_DECISIONS: CouncilDecision[] = [
  {
    id: 'festa_praca',
    question: 'Vai ter festa na praça. O que fazer primeiro?',
    emoji: '🎪',
    options: [
      { label: '🧹 Limpar a praça', effects: { ra: 5, oe: 3, ao: 8 }, feedback: 'Praça limpa e organizada! Os moradores adoraram! ✨' },
      { label: '🏗️ Construir um palco', effects: { ra: -3, oe: 10, ao: 2 }, feedback: 'Palco bonito, mas faltou organização...' },
      { label: '🌳 Plantar árvores ao redor', effects: { ra: 10, oe: 1, ao: 3 }, feedback: 'Festa com sombra natural! Que ideia boa! 🌿' },
    ],
  },
  {
    id: 'lixo_rio',
    question: 'O rio perto da vila está cheio de lixo. O que fazer?',
    emoji: '🏞️',
    options: [
      { label: '♻️ Mutirão de limpeza', effects: { ra: 12, oe: 2, ao: 10 }, feedback: 'Rio limpinho! Os peixes voltaram! 🐟' },
      { label: '🏗️ Construir muro para esconder', effects: { ra: -5, oe: 5, ao: -3 }, feedback: 'O problema não sumiu, só ficou escondido... 😕' },
      { label: '🪧 Colocar placas de aviso', effects: { ra: 3, oe: 1, ao: 8 }, feedback: 'Boas placas! Agora todo mundo sabe cuidar! 📋' },
    ],
  },
  {
    id: 'escola_nova',
    question: 'A escola precisa de uma melhoria. Qual prioridade?',
    emoji: '🏫',
    options: [
      { label: '🌳 Horta escolar', effects: { ra: 8, oe: 3, ao: 5 }, feedback: 'As crianças aprendem com a natureza! 🥬' },
      { label: '💻 Sala de computadores', effects: { ra: 0, oe: 10, ao: 3 }, feedback: 'Tecnologia na escola! Muito bom! 💡' },
      { label: '🤝 Grêmio estudantil', effects: { ra: 2, oe: 2, ao: 12 }, feedback: 'Estudantes organizados decidem juntos! 🗳️' },
    ],
  },
  {
    id: 'transporte',
    question: 'A vila precisa de transporte. Qual escolher?',
    emoji: '🚌',
    options: [
      { label: '🚲 Ciclovias', effects: { ra: 8, oe: 6, ao: 5 }, feedback: 'Transporte limpo e saudável! 🌿' },
      { label: '🚗 Estradas para carros', effects: { ra: -8, oe: 12, ao: 2 }, feedback: 'Mais rápido, mas polui mais...' },
      { label: '🚶 Calçadas largas', effects: { ra: 5, oe: 5, ao: 8 }, feedback: 'Todo mundo pode andar com segurança! 🚶‍♀️' },
    ],
  },
  {
    id: 'energia',
    question: 'Precisamos de mais energia! De onde tirar?',
    emoji: '⚡',
    options: [
      { label: '☀️ Painéis solares', effects: { ra: 10, oe: 8, ao: 5 }, feedback: 'Energia limpa do sol! Brilhante! ☀️' },
      { label: '🏭 Termoelétrica', effects: { ra: -12, oe: 15, ao: 2 }, feedback: 'Muita energia, mas muita fumaça...' },
      { label: '💨 Moinho de vento', effects: { ra: 6, oe: 6, ao: 4 }, feedback: 'O vento gera energia! Que legal! 🌬️' },
    ],
  },
];

export const AVATAR_PRESETS = {
  explorador: { name: 'Explorador(a)', emoji: '🧭', description: 'Descobre novos lugares' },
  construtor: { name: 'Construtor(a)', emoji: '🔨', description: 'Cria estruturas incríveis' },
  guardiao: { name: 'Guardião(ã)', emoji: '🛡️', description: 'Protege a natureza' },
  cientista: { name: 'Cientista', emoji: '🔬', description: 'Estuda o equilíbrio' },
};

export const SKIN_COLORS = ['#FDDBB4', '#E8B68C', '#C68642', '#8D5524', '#6B3E26', '#F5D0A9'];
export const HAIR_COLORS = ['#2C1B18', '#4A3728', '#8B6914', '#C19A6B', '#E74C3C', '#3498DB'];
export const SHIRT_COLORS = ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

import { useState, useCallback } from 'react';
import type { GameBars, GameLevel, BiomeType, AvatarConfig, ProfileScores, EduMetrics, AvatarPreset } from './types';
import { LEVEL_XP, BIOME_MODIFIERS, UNLOCKABLE_SKINS } from './types';
import { EVENTS, COUNCIL_DECISIONS, DISASTERS, BIOME_EVENTS } from './constants';
import type { GameCard, DeckState } from './cardTypes';
import type { ThreatCard } from './threatCards';
import { createStartingDeck, getRewardPool, pickRandomCards, shuffle } from './cardTypes';
import { generateThreats } from './threatCards';

const INITIAL_PROFILE: ProfileScores = { explorador: 0, construtor: 0, guardiao: 0, cientista: 0 };
const INITIAL_EDU_METRICS: EduMetrics = {
  proNatureDecisions: 0, proInfraDecisions: 0, proGovDecisions: 0,
  excessiveBuilding: 0, turnsInGreen: 0, turnsInRed: 0,
  totalBuildings: 0, totalEventsResolved: 0,
  smartChoices: 0, riskyChoices: 0, quickChoices: 0,
};

const DEFAULT_AVATAR: AvatarConfig = {
  preset: 'explorador',
  skinColor: '#FDDBB4',
  hairColor: '#2C1B18',
  shirtColor: '#3498DB',
};

export interface CardGameState {
  bars: GameBars;
  coins: number;
  level: GameLevel;
  xp: number;
  avatar: AvatarConfig;
  biome: BiomeType;
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
  // Card deck
  deck: DeckState;
  cardsPlayedThisTurn: number;
  maxPlaysPerTurn: number;
  // TCG board state
  boardRA: GameCard[];
  boardOE: GameCard[];
  boardAO: GameCard[];
  activeThreats: ThreatCard[];
  /** Pending event/council dialogs */
  currentEvent: any | null;
  currentCouncil: any | null;
  rewardCards: GameCard[] | null;
  playedThisTurn: GameCard[];
  totalCardsPlayed: number;
  /** Cumulative score for victory */
  totalScore: number;
  victoryTarget: number;
}

const GRID_SIZE = 6;
const createEmptyGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
const VICTORY_SCORE = 300;

function createInitialCardState(biome: BiomeType = 'floresta'): CardGameState {
  const mod = BIOME_MODIFIERS[biome];
  const startingDeck = shuffle(createStartingDeck(biome));
  const hand = startingDeck.slice(0, 5);
  const drawPile = startingDeck.slice(5);

  return {
    bars: { ra: mod.startBars.ra ?? 50, oe: mod.startBars.oe ?? 30, ao: mod.startBars.ao ?? 30 },
    coins: mod.startCoins,
    level: 1,
    xp: 0,
    avatar: DEFAULT_AVATAR,
    biome,
    turn: 0,
    visitors: 10,
    isSetup: false,
    eventLog: [],
    isGameOver: false,
    gameOverReason: null,
    isVictory: false,
    victoryReason: null,
    disasterCount: 0,
    profileScores: { ...INITIAL_PROFILE },
    eduMetrics: { ...INITIAL_EDU_METRICS },
    unlockedSkins: [],
    deck: { drawPile, hand, discardPile: [], exhaustPile: [], drawCount: 5, maxHand: 7 },
    cardsPlayedThisTurn: 0,
    maxPlaysPerTurn: 3,
    boardRA: [],
    boardOE: [],
    boardAO: [],
    activeThreats: [],
    currentEvent: null,
    currentCouncil: null,
    rewardCards: null,
    playedThisTurn: [],
    totalCardsPlayed: 0,
    totalScore: 0,
    victoryTarget: VICTORY_SCORE,
  };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function useCardGame() {
  const [state, setState] = useState<CardGameState>(createInitialCardState());

  const playCard = useCallback((cardIndex: number) => {
    setState(prev => {
      if (prev.isGameOver || prev.isVictory) return prev;
      if (prev.cardsPlayedThisTurn >= prev.maxPlaysPerTurn) return prev;
      if (prev.currentEvent || prev.currentCouncil || prev.rewardCards) return prev;

      const card = prev.deck.hand[cardIndex];
      if (!card) return prev;
      if (card.cost > prev.coins) return prev;

      // Apply effects to bars
      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + card.effects.ra),
        oe: clamp(prev.bars.oe + card.effects.oe),
        ao: clamp(prev.bars.ao + card.effects.ao),
      };

      if (newBars.oe > newBars.ra + 30) {
        newBars.ra = clamp(newBars.ra - 3);
      }

      const equilibrium = newBars.ra * 0.4 + newBars.oe * 0.3 + newBars.ao * 0.3;
      const xpGain = Math.max(5, Math.round(equilibrium / 10)) + (card.effects.xp || 0);
      const newXp = prev.xp + xpGain;

      let newLevel = prev.level;
      const levels: GameLevel[] = [5, 4, 3, 2, 1];
      for (const l of levels) {
        if (newXp >= LEVEL_XP[l]) { newLevel = l; break; }
      }

      // Remove from hand
      const newHand = [...prev.deck.hand];
      newHand.splice(cardIndex, 1);

      const newDiscard = [...prev.deck.discardPile];
      const newExhaust = [...prev.deck.exhaustPile];
      if (card.exhaust) {
        newExhaust.push(card);
      } else {
        newDiscard.push(card);
      }

      // Place card on the board row
      const boardRA = [...prev.boardRA];
      const boardOE = [...prev.boardOE];
      const boardAO = [...prev.boardAO];
      if (card.category === 'RA') boardRA.push(card);
      else if (card.category === 'OE') boardOE.push(card);
      else boardAO.push(card);

      // Score: sum of positive effects from this card
      const cardScore = Math.max(0, card.effects.ra) + Math.max(0, card.effects.oe) + Math.max(0, card.effects.ao);

      // Profile scoring
      const profileDelta: Partial<ProfileScores> = {};
      if (card.category === 'RA') profileDelta.explorador = 3;
      if (card.category === 'OE') profileDelta.construtor = 3;
      if (card.category === 'AO') profileDelta.guardiao = 3;
      if (card.effects.ra >= 0 && card.effects.oe >= 0 && card.effects.ao >= 0) {
        profileDelta.cientista = 2;
      }

      const newProfileScores: ProfileScores = {
        explorador: prev.profileScores.explorador + (profileDelta.explorador || 0),
        construtor: prev.profileScores.construtor + (profileDelta.construtor || 0),
        guardiao: prev.profileScores.guardiao + (profileDelta.guardiao || 0),
        cientista: prev.profileScores.cientista + (profileDelta.cientista || 0),
      };

      const newEduMetrics = { ...prev.eduMetrics, totalBuildings: prev.eduMetrics.totalBuildings + (card.type === 'build' ? 1 : 0) };
      if (card.category === 'RA') newEduMetrics.proNatureDecisions++;
      if (card.category === 'OE') newEduMetrics.proInfraDecisions++;
      if (card.category === 'AO') newEduMetrics.proGovDecisions++;

      const visitors = Math.max(0, Math.round(equilibrium * 1.5));

      return {
        ...prev,
        bars: newBars,
        coins: prev.coins - card.cost + (card.effects.coins || 0),
        xp: newXp,
        level: newLevel,
        visitors,
        deck: { ...prev.deck, hand: newHand, discardPile: newDiscard, exhaustPile: newExhaust },
        cardsPlayedThisTurn: prev.cardsPlayedThisTurn + 1,
        playedThisTurn: [...prev.playedThisTurn, card],
        totalCardsPlayed: prev.totalCardsPlayed + 1,
        totalScore: prev.totalScore + cardScore,
        boardRA, boardOE, boardAO,
        eventLog: [...prev.eventLog, `🃏 Jogou: ${card.emoji} ${card.name} (+${cardScore} pts)`],
        profileScores: newProfileScores,
        eduMetrics: newEduMetrics,
      };
    });
  }, []);

  const discardCard = useCallback((cardIndex: number) => {
    setState(prev => {
      const card = prev.deck.hand[cardIndex];
      if (!card) return prev;

      const newHand = [...prev.deck.hand];
      newHand.splice(cardIndex, 1);
      const newDiscard = [...prev.deck.discardPile, card];

      return {
        ...prev,
        coins: prev.coins + 1,
        deck: { ...prev.deck, hand: newHand, discardPile: newDiscard },
        eventLog: [...prev.eventLog, `🗑️ Descartou: ${card.emoji} ${card.name} (+1💰)`],
      };
    });
  }, []);

  const endTurn = useCallback(() => {
    setState(prev => {
      if (prev.isGameOver || prev.isVictory) return prev;

      const newTurn = prev.turn + 1;
      const logs = [...prev.eventLog];

      // 1. Generate threats (opponent's turn)
      const newThreats = generateThreats(prev.biome, newTurn, prev.bars);
      const allThreats = [...prev.activeThreats, ...newThreats];
      
      // Log threats
      for (const t of newThreats) {
        logs.push(`⚔️ Ameaça: ${t.emoji} ${t.name} (poder ${t.power})`);
      }

      // 2. Apply threat damage
      const decay: GameBars = { ...prev.bars };
      let threatDamage = 0;
      for (const t of allThreats) {
        decay.ra = clamp(decay.ra + t.effects.ra);
        decay.oe = clamp(decay.oe + t.effects.oe);
        decay.ao = clamp(decay.ao + t.effects.ao);
        threatDamage += t.power;
      }

      // 3. Natural decay (reduced for easier gameplay)
      decay.ra = clamp(decay.ra - 0.5);
      decay.oe = clamp(decay.oe - 0.3);
      decay.ao = clamp(decay.ao - 0.3);

      if (decay.oe > decay.ra + 40) {
        decay.ra = clamp(decay.ra - 2);
        logs.push('🏭 Poluição! Natureza diminuindo!');
      }

      // 4. Income (increased)
      const income = Math.round(prev.visitors / 8) + 5;
      const newCoins = Math.max(0, prev.coins + income);
      logs.push(`💰 Renda: +${income} moedas`);

      // 5. Disasters check
      let disasterCount = prev.disasterCount;
      for (const disaster of DISASTERS) {
        if (decay[disaster.trigger.bar] <= disaster.trigger.threshold) {
          disasterCount++;
          logs.push(`💀 ${disaster.emoji} ${disaster.name}: ${disaster.description}`);
          decay.ra = clamp(decay.ra + disaster.effects.ra);
          decay.oe = clamp(decay.oe + disaster.effects.oe);
          decay.ao = clamp(decay.ao + disaster.effects.ao);
          break;
        }
      }

      // 6. Draw new hand
      let drawPile = [...prev.deck.drawPile];
      let discardPile = [...prev.deck.discardPile];

      if (drawPile.length < prev.deck.drawCount) {
        drawPile = shuffle([...drawPile, ...discardPile]);
        discardPile = [];
        logs.push('🔄 Deck reembaralhado!');
      }

      const newHand = drawPile.splice(0, prev.deck.drawCount);

      // 7. Game over checks
      const equilibrium = decay.ra * 0.4 + decay.oe * 0.3 + decay.ao * 0.3;
      let isGameOver = false;
      let gameOverReason: string | null = null;

      if (equilibrium <= 5) {
        isGameOver = true;
        gameOverReason = '💀 Equilíbrio crítico! Colapso total!';
      } else if (disasterCount >= 7) {
        isGameOver = true;
        gameOverReason = '🔥 Muitas catástrofes! A cidade não se recuperou.';
      }

      // 8. Victory check
      const visitors = Math.max(0, Math.round(equilibrium * 1.5));
      let isVictory = false;
      let victoryReason: string | null = null;
      const newScore = prev.totalScore - Math.round(threatDamage * 0.2); // Threats reduce score (mild)

      if (!isGameOver && newScore >= VICTORY_SCORE && equilibrium >= 50) {
        isVictory = true;
        victoryReason = '🏆 Você alcançou a pontuação máxima com equilíbrio! Parabéns!';
        logs.push(`🎉 VITÓRIA: ${victoryReason}`);
      }

      // 9. Edu metrics
      const newEduMetrics = { ...prev.eduMetrics };
      if (equilibrium >= 60) newEduMetrics.turnsInGreen++;
      if (equilibrium < 30) newEduMetrics.turnsInRed++;

      // 10. Skin unlocks
      const tempState = { ...prev, bars: decay, disasterCount, eduMetrics: newEduMetrics, isGameOver } as any;
      const newUnlocked = [...prev.unlockedSkins];
      for (const skin of UNLOCKABLE_SKINS) {
        if (!newUnlocked.includes(skin.id) && skin.check(tempState)) {
          newUnlocked.push(skin.id);
          logs.push(`🎨 Skin desbloqueada: ${skin.emoji} ${skin.name}!`);
        }
      }

      // 11. Auto-trigger event occasionally
      let currentEvent = null;
      let currentCouncil = null;
      if (newTurn % 3 === 0 && !isGameOver && !isVictory) {
        if (Math.random() > 0.4) {
          const biomeEvts = BIOME_EVENTS[prev.biome] || [];
          const allEvents = [...EVENTS, ...biomeEvts];
          const eligible = allEvents.filter(e => !e.condition || e.condition(decay));
          if (eligible.length > 0) {
            currentEvent = eligible[Math.floor(Math.random() * eligible.length)];
          }
        } else {
          currentCouncil = COUNCIL_DECISIONS[Math.floor(Math.random() * COUNCIL_DECISIONS.length)];
        }
      }

      // Keep only recent threats (max 5 on field, oldest fall off)
      const keptThreats = allThreats.slice(-5);

      return {
        ...prev,
        bars: decay,
        coins: newCoins,
        turn: newTurn,
        visitors,
        eventLog: logs,
        disasterCount,
        isGameOver,
        gameOverReason,
        isVictory,
        victoryReason,
        eduMetrics: newEduMetrics,
        unlockedSkins: newUnlocked,
        deck: { ...prev.deck, drawPile, hand: newHand, discardPile },
        cardsPlayedThisTurn: 0,
        playedThisTurn: [],
        activeThreats: keptThreats,
        currentEvent,
        currentCouncil,
        rewardCards: null,
        totalScore: Math.max(0, newScore),
      };
    });
  }, []);

  const resolveEvent = useCallback((choiceIndex: number) => {
    setState(prev => {
      if (!prev.currentEvent) return prev;
      const choice = prev.currentEvent.choices[choiceIndex];
      if (!choice) return prev;

      const risky = choice.type === 'risky';
      const luck = risky ? Math.random() > 0.5 : true;
      const mult = luck ? 1 : 0.5;

      const effects = {
        ra: Math.round(choice.effects.ra * mult),
        oe: Math.round(choice.effects.oe * mult),
        ao: Math.round(choice.effects.ao * mult),
        coins: Math.round((choice.effects.coins || 0) * mult),
      };

      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + effects.ra),
        oe: clamp(prev.bars.oe + effects.oe),
        ao: clamp(prev.bars.ao + effects.ao),
      };

      const newEduMetrics = { ...prev.eduMetrics, totalEventsResolved: prev.eduMetrics.totalEventsResolved + 1 };
      if (choice.type === 'smart') newEduMetrics.smartChoices++;
      if (choice.type === 'risky') newEduMetrics.riskyChoices++;
      if (choice.type === 'quick') newEduMetrics.quickChoices++;

      // Remove one threat when resolving an event (reward)
      const activeThreats = prev.activeThreats.length > 0 ? prev.activeThreats.slice(1) : [];

      const rewardPool = getRewardPool(prev.biome, prev.level);
      const rewardCards = pickRandomCards(rewardPool, 3);

      // Generate a visible card on the board from the event choice
      const eventCard: GameCard = {
        id: `event_${prev.currentEvent.id}_${Date.now()}`,
        name: choice.label,
        emoji: choice.emoji,
        category: choice.type === 'smart' ? 'RA' : choice.type === 'quick' ? 'OE' : 'AO',
        type: 'event',
        rarity: choice.type === 'smart' ? 'rare' : 'common',
        cost: 0,
        effects: { ra: effects.ra, oe: effects.oe, ao: effects.ao, coins: effects.coins, xp: 5 },
        description: choice.message,
        flavor: `Evento: ${prev.currentEvent.name}`,
      };

      const boardRA = [...prev.boardRA];
      const boardOE = [...prev.boardOE];
      const boardAO = [...prev.boardAO];
      if (eventCard.category === 'RA') boardRA.push(eventCard);
      else if (eventCard.category === 'OE') boardOE.push(eventCard);
      else boardAO.push(eventCard);

      const cardScore = Math.max(0, effects.ra) + Math.max(0, effects.oe) + Math.max(0, effects.ao);

      return {
        ...prev,
        bars: newBars,
        coins: Math.max(0, prev.coins + effects.coins),
        currentEvent: null,
        eventLog: [...prev.eventLog, `${prev.currentEvent.emoji} ${choice.message}`],
        eduMetrics: newEduMetrics,
        activeThreats,
        rewardCards,
        boardRA, boardOE, boardAO,
        totalScore: prev.totalScore + cardScore,
      };
    });
  }, []);

  const resolveCouncil = useCallback((optionIndex: number) => {
    setState(prev => {
      if (!prev.currentCouncil) return prev;
      const option = prev.currentCouncil.options[optionIndex];
      if (!option) return prev;

      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + option.effects.ra),
        oe: clamp(prev.bars.oe + option.effects.oe),
        ao: clamp(prev.bars.ao + option.effects.ao),
      };

      const activeThreats = prev.activeThreats.length > 0 ? prev.activeThreats.slice(1) : [];

      const rewardPool = getRewardPool(prev.biome, prev.level);
      const rewardCards = pickRandomCards(rewardPool, 3);

      // Generate a visible card on the board from the council choice
      const councilCard: GameCard = {
        id: `council_${Date.now()}`,
        name: option.label,
        emoji: prev.currentCouncil.emoji || '🤝',
        category: 'AO',
        type: 'policy',
        rarity: 'uncommon',
        cost: 0,
        effects: { ra: option.effects.ra, oe: option.effects.oe, ao: option.effects.ao, xp: 5 },
        description: option.feedback,
        flavor: `Conselho: ${prev.currentCouncil.question}`,
      };

      const boardRA = [...prev.boardRA];
      const boardOE = [...prev.boardOE];
      const boardAO = [...prev.boardAO];
      boardAO.push(councilCard);

      const cardScore = Math.max(0, option.effects.ra) + Math.max(0, option.effects.oe) + Math.max(0, option.effects.ao);

      return {
        ...prev,
        bars: newBars,
        currentCouncil: null,
        eventLog: [...prev.eventLog, `🤝 ${option.feedback}`],
        activeThreats,
        rewardCards,
        boardRA, boardOE, boardAO,
        totalScore: prev.totalScore + cardScore,
      };
    });
  }, []);

  const pickReward = useCallback((cardIndex: number) => {
    setState(prev => {
      if (!prev.rewardCards) return prev;
      const card = prev.rewardCards[cardIndex];
      if (!card) return { ...prev, rewardCards: null };

      const newDiscard = [...prev.deck.discardPile, card];
      return {
        ...prev,
        deck: { ...prev.deck, discardPile: newDiscard },
        rewardCards: null,
        eventLog: [...prev.eventLog, `🎁 Nova carta: ${card.emoji} ${card.name}!`],
      };
    });
  }, []);

  const skipReward = useCallback(() => {
    setState(prev => ({ ...prev, rewardCards: null }));
  }, []);

  const setAvatar = useCallback((avatar: AvatarConfig) => {
    setState(prev => ({ ...prev, avatar }));
  }, []);

  const setBiome = useCallback((biome: BiomeType) => {
    setState(prev => ({ ...prev, biome }));
  }, []);

  const startGame = useCallback(() => {
    setState(prev => ({ ...prev, isSetup: true }));
  }, []);

  const resetState = useCallback((biome?: BiomeType) => {
    setState(createInitialCardState(biome || 'floresta'));
  }, []);

  const getEquilibrium = () => state.bars.ra * 0.4 + state.bars.oe * 0.3 + state.bars.ao * 0.3;

  const getAlerts = (): string[] => {
    const alerts: string[] = [];
    if (state.isGameOver) {
      alerts.push(`☠️ ${state.gameOverReason}`);
      return alerts;
    }
    if (state.bars.ra < 20) alerts.push('🚨 Natureza quase destruída!');
    else if (state.bars.ra < 40) alerts.push('🔴 Natureza em perigo!');
    if (state.bars.oe > state.bars.ra + 30) alerts.push('🏭 Muita poluição!');
    if (state.bars.ao < 15) alerts.push('🚨 Sem organização!');
    if (state.disasterCount >= 3) alerts.push(`💀 ${state.disasterCount} desastres!`);
    return alerts;
  };

  const getDominantProfile = (): { preset: AvatarPreset; scores: ProfileScores } => {
    const s = state.profileScores;
    const entries: [AvatarPreset, number][] = [
      ['explorador', s.explorador],
      ['construtor', s.construtor],
      ['guardiao', s.guardiao],
      ['cientista', s.cientista],
    ];
    const eq = getEquilibrium();
    const bonus = eq >= 50 ? Math.round(eq / 10) : 0;
    const adjusted = entries.map(([k, v]) => [k, k === 'cientista' ? v + bonus : v] as [AvatarPreset, number]);
    adjusted.sort((a, b) => b[1] - a[1]);
    return { preset: adjusted[0][0], scores: { ...s, cientista: s.cientista + bonus } };
  };

  // Legacy compat
  const toLegacyState = () => ({
    bars: state.bars,
    coins: state.coins,
    level: state.level,
    xp: state.xp,
    grid: createEmptyGrid(),
    avatar: state.avatar,
    biome: state.biome,
    currentEvent: null,
    currentCouncil: null,
    turn: state.turn,
    visitors: state.visitors,
    isSetup: state.isSetup,
    eventLog: state.eventLog,
    isGameOver: state.isGameOver,
    gameOverReason: state.gameOverReason,
    isVictory: state.isVictory,
    victoryReason: state.victoryReason,
    disasterCount: state.disasterCount,
    profileScores: state.profileScores,
    eduMetrics: state.eduMetrics,
    unlockedSkins: state.unlockedSkins,
  });

  return {
    state,
    playCard,
    discardCard,
    endTurn,
    resolveEvent,
    resolveCouncil,
    pickReward,
    skipReward,
    setAvatar,
    setBiome,
    startGame,
    resetState,
    getEquilibrium,
    getAlerts,
    getDominantProfile,
    toLegacyState,
  };
}

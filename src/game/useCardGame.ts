import { useState, useCallback } from 'react';
import type { GameState, GameBars, GameLevel, BiomeType, AvatarConfig, ProfileScores, EduMetrics, AvatarPreset } from './types';
import { LEVEL_XP, BIOME_MODIFIERS, UNLOCKABLE_SKINS } from './types';
import { EVENTS, COUNCIL_DECISIONS, DISASTERS, BIOME_EVENTS, BUILDINGS } from './constants';
import type { GameCard, DeckState } from './cardTypes';
import { createStartingDeck, getRewardPool, pickRandomCards, shuffle } from './cardTypes';

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
  // Core game state (same as before)
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
  // Card-specific
  deck: DeckState;
  cardsPlayedThisTurn: number;
  maxPlaysPerTurn: number;
  /** Pending event card the player must resolve */
  currentEvent: any | null;
  currentCouncil: any | null;
  /** Cards offered as rewards after events */
  rewardCards: GameCard[] | null;
  /** Played cards history for display */
  playedThisTurn: GameCard[];
  /** Total cards played across all turns */
  totalCardsPlayed: number;
}

const GRID_SIZE = 6;
const createEmptyGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

function createInitialCardState(biome: BiomeType = 'floresta'): CardGameState {
  const mod = BIOME_MODIFIERS[biome];
  const startingDeck = shuffle(createStartingDeck(biome));

  // Draw initial hand of 5
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
    deck: {
      drawPile,
      hand,
      discardPile: [],
      exhaustPile: [],
      drawCount: 5,
      maxHand: 7,
    },
    cardsPlayedThisTurn: 0,
    maxPlaysPerTurn: 3,
    playedThisTurn: [],
    currentEvent: null,
    currentCouncil: null,
    rewardCards: null,
    totalCardsPlayed: 0,
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

      // Apply effects
      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + card.effects.ra),
        oe: clamp(prev.bars.oe + card.effects.oe),
        ao: clamp(prev.bars.ao + card.effects.ao),
      };

      // Pollution penalty
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

      // Move card from hand
      const newHand = [...prev.deck.hand];
      newHand.splice(cardIndex, 1);

      // Put in discard or exhaust
      const newDiscard = [...prev.deck.discardPile];
      const newExhaust = [...prev.deck.exhaustPile];
      if (card.exhaust) {
        newExhaust.push(card);
      } else {
        newDiscard.push(card);
      }

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

      // Edu metrics
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
        eventLog: [...prev.eventLog, `🃏 Jogou: ${card.emoji} ${card.name}`],
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
        coins: prev.coins + 1, // small coin reward for discarding
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

      // Decay
      const decay: GameBars = {
        ra: clamp(prev.bars.ra - 1),
        oe: clamp(prev.bars.oe - 0.5),
        ao: clamp(prev.bars.ao - 0.5),
      };

      if (decay.oe > decay.ra + 30) {
        decay.ra = clamp(decay.ra - 3);
        logs.push('🏭 Poluição! Natureza diminuindo!');
      }

      // Income from visitors
      const income = Math.round(prev.visitors / 10) + 3; // base income of 3
      const newCoins = Math.max(0, prev.coins + income);
      logs.push(`💰 Renda: +${income} moedas`);

      // Check disasters
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

      // Draw new hand
      let drawPile = [...prev.deck.drawPile];
      let discardPile = [...prev.deck.discardPile];

      // Reshuffle discard into draw if needed
      if (drawPile.length < prev.deck.drawCount) {
        drawPile = shuffle([...drawPile, ...discardPile]);
        discardPile = [];
        logs.push('🔄 Deck reembaralhado!');
      }

      const newHand = drawPile.splice(0, prev.deck.drawCount);

      // Game over checks
      const equilibrium = decay.ra * 0.4 + decay.oe * 0.3 + decay.ao * 0.3;
      let isGameOver = false;
      let gameOverReason: string | null = null;

      if (equilibrium <= 10) {
        isGameOver = true;
        gameOverReason = '💀 Equilíbrio crítico! Colapso total!';
      } else if (disasterCount >= 5) {
        isGameOver = true;
        gameOverReason = '🔥 Muitas catástrofes! A cidade não se recuperou.';
      }

      // Victory check
      let isVictory = false;
      let victoryReason: string | null = null;
      const visitors = Math.max(0, Math.round(equilibrium * 1.5));
      if (!isGameOver && prev.level >= 5 && equilibrium >= 70 && decay.ra >= 50 && decay.oe >= 50 && decay.ao >= 50 && visitors >= 200) {
        isVictory = true;
        victoryReason = '🏆 Sua cidade alcançou a excelência!';
        logs.push(`🎉 VITÓRIA: ${victoryReason}`);
      }

      // Edu metrics
      const newEduMetrics = { ...prev.eduMetrics };
      if (equilibrium >= 60) newEduMetrics.turnsInGreen++;
      if (equilibrium < 30) newEduMetrics.turnsInRed++;

      // Skin unlocks
      const tempState = { ...prev, bars: decay, disasterCount, eduMetrics: newEduMetrics, isGameOver } as any;
      const newUnlocked = [...prev.unlockedSkins];
      for (const skin of UNLOCKABLE_SKINS) {
        if (!newUnlocked.includes(skin.id) && skin.check(tempState)) {
          newUnlocked.push(skin.id);
          logs.push(`🎨 Skin desbloqueada: ${skin.emoji} ${skin.name}!`);
        }
      }

      // Auto-trigger event every 2-3 turns
      let currentEvent = null;
      let currentCouncil = null;
      const shouldTrigger = newTurn % 2 === 0 || newTurn % 3 === 0;

      if (shouldTrigger && !isGameOver && !isVictory) {
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
        currentEvent,
        currentCouncil,
        rewardCards: null,
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

      // Offer reward cards after events
      const rewardPool = getRewardPool(prev.biome, prev.level);
      const rewardCards = pickRandomCards(rewardPool, 3);

      return {
        ...prev,
        bars: newBars,
        coins: Math.max(0, prev.coins + effects.coins),
        currentEvent: null,
        eventLog: [...prev.eventLog, `${prev.currentEvent.emoji} ${choice.message}`],
        eduMetrics: newEduMetrics,
        rewardCards,
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

      const rewardPool = getRewardPool(prev.biome, prev.level);
      const rewardCards = pickRandomCards(rewardPool, 3);

      return {
        ...prev,
        bars: newBars,
        currentCouncil: null,
        eventLog: [...prev.eventLog, `🤝 ${option.feedback}`],
        rewardCards,
      };
    });
  }, []);

  const pickReward = useCallback((cardIndex: number) => {
    setState(prev => {
      if (!prev.rewardCards) return prev;
      const card = prev.rewardCards[cardIndex];
      if (!card) return { ...prev, rewardCards: null };

      // Add to discard (will be drawn next reshuffle)
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

  // Convert to legacy-compatible GameState for session saving
  const toLegacyState = (): Partial<GameState> => ({
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
    setState,
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

import { useState, useCallback } from 'react';
import type { GameState, GameBars, PlacedBuilding, AvatarConfig, BiomeType, GameLevel } from './types';
import { LEVEL_XP } from './types';
import { BUILDINGS, EVENTS, COUNCIL_DECISIONS, GRID_SIZE } from './constants';

const INITIAL_BARS: GameBars = { ra: 50, oe: 30, ao: 30 };

const createEmptyGrid = (): (PlacedBuilding | null)[][] =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

const DEFAULT_AVATAR: AvatarConfig = {
  preset: 'explorador',
  skinColor: '#FDDBB4',
  hairColor: '#2C1B18',
  shirtColor: '#3498DB',
};

const createInitialState = (): GameState => ({
  bars: { ...INITIAL_BARS },
  coins: 50,
  level: 1,
  xp: 0,
  grid: createEmptyGrid(),
  avatar: DEFAULT_AVATAR,
  biome: 'floresta',
  currentEvent: null,
  currentCouncil: null,
  turn: 0,
  visitors: 10,
  isSetup: false,
  eventLog: [],
});

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState());

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const applyEffects = useCallback((effects: { ra: number; oe: number; ao: number; coins?: number }) => {
    setState(prev => {
      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + effects.ra),
        oe: clamp(prev.bars.oe + effects.oe),
        ao: clamp(prev.bars.ao + effects.ao),
      };

      // OE > RA + 30 → pollution penalty
      if (newBars.oe > newBars.ra + 30) {
        newBars.ra = clamp(newBars.ra - 3);
      }

      // Calculate visitors based on balance
      const equilibrium = newBars.ra * 0.4 + newBars.oe * 0.3 + newBars.ao * 0.3;
      const visitors = Math.max(0, Math.round(equilibrium * 1.5));

      // XP gain
      const xpGain = Math.max(5, Math.round(equilibrium / 10));
      const newXp = prev.xp + xpGain;

      // Level check
      let newLevel = prev.level;
      const levels: GameLevel[] = [5, 4, 3, 2, 1];
      for (const l of levels) {
        if (newXp >= LEVEL_XP[l]) {
          newLevel = l;
          break;
        }
      }

      return {
        ...prev,
        bars: newBars,
        coins: Math.max(0, prev.coins + (effects.coins || 0)),
        xp: newXp,
        level: newLevel,
        visitors,
      };
    });
  }, []);

  const placeBuilding = useCallback((buildingId: string, x: number, y: number) => {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return false;

    setState(prev => {
      if (prev.grid[y][x] !== null) return prev;
      if (prev.coins < building.cost) return prev;
      if (building.unlockLevel > prev.level) return prev;

      const newGrid = prev.grid.map(row => [...row]);
      newGrid[y][x] = { buildingId, x, y };

      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + building.effects.ra),
        oe: clamp(prev.bars.oe + building.effects.oe),
        ao: clamp(prev.bars.ao + building.effects.ao),
      };

      if (newBars.oe > newBars.ra + 30) {
        newBars.ra = clamp(newBars.ra - 3);
      }

      const equilibrium = newBars.ra * 0.4 + newBars.oe * 0.3 + newBars.ao * 0.3;
      const xpGain = Math.max(5, Math.round(equilibrium / 10));

      let newLevel = prev.level;
      const newXp = prev.xp + xpGain;
      const levels: GameLevel[] = [5, 4, 3, 2, 1];
      for (const l of levels) {
        if (newXp >= LEVEL_XP[l]) { newLevel = l; break; }
      }

      return {
        ...prev,
        grid: newGrid,
        bars: newBars,
        coins: prev.coins - building.cost,
        xp: newXp,
        level: newLevel,
        visitors: Math.max(0, Math.round(equilibrium * 1.5)),
        turn: prev.turn + 1,
        eventLog: [...prev.eventLog, `Construiu: ${building.emoji} ${building.name}`],
      };
    });

    return true;
  }, []);

  const removeBuilding = useCallback((x: number, y: number) => {
    setState(prev => {
      const placed = prev.grid[y]?.[x];
      if (!placed) return prev;
      const building = BUILDINGS.find(b => b.id === placed.buildingId);
      if (!building) return prev;

      const newGrid = prev.grid.map(row => [...row]);
      newGrid[y][x] = null;

      const newBars: GameBars = {
        ra: clamp(prev.bars.ra - building.effects.ra),
        oe: clamp(prev.bars.oe - building.effects.oe),
        ao: clamp(prev.bars.ao - building.effects.ao),
      };

      return {
        ...prev,
        grid: newGrid,
        bars: newBars,
        coins: prev.coins + Math.floor(building.cost / 2),
        eventLog: [...prev.eventLog, `Removeu: ${building.emoji} ${building.name}`],
      };
    });
  }, []);

  const triggerRandomEvent = useCallback(() => {
    const eligible = EVENTS.filter(e => !e.condition || e.condition(state.bars));
    if (eligible.length === 0) return;
    const event = eligible[Math.floor(Math.random() * eligible.length)];
    setState(prev => ({ ...prev, currentEvent: event }));
  }, [state.bars]);

  const triggerCouncil = useCallback(() => {
    const decision = COUNCIL_DECISIONS[Math.floor(Math.random() * COUNCIL_DECISIONS.length)];
    setState(prev => ({ ...prev, currentCouncil: decision }));
  }, []);

  const resolveEvent = useCallback((choiceIndex: number) => {
    setState(prev => {
      if (!prev.currentEvent) return prev;
      const choice = prev.currentEvent.choices[choiceIndex];
      if (!choice) return prev;

      const risky = choice.type === 'risky';
      const luck = risky ? Math.random() > 0.5 : true;
      const multiplier = luck ? 1 : 0.5;

      const effects = {
        ra: Math.round(choice.effects.ra * multiplier),
        oe: Math.round(choice.effects.oe * multiplier),
        ao: Math.round(choice.effects.ao * multiplier),
        coins: Math.round((choice.effects.coins || 0) * multiplier),
      };

      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + effects.ra),
        oe: clamp(prev.bars.oe + effects.oe),
        ao: clamp(prev.bars.ao + effects.ao),
      };

      return {
        ...prev,
        bars: newBars,
        coins: Math.max(0, prev.coins + effects.coins),
        currentEvent: null,
        turn: prev.turn + 1,
        eventLog: [...prev.eventLog, `${prev.currentEvent.emoji} ${choice.message}`],
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

      return {
        ...prev,
        bars: newBars,
        currentCouncil: null,
        turn: prev.turn + 1,
        eventLog: [...prev.eventLog, `🤝 ${option.feedback}`],
      };
    });
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

  const endTurn = useCallback(() => {
    // Every 3 turns, trigger event or council
    setState(prev => {
      const newTurn = prev.turn + 1;
      // AO < 30 → chance of negative event
      let coinPenalty = 0;
      if (prev.bars.ao < 30 && Math.random() < 0.3) {
        coinPenalty = -5;
      }
      // Income from visitors
      const income = Math.round(prev.visitors / 10);

      return {
        ...prev,
        turn: newTurn,
        coins: Math.max(0, prev.coins + income + coinPenalty),
      };
    });

    // Random events every few turns
    if ((state.turn + 1) % 3 === 0) {
      if (Math.random() > 0.5) {
        triggerRandomEvent();
      } else {
        triggerCouncil();
      }
    }
  }, [state.turn, triggerRandomEvent, triggerCouncil]);

  const getEquilibrium = () => {
    return state.bars.ra * 0.4 + state.bars.oe * 0.3 + state.bars.ao * 0.3;
  };

  const getTileStatus = (ra: number): 'green' | 'yellow' | 'red' => {
    if (ra >= 60) return 'green';
    if (ra >= 40) return 'yellow';
    return 'red';
  };

  const getAlerts = (): string[] => {
    const alerts: string[] = [];
    if (state.bars.ra < 40) alerts.push('🔴 Natureza em perigo! Plante árvores!');
    if (state.bars.oe > state.bars.ra + 30) alerts.push('🏭 Muita construção! A poluição aumentou!');
    if (state.bars.ao < 30) alerts.push('⚠️ Falta organização! Problemas podem acontecer!');
    return alerts;
  };

  const loadState = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const resetState = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    setState,
    placeBuilding,
    removeBuilding,
    triggerRandomEvent,
    triggerCouncil,
    resolveEvent,
    resolveCouncil,
    setAvatar,
    setBiome,
    startGame,
    endTurn,
    getEquilibrium,
    getTileStatus,
    getAlerts,
    applyEffects,
    loadState,
    resetState,
  };
}

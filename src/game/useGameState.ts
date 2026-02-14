import { useState, useCallback } from 'react';
import type { GameState, GameBars, PlacedBuilding, AvatarConfig, BiomeType, GameLevel } from './types';
import { LEVEL_XP } from './types';
import { BUILDINGS, EVENTS, COUNCIL_DECISIONS, GRID_SIZE, DISASTERS, checkBuildingRequirements, checkSynergies } from './constants';

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
  isGameOver: false,
  gameOverReason: null,
  disasterCount: 0,
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

    let success = false;
    setState(prev => {
      if (prev.isGameOver) return prev;
      if (prev.grid[y][x] !== null) return prev;
      if (prev.coins < building.cost) return prev;
      if (building.unlockLevel > prev.level) return prev;

      // Check dependencies
      const reqs = checkBuildingRequirements(buildingId, prev.grid);
      if (!reqs.met) return prev;

      const newGrid = prev.grid.map(row => [...row]);
      newGrid[y][x] = { buildingId, x, y };

      // Base effects
      const newBars: GameBars = {
        ra: clamp(prev.bars.ra + building.effects.ra),
        oe: clamp(prev.bars.oe + building.effects.oe),
        ao: clamp(prev.bars.ao + building.effects.ao),
      };

      // Synergy bonus
      const synergy = checkSynergies(buildingId, x, y, newGrid);
      newBars.ra = clamp(newBars.ra + synergy.ra);
      newBars.oe = clamp(newBars.oe + synergy.oe);
      newBars.ao = clamp(newBars.ao + synergy.ao);

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

      const logs = [...prev.eventLog, `Construiu: ${building.emoji} ${building.name}`];
      if (synergy.descriptions.length > 0) {
        logs.push(`✨ Sinergia: ${synergy.descriptions.join(', ')}`);
      }

      success = true;
      return {
        ...prev,
        grid: newGrid,
        bars: newBars,
        coins: prev.coins - building.cost,
        xp: newXp,
        level: newLevel,
        visitors: Math.max(0, Math.round(equilibrium * 1.5)),
        turn: prev.turn + 1,
        eventLog: logs,
      };
    });

    return success;
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
    setState(prev => {
      if (prev.isGameOver) return prev;

      const newTurn = prev.turn + 1;
      const logs = [...prev.eventLog];

      // Maintenance costs
      let maintenanceCost = 0;
      for (const row of prev.grid) {
        for (const cell of row) {
          if (cell) {
            const b = BUILDINGS.find(bd => bd.id === cell.buildingId);
            if (b?.maintenance) maintenanceCost += b.maintenance;
          }
        }
      }
      if (maintenanceCost > 0) {
        logs.push(`🔧 Manutenção: -${maintenanceCost} moedas`);
      }

      // AO < 30 → chance of negative event
      let coinPenalty = 0;
      if (prev.bars.ao < 30 && Math.random() < 0.3) {
        coinPenalty = -5;
        logs.push('⚠️ Desorganização causou prejuízo!');
      }

      // Decay: bars slowly decrease each turn if no action
      const decay: GameBars = {
        ra: clamp(prev.bars.ra - 1),
        oe: clamp(prev.bars.oe - 0.5),
        ao: clamp(prev.bars.ao - 0.5),
      };

      // OE > RA + 30 → pollution
      if (decay.oe > decay.ra + 30) {
        decay.ra = clamp(decay.ra - 3);
        logs.push('🏭 Poluição! Natureza diminuindo!');
      }

      // Income from visitors
      const income = Math.round(prev.visitors / 10);
      const newCoins = Math.max(0, prev.coins + income + coinPenalty - maintenanceCost);

      // Check for disasters
      let disasterCount = prev.disasterCount;
      let destroyedBuildings: string[] = [];
      const newGrid = prev.grid.map(row => [...row]);

      for (const disaster of DISASTERS) {
        if (decay[disaster.trigger.bar] <= disaster.trigger.threshold) {
          // Disaster strikes!
          disasterCount++;
          logs.push(`💀 ${disaster.emoji} ${disaster.name}: ${disaster.description}`);
          
          decay.ra = clamp(decay.ra + disaster.effects.ra);
          decay.oe = clamp(decay.oe + disaster.effects.oe);
          decay.ao = clamp(decay.ao + disaster.effects.ao);

          // Destroy buildings
          let toDestroy = disaster.destroys;
          const allBuildings: { x: number; y: number; id: string }[] = [];
          for (let y2 = 0; y2 < GRID_SIZE; y2++) {
            for (let x2 = 0; x2 < GRID_SIZE; x2++) {
              const c = newGrid[y2][x2];
              if (c) {
                const bd = BUILDINGS.find(b => b.id === c.buildingId);
                if (!disaster.targetCategory || bd?.category === disaster.targetCategory) {
                  allBuildings.push({ x: x2, y: y2, id: c.buildingId });
                }
              }
            }
          }
          // Shuffle and destroy
          const shuffled = allBuildings.sort(() => Math.random() - 0.5);
          for (let i = 0; i < Math.min(toDestroy, shuffled.length); i++) {
            const target = shuffled[i];
            const bd = BUILDINGS.find(b => b.id === target.id);
            newGrid[target.y][target.x] = null;
            if (bd) {
              destroyedBuildings.push(`${bd.emoji} ${bd.name}`);
            }
          }
          break; // Only one disaster per turn
        }
      }

      if (destroyedBuildings.length > 0) {
        logs.push(`🏚️ Destruído: ${destroyedBuildings.join(', ')}`);
      }

      // Game over conditions
      const equilibrium = decay.ra * 0.4 + decay.oe * 0.3 + decay.ao * 0.3;
      let isGameOver = false;
      let gameOverReason: string | null = null;

      if (equilibrium <= 10) {
        isGameOver = true;
        gameOverReason = '💀 Equilíbrio crítico! Sua cidade entrou em colapso total. Todas as barras caíram demais.';
      } else if (decay.ra <= 5 && decay.oe <= 5) {
        isGameOver = true;
        gameOverReason = '🏚️ Cidade abandonada! Sem natureza e sem infraestrutura, todos foram embora.';
      } else if (disasterCount >= 5) {
        isGameOver = true;
        gameOverReason = '🔥 Muitas catástrofes! Após 5 desastres, a cidade não se recuperou.';
      } else if (newCoins <= 0 && decay.ra <= 15 && decay.ao <= 15) {
        isGameOver = true;
        gameOverReason = '💸 Falência total! Sem moedas, sem natureza e sem organização.';
      }

      if (isGameOver) {
        logs.push(`☠️ FIM DE JOGO: ${gameOverReason}`);
      }

      return {
        ...prev,
        grid: newGrid,
        bars: decay,
        turn: newTurn,
        coins: newCoins,
        eventLog: logs,
        visitors: Math.max(0, Math.round(equilibrium * 1.5)),
        disasterCount,
        isGameOver,
        gameOverReason,
      };
    });

    // Random events every few turns
    if ((state.turn + 1) % 3 === 0 && !state.isGameOver) {
      if (Math.random() > 0.5) {
        triggerRandomEvent();
      } else {
        triggerCouncil();
      }
    }
  }, [state.turn, state.isGameOver, triggerRandomEvent, triggerCouncil]);

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
    if (state.isGameOver) {
      alerts.push(`☠️ ${state.gameOverReason}`);
      return alerts;
    }
    if (state.bars.ra < 20) alerts.push('🚨 PERIGO EXTREMO: Natureza quase destruída!');
    else if (state.bars.ra < 40) alerts.push('🔴 Natureza em perigo! Plante árvores!');
    if (state.bars.oe > state.bars.ra + 30) alerts.push('🏭 Muita construção! A poluição aumentou!');
    if (state.bars.ao < 15) alerts.push('🚨 CAOS: Sem organização, desastres iminentes!');
    else if (state.bars.ao < 30) alerts.push('⚠️ Falta organização! Problemas podem acontecer!');
    if (state.disasterCount >= 3) alerts.push(`💀 ${state.disasterCount} desastres! Mais 2 e a cidade acaba!`);
    
    // Maintenance warning
    let maintenance = 0;
    for (const row of state.grid) {
      for (const cell of row) {
        if (cell) {
          const b = BUILDINGS.find(bd => bd.id === cell.buildingId);
          if (b?.maintenance) maintenance += b.maintenance;
        }
      }
    }
    if (maintenance > state.coins * 0.5) alerts.push(`🔧 Manutenção alta: ${maintenance}/turno`);
    
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

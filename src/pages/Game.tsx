import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '@/game/useGameState';
import { GameWorld } from '@/game/components/GameWorld';
import { GameHUD } from '@/game/components/GameHUD';
import { BuildingMenu } from '@/game/components/BuildingMenu';
import { EventDialog, CouncilDialog } from '@/game/components/EventDialog';
import { SetupScreen } from '@/game/components/SetupScreen';
import { EventLog } from '@/game/components/EventLog';
import type { AvatarConfig, BiomeType } from '@/game/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Game() {
  const navigate = useNavigate();
  const game = useGameState();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const handleStart = useCallback((avatar: AvatarConfig, biome: BiomeType) => {
    game.setAvatar(avatar);
    game.setBiome(biome);
    game.startGame();
  }, [game]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (selectedBuilding) {
      const placed = game.state.grid[y]?.[x];
      if (placed) {
        toast.error('Já tem algo aqui! Escolha outro lugar.');
        return;
      }
      const success = game.placeBuilding(selectedBuilding, x, y);
      if (success) {
        toast.success('Construção colocada! 🎉');
        setSelectedBuilding(null);
      } else {
        toast.error('Moedas insuficientes!');
      }
    } else {
      // Click on existing building to remove
      const placed = game.state.grid[y]?.[x];
      if (placed) {
        game.removeBuilding(x, y);
        toast.info('Construção removida. Parte das moedas devolvida.');
      }
    }
  }, [selectedBuilding, game]);

  const handleResolveEvent = useCallback((index: number) => {
    const event = game.state.currentEvent;
    if (event) {
      const choice = event.choices[index];
      setLastFeedback(choice.message);
      game.resolveEvent(index);
      setTimeout(() => setLastFeedback(null), 3000);
    }
  }, [game]);

  const handleResolveCouncil = useCallback((index: number) => {
    const decision = game.state.currentCouncil;
    if (decision) {
      const option = decision.options[index];
      setLastFeedback(option.feedback);
      game.resolveCouncil(index);
      setTimeout(() => setLastFeedback(null), 3000);
    }
  }, [game]);

  if (!game.state.isSetup) {
    return <SetupScreen onStart={handleStart} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold">🌍 Mapa do Tesouro</h1>
        <div className="w-16" />
      </div>

      {/* Feedback toast */}
      {lastFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-700 rounded-xl shadow-2xl px-6 py-3 animate-in slide-in-from-top-4 duration-300 max-w-sm text-center">
          <p className="text-sm font-medium">{lastFeedback}</p>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-3 p-3 max-w-[1400px] mx-auto" style={{ height: 'calc(100vh - 52px)' }}>
        {/* Left panel - HUD */}
        <div className="lg:w-64 flex-shrink-0 overflow-y-auto space-y-3">
          <GameHUD
            bars={game.state.bars}
            coins={game.state.coins}
            level={game.state.level}
            xp={game.state.xp}
            turn={game.state.turn}
            visitors={game.state.visitors}
            biome={game.state.biome}
            alerts={game.getAlerts()}
            equilibrium={game.getEquilibrium()}
          />
          <EventLog log={game.state.eventLog} />
        </div>

        {/* Center - 3D World */}
        <div className="flex-1 min-h-[300px] lg:min-h-0">
          <GameWorld
            grid={game.state.grid}
            biome={game.state.biome}
            selectedBuilding={selectedBuilding}
            onTileClick={handleTileClick}
            raValue={game.state.bars.ra}
          />
        </div>

        {/* Right panel - Buildings */}
        <div className="lg:w-64 flex-shrink-0 overflow-y-auto">
          <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
            <BuildingMenu
              selectedBuilding={selectedBuilding}
              onSelect={setSelectedBuilding}
              coins={game.state.coins}
              level={game.state.level}
              onEndTurn={game.endTurn}
              onEvent={game.triggerRandomEvent}
              onCouncil={game.triggerCouncil}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EventDialog event={game.state.currentEvent} onResolve={handleResolveEvent} />
      <CouncilDialog decision={game.state.currentCouncil} onResolve={handleResolveCouncil} />
    </div>
  );
}

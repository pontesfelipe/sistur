import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '@/game/useGameState';
import { useGameSessions } from '@/hooks/useGameSessions';
import { GameWorld } from '@/game/components/GameWorld';
import { GameHUD } from '@/game/components/GameHUD';
import { BuildingMenu } from '@/game/components/BuildingMenu';
import { EventDialog, CouncilDialog } from '@/game/components/EventDialog';
import { SetupScreen } from '@/game/components/SetupScreen';
import { EventLog } from '@/game/components/EventLog';
import { GameTutorial } from '@/game/components/GameTutorial';
import { MobileGameDrawer } from '@/game/components/MobileGameDrawer';
import { SessionPicker } from '@/game/components/SessionPicker';
import type { AvatarConfig, BiomeType } from '@/game/types';
import { BIOME_INFO } from '@/game/types';
import { ArrowLeft, BarChart3, Hammer, HelpCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

type GamePhase = 'picker' | 'setup' | 'playing';

export default function Game() {
  const navigate = useNavigate();
  const game = useGameState();
  const sessions = useGameSessions();
  const isMobile = useIsMobile();

  const [phase, setPhase] = useState<GamePhase>('picker');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'stats' | 'build' | null>(null);

  // Auto-save every 5 turns
  const lastSavedTurn = useRef(0);
  useEffect(() => {
    if (activeSessionId && game.state.isSetup && game.state.turn > 0 && game.state.turn % 5 === 0 && game.state.turn !== lastSavedTurn.current) {
      lastSavedTurn.current = game.state.turn;
      sessions.saveSession(activeSessionId, game.state);
    }
  }, [game.state.turn, activeSessionId, game.state.isSetup]);

  const handleNewGame = useCallback(() => {
    game.resetState();
    setActiveSessionId(null);
    setPhase('setup');
  }, [game]);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    const loaded = await sessions.loadSession(sessionId);
    if (loaded) {
      game.loadState(loaded);
      setActiveSessionId(sessionId);
      setPhase('playing');
      toast.success('Sessão carregada! 🎮');
    }
  }, [sessions, game]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await sessions.deleteSession(sessionId);
  }, [sessions]);

  const handleStart = useCallback(async (avatar: AvatarConfig, biome: BiomeType) => {
    game.setAvatar(avatar);
    game.setBiome(biome);
    game.startGame();

    const biomeInfo = BIOME_INFO[biome];
    const sessionName = `${biomeInfo.emoji} ${biomeInfo.name} - Aventura`;

    // We need a small delay to let state update
    setTimeout(async () => {
      const id = await sessions.createSession(sessionName, {
        ...game.state,
        avatar,
        biome,
        isSetup: true,
      });
      if (id) setActiveSessionId(id);
    }, 100);

    setPhase('playing');
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, [game, sessions, tutorialSeen]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
    setTutorialSeen(true);
  }, []);

  const handleManualSave = useCallback(async () => {
    if (!activeSessionId) return;
    await sessions.saveSession(activeSessionId, game.state);
    toast.success('Jogo salvo! 💾');
  }, [activeSessionId, sessions, game.state]);

  const handleBackToPicker = useCallback(async () => {
    if (activeSessionId && game.state.isSetup) {
      await sessions.saveSession(activeSessionId, game.state);
    }
    game.resetState();
    setActiveSessionId(null);
    setPhase('picker');
    await sessions.fetchSessions();
  }, [activeSessionId, game, sessions]);

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
        if (isMobile) setMobilePanel(null);
      } else {
        toast.error('Moedas insuficientes!');
      }
    } else {
      const placed = game.state.grid[y]?.[x];
      if (placed) {
        game.removeBuilding(x, y);
        toast.info('Construção removida.');
      }
    }
  }, [selectedBuilding, game, isMobile]);

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

  // Phase: Session picker
  if (phase === 'picker') {
    return (
      <SessionPicker
        sessions={sessions.sessions}
        loading={sessions.loading}
        onNewGame={handleNewGame}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
      />
    );
  }

  // Phase: Setup (new game)
  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} />;
  }

  // Phase: Playing
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b border-border flex-shrink-0">
        <button onClick={handleBackToPicker} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Sessões</span>
        </button>
        <h1 className="text-base sm:text-lg font-bold">🌍 Mapa do Tesouro</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleManualSave} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground" title="Salvar">
            <Save className="h-5 w-5" />
          </button>
          <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile stats bar */}
      {isMobile && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 border-b border-border text-xs overflow-x-auto flex-shrink-0">
          <span className="font-bold whitespace-nowrap">💰{game.state.coins}</span>
          <span className="whitespace-nowrap">🌳{Math.round(game.state.bars.ra)}</span>
          <span className="whitespace-nowrap">🏗️{Math.round(game.state.bars.oe)}</span>
          <span className="whitespace-nowrap">🤝{Math.round(game.state.bars.ao)}</span>
          <span className={`whitespace-nowrap font-bold ${game.getEquilibrium() >= 60 ? 'text-green-600' : game.getEquilibrium() >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            ⚖️{Math.round(game.getEquilibrium())}%
          </span>
          <span className="whitespace-nowrap">👥{game.state.visitors}</span>
          <span className="ml-auto whitespace-nowrap text-muted-foreground">T{game.state.turn}</span>
        </div>
      )}

      {/* Feedback toast */}
      {lastFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-background rounded-xl shadow-2xl px-5 py-3 animate-in slide-in-from-top-4 duration-300 max-w-sm text-center border border-border">
          <p className="text-sm font-medium">{lastFeedback}</p>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 p-2 sm:p-3 max-w-[1400px] mx-auto w-full min-h-0">
        {/* Left panel - HUD (desktop only) */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0 overflow-y-auto space-y-3">
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
        <div className="flex-1 min-h-[250px] sm:min-h-[300px] lg:min-h-0">
          <GameWorld
            grid={game.state.grid}
            biome={game.state.biome}
            selectedBuilding={selectedBuilding}
            onTileClick={handleTileClick}
            raValue={game.state.bars.ra}
          />
        </div>

        {/* Right panel - Buildings (desktop only) */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0 overflow-y-auto">
          <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
            <BuildingMenu
              selectedBuilding={selectedBuilding}
              onSelect={setSelectedBuilding}
              coins={game.state.coins}
              level={game.state.level}
              grid={game.state.grid}
              onEndTurn={game.endTurn}
              onEvent={game.triggerRandomEvent}
              onCouncil={game.triggerCouncil}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom action bar */}
      {isMobile && (
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-lg border-t border-border px-2 py-2 safe-bottom">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobilePanel(mobilePanel === 'stats' ? null : 'stats')}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors min-h-[48px] justify-center"
            >
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Status</span>
            </button>
            <button
              onClick={game.endTurn}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-[0.97] transition-transform min-h-[48px]"
            >
              ⏭️ Passar Turno
            </button>
            <button
              onClick={game.triggerRandomEvent}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition-transform"
            >
              🎲
            </button>
            <button
              onClick={game.triggerCouncil}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition-transform"
            >
              🤝
            </button>
            <button
              onClick={() => setMobilePanel(mobilePanel === 'build' ? null : 'build')}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors min-h-[48px] justify-center"
            >
              <Hammer className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Construir</span>
            </button>
          </div>

          {selectedBuilding && (
            <p className="text-xs text-center text-muted-foreground animate-pulse mt-1">
              👆 Toque no mapa para construir!
            </p>
          )}
        </div>
      )}

      {/* Mobile drawers */}
      <MobileGameDrawer
        open={mobilePanel === 'stats'}
        onClose={() => setMobilePanel(null)}
        title="📊 Status do Mundo"
      >
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
        <div className="mt-3">
          <EventLog log={game.state.eventLog} />
        </div>
      </MobileGameDrawer>

      <MobileGameDrawer
        open={mobilePanel === 'build'}
        onClose={() => setMobilePanel(null)}
        title="🏗️ Construções"
      >
        <BuildingMenu
          selectedBuilding={selectedBuilding}
          onSelect={(id) => {
            setSelectedBuilding(id);
            if (id) setMobilePanel(null);
          }}
          coins={game.state.coins}
          level={game.state.level}
          grid={game.state.grid}
          onEndTurn={game.endTurn}
          onEvent={game.triggerRandomEvent}
          onCouncil={game.triggerCouncil}
        />
      </MobileGameDrawer>

      {/* Tutorial */}
      {showTutorial && <GameTutorial onComplete={handleTutorialComplete} />}

      {/* Game Over Overlay */}
      {game.state.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="text-6xl">💀</div>
            <h2 className="text-2xl font-bold text-destructive">Fim de Jogo!</h2>
            <p className="text-sm text-muted-foreground">{game.state.gameOverReason}</p>
            <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-xs text-left">
              <p><strong>Turnos jogados:</strong> {game.state.turn}</p>
              <p><strong>Nível alcançado:</strong> {game.state.level}</p>
              <p><strong>Equilíbrio final:</strong> {Math.round(game.getEquilibrium())}%</p>
              <p><strong>Desastres sofridos:</strong> {game.state.disasterCount}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackToPicker}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-bold hover:bg-accent transition-colors"
              >
                📋 Sessões
              </button>
              <button
                onClick={handleNewGame}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                🔄 Nova Aventura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EventDialog event={game.state.currentEvent} onResolve={handleResolveEvent} />
      <CouncilDialog decision={game.state.currentCouncil} onResolve={handleResolveCouncil} />
    </div>
  );
}

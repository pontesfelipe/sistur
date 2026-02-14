import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardGame } from '@/game/useCardGame';
import { useGameSessions } from '@/hooks/useGameSessions';
import { GameHUD } from '@/game/components/GameHUD';
import { EventDialog, CouncilDialog } from '@/game/components/EventDialog';
import { SetupScreen } from '@/game/components/SetupScreen';
import { EventLog } from '@/game/components/EventLog';
import { GameTutorial } from '@/game/components/GameTutorial';
import { MobileGameDrawer } from '@/game/components/MobileGameDrawer';
import { SessionPicker } from '@/game/components/SessionPicker';
import { EduReport } from '@/game/components/EduReport';
import { CardHand } from '@/game/components/CardHand';
import { DeckInfo } from '@/game/components/DeckInfo';
import { RewardPicker } from '@/game/components/RewardPicker';
import type { AvatarConfig, BiomeType } from '@/game/types';
import { BIOME_INFO, PROFILE_INFO, VICTORY_CONDITIONS, UNLOCKABLE_SKINS } from '@/game/types';
import { ArrowLeft, BarChart3, HelpCircle, Save, GraduationCap, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type GamePhase = 'picker' | 'setup' | 'playing';

export default function Game() {
  const navigate = useNavigate();
  const game = useCardGame();
  const sessions = useGameSessions();
  const isMobile = useIsMobile();

  const [phase, setPhase] = useState<GamePhase>('picker');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'stats' | 'log' | 'edu' | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Auto-save every 5 turns
  const lastSavedTurn = useRef(0);
  useEffect(() => {
    if (activeSessionId && game.state.isSetup && game.state.turn > 0 && game.state.turn % 5 === 0 && game.state.turn !== lastSavedTurn.current) {
      lastSavedTurn.current = game.state.turn;
      sessions.saveSession(activeSessionId, game.toLegacyState() as any);
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
      // For legacy sessions, just start a new card game with the same biome
      game.resetState(loaded.biome || 'floresta');
      game.setAvatar(loaded.avatar || { preset: 'explorador', skinColor: '#FDDBB4', hairColor: '#2C1B18', shirtColor: '#3498DB' });
      game.startGame();
      setActiveSessionId(sessionId);
      setPhase('playing');
      toast.success('Nova aventura carregada! 🎮');
    }
  }, [sessions, game]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await sessions.deleteSession(sessionId);
  }, [sessions]);

  const handleStart = useCallback(async (avatar: AvatarConfig, biome: BiomeType) => {
    game.resetState(biome);
    game.setAvatar(avatar);
    game.setBiome(biome);
    game.startGame();

    const biomeInfo = BIOME_INFO[biome];
    const sessionName = `${biomeInfo.emoji} ${biomeInfo.name} - Aventura`;

    setTimeout(async () => {
      const id = await sessions.createSession(sessionName, game.toLegacyState() as any);
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
    await sessions.saveSession(activeSessionId, game.toLegacyState() as any);
    toast.success('Jogo salvo! 💾');
  }, [activeSessionId, sessions, game]);

  const handleBackToPicker = useCallback(async () => {
    if (activeSessionId && game.state.isSetup) {
      await sessions.saveSession(activeSessionId, game.toLegacyState() as any);
    }
    game.resetState();
    setActiveSessionId(null);
    setPhase('picker');
    await sessions.fetchSessions();
  }, [activeSessionId, game, sessions]);

  const handlePlayCard = useCallback((index: number) => {
    game.playCard(index);
    setSelectedCardIndex(null);
    toast.success('Carta jogada! 🃏');
  }, [game]);

  const handleDiscardCard = useCallback((index: number) => {
    game.discardCard(index);
    setSelectedCardIndex(null);
    toast.info('Carta descartada (+1💰)');
  }, [game]);

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

  const handleEndTurn = useCallback(() => {
    game.endTurn();
    setSelectedCardIndex(null);
    toast('⏭️ Novo turno!');
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

  // Phase: Setup
  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} />;
  }

  const canPlayCards = game.state.cardsPlayedThisTurn < game.state.maxPlaysPerTurn
    && !game.state.currentEvent && !game.state.currentCouncil && !game.state.rewardCards
    && !game.state.isGameOver && !game.state.isVictory;

  const equilibrium = game.getEquilibrium();
  const dp = game.getDominantProfile();

  // Phase: Playing
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b border-border flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">SISTUR</span>
        </button>
        <h1 className="text-base sm:text-lg font-bold">🃏 Mapa do Tesouro</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleManualSave} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground" title="Salvar">
            <Save className="h-5 w-5" />
          </button>
          <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-background/90 border-b border-border text-xs overflow-x-auto flex-shrink-0">
        <span className="font-bold whitespace-nowrap">💰{game.state.coins}</span>
        <span className="whitespace-nowrap">🌳{Math.round(game.state.bars.ra)}</span>
        <span className="whitespace-nowrap">🏗️{Math.round(game.state.bars.oe)}</span>
        <span className="whitespace-nowrap">🤝{Math.round(game.state.bars.ao)}</span>
        <span className={cn('whitespace-nowrap font-bold',
          equilibrium >= 60 ? 'text-green-600' : equilibrium >= 40 ? 'text-yellow-600' : 'text-red-600'
        )}>
          ⚖️{Math.round(equilibrium)}%
        </span>
        {dp.scores.explorador + dp.scores.construtor + dp.scores.guardiao + dp.scores.cientista > 0 && (
          <span className="whitespace-nowrap font-bold">{PROFILE_INFO[dp.preset].emoji}</span>
        )}
        <span className="whitespace-nowrap">👥{game.state.visitors}</span>
        <span className="whitespace-nowrap">⭐Nv{game.state.level}</span>
        <span className="ml-auto whitespace-nowrap text-muted-foreground">T{game.state.turn}</span>
        <span className="whitespace-nowrap text-muted-foreground">
          🃏{game.state.cardsPlayedThisTurn}/{game.state.maxPlaysPerTurn}
        </span>
      </div>

      {/* Feedback toast */}
      {lastFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-background rounded-xl shadow-2xl px-5 py-3 animate-in slide-in-from-top-4 duration-300 max-w-sm text-center border border-border">
          <p className="text-sm font-medium">{lastFeedback}</p>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 p-2 sm:p-3 max-w-[1400px] mx-auto w-full min-h-0">
        {/* Left sidebar (desktop) */}
        <div className={cn(
          'hidden lg:flex flex-shrink-0 transition-all duration-300',
          showSidebar ? 'w-64' : 'w-8'
        )}>
          {showSidebar ? (
            <div className="w-full overflow-y-auto space-y-3 pr-2">
              <button
                onClick={() => setShowSidebar(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ◀ Minimizar
              </button>
              <GameHUD
                bars={game.state.bars}
                coins={game.state.coins}
                level={game.state.level}
                xp={game.state.xp}
                turn={game.state.turn}
                visitors={game.state.visitors}
                biome={game.state.biome}
                alerts={game.getAlerts()}
                equilibrium={equilibrium}
                dominantProfile={dp.preset}
                profileScores={game.state.profileScores}
              />
              <EventLog log={game.state.eventLog} />
              <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <h3 className="text-sm font-bold mb-2">📊 Relatório Educacional</h3>
                <EduReport
                  metrics={game.state.eduMetrics}
                  profileScores={game.state.profileScores}
                  dominantProfile={dp.preset}
                  turn={game.state.turn}
                  unlockedSkins={game.state.unlockedSkins}
                  state={game.state as any}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                onClick={() => setShowSidebar(true)}
                className="p-1.5 rounded-lg bg-card shadow-md hover:bg-accent transition-colors"
                title="Expandir"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Center: Card game area */}
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Played cards this turn */}
          {game.state.playedThisTurn.length > 0 && (
            <div className="bg-card/60 backdrop-blur-sm rounded-xl p-3 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground mb-2">🎯 Jogadas deste turno:</p>
              <div className="flex flex-wrap gap-2">
                {game.state.playedThisTurn.map((card, i) => (
                  <div key={i} className="flex items-center gap-1 bg-accent/50 rounded-lg px-2 py-1 text-xs">
                    <span>{card.emoji}</span>
                    <span className="font-medium">{card.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deck info bar */}
          <div className="bg-card/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm">
            <DeckInfo deck={game.state.deck} totalPlayed={game.state.totalCardsPlayed} />
          </div>

          {/* Card hand */}
          <div className="flex-1 flex flex-col justify-center">
            <CardHand
              hand={game.state.deck.hand}
              coins={game.state.coins}
              onPlay={handlePlayCard}
              onDiscard={handleDiscardCard}
              canPlay={canPlayCards}
              selectedIndex={selectedCardIndex}
              onSelect={setSelectedCardIndex}
            />
          </div>

          {/* End turn button */}
          <div className="flex items-center justify-center gap-3 pb-2">
            <button
              onClick={handleEndTurn}
              disabled={game.state.isGameOver || game.state.isVictory || !!game.state.currentEvent || !!game.state.currentCouncil}
              className={cn(
                'px-8 py-3 text-sm font-bold rounded-xl shadow-lg transition-all min-h-[48px]',
                'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                'hover:scale-105 active:scale-[0.97]',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'
              )}
            >
              ⏭️ Passar Turno ({game.state.cardsPlayedThisTurn}/{game.state.maxPlaysPerTurn} jogadas)
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-lg border-t border-border px-2 py-1 safe-bottom">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobilePanel(mobilePanel === 'stats' ? null : 'stats')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors min-h-[44px] justify-center"
            >
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Status</span>
            </button>
            <button
              onClick={() => setMobilePanel(mobilePanel === 'log' ? null : 'log')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors min-h-[44px] justify-center"
            >
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Log</span>
            </button>
            <button
              onClick={() => setMobilePanel(mobilePanel === 'edu' ? null : 'edu')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors min-h-[44px] justify-center"
            >
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Relatório</span>
            </button>
          </div>
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
          equilibrium={equilibrium}
          dominantProfile={dp.preset}
          profileScores={game.state.profileScores}
        />
      </MobileGameDrawer>

      <MobileGameDrawer
        open={mobilePanel === 'log'}
        onClose={() => setMobilePanel(null)}
        title="📜 Log de Eventos"
      >
        <EventLog log={game.state.eventLog} />
      </MobileGameDrawer>

      <MobileGameDrawer
        open={mobilePanel === 'edu'}
        onClose={() => setMobilePanel(null)}
        title="📊 Relatório Educacional"
      >
        <EduReport
          metrics={game.state.eduMetrics}
          profileScores={game.state.profileScores}
          dominantProfile={dp.preset}
          turn={game.state.turn}
          unlockedSkins={game.state.unlockedSkins}
          state={game.state as any}
        />
      </MobileGameDrawer>

      {/* Tutorial */}
      {showTutorial && <GameTutorial onComplete={handleTutorialComplete} />}

      {/* Game Over Overlay */}
      {game.state.isGameOver && !game.state.isVictory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="text-6xl">💀</div>
            <h2 className="text-2xl font-bold text-destructive">Fim de Jogo!</h2>
            <p className="text-sm text-muted-foreground">{game.state.gameOverReason}</p>
            <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-xs text-left">
              <p><strong>Turnos jogados:</strong> {game.state.turn}</p>
              <p><strong>Nível alcançado:</strong> {game.state.level}</p>
              <p><strong>Equilíbrio final:</strong> {Math.round(equilibrium)}%</p>
              <p><strong>Cartas jogadas:</strong> {game.state.totalCardsPlayed}</p>
              <p><strong>Desastres sofridos:</strong> {game.state.disasterCount}</p>
              {dp.scores.explorador + dp.scores.construtor + dp.scores.guardiao + dp.scores.cientista > 0 && (
                <p><strong>Perfil:</strong> {PROFILE_INFO[dp.preset].emoji} {PROFILE_INFO[dp.preset].name}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleBackToPicker} className="flex-1 py-3 rounded-xl border border-border text-sm font-bold hover:bg-accent transition-colors">📋 Sessões</button>
              <button onClick={handleNewGame} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">🔄 Nova Aventura</button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {game.state.isVictory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-amber-50 to-yellow-100 dark:from-amber-950 dark:to-yellow-950 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-300 border-2 border-amber-400">
            <div className="text-7xl animate-bounce">🏆</div>
            <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-300">Parabéns! Você Venceu!</h2>
            <p className="text-sm text-amber-600 dark:text-amber-400">{game.state.victoryReason}</p>
            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 space-y-2 text-xs text-left">
              <p className="font-bold text-center mb-2">📋 Objetivos Cumpridos</p>
              {VICTORY_CONDITIONS.map(vc => (
                <div key={vc.id} className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>{vc.emoji} {vc.description}</span>
                </div>
              ))}
              <hr className="my-2 border-amber-300" />
              <p><strong>Turnos:</strong> {game.state.turn}</p>
              <p><strong>Cartas jogadas:</strong> {game.state.totalCardsPlayed}</p>
              <p><strong>Equilíbrio:</strong> {Math.round(equilibrium)}%</p>
              <p><strong>Visitantes:</strong> {game.state.visitors}</p>
              <p><strong>Skins:</strong> {game.state.unlockedSkins.length}/{UNLOCKABLE_SKINS.length}</p>
              <p><strong>Perfil:</strong> {PROFILE_INFO[dp.preset].emoji} {PROFILE_INFO[dp.preset].name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBackToPicker} className="flex-1 py-3 rounded-xl border border-border text-sm font-bold hover:bg-accent transition-colors">📋 Sessões</button>
              <button onClick={handleNewGame} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">🌟 Nova Aventura</button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Picker */}
      {game.state.rewardCards && (
        <RewardPicker
          cards={game.state.rewardCards}
          onPick={game.pickReward}
          onSkip={game.skipReward}
        />
      )}

      {/* Dialogs */}
      <EventDialog event={game.state.currentEvent} onResolve={handleResolveEvent} />
      <CouncilDialog decision={game.state.currentCouncil} onResolve={handleResolveCouncil} />
    </div>
  );
}

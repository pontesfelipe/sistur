import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardGame } from '@/game/useCardGame';
import { useGameSessions } from '@/hooks/useGameSessions';
import { EventDialog, CouncilDialog } from '@/game/components/EventDialog';
import { SetupScreen } from '@/game/components/SetupScreen';
import { GameTutorial } from '@/game/components/GameTutorial';
import { MobileGameDrawer } from '@/game/components/MobileGameDrawer';
import { SessionPicker } from '@/game/components/SessionPicker';
import { EduReport } from '@/game/components/EduReport';
import { EventLog } from '@/game/components/EventLog';
import { DeckInfo } from '@/game/components/DeckInfo';
import { RewardPicker } from '@/game/components/RewardPicker';
import { BattleBoard } from '@/game/components/BattleBoard';
import { TCGHand } from '@/game/components/TCGHand';
import type { AvatarConfig, BiomeType } from '@/game/types';
import { BIOME_INFO, PROFILE_INFO, VICTORY_CONDITIONS, UNLOCKABLE_SKINS } from '@/game/types';
import { ArrowLeft, HelpCircle, Save, ScrollText, GraduationCap, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireDefeatEffect } from '@/game/vfx/confetti';

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
  const [mobilePanel, setMobilePanel] = useState<'log' | 'edu' | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [playEffect, setPlayEffect] = useState<'RA' | 'OE' | 'AO' | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);

  // VFX: victory/defeat confetti
  const prevVictory = useRef(false);
  const prevGameOver = useRef(false);
  useEffect(() => {
    if (game.state.isVictory && !prevVictory.current) {
      fireVictoryConfetti();
      prevVictory.current = true;
    }
    if (game.state.isGameOver && !game.state.isVictory && !prevGameOver.current) {
      fireDefeatEffect();
      prevGameOver.current = true;
    }
    if (!game.state.isVictory) prevVictory.current = false;
    if (!game.state.isGameOver) prevGameOver.current = false;
  }, [game.state.isVictory, game.state.isGameOver]);

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
      game.resetState(loaded.biome || 'floresta');
      game.setAvatar(loaded.avatar || { preset: 'explorador', skinColor: '#FDDBB4', hairColor: '#2C1B18', shirtColor: '#3498DB' });
      game.startGame();
      setActiveSessionId(sessionId);
      setPhase('playing');
      toast.success('Aventura carregada! 🎮');
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
    const sessionName = `${biomeInfo.emoji} ${biomeInfo.name} - Batalha`;

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
    const card = game.state.deck.hand[index];
    const category = card?.category as 'RA' | 'OE' | 'AO';
    game.playCard(index);
    setSelectedCardIndex(null);
    // Trigger screen flash + row ripple
    setScreenFlash(true);
    setPlayEffect(category);
    setTimeout(() => setScreenFlash(false), 400);
    setTimeout(() => setPlayEffect(null), 600);
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
      const category = choice.type === 'smart' ? 'RA' : choice.type === 'quick' ? 'OE' : 'AO';
      setLastFeedback(choice.message);
      game.resolveEvent(index);
      setScreenFlash(true);
      setPlayEffect(category as 'RA' | 'OE' | 'AO');
      setTimeout(() => setScreenFlash(false), 400);
      setTimeout(() => setPlayEffect(null), 600);
      setTimeout(() => setLastFeedback(null), 3000);
    }
  }, [game]);

  const handleResolveCouncil = useCallback((index: number) => {
    const decision = game.state.currentCouncil;
    if (decision) {
      const option = decision.options[index];
      setLastFeedback(option.feedback);
      game.resolveCouncil(index);
      setScreenFlash(true);
      setPlayEffect('AO');
      setTimeout(() => setScreenFlash(false), 400);
      setTimeout(() => setPlayEffect(null), 600);
      setTimeout(() => setLastFeedback(null), 3000);
    }
  }, [game]);

  const handleEndTurn = useCallback(() => {
    game.endTurn();
    setSelectedCardIndex(null);
    toast('⚔️ Novo turno — ameaças surgem!', { icon: '🎴' });
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

  const boardScores = {
    ra: game.state.bars.ra,
    oe: game.state.bars.oe,
    ao: game.state.bars.ao,
    total: game.state.totalScore,
    target: game.state.victoryTarget,
  };

  // Phase: Playing
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col text-foreground">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 min-h-[44px] px-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-400" />
          <h1 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
            GUARDIÃO DO TERRITÓRIO
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-bold mr-1">💰{game.state.coins}</span>
          <span className="text-xs text-slate-400">T{game.state.turn}</span>
          <button onClick={handleManualSave} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors" title="Salvar">
            <Save className="h-4 w-4" />
          </button>
          <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Feedback toast */}
      {lastFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-800 rounded-xl shadow-2xl px-5 py-3 animate-in slide-in-from-top-4 duration-300 max-w-sm text-center border border-amber-500/30">
          <p className="text-sm font-medium text-slate-200">{lastFeedback}</p>
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col gap-2 p-2 sm:p-3 max-w-[1200px] mx-auto w-full min-h-0 overflow-y-auto">
        {/* Battle Board */}
        <BattleBoard
          playerBoard={{
            RA: game.state.boardRA,
            OE: game.state.boardOE,
            AO: game.state.boardAO,
          }}
          threats={game.state.activeThreats}
          scores={boardScores}
          equilibrium={equilibrium}
          turn={game.state.turn}
          showPlayEffect={playEffect}
        />

        {/* Screen flash VFX */}
        {screenFlash && (
          <div className="fixed inset-0 z-50 bg-amber-400/20 tcg-screen-flash" />
        )}

        {/* Deck info */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700/50">
          <DeckInfo deck={game.state.deck} totalPlayed={game.state.totalCardsPlayed} />
        </div>

        {/* Player hand */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-3 border border-slate-700/30">
          <TCGHand
            hand={game.state.deck.hand}
            coins={game.state.coins}
            onPlay={handlePlayCard}
            onDiscard={handleDiscardCard}
            canPlay={canPlayCards}
            selectedIndex={selectedCardIndex}
            onSelect={setSelectedCardIndex}
            cardsPlayed={game.state.cardsPlayedThisTurn}
            maxPlays={game.state.maxPlaysPerTurn}
          />
        </div>

        {/* End turn button */}
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={handleEndTurn}
            disabled={game.state.isGameOver || game.state.isVictory || !!game.state.currentEvent || !!game.state.currentCouncil}
            className={cn(
              'px-8 py-3 text-sm font-black rounded-xl shadow-lg transition-all min-h-[48px]',
              'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
              'hover:scale-105 hover:shadow-amber-500/30 hover:shadow-xl active:scale-[0.97]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
            )}
          >
            ⚔️ Passar Turno ({game.state.cardsPlayedThisTurn}/{game.state.maxPlaysPerTurn})
          </button>
          
          {!isMobile && (
            <div className="flex gap-1">
              <button
                onClick={() => setMobilePanel(mobilePanel === 'log' ? null : 'log')}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 text-xs transition-colors border border-slate-700/50"
              >
                <ScrollText className="h-4 w-4 inline mr-1" /> Log
              </button>
              <button
                onClick={() => setMobilePanel(mobilePanel === 'edu' ? null : 'edu')}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 text-xs transition-colors border border-slate-700/50"
              >
                <GraduationCap className="h-4 w-4 inline mr-1" /> Relatório
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 px-2 py-1 safe-bottom">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setMobilePanel(mobilePanel === 'log' ? null : 'log')}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] justify-center"
            >
              <ScrollText className="h-4 w-4 text-slate-400" />
              <span className="text-[9px] text-slate-400">Log</span>
            </button>
            <button
              onClick={() => setMobilePanel(mobilePanel === 'edu' ? null : 'edu')}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] justify-center"
            >
              <GraduationCap className="h-4 w-4 text-slate-400" />
              <span className="text-[9px] text-slate-400">Relatório</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawers */}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-300 border border-red-800/50">
            <div className="text-6xl">💀</div>
            <h2 className="text-2xl font-black text-red-400">Fim de Jogo!</h2>
            <p className="text-sm text-slate-400">{game.state.gameOverReason}</p>
            <div className="bg-slate-800/50 rounded-xl p-3 space-y-1 text-xs text-left text-slate-300">
              <p><strong>Turnos:</strong> {game.state.turn}</p>
              <p><strong>Pontuação:</strong> {game.state.totalScore}/{game.state.victoryTarget}</p>
              <p><strong>Equilíbrio:</strong> {Math.round(equilibrium)}%</p>
              <p><strong>Cartas jogadas:</strong> {game.state.totalCardsPlayed}</p>
              <p><strong>Ameaças enfrentadas:</strong> {game.state.activeThreats.length}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBackToPicker} className="flex-1 py-3 rounded-xl border border-slate-600 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">📋 Sessões</button>
              <button onClick={handleNewGame} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition-opacity">🔄 Nova Batalha</button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {game.state.isVictory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-amber-950 to-yellow-950 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-300 border-2 border-amber-400">
            <div className="text-7xl animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-amber-300">Você Venceu!</h2>
            <p className="text-sm text-amber-400">{game.state.victoryReason}</p>
            <div className="bg-black/20 rounded-xl p-3 space-y-2 text-xs text-left text-amber-200">
              <p><strong>Pontuação final:</strong> {game.state.totalScore}</p>
              <p><strong>Turnos:</strong> {game.state.turn}</p>
              <p><strong>Equilíbrio:</strong> {Math.round(equilibrium)}%</p>
              <p><strong>Cartas jogadas:</strong> {game.state.totalCardsPlayed}</p>
              <p><strong>Perfil:</strong> {PROFILE_INFO[dp.preset].emoji} {PROFILE_INFO[dp.preset].name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBackToPicker} className="flex-1 py-3 rounded-xl border border-amber-600 text-sm font-bold text-amber-300 hover:bg-amber-900/50 transition-colors">📋 Sessões</button>
              <button onClick={handleNewGame} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">🌟 Nova Batalha</button>
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

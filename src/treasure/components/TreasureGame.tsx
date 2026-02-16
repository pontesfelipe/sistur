import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Heart, MapPin, Trophy, Footprints, Sparkles, Shield, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generateMap, GRID } from '../mapGenerator';
import { MAP_THEMES, type TreasureGameState, type Position, type MapTheme } from '../types';
import { RiddleDialog } from './RiddleDialog';
import { TreasureTutorial } from './TreasureTutorial';

const MAX_TIME = 180; // 3 minutes
const MAX_RIDDLE_ERRORS = 4;

function createGameState(theme: MapTheme): TreasureGameState {
  const { map, playerStart, totalTreasures } = generateMap(theme.id);
  return {
    map, player: playerStart, score: 0, health: 100, maxHealth: 100,
    moves: 0, treasuresCollected: 0, totalTreasures, riddlesSolved: 0,
    riddleErrors: 0, maxRiddleErrors: MAX_RIDDLE_ERRORS,
    trapsHit: 0, isGameOver: false, isVictory: false, currentRiddle: null,
    riddlePosition: null, theme, message: null,
    timeRemaining: MAX_TIME, maxTime: MAX_TIME,
  };
}

// Biome visual config
const BIOME_VISUALS: Record<string, {
  bgGradient: string;
  cellBase: string;
  cellRevealed: string;
  fogColor: string;
  fogEmoji: string;
  wallEmoji: string;
  emptyDecor: string[];
  playerGlow: string;
  particleEmojis: string[];
  ambientColor: string;
}> = {
  floresta: {
    bgGradient: 'from-[#0a1f0a] via-[#0d2818] to-[#071510]',
    cellBase: 'bg-emerald-900/50 border-emerald-700/20',
    cellRevealed: 'bg-gradient-to-br from-emerald-800/40 to-green-900/40 border-emerald-600/15',
    fogColor: 'bg-gradient-to-br from-emerald-900/80 to-green-950/80',
    fogEmoji: '🌿',
    wallEmoji: '🌳',
    emptyDecor: ['🍃', '🌾', '🪺', '', '', ''],
    playerGlow: 'shadow-[0_0_24px_rgba(52,211,153,0.5)]',
    particleEmojis: ['🍂', '🦋', '🌿', '✨', '🍃'],
    ambientColor: 'rgba(52,211,153,0.12)',
  },
  oceano: {
    bgGradient: 'from-[#020c1b] via-[#0a1628] to-[#061020]',
    cellBase: 'bg-blue-900/50 border-blue-700/20',
    cellRevealed: 'bg-gradient-to-br from-sky-800/40 to-blue-900/40 border-sky-600/15',
    fogColor: 'bg-gradient-to-br from-blue-900/80 to-slate-950/80',
    fogEmoji: '🌊',
    wallEmoji: '🪸',
    emptyDecor: ['🫧', '🐟', '🌊', '', '', ''],
    playerGlow: 'shadow-[0_0_24px_rgba(56,189,248,0.5)]',
    particleEmojis: ['🫧', '🐠', '🫧', '✨', '🐟'],
    ambientColor: 'rgba(56,189,248,0.12)',
  },
  montanha: {
    bgGradient: 'from-[#111827] via-[#1e293b] to-[#0f172a]',
    cellBase: 'bg-slate-700/50 border-slate-500/20',
    cellRevealed: 'bg-gradient-to-br from-slate-600/40 to-indigo-900/30 border-slate-400/15',
    fogColor: 'bg-gradient-to-br from-slate-700/80 to-slate-900/80',
    fogEmoji: '⛰️',
    wallEmoji: '🏔️',
    emptyDecor: ['🪨', '❄️', '🦅', '', '', ''],
    playerGlow: 'shadow-[0_0_24px_rgba(165,180,252,0.5)]',
    particleEmojis: ['🌬️', '🦅', '☁️', '✨', '❄️'],
    ambientColor: 'rgba(165,180,252,0.12)',
  },
  mangue: {
    bgGradient: 'from-[#042f2e] via-[#0d3b3a] to-[#022c22]',
    cellBase: 'bg-teal-900/50 border-teal-700/20',
    cellRevealed: 'bg-gradient-to-br from-teal-800/40 to-cyan-900/40 border-teal-600/15',
    fogColor: 'bg-gradient-to-br from-teal-900/80 to-emerald-950/80',
    fogEmoji: '🌴',
    wallEmoji: '🌴',
    emptyDecor: ['🦀', '🐚', '🌿', '', '', ''],
    playerGlow: 'shadow-[0_0_24px_rgba(45,212,191,0.5)]',
    particleEmojis: ['🦀', '🐚', '🌿', '✨', '🫧'],
    ambientColor: 'rgba(45,212,191,0.12)',
  },
};

// Floating particle component
function FloatingParticles({ emojis, color }: { emojis: string[]; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      size: 10 + Math.random() * 14,
    })), [emojis]
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Ambient glow spots */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full blur-3xl" style={{ background: color }} />
      <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full blur-3xl" style={{ background: color }} />
      {particles.map(p => (
        <motion.span
          key={p.id}
          className="absolute select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{
            y: [0, -30, -15, -40, 0],
            x: [0, 10, -8, 5, 0],
            opacity: [0, 0.7, 0.5, 0.8, 0],
            rotate: [0, 15, -10, 20, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

// Animated health bar
function HealthBar({ health, maxHealth }: { health: number; maxHealth: number }) {
  const pct = (health / maxHealth) * 100;
  const color = pct > 60 ? 'from-emerald-500 to-green-400' : pct > 30 ? 'from-amber-500 to-yellow-400' : 'from-red-500 to-rose-400';
  return (
    <div className="flex items-center gap-2 flex-1">
      <Heart className="h-4 w-4 text-red-400 flex-shrink-0" />
      <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200 }}
        />
      </div>
      <span className={cn('text-xs font-bold tabular-nums w-7 text-right', pct <= 30 && 'text-red-400')}>{health}</span>
    </div>
  );
}

export function TreasureGame({ onBack }: { onBack: () => void }) {
  const [selectedTheme, setSelectedTheme] = useState<MapTheme | null>(null);
  const [state, setState] = useState<TreasureGameState | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [collectAnim, setCollectAnim] = useState<string | null>(null);

  const handleSelectTheme = useCallback((theme: MapTheme) => {
    setSelectedTheme(theme);
    setState(createGameState(theme));
    if (!tutorialSeen) setShowTutorial(true);
  }, [tutorialSeen]);

  const handleRestart = useCallback(() => {
    if (selectedTheme) setState(createGameState(selectedTheme));
  }, [selectedTheme]);

  // Countdown timer
  useEffect(() => {
    if (!state || state.isGameOver || state.isVictory || !selectedTheme) return;
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev || prev.isGameOver || prev.isVictory) return prev;
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          return { ...prev, timeRemaining: 0, isGameOver: true };
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.isGameOver, state?.isVictory, selectedTheme]);

  const showMessage = useCallback((msg: string, emoji?: string) => {
    setState(prev => prev ? { ...prev, message: msg } : prev);
    if (emoji) { setCollectAnim(emoji); setTimeout(() => setCollectAnim(null), 1200); }
    setTimeout(() => setState(prev => prev ? { ...prev, message: null } : prev), 2500);
  }, []);

  const handleMove = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isGameOver || prev.isVictory || prev.currentRiddle) return prev;
      const dr = Math.abs(row - prev.player.row);
      const dc = Math.abs(col - prev.player.col);
      if ((dr + dc) !== 1) return prev;
      const cell = prev.map[row][col];
      if (cell.type === 'wall') return prev;

      const newMap = prev.map.map(r => r.map(c => ({ ...c })));
      // Minesweeper-style: only reveal the cell you step on
      newMap[row][col].revealed = true;

      let newState = { ...prev, map: newMap, player: { row, col }, moves: prev.moves + 1 };

      if (cell.type === 'treasure' && cell.item) {
        newState.score += cell.item.points;
        newState.treasuresCollected += 1;
        newMap[row][col] = { type: 'empty', revealed: true };
        setTimeout(() => showMessage(`${cell.item!.name} coletado! +${cell.item!.points}pts`, cell.item!.emoji), 50);
      } else if (cell.type === 'trap' && cell.trap) {
        newState.health = Math.max(0, newState.health - cell.trap.damage);
        newState.trapsHit += 1;
        newMap[row][col] = { type: 'empty', revealed: true };
        setTimeout(() => showMessage(`${cell.trap!.name}! -${cell.trap!.damage} saúde`, cell.trap!.emoji), 50);
        if (newState.health <= 0) newState.isGameOver = true;
      } else if (cell.type === 'riddle' && cell.riddle) {
        newState.currentRiddle = cell.riddle;
        newState.riddlePosition = { row, col };
      } else if (cell.type === 'exit') {
        newState.isVictory = true;
        const timeBonus = Math.floor(newState.timeRemaining / 3);
        newState.score += newState.health + timeBonus;
      }

      return newState;
    });
  }, [showMessage]);

  const handleRiddleAnswer = useCallback((correct: boolean, reward: number) => {
    setState(prev => {
      if (!prev || !prev.riddlePosition) return prev;
      const newMap = prev.map.map(r => r.map(c => ({ ...c })));
      newMap[prev.riddlePosition.row][prev.riddlePosition.col] = { type: 'empty', revealed: true };
      const newErrors = correct ? prev.riddleErrors : prev.riddleErrors + 1;
      const isGameOver = newErrors >= prev.maxRiddleErrors;
      return {
        ...prev, map: newMap, currentRiddle: null, riddlePosition: null,
        score: prev.score + reward,
        riddlesSolved: correct ? prev.riddlesSolved + 1 : prev.riddlesSolved,
        riddleErrors: newErrors,
        isGameOver,
      };
    });
  }, []);

  // Theme selector
  if (!selectedTheme || !state) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-lg font-bold text-amber-300">🗺️ Caça ao Tesouro Ecológico</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-300 mb-6 text-center text-base font-medium"
          >
            ✨ Escolha um bioma para explorar:
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {MAP_THEMES.map((theme, i) => (
              <motion.button
                key={theme.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 200 }}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelectTheme(theme)}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} p-6 text-left text-white shadow-2xl border border-white/10 group`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
                <div className="relative z-10">
                  <span className="text-5xl block mb-3 drop-shadow-lg">{theme.emoji}</span>
                  <h3 className="text-lg font-bold drop-shadow">{theme.name}</h3>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">{theme.description}</p>
                </div>
                <div className="absolute -bottom-4 -right-4 text-[100px] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">{theme.emoji}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const visuals = BIOME_VISUALS[state.theme.id] || BIOME_VISUALS.floresta;
  const cellSize = 'min(calc((100vw - 40px) / 8), 52px)';

  return (
    <div className={`min-h-screen bg-gradient-to-b ${visuals.bgGradient} flex flex-col text-white relative`}>
      {/* Floating particles */}
      <FloatingParticles emojis={visuals.particleEmojis} color={visuals.ambientColor} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2 bg-black/40 backdrop-blur-xl border-b border-white/5 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 min-h-[44px] px-1">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <motion.span
            className="text-xl"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {state.theme.emoji}
          </motion.span>
          <h1 className="text-sm font-bold text-amber-300 drop-shadow">{state.theme.name}</h1>
        </div>
        <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* HUD */}
      <div className="relative z-10 flex flex-col gap-1.5 px-3 py-2 bg-black/30 backdrop-blur-sm border-b border-white/5 text-xs">
        <div className="flex items-center gap-3">
          <HealthBar health={state.health} maxHealth={state.maxHealth} />
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <motion.span key={state.score} animate={{ scale: [1.3, 1] }} className="font-bold tabular-nums">{state.score}</motion.span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium tabular-nums">{state.treasuresCollected}/{state.totalTreasures}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-between">
          {/* Timer */}
          <div className={cn('flex items-center gap-1', state.timeRemaining <= 30 && 'text-red-400')}>
            <Clock className="h-3.5 w-3.5" />
            <span className="font-bold tabular-nums">
              {Math.floor(state.timeRemaining / 60)}:{(state.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
            {state.timeRemaining <= 30 && (
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-[10px]">⚠️</motion.span>
            )}
          </div>
          {/* Riddle errors */}
          <div className={cn('flex items-center gap-1', state.riddleErrors >= state.maxRiddleErrors - 1 && 'text-red-400')}>
            <XCircle className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums">{state.riddleErrors}/{state.maxRiddleErrors} erros</span>
          </div>
          {/* Moves */}
          <div className="flex items-center gap-1">
            <Footprints className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium tabular-nums">{state.moves}</span>
          </div>
        </div>
      </div>

      {/* Collect animation */}
      <AnimatePresence>
        {collectAnim && (
          <motion.div
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 3, y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-5xl"
          >
            {collectAnim}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message toast */}
      <AnimatePresence>
        {state.message && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl px-6 py-3 max-w-sm text-center border border-amber-500/30"
          >
            <p className="text-sm font-semibold">{state.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Map */}
      <div className="flex-1 flex items-center justify-center p-3 relative z-10">
        <div
          className="grid gap-[3px] p-2 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5 shadow-2xl"
          style={{ gridTemplateColumns: `repeat(${GRID}, ${cellSize})` }}
        >
          {state.map.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = r === state.player.row && c === state.player.col;
              const isAdjacent = !state.isGameOver && !state.isVictory && !state.currentRiddle &&
                (Math.abs(r - state.player.row) + Math.abs(c - state.player.col)) === 1 &&
                cell.type !== 'wall';

              // Determine cell visual
              let content = '';
              let cellClass = '';
              let glowClass = '';

              if (!cell.revealed) {
                cellClass = visuals.fogColor;
                content = visuals.fogEmoji;
              } else if (isPlayer) {
                cellClass = `${visuals.cellRevealed} ${visuals.playerGlow}`;
                content = '🧭';
                glowClass = 'ring-2 ring-amber-400/60';
              } else {
                cellClass = visuals.cellRevealed;
                switch (cell.type) {
                  case 'empty': {
                    // Random subtle decoration
                    const decor = visuals.emptyDecor[(r * GRID + c) % visuals.emptyDecor.length];
                    content = decor;
                    break;
                  }
                  case 'treasure':
                    content = cell.item?.emoji || '💎';
                    glowClass = 'ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(234,179,8,0.25)]';
                    break;
                  case 'trap':
                    content = cell.trap?.emoji || '☠️';
                    glowClass = 'ring-1 ring-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]';
                    break;
                  case 'riddle':
                    content = '🧩';
                    glowClass = 'ring-1 ring-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]';
                    break;
                  case 'exit':
                    content = '🚪';
                    glowClass = 'ring-1 ring-emerald-400/40 shadow-[0_0_16px_rgba(52,211,153,0.3)]';
                    break;
                  case 'wall':
                    content = visuals.wallEmoji;
                    cellClass = `${visuals.cellBase} opacity-80`;
                    break;
                }
              }

              const decorOpacity = cell.revealed && cell.type === 'empty' && content ? 'opacity-20' : '';

              return (
                <motion.button
                  key={`${r}-${c}`}
                  whileTap={isAdjacent ? { scale: 0.85 } : undefined}
                  whileHover={isAdjacent ? { scale: 1.08, y: -2 } : undefined}
                  onClick={() => isAdjacent && handleMove(r, c)}
                  className={cn(
                    'rounded-xl flex items-center justify-center transition-all border relative overflow-hidden',
                    cellClass,
                    glowClass,
                    isAdjacent
                      ? 'cursor-pointer border-amber-400/40 hover:border-amber-300/60 hover:bg-amber-500/10 z-10'
                      : 'cursor-default',
                    !cell.revealed && 'border-white/5',
                  )}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {/* Shimmer on adjacent cells */}
                  {isAdjacent && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  {/* Player pulse ring */}
                  {isPlayer && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-amber-400/50"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {/* Treasure sparkle */}
                  {cell.revealed && cell.type === 'treasure' && (
                    <motion.div
                      className="absolute top-0 right-0 text-[8px]"
                      animate={{ opacity: [0, 1, 0], rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ✨
                    </motion.div>
                  )}
                  <span className={cn(
                    'relative z-10 select-none',
                    isPlayer ? 'text-xl' : 'text-lg',
                    decorOpacity,
                    !cell.revealed && 'text-base opacity-40',
                  )}>
                    {content}
                  </span>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom hint removed - not applicable */}

      {/* Mini compass hint at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 pb-safe-bottom pb-3 flex justify-center"
      >
        <p className="text-[10px] text-white/30 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Toque nas células brilhantes para explorar
        </p>
      </motion.div>

      {/* Riddle Dialog */}
      {state.currentRiddle && (
        <RiddleDialog riddle={state.currentRiddle} onAnswer={handleRiddleAnswer} />
      )}

      {/* Tutorial */}
      {showTutorial && <TreasureTutorial onComplete={() => { setShowTutorial(false); setTutorialSeen(true); }} />}

      {/* Game Over */}
      {state.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-b from-slate-900 to-red-950/50 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-red-800/40"
          >
            <motion.div
              className="text-6xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              💀
            </motion.div>
            <h2 className="text-xl font-bold text-red-400">Missão Falhou!</h2>
            <p className="text-sm text-slate-400">
              {state.timeRemaining <= 0
                ? '⏰ O tempo acabou! Você não encontrou a saída a tempo.'
                : state.riddleErrors >= state.maxRiddleErrors
                ? '🧩 Muitos erros nos enigmas! O conhecimento é sua melhor ferramenta.'
                : 'Sua saúde chegou a zero pelas armadilhas ambientais.'}
            </p>
            <div className="bg-black/30 rounded-2xl p-4 text-xs text-left text-slate-300 space-y-1.5 border border-white/5">
              <p><strong className="text-slate-200">Pontuação:</strong> {state.score}</p>
              <p><strong className="text-slate-200">Tesouros:</strong> {state.treasuresCollected}/{state.totalTreasures}</p>
              <p><strong className="text-slate-200">Enigmas:</strong> {state.riddlesSolved}</p>
              <p><strong className="text-slate-200">Erros:</strong> {state.riddleErrors}/{state.maxRiddleErrors}</p>
              <p><strong className="text-slate-200">Movimentos:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">🗺️ Biomas</button>
              <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-500/20">🔄 Tentar</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Victory */}
      {state.isVictory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="bg-gradient-to-b from-amber-950 to-yellow-950 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border-2 border-amber-400/60"
          >
            <motion.div
              className="text-7xl"
              animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🏆
            </motion.div>
            <h2 className="text-xl font-bold text-amber-300 drop-shadow">Exploração Completa!</h2>
            <p className="text-sm text-amber-400/80">
              {state.treasuresCollected === state.totalTreasures
                ? '🌟 Você coletou todos os tesouros! Incrível!'
                : `Você chegou à saída com ${state.treasuresCollected} de ${state.totalTreasures} tesouros.`}
            </p>
            <div className="bg-black/20 rounded-2xl p-4 text-xs text-left text-amber-200 space-y-1.5 border border-amber-600/20">
              <p><strong>Pontuação:</strong> {state.score}</p>
              <p><strong>Tesouros:</strong> {state.treasuresCollected}/{state.totalTreasures}</p>
              <p><strong>Enigmas:</strong> {state.riddlesSolved} (erros: {state.riddleErrors})</p>
              <p><strong>Tempo restante:</strong> {Math.floor(state.timeRemaining / 60)}:{(state.timeRemaining % 60).toString().padStart(2, '0')} (+bônus)</p>
              <p><strong>Saúde restante:</strong> {state.health} (+bônus)</p>
              <p><strong>Movimentos:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-amber-600 text-sm font-bold text-amber-300 hover:bg-amber-900/50 transition-colors">🗺️ Biomas</button>
              <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-400/20">🌟 Jogar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

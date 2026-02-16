import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Trophy, XCircle, Clock, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generateMemoryCards, getGridColumns } from '../mapGenerator';
import { MAP_THEMES, type MemoryGameState, type MapTheme } from '../types';
import { TreasureTutorial } from './TreasureTutorial';

const MAX_TIME = 240; // 4 minutes
const MAX_ERRORS = 8;
const PAIR_COUNT = 12;

function createGameState(theme: MapTheme): MemoryGameState {
  const cards = generateMemoryCards(theme.id, PAIR_COUNT);
  return {
    cards,
    columns: getGridColumns(cards.length),
    flippedIndices: [],
    matchedPairs: 0,
    totalPairs: PAIR_COUNT,
    errors: 0,
    maxErrors: MAX_ERRORS,
    moves: 0,
    score: 0,
    isGameOver: false,
    isVictory: false,
    theme,
    timeRemaining: MAX_TIME,
    maxTime: MAX_TIME,
    message: null,
    isChecking: false,
  };
}

const BIOME_VISUALS: Record<string, {
  bgGradient: string;
  cardBack: string;
  cardFront: string;
  accentColor: string;
  particleEmojis: string[];
  ambientColor: string;
}> = {
  floresta: {
    bgGradient: 'from-[#0a1f0a] via-[#0d2818] to-[#071510]',
    cardBack: 'from-emerald-700 to-green-800',
    cardFront: 'from-emerald-900/90 to-green-950/90',
    accentColor: 'text-emerald-400',
    particleEmojis: ['🍂', '🦋', '🌿', '✨', '🍃'],
    ambientColor: 'rgba(52,211,153,0.1)',
  },
  oceano: {
    bgGradient: 'from-[#020c1b] via-[#0a1628] to-[#061020]',
    cardBack: 'from-blue-600 to-cyan-700',
    cardFront: 'from-blue-900/90 to-slate-950/90',
    accentColor: 'text-cyan-400',
    particleEmojis: ['🫧', '🐠', '🫧', '✨', '🐟'],
    ambientColor: 'rgba(56,189,248,0.1)',
  },
  montanha: {
    bgGradient: 'from-[#111827] via-[#1e293b] to-[#0f172a]',
    cardBack: 'from-indigo-600 to-slate-700',
    cardFront: 'from-slate-800/90 to-indigo-950/90',
    accentColor: 'text-indigo-400',
    particleEmojis: ['🌬️', '🦅', '☁️', '✨', '❄️'],
    ambientColor: 'rgba(165,180,252,0.1)',
  },
  mangue: {
    bgGradient: 'from-[#042f2e] via-[#0d3b3a] to-[#022c22]',
    cardBack: 'from-teal-600 to-emerald-700',
    cardFront: 'from-teal-900/90 to-cyan-950/90',
    accentColor: 'text-teal-400',
    particleEmojis: ['🦀', '🐚', '🌿', '✨', '🫧'],
    ambientColor: 'rgba(45,212,191,0.1)',
  },
};

// Floating particles
function FloatingParticles({ emojis, color }: { emojis: string[]; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
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
            opacity: [0, 0.6, 0.4, 0.7, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

// Category badge colors
const CATEGORY_COLORS: Record<string, string> = {
  fauna: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  flora: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  clima: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sustentabilidade: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  bioma: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  recurso: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export function TreasureGame({ onBack }: { onBack: () => void }) {
  const [selectedTheme, setSelectedTheme] = useState<MapTheme | null>(null);
  const [state, setState] = useState<MemoryGameState | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);

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
        if (newTime <= 0) return { ...prev, timeRemaining: 0, isGameOver: true };
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.isGameOver, state?.isVictory, selectedTheme]);

  const handleCardClick = useCallback((index: number) => {
    setState(prev => {
      if (!prev || prev.isGameOver || prev.isVictory || prev.isChecking) return prev;
      const card = prev.cards[index];
      if (!card || card.flipped || card.matched) return prev;
      if (prev.flippedIndices.length >= 2) return prev;

      const newCards = prev.cards.map((c, i) =>
        i === index ? { ...c, flipped: true } : c
      );
      const newFlipped = [...prev.flippedIndices, index];

      if (newFlipped.length === 2) {
        const first = newCards[newFlipped[0]];
        const second = newCards[newFlipped[1]];
        const isMatch = first.pairId === second.pairId && first.side !== second.side;

        if (isMatch) {
          // Mark as matched immediately
          const matched = newCards.map(c =>
            c.pairId === first.pairId ? { ...c, matched: true, flipped: true } : c
          );
          const newMatchedPairs = prev.matchedPairs + 1;
          const matchBonus = Math.max(10, 30 - prev.moves);
          const isVictory = newMatchedPairs >= prev.totalPairs;

          return {
            ...prev,
            cards: matched,
            flippedIndices: [],
            matchedPairs: newMatchedPairs,
            moves: prev.moves + 1,
            score: prev.score + matchBonus + (isVictory ? prev.timeRemaining : 0),
            isVictory,
            isChecking: false,
            message: isVictory ? null : `✅ ${first.data.name}!`,
          };
        } else {
          // Wrong match — flip back after delay
          return {
            ...prev,
            cards: newCards,
            flippedIndices: newFlipped,
            moves: prev.moves + 1,
            isChecking: true,
          };
        }
      }

      return { ...prev, cards: newCards, flippedIndices: newFlipped };
    });
  }, []);

  // Handle wrong match flip-back
  useEffect(() => {
    if (!state?.isChecking || state.flippedIndices.length !== 2) return;
    const timer = setTimeout(() => {
      setState(prev => {
        if (!prev) return prev;
        const newCards = prev.cards.map((c, i) =>
          prev.flippedIndices.includes(i) ? { ...c, flipped: false } : c
        );
        const newErrors = prev.errors + 1;
        const isGameOver = newErrors >= prev.maxErrors;
        return {
          ...prev,
          cards: newCards,
          flippedIndices: [],
          errors: newErrors,
          isGameOver,
          isChecking: false,
          message: isGameOver ? null : '❌ Não é par!',
        };
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [state?.isChecking, state?.flippedIndices]);

  // Clear message
  useEffect(() => {
    if (!state?.message) return;
    const timer = setTimeout(() => setState(prev => prev ? { ...prev, message: null } : prev), 1800);
    return () => clearTimeout(timer);
  }, [state?.message]);

  // Theme selector
  if (!selectedTheme || !state) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-lg font-bold text-amber-300">🧠 Memória Ecológica</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-300 mb-6 text-center text-base font-medium"
          >
            ✨ Escolha um bioma para jogar:
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
  const errorPct = (state.errors / state.maxErrors) * 100;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${visuals.bgGradient} flex flex-col text-white relative`}>
      <FloatingParticles emojis={visuals.particleEmojis} color={visuals.ambientColor} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2 bg-black/40 backdrop-blur-xl border-b border-white/5 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 min-h-[44px] px-1">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Brain className={cn('h-5 w-5', visuals.accentColor)} />
          <h1 className="text-sm font-bold text-amber-300 drop-shadow">Memória Ecológica</h1>
        </div>
        <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* HUD */}
      <div className="relative z-10 flex flex-col gap-1.5 px-3 py-2 bg-black/30 backdrop-blur-sm border-b border-white/5 text-xs">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <motion.span key={state.score} animate={{ scale: [1.3, 1] }} className="font-bold tabular-nums">
              {state.score}
            </motion.span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className={cn('h-3.5 w-3.5', visuals.accentColor)} />
            <span className="font-bold tabular-nums">{state.matchedPairs}/{state.totalPairs}</span>
            <span className="text-white/50">pares</span>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-between">
          <div className={cn('flex items-center gap-1', state.timeRemaining <= 30 && 'text-red-400')}>
            <Clock className="h-3.5 w-3.5" />
            <span className="font-bold tabular-nums">
              {Math.floor(state.timeRemaining / 60)}:{(state.timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          {/* Error bar */}
          <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
            <XCircle className={cn('h-3.5 w-3.5 flex-shrink-0', state.errors >= state.maxErrors - 2 ? 'text-red-400' : 'text-white/50')} />
            <div className="flex-1 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className={cn('h-full rounded-full', errorPct > 75 ? 'bg-red-500' : errorPct > 50 ? 'bg-amber-500' : 'bg-white/30')}
                animate={{ width: `${errorPct}%` }}
                transition={{ type: 'spring', stiffness: 200 }}
              />
            </div>
            <span className={cn('font-medium tabular-nums w-10 text-right', state.errors >= state.maxErrors - 2 && 'text-red-400')}>
              {state.errors}/{state.maxErrors}
            </span>
          </div>
          <div className="text-white/40 font-medium tabular-nums">
            {state.moves} jogadas
          </div>
        </div>
      </div>

      {/* Message toast */}
      <AnimatePresence>
        {state.message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl px-5 py-2.5 max-w-xs text-center border border-amber-500/30"
          >
            <p className="text-sm font-semibold">{state.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Grid */}
      <div className="flex-1 flex items-center justify-center p-3 relative z-10">
        <div
          className="grid gap-2 sm:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`, maxWidth: '500px', width: '100%' }}
        >
          {state.cards.map((card, i) => {
            const isFlipped = card.flipped || card.matched;
            const catColor = CATEGORY_COLORS[card.data.category] || CATEGORY_COLORS.fauna;

            return (
              <motion.button
                key={card.uid}
                onClick={() => handleCardClick(i)}
                whileTap={!isFlipped ? { scale: 0.92 } : undefined}
                className={cn(
                  'relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-200',
                  !isFlipped && 'cursor-pointer hover:scale-[1.03]',
                  isFlipped && 'cursor-default',
                  card.matched && 'ring-2 ring-emerald-400/50',
                )}
                style={{ perspective: '600px' }}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Card Back */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl flex items-center justify-center border border-white/20',
                      `bg-gradient-to-br ${visuals.cardBack}`,
                      'shadow-lg',
                    )}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl sm:text-3xl opacity-60">🌍</span>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">ECO</span>
                    </div>
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-[0.08]" style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, currentColor 8px, currentColor 9px)',
                    }} />
                  </div>

                  {/* Card Front */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl border border-white/15 p-1.5 sm:p-2 flex flex-col items-center justify-center gap-1',
                      `bg-gradient-to-br ${visuals.cardFront}`,
                      card.matched && 'border-emerald-400/40',
                    )}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {card.side === 'image' ? (
                      <>
                        <span className="text-3xl sm:text-4xl drop-shadow-lg">{card.data.emoji}</span>
                        <p className="text-[10px] sm:text-xs font-bold text-center leading-tight mt-1 text-white/90">{card.data.name}</p>
                        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full border mt-0.5', catColor)}>
                          {card.data.category}
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="text-[9px] sm:text-[11px] text-center leading-snug text-white/80 font-medium px-0.5">
                          {card.data.description}
                        </p>
                        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full border mt-1', catColor)}>
                          {card.data.category}
                        </span>
                      </>
                    )}
                    {card.matched && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 text-emerald-400 text-xs"
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 pb-safe-bottom pb-3 flex justify-center"
      >
        <p className="text-[10px] text-white/30 flex items-center gap-1">
          <Brain className="h-3 w-3" /> Associe a imagem à descrição correta
        </p>
      </motion.div>

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
            <motion.div className="text-6xl" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5, repeat: 2 }}>
              😵
            </motion.div>
            <h2 className="text-xl font-bold text-red-400">Jogo Encerrado!</h2>
            <p className="text-sm text-slate-400">
              {state.timeRemaining <= 0
                ? '⏰ O tempo acabou!'
                : `❌ Você atingiu o limite de ${state.maxErrors} erros.`}
            </p>
            <div className="bg-black/30 rounded-2xl p-4 text-xs text-left text-slate-300 space-y-1.5 border border-white/5">
              <p><strong className="text-slate-200">Pontuação:</strong> {state.score}</p>
              <p><strong className="text-slate-200">Pares encontrados:</strong> {state.matchedPairs}/{state.totalPairs}</p>
              <p><strong className="text-slate-200">Erros:</strong> {state.errors}/{state.maxErrors}</p>
              <p><strong className="text-slate-200">Jogadas:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">🌍 Biomas</button>
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
            <motion.div className="text-7xl" animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              🏆
            </motion.div>
            <h2 className="text-xl font-bold text-amber-300 drop-shadow">Memória Perfeita!</h2>
            <p className="text-sm text-amber-400/80">
              {state.errors === 0
                ? '🌟 Sem nenhum erro! Incrível!'
                : `Você encontrou todos os pares com apenas ${state.errors} erro${state.errors > 1 ? 's' : ''}!`}
            </p>
            <div className="bg-black/20 rounded-2xl p-4 text-xs text-left text-amber-200 space-y-1.5 border border-amber-600/20">
              <p><strong>Pontuação:</strong> {state.score}</p>
              <p><strong>Pares:</strong> {state.matchedPairs}/{state.totalPairs}</p>
              <p><strong>Erros:</strong> {state.errors}</p>
              <p><strong>Tempo restante:</strong> {Math.floor(state.timeRemaining / 60)}:{(state.timeRemaining % 60).toString().padStart(2, '0')} (+bônus)</p>
              <p><strong>Jogadas:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-amber-600 text-sm font-bold text-amber-300 hover:bg-amber-900/50 transition-colors">🌍 Biomas</button>
              <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-400/20">🌟 Jogar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

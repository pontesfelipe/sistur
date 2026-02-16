import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Heart, MapPin, Trophy, Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generateMap, GRID } from '../mapGenerator';
import { MAP_THEMES, type TreasureGameState, type Position, type MapTheme } from '../types';
import { RiddleDialog } from './RiddleDialog';
import { TreasureTutorial } from './TreasureTutorial';

function createGameState(theme: MapTheme): TreasureGameState {
  const { map, playerStart, totalTreasures } = generateMap(theme.id);
  return {
    map, player: playerStart, score: 0, health: 100, maxHealth: 100,
    moves: 0, treasuresCollected: 0, totalTreasures, riddlesSolved: 0,
    trapsHit: 0, isGameOver: false, isVictory: false, currentRiddle: null,
    riddlePosition: null, theme, message: null,
  };
}

export function TreasureGame({ onBack }: { onBack: () => void }) {
  const [selectedTheme, setSelectedTheme] = useState<MapTheme | null>(null);
  const [state, setState] = useState<TreasureGameState | null>(null);
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

  const showMessage = useCallback((msg: string) => {
    setState(prev => prev ? { ...prev, message: msg } : prev);
    setTimeout(() => setState(prev => prev ? { ...prev, message: null } : prev), 2000);
  }, []);

  const handleMove = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isGameOver || prev.isVictory || prev.currentRiddle) return prev;
      const dr = Math.abs(row - prev.player.row);
      const dc = Math.abs(col - prev.player.col);
      if ((dr + dc) !== 1) return prev; // Only adjacent orthogonal
      const cell = prev.map[row][col];
      if (cell.type === 'wall') return prev;

      const newMap = prev.map.map(r => r.map(c => ({ ...c })));
      // Reveal surrounding cells
      for (let rr = -1; rr <= 1; rr++) {
        for (let cc = -1; cc <= 1; cc++) {
          const nr = row + rr, nc = col + cc;
          if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
            newMap[nr][nc].revealed = true;
          }
        }
      }

      let newState = { ...prev, map: newMap, player: { row, col }, moves: prev.moves + 1 };

      if (cell.type === 'treasure' && cell.item) {
        newState.score += cell.item.points;
        newState.treasuresCollected += 1;
        newMap[row][col] = { type: 'empty', revealed: true };
        setTimeout(() => showMessage(`${cell.item!.emoji} ${cell.item!.name} coletado! +${cell.item!.points}pts`), 50);
      } else if (cell.type === 'trap' && cell.trap) {
        newState.health = Math.max(0, newState.health - cell.trap.damage);
        newState.trapsHit += 1;
        newMap[row][col] = { type: 'empty', revealed: true };
        setTimeout(() => showMessage(`${cell.trap!.emoji} ${cell.trap!.name}! -${cell.trap!.damage} saúde`), 50);
        if (newState.health <= 0) {
          newState.isGameOver = true;
        }
      } else if (cell.type === 'riddle' && cell.riddle) {
        newState.currentRiddle = cell.riddle;
        newState.riddlePosition = { row, col };
      } else if (cell.type === 'exit') {
        newState.isVictory = true;
        newState.score += newState.health; // Bonus for remaining health
      }

      return newState;
    });
  }, [showMessage]);

  const handleRiddleAnswer = useCallback((correct: boolean, reward: number) => {
    setState(prev => {
      if (!prev || !prev.riddlePosition) return prev;
      const newMap = prev.map.map(r => r.map(c => ({ ...c })));
      newMap[prev.riddlePosition.row][prev.riddlePosition.col] = { type: 'empty', revealed: true };
      return {
        ...prev, map: newMap, currentRiddle: null, riddlePosition: null,
        score: prev.score + reward,
        riddlesSolved: correct ? prev.riddlesSolved + 1 : prev.riddlesSolved,
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
          <p className="text-slate-400 mb-6 text-center">Escolha um bioma para explorar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {MAP_THEMES.map((theme, i) => (
              <motion.button
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectTheme(theme)}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} p-6 text-left text-white shadow-xl border border-white/10`}
              >
                <span className="text-4xl block mb-2">{theme.emoji}</span>
                <h3 className="text-lg font-bold">{theme.name}</h3>
                <p className="text-xs text-white/70 mt-1">{theme.description}</p>
                <div className="absolute -bottom-2 -right-2 text-[80px] opacity-10">{theme.emoji}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cellSize = 'min(calc((100vw - 48px) / 8), 56px)';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur border-b border-slate-700/50 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 min-h-[44px] px-1">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{state.theme.emoji}</span>
          <h1 className="text-sm font-bold text-amber-300">{state.theme.name}</h1>
        </div>
        <button onClick={() => setShowTutorial(true)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* HUD */}
      <div className="flex items-center justify-around px-3 py-2 bg-slate-800/50 border-b border-slate-700/30 text-xs">
        <div className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-400" /> <span className={cn(state.health <= 30 && 'text-red-400 font-bold')}>{state.health}</span></div>
        <div className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-400" /> {state.score}</div>
        <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-400" /> {state.treasuresCollected}/{state.totalTreasures}</div>
        <div className="flex items-center gap-1"><Footprints className="h-3.5 w-3.5 text-blue-400" /> {state.moves}</div>
      </div>

      {/* Message toast */}
      <AnimatePresence>
        {state.message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-800 rounded-xl shadow-2xl px-5 py-3 max-w-sm text-center border border-amber-500/30"
          >
            <p className="text-sm font-medium">{state.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Map */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID}, ${cellSize})` }}>
          {state.map.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = r === state.player.row && c === state.player.col;
              const isAdjacent = !state.isGameOver && !state.isVictory && !state.currentRiddle &&
                (Math.abs(r - state.player.row) + Math.abs(c - state.player.col)) === 1 &&
                cell.type !== 'wall';

              let content = '';
              let bg = 'bg-slate-700/30';

              if (!cell.revealed) {
                bg = 'bg-slate-600/50';
                content = '🌫️';
              } else if (isPlayer) {
                bg = 'bg-amber-500/30 ring-2 ring-amber-400';
                content = '🧭';
              } else {
                switch (cell.type) {
                  case 'empty': bg = 'bg-slate-800/40'; content = ''; break;
                  case 'treasure': bg = 'bg-yellow-900/30'; content = cell.item?.emoji || '💎'; break;
                  case 'trap': bg = 'bg-red-900/30'; content = cell.trap?.emoji || '☠️'; break;
                  case 'riddle': bg = 'bg-purple-900/30'; content = '🧩'; break;
                  case 'exit': bg = 'bg-emerald-900/30'; content = '🚪'; break;
                  case 'wall': bg = 'bg-slate-600/60'; content = '🪨'; break;
                }
              }

              return (
                <motion.button
                  key={`${r}-${c}`}
                  whileTap={isAdjacent ? { scale: 0.9 } : undefined}
                  onClick={() => isAdjacent && handleMove(r, c)}
                  className={cn(
                    'rounded-lg flex items-center justify-center text-lg transition-all border',
                    bg,
                    isAdjacent ? 'cursor-pointer border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10' : 'cursor-default border-transparent',
                  )}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {content}
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Riddle Dialog */}
      {state.currentRiddle && (
        <RiddleDialog riddle={state.currentRiddle} onAnswer={handleRiddleAnswer} />
      )}

      {/* Tutorial */}
      {showTutorial && <TreasureTutorial onComplete={() => { setShowTutorial(false); setTutorialSeen(true); }} />}

      {/* Game Over */}
      {state.isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3 border border-red-800/50">
            <div className="text-5xl">💀</div>
            <h2 className="text-xl font-bold text-red-400">Missão Falhou!</h2>
            <p className="text-sm text-slate-400">Sua saúde chegou a zero pelas armadilhas ambientais.</p>
            <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-left text-slate-300 space-y-1">
              <p><strong>Pontuação:</strong> {state.score}</p>
              <p><strong>Tesouros:</strong> {state.treasuresCollected}/{state.totalTreasures}</p>
              <p><strong>Enigmas:</strong> {state.riddlesSolved}</p>
              <p><strong>Movimentos:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-sm font-bold text-slate-300 hover:bg-slate-800">🗺️ Biomas</button>
              <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold">🔄 Tentar novamente</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Victory */}
      {state.isVictory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-gradient-to-b from-amber-950 to-yellow-950 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3 border-2 border-amber-400">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-xl font-bold text-amber-300">Exploração Completa!</h2>
            <p className="text-sm text-amber-400">
              {state.treasuresCollected === state.totalTreasures
                ? 'Você coletou todos os tesouros! Incrível!'
                : `Você chegou à saída com ${state.treasuresCollected} de ${state.totalTreasures} tesouros.`}
            </p>
            <div className="bg-black/20 rounded-xl p-3 text-xs text-left text-amber-200 space-y-1">
              <p><strong>Pontuação:</strong> {state.score}</p>
              <p><strong>Tesouros:</strong> {state.treasuresCollected}/{state.totalTreasures}</p>
              <p><strong>Enigmas:</strong> {state.riddlesSolved}</p>
              <p><strong>Saúde restante:</strong> {state.health} (+bônus)</p>
              <p><strong>Movimentos:</strong> {state.moves}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTheme(null); setState(null); }} className="flex-1 py-3 rounded-xl border border-amber-600 text-sm font-bold text-amber-300 hover:bg-amber-900/50">🗺️ Biomas</button>
              <button onClick={handleRestart} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">🌟 Jogar novamente</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

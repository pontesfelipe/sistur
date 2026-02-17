import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Riddle } from '../types';
import { cn } from '@/lib/utils';
import { getEmojiSprite } from '@/game/spriteMap';

interface RiddleDialogProps {
  riddle: Riddle;
  onAnswer: (correct: boolean, reward: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function RiddleDialog({ riddle, onAnswer }: RiddleDialogProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    const correct = index === riddle.correctIndex;
    setTimeout(() => onAnswer(correct, correct ? riddle.reward : 0), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-gradient-to-b from-[#1a1040] to-[#0f0a2a] rounded-3xl shadow-2xl max-w-md w-full p-6 border border-purple-500/20"
      >
        {/* Header */}
        <div className="text-center mb-5">
          <motion.div
            className="block mb-3 flex justify-center"
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          >
            {getEmojiSprite('🧩') ? (
              <img src={getEmojiSprite('🧩')!} alt="" className="w-14 h-14 object-contain drop-shadow-lg" draggable={false} />
            ) : (
              <span className="text-5xl">🧩</span>
            )}
          </motion.div>
          <h2 className="text-lg font-bold text-purple-200">Enigma Ambiental</h2>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              +{riddle.reward} pts
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
          <p className="text-sm font-semibold text-white text-center leading-relaxed">{riddle.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {riddle.options.map((opt, i) => {
            const isCorrect = i === riddle.correctIndex;
            const isSelected = i === selected;
            return (
              <motion.button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                whileHover={!answered ? { scale: 1.02, x: 4 } : undefined}
                whileTap={!answered ? { scale: 0.97 } : undefined}
                animate={
                  answered && isCorrect
                    ? { scale: [1, 1.03, 1], transition: { duration: 0.4 } }
                    : answered && isSelected && !isCorrect
                    ? { x: [0, -4, 4, -4, 0], transition: { duration: 0.4 } }
                    : undefined
                }
                className={cn(
                  'w-full px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-all border-2 flex items-center gap-3',
                  !answered && 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-400/40 text-white cursor-pointer',
                  answered && isCorrect && 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200',
                  answered && isSelected && !isCorrect && 'bg-red-500/15 border-red-400/60 text-red-200',
                  answered && !isSelected && !isCorrect && 'opacity-30 border-transparent text-white/50',
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                  !answered && 'bg-purple-500/20 text-purple-300',
                  answered && isCorrect && 'bg-emerald-500/30 text-emerald-300',
                  answered && isSelected && !isCorrect && 'bg-red-500/30 text-red-300',
                  answered && !isSelected && !isCorrect && 'bg-white/5 text-white/30',
                )}>
                  {answered && isCorrect ? '✓' : answered && isSelected && !isCorrect ? '✗' : OPTION_LABELS[i]}
                </span>
                <span className="leading-snug">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Result feedback */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              transition={{ delay: 0.3 }}
              className={cn(
                'mt-4 p-4 rounded-2xl text-xs border',
                selected === riddle.correctIndex
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : 'bg-red-500/10 border-red-500/20 text-red-200'
              )}
            >
              <p className="font-bold mb-1 text-sm">
                {selected === riddle.correctIndex ? '✅ Correto!' : '❌ Errado!'}
              </p>
              <p className="leading-relaxed text-white/70">{riddle.explanation}</p>
              {selected === riddle.correctIndex && (
                <motion.p
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="mt-2 font-bold text-amber-400 text-sm"
                >
                  +{riddle.reward} pontos! 🎉
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

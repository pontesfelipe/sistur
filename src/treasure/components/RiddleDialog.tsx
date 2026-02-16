import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Riddle } from '../types';
import { cn } from '@/lib/utils';

interface RiddleDialogProps {
  riddle: Riddle;
  onAnswer: (correct: boolean, reward: number) => void;
}

export function RiddleDialog({ riddle, onAnswer }: RiddleDialogProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    const correct = index === riddle.correctIndex;
    setTimeout(() => onAnswer(correct, correct ? riddle.reward : 0), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="text-center mb-4">
          <span className="text-4xl block mb-2">🧩</span>
          <h2 className="text-lg font-bold text-foreground">Enigma Ambiental</h2>
        </div>

        <p className="text-sm font-medium text-foreground mb-4 text-center">{riddle.question}</p>

        <div className="space-y-2">
          {riddle.options.map((opt, i) => {
            const isCorrect = i === riddle.correctIndex;
            const isSelected = i === selected;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border',
                  !answered && 'hover:bg-primary/10 border-border hover:border-primary',
                  answered && isCorrect && 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-200',
                  answered && isSelected && !isCorrect && 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200',
                  answered && !isSelected && !isCorrect && 'opacity-50 border-border',
                  !answered && 'border-border'
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mt-4 p-3 rounded-xl text-xs',
              selected === riddle.correctIndex
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            )}
          >
            <p className="font-bold mb-1">{selected === riddle.correctIndex ? '✅ Correto!' : '❌ Errado!'}</p>
            <p>{riddle.explanation}</p>
            {selected === riddle.correctIndex && <p className="mt-1 font-bold">+{riddle.reward} pontos!</p>}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

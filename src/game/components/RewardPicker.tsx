import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameCard } from '../cardTypes';
import { CardDisplay } from './CardDisplay';

interface RewardPickerProps {
  cards: GameCard[];
  onPick: (index: number) => void;
  onSkip: () => void;
}

export function RewardPicker({ cards, onPick, onSkip }: RewardPickerProps) {
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const handlePick = (index: number) => {
    setChosenIndex(index);
    setTimeout(() => onPick(index), 1600);
  };

  const chosenCard = chosenIndex !== null ? cards[chosenIndex] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {chosenCard ? (
          <motion.div
            key="chosen"
            initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1.15, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0, opacity: 0, y: -100 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="text-center space-y-4"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-bold text-white drop-shadow-lg"
            >
              ✨ Carta adicionada ao deck!
            </motion.p>
            <CardDisplay card={chosenCard} />
          </motion.div>
        ) : (
          <motion.div
            key="picker"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-2xl shadow-2xl max-w-lg w-full p-5 text-center space-y-4"
          >
            <div className="text-4xl">🎁</div>
            <h2 className="text-xl font-bold">Escolha uma Carta!</h2>
            <p className="text-sm text-muted-foreground">Adicione uma nova carta ao seu deck como recompensa.</p>

            <div className="flex flex-wrap justify-center gap-3">
              {cards.map((card, i) => (
                <CardDisplay
                  key={card.id}
                  card={card}
                  onClick={() => handlePick(i)}
                />
              ))}
            </div>

            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Pular (não adicionar carta)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

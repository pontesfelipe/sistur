import type { GameCard } from '../cardTypes';
import { CardDisplay } from './CardDisplay';

interface RewardPickerProps {
  cards: GameCard[];
  onPick: (index: number) => void;
  onSkip: () => void;
}

export function RewardPicker({ cards, onPick, onSkip }: RewardPickerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full p-5 text-center space-y-4 animate-in zoom-in-95 duration-300">
        <div className="text-4xl">🎁</div>
        <h2 className="text-xl font-bold">Escolha uma Carta!</h2>
        <p className="text-sm text-muted-foreground">Adicione uma nova carta ao seu deck como recompensa.</p>

        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((card, i) => (
            <CardDisplay
              key={card.id}
              card={card}
              onClick={() => onPick(i)}
            />
          ))}
        </div>

        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Pular (não adicionar carta)
        </button>
      </div>
    </div>
  );
}

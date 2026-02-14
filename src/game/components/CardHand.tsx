import type { GameCard } from '../cardTypes';
import { CardDisplay } from './CardDisplay';

interface CardHandProps {
  hand: GameCard[];
  coins: number;
  onPlay: (index: number) => void;
  onDiscard: (index: number) => void;
  canPlay: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

export function CardHand({ hand, coins, onPlay, onDiscard, canPlay, selectedIndex, onSelect }: CardHandProps) {
  if (hand.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">🃏 Sem cartas na mão. Passe o turno para comprar!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Fan layout for cards */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
        {hand.map((card, i) => {
          const tooExpensive = card.cost > coins;
          const isSelected = selectedIndex === i;
          return (
            <div
              key={`${card.id}-${i}`}
              className="transition-transform duration-200"
              style={{
                transform: isSelected ? 'translateY(-12px)' : 'translateY(0)',
              }}
            >
              <CardDisplay
                card={card}
                onClick={() => {
                  if (isSelected) {
                    onPlay(i);
                  } else {
                    onSelect(i);
                  }
                }}
                onDiscard={() => onDiscard(i)}
                tooExpensive={tooExpensive}
                disabled={!canPlay}
                selected={isSelected}
              />
            </div>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <p className="text-xs text-muted-foreground">👆 Toque de novo para jogar</p>
          <button
            onClick={() => onSelect(null)}
            className="text-xs px-2 py-1 rounded-lg bg-muted hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';
import type { GameCard } from '../cardTypes';
import { TCGPlayerCard } from './TCGCard';

interface TCGHandProps {
  hand: GameCard[];
  coins: number;
  onPlay: (index: number) => void;
  onDiscard: (index: number) => void;
  canPlay: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  cardsPlayed: number;
  maxPlays: number;
}

export function TCGHand({ hand, coins, onPlay, onDiscard, canPlay, selectedIndex, onSelect, cardsPlayed, maxPlays }: TCGHandProps) {
  if (hand.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <p className="text-sm">🃏 Sem cartas. Passe o turno para comprar!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>🎴 Mão ({hand.length})</span>
        <span>•</span>
        <span>💰 {coins} moedas</span>
        <span>•</span>
        <span className={cn(
          'font-bold',
          cardsPlayed >= maxPlays ? 'text-red-500' : 'text-emerald-500'
        )}>
          {cardsPlayed}/{maxPlays} jogadas
        </span>
      </div>

      {/* Card fan with perspective */}
      <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 px-2 tcg-card-hand">
        {hand.map((card, i) => {
          const tooExpensive = card.cost > coins;
          const isSelected = selectedIndex === i;
          // Calculate slight rotation for fan effect
          const totalCards = hand.length;
          const mid = (totalCards - 1) / 2;
          const rotation = totalCards > 3 ? (i - mid) * 3 : 0;
          
          return (
            <div
              key={`${card.id}-hand-${i}`}
              style={{
                transform: isSelected ? 'none' : `rotate(${rotation}deg)`,
                transformOrigin: 'bottom center',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: isSelected ? 20 : i,
              }}
            >
              <TCGPlayerCard
                card={card}
                inHand
                selected={isSelected}
                tooExpensive={tooExpensive}
                disabled={!canPlay}
                onClick={() => {
                  if (isSelected) {
                    onPlay(i);
                  } else {
                    onSelect(i);
                  }
                }}
                onDiscard={() => onDiscard(i)}
                animateIn
                animationDelay={i * 100}
              />
            </div>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-xs text-yellow-500 font-bold animate-pulse drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
            ⚡ Toque novamente para jogar!
          </span>
          <button
            onClick={() => onSelect(null)}
            className="text-xs px-3 py-1 rounded-lg bg-muted hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

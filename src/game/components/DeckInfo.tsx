import type { DeckState } from '../cardTypes';

interface DeckInfoProps {
  deck: DeckState;
  totalPlayed: number;
}

export function DeckInfo({ deck, totalPlayed }: DeckInfoProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1" title="Cartas no deck">
        <span className="text-base">🃏</span>
        <span className="font-bold">{deck.drawPile.length}</span>
      </div>
      <div className="flex items-center gap-1" title="Descarte">
        <span className="text-base">🗑️</span>
        <span className="font-bold">{deck.discardPile.length}</span>
      </div>
      <div className="flex items-center gap-1" title="Na mão">
        <span className="text-base">✋</span>
        <span className="font-bold">{deck.hand.length}</span>
      </div>
      {deck.exhaustPile.length > 0 && (
        <div className="flex items-center gap-1" title="Cartas usadas permanentemente">
          <span className="text-base">🔥</span>
          <span className="font-bold">{deck.exhaustPile.length}</span>
        </div>
      )}
      <div className="flex items-center gap-1 ml-auto" title="Total de cartas jogadas">
        <span className="text-base">📊</span>
        <span className="font-bold">{totalPlayed}</span>
      </div>
    </div>
  );
}

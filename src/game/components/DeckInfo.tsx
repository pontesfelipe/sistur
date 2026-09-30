import { tx } from '@/i18n/t';
import type { DeckState } from '../cardTypes';

interface DeckInfoProps {
  deck: DeckState;
  totalPlayed: number;
}

export function DeckInfo({ deck, totalPlayed }: DeckInfoProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1" title={tx('Cartas no deck')}>
        <span className="text-base">🃏</span>
        <span className="font-bold">{deck.drawPile.length}</span>
      </div>
      <div className="flex items-center gap-1" title={tx('Descarte')}>
        <span className="text-base">🗑️</span>
        <span className="font-bold">{deck.discardPile.length}</span>
      </div>
      <div className="flex items-center gap-1" title={tx('Na mão')}>
        <span className="text-base">✋</span>
        <span className="font-bold">{deck.hand.length}</span>
      </div>
      {deck.exhaustPile.length > 0 && (
        <div className="flex items-center gap-1" title={tx('Cartas usadas permanentemente')}>
          <span className="text-base">🔥</span>
          <span className="font-bold">{deck.exhaustPile.length}</span>
        </div>
      )}
      <div className="flex items-center gap-1 ml-auto" title={tx('Total de cartas jogadas')}>
        <span className="text-base">📊</span>
        <span className="font-bold">{totalPlayed}</span>
      </div>
    </div>
  );
}

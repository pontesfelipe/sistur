import type { MemoryCard, MemoryCardData } from './types';
import { MEMORY_PAIRS } from './types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateMemoryCards(themeId: string, pairCount: number = 12): MemoryCard[] {
  const pairs = MEMORY_PAIRS[themeId] || MEMORY_PAIRS.floresta;
  const selected = shuffle(pairs).slice(0, pairCount);

  const cards: MemoryCard[] = [];
  for (const data of selected) {
    // Image card
    cards.push({
      uid: `${data.id}_img`,
      pairId: data.id,
      side: 'image',
      data,
      flipped: false,
      matched: false,
    });
    // Text card
    cards.push({
      uid: `${data.id}_txt`,
      pairId: data.id,
      side: 'text',
      data,
      flipped: false,
      matched: false,
    });
  }

  return shuffle(cards);
}

export function getGridColumns(cardCount: number): number {
  if (cardCount <= 16) return 4;
  if (cardCount <= 24) return 4;
  return 6;
}

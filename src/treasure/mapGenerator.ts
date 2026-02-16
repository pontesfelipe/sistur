import type { MapCell, Position, TreasureItem, Trap, Riddle } from './types';
import { TREASURES, TRAPS, RIDDLES } from './types';

const GRID_SIZE = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateMap(themeId: string): { map: MapCell[][]; playerStart: Position; totalTreasures: number } {
  const map: MapCell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, (): MapCell => ({ type: 'fog', revealed: false }))
  );

  // Player starts at top-left area
  const playerStart: Position = { row: 0, col: 0 };
  map[0][0] = { type: 'empty', revealed: true };

  // Only reveal the starting cell (minesweeper-style)

  // Exit at a random position (not near start)
  let exitRow: number, exitCol: number;
  do {
    exitRow = Math.floor(Math.random() * GRID_SIZE);
    exitCol = Math.floor(Math.random() * GRID_SIZE);
  } while ((exitRow + exitCol) < 4); // ensure exit is far from start
  map[exitRow][exitCol] = { type: 'exit', revealed: false };

  // Place walls (obstacles) — 6-8
  const wallCount = 6 + Math.floor(Math.random() * 3);
  const allPositions: Position[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if ((r === 0 && c === 0) || (r === exitRow && c === exitCol)) continue;
      allPositions.push({ row: r, col: c });
    }
  }

  const shuffled = shuffle(allPositions);
  let placed = 0;
  let idx = 0;

  // Walls
  while (placed < wallCount && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'wall', revealed: false };
      placed++;
    }
  }

  // Treasures — 5
  const treasures = shuffle(TREASURES[themeId] || TREASURES.floresta);
  let tPlaced = 0;
  while (tPlaced < 5 && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'treasure', revealed: false, item: treasures[tPlaced % treasures.length] };
      tPlaced++;
    }
  }

  // Traps — 4
  const traps = shuffle(TRAPS[themeId] || TRAPS.floresta);
  let pPlaced = 0;
  while (pPlaced < 4 && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'trap', revealed: false, trap: traps[pPlaced % traps.length] };
      pPlaced++;
    }
  }

  // Riddles — 14
  const riddles = shuffle(RIDDLES).slice(0, 14);
  let rPlaced = 0;
  while (rPlaced < 14 && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'riddle', revealed: false, riddle: riddles[rPlaced] };
      rPlaced++;
    }
  }

  // Remaining fog cells become empty
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (map[r][c].type === 'fog') {
        map[r][c].type = 'empty';
      }
    }
  }

  return { map, playerStart, totalTreasures: tPlaced };
}

export const GRID = GRID_SIZE;

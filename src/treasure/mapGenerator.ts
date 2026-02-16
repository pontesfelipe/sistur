import type { MapCell, Position, TreasureItem, Trap, Riddle } from './types';
import { TREASURES, TRAPS, RIDDLES } from './types';

const GRID_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Flood-fill reveal empty cells like Minesweeper */
export function floodReveal(map: MapCell[][], row: number, col: number): MapCell[][] {
  const newMap = map.map(r => r.map(c => ({ ...c })));
  const stack: Position[] = [{ row, col }];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const pos = stack.pop()!;
    const key = `${pos.row},${pos.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (pos.row < 0 || pos.row >= GRID_SIZE || pos.col < 0 || pos.col >= GRID_SIZE) continue;

    const cell = newMap[pos.row][pos.col];
    if (cell.revealed) continue;
    if (cell.type === 'wall') continue;

    // Reveal this cell
    newMap[pos.row][pos.col].revealed = true;

    // Only cascade further if cell is empty (no content)
    if (cell.type === 'empty') {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        stack.push({ row: pos.row + dr, col: pos.col + dc });
      }
    }
    // Stop cascade at non-empty cells (treasure, trap, riddle, exit) but still reveal them
  }

  return newMap;
}

export function generateMap(themeId: string): { map: MapCell[][]; playerStart: Position; totalTreasures: number } {
  const map: MapCell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, (): MapCell => ({ type: 'fog', revealed: false }))
  );

  // Player starts at top-left area
  const playerStart: Position = { row: 0, col: 0 };
  map[0][0] = { type: 'empty', revealed: true };

  // Exit at a random position (not near start)
  let exitRow: number, exitCol: number;
  do {
    exitRow = Math.floor(Math.random() * GRID_SIZE);
    exitCol = Math.floor(Math.random() * GRID_SIZE);
  } while ((exitRow + exitCol) < 4);
  map[exitRow][exitCol] = { type: 'exit', revealed: false };

  // Place walls (obstacles) — 10-14
  const wallCount = 10 + Math.floor(Math.random() * 5);
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

  // Treasures — 8
  const treasures = shuffle(TREASURES[themeId] || TREASURES.floresta);
  let tPlaced = 0;
  while (tPlaced < 8 && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'treasure', revealed: false, item: treasures[tPlaced % treasures.length] };
      tPlaced++;
    }
  }

  // Traps — 6
  const traps = shuffle(TRAPS[themeId] || TRAPS.floresta);
  let pPlaced = 0;
  while (pPlaced < 6 && idx < shuffled.length) {
    const pos = shuffled[idx++];
    if (map[pos.row][pos.col].type === 'fog') {
      map[pos.row][pos.col] = { type: 'trap', revealed: false, trap: traps[pPlaced % traps.length] };
      pPlaced++;
    }
  }

  // Riddles — 30
  const riddles = shuffle(RIDDLES).slice(0, 30);
  let rPlaced = 0;
  while (rPlaced < 30 && idx < shuffled.length) {
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

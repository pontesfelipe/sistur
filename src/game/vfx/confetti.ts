import confetti from 'canvas-confetti';

/** Golden victory confetti burst */
export function fireVictoryConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };

  // Burst from left
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.2, y: 0.5 }, colors: ['#fbbf24', '#f59e0b', '#d97706', '#92400e'] });
  // Burst from right
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 60, origin: { x: 0.8, y: 0.5 }, colors: ['#fbbf24', '#f59e0b', '#d97706', '#92400e'] });
  }, 200);
  // Center top shower
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.2 }, colors: ['#fbbf24', '#22c55e', '#3b82f6', '#a855f7'], spread: 120, startVelocity: 45 });
  }, 400);
}

/** Small match/collect burst at a point */
export function fireMatchBurst(x: number, y: number, colors: string[] = ['#22c55e', '#34d399', '#6ee7b7']) {
  confetti({
    particleCount: 25,
    startVelocity: 20,
    spread: 90,
    origin: { x, y },
    colors,
    ticks: 50,
    zIndex: 9999,
    gravity: 1.5,
    scalar: 0.8,
  });
}

/** Defeat/game-over effect — dark particles falling */
export function fireDefeatEffect() {
  confetti({
    particleCount: 40,
    startVelocity: 10,
    spread: 180,
    origin: { x: 0.5, y: 0 },
    colors: ['#ef4444', '#7f1d1d', '#991b1b', '#450a0a'],
    ticks: 100,
    zIndex: 9999,
    gravity: 2,
    scalar: 1.2,
    drift: 0,
  });
}

/** Nature-themed particle burst for eco games */
export function fireEcoBurst(x: number, y: number) {
  confetti({
    particleCount: 30,
    startVelocity: 15,
    spread: 100,
    origin: { x, y },
    colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac'],
    ticks: 60,
    zIndex: 9999,
    shapes: ['circle'],
    gravity: 0.8,
    scalar: 0.7,
  });
}

/**
 * Motor de áudio dos jogos educacionais.
 *
 * Usa Web Audio API com sons sintetizados (sem arquivos de áudio),
 * o que mantém o bundle leve e evita carregamento na entrada do jogo.
 * Todos os efeitos respeitam o mute global persistido em localStorage.
 */

export type GameSound =
  | 'click'
  | 'flip'
  | 'match'
  | 'error'
  | 'coin'
  | 'reveal'
  | 'step'
  | 'victory'
  | 'defeat';

const MUTE_KEY = 'sistur-games-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  delay?: number;
  gain?: number;
  sweepTo?: number;
}

function tone({ freq, duration, type = 'sine', delay = 0, gain = 1, sweepTo }: ToneOptions) {
  const audio = ensureContext();
  if (!audio || !master) return;

  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const env = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), start + duration);

  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env);
  env.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noise(duration: number, gain = 0.4, delay = 0) {
  const audio = ensureContext();
  if (!audio || !master) return;
  const frames = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const env = audio.createGain();
  env.gain.value = gain;
  src.connect(env);
  env.connect(master);
  src.start(audio.currentTime + delay);
}

const RECIPES: Record<GameSound, () => void> = {
  click: () => tone({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.5 }),
  flip: () => tone({ freq: 340, duration: 0.1, type: 'triangle', gain: 0.5, sweepTo: 620 }),
  match: () => {
    tone({ freq: 660, duration: 0.12, type: 'sine', gain: 0.6 });
    tone({ freq: 880, duration: 0.16, type: 'sine', gain: 0.5, delay: 0.09 });
  },
  error: () => {
    tone({ freq: 200, duration: 0.18, type: 'sawtooth', gain: 0.35, sweepTo: 110 });
  },
  coin: () => {
    tone({ freq: 988, duration: 0.08, type: 'square', gain: 0.35 });
    tone({ freq: 1319, duration: 0.14, type: 'square', gain: 0.3, delay: 0.07 });
  },
  reveal: () => {
    tone({ freq: 420, duration: 0.22, type: 'sine', gain: 0.4, sweepTo: 940 });
  },
  step: () => noise(0.08, 0.18),
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.26, type: 'triangle', gain: 0.55, delay: i * 0.13 }),
    );
  },
  defeat: () => {
    [392, 330, 262].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: 'sawtooth', gain: 0.3, delay: i * 0.16 }),
    );
  },
};

export function playSound(name: GameSound) {
  if (muted) return;
  try {
    RECIPES[name]?.();
  } catch {
    /* áudio indisponível — jogo continua normalmente */
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (next && ctx) void ctx.suspend();
  if (!next) ensureContext();
  window.dispatchEvent(new CustomEvent('sistur-games-mute', { detail: next }));
}

export const MUTE_EVENT = 'sistur-games-mute';

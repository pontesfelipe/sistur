import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';
import { MUTE_EVENT, isMuted, playSound, setMuted, type GameSound } from './soundManager';

const HAPTIC_FOR_SOUND: Partial<Record<GameSound, 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'>> = {
  click: 'selection',
  flip: 'light',
  match: 'success',
  error: 'error',
  coin: 'light',
  reveal: 'medium',
  step: 'light',
  victory: 'success',
  defeat: 'error',
};

/**
 * Feedback unificado dos jogos: som sintetizado + vibração (mobile)
 * + preferência de movimento reduzido para efeitos visuais pesados.
 */
export function useGameFeedback() {
  const { vibrate } = useHaptic();
  const prefersReducedMotion = useReducedMotion();
  const [muted, setMutedState] = useState(isMuted);

  useEffect(() => {
    const onChange = (e: Event) => setMutedState((e as CustomEvent<boolean>).detail);
    window.addEventListener(MUTE_EVENT, onChange);
    return () => window.removeEventListener(MUTE_EVENT, onChange);
  }, []);

  const play = useCallback(
    (name: GameSound) => {
      playSound(name);
      const pattern = HAPTIC_FOR_SOUND[name];
      if (pattern) vibrate(pattern);
    },
    [vibrate],
  );

  const toggleMute = useCallback(() => setMuted(!isMuted()), []);

  return {
    play,
    muted,
    toggleMute,
    /** true quando o usuário pediu menos animação no sistema */
    reducedMotion: !!prefersReducedMotion,
  };
}

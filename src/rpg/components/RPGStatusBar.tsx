import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { getEmojiSprite } from '@/game/spriteMap';
import { cn } from '@/lib/utils';
import type { BiomeStats } from '../types';

interface RPGStatusBarProps {
  stats: BiomeStats;
}

const STAT_CONFIG = [
  { key: 'biodiversidade' as const, label: 'Biodiversidade', emoji: '🦜', color: 'bg-green-500' },
  { key: 'poluicao' as const, label: 'Poluição', emoji: '🏭', color: 'bg-red-500', inverted: true },
  { key: 'comunidade' as const, label: 'Comunidade', emoji: '👥', color: 'bg-blue-500' },
  { key: 'recursos' as const, label: 'Recursos', emoji: '💰', color: 'bg-amber-500' },
];

export function RPGStatusBar({ stats }: RPGStatusBarProps) {
  const prevStats = useRef<BiomeStats>(stats);
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    const newDeltas: Record<string, number> = {};
    for (const { key } of STAT_CONFIG) {
      const diff = stats[key] - prevStats.current[key];
      if (diff !== 0) newDeltas[key] = diff;
    }
    if (Object.keys(newDeltas).length > 0) {
      setDeltas(newDeltas);
      const timer = setTimeout(() => setDeltas({}), 2000);
      prevStats.current = { ...stats };
      return () => clearTimeout(timer);
    }
    prevStats.current = { ...stats };
  }, [stats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STAT_CONFIG.map(({ key, label, emoji, color, inverted }) => {
        const value = Math.max(0, Math.min(100, stats[key]));
        const barColor = inverted
          ? value > 60 ? 'bg-red-500' : value > 30 ? 'bg-yellow-500' : 'bg-green-500'
          : value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500';

        const sprite = getEmojiSprite(emoji);
        const delta = deltas[key];
        const displayDelta = delta ? (inverted ? -delta : delta) : 0;

        return (
          <div key={key} className={cn(
            'bg-card/60 backdrop-blur rounded-xl p-3 border transition-all duration-300',
            delta && delta > 0 && !inverted ? 'border-green-500/50' : delta && delta < 0 && !inverted ? 'border-red-500/50' :
            delta && delta > 0 && inverted ? 'border-red-500/50' : delta && delta < 0 && inverted ? 'border-green-500/50' :
            'border-border/50',
          )}>
            <div className="flex items-center gap-1.5 mb-1.5 relative">
              {sprite ? (
                <img src={sprite} alt="" className="w-4 h-4 object-contain" draggable={false} />
              ) : (
                <span className="text-sm">{emoji}</span>
              )}
              <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
              <span className="text-xs font-bold ml-auto tabular-nums">{Math.round(inverted ? 100 - value : value)}%</span>
              {/* Stat change delta indicator */}
              <AnimatePresence>
                {displayDelta !== 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 8, scale: 0.7 }}
                    animate={{ opacity: 1, y: -14, scale: 1 }}
                    exit={{ opacity: 0, y: -24 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={cn(
                      'absolute -top-1 right-0 text-[11px] font-black tabular-nums drop-shadow',
                      displayDelta > 0 ? 'text-green-400' : 'text-red-400',
                    )}
                  >
                    {displayDelta > 0 ? `+${displayDelta}` : displayDelta}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Progress
              value={inverted ? 100 - value : value}
              className="h-2"
              indicatorClassName={barColor}
            />
          </div>
        );
      })}
    </div>
  );
}

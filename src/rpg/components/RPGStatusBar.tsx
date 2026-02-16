import { Progress } from '@/components/ui/progress';
import { getEmojiSprite } from '@/game/spriteMap';
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {STAT_CONFIG.map(({ key, label, emoji, color, inverted }) => {
        const value = Math.max(0, Math.min(100, stats[key]));
        const displayValue = inverted ? 100 - value : value;
        const barColor = inverted
          ? value > 60 ? 'bg-red-500' : value > 30 ? 'bg-yellow-500' : 'bg-green-500'
          : value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500';

        const sprite = getEmojiSprite(emoji);

        return (
          <div key={key} className="bg-card/60 backdrop-blur rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              {sprite ? (
                <img src={sprite} alt="" className="w-4 h-4 object-contain" draggable={false} />
              ) : (
                <span className="text-sm">{emoji}</span>
              )}
              <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
              <span className="text-xs font-bold ml-auto">{Math.round(inverted ? 100 - value : value)}%</span>
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

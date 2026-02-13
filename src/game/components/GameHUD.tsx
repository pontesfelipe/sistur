import type { GameBars, GameLevel, BiomeType } from '../types';
import { LEVEL_NAMES, LEVEL_XP, BIOME_INFO } from '../types';
import { cn } from '@/lib/utils';

interface GameHUDProps {
  bars: GameBars;
  coins: number;
  level: GameLevel;
  xp: number;
  turn: number;
  visitors: number;
  biome: BiomeType;
  alerts: string[];
  equilibrium: number;
}

function BarDisplay({ label, emoji, value, color }: { label: string; emoji: string; value: number; color: string }) {
  const status = value >= 60 ? '🟢' : value >= 40 ? '🟡' : '🔴';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span>{emoji} {label}</span>
        <span>{status} {Math.round(value)}</span>
      </div>
      <div className="h-4 rounded-full bg-black/20 overflow-hidden border border-white/20">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

export function GameHUD({ bars, coins, level, xp, turn, visitors, biome, alerts, equilibrium }: GameHUDProps) {
  const nextLevel = Math.min(5, level + 1) as GameLevel;
  const xpForNext = LEVEL_XP[nextLevel];
  const xpProgress = xpForNext > 0 ? Math.min(100, (xp / xpForNext) * 100) : 100;

  return (
    <div className="flex flex-col gap-3">
      {/* Level & XP */}
      <div className="bg-gradient-to-r from-purple-600/90 to-indigo-600/90 rounded-xl p-3 text-white shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold">⭐ {LEVEL_NAMES[level]}</span>
          <span className="text-xs opacity-80">Nível {level}</span>
        </div>
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-yellow-400 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs opacity-70 mt-1">
          <span>{xp} XP</span>
          <span>{xpForNext} XP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl p-3 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <div className="text-lg font-bold">💰 {coins}</div>
            <div className="text-[10px] text-muted-foreground">Moedas</div>
          </div>
          <div>
            <div className="text-lg font-bold">👥 {visitors}</div>
            <div className="text-[10px] text-muted-foreground">Visitantes</div>
          </div>
          <div>
            <div className="text-lg font-bold">{BIOME_INFO[biome].emoji}</div>
            <div className="text-[10px] text-muted-foreground">Turno {turn}</div>
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-2">
          <BarDisplay label="Natureza" emoji="🌳" value={bars.ra} color="#22c55e" />
          <BarDisplay label="Conforto" emoji="🏗️" value={bars.oe} color="#3b82f6" />
          <BarDisplay label="Organização" emoji="🤝" value={bars.ao} color="#a855f7" />
        </div>

        {/* Equilibrium */}
        <div className="mt-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>⚖️ Equilíbrio</span>
            <span className={cn(
              equilibrium >= 60 ? 'text-green-600' : equilibrium >= 40 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {Math.round(equilibrium)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-black/10 overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${equilibrium}%`,
                background: equilibrium >= 60
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : equilibrium >= 40
                  ? 'linear-gradient(90deg, #eab308, #facc15)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
          {alerts.map((alert, i) => (
            <p key={i} className="text-xs font-medium text-red-700 dark:text-red-300">{alert}</p>
          ))}
        </div>
      )}
    </div>
  );
}

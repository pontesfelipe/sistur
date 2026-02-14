import type { GameBars, GameLevel, BiomeType, AvatarPreset, ProfileScores } from '../types';
import { LEVEL_NAMES, LEVEL_XP, BIOME_INFO, PROFILE_INFO } from '../types';
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
  dominantProfile?: AvatarPreset;
  profileScores?: ProfileScores;
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

const PROFILE_COLORS: Record<AvatarPreset, string> = {
  explorador: '#22c55e',
  construtor: '#3b82f6',
  guardiao: '#a855f7',
  cientista: '#f59e0b',
};

export function GameHUD({ bars, coins, level, xp, turn, visitors, biome, alerts, equilibrium, dominantProfile, profileScores }: GameHUDProps) {
  const nextLevel = Math.min(5, level + 1) as GameLevel;
  const xpForNext = LEVEL_XP[nextLevel];
  const xpProgress = xpForNext > 0 ? Math.min(100, (xp / xpForNext) * 100) : 100;

  const totalScore = profileScores
    ? profileScores.explorador + profileScores.construtor + profileScores.guardiao + profileScores.cientista
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Dynamic Profile Badge */}
      {dominantProfile && profileScores && totalScore > 0 && (
        <div
          className="rounded-xl p-3 shadow-lg backdrop-blur-sm text-white"
          style={{
            background: `linear-gradient(135deg, ${PROFILE_COLORS[dominantProfile]}dd, ${PROFILE_COLORS[dominantProfile]}88)`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{PROFILE_INFO[dominantProfile].emoji}</span>
            <div>
              <div className="text-sm font-bold">{PROFILE_INFO[dominantProfile].name}</div>
              <div className="text-[10px] opacity-80">{PROFILE_INFO[dominantProfile].description}</div>
            </div>
          </div>
          {/* Profile breakdown bars */}
          <div className="space-y-1">
            {(Object.entries(PROFILE_INFO) as [AvatarPreset, typeof PROFILE_INFO.explorador][]).map(([key, info]) => {
              const score = profileScores[key];
              const pct = totalScore > 0 ? (score / totalScore) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-xs w-4 text-center">{info.emoji}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: key === dominantProfile ? '#fff' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] w-8 text-right opacity-80">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hint before any actions */}
      {(!profileScores || totalScore === 0) && (
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-3 shadow-lg border border-amber-200 dark:border-amber-700">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 text-center">
            🧭 Jogue para descobrir seu perfil!
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-300 text-center mt-0.5">
            Suas ações definem quem você é.
          </p>
        </div>
      )}

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

      {/* Victory Objectives */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 rounded-xl p-3 shadow-lg border border-amber-200 dark:border-amber-700">
        <p className="text-xs font-bold mb-2 text-amber-800 dark:text-amber-200">🎯 Objetivo: Cidade do Futuro</p>
        <div className="space-y-1.5">
          {[
            { done: level >= 5, label: 'Nível 5', emoji: '⭐' },
            { done: equilibrium >= 70, label: `Equilíbrio ≥ 70 (${Math.round(equilibrium)})`, emoji: '⚖️' },
            { done: bars.ra >= 50 && bars.oe >= 50 && bars.ao >= 50, label: 'Barras ≥ 50', emoji: '📊' },
            { done: visitors >= 200, label: `200+ Visitantes (${visitors})`, emoji: '👥' },
          ].map((obj, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span>{obj.done ? '✅' : '⬜'}</span>
              <span className={cn(obj.done ? 'text-green-700 dark:text-green-400 line-through' : 'text-amber-700 dark:text-amber-300')}>
                {obj.emoji} {obj.label}
              </span>
            </div>
          ))}
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

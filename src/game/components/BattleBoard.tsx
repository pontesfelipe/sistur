import { cn } from '@/lib/utils';
import type { GameCard } from '../cardTypes';
import type { ThreatCard } from '../threatCards';
import { TCGPlayerCard, TCGThreatCard } from './TCGCard';
import { CATEGORY_COLORS } from '../cardTypes';

interface BattleBoardProps {
  /** Player cards played this turn and previous (grouped by pillar) */
  playerBoard: { RA: GameCard[]; OE: GameCard[]; AO: GameCard[] };
  /** Active threats on the field */
  threats: ThreatCard[];
  /** Score summary */
  scores: { ra: number; oe: number; ao: number; total: number; target: number };
  equilibrium: number;
  turn: number;
}

export function BattleBoard({ playerBoard, threats, scores, equilibrium, turn }: BattleBoardProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── THREAT ZONE (top) ── */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-px flex-1 bg-red-500/30" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
            ⚔️ Ameaças — Turno {turn}
          </span>
          <div className="h-px flex-1 bg-red-500/30" />
        </div>
        
        <div className="min-h-[120px] sm:min-h-[140px] rounded-xl bg-gradient-to-b from-red-950/40 to-red-900/20 border border-red-800/30 p-2 flex items-center justify-center">
          {threats.length === 0 ? (
            <p className="text-xs text-red-400/50 italic">Nenhuma ameaça no campo...</p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {threats.map((threat, i) => (
                <TCGThreatCard key={`${threat.id}-${i}`} threat={threat} animateIn />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SCORE BAR (middle) ── */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border">
        <ScorePill icon="🌳" label="RA" value={scores.ra} max={100} color="bg-emerald-500" />
        <ScorePill icon="🏗️" label="OE" value={scores.oe} max={100} color="bg-blue-500" />
        <ScorePill icon="🤝" label="AO" value={scores.ao} max={100} color="bg-purple-500" />
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center">
          <span className={cn(
            'text-sm font-black tabular-nums',
            equilibrium >= 60 ? 'text-emerald-500' : equilibrium >= 40 ? 'text-yellow-500' : 'text-red-500',
          )}>
            ⚖️ {Math.round(equilibrium)}%
          </span>
          <span className="text-[8px] text-muted-foreground">Equilíbrio</span>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="text-xs font-bold text-amber-500 tabular-nums">
            🏆 {scores.total}/{scores.target}
          </span>
          <span className="text-[8px] text-muted-foreground">Pontuação</span>
        </div>
      </div>

      {/* ── PLAYER ZONE (bottom) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px flex-1 bg-emerald-500/30" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            🃏 Suas Cartas em Campo
          </span>
          <div className="h-px flex-1 bg-emerald-500/30" />
        </div>

        {/* Three rows: RA, OE, AO */}
        {(['RA', 'OE', 'AO'] as const).map(pillar => {
          const cards = playerBoard[pillar];
          const catInfo = CATEGORY_COLORS[pillar];
          return (
            <div key={pillar} className="flex items-center gap-2">
              {/* Row label */}
              <div className={cn(
                'flex-shrink-0 w-16 sm:w-20 flex flex-col items-center py-1 px-1.5 rounded-lg',
                'bg-gradient-to-r text-white text-[9px] font-bold',
                catInfo.gradient,
              )}>
                <span className="text-sm">{catInfo.emoji}</span>
                <span>{catInfo.label}</span>
              </div>

              {/* Cards row */}
              <div className="flex-1 min-h-[115px] sm:min-h-[135px] rounded-lg bg-gradient-to-r from-card/60 to-card/40 border border-border/50 p-1.5 flex items-center overflow-x-auto gap-1.5">
                {cards.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/40 italic mx-auto">
                    Jogue cartas de {catInfo.label} aqui
                  </p>
                ) : (
                  cards.map((card, i) => (
                    <TCGPlayerCard
                      key={`${card.id}-${pillar}-${i}`}
                      card={card}
                      onBoard
                      animateIn
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorePill({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
      <div className="flex items-center gap-1">
        <span className="text-xs">{icon}</span>
        <span className="text-xs font-bold tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

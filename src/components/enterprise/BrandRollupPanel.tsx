import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Star, TrendingDown, Activity } from 'lucide-react';
import { PILLAR_INFO } from '@/types/sistur';
import type { UnitWithScores, BrandRollupRow } from '@/hooks/useBrandRollup';
import { cn } from '@/lib/utils';

interface Props {
  brandName: string | null;
  units: UnitWithScores[];
  rollups: BrandRollupRow[];
}

const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${Math.round(Number(n) * 100)}%`;

const severityClass = (score: number) => {
  if (score < 0.34) return 'bg-severity-critico/15 text-severity-critico border-severity-critico/40';
  if (score < 0.67) return 'bg-severity-moderado/15 text-severity-moderado border-severity-moderado/40';
  return 'bg-severity-bom/15 text-severity-bom border-severity-bom/40';
};

export function BrandRollupPanel({ brandName, units, rollups }: Props) {
  const global = rollups.find((r) => r.pillar === 'GLOBAL');
  const byPillar = (p: string) => rollups.find((r) => r.pillar === p);

  // Sort units by GLOBAL-ish: average of pillar scores
  const ranked = [...units]
    .map((u) => {
      const avg =
        u.pillar_scores.length === 0
          ? 0
          : u.pillar_scores.reduce((s, p) => s + p.score, 0) / u.pillar_scores.length;
      return { ...u, avg };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-primary" />
          Marca: <span className="font-semibold">{brandName ?? 'Sem nome'}</span>
          <Badge variant="outline" className="ml-2">
            {units.length} unidades
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pillar consolidated scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['RA', 'OE', 'AO', 'GLOBAL'] as const).map((p) => {
            const row = byPillar(p);
            const label = p === 'GLOBAL' ? 'Marca (Final)' : PILLAR_INFO[p as 'RA' | 'OE' | 'AO']?.name || p;
            return (
              <div
                key={p}
                className={cn(
                  'rounded-lg border p-3 flex flex-col gap-1',
                  row ? severityClass(Number(row.score_weighted)) : 'opacity-50',
                )}
              >
                <div className="text-xs font-medium uppercase tracking-wide">{label}</div>
                <div className="text-2xl font-bold leading-none">
                  {pct(row?.score_weighted)}
                </div>
                <div className="text-[10px] opacity-80">
                  Simples {pct(row?.score_simple)} · σ {pct(row?.stddev)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Per-pillar critical unit */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Unidade mais frágil por pilar
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(['RA', 'OE', 'AO'] as const).map((p) => {
              const row = byPillar(p);
              const critical = units.find((u) => u.id === row?.critical_unit_id);
              if (!row || !critical) return null;
              return (
                <Badge key={p} variant="outline" className="font-normal">
                  <strong className="mr-1">{p}:</strong> {critical.unit_name}
                  {critical.destination_state ? ` (${critical.destination_state})` : ''}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Ranking interno */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Ranking interno das unidades
          </div>
          <div className="space-y-1">
            {ranked.map((u, idx) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 text-sm rounded border px-2.5 py-1.5 bg-card"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono w-5 text-muted-foreground">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {u.is_primary && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  <span className="truncate font-medium">{u.unit_name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {u.destination_name}
                    {u.destination_state ? ` · ${u.destination_state}` : ''}
                  </span>
                  {u.room_count ? (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {u.room_count} UH
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(['RA', 'OE', 'AO'] as const).map((p) => {
                    const s = u.pillar_scores.find((x) => x.pillar === p);
                    return (
                      <Badge
                        key={p}
                        variant="outline"
                        className={cn('text-[10px] font-mono', s && severityClass(s.score))}
                      >
                        {p} {s ? pct(s.score) : '—'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground border-t pt-2">
          Consolidação ponderada por número de quartos (UH). Os indicadores, gargalos e prescrições
          mostrados nas abas abaixo agregam todas as unidades — filtros por unidade entram em fase
          seguinte.
        </p>
      </CardContent>
    </Card>
  );
}
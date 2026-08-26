// v1.98.0 — Simulador "E se?" (what-if).
//
// Permite ajustar hipoteticamente o score normalizado de indicadores e ver o
// impacto no índice de cada pilar e na classificação (régua canônica SISTUR).
// É 100% local: nada é gravado no banco e o diagnóstico oficial não muda.

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RotateCcw } from 'lucide-react';
import { PILLAR_INFO, SEVERITY_INFO, getSeverityFromScore, type Pillar, type Severity } from '@/types/sistur';

interface Props {
  indicatorScores: any[];
  pillarScores: any[];
}

const PILLARS: Pillar[] = ['RA', 'OE', 'AO'];

const weightedAverage = (rows: { score: number; weight: number }[]) => {
  const totalWeight = rows.reduce((acc, r) => acc + (r.weight || 0), 0);
  if (totalWeight <= 0) return null;
  return rows.reduce((acc, r) => acc + r.score * (r.weight || 0), 0) / totalWeight;
};

export function WhatIfSimulatorPanel({ indicatorScores, pillarScores }: Props) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const rows = useMemo(
    () =>
      indicatorScores
        .filter((s: any) => s.indicator && typeof s.score === 'number')
        .map((s: any) => ({
          id: s.id as string,
          code: s.indicator.code as string,
          name: s.indicator.name as string,
          pillar: (s.indicator.pillar || 'OE') as Pillar,
          baseScore: s.score as number,
          weight: Number(s.weight_used ?? s.indicator.weight ?? 1) || 1,
        }))
        .sort((a, b) => a.baseScore - b.baseScore),
    [indicatorScores],
  );

  const simulated = useMemo(
    () => rows.map((r) => ({ ...r, score: overrides[r.id] ?? r.baseScore })),
    [rows, overrides],
  );

  const pillarResults = useMemo(() => {
    return PILLARS.map((pillar) => {
      const group = simulated.filter((r) => r.pillar === pillar);
      const baseline =
        pillarScores.find((p: any) => p.pillar === pillar)?.score ??
        weightedAverage(group.map((r) => ({ score: r.baseScore, weight: r.weight })));
      const projected = weightedAverage(group.map((r) => ({ score: r.score, weight: r.weight })));
      return { pillar, baseline: baseline as number | null, projected, count: group.length };
    });
  }, [simulated, pillarScores]);

  const touched = Object.keys(overrides).length;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Calcule a rodada para habilitar o simulador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Simulação local: ajuste os indicadores para estimar o efeito no índice de cada pilar. Nada é salvo e o
          diagnóstico oficial permanece inalterado.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Impacto projetado nos pilares</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setOverrides({})} disabled={touched === 0}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pillarResults.map(({ pillar, baseline, projected, count }) => {
            const deltaPP =
              typeof baseline === 'number' && typeof projected === 'number'
                ? Math.round((projected - baseline) * 100)
                : null;
            const severity = typeof projected === 'number' ? (getSeverityFromScore(projected) as Severity) : null;
            const baseSeverity = typeof baseline === 'number' ? (getSeverityFromScore(baseline) as Severity) : null;
            return (
              <div key={pillar} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{PILLAR_INFO[pillar]?.fullName}</p>
                <p className="text-2xl font-bold">
                  {typeof projected === 'number' ? `${Math.round(projected * 100)}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Atual: {typeof baseline === 'number' ? `${Math.round(baseline * 100)}%` : '—'} · {count} indicadores
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {severity && (
                    <Badge variant="outline" className={SEVERITY_INFO[severity].color}>
                      {SEVERITY_INFO[severity].label}
                    </Badge>
                  )}
                  {deltaPP !== null && deltaPP !== 0 && (
                    <span className={deltaPP > 0 ? 'text-xs text-severity-good' : 'text-xs text-severity-critical'}>
                      {deltaPP > 0 ? '+' : ''}
                      {deltaPP} pp
                    </span>
                  )}
                </div>
                {severity && baseSeverity && severity !== baseSeverity && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mudaria de {SEVERITY_INFO[baseSeverity].label} para {SEVERITY_INFO[severity].label}.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajustar indicadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {simulated.map((r) => {
            const value = Math.round(r.score * 100);
            const base = Math.round(r.baseScore * 100);
            const severity = getSeverityFromScore(r.score) as Severity;
            return (
              <div key={r.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{r.code}</span> — {r.name}{' '}
                    <span className="text-xs text-muted-foreground">({r.pillar})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={SEVERITY_INFO[severity].color}>
                      {SEVERITY_INFO[severity].label}
                    </Badge>
                    <span className="font-semibold tabular-nums">{value}%</span>
                    {value !== base && (
                      <span className="text-xs text-muted-foreground">(atual {base}%)</span>
                    )}
                  </span>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label={`Simular ${r.code}`}
                  onValueChange={([next]) =>
                    setOverrides((prev) => ({ ...prev, [r.id]: (next ?? 0) / 100 }))
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

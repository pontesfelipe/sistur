// v1.98.0 — Comparativo entre ciclos (Rodada A vs Rodada B).
//
// Compara duas rodadas CALCULATED do mesmo destino/empreendimento lado a lado:
// índices por pilar e delta por indicador (melhorias, regressões e estáveis),
// com exportação CSV. Somente leitura — nenhum cálculo é persistido.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowRight, ArrowUp, Download } from 'lucide-react';
import { PILLAR_INFO, SEVERITY_INFO, getSeverityFromScore, type Pillar, type Severity } from '@/types/sistur';

interface Props {
  assessmentId: string;
  destinationId?: string | null;
  destinationName?: string | null;
}

const pct = (score?: number | null) =>
  typeof score === 'number' ? `${Math.round(score * 100)}%` : '—';

const deltaPts = (a?: number | null, b?: number | null) =>
  typeof a === 'number' && typeof b === 'number' ? Math.round((b - a) * 100) : null;

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 text-severity-good">
        <ArrowUp className="h-3 w-3" />+{value} pp
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 text-severity-critical">
        <ArrowDown className="h-3 w-3" />
        {value} pp
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <ArrowRight className="h-3 w-3" />0 pp
    </span>
  );
}

export function CycleComparisonPanel({ assessmentId, destinationId, destinationName }: Props) {
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['cycle-comparison-candidates', destinationId],
    queryFn: async () => {
      if (!destinationId) return [];
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, period_start, period_end, calculated_at, status')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED')
        .order('period_end', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!destinationId,
  });

  const defaultB = assessmentId;
  const defaultA = useMemo(
    () => candidates.find((c: any) => c.id !== assessmentId)?.id ?? '',
    [candidates, assessmentId],
  );

  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');
  const effectiveA = aId || defaultA;
  const effectiveB = bId || defaultB;

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['cycle-comparison', effectiveA, effectiveB],
    queryFn: async () => {
      if (!effectiveA || !effectiveB) return null;
      const ids = [effectiveA, effectiveB];
      const [{ data: pillars, error: pErr }, { data: scores, error: sErr }] = await Promise.all([
        supabase.from('pillar_scores').select('assessment_id, pillar, score').in('assessment_id', ids),
        supabase
          .from('indicator_scores')
          .select('assessment_id, score, indicator:indicators(code, name, pillar)')
          .in('assessment_id', ids),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      return { pillars: pillars || [], scores: scores || [] };
    },
    enabled: !!effectiveA && !!effectiveB && effectiveA !== effectiveB,
  });

  const pillarRows = useMemo(() => {
    const rows: { pillar: Pillar; a?: number; b?: number }[] = (['RA', 'OE', 'AO'] as Pillar[]).map((pillar) => ({
      pillar,
      a: comparison?.pillars.find((p: any) => p.assessment_id === effectiveA && p.pillar === pillar)?.score,
      b: comparison?.pillars.find((p: any) => p.assessment_id === effectiveB && p.pillar === pillar)?.score,
    }));
    return rows;
  }, [comparison, effectiveA, effectiveB]);

  const indicatorRows = useMemo(() => {
    if (!comparison) return [];
    type Row = { code: string; name: string; pillar: string; a?: number; b?: number };
    const map = new Map<string, Row>();
    comparison.scores.forEach((s: any) => {
      const code = s.indicator?.code;
      if (!code) return;
      const entry: Row = map.get(code) || {
        code,
        name: s.indicator?.name || '',
        pillar: s.indicator?.pillar || '',
      };

      if (s.assessment_id === effectiveA) entry.a = s.score;
      if (s.assessment_id === effectiveB) entry.b = s.score;
      map.set(code, entry);
    });
    return Array.from(map.values()).sort((x, y) => {
      const dx = deltaPts(x.a, x.b) ?? 0;
      const dy = deltaPts(y.a, y.b) ?? 0;
      return dx - dy;
    });
  }, [comparison, effectiveA, effectiveB]);

  const counts = useMemo(() => {
    let improved = 0;
    let worsened = 0;
    let stable = 0;
    indicatorRows.forEach((r) => {
      const d = deltaPts(r.a, r.b);
      if (d === null) return;
      if (d > 0) improved += 1;
      else if (d < 0) worsened += 1;
      else stable += 1;
    });
    return { improved, worsened, stable };
  }, [indicatorRows]);

  const labelFor = (id: string) => {
    const c = candidates.find((x: any) => x.id === id);
    return c ? c.title : id;
  };

  const handleExportCSV = () => {
    const rows = [
      ['Codigo', 'Indicador', 'Pilar', `Rodada A (${labelFor(effectiveA)}) %`, `Rodada B (${labelFor(effectiveB)}) %`, 'Delta (pp)'],
      ...indicatorRows.map((r) => [
        r.code,
        `"${r.name.replace(/"/g, '""')}"`,
        r.pillar,
        typeof r.a === 'number' ? Math.round(r.a * 100) : '',
        typeof r.b === 'number' ? Math.round(r.b * 100) : '',
        deltaPts(r.a, r.b) ?? '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparativo-ciclos-${destinationName || 'sistur'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadingCandidates) return <Skeleton className="h-64 w-full" />;

  if (candidates.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          É necessário ter pelo menos duas rodadas calculadas deste destino para comparar ciclos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparativo entre ciclos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rodada A (base)</p>
              <Select value={effectiveA} onValueChange={setAId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rodada B (comparação)</p>
              <Select value={effectiveB} onValueChange={setBId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {effectiveA === effectiveB ? (
            <p className="text-sm text-muted-foreground">Selecione duas rodadas diferentes.</p>
          ) : isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {pillarRows.map((row) => {
                  const d = deltaPts(row.a, row.b);
                  return (
                    <div key={row.pillar} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{PILLAR_INFO[row.pillar]?.fullName}</p>
                      <p className="text-lg font-semibold">
                        {pct(row.a)} <span className="text-muted-foreground">→</span> {pct(row.b)}
                      </p>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <DeltaBadge value={d} />
                        {typeof row.b === 'number' && (
                          <Badge variant="outline" className={SEVERITY_INFO[getSeverityFromScore(row.b) as Severity].color}>
                            {SEVERITY_INFO[getSeverityFromScore(row.b) as Severity].label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-severity-good">{counts.improved} melhoraram</span>
                <span className="text-severity-critical">{counts.worsened} regrediram</span>
                <span className="text-muted-foreground">{counts.stable} estáveis</span>
                <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2">Indicador</th>
                      <th className="py-2 pr-2">Pilar</th>
                      <th className="py-2 pr-2 text-right">A</th>
                      <th className="py-2 pr-2 text-right">B</th>
                      <th className="py-2 text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicatorRows.map((r) => (
                      <tr key={r.code} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <span className="font-medium">{r.code}</span> — {r.name}
                        </td>
                        <td className="py-2 pr-2">{r.pillar}</td>
                        <td className="py-2 pr-2 text-right">{pct(r.a)}</td>
                        <td className="py-2 pr-2 text-right">{pct(r.b)}</td>
                        <td className="py-2 text-right">
                          <DeltaBadge value={deltaPts(r.a, r.b)} />
                        </td>
                      </tr>
                    ))}
                    {indicatorRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Sem indicadores comparáveis entre as rodadas selecionadas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

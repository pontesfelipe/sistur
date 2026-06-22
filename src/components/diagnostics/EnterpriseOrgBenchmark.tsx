import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  orgId: string | null;
  currentDestinationId: string;
  currentAssessmentId: string;
}

const PILLAR_LABELS: Record<string, string> = { RA: 'I-RA', OE: 'I-OE', AO: 'I-AO' };

function median(arr: number[]) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

/**
 * Fase 11.2 — Benchmark intra-organização Enterprise.
 * Compara o empreendimento atual com a média/mediana dos demais empreendimentos
 * da mesma organização. Sem nomes, sem ranking público (apenas N empreendimentos)
 * — alinhado às restrições `no-public-rankings` e `i-sistur-internal-only`.
 */
export function EnterpriseOrgBenchmark({ orgId, currentDestinationId, currentAssessmentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['enterprise-benchmark', orgId, currentDestinationId],
    queryFn: async () => {
      if (!orgId) return null;
      // Find latest CALCULATED enterprise assessments in the org (one per destination)
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, destination_id, calculated_at')
        .eq('org_id', orgId)
        .eq('diagnostic_type', 'enterprise')
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: false })
        .limit(200);
      const latestByDest = new Map<string, string>();
      (assessments ?? []).forEach((a) => {
        if (a.destination_id && !latestByDest.has(a.destination_id)) {
          latestByDest.set(a.destination_id, a.id);
        }
      });
      const ids = Array.from(latestByDest.values());
      if (ids.length === 0) return null;
      const { data: scores } = await supabase
        .from('pillar_scores')
        .select('assessment_id, pillar, score');
      const map = new Map<string, Record<string, number>>();
      (scores ?? []).forEach((s) => {
        if (!ids.includes(s.assessment_id)) return;
        const r = map.get(s.assessment_id) ?? {};
        r[s.pillar] = Math.round((Number(s.score) || 0) * 100);
        map.set(s.assessment_id, r);
      });
      const others: Record<string, number[]> = { RA: [], OE: [], AO: [] };
      let current: Record<string, number> | null = null;
      latestByDest.forEach((aid, destId) => {
        const row = map.get(aid);
        if (!row) return;
        if (destId === currentDestinationId) {
          current = row;
        } else {
          ['RA', 'OE', 'AO'].forEach((p) => {
            if (typeof row[p] === 'number') others[p].push(row[p]);
          });
        }
      });
      return { current, others, total: latestByDest.size };
    },
    enabled: !!orgId,
  });

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data || !data.current || data.total < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Benchmark interno ({data.total} empreendimentos)
        </CardTitle>
        <CardDescription>
          Comparação anônima entre empreendimentos Enterprise da mesma organização. Sem ranking público — uso interno apenas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3">
          {(['RA', 'OE', 'AO'] as const).map((p) => {
            const mine = (data.current as Record<string, number>)[p] ?? 0;
            const arr = data.others[p];
            const avg = arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
            const med = arr.length ? Math.round(median(arr)) : 0;
            const diff = mine - avg;
            return (
              <div key={p} className="rounded-lg border p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{PILLAR_LABELS[p]}</span>
                  <Badge variant={diff >= 0 ? 'default' : 'secondary'}>
                    {diff >= 0 ? '+' : ''}{diff} pp vs média
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{mine}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Média da org: {avg}% · Mediana: {med}% · N={arr.length}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  destinationId: string;
  diagnosticType: 'territorial' | 'enterprise';
}

const PILLAR_LABELS: Record<string, string> = { RA: 'I-RA', OE: 'I-OE', AO: 'I-AO' };

/**
 * Fase 11.1 — Alertas de regressão Enterprise.
 * Detecta quedas >2% em I-RA/I-OE/I-AO por 2+ rodadas consecutivas (regra de
 * `regression-detection-alerts`). Estritamente intra-empreendimento/intra-destino —
 * nenhum ranking entre destinos. Visual apenas; sem disparo de e-mail.
 */
export function EnterpriseRegressionAlerts({ destinationId, diagnosticType }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['enterprise-regression', destinationId, diagnosticType],
    queryFn: async () => {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, calculated_at, created_at')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED')
        .eq('diagnostic_type', diagnosticType)
        .order('calculated_at', { ascending: true })
        .limit(12);
      const list = assessments ?? [];
      if (list.length < 3) return [];
      const ids = list.map((a) => a.id);
      const { data: scores } = await supabase
        .from('pillar_scores')
        .select('assessment_id, pillar, score')
        .in('assessment_id', ids);
      const series: Record<string, Array<{ id: string; title: string; score: number }>> = {
        RA: [], OE: [], AO: [],
      };
      list.forEach((a) => {
        ['RA', 'OE', 'AO'].forEach((p) => {
          const s = (scores ?? []).find((x) => x.assessment_id === a.id && x.pillar === p);
          if (s) series[p].push({ id: a.id, title: a.title, score: Math.round((Number(s.score) || 0) * 100) });
        });
      });
      // Detect: last 2 rounds both showed >2pp drop vs previous
      const alerts: Array<{ pillar: string; drop1: number; drop2: number; from: number; to: number; rounds: string[] }> = [];
      Object.entries(series).forEach(([pillar, arr]) => {
        if (arr.length < 3) return;
        const n = arr.length;
        const drop2 = arr[n - 2].score - arr[n - 1].score;
        const drop1 = arr[n - 3].score - arr[n - 2].score;
        if (drop1 > 2 && drop2 > 2) {
          alerts.push({
            pillar,
            drop1,
            drop2,
            from: arr[n - 3].score,
            to: arr[n - 1].score,
            rounds: [arr[n - 3].title, arr[n - 2].title, arr[n - 1].title],
          });
        }
      });
      return alerts;
    },
    enabled: !!destinationId,
  });

  if (isLoading) return <Skeleton className="h-24" />;
  const alerts = data ?? [];
  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          Regressão detectada ({alerts.length})
        </CardTitle>
        <CardDescription>
          Quedas superiores a 2 pontos percentuais em 2 rodadas consecutivas. Comparação interna deste {diagnosticType === 'enterprise' ? 'empreendimento' : 'destino'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => (
          <div key={a.pillar} className="rounded-lg border bg-background p-3 flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{PILLAR_LABELS[a.pillar]}</Badge>
                <span className="text-sm font-medium">{a.from}% → {a.to}%</span>
                <span className="text-xs text-muted-foreground">
                  (−{a.drop1.toFixed(1)} e −{a.drop2.toFixed(1)} pp nas últimas 2 rodadas)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Rodadas: {a.rounds.join(' → ')}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
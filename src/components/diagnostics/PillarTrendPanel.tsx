import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface Props {
  destinationId: string;
  diagnosticType: 'territorial' | 'enterprise';
  currentAssessmentId?: string;
}

const PILLAR_COLORS: Record<string, string> = {
  RA: 'hsl(var(--pillar-ra))',
  OE: 'hsl(var(--pillar-oe))',
  AO: 'hsl(var(--pillar-ao))',
};

const PILLAR_LABELS: Record<string, string> = {
  RA: 'I-RA',
  OE: 'I-OE',
  AO: 'I-AO',
};

/**
 * Painel comparativo temporal (Fase 10) — histórico multi-rodada de I-RA/I-OE/I-AO
 * para um único destino/empreendimento. Sem ranking entre destinos (vedado).
 */
export function PillarTrendPanel({ destinationId, diagnosticType, currentAssessmentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['pillar-trend', destinationId, diagnosticType],
    queryFn: async () => {
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, title, calculated_at, created_at, diagnostic_type')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED')
        .eq('diagnostic_type', diagnosticType)
        .order('calculated_at', { ascending: true })
        .limit(24);
      if (error) throw error;
      const list = assessments ?? [];
      if (list.length === 0) return [];

      const ids = list.map((a) => a.id);
      const { data: scores } = await supabase
        .from('pillar_scores')
        .select('assessment_id, pillar, score')
        .in('assessment_id', ids);

      return list.map((a) => {
        const dt = a.calculated_at || a.created_at;
        const row: Record<string, any> = {
          assessmentId: a.id,
          label: new Date(dt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          title: a.title,
          isCurrent: a.id === currentAssessmentId,
        };
        (scores || [])
          .filter((s) => s.assessment_id === a.id)
          .forEach((s) => {
            row[s.pillar] = Math.round((Number(s.score) || 0) * 100);
          });
        return row;
      });
    },
    enabled: !!destinationId,
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const rows = data ?? [];

  if (rows.length < 2) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-5 w-5 text-primary" />
            Evolução temporal dos pilares
          </CardTitle>
          <CardDescription>
            São necessárias pelo menos 2 rodadas calculadas {diagnosticType === 'enterprise' ? 'Enterprise' : 'Territoriais'} para exibir o histórico.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-5 w-5 text-primary" />
          Evolução temporal dos pilares ({rows.length} rodadas)
        </CardTitle>
        <CardDescription>
          Histórico de I-RA, I-OE e I-AO ao longo das rodadas calculadas{diagnosticType === 'enterprise' ? ' deste empreendimento' : ' deste destino'}. Comparação interna apenas — sem ranking entre {diagnosticType === 'enterprise' ? 'empreendimentos' : 'municípios'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <Tooltip
                formatter={(value: any, name: any) => [`${value}%`, PILLAR_LABELS[name] || name]}
                labelFormatter={(_, payload) => {
                  const p: any = payload?.[0]?.payload;
                  return p?.title ?? '';
                }}
              />
              <Legend formatter={(v) => PILLAR_LABELS[v] || v} />
              {(['RA', 'OE', 'AO'] as const).map((p) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  stroke={PILLAR_COLORS[p]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </RLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
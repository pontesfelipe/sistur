import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  assessmentId: string;
  destinationId: string;
  currentPillarScores: any[];
}

function usePreviousAssessment(destinationId: string, currentAssessmentId: string) {
  return useQuery({
    queryKey: ['previous-assessment', destinationId, currentAssessmentId],
    queryFn: async () => {
      // Get previous calculated assessment for same destination
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, calculated_at, created_at')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED')
        .neq('id', currentAssessmentId)
        .order('calculated_at', { ascending: false })
        .limit(1);

      if (!assessments || assessments.length === 0) return null;

      const prevAssessment = assessments[0];
      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .eq('assessment_id', prevAssessment.id);

      const { data: issues } = await supabase
        .from('issues')
        .select('id, pillar, severity')
        .eq('assessment_id', prevAssessment.id);

      return {
        assessment: prevAssessment,
        pillarScores: pillarScores || [],
        issueCount: issues?.length || 0,
        criticalCount: issues?.filter(i => i.severity === 'CRITICO').length || 0,
      };
    },
    enabled: !!destinationId && !!currentAssessmentId,
  });
}

const PILLAR_LABELS: Record<string, string> = {
  RA: 'Relações Ambientais',
  AO: 'Ações Operacionais',
  OE: 'Organização Estrutural',
};

export function RoundComparisonView({ assessmentId, destinationId, currentPillarScores }: Props) {
  const { data: previous, isLoading } = usePreviousAssessment(destinationId, assessmentId);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!previous) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Primeira rodada para este destino. Comparativos estarão disponíveis após a segunda rodada.</p>
        </CardContent>
      </Card>
    );
  }

  const getTrend = (current: number, prev: number) => {
    const diff = current - prev;
    if (Math.abs(diff) < 0.02) return { icon: Minus, label: 'Estável', color: 'text-muted-foreground', diff: 0 };
    if (diff > 0) return { icon: ArrowUp, label: 'Melhoria', color: 'text-green-600', diff };
    return { icon: ArrowDown, label: 'Regressão', color: 'text-red-600', diff };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Comparativo com Rodada Anterior
        </CardTitle>
        <CardDescription>
          Comparando com: {previous.assessment.title} ({new Date(previous.assessment.calculated_at || previous.assessment.created_at).toLocaleDateString('pt-BR')})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentPillarScores.map((ps: any) => {
            const prevPs = previous.pillarScores.find((p: any) => p.pillar === ps.pillar);
            const prevScore = prevPs?.score || 0;
            const trend = getTrend(ps.score, prevScore);
            const TrendIcon = trend.icon;

            return (
              <div key={ps.pillar} className="p-4 rounded-lg border bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">{PILLAR_LABELS[ps.pillar] || ps.pillar}</p>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-bold">{Math.round(ps.score * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Atual</p>
                  </div>
                  <div className={`flex items-center gap-1 mb-1 ${trend.color}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {trend.diff > 0 ? '+' : ''}{Math.round(trend.diff * 100)}pp
                    </span>
                  </div>
                  <div className="text-right ml-auto">
                    <p className="text-lg text-muted-foreground">{Math.round(prevScore * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Anterior</p>
                  </div>
                </div>
                <Badge variant={ps.severity === 'CRITICO' ? 'destructive' : ps.severity === 'MODERADO' ? 'secondary' : 'default'} className="mt-2">
                  {ps.severity === 'CRITICO' ? 'Crítico' : ps.severity === 'MODERADO' ? 'Atenção' : 'Adequado'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

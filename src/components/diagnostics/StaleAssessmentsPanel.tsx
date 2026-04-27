import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useCalculateAssessment } from '@/hooks/useCalculateAssessment';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StaleRow {
  assessment_id: string;
  destination_id: string;
  destination_name: string;
  ibge_code: string | null;
  org_id: string;
  org_name: string | null;
  title: string;
  calculated_at: string;
  data_updated_at: string | null;
  age_hours: number | null;
}

export function StaleAssessmentsPanel() {
  const qc = useQueryClient();
  const { calculate } = useCalculateAssessment();
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stale-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stale_assessments');
      if (error) throw error;
      return (data || []) as StaleRow[];
    },
  });

  const rows = data || [];

  const recalcOne = async (assessmentId: string) => {
    setRecalculatingId(assessmentId);
    try {
      const result = await calculate(assessmentId);
      if (result?.success) {
        await qc.invalidateQueries({ queryKey: ['stale-assessments'] });
      }
    } finally {
      setRecalculatingId(null);
    }
  };

  const recalcAll = async () => {
    if (rows.length === 0) return;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: rows.length });
    let success = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const result = await calculate(r.assessment_id);
      if (result?.success) success++; else failed++;
      setBulkProgress({ done: i + 1, total: rows.length });
    }
    setBulkRunning(false);
    toast.success(`Recálculo concluído: ${success} sucesso${failed > 0 ? `, ${failed} falha(s)` : ''}`);
    await qc.invalidateQueries({ queryKey: ['stale-assessments'] });
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border">
        <CheckCircle2 className="mx-auto h-12 w-12 text-severity-good" />
        <h3 className="mt-4 text-lg font-semibold">Tudo em dia</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum diagnóstico com dados oficiais desatualizados aguardando recálculo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">
              {rows.length} diagnóstico{rows.length > 1 ? 's' : ''} com dados oficiais atualizados após o último cálculo
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Recalcule para incorporar os novos valores de IBGE, CADASTUR, STN ou Mapa do Turismo.
            </p>
          </div>
        </div>
        <Button
          onClick={recalcAll}
          disabled={bulkRunning}
          className="shrink-0"
        >
          {bulkRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {bulkProgress.done}/{bulkProgress.total}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalcular todos ({rows.length})
            </>
          )}
        </Button>
      </div>

      <div className="bg-card rounded-xl border divide-y">
        {rows.map((r) => {
          const isThis = recalculatingId === r.assessment_id;
          return (
            <div key={r.assessment_id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{r.destination_name}</span>
                  {r.ibge_code && (
                    <Badge variant="outline" className="text-[10px] font-mono">IBGE {r.ibge_code}</Badge>
                  )}
                  {r.org_name && (
                    <Badge variant="secondary" className="text-[10px]">{r.org_name}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="truncate">{r.title}</span>
                  {r.data_updated_at && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      Marcado {formatDistanceToNow(new Date(r.data_updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => recalcOne(r.assessment_id)}
                disabled={isThis || bulkRunning}
              >
                {isThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Recalcular</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
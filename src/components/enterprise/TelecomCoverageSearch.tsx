import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Signal, Loader2, Search, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner, NoDataError } from '@/lib/autoFillRunner';

interface Analysis {
  telecom_score: number;
  telecom_tier: string;
  coverage_4g_pct: number;
  coverage_5g_pct: number;
  wifi_public_score: number;
  reference_year?: number;
  municipality?: string;
  uf?: string;
  source?: string;
  recommendations: string[];
  summary: string;
}

interface Props {
  destinationId: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const TIER_COLOR: Record<string, string> = {
  excelente: 'text-emerald-600',
  boa: 'text-blue-600',
  media: 'text-cyan-600',
  baixa: 'text-amber-600',
  critica: 'text-rose-600',
};

export function TelecomCoverageSearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [noDataReason, setNoDataReason] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null); setNoDataReason(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-telecom-coverage', { body: { destinationId } });
      if (error) throw error;
      if (data?.no_data) {
        setNoDataReason(data.reason ?? 'Sem dados disponíveis');
        throw new NoDataError(data.reason ?? 'Sem dados disponíveis');
      }
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationId, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_CONECTIVIDADE_TELECOM: a.telecom_score });
      toast.success('Conectividade telecom analisada');
    } catch (e: any) {
      if (e?.name !== 'NoDataError') {
        console.error(e);
        toast.error(e?.message || 'Falha ao analisar telecom');
      }
      throw e;
    } finally { setLoading(false); }
  };

  useAutoFillRunner('telecom', run);

  return (
    <div className="space-y-4">
      <Button onClick={() => { void run().catch(() => {}); }} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Consultando Anatel...' : 'Analisar Conectividade Telecom'}
      </Button>

      {noDataReason && !analysis && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400">
          ⓘ Sem informações disponíveis — {noDataReason}
        </div>
      )}

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Signal className="h-3 w-3" /> Score Telecom</div>
              <div className="text-2xl font-bold">{analysis.telecom_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.telecom_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.telecom_tier] ?? ''}`}>{analysis.telecom_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">4G</span><span className="font-bold">{analysis.coverage_4g_pct.toFixed(0)}%</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">5G</span><span className="font-bold">{analysis.coverage_5g_pct.toFixed(0)}%</span></div>
              <div className="flex items-center justify-between pt-1 border-t"><span className="text-muted-foreground flex items-center gap-1"><Wifi className="h-3 w-3" /> Wi-Fi público</span><span className="font-bold">{analysis.wifi_public_score.toFixed(0)}/100</span></div>
            </div>
          </div>

          {analysis.recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs font-medium mb-1">Recomendações</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">Fonte: {analysis.source ?? 'Anatel'}{analysis.reference_year ? ` · ano-base ${analysis.reference_year}` : ''}</p>
        </div>
      )}
    </div>
  );
}
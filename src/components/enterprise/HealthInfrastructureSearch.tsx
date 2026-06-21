import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, Loader2, Search, Hospital } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner, NoDataError } from '@/lib/autoFillRunner';

interface Analysis {
  health_score: number;
  health_tier: string;
  municipality?: string;
  uf?: string;
  total_hospitals: number;
  total_beds: number;
  total_establishments?: number | null;
  emergency_units?: number | null;
  beds_per_1k_inhabitants?: number | null;
  has_24h_emergency?: boolean | null;
  reference_year?: number;
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
  forte: 'text-emerald-600',
  adequada: 'text-blue-600',
  limitada: 'text-amber-600',
  critica: 'text-rose-600',
};

export function HealthInfrastructureSearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [noDataReason, setNoDataReason] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null); setNoDataReason(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-health-infrastructure', { body: { destinationId } });
      if (error) throw error;
      if (data?.no_data) {
        setNoDataReason(data.reason ?? 'Sem dados disponíveis');
        throw new NoDataError(data.reason ?? 'Sem dados disponíveis');
      }
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationId, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_SAUDE_ENTORNO: a.health_score });
      toast.success('Infraestrutura de saúde analisada');
    } catch (e: any) {
      if (e?.name !== 'NoDataError') {
        console.error(e);
        toast.error(e?.message || 'Falha ao analisar saúde');
      }
      throw e;
    } finally { setLoading(false); }
  };

  useAutoFillRunner('health', run);

  return (
    <div className="space-y-4">
      <Button onClick={() => { void run().catch(() => {}); }} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Consultando DATASUS...' : 'Analisar Infraestrutura de Saúde'}
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
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Heart className="h-3 w-3" /> Score</div>
              <div className="text-2xl font-bold">{analysis.health_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.health_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.health_tier] ?? ''}`}>{analysis.health_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Hospital className="h-3 w-3" /> Hospitais</span><span className="font-bold">{analysis.total_hospitals}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Leitos totais</span><span className="font-bold">{analysis.total_beds.toLocaleString('pt-BR')}</span></div>
              {analysis.beds_per_1k_inhabitants != null && (
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Leitos / 1k hab</span><span className="font-bold">{analysis.beds_per_1k_inhabitants.toFixed(2)}</span></div>
              )}
              <div className="flex items-center justify-between pt-1 border-t"><span className="text-muted-foreground">PS 24h</span><span className="font-bold">{analysis.has_24h_emergency === true ? 'Sim' : analysis.has_24h_emergency === false ? 'Não' : '—'}</span></div>
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

          <p className="text-[10px] text-muted-foreground">Fonte: {analysis.source ?? 'DATASUS/CNES'}{analysis.reference_year ? ` · ano-base ${analysis.reference_year}` : ''}</p>
        </div>
      )}
    </div>
  );
}
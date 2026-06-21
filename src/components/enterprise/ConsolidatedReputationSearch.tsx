import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Loader2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SourceData { rating: number; count: number; samples: string[] }
interface Analysis {
  consolidated_rating: number | null;
  consolidated_score: number;
  reputation_tier: 'excelente' | 'boa' | 'regular' | 'fraca' | 'sem_dados';
  sources: Record<string, SourceData>;
  sources_count: number;
  recommendations: string[];
  summary: string;
}

interface Props {
  businessName: string;
  location: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const TIER_COLOR: Record<string, string> = {
  excelente: 'text-emerald-600',
  boa: 'text-blue-600',
  regular: 'text-amber-600',
  fraca: 'text-rose-600',
  sem_dados: 'text-muted-foreground',
};

export function ConsolidatedReputationSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!businessName?.trim()) { toast.error('Informe o nome'); return; }
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-consolidated-reputation', { body: { businessName, location } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      if (a.consolidated_score) onAutoFill?.({ ENT_REPUTACAO_CONSOLIDADA: a.consolidated_score });
      toast.success('Reputação consolidada');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar reputação');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Consolidar Reputação Multi-OTA'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Star className="h-3 w-3" /> Nota Consolidada</div>
              <div className="text-2xl font-bold">{analysis.consolidated_rating ?? '—'}<span className="text-sm font-normal text-muted-foreground">/10</span></div>
              <Progress value={analysis.consolidated_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.reputation_tier]}`}>{analysis.reputation_tier.replace('_', ' ')}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card text-xs">
              <div className="text-muted-foreground mb-1">Fontes detectadas</div>
              <div className="text-xl font-bold">{analysis.sources_count}</div>
              <div className="text-[10px] text-muted-foreground mt-1">OTAs/portais com nota extraída</div>
            </div>
          </div>

          {Object.keys(analysis.sources).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Notas por fonte</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(analysis.sources).map(([k, v]) => (
                  <div key={k} className="p-2 rounded border bg-card text-xs flex items-center justify-between">
                    <span className="capitalize">{k}</span>
                    <span className="font-bold">{v.rating}/10</span>
                  </div>
                ))}
              </div>
              {Object.values(analysis.sources).some((s) => s.samples.length > 0) && (
                <div className="space-y-1 pt-2">
                  {Object.values(analysis.sources).flatMap((s) => s.samples).slice(0, 4).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-[11px] text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" /><span className="line-clamp-1">{u}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs font-medium mb-1">Recomendações</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
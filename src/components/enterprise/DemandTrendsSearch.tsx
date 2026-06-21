import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Loader2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Analysis {
  demand_score: number;
  demand_tier: 'alta' | 'moderada' | 'baixa' | 'incipiente';
  total_results: number;
  transactional_hits: number;
  editorial_hits: number;
  seasonal_distribution: Record<string, number>;
  peak_months_estimated: string[];
  sample_results: { title: string; url: string; description: string }[];
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
  alta: 'text-emerald-600',
  moderada: 'text-blue-600',
  baixa: 'text-amber-600',
  incipiente: 'text-rose-600',
};

export function DemandTrendsSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!businessName?.trim()) { toast.error('Informe o nome'); return; }
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-demand-trends', { body: { businessName, location } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_DEMANDA_INTERESSE: a.demand_score });
      toast.success('Demanda analisada');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar demanda');
    } finally { setLoading(false); }
  };

  const maxHit = analysis ? Math.max(1, ...Object.values(analysis.seasonal_distribution)) : 1;

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Demanda & Tendências'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Demanda</div>
              <div className="text-2xl font-bold">{analysis.demand_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.demand_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.demand_tier]}`}>{analysis.demand_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Resultados</span><span className="font-bold">{analysis.total_results}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transacionais (OTA)</span><span className="font-bold">{analysis.transactional_hits}</span></div>
              <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Editoriais</span><span className="font-bold">{analysis.editorial_hits}</span></div>
            </div>
          </div>

          {analysis.peak_months_estimated.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2">Distribuição mensal de menções</div>
              <div className="grid grid-cols-12 gap-1">
                {Object.entries(analysis.seasonal_distribution).map(([m, v]) => (
                  <div key={m} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-muted rounded-sm h-12 flex items-end overflow-hidden">
                      <div className="w-full bg-primary/70" style={{ height: `${(v / maxHit) * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground capitalize">{m}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">Picos estimados: <strong>{analysis.peak_months_estimated.join(', ')}</strong></div>
            </div>
          )}

          {analysis.sample_results.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Amostras</div>
              {analysis.sample_results.slice(0, 4).map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" /><span className="line-clamp-1">{n.title}</span>
                </a>
              ))}
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
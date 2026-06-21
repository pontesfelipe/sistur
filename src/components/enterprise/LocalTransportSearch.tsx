import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bus, Loader2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface Analysis {
  modes_available: { key: string; label: string }[];
  mode_count: number;
  app_based_count: number;
  transit_count: number;
  alt_count: number;
  coverage_score: number;
  car_dependence: string;
  sample_sources: { title: string; url: string }[];
  recommendations: string[];
  summary: string;
}

interface Props {
  destinationName: string;
  state?: string | null;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

export function LocalTransportSearch({ destinationName, state, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-local-transport', { body: { destinationName, state } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationName, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_TRANSPORTE_COBERTURA: a.coverage_score });
      toast.success('Transporte intra-destino analisado');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar transporte');
    } finally { setLoading(false); }
  };

  useAutoFillRunner('transport', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Transporte Intra-Destino'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Bus className="h-3 w-3" /> Cobertura</div>
              <div className="text-2xl font-bold">{analysis.coverage_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.coverage_score} className="h-1 mt-2" />
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Apps</span><span className="font-bold">{analysis.app_based_count}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Transporte público</span><span className="font-bold">{analysis.transit_count}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Alternativos</span><span className="font-bold">{analysis.alt_count}</span></div>
              <div className="flex items-center justify-between pt-1 border-t"><span className="text-muted-foreground">Dependência de carro</span><Badge variant="outline" className="text-[10px] capitalize">{analysis.car_dependence}</Badge></div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-1">Modais identificados</div>
            <div className="flex flex-wrap gap-1">
              {analysis.modes_available.length === 0 ? <span className="text-xs text-muted-foreground">Nenhum modal detectado</span> :
                analysis.modes_available.map((m) => <Badge key={m.key} variant="secondary" className="text-[10px]">{m.label}</Badge>)}
            </div>
          </div>

          {analysis.sample_sources.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Fontes</div>
              {analysis.sample_sources.slice(0, 4).map((n, i) => (
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
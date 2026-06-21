import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Loader2, Search, TrendingUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

const MONTH_LABELS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Analysis {
  internal_events_count: number;
  public_events_count: number;
  detected_categories: string[];
  month_distribution: Record<string, number>;
  peak_months: number[];
  seasonality_pattern: 'alta' | 'media' | 'baixa' | 'uniforme';
  event_density_score: number;
  calendar_maturity_score: number;
  sample_events: { title: string; url: string; description: string }[];
  recommendations: string[];
  summary: string;
}

interface Props {
  destinationId: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
  onSeasonalitySuggestion?: (pattern: string, peakMonths: number[]) => void;
}

export function LocalEventsSearch({ destinationId, onAutoFill, onAnalysisCapture, onSeasonalitySuggestion }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-local-events', {
        body: { destinationId },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, searchedAt: new Date().toISOString() });
      onAutoFill?.({
        ENT_EVENTOS_DENSIDADE: a.event_density_score,
        ENT_CALENDARIO_MATURIDADE: a.calendar_maturity_score,
      });
      onSeasonalitySuggestion?.(a.seasonality_pattern, a.peak_months);
      toast.success('Eventos e sazonalidade analisados');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao analisar eventos');
    } finally {
      setLoading(false);
    }
  };

  const maxHits = analysis ? Math.max(1, ...Object.values(analysis.month_distribution).map(Number)) : 1;

  useAutoFillRunner('events', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Eventos & Sazonalidade'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-emerald-500/5">
              <div className="text-xs text-muted-foreground mb-1">Eventos públicos</div>
              <div className="text-lg font-bold">{analysis.public_events_count}</div>
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/5">
              <div className="text-xs text-muted-foreground mb-1">Eventos observatório</div>
              <div className="text-lg font-bold">{analysis.internal_events_count}</div>
            </div>
            <div className="p-3 rounded-lg border bg-purple-500/5">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Densidade</div>
              <div className="text-lg font-bold">{analysis.event_density_score}<span className="text-xs font-normal text-muted-foreground">/100</span></div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-xs font-medium mb-2">
              <CalendarDays className="h-3 w-3" /> Distribuição por mês
              <Badge variant="outline" className="ml-2 text-[10px]">{analysis.seasonality_pattern}</Badge>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const hits = Number(analysis.month_distribution[m] || 0);
                const pct = (hits / maxHits) * 100;
                const isPeak = analysis.peak_months.includes(m);
                return (
                  <div key={m} className="flex flex-col items-center gap-1">
                    <div className={`w-full rounded-sm ${isPeak ? 'bg-primary' : 'bg-muted'}`} style={{ height: `${4 + pct * 0.4}px` }} title={`${hits} menções`} />
                    <span className={`text-[9px] ${isPeak ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{MONTH_LABELS[m]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {analysis.detected_categories.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Tipologias detectadas</div>
              <div className="flex flex-wrap gap-1">
                {analysis.detected_categories.map((c) => <Badge key={c} variant="secondary" className="text-[10px] capitalize">{c}</Badge>)}
              </div>
            </div>
          )}

          {analysis.sample_events.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Amostras</div>
              {analysis.sample_events.slice(0, 4).map((e, i) => (
                <a key={i} href={e.url} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{e.title}</span>
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
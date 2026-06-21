import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CloudRain, Loader2, Search, Sun, Thermometer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthSummary { month: number; label: string; temperature_c: number; precipitation_mm: number; rainy_days: number }
interface Analysis {
  climate_comfort_score: number;
  months_summary: MonthSummary[];
  month_comfort: { month: number; score: number }[];
  best_months: number[];
  worst_months: number[];
  rainy_months: number[];
  recommendations: string[];
  summary: string;
  data_source: string;
}

interface Props {
  destinationId: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

export function ClimateComfortSearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-climate-comfort', { body: { destinationId } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_CONFORTO_CLIMATICO: a.climate_comfort_score });
      toast.success('Clima analisado');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar clima');
    } finally { setLoading(false); }
  };

  useAutoFillRunner('climate', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Conforto Climático'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Sun className="h-3 w-3" /> Conforto Climático</div>
            <div className="text-2xl font-bold">{analysis.climate_comfort_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
            <Progress value={analysis.climate_comfort_score} className="h-1 mt-2" />
          </div>

          <div>
            <div className="text-xs font-medium mb-2 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperatura média (°C) por mês</div>
            <div className="grid grid-cols-12 gap-1">
              {analysis.months_summary.map((m) => {
                const comfort = analysis.month_comfort.find((c) => c.month === m.month)?.score ?? 50;
                const bg = comfort >= 70 ? 'bg-emerald-500/80' : comfort >= 45 ? 'bg-amber-500/80' : 'bg-rose-500/80';
                return (
                  <div key={m.month} className="flex flex-col items-center gap-1">
                    <div className={`w-full rounded text-[10px] text-white font-bold py-1 ${bg}`} title={`${m.temperature_c}°C • ${m.precipitation_mm}mm • ${m.rainy_days}d chuva`}>
                      {m.temperature_c.toFixed(0)}°
                    </div>
                    <span className="text-[9px] text-muted-foreground">{MONTH_LABELS[m.month - 1]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-medium mb-1 flex items-center gap-1"><Sun className="h-3 w-3 text-emerald-600" /> Melhores meses</div>
              <div className="flex gap-1 flex-wrap">{analysis.best_months.map((m) => <Badge key={m} variant="secondary" className="text-[10px]">{MONTH_LABELS[m - 1]}</Badge>)}</div>
            </div>
            <div>
              <div className="font-medium mb-1 flex items-center gap-1"><CloudRain className="h-3 w-3 text-rose-600" /> Meses chuvosos</div>
              <div className="flex gap-1 flex-wrap">{analysis.rainy_months.length === 0 ? <span className="text-muted-foreground">—</span> : analysis.rainy_months.map((m) => <Badge key={m} variant="outline" className="text-[10px]">{MONTH_LABELS[m - 1]}</Badge>)}</div>
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
          <p className="text-[10px] text-muted-foreground">Fonte: {analysis.data_source}</p>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldAlert, ShieldCheck, Loader2, Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface Analysis {
  safety_score: number;
  safety_level: 'alto' | 'medio' | 'baixo';
  negative_signals: { count: number; terms: string[] };
  positive_signals: { count: number; terms: string[] };
  alerts: { count: number; terms: string[] };
  tourist_police_presence: boolean;
  sample_news: { title: string; url: string }[];
  sample_policing: { title: string; url: string }[];
  recommendations: string[];
  summary: string;
}

interface Props {
  destinationName: string;
  state?: string | null;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const LEVEL_MAP: Record<string, { color: string; icon: any; label: string }> = {
  alto: { color: 'text-emerald-600', icon: ShieldCheck, label: 'Alto' },
  medio: { color: 'text-amber-600', icon: Shield, label: 'Médio' },
  baixo: { color: 'text-rose-600', icon: ShieldAlert, label: 'Baixo' },
};

export function TourismSafetySearch({ destinationName, state, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!destinationName?.trim()) {
      toast.error('Informe o destino.');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-tourism-safety', {
        body: { destinationName, state },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationName, state, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_SEGURANCA_SCORE: a.safety_score });
      toast.success('Segurança turística analisada');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao analisar segurança');
    } finally {
      setLoading(false);
    }
  };

  const lvl = analysis ? LEVEL_MAP[analysis.safety_level] : null;
  const LvlIcon = lvl?.icon;

  useAutoFillRunner('safety', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Segurança Turística'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1">Score de Segurança</div>
              <div className="text-2xl font-bold">{analysis.safety_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.safety_score} className="h-1 mt-2" />
              {lvl && LvlIcon && (
                <Badge variant="outline" className={`mt-2 text-[10px] ${lvl.color}`}>
                  <LvlIcon className="h-3 w-3 mr-1" /> {lvl.label}
                </Badge>
              )}
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sinais negativos</span>
                <span className="font-bold text-rose-600">{analysis.negative_signals.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sinais positivos</span>
                <span className="font-bold text-emerald-600">{analysis.positive_signals.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alertas</span>
                <span className="font-bold text-amber-600">{analysis.alerts.count}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-muted-foreground">Polícia turística</span>
                <span className="font-medium">{analysis.tourist_police_presence ? 'Sim' : 'Não detectada'}</span>
              </div>
            </div>
          </div>

          {analysis.alerts.count > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-700 dark:text-amber-400">Alertas detectados</div>
                <div className="text-amber-700/80 dark:text-amber-400/80">{analysis.alerts.terms.join(', ')}</div>
              </div>
            </div>
          )}

          {analysis.sample_news.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Amostras de notícias</div>
              {analysis.sample_news.slice(0, 4).map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{n.title}</span>
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
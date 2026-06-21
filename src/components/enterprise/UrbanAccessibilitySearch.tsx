import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accessibility, Loader2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner, NoDataError } from '@/lib/autoFillRunner';

interface Evidence { keyword: string; hits: number; samples: { title: string; url: string }[]; }

interface Analysis {
  accessibility_score: number;
  accessibility_tier: string;
  municipality?: string;
  uf?: string;
  dimensions_covered: number;
  total_evidence_hits: number;
  evidence: Evidence[];
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
  avancada: 'text-emerald-600',
  moderada: 'text-blue-600',
  incipiente: 'text-amber-600',
  critica: 'text-rose-600',
};

export function UrbanAccessibilitySearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [noDataReason, setNoDataReason] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null); setNoDataReason(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-urban-accessibility', { body: { destinationId } });
      if (error) throw error;
      if (data?.no_data) {
        setNoDataReason(data.reason ?? 'Sem dados disponíveis');
        throw new NoDataError(data.reason ?? 'Sem dados disponíveis');
      }
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationId, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_ACESSIBILIDADE_SCORE: a.accessibility_score });
      toast.success('Acessibilidade urbana analisada');
    } catch (e: any) {
      if (e?.name !== 'NoDataError') {
        console.error(e);
        toast.error(e?.message || 'Falha ao analisar acessibilidade');
      }
      throw e;
    } finally { setLoading(false); }
  };

  useAutoFillRunner('accessibility', run);

  return (
    <div className="space-y-4">
      <Button onClick={() => { void run().catch(() => {}); }} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Pesquisando evidências...' : 'Analisar Acessibilidade Urbana'}
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
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Accessibility className="h-3 w-3" /> Score</div>
              <div className="text-2xl font-bold">{analysis.accessibility_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.accessibility_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.accessibility_tier] ?? ''}`}>{analysis.accessibility_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Dimensões com evidência</span><span className="font-bold">{analysis.dimensions_covered}/5</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Menções totais</span><span className="font-bold">{analysis.total_evidence_hits}</span></div>
            </div>
          </div>

          {analysis.evidence.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Evidências encontradas</div>
              {analysis.evidence.map((e, i) => (
                <div key={i} className="p-2 rounded border bg-card">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize">{e.keyword}</span>
                    <Badge variant="outline" className="text-[10px]">{e.hits} hits</Badge>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {e.samples.map((s, j) => (
                      <a key={j} href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-[11px] text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
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
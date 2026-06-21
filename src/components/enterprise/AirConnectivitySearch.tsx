import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plane, Loader2, Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface Analysis {
  connectivity_score: number;
  connectivity_tier: string;
  municipality?: string;
  uf?: string;
  airport_count?: number;
  airport_icao_codes?: string[] | null;
  flights_per_week?: number;
  total_flights_12m?: number;
  total_passengers_12m?: number;
  international_flights_share_pct?: number;
  reference_period?: { start: string; end: string };
  source_url?: string;
  recommendations: string[];
  summary: string;
}

interface Props {
  destinationId: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const TIER_COLOR: Record<string, string> = {
  hub: 'text-emerald-600',
  forte: 'text-blue-600',
  media: 'text-cyan-600',
  baixa: 'text-amber-600',
  minima: 'text-orange-600',
  sem_conexao: 'text-rose-600',
  sem_aeroporto_proprio: 'text-muted-foreground',
  sem_dados: 'text-muted-foreground',
};

export function AirConnectivitySearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-air-connectivity', { body: { destinationId } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, destinationId, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_CONECTIVIDADE_AEREA: a.connectivity_score });
      toast.success('Conectividade aérea analisada');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar conectividade');
    } finally { setLoading(false); }
  };

  useAutoFillRunner('air-connectivity', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Consultando ANAC...' : 'Analisar Conectividade Aérea'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Plane className="h-3 w-3" /> Conectividade</div>
              <div className="text-2xl font-bold">{analysis.connectivity_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.connectivity_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.connectivity_tier] ?? ''}`}>{analysis.connectivity_tier.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Voos/semana</span><span className="font-bold">{analysis.flights_per_week ?? '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Voos 12m</span><span className="font-bold">{analysis.total_flights_12m?.toLocaleString('pt-BR') ?? '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Passageiros 12m</span><span className="font-bold">{analysis.total_passengers_12m?.toLocaleString('pt-BR') ?? '—'}</span></div>
              <div className="flex items-center justify-between pt-1 border-t"><span className="text-muted-foreground">Internacional</span><span className="font-bold">{analysis.international_flights_share_pct ?? 0}%</span></div>
            </div>
          </div>

          {analysis.airport_icao_codes && analysis.airport_icao_codes.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Aeroportos (ICAO)</div>
              <div className="flex flex-wrap gap-1">
                {analysis.airport_icao_codes.map((c) => <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>)}
              </div>
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

          {analysis.source_url && (
            <a href={analysis.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3 w-3" /> Fonte: ANAC
            </a>
          )}
        </div>
      )}
    </div>
  );
}
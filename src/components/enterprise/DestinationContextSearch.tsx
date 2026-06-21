import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, Plane, Wifi, CalendarDays, MapPinned, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  destinationId: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (analysis: Record<string, any>) => void;
}

export function DestinationContextSearch({ destinationId, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-destination-context', {
        body: { destination_id: destinationId },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados');
      const a = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.(a);
      const values: Record<string, number> = {};
      if (a.air_connectivity?.score != null) values['ENT_CONECTIVIDADE_AEREA'] = a.air_connectivity.score;
      if (a.telecom_coverage?.score != null) values['ENT_CONECTIVIDADE_TELECOM'] = a.telecom_coverage.score;
      if (a.events_12m?.count != null) values['ENT_EVENTOS_DESTINO_12M'] = a.events_12m.count;
      onAutoFill?.(values);
      toast.success('Contexto do destino carregado');
    } catch (e: any) {
      toast.error('Erro ao buscar contexto: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const ok = (b: boolean) => b ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Puxa automaticamente conectividade aérea (ANAC), cobertura de telecom (ANATEL), eventos do destino, Mapa do Turismo e indicadores socioeconômicos do município.
        </p>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? 'Carregando...' : 'Carregar Contexto'}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-3">
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Aérea</p><p className="text-2xl font-bold">{analysis.air_connectivity?.score ?? '—'}/5</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Telecom</p><p className="text-2xl font-bold">{analysis.telecom_coverage?.score ?? '—'}/5</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Eventos 12m</p><p className="text-2xl font-bold">{analysis.events_12m?.count ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Mapa MTur</p><p className="text-sm font-medium pt-1">{analysis.mtur?.in_mapa ? (analysis.mtur.category || 'Sim') : 'Fora'}</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card><CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium"><Plane className="h-4 w-4" /> Aeroporto</div>
              <p className="text-xs text-muted-foreground">{analysis.air_connectivity?.airport || 'Sem aeroporto associado'}{analysis.air_connectivity?.passengers_total ? ` · ${analysis.air_connectivity.passengers_total.toLocaleString('pt-BR')} pax/${analysis.air_connectivity.ref_year || ''}` : ''}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium"><Wifi className="h-4 w-4" /> Cobertura Telecom</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">{ok(!!analysis.telecom_coverage?.has_4g)} 4G</span>
                <span className="inline-flex items-center gap-1">{ok(!!analysis.telecom_coverage?.has_5g)} 5G</span>
                {analysis.telecom_coverage?.operators_count != null && <span>· {analysis.telecom_coverage.operators_count} operadoras</span>}
              </div>
            </CardContent></Card>
          </div>

          {analysis.events_12m?.samples?.length > 0 && (
            <Card><CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4" /> Eventos recentes</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.events_12m.samples.map((e: any) => (
                  <Badge key={e.id} variant="outline" className="text-[10px]">{e.name}</Badge>
                ))}
              </div>
            </CardContent></Card>
          )}

          {analysis.recommendations?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10"><CardContent className="p-3 space-y-1.5">
              <p className="text-xs font-medium">Recomendações</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                {analysis.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
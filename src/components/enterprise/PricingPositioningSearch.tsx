import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Loader2, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface PriceStats { min: number | null; max: number | null; avg: number | null; median: number | null; count: number; samples?: number[] }
interface Analysis {
  own_property: PriceStats;
  market_reference: PriceStats;
  pricing_index: number | null;
  positioning: 'premium' | 'aligned' | 'value' | 'unknown';
  recommendations: string[];
  summary: string;
}

interface Props {
  businessName: string;
  location: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const POSITIONING_MAP: Record<string, { label: string; color: string; icon: any }> = {
  premium: { label: 'Premium', color: 'text-purple-600', icon: TrendingUp },
  aligned: { label: 'Alinhado', color: 'text-emerald-600', icon: Minus },
  value: { label: 'Value', color: 'text-amber-600', icon: TrendingDown },
  unknown: { label: 'Indeterminado', color: 'text-muted-foreground', icon: Minus },
};

export function PricingPositioningSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!businessName?.trim()) {
      toast.error('Informe o nome do estabelecimento.');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-pricing-positioning', {
        body: { businessName: businessName.trim(), location: location?.trim() },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      const values: Record<string, number> = {};
      if (a.own_property.avg != null) values['ENT_DIARIA_MEDIA'] = a.own_property.avg;
      if (a.pricing_index != null) values['ENT_INDICE_PRECO'] = a.pricing_index;
      if (Object.keys(values).length) onAutoFill?.(values);
      toast.success('Posicionamento de preço analisado');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao analisar preços');
    } finally {
      setLoading(false);
    }
  };

  const pos = analysis ? POSITIONING_MAP[analysis.positioning] : null;
  const PosIcon = pos?.icon;

  useAutoFillRunner('pricing', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Posicionamento de Preço'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-emerald-500/5">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Sua diária (média)</div>
              <div className="text-lg font-bold">{analysis.own_property.avg != null ? `R$ ${analysis.own_property.avg.toFixed(2)}` : '—'}</div>
              <div className="text-[10px] text-muted-foreground">{analysis.own_property.count} amostras</div>
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/5">
              <div className="text-xs text-muted-foreground mb-1">Mercado (média)</div>
              <div className="text-lg font-bold">{analysis.market_reference.avg != null ? `R$ ${analysis.market_reference.avg.toFixed(2)}` : '—'}</div>
              <div className="text-[10px] text-muted-foreground">{analysis.market_reference.count} amostras</div>
            </div>
            <div className="p-3 rounded-lg border bg-purple-500/5">
              <div className="text-xs text-muted-foreground mb-1">Índice (100 = paridade)</div>
              <div className="text-lg font-bold">{analysis.pricing_index ?? '—'}</div>
              {pos && PosIcon && (
                <Badge variant="outline" className={`text-[10px] mt-1 ${pos.color}`}>
                  <PosIcon className="h-3 w-3 mr-1" />{pos.label}
                </Badge>
              )}
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
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Loader2, Search, Newspaper, Globe, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Analysis {
  brand_strength_score: number;
  brand_tier: 'forte' | 'consolidada' | 'emergente' | 'baixa';
  total_results: number;
  unique_domains: number;
  authority_mentions: string[];
  news_mentions: string[];
  ota_presence: string[];
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
  forte: 'text-emerald-600',
  consolidada: 'text-blue-600',
  emergente: 'text-amber-600',
  baixa: 'text-rose-600',
};

export function BrandStrengthSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!businessName?.trim()) { toast.error('Informe o nome'); return; }
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-brand-strength', { body: { businessName, location } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_FORCA_MARCA: a.brand_strength_score });
      toast.success('Força da marca analisada');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar marca');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Força da Marca'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Força da Marca</div>
              <div className="text-2xl font-bold">{analysis.brand_strength_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.brand_strength_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.brand_tier]}`}>{analysis.brand_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Resultados</span><span className="font-bold">{analysis.total_results}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Domínios únicos</span><span className="font-bold">{analysis.unique_domains}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Newspaper className="h-3 w-3" /> Mídia</span><span className="font-bold">{analysis.news_mentions.length}</span></div>
              <div className="flex items-center justify-between pt-1 border-t"><span className="text-muted-foreground">OTAs</span><span className="font-bold">{analysis.ota_presence.length}</span></div>
            </div>
          </div>

          {analysis.authority_mentions.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Domínios de autoridade</div>
              <div className="flex flex-wrap gap-1">
                {analysis.authority_mentions.map((d) => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
              </div>
            </div>
          )}

          {analysis.sample_results.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Amostras</div>
              {analysis.sample_results.slice(0, 5).map((n, i) => (
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
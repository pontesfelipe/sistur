import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Instagram, Loader2, Search, ExternalLink, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlatformData { handle: string | null; url: string; followers: number | null; sample: string }
interface Analysis {
  presence_score: number;
  presence_tier: 'forte' | 'consolidada' | 'emergente' | 'baixa';
  active_platforms: string[];
  platforms: Record<string, PlatformData>;
  total_followers_estimated: number;
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

export function SocialMediaSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    if (!businessName?.trim()) { toast.error('Informe o nome'); return; }
    setLoading(true); setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-social-media', { body: { businessName, location } });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_PRESENCA_DIGITAL: a.presence_score });
      toast.success('Presença digital analisada');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao analisar redes');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Presença em Redes Sociais'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Instagram className="h-3 w-3" /> Presença</div>
              <div className="text-2xl font-bold">{analysis.presence_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.presence_score} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${TIER_COLOR[analysis.presence_tier]}`}>{analysis.presence_tier}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Plataformas ativas</span><span className="font-bold">{analysis.active_platforms.length}</span></div>
              <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Seguidores (est.)</span><span className="font-bold">{analysis.total_followers_estimated.toLocaleString('pt-BR')}</span></div>
            </div>
          </div>

          {Object.keys(analysis.platforms).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Perfis detectados</div>
              <div className="space-y-1">
                {Object.entries(analysis.platforms).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded border bg-card text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="capitalize font-medium">{k}</span>
                      {v.handle && <span className="text-muted-foreground truncate">@{v.handle}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.followers != null && <span className="text-muted-foreground">{v.followers.toLocaleString('pt-BR')}</span>}
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-primary"><ExternalLink className="h-3 w-3" /></a>
                    </div>
                  </div>
                ))}
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
        </div>
      )}
    </div>
  );
}
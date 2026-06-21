import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, Loader2, Search, Accessibility, Award, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Analysis {
  site_url: string | null;
  certifications: string[];
  practices: string[];
  accessibility: string[];
  sustainability_score: number;
  accessibility_score: number;
  recommendations: string[];
  summary: string;
}

interface Props {
  businessName: string;
  location: string;
  websiteUrl?: string | null;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

export function SustainabilitySearch({ businessName, location, websiteUrl, onAutoFill, onAnalysisCapture }: Props) {
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
      const { data, error } = await supabase.functions.invoke('search-sustainability-signals', {
        body: { businessName: businessName.trim(), location: location?.trim(), websiteUrl },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');
      const a: Analysis = data.analysis;
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      onAutoFill?.({
        ENT_SUSTENTABILIDADE_SCORE: a.sustainability_score,
        ENT_ACESSIBILIDADE_SCORE: a.accessibility_score,
      });
      toast.success('Sinais de sustentabilidade analisados');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Falha ao analisar sustentabilidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Analisando...' : 'Analisar Sustentabilidade & Acessibilidade'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground"><Leaf className="h-3 w-3" /> Sustentabilidade</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{analysis.sustainability_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.sustainability_score} className="h-1 mt-2" />
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/5">
              <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground"><Accessibility className="h-3 w-3" /> Acessibilidade</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{analysis.accessibility_score}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <Progress value={analysis.accessibility_score} className="h-1 mt-2" />
            </div>
          </div>

          {analysis.certifications.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-medium mb-1"><Award className="h-3 w-3" /> Certificações detectadas</div>
              <div className="flex flex-wrap gap-1">
                {analysis.certifications.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c.replace(/_/g, ' ')}</Badge>)}
              </div>
            </div>
          )}

          {analysis.practices.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Práticas identificadas</div>
              <div className="flex flex-wrap gap-1">
                {analysis.practices.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p.replace(/_/g, ' ')}</Badge>)}
              </div>
            </div>
          )}

          {analysis.accessibility.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Acessibilidade</div>
              <div className="flex flex-wrap gap-1">
                {analysis.accessibility.map((a) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
              </div>
            </div>
          )}

          {analysis.site_url && (
            <a href={analysis.site_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> Fonte analisada
            </a>
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
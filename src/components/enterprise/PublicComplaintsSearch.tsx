import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  businessName: string;
  location: string;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (analysis: Record<string, any>) => void;
}

export function PublicComplaintsSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState<any>(null);

  const run = async () => {
    if (!businessName?.trim()) {
      toast.error('Informe o nome do estabelecimento.');
      return;
    }
    setLoading(true);
    setA(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-public-complaints', {
        body: { businessName: businessName.trim(), location: (location || '').trim() },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados');
      setA(data.analysis);
      onAnalysisCapture?.(data.analysis);
      const values: Record<string, number> = {};
      if (data.analysis.public_reputation_score != null) {
        values['ENT_REPUTACAO_PUBLICA'] = data.analysis.public_reputation_score;
      }
      if (data.analysis.reclame_aqui?.solved_pct != null) {
        values['ENT_TAXA_SOLUCAO_RECLAMACOES'] = data.analysis.reclame_aqui.solved_pct;
      }
      onAutoFill?.(values);
      toast.success('Reclamações públicas analisadas');
    } catch (e: any) {
      toast.error('Erro ao buscar reclamações: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Busca registros públicos de reclamações no Reclame Aqui e menções no Procon para preencher reputação pública e taxa de solução.
        </p>
        <Button onClick={run} disabled={loading || !businessName} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? 'Buscando...' : 'Buscar Reclamações'}
        </Button>
      </div>

      {a && (
        <div className="space-y-3">
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Reputação Pública</p><p className="text-2xl font-bold">{a.public_reputation_score ?? '—'}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Nota RA</p><p className="text-2xl font-bold">{a.reclame_aqui?.ra_score ?? '—'}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Reclamações</p><p className="text-2xl font-bold">{a.reclame_aqui?.total_complaints ?? '—'}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Procon</p><p className="text-2xl font-bold">{a.procon?.mentions ?? 0}</p></CardContent></Card>
          </div>

          <Card><CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {a.reclame_aqui?.found ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
              Reclame Aqui
            </div>
            {a.reclame_aqui?.found ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {a.reclame_aqui.reputation_category && <Badge variant="outline" className="text-[10px]">{a.reclame_aqui.reputation_category}</Badge>}
                  {a.reclame_aqui.solved_pct != null && <Badge variant="outline" className="text-[10px]">{a.reclame_aqui.solved_pct}% solucionadas</Badge>}
                  {a.reclame_aqui.consumer_rating != null && <Badge variant="outline" className="text-[10px]">Índice {a.reclame_aqui.consumer_rating}</Badge>}
                </div>
                {a.reclame_aqui.url && (
                  <a href={a.reclame_aqui.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Ver perfil
                  </a>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum perfil ativo identificado.</p>
            )}
          </CardContent></Card>

          {a.recommendations?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10"><CardContent className="p-3 space-y-1.5">
              <p className="text-xs font-medium">Recomendações</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                {a.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
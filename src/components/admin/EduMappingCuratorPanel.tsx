import { tx } from '@/i18n/t';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, X, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

const REASON = 'Recomendado porque o indicador {indicator} está em {status} no pilar {pillar}.';

export function EduMappingCuratorPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['edu-mapping-suggestions'],
    queryFn: async () => {
      const { data: sugg, error } = await supabase
        .from('edu_mapping_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .limit(200);
      if (error) throw error;
      const tIds = [...new Set((sugg ?? []).map(s => s.training_id))];
      const codes = [...new Set((sugg ?? []).map(s => s.indicator_code))];
      const [{ data: tr }, { data: ind }, { count: analyzed }, { count: total }] = await Promise.all([
        tIds.length ? supabase.from('edu_trainings').select('training_id,title').in('training_id', tIds) : Promise.resolve({ data: [] as any[] }),
        codes.length ? supabase.from('indicators').select('code,name').in('code', codes) : Promise.resolve({ data: [] as any[] }),
        supabase.from('edu_mapping_analysis_log').select('*', { count: 'exact', head: true }),
        supabase.from('edu_trainings').select('*', { count: 'exact', head: true }).eq('active', true),
      ]);
      const tMap = new Map((tr ?? []).map((t: any) => [t.training_id, t.title]));
      const iMap = new Map((ind ?? []).map((i: any) => [i.code, i.name]));
      return {
        items: (sugg ?? []).map(s => ({ ...s, title: tMap.get(s.training_id) ?? s.training_id, indicatorName: iMap.get(s.indicator_code) ?? s.indicator_code })),
        analyzed: analyzed ?? 0,
        total: total ?? 0,
      };
    },
  });

  const runSync = async (mode: 'new' | 'all') => {
    setRunning(true);
    const since = new Date().toISOString();
    let created = 0, done = 0;
    try {
      for (let i = 0; i < 60; i++) {
        const { data: res, error } = await supabase.functions.invoke('sync-edu-indicator-mappings', { body: { mode, since } });
        if (error) {
          let msg = error.message;
          try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
          toast.error(msg);
          break;
        }
        created += res.created ?? 0;
        done += res.analyzed ?? 0;
        setProgress({ done, total: done + (res.remaining ?? 0) });
        if (!res.remaining || !res.analyzed) break;
      }
      toast.success(tx('Análise concluída: {{v0}} treinamentos lidos, {{v1}} novas sugestões.', { v0: done, v1: created }));
    } finally {
      setRunning(false);
      setProgress(null);
      qc.invalidateQueries({ queryKey: ['edu-mapping-suggestions'] });
    }
  };

  const review = async (ids: string[], approve: boolean) => {
    const items = (data?.items ?? []).filter(s => ids.includes(s.id));
    const { data: { user } } = await supabase.auth.getUser();
    if (approve && items.length) {
      const { error } = await supabase.from('edu_indicator_training_map').insert(items.map(s => ({
        training_id: s.training_id,
        indicator_code: s.indicator_code,
        pillar: s.pillar,
        priority: s.confidence >= 85 ? 1 : s.confidence >= 70 ? 2 : 3,
        reason_template: REASON,
      })));
      if (error) { toast.error(error.message); return; }
    }
    const { error } = await supabase.from('edu_mapping_suggestions')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? tx('Vínculos aprovados — já valem para todos os diagnósticos.') : tx('Sugestões recusadas.'));
    qc.invalidateQueries({ queryKey: ['edu-mapping-suggestions'] });
    qc.invalidateQueries({ queryKey: ['edu-recommendations-assessment'] });
  };

  const items = data?.items ?? [];
  const strong = items.filter(s => s.confidence >= 85).map(s => s.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />{tx('Curadoria de prescrições EDU')}</CardTitle>
        <CardDescription>
          {tx('A IA lê cada treinamento (título, ementa, objetivos, competências) e sugere a quais indicadores do mesmo pilar ele responde. Nada vale até você aprovar. Ao aprovar, o treinamento passa a aparecer em todos os diagnósticos com aquele gargalo, inclusive os já calculados.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => runSync('new')} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {tx('Analisar novos e alterados')}
          </Button>
          <Button variant="outline" onClick={() => runSync('all')} disabled={running}>
            <RefreshCw className="h-4 w-4 mr-2" />{tx('Reanalisar catálogo inteiro')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {tx('{{v0}} de {{v1}} treinamentos já analisados', { v0: data?.analyzed ?? 0, v1: data?.total ?? 0 })}
          </span>
        </div>
        {progress && <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />}

        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{tx('Sugestões aguardando revisão')} <Badge variant="secondary">{items.length}</Badge></h4>
          {strong.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => review(strong, true)}>
              <Check className="h-4 w-4 mr-1" />{tx('Aprovar as {{v0}} com confiança ≥ 85%', { v0: strong.length })}
            </Button>
          )}
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">{tx('Carregando…')}</p> : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx('Nenhuma sugestão pendente.')}</p>
        ) : (
          <div className="space-y-2">
            {items.map(s => (
              <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={s.pillar.toLowerCase() as any}>{s.pillar}</Badge>
                    <Badge variant="outline">{s.confidence}%</Badge>
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <p className="text-sm">→ {s.indicatorName} <span className="text-muted-foreground">({s.indicator_code})</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
                </div>
                <Button size="icon" variant="outline" aria-label={tx('Aprovar')} onClick={() => review([s.id], true)}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label={tx('Recusar')} onClick={() => review([s.id], false)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sliders, RotateCcw, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type PillarWeight = { pillar: string; weight: number; is_custom: boolean };
type IndicatorWeight = {
  indicator_id: string;
  code: string;
  name: string;
  pillar: string;
  default_weight: number;
  effective_weight: number;
  is_overridden: boolean;
};

const PILLAR_LABEL: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

export function OrgWeightsPanel() {
  const { effectiveOrgId } = useProfile();
  const qc = useQueryClient();
  const orgId = effectiveOrgId;

  const { data: pillarWeights, isLoading: loadingPillars } = useQuery({
    queryKey: ['org-pillar-weights', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_pillar_weights', { p_org_id: orgId! });
      if (error) throw error;
      return (data || []) as PillarWeight[];
    },
    enabled: !!orgId,
  });

  const { data: indicatorWeights, isLoading: loadingIndicators } = useQuery({
    queryKey: ['org-indicator-weights', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_indicator_weights', { p_org_id: orgId! });
      if (error) throw error;
      return (data || []) as IndicatorWeight[];
    },
    enabled: !!orgId,
  });

  // Local state for pillar editing
  const [draft, setDraft] = useState<{ RA: number; OE: number; AO: number } | null>(null);

  useEffect(() => {
    if (pillarWeights && pillarWeights.length > 0 && !draft) {
      setDraft({
        RA: pillarWeights.find(p => p.pillar === 'RA')?.weight ?? 0.35,
        OE: pillarWeights.find(p => p.pillar === 'OE')?.weight ?? 0.30,
        AO: pillarWeights.find(p => p.pillar === 'AO')?.weight ?? 0.35,
      });
    }
  }, [pillarWeights, draft]);

  const sum = draft ? draft.RA + draft.OE + draft.AO : 0;
  const sumValid = Math.abs(sum - 1) < 0.01;
  const isCustom = pillarWeights?.some(p => p.is_custom) ?? false;

  const setPillarsMutation = useMutation({
    mutationFn: async (vals: { RA: number; OE: number; AO: number }) => {
      const { error } = await supabase.rpc('set_org_pillar_weights', {
        p_org_id: orgId!,
        p_ra: vals.RA,
        p_oe: vals.OE,
        p_ao: vals.AO,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pesos de pilar atualizados — diagnósticos marcados para recálculo');
      qc.invalidateQueries({ queryKey: ['org-pillar-weights', orgId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const resetPillarsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_org_pillar_weights', { p_org_id: orgId! });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pesos de pilar restaurados ao padrão');
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['org-pillar-weights', orgId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const setIndicatorMutation = useMutation({
    mutationFn: async ({ indicator_id, weight }: { indicator_id: string; weight: number | null }) => {
      const { error } = await supabase.rpc('set_org_indicator_weight', {
        p_org_id: orgId!,
        p_indicator_id: indicator_id,
        p_weight: weight,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Peso do indicador atualizado');
      qc.invalidateQueries({ queryKey: ['org-indicator-weights', orgId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const overriddenCount = indicatorWeights?.filter(i => i.is_overridden).length ?? 0;

  if (!orgId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Selecione uma organização.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Pesos Customizáveis da Organização
        </h3>
        <p className="text-sm text-muted-foreground">
          Ajuste a importância relativa de cada pilar e indicador no Score Final do diagnóstico.
          Mudanças marcam todos os diagnósticos calculados para recálculo.
        </p>
      </div>

      <Tabs defaultValue="pillars">
        <TabsList>
          <TabsTrigger value="pillars">Pesos por Pilar</TabsTrigger>
          <TabsTrigger value="indicators">
            Pesos por Indicador
            {overriddenCount > 0 && <Badge variant="outline" className="ml-2 h-5">{overriddenCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pillars" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição entre Pilares (RA / OE / AO)</CardTitle>
              <CardDescription>
                Padrão SISTUR: RA 35% / OE 30% / AO 35%. A soma dos três pesos deve ser exatamente 100%.
                {isCustom && <Badge variant="outline" className="ml-2 bg-violet-500/15 text-violet-700 dark:text-violet-300">Personalizado</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingPillars || !draft ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  {(['RA', 'OE', 'AO'] as const).map((p) => (
                    <div key={p} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">{p} — {PILLAR_LABEL[p]}</Label>
                        <Badge variant="outline" className="tabular-nums">
                          {(draft[p] * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <Slider
                        value={[draft[p] * 100]}
                        onValueChange={(v) => setDraft({ ...draft, [p]: v[0] / 100 })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  ))}

                  <div className={`flex items-center justify-between p-3 rounded-md border ${sumValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                    <span className="text-sm font-medium flex items-center gap-2">
                      {sumValid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                      Soma total
                    </span>
                    <span className="font-bold tabular-nums">{(sum * 100).toFixed(1)}%</span>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => resetPillarsMutation.mutate()}
                      disabled={!isCustom || resetPillarsMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar padrão
                    </Button>
                    <Button
                      onClick={() => setPillarsMutation.mutate(draft)}
                      disabled={!sumValid || setPillarsMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar pesos
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sobreposições de Peso por Indicador</CardTitle>
              <CardDescription>
                Padrão = peso global do catálogo. Edite para sobrepor apenas neste contexto organizacional.
                Limpe o campo (deixe vazio e Enter) para restaurar o padrão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIndicators ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <IndicatorWeightTable
                  rows={indicatorWeights || []}
                  onSave={(indicator_id, weight) => setIndicatorMutation.mutate({ indicator_id, weight })}
                  saving={setIndicatorMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IndicatorWeightTable({
  rows,
  onSave,
  saving,
}: {
  rows: IndicatorWeight[];
  onSave: (indicator_id: string, weight: number | null) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [pillarFilter, setPillarFilter] = useState<string>('all');

  const filtered = useMemo(
    () => pillarFilter === 'all' ? rows : rows.filter(r => r.pillar === pillarFilter),
    [rows, pillarFilter]
  );

  const handleSave = (id: string, defaultW: number) => {
    const raw = editing[id];
    if (raw === undefined) return;
    if (raw.trim() === '') {
      onSave(id, null);
    } else {
      const w = Number(raw.replace(',', '.'));
      if (isNaN(w) || w < 0 || w > 10) {
        toast.error('Peso deve ser entre 0 e 10');
        return;
      }
      if (Math.abs(w - defaultW) < 0.001) {
        onSave(id, null);
      } else {
        onSave(id, w);
      }
    }
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {['all', 'RA', 'OE', 'AO'].map((p) => (
          <Button
            key={p}
            size="sm"
            variant={pillarFilter === p ? 'default' : 'outline'}
            onClick={() => setPillarFilter(p)}
          >
            {p === 'all' ? `Todos (${rows.length})` : `${p} (${rows.filter(r => r.pillar === p).length})`}
          </Button>
        ))}
      </div>

      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead>Pilar</TableHead>
              <TableHead className="text-right">Padrão</TableHead>
              <TableHead className="text-right">Efetivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Ajustar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.indicator_id}>
                <TableCell>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                </TableCell>
                <TableCell><Badge variant="outline">{r.pillar}</Badge></TableCell>
                <TableCell className="text-right tabular-nums text-xs">{Number(r.default_weight).toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{Number(r.effective_weight).toFixed(2)}</TableCell>
                <TableCell>
                  {r.is_overridden ? (
                    <Badge variant="outline" className="bg-violet-500/15 text-violet-700 dark:text-violet-300">Personalizado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Padrão</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      placeholder={String(r.default_weight)}
                      className="h-8 w-20 text-xs"
                      value={editing[r.indicator_id] ?? ''}
                      onChange={(e) => setEditing({ ...editing, [r.indicator_id]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(r.indicator_id, r.default_weight); }}
                      disabled={saving}
                    />
                    {editing[r.indicator_id] !== undefined && (
                      <Button size="sm" className="h-8 px-2" onClick={() => handleSave(r.indicator_id, r.default_weight)} disabled={saving}>
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
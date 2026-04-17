import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIndicators } from '@/hooks/useIndicators';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw, Save, Scale, Sparkles } from 'lucide-react';

type Pillar = 'RA' | 'OE' | 'AO';

const PILLAR_NAMES: Record<Pillar, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

export function IndicatorWeightsManager() {
  const { indicators, isLoading, updateIndicator } = useIndicators();
  const [activePillar, setActivePillar] = useState<Pillar>('RA');
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [normalizing, setNormalizing] = useState(false);

  // Filter indicators by active pillar
  const pillarIndicators = useMemo(
    () => indicators
      .filter((i: any) => i.pillar === activePillar)
      .sort((a: any, b: any) => (a.theme || '').localeCompare(b.theme || '') || a.code.localeCompare(b.code)),
    [indicators, activePillar]
  );

  // Initialize drafts from current weights when indicators load or pillar changes
  useEffect(() => {
    const initial: Record<string, number> = {};
    pillarIndicators.forEach((i: any) => {
      if (drafts[i.id] === undefined) {
        initial[i.id] = Number(i.weight) || 0;
      }
    });
    if (Object.keys(initial).length > 0) {
      setDrafts((prev) => ({ ...initial, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillarIndicators.length, activePillar]);

  // Compute totals
  const totals = useMemo(() => {
    const result: Record<Pillar, { sum: number; count: number; dirty: boolean }> = {
      RA: { sum: 0, count: 0, dirty: false },
      OE: { sum: 0, count: 0, dirty: false },
      AO: { sum: 0, count: 0, dirty: false },
    };
    indicators.forEach((i: any) => {
      const p = i.pillar as Pillar;
      if (!result[p]) return;
      const draftWeight = drafts[i.id];
      const w = draftWeight !== undefined ? draftWeight : Number(i.weight) || 0;
      result[p].sum += w;
      result[p].count += 1;
      if (draftWeight !== undefined && Math.abs(draftWeight - (Number(i.weight) || 0)) > 1e-6) {
        result[p].dirty = true;
      }
    });
    return result;
  }, [indicators, drafts]);

  const currentTotal = totals[activePillar].sum;
  const isPillarValid = Math.abs(currentTotal - 1) < 0.005;
  const dirtyCount = useMemo(
    () => Object.entries(drafts).filter(([id, w]) => {
      const ind = indicators.find((i: any) => i.id === id);
      return ind && Math.abs(w - (Number(ind.weight) || 0)) > 1e-6;
    }).length,
    [drafts, indicators]
  );

  const handleWeightChange = (id: string, value: string) => {
    const num = parseFloat(value) / 100;
    if (isNaN(num)) return;
    setDrafts((prev) => ({ ...prev, [id]: Math.max(0, Math.min(1, num)) }));
  };

  const handleResetPillar = () => {
    const reset = { ...drafts };
    pillarIndicators.forEach((i: any) => {
      reset[i.id] = Number(i.weight) || 0;
    });
    setDrafts(reset);
    toast.info('Alterações descartadas neste pilar');
  };

  const handleNormalizePillar = () => {
    setNormalizing(true);
    const sum = pillarIndicators.reduce((acc: number, i: any) => {
      const w = drafts[i.id] !== undefined ? drafts[i.id] : Number(i.weight) || 0;
      return acc + w;
    }, 0);

    if (sum === 0) {
      toast.error('Soma dos pesos é zero — não é possível normalizar');
      setNormalizing(false);
      return;
    }

    const normalized = { ...drafts };
    pillarIndicators.forEach((i: any) => {
      const current = drafts[i.id] !== undefined ? drafts[i.id] : Number(i.weight) || 0;
      normalized[i.id] = Number((current / sum).toFixed(6));
    });
    setDrafts(normalized);
    toast.success(`Pesos do pilar ${activePillar} normalizados para 100%`);
    setNormalizing(false);
  };

  const handleEqualizePillar = () => {
    const equal = 1 / pillarIndicators.length;
    const equalized = { ...drafts };
    pillarIndicators.forEach((i: any) => {
      equalized[i.id] = Number(equal.toFixed(6));
    });
    setDrafts(equalized);
    toast.success(`Pesos do pilar ${activePillar} igualados (${(equal * 100).toFixed(2)}% cada)`);
  };

  const handleSavePillar = async () => {
    if (!isPillarValid) {
      toast.error(`Soma deve ser 100% (atual: ${(currentTotal * 100).toFixed(2)}%). Use "Normalizar".`);
      return;
    }

    setSaving(true);
    try {
      const dirtyIndicators = pillarIndicators.filter((i: any) => {
        const draft = drafts[i.id];
        return draft !== undefined && Math.abs(draft - (Number(i.weight) || 0)) > 1e-6;
      });

      if (dirtyIndicators.length === 0) {
        toast.info('Nenhuma alteração para salvar');
        setSaving(false);
        return;
      }

      // Bulk update via individual mutations (sequential to keep RLS clear)
      for (const i of dirtyIndicators) {
        const { error } = await supabase
          .from('indicators')
          .update({ weight: drafts[i.id] })
          .eq('id', i.id);
        if (error) throw error;
      }

      toast.success(`${dirtyIndicators.length} peso(s) atualizados no pilar ${activePillar}`);
      // Refresh by clearing drafts for this pillar
      const cleared = { ...drafts };
      dirtyIndicators.forEach((i: any) => { delete cleared[i.id]; });
      setDrafts(cleared);
      // Trigger a refetch
      window.dispatchEvent(new Event('indicator-weights-saved'));
    } catch (err: any) {
      console.error('Error saving weights:', err);
      toast.error('Erro ao salvar pesos: ' + (err.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Carregando indicadores...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Ajuste de Pesos dos Indicadores
        </CardTitle>
        <CardDescription>
          Calibre os pesos relativos dos indicadores em cada pilar. A soma por pilar deve ser 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Alterações afetam <strong>todos os diagnósticos futuros</strong>. Use "Normalizar" para forçar a soma a 100% mantendo proporções.
          </AlertDescription>
        </Alert>

        {/* Pillar totals overview */}
        <div className="grid grid-cols-3 gap-2">
          {(['RA', 'OE', 'AO'] as Pillar[]).map((p) => {
            const t = totals[p];
            const valid = Math.abs(t.sum - 1) < 0.005;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActivePillar(p)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  activePillar === p ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{p}</span>
                  {t.dirty && <Badge variant="secondary" className="text-[10px] h-4">editado</Badge>}
                </div>
                <div className={`text-lg font-bold ${valid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {(t.sum * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-muted-foreground">{t.count} indicadores</div>
              </button>
            );
          })}
        </div>

        <Tabs value={activePillar} onValueChange={(v) => setActivePillar(v as Pillar)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="RA">RA</TabsTrigger>
            <TabsTrigger value="OE">OE</TabsTrigger>
            <TabsTrigger value="AO">AO</TabsTrigger>
          </TabsList>

          {(['RA', 'OE', 'AO'] as Pillar[]).map((p) => (
            <TabsContent key={p} value={p} className="space-y-3 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium">{PILLAR_NAMES[p]}</p>
                  <p className="text-xs text-muted-foreground">
                    Soma atual: <span className={isPillarValid ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {(currentTotal * 100).toFixed(2)}%
                    </span>
                    {' • '}
                    {dirtyCount > 0 && <span className="text-primary">{dirtyCount} alterado(s)</span>}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={handleEqualizePillar}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Igualar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleNormalizePillar} disabled={normalizing}>
                    <Scale className="h-3.5 w-3.5 mr-1" />
                    Normalizar 100%
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleResetPillar}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reverter
                  </Button>
                  <Button size="sm" onClick={handleSavePillar} disabled={saving || !isPillarValid || dirtyCount === 0}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Indicador</TableHead>
                      <TableHead className="w-[140px]">Tema</TableHead>
                      <TableHead className="w-[140px] text-right">Peso (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pillarIndicators.map((i: any) => {
                      const draft = drafts[i.id];
                      const currentWeight = draft !== undefined ? draft : Number(i.weight) || 0;
                      const original = Number(i.weight) || 0;
                      const isDirty = draft !== undefined && Math.abs(draft - original) > 1e-6;
                      return (
                        <TableRow key={i.id} className={isDirty ? 'bg-primary/5' : ''}>
                          <TableCell className="font-mono text-xs">{i.code}</TableCell>
                          <TableCell className="text-xs">{i.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{i.theme}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={(currentWeight * 100).toFixed(2)}
                              onChange={(e) => handleWeightChange(i.id, e.target.value)}
                              className={`h-8 text-right text-xs w-24 ml-auto ${isDirty ? 'border-primary' : ''}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

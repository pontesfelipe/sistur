import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProject } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, Save, FolderPlus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TWIN_LEVERS, projectScenario, type PillarKey } from '@/lib/revenueIntelligence';
import { SEVERITY_INFO, getSeverityFromScore, type Severity } from '@/types/sistur';

const PRESETS: Record<string, { drift: number; intensity: number }> = {
  Pessimista: { drift: -1.5, intensity: 0 },
  Base: { drift: 0, intensity: 30 },
  Otimista: { drift: 0.5, intensity: 80 },
};

interface Ctx { assessmentId?: string; orgId?: string; destinationId?: string }

export function DigitalTwinPanel({ pillarScores, assessmentId, orgId, destinationId }: { pillarScores: any[] } & Ctx) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [scenarioName, setScenarioName] = useState('');
  const { data: saved = [] } = useQuery({
    queryKey: ['twin-scenarios', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('twin_scenarios').select('*').eq('assessment_id', assessmentId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const base = useMemo(() => {
    const get = (p: PillarKey) => Number(pillarScores.find((x: any) => x.pillar === p)?.score ?? 0.5);
    return { RA: get('RA'), OE: get('OE'), AO: get('AO') };
  }, [pillarScores]);
  const [years, setYears] = useState(3);
  const [preset, setPreset] = useState('Base');
  const [intensities, setIntensities] = useState<Record<string, number>>(
    Object.fromEntries(TWIN_LEVERS.map((l) => [l.id, 30])),
  );

  const applyPreset = (name: string) => {
    setPreset(name);
    setIntensities(Object.fromEntries(TWIN_LEVERS.map((l) => [l.id, PRESETS[name].intensity])));
  };

  const scenarios = useMemo(
    () =>
      Object.entries(PRESETS).map(([name, cfg]) => ({
        name,
        data: projectScenario(
          base,
          name === preset ? intensities : Object.fromEntries(TWIN_LEVERS.map((l) => [l.id, cfg.intensity])),
          years,
          cfg.drift,
        ),
      })),
    [base, intensities, years, preset],
  );
  const current = scenarios.find((s) => s.name === preset)!.data;
  const saveScenario = async () => {
    if (!assessmentId || !orgId) return;
    const name = scenarioName.trim() || `${preset} — ${years} ano(s)`;
    const { error } = await supabase.from('twin_scenarios').insert({
      org_id: orgId, assessment_id: assessmentId, name, preset, years, intensities, projection: current as any,
    });
    if (error) { toast.error(error.code === '42501' ? 'Sem permissão para salvar cenários nesta organização.' : error.message); return; }
    setScenarioName(''); toast.success('Cenário salvo');
    qc.invalidateQueries({ queryKey: ['twin-scenarios', assessmentId] });
  };
  const loadScenario = (s: any) => { setPreset(s.preset in PRESETS ? s.preset : 'Base'); setYears(s.years); setIntensities({ ...intensities, ...(s.intensities || {}) }); };
  const deleteScenario = async (id: string) => {
    const { error } = await supabase.from('twin_scenarios').delete().eq('id', id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ['twin-scenarios', assessmentId] });
  };
  const toProject = async () => {
    if (!assessmentId || !orgId || !destinationId) return;
    const active = TWIN_LEVERS.filter((l) => (intensities[l.id] || 0) > 0).sort((a, b) => intensities[b.id] - intensities[a.id]);
    const last = current[current.length - 1];
    const start = new Date(); const end = new Date(); end.setFullYear(end.getFullYear() + years);
    const description = `Projeto gerado a partir do cenário "${scenarioName.trim() || preset}" do Gêmeo Digital (${years} ano(s)).\n` +
      `Meta projetada: RA ${Math.round(last.RA * 100)}%, OE ${Math.round(last.OE * 100)}%, AO ${Math.round(last.AO * 100)}%.\n` +
      `Alavancas: ${active.map((l) => `${l.label} (${intensities[l.id]}%)`).join('; ') || 'nenhuma'}.`;
    try {
      const p: any = await createProject.mutateAsync({
        org_id: orgId, destination_id: destinationId, assessment_id: assessmentId,
        name: `Cenário ${scenarioName.trim() || preset} — Gêmeo Digital`, description, methodology: 'waterfall',
        planned_start_date: start.toISOString().slice(0, 10), planned_end_date: end.toISOString().slice(0, 10),
        generated_structure: { source: 'digital_twin', preset, years, intensities, projection: current },
      });
      if (p?.id) navigate(`/projetos?project=${p.id}`);
    } catch { /* toast já exibido */ }
  };

  const chart = current.map((p) => ({ ano: `Ano ${p.year}`, RA: Math.round(p.RA * 100), OE: Math.round(p.OE * 100), AO: Math.round(p.AO * 100) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Gêmeo Digital — cenários de 1 a 5 anos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha um cenário e ajuste as alavancas. Os efeitos seguem regras sistêmicas: meio ambiente fraco (RA abaixo de 34%) limita ganhos operacionais, e governança fraca (OE abaixo de 34%) reduz todos os ganhos. Nada é salvo no diagnóstico oficial.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(PRESETS).map((n) => (
              <Button key={n} size="sm" variant={preset === n ? 'default' : 'outline'} onClick={() => applyPreset(n)}>{n}</Button>
            ))}
            <span className="ml-4 text-sm">Horizonte: {years} ano(s)</span>
            <div className="w-40"><Slider value={[years]} min={1} max={5} step={1} onValueChange={([v]) => setYears(v)} aria-label="Horizonte" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {TWIN_LEVERS.map((l) => (
              <div key={l.id} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="font-medium">{l.label}</span><span>{intensities[l.id]}%</span></div>
                <p className="text-xs text-muted-foreground">{l.description}</p>
                <Slider value={[intensities[l.id]]} min={0} max={100} step={5} aria-label={l.label}
                  onValueChange={([v]) => setIntensities({ ...intensities, [l.id]: v })} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-64" placeholder="Nome do cenário (opcional)" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
            <Button size="sm" variant="outline" onClick={saveScenario} disabled={!assessmentId}><Save className="h-4 w-4 mr-1" />Salvar cenário</Button>
            <Button size="sm" onClick={toProject} disabled={!destinationId || createProject.isPending}><FolderPlus className="h-4 w-4 mr-1" />Transformar cenário em projeto</Button>
          </div>
          {saved.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Cenários salvos</p>
              {saved.map((s: any) => {
                const l = (s.projection || [])[s.projection?.length - 1];
                return (
                  <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <button type="button" className="text-left hover:underline" onClick={() => loadScenario(s)}>
                      <b>{s.name}</b> · {new Date(s.created_at).toLocaleDateString('pt-BR')}
                      {l && <span className="text-muted-foreground"> — RA {Math.round(l.RA * 100)}% · OE {Math.round(l.OE * 100)}% · AO {Math.round(l.AO * 100)}%</span>}
                    </button>
                    <Button size="icon" variant="ghost" aria-label="Excluir cenário" onClick={() => deleteScenario(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Legend />
                <Line dataKey="RA" stroke="hsl(var(--pillar-ra))" />
                <Line dataKey="OE" stroke="hsl(var(--pillar-oe))" />
                <Line dataKey="AO" stroke="hsl(var(--pillar-ao))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Comparação de cenários (ano {years})</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {scenarios.map((s) => {
            const last = s.data[s.data.length - 1];
            return (
              <div key={s.name} className="rounded border p-3 space-y-1">
                <p className="font-semibold">{s.name}</p>
                {(['RA', 'OE', 'AO'] as PillarKey[]).map((p) => {
                  const sev = getSeverityFromScore(last[p]) as Severity;
                  return (
                    <div key={p} className="flex justify-between text-sm">
                      <span>{p}: {Math.round(last[p] * 100)}%</span>
                      <Badge variant="outline" className={SEVERITY_INFO[sev].color}>{SEVERITY_INFO[sev].label}</Badge>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

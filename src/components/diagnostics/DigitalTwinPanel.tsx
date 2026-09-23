import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TWIN_LEVERS, projectScenario, type PillarKey } from '@/lib/revenueIntelligence';
import { SEVERITY_INFO, getSeverityFromScore, type Severity } from '@/types/sistur';

const PRESETS: Record<string, { drift: number; intensity: number }> = {
  Pessimista: { drift: -1.5, intensity: 0 },
  Base: { drift: 0, intensity: 30 },
  Otimista: { drift: 0.5, intensity: 80 },
};

export function DigitalTwinPanel({ pillarScores }: { pillarScores: any[] }) {
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

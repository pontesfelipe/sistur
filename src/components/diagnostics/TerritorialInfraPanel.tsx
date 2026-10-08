import { tx } from '@/i18n/t';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Lightbulb, FolderPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getIntlLocale } from '@/i18n/dateLocale';
import { buildTerritorialInfraInsights, type InfraInsight } from '@/lib/territorialInfra';

const CODES = ['igma_meios_hospedagem', 'OE001', 'igma_guias_turismo', 'igma_agencias_turismo', 'igma_cobertura_saude', 'igma_populacao', 'igma_leitos_por_habitante'];
const fmt = (v: number | null | undefined) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Mapeamento de Infraestrutura do Destino: só dados oficiais já ingeridos, sem concorrência. */
export function TerritorialInfraPanel({ destinationId }: { destinationId: string }) {
  const { user } = useAuth();
  const mapEl = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['territorial-infra', destinationId],
    queryFn: async () => {
      const { data: dest } = await supabase.from('destinations').select('id,name,uf,ibge_code,latitude,longitude,org_id').eq('id', destinationId).maybeSingle();
      const code = dest?.ibge_code ?? '';
      const codes = code ? [code, code.slice(0, 6)] : ['-'];
      const today = new Date().toISOString().slice(0, 10);
      const [vals, mapa, iphan, anac, events, asmt] = await Promise.all([
        supabase.from('external_indicator_values').select('indicator_code,raw_value,reference_year,source_code,org_id').in('municipality_ibge_code', codes).in('indicator_code', CODES),
        supabase.from('mapa_turismo_municipios').select('categoria,regiao_turistica,ano_referencia').in('ibge_code', codes).limit(1),
        supabase.from('iphan_heritage_assets').select('id,asset_name,asset_type,protection_level').in('ibge_code', codes).limit(50),
        supabase.from('anac_air_connectivity').select('total_passengers_12m,flights_per_week').in('ibge_code', codes).order('reference_period_end', { ascending: false }).limit(1),
        dest?.org_id ? supabase.from('observatory_events').select('id,name,start_date,estimated_attendance').eq('org_id', dest.org_id).gte('start_date', today).order('start_date').limit(5) : Promise.resolve({ data: [] as any[] }),
        supabase.from('assessments').select('id').eq('destination_id', destinationId).order('created_at', { ascending: false }).limit(1),
      ]);
      const v: Record<string, { value: number; year: number | null; source: string }> = {};
      (vals.data ?? []).forEach((r: any) => { if (!v[r.indicator_code] || r.org_id === dest?.org_id) v[r.indicator_code] = { value: Number(r.raw_value), year: r.reference_year, source: r.source_code }; });
      return { dest, v, mapa: mapa.data?.[0] ?? null, iphan: iphan.data ?? [], anac: anac.data?.[0] ?? null, events: events.data ?? [], assessmentId: asmt.data?.[0]?.id ?? null };
    },
  });

  const dest = data?.dest;
  useEffect(() => {
    if (!mapEl.current || !dest?.latitude) return;
    const m = L.map(mapEl.current, { scrollWheelZoom: false }).setView([dest.latitude, dest.longitude], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(m);
    L.circleMarker([dest.latitude, dest.longitude], { radius: 9, color: 'hsl(var(--primary))', fillOpacity: 1 }).bindPopup(`<b>${dest.name}</b>`).addTo(m);
    return () => { m.remove(); };
  }, [dest?.latitude, dest?.longitude, dest?.name]);

  const v = data?.v ?? {};
  const insights = useMemo(() => !data ? [] : buildTerritorialInfraInsights({
    mapaCategoria: data.mapa?.categoria ?? null,
    hospedagens: v.igma_meios_hospedagem?.value ?? null, leitosTuristicos: v.OE001?.value ?? null,
    guias: v.igma_guias_turismo?.value ?? null, agencias: v.igma_agencias_turismo?.value ?? null,
    patrimonioIphan: data.iphan.length, hasAirport: !!data.anac,
    coberturaSaude: v.igma_cobertura_saude?.value ?? null, populacao: v.igma_populacao?.value ?? null,
    nextEvent: data.events[0] ?? null,
  }), [data]);

  const createProject = async (ins: InfraInsight) => {
    if (!dest || !data?.assessmentId || !user) { toast.error(tx('É preciso ter um diagnóstico deste destino para criar o projeto.')); return; }
    setCreating(ins.id);
    const { data: trial } = await (supabase.rpc as any)('get_my_trial_state');
    if (trial?.org_trialing) { setCreating(null); toast.error(tx('O módulo de Projetos faz parte dos planos contratados.')); return; }
    const { error } = await supabase.from('projects').insert({
      org_id: dest.org_id, destination_id: destinationId, assessment_id: data.assessmentId, created_by: user.id,
      name: `${ins.title} — ${dest.name}`, description: `${ins.text}\n\nOrigem: Mapeamento de Infraestrutura do Destino (dados oficiais).`, methodology: 'kanban',
    });
    setCreating(null);
    if (error) toast.error(error.message); else toast.success(tx('Projeto criado. Veja em Projetos.'));
  };

  const Stat = ({ label, value, src }: { label: string; value: string; src: string }) => (
    <div className="rounded-md border p-3"><p className="text-muted-foreground text-sm">{tx(label)}</p><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{src}</p></div>
  );
  const cad = (k: string) => v[k] ? `CADASTUR ${v[k].year ?? ''}` : tx('Sem registro no CADASTUR');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> {tx('Mapeamento de Infraestrutura do Destino')}</CardTitle>
        <CardDescription>{tx('O que o município oferece ao visitante segundo as fontes oficiais já integradas ao SISTUR (Mapa do Turismo, CADASTUR, IPHAN, ANAC, DATASUS e Observatório). Sem comparação entre municípios.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading ? <p className="text-muted-foreground">{tx('Carregando...')}</p> : <>
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
            <span className="font-medium">{tx('Mapa do Turismo')}:</span>
            {data?.mapa ? <><Badge>{tx('Categoria')} {data.mapa.categoria}</Badge>{data.mapa.regiao_turistica && <Badge variant="secondary">{data.mapa.regiao_turistica}</Badge>}<span className="text-xs text-muted-foreground">{data.mapa.ano_referencia}</span></>
              : <span className="text-muted-foreground">{tx('Município não consta no Mapa do Turismo.')}</span>}
          </div>

          {dest?.latitude ? <div ref={mapEl} className="h-[260px] w-full rounded-md border z-0" /> : null}

          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Stat label="Meios de hospedagem" value={fmt(v.igma_meios_hospedagem?.value)} src={cad('igma_meios_hospedagem')} />
            <Stat label="Leitos turísticos" value={fmt(v.OE001?.value)} src={cad('OE001')} />
            <Stat label="Guias de turismo" value={fmt(v.igma_guias_turismo?.value)} src={cad('igma_guias_turismo')} />
            <Stat label="Agências de turismo" value={fmt(v.igma_agencias_turismo?.value)} src={cad('igma_agencias_turismo')} />
            <Stat label="Bens protegidos" value={String(data?.iphan.length ?? 0)} src="IPHAN" />
            <Stat label="Demanda aérea (12 meses)" value={data?.anac ? Number(data.anac.total_passengers_12m ?? 0).toLocaleString('pt-BR') : '—'} src={data?.anac ? `ANAC · ${data.anac.flights_per_week ?? 0} voos/semana` : tx('Sem aeroporto no município')} />
            <Stat label="Cobertura de saúde" value={v.igma_cobertura_saude ? `${fmt(v.igma_cobertura_saude.value)} /10 mil hab.` : "—"} src="DATASUS" />
            <Stat label="População" value={fmt(v.igma_populacao?.value)} src="IBGE" />
          </div>

          {(data?.iphan.length ?? 0) > 0 && (
            <details className="rounded-md border p-3"><summary className="cursor-pointer font-medium">{tx('Patrimônio protegido (IPHAN)')}</summary>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">{data!.iphan.map((a: any) => <li key={a.id}>{a.asset_name}{a.asset_type ? ` · ${a.asset_type}` : ''}</li>)}</ul>
            </details>
          )}

          <div className="rounded-md border p-3 space-y-3">
            <p className="font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />{tx('O que a infraestrutura do destino indica')}</p>
            {insights.length === 0 ? <p className="text-xs text-muted-foreground">{tx('Nenhum ponto de atenção com os dados oficiais disponíveis.')}</p>
              : insights.map(ins => (
                <div key={ins.id} className="flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="font-medium">{tx(ins.title)}</p><p className="text-muted-foreground">{ins.text}</p></div>
                  <Button size="sm" variant="outline" disabled={creating === ins.id} onClick={() => createProject(ins)} className="shrink-0"><FolderPlus className="h-4 w-4 mr-1" />{tx('Virar projeto')}</Button>
                </div>
              ))}
          </div>

          <div className="rounded-md border p-3">
            <p className="text-muted-foreground">{tx('Próximos eventos (Observatório)')}</p>
            {data?.events.length ? data.events.map((e: any) => <p key={e.id} className="text-xs">{new Date(e.start_date).toLocaleDateString(getIntlLocale())} · {e.name}</p>)
              : <p className="text-xs text-muted-foreground">{tx('Nenhum evento futuro cadastrado.')}</p>}
          </div>
          <p className="text-xs text-muted-foreground">{tx('Campos com "—" ainda não têm dado oficial ingerido para o município. Atualize as fontes em Saúde das Ingestões.')}</p>
        </>}
      </CardContent>
    </Card>
  );
}

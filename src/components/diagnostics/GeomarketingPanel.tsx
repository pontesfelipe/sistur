import { tx } from '@/i18n/t';
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair, Search, Lightbulb, FolderPlus, Landmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getIntlLocale } from '@/i18n/dateLocale';
import { effectiveDistance, radiusMetrics, positionVsArea, buildGeoInsights, type PoiCounts, type GeoInsight } from '@/lib/geomarketing';

interface Props { destinationId: string }

const UF_CAPITALS: Record<string, [number, number]> = {
  AC:[-9.97,-67.81],AL:[-9.66,-35.73],AP:[0.03,-51.07],AM:[-3.12,-60.02],BA:[-12.97,-38.5],CE:[-3.73,-38.52],
  DF:[-15.79,-47.88],ES:[-20.32,-40.34],GO:[-16.68,-49.25],MA:[-2.53,-44.3],MT:[-15.6,-56.1],MS:[-20.44,-54.65],
  MG:[-19.92,-43.94],PA:[-1.46,-48.5],PB:[-7.12,-34.86],PR:[-25.43,-49.27],PE:[-8.05,-34.9],PI:[-5.09,-42.8],
  RJ:[-22.91,-43.17],RN:[-5.79,-35.21],RS:[-30.03,-51.23],RO:[-8.76,-63.9],RR:[2.82,-60.67],SC:[-27.6,-48.55],
  SP:[-23.55,-46.63],SE:[-10.91,-37.07],TO:[-10.18,-48.33],
};

function offset(lat: number, lng: number, km: number, i: number) {
  const ang = (i * 137.5 * Math.PI) / 180;
  return [lat + (km / 111) * Math.cos(ang), lng + (km / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(ang)] as [number, number];
}

async function geocode(q: string): Promise<[number, number] | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'pt-BR' } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.[0] ? [Number(j[0].lat), Number(j[0].lon)] : null;
}

type Poi = { lat: number; lng: number; name: string; cat: keyof PoiCounts };
const POI_LABEL: Record<keyof PoiCounts, string> = { atrativos: 'Atrativos', restaurantes: 'Restaurantes', transporte: 'Transporte', saude: 'Saúde' };

async function fetchPois(lat: number, lng: number, km: number): Promise<Poi[]> {
  const r = Math.min(km, 15) * 1000;
  const q = `[out:json][timeout:25];(
    nwr(around:${r},${lat},${lng})[tourism~"^(attraction|museum|viewpoint|gallery|theme_park|zoo)$"];
    nwr(around:${r},${lat},${lng})[natural=beach];
    nwr(around:${r},${lat},${lng})[amenity~"^(restaurant|cafe|bar)$"];
    nwr(around:${r},${lat},${lng})[amenity~"^(bus_station|ferry_terminal|taxi)$"];
    nwr(around:${r},${lat},${lng})[aeroway=aerodrome];
    nwr(around:${r},${lat},${lng})[amenity~"^(hospital|clinic|pharmacy)$"];
  );out center 400;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
  if (!res.ok) throw new Error('Serviço de mapa indisponível');
  const j = await res.json();
  return (j.elements ?? []).map((e: any) => {
    const t = e.tags ?? {};
    const cat: keyof PoiCounts = t.tourism || t.natural ? 'atrativos'
      : /restaurant|cafe|bar/.test(t.amenity ?? '') ? 'restaurantes'
      : /hospital|clinic|pharmacy/.test(t.amenity ?? '') ? 'saude' : 'transporte';
    return { lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, name: t.name ?? POI_LABEL[cat], cat };
  }).filter((p: Poi) => p.lat != null);
}

async function fetchLodging(lat: number, lng: number, km: number) {
  const r = Math.min(km, 30) * 1000;
  const q = `[out:json][timeout:25];nwr(around:${r},${lat},${lng})[tourism~"^(hotel|guest_house|hostel|motel|chalet|apartment|camp_site)$"][name];out center 80;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
  if (!res.ok) throw new Error('Serviço de mapa indisponível');
  const j = await res.json();
  const T: Record<string, string> = { hotel: 'Hotel', guest_house: 'Pousada', hostel: 'Hostel', motel: 'Motel', chalet: 'Chalé', apartment: 'Apartamento', camp_site: 'Camping' };
  return (j.elements ?? []).map((e: any) => ({ name: String(e.tags.name).slice(0, 120), type: T[e.tags.tourism] ?? 'Hospedagem', lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon }))
    .filter((x: any) => x.lat != null);
}

const brl = (v: number | null) => v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function GeomarketingPanel({ destinationId }: Props) {
  const qc = useQueryClient();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const placingRef = useRef<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState(10);
  const [showComp, setShowComp] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [newUf, setNewUf] = useState('SP');
  const [newPct, setNewPct] = useState(20);
  const [pois, setPois] = useState<Poi[] | null>(null);
  const [loadingPoi, setLoadingPoi] = useState(false);
  const [showPoi, setShowPoi] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [findingLodging, setFindingLodging] = useState(false);
  const { user } = useAuth();
  const key = ['geomarketing', destinationId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: dest } = await supabase.from('destinations')
        .select('id,name,uf,ibge_code,latitude,longitude,org_id').eq('id', destinationId).maybeSingle();
      const { data: comps } = await supabase.from('enterprise_competitors')
        .select('id,name,property_type,rating,review_volume,distance_km,location,latitude,longitude,avg_daily_rate,org_id')
        .eq('destination_id', destinationId).limit(100);
      const today = new Date().toISOString().slice(0, 10);
      const { data: events } = dest?.org_id ? await supabase.from('observatory_events')
        .select('id,name,start_date,estimated_attendance').eq('org_id', dest.org_id).gte('start_date', today)
        .order('start_date').limit(10) : { data: [] as any[] };
      const code = dest?.ibge_code ?? '';
      const { data: anac } = code ? await supabase.from('anac_air_connectivity')
        .select('total_passengers_12m,flights_per_week,reference_period_end')
        .in('ibge_code', [code, code.slice(0, 6)]).order('reference_period_end', { ascending: false }).limit(1)
        : { data: [] as any[] };
      const { data: ownRows } = await supabase.from('enterprise_profiles')
        .select('brand_id,average_daily_rate,star_rating,org_id').eq('destination_id', destinationId).limit(1);
      const own = ownRows?.[0] ?? null;
      const { data: units } = own?.brand_id ? await supabase.from('enterprise_profiles')
        .select('id,unit_name,is_flagship,destination_id,destinations(name,uf,latitude,longitude)')
        .eq('brand_id', own.brand_id) : { data: [] as any[] };
      const { data: origins } = await supabase.from('destination_visitor_origins')
        .select('id,uf,share_pct,org_id').eq('destination_id', destinationId);
      const { data: asmt } = await supabase.from('assessments').select('id').eq('destination_id', destinationId)
        .order('created_at', { ascending: false }).limit(1);
      return { assessmentId: asmt?.[0]?.id ?? null, dest, comps: comps ?? [], events: events ?? [], anac: anac?.[0] ?? null, units: units ?? [], own, origins: origins ?? [] };
    },
  });

  const dest = data?.dest;
  const center: [number, number] | null = dest?.latitude ? [dest.latitude, dest.longitude] : null;
  const orgId = data?.own?.org_id ?? data?.comps?.[0]?.org_id ?? dest?.org_id;
  const m = useMemo(() => center ? radiusMetrics(data?.comps ?? [], center, radius) : null, [data, radius, center?.[0], center?.[1]]);
  const ownRate = data?.own?.average_daily_rate ?? null;
  const rateDiff = positionVsArea(ownRate, m?.avgDailyRate ?? null);
  const poiInRadius = useMemo(() => {
    if (!pois || !center) return null;
    const c: PoiCounts = { atrativos: 0, restaurantes: 0, transporte: 0, saude: 0 };
    pois.forEach(p => { if (effectiveDistance({ latitude: p.lat, longitude: p.lng }, center)! <= radius) c[p.cat]++; });
    return c;
  }, [pois, radius, center?.[0], center?.[1]]);
  const insights = useMemo(() => m ? buildGeoInsights({
    count: m.count, avgRating: m.avgRating, rateDiff, radiusKm: radius, pois: poiInRadius, nextEvent: data?.events?.[0] ?? null,
  }) : [], [m, rateDiff, radius, poiInRadius, data]);
  const unlocated = (data?.comps ?? []).filter((c: any) => c.latitude == null);

  const savePos = async (id: string, lat: number, lng: number, source: string) => {
    const { error } = await supabase.from('enterprise_competitors').update({ latitude: lat, longitude: lng, position_source: source }).eq('id', id);
    if (error) toast.error(error.message);
  };

  const locateAll = async () => {
    if (!dest) return;
    setLocating(true);
    let ok = 0;
    for (const c of unlocated.slice(0, 30)) {
      const pos = await geocode(`${c.location ? c.location + ', ' : ''}${c.name}, ${dest.name}, ${dest.uf ?? ''}`)
        ?? (c.location ? await geocode(`${c.location}, ${dest.name}, ${dest.uf ?? ''}`) : null);
      if (pos && center && (effectiveDistance({ latitude: pos[0], longitude: pos[1] }, center) ?? 999) < 150) { await savePos(c.id, pos[0], pos[1], 'geocode'); ok++; }
      await new Promise(r => setTimeout(r, 1100)); // limite de uso do serviço de endereços
    }
    setLocating(false);
    toast.success(tx('{{v0}} de {{v1}} concorrentes localizados. Os demais podem ser marcados no mapa.', { v0: ok, v1: Math.min(30, unlocated.length) }));
    qc.invalidateQueries({ queryKey: key });
  };

  const loadPois = async () => {
    if (!center) return;
    setLoadingPoi(true);
    try { setPois(await fetchPois(center[0], center[1], radius)); }
    catch { toast.error(tx('Não foi possível buscar os atrativos agora. Tente de novo em instantes.')); }
    setLoadingPoi(false);
  };

  const findLodging = async () => {
    if (!center || !orgId || !user) return;
    setFindingLodging(true);
    try {
      const found = await fetchLodging(center[0], center[1], radius);
      const have = new Set((data?.comps ?? []).map((c: any) => c.name.toLowerCase()));
      const rows = found.filter((f: any) => !have.has(f.name.toLowerCase())).map((f: any) => ({
        org_id: orgId, destination_id: destinationId, name: f.name, property_type: f.type, latitude: f.lat, longitude: f.lng,
        position_source: 'osm', source_name: 'OpenStreetMap', is_manual: true, created_by: user.id,
      }));
      if (rows.length) { const { error } = await supabase.from('enterprise_competitors').insert(rows as any); if (error) throw error; }
      toast.success(rows.length ? tx('{{v0}} hospedagens adicionadas como concorrentes.', { v0: rows.length }) : tx('Nenhuma hospedagem nova encontrada no mapa aberto para este raio.'));
      qc.invalidateQueries({ queryKey: key });
    } catch (e: any) { toast.error(tx('Não foi possível buscar hospedagens agora. Tente de novo em instantes.')); }
    setFindingLodging(false);
  };

  useEffect(() => { if (center && !pois && !loadingPoi) loadPois(); /* carrega atrativos automaticamente */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);

  const saveRate = async (id: string, v: string) => {
    const n = v === '' ? null : Number(v);
    if (n != null && (isNaN(n) || n < 0)) return;
    const { error } = await supabase.from('enterprise_competitors').update({ avg_daily_rate: n } as any).eq('id', id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: key });
  };

  const createProject = async (ins: GeoInsight) => {
    if (!dest || !orgId || !data?.assessmentId || !user) { toast.error(tx('É preciso ter um diagnóstico deste destino para criar o projeto.')); return; }
    setCreating(ins.id);
    const { data: trial } = await (supabase.rpc as any)('get_my_trial_state');
    if (trial?.org_trialing) { setCreating(null); toast.error(tx('O módulo de Projetos faz parte dos planos contratados.')); return; }
    const { error } = await supabase.from('projects').insert({
      org_id: orgId, destination_id: destinationId, assessment_id: data.assessmentId, created_by: user.id,
      name: `${ins.title} — ${dest.name}`, description: `${ins.text}\n\nOrigem: leitura do Geomarketing (raio de ${radius} km).`, methodology: 'kanban',
    });
    setCreating(null);
    if (error) toast.error(error.message); else toast.success(tx('Projeto criado. Veja em Projetos.'));
  };

  const addOrigin = async () => {
    if (!orgId) return;
    const { error } = await supabase.from('destination_visitor_origins')
      .upsert({ org_id: orgId, destination_id: destinationId, uf: newUf, share_pct: newPct }, { onConflict: 'org_id,destination_id,uf' });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: key });
  };
  const removeOrigin = async (id: string) => {
    await supabase.from('destination_visitor_origins').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: key });
  };

  useEffect(() => { placingRef.current = placing; if (mapEl.current) mapEl.current.style.cursor = placing ? 'crosshair' : ''; }, [placing]);

  useEffect(() => {
    if (!mapEl.current || !center || mapRef.current) return;
    mapRef.current = L.map(mapEl.current).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    mapRef.current.on('click', async (e: L.LeafletMouseEvent) => {
      const id = placingRef.current; if (!id) return;
      await savePos(id, e.latlng.lat, e.latlng.lng, 'manual');
      setPlacing(null);
      toast.success(tx('Posição salva.'));
      qc.invalidateQueries({ queryKey: key });
    });
    return () => { mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);

  useEffect(() => {
    const g = layerRef.current; if (!g || !center || !dest) return;
    g.clearLayers();
    L.circle(center, { radius: radius * 1000, color: 'hsl(var(--primary))', weight: 2, fillOpacity: 0.05 }).addTo(g);
    L.circleMarker(center, { radius: 9, color: 'hsl(var(--primary))', fillOpacity: 1 }).bindPopup(`<b>${dest.name}</b>`).addTo(g);
    (data?.comps ?? []).forEach((comp: any, i: number) => {
      const real = comp.latitude != null;
      if (!real && comp.distance_km == null) return;
      const pos: [number, number] = real ? [comp.latitude, comp.longitude] : offset(center[0], center[1], comp.distance_km, i);
      if (showHeat && real) L.circle(pos, { radius: 600, stroke: false, color: 'hsl(var(--destructive))', fillOpacity: 0.18 }).addTo(g);
      if (showComp) L.circleMarker(pos, { radius: 6, color: 'hsl(var(--destructive))', dashArray: real ? undefined : '3', fillOpacity: real ? 0.85 : 0.2 })
        .bindPopup(`<b>${comp.name}</b><br/>${comp.property_type ?? ''}${comp.avg_daily_rate ? ' · ' + brl(comp.avg_daily_rate) : ''}<br/>Nota ${comp.rating ?? '—'} (${comp.review_volume ?? 0} avaliações)${real ? '' : '<br/><i>Posição aproximada</i>'}`).addTo(g);
    });
    const b = L.latLng(center).toBounds(radius * 2200);
    const bounds = L.latLngBounds(b.getSouthWest(), b.getNorthEast());
    if (showBrand) (data?.units ?? []).forEach((u: any) => {
      const d = u.destinations; if (!d?.latitude || u.destination_id === destinationId) return;
      L.circleMarker([d.latitude, d.longitude], { radius: 7, color: 'hsl(var(--pillar-oe))', fillOpacity: 0.9 })
        .bindPopup(`<b>${u.unit_name ?? 'Unidade'}</b>${u.is_flagship ? ' (principal)' : ''}<br/>${d.name}/${d.uf}`).addTo(g);
      bounds.extend([d.latitude, d.longitude]);
    });
    if (showOrigin) (data?.origins ?? []).forEach((o: any) => {
      const pos = UF_CAPITALS[o.uf]; if (!pos) return; const pct = Number(o.share_pct);
      L.polyline([pos, center], { color: 'hsl(var(--pillar-ao))', weight: 1 + pct / 8, opacity: 0.7 }).addTo(g);
      L.circleMarker(pos, { radius: 4 + pct / 5, color: 'hsl(var(--pillar-ao))', fillOpacity: 0.6 }).bindPopup(`<b>${o.uf}</b>: ${pct}% dos visitantes`).addTo(g);
      bounds.extend(pos);
    });
    const POI_COLOR: Record<keyof PoiCounts, string> = { atrativos: 'hsl(var(--pillar-ra))', restaurantes: 'hsl(var(--severity-moderado))', transporte: 'hsl(var(--muted-foreground))', saude: 'hsl(var(--severity-bom))' };
    if (showPoi) (pois ?? []).forEach(p => {
      L.circleMarker([p.lat, p.lng], { radius: 3, color: POI_COLOR[p.cat], fillOpacity: 0.9, weight: 1 })
        .bindPopup(`<b>${p.name}</b><br/>${POI_LABEL[p.cat]}`).addTo(g);
    });
    mapRef.current?.fitBounds(bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, radius, showComp, showHeat, showBrand, showOrigin, destinationId, pois, showPoi]);

  const totalOrigin = (data?.origins ?? []).reduce((s: number, o: any) => s + Number(o.share_pct), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {tx("Geomarketing")}</CardTitle>
        <CardDescription>{tx('Oferta e demanda no entorno do seu empreendimento. Sem comparação entre municípios.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!center ? (
          <p className="text-sm text-muted-foreground">{tx('Este destino ainda não tem coordenadas cadastradas.')}</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label>{tx("Raio de influência: {{v0}} km", { v0: radius })}</Label>
                <Slider min={1} max={100} step={1} value={[radius]} onValueChange={v => setRadius(v[0])} />
              </div>
              <div className="flex items-center gap-2"><Switch checked={showComp} onCheckedChange={setShowComp} /><Label>{tx('Concorrentes')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showHeat} onCheckedChange={setShowHeat} /><Label>{tx('Mancha de concentração')}</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showBrand} onCheckedChange={setShowBrand} /><Label>{tx('Unidades da rede')} ({Math.max(0, (data?.units?.length ?? 0) - 1)})</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showOrigin} onCheckedChange={setShowOrigin} /><Label>{tx('Origem dos visitantes')}</Label></div>
              <div className="flex items-center gap-2">
                {pois ? <><Switch checked={showPoi} onCheckedChange={setShowPoi} /><Label>{tx('Atrativos e serviços')} ({pois.length})</Label></>
                  : <Button size="sm" variant="outline" disabled={loadingPoi} onClick={loadPois}><Landmark className="h-4 w-4 mr-1" />{loadingPoi ? tx('Buscando...') : tx('Mostrar atrativos e serviços')}</Button>}
              </div>
            </div>

            <details className="rounded-md border bg-muted/30 p-3 text-sm" open={(data?.comps?.length ?? 0) === 0}>
              <summary className="cursor-pointer font-medium">{tx('Como funciona o Geomarketing')}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>{tx('Mostra, num raio ao redor do destino, quem disputa o mesmo hóspede (concorrentes), o que atrai visitantes (atrativos e serviços) e de onde eles vêm.')}</li>
                <li>{tx('Concorrentes: use o botão abaixo para trazer as hospedagens do mapa aberto, ou a busca de concorrentes do diagnóstico empresarial.')}</li>
                <li>{tx('Origem dos visitantes: informe a porcentagem por estado; as linhas no mapa mostram de onde vem a demanda.')}</li>
                <li>{tx('Com esses dados, os números abaixo do mapa e o quadro "O que o entorno indica" sugerem ações que podem virar projeto.')}</li>
              </ul>
            </details>

            <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
              <p className="flex-1 min-w-[200px]">{(data?.comps?.length ?? 0) === 0 ? tx('Nenhum concorrente cadastrado ainda.') : tx('{{v0}} concorrentes cadastrados.', { v0: data!.comps.length })}</p>
              <Button size="sm" disabled={findingLodging || !orgId} onClick={findLodging}><Search className="h-4 w-4 mr-1" />{findingLodging ? tx('Buscando...') : tx('Buscar hospedagens no raio')}</Button>
            </div>

            {(data?.comps?.length ?? 0) > 0 && (
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{tx('Posição dos concorrentes')}: {(data!.comps.length - unlocated.length)} {tx('de')} {data!.comps.length} {tx('no lugar real')}</p>
                  {unlocated.length > 0 && <Button size="sm" variant="outline" disabled={locating} onClick={locateAll}><Search className="h-4 w-4 mr-1" />{locating ? tx('Localizando...') : tx('Localizar pelo endereço')}</Button>}
                </div>
                {placing && <p className="text-primary">{tx('Clique no mapa onde fica o concorrente.')} <button className="underline" onClick={() => setPlacing(null)}>{tx('Cancelar')}</button></p>}
                <div className="flex flex-wrap gap-1">
                  {data!.comps.map((c: any) => (
                    <Badge key={c.id} variant={c.latitude != null ? 'secondary' : 'outline'} className="cursor-pointer" onClick={() => setPlacing(c.id)} title={tx('Marcar no mapa')}>
                      <Crosshair className="h-3 w-3 mr-1" />{c.name}
                    </Badge>
                  ))}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">{tx('Informar a diária média dos concorrentes')}</summary>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {data!.comps.map((c: any) => (
                      <label key={c.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{c.name}</span>
                        <input type="number" min={0} defaultValue={c.avg_daily_rate ?? ''} placeholder="R$" aria-label={tx('Diária média de {{v0}}', { v0: c.name })}
                          className="h-8 w-24 rounded-md border bg-background px-2" onBlur={e => { if (e.target.value !== String(c.avg_daily_rate ?? '')) saveRate(c.id, e.target.value); }} />
                      </label>
                    ))}
                  </div>
                </details>
                <p className="text-xs text-muted-foreground">{tx('Pontos tracejados estão em posição aproximada. Clique num nome e depois no mapa para ajustar.')}</p>
              </div>
            )}

            <div className="rounded-md border p-3 space-y-2 text-sm">
              <p className="font-medium">{tx("Origem dos visitantes (por estado)")} {totalOrigin > 0 && <span className="text-muted-foreground font-normal">· {tx('total')} {totalOrigin}%</span>}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md border bg-background px-2" value={newUf} onChange={e => setNewUf(e.target.value)} aria-label={tx('Estado de origem')}>
                  {Object.keys(UF_CAPITALS).map(uf => <option key={uf}>{uf}</option>)}
                </select>
                <input type="number" min={1} max={100} className="h-9 w-20 rounded-md border bg-background px-2" value={newPct} onChange={e => setNewPct(Number(e.target.value))} aria-label={tx('Percentual')} />
                <span>%</span>
                <Button size="sm" onClick={addOrigin}>{tx('Adicionar')}</Button>
                {(data?.origins ?? []).map((o: any) => (
                  <Badge key={o.id} variant="secondary" className="cursor-pointer" onClick={() => removeOrigin(o.id)}>{o.uf} {Number(o.share_pct)}% ✕</Badge>
                ))}
              </div>
              {totalOrigin > 100 && <p className="text-xs text-destructive">{tx('A soma passa de 100%.')}</p>}
              <p className="text-xs text-muted-foreground">{tx('Fica salvo para toda a equipe.')}</p>
            </div>

            <div ref={mapEl} className="h-[420px] w-full rounded-md border z-0" />

            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{tx('Concorrentes no raio')}</p>
                <p className="text-2xl font-semibold">{m?.count ?? 0}</p>
                <p className="text-xs text-muted-foreground">{(m?.densityPer100Km2 ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {tx('a cada 100 km²')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{tx('Nota média no raio')}</p>
                <p className="text-2xl font-semibold">{m?.avgRating != null ? m.avgRating.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}</p>
                <p className="text-xs text-muted-foreground">{tx('das avaliações online dos concorrentes')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{tx('Diária média no raio')}</p>
                <p className="text-2xl font-semibold">{brl(m?.avgDailyRate ?? null)}</p>
                <p className="text-xs text-muted-foreground">
                  {rateDiff == null ? tx('Informe a diária dos concorrentes e a sua para comparar.')
                    : rateDiff === 0 ? tx('Sua diária está na média do entorno.')
                    : tx('Sua diária ({{v0}}) está {{v1}}% {{v2}} da média.', { v0: brl(ownRate), v1: Math.abs(rateDiff), v2: rateDiff > 0 ? tx('acima') : tx('abaixo') })}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">{tx("Demanda aérea (ANAC, 12 meses)")}</p>
                <p className="text-2xl font-semibold">{data?.anac ? Number(data.anac.total_passengers_12m ?? 0).toLocaleString('pt-BR') : '—'}</p>
                <p className="text-xs text-muted-foreground">{data?.anac ? `${data.anac.flights_per_week ?? 0} voos/semana` : tx('Sem aeroporto no município')}</p>
              </div>
            </div>
            {poiInRadius && (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
                {(Object.keys(POI_LABEL) as (keyof PoiCounts)[]).map(k => (
                  <div key={k} className="rounded-md border p-3"><p className="text-muted-foreground">{tx(POI_LABEL[k])} {tx('no raio')}</p><p className="text-2xl font-semibold">{poiInRadius[k]}</p></div>
                ))}
                <p className="col-span-full text-xs text-muted-foreground">{tx('Dados abertos do OpenStreetMap, até 15 km. Podem estar incompletos em cidades pequenas.')}</p>
              </div>
            )}

            <div className="rounded-md border p-3 space-y-3 text-sm">
              <p className="font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />{tx('O que o entorno indica')}</p>
              {insights.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx('Nenhum ponto de atenção com os dados atuais. Mostre os atrativos e informe as diárias para leituras mais completas.')}</p>
              ) : insights.map(ins => (
                <div key={ins.id} className="flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="font-medium">{tx(ins.title)}</p><p className="text-muted-foreground">{ins.text}</p></div>
                  <Button size="sm" variant="outline" disabled={creating === ins.id} onClick={() => createProject(ins)} className="shrink-0">
                    <FolderPlus className="h-4 w-4 mr-1" />{tx('Virar projeto')}
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-md border p-3 text-sm">
              <p className="text-muted-foreground">{tx("Próximos eventos (Observatório)")}</p>
              {data?.events?.length ? data.events.slice(0, 4).map((e: any) => (
                <p key={e.id} className="text-xs">{new Date(e.start_date).toLocaleDateString(getIntlLocale())} · {e.name}
                  {e.estimated_attendance ? <Badge variant="secondary" className="ml-1">{e.estimated_attendance.toLocaleString('pt-BR')}</Badge> : null}</p>
              )) : <p className="text-xs text-muted-foreground">{tx('Nenhum evento futuro cadastrado.')}</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

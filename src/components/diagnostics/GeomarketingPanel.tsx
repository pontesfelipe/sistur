import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface Props { destinationId: string }

// Capitais por UF (coordenadas aproximadas) para a camada de origem da demanda.
const UF_CAPITALS: Record<string, [number, number]> = {
  AC:[-9.97,-67.81],AL:[-9.66,-35.73],AP:[0.03,-51.07],AM:[-3.12,-60.02],BA:[-12.97,-38.5],CE:[-3.73,-38.52],
  DF:[-15.79,-47.88],ES:[-20.32,-40.34],GO:[-16.68,-49.25],MA:[-2.53,-44.3],MT:[-15.6,-56.1],MS:[-20.44,-54.65],
  MG:[-19.92,-43.94],PA:[-1.46,-48.5],PB:[-7.12,-34.86],PR:[-25.43,-49.27],PE:[-8.05,-34.9],PI:[-5.09,-42.8],
  RJ:[-22.91,-43.17],RN:[-5.79,-35.21],RS:[-30.03,-51.23],RO:[-8.76,-63.9],RR:[2.82,-60.67],SC:[-27.6,-48.55],
  SP:[-23.55,-46.63],SE:[-10.91,-37.07],TO:[-10.18,-48.33],
};

// Posição aproximada: concorrentes só têm distância; distribuímos em ângulos determinísticos.
function offset(lat: number, lng: number, km: number, i: number) {
  const ang = (i * 137.5 * Math.PI) / 180;
  const dLat = (km / 111) * Math.cos(ang);
  const dLng = (km / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(ang);
  return [lat + dLat, lng + dLng] as [number, number];
}

export function GeomarketingPanel({ destinationId }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [radius, setRadius] = useState(10);
  const [showComp, setShowComp] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const originKey = `sistur-geo-origin-${destinationId}`;
  const [origins, setOrigins] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(originKey) || '{}'); } catch { return {}; }
  });
  const [newUf, setNewUf] = useState('SP');
  const [newPct, setNewPct] = useState(20);
  const saveOrigins = (o: Record<string, number>) => { setOrigins(o); localStorage.setItem(originKey, JSON.stringify(o)); };

  const { data } = useQuery({
    queryKey: ['geomarketing', destinationId],
    queryFn: async () => {
      const { data: dest } = await supabase.from('destinations')
        .select('id,name,uf,ibge_code,latitude,longitude,org_id').eq('id', destinationId).maybeSingle();
      const { data: comps } = await supabase.from('enterprise_competitors')
        .select('id,name,property_type,rating,review_volume,distance_km').eq('destination_id', destinationId).limit(100);
      const today = new Date().toISOString().slice(0, 10);
      const { data: events } = dest?.org_id ? await supabase.from('observatory_events')
        .select('id,name,start_date,estimated_attendance').eq('org_id', dest.org_id).gte('start_date', today)
        .order('start_date').limit(10) : { data: [] as any[] };
      const code = dest?.ibge_code ?? '';
      const { data: anac } = code ? await supabase.from('anac_air_connectivity')
        .select('total_passengers_12m,flights_per_week,airport_icao_codes,reference_period_end')
        .in('ibge_code', [code, code.slice(0, 6)]).order('reference_period_end', { ascending: false }).limit(1)
        : { data: [] as any[] };
      // Rede/marca: unidades da mesma marca do empreendimento deste destino.
      const { data: own } = await supabase.from('enterprise_profiles')
        .select('brand_id').eq('destination_id', destinationId).not('brand_id', 'is', null).limit(1);
      const brandId = own?.[0]?.brand_id;
      const { data: units } = brandId ? await supabase.from('enterprise_profiles')
        .select('id,unit_name,is_flagship,destination_id,destinations(name,uf,latitude,longitude)')
        .eq('brand_id', brandId) : { data: [] as any[] };
      return { dest, comps: comps ?? [], events: events ?? [], anac: anac?.[0] ?? null, units: units ?? [] };
    },
  });

  const dest = data?.dest;
  const inRadius = useMemo(() => (data?.comps ?? []).filter((c: any) => (c.distance_km ?? 0) <= radius), [data, radius]);
  const supply = inRadius.reduce((s: number, c: any) => s + (c.review_volume ?? 1), 0);
  const demand = (data?.anac?.total_passengers_12m ?? 0) + (data?.events ?? []).reduce((s: number, e: any) => s + (e.estimated_attendance ?? 0), 0);

  useEffect(() => {
    if (!mapEl.current || !dest?.latitude || mapRef.current) return;
    mapRef.current = L.map(mapEl.current).setView([dest.latitude, dest.longitude], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [dest?.latitude, dest?.longitude]);

  useEffect(() => {
    const g = layerRef.current; if (!g || !dest?.latitude) return;
    g.clearLayers();
    const c: [number, number] = [dest.latitude, dest.longitude];
    L.circle(c, { radius: radius * 1000, color: 'hsl(var(--primary))', weight: 2, fillOpacity: 0.05 }).addTo(g);
    L.circleMarker(c, { radius: 9, color: 'hsl(var(--primary))', fillOpacity: 1 }).bindPopup(`<b>${dest.name}</b>`).addTo(g);
    (data?.comps ?? []).forEach((comp: any, i: number) => {
      if (comp.distance_km == null) return;
      const pos = offset(c[0], c[1], comp.distance_km, i);
      if (showHeat) L.circle(pos, { radius: 400 + (comp.review_volume ?? 0) * 2, stroke: false, color: 'hsl(var(--destructive))', fillOpacity: 0.15 }).addTo(g);
      if (showComp) L.circleMarker(pos, { radius: 6, color: 'hsl(var(--destructive))', fillOpacity: 0.8 })
        .bindPopup(`<b>${comp.name}</b><br/>${comp.property_type ?? ''} · ${comp.distance_km} km<br/>Nota ${comp.rating ?? '—'} (${comp.review_volume ?? 0} avaliações)`).addTo(g);
    });
    const bounds = L.latLngBounds([L.latLng(c).toBounds(radius * 2200).getNorthEast(), L.latLng(c).toBounds(radius * 2200).getSouthWest()]);
    if (showBrand) (data?.units ?? []).forEach((u: any) => {
      const d = u.destinations; if (!d?.latitude || u.destination_id === destinationId) return;
      const pos: [number, number] = [d.latitude, d.longitude];
      L.circleMarker(pos, { radius: 7, color: 'hsl(var(--pillar-oe))', fillOpacity: 0.9 })
        .bindPopup(`<b>${u.unit_name ?? 'Unidade'}</b>${u.is_flagship ? ' (principal)' : ''}<br/>${d.name}/${d.uf}`).addTo(g);
      bounds.extend(pos);
    });
    if (showOrigin) Object.entries(origins).forEach(([uf, pct]) => {
      const pos = UF_CAPITALS[uf]; if (!pos) return;
      L.polyline([pos, c], { color: 'hsl(var(--pillar-ao))', weight: 1 + pct / 8, opacity: 0.7 }).addTo(g);
      L.circleMarker(pos, { radius: 4 + pct / 5, color: 'hsl(var(--pillar-ao))', fillOpacity: 0.6 })
        .bindPopup(`<b>${uf}</b>: ${pct}% dos visitantes`).addTo(g);
      bounds.extend(pos);
    });
    mapRef.current?.fitBounds(bounds);
  }, [data, dest, radius, showComp, showHeat, showBrand, showOrigin, origins, destinationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Geomarketing</CardTitle>
        <CardDescription>Oferta e demanda no entorno de {dest?.name ?? 'destino'}. Posições de concorrentes são aproximadas pela distância informada. Sem comparação entre municípios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!dest?.latitude ? (
          <p className="text-sm text-muted-foreground">Este destino ainda não tem coordenadas cadastradas.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label>Raio de influência: {radius} km</Label>
                <Slider min={1} max={100} step={1} value={[radius]} onValueChange={v => setRadius(v[0])} />
              </div>
              <div className="flex items-center gap-2"><Switch checked={showComp} onCheckedChange={setShowComp} /><Label>Concorrentes</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showHeat} onCheckedChange={setShowHeat} /><Label>Mapa de calor da oferta</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showBrand} onCheckedChange={setShowBrand} /><Label>Unidades da rede ({Math.max(0, (data?.units?.length ?? 0) - 1)})</Label></div>
              <div className="flex items-center gap-2"><Switch checked={showOrigin} onCheckedChange={setShowOrigin} /><Label>Origem dos visitantes</Label></div>
            </div>
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <p className="font-medium">Origem dos visitantes (por estado)</p>
              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md border bg-background px-2" value={newUf} onChange={e => setNewUf(e.target.value)} aria-label="Estado de origem">
                  {Object.keys(UF_CAPITALS).map(uf => <option key={uf}>{uf}</option>)}
                </select>
                <input type="number" min={1} max={100} className="h-9 w-20 rounded-md border bg-background px-2" value={newPct} onChange={e => setNewPct(Number(e.target.value))} aria-label="Percentual" />
                <span>%</span>
                <button type="button" className="h-9 rounded-md bg-primary px-3 text-primary-foreground" onClick={() => saveOrigins({ ...origins, [newUf]: newPct })}>Adicionar</button>
                {Object.entries(origins).map(([uf, pct]) => (
                  <Badge key={uf} variant="secondary" className="cursor-pointer" onClick={() => { const o = { ...origins }; delete o[uf]; saveOrigins(o); }}>{uf} {pct}% ✕</Badge>
                ))}
              </div>
            </div>
            <div ref={mapEl} className="h-[420px] w-full rounded-md border z-0" />
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Concorrentes no raio</p>
                <p className="text-2xl font-semibold">{inRadius.length}</p>
                <p className="text-xs text-muted-foreground">{supply.toLocaleString('pt-BR')} avaliações somadas</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Demanda aérea (ANAC, 12 meses)</p>
                <p className="text-2xl font-semibold">{data?.anac ? Number(data.anac.total_passengers_12m ?? 0).toLocaleString('pt-BR') : '—'}</p>
                <p className="text-xs text-muted-foreground">{data?.anac ? `${data.anac.flights_per_week ?? 0} voos/semana` : 'Sem aeroporto no município'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Próximos eventos (Observatório)</p>
                {data?.events?.length ? data.events.slice(0, 4).map((e: any) => (
                  <p key={e.id} className="text-xs">{new Date(e.start_date).toLocaleDateString('pt-BR')} · {e.name}
                    {e.estimated_attendance ? <Badge variant="secondary" className="ml-1">{e.estimated_attendance.toLocaleString('pt-BR')}</Badge> : null}</p>
                )) : <p className="text-xs text-muted-foreground">Nenhum evento futuro cadastrado.</p>}
              </div>
            </div>
            {demand > 0 && supply > 0 && (
              <p className="text-sm text-muted-foreground">Relação demanda/oferta no raio: <b>{Math.round(demand / supply).toLocaleString('pt-BR')}</b> visitantes por avaliação de concorrente — quanto maior, mais espaço de mercado.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

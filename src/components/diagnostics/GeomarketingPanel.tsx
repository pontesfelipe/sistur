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
      return { dest, comps: comps ?? [], events: events ?? [], anac: anac?.[0] ?? null };
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
    mapRef.current?.fitBounds(L.latLng(c).toBounds(radius * 2200));
  }, [data, dest, radius, showComp, showHeat]);

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

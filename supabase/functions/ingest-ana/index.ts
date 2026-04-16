import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IQA GeoJSON (~680 KB total — fits in edge function memory)
const IQA_DOWNLOAD_URL =
  'https://hub.arcgis.com/api/v3/datasets/bd6ea680e9024ec3b644817e4df344d8_16/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface IQAStation {
  mediqa: number;
  corpo_dagua: string;
  estacao: string;
  distancia_km: number;
}

async function queryIQANearby(
  lat: number, lon: number, uf: string | null,
): Promise<{ avg_iqa: number | null; stations_count: number; closest: IQAStation | null }> {
  try {
    const resp = await fetch(IQA_DOWNLOAD_URL, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const features = data?.features || [];

    const RADIUS_KM = 50;
    const nearby: IQAStation[] = [];

    for (const f of features) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || !p.MEDIQA) continue;
      // Pre-filter by UF if available
      if (uf && p.SGUF && p.SGUF !== uf) continue;

      const dist = haversineKm(lat, lon, coords[1], coords[0]);
      if (dist <= RADIUS_KM) {
        nearby.push({
          mediqa: p.MEDIQA,
          corpo_dagua: p.CORPODAGUA || '',
          estacao: p.CDESTACAO || '',
          distancia_km: Math.round(dist * 10) / 10,
        });
      }
    }

    if (nearby.length === 0) return { avg_iqa: null, stations_count: 0, closest: null };

    nearby.sort((a, b) => a.distancia_km - b.distancia_km);
    const avg = nearby.reduce((s, st) => s + st.mediqa, 0) / nearby.length;

    return { avg_iqa: Math.round(avg * 100) / 100, stations_count: nearby.length, closest: nearby[0] };
  } catch (e) {
    console.error('[ANA/IQA]', e instanceof Error ? e.message : e);
    return { avg_iqa: null, stations_count: 0, closest: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* ok */ }

    const { ibge_code, org_id } = body;
    if (!ibge_code || !org_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code and org_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`=== ANA === ibge=${ibge_code}`);

    const { data: dest } = await supabase
      .from('destinations')
      .select('latitude, longitude, uf, name')
      .eq('ibge_code', ibge_code).eq('org_id', org_id)
      .limit(1).maybeSingle();

    const destName = dest?.name ?? ibge_code;
    let upsertCount = 0;

    // IQA query
    const iqa = dest?.latitude && dest?.longitude
      ? await queryIQANearby(dest.latitude, dest.longitude, dest.uf)
      : { avg_iqa: null, stations_count: 0, closest: null };

    if (iqa.avg_iqa != null) {
      const info = iqa.closest
        ? `Estação mais próxima: ${iqa.closest.estacao} (${iqa.closest.corpo_dagua}) a ${iqa.closest.distancia_km} km.`
        : '';
      const { error } = await supabase
        .from('external_indicator_values')
        .upsert({
          indicator_code: 'ana_iqa',
          municipality_ibge_code: ibge_code,
          source_code: 'ANA',
          raw_value: iqa.avg_iqa,
          reference_year: 2021,
          collection_method: 'BATCH' as const,
          confidence_level: 4,
          validated: false,
          org_id,
          notes: `IQA médio: ${iqa.avg_iqa} (${iqa.stations_count} estações, raio 50 km). ${info} Escala 0-100.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      if (!error) upsertCount++;
    }

    // Update source metadata
    await supabase.from('external_data_sources').upsert({
      code: 'ANA', name: 'ANA — Agência Nacional de Águas',
      description: `Qualidade da água (IQA). Atualizado: ${new Date().toISOString()}.`,
      update_frequency: 'ANUAL', trust_level_default: 4, active: true,
    }, { onConflict: 'code' });

    console.log(`=== ANA Done === ${upsertCount} para ${destName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ANA: ${upsertCount} indicadores para ${destName}.`,
        results: {
          iqa: { status: iqa.avg_iqa != null ? 'success' : 'unavailable', avg_iqa: iqa.avg_iqa, stations_count: iqa.stations_count },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[ANA] Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

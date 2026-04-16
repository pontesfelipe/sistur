import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── ANA ArcGIS FeatureServer endpoints ─────────────────────────────

const IQA_FEATURE_SERVER =
  'https://www.snirh.gov.br/arcgis/rest/services/SPR/Indicadores_Qualidade_v31072023/FeatureServer/16/query';

// Atlas Esgotos — download filtered GeoJSON (smaller dataset, by IBGE code)
const ATLAS_ESGOTOS_DOWNLOAD =
  'https://hub.arcgis.com/api/v3/datasets/15bbcb5d083d439a816eb4090dbd4bbe_0/downloads/data';

// ─── Helpers ────────────────────────────────────────────────────────

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

// ─── IQA via FeatureServer (spatial query) ──────────────────────────

interface IQAStation {
  mediqa: number;
  corpo_dagua: string;
  estacao: string;
  distancia_km: number;
}

async function queryIQANearby(
  lat: number,
  lon: number,
): Promise<{ avg_iqa: number | null; stations_count: number; closest: IQAStation | null }> {
  // Build a ~50 km bounding box envelope (approx 0.45° at mid-latitudes)
  const OFFSET = 0.5;
  const envelope = `${lon - OFFSET},${lat - OFFSET},${lon + OFFSET},${lat + OFFSET}`;

  const params = new URLSearchParams({
    where: '1=1',
    geometry: envelope,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'CDESTACAO,MEDIQA,NUIQA,CORPODAGUA,LATITUDE,LONGITUDE',
    f: 'json',
    resultRecordCount: '200',
  });

  const resp = await fetch(`${IQA_FEATURE_SERVER}?${params}`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    console.error(`[ANA/IQA] FeatureServer HTTP ${resp.status}`);
    return { avg_iqa: null, stations_count: 0, closest: null };
  }

  const data = await resp.json();
  if (data.error) {
    console.error('[ANA/IQA] FeatureServer error:', JSON.stringify(data.error));
    return { avg_iqa: null, stations_count: 0, closest: null };
  }

  const features = data.features || [];
  console.log(`[ANA/IQA] FeatureServer returned ${features.length} features in envelope`);

  // Refine by actual distance (50 km Haversine)
  const RADIUS_KM = 50;
  const nearby: IQAStation[] = [];

  for (const f of features) {
    const a = f.attributes || {};
    if (!a.MEDIQA || !a.LATITUDE || !a.LONGITUDE) continue;

    const dist = haversineKm(lat, lon, a.LATITUDE, a.LONGITUDE);
    if (dist <= RADIUS_KM) {
      nearby.push({
        mediqa: a.MEDIQA,
        corpo_dagua: a.CORPODAGUA || '',
        estacao: a.CDESTACAO || '',
        distancia_km: Math.round(dist * 10) / 10,
      });
    }
  }

  if (nearby.length === 0) {
    return { avg_iqa: null, stations_count: 0, closest: null };
  }

  nearby.sort((a, b) => a.distancia_km - b.distancia_km);
  const avg = nearby.reduce((s, st) => s + st.mediqa, 0) / nearby.length;

  return {
    avg_iqa: Math.round(avg * 100) / 100,
    stations_count: nearby.length,
    closest: nearby[0],
  };
}

// ─── Atlas Esgotos (download filtered JSON) ─────────────────────────

interface EsgotoResult {
  resultado_fosforo: string;
  municipio: string;
}

async function queryAtlasEsgotos(ibgeCode: string): Promise<EsgotoResult | null> {
  // Use the download API with a WHERE clause to filter by municipality code
  const url = `${ATLAS_ESGOTOS_DOWNLOAD}?format=geojson&spatialRefId=4326&where=MUN_CD_MUN%3D%27${ibgeCode}%27`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      console.warn(`[ANA/Atlas] HTTP ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const features = data?.features || [];

    if (features.length === 0) {
      // Try with 7-digit code if we sent 6
      if (ibgeCode.length === 6) {
        return null; // Already tried
      }
      return null;
    }

    const props = features[0].properties || {};
    return {
      resultado_fosforo: props.MUN_RESUL1 || props.MUN_RESU_1 || 'Não avaliado',
      municipio: props.MUN_NM_MUN || '',
    };
  } catch (e) {
    console.error('[ANA/Atlas] Error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const { ibge_code, org_id } = body;

    if (!ibge_code || !org_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code and org_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`=== ANA Ingestion === ibge=${ibge_code}, org=${org_id}`);

    // Get destination coordinates
    const { data: dest } = await supabaseClient
      .from('destinations')
      .select('latitude, longitude, uf, name')
      .eq('ibge_code', ibge_code)
      .eq('org_id', org_id)
      .limit(1)
      .maybeSingle();

    const destName = dest?.name ?? ibge_code;

    // Fetch IQA and Atlas Esgotos in parallel
    const [iqaResult, esgotoResult] = await Promise.allSettled([
      dest?.latitude && dest?.longitude
        ? queryIQANearby(dest.latitude, dest.longitude)
        : Promise.resolve({ avg_iqa: null, stations_count: 0, closest: null }),
      queryAtlasEsgotos(ibge_code),
    ]);

    const iqa = iqaResult.status === 'fulfilled' ? iqaResult.value : null;
    const esgoto = esgotoResult.status === 'fulfilled' ? esgotoResult.value : null;

    let upsertCount = 0;

    // ── Upsert IQA ──
    if (iqa?.avg_iqa != null) {
      const closestInfo = iqa.closest
        ? `Estação mais próxima: ${iqa.closest.estacao} (${iqa.closest.corpo_dagua}) a ${iqa.closest.distancia_km} km.`
        : '';

      const { error: e1 } = await supabaseClient
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
          notes: `IQA médio: ${iqa.avg_iqa} (${iqa.stations_count} estações em raio de 50 km). ${closestInfo} Escala: 0-100.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      if (!e1) upsertCount++;
      else console.error('[ANA/IQA] Upsert error:', e1.message);
    }

    // ── Upsert Atlas Esgotos ──
    if (esgoto && esgoto.resultado_fosforo !== 'Não avaliado') {
      const esgotoValue = esgoto.resultado_fosforo === 'Sim' ? 1 : 0;

      const { error: e2 } = await supabaseClient
        .from('external_indicator_values')
        .upsert({
          indicator_code: 'ana_atlas_esgotos',
          municipality_ibge_code: ibge_code,
          source_code: 'ANA',
          raw_value: esgotoValue,
          raw_value_text: esgoto.resultado_fosforo,
          reference_year: 2035,
          collection_method: 'BATCH' as const,
          confidence_level: 5,
          validated: false,
          org_id,
          notes: `Atlas Esgotos ANA — Fósforo (Planejamento 2035). Necessita atenção: ${esgoto.resultado_fosforo}. Município: ${esgoto.municipio}.`,
        }, { onConflict: 'org_id,municipality_ibge_code,indicator_code' });
      if (!e2) upsertCount++;
      else console.error('[ANA/Atlas] Upsert error:', e2.message);
    }

    // Update data source metadata
    await supabaseClient
      .from('external_data_sources')
      .upsert({
        code: 'ANA',
        name: 'ANA — Agência Nacional de Águas',
        description: `Qualidade da água (IQA) e saneamento (Atlas Esgotos). Atualizado: ${new Date().toISOString()}.`,
        update_frequency: 'ANUAL',
        trust_level_default: 4,
        active: true,
      }, { onConflict: 'code' });

    console.log(`=== ANA Done === ${upsertCount} indicadores para ${destName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ANA: ${upsertCount} indicadores atualizados para ${destName}.`,
        results: {
          iqa: iqa
            ? { status: iqa.avg_iqa != null ? 'success' : 'unavailable', avg_iqa: iqa.avg_iqa, stations_count: iqa.stations_count }
            : { status: 'error' },
          atlas_esgotos: esgoto
            ? { status: 'success', resultado: esgoto.resultado_fosforo }
            : { status: 'unavailable' },
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

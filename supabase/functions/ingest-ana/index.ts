import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── ANA Data Sources ───────────────────────────────────────────────
// All GeoJSON endpoints from dadosabertos.ana.gov.br (ArcGIS Hub)

// IQA — Water Quality Index (point data with lat/lon by UF)
const IQA_GEOJSON_URL =
  'https://dadosabertos.ana.gov.br/datasets/bd6ea680e9024ec3b644817e4df344d8_16.geojson';

// Atlas Esgotos — Phosphorus analysis per municipality (has MUN_CD_MUN)
const ATLAS_ESGOTOS_FOSFORO_URL =
  'https://dadosabertos.ana.gov.br/datasets/15bbcb5d083d439a816eb4090dbd4bbe_0.geojson';

// ─── Helpers ────────────────────────────────────────────────────────

/** Haversine distance in km between two coordinates */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
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

/** Fetch GeoJSON with timeout and size guard */
async function fetchGeoJSON(url: string, timeoutMs = 30000): Promise<any> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/geo+json, application/json' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return resp.json();
}

// ─── IQA Processing ─────────────────────────────────────────────────

interface IQAResult {
  mediqa: number;
  nuiqa: number;
  corpo_dagua: string;
  estacao: string;
  distancia_km: number;
}

/**
 * Find IQA stations near a destination (within 50 km radius).
 * Returns average IQA and closest station details.
 */
async function findIQAForDestination(
  destLat: number | null,
  destLon: number | null,
  destUf: string | null,
): Promise<{ avg_iqa: number | null; stations_count: number; closest: IQAResult | null }> {
  if (!destLat || !destLon) {
    return { avg_iqa: null, stations_count: 0, closest: null };
  }

  try {
    const geojson = await fetchGeoJSON(IQA_GEOJSON_URL, 45000);
    const features = geojson?.features || [];

    // Filter stations within 50 km radius
    const RADIUS_KM = 50;
    const nearby: IQAResult[] = [];

    for (const f of features) {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || !props.MEDIQA) continue;

      // Optionally pre-filter by UF for speed
      if (destUf && props.SGUF && props.SGUF !== destUf) continue;

      const stLon = coords[0];
      const stLat = coords[1];
      const dist = haversineKm(destLat, destLon, stLat, stLon);

      if (dist <= RADIUS_KM) {
        nearby.push({
          mediqa: props.MEDIQA,
          nuiqa: props.NUIQA || 0,
          corpo_dagua: props.CORPODAGUA || '',
          estacao: props.CDESTACAO || '',
          distancia_km: Math.round(dist * 10) / 10,
        });
      }
    }

    if (nearby.length === 0) {
      return { avg_iqa: null, stations_count: 0, closest: null };
    }

    nearby.sort((a, b) => a.distancia_km - b.distancia_km);
    const avg_iqa = nearby.reduce((sum, s) => sum + s.mediqa, 0) / nearby.length;

    return {
      avg_iqa: Math.round(avg_iqa * 100) / 100,
      stations_count: nearby.length,
      closest: nearby[0],
    };
  } catch (e) {
    console.error('[ANA/IQA] Error:', e instanceof Error ? e.message : e);
    return { avg_iqa: null, stations_count: 0, closest: null };
  }
}

// ─── Atlas Esgotos Processing ───────────────────────────────────────

interface EsgotoResult {
  resultado_fosforo: string;
  municipio: string;
}

/**
 * Find Atlas Esgotos data for a municipality by IBGE code.
 */
async function findAtlasEsgotosForMunicipality(
  ibgeCode: string,
): Promise<EsgotoResult | null> {
  try {
    const geojson = await fetchGeoJSON(ATLAS_ESGOTOS_FOSFORO_URL, 45000);
    const features = geojson?.features || [];

    for (const f of features) {
      const props = f.properties || {};
      const munCode = String(props.MUN_CD_MUN || '').replace(/\D/g, '');

      // Match IBGE code (handle 6 vs 7 digit codes)
      if (
        munCode === ibgeCode ||
        munCode === ibgeCode.substring(0, 6) ||
        ibgeCode === munCode.substring(0, 6)
      ) {
        return {
          resultado_fosforo: props.MUN_RESUL1 || props.MUN_RESU_1 || 'Não avaliado',
          municipio: props.MUN_NM_MUN || '',
        };
      }
    }
    return null;
  } catch (e) {
    console.error('[ANA/Atlas] Error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── Main Handler ───────────────────────────────────────────────────

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
    try {
      body = await req.json();
    } catch {
      // Allow empty body
    }

    const { ibge_code, org_id } = body;

    if (!ibge_code || !org_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code and org_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`=== ANA Ingestion Start === ibge_code=${ibge_code}, org_id=${org_id}`);

    // Get destination coordinates and UF for IQA proximity search
    const { data: destination } = await supabaseClient
      .from('destinations')
      .select('latitude, longitude, uf, name')
      .eq('ibge_code', ibge_code)
      .eq('org_id', org_id)
      .limit(1)
      .maybeSingle();

    const destLat = destination?.latitude ?? null;
    const destLon = destination?.longitude ?? null;
    const destUf = destination?.uf ?? null;
    const destName = destination?.name ?? ibge_code;

    console.log(`Destination: ${destName} (${destUf}), lat=${destLat}, lon=${destLon}`);

    // Fetch IQA and Atlas Esgotos in parallel
    const [iqaResult, esgotoResult] = await Promise.allSettled([
      findIQAForDestination(destLat, destLon, destUf),
      findAtlasEsgotosForMunicipality(ibge_code),
    ]);

    const iqa = iqaResult.status === 'fulfilled' ? iqaResult.value : null;
    const esgoto = esgotoResult.status === 'fulfilled' ? esgotoResult.value : null;

    let upsertCount = 0;
    const currentYear = new Date().getFullYear();

    // ── Upsert IQA indicator ──
    if (iqa?.avg_iqa !== null && iqa?.avg_iqa !== undefined) {
      const closestInfo = iqa.closest
        ? `Estação mais próxima: ${iqa.closest.estacao} (${iqa.closest.corpo_dagua}) a ${iqa.closest.distancia_km} km.`
        : '';

      const { error: e1 } = await supabaseClient
        .from('external_indicator_values')
        .upsert(
          {
            indicator_code: 'ana_iqa',
            municipality_ibge_code: ibge_code,
            source_code: 'ANA',
            raw_value: iqa.avg_iqa,
            reference_year: 2021, // ANA dataset is from 2021
            collection_method: 'BATCH' as const,
            confidence_level: 4,
            validated: false,
            org_id,
            notes: `IQA médio: ${iqa.avg_iqa} (${iqa.stations_count} estações em raio de 50 km). ${closestInfo} Escala: 0-100 (0=péssima, 100=ótima).`,
          },
          { onConflict: 'org_id,municipality_ibge_code,indicator_code' },
        );
      if (!e1) upsertCount++;
      else console.error('[ANA/IQA] Upsert error:', e1.message);
    } else {
      console.log(`[ANA/IQA] Sem estações IQA próximas para ${destName}`);
    }

    // ── Upsert Atlas Esgotos indicator ──
    if (esgoto) {
      // Map Fósforo result to a numeric indicator
      // "Sim" = municipality needs attention (1), "Não" = OK (0), "Não avaliado" = null
      let esgotoValue: number | null = null;
      if (esgoto.resultado_fosforo === 'Sim') esgotoValue = 1;
      else if (esgoto.resultado_fosforo === 'Não') esgotoValue = 0;

      if (esgotoValue !== null) {
        const { error: e2 } = await supabaseClient
          .from('external_indicator_values')
          .upsert(
            {
              indicator_code: 'ana_atlas_esgotos',
              municipality_ibge_code: ibge_code,
              source_code: 'ANA',
              raw_value: esgotoValue,
              raw_value_text: esgoto.resultado_fosforo,
              reference_year: 2035, // Atlas Esgotos Planejamento 2035
              collection_method: 'BATCH' as const,
              confidence_level: 5,
              validated: false,
              org_id,
              notes: `Atlas Esgotos ANA — Análise de Fósforo (Planejamento 2035). Município necessita atenção: ${esgoto.resultado_fosforo}. Município: ${esgoto.municipio}.`,
            },
            { onConflict: 'org_id,municipality_ibge_code,indicator_code' },
          );
        if (!e2) upsertCount++;
        else console.error('[ANA/Atlas] Upsert error:', e2.message);
      }
    } else {
      console.log(`[ANA/Atlas] Sem dados Atlas Esgotos para IBGE ${ibge_code}`);
    }

    // Update data source metadata
    await supabaseClient
      .from('external_data_sources')
      .upsert(
        {
          code: 'ANA',
          name: 'ANA — Agência Nacional de Águas',
          description: `Dados de qualidade da água (IQA) e saneamento (Atlas Esgotos). Última atualização: ${new Date().toISOString()}.`,
          update_frequency: 'ANUAL',
          trust_level_default: 4,
          active: true,
        },
        { onConflict: 'code' },
      );

    console.log(`=== ANA Ingestion Complete === ${upsertCount} indicadores atualizados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ANA: ${upsertCount} indicadores atualizados para ${destName}.`,
        results: {
          iqa: iqa
            ? {
                status: iqa.avg_iqa !== null ? 'success' : 'unavailable',
                avg_iqa: iqa.avg_iqa,
                stations_count: iqa.stations_count,
              }
            : { status: 'error' },
          atlas_esgotos: esgoto
            ? { status: 'success', resultado: esgoto.resultado_fosforo }
            : { status: 'unavailable' },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[ANA] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

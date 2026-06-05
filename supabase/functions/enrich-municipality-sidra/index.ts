// enrich-municipality-sidra
// Busca dados socioeconômicos oficiais do IBGE/SIDRA por município (IBGE code)
// e popula `municipal_socioeconomic_context`. Não exige autenticação SIDRA.
// Tabelas usadas:
//  - 6579 (Estimativa de população anual)
//  - 5938 (PIB municipal a preços correntes — variável 37 PIB total, 39 PIB per capita)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, requireAdminOrServiceRole } from "../_shared/auth.ts";

const SIDRA_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados";

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`SIDRA ${r.status}: ${url}`);
  return await r.json();
}

// Retorna { year, value } mais recente para uma tabela/variável/município
async function fetchLatestSidra(table: number, variable: number, ibge: string): Promise<{ year: number; value: number } | null> {
  // Período "last 5" para pegar o mais recente disponível
  const url = `${SIDRA_BASE}/${table}/periodos/-5/variaveis/${variable}?localidades=N6[${ibge}]`;
  try {
    const data = await fetchJson(url) as Array<{ resultados: Array<{ series: Array<{ serie: Record<string, string> }> }> }>;
    const serie = data?.[0]?.resultados?.[0]?.series?.[0]?.serie ?? {};
    const years = Object.keys(serie).map((y) => parseInt(y, 10)).filter((y) => !isNaN(y)).sort((a, b) => b - a);
    for (const y of years) {
      const raw = serie[String(y)];
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return { year: y, value: n };
    }
    return null;
  } catch (e) {
    console.error(`[sidra] falha tabela ${table} var ${variable} ibge ${ibge}:`, (e as Error).message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireAdminOrServiceRole(req);
  if (guard instanceof Response) return guard;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { ibge_code?: string; org_id?: string; all?: boolean } = {};
  try { body = await req.json(); } catch { /* noop */ }

  // Resolve lista de ibge_codes a processar
  let ibgeCodes: string[] = [];
  if (body.ibge_code) {
    ibgeCodes = [body.ibge_code];
  } else if (body.org_id) {
    const { data: d } = await admin.from("destinations").select("ibge_code").eq("org_id", body.org_id).not("ibge_code", "is", null).limit(1);
    if (d?.[0]?.ibge_code) ibgeCodes = [d[0].ibge_code as string];
  } else if (body.all) {
    const { data: d } = await admin.from("destinations").select("ibge_code").not("ibge_code", "is", null);
    ibgeCodes = Array.from(new Set((d ?? []).map((r: any) => r.ibge_code as string)));
  } else {
    return new Response(JSON.stringify({ error: "Forneça ibge_code, org_id ou all=true" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (ibgeCodes.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, message: "Nenhum município com ibge_code" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;
  const results: Array<{ ibge_code: string; year?: number; population?: number; pib_total?: number; pib_per_capita?: number; error?: string }> = [];

  for (const ibge of ibgeCodes) {
    try {
      // Busca em paralelo
      const [pop, pibTotal, pibPC] = await Promise.all([
        fetchLatestSidra(6579, 9324, ibge),   // População estimada
        fetchLatestSidra(5938, 37, ibge),     // PIB total (R$ mil)
        fetchLatestSidra(5938, 39, ibge),     // PIB per capita (R$)
      ]);

      // Define ano de referência: o mais antigo entre os disponíveis (PIB tem lag maior que população)
      const yearCandidates = [pop?.year, pibTotal?.year, pibPC?.year].filter((y): y is number => typeof y === "number");
      if (yearCandidates.length === 0) {
        failed += 1;
        results.push({ ibge_code: ibge, error: "Sem dados SIDRA disponíveis" });
        continue;
      }
      const refYear = Math.min(...yearCandidates);

      const pibTotalBrl = pibTotal ? pibTotal.value * 1000 : null; // tabela 5938 var 37 = R$ mil

      const { error: upErr } = await admin
        .from("municipal_socioeconomic_context")
        .upsert({
          ibge_code: ibge,
          reference_year: refYear,
          population: pop?.value ?? null,
          pib_total_brl: pibTotalBrl,
          pib_per_capita_brl: pibPC?.value ?? null,
          source: "IBGE/SIDRA",
          source_tables: {
            population: { table: 6579, variable: 9324, year: pop?.year ?? null },
            pib_total: { table: 5938, variable: 37, year: pibTotal?.year ?? null, unit: "R$ mil" },
            pib_per_capita: { table: 5938, variable: 39, year: pibPC?.year ?? null, unit: "R$" },
          },
          fetched_at: new Date().toISOString(),
        }, { onConflict: "ibge_code,reference_year" });

      if (upErr) { failed += 1; results.push({ ibge_code: ibge, error: upErr.message }); }
      else {
        processed += 1;
        results.push({
          ibge_code: ibge,
          year: refYear,
          population: pop?.value,
          pib_total: pibTotalBrl ?? undefined,
          pib_per_capita: pibPC?.value,
        });
      }
    } catch (e) {
      failed += 1;
      results.push({ ibge_code: ibge, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, failed, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
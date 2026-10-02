import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SICONFI — API pública do Tesouro Nacional (RREO Anexo 02: despesa por função)
const SICONFI_BASE = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo';

// Funções orçamentárias de interesse (identificadas pelo nome em `conta`)
const FUNCOES: Record<string, string> = {
  'TURISMO': 'turismo',
  'CULTURA': 'cultura',
  'SANEAMENTO': 'saneamento',
};

interface RreoRow {
  cod_conta?: string;
  conta?: string;
  coluna?: string;
  valor?: number;
}

async function fetchFuncaoSpending(
  ibgeCode: string, year: number,
): Promise<Map<string, { liquidada: number; empenhada: number }>> {
  const url = `${SICONFI_BASE}?an_exercicio=${year}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2002&id_ente=${ibgeCode}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new Error(`SICONFI HTTP ${resp.status}`);
  const data = await resp.json();
  const rows: RreoRow[] = data?.items || [];

  const result = new Map<string, { liquidada: number; empenhada: number }>();
  for (const row of rows) {
    const conta = (row.conta || '').trim().toUpperCase();
    const funcao = FUNCOES[conta];
    if (!funcao) continue;
    const coluna = (row.coluna || '').toUpperCase();
    const entry = result.get(funcao) ?? { liquidada: 0, empenhada: 0 };
    if (coluna.includes('LIQUIDADAS')) entry.liquidada += Number(row.valor || 0);
    else if (coluna.includes('EMPENHADAS')) entry.empenhada += Number(row.valor || 0);
    result.set(funcao, entry);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authResult = await requireAdminOrServiceRole(req);
  if (authResult instanceof Response) return authResult;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* ok */ }

    const { ibge_code } = body;
    if (!ibge_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'ibge_code required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Tenta o ano corrente e o anterior (FINBRA/RREO podem ainda não ter o ano atual)
    const currentYear = new Date().getFullYear();
    let upsertCount = 0;
    let usedYear: number | null = null;
    const results: Record<string, unknown> = {};

    for (const year of [currentYear - 1, currentYear - 2]) {
      try {
        const spending = await fetchFuncaoSpending(ibge_code, year);
        if (spending.size === 0) continue;
        usedYear = year;

        for (const [funcao, values] of spending) {
          const { error } = await supabase
            .from('siconfi_municipal_spending')
            .upsert({
              ibge_code,
              reference_year: year,
              funcao,
              despesa_realizada: values.liquidada,
              despesa_empenhada: values.empenhada || null,
            }, { onConflict: 'ibge_code,reference_year,funcao' });
          if (!error) upsertCount++;
          results[funcao] = { year, liquidada: values.liquidada, empenhada: values.empenhada };
        }
        break;
      } catch (e) {
        console.error(`[SICONFI] ano ${year}:`, e instanceof Error ? e.message : e);
      }
    }

    console.log(`=== SICONFI Done === ${upsertCount} registros para ${ibge_code} (ano ${usedYear})`);

    return new Response(
      JSON.stringify({
        success: upsertCount > 0,
        message: upsertCount > 0
          ? `SICONFI: ${upsertCount} registros (${usedYear}) para ${ibge_code}.`
          : `SICONFI: nenhum dado encontrado para ${ibge_code}.`,
        processed: upsertCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[SICONFI] Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

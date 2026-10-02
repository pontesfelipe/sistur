import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminOrServiceRole } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Novo CAGED — Ministério do Trabalho e Emprego.
 *
 * O CAGED não expõe API REST pública por município; a ingestão usa um CSV
 * agregado (por município/mês/setor) publicado em dados abertos. A URL é
 * configurável via secret CAGED_CSV_URL. Formato esperado (separador ;):
 *   ibge_code;ano;mes;setor;saldo;admissoes;desligamentos;estoque
 * setor ∈ {alojamento, alimentacao, transporte, agencias, total}
 *
 * Sem a URL configurada, a função registra a execução como "skipped_no_source"
 * em vez de falhar — mesmo padrão de resiliência das demais fontes.
 */

function parseCsvLine(line: string): string[] {
  return line.split(';').map((s) => s.trim());
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
    const filterIbge: string | undefined = body.ibge_code;

    const csvUrl = Deno.env.get('CAGED_CSV_URL');
    if (!csvUrl) {
      console.log('[CAGED] CAGED_CSV_URL não configurada — execução registrada como skipped_no_source');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'skipped_no_source',
          message: 'CAGED: fonte CSV não configurada (CAGED_CSV_URL). Nenhum dado importado.',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const resp = await fetch(csvUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`CAGED CSV HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const rows: Record<string, unknown>[] = [];
    for (const line of lines.slice(1)) { // pula cabeçalho
      const [ibge, ano, mes, setor, saldo, adm, desl, estoque] = parseCsvLine(line);
      if (!ibge || !ano || !mes || !setor) continue;
      if (filterIbge && ibge !== filterIbge) continue;
      rows.push({
        ibge_code: ibge,
        reference_year: parseInt(ano, 10),
        reference_month: parseInt(mes, 10),
        sector: setor.toLowerCase(),
        saldo_empregos: parseInt(saldo || '0', 10) || 0,
        admissoes: parseInt(adm || '0', 10) || 0,
        desligamentos: parseInt(desl || '0', 10) || 0,
        estoque_empregos: estoque ? parseInt(estoque, 10) : null,
      });
      if (rows.length >= 5000) break; // proteção de memória
    }

    let upsertCount = 0;
    let failed = 0;
    // Lotes de 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase
        .from('caged_tourism_employment')
        .upsert(batch, { onConflict: 'ibge_code,reference_year,reference_month,sector' });
      if (error) {
        console.error('[CAGED] upsert batch:', error.message);
        failed += batch.length;
      } else {
        upsertCount += batch.length;
      }
    }

    console.log(`=== CAGED Done === ${upsertCount} registros (${failed} falhas)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `CAGED: ${upsertCount} registros importados${failed ? `, ${failed} falhas` : ''}.`,
        processed: upsertCount,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[CAGED] Fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Cão de guarda do CAGED. Roda no dia 6 (cron via x-cron-secret) ou por admin.
 * Confere se o mês esperado (hoje - 2 meses, defasagem de publicação do MTE)
 * já está em caged_tourism_employment. Se não estiver, aciona o workflow do
 * GitHub Actions (pontesfelipe/sistur-caged-ingest) e registra alerta em ingestion_runs.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const REPO = 'pontesfelipe/sistur-caged-ingest';
const GATEWAY = 'https://connector-gateway.lovable.dev/github';

function expectedMonth(now = new Date()): string {
  let y = now.getUTCFullYear(), m = now.getUTCMonth() + 1 - 2;
  if (m <= 0) { m += 12; y -= 1; }
  return `${y}${String(m).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let triggeredBy = 'admin';
  const cron = req.headers.get('x-cron-secret') ?? '';
  if (cron) {
    const { data: sec } = await admin.from('internal_cron_secrets').select('value')
      .eq('name', 'ingestion_cron_secret').maybeSingle();
    if (!sec?.value || sec.value !== cron) return json({ error: 'invalid_cron_secret' }, 401);
    triggeredBy = 'cron';
  } else {
    const uc = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: 'unauthenticated' }, 401);
    const { data: ok } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'ADMIN' });
    if (!ok) return json({ error: 'not_authorized' }, 403);
  }

  let body: { month?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const month = body.month && /^\d{6}$/.test(body.month) ? body.month : expectedMonth();
  const started = Date.now();

  const { data: run } = await admin.from('ingestion_runs').insert({
    function_name: 'caged-watchdog', triggered_by: triggeredBy, status: 'running',
    metadata: { month },
  }).select('id').single();

  const finish = async (status: string, records: number, error: string | null, meta: Record<string, unknown>) => {
    if (run?.id) {
      await admin.from('ingestion_runs').update({
        status, records_processed: records, error_message: error,
        finished_at: new Date().toISOString(), duration_ms: Date.now() - started,
        metadata: { month, ...meta },
      }).eq('id', run.id);
    }
  };

  try {
    const { count, error } = await admin.from('caged_tourism_employment')
      .select('id', { count: 'exact', head: true })
      .eq('reference_year', Number(month.slice(0, 4)))
      .eq('reference_month', Number(month.slice(4)));
    if (error) throw new Error(`consulta: ${error.message}`);

    if ((count ?? 0) > 0) {
      await finish('success', count ?? 0, null, { action: 'none', message: `Mês ${month} já está no SISTUR.` });
      return json({ month, up_to_date: true, records: count });
    }

    const lov = Deno.env.get('LOVABLE_API_KEY');
    const gh = Deno.env.get('GITHUB_API_KEY');
    if (!lov || !gh) throw new Error('Conexão com o GitHub não configurada.');
    const resp = await fetch(`${GATEWAY}/repos/${REPO}/actions/workflows/caged.yml/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json',
        Authorization: `Bearer ${lov}`, 'X-Connection-Api-Key': gh,
      },
      body: JSON.stringify({ ref: 'main', inputs: { month } }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`GitHub [${resp.status}]: ${t.slice(0, 300)}`);
    }
    const msg = `Alerta: dados do CAGED de ${month} ausentes no dia 6. Cão de guarda acionou o GitHub Actions.`;
    await finish('partial', 0, msg, { action: 'dispatched' });
    return json({ month, up_to_date: false, dispatched: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finish('failed', 0, `Cão de guarda do CAGED falhou: ${msg}`, { action: 'error' });
    return json({ error: msg }, 500);
  }
});

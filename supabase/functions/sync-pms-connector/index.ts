/// <reference lib="deno.ns" />
/* Fase 13 — Sincronização PMS (provider registry).
 * Adaptadores prontos (todos opcionais — ativam quando o usuário tem credenciais):
 *  - cloudbeds  : OAuth 2.0 (refresh_token automático)
 *  - stays      : API Key (header `Authorization: Basic <token>`)
 *  - opera      : OAuth client_credentials (Oracle Hospitality Integration Platform)
 *  - hits       : API Key estática (HITS Mobile)
 * Mesmo padrão aplica-se a qualquer integração futura: registrar adapter aqui,
 * armazenar segredos em `credentials` (JSONB protegido por RLS) e/ou env Deno.
 * Chamado por: cron diário (modo batch, sem corpo) OU UI ("sync agora" com {connectionId}).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Conn = {
  id: string; org_id: string; destination_id: string; provider: string;
  property_id: string | null; credentials: any;
};

async function refreshCloudbedsToken(creds: any): Promise<any> {
  const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
  const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('CLOUDBEDS_CLIENT_ID/SECRET ausentes');
  if (!creds.refresh_token) throw new Error('Sem refresh_token');
  const r = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refresh_token,
    }),
  });
  if (!r.ok) throw new Error(`Cloudbeds refresh falhou: ${r.status}`);
  const j = await r.json();
  return {
    ...creds,
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? creds.refresh_token,
    expires_at: Date.now() + (Number(j.expires_in ?? 3600) * 1000),
  };
}

async function syncCloudbeds(conn: Conn, admin: ReturnType<typeof createClient>): Promise<{ parsed: any; raw: any }> {
  let creds = conn.credentials ?? {};
  if (!creds.access_token || (creds.expires_at && Date.now() > creds.expires_at - 60_000)) {
    creds = await refreshCloudbedsToken(creds);
    await admin.from('enterprise_pms_connections').update({ credentials: creds }).eq('id', conn.id);
  }
  // Period: last 30 complete days
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL('https://hotels.cloudbeds.com/api/v1.1/getDashboard');
  if (conn.property_id) url.searchParams.set('propertyID', conn.property_id);
  url.searchParams.set('startDate', fmt(start));
  url.searchParams.set('endDate', fmt(end));
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${creds.access_token}` },
  });
  if (!r.ok) throw new Error(`Cloudbeds API ${r.status}: ${await r.text().catch(() => '')}`);
  const raw = await r.json();
  // Best-effort normalization (Cloudbeds dashboard keys vary by plan)
  const data = raw?.data ?? raw ?? {};
  const parsed = {
    period_start: fmt(start),
    period_end: fmt(end),
    occupancy_pct: Number(data.occupancyRate ?? data.occupancy ?? 0),
    adr_brl: Number(data.adr ?? data.ADR ?? 0),
    revpar_brl: Number(data.revpar ?? data.RevPAR ?? 0),
    room_nights_sold: Number(data.roomNightsSold ?? data.roomsSold ?? 0),
  };
  return { parsed, raw };
}

/* ---------- Stays (API Key) ---------- */
async function syncStays(conn: Conn): Promise<{ parsed: any; raw: any }> {
  const apiKey = conn.credentials?.api_key ?? Deno.env.get('STAYS_API_KEY');
  const clientId = conn.credentials?.client_id ?? Deno.env.get('STAYS_CLIENT_ID');
  if (!apiKey || !clientId) throw new Error('Stays: defina client_id e api_key nas credenciais.');
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = new URL('https://stays.com.br/external/v1/booking/reservations');
  url.searchParams.set('from', fmt(start));
  url.searchParams.set('to', fmt(end));
  const auth = btoa(`${clientId}:${apiKey}`);
  const r = await fetch(url.toString(), { headers: { Authorization: `Basic ${auth}` } });
  if (!r.ok) throw new Error(`Stays API ${r.status}: ${await r.text().catch(() => '')}`);
  const raw = await r.json();
  const reservations: any[] = Array.isArray(raw) ? raw : (raw?.reservations ?? []);
  const roomNights = reservations.reduce((s, x) => s + Number(x?.nights ?? 0), 0);
  const revenue = reservations.reduce((s, x) => s + Number(x?.price?.total ?? x?.total ?? 0), 0);
  const adr = roomNights > 0 ? revenue / roomNights : 0;
  return {
    parsed: {
      period_start: fmt(start), period_end: fmt(end),
      occupancy_pct: 0, adr_brl: adr, revpar_brl: 0, room_nights_sold: roomNights,
    },
    raw,
  };
}

/* ---------- Opera Cloud (OAuth client_credentials) ---------- */
async function syncOpera(conn: Conn, admin: ReturnType<typeof createClient>): Promise<{ parsed: any; raw: any }> {
  let creds = conn.credentials ?? {};
  const base = creds.base_url ?? Deno.env.get('OPERA_BASE_URL');
  const clientId = creds.client_id ?? Deno.env.get('OPERA_CLIENT_ID');
  const clientSecret = creds.client_secret ?? Deno.env.get('OPERA_CLIENT_SECRET');
  const appKey = creds.app_key ?? Deno.env.get('OPERA_APP_KEY');
  if (!base || !clientId || !clientSecret || !appKey) {
    throw new Error('Opera: defina base_url, client_id, client_secret e app_key.');
  }
  if (!creds.access_token || (creds.expires_at && Date.now() > creds.expires_at - 60_000)) {
    const tr = await fetch(`${base}/oauth/v1/tokens`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-app-key': appKey,
      },
      body: 'grant_type=client_credentials',
    });
    if (!tr.ok) throw new Error(`Opera token ${tr.status}`);
    const tj = await tr.json();
    creds = { ...creds, access_token: tj.access_token, expires_at: Date.now() + Number(tj.expires_in ?? 3600) * 1000 };
    await admin.from('enterprise_pms_connections').update({ credentials: creds }).eq('id', conn.id);
  }
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const r = await fetch(`${base}/rsv/v1/hotels/${conn.property_id ?? ''}/reservationStatistics?startDate=${fmt(start)}&endDate=${fmt(end)}`, {
    headers: { Authorization: `Bearer ${creds.access_token}`, 'x-app-key': appKey },
  });
  if (!r.ok) throw new Error(`Opera API ${r.status}: ${await r.text().catch(() => '')}`);
  const raw = await r.json();
  const s = raw?.statistics ?? raw ?? {};
  return {
    parsed: {
      period_start: fmt(start), period_end: fmt(end),
      occupancy_pct: Number(s.occupancy ?? s.occupancyPercent ?? 0),
      adr_brl: Number(s.adr ?? 0),
      revpar_brl: Number(s.revpar ?? 0),
      room_nights_sold: Number(s.roomNights ?? 0),
    },
    raw,
  };
}

/* ---------- HITS Mobile (API Key estática) ---------- */
async function syncHits(conn: Conn): Promise<{ parsed: any; raw: any }> {
  const apiKey = conn.credentials?.api_key ?? Deno.env.get('HITS_API_KEY');
  const base = conn.credentials?.base_url ?? Deno.env.get('HITS_BASE_URL') ?? 'https://api.hitsmobile.com.br/v1';
  if (!apiKey) throw new Error('HITS: defina api_key nas credenciais.');
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `${base}/dashboard?propertyId=${conn.property_id ?? ''}&from=${fmt(start)}&to=${fmt(end)}`;
  const r = await fetch(url, { headers: { 'X-API-Key': apiKey } });
  if (!r.ok) throw new Error(`HITS API ${r.status}: ${await r.text().catch(() => '')}`);
  const raw = await r.json();
  const d = raw?.data ?? raw ?? {};
  return {
    parsed: {
      period_start: fmt(start), period_end: fmt(end),
      occupancy_pct: Number(d.occupancy ?? 0),
      adr_brl: Number(d.adr ?? 0),
      revpar_brl: Number(d.revpar ?? 0),
      room_nights_sold: Number(d.roomNights ?? 0),
    },
    raw,
  };
}

async function processOne(conn: Conn, admin: ReturnType<typeof createClient>) {
  try {
    let result: { parsed: any; raw: any };
    if (conn.provider === 'cloudbeds') result = await syncCloudbeds(conn, admin);
    else if (conn.provider === 'stays') result = await syncStays(conn);
    else if (conn.provider === 'opera') result = await syncOpera(conn, admin);
    else if (conn.provider === 'hits') result = await syncHits(conn);
    else throw new Error(`Provider '${conn.provider}' desconhecido`);

    const { data: imp, error: impErr } = await admin
      .from('enterprise_pms_imports')
      .insert({
        org_id: conn.org_id,
        source: conn.provider,
        period_start: result.parsed.period_start,
        period_end: result.parsed.period_end,
        raw_payload: result.raw,
        parsed_metrics: result.parsed,
        status: 'imported',
        rows_count: 1,
      })
      .select('id')
      .single();
    if (impErr) throw impErr;

    await admin.from('enterprise_pms_connections').update({
      status: 'active',
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'ok',
      last_sync_error: null,
      last_import_id: imp.id,
    }).eq('id', conn.id);
    return { ok: true, connection_id: conn.id, import_id: imp.id };
  } catch (e: any) {
    await admin.from('enterprise_pms_connections').update({
      status: 'error',
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'error',
      last_sync_error: String(e?.message ?? e),
    }).eq('id', conn.id);
    return { ok: false, connection_id: conn.id, error: String(e?.message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: any = {};
  try { body = await req.json(); } catch { /* batch cron mode */ }

  let conns: Conn[] = [];
  if (body.connectionId) {
    const { data } = await admin.from('enterprise_pms_connections').select('*').eq('id', body.connectionId).single();
    if (data) conns = [data as Conn];
  } else {
    const { data } = await admin.from('enterprise_pms_connections').select('*').eq('status', 'active').limit(200);
    conns = (data ?? []) as Conn[];
  }

  const results = [];
  for (const c of conns) results.push(await processOne(c, admin));
  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
/// <reference lib="deno.ns" />
/* Fase 13 — Callback OAuth Cloudbeds.
 * Recebe ?code=&state=<connection_id>, troca por access_token e grava em
 * enterprise_pms_connections.credentials. Redireciona para /diagnosticos.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://sistur.lovable.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const provider = (url.searchParams.get('provider') ?? 'cloudbeds').toLowerCase();
  if (!code || !state) {
    return new Response('Missing code/state', { status: 400, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: conn, error: connErr } = await admin
    .from('enterprise_pms_connections').select('*').eq('id', state).single();
  if (connErr || !conn) {
    return new Response('Connection not found', { status: 404, headers: corsHeaders });
  }

  try {
    if (provider !== 'cloudbeds') throw new Error(`Provider '${provider}' não suportado`);
    const clientId = Deno.env.get('CLOUDBEDS_CLIENT_ID');
    const clientSecret = Deno.env.get('CLOUDBEDS_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('CLOUDBEDS_CLIENT_ID/SECRET ausentes');
    const redirectUri = `${SUPABASE_URL}/functions/v1/pms-oauth-callback?provider=cloudbeds`;
    const r = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!r.ok) throw new Error(`Token exchange ${r.status}: ${await r.text().catch(() => '')}`);
    const j = await r.json();
    const creds = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (Number(j.expires_in ?? 3600) * 1000),
      scope: j.scope,
    };
    await admin.from('enterprise_pms_connections').update({
      credentials: creds,
      status: 'active',
      last_sync_status: 'connected',
      last_sync_error: null,
    }).eq('id', conn.id);

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${APP_URL}/diagnosticos?pms=connected` },
    });
  } catch (e: any) {
    await admin.from('enterprise_pms_connections').update({
      status: 'error',
      last_sync_status: 'oauth_error',
      last_sync_error: String(e?.message ?? e),
    }).eq('id', conn.id);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${APP_URL}/diagnosticos?pms=error` },
    });
  }
});
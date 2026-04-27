import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set([
  "ingest-cadastur",
  "ingest-mapa-turismo",
  "ingest-ana",
  "ingest-tse",
  "ingest-anatel",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate caller and require ADMIN
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: hasAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "ADMIN",
  });
  if (!hasAdmin) {
    return new Response(JSON.stringify({ error: "not_authorized" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { function_name?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const fn = (body.function_name ?? "").trim();
  if (!ALLOWED.has(fn)) {
    return new Response(
      JSON.stringify({ error: "invalid_function", allowed: [...ALLOWED] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Persist a "running" row up-front so the dashboard reflects activity
  const { data: runRow, error: insertErr } = await admin
    .from("ingestion_runs")
    .insert({
      function_name: fn,
      triggered_by: "admin",
      triggered_user_id: userData.user.id,
      status: "running",
      metadata: { source: "trigger-ingestion" },
    })
    .select("id")
    .single();

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  let finalStatus: "success" | "failed" | "partial" = "success";
  let processed = 0;
  let failed = 0;
  let errorMessage: string | null = null;
  let payload: unknown = null;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ smoke_test: true, triggered_by: "admin" }),
    });
    const text = await resp.text();
    try { payload = JSON.parse(text); } catch { payload = text; }
    if (!resp.ok) {
      finalStatus = "failed";
      errorMessage = typeof payload === "string"
        ? payload.slice(0, 500)
        : JSON.stringify(payload).slice(0, 500);
    } else if (payload && typeof payload === "object") {
      const p = payload as Record<string, unknown>;
      processed = Number(p.processed ?? p.records_processed ?? p.inserted ?? 0) | 0;
      failed = Number(p.failed ?? p.records_failed ?? p.errors ?? 0) | 0;
      if (failed > 0 && processed > 0) finalStatus = "partial";
    }
  } catch (e) {
    finalStatus = "failed";
    errorMessage = (e as Error).message;
  }

  const duration = Date.now() - startedAt;
  await admin.from("ingestion_runs").update({
    status: finalStatus,
    finished_at: new Date().toISOString(),
    duration_ms: duration,
    records_processed: processed,
    records_failed: failed,
    error_message: errorMessage,
    metadata: { source: "trigger-ingestion", response: payload },
  }).eq("id", runRow.id);

  return new Response(
    JSON.stringify({
      run_id: runRow.id,
      function_name: fn,
      status: finalStatus,
      duration_ms: duration,
      processed,
      failed,
      error: errorMessage,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
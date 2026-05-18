// Shared auth helpers for edge functions.
// Centralises JWT validation, ADMIN-role enforcement, and service-role checks
// so individual functions don't drift apart on auth handling.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function unauthorized(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(message = "Forbidden") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Require a valid Supabase user JWT on the incoming request.
 * Returns the user + a user-scoped client (RLS applies). Returns a 401 Response when invalid.
 */
export async function requireUser(req: Request): Promise<
  | { user: { id: string; email?: string }; client: SupabaseClient; jwt: string }
  | Response
> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();
  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) return unauthorized();

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) return unauthorized();
  return { user: { id: data.user.id, email: data.user.email ?? undefined }, client, jwt: authHeader };
}

/** Require an authenticated ADMIN user. */
export async function requireAdmin(req: Request): Promise<
  | { user: { id: string }; client: SupabaseClient; admin: SupabaseClient; jwt: string }
  | Response
> {
  const res = await requireUser(req);
  if (res instanceof Response) return res;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.rpc("has_role", {
    _user_id: res.user.id,
    _role: "ADMIN",
  });
  if (error || !data) return forbidden("Admin role required");
  return { user: res.user, client: res.client, admin, jwt: res.jwt };
}

/**
 * Allow either an authenticated ADMIN or a caller presenting the service-role key.
 * Useful for maintenance/ingestion functions invoked by both pg_cron and admins.
 */
export async function requireAdminOrServiceRole(req: Request): Promise<
  | { mode: "service_role"; admin: SupabaseClient }
  | { mode: "user"; user: { id: string }; admin: SupabaseClient }
  | Response
> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  if (authHeader === `Bearer ${serviceKey}`) {
    return { mode: "service_role", admin };
  }
  const res = await requireAdmin(req);
  if (res instanceof Response) return res;
  return { mode: "user", user: res.user, admin };
}

/** Require that the caller presents the service-role key in Authorization. */
export function requireServiceRole(req: Request): Response | null {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceKey}`) return unauthorized();
  return null;
}
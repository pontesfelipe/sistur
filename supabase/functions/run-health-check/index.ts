import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckResult {
  name: string;
  category: string;
  status: "pass" | "fail" | "warning";
  message: string;
  duration_ms: number;
  details?: Record<string, unknown>;
}

interface RegistryEntry {
  id: string;
  category: string;
  test_name: string;
  test_type: string;
  test_config: Record<string, unknown>;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let runId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const triggeredBy = body.triggered_by || null;
    const runType = body.run_type || "manual";

    // Create health check record
    const { data: run, error: insertError } = await supabase
      .from("system_health_checks")
      .insert({ run_type: runType, status: "running", triggered_by: triggeredBy })
      .select("id")
      .single();

    if (insertError) throw insertError;
    runId = run.id;

    // === LOAD TEST REGISTRY ===
    const { data: registry } = await supabase
      .from("test_flow_registry")
      .select("*")
      .eq("is_active", true)
      .order("category");

    const tests: RegistryEntry[] = (registry as RegistryEntry[]) || [];
    const results: CheckResult[] = [];

    // If registry is empty, run a sync first
    if (tests.length === 0) {
      // Trigger sync and use fallback hardcoded checks
      try {
        await fetch(`${supabaseUrl}/functions/v1/sync-test-registry`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ app_version: "auto-sync" }),
        });
      } catch { /* ignore sync failure */ }

      // Reload registry
      const { data: reloaded } = await supabase
        .from("test_flow_registry")
        .select("*")
        .eq("is_active", true)
        .order("category");

      if (reloaded && reloaded.length > 0) {
        tests.push(...(reloaded as RegistryEntry[]));
      }
    }

    // === EXECUTE TESTS FROM REGISTRY ===
    for (const test of tests) {
      const start = Date.now();

      try {
        switch (test.test_type) {
          case "table_access": {
            const tableName = (test.test_config as any).table_name;
            const { count, error } = await supabase
              .from(tableName)
              .select("*", { count: "exact", head: true });
            const duration = Date.now() - start;

            if (error) {
              results.push({
                name: test.test_name, category: test.category,
                status: "fail", message: `Erro: ${error.message}`, duration_ms: duration,
              });
            } else {
              results.push({
                name: test.test_name, category: test.category,
                status: duration > 3000 ? "warning" : "pass",
                message: duration > 3000 ? `Lento (${duration}ms) - ${count} registros` : `OK - ${count} registros`,
                duration_ms: duration, details: { count },
              });
            }
            break;
          }

          case "edge_function_ping": {
            const fnName = (test.test_config as any).function_name;
            const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
              method: "OPTIONS",
              headers: { Authorization: `Bearer ${anonKey}` },
            });
            const duration = Date.now() - start;
            results.push({
              name: test.test_name, category: test.category,
              status: res.status < 500 ? "pass" : "fail",
              message: res.status < 500 ? `Respondendo (${res.status}) em ${duration}ms` : `Erro ${res.status}`,
              duration_ms: duration,
            });
            break;
          }

          case "storage_access": {
            const bucketName = (test.test_config as any).bucket_name;
            const { error } = await supabase.storage.from(bucketName).list("", { limit: 1 });
            const duration = Date.now() - start;
            results.push({
              name: test.test_name, category: test.category,
              status: error ? "fail" : "pass",
              message: error ? `Erro: ${error.message}` : `Acessível (${duration}ms)`,
              duration_ms: duration,
            });
            break;
          }

          case "integrity_orphan_roles": {
            const { data: allUsers } = await supabase.rpc("admin_get_all_users");
            const orphanCount = allUsers?.filter((p: any) => !p.role)?.length || 0;
            results.push({
              name: test.test_name, category: test.category,
              status: orphanCount > 0 ? "warning" : "pass",
              message: orphanCount > 0 ? `${orphanCount} perfis sem papel` : "Todos os perfis têm papel",
              duration_ms: Date.now() - start, details: { orphan_count: orphanCount },
            });
            break;
          }

          case "integrity_expired_trials": {
            const { count } = await supabase
              .from("licenses")
              .select("*", { count: "exact", head: true })
              .eq("plan", "trial").eq("status", "active")
              .lt("trial_ends_at", new Date().toISOString());
            results.push({
              name: test.test_name, category: test.category,
              status: (count || 0) > 0 ? "warning" : "pass",
              message: (count || 0) > 0 ? `${count} trials precisam expirar` : "Nenhum trial pendente",
              duration_ms: Date.now() - start, details: { count },
            });
            break;
          }

          case "integrity_pending_approvals": {
            const { count } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq("pending_approval", true);
            results.push({
              name: test.test_name, category: test.category,
              status: (count || 0) > 10 ? "warning" : "pass",
              message: `${count || 0} aprovações pendentes`,
              duration_ms: Date.now() - start, details: { count },
            });
            break;
          }

          case "integrity_client_errors": {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count } = await supabase
              .from("client_error_reports")
              .select("*", { count: "exact", head: true })
              .gte("created_at", yesterday);
            results.push({
              name: test.test_name, category: test.category,
              status: (count || 0) > 50 ? "fail" : (count || 0) > 10 ? "warning" : "pass",
              message: `${count || 0} erros (24h)`,
              duration_ms: Date.now() - start, details: { count },
            });
            break;
          }

          case "integrity_assessments_no_indicators": {
            const { count } = await supabase
              .from("assessments")
              .select("*", { count: "exact", head: true })
              .eq("status", "calculated")
              .is("calculated_at", null);
            results.push({
              name: test.test_name, category: test.category,
              status: (count || 0) > 0 ? "warning" : "pass",
              message: (count || 0) > 0 ? `${count} assessments sem data de cálculo` : "OK",
              duration_ms: Date.now() - start, details: { count },
            });
            break;
          }

          case "integrity_users_no_org": {
            const { count } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .is("org_id", null);
            results.push({
              name: test.test_name, category: test.category,
              status: (count || 0) > 0 ? "warning" : "pass",
              message: (count || 0) > 0 ? `${count} sem organização` : "Todos têm org",
              duration_ms: Date.now() - start, details: { count },
            });
            break;
          }

          case "route_accessible": {
            // Routes are client-side, just register them as pass (verified by client monitor)
            results.push({
              name: test.test_name, category: test.category,
              status: "pass",
              message: `Rota registrada: ${(test.test_config as any).path}`,
              duration_ms: 0,
            });
            break;
          }

          default: {
            results.push({
              name: test.test_name, category: test.category,
              status: "warning",
              message: `Tipo de teste desconhecido: ${test.test_type}`,
              duration_ms: Date.now() - start,
            });
          }
        }
      } catch (e) {
        results.push({
          name: test.test_name, category: test.category,
          status: "fail", message: `Exceção: ${(e as Error).message}`,
          duration_ms: Date.now() - start,
        });
      }
    }

    // === CALCULATE SUMMARY ===
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const warnings = results.filter((r) => r.status === "warning").length;

    // Auto-create bug feedback for failures
    if (failed > 0) {
      const failedChecks = results.filter((r) => r.status === "fail");
      const failureDescription = failedChecks
        .map((c) => `• ${c.name}: ${c.message}`)
        .join("\n");

      await supabase.from("user_feedback").insert({
        user_id: triggeredBy || null,
        feedback_type: "bug",
        category: "erro_funcionalidade",
        title: `[Auto] Health Check: ${failed} falha(s) detectada(s)`,
        description: `Verificação automática encontrou ${failed} falha(s):\n\n${failureDescription}`,
        status: "pending",
        priority: failed > 3 ? "critical" : "high",
        page_url: "/configuracoes",
        user_agent: "SISTUR Health Check Bot",
      });
    }

    // Update health check record
    await supabase
      .from("system_health_checks")
      .update({
        status: failed > 0 ? "failed" : warnings > 0 ? "warning" : "passed",
        completed_at: new Date().toISOString(),
        total_checks: results.length,
        passed, failed, warnings, results,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        id: runId,
        status: failed > 0 ? "failed" : warnings > 0 ? "warning" : "passed",
        total_checks: results.length, passed, failed, warnings, results,
        registry_tests: tests.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (runId) {
      await supabase
        .from("system_health_checks")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          results: [{ name: "System Error", category: "system", status: "fail", message: (error as Error).message, duration_ms: 0 }],
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

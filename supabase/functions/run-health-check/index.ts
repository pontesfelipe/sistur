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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let runId: string | null = null;
  let triggeredBy: string | null = null;

  try {
    // Parse request
    const body = await req.json().catch(() => ({}));
    triggeredBy = body.triggered_by || null;
    const runType = body.run_type || "manual";

    // Create health check record
    const { data: run, error: insertError } = await supabase
      .from("system_health_checks")
      .insert({
        run_type: runType,
        status: "running",
        triggered_by: triggeredBy,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    runId = run.id;

    const results: CheckResult[] = [];

    // === 1. DATABASE HEALTH CHECKS ===
    const dbChecks = [
      { name: "Tabela profiles", table: "profiles" },
      { name: "Tabela destinations", table: "destinations" },
      { name: "Tabela assessments", table: "assessments" },
      { name: "Tabela indicators", table: "indicators" },
      { name: "Tabela edu_trainings", table: "edu_trainings" },
      { name: "Tabela edu_tracks", table: "edu_tracks" },
      { name: "Tabela forum_posts", table: "forum_posts" },
      { name: "Tabela licenses", table: "licenses" },
      { name: "Tabela user_roles", table: "user_roles" },
      { name: "Tabela exams", table: "exams" },
      { name: "Tabela certificates", table: "certificates" },
      { name: "Tabela projects", table: "projects" },
      { name: "Tabela action_plans", table: "action_plans" },
      { name: "Tabela courses", table: "courses" },
      { name: "Tabela classrooms", table: "classrooms" },
      { name: "Tabela user_feedback", table: "user_feedback" },
    ];

    for (const check of dbChecks) {
      const start = Date.now();
      try {
        const { count, error } = await supabase
          .from(check.table)
          .select("*", { count: "exact", head: true });
        const duration = Date.now() - start;

        if (error) {
          results.push({
            name: check.name,
            category: "database",
            status: "fail",
            message: `Erro ao acessar: ${error.message}`,
            duration_ms: duration,
          });
        } else {
          results.push({
            name: check.name,
            category: "database",
            status: duration > 3000 ? "warning" : "pass",
            message:
              duration > 3000
                ? `Lento (${duration}ms) - ${count} registros`
                : `OK - ${count} registros`,
            duration_ms: duration,
            details: { count },
          });
        }
      } catch (e) {
        results.push({
          name: check.name,
          category: "database",
          status: "fail",
          message: `Exceção: ${e.message}`,
          duration_ms: Date.now() - start,
        });
      }
    }

    // === 2. EDGE FUNCTION HEALTH CHECKS ===
    const edgeFunctions = [
      "calculate-assessment",
      "fetch-official-data",
      "generate-report",
      "search-ibge",
      "beni-chat",
      "manage-users",
      "moderate-image",
    ];

    for (const fn of edgeFunctions) {
      const start = Date.now();
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
          method: "OPTIONS",
          headers: { Authorization: `Bearer ${anonKey}` },
        });
        const duration = Date.now() - start;

        results.push({
          name: `Edge Function: ${fn}`,
          category: "edge_function",
          status: res.status < 500 ? "pass" : "fail",
          message:
            res.status < 500
              ? `Respondendo (${res.status}) em ${duration}ms`
              : `Erro ${res.status}`,
          duration_ms: duration,
        });
      } catch (e) {
        results.push({
          name: `Edge Function: ${fn}`,
          category: "edge_function",
          status: "fail",
          message: `Inacessível: ${e.message}`,
          duration_ms: Date.now() - start,
        });
      }
    }

    // === 3. DATA INTEGRITY CHECKS ===
    const integrityStart = Date.now();

    // Check for orphan profiles (no user_roles)
    const { data: orphanProfiles } = await supabase.rpc("admin_get_all_users");
    const orphanCount = orphanProfiles?.filter((p) => !p.role)?.length || 0;
    results.push({
      name: "Perfis sem papel definido",
      category: "data_integrity",
      status: orphanCount > 0 ? "warning" : "pass",
      message:
        orphanCount > 0
          ? `${orphanCount} perfis sem papel no sistema`
          : "Todos os perfis têm papel definido",
      duration_ms: Date.now() - integrityStart,
      details: { orphan_count: orphanCount },
    });

    // Check for expired trials still active
    const { count: expiredTrials } = await supabase
      .from("licenses")
      .select("*", { count: "exact", head: true })
      .eq("plan", "trial")
      .eq("status", "active")
      .lt("trial_ends_at", new Date().toISOString());

    results.push({
      name: "Trials expirados ainda ativos",
      category: "data_integrity",
      status: (expiredTrials || 0) > 0 ? "warning" : "pass",
      message:
        (expiredTrials || 0) > 0
          ? `${expiredTrials} trials precisam ser expirados`
          : "Nenhum trial pendente de expiração",
      duration_ms: Date.now() - integrityStart,
      details: { expired_trials: expiredTrials },
    });

    // Check pending approvals count
    const { count: pendingCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("pending_approval", true);

    results.push({
      name: "Aprovações pendentes",
      category: "data_integrity",
      status: (pendingCount || 0) > 10 ? "warning" : "pass",
      message: `${pendingCount || 0} aprovações pendentes`,
      duration_ms: Date.now() - integrityStart,
      details: { pending_count: pendingCount },
    });

    // === 4. STORAGE HEALTH ===
    const buckets = [
      "edu-videos",
      "forum-attachments",
      "knowledge-base",
      "global-references",
    ];
    for (const bucket of buckets) {
      const start = Date.now();
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list("", { limit: 1 });
        const duration = Date.now() - start;
        results.push({
          name: `Storage: ${bucket}`,
          category: "storage",
          status: error ? "fail" : "pass",
          message: error ? `Erro: ${error.message}` : `Acessível (${duration}ms)`,
          duration_ms: duration,
        });
      } catch (e) {
        results.push({
          name: `Storage: ${bucket}`,
          category: "storage",
          status: "fail",
          message: `Exceção: ${e.message}`,
          duration_ms: Date.now() - start,
        });
      }
    }

    // === 5. CLIENT ERRORS CHECK (recent 24h) ===
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentErrors } = await supabase
      .from("client_error_reports")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday);

    results.push({
      name: "Erros client-side (últimas 24h)",
      category: "client_monitoring",
      status:
        (recentErrors || 0) > 50
          ? "fail"
          : (recentErrors || 0) > 10
          ? "warning"
          : "pass",
      message: `${recentErrors || 0} erros reportados`,
      duration_ms: 0,
      details: { error_count: recentErrors },
    });

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
        passed,
        failed,
        warnings,
        results,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        id: runId,
        status: failed > 0 ? "failed" : warnings > 0 ? "warning" : "passed",
        total_checks: results.length,
        passed,
        failed,
        warnings,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Update record as failed if it was created
    if (runId) {
      await supabase
        .from("system_health_checks")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          results: [
            {
              name: "System Error",
              category: "system",
              status: "fail",
              message: error.message,
              duration_ms: 0,
            },
          ],
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

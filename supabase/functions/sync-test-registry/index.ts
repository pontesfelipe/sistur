import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestDefinition {
  category: string;
  test_name: string;
  test_type: string;
  test_config: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const appVersion = body.app_version || "unknown";

    const discoveredTests: TestDefinition[] = [];

    // === 1. DISCOVER TABLES from information_schema ===
    const { data: tables } = await supabase.rpc("admin_get_all_users").then(() => 
      // Fallback: query known tables from the public schema
      supabase
        .from("test_flow_registry")
        .select("test_name")
        .eq("category", "database")
        .limit(0)
    );

    // Discover tables by querying each known table
    const knownTables = [
      "profiles", "destinations", "assessments", "indicators", "indicator_scores",
      "issues", "prescriptions", "action_plans", "alerts",
      "edu_trainings", "edu_tracks", "edu_enrollments", "edu_progress", "edu_courses",
      "edu_modules", "edu_events", "edu_lives",
      "forum_posts", "forum_replies", "forum_likes", "forum_reports",
      "licenses", "user_roles", "orgs", "org_referral_codes",
      "exams", "exam_questions", "exam_attempts", "exam_rulesets",
      "certificates", "courses",
      "classrooms", "classroom_students", "classroom_assignments",
      "projects", "project_phases", "project_milestones", "project_tasks",
      "user_feedback", "audit_events",
      "content_items", "lms_courses", "lms_enrollments",
      "community_feedback", "stakeholder_profiles",
      "knowledge_base_files", "global_reference_files",
      "beni_chat_messages", "notifications",
      "system_health_checks", "client_error_reports",
      "test_flow_registry", "test_registry_sync_log",
      "destination_certifications", "diagnosis_data_snapshots",
      "edu_indicator_training_map", "edu_personalized_recommendations",
      "edu_student_profiles", "edu_training_access",
      "content_moderation_settings",
      "professor_referral_codes", "student_referrals",
      "game_sessions",
    ];

    // Test each table to see if it exists
    for (const table of knownTables) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (!error) {
        discoveredTests.push({
          category: "database",
          test_name: `Tabela ${table}`,
          test_type: "table_access",
          test_config: { table_name: table },
        });
      }
    }

    // === 2. DISCOVER EDGE FUNCTIONS ===
    const edgeFunctions = [
      "calculate-assessment",
      "fetch-official-data",
      "generate-report",
      "search-ibge",
      "beni-chat",
      "manage-users",
      "moderate-image",
      "moderate-kb-upload",
      "ingest-cadastur",
      "ingest-youtube",
      "search-business-reviews",
      "auth-email-hook",
      "cleanup-exam-tracking",
      "elevenlabs-tts",
      "generate-project-structure",
      "handle-email-suppression",
      "handle-email-unsubscribe",
      "preview-transactional-email",
      "process-email-queue",
      "send-transactional-email",
      "run-health-check",
      "sync-test-registry",
    ];

    for (const fn of edgeFunctions) {
      discoveredTests.push({
        category: "edge_function",
        test_name: `Edge Function: ${fn}`,
        test_type: "edge_function_ping",
        test_config: { function_name: fn },
      });
    }

    // === 3. DISCOVER STORAGE BUCKETS ===
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      for (const bucket of buckets) {
        discoveredTests.push({
          category: "storage",
          test_name: `Storage: ${bucket.name}`,
          test_type: "storage_access",
          test_config: { bucket_name: bucket.name, is_public: bucket.public },
        });
      }
    }

    // === 4. APP ROUTES (from known routes) ===
    const appRoutes = [
      { path: "/", name: "Dashboard" },
      { path: "/auth", name: "Autenticação" },
      { path: "/onboarding", name: "Onboarding" },
      { path: "/destinos", name: "Destinos" },
      { path: "/diagnosticos", name: "Diagnósticos" },
      { path: "/projetos", name: "Projetos" },
      { path: "/relatorios", name: "Relatórios" },
      { path: "/edu/catalogo", name: "Catálogo EDU" },
      { path: "/edu/trilhas", name: "Trilhas EDU" },
      { path: "/edu/perfil", name: "Perfil EDU" },
      { path: "/cursos", name: "Cursos" },
      { path: "/forum", name: "Fórum" },
      { path: "/games", name: "Jogos" },
      { path: "/configuracoes", name: "Configurações" },
      { path: "/planos", name: "Planos" },
      { path: "/ajuda", name: "Ajuda" },
      { path: "/professor", name: "Painel Professor" },
      { path: "/base-conhecimento", name: "Base de Conhecimento" },
      { path: "/beni", name: "Professor Beni" },
      { path: "/certificados", name: "Certificados" },
      { path: "/erp", name: "Integração ERP" },
      { path: "/on-demand", name: "Solicitações On-Demand" },
      { path: "/metodologia", name: "Metodologia" },
      { path: "/destinos-publicos", name: "Destinos Públicos" },
      { path: "/admin/licencas", name: "Admin Licenças" },
      { path: "/admin/edu", name: "Admin EDU" },
      { path: "/audit-logs", name: "Logs de Auditoria" },
      { path: "/faq", name: "FAQ" },
    ];

    for (const route of appRoutes) {
      discoveredTests.push({
        category: "route",
        test_name: `Rota: ${route.name}`,
        test_type: "route_accessible",
        test_config: { path: route.path, name: route.name },
      });
    }

    // === 5. DATA INTEGRITY CHECKS ===
    const integrityChecks = [
      {
        name: "Perfis sem papel definido",
        test_type: "integrity_orphan_roles",
        config: { description: "Verifica perfis sem user_roles associado" },
      },
      {
        name: "Trials expirados ainda ativos",
        test_type: "integrity_expired_trials",
        config: { description: "Verifica licenças trial que deveriam estar expiradas" },
      },
      {
        name: "Aprovações pendentes",
        test_type: "integrity_pending_approvals",
        config: { description: "Conta aprovações pendentes e alerta se > 10" },
      },
      {
        name: "Erros client-side (últimas 24h)",
        test_type: "integrity_client_errors",
        config: { description: "Volume de erros reportados pelo monitor client-side" },
      },
      {
        name: "Assessments sem indicadores",
        test_type: "integrity_assessments_no_indicators",
        config: { description: "Diagnósticos calculados sem scores de indicadores" },
      },
      {
        name: "Usuários sem organização",
        test_type: "integrity_users_no_org",
        config: { description: "Perfis sem org_id definido" },
      },
    ];

    for (const check of integrityChecks) {
      discoveredTests.push({
        category: "data_integrity",
        test_name: check.name,
        test_type: check.test_type,
        test_config: check.config,
      });
    }

    // === UPSERT ALL DISCOVERED TESTS ===
    const now = new Date().toISOString();
    let added = 0;
    let existing = 0;

    for (const test of discoveredTests) {
      const { data: existingTest } = await supabase
        .from("test_flow_registry")
        .select("id")
        .eq("category", test.category)
        .eq("test_name", test.test_name)
        .maybeSingle();

      if (existingTest) {
        // Update config and sync time
        await supabase
          .from("test_flow_registry")
          .update({
            test_config: test.test_config,
            last_synced_at: now,
            updated_at: now,
          })
          .eq("id", existingTest.id);
        existing++;
      } else {
        await supabase.from("test_flow_registry").insert({
          ...test,
          auto_discovered: true,
          last_synced_at: now,
        });
        added++;
      }
    }

    // Mark tests not found in this sync as potentially stale
    const { count: removedCount } = await supabase
      .from("test_flow_registry")
      .select("*", { count: "exact", head: true })
      .eq("auto_discovered", true)
      .lt("last_synced_at", now);

    // Log sync
    await supabase.from("test_registry_sync_log").insert({
      app_version: appVersion,
      total_tests: discoveredTests.length,
      tests_added: added,
      tests_removed: removedCount || 0,
      status: "completed",
      details: {
        by_category: {
          database: discoveredTests.filter((t) => t.category === "database").length,
          edge_function: discoveredTests.filter((t) => t.category === "edge_function").length,
          storage: discoveredTests.filter((t) => t.category === "storage").length,
          route: discoveredTests.filter((t) => t.category === "route").length,
          data_integrity: discoveredTests.filter((t) => t.category === "data_integrity").length,
        },
      },
    });

    return new Response(
      JSON.stringify({
        total_tests: discoveredTests.length,
        added,
        updated: existing,
        stale: removedCount || 0,
        app_version: appVersion,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

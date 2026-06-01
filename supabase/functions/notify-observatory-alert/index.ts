import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { alert_id } = await req.json();
    if (!alert_id || typeof alert_id !== "string") {
      return new Response(JSON.stringify({ error: "alert_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Carrega alerta
    const { data: alert, error: alertErr } = await supabase
      .from("observatory_alerts")
      .select("*, observatory_metrics(name, unit, code), orgs:org_id(name)")
      .eq("id", alert_id)
      .maybeSingle();

    if (alertErr || !alert) {
      return new Response(JSON.stringify({ error: "Alerta não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (alert.severity !== "critical") {
      return new Response(JSON.stringify({ skipped: "Apenas alertas críticos disparam e-mail" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (alert.email_sent_at) {
      return new Response(JSON.stringify({ skipped: "E-mail já enviado", email_sent_at: alert.email_sent_at }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Destinatários: ORG_ADMIN da org + ADMINs globais
    const { data: orgAdmins } = await supabase
      .from("user_roles")
      .select("user_id, profiles:user_id(email, full_name)")
      .eq("org_id", alert.org_id)
      .in("role", ["ORG_ADMIN", "ADMIN"]);

    const { data: globalAdmins } = await supabase
      .from("user_roles")
      .select("user_id, profiles:user_id(email, full_name)")
      .eq("role", "ADMIN")
      .is("org_id", null);

    const recipients = new Map<string, string>();
    for (const row of [...(orgAdmins ?? []), ...(globalAdmins ?? [])]) {
      const email = (row as any).profiles?.email as string | undefined;
      if (email) recipients.set(email.toLowerCase(), email);
    }

    if (recipients.size === 0) {
      return new Response(JSON.stringify({ skipped: "Sem destinatários" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metric = (alert as any).observatory_metrics ?? {};
    const orgName = (alert as any).orgs?.name ?? "Destino";
    const period = alert.reference_month
      ? `${MONTHS_PT[alert.reference_month - 1]}/${alert.reference_year}`
      : `${alert.reference_year}`;

    const templateData = {
      orgName,
      metricName: metric.name ?? "Indicador",
      unit: metric.unit ?? "",
      previousValue: formatNumber(Number(alert.previous_value)),
      currentValue: formatNumber(Number(alert.current_value)),
      deltaPct: Number(alert.delta_pct),
      period,
      message: alert.message,
    };

    let sent = 0;
    for (const email of recipients.values()) {
      try {
        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "observatory-critical-alert",
            recipientEmail: email,
            idempotencyKey: `obs-alert-${alert.id}-${email}`,
            templateData,
          },
        });
        if (!error) sent++;
      } catch (e) {
        console.error("Falha ao enviar para", email, e);
      }
    }

    await supabase
      .from("observatory_alerts")
      .update({ email_sent_at: new Date().toISOString(), email_recipients_count: sent })
      .eq("id", alert_id);

    return new Response(JSON.stringify({ ok: true, sent, total_recipients: recipients.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-observatory-alert error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
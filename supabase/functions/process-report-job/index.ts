// v1.38.58 — Worker assíncrono da fila de geração de relatórios.
// (force-redeploy: a versão anterior não propagou para a infra de edge functions,
// causando 404 ao trigger DB e jobs travados em "processing" para sempre.)
//
// Por que essa função existe?
// Antes, o modo `mode=background` do `generate-report` enfileirava o job e
// chamava `EdgeRuntime.waitUntil(...)` para processar dentro do MESMO worker
// do request original. Quando esse request inicial estourava o timeout do
// proxy (~150s), o worker era morto e o job ficava preso em `processing`
// para sempre. Agora o INSERT em `report_jobs` dispara um trigger DB
// (`trg_dispatch_report_job`) que faz `pg_net.http_post` para esta função,
// num worker novo e independente — o request original já respondeu 202 e
// não importa mais se ele cair.
//
// Esta função:
//   1) Lê o job de report_jobs (status='queued') e marca como 'processing'.
//   2) Reabre o pipeline interno do generate-report em modo `stream` usando
//      o JWT salvo no job (preservando RLS exatamente como na chamada
//      original do usuário).
//   3) Atualiza progresso/stage durante o processo.
//   4) Marca 'completed' com report_id ao final, ou 'failed' com mensagem
//      detalhada (incluindo trace_id e último stage observado).
//   5) Suporta retry automático: se for primeira tentativa e falhar por
//      timeout transitório, marca como 'queued' novamente (até 2 tentativas
//      no total, então desiste).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 2;
const STREAM_IDLE_TIMEOUT_MS = 4 * 60 * 1000;
const STREAM_HARD_TIMEOUT_MS = 12 * 60 * 1000;

function fmtPrefix(traceId: string, started: number, jobId: string, reportId: string | null) {
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  return `[trace=${traceId}][+${elapsed}s][job=${jobId}][report=${reportId ?? '-'}]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let jobId: string | null = null;
  let traceId = "no-trace";
  let reportId: string | null = null;
  const started = Date.now();
  let lastStage = "init";

  const log = (stage: string, extra?: Record<string, unknown>) => {
    lastStage = stage;
    try {
      console.log(
        `${fmtPrefix(traceId, started, jobId ?? "-", reportId)}[stage=${stage}]`,
        extra ? JSON.stringify(extra) : ""
      );
    } catch {
      console.log(`${fmtPrefix(traceId, started, jobId ?? "-", reportId)}[stage=${stage}]`);
    }
  };
  const logErr = (stage: string, err: unknown, extra?: Record<string, unknown>) => {
    lastStage = `${stage}:error`;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `${fmtPrefix(traceId, started, jobId ?? "-", reportId)}[stage=${stage}][ERROR] ${msg}`,
      extra ? JSON.stringify(extra) : ""
    );
  };

  try {
    const body = await req.json().catch(() => ({} as any));
    jobId = typeof body?.jobId === "string" ? body.jobId : null;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lê o job
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("report_jobs")
      .select("id, org_id, assessment_id, destination_name, report_template, visibility, environment, status, payload, auth_jwt, attempts, created_by")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) {
      logErr("load_job_failed", jobErr ?? new Error("job not found"));
      return new Response(JSON.stringify({ error: "Job não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    traceId = (job.payload as any)?.traceId ?? jobId;
    log("worker_started", { status: job.status, attempts: job.attempts });

    // Idempotência: só processa se status for 'queued' (ou retry de 'processing' órfão > 15min)
    if (job.status === "completed") {
      log("already_completed_skip");
      return new Response(JSON.stringify({ ok: true, skipped: "already completed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status === "processing") {
      log("already_processing_skip");
      return new Response(JSON.stringify({ ok: true, skipped: "already processing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attempts = (job.attempts ?? 0) + 1;

    await supabaseAdmin.from("report_jobs").update({
      status: "processing",
      stage: `[trace=${traceId}] Coletando dados do diagnóstico (tentativa ${attempts})`,
      progress_pct: 10,
      started_at: new Date().toISOString(),
      attempts,
      last_attempt_at: new Date().toISOString(),
    }).eq("id", jobId);
    log("marked_processing", { attempts });

    if (!job.payload || !job.auth_jwt) {
      const msg = "Job sem payload ou auth_jwt — provavelmente criado por versão antiga.";
      logErr("invalid_job", new Error(msg));
      await supabaseAdmin.from("report_jobs").update({
        status: "failed",
        error_message: `[trace=${traceId}] ${msg}`,
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Watchdog para abortar se o stream interno ficar ocioso
    const controller = new AbortController();
    const taskStart = Date.now();
    let lastChunkAt = Date.now();
    const watchdog = setInterval(() => {
      const now = Date.now();
      if (now - lastChunkAt > STREAM_IDLE_TIMEOUT_MS) {
        logErr("stream_idle_abort", new Error(`No chunk for ${Math.round((now - lastChunkAt) / 1000)}s`), { last_stage: lastStage });
        controller.abort("worker-idle-timeout");
      } else if (now - taskStart > STREAM_HARD_TIMEOUT_MS) {
        logErr("stream_hard_abort", new Error("Hard timeout reached"), { last_stage: lastStage });
        controller.abort("worker-hard-timeout");
      }
    }, 15_000);

    // Atualizador de progresso
    let pct = 15;
    const progressTimer = setInterval(() => {
      pct = Math.min(90, pct + 5);
      supabaseAdmin.from("report_jobs").update({
        progress_pct: pct,
        stage: `[trace=${traceId}] ${pct < 50 ? "Gerando narrativa com IA" : "Validando coerência e persistindo"}`,
      }).eq("id", jobId).then(() => {}, () => {});
    }, 30_000);

    try {
      const payload = job.payload as any;
      const url = `${supabaseUrl}/functions/v1/generate-report`;
      log("internal_fetch_start", { url });
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Reusa o JWT do criador → respeita RLS exatamente como na chamada original
          Authorization: job.auth_jwt,
          "x-trace-id": traceId,
        },
        body: JSON.stringify({
          jobId,
          assessmentId: job.assessment_id,
          destinationName: job.destination_name,
          pillarScores: payload.pillarScores,
          issues: payload.issues,
          prescriptions: payload.prescriptions,
          forceRegenerate: payload.forceRegenerate,
          reportTemplate: job.report_template,
          visibility: job.visibility,
          environment: job.environment,
          enableComparison: payload.enableComparison,
          mode: "stream",
          backgroundRun: false,
          aiProvider: payload.aiProvider ?? "auto",
          appVersion: payload.appVersion,
          traceId,
        }),
        signal: controller.signal,
      });
      log("internal_fetch_headers", { status: resp.status, contentType: resp.headers.get("Content-Type") || "" });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`Pipeline interno falhou (${resp.status}): ${errText.slice(0, 200)}`);
      }

      const ct = resp.headers.get("Content-Type") || "";
      if (ct.includes("application/json")) {
        const j = await resp.json().catch(() => null);
        if (j?.skipped && !payload.forceRegenerate) {
          log("internal_skipped_retry_force");
          // Refaz com forceRegenerate=true automaticamente
          const r2 = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: job.auth_jwt,
              "x-trace-id": traceId,
            },
            body: JSON.stringify({
              jobId,
              assessmentId: job.assessment_id,
              destinationName: job.destination_name,
              pillarScores: payload.pillarScores,
              issues: payload.issues,
              prescriptions: payload.prescriptions,
              forceRegenerate: true,
              reportTemplate: job.report_template,
              visibility: job.visibility,
              environment: job.environment,
              enableComparison: payload.enableComparison,
              mode: "stream",
              backgroundRun: false,
              aiProvider: payload.aiProvider ?? "auto",
              appVersion: payload.appVersion,
              traceId,
            }),
            signal: controller.signal,
          });
          if (!r2.ok) {
            const errText = await r2.text().catch(() => "");
            throw new Error(`Pipeline retry falhou (${r2.status}): ${errText.slice(0, 200)}`);
          }
          if (r2.body) {
            const reader = r2.body.getReader();
            while (true) {
              const { done } = await reader.read();
              if (done) break;
              lastChunkAt = Date.now();
            }
          }
        } else if (j?.reportId) {
          reportId = j.reportId;
          log("internal_returned_json_reportId", { reportId });
        } else if (j?.skipped && payload.forceRegenerate) {
          if (j.reportId) reportId = j.reportId;
        }
      } else if (resp.body) {
        log("drain_stream_start");
        const reader = resp.body.getReader();
        let chunks = 0;
        while (true) {
          const { done } = await reader.read();
          if (done) break;
          chunks++;
          lastChunkAt = Date.now();
        }
        log("drain_stream_done", { chunks });
      }

      // Polling do report salvo (o stream persiste via background task interno)
      if (!reportId) {
        log("poll_generated_report_start");
        for (let i = 0; i < 30; i++) {
          const { data: row } = await supabaseAdmin
            .from("generated_reports")
            .select("id, created_at")
            .eq("assessment_id", job.assessment_id)
            .gte("created_at", new Date(taskStart - 5000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (row?.id) { reportId = row.id; break; }
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!reportId) {
          throw new Error("Pipeline terminou sem salvar o relatório dentro da janela de polling.");
        }
        log("poll_generated_report_found", { reportId });
      }

      await supabaseAdmin.from("report_jobs").update({
        status: "completed",
        stage: `[trace=${traceId}] Concluído`,
        progress_pct: 100,
        report_id: reportId,
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      log("worker_completed");

      return new Response(JSON.stringify({ ok: true, jobId, reportId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (taskErr) {
      // Recovery: relatório pode ter sido salvo mesmo com abort
      const { data: row } = await supabaseAdmin
        .from("generated_reports")
        .select("id, created_at")
        .eq("assessment_id", job.assessment_id)
        .gte("created_at", new Date(taskStart - 5000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (row?.id) {
        reportId = row.id;
        log("worker_recovered_after_abort", { reportId });
        await supabaseAdmin.from("report_jobs").update({
          status: "completed",
          stage: `[trace=${traceId}] Concluído (recuperado após abort)`,
          progress_pct: 100,
          report_id: reportId,
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        return new Response(JSON.stringify({ ok: true, recovered: true, jobId, reportId }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logErr("worker_failed", taskErr, { last_stage: lastStage, attempts });
      const msg = taskErr instanceof Error ? taskErr.message : String(taskErr);

      if (attempts < MAX_ATTEMPTS) {
        // Reenfileira para nova tentativa (o trigger DB não vai re-disparar
        // automaticamente porque é AFTER INSERT; usamos requeue + dispatch manual).
        log("worker_retry_scheduled", { attempts });
        await supabaseAdmin.from("report_jobs").update({
          status: "queued",
          stage: `[trace=${traceId}] Reenfileirado após falha (tentativa ${attempts}/${MAX_ATTEMPTS})`,
          error_message: `[trace=${traceId}][last_stage=${lastStage}] ${msg}`,
        }).eq("id", jobId);
        // Dispara a si mesmo via fetch (fire-and-forget)
        fetch(`${supabaseUrl}/functions/v1/process-report-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ jobId }),
        }).catch(() => {});
        return new Response(JSON.stringify({ ok: false, retried: true }), {
          status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("report_jobs").update({
        status: "failed",
        stage: `[trace=${traceId}] Falhou após ${attempts} tentativas`,
        error_message: `[trace=${traceId}][last_stage=${lastStage}][attempts=${attempts}] ${msg}`,
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      clearInterval(watchdog);
      clearInterval(progressTimer);
    }
  } catch (outerErr) {
    logErr("worker_outer_error", outerErr);
    if (jobId) {
      try {
        await supabaseAdmin.from("report_jobs").update({
          status: "failed",
          error_message: `[trace=${traceId}][outer] ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`,
          finished_at: new Date().toISOString(),
        }).eq("id", jobId);
      } catch { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: outerErr instanceof Error ? outerErr.message : String(outerErr) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
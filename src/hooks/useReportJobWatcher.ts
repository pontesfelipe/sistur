// v1.38.55 — Watcher resiliente de jobs de relatório.
//
// Objetivo: garantir que o usuário SAIBA quando um relatório terminou,
// mesmo se ele:
//   - fechou o diálogo de geração;
//   - mudou de página dentro do app;
//   - fechou a aba e voltou minutos depois.
//
// Como funciona:
//   1) Quando uma geração é enfileirada, chame `track(jobId, assessmentId)`.
//      Isso persiste o jobId em localStorage (chave por usuário) e dispara
//      polling em background contra `report_jobs` a cada 5s.
//   2) Se a página recarregar com um job pendente em localStorage, o hook
//      ressuscita o polling automaticamente ao montar.
//   3) Quando o job termina (completed/failed), emite:
//      - toast (sempre)
//      - Notification do navegador (se o usuário deu permissão)
//      - invalida queries `generated-reports` e `destinations-with-report-data`
//   4) Limpa o registro do localStorage e desliga o polling.

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'sistur:pendingReportJobs';
const POLL_INTERVAL_MS = 5_000;
const STALE_HOURS = 2; // Após 2h, descartamos sem alarmar — algo deu errado.

type PendingJob = {
  jobId: string;
  assessmentId: string;
  destinationName?: string;
  startedAt: number;
};

function readPending(): PendingJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter((j: PendingJob) =>
      typeof j?.jobId === 'string' &&
      typeof j?.assessmentId === 'string' &&
      typeof j?.startedAt === 'number' &&
      now - j.startedAt < STALE_HOURS * 3600 * 1000
    );
  } catch {
    return [];
  }
}

function writePending(jobs: PendingJob[]) {
  try {
    if (jobs.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch { /* ignore quota */ }
}

function removePending(jobId: string) {
  writePending(readPending().filter((j) => j.jobId !== jobId));
}

function addPending(entry: PendingJob) {
  const current = readPending().filter((j) => j.jobId !== entry.jobId);
  current.push(entry);
  writePending(current);
}

async function maybeNotify(title: string, body: string) {
  if (typeof Notification === 'undefined') return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'sistur-report' });
    }
  } catch { /* ignore */ }
}

/** Pede permissão de notificação ao usuário (uma vez). Silencioso se já decidido. */
export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  }
  return Notification.permission;
}

export function useReportJobWatcher() {
  const queryClient = useQueryClient();
  const pollersRef = useRef<Map<string, number>>(new Map());

  const stopPolling = useCallback((jobId: string) => {
    const handle = pollersRef.current.get(jobId);
    if (handle !== undefined) {
      window.clearInterval(handle);
      pollersRef.current.delete(jobId);
    }
  }, []);

  const pollOnce = useCallback(async (entry: PendingJob) => {
    const { data: job } = await supabase
      .from('report_jobs')
      .select('status, report_id, error_message, created_at, started_at, finished_at')
      .eq('id', entry.jobId)
      .maybeSingle();
    if (!job) return;
    const startedAt = job.started_at ? new Date(job.started_at).getTime() : entry.startedAt;
    const ageMs = Date.now() - startedAt;
    if (job.status === 'processing' && !job.finished_at && ageMs > 16 * 60 * 1000) {
      stopPolling(entry.jobId);
      removePending(entry.jobId);
      const dest = entry.destinationName || 'Diagnóstico';
      const msg = `Geração de ${dest} excedeu o tempo limite`;
      toast.error(msg, {
        description: 'O job ficou preso no servidor. Tente gerar novamente; se persistir, o histórico mostrará a falha técnica.',
        duration: 12_000,
      });
      void maybeNotify('SISTUR — Relatório não concluído', msg);
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      queryClient.invalidateQueries({ queryKey: ['destinations-with-report-data'] });
      return;
    }
    if (job.status === 'completed') {
      stopPolling(entry.jobId);
      removePending(entry.jobId);
      const dest = entry.destinationName || 'Diagnóstico';
      const msg = `Relatório de ${dest} pronto`;
      toast.success(msg, {
        description: 'Geração concluída em segundo plano. Abra a aba Relatórios para visualizar.',
        duration: 10_000,
      });
      void maybeNotify('SISTUR — Relatório pronto', msg);
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      queryClient.invalidateQueries({ queryKey: ['destinations-with-report-data'] });
    } else if (job.status === 'failed') {
      stopPolling(entry.jobId);
      removePending(entry.jobId);
      const dest = entry.destinationName || 'Diagnóstico';
      const msg = `Falha ao gerar relatório de ${dest}`;
      toast.error(msg, {
        description: job.error_message?.slice(0, 200) || 'Tente novamente.',
        duration: 12_000,
      });
      void maybeNotify('SISTUR — Falha no relatório', msg);
    }
  }, [queryClient, stopPolling]);

  const startPolling = useCallback((entry: PendingJob) => {
    if (pollersRef.current.has(entry.jobId)) return;
    // Disparo imediato + intervalo
    void pollOnce(entry);
    const handle = window.setInterval(() => { void pollOnce(entry); }, POLL_INTERVAL_MS);
    pollersRef.current.set(entry.jobId, handle);
  }, [pollOnce]);

  /** Registra um job para ser observado em background até concluir/falhar. */
  const track = useCallback((jobId: string, assessmentId: string, destinationName?: string) => {
    const entry: PendingJob = { jobId, assessmentId, destinationName, startedAt: Date.now() };
    addPending(entry);
    startPolling(entry);
  }, [startPolling]);

  // Ao montar (qualquer página que use o hook), ressuscita pollers de jobs salvos.
  useEffect(() => {
    const pending = readPending();
    pending.forEach(startPolling);
    return () => {
      pollersRef.current.forEach((handle) => window.clearInterval(handle));
      pollersRef.current.clear();
    };
  }, [startPolling]);

  return { track };
}
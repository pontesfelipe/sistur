// v1.38.55 — Monta o watcher global de jobs de relatório.
//
// Ressuscita o polling de qualquer job pendente em localStorage assim que o
// app carrega (após login). Não renderiza nada visualmente — apenas dispara
// o efeito do hook que gerencia pollers e toasts/Notifications de conclusão.

import { useReportJobWatcher } from '@/hooks/useReportJobWatcher';

export function ReportJobWatcherMount() {
  useReportJobWatcher();
  return null;
}
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CheckResult {
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration_ms: number;
  details?: Record<string, unknown>;
}

interface HealthCheckRun {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: CheckResult[];
  triggered_by: string | null;
}

export function useHealthCheck() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<HealthCheckRun | null>(null);
  const [history, setHistory] = useState<HealthCheckRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const runHealthCheck = useCallback(async () => {
    if (!user?.id) return;
    setRunning(true);
    toast.info('Iniciando verificação de saúde do sistema...');

    try {
      const { data, error } = await supabase.functions.invoke('run-health-check', {
        body: { triggered_by: user.id, run_type: 'manual' },
      });

      if (error) throw error;
      setLatestRun(data);

      if (data.failed > 0) {
        toast.error(`Verificação concluída: ${data.failed} falha(s) encontrada(s)`);
      } else if (data.warnings > 0) {
        toast.warning(`Verificação concluída: ${data.warnings} aviso(s)`);
      } else {
        toast.success(`Verificação concluída: ${data.passed}/${data.total_checks} aprovados`);
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      toast.error('Erro ao executar verificação de saúde');
    } finally {
      setRunning(false);
    }
  }, [user?.id]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory((data as unknown as HealthCheckRun[]) || []);
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  return {
    running,
    latestRun,
    history,
    loadingHistory,
    runHealthCheck,
    fetchHistory,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { APP_VERSION } from '@/config/version';

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

interface SyncLog {
  id: string;
  app_version: string;
  total_tests: number;
  tests_added: number;
  tests_removed: number;
  status: string;
  synced_at: string;
}

export function useHealthCheck() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [latestRun, setLatestRun] = useState<HealthCheckRun | null>(null);
  const [history, setHistory] = useState<HealthCheckRun[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [registryCount, setRegistryCount] = useState(0);

  const syncRegistry = useCallback(async () => {
    setSyncing(true);
    toast.info('Sincronizando registro de testes...');
    try {
      const { data, error } = await supabase.functions.invoke('sync-test-registry', {
        body: { app_version: APP_VERSION.full },
      });
      if (error) throw error;
      toast.success(`Registro sincronizado: ${data.total_tests} testes (${data.added} novos)`);
      setRegistryCount(data.total_tests);
      // Refresh last sync
      fetchLastSync();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar registro de testes');
    } finally {
      setSyncing(false);
    }
  }, []);

  const fetchLastSync = useCallback(async () => {
    const { data } = await supabase
      .from('test_registry_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(1);
    if (data?.[0]) setLastSync(data[0] as unknown as SyncLog);
  }, []);

  const fetchRegistryCount = useCallback(async () => {
    const { count } = await supabase
      .from('test_flow_registry')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    setRegistryCount(count || 0);
  }, []);

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
    // Also fetch sync info
    fetchLastSync();
    fetchRegistryCount();
  }, [fetchLastSync, fetchRegistryCount]);

  return {
    running,
    syncing,
    latestRun,
    history,
    lastSync,
    registryCount,
    loadingHistory,
    runHealthCheck,
    syncRegistry,
    fetchHistory,
  };
}

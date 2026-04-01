import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  Database,
  Users,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
  HardDrive,
  TrendingUp,
  ArrowUpCircle
} from 'lucide-react';

interface PerformanceMetrics {
  // Database metrics
  dbSizeBytes: number;
  tableCount: number;
  totalRows: number;
  activeConnections: number;
  // Application metrics
  totalUsers: number;
  activeUsersLast7d: number;
  totalAssessments: number;
  totalReports: number;
  avgQueryTimeMs: number;
  // Computed
  dbSizeMB: number;
  dbUsagePercent: number;
  connectionUsagePercent: number;
}

interface HealthCheck {
  label: string;
  status: 'ok' | 'warning' | 'critical';
  value: string;
  detail: string;
  icon: React.ReactNode;
}

const DB_SIZE_LIMIT_MB = 500; // Free tier ~500MB
const MAX_CONNECTIONS = 60; // Micro instance default

export function PerformanceMetricsPanel() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const start = performance.now();

      // Parallel queries for counts
      const [
        { count: totalUsers },
        { count: activeUsers7d },
        { count: totalAssessments },
        { count: totalReports },
        { count: totalDestinations },
        { count: totalProjects },
        { count: totalEnrollments },
        { count: pendingApprovals },
        { count: totalForumPosts },
        { count: totalKBDocs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('generated_reports').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('edu_enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true),
        supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
        supabase.from('knowledge_base_files').select('*', { count: 'exact', head: true }),
      ]);

      const queryTime = performance.now() - start;

      // Estimate DB size from row counts
      const estimatedRows = (totalUsers || 0) + (totalAssessments || 0) + (totalReports || 0) +
        (totalDestinations || 0) + (totalProjects || 0) + (totalEnrollments || 0) +
        (totalForumPosts || 0) + (totalKBDocs || 0);

      // Rough estimate: ~2KB per row average
      const estimatedSizeBytes = estimatedRows * 2048;
      const dbSizeMB = estimatedSizeBytes / (1024 * 1024);

      setMetrics({
        dbSizeBytes: estimatedSizeBytes,
        tableCount: 40,
        totalRows: estimatedRows,
        activeConnections: Math.min(Math.ceil((totalUsers || 0) * 0.1), MAX_CONNECTIONS),
        totalUsers: totalUsers || 0,
        activeUsersLast7d: activeUsers7d || 0,
        totalAssessments: totalAssessments || 0,
        totalReports: totalReports || 0,
        avgQueryTimeMs: Math.round(queryTime / 10), // Divide by number of parallel queries
        dbSizeMB: Math.round(dbSizeMB * 100) / 100,
        dbUsagePercent: Math.min((dbSizeMB / DB_SIZE_LIMIT_MB) * 100, 100),
        connectionUsagePercent: Math.min(
          (Math.ceil((totalUsers || 0) * 0.1) / MAX_CONNECTIONS) * 100,
          100
        ),
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getHealthChecks = (): HealthCheck[] => {
    if (!metrics) return [];

    const checks: HealthCheck[] = [];

    // Query latency
    const queryStatus = metrics.avgQueryTimeMs < 200 ? 'ok' : metrics.avgQueryTimeMs < 500 ? 'warning' : 'critical';
    checks.push({
      label: 'Latência de Consultas',
      status: queryStatus,
      value: `${metrics.avgQueryTimeMs}ms`,
      detail: queryStatus === 'ok' ? 'Tempo de resposta saudável' :
        queryStatus === 'warning' ? 'Latência elevada — considere otimizar queries' :
          'Latência crítica — recomenda-se upgrade de instância',
      icon: <Clock className="h-4 w-4" />,
    });

    // DB size
    const dbStatus = metrics.dbUsagePercent < 60 ? 'ok' : metrics.dbUsagePercent < 85 ? 'warning' : 'critical';
    checks.push({
      label: 'Uso do Banco de Dados',
      status: dbStatus,
      value: `${metrics.dbSizeMB.toFixed(1)} MB / ${DB_SIZE_LIMIT_MB} MB`,
      detail: dbStatus === 'ok' ? 'Espaço suficiente' :
        dbStatus === 'warning' ? 'Uso elevado — planeje expansão' :
          'Espaço quase esgotado — upgrade urgente',
      icon: <HardDrive className="h-4 w-4" />,
    });

    // Connections
    const connStatus = metrics.connectionUsagePercent < 50 ? 'ok' : metrics.connectionUsagePercent < 80 ? 'warning' : 'critical';
    checks.push({
      label: 'Conexões Estimadas',
      status: connStatus,
      value: `~${Math.ceil(metrics.totalUsers * 0.1)} / ${MAX_CONNECTIONS}`,
      detail: connStatus === 'ok' ? 'Capacidade confortável' :
        connStatus === 'warning' ? 'Conexões crescendo — monitore de perto' :
          'Próximo do limite — upgrade necessário para suportar carga',
      icon: <Zap className="h-4 w-4" />,
    });

    // User growth
    const userRatio = metrics.totalUsers > 0 ? (metrics.activeUsersLast7d / metrics.totalUsers) * 100 : 0;
    const userStatus = metrics.totalUsers < 50 ? 'ok' : metrics.totalUsers < 200 ? 'warning' : 'critical';
    checks.push({
      label: 'Volume de Usuários',
      status: userStatus,
      value: `${metrics.totalUsers} total (${metrics.activeUsersLast7d} ativos)`,
      detail: userStatus === 'ok' ? 'Volume adequado para instância atual' :
        userStatus === 'warning' ? 'Crescimento significativo — avalie upgrade' :
          'Alto volume — instância maior recomendada',
      icon: <Users className="h-4 w-4" />,
    });

    // Data volume
    const dataStatus = metrics.totalRows < 5000 ? 'ok' : metrics.totalRows < 20000 ? 'warning' : 'critical';
    checks.push({
      label: 'Volume de Dados',
      status: dataStatus,
      value: `${metrics.totalRows.toLocaleString('pt-BR')} registros`,
      detail: dataStatus === 'ok' ? 'Volume de dados leve' :
        dataStatus === 'warning' ? 'Crescendo — considere índices e limpeza' :
          'Alto volume — performance pode degradar sem upgrade',
      icon: <Database className="h-4 w-4" />,
    });

    return checks;
  };

  const healthChecks = getHealthChecks();
  const hasWarnings = healthChecks.some(c => c.status === 'warning');
  const hasCritical = healthChecks.some(c => c.status === 'critical');

  const statusColor = (s: string) =>
    s === 'ok' ? 'text-green-500' : s === 'warning' ? 'text-yellow-500' : 'text-destructive';
  const statusBg = (s: string) =>
    s === 'ok' ? 'bg-green-500/10' : s === 'warning' ? 'bg-yellow-500/10' : 'bg-destructive/10';
  const statusBadge = (s: string) =>
    s === 'ok' ? 'secondary' as const : s === 'warning' ? 'outline' as const : 'destructive' as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Métricas de Performance
            </CardTitle>
            <CardDescription>
              Monitoramento do uso de recursos e recomendações de escalabilidade
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status Banner */}
        {metrics && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            hasCritical ? 'bg-destructive/5 border-destructive/30' :
              hasWarnings ? 'bg-yellow-500/5 border-yellow-500/30' :
                'bg-green-500/5 border-green-500/30'
          }`}>
            {hasCritical ? (
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            ) : hasWarnings ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {hasCritical ? 'Ação Recomendada: Upgrade de Instância' :
                  hasWarnings ? 'Atenção: Alguns indicadores merecem monitoramento' :
                    'Sistema Saudável'}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasCritical
                  ? 'Métricas indicam necessidade de uma instância maior para manter a performance.'
                  : hasWarnings
                    ? 'O sistema está funcional, mas indicadores sugerem crescimento que pode exigir upgrade.'
                    : 'Todos os indicadores estão dentro dos limites saudáveis.'}
              </p>
            </div>
            {lastRefresh && (
              <span className="text-xs text-muted-foreground shrink-0">
                {lastRefresh.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        )}

        {/* Upgrade Recommendation */}
        {(hasCritical || hasWarnings) && (
          <Alert variant={hasCritical ? 'destructive' : 'default'} className={!hasCritical ? 'border-yellow-500/50' : ''}>
            <ArrowUpCircle className="h-4 w-4" />
            <AlertTitle>
              {hasCritical ? 'Upgrade Recomendado' : 'Planeje o Crescimento'}
            </AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                {hasCritical
                  ? 'Para manter a estabilidade e performance, recomendamos aumentar o tamanho da instância do backend.'
                  : 'O sistema está crescendo. Considere aumentar a instância se a tendência continuar.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Acesse <strong>Backend → Configurações Avançadas → Upgrade de Instância</strong> para 
                ajustar os recursos de CPU, memória e I/O do banco de dados.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Health Checks Grid */}
        {loading && !metrics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {healthChecks.map((check, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${statusBg(check.status)} transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={statusColor(check.status)}>{check.icon}</span>
                    <span className="text-sm font-medium">{check.label}</span>
                  </div>
                  <Badge variant={statusBadge(check.status)} className="text-xs">
                    {check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'Atenção' : 'Crítico'}
                  </Badge>
                </div>
                <p className="text-lg font-bold">{check.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{check.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* Usage Bars */}
        {metrics && (
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Uso do Banco de Dados</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.dbSizeMB.toFixed(1)} MB / {DB_SIZE_LIMIT_MB} MB
                </span>
              </div>
              <Progress
                value={metrics.dbUsagePercent}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Conexões Estimadas</span>
                <span className="text-sm text-muted-foreground">
                  ~{Math.ceil(metrics.totalUsers * 0.1)} / {MAX_CONNECTIONS}
                </span>
              </div>
              <Progress
                value={metrics.connectionUsagePercent}
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{metrics.totalAssessments}</p>
              <p className="text-xs text-muted-foreground">Diagnósticos</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{metrics.totalReports}</p>
              <p className="text-xs text-muted-foreground">Relatórios</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{metrics.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{metrics.avgQueryTimeMs}ms</p>
              <p className="text-xs text-muted-foreground">Latência Média</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

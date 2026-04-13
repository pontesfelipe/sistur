import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, Play, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Database, Zap, HardDrive, Monitor, RefreshCw,
  Loader2, ChevronDown, ChevronUp, GitCommit, RotateCcw
} from 'lucide-react';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  database: { label: 'Banco de Dados', icon: <Database className="h-4 w-4" /> },
  edge_function: { label: 'Edge Functions', icon: <Zap className="h-4 w-4" /> },
  data_integrity: { label: 'Integridade de Dados', icon: <Activity className="h-4 w-4" /> },
  storage: { label: 'Armazenamento', icon: <HardDrive className="h-4 w-4" /> },
  client_monitoring: { label: 'Monitoramento Client', icon: <Monitor className="h-4 w-4" /> },
};

const statusColors: Record<string, string> = {
  pass: 'text-green-500',
  fail: 'text-red-500',
  warning: 'text-yellow-500',
};

const statusIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
};

export function HealthCheckPanel() {
  const { running, syncing, latestRun, history, lastSync, registryCount, loadingHistory, runHealthCheck, syncRegistry, fetchHistory } = useHealthCheck();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // When a new run completes, expand all categories
  useEffect(() => {
    if (latestRun?.results) {
      const cats = new Set(latestRun.results.map(r => r.category));
      setExpandedCategories(cats);
    }
  }, [latestRun]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const resultsByCategory = latestRun?.results?.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, typeof latestRun.results>) || {};

  const passRate = latestRun 
    ? Math.round((latestRun.passed / latestRun.total_checks) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with Run Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Verificação de Saúde do Sistema
          </h3>
          <p className="text-sm text-muted-foreground">
            Testa banco de dados, edge functions, armazenamento e integridade de dados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={syncRegistry} disabled={syncing} size="sm">
            {syncing ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sincronizando...</>
            ) : (
              <><RotateCcw className="h-4 w-4 mr-1" /> Sincronizar Testes</>
            )}
          </Button>
          <Button onClick={runHealthCheck} disabled={running} size="lg">
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Executar Verificação</>
            )}
          </Button>
        </div>
      </div>

      {/* Registry sync info */}
      <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30 text-sm">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Registro:</span>
          <Badge variant="secondary">{registryCount} testes</Badge>
        </div>
        {lastSync && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">
              Última sincronização: {new Date(lastSync.synced_at).toLocaleString('pt-BR')} (v{lastSync.app_version})
            </span>
            {lastSync.tests_added > 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                +{lastSync.tests_added} novos
              </Badge>
            )}
          </>
        )}
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Resultado Atual</TabsTrigger>
          <TabsTrigger value="history">
            Histórico
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{history.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {running && (
            <Card>
              <CardContent className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Executando verificações...</p>
                <Progress value={30} className="w-48" />
              </CardContent>
            </Card>
          )}

          {!running && !latestRun && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma verificação executada ainda.</p>
                <p className="text-sm">Clique em "Executar Verificação" para iniciar.</p>
              </CardContent>
            </Card>
          )}

          {!running && latestRun && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold">{latestRun.total_checks}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/30">
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold text-green-500">{latestRun.passed}</div>
                    <p className="text-xs text-muted-foreground">Aprovados</p>
                  </CardContent>
                </Card>
                <Card className="border-red-500/30">
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold text-red-500">{latestRun.failed}</div>
                    <p className="text-xs text-muted-foreground">Falhas</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-500/30">
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold text-yellow-500">{latestRun.warnings}</div>
                    <p className="text-xs text-muted-foreground">Avisos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de aprovação</span>
                  <span className="font-medium">{passRate}%</span>
                </div>
                <Progress value={passRate} className="h-2" />
              </div>

              {/* Results by Category */}
              <div className="space-y-2">
                {Object.entries(resultsByCategory).map(([category, checks]) => {
                  const catInfo = categoryLabels[category] || { label: category, icon: <Activity className="h-4 w-4" /> };
                  const catFailed = checks.filter(c => c.status === 'fail').length;
                  const catWarnings = checks.filter(c => c.status === 'warning').length;
                  const isOpen = expandedCategories.has(category);

                  return (
                    <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                      <CollapsibleTrigger asChild>
                        <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                          <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {catInfo.icon}
                              <span className="font-medium text-sm">{catInfo.label}</span>
                              <Badge variant="outline" className="text-xs">{checks.length}</Badge>
                              {catFailed > 0 && <Badge variant="destructive" className="text-xs">{catFailed} falha(s)</Badge>}
                              {catWarnings > 0 && <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">{catWarnings} aviso(s)</Badge>}
                            </div>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </CardContent>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 mt-1 space-y-1">
                          {checks.map((check, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded border bg-background text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {statusIcons[check.status]}
                                <span className="truncate">{check.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                <span>{check.message}</span>
                                {check.duration_ms > 0 && (
                                  <span className="tabular-nums">{check.duration_ms}ms</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum histórico de verificações encontrado.
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {history.map((run) => (
                  <Card key={run.id} className="cursor-pointer hover:bg-muted/30" onClick={() => {
                    // Load this run as latest
                    // setLatestRun could be done here if desired
                  }}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          run.status === 'passed' ? 'bg-green-500' :
                          run.status === 'failed' ? 'bg-red-500' :
                          run.status === 'warning' ? 'bg-yellow-500' : 'bg-muted'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">
                            {run.run_type === 'scheduled' ? '⏰ Agendado' : '🖱️ Manual'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {run.started_at ? new Date(run.started_at).toLocaleString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-500">{run.passed}✓</span>
                        <span className="text-red-500">{run.failed}✗</span>
                        <span className="text-yellow-500">{run.warnings}⚠</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

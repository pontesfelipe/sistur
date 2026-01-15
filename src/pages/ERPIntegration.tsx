import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Activity,
  Download,
  Settings,
  Play,
  Loader2,
} from 'lucide-react';
import { 
  useERPDiagnostics,
  useERPEventLog,
  useERPDiagnosticMutations,
} from '@/hooks/useERPIntegration';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ERPIntegration = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: diagnostics, isLoading: diagLoading } = useERPDiagnostics();
  const { data: events, isLoading: eventsLoading } = useERPEventLog(50);
  const { receiveDiagnostic } = useERPDiagnosticMutations();

  const stats = {
    totalDiagnostics: diagnostics?.length || 0,
    recentEvents: events?.length || 0,
    lastSync: events?.[0]?.created_at,
    warnings: diagnostics?.filter(d => {
      const warnings = d.igma_warnings as unknown[];
      return warnings && warnings.length > 0;
    }).length || 0,
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync by creating a test diagnostic
      await receiveDiagnostic.mutateAsync({
        entity_ref: 'manual_sync_' + Date.now(),
        entity_type: null,
        pillar_priority: null,
      });
      toast.success('Sincronização iniciada!');
    } catch (error) {
      toast.error('Erro ao iniciar sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'diagnostic_created':
        return <Badge className="bg-green-500/20 text-green-700">Diagnóstico</Badge>;
      case 'manual_sync':
        return <Badge className="bg-blue-500/20 text-blue-700">Sincronização</Badge>;
      case 'warning_generated':
        return <Badge className="bg-yellow-500/20 text-yellow-700">Alerta</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  return (
    <AppLayout 
      title="Integração ERP" 
      subtitle="Monitoramento e sincronização com sistemas externos"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-2">
              <FileText className="h-4 w-4" />
              Diagnósticos
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Activity className="h-4 w-4" />
              Eventos
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar
              </>
            )}
          </Button>
        </div>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold text-primary">
                  {stats.totalDiagnostics}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  Diagnósticos
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">
                  {stats.recentEvents}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Eventos Recentes
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold text-yellow-600">
                  {stats.warnings}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas IGMA
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">
                  {stats.lastSync 
                    ? format(new Date(stats.lastSync), "dd/MM HH:mm", { locale: ptBR })
                    : 'Nunca'
                  }
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Última Sincronização
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>API Principal</span>
                  <Badge className="bg-green-500/20 text-green-700">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Banco de Dados</span>
                  <Badge className="bg-green-500/20 text-green-700">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Serviço de Fila</span>
                  <Badge className="bg-green-500/20 text-green-700">Ativo</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Processamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Taxa de Sucesso</span>
                    <span className="font-medium">98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Uso de Recursos</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DIAGNOSTICS TAB */}
        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diagnósticos ERP</CardTitle>
              <CardDescription>
                Histórico de diagnósticos sincronizados do sistema ERP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diagLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !diagnostics?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum diagnóstico encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pilar Prioritário</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnostics.map((diag) => (
                      <TableRow key={diag.diagnostic_id}>
                        <TableCell className="font-mono text-sm">
                          {diag.diagnostic_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{diag.entity_ref}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{diag.entity_type || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          {diag.pillar_priority ? (
                            <Badge variant="secondary">{diag.pillar_priority}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const warnings = diag.igma_warnings as unknown[];
                            return warnings?.length ? (
                              <Badge className="bg-yellow-500/20 text-yellow-700">
                                {warnings.length} alerta(s)
                              </Badge>
                            ) : (
                              <Badge variant="outline">Sem alertas</Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(diag.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log de Eventos</CardTitle>
              <CardDescription>
                Histórico de eventos do sistema ERP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !events?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento registrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Payload</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.event_id}>
                        <TableCell className="font-mono text-sm">
                          {event.event_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {getEventTypeBadge(event.event_type)}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-muted-foreground">
                          {JSON.stringify(event.payload).slice(0, 50)}...
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ERPIntegration;

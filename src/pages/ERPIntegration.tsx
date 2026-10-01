import { getDateLocale } from '@/i18n/dateLocale';
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

import { tx } from "@/i18n/t";
const ERPIntegration = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: diagnostics, isLoading: diagLoading } = useERPDiagnostics();
  const { data: events, isLoading: eventsLoading } = useERPEventLog(50);
  const { receiveDiagnostic } = useERPDiagnosticMutations();

  // Defensive helper: Supabase types `igma_warnings` as Json, so runtime values
  // could be null, an object, or a stringified array. Always validate shape
  // before calling .length to avoid rendering crashes.
  const getWarnings = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : []);

  const stats = {
    totalDiagnostics: diagnostics?.length || 0,
    recentEvents: events?.length || 0,
    lastSync: events?.[0]?.created_at,
    warnings: diagnostics?.filter(d => getWarnings(d.igma_warnings).length > 0).length || 0,
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
      toast.success(tx('Sincronização iniciada!'));
    } catch (error) {
      toast.error(tx('Erro ao iniciar sincronização'));
    } finally {
      setIsSyncing(false);
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'diagnostic_created':
        return <Badge className="bg-green-500/20 text-green-700">{tx("Diagnóstico")}</Badge>;
      case 'manual_sync':
        return <Badge className="bg-blue-500/20 text-blue-700">{tx("Sincronização")}</Badge>;
      case 'warning_generated':
        return <Badge className="bg-yellow-500/20 text-yellow-700">{tx("Alerta")}</Badge>;
      case 'error':
        return <Badge variant="destructive">{tx("Erro")}</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  return (
    <AppLayout 
      title={tx("Integração com Sistemas Externos")} 
      subtitle={tx("Monitoramento e sincronização com sistemas externos")}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {tx("Visão Geral")}
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-2">
              <FileText className="h-4 w-4" />
              {tx("Diagnósticos")}
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Activity className="h-4 w-4" />
              {tx("Eventos")}
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tx("Sincronizando...")}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {tx("Sincronizar")}
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
                  {tx("Diagnósticos")}
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
                  {tx("Eventos Recentes")}
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
                  {tx("Alertas IGMA")}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">
                  {stats.lastSync 
                    ? format(new Date(stats.lastSync), "dd/MM HH:mm", { locale: getDateLocale() })
                    : 'Nunca'
                  }
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {tx("Última Sincronização")}
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
                  {tx("Status da Conexão")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>{tx("API Principal")}</span>
                  <Badge className="bg-green-500/20 text-green-700">{tx("Online")}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>{tx("Banco de Dados")}</span>
                  <Badge className="bg-green-500/20 text-green-700">{tx("Conectado")}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>{tx("Serviço de Fila")}</span>
                  <Badge className="bg-green-500/20 text-green-700">{tx("Ativo")}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {tx("Processamento")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{tx("Taxa de Sucesso")}</span>
                    <span className="font-medium">98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{tx("Uso de Recursos")}</span>
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
              <CardTitle>{tx("Diagnósticos Externos")}</CardTitle>
              <CardDescription>
                {tx("Histórico de diagnósticos sincronizados de sistemas externos")}
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
                  <p>{tx("Nenhum diagnóstico encontrado")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{tx("Entidade")}</TableHead>
                      <TableHead>{tx("Tipo")}</TableHead>
                      <TableHead>{tx("Pilar Prioritário")}</TableHead>
                      <TableHead>{tx("Alertas")}</TableHead>
                      <TableHead>{tx("Data")}</TableHead>
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
                            const warnings = getWarnings(diag.igma_warnings);
                            return warnings.length ? (
                              <Badge className="bg-yellow-500/20 text-yellow-700">
                                {warnings.length} alerta(s)
                              </Badge>
                            ) : (
                              <Badge variant="outline">{tx("Sem alertas")}</Badge>
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
              <CardTitle>{tx("Log de Eventos")}</CardTitle>
              <CardDescription>
                {tx("Histórico de eventos de integração")}
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
                  <p>{tx("Nenhum evento registrado")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{tx("Tipo")}</TableHead>
                      <TableHead>{tx("Payload")}</TableHead>
                      <TableHead>{tx("Data")}</TableHead>
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

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Shield,
  User,
  Clock,
  FileText,
  Activity,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Plus,
} from 'lucide-react';
import { useLMSAuditLogs, type LMSAuditLog } from '@/hooks/useLMSAudit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AuditLogs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LMSAuditLog | null>(null);
  
  const { data: logs, isLoading, refetch } = useLMSAuditLogs(500);

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = !searchQuery || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);
    
    return matchesSearch && matchesAction;
  }) || [];

  const stats = {
    total: logs?.length || 0,
    today: logs?.filter(l => {
      const logDate = new Date(l.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length || 0,
    actions: {
      create: logs?.filter(l => l.action.includes('create') || l.action.includes('insert')).length || 0,
      update: logs?.filter(l => l.action.includes('update') || l.action.includes('edit')).length || 0,
      delete: logs?.filter(l => l.action.includes('delete') || l.action.includes('remove')).length || 0,
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('insert')) return <Plus className="h-4 w-4 text-green-500" />;
    if (action.includes('update') || action.includes('edit')) return <Edit className="h-4 w-4 text-blue-500" />;
    if (action.includes('delete') || action.includes('remove')) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (action.includes('view') || action.includes('read')) return <Eye className="h-4 w-4 text-gray-500" />;
    if (action.includes('login')) return <LogIn className="h-4 w-4 text-green-500" />;
    if (action.includes('logout')) return <LogOut className="h-4 w-4 text-yellow-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('insert')) {
      return <Badge className="bg-green-500/20 text-green-700">Criar</Badge>;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <Badge className="bg-blue-500/20 text-blue-700">Editar</Badge>;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="destructive">Excluir</Badge>;
    }
    if (action.includes('view') || action.includes('read')) {
      return <Badge variant="secondary">Visualizar</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Usuário', 'IP', 'Data'],
      ...filteredLogs.map(log => [
        log.log_id,
        log.action,
        log.entity_type || '',
        log.entity_id || '',
        log.user_id || '',
        log.ip_address || '',
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AppLayout 
      title="Logs de Auditoria" 
      subtitle="Monitoramento de atividades do sistema LMS"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Total de Logs
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-primary">{stats.today}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Hoje
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-green-600">{stats.actions.create}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Criações
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-blue-600">{stats.actions.update}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Edit className="h-4 w-4" />
                Edições
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-red-600">{stats.actions.delete}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Trash2 className="h-4 w-4" />
                Exclusões
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar logs..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Edição</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="view">Visualização</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.log_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell>{getActionIcon(log.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action)}
                          <span className="text-sm text-muted-foreground">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.entity_type && (
                          <div>
                            <span className="font-medium">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="text-xs text-muted-foreground block font-mono">
                                {log.entity_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {log.user_id?.slice(0, 8) || 'Sistema'}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {filteredLogs.length > 100 && (
          <p className="text-center text-sm text-muted-foreground">
            Mostrando 100 de {filteredLogs.length} registros
          </p>
        )}

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Detalhes do Log
              </DialogTitle>
              <DialogDescription>
                Informações completas do registro de auditoria
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">ID do Log</span>
                    <p className="font-mono">{selectedLog.log_id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Ação</span>
                    <p className="flex items-center gap-2">
                      {getActionIcon(selectedLog.action)}
                      {selectedLog.action}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo de Entidade</span>
                    <p>{selectedLog.entity_type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">ID da Entidade</span>
                    <p className="font-mono">{selectedLog.entity_id || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Usuário</span>
                    <p className="font-mono">{selectedLog.user_id || 'Sistema'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Endereço IP</span>
                    <p className="font-mono">{selectedLog.ip_address || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">User Agent</span>
                    <p className="text-sm truncate">{selectedLog.user_agent || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Data/Hora</span>
                    <p>{format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                </div>
                
                {selectedLog.details && Object.keys(selectedLog.details as object).length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Detalhes Adicionais</span>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AuditLogs;

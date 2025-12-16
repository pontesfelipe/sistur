import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  UserCheck, 
  FileEdit, 
  Calculator, 
  MapPin,
  Clock,
  TrendingUp,
  Users,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata: unknown;
  created_at: string;
}

interface LoginEvent {
  user_id: string;
  full_name: string | null;
  last_login: string;
}

export function LogAnalytics() {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [recentLogins, setRecentLogins] = useState<LoginEvent[]>([]);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    totalDestinations: 0,
    calculatedAssessments: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch audit events
      const { data: events } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch stats
      const [
        { count: assessmentCount },
        { count: destinationCount },
        { count: calculatedCount },
        { data: profiles }
      ] = await Promise.all([
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('status', 'CALCULATED'),
        supabase.from('profiles').select('user_id, full_name, updated_at').order('updated_at', { ascending: false }).limit(10)
      ]);

      setAuditEvents(events || []);
      setRecentLogins(profiles?.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        last_login: p.updated_at
      })) || []);
      setStats({
        totalAssessments: assessmentCount || 0,
        totalDestinations: destinationCount || 0,
        calculatedAssessments: calculatedCount || 0,
        activeUsers: profiles?.length || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'assessment_created':
      case 'assessment_calculated':
        return <Calculator className="h-4 w-4" />;
      case 'destination_created':
        return <MapPin className="h-4 w-4" />;
      case 'user_login':
        return <UserCheck className="h-4 w-4" />;
      case 'data_updated':
        return <FileEdit className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'assessment_calculated':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'assessment_created':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'destination_created':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'user_login':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatEventType = (eventType: string) => {
    const translations: Record<string, string> = {
      'assessment_created': 'Diagnóstico Criado',
      'assessment_calculated': 'Diagnóstico Calculado',
      'destination_created': 'Destino Criado',
      'user_login': 'Login de Usuário',
      'data_updated': 'Dados Atualizados',
      'report_generated': 'Relatório Gerado'
    };
    return translations[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diagnósticos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.calculatedAssessments} calculados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDestinations}</div>
            <p className="text-xs text-muted-foreground">
              destinos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cálculo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAssessments > 0 
                ? Math.round((stats.calculatedAssessments / stats.totalAssessments) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              diagnósticos finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              recentemente ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Audit Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Eventos do Sistema
            </CardTitle>
            <CardDescription>
              Últimas atividades registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {auditEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>Nenhum evento registrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border ${getEventColor(event.event_type)}`}
                    >
                      <div className="mt-0.5">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {formatEventType(event.event_type)}
                          </p>
                          {event.entity_type && (
                            <Badge variant="outline" className="text-xs">
                              {event.entity_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(event.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuários Recentes
            </CardTitle>
            <CardDescription>
              Últimas atividades de usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {recentLogins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogins.map((login) => (
                    <div 
                      key={login.user_id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {login.full_name || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Último acesso: {format(new Date(login.last_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  UserCheck, 
  FileEdit, 
  Calculator, 
  MapPin,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  CalendarIcon,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
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

type DateRange = {
  from: Date;
  to: Date;
};

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
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Fetch audit events with date filter
      const { data: events } = await supabase
        .from('audit_events')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch stats with date filter
      const [
        { count: assessmentCount },
        { count: destinationCount },
        { count: calculatedCount },
        { data: profiles }
      ] = await Promise.all([
        supabase.from('assessments').select('*', { count: 'exact', head: true })
          .gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('destinations').select('*', { count: 'exact', head: true })
          .gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('assessments').select('*', { count: 'exact', head: true })
          .eq('status', 'CALCULATED')
          .gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('profiles').select('user_id, full_name, updated_at')
          .gte('updated_at', fromDate).lte('updated_at', toDate)
          .order('updated_at', { ascending: false }).limit(10)
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

  const handleQuickFilter = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
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
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal min-w-[140px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    disabled={(date) => date > dateRange.to || date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal min-w-[140px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    disabled={(date) => date < dateRange.from || date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleQuickFilter(7)}
                className={cn(
                  subDays(new Date(), 7).toDateString() === dateRange.from.toDateString() && 
                  "bg-primary/10 text-primary"
                )}
              >
                7 dias
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleQuickFilter(30)}
                className={cn(
                  subDays(new Date(), 30).toDateString() === dateRange.from.toDateString() && 
                  "bg-primary/10 text-primary"
                )}
              >
                30 dias
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleQuickFilter(90)}
                className={cn(
                  subDays(new Date(), 90).toDateString() === dateRange.from.toDateString() && 
                  "bg-primary/10 text-primary"
                )}
              >
                90 dias
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diagnósticos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.calculatedAssessments} calculados no período
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
              criados no período
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
              ativos no período
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
              {auditEvents.length} eventos no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {auditEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>Nenhum evento no período</p>
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
              Atividade de usuários no período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {recentLogins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2" />
                  <p>Nenhuma atividade no período</p>
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
                          {format(new Date(login.last_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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

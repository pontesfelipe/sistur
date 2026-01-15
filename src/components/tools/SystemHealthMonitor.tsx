import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Users, 
  MapPin, 
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface SystemStats {
  destinations: number;
  assessments: number;
  users: number;
  pendingApprovals: number;
  issues: number;
  courses: number;
  trainings: number;
  lastAssessment: string | null;
}

export function SystemHealthMonitor() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [
        { count: destinations },
        { count: assessments },
        { count: users },
        { count: pendingApprovals },
        { count: issues },
        { count: courses },
        { count: trainings },
        { data: lastAssessmentData }
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('pending_approval', true),
        supabase.from('issues').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('edu_trainings').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('calculated_at').order('calculated_at', { ascending: false }).limit(1)
      ]);

      setStats({
        destinations: destinations || 0,
        assessments: assessments || 0,
        users: users || 0,
        pendingApprovals: pendingApprovals || 0,
        issues: issues || 0,
        courses: courses || 0,
        trainings: trainings || 0,
        lastAssessment: lastAssessmentData?.[0]?.calculated_at || null
      });
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open]);

  const getHealthStatus = () => {
    if (!stats) return { status: 'loading', label: 'Carregando...', color: 'bg-muted' };
    
    if (stats.pendingApprovals > 5) {
      return { status: 'warning', label: 'Atenção Necessária', color: 'bg-yellow-500' };
    }
    
    return { status: 'healthy', label: 'Sistema Operacional', color: 'bg-green-500' };
  };

  const health = getHealthStatus();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Activity className="h-4 w-4 mr-2" />
          Monitorar Sistema
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitor de Saúde do Sistema
          </DialogTitle>
          <DialogDescription>
            Visão geral do estado atual do SISTUR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Health Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${health.color} animate-pulse`} />
              <div>
                <p className="font-medium">{health.label}</p>
                {lastRefresh && (
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {lastRefresh.toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {loading && !stats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats && (
            <>
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Destinos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.destinations}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Diagnósticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.assessments}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Usuários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.users}</div>
                  </CardContent>
                </Card>

                <Card className={stats.pendingApprovals > 0 ? 'border-yellow-500/30' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.pendingApprovals}
                      {stats.pendingApprovals > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">!</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* EDU Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">SISTUR EDU</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cursos Cadastrados</span>
                    <span className="font-medium">{stats.courses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Treinamentos</span>
                    <span className="font-medium">{stats.trainings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gargalos Detectados</span>
                    <span className="font-medium">{stats.issues}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Last Activity */}
              {stats.lastAssessment && (
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Último diagnóstico calculado em:</span>
                  <span className="font-medium">
                    {new Date(stats.lastAssessment).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

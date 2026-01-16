import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Trophy,
  AlertTriangle,
  Calendar,
  Timer,
  FileCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useUserExams } from '@/hooks/useExams';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const MyExams = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const { user } = useAuth();
  const { data: exams, isLoading } = useUserExams();

  const pendingExams = exams?.filter(e => e.status === 'generated' || e.status === 'started') || [];
  const completedExams = exams?.filter(e => e.status === 'submitted') || [];
  const expiredExams = exams?.filter(e => e.status === 'expired') || [];

  const stats = {
    total: exams?.length || 0,
    completed: completedExams.length,
    pending: pendingExams.length,
    expired: expiredExams.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generated':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
      case 'started':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700"><Play className="w-3 h-3 mr-1" />Em Andamento</Badge>;
      case 'submitted':
        return <Badge className="bg-green-500/20 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'expired':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Expirado</Badge>;
      case 'voided':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Anulado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} dias restantes`;
    }
    
    return `${hours}h ${minutes}min restantes`;
  };

  if (isLoading) {
    return (
      <AppLayout title="Meus Exames" subtitle="Carregando...">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Meus Exames" 
      subtitle="Acompanhe seu progresso em exames e avaliações"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <ClipboardCheck className="h-4 w-4" />
                Total
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-yellow-600">{stats.pending}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-green-600">{stats.completed}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Concluídos
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-muted-foreground">{stats.expired}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Expirados
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pendingExams.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Realizados ({completedExams.length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expirados ({expiredExams.length})
            </TabsTrigger>
          </TabsList>

          {/* PENDING TAB */}
          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingExams.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum exame pendente</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete cursos para desbloquear exames de certificação
                  </p>
                  <Button asChild>
                    <Link to="/edu">Explorar Cursos</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingExams.map((exam) => (
                  <Card key={exam.exam_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        {getStatusBadge(exam.status)}
                        {exam.expires_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {getTimeRemaining(exam.expires_at)}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-3">
                        {exam.lms_courses?.title || 'Exame de Certificação'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Gerado em {format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {exam.status === 'started' && (
                          <div className="p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-700">
                            <p className="font-medium">Exame em andamento</p>
                            <p className="text-xs">Continue de onde parou</p>
                          </div>
                        )}
                        
                        <Button className="w-full" asChild>
                          <Link to={`/edu/exam/${exam.exam_id}`}>
                            {exam.status === 'started' ? (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Continuar Exame
                              </>
                            ) : (
                              <>
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                Iniciar Exame
                              </>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* COMPLETED TAB */}
          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedExams.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <FileCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum exame realizado</h3>
                  <p className="text-muted-foreground">
                    Realize exames para ver seu histórico aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedExams.map((exam) => (
                  <Card key={exam.exam_id} className="border-green-500/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        {getStatusBadge(exam.status)}
                      </div>
                      <CardTitle className="text-lg mt-3">
                        {exam.lms_courses?.title || 'Exame de Certificação'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Realizado em {format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/certificados">
                          <Trophy className="mr-2 h-4 w-4" />
                          Ver Certificados
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EXPIRED TAB */}
          <TabsContent value="expired" className="space-y-4 mt-6">
            {expiredExams.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum exame expirado</h3>
                  <p className="text-muted-foreground">
                    Você está em dia com seus exames!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {expiredExams.map((exam) => (
                  <Card key={exam.exam_id} className="opacity-60">
                    <CardHeader className="pb-3">
                      {getStatusBadge(exam.status)}
                      <CardTitle className="text-lg mt-3">
                        Exame Expirado
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Gerado em {format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Este exame expirou antes de ser concluído.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MyExams;

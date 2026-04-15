import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  GraduationCap,
  BookOpen,
  Route,
  Award,
  Clock,
  Target,
  Flame,
  Star,
  TrendingUp,
  ChevronRight,
  Video,
  Sparkles,
  UserCircle,
  Play,
  Bell,
  Trophy,
  Zap,
  Calendar,
} from 'lucide-react';
import { useEduTrainings, useEduTrainingStats } from '@/hooks/useEduTrainings';
import { useEduTracks } from '@/hooks/useEdu';
import { useAllTrainingProgress, useRecentlyAccessedTrainings } from '@/hooks/useEduProgress';
import { useUserXP, useUserAchievements, calcLevel, xpForNextLevel, ACHIEVEMENTS } from '@/hooks/useEduGamification';
import { useEduNotifications, useUnreadEduNotificationCount } from '@/hooks/useEduNotifications';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useProfile } from '@/hooks/useProfile';
import { useUserCertificates } from '@/hooks/useCertificates';
import { useAllUserProgress } from '@/hooks/useEdu';
import { PersonalizedRecommendationsPanel } from '@/components/edu/PersonalizedRecommendationsPanel';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EduDashboard = () => {
  const { data: trainings } = useEduTrainings();
  const { data: stats } = useEduTrainingStats();
  const { data: tracks } = useEduTracks();
  const { data: allProgress } = useAllTrainingProgress();
  const { data: recentlyAccessed } = useRecentlyAccessedTrainings(4);
  const { data: userXP } = useUserXP();
  const { data: achievements } = useUserAchievements();
  const { data: notifications } = useEduNotifications();
  const unreadCount = useUnreadEduNotificationCount();
  const { hasProfile } = useStudentProfile();
  const { isAdmin, isProfessor, isOrgAdmin } = useProfile();
  const { data: certificates } = useCertificates();
  const { data: trackProgress } = useAllUserProgress();

  const completedTrainings = allProgress?.filter(p => p.completed_at)?.length ?? 0;
  const totalHoursStudied = Math.round((allProgress?.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0) ?? 0) / 3600);
  const currentStreak = userXP?.current_streak ?? 0;
  const totalXP = userXP?.total_xp ?? 0;
  const level = userXP?.level ?? 1;
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = Math.min((totalXP / nextLevelXP) * 100, 100);

  // Get training title from ID
  const getTrainingTitle = (trainingId: string) => {
    return trainings?.find(t => t.training_id === trainingId)?.title ?? trainingId;
  };

  return (
    <AppLayout
      title="Minha Jornada"
      subtitle="Acompanhe seu progresso de aprendizado"
    >
      <div className="space-y-6">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-xs">Nível {level}</Badge>
              </div>
              <p className="text-2xl font-display font-bold">{totalXP}</p>
              <p className="text-xs text-muted-foreground">XP Total</p>
              <Progress value={xpProgress} className="h-1.5 mt-2" />
              <p className="text-[10px] text-muted-foreground mt-1">{nextLevelXP - totalXP} XP para nível {level + 1}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                {currentStreak >= 7 && <Badge variant="default" className="text-xs">🔥</Badge>}
              </div>
              <p className="text-2xl font-display font-bold">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Dias consecutivos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <GraduationCap className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-display font-bold">{completedTrainings}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-display font-bold">{certificates?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Certificados</p>
            </CardContent>
          </Card>
        </div>

        {/* Setup Profile CTA if not done */}
        {!hasProfile && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Configure seu perfil de aprendizado</p>
                <p className="text-sm text-muted-foreground">Receba recomendações personalizadas de treinamentos</p>
              </div>
              <Button asChild size="sm">
                <Link to="/edu/perfil">Configurar</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Continue where you left off */}
        {recentlyAccessed && recentlyAccessed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Continue de onde parou
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentlyAccessed.map((progress) => (
                <Card key={progress.id} className="group hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {getTrainingTitle(progress.training_id)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <Progress value={progress.progress_pct} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.round(progress.progress_pct)}% concluído</span>
                      <span>
                        {formatDistanceToNow(new Date(progress.last_accessed_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                      <Link to={`/edu/training/${progress.training_id}`}>
                        <Play className="h-3 w-3 mr-1" />
                        Continuar
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications && notifications.filter(n => !n.is_read).length > 0 && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                Notificações ({unreadCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.filter(n => !n.is_read).slice(0, 3).map((notif) => (
                <div key={notif.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{notif.title}</p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/edu/catalogo">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Catálogo</span>
              <span className="text-[10px] text-muted-foreground">{trainings?.length ?? 0} treinamentos</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/edu/trilhas">
              <Route className="h-5 w-5" />
              <span className="text-xs">Trilhas</span>
              <span className="text-[10px] text-muted-foreground">{tracks?.length ?? 0} trilhas</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/edu/historico">
              <Target className="h-5 w-5" />
              <span className="text-xs">Provas</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/certificados">
              <Award className="h-5 w-5" />
              <span className="text-xs">Certificados</span>
              <span className="text-[10px] text-muted-foreground">{certificates?.length ?? 0}</span>
            </Link>
          </Button>
        </div>

        {/* Achievements Section */}
        {achievements && achievements.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-semibold flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Conquistas ({achievements.length}/{Object.keys(ACHIEVEMENTS).length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {achievements.map((ach) => (
                <Badge key={ach.id} variant="outline" className="py-2 px-3 text-sm gap-1.5">
                  <span>{ach.achievement_icon}</span>
                  {ach.achievement_name}
                </Badge>
              ))}
              {/* Show locked achievements */}
              {Object.values(ACHIEVEMENTS)
                .filter(def => !achievements.find(a => a.achievement_code === def.code))
                .slice(0, 4)
                .map((def) => (
                  <Badge key={def.code} variant="outline" className="py-2 px-3 text-sm gap-1.5 opacity-40">
                    <span>🔒</span>
                    {def.name}
                  </Badge>
                ))
              }
            </div>
          </div>
        )}

        {/* Empty state for new users */}
        {(!achievements || achievements.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">Comece sua jornada</p>
              <p className="text-sm text-muted-foreground mb-4">
                Explore o catálogo, complete treinamentos e ganhe conquistas
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.values(ACHIEVEMENTS).slice(0, 5).map((def) => (
                  <Badge key={def.code} variant="outline" className="py-1.5 px-2.5 text-xs gap-1 opacity-50">
                    <span>{def.icon}</span>
                    {def.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personalized Recommendations */}
        <PersonalizedRecommendationsPanel limit={4} showHeader showEmptyState />

        {/* Stats by Pillar */}
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            Conteúdo por Pilar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['RA', 'OE', 'AO'] as Pillar[]).map((pillar) => (
              <Card
                key={pillar}
                className="border-l-4 hover:shadow-md transition-all"
                style={{ borderLeftColor: PILLAR_INFO[pillar].color }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{PILLAR_INFO[pillar].name}</p>
                    <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>{pillar}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{stats?.byPillar[pillar]?.courses || 0} cursos</span>
                    <span>{stats?.byPillar[pillar]?.lives || 0} lives</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                    <Link to={`/edu/catalogo?pillar=${pillar}`}>
                      Explorar <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Study time summary */}
        {totalHoursStudied > 0 && (
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">{totalHoursStudied}h de estudo acumuladas</p>
                <p className="text-sm text-muted-foreground">
                  {completedTrainings} treinamentos concluídos
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default EduDashboard;

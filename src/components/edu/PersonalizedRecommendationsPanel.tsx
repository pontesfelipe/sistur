import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateTrackFromRecommendationsDialog } from '@/components/edu/CreateTrackFromRecommendationsDialog';
import { 
  Sparkles, 
  BookOpen, 
  Video, 
  GraduationCap, 
  ArrowRight,
  X,
  Clock,
  Target,
  RefreshCw,
  UserCircle
} from 'lucide-react';
import {
  usePersonalizedRecommendations,
  useDismissRecommendation,
  useStudentProfile,
  useGenerateRecommendations,
  type PersonalizedRecommendation,
} from '@/hooks/useStudentProfile';

const PILLAR_COLORS: Record<string, string> = {
  RA: 'bg-pillar-ra/10 text-pillar-ra border-pillar-ra/30',
  OE: 'bg-pillar-oe/10 text-pillar-oe border-pillar-oe/30',
  AO: 'bg-pillar-ao/10 text-pillar-ao border-pillar-ao/30',
};

const PILLAR_LABELS: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Org. Estrutural',
  AO: 'Ações Operacionais',
};

function RecommendationCard({ 
  recommendation, 
  onDismiss 
}: { 
  recommendation: PersonalizedRecommendation;
  onDismiss: (id: string) => void;
}) {
  const isTrack = recommendation.recommendation_type === 'track';
  const isLive = recommendation.recommendation_type === 'live';
  
  const title = isTrack ? recommendation.track?.name : recommendation.training?.title;
  const description = isTrack ? recommendation.track?.description : recommendation.training?.description;
  const pillar = recommendation.training?.pillar;
  const duration = recommendation.training?.duration_minutes;

  const Icon = isTrack ? GraduationCap : isLive ? Video : BookOpen;

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={() => onDismiss(recommendation.id)}
      >
        <X className="h-3 w-3" />
      </Button>

      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {recommendation.training?.thumbnail_url ? (
              <img
                src={recommendation.training.thumbnail_url}
                alt={title}
                className="w-24 h-16 object-cover rounded-md"
              />
            ) : (
              <div className="w-24 h-16 bg-muted rounded-md flex items-center justify-center">
                <Icon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {isTrack ? 'Trilha' : isLive ? 'Live' : 'Curso'}
              </Badge>
              {pillar && (
                <Badge variant="outline" className={`text-xs ${PILLAR_COLORS[pillar]}`}>
                  {PILLAR_LABELS[pillar]}
                </Badge>
              )}
            </div>

            <h4 className="font-medium line-clamp-1">{title}</h4>
            
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {description}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {duration}min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {Math.round(recommendation.relevance_score)}% match
                </span>
              </div>

              <Link 
                to={isTrack 
                  ? `/edu/trilha/${recommendation.entity_id}` 
                  : `/edu/training/${recommendation.entity_id}`
                }
              >
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  Ver <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Match Reasons (collapsed by default) */}
        {recommendation.match_reasons.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Por que recomendamos:</p>
            <div className="flex flex-wrap gap-1">
              {recommendation.match_reasons.slice(0, 2).map((reason, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-normal">
                  {reason.reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PersonalizedRecommendationsPanelProps {
  limit?: number;
  showHeader?: boolean;
  showEmptyState?: boolean;
}

export function PersonalizedRecommendationsPanel({
  limit = 6,
  showHeader = true,
  showEmptyState = true,
}: PersonalizedRecommendationsPanelProps) {
  const { profile, hasProfile, isProfileComplete } = useStudentProfile();
  const { data: recommendations, isLoading, error } = usePersonalizedRecommendations();
  const dismissMutation = useDismissRecommendation();
  const generateMutation = useGenerateRecommendations();

  const [allOpen, setAllOpen] = useState(false);
  const [createTrackOpen, setCreateTrackOpen] = useState(false);

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
  };

  const handleRefresh = () => {
    if (profile?.id) {
      generateMutation.mutate(profile.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // If no profile yet, show prompt to create one
  if (!hasProfile && showEmptyState) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">Complete seu Perfil de Aprendizado</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Preencha seu perfil para receber recomendações de cursos e trilhas 
            personalizadas de acordo com seus interesses e objetivos.
          </p>
          <Link to="/edu/perfil">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Preencher Perfil
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // If profile exists but no recommendations
  if ((!recommendations || recommendations.length === 0) && showEmptyState) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma Recomendação Ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isProfileComplete 
              ? 'Clique abaixo para gerar suas recomendações personalizadas.'
              : 'Complete seu perfil para gerar recomendações.'}
          </p>
          {isProfileComplete ? (
            <Button onClick={handleRefresh} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Recomendações
                </>
              )}
            </Button>
          ) : (
            <Link to="/edu/perfil">
              <Button>
                <UserCircle className="mr-2 h-4 w-4" />
                Completar Perfil
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayedRecommendations = recommendations?.slice(0, limit) || [];
  const hasMore = (recommendations?.length || 0) > limit;

  // Group by type for summary
  const courses = recommendations?.filter((r) => r.recommendation_type === 'course') || [];
  const lives = recommendations?.filter((r) => r.recommendation_type === 'live') || [];
  const tracks = recommendations?.filter((r) => r.recommendation_type === 'track') || [];

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recomendado para Você
            </h3>
            <p className="text-sm text-muted-foreground">
              {courses.length} cursos • {lives.length} lives • {tracks.length} trilhas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Link to="/edu/perfil">
              <Button variant="ghost" size="sm">
                <UserCircle className="h-4 w-4 mr-1" />
                Editar Perfil
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {displayedRecommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onDismiss={handleDismiss}
          />
        ))}
      </div>

      {/* Action buttons */}
      {recommendations && recommendations.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Quick create track button */}
          {(courses.length + lives.length) > 0 && (
            <Button onClick={() => setCreateTrackOpen(true)}>
              <GraduationCap className="mr-2 h-4 w-4" />
              Criar Trilha com Sugestões
            </Button>
          )}
          
          {hasMore && (
            <Button variant="outline" onClick={() => setAllOpen(true)}>
              Ver todas as {recommendations?.length} recomendações
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Todas as recomendações</DialogTitle>
            <DialogDescription>
              {courses.length} cursos • {lives.length} lives • {tracks.length} trilhas
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setCreateTrackOpen(true)}
              disabled={courses.length + lives.length === 0}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Criar trilha com sugestões
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={generateMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Atualizar recomendações
            </Button>
          </div>

          <div className="space-y-3 mt-4">
            {(recommendations || []).map((rec) => {
              const isTrack = rec.recommendation_type === 'track';
              const isLive = rec.recommendation_type === 'live';
              const title = isTrack ? rec.track?.name : rec.training?.title;
              const pillar = rec.training?.pillar;
              const href = isTrack ? `/edu/trilha/${rec.entity_id}` : `/edu/training/${rec.entity_id}`;
              const Icon = isTrack ? GraduationCap : isLive ? Video : BookOpen;

              return (
                <Card key={rec.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {isTrack ? 'Trilha' : isLive ? 'Live' : 'Curso'}
                          </Badge>
                          {pillar && (
                            <Badge variant="outline" className={`text-xs ${PILLAR_COLORS[pillar]}`}>
                              {PILLAR_LABELS[pillar]}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(rec.relevance_score)}% match
                          </span>
                        </div>
                        <p className="font-medium truncate">{title}</p>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <Link to={href}>
                        Ver <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <CreateTrackFromRecommendationsDialog
        open={createTrackOpen}
        onOpenChange={setCreateTrackOpen}
        recommendations={recommendations || []}
        defaultName="Minha trilha recomendada"
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  GraduationCap, 
  ExternalLink, 
  AlertCircle,
  BookOpen,
  Video,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useEduRecommendationsForAssessment, type EduRecommendation } from '@/hooks/useEduRecommendationsForAssessment';
import { PILLAR_INFO } from '@/types/sistur';

interface IndicatorScore {
  id: string;
  indicator_id: string;
  score: number;
  indicator?: {
    id: string;
    code: string;
    name: string;
    pillar: string;
  };
}

interface EduRecommendationsPanelProps {
  indicatorScores: IndicatorScore[];
}

export function EduRecommendationsPanel({ indicatorScores }: EduRecommendationsPanelProps) {
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const { data: recommendations, isLoading, error } = useEduRecommendationsForAssessment(indicatorScores);

  // Filter recommendations by pillar
  const filteredRecommendations = recommendations?.filter(rec => 
    pillarFilter === 'all' || rec.pillar === pillarFilter
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Prescrições SISTUR EDU
          </CardTitle>
          <CardDescription>
            Cursos e lives recomendados com base nos indicadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              {error 
                ? 'Erro ao carregar recomendações'
                : 'Nenhuma prescrição encontrada para os indicadores atuais.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Isso pode ocorrer se não houver mapeamentos configurados ou se todos os indicadores estão adequados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by type using filtered results (type is 'course' or 'live' in DB)
  const courses = filteredRecommendations.filter(r => r.training.type === 'course');
  const lives = filteredRecommendations.filter(r => r.training.type === 'live');

  // Count by pillar for filter badges
  const pillarCounts = {
    all: recommendations.length,
    RA: recommendations.filter(r => r.pillar === 'RA').length,
    OE: recommendations.filter(r => r.pillar === 'OE').length,
    AO: recommendations.filter(r => r.pillar === 'AO').length,
  };

  return (
    <div className="space-y-6">
      {/* Pillar Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar por pilar:</span>
        <ToggleGroup 
          type="single" 
          value={pillarFilter} 
          onValueChange={(value) => value && setPillarFilter(value)}
          className="gap-1"
        >
          <ToggleGroupItem value="all" size="sm" className="text-xs px-3">
            Todos
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
              {pillarCounts.all}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="RA" size="sm" className="text-xs px-3 data-[state=on]:bg-pillar-ra/20 data-[state=on]:text-pillar-ra">
            IRA
            {pillarCounts.RA > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                {pillarCounts.RA}
              </Badge>
            )}
          </ToggleGroupItem>
          <ToggleGroupItem value="OE" size="sm" className="text-xs px-3 data-[state=on]:bg-pillar-oe/20 data-[state=on]:text-pillar-oe">
            IOE
            {pillarCounts.OE > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                {pillarCounts.OE}
              </Badge>
            )}
          </ToggleGroupItem>
          <ToggleGroupItem value="AO" size="sm" className="text-xs px-3 data-[state=on]:bg-pillar-ao/20 data-[state=on]:text-pillar-ao">
            IAO
            {pillarCounts.AO > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                {pillarCounts.AO}
              </Badge>
            )}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Empty state for filter */}
      {filteredRecommendations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              Nenhuma prescrição encontrada para o pilar {pillarFilter}.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Courses Section */}
      {courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Cursos Prescritos
              <Badge variant="secondary" className="ml-2">{courses.length}</Badge>
            </CardTitle>
            <CardDescription>
              Capacitações estruturadas baseadas nos gargalos identificados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses.slice(0, 5).map((rec, index) => (
                <RecommendationItem key={rec.training.training_id} rec={rec} index={index} />
              ))}
              {courses.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="link" asChild>
                    <Link to="/learning">
                      Ver todos os {courses.length} cursos
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lives Section */}
      {lives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-accent" />
              Lives Prescritas
              <Badge variant="secondary" className="ml-2">{lives.length}</Badge>
            </CardTitle>
            <CardDescription>
              Conteúdos audiovisuais para aprofundamento temático
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lives.slice(0, 6).map((rec) => (
                <Link
                  key={rec.training.training_id}
                  to={`/edu/training/${rec.training.training_id}`}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {rec.training.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={rec.status === 'CRÍTICO' ? 'destructive' : 'outline'} 
                          className="text-xs"
                        >
                          {rec.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {rec.indicatorName}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
            {lives.length > 6 && (
              <div className="text-center pt-4">
                <Button variant="link" asChild>
                  <Link to="/learning">
                    Ver todas as {lives.length} lives
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecommendationItem({ rec, index }: { rec: EduRecommendation; index: number }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant={rec.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
            {rec.pillar}
          </Badge>
          {rec.training.course_code && (
            <Badge variant="outline" className="text-xs">
              {rec.training.course_code}
            </Badge>
          )}
          <Badge 
            variant={rec.status === 'CRÍTICO' ? 'destructive' : 'secondary'} 
            className="text-xs"
          >
            {rec.status}
          </Badge>
        </div>
        <h4 className="font-medium text-sm">
          {rec.training.title}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {rec.reasonTemplate}
        </p>
        {rec.training.target_audience && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Público: {rec.training.target_audience}
            </Badge>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/edu/training/${rec.training.training_id}`}>
          Ver
        </Link>
      </Button>
    </div>
  );
}

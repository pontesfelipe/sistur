import { cn } from '@/lib/utils';
import { GraduationCap, Clock, ExternalLink, ArrowRight, AlertTriangle, Target } from 'lucide-react';
import type { Recommendation } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const course = recommendation.course;
  const issue = recommendation.issue;

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`;
  };

  const levelLabels = {
    BASICO: 'Básico',
    INTERMEDIARIO: 'Intermediário',
    AVANCADO: 'Avançado',
  };

  const levelColors = {
    BASICO: 'bg-severity-good/10 text-severity-good border-severity-good/20',
    INTERMEDIARIO: 'bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20',
    AVANCADO: 'bg-severity-critical/10 text-severity-critical border-severity-critical/20',
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent/10 text-accent shrink-0">
          <GraduationCap className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              #{recommendation.priority}
            </Badge>
            {course && (
              <Badge className={cn('text-xs border', levelColors[course.level])}>
                {levelLabels[course.level]}
              </Badge>
            )}
            {course?.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(course.duration_minutes)}
              </span>
            )}
          </div>

          <h4 className="mt-2 font-medium text-foreground">
            {course?.title || 'Curso não especificado'}
          </h4>

          {course?.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}

          {/* SISTUR EDU Evidence Trail - Required by Add-on */}
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span>Por que este curso?</span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {recommendation.reason}
            </p>

            {/* Issue Link */}
            {issue && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Gargalo:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge 
                    variant={issue.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}
                    className="text-xs h-5"
                  >
                    I{issue.pillar}
                  </Badge>
                  <Badge 
                    variant={
                      issue.severity === 'CRITICO' ? 'destructive' : 
                      issue.severity === 'MODERADO' ? 'moderate' : 'secondary'
                    }
                    className="text-xs h-5"
                  >
                    {issue.severity}
                  </Badge>
                  <span className="text-xs font-medium truncate">{issue.title}</span>
                </div>

                {/* Evidence Indicators */}
                {issue.evidence?.indicators && issue.evidence.indicators.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {issue.evidence.indicators.slice(0, 3).map((ind, idx) => (
                      <Tooltip key={idx}>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs font-normal h-5">
                            {ind.name}: {Math.round(ind.score * 100)}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Indicador com score {Math.round(ind.score * 100)}%
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {issue.evidence.indicators.length > 3 && (
                      <Badge variant="outline" className="text-xs font-normal h-5">
                        +{issue.evidence.indicators.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Course Tags */}
          {course?.tags && Array.isArray(course.tags) && course.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {course.tags.slice(0, 4).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs font-normal h-5">
                  {typeof tag === 'string' ? tag : tag.theme}
                </Badge>
              ))}
            </div>
          )}

          {course?.url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              asChild
            >
              <a href={course.url} target="_blank" rel="noopener noreferrer">
                Acessar curso
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

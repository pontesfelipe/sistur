import { cn } from '@/lib/utils';
import { GraduationCap, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import type { Recommendation } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const course = recommendation.course;
  if (!course) return null;

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

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-accent/10 text-accent">
          <GraduationCap className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{levelLabels[course.level]}</Badge>
            {course.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(course.duration_minutes)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Prioridade #{recommendation.priority}
            </span>
          </div>

          <h4 className="mt-2 font-medium text-foreground group-hover:text-primary transition-colors">
            {course.title}
          </h4>

          {course.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground italic">
            <ArrowRight className="inline h-3 w-3 mr-1" />
            {recommendation.reason}
          </p>

          {course.url && (
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

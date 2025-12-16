import { cn } from '@/lib/utils';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Assessment } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AssessmentCardProps {
  assessment: Assessment;
}

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  const statusLabels = {
    DRAFT: 'Rascunho',
    DATA_READY: 'Dados Prontos',
    CALCULATED: 'Calculado',
  };

  const statusVariants = {
    DRAFT: 'draft',
    DATA_READY: 'ready',
    CALCULATED: 'calculated',
  } as const;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <Badge variant={statusVariants[assessment.status]}>
            {statusLabels[assessment.status]}
          </Badge>
          <h3 className="mt-3 font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {assessment.title}
          </h3>
        </div>
      </div>

      {assessment.destination && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {assessment.destination.name}, {assessment.destination.uf}
          </span>
        </div>
      )}

      {(assessment.period_start || assessment.period_end) && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(assessment.period_start)}
            {assessment.period_end && ` — ${formatDate(assessment.period_end)}`}
          </span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-between text-primary hover:text-primary"
          asChild
        >
          <Link to={`/diagnosticos/${assessment.id}`}>
            {assessment.status === 'CALCULATED'
              ? 'Ver diagnóstico'
              : assessment.status === 'DATA_READY'
              ? 'Calcular índices'
              : 'Continuar preenchimento'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { MapPin, Calendar, ChevronRight, Trash2, Zap, Gauge, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Assessment } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import { DeleteAssessmentDialog } from './DeleteAssessmentDialog';

interface AssessmentCardProps {
  assessment: Assessment & { tier?: string };
  onDelete?: () => void;
}

const tierConfig = {
  SMALL: { label: 'Essencial', icon: Zap, color: 'text-green-600', bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-500/30' },
  MEDIUM: { label: 'Estratégico', icon: Gauge, color: 'text-amber-600', bgClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/30' },
  COMPLETE: { label: 'Integral', icon: Target, color: 'text-primary', bgClass: 'bg-primary/10 border-primary/30' },
};

export function AssessmentCard({ assessment, onDelete }: AssessmentCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  const tier = (assessment as any).tier || 'COMPLETE';
  const TierIcon = tierConfig[tier as keyof typeof tierConfig]?.icon || Target;
  const tierInfo = tierConfig[tier as keyof typeof tierConfig] || tierConfig.COMPLETE;

  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariants[assessment.status]}>
            {statusLabels[assessment.status]}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                tierInfo.bgClass,
                tierInfo.color
              )}>
                <TierIcon className="h-3 w-3" />
                {tierInfo.label}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Diagnóstico executado no tier {tierInfo.label.toLowerCase()}
            </TooltipContent>
          </Tooltip>
        </div>
        {onDelete && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <DeleteAssessmentDialog
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
              open={isDeleteOpen}
              onOpenChange={setIsDeleteOpen}
              onDeleted={onDelete}
            />
          </>
        )}
      </div>

      <h3 className="mt-3 font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
        {assessment.title}
      </h3>

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
          <Link to={
            assessment.status === 'DRAFT'
              ? `/nova-rodada?resume=${assessment.id}`
              : `/diagnosticos/${assessment.id}`
          }>
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

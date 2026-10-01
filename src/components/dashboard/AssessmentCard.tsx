import { tx } from '@/i18n/t';
import { cn } from '@/lib/utils';
import { MapPin, Calendar, ChevronRight, Trash2, Zap, Gauge, Target, User, Eye, Building2, Monitor, Landmark, Hotel, Flower2, Clock } from 'lucide-react';
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
  assessment: Assessment & { tier?: string; creator?: { full_name: string } | null; visibility?: string; is_demo?: boolean; diagnostic_type?: string | null; expand_with_mandala?: boolean };
  onDelete?: () => void;
  isDemoContext?: boolean;
}

const tierConfig = {
  SMALL: { label: tx('Essencial'), icon: Zap, color: 'text-green-600', bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-500/30' },
  MEDIUM: { label: tx('Estratégico'), icon: Gauge, color: 'text-amber-600', bgClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/30' },
  COMPLETE: { label: tx('Integral'), icon: Target, color: 'text-primary', bgClass: 'bg-primary/10 border-primary/30' },
};

export function AssessmentCard({ assessment, onDelete, isDemoContext }: AssessmentCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const visibility = isDemoContext ? 'demo' : ((assessment as any).visibility || 'organization');
  const visibilityConfig = {
    personal: { label: tx('Pessoal'), icon: Eye, className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' },
    organization: { label: tx('Organização'), icon: Building2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
    demo: { label: tx('Demo'), icon: Monitor, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' },
  };
  const visInfo = visibilityConfig[visibility as keyof typeof visibilityConfig] || visibilityConfig.organization;
  const VisIcon = visInfo.icon;

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

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const tier = (assessment as any).tier || 'COMPLETE';
  const TierIcon = tierConfig[tier as keyof typeof tierConfig]?.icon || Target;
  const tierInfo = tierConfig[tier as keyof typeof tierConfig] || tierConfig.COMPLETE;

  const diagnosticType = (assessment as any).diagnostic_type || 'territorial';
  const diagnosticTypeConfig = {
    territorial: { label: tx('Territorial'), icon: Landmark, className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800' },
    enterprise: { label: tx('Empresarial'), icon: Hotel, className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800' },
  };
  const dtInfo = diagnosticTypeConfig[diagnosticType as keyof typeof diagnosticTypeConfig] || diagnosticTypeConfig.territorial;
  const DtIcon = dtInfo.icon;

  return (
    <div className="p-4 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariants[assessment.status]}>
            {tx(statusLabels[assessment.status])}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                tierInfo.bgClass,
                tierInfo.color
              )}>
                <TierIcon className="h-3 w-3" />
                {tx(tierInfo.label)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Diagnóstico executado no tier {tierInfo.label.toLowerCase()}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                visInfo.className
              )}>
                <VisIcon className="h-3 w-3" />
                {tx(visInfo.label)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {visibility === 'personal' && 'Visível apenas para você'}
              {visibility === 'organization' && 'Visível para toda a organização'}
              {visibility === 'demo' && 'Diagnóstico em ambiente de demonstração'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                dtInfo.className
              )}>
                <DtIcon className="h-3 w-3" />
                {tx(dtInfo.label)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {diagnosticType === 'territorial' ? tx('Diagnóstico territorial (público)') : tx('Diagnóstico empresarial (privado)')}
            </TooltipContent>
          </Tooltip>
          {(assessment as any).expand_with_mandala && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-primary/40 bg-primary/10 text-primary">
                  <Flower2 className="h-3 w-3" />
                  {tx('🌀 MST')}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Mandala da Sustentabilidade no Turismo ativada — diagnóstico inclui 9 indicadores complementares (Tasso, Silva &amp; Nascimento, 2024) cobrindo acessibilidade, conectividade 5G/Wi-Fi (Anatel), comparecimento eleitoral (TSE), qualificação PNQT (CADASTUR), TBC e mais.
              </TooltipContent>
            </Tooltip>
          )}
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
        {tx(assessment.title)}
      </h3>

      {assessment.destination && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {assessment.destination.name}, {assessment.destination.uf}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>
          {assessment.status === 'CALCULATED'
            ? `Rodado em ${formatShortDate(assessment.calculated_at)}`
            : `Criado em ${formatShortDate(assessment.created_at)}`}
        </span>
      </div>

      {(assessment.period_start || assessment.period_end) && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(assessment.period_start)}
            {assessment.period_end && ` — ${formatDate(assessment.period_end)}`}
          </span>
        </div>
      )}

      {(assessment as any).creator?.full_name && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{(assessment as any).creator.full_name}</span>
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
              ? tx('Ver diagnóstico')
              : assessment.status === 'DATA_READY'
              ? tx('Calcular índices')
              : tx('Continuar preenchimento')}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

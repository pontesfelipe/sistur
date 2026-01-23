import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronRight, Building2, Users, Truck } from 'lucide-react';
import type { Issue, TerritorialInterpretation } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO, INTERPRETATION_INFO } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IssueCardProps {
  issue: Issue;
  onViewRecommendations?: () => void;
}

const InterpretationIcon = ({ interpretation }: { interpretation: TerritorialInterpretation }) => {
  switch (interpretation) {
    case 'ESTRUTURAL':
      return <Building2 className="h-3.5 w-3.5" />;
    case 'GESTAO':
      return <Users className="h-3.5 w-3.5" />;
    case 'ENTREGA':
      return <Truck className="h-3.5 w-3.5" />;
    default:
      return null;
  }
};

export function IssueCard({ issue, onViewRecommendations }: IssueCardProps) {
  // NOTE: Some views (e.g. Enterprise dashboard) may pass a simplified issue shape.
  // Keep this component defensive to avoid hard crashes (white screen).
  const pillarInfo = (PILLAR_INFO as any)[issue.pillar] ?? { name: issue.pillar };
  const severityInfo = (SEVERITY_INFO as any)[issue.severity] ?? { label: issue.severity };
  const interpretationInfo = issue.interpretation ? (INTERPRETATION_INFO as any)[issue.interpretation] : null;

  const themeLabel = (issue as any)?.theme;
  const evidenceIndicators = ((issue as any)?.evidence?.indicators ?? []) as Array<{ name: string; score: number }>;

  const pillarVariant = issue.pillar.toLowerCase() as 'ra' | 'oe' | 'ao';
  const severityVariant = issue.severity === 'CRITICO' 
    ? 'critical' 
    : issue.severity === 'MODERADO' 
    ? 'moderate' 
    : 'good';

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            issue.severity === 'CRITICO'
              ? 'bg-severity-critical/10'
              : issue.severity === 'MODERADO'
              ? 'bg-severity-moderate/10'
              : 'bg-severity-good/10'
          )}
        >
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              issue.severity === 'CRITICO'
                ? 'text-severity-critical'
                : issue.severity === 'MODERADO'
                ? 'text-severity-moderate'
                : 'text-severity-good'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={pillarVariant}>{pillarInfo.name}</Badge>
            <Badge variant={severityVariant}>{severityInfo.label}</Badge>
            {themeLabel ? (
              <Badge variant="outline" className="text-xs">
                {themeLabel}
              </Badge>
            ) : null}
            {/* Territorial Interpretation Badge */}
            {interpretationInfo && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs gap-1", interpretationInfo.color)}
                  >
                    <InterpretationIcon interpretation={issue.interpretation!} />
                    {interpretationInfo.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{interpretationInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{interpretationInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <h4 className="mt-2 font-medium text-foreground">{issue.title}</h4>

          {evidenceIndicators.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Evidências: </span>
              {evidenceIndicators.map((ind, i) => (
                <span key={i}>
                  {ind.name} ({Math.round(ind.score * 100)}%)
                  {i < evidenceIndicators.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}

          {onViewRecommendations && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2 text-primary hover:text-primary"
              onClick={onViewRecommendations}
            >
              Ver recomendações
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

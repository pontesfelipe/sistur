import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { Issue } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO } from '@/types/sistur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IssueCardProps {
  issue: Issue;
  onViewRecommendations?: () => void;
}

export function IssueCard({ issue, onViewRecommendations }: IssueCardProps) {
  const pillarInfo = PILLAR_INFO[issue.pillar];
  const severityInfo = SEVERITY_INFO[issue.severity];

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
            <Badge variant="outline" className="text-xs">
              {issue.theme}
            </Badge>
          </div>

          <h4 className="mt-2 font-medium text-foreground">{issue.title}</h4>

          {issue.evidence.indicators.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Evidências: </span>
              {issue.evidence.indicators.map((ind, i) => (
                <span key={i}>
                  {ind.name} ({Math.round(ind.score * 100)}%)
                  {i < issue.evidence.indicators.length - 1 && ', '}
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

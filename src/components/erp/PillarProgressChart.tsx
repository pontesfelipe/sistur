import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PillarProgress } from '@/hooks/useERPMonitoring';
import { PILLAR_INFO } from '@/types/sistur';
import { MapPin, TrendingUp, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PillarProgressChartProps {
  data: PillarProgress[] | undefined;
  isLoading: boolean;
}

const PILLAR_COLORS: Record<string, string> = {
  RA: 'bg-pillar-ra',
  OE: 'bg-pillar-oe',
  AO: 'bg-pillar-ao',
};

function getSeverityFromScore(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: 'Bom', color: 'text-severity-good' };
  if (score >= 0.4) return { label: 'Moderado', color: 'text-severity-moderate' };
  return { label: 'Crítico', color: 'text-severity-critical' };
}

export function PillarProgressChart({ data, isLoading }: PillarProgressChartProps) {
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});

  const togglePillar = (pillar: string) => {
    setExpandedPillars(prev => ({ ...prev, [pillar]: !prev[pillar] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Scores por Pilar
          </CardTitle>
          <CardDescription>Nenhum diagnóstico calculado encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Scores por Pilar
        </CardTitle>
        <CardDescription>
          Média dos scores dos diagnósticos calculados por pilar do SISTUR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((pillar) => {
          const pillarInfo = PILLAR_INFO[pillar.pillar];
          const scorePercent = Math.round(pillar.avgScore * 100);
          const severity = getSeverityFromScore(pillar.avgScore);
          const isExpanded = expandedPillars[pillar.pillar];
          const hasMultipleDestinations = pillar.destinations.length > 1;

          return (
            <Collapsible 
              key={pillar.pillar} 
              open={isExpanded}
              onOpenChange={() => hasMultipleDestinations && togglePillar(pillar.pillar)}
            >
              <div className="space-y-3">
                <CollapsibleTrigger asChild disabled={!hasMultipleDestinations}>
                  <div className={`flex items-center justify-between ${hasMultipleDestinations ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${PILLAR_COLORS[pillar.pillar]}`}
                      />
                      <span className="font-medium">{pillarInfo?.name || pillar.pillar}</span>
                      <span className="text-xs text-muted-foreground">
                        ({pillarInfo?.fullName})
                      </span>
                      {hasMultipleDestinations && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${severity.color}`}>
                        {severity.label}
                      </Badge>
                      <span className="text-sm font-medium">
                        {scorePercent}%
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <Progress 
                  value={scorePercent} 
                  className="h-2"
                />

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {pillar.totalAssessments} diagnóstico{pillar.totalAssessments !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {pillar.destinations.length} destino{pillar.destinations.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <CollapsibleContent>
                  {hasMultipleDestinations && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs text-muted-foreground font-medium mb-2">
                        Scores por Destino:
                      </p>
                      {pillar.destinations.map((dest) => {
                        const destScorePercent = Math.round(dest.score * 100);
                        const destSeverity = getSeverityFromScore(dest.score);
                        return (
                          <div 
                            key={dest.id}
                            className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{dest.name}</span>
                              {dest.assessmentCount > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  ({dest.assessmentCount} diagnósticos)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={destScorePercent} 
                                className="h-1.5 w-20"
                              />
                              <span className={`text-xs font-medium ${destSeverity.color}`}>
                                {destScorePercent}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

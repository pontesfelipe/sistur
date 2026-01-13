import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, Users, Building2, TrendingUp, Award } from 'lucide-react';
import {
  TerritorialImpactScore,
  CERTIFICATION_LABELS,
  CERTIFICATION_COLORS,
  SDG_LABELS,
} from '@/hooks/useTerritorialImpact';

interface ImpactScoreCardProps {
  impactScore: TerritorialImpactScore;
  showDetails?: boolean;
}

export function ImpactScoreCard({ impactScore, showDetails = true }: ImpactScoreCardProps) {
  const impactDimensions = [
    {
      key: 'environmental',
      label: 'Ambiental',
      value: impactScore.environmental_impact,
      icon: Leaf,
      color: 'text-green-600',
    },
    {
      key: 'social',
      label: 'Social',
      value: impactScore.social_impact,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      key: 'institutional',
      label: 'Institucional',
      value: impactScore.institutional_impact,
      icon: Building2,
      color: 'text-purple-600',
    },
    {
      key: 'economic',
      label: 'Econômico',
      value: impactScore.economic_impact,
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  const getSeverityColor = (value: number) => {
    if (value >= 0.67) return 'bg-severity-good';
    if (value >= 0.34) return 'bg-severity-moderate';
    return 'bg-severity-critical';
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Índice de Impacto Territorial</CardTitle>
          {impactScore.certification_level && (
            <Badge
              variant="outline"
              className={CERTIFICATION_COLORS[impactScore.certification_level]}
            >
              <Award className="w-3 h-3 mr-1" />
              {CERTIFICATION_LABELS[impactScore.certification_level]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main TII Score */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">TII Geral</span>
            <span className="text-2xl font-bold">
              {(impactScore.territorial_impact_index * 100).toFixed(1)}%
            </span>
          </div>
          <Progress
            value={impactScore.territorial_impact_index * 100}
            className="h-3"
            indicatorClassName={getSeverityColor(impactScore.territorial_impact_index)}
          />
          {impactScore.esg_score && (
            <div className="mt-2 text-xs text-muted-foreground">
              ESG Score: {impactScore.esg_score.toFixed(0)}/100
            </div>
          )}
        </div>

        {/* Impact Dimensions */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-3">
            {impactDimensions.map((dim) => {
              const Icon = dim.icon;
              return (
                <div
                  key={dim.key}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${dim.color}`} />
                    <span className="text-xs font-medium">{dim.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Progress
                      value={dim.value * 100}
                      className="h-1.5 flex-1 mr-2"
                      indicatorClassName={getSeverityColor(dim.value)}
                    />
                    <span className="text-sm font-semibold">
                      {(dim.value * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SDG Alignment */}
        {impactScore.sdg_alignments && impactScore.sdg_alignments.length > 0 && showDetails && (
          <div className="pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Alinhamento com ODS da ONU
            </div>
            <div className="flex flex-wrap gap-1">
              {impactScore.sdg_alignments.map((sdg) => (
                <Badge key={sdg} variant="secondary" className="text-xs">
                  ODS {sdg}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Certification Status */}
        {!impactScore.certification_eligible && showDetails && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Para certificação, todos os pilares (RA, OE, AO) devem ter score ≥ 67%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

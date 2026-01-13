import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicDestinationSummary } from '@/hooks/usePublicDestinations';
import { CERTIFICATION_LABELS, CERTIFICATION_COLORS, CertificationLevel } from '@/hooks/useTerritorialImpact';
import { Award, MapPin, CheckCircle, AlertTriangle, ExternalLink, Info } from 'lucide-react';

interface PublicDestinationCardProps {
  destination: PublicDestinationSummary;
  onViewDetails?: (id: string) => void;
}

export function PublicDestinationCard({ destination, onViewDetails }: PublicDestinationCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'BOM':
        return 'bg-severity-good/10 text-severity-good border-severity-good/30';
      case 'MODERADO':
        return 'bg-severity-moderate/10 text-severity-moderate border-severity-moderate/30';
      case 'CRITICO':
        return 'bg-severity-critical/10 text-severity-critical border-severity-critical/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'BOM':
        return 'Adequado';
      case 'MODERADO':
        return 'Atenção';
      case 'CRITICO':
        return 'Crítico';
      default:
        return severity;
    }
  };

  const pillarOrder = ['RA', 'OE', 'AO'];
  const pillarNames: Record<string, string> = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  return (
    <Card className="animate-fade-in hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{destination.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {destination.uf || 'Brasil'}
            </CardDescription>
          </div>
          {destination.certification_level && (
            <Badge
              variant="outline"
              className={CERTIFICATION_COLORS[destination.certification_level as CertificationLevel]}
            >
              <Award className="w-3 h-3 mr-1" />
              {CERTIFICATION_LABELS[destination.certification_level as CertificationLevel]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TII Score */}
        {destination.territorial_impact_index !== null && (
          <div className="p-4 rounded-lg bg-primary/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Índice de Impacto Territorial</span>
              <span className="text-2xl font-bold">
                {(destination.territorial_impact_index * 100).toFixed(0)}%
              </span>
            </div>
            {destination.esg_score && (
              <div className="text-xs text-muted-foreground">
                ESG Score: {destination.esg_score.toFixed(0)}/100
              </div>
            )}
          </div>
        )}

        {/* Pillar Scores */}
        {destination.pillar_scores && (
          <div>
            <div className="text-sm font-medium mb-2">Avaliação SISTUR (Mario Beni)</div>
            <div className="space-y-2">
              {pillarOrder.map((pillar) => {
                const scoreData = destination.pillar_scores?.[pillar];
                if (!scoreData) return null;

                return (
                  <div
                    key={pillar}
                    className={`p-2 rounded-lg border flex items-center justify-between ${getSeverityColor(scoreData.severity)}`}
                  >
                    <div className="flex items-center gap-2">
                      {scoreData.severity === 'BOM' && <CheckCircle className="w-4 h-4" />}
                      {scoreData.severity === 'MODERADO' && <AlertTriangle className="w-4 h-4" />}
                      {scoreData.severity === 'CRITICO' && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-sm font-medium">
                        {pillar} - {pillarNames[pillar]}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {(scoreData.score * 100).toFixed(0)}% - {getSeverityLabel(scoreData.severity)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ready for Visitors */}
        {destination.ready_for_visitors ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-severity-good/10 text-severity-good text-sm">
            <CheckCircle className="w-4 h-4" />
            Destino pronto para visitação consciente
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-severity-moderate/10 text-severity-moderate text-sm">
            <AlertTriangle className="w-4 h-4" />
            Destino com limitações identificadas
          </div>
        )}

        {/* SDG Alignments */}
        {destination.sdg_alignments && destination.sdg_alignments.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Alinhamento com ODS da ONU
            </div>
            <div className="flex flex-wrap gap-1">
              {destination.sdg_alignments.map((sdg) => (
                <Badge key={sdg} variant="secondary" className="text-xs">
                  ODS {sdg}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Info className="w-3 h-3" />
          {destination.indicator_count} indicadores avaliados • Metodologia Mario Beni
        </div>
      </CardContent>

      {onViewDetails && (
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onViewDetails(destination.destination_id)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Detalhes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

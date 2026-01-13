import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  InvestmentOpportunity, 
  INVESTMENT_TYPE_LABELS, 
  INVESTMENT_STATUS_LABELS 
} from '@/hooks/useInvestmentOpportunities';
import { 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  MapPin,
  Ban,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvestmentOpportunityCardProps {
  opportunity: InvestmentOpportunity & {
    destinations?: { id: string; name: string; uf: string } | null;
    assessments?: { id: string; title: string; calculated_at: string } | null;
  };
  onPublish?: (id: string) => void;
  isPublishing?: boolean;
  showActions?: boolean;
}

export function InvestmentOpportunityCard({
  opportunity,
  onPublish,
  isPublishing,
  showActions = true,
}: InvestmentOpportunityCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'FUNDED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInvestmentTypeColor = (type: string) => {
    switch (type) {
      case 'ENVIRONMENTAL_RESTORATION':
        return 'bg-green-100 text-green-800';
      case 'GOVERNANCE_CAPACITY':
        return 'bg-purple-100 text-purple-800';
      case 'INFRASTRUCTURE_DEVELOPMENT':
        return 'bg-blue-100 text-blue-800';
      case 'TRAINING_CAPACITY':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`animate-fade-in ${opportunity.blocked_by_igma ? 'border-severity-critical/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{opportunity.title}</CardTitle>
            {opportunity.destinations && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {opportunity.destinations.name}, {opportunity.destinations.uf}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline" className={getStatusColor(opportunity.status)}>
            {INVESTMENT_STATUS_LABELS[opportunity.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type Badge */}
        <Badge className={getInvestmentTypeColor(opportunity.investment_type)}>
          {INVESTMENT_TYPE_LABELS[opportunity.investment_type]}
        </Badge>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {opportunity.description}
        </p>

        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Capital Necessário</div>
              <div className="font-semibold">{formatCurrency(opportunity.required_capital)}</div>
            </div>
          </div>
          {opportunity.expected_roi && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">ROI Esperado</div>
                <div className="font-semibold">{opportunity.expected_roi.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>

        {/* IGMA Status */}
        <div className={`p-2 rounded-lg ${
          opportunity.igma_approved 
            ? 'bg-severity-good/10 border border-severity-good/30' 
            : 'bg-severity-critical/10 border border-severity-critical/30'
        }`}>
          <div className="flex items-start gap-2">
            {opportunity.igma_approved ? (
              <CheckCircle className="w-4 h-4 text-severity-good mt-0.5" />
            ) : (
              <Ban className="w-4 h-4 text-severity-critical mt-0.5" />
            )}
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                opportunity.igma_approved ? 'text-severity-good' : 'text-severity-critical'
              }`}>
                {opportunity.igma_approved ? 'Aprovado pelo IGMA' : 'Bloqueado pelo IGMA'}
              </div>
              {opportunity.blocking_reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {opportunity.blocking_reason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Impact Projections */}
        {(opportunity.projected_ra_improvement || opportunity.projected_ao_improvement || opportunity.projected_oe_improvement) && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">Projeção de Impacto</div>
            <div className="flex gap-2">
              {opportunity.projected_ra_improvement && (
                <Badge variant="secondary" className="text-xs">
                  RA: +{(opportunity.projected_ra_improvement * 100).toFixed(0)}%
                </Badge>
              )}
              {opportunity.projected_ao_improvement && (
                <Badge variant="secondary" className="text-xs">
                  AO: +{(opportunity.projected_ao_improvement * 100).toFixed(0)}%
                </Badge>
              )}
              {opportunity.projected_oe_improvement && (
                <Badge variant="secondary" className="text-xs">
                  OE: +{(opportunity.projected_oe_improvement * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-muted-foreground pt-2">
          Criada {formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true, locale: ptBR })}
        </div>
      </CardContent>

      {showActions && opportunity.status === 'DRAFT' && opportunity.igma_approved && (
        <CardFooter className="pt-0">
          <Button
            className="w-full"
            onClick={() => onPublish?.(opportunity.id)}
            disabled={isPublishing}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isPublishing ? 'Publicando...' : 'Publicar para Investidores'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

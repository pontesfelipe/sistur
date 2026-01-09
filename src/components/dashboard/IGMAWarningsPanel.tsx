import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Ban, 
  Users,
  Calendar,
  Info,
  AlertCircle,
  BookMarked
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IGMAUIMessage {
  type: 'warning' | 'info' | 'critical';
  flag: string;
  title: string;
  message: string;
  icon?: string;
}

interface IGMAInterpretation {
  flags?: {
    RA_LIMITATION?: boolean;
    GOVERNANCE_BLOCK?: boolean;
    EXTERNALITY_WARNING?: boolean;
    MARKETING_BLOCKED?: boolean;
    INTERSECTORAL_DEPENDENCY?: boolean;
  };
  allowedActions?: {
    EDU_RA?: boolean;
    EDU_AO?: boolean;
    EDU_OE?: boolean;
    MARKETING?: boolean;
  };
  blockedActions?: string[];
  uiMessages?: IGMAUIMessage[];
  interpretationType?: string;
  criticalPillar?: string;
}

interface IGMAWarningsPanelProps {
  igmaInterpretation?: IGMAInterpretation;
  nextReviewRecommendedAt?: string;
  marketingBlocked?: boolean;
  externalityWarning?: boolean;
  raLimitation?: boolean;
  governanceBlock?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Ban,
  Users,
};

export function IGMAWarningsPanel({
  igmaInterpretation,
  nextReviewRecommendedAt,
  marketingBlocked,
  externalityWarning,
  raLimitation,
  governanceBlock,
}: IGMAWarningsPanelProps) {
  const messages = igmaInterpretation?.uiMessages || [];
  const hasWarnings = messages.length > 0 || marketingBlocked || externalityWarning || raLimitation || governanceBlock;

  if (!hasWarnings && !nextReviewRecommendedAt) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Alertas Sistêmicos (Mario Beni)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((msg, index) => {
          const IconComponent = msg.icon ? iconMap[msg.icon] : AlertTriangle;
          
          return (
            <Alert 
              key={index}
              variant={msg.type === 'critical' ? 'destructive' : 'default'}
              className={
                msg.type === 'critical' 
                  ? 'border-destructive/50 bg-destructive/10' 
                  : msg.type === 'warning'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-blue-500/50 bg-blue-500/10'
              }
            >
              {IconComponent && <IconComponent className="h-4 w-4" />}
              <AlertTitle className="flex items-center gap-2">
                {msg.title}
                <Badge 
                  variant={msg.type === 'critical' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {msg.flag.replace(/_/g, ' ')}
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-sm">
                {msg.message}
              </AlertDescription>
            </Alert>
          );
        })}

        {/* Blocked actions summary */}
        {igmaInterpretation?.blockedActions && igmaInterpretation.blockedActions.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Ban className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Ações bloqueadas: 
            </span>
            <div className="flex gap-1 flex-wrap">
              {igmaInterpretation.blockedActions.map(action => (
                <Badge key={action} variant="outline" className="text-xs">
                  {action.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Next review recommendation */}
        {nextReviewRecommendedAt && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Próxima Revisão Recomendada</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(nextReviewRecommendedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Ciclo Contínuo
            </Badge>
          </div>
        )}

        {/* Legend with link to methodology */}
        <div className="pt-2 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Baseado nos princípios sistêmicos do Prof. Mario Beni
          </p>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link to="/metodologia" className="flex items-center gap-1">
              <BookMarked className="h-3 w-3" />
              Ver metodologia
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

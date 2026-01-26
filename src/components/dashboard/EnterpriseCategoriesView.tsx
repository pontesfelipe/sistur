import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Droplets,
  Recycle,
  Users,
  Award,
  Building2,
  Cog,
  Cpu,
  Handshake,
  DollarSign,
  BedDouble,
  Smile,
  Star,
  GraduationCap,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Pillar } from '@/types/sistur';
import { PILLAR_INFO } from '@/types/sistur';

interface EnterpriseIndicatorScore {
  id: string;
  score: number;
  indicator: {
    id: string;
    code: string;
    name: string;
    pillar: string;
    theme?: string;
    unit?: string;
    description?: string;
    benchmark_min?: number;
    benchmark_max?: number;
    benchmark_target?: number;
    category?: {
      id: string;
      code: string;
      name: string;
    };
  } | null;
}

interface EnterpriseCategoriesViewProps {
  indicatorScores: EnterpriseIndicatorScore[];
}

// Category icons mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // New (unified indicators): group by `theme` (pt-BR)
  'Eficiência Energética': Zap,
  'Gestão Hídrica': Droplets,
  'Gestão de Resíduos': Recycle,
  'Impacto na Comunidade': Users,
  'Certificações Ambientais': Award,
  'Governança Corporativa': Building2,
  'Qualidade da Infraestrutura': Cog,
  'Maturidade Tecnológica': Cpu,
  'Rede de Parcerias': Handshake,
  'Saúde Financeira': DollarSign,
  'Taxa de Ocupação': BedDouble,
  'Satisfação do Hóspede': Smile,
  'Qualidade de Serviço': Star,
  'Capacitação da Equipe': GraduationCap,
  'Efetividade de Marketing': Megaphone,

  'RA_SUST_ENERGIA': Zap,
  'RA_SUST_AGUA': Droplets,
  'RA_SUST_RESIDUOS': Recycle,
  'RA_IMPACTO_LOCAL': Users,
  'RA_CERTIFICACOES': Award,
  'OE_GOVERNANCA': Building2,
  'OE_INFRAESTRUTURA': Cog,
  'OE_TECNOLOGIA': Cpu,
  'OE_PARCERIAS': Handshake,
  'OE_FINANCEIRO': DollarSign,
  'AO_OCUPACAO': BedDouble,
  'AO_SATISFACAO': Smile,
  'AO_QUALIDADE': Star,
  'AO_CAPACITACAO': GraduationCap,
  'AO_MARKETING': Megaphone,
};

const getSeverityFromScore = (score: number): 'CRITICO' | 'MODERADO' | 'BOM' => {
  if (score < 0.4) return 'CRITICO';
  if (score < 0.67) return 'MODERADO';
  return 'BOM';
};

const severityConfig = {
  CRITICO: { label: 'Crítico', color: 'text-severity-critical', bgColor: 'bg-severity-critical/10', progressColor: '[&>div]:bg-severity-critical' },
  MODERADO: { label: 'Atenção', color: 'text-severity-moderate', bgColor: 'bg-severity-moderate/10', progressColor: '[&>div]:bg-severity-moderate' },
  BOM: { label: 'Adequado', color: 'text-severity-good', bgColor: 'bg-severity-good/10', progressColor: '[&>div]:bg-severity-good' },
};

export function EnterpriseCategoriesView({ indicatorScores }: EnterpriseCategoriesViewProps) {
  // Group indicators by category within each pillar
  const categorizedData = useMemo(() => {
    const pillars: Record<string, {
      pillar: string;
      categories: Map<string, {
        categoryCode: string;
        categoryName: string;
        indicators: EnterpriseIndicatorScore[];
        avgScore: number;
      }>;
      avgScore: number;
    }> = {};

    indicatorScores.forEach(score => {
      const pillar = score.indicator?.pillar || 'unknown';

      // Unified indicators: Enterprise categories are represented by `indicator.theme`.
      // Legacy fallback: `indicator.category`.
      const categoryName = (score.indicator as any)?.theme || (score.indicator?.category as any)?.name || 'Outros';
      const categoryCode = (score.indicator as any)?.theme || (score.indicator?.category as any)?.code || categoryName;

      if (!pillars[pillar]) {
        pillars[pillar] = { pillar, categories: new Map(), avgScore: 0 };
      }

      if (!pillars[pillar].categories.has(categoryCode)) {
        pillars[pillar].categories.set(categoryCode, {
          categoryCode,
          categoryName,
          indicators: [],
          avgScore: 0,
        });
      }

      pillars[pillar].categories.get(categoryCode)!.indicators.push(score);
    });

    // Calculate averages
    Object.values(pillars).forEach(pillarData => {
      let pillarTotal = 0;
      let pillarCount = 0;

      pillarData.categories.forEach(category => {
        const sum = category.indicators.reduce((acc, ind) => acc + ind.score, 0);
        category.avgScore = sum / category.indicators.length;
        pillarTotal += sum;
        pillarCount += category.indicators.length;
      });

      pillarData.avgScore = pillarCount > 0 ? pillarTotal / pillarCount : 0;
    });

    return pillars;
  }, [indicatorScores]);

  const pillarOrder = ['RA', 'OE', 'AO'];

  if (indicatorScores.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum score de indicador enterprise disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards per Pillar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillarOrder.map(pillarKey => {
          const pillarData = categorizedData[pillarKey];
          if (!pillarData) return null;

          const pillarInfo = PILLAR_INFO[pillarKey as Pillar];
          const severity = getSeverityFromScore(pillarData.avgScore);
          const config = severityConfig[severity];

          return (
            <Card key={pillarKey} className={cn("border-l-4", {
              'border-l-pillar-ra': pillarKey === 'RA',
              'border-l-pillar-oe': pillarKey === 'OE',
              'border-l-pillar-ao': pillarKey === 'AO',
            })}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={pillarKey.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                    {pillarInfo?.name || pillarKey}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", config.color, config.bgColor)}>
                    {config.label}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {pillarInfo?.fullName || pillarKey}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-display font-bold">
                    {Math.round(pillarData.avgScore * 100)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {pillarData.categories.size} categorias
                  </span>
                </div>
                <Progress 
                  value={pillarData.avgScore * 100} 
                  className={cn("h-2", config.progressColor)} 
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Categories by Pillar */}
      {pillarOrder.map(pillarKey => {
        const pillarData = categorizedData[pillarKey];
        if (!pillarData) return null;

        const pillarInfo = PILLAR_INFO[pillarKey as Pillar];
        const categories = Array.from(pillarData.categories.values())
          .sort((a, b) => b.avgScore - a.avgScore);

        return (
          <Card key={pillarKey}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant={pillarKey.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-sm">
                  {pillarInfo?.name || pillarKey}
                </Badge>
                <CardTitle className="text-lg">
                  {pillarInfo?.fullName || pillarKey} — Categorias Enterprise
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {categories.map(category => {
                  const severity = getSeverityFromScore(category.avgScore);
                  const config = severityConfig[severity];
                  const IconComponent = categoryIcons[category.categoryCode] || Building2;

                  return (
                    <AccordionItem key={category.categoryCode} value={category.categoryCode}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn("p-2 rounded-lg", config.bgColor)}>
                            <IconComponent className={cn("h-5 w-5", config.color)} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{category.categoryName}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.indicators.length} indicador{category.indicators.length !== 1 ? 'es' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mr-4">
                            <Badge variant="outline" className={cn("text-xs", config.color, config.bgColor)}>
                              {config.label}
                            </Badge>
                            <span className={cn("text-lg font-display font-bold", config.color)}>
                              {Math.round(category.avgScore * 100)}%
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-12 space-y-3">
                          {category.indicators.map(ind => {
                            const indSeverity = getSeverityFromScore(ind.score);
                            const indConfig = severityConfig[indSeverity];
                            const scorePercent = Math.round(ind.score * 100);

                            return (
                              <div 
                                key={ind.id} 
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{ind.indicator?.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {ind.indicator?.code}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-24">
                                    <Progress 
                                      value={scorePercent} 
                                      className={cn("h-1.5", indConfig.progressColor)} 
                                    />
                                  </div>
                                  <span className={cn("w-12 text-right font-mono text-sm font-medium", indConfig.color)}>
                                    {scorePercent}%
                                  </span>
                                  {ind.score >= 0.67 ? (
                                    <TrendingUp className="h-4 w-4 text-severity-good" />
                                  ) : ind.score >= 0.4 ? (
                                    <Minus className="h-4 w-4 text-severity-moderate" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-severity-critical" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

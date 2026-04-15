import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Info,
  Database,
  Zap,
  Gauge,
  Target,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicadoresChartProps {
  indicators: any[];
  tierCounts: { SMALL: number; MEDIUM: number; COMPLETE: number };
  igmaCount: number;
  pillarNames: Record<string, string>;
}

export function IndicadoresChart({
  indicators,
  tierCounts,
  igmaCount,
  pillarNames,
}: IndicadoresChartProps) {
  return (
    <>
      {/* Tier Info */}
      <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Sobre os Níveis de Diagnóstico</h3>
            <p className="text-sm text-muted-foreground">
              Cada indicador pertence a um nível que define em quais diagnósticos ele será utilizado.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">Essencial</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.SMALL} ind.</Badge>
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              Indicadores essenciais para municípios menores ou análises rápidas. 
              Ideal para primeira avaliação ou destinos com dados limitados.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">Estratégico</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.MEDIUM} ind.</Badge>
            </div>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
              Adiciona indicadores de profundidade intermediária. 
              Recomendado para cidades médias ou diagnósticos de acompanhamento.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Integral</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.COMPLETE} ind.</Badge>
            </div>
            <p className="text-xs text-primary/80">
              Análise mais abrangente com todos os indicadores. 
              Ideal para capitais, polos turísticos ou planejamento estratégico.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources Info */}
      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-start gap-3 mb-3">
          <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Fontes de Dados Oficiais</h3>
            <p className="text-sm text-muted-foreground">
              Os indicadores podem ser pré-preenchidos automaticamente de fontes oficiais:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: 'IBGE', desc: 'Demográficos, econômicos e Censo (SIDRA)' },
            { name: 'CADASTUR', desc: 'Serviços turísticos registrados' },
            { name: 'DATASUS', desc: 'Saúde e mortalidade' },
            { name: 'INEP', desc: 'Dados educacionais (IDEB)' },
            { name: 'STN', desc: 'Dados fiscais municipais' },
            { name: 'Mapa Turismo', desc: 'Regionalização e categorização' },
          ].map(source => (
            <div key={source.name} className="p-2 rounded bg-background border text-center">
              <span className="font-mono text-xs font-medium text-foreground">{source.name}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">{source.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary by Pillar */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {(['RA', 'OE', 'AO'] as const).map((pillar) => {
          const pillarIndicators = indicators.filter(i => i.pillar === pillar);
          const totalWeight = pillarIndicators.reduce((sum, i) => sum + i.weight, 0);
          
          return (
            <div key={pillar} className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                  I{pillar}
                </Badge>
                <span className="text-sm font-medium">{pillarNames[pillar]}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">
                  {pillarIndicators.length}
                </span>
                <span className="text-sm text-muted-foreground">indicadores</span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Soma dos pesos</span>
                  <span className={cn(
                    totalWeight > 1 && 'text-amber-500 font-medium',
                    totalWeight === 1 && 'text-green-500 font-medium'
                  )}>
                    {(totalWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(totalWeight * 100, 100)} 
                  className={cn(
                    "h-1.5",
                    totalWeight > 1 && "[&>div]:bg-amber-500"
                  )} 
                />
              </div>
            </div>
          );
        })}
        
        {/* IGMA Summary Card */}
        <div className="p-4 rounded-lg border bg-card border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Fonte IGMA</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-primary">
              {igmaCount}
            </span>
            <span className="text-sm text-muted-foreground">indicadores</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Indicadores oficiais do IGMA integrados ao SISTUR
          </p>
        </div>
      </div>

      {/* Inline Edit Info */}
      <div className="p-3 bg-muted/50 rounded-lg border flex items-center gap-3">
        <Edit className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Edição de pesos, tiers e escopo:</span> Clique no peso, tier ou escopo de qualquer indicador para editá-lo.
          A soma dos pesos por pilar deve totalizar 100% para um cálculo correto.
        </p>
      </div>
    </>
  );
}

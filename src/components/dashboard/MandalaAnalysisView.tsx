/**
 * MandalaAnalysisView — Aba Mandala do diagnóstico
 *
 * Renderiza a Mandala visual (Beni 2007 + MST Tasso et al. 2024) e a análise
 * sistêmica das 4 dimensões extras (Tecnologia, Inclusão, TBC, Sensibilização)
 * com base nos indicadores MST_* preenchidos no diagnóstico.
 */
import { MandalaDestino } from './MandalaDestino';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wifi, Heart, Users, Megaphone, Info } from 'lucide-react';
import type { Pillar, Severity } from '@/types/sistur';
import { cn } from '@/lib/utils';

interface PillarScore {
  pillar: Pillar;
  score: number;
  severity: Severity;
}

interface IndicatorScore {
  indicator_code: string;
  indicator_name?: string;
  raw_value?: number | null;
  normalized_score?: number | null;
  status?: string | null;
  pillar?: string;
}

interface MandalaAnalysisViewProps {
  pillarScores: PillarScore[];
  indicatorScores: IndicatorScore[];
  destinationName?: string;
}

// MST dimension grouping — maps each extra dimension to its expected indicator codes
const MST_DIMENSIONS = [
  {
    key: 'tecnologia',
    label: 'Tecnologia',
    icon: Wifi,
    description:
      'Conectividade digital, cobertura 5G/4G e Wi-Fi público — infraestrutura para turismo inteligente.',
    codes: ['MST_5G_WIFI', 'MST_DIGITAL_PROMO'],
  },
  {
    key: 'inclusao',
    label: 'Inclusão',
    icon: Heart,
    description:
      'Acessibilidade universal (NBR 9050) e inclusão social no acesso aos atrativos turísticos.',
    codes: ['MST_ACC_NBR9050'],
  },
  {
    key: 'tbc',
    label: 'TBC — Turismo de Base Comunitária',
    icon: Users,
    description:
      'Protagonismo da comunidade local, governança participativa e distribuição equitativa de benefícios.',
    codes: ['MST_TBC_INITIATIVES', 'MST_TSE_TURNOUT'],
  },
  {
    key: 'sensibilizacao',
    label: 'Sensibilização',
    icon: Megaphone,
    description:
      'Educação ambiental, preservação patrimonial, balneabilidade e áreas verdes — consciência socioambiental.',
    codes: ['MST_GREEN_AREAS', 'MST_BATHING_QUALITY', 'MST_HERITAGE_PROT', 'MST_PNQT_QUAL'],
  },
] as const;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  ADEQUADO: { label: 'Adequado', className: 'bg-severity-bom/15 text-severity-bom border-severity-bom/30' },
  ATENCAO: { label: 'Atenção', className: 'bg-severity-moderado/15 text-severity-moderado border-severity-moderado/30' },
  CRITICO: { label: 'Crítico', className: 'bg-severity-critico/15 text-severity-critico border-severity-critico/30' },
};

export function MandalaAnalysisView({
  pillarScores,
  indicatorScores,
  destinationName,
}: MandalaAnalysisViewProps) {
  // Filter MST indicators
  const mstIndicators = indicatorScores.filter((i) => i.indicator_code?.startsWith('MST_'));

  // Group by dimension and compute aggregate score
  const dimensionAnalysis = MST_DIMENSIONS.map((dim) => {
    const matched = mstIndicators.filter((i) => (dim.codes as readonly string[]).includes(i.indicator_code));
    const filled = matched.filter((i) => i.normalized_score !== null && i.normalized_score !== undefined);
    const avgScore =
      filled.length > 0
        ? filled.reduce((sum, i) => sum + (i.normalized_score ?? 0), 0) / filled.length
        : null;
    const severity: Severity | null =
      avgScore === null ? null : avgScore >= 0.67 ? 'BOM' : avgScore >= 0.34 ? 'MODERADO' : 'CRITICO';
    return { ...dim, indicators: matched, avgScore, severity, filledCount: filled.length };
  });

  const totalFilledMst = mstIndicators.filter(
    (i) => i.normalized_score !== null && i.normalized_score !== undefined,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-accent/15 to-accent/5 rounded-xl border border-accent/30 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-accent/20 shrink-0">
            <Sparkles className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-foreground">
                Mandala da Sustentabilidade no Turismo (MST)
              </h3>
              <Badge variant="outline" className="text-xs gap-1">
                🌀 MST
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Visão sistêmica integrada baseada em Mario Beni (2007) com as 4 dimensões transversais
              propostas por Tasso, Silva &amp; Nascimento (2024): Tecnologia, Inclusão, TBC e
              Sensibilização. {totalFilledMst} de 9 indicadores MST preenchidos.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Mandala */}
      <MandalaDestino
        pillarScores={pillarScores}
        expandWithMandala
        destinationName={destinationName}
      />

      {/* Dimension analysis grid */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-4">
          Análise das Dimensões MST
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensionAnalysis.map((dim) => {
            const Icon = dim.icon;
            const statusInfo = dim.severity ? STATUS_STYLE[dim.severity === 'BOM' ? 'ADEQUADO' : dim.severity === 'MODERADO' ? 'ATENCAO' : 'CRITICO'] : null;
            return (
              <Card key={dim.key} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-md bg-accent/15">
                        <Icon className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <CardTitle className="text-base">{dim.label}</CardTitle>
                    </div>
                    {dim.avgScore !== null ? (
                      <Badge variant="outline" className={cn('shrink-0', statusInfo?.className)}>
                        {Math.round(dim.avgScore * 100)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        Sem dados
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{dim.description}</p>

                  {dim.indicators.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>Nenhum indicador MST desta dimensão preenchido neste diagnóstico.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dim.indicators.map((ind) => (
                        <div
                          key={ind.indicator_code}
                          className="flex items-center justify-between gap-2 text-xs border-l-2 border-accent/30 pl-2 py-1"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {ind.indicator_code}
                            </div>
                            <div className="truncate text-foreground">
                              {ind.indicator_name || '—'}
                            </div>
                          </div>
                          {ind.normalized_score !== null && ind.normalized_score !== undefined ? (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {Math.round(ind.normalized_score * 100)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
                              Vazio
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Methodology note */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Sobre a Mandala da Sustentabilidade
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A Mandala visual mostra os 3 pilares clássicos do SISTUR (RA, OE, AO) como setores
            concêntricos preenchidos proporcionalmente ao score de cada pilar. O anel externo lista
            as 4 dimensões transversais MST que atravessam todos os pilares. As 4 cards acima
            consolidam a média dos indicadores MST_* preenchidos por dimensão. Indicadores sem
            valor (linha MANUAL no pré-preenchimento) não entram no cálculo da média até serem
            preenchidos na próxima rodada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertTriangle, Shield, Leaf, Building2 } from 'lucide-react';

interface Props {
  indicators: any[];
  indicatorValues: any[];
  tier?: string;
  isEnterprise?: boolean;
}

const PILLAR_META = {
  RA: { label: 'Relações Ambientais', icon: Leaf, color: 'text-green-600' },
  AO: { label: 'Ações Operacionais', icon: Shield, color: 'text-blue-600' },
  OE: { label: 'Organização Estrutural', icon: Building2, color: 'text-amber-600' },
};

export function PreCalculationChecklist({ indicators, indicatorValues, tier, isEnterprise }: Props) {
  const analysis = useMemo(() => {
    const filledCodes = new Set(indicatorValues.filter((v: any) => !v.is_ignored && v.value != null).map((v: any) => v.indicator?.code || v.indicator_id));

    // Tier semantics must match the manual entry form (DataImportPanel +
    // useIndicators hook): SMALL ⊂ MEDIUM ⊂ COMPLETE on `minimum_tier`.
    // Accept legacy lowercase values just in case.
    const normalizedTier = String(tier || 'COMPLETE').toUpperCase();
    const allowedTiers: Set<string> =
      normalizedTier === 'SMALL' || normalizedTier === 'ESSENTIAL'
        ? new Set(['SMALL'])
        : normalizedTier === 'MEDIUM' || normalizedTier === 'STRATEGIC'
          ? new Set(['SMALL', 'MEDIUM'])
          : new Set(['SMALL', 'MEDIUM', 'COMPLETE']);
    const filteredIndicators = indicators.filter((ind: any) => {
      const indTier = (ind.minimum_tier || ind.tier || 'SMALL').toUpperCase();
      return allowedTiers.has(indTier);
    });

    const byPillar: Record<string, { total: number; filled: number; missing: { code: string; name: string }[] }> = {};
    
    filteredIndicators.forEach((ind: any) => {
      const pillar = ind.pillar || 'RA';
      if (!byPillar[pillar]) byPillar[pillar] = { total: 0, filled: 0, missing: [] };
      byPillar[pillar].total++;
      if (filledCodes.has(ind.code) || filledCodes.has(ind.id)) {
        byPillar[pillar].filled++;
      } else {
        byPillar[pillar].missing.push({ code: ind.code, name: ind.name || ind.code });
      }
    });

    const totalFilled = Object.values(byPillar).reduce((s, p) => s + p.filled, 0);
    const totalRequired = Object.values(byPillar).reduce((s, p) => s + p.total, 0);

    // Data quality: check age of data
    const oldData = indicatorValues.filter((v: any) => {
      if (!v.reference_date) return false;
      const age = (Date.now() - new Date(v.reference_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age > 2;
    });

    const manualCount = indicatorValues.filter((v: any) => v.source_type === 'MANUAL' || v.collection_method === 'MANUAL').length;
    const autoCount = indicatorValues.filter((v: any) => v.source_type !== 'MANUAL' && v.collection_method !== 'MANUAL').length;

    // Quality score: 0-100
    const completeness = totalRequired > 0 ? (totalFilled / totalRequired) : 0;
    const freshness = indicatorValues.length > 0 ? 1 - (oldData.length / indicatorValues.length) : 1;
    const automation = indicatorValues.length > 0 ? autoCount / indicatorValues.length : 0;
    const qualityScore = Math.round((completeness * 0.5 + freshness * 0.3 + automation * 0.2) * 100);

    return { byPillar, totalFilled, totalRequired, oldData, manualCount, autoCount, qualityScore, completeness };
  }, [indicators, indicatorValues, tier]);

  const overallPct = analysis.totalRequired > 0 ? (analysis.totalFilled / analysis.totalRequired) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Validação Pré-Cálculo
          </span>
          <Badge variant={analysis.qualityScore >= 70 ? 'default' : analysis.qualityScore >= 40 ? 'secondary' : 'destructive'}>
            Qualidade: {analysis.qualityScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Preenchimento geral</span>
            <span className="font-medium">{analysis.totalFilled}/{analysis.totalRequired} ({Math.round(overallPct)}%)</span>
          </div>
          <Progress value={overallPct} className="h-2" />
        </div>

        {/* Per-pillar breakdown */}
        <div className="grid gap-3">
          {Object.entries(PILLAR_META).map(([pillar, meta]) => {
            const data = analysis.byPillar[pillar];
            if (!data) return null;
            const pct = data.total > 0 ? (data.filled / data.total) * 100 : 0;
            const Icon = meta.icon;

            return (
              <div key={pillar} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className={`flex items-center gap-2 text-sm font-medium ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {data.filled}/{data.total}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5 mb-2" />
                {data.missing.length > 0 && (
                  <div className="mt-1 space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Faltam preencher ({data.missing.length}):
                    </p>
                    <ul className="space-y-0.5 max-h-32 overflow-auto pr-1">
                      {data.missing.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1 text-xs text-muted-foreground"
                          title={`Código: ${item.code}`}
                        >
                          <Circle className="h-2.5 w-2.5 mt-1 shrink-0" />
                          <span className="leading-snug">
                            <span className="font-mono text-[10px] text-foreground/70">{item.code}</span>
                            {' — '}
                            {item.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warnings */}
        {analysis.oldData.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {analysis.oldData.length} indicador(es) com dados com mais de 2 anos. Considere atualizar.
            </p>
          </div>
        )}

        {/* Data quality breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{Math.round(analysis.completeness * 100)}%</p>
            <p className="text-[10px] text-muted-foreground">Completude</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{analysis.autoCount}</p>
            <p className="text-[10px] text-muted-foreground">Automáticos</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{analysis.manualCount}</p>
            <p className="text-[10px] text-muted-foreground">Manuais</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

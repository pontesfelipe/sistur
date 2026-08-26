// v1.98.0 — Sumário Executivo de 1 página.
//
// Consolida a rodada calculada em um resumo imprimível: índices dos pilares,
// principais gargalos e pontos fortes, avisos IGMA, próximos passos e
// procedência dos dados. Não faz cálculo próprio: apenas lê os resultados já
// persistidos e classifica com a régua canônica (getSeverityFromScore).

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import {
  PILLAR_INFO,
  SEVERITY_INFO,
  getSeverityFromScore,
  INTERPRETATION_INFO,
  type Pillar,
  type Severity,
  type TerritorialInterpretation,
} from '@/types/sistur';

interface Props {
  assessment: any;
  destinationName?: string | null;
  isEnterprise: boolean;
  pillarScores: any[];
  indicatorScores: any[];
  issues: any[];
  recommendations: any[];
  auditRows?: { indicator_code: string; source_type: string; source_detail: string | null }[];
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

const pct = (score: number) => `${Math.round((score ?? 0) * 100)}%`;

export function ExecutiveSummary({
  assessment,
  destinationName,
  isEnterprise,
  pillarScores,
  indicatorScores,
  issues,
  recommendations,
  auditRows = [],
}: Props) {
  const ranked = [...indicatorScores]
    .filter((s: any) => typeof s.score === 'number' && s.indicator)
    .sort((a: any, b: any) => a.score - b.score);

  const bottlenecks = ranked.slice(0, 5);
  const strengths = [...ranked].reverse().slice(0, 5);

  const igma = assessment?.igma_interpretation as any;
  const igmaWarnings: string[] = [];
  if (assessment?.marketing_blocked) igmaWarnings.push('Promoção/marketing bloqueado até resolver os gargalos estruturais.');
  if (assessment?.externality_warning) igmaWarnings.push('Risco de externalidades negativas identificado.');
  if (assessment?.ra_limitation) igmaWarnings.push('Limitação em Relações Ambientais restringe o teto de desempenho.');
  if (assessment?.governance_block) igmaWarnings.push('Bloqueio de governança: decisões dependem de arranjo institucional.');
  if (typeof igma?.summary === 'string' && igma.summary.trim()) igmaWarnings.push(igma.summary.trim());

  const interpretation = assessment?.territorial_interpretation as TerritorialInterpretation | null;

  const sources = Array.from(
    new Set(
      auditRows
        .map((r) => r.source_detail || r.source_type)
        .filter((s): s is string => !!s),
    ),
  ).slice(0, 12);

  const criticalIssues = issues.filter((i: any) => i.severity === 'CRITICO');

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div id="executive-summary" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-xl">
              Sumário Executivo — {destinationName || assessment?.title}
            </CardTitle>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>Ciclo: {assessment?.title}</span>
              <span>
                Período: {formatDate(assessment?.period_start)} — {formatDate(assessment?.period_end)}
              </span>
              <span>Calculado em: {formatDate(assessment?.calculated_at)}</span>
              <span>Tipo: {isEnterprise ? 'Empresarial' : 'Territorial'}</span>
              <span>Nível: {assessment?.tier || 'COMPLETE'}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pilares */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {pillarScores.map((ps: any) => {
                const severity = getSeverityFromScore(ps.score) as Severity;
                return (
                  <div key={ps.id ?? ps.pillar} className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      {PILLAR_INFO[ps.pillar as Pillar]?.fullName ?? ps.pillar}
                    </p>
                    <p className="text-3xl font-bold">{pct(ps.score)}</p>
                    <Badge variant="outline" className={SEVERITY_INFO[severity].color}>
                      {SEVERITY_INFO[severity].label}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {interpretation && INTERPRETATION_INFO[interpretation] && (
              <p className="text-sm">
                <strong>Interpretação territorial:</strong>{' '}
                {INTERPRETATION_INFO[interpretation].label} — {INTERPRETATION_INFO[interpretation].description}
              </p>
            )}

            {igmaWarnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Avisos IGMA</h4>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
                  {igmaWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gargalos e forças */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-sm mb-2">Principais gargalos</h4>
                <ul className="space-y-1 text-sm">
                  {bottlenecks.length === 0 && <li className="text-muted-foreground">Sem dados suficientes.</li>}
                  {bottlenecks.map((s: any) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {s.indicator?.code} — {s.indicator?.name}
                      </span>
                      <span className={SEVERITY_INFO[getSeverityFromScore(s.score) as Severity].color}>
                        {pct(s.score)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Pontos fortes</h4>
                <ul className="space-y-1 text-sm">
                  {strengths.length === 0 && <li className="text-muted-foreground">Sem dados suficientes.</li>}
                  {strengths.map((s: any) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {s.indicator?.code} — {s.indicator?.name}
                      </span>
                      <span className={SEVERITY_INFO[getSeverityFromScore(s.score) as Severity].color}>
                        {pct(s.score)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Próximos passos */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Próximos passos</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {issues.length} gargalos identificados ({criticalIssues.length} críticos) e{' '}
                {recommendations.length} capacitações prescritas.
              </p>
              <ul className="list-disc pl-5 text-sm space-y-0.5">
                {recommendations.slice(0, 5).map((r: any) => (
                  <li key={r.id}>
                    {r.training?.title || r.course?.title || r.title || 'Capacitação recomendada'}
                    {r.issue?.title ? ` — trata: ${r.issue.title}` : ''}
                  </li>
                ))}
                {recommendations.length === 0 && (
                  <li className="text-muted-foreground">Nenhuma prescrição gerada para esta rodada.</li>
                )}
              </ul>
            </div>

            {/* Procedência */}
            <div className="border-t pt-3 text-xs text-muted-foreground">
              <p>
                <strong>Procedência dos dados:</strong>{' '}
                {sources.length > 0 ? sources.join(' · ') : 'Registros manuais da organização.'}
              </p>
              <p className="mt-1">
                SISTUR v{APP_VERSION.full} — gerado em {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

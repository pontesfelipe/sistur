import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, MapPin, AlertTriangle, ArrowRight, Building2, Info } from 'lucide-react';
import { useIntegratedTerritorialView } from '@/hooks/useIntegratedTerritorialView';

interface Props {
  enterpriseDestinationId: string;
  enterprisePillarScores: Array<{ pillar: string; score: number; severity: string }>;
  destinationName: string;
}

const PILLAR_LABELS: Record<string, string> = {
  RA: 'I-RA · Relações Ambientais',
  OE: 'I-OE · Organização Estrutural',
  AO: 'I-AO · Ações Operacionais',
};

const SEVERITY_STYLE: Record<string, { color: string; label: string }> = {
  CRITICO: { color: 'text-severity-critical', label: 'Crítico' },
  MODERADO: { color: 'text-severity-moderate', label: 'Atenção' },
  BOM: { color: 'text-severity-good', label: 'Adequado' },
};

function pct(score: number | undefined) {
  if (score == null || isNaN(score)) return '—';
  return `${Math.round(score * 100)}%`;
}

function delta(ent: number | undefined, terr: number | undefined) {
  if (ent == null || terr == null) return null;
  return Math.round((ent - terr) * 100);
}

export function IntegratedTerritorialView({
  enterpriseDestinationId,
  enterprisePillarScores,
  destinationName,
}: Props) {
  const { data, isLoading } = useIntegratedTerritorialView(enterpriseDestinationId, true);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data?.matched) {
    const reasonText =
      data?.reason === 'no_ibge'
        ? 'Este empreendimento não tem código IBGE cadastrado — não é possível localizar o município de referência.'
        : data?.reason === 'no_assessment'
        ? 'Ainda não há nenhum diagnóstico Territorial cadastrado para o município deste empreendimento.'
        : 'Existe diagnóstico Territorial para o município, mas ele ainda não foi calculado.';
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Visão Integrada indisponível</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{reasonText}</p>
          <p className="text-sm text-muted-foreground">
            A Visão Integrada cruza o desempenho do empreendimento com o diagnóstico
            Territorial do município, ajudando a separar gargalos internos de causas
            externas (infra pública, segurança, conectividade, sazonalidade do destino).
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  const terrPillarMap = new Map(
    (data.pillarScores || []).map((p) => [p.pillar, p]),
  );
  const entPillarMap = new Map(enterprisePillarScores.map((p) => [p.pillar, p]));

  const criticalTerritorialIssues = (data.issues || []).filter(
    (i) => i.severity === 'CRITICO',
  );

  return (
    <div className="space-y-6">
      {/* Header card with municipality reference */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Visão Integrada — Empreendimento × Município
              </CardTitle>
              <CardDescription className="mt-1.5 space-y-0.5">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {destinationName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.destination?.name} {data.destination?.uf ? `(${data.destination.uf})` : ''}
                  {data.assessment?.calculated_at && (
                    <span className="text-xs text-muted-foreground ml-1">
                      · diagnóstico territorial de{' '}
                      {new Date(data.assessment.calculated_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </span>
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/diagnosticos/${data.assessment!.id}`}>
                Abrir diagnóstico territorial
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Pillar-by-pillar comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação por Pilar</CardTitle>
          <CardDescription>
            Score do empreendimento vs. score do município no mesmo pilar sistêmico (RA/OE/AO).
            Δ positivo indica que o empreendimento está acima do entorno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(['RA', 'OE', 'AO'] as const).map((p) => {
            const ent = entPillarMap.get(p);
            const terr = terrPillarMap.get(p);
            const d = delta(ent?.score, terr?.score);
            const entSev = ent?.severity ? SEVERITY_STYLE[ent.severity] : null;
            const terrSev = terr?.severity ? SEVERITY_STYLE[terr.severity] : null;
            return (
              <div
                key={p}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 md:items-center p-3 rounded-lg border bg-card"
              >
                <div className="font-medium text-sm">{PILLAR_LABELS[p]}</div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Empreend.: </span>
                  <span className={`font-semibold ${entSev?.color ?? ''}`}>
                    {pct(ent?.score)} {entSev ? `· ${entSev.label}` : ''}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Município: </span>
                  <span className={`font-semibold ${terrSev?.color ?? ''}`}>
                    {pct(terr?.score)} {terrSev ? `· ${terrSev.label}` : ''}
                  </span>
                </div>
                <div className="text-sm font-mono">
                  {d == null ? (
                    <span className="text-muted-foreground">Δ —</span>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        d > 5
                          ? 'border-severity-good/50 text-severity-good'
                          : d < -5
                          ? 'border-severity-critical/50 text-severity-critical'
                          : 'text-muted-foreground'
                      }
                    >
                      Δ {d > 0 ? '+' : ''}
                      {d} pp
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Territorial context alerts */}
      {criticalTerritorialIssues.length > 0 && (
        <Card className="border-severity-critical/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-severity-critical" />
              Gargalos críticos no município
            </CardTitle>
            <CardDescription>
              Esses gargalos territoriais podem afetar o desempenho do empreendimento mesmo
              quando a gestão interna está adequada — considere ações conjuntas com a
              secretaria de turismo, consórcio ou trade local.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalTerritorialIssues.slice(0, 8).map((i) => (
              <div
                key={i.id}
                className="flex items-start gap-3 p-3 rounded-md bg-severity-critical/5 border border-severity-critical/20"
              >
                <Badge variant="outline" className="shrink-0 text-xs">
                  {i.pillar}
                </Badge>
                <div className="text-sm">
                  <div className="font-medium">{i.title}</div>
                  {i.description && (
                    <div className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                      {i.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {criticalTerritorialIssues.length > 8 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                + {criticalTerritorialIssues.length - 8} outros gargalos críticos no município
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          A Visão Integrada é informativa e não altera o cálculo do diagnóstico Empresarial.
          Use-a para contextualizar gargalos, justificar planos de ação cruzados (interno +
          territorial) e priorizar projetos junto à governança do destino.
        </AlertDescription>
      </Alert>
    </div>
  );
}

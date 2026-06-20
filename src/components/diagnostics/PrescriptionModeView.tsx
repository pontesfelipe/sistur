import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, GraduationCap, ExternalLink, Target, ListChecks, FolderKanban } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { PILLAR_INFO, SEVERITY_INFO, getSeverityFromScore, type Severity } from '@/types/sistur';

interface Props {
  assessmentId: string;
  indicatorScores: Array<{
    id: string;
    indicator_id: string;
    score: number;
    indicator?: { id: string; code: string; name: string; pillar: string };
  }>;
}

/**
 * Modo Prescrição — Aba consolidada
 * Mostra apenas indicadores em Atenção/Crítico que disparam prescrições EDU,
 * agrupados por pilar, com a justificativa e o curso associado.
 */
export function PrescriptionModeView({ assessmentId, indicatorScores }: Props) {
  const { data: prescriptions = [], isLoading } = usePrescriptions(assessmentId);
  const navigate = useNavigate();
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const toggleCode = (code: string) =>
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  // Triggers: indicators in Atenção or Crítico (score ≤ 0.66)
  const triggers = useMemo(() => {
    return indicatorScores
      .filter((s) => s.score <= 0.66 && s.indicator)
      .map((s) => ({
        ...s,
        severity: getSeverityFromScore(s.score),
      }))
      .sort((a, b) => a.score - b.score);
  }, [indicatorScores]);

  const prescriptionsByIndicator = useMemo(() => {
    const map = new Map<string, typeof prescriptions>();
    prescriptions.forEach((p) => {
      if (!p.indicator_id) return;
      const arr = map.get(p.indicator_id) || [];
      arr.push(p);
      map.set(p.indicator_id, arr);
    });
    return map;
  }, [prescriptions]);

  const triggersByPillar = useMemo(() => {
    const grouped: Record<string, typeof triggers> = { RA: [], OE: [], AO: [] };
    triggers.forEach((t) => {
      const pillar = t.indicator?.pillar || 'RA';
      if (!grouped[pillar]) grouped[pillar] = [];
      grouped[pillar].push(t);
    });
    return grouped;
  }, [triggers]);

  const totalTriggers = triggers.length;
  const triggersWithPrescription = triggers.filter((t) =>
    prescriptionsByIndicator.has(t.indicator_id)
  ).length;
  const coverage = totalTriggers > 0 ? (triggersWithPrescription / totalTriggers) * 100 : 100;

  const allCodes = useMemo(
    () => triggers.map((t) => t.indicator?.code).filter(Boolean) as string[],
    [triggers],
  );
  const selectAll = () => setSelectedCodes(new Set(allCodes));
  const clearAll = () => setSelectedCodes(new Set());

  const goToCreateProject = () => {
    const codes = selectedCodes.size > 0 ? Array.from(selectedCodes) : allCodes;
    const params = new URLSearchParams({
      fromAssessment: assessmentId,
      indicators: codes.join(','),
    });
    navigate(`/projetos?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground mb-1">
              Modo Prescrição
            </h3>
            <p className="text-sm text-muted-foreground">
              Visão focada apenas em indicadores que disparam ações corretivas
              (status Atenção ou Crítico) com cursos prescritos automaticamente
              pelo motor SISTUR EDU.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs de cobertura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gatilhos identificados</CardDescription>
            <CardTitle className="text-3xl">{totalTriggers}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Indicadores em Atenção ou Crítico
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com prescrição EDU</CardDescription>
            <CardTitle className="text-3xl">{triggersWithPrescription}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cursos vinculados automaticamente
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cobertura</CardDescription>
            <CardTitle className="text-3xl">{Math.round(coverage)}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {coverage >= 100
              ? 'Cobertura total atingida'
              : 'Indicadores sem curso correspondente no catálogo'}
          </CardContent>
        </Card>
      </div>

      {totalTriggers === 0 && (
        <Alert>
          <ListChecks className="h-4 w-4" />
          <AlertTitle>Nenhum gatilho prescritivo</AlertTitle>
          <AlertDescription>
            Todos os indicadores estão com status Adequado. Não há prescrições
            corretivas necessárias neste momento.
          </AlertDescription>
        </Alert>
      )}

      {/* Action bar — turn the selected (or all) triggers into a new project */}
      {totalTriggers > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6">
            <div className="text-sm">
              <p className="font-medium flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Transformar gatilhos em projeto
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {selectedCodes.size > 0
                  ? `${selectedCodes.size} indicador(es) selecionado(s) — vira(m) o baseline do novo projeto.`
                  : `Sem seleção, todos os ${totalTriggers} gatilhos viram baseline.`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={selectAll}>Selecionar todos</Button>
              <Button size="sm" variant="ghost" onClick={clearAll} disabled={selectedCodes.size === 0}>
                Limpar
              </Button>
              <Button size="sm" onClick={goToCreateProject}>
                <FolderKanban className="h-4 w-4 mr-1" /> Criar projeto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista por pilar */}
      {(['RA', 'OE', 'AO'] as const).map((pillar) => {
        const items = triggersByPillar[pillar] || [];
        if (items.length === 0) return null;
        const info = PILLAR_INFO[pillar];

        return (
          <Card key={pillar}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full bg-pillar-${pillar.toLowerCase()}`} />
                    {info?.name || pillar}
                  </CardTitle>
                  <CardDescription>
                    {items.length} indicador{items.length !== 1 ? 'es' : ''} prescritivo{items.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Badge variant="outline">{pillar}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((trigger) => {
                const prescriptionsForInd = prescriptionsByIndicator.get(trigger.indicator_id) || [];
                const hasCourse = prescriptionsForInd.length > 0;
                const code = trigger.indicator?.code;
                return (
                  <div
                    key={trigger.id}
                    className="border rounded-lg p-4 space-y-2 bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 flex gap-3">
                        {code && (
                          <Checkbox
                            checked={selectedCodes.has(code)}
                            onCheckedChange={() => toggleCode(code)}
                            className="mt-1"
                            aria-label={`Selecionar ${code} para o projeto`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={trigger.severity === 'CRITICO' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {SEVERITY_INFO[trigger.severity as Severity].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {trigger.indicator?.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Score: {Math.round(trigger.score * 100)}%
                          </span>
                        </div>
                        <p className="font-medium text-sm mt-1">
                          {trigger.indicator?.name}
                        </p>
                        </div>
                      </div>
                      {!hasCourse && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Sem curso
                        </Badge>
                      )}
                    </div>

                    {hasCourse && (
                      <div className="pt-2 border-t space-y-2">
                        {prescriptionsForInd.map((p) => {
                          const courseTitle = p.course?.title || p.training?.title;
                          return (
                            <div
                              key={p.id}
                              className="flex items-start justify-between gap-2 bg-accent/5 rounded p-2"
                            >
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <GraduationCap className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {courseTitle || 'Curso prescrito'}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {p.justification}
                                  </p>
                                </div>
                              </div>
                              {(p.course_id || p.training_id) && (
                                <Button size="sm" variant="ghost" asChild>
                                  <Link
                                    to={p.training_id
                                      ? `/edu/treinamento/${p.training_id}`
                                      : `/cursos`}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
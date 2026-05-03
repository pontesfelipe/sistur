import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CheckCircle2, Circle, Lock, ArrowRight, ChevronLeft, Route as RouteIcon } from 'lucide-react';
import {
  useAdaptivePaths,
  useAdaptivePath,
  useMyEnrollment,
  useEnrollmentProgress,
  useEnrollInPath,
  useUpdateStepProgress,
} from '@/hooks/useAdaptiveLearningPaths';

function PillarBadge({ pillar }: { pillar: string | null }) {
  if (!pillar) return null;
  const map: Record<string, string> = {
    RA: 'bg-pillar-ra/10 text-pillar-ra border-pillar-ra/30',
    OE: 'bg-pillar-oe/10 text-pillar-oe border-pillar-oe/30',
    AO: 'bg-pillar-ao/10 text-pillar-ao border-pillar-ao/30',
  };
  return <Badge variant="outline" className={map[pillar] ?? ''}>{pillar}</Badge>;
}

export default function EduTrilhasAdaptativas() {
  const { data: paths, isLoading } = useAdaptivePaths();

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trilhas Adaptativas</h1>
            <p className="text-sm text-muted-foreground">
              Percursos de aprendizagem que evoluem conforme seu desempenho e diagnóstico.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : !paths?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <RouteIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Nenhuma trilha adaptativa publicada ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((p) => (
              <Link key={p.id} to={`/edu/trilhas-adaptativas/${p.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{p.title}</CardTitle>
                      <PillarBadge pillar={p.pillar} />
                    </div>
                    {p.level && (
                      <Badge variant="secondary" className="w-fit text-xs capitalize">{p.level}</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3">{p.description}</CardDescription>
                    {p.is_adaptive && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        Adaptativa
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export function EduTrilhaAdaptativaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdaptivePath(id);
  const { data: enrollment } = useMyEnrollment(id);
  const { data: progress } = useEnrollmentProgress(enrollment?.id);
  const enroll = useEnrollInPath();
  const updateStep = useUpdateStepProgress();

  const progressMap = new Map((progress ?? []).map((p) => [p.step_id, p]));
  const completedCount = (progress ?? []).filter((p) => p.status === 'concluida').length;
  const totalSteps = data?.steps.length ?? 0;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!data?.path) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 text-center text-muted-foreground">Trilha não encontrada.</div>
      </AppLayout>
    );
  }

  const { path, steps } = data;

  const isStepUnlocked = (idx: number, stepId: string) => {
    if (idx === 0) return true;
    const prev = steps[idx - 1];
    if (!prev) return true;
    return progressMap.get(prev.id)?.status === 'concluida';
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/edu/trilhas-adaptativas"><ChevronLeft className="w-4 h-4 mr-1" />Voltar</Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{path.title}</CardTitle>
                <CardDescription className="mt-2">{path.description}</CardDescription>
              </div>
              <PillarBadge pillar={path.pillar} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrollment ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{completedCount} / {totalSteps} ({pct}%)</span>
                </div>
                <Progress value={pct} />
              </div>
            ) : (
              <Button
                onClick={() => id && enroll.mutate(id)}
                disabled={enroll.isPending}
                className="w-full sm:w-auto"
              >
                Iniciar trilha
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Etapas</h2>
          {steps.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma etapa cadastrada ainda.
            </CardContent></Card>
          )}
          {steps.map((step, idx) => {
            const sp = progressMap.get(step.id);
            const unlocked = enrollment && isStepUnlocked(idx, step.id);
            const done = sp?.status === 'concluida';
            return (
              <Card key={step.id} className={done ? 'border-success/40' : ''}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-1">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : !unlocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{idx + 1}. {step.title}</span>
                      {step.is_optional && <Badge variant="outline" className="text-xs">Opcional</Badge>}
                      {step.required_status && step.required_status !== 'any' && (
                        <Badge variant="outline" className="text-xs capitalize">
                          Trigger: {step.required_status}
                        </Badge>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {step.training_id && (
                        <Button asChild size="sm" variant="outline" disabled={!unlocked}>
                          <Link to={`/edu/treinamentos/${step.training_id}`}>Abrir curso</Link>
                        </Button>
                      )}
                      {enrollment && unlocked && !done && (
                        <Button
                          size="sm"
                          onClick={() => updateStep.mutate({
                            enrollment_id: enrollment.id,
                            step_id: step.id,
                            status: 'concluida',
                          })}
                          disabled={updateStep.isPending}
                        >
                          Marcar como concluída
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
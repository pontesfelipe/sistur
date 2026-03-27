import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, ArrowLeft, CheckCircle2,
  Clock, Lightbulb, BookOpen, Video, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getTopicDetail, type TutorialSubStep } from '@/data/tutorialSteps';
import { tutorialCategories } from '@/data/tutorialData';

export default function TutorialDetail() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();

  const topic = useMemo(() => getTopicDetail(topicId || ''), [topicId]);
  const originalStep = useMemo(() => {
    for (const cat of tutorialCategories) {
      const s = cat.steps.find(st => st.id === topicId);
      if (s) return { step: s, category: cat };
    }
    return null;
  }, [topicId]);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sistur_tutorial_detail_completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [expandedTips, setExpandedTips] = useState(false);

  if (!topic || !originalStep) {
    return (
      <AppLayout title="Tutorial" subtitle="Tópico não encontrado">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">Tópico de tutorial não encontrado.</p>
          <Button onClick={() => navigate('/tutorial')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Tutorial
          </Button>
        </div>
      </AppLayout>
    );
  }

  const subStep = topic.subSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === topic.subSteps.length - 1;
  const stepDone = completedSteps.has(subStep.id);
  const totalDone = topic.subSteps.filter(s => completedSteps.has(s.id)).length;
  const progressPct = Math.round((totalDone / topic.subSteps.length) * 100);

  const toggleComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      localStorage.setItem('sistur_tutorial_detail_completed', JSON.stringify([...next]));
      return next;
    });
  };

  const handleNext = () => {
    if (!stepDone) toggleComplete(subStep.id);
    if (!isLast) setCurrentStep(i => i + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(i => i - 1);
  };

  const StepIcon = originalStep.step.icon;

  return (
    <AppLayout title="Tutorial" subtitle={topic.title}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tutorial')} className="mt-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">{originalStep.category.title}</Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{topic.estimatedMinutes} min
              </Badge>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              {topic.title}
            </h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">{topic.introduction}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso do tópico</span>
            <span className="font-medium">{totalDone}/{topic.subSteps.length} passos ({progressPct}%)</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Step navigation sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Step list sidebar */}
          <div className="hidden lg:block space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Passos</p>
            {topic.subSteps.map((s, i) => {
              const done = completedSteps.has(s.id);
              const active = i === currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-start gap-2.5',
                    active && 'bg-primary/10 text-primary font-medium',
                    !active && done && 'text-muted-foreground',
                    !active && !done && 'text-foreground hover:bg-muted',
                  )}
                >
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5',
                    done && 'bg-primary text-primary-foreground',
                    active && !done && 'bg-primary/20 text-primary border-2 border-primary',
                    !active && !done && 'bg-muted text-muted-foreground',
                  )}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="leading-snug">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Main content area */}
          <div className="space-y-6">
            {/* Mobile step indicator */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2">
              {topic.subSteps.map((s, i) => {
                const done = completedSteps.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                      done && 'bg-primary text-primary-foreground',
                      i === currentStep && !done && 'bg-primary/20 text-primary border-2 border-primary',
                      i !== currentStep && !done && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </button>
                );
              })}
            </div>

            {/* Step content card */}
            <Card className="overflow-hidden">
              {/* Step header */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold',
                    stepDone ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary',
                  )}>
                    {stepDone ? <CheckCircle2 className="h-5 w-5" /> : currentStep + 1}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Passo {currentStep + 1} de {topic.subSteps.length}</p>
                    <h2 className="text-lg font-semibold text-foreground">{subStep.title}</h2>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Description */}
                <p className="text-foreground leading-relaxed text-base">{subStep.description}</p>

                {/* Illustrative image */}
                {subStep.imagePath && (
                  <div className="rounded-xl overflow-hidden border bg-muted/30">
                    <img
                      src={subStep.imagePath}
                      alt={subStep.title}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Video placeholder */}
                {subStep.videoUrl && (
                  <div className="rounded-xl overflow-hidden border bg-muted/30 aspect-video flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-sm">Vídeo demonstrativo em breve</p>
                    </div>
                  </div>
                )}

                {/* Detailed instructions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Detalhes
                  </h3>
                  <ul className="space-y-2.5">
                    {subStep.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-foreground/90">
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
                          {i + 1}
                        </div>
                        <span className="leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tips */}
                {subStep.tips && subStep.tips.length > 0 && (
                  <>
                    <Separator />
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <button
                        onClick={() => setExpandedTips(!expandedTips)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex-1">
                          Dicas ({subStep.tips.length})
                        </span>
                        {expandedTips ? (
                          <ChevronUp className="h-4 w-4 text-amber-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-amber-600" />
                        )}
                      </button>
                      {expandedTips && (
                        <ul className="mt-3 space-y-2">
                          {subStep.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                              <span className="text-amber-500">💡</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={handlePrev} disabled={isFirst}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant={stepDone ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => toggleComplete(subStep.id)}
                  className="hidden sm:flex"
                >
                  <CheckCircle2 className={cn('h-4 w-4 mr-1', stepDone && 'text-primary')} />
                  {stepDone ? 'Concluído' : 'Marcar como concluído'}
                </Button>
              </div>

              {isLast ? (
                <Button onClick={() => navigate('/tutorial')}>
                  Voltar ao Tutorial
                  <ArrowLeft className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Route link */}
            {originalStep.step.route && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Quer experimentar agora?
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(originalStep.step.route!)}>
                    Ir para {originalStep.step.title}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

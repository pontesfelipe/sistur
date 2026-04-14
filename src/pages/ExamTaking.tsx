import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  BookOpen,
  Timer,
  Award,
} from 'lucide-react';
import { useExam, useExamAttempt, useExamMutations, useExamAnswerMutations } from '@/hooks/useExams';
import { useQuizQuestion } from '@/hooks/useQuizzes';
import { useEduSessionTracker } from '@/hooks/useEduSessionTracker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LOW_TIME_WARNING_SECONDS = 120; // 2 minutes

const ExamTaking = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerTypes, setAnswerTypes] = useState<Record<string, 'essay' | 'choice'>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; needsManualGrading?: boolean } | null>(null);
  const [warnedLowTime, setWarnedLowTime] = useState(false);

  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: attempt } = useExamAttempt(examId);
  const { startExam } = useExamMutations();
  const { submitAnswer, submitExam } = useExamAnswerMutations();

  // Debounced per-question save. Essays are saved ~800ms after typing stops;
  // option picks save immediately. A refresh/close mid-exam won't wipe answers.
  const saveTimers = useRef<Record<string, number>>({});
  const lastSavedRef = useRef<Record<string, string>>({});
  const hydratedRef = useRef(false);

  // AVA Compliance: session tracking for exams
  const { logInteraction } = useEduSessionTracker({
    sessionType: 'exam',
    entityType: 'exam',
    entityId: examId,
    enabled: !!examId,
  });

  // Get options for current question
  const currentQuestionId = exam?.question_ids?.[currentQuestionIndex];
  const { data: currentQuestion } = useQuizQuestion(currentQuestionId);
  const currentOptions = currentQuestion?.options || [];
  const isEssayQuestion = currentQuestion?.question_type === 'essay';

  // Hydrate answers from server when the attempt arrives (supports refresh mid-exam).
  useEffect(() => {
    if (hydratedRef.current || !attempt?.answers?.length) return;
    const restored: Record<string, string> = {};
    const restoredTypes: Record<string, 'essay' | 'choice'> = {};
    for (const a of attempt.answers as Array<{ quiz_id: string; selected_option_id: string | null; free_text_answer: string | null }>) {
      if (a.free_text_answer) {
        restored[a.quiz_id] = a.free_text_answer;
        restoredTypes[a.quiz_id] = 'essay';
      } else if (a.selected_option_id) {
        restored[a.quiz_id] = a.selected_option_id;
        restoredTypes[a.quiz_id] = 'choice';
      }
    }
    if (Object.keys(restored).length > 0) {
      setAnswers(restored);
      setAnswerTypes(restoredTypes);
      lastSavedRef.current = { ...restored };
    }
    hydratedRef.current = true;
  }, [attempt]);

  // Timer effect — only starts when an attempt exists so auto-submit can't
  // silently no-op by racing ahead of the attempt query.
  useEffect(() => {
    if (!exam || exam.status !== 'started' || !attempt) return;

    const expiresAt = new Date(exam.expires_at).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeRemaining(remaining);

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        // Warn when low on time
        if (prev === LOW_TIME_WARNING_SECONDS && !warnedLowTime) {
          setWarnedLowTime(true);
          toast.warning('Atenção: restam apenas 2 minutos para finalizar o exame!');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, attempt]);

  // Prevent accidental navigation away from an active exam.
  useEffect(() => {
    if (!exam || exam.status !== 'started' || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [exam, submitted]);

  // Flush any pending debounced saves on unmount.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const t of Object.values(timers)) window.clearTimeout(t);
    };
  }, []);

  const handleAutoSubmit = async () => {
    if (!examId || submitted) return;
    try {
      await handleSubmit();
      toast.warning('Tempo esgotado! Exame enviado automaticamente.');
    } catch (error) {
      console.error('Auto-submit error:', error);
      toast.error('Erro ao enviar exame automaticamente. Por favor, tente enviar manualmente.');
      setSubmitted(false);
    }
  };

  const handleStartExam = async () => {
    if (!examId) return;
    try {
      await startExam.mutateAsync(examId);
      logInteraction('exam_start', examId, 'Início de prova');
      toast.success('Exame iniciado!');
    } catch (error) {
      toast.error('Erro ao iniciar exame');
    }
  };

  const persistAnswer = useCallback(
    (questionId: string, value: string, type: 'essay' | 'choice') => {
      if (!attempt) return;
      if (lastSavedRef.current[questionId] === value) return;
      lastSavedRef.current[questionId] = value;
      submitAnswer
        .mutateAsync({
          attemptId: attempt.attempt_id,
          quizId: questionId,
          selectedOptionId: type === 'essay' ? undefined : value,
          freeTextAnswer: type === 'essay' ? value : undefined,
        })
        .catch(() => {
          // Allow the next change to retry; don't spam the user with toasts.
          delete lastSavedRef.current[questionId];
        });
    },
    [attempt, submitAnswer]
  );

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    // Track question type so we don't rely on fragile UUID-length heuristics at submit time.
    const type: 'essay' | 'choice' = isEssayQuestion ? 'essay' : 'choice';
    setAnswerTypes(prev => ({
      ...prev,
      [questionId]: type,
    }));
    logInteraction('answer_select', questionId, `Resposta Q${currentQuestionIndex + 1}`);

    // Choice answers save immediately; essays are debounced to ~800ms after typing stops.
    if (saveTimers.current[questionId]) {
      window.clearTimeout(saveTimers.current[questionId]);
    }
    const delay = type === 'essay' ? 800 : 0;
    saveTimers.current[questionId] = window.setTimeout(() => {
      persistAnswer(questionId, answer, type);
    }, delay);
  };

  const handleSubmit = async () => {
    if (!examId || !attempt) return;
    if (submitted || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitted(true);

    try {
      // Flush any outstanding debounced saves for answers that differ from what we last persisted.
      for (const [quizId, value] of Object.entries(answers)) {
        if (lastSavedRef.current[quizId] === value) continue;
        const trackedType = answerTypes[quizId];
        const isEssay = trackedType
          ? trackedType === 'essay'
          : !/^[0-9a-f-]{36}$/i.test(value);
        if (saveTimers.current[quizId]) {
          window.clearTimeout(saveTimers.current[quizId]);
          delete saveTimers.current[quizId];
        }
        await submitAnswer.mutateAsync({
          attemptId: attempt.attempt_id,
          quizId,
          selectedOptionId: isEssay ? undefined : value,
          freeTextAnswer: isEssay ? value : undefined,
        });
        lastSavedRef.current[quizId] = value;
      }

      // Submit the exam
      const examResult = await submitExam.mutateAsync(attempt.attempt_id);

      const needsGrading = examResult.grading_mode === 'hybrid' || examResult.grading_mode === 'manual';

      setResult({
        score: examResult.score_pct || 0,
        passed: examResult.result === 'passed',
        needsManualGrading: needsGrading,
      });

      toast.success(needsGrading
        ? 'Exame enviado! Questões dissertativas aguardam correção manual.'
        : 'Exame enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar exame');
      setSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = useMemo(() => {
    if (!exam?.question_ids?.length) return 0;
    return (Object.keys(answers).length / exam.question_ids.length) * 100;
  }, [answers, exam]);

  if (examLoading) {
    return (
      <AppLayout title="Carregando..." subtitle="Buscando informações do exame">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!exam) {
    return (
      <AppLayout title="Exame não encontrado" subtitle="O exame solicitado não existe">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Este exame não foi encontrado ou expirou.</p>
          <Button onClick={() => navigate('/edu')}>Voltar ao Catálogo</Button>
        </div>
      </AppLayout>
    );
  }

  // Exam completed - show results
  if (result || exam.status === 'submitted') {
    // When the user navigates back to the route after submitting, `result` is null
    // but the attempt row has the final score / grading_mode we need to show the
    // correct summary (including "Aguardando Correção" for hybrid attempts).
    const finalScore = result?.score ?? attempt?.score_pct ?? 0;
    const resultPending = attempt?.result === 'pending' || attempt?.result == null;
    const passedFromAttempt = attempt?.result === 'passed';
    const passed = result?.passed ?? passedFromAttempt;
    const needsGrading = result?.needsManualGrading
      ?? (attempt?.grading_mode === 'hybrid' || attempt?.grading_mode === 'manual') && resultPending;

    return (
      <AppLayout title="Resultado do Exame" subtitle="Veja seu desempenho">
        <div className="max-w-2xl mx-auto">
          <Card className={needsGrading ? 'border-amber-500/50' : passed ? 'border-severity-good/50' : 'border-severity-critical/50'}>
            <CardHeader className="text-center">
              {needsGrading ? (
                <Clock className="h-20 w-20 mx-auto mb-4 text-amber-500" />
              ) : passed ? (
                <Award className="h-20 w-20 mx-auto mb-4 text-severity-good" />
              ) : (
                <XCircle className="h-20 w-20 mx-auto mb-4 text-severity-critical" />
              )}
              <CardTitle className="text-3xl">
                {needsGrading ? 'Aguardando Correção' : passed ? 'Parabéns!' : 'Não foi desta vez'}
              </CardTitle>
              <CardDescription>
                {needsGrading 
                  ? 'Questões dissertativas aguardam correção manual do professor' 
                  : passed 
                    ? 'Você foi aprovado no exame!' 
                    : 'Você não atingiu a pontuação mínima'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {needsGrading ? (
                <div className="text-lg text-muted-foreground">
                  <p>Pontuação parcial (questões objetivas):</p>
                  <div className="text-4xl font-bold mt-2">{finalScore.toFixed(0)}%</div>
                  <p className="text-sm mt-3 text-amber-600 dark:text-amber-400">
                    A nota final será calculada após a correção das questões dissertativas.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-6xl font-bold">
                    {finalScore.toFixed(0)}%
                  </div>
                  <Progress
                    value={finalScore}
                    className={`h-4 ${passed ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                  />
                  <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                    <span>Pontuação: {finalScore.toFixed(0)}%</span>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/edu')}>
                Voltar ao Catálogo
              </Button>
              {passed && !needsGrading && (
                <Button onClick={() => navigate('/certificados')}>
                  <Award className="mr-2 h-4 w-4" />
                  Ver Certificados
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Exam not started yet
  if (exam.status === 'generated') {
    return (
      <AppLayout title="Iniciar Exame" subtitle="Leia as instruções antes de começar">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Instruções do Exame
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <span>Você terá tempo limitado para completar o exame</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-severity-moderate" />
                <span>Uma vez iniciado, o exame não pode ser pausado</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-5 w-5 text-severity-good" />
                <span>Responda todas as questões antes de enviar</span>
              </div>
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">
                  Número de questões: <strong>{exam.question_ids?.length || 0}</strong>
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Aviso de Privacidade:</strong> Para fins de integridade acadêmica, 
                    registramos informações básicas do dispositivo durante o exame. Esses dados 
                    são automaticamente removidos após 90 dias conforme nossa política de retenção.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleStartExam} disabled={startExam.isPending}>
                Iniciar Exame
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Exam in progress
  const totalQuestions = exam.question_ids?.length || 0;

  return (
    <AppLayout 
      title={`Questão ${currentQuestionIndex + 1} de ${totalQuestions}`}
      subtitle="Selecione a resposta correta"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Timer and Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${timeRemaining && timeRemaining < 60 ? 'text-severity-critical animate-pulse' : 'text-muted-foreground'}`} />
            <span className={`font-mono text-lg ${timeRemaining && timeRemaining < 60 ? 'text-severity-critical font-bold' : ''}`}>
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {Object.keys(answers).length} de {totalQuestions} respondidas
            </span>
            <Progress value={progress} className="w-32 h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Questão {currentQuestionIndex + 1}</Badge>
              {isEssayQuestion && (
                <Badge variant="secondary">Dissertativa</Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion?.stem || `Questão #${currentQuestionId?.slice(0, 8)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEssayQuestion ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Digite sua resposta dissertativa..."
                  value={answers[currentQuestionId || ''] || ''}
                  onChange={(e) => currentQuestionId && handleAnswerChange(currentQuestionId, e.target.value)}
                  rows={8}
                  className="resize-y min-h-[160px]"
                />
                {(() => {
                  const text = answers[currentQuestionId || ''] || '';
                  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                  const charCount = text.length;
                  const isMinMet = wordCount >= 50;
                  return (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={isMinMet ? 'text-severity-good' : 'text-severity-moderate'}>
                        {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
                        {!isMinMet && ' (mínimo: 50)'}
                        {isMinMet && ' ✓'}
                      </span>
                      <span>{charCount} caracteres</span>
                    </div>
                  );
                })()}
              </div>
            ) : currentOptions && currentOptions.length > 0 ? (
              <RadioGroup
                value={answers[currentQuestionId || ''] || ''}
                onValueChange={(value) => currentQuestionId && handleAnswerChange(currentQuestionId, value)}
                className="space-y-3"
              >
                {currentOptions.map((option, idx) => (
                  <div
                    key={option.option_id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                      answers[currentQuestionId || ''] === option.option_id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={option.option_id} id={option.option_id} />
                    <Label htmlFor={option.option_id} className="flex-1 cursor-pointer">
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)})</span>
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Digite sua resposta..."
                value={answers[currentQuestionId || ''] || ''}
                onChange={(e) => currentQuestionId && handleAnswerChange(currentQuestionId, e.target.value)}
                rows={4}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <div className="flex gap-2">
              {currentQuestionIndex < totalQuestions - 1 ? (
                <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                  Próxima
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowSubmitDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Exame
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* Question Navigator */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {exam.question_ids?.map((qId, idx) => (
                <Button
                  key={qId}
                  variant={currentQuestionIndex === idx ? 'default' : answers[qId] ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Exame?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {Object.keys(answers).length} de {totalQuestions} questões.
              {Object.keys(answers).length < totalQuestions && (
                <span className="block mt-2 text-yellow-600">
                  Atenção: Algumas questões não foram respondidas!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Respondendo</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitted}>
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ExamTaking;

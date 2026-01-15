import { useState, useEffect, useMemo } from 'react';
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

const ExamTaking = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: attempt } = useExamAttempt(examId);
  const { startExam } = useExamMutations();
  const { submitAnswer, submitExam } = useExamAnswerMutations();

  // Get options for current question
  const currentQuestionId = exam?.question_ids?.[currentQuestionIndex];
  const { data: currentQuestion } = useQuizQuestion(currentQuestionId);
  const currentOptions = currentQuestion?.options || [];

  // Timer effect
  useEffect(() => {
    if (!exam || exam.status !== 'started') return;
    
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
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [exam]);

  const handleAutoSubmit = async () => {
    if (!examId || submitted) return;
    try {
      await handleSubmit();
      toast.warning('Tempo esgotado! Exame enviado automaticamente.');
    } catch (error) {
      console.error('Auto-submit error:', error);
    }
  };

  const handleStartExam = async () => {
    if (!examId) return;
    try {
      await startExam.mutateAsync(examId);
      toast.success('Exame iniciado!');
    } catch (error) {
      toast.error('Erro ao iniciar exame');
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!examId || !attempt) return;
    setSubmitted(true);
    
    try {
      // Submit all answers
      for (const [quizId, optionId] of Object.entries(answers)) {
        await submitAnswer.mutateAsync({
          attemptId: attempt.attempt_id,
          quizId,
          selectedOptionId: optionId,
        });
      }

      // Submit the exam
      const examResult = await submitExam.mutateAsync(attempt.attempt_id);
      
      setResult({
        score: examResult.score_pct || 0,
        passed: examResult.result === 'passed',
      });
      
      toast.success('Exame enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar exame');
      setSubmitted(false);
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
    const finalScore = result?.score || 0;
    const passed = result?.passed || false;

    return (
      <AppLayout title="Resultado do Exame" subtitle="Veja seu desempenho">
        <div className="max-w-2xl mx-auto">
          <Card className={passed ? 'border-green-500/50' : 'border-red-500/50'}>
            <CardHeader className="text-center">
              {passed ? (
                <Award className="h-20 w-20 mx-auto mb-4 text-green-500" />
              ) : (
                <XCircle className="h-20 w-20 mx-auto mb-4 text-red-500" />
              )}
              <CardTitle className="text-3xl">
                {passed ? 'Parabéns!' : 'Não foi desta vez'}
              </CardTitle>
              <CardDescription>
                {passed 
                  ? 'Você foi aprovado no exame!' 
                  : 'Você não atingiu a pontuação mínima'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-6xl font-bold">
                {finalScore.toFixed(0)}%
              </div>
              <Progress 
                value={finalScore} 
                className={`h-4 ${passed ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
              />
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <span>Acertos: {Object.keys(answers).length} / {exam.question_ids?.length || 0}</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/edu')}>
                Voltar ao Catálogo
              </Button>
              {passed && (
                <Button onClick={() => navigate('/edu/certificados')}>
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
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>Uma vez iniciado, o exame não pode ser pausado</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Responda todas as questões antes de enviar</span>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Número de questões: <strong>{exam.question_ids?.length || 0}</strong>
                </p>
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
            <Clock className={`h-5 w-5 ${timeRemaining && timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
            <span className={`font-mono text-lg ${timeRemaining && timeRemaining < 60 ? 'text-red-500 font-bold' : ''}`}>
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
            </div>
            <CardTitle className="text-lg leading-relaxed">
              {/* Question stem would come from joined data - for now show ID */}
              Questão #{currentQuestionId?.slice(0, 8)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentOptions && currentOptions.length > 0 ? (
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

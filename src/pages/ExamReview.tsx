import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useExamReview } from '@/hooks/useExamHistory';

const ExamReview = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { data: review, isLoading } = useExamReview(attemptId);

  if (isLoading) {
    return (
      <AppLayout title="Carregando..." subtitle="Buscando revisão do exame">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!review) {
    return (
      <AppLayout title="Revisão não encontrada" subtitle="">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Tentativa não encontrada.</p>
          <Button onClick={() => navigate('/edu/historico')}>Voltar ao Histórico</Button>
        </div>
      </AppLayout>
    );
  }

  const isPassed = review.result === 'passed';
  const isPending = review.result === 'pending';

  return (
    <AppLayout title="Revisão do Exame" subtitle={review.course_title || 'Prova'}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Summary Card */}
        <Card className={isPending ? 'border-amber-500/50' : isPassed ? 'border-green-500/50' : 'border-red-500/50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isPending ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : isPassed ? (
                    <Award className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {isPending ? 'Aguardando Correção' : isPassed ? 'Aprovado' : 'Reprovado'}
                </CardTitle>
                <CardDescription>
                  {review.submitted_at && `Realizada em ${new Date(review.submitted_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}`}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{(review.score_pct || 0).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {review.grading_mode === 'hybrid' && isPending ? 'Nota parcial' : 'Nota final'}
                </p>
              </div>
            </div>
            <Progress 
              value={review.score_pct || 0} 
              className="mt-4 h-3"
              indicatorClassName={isPassed ? 'bg-green-500' : isPending ? 'bg-amber-500' : 'bg-red-500'}
            />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Questões</p>
                <p className="font-medium">{review.answers?.length || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Acertos</p>
                <p className="font-medium text-green-600">
                  {review.answers?.filter(a => a.is_correct === true).length || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Erros</p>
                <p className="font-medium text-red-600">
                  {review.answers?.filter(a => a.is_correct === false).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Review */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Revisão das Questões
          </h2>

          {review.answers?.map((answer, idx) => {
            const isEssay = answer.question_type === 'essay';
            const isCorrect = answer.is_correct === true;
            const isWrong = answer.is_correct === false;
            const isPendingGrade = answer.is_correct === null && isEssay;

            return (
              <Card key={`${answer.quiz_id}-${idx}`} className={
                isPendingGrade ? 'border-amber-200 dark:border-amber-800' :
                isCorrect ? 'border-green-200 dark:border-green-800' : 
                isWrong ? 'border-red-200 dark:border-red-800' : ''
              }>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Questão {idx + 1}</Badge>
                      {isEssay && <Badge variant="secondary">Dissertativa</Badge>}
                      {isPendingGrade ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
                          <Clock className="w-3 h-3 mr-1" />Aguardando
                        </Badge>
                      ) : isCorrect ? (
                        <Badge className="bg-green-500/10 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />Correta
                        </Badge>
                      ) : isWrong ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />Incorreta
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {(answer.awarded_points || 0).toFixed(1)} pts
                    </span>
                  </div>
                  <CardTitle className="text-base leading-relaxed mt-2">
                    {answer.stem || 'Questão'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEssay ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sua resposta:</p>
                        <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
                          {answer.free_text_answer || <span className="italic text-muted-foreground">Sem resposta</span>}
                        </div>
                      </div>
                      {answer.grader_comment && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Comentário do professor:
                          </p>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                            {answer.grader_comment}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {answer.options?.map((opt) => {
                        const isSelected = answer.selected_option_id === opt.option_id;
                        const isCorrectOpt = opt.is_correct;
                        
                        return (
                          <div
                            key={opt.option_id}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                              isCorrectOpt 
                                ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800' 
                                : isSelected && !isCorrectOpt 
                                  ? 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800' 
                                  : 'border-border'
                            }`}
                          >
                            <span className="font-medium w-6">{opt.option_label})</span>
                            <span className="flex-1">{opt.option_text}</span>
                            {isCorrectOpt && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                            {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                            {isSelected && <Badge variant="outline" className="text-xs shrink-0">Sua resposta</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {answer.explanation && (
                    <>
                      <Separator />
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Explicação:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{answer.explanation}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => navigate('/edu/historico')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao Histórico
          </Button>
          {isPassed && (
            <Button onClick={() => navigate('/certificados')}>
              <Award className="mr-2 h-4 w-4" />
              Ver Certificados
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ExamReview;

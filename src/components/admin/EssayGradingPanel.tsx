import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileNamesByIds } from '@/services/profiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { CheckCircle, Clock, FileText, Save, User } from 'lucide-react';

interface EssayAnswer {
  attempt_id: string;
  quiz_id: string;
  free_text_answer: string | null;
  awarded_points: number | null;
  is_correct: boolean | null;
  answered_at: string | null;
}

interface PendingAttempt {
  attempt_id: string;
  exam_id: string;
  user_id: string;
  score_pct: number | null;
  submitted_at: string | null;
  grading_mode: string;
  result: string | null;
  user_name: string;
  user_email: string;
  course_title: string;
  essay_answers: (EssayAnswer & { stem: string; max_points: number; rubric?: unknown })[];
}

type AttemptRow = {
  attempt_id: string;
  exam_id: string | null;
  user_id: string | null;
  score_pct: number | null;
  submitted_at: string | null;
  grading_mode: string | null;
  result: string | null;
  exams: { question_ids: string[] | null; lms_courses: { title: string | null } | null } | null;
};

function usePendingEssayAttempts() {
  return useQuery({
    queryKey: ['pending-essay-attempts'],
    queryFn: async () => {
      const { data: attempts, error: attError } = await supabase
        .from('exam_attempts')
        .select(`
          attempt_id,
          exam_id,
          user_id,
          score_pct,
          submitted_at,
          grading_mode,
          result,
          exams(question_ids, lms_courses(title))
        `)
        .in('grading_mode', ['hybrid', 'manual'])
        .eq('result', 'pending')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true });

      if (attError) throw attError;
      const rows = (attempts || []) as unknown as AttemptRow[];
      if (rows.length === 0) return [];

      const attemptIds = rows.map(a => a.attempt_id);
      const userIds = rows.map(a => a.user_id).filter(Boolean) as string[];

      const [profileMap, { data: answers }, { data: questions }] = await Promise.all([
        fetchProfileNamesByIds(userIds),
        supabase
          .from('exam_answers')
          .select('attempt_id, quiz_id, free_text_answer, awarded_points, is_correct, answered_at')
          .in('attempt_id', attemptIds)
          .not('free_text_answer', 'is', null),
        (async () => {
          const allQuizIds = Array.from(
            new Set(rows.flatMap(r => r.exams?.question_ids || []).filter(Boolean))
          );
          if (allQuizIds.length === 0) return { data: [] as { quiz_id: string; stem: string; question_type: string }[] };
          return supabase
            .from('quiz_questions')
            .select('quiz_id, stem, question_type, rubric')
            .in('quiz_id', allQuizIds);
        })(),
      ]);

      const questionMap = new Map((questions || []).map(q => [q.quiz_id, q]));
      const answersByAttempt = new Map<string, typeof answers>();
      for (const a of answers || []) {
        const bucket = answersByAttempt.get(a.attempt_id) || [];
        bucket.push(a);
        answersByAttempt.set(a.attempt_id, bucket);
      }

      const results: PendingAttempt[] = [];
      for (const attempt of rows) {
        const attemptAnswers = answersByAttempt.get(attempt.attempt_id) || [];
        const totalQuestions = attempt.exams?.question_ids?.length || 1;
        const pointsPerQuestion = 100 / totalQuestions;

        const essayAnswers = attemptAnswers
          .filter(a => {
            const q = questionMap.get(a.quiz_id);
            return q && (q.question_type as string) === 'essay';
          })
          .map(a => ({
            ...a,
            stem: questionMap.get(a.quiz_id)?.stem || 'Questão',
            max_points: pointsPerQuestion,
            rubric: (questionMap.get(a.quiz_id) as any)?.rubric ?? null,
          }));

        if (essayAnswers.length === 0) continue;

        results.push({
          attempt_id: attempt.attempt_id,
          exam_id: attempt.exam_id || '',
          user_id: attempt.user_id || '',
          score_pct: attempt.score_pct,
          submitted_at: attempt.submitted_at,
          grading_mode: attempt.grading_mode || 'hybrid',
          result: attempt.result,
          user_name: profileMap.get(attempt.user_id || '') || 'Aluno',
          user_email: '',
          course_title: attempt.exams?.lms_courses?.title || 'Exame',
          essay_answers: essayAnswers,
        });
      }

      return results;
    },
  });
}

export function EssayGradingPanel() {
  const { data: pendingAttempts, isLoading } = usePendingEssayAttempts();
  const queryClient = useQueryClient();
  const [grades, setGrades] = useState<Record<string, { points: number; comment: string }>>({});

  const gradeKey = (attemptId: string, quizId: string) => `${attemptId}:${quizId}`;

  const setGrade = (attemptId: string, quizId: string, field: 'points' | 'comment', value: number | string) => {
    const key = gradeKey(attemptId, quizId);
    setGrades(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const saveGrading = useMutation({
    mutationFn: async (attempt: PendingAttempt) => {
      const gradesPayload = attempt.essay_answers
        .map(answer => {
          const key = gradeKey(attempt.attempt_id, answer.quiz_id);
          const grade = grades[key];
          if (!grade) return null;
          return {
            quiz_id: answer.quiz_id,
            points: Math.min(Math.max(0, grade.points), answer.max_points),
            comment: grade.comment || '',
          };
        })
        .filter(Boolean);

      const { data, error } = await (supabase.rpc as any)('finalize_essay_grading', {
        _attempt_id: attempt.attempt_id,
        _grades: gradesPayload,
      });

      if (error) throw error;
      return data as { total_score: number; result: string; certificate_id: string | null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-essay-attempts'] });
      toast.success(`Correção salva! Nota final: ${data.total_score.toFixed(0)}% — ${data.result === 'passed' ? 'Aprovado' : 'Reprovado'}`);

    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar correção');
    },
  });

  const allEssaysGraded = (attempt: PendingAttempt) => {
    return attempt.essay_answers.every(a => {
      const key = gradeKey(attempt.attempt_id, a.quiz_id);
      return grades[key]?.points !== undefined;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!pendingAttempts?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-severity-good" />
          <h3 className="text-lg font-semibold">Nenhuma correção pendente</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as questões dissertativas foram corrigidas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Correção de Questões Dissertativas
          </h2>
          <p className="text-sm text-muted-foreground">
            {pendingAttempts.length} {pendingAttempts.length === 1 ? 'exame aguardando' : 'exames aguardando'} correção
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {pendingAttempts.map((attempt) => (
          <AccordionItem key={attempt.attempt_id} value={attempt.attempt_id} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-4 text-left flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{attempt.user_name}</span>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {attempt.submitted_at
                        ? new Date(attempt.submitted_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{attempt.course_title}</p>
                </div>
                <Badge variant="secondary">
                  {attempt.essay_answers.length} {attempt.essay_answers.length === 1 ? 'dissertativa' : 'dissertativas'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-6">
                {attempt.essay_answers.map((answer, idx) => {
                  const key = gradeKey(attempt.attempt_id, answer.quiz_id);
                  const grade = grades[key] || { points: 0, comment: '' };
                  return (
                    <Card key={answer.quiz_id} className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                          Questão {idx + 1}
                        </CardTitle>
                        <CardDescription>{answer.stem}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Rubric (always visible to grader, ignoring visible_to_student) */}
                        <RubricDisplay rubric={answer.rubric} hideIfNotVisible={false} title="Rubrica de avaliação" />

                        {/* Student's answer */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Resposta do aluno:</Label>
                          <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                            {answer.free_text_answer || <span className="italic text-muted-foreground">Sem resposta</span>}
                          </div>
                          {answer.free_text_answer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {answer.free_text_answer.trim().split(/\s+/).length} palavras
                            </p>
                          )}
                        </div>

                        {/* Grading inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor={`pts-${key}`} className="text-xs">
                              Pontos (0–{answer.max_points.toFixed(1)})
                            </Label>
                            <Input
                              id={`pts-${key}`}
                              type="number"
                              min={0}
                              max={answer.max_points}
                              step={0.5}
                              value={grade.points}
                              onChange={(e) => setGrade(attempt.attempt_id, answer.quiz_id, 'points', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`cmt-${key}`} className="text-xs">Comentário (opcional)</Label>
                            <Textarea
                              id={`cmt-${key}`}
                              rows={2}
                              placeholder="Feedback para o aluno..."
                              value={grade.comment}
                              onChange={(e) => setGrade(attempt.attempt_id, answer.quiz_id, 'comment', e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Current auto-graded score */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pontuação parcial (objetivas): <strong>{(attempt.score_pct || 0).toFixed(0)}%</strong>
                  </p>
                  <Button
                    onClick={() => saveGrading.mutate(attempt)}
                    disabled={!allEssaysGraded(attempt) || saveGrading.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Correção
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

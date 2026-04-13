import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  essay_answers: (EssayAnswer & { stem: string; max_points: number })[];
}

function usePendingEssayAttempts() {
  return useQuery({
    queryKey: ['pending-essay-attempts'],
    queryFn: async () => {
      // Get attempts with hybrid/manual grading and pending result
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
      if (!attempts?.length) return [];

      // For each attempt, get essay answers with question stems
      const results: PendingAttempt[] = [];

      for (const attempt of attempts) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', attempt.user_id)
          .single();

        // Get essay answers
        const { data: answers } = await supabase
          .from('exam_answers')
          .select('attempt_id, quiz_id, free_text_answer, awarded_points, is_correct, answered_at')
          .eq('attempt_id', attempt.attempt_id)
          .not('free_text_answer', 'is', null);

        if (!answers?.length) continue;

        // Get question stems
        const quizIds = answers.map(a => a.quiz_id);
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('quiz_id, stem, question_type')
          .in('quiz_id', quizIds);

        const questionMap = new Map(questions?.map(q => [q.quiz_id, q]) || []);
        const totalQuestions = (attempt as any).exams?.question_ids?.length || 1;
        const pointsPerQuestion = 100 / totalQuestions;

        const essayAnswers = answers
          .filter(a => {
            const q = questionMap.get(a.quiz_id);
            return q && (q.question_type as string) === 'essay';
          })
          .map(a => ({
            ...a,
            stem: questionMap.get(a.quiz_id)?.stem || 'Questão',
            max_points: pointsPerQuestion,
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
          user_name: profile?.full_name || 'Aluno',
          user_email: '',
          course_title: (attempt as any).exams?.lms_courses?.title || 'Exame',
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
      // Update each essay answer with assigned points
      for (const answer of attempt.essay_answers) {
        const key = gradeKey(attempt.attempt_id, answer.quiz_id);
        const grade = grades[key];
        if (!grade) continue;

        const awardedPoints = Math.min(Math.max(0, grade.points), answer.max_points);
        
        await supabase
          .from('exam_answers')
          .update({
            awarded_points: awardedPoints,
            is_correct: awardedPoints > 0,
            grader_comment: grade.comment || null,
          })
          .eq('attempt_id', attempt.attempt_id)
          .eq('quiz_id', answer.quiz_id);
      }

      // Recalculate overall score
      const { data: allAnswers } = await supabase
        .from('exam_answers')
        .select('awarded_points')
        .eq('attempt_id', attempt.attempt_id);

      const totalScore = allAnswers?.reduce((sum, a) => sum + (a.awarded_points || 0), 0) || 0;

      // Get min score for pass/fail
      let minScorePct = 70;
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('exams(ruleset_id)')
        .eq('attempt_id', attempt.attempt_id)
        .single();
      
      if ((attemptData as any)?.exams?.ruleset_id) {
        const { data: ruleset } = await supabase
          .from('exam_rulesets')
          .select('min_score_pct')
          .eq('ruleset_id', (attemptData as any).exams.ruleset_id)
          .single();
        if (ruleset) minScorePct = ruleset.min_score_pct;
      }

      const result = totalScore >= minScorePct ? 'passed' : 'failed';

      await supabase
        .from('exam_attempts')
        .update({
          score_pct: totalScore,
          result,
        })
        .eq('attempt_id', attempt.attempt_id);

      return { totalScore, result };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-essay-attempts'] });
      toast.success(`Correção salva! Nota final: ${data.totalScore.toFixed(0)}% — ${data.result === 'passed' ? 'Aprovado' : 'Reprovado'}`);
    },
    onError: () => {
      toast.error('Erro ao salvar correção');
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

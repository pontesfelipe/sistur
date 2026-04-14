/**
 * SISTUR EDU - Exam History, Review & Appeals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileNamesByIds } from '@/services/profiles';
import { toast } from 'sonner';

// ============================================
// STUDENT EXAM HISTORY
// ============================================

export function useExamHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exam-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          attempt_id,
          exam_id,
          user_id,
          started_at,
          submitted_at,
          score_pct,
          result,
          grading_mode,
          created_at,
          exams(exam_id, course_id, status, lms_courses(title))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(a => ({
        ...a,
        course_title: (a as any).exams?.lms_courses?.title || 'Prova',
        exam_status: (a as any).exams?.status,
      }));
    },
    enabled: !!user?.id,
  });
}

// ============================================
// EXAM REVIEW (detailed view of attempt)
// ============================================

export function useExamReview(attemptId?: string) {
  return useQuery({
    queryKey: ['exam-review', attemptId],
    queryFn: async () => {
      if (!attemptId) return null;

      // Get attempt info
      const { data: attempt, error: attErr } = await supabase
        .from('exam_attempts')
        .select(`
          attempt_id,
          exam_id,
          user_id,
          started_at,
          submitted_at,
          score_pct,
          result,
          grading_mode,
          exams(exam_id, course_id, question_ids, lms_courses(title))
        `)
        .eq('attempt_id', attemptId)
        .single();

      if (attErr) throw attErr;

      // Get answers
      const { data: answers, error: ansErr } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (ansErr) throw ansErr;

      // Get question details for all answered questions
      const quizIds = answers?.map(a => a.quiz_id) || [];
      let questions: any[] = [];
      let allOptions: any[] = [];

      if (quizIds.length > 0) {
        const { data: qs } = await supabase
          .from('quiz_questions')
          .select('quiz_id, stem, question_type, explanation')
          .in('quiz_id', quizIds);
        questions = qs || [];

        const { data: opts } = await supabase
          .from('quiz_options')
          .select('option_id, quiz_id, option_label, option_text, is_correct')
          .in('quiz_id', quizIds)
          .order('option_label', { ascending: true });
        allOptions = opts || [];
      }

      const questionMap = new Map(questions.map(q => [q.quiz_id, q]));
      const optionsMap = new Map<string, any[]>();
      allOptions.forEach(o => {
        const arr = optionsMap.get(o.quiz_id) || [];
        arr.push(o);
        optionsMap.set(o.quiz_id, arr);
      });

      // Enrich answers with question data
      const enrichedAnswers = (answers || []).map(a => {
        const q = questionMap.get(a.quiz_id);
        return {
          ...a,
          stem: q?.stem || 'Questão',
          question_type: q?.question_type || 'multiple_choice',
          explanation: q?.explanation || null,
          options: optionsMap.get(a.quiz_id) || [],
        };
      });

      return {
        ...attempt,
        course_title: (attempt as any).exams?.lms_courses?.title || 'Prova',
        answers: enrichedAnswers,
      };
    },
    enabled: !!attemptId,
  });
}

// ============================================
// EXAM APPEALS
// ============================================

export function useExamAppeals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exam-appeals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('exam_appeals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useExamAppealMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createAppeal = useMutation({
    mutationFn: async ({ attemptId, reason }: { attemptId: string; reason: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if appeal already exists for this attempt
      const { data: existing } = await supabase
        .from('exam_appeals')
        .select('id')
        .eq('attempt_id', attemptId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('Recurso já enviado para esta prova');

      const { data, error } = await supabase
        .from('exam_appeals')
        .insert({
          attempt_id: attemptId,
          user_id: user.id,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-appeals'] });
      toast.success('Recurso enviado com sucesso');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { createAppeal };
}

// ============================================
// ADMIN: ALL ATTEMPTS + APPEAL MANAGEMENT
// ============================================

export function useAllExamAttempts() {
  return useQuery({
    queryKey: ['all-exam-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          attempt_id,
          exam_id,
          user_id,
          started_at,
          submitted_at,
          score_pct,
          result,
          grading_mode,
          created_at,
          exams(exam_id, course_id, lms_courses(title))
        `)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get user profiles
      const profileMap = await fetchProfileNamesByIds(
        (data || []).map(a => a.user_id).filter(Boolean) as string[]
      );

      return (data || []).map(a => ({
        ...a,
        user_name: profileMap.get(a.user_id || '') || 'Aluno',
        course_title: (a as any).exams?.lms_courses?.title || 'Prova',
      }));
    },
  });
}

export function useAllExamAppeals() {
  return useQuery({
    queryKey: ['all-exam-appeals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_appeals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with user names
      const profileMap = await fetchProfileNamesByIds(
        (data || []).map(a => a.user_id).filter(Boolean) as string[]
      );

      return (data || []).map(a => ({
        ...a,
        user_name: profileMap.get(a.user_id) || 'Aluno',
      }));
    },
  });
}

export function useResolveAppeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ appealId, status, adminResponse }: {
      appealId: string;
      status: 'accepted' | 'rejected';
      adminResponse: string;
    }) => {
      const { error } = await supabase
        .from('exam_appeals')
        .update({
          status,
          admin_response: adminResponse,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', appealId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['all-exam-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['exam-appeals'] });
      toast.success(status === 'accepted' ? 'Recurso aceito' : 'Recurso rejeitado');
    },
    onError: () => {
      toast.error('Erro ao resolver recurso');
    },
  });
}

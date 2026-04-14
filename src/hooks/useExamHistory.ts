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

      // Review reads go through a SECURITY DEFINER RPC. Client-side selects
      // on `quiz_options` no longer return `is_correct` (column-level
      // REVOKE), so this RPC is the canonical way to show a student which
      // option was right after the attempt is submitted. It also rejects
      // reads of in-progress attempts.
      const { data: reviewRows, error: reviewErr } = await (supabase.rpc as any)(
        'review_exam_answers',
        { _attempt_id: attemptId }
      );

      if (reviewErr) throw reviewErr;

      const enrichedAnswers = (reviewRows || []).map((row: any) => ({
        attempt_id: attemptId,
        quiz_id: row.quiz_id,
        selected_option_id: row.selected_option_id,
        free_text_answer: row.free_text_answer,
        is_correct: row.is_correct,
        awarded_points: row.awarded_points,
        answered_at: row.answered_at,
        stem: row.stem || 'Questão',
        question_type: row.question_type || 'multiple_choice',
        explanation: row.explanation || null,
        options: row.options || [],
      }));

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

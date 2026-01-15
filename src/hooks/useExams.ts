/**
 * SISTUR EDU LMS - Dynamic Exam System
 * Handles exam generation, attempts, grading with anti-cheat
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface ExamRuleset {
  ruleset_id: string;
  course_id: string | null;
  min_score_pct: number;
  time_limit_minutes: number;
  question_count: number;
  pillar_mix: Record<string, number> | null;
  allow_retake: boolean;
  retake_wait_hours: number;
  max_attempts: number;
  min_days_between_same_quiz: number;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  exam_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  ruleset_id: string | null;
  composition_hash: string;
  question_ids: string[];
  status: 'generated' | 'started' | 'submitted' | 'expired' | 'voided';
  expires_at: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface ExamQuestion {
  exam_id: string;
  quiz_id: string;
  display_order: number;
  options_shuffle_seed: number | null;
}

export interface ExamAttempt {
  attempt_id: string;
  exam_id: string | null;
  user_id: string | null;
  started_at: string;
  submitted_at: string | null;
  score_pct: number | null;
  result: 'passed' | 'failed' | 'pending' | null;
  grading_mode: 'automatic' | 'hybrid' | 'manual';
  ip_address: string | null;
  user_agent: string | null;
  audit_trail_ref: string | null;
  created_at: string;
}

export interface ExamAnswer {
  attempt_id: string;
  quiz_id: string;
  selected_option_id: string | null;
  free_text_answer: string | null;
  is_correct: boolean | null;
  awarded_points: number;
  answered_at: string | null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Deterministic shuffle using seed (mulberry32 PRNG)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(array: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Generate SHA-256 hash for composition
async function generateCompositionHash(quizIds: string[]): Promise<string> {
  const sorted = [...quizIds].sort();
  const text = sorted.join('-');
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// EXAM RULESETS
// ============================================

export function useExamRulesets() {
  return useQuery({
    queryKey: ['exam-rulesets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_rulesets')
        .select('*, lms_courses(title)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (ExamRuleset & { lms_courses?: { title: string } })[];
    },
  });
}

export function useExamRuleset(courseId?: string) {
  return useQuery({
    queryKey: ['exam-ruleset', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('exam_rulesets')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ExamRuleset | null;
    },
    enabled: !!courseId,
  });
}

export function useExamRulesetMutations() {
  const queryClient = useQueryClient();

  const createRuleset = useMutation({
    mutationFn: async (ruleset: Omit<ExamRuleset, 'ruleset_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exam_rulesets')
        .insert(ruleset)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-rulesets'] });
      toast.success('Regras de prova criadas');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateRuleset = useMutation({
    mutationFn: async ({ rulesetId, ...updates }: Partial<ExamRuleset> & { rulesetId: string }) => {
      const { data, error } = await supabase
        .from('exam_rulesets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('ruleset_id', rulesetId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-rulesets'] });
      toast.success('Regras atualizadas');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { createRuleset, updateRuleset };
}

// ============================================
// EXAMS
// ============================================

export function useUserExams() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-exams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('exams')
        .select('*, lms_courses(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Exam & { lms_courses?: { title: string } })[];
    },
    enabled: !!user?.id,
  });
}

export function useExam(examId?: string) {
  return useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => {
      if (!examId) return null;
      
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*, lms_courses(title, primary_pillar)')
        .eq('exam_id', examId)
        .single();
      
      if (examError) throw examError;
      
      // Get exam questions with full quiz data
      const { data: examQuestions, error: qError } = await supabase
        .from('exam_questions')
        .select('*, quiz_questions(*, quiz_options(*))')
        .eq('exam_id', examId)
        .order('display_order', { ascending: true });
      
      if (qError) throw qError;
      
      return {
        ...exam,
        questions: examQuestions || [],
      };
    },
    enabled: !!examId,
  });
}

export function useExamMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const generateExam = useMutation({
    mutationFn: async ({ courseId, courseVersion }: { courseId: string; courseVersion: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get course info
      const { data: course } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      if (!course) throw new Error('Course not found');
      
      // Get ruleset
      const { data: ruleset } = await supabase
        .from('exam_rulesets')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();
      
      const questionCount = ruleset?.question_count || 10;
      const timeLimitMinutes = ruleset?.time_limit_minutes || 60;
      const minDaysBetweenSameQuiz = ruleset?.min_days_between_same_quiz || 30;
      
      // Get user's quiz usage history
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - minDaysBetweenSameQuiz);
      
      const { data: usedQuizzes } = await supabase
        .from('quiz_usage_history')
        .select('quiz_id')
        .eq('user_id', user.id)
        .gte('last_used_at', cutoffDate.toISOString());
      
      const excludeQuizIds = usedQuizzes?.map(q => q.quiz_id) || [];
      
      // Get available quiz questions
      let quizQuery = supabase
        .from('quiz_questions')
        .select('quiz_id, difficulty')
        .eq('pillar', course.primary_pillar)
        .lte('level', course.level)
        .eq('is_active', true);
      
      if (excludeQuizIds.length > 0) {
        quizQuery = quizQuery.not('quiz_id', 'in', `(${excludeQuizIds.join(',')})`);
      }
      
      const { data: quizPool, error: poolError } = await quizQuery;
      if (poolError) throw poolError;
      
      if (!quizPool || quizPool.length < questionCount) {
        throw new Error(`Insufficient questions available (need ${questionCount}, have ${quizPool?.length || 0})`);
      }
      
      // Stratified sampling by difficulty (1-5 scale)
      const easy = quizPool.filter(q => q.difficulty <= 2);
      const medium = quizPool.filter(q => q.difficulty === 3);
      const hard = quizPool.filter(q => q.difficulty >= 4);
      
      const easyCount = Math.floor(questionCount * 0.3);
      const hardCount = Math.floor(questionCount * 0.2);
      const mediumCount = questionCount - easyCount - hardCount;
      
      const selectedQuizzes: typeof quizPool = [];
      
      // Select from each difficulty
      const selectRandom = (arr: typeof quizPool, count: number) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      };
      
      selectedQuizzes.push(...selectRandom(easy, Math.min(easyCount, easy.length)));
      selectedQuizzes.push(...selectRandom(medium, Math.min(mediumCount, medium.length)));
      selectedQuizzes.push(...selectRandom(hard, Math.min(hardCount, hard.length)));
      
      // Fill remaining from any
      while (selectedQuizzes.length < questionCount) {
        const remaining = quizPool.filter(q => !selectedQuizzes.includes(q));
        if (remaining.length === 0) break;
        selectedQuizzes.push(remaining[Math.floor(Math.random() * remaining.length)]);
      }
      
      // Shuffle selected questions
      const shuffled = selectedQuizzes.sort(() => Math.random() - 0.5);
      const quizIds = shuffled.map(q => q.quiz_id);
      
      // Generate composition hash
      const compositionHash = await generateCompositionHash(quizIds);
      
      // Check for duplicate composition
      const { data: existing } = await supabase
        .from('exams')
        .select('exam_id')
        .eq('composition_hash', compositionHash)
        .maybeSingle();
      
      if (existing) {
        // Rare case: same composition exists, regenerate
        throw new Error('Composition collision detected, please try again');
      }
      
      // Create exam
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timeLimitMinutes + 1440); // +24h buffer
      
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          user_id: user.id,
          course_id: courseId,
          course_version: courseVersion,
          ruleset_id: ruleset?.ruleset_id || null,
          composition_hash: compositionHash,
          question_ids: quizIds,
          status: 'generated',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      
      if (examError) throw examError;
      
      // Create exam questions with shuffle seeds
      const examQuestions = quizIds.map((quizId, index) => ({
        exam_id: exam.exam_id,
        quiz_id: quizId,
        display_order: index + 1,
        options_shuffle_seed: Math.floor(Math.random() * 1000000),
      }));
      
      const { error: eqError } = await supabase
        .from('exam_questions')
        .insert(examQuestions);
      
      if (eqError) throw eqError;
      
      return exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-exams'] });
      toast.success('Prova gerada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao gerar prova: ${error.message}`);
    },
  });

  const startExam = useMutation({
    mutationFn: async (examId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Update exam status
      const { error: examError } = await supabase
        .from('exams')
        .update({ status: 'started', started_at: new Date().toISOString() })
        .eq('exam_id', examId)
        .eq('status', 'generated');
      
      if (examError) throw examError;
      
      // Create attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          user_id: user.id,
          grading_mode: 'automatic',
        })
        .select()
        .single();
      
      if (attemptError) throw attemptError;
      
      return attempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { generateExam, startExam };
}

// ============================================
// EXAM ATTEMPTS
// ============================================

export function useExamAttempt(attemptId?: string) {
  return useQuery({
    queryKey: ['exam-attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) return null;
      
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*, exams(*, lms_courses(title))')
        .eq('attempt_id', attemptId)
        .single();
      
      if (attemptError) throw attemptError;
      
      const { data: answers, error: answersError } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('attempt_id', attemptId);
      
      if (answersError) throw answersError;
      
      return {
        ...attempt,
        answers: answers || [],
      };
    },
    enabled: !!attemptId,
  });
}

export function useExamAnswerMutations() {
  const queryClient = useQueryClient();

  const submitAnswer = useMutation({
    mutationFn: async ({ 
      attemptId, 
      quizId, 
      selectedOptionId, 
      freeTextAnswer 
    }: { 
      attemptId: string; 
      quizId: string; 
      selectedOptionId?: string; 
      freeTextAnswer?: string;
    }) => {
      const { data, error } = await supabase
        .from('exam_answers')
        .upsert({
          attempt_id: attemptId,
          quiz_id: quizId,
          selected_option_id: selectedOptionId || null,
          free_text_answer: freeTextAnswer || null,
          answered_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { attemptId }) => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempt', attemptId] });
    },
  });

  const submitExam = useMutation({
    mutationFn: async (attemptId: string) => {
      // Get attempt and answers
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('*, exams(ruleset_id)')
        .eq('attempt_id', attemptId)
        .single();
      
      if (!attempt) throw new Error('Attempt not found');
      
      const { data: answers } = await supabase
        .from('exam_answers')
        .select('*, quiz_options!exam_answers_selected_option_id_fkey(is_correct)')
        .eq('attempt_id', attemptId);
      
      if (!answers || answers.length === 0) throw new Error('No answers found');
      
      // Grade answers
      let earnedPoints = 0;
      const pointsPerQuestion = 100 / answers.length;
      
      for (const answer of answers) {
        const isCorrect = answer.quiz_options?.is_correct || false;
        
        await supabase
          .from('exam_answers')
          .update({
            is_correct: isCorrect,
            awarded_points: isCorrect ? pointsPerQuestion : 0,
          })
          .eq('attempt_id', attemptId)
          .eq('quiz_id', answer.quiz_id);
        
        if (isCorrect) {
          earnedPoints += pointsPerQuestion;
        }
      }
      
      // Get ruleset for min score
      let minScorePct = 70; // default
      if (attempt.exams?.ruleset_id) {
        const { data: ruleset } = await supabase
          .from('exam_rulesets')
          .select('min_score_pct')
          .eq('ruleset_id', attempt.exams.ruleset_id)
          .single();
        
        if (ruleset) minScorePct = ruleset.min_score_pct;
      }
      
      const result = earnedPoints >= minScorePct ? 'passed' : 'failed';
      
      // Update attempt
      const { data: updatedAttempt, error } = await supabase
        .from('exam_attempts')
        .update({
          score_pct: earnedPoints,
          result,
          submitted_at: new Date().toISOString(),
        })
        .eq('attempt_id', attemptId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update exam status
      await supabase
        .from('exams')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('exam_id', attempt.exam_id);
      
      // Update quiz usage history
      for (const answer of answers) {
        await supabase
          .from('quiz_usage_history')
          .upsert({
            user_id: attempt.user_id,
            quiz_id: answer.quiz_id,
            last_used_at: new Date().toISOString(),
            times_used: 1,
          }, {
            onConflict: 'user_id,quiz_id',
          });
      }
      
      return updatedAttempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-attempt'] });
      queryClient.invalidateQueries({ queryKey: ['user-exams'] });
      toast.success('Prova enviada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao enviar prova: ${error.message}`);
    },
  });

  return { submitAnswer, submitExam };
}

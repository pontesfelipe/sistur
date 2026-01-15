/**
 * SISTUR EDU LMS - Quiz Management Hooks
 * Handles quiz questions, options, and usage history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface QuizQuestion {
  quiz_id: string;
  pillar: 'RA' | 'OE' | 'AO';
  level: number;
  question_type: 'multiple_choice' | 'true_false' | 'essay';
  stem: string;
  explanation: string | null;
  difficulty: number | null;
  is_active: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  options?: QuizOption[];
}

export interface QuizOption {
  option_id: string;
  quiz_id: string;
  option_label: 'A' | 'B' | 'C' | 'D' | 'E';
  option_text: string;
  is_correct: boolean;
  feedback_text: string | null;
  created_at: string;
}

export interface QuizContentSource {
  quiz_id: string;
  content_id: string;
  source_locator: string | null;
  created_at: string;
}

export interface QuizUsageHistory {
  user_id: string;
  quiz_id: string;
  last_used_at: string;
  times_used: number;
}

// ============================================
// QUIZ QUESTIONS
// ============================================

export function useQuizQuestions(pillar?: 'RA' | 'OE' | 'AO', level?: number, activeOnly = true) {
  return useQuery({
    queryKey: ['quiz-questions', pillar, level, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('quiz_questions')
        .select('*, quiz_options(*)')
        .order('created_at', { ascending: false });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      if (pillar) {
        query = query.eq('pillar', pillar);
      }
      if (level) {
        query = query.lte('level', level);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(q => ({
        ...q,
        options: q.quiz_options || [],
      })) as unknown as QuizQuestion[];
    },
  });
}

export function useQuizQuestion(quizId?: string) {
  return useQuery({
    queryKey: ['quiz-question', quizId],
    queryFn: async () => {
      if (!quizId) return null;
      
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .single();
      
      if (quizError) throw quizError;
      
      const { data: options, error: optionsError } = await supabase
        .from('quiz_options')
        .select('*')
        .eq('quiz_id', quizId)
        .order('option_label', { ascending: true });
      
      if (optionsError) throw optionsError;
      
      return { ...quiz, options: options || [] } as unknown as QuizQuestion;
    },
    enabled: !!quizId,
  });
}

export function useQuizStats() {
  return useQuery({
    queryKey: ['quiz-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('pillar, level, difficulty, is_active');
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        active: data.filter(q => q.is_active).length,
        byPillar: {
          RA: data.filter(q => q.pillar === 'RA').length,
          OE: data.filter(q => q.pillar === 'OE').length,
          AO: data.filter(q => q.pillar === 'AO').length,
        },
        byDifficulty: {
          easy: data.filter(q => q.difficulty <= 2).length,
          medium: data.filter(q => q.difficulty === 3).length,
          hard: data.filter(q => q.difficulty >= 4).length,
        },
        byLevel: {} as Record<number, number>,
      };
      
      data.forEach(q => {
        stats.byLevel[q.level] = (stats.byLevel[q.level] || 0) + 1;
      });
      
      return stats;
    },
  });
}

// ============================================
// QUIZ MUTATIONS
// ============================================

export function useQuizMutations() {
  const queryClient = useQueryClient();

  const createQuiz = useMutation({
    mutationFn: async ({ 
      question, 
      options 
    }: { 
      question: { pillar: string; level: number; question_type: 'multiple_choice' | 'short_answer' | 'true_false'; stem: string; explanation?: string; difficulty?: number; is_active?: boolean }; 
      options: { option_label: string; option_text: string; is_correct: boolean }[];
    }) => {
      // Create question
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_questions')
        .insert([question])
        .select()
        .single();
      
      if (quizError) throw quizError;
      
      // Create options
      if (options.length > 0) {
        const optionsWithQuizId = options.map(opt => ({
          ...opt,
          quiz_id: quiz.quiz_id,
        }));
        
        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(optionsWithQuizId);
        
        if (optionsError) throw optionsError;
      }
      
      return quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-stats'] });
      toast.success('Questão criada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar questão: ${error.message}`);
    },
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ 
      quizId, 
      question, 
      options 
    }: { 
      quizId: string;
      question: { pillar?: string; level?: number; stem?: string; explanation?: string; difficulty?: number; is_active?: boolean }; 
      options?: { option_label: string; option_text: string; is_correct: boolean }[];
    }) => {
      // Update question
      const { error: quizError } = await supabase
        .from('quiz_questions')
        .update({ ...question, updated_at: new Date().toISOString() })
        .eq('quiz_id', quizId);
      
      if (quizError) throw quizError;
      
      // Update options if provided
      if (options && options.length > 0) {
        // Delete existing options
        await supabase.from('quiz_options').delete().eq('quiz_id', quizId);
        
        // Insert new options
        const optionsWithQuizId = options.map(opt => ({
          ...opt,
          quiz_id: quizId,
        }));
        
        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(optionsWithQuizId);
        
        if (optionsError) throw optionsError;
      }
      
      return quizId;
    },
    onSuccess: (quizId) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-question', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-stats'] });
      toast.success('Questão atualizada');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-stats'] });
      toast.success('Questão excluída');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const toggleQuizActive = useMutation({
    mutationFn: async ({ quizId, isActive }: { quizId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('quiz_questions')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('quiz_id', quizId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-stats'] });
      toast.success(isActive ? 'Questão ativada' : 'Questão desativada');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { createQuiz, updateQuiz, deleteQuiz, toggleQuizActive };
}

// ============================================
// QUIZ CONTENT SOURCES
// ============================================

export function useQuizContentSources(quizId?: string) {
  return useQuery({
    queryKey: ['quiz-content-sources', quizId],
    queryFn: async () => {
      if (!quizId) return [];
      
      const { data, error } = await supabase
        .from('quiz_content_sources')
        .select('*, content_items(*)')
        .eq('quiz_id', quizId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });
}

export function useQuizContentSourceMutations() {
  const queryClient = useQueryClient();

  const addContentSource = useMutation({
    mutationFn: async (source: Omit<QuizContentSource, 'created_at'>) => {
      const { data, error } = await supabase
        .from('quiz_content_sources')
        .insert(source)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-content-sources', variables.quiz_id] });
      toast.success('Fonte adicionada');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const removeContentSource = useMutation({
    mutationFn: async ({ quizId, contentId }: { quizId: string; contentId: string }) => {
      const { error } = await supabase
        .from('quiz_content_sources')
        .delete()
        .eq('quiz_id', quizId)
        .eq('content_id', contentId);
      
      if (error) throw error;
    },
    onSuccess: (_, { quizId }) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-content-sources', quizId] });
      toast.success('Fonte removida');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { addContentSource, removeContentSource };
}

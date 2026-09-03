import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';


export interface FoundationCourse {
  training_id: string;
  title: string;
  description: string | null;
  slug: string | null;
}

/**
 * Curso base obrigatório do SISTUR EDU (curadoria acadêmica, item 7.6).
 * Deve ser concluído antes de iniciar qualquer trilha formativa.
 */
export function useFoundationCourse() {
  const { user } = useAuth();
  const { isAdmin, isProfessor } = useProfileContext();

  const courseQuery = useQuery({
    queryKey: ['foundation-course'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('training_id, title, description, slug')
        .eq('is_foundation', true)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return (data as FoundationCourse) || null;
    },
  });

  const trainingId = courseQuery.data?.training_id;

  const completionQuery = useQuery({
    queryKey: ['foundation-course-completion', user?.id, trainingId],
    enabled: !!user?.id && !!trainingId,
    queryFn: async () => {
      const [{ data: legacy }, { data: tracked }] = await Promise.all([
        supabase
          .from('edu_progress')
          .select('progress_percent')
          .eq('user_id', user!.id)
          .eq('training_id', trainingId!)
          .maybeSingle(),
        supabase
          .from('user_training_progress')
          .select('training_id')
          .eq('user_id', user!.id)
          .eq('training_id', trainingId!)
          .maybeSingle(),
      ]);
      return (legacy?.progress_percent ?? 0) >= 100 || !!tracked;
    },
  });

  const exempt = isAdmin || isProfessor;
  const completed = exempt || completionQuery.data === true;

  return {
    course: courseQuery.data ?? null,
    isLoading: courseQuery.isLoading || completionQuery.isLoading,
    completed,
    exempt,
    /** Trilhas ficam bloqueadas enquanto o curso base não for concluído */
    locked: !!courseQuery.data && !completed,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Pillar, TargetAgent, CourseLevel } from '@/types/sistur';

export interface CourseData {
  id: string;
  title: string;
  description?: string;
  url?: string;
  duration_minutes?: number;
  level: CourseLevel;
  pillar?: Pillar;
  theme?: string;
  target_agent?: TargetAgent;
  tags: { pillar: string; theme: string }[];
  org_id?: string;
  created_at: string;
}

export function useCourses() {
  const queryClient = useQueryClient();

  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('pillar', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data as CourseData[];
    },
  });

  const createCourse = useMutation({
    mutationFn: async (course: Omit<CourseData, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...course,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar curso: ${error.message}`);
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...course }: Partial<CourseData> & { id: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .update(course)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso atualizado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar curso: ${error.message}`);
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso excluído com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir curso: ${error.message}`);
    },
  });

  return {
    courses,
    isLoading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

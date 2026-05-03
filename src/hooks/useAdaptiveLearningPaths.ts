import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdaptivePath {
  id: string;
  title: string;
  description: string | null;
  pillar: 'RA' | 'OE' | 'AO' | null;
  level: string | null;
  target_audience: string[] | null;
  is_adaptive: boolean;
  published: boolean;
  cover_url: string | null;
  created_by: string;
  created_at: string;
}

export interface AdaptiveStep {
  id: string;
  path_id: string;
  training_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  prerequisite_step_id: string | null;
  min_score: number | null;
  required_status: 'atencao' | 'critico' | 'any';
  is_optional: boolean;
}

export interface AdaptiveEnrollment {
  id: string;
  path_id: string;
  user_id: string;
  current_step_id: string | null;
  status: 'em_andamento' | 'concluida' | 'pausada' | 'cancelada';
  triggered_by: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface AdaptiveProgress {
  id: string;
  enrollment_id: string;
  step_id: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'dispensada';
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
}

export function useAdaptivePaths() {
  return useQuery({
    queryKey: ['adaptive-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_learning_paths')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdaptivePath[];
    },
  });
}

export function useAdaptivePath(pathId?: string) {
  return useQuery({
    queryKey: ['adaptive-path', pathId],
    enabled: !!pathId,
    queryFn: async () => {
      const [pathRes, stepsRes] = await Promise.all([
        supabase.from('edu_learning_paths').select('*').eq('id', pathId!).maybeSingle(),
        supabase
          .from('edu_learning_path_steps')
          .select('*')
          .eq('path_id', pathId!)
          .order('order_index', { ascending: true }),
      ]);
      if (pathRes.error) throw pathRes.error;
      if (stepsRes.error) throw stepsRes.error;
      return {
        path: pathRes.data as AdaptivePath | null,
        steps: (stepsRes.data ?? []) as AdaptiveStep[],
      };
    },
  });
}

export function useMyEnrollment(pathId?: string) {
  return useQuery({
    queryKey: ['adaptive-enrollment', pathId],
    enabled: !!pathId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from('edu_learning_path_enrollments')
        .select('*')
        .eq('path_id', pathId!)
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AdaptiveEnrollment | null;
    },
  });
}

export function useEnrollmentProgress(enrollmentId?: string) {
  return useQuery({
    queryKey: ['adaptive-progress', enrollmentId],
    enabled: !!enrollmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_learning_path_progress')
        .select('*')
        .eq('enrollment_id', enrollmentId!);
      if (error) throw error;
      return (data ?? []) as AdaptiveProgress[];
    },
  });
}

export function useEnrollInPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pathId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('edu_learning_path_enrollments')
        .insert({ path_id: pathId, user_id: u.user.id, status: 'em_andamento' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, pathId) => {
      toast.success('Matriculado na trilha!');
      qc.invalidateQueries({ queryKey: ['adaptive-enrollment', pathId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao matricular'),
  });
}

export function useUpdateStepProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      enrollment_id: string;
      step_id: string;
      status: AdaptiveProgress['status'];
      score?: number;
    }) => {
      const patch: any = { status: input.status };
      if (input.status === 'em_andamento') patch.started_at = new Date().toISOString();
      if (input.status === 'concluida') {
        patch.completed_at = new Date().toISOString();
        if (input.score != null) patch.score = input.score;
      }
      const { error } = await supabase
        .from('edu_learning_path_progress')
        .upsert(
          { enrollment_id: input.enrollment_id, step_id: input.step_id, ...patch },
          { onConflict: 'enrollment_id,step_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['adaptive-progress', vars.enrollment_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao atualizar progresso'),
  });
}
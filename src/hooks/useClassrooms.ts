import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { fetchProfileNamesByIds } from '@/services/profiles';
import { toast } from 'sonner';

export interface Classroom {
  id: string;
  professor_id: string;
  name: string;
  description: string | null;
  discipline: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

export interface ClassroomStudent {
  id: string;
  classroom_id: string;
  student_id: string;
  enrolled_at: string;
  student_name?: string;
}

export interface ClassroomAssignment {
  id: string;
  classroom_id: string;
  professor_id: string;
  assignment_type: 'track' | 'training' | 'exam' | 'custom';
  title: string;
  description: string | null;
  track_id: string | null;
  training_id: string | null;
  exam_ruleset_id: string | null;
  due_date: string | null;
  available_from: string | null;
  target_user_ids: string[] | null;
  override_time_limit_minutes: number | null;
  override_max_attempts: number | null;
  override_min_score_pct: number | null;
  custom_content: any;
  status: string;
  created_at: string;
}

export function useClassrooms() {
  const { user } = useAuth();

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('professor_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get student counts
      const ids = data?.map(c => c.id) || [];
      if (ids.length === 0) return data as Classroom[];

      const { data: counts } = await supabase
        .from('classroom_students')
        .select('classroom_id')
        .in('classroom_id', ids);

      const countMap = new Map<string, number>();
      counts?.forEach(c => {
        countMap.set(c.classroom_id, (countMap.get(c.classroom_id) || 0) + 1);
      });

      return (data || []).map(c => ({
        ...c,
        student_count: countMap.get(c.id) || 0,
      })) as Classroom[];
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const createClassroom = useMutation({
    mutationFn: async (input: { name: string; description?: string; discipline?: string; period_start?: string; period_end?: string }) => {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({ professor_id: user!.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Sala criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar sala'),
  });

  const updateClassroom = useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; discipline?: string; period_start?: string; period_end?: string; status?: string }) => {
      const { error } = await supabase
        .from('classrooms')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Sala atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar sala'),
  });

  const deleteClassroom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Sala removida!');
    },
    onError: () => toast.error('Erro ao remover sala'),
  });

  return { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom };
}

export function useClassroomStudents(classroomId: string | null) {
  return useQuery({
    queryKey: ['classroom-students', classroomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_students')
        .select('*')
        .eq('classroom_id', classroomId!);
      if (error) throw error;

      if (!data?.length) return [];
      const profileMap = await fetchProfileNamesByIds(data.map(s => s.student_id));
      return data.map(s => ({
        ...s,
        student_name: profileMap.get(s.student_id) || 'Estudante',
      })) as ClassroomStudent[];
    },
    enabled: !!classroomId,
  });
}

export function useClassroomStudentActions(classroomId: string) {
  const queryClient = useQueryClient();

  const addStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('classroom_students')
        .insert({ classroom_id: classroomId, student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-students', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Aluno adicionado!');
    },
    onError: (e: any) => {
      if (e.message?.includes('duplicate')) {
        toast.info('Aluno já está nesta sala');
      } else {
        toast.error('Erro ao adicionar aluno');
      }
    },
  });

  const removeStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-students', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Aluno removido da sala');
    },
    onError: () => toast.error('Erro ao remover aluno'),
  });

  return { addStudent, removeStudent };
}

export function useClassroomAssignments(classroomId: string | null) {
  return useQuery({
    queryKey: ['classroom-assignments', classroomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_assignments')
        .select('*')
        .eq('classroom_id', classroomId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClassroomAssignment[];
    },
    enabled: !!classroomId,
  });
}

export function useClassroomAssignmentActions(classroomId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createAssignment = useMutation({
    mutationFn: async (input: {
      assignment_type: string;
      title: string;
      description?: string;
      track_id?: string;
      training_id?: string;
      exam_ruleset_id?: string;
      due_date?: string;
      available_from?: string;
      target_user_ids?: string[] | null;
      override_time_limit_minutes?: number | null;
      override_max_attempts?: number | null;
      override_min_score_pct?: number | null;
      custom_content?: any;
    }) => {
      const { data, error } = await supabase
        .from('classroom_assignments')
        .insert({
          classroom_id: classroomId,
          professor_id: user!.id,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomId] });
      toast.success('Atividade atribuída!');
    },
    onError: () => toast.error('Erro ao criar atividade'),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classroom_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomId] });
      toast.success('Atividade removida!');
    },
    onError: () => toast.error('Erro ao remover atividade'),
  });

  return { createAssignment, deleteAssignment };
}

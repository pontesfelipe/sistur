import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useProfessorReferralCode() {
  const { user } = useAuth();

  const { data: referralCode, isLoading } = useQuery({
    queryKey: ['professor-referral-code', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professor_referral_codes')
        .select('*')
        .eq('professor_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const generateCode = useMutation({
    mutationFn: async () => {
      const code = `PROF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from('professor_referral_codes')
        .insert({ professor_id: user!.id, code })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor-referral-code'] });
      toast.success('Código de referência gerado!');
    },
    onError: () => toast.error('Erro ao gerar código'),
  });

  return { referralCode, isLoading, generateCode };
}

export function useProfessorStudents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-students', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_referrals')
        .select(`
          id,
          student_id,
          status,
          created_at,
          referral_code_id
        `)
        .eq('professor_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get student profiles
      if (!data?.length) return [];
      const studentIds = data.map(r => r.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return data.map(r => ({
        ...r,
        student_name: profileMap.get(r.student_id)?.full_name || 'Estudante',
      }));
    },
    enabled: !!user,
  });
}

export function useReferralCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['professor-referral-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_professor_referral_count', {
        p_professor_id: user!.id,
      });
      if (error) throw error;
      return data as number;
    },
    enabled: !!user,
  });
}

export function useLinkStudentReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('link_student_referral', {
        p_referral_code: code,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (linked) => {
      if (linked) {
        toast.success('Código do professor vinculado com sucesso!');
      } else {
        toast.info('Código inválido ou já vinculado anteriormente.');
      }
      queryClient.invalidateQueries({ queryKey: ['student-referral'] });
    },
    onError: () => toast.error('Erro ao vincular código'),
  });
}

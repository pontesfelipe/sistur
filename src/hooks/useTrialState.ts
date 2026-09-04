import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TrialState {
  authenticated: boolean;
  has_subscription?: boolean;
  user_trialing?: boolean;
  org_trialing?: boolean;
  training_consumed?: boolean;
  assessment_used?: boolean;
  org_id?: string | null;
}

/**
 * Trial por consumo (Fase 4 do modelo comercial).
 * - Usuário em trial: apenas o curso base (is_foundation); 10 perguntas Beni.
 * - Organização em trial: 1 diagnóstico com resultado em teaser; projetos bloqueados.
 * Usuários/organizações da base existente foram convertidos (acesso integral).
 */
export function useTrialState() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['trial-state', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<TrialState> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_my_trial_state');
      if (error) throw error;
      return (data ?? { authenticated: false }) as TrialState;
    },
  });

  const state = query.data;

  return {
    state,
    isLoading: query.isLoading,
    /** Usuário novo sem assinatura (trial individual: EDU/Beni) */
    userTrialing: state?.user_trialing === true,
    /** Organização nova sem assinatura (trial de diagnóstico/projetos) */
    orgTrialing: state?.org_trialing === true,
    trainingConsumed: state?.training_consumed === true,
    assessmentUsed: state?.assessment_used === true,
    hasSubscription: state?.has_subscription === true,
    refresh: query.refetch,
  };
}

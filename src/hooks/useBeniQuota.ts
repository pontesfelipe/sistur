import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BeniBalance {
  authenticated: boolean;
  unlimited?: boolean;
  is_trial?: boolean;
  allowance?: number;
  used?: number;
  remaining_monthly?: number;
  user_credits?: number;
  org_credits?: number;
  period?: string;
}

/**
 * Saldo de perguntas do Professor Beni (Fase 3 — tokens).
 * Cota mensal por plano (30 padrao, 60 Empresarial), 10 totais no trial,
 * ADMIN ilimitado. Creditos comprados/concedidos somam ao saldo.
 */
export function useBeniQuota() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['beni-balance', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<BeniBalance> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_beni_balance');
      if (error) throw error;
      return (data ?? { authenticated: false }) as BeniBalance;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['beni-balance', user?.id] });
  };

  const balance = query.data;
  const totalCredits = (balance?.user_credits ?? 0) + (balance?.org_credits ?? 0);

  return {
    balance,
    isLoading: query.isLoading,
    unlimited: balance?.unlimited === true,
    isTrial: balance?.is_trial === true,
    allowance: balance?.allowance ?? 0,
    used: balance?.used ?? 0,
    remaining: balance?.remaining_monthly ?? 0,
    totalCredits,
    exhausted:
      !!balance &&
      !balance.unlimited &&
      (balance.remaining_monthly ?? 0) <= 0 &&
      totalCredits <= 0,
    refresh,
  };
}

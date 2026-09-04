import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Entitlements {
  plan: string | null;
  features: Record<string, boolean>;
  org_id: string | null;
  source: string;
}

const EMPTY: Entitlements = { plan: null, features: {}, org_id: null, source: 'none' };

/**
 * Direitos efetivos do usuário: plano vigente (assinatura da organização ou
 * pessoal) combinado com concessões avulsas (entitlement_overrides).
 * Fonte da verdade no servidor: `get_my_entitlements()`.
 */
export function useEntitlements() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['entitlements', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<Entitlements> => {
      const { data, error } = await supabase.rpc('get_my_entitlements' as never);
      if (error) throw error;
      return (data as unknown as Entitlements) ?? EMPTY;
    },
  });

  const entitlements = query.data ?? EMPTY;

  return {
    ...query,
    entitlements,
    plan: entitlements.plan,
    hasEntitlement: (feature: string) => entitlements.features?.[feature] === true,
  };
}

export interface Plan {
  id: string;
  code: string;
  version: number;
  name: string;
  audience: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  billing_period: string;
  seat_based: boolean;
  min_seats: number;
  quote_only: boolean;
  features: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
  /** Preço correspondente no provedor de pagamento (checkout online) */
  stripe_price_id?: string | null;
}

/** Catálogo público de planos ativos. */
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans' as never)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as unknown as Plan[]) ?? [];
    },
  });
}

export function formatPlanPrice(plan: Plan): string {
  if (plan.quote_only || plan.price_cents === null) return 'Sob consulta';
  if (plan.price_cents === 0) return 'Gratuito';
  const value = (plan.price_cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  });
  const period = plan.billing_period === 'annual' ? '/ano' : '/mês';
  return plan.seat_based ? `${value} por usuário ${period}` : `${value} ${period}`;
}

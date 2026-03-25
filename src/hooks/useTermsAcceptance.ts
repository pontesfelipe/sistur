import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CURRENT_TERMS_VERSION = '1.0';

export function useTermsAcceptance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hasAccepted, isLoading } = useQuery({
    queryKey: ['terms-acceptance', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await (supabase as any)
        .from('terms_acceptance')
        .select('id')
        .eq('user_id', user.id)
        .eq('terms_version', CURRENT_TERMS_VERSION)
        .maybeSingle();

      if (error) {
        console.error('Error checking terms acceptance:', error);
        return false;
      }
      return !!data;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  const acceptTerms = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('terms_acceptance')
        .upsert({
          user_id: user.id,
          terms_version: CURRENT_TERMS_VERSION,
          user_agent: navigator.userAgent,
        }, { onConflict: 'user_id,terms_version' });
      if (error) {
        console.error('Terms acceptance error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['terms-acceptance', user?.id], true);
    },
  });

  return {
    hasAccepted: hasAccepted ?? false,
    isLoading,
    acceptTerms,
    currentVersion: CURRENT_TERMS_VERSION,
  };
}

import { useEffect, useRef } from 'react';
import { useLicense } from '@/contexts/LicenseContext';
import { toast } from 'sonner';

/**
 * Shows in-app toast notifications when trial is about to expire.
 * Triggers at 3 days, 1 day, and on expiration.
 */
export function useTrialNotifications() {
  const { isTrialActive, isTrialExpired, trialDaysRemaining, plan } = useLicense();
  const lastNotified = useRef<number | null>(null);

  useEffect(() => {
    if (plan !== 'trial') return;

    if (isTrialExpired && lastNotified.current !== -1) {
      lastNotified.current = -1;
      toast.error('Seu período de avaliação expirou', {
        description: 'Escolha um plano para continuar usando o SISTUR.',
        duration: 10000,
        action: {
          label: 'Ver Planos',
          onClick: () => window.location.assign('/assinatura'),
        },
      });
      return;
    }

    if (!isTrialActive) return;

    if (trialDaysRemaining <= 1 && lastNotified.current !== 1) {
      lastNotified.current = 1;
      toast.warning('Último dia do trial!', {
        description: 'Atualize para um plano para não perder o acesso.',
        duration: 8000,
        action: {
          label: 'Ver Planos',
          onClick: () => window.location.assign('/assinatura'),
        },
      });
    } else if (trialDaysRemaining <= 3 && trialDaysRemaining > 1 && lastNotified.current !== 3) {
      lastNotified.current = 3;
      toast.warning(`${trialDaysRemaining} dias restantes no trial`, {
        description: 'Explore as funcionalidades antes que expire.',
        duration: 6000,
      });
    }
  }, [isTrialActive, isTrialExpired, trialDaysRemaining, plan]);
}

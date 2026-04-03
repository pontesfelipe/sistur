import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type LicensePlan = 'trial' | 'estudante' | 'professor' | 'basic' | 'pro' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'cancelled' | 'suspended';

export interface License {
  id: string;
  user_id: string;
  org_id: string | null;
  plan: LicensePlan;
  status: LicenseStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  activated_at: string;
  expires_at: string | null;
  max_users: number;
  features: Record<string, boolean>;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LicenseContextType {
  license: License | null;
  loading: boolean;
  initialized: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaidPlan: boolean;
  isLicenseValid: boolean;
  trialDaysRemaining: number;
  trialDaysTotal: number;
  trialProgress: number;
  plan: LicensePlan | null;
  planLabel: string;
  hasFeature: (feature: string) => boolean;
  refetchLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const PLAN_LABELS: Record<LicensePlan, string> = {
  trial: 'Avaliação Gratuita',
  estudante: 'Estudante',
  professor: 'Professor',
  basic: 'Básico',
  pro: 'Profissional',
  enterprise: 'Empresarial',
};

// Server-authoritative validity flags
interface ServerLicenseFlags {
  isValid: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaidPlan: boolean;
  serverNow: Date;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [license, setLicense] = useState<License | null>(null);
  const [serverFlags, setServerFlags] = useState<ServerLicenseFlags>({
    isValid: false,
    isTrialActive: false,
    isTrialExpired: false,
    isPaidPlan: false,
    serverNow: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const lastUserId = useRef<string | null>(null);

  const fetchLicense = useCallback(async () => {
    if (!user) {
      setLicense(null);
      setServerFlags({ isValid: false, isTrialActive: false, isTrialExpired: false, isPaidPlan: false, serverNow: new Date() });
      setLoading(false);
      setInitialized(true);
      lastUserId.current = null;
      return;
    }

    if (lastUserId.current === user.id && initialized && license) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_license_status');

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching license status:', error);
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (row) {
        setLicense({
          id: row.id,
          user_id: row.user_id,
          org_id: row.org_id,
          plan: row.plan as LicensePlan,
          status: row.status as LicenseStatus,
          trial_started_at: row.trial_started_at,
          trial_ends_at: row.trial_ends_at,
          activated_at: row.activated_at,
          expires_at: row.expires_at,
          max_users: row.max_users ?? 1,
          features: (row.features as Record<string, boolean>) ?? {},
          notes: row.notes,
          assigned_by: row.assigned_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
        setServerFlags({
          isValid: row.is_valid ?? false,
          isTrialActive: row.is_trial_active ?? false,
          isTrialExpired: row.is_trial_expired ?? false,
          isPaidPlan: row.is_paid_plan ?? false,
          serverNow: row.server_now ? new Date(row.server_now) : new Date(),
        });
      } else {
        setLicense(null);
        setServerFlags({ isValid: false, isTrialActive: false, isTrialExpired: false, isPaidPlan: false, serverNow: new Date() });
      }

      lastUserId.current = user.id;
    } catch (error) {
      console.error('Error in LicenseProvider:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [user, initialized, license]);

  useEffect(() => {
    if (user?.id !== lastUserId.current) {
      setLoading(true);
      fetchLicense();
    }
  }, [user?.id, fetchLicense]);

  const computed = useMemo(() => {
    const now = new Date();

    const isTrialActive = Boolean(
      license &&
      license.plan === 'trial' &&
      license.status === 'active' &&
      license.trial_ends_at &&
      new Date(license.trial_ends_at) > now
    );

    const isTrialExpired = Boolean(
      license &&
      license.plan === 'trial' &&
      (license.status === 'expired' || (license.trial_ends_at && new Date(license.trial_ends_at) <= now))
    );

    const isPaidPlan = Boolean(
      license &&
      ['estudante', 'professor', 'basic', 'pro', 'enterprise'].includes(license.plan) &&
      (license.status === 'active' || license.status === 'cancelled') &&
      (license.expires_at === null || new Date(license.expires_at) > now)
    );

    const isCancelled = Boolean(license && license.status === 'cancelled');

    const isLicenseValid = isTrialActive || isPaidPlan;

    const trialDaysRemaining = (() => {
      if (!license?.trial_ends_at) return 0;
      const end = new Date(license.trial_ends_at);
      const diff = end.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    })();

    const trialDaysTotal = 7;

    const trialProgress = license?.plan === 'trial'
      ? Math.min(100, Math.max(0, ((trialDaysTotal - trialDaysRemaining) / trialDaysTotal) * 100))
      : 0;

    const plan = license?.plan ?? null;
    const planLabel = plan ? PLAN_LABELS[plan] : 'Sem Licença';

    return { isTrialActive, isTrialExpired, isPaidPlan, isLicenseValid, trialDaysRemaining, trialDaysTotal, trialProgress, plan, planLabel };
  }, [license]);

  const hasFeature = useCallback((feature: string) => {
    if (!license) return false;
    if (!computed.isLicenseValid) return false;
    if (license.plan === 'enterprise') return true;
    return license.features[feature] === true;
  }, [license, computed.isLicenseValid]);

  const forceRefetch = async () => {
    lastUserId.current = null;
    await fetchLicense();
  };

  return (
    <LicenseContext.Provider value={{
      license,
      loading,
      initialized,
      isTrialActive: computed.isTrialActive,
      isTrialExpired: computed.isTrialExpired,
      isPaidPlan: computed.isPaidPlan,
      isLicenseValid: computed.isLicenseValid,
      trialDaysRemaining: computed.trialDaysRemaining,
      trialDaysTotal: computed.trialDaysTotal,
      trialProgress: computed.trialProgress,
      plan: computed.plan,
      planLabel: computed.planLabel,
      hasFeature,
      refetchLicense: forceRefetch,
    }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}

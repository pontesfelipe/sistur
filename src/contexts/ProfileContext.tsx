import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserProfile {
  user_id: string;
  org_id: string;
  full_name: string | null;
  avatar_url: string | null;
  system_access: 'ERP' | 'EDU' | null;
  pending_approval: boolean;
  viewing_demo_org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR';
  org_id: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  roles: UserRole[];
  loading: boolean;
  initialized: boolean;
  hasRole: (role: UserRole['role']) => boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  isProfessor: boolean;
  isEstudante: boolean;
  hasERPAccess: boolean;
  hasEDUAccess: boolean;
  needsOnboarding: boolean;
  awaitingApproval: boolean;
  isViewingDemoData: boolean;
  effectiveOrgId: string | undefined;
  completeOnboarding: (systemAccess: 'ERP' | 'EDU', role: 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR') => Promise<{ success: boolean; error?: string }>;
  toggleDemoMode: (enable: boolean) => Promise<{ success: boolean; error?: string }>;
  refetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const lastUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      setInitialized(true);
      lastUserId.current = null;
      return;
    }

    // Skip refetch if same user and already initialized
    if (lastUserId.current === user.id && initialized && profile) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role, org_id')
          .eq('user_id', user.id)
      ]);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileResult.error);
      }

      if (profileResult.data) {
        setProfile({
          user_id: profileResult.data.user_id,
          org_id: profileResult.data.org_id,
          full_name: profileResult.data.full_name,
          avatar_url: profileResult.data.avatar_url,
          system_access: profileResult.data.system_access as 'ERP' | 'EDU' | null,
          pending_approval: profileResult.data.pending_approval ?? false,
          viewing_demo_org_id: profileResult.data.viewing_demo_org_id ?? null,
          created_at: profileResult.data.created_at,
          updated_at: profileResult.data.updated_at,
        });
      }

      if (rolesResult.error) {
        console.error('Error fetching roles:', rolesResult.error);
      }

      if (rolesResult.data) {
        setRoles(rolesResult.data.map(r => ({
          role: r.role as UserRole['role'],
          org_id: r.org_id,
        })));
      }

      lastUserId.current = user.id;
    } catch (error) {
      console.error('Error in ProfileProvider:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [user, initialized, profile]);

  useEffect(() => {
    // Only fetch if user changes
    if (user?.id !== lastUserId.current) {
      setLoading(true);
      fetchProfile();
    }
  }, [user?.id, fetchProfile]);

  const hasRole = useCallback((role: UserRole['role']) => {
    return roles.some(r => r.role === role);
  }, [roles]);

  const isAdmin = hasRole('ADMIN');
  const isAnalyst = hasRole('ANALYST') || isAdmin;
  const isProfessor = hasRole('PROFESSOR');
  const isEstudante = hasRole('ESTUDANTE');

  const hasERPAccess = profile?.system_access === 'ERP' || isAdmin;
  const hasEDUAccess = profile?.system_access === 'EDU' || profile?.system_access === 'ERP' || isAdmin || isProfessor || isEstudante;

  const needsOnboarding = profile?.pending_approval === true && profile?.system_access === null;
  const awaitingApproval = profile?.pending_approval === true && profile?.system_access !== null;

  const isViewingDemoData = profile?.viewing_demo_org_id !== null;
  const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;

  const completeOnboarding = async (
    systemAccess: 'ERP' | 'EDU',
    role: 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR'
  ) => {
    if (!user) return { success: false, error: 'No user' };

    try {
      const { error } = await supabase.rpc('complete_user_onboarding', {
        _user_id: user.id,
        _system_access: systemAccess,
        _role: role,
      });

      if (error) throw error;

      // Force refetch
      lastUserId.current = null;
      await fetchProfile();

      return { success: true };
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      return { success: false, error: error.message };
    }
  };

  const toggleDemoMode = async (enable: boolean) => {
    if (!user) return { success: false, error: 'No user' };

    try {
      const { error } = await supabase.rpc('toggle_demo_mode', {
        _enable: enable,
      });

      if (error) throw error;

      // Force refetch
      lastUserId.current = null;
      await fetchProfile();

      return { success: true };
    } catch (error: any) {
      console.error('Error toggling demo mode:', error);
      return { success: false, error: error.message };
    }
  };

  const forceRefetch = async () => {
    lastUserId.current = null;
    await fetchProfile();
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      roles,
      loading,
      initialized,
      hasRole,
      isAdmin,
      isAnalyst,
      isProfessor,
      isEstudante,
      hasERPAccess,
      hasEDUAccess,
      needsOnboarding,
      awaitingApproval,
      isViewingDemoData,
      effectiveOrgId,
      completeOnboarding,
      toggleDemoMode,
      refetchProfile: forceRefetch,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}

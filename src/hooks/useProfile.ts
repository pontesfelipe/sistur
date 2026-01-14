import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserProfile {
  user_id: string;
  org_id: string;
  full_name: string | null;
  avatar_url: string | null;
  system_access: 'ERP' | 'EDU' | null;
  pending_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR';
  org_id: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        if (profileData) {
          setProfile({
            user_id: profileData.user_id,
            org_id: profileData.org_id,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
            system_access: profileData.system_access as 'ERP' | 'EDU' | null,
            pending_approval: profileData.pending_approval ?? false,
            created_at: profileData.created_at,
            updated_at: profileData.updated_at,
          });
        }

        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role, org_id')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
        }

        if (rolesData) {
          setRoles(rolesData.map(r => ({
            role: r.role as UserRole['role'],
            org_id: r.org_id,
          })));
        }
      } catch (error) {
        console.error('Error in useProfile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const hasRole = (role: UserRole['role']) => {
    return roles.some(r => r.role === role);
  };

  const isAdmin = hasRole('ADMIN');
  const isAnalyst = hasRole('ANALYST') || isAdmin;
  const isProfessor = hasRole('PROFESSOR');
  const isEstudante = hasRole('ESTUDANTE');

  const hasERPAccess = profile?.system_access === 'ERP' || isAdmin;
  const hasEDUAccess = profile?.system_access === 'EDU' || isAdmin || isProfessor || isEstudante;

  // User needs onboarding if they haven't selected a system_access yet
  const needsOnboarding = profile?.pending_approval === true && profile?.system_access === null;
  
  // User is waiting for admin approval if they completed onboarding but are still pending
  const awaitingApproval = profile?.pending_approval === true && profile?.system_access !== null;

  const completeOnboarding = async (
    systemAccess: 'ERP' | 'EDU',
    role: 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR'
  ) => {
    if (!user) return { success: false, error: 'No user' };

    try {
      const { data, error } = await supabase.rpc('complete_user_onboarding', {
        _user_id: user.id,
        _system_access: systemAccess,
        _role: role,
      });

      if (error) throw error;

      // Refresh profile
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (newProfile) {
        setProfile({
          user_id: newProfile.user_id,
          org_id: newProfile.org_id,
          full_name: newProfile.full_name,
          avatar_url: newProfile.avatar_url,
          system_access: newProfile.system_access as 'ERP' | 'EDU' | null,
          pending_approval: newProfile.pending_approval ?? false,
          created_at: newProfile.created_at,
          updated_at: newProfile.updated_at,
        });
      }

      // Refresh roles
      const { data: newRoles } = await supabase
        .from('user_roles')
        .select('role, org_id')
        .eq('user_id', user.id);

      if (newRoles) {
        setRoles(newRoles.map(r => ({
          role: r.role as UserRole['role'],
          org_id: r.org_id,
        })));
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    profile,
    roles,
    loading,
    hasRole,
    isAdmin,
    isAnalyst,
    isProfessor,
    isEstudante,
    hasERPAccess,
    hasEDUAccess,
    needsOnboarding,
    awaitingApproval,
    completeOnboarding,
  };
}

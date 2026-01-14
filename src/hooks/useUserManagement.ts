import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UserData {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR';
  avatar_url: string | null;
  created_at: string;
  system_access: 'ERP' | 'EDU' | null;
  is_blocked: boolean;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  const checkAdminStatus = async () => {
    if (!user) return false;
    
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'ADMIN'
    });
    
    setIsAdmin(!!data);
    return !!data;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create',
          email,
          password,
          full_name: fullName,
          role
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Usuário criado com sucesso');
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
      return { success: false, error: error.message };
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update_role',
          user_id: userId,
          role
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Papel atualizado com sucesso');
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar papel');
      return { success: false, error: error.message };
    }
  };

  const updateSystemAccess = async (userId: string, systemAccess: 'ERP' | 'EDU') => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'update_system_access',
          user_id: userId,
          system_access: systemAccess
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Acesso atualizado com sucesso');
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar acesso');
      return { success: false, error: error.message };
    }
  };

  const blockUser = async (userId: string, blocked: boolean) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'block_user',
          user_id: userId,
          blocked
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success(blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado');
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status');
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete_user',
          user_id: userId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast.success('Usuário removido com sucesso');
      await fetchUsers();
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover usuário');
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (user) {
      checkAdminStatus().then((admin) => {
        if (admin) {
          fetchUsers();
        } else {
          setLoading(false);
        }
      });
    }
  }, [user]);

  return {
    users,
    loading,
    isAdmin,
    createUser,
    updateUserRole,
    updateSystemAccess,
    blockUser,
    deleteUser,
    refetch: fetchUsers
  };
}

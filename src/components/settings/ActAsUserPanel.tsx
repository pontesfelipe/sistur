import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Eye, ArrowLeftRight, Loader2 } from 'lucide-react';

interface UserWithOrg {
  user_id: string;
  full_name: string | null;
  email: string;
  org_id: string;
  org_name: string;
}

export function ActAsUserPanel() {
  const { profile, isViewingDemoData, refetchProfile } = useProfile();
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all profiles with their orgs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, org_id')
        .eq('pending_approval', false);

      if (profilesError) throw profilesError;

      // Get org names
      const { data: orgs, error: orgsError } = await supabase
        .from('orgs')
        .select('id, name');

      if (orgsError) throw orgsError;

      const orgsMap = new Map(orgs?.map(o => [o.id, o.name]) || []);

      // Get emails via edge function
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      });

      const emailsMap = new Map<string, string>(
        (response.data?.users || []).map((u: any) => [u.user_id, u.email as string])
      );

      const enrichedUsers: UserWithOrg[] = (profiles || [])
        .filter(p => p.user_id !== profile?.user_id) // Exclude current user
        .map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: emailsMap.get(p.user_id) || 'Email não disponível',
          org_id: p.org_id,
          org_name: orgsMap.get(p.org_id) || 'Organização desconhecida'
        }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const switchToUser = async () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }

    try {
      setSwitching(true);

      const selectedUser = users.find(u => u.user_id === selectedUserId);
      if (!selectedUser) {
        throw new Error('Usuário não encontrado');
      }

      // Update current user's profile to view selected user's org
      const { error } = await supabase
        .from('profiles')
        .update({ viewing_demo_org_id: selectedUser.org_id })
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      toast.success(`Agora visualizando dados de ${selectedUser.full_name || selectedUser.email}`);
      
      // Reload to apply changes
      window.location.reload();
    } catch (error: any) {
      console.error('Error switching user:', error);
      toast.error(error.message || 'Erro ao trocar visualização');
    } finally {
      setSwitching(false);
    }
  };

  const stopActingAs = async () => {
    try {
      setSwitching(true);

      const { error } = await supabase
        .from('profiles')
        .update({ viewing_demo_org_id: null })
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      toast.success('Voltando para seus próprios dados');
      window.location.reload();
    } catch (error: any) {
      console.error('Error stopping act as:', error);
      toast.error(error.message || 'Erro ao voltar');
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [profile?.user_id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Visualizar como Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Visualizar como Usuário
        </CardTitle>
        <CardDescription>
          Visualize os dados de outro usuário/organização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isViewingDemoData && (
          <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Visualizando dados de outra organização
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Os dados exibidos não são seus
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={stopActingAs}
              disabled={switching}
            >
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowLeftRight className="h-4 w-4 mr-2" />
              )}
              Voltar aos meus dados
            </Button>
          </div>
        )}

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Selecionar usuário
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{user.full_name || user.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.org_name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={switchToUser}
            disabled={!selectedUserId || switching}
          >
            {switching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Visualizar
          </Button>
        </div>

        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum outro usuário encontrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Check, X, Clock, Loader2 } from 'lucide-react';

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  system_access: 'ERP' | 'EDU' | null;
  approval_requested_at: string;
}

export function PendingApprovalsPanel() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, system_access, approval_requested_at')
        .eq('pending_approval', true);

      if (error) throw error;

      // Get emails from auth.users via edge function
      if (data && data.length > 0) {
        const response = await supabase.functions.invoke('manage-users', {
          body: { action: 'list' }
        });

        const usersMap = new Map(
          (response.data?.users || []).map((u: any) => [u.user_id, u.email])
        );

        const enrichedData = data.map(p => ({
          ...p,
          email: usersMap.get(p.user_id) || 'Email não disponível'
        }));

        setPendingUsers(enrichedData as PendingUser[]);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Erro ao carregar usuários pendentes');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, profileId: string) => {
    const role = selectedRoles[profileId] || 'VIEWER';
    
    try {
      setProcessingId(profileId);

      // Get user's org_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', profileId)
        .single();

      if (!profile?.org_id) {
        throw new Error('Organização não encontrada');
      }

      // Update profile to approve
      const { data: approvedProfiles, error: profileError } = await supabase
        .from('profiles')
        .update({ pending_approval: false })
        .eq('id', profileId)
        .select('id');

      if (profileError) throw profileError;
      if (!approvedProfiles || approvedProfiles.length === 0) {
        throw new Error('Não foi possível aprovar: permissão negada ou usuário não encontrado');
      }

      // Add/update user role (avoid unique constraint errors)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          [
            {
              user_id: userId,
              org_id: profile.org_id,
              role: role as 'ADMIN' | 'ANALYST' | 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR',
            },
          ],
          { onConflict: 'user_id,org_id' }
        );

      if (roleError) throw roleError;

      toast.success('Usuário aprovado com sucesso');
      await fetchPendingUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Erro ao aprovar usuário');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectUser = async (userId: string, profileId: string) => {
    try {
      setProcessingId(profileId);

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) throw profileError;

      // Delete auth user via edge function
      await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: userId }
      });

      toast.success('Solicitação rejeitada');
      await fetchPendingUsers();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast.error(error.message || 'Erro ao rejeitar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Aprovações Pendentes
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
          <UserPlus className="h-5 w-5 text-primary" />
          Aprovações Pendentes
          {pendingUsers.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingUsers.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Usuários aguardando aprovação para acessar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação pendente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {user.system_access || 'Não definido'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Solicitado em {new Date(user.approval_requested_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedRoles[user.id] || 'VIEWER'}
                    onValueChange={(value) => 
                      setSelectedRoles(prev => ({ ...prev, [user.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Visualizador</SelectItem>
                      <SelectItem value="ANALYST">Analista</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => approveUser(user.user_id, user.id)}
                    disabled={processingId === user.id}
                  >
                    {processingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectUser(user.user_id, user.id)}
                    disabled={processingId === user.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

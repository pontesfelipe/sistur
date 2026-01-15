import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Users, 
  Building2,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
  ArrowLeftRight,
  Mail,
  Shield,
  X
} from 'lucide-react';
import { useAuditLogger } from '@/hooks/useAuditLogger';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  system_access: 'ERP' | 'EDU' | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-700',
  ANALYST: 'bg-blue-500/20 text-blue-700',
  VIEWER: 'bg-gray-500/20 text-gray-700',
  ESTUDANTE: 'bg-green-500/20 text-green-700',
  PROFESSOR: 'bg-purple-500/20 text-purple-700',
};

export function OrganizationUsersPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [allUsers, setAllUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const { logOrgAction } = useAuditLogger();

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('orgs')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setOrganizations(data || []);
        
        if (data && data.length > 0 && !selectedOrg) {
          setSelectedOrg(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        toast.error('Erro ao carregar organizações');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Fetch users for selected organization
  useEffect(() => {
    const fetchOrgUsers = async () => {
      if (!selectedOrg) return;

      try {
        setUsersLoading(true);

        // Get users in this org
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, created_at, system_access')
          .eq('org_id', selectedOrg)
          .eq('pending_approval', false);

        if (profilesError) throw profilesError;

        // Get roles
        const userIds = profiles?.map(p => p.user_id) || [];
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Fetch emails using edge function
        const { data: response } = await supabase.functions.invoke('manage-users', {
          body: { action: 'list_by_org', org_id: selectedOrg }
        });

        const emailMap = new Map<string, string>(
          (response?.users || []).map((u: { user_id: string; email: string }) => [u.user_id, u.email])
        );

        const enrichedUsers: OrganizationUser[] = (profiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          system_access: p.system_access,
          email: emailMap.get(p.user_id) || null,
          role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER',
        }));

        setUsers(enrichedUsers);
      } catch (error) {
        console.error('Error fetching org users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchOrgUsers();
  }, [selectedOrg]);

  // Fetch all users for adding
  const fetchAllUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at, system_access, org_id')
        .eq('pending_approval', false);

      // Filter out users already in the selected org
      const availableUsers = (profiles || [])
        .filter(p => p.org_id !== selectedOrg)
        .map(p => ({
          ...p,
          email: null,
          role: 'VIEWER',
        }));

      setAllUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!selectedOrg) return;

    try {
      setProcessing(userId);

      const { error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'change_org',
          user_id: userId,
          new_org_id: selectedOrg
        }
      });

      if (error) throw error;

      const orgName = organizations.find(o => o.id === selectedOrg)?.name;
      await logOrgAction('ORG_USER_ADDED', userId, selectedOrg, { org_name: orgName });

      toast.success('Usuário adicionado à organização');
      setAddUserDialogOpen(false);
      
      // Refresh users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at, system_access')
        .eq('org_id', selectedOrg)
        .eq('pending_approval', false);

      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const enrichedUsers = (profiles || []).map(p => ({
        ...p,
        email: null,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER',
      }));

      setUsers(enrichedUsers);
    } catch (error: any) {
      console.error('Error adding user to org:', error);
      toast.error(error.message || 'Erro ao adicionar usuário');
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    try {
      setProcessing(userId);

      // Move user to a "limbo" org or set org_id to null
      // For now, we'll just log the action and show a message
      // The actual removal would require a dedicated "unassigned" org
      
      const { error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'remove_from_org',
          user_id: userId
        }
      });

      if (error) throw error;

      const orgName = organizations.find(o => o.id === selectedOrg)?.name;
      await logOrgAction('ORG_USER_REMOVED', userId, selectedOrg || '', { 
        org_name: orgName,
        user_name: userName 
      });

      toast.success('Usuário removido da organização');
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (error: any) {
      console.error('Error removing user from org:', error);
      toast.error(error.message || 'Erro ao remover usuário');
    } finally {
      setProcessing(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const filteredUsers = users.filter(u => 
    !searchQuery || 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailableUsers = allUsers.filter(u =>
    !addUserSearch ||
    u.full_name?.toLowerCase().includes(addUserSearch.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Usuários por Organização
        </CardTitle>
        <CardDescription>
          Visualize e gerencie usuários de cada organização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Organization Selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedOrg || ''} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecione uma organização" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={addUserDialogOpen} onOpenChange={(open) => {
            setAddUserDialogOpen(open);
            if (open) fetchAllUsers();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!selectedOrg}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Usuário à Organização</DialogTitle>
                <DialogDescription>
                  Selecione um usuário para adicionar a esta organização
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={addUserSearch}
                    onChange={(e) => setAddUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredAvailableUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum usuário disponível
                      </p>
                    ) : (
                      filteredAvailableUsers.map(user => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.full_name || 'Sem nome'}</p>
                              {user.system_access && (
                                <Badge variant="outline" className="text-xs">
                                  {user.system_access}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddUser(user.user_id)}
                            disabled={processing === user.user_id}
                          >
                            {processing === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        {selectedOrg && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Users List */}
        {usersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !selectedOrg ? (
          <div className="text-center py-8 text-muted-foreground">
            Selecione uma organização para ver seus usuários
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum usuário encontrado nesta organização
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                      {user.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={ROLE_COLORS[user.role] || ''}>
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                        {user.system_access && (
                          <Badge variant="outline">
                            {user.system_access}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={processing === user.user_id}
                      >
                        {processing === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover usuário da organização?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O usuário <strong>{user.full_name}</strong> será removido desta organização.
                          Ele ainda terá acesso ao sistema, mas precisará ser adicionado a outra organização.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleRemoveUser(user.user_id, user.full_name || '')}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Stats */}
        {selectedOrg && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {filteredUsers.length} usuário(s) na organização
            </span>
            <div className="flex gap-2">
              {['ADMIN', 'ANALYST', 'VIEWER'].map(role => {
                const count = filteredUsers.filter(u => u.role === role).length;
                if (count === 0) return null;
                return (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {count} {ROLE_LABELS[role]}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

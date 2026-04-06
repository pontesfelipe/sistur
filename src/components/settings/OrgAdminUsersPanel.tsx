import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useProfileContext } from '@/contexts/ProfileContext';
import { OrgReferralManagePanel } from '@/components/settings/OrgReferralPanel';
import {
  Users,
  Search,
  UserPlus,
  Loader2,
  Mail,
  Shield,
  MoreHorizontal,
  Ban,
  Trash2,
  GraduationCap,
  Building2,
  Eye,
  User,
} from 'lucide-react';

interface OrgUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  system_access: 'ERP' | 'EDU' | null;
  created_at: string;
  is_blocked?: boolean;
}

const ROLE_INFO: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrador', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
  ORG_ADMIN: { label: 'Admin Org', color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  ANALYST: { label: 'Analista', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  VIEWER: { label: 'Visualizador', color: 'bg-muted text-muted-foreground' },
  ESTUDANTE: { label: 'Estudante', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  PROFESSOR: { label: 'Professor', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400' },
};

// Roles that ORG_ADMIN can assign
const ASSIGNABLE_ERP_ROLES = ['ANALYST', 'VIEWER'];
const ASSIGNABLE_EDU_ROLES = ['ESTUDANTE', 'PROFESSOR'];

export function OrgAdminUsersPanel() {
  const { profile, isOrgAdmin, isAdmin } = useProfileContext();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    systemAccess: '' as 'ERP' | 'EDU' | '',
    role: '',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });

      if (response.error) throw new Error(response.error.message);
      setUsers(response.data.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.org_id) {
      fetchUsers();
    }
  }, [profile?.org_id]);

  // Reset role when system access changes
  useEffect(() => {
    if (formData.systemAccess === 'EDU') {
      setFormData(prev => ({ ...prev, role: 'ESTUDANTE' }));
    } else if (formData.systemAccess === 'ERP') {
      setFormData(prev => ({ ...prev, role: 'VIEWER' }));
    }
  }, [formData.systemAccess]);

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.systemAccess || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          role: formData.role,
          system_access: formData.systemAccess,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data.error) throw new Error(response.data.error);

      toast.success('Usuário criado com sucesso');
      setCreateDialogOpen(false);
      setFormData({ email: '', password: '', fullName: '', systemAccess: '', role: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessingUserId(userId);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_role', user_id: userId, role: newRole },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('Papel atualizado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar papel');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleSystemAccessChange = async (userId: string, newAccess: 'ERP' | 'EDU') => {
    setProcessingUserId(userId);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_system_access', user_id: userId, system_access: newAccess },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      // Auto-adjust role
      const targetUser = users.find(u => u.user_id === userId);
      if (targetUser) {
        const eduRoles = ['ESTUDANTE', 'PROFESSOR'];
        const erpRoles = ['ANALYST', 'VIEWER'];
        if (newAccess === 'EDU' && !eduRoles.includes(targetUser.role)) {
          await handleRoleChange(userId, 'ESTUDANTE');
        } else if (newAccess === 'ERP' && !erpRoles.includes(targetUser.role)) {
          await handleRoleChange(userId, 'VIEWER');
        }
      }

      toast.success('Acesso atualizado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar acesso');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleBlockUser = async (userId: string, blocked: boolean) => {
    setProcessingUserId(userId);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'block_user', user_id: userId, blocked },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success(blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'remove_from_org', user_id: userId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('Usuário removido da organização');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover usuário');
    } finally {
      setProcessingUserId(null);
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

  const isProtectedRole = (role: string) => role === 'ADMIN' || role === 'ORG_ADMIN';
  const isSelf = (userId: string) => userId === profile?.user_id;

  if (!isOrgAdmin && !isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Referral codes */}
      <OrgReferralManagePanel />

      {/* Users list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Membros da Organização
              </CardTitle>
              <CardDescription>
                Gerencie os usuários vinculados à sua organização
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Membro</DialogTitle>
                  <DialogDescription>
                    Crie uma conta para um novo membro da sua organização.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sistema de Acesso *</Label>
                    <Select
                      value={formData.systemAccess}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, systemAccess: value as 'ERP' | 'EDU' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o sistema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ERP">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            ERP - Sistema Territorial
                          </div>
                        </SelectItem>
                        <SelectItem value="EDU">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            EDU - Plataforma Educacional
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.systemAccess && (
                    <div className="space-y-2">
                      <Label>Papel *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                        <SelectContent>
                          {(formData.systemAccess === 'EDU' ? ASSIGNABLE_EDU_ROLES : ASSIGNABLE_ERP_ROLES).map(role => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                {role === 'ESTUDANTE' || role === 'PROFESSOR' ? (
                                  <GraduationCap className="h-4 w-4" />
                                ) : role === 'ANALYST' ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                {ROLE_INFO[role]?.label || role}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={creating || !formData.email || !formData.password || !formData.fullName || !formData.systemAccess || !formData.role}
                  >
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Membro
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum membro encontrado
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const roleInfo = ROLE_INFO[user.role] || ROLE_INFO.VIEWER;
                  const isProcessing = processingUserId === user.user_id;
                  const canManage = !isProtectedRole(user.role) && !isSelf(user.user_id);

                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                            {isSelf(user.user_id) && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          {user.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={roleInfo.color}>
                              <Shield className="h-3 w-3 mr-1" />
                              {roleInfo.label}
                            </Badge>
                            {user.system_access && (
                              <Badge variant="outline">{user.system_access}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isProcessing}>
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Role change */}
                            <DropdownMenuItem disabled className="text-xs font-semibold text-muted-foreground">
                              Alterar Papel
                            </DropdownMenuItem>
                            {(user.system_access === 'EDU' ? ASSIGNABLE_EDU_ROLES : ASSIGNABLE_ERP_ROLES)
                              .filter(r => r !== user.role)
                              .map(role => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() => handleRoleChange(user.user_id, role)}
                                >
                                  {ROLE_INFO[role]?.label || role}
                                </DropdownMenuItem>
                              ))}

                            <DropdownMenuSeparator />

                            {/* System access toggle */}
                            <DropdownMenuItem
                              onClick={() => handleSystemAccessChange(user.user_id, user.system_access === 'ERP' ? 'EDU' : 'ERP')}
                            >
                              Mudar para {user.system_access === 'ERP' ? 'EDU' : 'ERP'}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Block */}
                            <DropdownMenuItem
                              onClick={() => handleBlockUser(user.user_id, !user.is_blocked)}
                              className="text-amber-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              {user.is_blocked ? 'Desbloquear' : 'Bloquear'}
                            </DropdownMenuItem>

                            {/* Remove from org */}
                            <DropdownMenuItem
                              onClick={() => handleRemoveUser(user.user_id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover da Organização
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <p className="text-xs text-muted-foreground">
            {filteredUsers.length} membro{filteredUsers.length !== 1 ? 's' : ''} na organização
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserManagement, UserData } from '@/hooks/useUserManagement';
import { UserPlus, Shield, User, Eye, Loader2, MoreHorizontal, Ban, Trash2, RefreshCw, GraduationCap, Building2 } from 'lucide-react';

const ROLE_INFO: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  ADMIN: { label: 'Administrador', color: 'bg-red-500/20 text-red-700', icon: Shield },
  ANALYST: { label: 'Analista', color: 'bg-blue-500/20 text-blue-700', icon: User },
  VIEWER: { label: 'Visualizador', color: 'bg-gray-500/20 text-gray-700', icon: Eye },
  ESTUDANTE: { label: 'Estudante', color: 'bg-green-500/20 text-green-700', icon: GraduationCap },
  PROFESSOR: { label: 'Professor', color: 'bg-purple-500/20 text-purple-700', icon: GraduationCap },
};

const SYSTEM_ACCESS_INFO: Record<string, { label: string; color: string }> = {
  ERP: { label: 'ERP', color: 'bg-primary/20 text-primary' },
  EDU: { label: 'EDU', color: 'bg-emerald-500/20 text-emerald-700' },
};

export function UserManagement() {
  const { users, loading, isAdmin, createUser, updateUserRole, updateSystemAccess, blockUser, deleteUser } = useUserManagement();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'VIEWER' as string
  });

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      return;
    }

    setCreating(true);
    const result = await createUser(formData.email, formData.password, formData.fullName, formData.role);
    setCreating(false);

    if (result.success) {
      setDialogOpen(false);
      setFormData({ email: '', password: '', fullName: '', role: 'VIEWER' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessingUserId(userId);
    await updateUserRole(userId, newRole);
    setProcessingUserId(null);
  };

  const handleSystemAccessChange = async (userId: string, newAccess: 'ERP' | 'EDU') => {
    setProcessingUserId(userId);
    await updateSystemAccess(userId, newAccess);
    setProcessingUserId(null);
  };

  const handleBlockUser = async (userId: string, blocked: boolean) => {
    setProcessingUserId(userId);
    await blockUser(userId, blocked);
    setProcessingUserId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingUserId(userId);
    await deleteUser(userId);
    setProcessingUserId(null);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Acesso restrito a administradores.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando usuários...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Gerenciamento de Usuários
              </CardTitle>
              <CardDescription>
                Adicione e gerencie os usuários da sua organização
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo usuário. Ele receberá acesso imediato.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Nome completo do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Senha inicial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Papel</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="ANALYST">Analista</SelectItem>
                        <SelectItem value="VIEWER">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleInfo = ROLE_INFO[user.role] || ROLE_INFO.VIEWER;
                const accessInfo = user.system_access ? SYSTEM_ACCESS_INFO[user.system_access] : null;
                const isProcessing = processingUserId === user.user_id;
                
                return (
                  <TableRow key={user.user_id} className={user.is_blocked ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                          {user.is_blocked && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.system_access || ''} 
                        onValueChange={(value) => handleSystemAccessChange(user.user_id, value as 'ERP' | 'EDU')}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="—">
                            {accessInfo ? (
                              <Badge className={accessInfo.color}>
                                {accessInfo.label}
                              </Badge>
                            ) : '—'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ERP">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              ERP
                            </div>
                          </SelectItem>
                          <SelectItem value="EDU">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              EDU
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={user.role} 
                        onValueChange={(value) => handleRoleChange(user.user_id, value)}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue>
                            <Badge className={roleInfo.color}>
                              {roleInfo.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="ANALYST">Analista</SelectItem>
                          <SelectItem value="VIEWER">Visualizador</SelectItem>
                          <SelectItem value="ESTUDANTE">Estudante</SelectItem>
                          <SelectItem value="PROFESSOR">Professor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
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
                          {user.is_blocked ? (
                            <DropdownMenuItem onClick={() => handleBlockUser(user.user_id, false)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleBlockUser(user.user_id, true)}>
                              <Ban className="h-4 w-4 mr-2" />
                              Bloquear Acesso
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Usuário
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O usuário <strong>{user.full_name}</strong> ({user.email}) será permanentemente removido do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteUser(user.user_id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
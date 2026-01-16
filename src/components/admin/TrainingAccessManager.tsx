import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Globe, 
  Building2, 
  User, 
  Plus, 
  Trash2,
  Calendar,
  Shield,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useTrainingAccess, 
  useTrainingAccessMutations, 
  useOrgs, 
  useUsersForAccess,
  TrainingAccessWithDetails 
} from '@/hooks/useTrainingAccess';

interface TrainingAccessManagerProps {
  trainingId: string;
  trainingTitle: string;
}

const ACCESS_TYPE_INFO = {
  public: {
    label: 'Público',
    description: 'Todos os usuários têm acesso',
    icon: Globe,
    color: 'bg-green-500/10 text-green-700 border-green-500/20',
  },
  org: {
    label: 'Organização',
    description: 'Apenas membros da organização',
    icon: Building2,
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  },
  user: {
    label: 'Usuário',
    description: 'Usuário específico',
    icon: User,
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  },
};

export function TrainingAccessManager({ trainingId, trainingTitle }: TrainingAccessManagerProps) {
  const { data: accessList, isLoading } = useTrainingAccess(trainingId);
  const { data: orgs } = useOrgs();
  const { data: users } = useUsersForAccess();
  const { 
    grantPublicAccess, 
    grantOrgAccess, 
    grantUserAccess, 
    revokeAccess,
    removePublicAccess 
  } = useTrainingAccessMutations();

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [accessToRevoke, setAccessToRevoke] = useState<TrainingAccessWithDetails | null>(null);

  const isPublic = accessList?.some(a => a.access_type === 'public');
  const orgAccesses = accessList?.filter(a => a.access_type === 'org') || [];
  const userAccesses = accessList?.filter(a => a.access_type === 'user') || [];

  const handleTogglePublic = () => {
    if (isPublic) {
      removePublicAccess.mutate(trainingId);
    } else {
      grantPublicAccess.mutate(trainingId);
    }
  };

  const handleAddOrgAccess = () => {
    if (!selectedOrgId) return;
    grantOrgAccess.mutate({ trainingId, orgId: selectedOrgId });
    setSelectedOrgId('');
  };

  const handleAddUserAccess = () => {
    if (!selectedUserId) return;
    grantUserAccess.mutate({ trainingId, userId: selectedUserId });
    setSelectedUserId('');
  };

  const handleRevokeClick = (access: TrainingAccessWithDetails) => {
    setAccessToRevoke(access);
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = () => {
    if (accessToRevoke) {
      revokeAccess.mutate({ accessId: accessToRevoke.id, trainingId });
    }
    setRevokeDialogOpen(false);
    setAccessToRevoke(null);
  };

  // Filter out orgs that already have access
  const availableOrgs = orgs?.filter(org => 
    !orgAccesses.some(a => a.org_id === org.id)
  ) || [];

  // Filter out users that already have access
  const availableUsers = (users || []).filter(user => 
    !userAccesses.some(a => a.user_id === user.user_id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Carregando configurações de acesso...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-medium">Controle de Acesso</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie quem pode acessar: {trainingTitle}
          </p>
        </div>
      </div>

      {/* Public Access Toggle */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Acesso Público</div>
                <p className="text-sm text-muted-foreground">
                  Liberar para todos os usuários autenticados
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={grantPublicAccess.isPending || removePublicAccess.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Acesso por Organização
          </CardTitle>
          <CardDescription>
            Libere acesso para todos os membros de organizações específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add org access */}
          <div className="flex gap-2">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione uma organização" />
              </SelectTrigger>
              <SelectContent>
                {availableOrgs.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhuma organização disponível
                  </div>
                ) : (
                  availableOrgs.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddOrgAccess} 
              disabled={!selectedOrgId || grantOrgAccess.isPending}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List of org accesses */}
          {orgAccesses.length > 0 ? (
            <div className="space-y-2">
              {orgAccesses.map(access => (
                <div 
                  key={access.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">{access.org_name || 'Organização'}</div>
                      <div className="text-xs text-muted-foreground">
                        Concedido em {format(new Date(access.granted_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevokeClick(access)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              Nenhuma organização com acesso específico
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Acesso por Usuário
          </CardTitle>
          <CardDescription>
            Libere acesso para usuários específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add user access */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum usuário disponível
                  </div>
                ) : (
                  availableUsers.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || 'Usuário'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddUserAccess} 
              disabled={!selectedUserId || grantUserAccess.isPending}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List of user accesses */}
          {userAccesses.length > 0 ? (
            <div className="space-y-2">
              {userAccesses.map(access => (
                <div 
                  key={access.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-sm">
                        {access.user_name || access.user_email || 'Usuário'}
                      </div>
                      {access.user_email && access.user_name && (
                        <div className="text-xs text-muted-foreground">{access.user_email}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Concedido em {format(new Date(access.granted_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevokeClick(access)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              Nenhum usuário com acesso específico
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium text-sm">Resumo de Acessos</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {isPublic && (
                  <Badge variant="outline" className={ACCESS_TYPE_INFO.public.color}>
                    <Globe className="h-3 w-3 mr-1" />
                    Público
                  </Badge>
                )}
                {orgAccesses.length > 0 && (
                  <Badge variant="outline" className={ACCESS_TYPE_INFO.org.color}>
                    <Building2 className="h-3 w-3 mr-1" />
                    {orgAccesses.length} organização(ões)
                  </Badge>
                )}
                {userAccesses.length > 0 && (
                  <Badge variant="outline" className={ACCESS_TYPE_INFO.user.color}>
                    <User className="h-3 w-3 mr-1" />
                    {userAccesses.length} usuário(s)
                  </Badge>
                )}
                {!isPublic && orgAccesses.length === 0 && userAccesses.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Apenas membros da organização do curso têm acesso
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {accessToRevoke?.access_type === 'org' 
                ? `Os membros da organização "${accessToRevoke?.org_name}" perderão acesso a este treinamento.`
                : `O usuário "${accessToRevoke?.user_name || accessToRevoke?.user_email}" perderá acesso a este treinamento.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

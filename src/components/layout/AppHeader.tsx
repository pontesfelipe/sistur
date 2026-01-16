import { useState } from 'react';
import { User, Menu, Lock, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuClick?: () => void;
}

export function AppHeader({ title, subtitle, onMobileMenuClick }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const { isViewingDemoData, isAdmin, profile, roles } = useProfile();
  const navigate = useNavigate();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Check if user logged in via OAuth (Google, etc.) - they can't change password
  const isOAuthUser = user?.app_metadata?.provider && user.app_metadata.provider !== 'email';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth');
  };

  // Get initials from email or user metadata
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrador',
      ANALYST: 'Analista',
      VIEWER: 'Visualizador',
      ESTUDANTE: 'Estudante',
      PROFESSOR: 'Professor',
    };
    return labels[role] || role;
  };

  const getSystemAccessLabel = () => {
    if (profile?.system_access === 'ERP') return 'ERP (Completo)';
    if (profile?.system_access === 'EDU') return 'EDU (Educacional)';
    return 'Não definido';
  };

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-3 sm:px-4 md:px-6 flex items-center justify-between">
        {/* Left: Mobile menu + Title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          {onMobileMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={onMobileMenuClick}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-display font-semibold text-foreground truncate">{title}</h1>
              {isViewingDemoData && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs shrink-0">
                  <Database className="h-3 w-3 mr-1" />
                  Demo
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Notifications */}
          <NotificationsDropdown />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{getDisplayName()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{getDisplayName()}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Meu perfil
              </DropdownMenuItem>
              {!isOAuthUser && (
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChangePasswordDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
      />

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
            <DialogDescription>
              Informações da sua conta no SISTUR
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{getDisplayName()}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                <Input 
                  value={profile?.full_name || user?.user_metadata?.full_name || 'Não informado'} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input 
                  value={user?.email || ''} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo de Acesso</Label>
                <Input 
                  value={getSystemAccessLabel()} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Papéis</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {roles.length > 0 ? (
                    roles.map((r, idx) => (
                      <Badge key={idx} variant="secondary">
                        {getRoleLabel(r.role)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum papel atribuído</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Membro desde</Label>
                <Input 
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'N/A'} 
                  readOnly 
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
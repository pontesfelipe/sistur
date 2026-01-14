import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, LogOut, RefreshCw } from 'lucide-react';

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  // If user is not pending approval, redirect appropriately
  if (!profile?.pending_approval && profile?.system_access) {
    if (profile.system_access === 'ERP') {
      navigate('/');
    } else {
      navigate('/edu');
    }
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-2xl">SISTUR</span>
          </div>
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-display">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-base">
            Sua solicitação de acesso foi recebida e está sendo analisada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Nome:</strong> {profile?.full_name || 'Não informado'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Email:</strong> {user?.email}
            </p>
            {profile?.system_access && (
              <p className="text-sm text-muted-foreground">
                <strong>Acesso Solicitado:</strong> SISTUR {profile.system_access}
              </p>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Um administrador irá revisar sua solicitação em breve.
              Você receberá acesso assim que sua conta for aprovada.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar Status
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

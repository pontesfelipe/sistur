import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProfileContext } from '@/contexts/ProfileContext';
import { MessageSquare, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function ForumPrivacySettings() {
  const { profile, updateForumPrivacy } = useProfileContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (showIdentity: boolean) => {
    setIsUpdating(true);
    const result = await updateForumPrivacy(showIdentity);
    setIsUpdating(false);

    if (result.success) {
      toast.success(
        showIdentity 
          ? 'Sua identidade será exibida em posts públicos' 
          : 'Você aparecerá como anônimo em posts públicos'
      );
    } else {
      toast.error('Erro ao atualizar configuração: ' + result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Privacidade no Social Turismo
        </CardTitle>
        <CardDescription>
          Controle como você aparece em posts públicos do fórum
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {profile?.forum_show_identity ? (
              <Eye className="h-5 w-5 text-primary" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="forum-identity" className="font-medium">
                Exibir identidade em posts públicos
              </Label>
              <p className="text-sm text-muted-foreground">
                {profile?.forum_show_identity 
                  ? 'Seu nome e avatar são visíveis para todos'
                  : 'Você aparece como "Usuário Anônimo"'}
              </p>
            </div>
          </div>
          <Switch
            id="forum-identity"
            checked={profile?.forum_show_identity ?? true}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Nota de segurança:</strong> Esta configuração afeta apenas posts com 
            visibilidade <strong>pública</strong>. Em posts da sua organização, sua identidade 
            sempre será visível para membros da mesma organização.
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Identidade visível:</strong> Nome e foto aparecem normalmente</p>
          <p>• <strong>Anônimo:</strong> Exibido como "Usuário Anônimo" sem foto</p>
          <p>• Você ainda pode editar e excluir seus próprios posts</p>
        </div>
      </CardContent>
    </Card>
  );
}

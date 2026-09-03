import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert } from 'lucide-react';

export default function AccessBlocked() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>Acesso bloqueado</CardTitle>
          <CardDescription>
            Sua conta está bloqueada. Entre em contato com o administrador da sua organização para restabelecer o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" onClick={signOut}>Sair</Button>
          <a
            className="text-sm text-center text-muted-foreground underline"
            href="mailto:contato@sistur.app"
          >
            contato@sistur.app
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

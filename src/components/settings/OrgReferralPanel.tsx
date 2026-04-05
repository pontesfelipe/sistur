import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrgReferralCodes, useLinkUserToOrg } from '@/hooks/useOrgReferral';
import { useProfile } from '@/hooks/useProfile';
import { Copy, Link2, Plus, Loader2, Building2, Tag, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Panel for ORG_ADMINs to manage org referral codes
export function OrgReferralManagePanel() {
  const { codes, isLoading, generateCode, deactivateCode } = useOrgReferralCodes();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/auth?orgref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de convite copiado!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Códigos de Convite da Organização
        </CardTitle>
        <CardDescription>
          Gere códigos para convidar pessoas a ingressar na sua organização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => generateCode.mutate()}
          disabled={generateCode.isPending}
        >
          {generateCode.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Gerar Novo Código
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : codes && codes.length > 0 ? (
          <div className="space-y-3">
            {codes.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 font-mono text-sm font-bold tracking-widest">
                  {c.code}
                </div>
                <Badge variant={c.is_active ? 'default' : 'secondary'}>
                  {c.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
                {c.is_active && (
                  <>
                    <Button variant="outline" size="icon" onClick={() => copyCode(c.code)} title="Copiar código">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyLink(c.code)} title="Copiar link">
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deactivateCode.mutate(c.id)}
                      title="Desativar"
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum código gerado ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}

// Panel for any user to enter an org code
export function JoinOrgByCodePanel() {
  const [code, setCode] = useState('');
  const linkToOrg = useLinkUserToOrg();

  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error('Informe um código');
      return;
    }
    linkToOrg.mutate(code.trim());
    setCode('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Vincular a uma Organização
        </CardTitle>
        <CardDescription>
          Se você recebeu um código de convite de uma organização, insira abaixo para ingressar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="org-code">Código da Organização</Label>
            <Input
              id="org-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: ORGAB3XYZ"
              maxLength={20}
              className="font-mono tracking-widest"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSubmit} disabled={linkToOrg.isPending}>
              {linkToOrg.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Vincular'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

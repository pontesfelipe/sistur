import { useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, LogOut, Tag, Building2 } from 'lucide-react';
import { useLinkStudentReferral } from '@/hooks/useProfessorReferral';
import { useLinkUserToOrg } from '@/hooks/useOrgReferral';

import { tx } from "@/i18n/t";

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, needsOnboarding, completeOnboarding } = useProfile();
  const linkReferral = useLinkStudentReferral();
  const linkToOrg = useLinkUserToOrg();

  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [orgCode, setOrgCode] = useState(searchParams.get('orgref') || '');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calling navigate() during render causes "Cannot update a component while
  // rendering another component" warnings and unpredictable redirects. Using
  // <Navigate> lets React Router handle the redirect as part of the render.
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!needsOnboarding) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);

    // Module choice removed (v2.24.0): everyone requests access the same way;
    // the admin assigns the role on approval and the plan defines features.
    const result = await completeOnboarding(null, 'VIEWER');

    // If has a professor referral code, link it
    if (result.success && referralCode.trim()) {
      try {
        await linkReferral.mutateAsync(referralCode.trim());
      } catch (err) {
        console.warn('Failed to link professor referral:', err);
      }
    }

    // If has org code, link to org
    if (result.success && orgCode.trim()) {
      try {
        await linkToOrg.mutateAsync(orgCode.trim());
      } catch (err) {
        console.warn('Failed to link org referral:', err);
      }
    }

    setSubmitting(false);

    if (result.success) {
      toast.success(tx('Solicitação enviada! Aguarde aprovação do administrador.'));
      navigate('/pending-approval');
    } else {
      toast.error(tx('Erro ao configurar acesso: ') + result.error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">S</span>
            </div>
            <span className="font-display font-bold text-2xl">{tx("SISTUR")}</span>
          </div>
          <CardTitle className="text-2xl font-display">
            {tx('Bem-vindo ao SISTUR!')}
          </CardTitle>
          <CardDescription>
            {tx('Confirme sua solicitação de acesso. Um administrador irá liberar sua conta em breve.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Org referral code - optional */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{tx("Código de Organização (opcional)")}</span>
            </div>
            <Input
              value={orgCode}
              onChange={e => setOrgCode(e.target.value.toUpperCase())}
              placeholder={tx("Ex: ORGAB3XYZ")}
              maxLength={20}
              className="font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              {tx("Se recebeu um código de uma organização, insira para ingressar automaticamente.")}
            </p>
          </div>

          {/* Professor referral code - optional */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>{tx("Código do Professor (opcional)")}</span>
            </div>
            <Input
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder={tx("Ex: PROFAB3XYZ")}
              maxLength={20}
              className="font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              {tx("Se um professor compartilhou um código ou link de convite com você, insira acima.")}
            </p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tx("Enviando...")}</>) : tx('Solicitar acesso')}
          </Button>

          <Button variant="ghost" onClick={handleLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            {tx("Sair e voltar ao login")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

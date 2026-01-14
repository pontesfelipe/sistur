import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, BarChart3, GraduationCap, Users, BookOpen, ArrowLeft, LogOut } from 'lucide-react';

type SystemAccess = 'ERP' | 'EDU';
type EduRole = 'ESTUDANTE' | 'PROFESSOR';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, needsOnboarding, completeOnboarding } = useProfile();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [systemAccess, setSystemAccess] = useState<SystemAccess | null>(null);
  const [eduRole, setEduRole] = useState<EduRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (!needsOnboarding) {
    navigate('/');
    return null;
  }

  const handleSubmit = async () => {
    if (!systemAccess) return;

    setSubmitting(true);

    let role: 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR' = 'VIEWER';
    
    if (systemAccess === 'EDU') {
      if (!eduRole) {
        toast.error('Selecione seu perfil educacional');
        setSubmitting(false);
        return;
      }
      role = eduRole;
    }

    const result = await completeOnboarding(systemAccess, role);

    setSubmitting(false);

    if (result.success) {
      toast.success('Bem-vindo ao SISTUR!');
      if (systemAccess === 'ERP') {
        navigate('/');
      } else {
        navigate('/edu');
      }
    } else {
      toast.error('Erro ao configurar acesso: ' + result.error);
    }
  };

  const handleContinue = () => {
    if (!systemAccess) {
      toast.error('Selecione o tipo de acesso');
      return;
    }
    
    if (systemAccess === 'EDU') {
      setStep(2);
    } else {
      handleSubmit();
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
            <span className="font-display font-bold text-2xl">SISTUR</span>
          </div>
          <CardTitle className="text-2xl font-display">
            {step === 1 ? 'Bem-vindo ao SISTUR!' : 'Perfil Educacional'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? 'Escolha como deseja usar o sistema' 
              : 'Selecione seu perfil no SISTUR EDU'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 ? (
            <>
              <RadioGroup
                value={systemAccess || ''}
                onValueChange={(value) => setSystemAccess(value as SystemAccess)}
                className="grid gap-4"
              >
                <div className="relative">
                  <RadioGroupItem
                    value="ERP"
                    id="erp"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="erp"
                    className="flex flex-col gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">SISTUR ERP</p>
                        <p className="text-sm text-muted-foreground">
                          Gestão de destinos turísticos
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pl-15">
                      Diagnósticos por pilares, indicadores, monitoramento ERP, relatórios e capacitação prescrita.
                    </p>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem
                    value="EDU"
                    id="edu"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="edu"
                    className="flex flex-col gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">SISTUR EDU</p>
                        <p className="text-sm text-muted-foreground">
                          Plataforma educacional
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pl-15">
                      Cursos, trilhas de aprendizado e capacitação em turismo sustentável.
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              <Button
                onClick={handleContinue}
                disabled={!systemAccess || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair e voltar ao login
              </Button>
            </>
          ) : (
            <>
              <RadioGroup
                value={eduRole || ''}
                onValueChange={(value) => setEduRole(value as EduRole)}
                className="grid gap-4"
              >
                <div className="relative">
                  <RadioGroupItem
                    value="ESTUDANTE"
                    id="estudante"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="estudante"
                    className="flex flex-col gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Estudante</p>
                        <p className="text-sm text-muted-foreground">
                          Acesso às trilhas e cursos
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pl-15">
                      Aprenda sobre turismo sustentável através de cursos e trilhas de capacitação.
                    </p>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem
                    value="PROFESSOR"
                    id="professor"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="professor"
                    className="flex flex-col gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Professor</p>
                        <p className="text-sm text-muted-foreground">
                          Gestão de cursos e conteúdo
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pl-15">
                      Acesso ao painel de administração de cursos além das trilhas de aprendizado.
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!eduRole || submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

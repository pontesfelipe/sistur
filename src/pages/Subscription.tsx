import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle2, XCircle, Crown, Zap, Building2, AlertTriangle, Mail, GraduationCap, BookOpen, Sparkles, Ban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useLicense, type LicensePlan } from '@/contexts/LicenseContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CancelSubscriptionDialog } from '@/components/subscription/CancelSubscriptionDialog';

const EDU_PLANS: { plan: LicensePlan | string; name: string; price: string; icon: React.ReactNode; features: string[]; highlight?: boolean }[] = [
  {
    plan: 'estudante',
    name: 'Estudante',
    price: 'R$ 19/mês',
    icon: <GraduationCap className="h-6 w-6 text-sky-400" />,
    features: [
      'Acesso à plataforma EDU',
      'Trilhas de aprendizagem',
      'Jogos educacionais',
      'Certificados de conclusão',
      'Professor Beni (IA)',
      'Social Turismo',
    ],
  },
  {
    plan: 'professor',
    name: 'Professor',
    price: 'R$ 39/mês',
    icon: <BookOpen className="h-6 w-6 text-amber-400" />,
    highlight: true,
    features: [
      'Tudo do Estudante',
      'Criar e gerenciar trilhas',
      'Banco de questões e exames',
      'Painel de desempenho dos alunos',
      'Emissão de certificados',
      'Suporte prioritário',
    ],
  },
];

const ERP_PLANS: { plan: LicensePlan; name: string; price: string; icon: React.ReactNode; features: string[]; highlight?: boolean }[] = [
  {
    plan: 'basic',
    name: 'Básico',
    price: 'R$ 49/mês',
    icon: <Shield className="h-6 w-6 text-blue-400" />,
    features: [
      'Acesso ao ERP completo',
      'Plataforma EDU',
      'Jogos educacionais',
      'Relatórios básicos',
      'Suporte por email',
    ],
  },
  {
    plan: 'pro',
    name: 'Profissional',
    price: 'R$ 149/mês',
    icon: <Zap className="h-6 w-6 text-purple-400" />,
    highlight: true,
    features: [
      'Tudo do Básico',
      'Relatórios avançados',
      'Integrações (IBGE, APIs)',
      'Certificados personalizados',
      'Suporte prioritário',
      'Até 10 usuários',
    ],
  },
  {
    plan: 'enterprise',
    name: 'Empresarial',
    price: 'Sob consulta',
    icon: <Building2 className="h-6 w-6 text-emerald-400" />,
    features: [
      'Tudo do Pro',
      'Usuários ilimitados',
      'API dedicada',
      'Customização de marca',
      'Gerente de conta dedicado',
      'SLA garantido',
    ],
  },
];

export default function Subscription() {
  const { license, isTrialActive, isTrialExpired, isPaidPlan, isLicenseValid, trialDaysRemaining, trialProgress, plan, planLabel } = useLicense();
  const { refetchLicense } = useLicense();
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const isCancelled = license?.status === 'cancelled';

  const noLicense = !license;

  const handleActivateTrial = async () => {
    try {
      setActivatingTrial(true);
      const { error } = await supabase.rpc('activate_my_trial');

      if (error) throw error;

      toast.success('Trial de 7 dias ativado com sucesso!');
      await refetchLicense();
    } catch (err: any) {
      console.error('Error activating trial:', err);
      const errorMessage = String(err?.message || '');

      if (errorMessage.includes('trial_already_used')) {
        toast.error('Seu período de trial já foi utilizado.');
      } else if (errorMessage.includes('paid_license_exists')) {
        toast.error('Sua conta já possui um plano ativo.');
      } else if (errorMessage.includes('profile_not_found') || errorMessage.includes('not_authenticated')) {
        toast.error('Erro ao identificar usuário.');
      } else {
        toast.error('Erro ao ativar trial: ' + (err.message || 'Tente novamente'));
      }
    } finally {
      setActivatingTrial(false);
    }
  };

  return (
    <AppLayout title="Planos" subtitle="Gerencie seu plano e licença">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Current plan status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border-2 p-6 relative overflow-hidden',
                    isTrialActive ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/30 to-orange-950/20' :
                    isPaidPlan ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 to-teal-950/20' :
                    noLicense ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-blue-950/20' :
                    isTrialExpired ? 'border-red-500/50 bg-gradient-to-br from-red-950/30 to-rose-950/20' :
            'border-border bg-card',
          )}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isTrialActive ? (
                    <Clock className="h-6 w-6 text-amber-400" />
                  ) : isPaidPlan ? (
                    <Crown className="h-6 w-6 text-emerald-400" />
                  ) : noLicense ? (
                    <Sparkles className="h-6 w-6 text-primary" />
                  ) : isCancelled ? (
                    <Ban className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  )}
                   <h2 className="text-xl font-bold">{noLicense ? 'Bem-vindo ao SISTUR!' : planLabel}</h2>
                   {!noLicense && (
                   <span className={cn(
                     'text-xs font-bold px-2.5 py-1 rounded-full',
                     isCancelled ? 'bg-muted text-muted-foreground' :
                     isLicenseValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                   )}>
                     {isCancelled ? 'Cancelado' : isLicenseValid ? 'Ativo' : 'Inativo'}
                   </span>
                   )}
                 </div>
                 <p className="text-sm text-muted-foreground max-w-md">
                   {noLicense
                     ? 'Sua conta foi aprovada! Ative seu trial gratuito de 7 dias para explorar todas as funcionalidades ou escolha um plano abaixo.'
                     : isTrialActive
                     ? `Sua avaliação gratuita de 7 dias está ativa. Restam ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? 's' : ''} para explorar todas as funcionalidades.`
                     : isPaidPlan
                     ? `Você tem acesso completo ao plano ${planLabel}. ${license?.expires_at ? `Válido até ${new Date(license.expires_at).toLocaleDateString('pt-BR')}.` : ''}`
                     : isTrialExpired
                     ? 'Sua avaliação gratuita expirou. Escolha um plano para continuar usando o SISTUR.'
                     : 'Nenhuma licença ativa encontrada. Ative um trial ou escolha um plano.'
                  }
                </p>
              </div>

              {isTrialActive && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-3xl font-black text-amber-400 tabular-nums">{trialDaysRemaining}</p>
                  <p className="text-xs text-muted-foreground">dias restantes</p>
                </div>
              )}
            </div>

            {/* Trial progress bar */}
            {isTrialActive && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Início do trial</span>
                  <span>Fim do trial (7 dias)</span>
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      trialDaysRemaining <= 2 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                      trialDaysRemaining <= 4 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                      'bg-gradient-to-r from-emerald-500 to-teal-500',
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${trialProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Trial expired warning */}
            {isTrialExpired && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400">Período de avaliação encerrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para continuar acessando o SISTUR, escolha um plano abaixo ou entre em contato com nossa equipe comercial.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Trial activation CTA for new users */}
            {noLicense && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-primary/5 border border-primary/20 rounded-xl p-6"
              >
                <h3 className="text-base font-bold mb-2">🎉 Experimente o SISTUR gratuitamente</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Ative seu trial gratuito de <strong>7 dias</strong> e tenha acesso completo a todas as funcionalidades:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
                  <li>Plataforma EDU com trilhas e cursos</li>
                  <li>Jogos educacionais (TCG, RPG, Memória, Caça ao Tesouro)</li>
                  <li>Professor Beni (IA) e Social Turismo</li>
                  <li>ERP de diagnósticos turísticos</li>
                </ul>
                <p className="text-xs text-muted-foreground mb-4">
                  Sem compromisso — ao final dos 7 dias, escolha um plano para continuar.
                </p>
                <Button
                  size="lg"
                  onClick={handleActivateTrial}
                  disabled={activatingTrial}
                  className="gap-2 text-base px-8"
                >
                  <Sparkles className="h-5 w-5" />
                  {activatingTrial ? 'Ativando...' : 'Ativar Trial Gratuito de 7 Dias'}
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Feature access */}
        {license && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Funcionalidades do seu plano
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { key: 'erp', label: 'ERP', icon: '📊' },
                { key: 'edu', label: 'EDU', icon: '📚' },
                { key: 'games', label: 'Jogos', icon: '🎮' },
                { key: 'reports', label: 'Relatórios', icon: '📈' },
                { key: 'integrations', label: 'Integrações', icon: '🔗' },
              ].map(f => {
                const enabled = isLicenseValid && (license.plan === 'enterprise' || license.features[f.key] === true);
                return (
                  <div key={f.key} className={cn(
                    'rounded-xl border p-3 flex items-center gap-2 transition-all',
                    enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/50 bg-muted/20 opacity-50',
                  )}>
                    <span className="text-lg">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.label}</p>
                    </div>
                    {enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDU Plans */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-bold">Planos EDU</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Ideal para estudantes e professores da área de turismo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
            {EDU_PLANS.map((p, i) => {
              const isCurrentPlan = plan === p.plan && isPaidPlan;
              return (
                <motion.div
                  key={p.plan}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'relative rounded-2xl border-2 p-6 flex flex-col transition-shadow',
                    p.highlight ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-border',
                    isCurrentPlan && 'ring-2 ring-emerald-500/50',
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Recomendado
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Seu plano
                    </span>
                  )}

                  <div className="mb-4">
                    {p.icon}
                    <h4 className="text-lg font-bold mt-2">{p.name}</h4>
                    <p className="text-2xl font-black mt-1">{p.price}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline">
                      Plano atual
                    </Button>
                  ) : (
                    <Button className={cn('w-full', p.highlight && 'bg-amber-600 hover:bg-amber-700')}>
                      {isTrialActive ? 'Atualizar agora' : 'Começar'}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ERP/Organization Plans */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-bold">Planos Organizacionais</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {isTrialActive
              ? 'Atualize antes do fim do trial para não perder o acesso.'
              : 'Para gestores, analistas e organizações de turismo.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ERP_PLANS.map((p, i) => {
              const isCurrentPlan = plan === p.plan && isPaidPlan;
              return (
                <motion.div
                  key={p.plan}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'relative rounded-2xl border-2 p-6 flex flex-col transition-shadow',
                    p.highlight ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-border',
                    isCurrentPlan && 'ring-2 ring-emerald-500/50',
                  )}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Seu plano
                    </span>
                  )}

                  <div className="mb-4">
                    {p.icon}
                    <h4 className="text-lg font-bold mt-2">{p.name}</h4>
                    <p className="text-2xl font-black mt-1">{p.price}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button disabled className="w-full" variant="outline">
                      Plano atual
                    </Button>
                  ) : p.plan === 'enterprise' ? (
                    <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = 'mailto:contato@sistur.com.br?subject=Plano Enterprise'}>
                      <Mail className="h-4 w-4" /> Falar com vendas
                    </Button>
                  ) : (
                    <Button className={cn('w-full', p.highlight && 'bg-purple-600 hover:bg-purple-700')}>
                      {isTrialActive ? 'Atualizar agora' : 'Começar'}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* License details */}
        {license && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Detalhes da licença</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">ID da licença</p>
                <p className="font-mono text-xs mt-0.5">{license.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ativada em</p>
                <p className="font-medium mt-0.5">{new Date(license.activated_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Máx. usuários</p>
                <p className="font-medium mt-0.5">{license.max_users}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Última atualização</p>
                <p className="font-medium mt-0.5">{new Date(license.updated_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

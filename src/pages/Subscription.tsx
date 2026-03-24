import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle2, XCircle, Crown, Zap, Building2, AlertTriangle, Mail } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useLicense, type LicensePlan } from '@/contexts/LicenseContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import { cn } from '@/lib/utils';

const PLAN_FEATURES: { plan: LicensePlan; name: string; price: string; icon: React.ReactNode; features: string[]; highlight?: boolean }[] = [
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
  const { profile } = useProfileContext();

  return (
    <AppLayout title="Assinatura" subtitle="Gerencie seu plano e licença">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Current plan status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border-2 p-6 relative overflow-hidden',
            isTrialActive ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/30 to-orange-950/20' :
            isPaidPlan ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 to-teal-950/20' :
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
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  )}
                  <h2 className="text-xl font-bold">{planLabel}</h2>
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    isLicenseValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                  )}>
                    {isLicenseValid ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  {isTrialActive
                    ? `Sua avaliação gratuita de 7 dias está ativa. Restam ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? 's' : ''} para explorar todas as funcionalidades.`
                    : isPaidPlan
                    ? `Você tem acesso completo ao plano ${planLabel}. ${license?.expires_at ? `Válido até ${new Date(license.expires_at).toLocaleDateString('pt-BR')}.` : ''}`
                    : isTrialExpired
                    ? 'Sua avaliação gratuita expirou. Escolha um plano para continuar usando o SISTUR.'
                    : 'Nenhuma licença ativa encontrada. Entre em contato com o administrador.'
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

        {/* Pricing plans */}
        <div>
          <h3 className="text-lg font-bold mb-1">Escolha seu plano</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {isTrialActive
              ? 'Atualize antes do fim do trial para não perder o acesso.'
              : 'Selecione o plano ideal para sua organização.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLAN_FEATURES.map((p, i) => {
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

import { tx } from '@/i18n/t';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Crown, Building2, AlertTriangle, Sparkles, Ban,
  Coins, GraduationCap, HelpCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLicense } from '@/contexts/LicenseContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CancelSubscriptionDialog } from '@/components/subscription/CancelSubscriptionDialog';
import { PlanCatalog } from '@/components/subscription/PlanCatalog';
import { BeniCreditPacks } from '@/components/subscription/BeniCreditPacks';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { getStripeEnvironment, isPaymentsConfigured } from '@/lib/stripe';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useTrialState } from '@/hooks/useTrialState';
import { useBeniQuota } from '@/hooks/useBeniQuota';

const FEATURE_GRID: { key: string; label: string; icon: string }[] = [
  { key: 'erp', label: tx('Analítico territorial'), icon: '📊' },
  { key: 'enterprise', label: tx('Diagnóstico empresarial'), icon: '🏨' },
  { key: 'edu', label: tx('EDU'), icon: '📚' },
  { key: 'projects', label: tx('Projetos'), icon: '🗂️' },
  { key: 'reports', label: tx('Relatórios'), icon: '📈' },
  { key: 'observatory', label: tx('Observatório'), icon: '🛰️' },
  { key: 'consortia', label: tx('Consórcios'), icon: '🤝' },
  { key: 'beni', label: tx('Professor Beni'), icon: '🤖' },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'O plano Empresarial tem limite de usuários?',
    a: 'Não. Ele começa com 5 usuários e cresce conforme a necessidade: cada usuário adicional é cobrado pelo mesmo valor por usuário/mês. Você ajusta a quantidade a qualquer momento no checkout ou em Gerenciar conta.',
  },
  {
    q: 'Como funciona o período de avaliação?',
    a: 'A avaliação é por uso, sem prazo: cada nova conta tem o curso base do SISTUR EDU e 10 perguntas ao Professor Beni; cada nova organização tem 1 diagnóstico com resultado em prévia. Depois disso, basta escolher um plano para liberar tudo.',
  },
  {
    q: 'E se a renovação não for paga?',
    a: 'Se a cobrança mensal do cartão for recusada, o acesso aos recursos do plano é suspenso até o pagamento ser regularizado em Gerenciar conta.',
  },
  {
    q: 'Posso trocar de plano depois?',
    a: 'Sim. A troca é imediata e o valor é ajustado proporcionalmente na próxima fatura.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'Assinaturas mensais: cartão de crédito, com renovação automática. Créditos avulsos do Professor Beni: cartão ou Pix. Valores em reais (BRL); faturas ficam em Gerenciar conta.',
  },
];

export default function Subscription() {
  const { license, isPaidPlan, isLicenseValid, planLabel, refetchLicense } = useLicense();
  const { entitlements } = useEntitlements();
  const { userTrialing, orgTrialing, trainingConsumed, assessmentUsed, hasSubscription } = useTrialState();
  const { unlimited: beniUnlimited, remaining: beniRemaining, allowance: beniAllowance, totalCredits: beniCredits } = useBeniQuota();

  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const isCancelled = license?.status === 'cancelled';
  const inTrial = !hasSubscription && (userTrialing || orgTrialing);

  const paymentsReady = isPaymentsConfigured();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const [checkoutTitle, setCheckoutTitle] = useState('');
  const [openingPortal, setOpeningPortal] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  /**
   * Assinatura de plano: se o usuário já tem assinatura ativa neste ambiente,
   * troca o preço com pro-rata imediato (change-plan); caso contrário abre o
   * checkout embutido para uma nova assinatura.
   */
  const handleSubscribePlan = async (name: string, priceId: string, quantity: number) => {
    try {
      setChangingPlan(true);
      const environment = getStripeEnvironment();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login para assinar');

      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('price_id, stripe_subscription_id, quantity')
        .eq('user_id', user.id)
        .eq('environment', environment)
        .in('status', ['active', 'trialing', 'past_due'])
        .not('stripe_subscription_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const samePrice = activeSub?.price_id === priceId;
      const qtyChanged = samePrice && quantity > 1 && quantity !== (activeSub as any)?.quantity;
      if (activeSub?.stripe_subscription_id && (!samePrice || qtyChanged)) {
        const { error } = await supabase.functions.invoke('change-plan', {
          body: { priceId, environment, quantity },
        });
        if (error) {
          const ctx = (error as any)?.context;
          const body = ctx instanceof Response ? await ctx.clone().json().catch(() => null) : null;
          throw new Error(body?.error || 'Não foi possível alterar o plano');
        }
        toast.success(qtyChanged
          ? `Quantidade de usuários alterada para ${quantity}. O valor é ajustado proporcionalmente.`
          : `Plano alterado para ${name}. O valor é ajustado proporcionalmente na próxima fatura.`);
        setTimeout(() => { queryClient.invalidateQueries(); refetchLicense(); }, 4000);
        return;
      }
      if (samePrice) {
        toast.info(tx("Você já está neste plano com essa quantidade de usuários."));
        return;
      }

      setCheckoutTitle(quantity > 1 ? `${name} — ${quantity} usuários` : name);
      openCheckout({ priceId, quantity });
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível processar a assinatura');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setOpeningPortal(true);
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });

      // functions.invoke devolve apenas "non-2xx status code"; o motivo real
      // vem no corpo da resposta, então lemos antes de mostrar ao usuário.
      if (error) {
        let message = '';
        let status = 0;
        const ctx = (error as any)?.context;
        if (ctx instanceof Response) {
          status = ctx.status;
          const body = await ctx.clone().json().catch(() => null);
          message = body?.error || '';
        }
        if (status === 404 || /assinatura online/i.test(message)) {
          toast.info(tx("Você ainda não tem uma assinatura online ativa. Escolha um plano para começar."));
          return;
        }
        if (status === 401) {
          toast.error(tx("Sua sessão expirou. Entre novamente para gerenciar a conta."));
          return;
        }
        throw new Error(message || 'Não foi possível abrir o gerenciamento da conta');
      }

      if (!data?.url) throw new Error('Não foi possível abrir o gerenciamento da conta');
      window.open(data.url as string, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível abrir o gerenciamento da conta');
    } finally {
      setOpeningPortal(false);
    }
  };


  const statusLabel = isCancelled ? 'Cancelado' : hasSubscription || isPaidPlan ? 'Ativo' : inTrial ? 'Avaliação' : 'Sem plano';
  const headline = hasSubscription || isPaidPlan
    ? planLabel
    : inTrial ? 'Avaliação por uso' : 'Nenhum plano ativo';

  return (
    <AppLayout title={tx("Planos e assinatura")} subtitle={tx("Escolha o plano certo e gerencie sua contratação")}>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Situação atual */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border p-6 relative overflow-hidden shadow-sm',
            isCancelled ? 'border-border bg-muted/30'
              : hasSubscription || isPaidPlan ? 'border-emerald-500/40 bg-emerald-500/5'
              : inTrial ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-primary/40 bg-primary/5',
          )}
        >
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full blur-3xl opacity-40',
              isCancelled ? 'bg-muted-foreground/10'
                : hasSubscription || isPaidPlan ? 'bg-emerald-500/20'
                : inTrial ? 'bg-amber-500/20'
                : 'bg-primary/20',
            )}
          />
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {isCancelled ? <Ban className="h-6 w-6 text-muted-foreground" />
                  : hasSubscription || isPaidPlan ? <Crown className="h-6 w-6 text-emerald-400" />
                  : inTrial ? <Sparkles className="h-6 w-6 text-amber-400" />
                  : <AlertTriangle className="h-6 w-6 text-primary" />}
                <h2 className="text-xl font-bold">{headline}</h2>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  isCancelled ? 'bg-muted text-muted-foreground'
                    : hasSubscription || isPaidPlan ? 'bg-emerald-500/20 text-emerald-400'
                    : inTrial ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-primary/20 text-primary',
                )}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {isCancelled
                  ? `Seu plano ${planLabel} foi cancelado.${license?.expires_at ? ` O acesso segue até ${new Date(license.expires_at).toLocaleDateString('pt-BR')}.` : ''} Escolha um novo plano abaixo.`
                  : hasSubscription || isPaidPlan
                  ? 'Sua assinatura está ativa. Use Gerenciar conta para ajustar usuários, forma de pagamento e faturas.'
                  : inTrial
                  ? 'Você está na avaliação por uso: sem prazo, liberada até você consumir os itens de cortesia abaixo.'
                  : 'Escolha um dos planos abaixo para liberar os módulos do SISTUR.'}
              </p>
            </div>

            {(hasSubscription || isPaidPlan) && !isCancelled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-muted-foreground hover:text-destructive gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" /> {tx("Cancelar plano")}
              </Button>
            )}
          </div>

          {inTrial && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TrialItem
                icon={<GraduationCap className="h-4 w-4" />}
                label={tx("Curso base do EDU")}
                done={trainingConsumed}
                doneText="Concluído — trilhas completas exigem plano"
                openText="Disponível na sua avaliação"
              />
              <TrialItem
                icon={<Building2 className="h-4 w-4" />}
                label={tx("1 diagnóstico")}
                done={assessmentUsed}
                doneText="Utilizado — resultados em prévia"
                openText="Ainda disponível"
              />
              <TrialItem
                icon={<Coins className="h-4 w-4" />}
                label={tx("Professor Beni")}
                done={beniRemaining + beniCredits <= 0 && !beniUnlimited}
                doneText="Perguntas de cortesia esgotadas"
                openText={`${beniRemaining + beniCredits} pergunta(s) restante(s)`}
              />
            </div>
          )}
        </motion.section>

        <CancelSubscriptionDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          planLabel={planLabel}
          expiresAt={license?.expires_at || null}
          isTrial={false}
          onCancelled={() => refetchLicense()}
        />

        {/* Módulos liberados */}
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {tx("Módulos liberados na sua conta")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {FEATURE_GRID.map(f => {
              const enabled = entitlements.features?.[f.key] === true;
              return (
                <div key={f.key} className={cn(
                  'rounded-xl border p-3 flex items-center gap-2.5 transition-all',
                  enabled
                    ? 'border-emerald-500/30 bg-emerald-500/5 shadow-sm'
                    : 'border-dashed border-border bg-muted/20 text-muted-foreground',
                )}>
                  <span className={cn('text-lg', !enabled && 'grayscale opacity-60')}>{f.icon}</span>
                  <p className="text-xs font-medium flex-1 min-w-0 truncate">{f.label}</p>
                  {enabled
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-muted-foreground/60 shrink-0" />}
                </div>
              );
            })}
          </div>
          {!isLicenseValid && !hasSubscription && (
            <p className="text-xs text-muted-foreground mt-3">
              {tx("Módulos bloqueados são liberados imediatamente após a contratação.")}
            </p>
          )}
        </section>

        {paymentsReady && <PaymentTestModeBanner />}

        {/* Catálogo oficial (única fonte de preços) */}
        <PlanCatalog
          onCheckout={paymentsReady && !changingPlan
            ? ({ name, priceId, quantity }) => { void handleSubscribePlan(name, priceId, quantity); }
            : undefined}
        />

        {paymentsReady && (
          <BeniCreditPacks
            onBuy={(pack) => {
              setCheckoutTitle(`Pacote Beni — ${pack.name}`);
              openCheckout({ priceId: pack.priceId });
            }}
          />
        )}

        {paymentsReady && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium">{tx("Gerenciar conta")}</p>
              <p className="text-xs text-muted-foreground">
                {tx("Ajuste a quantidade de usuários, atualize o pagamento e baixe faturas.")}
              </p>
            </div>
            <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
              {openingPortal ? 'Abrindo...' : 'Gerenciar conta'}
            </Button>
          </div>
        )}

        {/* Perguntas frequentes */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">{tx("Perguntas frequentes")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ.map(item => (
              <div key={item.q} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-1.5">{item.q}</p>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Precisa de uma proposta institucional, nota de empenho ou volume acima de 100 usuários?{' '}
            <a className="underline" href="mailto:contato@sistur.com.br?subject=Proposta%20SISTUR">
              {tx("Fale com o time comercial")}
            </a>.
          </p>
        </section>

        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeCheckout(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{checkoutTitle || 'Finalizar contratação'}</DialogTitle>
            </DialogHeader>
            {checkoutElement}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function TrialItem({ icon, label, done, doneText, openText }: {
  icon: React.ReactNode; label: string; done: boolean; doneText: string; openText: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-semibold">{label}</p>
        <Badge variant={done ? 'secondary' : 'outline'} className="ml-auto text-[10px]">
          {done ? 'Consumido' : 'Disponível'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{done ? doneText : openText}</p>
    </div>
  );
}

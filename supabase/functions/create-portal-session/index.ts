import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeEnv, createStripeClient } from '../_shared/stripe.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PLAN_PRICE_IDS = ['estudante_mensal', 'empresarial_mensal'];

/**
 * Configuração do portal do cliente: método de pagamento, cancelamento ao
 * fim do ciclo e troca de plano (upgrade/downgrade com pro-rata) self-service.
 * Reutiliza a configuração ativa existente (metadata.app = 'sistur').
 */
async function resolvePortalConfiguration(
  stripe: ReturnType<typeof createStripeClient>,
): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 20 });
  const found = existing.data.find((c: any) => c.metadata?.app === 'sistur');
  if (found) return found.id;

  const prices = await stripe.prices.list({ lookup_keys: PLAN_PRICE_IDS, limit: 10 });
  const productIds = [...new Set(prices.data.map((p: any) =>
    typeof p.product === 'string' ? p.product : p.product?.id,
  ).filter(Boolean))] as string[];

  const products = prices.data
    .filter((p: any) => p.type === 'recurring')
    .map((p: any) => ({
      product: typeof p.product === 'string' ? p.product : p.product.id,
      prices: [p.id],
    }));

  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'SISTUR — Gerencie sua assinatura' },
    metadata: { app: 'sistur', productIds: productIds.join(',') },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'name', 'tax_id'] },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products,
      },
    },
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const environment: StripeEnv = body?.environment === 'live' ? 'live' : 'sandbox';
    const returnUrl: string | undefined = body?.returnUrl;

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token ?? '');
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', authData.user.id)
      .eq('environment', environment)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Nenhuma assinatura online encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = createStripeClient(environment);
    const configuration = await resolvePortalConfiguration(stripe);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      configuration,
      ...(returnUrl && { return_url: returnUrl }),
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('create-portal-session error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeEnv, verifyWebhook } from '../_shared/stripe.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

/** Pacotes de créditos do Professor Beni (compra avulsa). */
const BENI_PACKS: Record<string, { amount: number; source: string; org: boolean }> = {
  beni_pack_50: { amount: 50, source: 'pack_50', org: false },
  beni_pack_150: { amount: 150, source: 'pack_150', org: false },
  beni_pack_org_500: { amount: 500, source: 'pack_org_500', org: true },
};

function priceIdOf(item: any): string | null {
  return item?.price?.lookup_key
    ?? item?.price?.metadata?.lovable_external_id
    ?? item?.price?.id
    ?? null;
}

async function planIdFromPrice(priceId: string | null): Promise<string | null> {
  if (!priceId) return null;
  const { data } = await db()
    .from('plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId ?? null;
  const orgId = subscription.metadata?.orgId || null;
  const item = subscription.items?.data?.[0];
  const priceId = priceIdOf(item);
  const planId = await planIdFromPrice(priceId);
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  if (!userId || !planId) {
    console.error('subscription sem userId ou plano mapeado', { userId, priceId });
    return;
  }

  const row = {
    user_id: userId,
    org_id: orgId,
    plan_id: planId,
    price_id: priceId,
    status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    source: 'stripe',
    provider_ref: subscription.id,
    environment: env,
    updated_at: new Date().toISOString(),
  };

  await db().from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' });

  // Conversão do trial por consumo
  await db().rpc('admin_convert_trial', {
    _subject_id: orgId || userId,
    _subject_kind: orgId ? 'org' : 'user',
    _notes: `Assinatura ${subscription.id}`,
  }).catch?.(() => undefined);
}

async function cancelSubscription(subscription: any, env: StripeEnv) {
  await db()
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
}

async function grantBeniPack(session: any, env: StripeEnv) {
  const priceId: string | null = session.metadata?.priceId ?? null;
  const pack = priceId ? BENI_PACKS[priceId] : null;
  if (!pack) return;

  const userId = session.metadata?.userId ?? null;
  const orgId = session.metadata?.orgId || null;
  if (!userId) return;

  const quantity = 1;
  await db().from('beni_credits').insert({
    user_id: pack.org ? null : userId,
    org_id: pack.org ? orgId : null,
    balance: pack.amount * quantity,
    source: pack.source,
  });
  console.log('créditos Beni concedidos', { userId, orgId, priceId, env });
}

async function handleEvent(event: any, env: StripeEnv) {
  await db().from('payment_events').insert({
    event_id: event.id ?? null,
    event_type: event.type,
    environment: env,
    user_id: event.data?.object?.metadata?.userId ?? null,
    price_id: event.data?.object?.metadata?.priceId ?? null,
    payload: event.data?.object ?? null,
  });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertSubscription(event.data.object, env);
      break;
    case 'customer.subscription.deleted':
      await cancelSubscription(event.data.object, env);
      break;
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.payment_status !== 'unpaid' && session.mode === 'payment') {
        await grantBeniPack(session, env);
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded':
      await grantBeniPack(event.data.object, env);
      break;
    default:
      console.log('Evento não tratado:', event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get('env');
  if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
    return new Response(JSON.stringify({ received: true, ignored: 'invalid env' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const event = await verifyWebhook(req, rawEnv);
    await handleEvent(event, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeEnv, createStripeClient } from '../_shared/stripe.ts';

// Troca de plano (upgrade/downgrade) com pro-rata imediato:
// atualiza o item da assinatura Stripe existente para o novo preço com
// proration_behavior 'create_prorations'. O webhook
// customer.subscription.updated sincroniza a tabela `subscriptions`.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const priceId: string = body?.priceId;
    const quantity: number | null = body?.quantity ? Math.min(Math.max(Math.floor(Number(body.quantity)) || 1, 1), 100) : null;
    const environment: StripeEnv = body?.environment === 'live' ? 'live' : 'sandbox';

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: 'priceId inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token ?? '');
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = authData.user;

    // Assinatura Stripe ativa do usuário neste ambiente
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, price_id, quantity, org_id')
      .eq('user_id', user.id)
      .eq('environment', environment)
      .in('status', ['active', 'trialing', 'past_due'])
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'Nenhuma assinatura ativa para trocar' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (sub.price_id === priceId && (!quantity || quantity === sub.quantity)) {
      return new Response(JSON.stringify({ error: 'Você já está neste plano' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = createStripeClient(environment);
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length || prices.data[0].type !== 'recurring') {
      return new Response(JSON.stringify({ error: 'Plano não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Plano por usuário: respeita mínimo e não permite reduzir abaixo dos usuários já na organização
    const { data: plan } = await supabase.from('plans').select('seat_based, min_seats').or(`stripe_price_id.eq.${priceId},stripe_price_id_annual.eq.${priceId}`).maybeSingle();
    let newQty = 1;
    if ((plan as any)?.seat_based) {
      newQty = Math.max(quantity ?? sub.quantity ?? 1, (plan as any).min_seats ?? 1);
      if (sub.org_id) {
        const { count } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('org_id', sub.org_id);
        if ((count ?? 0) > newQty) {
          return new Response(JSON.stringify({ error: `A organização já tem ${count} usuários. Escolha pelo menos ${count}.` }), {
            status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSub.items?.data?.[0]?.id;
    if (!itemId) throw new Error('Item da assinatura não encontrado');

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: prices.data[0].id, quantity: newQty }],
      proration_behavior: 'create_prorations',
      metadata: { userId: user.id, priceId, orgId: sub.org_id ?? '' },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('change-plan error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

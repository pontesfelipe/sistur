import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorResult {
  name: string;
  location?: string;
  rating?: number;
  review_volume?: number;
  source_url?: string;
  source_name?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { destination_id, business_name, location, property_type, limit = 5 } = body;

    if (!destination_id || !business_name || !location) {
      return new Response(JSON.stringify({ error: 'destination_id, business_name and location are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Fonte de dados externa indisponível: Concorrentes (busca pública na web). A coleta automática não está ativa — preencha manualmente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typeLabel = property_type || 'hotel pousada resort';
    const queries = [
      `melhores ${typeLabel} em ${location} -"${business_name}" site:booking.com avaliações nota`,
      `melhores ${typeLabel} em ${location} -"${business_name}" site:tripadvisor.com.br OR site:tripadvisor.com reviews`,
      `top ${typeLabel} ${location} -"${business_name}" google maps reviews`,
    ];

    const searchResponses = await Promise.allSettled(
      queries.map((q) =>
        fetch('https://api.firecrawl.dev/v2/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: q, limit: 5, country: 'br', lang: 'pt' }),
        }).then((r) => r.json()),
      ),
    );

    const competitors: CompetitorResult[] = [];
    const seenNames = new Set<string>();
    const ownNameLower = business_name.toLowerCase();

    for (const res of searchResponses) {
      if (res.status !== 'fulfilled') continue;
      const data = res.value;
      const items = data?.data?.web || data?.web || data?.data || [];
      for (const item of items) {
        const title: string = item.title || '';
        const url: string = item.url || '';
        const desc: string = item.description || item.snippet || '';
        if (!title) continue;

        // Extract competitor name (first part before " - " or " | ")
        let name = title.split(/[-|·]/)[0].trim().substring(0, 120);
        if (!name || name.length < 3) continue;

        const nameLower = name.toLowerCase();
        if (nameLower.includes(ownNameLower) || ownNameLower.includes(nameLower)) continue;
        if (seenNames.has(nameLower)) continue;

        // Extract rating like "4.5", "8,5", "4.5 de 5"
        const ratingMatch = (title + ' ' + desc).match(/(\d[.,]\d)\s*(?:de\s*\d|\/\s*\d|estrelas?|★)?/i);
        let rating: number | undefined;
        if (ratingMatch) {
          const raw = parseFloat(ratingMatch[1].replace(',', '.'));
          if (raw <= 5) rating = Number((raw * 2).toFixed(2)); // normalize to 0-10
          else if (raw <= 10) rating = Number(raw.toFixed(2));
        }

        // Extract review volume
        const volMatch = (title + ' ' + desc).match(/(\d{1,3}(?:[.,]\d{3})*)\s*(?:avalia[çc][ãa]o|review|coment[áa]rio)/i);
        let review_volume: number | undefined;
        if (volMatch) {
          review_volume = parseInt(volMatch[1].replace(/[.,]/g, ''), 10) || undefined;
        }

        const sourceName = url.includes('booking.com') ? 'Booking'
          : url.includes('tripadvisor') ? 'TripAdvisor'
          : url.includes('google.com') ? 'Google'
          : 'Web';

        competitors.push({
          name,
          location,
          rating,
          review_volume,
          source_url: url,
          source_name: sourceName,
          notes: desc.substring(0, 240),
        });
        seenNames.add(nameLower);

        if (competitors.length >= Number(limit)) break;
      }
      if (competitors.length >= Number(limit)) break;
    }

    // Persist competitors (replace previous capture set)
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'User has no organization' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete previous auto-captured (keep manual)
    await supabase.from('enterprise_competitors')
      .delete()
      .eq('destination_id', destination_id)
      .eq('is_manual', false);

    if (competitors.length > 0) {
      const rows = competitors.map((c) => ({
        org_id: orgId,
        destination_id,
        name: c.name,
        location: c.location ?? null,
        property_type: property_type ?? null,
        rating: c.rating ?? null,
        review_volume: c.review_volume ?? null,
        source_url: c.source_url ?? null,
        source_name: c.source_name ?? null,
        notes: c.notes ?? null,
        is_manual: false,
        created_by: user.id,
      }));
      const { error: insErr } = await supabase.from('enterprise_competitors').insert(rows);
      if (insErr) console.error('Insert competitors error:', insErr);
    }

    return new Response(JSON.stringify({ success: true, count: competitors.length, competitors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('search-competitors error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

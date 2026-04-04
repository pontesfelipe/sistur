import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { businessName, location, propertyType } = await req.json();

    if (!businessName || !location) {
      return new Response(JSON.stringify({ error: 'businessName and location are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const searchQuery = `${businessName} ${location} ${propertyType || 'hotel'} reviews avaliações`;

    // Search for reviews across multiple sources in parallel
    const [googleResults, tripAdvisorResults, generalResults] = await Promise.allSettled([
      searchFirecrawl(firecrawlKey, `${businessName} ${location} site:google.com/maps OR site:google.com reviews rating`, 5),
      searchFirecrawl(firecrawlKey, `${businessName} ${location} site:tripadvisor.com OR site:tripadvisor.com.br reviews`, 5),
      searchFirecrawl(firecrawlKey, `${businessName} ${location} reviews avaliações rating booking.com OR expedia OR decolar`, 5),
    ]);

    // Also try to scrape the business directly on Google
    let googleMapsData = null;
    try {
      const mapsSearch = await searchFirecrawl(firecrawlKey, `${businessName} ${location} google maps reviews nota`, 3);
      if (mapsSearch?.data?.length > 0) {
        googleMapsData = mapsSearch.data;
      }
    } catch (e) {
      console.error('Google Maps search error:', e);
    }

    // Process results
    const allResults = {
      google: googleResults.status === 'fulfilled' ? googleResults.value : null,
      tripAdvisor: tripAdvisorResults.status === 'fulfilled' ? tripAdvisorResults.value : null,
      general: generalResults.status === 'fulfilled' ? generalResults.value : null,
      googleMaps: googleMapsData,
    };

    // Extract review scores and insights using AI
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    let analysis = null;

    if (lovableKey) {
      const allContent = [
        ...(allResults.google?.data || []).map((r: any) => `[Google] ${r.title}: ${r.description || ''}`),
        ...(allResults.tripAdvisor?.data || []).map((r: any) => `[TripAdvisor] ${r.title}: ${r.description || ''}`),
        ...(allResults.general?.data || []).map((r: any) => `[Web] ${r.title}: ${r.description || ''}`),
        ...(allResults.googleMaps || []).map((r: any) => `[Maps] ${r.title}: ${r.description || ''}`),
      ].join('\n');

      if (allContent.trim()) {
        try {
          const aiResponse = await fetch('https://ai.lovable.dev/api/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `Você é um analista de reputação digital para o setor de hospitalidade. Analise os resultados de busca e extraia informações sobre avaliações online do estabelecimento.

Retorne APENAS um JSON válido com esta estrutura:
{
  "review_score": number | null, // Nota média encontrada (escala 1-5), null se não encontrada
  "review_count": number | null, // Quantidade de reviews encontrados
  "digital_maturity": number | null, // Score 1-5 de maturidade digital baseado na presença online
  "platforms_found": string[], // Plataformas onde o negócio foi encontrado
  "sentiment_summary": string, // Resumo do sentimento geral dos reviews
  "strengths": string[], // Pontos fortes mencionados
  "weaknesses": string[], // Pontos fracos mencionados
  "recommendation": string, // Recomendação para melhorar presença online
  "sources": { "platform": string, "url": string, "rating": number | null }[]
}`
                },
                {
                  role: 'user',
                  content: `Analise os seguintes resultados de busca para "${businessName}" em "${location}":\n\n${allContent}`
                }
              ],
              response_format: { type: 'json_object' },
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;
            if (content) {
              analysis = JSON.parse(content);
            }
          }
        } catch (e) {
          console.error('AI analysis error:', e);
        }
      }
    }

    const response = {
      success: true,
      businessName,
      location,
      searchResults: {
        google: allResults.google?.data?.length || 0,
        tripAdvisor: allResults.tripAdvisor?.data?.length || 0,
        general: allResults.general?.data?.length || 0,
      },
      analysis,
      rawResults: allResults,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function searchFirecrawl(apiKey: string, query: string, limit: number) {
  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl search failed [${response.status}]: ${errText}`);
  }

  return response.json();
}

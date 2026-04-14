const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Search for reviews across multiple sources - request scrapeOptions to get full content/comments
    const scrapeOpts = { formats: ['markdown'] };
    const [googleResults, tripAdvisorResults, generalResults] = await Promise.allSettled([
      searchFirecrawl(firecrawlKey, `${businessName} ${location} site:google.com/maps OR site:google.com reviews rating`, 5, scrapeOpts),
      searchFirecrawl(firecrawlKey, `${businessName} ${location} site:tripadvisor.com OR site:tripadvisor.com.br reviews avaliações`, 5, scrapeOpts),
      searchFirecrawl(firecrawlKey, `${businessName} ${location} reviews avaliações rating booking.com OR expedia OR decolar`, 5, scrapeOpts),
    ]);

    // Also try to scrape the business directly on Google
    let googleMapsData = null;
    try {
      const mapsSearch = await searchFirecrawl(firecrawlKey, `${businessName} ${location} google maps reviews nota comentários`, 3, scrapeOpts);
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
      // Include full scraped markdown content (comments/reviews text) when available, truncated to avoid token limits
      const extractContent = (r: any, source: string) => {
        const desc = r.description || '';
        const md = r.markdown ? r.markdown.slice(0, 3000) : '';
        return `[${source}] ${r.title || ''}\nDescrição: ${desc}\nConteúdo: ${md}`;
      };
      const allContent = [
        ...(allResults.google?.data || []).map((r: any) => extractContent(r, 'Google')),
        ...(allResults.tripAdvisor?.data || []).map((r: any) => extractContent(r, 'TripAdvisor')),
        ...(allResults.general?.data || []).map((r: any) => extractContent(r, 'Web')),
        ...(allResults.googleMaps || []).map((r: any) => extractContent(r, 'Maps')),
      ].join('\n---\n');
      if (allContent.trim()) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                   content: `Você é um analista sênior de reputação digital e experiência do hóspede para o setor de hospitalidade. Analise TODOS os resultados de busca — incluindo o texto completo dos comentários e avaliações — e extraia uma análise profunda da reputação do estabelecimento.

Preste atenção especial a:
- Comentários textuais dos hóspedes (sentimentos, emoções, experiências relatadas)
- Padrões recorrentes nos elogios e reclamações
- Aspectos operacionais mencionados (limpeza, atendimento, infraestrutura, gastronomia, localização, custo-benefício)
- Tom emocional predominante (encantamento, satisfação, frustração, decepção)
- Informações sobre o estabelecimento: categoria de estrelas, tipo (hotel, pousada, resort), porte

Retorne APENAS um JSON válido com esta estrutura:
{
  "review_score": number | null, // Nota média encontrada (escala 1-5), null se não encontrada
  "review_count": number | null, // Quantidade de reviews encontrados
  "digital_maturity": number | null, // Score 1-5 de maturidade digital baseado na presença online
  "platforms_found": string[], // Plataformas onde o negócio foi encontrado
  "sentiment_summary": string, // Resumo detalhado do sentimento geral baseado nos COMENTÁRIOS (não só notas)
  "sentiment_score": number | null, // Score de sentimento de 1-5 baseado na análise dos textos dos comentários
  "property_metadata": {
    "star_rating": number | null, // Categoria oficial de estrelas (1-5) se mencionada nos resultados
    "property_type": string | null, // Tipo: "hotel", "resort", "pousada", "hostel", "apart_hotel", "flat", "camping" ou null
    "room_count": number | null, // Número de quartos/UHs se mencionado
    "employee_count": number | null // Número de funcionários se mencionado
  },
  "guest_experience_dimensions": {
    "atendimento": number | null, // 1-5 baseado nos comentários sobre atendimento/staff
    "limpeza": number | null, // 1-5 baseado nos comentários sobre limpeza/higiene
    "infraestrutura": number | null, // 1-5 baseado nos comentários sobre instalações/estrutura
    "gastronomia": number | null, // 1-5 baseado nos comentários sobre alimentação/café
    "localizacao": number | null, // 1-5 baseado nos comentários sobre localização/acesso
    "custo_beneficio": number | null // 1-5 baseado nos comentários sobre valor percebido
  },
  "recurring_themes": string[], // Temas/assuntos mais mencionados nos comentários
  "strengths": string[], // Pontos fortes extraídos dos COMENTÁRIOS
  "weaknesses": string[], // Pontos fracos extraídos dos COMENTÁRIOS
  "sample_positive_quotes": string[], // 2-3 trechos representativos de comentários positivos
  "sample_negative_quotes": string[], // 2-3 trechos representativos de comentários negativos
  "recommendation": string, // Recomendação estratégica para melhorar reputação e experiência
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

async function searchFirecrawl(apiKey: string, query: string, limit: number, scrapeOptions?: any) {
  const body: any = { query, limit };
  if (scrapeOptions) {
    body.scrapeOptions = scrapeOptions;
  }

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl search failed [${response.status}]: ${errText}`);
  }

  return response.json();
}

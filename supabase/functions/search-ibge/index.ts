import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IBGEMunicipio {
  id: number;
  nome: string;
  microrregiao: {
    id: number;
    nome: string;
    mesorregiao: {
      id: number;
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, uf } = await req.json();

    if (!name || name.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching IBGE for: ${name}, UF: ${uf || 'all'}`);

    // Fetch municipalities from IBGE API
    let url = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';
    if (uf) {
      url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`IBGE API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar API do IBGE' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const municipios: IBGEMunicipio[] = await response.json();
    
    // Normalize search term
    const searchNormalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Filter and map results
    const results = municipios
      .filter((m) => {
        const nomeNormalized = m.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return nomeNormalized.includes(searchNormalized);
      })
      .slice(0, 10) // Limit to 10 results
      .map((m) => ({
        ibge_code: m.id.toString(),
        name: m.nome,
        uf: uf || m.microrregiao?.mesorregiao?.UF?.sigla || '',
        uf_name: m.microrregiao?.mesorregiao?.UF?.nome || '',
      }));

    console.log(`Found ${results.length} municipalities`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching IBGE:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao buscar município' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

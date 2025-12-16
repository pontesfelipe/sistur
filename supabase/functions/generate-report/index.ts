import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, destinationName, pillarScores, issues } = await req.json();
    
    console.log('Generating report for:', destinationName);
    console.log('Assessment ID:', assessmentId);
    console.log('Pillar scores:', pillarScores);
    console.log('Issues count:', issues?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em planejamento e desenvolvimento turístico no Brasil. 
Sua tarefa é gerar um plano de desenvolvimento turístico detalhado e personalizado para um destino específico baseado em dados de diagnóstico.

O relatório deve ser em português brasileiro e seguir esta estrutura:
1. **Resumo Executivo**: Visão geral do destino e situação atual
2. **Análise dos Pilares**: 
   - RA (Recursos e Atrativos): Análise dos recursos naturais e culturais
   - OE (Oferta e Equipamentos): Análise da infraestrutura turística
   - AO (Ambiente Organizacional): Análise da gestão e governança
3. **Diagnóstico de Problemas**: Principais desafios identificados
4. **Plano de Ação**: Ações prioritárias com prazos sugeridos (curto, médio e longo prazo)
5. **Recomendações de Capacitação**: Áreas onde o destino precisa desenvolver competências
6. **Indicadores de Sucesso**: Métricas para acompanhar o progresso

Seja específico, prático e considere a realidade brasileira. Use formatação markdown para estruturar o relatório.`;

    const userPrompt = `Gere um plano de desenvolvimento turístico para o destino: ${destinationName}

Dados do diagnóstico:
- Score do Pilar RA (Recursos e Atrativos): ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'Não calculado'} - Severidade: ${pillarScores?.RA?.severity || 'N/A'}
- Score do Pilar OE (Oferta e Equipamentos): ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'Não calculado'} - Severidade: ${pillarScores?.OE?.severity || 'N/A'}
- Score do Pilar AO (Ambiente Organizacional): ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'Não calculado'} - Severidade: ${pillarScores?.AO?.severity || 'N/A'}

Problemas identificados:
${issues?.length > 0 ? issues.map((issue: any) => `- [${issue.severity}] ${issue.title} (Pilar: ${issue.pillar}, Tema: ${issue.theme})`).join('\n') : 'Nenhum problema identificado ainda.'}

Por favor, gere um relatório completo e detalhado considerando esses dados.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro ao gerar relatório com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Streaming response from AI gateway');
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in generate-report function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

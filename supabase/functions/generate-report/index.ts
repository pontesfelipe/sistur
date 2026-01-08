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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Invalid JWT token:', claimsError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { assessmentId, destinationName, pillarScores, issues, prescriptions } = await req.json();
    
    // Verify user has access to this assessment via their org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', userId)
      .single();
    
    if (!profile) {
      console.error('User profile not found');
      return new Response(JSON.stringify({ error: 'Perfil de usuário não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: assessment } = await supabase
      .from('assessments')
      .select('org_id')
      .eq('id', assessmentId)
      .single();
    
    if (!assessment || assessment.org_id !== profile.org_id) {
      console.error('User does not have access to this assessment');
      return new Response(JSON.stringify({ error: 'Acesso negado a este diagnóstico' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating SISTUR report for:', destinationName);
    console.log('Assessment ID:', assessmentId);
    console.log('Pillar scores:', pillarScores);
    console.log('Issues count:', issues?.length || 0);
    console.log('Prescriptions count:', prescriptions?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em inteligência territorial e desenvolvimento turístico no Brasil, utilizando a metodologia SISTUR.

O SISTUR opera como uma infraestrutura de inteligência territorial que transforma indicadores públicos em decisões estratégicas e capacitação aplicada, fechando o ciclo entre diagnóstico, ação e resultado.

PRINCÍPIOS FUNDAMENTAIS DO SISTUR:
- Transparência: Todos os dados, fontes e cálculos são rastreáveis
- Sem rankings: Avaliação individual — nunca comparativa ou competitiva
- Determinístico: Status e prescrições são calculados automaticamente por regras
- Ciclo fechado: Diagnóstico → Ação → Monitoramento → Melhoria

OS TRÊS PILARES (Taxonomia Fixa):
1. RA — Relações Ambientais: Contexto territorial, sociedade, meio ambiente, dados demográficos e segurança pública
2. AO — Ações Operacionais: Governança pública, planejamento, orçamento e capacidade de tomada de decisão
3. OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, produtos e entrega ao visitante

CLASSIFICAÇÃO DE STATUS (automático e imutável):
- ADEQUADO (BOM): Score ≥ 0.67 (67%)
- ATENÇÃO (MODERADO): 0.34 ≤ Score < 0.67 (34-66%)
- CRÍTICO: Score ≤ 0.33 (≤33%)

INTERPRETAÇÃO TERRITORIAL (para indicadores não-adequados):
- ESTRUTURAL: Restrições de longo prazo, socioeconômicas e territoriais
- GESTÃO: Falhas de governança, planejamento e coordenação institucional
- ENTREGA: Falhas de execução, qualidade de serviço e problemas na entrega

Gere um relatório técnico de desenvolvimento turístico em português brasileiro com esta estrutura:

1. **Resumo Executivo**: Visão geral do destino e situação atual baseada nos três pilares
2. **Análise por Pilar**: 
   - RA (Relações Ambientais): Diagnóstico do contexto territorial
   - AO (Ações Operacionais): Diagnóstico da governança e gestão
   - OE (Organização Estrutural): Diagnóstico da infraestrutura e serviços
3. **Diagnóstico Territorial**: 
   - Problemas ESTRUTURAIS identificados
   - Problemas de GESTÃO identificados
   - Problemas de ENTREGA identificados
4. **Prescrições de Capacitação (SISTUR EDU)**: 
   - Cursos prescritos por pilar
   - Agentes-alvo (Gestores Públicos, Técnicos, Trade)
   - Justificativa de cada prescrição
5. **Plano de Ação por Horizonte Temporal**:
   - Curto prazo (até 6 meses): Ações de ENTREGA
   - Médio prazo (6-18 meses): Ações de GESTÃO
   - Longo prazo (18+ meses): Ações ESTRUTURAIS
6. **Indicadores de Monitoramento**: Métricas para acompanhar evolução, estagnação ou regressão

Seja específico, técnico e considere a metodologia SISTUR. Use formatação markdown.`;

    // Format prescriptions for the prompt
    const prescriptionsText = prescriptions?.length > 0 
      ? prescriptions.map((p: any) => 
          `- [${p.status}] ${p.justification} (Pilar: ${p.pillar}, Agente: ${p.target_agent}, Interpretação: ${p.interpretation || 'N/A'})`
        ).join('\n')
      : 'Nenhuma prescrição gerada ainda.';

    // Format issues with territorial interpretation
    const issuesText = issues?.length > 0 
      ? issues.map((issue: any) => 
          `- [${issue.severity}] ${issue.title} (Pilar: ${issue.pillar}, Tema: ${issue.theme}, Interpretação: ${issue.interpretation || 'N/A'})`
        ).join('\n')
      : 'Nenhum problema identificado ainda.';

    const userPrompt = `Gere um plano de desenvolvimento turístico SISTUR para o destino: ${destinationName}

DADOS DO DIAGNÓSTICO:

SCORES DOS PILARES:
- I-RA (Índice Relações Ambientais): ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.RA?.severity || 'N/A'}
- I-AO (Índice Ações Operacionais): ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.AO?.severity || 'N/A'}
- I-OE (Índice Organização Estrutural): ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.OE?.severity || 'N/A'}

PROBLEMAS IDENTIFICADOS (com interpretação territorial):
${issuesText}

PRESCRIÇÕES DE CAPACITAÇÃO ATIVAS:
${prescriptionsText}

Por favor, gere um relatório completo seguindo a metodologia SISTUR, considerando que:
1. Indicadores criam obrigação
2. Aprendizado é execução
3. Monitoramento fecha o ciclo
4. O SISTUR não informa — o SISTUR transforma`;

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

    console.log('Streaming SISTUR report from AI gateway');
    
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

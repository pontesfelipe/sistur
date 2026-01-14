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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service role client for saving reports (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT using getUser
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Invalid JWT token:', userError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
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

    const orgId = profile.org_id;

    // Fetch full assessment data with IGMA flags
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, destinations(name, uf, ibge_code)')
      .eq('id', assessmentId)
      .single();
    
    if (!assessment || assessment.org_id !== orgId) {
      console.error('User does not have access to this assessment');
      return new Response(JSON.stringify({ error: 'Acesso negado a este diagnóstico' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch indicator scores with indicator details
    const { data: indicatorScores } = await supabase
      .from('indicator_scores')
      .select('*, indicators(code, name, pillar, theme, description, direction)')
      .eq('assessment_id', assessmentId)
      .order('score', { ascending: true });

    // Fetch alerts for this assessment
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('is_dismissed', false);

    console.log('Generating SISTUR report for:', destinationName);
    console.log('Assessment ID:', assessmentId);
    console.log('Pillar scores:', pillarScores);
    console.log('Issues count:', issues?.length || 0);
    console.log('Prescriptions count:', prescriptions?.length || 0);
    console.log('Indicator scores count:', indicatorScores?.length || 0);
    console.log('IGMA flags:', assessment.igma_flags);
    console.log('Alerts count:', alerts?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em inteligência territorial e desenvolvimento turístico no Brasil, utilizando a metodologia SISTUR fundamentada nos princípios sistêmicos de Mario Beni.

FUNDAMENTOS TEÓRICOS DE MARIO BENI:
O turismo deve ser compreendido como um sistema aberto (SISTUR - Sistema de Turismo) composto por subsistemas interdependentes. Segundo Beni:
- O turismo é um fenômeno socioeconômico complexo que envolve múltiplas dimensões: ambiental, cultural, econômica e social
- Não existe turismo sustentável sem equilíbrio territorial - o território é a base de toda atividade turística
- A governança pública é condição sine qua non para o desenvolvimento turístico efetivo
- O marketing turístico só deve ser acionado após consolidação da base territorial e institucional
- O desenvolvimento turístico deve beneficiar a comunidade local, não apenas o visitante

PRINCÍPIOS SISTÊMICOS APLICADOS (6 REGRAS DO SISTUR):

1. LIMITAÇÃO ESTRUTURAL DO TERRITÓRIO (RA PRIORITÁRIO)
   Se o Índice de Relações Ambientais (I-RA) está CRÍTICO, o território apresenta limitações estruturais que comprometem a sustentabilidade do turismo, independentemente de ações de mercado ou gestão. Prioridade absoluta para RA.

2. PLANEJAMENTO COMO CICLO CONTÍNUO
   O planejamento turístico não é um evento, mas um processo cíclico: Diagnóstico → Ação → Monitoramento → Melhoria. O sistema deve indicar quando revisar baseado nos status.

3. ALERTA DE EXTERNALIDADES NEGATIVAS
   Se OE (oferta) melhora enquanto RA (território) piora, há risco de externalidades negativas - crescimento turístico sem sustentabilidade territorial. Requer intervenção imediata.

4. GOVERNANÇA COMO CONDIÇÃO DE EFICÁCIA (AO CENTRAL)
   Se o Índice de Ações Operacionais (I-AO) está CRÍTICO, fragilidades de governança comprometem qualquer ação de mercado. Não adianta investir em OE sem resolver AO primeiro.

5. TERRITÓRIO ANTES DO MARKETING
   Ações de promoção turística só devem ser recomendadas se RA ≠ CRÍTICO e AO ≠ CRÍTICO. Promover destino com problemas estruturais ou de gestão gera frustração e dano reputacional.

6. INTERSETORIALIDADE OBRIGATÓRIA
   Indicadores de saúde, segurança, educação, saneamento dependem de articulação intersetorial. O turismo sozinho não resolve - precisa de políticas públicas integradas.

OS TRÊS PILARES (Taxonomia Fixa):
1. RA — Relações Ambientais: Contexto territorial, sociedade, meio ambiente, dados demográficos, segurança pública, saneamento
2. AO — Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional, coordenação intersetorial
3. OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, produtos, qualificação profissional, entrega ao visitante

CLASSIFICAÇÃO DE STATUS (automático e imutável):
- ADEQUADO (BOM): Score ≥ 0.67 (67%) - Indicador atende expectativas
- ATENÇÃO (MODERADO): 0.34 ≤ Score < 0.67 (34-66%) - Indicador requer monitoramento
- CRÍTICO: Score ≤ 0.33 (≤33%) - Indicador demanda ação urgente

INTERPRETAÇÃO TERRITORIAL (para indicadores não-adequados):
- ESTRUTURAL: Restrições de longo prazo, condições socioeconômicas e territoriais que escapam à governança turística direta
- GESTÃO: Falhas de governança, planejamento, coordenação institucional, capacidade de execução
- ENTREGA: Falhas operacionais, qualidade de serviço, experiência do visitante, execução de ponta

FILOSOFIA SISTUR:
- Transparência: Todos os dados, fontes e cálculos são rastreáveis e auditáveis
- Sem rankings: Avaliação individual — nunca comparativa ou competitiva entre destinos
- Determinístico: Status e prescrições são calculados automaticamente por regras, sem subjetividade
- Ciclo fechado: Diagnóstico → Ação → Monitoramento → Melhoria
- Aprendizado é execução: Capacitação prescrita por gargalo identificado
- Indicadores criam obrigação: Dados geram responsabilidade de ação

Gere um relatório técnico COMPLETO de desenvolvimento turístico em português brasileiro. O relatório deve ser EXTENSO, DETALHADO e ACIONÁVEL, seguindo esta estrutura:

1. **Resumo Executivo** (1-2 parágrafos): Visão geral do destino, situação atual consolidada dos três pilares, e principais conclusões do diagnóstico.

2. **Análise Sistêmica por Pilar** (seção detalhada para cada pilar):
   - I-RA (Índice de Relações Ambientais): Diagnóstico completo do contexto territorial, análise de cada indicador crítico, interpretação das limitações estruturais
   - I-AO (Índice de Ações Operacionais): Diagnóstico da governança e gestão pública, análise da capacidade institucional, gaps de coordenação
   - I-OE (Índice de Organização Estrutural): Diagnóstico da infraestrutura e serviços turísticos, qualidade da oferta, lacunas de entrega

3. **Alertas Sistêmicos IGMA**: Explicação detalhada de cada flag ativo e suas implicações práticas para o destino

4. **Diagnóstico Territorial Detalhado**: 
   - Problemas ESTRUTURAIS identificados (longo prazo, dependência externa)
   - Problemas de GESTÃO identificados (médio prazo, governança)
   - Problemas de ENTREGA identificados (curto prazo, operacional)

5. **Análise de Indicadores Críticos**: Lista dos 10-15 indicadores mais críticos com análise individual

6. **Prescrições de Capacitação (SISTUR EDU)**: 
   - Cursos prescritos organizados por pilar
   - Agentes-alvo específicos (Gestores Públicos, Técnicos, Trade, Comunidade)
   - Justificativa baseada em evidências do diagnóstico
   - Sequência recomendada de capacitação

7. **Plano de Ação por Horizonte Temporal**:
   - Curto prazo (até 6 meses): Ações de ENTREGA - melhorias operacionais imediatas
   - Médio prazo (6-18 meses): Ações de GESTÃO - fortalecimento institucional
   - Longo prazo (18+ meses): Ações ESTRUTURAIS - transformação territorial

8. **Indicadores de Monitoramento**: Métricas específicas para acompanhar evolução, estagnação ou regressão em cada pilar

9. **Recomendações Estratégicas**: Síntese das prioridades e próximos passos concretos

Seja específico, técnico, baseado em evidências, e siga rigorosamente a metodologia SISTUR. Use formatação markdown com headers, listas e destaque para pontos críticos.`;

    // Format prescriptions for the prompt
    const prescriptionsText = prescriptions?.length > 0 
      ? prescriptions.map((p: any) => 
          `- [${p.status}] ${p.justification} (Pilar: ${p.pillar}, Agente: ${p.target_agent}, Prioridade: ${p.priority || 'N/A'})`
        ).join('\n')
      : 'Nenhuma prescrição gerada ainda.';

    // Format issues with territorial interpretation
    const issuesText = issues?.length > 0 
      ? issues.map((issue: any) => 
          `- [${issue.severity}] ${issue.title} (Pilar: ${issue.pillar}, Tema: ${issue.theme}, Interpretação Territorial: ${issue.interpretation || 'N/A'})`
        ).join('\n')
      : 'Nenhum problema identificado ainda.';

    // Format indicator scores - group by pillar and show critical ones
    const formatIndicatorScores = () => {
      if (!indicatorScores || indicatorScores.length === 0) return 'Nenhum indicador calculado.';
      
      const byPillar: Record<string, any[]> = { RA: [], AO: [], OE: [] };
      indicatorScores.forEach((is: any) => {
        const pillar = is.indicators?.pillar || 'RA';
        if (byPillar[pillar]) {
          byPillar[pillar].push(is);
        }
      });

      let result = '';
      for (const [pillar, scores] of Object.entries(byPillar)) {
        if (scores.length === 0) continue;
        const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        const critical = scores.filter(s => s.score <= 0.33);
        const moderate = scores.filter(s => s.score > 0.33 && s.score <= 0.66);
        
        result += `\n${pillar} (${scores.length} indicadores, média: ${(avg * 100).toFixed(1)}%):\n`;
        result += `  - Críticos: ${critical.length}, Atenção: ${moderate.length}, Adequados: ${scores.length - critical.length - moderate.length}\n`;
        
        // List critical indicators
        if (critical.length > 0) {
          result += '  - Indicadores Críticos:\n';
          critical.slice(0, 10).forEach((s: any) => {
            result += `    * ${s.indicators?.name || s.indicators?.code}: ${(s.score * 100).toFixed(1)}% (${s.indicators?.theme || 'N/A'})\n`;
          });
        }
      }
      return result;
    };

    // Format IGMA flags
    const formatIGMAFlags = () => {
      const flags = assessment.igma_flags as Record<string, boolean> | null;
      if (!flags) return 'Nenhuma flag IGMA ativa.';
      
      const flagDescriptions: Record<string, string> = {
        RA_LIMITATION: 'Limitação Estrutural do Território - RA crítico bloqueia compensação por outros pilares',
        GOVERNANCE_BLOCK: 'Fragilidade de Governança - AO crítico impede efetividade de ações de mercado',
        EXTERNALITY_WARNING: 'Alerta de Externalidades - OE crescendo enquanto RA declina (risco de dano territorial)',
        MARKETING_BLOCKED: 'Marketing Bloqueado - Promoção turística suspensa até consolidação territorial/institucional',
        INTERSECTORAL_DEPENDENCY: 'Dependência Intersetorial - Indicadores requerem articulação além do turismo',
      };
      
      const activeFlags = Object.entries(flags)
        .filter(([_, active]) => active)
        .map(([flag, _]) => `- ${flagDescriptions[flag] || flag}`)
        .join('\n');
      
      return activeFlags || 'Nenhuma flag IGMA ativa.';
    };

    // Format alerts
    const alertsText = alerts && alerts.length > 0
      ? alerts.map((a: any) => `- [${a.alert_type}] ${a.message} (Pilar: ${a.pillar}, Ciclos consecutivos: ${a.consecutive_cycles})`).join('\n')
      : 'Nenhum alerta ativo.';

    const userPrompt = `Gere um plano de desenvolvimento turístico SISTUR COMPLETO E DETALHADO para o destino: ${destinationName}${assessment.destinations?.uf ? ` - ${assessment.destinations.uf}` : ''}

=== DADOS COMPLETOS DO DIAGNÓSTICO ===

PERÍODO DE ANÁLISE: ${assessment.period_start || 'N/A'} a ${assessment.period_end || 'N/A'}
VERSÃO DO ALGORITMO: ${assessment.algo_version}
DATA DE CÁLCULO: ${assessment.calculated_at || 'N/A'}
PRÓXIMA REVISÃO RECOMENDADA: ${assessment.next_review_recommended_at || 'N/A'}

SCORES DOS PILARES:
- I-RA (Índice de Relações Ambientais): ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.RA?.severity || 'N/A'}
- I-AO (Índice de Ações Operacionais): ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.AO?.severity || 'N/A'}
- I-OE (Índice de Organização Estrutural): ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.OE?.severity || 'N/A'}

ALERTAS SISTÊMICOS IGMA (FLAGS ATIVOS):
${formatIGMAFlags()}

ALERTAS DE MONITORAMENTO:
${alertsText}

DETALHAMENTO DE INDICADORES POR PILAR:
${formatIndicatorScores()}

PROBLEMAS IDENTIFICADOS (com interpretação territorial):
${issuesText}

PRESCRIÇÕES DE CAPACITAÇÃO ATIVAS:
${prescriptionsText}

=== INSTRUÇÕES ===
Gere um relatório COMPLETO, EXTENSO e ACIONÁVEL seguindo rigorosamente:
1. A metodologia SISTUR com os 6 princípios sistêmicos de Mario Beni
2. A priorização baseada nos alertas IGMA ativos
3. A interpretação territorial (Estrutural/Gestão/Entrega) para cada problema
4. Prescrições específicas e justificadas para cada gargalo
5. Cronograma realista de ações por horizonte temporal
6. Indicadores de monitoramento mensuráveis

LEMBRE-SE:
- Indicadores criam obrigação - cada dado gera responsabilidade de ação
- Aprendizado é execução - capacitação deve ser prescrita por gargalo específico
- Monitoramento fecha o ciclo - toda ação deve ter indicador de acompanhamento
- O SISTUR não informa — o SISTUR transforma

O relatório deve ter no mínimo 2000 palavras e cobrir todos os aspectos do diagnóstico.`;

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
    
    // Create a TransformStream to collect content while streaming
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    let fullContent = '';

    // Process the stream in background
    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Pass through the chunk to the client
          await writer.write(value);
          
          // Also decode and collect the content
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
        
        await writer.close();

        // Save the complete report to database
        if (fullContent) {
          const { error: saveError } = await supabaseAdmin
            .from('generated_reports')
            .insert({
              org_id: orgId,
              assessment_id: assessmentId,
              destination_name: destinationName,
              report_content: fullContent,
              created_by: userId,
            });
          
          if (saveError) {
            console.error('Error saving report:', saveError);
          } else {
            console.log('Report saved successfully');
          }
        }
      } catch (err) {
        console.error('Stream processing error:', err);
        await writer.abort(err);
      }
    })();

    return new Response(readable, {
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

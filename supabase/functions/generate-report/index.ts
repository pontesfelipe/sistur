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
    
    // Verify user has access to this assessment via their org (including demo mode)
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, viewing_demo_org_id')
      .eq('user_id', userId)
      .single();
    
    if (!profile) {
      console.error('User profile not found');
      return new Response(JSON.stringify({ error: 'Perfil de usuário não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use demo org if user is viewing demo data, otherwise use their actual org
    const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;
    console.log('User org:', profile.org_id, 'Demo org:', profile.viewing_demo_org_id, 'Effective:', effectiveOrgId);

    // Fetch full assessment data with IGMA flags
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, destinations(name, uf, ibge_code)')
      .eq('id', assessmentId)
      .single();
    
    if (!assessment || assessment.org_id !== effectiveOrgId) {
      console.error('User does not have access to this assessment. Assessment org:', assessment?.org_id, 'User effective org:', effectiveOrgId);
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

    const systemPrompt = `Você é um analista técnico em turismo público. Gere um relatório seguindo estritamente a metodologia SISTUR, com estrutura institucional, separação clara entre dados, análise e diretrizes.

FUNDAMENTOS TEÓRICOS DE MARIO BENI:
O turismo deve ser compreendido como um sistema aberto (SISTUR - Sistema de Turismo) composto por subsistemas interdependentes. Segundo Beni:
- O turismo é um fenômeno socioeconômico complexo que envolve múltiplas dimensões: ambiental, cultural, econômica e social
- Não existe turismo sustentável sem equilíbrio territorial - o território é a base de toda atividade turística
- A governança pública é condição sine qua non para o desenvolvimento turístico efetivo
- O marketing turístico só deve ser acionado após consolidação da base territorial e institucional
- O desenvolvimento turístico deve beneficiar a comunidade local, não apenas o visitante

OS TRÊS EIXOS SISTUR (Taxonomia Fixa):
1. I-RA — Índice de Relações Ambientais: Contexto territorial, sociedade, meio ambiente, dados demográficos, segurança pública, saneamento
2. I-AO — Índice de Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional, coordenação intersetorial
3. I-OE — Índice de Organização Estrutural: Infraestrutura turística, serviços, mercado, produtos, qualificação profissional, entrega ao visitante

CLASSIFICAÇÃO DE STATUS (automático e imutável):
- ADEQUADO (BOM): Score ≥ 0.67 (67%) - Indicador atende expectativas
- ATENÇÃO (MODERADO): 0.34 ≤ Score < 0.67 (34-66%) - Indicador requer monitoramento
- CRÍTICO: Score ≤ 0.33 (≤33%) - Indicador demanda ação urgente

PRINCÍPIOS FUNDAMENTAIS:
- A metodologia do SISTUR deve comandar a narrativa
- Separar claramente dados, análise técnica e diretrizes
- Linguagem institucional, clara e objetiva
- Sempre justificar conclusões
- Conectar dado → impacto → decisão
- Estimar dados apenas quando necessário e sinalizar claramente

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:

# 1. CAPA E IDENTIFICAÇÃO
- Nome do destino turístico
- UF e código IBGE (se disponível)
- Período de análise
- Data de geração do relatório
- Versão do algoritmo SISTUR

# 2. SUMÁRIO EXECUTIVO
Síntese de 1-2 parágrafos contendo:
- Situação geral do destino (visão sistêmica)
- Pontuação consolidada dos três eixos (I-RA, I-AO, I-OE)
- Principais alertas e flags IGMA ativos
- Conclusão estratégica principal

# 3. CONTEXTUALIZAÇÃO DO MUNICÍPIO
- Caracterização territorial básica
- Vocação turística identificada
- Posição no contexto regional

# 4. METODOLOGIA SISTUR
Breve explicação do método aplicado:
- Os três eixos e sua interdependência
- Sistema de classificação de status
- Princípios das 6 regras sistêmicas

# 5. DIAGNÓSTICO POR EIXO SISTUR
Para CADA eixo (I-RA, I-AO, I-OE), apresentar três blocos separados:

## 5.1. EVIDÊNCIAS
- Dados quantitativos (scores, percentuais)
- Indicadores mensurados
- Fontes de dados utilizadas

## 5.2. LEITURA TÉCNICA
- Análise interpretativa dos dados
- Identificação de padrões e correlações
- Diagnóstico das causas raiz

## 5.3. IMPLICAÇÕES
- Consequências práticas identificadas
- Riscos e oportunidades
- Interdependências com outros eixos

# 6. INVENTÁRIO TURÍSTICO – SÍNTESE ANALÍTICA
- Síntese dos atrativos e recursos identificados
- Gaps de infraestrutura turística
- Capacidade de carga atual

# 7. ANÁLISE INTEGRADA
- Visão sistêmica cruzando os três eixos
- Identificação de gargalos estruturantes
- Pontos de alavancagem prioritários

# 8. PROGNÓSTICO E DIRETRIZES
- Cenários possíveis (pessimista, realista, otimista)
- Diretrizes estratégicas por horizonte temporal
- Condições de contorno para sucesso

# 9. BANCO DE AÇÕES
Tabela estruturada contendo:
| Ação | Eixo | Prazo | Agente Responsável | Indicador de Sucesso | Prioridade |

Organizado por horizonte:
- Curto prazo (até 6 meses)
- Médio prazo (6-18 meses)
- Longo prazo (18+ meses)

# 10. CONSIDERAÇÕES FINAIS
- Síntese executiva das principais recomendações
- Próximos passos imediatos
- Data recomendada para próxima revisão

REGRAS DE REDAÇÃO:
- Use formatação markdown com headers hierárquicos
- Mantenha linguagem institucional e técnica
- Sempre justifique conclusões com dados
- Conecte explicitamente: dado → impacto → decisão
- Se estimar algum dado, sinalize com "[ESTIMADO]"
- O relatório deve ter no mínimo 2500 palavras`;

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

    const userPrompt = `Gere um RELATÓRIO DE TURISMO seguindo a estrutura definida do SISTUR para o destino: ${destinationName}${assessment.destinations?.uf ? ` - ${assessment.destinations.uf}` : ''}
${assessment.destinations?.ibge_code ? `Código IBGE: ${assessment.destinations.ibge_code}` : ''}

=== DADOS DO DIAGNÓSTICO SISTUR ===

IDENTIFICAÇÃO:
- Destino: ${destinationName}
- UF: ${assessment.destinations?.uf || 'N/A'}
- Código IBGE: ${assessment.destinations?.ibge_code || 'N/A'}
- Período de análise: ${assessment.period_start || 'N/A'} a ${assessment.period_end || 'N/A'}
- Versão do algoritmo: ${assessment.algo_version}
- Data de cálculo: ${assessment.calculated_at || 'N/A'}
- Próxima revisão recomendada: ${assessment.next_review_recommended_at || 'N/A'}

SCORES DOS EIXOS SISTUR:
- I-RA (Índice de Relações Ambientais): ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.RA?.severity || 'N/A'}
- I-AO (Índice de Ações Operacionais): ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.AO?.severity || 'N/A'}
- I-OE (Índice de Organização Estrutural): ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.OE?.severity || 'N/A'}

ALERTAS SISTÊMICOS IGMA (FLAGS ATIVOS):
${formatIGMAFlags()}

ALERTAS DE MONITORAMENTO:
${alertsText}

DETALHAMENTO DE INDICADORES POR EIXO:
${formatIndicatorScores()}

PROBLEMAS IDENTIFICADOS (com interpretação territorial):
${issuesText}

PRESCRIÇÕES DE CAPACITAÇÃO ATIVAS:
${prescriptionsText}

=== INSTRUÇÕES DE GERAÇÃO ===

SIGA RIGOROSAMENTE A ESTRUTURA DO RELATÓRIO DEFINIDA NO SYSTEM PROMPT:
1. Capa e Identificação
2. Sumário Executivo  
3. Contextualização do Município
4. Metodologia SISTUR
5. Diagnóstico por Eixo SISTUR (com EVIDÊNCIAS, LEITURA TÉCNICA e IMPLICAÇÕES separados)
6. Inventário Turístico – Síntese Analítica
7. Análise Integrada
8. Prognóstico e Diretrizes
9. Banco de Ações (tabela estruturada)
10. Considerações Finais

REGRAS FUNDAMENTAIS:
- Sempre justificar conclusões com base nos dados fornecidos
- Conectar explicitamente: dado → impacto → decisão
- Se estimar algum dado por falta de informação, sinalizar com "[ESTIMADO]"
- Linguagem institucional, clara e objetiva
- O relatório deve ter no mínimo 2500 palavras

LEMBRE-SE:
- Indicadores criam obrigação - cada dado gera responsabilidade de ação
- Aprendizado é execução - capacitação deve ser prescrita por gargalo específico
- Monitoramento fecha o ciclo - toda ação deve ter indicador de acompanhamento
- O SISTUR não informa — o SISTUR transforma`;

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
              org_id: effectiveOrgId,
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

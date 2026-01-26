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

    // Determine if this is an Enterprise diagnostic
    const isEnterprise = assessment.diagnostic_type === 'enterprise';
    console.log('Diagnostic type:', assessment.diagnostic_type, 'isEnterprise:', isEnterprise);

    // Fetch indicator scores with indicator details
    const { data: indicatorScores } = await supabase
      .from('indicator_scores')
      .select('*, indicators(code, name, pillar, theme, description, direction, indicator_scope, benchmark_min, benchmark_max, benchmark_target)')
      .eq('assessment_id', assessmentId)
      .order('score', { ascending: true });

    // Fetch alerts for this assessment
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('is_dismissed', false);

    // Fetch action plans for this assessment
    const { data: actionPlans } = await supabase
      .from('action_plans')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('priority', { ascending: true });

    // Fetch indicator values (raw data) for more context
    const { data: indicatorValues } = await supabase
      .from('indicator_values')
      .select('*, indicators(code, name, pillar, theme, unit)')
      .eq('assessment_id', assessmentId);

    console.log('Generating report for:', destinationName, isEnterprise ? '(ENTERPRISE)' : '(TERRITORIAL)');
    console.log('Assessment ID:', assessmentId);
    console.log('Pillar scores:', pillarScores);
    console.log('Issues count:', issues?.length || 0);
    console.log('Prescriptions count:', prescriptions?.length || 0);
    console.log('Indicator scores count:', indicatorScores?.length || 0);
    console.log('Action plans count:', actionPlans?.length || 0);
    console.log('Indicator values count:', indicatorValues?.length || 0);
    console.log('IGMA flags:', assessment.igma_flags);
    console.log('Alerts count:', alerts?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ========== SYSTEM PROMPTS ==========
    
    const territorialSystemPrompt = `Você é um analista técnico em turismo público. Gere um relatório seguindo estritamente a metodologia SISTUR, com estrutura institucional, separação clara entre dados, análise e diretrizes.

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

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO TERRITORIAL:

# 1. CAPA E IDENTIFICAÇÃO
# 2. SUMÁRIO EXECUTIVO
# 3. CONTEXTUALIZAÇÃO DO MUNICÍPIO
# 4. METODOLOGIA SISTUR
# 5. DIAGNÓSTICO POR EIXO SISTUR (com EVIDÊNCIAS, LEITURA TÉCNICA e IMPLICAÇÕES)
# 6. INVENTÁRIO TURÍSTICO – SÍNTESE ANALÍTICA
# 7. ANÁLISE INTEGRADA
# 8. PROGNÓSTICO E DIRETRIZES
# 9. BANCO DE AÇÕES (tabela estruturada)
# 10. CONSIDERAÇÕES FINAIS

REGRAS DE REDAÇÃO:
- Use formatação markdown com headers hierárquicos
- Mantenha linguagem institucional e técnica
- Sempre justifique conclusões com dados
- Conecte explicitamente: dado → impacto → decisão
- Se estimar algum dado, sinalize com "[ESTIMADO]"
- O relatório deve ter no mínimo 2500 palavras`;

    const enterpriseSystemPrompt = `Você é um consultor estratégico especializado em gestão hoteleira e empreendimentos turísticos. Gere um relatório executivo focado em ORIENTAÇÃO ESTRATÉGICA PARA O EMPREENDIMENTO, utilizando a metodologia SISTUR adaptada para o setor privado.

CONTEXTO ENTERPRISE:
Este diagnóstico analisa um EMPREENDIMENTO TURÍSTICO PRIVADO (hotel, resort, pousada) — não um destino público. O foco é ajudar a gestão a:
- Identificar gaps operacionais e de performance
- Otimizar KPIs de negócio (RevPAR, ocupação, NPS, etc.)
- Alinhar práticas de sustentabilidade com rentabilidade
- Definir prioridades de investimento e capacitação

OS TRÊS EIXOS SISTUR ENTERPRISE:
1. I-RA — Responsabilidade Ambiental: Eficiência energética, gestão hídrica, resíduos, certificações ESG, impacto na comunidade local
2. I-AO — Ações Operacionais: Governança corporativa, saúde financeira, maturidade tecnológica, rede de parcerias
3. I-OE — Organização Estrutural: Qualidade de serviço, satisfação do hóspede, ocupação, infraestrutura, capacitação da equipe

CATEGORIAS FUNCIONAIS ENTERPRISE:
- Eficiência Energética: Consumo kWh/UH, fontes renováveis
- Gestão Hídrica: Consumo litros/hóspede, reuso
- Gestão de Resíduos: Taxa reciclagem, compostagem
- Certificações Ambientais: Selos ESG ativos
- Impacto na Comunidade: Emprego local, fornecedores regionais
- Governança Corporativa: Políticas formalizadas, compliance
- Saúde Financeira: RevPAR, ADR, margem operacional
- Maturidade Tecnológica: Sistemas integrados, automação
- Rede de Parcerias: Acordos B2B, OTAs
- Qualidade de Serviço: NPS, review score, reclamações
- Satisfação do Hóspede: Retorno, recomendação
- Taxa de Ocupação: Ocupação anual, sazonalidade
- Qualidade da Infraestrutura: Estado conservação, acessibilidade
- Capacitação da Equipe: Horas treinamento, turnover
- Efetividade de Marketing: CAC, conversão direta

CLASSIFICAÇÃO DE STATUS:
- BOM: Score ≥ 0.67 (67%) - KPI atende benchmark do setor
- ATENÇÃO: 0.34 ≤ Score < 0.67 - KPI requer melhoria
- CRÍTICO: Score ≤ 0.33 - KPI demanda ação urgente

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO ENTERPRISE:

# 1. CAPA E IDENTIFICAÇÃO DO EMPREENDIMENTO
- Nome do empreendimento
- Localização (destino vinculado)
- Período de análise
- Data do diagnóstico

# 2. SUMÁRIO EXECUTIVO PARA GESTÃO
- Visão geral da performance do empreendimento
- Score consolidado dos três eixos
- Top 3 prioridades de ação imediata
- ROI estimado das melhorias sugeridas

# 3. PERFIL DO EMPREENDIMENTO
- Caracterização do negócio
- Posicionamento de mercado
- Principais segmentos atendidos

# 4. METODOLOGIA SISTUR ENTERPRISE
- Adaptação da metodologia para setor privado
- KPIs e benchmarks utilizados

# 5. DIAGNÓSTICO POR CATEGORIA FUNCIONAL
Para CADA categoria com dados, apresentar:
## 5.X. [NOME DA CATEGORIA]
### Métricas Atuais
- Valores dos KPIs medidos
- Comparação com benchmarks do setor
### Análise de Performance
- Interpretação dos resultados
- Gaps identificados
### Impacto no Negócio
- Consequências financeiras/operacionais
- Oportunidades de melhoria

# 6. ANÁLISE DE GARGALOS OPERACIONAIS
- Problemas críticos identificados
- Causas raiz
- Impacto na operação e receita

# 7. PLANOS DE AÇÃO EM ANDAMENTO
- Status dos planos já criados
- Responsáveis e prazos
- Progresso atual

# 8. RECOMENDAÇÕES ESTRATÉGICAS
- Ações prioritárias por horizonte (curto/médio/longo prazo)
- Investimentos recomendados
- Quick wins vs projetos estruturantes

# 9. PRESCRIÇÕES DE CAPACITAÇÃO
- Treinamentos recomendados para equipe
- Gaps de competência identificados

# 10. ROADMAP DE IMPLEMENTAÇÃO
Tabela estruturada:
| Ação | Categoria | Investimento Est. | Prazo | Responsável | KPI de Sucesso |

# 11. CONSIDERAÇÕES FINAIS
- Síntese das prioridades
- Próximos passos imediatos
- Data recomendada para próxima avaliação

REGRAS DE REDAÇÃO ENTERPRISE:
- Linguagem executiva, direta e orientada a resultados
- Foco em ROI e impacto no negócio
- Sempre conectar: métrica → gap → ação → resultado esperado
- Use formatação markdown com headers hierárquicos
- O relatório deve ter no mínimo 2500 palavras`;

    const systemPrompt = isEnterprise ? enterpriseSystemPrompt : territorialSystemPrompt;

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
        
        // List all indicators with scores
        scores.forEach((s: any) => {
          const status = s.score <= 0.33 ? 'CRÍTICO' : s.score <= 0.66 ? 'ATENÇÃO' : 'BOM';
          const benchmark = s.indicators?.benchmark_target ? ` (benchmark: ${s.indicators.benchmark_target})` : '';
          result += `    * ${s.indicators?.name || s.indicators?.code}: ${(s.score * 100).toFixed(1)}% [${status}] - Tema: ${s.indicators?.theme || 'N/A'}${benchmark}\n`;
        });
      }
      return result;
    };

    // Format indicator scores grouped by category/theme (for Enterprise)
    const formatIndicatorsByCategory = () => {
      if (!indicatorScores || indicatorScores.length === 0) return 'Nenhum indicador calculado.';
      
      const byTheme: Record<string, any[]> = {};
      indicatorScores.forEach((is: any) => {
        const theme = is.indicators?.theme || 'Outros';
        if (!byTheme[theme]) byTheme[theme] = [];
        byTheme[theme].push(is);
      });

      let result = '';
      for (const [theme, scores] of Object.entries(byTheme)) {
        if (scores.length === 0) continue;
        const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        const status = avg <= 0.33 ? 'CRÍTICO' : avg <= 0.66 ? 'ATENÇÃO' : 'BOM';
        
        result += `\n## ${theme} (Status: ${status}, Média: ${(avg * 100).toFixed(1)}%)\n`;
        
        scores.forEach((s: any) => {
          const kpiStatus = s.score <= 0.33 ? 'CRÍTICO' : s.score <= 0.66 ? 'ATENÇÃO' : 'BOM';
          const benchmarkMin = s.indicators?.benchmark_min !== null ? s.indicators.benchmark_min : 'N/A';
          const benchmarkMax = s.indicators?.benchmark_max !== null ? s.indicators.benchmark_max : 'N/A';
          const benchmarkTarget = s.indicators?.benchmark_target !== null ? s.indicators.benchmark_target : 'N/A';
          result += `  - ${s.indicators?.name || s.indicators?.code}: ${(s.score * 100).toFixed(1)}% [${kpiStatus}]\n`;
          result += `    Benchmark: min=${benchmarkMin}, target=${benchmarkTarget}, max=${benchmarkMax}\n`;
        });
      }
      return result;
    };

    // Format raw indicator values
    const formatIndicatorValues = () => {
      if (!indicatorValues || indicatorValues.length === 0) return 'Nenhum valor bruto disponível.';
      
      return indicatorValues.map((iv: any) => {
        const value = iv.value !== null ? iv.value : 'N/A';
        const unit = iv.indicators?.unit || '';
        return `- ${iv.indicators?.name || iv.indicators?.code}: ${value}${unit ? ` ${unit}` : ''} (Pilar: ${iv.indicators?.pillar || 'N/A'}, Tema: ${iv.indicators?.theme || 'N/A'})`;
      }).join('\n');
    };

    // Format action plans
    const formatActionPlans = () => {
      if (!actionPlans || actionPlans.length === 0) return 'Nenhum plano de ação criado.';
      
      const statusMap: Record<string, string> = {
        'pending': 'Pendente',
        'in_progress': 'Em Andamento',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
      };
      
      return actionPlans.map((ap: any) => {
        const status = statusMap[ap.status] || ap.status;
        const dueDate = ap.due_date ? new Date(ap.due_date).toLocaleDateString('pt-BR') : 'Sem prazo';
        return `- [${status}] ${ap.title}\n  Descrição: ${ap.description || 'N/A'}\n  Pilar: ${ap.pillar || 'N/A'} | Responsável: ${ap.owner || 'N/A'} | Prazo: ${dueDate} | Prioridade: ${ap.priority || 'N/A'}`;
      }).join('\n\n');
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

    // ========== USER PROMPTS ==========

    const territorialUserPrompt = `Gere um RELATÓRIO DE TURISMO TERRITORIAL seguindo a estrutura definida do SISTUR para o destino: ${destinationName}${assessment.destinations?.uf ? ` - ${assessment.destinations.uf}` : ''}
${assessment.destinations?.ibge_code ? `Código IBGE: ${assessment.destinations.ibge_code}` : ''}

=== DADOS DO DIAGNÓSTICO SISTUR TERRITORIAL ===

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

VALORES BRUTOS DOS INDICADORES:
${formatIndicatorValues()}

PROBLEMAS/GARGALOS IDENTIFICADOS:
${issuesText}

PRESCRIÇÕES DE CAPACITAÇÃO ATIVAS:
${prescriptionsText}

PLANOS DE AÇÃO CRIADOS:
${formatActionPlans()}

=== INSTRUÇÕES DE GERAÇÃO ===

SIGA RIGOROSAMENTE A ESTRUTURA DO RELATÓRIO DEFINIDA NO SYSTEM PROMPT.

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

    const enterpriseUserPrompt = `Gere um RELATÓRIO EXECUTIVO ENTERPRISE para o empreendimento: ${destinationName}${assessment.destinations?.uf ? ` - ${assessment.destinations.uf}` : ''}

=== DADOS DO DIAGNÓSTICO SISTUR ENTERPRISE ===

IDENTIFICAÇÃO DO EMPREENDIMENTO:
- Nome: ${destinationName}
- Localização: ${assessment.destinations?.uf || 'N/A'}
- Período de análise: ${assessment.period_start || 'N/A'} a ${assessment.period_end || 'N/A'}
- Versão do algoritmo: ${assessment.algo_version}
- Data de cálculo: ${assessment.calculated_at || 'N/A'}

PERFORMANCE POR EIXO SISTUR ENTERPRISE:
- I-RA (Responsabilidade Ambiental): ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.RA?.severity || 'N/A'}
- I-AO (Ações Operacionais): ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.AO?.severity || 'N/A'}
- I-OE (Organização Estrutural): ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'Não calculado'} - Status: ${pillarScores?.OE?.severity || 'N/A'}

ALERTAS OPERACIONAIS:
${alertsText}

DETALHAMENTO POR CATEGORIA FUNCIONAL:
${formatIndicatorsByCategory()}

VALORES DOS KPIs (DADOS BRUTOS):
${formatIndicatorValues()}

GARGALOS OPERACIONAIS IDENTIFICADOS:
${issuesText}

PRESCRIÇÕES DE CAPACITAÇÃO:
${prescriptionsText}

PLANOS DE AÇÃO EM ANDAMENTO:
${formatActionPlans()}

=== INSTRUÇÕES DE GERAÇÃO ===

ESTE É UM RELATÓRIO PARA GESTÃO DE EMPREENDIMENTO TURÍSTICO PRIVADO.
Foco em: direção estratégica, otimização de performance, ROI de melhorias.

SIGA RIGOROSAMENTE A ESTRUTURA DO RELATÓRIO ENTERPRISE DEFINIDA NO SYSTEM PROMPT:
1. Capa e Identificação do Empreendimento
2. Sumário Executivo para Gestão
3. Perfil do Empreendimento
4. Metodologia SISTUR Enterprise
5. Diagnóstico por Categoria Funcional
6. Análise de Gargalos Operacionais
7. Planos de Ação em Andamento
8. Recomendações Estratégicas
9. Prescrições de Capacitação
10. Roadmap de Implementação
11. Considerações Finais

REGRAS ENTERPRISE:
- Linguagem executiva e orientada a resultados
- Foco em impacto financeiro e operacional
- Conectar: métrica → gap → ação → resultado esperado
- Priorizar quick wins com alto ROI
- O relatório deve ter no mínimo 2500 palavras

LEMBRE-SE:
- O empreendimento busca DIREÇÃO para otimizar operação e rentabilidade
- Cada KPI abaixo do benchmark representa oportunidade de melhoria
- Recomendações devem ser acionáveis com investimento/prazo estimado
- O SISTUR Enterprise transforma dados em decisões de negócio`;

    const userPrompt = isEnterprise ? enterpriseUserPrompt : territorialUserPrompt;

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
      
      return new Response(JSON.stringify({ error: "Erro ao gerar relatório com Mente Sistur" }), {
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

        // Save the complete report to database (upsert to avoid duplicates)
        if (fullContent) {
          // First try to update existing report, if none exists insert new
          const { data: existingReport } = await supabaseAdmin
            .from('generated_reports')
            .select('id')
            .eq('assessment_id', assessmentId)
            .maybeSingle();
          
          if (existingReport) {
            // Update existing report
            const { error: updateError } = await supabaseAdmin
              .from('generated_reports')
              .update({
                report_content: fullContent,
                created_at: new Date().toISOString(),
              })
              .eq('id', existingReport.id);
            
            if (updateError) {
              console.error('Error updating report:', updateError);
            } else {
              console.log('Report updated successfully');
            }
          } else {
            // Insert new report
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

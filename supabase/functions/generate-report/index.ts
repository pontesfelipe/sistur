import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== HELPER FUNCTIONS ==========

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatDateOnlyBR(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

function pillarLabel(score: number | undefined): string {
  if (score === undefined) return 'N/A';
  const pct = (score * 100).toFixed(1);
  if (score >= 0.67) return `${pct}% — ADEQUADO`;
  if (score >= 0.34) return `${pct}% — ATENÇÃO`;
  return `${pct}% — CRÍTICO`;
}

function formatIndicatorScores(indicatorScores: any[]): string {
  if (!indicatorScores || indicatorScores.length === 0) return 'Nenhum indicador calculado.';
  
  const byPillar: Record<string, any[]> = { RA: [], AO: [], OE: [] };
  indicatorScores.forEach((is: any) => {
    const pillar = is.indicators?.pillar || 'RA';
    if (byPillar[pillar]) byPillar[pillar].push(is);
  });

  let result = '';
  for (const [pillar, scores] of Object.entries(byPillar)) {
    if (scores.length === 0) continue;
    const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const critical = scores.filter(s => s.score <= 0.33);
    const moderate = scores.filter(s => s.score > 0.33 && s.score <= 0.66);
    
    result += `\n${pillar} (${scores.length} indicadores, média: ${(avg * 100).toFixed(1)}%):\n`;
    result += `  Críticos: ${critical.length}, Atenção: ${moderate.length}, Adequados: ${scores.length - critical.length - moderate.length}\n`;
    
    scores.forEach((s: any) => {
      const status = s.score <= 0.33 ? 'CRÍTICO' : s.score <= 0.66 ? 'ATENÇÃO' : 'BOM';
      const benchmark = s.indicators?.benchmark_target ? ` (benchmark: ${s.indicators.benchmark_target})` : '';
      result += `    * ${s.indicators?.name || s.indicators?.code}: ${(s.score * 100).toFixed(1)}% [${status}] - Tema: ${s.indicators?.theme || 'N/A'}${benchmark}\n`;
    });
  }
  return result;
}

function formatIndicatorsByCategory(indicatorScores: any[]): string {
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
}

function formatIndicatorValues(indicatorValues: any[]): string {
  if (!indicatorValues || indicatorValues.length === 0) return 'Nenhum valor bruto disponível.';
  return indicatorValues.map((iv: any) => {
    const value = iv.value !== null ? iv.value : 'N/A';
    const unit = iv.indicators?.unit || '';
    return `- ${iv.indicators?.name || iv.indicators?.code}: ${value}${unit ? ` ${unit}` : ''} (Pilar: ${iv.indicators?.pillar || 'N/A'}, Tema: ${iv.indicators?.theme || 'N/A'})`;
  }).join('\n');
}

function formatActionPlans(actionPlans: any[]): string {
  if (!actionPlans || actionPlans.length === 0) return 'Nenhum plano de ação criado.';
  const statusMap: Record<string, string> = { 'pending': 'Pendente', 'in_progress': 'Em Andamento', 'completed': 'Concluído', 'cancelled': 'Cancelado' };
  return actionPlans.map((ap: any) => {
    const status = statusMap[ap.status] || ap.status;
    const dueDate = ap.due_date ? new Date(ap.due_date).toLocaleDateString('pt-BR') : 'Sem prazo';
    return `- [${status}] ${ap.title}\n  Descrição: ${ap.description || 'N/A'}\n  Pilar: ${ap.pillar || 'N/A'} | Responsável: ${ap.owner || 'N/A'} | Prazo: ${dueDate} | Prioridade: ${ap.priority || 'N/A'}`;
  }).join('\n\n');
}

function formatIGMAFlags(flags: Record<string, boolean> | null): string {
  if (!flags) return 'Nenhuma flag IGMA ativa.';
  const flagDescriptions: Record<string, string> = {
    RA_LIMITATION: 'Limitação Estrutural do Território - RA crítico bloqueia compensação por outros pilares',
    GOVERNANCE_BLOCK: 'Fragilidade de Governança - AO crítico impede efetividade de ações de mercado',
    EXTERNALITY_WARNING: 'Alerta de Externalidades - OE crescendo enquanto RA declina (risco de dano territorial)',
    MARKETING_BLOCKED: 'Marketing Bloqueado - Promoção turística suspensa até consolidação territorial/institucional',
    INTERSECTORAL_DEPENDENCY: 'Dependência Intersetorial - Indicadores requerem articulação além do turismo',
  };
  const activeFlags = Object.entries(flags).filter(([_, active]) => active).map(([flag]) => `- ${flagDescriptions[flag] || flag}`).join('\n');
  return activeFlags || 'Nenhuma flag IGMA ativa.';
}

// ========== COVER TABLE (mandatory for all templates) ==========

function buildCoverBlock(destinationName: string, assessment: any, pillarScores: any, template: string): string {
  const now = new Date();
  const generatedAt = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const templateLabels: Record<string, string> = { completo: 'Relatório Completo', executivo: 'Resumo Executivo', investidor: 'Relatório para Investidores' };
  
  return `
FICHA TÉCNICA DO RELATÓRIO (renderize como tabela markdown):

| Campo | Valor |
|---|---|
| Destino / Empreendimento | ${destinationName}${assessment.destinations?.uf ? ` — ${assessment.destinations.uf}` : ''} |
| Código IBGE | ${assessment.destinations?.ibge_code || 'N/A'} |
| Tipo de Diagnóstico | ${assessment.diagnostic_type === 'enterprise' ? 'Empresarial' : 'Territorial'} |
| Modelo de Relatório | ${templateLabels[template] || template} |
| Período de Análise | ${formatDateOnlyBR(assessment.period_start)} a ${formatDateOnlyBR(assessment.period_end)} |
| Data do Cálculo | ${formatDateBR(assessment.calculated_at)} |
| Data de Geração | ${generatedAt} |
| Algoritmo | ${assessment.algo_version} |
| I-RA | ${pillarLabel(pillarScores?.RA?.score)} |
| I-AO | ${pillarLabel(pillarScores?.AO?.score)} |
| I-OE | ${pillarLabel(pillarScores?.OE?.score)} |

Esta tabela é OBRIGATÓRIA e deve ser a primeira coisa do relatório, logo após o título.`;
}

// ========== TEMPLATE-SPECIFIC SYSTEM PROMPTS ==========

const BASE_METHODOLOGY = `FUNDAMENTOS TEÓRICOS DE MARIO BENI:
O turismo deve ser compreendido como um sistema aberto (SISTUR) composto por subsistemas interdependentes. O território é a base de toda atividade turística. A governança pública é condição para o desenvolvimento turístico efetivo. O marketing turístico só deve ser acionado após consolidação da base territorial e institucional.

OS TRÊS EIXOS SISTUR:
1. I-RA — Relações Ambientais: Contexto territorial, meio ambiente, dados demográficos, segurança, saneamento
2. I-AO — Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional
3. I-OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, qualificação profissional

CLASSIFICAÇÃO: ADEQUADO (≥67%), ATENÇÃO (34-66%), CRÍTICO (≤33%)

FONTES DE DADOS — TRANSPARÊNCIA:
- Dados obtidos automaticamente de bases públicas realmente disponíveis para o município: População, PIB per capita, Densidade, Área, IDH, IDEB, Leitos hospitalares, Cobertura de saúde, Receita própria, Despesa com turismo, Meios de hospedagem e, quando disponível, datasets oficiais abertos do CADASTUR. Confiabilidade: ALTA (5/5).
- Dados de preenchimento manual: Taxa de escolarização e quaisquer indicadores que não retornem valor oficial válido no momento da coleta.
- Indicadores locais coletados pelo operador do diagnóstico.
IMPORTANTE: Ao citar fontes no relatório, especifique se o dado veio de API oficial ou de preenchimento manual.`;

function getSystemPrompt(template: string, isEnterprise: boolean): string {
  if (isEnterprise) {
    return getEnterpriseSystemPrompt(template);
  }
  return getTerritorialSystemPrompt(template);
}

function getTerritorialSystemPrompt(template: string): string {
  const common = `Você é um analista técnico em turismo público. Gere um relatório seguindo estritamente a metodologia SISTUR.

${BASE_METHODOLOGY}

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- Comece SEMPRE com o título "# Relatório SISTUR" seguido da tabela de ficha técnica fornecida
- Use markdown com headers hierárquicos (# ## ###)
- SEMPRE apresente indicadores em TABELAS MARKDOWN (| col1 | col2 |)
- NUNCA liste indicadores como texto corrido quando puder usar tabela
- Para cada eixo: tabela com Indicador | Score | Status | Benchmark | Observação
- Banco de Ações em tabela: Ação | Pilar | Prazo | Responsável | Prioridade
- Linguagem institucional, clara e objetiva
- Justifique conclusões com dados. Conecte: dado → impacto → decisão
- Se estimar dados: "[ESTIMADO]"`;

  if (template === 'executivo') {
    return `${common}

TIPO: RESUMO EXECUTIVO — Máximo 1200 palavras. Objetivo: dar ao gestor uma visão rápida para tomar decisões.

ESTRUTURA OBRIGATÓRIA:
# Resumo Executivo SISTUR — [Nome do Destino]
[Tabela de Ficha Técnica — obrigatória]

## 1. Panorama Geral
- UM parágrafo com a situação geral do destino (3-4 frases)
- Tabela com os 3 eixos: Eixo | Score | Status | Resumo

## 2. Alertas Críticos
- Flags IGMA ativas e seu significado prático (se houver)
- Top 3 indicadores mais críticos em tabela

## 3. Prioridades Imediatas (Top 5)
- Tabela: # | Ação | Pilar | Impacto Esperado | Prazo

## 4. Quick Wins
- 3 ações de baixo custo e alto impacto, cada uma em 2-3 linhas

## 5. Próxima Revisão
- Data recomendada e o que monitorar

NÃO INCLUA: contextualização histórica, metodologia detalhada, inventário turístico, considerações filosóficas. Vá direto aos resultados e ações.`;
  }

  if (template === 'investidor') {
    return `${common}

TIPO: RELATÓRIO PARA INVESTIDORES — 1500-2000 palavras. Objetivo: apresentar oportunidades de investimento com análise de risco e retorno.

ESTRUTURA OBRIGATÓRIA:
# Análise de Investimento Turístico — [Nome do Destino]
[Tabela de Ficha Técnica — obrigatória]

## 1. Tese de Investimento
- Resumo em 1 parágrafo: por que este destino merece atenção de investidores
- Tabela: Eixo | Score | Tendência | Oportunidade

## 2. Potencial Turístico
- Ativos turísticos existentes
- Demanda projetada (baseada em dados disponíveis)
- Posição competitiva vs destinos similares

## 3. Análise de Riscos
- Tabela: Risco | Severidade | Probabilidade | Mitigação
- Basear nos gargalos e flags IGMA identificados

## 4. Oportunidades de Investimento
- Para CADA oportunidade: Descrição | Investimento Estimado | Retorno Esperado | Prazo
- Priorizar por relação custo-benefício

## 5. Infraestrutura e Gaps
- O que já existe vs o que falta
- Tabela: Infraestrutura | Status Atual | Necessidade | Investimento Est.

## 6. Indicadores-Chave para Monitoramento
- KPIs que o investidor deve acompanhar
- Tabela: KPI | Valor Atual | Meta | Benchmark Setor

## 7. Conclusão e Recomendação
- Rating geral de atratividade (usando scores dos eixos)
- Horizonte de retorno estimado
- Próximos passos para due diligence

LINGUAGEM: Persuasiva mas fundamentada em dados. Destaque oportunidades de negócio. Use termos como ROI, payback, benchmark, upside.`;
  }

  // COMPLETO (default)
  return `${common}

TIPO: RELATÓRIO COMPLETO — Mínimo 2500 palavras. Análise técnica detalhada para equipe técnica e gestores públicos.

ESTRUTURA OBRIGATÓRIA:
# Relatório SISTUR — [Nome do Destino]
[Tabela de Ficha Técnica — obrigatória]

## 1. Sumário Executivo
- Visão geral em 1 parágrafo
- Tabela consolidada dos 3 eixos

## 2. Contextualização do Município
- Informações territoriais, demográficas e econômicas relevantes
- Posição no contexto turístico regional

## 3. Metodologia SISTUR
- Breve descrição dos 3 eixos e critérios de classificação
- Fontes de dados utilizadas (IBGE, Cadastur, etc.)

## 4. Diagnóstico por Eixo SISTUR
### 4.1. I-RA — Relações Ambientais
- Tabela: Indicador | Score | Status | Fonte | Observação
- EVIDÊNCIAS: dados brutos e contexto
- LEITURA TÉCNICA: interpretação dos scores
- IMPLICAÇÕES: consequências para o destino

### 4.2. I-AO — Ações Operacionais
(mesma estrutura)

### 4.3. I-OE — Organização Estrutural
(mesma estrutura)

## 5. Alertas Sistêmicos IGMA
- Flags ativas e suas implicações
- Bloqueios e restrições aplicáveis

## 6. Análise Integrada
- Inter-relação entre os eixos
- Efeitos cascata identificados

## 7. Gargalos e Prescrições
- Tabela: Gargalo | Severidade | Pilar | Prescrição | Agente Responsável

## 8. Prognóstico e Diretrizes
- Cenário tendencial vs cenário desejado
- Diretrizes estratégicas por horizonte temporal

## 9. Banco de Ações
- Tabela: Ação | Pilar | Prazo | Responsável | Prioridade | Status

## 10. Considerações Finais
- Síntese das conclusões
- Próxima revisão recomendada: data e justificativa`;
}

function getEnterpriseSystemPrompt(template: string): string {
  const common = `Você é um consultor estratégico em gestão hoteleira e empreendimentos turísticos. Use a metodologia SISTUR adaptada para o setor privado.

OS TRÊS EIXOS SISTUR ENTERPRISE:
1. I-RA — Responsabilidade Ambiental: Eficiência energética, gestão hídrica, resíduos, certificações ESG
2. I-AO — Ações Operacionais: Governança corporativa, saúde financeira, maturidade tecnológica, parcerias
3. I-OE — Organização Estrutural: Qualidade de serviço, satisfação do hóspede, ocupação, capacitação

CLASSIFICAÇÃO: BOM (≥67%), ATENÇÃO (34-66%), CRÍTICO (≤33%)

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- Comece SEMPRE com título seguido da tabela de ficha técnica fornecida
- Use tabelas markdown para todos os conjuntos de dados
- Linguagem executiva, orientada a resultados
- Conecte: métrica → gap → ação → resultado esperado`;

  if (template === 'executivo') {
    return `${common}

TIPO: RESUMO EXECUTIVO ENTERPRISE — Máximo 1000 palavras.

ESTRUTURA:
# Resumo Executivo — [Nome]
[Ficha Técnica]
## 1. Performance Geral (tabela dos 3 eixos)
## 2. Top 3 KPIs Críticos (tabela)
## 3. Ações Prioritárias (5 itens, tabela)
## 4. Quick Wins com ROI Estimado
## 5. Próximos Passos`;
  }

  if (template === 'investidor') {
    return `${common}

TIPO: RELATÓRIO PARA INVESTIDORES — 1500 palavras. Foco em ROI e oportunidades.

ESTRUTURA:
# Análise de Investimento — [Nome]
[Ficha Técnica]
## 1. Tese de Investimento (1 parágrafo)
## 2. Performance Atual (tabela de KPIs vs benchmark)
## 3. Análise de Riscos (tabela: Risco | Severidade | Mitigação)
## 4. Oportunidades de Melhoria (tabela: Oportunidade | Investimento | ROI Est.)
## 5. Projeções e Cenários
## 6. Recomendação Final`;
  }

  // COMPLETO
  return `${common}

TIPO: RELATÓRIO ENTERPRISE COMPLETO — Mínimo 2500 palavras.

ESTRUTURA:
# Relatório SISTUR Enterprise — [Nome]
[Ficha Técnica]
## 1. Sumário Executivo para Gestão
## 2. Perfil do Empreendimento
## 3. Metodologia SISTUR Enterprise
## 4. Diagnóstico por Categoria Funcional (tabela por categoria)
## 5. Análise de Gargalos Operacionais (tabela)
## 6. Planos de Ação em Andamento
## 7. Recomendações Estratégicas (curto/médio/longo prazo)
## 8. Prescrições de Capacitação
## 9. Roadmap de Implementação (tabela: Ação | Categoria | Investimento | Prazo | KPI)
## 10. Considerações Finais`;
}

// ========== MAIN ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    const { assessmentId, destinationName, pillarScores, issues, prescriptions, forceRegenerate, reportTemplate = 'completo', visibility = 'personal', environment = 'production' } = await req.json();
    
    // Verify access
    const { data: profile } = await supabase.from('profiles').select('org_id, viewing_demo_org_id').eq('user_id', userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedOrgIds = [profile.org_id];
    if (profile.viewing_demo_org_id) allowedOrgIds.push(profile.viewing_demo_org_id);

    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, destinations(name, uf, ibge_code)')
      .eq('id', assessmentId)
      .single();
    
    if (!assessment || !allowedOrgIds.includes(assessment.org_id)) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isEnterprise = assessment.diagnostic_type === 'enterprise';
    console.log('Diagnostic type:', assessment.diagnostic_type, 'Template:', reportTemplate);

    // Check if data changed since last report
    const { data: existingReport } = await supabaseAdmin
      .from('generated_reports')
      .select('id, created_at')
      .eq('assessment_id', assessmentId)
      .maybeSingle();

    if (existingReport && !forceRegenerate) {
      const reportDate = new Date(existingReport.created_at);
      const calcDate = assessment.calculated_at ? new Date(assessment.calculated_at) : null;
      const updatedDate = new Date(assessment.updated_at);
      
      if (calcDate && reportDate > calcDate && reportDate > updatedDate) {
        console.log('No new data since last report. Skipping.');
        return new Response(JSON.stringify({ skipped: true, message: 'Não há dados novos desde o último relatório.', reportId: existingReport.id }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch all data in parallel (including destination-specific KB files)
    const destinationId = assessment.destination_id;
    const [indicatorScoresRes, alertsRes, actionPlansRes, indicatorValuesRes, globalRefsRes, kbFilesRes] = await Promise.all([
      supabase.from('indicator_scores').select('*, indicators(code, name, pillar, theme, description, direction, indicator_scope, benchmark_min, benchmark_max, benchmark_target)').eq('assessment_id', assessmentId).order('score', { ascending: true }),
      supabase.from('alerts').select('*').eq('assessment_id', assessmentId).eq('is_dismissed', false),
      supabase.from('action_plans').select('*').eq('assessment_id', assessmentId).order('priority', { ascending: true }),
      supabase.from('indicator_values').select('*, indicators(code, name, pillar, theme, unit)').eq('assessment_id', assessmentId),
      supabaseAdmin.from('global_reference_files').select('file_name, category, summary, description').eq('is_active', true).not('summary', 'is', null),
      // Fetch KB files for this destination + global KB files
      supabase.from('knowledge_base_files').select('id, file_name, description, category').eq('is_active', true).or(destinationId ? `destination_id.eq.${destinationId},destination_id.is.null` : 'destination_id.is.null'),
    ]);

    const indicatorScores = indicatorScoresRes.data || [];
    const alerts = alertsRes.data || [];
    const actionPlans = actionPlansRes.data || [];
    const indicatorValues = indicatorValuesRes.data || [];
    const globalRefs = globalRefsRes.data || [];
    const kbFiles = kbFilesRes.data || [];

    console.log('Report for:', destinationName, isEnterprise ? '(ENTERPRISE)' : '(TERRITORIAL)');
    console.log('Indicators:', indicatorScores.length, 'Issues:', issues?.length || 0, 'Prescriptions:', prescriptions?.length || 0, 'Global refs:', globalRefs.length, 'KB files:', kbFiles.length);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build prompts
    const systemPrompt = getSystemPrompt(reportTemplate, isEnterprise);

    const prescriptionsText = prescriptions?.length > 0 
      ? prescriptions.map((p: any) => `- [${p.status}] ${p.justification} (Pilar: ${p.pillar}, Agente: ${p.target_agent}, Prioridade: ${p.priority || 'N/A'})`).join('\n')
      : 'Nenhuma prescrição.';

    const issuesText = issues?.length > 0 
      ? issues.map((issue: any) => `- [${issue.severity}] ${issue.title} (Pilar: ${issue.pillar}, Tema: ${issue.theme}, Interpretação: ${issue.interpretation || 'N/A'})`).join('\n')
      : 'Nenhum problema identificado.';

    const alertsText = alerts.length > 0
      ? alerts.map((a: any) => `- [${a.alert_type}] ${a.message} (Pilar: ${a.pillar}, Ciclos: ${a.consecutive_cycles})`).join('\n')
      : 'Nenhum alerta ativo.';

    const coverBlock = buildCoverBlock(destinationName, assessment, pillarScores, reportTemplate);

    const indicatorsDetail = isEnterprise 
      ? formatIndicatorsByCategory(indicatorScores) 
      : formatIndicatorScores(indicatorScores);

    const userPrompt = `Gere o relatório para: ${destinationName}${assessment.destinations?.uf ? ` — ${assessment.destinations.uf}` : ''}

${coverBlock}

=== DADOS DO DIAGNÓSTICO ===

SCORES DOS EIXOS:
- I-RA: ${pillarScores?.RA?.score !== undefined ? (pillarScores.RA.score * 100).toFixed(1) + '%' : 'N/C'} — ${pillarScores?.RA?.severity || 'N/A'}
- I-AO: ${pillarScores?.AO?.score !== undefined ? (pillarScores.AO.score * 100).toFixed(1) + '%' : 'N/C'} — ${pillarScores?.AO?.severity || 'N/A'}
- I-OE: ${pillarScores?.OE?.score !== undefined ? (pillarScores.OE.score * 100).toFixed(1) + '%' : 'N/C'} — ${pillarScores?.OE?.severity || 'N/A'}

FLAGS IGMA:
${formatIGMAFlags(assessment.igma_flags as Record<string, boolean> | null)}

ALERTAS:
${alertsText}

INDICADORES:
${indicatorsDetail}

VALORES BRUTOS:
${formatIndicatorValues(indicatorValues)}

GARGALOS:
${issuesText}

PRESCRIÇÕES:
${prescriptionsText}

PLANOS DE AÇÃO:
${formatActionPlans(actionPlans)}

${globalRefs.length > 0 ? `=== DOCUMENTOS DE REFERÊNCIA NACIONAL ===
Os seguintes documentos oficiais devem ser usados como contexto para enriquecer a análise, alinhar recomendações com metas nacionais e fundamentar diretrizes:

${globalRefs.map((ref: any) => `### ${ref.file_name} (${ref.category})
${ref.description ? `Descrição: ${ref.description}` : ''}
${ref.summary}
`).join('\n')}

INSTRUÇÕES SOBRE REFERÊNCIAS:
- Contextualize os resultados do destino em relação às metas e diretrizes nacionais
- Nas prescrições, referencie princípios e eixos dos documentos oficiais quando aplicável
- Aponte alinhamento ou desalinhamento com políticas públicas vigentes
- Use dados e benchmarks dos documentos para enriquecer comparações
` : ''}
${kbFiles.length > 0 ? `=== BASE DE CONHECIMENTO DO DESTINO ===
Os seguintes documentos foram associados a este destino e devem ser considerados como referência adicional:

${kbFiles.map((f: any) => `- ${f.file_name}${f.description ? ` — ${f.description}` : ''} (Categoria: ${f.category})`).join('\n')}

INSTRUÇÕES SOBRE BASE DE CONHECIMENTO:
- Use as informações desses documentos para contextualizar e enriquecer a análise
- Referencie dados e diretrizes presentes nesses documentos quando relevante
- Esses documentos representam dados locais e diretrizes específicas do destino
` : ''}
=== INSTRUÇÕES FINAIS ===
1. COMECE com o título e IMEDIATAMENTE a tabela de Ficha Técnica fornecida acima — NÃO pule essa tabela
2. Siga EXATAMENTE a estrutura definida no system prompt para o template "${reportTemplate}"
3. Use TABELAS MARKDOWN para todos os conjuntos de dados
4. Justifique todas as conclusões com dados fornecidos
${globalRefs.length > 0 ? '5. Referencie documentos oficiais quando contextualizar resultados e prescrições' : ''}
${kbFiles.length > 0 ? `${globalRefs.length > 0 ? '6' : '5'}. Referencie documentos da base de conhecimento do destino quando aplicável` : ''}`;

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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar relatório" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Streaming report from AI gateway');
    
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    let fullContent = '';

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
          
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* ignore */ }
            }
          }
        }
        
        await writer.close();

        if (fullContent) {
          const { data: existing } = await supabaseAdmin
            .from('generated_reports')
            .select('id')
            .eq('assessment_id', assessmentId)
            .maybeSingle();
          
          const kbFileIds = kbFiles.map((f: any) => f.id);
          if (existing) {
            const { error } = await supabaseAdmin
              .from('generated_reports')
              .update({ report_content: fullContent, created_at: new Date().toISOString(), kb_file_ids: kbFileIds, visibility, environment })
              .eq('id', existing.id);
            if (error) console.error('Error updating report:', error);
            else console.log('Report updated successfully');
          } else {
            const { error } = await supabaseAdmin
              .from('generated_reports')
              .insert({ org_id: assessment.org_id, assessment_id: assessmentId, destination_name: destinationName, report_content: fullContent, created_by: userId, kb_file_ids: kbFileIds, visibility, environment });
            if (error) console.error('Error saving report:', error);
            else console.log('Report saved successfully');
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        await writer.abort(err);
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

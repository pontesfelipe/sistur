import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== HELPER FUNCTIONS ==========

/** Format number using Brazilian standard: comma for decimal, period for thousands */
function formatNumberBR(value: number, decimals = 1): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPctBR(score: number): string {
  return formatNumberBR(score * 100, 1);
}

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
  const pct = formatPctBR(score);
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
    
    result += `\n${pillar} (${scores.length} indicadores, média: ${formatPctBR(avg)}%):\n`;
    result += `  Críticos: ${critical.length}, Atenção: ${moderate.length}, Adequados: ${scores.length - critical.length - moderate.length}\n`;
    
    scores.forEach((s: any) => {
      const status = s.score <= 0.33 ? 'CRÍTICO' : s.score <= 0.66 ? 'ATENÇÃO' : 'BOM';
      const benchmark = s.indicators?.benchmark_target ? ` (benchmark: ${s.indicators.benchmark_target})` : '';
      result += `    * ${s.indicators?.name || s.indicators?.code}: ${formatPctBR(s.score)}% [${status}] - Tema: ${s.indicators?.theme || 'N/A'}${benchmark}\n`;
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
    
    result += `\n## ${theme} (Status: ${status}, Média: ${formatPctBR(avg)}%)\n`;
    scores.forEach((s: any) => {
      const kpiStatus = s.score <= 0.33 ? 'CRÍTICO' : s.score <= 0.66 ? 'ATENÇÃO' : 'BOM';
      const benchmarkMin = s.indicators?.benchmark_min !== null ? s.indicators.benchmark_min : 'N/A';
      const benchmarkMax = s.indicators?.benchmark_max !== null ? s.indicators.benchmark_max : 'N/A';
      const benchmarkTarget = s.indicators?.benchmark_target !== null ? s.indicators.benchmark_target : 'N/A';
      result += `  - ${s.indicators?.name || s.indicators?.code}: ${formatPctBR(s.score)}% [${kpiStatus}]\n`;
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

function formatEnterpriseProfile(profile: any): string {
  if (!profile) return '';

  let result = '\n=== PERFIL DO EMPREENDIMENTO ===\n';
  if (profile.property_type) result += `Tipo: ${profile.property_type}\n`;
  if (profile.star_rating) result += `Categoria: ${profile.star_rating} estrelas\n`;
  if (profile.room_count) result += `Número de UHs: ${profile.room_count}\n`;
  if (profile.suite_count) result += `Suítes: ${profile.suite_count}\n`;
  if (profile.total_capacity) result += `Capacidade total: ${profile.total_capacity}\n`;
  if (profile.employee_count) result += `Funcionários: ${profile.employee_count}\n`;
  if (profile.years_in_operation) result += `Anos de operação: ${profile.years_in_operation}\n`;
  if (profile.seasonality) result += `Sazonalidade: ${profile.seasonality}\n`;
  if (profile.target_market?.length) result += `Mercado-alvo: ${profile.target_market.join(', ')}\n`;
  if (profile.average_occupancy_rate) result += `Taxa de ocupação média: ${profile.average_occupancy_rate}%\n`;
  if (profile.average_daily_rate) result += `ADR médio: R$ ${profile.average_daily_rate}\n`;
  if (profile.certifications?.length) result += `Certificações: ${profile.certifications.join(', ')}\n`;
  if (profile.sustainability_initiatives?.length) result += `Iniciativas de sustentabilidade: ${profile.sustainability_initiatives.join(', ')}\n`;
  if (profile.accessibility_features?.length) result += `Acessibilidade: ${profile.accessibility_features.join(', ')}\n`;

  // Review analysis data — the core intelligence from online reviews
  if (profile.review_analysis) {
    const ra = profile.review_analysis;
    result += '\n=== ANÁLISE DE REVIEWS ONLINE (IA) ===\n';
    result += `Estabelecimento pesquisado: ${ra.businessName || 'N/A'} em ${ra.location || 'N/A'}\n`;
    result += `Data da busca: ${ra.searchedAt || 'N/A'}\n`;
    if (ra.review_score != null) result += `Nota média: ${ra.review_score}/5\n`;
    if (ra.review_count != null) result += `Quantidade de reviews: ~${ra.review_count}\n`;
    if (ra.sentiment_score != null) result += `Score de sentimento: ${ra.sentiment_score}/5\n`;
    if (ra.digital_maturity != null) result += `Maturidade digital: ${ra.digital_maturity}/5\n`;
    if (ra.platforms_found?.length) result += `Plataformas encontradas: ${ra.platforms_found.join(', ')}\n`;
    if (ra.sentiment_summary) result += `\nResumo de sentimento: ${ra.sentiment_summary}\n`;

    if (ra.guest_experience_dimensions) {
      result += '\nDimensões da Experiência do Hóspede:\n';
      const dims = ra.guest_experience_dimensions;
      for (const [key, val] of Object.entries(dims)) {
        if (val != null) result += `  - ${key}: ${val}/5\n`;
      }
    }

    if (ra.recurring_themes?.length) result += `\nTemas recorrentes: ${ra.recurring_themes.join(', ')}\n`;
    if (ra.strengths?.length) result += `\nPontos fortes:\n${ra.strengths.map((s: string) => `  ✓ ${s}`).join('\n')}\n`;
    if (ra.weaknesses?.length) result += `\nPontos de atenção:\n${ra.weaknesses.map((w: string) => `  ⚠ ${w}`).join('\n')}\n`;
    if (ra.sample_positive_quotes?.length) result += `\nCitações positivas:\n${ra.sample_positive_quotes.map((q: string) => `  "${q}"`).join('\n')}\n`;
    if (ra.sample_negative_quotes?.length) result += `\nCitações negativas:\n${ra.sample_negative_quotes.map((q: string) => `  "${q}"`).join('\n')}\n`;
    if (ra.recommendation) result += `\nRecomendação estratégica: ${ra.recommendation}\n`;
    if (ra.sources?.length) {
      result += `\nFontes:\n`;
      ra.sources.forEach((s: any) => {
        result += `  - ${s.platform}${s.rating != null ? ` (${s.rating}/5)` : ''}: ${s.url}\n`;
      });
    }
  }

  return result;
}

function formatDataSnapshots(snapshots: any[]): string {
  if (!snapshots || snapshots.length === 0) return '';
  
  const bySource: Record<string, any[]> = {};
  snapshots.forEach((s: any) => {
    const src = s.source_code || 'MANUAL';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(s);
  });

  const sourceLabels: Record<string, string> = {
    'IBGE_AGREGADOS': 'IBGE (Agregados)',
    'IBGE_PESQUISAS': 'IBGE (Pesquisas)',
    'DATASUS': 'DATASUS',
    'STN': 'STN / Tesouro Nacional',
    'CADASTUR': 'CADASTUR',
    'MAPA_TURISMO': 'Mapa do Turismo Brasileiro',
    'MANUAL': 'Preenchimento Manual',
  };

  let result = '\n=== PROVENIÊNCIA DOS DADOS (DATA SNAPSHOTS) ===\n';
  result += 'Detalhamento das fontes oficiais utilizadas no cálculo dos indicadores:\n\n';
  
  for (const [source, items] of Object.entries(bySource)) {
    const label = sourceLabels[source] || source;
    const autoCount = items.filter(i => !i.was_manually_adjusted).length;
    const manualCount = items.filter(i => i.was_manually_adjusted).length;
    const avgConfidence = items.reduce((sum, i) => sum + (i.confidence_level || 0), 0) / items.length;
    
    result += `### ${label} (${items.length} indicadores, Confiabilidade média: ${formatNumberBR(avgConfidence, 0)}/5)\n`;
    if (manualCount > 0) result += `  ⚠️ ${manualCount} ajustado(s) manualmente\n`;
    
    items.forEach((item: any) => {
      const val = item.value_used !== null ? item.value_used : (item.value_used_text || 'N/A');
      const year = item.reference_year ? ` (ref: ${item.reference_year})` : '';
      const adjusted = item.was_manually_adjusted ? ' [AJUSTADO MANUALMENTE]' : '';
      result += `  - ${item.indicator_code}: ${val}${year}${adjusted}\n`;
    });
    result += '\n';
  }
  
  return result;
}




function formatDestinationMetadata(dest: any): string {
  if (!dest) return '';
  const parts: string[] = [];
  if (dest.tourism_region) parts.push(`Região Turística: ${dest.tourism_region}`);
  if (dest.municipality_type) parts.push(`Categoria no Mapa: ${dest.municipality_type}`);
  if (dest.has_pdt !== null) parts.push(`Possui PDT: ${dest.has_pdt ? 'Sim' : 'Não'}`);
  if (dest.latitude && dest.longitude) parts.push(`Coordenadas: ${dest.latitude}, ${dest.longitude}`);
  if (parts.length === 0) return '';
  return `\nMETADADOS DO DESTINO:\n${parts.map(p => `- ${p}`).join('\n')}\n`;
}

function formatEnterpriseValues(values: any[]): string {
  if (!values || values.length === 0) return '';
  
  const byCategory: Record<string, any[]> = {};
  values.forEach((v: any) => {
    const cat = v.enterprise_indicators?.enterprise_indicator_categories?.name || 'Outros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(v);
  });

  let result = '\n=== VALORES ENTERPRISE (DADOS BRUTOS) ===\n';
  for (const [category, items] of Object.entries(byCategory)) {
    result += `\n### ${category}\n`;
    items.forEach((v: any) => {
      const name = v.enterprise_indicators?.name || v.indicator_id;
      const unit = v.enterprise_indicators?.unit || '';
      const benchMin = v.enterprise_indicators?.benchmark_min;
      const benchMax = v.enterprise_indicators?.benchmark_max;
      let benchStr = '';
      if (benchMin !== null && benchMin !== undefined) benchStr += ` | Benchmark min: ${benchMin}`;
      if (benchMax !== null && benchMax !== undefined) benchStr += ` | Benchmark max: ${benchMax}`;
      result += `  - ${name}: ${v.value}${unit ? ` ${unit}` : ''}${benchStr}\n`;
    });
  }
  return result;
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

// ========== MEC / ABNT FORMATTING STANDARDS ==========

const MEC_FORMATTING_RULES = `
PADRÕES DE FORMATAÇÃO — MEC / ABNT (OBRIGATÓRIO):
O relatório deve seguir as recomendações do Ministério da Educação (MEC) e normas ABNT para documentos técnicos e acadêmicos:

NORMAS APLICÁVEIS:
- ABNT NBR 14724:2011 — Trabalhos acadêmicos (estrutura geral)
- ABNT NBR 6024:2012 — Numeração progressiva de seções
- ABNT NBR 6023:2018 — Referências bibliográficas
- ABNT NBR 6028:2021 — Resumo e abstract
- ABNT NBR 10520:2023 — Citações em documentos

ESTRUTURA PRÉ-TEXTUAL (o DOCX adicionará automaticamente):
- Capa com identificação institucional (SISTUR / Organização)
- Folha de rosto com título, subtítulo, natureza do trabalho
- Resumo com palavras-chave

ESTRUTURA TEXTUAL — REGRAS:
1. Seções primárias (##) devem ser NUMERADAS (1, 2, 3...) e em NEGRITO
2. Subseções (###) numeradas progressivamente (1.1, 1.2, 2.1...) em negrito
3. Sub-subseções (####) numeradas (1.1.1, 1.1.2...) em negrito itálico
4. Parágrafos devem ser concisos, com linguagem técnica e impessoal (3ª pessoa)
5. Citações diretas com mais de 3 linhas: recuo de 4cm, fonte menor, sem aspas
6. Citações indiretas devem citar autor e ano: (BENI, 2001)
7. Quando citar Mario Beni ou outros autores, usar formato ABNT: (SOBRENOME, ano)
8. Figuras e tabelas devem ser referenciadas no texto antes de aparecerem
9. Tabelas: título ACIMA da tabela com numeração (Tabela 1 — Título)
10. Fonte da tabela ABAIXO da tabela: "Fonte: IBGE (2022)"

ESTRUTURA PÓS-TEXTUAL — OBRIGATÓRIO:
1. REFERÊNCIAS (NBR 6023): lista em ordem alfabética de todas as fontes citadas
   Formato para dados oficiais:
   - INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA (IBGE). Nome do dado. Ano. Disponível em: URL.
   - BRASIL. Ministério do Turismo. Mapa do Turismo Brasileiro. Ano.
   - BRASIL. Ministério da Saúde. DATASUS. Nome do indicador. Ano.
   - BRASIL. Secretaria do Tesouro Nacional (STN). Dados fiscais. Ano.
   - BRASIL. Ministério do Turismo. CADASTUR. Dados de registro. Ano.
2. APÊNDICE (se houver notas adicionais ou metodologia estendida)
3. GLOSSÁRIO com termos técnicos do SISTUR (RA, OE, AO, IGMA, I-SISTUR)

LINGUAGEM:
- Impessoal: "Verifica-se que..." em vez de "Verificamos que..."
- Verbos na 3ª pessoa ou voz passiva
- Termos técnicos na primeira menção com definição entre parênteses
- Siglas: por extenso na primeira menção, ex: "Relações Ambientais (RA)"

FORMATAÇÃO NUMÉRICA — PADRÃO BRASILEIRO (OBRIGATÓRIO):
- Usar VÍRGULA como separador decimal: 65,3% (CORRETO) — NÃO 65.3%
- Usar PONTO como separador de milhar: 45.321 habitantes (CORRETO) — NÃO 45,321
- Exemplos corretos: "População: 45.321 hab.", "Score: 67,5%", "PIB per capita: R$ 32.450,00", "Área: 1.234,56 km²"
- NUNCA usar o formato americano/inglês com ponto decimal e vírgula de milhar
- Esta regra aplica-se a TODOS os números no relatório, sem exceção`;

// ========== TEMPLATE-SPECIFIC SYSTEM PROMPTS ==========

const BASE_METHODOLOGY = `FUNDAMENTOS TEÓRICOS DE MARIO BENI:
O turismo deve ser compreendido como um sistema aberto (SISTUR) composto por subsistemas interdependentes. O território é a base de toda atividade turística. A governança pública é condição para o desenvolvimento turístico efetivo. O marketing turístico só deve ser acionado após consolidação da base territorial e institucional.

OS TRÊS EIXOS SISTUR:
1. I-RA — Relações Ambientais: Contexto territorial, meio ambiente, dados demográficos, segurança, saneamento
2. I-AO — Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional
3. I-OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, qualificação profissional

CLASSIFICAÇÃO: ADEQUADO (≥67%), ATENÇÃO (34-66%), CRÍTICO (≤33%)

FONTES DE DADOS — TRANSPARÊNCIA E RASTREABILIDADE:
Os dados do diagnóstico são coletados automaticamente de fontes oficiais e complementados por dados locais. Cada indicador possui rastreabilidade completa de proveniência:
- IBGE (Agregados e Pesquisas): População, PIB per capita, Densidade, Área, IDH, IDEB, Índice de Gini, Incidência de pobreza, Taxa de mortalidade infantil, Mortalidade geral. Confiabilidade: ALTA (5/5).
- DATASUS: Leitos hospitalares, Cobertura de saúde. Confiabilidade: ALTA (5/5).
- STN / Tesouro Nacional: Receita própria, Despesa com turismo. Confiabilidade: ALTA (5/5).
- CADASTUR / dados.gov.br: Guias de turismo, Agências de turismo, Meios de hospedagem. Confiabilidade: ALTA (4/5 — atualização trimestral).
- Mapa do Turismo Brasileiro (API REST mapa.turismo.gov.br): Categoria (A-E), Região turística, Empregos formais em turismo, Estabelecimentos turísticos, Visitantes nacionais e internacionais, Arrecadação turística, Conselho municipal de turismo. Confiabilidade: ALTA (5/5).
- Dados de preenchimento manual: Taxa de escolarização e quaisquer indicadores que não retornem valor oficial válido no momento da coleta.
- Base de Conhecimento (KB): Documentos locais do destino (PDFs, relatórios, planos diretores) e referências nacionais com resumos extraídos por IA.

REGRA CRÍTICA E INEGOCIÁVEL DE FONTES:
1. CADA dado numérico mencionado no relatório DEVE ter a fonte entre parênteses imediatamente após o valor. Exemplo: "População: 45.321 hab. (IBGE, 2022)"
2. TODAS as tabelas de indicadores DEVEM conter uma coluna "Fonte" indicando a origem do dado (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo, Preenchimento Manual, etc.)
3. Se houver snapshots de proveniência, use-os para identificar EXATAMENTE de onde cada valor veio, incluindo o ano de referência
4. Se o dado veio de preenchimento manual, indique CLARAMENTE: "(Fonte: Preenchimento manual)"
5. Quando documentos da Base de Conhecimento informarem contexto adicional, referencie-os pelo nome
6. O relatório DEVE terminar com uma seção "## Referências" em formato ABNT NBR 6023 listando TODAS as fontes oficiais consultadas
7. NUNCA apresente um dado sem citar a fonte — se a fonte for desconhecida, indique "(Fonte: Não identificada)"

${MEC_FORMATTING_RULES}`;

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
- Para cada eixo: tabela com Indicador | Score | Status | Fonte | Observação
- Banco de Ações em tabela: Ação | Pilar | Prazo | Responsável | Prioridade
- Linguagem institucional, clara e objetiva
- Justifique conclusões com dados. Conecte: dado → impacto → decisão
- Se estimar dados: "[ESTIMADO]"
- SEMPRE inclua uma coluna "Fonte" nas tabelas de indicadores, citando a origem dos dados`;

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
- Tabela: KPI | Valor Atual | Meta | Benchmark Setor | Fonte

## 7. Conclusão e Recomendação
- Rating geral de atratividade (usando scores dos eixos)
- Horizonte de retorno estimado
- Próximos passos para due diligence

LINGUAGEM: Persuasiva mas fundamentada em dados. Destaque oportunidades de negócio. Use termos como ROI, payback, benchmark, upside.`;
  }

  // COMPLETO (default)
  return `${common}

TIPO: RELATÓRIO COMPLETO — Mínimo 2500 palavras. Análise técnica detalhada para equipe técnica e gestores públicos.
Seguir integralmente as normas MEC/ABNT indicadas no system prompt.

ESTRUTURA OBRIGATÓRIA (MEC/ABNT):
# Relatório SISTUR — [Nome do Destino]
[Tabela de Ficha Técnica — obrigatória]

## Resumo
- Síntese do relatório em até 500 palavras (NBR 6028)
- **Palavras-chave**: Turismo. SISTUR. Diagnóstico Territorial. [Nome do Destino]. [UF].

## 1 Introdução
- Apresentação do objeto de estudo e contextualização
- Objetivo do diagnóstico
- Estrutura do relatório

## 2 Contextualização do Município
- Informações territoriais, demográficas e econômicas relevantes
- Posição no contexto turístico regional (usar dados do Mapa do Turismo: categoria, região turística)
- Metadados do destino (se fornecidos)

## 3 Metodologia
### 3.1 Fundamentação Teórica
- Breve descrição do modelo sistêmico de Beni (BENI, 2001) e os 3 eixos
- Critérios de classificação (Adequado, Atenção, Crítico)
### 3.2 Fontes de Dados
- Fontes utilizadas (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo Brasileiro)
- Tabela 1 — Resumo das fontes: Fonte | Tipo de dado | Confiabilidade | Ano de referência
- Quantos indicadores vieram de fontes oficiais automáticas vs preenchimento manual

## 4 Diagnóstico por Eixo SISTUR
### 4.1 Índice de Relações Ambientais (I-RA)
- Tabela 2 — Indicadores I-RA: Indicador | Score | Status | Fonte | Valor Bruto | Observação
- Análise textual em linguagem impessoal, citando fontes no formato (IBGE, 2022)
### 4.2 Índice de Ações Operacionais (I-AO)
- Tabela 3 — (mesma estrutura)
### 4.3 Índice de Organização Estrutural (I-OE)
- Tabela 4 — (mesma estrutura)

## 5 Alertas Sistêmicos IGMA
- Flags ativas e suas implicações segundo Beni (BENI, 2001)
- Bloqueios e restrições aplicáveis

## 6 Análise Integrada
- Inter-relação entre os eixos
- Efeitos cascata identificados

## 7 Gargalos e Prescrições
- Tabela 5 — Gargalos: Gargalo | Severidade | Pilar | Prescrição | Agente Responsável

## 8 Prognóstico e Diretrizes
- Cenário tendencial vs cenário desejado
- Diretrizes estratégicas por horizonte temporal

## 9 Banco de Ações
- Tabela 6 — Ações: Ação | Pilar | Prazo | Responsável | Prioridade | Status

## 10 Considerações Finais
- Síntese das conclusões
- Próxima revisão recomendada: data e justificativa

## Referências
- Lista em ordem ALFABÉTICA no formato ABNT NBR 6023:2018
- Exemplo: INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA (IBGE). Censo Demográfico 2022. Rio de Janeiro: IBGE, 2022.
- Exemplo: BENI, Mário Carlos. Análise estrutural do turismo. 6. ed. São Paulo: SENAC, 2001.
- Listar TODAS as fontes de dados oficiais, documentos da KB e referências nacionais utilizadas

## Glossário
- Definições de termos técnicos: SISTUR, IGMA, I-RA, I-AO, I-OE, I-SISTUR
- Incluir siglas e termos específicos do turismo utilizados no relatório

## Apêndice
- Documentos da Base de Conhecimento consultados (se houver)
- Notas metodológicas adicionais (se aplicável)`;
}

function getEnterpriseSystemPrompt(template: string): string {
  const common = `Você é um consultor estratégico em gestão hoteleira e empreendimentos turísticos. Use a metodologia SISTUR adaptada para o setor privado.

OS TRÊS EIXOS SISTUR ENTERPRISE:
1. I-RA — Responsabilidade Ambiental: Eficiência energética, gestão hídrica, resíduos, certificações ESG
2. I-AO — Ações Operacionais: Governança corporativa, saúde financeira, maturidade tecnológica, parcerias
3. I-OE — Organização Estrutural: Qualidade de serviço, satisfação do hóspede, ocupação, capacitação

CLASSIFICAÇÃO: BOM (≥67%), ATENÇÃO (34-66%), CRÍTICO (≤33%)

FONTES DE DADOS — RASTREABILIDADE OBRIGATÓRIA:
Cada dado apresentado no relatório DEVE conter a fonte entre parênteses. Exemplos:
- "Taxa de ocupação: 72% (Fonte: Dados do empreendimento — preenchimento manual)"
- "Nota média: 4.2/5 (Fonte: Google Reviews, TripAdvisor)"
- Se houver snapshots de proveniência, use-os para identificar a origem exata
- Se o dado veio de preenchimento manual, indique: "(Fonte: Preenchimento manual)"
- Se o dado veio de reviews online, indique a plataforma: "(Fonte: Google Reviews)"

${MEC_FORMATTING_RULES}

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- Comece SEMPRE com título seguido da tabela de ficha técnica fornecida
- Use tabelas markdown para todos os conjuntos de dados
- TODAS as tabelas DEVEM ter uma coluna "Fonte"
- Tabelas devem ter título numerado ACIMA: "Tabela 1 — Título"
- Fonte da tabela ABAIXO: "Fonte: elaboração própria com dados de..."
- Linguagem institucional e impessoal (3ª pessoa)
- Conecte: métrica → gap → ação → resultado esperado
- Se houver dados de reviews/avaliações online, incorpore na análise de satisfação
- Seção final de Referências em formato ABNT NBR 6023`;

  if (template === 'executivo') {
    return `${common}

TIPO: RESUMO EXECUTIVO ENTERPRISE — Máximo 1000 palavras.

ESTRUTURA:
# Resumo Executivo — [Nome]
[Ficha Técnica]
## 1 Performance Geral (tabela dos 3 eixos)
## 2 KPIs Críticos (tabela com Fonte)
## 3 Ações Prioritárias (5 itens, tabela)
## 4 Quick Wins com ROI Estimado
## 5 Próximos Passos
## Referências (ABNT NBR 6023)`;
  }

  if (template === 'investidor') {
    return `${common}

TIPO: RELATÓRIO PARA INVESTIDORES — 1500 palavras. Foco em ROI e oportunidades.

ESTRUTURA:
# Análise de Investimento — [Nome]
[Ficha Técnica]
## 1 Tese de Investimento (1 parágrafo)
## 2 Performance Atual (tabela de KPIs vs benchmark com Fonte)
## 3 Análise de Riscos (tabela: Risco | Severidade | Mitigação)
## 4 Oportunidades de Melhoria (tabela: Oportunidade | Investimento | ROI Est.)
## 5 Projeções e Cenários
## 6 Recomendação Final
## Referências (ABNT NBR 6023)`;
  }

  // COMPLETO
  return `${common}

TIPO: RELATÓRIO ENTERPRISE COMPLETO — Mínimo 2500 palavras.

ESTRUTURA (MEC/ABNT):
# Relatório SISTUR Enterprise — [Nome]
[Ficha Técnica]

## Resumo
- Síntese em até 500 palavras
- **Palavras-chave**: Gestão Hoteleira. SISTUR. Diagnóstico Enterprise. [Nome].

## 1 Introdução
## 2 Perfil do Empreendimento
## 3 Metodologia SISTUR Enterprise
### 3.1 Fundamentação Teórica
### 3.2 Fontes de Dados (tabela com Fonte | Tipo | Confiabilidade)
## 4 Diagnóstico por Categoria Funcional (tabela por categoria com Fonte)
## 5 Análise de Gargalos Operacionais (tabela)
## 6 Planos de Ação em Andamento
## 7 Recomendações Estratégicas (curto/médio/longo prazo)
## 8 Prescrições de Capacitação
## 9 Roadmap de Implementação (tabela: Ação | Categoria | Investimento | Prazo | KPI)
## 10 Considerações Finais

## Referências
- ABNT NBR 6023:2018 — ordem alfabética

## Glossário
## Apêndice`;
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
      .select('*, destinations(name, uf, ibge_code, tourism_region, municipality_type, has_pdt, latitude, longitude)')
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

    // Fetch all data in parallel
    const destinationId = assessment.destination_id;
    // Use the assessment's org_id to scope KB files — ensures org isolation
    const assessmentOrgId = assessment.org_id;
    const fetchPromises = [
      supabase.from('indicator_scores').select('*, indicators(code, name, pillar, theme, description, direction, indicator_scope, benchmark_min, benchmark_max, benchmark_target, unit)').eq('assessment_id', assessmentId).order('score', { ascending: true }),
      supabase.from('alerts').select('*').eq('assessment_id', assessmentId).eq('is_dismissed', false),
      supabase.from('action_plans').select('*').eq('assessment_id', assessmentId).order('priority', { ascending: true }),
      supabase.from('indicator_values').select('*, indicators(code, name, pillar, theme, unit)').eq('assessment_id', assessmentId),
      supabaseAdmin.from('global_reference_files').select('file_name, category, summary, description').eq('is_active', true).not('summary', 'is', null),
      // KB files: ONLY from the user's own org — scoped by org_id for multi-tenant isolation
      supabaseAdmin.from('knowledge_base_files').select('id, file_name, description, category').eq('is_active', true).eq('org_id', assessmentOrgId).or(destinationId ? `destination_id.eq.${destinationId},destination_id.is.null` : 'destination_id.is.null'),
      // Data snapshots for provenance
      supabase.from('diagnosis_data_snapshots').select('*').eq('assessment_id', assessmentId),
    ];

    // Enterprise indicator values + profile with review analysis
    if (isEnterprise) {
      fetchPromises.push(
        supabase.from('enterprise_indicator_values').select('*, enterprise_indicators(*, enterprise_indicator_categories(*))').eq('assessment_id', assessmentId)
      );
      fetchPromises.push(
        supabase.from('enterprise_profiles').select('*').eq('destination_id', destinationId).maybeSingle()
      );
    }

    const results = await Promise.all(fetchPromises);

    const indicatorScores = results[0].data || [];
    const alerts = results[1].data || [];
    const actionPlans = results[2].data || [];
    const indicatorValues = results[3].data || [];
    const globalRefs = results[4].data || [];
    const kbFiles = results[5].data || [];
    const dataSnapshots = results[6].data || [];
    const enterpriseValues = isEnterprise ? (results[7]?.data || []) : [];
    const enterpriseProfile = isEnterprise ? (results[8]?.data || null) : null;

    console.log('Report data — Indicators:', indicatorScores.length, 'Issues:', issues?.length || 0, 
      'Prescriptions:', prescriptions?.length || 0, 'Global refs:', globalRefs.length, 
      'KB files:', kbFiles.length, 'Snapshots:', dataSnapshots.length, 
      'Enterprise values:', enterpriseValues.length,
      'Enterprise profile:', !!enterpriseProfile, 'Review analysis:', !!enterpriseProfile?.review_analysis);

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
${formatDestinationMetadata(assessment.destinations)}
=== DADOS DO DIAGNÓSTICO ===

SCORES DOS EIXOS:
- I-RA: ${pillarScores?.RA?.score !== undefined ? formatPctBR(pillarScores.RA.score) + '%' : 'N/C'} — ${pillarScores?.RA?.severity || 'N/A'}
- I-AO: ${pillarScores?.AO?.score !== undefined ? formatPctBR(pillarScores.AO.score) + '%' : 'N/C'} — ${pillarScores?.AO?.severity || 'N/A'}
- I-OE: ${pillarScores?.OE?.score !== undefined ? formatPctBR(pillarScores.OE.score) + '%' : 'N/C'} — ${pillarScores?.OE?.severity || 'N/A'}

FLAGS IGMA:
${formatIGMAFlags(assessment.igma_flags as Record<string, boolean> | null)}

ALERTAS:
${alertsText}

INDICADORES:
${indicatorsDetail}

VALORES BRUTOS:
${formatIndicatorValues(indicatorValues)}
${isEnterprise && enterpriseValues.length > 0 ? formatEnterpriseValues(enterpriseValues) : ''}
${isEnterprise && enterpriseProfile ? formatEnterpriseProfile(enterpriseProfile) : ''}
${dataSnapshots.length > 0 ? formatDataSnapshots(dataSnapshots) : ''}
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
- Na seção de Fontes e Referências, liste todos os documentos da KB consultados
` : ''}
=== INSTRUÇÕES FINAIS ===
1. COMECE com o título e IMEDIATAMENTE a tabela de Ficha Técnica fornecida acima — NÃO pule essa tabela
2. Siga EXATAMENTE a estrutura definida no system prompt para o template "${reportTemplate}"
3. Use TABELAS MARKDOWN para todos os conjuntos de dados
4. Justifique todas as conclusões com dados fornecidos
5. CITE A FONTE OFICIAL de cada dado utilizado (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo)
${dataSnapshots.length > 0 ? '6. Use os snapshots de proveniência para rastrear a origem exata de cada indicador' : ''}
${globalRefs.length > 0 ? `${dataSnapshots.length > 0 ? '7' : '6'}. Referencie documentos oficiais quando contextualizar resultados e prescrições` : ''}
${kbFiles.length > 0 ? `${dataSnapshots.length > 0 && globalRefs.length > 0 ? '8' : dataSnapshots.length > 0 || globalRefs.length > 0 ? '7' : '6'}. Referencie documentos da base de conhecimento do destino quando aplicável` : ''}`;

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

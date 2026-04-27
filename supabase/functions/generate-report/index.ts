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

/**
 * Format a raw indicator value for the report based on its semantic
 * `value_format` flag (PERCENTAGE, CURRENCY, COUNT, etc.). Mirrors
 * `src/lib/indicatorValueFormat.ts` since Deno can't import @/lib.
 */
function formatRawIndicatorValue(value: number | null | undefined, indicator: any): { display: string; unitSuffix: string } {
  if (value === null || value === undefined || Number.isNaN(value)) return { display: 'N/A', unitSuffix: '' };
  const fmt = (indicator?.value_format as string | undefined) || inferFormat(indicator?.unit, indicator?.normalization);
  const num = Number(value);
  switch (fmt) {
    case 'PERCENTAGE': return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), unitSuffix: '%' };
    case 'RATIO': return { display: num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }), unitSuffix: '' };
    case 'INDEX_SCORE': return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unitSuffix: indicator?.unit || '' };
    case 'CURRENCY': return { display: `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, unitSuffix: '' };
    case 'CURRENCY_THOUSANDS': return { display: `R$ ${num.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`, unitSuffix: '' };
    case 'CURRENCY_MILLIONS': return { display: `R$ ${num.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`, unitSuffix: '' };
    case 'COUNT': return { display: Math.round(num).toLocaleString('pt-BR'), unitSuffix: indicator?.unit || '' };
    case 'RATE_PER_CAPITA': return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unitSuffix: indicator?.unit || '' };
    case 'DURATION': return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), unitSuffix: indicator?.unit || '' };
    case 'AREA': return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unitSuffix: indicator?.unit || '' };
    case 'BINARY': return { display: num >= 0.5 ? 'Sim' : 'Não', unitSuffix: '' };
    case 'CATEGORICAL': {
      const letters: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
      return { display: letters[Math.round(num)] ?? String(num), unitSuffix: '' };
    }
    default: return { display: num.toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unitSuffix: indicator?.unit || '' };
  }
}

function inferFormat(unit?: string | null, normalization?: string | null): string {
  if (normalization === 'BINARY') return 'BINARY';
  if (!unit) return 'NUMERIC';
  const u = unit.toLowerCase().trim();
  if (u === '%') return 'PERCENTAGE';
  if (u === 'índice 0-1') return 'RATIO';
  if (['índice', 'iqa', 'iqa (0-100)', 'score', 'score 1-5', 'nota', 'nota 0-10'].includes(u)) return 'INDEX_SCORE';
  if (u === 'r$ mi') return 'CURRENCY_MILLIONS';
  if (u.startsWith('r$')) return 'CURRENCY';
  if (u.includes('por mil') || u.includes('por 100')) return 'RATE_PER_CAPITA';
  if (['horas/ano', 'minutos', 'dias', 'anos'].includes(u)) return 'DURATION';
  if (u === 'km²' || u.includes('/km²')) return 'AREA';
  if (['unidades', 'un', 'eventos/ano', 'voos/sem'].includes(u)) return 'COUNT';
  return 'NUMERIC';
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
  // Detect scale: scores can come as 0-1 (canonical) or 0-100 (legacy).
  // Normalize to 0-1 before classifying so the same threshold rules apply.
  const scoreNorm = score > 1 ? score / 100 : score;
  const pct = formatPctBR(scoreNorm);
  // Régua oficial 5 níveis (Crítico/Atenção/Adequado/Forte/Excelente)
  // Mantém compatibilidade com a régua 3-níveis quando os scores caem nas
  // faixas baixas (≤66%) — Forte/Excelente só aparecem quando o pilar
  // ultrapassa 80% / 90%.
  if (scoreNorm >= 0.90) return `${pct}% — EXCELENTE`;
  if (scoreNorm >= 0.80) return `${pct}% — FORTE`;
  if (scoreNorm >= 0.67) return `${pct}% — ADEQUADO`;
  if (scoreNorm >= 0.34) return `${pct}% — ATENÇÃO`;
  return `${pct}% — CRÍTICO`;
}

/** Status canônico para um score em 0-1 (régua 5 níveis) */
function statusFromScore(score: number): string {
  const s = score > 1 ? score / 100 : score;
  if (s >= 0.90) return 'EXCELENTE';
  if (s >= 0.80) return 'FORTE';
  if (s >= 0.67) return 'ADEQUADO';
  if (s >= 0.34) return 'ATENÇÃO';
  return 'CRÍTICO';
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
      const status = statusFromScore(s.score);
      const benchmark = s.indicators?.benchmark_target ? ` (benchmark: ${s.indicators.benchmark_target})` : '';
      const normRefs = (s.min_ref_used !== null && s.min_ref_used !== undefined
        && s.max_ref_used !== null && s.max_ref_used !== undefined)
        ? ` | Normalização: [${s.min_ref_used}, ${s.max_ref_used}]`
        : '';
      const weightStr = (s.weight_used !== null && s.weight_used !== undefined && s.weight_used !== 1)
        ? ` | Peso: ${s.weight_used}`
        : '';

      // ===== Pipeline 3-camadas (raw → normalized → score%) =====
      const rawDisplay = (s.value_raw !== null && s.value_raw !== undefined)
        ? formatRawIndicatorValue(s.value_raw, s.indicators)
        : null;
      const rawStr = rawDisplay
        ? ` | Bruto: ${rawDisplay.unitSuffix ? `${rawDisplay.display} ${rawDisplay.unitSuffix}` : rawDisplay.display}`
        : '';
      const normStr = (s.value_normalized !== null && s.value_normalized !== undefined)
        ? ` | Índice: ${formatNumberBR(Number(s.value_normalized), 3)}`
        : '';
      const scoreStr = (s.score_pct !== null && s.score_pct !== undefined)
        ? `${formatNumberBR(Number(s.score_pct), 1)}%`
        : `${formatPctBR(s.score)}%`;

      // ===== Procedência e selo de auditoria =====
      const polarity = s.polarity || s.indicators?.direction;
      const polarityStr = polarity ? ` | Polaridade: ${polarity}` : '';
      const dataSource = s.indicators?.data_source || s.indicators?.source;
      const sourceStr = dataSource ? ` | Fonte: ${dataSource}` : '';
      const conf = s.confidence_level;
      const auditBadge = conf === null || conf === undefined
        ? ''
        : conf >= 0.95
          ? ' [✓ verificado]'
          : conf >= 0.65
            ? ' [⚠ auditoria pendente]'
            : ' [✗ baixa confiança]';

      result += `    * ${s.indicators?.name || s.indicators?.code}: ${scoreStr} [${status}]${auditBadge} - Tema: ${s.indicators?.theme || 'N/A'}${rawStr}${normStr}${benchmark}${normRefs}${weightStr}${polarityStr}${sourceStr}\n`;
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
    const status = statusFromScore(avg);
    
    result += `\n## ${theme} (Status: ${status}, Média: ${formatPctBR(avg)}%)\n`;
    scores.forEach((s: any) => {
      const kpiStatus = statusFromScore(s.score);
      const benchmarkMin = s.indicators?.benchmark_min !== null ? s.indicators.benchmark_min : 'N/A';
      const benchmarkMax = s.indicators?.benchmark_max !== null ? s.indicators.benchmark_max : 'N/A';
      const benchmarkTarget = s.indicators?.benchmark_target !== null ? s.indicators.benchmark_target : 'N/A';
      result += `  - ${s.indicators?.name || s.indicators?.code}: ${formatPctBR(s.score)}% [${kpiStatus}]\n`;
      result += `    Benchmark: min=${benchmarkMin}, target=${benchmarkTarget}, max=${benchmarkMax}\n`;
      // See formatIndicatorScores: same rationale — make the normalization
      // parameters auditable per indicator.
      if (s.min_ref_used !== null && s.min_ref_used !== undefined
        && s.max_ref_used !== null && s.max_ref_used !== undefined) {
        const weightSuffix = (s.weight_used !== null && s.weight_used !== undefined && s.weight_used !== 1)
          ? `, peso ${s.weight_used}`
          : '';
        result += `    Normalização: intervalo [${s.min_ref_used}, ${s.max_ref_used}]${weightSuffix}\n`;
      }
    });
  }
  return result;
}

function formatIndicatorValues(indicatorValues: any[]): string {
  if (!indicatorValues || indicatorValues.length === 0) return 'Nenhum valor bruto disponível.';
  return indicatorValues.map((iv: any) => {
    const rawValue = iv.value_raw ?? iv.value;
    // Format respecting the indicator's value_format flag (PERCENTAGE, CURRENCY, COUNT, etc.)
    const { display, unitSuffix } = formatRawIndicatorValue(rawValue, iv.indicators);
    const valueLabel = unitSuffix ? `${display} ${unitSuffix}` : display;
    const meta: string[] = [];
    if (iv.indicators?.pillar) meta.push(`Pilar: ${iv.indicators.pillar}`);
    if (iv.indicators?.theme) meta.push(`Tema: ${iv.indicators.theme}`);
    if (iv.indicators?.value_format) meta.push(`Formato: ${iv.indicators.value_format}`);
    if (iv.source) meta.push(`Fonte: ${iv.source}`);
    const extras: string[] = [];
    if (iv.value_text) extras.push(`    Evidência: ${iv.value_text}`);
    if (iv.reference_date) extras.push(`    Referência: ${iv.reference_date}`);
    const metaStr = meta.length > 0 ? ` (${meta.join(', ')})` : '';
    const header = `- ${iv.indicators?.name || iv.indicators?.code}: ${valueLabel}${metaStr}`;
    return extras.length > 0 ? `${header}\n${extras.join('\n')}` : header;
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
  if (!flags) return 'Flags IGMA ainda não calculadas para este diagnóstico.';
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

// Legacy formatEnterpriseProfile removed — replaced by the more comprehensive
// version below (line ~320) that includes peak_months, source_markets, etc.

function formatDataSnapshots(snapshots: any[]): string {
  if (!snapshots || snapshots.length === 0) return '';
  
  const bySource: Record<string, any[]> = {};
  snapshots.forEach((s: any) => {
    const src = s.source_code || 'MANUAL';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(s);
  });

  const sourceLabels: Record<string, string> = {
    'IBGE': 'IBGE (Agregados)',
    'IBGE_AGREGADOS': 'IBGE (Agregados)',
    'IBGE_PESQUISAS': 'IBGE (Pesquisas)',
    'IBGE_CENSO': 'IBGE / SIDRA (Censo)',
    'IBGE_SIDRA': 'IBGE / SIDRA (Saneamento)',
    'DATASUS': 'DATASUS',
    'INEP': 'INEP (Educação)',
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
      // Format raw value using BR locale; fall back to value_used_text when
      // the snapshot only has textual evidence.
      const rawNum = item.value_used;
      const val = rawNum !== null && rawNum !== undefined
        ? Number(rawNum).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
        : (item.value_used_text || 'N/A');
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
      const metaParts: string[] = [];
      if (benchMin !== null && benchMin !== undefined) metaParts.push(`Benchmark min: ${benchMin}`);
      if (benchMax !== null && benchMax !== undefined) metaParts.push(`Benchmark max: ${benchMax}`);
      if (v.source) metaParts.push(`Fonte: ${v.source}`);
      if (v.validated) {
        const validatedAt = v.validated_at ? new Date(v.validated_at).toLocaleDateString('pt-BR') : null;
        metaParts.push(validatedAt ? `Validado em ${validatedAt}` : 'Validado');
      }
      const metaStr = metaParts.length > 0 ? ` | ${metaParts.join(' | ')}` : '';
      result += `  - ${name}: ${v.value}${unit ? ` ${unit}` : ''}${metaStr}\n`;
      if (v.value_text) result += `      Evidência: ${v.value_text}\n`;
      if (v.notes) result += `      Observações: ${v.notes}\n`;
    });
  }
  return result;
}

function formatIssuesWithEvidence(issues: any[]): string {
  if (!issues || issues.length === 0) return 'Nenhum problema identificado.';
  return issues.map((issue: any) => {
    const header = `- [${issue.severity}] ${issue.title} (Pilar: ${issue.pillar}, Tema: ${issue.theme || 'N/A'}, Interpretação: ${issue.interpretation || 'N/A'})`;
    const evidence = issue.evidence;
    if (!evidence || typeof evidence !== 'object') return header;
    const parts: string[] = [];
    if (Array.isArray(evidence.indicators) && evidence.indicators.length > 0) {
      const indicatorLines = evidence.indicators
        .slice(0, 5)
        .map((ind: any) => `      • ${ind.name || ind.code}: ${typeof ind.score === 'number' ? formatPctBR(ind.score) + '%' : 'N/A'}`)
        .join('\n');
      parts.push(`    Indicadores que puxaram pra baixo:\n${indicatorLines}`);
    }
    if (evidence.rule) parts.push(`    Regra disparada: ${evidence.rule}`);
    if (evidence.pillar_score !== undefined) parts.push(`    Score do pilar: ${formatPctBR(evidence.pillar_score)}%`);
    if (evidence.threshold !== undefined) parts.push(`    Limiar: ${formatPctBR(evidence.threshold)}%`);
    return parts.length > 0 ? `${header}\n${parts.join('\n')}` : header;
  }).join('\n');
}

// Build a contextual summary of the enterprise profile for the LLM. The profile
// is ignored by the scoring engine today, but surfacing it in the report prompt
// lets the narrative reflect segment (hostel vs resort), certifications and
// sustainability initiatives that would otherwise be dead data.
function formatEnterpriseProfile(profile: any): string {
  if (!profile) return '';
  const lines: string[] = ['\n=== PERFIL DO EMPREENDIMENTO ==='];
  if (profile.property_type) lines.push(`- Tipo: ${profile.property_type}`);
  if (profile.star_rating) lines.push(`- Classificação: ${profile.star_rating}★`);
  if (profile.room_count) lines.push(`- UHs: ${profile.room_count}`);
  if (profile.suite_count) lines.push(`- Suítes: ${profile.suite_count}`);
  if (profile.total_capacity) lines.push(`- Capacidade total: ${profile.total_capacity} hóspedes`);
  if (profile.employee_count) lines.push(`- Funcionários: ${profile.employee_count}`);
  if (profile.years_in_operation !== null && profile.years_in_operation !== undefined) {
    lines.push(`- Anos de operação: ${profile.years_in_operation}`);
  }
  if (profile.seasonality) lines.push(`- Sazonalidade: ${profile.seasonality}`);
  if (Array.isArray(profile.peak_months) && profile.peak_months.length > 0) {
    lines.push(`- Meses de alta: ${profile.peak_months.join(', ')}`);
  }
  if (profile.average_occupancy_rate !== null && profile.average_occupancy_rate !== undefined) {
    lines.push(`- Ocupação média: ${profile.average_occupancy_rate}%`);
  }
  if (profile.average_daily_rate !== null && profile.average_daily_rate !== undefined) {
    lines.push(`- ADR médio: R$ ${profile.average_daily_rate}`);
  }
  if (Array.isArray(profile.target_market) && profile.target_market.length > 0) {
    lines.push(`- Público-alvo: ${profile.target_market.join(', ')}`);
  }
  if (Array.isArray(profile.primary_source_markets) && profile.primary_source_markets.length > 0) {
    lines.push(`- Mercados emissores: ${profile.primary_source_markets.join(', ')}`);
  }
  if (Array.isArray(profile.certifications) && profile.certifications.length > 0) {
    lines.push(`- Certificações: ${profile.certifications.join(', ')}`);
  }
  if (Array.isArray(profile.sustainability_initiatives) && profile.sustainability_initiatives.length > 0) {
    lines.push(`- Iniciativas de sustentabilidade: ${profile.sustainability_initiatives.join(', ')}`);
  }
  if (Array.isArray(profile.accessibility_features) && profile.accessibility_features.length > 0) {
    lines.push(`- Recursos de acessibilidade: ${profile.accessibility_features.join(', ')}`);
  }
  if (profile.notes) lines.push(`- Observações: ${profile.notes}`);
  return lines.length > 1 ? lines.join('\n') + '\n' : '';
}

// External indicator values (IBGE, DATASUS, STN, CADASTUR …) serve as benchmark
// references. Today they're only used at the data-import stage — surfacing them
// in the prompt lets the LLM cite oficial baselines next to observed values.
function formatExternalBenchmarks(externalValues: any[], indicatorsById: Map<string, any>): string {
  if (!externalValues || externalValues.length === 0) return '';
  const sourceLabels: Record<string, string> = {
    IBGE_AGREGADOS: 'IBGE (Agregados)',
    IBGE_PESQUISAS: 'IBGE (Pesquisas)',
    DATASUS: 'DATASUS',
    STN: 'STN / Tesouro Nacional',
    CADASTUR: 'CADASTUR',
    INEP: 'INEP',
    MAPA_TURISMO: 'Mapa do Turismo',
  };
  const lines: string[] = ['\n=== BENCHMARKS DE FONTES OFICIAIS ==='];
  lines.push('(valores de referência coletados via integrações oficiais — usar para comparar com os dados do diagnóstico e fundamentar comparações regionais)');
  externalValues.forEach((ev: any) => {
    const indicator = indicatorsById.get(ev.indicator_code);
    const indicatorName = indicator?.name || ev.indicator_code;
    // Format respecting indicator's value_format (PERCENTAGE/CURRENCY/COUNT…)
    let rawValue: string;
    let unit = indicator?.unit || '';
    if (ev.raw_value !== null && ev.raw_value !== undefined) {
      const fmt = formatRawIndicatorValue(ev.raw_value, indicator);
      rawValue = fmt.display;
      unit = fmt.unitSuffix;
    } else {
      rawValue = ev.raw_value_text || 'N/A';
    }
    const sourceLabel = sourceLabels[ev.source_code] || ev.source_code;
    const year = ev.reference_year ? ` (${ev.reference_year})` : '';
    const validated = ev.validated ? ' ✓validado' : '';
    lines.push(`- ${indicatorName}: ${rawValue}${unit ? ` ${unit}` : ''} — fonte: ${sourceLabel}${year}${validated}`);
  });
  return lines.join('\n') + '\n';
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
| I-OE | ${pillarLabel(pillarScores?.OE?.score)} |
| I-AO | ${pillarLabel(pillarScores?.AO?.score)} |
| Score Final SISTUR (interno) | ${assessment.final_score !== null && assessment.final_score !== undefined ? `${formatPctBR(assessment.final_score)}% — ${({
      CRITICO: 'Crítico',
      CRITICAL: 'Crítico',
      INSUFICIENTE: 'Atenção',
      ATENCAO: 'Atenção',
      ATTENTION: 'Atenção',
      EM_DESENVOLVIMENTO: 'Adequado',
      ADEQUADO: 'Adequado',
      BOM: 'Adequado',
      FORTE: 'Forte',
      STRONG: 'Forte',
      EXCELENTE: 'Excelente',
      EXCELLENT: 'Excelente',
    } as Record<string, string>)[assessment.final_classification as string] || assessment.final_classification || ''}` : 'N/A'} |

> **Nota metodológica:** O Score Final SISTUR é calculado como (RA × 35%) + (OE × 30%) + (AO × 35%), conforme metodologia oficial. Trata-se de um indicador interno de uso técnico, sem finalidade de ranqueamento público entre destinos.

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
2. I-OE — Organização Estrutural: Infraestrutura turística, serviços, mercado, qualificação profissional
3. I-AO — Ações Operacionais: Governança pública, planejamento, orçamento, capacidade institucional

CLASSIFICAÇÃO (régua oficial 5 níveis):
- 🟢 EXCELENTE (≥90%): desempenho de referência, padrão a ser preservado
- 🔵 FORTE (80-89%): desempenho consolidado, com margem para excelência
- 🟡 ADEQUADO (67-79%): atende ao mínimo, com oportunidades pontuais de melhoria
- 🟠 ATENÇÃO (34-66%): exige intervenção planejada para evitar degradação
- 🔴 CRÍTICO (≤33%): requer ação imediata e priorização máxima
Use SEMPRE estas faixas e rótulos, com a vírgula decimal brasileira (ex.: "67,3% — ADEQUADO"). Nunca use "BOM" — o termo oficial é "ADEQUADO".

EXTENSÃO MANDALA DA SUSTENTABILIDADE NO TURISMO (MST) — quando ativada via opt-in:
Quando indicadores com prefixo "MST_" aparecerem nos dados (ex: MST_ACC_NBR9050, MST_TBC, MST_5G_WIFI, MST_PNQT_QUAL, MST_TSE_TURNOUT, MST_INCLUSAO_GESTAO, MST_SENSIBILIZACAO, MST_BIGDATA, MST_DIGITAL_PROMO), trate-os como dimensões complementares baseadas em Tasso, Silva & Nascimento (2024) — Mandala da Sustentabilidade no Turismo. Eles entram no score do pilar com peso igual aos demais indicadores. NA SEÇÃO DE GARGALOS, identifique-os explicitamente com o prefixo "🌀 [MST]" e cite a dimensão (Acessibilidade, TBC, Conectividade Digital, Qualificação PNQT, Participação Cívica, Inclusão na Gestão, Sensibilização, Big Data Turístico, Promoção Digital). Se nenhum MST_ aparecer, NÃO mencione a Mandala — o diagnóstico não foi expandido.

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

## 3. Metodologia SISTUR
- Breve descrição dos 3 eixos e critérios de classificação
- Fontes de dados utilizadas (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo Brasileiro)
- Resumo da rastreabilidade: quantos indicadores vieram de fontes oficiais automáticas vs preenchimento manual

## 4. Diagnóstico por Eixo SISTUR
### 4.1. I-RA — Relações Ambientais
- Tabela: Indicador | Score | Status | Fonte | Valor Bruto | Evidência | Observação
- Coluna "Evidência" DEVE vir do campo value_text ou Evidência presente nos VALORES BRUTOS quando existir
- Coluna "Fonte" DEVE vir do campo Fonte presente nos VALORES BRUTOS (IBGE, DATASUS, STN, CADASTUR, Manual, etc.)
- LEITURA TÉCNICA: interpretação dos scores
- IMPLICAÇÕES: consequências para o destino

### 4.2. I-OE — Organização Estrutural
(mesma estrutura)

### 4.3. I-AO — Ações Operacionais
(mesma estrutura)

## 5. Alertas Sistêmicos IGMA
- Flags ativas e suas implicações
- Bloqueios e restrições aplicáveis

## 6 Análise Integrada
- Inter-relação entre os eixos
- Efeitos cascata identificados

## 7. Gargalos e Prescrições
- Tabela: Gargalo | Severidade | Pilar | Indicadores que dispararam | Prescrição | Agente Responsável
- A coluna "Indicadores que dispararam" DEVE ser preenchida a partir da evidência de cada gargalo (campo "Indicadores que puxaram pra baixo" na seção GARGALOS). NUNCA deixe vazio se a evidência estiver presente.

## 8. Benchmarks Externos (Fontes Oficiais)
- Se houver dados na seção "BENCHMARKS DE FONTES OFICIAIS" do input, SEMPRE renderize esta seção
- Tabela: Indicador | Valor Observado | Valor Oficial (Fonte) | Ano | Comparação
- Compare o valor observado no diagnóstico com o valor oficial para fundamentar conclusões regionais
- Se não houver dados oficiais, escreva "Nenhum benchmark externo disponível para este destino no momento."

## 9. Prognóstico e Diretrizes
- Cenário tendencial vs cenário desejado
- Diretrizes estratégicas por horizonte temporal

## 10. Banco de Ações
- Tabela: Ação | Pilar | Prazo | Responsável | Prioridade | Status

## 11. Fontes e Referências
- Lista completa de fontes de dados oficiais consultadas (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo, INEP, etc.)
- Documentos de referência nacional utilizados
- Documentos da Base de Conhecimento do destino consultados
- Evidências textuais (value_text) relevantes citadas no relatório

## 12. Considerações Finais
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

CLASSIFICAÇÃO (régua oficial 5 níveis — usar SEMPRE estes rótulos, nunca "BOM"):
- 🟢 EXCELENTE (≥90%) | 🔵 FORTE (80-89%) | 🟡 ADEQUADO (67-79%) | 🟠 ATENÇÃO (34-66%) | 🔴 CRÍTICO (≤33%)
Formate percentuais com vírgula decimal brasileira (ex.: "72,4% — ADEQUADO").

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
## 1. Sumário Executivo para Gestão
## 2. Perfil do Empreendimento
- Se houver seção "PERFIL DO EMPREENDIMENTO" no input, renderize-a integralmente em tabela markdown (Atributo | Valor).
- Destaque tipo de propriedade, capacidade, sazonalidade, público-alvo, certificações, iniciativas de sustentabilidade e recursos de acessibilidade.
- Se não houver dados de perfil, indique que a ficha cadastral deve ser completada.
## 3. Metodologia SISTUR Enterprise
## 4. Diagnóstico por Categoria Funcional (tabela por categoria com Indicador | Valor | Benchmark | Fonte | Validado | Evidência)
- A coluna "Validado" vem do campo "Validado em" nos VALORES ENTERPRISE; "Evidência" vem de value_text ou Observações quando presentes
## 5. Análise de Gargalos Operacionais
- Tabela: Gargalo | Severidade | Categoria | Indicadores que dispararam | Prescrição
- A coluna "Indicadores que dispararam" DEVE ser preenchida a partir da evidência de cada gargalo (campo "Indicadores que puxaram pra baixo" na seção GARGALOS)
## 6. Planos de Ação em Andamento
## 7. Recomendações Estratégicas (curto/médio/longo prazo)
- Conecte recomendações ao perfil do empreendimento (ex.: certificações ESG para propriedades com iniciativas de sustentabilidade; estratégias de sazonalidade para propriedades com alta concentração em meses específicos)
## 8. Prescrições de Capacitação
## 9. Roadmap de Implementação (tabela: Ação | Categoria | Investimento | Prazo | KPI)
## 10. Fontes e Referências
- Liste indicadores com dados validados e suas fontes
- Cite evidências textuais (value_text/Observações) relevantes
## 11. Considerações Finais`;
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

    // Fetch all data in parallel — use Promise.all on a keyed object so we can
    // read each result by name and avoid fragile positional indexing when
    // conditional queries are toggled (enterprise-only, ibge-dependent…).
    const destinationId = assessment.destination_id;
    // Use the assessment's org_id to scope KB files — ensures org isolation
    const assessmentOrgId = assessment.org_id;
    const ibgeCode = (assessment.destinations as any)?.ibge_code;

    const emptyArray = Promise.resolve({ data: [] as any[] });
    const emptyMaybe = Promise.resolve({ data: null as any });

    const [
      indicatorScoresRes,
      alertsRes,
      actionPlansRes,
      indicatorValuesRes,
      globalRefsRes,
      kbFilesRes,
      dataSnapshotsRes,
      externalValuesRes,
      enterpriseValuesRes,
      enterpriseProfileRes,
    ] = await Promise.all([
      supabase.from('indicator_scores').select('*, value_raw, value_normalized, score_pct, polarity, normalization_method, confidence_level, indicators(code, name, pillar, theme, description, direction, indicator_scope, benchmark_min, benchmark_max, benchmark_target, unit, value_format, normalization, data_source, source, collection_type)').eq('assessment_id', assessmentId).order('score', { ascending: true }),
      supabase.from('alerts').select('*').eq('assessment_id', assessmentId).eq('is_dismissed', false),
      supabase.from('action_plans').select('*').eq('assessment_id', assessmentId).order('priority', { ascending: true }),
      // `value_raw`, `value_text`, `source` and `reference_date` are all persisted
      // per the indicator_values schema — select * so evidence/provenance reach
      // the LLM prompt (they used to be loaded but never surfaced).
      supabase.from('indicator_values').select('*, indicators(code, name, pillar, theme, unit, value_format, normalization)').eq('assessment_id', assessmentId),
      supabaseAdmin.from('global_reference_files').select('file_name, category, summary, description').eq('is_active', true).not('summary', 'is', null),
      // KB files: ONLY from the user's own org — scoped by org_id for multi-tenant isolation
      supabaseAdmin.from('knowledge_base_files').select('id, file_name, description, category').eq('is_active', true).eq('org_id', assessmentOrgId).or(destinationId ? `destination_id.eq.${destinationId},destination_id.is.null` : 'destination_id.is.null'),
      // Data snapshots for provenance
      supabase.from('diagnosis_data_snapshots').select('*').eq('assessment_id', assessmentId),
      // Official external benchmarks tied to the destination's IBGE code — empty
      // set when there's no ibge_code (enterprise-only flows) or no import yet.
      ibgeCode
        ? supabase.from('external_indicator_values').select('*').eq('municipality_ibge_code', ibgeCode).eq('org_id', assessmentOrgId)
        : emptyArray,
      // Enterprise-only: indicator values persisted in the legacy enterprise table.
      isEnterprise
        ? supabase.from('enterprise_indicator_values').select('*, enterprise_indicators(*, enterprise_indicator_categories(*))').eq('assessment_id', assessmentId)
        : emptyArray,
      // Enterprise profile: 26 descriptive fields (property_type, certifications,
      // sustainability, accessibility…) that used to be dead data.
      isEnterprise && destinationId
        ? supabase.from('enterprise_profiles').select('*').eq('destination_id', destinationId).maybeSingle()
        : emptyMaybe,
    ]);

    const indicatorScores = indicatorScoresRes.data || [];
    const alerts = alertsRes.data || [];
    const actionPlans = actionPlansRes.data || [];
    const indicatorValues = indicatorValuesRes.data || [];
    const globalRefs = globalRefsRes.data || [];
    const kbFiles = kbFilesRes.data || [];
    const dataSnapshots = dataSnapshotsRes.data || [];
    const externalValues = externalValuesRes.data || [];
    const enterpriseValues = enterpriseValuesRes.data || [];
    const enterpriseProfile = enterpriseProfileRes.data || null;

    // Catalog indicators by code so we can decorate external benchmarks with
    // names/units from the indicators table.
    const indicatorsByCode = new Map<string, any>();
    indicatorScores.forEach((is: any) => {
      if (is.indicators?.code) indicatorsByCode.set(is.indicators.code, is.indicators);
    });
    indicatorValues.forEach((iv: any) => {
      if (iv.indicators?.code && !indicatorsByCode.has(iv.indicators.code)) {
        indicatorsByCode.set(iv.indicators.code, iv.indicators);
      }
    });

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

    // Surfaces evidence.indicators / rule / pillar_score / threshold stored on
    // each issue so the LLM can quote the specific indicators that triggered it.
    const issuesText = formatIssuesWithEvidence(issues);

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
${isEnterprise ? formatEnterpriseProfile(enterpriseProfile) : ''}
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
${!isEnterprise ? formatExternalBenchmarks(externalValues, indicatorsByCode) : ''}
${dataSnapshots.length > 0 ? formatDataSnapshots(dataSnapshots) : ''}
GARGALOS (com evidências e indicadores que dispararam cada problema):
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
5. CITE A FONTE OFICIAL de cada dado utilizado (IBGE, DATASUS, STN, CADASTUR, Mapa do Turismo, INEP)
6. Para cada GARGALO listado, use a evidência (indicadores que puxaram pra baixo + regra + score do pilar) na análise — nunca trate gargalos como listas abstratas
7. Quando a seção VALORES BRUTOS trouxer "Evidência:" (value_text) para um indicador, inclua essa evidência textual nas tabelas e no corpo do texto
${externalValues.length > 0 && !isEnterprise ? '8. SEMPRE renderize a seção de Benchmarks Externos comparando os valores observados no diagnóstico com os valores oficiais retornados pelas integrações (IBGE/DATASUS/STN/CADASTUR/INEP)' : ''}
${isEnterprise && enterpriseProfile ? '8. Incorpore o PERFIL DO EMPREENDIMENTO (tipo, capacidade, certificações, sustentabilidade, acessibilidade) nas recomendações — não escreva um relatório genérico ignorando esses atributos' : ''}
${dataSnapshots.length > 0 ? '9. Use os snapshots de proveniência para rastrear a origem exata de cada indicador' : ''}
${globalRefs.length > 0 ? `10. Referencie documentos oficiais quando contextualizar resultados e prescrições` : ''}
${kbFiles.length > 0 ? `11. Referencie documentos da base de conhecimento do destino quando aplicável` : ''}`;

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

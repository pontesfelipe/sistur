import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// v1.38.50 — `VALIDATOR_VERSION` é apenas o fallback. O cliente envia
// `appVersion` no body do request (ver `src/pages/Relatorios.tsx`) e esse
// valor é usado por request, garantindo que a "Conferência de dados"
// SEMPRE reflita a versão atual do app na hora da geração — sem depender
// de um string hardcoded que envelhece a cada release.
const VALIDATOR_VERSION_FALLBACK = 'v1.38.50';

// v1.38.52 — Logger estruturado para rastrear o pipeline de geração ponta-a-ponta.
// Cada chamada estampa traceId (jobId quando disponível, senão um id aleatório),
// assessmentId, reportId opcional, stage e tempo decorrido desde o início.
// Também atualiza opcionalmente `report_jobs.stage` para que o estado fique
// visível por SQL/UI sem depender só dos logs do Edge Function.
type StageLogger = {
  traceId: string;
  startedAt: number;
  stage: (name: string, extra?: Record<string, unknown>) => void;
  error: (name: string, err: unknown, extra?: Record<string, unknown>) => void;
  setReportId: (id: string | null | undefined) => void;
  setAssessmentId: (id: string | null | undefined) => void;
  setJobId: (id: string | null | undefined) => void;
  bumpJobStage: (
    supabaseAdmin: any,
    name: string,
    extra?: { progress_pct?: number },
  ) => Promise<void>;
  lastStage: () => string;
};
function createStageLogger(initial: {
  traceId?: string;
  assessmentId?: string | null;
  reportId?: string | null;
  jobId?: string | null;
}): StageLogger {
  let assessmentId = initial.assessmentId ?? null;
  let reportId = initial.reportId ?? null;
  let jobId = initial.jobId ?? null;
  const traceId = initial.traceId ?? jobId ?? `trace_${Math.random().toString(36).slice(2, 10)}`;
  const startedAt = Date.now();
  let lastStage = 'init';
  const fmtPrefix = () => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    return `[trace=${traceId}][+${elapsed}s][asmt=${assessmentId ?? '-'}][report=${reportId ?? '-'}]`;
  };
  return {
    traceId,
    startedAt,
    stage(name, extra) {
      lastStage = name;
      try {
        console.log(`${fmtPrefix()}[stage=${name}]`, extra ? JSON.stringify(extra) : '');
      } catch {
        console.log(`${fmtPrefix()}[stage=${name}]`);
      }
    },
    error(name, err, extra) {
      lastStage = `${name}:error`;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${fmtPrefix()}[stage=${name}][ERROR] ${msg}`, extra ? JSON.stringify(extra) : '');
    },
    setReportId(id) { if (id) reportId = id; },
    setAssessmentId(id) { if (id) assessmentId = id; },
    setJobId(id) { if (id) jobId = id; },
    async bumpJobStage(supabaseAdmin, name, extra) {
      lastStage = name;
      if (!jobId) return;
      try {
        const patch: Record<string, unknown> = { stage: `[trace=${traceId}] ${name}` };
        if (extra?.progress_pct !== undefined) patch.progress_pct = extra.progress_pct;
        await supabaseAdmin.from('report_jobs').update(patch).eq('id', jobId);
      } catch (e) {
        console.warn(`${fmtPrefix()}[bumpJobStage failed]`, e instanceof Error ? e.message : String(e));
      }
    },
    lastStage: () => lastStage,
  };
}

// ========== HELPER FUNCTIONS ==========

/** Format number using Brazilian standard: comma for decimal, period for thousands */
function formatNumberBR(value: number, decimals = 1): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPctBR(score: number): string {
  return formatNumberBR(score * 100, 1);
}

/**
 * Fase 5 — Etapa 4: Tabela de procedência (audit trail) por indicador.
 * Cada linha alimentada pelo engine garante que a IA consiga justificar
 * o score citando origem (OFFICIAL_API, DERIVED, MANUAL, ESTIMADA),
 * valor bruto, score normalizado e peso efetivo aplicado.
 */
function formatAuditTrail(rows: any[]): string {
  if (!rows || rows.length === 0) {
    return 'Nenhum registro de auditoria encontrado para este diagnóstico.';
  }
  const sorted = [...rows].sort((a, b) => {
    if (a.pillar !== b.pillar) return String(a.pillar || '').localeCompare(String(b.pillar || ''));
    return String(a.indicator_code || '').localeCompare(String(b.indicator_code || ''));
  });
  const header = '| Pilar | Indicador | Valor | Score | Origem | Peso | Detalhe |\n|---|---|---|---|---|---|---|';
  const body = sorted.map((r) => {
    const valStr = r.value === null || r.value === undefined
      ? 'N/A'
      : Number(r.value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const scoreStr = r.normalized_score === null || r.normalized_score === undefined
      ? 'N/A'
      : `${(Number(r.normalized_score) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    const detail = r.source_detail
      ? String(r.source_detail).slice(0, 60).replace(/\|/g, ' ')
      : '—';
    return `| ${r.pillar || '—'} | ${r.indicator_code || '—'} | ${valStr} | ${scoreStr} | ${r.source_type || 'MANUAL'} | ${r.weight ?? '—'} | ${detail} |`;
  }).join('\n');
  return `${header}\n${body}`;
}

function classifyAuditSource(source?: string | null): { source_type: string; source_detail: string | null } {
  const raw = String(source || '').trim();
  const lower = raw.toLowerCase();
  if (!raw) return { source_type: 'MANUAL', source_detail: null };
  if (/derived|derivado|fórmula|formula/.test(lower)) return { source_type: 'DERIVED', source_detail: raw };
  if (/estima/.test(lower)) return { source_type: 'ESTIMADA', source_detail: raw };
  if (/api|pré-preenchido|pre-preenchido|automatica|automática|ibge|datasus|cadastur|sismapa|inep|stn|anac|anatel|\bana\b|tse|cadunico|mapa.?turismo|mtur/i.test(raw)) {
    return { source_type: 'OFFICIAL_API', source_detail: raw };
  }
  return { source_type: 'MANUAL', source_detail: raw };
}

function buildCanonicalAuditTrail(auditRows: any[], indicatorValues: any[], indicatorScores: any[]): any[] {
  const byCode = new Map<string, any>();
  for (const row of auditRows || []) {
    const code = String(row.indicator_code || '');
    if (code) byCode.set(code, { ...row });
  }

  for (const iv of indicatorValues || []) {
    const code = iv.indicators?.code;
    if (!code) continue;
    const inferred = classifyAuditSource(iv.source);
    const refYear = String(iv.reference_date || '').match(/(20\d{2}|19\d{2})/)?.[1];
    const source_detail = inferred.source_detail
      ? `${inferred.source_detail}${refYear && !inferred.source_detail.includes(refYear) ? ` (${refYear})` : ''}`
      : null;
    const existing = byCode.get(code);
    if (existing) {
      const shouldUpgradeSource = String(existing.source_type || 'MANUAL').startsWith('MANUAL') && inferred.source_type !== 'MANUAL';
      byCode.set(code, {
        ...existing,
        indicator_name: existing.indicator_name || iv.indicators?.name || code,
        value: existing.value ?? iv.value_raw,
        source_type: shouldUpgradeSource ? inferred.source_type : (existing.source_type || inferred.source_type),
        source_detail: shouldUpgradeSource ? source_detail : (existing.source_detail || source_detail),
      });
    } else {
      byCode.set(code, {
        indicator_code: code,
        indicator_name: iv.indicators?.name || code,
        pillar: iv.indicators?.pillar || null,
        value: iv.value_raw ?? null,
        normalized_score: null,
        source_type: inferred.source_type,
        source_detail,
        weight: null,
      });
    }
  }

  for (const score of indicatorScores || []) {
    const code = score.indicators?.code;
    if (!code || byCode.has(code)) continue;
    byCode.set(code, {
      indicator_code: code,
      indicator_name: score.indicators?.name || code,
      pillar: score.indicators?.pillar || null,
      value: score.value_raw ?? null,
      normalized_score: score.score ?? (score.score_pct !== null && score.score_pct !== undefined ? Number(score.score_pct) / 100 : null),
      source_type: 'DERIVED',
      source_detail: score.normalization_method ? `score:${score.normalization_method}` : 'score calculado',
      weight: score.weight_used ?? null,
    });
  }

  return Array.from(byCode.values());
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
    const isDerived = iv._source === 'derived' || (typeof iv.source === 'string' && iv.source.includes('+IBGE'));
    if (isDerived) meta.push('Tipo: CALCULADO (derivado de fontes oficiais)');
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
    'CADASTUR+IBGE': 'CADASTUR ÷ IBGE (derivado)',
    'STN+IBGE': 'STN ÷ IBGE (derivado)',
    'MAPA_TURISMO+IBGE': 'Mapa do Turismo ÷ IBGE (derivado)',
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

REGRAS DE ATRIBUIÇÃO CORRETA DE FONTE (anti-troca de origem — GAP v1.38.18):
- "Leitos de Hospedagem" / "Meios de hospedagem" / "Capacidade hoteleira" → fonte CADASTUR (Ministério do Turismo). NUNCA atribua a DATASUS.
- "Leitos hospitalares SUS" / "Cobertura de saúde" → fonte DATASUS. NUNCA atribua a CADASTUR.
- "CAPAG" → fonte STN/Tesouro Nacional. Use a classificação A/B/C/D EXATAMENTE como aparece na TRILHA DE AUDITORIA — NÃO troque B por C nem C por B.
- "Permanência média" / "Gasto médio diário" / "Receita turística" → fonte CADASTUR/MTur ou base de referência interna. Use o valor EXATO da TRILHA DE AUDITORIA (ex.: se a auditoria mostra 2,3 dias, escreva 2,3 dias — NÃO arredonde para 2,5).
- "Emissão de gases de efeito estufa" → fonte SEEG/MapBiomas ou Manual. Use o valor numérico EXATO da auditoria (ex.: 2,4 tCO₂eq/hab. — NÃO escreva 2 tCO₂eq/hab.).

IGMA — NOMENCLATURA OBRIGATÓRIA:
- A primeira menção a "IGMA" no relatório DEVE expandir a sigla: "Índice de Gestão Municipal Ambiental (IGMA)".
- A partir da segunda menção, pode usar apenas "IGMA". Sempre que aparecer uma flag IGMA, explique o que ela mede em uma frase.

INDICADORES CONTEXTUAIS (peso 0):
- Indicadores como "População", "Área Territorial" e "Densidade Demográfica" têm peso 0 e são CONTEXTUAIS — apenas caracterizam o destino.
- Quando aparecerem na trilha de auditoria com source_type terminando em "_CONTEXTUAL" (ou normalized_score = 0 e weight = 0), apresente-os SOMENTE na "Ficha Técnica" / "Caracterização do Destino" como dados informativos.
- NUNCA atribua status (CRÍTICO/ATENÇÃO/ADEQUADO/EXCELENTE) a indicador contextual. NUNCA inclua na seção de gargalos. NUNCA inclua nas tabelas de pontuação por eixo.

${MEC_FORMATTING_RULES}`;

// ========== CANONICAL BIBLIOGRAPHY (anti-hallucination) ==========
// Datas/títulos canônicos que o LLM DEVE usar quando citar essas obras.
// Evita erros recorrentes (ex.: SISTUR de 1997, não 2021).
const CANONICAL_REFERENCES = `
REFERÊNCIAS CANÔNICAS — USAR EXATAMENTE ESTAS DATAS E TÍTULOS (NUNCA INVENTAR ANO):

Obrigatórias quando citar Mario Beni / SISTUR:
- BENI, Mario Carlos. Análise estrutural do turismo. São Paulo: SENAC, 1997. (PRIMEIRA edição — origem do modelo SISTUR. Ano: 1997, NÃO 2001, NÃO 2021.)
- BENI, Mario Carlos. Análise estrutural do turismo. 13. ed. São Paulo: SENAC, 2007. (edição revisada/ampliada de referência mais usada na academia)
- BENI, Mario Carlos. Política e planejamento de turismo no Brasil. São Paulo: Aleph, 2006.
- BENI, Mario Carlos. Globalização do turismo: megatendências do setor e a realidade brasileira. São Paulo: Aleph, 2003.

Outras obras de apoio (citar somente se realmente usar):
- TASSO, J. P. F.; SILVA, L. C. da; NASCIMENTO, A. (Org.). Mandala da Sustentabilidade no Turismo. Brasília: UnB, 2024.
- BRASIL. Ministério do Turismo. Plano Nacional de Turismo 2024–2027. Brasília: MTur, 2024.
- BRASIL. Constituição da República Federativa do Brasil de 1988. (Art. 198 — saúde 15%; Art. 212 — educação 25%).

REGRAS DURAS — POLÍTICA "ZERO ALUCINAÇÃO":
1. NUNCA invente, suponha, estime ou extrapole NADA. Se um dado/ano/número/fonte não estiver presente nas seções de contexto entregues (TABELA DE AUDITORIA, VALORES BRUTOS, BENCHMARKS OFICIAIS, METADADOS DO DESTINO, BASE DE CONHECIMENTO ou nesta BIBLIOGRAFIA CANÔNICA), você NÃO pode usá-lo.
2. NUNCA atribuir o modelo SISTUR a 2021, 2020 ou qualquer ano diferente de 1997 (origem) ou 2007 (edição revisada).
3. NUNCA inventar título, editora ou ano de obra de Beni. Se não tiver certeza, use a edição de 1997 ou 2007 desta lista.
4. Ao citar Beni no corpo do texto: (BENI, 1997) para o modelo original; (BENI, 2007) para a edição revisada.
5. Toda obra citada no texto DEVE aparecer na seção "Referências" no formato ABNT NBR 6023 desta lista. NÃO cite autor/obra fora desta lista a menos que conste explicitamente nos documentos da Base de Conhecimento entregues no prompt.
6. NÚMEROS: cada percentual, valor monetário, contagem ou ano referente ao destino DEVE corresponder exatamente a uma linha da TABELA DE AUDITORIA ou da seção VALORES BRUTOS. Se não houver dado validado para sustentar uma afirmação numérica, escreva literalmente "[dado não disponível na base validada]" — NÃO arredonde para um valor "plausível", NÃO use "aproximadamente", NÃO infira tendência sem dado.
7. ANOS DE REFERÊNCIA: ao citar um valor, use o ano que aparece na trilha de auditoria (campo reference_year/source_detail). Se ausente, omita o ano em vez de inventar.
8. FONTES: toda tabela/afirmação numérica DEVE indicar a fonte (IBGE, DATASUS, STN, CADASTUR, INEP, ANA, MTur, Mapa do Turismo, Manual etc.) — exatamente como aparece na trilha de auditoria. NÃO atribua um dado MANUAL a uma fonte oficial.
9. STATUS / CLASSIFICAÇÃO: use SOMENTE a régua oficial (CRÍTICO/ATENÇÃO/ADEQUADO/FORTE/EXCELENTE) e respeite o status já calculado para cada indicador/eixo. NÃO invente "tendência de melhora", "crescimento de X%" ou "comparação histórica" sem dois pontos no tempo presentes nos dados.
10. COMPARAÇÕES com outros municípios/regiões: somente se o valor comparado constar dos BENCHMARKS OFICIAIS injetados. Caso contrário, omita.
11. Se faltar dado para uma seção inteira, escreva "Seção sem dados validados suficientes para análise neste ciclo." em vez de preencher com generalidades.
12. Em caso de dúvida, PREFIRA OMITIR a inventar.
13. CITAÇÃO DE PÁGINA: só inclua número de página de obra (ex.: "BENI, 1997, p. 145") se o trecho do livro estiver LITERALMENTE presente na seção BASE DE CONHECIMENTO DO DESTINO ou DOCUMENTOS DE REFERÊNCIA NACIONAL desta entrega, com a página explicitamente registrada no excerto. Caso contrário, cite somente autor e ano — JAMAIS invente número de página.
`;

function getSystemPrompt(template: string, isEnterprise: boolean): string {
  if (isEnterprise) {
    return getEnterpriseSystemPrompt(template);
  }
  return getTerritorialSystemPrompt(template);
}

function getTerritorialSystemPrompt(template: string): string {
  const common = `Você é um analista técnico em turismo público. Gere um relatório seguindo estritamente a metodologia SISTUR.

POLÍTICA "ZERO ALUCINAÇÃO" (PRIORITÁRIA SOBRE QUALQUER OUTRA REGRA):
- Use APENAS dados presentes nas seções injetadas (TABELA DE AUDITORIA, VALORES BRUTOS, BENCHMARKS OFICIAIS, METADADOS, BASE DE CONHECIMENTO e BIBLIOGRAFIA CANÔNICA).
- NÃO invente números, anos, taxas, comparações, tendências, autores ou citações.
- Quando faltar dado validado, escreva literalmente "[dado não disponível na base validada]" e siga em frente. NÃO use "aproximadamente", "estima-se", "cerca de" sem dado de origem.
- Cada número apresentado DEVE bater com a TABELA DE AUDITORIA (mesmo valor, mesma fonte, mesmo ano). Cada citação bibliográfica DEVE bater com a BIBLIOGRAFIA CANÔNICA.

${BASE_METHODOLOGY}

${CANONICAL_REFERENCES}

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- Comece SEMPRE com o título "# Relatório SISTUR" seguido da tabela de ficha técnica fornecida
- Use markdown com headers hierárquicos (# ## ###)
- SEMPRE apresente indicadores em TABELAS MARKDOWN (| col1 | col2 |)
- NUNCA liste indicadores como texto corrido quando puder usar tabela
- TEMPLATE CANÔNICO DE INDICADORES (OBRIGATÓRIO — use exatamente estas 5 colunas, nesta ordem, em TODAS as tabelas de indicadores de qualquer eixo/categoria/seção):
    | Indicador | Valor | Unidade | Status | Fonte |
  Onde:
    * Indicador = nome curto do indicador (sem código)
    * Valor = número formatado em pt-BR (vírgula decimal, ponto de milhar). Exemplos: "65,3" / "45.321" / "R$ 1.234,56" / "2,3" / "B" / "Sim"
    * Unidade = unidade pura, sem repetir o número. Exemplos: "%", "hab.", "R$", "dias", "score 1-5", "—" (quando não houver)
    * Status = um dos rótulos canônicos com emoji: "🟢 EXCELENTE" | "🔵 FORTE" | "🟡 ADEQUADO" | "🟠 ATENÇÃO" | "🔴 CRÍTICO" | "⚪ INFORMATIVO" (apenas para contextuais peso 0). PROIBIDO abreviar ("AT", "CRIT", "EXC", "ADEQ" etc.) ou traduzir — escreva o rótulo POR EXTENSO em maiúsculas, exatamente como acima, com acento e o emoji.
    * Fonte = sigla oficial conforme TRILHA DE AUDITORIA: IBGE | DATASUS | STN | CADASTUR | MTur | INEP | ANA | ANATEL | TSE | SEEG | Manual | KB
   É PROIBIDO: adicionar/remover colunas, trocar a ordem, usar "Score" no lugar de "Valor", omitir a Unidade, ou apresentar o status sem o emoji.
   INTEGRIDADE DE LINHA (CRÍTICO): TODA linha de dados DEVE conter EXATAMENTE 5 células separadas por "|" — uma para Indicador, Valor, Unidade, Status e Fonte. NUNCA emita uma linha com célula vazia ou faltante (isso desalinha a tabela). Se um indicador real não tiver valor numérico disponível na TABELA DE AUDITORIA, escreva "[dado não disponível na base validada]" na coluna Valor e "—" na Unidade — jamais deixe a célula em branco. Se um indicador aparece em duas variações distintas na auditoria (ex.: "anos iniciais" e "anos finais"), liste como DUAS linhas separadas, cada uma com seu próprio Valor — nunca colapse em uma linha única sem valor.
  Se quiser dar contexto adicional (ex.: benchmark, evidência, observação), faça-o em PARÁGRAFO logo abaixo da tabela — NUNCA como coluna extra.
- Banco de Ações em tabela: Ação | Pilar | Prazo | Responsável | Prioridade
- TOM NARRATIVO (OBRIGATÓRIO): cada seção de análise (Resumo, Diagnóstico por Eixo, Conclusão) DEVE ser apresentada em PARÁGRAFOS CORRIDOS de 3-6 frases, com prosa fluida e técnica em português institucional. Use tabelas APENAS para a ficha técnica, listas de indicadores e banco de ações — NUNCA substitua a análise textual por bullets ou listas de tópicos. Após cada tabela de indicadores, escreva 1-2 parágrafos interpretando os dados (não apenas repetindo-os): conecte dado → causa provável → impacto territorial → decisão recomendada.
- ESTRUTURA FLEXÍVEL DE SUBSEÇÕES: as subseções numeradas (2.1, 2.2, 3.1 etc.) sugeridas no template do relatório são GUIAS de cobertura temática, NÃO cabeçalhos obrigatórios. Prefira blocos narrativos contínuos quando o assunto fluir naturalmente em 2-3 parágrafos consecutivos — não fragmente uma análise coesa em 4 microsseções de 2 frases cada. Use subtítulos com três jogos-da-velha (###) apenas quando ajudarem a leitura, não como camisa-de-força ABNT. Resultado esperado: texto que respira como ensaio técnico, não como formulário preenchido.
- Linguagem institucional, clara e objetiva — evite jargão acadêmico inflado, marcadores excessivos e frases de uma palavra. Prefira "Foz do Iguaçu apresenta…" a "• Score: X • Status: Y".
- Justifique conclusões com dados. Conecte sempre: dado → impacto → decisão.
- Se estimar dados: "[ESTIMADO]"
- SEMPRE inclua a coluna "Fonte" do template canônico nas tabelas de indicadores, citando a origem dos dados
- NUNCA aplique cores, negrito ou itálico ao texto de Status — a cor é aplicada automaticamente pelo renderizador a partir do rótulo canônico`;

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
- Tabela CANÔNICA (obrigatória): | Indicador | Valor | Unidade | Status | Fonte |
- Logo abaixo da tabela, em parágrafo livre, mencione evidências relevantes (campo value_text dos VALORES BRUTOS) e benchmark quando existir — NÃO crie colunas extras.
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
- Tabela: | Indicador | Valor Observado | Valor Oficial | Fonte | Ano | (essa é a única exceção ao template canônico de 5 colunas — pois compara duas séries)
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

POLÍTICA "ZERO ALUCINAÇÃO" (PRIORITÁRIA SOBRE QUALQUER OUTRA REGRA):
- Use APENAS dados presentes no contexto injetado (PERFIL DO EMPREENDIMENTO, VALORES ENTERPRISE, TABELA DE AUDITORIA, REVIEWS, BASE DE CONHECIMENTO, BIBLIOGRAFIA CANÔNICA).
- NÃO invente KPIs, ROIs, médias de mercado, tendências ou benchmarks que não estejam no contexto.
- Quando faltar dado, escreva "[dado não disponível na base validada]" — não preencha com plausibilidade.
- Cada número e cada citação bibliográfica DEVE corresponder ao contexto/canônico.

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

${CANONICAL_REFERENCES}

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- Comece SEMPRE com título seguido da tabela de ficha técnica fornecida
- TEMPLATE CANÔNICO DE INDICADORES (OBRIGATÓRIO — use exatamente estas 5 colunas, nesta ordem, em TODAS as tabelas de indicadores/KPIs):
    | Indicador | Valor | Unidade | Status | Fonte |
  Status DEVE ser um dos rótulos canônicos com emoji: "🟢 EXCELENTE" | "🔵 FORTE" | "🟡 ADEQUADO" | "🟠 ATENÇÃO" | "🔴 CRÍTICO" | "⚪ INFORMATIVO".
  Use Valor formatado em pt-BR (vírgula decimal, ponto de milhar). NÃO crie colunas extras — coloque benchmarks/evidências em parágrafo abaixo.
- Tabelas devem ter título numerado ACIMA: "Tabela 1 — Título"
- Fonte da tabela ABAIXO: "Fonte: elaboração própria com dados de..."
- Linguagem institucional e impessoal (3ª pessoa)
- Conecte: métrica → gap → ação → resultado esperado
- Se houver dados de reviews/avaliações online, incorpore na análise de satisfação
- Seção final de Referências em formato ABNT NBR 6023
- NUNCA aplique cores/negrito/itálico ao texto de Status — a cor é aplicada pelo renderizador a partir do rótulo canônico`;

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
## 4. Diagnóstico por Categoria Funcional
- Para cada categoria, use a TABELA CANÔNICA: | Indicador | Valor | Unidade | Status | Fonte |
- Logo abaixo de cada tabela, em parágrafo, mencione benchmark, validado em (data) e evidência (value_text/Observações) — NÃO crie colunas extras.
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

/**
 * Fase 5 — Trava de coerência LLM v1.38.0.
 * Verifica determinísticamente se o texto gerado pela IA contradiz os valores
 * numéricos auditados. Detecta afirmações sobre mínimos constitucionais
 * (saúde 15% CF Art.198, educação 25% CF Art.212) inconsistentes com os
 * valores reais, contradições de status (ex: "atende o mínimo" quando o
 * valor está abaixo) e cita IGMA/CADASTUR vs DATASUS sem distinção.
 * Retorna lista de warnings — vazia quando o texto está coerente.
 */
function detectCoherenceWarnings(
  reportText: string,
  auditRows: any[],
): string[] {
  if (!reportText || !auditRows?.length) return [];
  const warnings: string[] = [];
  const text = reportText.toLowerCase();

  const findValue = (codeFragment: string): number | null => {
    const row = auditRows.find((r) =>
      String(r.indicator_code || '').toLowerCase().includes(codeFragment),
    );
    if (!row || row.value === null || row.value === undefined) return null;
    return Number(row.value);
  };

  // Saúde — CF Art. 198 (mínimo 15% da receita líquida)
  const saudeValue = findValue('saude') ?? findValue('saúde');
  if (saudeValue !== null) {
    const claimsMeetsMin =
      /(saúde|saude)[^.]{0,80}(atende|cumpre|acima)[^.]{0,40}(mínimo|minimo|15%)/i.test(reportText) ||
      /(mínimo|minimo) constitucional[^.]{0,40}(saúde|saude)[^.]{0,40}(atendid|cumprid)/i.test(reportText);
    if (claimsMeetsMin && saudeValue < 15) {
      warnings.push(`Texto afirma cumprimento do mínimo constitucional de saúde (15%), mas o valor auditado é ${saudeValue.toFixed(1)}%.`);
    }
    const claimsBelowMin = /(saúde|saude)[^.]{0,80}(abaixo|não atende|nao atende)[^.]{0,40}(mínimo|minimo|15%)/i.test(reportText);
    if (claimsBelowMin && saudeValue >= 15) {
      warnings.push(`Texto afirma descumprimento do mínimo constitucional de saúde, mas o valor auditado (${saudeValue.toFixed(1)}%) atende os 15%.`);
    }
  }

  // Educação — CF Art. 212 (mínimo 25%)
  const educValue = findValue('educacao') ?? findValue('educação');
  if (educValue !== null) {
    const claimsMeetsMin =
      /(educação|educacao)[^.]{0,80}(atende|cumpre|acima)[^.]{0,40}(mínimo|minimo|25%)/i.test(reportText) ||
      /(mínimo|minimo) constitucional[^.]{0,40}(educação|educacao)[^.]{0,40}(atendid|cumprid)/i.test(reportText);
    if (claimsMeetsMin && educValue < 25) {
      warnings.push(`Texto afirma cumprimento do mínimo constitucional de educação (25%), mas o valor auditado é ${educValue.toFixed(1)}%.`);
    }
    const claimsBelowMin = /(educação|educacao)[^.]{0,80}(abaixo|não atende|nao atende)[^.]{0,40}(mínimo|minimo|25%)/i.test(reportText);
    if (claimsBelowMin && educValue >= 25) {
      warnings.push(`Texto afirma descumprimento do mínimo constitucional de educação, mas o valor auditado (${educValue.toFixed(1)}%) atende os 25%.`);
    }
  }

  // Confusão entre leitos de hospedagem (CADASTUR) e leitos hospitalares (DATASUS/SUS)
  const hasHospedagemRow = auditRows.some((r) => String(r.indicator_code || '').includes('leitos_hospedagem'));
  const hasSusRow = auditRows.some((r) => String(r.indicator_code || '').includes('leitos_hospitalares_sus'));
  if (hasHospedagemRow && hasSusRow) {
    // Se o texto fala de "leitos" perto de "saúde/SUS" mas o número citado bate com hospedagem, sinaliza
    const ambiguous = /leitos? (hospital|sus|saúde|saude)[^.]{0,80}cadastur/i.test(reportText) ||
                      /cadastur[^.]{0,80}leitos? (hospital|sus|saúde|saude)/i.test(reportText);
    if (ambiguous) {
      warnings.push('Texto associa CADASTUR a leitos hospitalares/SUS — leitos do CADASTUR são de meios de hospedagem; leitos hospitalares vêm do DATASUS.');
    }
  }

  // Status declarado vs status real (Adequado afirmado quando score é Crítico)
  for (const row of auditRows) {
    const score = Number(row.normalized_score);
    if (!Number.isFinite(score)) continue;
    const code = String(row.indicator_code || '').toLowerCase();
    if (!code) continue;
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$1');
    const nearby = new RegExp(`${escapedCode}[^.]{0,120}(adequado|excelente|forte)`, 'i');
    if (score < 0.34 && nearby.test(reportText)) {
      warnings.push(`Indicador ${row.indicator_code} é classificado como Crítico (score ${(score * 100).toFixed(0)}%) mas o texto o descreve como Adequado/Forte/Excelente.`);
    }
  }

  // ===== Citações de Beni / SISTUR — anos canônicos =====
  // Modelo SISTUR foi publicado em 1997; edição revisada 2007. Qualquer outro ano = alucinação.
  const beniWrongYear = /\bBENI[^)]{0,40},\s*(19[0-8]\d|199[0-6]|2008|2009|201\d|202[0-6])\)/gi;
  const beniMatches = reportText.match(beniWrongYear);
  if (beniMatches && beniMatches.length > 0) {
    const unique = Array.from(new Set(beniMatches));
    warnings.push(
      `Citação de Beni com ano não canônico detectada: ${unique.join(', ')}. ` +
      `Anos válidos: 1997 (Análise Estrutural do Turismo, 1ª ed.), 2003 (Globalização do Turismo), ` +
      `2006 (Política e Planejamento), 2007 (Análise Estrutural, 13. ed.).`
    );
  }
  // SISTUR atribuído a ano errado fora de citação parentética
  if (/SISTUR[^.]{0,80}(?:em|de|no ano de|publicad[oa] em)\s*(19[0-8]\d|199[0-6]|201\d|202\d)/i.test(reportText)) {
    warnings.push('Texto atribui o modelo SISTUR a ano incorreto. O modelo foi publicado por Mario Beni em 1997 (Análise Estrutural do Turismo, SENAC).');
  }

  // ===== Validação cruzada: valores numéricos citados vs auditoria =====
  // Para cada linha de auditoria com valor numérico, procura citações próximas
  // ao código do indicador no texto e checa se o número bate (tolerância 5%).
  for (const row of auditRows) {
    const v = Number(row.value);
    if (!Number.isFinite(v) || v === 0) continue;
    const code = String(row.indicator_code || '');
    if (!code) continue;
    // Procura o nome amigável do indicador (parte após primeiro "_")
    const friendly = code.replace(/^igma_|^mst_/i, '').replace(/_/g, '[ _-]?');
    const escaped = friendly.replace(/[.*+?^${}()|[\]\\]/g, (m) => m === '[' || m === ']' ? m : '\\' + m);
    const re = new RegExp(`${escaped}[^.]{0,120}?(\\d{1,3}(?:[.,]\\d{1,3})*(?:[.,]\\d+)?)`, 'i');
    const m = reportText.match(re);
    if (!m) continue;
    // Normaliza número brasileiro: 45.321,5 -> 45321.5
    const numStr = m[1].replace(/\./g, '').replace(',', '.');
    const cited = Number(numStr);
    if (!Number.isFinite(cited) || cited === 0) continue;
    const ratio = Math.abs(cited - v) / Math.max(Math.abs(v), 1);
    // Aceita se difere em <5% OU se for múltiplo (ex.: percentual vs decimal)
    if (ratio > 0.05 && Math.abs(cited - v * 100) / Math.max(Math.abs(v * 100), 1) > 0.05
        && Math.abs(cited * 100 - v) / Math.max(Math.abs(v), 1) > 0.05) {
      warnings.push(
        `Valor citado para "${code}" (${m[1]}) diverge do valor auditado (${v.toLocaleString('pt-BR')}).`
      );
    }
  }

  return warnings;
}

/**
 * Validação determinística de referências inventadas.
 *
 * Frente 2 — protege o relatório contra:
 *  - Indicadores citados que não existem na trilha de auditoria.
 *  - Atribuição de fonte (IBGE / CADASTUR / DATASUS / etc.) a indicadores
 *    cuja `source_type` real é MANUAL (sem origem oficial).
 *  - Anos de fonte fora do `reference_year` registrado na auditoria.
 *
 * A função é tolerante: só sinaliza quando há um match razoavelmente forte
 * entre uma frase e um indicador ou fonte, evitando falsos positivos.
 */
function detectInventedReferences(
  reportText: string,
  auditRows: any[],
): string[] {
  if (!reportText || !auditRows?.length) return [];
  const warnings: string[] = [];

  // Conjunto canônico de fontes oficiais reconhecidas
  const KNOWN_SOURCES = [
    'IBGE', 'DATASUS', 'CADASTUR', 'INEP', 'STN', 'ANAC', 'ANATEL',
    'ANA', 'TSE', 'CADUNICO', 'MAPA DO TURISMO', 'MTUR', 'IPHAN',
    'IGMA', 'SISTUR',
  ];

  // Mapeia source_type por indicator_code
  const auditByCode = new Map<string, any>();
  for (const r of auditRows) {
    const code = String(r.indicator_code || '').toLowerCase();
    if (code) auditByCode.set(code, r);
  }

  // 1) Verifica menções a indicadores que NÃO existem na auditoria.
  //    Procura padrões "indicador X" / "índice Y" e cruza com a base.
  const indicatorMentions = reportText.match(
    /\b(?:indicador|índice|indice)\s+["']?([A-Za-zÁ-Úá-ú0-9_\-\s]{4,60}?)["']?(?=[.,;:\)\n])/g,
  );
  if (indicatorMentions) {
    for (const raw of indicatorMentions) {
      const m = raw.match(/\b(?:indicador|índice|indice)\s+["']?(.+?)["']?$/i);
      if (!m) continue;
      const cited = m[1].trim().toLowerCase();
      // Só checa códigos técnicos com underscore (ex.: igma_xxx)
      if (!/_/.test(cited)) continue;
      const codeOnly = cited.split(/\s/)[0];
      if (codeOnly.length < 4) continue;
      if (!auditByCode.has(codeOnly)) {
        warnings.push(
          `Texto cita o indicador "${codeOnly}" que não existe na trilha de auditoria deste diagnóstico.`
        );
      }
    }
  }

  // 2) Atribuição de fonte oficial a indicador MANUAL.
  //    Para cada linha de auditoria com source_type começando em MANUAL,
  //    se o texto cita o código do indicador junto a uma fonte oficial,
  //    sinaliza divergência.
  for (const row of auditRows) {
    const code = String(row.indicator_code || '');
    const sourceType = String(row.source_type || '');
    if (!code || !sourceType.startsWith('MANUAL')) continue;
    const friendly = code.replace(/^igma_|^mst_/i, '').replace(/_/g, '[ _-]?');
    const escaped = friendly.replace(/[.*+?^${}()|[\]\\]/g, (ch) =>
      ch === '[' || ch === ']' ? ch : '\\' + ch,
    );
    for (const src of KNOWN_SOURCES) {
      const re = new RegExp(`${escaped}[^.\\n]{0,140}\\b${src}\\b`, 'i');
      const reRev = new RegExp(`\\b${src}\\b[^.\\n]{0,140}${escaped}`, 'i');
      if (re.test(reportText) || reRev.test(reportText)) {
        warnings.push(
          `Indicador "${code}" é classificado como MANUAL na auditoria, mas o texto atribui sua origem a "${src}".`
        );
        break;
      }
    }
  }

  // 3) Ano de fonte divergente (quando temos source_detail com ano)
  for (const row of auditRows) {
    const code = String(row.indicator_code || '');
    const detail = String(row.source_detail || '');
    const yearMatch = detail.match(/(20\d{2}|19\d{2})/);
    if (!code || !yearMatch) continue;
    const refYear = yearMatch[1];
    const friendly = code.replace(/^igma_|^mst_/i, '').replace(/_/g, '[ _-]?');
    const escaped = friendly.replace(/[.*+?^${}()|[\]\\]/g, (ch) =>
      ch === '[' || ch === ']' ? ch : '\\' + ch,
    );
    const re = new RegExp(`${escaped}[^.\\n]{0,160}?(20\\d{2}|19\\d{2})`, 'i');
    const m = reportText.match(re);
    if (m && m[1] !== refYear) {
      // Aceita diferença de até 1 ano (defasagem comum entre publicação e referência)
      if (Math.abs(Number(m[1]) - Number(refYear)) > 1) {
        warnings.push(
          `Texto cita ano ${m[1]} para "${code}", mas o ano de referência registrado na auditoria é ${refYear}.`
        );
      }
    }
  }

  return warnings;
}

/**
 * Auto-correção determinística (v1.38.8).
 * Para cada linha de auditoria com valor numérico, localiza citações próximas
 * ao código do indicador no texto que divergem >5% do valor auditado e
 * substitui pelo valor canônico formatado em pt-BR. Retorna o texto corrigido
 * e a lista de substituições aplicadas.
 */
function applyAutoCorrections(
  reportText: string,
  auditRows: any[],
): { text: string; corrections: Array<{ indicator: string; from: string; to: string }> } {
  if (!reportText || !auditRows?.length) return { text: reportText, corrections: [] };
  let text = reportText;
  const corrections: Array<{ indicator: string; from: string; to: string }> = [];

  for (const row of auditRows) {
    const v = Number(row.value);
    if (!Number.isFinite(v) || v === 0) continue;
    const code = String(row.indicator_code || '');
    if (!code) continue;
    const friendly = code.replace(/^igma_|^mst_/i, '').replace(/_/g, '[ _-]?');
    const escaped = friendly.replace(/[.*+?^${}()|[\]\\]/g, (m) => m === '[' || m === ']' ? m : '\\' + m);
    const re = new RegExp(`(${escaped}[^.]{0,120}?)(\\d{1,3}(?:[.,]\\d{1,3})*(?:[.,]\\d+)?)`, 'i');
    const m = text.match(re);
    if (!m) continue;
    const citedStr = m[2];
    const numStr = citedStr.replace(/\./g, '').replace(',', '.');
    const cited = Number(numStr);
    if (!Number.isFinite(cited) || cited === 0) continue;
    // Mesma tolerância da validação
    const r1 = Math.abs(cited - v) / Math.max(Math.abs(v), 1);
    const r2 = Math.abs(cited - v * 100) / Math.max(Math.abs(v * 100), 1);
    const r3 = Math.abs(cited * 100 - v) / Math.max(Math.abs(v), 1);
    if (r1 <= 0.05 || r2 <= 0.05 || r3 <= 0.05) continue;
    // Decide escala alvo: se a citação parece percentual (≤100 e v≤1), usa v*100
    let target = v;
    if (cited <= 100 && v <= 1) target = v * 100;
    const decimals = /[.,]/.test(citedStr) ? 1 : 0;
    const formatted = target.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: 2 });
    text = text.replace(re, `$1${formatted}`);
    corrections.push({ indicator: code, from: citedStr, to: formatted });
  }

  return { text, corrections };
}

/**
 * Agente IA validador (segunda passagem).
 * Recebe o relatório gerado + a tabela de auditoria + bibliografia canônica
 * e devolve uma lista estruturada de divergências factuais.
 * Não bloqueante — falhas retornam lista vazia.
 */
async function runReportValidatorAgent(
  reportText: string,
  auditRows: any[],
  apiKey: string,
  globalRefs: any[] = [],
): Promise<string[]> {
  if (!reportText || !apiKey) return [];
  try {
    const auditCompact = (auditRows || []).map((r) => ({
      code: r.indicator_code,
      name: r.indicator_name,
      pillar: r.pillar,
      value: r.value,
      score_pct: r.normalized_score !== null && r.normalized_score !== undefined
        ? Math.round(Number(r.normalized_score) * 100)
        : null,
      source: r.source_type,
      source_detail: r.source_detail,
    }));

    const providedRefs = (globalRefs || [])
      .map((ref: any) => `- ${ref.file_name || ref.category || 'Documento'}${ref.category ? ` (${ref.category})` : ''}${ref.description ? ` — ${ref.description}` : ''}`)
      .join('\n') || '- Nenhum documento nacional adicional fornecido.';

    const sys = `Você é um agente de auditoria factual ESTRITO para relatórios técnicos em turismo (SISTUR).
Sua tarefa: comparar o RELATÓRIO contra os DADOS AUDITADOS e a BIBLIOGRAFIA CANÔNICA, e listar TODA alucinação, suposição ou afirmação sem lastro.

BIBLIOGRAFIA CANÔNICA (qualquer outra data/título para essas obras é ERRO):
- BENI, M. C. Análise Estrutural do Turismo. SENAC, 1997 (1ª ed., origem do modelo SISTUR) e 2007 (13. ed. revisada).
- BENI, M. C. Globalização do Turismo. Aleph, 2003.
- BENI, M. C. Política e Planejamento de Turismo no Brasil. Aleph, 2006.
- TASSO, J. P. F. et al. Mandala da Sustentabilidade no Turismo. UnB, 2024.

DOCUMENTOS DE REFERÊNCIA FORNECIDOS NA GERAÇÃO:
${providedRefs}

POLÍTICA "ZERO ALUCINAÇÃO" — REPORTE COMO ISSUE TODOS OS CASOS ABAIXO:
1. Qualquer número (%, R$, contagem, taxa) citado no relatório que NÃO bata com a tabela de DADOS AUDITADOS (tolerância 5%, com escala percentual ↔ decimal).
2. Qualquer número/estatística que NÃO tenha correspondência alguma na tabela de auditoria (alucinação pura — "inventou um número").
3. Qualquer ano de referência citado para um indicador que difira do source_detail/reference_year auditado.
4. Qualquer citação (AUTOR, ANO) com autor/ano fora da bibliografia canônica E que não tenha sido entregue nos DOCUMENTOS DE REFERÊNCIA FORNECIDOS.
5. Qualquer ano errado para o modelo SISTUR (correto: 1997 ou 2007 — NUNCA 2001/2020/2021).
6. Atribuição de fonte trocada (ex.: dado MANUAL apresentado como "IBGE", leitos CADASTUR apresentados como "DATASUS").
7. Status invertido ou inventado (ex.: "Adequado" quando o score auditado é Crítico/Atenção; "tendência de crescimento" sem dois pontos no tempo).
8. Comparações com outros municípios/regiões SEM benchmark oficial nos dados auditados.
9. Afirmações de cumprimento de mínimo constitucional (saúde 15% / educação 25%) que contradigam o valor auditado.
10. Frases vagas que escondem invenção: "aproximadamente", "cerca de", "estima-se", "tendência indica" — quando NÃO há dado auditado que sustente.

REGRAS DE SAÍDA:
- NÃO comente estilo, tom, formatação ou opiniões — só fatos.
- Cada item deve apontar: o que o texto diz × o que está auditado/canônico (com o número/ano/fonte exatos).
- Máx. 20 itens. Se não houver divergências, devolva {"issues": []}.
- Devolva ESTRITAMENTE um JSON: {"issues": ["...", "..."]}. Nada mais.`;

    const usr = `=== DADOS AUDITADOS (fonte de verdade) ===
${JSON.stringify(auditCompact, null, 2)}

Total de indicadores auditados nesta base: ${auditCompact.length}. Não afirme que a base contém menos indicadores do que este total.

=== RELATÓRIO GERADO ===
${reportText.slice(0, 18000)}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: usr },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) {
      console.warn('Validator agent HTTP', resp.status);
      return [];
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content);
    const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];
    return issues.filter((s: unknown) => typeof s === 'string' && s.length > 0).slice(0, 20);
  } catch (err) {
    console.warn('Validator agent error (non-blocking):', err);
    return [];
  }
}

// ========== MAIN ==========

// v1.38.31 — Pipeline de geração executado em background (EdgeRuntime.waitUntil).
// Para evitar duplicar as ~500 linhas do pipeline inline dentro do `serve`,
// reaproveitamos o próprio endpoint chamando-o em modo stream a partir do
// worker (passando o JWT original do usuário). O endpoint stream já persiste
// `generated_reports` + `report_validations` + `audit_events` na conclusão,
// então só precisamos esperar o stream terminar e devolver o reportId.
async function runReportPipeline(args: {
  supabaseAdmin: any;
  assessment: any;
  assessmentId: string;
  destinationName: string;
  pillarScores: any;
  issues: any;
  prescriptions: any;
  forceRegenerate: any;
  reportTemplate: string;
  visibility: string;
  environment: string;
  enableComparison: boolean;
  userId: string;
  jobId: string;
  authHeader: string;
  aiProvider?: 'auto' | 'claude' | 'gpt5' | 'gemini';
  appVersion?: string;
  logger?: StageLogger;
}): Promise<{ reportId: string | null }> {
  const { supabaseAdmin, assessment, assessmentId, destinationName, jobId } = args;
  const logger = args.logger ?? createStageLogger({ jobId, assessmentId, traceId: jobId });
  logger.setJobId(jobId);
  logger.setAssessmentId(assessmentId);
  logger.stage('pipeline_start', { destinationName, template: args.reportTemplate });

  // Atualiza progresso enquanto o stream roda. Não conhecemos o tamanho final,
  // então simulamos um avanço logarítmico: 15% ao começar, +5% a cada 30s,
  // travando em 90% antes da persistência final.
  let pct = 15;
  const streamController = new AbortController();
  const streamStartedAt = Date.now();
  let lastStreamChunkAt = Date.now();
  // v1.38.33 — Idle timeout aumentado para 4min: Gemini 2.5-pro com prompts
  // grandes (100+ indicadores) frequentemente passa 2-3min entre chunks
  // durante validação determinística + persistência. Hard timeout em 12min.
  const STREAM_IDLE_TIMEOUT_MS = 4 * 60 * 1000;
  const STREAM_HARD_TIMEOUT_MS = 12 * 60 * 1000;
  const progressTimer = setInterval(() => {
    pct = Math.min(90, pct + 5);
    supabaseAdmin.from('report_jobs').update({
      progress_pct: pct,
      stage: `[trace=${logger.traceId}] ${pct < 50 ? 'Gerando narrativa com IA' : 'Validando coerência e persistindo'}`,
    }).eq('id', jobId).then(() => {}, () => {});
  }, 30_000);
  const streamWatchdog = setInterval(() => {
    const now = Date.now();
    if (now - lastStreamChunkAt > STREAM_IDLE_TIMEOUT_MS) {
      const idleSec = Math.round((now - lastStreamChunkAt) / 1000);
      logger.error('stream_idle_timeout', new Error(`No chunk for ${idleSec}s`), {
        last_stage: logger.lastStage(),
        elapsed_sec: Math.round((now - streamStartedAt) / 1000),
      });
      streamController.abort('internal-report-stream-idle-timeout');
    } else if (now - streamStartedAt > STREAM_HARD_TIMEOUT_MS) {
      logger.error('stream_hard_timeout', new Error('Hard timeout reached'), {
        last_stage: logger.lastStage(),
        elapsed_sec: Math.round((now - streamStartedAt) / 1000),
      });
      streamController.abort('internal-report-stream-hard-timeout');
    }
  }, 15_000);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const url = `${supabaseUrl}/functions/v1/generate-report`;
    logger.stage('internal_fetch_start');
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Reusa o JWT do usuário original — o pipeline stream valida acesso
        // exatamente como na chamada original.
        Authorization: args.authHeader,
        'x-trace-id': logger.traceId,
      },
      body: JSON.stringify({
        assessmentId,
        destinationName,
        pillarScores: args.pillarScores,
        issues: args.issues,
        prescriptions: args.prescriptions,
        forceRegenerate: args.forceRegenerate,
        reportTemplate: args.reportTemplate,
        visibility: args.visibility,
        environment: args.environment,
        enableComparison: args.enableComparison,
        mode: 'stream',
        // v1.38.49 — NÃO usar backgroundRun aqui. Quando true, o endpoint
        // interno só responde JSON após todo o relatório/validação terminar,
        // ficando sem bytes por ~150s e estourando IDLE_TIMEOUT. Mantemos
        // stream real + heartbeat e drenamos até a persistência final.
        backgroundRun: false,
        aiProvider: args.aiProvider ?? 'auto',
        appVersion: args.appVersion ?? VALIDATOR_VERSION_FALLBACK,
        traceId: logger.traceId,
      }),
      signal: streamController.signal,
    });
    logger.stage('internal_fetch_headers', { status: resp.status, contentType: resp.headers.get('Content-Type') || '' });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      logger.error('internal_fetch_failed', new Error(`status ${resp.status}`), { body: errText.slice(0, 200) });
      throw new Error(`Pipeline interno falhou (${resp.status}): ${errText.slice(0, 200)}`);
    }
    const contentType = resp.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const payload = await resp.json().catch(() => null);
      if (payload?.skipped) {
        // v1.38.46 — Não há dados novos desde o último relatório, mas o
        // usuário explicitamente pediu uma nova geração (clicou em "Gerar
        // Relatório"). Em vez de exigir uma ação manual de "Regenerar",
        // refazemos a chamada interna automaticamente forçando regeneração.
        if (!args.forceRegenerate) {
          console.log('[runReportPipeline] Pipeline interno respondeu skipped — refazendo com forceRegenerate=true automaticamente.');
          const retryResp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: args.authHeader,
            },
            body: JSON.stringify({
              assessmentId,
              destinationName,
              pillarScores: args.pillarScores,
              issues: args.issues,
              prescriptions: args.prescriptions,
              forceRegenerate: true,
              reportTemplate: args.reportTemplate,
              visibility: args.visibility,
              environment: args.environment,
              enableComparison: args.enableComparison,
              mode: 'stream',
              // Mantém o retry também em stream real para evitar idle timeout.
              backgroundRun: false,
              aiProvider: args.aiProvider ?? 'auto',
              appVersion: args.appVersion ?? VALIDATOR_VERSION_FALLBACK,
            }),
            signal: streamController.signal,
          });
          if (!retryResp.ok) {
            const errText = await retryResp.text().catch(() => '');
            throw new Error(`Pipeline interno falhou no retry (${retryResp.status}): ${errText.slice(0, 200)}`);
          }
          const retryCt = retryResp.headers.get('Content-Type') || '';
          if (retryCt.includes('application/json')) {
            const retryPayload = await retryResp.json().catch(() => null);
            if (retryPayload?.reportId) return { reportId: retryPayload.reportId };
            throw new Error('Pipeline interno retornou resposta inesperada no retry.');
          }
          // Drena o stream do retry e cai no polling abaixo.
          if (retryResp.body) {
            const reader = retryResp.body.getReader();
            while (true) {
              const { done } = await reader.read();
              if (done) break;
              lastStreamChunkAt = Date.now();
            }
          }
          // Pula para o polling de generated_reports (mesmo fluxo do stream normal).
        } else {
          // Já era forceRegenerate=true e ainda assim retornou skipped — devolve o existente.
          if (payload?.reportId) return { reportId: payload.reportId };
          throw new Error('Pipeline interno respondeu skipped mesmo com forceRegenerate.');
        }
      }
      else if (payload?.reportId) return { reportId: payload.reportId };
      else throw new Error('Pipeline interno retornou uma resposta inesperada ao finalizar a geração.');
    }
    // Drena o stream até o fim para garantir que a persistência interna
    // (dentro do EdgeRuntime.waitUntil do endpoint stream) tenha tempo de rodar.
    if (resp.body) {
      logger.stage('drain_stream_start');
      const reader = resp.body.getReader();
      let chunks = 0;
      while (true) {
        const { done } = await reader.read();
        if (done) break;
        chunks++;
        lastStreamChunkAt = Date.now();
      }
      logger.stage('drain_stream_done', { chunks });
    }

    // Polling curto: o endpoint stream salva via background task, então
    // pode haver alguns ms de defasagem entre o fim do stream e o INSERT
    // do generated_reports.
    logger.stage('poll_generated_report_start');
    let reportId: string | null = null;
    for (let i = 0; i < 20; i++) {
      const { data: row } = await supabaseAdmin
        .from('generated_reports')
        .select('id, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (row?.id) { reportId = row.id; break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!reportId) {
      logger.error('poll_generated_report_missed', new Error('Report row not found after stream'));
      throw new Error('Pipeline terminou sem salvar o relatório. A geração foi interrompida antes da persistência final.');
    }
    logger.setReportId(reportId);
    logger.stage('pipeline_done_via_polling');
    return { reportId };
  } catch (err) {
    // v1.38.33 — Recovery: se o stream foi abortado por timeout MAS o
    // relatório já foi salvo (o pipeline interno persiste via background
    // task antes de terminar de drenar o stream), considera sucesso.
    const { data: row } = await supabaseAdmin
      .from('generated_reports')
      .select('id, created_at')
      .eq('assessment_id', assessmentId)
      .gte('created_at', new Date(streamStartedAt - 5000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.id) {
      const savedAt = new Date(row.created_at).getTime();
      // Considera apenas relatórios salvos durante esta execução (após start)
      if (savedAt >= streamStartedAt - 5000) {
        logger.setReportId(row.id);
        logger.stage('pipeline_recovered_after_abort', { id: row.id, last_stage: logger.lastStage() });
        return { reportId: row.id };
      }
    }
    logger.error('pipeline_failed', err, { last_stage: logger.lastStage() });
    throw err;
  } finally {
    clearInterval(progressTimer);
    clearInterval(streamWatchdog);
    logger.stage('pipeline_finally', { elapsed_sec: Math.round((Date.now() - streamStartedAt) / 1000) });
  }
}

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
    const incomingTraceId = req.headers.get('x-trace-id') || undefined;

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

    const {
      assessmentId,
      destinationName,
      pillarScores,
      issues,
      prescriptions,
      forceRegenerate,
      reportTemplate = 'completo',
      visibility = 'personal',
      environment = 'production',
      // GAP-FIX (v1.38.18): Comparação temporal agora é OPT-IN.
      // Antes o relatório injetava automaticamente o bloco "rodada anterior",
      // o que poluía relatórios de primeiro ciclo / KPIs estáveis. Agora o
      // bloco só é gerado quando o cliente passa enableComparison: true.
      enableComparison = false,
      // v1.38.31 — Modo background. Quando 'background', a função cria um
      // registro em report_jobs, responde 202 com { jobId } imediatamente,
      // e processa todo o pipeline via EdgeRuntime.waitUntil. O front faz
      // polling em report_jobs até status 'completed'/'failed'. Default
      // mantido como 'stream' para preservar retrocompatibilidade de chamadas
      // antigas que ainda esperam SSE.
      mode = 'stream',
      // Quando o cliente já criou o job (porque o INSERT roda com a sessão
      // do usuário e respeita a RLS de Admin/Analyst), passa o id aqui e
      // a edge function só atualiza o status.
      jobId: incomingJobId,
      backgroundRun = false,
      // v1.38.35 — Override de provedor de IA (apenas ADMIN).
      // Valores: 'auto' | 'claude' | 'gpt5' | 'gemini'. Default 'auto'
      // mantém a cadeia padrão Claude → GPT-5 → Gemini.
      aiProvider: requestedProvider = 'auto',
      // v1.38.45 — versão do app vigente no cliente. Usada para carimbar
      // `report_validations.validator_version` por request, evitando que
      // a "Conferência de dados" exibida na UI mostre uma string antiga
      // hardcoded no servidor.
      appVersion: rawAppVersion,
      traceId: bodyTraceId,
    } = await req.json();

    const appVersion: string = (typeof rawAppVersion === 'string' && /^v?\d+\.\d+\.\d+/.test(rawAppVersion))
      ? (rawAppVersion.startsWith('v') ? rawAppVersion : `v${rawAppVersion}`)
      : VALIDATOR_VERSION_FALLBACK;

    const logger = createStageLogger({
      traceId: (typeof bodyTraceId === 'string' && bodyTraceId) || incomingTraceId,
      assessmentId,
      jobId: incomingJobId ?? null,
    });
    logger.stage('request_received', { mode, backgroundRun, template: reportTemplate, hasIncomingJob: !!incomingJobId });

    // Valida que somente ADMIN pode forçar provedor — para usuários comuns
    // o valor é silenciosamente reduzido a 'auto'.
    let aiProviderOverride: 'auto' | 'claude' | 'gpt5' | 'gemini' = 'auto';
    if (['claude', 'gpt5', 'gemini', 'auto'].includes(requestedProvider)) {
      if (requestedProvider === 'auto') {
        aiProviderOverride = 'auto';
      } else {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'ADMIN')
          .maybeSingle();
        aiProviderOverride = roleRow ? requestedProvider : 'auto';
      }
    }
    
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

    // ===== v1.38.31 — Modo background =====
    // Quando o cliente pede background, devolvemos 202 imediatamente e
    // processamos o pipeline inteiro via EdgeRuntime.waitUntil. O job é
    // atualizado em report_jobs durante e ao final do processo.
    if (mode === 'background') {
      let jobId = incomingJobId as string | null;
      if (!jobId) {
        const { data: jobInsert, error: jobErr } = await supabaseAdmin
          .from('report_jobs')
          .insert({
            org_id: assessment.org_id,
            assessment_id: assessmentId,
            destination_name: destinationName,
            report_template: reportTemplate,
            visibility,
            environment,
            status: 'queued',
            stage: `[trace=${logger.traceId}] Aguardando início`,
            progress_pct: 0,
            created_by: userId,
          })
          .select('id')
          .maybeSingle();
        if (jobErr || !jobInsert) {
          logger.error('create_report_job_failed', jobErr);
          return new Response(JSON.stringify({ error: 'Não foi possível criar a fila de geração.' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        jobId = jobInsert.id as string;
        logger.setJobId(jobId);
        logger.stage('report_job_created', { jobId });
      }

      const backgroundJob = (async () => {
        try {
          await supabaseAdmin.from('report_jobs').update({
            status: 'processing',
            stage: `[trace=${logger.traceId}] Coletando dados do diagnóstico`,
            progress_pct: 10,
            started_at: new Date().toISOString(),
          }).eq('id', jobId);
          logger.stage('background_job_processing');

          const result = await runReportPipeline({
            supabaseAdmin,
            assessment,
            assessmentId,
            destinationName,
            pillarScores,
            issues,
            prescriptions,
            forceRegenerate,
            reportTemplate,
            visibility,
            environment,
            enableComparison,
            userId,
            jobId: jobId!,
            authHeader: authHeader!,
            aiProvider: aiProviderOverride,
            appVersion,
            logger,
          });

          await supabaseAdmin.from('report_jobs').update({
            status: 'completed',
            stage: `[trace=${logger.traceId}] Concluído`,
            progress_pct: 100,
            report_id: result.reportId,
            finished_at: new Date().toISOString(),
          }).eq('id', jobId);
          logger.setReportId(result.reportId);
          logger.stage('background_job_completed');
        } catch (bgErr) {
          logger.error('background_job_failed', bgErr, { last_stage: logger.lastStage() });
          await supabaseAdmin.from('report_jobs').update({
            status: 'failed',
            error_message: `[trace=${logger.traceId}][last_stage=${logger.lastStage()}] ${bgErr instanceof Error ? bgErr.message : String(bgErr)}`,
            finished_at: new Date().toISOString(),
          }).eq('id', jobId);
        }
      })();

      try {
        // @ts-ignore - EdgeRuntime é global em Supabase Edge Functions
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(backgroundJob);
        }
      } catch (_e) { /* ignore */ }

      return new Response(JSON.stringify({ jobId, status: 'queued' }), {
        status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isEnterprise = assessment.diagnostic_type === 'enterprise';
    console.log('Diagnostic type:', assessment.diagnostic_type, 'Template:', reportTemplate);

    // Check if data changed since last report
    const { data: existingReport } = await supabaseAdmin
      .from('generated_reports')
      .select('id, created_at')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(1)
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

    // Fase 5 — Etapa 4: Audit trail (procedência por indicador) para justificar o relatório.
    // Tabela `assessment_indicator_audit` é populada pelo engine `calculate-assessment`.
    const { data: auditRows } = await supabase
      .from('assessment_indicator_audit')
      .select('indicator_code, pillar, value, normalized_score, source_type, source_detail, weight')
      .eq('assessment_id', assessmentId);
    const auditTrail = buildCanonicalAuditTrail(auditRows || [], indicatorValues, indicatorScores);

    // Catalog indicators by code so we can decorate external benchmarks with
    // names/units from the indicators table.
    const indicatorsByCode = new Map<string, any>();

    // ============================================================
    // COMPARATIVO TEMPORAL — busca rodada anterior do mesmo destino
    // ============================================================
    let previousAssessment: any = null;
    let previousPillarScores: any[] = [];
    let previousIndicatorScores: any[] = [];
    if (enableComparison && destinationId && assessment.calculated_at) {
      const { data: prevA } = await supabase
        .from('assessments')
        .select('id, title, calculated_at, period_end, final_score, final_classification')
        .eq('destination_id', destinationId)
        .eq('status', 'CALCULATED')
        .neq('id', assessmentId)
        .lt('calculated_at', assessment.calculated_at)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevA) {
        previousAssessment = prevA;
        const [prevPillarsRes, prevIndScoresRes] = await Promise.all([
          supabase.from('pillar_scores').select('pillar, score, severity').eq('assessment_id', prevA.id),
          supabase.from('indicator_scores').select('score_pct, indicators(code, name, pillar)').eq('assessment_id', prevA.id),
        ]);
        previousPillarScores = prevPillarsRes.data || [];
        previousIndicatorScores = prevIndScoresRes.data || [];
      }
    }

    const temporalComparisonBlock = (() => {
      if (!previousAssessment) return '';
      const prevByPillar: Record<string, number> = {};
      previousPillarScores.forEach((p: any) => { prevByPillar[p.pillar] = Number(p.score) || 0; });
      const fmtDelta = (cur?: number, prev?: number) => {
        if (cur === undefined || cur === null || prev === undefined || prev === null) return '—';
        const d = (cur - prev) * 100;
        const sign = d > 0 ? '+' : '';
        const arrow = d > 1 ? '↑' : d < -1 ? '↓' : '→';
        return `${arrow} ${sign}${d.toFixed(1)} pp`;
      };
      const ra = pillarScores?.RA?.score, oe = pillarScores?.OE?.score, ao = pillarScores?.AO?.score;
      const prevRa = prevByPillar.RA, prevOe = prevByPillar.OE, prevAo = prevByPillar.AO;

      const prevIndByCode: Record<string, number> = {};
      previousIndicatorScores.forEach((s: any) => {
        const code = s.indicators?.code;
        if (code) prevIndByCode[code] = Number(s.score_pct) || 0;
      });
      const movers = indicatorScores
        .map((s: any) => {
          const code = s.indicators?.code;
          const prev = prevIndByCode[code];
          if (prev === undefined || s.score_pct === null || s.score_pct === undefined) return null;
          const delta = Number(s.score_pct) - prev;
          return { code, name: s.indicators?.name, pillar: s.indicators?.pillar, cur: Number(s.score_pct), prev, delta };
        })
        .filter((x: any) => x && Math.abs(x.delta) >= 1)
        .sort((a: any, b: any) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 8);

      const moversText = movers.length > 0
        ? movers.map((m: any) => `  - [${m.pillar}] ${m.name} (${m.code}): ${m.prev.toFixed(1)}% → ${m.cur.toFixed(1)}% (${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)} pp)`).join('\n')
        : '  Nenhum indicador com variação ≥ 1 pp.';

      const finalDelta = (assessment.final_score !== null && previousAssessment.final_score !== null)
        ? ` (${(((assessment.final_score || 0) - (previousAssessment.final_score || 0)) * 100).toFixed(1)} pp)`
        : '';

      return `=== COMPARATIVO TEMPORAL — RODADA ANTERIOR ===
Rodada anterior: "${previousAssessment.title}" (calculada em ${formatDateOnlyBR(previousAssessment.calculated_at)})
Score Final SISTUR (interno): ${previousAssessment.final_score !== null ? formatPctBR(previousAssessment.final_score) + '%' : 'N/D'} → ${assessment.final_score !== null ? formatPctBR(assessment.final_score) + '%' : 'N/D'}${finalDelta}
Classificação: ${previousAssessment.final_classification || 'N/D'} → ${assessment.final_classification || 'N/D'}

Variação por pilar (atual vs anterior):
- I-RA: ${prevRa !== undefined ? formatPctBR(prevRa) + '%' : 'N/D'} → ${ra !== undefined ? formatPctBR(ra) + '%' : 'N/D'}  ${fmtDelta(ra, prevRa)}
- I-OE: ${prevOe !== undefined ? formatPctBR(prevOe) + '%' : 'N/D'} → ${oe !== undefined ? formatPctBR(oe) + '%' : 'N/D'}  ${fmtDelta(oe, prevOe)}
- I-AO: ${prevAo !== undefined ? formatPctBR(prevAo) + '%' : 'N/D'} → ${ao !== undefined ? formatPctBR(ao) + '%' : 'N/D'}  ${fmtDelta(ao, prevAo)}

Maiores variações por indicador (até 8, ordenadas por magnitude absoluta):
${moversText}

INSTRUÇÕES SOBRE COMPARATIVO TEMPORAL:
- Dedique uma seção à evolução do destino entre a rodada anterior e a atual.
- Destaque conquistas (variações positivas ≥ 3 pp) e regressões (variações negativas ≥ 2 pp).
- Quando houver regressão em pilar inteiro, conecte com possíveis causas estruturais visíveis nos indicadores.
- NUNCA invente comparações com outros municípios — comparativos só com a rodada anterior do próprio destino.
`;
    })();

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

${temporalComparisonBlock}
INDICADORES:
${indicatorsDetail}

VALORES BRUTOS:
${formatIndicatorValues(indicatorValues)}
${isEnterprise && enterpriseValues.length > 0 ? formatEnterpriseValues(enterpriseValues) : ''}
${!isEnterprise ? formatExternalBenchmarks(externalValues, indicatorsByCode) : ''}
${dataSnapshots.length > 0 ? formatDataSnapshots(dataSnapshots) : ''}
=== TRILHA DE AUDITORIA (PROCEDÊNCIA POR INDICADOR) ===
Use esta tabela para JUSTIFICAR cada conclusão citando origem do dado e peso aplicado.
Origens possíveis: OFFICIAL_API (IBGE/DATASUS/STN/CADASTUR/INEP/ANA — máxima confiança),
DERIVED (calculado por fórmula determinística do engine), ESTIMADA (estimativa interna),
MANUAL (entrada do usuário — citar como autodeclarada).
Sufixo _CONTEXTUAL = indicador informativo (peso 0): NÃO atribuir status nem incluir em gargalos.

${formatAuditTrail(auditTrail)}

=== TABELA CANÔNICA DE VALORES (FONTE ÚNICA DA VERDADE) ===
Esta é a referência ABSOLUTA. Cada número que você escrever no relatório DEVE
aparecer EXATAMENTE com o valor desta tabela (mesma vírgula decimal, mesma
unidade, mesma fonte). Se o valor não estiver aqui, escreva
"[dado não disponível na base validada]" — NÃO arredonde, NÃO infira, NÃO
converta unidades por conta própria.
${(() => {
  const lines = ['| Código | Indicador | Valor Bruto | Score | Fonte | Peso |',
                 '|---|---|---|---|---|---|'];
  for (const r of auditTrail) {
    const ind = indicatorsByCode.get(r.indicator_code);
    const name = ind?.name || r.indicator_code;
    const rawDisplay = r.value !== null && r.value !== undefined
      ? Number(r.value).toLocaleString('pt-BR', { maximumFractionDigits: 4 })
      : '—';
    const isCtx = String(r.source_type || '').endsWith('_CONTEXTUAL');
    const scoreDisplay = isCtx
      ? 'CONTEXTUAL'
      : (r.normalized_score !== null && r.normalized_score !== undefined
          ? formatPctBR(Number(r.normalized_score)) + '%'
          : '—');
    const src = r.source_type || 'MANUAL';
    const w = r.weight !== null && r.weight !== undefined ? Number(r.weight).toFixed(4) : '0';
    lines.push(`| ${r.indicator_code} | ${name} | ${rawDisplay} | ${scoreDisplay} | ${src} | ${w} |`);
  }
  return lines.join('\n');
})()}

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
8. Use a TRILHA DE AUDITORIA para fundamentar TODA conclusão: ao citar um indicador, indique sua origem (OFFICIAL_API/DERIVED/MANUAL/ESTIMADA) e o peso aplicado. Indicadores OFFICIAL_API/DERIVED têm prioridade analítica sobre MANUAL/ESTIMADA. Quando MANUAL ou ESTIMADA, sinalize explicitamente como "dado autodeclarado" ou "estimativa preliminar".
9. Valores em moeda DEVEM ser exibidos no padrão brasileiro canônico: prefixo "R$" seguido de valor com vírgula decimal e ponto de milhar (ex: R$ 1.234.567,89). Nunca use "BRL", "$" ou notação científica.
10. COLUNA "Evidência" — quando NÃO houver value_text para o indicador, preencha a célula com a fonte real e o ano da TRILHA DE AUDITORIA (ex.: "OFFICIAL_API — IBGE, 2022" ou "MANUAL — autodeclarado pelo gestor"). NUNCA escreva "[dado não disponível na base validada]" como evidência se o dado EXISTE na trilha de auditoria — esse texto é reservado APENAS para afirmações sem fonte.
11. INDICADORES CONTEXTUAIS (linhas com Score = "CONTEXTUAL" na tabela canônica): apresente APENAS na ficha técnica como dados informativos. NÃO inclua em tabelas de score por eixo, NÃO atribua status, NÃO mencione em gargalos.
${externalValues.length > 0 && !isEnterprise ? '8. SEMPRE renderize a seção de Benchmarks Externos comparando os valores observados no diagnóstico com os valores oficiais retornados pelas integrações (IBGE/DATASUS/STN/CADASTUR/INEP)' : ''}
${isEnterprise && enterpriseProfile ? '8. Incorpore o PERFIL DO EMPREENDIMENTO (tipo, capacidade, certificações, sustentabilidade, acessibilidade) nas recomendações — não escreva um relatório genérico ignorando esses atributos' : ''}
${dataSnapshots.length > 0 ? '9. Use os snapshots de proveniência para rastrear a origem exata de cada indicador' : ''}
${globalRefs.length > 0 ? `10. Referencie documentos oficiais quando contextualizar resultados e prescrições` : ''}
${kbFiles.length > 0 ? `11. Referencie documentos da base de conhecimento do destino quando aplicável` : ''}`;

    // === LLM provider selection + streaming response (v1.38.50) ===
    // Causa raiz do timeout: este endpoint só retornava o Response SSE DEPOIS de
    // abrir a conexão com o provedor de IA. Se o provedor demorasse >150s para
    // entregar headers/primeiro token, a chamada interna do job ficava sem bytes
    // e caía por IDLE_TIMEOUT. Agora o stream é devolvido imediatamente e os
    // heartbeats começam antes de qualquer chamada longa de IA.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const shouldStreamToClient = !backgroundRun;
    let persistedReportId: string | null = null;

    const backgroundTask = (async () => {
      let heartbeatTimer: number | null = null;
      let fullContent = '';
      let response: Response | null = null;
      let usedProvider: 'claude' | 'gpt5' | 'gemini' = 'gemini';
      const fallbackTrail: Array<{ provider: string; reason: string }> = [];
      let streamOpen = true;

      const safeWrite = async (chunk: Uint8Array | string) => {
        if (!shouldStreamToClient || !streamOpen) return;
        const payload = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
        try {
          await writer.write(payload);
        } catch {
          streamOpen = false;
        }
      };

      try {
        if (shouldStreamToClient) {
          heartbeatTimer = setInterval(() => {
            safeWrite(`: heartbeat ${Date.now()}\n\n`);
          }, 15_000);
          await safeWrite(`: started ${Date.now()}\n\n`);
          logger.stage('stream_started');
        }

        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        const requestedProviderForStream = (typeof aiProviderOverride === 'string' ? aiProviderOverride : 'auto') as
          'auto' | 'claude' | 'gpt5' | 'gemini';
        const defaultOrder: Array<'claude' | 'gpt5' | 'gemini'> = ['claude', 'gpt5', 'gemini'];
        const providerOrder: Array<'claude' | 'gpt5' | 'gemini'> = requestedProviderForStream === 'auto'
          ? defaultOrder
          : [requestedProviderForStream, ...defaultOrder.filter((p) => p !== requestedProviderForStream)];
        logger.stage('provider_order_resolved', { order: providerOrder, requested: requestedProviderForStream });

        const callLovableGateway = (model: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
          }),
        });

        const tryClaude = async (): Promise<void> => {
          if (!ANTHROPIC_API_KEY) {
            fallbackTrail.push({ provider: 'claude', reason: 'ANTHROPIC_API_KEY not configured' });
            return;
          }
          try {
            const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 16000,
                stream: true,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
              }),
            });
            if (claudeResp.ok && claudeResp.body) {
              const adapted = new ReadableStream({
                async start(controller) {
                  const reader = claudeResp.body!.getReader();
                  const decoder = new TextDecoder();
                  const outEncoder = new TextEncoder();
                  let buffer = "";
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buffer += decoder.decode(value, { stream: true });
                      let idx: number;
                      while ((idx = buffer.indexOf("\n")) !== -1) {
                        const line = buffer.slice(0, idx).trim();
                        buffer = buffer.slice(idx + 1);
                        if (!line.startsWith("data:")) continue;
                        const payload = line.slice(5).trim();
                        if (!payload) continue;
                        try {
                          const evt = JSON.parse(payload);
                          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                            const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: evt.delta.text } }] })}\n\n`;
                            controller.enqueue(outEncoder.encode(chunk));
                          } else if (evt.type === "message_stop") {
                            controller.enqueue(outEncoder.encode("data: [DONE]\n\n"));
                          } else if (evt.type === "error") {
                            throw new Error(`Claude stream error: ${JSON.stringify(evt.error || evt)}`);
                          }
                        } catch (parseErr) {
                          if (parseErr instanceof Error && parseErr.message.startsWith("Claude stream error")) throw parseErr;
                        }
                      }
                    }
                    controller.close();
                  } catch (e) {
                    console.error("Claude stream adapter error:", e);
                    controller.error(e);
                  }
                },
              });
              response = new Response(adapted, { status: 200, headers: { "Content-Type": "text/event-stream" } });
              usedProvider = 'claude';
              console.log("Report generation using provider: claude (claude-sonnet-4-5)");
            } else {
              const errBody = await claudeResp.text().catch(() => "");
              const reason = `status ${claudeResp.status}: ${errBody.slice(0, 200)}`;
              fallbackTrail.push({ provider: 'claude', reason });
              console.warn(`Claude unavailable. ${reason}`);
            }
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            fallbackTrail.push({ provider: 'claude', reason });
            console.warn(`Claude request threw: ${reason}`);
          }
        };

        const tryGpt5 = async (): Promise<void> => {
          try {
            const gptResp = await callLovableGateway("openai/gpt-5");
            if (gptResp.ok && gptResp.body) {
              response = gptResp;
              usedProvider = 'gpt5';
              console.log(`Report generation using provider: gpt-5`);
            } else {
              const errBody = await gptResp.text().catch(() => "");
              const reason = `status ${gptResp.status}: ${errBody.slice(0, 200)}`;
              fallbackTrail.push({ provider: 'gpt5', reason });
              console.warn(`GPT-5 unavailable. ${reason}`);
            }
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            fallbackTrail.push({ provider: 'gpt5', reason });
            console.warn(`GPT-5 request threw: ${reason}`);
          }
        };

        const tryGemini = async (): Promise<void> => {
          try {
            const gemResp = await callLovableGateway("google/gemini-2.5-pro");
            if (gemResp.ok && gemResp.body) {
              response = gemResp;
              usedProvider = 'gemini';
              console.log(`Report generation using provider: gemini-2.5-pro`);
            } else {
              const errBody = await gemResp.text().catch(() => "");
              const reason = `status ${gemResp.status}: ${errBody.slice(0, 200)}`;
              fallbackTrail.push({ provider: 'gemini', reason });
              console.warn(`Gemini unavailable. ${reason}`);
            }
          } catch (e) {
            const reason = e instanceof Error ? e.message : String(e);
            fallbackTrail.push({ provider: 'gemini', reason });
            console.warn(`Gemini request threw: ${reason}`);
          }
        };

        for (const provider of providerOrder) {
          if (response) break;
          await safeWrite(`: provider ${provider} ${Date.now()}\n\n`);
          logger.stage('provider_try', { provider });
          if (provider === 'claude') await tryClaude();
          else if (provider === 'gpt5') await tryGpt5();
          else if (provider === 'gemini') await tryGemini();
          logger.stage('provider_try_result', { provider, ok: !!response });
        }

        if (!response) {
          logger.error('all_providers_failed', new Error('no provider returned a stream'), { trail: fallbackTrail });
          throw new Error('Nenhum provedor de IA conseguiu gerar o relatório. Tente novamente em alguns minutos.');
        }

        logger.stage('ai_stream_open', { provider: usedProvider });
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let firstChunkLogged = false;
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunkCount++;
          if (!firstChunkLogged) {
            firstChunkLogged = true;
            logger.stage('ai_first_chunk', { provider: usedProvider });
          }
          await safeWrite(value);

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
        logger.stage('ai_stream_done', { chunks: chunkCount, contentChars: fullContent.length });

        if (!fullContent) {
          logger.error('ai_empty_content', new Error('AI returned no content'));
          throw new Error('A IA terminou sem retornar conteúdo para o relatório.');
        }

        let finalContent = fullContent;
        let validationStatus: 'clean' | 'warnings' | 'auto_corrected' = 'clean';
        let deterministic: string[] = [];
        let aiIssues: string[] = [];
        let autoCorrections: Array<{ indicator: string; from: string; to: string }> = [];
        try {
          const corrected = applyAutoCorrections(fullContent, auditTrail || []);
          const workingText = corrected.text;
          autoCorrections = corrected.corrections;
          deterministic = [
            ...detectCoherenceWarnings(workingText, auditTrail || []),
            ...detectInventedReferences(workingText, auditTrail || []),
          ];
          await safeWrite(`: validating ${Date.now()}\n\n`);
          aiIssues = await runReportValidatorAgent(
            workingText,
            auditTrail || [],
            LOVABLE_API_KEY,
            globalRefs,
          );
          const allIssues = [
            ...deterministic.map((w) => `[determinístico] ${w}`),
            ...aiIssues.map((w) => `[agente IA] ${w}`),
          ];
          const correctionLines = autoCorrections.map(
            (c) => `[auto-corrigido] ${c.indicator}: ${c.from} → ${c.to}`,
          );
          const hasAny = allIssues.length > 0 || correctionLines.length > 0;
          validationStatus = correctionLines.length > 0
            ? 'auto_corrected'
            : (allIssues.length > 0 ? 'warnings' : 'clean');
          finalContent = workingText.replace(/\s*$/, '') + '\n';
          if (hasAny) console.warn('Validation issues:', { autoCorrections, allIssues });
        } catch (cohErr) {
          console.error('Coherence check failed (non-blocking):', cohErr);
        }

        const { data: existing } = await supabaseAdmin
          .from('generated_reports')
          .select('id')
          .eq('assessment_id', assessmentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const kbFileIds = kbFiles.map((f: any) => f.id);
        let savedReportId: string | null = null;
        if (existing && !forceRegenerate) {
          const { error } = await supabaseAdmin
            .from('generated_reports')
            .update({ report_content: finalContent, created_at: new Date().toISOString(), kb_file_ids: kbFileIds, visibility, environment })
            .eq('id', existing.id);
          if (error) throw error;
          console.log('Report updated successfully');
          savedReportId = existing.id;
          persistedReportId = existing.id;
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('generated_reports')
            .insert({ org_id: assessment.org_id, assessment_id: assessmentId, destination_name: destinationName, report_content: finalContent, created_by: userId, kb_file_ids: kbFileIds, visibility, environment })
            .select('id')
            .maybeSingle();
          if (error) throw error;
          console.log('Report saved successfully');
          savedReportId = inserted?.id ?? null;
          persistedReportId = savedReportId;
        }

        try {
          await supabaseAdmin.from('report_validations').insert({
            report_id: savedReportId,
            assessment_id: assessmentId,
            org_id: assessment.org_id,
            status: validationStatus,
            deterministic_issues: deterministic,
            ai_issues: aiIssues,
            auto_corrections: autoCorrections,
            total_issues: deterministic.length + aiIssues.length + autoCorrections.length,
            validator_version: appVersion,
          });
        } catch (vErr) {
          console.error('Failed to persist report_validations:', vErr);
        }

        try {
          const modelLabel = usedProvider === 'claude'
            ? 'anthropic/claude-sonnet-4-5-20250929'
            : usedProvider === 'gpt5'
            ? 'openai/gpt-5'
            : 'google/gemini-2.5-pro';
          await supabaseAdmin.from('audit_events').insert({
            org_id: assessment.org_id,
            user_id: userId,
            event_type: 'report_generated',
            entity_type: 'generated_report',
            entity_id: savedReportId,
            metadata: {
              provider: usedProvider,
              model: modelLabel,
              fallback_trail: fallbackTrail,
              template: reportTemplate,
              destination_name: destinationName,
              assessment_id: assessmentId,
              validation_status: validationStatus,
              total_issues: deterministic.length + aiIssues.length + autoCorrections.length,
            },
          });
        } catch (auditErr) {
          console.error('Failed to insert audit_events for report_generated:', auditErr);
        }

        if (heartbeatTimer !== null) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        await safeWrite(`: done ${Date.now()}\n\n`);
        if (streamOpen) await writer.close();
      } catch (err) {
        console.error('Stream error:', err);
        if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
        streamOpen = false;
        await writer.abort(err).catch(() => {});
        throw err;
      }
    })();

    if (backgroundRun) {
      await backgroundTask;
      return new Response(JSON.stringify({ reportId: persistedReportId }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // @ts-ignore - EdgeRuntime é global em Supabase Edge Functions (Deno)
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask);
      }
    } catch (_e) { /* ignore */ }

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

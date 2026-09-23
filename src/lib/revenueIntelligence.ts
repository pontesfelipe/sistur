// v2.11.0 — Precificação dinâmica, LTV e Gêmeo Digital (cálculos determinísticos).

export interface MonthInput {
  month: number; // 1-12
  occupancy: number | null; // 0-100
  adr: number | null;
  events?: number; // nº de eventos no mês
}

export interface PricingRules {
  floor: number;
  ceiling: number;
  maxChangePct: number; // limite de variação por mês (%)
  targetOccupancy: number; // %
  marketAdr?: number | null;
}

export interface PriceSuggestion {
  month: number;
  baseAdr: number;
  suggestedAdr: number;
  changePct: number;
  reasons: string[];
  currentRevpar: number | null;
  projectedRevpar: number | null;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function suggestPrices(months: MonthInput[], rules: PricingRules): PriceSuggestion[] {
  const adrs = months.map((m) => m.adr).filter((v): v is number => !!v && v > 0);
  const avgAdr = adrs.length ? adrs.reduce((a, b) => a + b, 0) / adrs.length : rules.marketAdr || 0;
  return months.map((m) => {
    const base = m.adr && m.adr > 0 ? m.adr : avgAdr;
    const reasons: string[] = [];
    let pct = 0;
    if (m.occupancy != null) {
      const gap = m.occupancy - rules.targetOccupancy;
      const occPct = gap * 0.5; // cada 1 pp acima da meta → +0,5%
      pct += occPct;
      if (Math.abs(occPct) >= 1)
        reasons.push(`Ocupação ${Math.round(m.occupancy)}% vs meta ${rules.targetOccupancy}% → ${occPct > 0 ? '+' : ''}${occPct.toFixed(0)}%`);
    }
    if (m.events && m.events > 0) {
      const ev = Math.min(15, m.events * 5);
      pct += ev;
      reasons.push(`${m.events} evento(s) no município → +${ev}%`);
    }
    if (rules.marketAdr && base > 0) {
      const idx = base / rules.marketAdr;
      if (idx < 0.85) { pct += 5; reasons.push('Diária abaixo do mercado → +5%'); }
      else if (idx > 1.15) { pct -= 3; reasons.push('Diária acima do mercado → −3%'); }
    }
    pct = clamp(pct, -rules.maxChangePct, rules.maxChangePct);
    let suggested = base * (1 + pct / 100);
    const bounded = clamp(suggested, rules.floor || 0, rules.ceiling || Infinity);
    if (bounded !== suggested) reasons.push(bounded > suggested ? 'Ajustado ao piso' : 'Ajustado ao teto');
    suggested = Math.round(bounded);
    if (!reasons.length) reasons.push('Sem sinal forte: manter diária');
    const occ = m.occupancy != null ? m.occupancy / 100 : null;
    // Elasticidade simples: cada +1% no preço reduz 0,3% da ocupação.
    const realPct = base > 0 ? (suggested / base - 1) * 100 : 0;
    const projOcc = occ != null ? clamp(occ * (1 - (realPct * 0.3) / 100), 0, 1) : null;
    return {
      month: m.month,
      baseAdr: Math.round(base),
      suggestedAdr: suggested,
      changePct: Math.round(realPct),
      reasons,
      currentRevpar: occ != null ? Math.round(base * occ) : null,
      projectedRevpar: projOcc != null ? Math.round(suggested * projOcc) : null,
    };
  });
}

export interface LtvInput {
  spendPerStay: number;
  staysPerYear: number;
  yearsRetained: number;
  marginPct: number;
  cac: number;
}

export function computeLtv(i: LtvInput) {
  const ltv = i.spendPerStay * i.staysPerYear * i.yearsRetained * (i.marginPct / 100);
  const ratio = i.cac > 0 ? ltv / i.cac : null;
  return { ltv, ratio, healthy: ratio == null ? null : ratio >= 3 };
}

export function computeRoi(investment: number, annualReturn: number, years = 1) {
  const total = annualReturn * years;
  const roi = investment > 0 ? ((total - investment) / investment) * 100 : null;
  const paybackMonths = annualReturn > 0 ? (investment / annualReturn) * 12 : null;
  return { roi, paybackMonths };
}

// ---------- Gêmeo Digital ----------
export type PillarKey = 'RA' | 'OE' | 'AO';

export interface Lever {
  id: string;
  label: string;
  description: string;
  effect: Partial<Record<PillarKey, number>>; // pp por ano com intensidade 100%
}

export const TWIN_LEVERS: Lever[] = [
  { id: 'saneamento', label: 'Investimento em saneamento', description: 'Água, esgoto e resíduos', effect: { RA: 4, AO: 1 } },
  { id: 'governanca', label: 'Fortalecer governança', description: 'Conselho, plano e orçamento de turismo', effect: { OE: 5 } },
  { id: 'leitos', label: 'Ampliar leitos', description: 'Novos meios de hospedagem', effect: { AO: 4, RA: -1 } },
  { id: 'voos', label: 'Mais conectividade', description: 'Voos e acesso rodoviário', effect: { AO: 3, OE: 1 } },
  { id: 'marketing', label: 'Campanha de marketing', description: 'Promoção do destino', effect: { AO: 3 } },
  { id: 'capacitacao', label: 'Capacitação', description: 'Formação de gestores e trade', effect: { OE: 3, AO: 2 } },
];

export interface ScenarioProjection {
  year: number;
  RA: number;
  OE: number;
  AO: number;
}

/**
 * Projeta pilares (0-1) ao longo de N anos. Regras sistêmicas simplificadas (IGMA):
 * - Se RA < 34%, ganhos em AO são reduzidos pela metade (limite ambiental).
 * - Se OE < 34%, todos os ganhos são reduzidos em 30% (governança frágil).
 */
export function projectScenario(
  base: Record<PillarKey, number>,
  intensities: Record<string, number>, // 0-100
  years: number,
  drift = 0, // pp/ano (pessimista negativo)
): ScenarioProjection[] {
  const out: ScenarioProjection[] = [{ year: 0, ...base }];
  let cur = { ...base };
  for (let y = 1; y <= years; y++) {
    const delta: Record<PillarKey, number> = { RA: drift, OE: drift, AO: drift };
    for (const l of TWIN_LEVERS) {
      const k = (intensities[l.id] || 0) / 100;
      for (const p of Object.keys(l.effect) as PillarKey[]) delta[p] += (l.effect[p] || 0) * k;
    }
    if (cur.RA < 0.34 && delta.AO > 0) delta.AO *= 0.5;
    if (cur.OE < 0.34) (Object.keys(delta) as PillarKey[]).forEach((p) => { if (delta[p] > 0) delta[p] *= 0.7; });
    cur = {
      RA: clamp(cur.RA + delta.RA / 100, 0, 1),
      OE: clamp(cur.OE + delta.OE / 100, 0, 1),
      AO: clamp(cur.AO + delta.AO / 100, 0, 1),
    };
    out.push({ year: y, ...cur });
  }
  return out;
}

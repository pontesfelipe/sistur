// Validação ao salvar regras da camada semântica: duplicidade e conflitos.
export type RuleLike = {
  id?: string;
  key?: string;
  title?: string;
  category?: string;
  section_header?: string | null;
  applies_to?: string;
  content?: string;
  active?: boolean;
};
export type RuleIssue = { message: string; blocking: boolean };

// Régua oficial: Crítico ≤33, Atenção 34–66, Adequado 67–79, Forte 80–89, Excelente ≥90.
const OFFICIAL_START: Record<string, number> = { critico: 0, atencao: 34, adequado: 67, forte: 80, excelente: 90 };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function findOfficialScaleDivergences(content: string): string[] {
  const out: string[] = [];
  const re = /(cr[ií]tico|aten[cç][aã]o|adequado|forte|excelente)\s*[:(]?\s*(\d{1,3})\s*[–-]\s*(\d{1,3})/gi;
  for (const m of content.matchAll(re)) {
    const label = norm(m[1]);
    const start = Number(m[2]);
    if (OFFICIAL_START[label] !== undefined && start !== OFFICIAL_START[label]) {
      out.push(`"${m[0].trim()}" diverge da régua oficial (${m[1]} começa em ${OFFICIAL_START[label]}%).`);
    }
  }
  return out;
}

export function findRuleConflicts(draft: RuleLike, entries: RuleLike[], selfId: string | null): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const others = entries.filter((e) => e.id !== selfId);
  const key = norm(draft.key ?? "");
  if (key && others.some((e) => norm(e.key ?? "") === key)) {
    issues.push({ message: `Já existe uma regra com a chave "${draft.key}".`, blocking: true });
  }
  const title = norm(draft.title ?? "");
  const overlapScope = (a?: string, b?: string) => a === "both" || b === "both" || a === b;
  const sameTitle = others.find((e) => e.active !== false && title && norm(e.title ?? "") === title && overlapScope(e.applies_to, draft.applies_to));
  if (sameTitle) issues.push({ message: `Outra regra ativa já usa o título "${draft.title}" (${sameTitle.key}).`, blocking: false });
  const header = norm(draft.section_header ?? "");
  const sameHeader = header && others.find((e) => e.active !== false && norm(e.section_header ?? "") === header && e.category === draft.category && overlapScope(e.applies_to, draft.applies_to));
  if (sameHeader) issues.push({ message: `A seção "${draft.section_header}" já existe em ${sameHeader.key}; o conteúdo pode se contradizer no prompt.`, blocking: false });
  for (const d of findOfficialScaleDivergences(draft.content ?? "")) issues.push({ message: d, blocking: false });
  return issues;
}

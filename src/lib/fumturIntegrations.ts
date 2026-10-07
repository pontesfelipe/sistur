/** Integrações do orçamento/FUMTUR: convênios federais e balancete da prefeitura. Funções puras. */

export interface Convenio {
  numero: string;
  objeto: string;
  situacao: string;
  valor: number;
  valor_liberado: number;
  contrapartida: number;
  fim_vigencia: string | null; // yyyy-mm-dd
  orgao: string;
}

/** Prazo de prestação de contas = 60 dias após o fim da vigência (regra da Portaria Conjunta 33/2023). */
export function accountabilityDeadline(fimVigencia: string | null): string | null {
  if (!fimVigencia) return null;
  const d = new Date(fimVigencia + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + 60);
  return d.toISOString().slice(0, 10);
}

/** Converte um convênio em linha de orçamento do projeto. Já importado (mesmo número) → null. */
export function convenioToBudgetLine(c: Convenio, projectId: string, existingNotes: (string | null)[]) {
  const tag = `Convênio ${c.numero}`;
  if (existingNotes.some((n) => n?.includes(tag))) return null;
  return {
    project_id: projectId,
    category: "Outro",
    description: c.objeto.slice(0, 200) || tag,
    planned_amount: c.valor,
    actual_amount: c.valor_liberado,
    currency: "BRL",
    funding_source: "Convênio MTur",
    status: c.valor_liberado > 0 ? "executed" : "approved",
    notes: `${tag} · ${c.situacao}${c.contrapartida ? ` · contrapartida R$ ${c.contrapartida.toFixed(2)}` : ""}`,
  };
}

/** Converte "1.234,56", "1234.56" ou "R$ 1.234,56" em número. */
export function parseBRNumber(raw: string): number {
  let s = (raw ?? "").replace(/[R$\s]/g, "");
  if (!s) return 0;
  const neg = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/[()-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : neg ? -n : n;
}

export interface BalanceteRow { empenho: string; valor: number; historico: string }

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Lê CSV do balancete/extrato. Precisa das colunas empenho e valor (pago/liquidado); separador ; ou ,. */
export function parseBalancete(text: string): { rows: BalanceteRow[]; error?: string } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: "Arquivo vazio." };
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = lines[0].split(sep).map((h) => norm(h.replace(/"/g, "")));
  const iEmp = head.findIndex((h) => h.includes("empenho"));
  const iVal = ["valor pago", "pago", "liquidado", "valor"].map((k) => head.findIndex((h) => h.includes(k))).find((i) => i >= 0) ?? -1;
  const iHist = head.findIndex((h) => h.includes("historico") || h.includes("descricao") || h.includes("credor"));
  if (iEmp < 0 || iVal < 0) return { rows: [], error: "O arquivo precisa ter as colunas \"Empenho\" e \"Valor pago\"." };
  const rows = lines.slice(1).map((l) => {
    const c = l.split(sep).map((x) => x.replace(/^"|"$/g, "").trim());
    return { empenho: c[iEmp] ?? "", valor: parseBRNumber(c[iVal] ?? ""), historico: iHist >= 0 ? c[iHist] ?? "" : "" };
  }).filter((r) => r.empenho);
  return { rows };
}

export interface ReconcileExpense { id: string; commitment_number: string | null; actual_amount: number; description: string; project_name?: string }
export interface ReconcileResult {
  matched: { expense: ReconcileExpense; valor: number }[];
  divergent: { expense: ReconcileExpense; valor: number; diff: number }[];
  missingInSistur: BalanceteRow[];
  missingInBalancete: ReconcileExpense[];
}

const key = (s: string | null) => (s ?? "").replace(/[^0-9a-z]/gi, "").replace(/^0+/, "").toUpperCase();

/** Concilia por nº de empenho; soma várias linhas do mesmo empenho. Diferença até R$ 0,01 é tolerada. */
export function reconcileBalancete(rows: BalanceteRow[], expenses: ReconcileExpense[]): ReconcileResult {
  const byEmp = new Map<string, { valor: number; row: BalanceteRow }>();
  for (const r of rows) {
    const k = key(r.empenho); const cur = byEmp.get(k);
    byEmp.set(k, { valor: (cur?.valor ?? 0) + r.valor, row: cur?.row ?? r });
  }
  const res: ReconcileResult = { matched: [], divergent: [], missingInSistur: [], missingInBalancete: [] };
  const used = new Set<string>();
  for (const e of expenses) {
    const k = key(e.commitment_number);
    const hit = k ? byEmp.get(k) : undefined;
    if (!hit) { res.missingInBalancete.push(e); continue; }
    used.add(k);
    const diff = Math.round((hit.valor - Number(e.actual_amount || 0)) * 100) / 100;
    if (Math.abs(diff) <= 0.01) res.matched.push({ expense: e, valor: hit.valor });
    else res.divergent.push({ expense: e, valor: hit.valor, diff });
  }
  for (const [k, v] of byEmp) if (!used.has(k)) res.missingInSistur.push({ ...v.row, valor: v.valor });
  return res;
}

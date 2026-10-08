/**
 * Matriz de Intersetorialidade (Regra 6 do IGMA — Mario Beni).
 * Indica, de forma determinística, quais secretarias municipais são
 * corresponsáveis por destravar um gargalo, a partir do tema/título.
 * O Turismo é sempre o articulador e não aparece na lista de corresponsáveis.
 */
export type Secretaria =
  | 'Meio Ambiente'
  | 'Saneamento'
  | 'Saúde'
  | 'Educação'
  | 'Cultura'
  | 'Obras e Infraestrutura'
  | 'Transporte e Mobilidade'
  | 'Segurança Pública'
  | 'Fazenda e Planejamento'
  | 'Assistência Social'
  | 'Desenvolvimento Econômico'
  | 'Comunicação';

const RULES: { secretaria: Secretaria; keywords: string[] }[] = [
  { secretaria: 'Meio Ambiente', keywords: ['ambient', 'ecológ', 'ecolog', 'sustentab', 'protegid', 'conserva', 'clima', 'capacidade de carga', 'pressão turística', 'iptl'] },
  { secretaria: 'Saneamento', keywords: ['água', 'agua', 'iqa', 'saneamento', 'esgoto', 'resíduo', 'residuo', 'lixo', 'snis'] },
  { secretaria: 'Saúde', keywords: ['saúde', 'saude', 'hospital', 'datasus', 'leitos sus', 'mortalidade', 'bem-estar'] },
  { secretaria: 'Educação', keywords: ['educa', 'ideb', 'escola', 'ensino', 'capacitação', 'capacitacao'] },
  { secretaria: 'Cultura', keywords: ['cultur', 'patrimônio', 'patrimonio', 'tombad', 'manifesta'] },
  { secretaria: 'Obras e Infraestrutura', keywords: ['infraestrutura', 'obra', 'urban', 'acessibil', 'inclusiv'] },
  { secretaria: 'Transporte e Mobilidade', keywords: ['mobilidade', 'transporte', 'aére', 'aere', 'aeroporto', 'rodovi', 'acesso viário'] },
  { secretaria: 'Segurança Pública', keywords: ['seguran', 'ordem pública', 'criminal', 'violên', 'violen', 'homicíd'] },
  { secretaria: 'Fazenda e Planejamento', keywords: ['fiscal', 'capag', 'transparên', 'transparen', 'receita', 'orçament', 'orcament', 'financeir', 'arrecada'] },
  { secretaria: 'Assistência Social', keywords: ['vulnerab', 'inclusão social', 'inclusao social', 'cadúnico', 'cadunico', 'pobreza', 'comunitária'] },
  { secretaria: 'Desenvolvimento Econômico', keywords: ['emprego', 'trabalho', 'pib', 'socioecon', 'mercado', 'caged'] },
  { secretaria: 'Comunicação', keywords: ['digital', 'promoção', 'promocao', 'marketing', 'distribuição', 'distribuicao'] },
];

export function getCoResponsibleSecretarias(...texts: (string | null | undefined)[]): Secretaria[] {
  const hay = texts.filter(Boolean).join(' ').toLowerCase();
  if (!hay) return [];
  return RULES.filter(r => r.keywords.some(k => hay.includes(k))).map(r => r.secretaria);
}

/** Agrupa itens por secretaria corresponsável (matriz para relatórios/painéis). */
export function buildIntersectoralMatrix<T extends { title?: string | null; theme?: string | null }>(
  items: T[],
): Map<Secretaria, T[]> {
  const m = new Map<Secretaria, T[]>();
  for (const it of items) {
    for (const s of getCoResponsibleSecretarias(it.theme, it.title)) {
      if (!m.has(s)) m.set(s, []);
      m.get(s)!.push(it);
    }
  }
  return m;
}

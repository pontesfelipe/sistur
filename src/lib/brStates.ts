export interface BRState { uf: string; name: string; ibge: string; prep: 'do' | 'da' | 'de' }

export const BR_STATES: BRState[] = [
  { uf: 'AC', name: 'Acre', ibge: '12', prep: 'do' },
  { uf: 'AL', name: 'Alagoas', ibge: '27', prep: 'de' },
  { uf: 'AP', name: 'Amapá', ibge: '16', prep: 'do' },
  { uf: 'AM', name: 'Amazonas', ibge: '13', prep: 'do' },
  { uf: 'BA', name: 'Bahia', ibge: '29', prep: 'da' },
  { uf: 'CE', name: 'Ceará', ibge: '23', prep: 'do' },
  { uf: 'DF', name: 'Distrito Federal', ibge: '53', prep: 'do' },
  { uf: 'ES', name: 'Espírito Santo', ibge: '32', prep: 'do' },
  { uf: 'GO', name: 'Goiás', ibge: '52', prep: 'de' },
  { uf: 'MA', name: 'Maranhão', ibge: '21', prep: 'do' },
  { uf: 'MT', name: 'Mato Grosso', ibge: '51', prep: 'de' },
  { uf: 'MS', name: 'Mato Grosso do Sul', ibge: '50', prep: 'de' },
  { uf: 'MG', name: 'Minas Gerais', ibge: '31', prep: 'de' },
  { uf: 'PA', name: 'Pará', ibge: '15', prep: 'do' },
  { uf: 'PB', name: 'Paraíba', ibge: '25', prep: 'da' },
  { uf: 'PR', name: 'Paraná', ibge: '41', prep: 'do' },
  { uf: 'PE', name: 'Pernambuco', ibge: '26', prep: 'de' },
  { uf: 'PI', name: 'Piauí', ibge: '22', prep: 'do' },
  { uf: 'RJ', name: 'Rio de Janeiro', ibge: '33', prep: 'do' },
  { uf: 'RN', name: 'Rio Grande do Norte', ibge: '24', prep: 'do' },
  { uf: 'RS', name: 'Rio Grande do Sul', ibge: '43', prep: 'do' },
  { uf: 'RO', name: 'Rondônia', ibge: '11', prep: 'de' },
  { uf: 'RR', name: 'Roraima', ibge: '14', prep: 'de' },
  { uf: 'SC', name: 'Santa Catarina', ibge: '42', prep: 'de' },
  { uf: 'SP', name: 'São Paulo', ibge: '35', prep: 'de' },
  { uf: 'SE', name: 'Sergipe', ibge: '28', prep: 'de' },
  { uf: 'TO', name: 'Tocantins', ibge: '17', prep: 'do' },
];

export interface PanoramaRow {
  ra_score: number | null; oe_score: number | null; ao_score: number | null;
  tourism_region: string | null;
}

export type PanoramaStatus = 'ADEQUADO' | 'ATENCAO' | 'CRITICO';

/** Status canônico a partir de nota 0–1 (Adequado ≥67%, Atenção 34–66%, Crítico ≤33%). */
export function statusFromScore(score: number): PanoramaStatus {
  const pct = Math.round(score * 100);
  if (pct >= 67) return 'ADEQUADO';
  if (pct >= 34) return 'ATENCAO';
  return 'CRITICO';
}

/** Média por pilar e contagem de status por pilar dos municípios do estado. */
export function summarizePanorama(rows: PanoramaRow[]) {
  const pillars = ['ra', 'oe', 'ao'] as const;
  const out: Record<string, { avg: number | null; counts: Record<PanoramaStatus, number> }> = {};
  for (const p of pillars) {
    const vals = rows.map((r) => r[`${p}_score`]).filter((v): v is number => v != null).map(Number);
    const counts: Record<PanoramaStatus, number> = { ADEQUADO: 0, ATENCAO: 0, CRITICO: 0 };
    vals.forEach((v) => counts[statusFromScore(v)]++);
    out[p] = { avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, counts };
  }
  return out as Record<(typeof pillars)[number], { avg: number | null; counts: Record<PanoramaStatus, number> }>;
}

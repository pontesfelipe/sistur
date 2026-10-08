import { describe, it, expect } from 'vitest';
import { getCoResponsibleSecretarias, buildIntersectoralMatrix } from '../intersectoralMatrix';

describe('Matriz de Intersetorialidade', () => {
  it('qualidade da água aciona Saneamento', () => {
    expect(getCoResponsibleSecretarias('Qualidade da Água')).toContain('Saneamento');
  });
  it('tema Saúde e Bem-Estar aciona Saúde', () => {
    expect(getCoResponsibleSecretarias('Saúde e Bem-Estar')).toContain('Saúde');
  });
  it('capacidade de carga aciona Meio Ambiente', () => {
    expect(getCoResponsibleSecretarias('Pressão Turística e Capacidade de Carga (IPTL)')).toContain('Meio Ambiente');
  });
  it('ordem pública aciona Segurança Pública', () => {
    expect(getCoResponsibleSecretarias('Desenvolvimento e Ordem Pública')).toContain('Segurança Pública');
  });
  it('tema sem relação não aciona nenhuma secretaria', () => {
    expect(getCoResponsibleSecretarias('Taxa de Ocupação')).toEqual([]);
  });
  it('matriz agrupa gargalos por secretaria', () => {
    const m = buildIntersectoralMatrix([{ title: 'IDEB baixo', theme: 'Educação' }, { title: 'CAPAG C', theme: 'Governança, Eficiência Fiscal e Transparência' }]);
    expect(m.get('Educação')?.length).toBe(1);
    expect(m.get('Fazenda e Planejamento')?.length).toBe(1);
  });
});

describe('Régua de capacidade de carga (IPTL)', () => {
  // espelho da régua em calculate-assessment/normalizeSpecific
  const iptl = (v: number) => v <= 0 ? 1 : v <= 5 ? 1 - (v / 5) * 0.33 : v <= 15 ? 0.66 - ((v - 5) / 10) * 0.32 : Math.max(0, 0.33 - ((v - 15) / 15) * 0.33);
  it('até 5 visitantes/hab = Adequado (≥67%)', () => { expect(iptl(5)).toBeGreaterThanOrEqual(0.67); });
  it('10 visitantes/hab = Atenção', () => { expect(iptl(10)).toBeGreaterThan(0.33); expect(iptl(10)).toBeLessThan(0.67); });
  it('acima de 15 visitantes/hab = Crítico (≤33%)', () => { expect(iptl(16)).toBeLessThanOrEqual(0.33); });
});

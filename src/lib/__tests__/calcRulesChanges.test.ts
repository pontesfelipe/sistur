import { describe, it, expect } from 'vitest';
import { getStaleness } from '../calcRulesChanges';

const now = new Date('2026-10-07T00:00:00Z');
const base = { status: 'CALCULATED', diagnostic_type: 'territorial', needs_recalculation: false };

describe('aviso de diagnóstico desatualizado', () => {
  it('não avisa quem foi calculado depois da última mudança', () => {
    expect(getStaleness({ ...base, calculated_at: '2026-10-05T10:00:00Z' }, now).level).toBe('ok');
  });
  it('recente com uma mudança perdida pode ser atualizado', () => {
    expect(getStaleness({ ...base, calculated_at: '2026-09-25T10:00:00Z' }, now).level).toBe('updatable');
  });
  it('até 90 dias pode ser atualizado mesmo perdendo duas mudanças', () => {
    expect(getStaleness({ ...base, calculated_at: '2026-08-10T10:00:00Z' }, now).level).toBe('updatable');
  });
  it('mais de 90 dias fica com a tarja mesmo com só dados novos', () => {
    expect(getStaleness({ ...base, calculated_at: '2026-07-01T10:00:00Z', diagnostic_type: 'enterprise', needs_recalculation: true }, now).level).toBe('outdated');
  });
  it('mudança só territorial não afeta empresarial', () => {
    expect(getStaleness({ ...base, diagnostic_type: 'enterprise', calculated_at: '2026-09-25T10:00:00Z' }, now).level).toBe('ok');
  });
  it('rascunho nunca recebe aviso', () => {
    expect(getStaleness({ ...base, status: 'DRAFT', calculated_at: null }, now).level).toBe('ok');
  });
});

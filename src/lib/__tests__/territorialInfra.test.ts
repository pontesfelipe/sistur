import { describe, it, expect } from 'vitest';
import { buildTerritorialInfraInsights } from '../territorialInfra';

const base = { mapaCategoria: 'C', hospedagens: 10, guias: 3, agencias: 1, patrimonioIphan: 0, hasAirport: false };
const ids = (x: any) => buildTerritorialInfraInsights({ ...base, ...x }).map(i => i.id);

describe('mapeamento de infraestrutura do destino', () => {
  it('aponta município fora do Mapa do Turismo', () => {
    expect(ids({ mapaCategoria: null })).toContain('ti-fora-mapa');
    expect(ids({})).not.toContain('ti-fora-mapa');
  });
  it('aponta falta de registro no CADASTUR', () => {
    expect(ids({ hospedagens: null })).toContain('ti-sem-cadastur');
  });
  it('patrimônio IPHAN com até 2 hospedagens', () => {
    expect(ids({ hospedagens: 2, patrimonioIphan: 1 })).toContain('ti-patrimonio-sem-hospedagem');
    expect(ids({ hospedagens: 3, patrimonioIphan: 1 })).not.toContain('ti-patrimonio-sem-hospedagem');
  });
  it('cobertura de saúde abaixo de 50%', () => {
    expect(ids({ coberturaSaude: 49 })).toContain('ti-saude');
    expect(ids({ coberturaSaude: 50 })).not.toContain('ti-saude');
  });
  it('nunca fala em concorrência ou diária', () => {
    const all = buildTerritorialInfraInsights({ mapaCategoria: null, hospedagens: 1, guias: 0, patrimonioIphan: 2, hasAirport: false, coberturaSaude: 10 });
    expect(all.some(i => /concorr|diária/i.test(i.title + i.text))).toBe(false);
  });
});

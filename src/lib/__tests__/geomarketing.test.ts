import { describe, it, expect } from 'vitest';
import { haversineKm, radiusMetrics, positionVsArea } from '../geomarketing';

describe('geomarketing', () => {
  it('usa a posição real em vez da distância informada', () => {
    const center: [number, number] = [-5.12, -35.63];
    const m = radiusMetrics([{ latitude: -5.12, longitude: -35.63, distance_km: 50 }], center, 5);
    expect(m.count).toBe(1);
    expect(m.realPositions).toBe(1);
  });
  it('exclui quem está fora do raio', () => {
    const m = radiusMetrics([{ distance_km: 12 }, { distance_km: 3, rating: 4 }], [0, 0], 10);
    expect(m.count).toBe(1);
    expect(m.avgRating).toBe(4);
  });
  it('calcula 1 grau de latitude ≈ 111 km', () => {
    expect(Math.round(haversineKm([0, 0], [1, 0]))).toBe(111);
  });
  it('compara a diária própria com a média do entorno', () => {
    expect(positionVsArea(330, 300)).toBe(10);
    expect(positionVsArea(null, 300)).toBeNull();
  });
});

import { buildGeoInsights } from '../geomarketing';
describe('leituras do entorno', () => {
  const base = { count: 1, avgRating: null, rateDiff: null, radiusKm: 10 };
  it('aponta muitos atrativos com pouca concorrência', () => {
    const ids = buildGeoInsights({ ...base, pois: { atrativos: 5, restaurantes: 3, transporte: 1, saude: 1 } }).map(x => x.id);
    expect(ids).toContain('atrativos-pouca-oferta');
  });
  it('só aponta diária fora do entorno a partir de 15%', () => {
    expect(buildGeoInsights({ ...base, rateDiff: 14 }).map(x => x.id)).not.toContain('diaria-acima');
    expect(buildGeoInsights({ ...base, rateDiff: 15 }).map(x => x.id)).toContain('diaria-acima');
    expect(buildGeoInsights({ ...base, rateDiff: -15 }).map(x => x.id)).toContain('diaria-abaixo');
  });
  it('aponta notas baixas só com 3 ou mais concorrentes', () => {
    expect(buildGeoInsights({ ...base, count: 2, avgRating: 3.5 }).map(x => x.id)).not.toContain('notas-baixas');
    expect(buildGeoInsights({ ...base, count: 3, avgRating: 3.5 }).map(x => x.id)).toContain('notas-baixas');
  });
});

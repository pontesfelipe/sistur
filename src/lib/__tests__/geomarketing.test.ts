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

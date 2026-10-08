import { describe, it, expect } from 'vitest';
import { distanceWeight, regionalAirAccess, healthUnitsPer10k } from '../../../supabase/functions/_shared/airAccess';

describe('acessibilidade aérea em 100 km', () => {
  it('aeroporto até 30 km conta 100%', () => expect(distanceWeight(25)).toBe(1));
  it('aeroporto a 100 km conta 50%', () => expect(distanceWeight(100)).toBeCloseTo(0.5));
  it('aeroporto além de 100 km não conta', () => expect(distanceWeight(101)).toBe(0));
  it('soma voos ponderados de aeroportos vizinhos', () => {
    // Itatiba (SP) → Viracopos ~40 km
    const r = regionalAirAccess(-23.0056, -46.8398, [
      { icao: 'SBKP', latitude: -23.0074, longitude: -47.1345, flights_per_week: 100 },
      { icao: 'SBFI', latitude: -25.6003, longitude: -54.485, flights_per_week: 300 },
    ]);
    expect(r.airports.map((a) => a.icao)).toEqual(['SBKP']);
    expect(r.value).toBeGreaterThan(85);
    expect(r.value).toBeLessThan(100);
  });
});

describe('cobertura de saúde por 10 mil habitantes', () => {
  it('13 unidades em 23.659 hab = 5,5', () => expect(healthUnitsPer10k(13, 23659)).toBe(5.5));
  it('sem população não calcula', () => expect(healthUnitsPer10k(13, 0)).toBeNull());
});

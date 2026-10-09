import { describe, it, expect } from 'vitest';
import { statusFromScore, summarizePanorama } from '../brStates';

describe('panorama estadual', () => {
  it('usa as réguas canônicas', () => {
    expect(statusFromScore(0.67)).toBe('ADEQUADO');
    expect(statusFromScore(0.66)).toBe('ATENCAO');
    expect(statusFromScore(0.34)).toBe('ATENCAO');
    expect(statusFromScore(0.33)).toBe('CRITICO');
  });
  it('ignora pilares sem nota na média', () => {
    const s = summarizePanorama([
      { ra_score: 0.8, oe_score: null, ao_score: 0.2, tourism_region: 'A' },
      { ra_score: 0.4, oe_score: 0.5, ao_score: null, tourism_region: 'B' },
    ]);
    expect(s.ra.avg).toBeCloseTo(0.6);
    expect(s.oe.avg).toBeCloseTo(0.5);
    expect(s.ra.counts).toEqual({ ADEQUADO: 1, ATENCAO: 1, CRITICO: 0 });
    expect(s.ao.counts.CRITICO).toBe(1);
  });
});

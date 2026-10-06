// Cálculos determinísticos do Geomarketing (sem comparação entre municípios).
export interface GeoCompetitor {
  latitude?: number | null; longitude?: number | null; distance_km?: number | null;
  rating?: number | null; avg_daily_rate?: number | null;
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distância real quando há coordenadas; senão, a distância informada. */
export function effectiveDistance(c: GeoCompetitor, center: [number, number]): number | null {
  if (c.latitude != null && c.longitude != null) return haversineKm(center, [c.latitude, c.longitude]);
  return c.distance_km ?? null;
}

export function radiusMetrics(comps: GeoCompetitor[], center: [number, number], radiusKm: number) {
  const inside = comps.filter(c => { const d = effectiveDistance(c, center); return d != null && d <= radiusKm; });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const area = Math.PI * radiusKm * radiusKm;
  return {
    count: inside.length,
    densityPer100Km2: area > 0 ? (inside.length / area) * 100 : 0,
    avgRating: avg(inside.map(c => c.rating).filter((x): x is number => x != null)),
    avgDailyRate: avg(inside.map(c => c.avg_daily_rate).filter((x): x is number => x != null)),
    realPositions: inside.filter(c => c.latitude != null && c.longitude != null).length,
  };
}

/** Diferença percentual do valor próprio sobre a média do entorno. */
export function positionVsArea(own: number | null | undefined, areaAvg: number | null): number | null {
  if (own == null || areaAvg == null || areaAvg === 0) return null;
  return Math.round(((own - areaAvg) / areaAvg) * 100);
}

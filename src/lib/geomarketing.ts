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

export interface PoiCounts { atrativos: number; restaurantes: number; transporte: number; saude: number }

export interface GeoInsightInput {
  count: number; avgRating: number | null; rateDiff: number | null; radiusKm: number;
  pois?: PoiCounts | null; nextEvent?: { name: string; start_date: string; estimated_attendance?: number | null } | null;
}
export interface GeoInsight { id: string; title: string; text: string }

/** Leituras determinísticas do entorno; cada uma pode virar projeto. */
export function buildGeoInsights(i: GeoInsightInput): GeoInsight[] {
  const out: GeoInsight[] = [];
  const r = `${i.radiusKm} km`;
  if (i.pois && i.pois.atrativos >= 5 && i.count <= 2)
    out.push({ id: 'atrativos-pouca-oferta', title: 'Muitos atrativos e pouca concorrência', text: `Há ${i.pois.atrativos} atrativos turísticos e só ${i.count} concorrente(s) a menos de ${r}. Vale divulgar a proximidade com esses atrativos e criar pacotes com eles.` });
  if (i.count >= 3 && i.avgRating != null && i.avgRating < 4)
    out.push({ id: 'notas-baixas', title: 'Concorrentes com notas baixas', text: `A nota média dos concorrentes a menos de ${r} é ${i.avgRating.toFixed(1)}. Investir em atendimento e qualidade pode destacar o seu empreendimento.` });
  if (i.count >= 5 && i.avgRating != null && i.avgRating >= 4.5)
    out.push({ id: 'entorno-forte', title: 'Entorno competitivo e bem avaliado', text: `Há ${i.count} concorrentes bem avaliados a menos de ${r}. O caminho é se diferenciar por um público ou experiência específica.` });
  if (i.rateDiff != null && i.rateDiff >= 15)
    out.push({ id: 'diaria-acima', title: 'Diária acima do entorno', text: `Sua diária está ${i.rateDiff}% acima da média. Confira se os diferenciais justificam o preço e se aparecem na divulgação.` });
  if (i.rateDiff != null && i.rateDiff <= -15)
    out.push({ id: 'diaria-abaixo', title: 'Diária abaixo do entorno', text: `Sua diária está ${Math.abs(i.rateDiff)}% abaixo da média. Pode haver espaço para revisar preços, principalmente na alta temporada.` });
  if (i.pois && i.pois.transporte === 0)
    out.push({ id: 'sem-transporte', title: 'Pouco transporte no entorno', text: `Não há pontos de transporte mapeados a menos de ${r}. Oferecer traslado ou parceria com transporte local pode ser um diferencial.` });
  if (i.pois && i.pois.saude === 0)
    out.push({ id: 'sem-saude', title: 'Sem serviços de saúde próximos', text: `Não há farmácias ou unidades de saúde mapeadas a menos de ${r}. Tenha orientações e contatos de emergência à mão para os hóspedes.` });
  if (i.nextEvent)
    out.push({ id: 'evento', title: 'Evento próximo no destino', text: `"${i.nextEvent.name}" começa em ${new Date(i.nextEvent.start_date).toLocaleDateString('pt-BR')}${i.nextEvent.estimated_attendance ? `, com público estimado de ${i.nextEvent.estimated_attendance.toLocaleString('pt-BR')} pessoas` : ''}. Prepare tarifas e divulgação com antecedência.` });
  return out;
}

// Acessibilidade aérea regional (OE003): soma os voos semanais de todos os
// aeroportos com voo comercial num raio de 100 km do município, ponderados
// pela distância (até 30 km conta 100%; cai linearmente até 50% em 100 km).
// Pure module — imported by fetch-official-data and by Vitest.

export const AIR_RADIUS_KM = 100;
export const AIR_FULL_WEIGHT_KM = 30;
export const AIR_MIN_WEIGHT = 0.5;

export interface AirportPoint {
  icao: string;
  name?: string | null;
  latitude: number;
  longitude: number;
  flights_per_week: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function distanceWeight(km: number): number {
  if (km > AIR_RADIUS_KM) return 0;
  if (km <= AIR_FULL_WEIGHT_KM) return 1;
  return 1 - (1 - AIR_MIN_WEIGHT) * ((km - AIR_FULL_WEIGHT_KM) / (AIR_RADIUS_KM - AIR_FULL_WEIGHT_KM));
}

export function regionalAirAccess(lat: number, lon: number, airports: AirportPoint[]) {
  const nearby = airports
    .filter((a) => (a.flights_per_week || 0) > 0)
    .map((a) => {
      const km = haversineKm(lat, lon, a.latitude, a.longitude);
      return { ...a, km: Math.round(km * 10) / 10, weight: distanceWeight(km) };
    })
    .filter((a) => a.weight > 0)
    .sort((a, b) => a.km - b.km);
  const weighted = nearby.reduce((s, a) => s + a.flights_per_week * a.weight, 0);
  return { value: Math.round(weighted * 10) / 10, airports: nearby };
}

/** Estabelecimentos de saúde por 10 mil habitantes. */
export function healthUnitsPer10k(units: number, population: number): number | null {
  if (!population || population <= 0 || units == null || !Number.isFinite(units)) return null;
  return Math.round((units / population) * 100000) / 10;
}

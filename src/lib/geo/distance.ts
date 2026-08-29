/** Great-circle distance between two lat/lng points, in kilometers (haversine formula). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Rough car-commute time estimate from distance, used only as a friendly display hint (not a routing engine). */
export function estimateCommuteMinutes(km: number): number {
  const avgKmh = km < 5 ? 18 : km < 15 ? 30 : 55;
  return Math.round((km / avgKmh) * 60);
}

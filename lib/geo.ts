// Shared geographic helpers for the Pune Metropolitan Region.

/** Snap to a ~100m grid, so a stored point never identifies an exact address. */
export function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}

const KM_PER_DEG = 111.32; // degrees→km along latitude; longitude scaled by cos

/** Equirectangular distance in km - plenty accurate at city scale. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * KM_PER_DEG;
  const dLng = (lng2 - lng1) * KM_PER_DEG * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

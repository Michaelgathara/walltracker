import { toRadians } from "./geo";

export function buildBoundingBox(
  latitude: number,
  longitude: number,
  radiusMiles: number,
) {
  const latDelta = radiusMiles / 69;
  const lonDelta = radiusMiles / Math.max(Math.cos((latitude * Math.PI) / 180) * 69, 1);

  return {
    swlat: latitude - latDelta,
    swlng: longitude - lonDelta,
    nelat: latitude + latDelta,
    nelng: longitude + lonDelta,
  };
}

export function withinRadiusMiles(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number,
  radiusMiles: number,
) {
  return haversineMiles(originLat, originLon, targetLat, targetLon) <= radiusMiles;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

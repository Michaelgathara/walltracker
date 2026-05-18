import type { Coordinates } from "@/types";

const earthRadiusNauticalMiles = 3440.065;

export function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceNauticalMiles(from: Coordinates, to: Coordinates) {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 * earthRadiusNauticalMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function parseCoordinates(value: string | undefined | null): Coordinates | null {
  if (!value) {
    return null;
  }

  const [longitudeText, latitudeText] = value.split(",").map((segment) => segment.trim());
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

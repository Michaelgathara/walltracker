import type { Aircraft, AnimalObservation } from "@/types";

export function buildAnimalTitle(observation: AnimalObservation) {
  return observation.commonName ?? observation.scientificName ?? "Wildlife observation";
}

export function buildAnimalDetail(observation: AnimalObservation) {
  const date = observation.observedOn
    ? new Date(observation.observedOn).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const parts = [observation.iconicTaxon, date].filter(Boolean);
  return parts.join("  ·  ");
}

export function buildAircraftTitle(aircraft: Aircraft) {
  return aircraft.callsign?.trim() || aircraft.id.toUpperCase();
}

export function buildAircraftDetail(aircraft: Aircraft) {
  const parts = [
    compactAltitude(aircraft.altitudeFeet),
    compactSpeed(aircraft.groundSpeedKnots),
    compactDistance(aircraft.distanceNauticalMiles),
  ].filter(Boolean);

  return parts.join("  ·  ");
}

function compactAltitude(altitudeFeet: number | null) {
  if (altitudeFeet === null) {
    return "ALT --";
  }

  if (altitudeFeet >= 18000) {
    return `FL${Math.round(altitudeFeet / 100)}`;
  }

  return `${Math.round(altitudeFeet).toLocaleString()} FT`;
}

function compactSpeed(speedKnots: number | null) {
  if (speedKnots === null) {
    return null;
  }

  return `${Math.round(speedKnots * 1.15078)} MPH`;
}

function compactDistance(distanceNauticalMiles: number | null) {
  return distanceNauticalMiles === null ? null : `${distanceNauticalMiles.toFixed(1)} NM`;
}

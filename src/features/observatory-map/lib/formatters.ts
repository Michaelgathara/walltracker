import type { Aircraft, AnimalObservation, Boat } from "@/types";

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

export function buildBoatTitle(boat: Boat) {
  return boat.name?.trim() || boat.callsign?.trim() || `MMSI ${boat.mmsi}`;
}

export function buildBoatDetail(boat: Boat) {
  const parts = [
    compactBoatType(boat.vesselTypeCode),
    compactSpeed(boat.speedKnots),
    compactDistance(boat.distanceNauticalMiles),
  ].filter(Boolean);

  return parts.join("  ·  ");
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

function compactBoatType(vesselTypeCode: number | null) {
  if (vesselTypeCode === null) {
    return "Vessel";
  }

  if (vesselTypeCode >= 80 && vesselTypeCode < 90) {
    return "Tanker";
  }

  if (vesselTypeCode >= 70 && vesselTypeCode < 80) {
    return "Cargo";
  }

  if (vesselTypeCode >= 60 && vesselTypeCode < 70) {
    return "Passenger";
  }

  if (vesselTypeCode >= 30 && vesselTypeCode < 40) {
    return "Fishing";
  }

  if (vesselTypeCode >= 50 && vesselTypeCode < 60) {
    return "Service";
  }

  return `Type ${vesselTypeCode}`;
}

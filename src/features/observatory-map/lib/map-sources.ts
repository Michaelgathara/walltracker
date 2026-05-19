import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Aircraft, AnimalObservation, Boat, Coordinates } from "@/types";
import type {
  AircraftFeatureProperties,
  AnimalFeatureProperties,
  BoatFeatureProperties,
} from "../types";
import {
  buildAircraftDetail,
  buildAircraftTitle,
  buildAnimalDetail,
  buildAnimalTitle,
  buildBoatDetail,
  buildBoatTitle,
} from "./formatters";

export function addProjectionSources(
  map: MapLibreMap,
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  map.addSource("receiver-position", {
    type: "geojson",
    data: buildReceiverFeatureCollection(coordinates),
  });
  map.addSource("aircraft", {
    type: "geojson",
    data: buildAircraftFeatureCollection([]),
  });
  map.addSource("aircraft-trails", {
    type: "geojson",
    data: buildTrailFeatureCollection([]),
  });
  map.addSource("animal-observations", {
    type: "geojson",
    data: buildAnimalFeatureCollection([]),
  });
  map.addSource("boats", {
    type: "geojson",
    data: buildBoatFeatureCollection([]),
  });
  map.addSource("receiver-radius", {
    type: "geojson",
    data: buildRadiusFeatureCollection(coordinates, radiusNauticalMiles),
  });
}

export function updateSource(
  map: MapLibreMap,
  sourceId: string,
  data: Parameters<GeoJSONSource["setData"]>[0],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;

  if (source) {
    source.setData(data);
  }
}

export function buildReceiverFeatureCollection(coordinates: Coordinates) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [coordinates.longitude, coordinates.latitude],
        },
        properties: {},
      },
    ],
  };
}

export function buildAircraftFeatureCollection(aircraft: Aircraft[]) {
  return {
    type: "FeatureCollection" as const,
    features: aircraft.map((trackedAircraft) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [trackedAircraft.longitude, trackedAircraft.latitude],
      },
      properties: {
        id: trackedAircraft.id,
        title: buildAircraftTitle(trackedAircraft),
        detail: buildAircraftDetail(trackedAircraft),
        altitudeFeet: trackedAircraft.altitudeFeet ?? 0,
        headingDegrees: trackedAircraft.headingDegrees ?? 0,
        speedKnots: trackedAircraft.groundSpeedKnots ?? 0,
        distanceNauticalMiles: trackedAircraft.distanceNauticalMiles ?? 999,
      } satisfies AircraftFeatureProperties,
    })),
  };
}

export function buildAnimalFeatureCollection(observations: AnimalObservation[]) {
  return {
    type: "FeatureCollection" as const,
    features: observations.map((observation) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [observation.longitude, observation.latitude],
      },
      properties: {
        id: observation.id,
        title: buildAnimalTitle(observation),
        detail: buildAnimalDetail(observation),
        iconicTaxon: observation.iconicTaxon ?? "Animalia",
      } satisfies AnimalFeatureProperties,
    })),
  };
}

export function buildBoatFeatureCollection(boats: Boat[]) {
  return {
    type: "FeatureCollection" as const,
    features: boats.map((boat) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [boat.longitude, boat.latitude],
      },
      properties: {
        id: boat.id,
        title: buildBoatTitle(boat),
        detail: buildBoatDetail(boat),
        headingDegrees: boat.headingDegrees ?? boat.courseDegrees ?? 0,
        vesselTypeCode: boat.vesselTypeCode ?? 0,
        distanceNauticalMiles: boat.distanceNauticalMiles ?? 999,
      } satisfies BoatFeatureProperties,
    })),
  };
}

export function buildTrailFeatureCollection(aircraft: Aircraft[]) {
  return {
    type: "FeatureCollection" as const,
    features: aircraft
      .filter((trackedAircraft) => trackedAircraft.track.length > 1)
      .map((trackedAircraft) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: trackedAircraft.track
            .slice()
            .reverse()
            .map((point) => [point.longitude, point.latitude]),
        },
        properties: {
          id: trackedAircraft.id,
        },
      })),
  };
}

export function buildRadiusFeatureCollection(
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  const radiusDegrees = radiusNauticalMiles / 60;
  const points = Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    const latitude = coordinates.latitude + Math.sin(angle) * radiusDegrees;
    const longitude =
      coordinates.longitude +
      (Math.cos(angle) * radiusDegrees) /
        Math.max(Math.cos((coordinates.latitude * Math.PI) / 180), 0.1);

    return [longitude, latitude];
  });

  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [points],
        },
        properties: {},
      },
    ],
  };
}

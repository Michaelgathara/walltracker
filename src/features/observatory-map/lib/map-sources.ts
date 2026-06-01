import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Aircraft, AnimalObservation, Boat, Coordinates, SunPhase } from "@/types";
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

type GeoJsonSourceData = Parameters<GeoJSONSource["setData"]>[0];
type GeoJsonSourceDefinition = {
  type: "geojson";
  data: GeoJsonSourceData;
  lineMetrics?: boolean;
};

export function addProjectionSources(
  map: MapLibreMap,
  coordinates: Coordinates,
  radiusNauticalMiles: number,
  sunPhase: SunPhase,
) {
  setOrAddSource(map, "receiver-position", {
    type: "geojson",
    data: buildReceiverFeatureCollection(coordinates),
  });
  setOrAddSource(map, "aircraft", {
    type: "geojson",
    data: buildAircraftFeatureCollection([], sunPhase),
  });
  setOrAddSource(map, "aircraft-trails", {
    type: "geojson",
    data: buildTrailFeatureCollection([], sunPhase),
    lineMetrics: true,
  });
  setOrAddSource(map, "animal-observations", {
    type: "geojson",
    data: buildAnimalFeatureCollection([], sunPhase),
  });
  setOrAddSource(map, "boats", {
    type: "geojson",
    data: buildBoatFeatureCollection([], sunPhase),
  });
  setOrAddSource(map, "receiver-radius", {
    type: "geojson",
    data: buildRadiusFeatureCollection(coordinates, radiusNauticalMiles),
  });
  setOrAddSource(map, "receiver-guides", {
    type: "geojson",
    data: buildGuideFeatureCollection(coordinates, radiusNauticalMiles),
  });
}

function setOrAddSource(
  map: MapLibreMap,
  sourceId: string,
  source: GeoJsonSourceDefinition,
) {
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;

  if (existingSource) {
    existingSource.setData(source.data);
    return;
  }

  map.addSource(sourceId, source);
}

export function updateSource(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJsonSourceData,
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

export function buildAircraftFeatureCollection(
  aircraft: Aircraft[],
  sunPhase: SunPhase,
) {
  const themeMode = getThemeMode(sunPhase);

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
        themeMode,
        altitudeFeet: trackedAircraft.altitudeFeet ?? 0,
        headingDegrees: trackedAircraft.headingDegrees ?? 0,
        speedKnots: trackedAircraft.groundSpeedKnots ?? 0,
        distanceNauticalMiles: trackedAircraft.distanceNauticalMiles ?? 999,
      } satisfies AircraftFeatureProperties,
    })),
  };
}

export function buildAnimalFeatureCollection(
  observations: AnimalObservation[],
  sunPhase: SunPhase,
) {
  const themeMode = getThemeMode(sunPhase);

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
        themeMode,
        iconicTaxon: observation.iconicTaxon ?? "Animalia",
      } satisfies AnimalFeatureProperties,
    })),
  };
}

export function buildBoatFeatureCollection(boats: Boat[], sunPhase: SunPhase) {
  const themeMode = getThemeMode(sunPhase);

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
        themeMode,
        headingDegrees: boat.headingDegrees ?? boat.courseDegrees ?? 0,
        vesselTypeCode: boat.vesselTypeCode ?? 0,
        distanceNauticalMiles: boat.distanceNauticalMiles ?? 999,
      } satisfies BoatFeatureProperties,
    })),
  };
}

function getThemeMode(sunPhase: SunPhase) {
  return sunPhase === "day" ? "day" : "night";
}

export function buildTrailFeatureCollection(
  aircraft: Aircraft[],
  sunPhase: SunPhase,
) {
  const themeMode = getThemeMode(sunPhase);

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
          themeMode,
        },
      })),
  };
}

type GuideFeatureProperties = {
  emphasis: "major" | "minor";
  guide: "radial" | "ring";
};

const radialGuideBearings: ReadonlyArray<{
  degrees: number;
  emphasis: GuideFeatureProperties["emphasis"];
}> = [
  { degrees: 0, emphasis: "major" },
  { degrees: 45, emphasis: "minor" },
  { degrees: 90, emphasis: "major" },
  { degrees: 135, emphasis: "minor" },
  { degrees: 180, emphasis: "major" },
  { degrees: 225, emphasis: "minor" },
  { degrees: 270, emphasis: "major" },
  { degrees: 315, emphasis: "minor" },
];

export function buildGuideFeatureCollection(
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  const ringFeatures = [0.25, 0.5, 0.75, 1].map((fraction) => ({
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: buildCircularLineCoordinates(
        coordinates,
        radiusNauticalMiles * fraction,
      ),
    },
    properties: {
      emphasis: fraction === 1 ? "major" : "minor",
      guide: "ring",
    } satisfies GuideFeatureProperties,
  }));

  const radialFeatures = radialGuideBearings.map(({ degrees, emphasis }) => ({
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: buildRadialCoordinates(
        coordinates,
        radiusNauticalMiles,
        degrees,
      ),
    },
    properties: {
      emphasis,
      guide: "radial",
    } satisfies GuideFeatureProperties,
  }));

  return {
    type: "FeatureCollection" as const,
    features: [...ringFeatures, ...radialFeatures],
  };
}

export function buildRadiusFeatureCollection(
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [buildCircularLineCoordinates(coordinates, radiusNauticalMiles)],
        },
        properties: {},
      },
    ],
  };
}

function buildCircularLineCoordinates(
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  const radiusDegrees = radiusNauticalMiles / 60;
  const longitudeScale = Math.max(
    Math.cos((coordinates.latitude * Math.PI) / 180),
    0.1,
  );

  return Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    const latitude = coordinates.latitude + Math.sin(angle) * radiusDegrees;
    const longitude =
      coordinates.longitude + (Math.cos(angle) * radiusDegrees) / longitudeScale;

    return [longitude, latitude];
  });
}

function buildRadialCoordinates(
  coordinates: Coordinates,
  radiusNauticalMiles: number,
  bearingDegrees: number,
) {
  const angle = (bearingDegrees * Math.PI) / 180;
  const radiusDegrees = radiusNauticalMiles / 60;
  const longitudeScale = Math.max(
    Math.cos((coordinates.latitude * Math.PI) / 180),
    0.1,
  );

  return [
    [coordinates.longitude, coordinates.latitude],
    [
      coordinates.longitude + (Math.cos(angle) * radiusDegrees) / longitudeScale,
      coordinates.latitude + Math.sin(angle) * radiusDegrees,
    ],
  ];
}

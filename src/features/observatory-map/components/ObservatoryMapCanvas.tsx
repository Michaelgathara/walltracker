"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import type { Aircraft, AnimalObservation, Boat, Coordinates, SunPhase } from "@/types";
import {
  aircraftRefreshIntervalMs,
  getMapStyleUrl,
} from "../constants";
import {
  easeInOutCubic,
  interpolateAircraftCollection,
} from "../lib/aircraft-animation";
import { registerAircraftDayIcon, registerAircraftIcon } from "../lib/map-icons";
import { addProjectionLayers } from "../lib/map-layers";
import {
  addProjectionSources,
  buildAircraftFeatureCollection,
  buildAnimalFeatureCollection,
  buildBoatFeatureCollection,
  buildRadiusFeatureCollection,
  buildReceiverFeatureCollection,
  buildTrailFeatureCollection,
  updateSource,
} from "../lib/map-sources";
import {
  initialZoomForRadius,
  pitchForRadius,
  zoomForRadius,
} from "../lib/map-viewport";
import { registerBoatDayIcon, registerBoatIcon } from "../lib/map-icons";
import type { LayerState, LocationState } from "../types";

type ObservatoryMapCanvasProps = {
  aircraft: Aircraft[];
  animalObservations: AnimalObservation[];
  boats: Boat[];
  layers: LayerState;
  location: Extract<LocationState, { status: "ready" }>;
  mapRotationDegrees: number;
  radiusNauticalMiles: number;
  sunPhase: SunPhase;
};

export function ObservatoryMapCanvas({
  aircraft,
  animalObservations,
  boats,
  layers,
  location,
  mapRotationDegrees,
  radiusNauticalMiles,
  sunPhase,
}: ObservatoryMapCanvasProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animatedAircraftRef = useRef<Aircraft[]>([]);
  const aircraftAnimationFrameRef = useRef<number | null>(null);
  const activeMapStyleUrlRef = useRef(getMapStyleUrl(sunPhase));
  const latestRenderStateRef = useRef({
    animalObservations,
    boats,
    layers,
    sunPhase,
  });
  const initialLocationRef = useRef(location);
  const initialRadiusNauticalMilesRef = useRef(radiusNauticalMiles);

  useEffect(() => {
    latestRenderStateRef.current = {
      animalObservations,
      boats,
      layers,
      sunPhase,
    };
  }, [animalObservations, boats, layers, sunPhase]);

  const renderAircraft = useCallback((nextAircraft: Aircraft[]) => {
    animatedAircraftRef.current = nextAircraft;

    if (!mapRef.current) {
      return;
    }

    updateSource(
      mapRef.current,
      "aircraft",
      buildAircraftFeatureCollection(nextAircraft, latestRenderStateRef.current.sunPhase),
    );
    updateSource(
      mapRef.current,
      "aircraft-trails",
      buildTrailFeatureCollection(
        nextAircraft,
        latestRenderStateRef.current.sunPhase,
      ),
    );
  }, []);

  const renderAnimals = useCallback((nextAnimals: AnimalObservation[]) => {
    if (!mapRef.current) {
      return;
    }

    updateSource(
      mapRef.current,
      "animal-observations",
      buildAnimalFeatureCollection(
        nextAnimals,
        latestRenderStateRef.current.sunPhase,
      ),
    );
  }, []);

  const renderBoats = useCallback((nextBoats: Boat[]) => {
    if (!mapRef.current) {
      return;
    }

    updateSource(
      mapRef.current,
      "boats",
      buildBoatFeatureCollection(nextBoats, latestRenderStateRef.current.sunPhase),
    );
  }, []);

  const hydrateMapStyle = useCallback(
    (
      map: MapLibreMap,
      coordinates: Coordinates,
      radiusNauticalMiles: number,
    ) => {
      const { animalObservations, boats, layers, sunPhase } =
        latestRenderStateRef.current;

      map.resize();
      registerAircraftIcon(map);
      registerAircraftDayIcon(map);
      registerBoatIcon(map);
      registerBoatDayIcon(map);
      addProjectionSources(map, coordinates, radiusNauticalMiles, sunPhase);
      addProjectionLayers(map);
      renderAircraft(layers.aircraft ? animatedAircraftRef.current : []);
      renderAnimals(layers.animals ? animalObservations : []);
      renderBoats(layers.boats ? boats : []);
    },
    [renderAircraft, renderAnimals, renderBoats],
  );

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    const initialLocation = initialLocationRef.current;
    const initialRadiusNauticalMiles = initialRadiusNauticalMilesRef.current;

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: activeMapStyleUrlRef.current,
      center: [
        initialLocation.coordinates.longitude,
        initialLocation.coordinates.latitude,
      ],
      zoom: initialZoomForRadius(initialRadiusNauticalMiles),
      bearing: 0,
      pitch: pitchForRadius(initialRadiusNauticalMiles),
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const resizeFrame = window.requestAnimationFrame(() => map.resize());

    map.on("error", (event: { error?: Error }) => {
      if (event.error) {
        console.error("MapLibre error", event.error);
      }
    });

    map.once("style.load", () =>
      hydrateMapStyle(
        map,
        initialLocation.coordinates,
        initialRadiusNauticalMiles,
      ),
    );

    mapRef.current = map;

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
      mapRef.current = null;
    };
  }, [hydrateMapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const nextMapStyleUrl = getMapStyleUrl(sunPhase);

    if (!map || activeMapStyleUrlRef.current === nextMapStyleUrl) {
      return;
    }

    activeMapStyleUrlRef.current = nextMapStyleUrl;

    map.once("style.load", () =>
      hydrateMapStyle(map, location.coordinates, radiusNauticalMiles),
    );
    map.setStyle(nextMapStyleUrl);
  }, [hydrateMapStyle, location.coordinates, radiusNauticalMiles, sunPhase]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: [location.coordinates.longitude, location.coordinates.latitude],
      zoom: zoomForRadius(radiusNauticalMiles),
      bearing: mapRotationDegrees,
      pitch: pitchForRadius(radiusNauticalMiles),
      duration: 900,
    });

    updateSource(
      mapRef.current,
      "receiver-radius",
      buildRadiusFeatureCollection(location.coordinates, radiusNauticalMiles),
    );
    updateSource(
      mapRef.current,
      "receiver-position",
      buildReceiverFeatureCollection(location.coordinates),
    );
  }, [location, mapRotationDegrees, radiusNauticalMiles]);

  useEffect(() => {
    if (aircraftAnimationFrameRef.current) {
      window.cancelAnimationFrame(aircraftAnimationFrameRef.current);
      aircraftAnimationFrameRef.current = null;
    }

    const currentAircraft =
      animatedAircraftRef.current.length > 0 ? animatedAircraftRef.current : aircraft;

    if (aircraft.length === 0 || currentAircraft.length === 0) {
      renderAircraft(layers.aircraft ? aircraft : []);
      return;
    }

    const animationDurationMs = Math.max(2_500, aircraftRefreshIntervalMs - 1_000);
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / animationDurationMs, 1);
      const smoothedProgress = easeInOutCubic(progress);

      renderAircraft(
        layers.aircraft
          ? interpolateAircraftCollection(currentAircraft, aircraft, smoothedProgress)
          : [],
      );

      if (progress < 1) {
        aircraftAnimationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      aircraftAnimationFrameRef.current = null;
    };

    aircraftAnimationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (aircraftAnimationFrameRef.current) {
        window.cancelAnimationFrame(aircraftAnimationFrameRef.current);
        aircraftAnimationFrameRef.current = null;
      }
    };
  }, [aircraft, layers.aircraft, renderAircraft]);

  useEffect(() => {
    return () => {
      if (aircraftAnimationFrameRef.current) {
        window.cancelAnimationFrame(aircraftAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    renderAircraft(layers.aircraft ? animatedAircraftRef.current : []);
  }, [layers.aircraft, renderAircraft]);

  useEffect(() => {
    renderAnimals(layers.animals ? animalObservations : []);
  }, [animalObservations, layers.animals, renderAnimals]);

  useEffect(() => {
    renderBoats(layers.boats ? boats : []);
  }, [boats, layers.boats, renderBoats]);

  return (
    <div className="map-canvas-shell">
      <div
        ref={mapNodeRef}
        className="map-canvas"
        aria-label="Live observatory map"
      />
    </div>
  );
}

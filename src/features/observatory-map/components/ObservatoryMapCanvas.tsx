"use client";

import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import type { Aircraft, AnimalObservation, Boat } from "@/types";
import {
  aircraftRefreshIntervalMs,
  mapStyleUrl,
} from "../constants";
import {
  easeInOutCubic,
  interpolateAircraftCollection,
} from "../lib/aircraft-animation";
import { registerAircraftIcon } from "../lib/map-icons";
import { addProjectionLayers } from "../lib/map-layers";
import {
  addProjectionSources,
  buildAircraftFeatureCollection,
  buildAnimalFeatureCollection,
  buildBoatFeatureCollection,
  buildGuideFeatureCollection,
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
import { registerBoatIcon } from "../lib/map-icons";
import type { LayerState, LocationState } from "../types";

type ObservatoryMapCanvasProps = {
  aircraft: Aircraft[];
  animalObservations: AnimalObservation[];
  boats: Boat[];
  layers: LayerState;
  location: Extract<LocationState, { status: "ready" }>;
  mapRotationDegrees: number;
  radiusNauticalMiles: number;
};

export function ObservatoryMapCanvas({
  aircraft,
  animalObservations,
  boats,
  layers,
  location,
  mapRotationDegrees,
  radiusNauticalMiles,
}: ObservatoryMapCanvasProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animatedAircraftRef = useRef<Aircraft[]>([]);
  const aircraftAnimationFrameRef = useRef<number | null>(null);
  const latestAircraftRef = useRef(aircraft);
  const latestAnimalObservationsRef = useRef(animalObservations);
  const latestBoatsRef = useRef(boats);
  const latestLayersRef = useRef(layers);
  const latestLocationRef = useRef(location);
  const latestRadiusRef = useRef(radiusNauticalMiles);

  useEffect(() => {
    latestAircraftRef.current = aircraft;
    latestAnimalObservationsRef.current = animalObservations;
    latestBoatsRef.current = boats;
    latestLayersRef.current = layers;
    latestLocationRef.current = location;
    latestRadiusRef.current = radiusNauticalMiles;
  }, [aircraft, animalObservations, boats, layers, location, radiusNauticalMiles]);

  const renderAircraft = useCallback((nextAircraft: Aircraft[]) => {
    animatedAircraftRef.current = nextAircraft;

    if (!mapRef.current) {
      return;
    }

    updateSource(mapRef.current, "aircraft", buildAircraftFeatureCollection(nextAircraft));
    updateSource(mapRef.current, "aircraft-trails", buildTrailFeatureCollection(nextAircraft));
  }, []);

  const renderAnimals = useCallback((nextAnimals: AnimalObservation[]) => {
    if (!mapRef.current) {
      return;
    }

    updateSource(
      mapRef.current,
      "animal-observations",
      buildAnimalFeatureCollection(nextAnimals),
    );
  }, []);

  const renderBoats = useCallback((nextBoats: Boat[]) => {
    if (!mapRef.current) {
      return;
    }

    updateSource(mapRef.current, "boats", buildBoatFeatureCollection(nextBoats));
  }, []);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    let isDisposed = false;
    let map: MapLibreMap | null = null;
    let resizeFrame: number | null = null;
    const creationFrame = window.requestAnimationFrame(() => {
      if (isDisposed || !mapNodeRef.current || mapRef.current) {
        return;
      }

      const { coordinates } = latestLocationRef.current;
      const currentRadius = latestRadiusRef.current;
      map = new maplibregl.Map({
        container: mapNodeRef.current,
        style: mapStyleUrl,
        center: [coordinates.longitude, coordinates.latitude],
        zoom: initialZoomForRadius(currentRadius),
        bearing: 0,
        pitch: pitchForRadius(currentRadius),
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      resizeFrame = window.requestAnimationFrame(() => map?.resize());

      map.on("error", (event: { error?: Error }) => {
        if (event.error?.name === "AbortError") {
          return;
        }

        if (event.error) {
          console.error("MapLibre error", event.error);
        }
      });

      map.once("style.load", () => {
        if (!map || isDisposed) {
          return;
        }

        const nextLocation = latestLocationRef.current;
        const nextRadius = latestRadiusRef.current;
        const nextLayers = latestLayersRef.current;

        map.resize();
        registerAircraftIcon(map);
        registerBoatIcon(map);
        addProjectionSources(map, nextLocation.coordinates, nextRadius);
        addProjectionLayers(map);
        renderAircraft(nextLayers.aircraft ? latestAircraftRef.current : []);
        renderAnimals(nextLayers.animals ? latestAnimalObservationsRef.current : []);
        renderBoats(nextLayers.boats ? latestBoatsRef.current : []);
      });

      mapRef.current = map;
    });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(creationFrame);

      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }

      if (!map) {
        return;
      }

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      try {
        map.remove();
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          throw error;
        }
      }
    };
  }, [renderAircraft, renderAnimals, renderBoats]);

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
    updateSource(
      mapRef.current,
      "receiver-guides",
      buildGuideFeatureCollection(location.coordinates, radiusNauticalMiles),
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
        aria-label="Live observatory field"
      />
    </div>
  );
}

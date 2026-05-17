"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Aircraft, AircraftFeed } from "@/lib/aircraft/types";
import type { Coordinates } from "@/lib/geo";
import { distanceNauticalMiles } from "@/lib/geo";
import { getSunState, type SunState } from "@/lib/sun";

const mapStyleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

const refreshIntervalMs = 10_000;
const defaultRadiusNauticalMiles = 50;

type LocationState =
  | { status: "idle" | "loading" | "denied" | "unsupported"; coordinates: null }
  | {
      status: "ready";
      coordinates: Coordinates;
      accuracyMeters: number;
    };

type FeedState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "ready"; message: string; updatedAt: string }
  | { status: "error"; message: string };

type AircraftFeatureProperties = {
  id: string;
  label: string;
  altitudeFeet: number;
  headingDegrees: number;
};

export function CeilingFlightMap() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const aircraftRef = useRef<Aircraft[]>([]);
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    coordinates: null,
  });
  const [radiusNauticalMiles, setRadiusNauticalMiles] = useState(
    defaultRadiusNauticalMiles,
  );
  const [mapRotationDegrees, setMapRotationDegrees] = useState(0);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [feedState, setFeedState] = useState<FeedState>({
    status: "idle",
    message: "Waiting for your sky position.",
  });
  const [sunState, setSunState] = useState<SunState | null>(null);

  useEffect(() => {
    aircraftRef.current = aircraft;
  }, [aircraft]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "unsupported", coordinates: null });
      return;
    }

    setLocation({ status: "loading", coordinates: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: "ready",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy,
        });
      },
      () => setLocation({ status: "denied", coordinates: null }),
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(requestLocation, 0);

    return () => window.clearTimeout(timer);
  }, [requestLocation]);

  useEffect(() => {
    if (location.status !== "ready") {
      return;
    }

    const updateSun = () =>
      setSunState(getSunState(location.coordinates, new Date()));

    const firstUpdate = window.setTimeout(updateSun, 0);
    const timer = window.setInterval(updateSun, 60_000);

    return () => {
      window.clearTimeout(firstUpdate);
      window.clearInterval(timer);
    };
  }, [location]);

  const fetchAircraft = useCallback(
    async (signal?: AbortSignal) => {
      if (location.status !== "ready") {
        return;
      }

      setFeedState({ status: "loading", message: "Listening for aircraft..." });

      const response = await fetch(
        `/api/aircraft?lat=${location.coordinates.latitude}&lon=${location.coordinates.longitude}&radius=${radiusNauticalMiles}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Aircraft feed unavailable");
      }

      const feed = (await response.json()) as AircraftFeed;

      setAircraft((existingAircraft) =>
        mergeAircraftTracks(existingAircraft, feed.aircraft),
      );
      setFeedState({
        status: "ready",
        message: `${feed.aircraft.length} aircraft within ${radiusNauticalMiles} NM`,
        updatedAt: feed.fetchedAt,
      });
    },
    [location, radiusNauticalMiles],
  );

  useEffect(() => {
    if (location.status !== "ready") {
      return;
    }

    const controller = new AbortController();
    const loadAircraft = () => {
      fetchAircraft(controller.signal).catch(() => {
        if (!controller.signal.aborted) {
          setFeedState({
            status: "error",
            message: "The aircraft feed is quiet or unavailable.",
          });
        }
      });
    };

    const firstLoad = window.setTimeout(loadAircraft, 0);
    const timer = window.setInterval(loadAircraft, refreshIntervalMs);

    return () => {
      controller.abort();
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [fetchAircraft, location]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current || location.status !== "ready") {
      return;
    }

    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: mapStyleUrl,
      center: [location.coordinates.longitude, location.coordinates.latitude],
      zoom: zoomForRadius(defaultRadiusNauticalMiles),
      bearing: 0,
      pitch: 48,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    map.on("load", () => {
      addProjectionSources(map, location.coordinates, defaultRadiusNauticalMiles);
      addProjectionLayers(map);
      updateSource(map, "aircraft", buildAircraftFeatureCollection(aircraftRef.current));
      updateSource(
        map,
        "aircraft-trails",
        buildTrailFeatureCollection(aircraftRef.current),
      );
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [location]);

  useEffect(() => {
    if (!mapRef.current || location.status !== "ready") {
      return;
    }

    mapRef.current.easeTo({
      center: [location.coordinates.longitude, location.coordinates.latitude],
      zoom: zoomForRadius(radiusNauticalMiles),
      bearing: mapRotationDegrees,
      duration: 900,
    });

    updateSource(
      mapRef.current,
      "receiver-radius",
      buildRadiusFeatureCollection(location.coordinates, radiusNauticalMiles),
    );
  }, [location, mapRotationDegrees, radiusNauticalMiles]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    updateSource(mapRef.current, "aircraft", buildAircraftFeatureCollection(aircraft));
    updateSource(mapRef.current, "aircraft-trails", buildTrailFeatureCollection(aircraft));
  }, [aircraft]);

  const sortedAircraft = useMemo(() => {
    if (location.status !== "ready") {
      return [];
    }

    return [...aircraft]
      .map((trackedAircraft) => ({
        ...trackedAircraft,
        displayDistance:
          trackedAircraft.distanceNauticalMiles ??
          distanceNauticalMiles(location.coordinates, trackedAircraft),
      }))
      .sort((left, right) => left.displayDistance - right.displayDistance)
      .slice(0, 5);
  }, [aircraft, location]);

  const theme = sunState?.phase ?? "night";

  return (
    <main className={`sky-shell sky-shell--${theme}`}>
      <div className="map-frame">
        {location.status === "ready" ? (
          <div ref={mapNodeRef} className="map-canvas" aria-label="Live aircraft map" />
        ) : (
          <LocationPrompt status={location.status} onRetry={requestLocation} />
        )}
        <div className="atmosphere atmosphere--one" />
        <div className="atmosphere atmosphere--two" />
        <div className="scanline" />
      </div>

      <section className="hud hud--primary" aria-label="Tracker controls">
        <p className="eyebrow">Walltracker / Aircraft</p>
        <h1>Nearby sky traffic</h1>
        <p className="lede">
          A live, projection-friendly view of planes moving through the airspace
          around you.
        </p>

        <div className="control-group">
          <label htmlFor="radius">Radius</label>
          <div className="range-row">
            <input
              id="radius"
              type="range"
              min="5"
              max="250"
              step="5"
              value={radiusNauticalMiles}
              onChange={(event) => setRadiusNauticalMiles(Number(event.target.value))}
            />
            <span>{radiusNauticalMiles} NM</span>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="rotation">Map orientation</label>
          <div className="range-row">
            <input
              id="rotation"
              type="range"
              min="-180"
              max="180"
              step="5"
              value={mapRotationDegrees}
              onChange={(event) => setMapRotationDegrees(Number(event.target.value))}
            />
            <span>{mapRotationDegrees} deg</span>
          </div>
        </div>
      </section>

      <section className="hud hud--status" aria-label="Sky status">
        <div>
          <p className="eyebrow">Light</p>
          <strong>{sunState?.label ?? "Locating"}</strong>
          {sunState ? (
            <span>
              Sun {sunState.altitudeDegrees.toFixed(1)} deg /
              azimuth {sunState.azimuthDegrees.toFixed(0)} deg
            </span>
          ) : null}
        </div>
        <div>
          <p className="eyebrow">Feed</p>
          <strong>{feedState.message}</strong>
          {feedState.status === "ready" ? (
            <span>Updated {new Date(feedState.updatedAt).toLocaleTimeString()}</span>
          ) : null}
        </div>
      </section>

      <aside className="aircraft-list" aria-label="Closest aircraft">
        <p className="eyebrow">Closest signals</p>
        {sortedAircraft.length > 0 ? (
          sortedAircraft.map((trackedAircraft) => (
            <article key={trackedAircraft.id} className="aircraft-card">
              <strong>{trackedAircraft.callsign ?? trackedAircraft.id.toUpperCase()}</strong>
              <span>{trackedAircraft.displayDistance.toFixed(1)} NM</span>
              <small>
                {formatAltitude(trackedAircraft.altitudeFeet)} /{" "}
                {formatSpeed(trackedAircraft.groundSpeedKnots)}
              </small>
            </article>
          ))
        ) : (
          <p className="quiet">No aircraft resolved yet.</p>
        )}
      </aside>
    </main>
  );
}

function LocationPrompt({
  status,
  onRetry,
}: {
  status: LocationState["status"];
  onRetry: () => void;
}) {
  const message =
    status === "denied"
      ? "Location permission is needed to tune the local sky."
      : status === "unsupported"
        ? "This browser does not support geolocation."
        : "Finding your local sky...";

  return (
    <div className="location-prompt">
      <p className="eyebrow">Location</p>
      <h2>{message}</h2>
      <button type="button" onClick={onRetry}>
        Use browser location
      </button>
    </div>
  );
}

function mergeAircraftTracks(previous: Aircraft[], next: Aircraft[]) {
  const previousById = new Map(previous.map((aircraft) => [aircraft.id, aircraft]));

  return next.map((aircraft) => {
    const previousAircraft = previousById.get(aircraft.id);
    const track = [
      ...aircraft.track,
      ...(previousAircraft?.track ?? []),
    ].slice(0, 12);

    return { ...aircraft, track };
  });
}

function addProjectionSources(
  map: MapLibreMap,
  coordinates: Coordinates,
  radiusNauticalMiles: number,
) {
  map.addSource("aircraft", {
    type: "geojson",
    data: buildAircraftFeatureCollection([]),
  });
  map.addSource("aircraft-trails", {
    type: "geojson",
    data: buildTrailFeatureCollection([]),
  });
  map.addSource("receiver-radius", {
    type: "geojson",
    data: buildRadiusFeatureCollection(coordinates, radiusNauticalMiles),
  });
}

function addProjectionLayers(map: MapLibreMap) {
  map.addLayer({
    id: "receiver-radius-fill",
    type: "fill",
    source: "receiver-radius",
    paint: {
      "fill-color": "#88c9ff",
      "fill-opacity": 0.05,
    },
  });

  map.addLayer({
    id: "receiver-radius-line",
    type: "line",
    source: "receiver-radius",
    paint: {
      "line-color": "#b7dfff",
      "line-opacity": 0.28,
      "line-width": 1,
      "line-dasharray": [2, 3],
    },
  });

  map.addLayer({
    id: "aircraft-trails",
    type: "line",
    source: "aircraft-trails",
    paint: {
      "line-color": "#9fe8ff",
      "line-opacity": 0.38,
      "line-width": 1.4,
      "line-blur": 1,
    },
  });

  map.addLayer({
    id: "aircraft-halo",
    type: "circle",
    source: "aircraft",
    paint: {
      "circle-color": "#a7f3ff",
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "altitudeFeet"],
        0,
        12,
        45000,
        24,
      ],
      "circle-opacity": 0.28,
      "circle-blur": 0.8,
    },
  });

  map.addLayer({
    id: "aircraft-core",
    type: "circle",
    source: "aircraft",
    paint: {
      "circle-color": "#f6fbff",
      "circle-radius": 5,
      "circle-stroke-color": "#6ee7ff",
      "circle-stroke-width": 1.5,
      "circle-opacity": 0.95,
    },
  });

  map.addLayer({
    id: "aircraft-labels",
    type: "symbol",
    source: "aircraft",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.25],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#e8fbff",
      "text-halo-color": "#04111d",
      "text-halo-width": 1.5,
      "text-opacity": 0.9,
    },
  });
}

function updateSource(
  map: MapLibreMap,
  sourceId: string,
  data: Parameters<GeoJSONSource["setData"]>[0],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;

  if (source) {
    source.setData(data);
  }
}

function buildAircraftFeatureCollection(aircraft: Aircraft[]) {
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
        label: trackedAircraft.callsign ?? trackedAircraft.id.toUpperCase(),
        altitudeFeet: trackedAircraft.altitudeFeet ?? 0,
        headingDegrees: trackedAircraft.headingDegrees ?? 0,
      } satisfies AircraftFeatureProperties,
    })),
  };
}

function buildTrailFeatureCollection(aircraft: Aircraft[]) {
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

function buildRadiusFeatureCollection(
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

function zoomForRadius(radiusNauticalMiles: number) {
  if (radiusNauticalMiles <= 15) return 8;
  if (radiusNauticalMiles <= 35) return 7;
  if (radiusNauticalMiles <= 75) return 6;
  if (radiusNauticalMiles <= 140) return 5;
  return 4;
}

function formatAltitude(altitudeFeet: number | null) {
  return altitudeFeet === null ? "alt unknown" : `${altitudeFeet.toLocaleString()} ft`;
}

function formatSpeed(speedKnots: number | null) {
  return speedKnots === null ? "speed unknown" : `${Math.round(speedKnots)} kt`;
}

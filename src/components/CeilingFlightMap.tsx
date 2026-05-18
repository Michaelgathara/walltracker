"use client";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Aircraft, AircraftFeed } from "@/lib/aircraft/types";
import type { Coordinates } from "@/lib/geo";
import { getSunState, type SunState } from "@/lib/sun";

const defaultMapStyleUrl = "/api/mapbox/style?style=dark-v11";
const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? defaultMapStyleUrl;

const refreshIntervalMs = 10_000;
const defaultRadiusNauticalMiles = 50;
const aircraftIconId = "aircraft-marker";

type LocationState =
  | { status: "idle" | "loading" | "denied" | "unsupported"; coordinates: null }
  | {
      status: "ready";
      coordinates: Coordinates;
      accuracyMeters: number | null;
      source: "geolocation" | "fallback";
    };

type FeedState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "ready"; message: string; updatedAt: string }
  | { status: "error"; message: string };

type AircraftFeatureProperties = {
  id: string;
  title: string;
  detail: string;
  altitudeFeet: number;
  headingDegrees: number;
  speedKnots: number;
  distanceNauticalMiles: number;
};

export function CeilingFlightMap() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const animatedAircraftRef = useRef<Aircraft[]>([]);
  const aircraftAnimationFrameRef = useRef<number | null>(null);
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

  const renderAircraft = useCallback((nextAircraft: Aircraft[]) => {
    animatedAircraftRef.current = nextAircraft;

    if (!mapRef.current) {
      return;
    }

    updateSource(mapRef.current, "aircraft", buildAircraftFeatureCollection(nextAircraft));
    updateSource(mapRef.current, "aircraft-trails", buildTrailFeatureCollection(nextAircraft));
  }, []);

  const requestLocation = useCallback(() => {
    const fallbackCoordinates = getFallbackCoordinates();

    if (!navigator.geolocation) {
      if (fallbackCoordinates) {
        setLocation({
          status: "ready",
          coordinates: fallbackCoordinates,
          accuracyMeters: null,
          source: "fallback",
        });
        return;
      }

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
          source: "geolocation",
        });
      },
      () => {
        if (fallbackCoordinates) {
          setLocation({
            status: "ready",
            coordinates: fallbackCoordinates,
            accuracyMeters: null,
            source: "fallback",
          });
          return;
        }

        setLocation({ status: "denied", coordinates: null });
      },
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
      zoom: initialZoomForRadius(defaultRadiusNauticalMiles),
      bearing: 0,
      pitch: 48,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const resizeFrame = window.requestAnimationFrame(() => map.resize());

    map.on("error", (event) => {
      if (event.error) {
        console.error("MapLibre error", event.error);
      }
    });

    map.once("style.load", () => {
      map.resize();
      registerAircraftIcon(map);
      addProjectionSources(map, location.coordinates, defaultRadiusNauticalMiles);
      addProjectionLayers(map);
      renderAircraft(animatedAircraftRef.current);
    });

    mapRef.current = map;

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      map.remove();
      mapRef.current = null;
    };
  }, [location, renderAircraft]);

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
      renderAircraft(aircraft);
      return;
    }

    const animationDurationMs = Math.max(2_500, refreshIntervalMs - 1_000);
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / animationDurationMs, 1);
      const smoothedProgress = easeInOutCubic(progress);

      renderAircraft(
        interpolateAircraftCollection(currentAircraft, aircraft, smoothedProgress),
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
  }, [aircraft, renderAircraft]);

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

    renderAircraft(animatedAircraftRef.current);
  }, [renderAircraft]);

  const theme = sunState?.phase ?? "night";

  return (
    <main className={`sky-shell sky-shell--${theme}`}>
      <div className="map-frame">
        {location.status === "ready" ? (
          <div className="map-canvas-shell">
            <div
              ref={mapNodeRef}
              className="map-canvas"
              aria-label="Live aircraft map"
            />
          </div>
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

        <div className="hud-section">
          <div className="control-group">
            <label htmlFor="radius">Range</label>
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
              <span className="range-value">{radiusNauticalMiles} NM</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="rotation">Bearing</label>
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
              <span className="range-value">{mapRotationDegrees} deg</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hud hud--status" aria-label="Sky status">
        <div className="status-block">
          <p className="eyebrow">Light</p>
          <strong>{sunState?.label ?? "Locating"}</strong>
          {sunState ? (
            <span className="status-meta">
              Sun {sunState.altitudeDegrees.toFixed(1)} deg /
              azimuth {sunState.azimuthDegrees.toFixed(0)} deg
            </span>
          ) : null}
        </div>
        <div className="status-block">
          <p className="eyebrow">Feed</p>
          <strong>{feedState.message}</strong>
          {feedState.status === "ready" ? (
            <span className="status-meta">
              Updated {new Date(feedState.updatedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </section>
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

function interpolateAircraftCollection(
  currentAircraft: Aircraft[],
  targetAircraft: Aircraft[],
  progress: number,
) {
  const currentAircraftById = new Map(
    currentAircraft.map((trackedAircraft) => [trackedAircraft.id, trackedAircraft]),
  );

  return targetAircraft.map((trackedAircraft) => {
    const currentSnapshot = currentAircraftById.get(trackedAircraft.id);

    if (!currentSnapshot) {
      return trackedAircraft;
    }

    const latitude = interpolateNumber(
      currentSnapshot.latitude,
      trackedAircraft.latitude,
      progress,
    );
    const longitude = interpolateNumber(
      currentSnapshot.longitude,
      trackedAircraft.longitude,
      progress,
    );

    return {
      ...trackedAircraft,
      latitude,
      longitude,
      altitudeFeet: interpolateOptionalNumber(
        currentSnapshot.altitudeFeet,
        trackedAircraft.altitudeFeet,
        progress,
      ),
      groundSpeedKnots: interpolateOptionalNumber(
        currentSnapshot.groundSpeedKnots,
        trackedAircraft.groundSpeedKnots,
        progress,
      ),
      headingDegrees: interpolateHeading(
        currentSnapshot.headingDegrees,
        trackedAircraft.headingDegrees,
        progress,
      ),
      distanceNauticalMiles: interpolateOptionalNumber(
        currentSnapshot.distanceNauticalMiles,
        trackedAircraft.distanceNauticalMiles,
        progress,
      ),
      track: buildAnimatedTrack(trackedAircraft, latitude, longitude),
    };
  });
}

function buildAnimatedTrack(
  aircraft: Aircraft,
  latitude: number,
  longitude: number,
) {
  if (aircraft.track.length === 0) {
    return aircraft.track;
  }

  return [
    {
      latitude,
      longitude,
      seenAt: aircraft.track[0]?.seenAt ?? new Date().toISOString(),
    },
    ...aircraft.track.slice(1),
  ];
}

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateOptionalNumber(
  start: number | null,
  end: number | null,
  progress: number,
) {
  if (start === null || end === null) {
    return end;
  }

  return interpolateNumber(start, end, progress);
}

function interpolateHeading(
  start: number | null,
  end: number | null,
  progress: number,
) {
  if (start === null || end === null) {
    return end;
  }

  const delta = ((((end - start) % 360) + 540) % 360) - 180;
  return (start + delta * progress + 360) % 360;
}

function easeInOutCubic(progress: number) {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function addProjectionSources(
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
    id: "receiver-position-halo",
    type: "circle",
    source: "receiver-position",
    paint: {
      "circle-color": "#c9f7ff",
      "circle-radius": 28,
      "circle-opacity": 0.24,
      "circle-blur": 1,
    },
  });

  map.addLayer({
    id: "receiver-position-core",
    type: "circle",
    source: "receiver-position",
    paint: {
      "circle-color": "#f8fdff",
      "circle-radius": 6,
      "circle-stroke-color": "#7ee8ff",
      "circle-stroke-width": 2,
      "circle-opacity": 0.98,
    },
  });

  map.addLayer({
    id: "aircraft-trails",
    type: "line",
    source: "aircraft-trails",
    paint: {
      "line-color": "#9fe8ff",
      "line-opacity": 0.52,
      "line-width": 2.1,
      "line-blur": 1.2,
    },
  });

  map.addLayer({
    id: "aircraft-halo",
    type: "circle",
    source: "aircraft",
    paint: {
      "circle-color": "#8df4d2",
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "altitudeFeet"],
        0,
        12,
        45000,
        20,
      ],
      "circle-opacity": 0.2,
      "circle-blur": 1.3,
    },
  });

  map.addLayer({
    id: "aircraft-symbols",
    type: "symbol",
    source: "aircraft",
    layout: {
      "icon-image": "aircraft-marker",
      "icon-size": 0.7,
      "icon-rotate": ["get", "headingDegrees"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: {
      "icon-opacity": 0.98,
    },
  });

  map.addLayer({
    id: "aircraft-labels",
    type: "symbol",
    source: "aircraft",
    layout: {
      "text-field": ["concat", ["get", "title"], "\n", ["get", "detail"]],
      "text-font": ["Open Sans Regular"],
      "text-size": 11,
      "text-line-height": 1.25,
      "text-offset": [0, 1.8],
      "text-anchor": "top",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "symbol-sort-key": ["*", -1, ["get", "distanceNauticalMiles"]],
    },
    paint: {
      "text-color": "#f4fff9",
      "text-halo-color": "rgba(4, 17, 29, 0.92)",
      "text-halo-width": 2,
      "text-opacity": 0.98,
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

function buildReceiverFeatureCollection(coordinates: Coordinates) {
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
  if (radiusNauticalMiles <= 15) return 10;
  if (radiusNauticalMiles <= 35) return 9;
  if (radiusNauticalMiles <= 75) return 8;
  if (radiusNauticalMiles <= 140) return 7;
  return 6;
}

function initialZoomForRadius(radiusNauticalMiles: number) {
  return zoomForRadius(radiusNauticalMiles) + 1;
}

function buildAircraftTitle(aircraft: Aircraft) {
  return aircraft.callsign?.trim() || aircraft.id.toUpperCase();
}

function buildAircraftDetail(aircraft: Aircraft) {
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

function registerAircraftIcon(map: MapLibreMap) {
  if (map.hasImage(aircraftIconId)) {
    return;
  }

  const iconSize = 88;
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.translate(iconSize / 2, iconSize / 2);
  context.shadowColor = "rgba(109, 255, 215, 0.45)";
  context.shadowBlur = 16;
  context.fillStyle = "#ecfff7";
  context.strokeStyle = "#7af3ce";
  context.lineWidth = 2.5;

  context.beginPath();
  context.moveTo(0, -28);
  context.lineTo(5, -8);
  context.lineTo(23, -2);
  context.lineTo(23, 6);
  context.lineTo(5, 4);
  context.lineTo(1, 26);
  context.lineTo(8, 31);
  context.lineTo(8, 37);
  context.lineTo(0, 33);
  context.lineTo(-8, 37);
  context.lineTo(-8, 31);
  context.lineTo(-1, 26);
  context.lineTo(-5, 4);
  context.lineTo(-23, 6);
  context.lineTo(-23, -2);
  context.lineTo(-5, -8);
  context.closePath();
  context.fill();
  context.stroke();

  map.addImage(aircraftIconId, context.getImageData(0, 0, iconSize, iconSize), {
    pixelRatio: 2,
  });
}

function getFallbackCoordinates() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  return (
    parseCoordinates(params.get("center")) ??
    parseCoordinates(process.env.NEXT_PUBLIC_STARTING_CENTER_COORDS)
  );
}

function parseCoordinates(value: string | undefined | null) {
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

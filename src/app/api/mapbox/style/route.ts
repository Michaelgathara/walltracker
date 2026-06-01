import { NextResponse } from "next/server";
import { getMapboxToken, parseMapboxStyle } from "@/lib/mapbox";

type MapboxStyle = {
  version: 8;
  name?: string;
  metadata?: unknown;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  glyphs?: string;
  sprite?: string;
  sources?: Record<string, { url?: string; tiles?: string[]; [key: string]: unknown }>;
  layers?: MapboxLayer[];
  terrain?: unknown;
  sky?: unknown;
  light?: unknown;
  projection?: { name?: string };
};

type MapboxLayer = {
  id?: string;
  type?: string;
  source?: string;
  "source-layer"?: string;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  [key: string]: unknown;
};

type MapLibreStyle = {
  version: 8;
  metadata?: unknown;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  glyphs?: string;
  sprite?: string;
  sources?: MapboxStyle["sources"];
  layers?: MapboxStyle["layers"];
  terrain?: unknown;
  sky?: unknown;
  light?: unknown;
  projection?: { type: string };
};

export async function GET(request: Request) {
  const token = getMapboxToken();
  const url = new URL(request.url);
  const origin = url.origin;
  const styleId = parseMapboxStyle(url.searchParams.get("style"));
  const response = await fetch(
    `https://api.mapbox.com/styles/v1/mapbox/${styleId}?access_token=${token}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Mapbox style is unavailable." },
      { status: 502 },
    );
  }

  const style = (await response.json()) as MapboxStyle;

  style.glyphs = `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${token}`;
  style.sprite = `${origin}/api/mapbox/sprite/${styleId}/sprite`;

  for (const source of Object.values(style.sources ?? {})) {
    if (source.url?.startsWith("mapbox://")) {
      source.url = mapboxTileJsonUrl(source.url, token);
    }

    if (source.tiles) {
      source.tiles = source.tiles.map((tileUrl) =>
        tileUrl.startsWith("mapbox://") ? mapboxTileUrl(tileUrl, token) : tileUrl,
      );
    }
  }

  return NextResponse.json(sanitizeStyle(style), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function mapboxTileJsonUrl(url: string, token: string) {
  const tileset = url.replace("mapbox://", "");

  return `https://api.mapbox.com/v4/${tileset}.json?secure&access_token=${token}`;
}

function mapboxTileUrl(url: string, token: string) {
  const tileset = url.replace("mapbox://", "");

  return `https://api.mapbox.com/v4/${tileset}/{z}/{x}/{y}.vector.pbf?sku=101&access_token=${token}`;
}

function sanitizeStyle(style: MapboxStyle): MapLibreStyle {
  const layers = (style.layers ?? []).reduce<MapboxLayer[]>(
    (sanitizedLayers, layer) => {
      const projectionLayer = sanitizeProjectionLayer(layer);

      if (projectionLayer) {
        sanitizedLayers.push(projectionLayer);
      }

      return sanitizedLayers;
    },
    [],
  );

  return {
    version: style.version,
    metadata: style.metadata,
    center: style.center,
    zoom: style.zoom,
    bearing: style.bearing,
    pitch: style.pitch,
    glyphs: style.glyphs,
    sprite: style.sprite,
    sources: style.sources,
    layers,
    terrain: undefined,
    sky: undefined,
    light: undefined,
    // Keep the app in a local mercator view instead of Mapbox's globe preset.
    projection: { type: "mercator" },
  };
}

const rejectedLayerTokens = new Set([
  "road",
  "bridge",
  "tunnel",
  "ferry",
  "motorway",
  "street",
  "transit",
  "rail",
  "aeroway",
  "airport",
  "building",
  "structure",
  "parking",
  "poi",
  "landuse",
  "park",
]);

const outlineFillTokens = new Set(["land", "water"]);
const contextLineTokens = new Set([
  "admin",
  "boundary",
  "coastline",
  "river",
  "stream",
  "water",
  "waterway",
]);

function sanitizeProjectionLayer(layer: MapboxLayer) {
  if (layer.type === "symbol" || layer.type === "fill-extrusion") {
    return null;
  }

  const tokens = tokenizeProjectionLayer(layer);

  if (hasAnyToken(tokens, rejectedLayerTokens)) {
    return null;
  }

  if (layer.type === "background") {
    return {
      ...layer,
      paint: {
        ...layer.paint,
        "background-color": "#02070b",
      },
    };
  }

  if (layer.type === "fill") {
    return sanitizeOutlineFillLayer(layer, tokens);
  }

  if (layer.type === "line") {
    return sanitizeContextLineLayer(layer, tokens);
  }

  return null;
}

function sanitizeOutlineFillLayer(layer: MapboxLayer, tokens: Set<string>) {
  if (!hasAnyToken(tokens, outlineFillTokens)) {
    return null;
  }

  const isWater = tokens.has("water");

  return {
    ...layer,
    paint: {
      ...layer.paint,
      "fill-color": "#02070b",
      "fill-opacity": isWater ? 0.015 : 0,
      "fill-outline-color": isWater
        ? "rgba(120, 188, 226, 0.2)"
        : "rgba(196, 222, 238, 0.06)",
    },
  };
}

function sanitizeContextLineLayer(layer: MapboxLayer, tokens: Set<string>) {
  if (!hasAnyToken(tokens, contextLineTokens)) {
    return null;
  }

  const isBoundary = tokens.has("admin") || tokens.has("boundary");
  const isWater = !isBoundary;

  return {
    ...layer,
    paint: {
      ...layer.paint,
      "line-color": isBoundary
        ? "rgba(198, 221, 235, 0.18)"
        : "rgba(126, 195, 232, 0.22)",
      "line-opacity": isBoundary ? 0.28 : 0.2,
      "line-width": isBoundary ? 1 : 0.85,
      "line-dasharray": isBoundary ? [3, 3] : [1, 2],
    },
  };
}

function tokenizeProjectionLayer(layer: MapboxLayer) {
  return new Set(
    `${layer.id?.toLowerCase() ?? ""} ${layer["source-layer"]?.toLowerCase() ?? ""}`
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function hasAnyToken(tokens: Set<string>, candidates: Set<string>) {
  for (const token of candidates) {
    if (tokens.has(token)) {
      return true;
    }
  }

  return false;
}

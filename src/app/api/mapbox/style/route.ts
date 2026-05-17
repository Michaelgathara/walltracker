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
  layers?: Array<{ type?: string; layout?: Record<string, unknown> }>;
  terrain?: unknown;
  sky?: unknown;
  light?: unknown;
  projection?: { name?: string };
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
    layers: style.layers,
    terrain: style.terrain,
    sky: style.sky,
    light: style.light,
    // Keep the app in a local mercator view instead of Mapbox's globe preset.
    projection: { type: "mercator" },
  };
}

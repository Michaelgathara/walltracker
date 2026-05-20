import { NextResponse } from "next/server";
import { z } from "zod";
import type { Boat, BoatFeed } from "@/types";
import { fetchNearbyBoatsFromAISStream } from "@/lib/boats/aisstream";
import { distanceNauticalMiles } from "@/utils/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxCachedBoatsPerSnapshot = 40;
const boatCacheTtlMs = 10 * 60 * 1000;

type CachedBoatEntry = {
  boat: Boat;
  cachedAt: number;
};

const boatCacheStore = getBoatCacheStore();

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(5).max(250).default(50),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lon: url.searchParams.get("lon"),
    radius: url.searchParams.get("radius") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid boat query parameters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.AISSTREAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Boat tracking is not configured." },
      { status: 503 },
    );
  }

  const { lat, lon, radius } = parsedQuery.data;

  try {
    const feed = await fetchNearbyBoatsFromAISStream({
      latitude: lat,
      longitude: lon,
      radiusNauticalMiles: radius,
      apiKey,
    });

    if (feed.boats.length > 0) {
      rememberBoats(feed.boats, feed.fetchedAt);

      return NextResponse.json(feed, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    const cachedFeed = buildCachedBoatFeed(lat, lon, radius);

    return NextResponse.json(cachedFeed ?? feed, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch {
    const cachedFeed = buildCachedBoatFeed(lat, lon, radius);

    if (cachedFeed) {
      return NextResponse.json(cachedFeed, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    return NextResponse.json(
      { error: "Boat data is temporarily unavailable." },
      { status: 502 },
    );
  }
}

function rememberBoats(boats: Boat[], fetchedAt: string) {
  const cachedAt = Date.parse(fetchedAt) || Date.now();
  pruneBoatCache(cachedAt);

  for (const boat of boats) {
    boatCacheStore.set(boat.mmsi, { boat, cachedAt });
  }
}

function buildCachedBoatFeed(
  latitude: number,
  longitude: number,
  radiusNauticalMiles: number,
): BoatFeed | null {
  const now = Date.now();
  pruneBoatCache(now);

  const origin = { latitude, longitude };
  const cachedEntries = Array.from(boatCacheStore.values())
    .map(({ boat, cachedAt }) => ({
      boat: {
        ...boat,
        distanceNauticalMiles: distanceNauticalMiles(origin, {
          latitude: boat.latitude,
          longitude: boat.longitude,
        }),
      },
      cachedAt,
    }))
    .filter(({ boat }) => (boat.distanceNauticalMiles ?? Infinity) <= radiusNauticalMiles)
    .sort(
      (left, right) =>
        (left.boat.distanceNauticalMiles ?? Infinity) -
        (right.boat.distanceNauticalMiles ?? Infinity),
    )
    .slice(0, maxCachedBoatsPerSnapshot);

  if (cachedEntries.length === 0) {
    return null;
  }

  const newestCachedAt = Math.max(...cachedEntries.map((entry) => entry.cachedAt));

  return {
    boats: cachedEntries.map((entry) => entry.boat),
    fetchedAt: new Date(now).toISOString(),
    receiver: {
      latitude,
      longitude,
      radiusNauticalMiles,
    },
    source: "AISStream",
    freshness: "cached",
    cacheAgeSeconds: Math.max(0, Math.round((now - newestCachedAt) / 1000)),
  };
}

function pruneBoatCache(now: number) {
  for (const [mmsi, entry] of boatCacheStore) {
    if (now - entry.cachedAt > boatCacheTtlMs) {
      boatCacheStore.delete(mmsi);
    }
  }
}

function getBoatCacheStore() {
  const globalCache = globalThis as typeof globalThis & {
    __walltrackerBoatCache?: Map<number, CachedBoatEntry>;
  };

  globalCache.__walltrackerBoatCache ??= new Map<number, CachedBoatEntry>();
  return globalCache.__walltrackerBoatCache;
}

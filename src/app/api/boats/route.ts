import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchNearbyBoatsFromAISStream } from "@/lib/boats/aisstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Boat data is temporarily unavailable." },
      { status: 502 },
    );
  }
}

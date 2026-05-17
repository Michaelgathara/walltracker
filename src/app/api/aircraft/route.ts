import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchNearbyAircraft } from "@/lib/aircraft/adsb-lol";

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
      { error: "Invalid aircraft query parameters." },
      { status: 400 },
    );
  }

  try {
    const feed = await fetchNearbyAircraft({
      latitude: parsedQuery.data.lat,
      longitude: parsedQuery.data.lon,
      radiusNauticalMiles: parsedQuery.data.radius,
    });

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Aircraft data is temporarily unavailable." },
      { status: 502 },
    );
  }
}

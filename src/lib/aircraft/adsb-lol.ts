import { z } from "zod";
import type { Aircraft, AircraftFeed } from "./types";

const adsbAircraftSchema = z.object({
  hex: z.string().optional(),
  flight: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  alt_baro: z.union([z.number(), z.string()]).optional(),
  gs: z.number().optional(),
  track: z.number().optional(),
  baro_rate: z.number().optional(),
  seen: z.number().optional(),
  r_dst: z.number().optional(),
});

const adsbResponseSchema = z.object({
  ac: z.array(adsbAircraftSchema).default([]),
});

type NearbyAircraftRequest = {
  latitude: number;
  longitude: number;
  radiusNauticalMiles: number;
};

export async function fetchNearbyAircraft({
  latitude,
  longitude,
  radiusNauticalMiles,
}: NearbyAircraftRequest): Promise<AircraftFeed> {
  const endpoint = new URL(
    `https://api.adsb.lol/v2/lat/${latitude}/lon/${longitude}/dist/${radiusNauticalMiles}`,
  );

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "walltracker/0.1 local-first ceiling aircraft tracker",
    },
    next: { revalidate: 5 },
  });

  if (!response.ok) {
    throw new Error(`ADSB.lol returned ${response.status}`);
  }

  const parsed = adsbResponseSchema.parse(await response.json());
  const fetchedAt = new Date().toISOString();

  return {
    aircraft: parsed.ac
      .filter(
        (aircraft) =>
          aircraft.hex &&
          aircraft.lat !== undefined &&
          aircraft.lon !== undefined,
      )
      .map((aircraft): Aircraft => {
        const altitudeFeet =
          typeof aircraft.alt_baro === "number" ? aircraft.alt_baro : null;

        return {
          id: aircraft.hex ?? crypto.randomUUID(),
          callsign: aircraft.flight?.trim() || null,
          latitude: aircraft.lat as number,
          longitude: aircraft.lon as number,
          altitudeFeet,
          groundSpeedKnots: aircraft.gs ?? null,
          headingDegrees: aircraft.track ?? null,
          verticalRateFeetPerMinute: aircraft.baro_rate ?? null,
          distanceNauticalMiles: aircraft.r_dst ?? null,
          seenSecondsAgo: aircraft.seen ?? null,
          source: "adsb.lol",
          track: [
            {
              latitude: aircraft.lat as number,
              longitude: aircraft.lon as number,
              seenAt: fetchedAt,
            },
          ],
        };
      }),
    fetchedAt,
    receiver: {
      latitude,
      longitude,
      radiusNauticalMiles,
    },
    source: "adsb.lol",
  };
}

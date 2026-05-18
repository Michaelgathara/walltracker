import { NextResponse } from "next/server";
import { z } from "zod";
import type { AnimalObservation, AnimalObservationFeed } from "@/types";
import { buildBoundingBox, withinRadiusMiles } from "@/utils/geo-bounds";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(5).max(250).default(50),
});

const inaturalistObservationSchema = z.object({
  id: z.number(),
  species_guess: z.string().nullish(),
  observed_on: z.string().nullish(),
  time_observed_at: z.string().nullish(),
  place_guess: z.string().nullish(),
  latitude: z.number(),
  longitude: z.number(),
  iconic_taxon_name: z.string().nullish(),
  uri: z.string().url(),
  taxon: z
    .object({
      preferred_common_name: z.string().nullish(),
      name: z.string().nullish(),
    })
    .nullish(),
  photos: z
    .array(
      z.object({
        url: z.string().url().nullish(),
      }),
    )
    .default([]),
});

const inaturalistResponseSchema = z.object({
  results: z.array(inaturalistObservationSchema).default([]),
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
      { error: "Invalid animal query parameters." },
      { status: 400 },
    );
  }

  const { lat, lon, radius } = parsedQuery.data;

  try {
    const bounds = buildBoundingBox(lat, lon, radius);
    const endpoint = new URL("https://www.inaturalist.org/observations.json");
    endpoint.searchParams.set("order_by", "observed_on");
    endpoint.searchParams.set("order", "desc");
    endpoint.searchParams.set("per_page", "30");
    endpoint.searchParams.set("quality_grade", "research");
    endpoint.searchParams.set("has[]", "geo");
    endpoint.searchParams.set("has[]", "photos");
    endpoint.searchParams.set("iconic_taxa[]", "Aves");
    endpoint.searchParams.set("iconic_taxa[]", "Mammalia");
    endpoint.searchParams.set("iconic_taxa[]", "Reptilia");
    endpoint.searchParams.set("iconic_taxa[]", "Amphibia");
    endpoint.searchParams.set("iconic_taxa[]", "Actinopterygii");
    endpoint.searchParams.set("iconic_taxa[]", "Mollusca");
    endpoint.searchParams.set("swlat", bounds.swlat.toString());
    endpoint.searchParams.set("swlng", bounds.swlng.toString());
    endpoint.searchParams.set("nelat", bounds.nelat.toString());
    endpoint.searchParams.set("nelng", bounds.nelng.toString());

    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": "walltracker/0.1 nearby-animal-observatory",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`iNaturalist returned ${response.status}`);
    }

    const parsed = inaturalistResponseSchema.parse(await response.json());
    const observations = parsed.results
      .map((observation): AnimalObservation => ({
        id: observation.id.toString(),
        commonName:
          observation.taxon?.preferred_common_name ?? observation.species_guess ?? null,
        scientificName: observation.taxon?.name ?? null,
        iconicTaxon: observation.iconic_taxon_name ?? null,
        latitude: observation.latitude,
        longitude: observation.longitude,
        observedAt: observation.time_observed_at ?? null,
        observedOn: observation.observed_on ?? null,
        placeGuess: observation.place_guess ?? null,
        imageUrl: observation.photos[0]?.url?.replace("square", "small") ?? null,
        observationUrl: observation.uri,
      }))
      .filter((observation) =>
        withinRadiusMiles(lat, lon, observation.latitude, observation.longitude, radius),
      )
      .slice(0, 18);

    const feed: AnimalObservationFeed = {
      observations,
      fetchedAt: new Date().toISOString(),
      source: "iNaturalist",
    };

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=1800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Animal observation data is temporarily unavailable." },
      { status: 502 },
    );
  }
}

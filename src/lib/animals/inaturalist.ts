import { z } from "zod";
import type { AnimalObservation, AnimalObservationFeed } from "@/types";
import { buildBoundingBox, withinRadiusMiles } from "@/utils/geo-bounds";

const coordinateSchema = z.preprocess((value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}, z.number());

const inaturalistObservationSchema = z.object({
  id: z.number(),
  species_guess: z.string().nullish(),
  observed_on: z.string().nullish(),
  time_observed_at: z.string().nullish(),
  place_guess: z.string().nullish(),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
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
  results: z.array(z.unknown()).default([]),
});

type ParsedInaturalistObservation = z.infer<typeof inaturalistObservationSchema>;
type ObservationParseResult = {
  index: number;
  result: ReturnType<typeof inaturalistObservationSchema.safeParse>;
};

type FetchNearbyAnimalObservationsRequest = {
  latitude: number;
  longitude: number;
  radiusNauticalMiles: number;
};

export async function fetchNearbyAnimalObservations({
  latitude,
  longitude,
  radiusNauticalMiles,
}: FetchNearbyAnimalObservationsRequest): Promise<AnimalObservationFeed> {
  const radiusMiles = radiusNauticalMiles * 1.15078;
  const endpoint = buildObservationsEndpoint(latitude, longitude, radiusMiles);

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "walltracker/0.1 nearby-animal-observatory",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("iNaturalist request failed", {
      status: response.status,
      statusText: response.statusText,
      endpoint: endpoint.toString(),
      body: errorBody.slice(0, 500),
    });
    throw new Error(`iNaturalist returned ${response.status}`);
  }

  const rawPayload = await response.json();
  const parsedResult = inaturalistResponseSchema.safeParse(rawPayload);

  if (!parsedResult.success) {
    console.error("iNaturalist response schema mismatch", {
      endpoint: endpoint.toString(),
      issues: parsedResult.error.issues,
    });
    throw new Error("iNaturalist response schema mismatch");
  }

  const validObservations = parsedResult.data.results
    .map((observation: unknown, index: number): ObservationParseResult => ({
      index,
      result: inaturalistObservationSchema.safeParse(observation),
    }))
    .filter(
      (
        observation: ObservationParseResult,
      ): observation is {
        index: number;
        result: { success: true; data: ParsedInaturalistObservation };
      } => observation.result.success,
    )
    .map((observation: ObservationParseResult & {
      result: { success: true; data: ParsedInaturalistObservation };
    }) => observation.result.data);

  const skippedObservations = parsedResult.data.results.length - validObservations.length;

  if (skippedObservations > 0) {
    const sampleIssues = parsedResult.data.results
      .map((observation: unknown, index: number): ObservationParseResult => ({
        index,
        result: inaturalistObservationSchema.safeParse(observation),
      }))
      .filter(
        (
          observation: ObservationParseResult,
        ): observation is ObservationParseResult & {
          result: { success: false; error: z.ZodError };
        } => !observation.result.success,
      )
      .slice(0, 3)
      .map((observation: ObservationParseResult & {
        result: { success: false; error: z.ZodError };
      }) => ({
        index: observation.index,
        issues: observation.result.error.issues,
      }));

    console.warn("Skipped invalid iNaturalist observations", {
      endpoint: endpoint.toString(),
      skippedObservations,
      sampleIssues,
    });
  }

  const observations = validObservations
    .map((observation: ParsedInaturalistObservation): AnimalObservation => ({
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
    .filter((observation: AnimalObservation) =>
      withinRadiusMiles(
        latitude,
        longitude,
        observation.latitude,
        observation.longitude,
        radiusMiles,
      ),
    )
    .slice(0, 18);

  return {
    observations,
    fetchedAt: new Date().toISOString(),
    source: "iNaturalist",
  };
}

function buildObservationsEndpoint(
  latitude: number,
  longitude: number,
  radiusMiles: number,
) {
  const bounds = buildBoundingBox(latitude, longitude, radiusMiles);
  const endpoint = new URL("https://api.inaturalist.org/v1/observations");

  endpoint.searchParams.set("order_by", "observed_on");
  endpoint.searchParams.set("order", "desc");
  endpoint.searchParams.set("per_page", "20");
  endpoint.searchParams.set("quality_grade", "research");
  endpoint.searchParams.append("has[]", "geo");
  endpoint.searchParams.append("has[]", "photos");
  endpoint.searchParams.append("iconic_taxa[]", "Aves");
  endpoint.searchParams.append("iconic_taxa[]", "Mammalia");
  endpoint.searchParams.append("iconic_taxa[]", "Reptilia");
  endpoint.searchParams.append("iconic_taxa[]", "Amphibia");
  endpoint.searchParams.append("iconic_taxa[]", "Actinopterygii");
  endpoint.searchParams.append("iconic_taxa[]", "Mollusca");
  endpoint.searchParams.set("swlat", bounds.swlat.toString());
  endpoint.searchParams.set("swlng", bounds.swlng.toString());
  endpoint.searchParams.set("nelat", bounds.nelat.toString());
  endpoint.searchParams.set("nelng", bounds.nelng.toString());

  return endpoint;
}

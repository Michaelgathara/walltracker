import { z } from "zod";

const receiverSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radiusNauticalMiles: z.number(),
});

const aircraftTrackPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  seenAt: z.string(),
});

const aircraftSchema = z.object({
  id: z.string(),
  callsign: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  altitudeFeet: z.number().nullable(),
  groundSpeedKnots: z.number().nullable(),
  headingDegrees: z.number().nullable(),
  verticalRateFeetPerMinute: z.number().nullable(),
  distanceNauticalMiles: z.number().nullable(),
  seenSecondsAgo: z.number().nullable(),
  source: z.string(),
  track: z.array(aircraftTrackPointSchema),
});

export const aircraftFeedSchema = z.object({
  aircraft: z.array(aircraftSchema),
  fetchedAt: z.string(),
  receiver: receiverSchema,
  source: z.string(),
});

const animalObservationSchema = z.object({
  id: z.string(),
  commonName: z.string().nullable(),
  scientificName: z.string().nullable(),
  iconicTaxon: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  observedAt: z.string().nullable(),
  observedOn: z.string().nullable(),
  placeGuess: z.string().nullable(),
  imageUrl: z.string().nullable(),
  observationUrl: z.string(),
});

export const animalObservationFeedSchema = z.object({
  observations: z.array(animalObservationSchema),
  fetchedAt: z.string(),
  source: z.literal("iNaturalist"),
});

const boatSchema = z.object({
  id: z.string(),
  mmsi: z.number(),
  imo: z.number().nullable(),
  name: z.string().nullable(),
  callsign: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  courseDegrees: z.number().nullable(),
  speedKnots: z.number().nullable(),
  headingDegrees: z.number().nullable(),
  vesselTypeCode: z.number().nullable(),
  destination: z.string().nullable(),
  draughtMeters: z.number().nullable(),
  distanceNauticalMiles: z.number().nullable(),
  reportedAt: z.string().nullable(),
  source: z.literal("AISStream"),
});

export const boatFeedSchema = z.object({
  boats: z.array(boatSchema),
  fetchedAt: z.string(),
  receiver: receiverSchema,
  source: z.literal("AISStream"),
  freshness: z.enum(["live", "cached", "empty"]),
  cacheAgeSeconds: z.number().nullable(),
});

import { z } from "zod";

const mapboxStyleSchema = z.enum([
  "dark-v11",
  "light-v11",
  "streets-v12",
  "outdoors-v12",
  "satellite-streets-v12",
]);

export type MapboxStyleId = z.infer<typeof mapboxStyleSchema>;

export function parseMapboxStyle(value: string | null): MapboxStyleId {
  return mapboxStyleSchema.catch("dark-v11").parse(value);
}

export function getMapboxToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not configured.");
  }

  return token;
}

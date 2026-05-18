import type { Coordinates } from "@/types";

export type DisplayLayer = "aircraft" | "animals" | "boats";

export type LayerState = Record<DisplayLayer, boolean>;

export type LocationState =
  | { status: "idle" | "loading" | "denied" | "unsupported"; coordinates: null }
  | {
      status: "ready";
      coordinates: Coordinates;
      accuracyMeters: number | null;
      source: "geolocation" | "fallback";
    };

export type FeedState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "ready"; message: string; updatedAt: string }
  | { status: "error"; message: string };

export type AircraftFeatureProperties = {
  id: string;
  title: string;
  detail: string;
  altitudeFeet: number;
  headingDegrees: number;
  speedKnots: number;
  distanceNauticalMiles: number;
};

export type AnimalFeatureProperties = {
  id: string;
  title: string;
  detail: string;
  iconicTaxon: string;
};

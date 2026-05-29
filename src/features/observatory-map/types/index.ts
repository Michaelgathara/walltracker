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

type FeedStateBase = {
  label: string;
  count: number;
  message: string;
};

export type FeedState =
  | ({ status: "idle" } & FeedStateBase)
  | ({ status: "loading" } & FeedStateBase)
  | ({ status: "ready"; updatedAt: string } & FeedStateBase)
  | ({ status: "error" } & FeedStateBase);

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

export type BoatFeatureProperties = {
  id: string;
  title: string;
  detail: string;
  headingDegrees: number;
  vesselTypeCode: number;
  distanceNauticalMiles: number;
};

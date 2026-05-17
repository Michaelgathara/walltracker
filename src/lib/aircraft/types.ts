export type AircraftTrackPoint = {
  latitude: number;
  longitude: number;
  seenAt: string;
};

export type Aircraft = {
  id: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitudeFeet: number | null;
  groundSpeedKnots: number | null;
  headingDegrees: number | null;
  verticalRateFeetPerMinute: number | null;
  distanceNauticalMiles: number | null;
  seenSecondsAgo: number | null;
  source: string;
  track: AircraftTrackPoint[];
};

export type AircraftFeed = {
  aircraft: Aircraft[];
  fetchedAt: string;
  receiver: {
    latitude: number;
    longitude: number;
    radiusNauticalMiles: number;
  };
  source: string;
};

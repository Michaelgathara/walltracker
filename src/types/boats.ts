export type Boat = {
  id: string;
  mmsi: number;
  imo: number | null;
  name: string | null;
  callsign: string | null;
  latitude: number;
  longitude: number;
  courseDegrees: number | null;
  speedKnots: number | null;
  headingDegrees: number | null;
  vesselTypeCode: number | null;
  destination: string | null;
  draughtMeters: number | null;
  distanceNauticalMiles: number | null;
  reportedAt: string | null;
  source: "AISStream";
};

export type BoatFeed = {
  boats: Boat[];
  fetchedAt: string;
  receiver: {
    latitude: number;
    longitude: number;
    radiusNauticalMiles: number;
  };
  source: "AISStream";
};

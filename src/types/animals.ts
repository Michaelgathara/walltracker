export type AnimalObservation = {
  id: string;
  commonName: string | null;
  scientificName: string | null;
  iconicTaxon: string | null;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  observedOn: string | null;
  placeGuess: string | null;
  imageUrl: string | null;
  observationUrl: string;
};

export type AnimalObservationFeed = {
  observations: AnimalObservation[];
  fetchedAt: string;
  source: "iNaturalist";
};

export type AnimalTracker = {
  id: string;
  name: string;
  focus: string;
  coverage: string;
  summary: string;
  access: string;
  url: string;
};

export type AnimalTrackerFeed = {
  trackers: AnimalTracker[];
  fetchedAt: string;
  source: string;
};

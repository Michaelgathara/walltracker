export const defaultMapStyleUrl = "/api/mapbox/style?style=dark-v11";
export const mapStyleUrl =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? defaultMapStyleUrl;

export const aircraftRefreshIntervalMs = 10_000;
export const animalRefreshIntervalMs = 60_000;
export const boatRefreshIntervalMs = 60_000;
export const defaultRadiusNauticalMiles = 50;
export const aircraftIconId = "aircraft-marker";
export const boatIconId = "boat-marker";

import type { SunPhase } from "@/types";

const defaultMapStyleUrls = {
  dawn: "/api/mapbox/style?style=outdoors-v12",
  day: "/api/mapbox/style?style=light-v11",
  dusk: "/api/mapbox/style?style=streets-v12",
  night: "/api/mapbox/style?style=dark-v11",
} satisfies Record<SunPhase, string>;

export function getMapStyleUrl(sunPhase: SunPhase) {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? defaultMapStyleUrls[sunPhase];
}

export const aircraftRefreshIntervalMs = 10_000;
export const animalRefreshIntervalMs = 60_000;
export const boatRefreshIntervalMs = 60_000;
export const defaultRadiusNauticalMiles = 50;
export const aircraftIconId = "aircraft-marker";
export const boatIconId = "boat-marker";

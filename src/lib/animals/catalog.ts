import type { AnimalTrackerFeed } from "./types";

const trackers = [
  {
    id: "movebank",
    name: "Movebank Animal Tracker",
    focus: "GPS-tagged wildlife studies",
    coverage: "Global",
    summary:
      "The best path for serious tracked-animal data, spanning birds, mammals, marine species, and study-specific telemetry.",
    access: "Public studies and app-linked feeds",
    url: "https://www.movebank.org/cms/movebank-content/animal-tracker",
  },
  {
    id: "ocearch",
    name: "OCEARCH Shark Tracker",
    focus: "Sharks and marine megafauna",
    coverage: "Global oceans",
    summary:
      "A polished public tracker for sharks, turtles, and other tagged marine animals with strong storytelling and broad public visibility.",
    access: "Browser and mobile tracker",
    url: "https://www.ocearch.org/research/track-sharks-with-us/",
  },
  {
    id: "birdcast",
    name: "BirdCast Migration Dashboard",
    focus: "Nightly bird migration",
    coverage: "Contiguous United States",
    summary:
      "Radar-powered migration intelligence showing when and where birds are moving through the night sky near a region.",
    access: "Live dashboard and maps",
    url: "https://birdcast.info/migration-tools/migration-dashboard/",
  },
  {
    id: "journey-north",
    name: "Journey North",
    focus: "Seasonal migration observations",
    coverage: "North America",
    summary:
      "A long-running migration map for monarchs, hummingbirds, robins, loons, orioles, and other seasonal wildlife movements.",
    access: "Public migration maps",
    url: "https://maps.journeynorth.org/",
  },
] satisfies AnimalTrackerFeed["trackers"];

export function getAnimalTrackerCatalog(): AnimalTrackerFeed {
  return {
    trackers,
    fetchedAt: new Date().toISOString(),
    source: "official public wildlife tracker catalog",
  };
}

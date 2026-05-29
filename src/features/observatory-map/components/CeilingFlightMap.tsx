"use client";

import { useCallback, useState } from "react";
import { defaultRadiusNauticalMiles } from "../constants";
import { useAircraftFeed } from "../hooks/use-aircraft-feed";
import { useAnimalFeed } from "../hooks/use-animal-feed";
import { useBoatFeed } from "../hooks/use-boat-feed";
import { useBrowserLocation } from "../hooks/use-browser-location";
import { useSunState } from "../hooks/use-sun-state";
import { buildCombinedFeedState } from "../lib/feed-state";
import type { DisplayLayer, FeedState, LayerState } from "../types";
import { LocationPrompt } from "./LocationPrompt";
import { ObservatoryHud } from "./ObservatoryHud";
import { ObservatoryMapCanvas } from "./ObservatoryMapCanvas";

export function CeilingFlightMap() {
  const { location, requestLocation } = useBrowserLocation();
  const [radiusNauticalMiles, setRadiusNauticalMiles] = useState(
    defaultRadiusNauticalMiles,
  );
  const [layers, setLayers] = useState<LayerState>({
    aircraft: true,
    animals: true,
    boats: true,
  });
  const [mapRotationDegrees, setMapRotationDegrees] = useState(0);
  const { aircraft, feedState } = useAircraftFeed(
    location,
    radiusNauticalMiles,
    layers.aircraft,
  );
  const { animalObservations, animalFeedState } = useAnimalFeed(
    location,
    radiusNauticalMiles,
    layers.animals,
  );
  const { boats, boatFeedState } = useBoatFeed(
    location,
    radiusNauticalMiles,
    layers.boats,
  );
  const sunState = useSunState(location);

  const toggleLayer = useCallback((layer: DisplayLayer) => {
    setLayers((currentLayers) => ({
      ...currentLayers,
      [layer]: !currentLayers[layer],
    }));
  }, []);

  const selectedFeeds = [
    layers.aircraft ? feedState : null,
    layers.animals ? animalFeedState : null,
    layers.boats ? boatFeedState : null,
  ].filter(Boolean) as FeedState[];
  const statusFeed = buildCombinedFeedState(selectedFeeds);
  const theme = sunState?.phase ?? "night";

  return (
    <main className={`sky-shell sky-shell--${theme}`}>
      <div className="map-frame">
        {location.status === "ready" ? (
          <ObservatoryMapCanvas
            aircraft={aircraft}
            animalObservations={animalObservations}
            boats={boats}
            layers={layers}
            location={location}
            mapRotationDegrees={mapRotationDegrees}
            radiusNauticalMiles={radiusNauticalMiles}
          />
        ) : (
          <LocationPrompt status={location.status} onRetry={requestLocation} />
        )}
        <div className="atmosphere atmosphere--one" />
        <div className="atmosphere atmosphere--two" />
        <div className="scanline" />
      </div>

      <ObservatoryHud
        layers={layers}
        mapRotationDegrees={mapRotationDegrees}
        radiusNauticalMiles={radiusNauticalMiles}
        statusFeed={statusFeed}
        sunState={sunState}
        onLayerToggle={toggleLayer}
        onRadiusChange={setRadiusNauticalMiles}
        onRotationChange={setMapRotationDegrees}
      />
    </main>
  );
}

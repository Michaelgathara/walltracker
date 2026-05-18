"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnimalObservation, AnimalObservationFeed } from "@/types";
import { animalRefreshIntervalMs } from "../constants";
import type { FeedState, LocationState } from "../types";

export function useAnimalFeed(
  location: LocationState,
  radiusNauticalMiles: number,
) {
  const [animalObservations, setAnimalObservations] = useState<AnimalObservation[]>([]);
  const [animalFeedState, setAnimalFeedState] = useState<FeedState>({
    status: "idle",
    message: "Waiting for nearby animal observations.",
  });

  const fetchAnimals = useCallback(
    async (signal?: AbortSignal) => {
      if (location.status !== "ready") {
        return;
      }

      setAnimalFeedState({
        status: "loading",
        message: "Listening for nearby wildlife...",
      });

      const response = await fetch(
        `/api/animals?lat=${location.coordinates.latitude}&lon=${location.coordinates.longitude}&radius=${radiusNauticalMiles}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Animal observation feed unavailable");
      }

      const feed = (await response.json()) as AnimalObservationFeed;
      setAnimalObservations(feed.observations);
      setAnimalFeedState({
        status: "ready",
        message: `${feed.observations.length} nearby animal observations`,
        updatedAt: feed.fetchedAt,
      });
    },
    [location, radiusNauticalMiles],
  );

  useEffect(() => {
    if (location.status !== "ready") {
      return;
    }

    const controller = new AbortController();
    const loadAnimals = () => {
      fetchAnimals(controller.signal).catch(() => {
        if (!controller.signal.aborted) {
          setAnimalFeedState({
            status: "error",
            message: "Nearby animal observations are unavailable.",
          });
        }
      });
    };

    const firstLoad = window.setTimeout(loadAnimals, 0);
    const timer = window.setInterval(loadAnimals, animalRefreshIntervalMs);

    return () => {
      controller.abort();
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [fetchAnimals, location]);

  return { animalObservations, animalFeedState };
}

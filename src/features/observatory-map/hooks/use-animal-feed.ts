"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnimalObservation } from "@/types";
import { animalRefreshIntervalMs } from "../constants";
import { animalObservationFeedSchema } from "../lib/feed-schemas";
import type { FeedState, LocationState } from "../types";

const hiddenAnimalFeedState = {
  status: "idle",
  label: "Animals",
  count: 0,
  message: "Animals layer is hidden.",
} satisfies FeedState;

export function useAnimalFeed(
  location: LocationState,
  radiusNauticalMiles: number,
  isActive: boolean,
) {
  const [animalObservations, setAnimalObservations] = useState<AnimalObservation[]>([]);
  const [animalFeedState, setAnimalFeedState] = useState<FeedState>({
    status: "idle",
    label: "Animals",
    count: 0,
    message: "Waiting for nearby animal observations.",
  });

  const fetchAnimals = useCallback(
    async (signal?: AbortSignal) => {
      if (!isActive || location.status !== "ready") {
        return;
      }

      setAnimalFeedState({
        status: "loading",
        label: "Animals",
        count: 0,
        message: "Listening for nearby wildlife...",
      });

      const response = await fetch(
        `/api/animals?lat=${location.coordinates.latitude}&lon=${location.coordinates.longitude}&radius=${radiusNauticalMiles}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Animal observation feed unavailable");
      }

      const feed = animalObservationFeedSchema.parse(await response.json());
      setAnimalObservations(feed.observations);
      setAnimalFeedState({
        status: "ready",
        label: "Animals",
        count: feed.observations.length,
        message: `${feed.observations.length} nearby animal observations`,
        updatedAt: feed.fetchedAt,
      });
    },
    [isActive, location, radiusNauticalMiles],
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (location.status !== "ready") {
      return;
    }

    const controller = new AbortController();
    const loadAnimals = () => {
      fetchAnimals(controller.signal).catch(() => {
        if (!controller.signal.aborted) {
          setAnimalFeedState({
            status: "error",
            label: "Animals",
            count: 0,
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
  }, [fetchAnimals, isActive, location]);

  return {
    animalObservations,
    animalFeedState: isActive ? animalFeedState : hiddenAnimalFeedState,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Aircraft } from "@/types";
import { aircraftRefreshIntervalMs } from "../constants";
import { mergeAircraftTracks } from "../lib/aircraft-animation";
import { aircraftFeedSchema } from "../lib/feed-schemas";
import type { FeedState, LocationState } from "../types";

const hiddenAircraftFeedState = {
  status: "idle",
  label: "Aircraft",
  count: 0,
  message: "Aircraft layer is hidden.",
} satisfies FeedState;

export function useAircraftFeed(
  location: LocationState,
  radiusNauticalMiles: number,
  isActive: boolean,
) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [feedState, setFeedState] = useState<FeedState>({
    status: "idle",
    label: "Aircraft",
    count: 0,
    message: "Waiting for your sky position.",
  });

  const fetchAircraft = useCallback(
    async (signal?: AbortSignal) => {
      if (!isActive || location.status !== "ready") {
        return;
      }

      setFeedState({
        status: "loading",
        label: "Aircraft",
        count: 0,
        message: "Listening for aircraft...",
      });

      const response = await fetch(
        `/api/aircraft?lat=${location.coordinates.latitude}&lon=${location.coordinates.longitude}&radius=${radiusNauticalMiles}`,
        { signal },
      );

      if (!response.ok) {
        throw new Error("Aircraft feed unavailable");
      }

      const feed = aircraftFeedSchema.parse(await response.json());

      setAircraft((existingAircraft) =>
        mergeAircraftTracks(existingAircraft, feed.aircraft),
      );
      setFeedState({
        status: "ready",
        label: "Aircraft",
        count: feed.aircraft.length,
        message: `${feed.aircraft.length} aircraft within ${radiusNauticalMiles} NM`,
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
    const loadAircraft = () => {
      fetchAircraft(controller.signal).catch(() => {
        if (!controller.signal.aborted) {
          setFeedState({
            status: "error",
            label: "Aircraft",
            count: 0,
            message: "The aircraft feed is quiet or unavailable.",
          });
        }
      });
    };

    const firstLoad = window.setTimeout(loadAircraft, 0);
    const timer = window.setInterval(loadAircraft, aircraftRefreshIntervalMs);

    return () => {
      controller.abort();
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [fetchAircraft, isActive, location]);

  return { aircraft, feedState: isActive ? feedState : hiddenAircraftFeedState };
}

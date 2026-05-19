"use client";

import { useCallback, useEffect, useState } from "react";
import type { Boat, BoatFeed } from "@/types";
import { boatRefreshIntervalMs } from "../constants";
import type { FeedState, LocationState } from "../types";

export function useBoatFeed(location: LocationState, radiusNauticalMiles: number) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [boatFeedState, setBoatFeedState] = useState<FeedState>({
    status: "idle",
    label: "Boats",
    count: 0,
    message: "Boat tracking is off.",
  });

  const fetchBoats = useCallback(
    async (signal?: AbortSignal) => {
      if (location.status !== "ready") {
        return;
      }

      setBoatFeedState({
        status: "loading",
        label: "Boats",
        count: 0,
        message: "Listening for nearby vessels...",
      });

      const response = await fetch(
        `/api/boats?lat=${location.coordinates.latitude}&lon=${location.coordinates.longitude}&radius=${radiusNauticalMiles}`,
        { signal },
      );

      if (response.status === 503) {
        setBoats([]);
        setBoatFeedState({
          status: "idle",
          label: "Boats",
          count: 0,
          message: "Set AISSTREAM_API_KEY to enable boats.",
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Boat feed unavailable");
      }

      const feed = (await response.json()) as BoatFeed;
      setBoats(feed.boats);
      setBoatFeedState({
        status: "ready",
        label: "Boats",
        count: feed.boats.length,
        message: `${feed.boats.length} vessels within ${radiusNauticalMiles} NM`,
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
    const loadBoats = () => {
      fetchBoats(controller.signal).catch(() => {
        if (!controller.signal.aborted) {
          setBoatFeedState({
            status: "error",
            label: "Boats",
            count: 0,
            message: "Nearby vessel data is unavailable.",
          });
        }
      });
    };

    const firstLoad = window.setTimeout(loadBoats, 0);
    const timer = window.setInterval(loadBoats, boatRefreshIntervalMs);

    return () => {
      controller.abort();
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [fetchBoats, location]);

  return { boats, boatFeedState };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Boat, BoatFeed } from "@/types";
import { boatRefreshIntervalMs } from "../constants";
import { boatFeedSchema } from "../lib/feed-schemas";
import type { FeedState, LocationState } from "../types";

const hiddenBoatFeedState = {
  status: "idle",
  label: "Boats",
  count: 0,
  message: "Boats layer is hidden.",
} satisfies FeedState;

export function useBoatFeed(
  location: LocationState,
  radiusNauticalMiles: number,
  isActive: boolean,
) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [boatFeedState, setBoatFeedState] = useState<FeedState>({
    status: "idle",
    label: "Boats",
    count: 0,
    message: "Waiting for your location.",
  });

  const fetchBoats = useCallback(
    async (signal?: AbortSignal) => {
      if (!isActive || location.status !== "ready") {
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

      const feed = boatFeedSchema.parse(await response.json()) satisfies BoatFeed;
      setBoats(feed.boats);
      setBoatFeedState({
        status: "ready",
        label: "Boats",
        count: feed.boats.length,
        message: buildBoatStatusMessage(feed, radiusNauticalMiles),
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
  }, [fetchBoats, isActive, location]);

  return { boats, boatFeedState: isActive ? boatFeedState : hiddenBoatFeedState };
}

function buildBoatStatusMessage(feed: BoatFeed, radiusNauticalMiles: number) {
  if (feed.freshness === "cached") {
    const ageMinutes = Math.max(1, Math.round((feed.cacheAgeSeconds ?? 0) / 60));
    return `${feed.boats.length} recently seen vessels within ${radiusNauticalMiles} NM (${ageMinutes} min cache)`;
  }

  if (feed.freshness === "live" && feed.boats.length > 0) {
    return `${feed.boats.length} live vessels within ${radiusNauticalMiles} NM`;
  }

  return "No live AIS vessel updates were received for this area.";
}

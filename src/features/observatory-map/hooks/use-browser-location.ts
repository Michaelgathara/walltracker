"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "@/types";
import { parseCoordinates } from "@/utils/geo";
import type { LocationState } from "../types";

export function useBrowserLocation() {
  const [location, setLocation] = useState<LocationState>({
    status: "idle",
    coordinates: null,
  });

  const requestLocation = useCallback(() => {
    const fallbackCoordinates = getFallbackCoordinates();

    if (!navigator.geolocation) {
      if (fallbackCoordinates) {
        setLocation({
          status: "ready",
          coordinates: fallbackCoordinates,
          accuracyMeters: null,
          source: "fallback",
        });
        return;
      }

      setLocation({ status: "unsupported", coordinates: null });
      return;
    }

    setLocation({ status: "loading", coordinates: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: "ready",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy,
          source: "geolocation",
        });
      },
      () => {
        if (fallbackCoordinates) {
          setLocation({
            status: "ready",
            coordinates: fallbackCoordinates,
            accuracyMeters: null,
            source: "fallback",
          });
          return;
        }

        setLocation({ status: "denied", coordinates: null });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(requestLocation, 0);

    return () => window.clearTimeout(timer);
  }, [requestLocation]);

  return { location, requestLocation };
}

function getFallbackCoordinates(): Coordinates | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  return (
    parseCoordinates(params.get("center")) ??
    parseCoordinates(process.env.NEXT_PUBLIC_STARTING_CENTER_COORDS)
  );
}

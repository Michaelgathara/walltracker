"use client";

import { useEffect, useState } from "react";
import type { SunState } from "@/types";
import { getSunState } from "@/utils/sun";
import type { LocationState } from "../types";

export function useSunState(location: LocationState) {
  const [sunState, setSunState] = useState<SunState | null>(null);

  useEffect(() => {
    if (location.status !== "ready") {
      return;
    }

    const updateSun = () =>
      setSunState(getSunState(location.coordinates, new Date()));

    const firstUpdate = window.setTimeout(updateSun, 0);
    const timer = window.setInterval(updateSun, 60_000);

    return () => {
      window.clearTimeout(firstUpdate);
      window.clearInterval(timer);
    };
  }, [location]);

  return sunState;
}

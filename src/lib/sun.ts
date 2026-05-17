import SunCalc from "suncalc";
import type { Coordinates } from "./geo";

export type SunPhase = "dawn" | "day" | "dusk" | "night";

export type SunState = {
  phase: SunPhase;
  altitudeDegrees: number;
  azimuthDegrees: number;
  label: string;
};

export function getSunState(coordinates: Coordinates, date = new Date()): SunState {
  const position = SunCalc.getPosition(date, coordinates.latitude, coordinates.longitude);
  const altitudeDegrees = (position.altitude * 180) / Math.PI;
  const azimuthDegrees = ((position.azimuth * 180) / Math.PI + 180 + 360) % 360;

  if (altitudeDegrees > 8) {
    return { phase: "day", altitudeDegrees, azimuthDegrees, label: "Sunlit" };
  }

  if (altitudeDegrees > -3) {
    const isBeforeSolarNoon =
      date.getTime() <
      SunCalc.getTimes(date, coordinates.latitude, coordinates.longitude).solarNoon.getTime();

    return {
      phase: isBeforeSolarNoon ? "dawn" : "dusk",
      altitudeDegrees,
      azimuthDegrees,
      label: isBeforeSolarNoon ? "Dawn" : "Dusk",
    };
  }

  return { phase: "night", altitudeDegrees, azimuthDegrees, label: "Night" };
}

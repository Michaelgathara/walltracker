export type SunPhase = "dawn" | "day" | "dusk" | "night";

export type SunState = {
  phase: SunPhase;
  altitudeDegrees: number;
  azimuthDegrees: number;
  label: string;
};

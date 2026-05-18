export function zoomForRadius(radiusNauticalMiles: number) {
  if (radiusNauticalMiles <= 15) return 10;
  if (radiusNauticalMiles <= 35) return 9;
  if (radiusNauticalMiles <= 75) return 8;
  if (radiusNauticalMiles <= 140) return 7;
  return 6;
}

export function initialZoomForRadius(radiusNauticalMiles: number) {
  return zoomForRadius(radiusNauticalMiles) + 1;
}

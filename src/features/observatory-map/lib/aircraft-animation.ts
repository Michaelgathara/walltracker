import type { Aircraft } from "@/types";

export function mergeAircraftTracks(previous: Aircraft[], next: Aircraft[]) {
  const previousById = new Map(previous.map((aircraft) => [aircraft.id, aircraft]));

  return next.map((aircraft) => {
    const previousAircraft = previousById.get(aircraft.id);
    const track = [
      ...aircraft.track,
      ...(previousAircraft?.track ?? []),
    ].slice(0, 12);

    return { ...aircraft, track };
  });
}

export function interpolateAircraftCollection(
  currentAircraft: Aircraft[],
  targetAircraft: Aircraft[],
  progress: number,
) {
  const currentAircraftById = new Map(
    currentAircraft.map((trackedAircraft) => [trackedAircraft.id, trackedAircraft]),
  );

  return targetAircraft.map((trackedAircraft) => {
    const currentSnapshot = currentAircraftById.get(trackedAircraft.id);

    if (!currentSnapshot) {
      return trackedAircraft;
    }

    const latitude = interpolateNumber(
      currentSnapshot.latitude,
      trackedAircraft.latitude,
      progress,
    );
    const longitude = interpolateNumber(
      currentSnapshot.longitude,
      trackedAircraft.longitude,
      progress,
    );

    return {
      ...trackedAircraft,
      latitude,
      longitude,
      altitudeFeet: interpolateOptionalNumber(
        currentSnapshot.altitudeFeet,
        trackedAircraft.altitudeFeet,
        progress,
      ),
      groundSpeedKnots: interpolateOptionalNumber(
        currentSnapshot.groundSpeedKnots,
        trackedAircraft.groundSpeedKnots,
        progress,
      ),
      headingDegrees: interpolateHeading(
        currentSnapshot.headingDegrees,
        trackedAircraft.headingDegrees,
        progress,
      ),
      distanceNauticalMiles: interpolateOptionalNumber(
        currentSnapshot.distanceNauticalMiles,
        trackedAircraft.distanceNauticalMiles,
        progress,
      ),
      track: buildAnimatedTrack(trackedAircraft, latitude, longitude),
    };
  });
}

export function easeInOutCubic(progress: number) {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function buildAnimatedTrack(
  aircraft: Aircraft,
  latitude: number,
  longitude: number,
) {
  if (aircraft.track.length === 0) {
    return aircraft.track;
  }

  return [
    {
      latitude,
      longitude,
      seenAt: aircraft.track[0]?.seenAt ?? new Date().toISOString(),
    },
    ...aircraft.track.slice(1),
  ];
}

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateOptionalNumber(
  start: number | null,
  end: number | null,
  progress: number,
) {
  if (start === null || end === null) {
    return end;
  }

  return interpolateNumber(start, end, progress);
}

function interpolateHeading(
  start: number | null,
  end: number | null,
  progress: number,
) {
  if (start === null || end === null) {
    return end;
  }

  const delta = ((((end - start) % 360) + 540) % 360) - 180;
  return (start + delta * progress + 360) % 360;
}

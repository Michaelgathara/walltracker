import type { Boat, BoatFeed } from "@/types";
import { buildBoundingBox, withinRadiusMiles } from "@/utils/geo-bounds";
import { distanceNauticalMiles } from "@/utils/geo";

const aisStreamUrl = "wss://stream.aisstream.io/v0/stream";
const snapshotDurationMs = 3_500;
const connectTimeoutMs = 4_000;
const maxBoatsPerSnapshot = 40;

type FetchNearbyBoatsRequest = {
  latitude: number;
  longitude: number;
  radiusNauticalMiles: number;
  apiKey: string;
};

type MutableBoat = {
  id: string;
  mmsi: number;
  imo: number | null;
  name: string | null;
  callsign: string | null;
  latitude: number | null;
  longitude: number | null;
  courseDegrees: number | null;
  speedKnots: number | null;
  headingDegrees: number | null;
  vesselTypeCode: number | null;
  destination: string | null;
  draughtMeters: number | null;
  reportedAt: string | null;
};

type AISStreamEvent = {
  MessageType?: string;
  Message?: Record<string, unknown>;
  MetaData?: {
    MMSI?: number;
    ShipName?: string;
    latitude?: number;
    longitude?: number;
    time_utc?: string;
  };
  error?: string;
};

export async function fetchNearbyBoatsFromAISStream({
  latitude,
  longitude,
  radiusNauticalMiles,
  apiKey,
}: FetchNearbyBoatsRequest): Promise<BoatFeed> {
  const radiusMiles = radiusNauticalMiles * 1.15078;
  const bounds = buildBoundingBox(latitude, longitude, radiusMiles);
  const boatsByMmsi = new Map<number, MutableBoat>();

  const socket = new WebSocket(aisStreamUrl);

  await awaitSocketOpen(socket);

  const snapshotPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, snapshotDurationMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };

    const handleMessage = (event: MessageEvent) => {
      void parseAISStreamPayload(event.data)
        .then((payload) => {
          if (payload.error) {
            cleanup();
            reject(new Error(payload.error));
            return;
          }

          ingestAISStreamEvent(boatsByMmsi, payload);
        })
        .catch(() => {
          // Ignore malformed stream events and keep collecting the snapshot.
        });
    };

    const handleError = () => {
      cleanup();
      reject(new Error("AISStream websocket error"));
    };

    const handleClose = (event: CloseEvent) => {
      cleanup();

      if (event.code === 1000) {
        resolve();
        return;
      }

      reject(new Error("AISStream connection closed before snapshot completed"));
    };

    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);
  });

  socket.send(
    JSON.stringify({
      APIKey: apiKey,
      // AISStream expects each corner as [latitude, longitude].
      BoundingBoxes: [[[bounds.swlat, bounds.swlng], [bounds.nelat, bounds.nelng]]],
      FilterMessageTypes: [
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
        "ShipStaticData",
        "StaticDataReport",
      ],
    }),
  );

  try {
    await snapshotPromise;
  } finally {
    closeSocket(socket);
  }

  const origin = { latitude, longitude };
  const boats = Array.from(boatsByMmsi.values())
    .filter(
      (boat): boat is MutableBoat & { latitude: number; longitude: number } =>
        boat.latitude !== null && boat.longitude !== null,
    )
    .filter((boat) => withinRadiusMiles(latitude, longitude, boat.latitude, boat.longitude, radiusMiles))
    .map(
      (boat): Boat => ({
        id: boat.id,
        mmsi: boat.mmsi,
        imo: boat.imo,
        name: boat.name,
        callsign: boat.callsign,
        latitude: boat.latitude,
        longitude: boat.longitude,
        courseDegrees: boat.courseDegrees,
        speedKnots: boat.speedKnots,
        headingDegrees: boat.headingDegrees,
        vesselTypeCode: boat.vesselTypeCode,
        destination: boat.destination,
        draughtMeters: boat.draughtMeters,
        distanceNauticalMiles: distanceNauticalMiles(origin, {
          latitude: boat.latitude,
          longitude: boat.longitude,
        }),
        reportedAt: boat.reportedAt,
        source: "AISStream",
      }),
    )
    .sort((left, right) => (left.distanceNauticalMiles ?? 999) - (right.distanceNauticalMiles ?? 999))
    .slice(0, maxBoatsPerSnapshot);

  return {
    boats,
    fetchedAt: new Date().toISOString(),
    receiver: {
      latitude,
      longitude,
      radiusNauticalMiles,
    },
    source: "AISStream",
    freshness: boats.length > 0 ? "live" : "empty",
    cacheAgeSeconds: null,
  };
}

async function parseAISStreamPayload(data: MessageEvent["data"]) {
  if (typeof data === "string") {
    return JSON.parse(data) as AISStreamEvent;
  }

  if (data instanceof Blob) {
    return JSON.parse(await data.text()) as AISStreamEvent;
  }

  if (data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder().decode(data)) as AISStreamEvent;
  }

  throw new Error("Unsupported AISStream websocket payload");
}

function awaitSocketOpen(socket: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out connecting to AISStream"));
    }, connectTimeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };

    const handleOpen = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Failed to connect to AISStream"));
    };

    const handleClose = () => {
      cleanup();
      reject(new Error("AISStream closed before the subscription started"));
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);
  });
}

function ingestAISStreamEvent(
  boatsByMmsi: Map<number, MutableBoat>,
  event: AISStreamEvent,
) {
  const messageType = event.MessageType;

  if (!messageType || !event.Message || !(messageType in event.Message)) {
    return;
  }

  const body = event.Message[messageType];

  if (!isRecord(body)) {
    return;
  }

  const mmsi = asNumber(body.UserID) ?? event.MetaData?.MMSI;

  if (!mmsi) {
    return;
  }

  const boat = getOrCreateBoat(boatsByMmsi, mmsi);

  boat.name ??= normalizeString(event.MetaData?.ShipName);
  boat.reportedAt ??= normalizeString(event.MetaData?.time_utc);
  boat.latitude ??= asNumber(event.MetaData?.latitude);
  boat.longitude ??= asNumber(event.MetaData?.longitude);

  switch (messageType) {
    case "PositionReport":
    case "StandardClassBPositionReport":
    case "ExtendedClassBPositionReport": {
      boat.latitude = asNumber(body.Latitude) ?? boat.latitude;
      boat.longitude = asNumber(body.Longitude) ?? boat.longitude;
      boat.courseDegrees = normalizeHeading(asNumber(body.Cog)) ?? boat.courseDegrees;
      boat.speedKnots = asNumber(body.Sog) ?? boat.speedKnots;
      boat.headingDegrees = normalizeHeading(asNumber(body.TrueHeading)) ?? boat.headingDegrees;
      break;
    }
    case "ShipStaticData": {
      boat.imo = normalizeImo(asNumber(body.ImoNumber)) ?? boat.imo;
      boat.name = normalizeString(body.Name) ?? boat.name;
      boat.callsign = normalizeString(body.CallSign) ?? boat.callsign;
      boat.vesselTypeCode = asNumber(body.Type) ?? boat.vesselTypeCode;
      boat.destination = normalizeString(body.Destination) ?? boat.destination;
      boat.draughtMeters = asNumber(body.MaximumStaticDraught) ?? boat.draughtMeters;
      break;
    }
    case "StaticDataReport": {
      const reportA = isRecord(body.ReportA) ? body.ReportA : null;
      const reportB = isRecord(body.ReportB) ? body.ReportB : null;

      boat.name = normalizeString(reportA?.Name) ?? boat.name;
      boat.callsign = normalizeString(reportB?.CallSign) ?? boat.callsign;
      boat.vesselTypeCode = asNumber(reportB?.ShipType) ?? boat.vesselTypeCode;
      break;
    }
    default:
      break;
  }
}

function getOrCreateBoat(
  boatsByMmsi: Map<number, MutableBoat>,
  mmsi: number,
) {
  const existingBoat = boatsByMmsi.get(mmsi);

  if (existingBoat) {
    return existingBoat;
  }

  const nextBoat: MutableBoat = {
    id: mmsi.toString(),
    mmsi,
    imo: null,
    name: null,
    callsign: null,
    latitude: null,
    longitude: null,
    courseDegrees: null,
    speedKnots: null,
    headingDegrees: null,
    vesselTypeCode: null,
    destination: null,
    draughtMeters: null,
    reportedAt: null,
  };

  boatsByMmsi.set(mmsi, nextBoat);
  return nextBoat;
}

function closeSocket(socket: WebSocket) {
  if (
    socket.readyState === WebSocket.OPEN ||
    socket.readyState === WebSocket.CONNECTING
  ) {
    socket.close();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replaceAll("@", " ").trim();
  return normalized ? normalized : null;
}

function normalizeImo(value: number | null) {
  return value && value > 0 ? value : null;
}

function normalizeHeading(value: number | null) {
  if (value === null || value >= 360 || value < 0) {
    return null;
  }

  return value;
}

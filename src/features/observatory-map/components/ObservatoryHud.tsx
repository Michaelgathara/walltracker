import type { SunState } from "@/types";
import type { DisplayLayer, FeedState, LayerState } from "../types";

type ObservatoryHudProps = {
  layers: LayerState;
  mapRotationDegrees: number;
  radiusNauticalMiles: number;
  statusFeed: FeedState;
  sunState: SunState | null;
  onLayerToggle: (layer: DisplayLayer) => void;
  onRadiusChange: (radiusNauticalMiles: number) => void;
  onRotationChange: (degrees: number) => void;
};

const pageTitle = "Sky traffic and wildlife";
const lede =
  "A combined observatory for nearby aircraft, wildlife, and vessel activity around you.";

export function ObservatoryHud({
  layers,
  mapRotationDegrees,
  radiusNauticalMiles,
  statusFeed,
  sunState,
  onLayerToggle,
  onRadiusChange,
  onRotationChange,
}: ObservatoryHudProps) {
  return (
    <>
      <section className="hud hud--primary" aria-label="Tracker controls">
        <p className="eyebrow">Walltracker / Aircraft</p>
        <h1>{pageTitle}</h1>
        <p className="lede">{lede}</p>

        <div className="mode-switch" role="group" aria-label="Visible layers">
          <button
            type="button"
            className={`mode-pill${layers.aircraft ? " mode-pill--active" : ""}`}
            onClick={() => onLayerToggle("aircraft")}
          >
            Planes
          </button>
          <button
            type="button"
            className={`mode-pill${layers.animals ? " mode-pill--active" : ""}`}
            onClick={() => onLayerToggle("animals")}
          >
            Animals
          </button>
          <button
            type="button"
            className={`mode-pill${layers.boats ? " mode-pill--active" : ""}`}
            onClick={() => onLayerToggle("boats")}
          >
            Boats
          </button>
        </div>

        <div className="hud-section">
          <div className="control-group">
            <label htmlFor="radius">Range</label>
            <div className="range-row">
              <input
                id="radius"
                type="range"
                min="5"
                max="250"
                step="5"
                value={radiusNauticalMiles}
                onChange={(event) => onRadiusChange(Number(event.target.value))}
              />
              <span className="range-value">{radiusNauticalMiles} NM</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="rotation">Bearing</label>
            <div className="range-row">
              <input
                id="rotation"
                type="range"
                min="-180"
                max="180"
                step="5"
                value={mapRotationDegrees}
                onChange={(event) => onRotationChange(Number(event.target.value))}
              />
              <span className="range-value">{mapRotationDegrees} deg</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hud hud--status" aria-label="Sky status">
        <div className="status-block">
          <p className="eyebrow">Light</p>
          <strong>{sunState?.label ?? "Locating"}</strong>
          {sunState ? (
            <span className="status-meta">
              Sun {sunState.altitudeDegrees.toFixed(1)} deg /
              azimuth {sunState.azimuthDegrees.toFixed(0)} deg
            </span>
          ) : null}
        </div>
        <div className="status-block">
          <p className="eyebrow">Feed</p>
          <strong style={{ whiteSpace: "pre-line" }}>{statusFeed.message}</strong>
          {statusFeed.status === "ready" ? (
            <span className="status-meta">
              Updated {new Date(statusFeed.updatedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </section>
    </>
  );
}

import type { LocationState } from "../types";

type LocationPromptProps = {
  status: LocationState["status"];
  onRetry: () => void;
};

export function LocationPrompt({ status, onRetry }: LocationPromptProps) {
  const message =
    status === "denied"
      ? "Location permission is needed to tune the local field."
      : status === "unsupported"
        ? "This browser does not support geolocation."
        : "Finding your local field...";

  return (
    <div className="location-prompt">
      <p className="eyebrow">Location</p>
      <h2>{message}</h2>
      <button type="button" onClick={onRetry}>
        Use browser location
      </button>
    </div>
  );
}

import type { Location } from "react-router";
import type { LocationStateOverlay } from "../providers/engine/useLocationStateTransactions";

/** The location with the values on their way laid over its state */
export const applyOverlay = (
  location: Location,
  overlay: LocationStateOverlay,
): Location => {
  if (!overlay.size) return location;

  return {
    ...location,
    state: { ...location.state, ...Object.fromEntries(overlay) },
  };
};

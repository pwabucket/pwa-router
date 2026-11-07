import type { Location } from "react-router";
import type { LocationStateOverlay } from "./LocationStateTransactions";

/** The location with the values on their way laid over its state */
export const applyOverlay = (
  location: Location,
  overlay: LocationStateOverlay,
): Location => {
  /* Nothing on its way: the location as it is */
  if (!overlay.size) return location;

  /* The location with the overlay values over its state */
  return {
    ...location,
    state: { ...location.state, ...Object.fromEntries(overlay) },
  };
};

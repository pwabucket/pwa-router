import type { Location } from "react-router";
import { createContext } from "react";

interface PWARoutingContextValue {
  resolvedLocation: Location;
  /** The engine is correcting the history; navigations are ignored meanwhile */
  isCorrecting: boolean;
  /** The reader sits in a hidden tab; its navigations are ignored */
  isInactive: boolean;
}

const PWARoutingContext = createContext<PWARoutingContextValue | null>(null);

export { PWARoutingContext };
export type { PWARoutingContextValue };

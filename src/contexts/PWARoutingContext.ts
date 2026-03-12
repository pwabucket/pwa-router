import type { Location } from "react-router";
import { createContext } from "react";

interface PWARoutingContextValue {
  resolvedLocation: Location;
}

const PWARoutingContext = createContext<PWARoutingContextValue | null>(null);

export { PWARoutingContext };
export type { PWARoutingContextValue };

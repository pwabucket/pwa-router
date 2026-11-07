import type { Location } from "react-router";
import { createContext } from "react";

/** The provider's value */
interface PWARoutingContextValue {
  /** The location screens show */
  resolvedLocation: Location;
  /** The provider is correcting the history; useNavigate ignores calls and Navigate waits meanwhile */
  isCorrecting: boolean;
}

/** The context of the provider's value */
const PWARoutingContext = createContext<PWARoutingContextValue | null>(null);

export { PWARoutingContext };
export type { PWARoutingContextValue };

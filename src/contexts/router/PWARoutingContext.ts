import type { Location } from "react-router";
import { createContext } from "react";

/** The engine's view of the router, as screens read it */
interface PWARoutingContextValue {
  /** The location to render: the one the engine is settling on, with values on their way */
  resolvedLocation: Location;
  /** The engine is correcting the history; navigations are ignored meanwhile */
  isCorrecting: boolean;
  /** The reader sits in a tab that isn't active; its navigations are ignored */
  isInactive: boolean;
}

/** The engine's view of the nearest router, read whole; every TabView gives its tab's own */
const PWARoutingContext = createContext<PWARoutingContextValue | null>(null);

export { PWARoutingContext };
export type { PWARoutingContextValue };

import { useContext } from "react";
import { PWARoutingContext } from "../../contexts/router/PWARoutingContext";

/** A hook for the engine's view of the router: the location to render and its status; re-renders on every change */
const usePWARouting = () => useContext(PWARoutingContext)!;

export { usePWARouting };

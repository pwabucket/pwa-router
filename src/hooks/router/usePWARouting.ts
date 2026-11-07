import { PWARoutingContext } from "../../contexts/router/PWARoutingContext";
import { useContext } from "react";

/** A hook for the engine's view of the router: the location to render and its status */
const usePWARouting = () => useContext(PWARoutingContext)!;

export { usePWARouting };

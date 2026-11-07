import { PWARoutingContext } from "../../contexts/router/PWARoutingContext";
import { useContext } from "react";

/** A hook for the provider's value: the resolved location and whether a correction runs */
const usePWARouting = () => useContext(PWARoutingContext)!;

export { usePWARouting };

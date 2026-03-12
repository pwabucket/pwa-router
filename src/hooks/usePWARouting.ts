import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { useContext } from "react";

const usePWARouting = () => useContext(PWARoutingContext)!;

export { usePWARouting };

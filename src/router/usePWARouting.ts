import { PWARoutingContext } from "./PWARoutingContext";
import { useContext } from "react";

const usePWARouting = () => useContext(PWARoutingContext)!;

export { usePWARouting };

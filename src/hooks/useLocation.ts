import { usePWARouting } from "./usePWARouting";

/** Location resolved by the engine (pass-through for react-router's useLocation) */
const useLocation = () => usePWARouting().resolvedLocation;

export { useLocation };

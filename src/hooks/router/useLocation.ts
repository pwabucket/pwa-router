import { usePWARouting } from "./usePWARouting";

/** A hook for the location screens show (React Router's useLocation, resolved by the provider) */
const useLocation = () => usePWARouting().resolvedLocation;

export { useLocation };

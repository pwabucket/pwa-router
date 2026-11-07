import { usePWARouting } from "./usePWARouting";

/** A hook for the location resolved by the engine, in place of React Router's useLocation */
const useLocation = () => usePWARouting().resolvedLocation;

export { useLocation };

import { readLocationIndex } from "../utils/location";
import { usePWARouting } from "./usePWARouting";

/** History index stamped by useLocationIndexUpdater for the given key */
const useLocationIndex = (key?: string) => {
  const { resolvedLocation: location } = usePWARouting();

  return readLocationIndex(location.state, key);
};

export { useLocationIndex };

import { readLocationIndex } from "../utils/location";
import { useLocation } from "./useLocation";

/** History index stamped by useLocationIndexUpdater for the given key */
const useLocationIndex = (key?: string) => {
  const location = useLocation();

  return readLocationIndex(location.state, key);
};

export { useLocationIndex };

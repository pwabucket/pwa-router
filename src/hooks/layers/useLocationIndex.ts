import { readLocationIndex } from "../../lib/router/location";
import { useLocation } from "../router/useLocation";

/** A hook for the history length stamped by useLocationIndexUpdater under an index key */
const useLocationIndex = (key?: string) => {
  const location = useLocation();

  return readLocationIndex(location.state, key);
};

export { useLocationIndex };

import { ROUTER_INDEX_PREFIX } from "../constants";
import { usePWARouting } from "./usePWARouting";

const useLocationIndex = (key?: string) => {
  const { resolvedLocation: location } = usePWARouting();
  const stateKey = ROUTER_INDEX_PREFIX + key;
  const index: number | undefined = location.state?.[stateKey];

  return index;
};

export { useLocationIndex };

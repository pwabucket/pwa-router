import { usePWARouting } from "./usePWARouting";

const useLocationIndex = (key?: string) => {
  const { resolvedLocation: location } = usePWARouting();
  const stateKey = `__router_index_${key}`;
  const index: number | undefined = location.state?.[stateKey];

  return index;
};

export { useLocationIndex };

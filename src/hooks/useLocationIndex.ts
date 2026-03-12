import { useLocation } from "react-router";

const useLocationIndex = (key?: string) => {
  const location = useLocation();
  const stateKey = `__router_index_${key}`;
  const index: number | undefined = location.state?.[stateKey];

  return index;
};

export { useLocationIndex };

import { useCallback, useMemo } from "react";
import { type NavigateOptions } from "react-router";
import { useLocationState } from "./useLocationState";
import { useLocationIndex } from "./useLocationIndex";

type UseLocationToggleReturn = [
  boolean,
  (status: boolean, options?: NavigateOptions) => void,
];

const useLocationToggle = (
  key: string,
  indexKey?: string,
): UseLocationToggleReturn => {
  /* Get location index from state */
  const index = useLocationIndex(indexKey);

  /* Get toggle state from location state */
  const [show, setShow] = useLocationState(key, false);

  /** Toggle Location */
  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) {
        setShow(true, options);
      } else {
        setShow(undefined, options, index);
      }
    },
    [index, setShow],
  );

  return useMemo(() => [show, toggle], [show, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

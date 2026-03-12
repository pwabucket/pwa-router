import { useCallback, useMemo } from "react";
import { type NavigateOptions } from "react-router";
import { useLocationState } from "./useLocationState";

type UseLocationToggleReturn = [
  boolean,
  (status: boolean, options?: NavigateOptions) => void,
];

const useLocationToggle = (
  key: string,
  indexKey?: string,
): UseLocationToggleReturn => {
  const [show, setShow] = useLocationState(key, false, indexKey);

  /** Toggle Location */
  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) {
        setShow(true, options);
      } else {
        setShow(undefined, options);
      }
    },
    [setShow],
  );

  return useMemo(() => [show, toggle], [show, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

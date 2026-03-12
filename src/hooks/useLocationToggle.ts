import { useCallback, useMemo, useState } from "react";
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
  lazyClose = false,
): UseLocationToggleReturn => {
  /* Get location index from state */
  const index = useLocationIndex(indexKey);

  /* State to handle lazy close */
  const [isClosing, setIsClosing] = useState(false);

  /* Get toggle state from location state */
  const [show, setShow] = useLocationState(key, false);

  /** Toggle Location */
  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) {
        setShow(true, options);
      } else if (lazyClose) {
        setIsClosing(true);
      } else {
        setShow(undefined, options, index);
      }
    },
    [index, lazyClose, setShow],
  );

  /* Handle lazy close */
  if (isClosing) {
    if (show) {
      setShow(undefined);
    } else {
      setIsClosing(false);
    }
  }

  return useMemo(() => [show, toggle], [show, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

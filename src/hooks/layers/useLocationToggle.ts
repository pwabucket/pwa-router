import { useCallback, useMemo, useRef } from "react";
import { type NavigateOptions } from "react-router";
import {
  useLocationState,
  type UseLocationStateOptions,
} from "./useLocationState";
import { useLocationIndex } from "./useLocationIndex";

/** A toggle's status and its setter */
type UseLocationToggleReturn = [
  boolean,
  (status: boolean, options?: NavigateOptions) => void,
];

/** A hook for a boolean layer (e.g. a dialog); closing returns to before the stamp of `indexKey` */
const useLocationToggle = (
  key: string,
  indexKey?: string,
  options?: UseLocationStateOptions,
): UseLocationToggleReturn => {
  /* The stamp to close back to, and the value */
  const index = useLocationIndex(indexKey);
  const [isOpen, setOpen] = useLocationState(key, false, {
    ...options,
    indexKey,
  });

  /* The latest stamp, read when closing, so the setter stays stable */
  const indexRef = useRef(index);

  // oxlint-disable-next-line react/refs
  indexRef.current = index;

  /* Open sets true; close clears the value, back to the stamp */
  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) setOpen(true, options);
      else setOpen(undefined, options, indexRef.current);
    },
    [setOpen],
  );

  /* The status and its setter */
  return useMemo(() => [isOpen, toggle], [isOpen, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

import { useCallback, useMemo } from "react";
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

  /* Open sets true; close clears the value, back to the stamp */
  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) setOpen(true, options);
      else setOpen(undefined, options, index);
    },
    [index, setOpen],
  );

  /* The status and its setter */
  return useMemo(() => [isOpen, toggle], [isOpen, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

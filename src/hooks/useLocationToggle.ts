import { useCallback, useMemo } from "react";
import { type NavigateOptions } from "react-router";
import {
  useLocationState,
  type UseLocationStateOptions,
} from "./useLocationState";
import { useLocationIndex } from "./useLocationIndex";

type UseLocationToggleReturn = [
  boolean,
  (status: boolean, options?: NavigateOptions) => void,
];

/** Boolean location state (e.g dialogs); closing returns to the index */
const useLocationToggle = (
  key: string,
  indexKey?: string,
  options?: UseLocationStateOptions,
): UseLocationToggleReturn => {
  const index = useLocationIndex(indexKey);
  const [isOpen, setOpen] = useLocationState(key, false, {
    ...options,
    indexKey,
  });

  const toggle = useCallback(
    (status: boolean, options?: NavigateOptions) => {
      if (status) setOpen(true, options);
      else setOpen(undefined, options, index);
    },
    [index, setOpen],
  );

  return useMemo(() => [isOpen, toggle], [isOpen, toggle]);
};

export { useLocationToggle };
export type { UseLocationToggleReturn };

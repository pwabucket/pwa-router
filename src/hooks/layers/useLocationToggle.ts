import { useCallback, useMemo } from "react";
import { useLocationState } from "./useLocationState";
import {
  useSetLocationState,
  type UseLocationStateOptions,
} from "./useSetLocationState";
import type { SetLocationStateOptions } from "./useSetLocationState";

/** Setter of a location toggle */
type SetLocationToggle = (
  status: boolean,
  options?: SetLocationStateOptions,
) => void;

/** A toggle's status and its setter */
type UseLocationToggleReturn = [boolean, SetLocationToggle];

/** A hook for setting a location toggle without reading it */
const useSetLocationToggle = (
  key: string,
  options?: UseLocationStateOptions,
): SetLocationToggle => {
  /* The setter of the toggle's value */
  const setOpen = useSetLocationState<boolean>(key, options);

  /* Open sets true; close clears the value, closing what was opened on top */
  return useCallback<SetLocationToggle>(
    (status, options) => setOpen(status ? true : undefined, options),
    [setOpen],
  );
};

/** A hook for a boolean layer (e.g. a dialog); closing returns to before it opened */
const useLocationToggle = (
  key: string,
  options?: UseLocationStateOptions,
): UseLocationToggleReturn => {
  /* The toggle's status and its setter */
  const [isOpen] = useLocationState(key, false, options);
  const toggle = useSetLocationToggle(key, options);

  /* The status and its setter */
  return useMemo(() => [isOpen, toggle], [isOpen, toggle]);
};

export { useLocationToggle, useSetLocationToggle };
export type { SetLocationToggle, UseLocationToggleReturn };

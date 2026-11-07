import { useMemo } from "react";
import { useRoutingSelector } from "../router/useRoutingSelector";
import {
  useSetLocationState,
  type SetLocationState,
  type UseLocationStateOptions,
} from "./useSetLocationState";

/** A location state value and its setter */
type UseLocationStateReturn<T> = [T, SetLocationState<T>];

/** A hook for a value stored on the current history entry; clearing it goes back */
const useLocationState = <T>(
  key: string,
  defaultValue: T,
  options?: UseLocationStateOptions,
): UseLocationStateReturn<T> => {
  /* The value on the entry, or on its way there; only its changes re-render */
  const valueFromState = useRoutingSelector(
    (view) => view.resolvedLocation.state?.[key],
  );

  /* The value's setter */
  const setValue = useSetLocationState<T>(key, options);

  /* The value, or the default when it isn't set */
  const value: T = valueFromState !== undefined ? valueFromState : defaultValue;

  /* The value and its setter */
  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn };

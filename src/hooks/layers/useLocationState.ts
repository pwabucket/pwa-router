import { useMemo } from "react";
import { useLocation } from "../router/useLocation";
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
  /* The current location and the value's setter */
  const location = useLocation();
  const setValue = useSetLocationState<T>(key, options);

  /* The value on the entry, or on its way there */
  const valueFromState = location.state?.[key];
  const value: T = valueFromState !== undefined ? valueFromState : defaultValue;

  /* The value and its setter */
  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn };

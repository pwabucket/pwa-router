import { useCallback, useMemo, useRef } from "react";
import { useNavigate, type NavigateOptions } from "react-router";
import { usePWARouting } from "./usePWARouting";
import { routerState } from "../constants";
import { getLocationPath } from "../utils/location";
import { markEphemeral, unmarkEphemeral } from "../utils/ephemeralState";
import {
  markNonInherited,
  readNonInheritedKeys,
  removeNonInheritedValues,
  unmarkNonInherited,
} from "../utils/nonInheritedState";

type UseLocationStateReturn<T> = [
  T,
  (value?: T, options?: NavigateOptions, index?: number) => void,
];

interface UseLocationStateOptions {
  /** Keep the value after a page reload (default: true) */
  persist?: boolean;
  /** Index key to return to when the value is discarded after a reload */
  indexKey?: string;
  /** Carry the value into entries pushed by other keys (default: true) */
  inherit?: boolean;
}

/** State stored on the current history entry; clearing it navigates back */
const useLocationState = <T>(
  key: string,
  defaultValue: T,
  { persist = true, indexKey, inherit = true }: UseLocationStateOptions = {},
): UseLocationStateReturn<T> => {
  const navigate = useNavigate();
  const { resolvedLocation: location } = usePWARouting();

  /* Keeps the setters stable across navigations */
  const latestRef = useRef({ navigate, location });

  // oxlint-disable-next-line react/refs
  latestRef.current.location = location;
  // oxlint-disable-next-line react/refs
  latestRef.current.navigate = navigate;

  const valueFromState = location.state?.[key];
  const value: T = valueFromState !== undefined ? valueFromState : defaultValue;

  const pushValue = useCallback(
    (newValue: T, options?: NavigateOptions) => {
      const { navigate, location } = latestRef.current;

      /* Entries holding non-inherited values are replaced by the next push */
      const isNonInheritedEntry =
        readNonInheritedKeys(location.state).length > 0;

      /* Non-inherited values stay on the entry that set them */
      const inheritedState = removeNonInheritedValues(location.state);

      navigate(getLocationPath(location), {
        replace: isNonInheritedEntry,
        ...options,
        state: {
          ...inheritedState,
          ...options?.state,
          ...(persist
            ? unmarkEphemeral(inheritedState, key)
            : markEphemeral(inheritedState, key, indexKey ?? null)),
          ...(inherit
            ? unmarkNonInherited(inheritedState, key)
            : markNonInherited(inheritedState, key)),
          [key]: newValue,
        },
      });
    },
    [key, persist, indexKey, inherit],
  );

  const clearValue = useCallback(
    (options?: NavigateOptions, index?: number) => {
      const { navigate, location } = latestRef.current;

      /* A non-inherited value read from an entry that has since been left */
      const hasLeftEntry =
        readNonInheritedKeys(location.state).includes(key) &&
        window.history.state?.key !== location.key;

      if (hasLeftEntry) {
        return;
      }

      if (index !== undefined && index < history.length) {
        /* Return to the stamped index, skipping entries made since (iframes) */
        navigate(getLocationPath(location), {
          ...options,
          replace: true,
          state: {
            ...location.state,
            ...options?.state,
            ...routerState.destroy(index),
            ...unmarkEphemeral(location.state, key),
            ...unmarkNonInherited(location.state, key),
            [key]: undefined,
          },
        });
      } else if (index !== undefined || location.key !== "default") {
        navigate(-1);
      } else {
        /* Landed here directly, nothing to go back to */
        navigate("/", { ...options, replace: true });
      }
    },
    [key],
  );

  const setValue = useCallback(
    (newValue?: T, options?: NavigateOptions, index?: number) =>
      newValue !== undefined
        ? pushValue(newValue, options)
        : clearValue(options, index),
    [pushValue, clearValue],
  );

  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn, UseLocationStateOptions };

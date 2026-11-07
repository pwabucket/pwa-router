import { useCallback, useMemo, useRef } from "react";
import { type NavigateOptions } from "react-router";
import { useLocation } from "../router/useLocation";
import { useNavigate } from "../router/useNavigate";
import { routerState } from "../../constants";
import { getLocationPath } from "../../lib/router/location";
import {
  markEphemeral,
  unmarkEphemeral,
} from "../../lib/layers/ephemeralState";
import {
  markNonInherited,
  readNonInheritedKeys,
  removeNonInheritedValues,
  unmarkNonInherited,
} from "../../lib/layers/nonInheritedState";

/** A location state value and its setter */
type UseLocationStateReturn<T> = [
  T,
  (value?: T, options?: NavigateOptions, index?: number) => void,
];

/** Options of a location state value */
interface UseLocationStateOptions {
  /** Keep the value after a page reload (default: true) */
  persist?: boolean;
  /** Index key to return to when the value is discarded after a reload */
  indexKey?: string;
  /** Carry the value into entries pushed by other keys (default: true) */
  inherit?: boolean;
}

/** A hook for a value stored on the current history entry; setting pushes, clearing navigates back */
const useLocationState = <T>(
  key: string,
  defaultValue: T,
  { persist = true, indexKey, inherit = true }: UseLocationStateOptions = {},
): UseLocationStateReturn<T> => {
  /* The navigate function and the location on screen */
  const navigate = useNavigate();
  const location = useLocation();

  /* Keeps the setters stable across navigations (navigate is already stable) */
  const locationRef = useRef(location);

  // oxlint-disable-next-line react/refs
  locationRef.current = location;

  /* The value on the entry, or the default */
  const valueFromState = location.state?.[key];
  const value: T = valueFromState !== undefined ? valueFromState : defaultValue;

  /* Pushes the value, carrying the inherited state */
  const pushValue = useCallback(
    (newValue: T, options?: NavigateOptions) => {
      const location = locationRef.current;

      /* Non-inherited values stay on the entry that set them */
      const inheritedState = removeNonInheritedValues(location.state);

      /* navigate replaces entries holding non-inherited values */
      navigate(getLocationPath(location), {
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
    [key, persist, indexKey, inherit, navigate],
  );

  /* Clears the value: back to the stamped index, back once, or home when nothing is behind */
  const clearValue = useCallback(
    (options?: NavigateOptions, index?: number) => {
      const location = locationRef.current;

      /* A non-inherited value read from an entry that has since been left */
      const hasLeftEntry =
        readNonInheritedKeys(location.state).includes(key) &&
        window.history.state?.key !== location.key;

      if (hasLeftEntry) {
        return;
      }

      /* Back to the stamped index, back once, or home */
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
    [key, navigate],
  );

  /* Each call navigates; setting the value it already has does nothing */
  const setValue = useCallback(
    (newValue?: T, options?: NavigateOptions, index?: number) => {
      if (Object.is(newValue, locationRef.current.state?.[key])) return;

      if (newValue !== undefined) pushValue(newValue, options);
      else clearValue(options, index);
    },
    [key, pushValue, clearValue],
  );

  /* The value and its setter */
  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn, UseLocationStateOptions };

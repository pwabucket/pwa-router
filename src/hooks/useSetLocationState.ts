import { useCallback, useContext } from "react";
import { LocationStateDefaultsContext } from "../contexts/LocationStateDefaultsContext";
import { LocationStateTransactionsContext } from "../contexts/LocationStateTransactionsContext";
import { warnLargeStateValue } from "../utils/stateSizeWarning";
import type { ValueChangeOptions } from "../core/planChanges";

interface UseLocationStateOptions {
  /** Keep the value after a page reload (default: true, or the section's default) */
  persist?: boolean;
  /** Carry the value into entries pushed by other keys (default: true, or the section's default) */
  inherit?: boolean;
  /** Update the current entry in place instead of pushing (default: false) */
  replace?: boolean;
}

/** Options for setting a location state value */
type SetLocationStateOptions = ValueChangeOptions;

/** Setter of a location state value */
type SetLocationState<T> = (
  value?: T,
  options?: SetLocationStateOptions,
) => void;

/** A hook for setting a location state value without reading it; never re-renders on navigation */
const useSetLocationState = <T>(
  key: string,
  options: UseLocationStateOptions = {},
): SetLocationState<T> => {
  const queueChange = useContext(LocationStateTransactionsContext)!;
  const defaults = useContext(LocationStateDefaultsContext);

  /* The value's options over the section's defaults */
  const persist = options.persist ?? defaults.persist ?? true;
  const inherit = options.inherit ?? defaults.inherit ?? true;
  const replace = options.replace ?? false;

  return useCallback<SetLocationState<T>>(
    (value, setOptions) => {
      warnLargeStateValue(key, value);
      queueChange({
        key,
        value,
        persist,
        inherit,
        replace,
        options: setOptions,
      });
    },
    [key, persist, inherit, replace, queueChange],
  );
};

export { useSetLocationState };
export type {
  SetLocationState,
  SetLocationStateOptions,
  UseLocationStateOptions,
};

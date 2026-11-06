import { useCallback, useMemo } from "react";
import { useLocationState } from "./useLocationState";
import type { UseLocationStateOptions } from "./useSetLocationState";
import type { SetLocationStateOptions } from "../utils/transaction";

/** Selects a tab */
type SelectLocationTab<T> = (tab: T, options?: SetLocationStateOptions) => void;

type UseLocationTabReturn<T> = [T, SelectLocationTab<T>];

/** A hook for tabs or panes with a default: other tabs share one entry above it, and back returns to the default */
const useLocationTab = <T>(
  key: string,
  defaultTab: T,
  options?: Omit<UseLocationStateOptions, "replace">,
): UseLocationTabReturn<T> => {
  const [tab, setTab] = useLocationState<T>(key, defaultTab, options);

  /* The default closes the tab layer; others open it, then replace in place */
  const selectTab = useCallback<SelectLocationTab<T>>(
    (nextTab, selectOptions) => {
      if (Object.is(nextTab, defaultTab)) {
        setTab(undefined, selectOptions);
      } else {
        setTab(nextTab, {
          ...selectOptions,
          replace: !Object.is(tab, defaultTab),
        });
      }
    },
    [defaultTab, tab, setTab],
  );

  return useMemo(() => [tab, selectTab], [tab, selectTab]);
};

export { useLocationTab };
export type { SelectLocationTab, UseLocationTabReturn };

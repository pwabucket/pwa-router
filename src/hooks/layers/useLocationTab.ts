import { useCallback, useMemo } from "react";
import { useLocationState } from "./useLocationState";
import type { UseLocationStateOptions } from "./useSetLocationState";
import type { SetLocationStateOptions } from "./useSetLocationState";

/** Selects a tab */
type SelectLocationTab<T> = (tab: T, options?: SetLocationStateOptions) => void;

/** The tab on show and its selector */
type UseLocationTabReturn<T> = [T, SelectLocationTab<T>];

/** A hook for tabs or panes with a default: other tabs share one entry above it, and back returns to the default */
const useLocationTab = <T>(
  key: string,
  defaultTab: T,
  options?: Omit<UseLocationStateOptions, "replace">,
): UseLocationTabReturn<T> => {
  /* The tab on show and its setter */
  const [tab, setTab] = useLocationState<T>(key, defaultTab, options);

  /* The handler for choosing a tab */
  const selectTab = useCallback<SelectLocationTab<T>>(
    (nextTab, selectOptions) => {
      if (Object.is(nextTab, defaultTab)) {
        /* The default tab: close the tab layer */
        setTab(undefined, selectOptions);
      } else {
        /* From another tab: replace in place on the tab's entry, closing what's above */
        const isOnOtherTab = !Object.is(tab, defaultTab);
        setTab(nextTab, {
          ...selectOptions,
          replace: isOnOtherTab,
          onOwnEntry: isOnOtherTab,
        });
      }
    },
    [defaultTab, tab, setTab],
  );

  /* The tab on show and its selector */
  return useMemo(() => [tab, selectTab], [tab, selectTab]);
};

export { useLocationTab };
export type { SelectLocationTab, UseLocationTabReturn };

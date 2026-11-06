import { useContext, useMemo } from "react";
import type { Location } from "react-router";
import { LocationStateTransactionsContext } from "../../contexts/LocationStateTransactionsContext";
import { PWARoutingContext } from "../../contexts/PWARoutingContext";
import { TabsContext } from "../../contexts/TabsContext";
import { TabViewContext } from "../../contexts/TabViewContext";
import { usePWARouting } from "../../hooks/usePWARouting";
import type { QueueLocationStateChange } from "../../providers/engine/useLocationStateTransactions";
import type { StepRecord } from "../../core/record";
import { findTab, readPagePath, rootPageStep } from "../../core/tabs";
import { warnHiddenTabChange } from "../../utils/tabsWarnings";

interface TabViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The tab this view shows */
  id: string;
  /** Keep the view mounted while hidden, so its screens keep their state (default: true) */
  keepMounted?: boolean;
}

/** A queue that ignores changes from a hidden tab */
const ignoreChange: QueueLocationStateChange = ({ key }) =>
  warnHiddenTabChange(key);

/** A saved page as a location; it never changes while the page stays the same */
const toLocation = (page: StepRecord, tabId: string) => {
  const { pathname, search, hash } = readPagePath(page);

  return {
    pathname,
    search,
    hash,
    state: page.snapshot?.values ?? {},
    key: `${tabId}:${pathname}${search}${hash}`,
  } as Location;
};

/** One tab's screens: the real location when live, its saved top page otherwise */
const TabView = ({
  id,
  keepMounted = true,
  children,
  ...props
}: TabViewProps) => {
  const tabs = useContext(TabsContext)!;
  const routing = usePWARouting();
  const queueChange = useContext(LocationStateTransactionsContext)!;

  /* Shown, and holding the real location */
  const isShown = tabs.active === id;
  const isLive = tabs.liveTab === id;
  const canAct = isShown && isLive;

  /* The tab's saved top page, or its root */
  const savedPages = tabs.saved[id];
  const savedPage = useMemo(
    () =>
      savedPages?.[savedPages.length - 1] ??
      rootPageStep(findTab(tabs.config, id), `${id}:root`),
    [savedPages, tabs.config, id],
  );

  /* The live view follows the real location; it can't act while hidden */
  const liveRouting = useMemo(
    () => (canAct ? routing : { ...routing, isInactive: true }),
    [canAct, routing],
  );

  /* Another view shows its saved page, and stays still while other tabs navigate */
  const savedRouting = useMemo(
    () => ({
      resolvedLocation: toLocation(savedPage, id),
      isCorrecting: false,
      isInactive: true,
    }),
    [savedPage, id],
  );

  /** The routing the view's screens read */
  const viewRouting = isLive ? liveRouting : savedRouting;

  if (!isShown && !keepMounted) return null;

  return (
    <TabViewContext.Provider value={id}>
      <PWARoutingContext.Provider value={viewRouting}>
        <LocationStateTransactionsContext.Provider
          value={canAct ? queueChange : ignoreChange}
        >
          <div {...props} hidden={!isShown}>
            {children}
          </div>
        </LocationStateTransactionsContext.Provider>
      </PWARoutingContext.Provider>
    </TabViewContext.Provider>
  );
};

export { TabView };
export type { TabViewProps };

import { useContext, useMemo } from "react";
import type { Location } from "react-router";
import { LocationStateTransactionsContext } from "../../contexts/LocationStateTransactionsContext";
import { PWARoutingContext } from "../../contexts/PWARoutingContext";
import { TabsContext } from "../../contexts/TabsContext";
import { TabViewContext } from "../../contexts/TabViewContext";
import { usePWARouting } from "../../hooks/usePWARouting";
import type { QueueLocationStateChange } from "../../providers/engine/useLocationStateTransactions";
import type { StepRecord } from "../../core/record";
import { findTab, readStepPath, rootPageStep } from "../../core/tabs";
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

/** A saved step as a location; its key never changes while the address stays the same */
const toLocation = (step: StepRecord, tabId: string) => {
  const { pathname, search, hash } = readStepPath(step);

  return {
    pathname,
    search,
    hash,
    state: step.snapshot?.values ?? {},
    key: `${tabId}:${pathname}${search}${hash}`,
  } as Location;
};

/** One tab's screens: the real location when live, its saved top step otherwise */
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

  /* The tab's saved top step, or its root */
  const savedSteps = tabs.saved[id];
  const { config, address } = tabs;
  const savedStep = useMemo(
    () =>
      savedSteps?.[savedSteps.length - 1] ??
      rootPageStep(findTab(config, id), { address }, `${id}:root`),
    [savedSteps, config, address, id],
  );

  /* The live view follows the real location; it can't act while hidden */
  const liveRouting = useMemo(
    () => (canAct ? routing : { ...routing, isInactive: true }),
    [canAct, routing],
  );

  /* Another view shows its saved step, and stays still while other tabs navigate */
  const savedRouting = useMemo(
    () => ({
      resolvedLocation: toLocation(savedStep, id),
      isCorrecting: false,
      isInactive: true,
    }),
    [savedStep, id],
  );

  /** The routing the view's screens read */
  const viewRouting = isLive ? liveRouting : savedRouting;

  /** The area and tab this view shows, for nested areas and guards */
  const place = useMemo(
    () => ({ area: tabs.config.id, tab: id }),
    [tabs.config.id, id],
  );

  if (!isShown && !keepMounted) return null;

  return (
    <TabViewContext.Provider value={place}>
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

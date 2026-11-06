import { useContext, useMemo } from "react";
import type { Location } from "react-router";
import { LocationStateTransactionsContext } from "../layers/LocationStateTransactionsContext";
import { PWARoutingContext } from "../router/PWARoutingContext";
import { TabsContext } from "./TabsContext";
import { TabViewContext } from "./TabViewContext";
import { TabViewStatusContext } from "./TabViewStatusContext";
import { usePWARouting } from "../router/usePWARouting";
import type { QueueLocationStateChange } from "../engine/useLocationStateTransactions";
import type { StepRecord } from "../engine/core/record";
import { findTab, readStepPath, rootPageStep } from "./core/tabs";
import { warnHiddenTabChange } from "./tabsWarnings";

/** Props of TabView */
interface TabViewProps {
  /** The tab whose location this view's screens read */
  id: string;
  children?: React.ReactNode;
}

/** A queue that ignores changes from a tab that isn't active */
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

/** One tab's screens: the real location when live, its saved top step otherwise; the app lays them out */
const TabView = ({ id, children }: TabViewProps) => {
  const tabs = useContext(TabsContext)!;
  const routing = usePWARouting();
  const queueChange = useContext(LocationStateTransactionsContext)!;

  /* Active (selected), and holding the real location */
  const isActive = tabs.active === id;
  const isLive = tabs.liveTab === id;
  const canAct = isActive && isLive;

  /* The tab's saved top step, or its root */
  const savedSteps = tabs.saved[id];
  const { config, address } = tabs;
  const savedStep = useMemo(
    () =>
      savedSteps?.[savedSteps.length - 1] ??
      rootPageStep(findTab(config, id), { address }, `${id}:root`),
    [savedSteps, config, address, id],
  );

  /* The live view follows the real location; it can't act while another tab is being selected */
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

  /** The view's tab and whether it is active, for its screens */
  const status = useMemo(() => ({ tab: id, isActive }), [id, isActive]);

  return (
    <TabViewContext.Provider value={place}>
      <TabViewStatusContext.Provider value={status}>
        <PWARoutingContext.Provider value={viewRouting}>
          <LocationStateTransactionsContext.Provider
            value={canAct ? queueChange : ignoreChange}
          >
            {children}
          </LocationStateTransactionsContext.Provider>
        </PWARoutingContext.Provider>
      </TabViewStatusContext.Provider>
    </TabViewContext.Provider>
  );
};

export { TabView };
export type { TabViewProps };

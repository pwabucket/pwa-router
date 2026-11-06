import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import { TabsContext } from "../../contexts/TabsContext";
import { TabsEngineContext } from "../../contexts/TabsEngineContext";
import { usePWARouting } from "../../hooks/usePWARouting";
import {
  matchTab,
  readTabsArea,
  type TabDefinition,
} from "../../core/tabs";
import { warnInvalidTabs } from "../../utils/tabsWarnings";

interface TabsRootProps {
  /** The tabbed area's id */
  id: string;
  /** Every tab with the path of its first page; keep the list constant */
  tabs: TabDefinition[];
  /** The tab at the bottom of the area: back from any other tab returns to it */
  defaultTab: string;
  children?: React.ReactNode;
}

/** No saved pages */
const EMPTY_SAVED = {};

/** A tabbed area: every tab keeps its own pages, and only the active one is in history */
const TabsRoot = ({ id, tabs, defaultTab, children }: TabsRootProps) => {
  const engine = useContext(TabsEngineContext)!;
  const { resolvedLocation } = usePWARouting();
  const { register, unregister, queueTabsOp } = engine;

  /* The area as registered with the engine */
  const config = useMemo(
    () => ({ id, tabs, defaultTab }),
    [id, tabs, defaultTab],
  );

  /* Register the area, and remove it on unmount */
  useLayoutEffect(() => register(config), [register, config]);
  useLayoutEffect(() => () => unregister(id), [unregister, id]);

  /* Warn about an invalid list in development */
  useEffect(() => warnInvalidTabs(config), [config]);

  /* The tab of the location on show, and the tab being shown */
  const isRegistered = engine.config?.id === id;
  const engineTab = isRegistered ? engine.area?.active : undefined;
  const liveTab =
    readTabsArea(resolvedLocation.state, id)?.area.active ??
    engineTab ??
    matchTab(config, resolvedLocation.pathname);
  const active = engine.pendingTab ?? liveTab;
  const saved = isRegistered ? engine.memory.saved : EMPTY_SAVED;

  /** Switches to a tab; the active one pops to its root */
  const select = useCallback(
    (tab: string) => queueTabsOp({ kind: "select", tab }),
    [queueTabsOp],
  );

  /** Pops the active tab to its root */
  const popToRoot = useCallback(
    () => queueTabsOp({ kind: "popToRoot" }),
    [queueTabsOp],
  );

  const value = useMemo(
    () => ({ config, active, liveTab, saved, select, popToRoot }),
    [config, active, liveTab, saved, select, popToRoot],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
};

export { TabsRoot };
export type { TabsRootProps };

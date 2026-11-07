import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "react";
import { TabsContext } from "../../contexts/tabs/TabsContext";
import { TabsEngineContext } from "../../contexts/tabs/TabsEngineContext";
import { TabViewContext } from "../../contexts/tabs/TabViewContext";
import { usePWARouting } from "../../hooks/router/usePWARouting";
import { findArea } from "../../lib/engine/core/record";
import {
  matchTab,
  readTabsArea,
  type TabDefinition,
} from "../../lib/tabs/core/tabs";
import { warnInvalidTabs } from "../../lib/tabs/tabsWarnings";

/** Props of TabsRoot */
interface TabsRootProps {
  /** The tabbed area's id */
  id: string;
  /** Every tab, with the path of its first page when it has its own; keep the list constant */
  tabs: TabDefinition[];
  /** The tab at the bottom of the area: back from any other tab returns to it */
  defaultTab: string;
  /** Put the tab roots under a page the app is first opened on, so back goes there first (default: true) */
  deepLinkRoots?: boolean;
  children?: React.ReactNode;
}

/** No saved steps */
const EMPTY_SAVED = {};

/** A component for a tabbed area: every tab keeps its own steps, and only the active one is in history */
const TabsRoot = ({
  id,
  tabs,
  defaultTab,
  deepLinkRoots = true,
  children,
}: TabsRootProps) => {
  /* The tabs engine, the tab around this area, and the location on show */
  const engine = useContext(TabsEngineContext)!;
  const parent = useContext(TabViewContext);
  const { resolvedLocation } = usePWARouting();
  const { register, unregister, queueTabsOp } = engine;

  /* The area as registered with the engine, inside its parent tab when nested */
  const config = useMemo(
    () => ({ id, tabs, defaultTab, deepLinkRoots, parent }),
    [id, tabs, defaultTab, deepLinkRoots, parent],
  );

  /* Register the area, and remove it on unmount */
  useLayoutEffect(() => register(config), [register, config]);
  useLayoutEffect(() => () => unregister(id), [unregister, id]);

  /* Warn about an invalid list in development */
  useEffect(() => warnInvalidTabs(config), [config]);

  /* The tab of the location on show, and the tab being shown */
  const engineTab = findArea(engine.record, id)?.active;
  const liveTab =
    readTabsArea(resolvedLocation.state, id)?.area.active ??
    engineTab ??
    matchTab(config, resolvedLocation.pathname);
  const pendingTab =
    engine.pendingTab?.area === id ? engine.pendingTab.tab : undefined;
  const active = pendingTab ?? liveTab;
  const saved = engine.memories[id]?.saved ?? EMPTY_SAVED;

  /* The address the area was opened on (the location on show until it's recorded), kept stable */
  const { pathname, search, hash } =
    findArea(engine.record, id)?.address ?? resolvedLocation;
  const address = useMemo(
    () => ({ pathname, search, hash }),
    [pathname, search, hash],
  );

  /** Switches to a tab; the active one stays as it is */
  const select = useCallback(
    (tab: string) => queueTabsOp({ kind: "select", area: id, tab }),
    [queueTabsOp, id],
  );

  /** Pops the active tab to its root */
  const popToRoot = useCallback(
    () => queueTabsOp({ kind: "popToRoot", area: id }),
    [queueTabsOp, id],
  );

  /* What TabView and the tabs hooks read and call */
  const value = useMemo(
    () => ({ config, active, liveTab, saved, address, select, popToRoot }),
    [config, active, liveTab, saved, address, select, popToRoot],
  );

  /* Provide the area to its views and controls */
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
};

export { TabsRoot };
export type { TabsRootProps };

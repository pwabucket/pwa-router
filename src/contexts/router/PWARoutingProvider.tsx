import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, type Location } from "react-router";

import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../../constants";
import { LeaveGuardsContext } from "../guards/LeaveGuardsContext";
import { LocationStateTransactionsContext } from "../layers/LocationStateTransactionsContext";
import { PWARoutingContext } from "./PWARoutingContext";
import { RoutingStoreContext } from "./RoutingStoreContext";
import { useOwnRoutingStore } from "../../hooks/router/useOwnRoutingStore";
import { useStableNavigate } from "../../hooks/router/useStableNavigate";
import { RouterNavigateContext } from "./RouterNavigateContext";
import { TabsOperationsContext } from "../tabs/TabsOperationsContext";
import { TabsEngineContext } from "../tabs/TabsEngineContext";
import { LeaveGuardRegistry } from "../../lib/guards/LeaveGuardRegistry";
import { applyOverlay } from "../../lib/engine/transactions/overlay";
import { EngineWork } from "../../lib/engine/EngineWork";
import { useCorrectionLock } from "../../hooks/engine/useCorrectionLock";
import { useDeepLinkHomeHandler } from "../../hooks/engine/handlers/useDeepLinkHomeHandler";
import { useDestroyIndexHandler } from "../../hooks/engine/handlers/useDestroyIndexHandler";
import { useEphemeralStateHandler } from "../../hooks/engine/handlers/useEphemeralStateHandler";
import { useFromPositionHandler } from "../../hooks/engine/handlers/useFromPositionHandler";
import { createGuardDecider } from "../../lib/guards/guardDecider";
import { createVirtualStepDecider } from "../../lib/tabs/virtualStepDecider";
import { useMoveWatcher } from "../../hooks/engine/useMoveWatcher";
import { useLocationStateTransactions } from "../../hooks/engine/useLocationStateTransactions";
import { useNavigateIndexHandler } from "../../hooks/engine/handlers/useNavigateIndexHandler";
import { usePendingNavigationHandler } from "../../hooks/engine/handlers/usePendingNavigationHandler";
import { useTabsHandler } from "../../hooks/tabs/useTabsHandler";

/** Props of PWARoutingProvider */
interface PWARoutingProviderProps {
  children?: React.ReactNode;
  /** Put this home path under an inner page the app is first opened on, so back goes home first */
  deepLinkHome?: string;
}

/** A provider running the engine, which keeps the history in step with layers, guards and corrections */
const PWARoutingProvider = ({
  children,
  deepLinkHome,
}: PWARoutingProviderProps) => {
  /* The location, the correction lock, the guards and the engine's work */
  const location = useLocation();
  const tryLock = useCorrectionLock(location.key);
  const [guards] = useState(() => new LeaveGuardRegistry());
  const [work] = useState(() => new EngineWork());

  /* The tab areas whose TabsRoot is mounted right now */
  const [registeredAreas] = useState(() => new Set<string>());

  /* The location kept on show while the engine crosses other entries */
  const [shownLocation, showLocation] = useState<Location | null>(null);

  /* Handlers run in call order, which is their priority */
  const { sanitizedLocation, hasStaleEphemeralState } =
    useEphemeralStateHandler(location, tryLock);

  /* Stale ephemeral state may wait for the router, so nothing else runs first */
  const tryLockAfterEphemeralCleanup = useCallback(
    () => !hasStaleEphemeralState && tryLock(),
    [hasStaleEphemeralState, tryLock],
  );

  /* The handlers that move the history to correct it */
  const [pendingNavigation, setPendingNavigation] = useFromPositionHandler(
    location,
    tryLockAfterEphemeralCleanup,
    showLocation,
  );
  useDestroyIndexHandler(location, tryLockAfterEphemeralCleanup);
  useNavigateIndexHandler(location, tryLockAfterEphemeralCleanup);
  usePendingNavigationHandler(
    pendingNavigation,
    setPendingNavigation,
    tryLockAfterEphemeralCleanup,
    showLocation,
  );

  /* A correction is pending or in flight on the current entry */
  const hasCorrection =
    hasStaleEphemeralState ||
    pendingNavigation !== null ||
    location.state?.[ROUTER_FROM_POSITION] !== undefined ||
    location.state?.[ROUTER_DESTROY_INDEX] !== undefined ||
    location.state?.[ROUTER_NAVIGATE_INDEX] !== undefined;

  /* The deciders of user moves, in order: guards ask first, then mounted tabs show virtual steps */
  const deciders = useMemo(
    () => [
      createGuardDecider(guards),
      createVirtualStepDecider(registeredAreas),
    ],
    [guards, registeredAreas],
  );

  /* User moves a decider asks to undo are undone, with the screen kept on show */
  const { settledLocation, frozenLocation, isReverting } = useMoveWatcher(
    location,
    deciders,
    work,
    hasCorrection,
    tryLockAfterEphemeralCleanup,
  );

  /* Wake guards whose move has landed outside their scope */
  useLayoutEffect(() => {
    guards.settle(settledLocation);
  }, [guards, settledLocation]);

  /* Every entry of a tabbed area carries its tabs data */
  const tabsHandler = useTabsHandler(
    location,
    work,
    hasCorrection || isReverting,
    tryLockAfterEphemeralCleanup,
    registeredAreas,
  );
  /* The engine is correcting the history */
  const isCorrecting = hasCorrection || isReverting || tabsHandler.isCorrecting;

  /* Location state changes and tab operations run as transactions over the history */
  const { overlay, pendingTab, queueChange, queueTabsOp } =
    useLocationStateTransactions(
      location,
      isCorrecting,
      guards,
      tabsHandler.engine,
      work,
      showLocation,
    );

  /* Home (or a tab's roots) go under an inner page the app was first opened on */
  useDeepLinkHomeHandler(
    deepLinkHome,
    location,
    isCorrecting,
    tabsHandler.engine,
    work,
  );

  /* The tabs engine for TabsRoot */
  const tabsEngine = useMemo(
    () => ({ ...tabsHandler.engine, pendingTab, queueTabsOp }),
    [tabsHandler.engine, pendingTab, queueTabsOp],
  );

  /* The location the engine is settling on */
  const settlingLocation = frozenLocation ?? shownLocation ?? sanitizedLocation;

  /** Pass to <Routes>: the settling location with the values on their way */
  const resolvedLocation = useMemo(
    () => applyOverlay(settlingLocation, overlay),
    [settlingLocation, overlay],
  );

  /* The engine's view for screens */
  const value = useMemo(
    () => ({ resolvedLocation, isCorrecting, isInactive: false }),
    [resolvedLocation, isCorrecting],
  );

  /* The store of the engine's view, read in slices or when acting */
  const routingStore = useOwnRoutingStore(value);

  /* React Router's navigate as one stable function */
  const stableNavigate = useStableNavigate();

  /* The engine's view and its store, the guards, both queues, the tabs engine and a stable navigate for the app */
  return (
    <PWARoutingContext.Provider value={value}>
      <RoutingStoreContext.Provider value={routingStore}>
        <LeaveGuardsContext.Provider value={guards}>
          <LocationStateTransactionsContext.Provider value={queueChange}>
            <TabsEngineContext.Provider value={tabsEngine}>
              <TabsOperationsContext.Provider value={queueTabsOp}>
                <RouterNavigateContext.Provider value={stableNavigate}>
                  {children}
                </RouterNavigateContext.Provider>
              </TabsOperationsContext.Provider>
            </TabsEngineContext.Provider>
          </LocationStateTransactionsContext.Provider>
        </LeaveGuardsContext.Provider>
      </RoutingStoreContext.Provider>
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };
export type { PWARoutingProviderProps };

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, type Location } from "react-router";

import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../constants";
import { LeaveGuardsContext } from "../contexts/LeaveGuardsContext";
import { LocationStateTransactionsContext } from "../contexts/LocationStateTransactionsContext";
import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { TabsEngineContext } from "../contexts/TabsEngineContext";
import { LeaveGuardRegistry } from "../utils/leaveGuards";
import { applyOverlay } from "../utils/overlay";
import { EngineWork } from "./engine/EngineWork";
import { useCorrectionLock } from "./engine/useCorrectionLock";
import { useDeepLinkHomeHandler } from "./engine/useDeepLinkHomeHandler";
import { useDestroyIndexHandler } from "./engine/useDestroyIndexHandler";
import { useEphemeralStateHandler } from "./engine/useEphemeralStateHandler";
import { useFromPositionHandler } from "./engine/useFromPositionHandler";
import { createGuardDecider } from "./engine/deciders/guardDecider";
import { virtualPageDecider } from "./engine/deciders/virtualPageDecider";
import { useMoveWatcher } from "./engine/useMoveWatcher";
import { useLocationStateTransactions } from "./engine/useLocationStateTransactions";
import { useNavigateIndexHandler } from "./engine/useNavigateIndexHandler";
import { usePendingNavigationHandler } from "./engine/usePendingNavigationHandler";
import { useTabsHandler } from "./engine/useTabsHandler";

interface PWARoutingProviderProps {
  children?: React.ReactNode;
  /** Put this home path under an inner page the app is first opened on, so back goes home first */
  deepLinkHome?: string;
}

/** The engine keeping history in step with layers, guards and corrections */
const PWARoutingProvider = ({
  children,
  deepLinkHome,
}: PWARoutingProviderProps) => {
  const location = useLocation();
  const tryLock = useCorrectionLock(location.key);
  const [guards] = useState(() => new LeaveGuardRegistry());
  const [work] = useState(() => new EngineWork());

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

  /* The deciders of user moves, in order: guards ask first, then tabs show virtual pages */
  const deciders = useMemo(
    () => [createGuardDecider(guards), virtualPageDecider],
    [guards],
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
  );
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

  const value = useMemo(
    () => ({ resolvedLocation, isCorrecting, isInactive: false }),
    [resolvedLocation, isCorrecting],
  );

  return (
    <PWARoutingContext.Provider value={value}>
      <LeaveGuardsContext.Provider value={guards}>
        <LocationStateTransactionsContext.Provider value={queueChange}>
          <TabsEngineContext.Provider value={tabsEngine}>
            {children}
          </TabsEngineContext.Provider>
        </LocationStateTransactionsContext.Provider>
      </LeaveGuardsContext.Provider>
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };
export type { PWARoutingProviderProps };

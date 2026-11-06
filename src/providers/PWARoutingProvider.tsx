import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router";

import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../constants";
import { LeaveGuardsContext } from "../contexts/LeaveGuardsContext";
import { LocationStateTransactionsContext } from "../contexts/LocationStateTransactionsContext";
import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { LeaveGuardRegistry } from "../utils/leaveGuards";
import { applyOverlay } from "../utils/overlay";
import { useCorrectionLock } from "./engine/useCorrectionLock";
import { useDeepLinkHomeHandler } from "./engine/useDeepLinkHomeHandler";
import { useDestroyIndexHandler } from "./engine/useDestroyIndexHandler";
import { useEphemeralStateHandler } from "./engine/useEphemeralStateHandler";
import { useFromPositionHandler } from "./engine/useFromPositionHandler";
import { useLeaveGuardHandler } from "./engine/useLeaveGuardHandler";
import { useLocationStateTransactions } from "./engine/useLocationStateTransactions";
import { useNavigateIndexHandler } from "./engine/useNavigateIndexHandler";
import { usePendingNavigationHandler } from "./engine/usePendingNavigationHandler";

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
  );
  useDestroyIndexHandler(location, tryLockAfterEphemeralCleanup);
  useNavigateIndexHandler(location, tryLockAfterEphemeralCleanup);
  usePendingNavigationHandler(
    pendingNavigation,
    setPendingNavigation,
    tryLockAfterEphemeralCleanup,
  );

  /* A correction is pending or in flight on the current entry */
  const hasCorrection =
    hasStaleEphemeralState ||
    pendingNavigation !== null ||
    location.state?.[ROUTER_FROM_POSITION] !== undefined ||
    location.state?.[ROUTER_DESTROY_INDEX] !== undefined ||
    location.state?.[ROUTER_NAVIGATE_INDEX] !== undefined;

  /* Moves leaving a guarded scope are undone */
  const { frozenLocation, isReverting } = useLeaveGuardHandler(
    location,
    guards,
    hasCorrection,
    tryLockAfterEphemeralCleanup,
  );
  const isCorrecting = hasCorrection || isReverting;

  /* Home goes under an inner page the app was first opened on */
  useDeepLinkHomeHandler(deepLinkHome, location, isCorrecting);

  /* Location state changes run as transactions over the history */
  const { overlay, queueChange } = useLocationStateTransactions(
    location,
    isCorrecting,
    guards,
  );

  /* The location the engine is settling on */
  const settlingLocation =
    frozenLocation ?? pendingNavigation?.location ?? sanitizedLocation;

  /** Pass to <Routes>: the settling location with the values on their way */
  const resolvedLocation = useMemo(
    () => applyOverlay(settlingLocation, overlay),
    [settlingLocation, overlay],
  );

  const value = useMemo(
    () => ({ resolvedLocation, isCorrecting }),
    [resolvedLocation, isCorrecting],
  );

  return (
    <PWARoutingContext.Provider value={value}>
      <LeaveGuardsContext.Provider value={guards}>
        <LocationStateTransactionsContext.Provider value={queueChange}>
          {children}
        </LocationStateTransactionsContext.Provider>
      </LeaveGuardsContext.Provider>
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };
export type { PWARoutingProviderProps };

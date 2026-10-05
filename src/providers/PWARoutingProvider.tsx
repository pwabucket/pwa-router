import { useCallback, useMemo } from "react";
import { useLocation } from "react-router";

import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../constants";
import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { useCorrectionLock } from "./engine/useCorrectionLock";
import { useDestroyIndexHandler } from "./engine/useDestroyIndexHandler";
import { useEphemeralStateHandler } from "./engine/useEphemeralStateHandler";
import { useFromPositionHandler } from "./engine/useFromPositionHandler";
import { useNavigateIndexHandler } from "./engine/useNavigateIndexHandler";
import { usePendingNavigationHandler } from "./engine/usePendingNavigationHandler";

const PWARoutingProvider = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const tryLock = useCorrectionLock(location.key);

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

  /** Pass to <Routes> */
  const resolvedLocation = pendingNavigation?.location || sanitizedLocation;

  /* A correction is pending or in flight on the current entry */
  const isCorrecting =
    hasStaleEphemeralState ||
    pendingNavigation !== null ||
    location.state?.[ROUTER_FROM_POSITION] !== undefined ||
    location.state?.[ROUTER_DESTROY_INDEX] !== undefined ||
    location.state?.[ROUTER_NAVIGATE_INDEX] !== undefined;

  const value = useMemo(
    () => ({ resolvedLocation, isCorrecting }),
    [resolvedLocation, isCorrecting],
  );

  return (
    <PWARoutingContext.Provider value={value}>
      {children}
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };

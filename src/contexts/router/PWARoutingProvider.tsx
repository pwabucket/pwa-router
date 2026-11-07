import { useCallback, useMemo } from "react";
import { useLocation } from "react-router";

import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../../constants";
import { PWARoutingContext } from "./PWARoutingContext";
import { useCorrectionLock } from "../../hooks/engine/useCorrectionLock";
import { useDestroyIndexHandler } from "../../hooks/engine/handlers/useDestroyIndexHandler";
import { useEphemeralStateHandler } from "../../hooks/engine/handlers/useEphemeralStateHandler";
import { useFromPositionHandler } from "../../hooks/engine/handlers/useFromPositionHandler";
import { useNavigateIndexHandler } from "../../hooks/engine/handlers/useNavigateIndexHandler";
import { usePendingNavigationHandler } from "../../hooks/engine/handlers/usePendingNavigationHandler";

/** A provider that corrects the history for the package's markers and shares the location screens show */
const PWARoutingProvider = ({ children }: { children?: React.ReactNode }) => {
  /* The router's location, and one correction per entry */
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

  /* Going back for a from-position marker, the stamped close, and re-applying the navigation */
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

  /* The location screens show: the held one during a from-position correction */
  const resolvedLocation = pendingNavigation?.location || sanitizedLocation;

  /* A correction is pending or in flight on the current entry */
  const isCorrecting =
    hasStaleEphemeralState ||
    pendingNavigation !== null ||
    location.state?.[ROUTER_FROM_POSITION] !== undefined ||
    location.state?.[ROUTER_DESTROY_INDEX] !== undefined ||
    location.state?.[ROUTER_NAVIGATE_INDEX] !== undefined;

  /* The shared value */
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

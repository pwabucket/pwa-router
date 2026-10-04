import { useCallback } from "react";
import { useLocation } from "react-router";

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

  return (
    <PWARoutingContext.Provider value={{ resolvedLocation }}>
      {children}
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };

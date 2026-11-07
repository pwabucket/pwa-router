import { useLayoutEffect } from "react";
import { useNavigate } from "react-router";
import { getLocationPath } from "../../../lib/router/location";
import type { PendingNavigation } from "./useFromPositionHandler";

/** A hook that re-applies the location saved by useFromPositionHandler, once the history is back */
const usePendingNavigationHandler = (
  pendingNavigation: PendingNavigation | null,
  setPendingNavigation: (value: PendingNavigation | null) => void,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();

  /* Clear the saved location and navigate to it */
  useLayoutEffect(() => {
    if (!pendingNavigation || !tryLock()) return;

    setPendingNavigation(null);
    navigate(getLocationPath(pendingNavigation.location), {
      ...pendingNavigation.options,
      state: pendingNavigation.location.state,
    });
  }, [pendingNavigation, setPendingNavigation, navigate, tryLock]);
};

export { usePendingNavigationHandler };

import { useLayoutEffect } from "react";
import { useNavigate } from "react-router";
import { getLocationPath } from "../../../lib/engine/core/locationPath";
import type { PendingNavigation } from "./useFromPositionHandler";
import type { ShowLocation } from "../../../lib/engine/transactions/LocationStateTransactions";

/** A hook that re-applies the location saved by useFromPositionHandler */
const usePendingNavigationHandler = (
  pendingNavigation: PendingNavigation | null,
  setPendingNavigation: (value: PendingNavigation | null) => void,
  tryLock: () => boolean,
  showLocation: ShowLocation,
) => {
  /* The router */
  const navigate = useNavigate();

  /* Re-apply the saved location */
  useLayoutEffect(() => {
    if (!pendingNavigation || !tryLock()) return;

    /* Release the location it showed, then apply it for real */
    const target = pendingNavigation.location;
    setPendingNavigation(null);
    showLocation((shown) => (shown === target ? null : shown));
    navigate(getLocationPath(pendingNavigation.location), {
      ...pendingNavigation.options,
      state: pendingNavigation.location.state,
    });
  }, [
    pendingNavigation,
    setPendingNavigation,
    navigate,
    tryLock,
    showLocation,
  ]);
};

export { usePendingNavigationHandler };

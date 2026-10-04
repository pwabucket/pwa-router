import { useLayoutEffect } from "react";
import { useNavigate } from "react-router";
import { getLocationPath } from "../../utils/location";
import type { PendingNavigation } from "./useFromPositionHandler";

/** Re-applies the location saved by useFromPositionHandler */
const usePendingNavigationHandler = (
  pendingNavigation: PendingNavigation | null,
  setPendingNavigation: (value: PendingNavigation | null) => void,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();

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

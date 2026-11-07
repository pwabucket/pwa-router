import { useLayoutEffect, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
  type NavigateOptions,
} from "react-router";
import { ROUTER_FROM_POSITION, routerState } from "../../../constants";
import type { ShowLocation } from "../../../lib/engine/transactions/LocationStateTransactions";

/** Location to re-apply once the history is back at the requested position */
interface PendingNavigation {
  location: Location;
  options: NavigateOptions;
}

/** A hook that goes back to a position first (e.g. mobile sidebars), saving the location to re-apply */
const useFromPositionHandler = (
  location: Location,
  tryLock: () => boolean,
  showLocation: ShowLocation,
) => {
  /* The router, the saved location, and the position to go back to */
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const fromPosition: number | undefined =
    location.state?.[ROUTER_FROM_POSITION];

  /* Go back to the position, saving the location to re-apply */
  useLayoutEffect(() => {
    if (fromPosition === undefined || !tryLock()) return;

    /* The location to re-apply, shown while the history goes back */
    const target = {
      ...location,
      state: { ...location.state, ...routerState.from(undefined) },
    };

    /* Save and show the location, then go back */
    // oxlint-disable-next-line react/set-state-in-effect
    setPendingNavigation({
      location: target,
      options: { replace: navigationType === "REPLACE", flushSync: true },
    });
    showLocation((shown) => shown ?? target);
    navigate(fromPosition);
  }, [
    fromPosition,
    location,
    navigationType,
    navigate,
    tryLock,
    showLocation,
  ]);

  /* The saved location and its setter */
  return [pendingNavigation, setPendingNavigation] as const;
};

export { useFromPositionHandler };
export type { PendingNavigation };

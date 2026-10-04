import { useLayoutEffect, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
  type NavigateOptions,
} from "react-router";
import { ROUTER_FROM_POSITION, routerState } from "../../constants";

/** Location to re-apply once the history is back at the requested position */
interface PendingNavigation {
  location: Location;
  options: NavigateOptions;
}

/** Goes back to a position first (e.g mobile sidebars), saving the location */
const useFromPositionHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const fromPosition: number | undefined =
    location.state?.[ROUTER_FROM_POSITION];

  useLayoutEffect(() => {
    if (fromPosition === undefined || !tryLock()) return;

    // oxlint-disable-next-line react/set-state-in-effect
    setPendingNavigation({
      location: {
        ...location,
        state: { ...location.state, ...routerState.from(undefined) },
      },
      options: { replace: navigationType === "REPLACE", flushSync: true },
    });
    navigate(fromPosition);
  }, [fromPosition, location, navigationType, navigate, tryLock]);

  return [pendingNavigation, setPendingNavigation] as const;
};

export { useFromPositionHandler };
export type { PendingNavigation };

import { useLayoutEffect } from "react";
import { useNavigationType, type Location } from "react-router";
import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
  routerState,
} from "../../../constants";
import { getLocationPath } from "../../../lib/engine/core/locationPath";
import type { HistoryDriver } from "../../../lib/engine/driver/HistoryDriver";
import type { ShowLocation } from "../../../lib/engine/transactions/LocationStateTransactions";

/** A hook that runs the state markers an app puts on its navigations (from, destroy, navigate) as driver intents */
const useStateMarkersHandler = (
  location: Location,
  tryLock: () => boolean,
  showLocation: ShowLocation,
  driver: HistoryDriver,
) => {
  /* How the entry was reached, and the markers it carries */
  const navigationType = useNavigationType();
  const fromPosition: number | undefined =
    location.state?.[ROUTER_FROM_POSITION];
  const destroyIndex: number | undefined =
    location.state?.[ROUTER_DESTROY_INDEX];
  const navigateIndex: number | undefined =
    location.state?.[ROUTER_NAVIGATE_INDEX];

  useLayoutEffect(() => {
    /* No marker, or another correction holds the entry */
    const hasMarker =
      fromPosition !== undefined ||
      destroyIndex !== undefined ||
      navigateIndex !== undefined;
    if (!hasMarker || !tryLock()) return;

    /* The entry without its markers */
    const path = getLocationPath(location);
    const target: Location = {
      ...location,
      state: {
        ...location.state,
        ...routerState.from(undefined),
        ...routerState.destroy(undefined),
        ...routerState.navigate(undefined),
      },
    };

    /* From a position: go back first, then apply the entry there, showing it all along */
    if (fromPosition !== undefined) {
      const isReplace = navigationType === "REPLACE";
      showLocation((shown) => shown ?? target);

      driver.run(async (moves) => {
        await moves.go(fromPosition);
        await (isReplace ? moves.replace : moves.push)(path, target.state);
        showLocation((shown) => (shown === target ? null : shown));
      });
      return;
    }

    /* Destroy: reset the pointer, then land before the index */
    if (destroyIndex !== undefined) {
      driver.run(async (moves) => {
        await moves.push(path, target.state);
        await moves.go(destroyIndex - window.history.length - 1);
      });
      return;
    }

    /* Navigate: land before the index */
    driver.run(async (moves) => {
      await moves.go(navigateIndex! - window.history.length - 1);
    });
  }, [
    fromPosition,
    destroyIndex,
    navigateIndex,
    location,
    navigationType,
    tryLock,
    showLocation,
    driver,
  ]);
};

export { useStateMarkersHandler };

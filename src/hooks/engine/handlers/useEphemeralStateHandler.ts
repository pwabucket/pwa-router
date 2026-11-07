import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useNavigationType, type Location } from "react-router";
import { routerState } from "../../../constants";
import {
  getLocationPath,
  readLocationIndex,
} from "../../../lib/router/location";
import {
  readEphemeralKeys,
  removeEphemeralValues,
} from "../../../lib/layers/ephemeralState";

/** A hook that closes ephemeral (persist: false) values restored after a reload */
const useEphemeralStateHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  /* The router's navigate, the navigation type, and the entries made this session */
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const sessionEntryKeysRef = useRef(new Set<string>());

  /* The router subscribes to history after our first layout effect */
  const [isRouterListening, setIsRouterListening] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setIsRouterListening(true);
  }, []);

  const state = location.state;

  /* A POP to an entry not created this session was restored by the browser */
  const isRestoredEntry =
    navigationType === "POP" &&
    // oxlint-disable-next-line react/refs
    !sessionEntryKeysRef.current.has(location.key);

  /* The ephemeral values the restored entry still holds */
  const ephemeralKeys = readEphemeralKeys(state);
  const staleEphemeralKeys = isRestoredEntry
    ? Object.keys(ephemeralKeys).filter((key) => state[key] !== undefined)
    : [];
  const hasStaleEphemeralState = staleEphemeralKeys.length > 0;

  /* Earliest stamped index to return to, Infinity when none was stamped */
  const returnIndex = Math.min(
    ...staleEphemeralKeys.map(
      (key) => readLocationIndex(state, ephemeralKeys[key]) ?? Infinity,
    ),
  );

  /* Hides stale values from hooks while the correction is pending */
  const sanitizedLocation = useMemo<Location>(
    () =>
      hasStaleEphemeralState
        ? { ...location, state: removeEphemeralValues(location.state) }
        : location,
    [hasStaleEphemeralState, location],
  );

  /* Remember the entries this session makes, then close the stale values once */
  useLayoutEffect(() => {
    if (navigationType !== "POP") sessionEntryKeysRef.current.add(location.key);
    if (!hasStaleEphemeralState || !isRouterListening || !tryLock()) return;

    /* Without a usable stamp, go back once when an entry is behind */
    const canReturnToIndex = returnIndex < window.history.length;

    if (!canReturnToIndex && window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    /* Return to the index like closing a toggle, or just drop the values */
    navigate(getLocationPath(location), {
      replace: true,
      flushSync: true,
      state: {
        ...sanitizedLocation.state,
        ...routerState.destroy(canReturnToIndex ? returnIndex : undefined),
      },
    });
  }, [
    hasStaleEphemeralState,
    isRouterListening,
    returnIndex,
    sanitizedLocation,
    location,
    navigationType,
    navigate,
    tryLock,
  ]);

  /* The location to show, and whether stale values are closing */
  return { sanitizedLocation, hasStaleEphemeralState };
};

export { useEphemeralStateHandler };

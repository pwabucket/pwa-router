import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import { readEntry } from "../../../lib/engine/core/record";
import {
  readNonPersistentKeys,
  readValuePosition,
  removeValues,
} from "../../../lib/engine/core/queries";
import { readHistoryIndex } from "../../../lib/engine/history/historyIndex";
import { getLocationPath } from "../../../lib/engine/core/locationPath";
import type { HistoryDriver } from "../../../lib/engine/driver/HistoryDriver";

/** A hook that discards ephemeral (persist: false) values restored after a reload */
const useEphemeralStateHandler = (
  location: Location,
  tryLock: () => boolean,
  driver: HistoryDriver,
) => {
  /* The router, how the location was reached, and the entries created this session */
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const sessionEntryKeysRef = useRef(new Set<string>());

  /* The router subscribes to history after our first layout effect */
  const [isRouterListening, setIsRouterListening] = useState(false);

  /* Mark the router as listening after the first render */
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setIsRouterListening(true);
  }, []);

  /* The current entry's state */
  const state = location.state;

  /* A POP to an entry not created this session was restored by the browser */
  const isRestoredEntry =
    navigationType === "POP" &&
    // oxlint-disable-next-line react/refs
    !sessionEntryKeysRef.current.has(location.key);

  /* The values a restored entry can't keep, and the earliest first push to return before */
  const { staleEphemeralKeys, returnIndex } = useMemo(() => {
    /* A restored entry's ephemeral keys, and where each was first pushed */
    const keys = isRestoredEntry ? readNonPersistentKeys(state) : [];
    const { record } = readEntry(state);
    const positions = keys.map(
      (key) => readValuePosition(record, key, "first") ?? Infinity,
    );

    return { staleEphemeralKeys: keys, returnIndex: Math.min(...positions) };
  }, [isRestoredEntry, state]);

  /* Whether any value is stale */
  const hasStaleEphemeralState = staleEphemeralKeys.length > 0;

  /* The location with stale values hidden while the correction is pending */
  const sanitizedLocation = useMemo<Location>(
    () =>
      hasStaleEphemeralState
        ? {
            ...location,
            state: removeValues(location.state, staleEphemeralKeys),
          }
        : location,
    [hasStaleEphemeralState, location, staleEphemeralKeys],
  );

  /* Remember new entries, and correct a restored entry's stale values */
  useLayoutEffect(() => {
    /* Remember entries created this session */
    if (navigationType !== "POP") sessionEntryKeysRef.current.add(location.key);
    /* Correct only stale values, once the router listens */
    if (!hasStaleEphemeralState || !isRouterListening || !tryLock()) return;

    /* Whether the first push is still in the history */
    const canReturnToIndex = returnIndex < window.history.length;

    /* Out of reach: go back one entry instead */
    if (!canReturnToIndex && (readHistoryIndex() ?? 0) > 0) {
      navigate(-1);
      return;
    }

    /* Return before the first push like closing it: reset the pointer, then jump */
    if (canReturnToIndex) {
      driver.run(async (moves) => {
        await moves.push(getLocationPath(location), sanitizedLocation.state);
        await moves.go(returnIndex - window.history.length - 1);
      });
      return;
    }

    /* Nothing to return to: just drop the values */
    navigate(getLocationPath(location), {
      replace: true,
      flushSync: true,
      state: sanitizedLocation.state,
    });
  }, [
    driver,
    hasStaleEphemeralState,
    isRouterListening,
    returnIndex,
    sanitizedLocation,
    location,
    navigationType,
    navigate,
    tryLock,
  ]);

  /* The location without stale values, and whether any were found */
  return { sanitizedLocation, hasStaleEphemeralState };
};

export { useEphemeralStateHandler };

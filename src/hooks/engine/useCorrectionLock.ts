import { useCallback, useLayoutEffect, useRef } from "react";

/** A hook for a lock allowing one correction per location; the first handler to lock wins */
const useCorrectionLock = (locationKey: string) => {
  /* The location the lock belongs to, and whether it is taken */
  const lockedLocationKeyRef = useRef(locationKey);
  const isLockedRef = useRef(false);

  /* Unlock on a new location, before any handler runs */
  useLayoutEffect(() => {
    if (lockedLocationKeyRef.current === locationKey) return;
    lockedLocationKeyRef.current = locationKey;
    isLockedRef.current = false;
  }, [locationKey]);

  /* The lock: only the first call on each location gets true */
  return useCallback(() => {
    if (isLockedRef.current) return false;
    isLockedRef.current = true;
    return true;
    // A new identity per location re-runs the handlers' effects
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);
};

export { useCorrectionLock };

import { useCallback, useLayoutEffect, useRef } from "react";

/** Allows a single correction per location; the first handler to lock wins */
const useCorrectionLock = (locationKey: string) => {
  const lockedLocationKeyRef = useRef(locationKey);
  const isLockedRef = useRef(false);

  /* Unlock on a new location; runs before the handlers as it is called first */
  useLayoutEffect(() => {
    if (lockedLocationKeyRef.current === locationKey) return;
    lockedLocationKeyRef.current = locationKey;
    isLockedRef.current = false;
  }, [locationKey]);

  return useCallback(() => {
    if (isLockedRef.current) return false;
    isLockedRef.current = true;
    return true;
    // New identity per location, so the handlers' effects re-run
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);
};

export { useCorrectionLock };

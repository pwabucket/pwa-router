import { useLayoutEffect, useRef } from "react";

import { ROUTER_INDEX_PREFIX } from "../constants";
import { useNavigate } from "react-router";
import { usePWARouting } from "./usePWARouting";
import { getLocationPath } from "../utils/location";

/** Stamps the history length on the entry; call inside the dialog itself */
const useLocationIndexUpdater = (key: string) => {
  const indexStateKey = ROUTER_INDEX_PREFIX + key;
  const { resolvedLocation: location } = usePWARouting();
  const index: number | undefined = location.state?.[indexStateKey];
  const historyLengthOnMountRef = useRef(history.length);
  const isUnmountedRef = useRef(false);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (isUnmountedRef.current || index !== undefined) return;

    navigate(getLocationPath(location), {
      flushSync: true,
      replace: true,
      state: {
        ...location.state,
        [indexStateKey]: historyLengthOnMountRef.current,
      },
    });
  }, [index, indexStateKey, location, navigate]);
};

export { useLocationIndexUpdater };

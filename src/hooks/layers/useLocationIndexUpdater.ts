import { useLayoutEffect, useRef } from "react";

import { ROUTER_INDEX_PREFIX } from "../../constants";
import { useLocation } from "../router/useLocation";
import { useNavigate } from "../router/useNavigate";
import { getLocationPath } from "../../lib/router/location";

/** A hook that stamps the history length on the entry once; call it inside the dialog's content */
const useLocationIndexUpdater = (key: string) => {
  /* The stamp's state key and its value on the entry */
  const indexStateKey = ROUTER_INDEX_PREFIX + key;
  const location = useLocation();
  const index: number | undefined = location.state?.[indexStateKey];
  /* The history length when the content mounted, whether it unmounted, and navigate */
  const historyLengthOnMountRef = useRef(history.length);
  const isUnmountedRef = useRef(false);
  const navigate = useNavigate();

  /* Mark the unmount, so a late effect doesn't stamp */
  useLayoutEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  /* Stamp the entry once, in place */
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

import { useLayoutEffect, useRef } from "react";

import { useNavigate } from "react-router";
import { usePWARouting } from "./usePWARouting";

const useLocationIndexUpdater = (key: string) => {
  /* Create a unique key for storing index in location state */
  const stateKey = `__router_index_${key}`;

  /* Get location and index from location state */
  const { resolvedLocation: location } = usePWARouting();
  const index: number | undefined = location.state?.[stateKey];

  /* Ref to track initial history length */
  const historyRef = useRef(history.length);

  /* Ref to track component unmount */
  const unMountedRef = useRef(false);

  /* Get navigate function */
  const navigate = useNavigate();

  /* Track component unmount to prevent state updates */
  useLayoutEffect(() => {
    return () => {
      unMountedRef.current = true;
    };
  }, []);

  /* Ensure location has an index */
  useLayoutEffect(() => {
    /* If component is unmounted or index is already set, do nothing */
    if (unMountedRef.current || index !== undefined) return;

    /* Update location state with index */
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        flushSync: true,
        replace: true,
        state: { ...location.state, [stateKey]: historyRef.current },
      },
    );
  }, [index, stateKey, location, navigate]);
};

export { useLocationIndexUpdater };

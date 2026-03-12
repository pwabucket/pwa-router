import { useLocation, useNavigate } from "react-router";

import { useLayoutEffect } from "react";

const useLocationIndexUpdater = (key: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateKey = `__index_${key}`;
  const index: number | undefined = location.state?.[stateKey];

  /* Ensure location has an index */
  useLayoutEffect(() => {
    if (typeof index === "undefined") {
      navigate(location, {
        replace: true,
        state: { ...location.state, [stateKey]: history.length },
      });
    }
  }, [index, stateKey, location, navigate]);
};

export { useLocationIndexUpdater };

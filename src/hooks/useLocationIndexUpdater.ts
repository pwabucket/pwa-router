import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

const useLocationIndexUpdater = (key: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateKey = `__router_index_${key}`;
  const ref = useRef(history.length);
  const index: number | undefined = location.state?.[stateKey];

  /* Ensure location has an index */
  useLayoutEffect(() => {
    if (ref.current !== index) {
      navigate(location, {
        replace: true,
        state: { ...location.state, [stateKey]: ref.current },
      });
    }
  }, [index, stateKey, location, navigate]);
};

export { useLocationIndexUpdater };

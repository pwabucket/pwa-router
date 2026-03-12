import { useLocation, useNavigate } from "react-router";

import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { useLayoutEffect } from "react";

const PWARoutingProvider = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedLocation = location;
  const destroyIndex: number | undefined =
    location.state?.__router_destroy_index;
  const navigateIndex: number | undefined =
    location.state?.__router_navigate_index;

  /* Push a new state to the history stack to reset pointer */
  useLayoutEffect(() => {
    if (destroyIndex !== undefined) {
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        {
          state: {
            ...location.state,
            __router_destroy_index: undefined,
            __router_navigate_index: destroyIndex,
          },
        },
      );
    }
  }, [destroyIndex, location, navigate]);

  /* If navigateIndex is defined, navigate to the corresponding index in the history stack */
  useLayoutEffect(() => {
    if (navigateIndex !== undefined) {
      const delta = navigateIndex - window.history.length - 1;
      navigate(delta);
    }
  }, [navigateIndex, navigate]);

  return (
    <PWARoutingContext.Provider value={{ resolvedLocation }}>
      {children}
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };

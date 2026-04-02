import {
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
  type NavigateOptions,
} from "react-router";

import { PWARoutingContext } from "../contexts/PWARoutingContext";
import { useLayoutEffect, useState } from "react";
import {
  ROUTER_DESTROY_INDEX,
  ROUTER_FROM_POSITION,
  ROUTER_NAVIGATE_INDEX,
} from "../constants";

const PWARoutingProvider = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  const [tempLocation, setTempLocation] = useState<Location | null>(null);
  const [tempRouterOptions, setTempRouterOptions] =
    useState<NavigateOptions | null>(null);

  const state = location.state;
  const fromPosition: number | undefined = state?.[ROUTER_FROM_POSITION];
  const destroyIndex: number | undefined = state?.[ROUTER_DESTROY_INDEX];
  const navigateIndex: number | undefined = state?.[ROUTER_NAVIGATE_INDEX];

  /** Final resolved location, this should be passed to <Routes> */
  const resolvedLocation = tempLocation || location;

  useLayoutEffect(() => {
    /**
     * If we want to navigate from a particular position, we store the current location temporarily
     * then navigate back to that position first before we update the history.
     *
     * E.g Mobile sidebars that needs to replace the location
     */
    if (fromPosition !== undefined) {
      const newLocation: Location = {
        ...location,
        state: {
          ...location.state,
          [ROUTER_FROM_POSITION]: undefined,
        },
      };

      // eslint-disable-next-line
      setTempLocation(newLocation);
      setTempRouterOptions({
        replace: navigationType === "REPLACE",
        flushSync: true,
      });

      /** Go back to the position */
      navigate(fromPosition);
      return;
    }

    /**
     * Assuming we have a modal with an iframe inside, closing the modal by navigating back won't work if the iframe
     * has made additional navigation, so we need to navigate forward to reset the history pointer, then pick it up
     * with ROUTER_NAVIGATE_INDEX.
     *
     * This can be used even for layouts that has made nested navigation.
     */
    if (destroyIndex !== undefined) {
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        {
          flushSync: true,
          state: {
            ...location.state,
            [ROUTER_DESTROY_INDEX]: undefined,
            [ROUTER_NAVIGATE_INDEX]: destroyIndex,
          },
        },
      );
      return;
    }

    /**
     * If navigateIndex is defined, navigate to the corresponding index in the history stack,
     * swiping / pressing back should work as expected since we've reset the pointer through ROUTER_DESTROY_INDEX
     */
    if (navigateIndex !== undefined) {
      const delta = navigateIndex - window.history.length - 1;
      navigate(delta);
      return;
    }

    /**
     * Here we update the history with exactly what we have in tempLocation once we've navigated to the
     * specified position
     */
    if (tempLocation) {
      setTempLocation(null);
      setTempRouterOptions(null);

      navigate(
        {
          pathname: tempLocation.pathname,
          search: tempLocation.search,
          hash: tempLocation.hash,
        },
        {
          ...tempRouterOptions,
          state: {
            ...tempLocation.state,
            ...tempRouterOptions?.state,
          },
        },
      );
    }
  }, [
    fromPosition,
    destroyIndex,
    navigateIndex,
    tempLocation,
    tempRouterOptions,
    location,
    navigationType,
    navigate,
  ]);

  return (
    <PWARoutingContext.Provider value={{ resolvedLocation }}>
      {children}
    </PWARoutingContext.Provider>
  );
};

export { PWARoutingProvider };

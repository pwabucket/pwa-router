import { useLayoutEffect } from "react";
import { useNavigate, type Location } from "react-router";
import { ROUTER_DESTROY_INDEX, routerState } from "../../../constants";
import { getLocationPath } from "../../../lib/router/location";

/** A hook that pushes an entry to drop forward history (e.g. iframes), then hands over to the navigate-index marker */
const useDestroyIndexHandler = (location: Location, tryLock: () => boolean) => {
  /* The router's navigate and the marker on the entry */
  const navigate = useNavigate();
  const destroyIndex: number | undefined =
    location.state?.[ROUTER_DESTROY_INDEX];

  /* Push the same location, carrying the index to go back to */
  useLayoutEffect(() => {
    if (destroyIndex === undefined || !tryLock()) return;

    navigate(getLocationPath(location), {
      flushSync: true,
      state: {
        ...location.state,
        ...routerState.destroy(undefined),
        ...routerState.navigate(destroyIndex),
      },
    });
  }, [destroyIndex, location, navigate, tryLock]);
};

export { useDestroyIndexHandler };

import { useLayoutEffect } from "react";
import { useNavigate, type Location } from "react-router";
import { ROUTER_DESTROY_INDEX, routerState } from "../../../constants";
import { getLocationPath } from "../../../lib/engine/core/locationPath";

/** A hook that pushes an entry to drop forward history (e.g. iframes), then hands over to the jump */
const useDestroyIndexHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  /* The router, and the index to jump to after the push */
  const navigate = useNavigate();
  const destroyIndex: number | undefined =
    location.state?.[ROUTER_DESTROY_INDEX];

  /* Push the location again, stamped with the index to jump to */
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

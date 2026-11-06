import { useLayoutEffect } from "react";
import { useNavigate, type Location } from "react-router";
import { ROUTER_DESTROY_INDEX, routerState } from "../../constants";
import { getLocationPath } from "../../utils/location";

/** Pushes an entry to drop forward history (e.g iframes), then hands over */
const useDestroyIndexHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();
  const destroyIndex: number | undefined =
    location.state?.[ROUTER_DESTROY_INDEX];

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

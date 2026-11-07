import { useLayoutEffect } from "react";
import { useNavigate, type Location } from "react-router";
import { ROUTER_NAVIGATE_INDEX } from "../../../constants";

/** A hook that jumps back to the entry before the stamped index */
const useNavigateIndexHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  /* The router, and the stamped index */
  const navigate = useNavigate();
  const navigateIndex: number | undefined =
    location.state?.[ROUTER_NAVIGATE_INDEX];

  /* Jump back once an index is stamped */
  useLayoutEffect(() => {
    if (navigateIndex === undefined || !tryLock()) return;

    /* Land on the entry before the stamped one */
    navigate(navigateIndex - window.history.length - 1);
  }, [navigateIndex, navigate, tryLock]);
};

export { useNavigateIndexHandler };

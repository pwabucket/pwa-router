import { useLayoutEffect } from "react";
import { useNavigate, type Location } from "react-router";
import { ROUTER_NAVIGATE_INDEX } from "../../../constants";

/** A hook that jumps back to the entry before the stamped index */
const useNavigateIndexHandler = (
  location: Location,
  tryLock: () => boolean,
) => {
  /* The router's navigate and the marker on the entry */
  const navigate = useNavigate();
  const navigateIndex: number | undefined =
    location.state?.[ROUTER_NAVIGATE_INDEX];

  useLayoutEffect(() => {
    if (navigateIndex === undefined || !tryLock()) return;

    /* The index is stamped by the dialog itself, so - 1 lands before it */
    navigate(navigateIndex - window.history.length - 1);
  }, [navigateIndex, navigate, tryLock]);
};

export { useNavigateIndexHandler };

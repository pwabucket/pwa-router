import { useLayoutEffect } from "react";
import { ROUTER_STATUS_ATTRIBUTE } from "../../constants";
import { useRoutingSelector } from "../../hooks/router/useRoutingSelector";

/** A probe exposing the engine's status to end-to-end tests; render it in test builds */
const RouterStatusProbe = () => {
  /* The engine's status */
  const isCorrecting = useRoutingSelector((view) => view.isCorrecting);

  /* Mirror the status on the root element */
  useLayoutEffect(() => {
    document.documentElement.setAttribute(
      ROUTER_STATUS_ATTRIBUTE,
      String(isCorrecting),
    );
  }, [isCorrecting]);

  return null;
};

export { RouterStatusProbe };

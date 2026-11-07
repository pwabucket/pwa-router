import { useEffect } from "react";
import type { NavigateProps } from "react-router";
import { useNavigate } from "../../hooks/router/useNavigate";
import { useRoutingSelector } from "../../hooks/router/useRoutingSelector";

/** Props of this package's Navigate */
interface PWANavigateProps extends NavigateProps {
  /** Leave the tabbed area, clearing every tab's history (e.g. logout) */
  exitTabs?: boolean;
}

/** A component that navigates once the engine has finished correcting */
const Navigate = ({
  to,
  replace,
  state,
  relative,
  exitTabs,
}: PWANavigateProps) => {
  /* The engine-aware navigate and the engine's status */
  const navigate = useNavigate();
  const isCorrecting = useRoutingSelector((view) => view.isCorrecting);

  /* Navigate once the engine is idle */
  useEffect(() => {
    /* Retried once the correction is done */
    if (!isCorrecting) navigate(to, { replace, state, relative, exitTabs });
  }, [isCorrecting, navigate, to, replace, state, relative, exitTabs]);

  return null;
};

export { Navigate };
export type { PWANavigateProps };

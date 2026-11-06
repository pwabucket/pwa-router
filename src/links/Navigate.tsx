import { useEffect } from "react";
import type { NavigateProps } from "react-router";
import { useNavigate } from "../router/useNavigate";
import { usePWARouting } from "../router/usePWARouting";

/** Props of this package's Navigate */
interface PWANavigateProps extends NavigateProps {
  /** Leave the tabbed area, clearing every tab's history (e.g. logout) */
  exitTabs?: boolean;
}

/** Engine-aware Navigate; waits for corrections to finish before navigating */
const Navigate = ({
  to,
  replace,
  state,
  relative,
  exitTabs,
}: PWANavigateProps) => {
  const navigate = useNavigate();
  const { isCorrecting } = usePWARouting();

  useEffect(() => {
    /* Retried once the correction is done */
    if (!isCorrecting) navigate(to, { replace, state, relative, exitTabs });
  }, [isCorrecting, navigate, to, replace, state, relative, exitTabs]);

  return null;
};

export { Navigate };
export type { PWANavigateProps };

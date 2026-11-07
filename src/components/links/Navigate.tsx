import { Navigate as RouterNavigate, type NavigateProps } from "react-router";
import { usePWARouting } from "../../hooks/router/usePWARouting";
import { useReplaceDefault } from "../../hooks/links/useReplaceDefault";

/** React Router's Navigate; waits while the provider is correcting, and replaces entries holding non-inherited values */
const Navigate = (props: NavigateProps) => {
  /* Whether a correction runs, and the replace default */
  const { isCorrecting } = usePWARouting();
  const replace = useReplaceDefault(props.replace);

  return isCorrecting ? null : <RouterNavigate {...props} replace={replace} />;
};

export { Navigate };

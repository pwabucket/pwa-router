import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router";
import { useReplaceDefault } from "../../hooks/links/useReplaceDefault";

/** React Router's Link; replaces entries holding non-inherited values */
const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <RouterLink ref={ref} {...props} replace={useReplaceDefault(props.replace)} />
));

Link.displayName = "Link";

export { Link };

import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router";
import { useLinkProps } from "./useLinkProps";

/** Engine-aware Link; ignored while correcting, replaces non-inherited entries */
const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <RouterLink ref={ref} {...props} {...useLinkProps(props)} />
));

Link.displayName = "Link";

export { Link };

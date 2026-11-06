import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router";
import { useLinkProps, type PWALinkOwnProps } from "./useLinkProps";

/** Props of this package's Link */
type PWALinkProps = LinkProps & PWALinkOwnProps;

/** Engine-aware Link; ignored while correcting, replaces non-inherited entries */
const Link = forwardRef<HTMLAnchorElement, PWALinkProps>(
  ({ exitTabs, ...props }, ref) => (
    <RouterLink
      ref={ref}
      {...props}
      {...useLinkProps({ ...props, exitTabs })}
    />
  ),
);

Link.displayName = "Link";

export { Link };
export type { PWALinkProps };

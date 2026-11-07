import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router";
import {
  useLinkProps,
  type PWALinkOwnProps,
} from "../../hooks/links/useLinkProps";

/** Props of this package's Link */
type PWALinkProps = LinkProps & PWALinkOwnProps;

/** A link aware of the engine: ignored while correcting, and replacing non-inherited entries */
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

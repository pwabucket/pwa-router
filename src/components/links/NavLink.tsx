import { forwardRef } from "react";
import { NavLink as RouterNavLink, type NavLinkProps } from "react-router";
import { useReplaceDefault } from "../../hooks/links/useReplaceDefault";

/** React Router's NavLink; replaces entries holding non-inherited values */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>((props, ref) => (
  <RouterNavLink
    ref={ref}
    {...props}
    replace={useReplaceDefault(props.replace)}
  />
));

NavLink.displayName = "NavLink";

export { NavLink };

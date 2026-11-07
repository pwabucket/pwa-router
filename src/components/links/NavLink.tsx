import { forwardRef, useContext, useMemo } from "react";
import {
  NavLink as RouterNavLink,
  UNSAFE_LocationContext as LocationContext,
  type NavLinkProps,
} from "react-router";
import { usePWARouting } from "../../hooks/router/usePWARouting";
import { useLinkProps, type PWALinkOwnProps } from "../../hooks/links/useLinkProps";

/** Props of this package's NavLink */
type PWANavLinkProps = NavLinkProps & PWALinkOwnProps;

/** A nav link aware of the engine: its active state follows the resolved location */
const NavLink = forwardRef<HTMLAnchorElement, PWANavLinkProps>(
  ({ exitTabs, ...props }, ref) => {
    /* The router's location context, the resolved location and the link's props */
    const locationContext = useContext(LocationContext);
    const { resolvedLocation } = usePWARouting();
    const linkProps = useLinkProps({ ...props, exitTabs });

    /* RouterNavLink matches against the location from this context */
    const resolvedLocationContext = useMemo(
      () => ({ ...locationContext, location: resolvedLocation }),
      [locationContext, resolvedLocation],
    );

    /* The nav link, matched against the resolved location */
    return (
      <LocationContext.Provider value={resolvedLocationContext}>
        <RouterNavLink ref={ref} {...props} {...linkProps} />
      </LocationContext.Provider>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
export type { PWANavLinkProps };

import { forwardRef, useContext, useMemo } from "react";
import {
  NavLink as RouterNavLink,
  UNSAFE_LocationContext as LocationContext,
  type NavLinkProps,
} from "react-router";
import { usePWARouting } from "../hooks/usePWARouting";
import { useLinkProps } from "./useLinkProps";

/** Engine-aware NavLink; active state follows the resolved location */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>((props, ref) => {
  const locationContext = useContext(LocationContext);
  const { resolvedLocation } = usePWARouting();
  const linkProps = useLinkProps(props);

  /* RouterNavLink matches against the location from this context */
  const resolvedLocationContext = useMemo(
    () => ({ ...locationContext, location: resolvedLocation }),
    [locationContext, resolvedLocation],
  );

  return (
    <LocationContext.Provider value={resolvedLocationContext}>
      <RouterNavLink ref={ref} {...props} {...linkProps} />
    </LocationContext.Provider>
  );
});

NavLink.displayName = "NavLink";

export { NavLink };

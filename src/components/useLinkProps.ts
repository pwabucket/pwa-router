import { useCallback } from "react";
import type { LinkProps } from "react-router";
import { usePWARouting } from "../hooks/usePWARouting";
import { isNonInheritedEntry } from "../utils/nonInheritedState";

/** Overrides shared by Link and NavLink */
const useLinkProps = ({
  replace,
  onClick,
}: Pick<LinkProps, "replace" | "onClick">) => {
  const { resolvedLocation: location, isCorrecting } = usePWARouting();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      /* Navigating now would race the engine */
      if (isCorrecting) event.preventDefault();
    },
    [isCorrecting, onClick],
  );

  return {
    replace: replace ?? isNonInheritedEntry(location.state),
    onClick: handleClick,
  };
};

export { useLinkProps };

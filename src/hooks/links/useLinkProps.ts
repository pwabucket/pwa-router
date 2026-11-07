import { useCallback, useContext } from "react";
import { useResolvedPath, type LinkProps } from "react-router";
import { TabsEngineContext } from "../../contexts/tabs/TabsEngineContext";
import { useExitArea } from "../tabs/useExitArea";
import { usePWARouting } from "../router/usePWARouting";
import { isNonInheritedEntry } from "../../lib/engine/core/queries";

/** Props of this package's links, on top of React Router's */
interface PWALinkOwnProps {
  /** Leave the tabbed area, clearing every tab's history (e.g. logout) */
  exitTabs?: boolean;
}

/** A hook for the props Link and NavLink override */
const useLinkProps = ({
  to,
  replace,
  state,
  onClick,
  exitTabs,
}: Pick<LinkProps, "to" | "replace" | "state" | "onClick"> &
  PWALinkOwnProps) => {
  /* The engine's view, the tabs engine, the area to exit and the target path */
  const {
    resolvedLocation: location,
    isCorrecting,
    isInactive,
  } = usePWARouting();
  const tabsEngine = useContext(TabsEngineContext);
  const exitArea = useExitArea();
  const resolvedTo = useResolvedPath(to);

  /* The handler for clicks on the link */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      /* Run the caller's own handler first */
      onClick?.(event);

      /* Navigating now would race the engine, or come from a tab that isn't active */
      if (isCorrecting || isInactive) {
        event.preventDefault();
        return;
      }

      /* Leaving the tabbed area runs as a tab operation */
      if (exitTabs && tabsEngine && exitArea && !event.defaultPrevented) {
        event.preventDefault();
        tabsEngine.queueTabsOp({
          kind: "exit",
          area: exitArea,
          to: resolvedTo,
          options: { replace, state },
        });
      }
    },
    [
      onClick,
      isCorrecting,
      isInactive,
      exitTabs,
      tabsEngine,
      exitArea,
      resolvedTo,
      replace,
      state,
    ],
  );

  /* Replace non-inherited entries unless told otherwise, and handle clicks */
  return {
    replace: replace ?? isNonInheritedEntry(location.state),
    onClick: handleClick,
  };
};

export { useLinkProps };
export type { PWALinkOwnProps };

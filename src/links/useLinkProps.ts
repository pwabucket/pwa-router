import { useCallback, useContext } from "react";
import { useResolvedPath, type LinkProps } from "react-router";
import { TabsEngineContext } from "../tabs/TabsEngineContext";
import { useExitArea } from "../tabs/useExitArea";
import { usePWARouting } from "../router/usePWARouting";
import { isNonInheritedEntry } from "../engine/core/queries";

/** Props of this package's links, on top of React Router's */
interface PWALinkOwnProps {
  /** Leave the tabbed area, clearing every tab's history (e.g. logout) */
  exitTabs?: boolean;
}

/** Overrides shared by Link and NavLink */
const useLinkProps = ({
  to,
  replace,
  state,
  onClick,
  exitTabs,
}: Pick<LinkProps, "to" | "replace" | "state" | "onClick"> &
  PWALinkOwnProps) => {
  const {
    resolvedLocation: location,
    isCorrecting,
    isInactive,
  } = usePWARouting();
  const tabsEngine = useContext(TabsEngineContext);
  const exitArea = useExitArea();
  const resolvedTo = useResolvedPath(to);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
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

  return {
    replace: replace ?? isNonInheritedEntry(location.state),
    onClick: handleClick,
  };
};

export { useLinkProps };
export type { PWALinkOwnProps };

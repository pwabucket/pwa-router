import { useCallback, useContext, useRef } from "react";
import {
  resolvePath,
  useNavigate as useRouterNavigate,
  type NavigateOptions,
  type To,
} from "react-router";
import { TabsEngineContext } from "../contexts/TabsEngineContext";
import { useExitArea } from "./useExitArea";
import { usePWARouting } from "./usePWARouting";
import { isNonInheritedEntry } from "../core/queries";

/** Navigate options, plus leaving a tabbed area */
interface PWANavigateOptions extends NavigateOptions {
  /** Leave the tabbed area, clearing every tab's history (e.g. logout) */
  exitTabs?: boolean;
}

/** An engine-aware navigate function */
interface PWANavigateFunction {
  (to: To, options?: PWANavigateOptions): void;
  (delta: number): void;
}

/** Engine-aware navigate; ignored while correcting or in a hidden tab, replaces non-inherited entries */
const useNavigate = (): PWANavigateFunction => {
  const navigate = useRouterNavigate();
  const routing = usePWARouting();
  const tabsEngine = useContext(TabsEngineContext);
  const exitArea = useExitArea();

  /* Keeps the function stable across navigations */
  const latestRef = useRef({ navigate, routing, tabsEngine, exitArea });

  // oxlint-disable-next-line react/refs
  latestRef.current = { navigate, routing, tabsEngine, exitArea };

  return useCallback((to: To | number, options?: PWANavigateOptions) => {
    const { navigate, routing, tabsEngine, exitArea } = latestRef.current;
    const { resolvedLocation: location, isCorrecting, isInactive } = routing;

    /* Navigating now would race the engine, or come from a hidden tab */
    if (isCorrecting || isInactive) return;

    if (typeof to === "number") {
      navigate(to);
      return;
    }

    const { exitTabs, ...navigateOptions } = options ?? {};

    /* Leaving the tabbed area runs as a tab operation */
    if (exitTabs && tabsEngine && exitArea) {
      tabsEngine.queueTabsOp({
        kind: "exit",
        area: exitArea,
        to: resolvePath(to, location.pathname),
        options: navigateOptions,
      });
      return;
    }

    navigate(to, {
      ...navigateOptions,
      replace: navigateOptions.replace ?? isNonInheritedEntry(location.state),
    });
  }, []) as PWANavigateFunction;
};

export { useNavigate };
export type { PWANavigateFunction, PWANavigateOptions };

import { useCallback, useContext, useRef } from "react";
import {
  resolvePath,
  useNavigate as useRouterNavigate,
  type NavigateOptions,
  type To,
} from "react-router";
import { TabsEngineContext } from "../../contexts/tabs/TabsEngineContext";
import { useExitArea } from "../tabs/useExitArea";
import { useRoutingStore } from "./useRoutingStore";
import { isNonInheritedEntry } from "../../lib/engine/core/queries";

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

/** A hook for a navigate aware of the engine: ignored while correcting or in a tab that isn't active, and replacing non-inherited entries */
const useNavigate = (): PWANavigateFunction => {
  /* React Router's navigate, the routing store read when navigating, the tabs engine and the area to exit */
  const navigate = useRouterNavigate();
  const routingStore = useRoutingStore();
  const tabsEngine = useContext(TabsEngineContext);
  const exitArea = useExitArea();

  /* Keeps the function stable across navigations */
  const latestRef = useRef({ navigate, tabsEngine, exitArea });

  // oxlint-disable-next-line react/refs
  latestRef.current = { navigate, tabsEngine, exitArea };

  /* The engine-aware navigate, stable across navigations */
  return useCallback(
    (to: To | number, options?: PWANavigateOptions) => {
      /* The latest navigate and tabs parts, and the view as it is now */
      const { navigate, tabsEngine, exitArea } = latestRef.current;
      const {
        resolvedLocation: location,
        isCorrecting,
        isInactive,
      } = routingStore.getView();

      /* Navigating now would race the engine, or come from a tab that isn't active */
      if (isCorrecting || isInactive) return;

      /* A delta goes through as is */
      if (typeof to === "number") {
        navigate(to);
        return;
      }

      /* The options without the tabs flag */
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

      /* Navigate, replacing non-inherited entries unless told otherwise */
      navigate(to, {
        ...navigateOptions,
        replace: navigateOptions.replace ?? isNonInheritedEntry(location.state),
      });
    },
    [routingStore],
  ) as PWANavigateFunction;
};

export { useNavigate };
export type { PWANavigateFunction, PWANavigateOptions };

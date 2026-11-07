import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
} from "react";
import { ROUTER_GUARD } from "../../constants";
import { LeaveGuardsContext } from "../../contexts/guards/LeaveGuardsContext";
import { RouterNavigateContext } from "../../contexts/router/RouterNavigateContext";
import { LocationStateTransactionsContext } from "../../contexts/layers/LocationStateTransactionsContext";
import { TabsOperationsContext } from "../../contexts/tabs/TabsOperationsContext";
import { TabViewContext } from "../../contexts/tabs/TabViewContext";
import { readHistoryIndex } from "../../lib/engine/history/historyIndex";
import { questionChange } from "../../lib/guards/LeaveGuardRegistry";
import { getLocationPath } from "../../lib/engine/core/locationPath";
import { useRoutingSelector } from "../router/useRoutingSelector";

/** Options of a leave guard */
interface UseLeaveGuardOptions {
  /** There is unsaved work to protect */
  when: boolean;
  /** The key of the layer to guard (e.g. a dialog's toggle); without one the guard covers the page */
  key?: string;
  /** Also show the browser's own warning on reload and closing the tab (default: true) */
  warnOnUnload?: boolean;
}

/** A leave guard's question and its answers */
interface LeaveGuardControls {
  /** A move was blocked: show the question */
  isBlocked: boolean;
  /** Closes the question and stays where the user was */
  stay: () => void;
  /** Closes the question and finishes the blocked move */
  leave: () => void;
}

/** A hook that asks before leaving a page or layer with unsaved work, however the user tries to leave */
const useLeaveGuard = ({
  when,
  key,
  warnOnUnload = true,
}: UseLeaveGuardOptions): LeaveGuardControls => {
  /* The guard's id, the router's parts, its tab and the location */
  const id = useId();
  const guards = useContext(LeaveGuardsContext)!;
  const queueChange = useContext(LocationStateTransactionsContext)!;
  const queueTabsOp = useContext(TabsOperationsContext)!;
  const tab = useContext(TabViewContext);
  const navigate = useContext(RouterNavigateContext)!;

  /* The guarded page, and whether this guard's question is open */
  const pathname = useRoutingSelector((view) => view.resolvedLocation.pathname);
  const isBlocked = useRoutingSelector(
    (view) => view.resolvedLocation.state?.[ROUTER_GUARD] === id,
  );

  /* Register the guard, and remove it on unmount */
  useLayoutEffect(() => {
    guards.set(id, { key, pathname, when, tab });
  }, [guards, id, key, pathname, when, tab]);

  useLayoutEffect(() => () => guards.delete(id), [guards, id]);

  /* The browser's own warning on reload and closing the tab */
  useEffect(() => {
    /* Warn only with unsaved work and the warning on */
    if (!when || !warnOnUnload) return;

    /* The handler showing the browser's warning */
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    /* Listen while the warning applies */
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when, warnOnUnload]);

  /** Closes the question and stays */
  const stay = useCallback(() => {
    /* Drop the blocked move and close the question */
    guards.takeAttempt();
    queueChange(questionChange());
  }, [guards, queueChange]);

  /** Closes the question and finishes the blocked move */
  const leave = useCallback(() => {
    /* The blocked move, and the latest navigate and tabs engine */
    const attempt = guards.takeAttempt();

    /* Nothing blocked by this guard: just close the question */
    if (attempt?.guardId !== id) {
      queueChange(questionChange());
      return;
    }

    /* Let the move through */
    guards.markLeaving(id);

    switch (attempt.kind) {
      /* Back or forward: go to the entry it was heading for */
      case "pop":
        navigate(attempt.targetIndex - (readHistoryIndex() ?? 0));
        break;

      /* A navigation: it takes the question's place */
      case "navigation":
        navigate(getLocationPath(attempt.location), {
          replace: true,
          state: attempt.location.state,
        });
        break;

      /* Location state changes: replay them with the question closed */
      case "changes":
        queueChange(questionChange());
        for (const change of attempt.changes) queueChange(change);
        break;

      /* A tab operation: replay it; it closes the question with everything else */
      case "tabs":
        queueChange(questionChange());
        queueTabsOp(attempt.op);
        break;
    }
  }, [guards, id, navigate, queueChange, queueTabsOp]);

  /* The question's status and its answers */
  return useMemo(() => ({ isBlocked, stay, leave }), [isBlocked, stay, leave]);
};

export { useLeaveGuard };
export type { LeaveGuardControls, UseLeaveGuardOptions };

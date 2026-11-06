import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router";
import { ROUTER_GUARD } from "../constants";
import { LeaveGuardsContext } from "./LeaveGuardsContext";
import { LocationStateTransactionsContext } from "../layers/LocationStateTransactionsContext";
import { TabsEngineContext } from "../tabs/TabsEngineContext";
import { TabViewContext } from "../tabs/TabViewContext";
import { readHistoryIndex } from "../utils/history";
import { questionChange } from "./LeaveGuardRegistry";
import { getLocationPath } from "../utils/location";
import { useLocation } from "../router/useLocation";

/** Options of a leave guard */
interface UseLeaveGuardOptions {
  /** There is unsaved work to protect */
  when: boolean;
  /** The key of the layer to guard (e.g. a dialog's toggle); without one the guard covers the page */
  key?: string;
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
}: UseLeaveGuardOptions): LeaveGuardControls => {
  const id = useId();
  const guards = useContext(LeaveGuardsContext)!;
  const queueChange = useContext(LocationStateTransactionsContext)!;
  const tabsEngine = useContext(TabsEngineContext);
  const tab = useContext(TabViewContext);
  const navigate = useNavigate();
  const location = useLocation();

  /* The guarded page, and whether this guard's question is open */
  const { pathname } = location;
  const isBlocked = location.state?.[ROUTER_GUARD] === id;

  /* Keeps the actions stable across navigations */
  const latestRef = useRef({ navigate, tabsEngine });

  // oxlint-disable-next-line react/refs
  latestRef.current = { navigate, tabsEngine };

  /* Register the guard, and remove it on unmount */
  useLayoutEffect(() => {
    guards.set(id, { key, pathname, when, tab });
  }, [guards, id, key, pathname, when, tab]);

  useLayoutEffect(() => () => guards.delete(id), [guards, id]);

  /* The browser's own warning on reload and closing the tab */
  useEffect(() => {
    if (!when) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when]);

  /** Closes the question and stays */
  const stay = useCallback(() => {
    guards.takeAttempt();
    queueChange(questionChange());
  }, [guards, queueChange]);

  /** Closes the question and finishes the blocked move */
  const leave = useCallback(() => {
    const attempt = guards.takeAttempt();
    const { navigate, tabsEngine } = latestRef.current;

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
        tabsEngine?.queueTabsOp(attempt.op);
        break;
    }
  }, [guards, id, queueChange]);

  return useMemo(() => ({ isBlocked, stay, leave }), [isBlocked, stay, leave]);
};

export { useLeaveGuard };
export type { LeaveGuardControls, UseLeaveGuardOptions };

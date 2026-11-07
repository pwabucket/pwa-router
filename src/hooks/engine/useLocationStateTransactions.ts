import { useLayoutEffect, useState } from "react";
import { useNavigate, type Location } from "react-router";
import type { LeaveGuardRegistry } from "../../lib/guards/LeaveGuardRegistry";
import type { TabsOp } from "../../lib/tabs/core/planTabsOp";
import type { EngineWork } from "../../lib/engine/EngineWork";
import {
  LocationStateTransactions,
  type LocationStateOverlay,
  type ShowLocation,
  type TabsBinding,
} from "../../lib/engine/transactions/LocationStateTransactions";

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** A hook for running queued intents (value changes and tab operations) one navigation at a time */
const useLocationStateTransactions = (
  location: Location,
  isCorrecting: boolean,
  guards: LeaveGuardRegistry,
  tabs: TabsBinding,
  work: EngineWork,
  showLocation: ShowLocation,
) => {
  /* The router, the values on their way, and the tab operation waiting to run */
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);
  const [pendingTabsOp, setPendingTabsOp] = useState<TabsOp | null>(null);

  /* The transactions, created once */
  const inputs = { location, isCorrecting, navigate, tabs };
  const [transactions] = useState(
    () =>
      new LocationStateTransactions(inputs, {
        setOverlay,
        setPendingTabsOp,
        showLocation,
        guards,
        work,
      }),
  );

  /* The latest render's inputs, read when sending */
  transactions.update(inputs);

  /* A new location with the engine idle means the work landed */
  useLayoutEffect(() => {
    transactions.settle();
  }, [transactions, location.key, isCorrecting]);

  /* The tab being switched to, shown at once */
  const pendingTab =
    pendingTabsOp?.kind === "select"
      ? { area: pendingTabsOp.area, tab: pendingTabsOp.tab }
      : null;

  /* The values on their way, the tab on show, and the queues */
  return {
    overlay,
    pendingTab,
    queueChange: transactions.queueChange,
    queueTabsOp: transactions.queueTabsOp,
  };
};

export { useLocationStateTransactions };

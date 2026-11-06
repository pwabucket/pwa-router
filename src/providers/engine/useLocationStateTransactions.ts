import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, type Location } from "react-router";
import {
  questionChange,
  type LeaveGuardRegistry,
} from "../../utils/leaveGuards";
import type { TabsConfig, TabsEntryState, TabsSession } from "../../utils/tabs";
import {
  planTabsOp,
  readWriteLocation,
  type TabsMemory,
  type TabsOp,
  type TabsPlan,
  type TabsWrite,
} from "../../utils/tabsPlan";
import {
  planTransaction,
  type LocationStateChange,
} from "../../utils/transaction";
import { writeChanges, writeClose, writeTabsEntry } from "./historyWrites";

/** Values on their way to the history, by key */
type LocationStateOverlay = ReadonlyMap<string, unknown>;

/** Queues a change; every change queued in one tick navigates once */
type QueueLocationStateChange = (change: LocationStateChange) => void;

/** Queues a tab operation; it runs before the location state changes */
type QueueTabsOp = (op: TabsOp) => void;

/** What the transactions need from the tabbed area */
interface TabsBinding {
  config: TabsConfig | null;
  tabs: TabsEntryState | undefined;
  memory: TabsMemory;
  reset: () => void;
}

/** Changes sent to the history and the entry they were sent from */
interface InFlightTransaction {
  values: Map<string, unknown>;
  locationKey: string;
}

/** A tab operation and the location it started from, kept on show until it lands */
interface PendingTabsOp {
  op: TabsOp;
  from: Location;
}

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** Runs location state changes and tab operations as transactions, one navigation at a time */
const useLocationStateTransactions = (
  location: Location,
  isCorrecting: boolean,
  guards: LeaveGuardRegistry,
  tabsBinding: TabsBinding,
  tabsSession: TabsSession,
) => {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);
  const [pendingTabsOp, setPendingTabsOp] = useState<PendingTabsOp | null>(
    null,
  );

  /* The latest inputs, read when flushing */
  const latestRef = useRef({ location, isCorrecting, navigate, tabsBinding });

  // oxlint-disable-next-line react/refs
  latestRef.current = { location, isCorrecting, navigate, tabsBinding };

  /* Queued work, work sent but not landed, and a tab write waiting for its close */
  const queuedRef = useRef(new Map<string, LocationStateChange>());
  const queuedTabsOpRef = useRef<TabsOp | null>(null);
  const tabsFollowUpRef = useRef<TabsWrite | null>(null);
  const inFlightRef = useRef<InFlightTransaction | null>(null);
  const isFlushScheduledRef = useRef(false);

  /** Publishes the values on their way: queued ones over in-flight ones */
  const publishOverlay = useCallback(() => {
    const values = new Map(inFlightRef.current?.values);
    for (const [key, change] of queuedRef.current) {
      values.set(key, change.value);
    }
    setOverlay(values.size ? values : EMPTY_OVERLAY);
  }, []);

  /** Marks work as sent from the given entry */
  const markSent = useCallback(
    (values: Map<string, unknown>, location: Location) => {
      inFlightRef.current = { values, locationKey: location.key };
      guards.setSending(true);
    },
    [guards],
  );

  /** Runs a tab plan: its close, or its write when there is nothing to close */
  const runTabsPlan = useCallback(
    (plan: TabsPlan, location: Location) => {
      const { navigate } = latestRef.current;
      tabsSession.setOpPending(true);
      markSent(new Map(), location);

      if (plan.landing !== undefined) {
        tabsFollowUpRef.current = plan.write ?? null;
        writeClose(navigate, plan.landing, location);
      } else if (plan.write) {
        writeTabsEntry(navigate, plan.write);
      }
    },
    [markSent, tabsSession],
  );

  /** The guard a tab plan would leave, if any */
  const findTabsBlocker = useCallback(
    (op: TabsOp, plan: TabsPlan, location: Location) => {
      if (op.kind === "exit") return guards.findAnyActive();
      if (op.kind === "select" || !plan.write) return undefined;
      return guards.findLeavingMove(location, readWriteLocation(plan.write));
    },
    [guards],
  );

  /** Sends the queued tab operation; false when there is none to send */
  const sendTabsOp = useCallback(
    (location: Location) => {
      const { navigate, tabsBinding } = latestRef.current;
      const { config, tabs, memory, reset } = tabsBinding;

      /* A close has landed: write the tab's entry */
      const followUp = tabsFollowUpRef.current;
      if (followUp) {
        tabsFollowUpRef.current = null;
        markSent(new Map(), location);
        writeTabsEntry(navigate, followUp);
        return true;
      }

      const op = queuedTabsOpRef.current;
      queuedTabsOpRef.current = null;
      if (!op) return false;

      /* Nothing to do: the operation is over */
      const plan =
        config && tabs && planTabsOp(op, config, location, tabs, memory);
      if (!plan) {
        setPendingTabsOp(null);
        return false;
      }

      /* A move losing unsaved work waits; its question opens instead */
      const blockedGuardId = findTabsBlocker(op, plan, location);

      if (blockedGuardId) {
        const question = questionChange(blockedGuardId);
        guards.block({ kind: "tabs", guardId: blockedGuardId, op });
        queuedRef.current.set(question.key, question);
        setPendingTabsOp(null);
        return false;
      }

      /* Leaving the area forgets every tab's pages */
      if (op.kind === "exit") reset();

      runTabsPlan(plan, location);
      return true;
    },
    [findTabsBlocker, guards, markSent, runTabsPlan],
  );

  /** Sends every queued change as one transaction, when nothing is in flight */
  const sendChanges = useCallback(
    (location: Location) => {
      const { navigate } = latestRef.current;
      const queued = queuedRef.current;
      if (!queued.size) return;

      /* Plan against the current entry */
      let changes = [...queued.values()];
      let plan = planTransaction(location.state, changes);
      queued.clear();

      if (plan.type === "none") return;

      /* A move leaving a guarded layer waits; its question opens instead */
      const blockedGuardId = guards.findLeavingPlan(location.state, plan);

      if (blockedGuardId) {
        guards.block({ kind: "changes", guardId: blockedGuardId, changes });
        changes = [questionChange(blockedGuardId)];
        plan = planTransaction(location.state, changes);

        /* The question is already open */
        if (plan.type === "none") return;
      }

      /* A close sends only the closed keys; the rest follow once it lands */
      if (plan.type === "close") {
        for (const change of plan.followUps) queued.set(change.key, change);

        const closed = plan.keys.map((key): [string, unknown] => [
          key,
          undefined,
        ]);
        markSent(new Map(closed), location);
        writeClose(navigate, plan.landing, location);
        return;
      }

      /* A write sends every change */
      const written = changes.map(({ key, value }): [string, unknown] => [
        key,
        value,
      ]);
      markSent(new Map(written), location);
      writeChanges(navigate, plan, location);
    },
    [guards, markSent],
  );

  /** Sends the next piece of work, when nothing is in flight */
  const send = useCallback(() => {
    const { location, isCorrecting } = latestRef.current;
    if (inFlightRef.current || isCorrecting) return;

    /* Tab operations go first */
    if (sendTabsOp(location)) return;
    sendChanges(location);
  }, [sendTabsOp, sendChanges]);

  /** Sends what it can and shows every value on its way */
  const flush = useCallback(() => {
    isFlushScheduledRef.current = false;
    send();
    publishOverlay();
  }, [send, publishOverlay]);

  /** Flushes once at the end of the tick */
  const scheduleFlush = useCallback(() => {
    if (isFlushScheduledRef.current) return;
    isFlushScheduledRef.current = true;
    queueMicrotask(flush);
  }, [flush]);

  /* A new location with the engine idle means the work landed */
  useLayoutEffect(() => {
    if (isCorrecting) return;

    const inFlight = inFlightRef.current;
    if (inFlight?.locationKey === location.key) return;

    inFlightRef.current = null;
    guards.setSending(false);

    /* Ask the question of a guard whose blocked move was undone */
    const questionGuardId = guards.takePendingQuestion();

    if (questionGuardId) {
      const change = questionChange(questionGuardId);
      queuedRef.current.set(change.key, change);
    }

    flush();

    /* A tab operation is done once nothing of it is left */
    const isTabsOpDone =
      !inFlightRef.current &&
      !tabsFollowUpRef.current &&
      !queuedTabsOpRef.current;

    if (isTabsOpDone && tabsSession.isOpPending) {
      tabsSession.setOpPending(false);
      // oxlint-disable-next-line react/set-state-in-effect
      setPendingTabsOp(null);
    }
  }, [location.key, isCorrecting, flush, guards, tabsSession]);

  /** Queues a change; changes in one tick share one flush, which shows them */
  const queueChange = useCallback<QueueLocationStateChange>(
    (change) => {
      const queued = queuedRef.current;
      const inFlight = inFlightRef.current;

      /* The value the key has, or is on its way to */
      const baseValue = inFlight?.values.has(change.key)
        ? inFlight.values.get(change.key)
        : latestRef.current.location.state?.[change.key];

      /* Setting the value it has, or is on its way to, cancels the queued one */
      if (Object.is(change.value, baseValue)) queued.delete(change.key);
      else queued.set(change.key, change);

      scheduleFlush();
    },
    [scheduleFlush],
  );

  /** Queues a tab operation; the latest one in a tick wins */
  const queueTabsOp = useCallback<QueueTabsOp>(
    (op) => {
      /* The screen stays on the location from before the first pending operation */
      const { location } = latestRef.current;
      queuedTabsOpRef.current = op;
      setPendingTabsOp((pending) => ({ op, from: pending?.from ?? location }));
      scheduleFlush();
    },
    [scheduleFlush],
  );

  /** Holds every queued piece of work until the next location lands */
  const holdUntilLanding = useCallback(() => {
    markSent(new Map(), latestRef.current.location);
  }, [markSent]);

  /* The tab being switched to, shown at once */
  const pendingOp = pendingTabsOp?.op;
  const pendingTab = pendingOp?.kind === "select" ? pendingOp.tab : null;

  /* The location kept on show while a tab operation crosses other entries */
  const tabsFrozenLocation = pendingTabsOp?.from;

  return {
    overlay,
    pendingTab,
    tabsFrozenLocation,
    queueChange,
    queueTabsOp,
    holdUntilLanding,
  };
};

export { useLocationStateTransactions };
export type {
  LocationStateOverlay,
  QueueLocationStateChange,
  QueueTabsOp,
  TabsBinding,
};

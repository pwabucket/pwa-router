import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, type Location } from "react-router";
import {
  questionChange,
  type LeaveGuardRegistry,
} from "../../utils/leaveGuards";
import type { TabsConfig, TabsEntryState } from "../../utils/tabs";
import {
  planTabsOp,
  readWriteLocation,
  type TabsMemory,
  type TabsOp,
  type TabsPlan,
  type TabsWrite,
} from "../../utils/tabsPlan";
import { readEntry } from "../../core/legacy";
import { planChanges, type ValueChange } from "../../core/planChanges";
import { createStepId } from "../../core/stepIds";
import type { EngineWork } from "./EngineWork";
import {
  writeChanges,
  writeClose,
  writeLanding,
  writeTabsEntry,
} from "./historyWrites";

/** Values on their way to the history, by key */
type LocationStateOverlay = ReadonlyMap<string, unknown>;

/** Queues a change; every change queued in one tick navigates once */
type QueueLocationStateChange = (change: ValueChange) => void;

/** Queues a tab operation; it runs before the location state changes */
type QueueTabsOp = (op: TabsOp) => void;

/** What the transactions need from the tabbed area */
interface TabsBinding {
  config: TabsConfig | null;
  tabs: TabsEntryState | undefined;
  memory: TabsMemory;
  reset: () => void;
}

/** Sets the location kept on show while the engine crosses other entries */
type ShowLocation = (
  update: (shown: Location | null) => Location | null,
) => void;

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** Runs location state changes and tab operations as transactions, one navigation at a time */
const useLocationStateTransactions = (
  location: Location,
  isCorrecting: boolean,
  guards: LeaveGuardRegistry,
  tabsBinding: TabsBinding,
  work: EngineWork,
  showLocation: ShowLocation,
) => {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);
  const [pendingTabsOp, setPendingTabsOp] = useState<TabsOp | null>(null);

  /* The latest inputs, read when flushing */
  const latestRef = useRef({ location, isCorrecting, navigate, tabsBinding });

  // oxlint-disable-next-line react/refs
  latestRef.current = { location, isCorrecting, navigate, tabsBinding };

  /* Queued work, the values of sent work, and a tab write waiting for its close */
  const queuedRef = useRef(new Map<string, ValueChange>());
  const queuedTabsOpRef = useRef<TabsOp | null>(null);
  const tabsFollowUpRef = useRef<TabsWrite | null>(null);
  const sentValuesRef = useRef<Map<string, unknown> | null>(null);
  const isFlushScheduledRef = useRef(false);

  /** Publishes the values on their way: queued ones over in-flight ones */
  const publishOverlay = useCallback(() => {
    const values = new Map(sentValuesRef.current);
    for (const [key, change] of queuedRef.current) {
      values.set(key, change.value);
    }
    setOverlay(values.size ? values : EMPTY_OVERLAY);
  }, []);

  /** Marks work as sent from the given entry, with the values it carries */
  const markSent = useCallback(
    (values: Map<string, unknown>, location: Location) => {
      sentValuesRef.current = values;
      work.send(location.key);
    },
    [work],
  );

  /** Ends the running tab operation and releases the location on show */
  const endTabsOp = useCallback(() => {
    work.setOperating(false);
    setPendingTabsOp(null);
    showLocation(() => null);
  }, [work, showLocation]);

  /** Runs a tab plan: its close, or its write when there is nothing to close */
  const runTabsPlan = useCallback(
    (plan: TabsPlan, location: Location) => {
      const { navigate } = latestRef.current;
      work.setOperating(true);
      markSent(new Map(), location);

      if (plan.landing !== undefined) {
        tabsFollowUpRef.current = plan.write ?? null;
        writeLanding(navigate, plan.landing, location);
      } else if (plan.write) {
        writeTabsEntry(navigate, plan.write);
      }
    },
    [markSent, work],
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
        endTabsOp();
        return false;
      }

      /* A move losing unsaved work waits; its question opens instead */
      const blockedGuardId = findTabsBlocker(op, plan, location);

      if (blockedGuardId) {
        const question = questionChange(blockedGuardId);
        guards.block({ kind: "tabs", guardId: blockedGuardId, op });
        queuedRef.current.set(question.key, question);
        endTabsOp();
        return false;
      }

      /* Leaving the area forgets every tab's pages */
      if (op.kind === "exit") reset();

      runTabsPlan(plan, location);
      return true;
    },
    [findTabsBlocker, guards, markSent, runTabsPlan, endTabsOp],
  );

  /** Sends every queued change as one transaction, when nothing is in flight */
  const sendChanges = useCallback(
    (location: Location) => {
      const { navigate } = latestRef.current;
      const queued = queuedRef.current;
      if (!queued.size) return;

      /* Plan against the current entry */
      const entry = { key: location.key, ...readEntry(location.state) };
      let changes = [...queued.values()];
      let plan = planChanges(entry, changes, createStepId);
      queued.clear();

      if (plan.kind === "none") return;

      /* A move leaving a guarded layer waits; its question opens instead */
      const blockedGuardId = guards.findLeavingPlan(entry, plan);

      if (blockedGuardId) {
        guards.block({ kind: "changes", guardId: blockedGuardId, changes });
        changes = [questionChange(blockedGuardId)];
        plan = planChanges(entry, changes, createStepId);

        /* The question is already open */
        if (plan.kind === "none") return;
      }

      /* A close sends only the closed keys; the rest follow once it lands */
      if (plan.kind === "close") {
        for (const change of plan.followUps) queued.set(change.key, change);

        const closed = plan.keys.map((key): [string, unknown] => [
          key,
          undefined,
        ]);
        markSent(new Map(closed), location);
        writeClose(navigate, plan.target, location);
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
    if (work.isSent || isCorrecting) return;

    /* Tab operations go first */
    if (sendTabsOp(location)) return;
    sendChanges(location);
  }, [sendTabsOp, sendChanges, work]);

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
    if (work.isSent && !work.hasLanded(location.key)) return;

    sentValuesRef.current = null;
    work.land();

    /* Ask the question of a guard whose blocked move was undone */
    const questionGuardId = guards.takePendingQuestion();

    if (questionGuardId) {
      const change = questionChange(questionGuardId);
      queuedRef.current.set(change.key, change);
    }

    flush();

    /* A tab operation is done once nothing of it is left */
    const isTabsOpDone =
      !work.isSent && !tabsFollowUpRef.current && !queuedTabsOpRef.current;

    if (isTabsOpDone && work.isOperating) endTabsOp();
  }, [location.key, isCorrecting, flush, guards, work, endTabsOp]);

  /** Queues a change; changes in one tick share one flush, which shows them */
  const queueChange = useCallback<QueueLocationStateChange>(
    (change) => {
      const queued = queuedRef.current;
      const sentValues = sentValuesRef.current;

      /* The value the key has, or is on its way to */
      const baseValue = sentValues?.has(change.key)
        ? sentValues.get(change.key)
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
      setPendingTabsOp(op);
      showLocation((shown) => shown ?? location);
      scheduleFlush();
    },
    [scheduleFlush, showLocation],
  );

  /* The tab being switched to, shown at once */
  const pendingTab =
    pendingTabsOp?.kind === "select" ? pendingTabsOp.tab : null;

  return { overlay, pendingTab, queueChange, queueTabsOp };
};

export { useLocationStateTransactions };
export type {
  LocationStateOverlay,
  QueueLocationStateChange,
  QueueTabsOp,
  ShowLocation,
  TabsBinding,
};
